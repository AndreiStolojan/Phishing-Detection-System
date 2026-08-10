// ─────────────────────────────────────────────────────────────────────────────
// SenderListsPage.jsx — Senders: the permanent calls the user has already made
// about who is writing to them.
//
// This is a WORKSPACE, not a document. The whole page is one spatial idea:
// Trusted and Blocked FACE each other as two columns, and the star interaction
// is moving a sender across the gap. You do not have to read anything to
// understand the screen — you can see both verdicts at once, and flipping one
// is a single click on the row.
//
// Above the two columns sits a command bar. Typing is the only required input:
// the bar infers whether you mean one address or a whole domain from whether
// what you typed contains an "@", and says so live. The inference is always
// visible and always overridable — guessing silently would be worse than the
// two <select>s this replaced.
//
// The rest of the scanner's semantics are woven into where they matter rather
// than collected into a manual at the bottom: what a column DOES is written in
// its header, what a rule COVERS is written on its row, and what a domain rule
// will also catch is written under the input while you type it.
//
// Colour is scarce: risk-safe means trusted, risk-quarantine means blocked,
// primary means "you can act on this". Trusted is the boring, common case and
// must never out-shout blocked — so neither column is filled, only marked.
// ─────────────────────────────────────────────────────────────────────────────

import { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { toast } from 'sonner';
import {
  ArrowLeft,
  ArrowRight,
  Loader2,
  Plus,
  Search,
  ShieldCheck,
  ShieldX,
  Trash2,
  X,
} from 'lucide-react';

import { PageHeader } from '@/components/common/PageHeader';
import { ErrorState } from '@/components/common/states';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { useApi, bustCache } from '@/hooks/useApi';
import { useAsyncAction } from '@/hooks/useAsyncAction';
import {
  getSenderLists,
  addSenderListEntry,
  removeSenderListEntry,
} from '@/api/senderListsApi';
import { springSoft } from '@/lib/motion';
import { CATEGORY_COLORS, CATEGORY_LABELS } from '@/lib/risk';
import { cn } from '@/lib/utils';

/* ─── Helpers ─────────────────────────────────────────────────────────────── */

const plural = (n, one, many) => (n === 1 ? one : many);

const OPPOSITE = { allow: 'block', block: 'allow' };

// The two columns, described once.
const COLUMNS = {
  allow: {
    key: 'allow',
    label: 'Trusted',
    icon: ShieldCheck,
    text: 'text-risk-safe',
    dot: 'bg-risk-safe',
    // The honest version. "Trusted" is not "always safe", and the header is the
    // only place a user will actually read that.
    semantics:
      'Contextual signals like urgency are damped. Password requests and dangerous attachments still count in full.',
  },
  block: {
    key: 'block',
    label: 'Blocked',
    icon: ShieldX,
    text: 'text-risk-quarantine',
    dot: 'bg-risk-quarantine',
    semantics: 'Always flagged as likely phishing, no matter what the rest of the scan finds.',
  },
};

// What the user typed → what kind of rule it is. An "@" means they named one
// person; anything else is a domain. This is the whole inference, and it is
// right often enough that the toggle beside it is rarely touched.
const inferKind = (value) => (value.includes('@') ? 'sender' : 'domain');

// The example under the input. Domain rules match suffix-aware on the server,
// so showing the subdomain it will ALSO catch is more useful than repeating
// what was typed — it is the part people get wrong.
const kindHint = (kind, value) => {
  const clean = value.trim().toLowerCase().replace(/^www\./, '');
  if (kind === 'sender') {
    return clean
      ? 'Single sender — this exact address only, and it wins over any rule on its domain.'
      : 'Type an address for one sender, or a bare domain for everyone at it.';
  }
  return clean
    ? `Whole domain — also covers mail.${clean}, but not evil-${clean}.`
    : 'Type an address for one sender, or a bare domain for everyone at it.';
};

/* ─── Impact: what a rule actually touches ────────────────────────────────── */

/*
 * A rule is an abstraction until you see how much of your mail it moves. The
 * API gives each rule the raw riskBucket counts of the messages it covers; this
 * block turns those into the same categories the dashboard draws, so a colour
 * means one thing across the whole app.
 *
 * Two foldings are deliberate:
 *   - `reviewed_safe` is folded into `safe`. To a reader it is the same
 *     outcome — nothing wrong here — and splitting it would spend a colour on
 *     the provenance of a verdict rather than on the verdict.
 *   - `unscanned` is kept apart and carries the neutral grey token, never a
 *     risk colour. It is the ABSENCE of a verdict; painting it like one would
 *     claim the scanner said something it never said.
 */
const BUCKET_TO_CATEGORY = {
  safe: 'safe',
  reviewed_safe: 'safe',
  needs_review: 'suspicious',
  quarantine: 'likely_phishing',
  confirmed_phishing: 'confirmed_phishing',
  unscanned: 'unscanned',
};

// Drawing order: quietest first, so a bar reads left-to-right as a severity
// ramp. Unscanned trails at the end in grey — outside the ramp, not the top of it.
const CATEGORIES = ['safe', 'suspicious', 'likely_phishing', 'confirmed_phishing', 'unscanned'];

const emptyCategories = () =>
  CATEGORIES.reduce((acc, key) => {
    acc[key] = 0;
    return acc;
  }, {});

const toCategories = (byBucket) => {
  const counts = emptyCategories();
  for (const [bucket, value] of Object.entries(byBucket || {})) {
    const category = BUCKET_TO_CATEGORY[bucket];
    if (category) counts[category] += value || 0;
  }
  return counts;
};

// Roll several rules up into one make-up. Note this counts COVERAGE, not
// distinct messages: a message covered by both a sender rule and its domain
// rule is counted by each. That is why the aggregate copy says "matches" while
// a single row says "messages" — the row number is exact, the roll-up is a sum.
const sumCategories = (entries) =>
  entries.reduce((acc, entry) => {
    const counts = toCategories(entry.matchedByBucket);
    for (const key of CATEGORIES) acc[key] += counts[key];
    return acc;
  }, emptyCategories());

const totalOf = (categories) => CATEGORIES.reduce((sum, key) => sum + categories[key], 0);

// The bar is a picture; screen readers get the same information as a sentence.
const describeCategories = (categories, total) =>
  total === 0
    ? 'No messages'
    : CATEGORIES.filter((key) => categories[key] > 0)
        .map((key) => `${categories[key]} ${CATEGORY_LABELS[key].toLowerCase()}`)
        .join(', ');

/*
 * The proportional bar, same idiom as the dashboard's domain rows: the track is
 * scaled to the largest thing on screen (so bars are comparable), and the
 * segments split that track by category. `width` is a percentage of the
 * available track, so a rule covering 2 messages next to one covering 200 looks
 * like it.
 */
function CategoryBar({ categories, total, width = 100, className, title }) {
  return (
    <div
      className={cn('h-[5px] overflow-hidden rounded-sm bg-border', className)}
      style={{ width: `${Math.max(width, total > 0 ? 3 : 0)}%` }}
      role="img"
      aria-label={title ? `${title}: ${describeCategories(categories, total)}` : describeCategories(categories, total)}
    >
      <div className="flex h-full w-full">
        {CATEGORIES.map((key) => {
          const count = categories[key] || 0;
          if (!count || !total) return null;
          return (
            <span
              key={key}
              className="h-full"
              style={{ width: `${(count / total) * 100}%`, backgroundColor: CATEGORY_COLORS[key] }}
            />
          );
        })}
      </div>
    </div>
  );
}

// The legend, written once for the whole board. It doubles as the board-level
// tally, so it earns its space twice: the swatch teaches the colour, the number
// beside it is the total for that category across every rule.
function CategoryLegend({ categories }) {
  return (
    <ul className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
      {CATEGORIES.map((key) => {
        const count = categories[key] || 0;
        return (
          <li
            key={key}
            className={cn(
              'flex items-center gap-1.5 text-xs',
              count > 0 ? 'text-muted-foreground' : 'text-muted-foreground-subtle'
            )}
          >
            <span
              aria-hidden="true"
              className="h-2 w-2 shrink-0 rounded-[2px]"
              style={{ backgroundColor: CATEGORY_COLORS[key], opacity: count > 0 ? 1 : 0.4 }}
            />
            <b className="font-[560] tabular-nums text-foreground">{count}</b>
            {CATEGORY_LABELS[key]}
          </li>
        );
      })}
    </ul>
  );
}

// Level three: everything, together. It sits directly under the command bar
// because that is where a new rule lands — you add one and immediately see how
// much of your mail just changed hands.
function BoardImpact({ entries, filtered }) {
  const categories = useMemo(() => sumCategories(entries), [entries]);
  const total = totalOf(categories);

  return (
    <section className="mt-6 rounded-xl border border-border bg-card px-4 py-3.5">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h2 className="heading-section">What your rules cover</h2>
        <p className="text-xs text-muted-foreground">
          {entries.length === 0 ? (
            filtered ? 'No rules match that search' : 'No rules yet'
          ) : (
            <>
              <b className="font-[590] tabular-nums text-foreground">{total}</b>{' '}
              {plural(total, 'match', 'matches')} across {entries.length}{' '}
              {plural(entries.length, 'rule', 'rules')}
              {filtered && ' matching your search'}
            </>
          )}
        </p>
      </div>

      {total > 0 ? (
        <>
          <CategoryBar
            categories={categories}
            total={total}
            className="mt-3"
            title="All rules"
          />
          <div className="mt-3">
            <CategoryLegend categories={categories} />
          </div>
        </>
      ) : (
        <p className="copy-support mt-2">
          {entries.length === 0
            ? 'Rules you add show up here with the messages they touch, broken down by what the scanner made of them.'
            : 'None of your synced messages match these rules yet.'}
        </p>
      )}
    </section>
  );
}

// Level two: one column's share of the same picture, in its header, so Trusted
// and Blocked can be weighed against each other at a glance.
function ColumnImpact({ categories, total, ruleCount, columnLabel }) {
  if (ruleCount === 0) return null;

  return (
    <div className="mt-3">
      <CategoryBar categories={categories} total={total} title={columnLabel} />
      <p className="mt-1.5 text-xs text-muted-foreground">
        {total === 0 ? (
          'No messages covered yet.'
        ) : (
          <>
            <b className="font-[590] tabular-nums text-foreground">{total}</b>{' '}
            {plural(total, 'match', 'matches')} covered
          </>
        )}
      </p>
    </div>
  );
}

/* ─── Command bar ─────────────────────────────────────────────────────────── */

// A segmented control, used twice (trust/block, sender/domain). Deliberately
// buttons and not a <select>: both choices stay on screen, so the inferred one
// is visible without opening anything.
function Segmented({ options, value, onChange, ariaLabel, layoutId }) {
  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      className="flex shrink-0 items-center gap-0.5 rounded-lg bg-foreground/[0.06] p-0.5"
    >
      {options.map((option) => {
        const active = option.key === value;
        return (
          <button
            key={option.key}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(option.key)}
            className={cn(
              'relative rounded-[0.4rem] px-2.5 py-1 text-xs outline-none transition-colors',
              'focus-visible:ring-2 focus-visible:ring-ring',
              active ? cn('font-[590]', option.text || 'text-foreground') : 'text-muted-foreground hover:text-foreground'
            )}
          >
            {active && (
              <motion.span
                layoutId={layoutId}
                transition={springSoft}
                aria-hidden="true"
                className="absolute inset-0 rounded-[0.4rem] bg-background shadow-xs"
              />
            )}
            <span className="relative">{option.label}</span>
          </button>
        );
      })}
    </div>
  );
}

function CommandBar({
  value,
  setValue,
  listType,
  setListType,
  kind,
  kindOverridden,
  setKind,
  onAdd,
  loading,
}) {
  const canSubmit = Boolean(value.trim()) && !loading;

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (canSubmit) onAdd();
      }}
      className="mt-7"
    >
      {/* One instrument, not a panel: the verdict, the address and the action
          share a single bordered row, so adding a rule reads as one gesture. */}
      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-border bg-card p-2">
        <Segmented
          ariaLabel="Trust or block"
          layoutId="senders-listtype-pill"
          value={listType}
          onChange={setListType}
          options={[
            { key: 'allow', label: 'Trust', text: 'text-risk-safe' },
            { key: 'block', label: 'Block', text: 'text-risk-quarantine' },
          ]}
        />

        <Input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          aria-label="Address or domain"
          placeholder="name@example.com or example.com"
          className="h-9 min-w-0 flex-1 basis-[16rem] border-transparent bg-transparent text-[0.8125rem] shadow-none"
        />

        <Segmented
          ariaLabel="What the rule covers"
          layoutId="senders-kind-pill"
          value={kind}
          onChange={setKind}
          options={[
            { key: 'sender', label: 'Sender' },
            { key: 'domain', label: 'Domain' },
          ]}
        />

        <Button type="submit" className="h-9 shrink-0" disabled={!canSubmit}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
          Add
        </Button>
      </div>

      {/* The live reading of what was typed. It changes as you type, which is
          what makes the inference trustworthy instead of magic. */}
      <p className="mt-2 px-1 text-xs text-muted-foreground">
        {kindHint(kind, value)}
        {kindOverridden && value.trim() && (
          <span className="text-muted-foreground-subtle"> · set manually</span>
        )}
      </p>
    </form>
  );
}

/* ─── A sender row ────────────────────────────────────────────────────────── */

function SenderRow({ entry, busy, maxMatches, onMove, onRemove }) {
  const matched = entry.matchedEmails ?? 0;
  const categories = toCategories(entry.matchedByBucket);
  const toColumn = COLUMNS[OPPOSITE[entry.listType]];
  const MoveIcon = entry.listType === 'allow' ? ArrowRight : ArrowLeft;

  return (
    <motion.li
      layout
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: entry.listType === 'allow' ? 24 : -24 }}
      transition={springSoft}
      className={cn(
        'group relative flex items-center gap-3 px-3 py-2.5 transition-colors',
        'hover:bg-foreground/[0.035] focus-within:bg-foreground/[0.035]',
        busy && 'opacity-60'
      )}
    >
      <div className="min-w-0 flex-1">
        <span
          className="block truncate text-[0.8125rem] font-[590] text-foreground"
          title={entry.value}
        >
          {entry.value}
        </span>

        <span className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
          <span className="shrink-0">
            {entry.kind === 'domain' ? 'Whole domain' : 'Single sender'}
          </span>
          <span aria-hidden="true" className="text-muted-foreground-subtle">
            ·
          </span>
          {/* A rule that catches nothing says so in words. A missing bar with no
              sentence beside it looks like a loading failure. */}
          {matched > 0 ? (
            <span className="shrink-0 tabular-nums">
              {matched} {plural(matched, 'message', 'messages')}
            </span>
          ) : (
            <span className="shrink-0 text-muted-foreground-subtle">No messages yet</span>
          )}
        </span>

        {/* The make-up of this rule's mail. Scaled against the busiest rule on
            the board, so the bars compare across both columns. */}
        {matched > 0 && (
          <CategoryBar
            categories={categories}
            total={matched}
            width={(matched / maxMatches) * 100}
            title={entry.value}
            className="mt-1.5"
          />
        )}
      </div>

      {/* Actions appear on hover, but focus-within keeps them reachable by
          keyboard — they are never only-on-hover. */}
      <div
        className={cn(
          'flex shrink-0 items-center gap-0.5 transition-opacity',
          'opacity-0 group-hover:opacity-100 group-focus-within:opacity-100',
          busy && 'opacity-100'
        )}
      >
        {busy ? (
          <span className="p-1.5" role="status" aria-label="Moving…">
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          </span>
        ) : (
          <>
            <button
              type="button"
              aria-label={`Move ${entry.value} to ${toColumn.label}`}
              title={`Move to ${toColumn.label}`}
              onClick={() => onMove(entry)}
              className={cn(
                'rounded-md p-1.5 text-muted-foreground outline-none transition-colors',
                'hover:text-primary focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-primary/50'
              )}
            >
              <MoveIcon className="h-4 w-4" />
            </button>
            <button
              type="button"
              aria-label={`Remove ${entry.value}`}
              title="Remove"
              onClick={() => onRemove(entry)}
              className={cn(
                'rounded-md p-1.5 text-muted-foreground outline-none transition-colors',
                'hover:text-risk-quarantine focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-primary/50'
              )}
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </>
        )}
      </div>
    </motion.li>
  );
}

/* ─── A column ────────────────────────────────────────────────────────────── */

// Empty columns teach instead of apologising: the space is used to say what the
// verdict would do, and where else it can be set from.
function EmptyColumn({ column, filtered }) {
  if (filtered) {
    return (
      <p className="px-3 py-8 text-center text-xs text-muted-foreground">
        Nothing here matches that search.
      </p>
    );
  }

  return (
    <div className="px-4 py-8">
      <p className="copy-support">
        {column.key === 'block'
          ? 'Nothing blocked yet. A blocked sender is flagged as likely phishing every time, even if the message itself looks harmless.'
          : 'Nothing trusted yet. Trusting a sender quiets the contextual signals on their mail — the critical ones keep their full weight.'}
      </p>
      <p className="mt-2 text-xs text-muted-foreground-subtle">
        The Trust and Block buttons on any message in the inbox write here too.
      </p>
    </div>
  );
}

function Column({ column, entries, filtered, maxMatches, movingId, onMove, onRemove }) {
  const Icon = column.icon;
  const categories = useMemo(() => sumCategories(entries), [entries]);
  const total = totalOf(categories);

  return (
    <section className="flex min-w-0 flex-col overflow-hidden rounded-xl border border-border bg-card">
      <header className="border-b border-border px-4 py-3.5">
        <div className="flex items-center gap-2">
          <Icon className={cn('h-4 w-4 shrink-0', column.text)} aria-hidden="true" />
          <h2 className="heading-section">{column.label}</h2>
          <span className="ml-auto text-xs tabular-nums text-muted-foreground">
            {entries.length}
          </span>
        </div>
        <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">{column.semantics}</p>
        <ColumnImpact
          categories={categories}
          total={total}
          ruleCount={entries.length}
          columnLabel={column.label}
        />
      </header>

      {entries.length === 0 ? (
        <EmptyColumn column={column} filtered={filtered} />
      ) : (
        <ul className="divide-y divide-border">
          <AnimatePresence initial={false}>
            {entries.map((entry) => (
              <SenderRow
                key={entry.id}
                entry={entry}
                busy={movingId === entry.id}
                maxMatches={maxMatches}
                onMove={onMove}
                onRemove={onRemove}
              />
            ))}
          </AnimatePresence>
        </ul>
      )}
    </section>
  );
}

function ColumnSkeleton() {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <Skeleton className="h-4 w-24" />
      <Skeleton className="mt-3 h-3 w-full" />
      <div className="mt-6 space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-9 w-full" />
        ))}
      </div>
    </div>
  );
}

/* ─── Page ────────────────────────────────────────────────────────────────── */

export function SenderListsPage() {
  const { data, loading, error, reload } = useApi(
    () => getSenderLists({ withMatchCounts: true }),
    [],
    'sender-lists-full'
  );
  const entries = useMemo(() => data?.entries || [], [data]);

  const [listType, setListType] = useState('allow');
  const [value, setValue] = useState('');
  // `null` means "follow what was typed". Picking the toggle pins it, so the
  // inference can always be overridden — and typing a fresh value releases it.
  const [kindOverride, setKindOverride] = useState(null);
  const [search, setSearch] = useState('');
  const [busyId, setBusyId] = useState(null);

  const kind = kindOverride ?? inferKind(value);

  const handleValueChange = (next) => {
    setValue(next);
    // Crossing the "@" boundary is a different intent, so let the inference
    // take over again rather than keeping a stale manual choice.
    if (kindOverride && inferKind(next) !== inferKind(value)) setKindOverride(null);
  };

  const add = useAsyncAction(async () => {
    await addSenderListEntry({ listType, kind, value: value.trim() });
    setValue('');
    setKindOverride(null);
    bustCache('sender-lists', 'sender-lists-full');
    await reload();
    toast.success(listType === 'allow' ? 'Added to Trusted.' : 'Added to Blocked.');
  });

  const handleAdd = () =>
    add.run().catch((e) => toast.error(e.message || 'Failed to add the rule.'));

  const handleRemove = async (entry) => {
    setBusyId(entry.id);
    try {
      await removeSenderListEntry(entry.id);
      bustCache('sender-lists', 'sender-lists-full');
      await reload();
      toast.success('Removed.');
    } catch (e) {
      toast.error(e.message || 'Failed to remove the rule.');
    } finally {
      setBusyId(null);
    }
  };

  /*
   * Move a sender across to the other column.
   *
   * There is no move endpoint, so a move is remove-then-add — and the ORDER is
   * not a style choice. The server enforces mutual exclusion: the same value
   * cannot sit on both lists, and adding one that already exists on the other
   * is refused with 409 LIST_CONFLICT. Add-then-remove would therefore fail
   * every single time, on the very first call.
   *
   * The price is a window where the rule exists on neither list. We pay it
   * honestly: the row's controls are disabled and show a spinner for the whole
   * round trip, and if the add fails we put the original entry back and say so.
   * If even the restore fails, we say THAT plainly too — a rule the user set
   * must never disappear quietly.
   */
  const handleMove = async (entry) => {
    const to = OPPOSITE[entry.listType];
    const payload = { kind: entry.kind, value: entry.value };
    setBusyId(entry.id);

    try {
      await removeSenderListEntry(entry.id);
    } catch (e) {
      toast.error(e.message || `Could not move ${entry.value}.`);
      setBusyId(null);
      return;
    }

    try {
      await addSenderListEntry({ listType: to, ...payload });
      toast.success(`${entry.value} moved to ${COLUMNS[to].label}.`);
    } catch (e) {
      try {
        await addSenderListEntry({ listType: entry.listType, ...payload });
        toast.error(
          `Could not move ${entry.value} to ${COLUMNS[to].label} — it is still ${COLUMNS[entry.listType].label.toLowerCase()}. ${e.message || ''}`.trim()
        );
      } catch {
        toast.error(
          `${entry.value} was removed from ${COLUMNS[entry.listType].label} and could not be added back. Please add it again below.`
        );
      }
    } finally {
      bustCache('sender-lists', 'sender-lists-full');
      await reload();
      setBusyId(null);
    }
  };

  const query = search.trim().toLowerCase();
  const visible = query ? entries.filter((e) => e.value.includes(query)) : entries;

  const trusted = visible.filter((e) => e.listType === 'allow');
  const blocked = visible.filter((e) => e.listType === 'block');

  // One shared scale for both columns, so a bar in Blocked and a bar in Trusted
  // mean the same thing. Never zero — a zero max would divide by nothing.
  const maxMatches = Math.max(1, ...entries.map((e) => e.matchedEmails ?? 0));

  // First load only. A refetch after add/remove/move keeps the rows on screen
  // instead of blinking the whole board back to skeletons.
  const pending = loading && entries.length === 0;

  return (
    <div className="pb-10">
      <PageHeader
        title="Senders"
        description="The senders and domains you have made a permanent call on."
        titleClassName="text-[1.75rem] font-[650] tracking-[-0.028em]"
        actions={
          <div className="relative w-full sm:w-60">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground-subtle" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              aria-label="Search senders"
              placeholder="Search both columns…"
              className="h-9 pl-8 pr-8 text-[0.8125rem]"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                aria-label="Clear search"
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-0.5 text-muted-foreground-subtle outline-none transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-primary/50"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        }
      />

      <CommandBar
        value={value}
        setValue={handleValueChange}
        listType={listType}
        setListType={setListType}
        kind={kind}
        kindOverridden={kindOverride !== null}
        setKind={setKindOverride}
        onAdd={handleAdd}
        loading={add.loading}
      />

      {/* The whole board's impact, above the columns: the one place the colours
          are named, and the total of everything the rules touch. Hidden while
          the first load is still in flight so it does not flash a zero. */}
      {!pending && !error && <BoardImpact entries={visible} filtered={Boolean(query)} />}

      {/* The board. Two columns facing each other with a real gap between them,
          because the gap is the thing the move interaction crosses. */}
      <div className="mt-6 grid grid-cols-2 items-start gap-5 max-[780px]:grid-cols-1">
        {pending ? (
          <>
            <ColumnSkeleton />
            <ColumnSkeleton />
          </>
        ) : error ? (
          <div className="col-span-full">
            <ErrorState message={error} onRetry={reload} />
          </div>
        ) : (
          <>
            <Column
              column={COLUMNS.allow}
              entries={trusted}
              filtered={Boolean(query)}
              maxMatches={maxMatches}
              movingId={busyId}
              onMove={handleMove}
              onRemove={handleRemove}
            />
            <Column
              column={COLUMNS.block}
              entries={blocked}
              filtered={Boolean(query)}
              maxMatches={maxMatches}
              movingId={busyId}
              onMove={handleMove}
              onRemove={handleRemove}
            />
          </>
        )}
      </div>
    </div>
  );
}

export default SenderListsPage;
