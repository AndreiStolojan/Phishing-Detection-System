// ─────────────────────────────────────────────────────────────────────────────
// InboxPage.jsx — spațiul de lucru al inbox-ului: listă în stânga, mesajul în
// dreapta, pe toată lățimea ecranului.
//
// Nu e o pagină cu un card înăuntru: AppShell marchează /inbox ca "full bleed"
// (fără padding), aşa că bara de sus se întinde peste tot, iar dedesubt lista
// şi mesajul umplu tot ce rămâne, despărţite de o singură linie verticală.
//
// Selecţia stă în URL (`?selected=<id>`), la fel ca filtrul, căutarea şi
// pagina — aşa un link trimis unui coleg deschide exact acelaşi ecran. Ruta
// veche /inbox/:emailId rămâne funcţională pentru linkuri mai vechi.
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Search, X, Loader2, CheckSquare, RefreshCw, ShieldCheck, ShieldX } from 'lucide-react';
import { toast } from 'sonner';

import { InboxSkeleton, ErrorState, EmptyState } from '@/components/common/states';
import { Pagination } from '@/components/common/Pagination';
import { MessagePane, MessagePaneEmpty } from '@/components/inbox/MessagePane';
import { ScoreMeter } from '@/components/inbox/ScoreMeter';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useApi, bustCacheByPrefix } from '@/hooks/useApi';
import { useDebounce } from '@/hooks/useDebounce';
import { useMailAccount } from '@/context/MailAccountContext';
import { useTimeRange } from '@/context/TimeRangeContext';
import { getEmails, getEmailStats } from '@/api/emailsApi';
import { markEmailSafe, markEmailPhishing } from '@/api/actionsApi';
import { normalizeEmailList } from '@/lib/email-list';
import { emailId, getSenderName, getSenderAddress } from '@/lib/email';
import { RISK_FILTERS, getRiskMeta } from '@/lib/risk';
import { getDateGroupLabel, formatEmailDate } from '@/utils/formatDate';
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
  return DATE_GROUP_ORDER.filter((g) => groups[g]?.length > 0).map((g) => ({
    label: g,
    emails: groups[g],
  }));
}

const FILTER_COUNT_MAP = {
  '': '__total__',
  quarantine: 'quarantine',
  needs_review: 'needs_review',
  confirmed_phishing: 'confirmed_phishing',
  safe: 'safe',
};

const filterHex = (key) => (key ? getRiskMeta(key).tone.hex : 'var(--color-primary)');

// ── Un rând din listă ────────────────────────────────────────────────────────
// Adresa expeditorului e pe rândul ei: într-o listă de triaj antiphishing
// adresa E dovada (paypal-account-verify.com), nu decor — a o ascunde până
// deschizi mesajul ar anula rostul parcurgerii listei.
function ListRow({ email, selected, onSelect, checkable, checked, onCheck }) {
  const id = emailId(email);
  const meta = getRiskMeta(email.riskBucket);
  const score = email.latestScan?.score ?? null;

  return (
    <div
      className={cn(
        'group relative flex items-start gap-3 border-l-2 px-4 py-3 transition-colors',
        selected
          ? 'border-l-primary bg-primary/12'
          : 'border-l-transparent hover:bg-accent'
      )}
    >
      {checkable && (
        <input
          type="checkbox"
          checked={checked}
          onChange={() => onCheck(id)}
          onClick={(e) => e.stopPropagation()}
          aria-label={`Select ${email.subject || 'message'}`}
          className="mt-1 h-4 w-4 shrink-0 rounded border-border accent-primary"
        />
      )}

      <button
        type="button"
        onClick={() => onSelect(id)}
        aria-current={selected ? 'true' : undefined}
        className="min-w-0 flex-1 text-left outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-background"
      >
        <span className="flex items-baseline gap-2">
          <span className="min-w-0 flex-1 truncate text-[13px] font-semibold text-foreground">
            {getSenderName(email)}
          </span>
          <time className="shrink-0 text-[11px] tabular-nums text-muted-foreground">
            {formatEmailDate(email.receivedAt)}
          </time>
        </span>

        <span className="mt-0.5 block truncate text-[11px] text-muted-foreground">
          {getSenderAddress(email)}
        </span>

        <span
          className={cn(
            'mt-1 block truncate text-[13px]',
            selected ? 'text-foreground/90' : 'text-muted-foreground'
          )}
        >
          {email.subject || '(no subject)'}
        </span>

        <span className="mt-2 flex items-center gap-2.5">
          <ScoreMeter score={score} hex={meta.tone.hex} className="w-14" />
          <span className="text-[11px] font-semibold tabular-nums text-muted-foreground">
            {score ?? '—'}
          </span>
          <span className={cn('flex items-center gap-1.5 text-[11px] font-medium', meta.tone.text)}>
            <span
              aria-hidden="true"
              className="h-[5px] w-[5px] rounded-full"
              style={{ backgroundColor: meta.tone.hex }}
            />
            {meta.label}
          </span>
        </span>
      </button>
    </div>
  );
}

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

  // Selecţia în masă (checkbox-uri). Numele e `checked*` ca să nu se confunde
  // cu `selected`, care e mesajul deschis în panoul din dreapta.
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

  const countsQuery = useApi(
    () => getEmailStats({ from, to }),
    [syncVersion, from, to],
    `inbox-stats-${from}-${to}-${syncVersion}`
  );
  const counts = countsQuery.data?.counts || {};
  const totalCount = countsQuery.data?.total ?? 0;
  const showCounts = isConnected && !debouncedSearch;

  const emails = normalizeEmailList(data);
  const totalPages = data?.pagination?.totalPages ?? (emails.length > 0 ? 1 : 0);
  const emailIds = emails.map(emailId);
  const groups = groupByDate(emails);
  const searching = loading || searchInput !== debouncedSearch;

  // Dacă id-ul din URL nu e pe pagina curentă (filtru schimbat, altă pagină),
  // cădem pe primul mesaj — panoul din dreapta nu rămâne niciodată gol degeaba.
  const selectedId = emailIds.includes(selectedParam) ? selectedParam : emailIds[0] || '';

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

  const chipCount = (key) => {
    const mapped = FILTER_COUNT_MAP[key];
    if (mapped === '__total__') return totalCount;
    return counts[mapped] ?? 0;
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {/* ── Bara de sus, pe toată lăţimea ─────────────────────────────────── */}
      <div className="flex shrink-0 flex-wrap items-center gap-3 border-b border-border px-4 py-2.5">
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

        {/* Chips */}
        <div className="scrollbar-none -mx-1 flex max-w-full items-center gap-0.5 overflow-x-auto px-1">
          {RISK_FILTERS.map(({ key, label }) => {
            const active = riskBucket === key;
            const count = chipCount(key);
            return (
              <button
                key={key || 'all'}
                type="button"
                onClick={() => setFilter(key)}
                className={cn(
                  'relative shrink-0 rounded-md px-2.5 py-1.5 text-[13px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                  active ? 'text-foreground' : 'text-muted-foreground hover:text-foreground'
                )}
              >
                {active && (
                  <motion.span
                    layoutId="filter-pill"
                    transition={springSoft}
                    className="absolute inset-0 rounded-md"
                    style={{
                      backgroundColor: `color-mix(in oklab, ${filterHex(key)} 16%, transparent)`,
                      boxShadow: `inset 0 0 0 1px color-mix(in oklab, ${filterHex(key)} 38%, transparent)`,
                    }}
                  />
                )}
                <span className="relative">
                  {label}
                  {showCounts && count > 0 && (
                    <span className="ml-1.5 tabular-nums text-muted-foreground">{count}</span>
                  )}
                </span>
              </button>
            );
          })}
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

      {/* ── Spaţiul de lucru: listă | mesaj ───────────────────────────────── */}
      <div className="grid min-h-0 flex-1 grid-cols-1 md:grid-cols-[360px_minmax(0,1fr)]">
        {/* Lista */}
        <aside className="flex min-h-0 flex-col overflow-y-auto border-border md:border-r">
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
                title="Nothing here"
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
                  <p className="sticky top-0 z-10 bg-background px-4 py-2 text-[11px] font-semibold text-muted-foreground">
                    {group.label}
                  </p>
                  <div className="divide-y divide-border">
                    {group.emails.map((email) => {
                      const id = emailId(email);
                      return (
                        <ListRow
                          key={id}
                          email={email}
                          selected={!selectMode && id === selectedId}
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
                <div className="mt-auto border-t border-border px-3 py-2">
                  <Pagination page={page} totalPages={totalPages} onPage={setPage} />
                </div>
              )}
            </>
          )}
        </aside>

        {/* Mesajul */}
        <main className="min-h-0 overflow-y-auto border-t border-border md:border-t-0">
          {isConnected && selectedId ? (
            <MessagePane key={selectedId} id={selectedId} onReviewed={afterReview} />
          ) : (
            <MessagePaneEmpty />
          )}
        </main>
      </div>

      {/* ── Bara de acţiuni în masă ───────────────────────────────────────── */}
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
