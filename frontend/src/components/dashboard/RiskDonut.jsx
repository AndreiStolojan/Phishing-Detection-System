import { Cell, Pie, PieChart, ResponsiveContainer } from 'recharts';
import { ShieldQuestion } from 'lucide-react';

import { EmptyState } from '@/components/common/states';

/**
 * Donut showing how scanned messages split across verdicts.
 * `data` is [{ name, value, color }]. Center can show a custom value/label
 * (e.g. the safe %). Deliberately static — no hover highlighting.
 */
export function RiskDonut({ data, centerValue, centerLabel = 'scanned' }) {
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
            >
              {slices.map((slice) => (
                <Cell key={slice.name} fill={slice.color} />
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
        {slices.map((slice) => {
          const pct = Math.round((slice.value / total) * 100);
          return (
            <li
              key={slice.name}
              className="flex items-center gap-2 rounded-md px-2 py-1 text-sm"
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
