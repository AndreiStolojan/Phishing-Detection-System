import assert from 'node:assert/strict';
import test from 'node:test';

import {
    createThreatIntelligenceService,
} from '../../src/services/threat-intel/threat-intelligence.service.js';

const NOW = new Date('2026-08-03T12:00:00.000Z');

const createMemoryCache = () => {
    const values = new Map();
    const key = ({ source, subject }) => `${source}:${subject}`;

    return {
        values,
        async get(input) {
            return values.get(key(input)) || null;
        },
        async set(input) {
            values.set(key(input), { ...input.value });
        },
    };
};

test('aggregates current sources, redirect evidence and domain age without exposing URLs', async () => {
    const cache = createMemoryCache();
    const calls = { webRisk: 0, urlhaus: 0, rdap: 0, redirect: 0 };
    const service = createThreatIntelligenceService({
        enabled: true,
        cache,
        now: () => NOW,
        webRisk: {
            async lookup(url) {
                calls.webRisk += 1;
                return {
                    status: 'ok',
                    matches: url.includes('bit.ly') ? ['MALWARE'] : ['SOCIAL_ENGINEERING'],
                    expiresAt: '2026-08-04T12:00:00.000Z',
                };
            },
        },
        urlhaus: {
            async lookup(url) {
                calls.urlhaus += 1;
                return { status: 'ok', match: url.includes('bad.com') };
            },
        },
        rdap: {
            async lookupDomain(domain) {
                calls.rdap += 1;
                return {
                    status: 'ok',
                    registeredAt: domain === 'bad.com'
                        ? '2026-07-31T12:00:00.000Z'
                        : '2010-01-01T00:00:00.000Z',
                };
            },
        },
        async resolveRedirect() {
            calls.redirect += 1;
            return {
                finalUrl: 'https://target.net/private?token=secret',
                statusCode: 200,
                redirects: ['/1', '/2', '/3', '/4'],
            };
        },
    });
    const email = {
        senderDomain: 'sender.com',
        links: [
            'https://bad.com/login?recipient=person%40example.com',
            'https://bit.ly/go?utm_source=mail',
            'https://bad.com/login?recipient=person%40example.com#duplicate',
        ],
        htmlBody: [
            '<a href="https://bad.com/login?recipient=person%40example.com">https://good.com</a>',
            '<a href="https://bit.ly/go?utm_source=mail">Continue</a>',
        ].join(''),
    };

    const first = await service.analyze(email);
    assert.deepEqual(first, {
        status: 'evaluated',
        sourceCounts: { web_risk: 2, urlhaus: 2, rdap: 2, redirect: 1 },
        sourceStatuses: { web_risk: 'ok', urlhaus: 'ok', rdap: 'ok', redirect: 'ok' },
        knownMalicious: true,
        knownPhishing: true,
        maliciousSources: ['web_risk', 'urlhaus'],
        phishingSources: ['web_risk'],
        domainAgeDays: 3,
        linkTextHrefMismatchCount: 1,
        differentRegistrableRedirectTargetCount: 1,
        excessiveRedirectChainCount: 1,
        redirectToPrivateCount: 0,
        checkedUrlCount: 2,
        cappedUrlCount: 0,
        cacheHitCount: 0,
    });
    assert.doesNotMatch(JSON.stringify(first), /bad\.com|target\.net|recipient|token|secret/);

    const second = await service.analyze(email);
    assert.deepEqual(calls, { webRisk: 2, urlhaus: 2, rdap: 2, redirect: 1 });
    assert.equal(second.cacheHitCount, 7);
    assert.equal(second.knownMalicious, true);
    assert.equal(second.domainAgeDays, 3);
});

test('deduplicates links and enforces the per-email URL cap', async () => {
    const calls = [];
    const service = createThreatIntelligenceService({
        enabled: true,
        cache: createMemoryCache(),
        maxUrls: 2,
        webRisk: {
            async lookup(url) {
                calls.push(`web:${url}`);
                return { status: 'ok', matches: [] };
            },
        },
        urlhaus: {
            async lookup(url) {
                calls.push(`haus:${url}`);
                return { status: 'ok', match: false };
            },
        },
        rdap: {
            async lookupDomain() {
                return { status: 'not_found', registeredAt: null };
            },
        },
    });

    const result = await service.analyze({
        links: [
            'https://one.com/?utm_source=a',
            'https://one.com/#duplicate',
            'https://two.com/',
            'https://three.com/',
        ],
    });

    assert.equal(result.checkedUrlCount, 2);
    assert.equal(result.cappedUrlCount, 1);
    assert.equal(calls.length, 4);
    assert.ok(calls.every((entry) => !entry.includes('three.com')));
});

test('fails open when sources fail independently or the total budget expires', async () => {
    const partial = createThreatIntelligenceService({
        enabled: true,
        cache: createMemoryCache(),
        webRisk: { async lookup() { return { status: 'unavailable', matches: [] }; } },
        urlhaus: { async lookup() { throw new Error('offline'); } },
        rdap: { async lookupDomain() { return { status: 'not_found', registeredAt: null }; } },
    });
    const partialResult = await partial.analyze({ links: ['https://example.com/'] });
    assert.equal(partialResult.status, 'evaluated');
    assert.deepEqual(partialResult.sourceStatuses, {
        web_risk: 'unavailable',
        urlhaus: 'unavailable',
        rdap: 'ok',
        redirect: 'skipped',
    });
    assert.equal(partialResult.knownMalicious, false);

    const never = new Promise(() => {});
    const timed = createThreatIntelligenceService({
        enabled: true,
        cache: createMemoryCache(),
        timeoutMs: 10,
        webRisk: { lookup: async () => never },
        urlhaus: { lookup: async () => never },
        rdap: { lookupDomain: async () => never },
    });
    const startedAt = Date.now();
    const timedResult = await timed.analyze({ links: ['https://example.com/'] });
    assert.ok(Date.now() - startedAt < 250);
    assert.equal(timedResult.status, 'evaluated');
    assert.deepEqual(timedResult.sourceCounts, {
        web_risk: 0, urlhaus: 0, rdap: 0, redirect: 0,
    });
});

test('turns private redirect attempts and long chains into bounded evidence', async () => {
    const privateError = new Error('private address');
    privateError.code = 'SAFE_FETCH_ADDRESS_BLOCKED';
    const redirectLimitError = new Error('too many redirects');
    redirectLimitError.code = 'SAFE_FETCH_REDIRECT_LIMIT';
    redirectLimitError.hopCount = 4;
    const service = createThreatIntelligenceService({
        enabled: true,
        cache: createMemoryCache(),
        rdap: { async lookupDomain() { return { status: 'not_found', registeredAt: null }; } },
        async resolveRedirect(url) {
            if (url.includes('bit.ly')) throw privateError;
            throw redirectLimitError;
        },
    });

    const result = await service.analyze({
        links: ['https://bit.ly/private', 'https://tinyurl.com/long'],
    });

    assert.equal(result.redirectToPrivateCount, 1);
    assert.equal(result.excessiveRedirectChainCount, 1);
    assert.equal(result.sourceCounts.redirect, 1);
    assert.equal(result.sourceStatuses.redirect, 'ok');
});

test('disabled threat intelligence performs no work', async () => {
    let calls = 0;
    const service = createThreatIntelligenceService({
        enabled: false,
        cache: createMemoryCache(),
        webRisk: { async lookup() { calls += 1; } },
    });

    assert.deepEqual(await service.analyze({ links: ['https://example.com/'] }), {
        status: 'disabled',
        sourceCounts: { web_risk: 0, urlhaus: 0, rdap: 0, redirect: 0 },
    });
    assert.equal(calls, 0);
});
