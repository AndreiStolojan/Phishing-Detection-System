// ─────────────────────────────────────────────────────────────────────────────
// link-analysis.service.js — analiza linkurilor dintr-un email.
//
// Ce face, pe scurt: primește textul (plain text) și HTML-ul unui email, extrage
// toate linkurile din ele, le normalizează (formă unică, fără duplicate) și
// detectează TIPARE SUSPECTE care pot indica phishing:
// - `shortened_url` — link printr-un serviciu de scurtare (bit.ly, t.co etc.),
//   folosit des ca să ascundă adresa reală a unei pagini de phishing;
// - `ip_address_link` — linkul duce direct la o adresă IP, nu la un domeniu
//   (un site legitim are aproape mereu un nume de domeniu);
// - `embedded_credentials` — linkul conține user:pass@ (o tehnică veche, dar
//   încă folosită, de a ascunde adresa reală după niște "credențiale" false);
// - `very_long_url` — link foarte lung (>200 caractere), des folosit ca să
//   ascundă parametri suspecți sau adresa reală;
// - `punycode_domain` — domeniu codat punycode (xn--...), folosit pentru a
//   imita vizual domenii cunoscute (ex: "аpple.com" cu litere chirilice).
//
// Rezultatul (linkuri, domenii, tipare suspecte) e folosit de
// `email-parser.service.js` pentru a completa documentul Email, iar regulile de
// scor din scan.service.js "citesc" aceste câmpuri. Detalii: docs/EXPLICATIE_BACKEND.md §5.3.
// ─────────────────────────────────────────────────────────────────────────────

// Domenii cunoscute de servicii de "shortener" (scurtare de linkuri).
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

// Aduce domeniul la o formă unică: litere mici + fără prefixul "www."
// (ex: "WWW.Example.com" -> "example.com"), ca să nu tratăm același domeniu
// ca fiind diferit doar din cauza scrierii.
const normalizeDomain = (hostname) => hostname.toLowerCase().replace(/^www\./, '');

// Verifică dacă un text "candidat" e un link valid și îl aduce la o formă cu
// schemă (http/https). Linkurile care nu par a fi URL-uri sunt ignorate (null).
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

// Caută linkuri în corpul de tip text simplu (plain text), folosind o expresie
// regulată care prinde fie "http(s)://...", fie "www....".
const extractTextLinks = (content) => {
    const urlPattern = /\b((?:https?:\/\/|www\.)[^\s<>"'`]+)\b/gi;
    const matches = content.match(urlPattern) || [];

    return matches.map(normalizeLinkCandidate).filter(Boolean);
};

// Caută linkuri în corpul HTML, extrăgând valoarea atributului href="..." din
// fiecare tag (ex: <a href="https://exemplu.com">).
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

// Verifică dacă hostname-ul e o adresă IPv4 (ex: "192.168.1.1") în loc de un
// nume de domeniu normal.
const isIpAddressHost = (hostname) => /^(\d{1,3}\.){3}\d{1,3}$/.test(hostname);

// Funcția principală: primește corpul text + HTML al emailului și returnează
// toate linkurile găsite, domeniile lor și lista tiparelor suspecte detectate.
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
            // new URL(...) aruncă eroare dacă linkul e malformat — îl ignorăm.
            parsedUrl = new URL(rawLink);
        } catch {
            continue;
        }

        const normalizedUrl = parsedUrl.toString();

        // Eliminăm duplicatele (același link apărut de mai multe ori în email).
        if (seenLinks.has(normalizedUrl)) {
            continue;
        }

        seenLinks.add(normalizedUrl);
        normalizedLinks.push(normalizedUrl);

        const normalizedDomain = normalizeDomain(parsedUrl.hostname);
        normalizedDomains.push(normalizedDomain);

        // Verificăm fiecare tipar suspect pe rând. Un link poate avea mai multe
        // tipare suspecte simultan (ex: link scurtat ȘI foarte lung).
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
        // [...new Set(...)] elimină domeniile/tiparele duplicate din liste.
        linkDomains: [...new Set(normalizedDomains)],
        linkCount: normalizedLinks.length,
        hasShortenedUrl,
        suspiciousLinkPatterns: [...new Set(suspiciousLinkPatterns)],
    };
};
