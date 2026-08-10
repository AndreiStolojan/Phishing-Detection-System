// ─────────────────────────────────────────────────────────────────────────────
// link.weights.js — greutățile semnalelor despre linkuri.
//
// Numerele sunt mutate fără modificări din scoring.config.js. Detalii:
// docs/detection-engine.md.
// ─────────────────────────────────────────────────────────────────────────────

export const LINK_RULE_WEIGHTS = Object.freeze({
    ip_address_link: 25,
    embedded_credentials: 25,
    punycode_domain: 20,
    shortened_url_detected: 15,
    too_many_links_high: 18,
    too_many_links_medium: 10,
    very_long_url: 8,
});
