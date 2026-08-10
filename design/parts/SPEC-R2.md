# Round 2 addendum — three variations on Direction C ("Instrument")

Read `SPEC.md` **in full first**. Everything in it still applies: the same two screens, the same
4-block dashboard, the same exact fake data (§5), the same DOM contract (§4), and the same hard
requirements (§3 — fragment only, every rule scoped, no scripts, no external resources, hand-written
inline SVG charts, both media queries).

This file states **what changes** for round 2.

---

## Why round 2 exists

Three directions were mocked (A Dossier, B Briefing, C Instrument). The reviewer picked **C** — but
only for its *instrument* idea. Two things about C were explicitly rejected:

1. **The background.** C sits on flat `#09090b` with a visible 48px grid overlay. Too cold, too
   plain, and the grid reads as graph-paper decoration rather than as structure.
2. **The typography.** C uses InterVariable for everything. It reads as the same generic UI font
   the rest of the app already uses.

So: **keep the instrument, replace the canvas and the type.**

---

## What you MUST keep from Direction C

These are the reasons C won. Carry them forward, and make them better:

1. **The centred score instrument.** A large circular/arc gauge with the number living *in the middle*
   of it — crosshair guides, tick marks, an arc whose sweep encodes the value. In C this was
   `.gauge-shell` → `<svg class="gauge" viewBox="0 0 260 260">` with an 88 numeral at ~72px. This is
   the single most important element on the dashboard. It anchors block 1 (Posture).
2. **Per-row score meters in the inbox.** Every mail row shows its 0–100 score as a small horizontal
   meter driven by a `--score` custom property, next to the integer. Reference: `.score-track` /
   `.score-number` in `parts/instrument.html`.
3. **Severity encoded by weight, not by rainbow.** Do not reintroduce five saturated hues. At most
   one alert colour plus a neutral. Stroke weight, opacity, and length carry severity.
4. **`font-variant-numeric: tabular-nums`** on every number, so figures align in columns.
5. **No cards.** C earned its density by refusing rounded boxes floating on a background. Keep
   structure doing the work: rules, alignment, whitespace, and the layout grid itself.

Read `parts/instrument.html` before you start. Treat it as the reference implementation you are
improving on — not as something to copy verbatim.

---

## What you MUST change

### The canvas
Flat `#09090b` + 48px graph-paper grid is out. Your direction's background is one of its two
defining moves. It must have *depth or material* without becoming noisy, and it must not use images.
Your assigned treatment is in your task prompt. Whatever it is, body text must clear **7:1 contrast**
against the darkest region of your canvas.

### The typography
InterVariable-for-everything is out. Each direction gets a **different type strategy**, specified in
your task prompt. Constraint: no external font requests. You may use

- the self-hosted `InterVariable` (declare the `@font-face` exactly as in SPEC.md §2), and/or
- generic/system stacks that resolve locally, e.g.
  `ui-monospace, 'SF Mono', Menlo, monospace` ·
  `ui-serif, 'Iowan Old Style', 'Charter', Georgia, serif` ·
  `-apple-system, 'Helvetica Neue', 'Segoe UI', system-ui, sans-serif`

If your direction drops Inter entirely, drop the `@font-face` too — do not declare a font you never use.

The old SPEC.md §2 numbers (weights 430/460/…/750, tracking −0.045…−0.065em, the 0.62rem overline)
were *Inter's* signature. They are now **defaults you may override** where your assigned type
strategy calls for something else. Everything else in SPEC.md §2 — the radii, the 180ms transitions,
the text-opacity ladder — still holds.

---

## Output contract

Write exactly one file: `design/parts/<KEY>.html` where `<KEY>` is given in your task prompt.

- Fragment only. One `<style>` block, then markup. No `<!doctype>`, `<html>`, `<head>`, `<body>`.
- **Every CSS rule scoped under `.dir-<KEY>`.** Six design systems now share one document. A single
  unscoped rule — including bare `body`, `*`, `html`, or any bare element selector — breaks the
  other five. The only permitted unscoped at-rule is `@font-face`.
- Reference the font as `url('../../frontend/public/fonts/InterVariable.woff2')` if you use it.
  The build script rebases that path; do not "fix" it.
- No `<script>`. No `<img>`. No `url(data:…)` images. No CDN, no Google Fonts.
- Root element: `<div class="dir-<KEY>">` containing
  `<section data-screen="dashboard">` then `<section data-screen="inbox">`.
- Include `@media (max-width: 780px)` and `@media (max-width: 420px)` inside your scope.
- Target 45–70 KB. Below 35 KB means you skipped detail.

---

## Self-check before you finish

Run these against your own file:

1. `grep -c 'dir-<KEY>'` — every selector in the `<style>` block starts with it.
2. Every number from SPEC.md §5 appears, unaltered. 342 · 289 · 24 · 11 · 5 · 88% · all 10 inbox
   rows · all 5 review-queue emails · all 5 domains · all three 30-point trend arrays.
3. The arc gauge exists, and the numeral is centred inside it.
4. Every inbox row has a score meter.
5. Both media queries present.
6. No `<script>`, no external URL, no unscoped rule.
7. Count your hues. More than two chromatic colours means you drifted.
