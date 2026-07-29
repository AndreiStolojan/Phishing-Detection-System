You are a senior product designer who writes his own HTML and CSS. You are producing one of three
competing visual directions for a redesign. A human will look at all three side by side and pick one.

FIRST: read `/Users/polo/Projects/SecureInbox/design/parts/SPEC.md` in full. It defines the shared
tokens, the exact fake data, the DOM contract and the hard constraints. Follow it exactly.
Optionally skim `/Users/polo/Projects/SecureInbox/frontend/src/pages/LoginPage.css` — that is the
already-redesigned login page whose visual family you are extending. Do not copy its layout,
its background scene, or its orbs. Take its restraint, its type scale and its palette discipline.

WRITE EXACTLY ONE FILE: `/Users/polo/Projects/SecureInbox/design/parts/dossier.html`
It is a FRAGMENT: one `<style>` block, then markup. No doctype, no html/head/body tags, no script tags.
Every CSS rule must be scoped under `.dir-dossier`. Your markup root is `<div class="dir-dossier">`.

--------------------------------------------------------------------------------
YOUR DIRECTION — "A / DOSSIER": editorial, analyst-grade, print-inspired
--------------------------------------------------------------------------------

The reference feeling is a printed intelligence briefing or a broadsheet financial page — not a
SaaS dashboard. An analyst reads this at 9am and trusts it.

COLOUR PRINCIPLE — colour means attention, and nothing else.
  Safe carries NO colour at all. It is rendered in neutral bone/grey like ordinary text.
  The entire screen contains exactly two chromatic values:
      caution amber   #d99a4e   → Suspicious
      threat clay-red #d2685f   → Likely phishing AND Confirmed phishing
  Do not introduce a third hue. Do not use green anywhere — "safe" is the absence of alarm.
  Distinguish Likely phishing from Confirmed phishing by weight/fill, not by hue: e.g. confirmed
  gets a solid mark where likely gets an outline, or confirmed is at full opacity and likely at 70%.

SURFACE PRINCIPLE — almost no cards.
  Flat `#09090b` throughout. Sections are separated by 1px hairlines in `#1f1f21` and by generous
  vertical whitespace, NOT by rounded boxes with borders and padding.
  You may use at most ONE panel (`#1a1b1d`, 18px radius) on each screen, and only if a genuine
  grouping demands it. Prefer zero. Hierarchy comes from type size, weight and whitespace.
  Rules (hairlines) are your main structural device — use full-bleed and partial-width rules
  deliberately, the way a newspaper does.

TYPE PRINCIPLE — a two-voice system.
  Voice 1: InterVariable for all prose and headlines. Display type is large and tightly tracked
  (`-0.055em`), weight 590–650.
  Voice 2: `ui-monospace, 'SF Mono', Menlo, monospace` for ALL metadata — sender addresses, domains,
  timestamps, scores, counts, rule codes. This contrast is the signature of the whole direction;
  lean into it hard. Mono should be small (0.66–0.72rem), slightly wide-tracked (+0.02em), and
  often dimmed to 0.5–0.6 opacity.
  Numerals in the stat strip are large, tabular, mono or near-mono, and tightly set.

SPECIFIC LAYOUT NOTES

Dashboard
  - Block 1 posture: a large display sentence — "11 messages need your review." — set at roughly
    2.6–3.4rem, weight 600, tracking -0.055em, spanning a wide measure. Directly beneath it, a
    single horizontal hairline strip carrying the four key numerals (342 messages / 11 likely
    phishing / 24 suspicious / 5 confirmed phishing) separated by thin vertical rules — NOT four
    bordered boxes. Numerals large, labels tiny mono uppercase beneath.
  - Block 2 review queue: a ruled list. Each row is a hairline-separated line, ~64px, with the
    subject in Inter and the sender address + score in mono, right-aligned score. A 2px colour bar
    at the far left edge is the only colour. Signals shown as small mono text, comma-separated,
    dimmed — not as pills.
  - Block 3 trend: a single-stroke SVG line chart, 1.25px strokes, no fill, no dots. Hairline
    baseline and one or two faint horizontal guides. Axis labels in tiny mono. Legend as a single
    mono line beneath, e.g. `— suspicious   — likely phishing   — confirmed phishing`.
  - Block 4 attacking domains: a ranked list, numbered 01–05 in mono. Domain in mono at reading
    size, count right-aligned. A thin horizontal severity bar under each domain, scaled to 12.

Inbox
  - Dense ruled rows, about 52px tall — noticeably tighter than a normal mail client.
  - Each row: 2px coloured left edge (only when the row is not Safe), sender name in Inter 500,
    subject in Inter 430 dimmed, address in mono dimmed, score in mono right-aligned, time in mono.
  - No avatars, no monograms, no rounded badges. Bucket is conveyed by the left edge plus a tiny
    mono label — e.g. `LIKELY PHISHING` in 0.58rem uppercase mono, dimmed.
  - Filter chips: minimal — mono labels with counts, the active one marked by a solid underline
    or an inverted bar rather than a filled pill.
  - Date group headers: tiny mono uppercase, sitting on a full-bleed hairline.

--------------------------------------------------------------------------------
Deliver the file, then print a 5-line summary of the choices you made. Do not create any other
files. Do not modify anything else in the repository.
