// ─────────────────────────────────────────────────────────────────────────────
// ScoreMeter.jsx — the thin bar that draws a risk score (0–100) proportionally.
//
// The colour comes from lib/scoreScale.js, the shared 0–100 ramp: risk 0 is
// green, 50 amber, 100 red, so "green = good, red = bad" reads the same here as
// on the dashboard gauge. A message that was never scanned has `score === null`
// and is drawn grey with an empty bar — colouring it green would claim "safe"
// about something we never checked.
//
// `hex` stays available as an override for callers that genuinely need a
// categorical colour, but nothing in the inbox uses it today.
// ─────────────────────────────────────────────────────────────────────────────

import { getRiskColor, isScored, UNSCORED_COLOR } from '@/lib/scoreScale';
import { SCORE_MAX } from '@/lib/scoring';
import { cn } from '@/lib/utils';

export function ScoreMeter({ score, max = SCORE_MAX, hex, className }) {
  const scored = isScored(score);
  const pct = scored ? Math.max(0, Math.min(100, (score / max) * 100)) : 0;
  const fill = hex || (scored ? getRiskColor(score) : UNSCORED_COLOR);

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
        style={{ width: `${pct}%`, backgroundColor: fill }}
      />
    </span>
  );
}
