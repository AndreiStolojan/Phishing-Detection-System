import assert from 'node:assert/strict';
import test from 'node:test';

import arcjetMiddleware from '../../extras/security/arcjet.middleware.js';
import { getMissingEmailConfig } from '../../extras/notifications/nodemailer.js';
import { assertGoogleOAuthConfig } from '../../src/config/google-oauth.js';

test('Arcjet is a no-op when ARCJET_KEY is not configured', async () => {
    let nextCalled = false;
    await arcjetMiddleware({}, {}, () => {
        nextCalled = true;
    });
    assert.equal(nextCalled, true);
});

test('Gmail reports a controlled integration error when OAuth is not configured', () => {
    assert.throws(
        () => assertGoogleOAuthConfig(),
        (error) =>
            error.statusCode === 503 &&
            error.code === 'INTEGRATION_NOT_CONFIGURED' &&
            /not configured/i.test(error.message)
    );
});

test('email configuration can be absent without throwing during startup', () => {
    assert.deepEqual(getMissingEmailConfig().sort(), ['EMAIL_FROM', 'EMAIL_PASSWORD']);
});
