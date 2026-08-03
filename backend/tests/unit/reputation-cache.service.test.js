import test from 'node:test';
import assert from 'node:assert/strict';

import UrlReputation from '../../src/models/url-reputation.model.js';
import {
    createReputationCacheService,
    hashReputationSubject,
} from '../../src/services/threat-intel/reputation-cache.service.js';

const NOW = new Date('2026-08-03T12:00:00.000Z');

test('reputation cache hashes URL subjects and never persists the raw URL', async () => {
    const calls = [];
    const model = {
        findOneAndUpdate(filter, update, options) {
            calls.push({ filter, update, options });
            return update.$set;
        },
    };
    const cache = createReputationCacheService({ model, now: () => NOW });
    const rawUrl = 'https://example.test/login?email=person@example.test';

    await cache.set({
        source: 'web_risk',
        subjectType: 'url',
        subject: rawUrl,
        value: { status: 'malicious', threatTypes: ['SOCIAL_ENGINEERING'] },
        ttlMs: 6 * 60 * 60 * 1000,
    });

    const serialized = JSON.stringify(calls);
    assert.equal(serialized.includes(rawUrl), false);
    assert.equal(calls[0].filter.keyHash, hashReputationSubject(rawUrl));
    assert.equal(calls[0].update.$set.status, 'malicious');
    assert.deepEqual(calls[0].update.$set.threatTypes, ['SOCIAL_ENGINEERING']);
});

test('reputation cache reads only entries whose explicit TTL is still valid', async () => {
    const calls = [];
    const model = {
        findOne(filter) {
            calls.push(filter);
            return { lean: async () => ({ status: 'clean' }) };
        },
    };
    const cache = createReputationCacheService({ model, now: () => NOW });

    assert.deepEqual(
        await cache.get({ source: 'urlhaus', subject: 'https://example.test/' }),
        { status: 'clean' }
    );
    assert.deepEqual(calls[0].expiresAt, { $gt: NOW });
});

test('URL reputation schema has a compound identity and absolute TTL index', () => {
    const indexes = UrlReputation.schema.indexes();
    assert.ok(indexes.some(([keys, options]) =>
        keys.source === 1 && keys.keyHash === 1 && options.unique === true
    ));
    assert.ok(indexes.some(([keys, options]) =>
        keys.expiresAt === 1 && options.expireAfterSeconds === 0
    ));
    assert.equal(UrlReputation.schema.path('keyHash').options.unique, undefined);
});
