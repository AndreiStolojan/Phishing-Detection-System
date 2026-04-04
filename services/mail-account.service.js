import MailAccount from '../models/mail-account.model.js';
import jwt from 'jsonwebtoken';

import createError from '../common/errors/create-error.js';
import {
    assertGoogleOAuthConfig,
    buildGoogleOAuthUrl,
    exchangeCodePayload,
    GMAIL_PROFILE_URL,
    GOOGLE_OAUTH_TOKEN_URL,
} from '../config/google-oauth.js';
import { JWT_SECRET } from '../config/env.js';

const toPublicMailAccount = (mailAccount) => ({
    _id: mailAccount._id,
    userId: mailAccount.userId,
    provider: mailAccount.provider,
    accountEmail: mailAccount.accountEmail,
    status: mailAccount.status,
    tokenExpiryDate: mailAccount.tokenExpiryDate,
    lastSyncedAt: mailAccount.lastSyncedAt,
    createdAt: mailAccount.createdAt,
    updatedAt: mailAccount.updatedAt,
});

export const getMailAccountsForUser = async (userId) => {
    const mailAccounts = await MailAccount.find({ userId }).sort({ createdAt: -1 });

    return mailAccounts.map(toPublicMailAccount);
};

export const getGoogleConnectUrl = async (userId) => {
    assertGoogleOAuthConfig();

    const state = jwt.sign(
        {
            type: 'google_oauth_state',
            userId,
        },
        JWT_SECRET,
        { expiresIn: '10m' }
    );

    return {
        authUrl: buildGoogleOAuthUrl({ state }),
    };
};

const verifyGoogleOAuthState = (state) => {
    if (!state) {
        throw createError('Missing Google OAuth state', 400, [], 'GOOGLE_STATE_MISSING');
    }

    try {
        const decodedState = jwt.verify(state, JWT_SECRET);

        if (decodedState.type !== 'google_oauth_state' || !decodedState.userId) {
            throw createError('Invalid Google OAuth state', 400, [], 'GOOGLE_STATE_INVALID');
        }

        return decodedState;
    } catch (error) {
        if (error.statusCode) {
            throw error;
        }

        throw createError(
            'Invalid or expired Google OAuth state',
            400,
            [],
            'GOOGLE_STATE_EXPIRED'
        );
    }
};

const exchangeGoogleCodeForTokens = async (code) => {
    try {
        const response = await fetch(GOOGLE_OAUTH_TOKEN_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: exchangeCodePayload({ code }).toString(),
        });

        const payload = await response.json();

        if (!response.ok) {
            throw createError(
                payload.error_description || 'Failed to exchange Google authorization code',
                400,
                [],
                'GOOGLE_TOKEN_EXCHANGE_FAILED'
            );
        }

        return payload;
    } catch (error) {
        if (error.statusCode) {
            throw error;
        }

        throw createError(
            'Failed to reach Google token endpoint',
            502,
            ['Check your internet connection and Google OAuth configuration.'],
            'GOOGLE_TOKEN_ENDPOINT_UNREACHABLE'
        );
    }
};

const fetchGoogleAccountEmail = async (accessToken) => {
    try {
        const response = await fetch(GMAIL_PROFILE_URL, {
            method: 'GET',
            headers: {
                Authorization: `Bearer ${accessToken}`,
            },
        });

        const payload = await response.json();

        if (!response.ok || !payload.emailAddress) {
            throw createError(
                'Failed to fetch Gmail account profile',
                400,
                [],
                'GOOGLE_PROFILE_FETCH_FAILED'
            );
        }

        return payload.emailAddress;
    } catch (error) {
        if (error.statusCode) {
            throw error;
        }

        throw createError(
            'Failed to reach Gmail profile endpoint',
            502,
            ['Check your internet connection and Google OAuth configuration.'],
            'GOOGLE_PROFILE_ENDPOINT_UNREACHABLE'
        );
    }
};

export const connectGoogleMailAccount = async ({ code, state, googleError }) => {
    assertGoogleOAuthConfig();

    if (googleError) {
        throw createError(
            'Google authorization failed',
            400,
            [`Google returned: ${googleError}`],
            'GOOGLE_AUTHORIZATION_FAILED'
        );
    }

    if (!code) {
        throw createError(
            'Missing Google authorization code',
            400,
            ['Google did not return an authorization code.'],
            'GOOGLE_CODE_MISSING'
        );
    }

    const decodedState = verifyGoogleOAuthState(state);
    const tokenPayload = await exchangeGoogleCodeForTokens(code);
    const accountEmail = await fetchGoogleAccountEmail(tokenPayload.access_token);

    const tokenExpiryDate = tokenPayload.expires_in
        ? new Date(Date.now() + tokenPayload.expires_in * 1000)
        : null;

    const existingMailAccount = await MailAccount.findOne({
        userId: decodedState.userId,
        provider: 'gmail',
    });

    const mailAccount = await MailAccount.findOneAndUpdate(
        {
            userId: decodedState.userId,
            provider: 'gmail',
        },
        {
            userId: decodedState.userId,
            provider: 'gmail',
            accountEmail,
            status: 'active',
            accessToken: tokenPayload.access_token,
            refreshToken: tokenPayload.refresh_token ?? existingMailAccount?.refreshToken ?? null,
            tokenExpiryDate,
        },
        {
            new: true,
            upsert: true,
            runValidators: true,
            setDefaultsOnInsert: true,
        }
    );

    return toPublicMailAccount(mailAccount);
};

export const disconnectMailAccountForUser = async ({ userId, mailAccountId }) => {
    const mailAccount = await MailAccount.findOne({
        _id: mailAccountId,
        userId,
    });

    if (!mailAccount) {
        throw createError('Mail account not found', 404, [], 'MAIL_ACCOUNT_NOT_FOUND');
    }

    await MailAccount.deleteOne({ _id: mailAccount._id });

    return {
        message: 'Mail account disconnected successfully',
    };
};
