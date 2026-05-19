# FRONTEND PLAN

## Scop

Acest document descrie planul pe termen lung pentru frontend-ul aplicației.

Frontend-ul trebuie să demonstreze clar fluxul principal al licenței:

`login/register -> conectare Gmail -> sync -> listare emailuri -> detalii scanare -> acțiuni manuale -> raport lunar`

Regula principală: frontend-ul trebuie să fie util pentru demo și ușor de înțeles, nu o aplicație mare și sofisticată.

## Decizie de direcție

Pentru MVP, frontend-ul va fi construit separat în:

```text
frontend/
  src/
```

Direcția recomandată este:

- `React`;
- `Vite`;
- `MUI`, pentru că UI-ul brut de auth folosește deja MUI;
- `React Router`, pentru pagini protejate și navigare;
- `localStorage` pentru tokenul JWT în MVP;
- o singură temă dark la început;
- cromatica finală se schimbă mai târziu, după ce flow-ul funcționează.

Motivul este simplu: backend-ul este stabil, iar frontend-ul trebuie să consume API-ul existent fără să introducă alt sistem de auth sau alt backend.

## Ce s-a păstrat din UI-ul brut inițial

Folderul istoric `frontent-raw/` a fost folosit doar ca inspirație pentru ecranul
de login/register, apoi a fost șters din repo pe `2026-05-19`.

S-a păstrat doar direcția vizuală utilă:

- layout-ul vizual al formularului de login/register;
- ideea de card central pentru autentificare;
- câmpurile cu iconițe;
- stilul general dark al ecranului de auth;
- mesajele de eroare/succes, adaptate pentru backend-ul nostru;
- unele componente MUI deja folosite.

Nu s-au păstrat:

- Firebase Auth;
- Google sign-in prin Firebase;
- email verification Firebase;
- config-ul Firebase;
- brandul `AthleteAtlas`;
- `ProtectedRoute` bazat pe `auth.currentUser`;
- logica de rate-limit locală din componenta de auth, dacă face codul greu de urmărit.

În aplicația finală, auth-ul trebuie să folosească backend-ul:

- `POST /api/v1/auth/register`;
- `POST /api/v1/auth/login`;
- `POST /api/v1/auth/logout`;
- `GET /api/v1/users/me`.

## Structura recomandată

Structura inițială propusă:

```text
frontend/
  package.json
  index.html
  vite.config.js
  src/
    main.jsx
    App.jsx

    api/
      apiClient.js
      authApi.js
      usersApi.js
      mailAccountsApi.js
      emailsApi.js
      actionsApi.js
      reportsApi.js
      metaApi.js

    components/
      auth/
        AuthForm.jsx
        ProtectedRoute.jsx
      layout/
        AppLayout.jsx
        Sidebar.jsx
        Topbar.jsx
      dashboard/
        StatCard.jsx
        GmailStatusPanel.jsx
      emails/
        EmailList.jsx
        EmailListItem.jsx
        EmailDetailPanel.jsx
        RiskBadge.jsx
        ReviewActions.jsx
        ScanSummary.jsx
      reports/
        MonthlySummaryCard.jsx
        TopRulesList.jsx
      common/
        EmptyState.jsx
        ErrorMessage.jsx
        LoadingState.jsx

    pages/
      LoginPage.jsx
      DashboardPage.jsx
      EmailsPage.jsx
      EmailDetailPage.jsx
      ReportsPage.jsx
      SettingsPage.jsx

    context/
      AuthContext.jsx

    hooks/
      useAuth.js
      useAsyncAction.js

    styles/
      theme.js
      global.css

    utils/
      tokenStorage.js
      formatDate.js
      formatRisk.js
```

## Rolul folderelor

| Folder | Rol |
| --- | --- |
| `api` | funcții mici care cheamă backend-ul |
| `components` | piese UI refolosibile |
| `pages` | ecrane mari ale aplicației |
| `context` | stare globală simplă, în special auth |
| `hooks` | logică refolosibilă pentru componente |
| `styles` | tema dark și stiluri globale |
| `utils` | funcții mici, fără UI |

## Reguli pentru frontend

- Frontend-ul nu implementează logică de phishing.
- Frontend-ul afișează datele calculate de backend.
- `latestScan.verdict` este verdict algoritmic.
- `effectiveVerdict` este verdictul final pentru UI.
- `riskBucket` este câmpul principal pentru gruparea emailurilor.
- `mark-safe` și `mark-phishing` sunt acțiuni explicite ale utilizatorului.
- `mark-phishing` poate eșua la mutarea în Gmail Spam, dar verdictul local rămâne salvat.
- AI este opțional și se afișează doar dacă backend-ul returnează `aiExplanation`.
- Nu introducem Firebase, Supabase sau alt auth provider.

## Tema vizuală pentru MVP

Pentru prima versiune frontend:

- se păstrează doar tema dark;
- nu se implementează toggle dark/light;
- culorile exacte pot fi schimbate mai târziu;
- designul trebuie să fie mai apropiat de un dashboard de securitate decât de o landing page;
- interfața trebuie să fie clară, densă și practică.

Recomandarea pentru MVP:

- background închis;
- suprafețe de lucru gri închis;
- badge-uri clare pentru risc;
- accent vizual moderat pentru acțiuni importante;
- fără decor inutil.

## Pagini MVP

### 1. Login/Register

Scop:

- utilizatorul poate crea cont;
- utilizatorul se poate autentifica;
- tokenul se salvează local;
- după login se încarcă profilul prin `GET /api/v1/users/me`.

Endpoint-uri:

- `POST /api/v1/auth/register`;
- `POST /api/v1/auth/login`;
- `GET /api/v1/users/me`.

### 2. Dashboard

Scop:

- arată rapid starea aplicației;
- arată dacă Gmail este conectat;
- arată numărul de emailuri și scanări;
- oferă buton pentru sync manual.

Endpoint-uri:

- `GET /api/v1/meta/status`;
- `GET /api/v1/mail-accounts`;
- `POST /api/v1/mail-accounts/:id/sync`.

### 3. Emails

Scop:

- listează emailurile sincronizate;
- permite filtrare după `riskBucket`;
- arată verdictul final, scorul și starea de review.

Endpoint:

- `GET /api/v1/emails`.

Filtre importante:

- `riskBucket=safe`;
- `riskBucket=needs_review`;
- `riskBucket=quarantine`;
- `riskBucket=reviewed_safe`;
- `riskBucket=confirmed_phishing`;
- `riskBucket=unscanned`.

### 4. Email Detail

Scop:

- afișează detaliile emailului;
- afișează motivele scanării;
- afișează explicația AI dacă există;
- permite `mark-safe` și `mark-phishing`.

Endpoint-uri:

- `GET /api/v1/emails/:id`;
- `GET /api/v1/scans/emails/:emailId/latest`;
- `POST /api/v1/actions/emails/:id/mark-safe`;
- `POST /api/v1/actions/emails/:id/mark-phishing`.

### 5. Reports

Scop:

- arată sumarul lunar;
- afișează reguli declanșate frecvent;
- permite trimiterea manuală a digestului lunar.

Endpoint-uri:

- `GET /api/v1/reports/monthly-summary`;
- `POST /api/v1/reports/monthly-summary/send`.

### 6. Settings

Scop:

- afișează profilul utilizatorului;
- permite pornirea/oprirea AI per utilizator;
- permite vizualizarea setării `syncMaxResults` pentru Gmail.

Endpoint-uri:

- `GET /api/v1/users/me`;
- `PATCH /api/v1/users/me`;
- `PATCH /api/v1/users/me/ai-settings`;
- `PATCH /api/v1/mail-accounts/:id/settings`.

## Ordinea recomandată de implementare

### Faza F1 - Schelet frontend

Rezultat:

- există `frontend/`;
- aplicația pornește local;
- tema dark este definită;
- routing-ul de bază există.

### Faza F2 - Client API și auth

Rezultat:

- există `apiClient`;
- tokenul este atașat automat la request-uri;
- login/register funcționează cu backend-ul;
- rutele protejate redirecționează corect.

### Faza F3 - Layout aplicație

Rezultat:

- există layout cu sidebar/topbar;
- paginile principale sunt accesibile;
- logout șterge tokenul și revine la login.

### Faza F4 - Gmail și sync

Rezultat:

- utilizatorul poate cere URL-ul de conectare Gmail;
- poate vedea contul Gmail conectat;
- poate rula sync manual;
- vede sumarul `scanSummary`.

### Faza F5 - Email list

Rezultat:

- lista de emailuri se încarcă;
- filtrele după `riskBucket` funcționează;
- fiecare email afișează stare, scor și verdict.

### Faza F6 - Email detail și acțiuni

Rezultat:

- detaliile emailului sunt afișate clar;
- scanarea curentă este vizibilă;
- `mark-safe` și `mark-phishing` funcționează;
- UI-ul tratează clar succesul/eșecul acțiunii Gmail.

### Faza F7 - Reports și settings

Rezultat:

- sumarul lunar este afișat;
- digestul lunar poate fi trimis manual;
- AI poate fi pornit/oprit din UI;
- `syncMaxResults` poate fi ajustat.

### Faza F8 - Polish pentru demo

Rezultat:

- flow-ul demo este stabil;
- erorile sunt afișate prietenos;
- stările de loading/empty/error există;
- interfața este coerentă vizual.

## Ce rămâne după MVP

- cromatică finală și identitate vizuală mai clară;
- responsive polish pe mobil;
- teste automate pentru frontend;
- integrare deploy;
- grafice mai avansate pentru rapoarte;
- refresh automat sau polling pentru sync;
- eventual scheduler vizibil în UI dacă backend-ul îl implementează.

## Criteriu de finalizare pentru frontend MVP

Frontend-ul MVP este considerat gata când se poate demonstra cap-coadă:

1. utilizatorul se înregistrează sau se loghează;
2. conectează Gmail;
3. rulează sync manual;
4. vede emailurile grupate după risc;
5. deschide un email suspect;
6. vede scorul, regulile și explicația;
7. marchează emailul ca sigur sau phishing;
8. vede raportul lunar.
