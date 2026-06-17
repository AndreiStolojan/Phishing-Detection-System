# Plan lucrare de licență — SecureInbox

> Sistem de detecție a emailurilor de phishing cu motor hibrid (reguli + AI local explicabil)
> UPT · CTIRO · licență · sesiune 2026 · regulament HS nr.2/29.01.2026

Structura de mai jos este **calibrată pe 6 lucrări CTIRO reale** din `docs/thesis/examples/`
(Avramov, Balet, Belea, Biciușcă, Mirulescu, Secoșan). Toate urmează același schelet.
Țintă: **~55–68 pagini** (norma reală CTIRO; sub plafonul de 100). Similitudine țintă **< 35%** (include text AI).

---

## Structura documentului (schelet standard CTIRO)

| # | Capitol | Pagini est. | Risc plagiat | Sursă conținut |
|---|---------|:----:|:----:|----------------|
| — | Copertă | 1 | — | șablon UPT |
| — | Rezumat (RO, max 1 pag) | 1 | mic | la final |
| — | Cuprins | 1–2 | — | auto |
| 1 | **Introducere** (Context · Motivație · Obiective · Structura lucrării) | 4–6 | mediu | Andrei |
| 2 | **Stadiul actual în domeniu** (filtre & soluții existente, ce lipsește) | 4–6 | ⚠️ mediu | surse + citări |
| 3 | **Fundamente teoretice și tehnologii utilizate** | 8–10 | ⚠️ mediu | surse + cod |
| 4 | **Proiectarea aplicației** (cerințe, arhitectură, date, diagrame, motor scor) | 10–12 | ✅ mic | docs proprii + cod |
| 5 | **Implementarea aplicației** | 14–18 | ✅ foarte mic | cod propriu |
| 6 | **Testarea și utilizarea aplicației** | 8–10 | ✅ mic | teste + capturi |
| 7 | **Concluzii** (concluzii · direcții de dezvoltare) | 2–3 | mic | Andrei |
| — | Bibliografie | 2–3 | exclus | — |
| — | Lista figurilor și a tabelelor | 1 | — | auto |
| — | Declarația de autenticitate | 1 | — | semnată de mână |

---

## Ordinea de SCRIERE (originale întâi → diluează similitudinea)

1. **Cap. 4 — Proiectarea** ← începem aici (cel mai original, ancorează tot restul)
2. **Cap. 5 — Implementarea**
3. **Cap. 6 — Testare și utilizare**
4. **Cap. 3 — Fundamente teoretice și tehnologii** (cu citări; atenție: descrierile generice de tehnologii sunt risc de plagiat)
5. **Cap. 2 — Stadiul actual** (cu citări)
6. **Cap. 1 — Introducere** + **Cap. 7 — Concluzii** (rezumă corpul deja scris)
7. **Rezumat RO**, **Bibliografie**, formatare → `.docx`, verificare finală

---

## Detaliu pe capitole

### 1. Introducere
- 1.1 Context (phishingul ca amenințare; de ce mailul rămâne vectorul principal)
- 1.2 Motivația lucrării (de ce un inbox dedicat cu verdict explicabil)
- 1.3 Obiectivele lucrării (general + specifice)
- 1.4 Structura lucrării (1 paragraf per capitol)

### 2. Stadiul actual în domeniu  *(citări)*
- 2.1 Filtre integrate (Gmail, Outlook) și limitele lor pentru utilizator
- 2.2 Soluții/aplicații dedicate anti-phishing
- 2.3 Abordări din literatură (reguli vs. ML vs. LLM) — pe scurt
- 2.4 Poziționarea SecureInbox (ce aduce nou: hibrid + AI local explicabil + control utilizator)

### 3. Fundamente teoretice și tehnologii utilizate  *(citări la 3.1)*
- 3.1 Fundamente: ce e phishingul, anatomia emailului (headere, `From`/`Reply-To`, linkuri, atașamente), inginerie socială, conceptul de XAI
- 3.2 Tehnologii (descrise pe rând, **ancorate la cum le folosesc eu**, nu definiții generice):
  Node.js + Express · MongoDB + Mongoose · JWT · React + Vite + Tailwind · Ollama (`gemma3:4b`) · Gmail API + OAuth2 · node-cron

### 4. Proiectarea aplicației  *(original — începem aici)*
- 4.1 Analiza cerințelor (funcționale + non-funcționale)
- 4.2 Arhitectura de ansamblu (monolit modular + frontend + Ollama local) — `ARCHITECTURE.md`, `EXPLICATIE_BACKEND.md`
- 4.3 Modelul de date (users, mailAccounts, emails, scans, senderLists)
- 4.4 Diagrame: cazuri de utilizare (UML) + fluxul cap-coadă — `EXPLICATIE_FLUX.md`
- 4.5 Proiectarea motorului de scor hibrid (ruleScore + aiScore, praguri, verdict) — `PHISHING_RULES.md`, `scoring.config.js`
- 4.6 Decizii de proiectare și alternative respinse — `DECISIONS.md` ← text uman + apărare

### 5. Implementarea aplicației  *(original, pondere maximă)*
- 5.1 Organizarea proiectului și stack-ul
- 5.2 Autentificare (JWT, middleware, arcjet)
- 5.3 Integrarea Gmail (OAuth2, criptare token AES-256-GCM, sync)
- 5.4 Parsarea emailului și extragerea semnalelor
- 5.5 Motorul de reguli (`scan.service.js`, `scoring.config.js`)
- 5.6 Stratul semantic Ollama + explicația în limbaj natural
- 5.7 Straturi de context: brand verificat + liste per utilizator
- 5.8 Automatizare: sync programat (node-cron), alerte, digest
- 5.9 Frontendul (dashboard, pagina de email) — `EXPLICATIE_FRONTEND.md`

### 6. Testarea și utilizarea aplicației  *(original)*
- 6.1 Strategia de testare (unit 52 backend / 36 frontend; teste manuale)
- 6.2 Exemple reale de detecție (safe / suspicious / likely_phishing) cu motive
- 6.3 Reducerea falselor pozitive — `FALSE_POSITIVE_REDUCTION.md`
- 6.4 Utilizarea aplicației pas cu pas (capturi de ecran)

### 7. Concluzii
- 7.1 Concluzii (rezultate-cheie, opinie personală)
- 7.2 Direcții de dezvoltare (SPF/DKIM/DMARC, Gmail push, reputație URL)

---

## Stare scriere (actualizat 2026-06-16)
- ✅ **Cap. 4 — Proiectarea** (`cap4-proiectare.md`) — 4.1–4.6 complet. 6 inserturi `[ANDREI]`, 4 `[FIGURĂ]`, 1 `[TABEL]`.
- ✅ **Cap. 5 — Implementarea** (`cap5-implementare.md`) — 5.1–5.9 complet, snippets selective. 4 inserturi `[ANDREI]`, 1 `[FIGURĂ]`.
- ⬜ Următor: Cap. 6 (Testare și utilizare) → Cap. 3 → Cap. 2 → Cap. 1 + 7 → rezumat/bibliografie → `.docx`.

## Note de calibrare (din lucrările CTIRO 2022–2023)
- Lungime reală: 44–69 pagini (medie ~57). Țintim ~55–68.
- Teorie **ușoară**: stadiul actual + fundamente sunt scurte, practice — nu eseuri.
- Capitol dedicat **Tehnologii folosite**, descrise una câte una.
- **Proiectare** conține: cerințe func/non-func, arhitectură, diagrame UML (use-case + flux), proiectarea bazei de date.
- Persoana întâi pentru munca proprie („am ales", „am implementat").
- Figuri numerotate, titlu **dedesubt**; tabele numerotate, titlu deasupra.
- Bibliografii modeste (teze practice). Țintă 20–30 surse, mai ales pentru cap. 2–3.
