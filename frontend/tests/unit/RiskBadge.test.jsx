import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { RiskBadge } from '../../src/components/security/RiskBadge.jsx';

describe('RiskBadge', () => {
  it('renders the readable label for a bucket', () => {
    render(<RiskBadge riskBucket="confirmed_phishing" />);
    expect(screen.getByText('Confirmed phishing')).toBeInTheDocument();
  });

  it('falls back to Unknown for an unrecognised bucket', () => {
    render(<RiskBadge riskBucket="???" />);
    expect(screen.getByText('Unknown')).toBeInTheDocument();
  });
});
