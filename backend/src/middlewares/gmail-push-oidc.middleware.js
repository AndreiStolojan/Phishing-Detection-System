import { OAuth2Client } from 'google-auth-library';

import sendErrorResponse from '../common/http/send-error-response.js';

const MAX_BEARER_TOKEN_LENGTH = 16 * 1024;
const JWT_BEARER_PATTERN = /^Bearer ([A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+)$/i;

const rejectOidcRequest = (res) =>
    sendErrorResponse(
        res,
        401,
        'Unauthorized',
        'GMAIL_PUSH_UNAUTHORIZED'
    );

const readAuthorizationHeader = (req) => {
    if (Array.isArray(req.rawHeaders)) {
        let authorizationHeaderCount = 0;

        for (let index = 0; index < req.rawHeaders.length; index += 2) {
            if (String(req.rawHeaders[index]).toLowerCase() === 'authorization') {
                authorizationHeaderCount += 1;
            }
        }

        if (authorizationHeaderCount !== 1) {
            return null;
        }
    }

    const header = req.get?.('authorization') ?? req.headers?.authorization;

    if (
        typeof header !== 'string' ||
        header.length > MAX_BEARER_TOKEN_LENGTH
    ) {
        return null;
    }

    return JWT_BEARER_PATTERN.exec(header)?.[1] ?? null;
};

export const createGmailPushOidcMiddleware = ({
    audience,
    serviceAccountEmail,
    authClient = new OAuth2Client(),
    onRejected = () => {},
} = {}) => {
    if (!audience || !serviceAccountEmail) {
        throw new Error('Gmail push OIDC configuration is incomplete');
    }

    if (typeof authClient.verifyIdToken !== 'function') {
        throw new TypeError('authClient.verifyIdToken must be a function');
    }

    return async (req, res, next) => {
        const token = readAuthorizationHeader(req);

        if (!token) {
            onRejected();
            return rejectOidcRequest(res);
        }

        try {
            const ticket = await authClient.verifyIdToken({
                idToken: token,
                audience,
            });
            const payload = ticket?.getPayload?.();

            if (
                !payload ||
                payload.email !== serviceAccountEmail ||
                payload.email_verified !== true
            ) {
                onRejected();
                return rejectOidcRequest(res);
            }

            req.gmailPushIdentity = {
                subject: typeof payload.sub === 'string' ? payload.sub : null,
            };

            return next();
        } catch {
            onRejected();
            return rejectOidcRequest(res);
        }
    };
};
