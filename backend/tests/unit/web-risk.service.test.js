import assert from 'node:assert/strict';
import test from 'node:test';

import { createWebRiskService } from '../../src/services/threat-intel/web-risk.service.js';
import { normalizeHttpUrl } from '../../src/services/threat-intel/url-normalization.service.js';

test('Web Risk performs one validated lookup and returns only bounded threat data', async () => {
    let request;
    const service = createWebRiskService({
        apiKey: 'test-key',
        fetch: async (url, options) => {
            request = { url: new URL(url), options };
            return {
                ok: true,
                async json() {
                    return {
                        threat: {
                            threatTypes: ['MALWARE', 'UNKNOWN', 'MALWARE'],
                            expireTime: '2026-08-03T12:00:00Z',
                        },
                    };
                },
            };
        },
    });

    const result = await service.lookup('https://Example.test/path?private=value');
    assert.deepEqual(result, {
        status: 'ok',
        matches: ['MALWARE'],
        expiresAt: '2026-08-03T12:00:00.000Z',
    });
    assert.equal(request.options.method, 'GET');
    assert.equal(request.options.redirect, 'error');
    assert.equal(request.url.searchParams.get('uri'), 'https://example.test/path?private=value');
    assert.deepEqual(request.url.searchParams.getAll('threatTypes'), ['MALWARE', 'SOCIAL_ENGINEERING']);
});

test('Web Risk is fail-open for missing configuration, invalid inputs, and invalid responses', async () => {
    let calls = 0;
    const service = createWebRiskService({
        fetch: async () => {
            calls += 1;
            return { ok: true, json: async () => ({}) };
        },
    });

    assert.deepEqual(await service.lookup('file:///etc/passwd'), {
        status: 'unavailable', matches: [], reason: 'invalid_url',
    });
    assert.deepEqual(await service.lookup('https://user:secret@example.test/'), {
        status: 'unavailable', matches: [], reason: 'invalid_url',
    });
    assert.deepEqual(await service.lookup('https://example.test'), {
        status: 'unavailable', matches: [], reason: 'not_configured',
    });
    assert.equal(calls, 0);

    const invalidBody = createWebRiskService({
        apiKey: 'key',
        fetch: async () => ({ ok: true, json: async () => null }),
    });
    assert.deepEqual(await invalidBody.lookup('https://example.test'), {
        status: 'unavailable', matches: [], reason: 'invalid_response',
    });

    const malformedThreat = createWebRiskService({
        apiKey: 'key',
        fetch: async () => ({ ok: true, json: async () => ({ threat: { threatTypes: 'MALWARE' } }) }),
    });
    assert.deepEqual(await malformedThreat.lookup('https://example.test'), {
        status: 'unavailable', matches: [], reason: 'invalid_response',
    });
});

test('Web Risk URL normalization only permits bounded HTTP(S) URLs', () => {
    assert.equal(normalizeHttpUrl('www.example.test'), 'https://www.example.test/');
    assert.equal(normalizeHttpUrl('https://example.test'), 'https://example.test/');
    assert.equal(normalizeHttpUrl('javascript:alert(1)'), null);
    assert.equal(normalizeHttpUrl('x'.repeat(8_193)), null);
});
