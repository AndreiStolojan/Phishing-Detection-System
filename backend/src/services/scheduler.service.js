import cron from 'node-cron';
import mongoose from 'mongoose';
import { SYNC_INTERVAL_MINUTES } from '../config/env.js';
import { runAutoSyncForAllUsers } from './auto-sync.service.js';
import { getDailySummaryForUser } from './report.service.js';
import { sendDailyDigestEmail } from '../../extras/notifications/send-email.js';
import User from '../models/user.model.js';
import Email from '../models/email.model.js';
import Scan from '../models/scan.model.js';

const parseSyncInterval = () => {
    const parsed = Number.parseInt(SYNC_INTERVAL_MINUTES, 10);

    if (!Number.isInteger(parsed) || parsed < 1 || parsed > 60) {
        return 15;
    }

    return parsed;
};

const buildSyncCronExpression = (intervalMinutes) => {
    if (intervalMinutes === 1) {
        return '* * * * *';
    }

    return `*/${intervalMinutes} * * * *`;
};

const hasActivityInLast24h = async (userId) => {
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const userObjectId = new mongoose.Types.ObjectId(String(userId));

    const [newEmails, riskyScans] = await Promise.all([
        Email.countDocuments({ userId: userObjectId, createdAt: { $gte: since } }),
        Scan.countDocuments({
            userId: userObjectId,
            verdict: { $in: ['suspicious', 'likely_phishing'] },
            scannedAt: { $gte: since },
        }),
    ]);

    return newEmails > 0 || riskyScans > 0;
};

const DEFAULT_DIGEST_HOUR = 8;

const runDailyDigestForHour = async (currentHour) => {
    console.log(`[daily-digest] Starting digest run for hour ${currentHour} UTC`);

    const users = await User.find({
        $or: [
            { 'settings.digestEnabled': true, 'settings.digestHour': currentHour },
            { 'settings.digestEnabled': { $exists: false }, 'settings.digestHour': { $exists: false } },
            { 'settings.digestEnabled': { $exists: false }, 'settings.digestHour': currentHour },
            { 'settings.digestEnabled': true, 'settings.digestHour': { $exists: false } },
        ],
    }).select('email name settings').lean();

    // Filter: digestEnabled must not be explicitly false, and digestHour must match
    const eligible = users.filter((u) => {
        const digestEnabled = u.settings?.digestEnabled;
        const digestHour = u.settings?.digestHour ?? DEFAULT_DIGEST_HOUR;
        if (digestEnabled === false) return false;
        return digestHour === currentHour;
    });

    if (eligible.length === 0) {
        console.log(`[daily-digest] No users scheduled for hour ${currentHour}, skipping`);
        return;
    }

    let sentCount = 0;
    let skippedCount = 0;
    let errorCount = 0;

    for (const user of eligible) {
        try {
            const hasActivity = await hasActivityInLast24h(user._id);

            if (!hasActivity) {
                skippedCount += 1;
                continue;
            }

            const summary = await getDailySummaryForUser({ userId: user._id });

            const result = await sendDailyDigestEmail({
                recipient: user.email,
                userName: user.name,
                summary,
            });

            if (result.sent) {
                sentCount += 1;
            } else {
                skippedCount += 1;
            }
        } catch (error) {
            errorCount += 1;
            console.error('[daily-digest] Failed for user', {
                userId: String(user._id),
                error: error.message,
            });
        }
    }

    console.log('[daily-digest] Run complete', {
        hour: currentHour,
        eligible: eligible.length,
        sent: sentCount,
        skipped: skippedCount,
        errors: errorCount,
    });
};

export const startSchedulers = () => {
    const syncIntervalMinutes = parseSyncInterval();
    const syncCron = buildSyncCronExpression(syncIntervalMinutes);

    cron.schedule(syncCron, async () => {
        console.log(`[auto-sync] Cron triggered (every ${syncIntervalMinutes} min)`);

        try {
            await runAutoSyncForAllUsers();
        } catch (error) {
            console.error('[auto-sync] Unhandled error in cron job', error.message);
        }
    });

    cron.schedule('0 * * * *', async () => {
        const currentHour = new Date().getUTCHours();
        console.log(`[daily-digest] Cron triggered (hour ${currentHour} UTC)`);

        try {
            await runDailyDigestForHour(currentHour);
        } catch (error) {
            console.error('[daily-digest] Unhandled error in cron job', error.message);
        }
    });

    console.log(`[scheduler] Auto-sync scheduled: every ${syncIntervalMinutes} minute(s)`);
    console.log('[scheduler] Daily digest scheduled: hourly, per-user digest hour (UTC)');
};
