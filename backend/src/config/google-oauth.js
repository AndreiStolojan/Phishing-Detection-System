import {
    GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET,
    GOOGLE_REDIRECT_URI,
} from './env.js';
import createError from '../common/errors/create-error.js';

export const GMAIL_MODIFY_SCOPE = 'https://www.googleapis.com/auth/gmail.modify';
export const GOOGLE_OAUTH_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
export const GOOGLE_OAUTH_TOKEN_URL = 'https://oauth2.googleapis.com/token';
export const GMAIL_PROFILE_URL = 'https://gmail.googleapis.com/gmail/v1/users/me/profile';
export const GMAIL_MESSAGES_LIST_URL = 'https://gmail.googleapis.com/gmail/v1/users/me/messages';
export const GMAIL_MESSAGE_DETAILS_BASE_URL = 'https://gmail.googleapis.com/gmail/v1/users/me/messages';
export const GMAIL_HISTORY_LIST_URL = 'https://gmail.googleapis.com/gmail/v1/users/me/history';
export const GMAIL_WATCH_URL = 'https://gmail.googleapis.com/gmail/v1/users/me/watch';
export const GMAIL_STOP_URL = 'https://gmail.googleapis.com/gmail/v1/users/me/stop';

export const googleOAuthConfig = {
    clientId: GOOGLE_CLIENT_ID,
    clientSecret: GOOGLE_CLIENT_SECRET,
    redirectUri: GOOGLE_REDIRECT_URI,
    scopes: [GMAIL_MODIFY_SCOPE],
};

export const assertGoogleOAuthConfig = () => {
    const missingGoogleEnvVars = [
        ['GOOGLE_CLIENT_ID', GOOGLE_CLIENT_ID],
        ['GOOGLE_CLIENT_SECRET', GOOGLE_CLIENT_SECRET],
        ['GOOGLE_REDIRECT_URI', GOOGLE_REDIRECT_URI],
    ]
        .filter(([, value]) => !value)
        .map(([name]) => name);

    if (missingGoogleEnvVars.length > 0) {
        throw createError(
            'Gmail integration is not configured for this local installation.',
            503,
            [`Set ${missingGoogleEnvVars.join(', ')} in .env and run ./provision again.`],
            'INTEGRATION_NOT_CONFIGURED'
        );
    }
};

export const buildGoogleOAuthUrl = ({ state }) => {
    assertGoogleOAuthConfig();

    const query = new URLSearchParams({
        client_id: GOOGLE_CLIENT_ID,
        redirect_uri: GOOGLE_REDIRECT_URI,
        response_type: 'code',
        scope: googleOAuthConfig.scopes.join(' '),
        access_type: 'offline',
        prompt: 'consent',
        state,
    });

    return `${GOOGLE_OAUTH_AUTH_URL}?${query.toString()}`;
};

export const exchangeCodePayload = ({ code }) => new URLSearchParams({
    client_id: GOOGLE_CLIENT_ID,
    client_secret: GOOGLE_CLIENT_SECRET,
    redirect_uri: GOOGLE_REDIRECT_URI,
    grant_type: 'authorization_code',
    code,
});

export const refreshTokenPayload = ({ refreshToken }) => new URLSearchParams({
    client_id: GOOGLE_CLIENT_ID,
    client_secret: GOOGLE_CLIENT_SECRET,
    grant_type: 'refresh_token',
    refresh_token: refreshToken,
});
