# MANUAL TESTS

## Scop

Acest document este checklist-ul practic pentru testarea manuală a backend-ului înainte să trecem la frontend. Testele manuale verifică dacă endpoint-urile funcționează cap-coadă în condiții reale, cu MongoDB, Gmail OAuth și, opțional, Ollama.

Test manual înseamnă că trimiți request-uri cu Postman, REST Client din VS Code/WebStorm sau `curl` și verifici răspunsul. Nu este test automat. Este util acum pentru că proiectul are integrări externe reale, mai ales Gmail.

## Pregătire înainte de teste

1. Pornește MongoDB.
2. Verifică `.env.development.local`.
3. Pornește backend-ul cu `npm run dev`.
4. Folosește baza URL:

```text
http://localhost:5500/api/v1
```

Variabile importante:

- `PORT=5500`
- `DB_URI`
- `JWT_SECRET`
- `JWT_EXPIRES_IN`
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `GOOGLE_REDIRECT_URI`
- `EMAIL_FROM` și `EMAIL_PASSWORD`, doar pentru testul de digest email
- `OLLAMA_BASE_URL`, `OLLAMA_MODEL`, `OLLAMA_TIMEOUT_MS`, doar pentru testele AI

## Ordinea recomandată

Testează în această ordine, pentru că unele endpoint-uri depind de date create anterior:

1. health check;
2. register/login;
3. user curent și setări AI;
4. conectare Gmail;
5. listare conturi și setări sync;
6. sync manual;
7. listare emailuri;
8. detalii email;
9. scanare manuală și scanare latest;
10. acțiuni manuale pe email;
11. rapoarte;
12. cazuri de eroare.

## 1. Health

### `GET /api/v1/health`

Ce verifici:

- serverul răspunde;
- `success` este `true`;
- `data.status` este `ok`.

Răspuns așteptat:

```json
{
  "success": true,
  "data": {
    "status": "ok"
  }
}
```

## 2. Auth

### `POST /api/v1/auth/register`

Body:

```json
{
  "name": "Test User",
  "email": "test-user@example.com",
  "password": "parola123"
}
```

Ce verifici:

- primești `token`;
- primești `user`;
- răspunsul nu conține `password` sau `passwordHash`;
- `user.role` este `user`;
- `user.settings.aiEnabled` există.

### `POST /api/v1/auth/login`

Body:

```json
{
  "email": "test-user@example.com",
  "password": "parola123"
}
```

Ce verifici:

- primești un token JWT valid;
- salvezi tokenul pentru endpoint-urile protejate;
- login cu parolă greșită întoarce `401`.

### `POST /api/v1/auth/logout`

Ce verifici:

- răspunsul este de succes;
- pentru MVP logout-ul nu invalidează tokenul pe server, ci frontend-ul va șterge tokenul local.

## 3. Users

Pentru endpoint-urile următoare folosește:

```text
Authorization: Bearer <token>
```

### `GET /api/v1/users/me`

Ce verifici:

- întoarce utilizatorul autentificat;
- nu întoarce `passwordHash`;
- `settings.aiEnabled` este boolean.

### `PATCH /api/v1/users/me`

Body:

```json
{
  "name": "Test User Updated"
}
```

Ce verifici:

- numele este actualizat;
- alte câmpuri nesuportate produc eroare de validare.

### `PATCH /api/v1/users/me/ai-settings`

Body pentru AI oprit:

```json
{
  "aiEnabled": 0
}
```

Body pentru AI pornit:

```json
{
  "aiEnabled": 1
}
```

Ce verifici:

- endpoint-ul acceptă doar `0` sau `1`;
- răspunsul întoarce `aiEnabled` ca boolean;
- când AI este oprit, scanarea nu trebuie să apeleze Ollama.

### `GET /api/v1/users`

Ce verifici:

- cu user normal răspunde `403`;
- cu admin răspunde lista de utilizatori.

## 4. Gmail OAuth și mail accounts

### `GET /api/v1/mail-accounts/google/start`

Ce verifici:

- endpoint-ul este protejat cu Bearer token;
- răspunsul conține `authUrl`;
- `authUrl` include scope-ul `gmail.modify`.

Pași:

1. Deschide `authUrl` în browser.
2. Alege contul Gmail de test.
3. Acceptă permisiunile.
4. Google redirecționează către `/api/v1/mail-accounts/google/callback`.

### `GET /api/v1/mail-accounts/google/callback`

Ce verifici:

- răspunsul spune că Gmail a fost conectat;
- se salvează un `MailAccount` în MongoDB;
- dacă ai conectat contul înainte de schimbarea la `gmail.modify`, reconectează-l.

### `GET /api/v1/mail-accounts`

Ce verifici:

- apare contul Gmail conectat;
- răspunsul include `accountEmail`, `provider`, `status`, `syncMaxResults`, `lastSyncedAt`;
- nu expune tokenurile Google.

### `PATCH /api/v1/mail-accounts/:id/settings`

Body valid:

```json
{
  "syncMaxResults": 10
}
```

Ce verifici:

- acceptă valori între `1` și `50`;
- respinge `0`, `51`, stringuri invalide și body gol;
- valoarea actualizată apare la `GET /api/v1/mail-accounts`.

### `DELETE /api/v1/mail-accounts/:id`

Ce verifici:

- șterge conexiunea locală;
- după ștergere, contul nu mai apare la listare;
- pentru demo, rulează acest test doar dacă ești pregătit să reconectezi Gmail.

## 5. Sync Gmail

### `POST /api/v1/mail-accounts/:id/sync`

Ce verifici:

- răspunsul include `fetchedCount`, `insertedCount`, `updatedCount`, `skippedCount`;
- răspunsul include `scanSummary`;
- emailurile noi sunt scanate automat;
- `lastSyncedAt` se actualizează;
- la al doilea sync, multe emailuri ar trebui să fie `updated`, nu duplicate.

Câmpuri importante în `scanSummary`:

- `scannedCount`;
- `scannedInsertedCount`;
- `scannedUpdatedCount`;
- `skippedAlreadyCurrentCount`;
- `skippedReviewedCount`;
- `failedCount`.

## 6. Emails

### `GET /api/v1/emails`

Ce verifici:

- întoarce `items` și `pagination`;
- fiecare email are `latestScan` dacă a fost scanat;
- fiecare email are starea derivată pentru UI:
  - `userVerdict`;
  - `reviewStatus`;
  - `effectiveVerdict`;
  - `verdictSource`;
  - `isQuarantined`;
  - `riskBucket`.

Filtre de testat:

```text
GET /api/v1/emails?page=1&limit=10
GET /api/v1/emails?q=paypal
GET /api/v1/emails?verdict=safe
GET /api/v1/emails?verdict=suspicious
GET /api/v1/emails?verdict=likely_phishing
GET /api/v1/emails?verdict=phishing
GET /api/v1/emails?riskBucket=safe
GET /api/v1/emails?riskBucket=needs_review
GET /api/v1/emails?riskBucket=quarantine
GET /api/v1/emails?riskBucket=reviewed_safe
GET /api/v1/emails?riskBucket=confirmed_phishing
GET /api/v1/emails?riskBucket=unscanned
GET /api/v1/emails?mailAccountId=<mailAccountId>
```

### `GET /api/v1/emails/:id`

Ce verifici:

- întoarce detalii pentru un email;
- include metadate utile pentru scanare: `senderDomain`, `replyToDomain`, `linkCount`, `hasShortenedUrl`, `suspiciousLinkPatterns`, `attachmentExtensions`;
- include `latestScan` compact.

### `GET /api/v1/emails/:id/raw`

Ce verifici:

- întoarce `textBody`, `htmlBody`, `links`;
- este protejat, deci alt utilizator nu poate vedea emailul.

## 7. Scans

### `POST /api/v1/scans/emails/:emailId`

Ce verifici:

- creează sau actualizează scanarea curentă;
- întoarce `score`, `ruleScore`, `aiScore`, `verdict`;
- întoarce `reasons` și `triggeredRules`;
- întoarce `aiSignals`, `aiExplanation`, `aiExplanationMeta`;
- nu creează duplicate pentru același `userId + emailId`.

Test cu AI oprit:

1. rulează `PATCH /api/v1/users/me/ai-settings` cu `aiEnabled: 0`;
2. rulează scanarea;
3. verifică `aiSignals.status: "disabled"`;
4. verifică `aiExplanationMeta.fallbackReason: "ai_disabled"`.

Test cu AI pornit:

1. pornește Ollama local;
2. rulează `PATCH /api/v1/users/me/ai-settings` cu `aiEnabled: 1`;
3. rulează scanarea;
4. verifică dacă `aiSignals.status` este `evaluated`;
5. verifică dacă `aiExplanationMeta.status` este `generated` sau fallback controlat.

Test cu Ollama oprit:

1. oprește Ollama;
2. rulează scanarea cu `aiEnabled: 1`;
3. verifică faptul că backend-ul răspunde tot cu succes;
4. verifică fallback-ul din `aiExplanationMeta`.

### `GET /api/v1/scans/emails/:emailId/latest`

Ce verifici:

- întoarce scanarea curentă;
- dacă emailul nu are scanare, răspunde `404`;
- emailul altui utilizator nu poate fi accesat.

## 8. Actions

### `POST /api/v1/actions/emails/:id/mark-safe`

Ce verifici:

- setează `userVerdict: "safe"`;
- setează `reviewedAt`;
- setează `lastManualAction: "mark_safe"`;
- nu modifică Gmail;
- după acțiune, `GET /api/v1/emails/:id` trebuie să întoarcă:
  - `effectiveVerdict: "safe"`;
  - `verdictSource: "user"`;
  - `reviewStatus: "reviewed"`;
  - `riskBucket: "reviewed_safe"`.

### `POST /api/v1/actions/emails/:id/mark-phishing`

Ce verifici:

- setează `userVerdict: "phishing"`;
- setează `reviewedAt`;
- setează `lastManualAction: "mark_phishing"`;
- încearcă mutarea mesajului Gmail în Spam;
- răspunsul include `providerAction`;
- dacă Gmail eșuează, verdictul local rămâne salvat.

După acțiune, `GET /api/v1/emails/:id` trebuie să întoarcă:

- `effectiveVerdict: "phishing"`;
- `verdictSource: "user"`;
- `reviewStatus: "reviewed"`;
- `riskBucket: "confirmed_phishing"`;
- `lastProviderActionStatus: "success"` sau `"failed"`.

Verificare în Gmail:

- caută mesajul în folderul Spam;
- dacă nu apare, verifică `providerAction.errorCode`.

## 9. Reports

### `GET /api/v1/reports/monthly-summary`

Ce verifici:

- fără query folosește luna curentă UTC;
- cu `month=YYYY-MM` folosește luna cerută;
- răspunsul include:
  - `counts.syncedEmails`;
  - `counts.scannedEmails`;
  - `counts.safe`;
  - `counts.suspicious`;
  - `counts.likelyPhishing`;
  - `counts.reviewed`;
  - `counts.markedSafe`;
  - `counts.markedPhishing`;
  - `counts.quarantined`;
  - `topTriggeredRules`;
  - `ai`.

Teste de eroare:

```text
GET /api/v1/reports/monthly-summary?month=2026-13
GET /api/v1/reports/monthly-summary?month=abc
```

### `POST /api/v1/reports/monthly-summary/send`

Ce verifici:

- cu `EMAIL_FROM` și `EMAIL_PASSWORD` configurate, trimite emailul;
- fără configurare, răspunde controlat cu `sent: false`;
- nu pornește scheduler sau trimitere automată.

## 10. Meta

### `GET /api/v1/meta/status`

Ce verifici:

- întoarce sumarul pentru utilizatorul autentificat;
- include număr de conturi conectate, emailuri, scanări și flag-uri utile pentru UI/debug;
- este protejat cu Bearer token.

## 11. Teste de eroare obligatorii

Aceste teste verifică dacă backend-ul refuză corect request-urile greșite.

- fără `Authorization` pe endpoint protejat: trebuie `401`;
- token invalid: trebuie `401`;
- token expirat: trebuie `401`;
- id invalid MongoDB: trebuie `400`;
- resursă inexistentă: trebuie `404`;
- acces la emailul altui utilizator: trebuie `404` sau refuz echivalent, nu datele emailului;
- body invalid la register/login/update: trebuie `400`;
- duplicate register cu același email: trebuie `409`;
- `/api/v1/lists`: trebuie `404`, pentru că lists au fost scoase din MVP.

## Tipuri de teste recomandate

### 1. Smoke tests

Smoke test înseamnă verificarea rapidă că aplicația pornește și endpoint-urile principale răspund. Pentru proiectul acesta:

- `GET /health`;
- `POST /auth/login`;
- `GET /users/me`;
- `GET /mail-accounts`;
- `GET /emails`.

Acestea se rulează des, mai ales înainte și după modificări.

### 2. Teste manuale cap-coadă

Acestea verifică fluxul real de produs:

```text
register -> login -> connect Gmail -> sync -> scan automat -> list emails -> email details -> mark-phishing -> Gmail Spam -> report
```

Sunt cele mai importante înainte de frontend, pentru că frontend-ul va consuma exact aceste contracte.

### 3. Teste de validare

Testează input greșit:

- email invalid;
- parolă lipsă;
- `syncMaxResults` în afara intervalului;
- `month` invalid;
- `aiEnabled` diferit de `0` sau `1`.

Scopul este să vezi dacă backend-ul întoarce erori clare, nu crash.

### 4. Teste de autorizare

Testează cine are voie să acceseze ce:

- fără token;
- token invalid;
- user normal pe rută de admin;
- user A încearcă să acceseze emailul userului B.

Aceste teste sunt importante pentru că aplicația stochează emailuri, deci date sensibile.

### 5. Teste de integrare externă

Acestea ating servicii reale:

- Gmail OAuth;
- Gmail sync;
- Gmail move to spam;
- Ollama local;
- trimitere digest cu email.

Sunt mai lente și pot eșua din motive externe, dar trebuie rulate înainte de demo.

### 6. Teste automate recomandate după stabilizarea backend-ului

După ce testele manuale trec, merită adăugate teste automate pentru logica internă, nu neapărat pentru Gmail real.

Prioritate recomandată:

1. unit tests pentru `email-state.service.js`;
2. unit tests pentru maparea scor -> verdict și regulile din `scan.service.js`;
3. unit tests pentru validări Joi;
4. integration tests pentru auth cu DB de test;
5. integration tests pentru emails/scans cu Gmail mock-uit.

Unit test înseamnă test pe o funcție mică izolată. Integration test înseamnă test pe mai multe piese împreună, de exemplu route + service + DB.

Pentru MVP, testele manuale sunt suficiente ca să trecem la frontend. Testele automate devin importante când contractele API s-au stabilizat și nu vrem să stricăm ceva fără să observăm.

## Verdict de testare pentru trecerea la frontend

Putem trece la frontend când sunt adevărate toate:

- auth funcționează;
- Gmail se conectează cu scope `gmail.modify`;
- sync-ul aduce emailuri și declanșează scanarea;
- `GET /emails` întoarce starea finală pentru UI;
- `mark-safe` și `mark-phishing` schimbă corect starea emailului;
- `mark-phishing` încearcă mutarea în Spam și raportează clar succes/eșec;
- AI on/off are fallback controlat;
- raportul lunar răspunde corect;
- endpoint-urile protejate refuză request-uri fără token.
