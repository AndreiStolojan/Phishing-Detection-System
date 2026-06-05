# SecureInbox — Session Context

You are helping Andrei build **SecureInbox / XAI Phishing Shield**, a bachelor's thesis (licenta) project. Read every section below before responding to anything.

---

## What the project is

Gmail-only phishing detection inbox. Syncs Gmail, runs a hybrid rule-based + local-AI scan (Ollama), assigns a risk verdict per email, and lets the user review/mark messages. It is a **security overlay** on top of email reading — not a full email client (no compose/reply/delete).

**Stack:** Node.js + Express + MongoDB/Mongoose · React 19 + Vite + Tailwind v4 + shadcn/ui · Ollama (local, optional AI) · Framer Motion · Recharts · Sonner toasts

**Deadline:** ~2026-06-17 (thesis submission). App itself is ~99% complete.

---

## Folder layout

```
backend/      Express API — runtime in backend/src/
frontend/     React app — runtime in frontend/src/
docs/         Active docs (TODO, PROGRESS, DECISIONS, etc.)
docs/archive/ Historical only — skip unless needed
```

**Key commands:**
```bash
npm --prefix backend run dev      # http://localhost:5500/api/v1
npm --prefix frontend run dev     # http://localhost:5173
npm --prefix backend test
npm --prefix frontend test
npm --prefix frontend run build
```

---

## Backend — what exists and works

- **Auth:** register / login / JWT Bearer token. No backend logout — frontend deletes token.
- **Current user:** `GET /api/v1/users/me`
- **Gmail OAuth:** `GET /api/v1/mail-accounts/google/start` → callback
- **Mail accounts:** list, connect, disconnect (`DELETE /api/v1/mail-accounts/:id`)
- **Sync:** `POST /api/v1/mail-accounts/:id/sync` — syncs + auto-scans new emails
- **Auto-sync:** `node-cron` job every 15 min (configurable via `SYNC_INTERVAL_MINUTES`)
- **Emails:** `GET /api/v1/emails` (filterable by `riskBucket`, `q`, pagination) · `GET /api/v1/emails/:id` · `GET /api/v1/emails/:id/raw`
- **Scans:** `GET /api/v1/scans/emails/:id/latest`
- **Review actions:** `POST /api/v1/emails/:id/mark-safe` · `POST /api/v1/emails/:id/mark-phishing` (also moves to Gmail Spam)
- **Reports:** `GET /api/v1/reports/monthly-summary?month=YYYY-MM` · `POST /api/v1/reports/monthly-summary/send`
- **Settings:** `PATCH /api/v1/users/me/ai-settings` · `PATCH /api/v1/users/me/notification-settings`
- **Instant phishing alerts:** email sent when `likely_phishing` detected — opt-in via `alertsEnabled` field
- **Daily digest:** auto-scheduled at 08:00, only sent if risky/new emails in last 24h
- **Env files:** `backend/.env.development.local` (dev) · `backend/.env.production.local` (prod)

---

## Frontend — file map

```
src/
  api/              One file per resource (authApi, emailsApi, scansApi, reportsApi, usersApi, mailAccountsApi, contactApi, metaApi, actionsApi)
  components/
    auth/           ProtectedRoute.jsx
    common/         PageHeader.jsx · Pagination.jsx · states.jsx (LoadingState, ErrorState, EmptyState, InboxSkeleton, DashboardSkeleton)
    dashboard/      StatCard.jsx (count-up animation + stagger) · RiskDonut.jsx
    inbox/          EmailRow.jsx (left risk-color border + linkState for prev/next) · EmailBody.jsx
    layout/         AppShell.jsx · Sidebar.jsx · Topbar.jsx · BottomNav.jsx · PageTransition.jsx
    reports/        TopRulesChart.jsx
    security/       RiskBadge.jsx · VerdictBanner.jsx (pulsing icon for high-risk) · ScanDetails.jsx · ReviewActions.jsx
    ui/             shadcn primitives (button, card, badge, avatar, input, label, separator, skeleton, switch, dropdown-menu)
  context/          AuthContext.jsx · MailAccountContext.jsx (holds account, isConnected, syncing, lastSync, syncVersion, sync())
  hooks/            useApi.js · useAsyncAction.js · useAuth.js · useDebounce.js
  lib/              risk.js (TONES, RISK_BUCKET_META, VERDICT_META, RISK_FILTERS, getRiskMeta, getVerdictMeta, humanize) · email.js · email-list.js · utils.js
  pages/            DashboardPage · InboxPage · EmailDetailPage · LoginPage · ReportsPage · SettingsPage
  utils/            formatDate.js (formatDateTime, getDateGroupLabel) · sanitizeEmailHtml.js · tokenStorage.js
  index.css         Design tokens (CSS vars via @theme), dark-only
  main.jsx          Toaster (sonner) configured here
```

---

## Design system — dark-only, security-first

```
Background:   #0a0d14   Card:  #11151f   Border: #1f2838
Primary:      #3b9eff   (cyan/blue)
Muted fg:     #8a96aa

Risk palette (6 buckets):
  safe             #34c77b  (green)
  needs_review     #f0b429  (amber)   — "suspicious"
  quarantine       #f43f5e  (red)     — "likely phishing"
  confirmed_phishing #b91c1c (dark red)
  reviewed_safe    #34c77b  (green)
  unscanned        #8a96aa  (grey)
```

Components read from `src/lib/risk.js` — never hardcode risk colors.

CSS vars available as Tailwind utilities, e.g. `text-risk-safe`, `bg-risk-quarantine-soft`, `border-l-risk-quarantine`.

---

## Key data shapes

**Email (list item):**
```js
{ id, subject, from: { name, address }, receivedAt, snippet,
  riskBucket, effectiveVerdict, verdictSource, reviewStatus, latestScan }
```

**riskBucket values:** `safe | needs_review | quarantine | reviewed_safe | confirmed_phishing | unscanned`

**Scan:**
```js
{ verdict, score, ruleScore, aiScore, triggeredRules, reasons,
  aiExplanation: { summary }, aiExplanationMeta: { source, status } }
```

**Monthly summary counts:**
```js
{ syncedEmails, scannedEmails, safe, suspicious, likelyPhishing,
  quarantined, markedPhishing, reviewed, ai: { evaluated, failed, disabled } }
```

---

## What is complete (as of 2026-06-05)

### Fully done
- All backend phases 1–17 + bug fixes
- Full frontend rebuild (Faza 18): dark design system, all pages, all API integration
- Visual polish pass (Faza 19): login card fix, search/filter row, sticky security panel, reports AI labels, settings label
- UX polish (Faza 20 — all items complete):
  - Skeleton screens: `InboxSkeleton` (10 rows) and `DashboardSkeleton` on loading
  - Stat card count-up animation (0 → value, ease-out, 600ms) + stagger entrance (60ms between cards)
  - Dashboard: last sync timestamp in "Needs attention" header; red left border (`border-l-risk-quarantine`) on that card
  - Email rows: 3px left border in risk color (inline style via `tone.hex`)
  - Search: 300ms debounce via `useDebounce` hook
  - Filter chips: counts from monthly summary `(N)` shown inline
  - Date grouping: Today / Yesterday / This week / Older section headers in inbox
  - Prev/Next navigation: `EmailRow` passes `{ ids }` in router state; `EmailDetailPage` reads it for ← → buttons
  - VerdictBanner: pulsing icon animation for quarantine/phishing, bold for high-risk, `CheckCircle2` for safe, entrance animation
  - Scan details: collapsible with animated expand/collapse (framer-motion), defaults open
  - Reports: `StatCard` grid replaces `<dl>` list; `sonner` `toast.success/error` replaces static banner
  - Mobile bottom nav: fixed bottom bar with 4 icons (Dashboard, Inbox, Reports, Settings)
  - Page fade-in transitions: `PageTransition` wraps `<Outlet>` with opacity + translateY

### Still to do (manual validation + thesis)
- End-to-end manual test with real Gmail account
- Demo screenshots/captures for coordinator
- Thesis paper draft (deadline ~2026-06-17)

---

## Code conventions

- No comments unless the WHY is non-obvious
- No new features or abstractions beyond what's asked
- Backend errors use `createError(status, message)` from `extras/errors/`
- API client adds `Authorization: Bearer <token>` automatically (`src/api/apiClient.js`)
- `useApi(fn, deps, cacheKey)` — simple fetch hook with loading/error/reload
- `useAsyncAction(fn)` — returns `{ run, loading, error }` for mutations
- Auth stored in memory + sessionStorage via `tokenStorage.js`
- `MailAccountContext` exposes `sync()` — always use this for manual sync, not direct API calls

---

## Working style (user preference)

- Do not write code unless clearly asked
- Explain simply — define terms, say WHY a choice was made
- Work in small verifiable steps
- Name the file, endpoint, and next step explicitly
- Recommend one option and explain the tradeoff
- Do not complicate the architecture
- Keep docs and code in sync — after important steps update TODO.md, PROGRESS.md, DECISIONS.md

---

## Documentation map

| File | When to read |
|---|---|
| `docs/TODO.md` | Current phase and remaining tasks |
| `docs/PROGRESS.md` | Session history |
| `docs/API_PLAN.md` | Touching endpoints |
| `docs/ARCHITECTURE.md` | Folder structure, env vars, request flow |
| `docs/PHISHING_RULES.md` | Scan engine, scoring, detection rules |
| `docs/DECISIONS.md` | Why something was built a certain way |
| `docs/MANUAL_TESTS.md` | End-to-end manual testing checklist |
