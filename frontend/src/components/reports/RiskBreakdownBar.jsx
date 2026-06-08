import { motion } from 'framer-motion';

import { cn } from '@/lib/utils';
import { springSoft } from '@/lib/motion';

const SEGMENTS = [
  { key: 'safe', label: 'Safe', bar: 'bg-risk-safe', text: 'text-risk-safe' },
  { key: 'suspicious', label: 'Suspicious', bar: 'bg-risk-review', text: 'text-risk-review' },
  { key: 'likelyPhishing', label: 'Likely phishing', bar: 'bg-risk-quarantine', text: 'text-risk-quarantine' },
  { key: 'markedPhishing', label: 'Confirmed', bar: 'bg-risk-phishing', text: 'text-risk-phishing' },
];

export function RiskBreakdownBar({ counts = {} }) {
  const total = SEGMENTS.reduce((acc, s) => acc + (counts[s.key] ?? 0), 0);

  return (
    <div className="space-y-3">
      {/* Segmented bar */}
      <div className="flex h-3 w-full overflow-hidden rounded-full bg-muted/40">
        {total === 0 ? (
          <div className="h-full w-full rounded-full bg-muted/40" />
        ) : (
          SEGMENTS.map((seg, i) => {
            const count = counts[seg.key] ?? 0;
            const pct = (count / total) * 100;
            if (pct === 0) return null;
            return (
              <motion.div
                key={seg.key}
                className={cn('h-full', seg.bar)}
                initial={{ scaleX: 0, originX: 0 }}
                animate={{ scaleX: 1 }}
                transition={{ ...springSoft, delay: i * 0.06 }}
                style={{ width: `${pct}%` }}
              />
            );
          })
        )}
      </div>

      {/* Legend row */}
      <div className="flex flex-wrap gap-x-5 gap-y-2">
        {SEGMENTS.map((seg) => {
          const count = counts[seg.key] ?? 0;
          const pct = total > 0 ? Math.round((count / total) * 100) : 0;
          return (
            <div key={seg.key} className="flex items-center gap-1.5">
              <span className={cn('h-2 w-2 rounded-full', seg.bar)} />
              <span className="text-xs text-muted-foreground">{seg.label}</span>
              <span className={cn('text-xs font-medium tabular-nums', seg.text)}>
                {count}
              </span>
              <span className="text-[11px] text-muted-foreground/50">({pct}%)</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
