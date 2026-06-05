import { Bar, BarChart, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

import { EmptyState } from '@/components/common/states';
import { ListChecks } from 'lucide-react';
import { humanize } from '@/lib/risk';

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
    name: humanize(String(rule.rule || '').replace(/[:_]/g, ' ')),
    count: rule.count || 0,
    points: rule.totalPoints || 0,
  }));

  return (
    <ResponsiveContainer width="100%" height={Math.max(180, data.length * 44)}>
      <BarChart data={data} layout="vertical" margin={{ left: 8, right: 16 }}>
        <XAxis type="number" hide />
        <YAxis
          type="category"
          dataKey="name"
          width={150}
          tick={{ fill: 'var(--color-muted-foreground)', fontSize: 12 }}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip
          cursor={{ fill: 'var(--color-accent)' }}
          contentStyle={{
            background: 'var(--color-popover)',
            border: '1px solid var(--color-border)',
            borderRadius: '0.5rem',
            fontSize: '0.8rem',
          }}
          labelStyle={{ color: 'var(--color-foreground)' }}
        />
        <Bar dataKey="count" radius={[0, 4, 4, 0]} barSize={18}>
          {data.map((entry, i) => (
            <Cell key={i} fill="var(--color-chart-1)" />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
