import crypto from 'crypto';

import createError from '../common/errors/create-error.js';
import MailAccount from '../models/mail-account.model.js';

export const GMAIL_SYNC_LOCK_STALE_MS = 2 * 60 * 1000;

export class GmailSyncLockLostError extends Error {
    constructor(mailAccountId) {
        super('Gmail sync lock ownership was lost');
        this.name = 'GmailSyncLockLostError';
        this.code = 'GMAIL_SYNC_LOCK_LOST';
        this.statusCode = 409;
        this.mailAccountId = String(mailAccountId);
    }
}

const requireValidDate = (value) => {
    const date = value instanceof Date ? value : new Date(value);

    if (Number.isNaN(date.getTime())) {
        throw new TypeError('Gmail sync lock clock must return a valid date');
    }

    return date;
};

const requireOwnerId = (value) => {
    if (typeof value !== 'string' || value.trim().length === 0) {
        throw new TypeError('Gmail sync lock owner id must be a non-empty string');
    }

    return value;
};

export const createGmailSyncLockService = ({
    model = MailAccount,
    now = () => new Date(),
    ownerIdFactory = () => crypto.randomUUID(),
} = {}) => {
    const acquire = async ({ userId, mailAccountId }) => {
        const lockedAt = requireValidDate(now());
        const staleBefore = new Date(lockedAt.getTime() - GMAIL_SYNC_LOCK_STALE_MS);
        const lockedBy = requireOwnerId(ownerIdFactory());
        const mailAccount = await model.findOneAndUpdate(
            {
                _id: mailAccountId,
                userId,
                $or: [
                    { 'syncLock.lockedAt': null },
                    { 'syncLock.lockedAt': { $lte: staleBefore } },
                ],
            },
            {
                $set: {
                    syncLock: {
                        lockedAt,
                        lockedBy,
                    },
                },
            },
            { returnDocument: 'after' }
        );

        if (mailAccount) {
            return {
                acquired: true,
                skipped: false,
                lockedAt,
                lockedBy,
                mailAccount,
            };
        }

        const accountExists = await model.exists({ _id: mailAccountId, userId });

        if (!accountExists) {
            throw createError(
                'Mail account not found',
                404,
                [],
                'MAIL_ACCOUNT_NOT_FOUND'
            );
        }

        return {
            acquired: false,
            skipped: true,
            reason: 'sync_in_progress',
            mailAccountId,
        };
    };

    const renew = async ({ mailAccountId, lockedBy }) => {
        const renewedAt = requireValidDate(now());
        const result = await model.updateOne(
            {
                _id: mailAccountId,
                'syncLock.lockedBy': requireOwnerId(lockedBy),
            },
            {
                $set: {
                    'syncLock.lockedAt': renewedAt,
                },
            }
        );

        if (result?.matchedCount !== 1) {
            throw new GmailSyncLockLostError(mailAccountId);
        }

        return { renewed: true, lockedAt: renewedAt };
    };

    const release = async ({ mailAccountId, lockedBy }) => {
        const result = await model.updateOne(
            {
                _id: mailAccountId,
                'syncLock.lockedBy': requireOwnerId(lockedBy),
            },
            {
                $unset: {
                    syncLock: 1,
                },
            }
        );

        return { released: result?.matchedCount === 1 };
    };

    return { acquire, renew, release };
};

const defaultService = createGmailSyncLockService();

export const acquireGmailSyncLock = (input) => defaultService.acquire(input);
export const renewGmailSyncLock = (input) => defaultService.renew(input);
export const releaseGmailSyncLock = (input) => defaultService.release(input);
