import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import { ArrowUpRight } from 'lucide-react';

import { Card, CardContent } from '@/components/ui/card';
import { springSoft } from '@/lib/motion';
import { cn } from '@/lib/utils';

// Animates from the previous value to the new one. First mount runs 0 -> value;
// later renders only animate when the value actually changes. Reduced motion = instant.
function useCountUp(target, enabled, duration = 650) {
  const [val, setVal] = useState(enabled ? 0 : Number(target) || 0);
  const fromRef = useRef(0);
  const rafRef = useRef(null);

  useEffect(() => {
    const to = Number(target) || 0;
    if (!enabled) {
      setVal(to);
      fromRef.current = to;
      return;
    }
    const from = fromRef.current;
    if (from === to) {
      setVal(to);
      return;
    }
    let start = null;
    const tick = (t) => {
      if (start === null) start = t;
      const p = Math.min((t - start) / duration, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      setVal(Math.round(from + (to - from) * eased));
      if (p < 1) rafRef.current = requestAnimationFrame(tick);
      else fromRef.current = to;
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => rafRef.current && cancelAnimationFrame(rafRef.current);
  }, [target, enabled, duration]);

  return val;
}

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
  const reduce = useReducedMotion();
  const animatedValue = useCountUp(value, !reduce);

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
          {to && (
            <ArrowUpRight className="absolute -right-1 -top-1 h-4 w-4 text-muted-foreground opacity-0 transition-opacity duration-200 group-hover:opacity-100" />
          )}
        </div>
      </CardContent>
    </Card>
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ ...springSoft, delay: Math.min(index * 0.05, 0.25) }}
    >
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
