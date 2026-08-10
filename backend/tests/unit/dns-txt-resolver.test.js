import test from 'node:test';
import assert from 'node:assert/strict';

import {
    createDnsTxtResolver,
    normalizeTxtResponse,
} from '../../src/services/email-auth/dns-txt-resolver.service.js';

test('TXT resolver preserves character strings and reports the shortest record TTL', async () => {
    const questions = [];
    const resolveTxt = createDnsTxtResolver({
        nameServers: [],
        client: {
            async resolve(question, type) {
                questions.push([question, type]);
                return {
                    header: { rcode: 0 },
                    answers: [
                        { type: 16, ttl: 7200, data: ['v=DMARC1; ', 'p=reject'] },
                        { type: 16, ttl: 3600, data: ['unrelated=value'] },
                    ],
                };
            },
        },
    });

    assert.deepEqual(await resolveTxt('_dmarc.example.com'), {
        records: [['v=DMARC1; ', 'p=reject'], ['unrelated=value']],
        ttlSeconds: 3600,
    });
    assert.deepEqual(questions, [['_dmarc.example.com', 'TXT']]);
});

test('negative responses expose the RFC 2308 SOA cache lifetime', () => {
    assert.throws(
        () =>
            normalizeTxtResponse(
                {
                    header: { rcode: 3 },
                    authorities: [{ type: 6, ttl: 7200, minimum: 1800 }],
                },
                '_dmarc.missing.example'
            ),
        (error) => {
            assert.equal(error.code, 'ENOTFOUND');
            assert.equal(error.negativeTtlSeconds, 1800);
            return true;
        }
    );
});

test('empty successful responses are normalized as cacheable no-data results', () => {
    assert.throws(
        () =>
            normalizeTxtResponse(
                {
                    header: { rcode: 0 },
                    answers: [],
                    authorities: [{ type: 6, ttl: 900, minimum: 1200 }],
                },
                '_dmarc.example.com'
            ),
        (error) => {
            assert.equal(error.code, 'ENODATA');
            assert.equal(error.negativeTtlSeconds, 900);
            return true;
        }
    );
});
