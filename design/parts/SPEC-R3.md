# Round 3 addendum — two professional directions

Read `SPEC.md` in full first, then this file. `SPEC-R2.md` is history — read it only for context on
what was rejected. Where R2 and R3 disagree, **R3 wins**.

---

## Where the review stands

- Round 1 (A Dossier, B Briefing, C Instrument) → C won on its **centred arc gauge** and **per-row
  score meters**. Rejected: its flat `#09090b` canvas with a 48px graph-paper grid, and InterVariable
  carrying every level of the type.
- Round 2 (D Vellum, E Console, F Slate) → all three dropped the grid, which was correct. Verdict:
  *"the ideas are decent"* — the concepts work, the execution reads too experimental.

Round 3 is the professional pass. Same skeleton, grown-up clothes.

---

## The brief

> Same layout for the dashboard, but use professional looks and colors and fonts, and the background
> can be more interesting.

Three instructions, and they are not equally free.

### 1. "Same layout" — this is a hard constraint

The dashboard keeps **exactly** the 4 blocks from SPEC.md §4, in order: Posture (with the centred
gauge) → Review queue → Trend → Attacking domains. Same page header. The inbox keeps its search
field, its filter-chip row, its date-grouped list and its pagination.

Do not re-architect, merge, split or reorder blocks. Do not move the gauge out of the Posture block.
You are restyling a layout that has already been agreed, not proposing a new one. Every structural
choice you are tempted to make, spend on craft instead: alignment, rhythm, spacing, weight, detail.

Also keep, from C:
- The **centred arc gauge** — an SVG gauge with the numeral in the middle. It anchors the dashboard.
- The **per-row score meters** in the inbox, driven by a `--score` custom property.
- `font-variant-numeric: tabular-nums` on every figure.
- No floating rounded cards. Structure comes from rules, alignment and whitespace.

### 2. "Professional" — restraint, not decoration

The target is software a security team would run all day: a mature product, not a concept piece.
Concretely, that means:

- **A real semantic palette, kept quiet.** R2 forced one accent hue. That constraint is lifted —
  professional tools *do* colour-code severity. But saturation stays low and coverage stays small:
  colour appears on small marks (a rule, a dot, a meter fill, a numeral), never as a large filled
  panel. Your palette is specified per-direction below. Do not exceed it.
- **A clear typographic system**, not typographic theatre. Two families at most, with defined jobs
  and a small, deliberate scale ramp. Display sizes come down from R2's extremes — a 90px numeral
  is a poster, not a dashboard. Keep the gauge numeral commanding but plausible: **56–72px**.
- **Real interface detail**: consistent optical alignment, sensible hit areas, states that read as
  designed (`:hover`, `:focus-visible`), one considered elevation, correct visual weight on the
  primary action. Sweat the small stuff — that is what separates professional from student work.
- Nothing should look like it is trying to be noticed.

### 3. "The background can be more interesting" — depth, still quiet

Confirmed earlier: the rejected thing was **the 48px grid squares**. Do not bring back a repeating
tile. But the canvas is now allowed real atmosphere — layered gradients, large soft blooms, a
directional wash, a fine grain, a very-large-scale motif. Constraints:

- Built from CSS only. No `<img>`, no `data:` URIs, no SVG filters for noise.
- Body text must clear **7:1** against the darkest region it sits on.
- At 100% zoom it must read as *material*, not as a pattern. If a viewer can describe the shape of
  your background, it is too loud.
- It must never compete with the gauge. The gauge is the focal point of the dashboard.

---

## Output contract

Write exactly one file: `design/parts/<KEY>.html`, `<KEY>` given in your task prompt.

- Fragment only: one `<style>` block, then markup. No `<!doctype>`, `<html>`, `<head>`, `<body>`.
- **Every CSS rule scoped under `.dir-<KEY>`.** Eight design systems now share one document; one
  unscoped rule — including bare `body`, `*`, `html`, or any bare element selector — breaks the other
  seven. `@font-face` is the only permitted unscoped at-rule.
- **Author one stylesheet from scratch.** Do not copy another direction's stylesheet and rename its
  scope. A previous agent did exactly that and left 56 selectors silently rendering as the direction
  it had copied. `design/check.mjs` now fails any file that declares its root rule twice.
- If you use InterVariable, reference it as
  `url('../../frontend/public/fonts/InterVariable.woff2')` — the build script rebases that path.
  If you do not use it, do not declare the `@font-face`.
- No `<script>`, no `<img>`, no external URLs, no `data:` URIs.
- Root: `<div class="dir-<KEY>">` with `<section data-screen="dashboard">` then
  `<section data-screen="inbox">`.
- Both `@media (max-width: 780px)` and `@media (max-width: 420px)`, inside your scope.
- Exact data and strings from SPEC.md §5 — including the **`Unscanned` count of 4**, which two
  earlier directions forgot.
- Target 48–70 KB.

---

## Self-check before finishing

```
node design/check.mjs <KEY>          # must pass with no errors
grep -c '^\.dir-<KEY> {' <file>      # must be exactly 1
```

Then read your own file and ask:
1. Are the 4 dashboard blocks present, in order, with the gauge inside Posture?
2. Is every colour outside my specified palette gone?
3. Is the gauge numeral between 56px and 72px?
4. Would a designer call this restrained, or busy?
5. Can I describe the shape of my own background? If yes, turn it down.
