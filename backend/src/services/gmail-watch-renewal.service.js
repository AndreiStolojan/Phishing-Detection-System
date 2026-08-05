import MailAccount from '../models/mail-account.model.js';
import { isGmailPushConfigured } from '../config/env.js';
import { recordGmailWatchRenewal } from '../monitoring/metrics.js';
import { ensureGmailWatchForAccount } from './mail-account.service.js';

const RENEWAL_WINDOW_MS = 48 * 60 * 60 * 1000;

export const createGmailWatchRenewalService = ({
    model,
    ensureWatch,
    configured,
    recordMetric,
    logger = console,
}) => async ({ now = new Date() } = {}) => {
    if (!configured()) {
        recordMetric('skipped');
        return { renewed: 0, failed: 0, skipped: true };
    }

    const accounts = await model.find({
        provider: 'gmail',
        status: 'active',
        $or: [
            { watchStatus: { $ne: 'active' } },
            { watchExpiration: null },
            { watchExpiration: { $lte: new Date(now.getTime() + RENEWAL_WINDOW_MS) } },
        ],
    });
    let renewed = 0;
    let failed = 0;

    for (const mailAccount of accounts) {
        try {
            await ensureWatch({ mailAccount });
            renewed += 1;
            recordMetric('success');
        } catch (error) {
            failed += 1;
            const failureCount = (mailAccount.watchFailureCount || 0) + 1;
            await model.updateOne(
                { _id: mailAccount._id },
                {
                    $set: {
                        watchFailureCount: failureCount,
                        ...(failureCount >= 2 && { watchStatus: 'failed' }),
                    },
                }
            );
            recordMetric('failure');
            logger.error('[gmail-watch] Renewal failed', {
                mailAccountId: String(mailAccount._id),
                error: error.message,
            });
        }
    }

    return { renewed, failed, skipped: false };
};

export const renewExpiringGmailWatches = createGmailWatchRenewalService({
    model: MailAccount,
    ensureWatch: ensureGmailWatchForAccount,
    configured: isGmailPushConfigured,
    recordMetric: recordGmailWatchRenewal,
});
