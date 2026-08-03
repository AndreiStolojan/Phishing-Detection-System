import { lookup as systemLookup } from 'node:dns/promises';
import http from 'node:http';
import https from 'node:https';
import { BlockList, isIP, SocketAddress } from 'node:net';

const DEFAULT_MAX_REDIRECTS = 5;
const DEFAULT_MAX_DNS_ADDRESSES = 16;
const DEFAULT_DNS_TIMEOUT_MS = 2_000;
const DEFAULT_REQUEST_TIMEOUT_MS = 3_000;
const DEFAULT_TOTAL_TIMEOUT_MS = 10_000;
const MAX_DNS_TIMEOUT_MS = 5_000;
const MAX_REQUEST_TIMEOUT_MS = 5_000;
const MAX_TOTAL_TIMEOUT_MS = 15_000;
const MAX_URL_LENGTH = 8_192;
const MAX_HEADER_SIZE = 16 * 1_024;
const REDIRECT_STATUS_CODES = new Set([301, 302, 303, 307, 308]);

const blockedIpv4Addresses = new BlockList();
const blockedIpv6Addresses = new BlockList();

for (const [network, prefix] of [
    ['0.0.0.0', 8],
    ['10.0.0.0', 8],
    ['100.64.0.0', 10],
    ['127.0.0.0', 8],
    ['169.254.0.0', 16],
    ['172.16.0.0', 12],
    ['192.0.0.0', 24],
    ['192.0.2.0', 24],
    ['192.88.99.0', 24],
    ['192.168.0.0', 16],
    ['198.18.0.0', 15],
    ['198.51.100.0', 24],
    ['203.0.113.0', 24],
    ['224.0.0.0', 4],
    ['240.0.0.0', 4],
]) {
    blockedIpv4Addresses.addSubnet(network, prefix, 'ipv4');
}

// Permit only IPv6 global unicast (2000::/3), excluding its special-purpose
// allocations. This also rejects mapped IPv4 and NAT64 representations.
for (const [network, prefix] of [
    ['::', 3],
    ['4000::', 2],
    ['8000::', 1],
    ['2001::', 23],
    ['2001:db8::', 32],
    ['2002::', 16],
]) {
    blockedIpv6Addresses.addSubnet(network, prefix, 'ipv6');
}

const safeFetchError = (code, message, cause) => {
    const error = new Error(message, cause ? { cause } : undefined);
    error.code = code;
    return error;
};

const positiveInteger = (value, fallback) => {
    const parsed = Number(value);
    return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : fallback;
};

const boundedPositiveInteger = (value, fallback, maximum) =>
    Math.min(positiveInteger(value, fallback), maximum);

const stripIpv6Brackets = (hostname) =>
    hostname.startsWith('[') && hostname.endsWith(']')
        ? hostname.slice(1, -1)
        : hostname;

const mappedIpv4Address = (address) => {
    if (!address.startsWith('::ffff:')) {
        return null;
    }

    const parts = address.slice('::ffff:'.length).split(':');
    if (parts.length !== 2 || parts.some((part) => !/^[\da-f]{1,4}$/i.test(part))) {
        return null;
    }

    const high = Number.parseInt(parts[0], 16);
    const low = Number.parseInt(parts[1], 16);
    return `${high >>> 8}.${high & 255}.${low >>> 8}.${low & 255}`;
};

const canonicalAddress = (rawAddress) => {
    const address = stripIpv6Brackets(String(rawAddress || '').toLowerCase());
    const family = isIP(address);

    if (family === 0) {
        return null;
    }

    const canonical = new SocketAddress({
        address,
        family: family === 4 ? 'ipv4' : 'ipv6',
    }).address;

    return mappedIpv4Address(canonical) || canonical;
};

const assertPublicAddress = (rawAddress, declaredFamily) => {
    const address = stripIpv6Brackets(String(rawAddress || ''));
    const family = isIP(address);

    if (family === 0 || (declaredFamily !== undefined && Number(declaredFamily) !== family)) {
        throw safeFetchError('SAFE_FETCH_DNS_INVALID', `DNS returned an invalid address: ${address}`);
    }

    const isBlocked = family === 4
        ? blockedIpv4Addresses.check(address, 'ipv4')
        : blockedIpv6Addresses.check(address, 'ipv6');
    if (isBlocked) {
        throw safeFetchError('SAFE_FETCH_ADDRESS_BLOCKED', `Address is not publicly routable: ${address}`);
    }

    return { address, family };
};

const assertPeerAddress = (actualAddress, expectedAddress) => {
    const actual = canonicalAddress(actualAddress);
    const expected = canonicalAddress(expectedAddress);

    if (!actual || !expected || actual !== expected) {
        throw safeFetchError(
            'SAFE_FETCH_PEER_MISMATCH',
            `Connected peer ${actualAddress || '<unknown>'} does not match pinned address ${expectedAddress}`
        );
    }
};

const timeoutPromise = (promise, timeoutMs, code, onCancel, signal) => {
    let timeoutId;
    let abortHandler;
    const timeout = new Promise((_, reject) => {
        timeoutId = setTimeout(() => {
            onCancel?.();
            reject(safeFetchError(code, `Operation exceeded ${timeoutMs}ms`));
        }, timeoutMs);
    });
    const aborted = new Promise((_, reject) => {
        if (!signal) return;
        abortHandler = () => {
            onCancel?.();
            reject(safeFetchError('SAFE_FETCH_ABORTED', 'Safe fetch was cancelled'));
        };
        if (signal.aborted) abortHandler();
        else signal.addEventListener('abort', abortHandler, { once: true });
    });

    return Promise.race([promise, timeout, aborted]).finally(() => {
        clearTimeout(timeoutId);
        if (abortHandler) signal?.removeEventListener('abort', abortHandler);
    });
};

const defaultRequestAdapter = ({ protocol, options, expectedAddress }) =>
    new Promise((resolve, reject) => {
        const request = protocol === 'https:' ? https.request : http.request;
        let settled = false;
        const finish = (callback, value) => {
            if (!settled) {
                settled = true;
                callback(value);
            }
        };
        const req = request(options, (response) => {
            try {
                assertPeerAddress(response.socket?.remoteAddress, expectedAddress);
                const result = {
                    statusCode: response.statusCode,
                    headers: response.headers,
                    rawHeaders: response.rawHeaders,
                    remoteAddress: response.socket?.remoteAddress,
                };
                finish(resolve, result);
            } catch (error) {
                finish(reject, error);
            } finally {
                response.destroy();
            }
        });

        req.once('socket', (socket) => {
            const connectEvent = protocol === 'https:' ? 'secureConnect' : 'connect';
            socket.once(connectEvent, () => {
                try {
                    assertPeerAddress(socket.remoteAddress, expectedAddress);
                } catch (error) {
                    req.destroy(error);
                }
            });
        });
        req.once('error', (error) => finish(reject, error));
        req.end();
    });

const normalizedUrl = (rawUrl) => {
    if (typeof rawUrl !== 'string' || rawUrl.length === 0 || rawUrl.length > MAX_URL_LENGTH) {
        throw safeFetchError('SAFE_FETCH_INVALID_URL', 'URL is empty or exceeds the size limit');
    }

    let url;
    try {
        url = new URL(rawUrl);
    } catch (error) {
        throw safeFetchError('SAFE_FETCH_INVALID_URL', 'URL is invalid', error);
    }

    if (url.protocol !== 'http:' && url.protocol !== 'https:') {
        throw safeFetchError('SAFE_FETCH_PROTOCOL_BLOCKED', `Protocol is not allowed: ${url.protocol}`);
    }
    if (url.username || url.password) {
        throw safeFetchError('SAFE_FETCH_CREDENTIALS_BLOCKED', 'URLs with embedded credentials are not allowed');
    }

    const expectedPort = url.protocol === 'https:' ? 443 : 80;
    if (url.port && Number(url.port) !== expectedPort) {
        throw safeFetchError('SAFE_FETCH_PORT_BLOCKED', `Port is not allowed: ${url.port}`);
    }

    url.hash = '';
    return url;
};

const readLocation = (response) => {
    const rawLocations = [];
    if (Array.isArray(response.rawHeaders)) {
        for (let index = 0; index < response.rawHeaders.length; index += 2) {
            if (String(response.rawHeaders[index]).toLowerCase() === 'location') {
                rawLocations.push(String(response.rawHeaders[index + 1] || ''));
            }
        }
    } else {
        const value = response.headers?.location ?? response.headers?.Location;
        rawLocations.push(...(Array.isArray(value) ? value.map(String) : value ? [String(value)] : []));
    }

    if (rawLocations.length !== 1 || !rawLocations[0]) {
        throw safeFetchError(
            rawLocations.length > 1 ? 'SAFE_FETCH_REDIRECT_AMBIGUOUS' : 'SAFE_FETCH_REDIRECT_MISSING',
            'Redirect response must contain exactly one Location header'
        );
    }
    if (rawLocations[0].length > MAX_URL_LENGTH) {
        throw safeFetchError('SAFE_FETCH_INVALID_URL', 'Redirect URL exceeds the size limit');
    }

    return rawLocations[0];
};

const makePinnedLookup = ({ hostname, address, family }) =>
    (requestedHostname, options, callback) => {
        queueMicrotask(() => {
            if (requestedHostname !== hostname) {
                callback(safeFetchError('SAFE_FETCH_DNS_INVALID', 'Pinned lookup received a different hostname'));
                return;
            }
            if (options?.all) {
                callback(null, [{ address, family }]);
                return;
            }
            callback(null, address, family);
        });
    };

const requestOptionsFor = (url, pinnedAddress, signal) => {
    const hostname = stripIpv6Brackets(url.hostname);
    const hostnameFamily = isIP(hostname);
    const options = {
        hostname,
        port: url.protocol === 'https:' ? 443 : 80,
        path: `${url.pathname}${url.search}`,
        method: 'HEAD',
        family: pinnedAddress.family,
        autoSelectFamily: false,
        agent: false,
        signal,
        maxHeaderSize: MAX_HEADER_SIZE,
        lookup: makePinnedLookup({
            hostname,
            address: pinnedAddress.address,
            family: pinnedAddress.family,
        }),
        headers: {
            Host: url.host,
            Accept: '*/*',
            Connection: 'close',
            'User-Agent': 'SecureInbox-ThreatIntel/1',
        },
    };

    if (url.protocol === 'https:') {
        options.rejectUnauthorized = true;
        if (hostnameFamily === 0) {
            options.servername = hostname;
        }
    }

    return options;
};

export const createSafeFetch = ({
    dnsLookup = systemLookup,
    requestAdapter = defaultRequestAdapter,
    maxRedirects = DEFAULT_MAX_REDIRECTS,
    maxDnsAddresses = DEFAULT_MAX_DNS_ADDRESSES,
    dnsTimeoutMs = DEFAULT_DNS_TIMEOUT_MS,
    requestTimeoutMs = DEFAULT_REQUEST_TIMEOUT_MS,
    totalTimeoutMs = DEFAULT_TOTAL_TIMEOUT_MS,
} = {}) => {
    const redirectLimit = boundedPositiveInteger(
        maxRedirects,
        DEFAULT_MAX_REDIRECTS,
        DEFAULT_MAX_REDIRECTS
    );
    const addressLimit = boundedPositiveInteger(
        maxDnsAddresses,
        DEFAULT_MAX_DNS_ADDRESSES,
        DEFAULT_MAX_DNS_ADDRESSES
    );
    const dnsBudget = boundedPositiveInteger(
        dnsTimeoutMs,
        DEFAULT_DNS_TIMEOUT_MS,
        MAX_DNS_TIMEOUT_MS
    );
    const requestBudget = boundedPositiveInteger(
        requestTimeoutMs,
        DEFAULT_REQUEST_TIMEOUT_MS,
        MAX_REQUEST_TIMEOUT_MS
    );
    const totalBudget = boundedPositiveInteger(
        totalTimeoutMs,
        DEFAULT_TOTAL_TIMEOUT_MS,
        MAX_TOTAL_TIMEOUT_MS
    );

    const resolveAddress = async (url, deadline, signal) => {
        const hostname = stripIpv6Brackets(url.hostname);
        const literalFamily = isIP(hostname);
        if (literalFamily !== 0) {
            return assertPublicAddress(hostname, literalFamily);
        }

        const remainingMs = deadline - Date.now();
        if (remainingMs <= 0) {
            throw safeFetchError('SAFE_FETCH_TOTAL_TIMEOUT', 'Safe fetch deadline expired');
        }

        let answers;
        try {
            answers = await timeoutPromise(
                Promise.resolve(dnsLookup(hostname, { all: true, order: 'verbatim' })),
                Math.min(dnsBudget, remainingMs),
                'SAFE_FETCH_DNS_TIMEOUT',
                undefined,
                signal
            );
        } catch (error) {
            if (String(error?.code || '').startsWith('SAFE_FETCH_')) {
                throw error;
            }
            throw safeFetchError('SAFE_FETCH_DNS_FAILED', `DNS lookup failed for ${hostname}`, error);
        }

        if (!Array.isArray(answers) || answers.length === 0 || answers.length > addressLimit) {
            throw safeFetchError('SAFE_FETCH_DNS_INVALID', `DNS returned an invalid answer set for ${hostname}`);
        }

        const validated = answers.map(({ address, family }) => assertPublicAddress(address, family));
        return validated[0];
    };

    return async (rawUrl, { signal } = {}) => {
        const deadline = Date.now() + totalBudget;
        let currentUrl = normalizedUrl(rawUrl);
        const seenUrls = new Set([currentUrl.toString()]);
        const redirects = [];

        while (true) {
            const pinnedAddress = await resolveAddress(currentUrl, deadline, signal);
            const remainingMs = deadline - Date.now();
            if (remainingMs <= 0) {
                throw safeFetchError('SAFE_FETCH_TOTAL_TIMEOUT', 'Safe fetch deadline expired');
            }

            const controller = new AbortController();
            let response;
            try {
                response = await timeoutPromise(
                    Promise.resolve(
                        requestAdapter({
                            protocol: currentUrl.protocol,
                            options: requestOptionsFor(currentUrl, pinnedAddress, controller.signal),
                            expectedAddress: pinnedAddress.address,
                        })
                    ),
                    Math.min(requestBudget, remainingMs),
                    remainingMs <= requestBudget
                        ? 'SAFE_FETCH_TOTAL_TIMEOUT'
                        : 'SAFE_FETCH_REQUEST_TIMEOUT',
                    () => controller.abort(),
                    signal
                );
            } catch (error) {
                if (String(error?.code || '').startsWith('SAFE_FETCH_')) {
                    throw error;
                }
                throw safeFetchError('SAFE_FETCH_REQUEST_FAILED', `HEAD request failed for ${currentUrl}`, error);
            }

            assertPeerAddress(response?.remoteAddress, pinnedAddress.address);
            const statusCode = Number(response?.statusCode);
            if (!Number.isInteger(statusCode) || statusCode < 100 || statusCode > 599) {
                throw safeFetchError('SAFE_FETCH_RESPONSE_INVALID', 'HEAD response has an invalid status code');
            }

            if (!REDIRECT_STATUS_CODES.has(statusCode)) {
                return {
                    finalUrl: currentUrl.toString(),
                    statusCode,
                    redirects,
                };
            }
            if (redirects.length >= redirectLimit) {
                const error = safeFetchError('SAFE_FETCH_REDIRECT_LIMIT', 'Redirect limit exceeded');
                error.hopCount = redirects.length;
                throw error;
            }

            let nextUrl;
            try {
                nextUrl = normalizedUrl(new URL(readLocation(response), currentUrl).toString());
            } catch (error) {
                if (String(error?.code || '').startsWith('SAFE_FETCH_')) {
                    throw error;
                }
                throw safeFetchError('SAFE_FETCH_INVALID_URL', 'Redirect URL is invalid', error);
            }

            const canonicalNextUrl = nextUrl.toString();
            if (seenUrls.has(canonicalNextUrl)) {
                throw safeFetchError('SAFE_FETCH_REDIRECT_LOOP', 'Redirect loop detected');
            }

            seenUrls.add(canonicalNextUrl);
            redirects.push(canonicalNextUrl);
            currentUrl = nextUrl;
        }
    };
};

export const safeFetch = createSafeFetch();
