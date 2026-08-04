import assert from 'node:assert/strict';
import test from 'node:test';

import AttachmentHash from '../../src/models/attachment-hash.model.js';
import {
    createHashReputationService,
    hashAttachmentBuffer,
    MALICIOUS_TTL_MS,
    UNKNOWN_TTL_MS,
} from '../../src/services/attachment/hash-reputation.service.js';

const jsonResponse = (body) => new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
});

const createMemoryCache = () => {
    const values = new Map();
    const writes = [];
    return {
        values,
        writes,
        async get(hash) { return values.get(hash) || null; },
        async set(hash, verdict, ttlMs) {
            values.set(hash, { verdict });
            writes.push({ hash, verdict, ttlMs });
        },
    };
};

test('MalwareBazaar sends only a SHA-256 hash and caches a malicious hit', async () => {
    const cache = createMemoryCache();
    const sha256 = hashAttachmentBuffer(Buffer.from('harmless synthetic bytes'));
    let request;
    const service = createHashReputationService({
        authKey: 'free-community-key',
        cache,
        fetch: async (url, options) => {
            request = { url, options };
            return jsonResponse({ query_status: 'ok', data: [{ sha256_hash: sha256 }] });
        },
    });

    assert.deepEqual(await service.lookupHash(sha256), {
        status: 'ok', malicious: true, cached: false,
    });
    assert.equal(request.options.headers['Auth-Key'], 'free-community-key');
    assert.equal(request.options.body, `query=get_info&hash=${sha256}`);
    assert.doesNotMatch(request.options.body, /filename|bytes|harmless|data=/i);
    assert.deepEqual(cache.writes, [{
        hash: sha256,
        verdict: 'malicious',
        ttlMs: MALICIOUS_TTL_MS,
    }]);
});

test('MalwareBazaar caches misses and makes no request without an Auth-Key', async () => {
    const cache = createMemoryCache();
    const sha256 = 'a'.repeat(64);
    let calls = 0;
    const service = createHashReputationService({
        authKey: 'key',
        cache,
        fetch: async () => {
            calls += 1;
            return jsonResponse({ query_status: 'hash_not_found' });
        },
    });

    assert.deepEqual(await service.lookupHash(sha256), {
        status: 'ok', malicious: false, cached: false,
    });
    assert.deepEqual(await service.lookupHash(sha256), {
        status: 'ok', malicious: false, cached: true,
    });
    assert.equal(calls, 1);
    assert.equal(cache.writes[0].ttlMs, UNKNOWN_TTL_MS);

    const disabled = createHashReputationService({
        cache: createMemoryCache(),
        fetch: async () => { calls += 1; },
    });
    assert.deepEqual(await disabled.lookupHash(sha256), {
        status: 'unavailable', malicious: false, reason: 'not_configured',
    });
    assert.equal(calls, 1);
});

test('attachment hash cache schema has a unique hash and absolute TTL index', () => {
    const indexes = AttachmentHash.schema.indexes();
    assert.equal(AttachmentHash.collection.collectionName, 'attachmenthashes');
    assert.ok(indexes.some(([fields, options]) => fields.sha256 === 1 && options.unique));
    assert.ok(indexes.some(([fields, options]) =>
        fields.expiresAt === 1 && options.expireAfterSeconds === 0
    ));
});
