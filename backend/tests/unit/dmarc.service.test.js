import test from 'node:test';
import assert from 'node:assert/strict';

import DmarcPolicy from '../../src/models/dmarc-policy.model.js';
import {
    clampCacheTtlMs,
    createDmarcService,
    evaluateDmarcAuthentication,
    isDomainAligned,
    parseDmarcRecord,
} from '../../src/services/email-auth/dmarc.service.js';

const HOUR_MS = 60 * 60 * 1000;

const createMemoryModel = () => {
    const documents = new Map();
    const queries = [];

    return {
        documents,
        queries,
        async findOne(query) {
            queries.push(query);
            const document = documents.get(query.domain);
            return document && document.expiresAt > query.expiresAt.$gt ? { ...document } : null;
        },
        async findOneAndUpdate(filter, update) {
            documents.set(filter.domain, { ...update });
            return { ...update };
        },
    };
};

test('parseDmarcRecord validates required tags and normalizes policy controls', () => {
    assert.deepEqual(
        parseDmarcRecord('v=DMARC1; p=reject; sp=quarantine; adkim=s; aspf=r; pct=25'),
        {
            record: 'v=DMARC1; p=reject; sp=quarantine; adkim=s; aspf=r; pct=25',
            policy: 'reject',
            subdomainPolicy: 'quarantine',
            adkim: 's',
            aspf: 'r',
            pct: 25,
        }
    );
    assert.equal(parseDmarcRecord('p=reject; v=DMARC1'), null);
    assert.equal(parseDmarcRecord('v=DMARC1; p=invalid'), null);
    assert.equal(parseDmarcRecord('v=DMARC1; p=reject; pct=101'), null);
    assert.equal(parseDmarcRecord('v=DMARC1; p=none; p=reject'), null);
});

test('alignment supports strict identity and relaxed organizational domains', () => {
    assert.equal(isDomainAligned('mail.example.com', 'example.com', 's'), false);
    assert.equal(isDomainAligned('Example.COM.', 'example.com', 's'), true);
    assert.equal(isDomainAligned('bounce.shop.example.co.uk', 'news.example.co.uk', 'r'), true);
    assert.equal(isDomainAligned('example.co.uk.evil.test', 'example.co.uk', 'r'), false);
});

test('organizational fallback applies sp and caches positive and negative answers', async () => {
    const model = createMemoryModel();
    const dnsQuestions = [];
    const currentTime = new Date('2026-07-31T10:00:00.000Z');
    const resolveTxt = async (question) => {
        dnsQuestions.push(question);
        if (question === '_dmarc.mail.example.com') return [];
        if (question === '_dmarc.example.com') {
            return [['v=DMARC1; p=reject; ', 'sp=quarantine; adkim=s; aspf=r; pct=50']];
        }
        throw new Error(`Unexpected DNS question: ${question}`);
    };
    const service = createDmarcService({
        model,
        resolveTxt,
        now: () => currentTime,
        cacheTtlMs: 30,
        organizationalDomain: () => 'example.com',
    });

    const first = await service.resolvePolicy('mail.example.com');
    assert.equal(first.status, 'found');
    assert.equal(first.source, 'organizational');
    assert.equal(first.recordDomain, 'example.com');
    assert.equal(first.appliedPolicy, 'quarantine');
    assert.equal(first.pct, 50);
    assert.deepEqual(dnsQuestions, ['_dmarc.mail.example.com', '_dmarc.example.com']);
    assert.equal(
        model.documents.get('mail.example.com').expiresAt.getTime(),
        currentTime.getTime() + HOUR_MS,
        'configured TTL is clamped to the one-hour minimum'
    );

    const second = await service.resolvePolicy('mail.example.com');
    assert.equal(second.fromCache, true);
    assert.deepEqual(dnsQuestions, ['_dmarc.mail.example.com', '_dmarc.example.com']);
    assert.ok(model.queries.every((query) => query.expiresAt.$gt === currentTime));
});

test('expired entries are refreshed and negative DNS results are cached', async () => {
    const model = createMemoryModel();
    const currentTime = new Date('2026-07-31T10:00:00.000Z');
    model.documents.set('example.com', {
        domain: 'example.com',
        status: 'found',
        policy: 'reject',
        expiresAt: new Date('2026-07-31T09:59:59.000Z'),
    });
    let calls = 0;
    const service = createDmarcService({
        model,
        now: () => currentTime,
        resolveTxt: async () => {
            calls += 1;
            const error = new Error('No data');
            error.code = 'ENODATA';
            throw error;
        },
        organizationalDomain: (domain) => domain,
    });

    const first = await service.resolvePolicy('example.com');
    const second = await service.resolvePolicy('example.com');
    assert.equal(first.status, 'not_found');
    assert.equal(second.status, 'not_found');
    assert.equal(second.fromCache, true);
    assert.equal(calls, 1);
});

test('positive and negative DNS TTLs control cache expiry within safety bounds', async () => {
    const currentTime = new Date('2026-07-31T10:00:00.000Z');
    const positiveModel = createMemoryModel();
    const positive = createDmarcService({
        model: positiveModel,
        now: () => currentTime,
        resolveTxt: async () => ({
            records: [['v=DMARC1; p=reject']],
            ttlSeconds: 7200,
        }),
        organizationalDomain: (domain) => domain,
    });

    await positive.resolvePolicy('example.com');
    assert.equal(
        positiveModel.documents.get('example.com').expiresAt.getTime(),
        currentTime.getTime() + 2 * HOUR_MS
    );

    const negativeModel = createMemoryModel();
    const negative = createDmarcService({
        model: negativeModel,
        now: () => currentTime,
        resolveTxt: async () => {
            const error = new Error('No data');
            error.code = 'ENODATA';
            error.negativeTtlSeconds = 48 * 60 * 60;
            throw error;
        },
        organizationalDomain: (domain) => domain,
    });

    await negative.resolvePolicy('example.com');
    assert.equal(
        negativeModel.documents.get('example.com').expiresAt.getTime(),
        currentTime.getTime() + 24 * HOUR_MS,
        'negative TTL is capped at twenty-four hours'
    );
});

test('DMARC passes with either aligned SPF or DKIM under configured modes', () => {
    const policyResult = {
        available: true,
        found: true,
        aspf: 's',
        adkim: 'r',
        appliedPolicy: 'reject',
        pct: 100,
        recordDomain: 'example.com',
    };

    const dkimPass = evaluateDmarcAuthentication({
        fromDomain: 'news.example.com',
        policyResult,
        spf: { status: 'pass', domain: 'bounce.example.com' },
        dkim: [{ status: { result: 'pass' }, signingDomain: 'mailer.example.com' }],
    });
    assert.equal(dkimPass.status, 'pass');
    assert.equal(dkimPass.alignedSpf, false);
    assert.equal(dkimPass.alignedDkim, true);

    const fail = evaluateDmarcAuthentication({
        fromDomain: 'news.example.com',
        policyResult,
        spf: { status: 'pass', domain: 'bounce.example.com' },
        dkim: { status: 'pass', domain: 'attacker.test' },
    });
    assert.equal(fail.status, 'fail');
});

test('temporary mechanism errors stay inconclusive unless another aligned method passes', () => {
    const policyResult = {
        available: true,
        found: true,
        aspf: 'r',
        adkim: 'r',
        appliedPolicy: 'reject',
    };
    const inconclusive = evaluateDmarcAuthentication({
        fromDomain: 'example.com',
        policyResult,
        spf: { result: 'temperror', domain: 'example.com' },
        dkim: { signatures: [] },
    });
    const dkimPass = evaluateDmarcAuthentication({
        fromDomain: 'example.com',
        policyResult,
        spf: { result: 'temperror', domain: 'example.com' },
        dkim: {
            signatures: [{ result: 'pass', domain: 'mail.example.com' }],
        },
    });

    assert.equal(inconclusive.status, 'temperror');
    assert.equal(dkimPass.status, 'pass');
});

test('DNS timeouts fail open and are not cached', async () => {
    const model = createMemoryModel();
    let calls = 0;
    const service = createDmarcService({
        model,
        timeoutMs: 5,
        resolveTxt: async () => {
            calls += 1;
            return new Promise(() => {});
        },
        organizationalDomain: (domain) => domain,
    });

    const result = await service.resolvePolicy('example.com');
    assert.equal(result.status, 'unavailable');
    assert.equal(result.reason, 'timeout');
    assert.equal(model.documents.size, 0);
    assert.equal(calls, 1);
});

test('DMARC cache schema has a unique domain and an absolute TTL index', () => {
    const indexes = DmarcPolicy.schema.indexes();
    assert.ok(indexes.some(([keys, options]) => keys.domain === 1 && options.unique));
    assert.ok(
        indexes.some(
            ([keys, options]) => keys.expiresAt === 1 && options.expireAfterSeconds === 0
        )
    );
});

test('cache TTL clamps to the supported one-to-twenty-four-hour range', () => {
    assert.equal(clampCacheTtlMs(undefined), HOUR_MS);
    assert.equal(clampCacheTtlMs(1), HOUR_MS);
    assert.equal(clampCacheTtlMs(48 * HOUR_MS), 24 * HOUR_MS);
});
