import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import RiskBadge from '../../src/components/security/RiskBadge.jsx';

describe('RiskBadge', () => {
  it('renders readable risk label', () => {
    render(<RiskBadge riskBucket="confirmed_phishing" />);

    expect(screen.getByText('Confirmed Phishing')).toBeInTheDocument();
  });
});
