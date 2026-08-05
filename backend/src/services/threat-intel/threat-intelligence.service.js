import { getDomain } from 'tldts';

import { mapWithConcurrency } from '../../common/async/map-with-concurrency.js';
import {
    analyzeEmailLinks,
    isKnownShortenerDomain,
} from '../link-analysis.service.js';
import {
    hashReputationSubject,
} from './reputation-cache.service.js';
import {
    normalizeComparableDomain,
    normalizeHttpUrl,
    normalizeOutboundHttpUrl,
} from './url-normalization.service.js';

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;
const ERROR_TTL_MS = 5 * 60 * 1000;
const CLEAN_TTL_MS = 6 * HOUR_MS;
const MALICIOUS_TTL_MS = DAY_MS;
const DOMAIN_TTL_MS = 30 * DAY_MS;
const MAX_URLS = 20;
const MAX_TIMEOUT_MS = 15_000;
const SOURCE_NAMES = Object.freeze(['web_risk', 'urlhaus', 'rdap', 'redirect']);

const boundedInteger = (value, fallback, maximum) => {
    const parsed = Number.parseInt(String(value), 10);

    return Number.isInteger(parsed)
        ? Math.min(Math.max(parsed, 1), maximum)
        : fallback;
};

const timeoutError = () => {
    const error = new Error('Threat intelligence scan budget expired');
    error.code = 'THREAT_INTEL_TIMEOUT';
    return error;
};

const withinDeadline = (operation, deadline, onTimeout) => {
    const remainingMs = deadline - Date.now();
    if (remainingMs <= 0) {
        onTimeout?.();
        return Promise.reject(timeoutError());
    }

    let timeoutId;
    const timeout = new Promise((_, reject) => {
        timeoutId = setTimeout(() => {
            onTimeout?.();
            reject(timeoutError());
        }, remainingMs);
    });

    return Promise.race([Promise.resolve().then(operation), timeout])
        .finally(() => clearTimeout(timeoutId));
};

const createConcurrencyGate = (limit) => {
    let active = 0;
    const queue = [];

    const drain = () => {
        while (active < limit && queue.length > 0) {
            const { operation, resolve, reject } = queue.shift();
            active += 1;
            Promise.resolve()
                .then(operation)
                .then(resolve, reject)
                .finally(() => {
                    active -= 1;
                    drain();
                });
        }
    };

    return (operation) => new Promise((resolve, reject) => {
        queue.push({ operation, resolve, reject });
        drain();
    });
};

const emptySourceCounts = () => Object.fromEntries(
    SOURCE_NAMES.map((source) => [source, 0])
);

const emptySourceStatuses = () => Object.fromEntries(
    SOURCE_NAMES.map((source) => [source, 'skipped'])
);

const updateSourceStatus = (sourceStatuses, source, status) => {
    if (status === 'ok' || sourceStatuses[source] === 'skipped') {
        sourceStatuses[source] = status;
    }
};

const safeCacheGet = async (cache, input, deadline) => {
    try {
        return await withinDeadline(() => cache.get(input), deadline);
    } catch {
        return null;
    }
};

const safeCacheSet = async (cache, input, deadline) => {
    try {
        await withinDeadline(() => cache.set(input), deadline);
    } catch {
        // Cache availability must never decide the email verdict.
    }
};

const unavailableResult = (extra = {}) => ({ status: 'unavailable', ...extra });

const ttlFromWebRiskExpiry = (expiresAt, now) => {
    const expiresAtMs = Date.parse(expiresAt || '');
    if (!Number.isFinite(expiresAtMs)) return MALICIOUS_TTL_MS;

    return Math.min(
        MALICIOUS_TTL_MS,
        Math.max(ERROR_TTL_MS, expiresAtMs - now.getTime())
    );
};

const uniqueSelectedUrls = ({ email, maxUrls }) => {
    const analysis = analyzeEmailLinks({
        textBody: email?.textBody || '',
        htmlBody: email?.htmlBody || '',
    });
    const mismatchDomains = new Set(
        analysis.anchorMismatches.map(({ href }) => href.domain)
    );
    const priorityLinks = analysis.links.filter((rawUrl) => {
        try {
            return mismatchDomains.has(
                normalizeComparableDomain(new URL(rawUrl).hostname)
            );
        } catch {
            return false;
        }
    });
    const selected = [];
    const seen = new Set();

    for (const candidate of [
        ...priorityLinks,
        ...(Array.isArray(email?.links) ? email.links : []),
        ...analysis.links,
    ]) {
        const normalized = normalizeOutboundHttpUrl(candidate);
        if (!normalized || seen.has(normalized)) continue;

        seen.add(normalized);
        if (selected.length < maxUrls) selected.push(normalized);
    }

    return {
        urls: selected,
        totalUniqueUrlCount: seen.size,
        linkTextHrefMismatchCount: analysis.anchorMismatches.length,
    };
};

const registrableDomain = (hostname) => {
    const normalized = normalizeComparableDomain(hostname);
    return getDomain(normalized) || null;
};

export const createThreatIntelligenceService = ({
    enabled = false,
    webRisk,
    urlhaus,
    rdap,
    resolveRedirect,
    cache,
    now = () => new Date(),
    maxUrls = 5,
    timeoutMs = 10_000,
    concurrency = 2,
    outboundConcurrency = 4,
} = {}) => {
    if (!cache || typeof cache.get !== 'function' || typeof cache.set !== 'function') {
        throw new TypeError('Threat intelligence requires a reputation cache');
    }

    const urlLimit = boundedInteger(maxUrls, 5, MAX_URLS);
    const scanTimeoutMs = boundedInteger(timeoutMs, 10_000, MAX_TIMEOUT_MS);
    const lookupConcurrency = boundedInteger(concurrency, 2, 4);
    const runOutbound = createConcurrencyGate(
        boundedInteger(outboundConcurrency, 4, 8)
    );
    const inFlight = new Map();

    const singleFlight = async ({ source, subject, deadline, operation }) => {
        const key = `${source}:${hashReputationSubject(subject)}`;
        let entry = inFlight.get(key);
        if (!entry) {
            const controller = new AbortController();
            entry = {
                controller,
                settled: false,
                waiters: 0,
                promise: null,
            };
            entry.promise = runOutbound(() => operation(controller.signal))
                .finally(() => {
                    entry.settled = true;
                    if (inFlight.get(key) === entry) inFlight.delete(key);
                });
            // A deadline can expire before the first waiter attaches below.
            // Observe rejection immediately so aborting an orphaned operation
            // cannot become a process-level unhandled rejection.
            entry.promise.catch(() => {});
            inFlight.set(key, entry);
        }

        entry.waiters += 1;
        try {
            return await withinDeadline(() => entry.promise, deadline);
        } finally {
            entry.waiters -= 1;
            if (!entry.settled && entry.waiters === 0) {
                entry.controller.abort(timeoutError());
            }
        }
    };

    const analyze = async (email = {}) => {
        if (!enabled) {
            return {
                status: 'disabled',
                sourceCounts: emptySourceCounts(),
            };
        }

        const startedAt = now();
        const deadline = Date.now() + scanTimeoutMs;
        const sourceCounts = emptySourceCounts();
        const sourceStatuses = emptySourceStatuses();
        let cacheHitCount = 0;
        const selection = uniqueSelectedUrls({ email, maxUrls: urlLimit });

        const lookupWebRisk = async (url) => {
            const cached = await safeCacheGet(
                cache,
                { source: 'web_risk', subject: url },
                deadline
            );
            if (cached) {
                cacheHitCount += 1;
                if (cached.status === 'unavailable') return unavailableResult({ matches: [] });
                return { status: 'ok', matches: cached.threatTypes || [] };
            }
            if (typeof webRisk?.lookup !== 'function') return unavailableResult({ matches: [] });

            let result;
            try {
                result = await singleFlight({
                    source: 'web_risk',
                    subject: url,
                    deadline,
                    operation: (signal) => webRisk.lookup(url, { signal }),
                });
            } catch (error) {
                result = unavailableResult({
                    matches: [],
                    reason: error?.code === 'THREAT_INTEL_TIMEOUT'
                        ? 'scan_timeout'
                        : 'request_failed',
                });
            }
            if (!result || typeof result !== 'object') {
                result = unavailableResult({ matches: [] });
            }
            if (result.status === 'ok') {
                const matches = Array.isArray(result.matches) ? result.matches : [];
                await safeCacheSet(cache, {
                    source: 'web_risk',
                    subjectType: 'url',
                    subject: url,
                    value: {
                        status: matches.length > 0 ? 'malicious' : 'clean',
                        threatTypes: matches,
                    },
                    ttlMs: matches.length > 0
                        ? ttlFromWebRiskExpiry(result.expiresAt, now())
                        : CLEAN_TTL_MS,
                }, deadline);
            } else if (!['not_configured', 'scan_timeout'].includes(result.reason)) {
                await safeCacheSet(cache, {
                    source: 'web_risk',
                    subjectType: 'url',
                    subject: url,
                    value: { status: 'unavailable' },
                    ttlMs: ERROR_TTL_MS,
                }, deadline);
            }
            return result;
        };

        const lookupUrlhaus = async (url) => {
            const cached = await safeCacheGet(
                cache,
                { source: 'urlhaus', subject: url },
                deadline
            );
            if (cached) {
                cacheHitCount += 1;
                if (cached.status === 'unavailable') return unavailableResult({ match: false });
                return { status: 'ok', match: cached.status === 'malicious' };
            }
            if (typeof urlhaus?.lookup !== 'function') return unavailableResult({ match: false });

            let result;
            try {
                result = await singleFlight({
                    source: 'urlhaus',
                    subject: url,
                    deadline,
                    operation: (signal) => urlhaus.lookup(url, { signal }),
                });
            } catch (error) {
                result = unavailableResult({
                    match: false,
                    reason: error?.code === 'THREAT_INTEL_TIMEOUT'
                        ? 'scan_timeout'
                        : 'request_failed',
                });
            }
            if (!result || typeof result !== 'object') {
                result = unavailableResult({ match: false });
            }
            if (result.status === 'ok') {
                await safeCacheSet(cache, {
                    source: 'urlhaus',
                    subjectType: 'url',
                    subject: url,
                    value: { status: result.match ? 'malicious' : 'clean' },
                    ttlMs: result.match ? MALICIOUS_TTL_MS : CLEAN_TTL_MS,
                }, deadline);
            } else if (!['not_configured', 'scan_timeout'].includes(result.reason)) {
                await safeCacheSet(cache, {
                    source: 'urlhaus',
                    subjectType: 'url',
                    subject: url,
                    value: { status: 'unavailable' },
                    ttlMs: ERROR_TTL_MS,
                }, deadline);
            }
            return result;
        };

        const urlResults = await mapWithConcurrency(
            selection.urls,
            lookupConcurrency,
            async (url) => {
                const [webRiskResult, urlhausResult] = await Promise.all([
                    lookupWebRisk(url),
                    lookupUrlhaus(url),
                ]);

                for (const [source, result] of [
                    ['web_risk', webRiskResult],
                    ['urlhaus', urlhausResult],
                ]) {
                    const status = result.status === 'ok' ? 'ok' : 'unavailable';
                    updateSourceStatus(sourceStatuses, source, status);
                    if (status === 'ok') sourceCounts[source] += 1;
                }

                return { url, webRiskResult, urlhausResult };
            }
        );

        let knownMalicious = false;
        let knownPhishing = false;
        const maliciousSources = new Set();
        const phishingSources = new Set();
        for (const { webRiskResult, urlhausResult } of urlResults) {
            const matches = webRiskResult.matches || [];
            const webRiskPhishing = matches.includes('SOCIAL_ENGINEERING');
            if (matches.includes('MALWARE') && !webRiskPhishing) {
                maliciousSources.add('web_risk');
            }
            if (urlhausResult.match === true) maliciousSources.add('urlhaus');
            if (webRiskPhishing) phishingSources.add('web_risk');
            knownMalicious ||= maliciousSources.size > 0;
            knownPhishing ||= phishingSources.size > 0;
        }

        const domains = [...new Set(selection.urls.map((url) => {
            try {
                return registrableDomain(new URL(url).hostname);
            } catch {
                return null;
            }
        }).filter(Boolean))];

        const lookupRdap = async (domain) => {
            const cached = await safeCacheGet(
                cache,
                { source: 'rdap', subject: domain },
                deadline
            );
            if (cached) {
                cacheHitCount += 1;
                if (cached.status === 'unavailable') return unavailableResult({ registeredAt: null });
                return {
                    status: cached.status === 'not_found' ? 'not_found' : 'ok',
                    registeredAt: cached.registeredAt || null,
                };
            }
            if (typeof rdap?.lookupDomain !== 'function') {
                return unavailableResult({ registeredAt: null });
            }

            let result;
            try {
                result = await singleFlight({
                    source: 'rdap',
                    subject: domain,
                    deadline,
                    operation: (signal) => rdap.lookupDomain(domain, { signal }),
                });
            } catch (error) {
                result = unavailableResult({
                    registeredAt: null,
                    reason: error?.code === 'THREAT_INTEL_TIMEOUT'
                        ? 'scan_timeout'
                        : 'request_failed',
                });
            }
            if (!result || typeof result !== 'object') {
                result = unavailableResult({ registeredAt: null });
            }
            if (result.status === 'ok' || result.status === 'not_found') {
                await safeCacheSet(cache, {
                    source: 'rdap',
                    subjectType: 'domain',
                    subject: domain,
                    value: {
                        status: result.status === 'ok' ? 'found' : 'not_found',
                        registeredAt: result.registeredAt,
                    },
                    ttlMs: result.status === 'ok' ? DOMAIN_TTL_MS : CLEAN_TTL_MS,
                }, deadline);
            } else if (result.reason !== 'scan_timeout') {
                await safeCacheSet(cache, {
                    source: 'rdap',
                    subjectType: 'domain',
                    subject: domain,
                    value: { status: 'unavailable' },
                    ttlMs: ERROR_TTL_MS,
                }, deadline);
            }
            return result;
        };

        const rdapResults = await mapWithConcurrency(
            domains,
            lookupConcurrency,
            lookupRdap
        );
        let domainAgeDays = null;
        for (const result of rdapResults) {
            const status = ['ok', 'not_found'].includes(result.status) ? 'ok' : 'unavailable';
            updateSourceStatus(sourceStatuses, 'rdap', status);
            if (status === 'ok') sourceCounts.rdap += 1;
            if (!result.registeredAt) continue;

            const registeredAt = new Date(result.registeredAt);
            const ageDays = Math.floor((startedAt.getTime() - registeredAt.getTime()) / DAY_MS);
            if (Number.isFinite(ageDays) && ageDays >= 0) {
                domainAgeDays = domainAgeDays === null
                    ? ageDays
                    : Math.min(domainAgeDays, ageDays);
            }
        }

        const senderDomain = registrableDomain(email?.senderDomain || '');
        const senderDomainHash = senderDomain
            ? hashReputationSubject(senderDomain)
            : null;
        const shortenedUrls = selection.urls.filter((url) => {
            try {
                return isKnownShortenerDomain(new URL(url).hostname);
            } catch {
                return false;
            }
        });
        let differentRegistrableRedirectTargetCount = 0;
        let excessiveRedirectChainCount = 0;
        let redirectToPrivateCount = 0;

        const lookupRedirect = async (url) => {
            const cached = await safeCacheGet(
                cache,
                { source: 'redirect', subject: url },
                deadline
            );
            if (cached) {
                cacheHitCount += 1;
                return {
                    status: cached.status,
                    targetDomainHash: cached.targetHash || null,
                    hopCount: cached.hopCount || 0,
                };
            }
            if (typeof resolveRedirect !== 'function') return unavailableResult({ hopCount: 0 });

            try {
                const result = await singleFlight({
                    source: 'redirect',
                    subject: url,
                    deadline,
                    operation: (signal) => resolveRedirect(url, { signal }),
                });
                const finalUrl = normalizeHttpUrl(result.finalUrl);
                const finalHost = finalUrl
                    ? normalizeComparableDomain(new URL(finalUrl).hostname)
                    : null;
                const targetDomain = finalHost ? registrableDomain(finalHost) : null;
                const targetDomainHash = targetDomain
                    ? hashReputationSubject(targetDomain)
                    : null;
                const hopCount = Array.isArray(result.redirects) ? result.redirects.length : 0;
                if (!finalUrl || !finalHost) return unavailableResult({ hopCount });

                await safeCacheSet(cache, {
                    source: 'redirect',
                    subjectType: 'url',
                    subject: url,
                    value: {
                        status: 'resolved',
                        targetHash: targetDomainHash,
                        hopCount,
                    },
                    ttlMs: CLEAN_TTL_MS,
                }, deadline);
                return { status: 'resolved', targetDomainHash, hopCount };
            } catch (error) {
                const hopCount = Number.isInteger(error?.hopCount) ? error.hopCount : 0;
                const isPrivate = error?.code === 'SAFE_FETCH_ADDRESS_BLOCKED';
                if (error?.code !== 'THREAT_INTEL_TIMEOUT') {
                    await safeCacheSet(cache, {
                        source: 'redirect',
                        subjectType: 'url',
                        subject: url,
                        value: {
                            status: isPrivate ? 'blocked' : 'unavailable',
                            hopCount,
                        },
                        // A blocked private address is a safe-fetch policy
                        // violation, not proof that the short URL is malicious.
                        ttlMs: ERROR_TTL_MS,
                    }, deadline);
                }
                return { status: isPrivate ? 'blocked' : 'unavailable', hopCount };
            }
        };

        const redirectResults = await mapWithConcurrency(
            shortenedUrls,
            lookupConcurrency,
            lookupRedirect
        );
        for (const result of redirectResults) {
            const checked = result.status === 'resolved' || result.status === 'blocked';
            updateSourceStatus(sourceStatuses, 'redirect', checked ? 'ok' : 'unavailable');
            if (checked) sourceCounts.redirect += 1;
            if (result.status === 'blocked') redirectToPrivateCount += 1;
            if (result.hopCount > 3) excessiveRedirectChainCount += 1;

            if (
                senderDomainHash &&
                result.targetDomainHash &&
                senderDomainHash !== result.targetDomainHash
            ) {
                differentRegistrableRedirectTargetCount += 1;
            }
        }

        return {
            status: 'evaluated',
            sourceCounts,
            sourceStatuses,
            knownMalicious,
            knownPhishing,
            maliciousSources: SOURCE_NAMES.filter((source) => maliciousSources.has(source)),
            phishingSources: SOURCE_NAMES.filter((source) => phishingSources.has(source)),
            domainAgeDays,
            linkTextHrefMismatchCount: selection.linkTextHrefMismatchCount,
            differentRegistrableRedirectTargetCount,
            excessiveRedirectChainCount,
            redirectToPrivateCount,
            checkedUrlCount: selection.urls.length,
            cappedUrlCount: Math.max(0, selection.totalUniqueUrlCount - selection.urls.length),
            cacheHitCount,
        };
    };

    return Object.freeze({ analyze });
};
