/*
 * Central scoring configuration — the single source of truth for every weight,
 * cap and threshold used by the phishing scan engine.
 *
 * Rationale and the full before/after reasoning live in
 * docs/SCORING_WEIGHTS_REVIEW.md. Each weight below carries a one-line rationale.
 *
 * Model: finalScore = min(SCORE_MAX, ruleScore + aiScore), then RISK_THRESHOLDS
 * map the score to a verdict. The scale is 0–100 (stands in for a normalized 1.0).
 *
 * Invariants the numbers must preserve (see review doc §4):
 *   1. No single signal reaches HIGH_RISK (60) alone.
 *   2. No single weak signal exceeds the MEDIUM band (>=30) alone.
 *   3. AI alone can never declare phishing (AI_SCORE_MAX < HIGH_RISK threshold);
 *      rules reach 60 only via two independent strong rules (corroboration).
 */

// Top of the 0–100 scale. Final score is clamped to this.
export const SCORE_MAX = 100;

// Verdict thresholds (locked by tests/unit/schema-contract.test.js).
export const RISK_THRESHOLDS = {
    suspicious: 30, // >= 30 -> suspicious (medium risk)
    likelyPhishing: 60, // >= 60 -> likely_phishing (high risk)
};

// Deterministic rule weights (points added to ruleScore when the rule triggers).
export const RULE_WEIGHTS = {
    high_risk_attachment_extension: 35, // strong: executable attachments are near-certain abuse
    ip_address_link: 25, // strong: legit services never link to a raw IP
    embedded_credentials: 25, // strong: user:pass@host is highly abnormal in real mail
    reply_to_mismatch: 18, // medium: common in legit ESP/marketing mail, so demoted from strong
    punycode_domain: 20, // strong: visual-spoofing signal, small IDN false-positive tail
    shortened_url_detected: 15, // medium: dual-use; newsletters use shorteners too
    too_many_links_high: 18, // weak heuristic (>=10 links): must not alone reach "suspicious"
    too_many_links_medium: 10, // weak heuristic (6–9 links): a nudge, not a near-verdict
    archive_attachment_extension: 12, // weak-medium: archives are dual-use
    very_long_url: 8, // weak: long tracking URLs are common in legit mail
};

// AI semantic signal weights (points added to aiScore). Secondary and conservative.
export const AI_SIGNAL_WEIGHTS = {
    urgency_high: 8,
    urgency_medium: 4,
    sensitive_data_request: 20, // strongest AI signal: password/OTP/card request
    login_or_action_request: 8,
    social_engineering_high: 12,
    social_engineering_medium: 6,
    brand_impersonation_suspected: 10,
};

/*
 * Hard cap on the AI contribution. Kept strictly below RISK_THRESHOLDS.likelyPhishing
 * so the semantic layer can escalate risk and corroborate the rules, but can NEVER
 * declare "likely_phishing" on its own without the deterministic rules agreeing.
 */
export const AI_SCORE_MAX = 50;

/*
 * Reference maximum for the rule-score progress bar in the UI. The rule score is not
 * individually clamped in the engine, but it shares the same 0–100 scale as the final
 * score, so the bar is drawn against SCORE_MAX. Exposed here so the UI never hardcodes it.
 */
export const RULE_SCORE_MAX = SCORE_MAX;

/*
 * ── Verified-brand context modifier layer ──────────────────────────────────────
 *
 * These are CONTEXT MULTIPLIERS, not new base weights. They are applied on top of
 * the base weights above ONLY when sender-brand verification succeeds
 * (senderVerifiedBrand === true — see brand-verification.service.js). The base
 * weights in RULE_WEIGHTS / AI_SIGNAL_WEIGHTS are never mutated; the engine reads
 * the base weight and multiplies it through applyVerifiedBrandModifier() at the
 * moment a rule fires.
 *
 * Reasoning: when an email genuinely comes from a brand's own domain, the signals
 * that look phishy in the abstract (urgency, lots of links, a "Sign in" button,
 * replies routed to a support/ESP domain) are exactly what real transactional and
 * marketing mail looks like. They are much weaker evidence here, so we discount
 * them. A multiplier keyed per signal keeps the discount auditable and in one place.
 *
 *   key                         multiplier  effect on a verified-brand email
 *   ─────────────────────────── ──────────  ─────────────────────────────────────
 *   brand_impersonation_suspected  0.0   suppressed — it came from the real brand
 *   login_or_action_request        0.3   CTA buttons are standard in brand mail
 *   too_many_links_high            0.4   brand newsletters are link-heavy by design
 *   too_many_links_medium          0.4   same
 *   urgency_high                   0.5   real companies do send account/security alerts
 *   urgency_medium                 0.5   same
 *   social_engineering_high        0.5   overlaps with the "account alert" framing above
 *   social_engineering_medium      0.5   same
 *   reply_to_mismatch              0.5   verified brands commonly split send/reply domains
 *
 * Signals intentionally LEFT AT FULL WEIGHT for verified brands (NOT listed here):
 *   - sensitive_data_request — a real brand never asks for your password/OTP/card by
 *     email; this stays a top signal even from a "verified" sender (covers compromised
 *     accounts and any spoofing the domain check can't catch).
 *   - shortened_url_detected — brand-controlled mail rarely needs a bit.ly wrapper.
 *   - ip_address_link, embedded_credentials, punycode_domain, very_long_url,
 *     high_risk_attachment_extension, archive_attachment_extension — payload/transport
 *     signals that are abnormal regardless of who claims to be sending.
 *
 * There is no HTML-heavy / image-ratio rule or generic-greeting rule in this engine,
 * so the task's rows for those have no weight to modify (documented, not invented —
 * adding such a penalty would only create NEW false positives for unverified mail).
 */
export const VERIFIED_BRAND_MODIFIERS = {
    brand_impersonation_suspected: 0,
    login_or_action_request: 0.3,
    too_many_links_high: 0.4,
    too_many_links_medium: 0.4,
    urgency_high: 0.5,
    urgency_medium: 0.5,
    social_engineering_high: 0.5,
    social_engineering_medium: 0.5,
    reply_to_mismatch: 0.5,
};

/*
 * Apply the verified-brand context modifier to a base weight.
 *   - Not a verified-brand email → base points unchanged.
 *   - Verified, signal not in the modifier table → base points unchanged (full weight).
 *   - Verified, signal in the table → rounded, discounted points (0 = suppressed).
 * Base weights are read-only here; this only scales the points a rule contributes.
 */
export const applyVerifiedBrandModifier = (signalKey, basePoints, { senderVerifiedBrand } = {}) => {
    if (!senderVerifiedBrand) {
        return basePoints;
    }

    const multiplier = VERIFIED_BRAND_MODIFIERS[signalKey];

    if (multiplier === undefined) {
        return basePoints;
    }

    return Math.round(basePoints * multiplier);
};

/*
 * ── User sender-list layer (allowlist / blocklist) ─────────────────────────────
 *
 * Unlike every weight above, these encode an EXPLICIT USER DECISION, not a
 * heuristic. That is why the blocklist weight lives outside RULE_WEIGHTS: the
 * invariant "no single signal reaches HIGH_RISK alone" applies to detection
 * heuristics, which can be wrong; a user saying "block this sender" is not a
 * heuristic and is allowed to decide the verdict by itself.
 *
 * Blocklist — hard floor. The rule contributes exactly the likely_phishing
 * threshold, so a blocklisted sender/domain is GUARANTEED that verdict by
 * construction (tying it to RISK_THRESHOLDS keeps the guarantee if thresholds
 * ever move). Real signals still add on top, so the score remains informative.
 *
 * Allowlist — strong discount, NOT a hard "safe". The user trusts the sender,
 * so contextual signals (urgency, link counts, CTAs, reply-to splits) are muted.
 * Payload signals that indicate a compromised or spoofed trusted account keep
 * full weight:
 *   - sensitive_data_request (a trusted sender still never asks for passwords/OTP)
 *   - high_risk_attachment_extension, ip_address_link, embedded_credentials,
 *     punycode_domain — abnormal transport/payload regardless of trust.
 * This is deliberately STRONGER than the verified-brand layer (user intent beats
 * domain reputation) but never weaker than it: the engine takes the minimum
 * multiplier when both apply.
 */
export const USER_BLOCKLIST_RULE_POINTS = RISK_THRESHOLDS.likelyPhishing;

export const USER_ALLOWLIST_MODIFIERS = {
    reply_to_mismatch: 0,
    too_many_links_high: 0,
    too_many_links_medium: 0,
    very_long_url: 0,
    shortened_url_detected: 0,
    archive_attachment_extension: 0.5,
    urgency_high: 0,
    urgency_medium: 0,
    login_or_action_request: 0,
    social_engineering_high: 0.5,
    social_engineering_medium: 0.5,
    brand_impersonation_suspected: 0,
};

/*
 * Combined context modifier: applies the verified-brand and user-allowlist layers
 * together by taking the minimum multiplier (discounts never stack multiplicatively,
 * and a layer can only lower a weight, never raise it).
 */
export const applyScoreContextModifiers = (signalKey, basePoints, context = {}) => {
    let multiplier = 1;

    if (context.senderVerifiedBrand && VERIFIED_BRAND_MODIFIERS[signalKey] !== undefined) {
        multiplier = Math.min(multiplier, VERIFIED_BRAND_MODIFIERS[signalKey]);
    }

    if (context.senderAllowlisted && USER_ALLOWLIST_MODIFIERS[signalKey] !== undefined) {
        multiplier = Math.min(multiplier, USER_ALLOWLIST_MODIFIERS[signalKey]);
    }

    if (multiplier === 1) {
        return basePoints;
    }

    return Math.round(basePoints * multiplier);
};
