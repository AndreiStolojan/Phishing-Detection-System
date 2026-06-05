# LEARNING_NOTES

## Scop

Acest fișier conține explicații simple pentru termenii importanți din proiect. Este scris pentru a fi util în timpul implementării, nu ca definiție academică rigidă.

## Backend

Backend-ul este partea aplicației care rulează pe server și se ocupă de logică, baze de date, autentificare și răspunsuri pentru frontend.

În acest proiect, backend-ul:

- primește request-uri;
- citește și scrie în MongoDB;
- sincronizează emailuri;
- calculează scoruri de phishing;
- întoarce rezultate către interfață.

## API

API înseamnă interfața prin care frontend-ul sau alte aplicații comunică cu backend-ul.

Practic, API-ul este format din endpoint-uri precum:

- `POST /auth/login`
- `GET /emails`
- `POST /scans/emails/:id`

## JWT

JWT vine de la `JSON Web Token`.

Este un token pe care serverul îl generează după login. Clientul îl trimite apoi la request-uri următoare pentru a dovedi că utilizatorul este autentificat.

Pe scurt:

- userul se loghează;
- serverul dă un token;
- clientul trimite token-ul la rutele protejate;
- backend-ul verifică token-ul.

## Middleware

Middleware este o funcție care rulează între request și controller.

Exemple:

- verifică dacă userul este autentificat;
- validează input-ul;
- tratează erorile;
- loghează informații utile.

## OAuth

OAuth este un mecanism prin care un utilizator poate permite unei aplicații să acceseze un cont extern fără să dea direct parola acelui cont.

În acest proiect, OAuth este relevant pentru Gmail, unde aplicația poate cere permisiune pentru citirea emailurilor.

## IMAP

IMAP este un protocol folosit pentru citirea emailurilor de pe serverul de mail.

Pe scurt:

- aplicația se conectează la contul de email;
- poate citi foldere și mesaje;
- poate sincroniza emailuri.

Pentru proiect, IMAP este important dacă alegem o integrare de citire a emailurilor care nu se bazează exclusiv pe API-ul providerului.

## Mongoose

Mongoose este o bibliotecă pentru Node.js care ajută la lucrul cu MongoDB.

Ea oferă:

- scheme;
- modele;
- validări;
- metode pentru interogări.

Pe scurt, Mongoose face MongoDB mai ușor de folosit într-un proiect Node.js.

## Worker / Job

Un worker sau job este o sarcină care rulează în fundal, nu direct în request-ul utilizatorului.

Exemple în proiect:

- sync periodic de emailuri;
- scanarea automată a emailurilor noi.

Motivul este simplu: unele operații durează mai mult și nu este bine să blocăm request-ul principal.

## XAI

XAI vine de la `Explainable AI`.

În contextul acestui proiect, XAI înseamnă explicații clare despre de ce un email a fost considerat sigur sau suspect.

Important:

- în MVP, explicația principală vine din reguli;
- Ollama poate reformula motivele mai clar;
- verdictul nu trebuie să depindă complet de LLM.

## MVP

MVP înseamnă `Minimum Viable Product`.

Este cea mai mică versiune a proiectului care demonstrează clar ideea principală și funcționează cap-coadă.

În proiectul tău, MVP nu înseamnă produs complet, ci:

- auth;
- conectare email;
- sync;
- scanare;
- scor;
- verdict;
- acțiuni simple.

## Controller vs Service

### Controller

Controller-ul:

- primește request-ul;
- citește datele din request;
- apelează service-ul;
- trimite răspunsul.

### Service

Service-ul:

- conține logica principală;
- combină pașii necesari;
- lucrează cu modelele;
- decide ce se întâmplă în business logic.

Regula practică:

- controller-ul trebuie să fie subțire;
- service-ul trebuie să țină logica mai importantă.

## Model vs Document în MongoDB

### Model

Modelul este definiția structurii și a comportamentului unei colecții.

Exemplu:

- modelul `User` spune ce câmpuri are un utilizator și ce validări există.

### Document

Documentul este o înregistrare concretă din baza de date.

Exemplu:

- un utilizator anume cu email și nume este un document din colecția `users`.

Pe scurt:

- model = șablonul;
- document = exemplarul salvat.

## Request

Request-ul este cererea trimisă de client către server.

Exemplu:

- frontend-ul trimite `POST /auth/login` cu email și parolă.

## Response

Response-ul este răspunsul trimis de server către client.

Exemplu:

- backend-ul întoarce `token`, date user sau un mesaj de eroare.

## Validare

Validarea înseamnă verificarea datelor înainte să fie folosite.

Exemple:

- emailul are format corect;
- parola nu este goală;
- `mailAccountId` există.

## Hash parolă

Hash-ul este o formă transformată a parolei. Parola nu trebuie salvată în clar în baza de date.

Practic:

- userul trimite parola;
- backend-ul o transformă într-un hash;
- la login se compară hash-ul, nu parola brută.

## Scor de risc

Scorul de risc este un număr care arată cât de suspect este un email.

Cu cât scorul este mai mare, cu atât probabilitatea de phishing este mai mare.

## Verdict

Verdictul este eticheta finală dată emailului.

În MVP:

- `safe`
- `suspicious`
- `likely_phishing`

## Provider de email

Providerul de email este serviciul extern care găzduiește emailul.

Exemple:

- Gmail
- Outlook

În prima fază, Gmail este providerul principal recomandat.
