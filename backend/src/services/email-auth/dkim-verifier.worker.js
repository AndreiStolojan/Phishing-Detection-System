// Runs mailauth outside the API event loop so a large message or slow crypto
// operation cannot block unrelated requests. The parent owns the hard timeout
// and terminates this worker if the deadline expires.

import { parentPort, workerData } from 'node:worker_threads';

import { verifyWithMailauth } from './mailauth-verifier.core.js';

const run = async () => {
    try {
        const result = await verifyWithMailauth(
            Buffer.from(workerData.rawMessage),
            { minBitLength: workerData.minBitLength }
        );

        parentPort?.postMessage({ ok: true, result });
    } catch {
        // Do not send library/DNS error text across the boundary. It may contain
        // attacker-controlled selector/domain data and is not needed by callers.
        parentPort?.postMessage({ ok: false });
    }
};

await run();
