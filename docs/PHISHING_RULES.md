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
- `aiScore`: punctaj semantic venit din semnalele Ollama, plafonat la maximum `50`;
- `score`: suma `ruleScore + aiScore`, plafonată la `100`, folosită pentru verdict.

Toate ponderile, plafonul AI și pragurile sunt definite într-un singur loc:
`backend/src/config/scoring.config.js`. Motorul (`scan.service.js`) le importă de
acolo. Vezi `docs/SCORING_WEIGHTS_REVIEW.md` pentru raționamentul rebalansării
(engine `rules-ai-v4` → `rules-ai-v5`).

Pragurile pot fi ajustate după testare pe mai multe emailuri, dar aceasta este starea reală a codului acum.

## Reguli recomandate pentru prima versiune

| Regulă | Descriere simplă | De ce este relevantă | Scor propus | Exemplu |
| --- | --- | --- | --- | --- |
| Link scurtat | Conține link de tip bit.ly sau similar | Ascunde destinația reală | `+15` | `https://bit.ly/...` |
| Link cu IP | URL-ul folosește IP în loc de domeniu normal | Poate ascunde destinația reală | `+25` | `http://192.0.2.10/login` |
| Link cu credențiale în URL | URL-ul conține user/parolă în adresă | Este un pattern riscant și neobișnuit | `+25` | `https://user:pass@example.com` |
| Domeniu punycode | Domeniul folosește punycode | Poate indica imitare vizuală de domeniu | `+20` | `xn--...` |
| URL foarte lung | Linkul este neobișnuit de lung | Poate ascunde parametri sau redirecturi suspecte | `+8` | URL cu mulți parametri |
| Mismatch Reply-To | Domeniul din `Reply-To` diferă de domeniul expeditorului | Răspunsurile pot fi redirecționate către atacator | `+18` | `from: brand.com`, `reply-to: alt-domain.com` |
| Multe linkuri | Emailul conține multe linkuri | Uneori încearcă să împingă utilizatorul spre click | `+10` pentru `6-9`, `+18` pentru `10+` | email cu 8-10 linkuri |
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

Singurul semnal de impersonare este boolean-ul semantic Ollama `brandImpersonationSuspected`
(+10 în `aiScore`). Începând cu engine `rules-ai-v6`, acest semnal este **verificat pe
domeniu**:

- `backend/src/config/brand-domains.config.js` ține o listă (ușor de extins) de domenii
  oficiale, controlate de brand (PayPal, Google, Amazon, Microsoft, Apple, Netflix, Meta,
  LinkedIn, curieri). Potrivirea e pe sufix: `mail.paypal.com` = `paypal.com`, dar
  `evil-paypal.com` și `paypal.com.evil.com` NU se potrivesc.
- Domeniile de mailbox de consumator (`gmail.com`, `outlook.com`, `icloud.com`…) sunt
  excluse deliberat — oricine poate avea o adresă acolo, deci nu sunt semnal de încredere.
- Dacă expeditorul vine de pe un domeniu oficial → `senderVerifiedBrand = true`,
  impersonarea e suprimată (×0) și semnalele tipice de brand sunt reduse (vezi mai jos).
- Dacă nu se potrivește → logica veche rulează ca înainte (LLM-ul decide impersonarea).

Detalii și raționament complet: `docs/FALSE_POSITIVE_REDUCTION.md`.

## Reguli pentru false positives

False positive înseamnă că un email legitim este marcat ca suspect. Pentru a reduce astfel de cazuri:

- nicio regulă slabă nu trebuie să decidă singură verdictul;
- pentru MVP, allowlist/blocklist nu influențează scorul;
- combinația dintre reguli contează mai mult decât o regulă singulară mică;
- emailurile de tip newsletter nu trebuie penalizate prea tare doar pentru multe linkuri;
- limbajul urgent trebuie tratat cu grijă;
- linkurile scurtate trebuie interpretate împreună cu alte semnale.

**Strat de context pentru brand verificat (`rules-ai-v6`):** când `senderVerifiedBrand = true`,
un strat de multiplicatori (`VERIFIED_BRAND_MODIFIERS` în `scoring.config.js`) reduce semnalele
care sunt normale pentru mailul de brand legitim: impersonare ×0, CTA „sign in" ×0.3, multe
linkuri ×0.4, urgență/social engineering ×0.5, `reply_to_mismatch` ×0.5. Rămân la greutate
plină semnalele de payload (cerere de date sensibile, atașamente, IP-link, credențiale în URL),
pentru că sunt periculoase indiferent de expeditor. Ponderile de bază nu se modifică — doar se
multiplică la declanșare.

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

## Stratul de liste per utilizator (allowlist / blocklist) — implementat 2026-06-10

Peste reguli și semnalele AI există un strat de decizii explicite ale utilizatorului, gestionat în Settings și pe pagina emailului (`SenderListEntry`: sender exact sau domeniu întreg, suffix-aware, intrarea de sender bate intrarea de domeniu).

- **Blocklist:** regula `user_blocklist_match` adaugă exact pragul `likely_phishing` (60 pct, `USER_BLOCKLIST_RULE_POINTS`) ⇒ verdictul e garantat prin construcție; semnalele reale se adaugă peste. Ponderea stă în afara `RULE_WEIGHTS` pentru că e decizie de utilizator, nu euristică (invariantele de scoring rămân valabile).
- **Allowlist:** `USER_ALLOWLIST_MODIFIERS` mută la 0 semnalele contextuale (reply-to mismatch, multe linkuri, URL lung, shortener, urgență, CTA, impersonare brand) și înjumătățește social engineering + arhive. Semnalele critice rămân întregi: cerere de date sensibile, atașamente periculoase, IP-link, credențiale în URL, punycode — acoperă expeditorul de încredere compromis.
- **Combinare cu brandul verificat:** multiplicator minim per semnal (`applyScoreContextModifiers`); un email blocat nu mai e afișat ca „verified brand".
- **Exclusivitate mutuală:** index unic `(userId, kind, value)` — un criteriu nu poate fi pe ambele liste; conflictul răspunde 409.
- Listele se aplică la scanările viitoare (rescan/sync), nu retroactiv. Scanarea persistă `senderListMatch` pentru explicabilitate în UI.
