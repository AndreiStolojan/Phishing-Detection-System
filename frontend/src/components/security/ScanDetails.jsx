import { motion } from 'framer-motion';
import { Sparkles, Gauge, Info, Bot, Shield, ShieldCheck, ShieldOff } from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ThreatSignals } from '@/components/security/ThreatSignals';
import { getVerdictMeta } from '@/lib/risk';
import { AI_SCORE_MAX, RULE_SCORE_MAX, SCORE_MAX, getAiStatus } from '@/lib/scoring';
import { springSoft } from '@/lib/motion';
import { cn } from '@/lib/utils';

function ScoreBar({ label, value, max = 100, color }) {
  const pct = Math.max(0, Math.min(100, (Number(value) / max) * 100 || 0));
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-medium tabular-nums">{value ?? 0}</span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
        <motion.div
          className="h-full rounded-full"
          style={{ backgroundColor: color }}
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={springSoft}
        />
      </div>
    </div>
  );
}

function DetectionBadge({ ruleScore, aiScore }) {
  const hasRule = (ruleScore ?? 0) > 0;
  const hasAi = (aiScore ?? 0) > 0;

  if (!hasRule && !hasAi) return null;

  const label = hasRule && hasAi ? 'Security checks + AI' : hasAi ? 'AI detected' : 'Security checks';
  const Icon = hasAi ? Bot : Shield;

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium',
        hasAi ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'
      )}
    >
      <Icon className="h-3 w-3" />
      {label}
    </span>
  );
}

export function ScanDetails({ scan }) {
  if (!scan) return null;

  const verdictMeta = getVerdictMeta(scan.verdict);
  const summary = scan.aiExplanation?.summary;
  const ai = getAiStatus(scan);
  const ollamaUnavailable = ai.state !== 'ok';

  const listMatch = scan.senderListMatch;
  const listTarget = listMatch?.kind === 'domain' ? 'domain' : 'sender';

  return (
    <div className="space-y-4">
      {/* User list banner — the user explicitly trusted or blocked this sender/domain,
          and that decision was applied by this scan. */}
      {listMatch?.listType === 'block' && (
        <div className="flex items-start gap-2 rounded-lg border border-risk-quarantine/30 bg-risk-quarantine-soft px-3 py-2.5 text-sm text-risk-quarantine">
          <ShieldOff className="mt-0.5 h-4 w-4 shrink-0" />
          <span>
            You blocked this {listTarget} ({listMatch.value}), so the email is always treated
            as likely phishing.
          </span>
        </div>
      )}
      {listMatch?.listType === 'allow' && (
        <div className="flex items-start gap-2 rounded-lg border border-risk-safe/30 bg-risk-safe-soft px-3 py-2.5 text-sm text-risk-safe">
          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />
          <span>
            This {listTarget} ({listMatch.value}) is on your trusted list — contextual signals
            were weighted down. Critical signals (password requests, dangerous attachments)
            still count in full.
          </span>
        </div>
      )}

      {/* Verified-brand banner — the sender is on an official brand domain, so
          brand-typical signals were intentionally weighted down. */}
      {scan.senderVerifiedBrand && (
        <div className="flex items-start gap-2 rounded-lg border border-risk-safe/30 bg-risk-safe-soft px-3 py-2.5 text-sm text-risk-safe">
          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />
          <span>
            Verified {scan.verifiedBrandName || 'brand'} sender — this email comes from an
            official domain, so brand-typical signals (urgency, links, sign-in prompts) were
            weighted down.
          </span>
        </div>
      )}

      {/* AI / rule-based explanation — primary panel */}
      {summary && (
        <Card className={ollamaUnavailable ? 'border-border' : 'border-primary/25 bg-primary/[0.06]'}>
          <CardHeader className="flex-row items-center gap-2 space-y-0 pb-2">
            <span
              className={cn(
                'flex h-7 w-7 items-center justify-center rounded-lg',
                ollamaUnavailable ? 'bg-muted text-muted-foreground' : 'bg-primary/15 text-primary'
              )}
            >
              <Sparkles className="h-4 w-4" />
            </span>
            <CardTitle className="text-sm">
              {ollamaUnavailable ? 'Automated explanation' : 'AI explanation'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm leading-relaxed text-foreground/90">{summary}</p>
          </CardContent>
        </Card>
      )}

      {/* AI status note — specific message per failure mode; calm/neutral when simply off */}
      {ai.message && (
        <div
          className={cn(
            'flex items-start gap-2 rounded-lg border px-3 py-2.5 text-sm',
            ai.state === 'disabled'
              ? 'border-border bg-muted/40 text-muted-foreground'
              : 'border-risk-review/30 bg-risk-review-soft text-risk-review'
          )}
        >
          <Info className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{ai.message}</span>
        </div>
      )}

      {/* Score breakdown — always visible */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <span className="label-overline flex items-center gap-1.5">
            <Gauge className="h-3.5 w-3.5" />
            Risk score
          </span>
          <div className="flex items-center gap-2">
            <DetectionBadge ruleScore={scan.ruleScore} aiScore={scan.aiScore} />
            <span className={cn('text-sm font-semibold tabular-nums', verdictMeta.tone.text)}>
              {scan.score}
            </span>
          </div>
        </div>
        <ScoreBar label="Total" value={scan.score} max={SCORE_MAX} color={verdictMeta.tone.hex} />
        <div className="grid grid-cols-2 gap-4">
          <ScoreBar label="Security checks" value={scan.ruleScore} max={RULE_SCORE_MAX} color="var(--color-chart-3)" />
          <ScoreBar label="AI" value={scan.aiScore} max={AI_SCORE_MAX} color="var(--color-chart-1)" />
        </div>
      </div>

      {/* Threat signals — always visible below score */}
      <ThreatSignals scan={scan} />
    </div>
  );
}
