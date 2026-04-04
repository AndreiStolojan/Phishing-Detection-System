# PROGRESS

## Scop

Acest fișier arată clar unde a rămas proiectul în acest moment. El trebuie citit înainte de lucru dacă vrem să știm rapid starea curentă fără să parcurgem tot `TODO.md`.

## Reguli de actualizare

- Se actualizează după fiecare pas important finalizat.
- Se schimbă `Faza curentă` când trecem la alt milestone.
- Se completează `Următorul pas imediat` după fiecare sesiune de lucru.
- Dacă apare un blocaj, se notează la `Blocaje`.

## Snapshot curent

- Data ultimei actualizări: `2026-04-04`
- Faza curentă: `Tranziție între Faza 3 - Auth și Faza 5 - Mail Accounts`
- Status general: `auth-ul MVP este închis mai coerent, cu strategie clară de token, erori uniforme și bootstrap pentru admin, iar backend-ul este pregătit pentru proiectarea modulului mailAccounts`
- Progres estimativ MVP: `30%`

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

## Ce NU este încă început

- sync emailuri;
- motorul de scanare;
- acțiunile pe email;
- integrarea Ollama.

## Unde am rămas exact

Ultimul lucru finalizat:

- conectarea de bază a unui cont Gmail prin OAuth și salvarea conexiunii în `mailAccounts`.

Următorul pas imediat recomandat:

- implementarea sync-ului inițial pentru contul Gmail deja conectat.

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
- proiectează modelul și rutele pentru `mailAccounts`;
- nu investi încă timp în frontend real, UI-ul actual este doar pentru test temporar.
