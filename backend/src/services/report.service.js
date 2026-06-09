import mongoose from 'mongoose';

import createError from '../common/errors/create-error.js';
import { sendMonthlyDigestEmail } from '../../extras/notifications/send-email.js';
import Email from '../models/email.model.js';
import Scan from '../models/scan.model.js';

const MONTH_QUERY_PATTERN = /^\d{4}-(0[1-9]|1[0-2])$/;
const TOP_ITEMS_LIMIT = 10;

const toUserObjectId = (userId) => new mongoose.Types.ObjectId(String(userId));

const formatMonthLabel = ({ year, monthIndex }) =>
    `${year}-${String(monthIndex + 1).padStart(2, '0')}`;

const parseMonthlySummaryPeriod = (query = {}) => {
    const rawMonth = query.month;

    if (rawMonth === undefined) {
        const now = new Date();
        const year = now.getUTCFullYear();
        const monthIndex = now.getUTCMonth();

        return {
            month: formatMonthLabel({ year, monthIndex }),
            from: new Date(Date.UTC(year, monthIndex, 1)),
            to: new Date(Date.UTC(year, monthIndex + 1, 1)),
        };
    }

    if (typeof rawMonth !== 'string' || !MONTH_QUERY_PATTERN.test(rawMonth)) {
        throw createError(
            'Invalid month query parameter',
            400,
            ['month must use the YYYY-MM format, for example 2026-04.'],
            'INVALID_REPORT_MONTH'
        );
    }

    const [yearValue, monthValue] = rawMonth.split('-');
    const year = Number.parseInt(yearValue, 10);
    const monthIndex = Number.parseInt(monthValue, 10) - 1;

    return {
        month: rawMonth,
        from: new Date(Date.UTC(year, monthIndex, 1)),
        to: new Date(Date.UTC(year, monthIndex + 1, 1)),
    };
};

const buildDateRange = ({ from, to }) => ({
    $gte: from,
    $lt: to,
});

/*
 * SINGLE SOURCE OF TRUTH for the report counts.
 *
 * Every figure in the detection funnel is derived from ONE base set: the emails
 * that were synced into SecureInbox during the report window. "Synced" is keyed
 * on the email document's `createdAt` (the moment the email was first stored on a
 * sync). For each of those emails we attach its single most-recent scan via
 * `$lookup`, then derive everything else from that latest scan.
 *
 * Why this matters (the bug it fixes):
 *   Previously `syncedEmails` counted Email docs by `createdAt` while
 *   `scannedEmails` counted Scan docs by `scannedAt`. Those are two different
 *   collections measured on two different timestamps, and a re-scan rewrites
 *   `scannedAt` to "now" — so an email synced in a previous month but re-scanned
 *   this month was counted as scanned-but-not-synced. That let `scanned` exceed
 *   `synced` (e.g. 60 scanned vs 58 synced), which is impossible.
 *
 * Anchoring on the synced-email set guarantees the invariant
 *   scanned ≤ synced ≤ total fetched
 * because `scannedEmails` is, by construction, the subset of the window's synced
 * emails that have at least one scan. Counting the LATEST scan per email also
 * de-duplicates: each email contributes exactly once, with its most relevant
 * (most recent) verdict — never twice with two different scores.
 *
 * Returned counts:
 *   - syncedEmails:   emails first synced during the window (the base set)
 *   - scannedEmails:  of those, how many have been scanned (subset ⇒ ≤ synced)
 *   - safe/suspicious/likelyPhishing: split of scanned emails by latest verdict
 *   - quarantined:    latest verdict likely_phishing AND not yet user-reviewed
 */
const buildLatestScanLookupStages = () => [
    {
        $lookup: {
            from: 'scans',
            let: { emailId: '$_id', ownerId: '$userId' },
            pipeline: [
                {
                    $match: {
                        $expr: {
                            $and: [
                                { $eq: ['$emailId', '$$emailId'] },
                                { $eq: ['$userId', '$$ownerId'] },
                            ],
                        },
                    },
                },
                { $sort: { scannedAt: -1, updatedAt: -1, createdAt: -1 } },
                { $limit: 1 },
                {
                    $project: {
                        _id: 1,
                        verdict: 1,
                        triggeredRules: 1,
                        aiStatus: '$aiSignals.status',
                    },
                },
            ],
            as: 'latestScan',
        },
    },
    { $addFields: { latestScan: { $arrayElemAt: ['$latestScan', 0] } } },
];

const getWindowScanAggregates = async ({ userObjectId, from, to }) => {
    const [result] = await Email.aggregate([
        // Base set = emails synced (first stored) inside the window.
        { $match: { userId: userObjectId, createdAt: buildDateRange({ from, to }) } },
        ...buildLatestScanLookupStages(),
        {
            $facet: {
                counts: [
                    {
                        $group: {
                            _id: null,
                            syncedEmails: { $sum: 1 },
                            scannedEmails: {
                                $sum: { $cond: [{ $ifNull: ['$latestScan', false] }, 1, 0] },
                            },
                            safe: {
                                $sum: { $cond: [{ $eq: ['$latestScan.verdict', 'safe'] }, 1, 0] },
                            },
                            suspicious: {
                                $sum: { $cond: [{ $eq: ['$latestScan.verdict', 'suspicious'] }, 1, 0] },
                            },
                            likelyPhishing: {
                                $sum: {
                                    $cond: [{ $eq: ['$latestScan.verdict', 'likely_phishing'] }, 1, 0],
                                },
                            },
                            quarantined: {
                                $sum: {
                                    $cond: [
                                        {
                                            $and: [
                                                { $eq: ['$latestScan.verdict', 'likely_phishing'] },
                                                { $not: [{ $in: ['$userVerdict', ['safe', 'phishing']] }] },
                                            ],
                                        },
                                        1,
                                        0,
                                    ],
                                },
                            },
                        },
                    },
                ],
                // Top warning signs across the window's emails, one latest scan each.
                topTriggeredRules: [
                    { $match: { latestScan: { $ne: null } } },
                    { $unwind: '$latestScan.triggeredRules' },
                    {
                        $group: {
                            _id: '$latestScan.triggeredRules.rule',
                            count: { $sum: 1 },
                            totalPoints: { $sum: '$latestScan.triggeredRules.points' },
                        },
                    },
                    { $sort: { count: -1, totalPoints: -1, _id: 1 } },
                    { $limit: TOP_ITEMS_LIMIT },
                    { $project: { _id: 0, rule: '$_id', count: 1, totalPoints: 1 } },
                ],
                // AI coverage across the window's scanned emails.
                ai: [
                    { $match: { latestScan: { $ne: null } } },
                    { $group: { _id: '$latestScan.aiStatus', count: { $sum: 1 } } },
                ],
            },
        },
    ]);

    const counts = result?.counts?.[0] || {};
    const aiCounts = { evaluated: 0, failed: 0, disabled: 0 };
    for (const item of result?.ai || []) {
        if (Object.hasOwn(aiCounts, item._id)) {
            aiCounts[item._id] = item.count;
        }
    }

    return {
        syncedEmails: counts.syncedEmails || 0,
        scannedEmails: counts.scannedEmails || 0,
        verdictCounts: {
            safe: counts.safe || 0,
            suspicious: counts.suspicious || 0,
            likelyPhishing: counts.likelyPhishing || 0,
        },
        quarantined: counts.quarantined || 0,
        topTriggeredRules: result?.topTriggeredRules || [],
        ai: aiCounts,
    };
};

const DAILY_RISKY_EMAILS_LIMIT = 5;

// The actual emails from the window that still need the user's attention
// (suspicious or likely phishing, not yet reviewed). Highest risk first.
const getRecentRiskyEmails = async ({ userObjectId, from, to }) =>
    Scan.aggregate([
        {
            $match: {
                userId: userObjectId,
                verdict: { $in: ['suspicious', 'likely_phishing'] },
                scannedAt: buildDateRange({ from, to }),
            },
        },
        { $sort: { score: -1, scannedAt: -1 } },
        {
            $group: {
                _id: '$emailId',
                verdict: { $first: '$verdict' },
                score: { $first: '$score' },
            },
        },
        {
            $lookup: {
                from: 'emails',
                localField: '_id',
                foreignField: '_id',
                as: 'email',
            },
        },
        { $unwind: '$email' },
        {
            $match: {
                'email.userId': userObjectId,
                $or: [
                    { 'email.userVerdict': null },
                    { 'email.userVerdict': { $exists: false } },
                ],
            },
        },
        { $sort: { score: -1 } },
        { $limit: DAILY_RISKY_EMAILS_LIMIT },
        {
            $project: {
                _id: 0,
                verdict: 1,
                score: 1,
                subject: '$email.subject',
                from: '$email.from',
                providerMessageId: '$email.providerMessageId',
            },
        },
    ]);

export const getDailySummaryForUser = async ({ userId }) => {
    const userObjectId = toUserObjectId(userId);
    const to = new Date();
    const from = new Date(to.getTime() - 24 * 60 * 60 * 1000);

    const [aggregates, markedPhishing, riskyEmails] = await Promise.all([
        getWindowScanAggregates({ userObjectId, from, to }),
        Email.countDocuments({
            userId: userObjectId,
            userVerdict: 'phishing',
            reviewedAt: buildDateRange({ from, to }),
        }),
        getRecentRiskyEmails({ userObjectId, from, to }),
    ]);

    return {
        period: {
            from: from.toISOString(),
            to: to.toISOString(),
        },
        counts: {
            syncedEmails: aggregates.syncedEmails,
            scannedEmails: aggregates.scannedEmails,
            safe: aggregates.verdictCounts.safe,
            suspicious: aggregates.verdictCounts.suspicious,
            likelyPhishing: aggregates.verdictCounts.likelyPhishing,
            markedPhishing,
        },
        riskyEmails,
        topTriggeredRules: aggregates.topTriggeredRules,
        ai: aggregates.ai,
        generatedAt: to.toISOString(),
    };
};

export const getMonthlySummaryForUser = async ({ userId, query = {} }) => {
    const userObjectId = toUserObjectId(userId);
    const period = parseMonthlySummaryPeriod(query);
    const { from, to } = period;

    const [aggregates, reviewed, markedSafe, markedPhishing] = await Promise.all([
        getWindowScanAggregates({ userObjectId, from, to }),
        Email.countDocuments({
            userId: userObjectId,
            userVerdict: { $in: ['safe', 'phishing'] },
            reviewedAt: buildDateRange({ from, to }),
        }),
        Email.countDocuments({
            userId: userObjectId,
            userVerdict: 'safe',
            reviewedAt: buildDateRange({ from, to }),
        }),
        Email.countDocuments({
            userId: userObjectId,
            userVerdict: 'phishing',
            reviewedAt: buildDateRange({ from, to }),
        }),
    ]);

    return {
        period: {
            month: period.month,
            from: from.toISOString(),
            to: to.toISOString(),
        },
        counts: {
            syncedEmails: aggregates.syncedEmails,
            scannedEmails: aggregates.scannedEmails,
            safe: aggregates.verdictCounts.safe,
            suspicious: aggregates.verdictCounts.suspicious,
            likelyPhishing: aggregates.verdictCounts.likelyPhishing,
            reviewed,
            markedSafe,
            markedPhishing,
            quarantined: aggregates.quarantined,
        },
        topTriggeredRules: aggregates.topTriggeredRules,
        ai: aggregates.ai,
        generatedAt: new Date().toISOString(),
    };
};

export const sendMonthlySummaryForUser = async ({ user, query = {} }) => {
    const summary = await getMonthlySummaryForUser({
        userId: user._id,
        query,
    });

    try {
        return await sendMonthlyDigestEmail({
            recipient: user.email,
            userName: user.name,
            summary,
        });
    } catch (error) {
        return {
            sent: false,
            recipient: user.email,
            period: summary.period,
            generatedAt: summary.generatedAt,
            error: {
                code: 'EMAIL_SEND_FAILED',
                message: 'The monthly summary email could not be sent.',
                detail: error.message,
            },
        };
    }
};
