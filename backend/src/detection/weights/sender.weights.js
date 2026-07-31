// ─────────────────────────────────────────────────────────────────────────────
// sender.weights.js — greutățile semnalelor despre expeditor.
//
// Blocklist-ul rămâne excepția legată direct de prag în scoring.config.js.
// Detalii: docs/EXPLICATIE_BACKEND.md §4.
// ─────────────────────────────────────────────────────────────────────────────

export const SENDER_RULE_WEIGHTS = Object.freeze({
    reply_to_mismatch: 18,
});
