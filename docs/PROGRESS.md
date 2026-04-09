# PROGRESS

## Scop

Acest fișier arată clar unde a rămas proiectul în acest moment. El trebuie citit înainte de lucru dacă vrem să știm rapid starea curentă fără să parcurgem tot `TODO.md`.

## Reguli de actualizare

- Se actualizează după fiecare pas important finalizat.
- Se schimbă `Faza curentă` când trecem la alt milestone.
- Se completează `Următorul pas imediat` după fiecare sesiune de lucru.
- Dacă apare un blocaj, se notează la `Blocaje`.

## Snapshot curent

- Data ultimei actualizări: `2026-04-09`
- Faza curentă: `Faza 6 - Sync emailuri inițial implementat`
- Status general: `auth-ul MVP este stabil, conectarea Gmail funcționează, iar sync-ul manual salvează primele emailuri din inbox în MongoDB fără duplicate`
- Progres estimativ MVP: `45%`

## Ce este gata

- documentul principal de context;
- planul de implementare;
- arhitectura backend recomandată;
- planul API;
- documentul regulilor de phishing;
- notele de învățare;
- registrul de decizii;
- roadmap-ul proiectului;
- server Express inițial;
- separare `app.js` de `server.js`;
- încărcare config din `dotenv`;
- conexiune MongoDB de bază;
- model `User` cu `passwordHash` și `role`;
- endpoint-uri funcționale pentru `register`, `login`, `logout`;
- middleware de auth și de erori;
- middleware minim pentru roluri;
- middleware de validare Joi pentru `register/login`;
- logică mutată din `controllers` în `services` pentru `auth` și `users`;
- endpoint `GET /api/v1/users/me`;
- endpoint `GET /api/v1/health`;
- restricționare endpoint-uri users pentru admin;
- UI temporar de test pentru auth;
- test manual reușit pentru `register`, `login`, `users/me` și persistență la refresh.
- strategie clară pentru auth MVP: `Bearer token` în header-ul `Authorization`;
- răspunsuri de eroare mai uniforme în middleware-uri și auth;
- script de bootstrap pentru primul admin;
- mutarea integrărilor opționale `Arcjet` și welcome email în `extras/`.
- model `MailAccount` pentru Gmail;
- endpoint `GET /api/v1/mail-accounts/google/start`;
- endpoint `GET /api/v1/mail-accounts/google/callback`;
- endpoint `GET /api/v1/mail-accounts`;
- endpoint `DELETE /api/v1/mail-accounts/:id`;
- salvarea conexiunii Gmail în MongoDB după callback-ul Google.
- test manual reușit pentru conectarea unui cont Gmail din lista de test users Google.
- model `Email` pentru emailurile sincronizate;
- endpoint `POST /api/v1/mail-accounts/:id/sync`;
- sync Gmail manual pentru ultimele emailuri din inbox;
- prevenire duplicate prin index `userId + providerMessageId`;
- actualizare `lastSyncedAt` după fiecare sync;
- refresh automat pentru `accessToken` la răspuns `401` de la Gmail API.
- test manual reușit pentru fluxul API complet: `register -> login -> connect Gmail -> sync manual`.

## Ce NU este încă început

- motorul de scanare;
- acțiunile pe email;
- integrarea Ollama.
- parsarea avansată pentru corpul emailului, linkuri și atașamente.

## Unde am rămas exact

Ultimul lucru finalizat:

- implementarea și testarea sync-ului manual Gmail și salvarea emailurilor în colecția `emails`.

Următorul pas imediat recomandat:

- implementarea fazei de extracție date relevante (`from`, `subject`, `receivedAt`, linkuri) și pregătirea pentru scorare.

## Blocaje

Nu există blocaje tehnice majore, dar există încă un blocaj de organizare:

- documentația descrie un proiect abia neînceput;
- codul existent are deja părți implementate;
- înainte de funcționalități noi, trebuie continuată alinierea structurii, naming-ului și responsabilităților fișierelor;
- încă nu este făcută reorganizarea în `src/` și pe modulele finale.

## Notițe rapide pentru sesiunea următoare

- citește mai întâi `LICENTA.md`;
- verifică `TODO.md`;
- păstrează focusul pe MVP;
- păstrează naming-ul `register/login/logout`;
- păstrează sync-ul manual ca bază pentru validare;
- extinde modelul `Email` doar cu câmpurile necesare pentru scanare;
- separă clar ce vine din reguli clasice și ce va veni mai târziu din semnale AI;
- adaugă următorul strat: parsare linkuri și pregătire pentru motorul de reguli;
- nu investi încă timp în frontend real, UI-ul actual este doar pentru test temporar.
