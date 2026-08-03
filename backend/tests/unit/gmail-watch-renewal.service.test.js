import assert from 'node:assert/strict';
import test from 'node:test';

import { createGmailWatchRenewalService } from '../../src/services/gmail-watch-renewal.service.js';

test('renewal is a no-op without Gmail Push configuration', async () => {
    const metrics = [];
    const renew = createGmailWatchRenewalService({
        model: { find: async () => assert.fail('must not query') },
        ensureWatch: async () => assert.fail('must not renew'),
        configured: () => false,
        recordMetric: (result) => metrics.push(result),
    });

    assert.deepEqual(await renew(), { renewed: 0, failed: 0, skipped: true });
    assert.deepEqual(metrics, ['skipped']);
});

test('renewal isolates account failures and marks repeated failures for polling fallback', async () => {
    const metrics = [];
    const updates = [];
    const accounts = [
        { _id: 'ok', watchFailureCount: 0 },
        { _id: 'failed', watchFailureCount: 1 },
    ];
    const model = {
        find: async (query) => {
            assert.equal(query.$or[2].watchExpiration.$lte.toISOString(), '2026-08-05T00:00:00.000Z');
            return accounts;
        },
        updateOne: async (...args) => updates.push(args),
    };
    const renew = createGmailWatchRenewalService({
        model,
        ensureWatch: async ({ mailAccount }) => {
            if (mailAccount._id === 'failed') throw new Error('denied');
        },
        configured: () => true,
        recordMetric: (result) => metrics.push(result),
        logger: { error: () => {} },
    });

    assert.deepEqual(await renew({ now: new Date('2026-08-03T00:00:00.000Z') }), {
        renewed: 1,
        failed: 1,
        skipped: false,
    });
    assert.deepEqual(metrics, ['success', 'failure']);
    assert.deepEqual(updates, [[
        { _id: 'failed' },
        { $set: { watchFailureCount: 2, watchStatus: 'failed' } },
    ]]);
});
