import { motion } from 'framer-motion';

import { springSoft } from '@/lib/motion';
import { CATEGORY_COLORS, CATEGORY_LABELS } from '@/lib/risk';

// Each report field maps onto a canonical category so its colour matches the
// dashboard trend/donut and inbox badges. Colours come from CATEGORY_COLORS —
// the single source of truth — instead of being re-declared here.
const SEGMENTS = [
  { key: 'safe', category: 'safe' },
  { key: 'suspicious', category: 'suspicious' },
  { key: 'likelyPhishing', category: 'likely_phishing' },
  { key: 'markedPhishing', category: 'confirmed_phishing' },
].map((s) => ({
  ...s,
  label: CATEGORY_LABELS[s.category],
  color: CATEGORY_COLORS[s.category],
}));

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
                className="h-full"
                initial={{ scaleX: 0, originX: 0 }}
                animate={{ scaleX: 1 }}
                transition={{ ...springSoft, delay: i * 0.06 }}
                style={{ width: `${pct}%`, backgroundColor: seg.color }}
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
              <span className="h-2 w-2 rounded-full" style={{ backgroundColor: seg.color }} />
              <span className="text-xs text-muted-foreground">{seg.label}</span>
              <span
                className="text-xs font-medium tabular-nums"
                style={{ color: seg.color }}
              >
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
