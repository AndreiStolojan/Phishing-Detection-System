import { CalendarRange } from 'lucide-react';

import { useTimeRange } from '@/context/TimeRangeContext';
import { fromDateInputValue, toDateInputValue } from '@/lib/timeRange';
import { cn } from '@/lib/utils';

/*
  The app-wide From/To window picker. Lives on the dashboard; every time-scoped
  view reads the resulting window from TimeRangeContext. Two native date inputs,
  both days inclusive. Invalid ranges can't be submitted: choosing a From after
  the current To clamps To up to it (and vice-versa), and the native min/max
  attributes block out-of-order picks in the calendar UI.
*/
export function TimeRangeFilter({ variant = 'default', className }) {
  const { fromDate, toDate, setRange } = useTimeRange();

  const handleFrom = (event) => {
    const next = fromDateInputValue(event.target.value);
    if (!next) return;
    // Keep from <= to: if the new From passes the current To, push To up to it.
    setRange({ from: next, to: next > toDate ? next : toDate });
  };

  const handleTo = (event) => {
    const next = fromDateInputValue(event.target.value);
    if (!next) return;
    // Keep from <= to: if the new To falls before the current From, pull From back.
    setRange({ from: next < fromDate ? next : fromDate, to: next });
  };

  return (
    <div
      className={cn(
        'inline-flex items-center gap-1.5 rounded-sm px-3 py-1.5 text-xs font-medium text-muted-foreground',
        variant === 'default' && 'border border-border bg-card/60',
        variant === 'plain' && 'transition-colors hover:bg-accent hover:text-foreground',
        className
      )}
    >
      <CalendarRange className="h-3.5 w-3.5 shrink-0" />
      <input
        type="date"
        aria-label="From"
        value={toDateInputValue(fromDate)}
        max={toDateInputValue(toDate)}
        onChange={handleFrom}
        className="bg-transparent text-foreground outline-none [color-scheme:dark]"
      />
      <span aria-hidden="true" className="text-muted-foreground">–</span>
      <input
        type="date"
        aria-label="To"
        value={toDateInputValue(toDate)}
        min={toDateInputValue(fromDate)}
        onChange={handleTo}
        className="bg-transparent text-foreground outline-none [color-scheme:dark]"
      />
    </div>
  );
}
