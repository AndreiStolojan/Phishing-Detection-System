import assert from 'node:assert/strict';
import test from 'node:test';

import { readBoundedJson } from '../../src/services/threat-intel/bounded-json.service.js';

test('reads a small JSON stream and rejects declared or streamed oversized bodies', async () => {
    assert.deepEqual(
        await readBoundedJson(new Response('{"status":"ok"}'), { maxBytes: 64 }),
        { status: 'ok' }
    );

    await assert.rejects(
        readBoundedJson(new Response('{}'.padEnd(65, ' '), {
            headers: { 'Content-Length': '65' },
        }), { maxBytes: 64 }),
        { code: 'THREAT_INTEL_RESPONSE_INVALID' }
    );

    await assert.rejects(
        readBoundedJson(new Response(JSON.stringify({ value: 'x'.repeat(100) })), {
            maxBytes: 32,
        }),
        { code: 'THREAT_INTEL_RESPONSE_INVALID' }
    );
});
