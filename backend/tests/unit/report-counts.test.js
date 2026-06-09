import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';

import Email from '../../src/models/email.model.js';
import Scan from '../../src/models/scan.model.js';
import { getMonthlySummaryForUser } from '../../src/services/report.service.js';

/*
 * Integration test for the synced-vs-scanned data-integrity fix.
 *
 * It requires a reachable MongoDB (the one in the `test` npm script's DB_URI).
 * When no database is available (e.g. CI without Mongo) every test self-skips
 * instead of failing, so the pure unit suite still runs everywhere.
 *
 * The core invariant under test: scanned ≤ synced. The scenario deliberately
 * recreates the original bug — an email synced in a PREVIOUS month but
 * re-scanned inside the report month must NOT be counted as "scanned this
 * month", because it was never "synced this month".
 */

const DB_URI =
    process.env.DB_URI || 'mongodb://127.0.0.1:27017/secureinbox-test';

let dbAvailable = false;
const userId = new mongoose.Types.ObjectId();
const mailAccountId = new mongoose.Types.ObjectId();

const makeEmail = ({ suffix, createdAt }) => ({
    userId,
    mailAccountId,
    provider: 'gmail',
    providerMessageId: `report-counts-${suffix}`,
    subject: `Email ${suffix}`,
    from: `sender-${suffix}@example.com`,
    receivedAt: createdAt,
    createdAt,
    updatedAt: createdAt,
});

const makeScan = ({ emailId, verdict, scannedAt }) => ({
    emailId,
    userId,
    score: verdict === 'likely_phishing' ? 70 : verdict === 'suspicious' ? 40 : 5,
    ruleScore: 5,
    aiScore: 0,
    verdict,
    scannedAt,
});

before(async () => {
    try {
        await mongoose.connect(DB_URI, { serverSelectionTimeoutMS: 2000 });
        dbAvailable = true;
    } catch {
        dbAvailable = false;
    }
});

after(async () => {
    if (dbAvailable) {
        await Email.deleteMany({ userId });
        await Scan.deleteMany({ userId });
        await mongoose.disconnect();
    }
});

test('report counts keep scanned ≤ synced and ignore re-scans of older emails', async (t) => {
    if (!dbAvailable) {
        t.skip('MongoDB not available — skipping report-counts integration test');
        return;
    }

    await Email.deleteMany({ userId });
    await Scan.deleteMany({ userId });

    // Window under test: June 2026 (UTC).
    const inWindowA = new Date(Date.UTC(2026, 5, 10));
    const inWindowB = new Date(Date.UTC(2026, 5, 11));
    const inWindowD = new Date(Date.UTC(2026, 5, 12));
    const beforeWindow = new Date(Date.UTC(2026, 4, 20)); // May 2026
    const rescannedInWindow = new Date(Date.UTC(2026, 5, 15));

    // Email D (synced in-window, never scanned) is created but intentionally
    // left without a scan, so only A/B/C ids are bound here.
    const [a, b, c] = await Email.create([
        makeEmail({ suffix: 'a', createdAt: inWindowA }),
        makeEmail({ suffix: 'b', createdAt: inWindowB }),
        makeEmail({ suffix: 'c-old', createdAt: beforeWindow }),
        makeEmail({ suffix: 'd-unscanned', createdAt: inWindowD }),
    ]);

    await Scan.create([
        // A and B: synced AND scanned inside the window.
        makeScan({ emailId: a._id, verdict: 'safe', scannedAt: inWindowA }),
        makeScan({ emailId: b._id, verdict: 'likely_phishing', scannedAt: inWindowB }),
        // C: synced LAST month, but re-scanned this month. The old code counted
        // this in `scannedEmails` (by scannedAt) while it was absent from
        // `syncedEmails` (by createdAt) — producing scanned > synced.
        makeScan({ emailId: c._id, verdict: 'suspicious', scannedAt: rescannedInWindow }),
        // D: synced this month but never scanned → counts as synced, not scanned.
    ]);

    const summary = await getMonthlySummaryForUser({
        userId,
        query: { month: '2026-06' },
    });
    const { syncedEmails, scannedEmails, safe, suspicious, likelyPhishing } =
        summary.counts;

    // Base set = emails synced in June (A, B, D) ⇒ 3. C (May) is excluded.
    assert.equal(syncedEmails, 3, 'only emails synced in the window are counted');
    // Scanned = subset of the synced set that has a scan (A, B) ⇒ 2.
    assert.equal(scannedEmails, 2, 're-scanned older email must not inflate scanned');
    // The invariant the bug violated:
    assert.ok(scannedEmails <= syncedEmails, 'scanned must never exceed synced');

    // Verdict split is over the scanned subset only (A safe, B likely_phishing).
    assert.equal(safe, 1);
    assert.equal(likelyPhishing, 1);
    // C was suspicious but is outside the window ⇒ not counted.
    assert.equal(suspicious, 0);
    assert.ok(
        safe + suspicious + likelyPhishing <= scannedEmails,
        'verdict counts cannot exceed scanned'
    );
});
