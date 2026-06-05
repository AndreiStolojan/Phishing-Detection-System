# FRONTEND PLAN

## Scop

Frontend-ul curent este `SecureInbox`: un inbox Gmail securizat, nu un înlocuitor complet pentru Gmail.

Obiectivul lui este să demonstreze clar:

`login/register -> connect Gmail -> sync -> read email -> inspect scan -> mark safe/phishing -> reports`

## Direcție

- React + Vite.
- MUI cu temă dark restrânsă și matură.
- React Router pentru rute protejate.
- JWT Bearer token în `localStorage`.
- Text UI în engleză.
- Gmail only pentru MVP.
- Frontend-ul nu calculează phishing.
- Frontend-ul afișează ce primește din backend: `riskBucket`, `effectiveVerdict`, `reviewStatus`, `latestScan`.

## Structură

```text
frontend/
  package.json
  vite.config.js
  vitest.setup.js
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
  tests/
    unit/
```

## Pagini

### Login/Register

Endpoint-uri:

- `POST /api/v1/auth/register`
- `POST /api/v1/auth/login`
- `GET /api/v1/users/me`

Logout-ul este local: se șterge tokenul, fără request backend.

### Security Inbox

Ecranul principal folosește un layout de listă, nu layout cu 3 panouri:

- filtrele de securitate sunt centrate sus;
- bara de search este sub filtre;
- emailurile sunt listate unul sub altul;
- click pe email deschide pagina separată `/emails/:id`.

Filtre:

- All
- Needs Review
- Quarantine
- Confirmed Phishing
- Safe
- Unscanned

Endpoint-uri:

- `GET /api/v1/emails`
- `GET /api/v1/emails/:id`
- `GET /api/v1/emails/:id/raw`

### Email Detail

Afișează:

- săgeată de back în stânga sus;
- expeditor, destinatar, reply-to, dată;
- badge de risc;
- scor și verdict;
- explicația AI dacă există;
- corp HTML sanitizat;
- fallback la text body.

Reguli body:

- se randează `htmlBody` doar după sanitizare cu DOMPurify;
- imaginile din email rămân vizibile pentru ca mesajul să semene cu emailul original;
- linkurile se deschid în tab nou cu `rel="noopener noreferrer"`;
- dacă HTML lipsește, se afișează `textBody`.

### Dashboard/Status

Folosit pentru:

- status Gmail;
- sync manual;
- afișarea rezultatului ultimului sync.

Endpoint-uri:

- `GET /api/v1/meta/status`
- `GET /api/v1/mail-accounts`
- `POST /api/v1/mail-accounts/:id/sync`

### Reports

Endpoint-uri:

- `GET /api/v1/reports/monthly-summary`
- `POST /api/v1/reports/monthly-summary/send`

### Settings

Folosit pentru:

- conectare Gmail;
- deconectare Gmail;
- setare nume utilizator;
- setare limită sync Gmail;
- pornire/oprire AI explainability.

Endpoint-uri:

- `GET /api/v1/users/me`
- `PATCH /api/v1/users/me`
- `PATCH /api/v1/users/me/ai-settings`
- `GET /api/v1/mail-accounts`
- `GET /api/v1/mail-accounts/google/start`
- `PATCH /api/v1/mail-accounts/:id/settings`
- `DELETE /api/v1/mail-accounts/:id`

## Teste

Frontend-ul are teste unitare în:

```text
frontend/tests/unit/
```

Comandă:

```bash
npm --prefix frontend test
```

Acoperire inițială:

- formatări de risc/verdict;
- API client și Bearer token;
- AuthContext;
- badge de risc;
- item de listă email;
- sanitizare HTML;
- acțiuni review.

## Ce nu intră în MVP

- compose/reply/forward;
- archive/delete/read-unread/labels;
- full threading;
- realtime Gmail push;
- multi-provider;
- AI ca motor principal de detecție.
