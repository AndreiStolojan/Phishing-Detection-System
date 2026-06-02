import { describe, expect, it } from 'vitest';

import { formatRiskBucket, formatVerdict } from '../../src/utils/formatRisk.js';

describe('formatRiskBucket', () => {
  it('formats known risk buckets', () => {
    expect(formatRiskBucket('quarantine')).toMatchObject({
      label: 'Quarantine',
      severity: 'error',
    });
    expect(formatRiskBucket('needs_review')).toMatchObject({
      label: 'Needs Review',
      severity: 'warning',
    });
  });

  it('falls back for unknown risk buckets', () => {
    expect(formatRiskBucket('something_else')).toMatchObject({
      label: 'Unknown',
      severity: 'default',
    });
  });
});

describe('formatVerdict', () => {
  it('converts technical verdicts to readable labels', () => {
    expect(formatVerdict('likely_phishing')).toBe('Likely Phishing');
    expect(formatVerdict(null)).toBe('No verdict');
  });
});
