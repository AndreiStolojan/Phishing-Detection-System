# API_PLAN

## Scop

Acest document descrie endpoint-urile implementate în acest moment pentru MVP (stare reală din cod), cu prefix unic `/api/v1`.

Pentru checklist-ul practic de verificare manuală a acestor endpoint-uri, vezi `docs/MANUAL_TESTS.md`.

Prefix recomandat pentru API:

`/api/v1`

## Rute montate în `app.js` (stare reală)

- `/api/v1/auth`
- `/api/v1/users`
- `/api/v1/mail-accounts`
- `/api/v1/emails`
- `/api/v1/actions`
- `/api/v1/meta`
- `/api/v1/reports`
- `/api/v1/scans`
- `/api/v1/contact`
- `/api/v1/sender-lists`

## Principii pentru API

- Endpoint-urile trebuie grupate pe module.
- Rutele trebuie să fie clare și previzibile.
- Se evită endpoint-uri foarte generice care fac prea multe lucruri.
- Răspunsurile trebuie să fie simple și ușor de consumat.

## Auth

| Metodă | Rută | Scop | Input principal | Output principal | Auth |
| --- | --- | --- | --- | --- | --- |
| `POST` | `/api/v1/auth/register` | Creează cont nou | `name`, `email`, `password` | user minim + token sau mesaj de succes | Nu |
| `POST` | `/api/v1/auth/login` | Autentifică utilizatorul | `email`, `password` | token JWT + user minim | Nu |

Notă: în MVP nu există endpoint backend pentru logout. Frontend-ul face logout prin ștergerea tokenului JWT din storage local.

## Users

| Metodă | Rută | Scop | Input principal | Output principal | Auth |
| --- | --- | --- | --- | --- | --- |
| `GET` | `/api/v1/users/me` | Profil utilizator | fără body | date profil | Da |
| `PATCH` | `/api/v1/users/me` | Actualizează profilul minim | `name` | utilizator actualizat | Da |
| `PATCH` | `/api/v1/users/me/ai-settings` | Pornește/oprește AI pentru scanările viitoare ale utilizatorului | `aiEnabled: 0 sau 1` | `aiEnabled` boolean | Da |
| `GET` | `/api/v1/users` | Listează utilizatori (admin) | fără body | listă utilizatori | Da (admin) |
| `GET` | `/api/v1/users/:id` | Detalii utilizator (admin) | param `id` | utilizator | Da (admin) |

Contract pentru `PATCH /api/v1/users/me`:

- endpoint-ul este protejat cu Bearer token;
- acceptă doar `name`;
- `name` trebuie să aibă între 2 și 50 de caractere;
- avatarul nu face parte din contractul MVP curent.

Exemplu:

```json
{
  "name": "Andrei"
}
```

Contract pentru `PATCH /api/v1/users/me/ai-settings`:

- acceptă doar `aiEnabled: 0` sau `aiEnabled: 1`;
- salvează intern valoarea ca boolean în `User.settings.aiEnabled`;
- nu rescanează automat emailurile existente când AI este oprit;
- când AI este pornit, scanările viitoare pot completa scanările curente făcute anterior cu AI oprit.

```json
{
  "success": true,
  "data": {
    "aiEnabled": true
  }
}
```

## Mail Accounts

| Metodă | Rută | Scop | Input principal | Output principal | Auth |
| --- | --- | --- | --- | --- | --- |
| `GET` | `/api/v1/mail-accounts/google/start` | Generează URL-ul pentru conectarea Gmail | fără body | `authUrl` | Da |
| `GET` | `/api/v1/mail-accounts/google/callback` | Procesează întoarcerea de la Google | query `code`, `state` | redirect frontend | Nu |
| `GET` | `/api/v1/mail-accounts` | Listează conturile conectate | fără body | listă conturi | Da |
| `PATCH` | `/api/v1/mail-accounts/:id/settings` | Actualizează setările locale ale contului | `syncMaxResults` | cont actualizat | Da |
| `POST` | `/api/v1/mail-accounts/:id/sync` | Rulează sync manual pentru contul conectat și declanșează scanarea automată | param `id` | raport sync (`fetched`, `inserted`, `updated`, `skipped`) + `scanSummary` | Da |
| `DELETE` | `/api/v1/mail-accounts/:id` | Deconectează contul | param `id` | mesaj de succes | Da |

Notă UI curentă:

- Dashboard folosește `GET /api/v1/mail-accounts/google/start` doar când utilizatorul nu are un cont Gmail conectat;
- după conectare, Dashboard folosește `POST /api/v1/mail-accounts/:id/sync` ca acțiune principală `Sincronizează și scanează`;
- Settings folosește `PATCH /api/v1/mail-accounts/:id/settings` pentru `syncMaxResults`;
- Settings folosește `DELETE /api/v1/mail-accounts/:id` pentru deconectarea contului Gmail;
- lista de emailuri poate trimite `mailAccountId` către `GET /api/v1/emails` ca filtru per cont.
- callback-ul Google redirecționează către frontend:
  - succes: `/dashboard?gmail=connected&account=<email>`;
  - eroare: `/dashboard?gmail=error&code=<errorCode>`;
  - baza URL se controlează prin `FRONTEND_APP_URL`, cu fallback local `http://localhost:5173`.

## Emails

| Metodă | Rută | Scop | Input principal | Output principal | Auth |
| --- | --- | --- | --- | --- | --- |
| `GET` | `/api/v1/emails` | Listează emailurile salvate | query pentru filtrare și paginare + `from`/`to` opțional (interval absolut pe `receivedAt`) | listă emailuri | Da |
| `GET` | `/api/v1/emails/stats` | Numără emailurile pe `riskBucket` curent (live, aceeași derivare ca lista) | query `from`/`to` (interval absolut, prioritar) sau `days` (fereastră rulantă pe `receivedAt`) | `{ counts: { safe, needs_review, quarantine, reviewed_safe, confirmed_phishing, unscanned }, total }` | Da |
| `GET` | `/api/v1/emails/trend` | Serii pe zile per `riskBucket` efectiv, pentru graficul de trend din dashboard | query `from`/`to` opțional (implicit: ultimele 30 de zile) | listă `{ date, safe, needs_review, quarantine, confirmed_phishing }` (zero-fill pe fiecare zi din interval) | Da |
| `GET` | `/api/v1/emails/top-risky-senders` | Top domenii din spatele emailurilor riscante (efectiv, review-aware) — cardul „Who is targeting you" | query `from`/`to` opțional (prioritar) sau `days` (implicit 30) | listă `{ domain, total, needsReview, quarantine, confirmedPhishing, lastSeenAt }` | Da |
| `GET` | `/api/v1/emails/:id` | Detalii email | param `id` | email detaliat | Da |
| `GET` | `/api/v1/emails/:id/raw` | Returnează corpul emailului și câmpurile brute utile | param `id` | `textBody`, `htmlBody`, linkuri și metadata | Da |

Notă: `GET /api/v1/emails/stats` întoarce starea CURENTĂ (per `riskBucket`), nu evenimente pe lună. Dashboard-ul și chip-urile din inbox îl folosesc ca sursă unică, deci numerele se potrivesc cu lista și se actualizează după review. Sumarul lunar (`/reports/monthly-summary`) rămâne vederea pe lună (digest).

Parametrii de interval (filtrul global de timp, 2026-06-11): `from` și `to` sunt timestamps ISO 8601 absolute, calculate de frontend în timezone-ul utilizatorului. Trebuie trimiși împreună, `from < to`, altfel `400` cu cod `INVALID_DATE_RANGE`. Intervalul este semi-deschis `[from, to)` și filtrează pe `receivedAt`. Au prioritate peste `days` (păstrat pentru compatibilitate). Dashboard-ul și inbox-ul trimit același `from`/`to` din `TimeRangeContext`, deci lista, chip counts și toate statisticile acoperă mereu aceeași perioadă.

Parametrul `days` (legacy): dacă e prezent și pozitiv (și `from`/`to` lipsesc), numărarea se limitează la emailurile cu `receivedAt` în ultimele N zile (fereastră rulantă).

Notă integritate (`/reports/monthly-summary` și digest zilnic): toate cifrele din pâlnia de detecție derivă dintr-o singură sursă — setul de emailuri sincronizate în fereastră (`Email.createdAt`), cu cel mai recent scan atașat per email. Astfel `scanned ≤ synced` mereu, iar fiecare email contribuie o singură dată (cu cel mai recent verdict). Înainte, `synced` se număra pe `Email.createdAt` iar `scanned` pe `Scan.scannedAt` — un re-scan rescria `scannedAt` la „acum", deci un email vechi re-scanat umfla `scanned` peste `synced` (ex. 60 scanate vs 58 sincronizate).

Contract de răspuns pentru `GET /api/v1/emails` și `GET /api/v1/emails/:id`:

- `GET /api/v1/emails` acceptă filtrele opționale `verdict` și `riskBucket`;
- `verdict` filtrează după `effectiveVerdict`, adică verdictul final pentru UI, nu după `latestScan.verdict`;
- valorile acceptate pentru `verdict` sunt `safe`, `suspicious`, `likely_phishing`, `phishing`;
- `riskBucket` filtrează după gruparea finală folosită de UI;
- valorile acceptate pentru `riskBucket` sunt `safe`, `needs_review`, `quarantine`, `reviewed_safe`, `confirmed_phishing`, `unscanned`;
- `pagination.total` respectă filtrele aplicate, inclusiv `verdict` și `riskBucket`;
- endpoint-urile returnează datele emailului, `latestScan` compact și starea finală derivată pentru UI;
- `GET /api/v1/emails/:id` nu returnează corpul complet al emailului;
- frontend-ul cere corpul complet separat prin `GET /api/v1/emails/:id/raw`;
- câmpurile de review manual sunt `userVerdict`, `reviewedAt`, `lastManualAction`;
- câmpurile derivate sunt `reviewStatus`, `effectiveVerdict`, `verdictSource`, `isQuarantined`, `riskBucket`;
- `userVerdict` poate fi `safe`, `phishing` sau `null`;
- `userVerdict` are prioritate peste verdictul scanării;
- `latestScan.verdict` rămâne verdict algoritmic și poate fi doar `safe`, `suspicious` sau `likely_phishing`;
- `effectiveVerdict` este verdictul final pentru UI/business și poate fi `safe`, `suspicious`, `likely_phishing`, `phishing` sau `null`;
- `reviewStatus` poate fi:
  - `reviewed`: utilizatorul a dat deja un verdict manual;
  - `pending_review`: scanarea spune `suspicious` sau `likely_phishing`, dar utilizatorul nu a confirmat încă;
  - `no_review_needed`: scanarea spune `safe` și nu există review manual;
  - `unscanned`: emailul nu are nici scanare curentă, nici review manual;
- `isQuarantined` este o stare locală derivată, nu o carantină reală în Gmail.
- `riskBucket` este categoria simplă pentru UI/raportare rapidă:
  - `reviewed_safe`: utilizatorul a confirmat manual că emailul este sigur;
  - `confirmed_phishing`: utilizatorul a confirmat manual că emailul este phishing;
  - `quarantine`: scanarea a produs `likely_phishing` și nu există review manual;
  - `needs_review`: scanarea a produs `suspicious` și nu există review manual;
  - `safe`: scanarea a produs `safe` și nu există review manual;
  - `unscanned`: nu există nici review manual, nici scanare.

Reguli exacte pentru starea finală:

| Situație | `effectiveVerdict` | `verdictSource` | `reviewStatus` | `isQuarantined` | `riskBucket` |
| --- | --- | --- | --- | --- | --- |
| `userVerdict: "safe"` | `safe` | `user` | `reviewed` | `false` | `reviewed_safe` |
| `userVerdict: "phishing"` | `phishing` | `user` | `reviewed` | `false` | `confirmed_phishing` |
| fără `userVerdict`, `latestScan.verdict: "likely_phishing"` | `likely_phishing` | `scan` | `pending_review` | `true` | `quarantine` |
| fără `userVerdict`, `latestScan.verdict: "suspicious"` | `suspicious` | `scan` | `pending_review` | `false` | `needs_review` |
| fără `userVerdict`, `latestScan.verdict: "safe"` | `safe` | `scan` | `no_review_needed` | `false` | `safe` |
| fără `userVerdict`, fără `latestScan` | `null` | `null` | `unscanned` | `false` | `unscanned` |

Exemple de filtre:

- `GET /api/v1/emails?verdict=safe`: include emailuri considerate finale sigure, fie prin scanare `safe`, fie prin `userVerdict: "safe"`;
- `GET /api/v1/emails?verdict=likely_phishing`: include emailuri algoritmice `likely_phishing` care nu au fost revizuite manual;
- `GET /api/v1/emails?verdict=phishing`: include emailuri marcate manual `userVerdict: "phishing"`, chiar dacă scanarea inițială era `safe`;
- `GET /api/v1/emails?riskBucket=needs_review`: include emailuri `suspicious` nerevizuite;
- `GET /api/v1/emails?riskBucket=quarantine`: include emailuri `likely_phishing` nerevizuite;
- `GET /api/v1/emails?riskBucket=confirmed_phishing`: include emailuri confirmate manual ca phishing.

```json
{
  "userVerdict": "safe",
  "reviewedAt": "2026-04-28T10:00:00.000Z",
  "lastManualAction": "mark_safe",
  "reviewStatus": "reviewed",
  "effectiveVerdict": "safe",
  "verdictSource": "user",
  "isQuarantined": false,
  "riskBucket": "reviewed_safe"
}
```

## Actions

| Metodă | Rută | Scop | Input principal | Output principal | Auth |
| --- | --- | --- | --- | --- | --- |
| `POST` | `/api/v1/actions/emails/:id/mark-safe` | Marchează emailul ca sigur | param `id` | verdict local `safe`, `reviewedAt`, `lastManualAction` | Da |
| `POST` | `/api/v1/actions/emails/:id/mark-phishing` | Marchează emailul ca phishing și încearcă mutarea mesajului Gmail în Spam | param `id` | verdict local `phishing`, `reviewedAt`, `lastManualAction`, `providerAction` | Da |

Contract relevant pentru `POST /api/v1/actions/emails/:id/mark-phishing`:

- întâi salvează local `userVerdict: "phishing"`;
- apoi încearcă acțiunea provider-side pentru Gmail;
- nu creează intrări locale în liste și nu schimbă scorul prin allowlist/blocklist;
- pentru Gmail, acțiunea provider-side folosește `users.messages.modify` cu `SPAM` adăugat și `INBOX` scos;
- filtre Gmail automate nu sunt implementate. Aplicația nu creează reguli/filtre în contul Gmail.

```json
{
  "providerAction": {
    "type": "gmail_move_to_spam",
    "status": "success"
  }
}
```

Pentru eșec Gmail, `providerAction` include și `errorCode` + `message`, dar verdictul local rămâne salvat.

## Scans

| Metodă | Rută | Scop | Input principal | Output principal | Auth |
| --- | --- | --- | --- | --- | --- |
| `POST` | `/api/v1/scans/emails/:emailId` | Scanează manual un email (update scanarea curentă) | param `emailId` | `score`, `ruleScore`, `aiScore`, verdict, motive + `aiSignals` + `aiExplanation` | Da |
| `GET` | `/api/v1/scans/emails/:emailId/latest` | Scanarea curentă pentru email | param `emailId` | rezultat scan complet (inclusiv scor hibrid și AI) | Da |

Contract de persistență pentru scanări:

- pentru MVP există o singură scanare curentă pentru fiecare pereche `userId + emailId`;
- colecția `scans` folosește index unic pe `userId + emailId`;
- salvarea scanării curente se face prin upsert atomic, nu prin `find` separat urmat de `create`;
- câmpurile păstrate la fiecare scanare sunt `score`, `ruleScore`, `aiScore`, `verdict`, `reasons`, `triggeredRules`, `scanSource`, `engineVersion`, `aiSignals`, `aiExplanation`, `aiExplanationMeta`, `scannedAt`;
- `aiExplanation` este un obiect simplu pentru frontend, cu un singur câmp: `summary`;
- `summary` are 1-3 fraze scurte în română și include o recomandare practică scurtă;
- `aiExplanationMeta` descrie sursa explicației: `generated` de Ollama sau `fallback` controlat în backend;
- dacă `User.settings.aiEnabled` este `false`, scanarea nu apelează Ollama și salvează fallback cu `fallbackReason: "ai_disabled"`;
- dacă `User.settings.aiEnabled` este `true`, backend-ul apelează Ollama pentru semnale semantice și pentru `summary`, dar verdictul și scorul rămân calculate de backend;
- la output invalid, timeout sau Ollama oprit, `aiExplanation` revine la fallback-ul controlat;
- când AI este oprit, o scanare curentă cu `engineVersion` valid rămâne validă chiar dacă nu are explicație AI;
- când AI este pornit, o scanare curentă făcută cu AI oprit sau fără explicație generată de Ollama poate fi refăcută la următorul flow de scanare eligibil;
- dacă există duplicate vechi în development, ele trebuie curățate înainte ca indexul unic să se poată construi; scriptul local se rulează din `backend/` cu `npm run cleanup:duplicate-scans`.

Exemplu `aiExplanation`:

```json
{
  "summary": "Emailul pare suspect deoarece combina mai multe semnale de risc. Nu accesa linkurile si verifica expeditorul printr-un canal sigur."
}
```

## Reports

| Metodă | Rută | Scop | Input principal | Output principal | Auth |
| --- | --- | --- | --- | --- | --- |
| `GET` | `/api/v1/reports/monthly-summary` | Returnează sumarul de phishing pentru utilizatorul autentificat (lună sau interval arbitrar) | query opțional `from`+`to` (+ `label`) sau `month=YYYY-MM` | perioadă, contoare, reguli frecvente, sumar AI | Da |
| `POST` | `/api/v1/reports/monthly-summary/send` | Trimite manual sumarul pe emailul utilizatorului autentificat | query opțional `from`+`to` (+ `label`) sau `month=YYYY-MM` | `sent`, `messageId`, `recipient`, `period`, `generatedAt` | Da |

Suport pentru interval arbitrar (filtrul global de timp, 2026-06-11):

- `from`/`to` (ISO 8601, împreună, `from < to`, altfel `400` `INVALID_DATE_RANGE`) au prioritate peste `month`;
- în modul interval, setul de bază sunt emailurile cu `receivedAt` în `[from, to)` — aceeași ancoră ca inbox-ul și dashboard-ul, deci raportul acoperă exact emailurile pe care utilizatorul le vede pentru intervalul activ; restul logicii (cel mai recent scan per email, split efectiv, top rules, AI) este neschimbată;
- `label` este opțional, doar pentru afișare (max 60 caractere, escaped în HTML): dă titlul/subiectul emailului de raport (ex. „Security report — Yesterday"); fără `label`, emailul afișează datele intervalului formatate în Europe/Bucharest;
- în modul interval, `period` din răspuns este `{ from, to, label }` (fără `month`);
- modul lunar rămâne neschimbat (bazat pe `Email.createdAt`), pentru compatibilitate cu digestul și testele.

Contract de răspuns pentru `GET /api/v1/reports/monthly-summary` (modul lunar):

- fără query, endpoint-ul folosește luna calendaristică UTC curentă;
- cu `month=YYYY-MM`, endpoint-ul folosește luna cerută;
- dacă `month` nu respectă formatul `YYYY-MM`, răspunsul este `400` cu cod `INVALID_REPORT_MONTH`;
- sumarul este calculat doar pentru `req.user`, deci un utilizator nu vede datele altui utilizator;
- `syncedEmails` se bazează pe `Email.createdAt`;
- `scannedEmails`, verdicturile, `topTriggeredRules` și statusurile AI se bazează pe `Scan.scannedAt`;
- pentru că există o singură scanare curentă per email, duplicatele de scanare nu mai trebuie să umfle sumarul lunar; duplicatele vechi trebuie curățate local din `backend/` cu `npm run cleanup:duplicate-scans`;
- `reviewed`, `markedSafe` și `markedPhishing` se bazează pe `Email.reviewedAt`;
- `quarantined` numără emailurile intrate în stare de carantină în luna raportată: scanări `likely_phishing` fără verdict manual peste ele.
- emailurile marcate manual ca phishing sunt raportate separat prin `markedPhishing`; ele au `riskBucket: "confirmed_phishing"`, nu `riskBucket: "quarantine"`.
- carantina din raport este locală: înseamnă că backend-ul consideră emailul `likely_phishing` pe baza scanării și încă așteaptă review manual. Nu înseamnă automat că mesajul a fost mutat în Spam la provider.

Exemplu de răspuns:

```json
{
  "success": true,
  "data": {
    "period": {
      "month": "2026-04",
      "from": "2026-04-01T00:00:00.000Z",
      "to": "2026-05-01T00:00:00.000Z"
    },
    "counts": {
      "syncedEmails": 12,
      "scannedEmails": 12,
      "safe": 7,
      "suspicious": 3,
      "likelyPhishing": 2,
      "reviewed": 2,
      "markedSafe": 1,
      "markedPhishing": 1,
      "quarantined": 2
    },
    "topTriggeredRules": [
      {
        "rule": "link:shortened_url",
        "count": 3,
        "totalPoints": 45
      }
    ],
    "ai": {
      "evaluated": 10,
      "failed": 1,
      "disabled": 1
    },
    "generatedAt": "2026-04-28T12:00:00.000Z"
  }
}
```

Contract de răspuns pentru `POST /api/v1/reports/monthly-summary/send`:

- endpoint-ul este protejat cu Bearer token;
- destinatarul este mereu `req.user.email`, deci utilizatorul nu poate trimite raportul către altă adresă prin body;
- folosește aceleași date ca `GET /api/v1/reports/monthly-summary`;
- fără query, trimite sumarul pentru luna UTC curentă;
- cu `month=YYYY-MM`, trimite sumarul pentru luna cerută;
- trimiterea este manuală, la cerere explicită, fără scheduler sau cron;
- dacă nu a fost implementată separat o automatizare externă, digestul lunar nu se trimite singur;
- senderul se citește din `EMAIL_FROM`, iar parola din `EMAIL_PASSWORD`;
- dacă lipsește configurarea de email, răspunsul este `503`, cu `sent: false` și cod `EMAIL_CONFIG_MISSING`;
- dacă Nodemailer/Gmail refuză trimiterea, răspunsul este `502`, cu `sent: false` și cod `EMAIL_SEND_FAILED`.

Exemplu de răspuns reușit:

```json
{
  "success": true,
  "data": {
    "sent": true,
    "messageId": "<message-id>",
    "recipient": "user@example.com",
    "period": {
      "month": "2026-04",
      "from": "2026-04-01T00:00:00.000Z",
      "to": "2026-05-01T00:00:00.000Z"
    },
    "generatedAt": "2026-04-28T12:00:00.000Z"
  }
}
```

Exemplu de răspuns când lipsește configurarea de email:

```json
{
  "success": false,
  "data": {
    "sent": false,
    "recipient": "user@example.com",
    "period": {
      "month": "2026-04",
      "from": "2026-04-01T00:00:00.000Z",
      "to": "2026-05-01T00:00:00.000Z"
    },
    "generatedAt": "2026-04-28T12:00:00.000Z",
    "error": {
      "code": "EMAIL_CONFIG_MISSING",
      "message": "Configurarea pentru email lipsește: EMAIL_FROM, EMAIL_PASSWORD.",
      "missing": ["EMAIL_FROM", "EMAIL_PASSWORD"]
    }
  }
}
```

## Sender Lists (allowlist / blocklist per utilizator)

| Metodă | Rută | Scop | Input principal | Output principal | Auth |
| --- | --- | --- | --- | --- | --- |
| `GET` | `/api/v1/sender-lists` | Listează intrările utilizatorului (trusted + blocked) | `withMatchCounts=1` opțional | `entries[]` cu `id`, `listType` (`allow`/`block`), `kind` (`sender`/`domain`), `value`, `createdAt`, plus `matchedEmails` când e cerut | Da |
| `POST` | `/api/v1/sender-lists` | Adaugă o intrare; `value` se normalizează (lowercase, fără `www.`) | `listType`, `kind`, `value` (email valid pentru `sender`, domeniu valid pentru `domain`) | `201` + `entry` la creare, `200` + `entry` dacă există deja identic, `409 LIST_CONFLICT` dacă criteriul e pe lista opusă | Da |
| `DELETE` | `/api/v1/sender-lists/:id` | Șterge o intrare proprie | `id` (ObjectId) | `entry` ștearsă sau `404 LIST_ENTRY_NOT_FOUND` | Da |

Note:

- Exclusivitate mutuală: index unic `(userId, kind, value)` — un criteriu nu poate fi simultan pe ambele liste; mutarea cere ștergere + adăugare.
- Conflicte cross-kind interzise (2026-06-10): un sender rule și un domain rule care îl acoperă (suffix-aware) nu pot avea tipuri opuse — `409 LIST_CONFLICT` în ambele direcții, cu mesaj care indică regula existentă. Suprapunerea pe aceeași direcție e permisă.
- Efect în scanare: blocklist ⇒ regulă `user_blocklist_match` (+60, verdict `likely_phishing` garantat); allowlist ⇒ semnalele contextuale sunt reduse la 0/jumătate, semnalele critice rămân întregi. Scanarea persistă `senderListMatch` (`listType`, `kind`, `value`) pe scan și îl expune în `GET /api/v1/scans/emails/:id/latest`.
- Listele se aplică doar la scanările viitoare (rescan manual sau sync), nu retroactiv.

## Contact

| Metodă | Rută | Scop | Input principal | Output principal | Auth |
| --- | --- | --- | --- | --- | --- |
| `POST` | `/api/v1/contact/message` | Trimite un mesaj de contact/suport către adresa configurată pentru aplicație | `message`, `subject` opțional | `sent`, `recipient`, `messageId`, `generatedAt` sau eroare email | Da |

Contract pentru `POST /api/v1/contact/message`:

- endpoint-ul este protejat cu Bearer token;
- `message` este obligatoriu și are limită de `10000` caractere în backend;
- `subject` este opțional și are limită de `120` caractere;
- destinatarul este mereu `EMAIL_FROM`, adică aceeași adresă folosită ca sender pentru emailurile aplicației;
- `replyTo` este emailul utilizatorului autentificat;
- dacă lipsește configurarea de email, răspunsul este `503`, cu `sent: false` și cod `EMAIL_CONFIG_MISSING`;
- dacă Nodemailer/Gmail refuză trimiterea, răspunsul este `502`, cu `sent: false` și cod `EMAIL_SEND_FAILED`.

Exemplu de răspuns reușit:

```json
{
  "success": true,
  "message": "Contact message sent.",
  "data": {
    "sent": true,
    "recipient": "xai@example.com",
    "messageId": "<message-id>",
    "generatedAt": "2026-05-19T12:00:00.000Z"
  }
}
```

Exemplu când lipsește configurarea:

```json
{
  "success": false,
  "message": "Email configuration is missing: EMAIL_FROM, EMAIL_PASSWORD.",
  "data": {
    "sent": false,
    "recipient": null,
    "generatedAt": "2026-05-19T12:00:00.000Z",
    "error": {
      "code": "EMAIL_CONFIG_MISSING",
      "message": "Email configuration is missing: EMAIL_FROM, EMAIL_PASSWORD.",
      "missing": ["EMAIL_FROM", "EMAIL_PASSWORD"]
    }
  }
}
```

## Endpoint-uri utile de suport

| Metodă | Rută | Scop | Input principal | Output principal | Auth |
| --- | --- | --- | --- | --- | --- |
| `GET` | `/api/v1/health` | Verifică dacă serverul rulează | fără body | status simplu | Nu |
| `GET` | `/api/v1/meta/status` | Status aplicație și informații utile | fără body | stare generală | Da |

## Format simplu recomandat pentru răspunsuri

Exemplu pentru răspuns reușit:

```json
{
  "success": true,
  "data": {}
}
```

Exemplu pentru eroare:

```json
{
  "success": false,
  "message": "Mesaj clar de eroare"
}
```

## Observații importante

- Pentru MVP, strategia aleasă este `Bearer token` trimis în header-ul `Authorization`.
- `logout` nu are endpoint backend în MVP; clientul șterge tokenul salvat local.
- Endpoint-ul principal pentru identificarea utilizatorului curent rămâne `GET /api/v1/users/me` (fără `/auth/me`).
- Profilul public al utilizatorului nu include avatar în MVP-ul curent.
- Flow-ul Gmail actual este bazat pe `google/start -> google/callback`.
- Scope-ul Google OAuth folosit acum este `https://www.googleapis.com/auth/gmail.modify`, deoarece aplicația trebuie să poată muta manual un mesaj în Spam prin Gmail API.
- Conturile Gmail conectate înainte de schimbarea de scope trebuie reconectate, altfel Google poate refuza acțiunea provider-side cu eroare de permisiuni insuficiente.
- Pentru sync-ul manual Gmail se folosește `POST /api/v1/mail-accounts/:id/sync`.
- Setarea `syncMaxResults` controlează câte emailuri ia sync-ul din inbox și este limitată la intervalul `1..50`, cu valoare implicită `10`.
- Sync-ul manual Gmail salvează și câmpuri parse-ate utile pentru scanare (`replyTo`, corp text/html, linkuri, domenii, extensii atașamente).
- După sync, scanarea pornește automat în backend:
  - emailurile noi sunt scanate;
  - emailurile actualizate sunt rescannate doar dacă nu există scanare curentă validă sau s-a schimbat `engineVersion`;
  - emailurile cu `userVerdict` sunt omise din rescanarea automată, ca să nu redeschidem mailuri deja revizuite de utilizator.
- Acțiunile locale pe email sunt separate de verdictul algoritmului:
  - `mark-safe` persistă doar review-ul local pe email;
  - `mark-phishing` persistă review-ul local și apoi încearcă mutarea mesajului Gmail în Spam;
  - `mark-safe` nu atinge Gmail;
  - scanarea automată nu mută niciodată în Spam emailurile detectate ca `likely_phishing`; mutarea în Spam apare doar la apel explicit `mark-phishing`.
- Pentru `mark-phishing`, acțiunea Gmail folosește `users.messages.modify` cu `addLabelIds: ["SPAM"]` și `removeLabelIds: ["INBOX"]`, pe baza lui `providerMessageId` și a tokenului contului Gmail care deține emailul.
- Dacă mutarea în Gmail Spam eșuează, acțiunea locală rămâne salvată; răspunsul include `providerAction.status: "failed"` și detalii de eroare.
- Dacă emailul nu este Gmail, acțiunea provider-side este `skipped`; dacă lipsește contul Gmail local sau tokenul, este raportată ca `failed`.
- Modelul `Email` păstrează tracking minim pentru ultima acțiune provider-side: `lastProviderAction`, `lastProviderActionStatus`, `lastProviderActionAt`, `lastProviderActionError`.
- Pentru răspunsurile de email, verdictul final afișat în UI este derivat astfel:
  - `userVerdict` are prioritate peste scanare;
  - `userVerdict: safe` produce `effectiveVerdict: safe` și `verdictSource: user`;
  - `userVerdict: phishing` produce `effectiveVerdict: phishing` și `verdictSource: user`;
  - fără `userVerdict`, `effectiveVerdict` vine din `latestScan.verdict`, cu `verdictSource: scan`;
  - `isQuarantined` este `true` doar pentru `latestScan.verdict: likely_phishing` fără review manual;
  - `riskBucket` separă clar emailurile `confirmed_phishing` de emailurile în `quarantine`.
- Răspunsul de sync include `scanSummary` cu numărul de emailuri scanate, sărite și eșuate la scanare.
- `google/start` este protejat cu JWT-ul aplicației, iar `google/callback` se bazează pe `state`, nu pe header-ul `Authorization`.
- Raportul lunar `GET /api/v1/reports/monthly-summary` este doar un endpoint de date; nu pornește automatizări și nu trimite email.
- Trimiterea raportului lunar se face doar manual prin `POST /api/v1/reports/monthly-summary/send`; nu există cron sau trimitere automată.
- Mesajele din chat/contact se trimit manual prin `POST /api/v1/contact/message` către `EMAIL_FROM`.
- `mail-accounts` trebuie gândit astfel încât să poată primi și alți provideri în viitor, fără a complica MVP-ul acum.
- Gmail filters nu sunt implementate: aplicația poate muta un mesaj individual în Spam după `mark-phishing`, dar nu creează filtre automate în Gmail.
- Endpoint-urile de scanare trebuie să poată returna clar:
  - scorul;
  - verdictul;
  - motivele;
  - regulile declanșate.
- Pentru explainability AI, inputul pregătit trebuie să folosească textul relevant complet (`subject + textBody`, cu fallback), nu doar `snippet`.
- AI semantic este rulat local prin Ollama (`/api/chat`) cu prompt în engleză și output JSON strict doar dacă `User.settings.aiEnabled` este activ.
- `aiSignals` trebuie să includă și metadata de execuție: `status`, `model`, `promptVersion`, `latencyMs`, `evaluatedAt`.
- la eșec AI, `aiSignals` poate include și câmpuri de diagnostic (`endpoint`, `errorDetail`) pentru debugging local.
- pentru stabilitate și latență mai bună, inputul AI este limitat (body trunchiat + subset de linkuri) înainte de request.
- requestul AI folosește răspuns JSON și limită de generare pentru a evita blocaje la inferență locală.
- `summary` din semnalele AI este cerut în română pentru consistență cu explainability-ul afișat utilizatorului.
- `aiExplanation` este obiect structurat pentru frontend; când AI este activ și Ollama răspunde valid, `summary` este generat de Ollama strict din verdict, scoruri, reguli și semnale deja calculate, în 1-3 fraze scurte cu o recomandare inclusă.
- Ollama nu primește corpul emailului pentru explicația finală și nu poate schimba verdictul sau scorul.
- dacă explicația Ollama nu este disponibilă, backend-ul folosește fallback-ul controlat și notează cauza în `aiExplanationMeta`.
- Variabile de mediu recomandate pentru integrarea locală AI:
  - `AI_SEMANTIC_ENABLED`
  - `OLLAMA_BASE_URL`
  - `OLLAMA_MODEL`
  - `OLLAMA_TIMEOUT_MS`
  - `OLLAMA_PROMPT_VERSION`
