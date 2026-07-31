// ─────────────────────────────────────────────────────────────────────────────
// attachment.weights.js — greutățile semnalelor despre atașamente.
//
// Numerele sunt mutate fără modificări din scoring.config.js. Detalii:
// docs/EXPLICATIE_BACKEND.md §4.
// ─────────────────────────────────────────────────────────────────────────────

export const ATTACHMENT_RULE_WEIGHTS = Object.freeze({
    high_risk_attachment_extension: 35,
    archive_attachment_extension: 12,
});
