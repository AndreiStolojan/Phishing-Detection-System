import { domainToASCII } from 'node:url';

import { getDomain } from 'tldts';

const IANA_DNS_BOOTSTRAP_URL = 'https://data.iana.org/rdap/dns.json';
const DEFAULT_BOOTSTRAP_TTL_MS = 24 * 60 * 60 * 1000;
const MAX_TIMEOUT_MS = 10_000;

const unavailable = (reason) => ({
    status: 'unavailable',
    registeredAt: null,
    reason,
});

const requestSignal = (timeoutMs) => {
    const boundedTimeout = Math.min(
        Math.max(Number(timeoutMs) || 0, 1),
        MAX_TIMEOUT_MS
    );
    return AbortSignal.timeout(boundedTimeout);
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
        const baseUrl = urls.find((value) => {
            try {
                return typeof value === 'string' && new URL(value).protocol === 'https:';
            } catch {
                return false;
            }
        });
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
    fetch: fetchImpl = globalThis.fetch,
    now = () => new Date(),
    bootstrapUrl = IANA_DNS_BOOTSTRAP_URL,
    bootstrapTtlMs = DEFAULT_BOOTSTRAP_TTL_MS,
    timeoutMs = 5_000,
} = {}) => {
    const ttlMs = Math.min(
        Math.max(Number(bootstrapTtlMs) || DEFAULT_BOOTSTRAP_TTL_MS, 60_000),
        7 * DEFAULT_BOOTSTRAP_TTL_MS
    );
    let bootstrap = null;
    let bootstrapExpiresAt = 0;

    const loadBootstrap = async () => {
        const currentTime = now().getTime();
        if (bootstrap && bootstrapExpiresAt > currentTime) return bootstrap;
        if (typeof fetchImpl !== 'function') return null;

        let response;
        try {
            response = await fetchImpl(bootstrapUrl, {
                method: 'GET',
                redirect: 'error',
                signal: requestSignal(timeoutMs),
            });
        } catch {
            return null;
        }
        if (!response?.ok) return null;

        let body;
        try {
            body = await response.json();
        } catch {
            return null;
        }
        const parsed = parseBootstrap(body);
        if (!parsed) return null;

        bootstrap = parsed;
        bootstrapExpiresAt = currentTime + ttlMs;
        return bootstrap;
    };

    const lookupDomain = async (domain) => {
        const normalizedDomain = normalizeRdapDomain(domain);
        if (!normalizedDomain) return unavailable('invalid_domain');

        const endpoints = await loadBootstrap();
        if (!endpoints) return unavailable('bootstrap_unavailable');
        const tld = normalizedDomain.split('.').at(-1);
        const endpoint = endpoints.get(tld);
        if (!endpoint) return unavailable('registry_unavailable');

        let response;
        try {
            response = await fetchImpl(toDomainUrl(endpoint, normalizedDomain), {
                method: 'GET',
                headers: { Accept: 'application/rdap+json, application/json' },
                redirect: 'error',
                signal: requestSignal(timeoutMs),
            });
        } catch (error) {
            return unavailable(error?.name === 'TimeoutError' ? 'timeout' : 'request_failed');
        }
        if (response?.status === 404) {
            return { status: 'not_found', registeredAt: null };
        }
        if (!response?.ok) return unavailable('request_failed');

        let body;
        try {
            body = await response.json();
        } catch {
            return unavailable('invalid_response');
        }
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
