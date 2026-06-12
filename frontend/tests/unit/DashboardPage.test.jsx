import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

// Connected account so the dashboard renders its full body (not the connect prompt).
vi.mock('../../src/context/MailAccountContext.jsx', () => ({
  useMailAccount: () => ({
    account: { lastSyncedAt: null },
    isConnected: true,
    syncVersion: 0,
  }),
}));

vi.mock('../../src/api/emailsApi.js', () => ({
  getEmailStats: vi.fn(() => Promise.resolve({ counts: {}, total: 0 })),
  getEmails: vi.fn(() => Promise.resolve({ items: [], pagination: { totalPages: 0 } })),
  getEmailTrend: vi.fn(() => Promise.resolve([])),
  getTopRiskySenders: vi.fn(() => Promise.resolve([])),
}));

vi.mock('../../src/api/reportsApi.js', () => ({
  getReportSummary: vi.fn(() => Promise.resolve({ topTriggeredRules: [] })),
  sendReportSummary: vi.fn(() => Promise.resolve({ sent: false })),
}));

import { TimeRangeProvider } from '../../src/context/TimeRangeContext.jsx';
import { DashboardPage } from '../../src/pages/DashboardPage.jsx';

// Guards against a render-time crash in the dashboard (e.g. a dropped hook
// destructure) — the kind that compiles and passes other unit tests but blanks
// the page at runtime.
describe('DashboardPage', () => {
  it('renders the loaded dashboard without crashing', async () => {
    render(
      <MemoryRouter>
        <TimeRangeProvider>
          <DashboardPage />
        </TimeRangeProvider>
      </MemoryRouter>
    );
    expect(await screen.findByText(/Security overview/)).toBeTruthy();
  });
});
