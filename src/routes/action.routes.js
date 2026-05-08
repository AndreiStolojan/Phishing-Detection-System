import { Router } from 'express';

import {
    markEmailPhishing,
    markEmailSafe,
} from '../controllers/action.controller.js';
import sendErrorResponse from '../common/http/send-error-response.js';
import authorize from '../middlewares/auth.middleware.js';
import { emailActionParamsSchema } from '../validations/action.validation.js';

const actionRouter = Router();

const validateEmailActionParams = (req, res, next) => {
    const { error, value } = emailActionParamsSchema.validate(req.params, {
        abortEarly: false,
        stripUnknown: true,
    });

    if (error) {
        const messages = error.details.map((detail) => detail.message);

        return sendErrorResponse(res, 400, 'Validation failed', 'VALIDATION_ERROR', messages);
    }

    req.params = value;
    next();
};

actionRouter.post('/emails/:id/mark-safe', authorize, validateEmailActionParams, markEmailSafe);
actionRouter.post(
    '/emails/:id/mark-phishing',
    authorize,
    validateEmailActionParams,
    markEmailPhishing
);

export default actionRouter;
