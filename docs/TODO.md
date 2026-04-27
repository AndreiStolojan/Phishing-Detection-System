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
- Stadiu actual: auth-ul MVP este stabil, Gmail sync extrage datele utile, scorarea hibridă este activă, `allowlist/blocklist` influențează deja scorul, iar endpoint-urile `emails/lists/meta` sunt integrate în API
- Progres estimativ MVP: `87%`
- Faza curentă: `Faza 9-10 - Acțiuni manuale rămase peste flow-ul complet existent`

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
- [x] Regulile de detecție (`PHISHING_RULES.md`)
- [x] Note de învățare (`LEARNING_NOTES.md`)
- [x] Fișier pentru progres curent (`PROGRESS.md`)
- [x] Fișier pentru decizii tehnice (`DECISIONS.md`)
- [x] Fișier roadmap (`ROADMAP.md`)

Dependențe: fără dependențe anterioare

## Faza 1 - Setup backend

Milestone: aplicație Express pornită curat

- [-] Inițializare structură backend modulară
- [ ] Reorganizare codul existent în `src/` și pe module
- [ ] Configurare directoare principale
- [x] Configurare `express`
- [x] Separare `app.js` de `server.js`
- [x] Configurare `dotenv`
- [x] Configurare fișier central de config
- [x] Configurare middleware de bază
- [x] Configurare handling pentru erori
- [x] Endpoint simplu de health check
- [-] Scripturi utile în `package.json`
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
- [x] Scanare de tip `upsert` (o scanare curentă per email, fără istoric duplicat)
- [x] Integrare semnale AI semantice locale (`urgency`, `sensitiveDataRequest`, `socialEngineering`, `loginOrActionRequest`, `brandImpersonation`)
- [x] Salvare metadata AI pentru comparare modele (`model`, `promptVersion`, `latencyMs`, `status`)
- [x] Explainability controlată în backend, în română, cu fallback dacă Ollama nu este disponibil
- [x] Stabilizare integrare Ollama local: fallback host local și erori AI diferențiate pentru debugging
- [x] Introducere scor hibrid: `ruleScore + aiScore` cu limită superioară pentru componenta AI

Dependențe: Faza 7

Obligatoriu pentru MVP: da

## Faza 9 - Afișare rezultate și acțiuni

Milestone: emailul poate fi văzut împreună cu verdictul și acțiunile

- [x] Endpoint listare emailuri
- [x] Endpoint detalii email
- [x] Endpoint rezultat scan
- [ ] Endpoint `mark safe`
- [ ] Endpoint `block sender local`
- [ ] Endpoint `allow sender/domain`
- [ ] Analiză fezabilitate `move to spam/junk`
- [ ] Implementare `move to spam/junk` doar dacă providerul permite simplu

Dependențe: Faza 8

Obligatoriu pentru MVP: da, cu excepția `move to spam/junk` care este condiționat de provider

## Faza 10 - Lists și reguli locale

Milestone: blocklist și allowlist funcționale

- [x] Creare model `ListEntry`
- [x] Suport `allowlist`
- [x] Suport `blocklist`
- [x] Aplicare listelor în scorare
- [x] Endpoint-uri pentru administrarea listelor

Notă: în starea actuală, listele locale sunt deja folosite de motorul de scanare pentru două cazuri simple și utile pentru MVP:

- `blocklist` pe `email` sau `domain` crește scorul de risc pentru expeditor;
- `allowlist` pe `email` sau `domain` reduce conservator scorul, fără să ascundă complet alte semnale suspecte.

Dependențe: Faza 9

Obligatoriu pentru MVP: da

## Faza 11 - Jobs automate

Milestone: sync și scan automate de bază

- [ ] Definire job manual sau programat simplu
- [ ] Sync periodic pentru conturile active
- [ ] Scan automată pentru emailurile noi
- [ ] Evitare re-scan inutil

Dependențe: Faza 8

Obligatoriu pentru MVP: util, dar poate fi redus dacă timpul este scurt

## Faza 12 - Explainability cu Ollama

Milestone: explicații locale, ușor de citit

- [x] Definire format de input semantic pe text complet relevant
- [x] Trimitere către Ollama local a contextului minim necesar pentru semnale
- [x] Fallback dacă Ollama nu este disponibil
- [x] Păstrare separată între verdictul principal și semnalele/explicația AI
- [ ] Ajustare finală a textului de explainability pentru UI-ul de utilizator

Dependențe: Faza 8

Obligatoriu pentru MVP: nu, este etapa imediat după MVP-ul funcțional

## Faza 13 - Polish, testare și pregătire de prezentare

Milestone: proiect coerent și prezentabil

- [ ] Curățare naming și structură
- [ ] Verificare flux complet cap-coadă
- [ ] Seed minim sau date demo
- [ ] Capturi sau scenarii de demonstrare
- [ ] Documentație de rulare
- [ ] Documentație pentru prezentare
- [ ] Revizuire riscuri și limitări

Dependențe: Faza 9 minim

Obligatoriu pentru MVP: da

## Taskuri critice pentru MVP

- [x] Server Express funcțional
- [x] MongoDB conectat
- [x] Register și login
- [x] JWT și protecția rutelor
- [x] Profil utilizator curent (`users/me`)
- [x] Health check
- [x] Conectare cont Gmail
- [-] Sync emailuri
- [-] Salvare emailuri
- [-] Extracție linkuri și metadate utile
- [-] Scor phishing bazat pe reguli
- [-] Verdict și motive clare
- [x] Listare emailuri și rezultat scan
- [ ] `mark safe`
- [ ] `block sender local`

## Taskuri opționale dacă rămâne timp

- [ ] `move to spam/junk` integrat complet
- [ ] suport pentru încă un provider de email
- [ ] dashboard mai bun pentru statistică
- [ ] reputație URL prin servicii externe
- [ ] verificare vârstă domeniu
- [ ] explainability mai bogată cu Ollama
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

Ultimul punct finalizat: integrarea finală a routerelor `emails`, `lists` și `meta` în `app.js` sub prefixul `/api/v1`

Următorul pas recomandat: implementarea acțiunilor din Faza 9 (`mark safe` și `block sender local`) peste endpoint-urile deja disponibile
