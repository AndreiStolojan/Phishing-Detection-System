// One-off maintenance script: moves a Gmail account stuck in `backfilling`
// straight to `incremental`, anchored at the account's current Gmail
// historyId. Historical messages between the last processed backfill page
// and now are intentionally left unimported — this is for accounts where
// importing/scanning the full mail history is not wanted, only new mail
// going forward.
//
// Usage: node scripts/skip-gmail-backfill.js [mailAccountId]
// With no argument, targets every account currently in `backfilling` state.

import crypto from 'crypto';

import connectToDatabase from '../src/database/mongodb.js';
import MailAccount from '../src/models/mail-account.model.js';
import { acquireGmailSyncLock, releaseGmailSyncLock } from '../src/services/gmail-sync-lock.service.js';
import { requestGmailSyncResource, updateGmailSyncAccount } from '../src/services/mail-account.service.js';

const args = process.argv.slice(2);
const force = args.includes('--force');
const targetId = args.find((arg) => !arg.startsWith('--'));

// --force steals the sync lock instead of waiting for a free window. Safe by
// design: a still-running holder's own writes are gated on `syncLock.lockedBy`
// matching its own id (see updateGmailSyncAccount), so once we overwrite the
// lock its next write simply no-ops as a recoverable "lock lost" error — the
// next scheduled run continues from whatever state we leave behind.
const stealLock = async ({ userId, mailAccountId }) => {
    const lockedAt = new Date();
    const lockedBy = crypto.randomUUID();
    const mailAccount = await MailAccount.findOneAndUpdate(
        { _id: mailAccountId, userId },
        { $set: { syncLock: { lockedAt, lockedBy } } },
        { returnDocument: 'after' }
    );
    return { acquired: Boolean(mailAccount), skipped: !mailAccount, lockedAt, lockedBy, mailAccount };
};

const run = async () => {
    await connectToDatabase();

    const query = targetId ? { _id: targetId } : { syncState: 'backfilling' };
    const accounts = await MailAccount.find(query)
        .select('_id userId accountEmail syncState')
        .lean();

    if (accounts.length === 0) {
        console.log('No matching accounts found.');
        process.exit(0);
    }

    for (const account of accounts) {
        console.log(`Skipping backfill for ${account.accountEmail} (${account._id})...`);
        const lock = force
            ? await stealLock({ userId: account.userId, mailAccountId: account._id })
            : await acquireGmailSyncLock({ userId: account.userId, mailAccountId: account._id });

        if (lock.skipped) {
            console.log('  sync currently in progress, skipped — retry later');
            continue;
        }

        try {
            const profile = await requestGmailSyncResource({
                type: 'profile',
                mailAccount: lock.mailAccount,
            });
            const now = new Date();
            const updated = await updateGmailSyncAccount({
                mailAccount: lock.mailAccount,
                lockOwner: lock.lockedBy,
                patch: {
                    syncState: 'incremental',
                    lastHistoryId: String(profile.historyId),
                    backfillPageToken: null,
                    backfillCompletedAt: now,
                    lastFullSyncAt: now,
                    lastSyncedAt: now,
                },
            });
            console.log(`  done — anchored at historyId ${profile.historyId}, updated=${Boolean(updated)}`);
        } catch (error) {
            console.error(`  failed: ${error.message}`);
        } finally {
            await releaseGmailSyncLock({ mailAccountId: account._id, lockedBy: lock.lockedBy });
        }
    }

    process.exit(0);
};

run().catch((error) => {
    console.error(error);
    process.exit(1);
});
