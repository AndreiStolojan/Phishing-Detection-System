// ─────────────────────────────────────────────────────────────────────────────
// RiskDonut.jsx — graficul donut cu distribuția riscului pe dashboard.
//
// Ce face, pe scurt: primește o listă `data` de forma [{ name, value, color }]
// (de ex. câte emailuri sunt "safe", "needs_review", "quarantine" etc.) și
// desenează un grafic tip "donut" (un cerc cu o gaură în mijloc) folosind
// librăria recharts. În mijlocul găurii poate afișa o valoare/etichetă
// personalizată (de ex. procentul de emailuri sigure). Sub grafic, o listă cu
// fiecare categorie, numărul ei și procentul din total.
//
// Important: culorile vin deja calculate din `lib/risk.js` (single source of
// truth pentru culorile de risc) — componenta doar le folosește, nu inventează.
//
// Folosit în: pagina Dashboard (vezi docs/EXPLICATIE_FRONTEND.md §7).
// ─────────────────────────────────────────────────────────────────────────────

import { Cell, Pie, PieChart, ResponsiveContainer } from 'recharts';
import { ShieldQuestion } from 'lucide-react';

import { EmptyState } from '@/components/common/states';

/**
 * Donut care arată cum se împart emailurile scanate pe verdicte.
 * `data` e [{ name, value, color }]. Centrul poate arăta o valoare/etichetă
 * personalizată (ex: procentul "safe"). Grafic intenționat static — fără
 * evidențiere la hover.
 */
export function RiskDonut({ data, centerValue, centerLabel = 'scanned' }) {
  // Ignorăm categoriile cu valoare 0 (nu are sens să desenăm o felie goală).
  const slices = data.filter((d) => d.value > 0);
  // Totalul tuturor feliilor — folosit ca numitor pentru procente.
  const total = slices.reduce((sum, d) => sum + d.value, 0);

  // Dacă nu există deloc date (nimic scanat încă), arătăm o stare goală
  // (EmptyState) cu un mesaj prietenos, în loc de un grafic gol/ciudat.
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
      {/* Grafic donut: container responsive (se adaptează la lățimea părintelui).
          `pointer-events-none` -> graficul e pur decorativ: clickul pe o felie nu
          mai declanșează nimic (fără focus/selecție pe feliile SVG recharts). */}
      <div className="relative h-52 w-52 shrink-0 pointer-events-none">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={slices}
              dataKey="value"
              nameKey="name"
              innerRadius={64} // raza interioară -> creează "gaura" donutului
              outerRadius={92}
              paddingAngle={2} // mic spațiu între felii
              stroke="none"
            >
              {/* Pentru fiecare felie desenăm o "Cell" cu culoarea ei specifică
                  (culoarea vine din `data`, calculată în lib/risk.js) */}
              {slices.map((slice) => (
                <Cell key={slice.name} fill={slice.color} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        {/* Text suprapus exact peste centrul donutului (poziționat absolut,
            "pointer-events-none" = nu blochează click-urile pe grafic) */}
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-3xl font-semibold tabular-nums">{centerValue ?? total}</span>
          <span className="text-[11px] text-muted-foreground">{centerLabel}</span>
        </div>
      </div>

      {/* Legenda: o linie pe categorie, cu bulina colorată, numele,
          numărul absolut și procentul din total */}
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
