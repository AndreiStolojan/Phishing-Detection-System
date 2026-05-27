# BACKEND REVIEW

## Scop

Acest document este analiza backend-ului la data de `2026-05-27`.

Obiectivul zilei este să tratăm backend-ul ca un contract direct pentru viitorul frontend:

- backend-ul trebuie să expună doar datele necesare pentru MVP;
- endpoint-urile trebuie să fie intuitive;
- codul trebuie să fie ușor de explicat în lucrarea de licență;
- funcționalitățile rămase din frontend-ul vechi sau din polish trebuie marcate pentru eliminare sau decizie.

Important: această analiză nu schimbă codul backend. Ea spune ce există acum și ce merită simplificat înainte de reconstruirea frontend-ului.

## Concluzie rapidă

Backend-ul este funcțional și acoperă fluxul principal MVP:

`register/login -> connect Gmail -> sync emails -> parse data -> scan -> save verdict -> review manual -> reports`

Problema principală nu este lipsa funcționalității, ci faptul că unele fișiere au devenit prea mari pentru un proiect de licență ușor de explicat:

- `mail-account.service.js` combină OAuth, Gmail API client, refresh token, sync, salvare emailuri și mutare în Spam;
- `scan.service.js` combină reguli, AI semantic, explicații AI, upsert scanare și pipeline de sync;
- `email.service.js` combină query parsing, Mongo aggregation, formatare răspuns și stare derivată pentru UI;
- `ollama-semantic.service.js` și `ollama-explanation.service.js` repetă multă logică de client Ollama;
- `contact`, `avatarDataUrl`, `manual-tests/auth-ui`, `extras/security/arcjet` și câteva dependințe par neesențiale pentru MVP-ul curent.

Recomandarea mea: nu simplificăm tot deodată. Mai întâi stabilim contractul API final, apoi curățăm codul în pași mici.

## Contract mental recomandat

Pentru frontend-ul viitor, backend-ul ar trebui gândit așa:

1. Utilizatorul se autentifică.
2. Frontend-ul cere profilul curent.
3. Frontend-ul vede dacă Gmail este conectat.
4. Utilizatorul pornește sync.
5. Backend-ul sincronizează și scanează automat.
6. Frontend-ul listează emailuri cu verdict final deja calculat.
7. Utilizatorul deschide detaliul unui email.
8. Utilizatorul marchează emailul ca sigur sau phishing.
9. Frontend-ul afișează rapoarte simple.

Regulă importantă: frontend-ul nu trebuie să calculeze phishing. El doar afișează ce primește de la backend.

## Harta fișierelor backend

### Rădăcină backend

| Fișier/folder | Ce face acum | Observație de simplificare |
| --- | --- | --- |
| `backend/package.json` | Definește scripturi și dependințe backend. | Are dependințe posibil nefolosite: `@arcjet/node`, `arcjet`, `cookie-parser`, `debug`, `mongodb`, `morgan`. Trebuie verificate înainte de ștergere. |
| `backend/package-lock.json` | Blochează versiunile dependințelor. | Se actualizează automat după curățarea dependințelor. |
| `backend/src/` | Codul runtime al API-ului. | Structura pe layere este ok pentru MVP. |
| `backend/manual-tests/` | Teste manuale și UI vechi de auth. | `auth-ui` pare neesențial dacă frontend-ul a fost șters. Fișierele `.http` pot rămâne utile. |
| `backend/postman/` | Colecții Postman pentru endpoint-uri. | Util pentru testare manuală. Trebuie actualizat dacă schimbăm rute. |
| `backend/scripts/` | Scripturi utilitare. | Păstrăm doar ce ajută direct: bootstrap admin, cleanup duplicate scans, benchmark Ollama dacă AI rămâne. |
| `backend/extras/` | Notificări email și security Arcjet. | `notifications` este folosit de reports/contact; `security/arcjet` pare nefolosit în runtime. |

### Intrarea aplicației

| Fișier | Ce face acum | Observație de simplificare |
| --- | --- | --- |
| `backend/src/app.js` | Creează aplicația Express, montează rutele `/api/v1`, servește `manual-tests`, definește health check și 404. | Clar. Dacă ștergem UI-ul manual, putem scoate `app.use('/manual-tests', ...)`. |
| `backend/src/server.js` | Conectează MongoDB și pornește serverul pe `PORT`. | Clar și suficient de simplu. |

### Config și database

| Fișier | Ce face acum | Observație de simplificare |
| --- | --- | --- |
| `backend/src/config/env.js` | Încarcă `.env.<NODE_ENV>.local` și exportă variabilele de mediu. | Bun pentru MVP. Ar merita grupate mental variabilele: core, Gmail, email, AI. |
| `backend/src/config/google-oauth.js` | Ține URL-uri, scope-uri și helperi pentru OAuth Google. | Util. Poate rămâne, dar logica de request către Google nu ar trebui să stea în `mail-account.service.js`. |
| `backend/src/database/mongodb.js` | Conectează Mongoose la MongoDB. | Clar. Stilul poate fi formatat mai consistent, dar nu e problemă de produs. |

### Common și middleware

| Fișier | Ce face acum | Observație de simplificare |
| --- | --- | --- |
| `backend/src/common/errors/create-error.js` | Creează erori cu `statusCode`, `errors`, `code`. | Util și simplu. |
| `backend/src/common/http/send-error-response.js` | Trimite răspunsuri de eroare uniforme. | Util. Există o mică suprapunere cu `error.middleware.js`, dar e acceptabilă. |
| `backend/src/middlewares/auth.middleware.js` | Verifică `Authorization: Bearer <token>`, decodează JWT și atașează `req.user`. | Esențial. Bun pentru MVP. |
| `backend/src/middlewares/error.middleware.js` | Transformă erorile în răspuns JSON. | Esențial. Poate folosi mai des `createError` pentru consistență. |
| `backend/src/middlewares/role.middleware.js` | Permite endpoint-uri doar pentru roluri specifice. | Util doar dacă păstrăm admin endpoints. Dacă nu, poate deveni nefolosit. |
| `backend/src/middlewares/validate.middleware.js` | Validează `req.body` cu Joi. | Bun, dar acum validează doar body. Pentru params/query există validare separată în route sau service. |

### Modele MongoDB

| Fișier | Ce face acum | Observație de simplificare |
| --- | --- | --- |
| `backend/src/models/user.model.js` | Stochează user, `passwordHash`, rol, `settings.aiEnabled`, `avatarDataUrl`. | Pentru MVP backend-centric, `avatarDataUrl` este discutabil. A fost introdus pentru frontend polish, nu pentru detecția phishing. |
| `backend/src/models/mail-account.model.js` | Stochează cont Gmail conectat, token-uri, status, `syncMaxResults`. | Esențial. Pentru proiect real, token-urile ar trebui criptate, dar pentru MVP academic poate fi explicată limitarea. |
| `backend/src/models/email.model.js` | Stochează emailurile sincronizate și câmpurile derivate: linkuri, domenii, atașamente, verdict manual, acțiune provider. | Esențial, dar `lastManualAction` încă are valori vechi `allow/block`, deși lists au fost scoase din MVP. |
| `backend/src/models/scan.model.js` | Stochează scanarea curentă: scoruri, verdict, reguli, AI signals, explicație AI. | Esențial. Indexul unic `userId + emailId` este o decizie bună pentru MVP. |

### Rute

| Fișier | Ce face acum | Observație de simplificare |
| --- | --- | --- |
| `backend/src/routes/auth.routes.js` | `register`, `login`, `logout`. | Comentariile cu `sign-up/sign-in/sign-out` pot fi șterse când curățăm naming-ul. |
| `backend/src/routes/user.routes.js` | Profil curent, AI settings, update profil, admin get users/get user. | Admin endpoints sunt probabil neesențiale pentru demo. |
| `backend/src/routes/mail-account.routes.js` | Gmail start/callback, list, settings, sync, delete. | Esențial. Naming-ul `mail-accounts` este ok, dar pentru frontend ar putea fi mai intuitiv ca "connected email accounts". |
| `backend/src/routes/email.routes.js` | Listă emailuri, detaliu email, raw email. | `raw` poate fi păstrat doar pentru debugging sau eliminat din contractul public. |
| `backend/src/routes/scan.routes.js` | Scanare manuală și latest scan. | Funcțional, dar ruta ar fi mai intuitivă dacă scanarea ar fi sub email: `/emails/:id/scan`. |
| `backend/src/routes/action.routes.js` | `mark-safe`, `mark-phishing`. | Funcțional, dar ruta ar fi mai intuitivă sub email: `/emails/:id/actions/mark-safe`. |
| `backend/src/routes/report.routes.js` | Sumar lunar și trimitere digest. | Util pentru demo. Trimiterea email poate fi opțională. |
| `backend/src/routes/meta.routes.js` | Status general pentru dashboard. | Util pentru frontend. Poate fi redenumit mental în dashboard/status. |
| `backend/src/routes/contact.routes.js` | Mesaj de contact/suport. | Pare rămas din frontend polish. Nu este necesar pentru MVP phishing. |

### Controller-e

| Fișier | Ce face acum | Observație de simplificare |
| --- | --- | --- |
| `backend/src/controllers/auth.controller.js` | Primește request-urile auth și cheamă `auth.service`. | Clar. Exporturile `signUp/signIn/signOut` par moștenire și pot fi eliminate dacă nu sunt folosite. |
| `backend/src/controllers/user.controller.js` | Profil, update profil, AI settings, admin users. | Simplu, dar stilul de formatare este inconsistent. Admin poate fi scos dacă nu e necesar. |
| `backend/src/controllers/mail-account.controller.js` | Controlează flow-ul Gmail și sync. | Clar. Complexitatea reală este în service. |
| `backend/src/controllers/email.controller.js` | Listă, detaliu, raw. | Clar. `raw` este de decis. |
| `backend/src/controllers/scan.controller.js` | Scan manual și latest scan. | Clar. Ruta poate fi regândită. |
| `backend/src/controllers/action.controller.js` | Wrapper comun pentru mark safe/phishing. | Simplu și ok. |
| `backend/src/controllers/report.controller.js` | Sumar lunar și trimitere sumar. | Clar. |
| `backend/src/controllers/meta.controller.js` | Returnează statusul pentru utilizator. | Clar. |
| `backend/src/controllers/contact.controller.js` | Trimite mesaj contact. | Candidat pentru eliminare dacă nu mai vrem chat/contact. |

### Servicii

| Fișier | Ce face acum | Observație de simplificare |
| --- | --- | --- |
| `backend/src/services/auth.service.js` | Register, login, JWT, hash parolă, public user response. | Bun. Tranzacția la register este ok, dar poate fi mai mult decât e necesar pentru un singur create. |
| `backend/src/services/user.service.js` | Returnează și actualizează userul curent, AI settings, admin users. | Simplu. `avatarDataUrl` este candidat de eliminare dacă frontend-ul nou nu are nevoie. |
| `backend/src/services/mail-account.service.js` | OAuth state, token exchange, refresh token, Gmail API requests, sync, upsert emailuri, scan pipeline, move to spam. | Prea mare. Recomand split în `gmail-client`, `gmail-sync`, `mail-account` și eventual `gmail-actions`. |
| `backend/src/services/email-parser.service.js` | Parsează payload Gmail: headers, bodies, links, atașamente, receivedAt. | Bun și justificat. Poate rămâne separat. |
| `backend/src/services/link-analysis.service.js` | Extrage linkuri și detectează pattern-uri suspecte. | Bun, clar și util pentru regulile phishing. |
| `backend/src/services/email.service.js` | Listează emailuri cu filtre, face aggregation cu latest scan, calculează stare derivată, detaliu și raw. | Prea mare. Duplică parțial logica din `email-state.service.js` în aggregation. |
| `backend/src/services/email-state.service.js` | Calculează `effectiveVerdict`, `riskBucket`, `reviewStatus`. | Foarte util. Ar trebui să fie sursa principală de adevăr pentru stare. |
| `backend/src/services/scan.service.js` | Reguli phishing, scor AI, verdict, upsert scanare, skip scanări curente, scan pipeline din sync. | Prea mare. Recomand split în rule engine, scan persistence și scan orchestration. |
| `backend/src/services/scan-ai-input.service.js` | Construiește input minim pentru Ollama. | Bun și mic. |
| `backend/src/services/scan-explanation.service.js` | Creează explicație controlată în română fără Ollama. | Bun. Important pentru fallback și pentru lucrare. |
| `backend/src/services/ollama-semantic.service.js` | Cere de la Ollama semnale semantice structurate. | Util dacă păstrăm AI. Are logică de client repetată cu explanation service. |
| `backend/src/services/ollama-explanation.service.js` | Cere de la Ollama o explicație scurtă în română. | Util după stabilizarea backend-ului. Poate folosi un client Ollama comun. |
| `backend/src/services/action.service.js` | Setează verdict manual și, la phishing, încearcă mutare Gmail în Spam. | Bun pentru MVP. Poate fi redenumit mai specific: `email-review.service.js`. |
| `backend/src/services/report.service.js` | Calculează sumar lunar și trimite digest pe email. | Util pentru demo. Trimiterea email este opțională, sumarul este partea importantă. |
| `backend/src/services/meta.service.js` | Returnează count-uri și flags pentru dashboard. | Util pentru frontend. Poate fi numit mai clar `dashboard.service.js`. |
| `backend/src/services/contact.service.js` | Trimite mesaj de contact către `EMAIL_FROM`. | Candidat pentru eliminare. Nu ajută direct detecția phishing. |

### Validări

| Fișier | Ce face acum | Observație de simplificare |
| --- | --- | --- |
| `backend/src/validations/auth.validation.js` | Joi pentru register/login. | Bun. |
| `backend/src/validations/user.validation.js` | Joi pentru profil, avatar și AI settings. | Dacă eliminăm avatarul, acest fișier se simplifică mult. |
| `backend/src/validations/action.validation.js` | Validează param `id` pentru acțiuni email. | Bun, dar validarea params ar putea fi generalizată. |
| `backend/src/routes/contact.routes.js` | Conține validarea Joi pentru contact direct în route. | Dacă păstrăm contact, schema ar trebui mutată în `validations/contact.validation.js`. |

### Extras și scripturi

| Fișier | Ce face acum | Observație de simplificare |
| --- | --- | --- |
| `backend/extras/notifications/send-email.js` | Trimite welcome email, digest lunar și contact message. | `sendWelcomeEmail` pare nefolosit în flow-ul curent. Contact poate fi eliminat dacă scoatem `/contact`. |
| `backend/extras/notifications/email.template.js` | Template-uri HTML pentru welcome și digest lunar. | Digest poate rămâne. Welcome pare opțional. |
| `backend/extras/notifications/nodemailer.js` | Creează transporter Nodemailer și verifică env email. | Util dacă păstrăm digest email. |
| `backend/extras/security/arcjet.config.js` | Config Arcjet. | Pare nefolosit. Candidat pentru eliminare. |
| `backend/extras/security/arcjet.middleware.js` | Middleware Arcjet. | Pare nefolosit în `app.js`. Candidat pentru eliminare. |
| `backend/scripts/bootstrap-admin.js` | Creează primul admin. | Util doar dacă păstrăm admin endpoints. |
| `backend/scripts/cleanup-duplicate-scans.js` | Curăță duplicate vechi de scanări. | Util din cauza indexului unic `userId + emailId`. |
| `backend/scripts/benchmark-ollama.js` | Testează modele Ollama pe fixture-uri. | Util pentru partea XAI, dar nu pentru flow-ul de bază. Poate rămâne în `scripts/` ca instrument academic. |

## API actual

| Metodă | Rută actuală | Rol | Păstrăm pentru MVP? | Observație |
| --- | --- | --- | --- | --- |
| `GET` | `/api/v1/health` | Health check | Da | Simplu și util. |
| `POST` | `/api/v1/auth/register` | Creează cont | Da | Clar. |
| `POST` | `/api/v1/auth/login` | Login | Da | Clar. |
| `POST` | `/api/v1/auth/logout` | Logout client-side | Opțional | Nu invalidează token pe server; poate rămâne pentru contract frontend simplu. |
| `GET` | `/api/v1/users/me` | Profil curent | Da | Endpoint core. |
| `PATCH` | `/api/v1/users/me` | Update profil | Da, simplificat | Dacă scoatem avatar, rămâne doar `name`. |
| `PATCH` | `/api/v1/users/me/ai-settings` | Pornește/oprește AI | Da | Bun pentru demonstrarea diferenței reguli vs AI explainability. |
| `GET` | `/api/v1/users` | Listă users admin | Probabil nu | Nu este necesar pentru MVP phishing. |
| `GET` | `/api/v1/users/:id` | User admin | Probabil nu | Nu este necesar pentru MVP phishing. |
| `GET` | `/api/v1/mail-accounts/google/start` | URL OAuth Gmail | Da | Esențial. |
| `GET` | `/api/v1/mail-accounts/google/callback` | Callback OAuth Gmail | Da | Esențial, dar frontend-ul trebuie să știe cum tratează răspunsul. |
| `GET` | `/api/v1/mail-accounts` | Conturi conectate | Da | Esențial. |
| `PATCH` | `/api/v1/mail-accounts/:id/settings` | `syncMaxResults` | Da | Util pentru demo controlat. |
| `POST` | `/api/v1/mail-accounts/:id/sync` | Sync manual + scanare | Da | Endpoint central pentru MVP. |
| `DELETE` | `/api/v1/mail-accounts/:id` | Deconectare Gmail | Da | Util. |
| `GET` | `/api/v1/emails` | Listă emailuri | Da | Contract important pentru frontend. |
| `GET` | `/api/v1/emails/:id` | Detalii email | Da | Contract important pentru frontend. |
| `GET` | `/api/v1/emails/:id/raw` | Raw email | Opțional | Bun pentru debugging, posibil prea mult pentru frontend public. |
| `POST` | `/api/v1/scans/emails/:emailId` | Scanare manuală | Da | Ruta funcționează, dar poate fi mai intuitivă. |
| `GET` | `/api/v1/scans/emails/:emailId/latest` | Ultima scanare | Opțional | Detaliul emailului include deja `latestScan` compact. |
| `POST` | `/api/v1/actions/emails/:id/mark-safe` | Review manual safe | Da | Esențial. |
| `POST` | `/api/v1/actions/emails/:id/mark-phishing` | Review manual phishing + Gmail Spam | Da | Esențial. |
| `GET` | `/api/v1/reports/monthly-summary` | Raport lunar | Da | Bun pentru demo și lucrare. |
| `POST` | `/api/v1/reports/monthly-summary/send` | Trimite digest lunar | Opțional | Nu este critic pentru detecția phishing. |
| `GET` | `/api/v1/meta/status` | Status dashboard | Da | Util, dar naming-ul poate fi mai intuitiv. |
| `POST` | `/api/v1/contact/message` | Contact suport | Probabil nu | Rămas din frontend polish. |

## API propus mai intuitiv

Nu recomand să schimbăm rutele imediat, pentru că backend-ul este deja testat. Dar pentru viitorul frontend, contractul ar fi mai ușor de înțeles așa:

| Scop | Rută actuală | Rută propusă | Motiv |
| --- | --- | --- | --- |
| Status dashboard | `GET /api/v1/meta/status` | `GET /api/v1/dashboard/summary` | `meta` este vag; frontend-ul va cere un sumar pentru dashboard. |
| Scan manual email | `POST /api/v1/scans/emails/:emailId` | `POST /api/v1/emails/:id/scan` | Acțiunea aparține emailului. |
| Latest scan | `GET /api/v1/scans/emails/:emailId/latest` | `GET /api/v1/emails/:id/scan` sau inclus în `GET /emails/:id` | Mai natural pentru frontend. |
| Mark safe | `POST /api/v1/actions/emails/:id/mark-safe` | `POST /api/v1/emails/:id/actions/mark-safe` | Acțiunea aparține emailului. |
| Mark phishing | `POST /api/v1/actions/emails/:id/mark-phishing` | `POST /api/v1/emails/:id/actions/mark-phishing` | Acțiunea aparține emailului. |
| Gmail start | `GET /api/v1/mail-accounts/google/start` | păstrează | Clar. |
| Gmail callback | `GET /api/v1/mail-accounts/google/callback` | păstrează | Clar. |
| Mail account sync | `POST /api/v1/mail-accounts/:id/sync` | păstrează | Clar și REST suficient pentru MVP. |
| Contact | `POST /api/v1/contact/message` | elimină | Nu ține de phishing MVP. |

Recomandare practică: pentru MVP putem păstra rutele actuale și doar să documentăm clar contractul. Dacă refacem frontend-ul de la zero și vrem naming mai curat, atunci schimbăm rutele acum, înainte de a reconstrui UI-ul.

## Ce pare neesențial acum

Acestea sunt candidate pentru eliminare sau amânare, dar trebuie confirmate înainte de schimbări:

| Element | De ce poate fi eliminat | Risc dacă îl ștergem |
| --- | --- | --- |
| `frontend/` | UI-ul actual nu mai este dorit. | Niciun risc backend. A fost șters în sesiunea curentă. |
| `/api/v1/contact/message` + `contact.*` | Era pentru chat/contact din frontend vechi. Nu ajută flow-ul phishing. | Se pierde canalul de suport din aplicație. |
| `User.avatarDataUrl` + validări avatar | A fost pentru polish UI. Nu ajută detecția phishing. | Viitorul frontend nu mai poate afișa avatar custom fără reintroducere. |
| Admin endpoints `GET /users`, `GET /users/:id` | Nu sunt necesare pentru utilizatorul normal. | Bootstrap admin devine mai puțin util. |
| `GET /emails/:id/raw` | Expune text/html body; util pentru debugging, nu neapărat pentru UI. | Pierdem o unealtă de diagnostic. |
| `manual-tests/auth-ui` | Mini UI vechi de test auth. | Testarea auth rămâne posibilă prin Postman/http. |
| `extras/security/arcjet.*` | Nu este montat în `app.js`. | Niciun risc runtime dacă e nefolosit. |
| Dependințe `arcjet`, `@arcjet/node` | Par legate de extras nefolosit. | Trebuie verificat cu `rg` înainte de uninstall. |
| Dependințe `cookie-parser`, `debug`, `morgan`, `mongodb` | Par nefolosite direct în codul runtime. | Trebuie verificat înainte de curățarea `package.json`. |
| Valori `allow/block` în `Email.lastManualAction` | Lists au fost scoase din MVP. | Dacă există date vechi în DB, pot rămâne valori istorice. |

## Simplificări recomandate în pași mici

### Pasul 1 - Stabilim contractul API final

Decidem dacă păstrăm rutele actuale sau trecem la varianta mai intuitivă centrată pe email:

- `POST /api/v1/emails/:id/scan`;
- `POST /api/v1/emails/:id/actions/mark-safe`;
- `POST /api/v1/emails/:id/actions/mark-phishing`;
- `GET /api/v1/dashboard/summary`.

Acesta trebuie decis înainte de noul frontend.

### Pasul 2 - Eliminăm ce este clar frontend-polish

Candidați:

- contact endpoint;
- avatar în user;
- manual auth UI;
- Arcjet nefolosit;
- dependințe nefolosite.

### Pasul 3 - Spargem serviciile foarte mari

Propunere minimă, fără schimbare de comportament:

- `mail-account.service.js` rămâne pentru DB și public contract;
- `gmail-client.service.js` primește request/refresh/fetch/move;
- `gmail-sync.service.js` primește loop-ul de sync și upsert emailuri;
- `scan-rule-engine.service.js` primește regulile de scor;
- `scan-persistence.service.js` primește upsert și cleanup duplicate;
- `ollama-client.service.js` primește logica comună de request/fallback către Ollama.

### Pasul 4 - Simplificăm răspunsurile frontend

Pentru listă emailuri, frontend-ul are probabil nevoie doar de:

- `_id`;
- `subject`;
- `from`;
- `displayName`;
- `senderDomain`;
- `snippet`;
- `receivedAt`;
- `effectiveVerdict`;
- `riskBucket`;
- `reviewStatus`;
- `latestScan.score`;
- `latestScan.verdict`;

Pentru detaliu email, adăugăm:

- `to`;
- `replyTo`;
- `replyToDomain`;
- `linkDomains`;
- `linkCount`;
- `attachmentExtensions`;
- `latestScan.reasons`;
- `latestScan.triggeredRules`;
- `latestScan.aiExplanation`;
- `lastProviderActionStatus`.

Nu recomand să trimitem `htmlBody` către frontend normal. Dacă e nevoie, îl ținem doar într-un endpoint de debugging.

## Întrebări înainte de simplificarea backend-ului

1. Vrei să eliminăm complet partea de `contact` și `avatarDataUrl`, pentru că au fost adăugate pentru frontend-ul vechi?
2. Vrei să schimbăm rutele în forma mai intuitivă centrată pe email înainte de noul frontend, sau preferi să păstrăm rutele actuale ca să evităm risc?
3. Pentru MVP, păstrăm admin endpoints și rolul `admin`, sau le mutăm la "după MVP"?
4. Păstrăm `GET /api/v1/emails/:id/raw` doar pentru debugging, sau îl scoatem din API-ul public?
5. Păstrăm trimiterea emailului de raport lunar (`POST /reports/monthly-summary/send`), sau pentru MVP este suficient doar raportul JSON?

