import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import EmailListItem from '../../src/components/inbox/EmailListItem.jsx';

const email = {
  _id: 'email-1',
  displayName: 'Security Team',
  from: 'security@example.com',
  subject: 'Account warning',
  snippet: 'Review this message before clicking links.',
  receivedAt: '2026-06-01T10:00:00.000Z',
  riskBucket: 'needs_review',
  latestScan: { score: 42 },
};

describe('EmailListItem', () => {
  it('renders email preview and calls select handler', async () => {
    const onSelect = vi.fn();
    render(<EmailListItem email={email} selected={false} onSelect={onSelect} />);

    expect(screen.getByText('Security Team')).toBeInTheDocument();
    expect(screen.getByText('Account warning')).toBeInTheDocument();
    expect(screen.getByText('Needs Review')).toBeInTheDocument();

    await userEvent.click(screen.getByText('Account warning'));

    expect(onSelect).toHaveBeenCalledWith(email);
  });
});
