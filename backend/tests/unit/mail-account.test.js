import test from 'node:test';
import assert from 'node:assert/strict';

import MailAccount from '../../src/models/mail-account.model.js';
import { normalizeSyncMaxResults } from '../../src/services/mail-account.service.js';

test('MailAccount syncMaxResults schema uses MVP default and range', () => {
    const path = MailAccount.schema.path('syncMaxResults');

    assert.equal(path.defaultValue, 10);
    assert.equal(path.options.min[0], 1);
    assert.equal(path.options.max[0], 50);
});

test('MailAccount schema persists incremental-sync cursor, recovery, and advisory lock fields', () => {
    const syncState = MailAccount.schema.path('syncState');
    const syncLock = MailAccount.schema.path('syncLock');

    assert.equal(MailAccount.schema.path('lastHistoryId').instance, 'String');
    assert.equal(MailAccount.schema.path('lastFullSyncAt').instance, 'Date');
    assert.equal(syncState.instance, 'String');
    assert.deepEqual(syncState.options.enum, [
        'never_synced',
        'backfilling',
        'incremental',
        'resync_required',
    ]);
    assert.equal(syncState.defaultValue, 'never_synced');
    assert.equal(MailAccount.schema.path('backfillPageToken').instance, 'String');
    assert.equal(MailAccount.schema.path('backfillCompletedAt').instance, 'Date');

    assert.equal(syncLock.instance, 'Embedded');
    assert.equal(MailAccount.schema.path('syncLock.lockedAt').instance, 'Date');
    assert.equal(MailAccount.schema.path('syncLock.lockedBy').instance, 'String');

    assert.equal(MailAccount.schema.path('watchExpiration').instance, 'Date');
    assert.equal(MailAccount.schema.path('watchRegisteredAt').instance, 'Date');
    assert.equal(MailAccount.schema.path('watchHistoryId').instance, 'String');
    assert.equal(MailAccount.schema.path('watchStatus').instance, 'String');
    assert.deepEqual(MailAccount.schema.path('watchStatus').options.enum, [
        'active', 'expired', 'failed', 'disabled',
    ]);
    assert.equal(MailAccount.schema.path('watchFailureCount').instance, 'Number');
});

test('normalizeSyncMaxResults accepts integer values in the allowed range', () => {
    assert.equal(normalizeSyncMaxResults(1), 1);
    assert.equal(normalizeSyncMaxResults(10), 10);
    assert.equal(normalizeSyncMaxResults('50'), 50);
});

test('normalizeSyncMaxResults uses default when value is missing', () => {
    assert.equal(normalizeSyncMaxResults(undefined), 10);
    assert.equal(normalizeSyncMaxResults(null), 10);
});

test('normalizeSyncMaxResults rejects invalid values', () => {
    assert.throws(() => normalizeSyncMaxResults(0), /between 1 and 50/);
    assert.throws(() => normalizeSyncMaxResults(51), /between 1 and 50/);
    assert.throws(() => normalizeSyncMaxResults('abc'), /must be an integer/);
});
