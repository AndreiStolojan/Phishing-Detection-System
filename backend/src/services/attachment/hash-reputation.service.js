import crypto from 'node:crypto';

import AttachmentHash from '../../models/attachment-hash.model.js';
import { readBoundedJson } from '../threat-intel/bounded-json.service.js';

const MALWAREBAZAAR_URL = 'https://mb-api.abuse.ch/api/v1/';
const MALICIOUS_TTL_MS = 30 * 24 * 60 * 60 * 1000;
const UNKNOWN_TTL_MS = 24 * 60 * 60 * 1000;
const MAX_TIMEOUT_MS = 10_000;

const validSha256 = (value) =>
    typeof value === 'string' && /^[a-f0-9]{64}$/.test(value);

const toPlainObject = async (query) =>
    typeof query?.lean === 'function' ? query.lean() : query;

export const hashAttachmentBuffer = (buffer) => {
    if (!Buffer.isBuffer(buffer)) {
        throw new TypeError('Attachment hashing requires a Buffer');
    }
    return crypto.createHash('sha256').update(buffer).digest('hex');
};

const createModelCache = ({ model, now }) => ({
    async get(sha256) {
        return toPlainObject(model.findOne({
            sha256,
            expiresAt: { $gt: now() },
        }));
    },
    async set(sha256, verdict, ttlMs) {
        const fetchedAt = now();
        return model.findOneAndUpdate(
            { sha256 },
            {
                $set: {
                    sha256,
                    verdict,
                    fetchedAt,
                    expiresAt: new Date(fetchedAt.getTime() + ttlMs),
                },
            },
            { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true }
        );
    },
});

const unavailable = (reason) => ({
    status: 'unavailable',
    malicious: false,
    reason,
});

export const createHashReputationService = ({
    authKey = '',
    fetch: fetchImpl = globalThis.fetch,
    timeoutMs = 5_000,
    now = () => new Date(),
    model = AttachmentHash,
    cache: injectedCache,
} = {}) => {
    const cache = injectedCache || createModelCache({ model, now });
    const key = typeof authKey === 'string' ? authKey.trim() : '';

    const lookupHash = async (sha256, { signal } = {}) => {
        if (!validSha256(sha256)) return unavailable('invalid_hash');

        try {
            const cached = await cache.get(sha256);
            if (cached?.verdict === 'malicious' || cached?.verdict === 'unknown') {
                return {
                    status: 'ok',
                    malicious: cached.verdict === 'malicious',
                    cached: true,
                };
            }
        } catch {
            // Cache failures do not decide the attachment verdict.
        }

        if (!key) return unavailable('not_configured');
        if (typeof fetchImpl !== 'function') return unavailable('fetch_unavailable');

        const timeoutSignal = AbortSignal.timeout(Math.min(
            Math.max(Number(timeoutMs) || 1, 1),
            MAX_TIMEOUT_MS
        ));

        let response;
        try {
            response = await fetchImpl(MALWAREBAZAAR_URL, {
                method: 'POST',
                headers: {
                    'Auth-Key': key,
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: new URLSearchParams({ query: 'get_info', hash: sha256 }).toString(),
                redirect: 'error',
                signal: signal
                    ? AbortSignal.any([signal, timeoutSignal])
                    : timeoutSignal,
            });
        } catch (error) {
            return unavailable(error?.name === 'TimeoutError' ? 'timeout' : 'request_failed');
        }
        if (!response?.ok) return unavailable('request_failed');

        let body;
        try {
            body = await readBoundedJson(response, { maxBytes: 64 * 1024 });
        } catch {
            return unavailable('invalid_response');
        }

        const queryStatus = body?.query_status;
        const malicious = queryStatus === 'ok' &&
            Array.isArray(body?.data) &&
            body.data.some((entry) => entry?.sha256_hash === sha256);
        if (queryStatus === 'ok' && !malicious) {
            return unavailable('invalid_response');
        }
        if (queryStatus !== 'ok' && queryStatus !== 'hash_not_found') {
            return unavailable('invalid_response');
        }

        const verdict = malicious ? 'malicious' : 'unknown';
        try {
            await cache.set(
                sha256,
                verdict,
                malicious ? MALICIOUS_TTL_MS : UNKNOWN_TTL_MS
            );
        } catch {
            // A successful source lookup remains usable when Mongo is down.
        }

        return { status: 'ok', malicious, cached: false };
    };

    return Object.freeze({ lookupHash });
};

export { MALWAREBAZAAR_URL, MALICIOUS_TTL_MS, UNKNOWN_TTL_MS };
