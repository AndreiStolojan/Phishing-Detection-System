import { normalizeHttpUrl } from './url-normalization.service.js';

const URLHAUS_URL = 'https://urlhaus-api.abuse.ch/v1/url/';
const MAX_TIMEOUT_MS = 10_000;

const unavailable = (reason) => ({
    status: 'unavailable',
    match: false,
    reason,
});

const requestSignal = (timeoutMs) => {
    const boundedTimeout = Math.min(
        Math.max(Number(timeoutMs) || 0, 1),
        MAX_TIMEOUT_MS
    );
    return AbortSignal.timeout(boundedTimeout);
};

const isUrlhausMatch = (body) =>
    body &&
    typeof body === 'object' &&
    !Array.isArray(body) &&
    body.query_status === 'ok' &&
    typeof body.url === 'string';

// URLhaus Community accepts form-encoded POST requests. The adapter exposes a
// binary result so raw malware metadata and the original URL are not persisted.
export const createUrlhausService = ({
    authKey = '',
    fetch: fetchImpl = globalThis.fetch,
    timeoutMs = 5_000,
} = {}) => {
    const enabled = typeof authKey === 'string' && authKey.trim().length > 0;

    const lookup = async (url) => {
        const normalizedUrl = normalizeHttpUrl(url);
        if (!normalizedUrl) return unavailable('invalid_url');
        if (!enabled) return unavailable('not_configured');
        if (typeof fetchImpl !== 'function') return unavailable('fetch_unavailable');

        try {
            const response = await fetchImpl(URLHAUS_URL, {
                method: 'POST',
                headers: {
                    'Auth-Key': authKey.trim(),
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: new URLSearchParams({ url: normalizedUrl }).toString(),
                signal: requestSignal(timeoutMs),
            });
            if (!response?.ok) return unavailable('request_failed');

            let body;
            try {
                body = await response.json();
            } catch {
                return unavailable('invalid_response');
            }

            if (!body || typeof body !== 'object' || Array.isArray(body)) {
                return unavailable('invalid_response');
            }
            if (!['ok', 'no_results'].includes(body.query_status)) {
                return unavailable('invalid_response');
            }
            if (body.query_status === 'ok' && typeof body.url !== 'string') {
                return unavailable('invalid_response');
            }

            return {
                status: 'ok',
                match: isUrlhausMatch(body),
            };
        } catch (error) {
            return unavailable(error?.name === 'TimeoutError' ? 'timeout' : 'request_failed');
        }
    };

    return Object.freeze({ lookup });
};
