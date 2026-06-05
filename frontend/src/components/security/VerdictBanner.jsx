import { motion } from 'framer-motion';
import { CheckCircle2 } from 'lucide-react';

import { getRiskMeta } from '@/lib/risk';
import { cn } from '@/lib/utils';

export function VerdictBanner({ riskBucket, verdictSource }) {
  const { label, description, tone } = getRiskMeta(riskBucket);
  const Icon = tone.icon;

  const isSafe = riskBucket === 'safe' || riskBucket === 'reviewed_safe';

  const sourceLabel =
    verdictSource === 'user'
      ? 'Manual review'
      : verdictSource === 'scan'
        ? 'Auto scan'
        : null;

  const IconComponent = isSafe ? CheckCircle2 : Icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
      className={cn('flex items-center gap-3 rounded-xl border px-4 py-3', tone.soft)}
    >
      <IconComponent className={cn('h-4 w-4 shrink-0', tone.text)} />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className={cn('text-sm font-semibold', tone.text)}>{label}</span>
          {sourceLabel && (
            <span className="text-[11px] text-muted-foreground">{sourceLabel}</span>
          )}
        </div>
        {description && (
          <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
        )}
      </div>
    </motion.div>
  );
}
