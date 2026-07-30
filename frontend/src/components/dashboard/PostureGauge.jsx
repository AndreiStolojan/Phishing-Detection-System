// ─────────────────────────────────────────────────────────────────────────────
// PostureGauge.jsx — arcul (gauge) cu "safe rate" din blocul Posture.
//
// Un arc de 270° desenat cu două cercuri: un "track" (fundalul arcului) și un
// arc de valoare. Ambele folosesc pathLength="100", deci procentul se traduce
// direct în stroke-dasharray, fără calcule de circumferință. Culoarea vine din
// CATEGORY_COLORS (variabile CSS --color-risk-*), nu din hex hardcodat.
// ─────────────────────────────────────────────────────────────────────────────

import { CATEGORY_COLORS } from '@/lib/risk';

export function PostureGauge({ value = 0 }) {
  // Procentul e mereu un număr finit între 0 și 100 — protejează arcul de NaN
  // când nu există încă niciun email scanat.
  const pct = Number.isFinite(value) ? Math.min(100, Math.max(0, Math.round(value))) : 0;
  const filled = 0.75 * pct;

  return (
    <div className="h-[216px] w-[216px] max-[780px]:h-[180px] max-[780px]:w-[180px]">
      <svg
        viewBox="0 0 220 220"
        role="img"
        aria-label={`Safe rate, ${pct} percent`}
        className="block h-full w-full overflow-visible"
      >
        <circle
          cx="110"
          cy="110"
          r="88"
          pathLength="100"
          fill="none"
          strokeWidth="7"
          strokeLinecap="round"
          strokeDasharray="75 25"
          transform="rotate(135 110 110)"
          className="stroke-border"
        />
        <circle
          cx="110"
          cy="110"
          r="88"
          pathLength="100"
          fill="none"
          strokeWidth="7"
          strokeLinecap="round"
          strokeDasharray={`${filled} ${100 - filled}`}
          transform="rotate(135 110 110)"
          style={{ stroke: CATEGORY_COLORS.safe }}
        />
        <text
          x="103"
          y="120"
          textAnchor="middle"
          className="fill-foreground tabular-nums"
          style={{ fontSize: 58, fontWeight: 650, letterSpacing: '-0.04em' }}
        >
          {pct}
        </text>
        <text
          x="140"
          y="118"
          className="fill-muted-foreground"
          style={{ fontSize: 20, fontWeight: 560 }}
        >
          %
        </text>
        <text
          x="110"
          y="150"
          textAnchor="middle"
          className="fill-muted-foreground"
          style={{ fontSize: 11.5, fontWeight: 500 }}
        >
          Safe rate
        </text>
      </svg>
    </div>
  );
}
