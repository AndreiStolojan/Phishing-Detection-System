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

## Verdict final propus

| Scor final | Verdict |
| --- | --- |
| `0 - 19` | `safe` |
| `20 - 49` | `suspicious` |
| `50+` | `likely_phishing` |

Pragurile pot fi ajustate după testare, dar această împărțire este suficient de clară pentru MVP.

## Reguli recomandate pentru prima versiune

| Regulă | Descriere simplă | De ce este relevantă | Scor propus | Exemplu |
| --- | --- | --- | --- | --- |
| Limbaj urgent | Emailul insistă pe acțiune imediată | Phishing-ul folosește presiune psihologică | `+10` | `Contul tău va fi suspendat azi` |
| Cerere de credențiale | Cere parolă, cod sau verificare cont | Este unul dintre cele mai comune semnale | `+25` | `Confirmă parola pentru a evita blocarea` |
| Link scurtat | Conține link de tip bit.ly sau similar | Ascunde destinația reală | `+15` | `https://bit.ly/...` |
| Domeniu suspect | Domeniul pare ciudat, foarte lung sau imită un brand | Phishing-ul folosește domenii apropiate vizual | `+20` | `paypaI-security-check.com` |
| Mismatch nume-expeditor | Numele afișat spune un brand, dar domeniul nu corespunde | Indică posibilă impersonare | `+20` | `PayPal Support <random@other-domain.com>` |
| Multe linkuri | Emailul conține prea multe linkuri | Uneori încearcă să împingă utilizatorul spre click | `+10` | email cu 8-10 linkuri |
| Atașament suspect | Are atașamente potențial periculoase | Fișierele executabile sau arhivele pot ascunde malware | `+20` | `.exe`, `.scr`, `.zip` |
| Brand impersonation | Textul sugerează că vine de la bancă, curier sau platformă cunoscută | Este un tip foarte frecvent de atac | `+15` | `Banca Transilvania`, `PayPal`, `ANAF` |
| Link text vs URL mismatch | Textul linkului pare legitim, dar URL-ul real diferă | Înșală utilizatorul vizual | `+15` | text `google.com`, URL real diferit |
| Expeditor în blocklist | Adresa sau domeniul există deja în blocklist local | Există un semnal local puternic | `+30` | domeniu deja blocat |
| Expeditor în allowlist | Adresa sau domeniul există în allowlist local | Ajută la reducerea false positive | `-20` | expeditor de încredere cunoscut |

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
- allowlist-ul trebuie să poată reduce scorul;
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

## Ordine recomandată de implementare a regulilor

1. limbaj urgent
2. cerere de credențiale
3. linkuri scurtate
4. domeniu suspect
5. mismatch nume-expeditor
6. multe linkuri
7. atașamente suspecte
8. blocklist și allowlist

Aceasta este ordinea bună pentru MVP deoarece primele reguli sunt mai simple și oferă valoare rapidă.

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
