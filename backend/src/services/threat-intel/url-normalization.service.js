// Canonical URL representation used before a link is deduplicated, cached, or
// sent to an external threat-intelligence source.  This deliberately accepts
// only web URLs: URL-like values such as `file:` and `javascript:` must never
// cross this boundary.

const TRACKING_PARAMETER_NAMES = new Set(['fbclid', 'gclid']);
const UNRESERVED_CHARACTER = /^[A-Za-z0-9\-._~]$/;
const MAX_URL_CHARS = 8_192;

const decodeUnreservedPercentEncoding = (value) =>
    value.replace(/%([0-9a-f]{2})/gi, (encoded, hex) => {
        const character = String.fromCharCode(Number.parseInt(hex, 16));

        return UNRESERVED_CHARACTER.test(character)
            ? character
            : `%${hex.toUpperCase()}`;
    });

const isTrackingParameter = (name) => {
    const normalizedName = name.toLowerCase();

    return (
        normalizedName.startsWith('utm_') ||
        TRACKING_PARAMETER_NAMES.has(normalizedName)
    );
};

// URLSearchParams would decode and re-encode every query value, including
// reserved separators.  Only touching the parameter name keeps the original
// meaning while still removing known tracking parameters.
const removeTrackingParameters = (rawSearch) => {
    if (!rawSearch) {
        return '';
    }

    const retainedParts = rawSearch
        .slice(1)
        .split('&')
        .filter((part) => {
            const separatorIndex = part.indexOf('=');
            const rawName = separatorIndex === -1
                ? part
                : part.slice(0, separatorIndex);

            let name;
            try {
                name = decodeURIComponent(rawName.replace(/\+/g, ' '));
            } catch {
                // An invalid escape sequence is not a tracking key. Preserve
                // it unchanged rather than silently changing the URL.
                return true;
            }

            return !isTrackingParameter(name);
        });

    return retainedParts.length > 0 ? `?${retainedParts.join('&')}` : '';
};

const toHttpUrlCandidate = (rawValue) => {
    if (typeof rawValue !== 'string') {
        return null;
    }

    const trimmedValue = rawValue.trim();

    if (!trimmedValue || trimmedValue.length > MAX_URL_CHARS) {
        return null;
    }

    if (/^https?:\/\//i.test(trimmedValue)) {
        return trimmedValue;
    }

    return /^www\./i.test(trimmedValue) ? `https://${trimmedValue}` : null;
};

/**
 * Return a canonical, safe-to-compare http(s) URL or null for every other
 * scheme/value.  The native URL parser resolves dot segments and canonicalizes
 * scheme, hostname, IPv6 spelling, and default ports for us.
 */
export const normalizeHttpUrl = (rawValue) => {
    const candidate = toHttpUrlCandidate(rawValue);

    if (!candidate) {
        return null;
    }

    let url;
    try {
        url = new URL(candidate);
    } catch {
        return null;
    }

    if (url.protocol !== 'http:' && url.protocol !== 'https:') {
        return null;
    }

    url.hash = '';
    url.pathname = decodeUnreservedPercentEncoding(url.pathname);
    url.search = decodeUnreservedPercentEncoding(
        removeTrackingParameters(url.search)
    );

    return url.toString();
};

// The canonical URL is deliberately the sole cache/hash input.  Keeping this
// as a named export prevents callers from accidentally hashing raw URLs whose
// fragments or campaign identifiers would defeat deduplication.
export const getNormalizedUrlHashInput = (rawValue) => normalizeHttpUrl(rawValue);

// Credentials are useful lexical evidence, but must never be disclosed to an
// external reputation service as part of a URL.
export const normalizeOutboundHttpUrl = (rawValue) => {
    const normalized = normalizeHttpUrl(rawValue);
    if (!normalized) return null;

    const url = new URL(normalized);
    return url.username || url.password ? null : normalized;
};

export const normalizeComparableDomain = (hostname) =>
    typeof hostname === 'string'
        ? hostname.toLowerCase().replace(/^www\./, '')
        : '';

// Metadata returned to detection code must explain an anchor mismatch without
// retaining paths or query values, which can contain recipient identifiers.
export const toRedactedUrlMetadata = (normalizedUrl) => {
    if (!normalizedUrl) {
        return null;
    }

    try {
        const url = new URL(normalizedUrl);

        return {
            scheme: url.protocol.slice(0, -1),
            domain: normalizeComparableDomain(url.hostname),
        };
    } catch {
        return null;
    }
};
