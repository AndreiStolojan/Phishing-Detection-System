import { domainToASCII } from 'node:url';

import { getDomain } from 'tldts';

import DmarcPolicy from '../../models/dmarc-policy.model.js';
import { resolveTxtWithTtl as defaultResolveTxt } from './dns-txt-resolver.service.js';

const ONE_HOUR_MS = 60 * 60 * 1000;
const MAX_CACHE_TTL_MS = 24 * ONE_HOUR_MS;
const DEFAULT_DNS_TIMEOUT_MS = 5_000;
const NEGATIVE_DNS_CODES = new Set(['ENODATA', 'ENOTFOUND', 'NXDOMAIN', 'NOTFOUND']);
const VALID_POLICIES = new Set(['none', 'quarantine', 'reject']);

const toPlainObject = async (query) => {
    if (query && typeof query.lean === 'function') {
        return query.lean();
    }
    return query;
};

const normalizeDomain = (value) => {
    if (typeof value !== 'string') return '';

    const withoutDot = value.trim().toLowerCase().replace(/\.+$/, '');
    if (!withoutDot || withoutDot.includes('@')) return '';

    const ascii = domainToASCII(withoutDot).toLowerCase();
    if (!ascii || ascii.length > 253) return '';

    const labels = ascii.split('.');
    if (
        labels.some(
            (label) =>
                !label ||
                label.length > 63 ||
                !/^[a-z0-9-]+$/.test(label) ||
                label.startsWith('-') ||
                label.endsWith('-')
        )
    ) {
        return '';
    }

    return ascii;
};

export const clampCacheTtlMs = (value) => {
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) return ONE_HOUR_MS;
    return Math.min(MAX_CACHE_TTL_MS, Math.max(ONE_HOUR_MS, Math.round(parsed)));
};

export const getOrganizationalDomain = (domain) => {
    const normalized = normalizeDomain(domain);
    if (!normalized) return '';
    return getDomain(normalized, { allowPrivateDomains: true }) || normalized;
};

const splitTag = (part) => {
    const separatorIndex = part.indexOf('=');
    if (separatorIndex < 1) return null;
    return [
        part.slice(0, separatorIndex).trim().toLowerCase(),
        part.slice(separatorIndex + 1).trim(),
    ];
};

export const parseDmarcRecord = (record) => {
    if (typeof record !== 'string') return null;

    const parts = record
        .split(';')
        .map((part) => part.trim())
        .filter(Boolean);
    const firstTag = parts.length > 0 ? splitTag(parts[0]) : null;

    // RFC 7489 requires v=DMARC1 to be the first tag and p to be present.
    if (!firstTag || firstTag[0] !== 'v' || firstTag[1].toUpperCase() !== 'DMARC1') {
        return null;
    }

    const tags = new Map();
    for (const part of parts) {
        const parsedTag = splitTag(part);
        if (!parsedTag || tags.has(parsedTag[0])) return null;
        tags.set(...parsedTag);
    }

    const policy = tags.get('p')?.toLowerCase();
    const subdomainPolicy = tags.get('sp')?.toLowerCase() || null;
    const adkim = tags.get('adkim')?.toLowerCase() || 'r';
    const aspf = tags.get('aspf')?.toLowerCase() || 'r';
    const pctText = tags.get('pct') ?? '100';

    if (
        !VALID_POLICIES.has(policy) ||
        (subdomainPolicy !== null && !VALID_POLICIES.has(subdomainPolicy)) ||
        !['r', 's'].includes(adkim) ||
        !['r', 's'].includes(aspf) ||
        !/^\d{1,3}$/.test(pctText)
    ) {
        return null;
    }

    const pct = Number(pctText);
    if (pct > 100) return null;

    return {
        record: record.trim(),
        policy,
        subdomainPolicy,
        adkim,
        aspf,
        pct,
    };
};

export const isDomainAligned = (
    authenticationDomain,
    fromDomain,
    mode = 'r',
    organizationalDomain = getOrganizationalDomain
) => {
    const authenticated = normalizeDomain(authenticationDomain);
    const from = normalizeDomain(fromDomain);
    if (!authenticated || !from) return false;
    if (mode === 's') return authenticated === from;

    const authenticatedOrganization = organizationalDomain(authenticated);
    const fromOrganization = organizationalDomain(from);
    return Boolean(
        authenticatedOrganization &&
            fromOrganization &&
            authenticatedOrganization === fromOrganization
    );
};

const successfulDkimDomains = (dkim) => {
    const entries = Array.isArray(dkim)
        ? dkim
        : Array.isArray(dkim?.signatures)
          ? dkim.signatures
          : dkim
            ? [dkim]
            : [];
    return entries
        .filter(
            (entry) =>
                entry?.status === 'pass' ||
                entry?.status?.result === 'pass' ||
                entry?.result === 'pass'
        )
        .map((entry) => entry.domain || entry.signingDomain || entry.d)
        .filter(Boolean);
};

const hasTemporaryDkimError = (dkim) => {
    const entries = Array.isArray(dkim)
        ? dkim
        : Array.isArray(dkim?.signatures)
          ? dkim.signatures
          : dkim
            ? [dkim]
            : [];
    return entries.some(
        (entry) =>
            entry?.status === 'temperror' ||
            entry?.status?.result === 'temperror' ||
            entry?.result === 'temperror'
    );
};

export const evaluateDmarcAuthentication = ({
    fromDomain,
    policyResult,
    spf,
    dkim,
    organizationalDomain = getOrganizationalDomain,
} = {}) => {
    if (!policyResult?.available) {
        return { status: 'unavailable', alignedSpf: false, alignedDkim: false };
    }
    if (!policyResult.found) {
        return { status: 'none', alignedSpf: false, alignedDkim: false };
    }

    const spfDomain = spf?.domain || spf?.mailFromDomain || spf?.envelopeFromDomain;
    const spfPassed =
        spf?.status === 'pass' ||
        spf?.status?.result === 'pass' ||
        spf?.result === 'pass' ||
        spf?.value === 'pass';
    const alignedSpf =
        spfPassed &&
        isDomainAligned(spfDomain, fromDomain, policyResult.aspf, organizationalDomain);
    const alignedDkim = successfulDkimDomains(dkim).some((domain) =>
        isDomainAligned(domain, fromDomain, policyResult.adkim, organizationalDomain)
    );
    const hasTemporaryError =
        spf?.status === 'temperror' ||
        spf?.status?.result === 'temperror' ||
        spf?.result === 'temperror' ||
        hasTemporaryDkimError(dkim);

    return {
        status:
            alignedSpf || alignedDkim
                ? 'pass'
                : hasTemporaryError
                    ? 'temperror'
                    : 'fail',
        alignedSpf,
        alignedDkim,
        policy: policyResult.appliedPolicy,
        pct: policyResult.pct,
        recordDomain: policyResult.recordDomain,
    };
};

const joinTxtRecord = (chunks) =>
    Array.isArray(chunks) ? chunks.map((chunk) => String(chunk)).join('') : String(chunks);

const withTimeout = async (operation, timeoutMs) => {
    let timer;
    try {
        return await Promise.race([
            operation,
            new Promise((_, reject) => {
                timer = setTimeout(() => {
                    const error = new Error('DMARC DNS lookup timed out');
                    error.code = 'ETIMEDOUT';
                    reject(error);
                }, timeoutMs);
                timer.unref?.();
            }),
        ]);
    } finally {
        clearTimeout(timer);
    }
};

export const createDmarcService = ({
    model = DmarcPolicy,
    resolveTxt = defaultResolveTxt,
    now = () => new Date(),
    timeoutMs = DEFAULT_DNS_TIMEOUT_MS,
    cacheTtlMs = ONE_HOUR_MS,
    organizationalDomain = getOrganizationalDomain,
} = {}) => {
    const ttlMs = clampCacheTtlMs(cacheTtlMs);
    const lookupTimeoutMs = Math.max(1, Number(timeoutMs) || DEFAULT_DNS_TIMEOUT_MS);

    const persist = async (domain, resolved, fetchedAt, observedTtlMs = ttlMs) => {
        const expiresAt = new Date(
            fetchedAt.getTime() + clampCacheTtlMs(observedTtlMs ?? ttlMs)
        );
        const update = {
            domain,
            status: resolved.status,
            record: resolved.record || null,
            policy: resolved.policy || null,
            subdomainPolicy: resolved.subdomainPolicy || null,
            adkim: resolved.adkim || null,
            aspf: resolved.aspf || null,
            pct: resolved.pct ?? null,
            fetchedAt,
            expiresAt,
        };

        try {
            await model.findOneAndUpdate({ domain }, update, {
                upsert: true,
                new: true,
                setDefaultsOnInsert: true,
            });
        } catch {
            // A cache write must never turn authentication into a scan failure.
        }

        return { ...update, fromCache: false };
    };

    const resolveOne = async (domain) => {
        const currentTime = now();
        try {
            const cached = await toPlainObject(
                model.findOne({ domain, expiresAt: { $gt: currentTime } })
            );
            if (cached) return { ...cached, fromCache: true };
        } catch {
            // DNS resolution remains usable when the cache store is unavailable.
        }

        try {
            const answer = await withTimeout(
                resolveTxt(`_dmarc.${domain}`),
                lookupTimeoutMs
            );
            const answers = Array.isArray(answer) ? answer : answer?.records;
            const observedTtlMs =
                !Array.isArray(answer) && Number.isFinite(Number(answer?.ttlSeconds))
                    ? Number(answer.ttlSeconds) * 1000
                    : ttlMs;
            const records = (answers || [])
                .map(joinTxtRecord)
                .filter((record) => /^\s*v\s*=\s*DMARC1(?:\s*;|\s*$)/i.test(record));

            if (records.length === 0) {
                return persist(
                    domain,
                    { status: 'not_found' },
                    currentTime,
                    observedTtlMs
                );
            }
            if (records.length > 1) {
                return {
                    status: 'unavailable',
                    available: false,
                    reason: 'multiple_records',
                    fromCache: false,
                };
            }

            const parsed = parseDmarcRecord(records[0]);
            if (!parsed) {
                return {
                    status: 'unavailable',
                    available: false,
                    reason: 'invalid_record',
                    fromCache: false,
                };
            }

            return persist(
                domain,
                { status: 'found', ...parsed },
                currentTime,
                observedTtlMs
            );
        } catch (error) {
            if (NEGATIVE_DNS_CODES.has(String(error?.code).toUpperCase())) {
                const negativeTtlMs = Number.isFinite(Number(error?.negativeTtlSeconds))
                    ? Number(error.negativeTtlSeconds) * 1000
                    : ttlMs;
                return persist(
                    domain,
                    { status: 'not_found' },
                    currentTime,
                    negativeTtlMs
                );
            }
            return {
                status: 'unavailable',
                available: false,
                reason: error?.code === 'ETIMEDOUT' ? 'timeout' : 'dns_error',
                fromCache: false,
            };
        }
    };

    const resolvePolicy = async (fromDomain) => {
        const normalizedFrom = normalizeDomain(fromDomain);
        if (!normalizedFrom) {
            return {
                status: 'unavailable',
                available: false,
                found: false,
                reason: 'invalid_domain',
            };
        }

        const exact = await resolveOne(normalizedFrom);
        if (exact.status === 'found') {
            return {
                ...exact,
                status: 'found',
                available: true,
                found: true,
                source: 'exact',
                fromDomain: normalizedFrom,
                recordDomain: normalizedFrom,
                appliedPolicy: exact.policy,
            };
        }
        if (exact.status === 'unavailable') {
            return { ...exact, found: false, fromDomain: normalizedFrom };
        }

        const organization = normalizeDomain(organizationalDomain(normalizedFrom));
        if (!organization || organization === normalizedFrom) {
            return {
                ...exact,
                status: 'not_found',
                available: true,
                found: false,
                fromDomain: normalizedFrom,
            };
        }

        const inherited = await resolveOne(organization);
        if (inherited.status === 'found') {
            return {
                ...inherited,
                status: 'found',
                available: true,
                found: true,
                source: 'organizational',
                fromDomain: normalizedFrom,
                recordDomain: organization,
                appliedPolicy: inherited.subdomainPolicy || inherited.policy,
                fromCache: Boolean(exact.fromCache && inherited.fromCache),
            };
        }
        if (inherited.status === 'unavailable') {
            return { ...inherited, found: false, fromDomain: normalizedFrom };
        }

        return {
            ...inherited,
            status: 'not_found',
            available: true,
            found: false,
            fromDomain: normalizedFrom,
            fromCache: Boolean(exact.fromCache && inherited.fromCache),
        };
    };

    return { resolvePolicy };
};

const defaultService = createDmarcService();

export const resolveDmarcPolicy = (fromDomain) => defaultService.resolvePolicy(fromDomain);
