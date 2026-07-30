// ─────────────────────────────────────────────────────────────────────────────
// PostureGauge.jsx — arcul (gauge) cu "safe rate" din blocul Posture.
//
// Un arc de 270° desenat cu două cercuri: un "track" (fundalul arcului) și un
// arc de valoare. Ambele folosesc pathLength="100", deci procentul se traduce
// direct în stroke-dasharray, fără calcule de circumferință.
//
// Culoarea NU mai e fixă: safe rate e o valoare de tip "health" (100 = bine),
// deci arcul și cifra mare iau culoarea din rampa continuă din lib/scoreScale
// (getHealthColor / getHealthTextColor). O rată de 42% nu mai arată verde ca
// una de 98%. Cifra folosește varianta *TextColor, garantată lizibilă (AA) pe
// fundalul aproape negru.
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect } from 'react';
import { animate, motion, useMotionValue, useTransform } from 'framer-motion';

import { getHealthColor, getHealthTextColor, getPostureLabel } from '@/lib/scoreScale';
import { dur, ease } from '@/lib/motion';

// Arcul acoperă 270° din cerc: 75% din circumferință e "track", 25% e golul de
// jos. Procentul se scalează în acel 75%.
const ARC_SPAN = 75;

const prefersReducedMotion = () =>
  typeof window !== 'undefined' &&
  typeof window.matchMedia === 'function' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

export function PostureGauge({ value = 0 }) {
  // Procentul e mereu un număr finit între 0 și 100 — protejează arcul de NaN
  // când nu există încă niciun email scanat.
  const pct = Number.isFinite(value) ? Math.min(100, Math.max(0, Math.round(value))) : 0;
  const filled = (ARC_SPAN / 100) * pct;

  const arcColor = getHealthColor(pct);
  const numeralColor = getHealthTextColor(pct);

  // Arcul se animează de la valoarea precedentă la cea nouă (schimbare de
  // interval de timp, sync nou). Culoarea se schimbă în același timp, printr-un
  // tween separat pe `stroke`/`fill`.
  const progress = useMotionValue(filled);
  const dashArray = useTransform(progress, (v) => `${v} ${100 - v}`);

  useEffect(() => {
    if (prefersReducedMotion()) {
      progress.set(filled);
      return undefined;
    }
    const controls = animate(progress, filled, { duration: dur.slow, ease });
    return () => controls.stop();
  }, [filled, progress]);

  return (
    <div className="h-[216px] w-[216px] max-[780px]:h-[180px] max-[780px]:w-[180px]">
      <svg
        viewBox="0 0 220 220"
        role="img"
        aria-label={`Safe rate ${pct} percent. ${getPostureLabel(pct)}.`}
        className="block h-full w-full overflow-visible"
      >
        <circle
          cx="110"
          cy="110"
          r="88"
          pathLength="100"
          fill="none"
          strokeWidth="11"
          strokeLinecap="round"
          strokeDasharray={`${ARC_SPAN} ${100 - ARC_SPAN}`}
          transform="rotate(135 110 110)"
          className="stroke-border"
        />
        <motion.circle
          cx="110"
          cy="110"
          r="88"
          pathLength="100"
          fill="none"
          strokeWidth="11"
          strokeLinecap="round"
          transform="rotate(135 110 110)"
          style={{ strokeDasharray: dashArray }}
          initial={false}
          animate={{ stroke: arcColor }}
          transition={{ duration: dur.base, ease }}
        />

        {/* Cifra + "%" într-un singur <text> centrat, ca "100%" să nu iasă
            niciodată peste semnul procent. Doar cifra e colorată din rampă;
            "%" rămâne pe tonul neutru (clasa de pe <tspan> bate fill-ul
            moștenit de la <text>). */}
        <motion.text
          x="110"
          y="120"
          textAnchor="middle"
          className="tabular-nums"
          initial={false}
          animate={{ fill: numeralColor }}
          transition={{ duration: dur.base, ease }}
        >
          <tspan style={{ fontSize: 58, fontWeight: 720, letterSpacing: '-0.04em' }}>{pct}</tspan>
          <tspan
            dx="3"
            className="fill-muted-foreground"
            style={{ fontSize: 20, fontWeight: 560 }}
          >
            %
          </tspan>
        </motion.text>

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
