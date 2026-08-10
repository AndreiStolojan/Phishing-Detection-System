// ─────────────────────────────────────────────────────────────────────────────
// InboxPage.jsx — the inbox workspace: list on the left, message on the right,
// across the full width of the screen.
//
// It is not a page with a card in it: AppShell marks /inbox as "full bleed" (no
// padding), so the toolbar spans everything and the list + message fill what is
// left, separated by a single vertical hairline.
//
// LAYOUT CONTRACT — the message list keeps its width, always.
// The workspace grid is `[LIST_WIDTH minmax(0,1fr)]`. The first track is a
// fixed length, so when the sidebar collapses and this container gets wider,
// every extra pixel goes to the second track — the detail pane — and the list
// does not move at all. `minmax(0,1fr)` (not `1fr`) is what lets that track
// shrink below its content instead of forcing the page to scroll sideways.
// The animation itself comes from the shell's width transition, which changes
// this container's width frame by frame; adding a second transition here would
// only fight it.
//
// Selection lives in the URL (`?selected=<id>`), like the filter, the search and
// the page — so a link sent to a colleague opens exactly the same screen.
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Search, X, Loader2, CheckSquare, RefreshCw, ShieldCheck, ShieldX } from 'lucide-react';
import { toast } from 'sonner';

import { InboxSkeleton, ErrorState, EmptyState } from '@/components/common/states';
import { Pagination } from '@/components/common/Pagination';
import { EmailRow } from '@/components/inbox/EmailRow';
import { FilterTabs } from '@/components/inbox/FilterTabs';
import { MessagePane, MessagePaneEmpty } from '@/components/inbox/MessagePane';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useApi, bustCacheByPrefix } from '@/hooks/useApi';
import { useDebounce } from '@/hooks/useDebounce';
import { useMailAccount } from '@/context/MailAccountContext';
import { useTimeRange } from '@/context/TimeRangeContext';
import { getEmails, getEmailStats } from '@/api/emailsApi';
import { markEmailSafe, markEmailPhishing } from '@/api/actionsApi';
import { normalizeEmailList } from '@/lib/email-list';
import { emailId } from '@/lib/email';
import { RISK_FILTERS } from '@/lib/risk';
import { getDateGroupLabel } from '@/utils/formatDate';
import { cn } from '@/lib/utils';

const PAGE_SIZE = 10;

// The one place the list width is written down. Wide enough for a sender name,
// an address and a verdict on one row; narrow enough that the message keeps the
// lion's share of the screen.
const LIST_WIDTH = '22.5rem'; // 360px

const DATE_GROUP_ORDER = ['Today', 'Yesterday', 'This week', 'Older'];

function groupByDate(emails) {
  const groups = {};
  for (const email of emails) {
    const label = getDateGroupLabel(email.receivedAt);
    if (!groups[label]) groups[label] = [];
    groups[label].push(email);
  }
  return DATE_GROUP_ORDER.filter((g) => groups[g]?.length > 0).map((g) => ({
    label: g,
    emails: groups[g],
  }));
}

// Filter key (from RISK_FILTERS) → the key it has in the /emails/stats payload.
const FILTER_COUNT_MAP = {
  '': '__total__',
  quarantine: 'quarantine',
  needs_review: 'needs_review',
  confirmed_phishing: 'confirmed_phishing',
  safe: 'safe',
};

export function InboxPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { isConnected, syncVersion, sync, syncing } = useMailAccount();
  const { from, to } = useTimeRange();
  const searchRef = useRef(null);

  const riskBucket = searchParams.get('riskBucket') || '';
  const rawSearch = searchParams.get('q') || '';
  const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
  const selectedParam = searchParams.get('selected') || '';

  const [searchInput, setSearchInput] = useState(rawSearch);
  const debouncedSearch = useDebounce(searchInput, 300);

  // Bulk selection (checkboxes). Named `checked*` so it is never confused with
  // `selected`, which is the message open in the right-hand pane.
  const [selectMode, setSelectMode] = useState(false);
  const [checkedIds, setCheckedIds] = useState(new Set());
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

  // Tab counts. Deliberately NOT keyed on the search box: these are the totals
  // for the time range, and they must not jump around as the user types.
  const countsQuery = useApi(
    () => getEmailStats({ from, to }),
    [syncVersion, from, to],
    `inbox-stats-${from}-${to}-${syncVersion}`
  );
  const counts = countsQuery.data?.counts || {};
  const totalCount = countsQuery.data?.total ?? 0;
  // While searching, the visible list is a subset of the range, so range totals
  // on the tabs would be misleading — hide them until the search is cleared.
  const showCounts = isConnected && !debouncedSearch;

  const tabCounts = Object.fromEntries(
    RISK_FILTERS.map(({ key }) => {
      const mapped = FILTER_COUNT_MAP[key];
      return [key, mapped === '__total__' ? totalCount : counts[mapped] ?? 0];
    })
  );

  const emails = normalizeEmailList(data);
  const totalPages = data?.pagination?.totalPages ?? (emails.length > 0 ? 1 : 0);
  const emailIds = emails.map(emailId);
  const groups = groupByDate(emails);
  const searching = loading || searchInput !== debouncedSearch;

  /*
    An id in the URL is an explicit request for THAT message, so it wins even
    when the message is not in the list currently on screen — MessagePane loads
    it by id on its own, so the pane can show a message the list has not paged
    to. This is what makes a link from the dashboard (or an old bookmark) open
    the message it names instead of quietly showing whatever sorts first.

    The row simply will not be highlighted in that case, which is honest: the
    message genuinely is not in the visible list. Changing filter, page or
    search clears `selected` (see setParam callers), so a stale id cannot
    survive navigation — it only ever arrives from a link.
  */
  const selectedId = selectedParam || emailIds[0] || '';

  useEffect(() => {
    setSelectMode(false);
    setCheckedIds(new Set());
  }, [riskBucket, debouncedSearch, page, syncVersion]);

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

  const setFilter = (key) => setParam({ riskBucket: key, page: '', selected: '' });
  const setPage = (p) => setParam({ page: String(p), selected: '' });
  const selectEmail = (id) => setParam({ selected: id });

  const handleSearchChange = (value) => {
    setSearchInput(value);
    setParam({ q: value, page: '', selected: '' });
  };

  const afterReview = () => {
    reload();
    countsQuery.reload();
    bustCacheByPrefix('inbox-', 'dash-', 'risky-');
  };

  const toggleChecked = (id) => {
    setCheckedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const exitSelectMode = () => {
    setSelectMode(false);
    setCheckedIds(new Set());
  };

  const runBulk = async (fn, label) => {
    if (checkedIds.size === 0) return;
    setBulkBusy(true);
    try {
      await Promise.all([...checkedIds].map((id) => fn(id)));
      toast.success(`${checkedIds.size} ${checkedIds.size === 1 ? 'message' : 'messages'} ${label}`);
      exitSelectMode();
      afterReview();
    } catch (err) {
      toast.error(err?.message || 'Something went wrong.');
    } finally {
      setBulkBusy(false);
    }
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-x-hidden">
      {/* ── Toolbar ───────────────────────────────────────────────────────── */}
      <div className="flex shrink-0 flex-wrap items-center gap-3 px-4 py-2.5">
        <div className="flex items-baseline gap-2">
          <h1 className="text-[15px] font-semibold tracking-tight">Inbox</h1>
          {showCounts && (
            <span className="text-xs tabular-nums text-muted-foreground">
              {totalCount} scanned
            </span>
          )}
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground-subtle" />
          <Input
            ref={searchRef}
            value={searchInput}
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder="Search sender, subject…"
            aria-label="Search messages"
            className="h-8 rounded-lg pl-8 pr-8 text-[13px]"
          />
          {searching ? (
            <Loader2 className="absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 animate-spin text-muted-foreground-subtle" />
          ) : (
            searchInput && (
              <button
                type="button"
                onClick={() => handleSearchChange('')}
                aria-label="Clear search"
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-0.5 text-muted-foreground-subtle transition-colors hover:text-foreground"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )
          )}
        </div>

        <div className="ml-auto flex items-center gap-1.5">
          {selectMode ? (
            <Button variant="ghost" size="sm" onClick={exitSelectMode}>
              Cancel
            </Button>
          ) : (
            <Button variant="outline" size="sm" onClick={() => setSelectMode(true)}>
              <CheckSquare className="h-3.5 w-3.5" />
              Select
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={sync} disabled={syncing}>
            <RefreshCw className={cn('h-3.5 w-3.5', syncing && 'animate-spin')} />
            Refresh
          </Button>
        </div>
      </div>

      {/* ── Filter tabs, directly above the list ──────────────────────────── */}
      <FilterTabs
        active={riskBucket}
        counts={tabCounts}
        showCounts={showCounts}
        onSelect={setFilter}
      />

      {/* ── Workspace: list | message ─────────────────────────────────────── */}
      <div
        className="grid min-h-0 flex-1 grid-cols-1 md:grid-cols-[var(--inbox-list-w)_minmax(0,1fr)]"
        style={{ '--inbox-list-w': LIST_WIDTH }}
      >
        {/* The list. Fixed track above, so this never resizes. */}
        <aside className="flex min-h-0 min-w-0 flex-col overflow-y-auto overflow-x-hidden border-border md:border-r">
          {!isConnected ? (
            <div className="p-4">
              <EmptyState
                title="Connect Gmail to see your inbox"
                message="SecureInbox scans every message once your account is linked."
              />
            </div>
          ) : loading ? (
            <div className="p-2">
              <InboxSkeleton />
            </div>
          ) : error ? (
            <div className="p-4">
              <ErrorState message={error} onRetry={reload} />
            </div>
          ) : emails.length === 0 ? (
            <div className="p-4">
              <EmptyState
                icon={ShieldCheck}
                title={debouncedSearch ? 'No matches' : 'Nothing to review here'}
                message={
                  debouncedSearch
                    ? 'No message matches that search in this time range.'
                    : 'No messages in this category for the selected time range.'
                }
              />
            </div>
          ) : (
            <>
              {groups.map((group) => (
                <div key={group.label}>
                  <p className="sticky top-0 z-10 bg-background px-[18px] py-2 text-[11px] font-semibold text-muted-foreground">
                    {group.label}
                  </p>
                  <div className="divide-y divide-border">
                    {group.emails.map((email) => {
                      const id = emailId(email);
                      return (
                        <EmailRow
                          key={id}
                          email={email}
                          active={!selectMode && id === selectedId}
                          onSelect={selectEmail}
                          checkable={selectMode}
                          checked={checkedIds.has(id)}
                          onCheck={toggleChecked}
                        />
                      );
                    })}
                  </div>
                </div>
              ))}

              {totalPages > 1 && (
                <div className="mt-auto">
                  <Pagination page={page} totalPages={totalPages} onPage={setPage} />
                </div>
              )}
            </>
          )}
        </aside>

        {/* The message. This is the only track that grows or shrinks. */}
        <main className="min-h-0 min-w-0 overflow-y-auto overflow-x-hidden border-t border-border md:border-t-0">
          {isConnected && selectedId ? (
            <MessagePane key={selectedId} id={selectedId} onReviewed={afterReview} />
          ) : (
            <MessagePaneEmpty />
          )}
        </main>
      </div>

      {/* ── Bulk action bar ───────────────────────────────────────────────── */}
      <AnimatePresence>
        {selectMode && checkedIds.size > 0 && (
          <motion.div
            initial={{ y: 60, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 60, opacity: 0 }}
            transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
            className="fixed bottom-6 left-1/2 z-50 flex -translate-x-1/2 items-center gap-1.5 rounded-full border border-border bg-popover/95 px-3 py-2 shadow-lg backdrop-blur-xl"
          >
            <span className="px-2 text-[13px] tabular-nums text-muted-foreground">
              {checkedIds.size} selected
            </span>
            <Button
              variant="ghost"
              size="sm"
              disabled={bulkBusy}
              className="text-risk-safe"
              onClick={() => runBulk(markEmailSafe, 'marked safe')}
            >
              <ShieldCheck className="h-3.5 w-3.5" />
              Mark safe
            </Button>
            <Button
              variant="ghost"
              size="sm"
              disabled={bulkBusy}
              className="text-risk-quarantine"
              onClick={() => runBulk(markEmailPhishing, 'marked as phishing')}
            >
              <ShieldX className="h-3.5 w-3.5" />
              Mark phishing
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default InboxPage;
