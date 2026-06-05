import { useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
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
import { PageHeader } from '@/components/common/PageHeader';
import { StatCard } from '@/components/dashboard/StatCard';
import { RiskDonut } from '@/components/dashboard/RiskDonut';
import { EmailRow } from '@/components/inbox/EmailRow';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useApi } from '@/hooks/useApi';
import { useMailAccount } from '@/context/MailAccountContext';
import { getEmails, getEmailStats } from '@/api/emailsApi';
import { normalizeEmailList } from '@/lib/email-list';
import { formatDateTime } from '@/utils/formatDate';

export function DashboardPage() {
  const { account, isConnected, syncVersion } = useMailAccount();
  const [searchParams, setSearchParams] = useSearchParams();

  const statsQuery = useApi(() => getEmailStats(), [syncVersion], `dash-stats-${syncVersion}`);
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

  if (statsQuery.loading) return <DashboardSkeleton />;
  if (statsQuery.error)
    return <ErrorState message={statsQuery.error} onRetry={statsQuery.reload} />;

  const counts = statsQuery.data?.counts || {};
  const total = statsQuery.data?.total ?? 0;
  const risky = normalizeEmailList(riskyQuery.data);

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
    <>
      <PageHeader
        title="Overview"
        description={
          lastSynced
            ? `Your inbox · last synced ${formatDateTime(lastSynced)}`
            : 'Your inbox security at a glance'
        }
        actions={
          attention > 0 ? (
            <Button
              asChild
              variant="outline"
              size="sm"
              className="border-risk-quarantine/40 text-risk-quarantine hover:bg-risk-quarantine-soft hover:text-risk-quarantine"
            >
              <Link to="/inbox?riskBucket=quarantine">
                <ShieldAlert className="h-4 w-4" />
                {attention} need{attention > 1 ? '' : 's'} attention
              </Link>
            </Button>
          ) : (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-risk-safe/30 bg-risk-safe-soft px-3 py-1.5 text-xs font-medium text-risk-safe">
              <ShieldCheck className="h-3.5 w-3.5" />
              All clear
            </span>
          )
        }
      />

      {/* Key numbers — live, across your whole inbox */}
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
          hint="In quarantine"
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
          label="Confirmed"
          value={counts.confirmed_phishing ?? 0}
          hint="Marked by you"
          tone="text-risk-phishing"
          to="/inbox?riskBucket=confirmed_phishing"
        />
      </div>

      {/* Breakdown + attention */}
      <div className="grid gap-4 lg:grid-cols-5">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Risk breakdown</CardTitle>
            <CardDescription>Across {scanned} scanned messages</CardDescription>
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
                description="No quarantined messages right now."
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
    </>
  );
}
