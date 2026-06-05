import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';

import { EmptyState } from '@/components/common/states';
import { ShieldQuestion } from 'lucide-react';

/**
 * Donut showing how scanned messages split across verdicts.
 * `data` is [{ name, value, color }].
 */
export function RiskDonut({ data }) {
  const slices = data.filter((d) => d.value > 0);
  const total = slices.reduce((sum, d) => sum + d.value, 0);

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
    <div className="flex flex-col items-center gap-4 sm:flex-row">
      <div className="relative h-44 w-44 shrink-0">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={slices}
              dataKey="value"
              nameKey="name"
              innerRadius={56}
              outerRadius={80}
              paddingAngle={2}
              stroke="none"
            >
              {slices.map((slice) => (
                <Cell key={slice.name} fill={slice.color} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                background: 'var(--color-popover)',
                border: '1px solid var(--color-border)',
                borderRadius: '0.5rem',
                fontSize: '0.8rem',
              }}
              labelStyle={{ color: 'var(--color-foreground)' }}
            />
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-semibold tabular-nums">{total}</span>
          <span className="text-[11px] text-muted-foreground">scanned</span>
        </div>
      </div>

      <ul className="flex-1 space-y-2">
        {slices.map((slice) => (
          <li key={slice.name} className="flex items-center gap-2 text-sm">
            <span
              className="h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: slice.color }}
            />
            <span className="text-muted-foreground">{slice.name}</span>
            <span className="ml-auto font-medium tabular-nums">{slice.value}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
