/* One-off WCAG 2.1 contrast audit for the SecureInbox dark theme.
   - sRGB alpha compositing for Tailwind `/NN` opacity utilities.
   - oklab mixing for `color-mix(in oklab, C X%, B)` (the -soft tokens).
   Not shipped — lives under scripts/ for the a11y pass. */

const hex = (h) => {
  const s = h.replace('#', '');
  return [0, 2, 4].map((i) => parseInt(s.slice(i, i + 2), 16) / 255);
};

// sRGB <-> linear
const toLin = (c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
const toSrgb = (c) => (c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055);

// linear sRGB -> oklab
const linToOklab = ([r, g, b]) => {
  const l = 0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b;
  const m = 0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b;
  const s = 0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b;
  const l_ = Math.cbrt(l), m_ = Math.cbrt(m), s_ = Math.cbrt(s);
  return [
    0.2104542553 * l_ + 0.793617785 * m_ - 0.0040720468 * s_,
    1.9779984951 * l_ - 2.428592205 * m_ + 0.4505937099 * s_,
    0.0259040371 * l_ + 0.7827717662 * m_ - 0.808675766 * s_,
  ];
};
const oklabToLin = ([L, a, b]) => {
  const l_ = L + 0.3963377774 * a + 0.2158037573 * b;
  const m_ = L - 0.1055613458 * a - 0.0638541728 * b;
  const s_ = L - 0.0894841775 * a - 1.291485548 * b;
  const l = l_ ** 3, m = m_ ** 3, s = s_ ** 3;
  return [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ];
};

// color-mix(in oklab, c <pct>%, b) — c at pct, b at (100-pct)
const mixOklab = (c, b, pct) => {
  const cl = linToOklab(hex(c).map(toLin));
  const bl = linToOklab(hex(b).map(toLin));
  const t = pct / 100;
  const mixed = cl.map((v, i) => v * t + bl[i] * (1 - t));
  return oklabToLin(mixed).map(toSrgb);
};

// sRGB alpha composite: fg at alpha over solid bg (browser default space)
const over = (fg, bg, alpha) => hex(fg).map((c, i) => c * alpha + hex(bg)[i] * (1 - alpha));

const lum = (rgb) => {
  const [r, g, b] = rgb.map(toLin);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const ratio = (fg, bg) => {
  const a = lum(Array.isArray(fg) ? fg : hex(fg));
  const b = lum(Array.isArray(bg) ? bg : hex(bg));
  const [hi, lo] = a > b ? [a, b] : [b, a];
  return (hi + 0.05) / (lo + 0.05);
};
const r2 = (n) => Math.round(n * 100) / 100;

// ── tokens ──
const T = {
  background: '#0a0d14', card: '#11151f', popover: '#141a26', muted: '#1a2233',
  foreground: '#e7ecf3', mutedFg: '#9aa6ba', mutedFgSubtle: '#828fa3',
  secondary: '#1c2536', secondaryFg: '#cdd6e4', accent: '#1c2740', accentFg: '#dce6f7',
  primary: '#3b9eff', primaryFg: '#04111f',
  destructive: '#ef5350', destructiveStrong: '#c62828', destructiveFg: '#fff5f5',
  riskSafe: '#3ddc97', riskReview: '#fbbf24', riskQuar: '#fb637e', riskPhish: '#b873f9', riskUnscanned: '#8a96aa',
};

const checks = [];
const add = (label, fg, bg, need) => checks.push({ label, ratio: r2(ratio(fg, bg)), need });

// text on surfaces
for (const [bn, bg] of [['bg', T.background], ['card', T.card], ['muted', T.muted]]) {
  add(`foreground / ${bn}`, T.foreground, bg, 4.5);
  add(`muted-foreground / ${bn}`, T.mutedFg, bg, 4.5);
  add(`muted-foreground-subtle / ${bn}`, T.mutedFgSubtle, bg, 4.5);
  add(`primary(text) / ${bn}`, T.primary, bg, 4.5);
}
add('muted-foreground-subtle / card', T.mutedFgSubtle, T.card, 4.5);
add('muted-foreground-subtle / muted', T.mutedFgSubtle, T.muted, 4.5);
add('secondary-foreground / secondary', T.secondaryFg, T.secondary, 4.5);
add('accent-foreground / accent', T.accentFg, T.accent, 4.5);
add('primary-foreground / primary (button)', T.primaryFg, T.primary, 4.5);

// risk colours as text, on bg / card / their soft surface
const soft = { riskSafe: 15, riskReview: 15, riskQuar: 16, riskPhish: 17, riskUnscanned: 12 };
for (const k of ['riskSafe', 'riskReview', 'riskQuar', 'riskPhish', 'riskUnscanned']) {
  add(`${k} / bg`, T[k], T.background, 4.5);
  add(`${k} / card`, T[k], T.card, 4.5);
  add(`${k} / ${k}-soft`, T[k], mixOklab(T[k], T.background, soft[k]), 4.5);
}

// ── delete affordances ──
// destructive solid button: strong fill + /90 hover, inside an alert dialog (popover bg)
add('destructiveFg / destructive-strong (base)', T.destructiveFg, T.destructiveStrong, 4.5);
add('destructiveFg / destructive-strong-90 over popover (hover)', T.destructiveFg, over(T.destructiveStrong, T.popover, 0.9), 4.5);
add('destructive-strong surface / popover (UI ≥3)', T.destructiveStrong, T.popover, 3);
// Settings ghost delete: text-destructive, hover bg destructive/10 over card
add('destructive(text) / card (base)', T.destructive, T.card, 4.5);
add('destructive(text) / destructive-10 over card (hover)', T.destructive, over(T.destructive, T.card, 0.1), 4.5);
// SenderLists delete: hover text risk-quarantine on risk-quarantine-soft
add('riskQuar(text) / riskQuar-soft (hover)', T.riskQuar, mixOklab(T.riskQuar, T.background, 16), 4.5);

// report
let fails = 0;
for (const c of checks) {
  const pass = c.ratio >= c.need;
  if (!pass) fails++;
  console.log(`${pass ? 'PASS' : 'FAIL'}  ${c.ratio.toFixed(2)} (need ${c.need})  ${c.label}`);
}
console.log(`\n${fails} FAIL / ${checks.length} checks`);
