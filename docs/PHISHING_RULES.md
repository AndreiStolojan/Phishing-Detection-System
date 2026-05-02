# PHISHING_RULES

## Scop

Acest document este referința pentru motorul de detecție phishing din MVP. Prima versiune trebuie să fie clară, explicabilă și bazată pe reguli, nu pe un model antrenat.

## Principiu general

Fiecare email primește un scor de risc. Scorul este calculat din reguli simple. Fiecare regulă:

- verifică un semnal;
- poate adăuga sau scădea puncte;
- lasă un motiv clar;
- poate fi explicată ușor utilizatorului.

## Regulă importantă

Nu folosim reguli doar pentru că sună bine. Folosim reguli care:

- pot fi implementate realist;
- pot fi explicate clar;
- aduc valoare pentru MVP;
- reduc riscul fără să complice inutil sistemul.

## Propunere de scor

- scor mic = risc mic
- scor mare = risc mare
- punctajul pornește de la `0`
- regulile suspecte adaugă puncte
- regulile care cresc încrederea pot scădea puncte

## Verdict final implementat

În cod, pragurile curente sunt definite în `services/scan.service.js`, în funcția care mapează scorul la verdict. Documentul trebuie să urmeze codul, nu invers.

| Scor final | Verdict |
| --- | --- |
| `0 - 29` | `safe` |
| `30 - 59` | `suspicious` |
| `60+` | `likely_phishing` |

Scorul final este hibrid:

- `ruleScore`: scorul rezultat din regulile clasice de phishing;
- `aiScore`: punctaj semantic venit din semnalele Ollama, plafonat la maximum `30`;
- `score`: suma `ruleScore + aiScore`, folosită pentru verdict.

Pragurile pot fi ajustate după testare pe mai multe emailuri, dar aceasta este starea reală a codului acum.

## Reguli recomandate pentru prima versiune

| Regulă | Descriere simplă | De ce este relevantă | Scor propus | Exemplu |
| --- | --- | --- | --- | --- |
| Limbaj urgent | Emailul insistă pe acțiune imediată | Phishing-ul folosește presiune psihologică | `+10` | `Contul tău va fi suspendat azi` |
| Cerere de credențiale | Cere parolă, cod sau verificare cont | Este unul dintre cele mai comune semnale | `+25` | `Confirmă parola pentru a evita blocarea` |
| Link scurtat | Conține link de tip bit.ly sau similar | Ascunde destinația reală | `+20` | `https://bit.ly/...` |
| Link cu IP | URL-ul folosește IP în loc de domeniu normal | Poate ascunde destinația reală | `+25` | `http://192.0.2.10/login` |
| Link cu credențiale în URL | URL-ul conține user/parolă în adresă | Este un pattern riscant și neobișnuit | `+20` | `https://user:pass@example.com` |
| Domeniu punycode | Domeniul folosește punycode | Poate indica imitare vizuală de domeniu | `+20` | `xn--...` |
| URL foarte lung | Linkul este neobișnuit de lung | Poate ascunde parametri sau redirecturi suspecte | `+10` | URL cu mulți parametri |
| Mismatch Reply-To | Domeniul din `Reply-To` diferă de domeniul expeditorului | Răspunsurile pot fi redirecționate către atacator | `+25` | `from: brand.com`, `reply-to: alt-domain.com` |
| Multe linkuri | Emailul conține multe linkuri | Uneori încearcă să împingă utilizatorul spre click | `+15` pentru `6-9`, `+25` pentru `10+` | email cu 8-10 linkuri |
| Atașament high-risk | Are atașamente potențial periculoase | Fișierele executabile pot ascunde malware | `+35` | `.exe`, `.scr`, `.js` |
| Atașament arhivă | Are atașamente arhivă | Arhivele pot ascunde fișiere periculoase | `+12` | `.zip`, `.rar`, `.7z` |

Notă: regulile clasice pentru limbaj urgent, cereri sensibile și impersonare de brand nu sunt implementate ca reguli text simple. În starea actuală, aceste semnale vin din stratul semantic Ollama și adaugă puncte în `aiScore`.

## Reguli explicate pe scurt

### Limbaj urgent

Se caută expresii care presează utilizatorul:

- `urgent`
- `imediat`
- `în 24 de ore`
- `cont suspendat`
- `acțiune necesară`

Această regulă singură nu trebuie să dea verdictul final. Ea este utilă mai ales împreună cu alte semnale.

### Cerere de credențiale

Dacă emailul cere:

- parolă;
- cod de verificare;
- confirmare identitate;
- date bancare;

atunci scorul trebuie să crească mult, pentru că acesta este un semnal foarte relevant.

### Linkuri scurtate

Se verifică dacă URL-ul vine din servicii cunoscute de scurtare. Scorul este mediu, nu maxim, pentru că uneori și emailurile legitime folosesc astfel de linkuri.

### Domenii suspecte

Exemple de semnale:

- multe cratime;
- domenii foarte lungi;
- subdomenii care încearcă să copieze un brand;
- extensii neobișnuite;
- litere asemănătoare vizual.

### Mismatch între nume și domeniu

Dacă numele afișat spune `Netflix`, dar domeniul real nu seamănă cu domeniul oficial, acesta este un semnal bun de suspiciune.

### Multe linkuri

Această regulă ajută, dar nu trebuie să cântărească prea mult. Un newsletter legitim poate avea multe linkuri.

### Atașamente suspecte

Atașamentele de tip executabil sau arhivă trebuie tratate cu atenție. Dacă există și alte semnale suspecte, riscul crește clar.

### Impersonare de brand

Se poate folosi o listă mică de branduri comune țintite des:

- bănci;
- servicii de curierat;
- platforme mari;
- instituții cunoscute.

## Reguli pentru false positives

False positive înseamnă că un email legitim este marcat ca suspect. Pentru a reduce astfel de cazuri:

- nicio regulă slabă nu trebuie să decidă singură verdictul;
- pentru MVP, allowlist/blocklist nu influențează scorul;
- combinația dintre reguli contează mai mult decât o regulă singulară mică;
- emailurile de tip newsletter nu trebuie penalizate prea tare doar pentru multe linkuri;
- limbajul urgent trebuie tratat cu grijă;
- linkurile scurtate trebuie interpretate împreună cu alte semnale.

## Format recomandat pentru motivele scanării

Fiecare regulă declanșată ar trebui să lase o structură clară:

```json
{
  "rule": "sender_domain_mismatch",
  "score": 20,
  "message": "Numele afișat al expeditorului nu se potrivește cu domeniul real."
}
```

## Format recomandat pentru rezultatul final

```json
{
  "score": 45,
  "ruleScore": 37,
  "aiScore": 8,
  "verdict": "suspicious",
  "reasons": [
    {
      "rule": "urgent_language",
      "score": 10,
      "message": "Emailul folosește limbaj urgent."
    },
    {
      "rule": "shortened_link",
      "score": 15,
      "message": "Emailul conține un link scurtat."
    }
  ]
}
```

## Reguli implementate acum

1. mismatch între domeniul `Reply-To` și domeniul expeditorului;
2. linkuri scurtate;
3. pattern-uri suspecte în linkuri: IP, credențiale în URL, URL foarte lung, punycode;
4. extensii de atașamente high-risk sau arhive;
5. număr mare de linkuri;
6. semnale AI semantice locale: urgență, cereri de date sensibile, cerere de login/acțiune, social engineering, impersonare brand.

Aceasta este lista care reflectă codul curent. Pentru teză, este important să fie separată clar detecția pe reguli clasice de semnalele semantice Ollama.

## Cum pot fi extinse regulile în viitor

După MVP, regulile pot fi extinse cu:

- reputație URL;
- vârsta domeniului;
- verificare SPF, DKIM, DMARC dacă integrarea devine realistă;
- pattern-uri mai bune pentru brand impersonation;
- istoric local per expeditor;
- combinații mai inteligente între reguli.

## Limitări asumate pentru MVP

- Nu toate emailurile periculoase vor fi detectate.
- Nu toate emailurile legitime vor fi marcate perfect.
- Scopul primei versiuni este un motor explicabil și demonstrabil, nu o acuratețe perfectă.
