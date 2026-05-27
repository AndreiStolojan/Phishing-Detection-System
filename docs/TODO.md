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
- Stadiu actual: auth-ul MVP este stabil, Gmail sync extrage datele utile, scorarea hibridă este activă, explicațiile AI sunt structurate pentru frontend cu fallback controlat, persistența scanării curente este protejată prin upsert atomic + index unic, acțiunile manuale MVP sunt simplificate la `mark-safe` și `mark-phishing`, endpoint-urile de email expun starea derivată finală pentru UI fără lists și afișează `aiExplanation` când există, digestul lunar poate fi trimis manual pe emailul utilizatorului autentificat, testarea manuală a endpoint-urilor backend a trecut, backend-ul este izolat în `backend/`, iar frontend-ul React + Vite a fost șters pe `2026-05-27` pentru a reconstrui ulterior o interfață mai potrivită.
- Progres estimativ MVP: `99%`
- Faza curentă: `Faza 13 - curățare backend și contract API pentru noul frontend`

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
- [ ] Decizie contract API final înainte de reconstruirea frontend-ului
- [ ] Curățare cod backend neesențial pentru MVP după confirmare
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

Status 2026-05-27: frontend-ul implementat anterior a fost șters intenționat, deoarece arăta prea generat și va fi reconstruit după clarificarea contractului backend.

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
- [ ] Reconstruire frontend după decizia contractului API

Dependențe: Faza 13 și API backend stabil

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

## Unde am rămas

Ultimul punct finalizat: frontend-ul existent a fost șters, iar backend-ul a fost analizat pe fișiere și endpoint-uri în `docs/BACKEND_REVIEW.md`.

Următorul pas recomandat: răspuns la întrebările din `docs/BACKEND_REVIEW.md`, apoi curățare backend neesențială pentru MVP înainte de reconstruirea frontend-ului.
