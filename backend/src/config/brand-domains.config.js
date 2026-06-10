/*
 * Brand → official sending-domain reference list.
 *
 * Purpose: let the scan engine recognise when an email genuinely originates from a
 * brand's own infrastructure, so it can stop flagging legitimate brand mail for
 * "brand impersonation" and can soften brand-typical signals (urgency, links, CTAs).
 * See docs/FALSE_POSITIVE_REDUCTION.md for the full reasoning.
 *
 * IMPORTANT design rule — only brand-CONTROLLED domains belong here.
 * A domain qualifies only if the brand alone can send from it (paypal.com,
 * accounts.google.com, amazon.com, microsoft.com, apple.com …). These cannot be
 * obtained by an attacker, so a match is a strong trust signal.
 *
 * Consumer mailbox domains (gmail.com, outlook.com, live.com, hotmail.com,
 * icloud.com, yahoo.com …) are DELIBERATELY EXCLUDED even though the brand "owns"
 * them, because anyone can open an address there. Treating @gmail.com as
 * "verified Google" would let an attacker mail phishing from a throwaway Gmail
 * account and have its urgency/link/CTA signals discounted — a recall hole. Those
 * domains are listed in CONSUMER_MAILBOX_DOMAINS below and are never verified.
 *
 * The list is intentionally non-exhaustive. It targets the brands most often seen
 * in legitimate transactional/marketing mail that were being falsely flagged. Add
 * new brands or regional domains here — no rule code needs to change.
 *
 * Matching is suffix-aware (handled in brand-verification.service.js): a sender on
 * mail.paypal.com matches paypal.com, but evil-paypal.com and paypal.com.evil.com
 * do not.
 */

export const BRAND_OFFICIAL_DOMAINS = {
    paypal: {
        displayName: 'PayPal',
        domains: [
            'paypal.com',
            'paypal.co.uk',
            'paypal.de',
            'paypal.fr',
            'paypal.es',
            'paypal.it',
            'paypal.me',
            'paypalobjects.com',
        ],
    },
    google: {
        displayName: 'Google',
        domains: [
            'google.com',
            'accounts.google.com',
            'mail.google.com',
            'docs.google.com',
            'drive.google.com',
            'youtube.com',
            // NOTE: gmail.com / googlemail.com are consumer mailboxes — see exclusion list.
        ],
    },
    amazon: {
        displayName: 'Amazon',
        domains: [
            'amazon.com',
            'amazon.co.uk',
            'amazon.de',
            'amazon.fr',
            'amazon.es',
            'amazon.it',
            'amazon.ca',
            'amazon.in',
            'amazon.co.jp',
            // NOTE: amazonses.com is deliberately EXCLUDED — it is AWS SES shared sending
            // infrastructure that any AWS customer can send through, not a brand-controlled
            // domain. Including it would let an attacker on SES be "verified" as Amazon.
        ],
    },
    microsoft: {
        displayName: 'Microsoft',
        domains: [
            'microsoft.com',
            'microsoftonline.com',
            'office.com',
            'office365.com',
            'microsoft365.com',
            'azure.com',
            'windows.com',
            'microsoftstore.com',
            'accountprotection.microsoft.com',
            'email.microsoft.com',
            // NOTE: outlook.com / live.com / hotmail.com are consumer mailboxes — excluded.
        ],
    },
    apple: {
        displayName: 'Apple',
        domains: [
            'apple.com',
            'id.apple.com',
            'email.apple.com',
            'itunes.com',
            // NOTE: icloud.com / me.com / mac.com are consumer mailboxes — excluded.
        ],
    },
    netflix: {
        displayName: 'Netflix',
        domains: ['netflix.com', 'netflix.net', 'mailer.netflix.com'],
    },
    meta: {
        displayName: 'Meta / Facebook',
        domains: [
            'facebook.com',
            'facebookmail.com',
            'fb.com',
            'meta.com',
            'instagram.com',
            'mail.instagram.com',
        ],
    },
    linkedin: {
        displayName: 'LinkedIn',
        domains: ['linkedin.com', 'e.linkedin.com'],
    },
    dhl: {
        displayName: 'DHL',
        domains: ['dhl.com', 'dhl.de'],
    },
    fedex: {
        displayName: 'FedEx',
        domains: ['fedex.com'],
    },
    ups: {
        displayName: 'UPS',
        domains: ['ups.com'],
    },
};

/*
 * Consumer mailbox providers. Anyone can hold an address here, so a match is NOT a
 * brand-trust signal. Verification logic must never treat a sender on one of these
 * (or a subdomain of one) as a verified brand, regardless of the lists above.
 */
export const CONSUMER_MAILBOX_DOMAINS = new Set([
    'gmail.com',
    'googlemail.com',
    'outlook.com',
    'hotmail.com',
    'live.com',
    'msn.com',
    'icloud.com',
    'me.com',
    'mac.com',
    'yahoo.com',
    'ymail.com',
    'aol.com',
    'proton.me',
    'protonmail.com',
    'gmx.com',
    'gmx.net',
    'zoho.com',
]);
