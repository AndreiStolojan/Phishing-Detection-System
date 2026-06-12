# DECISIONS

## Scop

Acest document păstrează deciziile tehnice importante. El este util ca să nu re-discutăm aceeași alegere de fiecare dată.

Format recomandat pentru deciziile viitoare:

- dată
- decizie
- motiv
- impact

## 2026-06-12 — Raportul pe email folosește verdictele *effective* (mirror cu dashboard-ul)

- **Decizie:** `monthlyDigestTemplate` (`backend/extras/notifications/email.template.js`) raportează `%` de siguranță, numărul de „threats" și breakdown-ul Safe/Suspicious/Likely phishing/Confirmed phishing din count-urile *effective* (`effectiveSafe/effectiveSuspicious/effectiveLikelyPhishing/effectiveMarkedPhishing`), nu din verdictele brute de scan. Effective = verdictul scan-ului cu override-ul manual al userului (`userVerdict` „safe"/„phishing") aplicat deasupra — exact bucket-ul folosit de dashboard.
- **Motiv:** template-ul folosea count-urile brute (`counts.safe/suspicious/likelyPhishing`), care nu se schimbă când userul marchează manual un email. Rezultat: după ce userul marca emailurile riscante ca „safe", raportul retrimis arăta același `%` ca înainte, în dezacord cu dashboard-ul. Serviciul (`report.service.js`) calcula deja count-urile effective și le returna — doar emailul le ignora.
- **Impact:** doar `email.template.js` (fallback pe count-urile brute dacă lipsesc cele effective, pentru robustețe). Test nou pur, fără DB: `backend/tests/unit/report-email-template.test.js`. Serviciul, agregările și pragurile rămân neatinse.

## 2026-06-12 — Filtru de timp custom From/To (înlocuiește preseturile) + trecere completă WCAG 2.1 AA

- **Decizie:** filtrul global de timp trece de la preseturi (Last day / Yesterday / 30 / 90 / Last month) la un selector explicit **From/To** cu două `<input type="date">`. Sursa unică de adevăr rămâne `TimeRangeContext`, dar starea devine `{ from, to }` ca date calendaristice inclusive (start-of-local-day). `lib/timeRange.js` expune helpere pure: `getDefaultRange` (ultimele 30 de zile, seed implicit), `toISOWindow` (fereastră half-open `[from, to)` — capătul exclusiv e împins cu o zi ca ziua To să fie inclusă), `formatRangeLabel`, plus `to/fromDateInputValue`. Selectorul e extras în componenta reutilizabilă `components/common/TimeRangeFilter.jsx` (trăiește doar pe dashboard); inbox-ul afișează intervalul ca **text static** (`<span>`, fără hover/link). Cache-keys și dependency arrays din `DashboardPage`/`InboxPage` se re-cheiază pe `${from}-${to}` în loc de `preset`.
- **Motiv:** preseturile nu permiteau o fereastră arbitrară. Backend-ul accepta deja `?from=&to=` absolute (ISO), deci schimbarea e **strict frontend** — fără atingeri de backend, schemă sau rute.
- **Decizie de contrast (token-level):** `--color-destructive` (#ef5350) era prea deschis sub text aproape-alb pe butoanele solide de acțiune distructivă (alb pe roșu = doar 3.26:1). Am adăugat **`--color-destructive-strong` (#c62828)** ca fundal solid pentru aceste butoane (alb 5.26:1, hover 6.02:1, margine vs popover 3.1:1) și am păstrat `--color-destructive` deschis pentru rolul de **text/icon** pe fundal întunecat (text-destructive trece la 5.23:1 — neschimbat). `--color-muted-foreground-subtle` urcat #6b7689 → **#828fa3** (de la 3.98:1 la 5.57:1 pe card) și adoptat în locul opacităților ad-hoc `text-muted-foreground/70` și `/50` care pică sub AA (caption-uri Settings, overline Sidebar, dash „—" trend). Butoanele ghost de delete (`text-destructive hover:bg-destructive/10`) și delete-ul din SenderLists au fost **măsurate și trec deja** (4.74:1 / 5.60:1) — lăsate neatinse. Verificare reproductibilă în `frontend/scripts/contrast-audit.mjs` (formulă WCAG 2.1 sRGB, compositing alfa în sRGB + mixare oklab pentru token-urile `-soft`): **0 eșecuri / 38 perechi**.
- **Impact:** `DashboardPage`, `InboxPage`, `TimeRangeContext`, `lib/timeRange.js`, `components/common/TimeRangeFilter.jsx` (nou), `index.css`, `button.jsx`, `SettingsPage.jsx`, `Sidebar.jsx`. Teste actualizate la modelul From/To (`timeRange.test.jsx`, `TimeRangeFilter.test.jsx`). Build + 39/39 teste curate. App dark-only → contrast verificat pe singura temă.

## 2026-06-10 — Verificare brand pe domeniul expeditorului + strat de modificatori contextuali (reducere fals-pozitive)

- **Decizie:** introducem verificarea brandului pe baza domeniului real al expeditorului. Dacă `senderDomain` aparține unui domeniu oficial, controlat de brand (`backend/src/config/brand-domains.config.js`, potrivire pe sufix → `mail.paypal.com` = `paypal.com`), atunci `senderVerifiedBrand = true`: impersonarea de brand e suprimată (×0) și semnalele tipice de brand (urgență, multe linkuri, CTA „sign in", `reply_to_mismatch`) sunt reduse printr-un strat de multiplicatori contextuali (`VERIFIED_BRAND_MODIFIERS` + `applyVerifiedBrandModifier` în `scoring.config.js`). Promptul Ollama primește domeniul și, când e verificat, instrucțiunea explicită „nu marca impersonare; caută alte semnale".
- **Motiv:** singurul semnal de impersonare era boolean-ul LLM `brandImpersonationSuspected` (+10), care nu compara niciodată domeniul expeditorului cu brandul → emailuri legitime de la `paypal.com`/`amazon.com` etc. acumulau puncte reale (impersonare + urgență + CTA + linkuri) și ajungeau „suspicious". Vezi `docs/FALSE_POSITIVE_REDUCTION.md`.
- **Decizie-cheie de securitate:** domeniile de mailbox de consumator (`gmail.com`, `outlook.com`, `live.com`, `icloud.com`…) sunt EXCLUSE deliberat din verificare (`CONSUMER_MAILBOX_DOMAINS`) — oricine poate avea o adresă acolo, deci nu sunt semnal de încredere. Altfel un atacator ar trimite phishing de pe un Gmail și ar primi reducerea de scor.
- **Ponderi de bază neatinse:** `RULE_WEIGHTS`/`AI_SIGNAL_WEIGHTS` rămân exact ca în v5. Modificatorii sunt multiplicatori aplicați la declanșare, nu ponderi noi. `sensitive_data_request`, atașamentele, IP-link, credențiale în URL rămân la greutate plină chiar și pentru brand verificat (acoperă conturi compromise).
- **Praguri:** NESCHIMBATE (30/60). Cauza fals-pozitivelor era acumularea de puncte, nu pragul; relaxarea pragului ar fi scăzut recall-ul pe phishing real.
- **Backward compat:** engine `rules-ai-v5` → `rules-ai-v6`, prompt `semantic-v2` → `semantic-v3`. Scanările vechi păstrează scorul până la rescanare.
- **Impact:** scanări noi de la branduri verificate au mult mai puține fals-pozitive (ex.: extras PayPal 36→10 puncte, „suspicious"→„safe"). Badge „Verified sender" în UI. Câmpuri noi pe `Scan`: `senderVerifiedBrand`, `verifiedBrandName`.

## 2026-06-09 — Configurație unică de scoring + invariante AI/reguli

- **Decizie:** toate ponderile, plafonul AI, pragurile de verdict și `SCORE_MAX` trăiesc într-un singur fișier, `backend/src/config/scoring.config.js`. Frontend-ul oglindește doar maximele necesare barelor în `frontend/src/lib/scoring.js` (Vite nu poate importa ESM din backend între pachete).
- **Motiv:** ponderile erau hardcodate împrăștiat în `scan.service.js` și o bară de progres folosea max greșit. O sursă unică face rebalansarea sigură și ține codul aliniat cu `docs/PHISHING_RULES.md`.
- **Invariante impuse prin numere + test:** (1) niciun semnal singur nu atinge pragul „high" (60); (2) niciun semnal slab nu depășește banda „medium" (30) singur; (3) `aiScore` plafonat la `50` < `60`, deci AI singur nu poate declara phishing — are nevoie de coroborare cu regulile. Două reguli „strong" independente pot atinge 60 (coroborare în interiorul stratului determinist).
- **Backward compat:** engine `rules-ai-v4` → `rules-ai-v5`. Scanările vechi păstrează scorul `v4` până la o rescanare; nu există rescoring retroactiv în masă.
- **Impact:** scanări noi folosesc ponderile noi (mai puține fals-pozitive pe newslettere). Bara AI se umple corect față de `AI_SCORE_MAX`. Mesaje de eroare Ollama specifice per stare; output AI neparsabil e tratat ca eșec, nu ca valori neutre.

## 2026-06-09 - Rapoarte: o singură sursă de adevăr pentru synced/scanned + dedup pe email

Decizie: toate cifrele din raport (lunar și digest zilnic) derivă dintr-un singur set de bază — emailurile sincronizate în fereastră (`Email.createdAt`) — cu cel mai recent scan atașat per email prin `$lookup`. `scanned` = subsetul acelor emailuri care au un scan; verdictele, top-rules și AI se calculează tot din scanul cel mai recent al fiecărui email.

Motiv: bug de integritate „scanned (60) > synced (58)". Cauza: `synced` se număra pe `Email.createdAt`, iar `scanned` pe `Scan.scannedAt` (două colecții, două câmpuri de timp). Un re-scan rescrie `scannedAt` la „acum", deci un email sincronizat luna trecută dar re-scanat luna asta era numărat ca scanat-dar-nesincronizat.

Impact: invariantul `scanned ≤ synced ≤ total` e garantat prin construcție; fiecare email apare o singură dată cu verdictul cel mai recent (rezolvă și duplicarea din rapoarte). Forma răspunsului API rămâne neschimbată.

## 2026-06-09 - Dashboard scopat pe fereastră rulantă de 30 de zile

Decizie: statisticile, graficele și numărătorile din dashboard reflectă ultimele 30 de zile (fereastră rulantă pe `receivedAt`, azi minus 30 de zile), nu luna calendaristică. Backend-ul aplică filtrul (param `days=30` la `/emails/stats`); trendul era deja pe 30 de zile.

Motiv: fereastra rulantă e mai utilă și evită confuzia la granița de lună. Filtrarea se face în query (backend), nu pe frontend dintr-un set complet.

Items păstrate ca stare absolută (NU scopate pe 30 de zile): statusul „Gmail conectat" (stare curentă, fără dimensiune temporală), „Last synced" (un moment punctual) și lista „Needs your attention" (worklist de amenințări deschise curente — un phishing nereviewuit de acum 40 de zile tot necesită atenție).

## 2026-06-09 - CATEGORY_COLORS: o singură constantă pentru culorile categoriilor

Decizie: culorile categoriilor de date (safe / suspicious / likely_phishing / confirmed_phishing) sunt definite o singură dată în `frontend/src/lib/risk.js` (`CATEGORY_COLORS` + `CATEGORY_LABELS`, pe variabilele `--color-risk-*`). Dashboard (trend + donut), rapoarte (RiskBreakdownBar) și badge-urile din inbox importă de aici, fără hex hardcodat.

Motiv: aceeași categorie trebuie să aibă mereu aceeași culoare, vizibil distinctă, pe tot parcursul aplicației (app-ul e dark-only). Înainte fiecare componentă re-declara local maparea categorie→culoare.

## Decizii inițiale

### 2026-06-02 - Frontend-ul MVP devine `SecureInbox`, un Security Inbox Gmail-only

Motiv:

- coordonatorul a cerut o abordare mai apropiată de o aplicație de email;
- pentru MVP este realist să construim un inbox securizat peste Gmail, nu un înlocuitor complet pentru Gmail;
- valoarea proiectului rămâne stratul de securitate: scor, verdict, motive, explicații și acțiuni de review.

Impact:

- frontend-ul este reconstruit în `frontend/` cu React + Vite + MUI;
- UI-ul este în engleză;
- primul ecran protejat este inbox-ul, nu un dashboard de marketing;
- MVP-ul nu include compose, reply, forward, archive, delete, labels, read/unread sau threading complet.

### 2026-06-02 - Emailurile HTML se afișează doar după sanitizare

Motiv:

- utilizatorul vrea o experiență mai apropiată de un email app, deci trebuie afișat `htmlBody`;
- HTML-ul din email poate conține scripturi, event handlers, imagini remote sau conținut riscant;
- pentru MVP este mai sigur să afișăm HTML curățat decât HTML brut.

Impact:

- frontend-ul folosește DOMPurify;
- scripturile, formularele, iframe-urile și atributele riscante sunt eliminate;
- linkurile se deschid în tab nou cu `noopener noreferrer`;
- imaginile remote sunt blocate și înlocuite cu un indicator vizibil;
- `textBody` rămâne fallback.

### 2026-06-02 - Testele unitare sunt separate pe backend și frontend

Motiv:

- proiectul trebuie să poată fi verificat rapid prin comenzi clare;
- backend-ul și frontend-ul au responsabilități diferite;
- separarea reduce confuzia și păstrează structura proiectului explicită.

Impact:

- backend: `backend/tests/unit/`, comandă `npm --prefix backend test`;
- frontend: `frontend/tests/unit/`, comandă `npm --prefix frontend test`;
- testele backend acoperă stări email, praguri de scor, schema scan/email și `syncMaxResults`;
- testele frontend acoperă formatări, API client, AuthContext, badge/list item, sanitizare HTML și acțiuni review.

### 2026-06-02 - Contextul obligatoriu pentru agenți se reduce la două fișiere

Motiv:

- documentația istorică a crescut mult și poate încetini inutil un agent nou;
- `docs/PROJECT_STATE.md` poate ține starea curentă compactă;
- documentele vechi rămân utile, dar doar pentru taskuri specifice.

Impact:

- un agent nou citește mai întâi `AGENTS.md` și `docs/PROJECT_STATE.md`;
- `API_PLAN.md`, `FRONTEND_PLAN.md`, `PHISHING_RULES.md`, `MANUAL_TESTS.md`, `DECISIONS.md` și `PROGRESS.md` devin lecturi specifice taskului.

### 2026-05-27 - Frontend-ul React + Vite se șterge și se reconstruiește ulterior

Motiv:

- interfața existentă arăta prea generată și nu mai este direcția dorită pentru prezentare;
- următorul pas important este clarificarea backend-ului ca un contract direct pentru viitorul frontend;
- păstrarea UI-ului vechi ar crea confuzie când analizăm ce endpoint-uri și date sunt cu adevărat necesare.

Impact:

- folderul `frontend/` a fost șters;
- backend-ul rămâne sursa principală de lucru;
- analiza backend și propunerile de contract API sunt documentate în `docs/BACKEND_REVIEW.md`;
- frontend-ul va fi reconstruit după decizia asupra endpoint-urilor și după curățarea codului backend neesențial.

### 2026-05-19 - Frontend-ul final nu mai păstrează folderul `frontent-raw/`

Motiv:

- folderul brut conținea Firebase Auth și brandul vechi `AthleteAtlas`, care nu mai aparțin aplicației finale;
- UI-ul de auth a fost deja adaptat în `frontend/` peste auth-ul backend cu Bearer token;
- păstrarea folderului vechi putea crea confuzie la prezentare și în documentație.

Impact:

- `frontent-raw/` a fost șters din repo;
- documentația frontend menționează doar istoric faptul că a fost sursă de inspirație;
- aplicația finală rămâne pe `frontend/`, fără Firebase și fără cod nefolosit de auth vechi.

### 2026-05-19 - Topbar-ul nu mai este sursă de titluri sau control desktop pentru sidebar

Motiv:

- titlurile din topbar se dublau cu titlurile paginilor și puteau crea suprapuneri vizuale;
- sidebar-ul avea deja control propriu, deci controlul din topbar era redundant;
- utilizatorul a cerut un singur control, cu icon de meniu, plasat în sidebar.

Impact:

- topbar-ul rămâne pentru acțiuni globale precum Settings și Contact suport;
- titlul și subtitlul fiecărei pagini sunt afișate doar în conținutul paginii;
- pe desktop, controlul de sidebar este doar în sidebar;
- pe mobil, topbar-ul păstrează hamburger-ul necesar pentru deschiderea navigării.

### 2026-05-19 - Dashboard-ul afișează întâi acțiunea Gmail și starea de review

Motiv:

- utilizatorul pornește de la întrebarea practică: „ce trebuie să fac acum?”;
- `Conturi` și `Emailuri fără scanare` erau metrici slabe pentru MVP, mai ales când există un singur Gmail și scanarea euristică rulează și cu AI oprit;
- datele existente pot fi folosite mai bine fără endpoint nou.

Impact:

- primul bloc din Dashboard este scanarea Gmail;
- statisticile principale sunt `Necesită verificare`, `Probabil phishing`, `Confirmate phishing` și `Scanare automată`;
- `Pipeline date` a fost înlocuit cu distribuția verdicturilor lunii curente;
- numărul de emailuri nescanate este tratat prin `riskBucket=unscanned`, nu prin starea AI.

### 2026-05-19 - Rapoartele separă regulile euristice de semnalele AI

Motiv:

- pentru licență trebuie să fie clar ce este regulă explicită și ce este semnal semantic auxiliar;
- Ollama nu este motorul principal de detecție;
- textele tehnice precum `totalPoints` sunt mai greu de înțeles pentru utilizator.

Impact:

- lista de reguli frecvente are secțiuni separate pentru `Reguli euristice` și `Semnale AI`;
- regulile reale din backend sunt mapate în texte mai intuitive;
- punctele sunt prezentate ca `Impact în scor`;
- statusul AI rămâne diagnostic, nu indicator principal de securitate.

### 2026-05-19 - Dashboard-ul este pentru acțiuni zilnice, Settings pentru administrarea contului Gmail

Motiv:

- utilizatorul a cerut ca Dashboard să fie mai intuitiv și să nu amestece sync-ul zilnic cu administrarea contului;
- conectarea Gmail este necesară doar când nu există cont conectat;
- ștergerea/deconectarea unui cont este o acțiune de setări, nu o acțiune de monitorizare.

Impact:

- Dashboard afișează `Conectează Gmail` doar când nu există cont Gmail;
- după conectare, Dashboard afișează acțiunea principală `Sincronizează și scanează`;
- Settings folosește endpoint-ul existent `DELETE /api/v1/mail-accounts/:id` pentru deconectare;
- lista de emailuri poate filtra după `mailAccountId`, dar rapoartele rămân agregate pe utilizator pentru MVP.

### 2026-05-19 - Sidebar-ul devine controlul principal de spațiu al aplicației

Motiv:

- aplicația trebuie să folosească mai bine ecranele de laptop/desktop fără să piardă navigarea;
- un sidebar collapsible permite trecerea rapidă între navigare completă și spațiu maxim pentru date;
- redimensionarea controlată ajută pe monitoare diferite fără să introducă setări complicate.

Impact:

- sidebar-ul desktop are stări expanded/collapsed;
- lățimea expanded este redimensionabilă între limite controlate;
- starea și lățimea se persistă în `localStorage`;
- profilul și logout-ul sunt mutate în sidebar, iar topbar-ul rămâne pentru titlul paginii și acțiuni globale.

### 2026-05-19 - Avatarul utilizatorului se salvează ca `avatarDataUrl` pentru MVP

Motiv:

- utilizatorul a cerut poze pentru fiecare user, dar MVP-ul nu are încă storage separat pentru fișiere;
- un data URL comprimat în browser este suficient pentru o poză mică de profil;
- evităm introducerea prematură a unui sistem de upload, bucket, semnare URL-uri și curățare fișiere.

Impact:

- modelul `User` are câmpul `avatarDataUrl`, cu limită de `700000` caractere;
- `GET /api/v1/users/me` returnează `avatarDataUrl`;
- `PATCH /api/v1/users/me` acceptă `name` și/sau `avatarDataUrl`;
- frontend-ul comprimă imaginea local înainte să o trimită la backend;
- dacă proiectul trece la producție reală, avatarul poate fi mutat ulterior într-un storage dedicat.

### 2026-05-19 - Chatul de suport trimite email către `EMAIL_FROM`

Motiv:

- cerința curentă este un canal simplu de contact din aplicație, nu un sistem complet de mesagerie;
- backend-ul are deja infrastructură Nodemailer pentru digestul lunar;
- pentru MVP este mai ușor de testat și explicat un mesaj trimis către aceeași adresă configurată pentru emailurile aplicației.

Impact:

- există endpoint protejat `POST /api/v1/contact/message`;
- mesajul include utilizatorul autentificat și setează `replyTo` la emailul lui;
- destinatarul este `EMAIL_FROM`;
- dacă lipsește configurarea email, endpoint-ul întoarce eroare controlată;
- frontend-ul afișează drawer de contact accesibil din topbar.

### 2026-05-19 - Polish-ul frontend folosește `framer-motion` și `recharts`

Motiv:

- utilizatorul a cerut tranziții mai fine, pagini mai estetice și statistici relevante;
- `framer-motion` acoperă animațiile de pagină și microinteracțiunile fără să schimbe logica aplicației;
- `recharts` permite charturi simple peste datele existente, fără să mutăm calcule importante în frontend.

Impact:

- `frontend/package.json` include `framer-motion` și `recharts`;
- layout-ul are tranziții între pagini cu respect pentru `prefers-reduced-motion`;
- dashboard-ul și rapoartele afișează charturi/statistici construite din endpoint-urile existente;
- logica de phishing, Gmail sync, AI și acțiunile manuale rămân în backend.

### 2026-05-18 - Frontend-ul folosește Vite proxy pentru API în development

Motiv:

- backend-ul nu are nevoie să fie modificat pentru CORS în această etapă;
- frontend-ul poate chema simplu `/api/v1/...`, la fel ca în documentația API;
- Vite trimite request-urile locale către backend-ul de development pe `http://localhost:5500`;
- păstrăm schimbarea strict în frontend și reducem riscul asupra backend-ului deja testat.

Impact:

- `frontend/vite.config.js` conține proxy pentru `/api/v1`;
- în development, frontend-ul rulează pe `5173`, iar backend-ul pe `5500`;
- clientul API poate folosi implicit `/api/v1`;
- pentru alt mediu se poate seta `VITE_API_BASE_URL`, fără să schimbăm codul componentelor.

### 2026-05-11 - Frontend-ul MVP folosește temă dark-only și auth-ul backend, nu Firebase

Motiv:

- backend-ul are deja auth stabil cu JWT Bearer token, deci frontend-ul trebuie să consume acest contract, nu să introducă Firebase Auth;
- folderul brut folosit inițial ca inspirație conținea UI util pentru login/register, dar logica Firebase și brandul vechi nu aparțineau proiectului de phishing;
- păstrarea unei singure teme dark reduce timpul de implementare și evită polish vizual prematur;
- cromatica finală poate fi schimbată după ce fluxul principal funcționează.

Impact:

- se va crea un folder separat `frontend/`, cu `src/`;
- UI-ul de auth a refolosit doar idei vizuale, fără Firebase;
- tokenul se salvează local pentru MVP și se trimite ca `Authorization: Bearer <token>`;
- nu se implementează toggle dark/light în prima versiune;
- planul detaliat este în `docs/FRONTEND_PLAN.md`, iar taskurile pentru agenți sunt în `docs/FRONTEND_AGENT_TASKS.md`.

### 2026-05-11 - Backend-ul este izolat în `backend/`

Motiv:

- urmează construirea unui frontend separat, iar proiectul are nevoie de o separare clară între API și UI;
- backend-ul este deja stabil, deci mutarea într-un folder dedicat ajută deploy-ul fără să schimbe contractele API;
- DigitalOcean/App Platform sau orice alt host poate folosi `backend/` ca source directory pentru serviciul Node.js.

Impact:

- codul Express rulează din `backend/src/`;
- `package.json`, `package-lock.json`, `scripts/`, `manual-tests/`, `postman/`, `.postman/`, `extras/` și fișierele `.env.*.local` ale backend-ului sunt în `backend/`;
- documentația proiectului rămâne în `docs/` la rădăcina repo-ului;
- comenzile backend se rulează din `backend/`, de exemplu `npm run dev`, `npm run lint` și `npm run cleanup:duplicate-scans`;
- nu a fost creat încă folder `frontend/`.

### 2026-05-02 - Codul runtime este mutat în `src/`, fără refactor complet pe module

Motiv:

- proiectul are nevoie de o separare clară între codul aplicației și documentație, scripturi, teste manuale sau integrări opționale;
- pentru MVP este mai sigur să păstrăm organizarea actuală pe layere (`controllers`, `services`, `models`, `routes`) decât să facem acum un refactor mare în `src/modules/*`;
- frontend-ul urmează să consume contractele API, deci stabilitatea este mai importantă decât o reorganizare internă agresivă.

Impact:

- `app.js`, `server.js`, `config`, `database`, `common`, `middlewares`, `models`, `controllers`, `services`, `routes` și `validations` stau în `backend/src/`;
- `manual-tests/`, `scripts/` și `extras/` au fost mutate ulterior în `backend/`;
- din `backend/`, scripturile `start` și `dev` pornesc `src/server.js`;
- scripturile utilitare importă din `backend/src/`;
- un refactor pe module (`backend/src/modules/auth`, `backend/src/modules/emails` etc.) rămâne opțional după stabilizarea MVP-ului și a frontend-ului.

### 2026-04-02 - Proiectul rămâne un monolit modular

Motiv:

- este suficient pentru MVP;
- este mai ușor de implementat;
- este mai ușor de explicat;
- evită complexitatea inutilă a microserviciilor.

Impact:

- toate modulele stau în același backend;
- separarea se face prin structură și responsabilități, nu prin procese separate.

### 2026-04-02 - Primul provider vizat este Gmail

Motiv:

- reduce complexitatea;
- permite focus pe un flux complet;
- este mai realist pentru termenul disponibil.

Impact:

- modelele și serviciile trebuie să permită extindere ulterioară, dar implementarea inițială rămâne centrată pe Gmail.

### 2026-04-02 - Motorul principal de detecție este bazat pe reguli

Motiv:

- este mai ușor de construit;
- este mai ușor de explicat în licență;
- produce motive clare pentru verdict;
- nu depinde de antrenarea unui model complex.

Impact:

- verdictul poate funcționa fără Ollama;
- regulile și scoring-ul devin componenta centrală a scanării.

### 2026-04-02 - Ollama este folosit doar pentru explainability

Motiv:

- reduce riscul de a muta logica critică într-un LLM;
- păstrează sistemul mai stabil și mai explicabil;
- separă clar detecția de prezentarea explicației.

Impact:

- explicațiile LLM sunt opționale;
- dacă Ollama nu merge, sistemul de scanare trebuie să funcționeze în continuare.

### 2026-04-02 - Frontend-ul nu este prioritatea principală în această fază

Motiv:

- valoarea principală a proiectului este în backend și logica de detecție;
- timpul este limitat;
- MVP-ul are nevoie în primul rând de funcționalitate demonstrabilă.

Impact:

- investiția principală merge în API, modele, sync și scanare;
- UI-ul rămâne simplu până când fluxul principal este stabil.

### 2026-04-04 - Auth-ul MVP folosește Bearer token în header-ul Authorization

Motiv:

- este varianta cea mai simplă de înțeles și de implementat pentru faza actuală;
- se pot testa ușor endpoint-urile din Postman, fișiere `.http` sau UI-ul de test;
- evită complexitatea suplimentară a cookie-urilor și a invalidării de sesiune pe server în MVP.

Impact:

- clientul salvează tokenul și îl trimite ca `Authorization: Bearer <token>`;
- `logout` este tratat în client prin ștergerea tokenului local;
- dacă mai târziu vrem sesiuni invalidate pe server, va trebui introdusă o strategie nouă, de exemplu cookies sau o listă server-side de tokenuri invalidate.

### 2026-04-04 - Endpoint-ul pentru utilizatorul curent rămâne `GET /api/v1/users/me`

Motiv:

- utilizatorul curent este o resursă din modulul `users`, nu o acțiune de auth;
- evităm dublarea semanticii între `/auth/me` și `/users/me`.

Impact:

- documentația și testele trebuie să folosească doar `/api/v1/users/me`.

### 2026-04-04 - Primul admin este creat prin bootstrap manual din variabile de mediu

Motiv:

- este ușor de controlat și de explicat într-un proiect de licență;
- evită logica inutilă de creare automată a adminului la fiecare pornire;
- păstrează clară separarea dintre utilizatori normali și contul administrativ.

Impact:

- există un script dedicat pentru bootstrap admin;
- credențialele adminului nu trebuie hardcodate în cod.

### 2026-04-04 - Funcționalitățile Arcjet și welcome email sunt mutate în `backend/extras/`

Motiv:

- nu fac parte din fluxul minim obligatoriu pentru MVP;
- păstrăm codul pentru mai târziu, fără să încarce fluxul principal de auth.

Impact:

- backend-ul pornește fără să depindă de Arcjet sau Nodemailer pentru auth;
- integrarea lor poate fi reactivată ulterior din folderul `backend/extras/`.

### 2026-04-04 - Fiecare chat nou trebuie să explice simplu și să evite codul până la cerere explicită

Motiv:

- proiectul este folosit și pentru învățare, nu doar pentru livrare;
- utilizatorul vrea să înțeleagă clar ce se întâmplă înainte de implementare;
- pașii mici și explicațiile simple cresc șansa ca proiectul să fie și terminat, și înțeles.

Impact:

- se explică simplu, ca pentru un începător;
- nu se scrie cod decât când utilizatorul cere clar asta;
- după fiecare pas important se actualizează documentația proiectului.

### 2026-04-09 - Sync-ul inițial Gmail salvează toate emailurile sincronizate, nu doar cele phishing

Motiv:

- aplicația are nevoie de istoric complet pentru listare și comparație;
- scorarea și verdictul se pot recalcula ulterior fără pierdere de date;
- păstrăm MVP-ul simplu prin separarea între datele emailului și rezultatul scanării.

Impact:

- a fost introdus modelul `Email` cu câmpuri minime pentru MVP;
- sync-ul manual (`POST /api/v1/mail-accounts/:id/sync`) aduce ultimele emailuri din inbox;
- duplicatele sunt prevenite prin cheia `userId + providerMessageId`;
- clasificarea phishing va fi salvată separat în colecția `scans` într-o fază următoare.

### 2026-04-10 - Sync-ul Gmail folosește `format=full`, cu parser separat pentru extracția feature-urilor

Motiv:

- pentru detecția phishing avem nevoie de corpul emailului, linkuri și atașamente, nu doar metadata;
- păstrăm serviciul de sync mai clar prin separarea între fetch Gmail, parsare email și analiză linkuri;
- pregătim terenul pentru scoring euristic fără a introduce încă dependențe externe.

Impact:

- apelul `users.messages.get` este făcut în `format=full`;
- au fost adăugate câmpuri derivate în `emails` (`replyTo`, `senderDomain`, `links`, `linkDomains`, `attachmentExtensions` etc.);
- logica de parsare este mutată în servicii dedicate, ușor de extins în faza de scanare.

### 2026-04-10 - Verdictul inițial este calculat de motorul de reguli, iar AI-ul este pregătit separat pentru semantică și explainability

Motiv:

- MVP-ul are nevoie de un verdict stabil, testabil și ușor de explicat academic;
- semnalele AI vor completa regulile, nu vor înlocui scorarea principală în prima iterație;
- pentru AI folosim inputul relevant complet al emailului (`subject + textBody` cu fallback), nu doar `snippet`.

Impact:

- a fost introdus modelul `Scan` cu `score`, `verdict`, `reasons` și `triggeredRules`;
- a fost implementată scanarea manuală prin endpoint-uri dedicate;
- structura `aiSignals` și helperul de input AI sunt pregătite pentru integrarea semantică în pasul următor.

### 2026-04-11 - Flow-ul principal devine `sync -> scan automat`, cu scanare curentă unică per email

Motiv:

- pentru MVP este mai util un singur flow practic, fără pas manual separat după fiecare sync;
- scanarea repetată inutilă pe aceleași emailuri consumă timp și aglomerează datele;
- vrem rezultat de scanare actualizat per email, nu istoric repetitiv fără valoare imediată.

Impact:

- `POST /api/v1/mail-accounts/:id/sync` declanșează automat scanarea în backend;
- emailurile noi sunt scanate automat;
- emailurile actualizate se rescanează doar dacă nu au scanare curentă pentru `engineVersion` activ;
- scanarea manuală face update pe scanarea existentă (model de tip upsert);
- răspunsul de sync include `scanSummary` pentru monitorizare rapidă a pipeline-ului.

### 2026-04-11 - Semnalele AI semantice folosesc Ollama local, cu prompt în engleză și explainability controlată în backend

Motiv:

- vrem semnale semantice utile fără să mutăm verdictul principal în LLM;
- modelele locale mici sunt mai stabile pe instrucțiuni în engleză, mai ales pentru output JSON;
- explicațiile libere în română generate direct de model pot fi inconsistente sau halucinante.

Impact:

- integrarea AI este locală prin Ollama (`/api/chat`), nu cloud;
- promptul semantic este în engleză și cere output JSON strict;
- rezultatul semantic este salvat în `aiSignals` împreună cu metadata de performanță (`model`, `promptVersion`, `latencyMs`, `status`, `evaluatedAt`);
- `aiExplanation` este compusă controlat în backend, în română, din semnale AI + reguli;
- dacă AI este dezactivat sau eșuează, scanarea pe reguli rămâne validă și funcțională.

### 2026-04-11 - Integrarea Ollama local folosește fallback pe host local și erori diferențiate

Motiv:

- unele medii locale pot avea diferențe de rezoluție între `localhost` și `127.0.0.1`;
- pentru debugging rapid avem nevoie să știm dacă problema este de rețea, timeout sau output invalid, nu doar o eroare generică.

Impact:

- clientul Ollama încearcă host-uri locale candidate (`127.0.0.1` / `localhost`) când endpoint-ul configurat nu răspunde;
- `aiSignals` poate include `endpoint` și `errorDetail` pentru diagnostic;
- erorile AI sunt separate clar: `ollama_unreachable`, `ollama_timeout`, `ollama_invalid_output`;
- versiunea curentă a motorului de scanare a fost incrementată la `rules-ai-v1`.
- inputul semantic trimis la model este redus (body + linkuri limitate) pentru a evita timeout-uri pe emailuri foarte mari.
- inferența locală este optimizată pentru stabilitate pe laptop: output JSON și limită de generare (`num_predict`) în request.

### 2026-04-11 - Scorul final devine hibrid: `ruleScore + aiScore` (AI bonus limitat)

Motiv:

- semnalele semantice AI aduc informație utilă de risc (urgență, cereri sensibile, social engineering) care merită reflectată în scor;
- vrem să păstrăm controlul și explicabilitatea, deci componenta AI trebuie limitată.

Impact:

- scanarea salvează separat `ruleScore`, `aiScore` și `score` final;
- `aiScore` este limitat (cap) pentru a evita dominarea verdictului de către AI;
- verdictul final folosește scorul hibrid;
- `summary` din semnalele AI este cerut în română pentru consistență de produs.

### 2026-04-12 - Modelul Ollama final pentru MVP se alege prin benchmark local, nu doar după mărimea modelului

Motiv:

- testele locale au arătat că un model mai mare nu este automat și mai bun pentru cazul nostru;
- pentru MVP contează mai mult stabilitatea pe output JSON, latența și consistența semnalelor decât dimensiunea modelului;
- alegerea trebuie făcută pe un set mic de emailuri de test, nu intuitiv.

Impact:

- `qwen2.5:3b` este candidatul curent mai stabil pentru dezvoltare, dar decizia finală rămâne după benchmark;
- evaluarea modelelor trebuie să urmărească `latencyMs`, rata de `status: evaluated`, calitatea semnalelor și consistența pe rerulare;
- benchmark-ul local devine următorul pas recomandat înainte de alte schimbări în scoringul AI.

### 2026-04-28 - Filtrele listei de emailuri folosesc starea finală, nu verdictul brut de scanare

Motiv:

- UI-ul grupează emailurile după starea finală (`effectiveVerdict` și `riskBucket`);
- verdictul manual al utilizatorului are prioritate peste scanare;
- `Scan.verdict` rămâne strict algoritmic și nu include `phishing`.

Impact:

- `GET /api/v1/emails?verdict=...` filtrează după `effectiveVerdict`;
- `verdict=phishing` întoarce emailurile marcate manual ca phishing;
- `GET /api/v1/emails?riskBucket=...` filtrează după gruparea finală pentru UI;
- totalul de paginare este calculat după aceleași filtre finale.

### 2026-04-28 - `userVerdict` suprascrie verdictul scanării în starea afișată

Motiv:

- emailul are deja review-ul manual salvat în `userVerdict`, `reviewedAt`, `lastManualAction`;
- scanarea curentă are deja verdictul algoritmic în `latestScan.verdict`;
- UI-ul are nevoie de un contract simplu, dar nu vrem să salvăm câmpuri care pot fi recalculate clar;
- decizia utilizatorului trebuie să aibă prioritate, pentru că reprezintă confirmarea manuală asupra unui email concret.

Impact:

- `userVerdict` are prioritate peste verdictul scanării;
- `userVerdict: safe` produce `effectiveVerdict: safe`, `verdictSource: user`, `isQuarantined: false`;
- `userVerdict: phishing` produce `effectiveVerdict: phishing`, `verdictSource: user`, `isQuarantined: false`;
- fără `userVerdict`, verdictul efectiv vine din `latestScan.verdict`, cu `verdictSource: scan`;
- `reviewStatus` este:
  - `reviewed` dacă există `userVerdict`;
  - `pending_review` pentru scanări `suspicious` sau `likely_phishing` fără review manual;
  - `no_review_needed` pentru scanări `safe` fără review manual;
  - `unscanned` când nu există nici review manual, nici scanare;
- răspunsurile de email nu mai expun apartenență la liste, pentru că allowlist/blocklist au fost scoase din MVP.

### 2026-04-28 - Carantina este locală, nu o zonă separată în Gmail

Motiv:

- pentru MVP vrem să arătăm clar că un email este tratat ca risc ridicat, fără să construim încă un sistem separat de izolare;
- Gmail nu oferă o "carantină" custom simplă pentru aplicația noastră;
- termenul este util în UI și în raportare, dar trebuie definit strict ca stare derivată din datele backend-ului.

Impact:

- `isQuarantined: true` înseamnă că ultima scanare este `likely_phishing` și nu există verdict manual peste ea;
- un email scanat ca `likely_phishing` intră în carantină locală chiar dacă nu a fost mutat în Spam;
- un email marcat manual cu `userVerdict: phishing` iese din carantină și devine phishing confirmat manual;
- carantina locală nu creează filtre Gmail și nu mută automat toate emailurile similare.

### 2026-04-28 - Starea finală folosește `riskBucket`

Motiv:

- UI-ul are nevoie de o categorie simplă pentru fiecare email, fără să amestece scanarea automată cu decizia manuală;
- `effectiveVerdict` spune verdictul final, dar `riskBucket` spune ce acțiune sau grupare este utilă pentru produs;
- phishing-ul confirmat manual trebuie separat de carantina automată, pentru că utilizatorul deja a luat o decizie.

Impact:

- verdictul scanării rămâne strict algoritmic: `safe`, `suspicious`, `likely_phishing`;
- verdictul manual rămâne în `userVerdict`: `safe` sau `phishing`;
- verdictul final expus prin `effectiveVerdict` poate fi `safe`, `suspicious`, `likely_phishing`, `phishing` sau `null`;
- `userVerdict: safe` produce `reviewStatus: reviewed`, `effectiveVerdict: safe`, `verdictSource: user`, `isQuarantined: false`, `riskBucket: reviewed_safe`;
- `userVerdict: phishing` produce `reviewStatus: reviewed`, `effectiveVerdict: phishing`, `verdictSource: user`, `isQuarantined: false`, `riskBucket: confirmed_phishing`;
- scanare `likely_phishing` fără verdict manual produce `reviewStatus: pending_review`, `effectiveVerdict: likely_phishing`, `verdictSource: scan`, `isQuarantined: true`, `riskBucket: quarantine`;
- scanare `suspicious` fără verdict manual produce `reviewStatus: pending_review`, `effectiveVerdict: suspicious`, `verdictSource: scan`, `isQuarantined: false`, `riskBucket: needs_review`;
- scanare `safe` fără verdict manual produce `reviewStatus: no_review_needed`, `effectiveVerdict: safe`, `verdictSource: scan`, `isQuarantined: false`, `riskBucket: safe`;
- email fără scanare și fără verdict manual produce `reviewStatus: unscanned`, `effectiveVerdict: null`, `verdictSource: null`, `isQuarantined: false`, `riskBucket: unscanned`.

### 2026-04-28 - `pending_review` înseamnă risc detectat, dar neconfirmat de utilizator

Motiv:

- verdictul algoritmic nu trebuie confundat cu o decizie manuală;
- utilizatorul trebuie să poată vedea rapid ce emailuri merită verificate;
- pentru lucrare, separarea dintre detecție automată și confirmare umană este importantă și ușor de explicat.

Impact:

- `reviewStatus: pending_review` apare când ultima scanare este `suspicious` sau `likely_phishing` și `userVerdict` este gol;
- `pending_review` nu schimbă Gmail;
- `pending_review` nu adaugă automat expeditorul în blocklist;
- după `mark-safe` sau `mark-phishing`, statusul devine `reviewed`.

### 2026-05-02 - Scoatem allowlist/blocklist din MVP

Motiv:

- flow-ul manual trebuie să rămână ușor de explicat și testat;
- scoring-ul de bază trebuie să fie determinat de regulile de detecție și semnalele AI semantice, nu de liste locale administrate separat;
- endpoint-urile pentru liste cresc suprafața MVP-ului fără să fie obligatorii pentru demonstrația principală.

Impact:

- `/api/v1/lists` nu mai este montat în `app.js`;
- acțiunile `allow-sender`, `allow-domain`, `block-sender`, `block-domain` nu mai sunt expuse;
- `mark-phishing` setează doar `userVerdict: phishing` și încearcă mutarea mesajului concret în Gmail Spam;
- scanarea nu mai citește și nu mai aplică semnale de allowlist/blocklist;
- răspunsurile emailurilor nu mai includ `listMembership`;
- fișierele dedicate lists au fost eliminate din cod.

### 2026-05-02 - Explainability AI structurată, controlată de backend

Motiv:

- explicația veche era corectă, dar prea rigidă pentru un utilizator non-tehnic;
- frontend-ul are nevoie de un contract simplu, predictibil, fără secțiuni pe care modelul local le poate genera inconsistent;
- vrem să folosim Ollama pentru formulare naturală, dar fără să îi dăm control asupra verdictului sau scorului.

Impact:

- `aiExplanation` rămâne obiect pentru frontend, dar în MVP conține doar `summary`;
- `summary` are 1-3 fraze scurte în română și include o recomandare practică scurtă;
- `aiExplanationMeta` salvează sursa explicației, statusul, modelul, latența și motivul de fallback;
- pentru explicația finală, Ollama primește doar `verdict`, `score`, `ruleScore`, `aiScore`, `triggeredRules` și `aiSignals`;
- Ollama nu primește corpul emailului pentru explicația finală, nu decide verdictul și nu schimbă scorul;
- dacă Ollama este oprit, lent sau întoarce JSON invalid, backend-ul folosește fallback-ul controlat.

### 2026-05-02 - AI poate fi pornit/oprit per utilizator

Motiv:

- pentru demonstrație și debugging este util să vedem clar diferența dintre scanări cu AI și scanări cu fallback;
- setarea trebuie să fie controlabilă din API, fără modificări în cod sau restart;
- oprirea AI nu trebuie să declanșeze rescanări inutile.

Impact:

- utilizatorul are `settings.aiEnabled`;
- endpoint-ul `PATCH /api/v1/users/me/ai-settings` acceptă `aiEnabled: 0` sau `aiEnabled: 1`;
- când `aiEnabled` este `false`, scanarea nu apelează Ollama și salvează fallback cu `fallbackReason: ai_disabled`;
- când `aiEnabled` este `true`, scanarea apelează Ollama pentru semnale și pentru explicația naturală;
- oprirea AI nu invalidează scanările existente;
- pornirea AI poate invalida o scanare curentă făcută fără AI sau fără explicație generată de Ollama, astfel încât ea să poată fi completată printr-o rescanare eligibilă.

### 2026-04-28 - Gmail Spam se modifică doar la `mark-phishing` manual, cu scope `gmail.modify`

Motiv:

- mutarea automată în Spam pe baza scanării poate produce acțiuni prea agresive pentru MVP;
- utilizatorul trebuie să confirme explicit că un email este phishing înainte să modificăm starea lui în Gmail;
- pentru lucrarea de licență este mai ușor de explicat separarea dintre verdict algoritmic și acțiune manuală.

Impact:

- scope-ul OAuth Gmail devine `https://www.googleapis.com/auth/gmail.modify`, în loc de `gmail.readonly`;
- conturile Gmail conectate anterior trebuie reconectate ca să primească noul scope;
- `mark-phishing` păstrează comportamentul local: setează `userVerdict: phishing`;
- doar după salvarea locală, backend-ul încearcă `users.messages.modify` cu `addLabelIds: ["SPAM"]` și `removeLabelIds: ["INBOX"]`;
- dacă Gmail eșuează, acțiunea locală nu se face rollback;
- `mark-safe` rămâne local-only și nu modifică Gmail;
- scanările automate `likely_phishing` nu mută mesaje în Spam;
- filtrele Gmail automate nu sunt implementate; aplicația modifică doar mesajul concret asupra căruia utilizatorul a făcut `mark-phishing`.

### 2026-04-28 - Raportul lunar este endpoint de date, nu automatizare

Motiv:

- pentru MVP este util să avem date agregate pentru dashboard sau raportare, fără complexitatea unui job programat;
- primul pas a fost sumarul ca date pure, ca să poată fi testat separat de trimiterea emailului;
- datele existente în `Email` și `Scan` sunt suficiente pentru un sumar lunar simplu.

Impact:

- endpoint-ul este `GET /api/v1/reports/monthly-summary`, protejat cu Bearer token;
- raportul este calculat doar pentru utilizatorul autentificat;
- `month=YYYY-MM` selectează luna raportată, iar fără query se folosește luna curentă;
- contoarele folosesc câmpurile de eveniment existente: `Email.createdAt` pentru emailuri sincronizate, `Scan.scannedAt` pentru scanări/verdicturi/reguli/AI și `Email.reviewedAt` pentru review manual;
- nu se introduce job, scheduler sau trimitere automată de email.

### 2026-04-28 - Digestul lunar este manual-first și folosește configurare de email din env

Motiv:

- utilizatorul are nevoie de o acțiune simplă prin care să trimită sumarul lunar către propria adresă;
- pentru MVP evităm scheduler, cron și reguli automate de trimitere;
- senderul nu trebuie hardcodat în cod, pentru că diferă între mediile locale și producție.

Impact:

- endpoint-ul este `POST /api/v1/reports/monthly-summary/send`, protejat cu Bearer token;
- destinatarul este emailul utilizatorului autentificat (`req.user.email`);
- datele trimise reutilizează serviciul existent de sumar lunar;
- template-ul de email este în română și este separat de logica de raportare;
- trimiterea folosește `EMAIL_FROM` și `EMAIL_PASSWORD`;
- dacă lipsește configurarea de email, endpoint-ul întoarce `sent: false` cu o eroare clară;
- nu s-a introdus scheduler/cron și nu s-a reactivat welcome email-ul din auth;
- dacă în viitor se adaugă automatizare, ea trebuie documentată separat; în starea curentă, digestul nu se trimite singur.

### 2026-04-28 - Există o singură scanare curentă per email

Motiv:

- pentru MVP nu avem nevoie de istoric complet de scanări, ci de rezultatul curent afișat utilizatorului;
- două scanări concurente pentru același email puteau crea documente duplicate dacă fluxul făcea `find` și apoi `create`;
- duplicatele pot strica alegerea ultimei scanări și pot umfla sumarul lunar (`scannedEmails`, verdicturi, reguli frecvente, statusuri AI).

Impact:

- modelul `Scan` are index unic pe `userId + emailId`;
- salvarea scanării curente folosește `findOneAndUpdate` cu `upsert: true`, deci operația este atomică la nivel MongoDB când indexul există;
- `cleanupDuplicateScans` rămâne util pentru date vechi, dar nu este mecanismul principal de corectitudine;
- dacă există duplicate vechi în colecția `scans`, ele trebuie curățate înainte ca MongoDB să poată construi indexul unic;
- pentru development există scriptul `npm run cleanup:duplicate-scans`, rulat din `backend/`, care păstrează cea mai recentă scanare pentru fiecare pereche `userId + emailId`.

### 2026-06-05 - Frontend redesign (Faza 18): rebuild cu Tailwind + shadcn/ui

Context:

- coordonatorul a cerut un produs care să arate profesional, nu ca un proiect de facultate;
- frontend-ul Faza 14 era funcțional (React + Vite + MUI) dar avea aspect de student project.

Decizie:

- rebuild de la zero al UI-ului, păstrând stratul `src/api/*`, `AuthContext` și utilitarele dovedite;
- stack nou: **Tailwind CSS v4 + shadcn/ui** (primitive Radix copiate în `src/components/ui/`), `lucide-react` pentru iconițe, `recharts` pentru grafice;
- temă **dark-only**;
- layout **sidebar + dashboard-first** (security overlay), nu inbox clasic pe 3 panouri;
- pagina de auth adaptată după UI-ul din `athlete_atlas` (card centrat, iconițe în câmpuri, toggle login/register), dar fără Firebase și fără buton "Sign in with Google" (Google se folosește doar pentru conectarea Gmail după login).

Motiv pentru stack:

- shadcn/ui dă componente profesionale cu control total pe design, potrivit pentru cerința de aspect;
- Tailwind v4 (config CSS-first cu `@theme`) permite definirea celor 6 culori de risk bucket ca tokeni semantici reutilizați de toate componentele.

Impact:

- întreaga limbă vizuală e organizată în jurul celor 6 risk buckets din backend (`src/lib/risk.js` e sursa unică);
- testele unitare au fost rescrise pentru noile componente; build + teste trec;
- starea server-side se ține cu hook-uri custom (`useApi`, `useAsyncAction`) + context, fără TanStack Query, ca să rămână ușor de explicat la prezentare.

### 2026-06-05 - UI Premium Upgrade (Faza 22): decizii de design

Context:

- Andrei a cerut transformarea UI într-o experiență premium, simplă, comparabilă cu Apple ("simple and just works beautifully");
- audit complet cu 12 agenți (un designer/suprafață + sinteză), salvat în `docs/archive/ui-premium-audit-raw-2026-06-05.json`;
- plan complet în `docs/UI_PREMIUM_PLAN.md`, checklist în `docs/TODO.md` (Faza 22).

Decizii confirmate de Andrei:

- **Scope: full premium** — se implementează toate cele 11 faze, inclusiv signature moves (verdict reveal, posture hero, image privacy gate, traveling nav indicator, tactile review);
- **Dashboard: posture-first** — se înlocuiesc cele 4 KPI cards egale cu un band "You're protected / N need attention" + donut interactiv cu center = safe % și slices linkate la filtre inbox;
- **Naming canonic: `SecureInbox`** peste tot (login, `<title>`, sidebar, emailuri); "XAI Phishing Shield" nu mai e folosit ca brand vizibil;
- **Limbă emailuri tranzacționale: English** (welcome / digest / alert), aliniat cu UI-ul aplicației.

Defaults aplicate (nedecise explicit, pot fi schimbate):

- **dark-only** păstrat pentru demo, dar tokenii devin theme-aware (light = flip viitor);
- **font: Inter self-hosted** ca `InterVariable.woff2` (drop Google Fonts blocking link);
- **privacy gate**: imaginile remote sunt blocate by default pe buckets riscante (needs_review/quarantine/confirmed_phishing) cu buton "Load images"; safe = auto-load;
- **filter counts** ascunse în timpul unui search activ (counts vin din monthly-summary, lista e paginată);
- **culoare acțiuni**: mark-phishing folosește rose-ul quarantine, brick-ul `#b91c1c` rămâne pentru confirmed.

Principii tehnice:

- ordine: fundație (tokens/type/motion) → primitive → shell → polish per pagină → template-uri email; commit per fază pentru restore points;
- recolorarea risk se face păstrând **numele tokenilor** din `src/lib/risk.js` (doar valorile se schimbă) ca să nu se spargă badge/banner/chart;
- motion centralizat în `src/lib/motion.js` (springSoft/springSnappy) + `<MotionConfig reducedMotion='user'>` + guard `prefers-reduced-motion`.

### 2026-06-10 - Allowlist/Blocklist per utilizator: ponderare hibridă, exclusivitate mutuală, doar scanări viitoare

Context: lista de încredere exista doar hardcodat (brandurile verificate). Utilizatorul avea nevoie de control direct: „în acest expeditor am încredere", „pe acesta îl blochez" — atât pe adresă exactă, cât și pe domeniu întreg.

Decizie (alegeri făcute de Andrei dintre variantele propuse):

1. **Ponderare hibridă, nu override dur în ambele direcții.**
   - Blocklist = regulă dură `user_blocklist_match` cu exact `RISK_THRESHOLDS.likelyPhishing` (60) puncte. Este decizia explicită a utilizatorului, nu o euristică, deci are voie să decidă singură verdictul — de aceea ponderea stă în `USER_BLOCKLIST_RULE_POINTS`, în afara `RULE_WEIGHTS`, ca invariantele („nicio euristică nu atinge singură pragul înalt") să rămână adevărate și testabile. Legarea de prag garantează verdictul prin construcție chiar dacă pragurile se schimbă. Semnalele reale se adaugă peste podea, deci scorul rămâne informativ.
   - Allowlist = reducere puternică, NU „safe" forțat: modificatori `USER_ALLOWLIST_MODIFIERS` (contextuale ×0: reply-to mismatch, multe linkuri, URL lung, shortener, urgență, CTA, impersonare; ×0.5: social engineering, arhive), dar semnalele critice rămân la pondere plină (cerere de date sensibile, atașamente periculoase, IP-link, credențiale în URL, punycode). Motiv: un expeditor de încredere poate fi compromis — încrederea utilizatorului nu trebuie să orbească detecția de payload. Mai puternic decât stratul de brand verificat (intenția utilizatorului bate reputația domeniului); straturile se combină prin multiplicator minim (`applyScoreContextModifiers`), niciodată prin înmulțire cumulativă.
2. **Exclusivitate mutuală la nivel de schemă:** o singură intrare per `(userId, kind, value)` (index unic), `listType` e un câmp al intrării ⇒ imposibil structural ca același criteriu să fie și blocat și de încredere. Conflictul la adăugare răspunde `409 LIST_CONFLICT` cu mesaj care spune unde e deja intrarea; mutarea cere ștergere explicită (fără „switch" silențios).
3. **Precedența criteriilor:** intrarea exactă de sender bate intrarea de domeniu (mai specific câștigă) — permite „domeniul X blocat, dar colegul de la X de încredere" și invers. Domeniile se potrivesc pe sufix, ca la verificarea de brand (lookalike-urile NU se potrivesc).
4. **Doar scanări viitoare:** adăugarea/ștergerea unei intrări nu rescanează retroactiv emailurile existente; UI-ul oferă „Scan again" imediat după modificare (toast cu acțiune). Simplu, predictibil, fără joburi în fundal; bump-ul `rules-ai-v6`→`rules-ai-v7` oricum aduce rescan la următorul sync pentru emailurile actualizate.
5. **Blocat bate brand verificat în UI:** dacă utilizatorul blochează un domeniu de brand oficial, scanarea nu mai afișează „verified sender" — decizia utilizatorului are ultimul cuvânt, fără mesaje contradictorii.
6. **Separat de review-ul manual:** `mark-safe`/`mark-phishing` rămân decizii per email; trust/block e o decizie per expeditor, explicită și separată (fără auto-adăugare în liste la review).

Consecințe: utilizatorul are control direct și explicabil; povestea pentru teză e curată (decizie utilizator > reputație brand > euristici, cu plasă de siguranță pe semnalele critice); demo ușor de arătat (38→0 la trust, →100 la block, pe același email).

### 2026-06-10 - Liste: conflicte cross-kind interzise, pagină dedicată, trust score unic (verdict efectiv)

Context (feedback Andrei după prima versiune): blochezi un sender, apoi marchezi domeniul lui ca de încredere — blocarea „dispare" vizual deși precedența o aplică; listele stăteau înghesuite în Settings; Reports și Dashboard afișau „safe rate" diferit pentru aceleași emailuri.

Decizii:

1. **Conflictele cross-kind sunt respinse, nu arbitrate.** Prima versiune permitea sender rule + domain rule cu tipuri opuse și decidea prin precedență (sender > domeniu). Problema reală nu era logica, ci lizibilitatea: utilizatorul nu vedea de ce o regulă „nu se mai aplică". Acum un sender rule și un domain rule care îl acoperă (suffix-aware) nu pot avea tipuri opuse — `409 LIST_CONFLICT` în ambele direcții, cu mesaj care numește regula existentă. Precedența sender > domeniu rămâne în motor doar ca plasă de siguranță. UI-ul nu mai oferă opțiunile contradictorii (meniul afișează „Already trusted/blocked through the domain rule"). Trade-off asumat: se pierde cazul „blochez domeniul, dar am încredere într-un singur coleg de acolo" — acceptat explicit pentru claritate (cerința utilizatorului).
2. **Pagină dedicată `/sender-lists`** („Trusted & Blocked" în navigație): regulile sunt o entitate de prim rang a produsului, nu o setare. Pagina aduce ce nu încăpea în Settings: sumar (număr reguli + emailuri acoperite), căutare + filtre, numărul de emailuri pe regulă (`withMatchCounts=1`), explicația „How rules work". Settings păstrează doar un pointer.
3. **Un singur „trust score" în toată aplicația = verdictul efectiv** (review-ul utilizatorului suprascrie scanul). Reports folosea verdictul brut de scan; Dashboard folosea bucket-urile efective — aceleași emailuri, procente diferite. Agregarea lunară emite acum și split-ul efectiv (`effectiveSafe/Suspicious/LikelyPhishing/MarkedPhishing`), construit ca partiție (fiecare email scanat cade în exact o categorie — fără dubla numărare scan-verdict + user-verdict din vechiul breakdown). Reports (Safe rate + Risk breakdown) îl folosește; câmpurile brute rămân în răspuns pentru digest/email template. Ferestrele rămân diferite (30 zile vs lună calendaristică) și sunt etichetate explicit pe ambele ecrane.
4. **Dashboard ca produs:** card „Who is targeting you" (top domenii riscante pe 30 zile, bare stivuite pe severitate, click → inbox filtrat) pe endpoint dedicat; paleta de risc reîmprospătată pentru luminozitate pe fundalul aproape negru (`#3ddc97`/`#fbbf24`/`#fb637e`/`#a855f7`), schimbată central în `index.css` ca să se propage identic în grafice și badge-uri.

### 2026-06-11 - Filtru global de timp: `from`/`to` absolut, calculat în browser; Reports absorbit în dashboard

Context: statisticile erau hard-codate la 30 de zile, fiecare pagină era pe cont propriu (inbox all-time, raport doar lunar), iar un reviewer a semnalat că violetul `confirmed_phishing` pică testul de contrast.

Decizii:

1. **Intervalul comun se exprimă ca `?from=&to=` absolut (ISO 8601), nu ca `days`/`month`.** Preset-urile cerute (Yesterday, Last month) sunt ferestre fixe, pe care un număr de zile rulante nu le poate exprima. `from`/`to` sunt limbajul comun pentru toate endpoint-urile scoped; `days` și `month` rămân valide (compatibilitate cu digestul, testele și documentația), dar `from`/`to` au prioritate. Validare comună în `backend/src/common/utils/date-range.js` (`INVALID_DATE_RANGE`: ambele capete obligatorii, `from < to`).
2. **Limitele se calculează în timezone-ul browserului, backend-ul compară doar instante.** „Ieri" trebuie să însemne ziua calendaristică a utilizatorului, nu ziua UTC (offset de 3h pentru România). Frontend-ul (pur, testat: `lib/timeRange.js`) trimite timestamps absolute; backend-ul nu are nicio logică de timezone. „Last day" = 24h rulante (distinct de „Yesterday" = ziua calendaristică precedentă).
3. **Modul interval al raportului ancorează pe `receivedAt`, modul lunar rămâne pe `createdAt`.** Filtrul global înseamnă „emailurile primite în perioada X" — aceeași ancoră ca inbox-ul și stats — deci raportul pe interval acoperă exact ce vede utilizatorul. Modul lunar (digest) păstrează ancora istorică `createdAt` și invariantul `scanned ≤ synced`, neatins, ca să nu se schimbe sensul digestului existent.
4. **Starea filtrului trăiește într-un context React (`TimeRangeContext`), doar în memorie.** Picker-ul stă pe dashboard (hub-ul aplicației); inbox-ul afișează intervalul activ ca pastilă read-only. Fără persistență în URL/storage — refresh ⇒ default (Last 30 days); simplu și suficient pentru demo.
5. **Reports nu mai e pagină.** Era în mare parte statistici duplicate față de dashboard. Au supraviețuit exact două lucruri, mutate pe dashboard și legate de intervalul activ: trimiterea raportului pe email (cu `label` opțional pentru titlu) și „Most common warning signs" cu explicațiile. Restul (funnel, KPI safe-rate, risk breakdown bar, card AI) a fost șters împreună cu ruta și intrarea din nav — fără cod mort. Descrierile regulilor s-au mutat în `lib/risk.js` (sursa unică pentru limbajul de risc).
6. **Contrastul se repară doar în tokeni, cu verificare exactă.** Audit cu reproducerea matematică a `color-mix(in oklab …)` pentru fundalurile `-soft` (acolo pica de fapt violetul: text pe badge, 4.21:1). `--color-risk-phishing` #a855f7 → #b873f9 (doar lightness; rămâne treapta violet, distinctă de rose). Toate cele 5 culori de risc trec acum AA (4.5:1 text, 3:1 UI) pe background, card și soft. Nicio culoare per componentă.

Consecințe: o singură definiție a perioadei în toată aplicația (dashboard, inbox, raport — imposibil să difere), API compatibil înapoi, poveste de accesibilitate verificabilă pentru teză.
