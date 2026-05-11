# PROGRESS

## Scop

Acest fișier arată clar unde a rămas proiectul în acest moment. El trebuie citit înainte de lucru dacă vrem să știm rapid starea curentă fără să parcurgem tot `TODO.md`.

## Reguli de actualizare

- Se actualizează după fiecare pas important finalizat.
- Se schimbă `Faza curentă` când trecem la alt milestone.
- Se completează `Următorul pas imediat` după fiecare sesiune de lucru.
- Dacă apare un blocaj, se notează la `Blocaje`.

## Snapshot curent

- Data ultimei actualizări: `2026-05-11`
- Faza curentă: `Faza 13 - testare manuală și pregătire de frontend`
- Status general: `auth-ul MVP este stabil, Gmail sync rulează scanarea automat, scorarea hibridă este activă fără allowlist/blocklist, explicațiile AI sunt structurate pentru frontend cu fallback controlat, persistența scanării curente este protejată prin upsert atomic + index unic, endpoint-urile de email expun starea finală derivată pentru UI cu riskBucket și afișează `aiExplanation` când există, mark-phishing salvează verdictul local și apoi încearcă mutarea mesajului în Gmail Spam, digestul lunar poate fi trimis manual pe emailul utilizatorului autentificat, checklist-ul de testare manuală pentru backend a fost rulat cu succes, iar backend-ul este izolat în `backend/``
- Progres estimativ MVP: `97%`

## Notă sesiune 2026-04-24

- Data: `2026-04-24`
- Ce s-a finalizat: integrarea finală a routerelor `emails`, `lists` și `meta` în `app.js`, toate sub `/api/v1`
- Următorul pas imediat: implementarea acțiunilor din Faza 9 (`mark safe`, `block sender local`) peste datele și scanările deja disponibile

## Notă sesiune 2026-04-27

- Data: `2026-04-27`
- Ce s-a clarificat: verificarea repo-ului a confirmat că `lists` nu sunt doar CRUD, ci sunt deja folosite în scorare pentru `sender email` și `sender domain`, iar `meta/status` returnează sumar util per utilizator (`mailAccounts`, `emails`, `scans`, `hasGmailConnected`, `aiSemanticEnabled`)
- Ce s-a aliniat: documentația `TODO/PROGRESS` a fost actualizată ca să reflecte mai fidel starea reală din cod
- Următorul pas imediat: implementarea acțiunilor manuale din Faza 9, în special `mark safe`, `block sender local` și apoi `allow sender/domain`

## Notă sesiune 2026-04-27 - acțiuni manuale

- Data: `2026-04-27`
- Ce s-a finalizat: layer-ul de acțiuni manuale pe email este implementat și local-only, cu validare de ownership, idempotent unde are sens și cu persistarea minimă pentru review (`userVerdict`, `reviewedAt`, `lastManualAction`)
- Ce s-a păstrat: `mark safe` și `mark phishing` actualizează doar review-ul, iar `allow/block sender/domain` scriu doar în lists locale
- Următorul pas imediat: test manual pe rutele `POST /api/v1/actions/emails/:id/*` și apoi decizia dacă `move to spam/junk` merită pentru Gmail MVP

## Notă sesiune 2026-04-27 - settings și protecție rescan

- Data: `2026-04-27`
- Ce s-a finalizat: a fost aliniată documentația pentru setarea `syncMaxResults` și pentru regula prin care emailurile cu `userVerdict` sunt sărite din rescanarea automată la sync
- Ce s-a păstrat: flow-ul existent `sync -> scan` rămâne intact, fără bulk-rescan pentru emailuri istorice revizuite
- Următorul pas imediat: validarea manuală a endpoint-ului `PATCH /api/v1/mail-accounts/:id/settings` împreună cu un sync pe un cont Gmail deja folosit

## Notă sesiune 2026-04-27 - verificare integrare

- Data: `2026-04-27`
- Ce s-a verificat: acțiunile manuale sunt montate sub `/api/v1/actions`, setarea `syncMaxResults` este expusă prin `PATCH /api/v1/mail-accounts/:id/settings`, iar protecția de auto-rescan pentru emailurile cu `userVerdict` este implementată în pipeline-ul de sync
- Ce lipsește încă: endpoint-urile `GET /api/v1/emails` și `GET /api/v1/emails/:id` nu întorc încă starea derivată necesară pentru UI (`userVerdict`, `reviewStatus`, `effectiveVerdict`, `isQuarantined`, `listMembership`)
- Următorul pas imediat: extinderea răspunsurilor din `email.service.js` pentru a expune starea finală și apartenența la liste

## Notă sesiune 2026-04-28 - contract stare email

- Data: `2026-04-28`
- Ce s-a finalizat: endpoint-urile `GET /api/v1/emails` și `GET /api/v1/emails/:id` întorc acum câmpurile de review manual, verdictul efectiv, sursa verdictului, statusul de review, starea de carantină și `listMembership`
- Ce s-a păstrat: starea finală este derivată la citire din `userVerdict`, `latestScan` și allowlist/blocklist, fără acțiuni reale în Gmail și fără refactor în `src/`
- Următorul pas imediat: test manual pe emailuri `safe`, `suspicious`, `likely_phishing`, `mark-safe`, `mark-phishing` și allow/block sender/domain

## Notă sesiune 2026-04-28 - raport lunar phishing

- Data: `2026-04-28`
- Ce s-a finalizat: a fost implementat endpoint-ul protejat `GET /api/v1/reports/monthly-summary`, cu sumar pe utilizator autentificat, perioadă implicită pe luna curentă, suport `month=YYYY-MM`, contoare de sync/scan/review, reguli declanșate frecvent, blocklist recentă și statusuri AI
- Ce s-a păstrat: endpoint-ul este doar de date; nu introduce job programat, nu trimite email și nu schimbă flow-ul Gmail existent
- Următorul pas imediat: test manual cu token real pentru luna curentă și pentru o lună explicită, apoi continuarea deciziei despre `move to spam/junk`

## Notă sesiune 2026-04-28 - Gmail move-to-spam manual

- Data: `2026-04-28`
- Ce s-a finalizat: `mark-phishing` păstrează review-ul local, adaugă expeditorul în blocklist local și apoi încearcă mutarea mesajului Gmail în Spam cu `users.messages.modify`
- Ce s-a păstrat: scanările automate `likely_phishing` nu mută emailuri în Spam, iar `mark-safe` rămâne local-only și nu modifică Gmail sau listele locale
- Detaliu important: scope-ul Gmail a fost schimbat la `gmail.modify`, deci conturile Gmail conectate anterior trebuie reconectate
- Următorul pas imediat: test manual `reconnect Gmail -> sync -> mark-phishing -> verificare mesaj în Spam`

## Notă sesiune 2026-04-28 - digest lunar manual pe email

- Data: `2026-04-28`
- Ce s-a finalizat: a fost implementat endpoint-ul protejat `POST /api/v1/reports/monthly-summary/send`, care reutilizează serviciul de sumar lunar și trimite un template HTML în română către emailul utilizatorului autentificat
- Ce s-a păstrat: trimiterea este manuală, fără scheduler/cron, iar welcome email-ul din auth nu a fost reactivat
- Config necesar: `EMAIL_FROM` și `EMAIL_PASSWORD` în `backend/.env.development.local` sau în fișierul de env al mediului curent
- Următorul pas imediat: test manual cu un cont local care are email valid și cu credentiale Gmail/app password configurate

## Notă sesiune 2026-04-28 - aliniere documentație backend nou

- Data: `2026-04-28`
- Ce s-a finalizat: documentația a fost aliniată cu backend-ul curent pentru starea emailurilor, acțiunea Gmail `mark-phishing`, sumarul lunar, digestul lunar manual, pragurile reale de scor și variabilele de mediu relevante
- Limitări notate explicit: acțiunea Gmail write apare doar după `mark-phishing` manual, filtrele Gmail nu sunt implementate, iar digestul lunar este manual dacă nu se adaugă separat o automatizare
- Următorul pas imediat: test manual cap-coadă `reconnect Gmail -> sync -> mark-phishing -> verificare Spam`, apoi test `POST /api/v1/reports/monthly-summary/send?month=YYYY-MM` cu `EMAIL_FROM` și `EMAIL_PASSWORD`

## Notă sesiune 2026-04-28 - ordine acțiuni manuale și semantică finală email

- Data: `2026-04-28`
- Ce s-a finalizat: `mark-phishing` salvează local `userVerdict: phishing` înainte de blocklist și înainte de acțiunea Gmail, iar eșecul blocklist este întors explicit prin `listEntry.status: failed` fără să anuleze review-ul local
- Ce s-a aliniat: starea finală a emailului separă acum verdictul algoritmic (`safe`, `suspicious`, `likely_phishing`) de verdictul manual (`safe`, `phishing`), iar `effectiveVerdict`, `isQuarantined` și `riskBucket` urmează regulile finale documentate în `API_PLAN.md`
- Următorul pas imediat: test manual pentru `mark-phishing` cu sender normal, `mark-phishing` cu eșec de blocklist, `mark-safe` și verificarea câmpurilor de stare după fiecare acțiune

## Notă sesiune 2026-04-28 - filtre email după starea finală

- Data: `2026-04-28`
- Ce s-a finalizat: `GET /api/v1/emails` filtrează acum `verdict` după `effectiveVerdict`, nu după `latestScan.verdict`, și acceptă `phishing` pentru emailurile marcate manual
- Ce s-a adăugat: query-ul opțional `riskBucket` permite listarea directă a grupurilor UI (`needs_review`, `quarantine`, `confirmed_phishing`, `reviewed_safe`, `safe`, `unscanned`), iar `pagination.total` se calculează după aceleași filtre
- Următorul pas imediat: test manual cu token real pentru filtrele `verdict=safe`, `verdict=likely_phishing`, `verdict=phishing`, `riskBucket=needs_review`, `riskBucket=quarantine` și `riskBucket=confirmed_phishing`

## Notă sesiune 2026-04-28 - scanare curentă sigură la concurență

- Data: `2026-04-28`
- Ce s-a finalizat: modelul `Scan` are acum index unic `userId + emailId`, iar salvarea scanării curente folosește `findOneAndUpdate` atomic cu `upsert: true`, deci două scanări concurente pentru același email nu mai pot crea documente duplicate când indexul există
- Ce s-a păstrat: verdicturile (`safe`, `suspicious`, `likely_phishing`), logica de scorare, câmpurile AI și modelul MVP cu o singură scanare curentă per email
- Migrare locală: dacă există duplicate vechi în `scans`, trebuie rulat din `backend/` `npm run cleanup:duplicate-scans` înainte ca MongoDB să poată construi indexul unic
- Impact raport lunar: duplicatele vechi puteau umfla `scannedEmails`, verdicturile, regulile frecvente și statusurile AI; cu o scanare curentă per email, sumarul lunar nu mai dublează același email din cauza concurenței
- Următorul pas imediat: test manual de concurență cu două request-uri simultane către `POST /api/v1/scans/emails/:emailId`, apoi verificare că există un singur document `Scan` pentru perechea `userId + emailId`

## Notă sesiune 2026-05-02 - eliminare lists din MVP

- Data: `2026-05-02`
- Ce s-a finalizat: allowlist/blocklist au fost scoase din MVP ca endpoint-uri publice, acțiuni manuale, influență în scoring și câmpuri expuse în răspunsurile emailurilor
- Ce s-a păstrat: flow-ul Gmail OAuth/sync, scanarea de bază pe reguli + AI semantic și acțiunea Gmail `move to spam` după `mark-phishing` manual
- Următorul pas imediat: test manual pentru `mark-safe`, `mark-phishing`, răspunsurile `GET /api/v1/emails` fără `listMembership` și verificarea că `/api/v1/lists` întoarce 404

## Notă sesiune 2026-05-02 - explainability AI structurată

- Data: `2026-05-02`
- Ce s-a finalizat: scanarea folosește setarea `User.settings.aiEnabled`, endpoint-ul `PATCH /api/v1/users/me/ai-settings` poate porni/opri AI per utilizator, iar `aiExplanation` este salvat ca obiect simplu pentru frontend, cu `summary` ca unic text de explicație
- Ce s-a păstrat: LLM-ul nu decide verdictul, nu schimbă scorul și primește pentru explicația finală doar verdictul, scorurile, regulile declanșate și semnalele AI deja calculate; outputul este un `summary` în 1-3 fraze scurte cu recomandare inclusă
- Fallback: dacă AI este oprit, Ollama nu este apelat și `aiExplanationMeta.fallbackReason` devine `ai_disabled`; dacă Ollama eșuează sau întoarce output invalid, backend-ul folosește explicația controlată
- Regula de rescanare: oprirea AI nu forțează rescanări, dar când AI este pornit o scanare curentă făcută fără AI sau fără explicație Ollama poate fi refăcută într-un flow eligibil
- Următorul pas imediat: test manual cu `aiEnabled=0`, scanare, apoi `aiEnabled=1`, rescanare manuală sau sync eligibil și verificare `aiExplanationMeta`

## Notă sesiune 2026-05-02 - checklist teste manuale backend

- Data: `2026-05-02`
- Ce s-a finalizat: a fost adăugat `docs/MANUAL_TESTS.md`, cu lista endpoint-urilor care trebuie testate manual, ordinea recomandată de testare, cazurile de eroare și tipurile de teste utile pentru proiect
- Ce s-a corectat: `docs/TODO.md` nu mai listează `block sender local` și `allow sender/domain` ca taskuri critice pentru MVP, deoarece allowlist/blocklist au fost scoase din MVP și rămân opționale după MVP
- Următorul pas imediat: rularea checklist-ului din `docs/MANUAL_TESTS.md`, în special flow-ul `register -> login -> connect Gmail -> sync -> scan automat -> mark-phishing -> verificare Gmail Spam`

## Notă sesiune 2026-05-02 - reorganizare în `src/`

- Data: `2026-05-02`
- Ce s-a finalizat: codul runtime al backend-ului a fost mutat în `src/`, inclusiv `app.js`, `server.js`, `config`, `database`, `common`, `middlewares`, `models`, `controllers`, `services`, `routes` și `validations`
- Notă ulterioară: în sesiunea 2026-05-11, acest `src/` a fost mutat sub `backend/src/`, împreună cu `manual-tests/`, `scripts/`, `extras/` și fișierele de package.
- Ce s-a aliniat atunci: scripturile `start` și `dev` porneau `src/server.js`, scripturile utilitare importau din `src/`, iar `manual-tests` era servit corect.
- Verificare făcută atunci: `npm run lint` trecea, iar importul aplicației prin `src/app.js` funcționa.
- Următorul pas imediat: rularea testelor manuale cap-coadă după noua structură, ca să confirmăm că nu s-a stricat flow-ul real cu MongoDB și Gmail

## Notă sesiune 2026-05-11 - testare backend și explicații AI expuse corect

- Data: `2026-05-11`
- Ce s-a finalizat: endpoint-urile backend au fost testate manual și funcționează, iar răspunsurile `GET /api/v1/emails` și `GET /api/v1/emails/:id` afișează acum corect `aiExplanation` și `aiExplanationMeta` atunci când scanarea le-a generat.
- Ce s-a clarificat: `aiExplanationMeta.status: generated`, `source: ollama`, `fallbackUsed: false` înseamnă că explicația a fost generată de Ollama, nu de fallback-ul controlat din backend; `hostFallbackUsed` se referă doar la fallback-ul de host local (`localhost` / `127.0.0.1`).
- Ce s-a păstrat: scanarea manuală forțează rescanarea, iar scanarea automată din sync poate sări emailurile deja scanate cu motorul curent și setarea AI curentă.
- Următorul pas imediat: construirea frontend-ului minim pentru demonstrație peste API-ul backend stabil.

## Notă sesiune 2026-05-11 - structură `backend/`

- Data: `2026-05-11`
- Ce s-a finalizat: fișierele backend au fost mutate în `backend/`: `src/`, `package.json`, `package-lock.json`, `scripts/`, `manual-tests/`, `postman/`, `.postman/`, `extras/`, `eslint.config.js` și fișierele `.env.*.local`.
- Ce s-a păstrat: documentația proiectului rămâne în `docs/`, iar endpoint-urile API nu s-au schimbat.
- Următorul pas imediat: verifică backend-ul din nou din `backend/`, apoi construiește frontend-ul minim peste API-ul existent.

## Notă sesiune 2026-05-11 - README profesional

- Data: `2026-05-11`
- Ce s-a finalizat: `README.md` a fost rescris ca prezentare profesională pentru recrutori, cu descrierea proiectului, statusul real, stack-ul, arhitectura, setup local, endpoint-uri principale, limitări și ce rămâne de făcut.
- Ce s-a păstrat: nu s-au schimbat endpoint-uri, cod runtime sau flow-uri backend.
- Următorul pas imediat: construirea frontend-ului minim pentru demonstrație peste API-ul backend existent.

## Ce este gata

- documentul principal de context;
- planul de implementare;
- arhitectura backend recomandată;
- planul API;
- checklist-ul de teste manuale backend;
- documentul regulilor de phishing;
- notele de învățare;
- registrul de decizii;
- roadmap-ul proiectului;
- server Express inițial;
- separare `app.js` de `server.js`;
- backend izolat în `backend/`, cu runtime-ul în `backend/src/`;
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
- mutarea integrărilor opționale `Arcjet` și welcome email în `backend/extras/`.
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
- endpoint `GET /api/v1/emails`;
- endpoint `GET /api/v1/emails/:id`;
- endpoint `GET /api/v1/emails/:id/raw`;
- endpoint `GET /api/v1/meta/status`;
- reguli euristice inițiale (`replyTo mismatch`, shorteners, link patterns, attachments, many links);
- mapare scor -> verdict (`safe`, `suspicious`, `likely_phishing`);
- helper dedicat pentru input AI pe text complet (`subject + textBody`, cu fallback).
- test manual reușit pentru `scan` și `latest`, inclusiv declanșare de reguli pe emailuri de test cu linkuri și arhive.
- flow unificat `sync -> scan` fără pas manual obligatoriu după sync;
- scanare automată după sync pentru emailuri noi;
- pentru emailuri `updated`, rescanare doar dacă lipsește scanarea curentă sau diferă `engineVersion`;
- scanare cu `upsert` pentru rezultat curent per email (fără creare repetată de istorice inutile);
- scanarea curentă este protejată la concurență prin index unic `userId + emailId` și upsert atomic;
- scriptul `npm run cleanup:duplicate-scans` rulat din `backend/` curăță duplicatele vechi înainte de construirea indexului unic în development;
- răspunsul de sync include acum sumar de scanare (`scanSummary`).
- erorile de sync sunt logate clar în backend și sunt întoarse controlat în `syncErrors`, cu limită pentru a evita răspunsuri foarte mari.
- integrare Ollama local în flow-ul de scanare, fără a schimba verdictul principal pe reguli;
- semnale AI semantice salvate în `aiSignals` (`urgencyLevel`, `sensitiveDataRequest`, `loginOrActionRequest`, `socialEngineeringLevel`, `brandImpersonationSuspected`);
- metadata de performanță AI salvată în scan (`status`, `model`, `promptVersion`, `latencyMs`, `evaluatedAt`);
- prompt semantic în engleză cu output JSON strict;
- explicație finală scurtă în română, salvată în `aiExplanation.summary`, în 1-3 fraze cu recomandare inclusă și metadata în `aiExplanationMeta`;
- fallback sigur dacă AI este dezactivat sau Ollama nu răspunde (`status: disabled/failed` în `aiSignals`).
- fallback de conectare Ollama pe host local (`127.0.0.1` / `localhost`) pentru a evita erori de rezoluție locală;
- clasificare mai clară a erorilor AI (`ollama_unreachable`, `ollama_timeout`, `ollama_invalid_output`) cu detalii de diagnostic.
- payload-ul trimis la Ollama a fost redus (body trunchiat + număr limitat de linkuri) pentru a scădea latența și a evita timeout-uri pe emailuri mari.
- tuning suplimentar pentru latență AI locală: input semantic mai scurt și limită de generare (`num_predict`) pentru răspuns JSON rapid.
- scor hibrid activ: `ruleScore + aiScore` (AI bonus limitat), iar verdictul folosește `finalScore`;
- `summary` din semnalele AI este cerut acum în română.
- modelul `qwen2.5:3b` s-a dovedit mai stabil decât `gemma3:4b` în testele locale inițiale pentru output semantic JSON și latență.
- explainability-ul în română folosește acum formulări mai naturale pentru verdict, nu etichete brute precum `suspicious` sau `likely_phishing`.
- scoring-ul MVP rulează fără allowlist/blocklist;
- endpoint `GET /api/v1/meta/status` întoarce un sumar per utilizator: număr de conturi conectate, emailuri, scanări și flag-uri utile pentru UI/debug;
- endpoint `GET /api/v1/reports/monthly-summary` întoarce sumarul lunar de phishing pentru utilizatorul autentificat, cu suport pentru `month=YYYY-MM`;
- endpoint `POST /api/v1/reports/monthly-summary/send` trimite manual digestul lunar pe emailul utilizatorului autentificat, cu template HTML în română și configurare prin `EMAIL_FROM`/`EMAIL_PASSWORD`;
- endpoint-uri locale pentru acțiuni manuale pe email:
  - `POST /api/v1/actions/emails/:id/mark-safe`
  - `POST /api/v1/actions/emails/:id/mark-phishing`
- câmpuri de review local salvate pe email: `userVerdict`, `reviewedAt`, `lastManualAction`;
- câmpuri de tracking pentru ultima acțiune provider-side pe email: `lastProviderAction`, `lastProviderActionStatus`, `lastProviderActionAt`, `lastProviderActionError`;
- `mark-phishing` încearcă mutarea mesajului Gmail în Spam doar după acțiunea explicită a utilizatorului și returnează `providerAction`;
- câmpuri derivate expuse în răspunsurile email: `reviewStatus`, `effectiveVerdict`, `verdictSource`, `isQuarantined`, `riskBucket`;
- filtre pentru `GET /api/v1/emails` bazate pe starea finală expusă UI-ului: `verdict` filtrează după `effectiveVerdict`, iar `riskBucket` filtrează după gruparea finală;
- `mark-phishing` salvează verdictul local înainte de acțiunea Gmail, deci eșecurile externe nu pierd `userVerdict: phishing`;
- setare locală `syncMaxResults` pe `MailAccount`, cu interval valid `1..50` și default `10`;
- emailurile cu `userVerdict` sunt sărite la auto-rescan în flow-ul de sync, indiferent de schimbări de model sau `engineVersion`;
- rutele `auth`, `users`, `mail-accounts`, `emails`, `meta`, `reports`, `scans` și `actions` sunt montate în `app.js` sub prefixul `/api/v1`.

## Ce NU este încă început

- verificări externe de reputație URL/domeniu.
- calibrare fină a punctajelor AI pe seturi mai mari de emailuri.
- filtre Gmail automate pentru emailuri viitoare.
- scheduler/cron pentru digest lunar automat.

## Unde am rămas exact

Ultimul lucru finalizat:

- README-ul a fost rescris pentru prezentare profesională către recrutori, fără schimbări de cod runtime.

Următorul pas imediat recomandat:

- construiește frontend-ul minim pentru demonstrație:
  - register/login și păstrare token;
  - conectare Gmail;
  - sync manual;
  - listare emailuri cu `riskBucket`;
  - detalii email cu `latestScan.aiExplanation`;
  - acțiuni `mark-safe` și `mark-phishing`;
  - sumar lunar.

## Blocaje

Nu există blocaje tehnice majore cunoscute pentru backend.

Rămân de finalizat:

- frontend-ul minim pentru demonstrație;
- documentația de rulare;
- scenariul de demo și capturile pentru prezentare;
- alegerea modelului Ollama final pentru demo, în funcție de latență și stabilitate locală.

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
- verifică setarea per utilizator `settings.aiEnabled` prin `PATCH /api/v1/users/me/ai-settings`;
- compară local modelele după `latencyMs`, consum de RAM, consistența outputului JSON și stabilitatea pe același set de emailuri;
- folosește emailuri de test cu `Reply-To` diferit și text de presiune pentru validarea semnalelor AI viitoare;
- treci la frontend-ul minim, pentru că backend-ul MVP este suficient de stabil pentru integrare.
