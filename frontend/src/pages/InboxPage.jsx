import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Search,
  Inbox as InboxIcon,
  ShieldCheck,
  ShieldX,
  X,
  Loader2,
  CheckSquare,
  RefreshCw,
  Mail,
} from 'lucide-react';
import { toast } from 'sonner';

import { InboxSkeleton, ErrorState, EmptyState } from '@/components/common/states';
import { PageHeader } from '@/components/common/PageHeader';
import { Pagination } from '@/components/common/Pagination';
import { EmailRow } from '@/components/inbox/EmailRow';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useApi } from '@/hooks/useApi';
import { useDebounce } from '@/hooks/useDebounce';
import { useMailAccount } from '@/context/MailAccountContext';
import { useTimeRange } from '@/context/TimeRangeContext';
import { getEmails, getEmailStats } from '@/api/emailsApi';
import { markEmailSafe, markEmailPhishing } from '@/api/actionsApi';
import { bustCacheByPrefix } from '@/hooks/useApi';
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
  '': '__total__',
  quarantine: 'quarantine',
  needs_review: 'needs_review',
  confirmed_phishing: 'confirmed_phishing',
  safe: 'safe',
};

// Tone used to colour an active filter chip; null filter ("All") uses the brand.
const filterHex = (key) => (key ? getRiskMeta(key).tone.hex : 'var(--color-primary)');
const filterTextClass = (key) => (key ? getRiskMeta(key).tone.text : 'text-foreground');

export function InboxPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { isConnected, syncVersion, sync, syncing } = useMailAccount();
  // Global time-range filter — the picker lives on the dashboard; the inbox
  // list and its chip counts are both scoped to the same window.
  const { from, to } = useTimeRange();
  const searchRef = useRef(null);

  const riskBucket = searchParams.get('riskBucket') || '';
  const rawSearch = searchParams.get('q') || '';
  const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));

  // Local input state — API fires only after debounce settles
  const [searchInput, setSearchInput] = useState(rawSearch);
  const debouncedSearch = useDebounce(searchInput, 300);

  // Bulk select state
  const [selectMode, setSelectMode] = useState(false);
  const [selected, setSelected] = useState(new Set());
  const [bulkBusy, setBulkBusy] = useState(false);

  const cacheKey = `inbox-${from}-${to}-${syncVersion}-${riskBucket}-${debouncedSearch}-${page}`;
  const { data, loading, error, reload } = useApi(
    () =>
      getEmails({
        ...(riskBucket ? { riskBucket } : {}),
        ...(debouncedSearch ? { q: debouncedSearch } : {}),
        from,
        to,
        page,
        limit: PAGE_SIZE,
      }),
    [riskBucket, debouncedSearch, page, syncVersion, from, to],
    cacheKey
  );

  const countsQuery = useApi(
    () => getEmailStats({ from, to }),
    [syncVersion, from, to],
    `inbox-stats-${from}-${to}-${syncVersion}`
  );
  const counts = countsQuery.data?.counts || {};
  const totalCount = countsQuery.data?.total ?? 0;
  // Counts are per current risk bucket (same source as the list). They can't
  // reflect a free-text search, so only surface them when no search is active —
  // and never before a Gmail account is connected (no data to reveal).
  const showCounts = isConnected && !debouncedSearch;

  const emails = normalizeEmailList(data);
  const totalPages = data?.pagination?.totalPages ?? (emails.length > 0 ? 1 : 0);

  const emailIds = emails.map(emailId);
  const groups = groupByDate(emails);

  const searching = loading || searchInput !== debouncedSearch;

  // Exit select mode when list changes (page/filter change)
  useEffect(() => {
    setSelectMode(false);
    setSelected(new Set());
  }, [riskBucket, debouncedSearch, page, syncVersion]);

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

  // Select mode helpers
  const enterSelectMode = () => {
    setSelectMode(true);
    setSelected(new Set());
  };

  const exitSelectMode = () => {
    setSelectMode(false);
    setSelected(new Set());
  };

  const toggleSelect = (id) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const allSelected = emails.length > 0 && emails.every((e) => selected.has(emailId(e)));

  const toggleSelectAll = () => {
    if (allSelected) {
      setSelected(new Set());
    } else {
      setSelected(new Set(emails.map(emailId)));
    }
  };

  const handleBulkSafe = async () => {
    if (selected.size === 0) return;
    setBulkBusy(true);
    try {
      await Promise.all([...selected].map((id) => markEmailSafe(id)));
      toast.success(`${selected.size} email${selected.size > 1 ? 's' : ''} marked as safe`);
      exitSelectMode();
      reload();
      bustCacheByPrefix('inbox-', 'dash-', 'risky-');
    } catch (err) {
      toast.error(err.message || 'Bulk action failed');
    } finally {
      setBulkBusy(false);
    }
  };

  const handleBulkPhishing = async () => {
    if (selected.size === 0) return;
    setBulkBusy(true);
    try {
      await Promise.all([...selected].map((id) => markEmailPhishing(id)));
      toast.success(`${selected.size} email${selected.size > 1 ? 's' : ''} marked as phishing`);
      exitSelectMode();
      reload();
      bustCacheByPrefix('inbox-', 'dash-', 'risky-');
    } catch (err) {
      toast.error(err.message || 'Bulk action failed');
    } finally {
      setBulkBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      <PageHeader
        title="Scaned Emails"
        className="mb-8"
        titleClassName="text-[1.625rem] font-semibold tracking-tight"
      />

      {/* Search (left, above filters) + select/refresh actions (right) */}
      <div className="sticky top-0 z-20 flex flex-col gap-6 bg-background py-2 md:top-0">
        {/* Top row: search on the left, action buttons on the right */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          {!selectMode ? (
            <div className="relative w-full sm:w-96">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                ref={searchRef}
                value={searchInput}
                onChange={handleSearchChange}
                placeholder="Search sender or subject…  (press /)"
                className="rounded-lg bg-card surface-raised pl-9 pr-9 focus-visible:!border-[#4485fd]"
                style={{ borderColor: '#1e2a45' }}
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
          ) : (
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={allSelected}
                onChange={toggleSelectAll}
                className="h-4 w-4 rounded border-border accent-primary"
                aria-label="Select all"
              />
              <span className="text-xs text-muted-foreground">
                {selected.size > 0 ? `${selected.size} selected` : 'Select all'}
              </span>
            </div>
          )}

          <div className="flex items-center gap-2 sm:ml-auto">
            {!selectMode ? (
              <>
                <Button variant="outline" className="h-[34px]" style={{ borderColor: '#2d3a5e' }} onClick={enterSelectMode} disabled={emails.length === 0 || syncing}>
                  <CheckSquare className="h-4 w-4" />
                  Select
                </Button>
                {isConnected && (
                  <Button variant="outline" className="h-[34px]" style={{ borderColor: '#2d3a5e' }} onClick={sync} disabled={syncing}>
                    {syncing
                      ? <Loader2 className="h-4 w-4 animate-spin" />
                      : <RefreshCw className="h-4 w-4" />}
                    {syncing ? 'Refreshing…' : 'Refresh'}
                  </Button>
                )}
              </>
            ) : (
              <Button variant="outline" className="h-[34px]" style={{ borderColor: '#2d3a5e' }} onClick={exitSelectMode}>
                <X className="h-4 w-4" />
                Cancel
              </Button>
            )}
          </div>
        </div>

        {/* Bară de filtre: un track compact (fundal soft + linie fină) care
            grupează chips-urile într-un singur element — aliniat la stânga,
            mai mic decât search. Doar chip-ul activ se colorează (pilula
            alunecă lin). */}
        {!selectMode && (
          <div
            className="scrollbar-none flex w-fit max-w-full items-center gap-1 self-start overflow-x-auto rounded-md border bg-card/40 p-1"
            style={{ borderColor: '#2d3a5e' }}
          >
            {RISK_FILTERS.map((filter) => {
              const isActive = riskBucket === filter.key;
              const countKey = FILTER_COUNT_MAP[filter.key];
              const count = !showCounts
                ? null
                : countKey === '__total__'
                  ? totalCount
                  : (counts[countKey] ?? null);
              const hex = filterHex(filter.key);
              return (
                <button
                  key={filter.key || 'all'}
                  onClick={() => setFilter(filter.key)}
                  className={cn(
                    'relative flex-none whitespace-nowrap rounded-sm px-3 py-1 text-sm font-medium transition-colors',
                    isActive ? filterTextClass(filter.key) : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  {isActive && (
                    <motion.span
                      layoutId="filter-pill"
                      transition={springSoft}
                      className="absolute inset-0 rounded-sm"
                      style={{
                        backgroundColor: `color-mix(in oklab, ${hex} 14%, transparent)`,
                        boxShadow: `inset 0 0 0 1px color-mix(in oklab, ${hex} 40%, transparent)`,
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
        )}
      </div>

      {/* List */}
      {!isConnected ? (
        <EmptyState
          icon={InboxIcon}
          title="Connect Gmail to see your inbox"
          description="SecureInbox syncs and scans your messages once a Gmail account is connected. No counts are shown until then."
          action={
            <Button asChild>
              <Link to="/settings">
                <Mail className="h-4 w-4" />
                Connect Gmail
              </Link>
            </Button>
          }
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
                {groupEmails.map((email) => {
                  const id = emailId(email);
                  if (selectMode) {
                    return (
                      <div
                        key={id}
                        className={cn(
                          'flex cursor-pointer items-center transition-colors hover:bg-accent/50',
                          selected.has(id) && 'bg-primary/5'
                        )}
                        onClick={() => toggleSelect(id)}
                      >
                        <div className="flex shrink-0 items-center justify-center px-3 py-3">
                          <input
                            type="checkbox"
                            checked={selected.has(id)}
                            onChange={() => toggleSelect(id)}
                            onClick={(e) => e.stopPropagation()}
                            className="h-4 w-4 rounded border-border accent-primary"
                          />
                        </div>
                        <div className="min-w-0 flex-1 pointer-events-none">
                          <EmailRow email={email} compact={false} />
                        </div>
                      </div>
                    );
                  }
                  return (
                    <EmailRow
                      key={id}
                      email={email}
                      linkState={{ ids: emailIds }}
                    />
                  );
                })}
              </div>
            </div>
          ))}
          <Pagination page={page} totalPages={totalPages} onPage={setPage} />
        </Card>
      )}

      {/* Bulk action bar */}
      <AnimatePresence>
        {selectMode && selected.size > 0 && (
          <motion.div
            initial={{ y: 60, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 60, opacity: 0 }}
            transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
            className="fixed bottom-20 left-1/2 z-50 flex -translate-x-1/2 items-center gap-2 rounded-full border border-border bg-card/95 px-4 py-2 shadow-lg backdrop-blur-xl"
          >
            <span className="text-sm font-medium">{selected.size} selected</span>
            <div className="h-4 w-px bg-border" />
            <Button
              size="sm"
              variant="ghost"
              className="text-risk-safe"
              onClick={handleBulkSafe}
              disabled={bulkBusy}
            >
              {bulkBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
              Mark safe
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="text-risk-quarantine"
              onClick={handleBulkPhishing}
              disabled={bulkBusy}
            >
              {bulkBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldX className="h-4 w-4" />}
              Mark phishing
            </Button>
            <Button size="sm" variant="ghost" onClick={exitSelectMode} disabled={bulkBusy}>
              <X className="h-4 w-4" />
              Cancel
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
