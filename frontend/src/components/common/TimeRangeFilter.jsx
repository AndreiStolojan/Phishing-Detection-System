// ─────────────────────────────────────────────────────────────────────────────
// TimeRangeFilter.jsx — selectorul global de interval de timp.
//
// Ce face, pe scurt: un buton care arată intervalul curent (ex. "Last 30 days")
// și deschide un meniu cu presetări rapide (Last 7 / 30 / 90 days) + "Custom".
// "Custom" deschide un calendar pe două luni din care userul alege un interval
// (clic pe ziua de start, apoi pe ziua de final). Starea efectivă (from/to) e
// ținută în TimeRangeContext — acest component e doar UI-ul care o citește și o
// modifică prin setRange(). Nu atinge backend-ul: intervalul ajunge la API tot
// ca ?from=&to= (vezi toISOWindow din lib/timeRange.js).
//
// Detalii: docs/EXPLICATIE_FRONTEND.md §5.3.
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, useRef, useState } from 'react';
import { ListFilter, ChevronLeft, ChevronRight, Check } from 'lucide-react';

import { useTimeRange } from '@/context/TimeRangeContext';
import {
  RANGE_PRESETS,
  getPresetRange,
  getMonthMatrix,
  addMonths,
  isSameDay,
  isAfterDay,
  isInRange,
  MONTH_NAMES,
} from '@/lib/timeRange';
import { cn } from '@/lib/utils';

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

// Anii disponibili în dropdown: ultimii 6 ani până azi (nu permitem viitorul).
const yearOptions = (now) => {
  const y = now.getFullYear();
  return Array.from({ length: 6 }, (_, i) => y - 5 + i);
};

// O lună afișată în calendar: header cu dropdown lună+an, antet zile, grila.
function MonthGrid({ year, month, today, start, end, hovered, onHover, onPick, onMonth, years }) {
  const weeks = getMonthMatrix(year, month);
  // Capătul de final "efectiv" pentru previzualizarea intervalului: dacă userul
  // a ales doar startul, folosim ziua peste care trece cu mouse-ul (hovered).
  const previewEnd = end || (start && hovered);
  const lo = start && previewEnd && previewEnd < start ? previewEnd : start;
  const hi = start && previewEnd && previewEnd < start ? start : previewEnd;

  return (
    <div className="min-w-[15rem]">
      <div className="mb-3 flex items-center gap-2">
        <select
          aria-label="Month"
          value={month}
          onChange={(e) => onMonth(year, Number(e.target.value))}
          className="h-9 flex-1 rounded-md border border-input bg-card px-2 text-sm text-foreground outline-none focus:ring-1 focus:ring-ring"
        >
          {MONTH_NAMES.map((name, i) => (
            <option key={name} value={i}>
              {name}
            </option>
          ))}
        </select>
        <select
          aria-label="Year"
          value={year}
          onChange={(e) => onMonth(Number(e.target.value), month)}
          className="h-9 w-24 rounded-md border border-input bg-card px-2 text-sm text-foreground outline-none focus:ring-1 focus:ring-ring"
        >
          {years.map((y) => (
            <option key={y} value={y}>
              {y}
            </option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-7 gap-y-1">
        {WEEKDAYS.map((d) => (
          <div key={d} className="flex h-8 items-center justify-center text-xs font-semibold text-foreground">
            {d}
          </div>
        ))}
        {weeks.flat().map((day) => {
          const inMonth = day.getMonth() === month;
          const disabled = isAfterDay(day, today);
          const isStart = start && isSameDay(day, start);
          const isEnd = end && isSameDay(day, end);
          const isEndpoint = isStart || isEnd;
          const between = isInRange(day, lo, hi) && !isEndpoint;
          const isToday = isSameDay(day, today);
          return (
            <button
              type="button"
              key={day.toISOString()}
              disabled={disabled}
              onMouseEnter={() => onHover(day)}
              onClick={() => onPick(day)}
              className={cn(
                'mx-auto flex h-9 w-9 items-center justify-center rounded-md text-sm tabular-nums transition-colors',
                disabled && 'cursor-not-allowed text-muted-foreground-subtle opacity-40',
                !disabled && !inMonth && 'text-muted-foreground-subtle',
                !disabled && inMonth && 'text-foreground hover:bg-accent',
                !disabled && isToday && !isEndpoint && 'font-semibold text-primary',
                between && 'bg-primary/15',
                isEndpoint && 'bg-primary font-medium text-primary-foreground hover:bg-primary'
              )}
            >
              {day.getDate()}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/*
  Selectorul global de interval. `variant`/`className` controlează doar aspectul
  butonului-declanșator (păstrate pentru compatibilitate cu locurile de apel).
*/
export function TimeRangeFilter({ variant = 'default', className }) {
  const { label, preset, fromDate, toDate, setRange } = useTimeRange();

  const [open, setOpen] = useState(false);
  const [view, setView] = useState('presets'); // 'presets' | 'custom'
  const containerRef = useRef(null);

  // `now`/`today` calculate la fiecare render, dar folosite doar pentru limite
  // (ziua de azi e stabilă în cadrul unei sesiuni de selecție).
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const years = yearOptions(now);

  // Luna afișată în stânga; dreapta = stânga + 1 (mereu consecutive).
  const initLeft = addMonths(today.getFullYear(), today.getMonth(), -1);
  const [leftMonth, setLeftMonth] = useState(initLeft);
  const rightMonth = addMonths(leftMonth.year, leftMonth.month, 1);

  // Capetele selecției în curs (obiecte Date) + ziua peste care e mouse-ul.
  const [start, setStart] = useState(null);
  const [end, setEnd] = useState(null);
  const [hovered, setHovered] = useState(null);

  // Închide la clic în afară și la Escape.
  useEffect(() => {
    if (!open) return undefined;
    const onDown = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) setOpen(false);
    };
    const onKey = (e) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  // Deschide/închide meniul; la deschidere pornim din presetări și pre-populăm
  // calendarul cu intervalul curent.
  const toggleMenu = () => {
    if (!open) {
      setView('presets');
      setStart(fromDate);
      setEnd(toDate);
      setHovered(null);
      setLeftMonth(addMonths(today.getFullYear(), today.getMonth(), -1));
    }
    setOpen((v) => !v);
  };

  const choosePreset = (p) => {
    setRange({ ...getPresetRange(p.days, now), preset: p.key });
    setOpen(false);
  };

  // Logica de selecție a intervalului: primul clic = start; al doilea = final
  // (cu interschimbare dacă e înainte de start), apoi aplică și închide.
  const pick = (day) => {
    if (!start || end) {
      setStart(day);
      setEnd(null);
      return;
    }
    const [from, to] = day < start ? [day, start] : [start, day];
    setStart(from);
    setEnd(to);
    setRange({ from, to, preset: null });
    setOpen(false);
  };

  // Mută luna afișată în stânga (dreapta se recalculează automat). Când userul
  // editează dropdown-urile lunii din dreapta, primim deja luna-1 din onMonth.
  const moveLeft = (year, month) => setLeftMonth({ year, month });
  const moveRight = (year, month) => setLeftMonth(addMonths(year, month, -1));

  return (
    <div ref={containerRef} className={cn('relative inline-block', className)}>
      <button
        type="button"
        onClick={toggleMenu}
        aria-haspopup="dialog"
        aria-expanded={open}
        style={{ borderColor: '#2d3a5e' }}
        className={cn(
          'inline-flex h-[34px] items-center gap-2 rounded-md px-4 py-2 text-sm font-medium text-foreground transition-colors',
          variant === 'default' && 'border border-input bg-card/60 hover:bg-accent',
          variant === 'plain' && 'border border-input hover:bg-accent'
        )}
      >
        <ListFilter className="h-4 w-4 shrink-0 text-muted-foreground" />
        {label}
      </button>

      {open && (
        <div
          role="dialog"
          className="surface-overlay absolute right-0 z-50 mt-2 rounded-lg border border-border bg-popover p-2 text-popover-foreground"
        >
          {view === 'presets' ? (
            <div className="w-52">
              {RANGE_PRESETS.map((p) => (
                <button
                  type="button"
                  key={p.key}
                  onClick={() => choosePreset(p)}
                  className="flex w-full items-center justify-between rounded-md px-3 py-2 text-sm text-foreground transition-colors hover:bg-accent"
                >
                  {p.label}
                  {preset === p.key && <Check className="h-4 w-4 text-primary" />}
                </button>
              ))}
              <button
                type="button"
                onClick={() => setView('custom')}
                className="mt-1 flex w-full items-center justify-between rounded-md px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
              >
                Custom
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </button>
            </div>
          ) : (
            <div className="p-2">
              <button
                type="button"
                onClick={() => setView('presets')}
                className="mb-3 flex items-center gap-1 rounded-md px-1 py-1 text-sm font-medium text-foreground transition-colors hover:text-muted-foreground"
              >
                <ChevronLeft className="h-4 w-4" />
                Back
              </button>
              <div
                className="flex flex-col gap-6 sm:flex-row sm:gap-8"
                onMouseLeave={() => setHovered(null)}
              >
                <MonthGrid
                  year={leftMonth.year}
                  month={leftMonth.month}
                  today={today}
                  start={start}
                  end={end}
                  hovered={hovered}
                  onHover={setHovered}
                  onPick={pick}
                  onMonth={moveLeft}
                  years={years}
                />
                <MonthGrid
                  year={rightMonth.year}
                  month={rightMonth.month}
                  today={today}
                  start={start}
                  end={end}
                  hovered={hovered}
                  onHover={setHovered}
                  onPick={pick}
                  onMonth={moveRight}
                  years={years}
                />
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
