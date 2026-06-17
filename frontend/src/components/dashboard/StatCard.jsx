// ─────────────────────────────────────────────────────────────────────────────
// StatCard.jsx — cardul generic de statistică de pe dashboard.
//
// Ce face, pe scurt: afișează o singură cifră mare (ex: "12 emailuri riscante"),
// o etichetă, opțional un text auxiliar ("hint") și o iconiță colorată. Cifra
// se animă crescând/descrescând de la valoarea veche la cea nouă (efect
// "count-up"). Dacă primește o rută `to`, tot cardul devine un link clicabil
// (cu o săgeată care apare la hover).
//
// Folosit în: pagina Dashboard, pentru cardurile de sumar de sus
// (vezi docs/EXPLICATIE_FRONTEND.md §7).
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import { ArrowUpRight } from 'lucide-react';

import { Card, CardContent } from '@/components/ui/card';
import { springSoft } from '@/lib/motion';
import { cn } from '@/lib/utils';

// Hook custom: animă o valoare numerică de la valoarea precedentă la cea nouă.
// La prima afișare a componentei animă de la 0 -> valoare. La randările
// următoare animă doar dacă valoarea s-a schimbat efectiv. Dacă utilizatorul
// are activată setarea de sistem "reduced motion" (mai puține animații),
// `enabled` e false și valoarea se afișează direct, fără animație.
function useCountUp(target, enabled, duration = 650) {
  const [val, setVal] = useState(enabled ? 0 : Number(target) || 0);
  const fromRef = useRef(0); // valoarea de la care a pornit ultima animație
  const rafRef = useRef(null); // id-ul cererii requestAnimationFrame, pentru a o putea anula

  useEffect(() => {
    const to = Number(target) || 0;
    if (!enabled) {
      // Fără animație: setăm direct valoarea finală.
      setVal(to);
      fromRef.current = to;
      return;
    }
    const from = fromRef.current;
    if (from === to) {
      // Nu s-a schimbat nimic, nu mai animăm.
      setVal(to);
      return;
    }
    let start = null;
    // Funcție apelată de browser la fiecare cadru de animație (de ~60 ori/secundă).
    const tick = (t) => {
      if (start === null) start = t;
      const p = Math.min((t - start) / duration, 1); // progres între 0 și 1
      const eased = 1 - Math.pow(1 - p, 3); // curbă de "easing" (încetinește spre final)
      setVal(Math.round(from + (to - from) * eased));
      if (p < 1) rafRef.current = requestAnimationFrame(tick);
      else fromRef.current = to;
    };
    rafRef.current = requestAnimationFrame(tick);
    // La demontare sau la schimbarea dependențelor, anulăm animația în curs.
    return () => rafRef.current && cancelAnimationFrame(rafRef.current);
  }, [target, enabled, duration]);

  return val;
}

// Alege clasele de culoare pentru "căsuța" iconiței, în funcție de tonul
// (`tone`) primit. Tonurile "risk-*" vin din lib/risk.js (safe/quarantine/
// phishing/review), pentru consecvență cu restul aplicației. Dacă tonul nu e
// unul de risc, folosim o variantă generică (culoarea primară, transparentă).
const toneTile = (tone) =>
  tone.includes('risk-safe')
    ? 'bg-risk-safe-soft text-risk-safe'
    : tone.includes('risk-quarantine')
      ? 'bg-risk-quarantine-soft text-risk-quarantine'
      : tone.includes('risk-phishing')
        ? 'bg-risk-phishing-soft text-risk-phishing'
        : tone.includes('risk-review')
          ? 'bg-risk-review-soft text-risk-review'
          : `bg-primary/10 ${tone}`;

export function StatCard({ icon: Icon, label, value, hint, tone = 'text-primary', to, index = 0 }) {
  const reduce = useReducedMotion(); // true dacă userul preferă mai puține animații
  const animatedValue = useCountUp(value, !reduce);

  // Conținutul cardului (extras într-o variabilă, ca să-l putem înfășura
  // opțional într-un <Link> mai jos, fără să-l duplicăm).
  const inner = (
    <Card interactive={!!to} className="h-full">
      <CardContent className="flex items-start justify-between gap-3 p-5">
        <div className="min-w-0 space-y-1">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
          <p className="text-3xl font-semibold tabular-nums">{animatedValue}</p>
          {hint && <p className="text-xs text-foreground/60">{hint}</p>}
        </div>
        <div className="relative shrink-0">
          <div className={cn('rounded-lg p-2.5', toneTile(tone))}>
            {Icon && <Icon className="h-5 w-5" />}
          </div>
          {/* Săgeata "deschide pagina" apare doar dacă cardul e link (`to` definit),
              și doar la hover pe card (clasa group-hover de pe părinte) */}
          {to && (
            <ArrowUpRight className="absolute -right-1 -top-1 h-4 w-4 text-muted-foreground opacity-0 transition-opacity duration-200 group-hover:opacity-100" />
          )}
        </div>
      </CardContent>
    </Card>
  );

  return (
    // Animație de apariție: cardul "urcă" ușor din jos cu un fade-in, cu o
    // mică întârziere în funcție de poziția lui (`index`) — efect de cascadă.
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ ...springSoft, delay: Math.min(index * 0.05, 0.25) }}
    >
      {/* Dacă avem o rută `to`, întreg cardul devine clicabil (Link);
          altfel arătăm doar conținutul, fără a-l face navigabil. */}
      {to ? (
        <Link to={to} className="group block h-full">
          {inner}
        </Link>
      ) : (
        inner
      )}
    </motion.div>
  );
}
