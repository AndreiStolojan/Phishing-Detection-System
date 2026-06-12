import {
    getMonthlySummaryForUser,
    sendMonthlySummaryForUser,
} from '../services/report.service.js';

const statusFromMailResult = (result) => {
    if (result.sent) return 200;
    return result.error?.code === 'EMAIL_CONFIG_MISSING' ? 503 : 502;
};

export const getMonthlySummary = async (req, res, next) => {
    try {
        const summary = await getMonthlySummaryForUser({
            userId: req.user._id,
            query: req.query,
        });

        res.status(200).json({
            success: true,
            data: summary,
        });
    } catch (error) {
        next(error);
    }
};

export const sendMonthlySummary = async (req, res, next) => {
    try {
        const result = await sendMonthlySummaryForUser({
            user: req.user,
            query: req.query,
        });

        res.status(statusFromMailResult(result)).json({
            success: result.sent,
            data: result,
        });
    } catch (error) {
        next(error);
    }
};
