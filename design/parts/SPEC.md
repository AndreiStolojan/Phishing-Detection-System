# Shared spec — SecureInbox redesign mockups

Every direction renders the **same data** with the **same DOM contract**. Only the visual language differs.
Read this file fully before writing any markup.

---

## 1. What the app is

SecureInbox syncs a user's Gmail, scans each message with a deterministic rule engine plus a local LLM,
and assigns a risk verdict. The user reviews flagged mail and marks it safe or phishing.

You are mocking two screens: **Dashboard** (a 4-block briefing) and **Inbox** (a list of scanned emails).

---

## 2. Shared design tokens (lifted from the app's redesigned login page)

All three directions sit on the same near-black canvas and use the same font. Do not change these.

```
background      #09090b
foreground      #fafafa
panel           #1a1b1d
border          #303236
CTA fill        #e9e8e6   (text on it: #09090b)
grid line       rgb(255 255 255 / 0.038)   at 48px pitch
accent (bone)   #c9c5bf
```

**Font** — self-hosted variable Inter. Declare exactly this and use a relative path:

```css
@font-face {
  font-family: 'InterVariable';
  src: url('../../frontend/public/fonts/InterVariable.woff2') format('woff2');
  font-weight: 100 900;
  font-display: swap;
}
```

Signature type moves from the login page — use them:
- Intermediate variable weights: `430`, `460`, `480`, `590`, `620`, `650`, `750` (never just 400/700)
- Tight negative tracking on display type: `-0.045em` to `-0.065em`
- Overline / kicker style: `font-size: 0.62rem; font-weight: 700; letter-spacing: 0.13em; text-transform: uppercase`
- `font-feature-settings: 'cv11', 'ss01'`

Other shared conventions:
- Radii: `12px` for controls, `18px` for panels
- Raised-surface highlight: `inset 0 1px rgb(255 255 255 / 0.25)`
- All transitions: `180ms ease`
- Text opacity ladder on `#fafafa`: 0.76 labels, 0.61 secondary, 0.54 descriptions, 0.38 placeholder

---

## 3. Hard requirements

1. **Output a fragment, not a full HTML document.** No `<!DOCTYPE>`, no `<html>`, `<head>` or `<body>`.
   Your file contains exactly one `<style>` block followed by markup.
2. **Scope every single CSS rule** under your root class (given in your task prompt, e.g. `.dir-dossier`).
   Three competing design systems get concatenated into one document — an unscoped rule breaks the others.
   Declare the `@font-face` too (identical in all three; duplicates are harmless).
   Do not style bare `body`, `html`, `*`, or any bare element selector outside your scope.
3. **No external resources.** No CDNs, no Google Fonts, no images, no JS frameworks, no icon libraries.
   Draw icons as inline `<svg>` with `stroke="currentColor"` `fill="none"` `stroke-width="1.5"`, or omit them.
4. **All charts are hand-written inline `<svg>`.** No canvas, no libraries. No gradients, no fills under
   the trend line — stroke only.
5. **No `<script>` tags.** These are static mockups. Anything interactive is faked with CSS `:hover`
   or simply shown in its resting state.
6. **Responsive.** Include `@media (max-width: 780px)` and `@media (max-width: 420px)` inside your scope.
7. Use the exact vocabulary in §5 — these are the app's real strings.

---

## 4. Screen structure (same in all three)

Wrap everything in your root class. Two screens, in this order:

```html
<div class="dir-XXX">
  <section data-screen="dashboard"> … </section>
  <section data-screen="inbox"> … </section>
</div>
```

Give each `<section>` `min-height: 100vh` and generous top padding so they read as separate screens
when scrolled. Put a small screen label at the top of each (styled as an overline) reading
`Dashboard` / `Inbox` so the reviewer knows which is which.

### Dashboard — exactly 4 blocks, in this order

1. **Posture** — one plain-language sentence answering "am I safe right now", plus the headline counts
   (see §5.1). The counts are an inline numeral strip, not four separate boxes.
2. **Review queue** — the 5 likely-phishing emails from §5.2.
3. **Trend** — 30-day line chart from §5.3. Three series. Stroke only, no fill, no gradient.
4. **Attacking domains** — the 5 domains from §5.4 with their severity breakdown.

Include a page header above block 1 with the title, the range label "Last 30 days", and a
"Send report" / "Refresh" control pair (visual only).

### Inbox

- A search field (placeholder: `Search sender, subject…`), a row of filter chips, and the list from §5.5.
- Filter chips, in order, with counts: `All 342` · `Likely phishing 11` · `Suspicious 24` ·
  `Confirmed phishing 5` · `Safe 289`. Show `Likely phishing` as the active chip.
- Group the list under date headers: `Today`, `Yesterday`, `This week`, `Older`.
- Show a pagination control at the bottom (page 1 of 35).

---

## 5. The data — use these exact values

### 5.1 Counts (range: "Last 30 days")

```
total messages     342
safe               289
suspicious          24     (backend bucket: needs_review)
likely phishing     11     (backend bucket: quarantine)
reviewed safe        9
confirmed phishing   5
unscanned            4
scanned            338
safe rate           88%
needs your review   11
last synced        "Today at 14:02"
```

Posture sentence when the number is non-zero (this is the case being mocked):
**"11 messages need your review."** Supporting line: "These look like phishing attempts. Review them before opening."

### 5.2 Review queue — 5 likely-phishing emails

| Sender name | Address | Subject | Score | When | Top signals |
|---|---|---|---|---|---|
| PayPal Service | security@paypa1-alerts.com | Your account access has been limited | 87 | 2h ago | Lookalike domain · Asks for personal info · Urgency language |
| Microsoft Account | no-reply@microsoft-verify.net | Unusual sign-in attempt blocked | 78 | 5h ago | Brand impersonation · Pressures to act |
| DHL Billing | billing@dhl-express-tracking.com | Invoice INV-88213 is overdue — action required | 72 | Yesterday | Dangerous attachment · Reply address differs |
| DHL Express | support@dhl-express-tracking.com | Your package could not be delivered | 69 | Yesterday | Shortened link · Urgency language |
| HR Benefits | hr@corp-benefits-portal.com | Updated payroll details required | 64 | 2 days ago | Asks for personal info · Reply address differs |

### 5.3 Trend — 30 days, three series

Day 1 → 30. Use these arrays verbatim (index 0 = oldest day, 29 = today).

```
suspicious:         [0,1,0,2,1,1,3,2,0,1,2,4,3,1,2,0,1,3,2,5,4,2,1,3,2,4,3,1,2,1]
likely phishing:    [0,0,1,0,1,0,1,2,1,0,0,1,2,1,0,1,0,2,3,2,1,0,1,2,1,3,2,1,1,2]
confirmed phishing: [0,0,0,0,0,1,0,0,0,0,1,0,0,0,0,0,1,0,0,1,0,0,0,0,1,0,0,0,0,1]
```

Y axis max is 5. X axis: label roughly every 5th day. Dates run to "today"; you may label them
`Jun 30`, `Jul 5`, `Jul 10`, `Jul 15`, `Jul 20`, `Jul 25` — the last point is today.

### 5.4 Attacking domains

| Domain | Suspicious | Likely phishing | Confirmed phishing | Total |
|---|---|---|---|---|
| dhl-express-tracking.com | 6 | 4 | 2 | 12 |
| paypa1-alerts.com | 3 | 3 | 1 | 7 |
| microsoft-verify.net | 4 | 2 | 1 | 7 |
| corp-benefits-portal.com | 4 | 1 | 0 | 5 |
| secure-docs-share.io | 3 | 1 | 1 | 5 |

Scale the bars against the busiest domain (12).

### 5.5 Inbox list — 10 rows

| Group | Sender | Address | Subject | Bucket | Score | Time |
|---|---|---|---|---|---|---|
| Today | PayPal Service | security@paypa1-alerts.com | Your account access has been limited | Likely phishing | 87 | 14:02 |
| Today | Microsoft Account | no-reply@microsoft-verify.net | Unusual sign-in attempt blocked | Likely phishing | 78 | 11:31 |
| Today | Notion | team@notion.so | Your weekly digest is ready | Safe | 4 | 09:15 |
| Yesterday | DHL Billing | billing@dhl-express-tracking.com | Invoice INV-88213 is overdue — action required | Likely phishing | 72 | 18:44 |
| Yesterday | LinkedIn | messages@linkedin.com | You appeared in 9 searches this week | Safe | 7 | 12:08 |
| Yesterday | Dropbox Share | no-reply@secure-docs-share.io | A document was shared with you | Suspicious | 41 | 08:52 |
| This week | HR Benefits | hr@corp-benefits-portal.com | Updated payroll details required | Confirmed phishing | 64 | Jul 26 |
| This week | GitHub | noreply@github.com | Security alert on repository secure-inbox | Safe | 2 | Jul 25 |
| This week | Amazon Orders | auto-confirm@amazon-billing-check.com | Confirm your recent order | Suspicious | 38 | Jul 24 |
| Older | Google | no-reply@accounts.google.com | Security review completed | Reviewed safe | 11 | Jul 21 |

### 5.6 Exact strings — never invent alternatives

Risk bucket labels: `Safe` · `Reviewed safe` · `Suspicious` · `Likely phishing` · `Confirmed phishing` · `Unscanned`

Detection signal labels (from the real engine):
`Reply address differs` · `Shortened link` · `Link uses IP address` · `Login details in link` ·
`Lookalike domain` · `Unusually long link` · `Dangerous attachment` · `Archive attachment` ·
`Too many links` · `Urgency language` · `Asks for personal info` · `Pressures to act` ·
`Social engineering` · `Brand impersonation` · `Blocked by you`

Scores are always out of 100 and shown as an integer.

---

## 6. What "good" looks like

The current app looks AI-generated. The tells being corrected are **structural**: a uniform grid of
rounded cards, four identical stat boxes, and five saturated hues competing for attention.

Judge your own output against these:
- Would a designer believe a person made deliberate choices here, or does it read as a template?
- Is there a clear focal point, or does everything shout equally?
- Does the type carry hierarchy (size, weight, tracking, opacity) rather than boxes and borders?
- Is the colour doing semantic work, or is it decoration?

Density, restraint and typographic confidence beat decoration. When in doubt, remove something.
