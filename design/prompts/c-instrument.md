You are a senior product designer who writes his own HTML and CSS. You are producing one of three
competing visual directions for a redesign. A human will look at all three side by side and pick one.

FIRST: read `/Users/polo/Projects/SecureInbox/design/parts/SPEC.md` in full. It defines the shared
tokens, the exact fake data, the DOM contract and the hard constraints. Follow it exactly.
Optionally skim `/Users/polo/Projects/SecureInbox/frontend/src/pages/LoginPage.css` — that is the
already-redesigned login page whose visual family you are extending. You ARE the direct descendant
of its geometry: the 48px grid and the hairline outlined circles are yours to evolve. Do not
reproduce its two-column login layout.

WRITE EXACTLY ONE FILE: `/Users/polo/Projects/SecureInbox/design/parts/instrument.html`
It is a FRAGMENT: one `<style>` block, then markup. No doctype, no html/head/body tags, no script tags.
Every CSS rule must be scoped under `.dir-instrument`. Your markup root is `<div class="dir-instrument">`.

--------------------------------------------------------------------------------
YOUR DIRECTION — "C / INSTRUMENT": technical, geometric, measurement-grade
--------------------------------------------------------------------------------

The reference feeling is a precision instrument panel or an oscilloscope readout — engineered,
calibrated, exact. This is the most visually distinctive of the three directions and the most
direct descendant of the login page's geometry. Be bold, but never decorative for its own sake:
every mark should encode data.

COLOUR PRINCIPLE — hue is BINARY.
      bone     #c9c5bf   → everything nominal, all chrome, all baseline data
      hot      #ff6b57   → threat, and nothing else
  There is no third hue. No green, no amber, no purple.
  SEVERITY IS ENCODED BY STROKE WEIGHT AND OPACITY, NOT BY COLOUR:
      Safe / Reviewed safe → bone at 0.45 opacity, 1px stroke
      Suspicious           → hot at 0.45 opacity, 1px stroke
      Likely phishing      → hot at 0.80 opacity, 1.5px stroke
      Confirmed phishing   → hot at 1.0 opacity, 2px stroke, plus a solid fill where others are outlined
  Apply this ladder consistently to bars, rows, chart series and markers. It is the whole idea.

SURFACE PRINCIPLE — no cards, ever. The grid is visible.
  Lay a 48px background grid across both screens using
  `linear-gradient(rgb(255 255 255 / 0.038) 1px, transparent 1px)` in both axes, with a soft mask
  so it fades at the top and bottom edges.
  "Instruments" are OUTLINED, never filled: `1px solid #303236`, and where a shape wants emphasis
  use a hairline circle or arc exactly as the login page does. Content floats on the grid.
  Align things to the 48px rhythm where you can — the grid should read as a real coordinate system,
  not as wallpaper.

TYPE PRINCIPLE — readouts, not prose.
  InterVariable with `font-variant-numeric: tabular-nums` on every number.
  Numerals are OVERSIZED and confident: the hero figure at 4–5rem, weight 650–750, tracking -0.05em.
  Micro-labels everywhere in the login page's kicker style: 0.6rem, weight 700, letter-spacing
  0.13em, uppercase, dimmed to ~0.45 opacity. Label everything as if it were a gauge.
  Prose is minimal and short. Let the numbers speak.

SPECIFIC LAYOUT NOTES

Dashboard
  - Block 1 posture: a large hairline ARC GAUGE, hand-drawn in SVG, roughly 200–260px across.
    Draw it with `stroke-dasharray` / `stroke-dashoffset` on a circular path — a background arc in
    `#303236` and a foreground arc in bone showing 88%. Add real tick marks around the arc (a small
    radial line every 10%, longer at 0/50/100) — this is what makes it read as an instrument rather
    than a donut chart. Centre it with the numeral `88` at 4–5rem and `%` small beside it, and the
    micro-label `SAFE RATE` beneath.
    Around the gauge, arrange 3–4 SATELLITE READOUTS: each is a micro-label plus a large tabular
    numeral (342 TOTAL / 11 NEEDS REVIEW / 24 SUSPICIOUS / 5 CONFIRMED), separated from the gauge by
    hairlines, laid out on the grid. The posture sentence sits as one short line, small, near them.
  - Block 2 review queue: rows carrying a thin horizontal SCORE METER — a 1px baseline track the
    full width of a fixed column, with the filled portion drawn per the severity ladder above, plus
    the numeral at the end. Sender and subject in small type. Add a hairline vertical rule between
    columns to reinforce the instrument feel.
  - Block 3 trend: an UNFILLED stroked line chart on the visible grid. 1px–2px strokes per the
    severity ladder. Add explicit tick marks on both axes and small hairline markers at data points
    of the confirmed-phishing series. Axis labels in the micro-label style.
  - Block 4 attacking domains: hairline rank bars. Each domain is a horizontal track with the three
    severity segments drawn at their respective stroke weights/opacities, scaled to 12. Numerals
    tabular and right-aligned. Consider a hairline outlined bar for the track.

Inbox
  - Single column, full width, on the visible grid.
  - Each row carries a thin per-row SCORE METER — a full-width 1px track with the filled portion
    encoding the score out of 100, drawn at the severity ladder's weight and opacity. The score
    numeral sits right-aligned in tabular numerals.
  - Bucket labels as micro-labels (0.58rem, uppercase, 0.13em tracking).
  - Filter chips: outlined hairline rectangles (not pills), 12px radius, with tabular counts;
    the active chip inverts to a bone fill with #09090b text.
  - Date group headers: micro-labels on a hairline that spans the full width, aligned to the grid.
  - Search field: outlined, 12px radius, hairline border, no fill.

--------------------------------------------------------------------------------
Deliver the file, then print a 5-line summary of the choices you made. Do not create any other
files. Do not modify anything else in the repository.
