# TODO

## Scop

Acest document este planul practic de implementare. El trebuie actualizat pe măsură ce proiectul avansează. `TODO.md` spune ce mai este de făcut. `PROGRESS.md` spune unde am rămas acum.

## Reguli de actualizare

- Când un task este terminat, checkbox-ul trebuie bifat.
- Când apare o nevoie nouă care afectează MVP-ul, taskul trebuie adăugat aici.
- Dacă apare ceva opțional, se pune în secțiunea `După MVP`.
- Ordinea taskurilor trebuie păstrată realistă.

## Progres general

- Proiect: `xai-licenta`
- Stadiu actual: backend stabil, Faza 17 completă, Faza 18 (redesign frontend) implementată. Urmează: test manual cap-coadă cu Gmail real + capturi demo.
- Progres estimativ MVP: `99%` backend · `90%` produs final (rămâne validare manuală end-to-end + demo)
- Faza curentă: `Faza 18 - Redesign frontend profesional (implementat, de validat manual)`
- Deadline: ~2 zile pentru app, ~10 zile pentru draft lucrare (termen: ~2026-06-17)

## Legendă

- `[ ]` neînceput
- `[-]` în lucru
- `[x]` terminat

## Faza 0 - Context și plan

Milestone: documentație de bază și direcție clară

- [x] Definire direcție MVP
- [x] Document principal de context (`LICENTA.md`)
- [x] Plan de implementare (`TODO.md`)
- [x] Arhitectură backend (`ARCHITECTURE.md`)
- [x] Plan API (`API_PLAN.md`)
- [x] Checklist teste manuale backend (`MANUAL_TESTS.md`)
- [x] Regulile de detecție (`PHISHING_RULES.md`)
- [x] Note de învățare (`LEARNING_NOTES.md`)
- [x] Fișier pentru progres curent (`PROGRESS.md`)
- [x] Fișier pentru decizii tehnice (`DECISIONS.md`)
- [x] Fișier roadmap (`ROADMAP.md`)

Dependențe: fără dependențe anterioare

## Faza 1 - Setup backend

Milestone: aplicație Express pornită curat

- [x] Inițializare structură backend modulară
- [x] Reorganizare codul runtime în `src/`
- [x] Mutare backend în folder dedicat `backend/`
- [x] Configurare directoare principale
- [x] Configurare `express`
- [x] Separare `app.js` de `server.js`
- [x] Configurare `dotenv`
- [x] Configurare fișier central de config
- [x] Configurare middleware de bază
- [x] Configurare handling pentru erori
- [x] Endpoint simplu de health check
- [x] Scripturi utile în `package.json`
- [-] Aliniere naming pentru endpoint-uri și fișiere

Dependențe: Faza 0

Obligatoriu pentru MVP: da

## Faza 2 - Baza de date și utilizatori

Milestone: MongoDB conectat și utilizatori salvați corect

- [x] Configurare conexiune MongoDB
- [x] Configurare Mongoose
- [x] Creare model `User`
- [-] Validări de bază pentru utilizator
- [x] Hash parolă
- [x] Test manual pentru creare utilizator
- [x] Ascundere explicită a parolei din răspunsurile publice
- [x] Introducere `passwordHash`
- [x] Introducere `role` cu default `user`

Dependențe: Faza 1

Obligatoriu pentru MVP: da

## Faza 3 - Auth cu JWT

Milestone: userul se poate înregistra și autentifica

- [x] Endpoint `register`
- [x] Endpoint `login`
- [x] Generare token JWT
- [x] Middleware de autentificare
- [x] Rută protejată de test
- [x] Mesaje de eroare clare pentru auth
- [x] Mutare logică auth din controller în service
- [x] Decizie finală pentru `register/login` vs `sign-up/sign-in`
- [x] Validări dedicate pentru `register/login`
- [x] Decizie finală pentru strategia de persistență token în aplicația finală
- [x] Alegere endpoint unic pentru utilizatorul curent (`users/me`)
- [x] Definire strategie bootstrap pentru primul admin

Dependențe: Faza 2

Obligatoriu pentru MVP: da

## Faza 4 - Modul users

Milestone: profil minim utilizator

- [x] Endpoint pentru profilul curent
- [x] Endpoint pentru actualizare setări simple
- [x] Endpoint pentru pornit/oprit AI per utilizator (`PATCH /api/v1/users/me/ai-settings`)
- [x] Definire clară a datelor returnate public
- [x] Restricționare endpoint-uri users pentru admin

Dependențe: Faza 3

Obligatoriu pentru MVP: da

## Faza 5 - Integrare mail account

Milestone: conectare cont de email, cu focus pe Gmail

- [x] Alegere mecanism principal pentru Gmail
- [x] Creare model `MailAccount`
- [x] Salvare conexiune mail account
- [x] Endpoint pentru conectare cont
- [x] Endpoint pentru listare conturi conectate
- [x] Endpoint pentru deconectare cont
- [x] Salvare stare sync și metadate utile
- [x] Setare `syncMaxResults` pentru sync Gmail, cu interval valid `1..50` și default `10`

Dependențe: Faza 3

Obligatoriu pentru MVP: da

Notă: varianta principală recomandată este un singur provider la început, Gmail.

## Faza 6 - Sync emailuri

Milestone: aplicația citește și salvează emailuri

- [x] Alegere strategie de sync inițial
- [x] Creare model `Email`
- [x] Implementare serviciu de citire emailuri
- [x] Salvare emailuri brute și metadate utile
- [x] Evitare duplicatelor prin `providerMessageId`
- [x] Endpoint pentru declanșare sync manual
- [x] Salvare `lastSyncedAt`
- [x] Logare clară a erorilor de sync
- [x] Test manual end-to-end pentru flow-ul `register -> login -> connect Gmail -> sync manual`

Dependențe: Faza 5

Obligatoriu pentru MVP: da

## Faza 7 - Extracție date relevante din email

Milestone: emailurile au date pregătite pentru analiză

- [x] Extracție `from`, `subject`, `receivedAt`
- [x] Parsare linkuri
- [x] Parsare domenii din linkuri
- [x] Parsare atașamente și extensii
- [x] Detectare semantică pentru text urgent și cereri sensibile (prin strat AI local)
- [x] Salvare câmpuri derivate în email

Dependențe: Faza 6

Obligatoriu pentru MVP: da

## Faza 8 - Motor de detecție phishing

Milestone: scor și motive pentru fiecare email

- [x] Definire set inițial de reguli
- [x] Implementare funcție de scoring
- [x] Creare model `Scan`
- [x] Salvare reguli declanșate
- [x] Salvare scor final
- [x] Mapare scor -> verdict
- [x] Endpoint pentru scan manual
- [x] Endpoint pentru ultima scanare a unui email
- [x] Test manual pentru scanare și `latest`
- [x] Scan automat după sync (flow unificat, fără pas manual separat)
- [x] Regula de rescanare la sync: scan pentru emailuri noi, iar pentru emailuri actualizate doar dacă lipsește scanarea curentă sau s-a schimbat versiunea motorului
- [x] Protecție pentru emailurile revizuite: mesajele cu `userVerdict` sunt sărite la rescanarea automată
- [x] Scanare de tip `upsert` (o scanare curentă per email, fără istoric duplicat)
- [x] Protecție la concurență pentru scanarea curentă prin index unic `userId + emailId` și upsert atomic
- [x] Integrare semnale AI semantice locale (`urgency`, `sensitiveDataRequest`, `socialEngineering`, `loginOrActionRequest`, `brandImpersonation`)
- [x] Salvare metadata AI pentru comparare modele (`model`, `promptVersion`, `latencyMs`, `status`)
- [x] Explainability controlată în backend, în română, cu fallback dacă Ollama nu este disponibil
- [x] Stabilizare integrare Ollama local: fallback host local și erori AI diferențiate pentru debugging
- [x] Introducere scor hibrid: `ruleScore + aiScore` cu limită superioară pentru componenta AI
- [x] Respectare setare AI per utilizator: când AI este oprit nu se apelează Ollama, iar când este pornit scanările făcute fără AI pot fi completate prin rescanare eligibilă

Dependențe: Faza 7

Obligatoriu pentru MVP: da

## Faza 9 - Afișare rezultate și acțiuni

Milestone: emailul poate fi văzut împreună cu verdictul și acțiunile

- [x] Endpoint listare emailuri
- [x] Endpoint detalii email
- [x] Endpoint rezultat scan
- [x] Endpoint `mark safe`
- [x] Endpoint `mark phishing`
- [x] Expunere în endpoint-urile de email a stării derivate pentru UI (`userVerdict`, `reviewStatus`, `effectiveVerdict`, `verdictSource`, `isQuarantined`, `riskBucket`)
- [x] Aliniere semantică finală pentru `effectiveVerdict`, `isQuarantined` și `riskBucket`
- [x] Filtrare `GET /api/v1/emails` după starea finală pentru UI (`effectiveVerdict` și `riskBucket`), cu total de paginare aliniat
- [x] Endpoint sumar lunar phishing (`GET /api/v1/reports/monthly-summary`)
- [x] Endpoint trimitere manuală digest lunar phishing (`POST /api/v1/reports/monthly-summary/send`)
- [x] Analiză fezabilitate `move to spam/junk`
- [x] Implementare `move to spam/junk` doar la `mark-phishing` manual pentru Gmail

Dependențe: Faza 8

Obligatoriu pentru MVP: da, cu excepția `move to spam/junk` care este condiționat de provider

## Faza 10 - Lists și reguli locale

Milestone: eliminat din MVP pentru a păstra flow-ul manual simplu

- [x] Eliminare endpoint-uri publice pentru lists
- [x] Eliminare acțiuni `allow/block sender/domain`
- [x] Eliminare influență allowlist/blocklist din scoring
- [x] Eliminare `listMembership` din răspunsurile emailurilor
- [x] Simplificare `mark-phishing`: setează verdictul local și încearcă mutarea în Gmail Spam

Notă: allowlist/blocklist pot rămâne idei pentru după MVP, dar nu mai sunt funcționalitate vizibilă și nu mai influențează scorul.

Dependențe: Faza 9

Obligatoriu pentru MVP: da

## Faza 11 - Jobs automate

Milestone: sync și scan automate de bază

- [ ] Definire job manual sau programat simplu
- [ ] Sync periodic pentru conturile active
- [x] Scan automată pentru emailurile noi în flow-ul de sync manual
- [x] Evitare re-scan inutil în flow-ul de sync manual
- [ ] Decizie finală dacă MVP-ul mai are nevoie de scheduler sau dacă sync-ul manual este suficient pentru demonstrație

Dependențe: Faza 8

Obligatoriu pentru MVP: util, dar poate fi redus dacă timpul este scurt

## Faza 12 - Explainability cu Ollama

Milestone: explicații locale, ușor de citit

- [x] Definire format de input semantic pe text complet relevant
- [x] Trimitere către Ollama local a contextului minim necesar pentru semnale
- [x] Fallback dacă Ollama nu este disponibil
- [x] Păstrare separată între verdictul principal și semnalele/explicația AI
- [x] Ajustare finală a explicației pentru UI ca obiect simplu cu `summary` în 1-3 fraze și recomandare inclusă
- [x] Salvare metadata explicație (`aiExplanationMeta`) pentru sursă, fallback, model și latență

Dependențe: Faza 8

Obligatoriu pentru MVP: nu, este etapa imediat după MVP-ul funcțional

## Faza 13 - Polish, testare și pregătire de prezentare

Milestone: proiect coerent și prezentabil

- [ ] Curățare naming și structură
- [x] Analiză backend pe fișiere și endpoint-uri (`docs/BACKEND_REVIEW.md`)
- [x] Decizie contract API final înainte de reconstruirea frontend-ului
- [x] Curățare contract backend strict necesară pentru frontend
- [x] Mutare cod runtime în `src/`, fără refactor mare pe module
- [x] Mutare fișiere backend în `backend/`, fără creare de `frontend/`
- [x] Verificare flux complet cap-coadă
- [ ] Test manual `reconnect Gmail -> sync -> mark-phishing -> verificare mesaj în Gmail Spam`
- [x] Test manual `POST /api/v1/reports/monthly-summary/send?month=YYYY-MM` cu `EMAIL_FROM` și `EMAIL_PASSWORD`
- [x] Test manual pentru stările emailului: `safe`, `suspicious`, `likely_phishing`, `phishing`, `pending_review`, `reviewed`, `riskBucket`
- [x] Document checklist pentru testele manuale ale endpoint-urilor backend (`docs/MANUAL_TESTS.md`)
- [ ] Seed minim sau date demo
- [ ] Capturi sau scenarii de demonstrare
- [x] Documentație de rulare în `README.md`
- [x] README profesional pentru recrutori, cu status și limitări
- [ ] Documentație pentru prezentare
- [ ] Revizuire riscuri și limitări

Dependențe: Faza 9 minim

Obligatoriu pentru MVP: da

## Faza 14 - Frontend minim pentru demonstrație

Milestone: interfață web simplă peste API-ul backend existent

Status 2026-06-02: frontend-ul a fost reconstruit ca `SecureInbox`, cu UI în engleză, layout de inbox pe 3 panouri, randare HTML sanitizată și teste unitare.

- [x] Documentare plan frontend pe termen lung (`docs/FRONTEND_PLAN.md`)
- [x] Documentare taskuri mici pentru agenți (`docs/FRONTEND_AGENT_TASKS.md`)
- [x] Inițializare folder `frontend/` cu React + Vite
- [x] Creare structură `frontend/src/` sănătoasă
- [x] Configurare temă dark-only pentru MVP
- [x] Implementare client API cu Bearer token
- [x] Implementare auth frontend peste backend (`register/login/users/me`)
- [x] Implementare UI login/register fără Firebase, pe auth-ul backend
- [x] Layout aplicație cu navigare
- [x] Dashboard cu status Gmail și sync manual
- [x] Listare emailuri cu filtre după `riskBucket`
- [x] Detalii email cu scanare, reguli și `aiExplanation`
- [x] Acțiuni `mark-safe` și `mark-phishing`
- [x] Raport lunar și trimitere digest manual
- [x] Settings pentru profil, AI on/off și `syncMaxResults`
- [x] Avatar utilizator încărcat local, comprimat în browser și salvat pe profil
- [x] Chat/contact suport din interfață, cu trimitere către adresa configurată în `EMAIL_FROM`
- [x] Polish vizual: brand `XAI Phishing Shield`, iconițe mai clare, sidebar/topbar modern și footer `@XAI - drepturi rezervate`
- [x] Sidebar collapsible/resizable pe desktop, cu animație smooth pentru extinderea paginii
- [x] Mutare profil și logout în sidebar; topbar doar pentru titlul paginii, Settings și chat
- [x] Folosire `DELETE /api/v1/mail-accounts/:id` în Settings pentru deconectarea contului Gmail
- [x] Simplificare Dashboard: conectare Gmail doar când nu există cont, sync + scan când contul este activ
- [x] Filtru după cont Gmail în lista de emailuri
- [x] Mapări UI pentru enum-uri/statusuri tehnice, fără underscore brut în ecranele principale
- [x] Polish digest lunar: status orientat pe informații utile, nu pe ID-uri tehnice
- [x] Animații fine pentru tranzițiile dintre pagini și stările comune de loading/error/empty
- [x] Charturi și statistici relevante pentru dashboard și rapoarte folosind datele existente
- [x] Curățare `frontent-raw/` după adaptarea UI-ului de auth
- [x] Polish UX final pentru sidebar, dashboard, rapoarte și settings full width
- [x] Ștergere folder `frontend/` pentru refacere ulterioară
- [x] Reconstruire frontend după decizia contractului API
- [x] UI `SecureInbox` în engleză, Gmail-only pentru MVP
- [x] Layout desktop cu 3 panouri: filtre, listă emailuri, detaliu
- [x] Randare `htmlBody` sanitizată cu blocare imagini remote
- [x] Teste unitare frontend în `frontend/tests/unit`
- [x] Teste unitare backend în `backend/tests/unit`

Dependențe: Faza 13 și API backend stabil

Obligatoriu pentru MVP: da

## Faza 15 - Verificare finală și pregătire demo

Milestone: aplicația poate fi demonstrată coerent cap-coadă

- [x] Comandă teste backend: `npm --prefix backend test`
- [x] Comandă teste frontend: `npm --prefix frontend test`
- [x] Build frontend: `npm --prefix frontend run build`
- [ ] Test manual cu utilizator real și Gmail conectat
- [ ] Capturi pentru prezentare
- [ ] Script demo scurt pentru coordonator

## Faza 16 - Bug fixes critice (înainte de orice feature nou)

Milestone: toate bug-urile cunoscute rezolvate, aplicația funcționează corect end-to-end

Context: bug-uri găsite în code review pe 2026-06-05. Trebuie rezolvate înainte de orice altceva.

- [x] Bug 1 — AI toggle: `user.service.js:63` — `payload.aiEnabled === 1` → `Boolean(payload.aiEnabled)`
- [x] Bug 2 — Ollama model undefined: `ollama-explanation.service.js:8` — adăugare fallback `|| 'gemma3:4b'`
- [x] Bug 3 — Fallback explanation ignoră `triggeredRules`/`aiSignals`: `scan-explanation.service.js:115-123` — folosire funcție completă sau curățare parametri neutilizați
- [x] Bug 4 — MongoDB transaction rupe înregistrarea pe MongoDB standalone: `auth.service.js:27-60` — eliminare session/transaction din `User.create()`

Dependențe: Faza 14

Obligatoriu pentru MVP: da, critic

## Faza 17 - Auto-sync scheduler și notificări

Milestone: aplicația rulează în fundal fără intervenție manuală; utilizatorul primește alerte și digest

Context: feedback coordonator 2026-06-05 — aplicația trebuie să funcționeze fără ca utilizatorul să deschidă Gmail sau să apese manual sync. Implementare cu `node-cron` (polling). La deploy pe server, trigger-ul poate fi înlocuit cu Gmail Push Notifications (Pub/Sub) fără să se schimbe logica de sync/scan.

- [x] Instalare și configurare `node-cron` în backend
- [x] Job de auto-sync: rulează la fiecare 15 minute, iterează toți utilizatorii cu Gmail conectat, apelează logica existentă de sync+scan
- [x] Configurare interval prin env var (`SYNC_INTERVAL_MINUTES`, default `15`)
- [x] Logging clar pentru fiecare run al job-ului (câți utilizatori, câte emailuri noi, erori)
- [x] Instant alert email: trimite email când un email nou este detectat ca `likely_phishing` (opt-in, toggle în setările utilizatorului)
- [x] Adăugare câmp `alertsEnabled` în modelul `User` (default `false`)
- [x] Endpoint `PATCH /api/v1/users/me/notification-settings` pentru toggle alerts
- [x] Daily digest auto-schedulat: job separat `node-cron` la ora 08:00 care trimite digestul zilnic utilizatorilor cu emailuri noi sau riscante în ultimele 24h
- [x] Daily digest folosește logica existentă de raport, adaptată pentru intervalul de 24h

Dependențe: Faza 16

Obligatoriu pentru MVP: da (cerință coordonator)

Note pentru deploy: la trecerea pe server, job-ul `node-cron` poate fi înlocuit sau completat cu Gmail Push Notifications (Google Cloud Pub/Sub). Logica de sync/scan nu se schimbă, doar trigger-ul.

## Faza 18 - Redesign frontend profesional

Milestone: interfață curată, modernă, care arată ca un produs real, nu ca un proiect de facultate

Context: feedback coordonator 2026-06-05 — aplicația trebuie să arate ca ceva pe care oamenii ar vrea să-l folosească. Focus pe security overlay peste fluxul de email, nu pe inbox clasic. Frontend rebuild de la zero.

- [x] Definire design system: culori, tipografie, spațiere, ton vizual (Tailwind v4 + shadcn, dark-only, 6 risk buckets în `src/lib/risk.js`)
- [x] Layout principal: sidebar + content area, responsive pentru desktop (`AppShell` + `Sidebar` + `Topbar`)
- [x] Pagina de Login / Register — curată, profesională (adaptată după `athlete_atlas`, fără Firebase/Google)
- [x] Inbox: listă emailuri cu risk badge clar, filtre funcționale, search
- [x] Email detail: metadata, verdict proeminent, reguli declanșate, explicație AI, acțiuni review
- [x] Dashboard: statistici relevante (scanate, risc, breakdown donut), stare sync, mesaje care necesită atenție
- [x] Reports: raport lunar, top reguli, statistici AI, trimitere digest pe email
- [x] Settings: profil, Gmail connect/disconnect, AI on/off, syncMaxResults, alerts on/off (Faza 17), contact suport
- [x] State-uri goale și loading tratate vizual în toate paginile (`states.jsx`)
- [x] Teste unitare pentru componentele noi (build + 18 teste trec)

Dependențe: Faza 16, API backend stabil

Obligatoriu pentru MVP: da

Dependențe: Faza 14

Obligatoriu pentru MVP: da

## Taskuri critice pentru MVP

- [x] Server Express funcțional
- [x] MongoDB conectat
- [x] Register și login
- [x] JWT și protecția rutelor
- [x] Profil utilizator curent (`users/me`)
- [x] Health check
- [x] Conectare cont Gmail
- [x] Sync emailuri
- [x] Salvare emailuri
- [x] Extracție linkuri și metadate utile
- [x] Scor phishing bazat pe reguli + semnale AI locale
- [x] Verdict și motive clare
- [x] Listare emailuri și rezultat scan
- [x] `mark safe`
- [x] `mark phishing`
- [x] Semantica finală pentru `userVerdict`, `effectiveVerdict`, `isQuarantined` și `riskBucket`
- [x] Sumar lunar phishing
- [x] Digest lunar manual pe email
- [x] Persistență sigură pentru scanarea curentă sub concurență (`Scan` unic per `userId + emailId`)
- [x] Test manual cap-coadă după reconectare Gmail cu scope `gmail.modify`

## Note de mentenanță locală

- Dacă există duplicate vechi în colecția `scans`, ele trebuie curățate înainte ca indexul unic `userId + emailId` să poată fi construit de MongoDB.
- Pentru development se poate rula din `backend/`: `npm run cleanup:duplicate-scans`. Scriptul păstrează cea mai recentă scanare pentru fiecare pereche `userId + emailId` și șterge restul.

## Taskuri opționale dacă rămâne timp

- [x] `move to spam/junk` pentru Gmail doar după `mark-phishing` manual
- [ ] allowlist/blocklist locale, dacă se decide că merită după MVP
- [ ] filtre Gmail automate pentru emailuri viitoare, dacă se decide că merită după MVP
- [ ] suport pentru încă un provider de email
- [x] dashboard mai bun pentru statistică
- [ ] reputație URL prin servicii externe
- [ ] verificare vârstă domeniu
- [ ] calibrare explainability și scor AI pe set mai mare de emailuri
- [ ] job scheduler mai avansat

## Dependențe majore între faze

| Ce vrei să faci | De ce depinde |
| --- | --- |
| auth | setup backend + MongoDB + User model |
| conectare email | auth |
| sync emailuri | mail account conectat |
| scanare phishing | emailuri salvate + date extrase |
| acțiuni pe email | emailuri listate + identificatori clari |
| explainability cu Ollama | scanare funcțională |

## Faza 19 - Visual polish per pagină

Milestone: fiecare pagină arată profesional și consistent, identic ca ton vizual cu stilul `athlete_atlas`

Context: audit vizual 2026-06-05 — fiecare pagină a fost inspectat, probleme identificate per pagină.

### Login / Register

- [x] Adăugare câmp `confirmPassword` în modul register (câmpul lipsește complet — userul nu poate verifica parola la înregistrare)
- [x] Reducere lățime card de la `max-w-md` (448px) la `w-[400px]` fix (exact ca athlete_atlas)
- [x] Mărire icon header: de la `h-6 w-6` la `h-8 w-8`, iar container-ul de la `h-12 w-12` la `h-16 w-16` (aceeași greutate vizuală ca `<Lock fontSize={40}>` din athlete_atlas)
- [x] Mărire titlu: de la `text-xl` la `text-2xl font-bold` (h4 echivalent)
- [x] Validare `confirmPassword` în `handleSubmit`: dacă `password !== confirmPassword` → eroare

### Dashboard

- [x] Donut center label cu total deja existent — nicio modificare necesară
- [x] Stat cards: hint text mai vizibil — schimbat de la `text-muted-foreground` la `text-foreground/60`

### Inbox

- [x] Adăugare badge cu număr per filtru chip (ex: "Quarantine (3)") — necesită query separat pentru counts
- [x] Bara de search și filtrele pe același rând pe desktop (flex-row cu search aliniat dreapta)

### Email Detail

- [x] Adăugare `<PageHeader>` consistent cu restul paginilor (titlu = subiectul emailului + sender + dată)
- [x] Panel-ul de securitate (coloana dreaptă) — `lg:sticky lg:top-4 lg:self-start`

### Reports

- [x] Secțiunea AI analysis: adăugare descriere text explicativ sub fiecare număr ("by Ollama", "Ollama unavailable", "AI turned off")

### Settings

- [x] Label pentru `syncMaxResults` reformulat: "How many recent emails to scan per sync (1–50)"

Dependențe: Faza 18

Obligatoriu pentru MVP: da — aspectul este parte din prezentarea la coordonator

## Faza 20 - Animații, navigare mobilă și polish avansat

Milestone: aplicația se simte fluidă, navigabilă pe orice dispozitiv, cu animații coerente

Context: audit UX 2026-06-05 — gaps identificate per pagină și per componentă. Se implementează câte un item, în ordinea de mai jos.

### Shell & Layout

- [x] Mobile bottom nav — sidebar este ascuns pe mobile (`hidden md:flex`), aplicația este inutilizabilă pe telefon; se adaugă o bară fixă jos cu 4 iconițe (Dashboard, Inbox, Reports, Settings)
- [x] Page fade-in transition — `motion.div` cu `opacity 0→1` și `translateY +6px→0` la schimbarea rutei (150ms); înlocuiește swap-ul brusc
- [x] Skeleton screens — înlocuire `LoadingState` generic cu schelet de conținut specific per pagină (inbox = 10 rânduri skeleton, dashboard = 4 stat cards + donut)

### Dashboard

- [x] Count-up animation pe stat cards — numerele animează de la 0 la valoarea reală la mount (500ms ease-out)
- [x] Stagger entrance pe cele 4 stat cards — fade+slide cu 60ms întârziere între carduri
- [x] Last sync timestamp în headerul cardului "Needs your attention"
- [x] Accent vizual pe cardul "Needs your attention" — border stânga roșu pentru urgență

### Inbox

- [x] Debounce search la 300ms — oprire spam API la fiecare tastă
- [x] Counts pe filter chips — ex: "Quarantine (4)"; date din monthly summary
- [x] Left border colorat per risk bucket pe fiecare EmailRow (3px, culoarea riscului)
- [x] Grupare emailuri după dată — "Today", "Yesterday", "This week", apoi dată completă

### Email Detail

- [x] VerdictBanner mai impactant vizual — pentru `likely_phishing`: border pulsant roșu sau fill mai dramatic; pentru `safe`: bară verde cu checkmark
- [x] Navigare Prev/Next — butoane ← → pentru a naviga între emailuri fără să te întorci în inbox
- [x] Ordine vizuală clară în panelul de securitate — Verdict (mare) → Review actions → Scan details (colapsibil)

### Reports

- [x] Înlocuire `<dl>` summary cu StatCard-uri — același limbaj vizual ca dashboard-ul
- [x] Toast pentru confirmarea trimiterii raportului — înlocuire banner static cu `sonner` toast

Dependențe: Faza 19

Obligatoriu pentru MVP: da — navigarea mobilă este broken; restul cresc calitatea demonstrației

## Faza 21 - UX gap fixes (audit 2026-06-05)

Milestone: inbox-ul se citește clar, informațiile nu se suprapun, UI-ul este coerent pe toate ecranele

Context: audit UX complet cu screenshot-uri și code review 2026-06-05. Probleme identificate per componentă.

### EmailRow — probleme de spațiu și lizibilitate

- [x] **Data prea verbosă în rând** — `formatEmailDate()` adăugat în `utils/formatDate.js`; `EmailRow.jsx` folosește formatul smart.
- [x] **Eticheta badge-ului prea lungă** — `SM_LABELS` adăugat în `RiskBadge.jsx`: "Confirmed phishing" → "Phishing", "Reviewed safe" → "Reviewed" la size sm.
- [x] **Filtre redundante în inbox** — "Reviewed safe" și "Unscanned" eliminate din `RISK_FILTERS` în `risk.js`.

### EmailDetailPage — informații duplicate și suprapuneri

- [x] **Subiectul apare de două ori** — `CardTitle` cu subiectul eliminat; cardul arată acum expeditorul + data ca header.
- [x] **RiskBadge apare de două ori** — `RiskBadge` eliminat din bara de navigare sus; rămâne doar în `VerdictBanner`.
- [x] **Bara superioară aglomerată** — rezolvat prin eliminarea RiskBadge din bara de sus.

### Dashboard — conflicte vizuale

- [x] **Dublu border stânga pe cardul "Needs attention"** — `border-l-2 border-l-risk-quarantine` eliminat de pe card.
- [x] **Terminologie inconsistentă Quarantine vs Likely phishing** — `StatCard` redenumit "Likely phishing" cu hint "In quarantine".

### Reports — prea multe carduri

- [x] **8 StatCard-uri copleșitoare** — reorganizat în două grupuri: `SYNC_STATS` (Synced, Scanned) și `RISK_STATS` (Safe, Suspicious, Likely phishing, Confirmed phishing). `quarantined` și `reviewed` eliminate.
- [x] **Iconițe identice** — rezolvat prin eliminarea rândului `quarantined`.

### Layout / navigare

- [ ] **Topbar mobil — butonul "Connect Gmail" prea lat** — pe 390px cu brand icon + titlu pagină pe stânga + "Connect Gmail" (text + icon) pe dreapta, spațiul este comprimat. Pe mobile, afișează doar iconița în buton (fără text). Fișier: `Topbar.jsx`.
- [ ] **BottomNav fără suport safe-area iPhone** — bara fixă `h-16` acoperă home indicator-ul pe iPhone notched. Fișiere: `BottomNav.jsx`, `index.css`.
- [x] **GmailChip în Topbar — email lung fără truncate** — adăugat `max-w-[200px] truncate` pe span-ul cu adresa. Fișier: `Topbar.jsx`.

### Polish fin

- [x] **Apariția bruscă a checklist-ului de parolă la register** — `AnimatePresence` + `motion.ul` cu animație de înălțime adăugat în `LoginPage.jsx`.
- [x] **StatCard: iconița nu reflectă culoarea tonului** — container iconiță folosește acum soft-ul corespunzător tonului (safe, quarantine, phishing, review). Fișier: `StatCard.jsx`.

Dependențe: Faza 20

Obligatoriu pentru MVP: da — toate completate

## Faza 22 - UI Premium Upgrade (Apple-grade)

Milestone: UI modern, simplu, premium — "simple and just works beautifully", comparabil cu produse Apple. Audit complet cu 12 agenți (un designer/suprafață + sinteză) pe 2026-06-05.

Context: cerere Andrei 2026-06-05 — transformare UI în experiență premium (animații, date afișate, template email digest, culori, cum sunt afișate emailurile în inbox și la deschidere, scalare). Checkpoint de siguranță înainte de start: commits `b639409` (backend) · `110495b` (frontend) · `9c7ff4f` (docs), pushed pe `origin/main`.

Documente sursă (durabile, în caz de pierdere context):
- Plan complet + direcție de design: `docs/UI_PREMIUM_PLAN.md`
- Findings brute, verbatim, per suprafață (12 agenți): `docs/archive/ui-premium-audit-raw-2026-06-05.json`

Regulă de ordine: fundație întâi (tokens/type/motion) → primitive shared → shell → polish per pagină → template-uri email. Fiecare fază se bazează pe cea anterioară.

- [x] **Faza 1 — Fundație tokens**: self-host InterVariable + type scale + elevation ramp + motion tokens (`lib/motion.js`) + recolor risk OKLCH (păstrează numele tokenilor) + lift soft backgrounds + MotionConfig reduced-motion. Fișiere: `index.css`, `index.html`, `lib/motion.js` (nou), `main.jsx`, `public/fonts/`. Build curat 2026-06-06.
- [x] **Faza 2 — Primitive shared**: Button (active:scale press + primary-hover), Card (surface-raised + interactive lift), Input + Textarea nou (soft focus ring), Switch iOS-grade 28x48, Skeleton shimmer, AlertDialog nou (Dialog generic amânat până e nevoie), PageHeader cu type scale + eyebrow. Build curat 2026-06-06.
- [x] **Faza 3 — Shell & navigare**: Sidebar/BottomNav traveling `layoutId` indicator (bg + accent bar), frosted material backdrop-blur-xl, wordmark `SecureInbox`, live Gmail status ping, chevron pe user dropdown, PageTransition spring enter + scroll-reset, FAB cu AnimatePresence + safe-area. Build curat 2026-06-06. (drill-down direcțional amânat în Faza 6.)
- [x] **Faza 4 — Inbox & EmailRow**: stagger entrance (index delay) + whileTap + focus-visible ring; leading risk-icon (loud) vs sender monogram (quiet); ierarhie 15px/sm/caption; emphasis risc (`tone.emphasis`) — bar + badge doar pe loud; filter chips segmented cu `layoutId` pill colorat pe tonă + counts ascunse la search; search cu clear/spinner/`/` shortcut; group headers calm (non-sticky, hairline); pagination touch targets 36px. Build curat 2026-06-06. (Unscanned NU re-adăugat — respect decizie Faza 21.)
- [ ] **Faza 5 — Verdict UI (heart)**: VerdictBanner hero + reveal animat keyed pe riskBucket; ReviewActions cu Check animat + Sonner toast + optimistic; ScanDetails ca narativ (AI explanation primar, evidence colapsat, score bars animate); RiskBadge tooltip + spring. Fișiere: `security/*`, `lib/risk.js`, `docs/DECISIONS.md`.
- [ ] **Faza 6 — Reading view + privacy gate**: reguli `.email-body` reale; privacy gate (blochează imagini remote pentru buckets riscante, "Load images"); keyboard nav ←/→/Esc; reading width ~68ch; entrance spring direcțional. Fișiere: `index.css`, `inbox/EmailBody.jsx`, `utils/sanitizeEmailHtml.js`, `pages/EmailDetailPage.jsx`.
- [ ] **Faza 7 — Dashboard posture**: posture hero band ("You're protected" / "N need attention"), donut interactiv center=safe%, StatCard linkate la filtre + count-up doar la schimbare reală, attention list slim. Fișiere: `pages/DashboardPage.jsx`, `dashboard/*`, `common/states.jsx`.
- [ ] **Faza 8 — Reports**: month stepper, TopRulesChart colorat pe severitate + entrance, AI "Failed" neutral (nu amber), ierarhie stat + send-report success, ReportsSkeleton, eliminare double error. Fișiere: `pages/ReportsPage.jsx`, `reports/TopRulesChart.jsx`, `common/states.jsx`.
- [ ] **Faza 9 — Settings + Login**: **AlertDialog pe Disconnect Gmail (blocker)**, grouped-list layout, toggle rows; Login cu entrance spring, ambient background, morph sign-in↔register, password strength, fix naming. Fișiere: `pages/SettingsPage.jsx`, `pages/LoginPage.jsx`, `index.html`, `ui/switch.jsx`, `ui/alert-dialog.jsx`.
- [ ] **Faza 10 — Motion sweep & cleanup**: tot motion din `lib/motion.js`, verificare reduced-motion, tabular-nums, lint + teste + build + manual E2E, update docs. Fișiere: `frontend/src/`, docs.
- [ ] **Faza 11 — Template-uri email premium**: shell email comun (welcome/digest/alert), **CTA cu link (blocker)**, hexes risc canonice, kill gradient/emoji, dark-mode variant, digest hero cu safe-rate %. Fișiere: `backend/extras/notifications/email.template.js`, `send-email.js`, `config/env.js`.

### Întrebări deschise (de decis cu Andrei înainte de fazele relevante)
- [ ] Dark-only pentru demo dar tokens theme-aware (recomandat) vs light mode acum?
- [ ] Font: InterVariable self-hosted (recomandat) vs display face SF-like plătit?
- [ ] Naming canonic: "SecureInbox" vs "XAI Phishing Shield"?
- [ ] Cât de îndrăzneț pe motion/atmosferă (flourish-uri signature vs minimal pentru timeline)?
- [ ] Dashboard: OK restructurare în posture hero + donut interactiv (center = safe%)?
- [ ] Inbox: paginare numerică vs infinite scroll; features de triage mari sau doar polish?
- [ ] Filter counts: ascunde la search (quick) vs counts scoped din backend?
- [ ] Privacy gate: blochează imagini remote default pe buckets riscante?
- [ ] Locale email: RO, EN, sau per-user?
- [ ] Culoare phishing-CTA: rose quarantine + brick pentru confirmed (de notat în DECISIONS.md)?

Dependențe: Faza 21
Obligatoriu pentru MVP: nu (MVP e ~99%) — îmbunătățire de calitate/prezentare pentru coordonator

## Unde am rămas

Ultimul punct finalizat: Faza 21 completă (UX gap fixes din audit desktop 2026-06-05). Pe 2026-06-05: checkpoint de siguranță commis+pushed (backend/frontend/docs), audit UI premium cu 12 agenți rulat, plan în `docs/UI_PREMIUM_PLAN.md` + Faza 22 mai sus, findings brute în `docs/archive/ui-premium-audit-raw-2026-06-05.json`.

Următorul pas recomandat: răspuns la întrebările deschise din Faza 22, apoi implementare secvențială Faza 1 → 11. (Separat, rămâne: test manual end-to-end cu Gmail real + capturi demo.)
