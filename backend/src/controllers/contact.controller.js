import { sendContactMessageForUser } from '../services/contact.service.js';

const statusFromMailResult = (result) => {
    if (result.sent) return 200;
    return result.error?.code === 'EMAIL_CONFIG_MISSING' ? 503 : 502;
};

export const sendContactMessage = async (req, res, next) => {
    try {
        const result = await sendContactMessageForUser({
            user: req.user,
            payload: req.body,
        });

        res.status(statusFromMailResult(result)).json({
            success: result.sent,
            message: result.sent
                ? 'Contact message sent.'
                : result.error?.message || 'Contact message could not be sent.',
            data: result,
        });
    } catch (error) {
        next(error);
    }
};
