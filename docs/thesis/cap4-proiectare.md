# 4. PROIECTAREA APLICAȚIEI

Acest capitol descrie modul în care a fost gândită aplicația SecureInbox înainte de a fi scrisă o linie de cod de producție. Pornesc de la cerințe, trec prin arhitectura de ansamblu și modelul de date, apoi explic cum am proiectat motorul de scor care decide dacă un email este sigur sau periculos. Scopul nu este să prezint codul, ci deciziile din spatele lui: ce trebuia să facă sistemul, cum am împărțit responsabilitățile și de ce am ales o anumită variantă în locul alteia.


## 4.1 Analiza cerințelor sistemului

Înainte de proiectarea efectivă, am stabilit ce trebuie să facă aplicația și ce calități trebuie să respecte. Cerințele unui sistem software se împart în două categorii. Cerințele funcționale descriu comportamentul concret: ce acțiuni poate face utilizatorul și ce răspunde aplicația. Cerințele non-funcționale descriu calitățile sistemului — securitate, confidențialitate, performanță — adică nu *ce* face, ci *cât de bine* face.

Le tratez pe rând, pentru că ele au condus împreună fiecare decizie de arhitectură din restul capitolului.


### 4.1.1 Cerințe funcționale

SecureInbox are un singur tip de utilizator: o persoană care vrea să își vadă emailurile dintr-un cont Gmail filtrate după risc. Nu există rol de administrator cu o interfață separată, pentru că aplicația este personală — fiecare cont vede doar propriile date. Din această perspectivă, aplicația trebuie să permită următoarele.

**Cont și acces.** Utilizatorul își creează un cont cu email și parolă și se autentifică. Sesiunea este menținută printr-un token JWT trimis la fiecare cerere. Utilizatorul își poate șterge complet contul, iar la ștergere dispar toate datele asociate — emailuri, scanări, conturi de mail conectate și liste — nu doar rândul din tabela de utilizatori.

**Conectarea contului de email.** Utilizatorul conectează un cont Gmail prin OAuth2, adică autorizează aplicația direct la Google, fără să își introducă parola de Gmail în SecureInbox. După conectare, aplicația reține o referință securizată către cont și starea sincronizării.

**Sincronizarea emailurilor.** Aplicația aduce emailurile din Gmail în două moduri: manual, la cererea utilizatorului, și automat, în fundal, la un interval fix (implicit 15 minute). Sincronizarea automată este cerința-cheie ridicată de coordonator: utilizatorul conectează contul o singură dată și nu mai trebuie să deschidă aplicația ca să fie protejat.

**Scanarea și verdictul.** Imediat după sincronizare, fiecare email nou este scanat automat. Pentru fiecare email, aplicația produce un scor de risc, un verdict din trei valori — `safe`, `suspicious` sau `likely_phishing` — și o listă de motive în limbaj clar, care explică de ce s-a ajuns la acel verdict. Verdictul trebuie să poată fi calculat și fără componenta AI, pe baza regulilor deterministe.

**Listarea și detaliul.** Utilizatorul vede emailurile într-o listă, fiecare cu starea lui de risc, și poate deschide un email pentru detalii. Conținutul HTML al emailului este afișat doar după curățare, iar imaginile externe sunt blocate, ca deschiderea unui email să nu confirme adresa către un atacator.

**Acțiuni asupra emailului.** Utilizatorul poate marca manual un email ca sigur (`mark-safe`) sau ca phishing (`mark-phishing`); a doua acțiune mută emailul și în folderul Spam din Gmail. Decizia manuală a utilizatorului are prioritate față de verdictul automat.

**Liste de încredere și de blocare.** Peste deciziile automate, utilizatorul poate defini reguli proprii: poate marca un expeditor sau un domeniu întreg ca fiind de încredere (allowlist) sau blocat (blocklist). Un expeditor blocat duce garantat la verdict de phishing; un expeditor de încredere reduce semnalele contextuale, dar nu și pe cele cu adevărat periculoase.

**Tablou de bord și rapoarte.** Aplicația oferă un dashboard cu postura generală de securitate, statistici, evoluția amenințărilor în timp și cele mai frecvente semnale de risc. Utilizatorul poate primi același raport pe email și poate filtra întreaga interfață după un interval de timp ales.

**Notificări.** Aplicația poate trimite o alertă instant pe email când detectează un mesaj `likely_phishing` (opțiune activată la cerere) și un rezumat zilnic la o oră aleasă de utilizator.

**Setări.** Utilizatorul își gestionează profilul, conexiunea Gmail, activarea componentei AI, notificările, ora rezumatului zilnic și listele de expeditori.

> `[ANDREI]` — adaugă aici o frază proprie: care dintre aceste cerințe a fost cea mai grea de respectat și de ce? (ex: sincronizarea automată fără să suprasoliciți API-ul Gmail). Comisia apreciază când autorul își asumă o dificultate concretă.


### 4.1.2 Cerințe non-funcționale

Aceste cerințe nu se văd direct în interfață, dar au cântărit cel mai mult în arhitectură.

**Securitate.** Token-urile de acces la Gmail sunt criptate înainte de a fi salvate, folosind AES-256-GCM, ca o eventuală expunere a bazei de date să nu însemne acces direct la conturile utilizatorilor. Autentificarea se face cu token JWT trimis în antetul `Authorization`. Rutele de autentificare sunt protejate suplimentar împotriva atacurilor automate prin limitarea numărului de cereri. Conținutul HTML al emailurilor este curățat înainte de afișare, iar imaginile externe sunt blocate.

**Confidențialitate.** Analiza semantică rulează pe un model AI local, prin Ollama, nu printr-un serviciu extern. Asta înseamnă că textul emailurilor — date sensibile prin natura lor — nu părăsește mașina pe care rulează aplicația. A fost o decizie deliberată: o aplicație care promite siguranță nu poate trimite corespondența privată a utilizatorului către un API terț.

**Explicabilitate (XAI).** Fiecare verdict trebuie să fie însoțit de motive ușor de înțeles, nu doar de un scor. Un sistem care spune doar „acest email este periculos", fără să explice de ce, nu construiește încredere și nu îl ajută pe utilizator să învețe să recunoască singur semnalele.

**Disponibilitate fără intervenția utilizatorului.** Protecția trebuie să funcționeze în fundal. Utilizatorul nu trebuie să deschidă aplicația sau să apese un buton pentru a fi scanat noul email primit.

**Mentenabilitate.** Codul este organizat ca un monolit modular, cu separare clară pe straturi (rute, controllere, servicii, modele). O lucrare de licență trebuie să poată fi explicată și apărată, deci claritatea structurii a fost mai importantă decât optimizările premature.

**Utilizabilitate.** Interfața este simplă, lizibilă și folosibilă atât pe desktop, cât și pe mobil, cu un contrast de culori care respectă criteriile de accesibilitate.

> `[ANDREI]` — opțional: spune în ce ordine de priorități ai pus aceste cerințe. (ex: confidențialitatea a bătut performanța — de aceea AI-ul e local și scanarea e mai lentă.) Asta arată că ai gândit compromisurile, nu doar le-ai bifat.


## 4.2 Arhitectura de ansamblu

Aplicația este împărțită în două programe care comunică printr-o interfață HTTP: un **backend** scris în Node.js cu Express, care conține toată logica, și un **frontend** scris în React, care afișează datele și preia acțiunile utilizatorului. Lângă ele stau trei componente externe backend-ului: baza de date MongoDB, modelul AI local rulat prin Ollama și API-ul Gmail al Google.

Am ales un singur backend, organizat ca **monolit modular**. „Monolit" înseamnă că tot codul de server trăiește într-un singur proiect; „modular" înseamnă că, în interior, este împărțit clar pe zone de responsabilitate. Nu am folosit microservicii — adică nu am spart aplicația în mai multe servere mici, independente. Pentru dimensiunea unui proiect de licență, microserviciile ar fi adus complexitate de rețea și de deployment fără niciun câștig real; un monolit bine organizat se explică mai ușor și se demonstrează mai ușor.

Backend-ul respectă o structură pe **straturi**, prin care trece fiecare cerere:

```
cerere → rută → middleware → controller → service → model → MongoDB
```

Fiecare strat are un rol unic. **Ruta** (route) spune la ce adresă răspunde aplicația. **Middleware-ul** (funcție-filtru care rulează înainte de controller) verifică token-ul de autentificare sau forma datelor primite. **Controller-ul** preia cererea și o predă mai departe, fără să conțină logică grea. **Service-ul** este locul unde stă logica reală — scanarea unui email, sincronizarea cu Gmail, calculul rapoartelor. **Modelul** (model Mongoose) descrie forma datelor și vorbește cu baza de date. Regula pe care am ținut-o constant: dacă o operație are mai mult de câțiva pași, ea aparține service-ului, nu controller-ului.

Această separare nu este decorativă. Ea înseamnă că pot schimba, de exemplu, modul în care calculez scorul unui email fără să ating ruta sau controller-ul, și pot înlocui Ollama cu alt furnizor de semnale AI fără să rescriu motorul de reguli.

> `[FIGURĂ 4.1]` — diagrama de arhitectură de ansamblu: Browser → Frontend (React) → Backend (Express, straturile rută/middleware/controller/service/model) → MongoDB, cu Ollama și Gmail API ca noduri laterale. (O generez separat dacă vrei — am sursa în `docs/EXPLICATIE_FLUX.md`.)

> `[ANDREI]` — adaugă o frază: ai ezitat la un moment dat între monolit și ceva mai împărțit? De ce a câștigat monolitul în cazul tău concret?


## 4.3 Modelul de date

Datele sunt păstrate în MongoDB, o bază de date orientată pe documente. Spre deosebire de o bază relațională clasică, unde datele stau în tabele cu rânduri și coloane fixe, MongoDB ține **documente** flexibile, asemănătoare unor obiecte. Am ales-o pentru că forma unui email variază mult de la un mesaj la altul — unele au atașamente, altele zeci de linkuri, altele aproape niciun conținut — iar un model de documente absoarbe natural această variație. Comunic cu baza prin Mongoose, o bibliotecă ce adaugă peste MongoDB **scheme** (descrieri ale formei pe care trebuie să o aibă fiecare document) și validări.

Aplicația folosește cinci colecții principale:

**`users`** — contul aplicației: email, parola stocată ca **hash** (niciodată în clar), nume și setări (activarea AI, preferințele de notificare, ora rezumatului zilnic).

**`mailAccounts`** — contul Gmail conectat: adresa, starea conexiunii, momentul ultimei sincronizări și **token-urile de acces criptate**. Aici stă legătura cu Google.

**`emails`** — un email sincronizat din Gmail, cu tot ce am extras din el. Pe lângă câmpurile evidente (expeditor, subiect, corp), documentul ține și **semnale precalculate**: domeniul expeditorului, numărul de linkuri, dacă există un link scurtat, tiparele suspecte găsite în linkuri și extensiile atașamentelor. Tot aici se salvează verdictul **manual** al utilizatorului (`mark-safe` / `mark-phishing`).

**`scans`** — rezultatul analizei unui email: scorul final, scorul din reguli, scorul din AI, verdictul, regulile declanșate (cu punctele fiecăreia) și explicația. Un detaliu important de proiectare: există un **index unic** pe perechea `(userId, emailId)`, ceea ce garantează un singur scan curent per email. La fiecare rescanare, scanul vechi este înlocuit, nu se acumulează un istoric de scoruri vechi.

**`senderLists`** — regulile personale ale utilizatorului: un expeditor sau un domeniu marcat ca „de încredere" sau „blocat". Un index unic pe `(userId, kind, value)` împiedică același criteriu să apară simultan pe ambele liste.

Două decizii de proiectare merită subliniate aici, pentru că revin în capitolul de implementare.

Prima: emailurile țin **semnale gata calculate**. Aș fi putut păstra doar mesajul brut și să extrag linkurile și atașamentele la fiecare scanare. Am preferat să fac extragerea **o singură dată**, la sincronizare, și să salvez rezultatul. Astfel, o rescanare nu mai reparsează emailul — citește semnalele deja pregătite. Costul este un pic de spațiu în plus; câștigul este viteză și cod de scanare mai simplu.

A doua: separarea dintre `emails` și `scans`. Aș fi putut pune scorul direct pe email. Le-am ținut separate pentru că un email este un fapt (a sosit, are acest conținut), iar un scan este o **interpretare** care se poate schimba când îmbunătățesc motorul. Versiunea motorului este chiar salvată pe scan (`engineVersion`, ex. `rules-ai-v7`), ca să știu ce scanări ar trebui refăcute după o modificare a regulilor.

> `[FIGURĂ 4.2]` — diagrama bazei de date: cele cinci colecții și legăturile dintre ele (`users` → `mailAccounts` → `emails` → `scans`; `users` → `senderLists`). O pot genera ca diagramă entitate-relație.


## 4.4 Cazuri de utilizare și fluxul cap-coadă

### Cazuri de utilizare

Sistemul are un singur actor — **utilizatorul** — și un set restrâns, dar complet, de cazuri de utilizare: își creează cont și se autentifică, conectează un cont Gmail, declanșează sau așteaptă sincronizarea, vizualizează lista de emailuri și detaliul unui email, marchează un email ca sigur sau ca phishing, gestionează listele de expeditori de încredere și blocați, consultă tabloul de bord și își ajustează setările.

> `[FIGURĂ 4.3]` — diagrama UML a cazurilor de utilizare: actorul „Utilizator" legat de cazurile de mai sus. O generez la cerere.

### Fluxul cap-coadă

Dincolo de cazurile individuale, valoarea aplicației stă în lanțul complet pe care îl parcurge un email, de la Google până la verdictul afișat. Pe scurt, fluxul are cinci verigi.

1. **Conectare.** Utilizatorul leagă contul Gmail prin OAuth2; aplicația primește token-uri de acces, pe care le criptează înainte de salvare.
2. **Sincronizare.** Manual sau automat, aplicația cere lista de mesaje din Inbox și, pentru fiecare, detaliile complete. Dacă token-ul a expirat, este reîmprospătat transparent și cererea se reia.
3. **Parsare.** Fiecare mesaj brut este transformat într-un document de email: se extrag expeditorul, domeniul, subiectul, corpul, atașamentele și linkurile, împreună cu tiparele suspecte din linkuri.
4. **Scanare.** Motorul calculează scorul și verdictul (detaliat în 4.5), folosind regulile deterministe, eventualele semnale AI și cele două straturi de context.
5. **Afișare și decizie.** Utilizatorul vede verdictul și motivele într-o formă sigură — HTML curățat, linkuri needeschise — și poate confirma sau infirma verdictul, decizia lui având prioritate.

> `[FIGURĂ 4.4]` — diagrama de flux (activity diagram) a drumului unui email: Gmail → sync → parsare → scanare → verdict → UI, cu ramura de decizie manuală a utilizatorului.

> `[ANDREI]` — la susținere, acesta este firul pe care trebuie să-l poți spune dintr-o suflare. Repetă-l cu cuvintele tale și notează aici varianta ta.


## 4.5 Proiectarea motorului de scor hibrid

Inima aplicației este motorul care transformă un email într-un verdict. L-am proiectat pe principiul „**hibrid și transparent**": deciziile vin din reguli clare, ușor de explicat, iar AI-ul joacă doar un rol secundar, plafonat.

### Modelul de scor

Fiecare email pornește de la scorul `0`. Scorul final se calculează după formula:

```
scorFinal = min(100, scorReguli + scorAI)
```

unde `scorReguli` este suma punctelor regulilor deterministe declanșate, iar `scorAI` este punctajul venit din semnalele modelului local, **plafonat la 50**. Scorul final este apoi tradus într-un verdict pe baza a două praguri:

| Scor final | Verdict |
| --- | --- |
| `0 – 29` | `safe` (sigur) |
| `30 – 59` | `suspicious` (suspect) |
| `60 – 100` | `likely_phishing` (probabil phishing) |

### Regulile deterministe

Regulile sunt fapte verificabile despre email, fiecare cu un punctaj fix, motivat. Un link către o adresă IP brută adaugă 25 de puncte, fiindcă serviciile reale nu trimit astfel de linkuri. Un atașament executabil (`.exe`, `.scr`) adaugă 35, cel mai mare punctaj, pentru că este abuz aproape sigur. La capătul opus, un URL foarte lung adaugă doar 8 puncte, fiindcă și emailurile legitime de marketing au linkuri lungi de urmărire. Toate aceste valori stau într-un singur fișier, `scoring.config.js`, ceea ce face verdictul **auditabil** — pot arăta exact de unde vine fiecare punct.

### Semnalele AI, plafonate

Când utilizatorul are componenta AI activată, emailul este trimis și modelului local (`gemma3:4b`, prin Ollama), care întoarce semnale semantice: limbaj urgent, cerere de date sensibile, suspiciune de impersonare a unui brand și altele. Aceste semnale devin puncte, dar suma lor nu poate depăși 50. Limitarea este deliberată.

### Cele trei invariante

Am construit motorul în jurul a trei reguli de aur, pe care orice ajustare de punctaje trebuie să le păstreze:

1. **Niciun semnal singur nu atinge pragul de phishing (60).** Verdictul grav cere mereu coroborare.
2. **Niciun semnal slab nu trece singur de pragul de suspiciune (30).** Un newsletter cu multe linkuri nu devine „suspect" doar din atât.
3. **AI singur nu poate declara phishing.** Pentru că plafonul AI (50) este sub pragul de 60, o eventuală „halucinație" a modelului nu poate, de una singură, condamna un email. Pragul grav se atinge doar când regulile deterministe sunt de acord.

A treia invariantă este, de fapt, esența abordării hibride: AI-ul poate ridica suspiciunea și poate confirma regulile, dar nu i se permite să aibă ultimul cuvânt.

### Cele două straturi de context

Peste reguli și AI am adăugat două straturi care pot doar **reduce** punctele (cu o singură excepție, blocarea), niciodată să le crească artificial.

Primul este **brandul verificat**. Dacă emailul vine chiar de pe domeniul oficial al unui brand cunoscut (verificat pe sufix de domeniu, ca `evil-paypal.com` să nu treacă drept PayPal), semnalele care sunt normale pentru mailul de brand — un buton „Sign in", multe linkuri, un ton ușor urgent — sunt reduse prin niște multiplicatori. Semnalele cu adevărat periculoase, în schimb, rămân la greutate plină: o cerere de parolă sau de cod rămâne gravă chiar și de la un expeditor „verificat", pentru că ar putea fi un cont compromis.

Al doilea strat sunt **listele utilizatorului**. Un expeditor de pe allowlist primește aceleași reduceri de context (dar tot cu semnalele periculoase intacte). Un expeditor de pe blocklist primește exact 60 de puncte — adică pragul de phishing — deci verdictul lui este garantat prin construcție. Diferența de tratament este intenționată: o euristică poate greși, dar decizia explicită a utilizatorului de a bloca pe cineva nu este o euristică, așa că i se permite să decidă singură verdictul.

> `[TABEL 4.1]` — tabelul complet al greutăților regulilor (din `scoring.config.js`), util ca anexă sau în acest subcapitol.

> `[ANDREI]` — întrebare aproape sigură la comisie: „de ce ai plafonat AI-ul la 50 și nu l-ai lăsat să decidă singur?" Răspunsul e invarianta #3. Scrie-l cu cuvintele tale, ca să-l ai pregătit.


## 4.6 Decizii de proiectare și alternative respinse

O parte din valoarea acestei lucrări stă nu în ce am construit, ci în ce am ales să **nu** construiesc. Le adun aici pe cele mai importante, fiecare cu alternativa pe care am respins-o și motivul.

**Reguli primare, AI secundar — nu un model antrenat de la zero.** Aș fi putut antrena un clasificator de machine learning pe un set de emailuri. Am ales detecția pe reguli ca fundament pentru că este explicabilă (pot spune exact de ce un email a fost marcat), predictibilă și ușor de testat — toate, calități pe care o lucrare de licență trebuie să le poată apăra. Un model antrenat ar fi cerut un set de date mare, curat și etichetat, și ar fi dat verdicte greu de justificat în fața unei comisii.

**Ollama local — nu un API extern.** Semnalele semantice ar fi fost mai bune cu un model mare, accesat printr-un API comercial. Am refuzat această variantă pentru un motiv de principiu: o aplicație care promite siguranță nu poate trimite corespondența privată a utilizatorului către un serviciu terț. Rulând modelul local, textul emailului nu părăsește mașina. Compromisul acceptat este un model mai mic și o scanare mai lentă.

**`node-cron` — nu Gmail Push Notifications.** Pentru sincronizarea automată, varianta „corectă" la scară mare ar fi notificările push de la Gmail, care anunță aplicația imediat ce sosește un email. Ele cer însă o adresă publică, verificare din partea Google și infrastructură de webhook-uri. Pentru un proiect care nu se deployează public, am ales `node-cron` — o verificare periodică, la 15 minute, simplă de explicat și de demonstrat. Codul a fost gândit ca push-ul să poată înlocui cron-ul ulterior, fără rescriere majoră.

**MongoDB — nu o bază relațională.** Am ales o bază orientată pe documente pentru că forma datelor (mai ales a emailurilor) este neregulată și pentru că nu am nevoie de relații complexe între multe tabele. Avantajul flexibilității a contat mai mult decât rigoarea unei scheme relaționale.

**Allowlist care nu anulează totul.** Prima variantă pe care am avut-o în minte a fost ca un expeditor „de încredere" să anuleze complet scorul. Am renunțat la ea: un cont de încredere poate fi compromis, iar dacă i-aș anula toate semnalele, un atac trimis de pe el ar trece neobservat. Acum allowlist-ul reduce doar semnalele contextuale, dar lasă intacte semnalele periculoase (cerere de date sensibile, atașamente executabile). Este un exemplu de decizie care pare mică, dar care schimbă comportamentul sistemului în cazul cel mai periculos.

> `[ANDREI]` — alege una sau două dintre aceste decizii și adaugă perspectiva ta: ce ai învățat luând-o, sau ce ai face diferit acum. Comisia ține minte autorii care își privesc critic propriile alegeri.
