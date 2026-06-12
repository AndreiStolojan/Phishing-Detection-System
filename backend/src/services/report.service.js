import mongoose from 'mongoose';

import createError from '../common/errors/create-error.js';
import { parseDateRangeQuery } from '../common/utils/date-range.js';
import { sendMonthlyDigestEmail } from '../../extras/notifications/send-email.js';
import Email from '../models/email.model.js';
import Scan from '../models/scan.model.js';

const MONTH_QUERY_PATTERN = /^\d{4}-(0[1-9]|1[0-2])$/;
const TOP_ITEMS_LIMIT = 10;
// Display-only label the frontend sends with a from/to range (e.g. "Yesterday"),
// capped so it can never bloat the report email subject.
const RANGE_LABEL_MAX_LENGTH = 60;

const toUserObjectId = (userId) => new mongoose.Types.ObjectId(String(userId));

const formatMonthLabel = ({ year, monthIndex }) =>
    `${year}-${String(monthIndex + 1).padStart(2, '0')}`;

/*
 * Resolve the report window. Two modes:
 *   - range mode: absolute `from`/`to` (the app's global time filter). Takes
 *     precedence over `month`. Anchors on `receivedAt` so the report covers
 *     the same emails the inbox and dashboard show for that range.
 *   - month mode (legacy): `month=YYYY-MM` or the current UTC month. Anchors
 *     on `createdAt` (first sync), unchanged for backward compatibility.
 */
const parseMonthlySummaryPeriod = (query = {}) => {
    const range = parseDateRangeQuery(query);

    if (range) {
        const rawLabel = typeof query.label === 'string' ? query.label.trim() : '';

        return {
            mode: 'range',
            label: rawLabel ? rawLabel.slice(0, RANGE_LABEL_MAX_LENGTH) : null,
            from: range.from,
            to: range.to,
        };
    }

    const rawMonth = query.month;

    if (rawMonth === undefined) {
        const now = new Date();
        const year = now.getUTCFullYear();
        const monthIndex = now.getUTCMonth();

        return {
            mode: 'month',
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
        mode: 'month',
        month: rawMonth,
        from: new Date(Date.UTC(year, monthIndex, 1)),
        to: new Date(Date.UTC(year, monthIndex + 1, 1)),
    };
};

// Public period shape: month mode keeps its historical { month, from, to };
// range mode exposes { from, to, label } (no month to mislabel it with).
const toPeriodResponse = (period) =>
    period.mode === 'range'
        ? {
            from: period.from.toISOString(),
            to: period.to.toISOString(),
            label: period.label,
        }
        : {
            month: period.month,
            from: period.from.toISOString(),
            to: period.to.toISOString(),
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

// `$userVerdict` is neither 'safe' nor 'phishing': the user has not reviewed the email,
// so its scan verdict still decides the effective bucket.
const isUnreviewedExpr = { $not: [{ $in: ['$userVerdict', ['safe', 'phishing']] }] };

// True when the email has a latest scan attached.
const hasLatestScanExpr = { $ifNull: ['$latestScan', false] };

// Sum 1 for every document where `expr` is truthy, 0 otherwise.
const countWhere = (expr) => ({ $sum: { $cond: [expr, 1, 0] } });

// Count documents whose latest scan carries the given raw verdict.
const countWhereScanVerdict = (verdict) =>
    countWhere({ $eq: ['$latestScan.verdict', verdict] });

const windowCountsFacet = [
    {
        $group: {
            _id: null,
            syncedEmails: { $sum: 1 },
            scannedEmails: countWhere(hasLatestScanExpr),
            safe: countWhereScanVerdict('safe'),
            /*
             * Effective-verdict split: the user's review overrides the scan,
             * exactly like the dashboard buckets. Every scanned email lands in
             * exactly one of the four (no double counting):
             *   marked safe            -> effectiveSafe
             *   marked phishing        -> effectiveMarkedPhishing
             *   unreviewed             -> its scan verdict bucket
             */
            effectiveSafe: countWhere({
                $and: [
                    hasLatestScanExpr,
                    {
                        $or: [
                            { $eq: ['$userVerdict', 'safe'] },
                            {
                                $and: [
                                    isUnreviewedExpr,
                                    { $eq: ['$latestScan.verdict', 'safe'] },
                                ],
                            },
                        ],
                    },
                ],
            }),
            effectiveSuspicious: countWhere({
                $and: [isUnreviewedExpr, { $eq: ['$latestScan.verdict', 'suspicious'] }],
            }),
            effectiveLikelyPhishing: countWhere({
                $and: [
                    isUnreviewedExpr,
                    { $eq: ['$latestScan.verdict', 'likely_phishing'] },
                ],
            }),
            effectiveMarkedPhishing: countWhere({
                $and: [hasLatestScanExpr, { $eq: ['$userVerdict', 'phishing'] }],
            }),
            suspicious: countWhereScanVerdict('suspicious'),
            likelyPhishing: countWhereScanVerdict('likely_phishing'),
            quarantined: countWhere({
                $and: [
                    { $eq: ['$latestScan.verdict', 'likely_phishing'] },
                    isUnreviewedExpr,
                ],
            }),
        },
    },
];

// Top warning signs across the window's emails, one latest scan each.
const topTriggeredRulesFacet = [
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
];

// AI coverage across the window's scanned emails.
const aiCoverageFacet = [
    { $match: { latestScan: { $ne: null } } },
    { $group: { _id: '$latestScan.aiStatus', count: { $sum: 1 } } },
];

const getWindowScanAggregates = async ({ userObjectId, from, to, dateField = 'createdAt' }) => {
    const [result] = await Email.aggregate([
        // Base set = emails inside the window. Month mode keys on `createdAt`
        // (first stored on a sync); range mode keys on `receivedAt` so the
        // report matches what the inbox shows for the same range.
        { $match: { userId: userObjectId, [dateField]: buildDateRange({ from, to }) } },
        ...buildLatestScanLookupStages(),
        {
            $facet: {
                counts: windowCountsFacet,
                topTriggeredRules: topTriggeredRulesFacet,
                ai: aiCoverageFacet,
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
        effectiveCounts: {
            safe: counts.effectiveSafe || 0,
            suspicious: counts.effectiveSuspicious || 0,
            likelyPhishing: counts.effectiveLikelyPhishing || 0,
            markedPhishing: counts.effectiveMarkedPhishing || 0,
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

// Shared subset of the counts object built by both the daily and monthly
// summaries. Each caller spreads this and adds its own extra fields.
const toBaseCounts = (aggregates) => ({
    syncedEmails: aggregates.syncedEmails,
    scannedEmails: aggregates.scannedEmails,
    safe: aggregates.verdictCounts.safe,
    suspicious: aggregates.verdictCounts.suspicious,
    likelyPhishing: aggregates.verdictCounts.likelyPhishing,
});

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
            ...toBaseCounts(aggregates),
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
    const dateField = period.mode === 'range' ? 'receivedAt' : 'createdAt';

    const [aggregates, reviewed, markedSafe, markedPhishing] = await Promise.all([
        getWindowScanAggregates({ userObjectId, from, to, dateField }),
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
        period: toPeriodResponse(period),
        counts: {
            ...toBaseCounts(aggregates),
            effectiveSafe: aggregates.effectiveCounts.safe,
            effectiveSuspicious: aggregates.effectiveCounts.suspicious,
            effectiveLikelyPhishing: aggregates.effectiveCounts.likelyPhishing,
            effectiveMarkedPhishing: aggregates.effectiveCounts.markedPhishing,
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
