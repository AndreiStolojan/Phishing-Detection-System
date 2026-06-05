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
      <>
        <Card>
          <CardContent className="flex flex-col items-center gap-4 py-14 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/15 text-primary">
              <ShieldCheck className="h-7 w-7" />
            </div>
            <div className="space-y-1">
              <h3 className="text-lg font-semibold">Connect your Gmail to get started</h3>
              <p className="max-w-md text-sm text-muted-foreground">
                XAI Phishing Shield syncs your inbox, scans every message for phishing signals,
                and keeps a security overlay on top — no need to open Gmail.
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
      </>
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

  const lastSynced = account?.lastSyncedAt;

  return (
    <>
      {/* Stat cards with staggered entrance */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          icon={ScanLine}
          label="Scanned"
          value={counts.scannedEmails ?? 0}
          hint={`${counts.syncedEmails ?? 0} synced`}
          tone="text-primary"
          staggerIndex={0}
        />
        <StatCard
          icon={ShieldAlert}
          label="Likely phishing"
          value={counts.quarantined ?? 0}
          hint="In quarantine"
          tone="text-risk-quarantine"
          staggerIndex={1}
        />
        <StatCard
          icon={AlertTriangle}
          label="Suspicious"
          value={counts.suspicious ?? 0}
          hint="Needs review"
          tone="text-risk-review"
          staggerIndex={2}
        />
        <StatCard
          icon={ShieldX}
          label="Confirmed"
          value={counts.markedPhishing ?? 0}
          hint="Marked by you"
          tone="text-risk-phishing"
          staggerIndex={3}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-5">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Risk breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            <RiskDonut data={donutData} />
          </CardContent>
        </Card>

        {/* "Needs your attention" */}
        <Card className="lg:col-span-3">
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <div>
              <CardTitle>Needs your attention</CardTitle>
              {lastSynced && (
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Last sync: {formatDateTime(lastSynced)}
                </p>
              )}
            </div>
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
                  <div key={i} className="py-3 space-y-2">
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
                {risky.slice(0, 5).map((email) => (
                  <EmailRow key={email.id || email._id} email={email} />
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
