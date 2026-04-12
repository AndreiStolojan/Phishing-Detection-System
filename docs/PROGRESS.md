# PROGRESS

## Scop

Acest fișier arată clar unde a rămas proiectul în acest moment. El trebuie citit înainte de lucru dacă vrem să știm rapid starea curentă fără să parcurgem tot `TODO.md`.

## Reguli de actualizare

- Se actualizează după fiecare pas important finalizat.
- Se schimbă `Faza curentă` când trecem la alt milestone.
- Se completează `Următorul pas imediat` după fiecare sesiune de lucru.
- Dacă apare un blocaj, se notează la `Blocaje`.

## Snapshot curent

- Data ultimei actualizări: `2026-04-11`
- Faza curentă: `Faza 8 - Motor de scanare pe reguli implementat (iterația 3, cu AI semantic local)`
- Status general: `auth-ul MVP este stabil, Gmail sync rulează scanarea automat, iar scanarea salvează acum și semnale AI semantice locale + explainability controlată`
- Progres estimativ MVP: `78%`

## Ce este gata

- documentul principal de context;
- planul de implementare;
- arhitectura backend recomandată;
- planul API;
- documentul regulilor de phishing;
- notele de învățare;
- registrul de decizii;
- roadmap-ul proiectului;
- server Express inițial;
- separare `app.js` de `server.js`;
- încărcare config din `dotenv`;
- conexiune MongoDB de bază;
- model `User` cu `passwordHash` și `role`;
- endpoint-uri funcționale pentru `register`, `login`, `logout`;
- middleware de auth și de erori;
- middleware minim pentru roluri;
- middleware de validare Joi pentru `register/login`;
- logică mutată din `controllers` în `services` pentru `auth` și `users`;
- endpoint `GET /api/v1/users/me`;
- endpoint `GET /api/v1/health`;
- restricționare endpoint-uri users pentru admin;
- UI temporar de test pentru auth;
- test manual reușit pentru `register`, `login`, `users/me` și persistență la refresh.
- strategie clară pentru auth MVP: `Bearer token` în header-ul `Authorization`;
- răspunsuri de eroare mai uniforme în middleware-uri și auth;
- script de bootstrap pentru primul admin;
- mutarea integrărilor opționale `Arcjet` și welcome email în `extras/`.
- model `MailAccount` pentru Gmail;
- endpoint `GET /api/v1/mail-accounts/google/start`;
- endpoint `GET /api/v1/mail-accounts/google/callback`;
- endpoint `GET /api/v1/mail-accounts`;
- endpoint `DELETE /api/v1/mail-accounts/:id`;
- salvarea conexiunii Gmail în MongoDB după callback-ul Google.
- test manual reușit pentru conectarea unui cont Gmail din lista de test users Google.
- model `Email` pentru emailurile sincronizate;
- endpoint `POST /api/v1/mail-accounts/:id/sync`;
- sync Gmail manual pentru ultimele emailuri din inbox;
- prevenire duplicate prin index `userId + providerMessageId`;
- actualizare `lastSyncedAt` după fiecare sync;
- refresh automat pentru `accessToken` la răspuns `401` de la Gmail API.
- test manual reușit pentru fluxul API complet: `register -> login -> connect Gmail -> sync manual`.
- fetch Gmail message details în `format=full` pentru parsare;
- parser dedicat pentru emailuri, separat de serviciul de sync;
- extracție `replyTo`, `displayName`, `senderDomain`, `replyToDomain`;
- extracție `textBody` și `htmlBody`;
- extracție și analiză linkuri: `links`, `linkDomains`, `linkCount`, `hasShortenedUrl`, `suspiciousLinkPatterns`;
- extracție extensii de atașamente: `attachmentExtensions`.
- model `Scan` cu suport pentru verdict, reasons și `triggeredRules`;
- endpoint `POST /api/v1/scans/emails/:emailId` pentru scan manual;
- endpoint `GET /api/v1/scans/emails/:emailId/latest` pentru ultima scanare;
- reguli euristice inițiale (`replyTo mismatch`, shorteners, link patterns, attachments, many links);
- mapare scor -> verdict (`safe`, `suspicious`, `likely_phishing`);
- helper dedicat pentru input AI pe text complet (`subject + textBody`, cu fallback).
- test manual reușit pentru `scan` și `latest`, inclusiv declanșare de reguli pe emailuri de test cu linkuri și arhive.
- flow unificat `sync -> scan` fără pas manual obligatoriu după sync;
- scanare automată după sync pentru emailuri noi;
- pentru emailuri `updated`, rescanare doar dacă lipsește scanarea curentă sau diferă `engineVersion`;
- scanare cu `upsert` pentru rezultat curent per email (fără creare repetată de istorice inutile);
- răspunsul de sync include acum sumar de scanare (`scanSummary`).
- integrare Ollama local în flow-ul de scanare, fără a schimba verdictul principal pe reguli;
- semnale AI semantice salvate în `aiSignals` (`urgencyLevel`, `sensitiveDataRequest`, `loginOrActionRequest`, `socialEngineeringLevel`, `brandImpersonationSuspected`);
- metadata de performanță AI salvată în scan (`status`, `model`, `promptVersion`, `latencyMs`, `evaluatedAt`);
- prompt semantic în engleză cu output JSON strict;
- explicație finală compusă controlat în backend, în română, salvată în `aiExplanation`;
- fallback sigur dacă AI este dezactivat sau Ollama nu răspunde (`status: disabled/failed` în `aiSignals`).
- fallback de conectare Ollama pe host local (`127.0.0.1` / `localhost`) pentru a evita erori de rezoluție locală;
- clasificare mai clară a erorilor AI (`ollama_unreachable`, `ollama_timeout`, `ollama_invalid_output`) cu detalii de diagnostic.
- payload-ul trimis la Ollama a fost redus (body trunchiat + număr limitat de linkuri) pentru a scădea latența și a evita timeout-uri pe emailuri mari.
- tuning suplimentar pentru latență AI locală: input semantic mai scurt și limită de generare (`num_predict`) pentru răspuns JSON rapid.
- scor hibrid activ: `ruleScore + aiScore` (AI bonus limitat), iar verdictul folosește `finalScore`;
- `summary` din semnalele AI este cerut acum în română.

## Ce NU este încă început

- acțiunile pe email;
- verificări externe de reputație URL/domeniu.
- calibrare fină a punctajelor AI pe seturi mai mari de emailuri.

## Unde am rămas exact

Ultimul lucru finalizat:

- activare scor hibrid reguli + semnale AI, cu trasabilitate separată (`ruleScore`, `aiScore`).

Următorul pas imediat recomandat:

- calibrare fină a punctajelor AI pe seturi de emailuri de test și endpoint de listare emailuri cu verdictul curent.

## Blocaje

Nu există blocaje tehnice majore, dar există încă un blocaj de organizare:

- documentația descrie un proiect abia neînceput;
- codul existent are deja părți implementate;
- înainte de funcționalități noi, trebuie continuată alinierea structurii, naming-ului și responsabilităților fișierelor;
- încă nu este făcută reorganizarea în `src/` și pe modulele finale.

## Notițe rapide pentru sesiunea următoare

- citește mai întâi `LICENTA.md`;
- verifică `TODO.md`;
- păstrează focusul pe MVP;
- păstrează naming-ul `register/login/logout`;
- păstrează sync-ul manual ca bază pentru validare;
- separă clar ce vine din reguli clasice și ce va veni mai târziu din semnale AI;
- folosește helperul de AI input cu text complet, nu doar `snippet`;
- tratează `scanSummary` din răspunsul de sync ca punct de verificare rapidă pentru flow-ul unificat;
- verifică variabilele de mediu pentru AI local: `AI_SEMANTIC_ENABLED`, `OLLAMA_BASE_URL`, `OLLAMA_MODEL`, `OLLAMA_TIMEOUT_MS`, `OLLAMA_PROMPT_VERSION`;
- compară local modelele după `latencyMs` și consistența outputului JSON;
- folosește emailuri de test cu `Reply-To` diferit și text de presiune pentru validarea semnalelor AI viitoare;
- nu investi încă timp în frontend real, UI-ul actual este doar pentru test temporar.
