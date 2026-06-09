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
