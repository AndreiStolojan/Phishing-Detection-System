# Script de prezentare — SecureInbox (demo coordonator)

Durată țintă: **10–12 minute** demo + întrebări. Limba: română (termenii din UI rămân în engleză).

---

## Pregătire înainte de întâlnire (5 minute, o singură dată)

1. Pornește backend + frontend:
   ```bash
   npm --prefix backend run dev      # :5500
   npm --prefix frontend run dev     # :5173
   ```
2. (Opțional, dacă vrei AI explanations live) pornește Ollama local. Dacă nu, lasă AI-ul oprit din Settings — aplicația folosește explicația controlată de backend și poți spune exact asta la demo (e un selling point: degradare grațioasă).
3. Loghează-te cu contul tău și asigură-te că Gmail e conectat și sincronizat.
4. Inserează emailurile de demo (acoperă toate scenariile de mai jos):
   ```bash
   node backend/scripts/seed-demo-inbox.js andreistolojan@gmail.com
   ```
   După prezentare le ștergi cu `--clean`. Ele există doar în baza locală — nu ating Gmailul real.
5. Verifică în **Trusted & Blocked** că nu ai reguli rămase de la teste (lista curată face demo-ul de la Scenariul 4 mai clar).

---

## Structura prezentării

### 1. Problema și ideea (1 minut)

> „Phishing-ul rămâne vectorul principal de atac asupra utilizatorilor obișnuiți — iar filtrele clasice de spam decid pentru utilizator, fără să explice nimic. SecureInbox este un strat de securitate peste Gmail: sincronizează mesajele, le analizează cu un motor hibrid — reguli deterministe plus un model AI local — și, cel mai important, **explică fiecare verdict**. Este un proiect de Explainable AI aplicat pe detecția de phishing."

Punctează explicit:
- **Hibrid:** regulile deterministe sunt detectorul principal (auditable, reproductibil); AI-ul semantic (Ollama, rulat local — nimic nu pleacă în cloud) e strat secundar, plafonat, care nu poate decide singur „phishing".
- **Explicabil:** fiecare verdict vine cu semnalele care l-au produs, punctajul fiecăruia și o explicație în limbaj natural.
- **Utilizatorul are ultimul cuvânt:** review manual + reguli proprii de trust/block.

### 2. Turul aplicației (2 minute)

Deschide **Dashboard**:
> „Aceasta e postura de securitate a inboxului pe ultimele 30 de zile: rata de mesaje sigure, ce are nevoie de atenție, trendul amenințărilor pe zile și — ca într-un produs comercial — **cine mă țintește**: domeniile din spatele emailurilor riscante."

Arată pe scurt sidebar-ul: Inbox (lista cu badge-uri de risc), Trusted & Blocked (regulile utilizatorului), Reports (audit lunar), Settings.

### 3. Scenarii de detecție (4–5 minute) — inima demo-ului

Deschide Inbox-ul. Emailurile de demo sunt nescanate — **scanezi live** ca să se vadă motorul lucrând.

**Scenariul A — Phishing clasic de credențiale** (`Your account will be suspended in 24 hours`):
- Deschide emailul → „Scan again".
- Verdictul sare la **Likely phishing**. Deschide panoul de semnale:
> „Motorul a găsit: adresa de Reply-To diferă de expeditor — răspunsul ar pleca în altă parte; link scurtat care ascunde destinația; iar AI-ul semantic a detectat limbaj de urgență și cerere de date sensibile. Fiecare semnal are punctajul lui; suma decide verdictul: sub 30 safe, 30–60 suspicious, peste 60 likely phishing. **Niciun semnal singur nu poate condamna un email** — e nevoie de coroborare."

**Scenariul B — Malware prin atașament** (`Invoice #38271`):
- Scan → semnalele: atașament `.exe` (semnal puternic, 35p) + link către adresă IP brută (25p).
> „Astea sunt semnale de payload — anormale indiferent cine pretinde că trimite. De aceea au pondere mare și nu sunt niciodată reduse de straturile de încredere."

**Scenariul C — Brand legitim, nu fals pozitiv** (`Your weekly digest from LinkedIn`):
- Scan → verdict **Safe**, cu bannerul „Verified LinkedIn sender".
> „Aici e contribuția interesantă: emailul ăsta are 7 linkuri, buton de sign-in, reply-to pe alt subdomeniu — exact tiparul phishing. Dar domeniul expeditorului e domeniul oficial LinkedIn, pe care un atacator nu-l poate folosi. Motorul verifică asta și **reduce ponderat** semnalele tipice de brand, fără să le elimine pe cele critice. Așa am redus fals-pozitivele fără să deschid o gaură de detecție — adresele de consumer ca gmail.com sunt deliberat excluse din verificare."

**Scenariul D — Email obișnuit** (`Notite curs joi`): scan → **Safe**, 0 semnale. Baseline-ul.

### 4. Regulile utilizatorului — Trusted & Blocked (2–3 minute)

Deschide `Oferte saptamanale` (newsletterul necunoscut) → Scan → iese **Suspicious** (~38/100: reply-to diferit + multe linkuri).
> „Pentru motor e suspect — expeditor necunoscut, tipar de marketing agresiv. Dar utilizatorul știe că e un newsletter legitim la care s-a abonat. Aici intervine controlul utilizatorului."

- Apasă **Trust / Block → Trust the whole domain** → toast cu „Scan again" → rescan → **Safe, 0/100**, cu bannerul verde „on your trusted list".
> „Încrederea utilizatorului mută semnalele contextuale la zero. Dar dacă același expeditor «de încredere» ar trimite mâine un `.exe` sau ar cere parola, semnalele critice rămân la pondere plină — acoperim scenariul contului compromis."

- Acum demo-ul invers pe phishing-ul de la A: **Block this sender** → rescan → **100/100**, regula „Sender blocked by you".
> „Blocarea e decizia explicită a utilizatorului, nu o euristică — de aceea are voie să decidă singură verdictul: exact pragul de likely phishing, garantat prin construcție."

- Deschide pagina **Trusted & Blocked**:
> „Toate regulile într-un singur loc: câte emailuri acoperă fiecare, căutare, iar logica e strictă — un criteriu nu poate fi simultan și blocat și de încredere, nici măcar încrucișat între sender și domeniul lui. Aplicația respinge contradicția cu un mesaj clar, ca să fie mereu evident ce regulă se aplică."
- Demonstrează: încearcă să adaugi domeniul senderului blocat la Trusted → eroarea 409 cu mesajul explicit.

### 5. Review manual + feedback loop (1 minut)

Pe un email suspect: **Mark phishing**.
> „Verdictul utilizatorului suprascrie scanul peste tot — și mesajul e mutat real în Spam-ul Gmail prin API. Mark safe face inversul. Toate statisticile folosesc verdictul efectiv, deci dashboard-ul și rapoartele spun mereu aceeași poveste."

### 6. Rapoarte și automatizări (1 minut)

Deschide **Reports**:
> „Audit lunar: funnel de detecție, rata de siguranță — aceeași definiție ca pe dashboard —, distribuția riscurilor și top semnale de avertizare, cu explicații pe înțelesul oricui. Raportul se poate trimite pe email. Separat, aplicația rulează sincronizare automată la 15 minute, alerte instant la phishing detectat și un digest zilnic — toate opt-in."

### 7. Închidere — arhitectură și contribuții (1 minut)

> „Tehnic: Node.js + Express + MongoDB, React, și Ollama pentru AI local — confidențialitatea e by design, emailurile nu părăsesc mașina. Contribuțiile principale: motorul hibrid de scoring cu invarianți documentați și testați — niciun semnal slab nu poate declanșa singur un verdict, AI-ul e plafonat sub pragul de phishing; stratul de reducere a fals-pozitivelor prin verificarea domeniilor de brand; sistemul de reguli ale utilizatorului cu semantici stricte; și explicabilitatea end-to-end, cu fallback controlat când AI-ul e oprit. 47 de teste backend, 28 frontend."

---

## Întrebări probabile și răspunsuri scurte

- **„De ce nu doar AI?"** — Reproducibilitate și explicabilitate: regulile sunt deterministe și auditabile; LLM-ul local e nedeterminist și poate halucina, deci e plafonat (max 50p, sub pragul de 60) și nu poate decide singur. Pentru teză, separația rule-based vs semantic e și un cadru de evaluare curat.
- **„Cum previi ca un atacator să abuzeze lista de trust?"** — Trust-ul reduce doar semnalele contextuale; payload-ul (atașamente periculoase, IP links, credențiale în URL, punycode, cereri de date sensibile) rămâne la pondere plină. Plus: verificarea de brand acceptă doar domenii controlate de brand, nu mailbox-uri de consumator.
- **„Ce se întâmplă dacă Ollama e oprit?"** — Degradare grațioasă: regulile dau verdictul, explicația vine dintr-un șablon controlat de backend, iar UI-ul marchează transparent sursa explicației.
- **„Scalează?"** — Pentru scopul tezei e single-user/Gmail; limitele cunoscute (scanare secvențială la sync, polling în loc de push) sunt documentate ca future work, la fel SPF/DKIM/DMARC și reputația URL.
- **„De ce nu e publicată?"** — Aplicația folosește scope-uri Gmail sensibile; publicarea ar cere verificarea Google OAuth. E un proiect de cercetare/demo, rulat local — decizie asumată.

## După prezentare

```bash
node backend/scripts/seed-demo-inbox.js andreistolojan@gmail.com --clean
```
și șterge eventualele reguli de demo din Trusted & Blocked.
