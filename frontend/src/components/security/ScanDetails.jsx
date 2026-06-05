import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Sparkles, ListChecks, Gauge, Info, ChevronDown } from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { getVerdictMeta, humanize } from '@/lib/risk';
import { ease, springSoft } from '@/lib/motion';
import { cn } from '@/lib/utils';

const ruleLabel = (rule) => {
  if (typeof rule === 'string') return humanize(rule.replace(/[:_]/g, ' '));
  if (rule?.rule) return humanize(String(rule.rule).replace(/[:_]/g, ' '));
  if (rule?.id) return humanize(String(rule.id).replace(/[:_]/g, ' '));
  return 'Rule';
};

const rulePoints = (rule) =>
  typeof rule === 'object' ? rule.points ?? rule.totalPoints ?? null : null;

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

const RULES_PREVIEW = 3;

export function ScanDetails({ scan }) {
  const [showAllRules, setShowAllRules] = useState(false);
  const [showEvidence, setShowEvidence] = useState(false);

  if (!scan) return null;

  const verdictMeta = getVerdictMeta(scan.verdict);
  const triggered = Array.isArray(scan.triggeredRules) ? scan.triggeredRules : [];
  const visibleRules = showAllRules ? triggered : triggered.slice(0, RULES_PREVIEW);
  const hiddenRulesCount = triggered.length - RULES_PREVIEW;
  const reasons = Array.isArray(scan.reasons) ? scan.reasons : [];
  const summary = scan.aiExplanation?.summary;
  const aiSource = scan.aiExplanationMeta?.source;
  const aiStatus = scan.aiExplanationMeta?.status;
  const ollamaUnavailable = aiSource === 'fallback' || aiStatus === 'fallback';

  return (
    <div className="space-y-4">
      {/* AI explanation — the plain-language "why", the primary panel */}
      {summary && (
        <Card className={ollamaUnavailable ? 'border-border' : 'border-primary/25 bg-primary/[0.06]'}>
          <CardHeader className="flex-row items-center gap-2 space-y-0">
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
          </CardHeader>
          <CardContent>
            <p className="text-sm leading-relaxed text-foreground/90">{summary}</p>
          </CardContent>
        </Card>
      )}

      {/* Ollama unavailable — calm info note (on-brand, not raw amber) */}
      {ollamaUnavailable && (
        <div className="flex items-start gap-2 rounded-lg border border-risk-review/30 bg-risk-review-soft px-3 py-2.5 text-sm text-risk-review">
          <Info className="mt-0.5 h-4 w-4 shrink-0" />
          <span>The local AI model (Ollama) was unavailable, so this explanation came from the rule-based fallback.</span>
        </div>
      )}

      {/* Evidence — score + rules, demoted behind a disclosure */}
      <div>
        <button
          onClick={() => setShowEvidence((v) => !v)}
          className="flex w-full items-center justify-between rounded-md py-1 text-muted-foreground transition-colors hover:text-foreground"
        >
          <span className="label-overline">Evidence</span>
          <ChevronDown className={cn('h-4 w-4 transition-transform duration-200', !showEvidence && '-rotate-90')} />
        </button>

        <AnimatePresence initial={false}>
          {showEvidence && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.22, ease }}
              className="overflow-hidden"
            >
              <div className="space-y-4 pt-3">
                {/* Score breakdown */}
                <Card>
                  <CardHeader className="flex-row items-center gap-2 space-y-0">
                    <Gauge className="h-4 w-4 text-muted-foreground" />
                    <CardTitle className="text-sm">Risk score</CardTitle>
                    <span className={cn('ml-auto text-sm font-semibold', verdictMeta.tone.text)}>
                      {verdictMeta.label}
                    </span>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <ScoreBar label="Total score" value={scan.score} color={verdictMeta.tone.hex} />
                    <div className="grid grid-cols-2 gap-4">
                      <ScoreBar label="Rule signals" value={scan.ruleScore} color="var(--color-chart-3)" />
                      <ScoreBar label="AI signals" value={scan.aiScore} color="var(--color-chart-1)" />
                    </div>
                  </CardContent>
                </Card>

                {/* Triggered rules */}
                <Card>
                  <CardHeader className="flex-row items-center gap-2 space-y-0">
                    <ListChecks className="h-4 w-4 text-muted-foreground" />
                    <CardTitle className="text-sm">
                      Triggered rules{triggered.length ? ` (${triggered.length})` : ''}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {triggered.length === 0 && reasons.length === 0 ? (
                      <p className="text-sm text-muted-foreground">
                        No rules were triggered for this message.
                      </p>
                    ) : (
                      <>
                        <ul className="space-y-2">
                          {visibleRules.map((rule, i) => (
                            <li
                              key={i}
                              className="flex items-center justify-between gap-3 rounded-md border border-border/60 bg-background/40 px-3 py-2 text-sm"
                            >
                              <span>{ruleLabel(rule)}</span>
                              {rulePoints(rule) != null && (
                                <Badge variant="muted" className="tabular-nums">
                                  +{rulePoints(rule)}
                                </Badge>
                              )}
                            </li>
                          ))}
                          {triggered.length === 0 &&
                            reasons.map((reason, i) => (
                              <li key={i} className="text-sm text-muted-foreground">
                                • {reason}
                              </li>
                            ))}
                        </ul>
                        {hiddenRulesCount > 0 && (
                          <button
                            onClick={() => setShowAllRules((v) => !v)}
                            className="mt-2 text-xs text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
                          >
                            {showAllRules ? 'Show less' : `Show ${hiddenRulesCount} more`}
                          </button>
                        )}
                      </>
                    )}
                  </CardContent>
                </Card>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
