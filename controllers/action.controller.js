import {
    markEmailPhishingForUser,
    markEmailSafeForUser,
} from '../services/action.service.js';

const runAction = ({ service, successMessage }) => async (req, res, next) => {
    try {
        const result = await service({
            userId: req.user._id,
            emailId: req.params.id,
        });

        res.status(200).json({
            success: true,
            message: successMessage,
            data: result,
        });
    } catch (error) {
        next(error);
    }
};

export const markEmailSafe = runAction({
    service: markEmailSafeForUser,
    successMessage: 'Email marked as safe',
});

export const markEmailPhishing = runAction({
    service: markEmailPhishingForUser,
    successMessage: 'Email marked as phishing',
});
