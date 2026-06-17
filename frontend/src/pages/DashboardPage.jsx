import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  ScanLine,
  ShieldAlert,
  AlertTriangle,
  ShieldX,
  ArrowRight,
  ShieldCheck,
  Check,
  Globe,
  Crosshair,
  Loader2,
  Send,
  RefreshCw,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

import { DashboardSkeleton, ErrorState, EmptyState, ConnectGmailState } from '@/components/common/states';
import { PageHeader } from '@/components/common/PageHeader';
import { StatCard } from '@/components/dashboard/StatCard';
import { RiskDonut } from '@/components/dashboard/RiskDonut';
import { TopRulesChart } from '@/components/dashboard/TopRulesChart';
import { EmailRow } from '@/components/inbox/EmailRow';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { TimeRangeFilter } from '@/components/common/TimeRangeFilter';
import { useApi } from '@/hooks/useApi';
import { useAuth } from '@/hooks/useAuth';
import { useAsyncAction } from '@/hooks/useAsyncAction';
import { useMailAccount } from '@/context/MailAccountContext';
import { useTimeRange } from '@/context/TimeRangeContext';
import { getEmails, getEmailStats, getEmailTrend, getTopRiskySenders } from '@/api/emailsApi';
import { getReportSummary, sendReportSummary } from '@/api/reportsApi';
import { normalizeEmailList } from '@/lib/email-list';
import { CATEGORY_COLORS, CATEGORY_LABELS, getRuleDescription } from '@/lib/risk';
import { formatDateTime } from '@/utils/formatDate';
import { cn } from '@/lib/utils';

/* ─── Trend chart ─────────────────────────────────────────────────────────── */

const formatAxisDate = (dateStr) => {
  if (!dateStr) return '';
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

// Colours come from the shared CATEGORY_COLORS map so the trend, donut, reports
// and inbox all draw each category in the same hue.
const TREND_SERIES = [
  { key: 'needs_review',       name: CATEGORY_LABELS.suspicious,         color: CATEGORY_COLORS.suspicious,         gradId: 'grad-review' },
  { key: 'quarantine',         name: CATEGORY_LABELS.likely_phishing,    color: CATEGORY_COLORS.likely_phishing,    gradId: 'grad-quarantine' },
  { key: 'confirmed_phishing', name: CATEGORY_LABELS.confirmed_phishing, color: CATEGORY_COLORS.confirmed_phishing, gradId: 'grad-phishing' },
];

function TrendTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  const visible = payload.filter((e) => e.value > 0);
  if (!visible.length) return null;
  return (
    <div className="rounded-lg border border-border bg-card px-3 py-2 text-xs shadow-md">
      <p className="mb-2 font-semibold">{formatAxisDate(label)}</p>
      <div className="space-y-1">
        {TREND_SERIES.map(({ key, name, color }) => {
          const entry = payload.find((e) => e.dataKey === key);
          const val = entry?.value ?? 0;
          return (
            <div key={key} className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-1.5">
                <span className="inline-block h-2 w-2 shrink-0 rounded-full" style={{ background: color }} />
                <span className="text-muted-foreground">{name}</span>
              </div>
              <span className={cn('font-semibold tabular-nums', val === 0 && 'text-muted-foreground-subtle')}>
                {val === 0 ? '—' : val}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ThreatTrendChart({ data }) {
  const tickFormatter = (value, index) => {
    if (index % 5 !== 0) return '';
    return formatAxisDate(value);
  };

  return (
    <div>
      <ResponsiveContainer width="100%" height={200}>
        {/* accessibilityLayer={false}: în recharts v3 e activat implicit și
            desenează un chenar de focus în jurul graficului la click. Îl oprim. */}
        <AreaChart accessibilityLayer={false} data={data} margin={{ top: 4, right: 4, left: -28, bottom: 0 }}>
          <defs>
            {TREND_SERIES.map(({ gradId, color }) => (
              <linearGradient key={gradId} id={gradId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={color} stopOpacity={0.5} />
                <stop offset="100%" stopColor={color} stopOpacity={0.02} />
              </linearGradient>
            ))}
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" strokeOpacity={0.4} />
          <XAxis
            dataKey="date"
            tickFormatter={tickFormatter}
            tick={{ fontSize: 10, fill: 'var(--color-muted-foreground)' }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tick={{ fontSize: 10, fill: 'var(--color-muted-foreground)' }}
            axisLine={false}
            tickLine={false}
            allowDecimals={false}
          />
          <Tooltip content={<TrendTooltip />} />
          {TREND_SERIES.map(({ key, name, color, gradId }) => (
            <Area
              key={key}
              type="monotone"
              dataKey={key}
              name={name}
              stroke={color}
              fill={`url(#${gradId})`}
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4, strokeWidth: 0 }}
            />
          ))}
        </AreaChart>
      </ResponsiveContainer>

      {/* Legend */}
      <div className="mt-3 flex flex-wrap justify-center gap-x-5 gap-y-1.5">
        {TREND_SERIES.map(({ key, name, color }) => (
          <div key={key} className="flex items-center gap-1.5">
            <span className="inline-block h-2.5 w-2.5 shrink-0 rounded-sm" style={{ background: color }} />
            <span className="text-[11px] text-muted-foreground">{name}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── Top risky senders ───────────────────────────────────────────────────── */

const SENDER_SEGMENTS = [
  { key: 'needsReview', label: CATEGORY_LABELS.suspicious, color: CATEGORY_COLORS.suspicious },
  { key: 'quarantine', label: CATEGORY_LABELS.likely_phishing, color: CATEGORY_COLORS.likely_phishing },
  { key: 'confirmedPhishing', label: CATEGORY_LABELS.confirmed_phishing, color: CATEGORY_COLORS.confirmed_phishing },
];

function TopSendersCard({ senders, loading, periodLabel }) {
  const max = Math.max(...(senders?.map((s) => s.total) ?? [0]), 1);

  return (
    <Card className="lg:col-span-2">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Crosshair className="h-4 w-4 text-risk-quarantine" />
          Who is targeting you
        </CardTitle>
        <CardDescription>Domains behind your risky emails — {periodLabel.toLowerCase()}</CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-8 w-full" />
            ))}
          </div>
        ) : !senders?.length ? (
          <div className="flex h-40 flex-col items-center justify-center gap-2 text-center">
            <ShieldCheck className="h-6 w-6 text-risk-safe" />
            <p className="text-sm text-muted-foreground">
              No risky senders in this period.
            </p>
          </div>
        ) : (
          <ul className="space-y-3.5">
            {senders.map((sender) => (
              <li key={sender.domain}>
                <Link
                  to={`/inbox?q=${encodeURIComponent(sender.domain)}`}
                  className="group block"
                  title={`See all emails from ${sender.domain}`}
                >
                  <div className="mb-1 flex items-center justify-between gap-2">
                    <span className="flex min-w-0 items-center gap-1.5 text-sm">
                      <Globe className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                      <span className="truncate font-medium group-hover:text-primary">
                        {sender.domain}
                      </span>
                    </span>
                    <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                      {sender.total} risky
                    </span>
                  </div>
                  {/* Stacked severity bar, scaled against the most active domain */}
                  <div className="flex h-2 w-full gap-px overflow-hidden rounded-full bg-muted/40">
                    {SENDER_SEGMENTS.map(({ key, color }) => {
                      const count = sender[key] ?? 0;
                      if (!count) return null;
                      return (
                        <div
                          key={key}
                          className="h-full rounded-full"
                          style={{
                            width: `${(count / max) * 100}%`,
                            backgroundColor: color,
                          }}
                        />
                      );
                    })}
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}

        {senders?.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1 border-t border-border/60 pt-3">
            {SENDER_SEGMENTS.map(({ key, label, color }) => (
              <span key={key} className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                <span className="h-2 w-2 rounded-sm" style={{ background: color }} />
                {label}
              </span>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/* ─── Posture hero card ───────────────────────────────────────────────────── */

function PostureHero({ attention, safeRate, scanned, lastSynced }) {
  const allClear = attention === 0;

  return (
    <Card
      className="overflow-hidden"
      style={{
        borderLeftWidth: 3,
        borderLeftColor: allClear ? 'var(--color-risk-safe)' : 'var(--color-risk-quarantine)',
      }}
    >
      <CardContent className="p-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div
              className={cn(
                'flex h-10 w-10 items-center justify-center rounded-xl',
                allClear ? 'bg-risk-safe-soft text-risk-safe' : 'bg-risk-quarantine-soft text-risk-quarantine'
              )}
            >
              {allClear ? (
                <ShieldCheck className="h-5 w-5" />
              ) : (
                <ShieldAlert className="h-5 w-5" />
              )}
            </div>
            <div>
              <p className={cn('text-sm font-semibold', allClear ? 'text-risk-safe' : 'text-risk-quarantine')}>
                {allClear
                  ? 'Your inbox is protected'
                  : `${attention} email${attention > 1 ? 's' : ''} need${attention === 1 ? 's' : ''} your review`}
              </p>
              <p className="text-xs text-muted-foreground">
                {allClear
                  ? 'No threats detected right now.'
                  : 'These emails may be phishing attacks. Review them before opening.'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-6 text-right">
            {lastSynced && (
              <div className="hidden sm:block">
                <p className="text-xs text-muted-foreground">Last synced</p>
                <p className="text-xs font-medium">{formatDateTime(lastSynced)}</p>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
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
  // Report data for the active range — feeds the "Most common warning signs"
  // card and the "Email me this report" action (merged from the Reports page).
  const reportQuery = useApi(
    () => getReportSummary({ from, to, label }),
    [syncVersion, from, to],
    `dash-report-${from}-${to}-${syncVersion}`
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
  const trendData = trendQuery.data || [];

  const safeCount = (counts.safe || 0) + (counts.reviewed_safe || 0);
  const scanned = total - (counts.unscanned || 0);

  const donutData = [
    { name: CATEGORY_LABELS.safe, value: safeCount, color: CATEGORY_COLORS.safe },
    { name: CATEGORY_LABELS.suspicious, value: counts.needs_review || 0, color: CATEGORY_COLORS.suspicious },
    { name: CATEGORY_LABELS.likely_phishing, value: counts.quarantine || 0, color: CATEGORY_COLORS.likely_phishing },
    { name: CATEGORY_LABELS.confirmed_phishing, value: counts.confirmed_phishing || 0, color: CATEGORY_COLORS.confirmed_phishing },
  ];
  const safeRate = scanned > 0 ? Math.round((safeCount / scanned) * 100) : 0;
  const attention = counts.quarantine ?? 0;
  const lastSynced = account?.lastSyncedAt;
  const displayName = user?.name || user?.email?.split('@')[0] || 'there';

  return (
    <div className="space-y-4">
      {/* Global time-range picker — every stat, count and graph below covers
          the selected window, and the same range scopes the inbox and the
          emailed report. Absolute-state items (Gmail connection, last-synced
          time) are not time-scoped and shown as-is. */}
      <PageHeader
        title={`Welcome back, ${displayName}!`}
        className="mb-8"
        titleClassName="text-[1.625rem] font-semibold tracking-tight"
        actions={
          <>
            <Button variant="outline" className="h-[34px]" style={{ borderColor: '#2d3a5e' }} onClick={handleSendReport} disabled={sendReport.loading}>
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
            <Button variant="outline" className="h-[34px]" style={{ borderColor: '#2d3a5e' }} onClick={sync} disabled={syncing}>
              {syncing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              {syncing ? 'Refreshing…' : 'Refresh'}
            </Button>
          </>
        }
      />

      {/* Security posture hero — full width */}
      <PostureHero
        attention={attention}
        safeRate={safeRate}
        scanned={scanned}
        lastSynced={lastSynced}
      />

      {/* 4 stat cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          icon={ScanLine}
          label="Messages"
          value={total}
          hint={scanned >= total ? 'All scanned' : `${total - scanned} not scanned yet`}
          tone="text-primary"
          to="/inbox"
        />
        <StatCard
          icon={ShieldAlert}
          label="Likely phishing"
          value={counts.quarantine ?? 0}
          hint="High-confidence threats"
          tone="text-risk-quarantine"
          to="/inbox?riskBucket=quarantine"
        />
        <StatCard
          icon={AlertTriangle}
          label="Suspicious"
          value={counts.needs_review ?? 0}
          hint="Possible threats"
          tone="text-risk-review"
          to="/inbox?riskBucket=needs_review"
        />
        <StatCard
          icon={ShieldX}
          label="Confirmed phishing"
          value={counts.confirmed_phishing ?? 0}
          hint="Marked by you"
          tone="text-risk-phishing"
          to="/inbox?riskBucket=confirmed_phishing"
        />
      </div>

      {/* Trend chart (3/5) + Risk donut (2/5) */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
        <Card className="lg:col-span-3 select-none">
          <CardHeader>
            <CardTitle>Threat activity — {label.toLowerCase()}</CardTitle>
            <CardDescription>Suspicious, likely phishing &amp; confirmed phishing per day</CardDescription>
          </CardHeader>
          <CardContent>
            {trendQuery.loading ? (
              <Skeleton className="h-48 w-full" />
            ) : trendData.length > 0 ? (
              <ThreatTrendChart data={trendData} />
            ) : (
              <div className="flex h-48 items-center justify-center text-sm text-muted-foreground">
                No trend data yet
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Risk breakdown</CardTitle>
            <CardDescription>Across {scanned} scanned messages</CardDescription>
          </CardHeader>
          <CardContent>
            <RiskDonut data={donutData} centerValue={`${safeRate}%`} centerLabel="safe" />
          </CardContent>
        </Card>
      </div>

      {/* Top risky senders (2/5) + Needs attention (3/5) */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
      <TopSendersCard senders={sendersQuery.data} loading={sendersQuery.loading} periodLabel={label} />

      <Card className="lg:col-span-3">
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <CardTitle>Needs your attention</CardTitle>
          <Button asChild variant="ghost" size="sm">
            <Link to="/inbox?riskBucket=quarantine">
              View all <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </CardHeader>
        <CardContent className="px-0 pb-2">
          {riskyQuery.loading ? (
            <div className="divide-y divide-border/60 px-5">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3 py-3">
                  <Skeleton className="h-9 w-9 shrink-0 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-3 w-40" />
                    <Skeleton className="h-3 w-56" />
                  </div>
                </div>
              ))}
            </div>
          ) : risky.length === 0 ? (
            <EmptyState
              icon={ShieldCheck}
              title="All clear"
              description="No risky messages right now."
              className="mx-5 border-0 py-10"
            />
          ) : (
            <div className="divide-y divide-border/60">
              {risky.slice(0, 5).map((email) => (
                <EmailRow key={email.id || email._id} email={email} compact />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
      </div>

      {/* Most common warning signs — merged from the old Reports page */}
      <Card>
        <CardHeader>
          <CardTitle>Most common warning signs</CardTitle>
          <CardDescription>
            The warning signs found most often in your scanned emails — {label.toLowerCase()}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {reportQuery.loading ? (
            <Skeleton className="h-40 w-full" />
          ) : reportQuery.error ? (
            <p className="text-sm text-muted-foreground">
              Could not load the warning signs for this period.
            </p>
          ) : (
            <>
              <TopRulesChart rules={reportQuery.data?.topTriggeredRules} />

              {/* Rule legend */}
              {reportQuery.data?.topTriggeredRules?.length > 0 && (
                <div className="border-t border-border/60 pt-3">
                  <p className="mb-2 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                    What these mean
                  </p>
                  <ul className="space-y-1.5">
                    {reportQuery.data.topTriggeredRules.slice(0, 6).map((rule) => (
                      <li key={rule.rule} className="flex gap-2 text-xs text-muted-foreground">
                        <span className="mt-px h-1.5 w-1.5 shrink-0 translate-y-[0.2rem] rounded-full bg-muted-foreground/50" />
                        <span>{getRuleDescription(rule.rule)}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
