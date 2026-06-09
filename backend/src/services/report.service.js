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

const getVerdictCounts = async ({ userObjectId, from, to }) => {
    const verdictResults = await Scan.aggregate([
        {
            $match: {
                userId: userObjectId,
                scannedAt: buildDateRange({ from, to }),
            },
        },
        {
            $group: {
                _id: '$verdict',
                count: { $sum: 1 },
            },
        },
    ]);

    const counts = {
        safe: 0,
        suspicious: 0,
        likelyPhishing: 0,
    };

    for (const item of verdictResults) {
        if (item._id === 'safe') {
            counts.safe = item.count;
        }

        if (item._id === 'suspicious') {
            counts.suspicious = item.count;
        }

        if (item._id === 'likely_phishing') {
            counts.likelyPhishing = item.count;
        }
    }

    return counts;
};

const getAiCounts = async ({ userObjectId, from, to }) => {
    const aiResults = await Scan.aggregate([
        {
            $match: {
                userId: userObjectId,
                scannedAt: buildDateRange({ from, to }),
            },
        },
        {
            $group: {
                _id: '$aiSignals.status',
                count: { $sum: 1 },
            },
        },
    ]);

    const counts = {
        evaluated: 0,
        failed: 0,
        disabled: 0,
    };

    for (const item of aiResults) {
        if (Object.hasOwn(counts, item._id)) {
            counts[item._id] = item.count;
        }
    }

    return counts;
};

const getTopTriggeredRules = async ({ userObjectId, from, to }) =>
    Scan.aggregate([
        {
            $match: {
                userId: userObjectId,
                scannedAt: buildDateRange({ from, to }),
            },
        },
        { $unwind: '$triggeredRules' },
        {
            $group: {
                _id: '$triggeredRules.rule',
                count: { $sum: 1 },
                totalPoints: { $sum: '$triggeredRules.points' },
            },
        },
        {
            $sort: {
                count: -1,
                totalPoints: -1,
                _id: 1,
            },
        },
        { $limit: TOP_ITEMS_LIMIT },
        {
            $project: {
                _id: 0,
                rule: '$_id',
                count: 1,
                totalPoints: 1,
            },
        },
    ]);

const getQuarantinedCount = async ({ userObjectId, from, to }) => {
    const scanQuarantineResult = await Scan.aggregate([
        {
            $match: {
                userId: userObjectId,
                verdict: 'likely_phishing',
                scannedAt: buildDateRange({ from, to }),
            },
        },
        {
            $lookup: {
                from: 'emails',
                localField: 'emailId',
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
        { $count: 'count' },
    ]);

    return scanQuarantineResult[0]?.count || 0;
};

export const getDailySummaryForUser = async ({ userId }) => {
    const userObjectId = toUserObjectId(userId);
    const to = new Date();
    const from = new Date(to.getTime() - 24 * 60 * 60 * 1000);

    const [
        syncedEmails,
        scannedEmails,
        verdictCounts,
        markedPhishing,
        topTriggeredRules,
        ai,
    ] = await Promise.all([
        Email.countDocuments({
            userId: userObjectId,
            createdAt: buildDateRange({ from, to }),
        }),
        Scan.countDocuments({
            userId: userObjectId,
            scannedAt: buildDateRange({ from, to }),
        }),
        getVerdictCounts({ userObjectId, from, to }),
        Email.countDocuments({
            userId: userObjectId,
            userVerdict: 'phishing',
            reviewedAt: buildDateRange({ from, to }),
        }),
        getTopTriggeredRules({ userObjectId, from, to }),
        getAiCounts({ userObjectId, from, to }),
    ]);

    return {
        period: {
            from: from.toISOString(),
            to: to.toISOString(),
        },
        counts: {
            syncedEmails,
            scannedEmails,
            safe: verdictCounts.safe,
            suspicious: verdictCounts.suspicious,
            likelyPhishing: verdictCounts.likelyPhishing,
            markedPhishing,
        },
        topTriggeredRules,
        ai,
        generatedAt: to.toISOString(),
    };
};

export const getMonthlySummaryForUser = async ({ userId, query = {} }) => {
    const userObjectId = toUserObjectId(userId);
    const period = parseMonthlySummaryPeriod(query);
    const { from, to } = period;

    const [
        syncedEmails,
        scannedEmails,
        verdictCounts,
        reviewed,
        markedSafe,
        markedPhishing,
        quarantined,
        topTriggeredRules,
        ai,
    ] = await Promise.all([
        Email.countDocuments({
            userId: userObjectId,
            createdAt: buildDateRange({ from, to }),
        }),
        Scan.countDocuments({
            userId: userObjectId,
            scannedAt: buildDateRange({ from, to }),
        }),
        getVerdictCounts({ userObjectId, from, to }),
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
        getQuarantinedCount({ userObjectId, from, to }),
        getTopTriggeredRules({ userObjectId, from, to }),
        getAiCounts({ userObjectId, from, to }),
    ]);

    return {
        period: {
            month: period.month,
            from: from.toISOString(),
            to: to.toISOString(),
        },
        counts: {
            syncedEmails,
            scannedEmails,
            safe: verdictCounts.safe,
            suspicious: verdictCounts.suspicious,
            likelyPhishing: verdictCounts.likelyPhishing,
            reviewed,
            markedSafe,
            markedPhishing,
            quarantined,
        },
        topTriggeredRules,
        ai,
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
                message: 'Emailul de sumar lunar nu a putut fi trimis.',
                detail: error.message,
            },
        };
    }
};
