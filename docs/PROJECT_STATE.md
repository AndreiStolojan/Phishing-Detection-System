# PROJECT STATE

## Current Snapshot

- Date: `2026-06-02`
- Product direction: `SecureInbox`, a Gmail-only security inbox for the thesis MVP.
- Backend: implemented in `backend/` with Express, MongoDB, Gmail OAuth/sync, phishing scans, manual review actions, and reports.
- Frontend: rebuilt in `frontend/` with React, Vite, MUI, React Router, and English UI copy.
- Detection: backend rule-based scoring remains the main detector; Ollama is optional for semantic signals and explanations.
- Auth: JWT Bearer token in the `Authorization` header; frontend logout deletes the local token.

## What Works

- Register/login through backend auth.
- `GET /api/v1/users/me` for current user.
- Gmail OAuth start/callback for one Gmail account per user.
- Manual Gmail sync from Status/Dashboard with automatic scan after sync.
- Email list/detail contracts for UI state: `effectiveVerdict`, `riskBucket`, `reviewStatus`, `latestScan`.
- Raw email body through `GET /api/v1/emails/:id/raw`.
- Frontend renders sanitized `htmlBody`, keeps email images visible, and falls back to `textBody`.
- Manual actions: `mark-safe`, `mark-phishing`; phishing action tries Gmail move-to-spam.
- Monthly report endpoint and optional manual digest send.
- Backend unit tests and frontend unit tests.

## Main Commands

Backend:

```bash
npm --prefix backend run dev
npm --prefix backend run lint
npm --prefix backend test
```

Frontend:

```bash
npm --prefix frontend run dev
npm --prefix frontend run build
npm --prefix frontend test
```

Default local URLs:

- Backend API: `http://localhost:5500/api/v1`
- Frontend: `http://localhost:5173`

## Current MVP Scope

Included:

- Gmail only.
- Manual sync.
- Read synced emails.
- Security filters by risk bucket.
- Sanitized HTML email body display.
- Security scan details, AI explanation when available, and review actions.
- Reports and settings.

Not included:

- Compose, reply, forward.
- Archive, delete, read/unread, labels.
- Full Gmail threading.
- Real-time Gmail push sync.
- Multi-provider support.
- AI as the primary detector.

## Documentation Use

Mandatory first read for a new agent:

1. `AGENTS.md`
2. `docs/PROJECT_STATE.md`

Read task-specific docs only when needed:

- API changes: `docs/API_PLAN.md`
- frontend work: `docs/FRONTEND_PLAN.md`
- phishing rules: `docs/PHISHING_RULES.md`
- manual validation: `docs/MANUAL_TESTS.md`
- decisions/history: `docs/DECISIONS.md`, `docs/PROGRESS.md`
