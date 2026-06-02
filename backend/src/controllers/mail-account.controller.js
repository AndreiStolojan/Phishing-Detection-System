import {
    connectGoogleMailAccount,
    disconnectMailAccountForUser,
    getGoogleConnectUrl,
    getMailAccountsForUser,
    syncGmailEmailsForUser,
    updateMailAccountSettingsForUser,
} from '../services/mail-account.service.js';
import { FRONTEND_APP_URL } from '../config/env.js';

const buildFrontendRedirectUrl = ({ params }) => {
    const redirectUrl = new URL('/dashboard', FRONTEND_APP_URL);

    for (const [key, value] of Object.entries(params)) {
        if (value !== undefined && value !== null && String(value).length > 0) {
            redirectUrl.searchParams.set(key, String(value));
        }
    }

    return redirectUrl.toString();
};

export const getMailAccounts = async (req, res, next) => {
    try {
        const mailAccounts = await getMailAccountsForUser(req.user._id);

        res.status(200).json({
            success: true,
            data: mailAccounts,
        });
    } catch (error) {
        next(error);
    }
};

export const startGoogleConnect = async (req, res, next) => {
    try {
        const result = await getGoogleConnectUrl(req.user._id);

        res.status(200).json({
            success: true,
            data: result,
        });
    } catch (error) {
        next(error);
    }
};

export const handleGoogleCallback = async (req, res, next) => {
    try {
        const mailAccount = await connectGoogleMailAccount({
            code: req.query.code,
            state: req.query.state,
            googleError: req.query.error,
        });

        return res.redirect(
            302,
            buildFrontendRedirectUrl({
                params: {
                    gmail: 'connected',
                    account: mailAccount.accountEmail,
                },
            })
        );
    } catch (error) {
        if (req.query?.state || req.query?.code || req.query?.error) {
            return res.redirect(
                302,
                buildFrontendRedirectUrl({
                    params: {
                        gmail: 'error',
                        code: error.code || 'GMAIL_CONNECT_FAILED',
                    },
                })
            );
        }

        next(error);
    }
};

export const disconnectMailAccount = async (req, res, next) => {
    try {
        const result = await disconnectMailAccountForUser({
            userId: req.user._id,
            mailAccountId: req.params.id,
        });

        res.status(200).json({
            success: true,
            message: result.message,
        });
    } catch (error) {
        next(error);
    }
};

export const syncMailAccount = async (req, res, next) => {
    try {
        const syncResult = await syncGmailEmailsForUser({
            userId: req.user._id,
            mailAccountId: req.params.id,
        });

        res.status(200).json({
            success: true,
            message: 'Mail account synced successfully',
            data: syncResult,
        });
    } catch (error) {
        next(error);
    }
};

export const updateMailAccountSettings = async (req, res, next) => {
    try {
        const mailAccount = await updateMailAccountSettingsForUser({
            userId: req.user._id,
            mailAccountId: req.params.id,
            syncMaxResults: req.body?.syncMaxResults,
        });

        res.status(200).json({
            success: true,
            message: 'Mail account settings updated successfully',
            data: mailAccount,
        });
    } catch (error) {
        next(error);
    }
};
