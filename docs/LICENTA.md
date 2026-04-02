# LICENTA

## Scopul acestui document

Acest fișier este sursa principală de context pentru proiect. Înainte de orice propunere de cod, modificare de arhitectură sau decizie tehnică, trebuie citite mai întâi:

1. `LICENTA.md`
2. `TODO.md`
3. `ARCHITECTURE.md`
4. `PROGRESS.md`

Dacă apare o idee nouă, regula de bază este simplă: se verifică mai întâi dacă este obligatorie pentru MVP sau doar un `nice-to-have`.

## Descrierea proiectului

Proiectul este o aplicație web pentru detectarea emailurilor de phishing. Utilizatorul își creează cont, conectează un cont de email, aplicația sincronizează emailurile, le analizează, calculează un scor de risc și afișează motive clare pentru care un email este considerat sigur sau suspect.

Accentul principal este pe un MVP realist, terminabil în aproximativ o lună și jumătate, nu pe un produs mare și greu de finalizat.

## Context academic și practic

- Proiectul este realizat ca lucrare de licență.
- Ritmul de dezvoltare trebuie să țină cont că proiectul este construit și pentru învățare, nu doar pentru livrare.
- Explicațiile, planurile și deciziile trebuie formulate simplu, practic și pas cu pas.
- Soluțiile prea complexe, care ar consuma mult timp fără valoare directă pentru MVP, trebuie evitate.

## Obiectivul general

Obiectivul proiectului este construirea unei aplicații backend-centric care:

- preia emailuri dintr-un cont conectat;
- extrage informații relevante din ele;
- detectează semnale de phishing pe bază de reguli;
- calculează un scor de risc;
- salvează rezultatele scanării;
- permite acțiuni simple asupra emailurilor;
- oferă ulterior explicații XAI locale prin Ollama.

## Obiectivele MVP-ului

MVP-ul trebuie să includă următoarele funcționalități obligatorii:

- utilizatorul își poate crea cont și se poate autentifica;
- utilizatorul își poate conecta un cont de email;
- aplicația poate sincroniza emailuri din provider;
- emailurile sunt salvate în MongoDB;
- aplicația poate analiza fiecare email;
- pentru fiecare email există un scor de risc;
- pentru fiecare email există motive clare, ușor de înțeles;
- există un verdict final: `safe`, `suspicious`, `likely_phishing`;
- există acțiuni simple: `mark safe`, `block sender local`, iar `move to spam/junk` este folosit doar unde este posibil;
- structura backend-ului este modulară și ușor de extins;
- explicațiile XAI cu Ollama se adaugă după ce fluxul principal funcționează stabil.

## Ce nu intră momentan în MVP

Următoarele nu sunt prioritare acum:

- antrenarea unui model AI propriu de la zero;
- billing real;
- integrare completă cu plăți;
- suport pentru mai mulți provideri din prima versiune;
- arhitectură pe microservicii;
- automatizări prea complexe înainte de validarea MVP-ului;
- funcționalități de tip enterprise;
- dashboard-uri foarte elaborate;
- explainability bazată exclusiv pe LLM;
- clasificare bazată doar pe AI fără reguli clare.

## Stack tehnic stabilit

Stack-ul care trebuie presupus ca bază a proiectului este:

- `Node.js` pentru runtime-ul backend;
- `Express.js` pentru API;
- `MongoDB` pentru stocarea datelor;
- `Mongoose` pentru modele și interacțiunea cu MongoDB;
- `JWT` pentru autentificare;
- integrare cu provider de email, cu focus inițial pe `Gmail`;
- `Ollama` local pentru explainability, nu pentru motorul principal de detecție;
- frontend-ul există doar cât să poată demonstra fluxul principal, fără investiție mare de timp.

## Direcția recomandată a proiectului

Varianta principală recomandată este:

- backend monolit modular;
- Express cu separare clară pe module;
- MongoDB cu modele simple și suficient de explicite;
- Gmail ca prim provider;
- scanare phishing pe bază de reguli euristice;
- verificări externe doar unde aduc valoare clară și sunt ușor de integrat;
- Ollama introdus după ce avem scoring, verdict și motive salvate în backend.

Motivul pentru această direcție: este cea mai bună combinație între realism, claritate academică și șanse mari de finalizare la timp.

## Arhitectura backend explicată simplu

Backend-ul trebuie gândit ca un monolit modular. Asta înseamnă că aplicația rămâne într-un singur proiect Node.js, dar codul este împărțit clar pe zone de responsabilitate.

Fiecare modul trebuie să aibă un rol ușor de înțeles:

- `auth`: login, register, token-uri, protejarea rutelor;
- `users`: profil utilizator și setări de bază;
- `mailAccounts`: conectarea și administrarea conturilor de email;
- `emails`: salvarea, listarea și afișarea emailurilor sincronizate;
- `scans`: logica de analiză, scor, motive și verdict;
- `lists`: allowlist și blocklist locale;
- `actions`: acțiuni aplicate pe emailuri;
- `jobs`: sincronizări și scanări automate rulate în fundal.

Modelul mental simplu al arhitecturii este:

`request -> route -> controller -> service -> model/database -> response`

## Modulele principale

| Modul | Rol |
| --- | --- |
| `auth` | Înregistrare, autentificare, JWT, protecția rutelor |
| `users` | Datele utilizatorului și setările sale |
| `mailAccounts` | Conturile de email conectate și starea integrării |
| `emails` | Emailurile sincronizate și datele extrase |
| `scans` | Scorul de risc, motivele, verdictul și istoricul analizelor |
| `lists` | Allowlist și blocklist locale per utilizator |
| `actions` | Marcarea manuală a emailurilor și acțiuni simple |
| `jobs` | Sync periodic și scanări automate |

## Modelele de date principale

Colecțiile principale trebuie să rămână simple:

| Colecție | Ce stochează |
| --- | --- |
| `users` | contul utilizatorului, email, parolă hash-uită, rol simplu, setări |
| `mailAccounts` | contul de email conectat, provider, token-uri sau identificatori, stare sync |
| `emails` | emailul brut și datele extrase utile pentru analiză |
| `scans` | rezultatul analizelor, scor, verdict, motive, reguli declanșate |
| `lists` | adrese și domenii din allowlist sau blocklist |

Posibile câmpuri importante:

- `users`: `email`, `passwordHash`, `name`, `createdAt`
- `mailAccounts`: `userId`, `provider`, `accountEmail`, `status`, `lastSyncedAt`
- `emails`: `userId`, `mailAccountId`, `providerMessageId`, `subject`, `from`, `to`, `headers`, `textBody`, `htmlBody`, `links`, `attachments`, `receivedAt`
- `scans`: `emailId`, `userId`, `score`, `verdict`, `reasons`, `triggeredRules`, `scannedAt`
- `lists`: `userId`, `type`, `value`, `scope`, `note`

## Fluxul aplicației

Fluxul principal care trebuie păstrat în minte:

1. utilizatorul se înregistrează;
2. utilizatorul se autentifică;
3. utilizatorul conectează un cont de email;
4. aplicația sincronizează emailuri din provider;
5. emailurile sunt salvate în MongoDB;
6. se extrag date relevante din email;
7. motorul de reguli calculează scorul de risc;
8. rezultatul scanării este salvat;
9. aplicația afișează verdictul și motivele;
10. utilizatorul poate face acțiuni pe email.

## Strategia de detecție phishing

Prima versiune trebuie să folosească detecție pe bază de reguli. Aceasta este direcția corectă pentru MVP deoarece:

- este mai ușor de explicat într-o lucrare de licență;
- este mai predictibilă;
- este mai ușor de testat;
- oferă motive clare pentru verdict;
- poate fi implementată mai repede decât un model ML serios.

Semnale recomandate pentru prima versiune:

- limbaj urgent;
- cereri de verificare cont, parolă sau date bancare;
- linkuri scurtate;
- domenii suspecte sau neobișnuite;
- nepotrivire între numele afișat și domeniul expeditorului;
- număr mare de linkuri;
- atașamente suspecte;
- semnale de impersonare a unui brand cunoscut;
- reputație URL sau vârsta domeniului, dacă integrarea este fezabilă.

## Rolul lui Ollama

`Ollama` nu trebuie folosit ca motor principal de detecție în prima fază.

Rolul lui este strict auxiliar:

- reformulează motivele tehnice într-un limbaj mai ușor pentru utilizator;
- explică pe scurt de ce un email a primit un anumit verdict;
- poate genera o descriere mai clară a riscului.

Regula importantă: verdictul principal trebuie să poată exista și fără Ollama.

## Principii de implementare

- Se construiește mai întâi fluxul complet cap-coadă, chiar dacă este simplu.
- Se preferă o soluție clară și terminabilă în locul uneia foarte sofisticate.
- Fiecare modul trebuie să aibă responsabilitate clară.
- Logica importantă trebuie mutată în `services`, nu lăsată în controller.
- Schemele MongoDB trebuie păstrate simple.
- Fiecare funcționalitate nouă trebuie evaluată prin raportare la MVP.
- Orice integrare externă trebuie introdusă doar dacă aduce valoare clară pentru MVP.
- Explicațiile și denumirile trebuie să rămână ușor de urmărit.

## Priorități de dezvoltare

Ordinea recomandată este:

1. baza backend-ului și configurarea proiectului;
2. conectarea la MongoDB;
3. autentificare cu JWT;
4. modele de bază și structură modulară;
5. integrare cu Gmail;
6. sincronizare și salvare emailuri;
7. extragerea datelor utile;
8. scoring phishing pe bază de reguli;
9. verdict și motive persistate;
10. acțiuni simple pe email;
11. explainability cu Ollama;
12. polish, testare și documentație finală.

## Riscuri și capcane de evitat

- începerea cu prea multe funcționalități în paralel;
- încercarea de a susține mai mulți provideri prea devreme;
- mutarea prea devreme la AI/LLM înainte de logica de bază;
- arhitectură prea sofisticată pentru dimensiunea proiectului;
- lipsa unui flux complet funcțional demonstrabil;
- modele de date prea complicate;
- amestecarea logicii de business în controller;
- lipsa persistării motivelor de scanare;
- lipsa unui plan clar pentru ce este obligatoriu și ce este opțional;
- pierderea timpului pe UI înainte ca backend-ul să funcționeze.

## Reguli pentru decizii tehnice

Când există mai multe opțiuni, decizia trebuie luată după aceste reguli:

1. se alege varianta care ajută MVP-ul să fie gata la timp;
2. se preferă varianta mai simplă dacă oferă suficientă valoare;
3. se evită orice soluție greu de explicat într-o prezentare de licență;
4. se preferă tehnologii deja stabilite în acest document;
5. se evită abstracțiile premature;
6. se introduce complexitate doar când există un motiv practic clar;
7. se păstrează codul ușor de urmărit pentru cineva care încă învață;
8. dacă o idee nu ajută direct MVP-ul, intră în categoria `nice-to-have`.

## Reguli de lucru pentru asistent

În toate etapele următoare:

- înainte de propuneri noi, se citesc `LICENTA.md`, `TODO.md`, `ARCHITECTURE.md` și `PROGRESS.md`;
- `LICENTA.md` este sursa principală de context;
- `TODO.md` trebuie actualizat când se termină taskuri sau când apar taskuri noi importante;
- `PROGRESS.md` trebuie actualizat când se schimbă faza curentă sau starea generală;
- nu se deviază de la MVP fără motiv clar;
- orice cod propus trebuie aliniat cu arhitectura din `ARCHITECTURE.md`;
- orice propunere de endpoint trebuie verificată cu `API_PLAN.md`;
- orice propunere de reguli de detecție trebuie verificată cu `PHISHING_RULES.md`;
- explicațiile trebuie adaptate la nivelul de învățare descris în `LEARNING_NOTES.md`.
