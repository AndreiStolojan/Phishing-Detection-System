import crypto from 'crypto';
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
import { JWT_SECRET, MAIL_TOKEN_ENCRYPTION_KEY } from '../config/env.js';
import { parseGmailMessageToEmailPayload } from './email-parser.service.js';
import { runSyncScanPipeline } from './scan.service.js';

const SYNC_MAX_RESULTS_DEFAULT = 10;
const SYNC_MAX_RESULTS_MIN = 1;
const SYNC_MAX_RESULTS_MAX = 50;
const SYNC_ERRORS_MAX_ITEMS = 5;
const SYNC_ERROR_MESSAGE_MAX_LENGTH = 180;
const MAIL_TOKEN_ENCRYPTION_ALGORITHM = 'aes-256-gcm';

const getMailTokenEncryptionKey = () => {
    if (!MAIL_TOKEN_ENCRYPTION_KEY) {
        throw createError(
            'Missing mail token encryption key',
            500,
        );
    }

    return crypto.createHash('sha256').update(MAIL_TOKEN_ENCRYPTION_KEY).digest();
};

const encryptMailToken = (token) => {
    if (typeof token !== 'string' || token.length === 0) {
        return token ?? null;
    }

    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv(
        MAIL_TOKEN_ENCRYPTION_ALGORITHM,
        getMailTokenEncryptionKey(),
        iv
    );

    const encryptedValue = Buffer.concat([cipher.update(token, 'utf8'), cipher.final()]);
    const authTag = cipher.getAuthTag();

    return JSON.stringify({
        v: 1,
        iv: iv.toString('base64'),
        tag: authTag.toString('base64'),
        data: encryptedValue.toString('base64'),
    });
};

const decryptMailToken = (storedToken) => {
    if (typeof storedToken !== 'string' || storedToken.length === 0) {
        return null;
    }

    try {
        const parsedToken = JSON.parse(storedToken);

        if (
            parsedToken?.v !== 1 ||
            typeof parsedToken.iv !== 'string' ||
            typeof parsedToken.tag !== 'string' ||
            typeof parsedToken.data !== 'string'
        ) {
            return storedToken;
        }

        const decipher = crypto.createDecipheriv(
            MAIL_TOKEN_ENCRYPTION_ALGORITHM,
            getMailTokenEncryptionKey(),
            Buffer.from(parsedToken.iv, 'base64')
        );

        decipher.setAuthTag(Buffer.from(parsedToken.tag, 'base64'));

        const decryptedValue = Buffer.concat([
            decipher.update(Buffer.from(parsedToken.data, 'base64')),
            decipher.final(),
        ]);

        return decryptedValue.toString('utf8');
    } catch {
        return storedToken;
    }
};

const encryptMailTokenForStorage = (token) => {
    if (token === null || token === undefined) {
        return null;
    }

    return encryptMailToken(token);
};

const getDecryptedMailToken = (storedToken) => decryptMailToken(storedToken);

const toPublicMailAccount = (mailAccount) => ({
    _id: mailAccount._id,
    userId: mailAccount.userId,
    provider: mailAccount.provider,
    accountEmail: mailAccount.accountEmail,
    status: mailAccount.status,
    syncMaxResults: mailAccount.syncMaxResults ?? SYNC_MAX_RESULTS_DEFAULT,
    tokenExpiryDate: mailAccount.tokenExpiryDate,
    lastSyncedAt: mailAccount.lastSyncedAt,
    createdAt: mailAccount.createdAt,
    updatedAt: mailAccount.updatedAt,
});

export const normalizeSyncMaxResults = (value) => {
    if (value === undefined || value === null) {
        return SYNC_MAX_RESULTS_DEFAULT;
    }

    const normalizedValue =
        typeof value === 'string' && value.trim() !== '' ? Number(value) : value;

    if (!Number.isInteger(normalizedValue)) {
        throw createError(
            'syncMaxResults must be an integer',
            400,
            [`Allowed range is ${SYNC_MAX_RESULTS_MIN}..${SYNC_MAX_RESULTS_MAX}.`],
            'INVALID_SYNC_MAX_RESULTS'
        );
    }

    if (normalizedValue < SYNC_MAX_RESULTS_MIN || normalizedValue > SYNC_MAX_RESULTS_MAX) {
        throw createError(
            `syncMaxResults must be between ${SYNC_MAX_RESULTS_MIN} and ${SYNC_MAX_RESULTS_MAX}`,
            400,
            [`Allowed range is ${SYNC_MAX_RESULTS_MIN}..${SYNC_MAX_RESULTS_MAX}.`],
            'INVALID_SYNC_MAX_RESULTS'
        );
    }

    return normalizedValue;
};

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
        );
    }
};

const refreshGoogleAccessToken = async (mailAccount) => {
    const refreshToken = getDecryptedMailToken(mailAccount.refreshToken);

    if (!refreshToken) {
        throw createError(
            'Google access token expired and refresh token is missing',
            401,
            ['Reconnect your Gmail account to continue sync.'],
        );
    }

    try {
        const response = await fetch(GOOGLE_OAUTH_TOKEN_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: refreshTokenPayload({ refreshToken }).toString(),
        });

        const payload = await parseJsonSafely(response);

        if (!response.ok || !payload.access_token) {
            throw createError(
                payload.error_description || payload.error || 'Failed to refresh Google access token',
                401,
                ['Reconnect your Gmail account and retry the sync.'],
            );
        }

        const tokenExpiryDate = payload.expires_in
            ? new Date(Date.now() + payload.expires_in * 1000)
            : null;

        await MailAccount.updateOne(
            { _id: mailAccount._id },
            {
                $set: {
                    accessToken: encryptMailTokenForStorage(payload.access_token),
                    refreshToken:
                        payload.refresh_token !== undefined
                            ? encryptMailTokenForStorage(payload.refresh_token)
                            : mailAccount.refreshToken,
                    tokenExpiryDate,
                    status: 'active',
                },
            }
        );

        mailAccount.accessToken = encryptMailTokenForStorage(payload.access_token);
        mailAccount.refreshToken =
            payload.refresh_token !== undefined
                ? encryptMailTokenForStorage(payload.refresh_token)
                : mailAccount.refreshToken;
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
    method = 'GET',
    body,
    fallbackMessage,
    errorCode,
    unreachableCode,
}) => {
    let accessToken = getDecryptedMailToken(mailAccount.accessToken);

    for (let attempt = 0; attempt < 2; attempt += 1) {
        let response;

        try {
            response = await fetch(url, {
                method,
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                    ...(body ? { 'Content-Type': 'application/json' } : {}),
                },
                ...(body ? { body: JSON.stringify(body) } : {}),
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
    const syncMaxResults = normalizeSyncMaxResults(mailAccount.syncMaxResults);
    const query = new URLSearchParams({
        maxResults: String(syncMaxResults),
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

export const updateMailAccountSettingsForUser = async ({
    userId,
    mailAccountId,
    syncMaxResults,
}) => {
    if (syncMaxResults === undefined) {
        throw createError(
            'syncMaxResults is required',
            400,
            [`Allowed range is ${SYNC_MAX_RESULTS_MIN}..${SYNC_MAX_RESULTS_MAX}.`],
            'SYNC_MAX_RESULTS_REQUIRED'
        );
    }

    const normalizedSyncMaxResults = normalizeSyncMaxResults(syncMaxResults);

    const mailAccount = await MailAccount.findOneAndUpdate(
        {
            _id: mailAccountId,
            userId,
        },
        {
            $set: {
                syncMaxResults: normalizedSyncMaxResults,
            },
        },
        {
            new: true,
            runValidators: true,
        }
    );

    if (!mailAccount) {
        throw createError('Mail account not found', 404, [], 'MAIL_ACCOUNT_NOT_FOUND');
    }

    return toPublicMailAccount(mailAccount);
};

export const moveGmailMessageToSpam = async ({ userId, email }) => {
    if (email.provider !== 'gmail') {
        return {
            type: 'gmail_move_to_spam',
            status: 'skipped',
            errorCode: 'MAIL_PROVIDER_NOT_SUPPORTED',
            message: 'Provider action skipped because this email is not from Gmail.',
        };
    }

    if (!email.providerMessageId) {
        return {
            type: 'gmail_move_to_spam',
            status: 'failed',
            errorCode: 'GMAIL_PROVIDER_MESSAGE_ID_MISSING',
            message: 'Cannot move email to Gmail spam because providerMessageId is missing.',
        };
    }

    const mailAccount = await MailAccount.findOne({
        _id: email.mailAccountId,
        userId,
    });

    if (!mailAccount) {
        return {
            type: 'gmail_move_to_spam',
            status: 'failed',
            errorCode: 'MAIL_ACCOUNT_NOT_FOUND',
            message: 'Cannot move email to Gmail spam because the owning mail account is missing.',
        };
    }

    if (mailAccount.provider !== 'gmail') {
        return {
            type: 'gmail_move_to_spam',
            status: 'skipped',
            errorCode: 'MAIL_PROVIDER_NOT_SUPPORTED',
            message: 'Provider action skipped because the owning mail account is not Gmail.',
        };
    }

    if (!mailAccount.accessToken) {
        return {
            type: 'gmail_move_to_spam',
            status: 'failed',
            errorCode: 'GOOGLE_ACCESS_TOKEN_MISSING',
            message: 'Cannot move email to Gmail spam because the Gmail access token is missing.',
        };
    }

    const url = `${GMAIL_MESSAGE_DETAILS_BASE_URL}/${encodeURIComponent(
        email.providerMessageId
    )}/modify`;

    await requestGoogleJson({
        mailAccount,
        url,
        method: 'POST',
        body: {
            addLabelIds: ['SPAM'],
            removeLabelIds: ['INBOX'],
        },
        fallbackMessage: 'Failed to move Gmail message to spam',
        errorCode: 'GMAIL_MOVE_TO_SPAM_FAILED',
        unreachableCode: 'GMAIL_MOVE_TO_SPAM_UNREACHABLE',
    });

    return {
        type: 'gmail_move_to_spam',
        status: 'success',
    };
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
            accessToken: encryptMailTokenForStorage(tokenPayload.access_token),
            refreshToken:
                tokenPayload.refresh_token !== undefined
                    ? encryptMailTokenForStorage(tokenPayload.refresh_token)
                    : existingMailAccount?.refreshToken ?? null,
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
