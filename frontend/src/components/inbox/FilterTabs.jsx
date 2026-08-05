// ─────────────────────────────────────────────────────────────────────────────
// FilterTabs.jsx — the risk filter, shaped like a mail client's tab strip.
//
// One horizontal row sitting directly above the message list, most urgent
// first (the order is RISK_FILTERS', which is already correct — this file only
// renders it). Each tab carries the number of messages it holds for the current
// time range, so the strip doubles as the "where is the danger" summary and the
// user never has to click a tab to discover it is empty.
//
// The active tab is marked with an underline rather than a filled pill: a pill
// reads as a button, an underline reads as "you are here", which is what a
// mail client's tabs mean. The underline picks up the category's own colour
// from lib/risk.js, so "Likely phishing" is always the same hue here as it is
// on the badge in the list — but the LABEL stays neutral foreground text, so
// running copy is never set in a saturated colour.
// ─────────────────────────────────────────────────────────────────────────────

import { motion } from 'framer-motion';

import { RISK_FILTERS, getRiskMeta } from '@/lib/risk';
import { springSoft } from '@/lib/motion';
import { cn } from '@/lib/utils';

// "All" is not a risk category, so it gets the neutral foreground.
const underlineColor = (key) =>
  key ? getRiskMeta(key).tone.hex : 'var(--color-foreground)';

export function FilterTabs({ active, counts, showCounts = true, onSelect }) {
  return (
    <div
      role="tablist"
      aria-label="Filter messages by risk"
      className="flex shrink-0 flex-wrap items-center gap-x-1 border-b border-border px-3"
    >
      {RISK_FILTERS.map(({ key, label }) => {
        const isActive = active === key;
        const count = counts?.[key];

        return (
          <button
            key={key || 'all'}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => onSelect(key)}
            className={cn(
              'relative flex items-baseline gap-1.5 whitespace-nowrap px-2.5 py-2.5 text-[13px]',
              'outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring',
              isActive
                ? 'font-medium text-foreground'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            <span>{label}</span>
            {showCounts && Number.isFinite(count) && (
              <span className="text-[11px] tabular-nums text-muted-foreground-subtle">
                {count}
              </span>
            )}
            {isActive && (
              <motion.span
                layoutId="inbox-filter-underline"
                transition={springSoft}
                aria-hidden="true"
                className="absolute inset-x-1.5 -bottom-px h-[2px] rounded-full"
                style={{ backgroundColor: underlineColor(key) }}
              />
            )}
          </button>
        );
      })}
    </div>
  );
}
