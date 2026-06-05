import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search, Inbox as InboxIcon, ShieldCheck } from 'lucide-react';

import { InboxSkeleton, ErrorState, EmptyState } from '@/components/common/states';
import { Pagination } from '@/components/common/Pagination';
import { EmailRow } from '@/components/inbox/EmailRow';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { useApi } from '@/hooks/useApi';
import { useDebounce } from '@/hooks/useDebounce';
import { useMailAccount } from '@/context/MailAccountContext';
import { getEmails } from '@/api/emailsApi';
import { getMonthlySummary } from '@/api/reportsApi';
import { normalizeEmailList } from '@/lib/email-list';
import { emailId } from '@/lib/email';
import { RISK_FILTERS } from '@/lib/risk';
import { getDateGroupLabel } from '@/utils/formatDate';
import { cn } from '@/lib/utils';

const PAGE_SIZE = 10;

const DATE_GROUP_ORDER = ['Today', 'Yesterday', 'This week', 'Older'];

function groupByDate(emails) {
  const groups = {};
  for (const email of emails) {
    const label = getDateGroupLabel(email.receivedAt);
    if (!groups[label]) groups[label] = [];
    groups[label].push(email);
  }
  return DATE_GROUP_ORDER
    .filter((g) => groups[g]?.length > 0)
    .map((g) => ({ label: g, emails: groups[g] }));
}

const FILTER_COUNT_MAP = {
  '': 'syncedEmails',
  quarantine: 'quarantined',
  needs_review: 'suspicious',
  confirmed_phishing: 'markedPhishing',
  safe: 'safe',
};

export function InboxPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { isConnected, syncVersion } = useMailAccount();

  const riskBucket = searchParams.get('riskBucket') || '';
  const rawSearch = searchParams.get('q') || '';
  const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));

  // Local input state — API fires only after debounce settles
  const [searchInput, setSearchInput] = useState(rawSearch);
  const debouncedSearch = useDebounce(searchInput, 300);

  const cacheKey = `inbox-${syncVersion}-${riskBucket}-${debouncedSearch}-${page}`;
  const { data, loading, error, reload } = useApi(
    () =>
      getEmails({
        ...(riskBucket ? { riskBucket } : {}),
        ...(debouncedSearch ? { q: debouncedSearch } : {}),
        page,
        limit: PAGE_SIZE,
      }),
    [riskBucket, debouncedSearch, page, syncVersion],
    cacheKey
  );

  const countsQuery = useApi(
    () => getMonthlySummary(),
    [syncVersion],
    `inbox-counts-${syncVersion}`
  );
  const counts = countsQuery.data?.counts || {};

  const emails = normalizeEmailList(data);
  const totalPages = data?.pagination?.totalPages ?? (emails.length > 0 ? 1 : 0);

  const emailIds = emails.map(emailId);
  const groups = groupByDate(emails);

  const setParam = (updates) => {
    const next = new URLSearchParams(searchParams);
    Object.entries(updates).forEach(([k, v]) => {
      if (v) next.set(k, v);
      else next.delete(k);
    });
    setSearchParams(next, { replace: true });
  };

  const setFilter = (key) => setParam({ riskBucket: key, page: '' });
  const setPage = (p) => setParam({ page: String(p) });

  const handleSearchChange = (e) => {
    setSearchInput(e.target.value);
    // Reset page immediately when user types
    setParam({ q: e.target.value, page: '' });
  };

  return (
    <>
      {/* Filter chips + search */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          {RISK_FILTERS.map((filter) => {
            const countKey = FILTER_COUNT_MAP[filter.key];
            const count = countKey != null ? (counts[countKey] ?? null) : null;
            return (
              <button
                key={filter.key || 'all'}
                onClick={() => setFilter(filter.key)}
                className={cn(
                  'rounded-full border px-3 py-1.5 text-xs font-medium transition-colors',
                  riskBucket === filter.key
                    ? 'border-primary bg-primary/15 text-primary'
                    : 'border-border text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                )}
              >
                {filter.label}
                {count != null && count > 0 && (
                  <span className="ml-1.5 opacity-70">({count})</span>
                )}
              </button>
            );
          })}
        </div>
        <div className="relative w-full sm:w-64">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={searchInput}
            onChange={handleSearchChange}
            placeholder="Search by sender or subject…"
            className="pl-9"
          />
        </div>
      </div>

      {/* List */}
      {!isConnected ? (
        <EmptyState
          icon={InboxIcon}
          title="No Gmail connected"
          description="Connect your Gmail account in Settings to start syncing messages."
        />
      ) : loading ? (
        <InboxSkeleton />
      ) : error ? (
        <ErrorState message={error} onRetry={reload} />
      ) : emails.length === 0 ? (
        <EmptyState
          icon={ShieldCheck}
          title={debouncedSearch ? 'No matching messages' : 'No messages here'}
          description={
            debouncedSearch
              ? 'Try a different search term.'
              : 'Nothing matches this filter yet. Try syncing your inbox.'
          }
        />
      ) : (
        <Card className="overflow-hidden">
          {groups.map(({ label, emails: groupEmails }) => (
            <div key={label}>
              <div className="sticky top-0 z-10 border-b border-border/60 bg-card/95 px-4 py-1.5 backdrop-blur">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  {label}
                </p>
              </div>
              <div className="divide-y divide-border/60">
                {groupEmails.map((email) => (
                  <EmailRow
                    key={email.id || email._id}
                    email={email}
                    linkState={{ ids: emailIds }}
                  />
                ))}
              </div>
            </div>
          ))}
          <Pagination page={page} totalPages={totalPages} onPage={setPage} />
        </Card>
      )}
    </>
  );
}
