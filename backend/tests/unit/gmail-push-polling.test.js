import assert from 'node:assert/strict';
import test from 'node:test';

import { shouldPollAccount } from '../../src/services/auto-sync.service.js';

test('polling remains active for accounts without a live push watch', () => {
    const now = Date.parse('2026-08-03T12:00:00.000Z');
    assert.equal(shouldPollAccount({ watchStatus: 'failed', lastSyncedAt: new Date(now) }, now), true);
    assert.equal(shouldPollAccount({
        watchStatus: 'active',
        watchExpiration: new Date(now - 1),
        lastSyncedAt: new Date(now),
    }, now), true);
});

test('a live push watch uses hourly reconciliation while polling remains a fallback', () => {
    const now = Date.parse('2026-08-03T12:00:00.000Z');
    const account = {
        watchStatus: 'active',
        watchExpiration: new Date(now + 24 * 60 * 60_000),
        lastSyncedAt: new Date(now - 59 * 60_000),
    };
    const options = { pushConfigured: true, intervalMinutes: '60' };

    assert.equal(shouldPollAccount(account, now, options), false);
    assert.equal(shouldPollAccount({
        ...account,
        lastSyncedAt: new Date(now - 60 * 60_000),
    }, now, options), true);
});
