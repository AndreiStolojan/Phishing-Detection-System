import { describe, expect, it } from 'vitest';

import {
  SCORE_STOPS,
  contrastRatio,
  ensureReadable,
  getHealthColor,
  getPostureLabel,
  getRiskColor,
  isScored,
} from '../../src/lib/scoreScale.js';

// The whole point of this module is that the dashboard and the inbox read their
// numbers in OPPOSITE directions but still agree that green means good. These
// tests pin that down, because getting it backwards would tell a user a
// phishing message is safe.

describe('getHealthColor — 100 is good', () => {
  it('is green at the top and red at the bottom', () => {
    expect(getHealthColor(100)).toBe('#4ade80');
    expect(getHealthColor(0)).toBe('#dc5555');
  });

  it('lands on every declared stop exactly', () => {
    for (const stop of SCORE_STOPS) {
      expect(getHealthColor(stop.at)).toBe(stop.hex);
    }
  });

  it('interpolates between stops instead of stepping', () => {
    // 92.5 sits midway between the 85 and 100 stops, so it must be neither.
    const mid = getHealthColor(92.5);
    expect(mid).not.toBe(getHealthColor(85));
    expect(mid).not.toBe(getHealthColor(100));
  });

  it('gets redder, never greener, as the value falls', () => {
    const redness = (hex) => parseInt(hex.slice(1, 3), 16) - parseInt(hex.slice(3, 5), 16);
    let previous = -Infinity;
    for (const value of [100, 85, 70, 55, 40, 25, 0]) {
      const current = redness(getHealthColor(value));
      expect(current).toBeGreaterThan(previous);
      previous = current;
    }
  });

  it('clamps out-of-range and non-numeric input', () => {
    expect(getHealthColor(140)).toBe(getHealthColor(100));
    expect(getHealthColor(-20)).toBe(getHealthColor(0));
    expect(getHealthColor(NaN)).toBe(getHealthColor(0));
    expect(getHealthColor(undefined)).toBe(getHealthColor(0));
  });
});

describe('getRiskColor — 100 is bad, mirroring health', () => {
  it('is red at the top and green at the bottom', () => {
    expect(getRiskColor(100)).toBe('#dc5555');
    expect(getRiskColor(0)).toBe('#4ade80');
  });

  it('is exactly the health ramp inverted', () => {
    for (const score of [0, 13, 25, 40, 55, 70, 87, 100]) {
      expect(getRiskColor(score)).toBe(getHealthColor(100 - score));
    }
  });
});

describe('unscanned messages', () => {
  // A null score means "we never checked", which is not a safety claim. If a
  // caller forgets isScored(), getRiskColor(null) would render green — so the
  // guard has to exist and has to be the thing callers reach for.
  it('are not treated as scored', () => {
    expect(isScored(null)).toBe(false);
    expect(isScored(undefined)).toBe(false);
    expect(isScored(NaN)).toBe(false);
    expect(isScored(0)).toBe(true);
  });
});

describe('contrast', () => {
  it('keeps every ramp stop readable on the near-black canvas', () => {
    for (const stop of SCORE_STOPS) {
      expect(contrastRatio(stop.hex)).toBeGreaterThanOrEqual(4.5);
    }
  });

  it('leaves already-readable colours untouched', () => {
    expect(ensureReadable('#4ade80')).toBe('#4ade80');
  });

  it('lightens a colour that would fail', () => {
    const fixed = ensureReadable('#101018');
    expect(contrastRatio(fixed)).toBeGreaterThanOrEqual(4.5);
  });
});

describe('getPostureLabel', () => {
  it('states a conclusion rather than a number', () => {
    expect(getPostureLabel(98)).toBe('Your inbox is clean');
    expect(getPostureLabel(88)).toBe('Your inbox is healthy');
    expect(getPostureLabel(30)).toBe('Your inbox needs attention now');
  });

  it('never returns an empty string, whatever it is given', () => {
    for (const value of [0, 50, 100, NaN, undefined, null, -5, 300]) {
      expect(getPostureLabel(value)).toBeTruthy();
    }
  });
});
