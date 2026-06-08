import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Sparkles, Gauge, Info, ChevronDown, Bot, Shield } from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ThreatSignals } from '@/components/security/ThreatSignals';
import { getVerdictMeta } from '@/lib/risk';
import { ease, springSoft } from '@/lib/motion';
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

  const label = hasRule && hasAi ? 'Rules + AI' : hasAi ? 'AI detected' : 'Rule-based';
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
  const [showScores, setShowScores] = useState(false);

  if (!scan) return null;

  const verdictMeta = getVerdictMeta(scan.verdict);
  const summary = scan.aiExplanation?.summary;
  const aiSource = scan.aiExplanationMeta?.source;
  const aiStatus = scan.aiExplanationMeta?.status;
  const ollamaUnavailable = aiSource === 'fallback' || aiStatus === 'fallback';

  return (
    <div className="space-y-3">
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
              {ollamaUnavailable ? 'Rule-based explanation' : 'AI explanation'}
            </CardTitle>
            <div className="ml-auto">
              <DetectionBadge ruleScore={scan.ruleScore} aiScore={scan.aiScore} />
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm leading-relaxed text-foreground/90">{summary}</p>
          </CardContent>
        </Card>
      )}

      {/* If no AI explanation, still show the detection badge */}
      {!summary && (
        <div className="flex justify-end">
          <DetectionBadge ruleScore={scan.ruleScore} aiScore={scan.aiScore} />
        </div>
      )}

      {/* Ollama unavailable — calm info note */}
      {ollamaUnavailable && (
        <div className="flex items-start gap-2 rounded-lg border border-risk-review/30 bg-risk-review-soft px-3 py-2.5 text-sm text-risk-review">
          <Info className="mt-0.5 h-4 w-4 shrink-0" />
          <span>
            The local AI model (Ollama) was unavailable — this explanation came from the
            rule-based fallback.
          </span>
        </div>
      )}

      {/* Threat signals — always visible, not hidden */}
      <ThreatSignals scan={scan} />

      {/* Score breakdown — collapsible, score visible in header */}
      <div>
        <button
          onClick={() => setShowScores((v) => !v)}
          className="flex w-full items-center justify-between rounded-md py-1 text-muted-foreground transition-colors hover:text-foreground"
        >
          <span className="label-overline flex items-center gap-1.5">
            <Gauge className="h-3.5 w-3.5" />
            Score breakdown
          </span>
          <div className="flex items-center gap-2">
            <span className={cn('text-xs font-semibold tabular-nums', verdictMeta.tone.text)}>
              {scan.score}
            </span>
            <ChevronDown
              className={cn(
                'h-4 w-4 transition-transform duration-200',
                !showScores && '-rotate-90'
              )}
            />
          </div>
        </button>

        <AnimatePresence initial={false}>
          {showScores && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.22, ease }}
              className="overflow-hidden"
            >
              <div className="space-y-3 pt-3">
                <ScoreBar
                  label="Total score"
                  value={scan.score}
                  color={verdictMeta.tone.hex}
                />
                <div className="grid grid-cols-2 gap-4">
                  <ScoreBar
                    label="Rule signals"
                    value={scan.ruleScore}
                    color="var(--color-chart-3)"
                  />
                  <ScoreBar
                    label="AI signals"
                    value={scan.aiScore}
                    color="var(--color-chart-1)"
                  />
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
