import { useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  ScanLine,
  ShieldAlert,
  AlertTriangle,
  ShieldX,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react';
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
import { StatCard } from '@/components/dashboard/StatCard';
import { RiskDonut } from '@/components/dashboard/RiskDonut';
import { EmailRow } from '@/components/inbox/EmailRow';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useApi } from '@/hooks/useApi';
import { useMailAccount } from '@/context/MailAccountContext';
import { getEmails, getEmailStats, getEmailTrend } from '@/api/emailsApi';
import { normalizeEmailList } from '@/lib/email-list';
import { formatDateTime } from '@/utils/formatDate';
import { cn } from '@/lib/utils';

/* ─── Trend chart ─────────────────────────────────────────────────────────── */

const formatAxisDate = (dateStr) => {
  if (!dateStr) return '';
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

const TREND_SERIES = [
  { key: 'needs_review',       name: 'Suspicious',         color: 'var(--color-risk-review)',      gradId: 'grad-review' },
  { key: 'quarantine',         name: 'Likely phishing',    color: 'var(--color-risk-quarantine)',  gradId: 'grad-quarantine' },
  { key: 'confirmed_phishing', name: 'Confirmed phishing', color: 'var(--color-risk-phishing)',    gradId: 'grad-phishing' },
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
              <span className={cn('font-semibold tabular-nums', val === 0 && 'text-muted-foreground/50')}>
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
        <AreaChart data={data} margin={{ top: 4, right: 4, left: -28, bottom: 0 }}>
          <defs>
            {TREND_SERIES.map(({ gradId, color }) => (
              <linearGradient key={gradId} id={gradId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={color} stopOpacity={0.35} />
                <stop offset="100%" stopColor={color} stopOpacity={0} />
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
                {allClear ? 'Your inbox is protected' : `${attention} email${attention > 1 ? 's' : ''} need your review`}
              </p>
              <p className="text-xs text-muted-foreground">
                {allClear
                  ? 'No threats detected right now.'
                  : 'These emails may be phishing attacks. Review them before opening.'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-6 text-right">
            <div>
              <p className="text-lg font-bold tabular-nums text-risk-safe">{safeRate}%</p>
              <p className="text-[11px] text-muted-foreground">safe rate</p>
            </div>
            <div>
              <p className="text-lg font-bold tabular-nums">{scanned}</p>
              <p className="text-[11px] text-muted-foreground">scanned</p>
            </div>
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
  const { account, isConnected, syncVersion } = useMailAccount();
  const [searchParams, setSearchParams] = useSearchParams();

  const statsQuery = useApi(() => getEmailStats(), [syncVersion], `dash-stats-${syncVersion}`);
  const riskyQuery = useApi(
    () => getEmails({ riskBucket: 'quarantine' }),
    [syncVersion],
    `risky-${syncVersion}`
  );
  const trendQuery = useApi(
    () => getEmailTrend(),
    [syncVersion],
    `dash-trend-${syncVersion}`
  );

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
    { name: 'Safe', value: safeCount, color: 'var(--color-risk-safe)' },
    { name: 'Suspicious', value: counts.needs_review || 0, color: 'var(--color-risk-review)' },
    { name: 'Likely phishing', value: counts.quarantine || 0, color: 'var(--color-risk-quarantine)' },
    { name: 'Confirmed phishing', value: counts.confirmed_phishing || 0, color: 'var(--color-risk-phishing)' },
  ];
  const safeRate = scanned > 0 ? Math.round((safeCount / scanned) * 100) : 0;
  const attention = counts.quarantine ?? 0;
  const lastSynced = account?.lastSyncedAt;

  return (
    <div className="space-y-4">
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
          hint={`${scanned} scanned`}
          tone="text-primary"
          to="/inbox"
        />
        <StatCard
          icon={ShieldAlert}
          label="Likely phishing"
          value={counts.quarantine ?? 0}
          hint="Awaiting your review"
          tone="text-risk-quarantine"
          to="/inbox?riskBucket=quarantine"
        />
        <StatCard
          icon={AlertTriangle}
          label="Suspicious"
          value={counts.needs_review ?? 0}
          hint="Needs review"
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
      <div className="grid gap-4 lg:grid-cols-5">
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle>Threat activity — 30 days</CardTitle>
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

      {/* Needs attention — full width */}
      <Card>
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
  );
}
