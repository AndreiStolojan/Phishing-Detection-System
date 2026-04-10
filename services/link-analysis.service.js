const SHORTENER_DOMAINS = new Set([
    'bit.ly',
    'tinyurl.com',
    't.co',
    'goo.gl',
    'ow.ly',
    'is.gd',
    'buff.ly',
    'cutt.ly',
    'rebrand.ly',
    'shorturl.at',
]);

const normalizeDomain = (hostname) => hostname.toLowerCase().replace(/^www\./, '');

const normalizeLinkCandidate = (rawValue) => {
    const trimmedValue = rawValue.trim();

    if (!trimmedValue) {
        return null;
    }

    if (trimmedValue.startsWith('http://') || trimmedValue.startsWith('https://')) {
        return trimmedValue;
    }

    if (trimmedValue.startsWith('www.')) {
        return `https://${trimmedValue}`;
    }

    return null;
};

const extractTextLinks = (content) => {
    const urlPattern = /\b((?:https?:\/\/|www\.)[^\s<>"'`]+)\b/gi;
    const matches = content.match(urlPattern) || [];

    return matches.map(normalizeLinkCandidate).filter(Boolean);
};

const extractHtmlLinks = (htmlContent) => {
    const hrefPattern = /href\s*=\s*["']([^"']+)["']/gi;
    const collectedLinks = [];
    let match;

    while ((match = hrefPattern.exec(htmlContent)) !== null) {
        const normalizedLink = normalizeLinkCandidate(match[1]);

        if (normalizedLink) {
            collectedLinks.push(normalizedLink);
        }
    }

    return collectedLinks;
};

const isIpAddressHost = (hostname) => /^(\d{1,3}\.){3}\d{1,3}$/.test(hostname);

export const analyzeEmailLinks = ({ textBody = '', htmlBody = '' }) => {
    const linksFromText = extractTextLinks(textBody);
    const linksFromHtml = extractHtmlLinks(htmlBody);
    const rawLinks = [...linksFromText, ...linksFromHtml];

    const normalizedLinks = [];
    const normalizedDomains = [];
    const suspiciousLinkPatterns = [];
    const seenLinks = new Set();
    let hasShortenedUrl = false;

    for (const rawLink of rawLinks) {
        let parsedUrl;

        try {
            parsedUrl = new URL(rawLink);
        } catch {
            continue;
        }

        const normalizedUrl = parsedUrl.toString();

        if (seenLinks.has(normalizedUrl)) {
            continue;
        }

        seenLinks.add(normalizedUrl);
        normalizedLinks.push(normalizedUrl);

        const normalizedDomain = normalizeDomain(parsedUrl.hostname);
        normalizedDomains.push(normalizedDomain);

        if (SHORTENER_DOMAINS.has(normalizedDomain)) {
            hasShortenedUrl = true;
            suspiciousLinkPatterns.push('shortened_url');
        }

        if (isIpAddressHost(parsedUrl.hostname)) {
            suspiciousLinkPatterns.push('ip_address_link');
        }

        if (parsedUrl.username || parsedUrl.password) {
            suspiciousLinkPatterns.push('embedded_credentials');
        }

        if (normalizedUrl.length > 200) {
            suspiciousLinkPatterns.push('very_long_url');
        }

        if (normalizedDomain.includes('xn--')) {
            suspiciousLinkPatterns.push('punycode_domain');
        }
    }

    return {
        links: normalizedLinks,
        linkDomains: [...new Set(normalizedDomains)],
        linkCount: normalizedLinks.length,
        hasShortenedUrl,
        suspiciousLinkPatterns: [...new Set(suspiciousLinkPatterns)],
    };
};
