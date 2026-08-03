import assert from 'node:assert/strict';
import test from 'node:test';

import { markEmailPhishingForUser } from '../../src/services/action.service.js';
import Email from '../../src/models/email.model.js';
import MailAccount from '../../src/models/mail-account.model.js';

test('markEmailPhishingForUser marks a successfully spammed Gmail message as removed from inbox', async () => {
    const originalFindEmail = Email.findOne;
    const originalFindAccount = MailAccount.findOne;
    const originalFetch = globalThis.fetch;
    const savedInboxStates = [];
    const email = {
        _id: '507f1f77bcf86cd799439011',
        mailAccountId: 'account-1',
        provider: 'gmail',
        providerMessageId: 'gmail-message-1',
        inboxState: 'present',
        async save() {
            savedInboxStates.push(this.inboxState);
        },
    };

    try {
        Email.findOne = async (filter) => {
            assert.deepEqual(filter, { _id: email._id, userId: 'user-1' });
            return email;
        };
        MailAccount.findOne = async (filter) => {
            assert.deepEqual(filter, { _id: 'account-1', userId: 'user-1' });
            return { _id: 'account-1', provider: 'gmail', accessToken: 'plain-test-token' };
        };
        globalThis.fetch = async (url, options) => {
            assert.match(String(url), /gmail-message-1\/modify$/);
            assert.equal(options.method, 'POST');
            assert.deepEqual(JSON.parse(options.body), {
                addLabelIds: ['SPAM'],
                removeLabelIds: ['INBOX'],
            });
            return { ok: true, status: 200, json: async () => ({}) };
        };

        const result = await markEmailPhishingForUser({ userId: 'user-1', emailId: email._id });

        assert.equal(result.providerAction.status, 'success');
        assert.equal(email.inboxState, 'removed');
        assert.deepEqual(savedInboxStates, ['present', 'removed']);
    } finally {
        Email.findOne = originalFindEmail;
        MailAccount.findOne = originalFindAccount;
        globalThis.fetch = originalFetch;
    }
});
