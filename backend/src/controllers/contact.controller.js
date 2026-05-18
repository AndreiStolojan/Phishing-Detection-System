import { sendContactMessageForUser } from '../services/contact.service.js';

export const sendContactMessage = async (req, res, next) => {
    try {
        const result = await sendContactMessageForUser({
            user: req.user,
            payload: req.body,
        });

        const statusCode = result.sent
            ? 200
            : result.error?.code === 'EMAIL_CONFIG_MISSING'
                ? 503
                : 502;

        res.status(statusCode).json({
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
