import assert from 'node:assert/strict';
import test from 'node:test';

import { createRdapService, normalizeRdapDomain } from '../../src/services/threat-intel/rdap.service.js';

const bootstrap = {
    services: [[['com'], ['https://rdap.example.test/base/']]],
};

test('RDAP caches IANA bootstrap and sends only a registrable domain to its registry', async () => {
    const requests = [];
    let currentTime = new Date('2026-08-03T12:00:00.000Z');
    const service = createRdapService({
        now: () => currentTime,
        bootstrapTtlMs: 60_000,
        fetch: async (url, options) => {
            requests.push({ url: String(url), options });
            if (String(url) === 'https://data.iana.org/rdap/dns.json') {
                return { ok: true, json: async () => bootstrap };
            }
            return {
                ok: true,
                async json() {
                    return {
                        objectClassName: 'domain',
                        events: [{ eventAction: 'registration', eventDate: '2026-07-10T00:00:00Z' }],
                    };
                },
            };
        },
    });

    assert.deepEqual(await service.lookupDomain('Sub.Example.com.'), {
        status: 'ok', registeredAt: '2026-07-10T00:00:00.000Z',
    });
    currentTime = new Date('2026-08-03T12:00:30.000Z');
    await service.lookupDomain('another-example.com');

    assert.equal(requests.length, 3);
    assert.equal(requests[1].url, 'https://rdap.example.test/base/domain/example.com');
    assert.equal(requests[2].url, 'https://rdap.example.test/base/domain/another-example.com');
    assert.equal(requests[1].options.headers.Accept, 'application/rdap+json, application/json');
    assert.equal(requests[1].options.redirect, 'error');
});

test('RDAP validates domain, bootstrap, and registry payloads fail-open', async () => {
    let calls = 0;
    const invalidDomain = createRdapService({ fetch: async () => { calls += 1; } });
    assert.deepEqual(await invalidDomain.lookupDomain('https://example.com/private'), {
        status: 'unavailable', registeredAt: null, reason: 'invalid_domain',
    });
    assert.equal(calls, 0);

    const invalidBootstrap = createRdapService({
        fetch: async () => ({ ok: true, json: async () => ({ services: [] }) }),
    });
    assert.deepEqual(await invalidBootstrap.lookupDomain('example.com'), {
        status: 'unavailable', registeredAt: null, reason: 'bootstrap_unavailable',
    });

    const noRegistration = createRdapService({
        fetch: async (url) => String(url).includes('iana.org')
            ? { ok: true, json: async () => bootstrap }
            : { ok: true, json: async () => ({ objectClassName: 'domain', events: [] }) },
    });
    assert.deepEqual(await noRegistration.lookupDomain('example.com'), {
        status: 'ok', registeredAt: null,
    });
});

test('RDAP normalizes only registrable public-looking domains', () => {
    assert.equal(normalizeRdapDomain('WWW.Example.COM.'), 'example.com');
    assert.equal(normalizeRdapDomain('localhost'), null);
    assert.equal(normalizeRdapDomain('bad_domain.example'), null);
    assert.equal(normalizeRdapDomain('https://example.com'), null);
});

test('RDAP rejects private or local registry endpoints from bootstrap data', async () => {
    let calls = 0;
    const service = createRdapService({
        fetch: async (url) => {
            calls += 1;
            if (String(url).includes('iana.org')) {
                return {
                    ok: true,
                    json: async () => ({
                        services: [[
                            ['com'],
                            ['https://127.0.0.1/rdap/', 'https://registry.local/rdap/'],
                        ]],
                    }),
                };
            }
            throw new Error('private registry must not be requested');
        },
    });

    assert.deepEqual(await service.lookupDomain('example.com'), {
        status: 'unavailable', registeredAt: null, reason: 'bootstrap_unavailable',
    });
    assert.equal(calls, 1);
});
