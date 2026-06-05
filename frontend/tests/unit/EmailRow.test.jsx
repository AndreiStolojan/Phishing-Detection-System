import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';

import { EmailRow } from '../../src/components/inbox/EmailRow.jsx';

const email = {
  _id: 'email-1',
  from: { name: 'Security Team', address: 'security@example.com' },
  subject: 'Account warning',
  snippet: 'Review this message before clicking links.',
  receivedAt: '2026-06-01T10:00:00.000Z',
  riskBucket: 'needs_review',
  reviewStatus: 'pending_review',
};

const renderRow = (props) =>
  render(
    <MemoryRouter>
      <EmailRow email={email} {...props} />
    </MemoryRouter>
  );

describe('EmailRow', () => {
  it('renders sender, subject and risk badge', () => {
    renderRow();
    expect(screen.getByText('Security Team')).toBeInTheDocument();
    expect(screen.getByText('Account warning')).toBeInTheDocument();
    expect(screen.getByText('Suspicious')).toBeInTheDocument();
  });

  it('links to the email detail page', () => {
    renderRow();
    expect(screen.getByRole('link')).toHaveAttribute('href', '/inbox/email-1');
  });
});
