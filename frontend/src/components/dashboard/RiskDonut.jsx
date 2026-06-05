import { useState } from 'react';
import { Cell, Pie, PieChart, ResponsiveContainer } from 'recharts';
import { ShieldQuestion } from 'lucide-react';

import { EmptyState } from '@/components/common/states';
import { cn } from '@/lib/utils';

/**
 * Donut showing how scanned messages split across verdicts.
 * `data` is [{ name, value, color }]. Center can show a custom value/label
 * (e.g. the safe %); legend and slices highlight together on hover.
 */
export function RiskDonut({ data, centerValue, centerLabel = 'scanned' }) {
  const slices = data.filter((d) => d.value > 0);
  const total = slices.reduce((sum, d) => sum + d.value, 0);
  const [active, setActive] = useState(null);

  if (total === 0) {
    return (
      <EmptyState
        icon={ShieldQuestion}
        title="Nothing scanned yet"
        description="Run a sync to populate your security breakdown."
        className="border-0 py-10"
      />
    );
  }

  return (
    <div className="flex flex-col items-center gap-5 sm:flex-row">
      <div className="relative h-52 w-52 shrink-0">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={slices}
              dataKey="value"
              nameKey="name"
              innerRadius={64}
              outerRadius={92}
              paddingAngle={2}
              stroke="none"
              onMouseEnter={(_, i) => setActive(i)}
              onMouseLeave={() => setActive(null)}
            >
              {slices.map((slice, i) => (
                <Cell
                  key={slice.name}
                  fill={slice.color}
                  opacity={active === null || active === i ? 1 : 0.3}
                  style={{ transition: 'opacity 150ms' }}
                />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-3xl font-semibold tabular-nums">{centerValue ?? total}</span>
          <span className="text-[11px] text-muted-foreground">{centerLabel}</span>
        </div>
      </div>

      <ul className="w-full flex-1 space-y-1">
        {slices.map((slice, i) => {
          const pct = Math.round((slice.value / total) * 100);
          return (
            <li
              key={slice.name}
              onMouseEnter={() => setActive(i)}
              onMouseLeave={() => setActive(null)}
              className={cn(
                'flex items-center gap-2 rounded-md px-2 py-1 text-sm transition-colors',
                active === i && 'bg-accent/60'
              )}
            >
              <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: slice.color }} />
              <span className="text-muted-foreground">{slice.name}</span>
              <span className="ml-auto font-medium tabular-nums">{slice.value}</span>
              <span className="w-9 text-right text-xs tabular-nums text-muted-foreground">{pct}%</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
