import mongoose from 'mongoose';

import createError from '../common/errors/create-error.js';
import Email from '../models/email.model.js';
import Scan from '../models/scan.model.js';
import { buildEmailStateForUser } from './email-state.service.js';

const ALLOWED_VERDICTS = new Set(['safe', 'suspicious', 'likely_phishing', 'phishing']);
const ALLOWED_RISK_BUCKETS = new Set([
    'safe',
    'needs_review',
    'quarantine',
    'reviewed_safe',
    'confirmed_phishing',
    'unscanned',
]);
const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const toCompactLatestScan = (scan) => {
    if (!scan) {
        return null;
    }

    return {
        _id: scan._id,
        score: scan.score,
        ruleScore: scan.ruleScore,
        aiScore: scan.aiScore,
        verdict: scan.verdict,
        aiExplanation: scan.aiExplanation || null,
        aiExplanationMeta: scan.aiExplanationMeta || null,
        scannedAt: scan.scannedAt,
    };
};

const toEmailListItem = async ({ userId, email }) => {
    const latestScan = email.latestScan || null;
    const emailState = await buildEmailStateForUser({
        userId,
        email,
        latestScan,
    });

    return {
        _id: email._id,
        userId: email.userId,
        mailAccountId: email.mailAccountId,
        provider: email.provider,
        providerMessageId: email.providerMessageId,
        threadId: email.threadId,
        subject: email.subject,
        from: email.from,
        to: email.to,
        displayName: email.displayName,
        senderDomain: email.senderDomain,
        snippet: email.snippet,
        receivedAt: email.receivedAt,
        lastProviderAction: email.lastProviderAction || null,
        lastProviderActionStatus: email.lastProviderActionStatus || null,
        lastProviderActionAt: email.lastProviderActionAt || null,
        lastProviderActionError: email.lastProviderActionError || null,
        createdAt: email.createdAt,
        updatedAt: email.updatedAt,
        latestScan: toCompactLatestScan(latestScan),
        ...emailState,
    };
};

const toEmailDetails = async ({ userId, email, latestScan }) => {
    const emailState = await buildEmailStateForUser({
        userId,
        email,
        latestScan,
    });

    return {
        _id: email._id,
        userId: email.userId,
        mailAccountId: email.mailAccountId,
        provider: email.provider,
        providerMessageId: email.providerMessageId,
        threadId: email.threadId,
        subject: email.subject,
        from: email.from,
        to: email.to,
        replyTo: email.replyTo,
        displayName: email.displayName,
        senderDomain: email.senderDomain,
        replyToDomain: email.replyToDomain,
        snippet: email.snippet,
        linkDomains: email.linkDomains,
        linkCount: email.linkCount,
        hasShortenedUrl: email.hasShortenedUrl,
        suspiciousLinkPatterns: email.suspiciousLinkPatterns,
        attachmentExtensions: email.attachmentExtensions,
        receivedAt: email.receivedAt,
        syncSource: email.syncSource,
        lastProviderAction: email.lastProviderAction || null,
        lastProviderActionStatus: email.lastProviderActionStatus || null,
        lastProviderActionAt: email.lastProviderActionAt || null,
        lastProviderActionError: email.lastProviderActionError || null,
        createdAt: email.createdAt,
        updatedAt: email.updatedAt,
        latestScan: toCompactLatestScan(latestScan),
        ...emailState,
    };
};

const toEmailRaw = (email) => ({
    _id: email._id,
    userId: email.userId,
    mailAccountId: email.mailAccountId,
    provider: email.provider,
    providerMessageId: email.providerMessageId,
    threadId: email.threadId,
    subject: email.subject,
    from: email.from,
    to: email.to,
    replyTo: email.replyTo,
    displayName: email.displayName,
    senderDomain: email.senderDomain,
    replyToDomain: email.replyToDomain,
    snippet: email.snippet,
    textBody: email.textBody,
    htmlBody: email.htmlBody,
    links: email.links,
    linkDomains: email.linkDomains,
    linkCount: email.linkCount,
    hasShortenedUrl: email.hasShortenedUrl,
    suspiciousLinkPatterns: email.suspiciousLinkPatterns,
    attachmentExtensions: email.attachmentExtensions,
    receivedAt: email.receivedAt,
    syncSource: email.syncSource,
    lastProviderAction: email.lastProviderAction || null,
    lastProviderActionStatus: email.lastProviderActionStatus || null,
    lastProviderActionAt: email.lastProviderActionAt || null,
    lastProviderActionError: email.lastProviderActionError || null,
    createdAt: email.createdAt,
    updatedAt: email.updatedAt,
});

const parsePositiveInt = ({ value, fallback, paramName, code }) => {
    if (value === undefined) {
        return fallback;
    }

    const parsedValue = Number.parseInt(value, 10);

    if (!Number.isInteger(parsedValue) || parsedValue < 1) {
        throw createError(
            `Invalid ${paramName} query parameter`,
            400,
            [`${paramName} must be a positive integer.`],
            code
        );
    }

    return parsedValue;
};

const parseEmailListQuery = (query = {}) => {
    const page = parsePositiveInt({
        value: query.page,
        fallback: DEFAULT_PAGE,
        paramName: 'page',
        code: 'INVALID_EMAILS_PAGE',
    });
    const requestedLimit = parsePositiveInt({
        value: query.limit,
        fallback: DEFAULT_LIMIT,
        paramName: 'limit',
        code: 'INVALID_EMAILS_LIMIT',
    });
    const limit = Math.min(requestedLimit, MAX_LIMIT);
    const q = typeof query.q === 'string' ? query.q.trim() : '';
    const verdict = typeof query.verdict === 'string' ? query.verdict.trim() : '';
    const riskBucket =
        typeof query.riskBucket === 'string' ? query.riskBucket.trim() : '';
    const mailAccountId =
        typeof query.mailAccountId === 'string' ? query.mailAccountId.trim() : '';

    if (verdict && !ALLOWED_VERDICTS.has(verdict)) {
        throw createError(
            'Invalid verdict filter',
            400,
            ['Allowed verdict values are: safe, suspicious, likely_phishing, phishing.'],
            'INVALID_EMAILS_VERDICT'
        );
    }

    if (riskBucket && !ALLOWED_RISK_BUCKETS.has(riskBucket)) {
        throw createError(
            'Invalid riskBucket filter',
            400,
            [
                'Allowed riskBucket values are: safe, needs_review, quarantine, reviewed_safe, confirmed_phishing, unscanned.',
            ],
            'INVALID_EMAILS_RISK_BUCKET'
        );
    }

    if (mailAccountId && !mongoose.Types.ObjectId.isValid(mailAccountId)) {
        throw createError(
            'Invalid mail account id',
            400,
            [],
            'INVALID_MAIL_ACCOUNT_ID'
        );
    }

    return {
        page,
        limit,
        q,
        verdict,
        riskBucket,
        mailAccountId,
    };
};

const buildEmailListBaseMatch = ({ userId, q, mailAccountId }) => {
    const match = {
        userId: new mongoose.Types.ObjectId(String(userId)),
    };

    if (mailAccountId) {
        match.mailAccountId = new mongoose.Types.ObjectId(mailAccountId);
    }

    if (q) {
        const regex = new RegExp(escapeRegex(q), 'i');

        match.$or = [
            { subject: regex },
            { from: regex },
            { to: regex },
            { snippet: regex },
            { senderDomain: regex },
            { replyToDomain: regex },
        ];
    }

    return match;
};

const buildLatestScanLookupStages = () => [
    {
        $lookup: {
            from: 'scans',
            let: {
                emailId: '$_id',
                userId: '$userId',
            },
            pipeline: [
                {
                    $match: {
                        $expr: {
                            $and: [
                                { $eq: ['$emailId', '$$emailId'] },
                                { $eq: ['$userId', '$$userId'] },
                            ],
                        },
                    },
                },
                {
                    $sort: {
                        scannedAt: -1,
                        updatedAt: -1,
                        createdAt: -1,
                    },
                },
                {
                    $limit: 1,
                },
                {
                    $project: {
                        _id: 1,
                        score: 1,
                        ruleScore: 1,
                        aiScore: 1,
                        verdict: 1,
                        scannedAt: 1,
                    },
                },
            ],
            as: 'latestScan',
        },
    },
    {
        $addFields: {
            latestScan: {
                $arrayElemAt: ['$latestScan', 0],
            },
        },
    },
];

const buildEmailStateStages = () => [
    {
        $addFields: {
            effectiveVerdict: {
                $switch: {
                    branches: [
                        { case: { $eq: ['$userVerdict', 'safe'] }, then: 'safe' },
                        {
                            case: { $eq: ['$userVerdict', 'phishing'] },
                            then: 'phishing',
                        },
                        {
                            case: { $eq: ['$latestScan.verdict', 'likely_phishing'] },
                            then: 'likely_phishing',
                        },
                        {
                            case: { $eq: ['$latestScan.verdict', 'suspicious'] },
                            then: 'suspicious',
                        },
                        { case: { $eq: ['$latestScan.verdict', 'safe'] }, then: 'safe' },
                    ],
                    default: null,
                },
            },
            verdictSource: {
                $switch: {
                    branches: [
                        {
                            case: { $in: ['$userVerdict', ['safe', 'phishing']] },
                            then: 'user',
                        },
                        {
                            case: {
                                $in: [
                                    '$latestScan.verdict',
                                    ['safe', 'suspicious', 'likely_phishing'],
                                ],
                            },
                            then: 'scan',
                        },
                    ],
                    default: null,
                },
            },
            reviewStatus: {
                $switch: {
                    branches: [
                        {
                            case: { $in: ['$userVerdict', ['safe', 'phishing']] },
                            then: 'reviewed',
                        },
                        {
                            case: {
                                $in: ['$latestScan.verdict', ['suspicious', 'likely_phishing']],
                            },
                            then: 'pending_review',
                        },
                        {
                            case: { $eq: ['$latestScan.verdict', 'safe'] },
                            then: 'no_review_needed',
                        },
                    ],
                    default: 'unscanned',
                },
            },
            isQuarantined: {
                $and: [
                    { $not: [{ $in: ['$userVerdict', ['safe', 'phishing']] }] },
                    { $eq: ['$latestScan.verdict', 'likely_phishing'] },
                ],
            },
            riskBucket: {
                $switch: {
                    branches: [
                        {
                            case: { $eq: ['$userVerdict', 'safe'] },
                            then: 'reviewed_safe',
                        },
                        {
                            case: { $eq: ['$userVerdict', 'phishing'] },
                            then: 'confirmed_phishing',
                        },
                        {
                            case: { $eq: ['$latestScan.verdict', 'likely_phishing'] },
                            then: 'quarantine',
                        },
                        {
                            case: { $eq: ['$latestScan.verdict', 'suspicious'] },
                            then: 'needs_review',
                        },
                        { case: { $eq: ['$latestScan.verdict', 'safe'] }, then: 'safe' },
                    ],
                    default: 'unscanned',
                },
            },
        },
    },
];

const findOwnedEmailById = async ({ userId, emailId }) => {
    if (!mongoose.Types.ObjectId.isValid(emailId)) {
        throw createError('Invalid email id', 400, [], 'INVALID_EMAIL_ID');
    }

    const email = await Email.findOne({
        _id: emailId,
        userId,
    }).lean();

    if (!email) {
        throw createError('Email not found', 404, [], 'EMAIL_NOT_FOUND');
    }

    return email;
};

const findLatestScanForOwnedEmail = async ({ userId, emailId }) => {
    const latestScan = await Scan.findOne({
        userId,
        emailId,
    })
        .sort({ scannedAt: -1, updatedAt: -1, createdAt: -1 })
        .select('_id score ruleScore aiScore verdict scannedAt')
        .lean();

    return latestScan || null;
};

export const getEmailsForUser = async ({ userId, query }) => {
    const { page, limit, q, verdict, riskBucket, mailAccountId } =
        parseEmailListQuery(query);
    const skip = (page - 1) * limit;
    const baseMatch = buildEmailListBaseMatch({
        userId,
        q,
        mailAccountId,
    });
    const latestScanStages = buildLatestScanLookupStages();
    const emailStateStages = buildEmailStateStages();
    const stateMatch = {};

    if (verdict) {
        stateMatch.effectiveVerdict = verdict;
    }

    if (riskBucket) {
        stateMatch.riskBucket = riskBucket;
    }

    const stateMatchStages =
        Object.keys(stateMatch).length > 0 ? [{ $match: stateMatch }] : [];

    const listPipeline = [
        { $match: baseMatch },
        ...latestScanStages,
        ...emailStateStages,
        ...stateMatchStages,
        { $sort: { receivedAt: -1, _id: -1 } },
        { $skip: skip },
        { $limit: limit },
        {
            $project: {
                _id: 1,
                userId: 1,
                mailAccountId: 1,
                provider: 1,
                providerMessageId: 1,
                threadId: 1,
                subject: 1,
                from: 1,
                to: 1,
                displayName: 1,
                senderDomain: 1,
                snippet: 1,
                receivedAt: 1,
                userVerdict: 1,
                reviewedAt: 1,
                lastManualAction: 1,
                lastProviderAction: 1,
                lastProviderActionStatus: 1,
                lastProviderActionAt: 1,
                lastProviderActionError: 1,
                createdAt: 1,
                updatedAt: 1,
                latestScan: 1,
            },
        },
    ];

    const countPipeline = [
        { $match: baseMatch },
        ...latestScanStages,
        ...emailStateStages,
        ...stateMatchStages,
        { $count: 'total' },
    ];

    const [items, countResult] = await Promise.all([
        Email.aggregate(listPipeline),
        Email.aggregate(countPipeline),
    ]);

    const total = countResult[0]?.total || 0;
    const totalPages = total === 0 ? 0 : Math.ceil(total / limit);
    const emailItems = await Promise.all(
        items.map((email) =>
            toEmailListItem({
                userId,
                email,
            })
        )
    );

    return {
        items: emailItems,
        pagination: {
            page,
            limit,
            total,
            totalPages,
        },
    };
};

export const getEmailByIdForUser = async ({ userId, emailId }) => {
    const email = await findOwnedEmailById({ userId, emailId });
    const latestScan = await findLatestScanForOwnedEmail({
        userId,
        emailId: email._id,
    });

    return toEmailDetails({
        userId,
        email,
        latestScan,
    });
};

export const getEmailRawByIdForUser = async ({ userId, emailId }) => {
    const email = await findOwnedEmailById({ userId, emailId });

    return toEmailRaw(email);
};
