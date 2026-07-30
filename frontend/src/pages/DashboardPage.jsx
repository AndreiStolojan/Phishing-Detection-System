// ─────────────────────────────────────────────────────────────────────────────
// DashboardPage.jsx — "Mailbox posture".
//
// Pagina e formată din exact patru blocuri, separate de linii subțiri (fără
// carduri plutitoare):
//   1. Posture         — arcul cu safe rate + o frază + banda de cifre
//   2. Review queue    — emailurile "likely phishing", ca rânduri dense
//   3. Trend           — detecțiile pe zi (recharts, doar linii)
//   4. Attacking domains — domeniile din spatele emailurilor riscante
//
// Toate culorile de severitate vin din lib/risk.js (variabile CSS
// --color-risk-*), iar restul din tokenii semantici Tailwind.
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Check, Loader2, RefreshCw, Send } from 'lucide-react';
import { toast } from 'sonner';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

import { DashboardSkeleton, ErrorState, ConnectGmailState } from '@/components/common/states';
import { PageHeader } from '@/components/common/PageHeader';
import { PostureGauge } from '@/components/dashboard/PostureGauge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { TimeRangeFilter } from '@/components/common/TimeRangeFilter';
import { useApi } from '@/hooks/useApi';
import { useAuth } from '@/hooks/useAuth';
import { useAsyncAction } from '@/hooks/useAsyncAction';
import { useMailAccount } from '@/context/MailAccountContext';
import { useTimeRange } from '@/context/TimeRangeContext';
import { getEmails, getEmailStats, getEmailTrend, getTopRiskySenders } from '@/api/emailsApi';
import { sendReportSummary } from '@/api/reportsApi';
import { normalizeEmailList } from '@/lib/email-list';
import { emailId, getSenderName, getSenderAddress } from '@/lib/email';
import { CATEGORY_COLORS, CATEGORY_LABELS, getRiskMeta } from '@/lib/risk';
import { formatDateTime } from '@/utils/formatDate';
import { cn } from '@/lib/utils';

/* ─── Helpers ─────────────────────────────────────────────────────────────── */

const formatAxisDate = (dateStr) => {
  if (!dateStr) return '';
  const d = new Date(dateStr + 'T00:00:00');
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

// Timp relativ scurt pentru coloana "When" din review queue.
const relativeTime = (value) => {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  const diffMin = Math.round((Date.now() - date.getTime()) / 60000);
  if (diffMin < 1) return 'Just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHours = Math.round(diffMin / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.round(diffHours / 24);
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 30) return `${diffDays}d ago`;
  return formatAxisDate(date.toISOString().slice(0, 10));
};

// Scorul unui email (0-100), oriunde ar veni în răspuns. Fără scor -> null.
const scoreOf = (email) => {
  const raw = email?.latestScan?.score ?? email?.score;
  if (raw === null || raw === undefined) return null;
  const n = Number(raw);
  if (!Number.isFinite(n)) return null;
  return Math.min(100, Math.max(0, Math.round(n)));
};

const plural = (n, one, many) => (n === 1 ? one : many);

/* ─── Block scaffolding ───────────────────────────────────────────────────── */

function Block({ title, note, last = false, children }) {
  return (
    <section className={cn('py-10', !last && 'border-b border-border')}>
      <div className="mb-6 flex items-baseline gap-3">
        <h2 className="text-[1.0625rem] font-[620] tracking-[-0.019em] text-foreground">{title}</h2>
        {note && <span className="ml-auto text-xs text-muted-foreground-subtle">{note}</span>}
      </div>
      {children}
    </section>
  );
}

/* ─── 1. Posture ──────────────────────────────────────────────────────────── */

function CountCell({ value, label, tone, first }) {
  return (
    <div className={cn('py-4 pr-5', first ? 'pl-0' : 'border-l border-border pl-5')}>
      <span
        className={cn(
          'block text-[1.375rem] font-[650] leading-[1.1] tracking-[-0.03em] tabular-nums',
          tone || 'text-foreground'
        )}
      >
        {value}
      </span>
      <span className="mt-1 block text-xs text-muted-foreground-subtle">{label}</span>
    </div>
  );
}

function TailStat({ label, value }) {
  return (
    <span className="text-xs text-muted-foreground-subtle">
      {label} <b className="font-[560] tabular-nums text-muted-foreground">{value}</b>
    </span>
  );
}

function PostureBlock({ counts, total, safeCount, scanned, safeRate, attention, periodLabel }) {
  return (
    <Block title="Posture" note={periodLabel}>
      <div className="grid grid-cols-[216px_minmax(0,1fr)] items-center gap-13 max-[780px]:grid-cols-1 max-[780px]:gap-7">
        <PostureGauge value={safeRate} />

        <div>
          <p className="text-[1.375rem] font-[620] leading-[1.27] tracking-[-0.024em] text-foreground">
            {attention === 0
              ? 'Nothing needs your review.'
              : `${attention} ${plural(attention, 'message', 'messages')} need${attention === 1 ? 's' : ''} your review.`}
          </p>
          <p className="mt-2 max-w-[52ch] text-[0.8125rem] text-muted-foreground">
            {attention === 0
              ? scanned === 0
                ? 'Nothing has been scanned in this period yet.'
                : `All ${scanned} scanned ${plural(scanned, 'message', 'messages')} came back clear.`
              : 'These look like phishing attempts. Review them before opening.'}
          </p>

          <div className="mt-7 grid grid-cols-4 border-t border-border max-[780px]:grid-cols-2">
            <CountCell first value={total} label="Total messages" />
            <CountCell value={safeCount} label="Safe" />
            <CountCell value={counts.needs_review ?? 0} label="Suspicious" tone="text-risk-review" />
            <CountCell value={counts.quarantine ?? 0} label="Likely phishing" tone="text-risk-quarantine" />
          </div>

          <div className="mt-3 flex flex-wrap gap-x-6 gap-y-1">
            <TailStat label="Confirmed phishing" value={counts.confirmed_phishing ?? 0} />
            <TailStat label="Reviewed safe" value={counts.reviewed_safe ?? 0} />
            <TailStat label="Unscanned" value={counts.unscanned ?? 0} />
            <TailStat label="Scanned" value={scanned} />
          </div>
        </div>
      </div>
    </Block>
  );
}

/* ─── 2. Review queue ─────────────────────────────────────────────────────── */

const QUEUE_GRID =
  'grid grid-cols-[minmax(150px,0.85fr)_minmax(230px,1.7fr)_118px_88px] items-center gap-5 ' +
  'max-[900px]:grid-cols-[minmax(0,1fr)_100px] max-[900px]:gap-x-4 max-[900px]:gap-y-2';

function QueueRow({ email }) {
  const score = scoreOf(email);
  const tone = getRiskMeta(email.riskBucket).tone;

  return (
    <Link
      to={`/inbox/${emailId(email)}`}
      className={cn(
        QUEUE_GRID,
        'rounded-md border-b border-border px-2.5 py-3 outline-none transition-colors',
        'hover:bg-foreground/[0.03] focus-visible:ring-2 focus-visible:ring-primary/50'
      )}
    >
      <div className="min-w-0">
        <span className="block truncate text-[0.8125rem] font-[590] text-foreground">
          {getSenderName(email)}
        </span>
        <span className="mt-px block truncate text-xs text-muted-foreground">
          {getSenderAddress(email) || '—'}
        </span>
      </div>

      <div className="min-w-0 max-[900px]:order-3 max-[900px]:col-span-full">
        <span className="block truncate text-[0.8125rem] font-[480] text-foreground/90">
          {email.subject || '(no subject)'}
        </span>
      </div>

      <div className="flex items-center gap-2.5">
        <span className="relative h-[3px] flex-1 overflow-hidden rounded-sm bg-border">
          <i
            className="absolute inset-y-0 left-0 block rounded-sm"
            style={{ width: `${score ?? 0}%`, backgroundColor: tone.hex }}
          />
        </span>
        <span
          className="min-w-6 text-right text-[0.8125rem] font-[590] tabular-nums"
          style={{ color: tone.hex }}
        >
          {score ?? '—'}
        </span>
      </div>

      <div className="text-right text-xs tabular-nums text-muted-foreground">
        {relativeTime(email.receivedAt)}
      </div>
    </Link>
  );
}

function ReviewQueueBlock({ emails, loading, total }) {
  const shown = emails.slice(0, 5);

  return (
    <Block
      title="Review queue"
      note={total > 0 ? `${shown.length} of ${total} shown` : undefined}
    >
      <div className={cn(QUEUE_GRID, 'border-b border-border px-2.5 pb-2 max-[900px]:hidden')}>
        <span className="text-xs font-medium text-muted-foreground-subtle">Sender</span>
        <span className="text-xs font-medium text-muted-foreground-subtle">Subject</span>
        <span className="text-xs font-medium text-muted-foreground-subtle">Score</span>
        <span className="text-right text-xs font-medium text-muted-foreground-subtle">When</span>
      </div>

      {loading ? (
        <div className="space-y-2 pt-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </div>
      ) : shown.length === 0 ? (
        <p className="px-2.5 py-8 text-[0.8125rem] text-muted-foreground">
          Nothing is waiting for review in this period.
        </p>
      ) : (
        <>
          {shown.map((email) => (
            <QueueRow key={emailId(email)} email={email} />
          ))}
          {total > shown.length && (
            <Link
              to="/inbox?riskBucket=quarantine"
              className="mt-4 inline-block px-2.5 text-xs text-primary hover:underline"
            >
              View all {total} in the inbox
            </Link>
          )}
        </>
      )}
    </Block>
  );
}

/* ─── 3. Trend ────────────────────────────────────────────────────────────── */

const TREND_SERIES = [
  { key: 'needs_review', name: CATEGORY_LABELS.suspicious, color: CATEGORY_COLORS.suspicious },
  { key: 'quarantine', name: CATEGORY_LABELS.likely_phishing, color: CATEGORY_COLORS.likely_phishing },
  { key: 'confirmed_phishing', name: CATEGORY_LABELS.confirmed_phishing, color: CATEGORY_COLORS.confirmed_phishing },
];

function TrendTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-md border border-border bg-card px-3 py-2 text-xs shadow-md">
      <p className="mb-2 font-semibold text-foreground">{formatAxisDate(label)}</p>
      <div className="space-y-1">
        {TREND_SERIES.map(({ key, name, color }) => {
          const entry = payload.find((e) => e.dataKey === key);
          const val = entry?.value ?? 0;
          return (
            <div key={key} className="flex items-center justify-between gap-4">
              <span className="flex items-center gap-2 text-muted-foreground">
                <span className="inline-block h-0.5 w-3 rounded-sm" style={{ background: color }} />
                {name}
              </span>
              <span
                className={cn(
                  'font-semibold tabular-nums',
                  val === 0 ? 'text-muted-foreground-subtle' : 'text-foreground'
                )}
              >
                {val === 0 ? '—' : val}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function TrendBlock({ data, loading }) {
  const tickFormatter = (value, index) => (index % 5 === 0 ? formatAxisDate(value) : '');

  return (
    <Block title="Trend" note="Detections per day">
      <div className="mb-5 flex flex-wrap gap-x-5 gap-y-1.5">
        {TREND_SERIES.map(({ key, name, color }) => (
          <span key={key} className="inline-flex items-center gap-2 text-xs text-muted-foreground">
            <span className="inline-block h-0.5 w-3 rounded-sm" style={{ background: color }} />
            {name}
          </span>
        ))}
      </div>

      {loading ? (
        <Skeleton className="h-[200px] w-full" />
      ) : data.length === 0 ? (
        <p className="py-8 text-[0.8125rem] text-muted-foreground">
          No detections recorded in this period.
        </p>
      ) : (
        <div className="select-none">
          <ResponsiveContainer width="100%" height={216}>
            {/* accessibilityLayer={false}: în recharts v3 e activat implicit și
                desenează un chenar de focus în jurul graficului la click. */}
            <LineChart
              accessibilityLayer={false}
              data={data}
              margin={{ top: 8, right: 4, left: -26, bottom: 0 }}
            >
              <CartesianGrid
                vertical={false}
                stroke="var(--color-border)"
                strokeWidth={1}
              />
              <XAxis
                dataKey="date"
                tickFormatter={tickFormatter}
                tick={{ fontSize: 11, fill: 'var(--color-muted-foreground-subtle)' }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 11, fill: 'var(--color-muted-foreground-subtle)' }}
                axisLine={false}
                tickLine={false}
                allowDecimals={false}
              />
              <Tooltip content={<TrendTooltip />} cursor={{ stroke: 'var(--color-border)' }} />
              {TREND_SERIES.map(({ key, name, color }) => (
                <Line
                  key={key}
                  type="monotone"
                  dataKey={key}
                  name={name}
                  stroke={color}
                  strokeWidth={1.75}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  dot={false}
                  activeDot={{ r: 3, strokeWidth: 0 }}
                  isAnimationActive={false}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </Block>
  );
}

/* ─── 4. Attacking domains ────────────────────────────────────────────────── */

const DOMAIN_SEGMENTS = [
  { key: 'needsReview', label: 'Suspicious', color: CATEGORY_COLORS.suspicious },
  { key: 'quarantine', label: 'Likely', color: CATEGORY_COLORS.likely_phishing },
  { key: 'confirmedPhishing', label: 'Confirmed', color: CATEGORY_COLORS.confirmed_phishing },
];

function DomainRow({ sender, max }) {
  const total = sender.total || 0;
  // Lățimea barei e raportată la domeniul cel mai activ; segmentele împart
  // apoi bara proporțional cu propriul total (fără împărțiri la zero).
  const barWidth = max > 0 ? (total / max) * 100 : 0;

  return (
    <Link
      to={`/inbox?q=${encodeURIComponent(sender.domain)}`}
      className={cn(
        'grid grid-cols-[minmax(170px,1fr)_minmax(140px,2fr)_76px] items-center gap-x-6',
        'max-[780px]:grid-cols-[minmax(0,1fr)_76px] max-[780px]:gap-y-2',
        'rounded-md border-b border-border px-2.5 py-3 outline-none transition-colors',
        'hover:bg-foreground/[0.03] focus-visible:ring-2 focus-visible:ring-primary/50'
      )}
    >
      <div className="truncate text-[0.8125rem] font-medium text-foreground">{sender.domain}</div>

      <div className="min-w-0 max-[780px]:order-3 max-[780px]:col-span-full">
        <div className="flex h-[5px] overflow-hidden rounded-sm bg-border" style={{ width: `${barWidth}%` }}>
          {DOMAIN_SEGMENTS.map(({ key, color }) => {
            const count = sender[key] ?? 0;
            if (!count || !total) return null;
            return (
              <span
                key={key}
                className="h-full"
                style={{ width: `${(count / total) * 100}%`, backgroundColor: color }}
              />
            );
          })}
        </div>
        <div className="mt-1.5 flex flex-wrap gap-x-3.5 text-xs text-muted-foreground-subtle">
          {DOMAIN_SEGMENTS.map(({ key, label }) => (
            <span key={key}>
              {label} <b className="font-[560] tabular-nums text-muted-foreground">{sender[key] ?? 0}</b>
            </span>
          ))}
        </div>
      </div>

      <div className="flex items-baseline justify-end gap-1.5">
        <b className="text-[0.9375rem] font-[620] tracking-[-0.024em] tabular-nums text-foreground">
          {total}
        </b>
        <span className="text-xs text-muted-foreground-subtle">msg</span>
      </div>
    </Link>
  );
}

function DomainsBlock({ senders, loading }) {
  const list = Array.isArray(senders) ? senders : [];
  const max = list.reduce((acc, s) => Math.max(acc, s.total || 0), 0);

  return (
    <Block
      title="Attacking domains"
      note={list.length > 0 ? 'Scaled against the busiest domain' : undefined}
      last
    >
      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </div>
      ) : list.length === 0 ? (
        <p className="px-2.5 py-8 text-[0.8125rem] text-muted-foreground">
          No risky senders in this period.
        </p>
      ) : (
        list.map((sender) => <DomainRow key={sender.domain} sender={sender} max={max} />)
      )}
    </Block>
  );
}

/* ─── Dashboard page ──────────────────────────────────────────────────────── */

export function DashboardPage() {
  const { user } = useAuth();
  const { account, isConnected, syncVersion, sync, syncing } = useMailAccount();
  const { label, from, to } = useTimeRange();
  const [searchParams, setSearchParams] = useSearchParams();

  const statsQuery = useApi(
    () => getEmailStats({ from, to }),
    [syncVersion, from, to],
    `dash-stats-${from}-${to}-${syncVersion}`
  );
  const riskyQuery = useApi(
    () => getEmails({ riskBucket: 'quarantine', from, to }),
    [syncVersion, from, to],
    `risky-${from}-${to}-${syncVersion}`
  );
  const trendQuery = useApi(
    () => getEmailTrend({ from, to }),
    [syncVersion, from, to],
    `dash-trend-${from}-${to}-${syncVersion}`
  );
  const sendersQuery = useApi(
    () => getTopRiskySenders({ from, to }),
    [syncVersion, from, to],
    `dash-senders-${from}-${to}-${syncVersion}`
  );

  const sendReport = useAsyncAction(sendReportSummary);
  const [reportSentTo, setReportSentTo] = useState(null);

  // A new range means a new report — reset the "Emailed" confirmation.
  useEffect(() => {
    setReportSentTo(null);
  }, [from, to]);

  const handleSendReport = async () => {
    try {
      const result = await sendReport.run({ from, to, label });
      if (result?.sent) {
        setReportSentTo(result.recipient);
        toast.success(`Report sent to ${result.recipient}`);
      }
    } catch (err) {
      toast.error(err?.message || 'Failed to send report. Check your email settings.');
    }
  };

  useEffect(() => {
    if (searchParams.get('gmail')) {
      const next = new URLSearchParams(searchParams);
      next.delete('gmail');
      next.delete('account');
      next.delete('code');
      setSearchParams(next, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  if (!isConnected) return <ConnectGmailState />;

  if (statsQuery.loading) return <DashboardSkeleton />;
  if (statsQuery.error)
    return <ErrorState message={statsQuery.error} onRetry={statsQuery.reload} />;

  const counts = statsQuery.data?.counts || {};
  const total = statsQuery.data?.total ?? 0;
  const risky = normalizeEmailList(riskyQuery.data);
  const trendData = Array.isArray(trendQuery.data) ? trendQuery.data : [];

  const safeCount = (counts.safe || 0) + (counts.reviewed_safe || 0);
  const scanned = Math.max(0, total - (counts.unscanned || 0));
  // Fără emailuri scanate nu există rată: arătăm 0, niciodată NaN.
  const safeRate = scanned > 0 ? Math.round((safeCount / scanned) * 100) : 0;
  const attention = counts.quarantine ?? 0;
  const lastSynced = account?.lastSyncedAt;
  const displayName = user?.name || user?.email?.split('@')[0] || 'there';

  return (
    <div>
      {/* Global time-range picker — every count and graph below covers the
          selected window. Absolute-state items (Gmail connection, last-synced
          time) are not time-scoped and shown as-is. */}
      <PageHeader
        title={`Welcome back, ${displayName}!`}
        description={
          lastSynced
            ? `Last synced ${formatDateTime(lastSynced)} · ${scanned} of ${total} messages scanned`
            : `${scanned} of ${total} messages scanned`
        }
        className="border-b border-border pb-6"
        titleClassName="text-[1.75rem] font-[650] tracking-[-0.028em]"
        actions={
          <>
            <Button
              variant="outline"
              className="h-[34px]"
              onClick={handleSendReport}
              disabled={sendReport.loading}
            >
              {sendReport.loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : reportSentTo ? (
                <Check className="h-4 w-4 text-risk-safe" />
              ) : (
                <Send className="h-4 w-4" />
              )}
              {reportSentTo ? 'Sent' : 'Send Report'}
            </Button>
            <TimeRangeFilter variant="plain" />
            <Button variant="outline" className="h-[34px]" onClick={sync} disabled={syncing}>
              {syncing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              {syncing ? 'Refreshing…' : 'Refresh'}
            </Button>
          </>
        }
      />

      <PostureBlock
        counts={counts}
        total={total}
        safeCount={safeCount}
        scanned={scanned}
        safeRate={safeRate}
        attention={attention}
        periodLabel={label}
      />

      <ReviewQueueBlock emails={risky} loading={riskyQuery.loading} total={risky.length} />

      <TrendBlock data={trendData} loading={trendQuery.loading} />

      <DomainsBlock senders={sendersQuery.data} loading={sendersQuery.loading} />
    </div>
  );
}
