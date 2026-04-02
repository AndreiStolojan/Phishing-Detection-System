# PROGRESS

## Scop

Acest fișier arată clar unde a rămas proiectul în acest moment. El trebuie citit înainte de lucru dacă vrem să știm rapid starea curentă fără să parcurgem tot `TODO.md`.

## Reguli de actualizare

- Se actualizează după fiecare pas important finalizat.
- Se schimbă `Faza curentă` când trecem la alt milestone.
- Se completează `Următorul pas imediat` după fiecare sesiune de lucru.
- Dacă apare un blocaj, se notează la `Blocaje`.

## Snapshot curent

- Data ultimei actualizări: `2026-04-02`
- Faza curentă: `Faza 1 - Setup backend`
- Status general: `backend-ul de bază și auth-ul minim sunt funcționale, iar fundația a fost curățată parțial pentru continuarea cu mail accounts`
- Progres estimativ MVP: `25%`

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
- logică mutată din `controllers` în `services` pentru `auth` și `users`;
- endpoint `GET /api/v1/users/me`;
- restricționare endpoint-uri users pentru admin;
- UI temporar de test pentru auth;
- test manual reușit pentru `register`, `login`, `users/me` și persistență la refresh.

## Ce NU este încă început

- conectarea contului de email;
- sync emailuri;
- motorul de scanare;
- acțiunile pe email;
- integrarea Ollama.

## Unde am rămas exact

Ultimul lucru finalizat:

- stabilizarea auth-ului minim și verificarea lui prin UI temporar de test.

Următorul pas imediat recomandat:

- închiderea completă a auth-ului minim prin validări de input și definirea strategiei pentru admin, apoi proiectarea modulului `mailAccounts`.

## Blocaje

Nu există blocaje tehnice majore, dar există încă un blocaj de organizare:

- documentația descrie un proiect abia neînceput;
- codul existent are deja părți implementate;
- înainte de funcționalități noi, trebuie continuată alinierea structurii, naming-ului și responsabilităților fișierelor;
- configurația Arcjet trebuie verificată și păstrată corectă pentru a nu bloca testarea.

## Notițe rapide pentru sesiunea următoare

- citește mai întâi `LICENTA.md`;
- verifică `TODO.md`;
- păstrează focusul pe MVP;
- păstrează naming-ul `register/login/logout`;
- continuă cu validările pentru auth;
- decide clar cum creezi primul admin;
- proiectează modelul și rutele pentru `mailAccounts`;
- nu investi încă timp în frontend real, UI-ul actual este doar pentru test temporar.
