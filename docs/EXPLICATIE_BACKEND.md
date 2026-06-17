# EXPLICAȚIE BACKEND — SecureInbox

> Document de licență, pentru un cititor **începător**. Fiecare termen tehnic este
> definit în propoziție simplă **prima dată** când apare și este legat de fișierul
> real din acest proiect unde se vede în practică. Citește de sus în jos: fiecare
> secțiune se sprijină pe cea dinainte.
>
> Stilul fiecărei secțiuni: **ce problemă rezolvăm → de ce această soluție → de ce
> exact acest instrument**. Exact cadrul în care se susține un capitol de licență.

---

## 1. Ce este backend-ul și ce problemă rezolvă

**Backend** = partea aplicației care rulează pe server (nu în browserul userului). Ea
ține datele, ia deciziile și expune un set de adrese (un *API*) pe care frontend-ul le
apelează. În proiectul nostru, backend-ul stă în folderul `backend/src/` și pornește
cu comanda `npm --prefix backend run dev` pe portul `5500`.

**Problema reală.** Phishing-ul (emailuri false care imită bănci, Google, PayPal etc.
ca să-ți fure parola sau banii) este greu de recunoscut cu ochiul liber. SecureInbox
se conectează la Gmail-ul userului, citește emailurile, le **scanează** cu un motor
de detecție și pune pe fiecare un **verdict de risc** (sigur / suspect / probabil
phishing). Nu este un client de email (nu trimite, nu șterge, nu răspunde) — este un
**strat de securitate** așezat peste inboxul Gmail.

**De ce un backend separat, și nu totul în browser?**
1. **Secretele nu pot sta în browser.** Cheile Google OAuth, cheia care criptează
   tokenii Gmail, secretul cu care semnăm sesiunile — toate trebuie să rămână pe
   server, unde userul nu le poate citi. (Vezi `backend/src/config/env.js`.)
2. **Logica trebuie să fie de încredere.** Dacă scorul de risc s-ar calcula în
   browser, un atacator l-ar putea modifica. Pe server, regulile sunt fixe.
3. **Sarcini de fundal.** Sincronizarea automată la fiecare 15 minute și emailurile
   de alertă rulează singure, fără ca userul să țină aplicația deschisă. Asta cere un
   proces care trăiește permanent — adică un backend.

**De ce acest stack (Node.js + Express + MongoDB + Mongoose)?**
- **Node.js** = mediul care rulează JavaScript pe server (nu doar în browser). Avantaj
  de licență: **un singur limbaj** (JavaScript) pe tot proiectul — frontend și backend
  — deci mai puțin de învățat și de explicat.
- **Express** = o bibliotecă mică peste Node care ne ajută să definim adrese (rute) și
  pașii prin care trece o cerere. Este standardul de facto, simplu, fără magie ascunsă.
  Aplicația Express se construiește în `backend/src/app.js`.
- **MongoDB** = o bază de date *de tip document*. În loc de tabele cu rânduri și
  coloane (ca în SQL), ține **documente** — obiecte asemănătoare cu JSON. Se
  potrivește natural cu un email, care are formă neregulată (titlu, expeditor, linkuri,
  atașamente, semnale de risc).
- **Mongoose** = o bibliotecă care pune **reguli și formă** peste MongoDB. Definim o
  *schemă* (lista câmpurilor permise și tipurile lor) și Mongoose ne dă obiecte cu care
  lucrăm comod, validează datele și creează indexuri. Schemele stau în
  `backend/src/models/`.
- **Ollama** (opțional) = un program care rulează un model AI (un LLM) **local**, pe
  aceeași mașină, fără să trimită emailurile în cloud. Îl folosim ca **al doilea
  opinionat** lângă reguli. „Local" e cheia pentru o aplicație de securitate: datele
  userului nu părăsesc serverul.

---

## 2. Cum curge o cerere prin backend (straturile)

Orice apel din frontend (de ex. „dă-mi lista de emailuri") trece prin aceleași
straturi, în aceeași ordine. Le definim o singură dată aici; restul documentului doar
le numește.

```
routes/  →  middlewares/  →  controllers/  →  services/  →  models/  →  MongoDB
```

- **Rută (route)** = perechea dintre o adresă (URL) + o metodă HTTP (GET, POST...) și
  funcția care o tratează. „Când vine `GET /emails`, cheamă funcția X." Rutele stau în
  `backend/src/routes/*.routes.js`. Exemplu real, `email.routes.js`:
  ```js
  emailRouter.get('/', authorize, getEmails);
  ```
  Adică: la `GET /api/v1/emails`, trece întâi prin `authorize`, apoi prin `getEmails`.

- **Middleware** = o funcție care se execută **între** cerere și răspuns, ca un filtru.
  Poate opri cererea (ex: „nu ești autentificat") sau o poate îmbogăți (ex: atașează
  userul). În proiect avem patru, în `backend/src/middlewares/`:
  - `auth.middleware.js` — verifică **token-ul** (vezi mai jos), găsește userul și îl
    pune pe `req.user`. Fără el, cererea e respinsă cu 401.
  - `validate.middleware.js` — verifică că datele trimise de user respectă o **schemă
    de validare** (vezi `validations/`). Dacă nu, întoarce 400 fără să ajungă la logică.
  - `error.middleware.js` — **prinde toate erorile** dintr-un loc și le transformă într-un
    răspuns JSON uniform. E ultimul în lanț (în `app.js`).
  - `role.middleware.js` — verifică rolul userului (ex: admin) acolo unde e nevoie.

- **Token / Bearer token / JWT.** Un **token** e un bilet de acces. Userul se loghează
  o dată, primește un **JWT** (*JSON Web Token* — un șir semnat criptografic ce conține
  `userId`-ul și o dată de expirare). La fiecare cerere următoare îl trimite în antetul
  `Authorization: Bearer <token>`. „Bearer" = „purtătorul acestui bilet are acces".
  Serverul **verifică semnătura** (nu poate fi falsificat fără secretul `JWT_SECRET`) și
  știe cine ești, fără să mai ceară parola. Logica e în `auth.middleware.js` (verificare)
  și în `auth.service.js` (emiterea token-ului la login/register). **Nu există logout pe
  backend** — frontend-ul pur și simplu uită token-ul.

- **Controller** = funcția care „prinde" cererea după middleware-uri. E **subțire**
  intenționat: citește ce a trimis userul, cheamă serviciul potrivit, împachetează
  răspunsul. **Fără logică de business.** Stau în `backend/src/controllers/`. Exemplu
  real, `email.controller.js`:
  ```js
  export const getEmails = async (req, res, next) => {
    try {
      const result = await getEmailsForUser({ userId: req.user._id, query: req.query });
      res.status(200).json({ success: true, data: result });
    } catch (error) {
      next(error); // trimite eroarea la error.middleware
    }
  };
  ```
  Observă: controllerul nu „știe" cum se aduc emailurile — doar cheamă `getEmailsForUser`.

- **async / await / Promise.** Multe operații (citit din DB, apel la Gmail) durează și
  **nu** blochează serverul cât așteaptă. O **Promise** e „promisiunea unui rezultat
  care vine mai târziu". `async` marchează o funcție care poate aștepta; `await`
  înseamnă „așteaptă rezultatul acestei promisiuni înainte de a merge mai departe".
  Vezi orice `await getEmailsForUser(...)` din controllere.

- **Service (serviciu)** = stratul cu **toată logica** și **singurul** care atinge baza
  de date. Stau în `backend/src/services/`. Aici trăiește motorul de scanare, sincronizarea
  Gmail, autentificarea etc. Convenția proiectului: serviciile exportă funcții cu nume
  clare (ex. `getEmailsForUser`, `scanEmailWithRules`).

- **Model / schemă / document.** Un **model** Mongoose descrie forma unui tip de dată și
  ne dă funcții ca `find`, `create`, `updateOne`. Un **document** e o înregistrare
  concretă (un email, un user). Modelele stau în `backend/src/models/`. Cele cinci sunt:
  `user`, `mail-account`, `email`, `scan`, `sender-list`.

**Tratarea uniformă a erorilor.** Oriunde apare o problemă în servicii, aruncăm o eroare
construită cu helperul `createError` (în `backend/src/common/errors/create-error.js`):
```js
throw createError('User already exists', 409, [], 'USER_ALREADY_EXISTS');
//                 mesaj uman,           status, detalii, COD stabil
```
**Codul** (scris cu MAJUSCULE_CU_UNDERSCORE) e important: frontend-ul îl citește ca să
afișeze mesajul potrivit. `error.middleware.js` transformă orice astfel de eroare într-un
JSON `{ success: false, statusCode, message, code }`.

---

## 3. Modelele de date (ce ținem în MongoDB)

Cinci scheme, în `backend/src/models/`. Fiecare e un tip de document.

| Model | Fișier | Ce reprezintă |
|-------|--------|---------------|
| `User` | `user.model.js` | Contul: nume, email, parola **hashuită** (niciodată în clar), rol, `settings` (AI on/off, alerte, digest). |
| `MailAccount` | `mail-account.model.js` | Contul Gmail conectat: email, tokenii OAuth **criptați**, data ultimei sincronizări, câte emailuri se aduc la un sync. |
| `Email` | `email.model.js` | Un email sincronizat din Gmail: expeditor, domeniu, titlu, corp, linkuri, atașamente + verdictul manual al userului (`userVerdict`). |
| `Scan` | `scan.model.js` | Rezultatul scanării unui email: scor, verdict, regulile declanșate, semnalele AI, explicația. **Un singur scan „curent" per email** (index unic `userId + emailId`). |
| `SenderListEntry` | `sender-list.model.js` | O regulă a userului: „am încredere / blochez" un expeditor sau un întreg domeniu. |

**De ce câmpurile de pe `Email` (ex. `senderDomain`, `linkCount`, `suspiciousLinkPatterns`)
sunt calculate la sincronizare și salvate?** Pentru ca **scanarea să fie rapidă și
repetabilă**: nu reparsăm emailul brut de fiecare dată; extragem semnalele o singură dată,
la intrare, și le ținem gata de folosit. (Vezi `email-parser.service.js`, secțiunea 5.)

Un detaliu de schemă des întâlnit (din `email.model.js`):
```js
emailSchema.index({ userId: 1, providerMessageId: 1 }, { unique: true });
```
**Index unic** = baza de date garantează că nu pot exista două emailuri cu același
`providerMessageId` (id-ul de la Gmail) pentru același user. Așa, re-sincronizarea
aceluiași email îl **actualizează** în loc să-l dubleze.

---

## 4. Motorul de scanare — inima aplicației

Aici se câștigă licența. Versiunea motorului este `rules-ai-v7` (constanta
`CURRENT_SCAN_ENGINE_VERSION` din `scan.service.js`). Numerotarea ne spune că engine-ul
a evoluat; scanările vechi își păstrează scorul vechi până la o re-scanare.

### 4.1 Ideea de bază: scor → verdict

Modelul de scor e simplu și **transparent** (un avantaj de licență: poți explica de ce
un email a primit un verdict, spre deosebire de o „cutie neagră" pură):

```
scorFinal = min(100, scorReguli + scorAI)
```

apoi pragurile (din `backend/src/config/scoring.config.js`) traduc scorul în verdict:

```
>= 60  → likely_phishing  (risc mare)
>= 30  → suspicious       (risc mediu)
<  30  → safe             (sigur)
```

Funcția care face traducerea, în `scan.service.js`:
```js
export const mapScoreToVerdict = (score) => {
  if (score >= RISK_THRESHOLDS.likelyPhishing) return 'likely_phishing';
  if (score >= RISK_THRESHOLDS.suspicious)     return 'suspicious';
  return 'safe';
};
```

### 4.2 De ce „hibrid" (reguli + AI), și nu doar AI?

**Reguli deterministe** = condiții fixe scrise de noi (ex: „linkul duce către o adresă
IP în loc de un nume de domeniu → +25 puncte"). Sunt **primare**: explicabile, rapide,
nu greșesc imprevizibil.

**Semnale AI** = un model de limbaj (LLM) citește textul și spune dacă există urgență,
cerere de parolă, inginerie socială, impersonare. Sunt **secundare și plafonate**.

Cele trei **invariante** pe care le păstrează cifrele (documentate în `scoring.config.js`):
1. Niciun semnal singur nu atinge pragul de 60 de unul singur.
2. Niciun semnal slab nu trece singur de banda medie (≥30).
3. **AI singur nu poate declara phishing**: `AI_SCORE_MAX = 50 < 60`. Adică AI poate
   ridica suspiciunea și corobora regulile, dar verdictul „probabil phishing" cere ca
   **regulile** (faptele dure) să fie de acord. Asta ne apără de halucinațiile modelului
   — o problemă reală a oricărei aplicații bazate pe LLM.

### 4.3 Greutățile (din `scoring.config.js`)

Acest fișier este **singura sursă de adevăr** pentru toate punctele și pragurile. Câteva
greutăți de reguli (`RULE_WEIGHTS`), cu rațiunea lor:

| Regulă | Puncte | De ce |
|--------|-------:|-------|
| `high_risk_attachment_extension` (.exe, .scr, .js...) | 35 | atașamente executabile = aproape sigur abuz |
| `ip_address_link` | 25 | serviciile reale nu trimit linkuri către un IP brut |
| `embedded_credentials` (`user:pass@host`) | 25 | extrem de anormal în email real |
| `punycode_domain` (`xn--...`) | 20 | trucul vizual „paypaI.com" |
| `reply_to_mismatch` | 18 | apare și la mail legitim de marketing → coborât de la „tare" |
| `shortened_url_detected` (bit.ly...) | 15 | dual-use: și newsletterele folosesc scurtături |
| `too_many_links_high` (≥10 linkuri) | 18 | euristică slabă, nu trebuie să ajungă singură la „suspect" |

Semnalele AI (`AI_SIGNAL_WEIGHTS`) sunt mai conservatoare; cel mai puternic este
`sensitive_data_request` (cerere de parolă/OTP/card) = 20.

### 4.4 Două straturi de context peste reguli

Punctele de mai sus nu se aplică orbește. Două straturi le pot **reduce** (niciodată
crește), prin `applyScoreContextModifiers`:

1. **Brand verificat** (`brand-verification.service.js` + `config/brand-domains.config.js`).
   Dacă emailul vine **chiar** de pe domeniul oficial al unui brand cunoscut (verificare
   *suffix-aware*: `mail.paypal.com` se potrivește, dar `evil-paypal.com` și
   `paypal.com.evil.com` NU se potrivesc),
   atunci semnale care par phishy în abstract (urgență, multe linkuri, buton „Sign in")
   sunt **exact** cum arată mailul real al unui brand — deci le discountăm. Excepție: cererea
   de date sensibile rămâne la greutate plină (nici brandul real nu-ți cere parola pe email).
   *De ce pe domeniu și nu pe text?* Domeniul expeditor e singurul lucru pe care atacatorul
   **nu** îl poate falsifica pentru un domeniu controlat de brand.

2. **Liste de expeditori ale userului** (`sender-list.service.js`) — decizii **explicite**
   ale userului, nu euristici:
   - **Allowlist** („am încredere") → semnalele *contextuale* se mutează, dar cele
     *critice* (parolă, atașamente periculoase, linkuri IP, credențiale, punycode) rămân
     la greutate plină. Deci „de încredere" ≠ „mereu sigur".
   - **Blocklist** („blochez") → adaugă fix pragul de 60 (`USER_BLOCKLIST_RULE_POINTS =
     RISK_THRESHOLDS.likelyPhishing`), deci verdictul `likely_phishing` e **garantat**.
     *De ce are voie userul să decidă singur verdictul?* Pentru că „blochez expeditorul"
     nu e o euristică ce poate greși — e voința explicită a userului.

   Când ambele straturi se aplică, motorul ia **multiplicatorul minim** (discounturile nu
   se cumulează; un strat poate doar coborî o greutate).

### 4.5 Pașii unei scanări (funcția `scanEmailWithRules`)

Pentru un email, în ordine (vezi `scan.service.js`):

1. **Găsește emailul** userului (`findOwnedEmail`) — fiecare user vede doar emailurile lui.
2. **Context liste** (`getSenderListContextForEmail`): e expeditorul pe allowlist/blocklist?
3. **Context brand** (`verifySenderBrand`): e domeniul un brand oficial? (Un expeditor
   blocat nu mai e tratat ca „brand verificat" — blocarea userului învinge.)
4. **Pregătește inputul pentru AI** (`buildAiAnalysisInput`): taie textul la dimensiuni
   sigure, include doar primele câteva linkuri și contextul de brand.
5. **AI pornit?** Citește `settings.aiEnabled` al userului.
6. **Scor reguli** (`calculateRulesForEmail`): aplică toate regulile deterministe.
7. **Semnale AI** (`analyzeEmailSemanticsWithOllama`) — doar dacă AI e pornit; altfel
   un obiect „disabled".
8. **Scor AI** (`calculateAiScoreFromSignals`): transformă semnalele în puncte, plafonat
   la 50.
9. **Scor final** = `min(100, scorReguli + scorAI)` → `mapScoreToVerdict`.
10. **Explicație** în limbaj natural (secțiunea 4.6).
11. **Salvează** (`upsertCurrentScanForEmail`): un singur scan curent per email; eventualele
    dubluri se șterg.

### 4.6 Explicația „de ce" (transparența verdictului)

Un verdict fără explicație nu ajută userul. De aceea fiecare scan poartă o explicație:
- **AI** (`ollama-explanation.service.js`) când AI a generat un text curat, sau
- **fallback controlat** (`scan-explanation.service.js`) — un text construit din regulile
  declanșate, când AI e oprit sau a eșuat.

`resolveExplanationResult` (în `scan.service.js`) decide care variantă se salvează. Astfel
aplicația **nu rămâne niciodată fără explicație**, indiferent dacă Ollama merge sau nu.

### 4.7 Cum funcționează stratul AI (Ollama)

`ollama-semantic.service.js` trimite emailul la modelul local și cere **JSON strict** cu
chei fixe (`urgencyLevel`, `sensitiveDataRequest`, `brandImpersonationSuspected`...).
Detalii de inginerie care contează la susținere:
- **Prompt de sistem** diferit pentru branduri verificate (îi spune modelului „acesta e
  expeditor legitim, caută alte semnale, nu impersonare").
- **`temperature: 0`** = răspunsuri cât mai deterministe (mai puțină inventivitate).
- **Timeout + fallback**: dacă modelul nu răspunde la timp sau dă text neparsabil, scanul
  marchează AI ca `failed` și folosește doar regulile. Aplicația nu se blochează.
- **Plafonare**: oricât ar „țipa" AI, contribuția lui e tăiată la 50 (vezi 4.2).

---

## 5. De la Gmail la baza de date (parsarea și sincronizarea)

### 5.1 Conectarea contului Gmail — OAuth

**OAuth** = un protocol prin care userul dă aplicației acces la Gmail **fără să-i dea
parola** — Google emite niște *tokeni* de acces. Pașii (în `mail-account.service.js`):
1. `getGoogleConnectUrl` construiește URL-ul de consimțământ Google. În el pune un
   **state** = un JWT de scurtă durată (10 minute) care leagă întoarcerea de userul corect
   și împiedică atacuri de tip CSRF.
2. Userul aprobă în Google; Google ne trimite înapoi un `code`.
3. `connectGoogleMailAccount` schimbă `code`-ul pe tokeni (access + refresh) și salvează
   contul.

**Criptarea tokenilor.** Tokenii Gmail sunt **criptați la repaus** cu AES-256-GCM
(`encryptMailToken`), folosind cheia `MAIL_TOKEN_ENCRYPTION_KEY`. Dacă cineva ar fura baza
de date, tokenii rămân ilizibili. *De ce contează la o aplicație de securitate:* nu putem
predica securitatea și apoi ține cheile de la Gmail-ul userului în clar.

**Reîmprospătarea automată.** Tokenul de acces expiră repede. Când Gmail răspunde `401`,
`refreshGoogleAccessToken` folosește refresh-token-ul ca să obțină unul nou și reîncearcă —
transparent pentru user.

### 5.2 Sincronizarea (`syncGmailEmailsForUser`)

1. Cere lista de mesaje din **INBOX** (limitat la `syncMaxResults`, setabil de user).
2. Pentru fiecare mesaj: aduce detaliile complete, le **parsează** (5.3), apoi face
   **upsert** în colecția `Email` (inserează dacă e nou, actualizează dacă există deja —
   datorită indexului unic din secțiunea 3).
3. La final cheamă **pipeline-ul de scanare** (`runSyncScanPipeline`) pentru emailurile
   noi/modificate. Emailurile pe care userul le-a marcat deja manual sunt **sărite** (nu-i
   suprascriem decizia).

Erorile per-mesaj sunt **prinse și numărate**, nu aruncate: un email stricat nu oprește
tot sync-ul.

### 5.3 Parsarea (`email-parser.service.js` + `link-analysis.service.js`)

Un email Gmail brut e complicat (anteturi, corp codat base64, părți multiple).
`parseGmailMessageToEmailPayload` extrage: expeditorul și domeniul lui, `Reply-To`,
titlul, corpul text/HTML, extensiile atașamentelor și — prin `analyzeEmailLinks` —
linkurile și **tiparele suspecte**:
- `shortened_url` (bit.ly, t.co...), `ip_address_link` (host = adresă IP),
  `embedded_credentials` (`user:pass@`), `very_long_url` (>200 caractere),
  `punycode_domain` (`xn--`).

Aceste tipare devin câmpuri pe documentul `Email` și sunt exact ce „citesc" regulile din
secțiunea 4. *De ce separăm parsarea de scanare?* Ca să fie **testabilă** și ca scanarea
să nu refacă munca de fiecare dată.

### 5.4 Starea finală a emailului (`email-state.service.js`)

Scanul dă un verdict tehnic, dar UI-ul are nevoie de o „stare" pe care s-o arate. 
`deriveEmailReviewState` combină **verdictul scanului** cu **verdictul manual al userului**
și produce:
- `effectiveVerdict` — verdictul „care contează" (decizia userului **învinge** scanul);
- `riskBucket` — găleata pentru UI: `safe`, `needs_review`, `quarantine`, `reviewed_safe`,
  `confirmed_phishing`, `unscanned`;
- `reviewStatus` — dacă mai are nevoie de atenția userului.

Așa, dacă userul a apăsat „Mark safe" pe un email suspect, peste tot apare „sigur" — o
**singură sursă de adevăr** pentru verdict.

---

## 6. Sarcini programate și notificări (scheduler)

**Cron job** = o sarcină care rulează automat după un orar (ca un ceas deșteptător
repetat). Folosim biblioteca `node-cron`. Pornirea e în `scheduler.service.js`:

- **Auto-sync** la fiecare `SYNC_INTERVAL_MINUTES` minute (implicit 15): cheamă
  `runAutoSyncForAllUsers` (`auto-sync.service.js`), care sincronizează toate conturile
  Gmail active. *De ce:* feedback-ul coordonatorului — userul „conectează o dată și uită";
  protecția merge fără să deschidă aplicația.
- **Alertă instant de phishing** (opt-in): după un sync, dacă a apărut un email
  `likely_phishing`, trimite un email de avertizare (doar dacă userul a activat alertele).
- **Digest zilnic** (opt-out): un cron care rulează **din oră în oră** și trimite rezumatul
  userilor a căror **oră de digest** (în fusul lor) coincide cu ora curentă, dacă au avut
  activitate în ultimele 24h.

*De ce `node-cron` și nu Gmail Push Notifications?* Pentru un proiect de licență care nu se
deployează public, polling-ul periodic e mai simplu de explicat și de demonstrat;
notificările push ar cere verificare Google și infrastructură publică. (Decizie acceptată,
vezi `docs/DECISIONS.md`.)

---

## 7. Configurare și mediu (env)

**Variabilă de mediu (env var)** = o setare dată din afara codului (într-un fișier sau în
sistem), ca să nu scriem secrete direct în cod și să putem schimba comportamentul între
„dezvoltare" și „producție". Toate se citesc într-un singur loc: `backend/src/config/env.js`.

- Fișierul încărcat e ales după `NODE_ENV`: `.env.development.local` (dev) sau
  `.env.production.local` (prod).
- La pornire, codul **verifică** că variabilele obligatorii există (`PORT`, `DB_URI`,
  `JWT_SECRET`, `JWT_EXPIRES_IN`, `MAIL_TOKEN_ENCRYPTION_KEY`) — altfel aplicația refuză
  să pornească. *De ce:* mai bine o eroare clară la start decât un bug obscur mai târziu.
- Variabile AI: `AI_SEMANTIC_ENABLED`, `OLLAMA_BASE_URL`, `OLLAMA_MODEL`,
  `OLLAMA_TIMEOUT_MS`, `OLLAMA_PROMPT_VERSION`. Sincronizarea: `SYNC_INTERVAL_MINUTES`.

---

## 8. Suprafața de API (ce expune backend-ul)

Toate rutele sunt montate în `backend/src/app.js`, sub prefixul `/api/v1`. Înainte de rute,
aplicația folosește `helmet` (anteturi de securitate) și `cors` (permite frontend-ul de pe
`http://localhost:5173` să apeleze API-ul).

| Prefix | Fișier rute | Ce face |
|--------|-------------|---------|
| `/auth` | `auth.routes.js` | register / login → emit JWT. Protejat cu arcjet (bot/rate-limit) dacă `ARCJET_KEY` există. |
| `/users` | `user.routes.js` | `GET /users/me` (userul curent), setări, `DELETE /users/me` (ștergere cont în cascadă). |
| `/mail-accounts` | `mail-account.routes.js` | conectare Gmail (`/google/start` → callback), `POST /:id/sync`. |
| `/emails` | `email.routes.js` | listă, detaliu, statistici, trend, top expeditori riscanți. |
| `/scans` | `scan.routes.js` | rezultatul scanării / rescanare. |
| `/actions` | `action.routes.js` | `mark-safe`, `mark-phishing` (mută și în Spam pe Gmail). |
| `/sender-lists` | `sender-list.routes.js` | listele de încredere/blocate ale userului. |
| `/reports` | `report.routes.js` | rezumat pe interval + trimitere pe email. |
| `/meta` | `meta.routes.js` | metadate pentru UI (ex: praguri, etichete). |
| `/contact` | `contact.routes.js` | formular de contact/suport. |

Contractele complete (parametri, răspunsuri) sunt în `docs/API_PLAN.md`.

---

## 9. Rezumat pentru susținere (firul roșu)

1. **Problema:** phishing-ul pe Gmail e greu de văzut; vrem un strat de securitate care
   scanează și explică, fără să fie un client de email.
2. **Soluția:** un backend Node/Express care sincronizează Gmail prin OAuth, parsează
   emailurile o dată, le scorează cu un **motor hibrid transparent** (reguli primare + AI
   plafonat) și expune totul printr-un API REST protejat cu JWT.
3. **De ce așa:** un singur limbaj pe tot stackul; o bază de date document care se
   potrivește emailurilor; reguli deterministe explicabile + AI local (datele nu pleacă în
   cloud) ca al doilea opinionat care **nu poate** decide singur verdictul; criptarea
   tokenilor și verificarea token-ului la fiecare cerere fiindcă e o aplicație de securitate.
4. **Straturile** (`route → middleware → controller → service → model`) țin codul ordonat,
   testabil și ușor de explicat — fiecare strat are o singură responsabilitate.

> Documente conexe: `docs/EXPLICATIE_FRONTEND.md` (interfața), `docs/EXPLICATIE_FLUX.md`
> (fluxurile cap-coadă), `docs/PHISHING_RULES.md` (regulile în detaliu),
> `docs/SCORING_WEIGHTS_REVIEW.md` (rațiunea greutăților), `docs/ARCHITECTURE.md`,
> `docs/DECISIONS.md`.
