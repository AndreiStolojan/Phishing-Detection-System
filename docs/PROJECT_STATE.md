# PROJECT STATE

## Current Snapshot

- Date: `2026-06-05`
- Product direction: `SecureInbox` — Gmail-only phishing detection inbox, thesis project.
- Phase: **Faza 18 — Redesign frontend profesional (implemented, pending manual end-to-end validation)** (Faza 17 auto-sync + notificări done)
- Backend: implemented and stable in `backend/`. Tests pass. The 4 known bugs are fixed.
- Frontend: rebuilt from scratch (`frontend/`) with Tailwind v4 + shadcn/ui, dark-only, sidebar + dashboard-first. Build + 18 unit tests pass. Stack/decision recorded in `docs/DECISIONS.md` (2026-06-05).
- Detection: hybrid rule-based + optional Ollama semantic signals. Rule engine is the primary detector.
- Auth: JWT Bearer token in `Authorization` header. Frontend logout deletes local token.
- Timeline: ~2 days for app completion, ~10 days for thesis paper draft (deadline ~2026-06-17).

## What Works

- Register/login through backend auth.
- `GET /api/v1/users/me` for current user.
- Gmail OAuth start/callback for one Gmail account per user.
- Manual Gmail sync with automatic scan after sync.
- Email list/detail with computed state: `effectiveVerdict`, `riskBucket`, `reviewStatus`, `latestScan`.
- Raw email body: `GET /api/v1/emails/:id/raw`.
- Frontend renders sanitized `htmlBody`, falls back to `textBody`.
- Manual actions: `mark-safe`, `mark-phishing`; phishing tries Gmail move-to-spam.
- Monthly report endpoint and manual digest send.
- Backend unit tests and frontend unit tests.

## Known Bugs (must fix before new features)

### Bug 1 — AI toggle is always broken
**File:** `backend/src/services/user.service.js:63`
**Problem:** `payload.aiEnabled === 1` — if the frontend sends `{ aiEnabled: true }` (boolean), this evaluates to `false`. AI can never be enabled via the normal flow.
**Fix:** Replace with `Boolean(payload.aiEnabled)`.

### Bug 2 — Default Ollama model can be `undefined`
**File:** `backend/src/services/ollama-explanation.service.js:8`
**Problem:** `const DEFAULT_OLLAMA_MODEL = OLLAMA_MODEL` — OLLAMA_MODEL is an env var that can be `undefined`, so the fallback is broken.
**Fix:** `const DEFAULT_OLLAMA_MODEL = OLLAMA_MODEL || 'gemma3:4b'` (same as the semantic service).

### Bug 3 — Fallback explanation ignores triggered rules and AI signals
**File:** `backend/src/services/scan-explanation.service.js:115-123`
**Problem:** `buildControlledRomanianExplanationObject` takes `{ verdict, triggeredRules, aiSignals }` but only uses `verdict`. The more detailed `buildControlledRomanianExplanation` function exists in the same file but is never called anywhere.
**Fix:** Either use the full function in the fallback path, or remove the dead `triggeredRules`/`aiSignals` params.

### Bug 4 — MongoDB transaction in registerUser breaks on standalone MongoDB
**File:** `backend/src/services/auth.service.js:27-60`
**Problem:** `User.create()` is wrapped in a Mongoose session/transaction. Transactions require a replica set. A standalone MongoDB (normal dev setup) will throw a session-not-supported error on register.
**Fix:** Remove the session/transaction. A single `User.create()` is atomic by default.

## Code Quality Issues (lower priority, fix after bugs)

- **No rate limiting on `/api/v1/auth/login`** — `extras/security/arcjet.middleware.js` exists but is never imported in `app.js`. Brute force is possible.
- **No CORS configuration** — `app.js` has no CORS middleware. Will be needed for production.
- **Duplicate Ollama client code** — `ollama-semantic.service.js` and `ollama-explanation.service.js` both duplicate `normalizeBaseUrl`, `buildCandidateBaseUrls`, `stripCodeFence` and the retry loop. Should be extracted to a shared Ollama client.
- **`user.service.js` uses raw `Error` instead of `createError`** — inconsistent with the rest of the codebase; `code` field is missing from these errors.
- **`bcrypt` and `bcryptjs` both listed in `package.json`** — only `bcryptjs` is used. `bcrypt` (native) is unused.
- **`cookie-parser` listed in `package.json` but never imported in `app.js`**.
- **Email state computed twice in `getEmailsForUser`** — the MongoDB aggregation already computes `riskBucket` etc. via `buildEmailStateStages()`, then `toEmailListItem` calls `buildEmailStateForUser` again in JS.
- **Sync scan pipeline is fully sequential** — each email scanned one-by-one including Ollama calls (10–45s each). 10 emails = potentially minutes per sync request.
- **Developer email left in a comment** — `user.model.js:44`.

## What Is Being Added (coordinator feedback 2026-06-05)

The coordinator said the app must feel like something users want to use without opening Gmail.

### Auto-sync scheduler (Faza 17)
- `node-cron` job every 15 minutes — syncs and scans all users with Gmail connected
- No manual sync required from the user
- Interval configurable via `SYNC_INTERVAL_MINUTES` env var
- At deploy time, can be replaced/supplemented with Gmail Push Notifications (Pub/Sub)

### Instant phishing alert email (Faza 17)
- Email sent when a `likely_phishing` email is detected during any sync
- Opt-in only — user toggles `alertsEnabled` in settings
- Keeps it non-annoying: only fires for the highest-risk verdict, not for `suspicious`

### Daily digest auto-schedule (Faza 17)
- Existing digest logic reused, triggered automatically at 08:00 each day
- Only sent if there are new or risky emails in the last 24h (no empty digests)

### Frontend redesign (Faza 18)
- Full rebuild — professional look, not student project aesthetic
- Security overlay on top of email reading (not a full email client — no compose/reply)
- Clean dashboard with security stats, inbox with risk badges, detail with verdict + AI explanation

## Current MVP Scope

Included:
- Gmail only.
- Auto-sync (scheduler) + manual sync.
- Read synced emails with security overlay.
- Security filters by risk bucket.
- Sanitized HTML email body display.
- Security scan details, AI explanation when available, and review actions.
- Reports, daily digest, instant phishing alerts (opt-in).
- Settings.

Not included:
- Compose, reply, forward.
- Archive, delete, read/unread, labels.
- Full Gmail threading.
- Real-time Gmail push sync (polling only for now).
- Multi-provider support.
- AI as the primary detector.

