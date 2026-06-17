# EXPLICAȚIE FRONTEND — SecureInbox

> Document de licență, pentru un cititor **începător**. Față de documentul de backend,
> aici sunt **și mai explicit**: nu doar definesc un termen, ci explic **cum funcționează
> mecanismul pe dedesubt** (cum se redesenează ecranul, cum circulă token-ul, cum „își
> amintește" o pagină datele). Fiecare termen e legat de fișierul real din `frontend/src/`.
>
> Citește de sus în jos. Fiecare secțiune: **ce problemă rezolvăm → de ce această soluție
> → de ce exact acest instrument.**

---

## 1. Ce este frontend-ul și ce problemă rezolvă

**Frontend** = partea aplicației care rulează **în browserul userului** (Chrome, Firefox...).
Ea desenează ecranele, ascultă click-urile și tastatura și cere date de la backend. În
proiect, frontend-ul stă în `frontend/src/` și pornește cu `npm --prefix frontend run dev`
pe portul `5173`.

**Problema reală.** Backend-ul știe totul despre emailuri și riscuri, dar un user nu poate
citi JSON dintr-un API. Avem nevoie de o **interfață**: o listă de emailuri, un verdict
colorat („sigur / suspect / probabil phishing"), un buton „Sync", o pagină de detaliu care
explică **de ce** un email e periculos, fără a-l expune pe user la pericol (linkurile nu se
deschid automat). Frontend-ul este **stratul de securitate vizibil**: nu citește/trimite
mailuri ca un client clasic, ci pune un **overlay de risc** peste inbox.

**De ce o aplicație separată în browser (un „SPA"), și nu pagini HTML clasice de la server?**
- **SPA** = *Single Page Application* (aplicație cu o singură pagină). Browserul încarcă o
  dată codul, apoi **schimbă conținutul fără reîncărcare** când navighezi. Avantaj: senzație
  de aplicație rapidă, fluidă (ca o aplicație de desktop), potrivită pentru un produs de
  securitate „premium".
- Logica de afișare stă lângă user, iar backend-ul rămâne un API curat — aceeași separare
  pe care o explicăm și la susținere: **backend = adevărul și deciziile; frontend = afișarea
  și interacțiunea.**

**De ce acest stack (React 19 + Vite + Tailwind v4 + shadcn/ui)?**
- **React** = o bibliotecă pentru construit interfețe din **componente** (vezi 2.1). O alegem
  pentru că e standardul industriei, are documentație uriașă (ușor de învățat și de explicat
  într-o licență) și ne lasă să compunem UI-ul din piese mici, reutilizabile.
- **Vite** = unealta care **pornește serverul de dezvoltare** și **împachetează** codul pentru
  producție. O alegem pentru viteză: când salvezi un fișier, modificarea apare instant în
  browser (*Hot Module Replacement* — înlocuirea „la cald" a modulului schimbat, fără
  reîncărcarea paginii). Tot Vite citește variabilele de mediu prin `import.meta.env`.
- **Tailwind v4** = un sistem de **clase utilitare** pentru stilizare. În loc să scrii fișiere
  CSS separate, pui clase mici direct pe element: `className="flex items-center gap-2"`
  înseamnă „aranjează pe rând, centrat vertical, cu spațiu între elemente". Avantaj: stilul
  stă lângă element, e consistent și nu crește necontrolat.
- **shadcn/ui** = o colecție de componente gata făcute (buton, card, input, dropdown...)
  **copiate în proiect** (în `frontend/src/components/ui/`), nu instalate ca bibliotecă neagră.
  Le putem citi și modifica. Aplicația e **dark-only** (doar temă întunecată) — o decizie de
  design pentru un produs de securitate.

---

## 2. Concepte React esențiale (cum funcționează, pas cu pas)

Aceste concepte revin în tot codul. Le explic o dată, în detaliu, pentru că fără ele restul
nu are sens.

### 2.1 Componentă și JSX

O **componentă** este o **funcție JavaScript care întoarce bucata de ecran** pe care vrea s-o
deseneze. „Bucata de ecran" se scrie în **JSX** = un amestec de HTML și JavaScript, permis în
fișierele React. Exemplu real, `RiskBadge.jsx` (versiune simplificată):
```jsx
export function RiskBadge({ riskBucket }) {
  const { label, tone } = getRiskMeta(riskBucket); // logica
  return <span className={tone.soft}>{label}</span>; // ce se desenează (JSX)
}
```
Aici `RiskBadge` e o componentă: primește un risc și întoarce un „pill" colorat cu eticheta.
Numele componentelor încep cu literă mare (`RiskBadge`), ca React să le deosebească de
etichetele HTML normale (`span`, `div`).

**De ce componente?** Ca să construim UI-ul din **piese mici reutilizabile**. Același
`RiskBadge` apare și în lista de emailuri, și în antetul paginii de detaliu — îl scriem o dată.

### 2.2 Props — datele care intră în componentă

**Props** (de la „properties") = **argumentele** unei componente: datele pe care i le dă
componenta-părinte. În exemplul de sus, `{ riskBucket }` e un prop. Curg mereu **de sus în
jos** (părinte → copil) și sunt **read-only**: copilul nu-și schimbă propriile props. Așa,
`<RiskBadge riskBucket="quarantine" />` desenează un badge „Likely phishing".

### 2.3 State și re-render — cum „se redesenează" ecranul

**State** = **memoria internă** a unei componente: valori care se pot schimba în timp și care,
când se schimbă, fac componenta să **se redeseneze** (re-render). Îl declarăm cu hook-ul
`useState`:
```jsx
const [searchInput, setSearchInput] = useState(''); // din InboxPage.jsx
```
Cum funcționează, pas cu pas:
1. `useState('')` creează o variabilă de stare cu valoarea inițială `''` (text gol) și îți dă
   înapoi două lucruri: **valoarea curentă** (`searchInput`) și o **funcție de actualizare**
   (`setSearchInput`).
2. Când userul scrie în căsuța de căutare, apelăm `setSearchInput('noua valoare')`.
3. React observă că starea s-a schimbat și **rulează din nou funcția componentei**, care
   întoarce JSX cu noua valoare. React compară noul rezultat cu cel vechi și **schimbă în
   browser doar ce diferă** (eficient — nu redesenează toată pagina).

Ideea-cheie de licență: în React **nu** „modifici manual" elementul din pagină. Tu schimbi
**starea**, iar UI-ul este o **funcție de stare** — se recalculează singur. Asta face codul
predictibil și ușor de explicat.

### 2.4 Hook — funcție specială care „agață" comportament în componentă

Un **hook** este o funcție al cărei nume începe cu `use` și care adaugă o capabilitate unei
componente: memorie (`useState`), efecte secundare (`useEffect`), acces la context
(`useContext`). Regula de aur: hook-urile se cheamă mereu la începutul componentei, în aceeași
ordine. În proiect avem și **hook-uri proprii** (în `frontend/src/hooks/`), explicate la 4.

**`useEffect`** merită un cuvânt: rulează cod **după** ce componenta s-a desenat — de obicei ca
să **pornească ceva** (un fetch, un ascultător de tastatură) și apoi să-l curețe. Exemplu real
(InboxPage): un `useEffect` adaugă un ascultător pentru tasta `/` (focus pe căutare) și îl
scoate când pagina dispare.

### 2.5 Context — date partajate fără să le „cari" prin toate componentele

Problema: unele date (cine e userul logat, contul Gmail, intervalul de timp ales) sunt
necesare în multe locuri. Să le pasezi din prop în prop, prin zeci de componente, e obositor
(„prop drilling"). **Context** rezolvă asta: un **Provider** ține datele „sus", iar orice
componentă de dedesubt le citește direct cu un hook. Detaliile la secțiunea 5.

---

## 3. Cum e organizat frontend-ul (harta folderelor)

În `frontend/src/`:

```
main.jsx       Punctul de pornire: montează aplicația în pagină + furnizorii globali.
App.jsx        Harta de rute (ce pagină se vede la ce adresă).
api/           Câte un fișier per resursă; apiClient.js pune token-ul automat.
context/       AuthContext · MailAccountContext · TimeRangeContext (date partajate).
hooks/         useApi · useAsyncAction · useAuth · useDebounce (logică reutilizabilă).
lib/           risk.js (culorile/etichetele de risc) · scoring.js · email.js ...
pages/         Câte o componentă per ecran: Dashboard, Inbox, EmailDetail, ...
components/     layout/ (scheletul) · security/ (badge, detalii scan) · ui/ (shadcn) ...
utils/         formatDate · sanitizeEmailHtml · tokenStorage.
index.css      Temă: variabilele de culoare (inclusiv --color-risk-*).
```

### 3.1 Pornirea aplicației (`main.jsx`) și rutele (`App.jsx`)

`main.jsx` „montează" React în pagina goală (`<div id="root">`) și înfășoară aplicația în
câțiva **furnizori globali**, în ordine:
```jsx
<BrowserRouter>           // dă aplicației rutare (adrese fără reîncărcare)
  <MotionConfig>          // setări globale de animație (framer-motion)
    <AuthProvider>        // cine e userul logat — disponibil peste tot
      <App />             // aplicația propriu-zisă
      <Toaster />         // notificările-„toast" (sonner)
```

**Rutare (routing)** = potrivirea dintre **adresa din bara browserului** și **pagina care se
afișează**, fără a reîncărca tot. Folosim biblioteca `react-router-dom`. În `App.jsx`:
```jsx
<Route path="/login" element={<LoginPage />} />
<Route element={<ProtectedRoute><AppShell /></ProtectedRoute>}>
  <Route path="/dashboard" element={<DashboardPage />} />
  <Route path="/inbox" element={<InboxPage />} />
  <Route path="/inbox/:emailId" element={<EmailDetailPage />} />
  ...
```
- `/login` e public.
- Tot restul e **protejat**: e înfășurat în `ProtectedRoute`, care verifică dacă ești logat;
  dacă nu, te trimite la `/login` (vezi `components/auth/ProtectedRoute.jsx`).
- `:emailId` e un **parametru de rută**: `/inbox/123` deschide emailul cu id-ul 123.
- `AppShell` e scheletul comun (bară laterală + zona de conținut) în care se „injectează"
  pagina curentă printr-un `<Outlet />`.

---

## 4. Cum vorbește frontend-ul cu backend-ul (stratul de API)

Regula de aur a proiectului: **nicio componentă nu cheamă serverul direct.** Tot traficul
trece printr-un singur loc, ca să fie consistent și ușor de schimbat.

### 4.1 `apiClient.js` — clientul central

`frontend/src/api/apiClient.js` e funcția prin care pleacă **orice** cerere. Ce face, pas cu
pas (funcția `apiRequest`):
1. **Construiește anteturile** (`buildHeaders`): dacă există un token salvat, adaugă
   `Authorization: Bearer <token>` automat. Asta e legătura cu backend-ul — vezi 4.3.
2. **Trimite cererea** cu `fetch` (funcția nativă din browser pentru apeluri HTTP) către
   `VITE_API_BASE_URL` (implicit `/api/v1`).
3. **Citește răspunsul.** Backend-ul răspunde mereu cu forma `{ success, data, ... }`; clientul
   întoarce direct `data`, ca să nu repetăm despachetarea peste tot.
4. **La eroare**, aruncă un obiect `ApiError` cu `message`, `statusCode` și `code` (codul
   stabil din backend, ex. `LIST_CONFLICT`). Componentele pot reacționa pe baza lui.
5. **Caz special de securitate:** dacă serverul răspunde `401` **și** codul începe cu `AUTH_`
   (deci e o problemă reală de sesiune, nu, de exemplu, un token Gmail expirat), clientul
   **șterge token-ul** local — adică te scoate din cont. Un `401` legat de Gmail **nu** te
   deloghează (lecție învățată dintr-un bug real, vezi `docs/PROGRESS.md`).

`apiClient` expune scurtături comode: `get`, `post`, `patch`, `del`.

### 4.2 Câte un fișier per resursă

Pentru fiecare zonă de date există un fișier în `api/`: `emailsApi.js`, `scansApi.js`,
`authApi.js`, `usersApi.js`, `mailAccountsApi.js`, `senderListsApi.js`, `reportsApi.js`,
`actionsApi.js`, `metaApi.js`, `contactApi.js`. Ele doar **traduc o acțiune într-un apel**.
Exemplu real, `emailsApi.js`:
```js
export const getEmails = (params) => apiClient.get(`/emails${toQueryString(params)}`);
export const getEmail  = (emailId) => apiClient.get(`/emails/${emailId}`);
```
`toQueryString` transformă un obiect `{ from, to, page }` în `?from=...&to=...&page=...`,
ignorând valorile goale. *De ce stratul ăsta:* dacă mâine se schimbă o adresă din API, o
schimbăm într-un singur fișier, nu în zece pagini.

### 4.3 Cum circulă token-ul (continuarea poveștii JWT din backend)

În backend am explicat că un **JWT** e un bilet semnat care dovedește cine ești. Iată **partea
de browser**, pas cu pas:
1. La login/register, backend-ul întoarce `{ token, user }`. Frontend-ul **salvează token-ul**
   în `localStorage` cu cheia `secureinbox_token` (vezi `utils/tokenStorage.js`).
   `localStorage` = o mică memorie a browserului care **persistă** chiar și după închiderea
   tab-ului (de aceea rămâi logat).
2. La **fiecare** cerere ulterioară, `apiClient` citește token-ul și îl atașează în antetul
   `Authorization: Bearer <token>` (4.1).
3. Backend-ul verifică semnătura token-ului și știe cine ești, fără să mai ceară parola.
4. **Logout** = pur și simplu ștergem token-ul din `localStorage` (`clearStoredToken`). Nu
   există „logout pe server" — fără token, următoarea cerere e respinsă.

`tokenStorage.js` verifică întâi că `localStorage` există (cod defensiv) și ascunde detaliile
în trei funcții: `getStoredToken`, `setStoredToken`, `clearStoredToken`.

### 4.4 Hook-urile de date (`hooks/`)

Ca să nu rescriem „încarcă / arată spinner / prinde eroarea" în fiecare pagină, avem hook-uri:

- **`useApi(fetcher, deps, cacheKey)`** — pentru **citire** de date. Îi dai o funcție care
  aduce date; el îți întoarce `{ data, loading, error, reload }`. Cum lucrează:
  - pune `loading = true`, cheamă funcția, salvează rezultatul în `data`, sau pune mesajul în
    `error`;
  - **re-execută** automat când se schimbă `deps` (ex. alt interval de timp → reîncarcă);
  - dacă dai un `cacheKey`, ține rezultatul într-un **cache** comun (*stale-while-revalidate*):
    la revenirea pe o pagină arată instant datele vechi, apoi le reîmprospătează în fundal —
    fără spinner inutil. `bustCache`/`bustCacheByPrefix` golesc cache-ul după o modificare.

- **`useAsyncAction(action)`** — pentru **scriere** (mutații: marchează safe, adaugă o regulă).
  Îți dă `{ run, loading, error }`: `run(...)` execută acțiunea și ține evidența stării de
  „în curs". Vezi `ReviewActions.jsx`.

- **`useAuth()`** — scurtătură care citește `AuthContext` (5.1).
- **`useDebounce(value, ms)`** — întârzie o valoare. La căutare, așteaptă 300 ms după ce userul
  s-a oprit din tastat înainte de a chema API-ul, ca să nu trimită o cerere la fiecare literă.

---

## 5. Date partajate în toată aplicația (contextele)

Trei contexte (`frontend/src/context/`). Fiecare are un **Provider** (ține datele) și un hook
(le citește).

### 5.1 `AuthContext` — cine e userul logat

`AuthProvider` (înfășoară toată aplicația, din `main.jsx`) ține: `token`, `user`,
`isAuthenticated`, plus funcțiile `login`, `register`, `logout`, `refreshUser`. Mecanismul:
- la pornire, dacă există un token salvat, cheamă `getMe()` (`GET /users/me`) ca să afle cine
  e userul; dacă token-ul e invalid, îl șterge și te consideră nelogat;
- `login`/`register` cheamă API-ul, salvează token-ul și pun userul în stare;
- `isAuthenticated = Boolean(token && user)` — pe el se bazează `ProtectedRoute`.

Orice componentă scrie `const { user, logout } = useAuth();` și are acces — fără să fie pasat
prin props.

### 5.2 `MailAccountContext` — contul Gmail și sincronizarea

`MailAccountProvider` (înfășoară zona logată, din `AppShell`) ține contul Gmail conectat și
expune: `account`, `isConnected`, `syncing`, `lastSync`, `syncVersion` și funcția `sync()`.
- **`sync()`** e singurul mod corect de a sincroniza: cheamă API-ul de sync, apoi **incrementează
  `syncVersion`**. De ce contează `syncVersion`: paginile au `syncVersion` în `deps`-ul lui
  `useApi`, deci când crește, **toate** se reîncarcă singure cu emailurile noi. Un singur semnal
  reîmprospătează tot UI-ul.

### 5.3 `TimeRangeContext` — intervalul de timp global

`TimeRangeProvider` ține intervalul `From/To` ales (selectorul stă pe Dashboard). Expune
`from`/`to` ca șiruri ISO gata de pus în `?from=&to=`, plus o etichetă și `setRange`. Astfel
Dashboard-ul, Inbox-ul și raportul pe email **arată mereu aceeași perioadă** — o singură sursă
de adevăr pentru „ce interval privim". E memorie în RAM: un refresh complet revine la implicit
(ultimele 30 de zile).

---

## 6. Cum se afișează riscul (single source of truth)

### 6.1 `lib/risk.js` — culorile și etichetele verdictului

Regula de aur: **nicio componentă nu inventează o culoare de risc.** Tot ce ține de aspectul
unui verdict vine din `frontend/src/lib/risk.js`. Backend-ul trimite două câmpuri:
- `riskBucket`: `safe`, `needs_review`, `quarantine`, `reviewed_safe`, `confirmed_phishing`,
  `unscanned`;
- `effectiveVerdict`: `safe`, `suspicious`, `likely_phishing`, `phishing`.

`risk.js` mapează fiecare la o „meta": etichetă (în engleză, în UI), descriere, **ton** (icon +
clase de culoare). `getRiskMeta(riskBucket)` întoarce exact ce afișează badge-urile, bannerele
și cardurile. Culorile reale sunt **variabile CSS** (`--color-risk-safe`, `--color-risk-quarantine`...)
definite în `index.css`, deci nu există valori hexazecimale dublate prin cod. Cele patru tonuri
sunt distincte pe tema întunecată: verde / chihlimbar / roz / violet, toate verificate să treacă
contrastul **WCAG 2.1 AA** (accesibilitate — text lizibil pentru toți).

Tot aici stau și **etichetele/descrierile prietenoase ale regulilor** (`getRuleLabel`,
`getRuleDescription`): traduc un cod tehnic ca `suspicious_link_pattern:ip_address_link` în
„Link uses IP address" / „A link points to a raw IP address...". Așa userul vede explicații
umane, nu jargon.

### 6.2 `lib/scoring.js` — maximele pentru barele de scor

Backend-ul calculează scorul, dar UI-ul are nevoie de **numitorii** pentru barele proporționale.
`scoring.js` e o **copie** a maximelor din backend (`SCORE_MAX = 100`, `AI_SCORE_MAX = 50`),
pentru că Vite nu poate importa direct configul backend-ului. Comentariul din fișier cere
explicit să fie ținute sincronizate. Tot aici, `getAiStatus(scan)` transformă starea AI a unui
scan într-un mesaj prietenos („AI analysis is turned off...", „...timed out...") — câte unul
specific per mod de eșec, nu o notă generică.

### 6.3 Componentele de securitate

În `components/security/`:
- **`RiskBadge`** — pill-ul colorat cu verdictul; ia totul din `getRiskMeta`.
- **`ScanDetails`** — panoul cu scorul, barele reguli/AI și lista regulilor declanșate.
- **`ThreatSignals`** — semnalele de amenințare evidențiate.
- **`ReviewActions`** — butoanele „Mark safe / Mark phishing" (6.4).
- **`SenderListActions`** — meniul „Trust / Block" pentru expeditor sau domeniu.

### 6.4 Decizia userului învinge scanul — și e „optimistă"

`ReviewActions.jsx` arată un tipar important. Când userul apasă „Mark safe":
1. **Optimistic update:** schimbăm imediat starea locală la „safe" (UI-ul reacționează instant,
   fără să aștepte serverul) — `setVerdict(kind)`.
2. Cheamă API-ul (`markEmailSafe`). Dacă **reușește**, afișează un toast de confirmare și anunță
   pagina-părinte (`onReviewed`), care golește cache-urile ca lista și dashboard-ul să se
   actualizeze.
3. Dacă **eșuează**, dă starea înapoi la valoarea dinainte („roll back") și arată o eroare.

`mark-phishing` mută emailul și în **Gmail Spam** (acțiune făcută de backend). Decizia manuală a
userului devine `effectiveVerdict` peste tot — exact ce am explicat la `email-state.service.js`
în documentul de backend.

---

## 7. Paginile (ce vede userul)

În `frontend/src/pages/`:

- **`LoginPage`** — un singur formular care comută între „Sign in" și „Create account". La
  înregistrare arată, în timp real, **puterea parolei** și o listă de cerințe (8 caractere, o
  majusculă, o cifră...) — toate calculate local cu `useMemo` (memorează un calcul ca să nu-l
  refacă la fiecare tastă). La trimitere cheamă `login`/`register` din `AuthContext`, apoi
  navighează la pagina cerută inițial.
- **`DashboardPage`** — hub-ul aplicației: scor de „postură", carduri de statistici, trend de
  amenințări, „risk donut", „cine te țintește", „cele mai frecvente semne de avertizare" și
  „trimite-mi raportul pe email". Aici stă **selectorul global de timp**.
- **`InboxPage`** — lista emailurilor scanate. Are: **chipuri de filtrare** pe verdict (cu
  numărători), **căutare** cu debounce, **selecție în masă** (marchează mai multe deodată),
  grupare pe dată (Azi / Ieri / Săptămâna asta / Mai vechi), paginare și butonul **Sync** (prin
  `MailAccountContext.sync()`). Cheia de cache include `from-to-syncVersion-filtru-căutare-pagină`,
  deci orice schimbare cere exact datele potrivite.
- **`EmailDetailPage`** — pagina de detaliu a unui email. Conține: un **card de verdict** cu un
  inel de scor animat și culoarea verdictului pe margine; un **banner de avertizare** la
  emailurile riscante („nu da click pe linkuri, nu deschide atașamente"); corpul emailului
  **curățat** de scripturi periculoase; listele de **linkuri** (cu buton de copiere, fără
  deschidere automată) și **atașamente**; **anteturile brute** (pentru analiză tehnică);
  panoul de securitate cu `ReviewActions` + `ScanDetails`; butonul **„Scan again"** și acțiunile
  de listă (trust/block). Permite navigare cu tastatura între emailuri (← / →).
- **`SenderListsPage`** — gestionarea listelor de încredere/blocate: carduri de sumar, căutare +
  filtre, câte emailuri acoperă fiecare regulă, formular de adăugare și „cum funcționează regulile".
- **`SettingsPage`** — profil, conectarea Gmail + dimensiunea sync-ului, comutatorul AI,
  notificările, ora digestului, link către listele de expeditori, ștergerea contului.

### 7.1 Scheletul comun (`components/layout/AppShell.jsx`)

`AppShell` e cadrul în care trăiesc paginile logate: bara laterală (`Sidebar`), bara de sus pe
mobil, tranzițiile între pagini și — important — **furnizorii** `MailAccountProvider` și
`TimeRangeProvider`. De aceea contul Gmail și intervalul de timp sunt disponibile pe orice
pagină logată, dar nu pe `/login`.

---

## 8. Siguranța conținutului afișat (de ce nu „explodează" un email periculos)

Un email de phishing poate conține HTML și scripturi rău intenționate. Două apărări:
- **`utils/sanitizeEmailHtml.js`** — **curăță** HTML-ul emailului înainte de afișare, scoțând
  scripturile și elementele periculoase. *De ce:* afișăm conținutul ca să-l poată inspecta
  userul, dar fără să-l lăsăm să ruleze cod în browser.
- **Linkurile nu se deschid automat.** Pe pagina de detaliu, fiecare link e doar **text cu un
  buton de copiere**; userul nu poate da click accidental pe un link de phishing.

Acestea sunt exact genul de decizii pe care le aperi la o licență de securitate: arătăm
pericolul **fără** a-l declanșa.

---

## 9. De ce React și nu alternativele (pentru susținere)

- **De ce nu pagini randate de server (server-side HTML)?** Aplicația e foarte interactivă
  (filtre, căutare live, selecție în masă, animații). Un SPA dă o experiență fluidă, fără
  reîncărcări, potrivită unui produs de securitate.
- **De ce nu Angular / Vue?** Toate ar funcționa; React are cea mai mare comunitate și
  documentație, deci e cel mai ușor de învățat și de explicat într-o licență — exact obiectivul
  proiectului.
- **De ce Tailwind și nu CSS clasic sau o bibliotecă mare de componente (ex. MUI)?** Tailwind
  ține stilul lângă element și consistent; shadcn/ui ne dă componente **pe care le deținem în
  cod** și le putem citi. Evităm o „cutie neagră" de UI și păstrăm controlul total asupra temei
  întunecate și a contrastului WCAG.

---

## 10. Rezumat pentru susținere (firul roșu)

1. **Problema:** userul are nevoie de o interfață care arată riscul fiecărui email, clar și
   sigur, fără a-l expune la pericol.
2. **Soluția:** un SPA React care **nu** cheamă serverul direct, ci printr-un strat de API cu
   token automat; ține datele partajate în contexte; afișează verdictele dintr-o **singură
   sursă de adevăr** pentru culori/etichete; și protejează userul (HTML curățat, linkuri
   needeschise).
3. **De ce așa:** UI-ul ca **funcție de stare** (predictibil, ușor de explicat); separare
   curată „backend = decizii, frontend = afișare"; un stack standard, bine documentat și pe care
   îl deținem în cod.
4. **Firul datelor:** `API (apiClient)` → `hook (useApi)` → `context / pagină` → `componentă` →
   ecran; iar înapoi, o acțiune a userului → `useAsyncAction` → API → golire cache → re-render.

> Documente conexe: `docs/EXPLICATIE_BACKEND.md` (serverul), `docs/EXPLICATIE_FLUX.md`
> (fluxurile cap-coadă, frontend ↔ backend ↔ DB ↔ AI), `docs/PHISHING_RULES.md`.
