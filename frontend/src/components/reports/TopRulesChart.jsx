import { Bar, BarChart, Cell, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { ListChecks } from 'lucide-react';

import { EmptyState } from '@/components/common/states';
import { getRuleLabel } from '@/lib/risk';

// Colour bars along a severity ramp by how often a rule fired relative to the top one.
const barColor = (frac) =>
  frac >= 0.66
    ? 'var(--color-risk-quarantine)'
    : frac >= 0.33
      ? 'var(--color-risk-review)'
      : 'var(--color-chart-1)';

function ChartTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="rounded-lg border border-border bg-popover px-3 py-2 text-xs surface-overlay">
      <p className="font-medium text-foreground">{d.name}</p>
      <p className="text-muted-foreground">
        {d.count} occurrence{d.count !== 1 ? 's' : ''}
        {d.points ? ` · ${d.points} pts in score` : ''}
      </p>
    </div>
  );
}

export function TopRulesChart({ rules }) {
  if (!rules || rules.length === 0) {
    return (
      <EmptyState
        icon={ListChecks}
        title="No rules triggered"
        description="No phishing rules fired in this period."
        className="border-0 py-10"
      />
    );
  }

  const data = rules.slice(0, 6).map((rule) => ({
    name: getRuleLabel(rule.rule),
    count: rule.count || 0,
    points: rule.totalPoints || 0,
  }));
  const max = Math.max(...data.map((d) => d.count), 1);

  return (
    <ResponsiveContainer width="100%" height={Math.max(180, data.length * 46)}>
      <BarChart data={data} layout="vertical" margin={{ left: 8, right: 28 }}>
        <XAxis type="number" hide />
        <YAxis
          type="category"
          dataKey="name"
          width={150}
          tick={{ fill: 'var(--color-muted-foreground)', fontSize: 12 }}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip cursor={{ fill: 'var(--color-accent)', opacity: 0.35 }} content={<ChartTooltip />} />
        <Bar dataKey="count" radius={[0, 6, 6, 0]} barSize={18}>
          {data.map((entry, i) => (
            <Cell key={i} fill={barColor(entry.count / max)} />
          ))}
          <LabelList
            dataKey="count"
            position="right"
            style={{ fill: 'var(--color-muted-foreground)', fontSize: 11 }}
          />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
