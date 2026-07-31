// Link evidence. `shortened_url` from suspiciousLinkPatterns is deliberately
// ignored: the legacy scanner represents that fact only through hasShortenedUrl.

export const meta = Object.freeze({
    id: 'link-analysis',
    version: 1,
    kind: 'rule',
    optional: false,
});

const LINK_PATTERN_RULES = Object.freeze({
    ip_address_link: Object.freeze({
        details: 'Found URL that uses an IP address host.',
        reason: 'At least one link points to an IP address, which is often risky.',
    }),
    embedded_credentials: Object.freeze({
        details: 'Found URL with embedded credentials.',
        reason: 'At least one link contains embedded credentials.',
    }),
    punycode_domain: Object.freeze({
        details: 'Found URL using punycode domain.',
        reason: 'At least one link uses a punycode domain.',
    }),
    very_long_url: Object.freeze({
        details: 'Found URL longer than expected.',
        reason: 'At least one link is unusually long.',
    }),
});

export const collectLinkAnalysisSignals = (ctx = {}) => {
    const email = ctx.email || {};
    const signals = [];

    if (email.hasShortenedUrl) {
        signals.push({
            key: 'shortened_url_detected',
            rule: 'shortened_url_detected',
            reason: 'Email contains shortened URL links.',
            details: 'At least one known URL shortener was found in the email links.',
            order: 30,
        });
    }

    for (const pattern of email.suspiciousLinkPatterns || []) {
        const patternRule = LINK_PATTERN_RULES[pattern];

        if (!patternRule) {
            continue;
        }

        signals.push({
            key: pattern,
            rule: `suspicious_link_pattern:${pattern}`,
            reason: patternRule.reason,
            details: patternRule.details,
            order: 40,
        });
    }

    const linkCount = email.linkCount || 0;

    if (linkCount >= 10) {
        signals.push({
            key: 'too_many_links_high',
            rule: 'too_many_links_high',
            reason: 'Email includes an unusually high number of links.',
            details: `Email includes ${linkCount} links.`,
            order: 60,
        });
    } else if (linkCount >= 6) {
        signals.push({
            key: 'too_many_links_medium',
            rule: 'too_many_links_medium',
            reason: 'Email includes many links.',
            details: `Email includes ${linkCount} links.`,
            order: 60,
        });
    }

    return signals;
};

export const collectSignals = collectLinkAnalysisSignals;
export const collectLinkSignals = collectLinkAnalysisSignals;

export const analyze = async (ctx) => ({
    signals: collectLinkAnalysisSignals(ctx),
});
