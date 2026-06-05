import { AnimatePresence, motion } from 'framer-motion';
import { CheckCircle2, ScanLine, UserCheck } from 'lucide-react';

import { getRiskMeta } from '@/lib/risk';
import { springSnappy, springSoft } from '@/lib/motion';
import { cn } from '@/lib/utils';

export function VerdictBanner({ riskBucket, verdictSource }) {
  const { label, description, tone } = getRiskMeta(riskBucket);
  const isSafe = riskBucket === 'safe' || riskBucket === 'reviewed_safe';
  const loud = tone.emphasis === 'loud';
  const Icon = isSafe ? CheckCircle2 : tone.icon;

  const sourceLabel =
    verdictSource === 'user' ? 'Manual review' : verdictSource === 'scan' ? 'Auto scan' : null;
  const SourceIcon = verdictSource === 'user' ? UserCheck : ScanLine;

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={riskBucket}
        initial={{ opacity: 0, y: -6 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 6 }}
        transition={springSoft}
        className={cn(
          'relative flex items-center gap-4 overflow-hidden rounded-2xl border px-4 py-4',
          tone.soft
        )}
      >
        {/* One-shot glow "breath" for high-risk verdicts — never repeats */}
        {loud && (
          <motion.span
            initial={{ opacity: 0.45, scale: 0.85 }}
            animate={{ opacity: 0, scale: 1.7 }}
            transition={{ duration: 0.7, ease: 'easeOut' }}
            className="pointer-events-none absolute left-6 top-1/2 h-12 w-12 -translate-y-1/2 rounded-full blur-lg"
            style={{ backgroundColor: tone.hex }}
          />
        )}

        {/* Left accent */}
        <span className="absolute inset-y-0 left-0 w-1" style={{ backgroundColor: tone.hex }} />

        {/* Icon ring */}
        <motion.span
          initial={{ scale: 0.6, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={springSnappy}
          className={cn('relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full', tone.soft)}
          style={{ boxShadow: `inset 0 0 0 1px color-mix(in oklab, ${tone.hex} 45%, transparent)` }}
        >
          <Icon className={cn('h-5 w-5', tone.text)} />
        </motion.span>

        <div className="relative min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className={cn('text-h3 font-semibold', tone.text)}>{label}</span>
            {sourceLabel && (
              <span className="inline-flex items-center gap-1 rounded-full bg-background/40 px-2 py-0.5 text-[11px] text-muted-foreground">
                <SourceIcon className="h-3 w-3" />
                {sourceLabel}
              </span>
            )}
          </div>
          {description && <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
