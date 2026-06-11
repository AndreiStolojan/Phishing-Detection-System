import {
    getEmailByIdForUser,
    getEmailRawByIdForUser,
    getEmailsForUser,
    getRiskBucketCountsForUser,
    getTopRiskySendersForUser,
    getTrendForUser,
} from '../services/email.service.js';

export const getEmailStats = async (req, res, next) => {
    try {
        const result = await getRiskBucketCountsForUser({
            userId: req.user._id,
            days: req.query.days,
            from: req.query.from,
            to: req.query.to,
        });

        res.status(200).json({
            success: true,
            data: result,
        });
    } catch (error) {
        next(error);
    }
};

export const getEmails = async (req, res, next) => {
    try {
        const result = await getEmailsForUser({
            userId: req.user._id,
            query: req.query,
        });

        res.status(200).json({
            success: true,
            data: result,
        });
    } catch (error) {
        next(error);
    }
};

export const getEmailById = async (req, res, next) => {
    try {
        const email = await getEmailByIdForUser({
            userId: req.user._id,
            emailId: req.params.id,
        });

        res.status(200).json({
            success: true,
            data: email,
        });
    } catch (error) {
        next(error);
    }
};

export const getEmailRawById = async (req, res, next) => {
    try {
        const rawEmail = await getEmailRawByIdForUser({
            userId: req.user._id,
            emailId: req.params.id,
        });

        res.status(200).json({
            success: true,
            data: rawEmail,
        });
    } catch (error) {
        next(error);
    }
};

export const getEmailTrend = async (req, res, next) => {
    try {
        const trend = await getTrendForUser({
            userId: req.user._id,
            from: req.query.from,
            to: req.query.to,
        });
        res.status(200).json({ success: true, data: trend });
    } catch (error) {
        next(error);
    }
};

export const getTopRiskySenders = async (req, res, next) => {
    try {
        const senders = await getTopRiskySendersForUser({
            userId: req.user._id,
            days: Number.parseInt(req.query.days, 10) || 30,
            from: req.query.from,
            to: req.query.to,
        });
        res.status(200).json({ success: true, data: senders });
    } catch (error) {
        next(error);
    }
};
