import { useState } from 'react';
import {
  Send,
  Loader2,
  Mail,
  Check,
  ChevronLeft,
  ChevronRight,
  ScanLine,
  ShieldCheck,
  AlertTriangle,
  ShieldAlert,
  ShieldX,
} from 'lucide-react';
import { toast } from 'sonner';

import { ReportsSkeleton, ErrorState } from '@/components/common/states';
import { PageHeader } from '@/components/common/PageHeader';
import { StatCard } from '@/components/dashboard/StatCard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { TopRulesChart } from '@/components/reports/TopRulesChart';
import { useApi } from '@/hooks/useApi';
import { useAsyncAction } from '@/hooks/useAsyncAction';
import { getMonthlySummary, sendMonthlySummary } from '@/api/reportsApi';

const currentMonth = () => new Date().toISOString().slice(0, 7);

const shiftMonth = (m, delta) => {
  const [y, mo] = m.split('-').map(Number);
  const d = new Date(y, mo - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
};

const monthLabel = (m) => {
  const [y, mo] = m.split('-').map(Number);
  return new Date(y, mo - 1, 1).toLocaleString('en', { month: 'long', year: 'numeric' });
};

const SYNC_STATS = [
  { key: 'syncedEmails', label: 'Synced', icon: Mail, tone: 'text-primary' },
  { key: 'scannedEmails', label: 'Scanned', icon: ScanLine, tone: 'text-primary' },
];

const RISK_STATS = [
  { key: 'safe', label: 'Safe', icon: ShieldCheck, tone: 'text-risk-safe' },
  { key: 'suspicious', label: 'Suspicious', icon: AlertTriangle, tone: 'text-risk-review' },
  { key: 'likelyPhishing', label: 'Likely phishing', icon: ShieldAlert, tone: 'text-risk-quarantine' },
  { key: 'markedPhishing', label: 'Confirmed phishing', icon: ShieldX, tone: 'text-risk-phishing' },
];

export function ReportsPage() {
  const [month, setMonth] = useState(currentMonth());
  const [sentTo, setSentTo] = useState(null);
  const { data, loading, error, reload } = useApi(
    () => getMonthlySummary(month),
    [month],
    `report-${month}`
  );
  const send = useAsyncAction(sendMonthlySummary);
  const atCurrentMonth = month >= currentMonth();

  const handleSend = async () => {
    try {
      const result = await send.run(month);
      if (result?.sent) {
        setSentTo(result.recipient);
        toast.success(`Report sent to ${result.recipient}`);
      }
    } catch (err) {
      toast.error(err?.message || 'Failed to send report. Check your email settings.');
    }
  };

  const counts = data?.counts || {};
  const ai = data?.ai || {};

  return (
    <>
      <PageHeader
        eyebrow="Monthly report"
        title={monthLabel(month)}
        description="Security summary for the messages synced and scanned this month."
        actions={
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-0.5 rounded-lg border border-border p-0.5">
              <Button variant="ghost" size="icon-sm" onClick={() => setMonth(shiftMonth(month, -1))} title="Previous month">
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="min-w-[7.5rem] text-center text-sm font-medium">{monthLabel(month)}</span>
              <Button
                variant="ghost"
                size="icon-sm"
                disabled={atCurrentMonth}
                onClick={() => setMonth(shiftMonth(month, 1))}
                title="Next month"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
            <Button onClick={handleSend} disabled={send.loading} variant="outline">
              {send.loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : sentTo ? (
                <Check className="h-4 w-4 text-risk-safe" />
              ) : (
                <Send className="h-4 w-4" />
              )}
              {sentTo ? 'Emailed' : 'Email me this report'}
            </Button>
          </div>
        }
      />

      {sentTo && (
        <p className="text-xs text-muted-foreground">
          Last emailed to <span className="text-foreground/80">{sentTo}</span>.
        </p>
      )}

      {loading ? (
        <ReportsSkeleton />
      ) : error ? (
        <ErrorState message={error} onRetry={reload} />
      ) : (
        <div className="grid gap-4 lg:grid-cols-5">
          {/* Summary as stat cards */}
          <div className="content-start space-y-3 lg:col-span-2">
            <div className="grid grid-cols-2 gap-3">
              {SYNC_STATS.map((row, i) => (
                <StatCard
                  key={row.key}
                  icon={row.icon}
                  label={row.label}
                  value={counts[row.key] ?? 0}
                  tone={row.tone}
                  index={i}
                />
              ))}
            </div>
            <div className="grid grid-cols-2 gap-3">
              {RISK_STATS.map((row, i) => (
                <StatCard
                  key={row.key}
                  icon={row.icon}
                  label={row.label}
                  value={counts[row.key] ?? 0}
                  tone={row.tone}
                  index={i + 2}
                />
              ))}
            </div>
          </div>

          <div className="space-y-4 lg:col-span-3">
            <Card>
              <CardHeader>
                <CardTitle>Top triggered rules</CardTitle>
              </CardHeader>
              <CardContent>
                <TopRulesChart rules={data?.topTriggeredRules} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex-row items-center gap-2 space-y-0">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <CardTitle className="text-sm">AI analysis</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <p className="text-xl font-semibold tabular-nums">{ai.evaluated ?? 0}</p>
                    <p className="text-xs font-medium text-muted-foreground">Evaluated</p>
                    <p className="mt-0.5 text-[11px] text-muted-foreground/60">by Ollama</p>
                  </div>
                  <div>
                    {/* Infra status — kept neutral, not a risk colour */}
                    <p className="text-xl font-semibold tabular-nums text-foreground/80">{ai.failed ?? 0}</p>
                    <p className="text-xs font-medium text-muted-foreground">Failed</p>
                    <p className="mt-0.5 text-[11px] text-muted-foreground/60">Ollama unavailable</p>
                  </div>
                  <div>
                    <p className="text-xl font-semibold tabular-nums text-muted-foreground">{ai.disabled ?? 0}</p>
                    <p className="text-xs font-medium text-muted-foreground">Skipped</p>
                    <p className="mt-0.5 text-[11px] text-muted-foreground/60">AI turned off</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </>
  );
}
