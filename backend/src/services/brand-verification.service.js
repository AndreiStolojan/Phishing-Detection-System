import {
    BRAND_OFFICIAL_DOMAINS,
    CONSUMER_MAILBOX_DOMAINS,
} from '../config/brand-domains.config.js';

/*
 * Sender-brand verification.
 *
 * Decides whether an email genuinely comes from a brand's own (brand-controlled)
 * sending domain. This is the anchor for the false-positive fix: when the sender
 * domain is an official brand domain we (1) suppress brand-impersonation scoring,
 * (2) soften brand-typical signals via the context modifier layer, and (3) tell the
 * Ollama prompt to stop looking for impersonation and focus on real payload signals.
 *
 * Verification is based on the SENDER DOMAIN, not on text in the body, because the
 * sending domain is the one thing an attacker cannot forge for a brand-controlled
 * domain. Claimed-brand-from-text impersonation (display name says "PayPal" but the
 * domain is paypal-secure.ru) is left to the existing Ollama impersonation signal,
 * which still runs whenever the sender is NOT verified.
 */

const normalizeDomain = (value) =>
    String(value || '')
        .trim()
        .toLowerCase()
        .replace(/^www\./, '')
        .replace(/\.$/, '');

/*
 * Suffix-aware domain match: the sender domain equals the official domain, or is a
 * subdomain of it. Guards against lookalikes — evil-paypal.com and
 * paypal.com.evil.com do NOT match paypal.com.
 */
const domainMatches = (senderDomain, officialDomain) =>
    senderDomain === officialDomain ||
    senderDomain.endsWith(`.${officialDomain}`);

const isConsumerMailbox = (senderDomain) => {
    for (const consumerDomain of CONSUMER_MAILBOX_DOMAINS) {
        if (domainMatches(senderDomain, consumerDomain)) {
            return true;
        }
    }

    return false;
};

const buildUnverifiedResult = (senderDomain) => ({
    senderVerifiedBrand: false,
    brandKey: null,
    brandName: null,
    matchedDomain: null,
    officialDomains: [],
    senderDomain,
});

/*
 * @param {{ senderDomain?: string }} email-derived fields
 * @returns {{
 *   senderVerifiedBrand: boolean,
 *   brandKey: string|null,
 *   brandName: string|null,
 *   matchedDomain: string|null,
 *   officialDomains: string[],
 *   senderDomain: string,
 * }}
 */
export const verifySenderBrand = ({ senderDomain } = {}) => {
    const normalizedSenderDomain = normalizeDomain(senderDomain);

    if (!normalizedSenderDomain) {
        return buildUnverifiedResult('');
    }

    // Consumer mailbox domains are never a brand-trust signal (anyone can hold one).
    if (isConsumerMailbox(normalizedSenderDomain)) {
        return buildUnverifiedResult(normalizedSenderDomain);
    }

    for (const [brandKey, brand] of Object.entries(BRAND_OFFICIAL_DOMAINS)) {
        for (const officialDomain of brand.domains) {
            if (domainMatches(normalizedSenderDomain, officialDomain)) {
                return {
                    senderVerifiedBrand: true,
                    brandKey,
                    brandName: brand.displayName,
                    matchedDomain: officialDomain,
                    officialDomains: brand.domains,
                    senderDomain: normalizedSenderDomain,
                };
            }
        }
    }

    return buildUnverifiedResult(normalizedSenderDomain);
};
