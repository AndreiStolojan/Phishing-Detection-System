# PROJECT STATE

## Current Snapshot

- Date: `2026-06-11`
- Product direction: `SecureInbox` — Gmail-only phishing detection inbox, thesis project.
- Phase: **Faza 25 — Dashboard hub + global time filter (COMPLETE)**. App is feature-complete for the thesis demo.
- Backend: stable in `backend/`. 52/52 unit tests pass (+1 DB-dependent skip), lint clean. The 4 bugs from the 2026-06-05 review are fixed.
- Frontend: `frontend/` (React 19 + Vite + Tailwind v4 + shadcn/ui, dark-only). 36/36 tests pass, build clean.
- Detection: hybrid rule-based + optional Ollama semantic signals, with two context layers on top: verified-brand (hardcoded official domains) and **user sender lists (allowlist/blocklist, user-managed)**. Scan engine version: `rules-ai-v7`.
- Auth: JWT Bearer token in `Authorization` header. Frontend logout deletes local token.
- Timeline: demo/presentation for coordinator now; thesis paper draft deadline ~2026-06-17.

## What Works

- Register/login (arcjet bot/rate-limit protection on auth routes).
- Gmail OAuth connect, manual sync + auto-sync (node-cron, 15 min), automatic scan after sync.
- Email list/detail with computed state: `effectiveVerdict`, `riskBucket`, `reviewStatus`, `latestScan`.
- Hybrid scan: deterministic rules (primary) + Ollama semantic signals (secondary, capped) + natural-language explanation (Ollama or controlled fallback).
- Verified-brand layer: official brand domains get brand-typical signals discounted (`VERIFIED_BRAND_MODIFIERS`).
- **User sender lists (2026-06-10, v2):** per-user trusted/blocked rules for exact senders and whole domains.
  - Managed on the dedicated **/sender-lists page** ("Trusted & Blocked" in the nav): summary cards, search + filters, matched-email counts per rule (`?withMatchCounts=1`), add form, "How rules work". Also: "Trust / Block" dropdown on the email detail page. Settings only links here.
  - Blocklist ⇒ `user_blocklist_match` rule adds exactly the likely_phishing threshold (60) — verdict guaranteed.
  - Allowlist ⇒ contextual signals muted, critical signals (sensitive-data request, dangerous attachments, IP links, embedded credentials, punycode) keep full weight.
  - Mutual exclusivity enforced by unique `(userId, kind, value)` index + 409 `LIST_CONFLICT`.
  - **Cross-kind conflicts rejected (v2):** a sender rule and a covering domain rule can never have opposite types — 409 both directions; the email-page menu hides contradictory options ("Already trusted/blocked through the domain rule"). Sender-beats-domain precedence remains in the engine only as a safety net.
  - Domain matching is suffix-aware (lookalikes do not match).
  - Lists apply to future scans only; UI offers instant "Scan again" after a change.
- **Dashboard = the app's hub (2026-06-11):** posture hero, stat cards, threat trend, risk donut, "Who is targeting you", needs-attention list, **"Most common warning signs"** (top rules + explanations, merged from the deleted Reports page) and **"Email me this report"**. A **global time-range filter** (`TimeRangeContext`; presets Last day / Yesterday / Last 30 days (default) / Last 90 days / Last month, computed in the browser's local timezone) scopes the dashboard, the inbox (list + chip counts, read-only range pill) and the emailed report via absolute `?from=&to=` params — `days`/`month` stay valid backend-side, `from`/`to` win. **The Reports page, its route and nav entry are gone.**
- **Layout/a11y (2026-06-11):** desktop full-width, mobile exactly 20px gutters with no horizontal overflow at 380px; cards `rounded-sm`; risk donut has no hover effect; risk palette passes WCAG 2.1 AA on background/card/soft surfaces (`--color-risk-phishing` lightened #a855f7 → #b873f9).
- **One trust score everywhere:** reports emit an effective-verdict split (user review overrides scan, strict partition — `effectiveSafe/Suspicious/LikelyPhishing/MarkedPhishing`); the dashboard consumes the same report data, so the numbers always agree.
- **Account deletion:** `DELETE /users/me` with full cascade (emails, scans, mail accounts, sender lists).
- Manual review: `mark-safe`, `mark-phishing` (also moves to Gmail Spam) — separate from the lists.
- Report data + send-by-email live on the dashboard for the active range (`GET/POST /reports/monthly-summary[/send]?from=&to=&label=`; legacy `?month=` still works); daily digest (08:00, opt-out), instant phishing alerts (opt-in).
- Settings: profile, Gmail connection + sync size, AI toggle, notifications, digest hour (local timezone), sender lists, delete account.

## API surface (mounted in `app.js`)

`/api/v1/auth`, `/users`, `/mail-accounts`, `/emails`, `/actions`, `/meta`, `/scans`, `/reports`, `/contact`, `/sender-lists` — details in `docs/API_PLAN.md`.

## Known limitations (accepted for MVP)

- Sync scan pipeline is sequential per email when Ollama is on (latency on big syncs).
- No SPF/DKIM/DMARC verification (listed as future work).
- Gmail push notifications not used (polling only).
- App will not be deployed publicly (Google OAuth verification not pursued) — thesis/demo only.

## What remains (non-code)

- Demo walkthrough + screenshots for coordinator (presentation script: see `docs/PRESENTATION_SCRIPT.md`).
- Manual end-to-end pass by Andrei with his real Gmail account.
- Thesis paper draft (~2026-06-17).
