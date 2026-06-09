import { useState } from 'react';
import {
  Send,
  Loader2,
  Check,
  ChevronLeft,
  ChevronRight,
  Bot,
  ShieldCheck,
} from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';

import { ReportsSkeleton, ErrorState } from '@/components/common/states';
import { PageHeader } from '@/components/common/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { TopRulesChart } from '@/components/reports/TopRulesChart';
import { DetectionFunnel } from '@/components/reports/DetectionFunnel';
import { RiskBreakdownBar } from '@/components/reports/RiskBreakdownBar';
import { useApi } from '@/hooks/useApi';
import { useAsyncAction } from '@/hooks/useAsyncAction';
import { getMonthlySummary, sendMonthlySummary } from '@/api/reportsApi';
import { cn } from '@/lib/utils';
import { springSoft } from '@/lib/motion';

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

/** Safe rate KPI — color thresholds: ≥80% green, ≥50% amber, else rose. */
function safeRateColor(pct) {
  if (pct >= 80) return 'text-risk-safe';
  if (pct >= 50) return 'text-risk-review';
  return 'text-risk-phishing';
}

/**
 * Short, human-readable descriptions for the most common rule keys.
 * Falls back to a humanized version for anything not listed.
 */
const RULE_DESCRIPTIONS = {
  reply_to_mismatch: 'Reply address differs from the sender — a common phishing trick',
  shortened_url_detected: 'Email contains shortened links that hide the real destination',
  too_many_links_high: 'Unusually high number of links in the message',
  too_many_links_medium: 'Higher than normal number of links in the message',
  high_risk_attachment_extension: 'Attachment has a file type that could be used to install malware (.exe, .bat, etc.)',
  archive_attachment_extension: 'Attachment is a compressed archive that may hide malicious files (.zip, .rar, etc.)',
  'ai_semantic:urgency_high': 'AI detected language designed to create panic and rush you into acting',
  'ai_semantic:urgency_medium': 'AI detected words pressuring you to act immediately',
  'ai_semantic:social_engineering_high': 'AI detected manipulative tactics — using fear, authority, or rewards to trick you',
  'ai_semantic:social_engineering_medium': 'AI detected some manipulation tactics in the email',
  'ai_semantic:login_or_action_request': 'AI detected language pushing you to click a link or sign in right away',
  'ai_semantic:sensitive_data_request': 'AI detected a request for your password, payment details, or personal codes',
  'ai_semantic:brand_impersonation_suspected': 'AI suspects this email is impersonating a company or brand you know',
};

function humanizeRule(rule) {
  const key = String(rule || '');
  if (RULE_DESCRIPTIONS[key]) return RULE_DESCRIPTIONS[key];
  // For dynamic keys like suspicious_link_pattern:<pattern>
  if (key.startsWith('suspicious_link_pattern:')) {
    const pattern = key.split(':')[1] || '';
    return `Link matches suspicious pattern${pattern ? `: ${pattern}` : ''}`;
  }
  // Generic fallback: snake_case → Title Case
  return key
    .replace(/[_:]/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

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

  const scanned = counts.scannedEmails ?? 0;
  const safe = counts.safe ?? 0;
  const threats = (counts.suspicious ?? 0) + (counts.likelyPhishing ?? 0) + (counts.markedPhishing ?? 0);
  const confirmed = counts.markedPhishing ?? 0;

  const safeRate = scanned > 0 ? Math.round((safe / scanned) * 100) : null;
  const aiAnalyzedPct =
    scanned > 0 ? Math.round(((ai.evaluated ?? 0) / scanned) * 100) : null;

  return (
    <div className="space-y-4">
      <PageHeader
        eyebrow="Monthly report"
        title={monthLabel(month)}
        description="Security audit for the messages synced and scanned this month."
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
        <div className="space-y-4">
          {/* Row 1: Detection funnel + Safe-rate KPI */}
          <div className="grid gap-4 lg:grid-cols-3">
            {/* Detection funnel */}
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={springSoft}
              className="lg:col-span-2"
            >
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Detection funnel</CardTitle>
                  <p className="text-xs text-muted-foreground">
                    From inbox sync to confirmed threats — this is how your month looked.
                  </p>
                </CardHeader>
                <CardContent>
                  <DetectionFunnel
                    synced={counts.syncedEmails}
                    scanned={counts.scannedEmails}
                    threats={threats}
                    confirmed={confirmed}
                  />
                </CardContent>
              </Card>
            </motion.div>

            {/* Safe-rate KPI */}
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ ...springSoft, delay: 0.07 }}
            >
              <Card className="flex h-full flex-col items-center justify-center py-6 text-center">
                <div className="mb-1 rounded-lg bg-risk-safe-soft p-2.5">
                  <ShieldCheck className="h-5 w-5 text-risk-safe" />
                </div>
                {safeRate === null ? (
                  <p className="mt-3 text-sm text-muted-foreground">No scanned emails</p>
                ) : (
                  <>
                    <span
                      className={cn(
                        'mt-2 text-5xl font-bold tabular-nums leading-none',
                        safeRateColor(safeRate)
                      )}
                    >
                      {safeRate}%
                    </span>
                    <p className="mt-1.5 text-sm font-medium text-foreground/80">Safe rate</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {safe} of {scanned} scanned emails were safe
                    </p>
                  </>
                )}
              </Card>
            </motion.div>
          </div>

          {/* Row 2: Risk breakdown */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ...springSoft, delay: 0.1 }}
          >
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Risk breakdown</CardTitle>
                <p className="text-xs text-muted-foreground">
                  Proportion of each verdict across all scanned emails this month.
                </p>
              </CardHeader>
              <CardContent>
                <RiskBreakdownBar counts={counts} />
              </CardContent>
            </Card>
          </motion.div>

          {/* Row 3: Top rules + AI analysis */}
          <div className="grid gap-4 lg:grid-cols-5">
            {/* Top triggered rules */}
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ ...springSoft, delay: 0.13 }}
              className="lg:col-span-3"
            >
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Top triggered rules</CardTitle>
                  <p className="text-xs text-muted-foreground">
                    Detection rules that fired most often on scanned emails.
                  </p>
                </CardHeader>
                <CardContent className="space-y-4">
                  <TopRulesChart rules={data?.topTriggeredRules} />

                  {/* Rule legend */}
                  {data?.topTriggeredRules?.length > 0 && (
                    <div className="border-t border-border/60 pt-3">
                      <p className="mb-2 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                        What these mean
                      </p>
                      <ul className="space-y-1.5">
                        {data.topTriggeredRules.slice(0, 6).map((r) => (
                          <li key={r.rule} className="flex gap-2 text-xs text-muted-foreground">
                            <span className="mt-px h-1.5 w-1.5 shrink-0 translate-y-[0.2rem] rounded-full bg-muted-foreground/50" />
                            <span>{humanizeRule(r.rule)}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>

            {/* AI analysis */}
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ ...springSoft, delay: 0.16 }}
              className="lg:col-span-2"
            >
              <Card className="h-full">
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <Bot className="h-4 w-4 text-muted-foreground" />
                    <CardTitle className="text-sm">AI analysis</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Headline sentence */}
                  <p className="text-sm leading-relaxed text-foreground/80">
                    {scanned === 0 ? (
                      'No emails were scanned this month.'
                    ) : (
                      <>
                        AI analyzed{' '}
                        <span className="font-semibold text-foreground">{ai.evaluated ?? 0}</span>
                        {' of '}
                        <span className="font-semibold text-foreground">{scanned}</span>
                        {' scanned emails'}
                        {aiAnalyzedPct !== null && (
                          <span className="text-muted-foreground"> ({aiAnalyzedPct}%)</span>
                        )}
                        .
                      </>
                    )}
                  </p>

                  {/* Detail line */}
                  <p className="text-xs text-muted-foreground">
                    {[
                      ai.failed ? `${ai.failed} email${ai.failed !== 1 ? 's' : ''} could not be analyzed (AI was offline)` : null,
                      ai.disabled ? `${ai.disabled} email${ai.disabled !== 1 ? 's' : ''} skipped (AI is turned off)` : null,
                    ]
                      .filter(Boolean)
                      .join(' · ') || 'All emails were processed without issues.'}
                  </p>

                  {/* Mini stat row */}
                  <div className="grid grid-cols-3 gap-2 rounded-lg bg-muted/30 p-3 text-center">
                    <div>
                      <p className="text-lg font-semibold tabular-nums">{ai.evaluated ?? 0}</p>
                      <p className="text-[11px] font-medium text-muted-foreground">Analyzed</p>
                      <p className="text-[10px] text-muted-foreground/60">Checked by AI</p>
                    </div>
                    <div>
                      <p className="text-lg font-semibold tabular-nums text-foreground/70">{ai.failed ?? 0}</p>
                      <p className="text-[11px] font-medium text-muted-foreground">Unavailable</p>
                      <p className="text-[10px] text-muted-foreground/60">AI was offline</p>
                    </div>
                    <div>
                      <p className="text-lg font-semibold tabular-nums text-muted-foreground">{ai.disabled ?? 0}</p>
                      <p className="text-[11px] font-medium text-muted-foreground">Skipped</p>
                      <p className="text-[10px] text-muted-foreground/60">AI turned off</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </div>

        </div>
      )}
    </div>
  );
}
