# SecureInbox

SecureInbox is a Gmail-only phishing triage application built as a bachelor thesis MVP. It lets a user connect Gmail, manually sync recent Inbox messages, read synced email, inspect phishing/security signals, and mark messages as safe or phishing.

The project is intentionally not a full Gmail replacement. It is a security-first inbox that demonstrates email ingestion, explainable rule-based phishing detection, optional local AI explainability, and a practical frontend for review actions.

## Current State

- Backend exists in `backend/`.
- Frontend exists in `frontend/` and has been rebuilt as SecureInbox.
- Gmail is the only provider for the MVP.
- Phishing detection runs in the backend.
- Frontend UI copy is English.
- Logout is local to the frontend: the JWT token is deleted from browser storage.

## Main Features

- JWT register/login.
- Gmail OAuth connection.
- Manual Gmail sync from Inbox.
- Email parsing for sender, reply-to, subject, body, links, domains, attachments, and received date.
- Rule-based phishing scoring with explicit reasons and triggered rules.
- Optional Ollama semantic signals and explanation fallback.
- Email list with security filters.
- Sanitized HTML email rendering with remote images blocked.
- Manual actions: mark safe and mark phishing.
- Best-effort Gmail move-to-spam after explicit phishing confirmation.
- Monthly phishing/security summary.
- Backend and frontend unit test commands.

## Project Structure

```text
backend/
  src/
    app.js
    server.js
    config/
    controllers/
    middlewares/
    models/
    routes/
    services/
    validations/
  tests/unit/
  package.json

frontend/
  src/
    api/
    components/
      auth/
      layout/
      inbox/
      security/
      reports/
      common/
    context/
    hooks/
    pages/
    styles/
    utils/
  tests/unit/
  package.json

docs/
  PROJECT_STATE.md
```

## Local Setup

Install backend dependencies:

```bash
npm --prefix backend install
```

Install frontend dependencies:

```bash
npm --prefix frontend install
```

Create the backend local env file:

```text
backend/.env.development.local
```

Required backend variables:

```text
PORT=5500
DB_URI=<mongodb-uri>
JWT_SECRET=<jwt-secret>
JWT_EXPIRES_IN=7d
MAIL_TOKEN_ENCRYPTION_KEY=<mail-token-key>
```

Required for Gmail:

```text
GOOGLE_CLIENT_ID=<google-client-id>
GOOGLE_CLIENT_SECRET=<google-client-secret>
GOOGLE_REDIRECT_URI=http://localhost:5500/api/v1/mail-accounts/google/callback
FRONTEND_APP_URL=http://localhost:5173
```

Optional for Ollama:

```text
AI_SEMANTIC_ENABLED=true
OLLAMA_BASE_URL=http://127.0.0.1:11434
OLLAMA_MODEL=qwen2.5:3b
OLLAMA_TIMEOUT_MS=30000
OLLAMA_PROMPT_VERSION=semantic-v1
```

## Run Locally

Backend:

```bash
npm --prefix backend run dev
```

Frontend:

```bash
npm --prefix frontend run dev
```

Default URLs:

- API: `http://localhost:5500/api/v1`
- Frontend: `http://localhost:5173`

## Test Commands

Backend:

```bash
npm --prefix backend run lint
npm --prefix backend test
```

Frontend:

```bash
npm --prefix frontend test
npm --prefix frontend run build
```

## MVP Limits

SecureInbox does not include compose, reply, forward, archive, delete, read/unread, labels, full threading, real-time Gmail push sync, multi-provider support, or AI as the primary detector.

For current context, read:

1. `AGENTS.md`
2. `docs/PROJECT_STATE.md`
