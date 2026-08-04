import test from 'node:test';
import assert from 'node:assert/strict';

import {
    createSafeFetch,
    createSafeJsonGet,
} from '../../src/services/threat-intel/safe-fetch.service.js';

const PUBLIC_V4 = '8.8.8.8';
const SECOND_PUBLIC_V4 = '1.1.1.1';
const PUBLIC_V6 = '2606:4700:4700::1111';

const response = ({
    statusCode = 200,
    location,
    remoteAddress = PUBLIC_V4,
    duplicateLocation,
} = {}) => ({
    statusCode,
    headers: location ? { location } : {},
    rawHeaders: location
        ? ['Location', location, ...(duplicateLocation ? ['Location', duplicateLocation] : [])]
        : [],
    remoteAddress,
});

const publicDns = async () => [{ address: PUBLIC_V4, family: 4 }];

const streamedJsonResponse = (body, { status = 200, headers = {} } = {}) => Object.assign(
    new Response(JSON.stringify(body), {
        status,
        headers: { 'content-type': 'application/json', ...headers },
    }),
    { statusCode: status, remoteAddress: PUBLIC_V4 }
);

const errorCode = (code) => (error) => {
    assert.equal(error.code, code);
    return true;
};

test('rejects private, special, numeric IPv4 and non-global IPv6 literals before transport', async (t) => {
    const blockedUrls = [
        'http://0.0.0.1/',
        'http://10.1.2.3/',
        'http://100.64.0.1/',
        'http://127.0.0.1/',
        'http://169.254.169.254/latest/meta-data/',
        'http://172.31.255.255/',
        'http://192.0.2.1/',
        'http://192.168.1.1/',
        'http://198.18.0.1/',
        'http://198.51.100.1/',
        'http://203.0.113.1/',
        'http://224.0.0.1/',
        'http://240.0.0.1/',
        'http://127.1/',
        'http://2130706433/',
        'http://0177.0.0.1/',
        'http://0x7f000001/',
        'http://[::]/',
        'http://[::1]/',
        'http://[::ffff:127.0.0.1]/',
        'http://[64:ff9b::a9fe:a9fe]/',
        'http://[2001:db8::1]/',
        'http://[2002:7f00:1::]/',
        'http://[fc00::1]/',
        'http://[fe80::1]/',
        'http://[ff00::1]/',
    ];

    for (const url of blockedUrls) {
        await t.test(url, async () => {
            let requestCount = 0;
            const safeFetch = createSafeFetch({
                requestAdapter: async () => {
                    requestCount += 1;
                    return response();
                },
            });

            await assert.rejects(safeFetch(url), errorCode('SAFE_FETCH_ADDRESS_BLOCKED'));
            assert.equal(requestCount, 0);
        });
    }
});

test('allows public IPv4 and IPv6 literals without invoking DNS', async () => {
    let dnsCount = 0;
    const seen = [];
    const safeFetch = createSafeFetch({
        dnsLookup: async () => {
            dnsCount += 1;
            return [];
        },
        requestAdapter: async ({ expectedAddress }) => {
            seen.push(expectedAddress);
            return response({ remoteAddress: expectedAddress });
        },
    });

    await safeFetch(`https://${PUBLIC_V4}/`);
    await safeFetch(`https://[${PUBLIC_V6}]/`);

    assert.equal(dnsCount, 0);
    assert.deepEqual(seen, [PUBLIC_V4, PUBLIC_V6]);
});

test('rejects the complete DNS result when any answer is unsafe or malformed', async (t) => {
    const answerSets = [
        {
            name: 'mixed public and loopback',
            answers: [
                { address: PUBLIC_V4, family: 4 },
                { address: '127.0.0.1', family: 4 },
            ],
            code: 'SAFE_FETCH_ADDRESS_BLOCKED',
        },
        { name: 'empty', answers: [], code: 'SAFE_FETCH_DNS_INVALID' },
        {
            name: 'family mismatch',
            answers: [{ address: PUBLIC_V4, family: 6 }],
            code: 'SAFE_FETCH_DNS_INVALID',
        },
        {
            name: 'mapped IPv4',
            answers: [{ address: '::ffff:7f00:1', family: 6 }],
            code: 'SAFE_FETCH_ADDRESS_BLOCKED',
        },
    ];

    for (const fixture of answerSets) {
        await t.test(fixture.name, async () => {
            let requestCount = 0;
            const safeFetch = createSafeFetch({
                dnsLookup: async () => fixture.answers,
                requestAdapter: async () => {
                    requestCount += 1;
                    return response();
                },
            });

            await assert.rejects(safeFetch('https://mixed.example/'), errorCode(fixture.code));
            assert.equal(requestCount, 0);
        });
    }
});

test('bounds DNS answer count and wraps resolver failures', async () => {
    const tooMany = createSafeFetch({
        dnsLookup: async () => Array.from(
            { length: 17 },
            (_, index) => ({ address: `8.8.8.${index + 1}`, family: 4 })
        ),
        requestAdapter: async () => response(),
    });
    await assert.rejects(tooMany('https://many.example/'), errorCode('SAFE_FETCH_DNS_INVALID'));

    const failed = createSafeFetch({
        dnsLookup: async () => {
            throw new Error('resolver unavailable');
        },
        requestAdapter: async () => response(),
    });
    await assert.rejects(failed('https://failure.example/'), (error) => {
        assert.equal(error.code, 'SAFE_FETCH_DNS_FAILED');
        assert.equal(error.cause?.message, 'resolver unavailable');
        return true;
    });
});

test('pins DNS once while preserving HEAD, Host, SNI and TLS verification', async () => {
    let dnsCount = 0;
    const safeFetch = createSafeFetch({
        dnsLookup: async (hostname, options) => {
            dnsCount += 1;
            assert.equal(hostname, 'short.example');
            assert.deepEqual(options, { all: true, order: 'verbatim' });
            return [{ address: PUBLIC_V4, family: 4 }];
        },
        requestAdapter: async ({ protocol, options, expectedAddress }) => {
            assert.equal(protocol, 'https:');
            assert.equal(options.method, 'HEAD');
            assert.equal(options.hostname, 'short.example');
            assert.equal(options.path, '/go?q=1');
            assert.equal(options.port, 443);
            assert.equal(options.headers.Host, 'short.example');
            assert.equal(options.servername, 'short.example');
            assert.equal(options.rejectUnauthorized, true);
            assert.equal(options.agent, false);
            assert.equal(options.autoSelectFamily, false);
            assert.equal(options.maxHeaderSize, 16 * 1_024);
            assert.equal(options.headers.Authorization, undefined);
            assert.equal(options.headers.Cookie, undefined);

            const pinned = await new Promise((resolve, reject) => {
                options.lookup(options.hostname, { all: false }, (error, address, family) => {
                    if (error) reject(error);
                    else resolve({ address, family });
                });
            });
            assert.deepEqual(pinned, { address: PUBLIC_V4, family: 4 });
            assert.equal(expectedAddress, PUBLIC_V4);
            return response();
        },
    });

    assert.deepEqual(await safeFetch('https://short.example/go?q=1#ignored'), {
        finalUrl: 'https://short.example/go?q=1',
        statusCode: 200,
        redirects: [],
    });
    assert.equal(dnsCount, 1);
});

test('safe JSON GET pins the public DNS result and accepts only bounded stream-backed JSON', async () => {
    let dnsCount = 0;
    const safeJsonGet = createSafeJsonGet({
        dnsLookup: async (hostname, options) => {
            dnsCount += 1;
            assert.equal(hostname, 'rdap.example');
            assert.deepEqual(options, { all: true, order: 'verbatim' });
            return [{ address: PUBLIC_V4, family: 4 }];
        },
        requestAdapter: async ({ protocol, options, expectedAddress, maxBytes }) => {
            assert.equal(protocol, 'https:');
            assert.equal(options.method, 'GET');
            assert.equal(options.path, '/domain/example.com');
            assert.equal(options.headers.Accept, 'application/rdap+json, application/json');
            assert.equal(options.servername, 'rdap.example');
            assert.equal(expectedAddress, PUBLIC_V4);
            assert.equal(maxBytes, 512);

            const pinned = await new Promise((resolve, reject) => {
                options.lookup(options.hostname, { all: false }, (error, address, family) => {
                    if (error) reject(error);
                    else resolve({ address, family });
                });
            });
            assert.deepEqual(pinned, { address: PUBLIC_V4, family: 4 });
            return streamedJsonResponse({ objectClassName: 'domain' });
        },
    });

    assert.deepEqual(
        await safeJsonGet('https://rdap.example/domain/example.com', { maxBytes: 512 }),
        { ok: true, status: 200, body: { objectClassName: 'domain' } }
    );
    assert.equal(dnsCount, 1);
});

test('safe JSON GET rejects a rebinding DNS answer set before transport', async () => {
    let requestCount = 0;
    const safeJsonGet = createSafeJsonGet({
        dnsLookup: async () => [
            { address: PUBLIC_V4, family: 4 },
            { address: '127.0.0.1', family: 4 },
        ],
        requestAdapter: async () => {
            requestCount += 1;
            return streamedJsonResponse({});
        },
    });

    await assert.rejects(
        safeJsonGet('https://rdap.example/domain/example.com'),
        errorCode('SAFE_FETCH_ADDRESS_BLOCKED')
    );
    assert.equal(requestCount, 0);
});

test('safe JSON GET applies its byte limit while reading the response stream', async () => {
    const safeJsonGet = createSafeJsonGet({
        dnsLookup: publicDns,
        requestAdapter: async () => streamedJsonResponse({
            objectClassName: 'domain',
            padding: 'x'.repeat(32),
        }),
    });

    await assert.rejects(
        safeJsonGet('https://rdap.example/domain/example.com', { maxBytes: 32 }),
        errorCode('SAFE_FETCH_RESPONSE_INVALID')
    );
});

test('omits SNI for a public HTTPS IP literal and preserves the bracketed IPv6 Host', async () => {
    const safeFetch = createSafeFetch({
        requestAdapter: async ({ options, expectedAddress }) => {
            assert.equal(options.hostname, PUBLIC_V6);
            assert.equal(options.headers.Host, `[${PUBLIC_V6}]`);
            assert.equal(options.servername, undefined);
            assert.equal(options.rejectUnauthorized, true);
            return response({ remoteAddress: expectedAddress });
        },
    });

    await safeFetch(`https://[${PUBLIC_V6}]/`);
});

test('follows relative and absolute redirects manually and keeps every request HEAD-only', async () => {
    const requests = [];
    const dnsAnswers = {
        'start.example': PUBLIC_V4,
        'final.example': SECOND_PUBLIC_V4,
    };
    const safeFetch = createSafeFetch({
        dnsLookup: async (hostname) => [{ address: dnsAnswers[hostname], family: 4 }],
        requestAdapter: async ({ options, expectedAddress }) => {
            requests.push({
                hostname: options.hostname,
                method: options.method,
                host: options.headers.Host,
                servername: options.servername,
                expectedAddress,
            });
            if (requests.length === 1) {
                return response({ statusCode: 303, location: '/second', remoteAddress: PUBLIC_V4 });
            }
            if (requests.length === 2) {
                return response({
                    statusCode: 307,
                    location: 'https://final.example/done',
                    remoteAddress: PUBLIC_V4,
                });
            }
            return response({ remoteAddress: SECOND_PUBLIC_V4 });
        },
    });

    const result = await safeFetch('https://start.example/first');
    assert.deepEqual(result, {
        finalUrl: 'https://final.example/done',
        statusCode: 200,
        redirects: [
            'https://start.example/second',
            'https://final.example/done',
        ],
    });
    assert.deepEqual(requests, [
        {
            hostname: 'start.example',
            method: 'HEAD',
            host: 'start.example',
            servername: 'start.example',
            expectedAddress: PUBLIC_V4,
        },
        {
            hostname: 'start.example',
            method: 'HEAD',
            host: 'start.example',
            servername: 'start.example',
            expectedAddress: PUBLIC_V4,
        },
        {
            hostname: 'final.example',
            method: 'HEAD',
            host: 'final.example',
            servername: 'final.example',
            expectedAddress: SECOND_PUBLIC_V4,
        },
    ]);
});

test('revalidates redirect destinations and blocks private targets before connection', async () => {
    let requestCount = 0;
    const safeFetch = createSafeFetch({
        dnsLookup: publicDns,
        requestAdapter: async () => {
            requestCount += 1;
            return response({ statusCode: 302, location: 'http://127.0.0.1/admin' });
        },
    });

    await assert.rejects(
        safeFetch('https://start.example/'),
        errorCode('SAFE_FETCH_ADDRESS_BLOCKED')
    );
    assert.equal(requestCount, 1);
});

test('rejects unsupported schemes, credentials and non-default ports on initial and redirect URLs', async (t) => {
    const directCases = [
        ['file:///etc/passwd', 'SAFE_FETCH_PROTOCOL_BLOCKED'],
        ['https://user:secret@example.com/', 'SAFE_FETCH_CREDENTIALS_BLOCKED'],
        ['https://example.com:8443/', 'SAFE_FETCH_PORT_BLOCKED'],
        ['http://example.com:443/', 'SAFE_FETCH_PORT_BLOCKED'],
    ];

    for (const [url, code] of directCases) {
        await t.test(url, async () => {
            const safeFetch = createSafeFetch({
                dnsLookup: publicDns,
                requestAdapter: async () => response(),
            });
            await assert.rejects(safeFetch(url), errorCode(code));
        });
    }

    const redirected = createSafeFetch({
        dnsLookup: publicDns,
        requestAdapter: async () => response({
            statusCode: 302,
            location: 'https://example.com:8443/private',
        }),
    });
    await assert.rejects(
        redirected('https://start.example/'),
        errorCode('SAFE_FETCH_PORT_BLOCKED')
    );
});

test('detects redirect loops, limits hops, and requires one unambiguous Location', async () => {
    const loop = createSafeFetch({
        dnsLookup: publicDns,
        requestAdapter: async () => response({ statusCode: 301, location: '/' }),
    });
    await assert.rejects(loop('https://loop.example/'), errorCode('SAFE_FETCH_REDIRECT_LOOP'));

    const limited = createSafeFetch({
        dnsLookup: publicDns,
        maxRedirects: 2,
        requestAdapter: async ({ options }) => {
            const step = Number(options.path.slice(1) || 0);
            return response({ statusCode: 302, location: `/${step + 1}` });
        },
    });
    await assert.rejects(
        limited('https://limit.example/0'),
        (error) => {
            assert.equal(error.code, 'SAFE_FETCH_REDIRECT_LIMIT');
            assert.equal(error.hopCount, 2);
            return true;
        }
    );

    const missing = createSafeFetch({
        dnsLookup: publicDns,
        requestAdapter: async () => response({ statusCode: 302 }),
    });
    await assert.rejects(
        missing('https://missing.example/'),
        errorCode('SAFE_FETCH_REDIRECT_MISSING')
    );

    const duplicate = createSafeFetch({
        dnsLookup: publicDns,
        requestAdapter: async () => response({
            statusCode: 302,
            location: '/one',
            duplicateLocation: '/two',
        }),
    });
    await assert.rejects(
        duplicate('https://duplicate.example/'),
        errorCode('SAFE_FETCH_REDIRECT_AMBIGUOUS')
    );
});

test('does not follow Location on a non-redirect status or retry HEAD as GET after 405', async () => {
    const methods = [];
    const safeFetch = createSafeFetch({
        dnsLookup: publicDns,
        requestAdapter: async ({ options }) => {
            methods.push(options.method);
            return {
                ...response({ statusCode: 405 }),
                headers: { location: '/ignored' },
                rawHeaders: ['Location', '/ignored'],
            };
        },
    });

    assert.deepEqual(await safeFetch('https://head-only.example/'), {
        finalUrl: 'https://head-only.example/',
        statusCode: 405,
        redirects: [],
    });
    assert.deepEqual(methods, ['HEAD']);
});

test('rejects a connected peer that differs from the pinned address', async () => {
    const safeFetch = createSafeFetch({
        dnsLookup: publicDns,
        requestAdapter: async () => response({ remoteAddress: SECOND_PUBLIC_V4 }),
    });

    await assert.rejects(
        safeFetch('https://peer.example/'),
        errorCode('SAFE_FETCH_PEER_MISMATCH')
    );
});

test('enforces DNS, request and total timeout budgets without real network access', async () => {
    const never = new Promise(() => {});
    const dnsTimeout = createSafeFetch({
        dnsLookup: async () => never,
        requestAdapter: async () => response(),
        dnsTimeoutMs: 10,
        totalTimeoutMs: 100,
    });
    await assert.rejects(
        dnsTimeout('https://dns-timeout.example/'),
        errorCode('SAFE_FETCH_DNS_TIMEOUT')
    );

    let capturedSignal;
    const requestTimeout = createSafeFetch({
        dnsLookup: publicDns,
        requestAdapter: async ({ options }) => {
            capturedSignal = options.signal;
            return never;
        },
        requestTimeoutMs: 10,
        totalTimeoutMs: 100,
    });
    await assert.rejects(
        requestTimeout('https://request-timeout.example/'),
        errorCode('SAFE_FETCH_REQUEST_TIMEOUT')
    );
    assert.equal(capturedSignal.aborted, true);

    const totalTimeout = createSafeFetch({
        dnsLookup: publicDns,
        requestAdapter: async () => never,
        requestTimeoutMs: 100,
        totalTimeoutMs: 10,
    });
    await assert.rejects(
        totalTimeout('https://total-timeout.example/'),
        errorCode('SAFE_FETCH_TOTAL_TIMEOUT')
    );
});

test('external cancellation stops an in-flight resolution', async () => {
    const controller = new AbortController();
    const safeFetch = createSafeFetch({
        dnsLookup: async () => new Promise(() => {}),
        totalTimeoutMs: 100,
    });
    const pending = safeFetch('https://cancel.example/', {
        signal: controller.signal,
    });

    controller.abort();
    await assert.rejects(pending, errorCode('SAFE_FETCH_ABORTED'));
});
