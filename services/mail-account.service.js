import MailAccount from '../models/mail-account.model.js';
import Email from '../models/email.model.js';
import jwt from 'jsonwebtoken';

import createError from '../common/errors/create-error.js';
import {
    assertGoogleOAuthConfig,
    buildGoogleOAuthUrl,
    exchangeCodePayload,
    GMAIL_MESSAGE_DETAILS_BASE_URL,
    GMAIL_MESSAGES_LIST_URL,
    GMAIL_PROFILE_URL,
    GOOGLE_OAUTH_TOKEN_URL,
    refreshTokenPayload,
} from '../config/google-oauth.js';
import { JWT_SECRET } from '../config/env.js';
import { parseGmailMessageToEmailPayload } from './email-parser.service.js';
import { runSyncScanPipeline } from './scan.service.js';

const GMAIL_SYNC_MAX_RESULTS = 5;
const SYNC_ERRORS_MAX_ITEMS = 5;
const SYNC_ERROR_MESSAGE_MAX_LENGTH = 180;

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

const sanitizeSyncErrorMessage = (error) => {
    const rawMessage = typeof error?.message === 'string' ? error.message : 'Unexpected sync error';
    const normalizedMessage = rawMessage.replace(/\s+/g, ' ').trim();

    if (normalizedMessage.length <= SYNC_ERROR_MESSAGE_MAX_LENGTH) {
        return normalizedMessage;
    }

    return `${normalizedMessage.slice(0, SYNC_ERROR_MESSAGE_MAX_LENGTH)}...`;
};

const toSyncErrorItem = ({ messageId, stage, error }) => ({
    messageId,
    stage,
    code: error?.code || 'SYNC_ITEM_PROCESSING_FAILED',
    statusCode: Number.isInteger(error?.statusCode) ? error.statusCode : 500,
    message: sanitizeSyncErrorMessage(error),
});

const logSyncItemFailure = ({ mailAccount, syncSource, messageId, stage, error }) => {
    console.error('[gmail-sync] Message processing failed', {
        userId: String(mailAccount.userId),
        mailAccountId: String(mailAccount._id),
        provider: mailAccount.provider,
        syncSource,
        messageId,
        stage,
        code: error?.code || null,
        statusCode: Number.isInteger(error?.statusCode) ? error.statusCode : null,
        message: sanitizeSyncErrorMessage(error),
    });
};

const pushCappedSyncError = ({ syncErrors, messageId, stage, error }) => {
    if (syncErrors.length >= SYNC_ERRORS_MAX_ITEMS) {
        return false;
    }

    syncErrors.push(
        toSyncErrorItem({
            messageId,
            stage,
            error,
        })
    );

    return true;
};

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

const parseJsonSafely = async (response) => {
    try {
        return await response.json();
    } catch {
        return {};
    }
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

const refreshGoogleAccessToken = async (mailAccount) => {
    if (!mailAccount.refreshToken) {
        throw createError(
            'Google access token expired and refresh token is missing',
            401,
            ['Reconnect your Gmail account to continue sync.'],
            'GOOGLE_REFRESH_TOKEN_MISSING'
        );
    }

    try {
        const response = await fetch(GOOGLE_OAUTH_TOKEN_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: refreshTokenPayload({ refreshToken: mailAccount.refreshToken }).toString(),
        });

        const payload = await parseJsonSafely(response);

        if (!response.ok || !payload.access_token) {
            throw createError(
                payload.error_description || payload.error || 'Failed to refresh Google access token',
                401,
                ['Reconnect your Gmail account and retry the sync.'],
                'GOOGLE_TOKEN_REFRESH_FAILED'
            );
        }

        const tokenExpiryDate = payload.expires_in
            ? new Date(Date.now() + payload.expires_in * 1000)
            : null;

        await MailAccount.updateOne(
            { _id: mailAccount._id },
            {
                $set: {
                    accessToken: payload.access_token,
                    refreshToken: payload.refresh_token ?? mailAccount.refreshToken,
                    tokenExpiryDate,
                    status: 'active',
                },
            }
        );

        mailAccount.accessToken = payload.access_token;
        mailAccount.refreshToken = payload.refresh_token ?? mailAccount.refreshToken;
        mailAccount.tokenExpiryDate = tokenExpiryDate;
        mailAccount.status = 'active';

        return payload.access_token;
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

const requestGoogleJson = async ({
    mailAccount,
    url,
    fallbackMessage,
    errorCode,
    unreachableCode,
}) => {
    let accessToken = mailAccount.accessToken;

    for (let attempt = 0; attempt < 2; attempt += 1) {
        let response;

        try {
            response = await fetch(url, {
                method: 'GET',
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                },
            });
        } catch {
            throw createError(
                'Failed to reach Gmail API endpoint',
                502,
                ['Check your internet connection and Google OAuth configuration.'],
                unreachableCode
            );
        }

        const payload = await parseJsonSafely(response);

        if (response.status === 401 && attempt === 0) {
            accessToken = await refreshGoogleAccessToken(mailAccount);
            continue;
        }

        if (!response.ok) {
            throw createError(
                payload?.error?.message || fallbackMessage,
                response.status,
                [],
                errorCode
            );
        }

        return payload;
    }

    throw createError(
        'Google access token is invalid or expired',
        401,
        ['Reconnect your Gmail account and retry the sync.'],
        errorCode
    );
};

const fetchGmailMessagesList = async (mailAccount) => {
    const query = new URLSearchParams({
        maxResults: String(GMAIL_SYNC_MAX_RESULTS),
    });

    query.append('labelIds', 'INBOX');

    const url = `${GMAIL_MESSAGES_LIST_URL}?${query.toString()}`;

    const payload = await requestGoogleJson({
        mailAccount,
        url,
        fallbackMessage: 'Failed to fetch Gmail messages list',
        errorCode: 'GMAIL_MESSAGES_LIST_FAILED',
        unreachableCode: 'GMAIL_MESSAGES_LIST_UNREACHABLE',
    });

    return payload.messages || [];
};

const fetchGmailMessageDetails = async ({ mailAccount, messageId }) => {
    const query = new URLSearchParams({
        format: 'full',
    });

    const url = `${GMAIL_MESSAGE_DETAILS_BASE_URL}/${encodeURIComponent(messageId)}?${query.toString()}`;

    return requestGoogleJson({
        mailAccount,
        url,
        fallbackMessage: 'Failed to fetch Gmail message details',
        errorCode: 'GMAIL_MESSAGE_DETAILS_FAILED',
        unreachableCode: 'GMAIL_MESSAGE_DETAILS_UNREACHABLE',
    });
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

export const syncGmailEmailsForUser = async ({ userId, mailAccountId }) => {
    const mailAccount = await MailAccount.findOne({
        _id: mailAccountId,
        userId,
    });

    if (!mailAccount) {
        throw createError('Mail account not found', 404, [], 'MAIL_ACCOUNT_NOT_FOUND');
    }

    if (mailAccount.provider !== 'gmail') {
        throw createError(
            'Sync is currently available only for Gmail accounts',
            400,
            [],
            'MAIL_PROVIDER_NOT_SUPPORTED'
        );
    }

    if (!mailAccount.accessToken) {
        throw createError(
            'Google access token is missing for this account',
            400,
            ['Reconnect your Gmail account and retry the sync.'],
            'GOOGLE_ACCESS_TOKEN_MISSING'
        );
    }

    const gmailMessages = await fetchGmailMessagesList(mailAccount);
    const syncSource = mailAccount.lastSyncedAt ? 'gmail_manual_sync' : 'gmail_initial_sync';

    let insertedCount = 0;
    let updatedCount = 0;
    let skippedCount = 0;
    const insertedEmailIds = [];
    const updatedEmailIds = [];
    const syncErrors = [];
    let omittedSyncErrorsCount = 0;

    for (const gmailMessage of gmailMessages) {
        if (!gmailMessage.id) {
            skippedCount += 1;
            continue;
        }

        const messageId = gmailMessage.id;

        let messageDetails;

        try {
            messageDetails = await fetchGmailMessageDetails({
                mailAccount,
                messageId,
            });
        } catch (error) {
            skippedCount += 1;
            logSyncItemFailure({
                mailAccount,
                syncSource,
                messageId,
                stage: 'details_fetch',
                error,
            });

            const isStored = pushCappedSyncError({
                syncErrors,
                messageId,
                stage: 'details_fetch',
                error,
            });

            if (!isStored) {
                omittedSyncErrorsCount += 1;
            }

            continue;
        }

        let emailPayload;

        try {
            emailPayload = parseGmailMessageToEmailPayload({
                gmailMessage: messageDetails,
                mailAccount,
                syncSource,
            });
        } catch (error) {
            skippedCount += 1;
            logSyncItemFailure({
                mailAccount,
                syncSource,
                messageId,
                stage: 'payload_parse',
                error,
            });

            const isStored = pushCappedSyncError({
                syncErrors,
                messageId,
                stage: 'payload_parse',
                error,
            });

            if (!isStored) {
                omittedSyncErrorsCount += 1;
            }

            continue;
        }

        const now = new Date();

        let updateResult;

        try {
            updateResult = await Email.updateOne(
                {
                    userId: mailAccount.userId,
                    providerMessageId: emailPayload.providerMessageId,
                },
                {
                    $set: {
                        ...emailPayload,
                        updatedAt: now,
                    },
                    $setOnInsert: {
                        createdAt: now,
                    },
                },
                {
                    upsert: true,
                    runValidators: true,
                }
            );
        } catch (error) {
            skippedCount += 1;
            logSyncItemFailure({
                mailAccount,
                syncSource,
                messageId,
                stage: 'db_upsert',
                error,
            });

            const isStored = pushCappedSyncError({
                syncErrors,
                messageId,
                stage: 'db_upsert',
                error,
            });

            if (!isStored) {
                omittedSyncErrorsCount += 1;
            }

            continue;
        }

        if (updateResult.upsertedCount === 1) {
            insertedCount += 1;
            let insertedEmail;

            try {
                insertedEmail = await Email.findOne(
                    {
                        userId: mailAccount.userId,
                        providerMessageId: emailPayload.providerMessageId,
                    },
                    { _id: 1 }
                );
            } catch (error) {
                logSyncItemFailure({
                    mailAccount,
                    syncSource,
                    messageId,
                    stage: 'db_lookup',
                    error,
                });

                const isStored = pushCappedSyncError({
                    syncErrors,
                    messageId,
                    stage: 'db_lookup',
                    error,
                });

                if (!isStored) {
                    omittedSyncErrorsCount += 1;
                }
            }

            if (insertedEmail?._id) {
                insertedEmailIds.push(insertedEmail._id);
            }
        } else {
            updatedCount += 1;
            let updatedEmail;

            try {
                updatedEmail = await Email.findOne(
                    {
                        userId: mailAccount.userId,
                        providerMessageId: emailPayload.providerMessageId,
                    },
                    { _id: 1 }
                );
            } catch (error) {
                logSyncItemFailure({
                    mailAccount,
                    syncSource,
                    messageId,
                    stage: 'db_lookup',
                    error,
                });

                const isStored = pushCappedSyncError({
                    syncErrors,
                    messageId,
                    stage: 'db_lookup',
                    error,
                });

                if (!isStored) {
                    omittedSyncErrorsCount += 1;
                }
            }

            if (updatedEmail?._id) {
                updatedEmailIds.push(updatedEmail._id);
            }
        }
    }

    if (omittedSyncErrorsCount > 0) {
        console.warn('[gmail-sync] syncErrors cap reached', {
            userId: String(mailAccount.userId),
            mailAccountId: String(mailAccount._id),
            syncSource,
            omittedSyncErrorsCount,
            returnedSyncErrorsCount: syncErrors.length,
            maxSyncErrors: SYNC_ERRORS_MAX_ITEMS,
        });
    }

    const syncedAt = new Date();

    await MailAccount.updateOne(
        { _id: mailAccount._id },
        {
            $set: {
                lastSyncedAt: syncedAt,
                status: 'active',
            },
        }
    );

    const scanSummary = await runSyncScanPipeline({
        userId: mailAccount.userId,
        insertedEmailIds,
        updatedEmailIds,
    });

    return {
        mailAccountId: mailAccount._id,
        accountEmail: mailAccount.accountEmail,
        provider: 'gmail',
        syncSource,
        fetchedCount: gmailMessages.length,
        insertedCount,
        updatedCount,
        skippedCount,
        syncErrors,
        scanSummary,
        syncedAt,
    };
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
