import MailAccount from '../models/mail-account.model.js';
import User from '../models/user.model.js';
import Scan from '../models/scan.model.js';
import Email from '../models/email.model.js';
import { syncGmailEmailsForUser } from './mail-account.service.js';
import { sendPhishingAlertEmail } from '../../extras/notifications/send-email.js';

const findPhishingEmailsFromIds = async ({ userId, emailIds }) => {
    if (!emailIds || emailIds.length === 0) {
        return [];
    }

    const phishingScans = await Scan.find({
        userId,
        emailId: { $in: emailIds },
        verdict: 'likely_phishing',
    })
        .select('emailId score triggeredRules')
        .lean();

    if (phishingScans.length === 0) {
        return [];
    }

    const phishingEmailIds = phishingScans.map((scan) => scan.emailId);

    const scanByEmailId = new Map(
        phishingScans.map((scan) => [String(scan.emailId), scan])
    );

    const emails = await Email.find({ _id: { $in: phishingEmailIds }, userId })
        .select('subject from providerMessageId')
        .lean();

    return emails.map((email) => {
        const scan = scanByEmailId.get(String(email._id));
        return {
            ...email,
            score: scan?.score ?? null,
            triggeredRules: scan?.triggeredRules ?? [],
        };
    });
};

const sendAlertIfEnabled = async ({ user, phishingEmails }) => {
    if (!user.settings?.alertsEnabled || phishingEmails.length === 0) {
        return;
    }

    try {
        await sendPhishingAlertEmail({
            recipient: user.email,
            userName: user.name,
            emails: phishingEmails,
        });
    } catch (error) {
        console.error('[auto-sync] Failed to send phishing alert', {
            userId: String(user._id),
            error: error.message,
        });
    }
};

export const runAutoSyncForAllUsers = async () => {
    const activeMailAccounts = await MailAccount.find({
        provider: 'gmail',
        status: 'active',
    }).lean();

    if (activeMailAccounts.length === 0) {
        console.log('[auto-sync] No active Gmail accounts found, skipping run');
        return;
    }

    console.log(`[auto-sync] Starting sync for ${activeMailAccounts.length} Gmail account(s)`);

    let totalNewEmails = 0;
    let totalPhishingAlerts = 0;
    let totalErrors = 0;

    for (const mailAccount of activeMailAccounts) {
        try {
            const syncResult = await syncGmailEmailsForUser({
                userId: mailAccount.userId,
                mailAccountId: mailAccount._id,
            });

            const newEmails = syncResult.insertedCount || 0;
            totalNewEmails += newEmails;

            if (newEmails > 0 && syncResult.insertedEmailIds?.length > 0) {
                const user = await User.findById(mailAccount.userId).select('email name settings').lean();

                if (user?.settings?.alertsEnabled) {
                    const phishingEmails = await findPhishingEmailsFromIds({
                        userId: mailAccount.userId,
                        emailIds: syncResult.insertedEmailIds,
                    });

                    if (phishingEmails.length > 0) {
                        totalPhishingAlerts += phishingEmails.length;
                        await sendAlertIfEnabled({ user, phishingEmails });
                    }
                }
            }

            console.log('[auto-sync] Account synced', {
                userId: String(mailAccount.userId),
                accountEmail: mailAccount.accountEmail,
                insertedCount: syncResult.insertedCount,
                updatedCount: syncResult.updatedCount,
                scannedCount: syncResult.scanSummary?.scannedCount ?? 0,
            });
        } catch (error) {
            totalErrors += 1;
            console.error('[auto-sync] Sync failed for account', {
                userId: String(mailAccount.userId),
                mailAccountId: String(mailAccount._id),
                accountEmail: mailAccount.accountEmail,
                error: error.message,
            });
        }
    }

    console.log('[auto-sync] Run complete', {
        accounts: activeMailAccounts.length,
        newEmails: totalNewEmails,
        phishingAlerts: totalPhishingAlerts,
        errors: totalErrors,
    });
};

export const sendPhishingAlertForNewEmails = async ({ userId, user, syncResult }) => {
    if (!syncResult?.insertedEmailIds?.length) return;
    const phishingEmails = await findPhishingEmailsFromIds({
        userId,
        emailIds: syncResult.insertedEmailIds,
    });
    if (phishingEmails.length > 0) {
        await sendAlertIfEnabled({ user, phishingEmails });
    }
};
