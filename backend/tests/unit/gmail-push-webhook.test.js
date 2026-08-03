import assert from 'node:assert/strict';
import { once } from 'node:events';
import test from 'node:test';

import express from 'express';

import { createGmailPushWebhookHandler } from '../../src/controllers/gmail-push.controller.js';
import { createGmailPushOidcMiddleware } from '../../src/middlewares/gmail-push-oidc.middleware.js';
import { createGmailPushRouter } from '../../src/routes/gmail-push.routes.js';
import {
    GmailPushPayloadError,
    parseGmailPushPayload,
} from '../../src/services/gmail-push-payload.service.js';

const AUDIENCE = 'https://secureinbox.test/api/v1/webhooks/gmail';
const SERVICE_ACCOUNT_EMAIL = 'gmail-push@secureinbox.test.iam.gserviceaccount.com';
const VALID_TOKEN = 'header.payload.signature';

const encodeData = (value) => Buffer.from(JSON.stringify(value)).toString('base64');

const validEnvelope = ({
    emailAddress = 'User@Example.com',
    historyId = '12345678901234567890',
    messageId = 'pubsub-message-1',
} = {}) => ({
    message: {
        data: encodeData({ emailAddress, historyId }),
        messageId,
    },
    subscription: 'projects/example/subscriptions/gmail-push',
});

const createResponse = () => ({
    statusCode: null,
    body: null,
    status(value) {
        this.statusCode = value;
        return this;
    },
    json(value) {
        this.body = value;
        return this;
    },
});

const validAuthClient = ({ payload = {} } = {}) => ({
    calls: [],
    async verifyIdToken(options) {
        this.calls.push(options);
        return {
            getPayload: () => ({
                sub: 'service-account-subject',
                email: SERVICE_ACCOUNT_EMAIL,
                email_verified: true,
                ...payload,
            }),
        };
    },
});

const startTestServer = async ({ findAccount, enqueue, authClient = validAuthClient() }) => {
    const app = express();
    app.set('trust proxy', false);
    app.use('/api/v1/webhooks/gmail', createGmailPushRouter({
        audience: AUDIENCE,
        serviceAccountEmail: SERVICE_ACCOUNT_EMAIL,
        authClient,
        findActiveMailAccountsByEmail: findAccount,
        enqueueNotification: enqueue,
        rateLimiterOptions: { validate: false },
    }));
    app.use(express.json({ limit: '1mb' }));
    app.use((error, req, res, next) => {
        void req;
        void next;
        res.status(error.statusCode || error.status || 500).json({
            code: error.type || error.code || 'TEST_ERROR',
        });
    });

    const server = app.listen(0, '127.0.0.1');
    await once(server, 'listening');
    const address = server.address();

    return {
        url: `http://127.0.0.1:${address.port}/api/v1/webhooks/gmail`,
        close: async () => {
            server.close();
            await once(server, 'close');
        },
    };
};

test('strict Pub/Sub parser returns only normalized bounded scalar fields', () => {
    assert.deepEqual(parseGmailPushPayload(validEnvelope()), {
        emailAddress: 'user@example.com',
        historyId: '12345678901234567890',
        messageId: 'pubsub-message-1',
    });
});

test('strict Pub/Sub parser accepts Gmail history ids encoded as JSON numbers', () => {
    assert.equal(parseGmailPushPayload(validEnvelope({ historyId: 123456 })).historyId, '123456');
});

test('strict Pub/Sub parser rejects malformed and hostile payloads', () => {
    const invalidUtf8 = Buffer.from([0xc3, 0x28]).toString('base64');
    const cases = [
        null,
        [],
        {},
        { message: null },
        { message: { data: 123, messageId: 'one' } },
        { message: { data: 'not base64!', messageId: 'one' } },
        { message: { data: 'e30', messageId: 'one' } },
        { message: { data: invalidUtf8, messageId: 'one' } },
        { message: { data: Buffer.from('{').toString('base64'), messageId: 'one' } },
        { message: { data: encodeData([]), messageId: 'one' } },
        { message: { data: encodeData({ emailAddress: 'a@example.com', historyId: '1' }) } },
        validEnvelope({ emailAddress: 'not-an-email' }),
        validEnvelope({ emailAddress: `${'a'.repeat(255)}@example.com` }),
        validEnvelope({ historyId: '' }),
        validEnvelope({ historyId: 'not-a-number' }),
        validEnvelope({ historyId: '1'.repeat(21) }),
        validEnvelope({ messageId: '' }),
        validEnvelope({ messageId: 'm'.repeat(257) }),
    ];

    for (const payload of cases) {
        assert.throws(
            () => parseGmailPushPayload(payload),
            (error) => error instanceof GmailPushPayloadError
        );
    }
});

test('OIDC middleware verifies the exact audience and fixed service account identity', async () => {
    const authClient = validAuthClient();
    const middleware = createGmailPushOidcMiddleware({
        audience: AUDIENCE,
        serviceAccountEmail: SERVICE_ACCOUNT_EMAIL,
        authClient,
    });
    const req = {
        headers: { authorization: `Bearer ${VALID_TOKEN}` },
    };
    const res = createResponse();
    let nextCalled = false;

    await middleware(req, res, () => {
        nextCalled = true;
    });

    assert.equal(nextCalled, true);
    assert.deepEqual(authClient.calls, [{ idToken: VALID_TOKEN, audience: AUDIENCE }]);
    assert.deepEqual(req.gmailPushIdentity, { subject: 'service-account-subject' });
});

test('OIDC middleware rejects malformed credentials and untrusted claims uniformly', async () => {
    const cases = [
        { authorization: undefined },
        { authorization: '' },
        { authorization: 'Basic abc' },
        { authorization: 'Bearer' },
        { authorization: 'Bearer one.two.three extra' },
        { authorization: 'Bearer one.two' },
        { payload: { email: 'attacker@example.com' } },
        { payload: { email_verified: false } },
        { payload: { email_verified: 'true' } },
        { verifyError: new Error('expired or wrong audience') },
    ];

    for (const testCase of cases) {
        const authClient = testCase.verifyError
            ? { verifyIdToken: async () => { throw testCase.verifyError; } }
            : validAuthClient({ payload: testCase.payload });
        const middleware = createGmailPushOidcMiddleware({
            audience: AUDIENCE,
            serviceAccountEmail: SERVICE_ACCOUNT_EMAIL,
            authClient,
        });
        const res = createResponse();
        let nextCalled = false;

        await middleware(
            {
                headers: {
                    authorization: Object.hasOwn(testCase, 'authorization')
                        ? testCase.authorization
                        : `Bearer ${VALID_TOKEN}`,
                },
            },
            res,
            () => { nextCalled = true; }
        );

        assert.equal(nextCalled, false);
        assert.equal(res.statusCode, 401);
        assert.equal(res.body.code, 'GMAIL_PUSH_UNAUTHORIZED');
    }
});

test('OIDC middleware rejects duplicate Authorization headers', async () => {
    const middleware = createGmailPushOidcMiddleware({
        audience: AUDIENCE,
        serviceAccountEmail: SERVICE_ACCOUNT_EMAIL,
        authClient: validAuthClient(),
    });
    const res = createResponse();
    let nextCalled = false;

    await middleware({
        rawHeaders: [
            'Authorization', `Bearer ${VALID_TOKEN}`,
            'Authorization', `Bearer ${VALID_TOKEN}`,
        ],
        headers: { authorization: `Bearer ${VALID_TOKEN}` },
    }, res, () => { nextCalled = true; });

    assert.equal(nextCalled, false);
    assert.equal(res.statusCode, 401);
});

test('controller acknowledges unknown accounts and enqueues only known active accounts', async () => {
    const queued = [];
    const now = new Date('2026-08-03T12:00:00.000Z');
    const knownHandler = createGmailPushWebhookHandler({
        findActiveMailAccountsByEmail: async (email) => {
            assert.equal(email, 'user@example.com');
            return [{ _id: 42 }];
        },
        enqueueNotification: async (notification) => queued.push(notification),
        now: () => now,
    });
    const knownResponse = createResponse();

    await knownHandler({ body: validEnvelope() }, knownResponse, assert.fail);
    assert.equal(knownResponse.statusCode, 200);
    assert.deepEqual(queued, [{
        mailAccountId: '42',
        messageId: 'pubsub-message-1:42',
        historyId: '12345678901234567890',
        notificationReceivedAt: now,
    }]);

    const unknownHandler = createGmailPushWebhookHandler({
        findActiveMailAccountsByEmail: async () => [],
        enqueueNotification: async () => assert.fail('unknown account must not enqueue'),
    });
    const unknownResponse = createResponse();
    await unknownHandler({ body: validEnvelope() }, unknownResponse, assert.fail);
    assert.equal(unknownResponse.statusCode, 200);
});

test('controller acknowledges duplicates but requests redelivery when the queue cannot accept work', async () => {
    const createHandler = (enqueueResult) => createGmailPushWebhookHandler({
        findActiveMailAccountsByEmail: async () => [{ _id: 'account-1' }],
        enqueueNotification: async () => enqueueResult,
    });
    const duplicateResponse = createResponse();
    await createHandler({ accepted: false, reason: 'duplicate' })(
        { body: validEnvelope() },
        duplicateResponse,
        assert.fail
    );
    assert.equal(duplicateResponse.statusCode, 200);

    for (const reason of ['capacity', 'stopped']) {
        const unavailableResponse = createResponse();
        await createHandler({ accepted: false, reason })(
            { body: validEnvelope() },
            unavailableResponse,
            assert.fail
        );
        assert.equal(unavailableResponse.statusCode, 503);
        assert.equal(unavailableResponse.body.code, 'GMAIL_PUSH_QUEUE_UNAVAILABLE');
    }
});

test('controller enqueues every active connection for the notified mailbox', async () => {
    const accountIds = [];
    const handler = createGmailPushWebhookHandler({
        findActiveMailAccountsByEmail: async () => [{ _id: 'one' }, { _id: 'two' }],
        enqueueNotification: async ({ mailAccountId }) => {
            accountIds.push(mailAccountId);
            return { accepted: true };
        },
    });
    const response = createResponse();

    await handler({ body: validEnvelope() }, response, assert.fail);

    assert.equal(response.statusCode, 200);
    assert.deepEqual(accountIds, ['one', 'two']);
});

test('route verifies OIDC before parsing and enforces content and body limits', async (t) => {
    const testServer = await startTestServer({
        findAccount: async () => [{ _id: 'account-1' }],
        enqueue: async () => {},
    });
    t.after(testServer.close);

    const invalidAuthResponse = await fetch(testServer.url, {
        method: 'POST',
        headers: {
            authorization: 'Bearer invalid',
            'content-type': 'application/json',
        },
        body: '{',
    });
    assert.equal(invalidAuthResponse.status, 401);

    const wrongContentType = await fetch(testServer.url, {
        method: 'POST',
        headers: { authorization: `Bearer ${VALID_TOKEN}` },
        body: JSON.stringify(validEnvelope()),
    });
    assert.equal(wrongContentType.status, 415);

    const malformedJson = await fetch(testServer.url, {
        method: 'POST',
        headers: {
            authorization: `Bearer ${VALID_TOKEN}`,
            'content-type': 'application/json',
        },
        body: '{',
    });
    assert.equal(malformedJson.status, 400);

    const oversized = await fetch(testServer.url, {
        method: 'POST',
        headers: {
            authorization: `Bearer ${VALID_TOKEN}`,
            'content-type': 'application/json',
        },
        body: JSON.stringify({ padding: 'x'.repeat(65 * 1024) }),
    });
    assert.equal(oversized.status, 413);
});

test('webhook acknowledges a 50-notification burst without waiting for sync work', async (t) => {
    let queuedCount = 0;
    const testServer = await startTestServer({
        findAccount: async () => [{ _id: 'account-1' }],
        enqueue: async () => { queuedCount += 1; },
    });
    t.after(testServer.close);
    const startedAt = performance.now();

    const responses = await Promise.all(Array.from({ length: 50 }, (_, index) =>
        fetch(testServer.url, {
            method: 'POST',
            headers: {
                authorization: `Bearer ${VALID_TOKEN}`,
                'content-type': 'application/json',
            },
            body: JSON.stringify(validEnvelope({ messageId: `message-${index}` })),
        })
    ));

    assert.ok(responses.every((response) => response.status === 200));
    assert.equal(queuedCount, 50);
    assert.ok(performance.now() - startedAt < 500);
});
