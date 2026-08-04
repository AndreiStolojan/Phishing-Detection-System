import { domainToASCII } from 'node:url';
import { isIP } from 'node:net';

import { getDomain } from 'tldts';

import { createSafeJsonGet } from './safe-fetch.service.js';

const IANA_DNS_BOOTSTRAP_URL = 'https://data.iana.org/rdap/dns.json';
const DEFAULT_BOOTSTRAP_TTL_MS = 24 * 60 * 60 * 1000;
const DEFAULT_BOOTSTRAP_NEGATIVE_TTL_MS = 30_000;

const unavailable = (reason) => ({
    status: 'unavailable',
    registeredAt: null,
    reason,
});

const isAllowedRegistryBaseUrl = (value) => {
    try {
        const url = new URL(value);
        const hostname = url.hostname.replace(/^\[|\]$/g, '').toLowerCase();

        return (
            url.protocol === 'https:' &&
            !url.username &&
            !url.password &&
            (!url.port || url.port === '443') &&
            isIP(hostname) === 0 &&
            hostname.includes('.') &&
            !hostname.endsWith('.local') &&
            !hostname.endsWith('.localhost') &&
            !hostname.endsWith('.internal') &&
            !hostname.endsWith('.home.arpa')
        );
    } catch {
        return false;
    }
};

export const normalizeRdapDomain = (value) => {
    if (typeof value !== 'string' || value.length > 253) return null;

    const ascii = domainToASCII(value.trim().toLowerCase().replace(/\.+$/, ''));
    if (!ascii || ascii.length > 253) return null;
    if (ascii.split('.').some((label) => !/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$|^[a-z0-9]$/.test(label))) {
        return null;
    }

    return getDomain(ascii) || null;
};

const parseBootstrap = (body) => {
    if (!body || typeof body !== 'object' || Array.isArray(body) || !Array.isArray(body.services)) {
        return null;
    }

    const endpoints = new Map();
    for (const service of body.services) {
        const [tlds, urls] = Array.isArray(service) ? service : [];
        if (!Array.isArray(tlds) || !Array.isArray(urls)) continue;
        const baseUrl = urls.find((value) =>
            typeof value === 'string' && isAllowedRegistryBaseUrl(value)
        );
        if (!baseUrl) continue;

        for (const tld of tlds) {
            if (typeof tld === 'string' && /^[a-z0-9-]+$/i.test(tld)) {
                endpoints.set(tld.toLowerCase(), baseUrl);
            }
        }
    }

    return endpoints.size > 0 ? endpoints : null;
};

const registrationDate = (body, now) => {
    if (!body || typeof body !== 'object' || Array.isArray(body) || !Array.isArray(body.events)) {
        return null;
    }

    const event = body.events.find(
        (entry) =>
            entry &&
            typeof entry === 'object' &&
            ['registration', 'registered'].includes(String(entry.eventAction).toLowerCase()) &&
            typeof entry.eventDate === 'string'
    );
    const date = event && new Date(event.eventDate);
    if (!date || Number.isNaN(date.getTime()) || date > now) return null;
    return date.toISOString();
};

const toDomainUrl = (baseUrl, domain) => {
    const base = new URL(baseUrl);
    const path = base.pathname.endsWith('/') ? base.pathname : `${base.pathname}/`;
    base.pathname = `${path}domain/${encodeURIComponent(domain)}`;
    base.search = '';
    base.hash = '';
    return base;
};

// IANA's small bootstrap registry is cached in-process. Only a registrable
// domain is sent to the selected authoritative RDAP registry, never a URL path.
export const createRdapService = ({
    now = () => new Date(),
    bootstrapUrl = IANA_DNS_BOOTSTRAP_URL,
    bootstrapTtlMs = DEFAULT_BOOTSTRAP_TTL_MS,
    bootstrapNegativeTtlMs = DEFAULT_BOOTSTRAP_NEGATIVE_TTL_MS,
    timeoutMs = 5_000,
    safeJsonGet: safeJsonGetImpl,
} = {}) => {
    const ttlMs = Math.min(
        Math.max(Number(bootstrapTtlMs) || DEFAULT_BOOTSTRAP_TTL_MS, 60_000),
        7 * DEFAULT_BOOTSTRAP_TTL_MS
    );
    const negativeTtlMs = Math.min(
        Math.max(Number(bootstrapNegativeTtlMs) || DEFAULT_BOOTSTRAP_NEGATIVE_TTL_MS, 1_000),
        5 * 60 * 1000
    );
    const safeJsonGet = typeof safeJsonGetImpl === 'function'
        ? safeJsonGetImpl
        : createSafeJsonGet({
            dnsTimeoutMs: timeoutMs,
            requestTimeoutMs: timeoutMs,
            totalTimeoutMs: timeoutMs,
        });
    let bootstrap = null;
    let bootstrapExpiresAt = 0;
    let bootstrapUnavailableUntil = 0;
    let bootstrapInFlight = null;

    const waitForBootstrap = (promise, signal) => {
        if (!signal) return promise;
        if (signal.aborted) return Promise.resolve(null);

        return new Promise((resolve) => {
            let settled = false;
            const finish = (value) => {
                if (!settled) {
                    settled = true;
                    signal.removeEventListener('abort', onAbort);
                    resolve(value);
                }
            };
            const onAbort = () => finish(null);

            signal.addEventListener('abort', onAbort, { once: true });
            if (signal.aborted) onAbort();
            promise.then(finish, () => finish(null));
        });
    };

    const loadBootstrap = async (signal) => {
        const currentTime = now().getTime();
        if (bootstrap && bootstrapExpiresAt > currentTime) return bootstrap;
        if (bootstrapUnavailableUntil > currentTime || signal?.aborted) {
            return signal?.aborted ? null : bootstrap;
        }

        if (!bootstrapInFlight) {
            // The bootstrap request has its own deadline. A cancelled scan only
            // stops waiting; it cannot cancel this shared refresh for others.
            bootstrapInFlight = (async () => {
                try {
                    const response = await safeJsonGet(bootstrapUrl, {
                        maxBytes: 512 * 1024,
                    });
                    const parsed = response?.ok ? parseBootstrap(response.body) : null;
                    if (!parsed) {
                        bootstrapUnavailableUntil = now().getTime() + negativeTtlMs;
                        return bootstrap;
                    }

                    bootstrap = parsed;
                    bootstrapExpiresAt = now().getTime() + ttlMs;
                    bootstrapUnavailableUntil = 0;
                    return bootstrap;
                } catch {
                    bootstrapUnavailableUntil = now().getTime() + negativeTtlMs;
                    return bootstrap;
                }
            })().finally(() => {
                bootstrapInFlight = null;
            });
        }

        return waitForBootstrap(bootstrapInFlight, signal);
    };

    const lookupDomain = async (domain, { signal } = {}) => {
        const normalizedDomain = normalizeRdapDomain(domain);
        if (!normalizedDomain) return unavailable('invalid_domain');

        const endpoints = await loadBootstrap(signal);
        if (!endpoints) return unavailable('bootstrap_unavailable');
        const tld = normalizedDomain.split('.').at(-1);
        const endpoint = endpoints.get(tld);
        if (!endpoint) return unavailable('registry_unavailable');

        let response;
        try {
            response = await safeJsonGet(toDomainUrl(endpoint, normalizedDomain).toString(), {
                signal,
                maxBytes: 256 * 1024,
            });
        } catch (error) {
            return unavailable(
                error?.code === 'SAFE_FETCH_RESPONSE_INVALID' ||
                error?.code === 'SAFE_FETCH_RESPONSE_TOO_LARGE'
                    ? 'invalid_response'
                    : error?.code === 'SAFE_FETCH_TOTAL_TIMEOUT' ||
                    error?.code === 'SAFE_FETCH_REQUEST_TIMEOUT'
                        ? 'timeout'
                        : 'request_failed'
            );
        }
        if (response?.status === 404) {
            return { status: 'not_found', registeredAt: null };
        }
        if (!response?.ok) return unavailable('request_failed');

        const body = response.body;
        if (!body || typeof body !== 'object' || Array.isArray(body) || body.objectClassName !== 'domain') {
            return unavailable('invalid_response');
        }

        return {
            status: 'ok',
            registeredAt: registrationDate(body, now()),
        };
    };

    return Object.freeze({ lookupDomain });
};

export { IANA_DNS_BOOTSTRAP_URL, parseBootstrap };
