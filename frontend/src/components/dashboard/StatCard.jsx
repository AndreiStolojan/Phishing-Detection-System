import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';

import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

function useCountUp(target, duration = 600, delayMs = 0) {
  const [count, setCount] = useState(0);
  const rafRef = useRef(null);

  useEffect(() => {
    const numTarget = Number(target) || 0;
    if (numTarget === 0) { setCount(0); return; }
    let startTime = null;
    let startDelay = null;

    const tick = (timestamp) => {
      if (!startDelay) startDelay = timestamp;
      if (timestamp - startDelay < delayMs) {
        rafRef.current = requestAnimationFrame(tick);
        return;
      }
      if (!startTime) startTime = timestamp;
      const elapsed = timestamp - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setCount(Math.round(eased * numTarget));
      if (progress < 1) rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [target, duration, delayMs]);

  return count;
}

export function StatCard({ icon: Icon, label, value, hint, tone = 'text-primary', staggerIndex = 0 }) {
  const delayMs = staggerIndex * 60;
  const delayS = delayMs / 1000;
  const animatedValue = useCountUp(value, 600, delayMs);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: 'easeOut', delay: delayS }}
    >
      <Card className="h-full">
        <CardContent className="flex items-start justify-between gap-3 p-5">
          <div className="space-y-1">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {label}
            </p>
            <p className="text-2xl font-semibold tabular-nums">{animatedValue}</p>
            {hint && <p className="text-xs text-foreground/60">{hint}</p>}
          </div>
          {Icon && (
            <div className={cn(
              'shrink-0 rounded-lg p-2.5',
              tone.includes('risk-safe') ? 'bg-risk-safe-soft text-risk-safe' :
              tone.includes('risk-quarantine') ? 'bg-risk-quarantine-soft text-risk-quarantine' :
              tone.includes('risk-phishing') ? 'bg-risk-phishing-soft text-risk-phishing' :
              tone.includes('risk-review') ? 'bg-risk-review-soft text-risk-review' :
              `bg-muted/50 ${tone}`
            )}>
              <Icon className="h-5 w-5" />
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
