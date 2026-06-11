import { describe, expect, it } from 'vitest';

import {
  DEFAULT_TIME_RANGE_PRESET,
  TIME_RANGE_PRESETS,
  computeRange,
  getPresetLabel,
} from '../../src/lib/timeRange.js';

// Fixed local "now": Thursday 2026-06-11, 14:30 local time.
const NOW = new Date(2026, 5, 11, 14, 30, 0);

const DAY_MS = 24 * 60 * 60 * 1000;

describe('computeRange', () => {
  it('last_day is the rolling 24 hours ending now', () => {
    const { from, to } = computeRange('last_day', NOW);
    expect(to).toEqual(NOW);
    expect(to.getTime() - from.getTime()).toBe(DAY_MS);
  });

  it('yesterday is the previous full local calendar day', () => {
    const { from, to } = computeRange('yesterday', NOW);
    expect(from).toEqual(new Date(2026, 5, 10, 0, 0, 0));
    expect(to).toEqual(new Date(2026, 5, 11, 0, 0, 0));
  });

  it('last_30_days and last_90_days are rolling windows ending now', () => {
    const thirty = computeRange('last_30_days', NOW);
    expect(thirty.to).toEqual(NOW);
    expect(thirty.to.getTime() - thirty.from.getTime()).toBe(30 * DAY_MS);

    const ninety = computeRange('last_90_days', NOW);
    expect(ninety.to.getTime() - ninety.from.getTime()).toBe(90 * DAY_MS);
  });

  it('last_month is the previous full calendar month', () => {
    const { from, to } = computeRange('last_month', NOW);
    expect(from).toEqual(new Date(2026, 4, 1)); // May 1
    expect(to).toEqual(new Date(2026, 5, 1)); // June 1
  });

  it('last_month works across a year boundary', () => {
    const january = new Date(2026, 0, 15, 9, 0, 0);
    const { from, to } = computeRange('last_month', january);
    expect(from).toEqual(new Date(2025, 11, 1)); // Dec 1 previous year
    expect(to).toEqual(new Date(2026, 0, 1));
  });

  it('falls back to last 30 days for an unknown preset', () => {
    const { from, to } = computeRange('nonsense', NOW);
    expect(to.getTime() - from.getTime()).toBe(30 * DAY_MS);
  });

  it('always returns from strictly before to', () => {
    for (const { key } of TIME_RANGE_PRESETS) {
      const { from, to } = computeRange(key, NOW);
      expect(from.getTime()).toBeLessThan(to.getTime());
    }
  });
});

describe('presets', () => {
  it('default preset exists and has a label', () => {
    expect(TIME_RANGE_PRESETS.some((p) => p.key === DEFAULT_TIME_RANGE_PRESET)).toBe(true);
    expect(getPresetLabel(DEFAULT_TIME_RANGE_PRESET)).toBe('Last 30 days');
  });
});
