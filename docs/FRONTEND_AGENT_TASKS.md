# FRONTEND AGENT TASKS

## Scop

Acest fișier împarte frontend-ul în taskuri mici, potrivite pentru agenți separați.

Fiecare task trebuie să fie suficient de clar ca un agent să poată lucra independent, fără să blocheze inutil ceilalți agenți.

## Reguli obligatorii pentru fiecare agent

Înainte să înceapă orice task, agentul trebuie să citească:

1. `AGENTS.md`
2. `docs/LICENTA.md`
3. `docs/TODO.md`
4. `docs/ARCHITECTURE.md`
5. `docs/PROGRESS.md`
6. `docs/API_PLAN.md`
7. `docs/FRONTEND_PLAN.md`

Dacă taskul atinge emailuri, scanări sau acțiuni, agentul trebuie să citească și:

- `docs/PHISHING_RULES.md`
- `docs/MANUAL_TESTS.md`

## Reguli de colaborare

- Nu modifica backend-ul decât dacă taskul cere explicit asta.
- Nu modifica endpoint-uri.
- Nu introduce Firebase sau alt sistem de auth.
- Folosește `Bearer token` în `Authorization`.
- Păstrează tema dark-only pentru MVP.
- Nu implementa logică de phishing în frontend.
- Nu lucra peste fișierele altui agent dacă taskul nu cere asta.
- Dacă lipsește o piesă comună, creeaz-o minimal și documentează ce ai făcut.
- La final, spune clar ce fișiere ai modificat și cum se testează.

## Convenții pentru taskuri

Status:

- `[ ]` neînceput
- `[-]` în lucru
- `[x]` terminat

Prioritate:

- `P0`: blocant pentru frontend;
- `P1`: necesar pentru MVP;
- `P2`: util pentru demo/polish.

## Task F0 - Inițializare frontend

Status: `[x]`

Prioritate: `P0`

Poate rula în paralel cu: niciun task de implementare frontend; acesta este task de bază.

Responsabilitate:

- creează folderul `frontend/`;
- inițializează React + Vite;
- configurează structura `src/` conform `docs/FRONTEND_PLAN.md`;
- instalează dependențele de bază: React Router și MUI;
- creează tema dark-only;
- pornește aplicația cu un ecran placeholder.

Fișiere probabile:

- `frontend/package.json`
- `frontend/index.html`
- `frontend/vite.config.js`
- `frontend/src/main.jsx`
- `frontend/src/App.jsx`
- `frontend/src/styles/theme.js`
- `frontend/src/styles/global.css`

Done when:

- `npm run dev` pornește din `frontend/`;
- aplicația afișează un ecran simplu;
- tema dark este aplicată;
- nu există Firebase în cod.

## Task F1 - API client

Status: `[x]`

Prioritate: `P0`

Poate rula în paralel cu: F2 după ce F0 există.

Responsabilitate:

- creează clientul central pentru backend;
- configurează base URL pentru `/api/v1`;
- atașează tokenul din `localStorage`;
- tratează răspunsurile `success/data`;
- tratează erorile într-un format simplu pentru UI.

Fișiere probabile:

- `frontend/src/api/apiClient.js`
- `frontend/src/utils/tokenStorage.js`

Done when:

- există funcții `get`, `post`, `patch`, `del`;
- tokenul se trimite ca `Authorization: Bearer <token>`;
- erorile de backend pot fi afișate în componente.

## Task F2 - Auth API și AuthContext

Status: `[x]`

Prioritate: `P0`

Poate rula în paralel cu: F3 UI auth, dacă interfața API este stabilită.

Responsabilitate:

- implementează funcțiile API pentru auth;
- creează `AuthContext`;
- salvează tokenul după login/register;
- încarcă utilizatorul curent prin `GET /users/me`;
- implementează logout local.

Endpoint-uri:

- `POST /api/v1/auth/register`;
- `POST /api/v1/auth/login`;
- `POST /api/v1/auth/logout`;
- `GET /api/v1/users/me`.

Fișiere probabile:

- `frontend/src/api/authApi.js`
- `frontend/src/api/usersApi.js`
- `frontend/src/context/AuthContext.jsx`
- `frontend/src/hooks/useAuth.js`
- `frontend/src/components/auth/ProtectedRoute.jsx`

Done when:

- aplicația știe dacă utilizatorul este autentificat;
- refresh-ul paginii păstrează sesiunea dacă tokenul este valid;
- logout șterge tokenul.

## Task F3 - Login/Register UI fără Firebase

Status: `[x]`

Prioritate: `P1`

Poate rula în paralel cu: F2, dacă se folosește contractul stabilit.

Responsabilitate:

- păstrează direcția vizuală utilă din UI-ul brut folosit inițial ca inspirație;
- elimină Firebase;
- elimină Google Firebase sign-in;
- elimină email verification Firebase;
- elimină toggle-ul dark/light;
- păstrează doar tema dark;
- conectează formularul la `AuthContext`.

Fișiere probabile:

- `frontend/src/pages/LoginPage.jsx`
- `frontend/src/components/auth/AuthForm.jsx`

Done when:

- userul poate face register;
- userul poate face login;
- erorile backend sunt afișate clar;
- brandul vechi `AthleteAtlas` nu mai apare.

Notă: folderul istoric `frontent-raw/` a fost șters pe `2026-05-19`, după ce
frontend-ul final a fost stabilizat pe auth-ul backend.

## Task F4 - Layout aplicație

Status: `[x]`

Prioritate: `P1`

Poate rula în paralel cu: F5, F6, F7 după ce F0 există.

Responsabilitate:

- creează layout-ul principal;
- adaugă navigare între Dashboard, Emails, Reports, Settings;
- afișează userul curent;
- adaugă logout.

Fișiere probabile:

- `frontend/src/components/layout/AppLayout.jsx`
- `frontend/src/components/layout/Sidebar.jsx`
- `frontend/src/components/layout/Topbar.jsx`
- `frontend/src/App.jsx`

Done when:

- rutele protejate folosesc layout-ul principal;
- navigarea este clară;
- logout funcționează.

## Task F5 - Dashboard și Gmail status

Status: `[x]`

Prioritate: `P1`

Poate rula în paralel cu: F6, F7, F8.

Responsabilitate:

- afișează statusul aplicației pentru user;
- afișează dacă Gmail este conectat;
- oferă buton de conectare Gmail;
- oferă buton de sync manual pentru contul Gmail activ;
- afișează sumarul `scanSummary` după sync.

Endpoint-uri:

- `GET /api/v1/meta/status`;
- `GET /api/v1/mail-accounts`;
- `GET /api/v1/mail-accounts/google/start`;
- `POST /api/v1/mail-accounts/:id/sync`.

Fișiere probabile:

- `frontend/src/pages/DashboardPage.jsx`
- `frontend/src/api/metaApi.js`
- `frontend/src/api/mailAccountsApi.js`
- `frontend/src/components/dashboard/GmailStatusPanel.jsx`
- `frontend/src/components/dashboard/StatCard.jsx`

Done when:

- se vede statusul Gmail;
- conectarea Gmail deschide URL-ul de OAuth;
- sync-ul manual pornește și afișează rezultat.

## Task F6 - Email list și filtre

Status: `[x]`

Prioritate: `P1`

Poate rula în paralel cu: F5, F7, F8.

Responsabilitate:

- listează emailurile;
- afișează `riskBucket`, `effectiveVerdict`, scorul și data;
- implementează filtre pe `riskBucket`;
- implementează paginare simplă;
- navighează spre detaliul emailului.

Endpoint:

- `GET /api/v1/emails`.

Fișiere probabile:

- `frontend/src/pages/EmailsPage.jsx`
- `frontend/src/api/emailsApi.js`
- `frontend/src/components/emails/EmailList.jsx`
- `frontend/src/components/emails/EmailListItem.jsx`
- `frontend/src/components/emails/RiskBadge.jsx`
- `frontend/src/utils/formatRisk.js`
- `frontend/src/utils/formatDate.js`

Done when:

- lista se încarcă;
- filtrele principale funcționează;
- fiecare email are stare vizibilă;
- click pe email duce la detalii.

## Task F7 - Email detail, scan summary și acțiuni

Status: `[x]`

Prioritate: `P1`

Poate rula în paralel cu: F5, F6, F8.

Responsabilitate:

- afișează detalii email;
- afișează scanarea curentă;
- afișează `reasons`, `triggeredRules` și `aiExplanation.summary`;
- implementează `mark-safe`;
- implementează `mark-phishing`;
- afișează clar rezultatul `providerAction`.

Endpoint-uri:

- `GET /api/v1/emails/:id`;
- `GET /api/v1/scans/emails/:emailId/latest`;
- `POST /api/v1/actions/emails/:id/mark-safe`;
- `POST /api/v1/actions/emails/:id/mark-phishing`.

Fișiere probabile:

- `frontend/src/pages/EmailDetailPage.jsx`
- `frontend/src/api/actionsApi.js`
- `frontend/src/api/scansApi.js`
- `frontend/src/components/emails/EmailDetailPanel.jsx`
- `frontend/src/components/emails/ReviewActions.jsx`
- `frontend/src/components/emails/ScanSummary.jsx`

Done when:

- detaliul emailului este util pentru demo;
- acțiunile schimbă starea în UI;
- eșecul Gmail Spam este afișat fără să pară că review-ul local a eșuat.

## Task F8 - Reports page

Status: `[x]`

Prioritate: `P1`

Poate rula în paralel cu: F5, F6, F7.

Responsabilitate:

- afișează sumarul lunar;
- permite alegerea lunii;
- afișează regulile cele mai frecvente;
- afișează sumarul AI;
- permite trimiterea manuală a digestului lunar.

Endpoint-uri:

- `GET /api/v1/reports/monthly-summary`;
- `POST /api/v1/reports/monthly-summary/send`.

Fișiere probabile:

- `frontend/src/pages/ReportsPage.jsx`
- `frontend/src/api/reportsApi.js`
- `frontend/src/components/reports/MonthlySummaryCard.jsx`
- `frontend/src/components/reports/TopRulesList.jsx`

Done when:

- raportul lunar se vede clar;
- trimiterea digestului are stare de succes/eșec.

## Task F9 - Settings page

Status: `[x]`

Prioritate: `P2`

Poate rula în paralel cu: F5, F6, F7, F8.

Responsabilitate:

- afișează datele utilizatorului curent;
- permite schimbarea numelui;
- permite pornirea/oprirea AI;
- permite schimbarea `syncMaxResults` pentru Gmail.

Endpoint-uri:

- `GET /api/v1/users/me`;
- `PATCH /api/v1/users/me`;
- `PATCH /api/v1/users/me/ai-settings`;
- `PATCH /api/v1/mail-accounts/:id/settings`.

Fișiere probabile:

- `frontend/src/pages/SettingsPage.jsx`
- `frontend/src/api/usersApi.js`
- `frontend/src/api/mailAccountsApi.js`

Done when:

- utilizatorul poate vedea și modifica setările MVP;
- UI-ul explică simplu ce face AI on/off.

## Task F10 - Common UI states

Status: `[x]`

Prioritate: `P2`

Poate rula în paralel cu: toate taskurile după F0.

Responsabilitate:

- creează componente comune pentru loading, empty și error;
- creează un helper/hook pentru acțiuni async;
- uniformizează afișarea erorilor.

Fișiere probabile:

- `frontend/src/components/common/LoadingState.jsx`
- `frontend/src/components/common/ErrorMessage.jsx`
- `frontend/src/components/common/EmptyState.jsx`
- `frontend/src/hooks/useAsyncAction.js`

Done when:

- paginile principale folosesc aceleași componente pentru loading/error/empty;
- erorile backend sunt ușor de citit.

## Task F11 - Demo polish și verificare cap-coadă

Status: `[ ]`

Prioritate: `P2`

Poate rula după: F3, F5, F6, F7.

Responsabilitate:

- verifică flow-ul demo;
- ajustează spacing, text, stări goale;
- notează orice problemă reală întâlnită;
- propune update-uri pentru `docs/MANUAL_TESTS.md` dacă apar pași frontend importanți.

Flow minim:

```text
register/login -> connect Gmail -> sync -> list emails -> email detail -> mark-phishing -> report
```

Done when:

- flow-ul poate fi demonstrat local;
- următorul pas de prezentare este clar.

## Ordine recomandată pentru lucru cu mai mulți agenți

1. Rulează F0 primul.
2. După F0, rulează F1 și F2.
3. După F1/F2, rulează F3 și F4.
4. După ce layout-ul și auth-ul sunt stabile, rulează în paralel F5, F6, F7, F8 și F9.
5. F10 poate rula în paralel și poate fi integrat treptat.
6. F11 se face la final, după integrare.

## Taskuri care nu trebuie făcute acum

- refactor backend;
- schimbare endpoint-uri;
- auth cu Firebase;
- auth cu cookies;
- scheduler frontend;
- design system complex;
- light mode;
- grafice avansate;
- integrare cu alt provider decât Gmail.
