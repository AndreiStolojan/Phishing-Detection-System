import { Router, json } from 'express';
import { rateLimit } from 'express-rate-limit';

import sendErrorResponse from '../common/http/send-error-response.js';
import { createGmailPushWebhookHandler } from '../controllers/gmail-push.controller.js';
import {
    GMAIL_PUSH_AUDIENCE,
    GMAIL_PUSH_SERVICE_ACCOUNT_EMAIL,
} from '../config/env.js';
import { createGmailPushOidcMiddleware } from '../middlewares/gmail-push-oidc.middleware.js';

const requireJsonContentType = (onRejected) => (req, res, next) => {
    if (!req.is('application/json')) {
        onRejected?.();
        return sendErrorResponse(
            res,
            415,
            'Content-Type must be application/json',
            'GMAIL_PUSH_CONTENT_TYPE_INVALID'
        );
    }

    return next();
};

const createGmailPushRateLimiter = (options = {}, onRejected) => rateLimit({
    // Pub/Sub originates behind shared Google/proxy addresses, so this is an
    // intentional global burst ceiling for the webhook, not a per-user quota.
    windowMs: 60 * 1000,
    limit: 600,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    handler: (req, res) => {
        onRejected?.();
        return sendErrorResponse(
            res,
            429,
            'Too many Gmail push requests',
            'GMAIL_PUSH_RATE_LIMIT_EXCEEDED'
        );
    },
    ...options,
});

export const createGmailPushRouter = ({
    findActiveMailAccountsByEmail,
    enqueueNotification,
    authClient,
    audience = GMAIL_PUSH_AUDIENCE,
    serviceAccountEmail = GMAIL_PUSH_SERVICE_ACCOUNT_EMAIL,
    rateLimiterOptions,
    now,
    onResult,
} = {}) => {
    const router = Router();
    const verifyOidc = createGmailPushOidcMiddleware({
        audience,
        serviceAccountEmail,
        authClient,
        onRejected: () => onResult?.('rejected'),
    });
    const handleWebhook = createGmailPushWebhookHandler({
        findActiveMailAccountsByEmail,
        enqueueNotification,
        now,
        onResult,
    });

    router.post(
        '/',
        createGmailPushRateLimiter(rateLimiterOptions, () => onResult?.('rejected')),
        verifyOidc,
        requireJsonContentType(() => onResult?.('rejected')),
        json({ limit: '64kb', strict: true }),
        handleWebhook,
        (error, _req, _res, next) => {
            onResult?.('rejected');
            next(error);
        }
    );

    return router;
};
