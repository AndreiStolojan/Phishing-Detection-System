// ─────────────────────────────────────────────────────────────────────────────
// ai.weights.js — greutățile semnalelor semantice locale.
//
// Numerele sunt mutate fără modificări din scoring.config.js. Detalii:
// docs/EXPLICATIE_BACKEND.md §4.
// ─────────────────────────────────────────────────────────────────────────────

export const AI_WEIGHTS = Object.freeze({
    urgency_high: 8,
    urgency_medium: 4,
    sensitive_data_request: 20,
    login_or_action_request: 8,
    social_engineering_high: 12,
    social_engineering_medium: 6,
    brand_impersonation_suspected: 10,
});
