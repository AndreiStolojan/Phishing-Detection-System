import cron from 'node-cron';
import mongoose from 'mongoose';
import { SYNC_INTERVAL_MINUTES } from '../config/env.js';
import { runAutoSyncForAllUsers } from './auto-sync.service.js';
import { getMonthlySummaryForUser } from './report.service.js';
import { sendMonthlyDigestEmail } from '../../extras/notifications/send-email.js';
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
        }),
    ]);

    return newEmails > 0 || riskyScans > 0;
};

const runDailyDigestForAllUsers = async () => {
    console.log('[daily-digest] Starting daily digest run');

    const users = await User.find().select('email name').lean();

    if (users.length === 0) {
        console.log('[daily-digest] No users found, skipping');
        return;
    }

    let sentCount = 0;
    let skippedCount = 0;
    let errorCount = 0;

    for (const user of users) {
        try {
            const hasActivity = await hasActivityInLast24h(user._id);

            if (!hasActivity) {
                skippedCount += 1;
                continue;
            }

            const now = new Date();
            const year = now.getUTCFullYear();
            const month = String(now.getUTCMonth() + 1).padStart(2, '0');

            const summary = await getMonthlySummaryForUser({
                userId: user._id,
                query: { month: `${year}-${month}` },
            });

            const result = await sendMonthlyDigestEmail({
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
        users: users.length,
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

    cron.schedule('0 8 * * *', async () => {
        console.log('[daily-digest] Cron triggered (08:00 UTC)');

        try {
            await runDailyDigestForAllUsers();
        } catch (error) {
            console.error('[daily-digest] Unhandled error in cron job', error.message);
        }
    });

    console.log(`[scheduler] Auto-sync scheduled: every ${syncIntervalMinutes} minute(s)`);
    console.log('[scheduler] Daily digest scheduled: 08:00 UTC daily');
};
