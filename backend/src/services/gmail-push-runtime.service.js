import MailAccount from '../models/mail-account.model.js';
import {
    recordGmailPushLatency,
    recordGmailPushNotification,
} from '../monitoring/metrics.js';
import { syncActiveGmailAccount } from './auto-sync.service.js';
import { createGmailPushQueue } from './gmail-push-queue.service.js';

const queue = createGmailPushQueue({
    sync: async ({ mailAccountId, notificationReceivedAt }) => {
        const mailAccount = await MailAccount.findOne({
            _id: mailAccountId,
            provider: 'gmail',
            status: 'active',
        }).lean();
        if (!mailAccount) return;

        const { syncResult } = await syncActiveGmailAccount({ mailAccount });
        await MailAccount.updateOne(
            { _id: mailAccount._id },
            { $set: { lastPushNotificationAt: new Date(notificationReceivedAt) } }
        );
        if (!syncResult.skipped) {
            recordGmailPushLatency((Date.now() - notificationReceivedAt) / 1000);
        }
    },
    onError: ({ mailAccountId, error }) => {
        console.error('[gmail-push] Queued sync failed', {
            mailAccountId,
            error: error.message,
        });
    },
});

export const findActiveGmailAccountsByEmail = (accountEmail) =>
    MailAccount.find({
        provider: 'gmail',
        status: 'active',
        accountEmail,
    }).select('_id').lean();

export const enqueueGmailPushNotification = (notification) => queue.enqueue(notification);

export const recordGmailPushResult = (result) => recordGmailPushNotification(result);

export const stopGmailPushQueue = () => queue.stopAccepting();

export const drainGmailPushQueue = () => queue.drain();
