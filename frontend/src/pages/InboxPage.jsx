import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Search, Inbox as InboxIcon, ShieldCheck, X, Loader2 } from 'lucide-react';

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
import { RISK_FILTERS, getRiskMeta } from '@/lib/risk';
import { getDateGroupLabel } from '@/utils/formatDate';
import { springSoft } from '@/lib/motion';
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

// Tone used to colour an active filter chip; null filter ("All") uses the brand.
const filterHex = (key) => (key ? getRiskMeta(key).tone.hex : 'var(--color-primary)');
const filterTextClass = (key) => (key ? getRiskMeta(key).tone.text : 'text-primary');

export function InboxPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { isConnected, syncVersion } = useMailAccount();
  const searchRef = useRef(null);

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
  // Counts come from the monthly summary, which can disagree with a search-scoped
  // list — so only surface them when no search is active.
  const showCounts = !debouncedSearch;

  const emails = normalizeEmailList(data);
  const totalPages = data?.pagination?.totalPages ?? (emails.length > 0 ? 1 : 0);

  const emailIds = emails.map(emailId);
  const indexById = new Map(emailIds.map((id, i) => [id, i]));
  const groups = groupByDate(emails);

  const searching = loading || searchInput !== debouncedSearch;

  // "/" focuses the search box (unless already typing in a field)
  useEffect(() => {
    const onKey = (e) => {
      if (e.key !== '/') return;
      const tag = document.activeElement?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      e.preventDefault();
      searchRef.current?.focus();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

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
    setParam({ q: e.target.value, page: '' });
  };

  const clearSearch = () => {
    setSearchInput('');
    setParam({ q: '', page: '' });
    searchRef.current?.focus();
  };

  return (
    <>
      {/* Filter chips + search */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-1">
          {RISK_FILTERS.map((filter) => {
            const isActive = riskBucket === filter.key;
            const countKey = FILTER_COUNT_MAP[filter.key];
            const count = showCounts && countKey != null ? (counts[countKey] ?? null) : null;
            const hex = filterHex(filter.key);
            return (
              <button
                key={filter.key || 'all'}
                onClick={() => setFilter(filter.key)}
                className={cn(
                  'relative rounded-full px-3 py-1.5 text-xs font-medium transition-colors',
                  isActive ? filterTextClass(filter.key) : 'text-muted-foreground hover:text-foreground'
                )}
              >
                {isActive && (
                  <motion.span
                    layoutId="filter-pill"
                    transition={springSoft}
                    className="absolute inset-0 rounded-full"
                    style={{
                      backgroundColor: `color-mix(in oklab, ${hex} 16%, transparent)`,
                      boxShadow: `inset 0 0 0 1px color-mix(in oklab, ${hex} 38%, transparent)`,
                    }}
                  />
                )}
                <span className="relative">
                  {filter.label}
                  {count != null && count > 0 && (
                    <span className="ml-1.5 opacity-70">({count})</span>
                  )}
                </span>
              </button>
            );
          })}
        </div>
        <div className="relative w-full sm:w-72">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            ref={searchRef}
            value={searchInput}
            onChange={handleSearchChange}
            placeholder="Search sender or subject…  (press /)"
            className="pl-9 pr-9"
          />
          {searchInput && (
            <div className="absolute right-2.5 top-1/2 -translate-y-1/2">
              {searching ? (
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              ) : (
                <button
                  onClick={clearSearch}
                  aria-label="Clear search"
                  className="flex h-5 w-5 items-center justify-center rounded text-muted-foreground transition-colors hover:text-foreground"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          )}
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
              <div className="border-b border-border/60 bg-card/40 px-4 py-2">
                <p className="label-overline">{label}</p>
              </div>
              <div className="divide-y divide-border/60">
                {groupEmails.map((email) => (
                  <EmailRow
                    key={email.id || email._id}
                    email={email}
                    index={indexById.get(emailId(email)) ?? 0}
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
