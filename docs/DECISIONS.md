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
