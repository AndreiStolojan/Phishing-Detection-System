import { Fragment } from 'react';
import { Mail, ScanLine, ShieldAlert, ShieldX } from 'lucide-react';
import { motion } from 'framer-motion';

import { cn } from '@/lib/utils';
import { springSoft } from '@/lib/motion';

const STEPS = [
  {
    key: 'synced',
    label: 'Synced',
    sublabel: 'from Gmail',
    icon: Mail,
    color: 'text-primary',
    bg: 'bg-primary/10',
  },
  {
    key: 'scanned',
    label: 'Scanned',
    sublabel: 'for threats',
    icon: ScanLine,
    color: 'text-primary',
    bg: 'bg-primary/10',
  },
  {
    key: 'threats',
    label: 'Threats found',
    sublabel: 'suspicious or worse',
    icon: ShieldAlert,
    color: 'text-risk-quarantine',
    bg: 'bg-risk-quarantine-soft',
  },
  {
    key: 'confirmed',
    label: 'Confirmed phishing',
    sublabel: 'reviewed & marked',
    icon: ShieldX,
    color: 'text-risk-phishing',
    bg: 'bg-risk-phishing-soft',
  },
];

function Arrow() {
  return (
    <div className="hidden shrink-0 items-center sm:flex">
      <svg
        width="20"
        height="12"
        viewBox="0 0 20 12"
        fill="none"
        className="text-border"
      >
        <path
          d="M0 6h16M12 1l5 5-5 5"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
}

export function DetectionFunnel({ synced, scanned, threats, confirmed }) {
  const values = { synced, scanned, threats, confirmed };

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 sm:flex-nowrap">
      {STEPS.map((step, i) => {
        const val = values[step.key] ?? 0;
        return (
          <Fragment key={step.key}>
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ ...springSoft, delay: i * 0.07 }}
              className="flex min-w-0 flex-1 flex-col items-center gap-1.5 text-center"
            >
              <div className={cn('rounded-lg p-2', step.bg)}>
                <step.icon className={cn('h-4 w-4', step.color)} />
              </div>
              <span
                className={cn(
                  'text-2xl font-semibold tabular-nums leading-none',
                  step.color
                )}
              >
                {val}
              </span>
              <span className="text-xs font-medium text-foreground/80">{step.label}</span>
              <span className="text-[11px] text-muted-foreground/60">{step.sublabel}</span>
            </motion.div>
            {i < STEPS.length - 1 && <Arrow />}
          </Fragment>
        );
      })}
    </div>
  );
}
