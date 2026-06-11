import mongoose from 'mongoose';

import createError from '../common/errors/create-error.js';
import SenderListEntry from '../models/sender-list.model.js';
import Email from '../models/email.model.js';

/*
 * User-managed allowlist ("trusted") / blocklist ("blocked") for senders and domains.
 *
 * Matching rules (see getSenderListContextForEmail):
 *   - An exact sender entry always beats a domain entry — the more specific
 *     criterion wins (e.g. boss@company.com trusted while company.com is blocked).
 *   - Domain entries match suffix-aware, like brand verification: an entry for
 *     paypal.com matches mail.paypal.com, but NOT evil-paypal.com.
 *   - Mutual exclusivity per criterion is guaranteed by the unique
 *     (userId, kind, value) index on the model plus the conflict check in
 *     addSenderListEntry.
 */

export const normalizeSenderAddress = (value) => {
    const raw = String(value || '').trim();
    const angleMatch = raw.match(/<([^>]+)>/);

    return (angleMatch ? angleMatch[1] : raw).trim().toLowerCase();
};

export const normalizeListDomain = (value) =>
    String(value || '')
        .trim()
        .toLowerCase()
        .replace(/^www\./, '')
        .replace(/\.$/, '');

const normalizeValue = (kind, value) =>
    kind === 'sender' ? normalizeSenderAddress(value) : normalizeListDomain(value);

const domainMatches = (senderDomain, listedDomain) =>
    senderDomain === listedDomain || senderDomain.endsWith(`.${listedDomain}`);

const LIST_TYPE_LABELS = {
    allow: 'trusted',
    block: 'blocked',
};

const toPublicEntry = (entry) => ({
    id: entry._id,
    listType: entry.listType,
    kind: entry.kind,
    value: entry.value,
    createdAt: entry.createdAt,
});

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/*
 * How many synced emails each rule currently covers. Sender rules match the
 * address inside the raw From header; domain rules match the sender domain
 * suffix-aware (same semantics as the scan-time matcher).
 */
const countMatchingEmails = ({ userId, entry }) => {
    if (entry.kind === 'sender') {
        return Email.countDocuments({
            userId,
            from: { $regex: escapeRegex(entry.value), $options: 'i' },
        });
    }

    return Email.countDocuments({
        userId,
        senderDomain: { $regex: `(^|\\.)${escapeRegex(entry.value)}$`, $options: 'i' },
    });
};

export const getSenderListEntries = async ({ userId, withMatchCounts = false }) => {
    const entries = await SenderListEntry.find({ userId }).sort({ createdAt: -1 });

    if (!withMatchCounts) {
        return entries.map(toPublicEntry);
    }

    return Promise.all(
        entries.map(async (entry) => ({
            ...toPublicEntry(entry),
            matchedEmails: await countMatchingEmails({ userId, entry }),
        }))
    );
};

const senderAddressDomain = (address) => {
    const atIndex = address.lastIndexOf('@');

    return atIndex === -1 ? '' : normalizeListDomain(address.slice(atIndex + 1));
};

/*
 * Cross-kind conflict guard: a sender entry and a domain entry that covers it must
 * never have opposite list types. Allowing "block boss@x.com" while "trust x.com"
 * (or the reverse) would leave one of the two rules silently ineffective — the
 * precedence would pick a winner, but the user would not see why. We reject the
 * contradiction up front with a clear message instead.
 */
const findOppositeCoverageConflict = async ({ userId, listType, kind, value }) => {
    const oppositeType = listType === 'allow' ? 'block' : 'allow';

    if (kind === 'sender') {
        const domain = senderAddressDomain(value);

        if (!domain) {
            return null;
        }

        const domainEntries = await SenderListEntry.find({
            userId,
            kind: 'domain',
            listType: oppositeType,
        });
        const covering = domainEntries.find((entry) => domainMatches(domain, entry.value));

        return covering
            ? `This sender's domain (${covering.value}) is already on the ${LIST_TYPE_LABELS[oppositeType]} list. Remove the domain rule first.`
            : null;
    }

    const senderEntries = await SenderListEntry.find({
        userId,
        kind: 'sender',
        listType: oppositeType,
    });
    const covered = senderEntries.filter((entry) =>
        domainMatches(senderAddressDomain(entry.value), value)
    );

    if (covered.length === 0) {
        return null;
    }

    const sample = covered[0].value;
    const others = covered.length - 1;

    return `${covered.length === 1 ? `The sender ${sample}` : `${sample}${others > 0 ? ` and ${others} other sender${others > 1 ? 's' : ''}` : ''}`} from this domain ${covered.length === 1 ? 'is' : 'are'} already on the ${LIST_TYPE_LABELS[oppositeType]} list. Remove ${covered.length === 1 ? 'that rule' : 'those rules'} first.`;
};

export const addSenderListEntry = async ({ userId, listType, kind, value }) => {
    const normalizedValue = normalizeValue(kind, value);

    if (!normalizedValue) {
        throw createError('A value is required', 400, [], 'INVALID_LIST_VALUE');
    }

    const existing = await SenderListEntry.findOne({ userId, kind, value: normalizedValue });

    if (existing) {
        if (existing.listType === listType) {
            return { entry: toPublicEntry(existing), created: false };
        }

        throw createError(
            `This ${kind} is already on the ${LIST_TYPE_LABELS[existing.listType]} list. Remove it from there first.`,
            409,
            [],
            'LIST_CONFLICT'
        );
    }

    const coverageConflict = await findOppositeCoverageConflict({
        userId,
        listType,
        kind,
        value: normalizedValue,
    });

    if (coverageConflict) {
        throw createError(coverageConflict, 409, [], 'LIST_CONFLICT');
    }

    try {
        const entry = await SenderListEntry.create({
            userId,
            listType,
            kind,
            value: normalizedValue,
        });

        return { entry: toPublicEntry(entry), created: true };
    } catch (error) {
        // Unique-index race: two concurrent adds for the same criterion.
        if (error?.code === 11000) {
            throw createError(
                `This ${kind} is already on a list.`,
                409,
                [],
                'LIST_CONFLICT'
            );
        }

        throw error;
    }
};

export const removeSenderListEntry = async ({ userId, entryId }) => {
    if (!mongoose.Types.ObjectId.isValid(String(entryId))) {
        throw createError('Invalid list entry id', 400, [], 'INVALID_LIST_ENTRY_ID');
    }

    const deleted = await SenderListEntry.findOneAndDelete({ _id: entryId, userId });

    if (!deleted) {
        throw createError('List entry not found', 404, [], 'LIST_ENTRY_NOT_FOUND');
    }

    return toPublicEntry(deleted);
};

const buildEmptyListContext = () => ({
    senderAllowlisted: false,
    senderBlocklisted: false,
    listMatch: null,
});

/*
 * Pure matcher, separated from the DB fetch so the scan engine behaviour is unit
 * testable. Precedence: exact sender entry > domain entry (suffix-aware).
 */
export const matchSenderListEntries = ({ entries = [], senderAddress, senderDomain }) => {
    const address = normalizeSenderAddress(senderAddress);
    const domain = normalizeListDomain(senderDomain);

    const senderEntry = address
        ? entries.find((entry) => entry.kind === 'sender' && entry.value === address)
        : null;
    const domainEntry = domain
        ? entries.find((entry) => entry.kind === 'domain' && domainMatches(domain, entry.value))
        : null;
    const match = senderEntry || domainEntry || null;

    if (!match) {
        return buildEmptyListContext();
    }

    return {
        senderAllowlisted: match.listType === 'allow',
        senderBlocklisted: match.listType === 'block',
        listMatch: {
            listType: match.listType,
            kind: match.kind,
            value: match.value,
        },
    };
};

export const getSenderListContextForEmail = async ({ userId, senderAddress, senderDomain }) => {
    if (!senderAddress && !senderDomain) {
        return buildEmptyListContext();
    }

    const entries = await SenderListEntry.find({ userId });

    return matchSenderListEntries({ entries, senderAddress, senderDomain });
};
