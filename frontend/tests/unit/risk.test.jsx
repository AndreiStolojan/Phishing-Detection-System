import { describe, expect, it } from 'vitest';

import {
  CATEGORY_COLORS,
  CATEGORY_LABELS,
  getRiskMeta,
  getVerdictMeta,
  humanize,
} from '../../src/lib/risk.js';

describe('getRiskMeta', () => {
  it('maps known risk buckets to labels', () => {
    expect(getRiskMeta('quarantine').label).toBe('Likely phishing');
    expect(getRiskMeta('needs_review').label).toBe('Suspicious');
    expect(getRiskMeta('confirmed_phishing').label).toBe('Confirmed phishing');
  });

  it('falls back for unknown buckets', () => {
    expect(getRiskMeta('nonsense').label).toBe('Unknown');
  });

  it('exposes a tone with an icon component', () => {
    expect(getRiskMeta('safe').tone.icon).toBeTypeOf('object');
  });
});

describe('getVerdictMeta', () => {
  it('maps verdicts to labels', () => {
    expect(getVerdictMeta('likely_phishing').label).toBe('Likely phishing');
    expect(getVerdictMeta(null).label).toBe('No verdict');
  });
});

describe('CATEGORY_COLORS', () => {
  const categories = ['safe', 'suspicious', 'likely_phishing', 'confirmed_phishing'];

  it('defines a colour for every phishing data category', () => {
    for (const category of categories) {
      expect(CATEGORY_COLORS[category]).toMatch(/^var\(--color-risk-/);
      expect(CATEGORY_LABELS[category]).toBeTypeOf('string');
    }
  });

  it('gives each category a visually distinct colour (no shared shades)', () => {
    const values = categories.map((c) => CATEGORY_COLORS[c]);
    expect(new Set(values).size).toBe(values.length);
  });
});

describe('humanize', () => {
  it('turns snake_case into title case', () => {
    expect(humanize('needs_review')).toBe('Needs Review');
    expect(humanize('')).toBe('');
  });
});
