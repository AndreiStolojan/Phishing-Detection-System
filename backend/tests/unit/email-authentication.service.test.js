import assert from 'node:assert/strict';
import test from 'node:test';

import { collectEmailAuthSignals } from '../../src/detection/providers/email-auth.provider.js';
import {
    buildUnavailableAuthResults,
    evaluateEmailAuthentication,
} from '../../src/services/email-auth/email-authentication.service.js';
import { fetchRawMessage } from '../../src/services/mail-account.service.js';
import { parseGmailMessageToEmailPayload } from '../../src/services/email-parser.service.js';

test('Gmail full-message parsing preserves Authentication-Results verbatim', () => {
    const authenticationHeader =
        'mx.google.com; spf=pass smtp.mailfrom=example.com; dkim=pass header.d=example.com';
    const payload = parseGmailMessageToEmailPayload({
        gmailMessage: {
            id: 'message-id',
            payload: {
                mimeType: 'text/plain',
                headers: [
                    { name: 'From', value: 'Sender <sender@example.com>' },
                    { name: 'Authentication-Results', value: authenticationHeader },
                ],
                body: { data: Buffer.from('body').toString('base64url') },
            },
        },
        mailAccount: {
            _id: '507f1f77bcf86cd799439011',
            userId: '507f1f77bcf86cd799439012',
        },
        syncSource: 'gmail_initial_sync',
    });

    assert.deepEqual(
        payload.rawHeaders.find(({ name }) => name === 'Authentication-Results'),
        { name: 'Authentication-Results', value: authenticationHeader }
    );
});

test('Gmail raw helper requests format=raw and decodes exact RFC 822 bytes', async () => {
    const expected = Buffer.from('From: sender@example.com\r\n\r\nExact body\r\n');
    let requestInput;
    const result = await fetchRawMessage({
        mailAccount: { _id: 'mail-account' },
        messageId: 'id/with spaces',
        request: async (input) => {
            requestInput = input;
            return { raw: expected.toString('base64url') };
        },
    });

    assert.deepEqual(result, expected);
    assert.match(requestInput.url, /id%2Fwith%20spaces\?format=raw$/);
    assert.equal(requestInput.errorCode, 'GMAIL_RAW_MESSAGE_FAILED');
    assert.equal(requestInput.timeoutMs, 10_000);
});

test('hybrid evaluation combines trusted SPF, local DKIM and local DMARC only', async () => {
    const rawMessage = Buffer.from('private raw MIME that must not be returned');
    const result = await evaluateEmailAuthentication({
        rawHeaders: [{
            name: 'Authentication-Results',
            value: 'mx.google.com; spf=pass smtp.mailfrom=mail.example.com',
        }],
        rawMessage,
        fromDomain: 'example.com',
        verifySignatures: async (received) => {
            assert.equal(received, rawMessage);
            return {
                status: 'ok',
                failureReason: null,
                dkim: {
                    result: 'pass',
                    domain: 'example.com',
                    selector: 'test',
                    aligned: false,
                    source: 'local_verify',
                    signatures: [{
                        result: 'pass',
                        domain: 'example.com',
                        selector: 'test',
                        aligned: false,
                    }],
                },
                arc: { result: 'none', chainLength: 0 },
            };
        },
        resolvePolicy: async () => ({
            available: true,
            found: true,
            appliedPolicy: 'reject',
            adkim: 's',
            aspf: 'r',
            pct: 100,
        }),
        evaluatedAt: () => new Date('2026-07-31T12:00:00.000Z'),
    });

    assert.equal(result.status, 'ok');
    assert.equal(result.spf.source, 'gmail_header');
    assert.equal(result.dkim.source, 'local_verify');
    assert.equal(result.dmarc.result, 'pass');
    assert.equal(result.dmarc.source, 'local_evaluate');
    assert.equal(result.dkim.aligned, true);
    assert.equal(Object.hasOwn(result, 'rawMessage'), false);
    assert.equal(JSON.stringify(result).includes('private raw MIME'), false);
});

test('missing trusted Gmail results fail open with zero detection signals', async () => {
    const result = await evaluateEmailAuthentication({
        rawHeaders: [{
            name: 'Authentication-Results',
            value: 'attacker.example; spf=fail smtp.mailfrom=paypal.com',
        }],
        rawMessage: Buffer.from('message'),
        fromDomain: 'paypal.com',
        verifySignatures: async () => ({
            status: 'ok',
            dkim: {
                result: 'none',
                domain: null,
                selector: null,
                aligned: false,
                source: 'local_verify',
                signatures: [],
            },
            arc: { result: 'none', chainLength: 0 },
        }),
        resolvePolicy: async () => ({ available: true, found: false }),
    });

    assert.equal(result.status, 'unavailable');
    assert.match(result.failureReason, /gmail_authentication_results_unavailable/);
    assert.deepEqual(collectEmailAuthSignals({ authResults: result }), []);
});

test('temporary SPF failure never becomes a DMARC reject signal', async () => {
    const result = await evaluateEmailAuthentication({
        rawHeaders: [{
            name: 'Authentication-Results',
            value: 'mx.google.com; spf=temperror smtp.mailfrom=example.com',
        }],
        rawMessage: Buffer.from('message'),
        fromDomain: 'example.com',
        verifySignatures: async () => ({
            status: 'ok',
            dkim: {
                result: 'none',
                domain: null,
                selector: null,
                aligned: false,
                source: 'local_verify',
                signatures: [],
            },
            arc: { result: 'none', chainLength: 0 },
        }),
        resolvePolicy: async () => ({
            available: true,
            found: true,
            appliedPolicy: 'reject',
            adkim: 'r',
            aspf: 'r',
        }),
    });

    assert.equal(result.status, 'unavailable');
    assert.equal(result.dmarc.result, 'temperror');
    assert.deepEqual(collectEmailAuthSignals({ authResults: result }), []);
});

test('unavailable result has bounded persisted fields and no raw MIME', () => {
    const result = buildUnavailableAuthResults('x'.repeat(500));

    assert.equal(result.status, 'unavailable');
    assert.equal(result.failureReason.length, 180);
    assert.equal(result.dkim.signatures.length, 0);
    assert.equal(Object.hasOwn(result, 'rawMessage'), false);
});
