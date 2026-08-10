import test from 'node:test';
import assert from 'node:assert/strict';

import {
    GMAIL_SYNC_LOCK_STALE_MS,
    GmailSyncLockLostError,
    createGmailSyncLockService,
} from '../../src/services/gmail-sync-lock.service.js';

const CURRENT_TIME = new Date('2026-07-31T12:00:00.000Z');

test('acquire atomically claims an unlocked or stale account for two minutes', async () => {
    const calls = [];
    const mailAccount = { _id: 'account-1', userId: 'user-1' };
    const model = {
        async findOneAndUpdate(filter, update, options) {
            calls.push({ filter, update, options });
            return mailAccount;
        },
        async exists() {
            throw new Error('exists must not run after successful acquisition');
        },
    };
    const service = createGmailSyncLockService({
        model,
        now: () => CURRENT_TIME,
        ownerIdFactory: () => 'worker-1',
    });

    const result = await service.acquire({
        userId: 'user-1',
        mailAccountId: 'account-1',
    });

    assert.equal(result.acquired, true);
    assert.equal(result.skipped, false);
    assert.equal(result.lockedBy, 'worker-1');
    assert.equal(result.mailAccount, mailAccount);
    assert.deepEqual(calls, [
        {
            filter: {
                _id: 'account-1',
                userId: 'user-1',
                $or: [
                    { 'syncLock.lockedAt': null },
                    {
                        'syncLock.lockedAt': {
                            $lte: new Date(CURRENT_TIME.getTime() - GMAIL_SYNC_LOCK_STALE_MS),
                        },
                    },
                ],
            },
            update: {
                $set: {
                    syncLock: {
                        lockedAt: CURRENT_TIME,
                        lockedBy: 'worker-1',
                    },
                },
            },
            options: { returnDocument: 'after' },
        },
    ]);
});

test('a concurrent acquire returns a skipped result when the account still exists', async () => {
    const model = {
        async findOneAndUpdate() {
            return null;
        },
        async exists(filter) {
            assert.deepEqual(filter, { _id: 'account-1', userId: 'user-1' });
            return { _id: 'account-1' };
        },
    };
    const service = createGmailSyncLockService({
        model,
        now: () => CURRENT_TIME,
        ownerIdFactory: () => 'worker-2',
    });

    assert.deepEqual(
        await service.acquire({ userId: 'user-1', mailAccountId: 'account-1' }),
        {
            acquired: false,
            skipped: true,
            reason: 'sync_in_progress',
            mailAccountId: 'account-1',
        }
    );
});

test('acquire distinguishes a missing account from an account with an active lock', async () => {
    const model = {
        async findOneAndUpdate() {
            return null;
        },
        async exists() {
            return null;
        },
    };
    const service = createGmailSyncLockService({
        model,
        now: () => CURRENT_TIME,
        ownerIdFactory: () => 'worker-1',
    });

    await assert.rejects(
        service.acquire({ userId: 'user-1', mailAccountId: 'missing' }),
        (error) => error.statusCode === 404 && error.code === 'MAIL_ACCOUNT_NOT_FOUND'
    );
});

test('renew updates the lease only while the caller still owns it', async () => {
    const calls = [];
    const model = {
        async updateOne(filter, update) {
            calls.push({ filter, update });
            return { matchedCount: 1, modifiedCount: 1 };
        },
    };
    const service = createGmailSyncLockService({ model, now: () => CURRENT_TIME });

    assert.deepEqual(
        await service.renew({ mailAccountId: 'account-1', lockedBy: 'worker-1' }),
        { renewed: true, lockedAt: CURRENT_TIME }
    );
    assert.deepEqual(calls, [
        {
            filter: {
                _id: 'account-1',
                'syncLock.lockedBy': 'worker-1',
            },
            update: {
                $set: {
                    'syncLock.lockedAt': CURRENT_TIME,
                },
            },
        },
    ]);
});

test('renew exposes a clear lock-lost error after stale takeover', async () => {
    const model = {
        async updateOne() {
            return { matchedCount: 0, modifiedCount: 0 };
        },
    };
    const service = createGmailSyncLockService({ model, now: () => CURRENT_TIME });

    await assert.rejects(
        service.renew({ mailAccountId: 'account-1', lockedBy: 'old-worker' }),
        (error) =>
            error instanceof GmailSyncLockLostError &&
            error.code === 'GMAIL_SYNC_LOCK_LOST' &&
            error.statusCode === 409
    );
});

test('release is owner-fenced and cannot clear a successor lock', async () => {
    const calls = [];
    const matchedCounts = [1, 0];
    const model = {
        async updateOne(filter, update) {
            calls.push({ filter, update });
            return { matchedCount: matchedCounts.shift() };
        },
    };
    const service = createGmailSyncLockService({ model });

    assert.deepEqual(
        await service.release({ mailAccountId: 'account-1', lockedBy: 'worker-1' }),
        { released: true }
    );
    assert.deepEqual(
        await service.release({ mailAccountId: 'account-1', lockedBy: 'old-worker' }),
        { released: false }
    );
    assert.deepEqual(calls[1], {
        filter: {
            _id: 'account-1',
            'syncLock.lockedBy': 'old-worker',
        },
        update: {
            $unset: {
                syncLock: 1,
            },
        },
    });
});
