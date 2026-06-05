import { useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ScanLine,
  ShieldAlert,
  AlertTriangle,
  ShieldX,
  Mail,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react';

import { DashboardSkeleton, ErrorState, EmptyState } from '@/components/common/states';
import { StatCard } from '@/components/dashboard/StatCard';
import { RiskDonut } from '@/components/dashboard/RiskDonut';
import { EmailRow } from '@/components/inbox/EmailRow';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useApi } from '@/hooks/useApi';
import { useMailAccount } from '@/context/MailAccountContext';
import { getMonthlySummary } from '@/api/reportsApi';
import { getEmails } from '@/api/emailsApi';
import { normalizeEmailList } from '@/lib/email-list';
import { formatDateTime } from '@/utils/formatDate';
import { springSoft } from '@/lib/motion';
import { cn } from '@/lib/utils';

function PostureHero({ attention, lastSync }) {
  const safe = attention === 0;
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={springSoft}
      className={cn(
        'relative overflow-hidden rounded-2xl border px-6 py-7',
        safe ? 'border-risk-safe/25 bg-risk-safe-soft' : 'border-risk-quarantine/30 bg-risk-quarantine-soft'
      )}
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <span
          className={cn(
            'flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl',
            safe ? 'bg-risk-safe/15 text-risk-safe' : 'bg-risk-quarantine/15 text-risk-quarantine'
          )}
        >
          {safe ? <ShieldCheck className="h-7 w-7" /> : <ShieldAlert className="h-7 w-7" />}
        </span>
        <div className="min-w-0 flex-1">
          <h1
            className={cn(
              'text-h2 font-semibold sm:text-h1',
              safe ? 'text-risk-safe' : 'text-risk-quarantine'
            )}
          >
            {safe
              ? "You're protected"
              : `${attention} message${attention > 1 ? 's' : ''} need${attention > 1 ? '' : 's'} your attention`}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {safe
              ? 'No high-risk messages right now.'
              : 'Likely phishing detected in your inbox — review and act.'}
            {lastSync && ` · Last sync ${formatDateTime(lastSync)}`}
          </p>
        </div>
        {!safe && (
          <Button asChild className="shrink-0">
            <Link to="/inbox?riskBucket=quarantine">
              Review now <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        )}
      </div>
    </motion.div>
  );
}

export function DashboardPage() {
  const { account, isConnected, syncVersion } = useMailAccount();
  const [searchParams, setSearchParams] = useSearchParams();

  const summaryQuery = useApi(() => getMonthlySummary(), [syncVersion], `summary-${syncVersion}`);
  const riskyQuery = useApi(
    () => getEmails({ riskBucket: 'quarantine' }),
    [syncVersion],
    `risky-${syncVersion}`
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

  if (!isConnected) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-4 py-14 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/15 text-primary">
            <ShieldCheck className="h-7 w-7" />
          </div>
          <div className="space-y-1">
            <h3 className="text-h3 font-semibold">Connect your Gmail to get started</h3>
            <p className="max-w-md text-sm text-muted-foreground">
              SecureInbox syncs your inbox, scans every message for phishing signals, and keeps a
              security overlay on top — no need to open Gmail.
            </p>
          </div>
          <Button asChild>
            <Link to="/settings">
              <Mail className="h-4 w-4" />
              Connect Gmail
            </Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (summaryQuery.loading) return <DashboardSkeleton />;
  if (summaryQuery.error)
    return <ErrorState message={summaryQuery.error} onRetry={summaryQuery.reload} />;

  const counts = summaryQuery.data?.counts || {};
  const risky = normalizeEmailList(riskyQuery.data);

  const donutData = [
    { name: 'Safe', value: counts.safe || 0, color: 'var(--color-risk-safe)' },
    { name: 'Suspicious', value: counts.suspicious || 0, color: 'var(--color-risk-review)' },
    { name: 'Likely phishing', value: counts.likelyPhishing || 0, color: 'var(--color-risk-quarantine)' },
    { name: 'Confirmed phishing', value: counts.markedPhishing || 0, color: 'var(--color-risk-phishing)' },
  ];
  const donutTotal = donutData.reduce((sum, d) => sum + d.value, 0);
  const safeRate = donutTotal > 0 ? Math.round(((counts.safe || 0) / donutTotal) * 100) : 0;
  const attention = counts.quarantined ?? 0;
  const lastSynced = account?.lastSyncedAt;

  return (
    <>
      <PostureHero attention={attention} lastSync={lastSynced} />

      <div className="grid gap-4 lg:grid-cols-5">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Risk breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            <RiskDonut data={donutData} centerValue={`${safeRate}%`} centerLabel="safe" />
          </CardContent>
        </Card>

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
              <div className="space-y-0 divide-y divide-border/60 px-5 py-2">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="space-y-2 py-3">
                    <div className="h-3 w-40 animate-pulse rounded bg-muted/70" />
                    <div className="h-3 w-56 animate-pulse rounded bg-muted/70" />
                  </div>
                ))}
              </div>
            ) : risky.length === 0 ? (
              <EmptyState
                icon={ShieldCheck}
                title="All clear"
                description="No quarantined messages right now."
                className="mx-5 border-0 py-10"
              />
            ) : (
              <div className="divide-y divide-border/60">
                {risky.slice(0, 5).map((email, i) => (
                  <EmailRow key={email.id || email._id} email={email} index={i} compact />
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Secondary breakdown — quick links into the inbox filters */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          icon={ScanLine}
          label="Scanned"
          value={counts.scannedEmails ?? 0}
          hint={`${counts.syncedEmails ?? 0} synced`}
          tone="text-primary"
          index={0}
        />
        <StatCard
          icon={ShieldAlert}
          label="Likely phishing"
          value={counts.quarantined ?? 0}
          hint="In quarantine"
          tone="text-risk-quarantine"
          to="/inbox?riskBucket=quarantine"
          index={1}
        />
        <StatCard
          icon={AlertTriangle}
          label="Suspicious"
          value={counts.suspicious ?? 0}
          hint="Needs review"
          tone="text-risk-review"
          to="/inbox?riskBucket=needs_review"
          index={2}
        />
        <StatCard
          icon={ShieldX}
          label="Confirmed"
          value={counts.markedPhishing ?? 0}
          hint="Marked by you"
          tone="text-risk-phishing"
          to="/inbox?riskBucket=confirmed_phishing"
          index={3}
        />
      </div>
    </>
  );
}
