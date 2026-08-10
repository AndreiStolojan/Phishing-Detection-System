// ────────────────────────────────────────────────────────────────────────────────
// Hard-timeout and resource boundary for local DKIM/ARC verification.
// ────────────────────────────────────────────────────────────────────────────────

import { Worker } from 'node:worker_threads';

const DEFAULT_TIMEOUT_MS = 5_000;
const DEFAULT_MAX_RAW_BYTES = 32 * 1024 * 1024;
const DEFAULT_MAX_CONCURRENCY = 2;
const DEFAULT_MAX_QUEUE = 32;
const DEFAULT_MIN_BIT_LENGTH = 1024;
const WORKER_URL = new URL('./dkim-verifier.worker.js', import.meta.url);

const readPositiveInteger = (value, fallback, { min = 1, max = Number.MAX_SAFE_INTEGER } = {}) => {
    const parsed = Number.parseInt(value, 10);

    if (!Number.isInteger(parsed) || parsed < min || parsed > max) {
        return fallback;
    }

    return parsed;
};

const configuredTimeoutMs = readPositiveInteger(
    process.env.EMAIL_AUTH_VERIFY_TIMEOUT_MS,
    DEFAULT_TIMEOUT_MS,
    { min: 100, max: 30_000 }
);
const configuredMaxRawBytes = readPositiveInteger(
    process.env.EMAIL_AUTH_MAX_RAW_BYTES,
    DEFAULT_MAX_RAW_BYTES,
    { min: 1_024, max: 64 * 1024 * 1024 }
);
const configuredMaxConcurrency = readPositiveInteger(
    process.env.EMAIL_AUTH_MAX_CONCURRENCY,
    DEFAULT_MAX_CONCURRENCY,
    { min: 1, max: 8 }
);

export const createVerificationLimiter = ({
    concurrency = configuredMaxConcurrency,
    maxQueue = DEFAULT_MAX_QUEUE,
} = {}) => {
    let active = 0;
    const queue = [];

    const releaseNext = () => {
        const next = queue.shift();

        if (next) {
            clearTimeout(next.timeoutId);
            next.resolve(releaseNext);
            return;
        }

        active = Math.max(0, active - 1);
    };

    return {
        acquire(timeoutMs) {
            if (active < concurrency) {
                active += 1;
                return Promise.resolve(releaseNext);
            }

            if (queue.length >= maxQueue) {
                return Promise.reject(new Error('verification_queue_full'));
            }

            return new Promise((resolve, reject) => {
                const entry = { resolve, timeoutId: null };
                entry.timeoutId = setTimeout(() => {
                    const index = queue.indexOf(entry);
                    if (index >= 0) {
                        queue.splice(index, 1);
                    }
                    reject(new Error('verification_queue_timeout'));
                }, timeoutMs);
                queue.push(entry);
            });
        },
    };
};

const defaultLimiter = createVerificationLimiter();

const unavailableResult = (failureReason) => ({
    status: 'unavailable',
    failureReason,
    dkim: {
        result: 'none',
        domain: null,
        selector: null,
        aligned: false,
        source: 'local_verify',
        signatures: [],
    },
    arc: {
        result: 'none',
        chainLength: 0,
    },
});

const createDefaultWorker = ({ rawMessage, minBitLength }) => new Worker(WORKER_URL, {
    type: 'module',
    workerData: {
        rawMessage,
        minBitLength,
    },
    transferList: [rawMessage],
});

const terminateWorker = (worker) => {
    try {
        Promise.resolve(worker.terminate()).catch(() => {});
    } catch {
        // A worker that already exited needs no further cleanup.
    }
};

const runWorker = ({
    rawMessage,
    timeoutMs,
    minBitLength,
    workerFactory,
}) => new Promise((resolve) => {
    // Copy into an exact-sized transferable buffer. Buffer instances may use a
    // shared pool whose backing ArrayBuffer cannot safely be transferred.
    const transferableMessage = Uint8Array.from(rawMessage).buffer;
    let worker;

    try {
        worker = workerFactory({
            rawMessage: transferableMessage,
            minBitLength,
        });
    } catch {
        resolve(unavailableResult('mailauth_worker_failed'));
        return;
    }

    let settled = false;
    const settle = (result) => {
        if (settled) {
            return;
        }

        settled = true;
        clearTimeout(timeoutId);
        terminateWorker(worker);
        resolve(result);
    };

    const timeoutId = setTimeout(() => {
        settle(unavailableResult('mailauth_timeout'));
    }, timeoutMs);

    worker.once('message', (message) => {
        if (!message?.ok || !message.result?.dkim || !message.result?.arc) {
            settle(unavailableResult('mailauth_verification_failed'));
            return;
        }
        if (message.result.signatureLimitExceeded) {
            settle(unavailableResult('mailauth_signature_limit'));
            return;
        }

        const hasTemporaryDnsFailure =
            message.result.dkim.result === 'temperror' ||
            message.result.dkim.signatures.some(
                (signature) => signature.result === 'temperror'
            );
        settle({
            status: hasTemporaryDnsFailure ? 'unavailable' : 'ok',
            failureReason: hasTemporaryDnsFailure ? 'mailauth_dns_failure' : null,
            ...message.result,
        });
    });
    worker.once('error', () => {
        settle(unavailableResult('mailauth_worker_failed'));
    });
    worker.once('exit', (code) => {
        if (code !== 0) {
            settle(unavailableResult('mailauth_worker_failed'));
        } else {
            settle(unavailableResult('mailauth_worker_exited'));
        }
    });
});

export const verifyDkimAndArc = async (rawMessage, {
    timeoutMs = configuredTimeoutMs,
    maxRawBytes = configuredMaxRawBytes,
    minBitLength = DEFAULT_MIN_BIT_LENGTH,
    limiter = defaultLimiter,
    workerFactory = createDefaultWorker,
} = {}) => {
    if (!rawMessage || (!Buffer.isBuffer(rawMessage) && !(rawMessage instanceof Uint8Array))) {
        return unavailableResult('raw_message_missing');
    }

    if (rawMessage.byteLength === 0) {
        return unavailableResult('raw_message_missing');
    }

    if (rawMessage.byteLength > maxRawBytes) {
        return unavailableResult('raw_message_too_large');
    }

    const safeTimeoutMs = readPositiveInteger(timeoutMs, configuredTimeoutMs);
    const startedAt = Date.now();
    let release;

    try {
        release = await limiter.acquire(safeTimeoutMs);
    } catch (error) {
        return unavailableResult(
            error?.message === 'verification_queue_full'
                ? 'mailauth_busy'
                : 'mailauth_timeout'
        );
    }

    try {
        const remainingTimeoutMs = Math.max(1, safeTimeoutMs - (Date.now() - startedAt));
        return await runWorker({
            rawMessage,
            timeoutMs: remainingTimeoutMs,
            minBitLength,
            workerFactory,
        });
    } finally {
        release();
    }
};
