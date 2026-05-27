# Phishing Detection System

Full-stack phishing email triage application built as a final-year bachelor thesis project. The system lets users authenticate, connect a Gmail account, synchronize emails, extract security-relevant signals, scan messages with an explainable detection engine, review verdicts manually, and generate monthly phishing summaries.

The project is intended for backend, cybersecurity, and internship review contexts. It demonstrates practical API design, email ingestion, MongoDB persistence, Gmail OAuth integration, rule-based detection, and a React dashboard without presenting the system as production-grade email security software.

## Problem Statement

Phishing emails often use sender spoofing, reply-to manipulation, suspicious links, unsafe attachments, and social-engineering pressure to make users click links or provide sensitive data. A useful triage tool should not only label an email as risky, but also explain why the message was flagged.

This project addresses that problem by building a web application that imports Gmail messages, parses their metadata and content, applies deterministic phishing rules, optionally adds local AI semantic signals, and exposes the result through a protected REST API and frontend dashboard.

## Main Features

- User registration and login with JWT Bearer authentication.
- Protected React frontend with dashboard, email list, email detail, reports, and settings pages.
- Gmail OAuth connection flow.
- Manual Gmail synchronization with configurable sync size.
- Email parsing for sender, reply-to, subject, body, links, domains, attachments, snippet, and received date.
- Rule-based phishing scoring with explicit triggered rules and point values.
- Optional local Ollama semantic analysis and Romanian explanation generation.
- Controlled fallback explanations when Ollama is disabled or unavailable.
- Persistent scan records in MongoDB, with one current scan per email.
- Manual review actions: mark email safe or mark as phishing.
- Best-effort Gmail move-to-spam action after explicit phishing confirmation.
- Monthly report endpoint with verdict counts, review counts, quarantine counts, AI status counts, and top triggered rules.
- Optional monthly digest email sending through Nodemailer.
- Postman collections and manual test assets for API verification.

## Tech Stack

**Backend**

- Node.js
- Express.js
- MongoDB
- Mongoose
- JWT
- Joi validation
- Gmail API / Google OAuth
- Nodemailer
- Optional Ollama local LLM integration
- ESLint

**Frontend**

- React
- Vite
- Material UI
- React Router
- Recharts
- Framer Motion

**Supporting Tools**

- Postman collections
- REST Client manual test files
- Local environment files through `dotenv`

## Architecture Overview

```text
React + Vite frontend
  |
  | /api/v1 requests with Bearer token
  v
Express API
  |
  |-- Auth middleware and Joi validation
  |-- Controllers
  |-- Services
  |-- Mongoose models
  |
  |-- Gmail OAuth + Gmail API sync
  |-- Rule-based scan engine
  |-- Optional Ollama semantic layer
  |-- Optional Nodemailer monthly digest
  |
  v
MongoDB
```

The backend follows a layered monolith structure:

```text
route -> middleware/validation -> controller -> service -> model/database
```

Phishing detection logic is kept in backend services. The frontend displays API results and user actions; it does not implement detection rules itself.

## Project Structure

```text
.
|-- backend/
|   |-- src/
|   |   |-- app.js                  # Express app and route registration
|   |   |-- server.js               # API startup and MongoDB connection
|   |   |-- config/                 # Environment and Google OAuth config
|   |   |-- database/               # MongoDB connection
|   |   |-- common/                 # Shared error/HTTP helpers
|   |   |-- controllers/            # HTTP request handlers
|   |   |-- middlewares/            # Auth, role, validation, error middleware
|   |   |-- models/                 # Mongoose models
|   |   |-- routes/                 # Express route modules
|   |   |-- services/               # Business logic and integrations
|   |   `-- validations/            # Joi schemas
|   |-- extras/
|   |   |-- notifications/          # Nodemailer helpers
|   |   `-- security/               # Optional Arcjet security middleware
|   |-- manual-tests/               # Manual API/UI test assets
|   |-- postman/                    # Postman collections and environment
|   |-- scripts/                    # Admin/bootstrap/maintenance scripts
|   `-- package.json
|-- frontend/
|   |-- src/
|   |   |-- api/                    # API client wrappers
|   |   |-- components/             # Reusable UI components
|   |   |-- context/                # Auth context
|   |   |-- hooks/                  # Shared frontend hooks
|   |   |-- pages/                  # Dashboard, emails, reports, settings
|   |   |-- styles/                 # Theme and global styles
|   |   `-- utils/                  # Formatting and token storage helpers
|   |-- vite.config.js
|   `-- package.json
|-- docs/                           # Architecture, rules, roadmap, notes
|-- LICENSE
`-- README.md
```

## Setup Instructions

### Prerequisites

- Node.js 20+ recommended
- npm
- MongoDB connection string
- Google Cloud OAuth client configured for Gmail API access
- Optional: local Ollama installation for semantic analysis

### Backend Setup

```bash
git clone https://github.com/AndreiStolojan/Phishing-Detection-System.git
cd Phishing-Detection-System/backend
npm install
```

Create a local environment file:

```text
backend/.env.development.local
```

Start the API:

```bash
npm run dev
```

Default local API:

```text
http://localhost:5500/api/v1
```

Health check:

```text
GET http://localhost:5500/api/v1/health
```

### Frontend Setup

In a second terminal:

```bash
cd Phishing-Detection-System/frontend
npm install
npm run dev
```

Default local frontend:

```text
http://localhost:5173
```

In development, Vite proxies `/api/v1` requests to `http://localhost:5500`.

## Environment Variables

The backend loads environment values from `.env.<NODE_ENV>.local`. In local development, that is usually:

```text
backend/.env.development.local
```

Required backend variables:

```text
PORT=5500
DB_URI=<mongodb-connection-string>
JWT_SECRET=<strong-jwt-secret>
JWT_EXPIRES_IN=7d
```

Required for Gmail connection:

```text
GOOGLE_CLIENT_ID=<google-oauth-client-id>
GOOGLE_CLIENT_SECRET=<google-oauth-client-secret>
GOOGLE_REDIRECT_URI=http://localhost:5500/api/v1/mail-accounts/google/callback
```

Optional admin bootstrap variables:

```text
ADMIN_NAME=<admin-name>
ADMIN_EMAIL=<admin-email>
ADMIN_PASSWORD=<admin-password>
```

Optional digest/contact email variables:

```text
EMAIL_FROM=<sender-email-address>
EMAIL_PASSWORD=<sender-email-app-password>
```

Optional Ollama variables:

```text
AI_SEMANTIC_ENABLED=0
OLLAMA_BASE_URL=http://127.0.0.1:11434
OLLAMA_MODEL=qwen2.5:3b
OLLAMA_TIMEOUT_MS=10000
OLLAMA_PROMPT_VERSION=semantic-v1
```

Optional Arcjet variables are referenced by the extra security middleware, but that middleware is not wired into `backend/src/app.js` in the current codebase:

```text
ARCJET_ENV=development
ARCJET_KEY=<arcjet-key>
```

Frontend variable:

```text
VITE_API_BASE_URL=/api/v1
```

If omitted, the frontend defaults to `/api/v1`.

## API Overview

Base path:

```text
/api/v1
```

| Area | Method and path | Purpose |
| --- | --- | --- |
| Health | `GET /health` | Basic API health check |
| Auth | `POST /auth/register` | Create a user account |
| Auth | `POST /auth/login` | Login and receive JWT |
| Auth | `POST /auth/logout` | Logout endpoint |
| Users | `GET /users/me` | Get current user |
| Users | `PATCH /users/me` | Update profile |
| Users | `PATCH /users/me/ai-settings` | Enable or disable AI settings |
| Users | `GET /users` | Admin-only user list |
| Gmail | `GET /mail-accounts/google/start` | Start Gmail OAuth |
| Gmail | `GET /mail-accounts/google/callback` | Google OAuth callback |
| Gmail | `GET /mail-accounts` | List connected mail accounts |
| Gmail | `PATCH /mail-accounts/:id/settings` | Update mail account settings |
| Gmail | `POST /mail-accounts/:id/sync` | Manually sync Gmail messages |
| Gmail | `DELETE /mail-accounts/:id` | Disconnect a mail account |
| Emails | `GET /emails` | List synchronized emails |
| Emails | `GET /emails/:id` | Get parsed email detail |
| Emails | `GET /emails/:id/raw` | Get raw email data |
| Scans | `POST /scans/emails/:emailId` | Scan one email |
| Scans | `GET /scans/emails/:emailId/latest` | Get latest/current scan |
| Actions | `POST /actions/emails/:id/mark-safe` | Manually mark email safe |
| Actions | `POST /actions/emails/:id/mark-phishing` | Manually mark email phishing |
| Reports | `GET /reports/monthly-summary` | Get monthly summary |
| Reports | `POST /reports/monthly-summary/send` | Send monthly digest email |
| Meta | `GET /meta/status` | Get app status counts |
| Contact | `POST /contact/message` | Send a contact/support message |

Most routes require:

```text
Authorization: Bearer <jwt>
```

Additional endpoint examples and manual tests are available in `backend/postman/` and `backend/manual-tests/`.

## Security and Detection Approach

The primary phishing verdict is deterministic and explainable. The system does not depend on an LLM for the core decision.

Current rule-based signals include:

- Reply-To domain mismatch.
- Known URL shorteners.
- Links using IP-address hosts.
- Links with embedded credentials.
- Punycode domains.
- Very long URLs.
- High-risk attachment extensions such as executable or script formats.
- Archive attachments.
- Unusually high link counts.

Each scan stores:

- `score`
- `ruleScore`
- `aiScore`
- `verdict`: `safe`, `suspicious`, or `likely_phishing`
- human-readable `reasons`
- structured `triggeredRules`
- optional `aiSignals`
- optional `aiExplanation`
- scan source and engine version

Optional Ollama support can add semantic signals such as urgency, sensitive-data requests, login/action pressure, social-engineering pressure, and possible brand impersonation. The AI contribution is capped and the backend falls back to controlled explanations if Ollama is disabled or fails.

Manual review is part of the workflow. A user's explicit `mark-safe` or `mark-phishing` action is stored on the email and reflected in UI-facing email state.

## Current Status

This is a working full-stack MVP:

- Backend API is implemented.
- MongoDB models and persistence are implemented.
- Gmail OAuth and manual sync are implemented.
- Email parsing and link analysis are implemented.
- Rule-based scanning is implemented.
- Optional Ollama semantic support is implemented with fallback behavior.
- React frontend is implemented for the main protected flows.
- Monthly report and digest endpoints are implemented.
- Manual test assets and Postman collections are included.

The project still needs automated tests, deployment hardening, and production security review before real-world use.

## Roadmap

- Add automated tests for scan scoring, link analysis, auth, email state derivation, and report generation.
- Add CI for linting and test execution.
- Add production deployment documentation.
- Encrypt Gmail provider tokens at rest.
- Add stricter production CORS and security middleware configuration.
- Add scheduled Gmail sync jobs.
- Add SPF, DKIM, and DMARC signal extraction where available.
- Add external URL/domain reputation checks.
- Add safer demo data or a repeatable demo mode that does not require a real inbox.
- Add screenshots and architecture diagrams to `docs/`.

## Limitations

- This is an MVP, not a production email security gateway.
- Gmail is the only implemented email provider.
- Synchronization is manual; there is no scheduled background sync yet.
- Gmail OAuth credentials and MongoDB are required for the main flow.
- Gmail provider tokens are stored for MVP functionality; production use should encrypt them at rest.
- No SPF/DKIM/DMARC verification is currently implemented.
- No external threat-intelligence or URL reputation lookup is currently implemented.
- No attachment sandboxing or content detonation is implemented.
- Arcjet security helpers exist under `backend/extras/security`, but are not currently wired into the Express app.
- Testing is mostly manual through Postman and manual test files.

## Screenshots / Diagram Placeholders

Screenshots are not currently checked into the repository.

Suggested additions:

- `docs/screenshots/dashboard.png` - authenticated dashboard.
- `docs/screenshots/email-list.png` - synchronized email queue.
- `docs/screenshots/email-detail-scan.png` - scan details with triggered rules.
- `docs/screenshots/reports.png` - monthly report page.
- `docs/architecture-diagram.png` - frontend, API, Gmail, MongoDB, and Ollama flow.

## What This Project Demonstrates Technically

- Designing a modular Express backend with routes, controllers, services, models, middleware, and validations.
- Implementing JWT authentication and protected API routes.
- Integrating Google OAuth and Gmail API synchronization.
- Parsing email metadata, message bodies, links, domains, and attachment extensions.
- Building explainable phishing detection logic with deterministic rule scoring.
- Persisting scan results and user review state in MongoDB with Mongoose.
- Separating security decision logic from UI presentation.
- Building a React/MUI frontend that consumes a protected REST API.
- Handling optional AI features without making them mandatory for core system behavior.
- Documenting realistic limitations and next steps for a cybersecurity MVP.

