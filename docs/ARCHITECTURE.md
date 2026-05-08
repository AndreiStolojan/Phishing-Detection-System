# ARCHITECTURE

## Scop

Acest document descrie arhitectura tehnică recomandată pentru backend. Scopul lui este să țină proiectul organizat, ușor de extins și ușor de înțeles.

Regula principală: proiectul rămâne un monolit modular. Nu introducem microservicii în această etapă.

## Principiu general

Arhitectura trebuie să fie:

- simplă;
- modulară;
- ușor de urmărit;
- bună pentru MVP;
- suficient de clară pentru o lucrare de licență.

## Structura de foldere curentă

```text
src/
  app.js
  server.js
  config/
    env.js
    google-oauth.js
  database/
    mongodb.js
  common/
    errors/
    http/
  middlewares/
    auth.middleware.js
    error.middleware.js
    role.middleware.js
    validate.middleware.js
  models/
  controllers/
  services/
  routes/
  validations/

docs/
manual-tests/
scripts/
extras/
```

Aceasta este structura aleasă pentru MVP: codul care rulează aplicația stă în `src/`, iar documentația, testele manuale, scripturile și integrările opționale stau la rădăcina proiectului.

Motivul este pragmatic: separăm clar codul aplicației de restul repo-ului, dar nu facem încă un refactor mare în `src/modules/*`. Pentru etapa curentă este mai important să păstrăm backend-ul stabil pentru testare și frontend.

O reorganizare viitoare pe module, de tip `src/modules/auth`, `src/modules/emails`, poate fi făcută după stabilizarea MVP-ului și după ce contractele API sunt folosite de frontend.

## Responsabilitatea fiecărui folder

| Folder | Responsabilitate |
| --- | --- |
| `src/config` | configurări de mediu, conexiune DB, valori globale |
| `src/database` | conexiunea MongoDB |
| `src/common` | utilitare comune, erori, constante |
| `src/middlewares` | logică care se execută între request și controller |
| `src/models` | modelele Mongoose |
| `src/controllers` | controller-ele HTTP |
| `src/services` | logica principală de business |
| `src/routes` | definirea rutelor Express |
| `src/validations` | scheme de validare pentru input |
| `docs` | documentația proiectului |
| `manual-tests` | fișiere și resurse pentru testare manuală |
| `scripts` | scripturi utilitare rulate manual |
| `extras` | integrări opționale sau auxiliare |

## Modulele backend

### `auth`

Se ocupă de:

- `register`
- `login`
- generare JWT
- validarea sesiunii prin middleware

### `users`

Se ocupă de:

- modelul utilizatorului;
- profilul curent;
- setări simple ale utilizatorului.

### `mailAccounts`

Se ocupă de:

- conectarea conturilor de email;
- starea integrării;
- metadatele despre provider;
- sincronizarea inițială sau manuală.

### `emails`

Se ocupă de:

- salvarea emailurilor;
- listare și detalii;
- parsarea linkurilor și a altor date utile.

### `scans`

Se ocupă de:

- regulile de detecție;
- scoring;
- verdict;
- motivele scanării;
- istoricul analizelor.

### `actions`

Se ocupă de:

- `mark safe`;
- `mark phishing`;
- alte acțiuni simple asupra emailurilor.

### `jobs`

Se ocupă de:

- sync automat;
- scanare automată;
- procese lansate în fundal.

## Cum circulă un request prin sistem

Fluxul standard trebuie să fie:

1. request-ul ajunge la o rută;
2. ruta aplică middleware-urile necesare;
3. controller-ul primește request-ul;
4. controller-ul extrage datele importante și apelează service-ul;
5. service-ul execută logica de business;
6. service-ul folosește modelele pentru acces la MongoDB;
7. controller-ul trimite răspunsul;
8. dacă apare o eroare, middleware-ul de erori o transformă într-un răspuns clar.

Exemplu mental simplu:

`POST /api/auth/login -> auth.routes -> auth.controller -> auth.service -> user.model -> response`

## Rolul controller, service, model, middleware

### Controller

Controller-ul:

- primește request-ul;
- citește `req.params`, `req.query`, `req.body`, `req.user`;
- apelează service-ul potrivit;
- trimite răspunsul HTTP.

Controller-ul nu trebuie să conțină logică mare de business.

### Service

Service-ul:

- conține logica principală a aplicației;
- coordonează validările de business;
- lucrează cu modelele;
- compune rezultatele.

Regulă importantă: dacă logica are mai mult de câțiva pași, ea trebuie să stea în service.

### Model

Modelul:

- definește schema MongoDB prin Mongoose;
- oferă acces la date;
- aplică validări la nivel de schemă;
- ascunde detaliile bazei de date.

### Middleware

Middleware-ul:

- rulează înainte de controller;
- poate valida autentificarea;
- poate valida input-ul;
- poate trata erorile;
- poate adăuga date în request.

## Convenții de naming

- Folderele modulelor folosesc nume clare: `auth`, `users`, `emails`.
- Fișierele trebuie să indice rolul lor: `auth.service.js`, `email.model.js`.
- Pentru nume compuse se preferă `kebab-case` în fișiere precum `mail-account.model.js`.
- Variabilele și funcțiile folosesc `camelCase`.
- Clasele sau constructorii folosesc `PascalCase` dacă vor exista.
- Numele endpoint-urilor trebuie să fie previzibile și consecvente.

## Reguli de organizare a codului

- Fiecare modul trebuie să fie relativ independent.
- Nu se importă haotic între module.
- Dacă două module au nevoie de aceeași logică generică, ea merge în `common`.
- Validările de input trebuie separate de logica de business.
- Controller-ul trebuie să rămână subțire.
- Service-ul trebuie să fie locul principal pentru logică.
- Modelele trebuie să rămână simple.
- Nu se creează fișiere inutile doar de dragul arhitecturii.

## Cum evităm haosul în proiect

- Se păstrează o singură convenție de structură.
- Se evită funcții foarte lungi.
- Se evită controller-e foarte mari.
- Se evită logica duplicată.
- Se actualizează `TODO.md` și `PROGRESS.md` după pași importanți.
- Se verifică fiecare idee nouă în raport cu MVP-ul.
- Se preferă claritatea în locul unei arhitecturi prea sofisticate.

## Recomandări practice pentru acest proiect

- Începe cu o structură minimă, dar deja modulară.
- Nu crea de la început toate abstracțiile posibile.
- Adaugă doar ce este necesar pentru faza următoare.
- Păstrează Gmail ca provider principal la început.
- Păstrează motorul de reguli independent de Ollama.
- Fă posibilă testarea manuală a fiecărui flux.
- Pentru MVP, păstrează organizarea pe layere în `src/` și evită mutarea agresivă în `src/modules/*` până când flow-ul cap-coadă și frontend-ul sunt stabile.
