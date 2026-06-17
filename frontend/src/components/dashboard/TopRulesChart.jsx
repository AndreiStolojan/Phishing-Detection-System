// ─────────────────────────────────────────────────────────────────────────────
// TopRulesChart.jsx — graficul "cele mai frecvente semne de avertizare" de pe
// dashboard.
//
// Ce face, pe scurt: primește o listă `rules` (regulile de phishing care s-au
// declanșat cel mai des, calculate de backend în report.service.js prin
// topTriggeredRulesFacet) și le desenează ca un grafic cu bare orizontale,
// arătând în câte emailuri a apărut fiecare regulă. Barele sunt colorate pe o
// "rampă de severitate": cea mai frecventă regulă (sau cele apropiate de ea ca
// frecvență) au culoarea de "quarantine" (cea mai gravă), cele de mijloc au
// culoarea de "review", iar restul au o culoare neutră de grafic.
//
// Folosit în: pagina Dashboard (vezi docs/EXPLICATIE_FRONTEND.md §7).
// ─────────────────────────────────────────────────────────────────────────────

import { Bar, BarChart, Cell, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { ListChecks } from 'lucide-react';

import { EmptyState } from '@/components/common/states';
import { getRuleLabel } from '@/lib/risk';

// Alege culoarea unei bare pe baza fracției `frac` = (count-ul regulii) /
// (count-ul maxim dintre toate regulile afișate). Cu cât regula a fost
// declanșată mai des relativ la cea mai frecventă, cu atât bara e mai
// "alarmantă" la culoare.
const barColor = (frac) =>
  frac >= 0.66
    ? 'var(--color-risk-quarantine)'
    : frac >= 0.33
      ? 'var(--color-risk-review)'
      : 'var(--color-chart-1)';

// Tooltip personalizat (textul care apare la hover peste o bară), afișând
// numele regulii, în câte emailuri a fost găsită și, dacă există, câte
// puncte de risc adaugă în total.
function ChartTooltip({ active, payload }) {
  if (!active || !payload?.length) return null; // nimic de afișat dacă tooltip-ul e inactiv
  const d = payload[0].payload; // datele barei peste care e cursorul
  return (
    <div className="rounded-lg border border-border bg-popover px-3 py-2 text-xs surface-overlay">
      <p className="font-medium text-foreground">{d.name}</p>
      <p className="text-muted-foreground">
        Found in {d.count} email{d.count !== 1 ? 's' : ''}
        {d.points ? ` · adds ${d.points} to risk score` : ''}
      </p>
    </div>
  );
}

export function TopRulesChart({ rules }) {
  // Dacă nu există nicio regulă declanșată în perioada selectată, arătăm o
  // stare goală cu un mesaj prietenos, în loc de un grafic vid.
  if (!rules || rules.length === 0) {
    return (
      <EmptyState
        icon={ListChecks}
        title="No warning signs"
        description="No phishing warning signs were found in this period."
        className="border-0 py-10"
      />
    );
  }

  // Luăm doar primele 6 reguli (cele mai frecvente — backend-ul le trimite
  // deja sortate) și le transformăm în formatul cerut de recharts: nume
  // afișabil (tradus prin getRuleLabel), numărul de emailuri și punctele
  // totale adăugate la scor.
  const data = rules.slice(0, 6).map((rule) => ({
    name: getRuleLabel(rule.rule),
    count: rule.count || 0,
    points: rule.totalPoints || 0,
  }));
  // Valoarea maximă (cel puțin 1, pentru a evita împărțirea la zero la barColor).
  const max = Math.max(...data.map((d) => d.count), 1);

  return (
    // Înălțimea graficului crește cu numărul de bare, dar nu sub 180px.
    <ResponsiveContainer width="100%" height={Math.max(180, data.length * 46)}>
      {/* layout="vertical" => barele sunt orizontale, categoriile pe axa Y */}
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
          {/* Fiecare bară își primește propria culoare, calculată cu barColor
              pe baza ponderii ei față de bara maximă */}
          {data.map((entry, i) => (
            <Cell key={i} fill={barColor(entry.count / max)} />
          ))}
          {/* Etichetă cu valoarea numerică, afișată la dreapta fiecărei bare */}
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
