# EXPLICAȚIE FLUX — SecureInbox (cap-coadă)

> Capitolul **integrativ** al licenței: leagă cele două jumătăți (frontend și backend)
> urmărind fiecare **caz de utilizare** pas cu pas, prin toate straturile —
> **browser → frontend → backend → bază de date → AI** — și înapoi.
>
> Pentru un cititor **începător**: fiecare pas numește **fișierul și adresa (endpoint)
> reale**. Termenii de bază (JWT, OAuth, middleware, service, model, hook, context,
> state) au fost definiți pe larg în `docs/EXPLICATIE_BACKEND.md` și
> `docs/EXPLICATIE_FRONTEND.md` — aici îi folosim și amintim pe scurt unde e nevoie.
> Fiecare caz are la final o notă **„De ce acest design"** — exact ce se apără la susținere.

---

## Hartă rapidă (cine cu cine vorbește)

```
  BROWSER (userul)
     │  click / tastatură
     ▼
  FRONTEND  (React, frontend/src/)
     │  apiClient.js  →  HTTP + token „Bearer"
     ▼
  BACKEND   (Express, backend/src/)
     route → middleware → controller → service → model
     │                                   │        │
     │                                   │        ▼
     │                                   │     MongoDB (documente)
     │                                   ▼
     │                              Ollama (AI local, opțional)
     ▼
  Gmail API (Google) — sincronizare emailuri, mutare în Spam
```

Convenție de adrese: tot API-ul backend e sub `http://localhost:5500/api/v1`. Mai jos scriu
doar partea scurtă, ex. `POST /auth/login`.

---

## Cazul 1 — Înregistrare și autentificare (obținerea „biletului" JWT)

**Scop:** userul își face cont sau se loghează și primește un **token** cu care va dovedi,
la fiecare cerere ulterioară, cine este.

1. **Browser → Frontend.** Pe `LoginPage` (`frontend/src/pages/LoginPage.jsx`) userul
   completează formularul. La înregistrare, pagina verifică **local** puterea parolei (8
   caractere, majusculă, cifră etc.) înainte de a trimite ceva.
2. **Frontend.** La „Sign in", pagina cheamă `login(...)` din `AuthContext`
   (`frontend/src/context/AuthContext.jsx`), care cheamă `authApi.login`
   (`frontend/src/api/authApi.js`), care trece prin `apiClient.post('/auth/login', ...)`.
3. **Frontend → Backend.** Pleacă `POST /auth/login` cu `{ email, password }`.
4. **Backend — rută + middleware.** `auth.routes.js` rulează întâi `arcjetMiddleware`
   (protecție anti-bot / limitare de rată), apoi `validate(loginSchema)` (verifică forma
   datelor), apoi controllerul.
5. **Backend — controller → service.** `auth.controller.js` cheamă `loginUser`
   (`auth.service.js`). Serviciul caută userul după email, compară parola cu **hash-ul** salvat
   (cu `bcrypt` — parola nu e niciodată stocată în clar) și, dacă e corectă, **semnează un JWT**
   (`jwt.sign({ userId }, JWT_SECRET, ...)`).
6. **DB.** Citire din colecția `users` (modelul `user.model.js`).
7. **Backend → Frontend.** Răspunde `{ token, user }`.
8. **Frontend.** `AuthContext` salvează token-ul în `localStorage` (`utils/tokenStorage.js`,
   cheia `secureinbox_token`), pune userul în stare și `isAuthenticated` devine `true`.
   `ProtectedRoute` lasă acum userul în zona logată; navigăm la `/dashboard`.

**De ce acest design:** parola se verifică o singură dată; pe urmă circulă doar un **token
semnat** pe care serverul îl poate verifica fără a ține o „sesiune" în memorie (backend *fără
stare* = mai simplu de explicat și de scalat). Înregistrarea folosește un singur `User.create()`
(fără tranzacție), ca să meargă și pe un MongoDB standalone.

---

## Cazul 2 — Conectarea contului Gmail (OAuth)

**Scop:** userul dă aplicației acces la Gmail **fără să-i dea parola Google**. (OAuth =
protocolul prin care Google emite niște *tokeni* de acces în locul parolei.)

1. **Frontend.** În `SettingsPage`, userul apasă „Connect Gmail". Frontend-ul cheamă
   `GET /mail-accounts/google/start` (prin `mailAccountsApi`).
2. **Backend.** `mail-account.controller.js → getGoogleConnectUrl` (`mail-account.service.js`)
   construiește URL-ul de consimțământ Google. În el include un **`state`** = un JWT de 10
   minute care leagă întoarcerea de userul corect (apărare anti-CSRF). Răspunde cu acel URL.
3. **Browser → Google.** Frontend-ul duce userul la URL-ul Google. Userul aprobă accesul în
   ecranul Google.
4. **Google → Backend.** Google redirecționează la `GET /mail-accounts/google/callback?code=...&state=...`.
   Atenție: acest endpoint **nu** are middleware de autentificare — identitatea vine din `state`-ul
   semnat, nu din token-ul aplicației.
5. **Backend.** `handleGoogleCallback` cheamă `connectGoogleMailAccount`: verifică `state`-ul,
   schimbă `code`-ul pe **tokeni** (access + refresh), află adresa contului și salvează un document
   `MailAccount`. **Tokenii sunt criptați** la repaus cu AES-256-GCM (`encryptMailToken`).
6. **Backend → Browser.** Controllerul face un **redirect 302** către frontend:
   `/dashboard?gmail=connected&account=<email>` (sau `?gmail=error&code=...` la eșec).
7. **Frontend.** Dashboard-ul vede parametrul `gmail=connected` și confirmă conectarea.

**De ce acest design:** nu atingem niciodată parola Google a userului (cerință a unui produs
de securitate). `state`-ul semnat împiedică pe altcineva să „lege" un cont Gmail străin de
sesiunea ta. Tokenii criptați înseamnă că, până și cu baza de date furată, accesul la Gmail
rămâne ilizibil.

---

## Cazul 3 — Sincronizarea emailurilor + scanarea automată

**Scop:** aducem emailurile din Gmail în aplicație și le **scanăm** automat, ca userul să vadă
verdicte fără să facă nimic.

1. **Frontend.** Pe Inbox sau Dashboard, userul apasă **Sync**. Frontend-ul folosește
   **`MailAccountContext.sync()`** (singura cale corectă, nu un apel direct), care cheamă
   `POST /mail-accounts/:id/sync`.
2. **Backend — controller.** `mail-account.controller.js → syncMailAccount` cheamă
   `syncGmailEmailsForUser` (`mail-account.service.js`).
3. **Backend → Gmail.** Serviciul cere lista de mesaje din **INBOX** (limitată la
   `syncMaxResults`, setabil de user), apoi, pentru fiecare mesaj, **detaliile complete**.
   Dacă tokenul de acces a expirat (Gmail răspunde `401`), `refreshGoogleAccessToken` îl
   reîmprospătează și reîncearcă — transparent.
4. **Backend — parsare.** Fiecare mesaj brut trece prin `parseGmailMessageToEmailPayload`
   (`email-parser.service.js`), care extrage expeditor, domeniu, titlu, corp, atașamente și —
   prin `analyzeEmailLinks` (`link-analysis.service.js`) — linkurile și **tiparele suspecte**
   (link către IP, punycode, credențiale în URL, URL foarte lung, scurtături).
5. **DB.** `Email.updateOne(..., { upsert: true })`: dacă emailul există (după
   `providerMessageId`, index unic), îl **actualizează**; dacă nu, îl **inserează**. Erorile
   per-mesaj sunt prinse și numărate, nu aruncate — un email stricat nu oprește tot sync-ul.
6. **Backend — scanare.** La final, `runSyncScanPipeline` (`scan.service.js`) scanează
   emailurile noi/modificate (vezi Cazul 4 pentru ce se întâmplă într-o scanare). Emailurile pe
   care userul le-a marcat deja manual sunt **sărite** (nu-i suprascriem decizia).
7. **Backend → Frontend.** Răspunde un sumar (câte aduse, inserate, scanate, sărite). În
   paralel, controllerul declanșează în fundal o eventuală **alertă de phishing** (Cazul 7).
8. **Frontend.** `sync()` incrementează **`syncVersion`**; pentru că paginile au `syncVersion`
   în `deps`-ul lui `useApi`, **se reîncarcă singure** cu emailurile noi.

**De ce acest design:** parsăm semnalele **o singură dată**, la intrare, și le salvăm — scanarea
devine rapidă și repetabilă. Un singur semnal (`syncVersion`) reîmprospătează tot UI-ul, fără
ca fiecare pagină să știe de celelalte.

---

## Cazul 4 — Scanarea unui email și atribuirea verdictului (inima aplicației)

**Scop:** pentru un email, calculăm un **scor** și un **verdict** (sigur / suspect / probabil
phishing) + o explicație. Pasul rulează automat după sync (Cazul 3) sau manual (Cazul 6).

1. **Intrare.** `scanEmailWithRules({ userId, emailId, ... })` din `scan.service.js`.
2. **Context — liste user.** `getSenderListContextForEmail` (`sender-list.service.js`):
   expeditorul e pe **allowlist** („am încredere") sau **blocklist** („blochez")?
3. **Context — brand.** `verifySenderBrand` (`brand-verification.service.js` +
   `config/brand-domains.config.js`): vine emailul **chiar** de pe domeniul oficial al unui
   brand cunoscut? (Un expeditor blocat nu mai e tratat ca brand verificat — blocarea învinge.)
4. **Pregătire AI.** `buildAiAnalysisInput` taie textul la dimensiuni sigure și adaugă contextul
   de brand.
5. **Reguli deterministe.** `calculateRulesForEmail` aplică regulile fixe (link IP = +25,
   atașament `.exe` = +35 etc.), folosind greutățile din `config/scoring.config.js`. Cele două
   straturi de context pot **reduce** anumite puncte (brand verificat / allowlist), niciodată
   crește; blocklist-ul **adaugă fix 60** (pragul de phishing garantat).
6. **Semnale AI (opțional).** Dacă userul are AI pornit, `analyzeEmailSemanticsWithOllama`
   (`ollama-semantic.service.js`) trimite emailul la **Ollama** (modelul local) și cere **JSON
   strict** cu semnale (urgență, cerere de date sensibile, impersonare...). `calculateAiScoreFromSignals`
   le transformă în puncte, **plafonate la 50** (AI singur nu poate declara phishing).
7. **Scor final și verdict.** `scorFinal = min(100, scorReguli + scorAI)`, apoi
   `mapScoreToVerdict` îl traduce: `≥60 → likely_phishing`, `≥30 → suspicious`, altfel `safe`.
8. **Explicație.** Dacă AI e pornit, `ollama-explanation.service.js` scrie un text în limbaj
   natural; altfel (sau dacă AI eșuează) `scan-explanation.service.js` construiește o explicație
   **controlată** din regulile declanșate. Aplicația nu rămâne niciodată fără explicație.
9. **DB.** `upsertCurrentScanForEmail` salvează **un singur scan curent** per email (index unic
   `userId + emailId`), inclusiv scorul, verdictul, regulile și explicația.
10. **Stare pentru UI.** Când o pagină cere emailul, `deriveEmailReviewState`
    (`email-state.service.js`) combină verdictul scanului cu verdictul **manual** al userului și
    produce `effectiveVerdict` + `riskBucket` (`safe`, `needs_review`, `quarantine`,
    `reviewed_safe`, `confirmed_phishing`, `unscanned`).

**De ce acest design:** motor **hibrid și transparent** — regulile (fapte dure, explicabile)
sunt primare; AI e un al doilea opinionat **plafonat**, ca o halucinație a modelului să nu poată
declara singură phishing. Toate greutățile stau într-un singur fișier, deci verdictul e auditabil.

---

## Cazul 5 — Userul citește un email și vede „de ce" (fără pericol)

**Scop:** userul deschide un email și înțelege riscul, fără a fi expus la linkuri sau scripturi.

1. **Frontend.** Din lista de pe `InboxPage`, click pe un rând → rută `/inbox/:emailId` →
   `EmailDetailPage` (`frontend/src/pages/EmailDetailPage.jsx`).
2. **Frontend → Backend.** Pagina cere în paralel: `GET /emails/:id` (detaliul),
   `GET /emails/:id/raw` (corpul brut + linkuri + anteturi) și `GET /scans/emails/:id/latest`
   (scanul curent).
3. **Backend.** Controllerele de email/scan cheamă serviciile, care citesc din DB și întorc
   datele (fiecare user vede doar emailurile lui).
4. **Frontend — afișare.** Pagina arată un **card de verdict** cu inel de scor și culoarea din
   `lib/risk.js`; un **banner de avertizare** la emailurile riscante; corpul emailului **curățat**
   de scripturi cu `utils/sanitizeEmailHtml.js`; linkurile ca **text cu buton de copiere** (nu se
   deschid automat); panoul `ScanDetails` cu regulile declanșate, traduse în limbaj uman
   (`getRuleDescription`).

**De ce acest design:** arătăm pericolul **fără a-l declanșa** — HTML dezinfectat și linkuri
needeschise. Culorile și etichetele vin dintr-o **singură sursă** (`lib/risk.js`), deci verdictul
arată la fel peste tot.

---

## Cazul 6 — Userul ia o decizie: Mark safe / Mark phishing (+ rescanare)

**Scop:** userul confirmă sau infirmă verdictul; decizia lui **învinge** scanul automat.

1. **Frontend.** În `ReviewActions.jsx`, click pe „Mark safe" sau „Mark phishing". Pagina face
   **optimistic update**: schimbă imediat starea locală (UI instant), apoi cheamă
   `POST /actions/emails/:id/mark-safe` (sau `mark-phishing`).
2. **Backend.** `action.controller.js → markEmailSafeForUser / markEmailPhishingForUser`
   (`action.service.js`) setează `userVerdict` pe emailul respectiv și `reviewedAt`.
3. **Gmail (doar la phishing).** La „mark-phishing", serviciul cheamă și `moveGmailMessageToSpam`
   (`mail-account.service.js`), care mută mesajul în **Spam pe Gmail** (etichetă `SPAM`, scoate
   `INBOX`). Rezultatul provider-ului e salvat pe email (succes/eșec).
4. **DB.** `email.save()` persistă decizia.
5. **Backend → Frontend.** Răspunde noua stare. Dacă apelul **eșuează**, frontend-ul face „roll
   back" la verdictul anterior și arată o eroare. La succes, golește cache-urile
   (`bustCacheByPrefix('inbox-', 'dash-', ...)`) ca lista și dashboard-ul să se actualizeze.
6. **Efect.** La următoarea citire, `deriveEmailReviewState` pune `verdictSource: 'user'`, deci
   peste tot apare decizia userului (`reviewed_safe` / `confirmed_phishing`).

**Rescanarea + listele de expeditori.** Pe pagina de detaliu, „Trust / Block" adaugă o regulă
(`POST /sender-lists`), iar „Scan again" cheamă `POST /scans/emails/:emailId` (Cazul 4 din nou).
Listele se aplică **scanărilor viitoare**, de aceea UI-ul oferă imediat „Scan again".

**De ce acest design:** omul are ultimul cuvânt — `userVerdict` suprascrie scanul, iar „mark
phishing" curăță și inboxul real (Gmail Spam). Acțiunile optimiste fac UI-ul să pară instantaneu,
dar se corectează singure la eroare.

---

## Cazul 7 — Sarcina de fundal: auto-sync, alerte, digest

**Scop:** protecția merge **fără** ca userul să deschidă aplicația („conectează o dată și uită" —
cerința coordonatorului).

1. **Pornire.** La startul serverului, `startSchedulers` (`scheduler.service.js`) înregistrează
   două **cron job-uri** (sarcini după orar, cu `node-cron`).
2. **Auto-sync** la fiecare `SYNC_INTERVAL_MINUTES` minute (implicit 15): `runAutoSyncForAllUsers`
   (`auto-sync.service.js`) parcurge toate conturile Gmail active și rulează exact fluxul din
   Cazul 3 (sync + scanare) pentru fiecare.
3. **Alertă instant de phishing** (opt-in): după sync, dacă a apărut un email `likely_phishing`
   și userul are alertele pornite, se trimite un email de avertizare (`extras/notifications`).
4. **Digest zilnic** (opt-out): un al doilea cron rulează **din oră în oră**; trimite rezumatul
   userilor a căror **oră de digest** (în fusul lor) coincide cu ora curentă, dacă au avut
   activitate în ultimele 24h.

**De ce acest design:** `node-cron` (polling periodic) e simplu de explicat și de demonstrat
pentru un proiect care nu se deployează public; notificările Gmail Push ar cere verificare Google
și infrastructură publică (decizie acceptată — vezi `docs/DECISIONS.md`).

---

## Cazul 8 — Dashboard și raportul pe email

**Scop:** userul vede o imagine de ansamblu pe un **interval de timp** și își poate trimite un
raport pe email.

1. **Frontend.** `DashboardPage` ține selectorul global de timp prin `TimeRangeContext`, care
   expune `from`/`to` ca șiruri ISO.
2. **Frontend → Backend.** Cardurile cer date scopate pe interval: `GET /emails/stats`,
   `GET /emails/trend`, `GET /emails/top-risky-senders`, `GET /reports/monthly-summary?from=&to=`,
   toate cu aceiași `?from=&to=`.
3. **Backend.** Serviciile (`email.service.js`, `report.service.js`) **agregează** în MongoDB
   numărători și tendințe, folosind verdictele **efective** (decizia userului peste scan), ca
   numerele de pe dashboard și din raport să fie **mereu aceleași**.
4. **Trimitere pe email.** `POST /reports/monthly-summary/send?from=&to=` compune și trimite
   raportul (`extras/notifications`).

**De ce acest design:** un singur interval de timp (`TimeRangeContext`) scopează tot, iar
dashboard-ul și raportul citesc **aceeași** sursă de date — deci nu pot arăta cifre diferite.

---

## Rezumat pentru susținere (firul integrativ)

- **Identitate:** parola → o dată; apoi un **JWT** dovedește cine ești la fiecare cerere
  (Cazul 1). Gmail-ul se leagă prin **OAuth** cu tokeni **criptați** (Cazul 2).
- **Date:** Gmail → parsare o singură dată → DB → **scanare hibridă** (reguli primare + AI
  plafonat) → verdict + explicație (Cazurile 3–4).
- **Om în buclă:** userul vede „de ce" în siguranță (Cazul 5) și are **ultimul cuvânt**; decizia
  lui suprascrie scanul (Cazul 6).
- **Autonom:** cron-urile sincronizează, alertează și rezumă fără userul (Cazul 7); dashboard-ul
  și raportul citesc aceeași sursă (Cazul 8).
- **Firul tehnic care leagă tot:** `apiClient` pune token-ul → `route → middleware → controller →
  service → model` pe backend → MongoDB/Ollama → înapoi prin `useApi`/contexte la componente, iar
  `syncVersion` și golirea cache-ului țin UI-ul mereu proaspăt.

> Documente conexe: `docs/EXPLICATIE_BACKEND.md`, `docs/EXPLICATIE_FRONTEND.md`,
> `docs/PHISHING_RULES.md` (regulile), `docs/SCORING_WEIGHTS_REVIEW.md` (greutățile),
> `docs/API_PLAN.md` (contractele de API), `docs/DECISIONS.md` (deciziile).
