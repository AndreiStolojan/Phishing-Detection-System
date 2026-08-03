import { URL } from 'node:url';

import { normalizeHttpUrl } from './url-normalization.service.js';

const WEB_RISK_URL = 'https://webrisk.googleapis.com/v1/uris:search';
const THREAT_TYPES = Object.freeze(['MALWARE', 'SOCIAL_ENGINEERING']);
const MAX_TIMEOUT_MS = 10_000;

const unavailable = (reason) => ({
    status: 'unavailable',
    matches: [],
    reason,
});

const requestSignal = (timeoutMs) => {
    const boundedTimeout = Math.min(
        Math.max(Number(timeoutMs) || 0, 1),
        MAX_TIMEOUT_MS
    );
    return AbortSignal.timeout(boundedTimeout);
};

const parseResponse = (body) => {
    if (!body || typeof body !== 'object' || Array.isArray(body)) return null;

    const threat = body.threat;
    if (threat !== undefined && (!threat || typeof threat !== 'object' || Array.isArray(threat))) {
        return null;
    }
    if (threat && !Array.isArray(threat.threatTypes)) return null;
    const threatTypes = threat?.threatTypes?.filter((type) => THREAT_TYPES.includes(type)) || [];

    return {
        status: 'ok',
        matches: [...new Set(threatTypes)],
        expiresAt:
            typeof threat?.expireTime === 'string' && !Number.isNaN(Date.parse(threat.expireTime))
                ? new Date(threat.expireTime).toISOString()
                : null,
    };
};

// Web Risk Lookup checks exactly one URL per request. It deliberately returns
// only bounded threat categories and expiry metadata, never the queried URL.
export const createWebRiskService = ({
    apiKey = '',
    fetch: fetchImpl = globalThis.fetch,
    timeoutMs = 5_000,
} = {}) => {
    const enabled = typeof apiKey === 'string' && apiKey.trim().length > 0;

    const lookup = async (url) => {
        const normalizedUrl = normalizeHttpUrl(url);
        if (!normalizedUrl) return unavailable('invalid_url');
        if (!enabled) return unavailable('not_configured');
        if (typeof fetchImpl !== 'function') return unavailable('fetch_unavailable');

        const requestUrl = new URL(WEB_RISK_URL);
        for (const threatType of THREAT_TYPES) {
            requestUrl.searchParams.append('threatTypes', threatType);
        }
        requestUrl.searchParams.set('uri', normalizedUrl);
        requestUrl.searchParams.set('key', apiKey.trim());

        try {
            const response = await fetchImpl(requestUrl, {
                method: 'GET',
                signal: requestSignal(timeoutMs),
            });
            if (!response?.ok) return unavailable('request_failed');

            let body;
            try {
                body = await response.json();
            } catch {
                return unavailable('invalid_response');
            }

            return parseResponse(body) || unavailable('invalid_response');
        } catch (error) {
            return unavailable(error?.name === 'TimeoutError' ? 'timeout' : 'request_failed');
        }
    };

    return Object.freeze({ lookup });
};
