import assert from 'node:assert/strict';
import test from 'node:test';

import { createGmailWatchService } from '../../src/services/gmail-watch.service.js';

const NOW = new Date('2026-08-03T10:00:00.000Z');
const ACCOUNT = { _id: 'account-1', watchExpiration: null };

const createHarness = ({ enabled = true, response, requestStop } = {}) => {
    const updates = [];
    const watchCalls = [];
    const stopCalls = [];
    const service = createGmailWatchService({
        model: {
            updateOne: async (...args) => {
                updates.push(args);
                return { matchedCount: 1 };
            },
        },
        enabled,
        topicName: 'projects/secureinbox/topics/gmail-events',
        now: () => NOW,
        requestWatch: async (input) => {
            watchCalls.push(input);
            return response ?? {
                historyId: 'watch-history-123',
                expiration: String(NOW.getTime() + 24 * 60 * 60 * 1000),
            };
        },
        requestStop: async (input) => {
            stopCalls.push(input);
            return requestStop ? requestStop(input) : {};
        },
    });
    return { service, updates, watchCalls, stopCalls };
};

test('disabled Gmail Push does not create a Watch', async () => {
    const { service, watchCalls, updates } = createHarness({ enabled: false });

    const result = await service.ensure({ mailAccount: ACCOUNT });

    assert.deepEqual(result, {
        configured: false,
        skipped: true,
        reason: 'push_not_configured',
    });
    assert.equal(watchCalls.length, 0);
    assert.equal(updates.length, 0);
});

test('Watch metadata is persisted separately from the T3 synchronization cursor', async () => {
    const { service, watchCalls, updates } = createHarness();

    const result = await service.ensure({ mailAccount: ACCOUNT });

    assert.equal(watchCalls.length, 1);
    assert.equal(watchCalls[0].topicName, 'projects/secureinbox/topics/gmail-events');
    assert.equal(result.watchHistoryId, 'watch-history-123');
    assert.equal(result.expiration.toISOString(), '2026-08-04T10:00:00.000Z');
    assert.deepEqual(updates[0][0], { _id: 'account-1' });
    assert.deepEqual(updates[0][1], {
        $set: {
            watchExpiration: new Date('2026-08-04T10:00:00.000Z'),
            watchHistoryId: 'watch-history-123',
            watchRegisteredAt: NOW,
            watchStatus: 'active',
            watchFailureCount: 0,
        },
    });
    assert.equal(Object.hasOwn(updates[0][1].$set, 'lastHistoryId'), false);
});

test('Watch response without a valid future expiry is not persisted', async () => {
    const { service, updates } = createHarness({
        response: { historyId: 'watch-history-123', expiration: String(NOW.getTime()) },
    });

    await assert.rejects(
        () => service.ensure({ mailAccount: ACCOUNT }),
        /future expiration/
    );
    assert.equal(updates.length, 0);
});

test('stop clears recorded Watch metadata after Gmail accepts the stop request', async () => {
    const accountWithWatch = {
        ...ACCOUNT,
        watchExpiration: new Date('2026-08-04T10:00:00.000Z'),
    };
    const { service, stopCalls, updates } = createHarness();

    const result = await service.stop({ mailAccount: accountWithWatch });

    assert.deepEqual(result, { skipped: false, stopped: true });
    assert.deepEqual(stopCalls, [{ mailAccount: accountWithWatch }]);
    assert.deepEqual(updates[0], [
        { _id: 'account-1' },
        {
            $set: {
                watchExpiration: null,
                watchHistoryId: null,
                watchRegisteredAt: null,
                watchStatus: 'disabled',
                watchFailureCount: 0,
            },
        },
    ]);
});

test('stop does not call Gmail when no Watch is recorded locally', async () => {
    const { service, stopCalls, updates } = createHarness();

    const result = await service.stop({ mailAccount: ACCOUNT });

    assert.deepEqual(result, { skipped: true, reason: 'watch_not_registered' });
    assert.equal(stopCalls.length, 0);
    assert.equal(updates.length, 0);
});
