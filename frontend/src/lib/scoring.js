/*
 * Frontend mirror of backend/src/config/scoring.config.js.
 *
 * Vite cannot import the backend ESM config across the two packages, so the maxima
 * the UI needs for proportional score bars are duplicated here. Keep these values in
 * sync with the backend config — they are the denominators for every score bar/ring.
 */

// Top of the score scale; the final score is clamped to this on the backend.
export const SCORE_MAX = 100;

// Hard cap on the AI sub-score (kept below the likely_phishing threshold).
// The "AI" bar must fill against this, not SCORE_MAX, or a maxed-out AI score
// (50) would only ever render as a half-full bar.
export const AI_SCORE_MAX = 50;

// The rule sub-score shares the 0–100 scale, so its bar is drawn against SCORE_MAX.
export const RULE_SCORE_MAX = SCORE_MAX;

/*
 * Derive the AI availability state for a scan from its persisted meta, so the UI can
 * show one specific, user-friendly message per failure mode instead of a generic note.
 * Returns { state, message }. message is null when AI ran successfully.
 */
const AI_MESSAGES = {
  disabled: 'AI analysis is turned off. Showing the rule-based score only.',
  unavailable: 'AI analysis is unavailable right now. Showing the rule-based score.',
  timeout: 'AI analysis timed out. Showing the rule-based score — results may be incomplete.',
  error: "AI analysis couldn't be completed. Showing the rule-based score.",
};

export function getAiStatus(scan) {
  if (!scan) return { state: 'ok', message: null };

  const meta = scan.aiExplanationMeta || {};
  const signals = scan.aiSignals || {};

  // Success: the model generated an explanation and the semantic pass did not fail.
  if (meta.status === 'generated' && signals.status !== 'failed') {
    return { state: 'ok', message: null };
  }

  // Pull the reason from the richest source available (explanation meta, then signals).
  const reason = String(
    meta.fallbackReason || signals.disabledReason || signals.error || ''
  ).toLowerCase();

  if (reason.includes('ai_disabled') || reason.includes('disabled') || signals.status === 'disabled') {
    return { state: 'disabled', message: AI_MESSAGES.disabled };
  }
  if (reason.includes('timeout')) {
    return { state: 'timeout', message: AI_MESSAGES.timeout };
  }
  if (reason.includes('unreachable')) {
    return { state: 'unavailable', message: AI_MESSAGES.unavailable };
  }
  if (
    reason.includes('invalid') ||
    reason.includes('http') ||
    reason.includes('failed') ||
    signals.status === 'failed' ||
    (meta.status && meta.status !== 'generated')
  ) {
    return { state: 'error', message: AI_MESSAGES.error };
  }

  return { state: 'ok', message: null };
}
