# CLAUDE.md — SecureInbox / XAI Phishing Shield

**Read this file, then immediately read `docs/PROJECT_STATE.md` before doing anything.**

---

## What this project is

**SecureInbox** — Gmail-only phishing detection inbox, bachelor's thesis (licenta).
Syncs Gmail emails, runs hybrid rule-based + local-AI scan, assigns a risk verdict, lets users review/mark emails.

Stack: Node.js + Express + MongoDB + Mongoose · React + Vite + MUI · Ollama local (optional AI).

---

## Folder layout

```
backend/      Express API + MongoDB, runtime in backend/src/
frontend/     React SecureInbox app
docs/         Active project documentation
docs/archive/ Historical docs, not needed for daily work
```

---

## Key commands

```bash
npm --prefix backend run dev       # :5500
npm --prefix backend run lint
npm --prefix backend test

npm --prefix frontend run dev      # :5173
npm --prefix frontend run build
npm --prefix frontend test
```

Local URLs: backend `http://localhost:5500/api/v1` · frontend `http://localhost:5173`

---

## Project conventions

- Backend in `backend/`, frontend in `frontend/`.
- Dev env: `backend/.env.development.local`. Prod: `backend/.env.production.local`.
- Auth: Bearer token in `Authorization` header. No backend logout — frontend deletes token.
- Current user: `GET /api/v1/users/me`.
- Gmail OAuth: `GET /api/v1/mail-accounts/google/start` → callback.

---

## Working style

- Do not write code unless the user clearly asks for it.
- Explain simply — define technical terms, explain why a solution was chosen.
- Work in small, verifiable steps. After each step: say what changed, where, and what to test.
- Do not assume the user knows the concepts.
- Be concrete: name the file, endpoint, reason, next step.
- If multiple options exist, recommend one and explain why.
- Do not unnecessarily complicate the architecture.
- Do not leave docs and code saying different things.

---

## Documentation rules

After each important completed step:
- Update `docs/TODO.md` if task status changed.
- Update `docs/PROGRESS.md` with date, what finished, next step.
- Update `docs/API_PLAN.md` if endpoints changed.
- Update `docs/DECISIONS.md` if a technical decision was made.

Before closing a session:
- Confirm all four docs above are current.
- Tell the user: where the project stands, what works, next recommended step.

---

## Documentation map — read on demand, not all at once

| File | Read when |
|------|-----------|
| `docs/PROJECT_STATE.md` | **Every new session — read immediately after this file** |
| `docs/TODO.md` | Checking current phase and remaining tasks |
| `docs/PROGRESS.md` | Reviewing session history |
| `docs/API_PLAN.md` | Touching API endpoints |
| `docs/ARCHITECTURE.md` | Touching folder structure, env vars, request flow, key services |
| `docs/PHISHING_RULES.md` | Touching scan engine, scoring thresholds, or detection rules |
| `docs/DECISIONS.md` | Unsure why something was built a certain way |
| `docs/MANUAL_TESTS.md` | Testing manually end-to-end |
| `docs/archive/` | Historical only — skip unless specifically needed |
