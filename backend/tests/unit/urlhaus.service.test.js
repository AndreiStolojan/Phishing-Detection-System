import assert from 'node:assert/strict';
import test from 'node:test';

import { createUrlhausService } from '../../src/services/threat-intel/urlhaus.service.js';
import { normalizeHttpUrl } from '../../src/services/threat-intel/url-normalization.service.js';

const jsonResponse = (body) => new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
});

test('URLhaus sends its Community API form request and returns a bounded match', async () => {
    let request;
    const service = createUrlhausService({
        authKey: 'community-key',
        fetch: async (url, options) => {
            request = { url, options };
            return jsonResponse({
                query_status: 'ok',
                url: 'https://malware.test/private',
            });
        },
    });

    assert.deepEqual(await service.lookup('https://malware.test/private'), {
        status: 'ok', match: true,
    });
    assert.equal(request.url, 'https://urlhaus-api.abuse.ch/v1/url/');
    assert.equal(request.options.method, 'POST');
    assert.equal(request.options.redirect, 'error');
    assert.equal(request.options.headers['Auth-Key'], 'community-key');
    assert.equal(request.options.headers['Content-Type'], 'application/x-www-form-urlencoded');
    assert.equal(request.options.body, 'url=https%3A%2F%2Fmalware.test%2Fprivate');
});

test('URLhaus returns no match, or a fail-open bounded error', async () => {
    const noMatch = createUrlhausService({
        authKey: 'key',
        fetch: async () => jsonResponse({ query_status: 'no_results' }),
    });
    assert.deepEqual(await noMatch.lookup('https://example.test'), {
        status: 'ok', match: false,
    });

    const invalidResponse = createUrlhausService({
        authKey: 'key',
        fetch: async () => jsonResponse({ query_status: 'ok' }),
    });
    assert.deepEqual(await invalidResponse.lookup('https://example.test'), {
        status: 'unavailable', match: false, reason: 'invalid_response',
    });

    const disabled = createUrlhausService();
    assert.deepEqual(await disabled.lookup('https://example.test'), {
        status: 'unavailable', match: false, reason: 'not_configured',
    });
});

test('URLhaus URL normalization rejects non-web and oversized values', () => {
    assert.equal(normalizeHttpUrl('ftp://example.test'), null);
    assert.equal(normalizeHttpUrl('https://example.test'), 'https://example.test/');
    assert.equal(normalizeHttpUrl('x'.repeat(8_193)), null);
});

test('URLhaus never sends URL credentials to its API', async () => {
    let calls = 0;
    const service = createUrlhausService({
        authKey: 'key',
        fetch: async () => { calls += 1; },
    });

    assert.deepEqual(await service.lookup('https://user:secret@example.test/'), {
        status: 'unavailable', match: false, reason: 'invalid_url',
    });
    assert.equal(calls, 0);
});
