# UI Premium Upgrade — Plan & Audit (2026-06-05)

> Goal: transform the SecureInbox UI into a **modern, simple, Apple-grade** experience — "simple and just works beautifully." Calm confidence appropriate to a security tool (no alarm-red walls), generous whitespace, real typographic hierarchy, purposeful spring motion, tactile feedback.
>
> This document is the **durable plan**. It was produced by a 12-agent design audit (one designer-agent per UI surface + a synthesis pass).
>
> - **Raw, full audit findings (verbatim, per-surface):** `docs/archive/ui-premium-audit-raw-2026-06-05.json`
> - **Actionable checklist:** `docs/TODO.md` → "Faza 22"
> - **Safety checkpoint before this work:** commits `b639409` (backend), `110495b` (frontend), `9c7ff4f` (docs) — pushed to `origin/main`.

---

## Current state (honest assessment)

The code is genuinely well-built: clean, semantic, consistent. Risk colors are centralized in `src/lib/risk.js` (never hardcoded), components are tidy, motion already uses framer-motion in places. The gap to "premium" is **refinement of the foundation** (type scale, elevation, motion vocabulary, font), **a few data/UX rethinks** (dashboard answers "am I safe?", inbox triage, verdict as hero), and the **off-brand email templates** (3 different visual languages, mixed RO/EN, emoji-heavy, not matching the app).

---

## Unified design direction

**Vision:** A calm, dark, security-grade reading room that answers "am I safe?" in under a second, a reading view that protects you the moment you open a risky email, and a verdict moment that lands with one tasteful spring — never alarm-red walls, never gratuitous motion.

### Color & type
- **Keep** the deep-navy base (bg `#0a0d14`, card `#11151f`, primary `#3b9eff`).
- Lighten `--color-muted-foreground` `#8a96aa → ~#9aa6ba` (≈5.5:1 on card); add `--color-muted-foreground-subtle ~#6b7689` for tertiary/disabled.
- Rebuild the risk reds as **one deliberate OKLCH severity ramp** (related hue, rising chroma + falling lightness = more severe): quarantine `≈ oklch(0.62 0.20 18) ~#f0506b`, confirmed_phishing `≈ oklch(0.50 0.20 22) ~#c43030`; set `--color-destructive` to a calmer member of the same family so action-red never competes with risk-red.
- **Lift the risk "soft" backgrounds** (currently near-black) via `color-mix(in oklab, var(--color-risk-X) ~14%, var(--color-background))` so badges/banners read as confident tinted pills. **Keep token NAMES identical** so `risk.js` and all utilities keep working.
- Add primary tonal tokens `--color-primary-hover #57adff`, `--color-primary-active #2a8be6`, `--color-primary-soft`; switch button hover from `/90` opacity to the explicit hover token.
- **Type:** self-host `InterVariable.woff2` (preload, `font-display:swap`, weight 100–900), drop the render-blocking Google Fonts link, enable `font-feature-settings 'cv11','ss01'` + tabular-nums. Define a semantic ramp in `@theme` (rem @16px): `--text-display 2.5rem/1.05/-0.02em`, `--text-h1 1.875rem/1.1`, `--text-h2 1.375rem/1.2`, `--text-h3 1.0625rem/1.3`, `--text-body 0.9375rem/1.5` (bump body 14→15px), `--text-sm 0.8125rem`, `--text-caption 0.75rem`. Add a label-overline utility.
- **Font recommendation:** stay with **Inter** (self-hosted variable) — already the identity, free/thesis-safe, closes most of the gap to SF; optionally Inter Display for >24px headings.

### Motion principles
One shared spring vocabulary, exported from a new `frontend/src/lib/motion.js` and mirrored as CSS tokens in `@theme`, so JS (Framer) and CSS share one feel:
- `springSoft { type:'spring', stiffness:380, damping:32, mass:0.9 }` — UI entrances/layout
- `springSnappy { stiffness:520, damping:30 }` — press/toggles
- CSS ease `[0.32,0.72,0,1]` (Apple decelerate); durations fast 180 / base 260 / slow 400 ms
- Standardize: buttons `whileTap` scale 0.97, rows/cards 0.99; entrance distance always `y:8`; hover = 1px lift + shadow.
- Wrap app in `<MotionConfig reducedMotion='user'>` + a `prefers-reduced-motion` CSS guard — premium AND accessible.
- Motion is meaningful only: animate **state changes** (verdict resolves, row reviewed, scan completes), never re-display the same data (kill count-up-from-0-on-every-sync).

### Signature moves
1. **Verdict reveal** — on scan complete / manual review, `VerdictBanner` cross-fades keyed on `riskBucket` (springSoft), icon springs into a tinted ring, and (quarantine/confirmed only) a single one-shot color-matched glow "breath" over ~600ms. Safe never animates loudly.
2. **Traveling selection** — one shared Framer `layoutId` highlight that glides between sidebar items (desktop) and bottom-nav tabs (mobile); same pattern powers the inbox filter segmented pill.
3. **Privacy gate tied to risk** — remote images blocked by default for needs_review/quarantine/confirmed_phishing with one calm "Load images" affordance; auto-loaded for safe. The product visibly protects you the instant you open a risky message.
4. **Posture hero on dashboard** — replace the four equal KPIs with a full-width "You're protected" / "N messages need your attention" band + an interactive donut whose center reads **safe %** (not raw "scanned") and whose slices link to `/inbox?riskBucket=X`.
5. **iOS-grade switch + tactile mark-phishing** — enlarge settings switch to 28×46px with a spring thumb; replace the literal "✓" string on review buttons with an animated lucide Check, fire a Sonner toast ("Marked as phishing · Moved to Gmail Spam"), optimistically flip state instead of full reload.
6. **Dark-mode, on-brand transactional emails** — one shared email shell (header band + card + footer + bulletproof CTA + risk-dot helpers) reused by welcome/digest/alert, canonical risk hexes, deep-linked CTAs, and a `prefers-color-scheme:dark` variant mirroring the app.

---

## Sequenced implementation phases

> Ordering rule: **foundation first** (tokens/type/motion) → shared primitives → shell → per-surface polish → email templates. Each phase builds on the last so nothing regresses.

### Phase 1 — Token foundation (color, type, elevation, motion, spacing) · risk: medium · depends: none
Establish the single source of truth all components inherit from; no component rewrites yet.
- Self-host InterVariable.woff2 (`@font-face` font-display:swap weight 100 900), preload in index.html, remove Google Fonts link; add `font-feature-settings 'cv11','ss01'` + tabular-nums.
- Add semantic type ramp in `@theme` (display/h1/h2/h3/body/sm/caption with line-height + letter-spacing); bump body 14→15px; add label-overline utility.
- Add dark-tuned elevation ramp (`--shadow-xs/sm/md/lg`) + top inner-highlight convention (`inset 0 1px 0 rgb(255 255 255 / 0.04)`); start using `--color-elevated`.
- Add motion tokens to `@theme` (`--ease-out`, `--duration-fast/base/slow`) and create `frontend/src/lib/motion.js` (springSoft, springSnappy, ease, dur).
- Rebuild risk reds as one OKLCH severity ramp; lift risk "soft" tokens via color-mix — **keep token names identical**.
- Lighten `--color-muted-foreground` to ~#9aa6ba; add `--color-muted-foreground-subtle`; add `--color-primary-hover/active/soft`.
- Add spacing/rhythm tokens; bump container-page padding to `clamp(1rem,4vw,2rem)`; rework radius ramp around a base `--radius` + `--radius-2xl`.
- Wrap app in `<MotionConfig reducedMotion='user'>` (main.jsx) + global prefers-reduced-motion guard; replace the universal `* { border-color }` reset with Tailwind v4 themed default (verify risk `border-l-*` still win).
- Files: `index.css`, `index.html`, `lib/motion.js` (new), `lib/risk.js`, `main.jsx`, `public/fonts/InterVariable.woff2` (new).

### Phase 2 — Shared primitives · risk: medium · depends: Phase 1
Upgrade low-level shadcn primitives once so press/hover/spring/elevation/focus appear everywhere; add missing components.
- Button: `active:scale-[0.97]` + tactile timing in base cva, default hover → `--color-primary-hover`, add `icon-sm` size, optional MotionButton wrapper.
- Card: elevation tiers (flat KPI vs lifted hero) + inner highlight; clickable-card hover lift.
- Input: softer focus (ring-1 ring-primary/40 + halo), caret-primary; add Textarea mirroring Input; add a glass material utility.
- Switch: enlarge ~28×46px, Framer spring thumb with press elongation, distinct is-saving state.
- Skeleton: replace animate-pulse with left-to-right shimmer keyframe.
- Add AlertDialog (Radix) + base Dialog — required by Settings disconnect (none exist today).
- Adopt the orphaned PageHeader as the single page-title primitive.
- Files: `ui/button.jsx`, `ui/card.jsx`, `ui/input.jsx`, `ui/textarea.jsx` (new), `ui/switch.jsx`, `ui/skeleton.jsx`, `ui/alert-dialog.jsx` (new), `ui/dialog.jsx` (new), `common/PageHeader.jsx`, `common/MotionButton.jsx` (new, optional).

### Phase 3 — App shell, navigation & page transitions · risk: medium · depends: Phase 2
Make the chrome recede; one premium motion language across desktop and mobile.
- Sidebar: shared `layoutId` traveling active indicator + accent bar; whileTap press; frosted material (backdrop-blur-xl, softened divider, top inner highlight); single wordmark; cleaner footer; chevron + press on user dropdown.
- BottomNav: `layoutId` active pill + whileTap; `safe-area-inset-bottom` padding; replace magic-number FAB offset with `calc(...+env(safe-area-inset-bottom))`.
- PageTransition: switch to springSoft, y:10, gate with useReducedMotion; scroll-reset on path change; drill-down (Inbox→Detail slides forward, Back slides back) vs top-level crossfade; fix `mode='wait'` empty-beat.
- MobileSync FAB: AnimatePresence enter/exit + whileTap.
- Adopt PageHeader on all pages.
- Files: `layout/Sidebar.jsx`, `layout/BottomNav.jsx`, `layout/PageTransition.jsx`, `layout/AppShell.jsx`.

### Phase 4 — Inbox list, EmailRow, grouping & skeletons · risk: medium · depends: Phase 3
Turn the inbox from a generic admin table into a calm, scannable, tactile triage queue.
- EmailRow: `motion(Link)` with capped-stagger entrance + whileTap; 3-step type hierarchy (sender 15px semibold / subject dimmer / snippet caption); deterministic monogram avatar; focus-visible ring; remove duplicate border-b (let divide-y own separators); soften hover to neutral `foreground/[0.03]` + trailing ChevronRight reveal.
- Risk emphasis via a single `risk.js` helper (`tone.emphasis quiet|loud`): safe/reviewed_safe/unscanned recede; strong color reserved for needs_review/quarantine/confirmed_phishing.
- Filter chips: add unscanned bucket, color each active chip by its tone, layoutId sliding indicator, count-as-pill; hide counts when a search `q` is active.
- Fix sticky group headers (remove Card overflow-hidden / correct scroll model) or float headers with a hairline; InboxSkeleton mirrors real rows + group bands + shimmer.
- Search input: clear button, inline spinner while debouncing, `/` focus shortcut, dim-in-place on refine instead of full skeleton swap.
- Enlarge pagination touch targets (or move toward Load-more/infinite scroll); bind toolbar to the list card.
- Files: `inbox/EmailRow.jsx`, `pages/InboxPage.jsx`, `lib/risk.js`, `common/states.jsx`, `common/Pagination.jsx`, `utils/formatDate.js`.

### Phase 5 — Security verdict UI · risk: medium · depends: Phase 4
Make the verdict the hero with calm authority; deliver the signature verdict-reveal + tactile review feedback (the product's core moment).
- VerdictBanner: 2-line hero (40px tinted icon ring, h3/lg label, muted description, left accent), spring entrance, tiered emphasis by bucket (safe recedes; quarantine/phishing get ring + soft shadow + one-shot pulse), AnimatePresence keyed on riskBucket; source label becomes a small pill.
- ReviewActions: animated lucide Check (spring) instead of "✓"; Sonner success toasts incl. the Gmail-Spam side effect; optimistic state flip instead of full load(); show the consequence as helper text BEFORE the action; align phishing CTA color with quarantine rose (record in DECISIONS.md).
- ScanDetails: restructure into a narrative — AI explanation primary panel (larger, tinted chip), score bars + triggered rules demoted into a collapsed-by-default "Evidence" group that staggers in; animate score-bar fills from 0 with springSoft; color Total-score bar with verdict tone; severity accent + sort on rule rows; reframe Ollama-fallback as a calm info note using risk-review tokens (not hardcoded amber).
- RiskBadge: mount spring when bucket resolves, ring-1, radix tooltip with full description, unify SM_LABELS.
- Files: `security/VerdictBanner.jsx`, `security/ReviewActions.jsx`, `security/ScanDetails.jsx`, `security/RiskBadge.jsx`, `lib/risk.js`, `docs/DECISIONS.md`.

### Phase 6 — Email reading view + EmailBody + privacy gate · risk: medium · depends: Phase 5
Create a focused "reading room" with controlled email typography, keyboard nav, and the risk-aware image privacy gate.
- Add a real scoped `.email-body` stylesheet under `@layer components` (headings, lists, blockquote, hr, links, img radius, line-height) — the class currently has zero backing rules.
- Privacy gate: in `sanitizeEmailHtml`, for risky buckets rewrite `img src→data-src` + render a calm inline "Load images" banner in EmailBody; auto-load for safe.
- Keyboard nav: ←/→ or j/k for prev/next, Esc back, guarded against inputs; "n of total" indicator; bump prev/next to icon-sm; keep "Back to inbox" when deep-linked.
- Detail entrance: own spring with small stagger (verdict→header→body); directional slide between prev/next; dim stale body while loading.
- Reading surface: drop the double-bordered inset box, sit body on the card with max reading width (~68ch); stronger subject/sender hierarchy + monogram; plain-text fallback uses full foreground + capped width; collapse ScanDetails by default; relative-but-precise date matching inbox.
- Re-scan: elevate to a clear secondary action with feedback.
- Files: `index.css`, `inbox/EmailBody.jsx`, `utils/sanitizeEmailHtml.js`, `pages/EmailDetailPage.jsx`, `utils/formatDate.js`.

### Phase 7 — Dashboard + RiskDonut + StatCard · risk: medium · depends: Phase 6
Reframe the first screen as a calm security posture answer, not a metrics grid.
- Full-width posture hero band: "You're protected" (risk-safe) vs "N messages need your attention" (risk-quarantine) + CTA to `/inbox?riskBucket=quarantine`; demote Scanned/Synced to a caption; PageHeader greeting with account email + last-synced.
- RiskDonut: enlarge (~210px), pull colors/labels from getRiskMeta, center shows safe %, legend↔slice hover linking with activeShape, custom card-matching tooltip, include/relabel unscanned honestly, percentages in legend.
- StatCard: link threat cards to inbox filters with whileHover lift + whileTap + ArrowRight reveal; raise value to text-3xl tabular-nums; quiet the icon tile; sentence-case label; count-up only on real value change + reduced-motion guard (shared parent-variant stagger, drop manual staggerIndex).
- Attention list: slimmer dashboard row variant (drop redundant per-row badge, surface strongest scan signal); success-empty "All clear" in risk-safe-soft with one-time spring shield; skeletons mirror real layouts; richer disconnected first-run hero.
- Files: `pages/DashboardPage.jsx`, `dashboard/RiskDonut.jsx`, `dashboard/StatCard.jsx`, `common/states.jsx`, `inbox/EmailRow.jsx`.

### Phase 8 — Reports + TopRulesChart · risk: medium · depends: Phase 7
Turn the data dump into a readable, shareable monthly security report.
- PageHeader "Monthly report" + human-readable period; flex justify-between.
- Replace native month input with a themed prev/label/next stepper (disable next at current month), animated.
- TopRulesChart: surface discarded points metric (tooltip + optional Count|Risk-weight toggle), color bars by severity ramp, static LabelList values, softened cursor, rounded tooltip, wrap long labels, stable card height, entrance animation + reduced-motion gate.
- AI-analysis card: stop coloring infra "Failed" with risk-review amber — neutral/operational treatment; count-up parity with StatCards.
- Stat hierarchy (hero threats-found + plain headline, demote synced/scanned, tint bucket cards' left border); send-report success state on the button + "last emailed" line; remove double error surface; add ReportsSkeleton; card descriptions; calm all-clear month state.
- Files: `pages/ReportsPage.jsx`, `reports/TopRulesChart.jsx`, `common/states.jsx`.

### Phase 9 — Settings + Login front door · risk: medium · depends: Phase 8
Bring the two bookend surfaces to Apple-grade.
- Settings: **gate Disconnect Gmail behind AlertDialog (blocker — one unguarded click wipes all app data)**; page header; single max-w-2xl grouped-list layout; card titles back to text-base + descriptions + tinted icon chips; clickable toggle rows with hover/press; richer connected-account row with live status; dirty-state + success micro-confirmation on saves; use new Textarea in Support; staggered entry.
- Login: spring staggered entry (brand→title→form) gated by reduced-motion; multi-layer ambient background + grain; elevated logo mark with gradient/glow/inner-highlight; softer field focus + h-11; button press + no label-shift on load; AnimatePresence morph for sign-in↔register; animated role=alert errors softened from alarm-red for validation; richer password-rules with strength meter + spring ticks; autofocus; resolve naming (SecureInbox vs XAI Phishing Shield) + align `<title>`; trust microcopy footer.
- Files: `pages/SettingsPage.jsx`, `pages/LoginPage.jsx`, `index.html`, `ui/switch.jsx`, `ui/alert-dialog.jsx`.

### Phase 10 — Cross-cutting motion sweep & cleanup · risk: low · depends: Phase 9
- Audit all Framer/CSS animations to import from `lib/motion.js`; replace inline tween objects; standardize entrance distance/durations; collapse carets driven by same spring as panels.
- Verify reduced-motion across every surface; confirm tabular-nums on all numerals; remove dead code.
- Run lint + frontend tests + build; manual end-to-end per docs/MANUAL_TESTS.md; update docs.
- Files: `frontend/src/`, `docs/DECISIONS.md`, `docs/PROGRESS.md`, `docs/TODO.md`.

### Phase 11 — Transactional email design system (backend templates) · risk: medium · depends: Phase 1
Make welcome/digest/alert one coherent, on-brand, bulletproof family — done last (isolated from frontend, depends only on finalized risk hexes + naming).
- Build one shared email shell (table-based bulletproof scaffold + MSO conditional, header band, card, footer, risk-dot + bulletproof CTA helpers) reused by all three templates.
- Add CTA buttons (**blocker — alert tells users to act but has no link**): import FRONTEND_APP_URL, alert→`/inbox?riskBucket=quarantine`, digest→`/dashboard`.
- Mirror canonical risk hexes; kill purple/red gradients + 48px siren emoji; add hosted shield wordmark; preheader text; `color-scheme` meta + `prefers-color-scheme:dark` variant; one locale per user; complete branded footer with real manage-notifications link + dynamic year.
- Digest hero (big safe-rate % + 2×2 risk-card grid + optional HTML stacked risk bar); alert per-email rows emphasize sender domain + risk bar; consistent radii/spacing; fix avatar/timezone; SF-first font stack + real type scale.
- Files: `backend/extras/notifications/email.template.js`, `backend/extras/notifications/send-email.js`, `backend/src/config/env.js`.

---

## Quick wins (high impact, low effort — front-load these)
1. Self-host InterVariable + drop Google Fonts blocking link + enable cv11/ss01/tabular-nums — instant app-wide typographic polish (P1).
2. Add `active:scale-[0.97]` + explicit primary-hover to Button base — tactile press everywhere from one change (P2).
3. Wrap app in `<MotionConfig reducedMotion='user'>` + prefers-reduced-motion guard — accessibility baseline in minutes (P1).
4. Lighten muted-foreground + lift risk "soft" backgrounds via color-mix — fixes contrast, makes risk badges read as confident pills (P1).
5. Adopt the orphaned PageHeader on every page — consistent titles with code that already exists (P2–3).
6. Sonner success toasts in ReviewActions + animated Check instead of "✓" — core action goes from amateur to satisfying (P5).
7. Soften EmailRow hover to neutral + add focus-visible ring (none today) — a11y + stops brand-blue fighting risk colors (P4).
8. Add missing `.email-body` CSS rules — the most-viewed content currently renders with raw browser defaults (P6).
9. Remove Reports double error surface; color infra "Failed" neutrally instead of risk-amber (P8).
10. Swap skeleton animate-pulse for shimmer keyframe (P2).

---

## Regression risks & how to de-risk
- **Risk-token recolor (P1) touches whole app via risk.js.** Keep token NAMES identical, only change values (or switch TONES.soft to color-mix); visually diff every risk surface before merging.
- **Replacing the universal `* { border-color }` reset** can change borders globally + specificity of `border-l-risk-*`. Verify Tailwind v4 themed default-border; grep every `border-l-risk-*` after change.
- **Self-hosting InterVariable** can cause FOUT/missing-glyph/wrong-weight. Keep system-font fallback; test preload path + Vite asset path in build.
- **Spring physics + AnimatePresence** can cause layout jumps / double-mount flashes (StrictMode) / scroll glitches. Cap list stagger; set min-heights where content swaps; test back/forward + deep-links; verify reduced-motion.
- **Optimistic review state (P5)** could desync on failure. Roll back optimistic state + error toast; refetch on failure.
- **Image privacy gate (P6)** modifies the sanitizer. Unit-test sanitizeEmailHtml per bucket; confirm safe auto-loads while risky uses data-src.
- **Sticky-header / overflow changes on inbox Card** can alter rounded-corner clipping + focus rings. Test >10 rows across breakpoints.
- **Email template overhaul (P11)** risks client regressions (Outlook, Gmail dark mode). Bulletproof tables + MSO conditionals; test Gmail + Apple Mail light/dark.
- **Scope creep** from signature flourishes vs thesis timeline. Treat flourishes as opt-in; the phased plan delivers a premium result even if every flourish is cut.

---

## Open questions for Andrei (decide before/within relevant phases)
1. **Dark-only vs light mode:** keep dark-only for the thesis demo but build tokens theme-aware (future flip)? *Recommended.* Or invest in a real light theme now?
2. **Font:** stay with self-hosted InterVariable (recommended), or evaluate a paid/SF-like display face for headings?
3. **Product naming:** docs say "SecureInbox", login/title/emails say "XAI Phishing Shield". Which is canonical everywhere?
4. **How bold on motion/atmosphere:** are signature flourishes (login shield draw-on, living ambient background, posture ring/gauge, swipe-to-act mobile, ⌘K palette) in scope, or keep strictly calm/minimal for the timeline?
5. **Dashboard data restructure:** OK to replace the 4 equal KPI cards with a posture hero + interactive donut, and change donut center from raw "scanned" to "safe %" (include/relabel unscanned)?
6. **Inbox triage scope:** numbered pagination vs infinite scroll / Load-more; and do you want bigger triage features (swipe-to-act, reviewed rows dimming, pinned "Needs attention" band) or just row/type/motion polish? (Dimming needs a backend read/reviewed flag.)
7. **Filter-count correctness:** chip counts come from monthly-summary while the list is the paged dataset → they can disagree. Hide counts during search (quick fix) or return a search-scoped counts block (backend change)?
8. **Email privacy gate:** confirm we block remote images by default for risky buckets with a "Load images" control (changes reading behavior; deliberate trust feature).
9. **Email locale:** unify all 3 transactional templates to Romanian, English, or per-user locale?
10. **Phishing-CTA color:** align mark-phishing with brighter rose quarantine and reserve dark brick `#b91c1c` for confirmed state? (record in DECISIONS.md)
