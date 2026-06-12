import { describe, expect, it } from 'vitest';

import {
  DEFAULT_RANGE_DAYS,
  formatRangeLabel,
  fromDateInputValue,
  getDefaultRange,
  toDateInputValue,
  toISOWindow,
} from '../../src/lib/timeRange.js';

// Fixed local "now": Thursday 2026-06-11, 14:30 local time.
const NOW = new Date(2026, 5, 11, 14, 30, 0);

const DAY_MS = 24 * 60 * 60 * 1000;

describe('getDefaultRange', () => {
  it('is the last 30 days ending on today (start-of-local-day boundaries)', () => {
    const { from, to } = getDefaultRange(NOW);
    expect(to).toEqual(new Date(2026, 5, 11)); // start of today
    expect(from).toEqual(new Date(to.getTime() - DEFAULT_RANGE_DAYS * DAY_MS));
    expect(from.getHours()).toBe(0); // both are day boundaries
  });
});

describe('toISOWindow', () => {
  it('is half-open and includes the whole To day (exclusive end +1 day)', () => {
    const range = { from: new Date(2026, 5, 1), to: new Date(2026, 5, 12) };
    const { from, to } = toISOWindow(range);
    expect(from).toBe(new Date(2026, 5, 1).toISOString());
    // Exclusive end is the start of the day AFTER the To day, so June 12 is included.
    expect(to).toBe(new Date(2026, 5, 13).toISOString());
  });

  it('snaps a mid-day From/To to day boundaries', () => {
    const range = { from: new Date(2026, 5, 1, 9, 30), to: new Date(2026, 5, 1, 18, 45) };
    const { from, to } = toISOWindow(range);
    expect(from).toBe(new Date(2026, 5, 1).toISOString());
    expect(to).toBe(new Date(2026, 5, 2).toISOString());
  });
});

describe('formatRangeLabel', () => {
  it('shows the year once when both days share it', () => {
    const label = formatRangeLabel({ from: new Date(2026, 4, 13), to: new Date(2026, 5, 12) });
    expect(label).toBe('May 13 – Jun 12, 2026');
  });

  it('shows both years when they differ', () => {
    const label = formatRangeLabel({ from: new Date(2025, 11, 20), to: new Date(2026, 0, 5) });
    expect(label).toBe('Dec 20, 2025 – Jan 5, 2026');
  });
});

describe('date-input helpers', () => {
  it('formats a Date to a yyyy-MM-dd value (local, zero-padded)', () => {
    expect(toDateInputValue(new Date(2026, 5, 3))).toBe('2026-06-03');
  });

  it('parses a yyyy-MM-dd value back to a local start-of-day Date', () => {
    expect(fromDateInputValue('2026-06-03')).toEqual(new Date(2026, 5, 3));
  });

  it('round-trips a Date through value and back', () => {
    const date = new Date(2026, 0, 9);
    expect(fromDateInputValue(toDateInputValue(date))).toEqual(date);
  });

  it('returns null for an empty or malformed value', () => {
    expect(fromDateInputValue('')).toBeNull();
    expect(fromDateInputValue('not-a-date')).toBeNull();
  });
});
