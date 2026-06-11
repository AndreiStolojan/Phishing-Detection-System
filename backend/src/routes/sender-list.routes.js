import { Router } from 'express';

import sendErrorResponse from '../common/http/send-error-response.js';
import authorize from '../middlewares/auth.middleware.js';
import {
    createSenderListEntry,
    deleteSenderListEntry,
    listSenderListEntries,
} from '../controllers/sender-list.controller.js';
import {
    createSenderListEntrySchema,
    senderListEntryParamsSchema,
} from '../validations/sender-list.validation.js';

const senderListRouter = Router();

const validateWith = (schema, source) => (req, res, next) => {
    const { error, value } = schema.validate(req[source], {
        abortEarly: false,
        stripUnknown: true,
    });

    if (error) {
        const messages = error.details.map((detail) => detail.message);

        return sendErrorResponse(res, 400, 'Validation failed', 'VALIDATION_ERROR', messages);
    }

    req[source] = value;
    next();
};

senderListRouter.get('/', authorize, listSenderListEntries);
senderListRouter.post(
    '/',
    authorize,
    validateWith(createSenderListEntrySchema, 'body'),
    createSenderListEntry
);
senderListRouter.delete(
    '/:id',
    authorize,
    validateWith(senderListEntryParamsSchema, 'params'),
    deleteSenderListEntry
);

export default senderListRouter;
