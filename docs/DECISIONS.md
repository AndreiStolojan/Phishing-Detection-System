# DECISIONS

## Scop

Acest document păstrează deciziile tehnice importante. El este util ca să nu re-discutăm aceeași alegere de fiecare dată.

Format recomandat pentru deciziile viitoare:

- dată
- decizie
- motiv
- impact

## Decizii inițiale

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
- `frontent-raw/` conține UI util pentru login/register, dar logica Firebase și brandul vechi nu aparțin proiectului de phishing;
- păstrarea unei singure teme dark reduce timpul de implementare și evită polish vizual prematur;
- cromatica finală poate fi schimbată după ce fluxul principal funcționează.

Impact:

- se va crea un folder separat `frontend/`, cu `src/`;
- UI-ul de auth poate refolosi idei vizuale din `frontent-raw`, dar fără Firebase;
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
