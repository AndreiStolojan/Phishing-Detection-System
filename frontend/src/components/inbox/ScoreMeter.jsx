// ─────────────────────────────────────────────────────────────────────────────
// ScoreMeter.jsx — bara subțire proporțională cu scorul de risc (0–100).
//
// Culoarea NU se alege aici: primim `hex` (de fapt o variabilă CSS
// --color-risk-*, via getRiskMeta(...).tone.hex), ca severitatea să vină din
// aceeași sursă unică de adevăr ca restul UI-ului.
// ─────────────────────────────────────────────────────────────────────────────

import { SCORE_MAX } from '@/lib/scoring';
import { cn } from '@/lib/utils';

export function ScoreMeter({ score, max = SCORE_MAX, hex, className }) {
  const pct = Math.max(0, Math.min(100, ((score ?? 0) / max) * 100));

  return (
    <span
      aria-hidden="true"
      className={cn(
        'relative block h-[3px] shrink-0 overflow-hidden rounded-full bg-foreground/10',
        className
      )}
    >
      <span
        className="absolute inset-y-0 left-0 rounded-full transition-[width] duration-500 ease-out"
        style={{ width: `${pct}%`, backgroundColor: hex }}
      />
    </span>
  );
}
