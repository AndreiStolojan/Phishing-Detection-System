// ─────────────────────────────────────────────────────────────────────────────
// DashboardPage.jsx — briefingul de securitate al inboxului.
//
// Pagina răspunde, în ordinea asta, la două întrebări: "sunt în siguranță?" și
// "ce am de făcut?". De aici cele patru blocuri, separate doar prin linii de 1px
// (fără carduri):
//   1. Posture        — arcul cu safe rate, o concluzie în limbaj natural și
//                       cifrele-cheie ca figuri discrete, integrate în frază
//   2. Needs your review — emailurile care chiar cer atenție, cele mai urgente
//                       primele; fiecare rând duce în /inbox
//   3. Risk over time — cum s-a mișcat riscul în intervalul selectat
//   4. Attacking domains — de unde vin mesajele riscante
//
// Culorile de CATEGORIE (grafice, segmente) vin din lib/risk.js. Un SCOR
// numeric (safe rate, scorul unui email) se colorează din rampa continuă din
// lib/scoreScale.js — niciodată hex hardcodat.
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, useMemo, useState } from 'react';
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
import { CATEGORY_COLORS, CATEGORY_LABELS } from '@/lib/risk';
import { getPostureLabel, getRiskColor, getRiskTextColor, isScored, UNSCORED_COLOR } from '@/lib/scoreScale';
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

const receivedAtMs = (email) => {
  const t = new Date(email?.receivedAt ?? 0).getTime();
  return Number.isNaN(t) ? 0 : t;
};

const plural = (n, one, many) => (n === 1 ? one : many);

/* ─── Block scaffolding ───────────────────────────────────────────────────── */

function Block({ title, note, last = false, children }) {
  return (
    <section className={cn('py-10', !last && 'border-b border-border')}>
      <div className="mb-6 flex flex-wrap items-baseline gap-x-4 gap-y-1">
        <h2 className="text-[1.0625rem] font-[620] tracking-[-0.019em] text-foreground">{title}</h2>
        {note && <span className="ml-auto text-xs text-muted-foreground">{note}</span>}
      </div>
      {children}
    </section>
  );
}

/* ─── 1. Posture ──────────────────────────────────────────────────────────── */

// Cifrele-cheie: nu patru carduri, ci o bandă de figuri discrete sub frază, pe
// o singură linie subțire. Valoarea e mare, eticheta e o propoziție scurtă.
function Figure({ value, label, tone }) {
  return (
    <div className="min-w-0">
      <span
        className={cn(
          'block text-[1.25rem] font-[650] leading-[1.15] tracking-[-0.028em] tabular-nums',
          tone || 'text-foreground'
        )}
      >
        {value}
      </span>
      <span className="mt-1 block text-xs leading-snug text-muted-foreground">{label}</span>
    </div>
  );
}

// Concluzia în limbaj natural: spune ce s-a găsit, fără să alarmeze când nu e
// nimic de făcut și fără să banalizeze când e.
function postureDetail({ scanned, total, needsReview, quarantine, confirmed }) {
  if (scanned === 0) {
    return total > 0
      ? 'None of the synced messages have been scanned yet, so there is nothing to judge.'
      : 'Nothing has been synced for this time range yet.';
  }
  if (quarantine > 0) {
    const head = `${quarantine} ${plural(quarantine, 'message looks', 'messages look')} like phishing`;
    const tail =
      needsReview > 0
        ? `, and ${needsReview} more ${plural(needsReview, 'is', 'are')} worth a second look.`
        : '.';
    return `${head}${tail} Start with the queue below.`;
  }
  if (needsReview > 0) {
    return `${needsReview} ${plural(needsReview, 'message has', 'messages have')} suspicious patterns, but nothing here looks like an outright phishing attempt.`;
  }
  if (confirmed > 0) {
    return `Every message scanned in this range came back clean. The ${confirmed} you marked as phishing ${plural(confirmed, 'is', 'are')} already handled.`;
  }
  return `All ${scanned} scanned ${plural(scanned, 'message', 'messages')} came back clean.`;
}

function PostureBlock({ counts, total, scanned, safeRate, periodLabel }) {
  const needsReview = counts.needs_review ?? 0;
  const quarantine = counts.quarantine ?? 0;
  const confirmed = counts.confirmed_phishing ?? 0;

  return (
    <Block title="Posture" note={periodLabel}>
      <div className="grid grid-cols-[216px_minmax(0,1fr)] items-center gap-12 max-[780px]:grid-cols-1 max-[780px]:gap-7">
        <PostureGauge value={safeRate} />

        <div className="min-w-0">
          {/* Cu zero mesaje scanate rata e 0 din lipsă de date, nu din cauza
              unei probleme — nu alarmăm userul degeaba. */}
          <p className="text-[1.375rem] font-[620] leading-[1.27] tracking-[-0.024em] text-foreground">
            {scanned === 0 ? 'Nothing to report yet' : getPostureLabel(safeRate)}
          </p>
          <p className="mt-2 max-w-[54ch] text-[0.8125rem] leading-relaxed text-muted-foreground">
            {postureDetail({ scanned, total, needsReview, quarantine, confirmed })}
          </p>

          <div className="mt-7 grid grid-cols-4 gap-x-6 gap-y-5 border-t border-border pt-5 max-[900px]:grid-cols-2">
            <Figure
              value={scanned}
              label={
                total > scanned
                  ? `Scanned, of ${total} synced`
                  : `Scanned ${plural(scanned, 'message', 'messages')}`
              }
            />
            <Figure value={needsReview} label="Suspicious" tone="text-risk-review" />
            <Figure value={quarantine} label="Likely phishing" tone="text-risk-quarantine" />
            <Figure value={confirmed} label="Confirmed by you" tone="text-risk-phishing" />
          </div>
        </div>
      </div>
    </Block>
  );
}

/* ─── 2. Review queue ─────────────────────────────────────────────────────── */

// Toate coloanele pot să se strângă (minmax(0, …)), deci rândul nu împinge
// niciodată pagina lateral, oricât de lung ar fi un subiect sau un domeniu.
const QUEUE_GRID =
  'grid grid-cols-[minmax(0,1.05fr)_minmax(0,1.7fr)_92px_74px] items-center gap-x-5 ' +
  'max-[900px]:grid-cols-[minmax(0,1fr)_92px] max-[900px]:gap-x-4 max-[900px]:gap-y-2';

function QueueRow({ email }) {
  const score = scoreOf(email);
  const scored = isScored(score);
  const barColor = scored ? getRiskColor(score) : UNSCORED_COLOR;
  const scoreColor = scored ? getRiskTextColor(score) : UNSCORED_COLOR;

  return (
    <Link
      // Open THIS message, in the filter it came from. The queue is built from
      // the quarantine bucket, so carrying `riskBucket` over means the list
      // beside the message is the rest of the review queue rather than the
      // whole inbox — the user keeps working through the same set they clicked
      // from. `selected` is what the inbox reads; a bare /inbox/:id path drops
      // it (see the redirect in App.jsx).
      to={`/inbox?riskBucket=quarantine&selected=${encodeURIComponent(emailId(email))}`}
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
          {getSenderAddress(email) || 'No sender address'}
        </span>
      </div>

      <div className="min-w-0 max-[900px]:order-3 max-[900px]:col-span-full">
        <span className="block truncate text-[0.8125rem] font-[480] text-foreground">
          {email.subject || 'No subject'}
        </span>
      </div>

      <div className="flex min-w-0 items-center gap-2.5">
        <span className="relative h-[3px] min-w-0 flex-1 overflow-hidden rounded-sm bg-border">
          <i
            className="absolute inset-y-0 left-0 block rounded-sm"
            style={{ width: `${score ?? 0}%`, backgroundColor: barColor }}
          />
        </span>
        <span
          className="shrink-0 text-right text-[0.8125rem] font-[590] tabular-nums"
          style={{ color: scoreColor }}
        >
          {scored ? score : '—'}
        </span>
      </div>

      <div className="truncate text-right text-xs tabular-nums text-muted-foreground">
        {relativeTime(email.receivedAt)}
      </div>
    </Link>
  );
}

function ReviewQueueBlock({ emails, loading }) {
  // Cele mai urgente primele: scor mai mare = mai periculos; la scor egal,
  // mesajul mai recent contează mai mult.
  const ordered = useMemo(
    () =>
      [...emails].sort(
        (a, b) => (scoreOf(b) ?? -1) - (scoreOf(a) ?? -1) || receivedAtMs(b) - receivedAtMs(a)
      ),
    [emails]
  );
  const total = ordered.length;
  const shown = ordered.slice(0, 6);

  return (
    <Block
      title="Needs your review"
      note={
        loading
          ? undefined
          : total > shown.length
            ? `Showing the ${shown.length} most urgent of ${total}`
            : total > 0
              ? 'Most urgent first'
              : undefined
      }
    >
      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </div>
      ) : total === 0 ? (
        <p className="max-w-[54ch] text-[0.8125rem] leading-relaxed text-muted-foreground">
          Nothing needs your attention right now. Anything that looks like phishing will show up
          here first.
        </p>
      ) : (
        <>
          <div className={cn(QUEUE_GRID, 'border-b border-border px-2.5 pb-2 max-[900px]:hidden')}>
            <span className="text-xs font-medium text-muted-foreground">Sender</span>
            <span className="text-xs font-medium text-muted-foreground">Subject</span>
            <span className="text-xs font-medium text-muted-foreground">Risk</span>
            <span className="text-right text-xs font-medium text-muted-foreground">Received</span>
          </div>

          {shown.map((email) => (
            <QueueRow key={emailId(email)} email={email} />
          ))}

          {total > shown.length && (
            <Link
              to="/inbox?riskBucket=quarantine"
              className="mt-4 inline-block px-2.5 text-xs text-primary hover:underline"
            >
              Open all {total} in the inbox
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
                  val === 0 ? 'text-muted-foreground' : 'text-foreground'
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
  const hasDetections = data.some((d) =>
    TREND_SERIES.some(({ key }) => Number(d?.[key]) > 0)
  );

  return (
    <Block title="Risk over time" note="Flagged messages per day">
      {loading ? (
        <Skeleton className="h-[216px] w-full" />
      ) : data.length === 0 || !hasDetections ? (
        <p className="max-w-[54ch] text-[0.8125rem] leading-relaxed text-muted-foreground">
          No message was flagged on any day in this range, so there is no trend to plot yet.
        </p>
      ) : (
        <>
          <div className="mb-5 flex flex-wrap gap-x-5 gap-y-1.5">
            {TREND_SERIES.map(({ key, name, color }) => (
              <span key={key} className="inline-flex items-center gap-2 text-xs text-muted-foreground">
                <span className="inline-block h-0.5 w-3 rounded-sm" style={{ background: color }} />
                {name}
              </span>
            ))}
          </div>

          <div className="w-full select-none">
            {/* accessibilityLayer={false}: în recharts v3 e activat implicit și
                desenează un chenar de focus în jurul graficului la click. */}
            <ResponsiveContainer width="100%" height={216}>
              <LineChart
                accessibilityLayer={false}
                data={data}
                margin={{ top: 8, right: 4, left: -26, bottom: 0 }}
              >
                <CartesianGrid vertical={false} stroke="var(--color-border)" strokeWidth={1} />
                <XAxis
                  dataKey="date"
                  tickFormatter={tickFormatter}
                  tick={{ fontSize: 11, fill: 'var(--color-muted-foreground)' }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: 'var(--color-muted-foreground)' }}
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
        </>
      )}
    </Block>
  );
}

/* ─── 4. Attacking domains ────────────────────────────────────────────────── */

const DOMAIN_SEGMENTS = [
  { key: 'needsReview', label: 'suspicious', color: CATEGORY_COLORS.suspicious },
  { key: 'quarantine', label: 'likely phishing', color: CATEGORY_COLORS.likely_phishing },
  { key: 'confirmedPhishing', label: 'confirmed', color: CATEGORY_COLORS.confirmed_phishing },
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
        'grid grid-cols-[minmax(0,1fr)_minmax(0,1.7fr)_86px] items-center gap-x-6',
        'max-[780px]:grid-cols-[minmax(0,1fr)_86px] max-[780px]:gap-y-2',
        'rounded-md border-b border-border px-2.5 py-3 outline-none transition-colors',
        'hover:bg-foreground/[0.03] focus-visible:ring-2 focus-visible:ring-primary/50'
      )}
    >
      <div className="truncate text-[0.8125rem] font-medium text-foreground">{sender.domain}</div>

      <div className="min-w-0 max-[780px]:order-3 max-[780px]:col-span-full">
        <div
          className="flex h-[5px] overflow-hidden rounded-sm bg-border"
          style={{ width: `${barWidth}%` }}
        >
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
        <div className="mt-1.5 flex flex-wrap gap-x-3.5 text-xs text-muted-foreground">
          {DOMAIN_SEGMENTS.filter(({ key }) => (sender[key] ?? 0) > 0).map(({ key, label }) => (
            <span key={key}>
              <b className="font-[560] tabular-nums text-foreground">{sender[key]}</b> {label}
            </span>
          ))}
        </div>
      </div>

      <div className="flex items-baseline justify-end gap-1.5">
        <b className="text-[0.9375rem] font-[620] tracking-[-0.024em] tabular-nums text-foreground">
          {total}
        </b>
        <span className="text-xs text-muted-foreground">{plural(total, 'msg', 'msgs')}</span>
      </div>
    </Link>
  );
}

function DomainsBlock({ senders, loading }) {
  const list = Array.isArray(senders) ? senders : [];
  const max = list.reduce((acc, s) => Math.max(acc, s.total || 0), 0);

  return (
    <Block
      title="Where the risky mail came from"
      note={list.length > 0 ? 'Bars are relative to the busiest domain' : undefined}
      last
    >
      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </div>
      ) : list.length === 0 ? (
        <p className="max-w-[54ch] text-[0.8125rem] leading-relaxed text-muted-foreground">
          No domain sent you anything suspicious in this range.
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

  // A new range means a new report — reset the "Sent" confirmation.
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
  const lastSynced = account?.lastSyncedAt;
  const displayName = user?.name || user?.email?.split('@')[0] || 'there';

  // Subtitlul spune ce acoperă pagina: intervalul selectat + cât de proaspete
  // sunt datele. Totul de dedesubt e filtrat pe acel interval.
  const headerDescription = [
    total === 0
      ? `No messages in ${label}`
      : `${scanned} of ${total} ${plural(total, 'message', 'messages')} scanned · ${label}`,
    lastSynced ? `Last synced ${formatDateTime(lastSynced)}` : null,
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <div>
      {/* Global time-range picker — every count and graph below covers the
          selected window. Absolute-state items (Gmail connection, last-synced
          time) are not time-scoped and shown as-is. */}
      <PageHeader
        title={`Welcome back, ${displayName}!`}
        description={headerDescription}
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
              {reportSentTo ? 'Sent' : 'Email me this'}
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
        scanned={scanned}
        safeRate={safeRate}
        periodLabel={label}
      />

      <ReviewQueueBlock emails={risky} loading={riskyQuery.loading} />

      <TrendBlock data={trendData} loading={trendQuery.loading} />

      <DomainsBlock senders={sendersQuery.data} loading={sendersQuery.loading} />
    </div>
  );
}
