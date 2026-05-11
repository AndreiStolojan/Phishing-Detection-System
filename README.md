# Phishing Detection System

Backend-first web application for detecting phishing emails, built as a final-year bachelor thesis project. The system connects to Gmail, synchronizes emails, extracts security-relevant signals, scores each email with an explainable rule-based engine, and exposes clear verdicts and reasons through a REST API.

The project is currently focused on a stable backend MVP. A production-ready frontend is the next major step.

## Current Status

The backend MVP is largely implemented and manually tested. The main flow works end to end:

```text
register/login -> connect Gmail -> sync emails -> parse email data -> scan -> store verdict -> review actions -> monthly report
```

Implemented:

- JWT authentication with `Bearer` token authorization.
- Current user profile and user-level AI settings.
- Gmail OAuth connection flow.
- Manual Gmail sync with duplicate prevention.
- Email parsing for sender, reply-to, body, links, domains, attachments, and metadata.
- Rule-based phishing scoring with clear triggered rules and reasons.
- Optional local Ollama semantic signals and Romanian explanations with safe backend fallback.
- One current scan per email, protected by a unique MongoDB index and atomic upsert.
- Manual review actions: `mark-safe` and `mark-phishing`.
- Gmail `move to spam` attempt after explicit `mark-phishing`.
- Email list/detail endpoints with UI-ready state fields such as `effectiveVerdict`, `reviewStatus`, `isQuarantined`, and `riskBucket`.
- Monthly phishing summary endpoint and manual email digest endpoint.
- Backend documentation and manual test checklist.

Still to do:

- Build the minimal frontend for demonstration.
- Deploy backend/API and frontend.
- Add automated tests for core scoring and state logic.
- Add demo data or a repeatable demo scenario.
- Finalize presentation/documentation for the bachelor thesis.
- Optionally calibrate scoring and Ollama model choice on a larger email set.

## Tech Stack

- **Runtime:** Node.js
- **API:** Express.js
- **Database:** MongoDB with Mongoose
- **Auth:** JWT Bearer tokens
- **Email provider:** Gmail API
- **Validation:** Joi
- **Email sending:** Nodemailer
- **AI explainability:** Ollama, optional and local-first
- **Linting:** ESLint

## Architecture

The repository is currently organized as:

```text
backend/
  src/
    app.js
    server.js
    config/
    database/
    common/
    middlewares/
    models/
    controllers/
    services/
    routes/
    validations/
  scripts/
  extras/
  manual-tests/
  postman/

docs/
README.md
AGENTS.md
```

The backend follows a layered Express structure:

```text
route -> controller -> service -> model/database
```

Business logic is kept in services instead of controllers. This keeps HTTP handling separate from authentication, Gmail sync, scan logic, report generation, and email actions.

## Phishing Detection Approach

The main phishing verdict is deliberately not delegated to an LLM. The core detection engine is rule-based because it is easier to test, explain, and defend in an academic project.

Current rule signals include:

- `Reply-To` domain mismatch.
- Shortened URLs.
- Suspicious URL patterns such as IP-address links, embedded credentials, punycode domains, and very long URLs.
- High-risk attachment extensions.
- Archive attachments.
- Unusually high link count.

The final scan stores:

- `ruleScore`
- `aiScore`
- final `score`
- `verdict`: `safe`, `suspicious`, or `likely_phishing`
- human-readable `reasons`
- structured `triggeredRules`

Ollama is used only as an optional support layer for semantic signals and user-friendly explanations. If Ollama is disabled or unavailable, the backend still scans emails and returns controlled fallback explanations.

## API Overview

Base URL in local development:

```text
http://localhost:5500/api/v1
```

Main endpoint groups:

| Area | Endpoints |
| --- | --- |
| Auth | `POST /auth/register`, `POST /auth/login`, `POST /auth/logout` |
| Users | `GET /users/me`, `PATCH /users/me`, `PATCH /users/me/ai-settings` |
| Gmail accounts | `GET /mail-accounts/google/start`, `GET /mail-accounts/google/callback`, `GET /mail-accounts`, `POST /mail-accounts/:id/sync` |
| Emails | `GET /emails`, `GET /emails/:id`, `GET /emails/:id/raw` |
| Scans | `POST /scans/emails/:emailId`, `GET /scans/emails/:emailId/latest` |
| Actions | `POST /actions/emails/:id/mark-safe`, `POST /actions/emails/:id/mark-phishing` |
| Reports | `GET /reports/monthly-summary`, `POST /reports/monthly-summary/send` |
| Meta | `GET /health`, `GET /meta/status` |

Detailed API notes are documented in [docs/API_PLAN.md](docs/API_PLAN.md).

## Local Setup

### 1. Install dependencies

```bash
cd backend
npm install
```

### 2. Configure environment

Create or update:

```text
backend/.env.development.local
```

Required variables:

```text
PORT=5500
DB_URI=<mongodb-connection-string>
JWT_SECRET=<strong-secret>
JWT_EXPIRES_IN=7d
GOOGLE_CLIENT_ID=<google-client-id>
GOOGLE_CLIENT_SECRET=<google-client-secret>
GOOGLE_REDIRECT_URI=http://localhost:5500/api/v1/mail-accounts/google/callback
```

Optional variables:

```text
EMAIL_FROM=<gmail-address-for-digest>
EMAIL_PASSWORD=<gmail-app-password>
AI_SEMANTIC_ENABLED=0
OLLAMA_BASE_URL=http://127.0.0.1:11434
OLLAMA_MODEL=qwen2.5:3b
OLLAMA_TIMEOUT_MS=10000
OLLAMA_PROMPT_VERSION=semantic-v1
```

### 3. Run the backend

```bash
npm run dev
```

Health check:

```text
GET http://localhost:5500/api/v1/health
```

### 4. Useful scripts

```bash
npm run lint
npm run bootstrap:admin
npm run cleanup:duplicate-scans
npm run benchmark:ollama -- --models qwen2.5:3b,gemma3:4b
```

## Verification

Current verification is mostly manual because the project integrates with real services such as Gmail, MongoDB, Nodemailer, and optional Ollama.

Available checks:

- `npm run lint`
- Postman collections in `backend/postman`
- REST Client/manual HTTP examples in `backend/manual-tests`
- manual backend checklist in [docs/MANUAL_TESTS.md](docs/MANUAL_TESTS.md)

Automated tests are planned for pure backend logic such as:

- phishing scoring;
- email state derivation;
- link analysis;
- monthly summary date parsing.

## Important Design Decisions

- **Backend-first MVP:** the project prioritizes API correctness, sync, parsing, and detection logic before UI polish.
- **Rule-based detection:** the main verdict must be explainable and deterministic.
- **Ollama is optional:** AI helps with semantic signals and explanations, but the backend works without it.
- **Gmail first:** only one provider is implemented to keep scope realistic.
- **Manual sync first:** scheduled jobs are deferred because manual sync is enough for an MVP demo.
- **One current scan per email:** avoids noisy scan history and duplicate report counts.
- **Manual review has priority:** `userVerdict` overrides the algorithmic verdict in the UI-facing state.

## Limitations

This is an MVP, not a production security product.

Known limitations:

- No production frontend yet.
- No cloud deployment yet.
- Gmail is the only implemented provider.
- No automated scheduler for recurring sync.
- No external URL/domain reputation checks.
- No domain age or SPF/DKIM/DMARC verification.
- Gmail tokens are stored for MVP functionality; a production version should encrypt provider tokens at rest.
- Most testing is currently manual rather than automated.

## Next Milestone

The next milestone is a minimal frontend that consumes the existing API:

- authentication and token storage;
- Gmail connect button;
- manual sync action;
- email list grouped by `riskBucket`;
- email detail view with scan reasons and AI explanation;
- `mark-safe` and `mark-phishing` actions;
- monthly summary view.

After the frontend is functional locally, the backend/API should be deployed, then the frontend should be deployed against the production API URL.
