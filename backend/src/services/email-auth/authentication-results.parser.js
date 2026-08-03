// ─────────────────────────────────────────────────────────────────────────────
// authentication-results.parser.js — citește numai rezultatele de autentificare
// adăugate de Gmail. Antetele venite de la alte servere sunt controlabile de
// expeditor și nu reprezintă o limită de încredere.
// ─────────────────────────────────────────────────────────────────────────────

import { domainToASCII } from 'node:url';

const TRUSTED_AUTHSERV_ID = 'mx.google.com';
const RESULT_VALUES = new Set([
    'pass',
    'fail',
    'softfail',
    'neutral',
    'none',
    'temperror',
    'permerror',
]);
const METHODS = ['spf', 'dkim', 'dmarc', 'compauth'];
const EMPTY_RESULTS = Object.freeze({
    authservId: null,
    spf: null,
    dkim: null,
    dmarc: null,
    compauth: null,
});

const unfoldHeader = (value) => String(value ?? '')
    .replace(/\r?\n[\t ]+/g, ' ')
    .replace(/[\r\n]+/g, ' ');

// Separă câmpurile delimitate prin „;”, ignorând separatorii din comentarii
// RFC (inclusiv comentarii imbricate) și din șiruri între ghilimele. Comentariile
// sunt eliminate, fiind text explicativ, nu date de autentificare.
const splitHeaderSections = (headerValue) => {
    const sections = [];
    let current = '';
    let commentDepth = 0;
    let quoted = false;
    let escaped = false;

    for (const character of unfoldHeader(headerValue)) {
        if (escaped) {
            if (commentDepth === 0) {
                current += character;
            }
            escaped = false;
            continue;
        }

        if (character === '\\') {
            if (commentDepth === 0) {
                current += character;
            }
            escaped = true;
            continue;
        }

        if (commentDepth > 0) {
            if (character === '(') {
                commentDepth += 1;
            } else if (character === ')') {
                commentDepth -= 1;
            }
            continue;
        }

        if (!quoted && character === '(') {
            commentDepth = 1;
            current += ' ';
            continue;
        }

        if (character === '"') {
            quoted = !quoted;
            current += character;
            continue;
        }

        if (!quoted && character === ';') {
            sections.push(current.trim());
            current = '';
            continue;
        }

        current += character;
    }

    sections.push(current.trim());
    return sections;
};

const hasTrustedAuthservId = (authservSection) => (
    /^mx\.google\.com(?:\s+\d+)?$/i.test(authservSection.trim())
);

const normalizeDomain = (identity) => {
    if (typeof identity !== 'string') {
        return null;
    }

    let value = identity.trim().replace(/^<|>$/g, '');
    if (!value || value === '<>') {
        return null;
    }

    const atIndex = value.lastIndexOf('@');
    if (atIndex >= 0) {
        value = value.slice(atIndex + 1);
    }

    value = value.replace(/^@/, '').replace(/\.$/, '').toLowerCase();
    const asciiDomain = domainToASCII(value);

    if (!asciiDomain || asciiDomain.length > 253) {
        return null;
    }

    const labels = asciiDomain.split('.');
    if (labels.some((label) => (
        !label
        || label.length > 63
        || !/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/i.test(label)
    ))) {
        return null;
    }

    return asciiDomain;
};

const readProperties = (section) => {
    const properties = new Map();
    const propertyPattern = /(?:^|\s)(smtp\.mailfrom|smtp\.helo|header\.d|header\.i|header\.from)\s*=\s*(?:"((?:\\.|[^"\\])*)"|([^\s;]+))/gi;
    let match;

    while ((match = propertyPattern.exec(section)) !== null) {
        const name = match[1].toLowerCase();
        const value = (match[2] ?? match[3] ?? '').replace(/\\([\\"])/g, '$1');
        if (!properties.has(name)) {
            properties.set(name, value);
        }
    }

    return properties;
};

const domainForMethod = (method, properties) => {
    const candidates = {
        spf: ['smtp.mailfrom', 'smtp.helo'],
        dkim: ['header.d', 'header.i'],
        dmarc: ['header.from'],
        compauth: ['header.from'],
    }[method];

    for (const property of candidates) {
        const domain = normalizeDomain(properties.get(property));
        if (domain) {
            return domain;
        }
    }

    return null;
};

const parseResultSection = (section) => {
    const match = section.match(/^([a-z][a-z0-9_-]*)\s*=\s*([a-z][a-z0-9_-]*)\b/i);
    if (!match) {
        return null;
    }

    const method = match[1].toLowerCase();
    const result = match[2].toLowerCase();
    if (!METHODS.includes(method) || !RESULT_VALUES.has(result)) {
        return null;
    }

    return {
        method,
        result,
        domain: domainForMethod(method, readProperties(section)),
    };
};

const authenticationResultValues = (rawHeaders) => {
    if (Array.isArray(rawHeaders)) {
        return rawHeaders
            .filter((header) => (
                typeof header?.name === 'string'
                && header.name.toLowerCase() === 'authentication-results'
            ))
            .map((header) => header.value)
            .filter((value) => typeof value === 'string');
    }

    if (rawHeaders && typeof rawHeaders === 'object') {
        const entry = Object.entries(rawHeaders).find(([name]) => (
            name.toLowerCase() === 'authentication-results'
        ));
        if (!entry) {
            return [];
        }

        return (Array.isArray(entry[1]) ? entry[1] : [entry[1]])
            .filter((value) => typeof value === 'string');
    }

    return [];
};

/**
 * Extrage rezultatele SPF/DKIM/DMARC/CompAuth din limita de încredere Gmail.
 * Două antete care pretind ambele `mx.google.com` sunt considerate ambigue:
 * unul poate fi introdus de expeditor, deci nu este ales arbitrar niciunul.
 */
export const parseAuthenticationResults = (rawHeaders) => {
    const trustedHeaders = authenticationResultValues(rawHeaders)
        .map(splitHeaderSections)
        .filter(([authservSection]) => hasTrustedAuthservId(authservSection));

    if (trustedHeaders.length !== 1) {
        return { ...EMPTY_RESULTS };
    }

    const parsed = {
        ...EMPTY_RESULTS,
        authservId: TRUSTED_AUTHSERV_ID,
    };

    for (const section of trustedHeaders[0].slice(1)) {
        const result = parseResultSection(section);
        if (result && parsed[result.method] === null) {
            parsed[result.method] = {
                result: result.result,
                domain: result.domain,
            };
        }
    }

    return parsed;
};
