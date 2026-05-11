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
| `POST` | `/api/v1/auth/logout` | Închide sesiunea în client | fără body | mesaj de succes | Nu |

## Users

| Metodă | Rută | Scop | Input principal | Output principal | Auth |
| --- | --- | --- | --- | --- | --- |
| `GET` | `/api/v1/users/me` | Profil utilizator | fără body | date profil | Da |
| `PATCH` | `/api/v1/users/me` | Actualizează setări simple | câmpuri editabile | utilizator actualizat | Da |
| `PATCH` | `/api/v1/users/me/ai-settings` | Pornește/oprește AI pentru scanările viitoare ale utilizatorului | `aiEnabled: 0 sau 1` | `aiEnabled` boolean | Da |
| `GET` | `/api/v1/users` | Listează utilizatori (admin) | fără body | listă utilizatori | Da (admin) |
| `GET` | `/api/v1/users/:id` | Detalii utilizator (admin) | param `id` | utilizator | Da (admin) |

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
| `GET` | `/api/v1/mail-accounts/google/callback` | Procesează întoarcerea de la Google | query `code`, `state` | cont conectat | Nu |
| `GET` | `/api/v1/mail-accounts` | Listează conturile conectate | fără body | listă conturi | Da |
| `PATCH` | `/api/v1/mail-accounts/:id/settings` | Actualizează setările locale ale contului | `syncMaxResults` | cont actualizat | Da |
| `POST` | `/api/v1/mail-accounts/:id/sync` | Rulează sync manual pentru contul conectat și declanșează scanarea automată | param `id` | raport sync (`fetched`, `inserted`, `updated`, `skipped`) + `scanSummary` | Da |
| `DELETE` | `/api/v1/mail-accounts/:id` | Deconectează contul | param `id` | mesaj de succes | Da |

## Emails

| Metodă | Rută | Scop | Input principal | Output principal | Auth |
| --- | --- | --- | --- | --- | --- |
| `GET` | `/api/v1/emails` | Listează emailurile salvate | query pentru filtrare și paginare | listă emailuri | Da |
| `GET` | `/api/v1/emails/:id` | Detalii email | param `id` | email detaliat | Da |
| `GET` | `/api/v1/emails/:id/raw` | Returnează varianta brută sau aproape brută | param `id` | conținut email | Da |

Contract de răspuns pentru `GET /api/v1/emails` și `GET /api/v1/emails/:id`:

- `GET /api/v1/emails` acceptă filtrele opționale `verdict` și `riskBucket`;
- `verdict` filtrează după `effectiveVerdict`, adică verdictul final pentru UI, nu după `latestScan.verdict`;
- valorile acceptate pentru `verdict` sunt `safe`, `suspicious`, `likely_phishing`, `phishing`;
- `riskBucket` filtrează după gruparea finală folosită de UI;
- valorile acceptate pentru `riskBucket` sunt `safe`, `needs_review`, `quarantine`, `reviewed_safe`, `confirmed_phishing`, `unscanned`;
- `pagination.total` respectă filtrele aplicate, inclusiv `verdict` și `riskBucket`;
- endpoint-urile returnează datele emailului, `latestScan` compact și starea finală derivată pentru UI;
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
- dacă există duplicate vechi în development, ele trebuie curățate înainte ca indexul unic să se poată construi; scriptul local este `npm run cleanup:duplicate-scans`.

Exemplu `aiExplanation`:

```json
{
  "summary": "Emailul pare suspect deoarece combina mai multe semnale de risc. Nu accesa linkurile si verifica expeditorul printr-un canal sigur."
}
```

## Reports

| Metodă | Rută | Scop | Input principal | Output principal | Auth |
| --- | --- | --- | --- | --- | --- |
| `GET` | `/api/v1/reports/monthly-summary` | Returnează sumarul lunar de phishing pentru utilizatorul autentificat | query opțional `month=YYYY-MM` | perioadă, contoare, reguli frecvente, sumar AI | Da |
| `POST` | `/api/v1/reports/monthly-summary/send` | Trimite manual sumarul lunar pe emailul utilizatorului autentificat | query opțional `month=YYYY-MM` | `sent`, `messageId`, `recipient`, `period`, `generatedAt` | Da |

Contract de răspuns pentru `GET /api/v1/reports/monthly-summary`:

- fără query, endpoint-ul folosește luna calendaristică UTC curentă;
- cu `month=YYYY-MM`, endpoint-ul folosește luna cerută;
- dacă `month` nu respectă formatul `YYYY-MM`, răspunsul este `400` cu cod `INVALID_REPORT_MONTH`;
- sumarul este calculat doar pentru `req.user`, deci un utilizator nu vede datele altui utilizator;
- `syncedEmails` se bazează pe `Email.createdAt`;
- `scannedEmails`, verdicturile, `topTriggeredRules` și statusurile AI se bazează pe `Scan.scannedAt`;
- pentru că există o singură scanare curentă per email, duplicatele de scanare nu mai trebuie să umfle sumarul lunar; duplicatele vechi trebuie curățate local cu `npm run cleanup:duplicate-scans`;
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
- `logout` nu invalidează tokenul pe server, ci doar cere clientului să șteargă tokenul salvat local.
- Endpoint-ul principal pentru identificarea utilizatorului curent rămâne `GET /api/v1/users/me` (fără `/auth/me`).
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
