You are a senior product designer who writes his own HTML and CSS. You are producing one of three
competing visual directions for a redesign. A human will look at all three side by side and pick one.

FIRST: read `/Users/polo/Projects/SecureInbox/design/parts/SPEC.md` in full. It defines the shared
tokens, the exact fake data, the DOM contract and the hard constraints. Follow it exactly.
Optionally skim `/Users/polo/Projects/SecureInbox/frontend/src/pages/LoginPage.css` — that is the
already-redesigned login page whose visual family you are extending. Do not copy its layout,
its background scene, or its orbs. Take its restraint, its type scale and its palette discipline.

WRITE EXACTLY ONE FILE: `/Users/polo/Projects/SecureInbox/design/parts/briefing.html`
It is a FRAGMENT: one `<style>` block, then markup. No doctype, no html/head/body tags, no script tags.
Every CSS rule must be scoped under `.dir-briefing`. Your markup root is `<div class="dir-briefing">`.

--------------------------------------------------------------------------------
YOUR DIRECTION — "B / BRIEFING": calm, task-first, decision-oriented product
--------------------------------------------------------------------------------

The premise: the user does not want statistics, they want to know what to DO. The screen is a
morning briefing that ends in an action, not an analytics console. Calm, confident, generous.
Think a well-made native macOS app rather than a web dashboard.

COLOUR PRINCIPLE — muted warm triad, nothing neon.
      sage       #7fb894  → Safe / Reviewed safe
      amber      #e0a15c  → Suspicious
      clay-rose  #d97070  → Likely phishing AND Confirmed phishing
      bone       #c9c5bf  → neutral accent
      CTA        #e9e8e6 fill with #09090b text — the single strongest element on the page
  These are deliberately desaturated to sit on near-black without vibrating. Never use them at full
  saturation, and never place two of them adjacent at equal weight. Separate Likely from Confirmed
  phishing by fill vs outline treatment, not by a fourth hue.
  Colour appears in small doses: a dot, a thin bar, a soft tinted background at ~10% alpha. Large
  areas stay neutral.

SURFACE PRINCIPLE — soft, generous, few.
  Cards on `#141416`, radius 16px, padding 24–28px, border `1px solid rgb(255 255 255 / 0.07)`,
  and the raised highlight `inset 0 1px rgb(255 255 255 / 0.12)` along the top edge plus a deep
  soft shadow `0 20px 48px rgb(0 0 0 / 0.24)`. Cards should feel like physical objects resting on
  the black, not like outlined divs.
  FEW elements per screen. Whitespace is the point. If a screen has more than about five distinct
  objects on it, you have over-built it.

TYPE PRINCIPLE — one voice, plain language, larger than you think.
  InterVariable only — NO monospace anywhere. Body copy at 0.9rem weight 430, comfortable
  1.6 line-height. Headlines 1.6–2rem, weight 620, tracking -0.03em.
  Write in plain sentences, sentence case. Exactly ONE uppercase overline per screen — not per card.
  Avoid abbreviations and jargon: "11 messages need your review", not "11 QUARANTINE".

SPECIFIC LAYOUT NOTES

Dashboard
  - Block 1 posture: a full-width hero card. Left side: a short sentence at headline size,
    "11 messages need your review", a supporting line underneath, and a PRIMARY CTA BUTTON
    "Review 11 messages" in the bone/near-white fill — this is the visual anchor of the entire
    screen. Right side: three small inline stats (342 scanned · 88% safe · last synced Today at
    14:02) set quietly, subordinate to the CTA. Do not render four equal stat boxes.
  - Block 2 review queue: sits immediately below the hero, because it is the actual work. Five
    rows in one card, generously spaced (~72px each), divided by faint 1px lines. Each row:
    a soft circular monogram or a small coloured dot, sender name, subject, and the top two
    signals as SOFT PILLS (tinted background at ~10% alpha, 999px radius, small). Score shown as
    a quiet number with the word "risk" beneath, or a slim horizontal meter — keep it calm.
  - Blocks 3 and 4 are DEMOTED behind a disclosure. Render a single full-width row that reads
    like a summary — e.g. "Threat activity and top senders" with a chevron — and then show the
    expanded state below it (since we cannot use JavaScript, render it already open, but make the
    disclosure header visually obvious so the reviewer understands the intent). Inside: the trend
    chart and the attacking-domains list side by side on desktop, stacked on mobile.
  - Trend chart: soft single-fill area is acceptable here ONLY at very low opacity (≤0.10) under a
    1.5px stroke. Rounded line caps. No hard gridlines — use very faint dotted guides.

Inbox — TWO-PANE list + preview (this is your differentiator)
  - Desktop: a left list column (~420px, or 38%) and a right preview pane filling the rest.
  - Left: search field, filter chips as a soft segmented pill control, then the grouped list.
    Rows are roomy (~76px), with a monogram, sender, subject, snippet line, and a small coloured
    dot or slim bar for risk. The first row (PayPal Service) is shown SELECTED — give it a
    distinctly filled/raised treatment so the two-pane relationship is unmistakable.
  - Right preview pane: show the selected PayPal email — a verdict header with the score 87 and
    the label "Likely phishing", a short plain-language explanation ("This message asks for
    personal information and comes from a lookalike domain."), the three detected signals as
    soft pills with their point contributions, sender details, and two action buttons
    "Mark as safe" / "Mark as phishing". This pane is what sells the direction — make it good.
  - At `max-width: 780px` the preview pane must drop away entirely and the list becomes full width.

--------------------------------------------------------------------------------
Deliver the file, then print a 5-line summary of the choices you made. Do not create any other
files. Do not modify anything else in the repository.
