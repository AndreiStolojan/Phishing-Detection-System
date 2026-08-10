// ─────────────────────────────────────────────────────────────────────────────
// scoreScale.js — the continuous 0–100 colour ramp shared by the dashboard
// gauge and the inbox risk score.
//
// Why this exists alongside risk.js: risk.js maps a CATEGORY (safe /
// needs_review / quarantine / …) to a colour, and that stays the single source
// of truth for badges, charts and filters. But a *number* wants a continuous
// ramp — 68 and 71 should not look identical just because they land in the same
// bucket. This file owns that ramp and nothing else, so risk.js is untouched.
//
// Direction matters, and the two screens run OPPOSITE ways:
//   - dashboard "safe rate": 100 is GOOD  -> getHealthColor(100) = green
//   - inbox "risk score":    100 is BAD   -> getRiskColor(100)   = red
// getRiskColor is literally getHealthColor(100 - score), so a single ramp keeps
// "green = good, red = bad" true on both screens.
// ─────────────────────────────────────────────────────────────────────────────

// The ramp, healthiest first. Deliberately 7 stops rather than 3: the middle of
// the range is where a user actually has to make a judgement call, so amber and
// orange get their own steps instead of being a single wide "warning" band.
const STOPS = [
  { at: 100, hex: '#4ade80' }, // deep green  — nothing to do
  { at: 85, hex: '#86d96a' }, // green
  { at: 70, hex: '#b8cf55' }, // lime        — still healthy, but drifting
  { at: 55, hex: '#e0b750' }, // amber       — worth a look
  { at: 40, hex: '#e8964a' }, // orange
  { at: 25, hex: '#e5704f' }, // red-orange
  { at: 0, hex: '#dc5555' }, // red         — act now
];

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

const toRgb = (hex) => [
  parseInt(hex.slice(1, 3), 16),
  parseInt(hex.slice(3, 5), 16),
  parseInt(hex.slice(5, 7), 16),
];

const toHex = (rgb) =>
  `#${rgb.map((c) => clamp(Math.round(c), 0, 255).toString(16).padStart(2, '0')).join('')}`;

/**
 * Colour for a 0–100 "health" value where 100 is best.
 * Blends linearly between the two neighbouring stops, so the ramp is smooth
 * rather than stepped — a score sliding from 71 to 69 shifts colour gradually.
 */
export function getHealthColor(value) {
  const v = Number.isFinite(value) ? clamp(value, 0, 100) : 0;

  // STOPS runs high -> low, so the first stop we are at-or-above is the upper
  // bound of the segment we sit in.
  for (let i = 0; i < STOPS.length - 1; i += 1) {
    const hi = STOPS[i];
    const lo = STOPS[i + 1];
    if (v <= hi.at && v >= lo.at) {
      const span = hi.at - lo.at;
      const t = span === 0 ? 0 : (v - lo.at) / span; // 0 at lo, 1 at hi
      const a = toRgb(lo.hex);
      const b = toRgb(hi.hex);
      return toHex([0, 1, 2].map((c) => a[c] + (b[c] - a[c]) * t));
    }
  }
  return STOPS[STOPS.length - 1].hex;
}

/**
 * Colour for a 0–100 RISK score where 100 is worst. Mirrors the health ramp so
 * both screens obey "green = good, red = bad".
 *
 * CAREFUL: an unscanned message has score `null`, and "no risk recorded" is not
 * the same claim as "this is safe" — painting it green would tell the user
 * something we have not actually checked. Callers must test `isScored()` first
 * and fall back to UNSCORED_COLOR.
 */
export const getRiskColor = (score) =>
  getHealthColor(100 - (Number.isFinite(score) ? clamp(score, 0, 100) : 0));

/** True only when a real numeric score exists to colour. */
export const isScored = (score) => Number.isFinite(score);

/** Neutral grey for unscanned/unknown — never a ramp colour. */
export const UNSCORED_COLOR = 'var(--color-risk-unscanned)';

// ── Contrast ────────────────────────────────────────────────────────────────
// The ramp colours are used as large tinted NUMERALS on the charcoal canvas,
// so they have to stay legible rather than just look nice. These helpers keep
// that guarantee in code instead of in a comment that can rot.

// Must track --color-background in index.css. It is duplicated here because
// ensureReadable() runs during render and cannot read a CSS custom property.
const BACKGROUND = '#121319'; // --color-background

const relativeLuminance = (hex) => {
  const [r, g, b] = toRgb(hex).map((c) => {
    const s = c / 255;
    return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};

export const contrastRatio = (fg, bg = BACKGROUND) => {
  const a = relativeLuminance(fg);
  const b = relativeLuminance(bg);
  const [hi, lo] = a > b ? [a, b] : [b, a];
  return (hi + 0.05) / (lo + 0.05);
};

/**
 * Nudges a colour toward white until it clears `min` contrast on the page
 * background. Every stop in the ramp already passes 4.5:1 today, so this is a
 * guard, not a transform — it only bites if someone retunes a stop darker.
 */
export function ensureReadable(hex, min = 4.5, bg = BACKGROUND) {
  let out = hex;
  for (let step = 0; step < 20 && contrastRatio(out, bg) < min; step += 1) {
    const rgb = toRgb(out).map((c) => c + (255 - c) * 0.08);
    out = toHex(rgb);
  }
  return out;
}

/** Health ramp colour, guaranteed readable as text/numerals on the canvas. */
export const getHealthTextColor = (value) => ensureReadable(getHealthColor(value));

/** Risk ramp colour, guaranteed readable as text/numerals on the canvas. */
export const getRiskTextColor = (score) => ensureReadable(getRiskColor(score));

/**
 * A short, plain-language reading of a safe rate. Used so the dashboard states
 * a conclusion ("Your inbox is healthy") rather than leaving the user to
 * interpret a bare percentage.
 */
export function getPostureLabel(safeRate) {
  const v = Number.isFinite(safeRate) ? clamp(safeRate, 0, 100) : 0;
  if (v >= 95) return 'Your inbox is clean';
  if (v >= 85) return 'Your inbox is healthy';
  if (v >= 70) return 'A few messages need attention';
  if (v >= 50) return 'Several messages need attention';
  return 'Your inbox needs attention now';
}

export const SCORE_STOPS = STOPS;
