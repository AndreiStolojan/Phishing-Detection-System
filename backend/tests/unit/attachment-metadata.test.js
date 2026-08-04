import assert from 'node:assert/strict';
import test from 'node:test';

import Email from '../../src/models/email.model.js';
import { parseGmailMessageToEmailPayload } from '../../src/services/email-parser.service.js';

test('captures bounded Gmail attachment metadata without persisting inline bytes', () => {
    const payload = parseGmailMessageToEmailPayload({
        gmailMessage: {
            id: 'message-id',
            payload: {
                headers: [{ name: 'From', value: 'sender@example.com' }],
                parts: [{
                    filename: 'invoice.pdf',
                    mimeType: 'application/pdf',
                    body: {
                        attachmentId: 'gmail-attachment-id',
                        size: 1234,
                        data: Buffer.from('must-not-be-persisted').toString('base64url'),
                    },
                }],
            },
        },
        mailAccount: {
            _id: '507f1f77bcf86cd799439011',
            userId: '507f1f77bcf86cd799439012',
        },
        syncSource: 'gmail_initial_sync',
    });

    assert.deepEqual(payload.attachments, [{
        attachmentId: 'gmail-attachment-id',
        filename: 'invoice.pdf',
        declaredMimeType: 'application/pdf',
        size: 1234,
    }]);
    assert.deepEqual(payload.attachmentExtensions, ['pdf']);
    assert.doesNotMatch(JSON.stringify(payload.attachments), /must-not-be-persisted|data/);
});

test('Email attachment metadata schema cannot retain undeclared byte fields', () => {
    const email = new Email({
        userId: '507f1f77bcf86cd799439012',
        mailAccountId: '507f1f77bcf86cd799439011',
        providerMessageId: 'message-id',
        attachments: [{
            attachmentId: 'attachment-id',
            filename: 'invoice.pdf',
            declaredMimeType: 'application/pdf',
            size: 42,
            data: Buffer.from('not allowed'),
            bytes: Buffer.from('not allowed'),
        }],
    });

    const stored = email.toObject().attachments[0];
    assert.deepEqual(Object.keys(stored).sort(), [
        'attachmentId',
        'declaredMimeType',
        'filename',
        'size',
    ]);
});
