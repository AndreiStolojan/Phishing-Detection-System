import { useState } from 'react';
import { Send, Loader2, Mail } from 'lucide-react';
import { toast } from 'sonner';

import { LoadingState, ErrorState } from '@/components/common/states';
import { StatCard } from '@/components/dashboard/StatCard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { TopRulesChart } from '@/components/reports/TopRulesChart';
import { useApi } from '@/hooks/useApi';
import { useAsyncAction } from '@/hooks/useAsyncAction';
import { getMonthlySummary, sendMonthlySummary } from '@/api/reportsApi';
import {
  ScanLine,
  ShieldCheck,
  AlertTriangle,
  ShieldAlert,
  ShieldX,
} from 'lucide-react';

const currentMonth = () => new Date().toISOString().slice(0, 7);

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
  const { data, loading, error, reload } = useApi(
    () => getMonthlySummary(month),
    [month],
    `report-${month}`
  );
  const send = useAsyncAction(sendMonthlySummary);

  const handleSend = async () => {
    try {
      const result = await send.run(month);
      if (result?.sent) {
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
      <div className="flex flex-wrap items-end justify-end gap-2">
        <div className="space-y-1">
          <Label htmlFor="month" className="text-xs text-muted-foreground">
            Month
          </Label>
          <Input
            id="month"
            type="month"
            value={month}
            max={currentMonth()}
            onChange={(e) => setMonth(e.target.value || currentMonth())}
            className="h-9 w-40"
          />
        </div>
        <Button onClick={handleSend} disabled={send.loading} variant="outline">
          {send.loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
          Email me this report
        </Button>
      </div>

      {send.error && <ErrorState message={send.error} className="py-6" />}

      {loading ? (
        <LoadingState label="Building your report…" />
      ) : error ? (
        <ErrorState message={error} onRetry={reload} />
      ) : (
        <div className="grid gap-4 lg:grid-cols-5">
          {/* Summary as stat cards */}
          <div className="lg:col-span-2 space-y-3 content-start">
            <div className="grid grid-cols-2 gap-3">
              {SYNC_STATS.map((row, i) => (
                <StatCard
                  key={row.key}
                  icon={row.icon}
                  label={row.label}
                  value={counts[row.key] ?? 0}
                  tone={row.tone}
                  staggerIndex={i}
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
                  staggerIndex={i + 2}
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
                    <p className="text-xl font-semibold tabular-nums text-risk-review">
                      {ai.failed ?? 0}
                    </p>
                    <p className="text-xs font-medium text-muted-foreground">Failed</p>
                    <p className="mt-0.5 text-[11px] text-muted-foreground/60">Ollama unavailable</p>
                  </div>
                  <div>
                    <p className="text-xl font-semibold tabular-nums text-muted-foreground">
                      {ai.disabled ?? 0}
                    </p>
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
