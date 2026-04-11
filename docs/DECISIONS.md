# DECISIONS

## Scop

Acest document păstrează deciziile tehnice importante. El este util ca să nu re-discutăm aceeași alegere de fiecare dată.

Format recomandat pentru deciziile viitoare:

- dată
- decizie
- motiv
- impact

## Decizii inițiale

### 2026-04-02 - Proiectul rămâne un monolit modular

Motiv:

- este suficient pentru MVP;
- este mai ușor de implementat;
- este mai ușor de explicat;
- evită complexitatea inutilă a microserviciilor.

Impact:

- toate modulele stau în același backend;
- separarea se face prin structură și responsabilități, nu prin procese separate.

### 2026-04-02 - Primul provider vizat este Gmail

Motiv:

- reduce complexitatea;
- permite focus pe un flux complet;
- este mai realist pentru termenul disponibil.

Impact:

- modelele și serviciile trebuie să permită extindere ulterioară, dar implementarea inițială rămâne centrată pe Gmail.

### 2026-04-02 - Motorul principal de detecție este bazat pe reguli

Motiv:

- este mai ușor de construit;
- este mai ușor de explicat în licență;
- produce motive clare pentru verdict;
- nu depinde de antrenarea unui model complex.

Impact:

- verdictul poate funcționa fără Ollama;
- regulile și scoring-ul devin componenta centrală a scanării.

### 2026-04-02 - Ollama este folosit doar pentru explainability

Motiv:

- reduce riscul de a muta logica critică într-un LLM;
- păstrează sistemul mai stabil și mai explicabil;
- separă clar detecția de prezentarea explicației.

Impact:

- explicațiile LLM sunt opționale;
- dacă Ollama nu merge, sistemul de scanare trebuie să funcționeze în continuare.

### 2026-04-02 - Frontend-ul nu este prioritatea principală în această fază

Motiv:

- valoarea principală a proiectului este în backend și logica de detecție;
- timpul este limitat;
- MVP-ul are nevoie în primul rând de funcționalitate demonstrabilă.

Impact:

- investiția principală merge în API, modele, sync și scanare;
- UI-ul rămâne simplu până când fluxul principal este stabil.

### 2026-04-04 - Auth-ul MVP folosește Bearer token în header-ul Authorization

Motiv:

- este varianta cea mai simplă de înțeles și de implementat pentru faza actuală;
- se pot testa ușor endpoint-urile din Postman, fișiere `.http` sau UI-ul de test;
- evită complexitatea suplimentară a cookie-urilor și a invalidării de sesiune pe server în MVP.

Impact:

- clientul salvează tokenul și îl trimite ca `Authorization: Bearer <token>`;
- `logout` este tratat în client prin ștergerea tokenului local;
- dacă mai târziu vrem sesiuni invalidate pe server, va trebui introdusă o strategie nouă, de exemplu cookies sau token blacklist.

### 2026-04-04 - Endpoint-ul pentru utilizatorul curent rămâne `GET /api/v1/users/me`

Motiv:

- utilizatorul curent este o resursă din modulul `users`, nu o acțiune de auth;
- evităm dublarea semanticii între `/auth/me` și `/users/me`.

Impact:

- documentația și testele trebuie să folosească doar `/api/v1/users/me`.

### 2026-04-04 - Primul admin este creat prin bootstrap manual din variabile de mediu

Motiv:

- este ușor de controlat și de explicat într-un proiect de licență;
- evită logica inutilă de creare automată a adminului la fiecare pornire;
- păstrează clară separarea dintre utilizatori normali și contul administrativ.

Impact:

- există un script dedicat pentru bootstrap admin;
- credențialele adminului nu trebuie hardcodate în cod.

### 2026-04-04 - Funcționalitățile Arcjet și welcome email sunt mutate în `extras/`

Motiv:

- nu fac parte din fluxul minim obligatoriu pentru MVP;
- păstrăm codul pentru mai târziu, fără să încarce fluxul principal de auth.

Impact:

- backend-ul pornește fără să depindă de Arcjet sau Nodemailer pentru auth;
- integrarea lor poate fi reactivată ulterior din folderul `extras/`.

### 2026-04-04 - Fiecare chat nou trebuie să explice simplu și să evite codul până la cerere explicită

Motiv:

- proiectul este folosit și pentru învățare, nu doar pentru livrare;
- utilizatorul vrea să înțeleagă clar ce se întâmplă înainte de implementare;
- pașii mici și explicațiile simple cresc șansa ca proiectul să fie și terminat, și înțeles.

Impact:

- se explică simplu, ca pentru un începător;
- nu se scrie cod decât când utilizatorul cere clar asta;
- după fiecare pas important se actualizează documentația proiectului.

### 2026-04-09 - Sync-ul inițial Gmail salvează toate emailurile sincronizate, nu doar cele phishing

Motiv:

- aplicația are nevoie de istoric complet pentru listare și comparație;
- scorarea și verdictul se pot recalcula ulterior fără pierdere de date;
- păstrăm MVP-ul simplu prin separarea între datele emailului și rezultatul scanării.

Impact:

- a fost introdus modelul `Email` cu câmpuri minime pentru MVP;
- sync-ul manual (`POST /api/v1/mail-accounts/:id/sync`) aduce ultimele emailuri din inbox;
- duplicatele sunt prevenite prin cheia `userId + providerMessageId`;
- clasificarea phishing va fi salvată separat în colecția `scans` într-o fază următoare.

### 2026-04-10 - Sync-ul Gmail folosește `format=full`, cu parser separat pentru extracția feature-urilor

Motiv:

- pentru detecția phishing avem nevoie de corpul emailului, linkuri și atașamente, nu doar metadata;
- păstrăm serviciul de sync mai clar prin separarea între fetch Gmail, parsare email și analiză linkuri;
- pregătim terenul pentru scoring euristic fără a introduce încă dependențe externe.

Impact:

- apelul `users.messages.get` este făcut în `format=full`;
- au fost adăugate câmpuri derivate în `emails` (`replyTo`, `senderDomain`, `links`, `linkDomains`, `attachmentExtensions` etc.);
- logica de parsare este mutată în servicii dedicate, ușor de extins în faza de scanare.

### 2026-04-10 - Verdictul inițial este calculat de motorul de reguli, iar AI-ul este pregătit separat pentru semantică și explainability

Motiv:

- MVP-ul are nevoie de un verdict stabil, testabil și ușor de explicat academic;
- semnalele AI vor completa regulile, nu vor înlocui scorarea principală în prima iterație;
- pentru AI folosim inputul relevant complet al emailului (`subject + textBody` cu fallback), nu doar `snippet`.

Impact:

- a fost introdus modelul `Scan` cu `score`, `verdict`, `reasons` și `triggeredRules`;
- a fost implementată scanarea manuală prin endpoint-uri dedicate;
- structura `aiSignals` și helperul de input AI sunt pregătite pentru integrarea semantică în pasul următor.

### 2026-04-11 - Flow-ul principal devine `sync -> scan automat`, cu scanare curentă unică per email

Motiv:

- pentru MVP este mai util un singur flow practic, fără pas manual separat după fiecare sync;
- scanarea repetată inutilă pe aceleași emailuri consumă timp și aglomerează datele;
- vrem rezultat de scanare actualizat per email, nu istoric repetitiv fără valoare imediată.

Impact:

- `POST /api/v1/mail-accounts/:id/sync` declanșează automat scanarea în backend;
- emailurile noi sunt scanate automat;
- emailurile actualizate se rescanează doar dacă nu au scanare curentă pentru `engineVersion` activ;
- scanarea manuală face update pe scanarea existentă (model de tip upsert);
- răspunsul de sync include `scanSummary` pentru monitorizare rapidă a pipeline-ului.
