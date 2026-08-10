import test from 'node:test';
import assert from 'node:assert/strict';

import MailAccount from '../../src/models/mail-account.model.js';
import { syncGmailEmailsForUser } from '../../src/services/mail-account.service.js';

const jsonResponse = (body, status = 200) => new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
});

test('production sync adapter anchors, advances history, recovers a history gap, then resyncs', async () => {
    const original = {
        findOneAndUpdate: MailAccount.findOneAndUpdate,
        findOne: MailAccount.findOne,
        updateOne: MailAccount.updateOne,
        exists: MailAccount.exists,
        fetch: globalThis.fetch,
    };
    const account = {
        _id: 'account-1',
        userId: 'user-1',
        provider: 'gmail',
        accessToken: 'access-token',
        refreshToken: null,
        status: 'active',
        syncMaxResults: 10,
        syncState: 'never_synced',
        lastHistoryId: null,
        backfillPageToken: null,
        syncLock: null,
    };
    const requestedUrls = [];
    const responses = [
        { body: { historyId: 'history-1' } },
        { body: { messages: [] } },
        { body: { historyId: 'history-2', history: [] } },
        { status: 404, body: { error: { message: 'History id expired' } } },
        { body: { historyId: 'history-3' } },
        { body: { messages: [] } },
    ];

    MailAccount.findOneAndUpdate = async (filter, update) => {
        if (filter.$or) {
            if (account._id !== filter._id || account.userId !== filter.userId || account.syncLock) {
                return null;
            }
            account.syncLock = update.$set.syncLock;
            return account;
        }

        if (filter._id !== account._id || filter['syncLock.lockedBy'] !== account.syncLock?.lockedBy) {
            return null;
        }
        if (Object.hasOwn(filter, 'lastHistoryId') && filter.lastHistoryId !== account.lastHistoryId) {
            return null;
        }
        Object.assign(account, update.$set);
        return account;
    };
    MailAccount.findOne = async () => account;
    MailAccount.exists = async (filter) => {
        if (filter?.syncState?.$exists === false) return null;
        return { _id: account._id };
    };
    MailAccount.updateOne = async (filter, update) => {
        if (filter._id !== account._id || filter['syncLock.lockedBy'] !== account.syncLock?.lockedBy) {
            return { matchedCount: 0 };
        }
        if (update.$unset?.syncLock) {
            account.syncLock = null;
        } else if (update.$set?.['syncLock.lockedAt']) {
            account.syncLock.lockedAt = update.$set['syncLock.lockedAt'];
        }
        return { matchedCount: 1, modifiedCount: 1 };
    };
    globalThis.fetch = async (url) => {
        requestedUrls.push(String(url));
        const response = responses.shift();
        assert.ok(response, `unexpected Gmail request: ${url}`);
        return jsonResponse(response.body, response.status || 200);
    };

    try {
        const initial = await syncGmailEmailsForUser({ userId: 'user-1', mailAccountId: 'account-1' });
        assert.equal(initial.mode, 'backfill');
        assert.equal(initial.completed, true);
        assert.equal(account.syncState, 'incremental');
        assert.equal(account.lastHistoryId, 'history-1');

        const idle = await syncGmailEmailsForUser({ userId: 'user-1', mailAccountId: 'account-1' });
        assert.equal(idle.mode, 'incremental');
        assert.equal(idle.completed, true);
        assert.equal(account.lastHistoryId, 'history-2');

        const gap = await syncGmailEmailsForUser({ userId: 'user-1', mailAccountId: 'account-1' });
        assert.equal(gap.reason, 'history_gap');
        assert.equal(account.syncState, 'resync_required');
        assert.equal(account.lastHistoryId, 'history-2');

        const resync = await syncGmailEmailsForUser({ userId: 'user-1', mailAccountId: 'account-1' });
        assert.equal(resync.mode, 'resync');
        assert.equal(resync.completed, true);
        assert.equal(account.syncState, 'incremental');
        assert.equal(account.lastHistoryId, 'history-3');

        const urls = requestedUrls.map((url) => new URL(url));
        assert.equal(urls[0].pathname, '/gmail/v1/users/me/profile');
        assert.equal(urls[1].pathname, '/gmail/v1/users/me/messages');
        assert.equal(urls[1].searchParams.get('maxResults'), '10');
        assert.deepEqual(urls[1].searchParams.getAll('labelIds'), ['INBOX']);
        assert.equal(urls[2].pathname, '/gmail/v1/users/me/history');
        assert.equal(urls[2].searchParams.get('startHistoryId'), 'history-1');
        assert.equal(urls[2].searchParams.has('labelId'), false);
        assert.deepEqual(urls[2].searchParams.getAll('historyTypes'), [
            'messageAdded',
            'messageDeleted',
            'labelAdded',
            'labelRemoved',
        ]);
        assert.equal(urls[3].searchParams.get('startHistoryId'), 'history-2');
        assert.equal(urls[4].pathname, '/gmail/v1/users/me/profile');
        assert.equal(urls[5].pathname, '/gmail/v1/users/me/messages');
    } finally {
        MailAccount.findOneAndUpdate = original.findOneAndUpdate;
        MailAccount.findOne = original.findOne;
        MailAccount.updateOne = original.updateOne;
        MailAccount.exists = original.exists;
        globalThis.fetch = original.fetch;
    }
});
