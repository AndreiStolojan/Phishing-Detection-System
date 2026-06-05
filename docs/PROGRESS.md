# PROGRESS

## Scop

Acest fișier arată clar unde a rămas proiectul în acest moment. El trebuie citit înainte de lucru dacă vrem să știm rapid starea curentă fără să parcurgem tot `TODO.md`.

## Reguli de actualizare

- Se actualizează după fiecare pas important finalizat.
- Se schimbă `Faza curentă` când trecem la alt milestone.
- Se completează `Următorul pas imediat` după fiecare sesiune de lucru.
- Dacă apare un blocaj, se notează la `Blocaje`.

## Snapshot curent

- Data ultimei actualizări: `2026-06-06`
- Faza curentă: `Faza 22 - UI Premium Upgrade` — COMPLETĂ (toate 11 faze)
- Status general: backend 100% stabil, MVP ~99%. UI premium Apple-grade livrat integral (Fazele 1-11). Build frontend curat, 20/20 teste frontend, 12/12 teste backend. Rămas: verificare vizuală cap-coadă de Andrei (Gmail real) + capturi demo.
- Progres estimativ MVP: `100%` backend · `97%` produs final
- Deadline: ~2026-06-17 (draft lucrare)

## Notă sesiune 2026-06-06 - UI Premium Upgrade (Faza 22)

Context: Andrei a cerut UI premium tip Apple. Audit cu 12 agenți → plan 11 faze (`docs/UI_PREMIUM_PLAN.md`). Decizii: full premium, dashboard posture-first, naming `SecureInbox`, emailuri în engleză.

Făcut:
- Checkpoint de siguranță: commits `b639409`/`110495b`/`9c7ff4f` + plan docs `3a36d06`, toate pushed pe `origin/main`.
- **Faza 1 (token foundation) — DONE**: Inter Variable self-hosted (`public/fonts/`, preload, font-features cv11/ss01); type ramp + elevation ramp + motion tokens în `index.css`; `src/lib/motion.js` nou (springSoft/springSnappy); recolor risc rose→brick + soft backgrounds via color-mix (nume tokeni neschimbate); `<MotionConfig reducedMotion="user">` + guard prefers-reduced-motion; title/meta `SecureInbox`. Build curat.

De știut: 3 teste `ReviewActions` pică DE DINAINTE de această sesiune (label literal "✓" vs test care cere "marked safe") — se repară în Faza 5 când se rescrie ReviewActions.

- **Faza 2 (primitive shared) — DONE**: Button cu `active:scale-[0.97]` + token primary-hover/active + size `icon-sm`; Card cu `surface-raised` (shadow + inner highlight) + prop `interactive`; Input + Textarea nou cu focus ring soft (primary/25) + caret-primary; Switch iOS-grade (h-7 w-12, thumb 24px); Skeleton cu shimmer sweep (`@keyframes shimmer`); AlertDialog nou (`@radix-ui/react-alert-dialog`); PageHeader pe `text-h2` + `eyebrow`. Build curat, doar cele 3 teste ReviewActions pre-existente pică.

- **Faza 3 (shell & navigare) — DONE**: Sidebar + BottomNav cu indicator activ traveling (`layoutId` bg + accent bar, spring), material frosted (backdrop-blur-xl), wordmark unic `SecureInbox`, status Gmail cu ping live, chevron pe user dropdown; PageTransition pe spring + scroll-reset la schimbare rută; MobileSync FAB cu AnimatePresence + whileTap + safe-area iPhone. Build curat.

- **Faza 4 (inbox & EmailRow) — DONE**: EmailRow rescris — `motion.create(Link)` cu stagger (delay pe index) + whileTap + focus-visible ring inset; leading = risk-icon tinted pentru loud, monogram colorat determinist pentru calm; ierarhie sender 15px / subject sm / snippet caption; bara stânga + badge doar pentru buckets loud (`tone.emphasis`), restul recede; chevron reveal la hover. InboxPage: filter chips segmented cu `layoutId` pill colorat pe tonă, counts ascunse la search; search cu clear + spinner + shortcut `/`; group headers calm (hairline, non-sticky → fix conflict overflow/sticky). InboxSkeleton mirror layout nou + shimmer; Pagination targets 36px. `lib/risk.js` are `tone.emphasis`. Build curat.

- **Faza 5 (verdict UI) — DONE**: VerdictBanner = hero cu icon ring, accent stânga, glow one-shot doar pe loud, cross-fade `AnimatePresence` keyed pe riskBucket. ReviewActions rescris: butoane "Mark safe"/"Mark phishing" → "Marked …" cu Check animat (spring), toast Sonner (inclusiv "Moved to Gmail Spam"), flip optimistic cu rollback pe eroare; culoare action = rose quarantine, confirmed = brick. ScanDetails = narativ: AI explanation panel primar, notă fallback Ollama calmă (risk-review nu amber hardcoded), Evidence colapsabil (score bars animate din 0, total colorat pe tonă verdict). EmailDetailPage.handleReviewed nu mai face full-reload. **Cele 3 teste ReviewActions reparate — acum 18/18 trec.** Build curat.

- **Faza 6 (reading view + privacy gate) — DONE**: `.email-body` cu reguli reale (headings/lists/blockquote/links/img/table/pre, `:where()` ca să nu bată stilurile inline din email); `sanitizeEmailHtml` întoarce acum `{html, blockedImages}` și are privacy gate (img remote + background-image + tracking pixels blocate pe buckets riscante); EmailBody afișează banner "Load images" (auto-load pe safe). EmailDetailPage: keyboard nav (←/k, →/j, Esc, guard input), header cu monogram + "n of total", surface de citire fără cutia dublă-border, ScanDetails inline (eliminat dublu-collapse — AI explanation mereu vizibil), re-scan cu toast. 20/20 teste (2 sanitize noi). Build curat.

- **Faza 7 (dashboard posture-first) — DONE**: PostureHero band ca focal point ("You're protected"/"N need attention" + CTA), RiskDonut mărit cu center = safe % + legend hover-linked cu procente, StatCard rescris (count-up de la valoarea precedentă nu de la 0, reduced-motion guard, linkate la filtre cu hover lift + ArrowUpRight), attention list cu EmailRow compact, DashboardSkeleton mirror nou. Build + 20 teste curat.

- **Faza 8 (reports) — DONE**: PageHeader + month stepper themed (prev/label/next, next blocat la luna curentă); TopRulesChart colorat pe severitate + LabelList valori + tooltip custom (occurrences + pts) + cursor soft; AI "Failed" devine neutral (nu mai e amber de risc); send-report cu success state pe buton + linie "Last emailed"; ReportsSkeleton nou; eliminat double error surface; fix `staggerIndex`→`index` la StatCard (rămas din Faza 7). Build + 20 teste curat.

- **Faza 9 (Settings + Login) — DONE**: SettingsPage = coloană unică max-w-2xl, secțiuni cu icon chip + descriere + PageHeader, **Disconnect Gmail acum în AlertDialog (blocker rezolvat)**, toggle rows clickabile cu hover, Textarea nou la support, dirty-state pe sync save, status Gmail cu ping live, stagger entry. LoginPage = entrance spring + stagger, ambient dublu-glow + logo gradient/glow, morph sign-in↔register (AnimatePresence pe name/confirm/rules), password strength meter + ticks spring, autofocus, error animat role=alert, naming `SecureInbox`. AlertDialog + Textarea acum folosite. Build + 20 teste curat.

- **Faza 10 (motion sweep & cleanup) — DONE**: easing string `'easeOut'` din VerdictBanner glow → `ease` shared; `animate-pulse` din loading-ul "Needs attention" → `Skeleton` shimmer; reduced-motion acoperit (MotionConfig + guard CSS); nicio referință `staggerIndex` rămasă. Frontend nu are script `lint` → gate = build + 20 teste (curat).

- **Faza 11 (template-uri email) — DONE**: shell email comun dark on-brand (welcome/digest/alert) cu bulletproof tables + culori inline; CTA cu deep-link (digest→/dashboard, alert→/inbox?riskBucket=quarantine) via `FRONTEND_APP_URL`; hexes risc canonice; eliminat gradient purple/red + emoji siren; digest cu hero safe-rate % + grid 2×2 + top rules; engleză peste tot; preheader + footer brand + an dinamic. send-email welcome → en-GB. Backend 12/12 teste, render check OK.

**FAZA 22 COMPLETĂ — toate 11 faze livrate.**

Iterație feedback Andrei 2026-06-06: (1) eliminat PostureHero band-ul mare de pe primul rând al dashboard-ului (arăta hideous) → dashboard reorganizat: header cu eyebrow lună + "Overview" + last sync + chip de status mic (rose "N need attention" / verde "All clear"), apoi 4 KPI cards (luna curentă), apoi donut "Risk breakdown · <lună>" + needs-attention. (2) Animație inbox "weird" → eliminat stagger-ul per-rând din EmailRow (se compunea cu page transition) + PageTransition trecut pe tween curat (exit doar opacity, fără double-slide).

Următorul pas: Andrei verifică vizual cap-coadă cu Gmail real (`npm --prefix frontend run dev` + backend), apoi capturi demo pentru coordonator.

## Notă sesiune 2026-06-05 (4) - Audit vizual complet Faza 19

- Data: `2026-06-05`
- Ce s-a făcut: audit vizual pagină cu pagină față de referința `athlete_atlas`. Probleme identificate și documentate în `TODO.md` Faza 19.
  - Login/Register: lipsesc `confirmPassword`, card prea lat, icon și titlu prea mici
  - Dashboard: centrul donut-ului gol, hint text prea subtil pe stat cards
  - Inbox: filtrele nu au badge cu număr, search și filtre nu sunt pe același rând
  - Email Detail: lipsește `<PageHeader>`, panelul de securitate nu e sticky
  - Reports: AI analysis prea sparse, lipsesc descrieri sub numere
  - Settings: label `syncMaxResults` prea tehnic
- Faza curentă: `Faza 19 - Visual polish`
- Următorul pas imediat: implementare `confirmPassword` în `LoginPage.jsx`, apoi celelalte polish-uri

## Notă sesiune 2026-06-05 (3) - Faza 17 finalizată

- Data: `2026-06-05`
- Ce s-a făcut: Faza 17 completă — auto-sync scheduler + notificări.
  - `node-cron` instalat și configurat
  - Job auto-sync la interval configurabil (`SYNC_INTERVAL_MINUTES`, default 15 min) — `scheduler.service.js` + `auto-sync.service.js`
  - Câmp `alertsEnabled` adăugat în modelul `User` (default `false`)
  - Endpoint `PATCH /api/v1/users/me/notification-settings` pentru toggle `alertsEnabled`
  - Instant phishing alert email: când un email nou este detectat ca `likely_phishing` și userul are `alertsEnabled: true`, se trimite email de alertă
  - Daily digest auto-schedulat la 08:00 UTC — nu se trimite dacă nu există emailuri noi sau riscante în ultimele 24h
  - Logging clar în consolă pentru fiecare run al job-urilor
  - `syncGmailEmailsForUser` acum expune `insertedEmailIds` în return pentru detectarea phishing-ului la sync
- Teste backend: 12/12 pass. Lint: fără erori.
- Faza curentă: `Faza 17 - TERMINATĂ` → urmează `Faza 18 - Redesign frontend profesional`
- Următorul pas imediat: Faza 18 — redesign frontend profesional.

## Notă sesiune 2026-06-05 (2) - Faza 16 finalizată

- Data: `2026-06-05`
- Ce s-a făcut: toate cele 4 bug-uri critice rezolvate. Teste backend: 12/12 pass.
  - Bug 1: `user.service.js` — `payload.aiEnabled === 1` → `Boolean(payload.aiEnabled)`
  - Bug 2: `ollama-explanation.service.js` — `DEFAULT_OLLAMA_MODEL` are acum fallback `|| 'gemma3:4b'`
  - Bug 3: `scan-explanation.service.js` — `buildControlledRomanianExplanationObject` folosește acum `buildControlledRomanianExplanation` complet, inclusiv `triggeredRules` și `aiSignals`
  - Bug 4: `auth.service.js` — eliminat session/transaction Mongoose din `registerUser`; `User.create()` este atomic prin sine
- Faza curentă: `Faza 16 - TERMINATĂ` → urmează `Faza 17 - Auto-sync scheduler și notificări`
- Următorul pas imediat: Faza 17 — instalare `node-cron`, job auto-sync la 15 minute, instant phishing alert email, daily digest auto-schedulat.

## Notă sesiune 2026-06-05 - Plan coordonator + restructurare repo

- Data: `2026-06-05`
- Ce s-a făcut: code review complet backend (4 bug-uri critice + probleme de calitate documentate în `CLAUDE.md`). Worktree-urile vechi și `.claude/` eliminate. `AGENTS.md` absorbit în `CLAUDE.md`. `PROJECT_STATE.md` și `TODO.md` actualizate cu planul complet.
- Feedback coordonator: aplicația trebuie să funcționeze fără ca utilizatorul să deschidă Gmail. Se adaugă auto-sync scheduler, instant phishing alert (opt-in), daily digest auto-schedulat, redesign frontend profesional.
- Plan convenit în ordine: (1) fix 4 bug-uri, (2) auto-sync + notificări, (3) redesign frontend.
- Implementare scheduler: `node-cron` polling la 15 minute. La deploy pe server poate fi înlocuit cu Gmail Push Notifications (Pub/Sub) fără să se schimbe logica de sync/scan.
- Următorul pas imediat: fix Bug 4 (MongoDB transaction) → Bug 1 (AI toggle) → Bug 2 (Ollama default) → Bug 3 (explanation fallback).

## Notă sesiune 2026-06-02 - Gmail în Settings

- Data: `2026-06-02`
- Ce s-a finalizat: conectarea Gmail a fost mutată în Settings, împreună cu deconectarea și setarea `syncMaxResults`.
- Ce s-a ajustat: Inbox nu mai are card de conectare Gmail; conectarea/deconectarea se face din Settings.
- Ce s-a ajustat în Status/Dashboard: pagina nu mai pornește OAuth direct; trimite utilizatorul către Settings dacă Gmail nu este conectat și afișează numele, nu emailul.
- Ce s-a verificat: `npm --prefix frontend test` trece și `npm --prefix frontend run build` trece.
- Următorul pas imediat: verificare manuală în browser pentru `Settings -> Connect Gmail`, apoi revenire în Inbox.

## Notă sesiune 2026-06-02 - acțiune discretă de actualizare Inbox

- Data: `2026-06-02`
- Ce s-a finalizat: butonul plutitor din Inbox a fost eliminat; acțiunea de aducere a mesajelor noi este acum un icon discret integrat în bara de search.
- Ce s-a ajustat în layout: titlul și subtitlul din Inbox au fost eliminate, controalele încep sus, iar lista se întinde pe lățimea și spațiul disponibil.
- Ce s-a ajustat în copy: Inbox nu mai afișează text vizibil de tip `sync`; acțiunea este prezentată ca `Check for new mail`.
- Ce s-a verificat: `npm --prefix frontend test` trece și `npm --prefix frontend run build` trece.
- Următorul pas imediat: verificare vizuală în browser pentru Inbox cu Gmail conectat și neconectat.

## Notă sesiune 2026-06-02 - redesign inbox frontend

- Data: `2026-06-02`
- Ce s-a finalizat: inbox-ul vechi cu 3 panouri a fost înlocuit cu un layout centralizat: filtre sus, search sub filtre, listă verticală de emailuri și navigare către pagina separată `/emails/:id`.
- Ce s-a ajustat: pagina de detaliu email are săgeată de back în stânga sus, afișează metadata, scanarea, acțiunile de review și body-ul complet; imaginile din email nu mai sunt înlocuite cu text de tip `Remote image blocked`.
- Ce s-a adăugat în UX atunci: ecranul de inbox afișa temporar conectarea/sync-ul Gmail; ulterior conectarea/deconectarea Gmail a fost mutată în Settings.
- Ce s-a verificat: `npm --prefix frontend test` trece și `npm --prefix frontend run build` trece.
- Următorul pas imediat: test manual în browser cu backend pornit: login, connect Gmail dacă este necesar, sync, deschidere email din listă și verificare body HTML.

## Notă sesiune 2026-04-24

- Data: `2026-04-24`
- Ce s-a finalizat: integrarea finală a routerelor `emails`, `lists` și `meta` în `app.js`, toate sub `/api/v1`
- Următorul pas imediat: implementarea acțiunilor din Faza 9 (`mark safe`, `block sender local`) peste datele și scanările deja disponibile

## Notă sesiune 2026-04-27

- Data: `2026-04-27`
- Ce s-a clarificat: verificarea repo-ului a confirmat că `lists` nu sunt doar CRUD, ci sunt deja folosite în scorare pentru `sender email` și `sender domain`, iar `meta/status` returnează sumar util per utilizator (`mailAccounts`, `emails`, `scans`, `hasGmailConnected`, `aiSemanticEnabled`)
- Ce s-a aliniat: documentația `TODO/PROGRESS` a fost actualizată ca să reflecte mai fidel starea reală din cod
- Următorul pas imediat: implementarea acțiunilor manuale din Faza 9, în special `mark safe`, `block sender local` și apoi `allow sender/domain`

## Notă sesiune 2026-04-27 - acțiuni manuale

- Data: `2026-04-27`
- Ce s-a finalizat: layer-ul de acțiuni manuale pe email este implementat și local-only, cu validare de ownership, idempotent unde are sens și cu persistarea minimă pentru review (`userVerdict`, `reviewedAt`, `lastManualAction`)
- Ce s-a păstrat: `mark safe` și `mark phishing` actualizează doar review-ul, iar `allow/block sender/domain` scriu doar în lists locale
- Următorul pas imediat: test manual pe rutele `POST /api/v1/actions/emails/:id/*` și apoi decizia dacă `move to spam/junk` merită pentru Gmail MVP

## Notă sesiune 2026-04-27 - settings și protecție rescan

- Data: `2026-04-27`
- Ce s-a finalizat: a fost aliniată documentația pentru setarea `syncMaxResults` și pentru regula prin care emailurile cu `userVerdict` sunt sărite din rescanarea automată la sync
- Ce s-a păstrat: flow-ul existent `sync -> scan` rămâne intact, fără bulk-rescan pentru emailuri istorice revizuite
- Următorul pas imediat: validarea manuală a endpoint-ului `PATCH /api/v1/mail-accounts/:id/settings` împreună cu un sync pe un cont Gmail deja folosit

## Notă sesiune 2026-04-27 - verificare integrare

- Data: `2026-04-27`
- Ce s-a verificat: acțiunile manuale sunt montate sub `/api/v1/actions`, setarea `syncMaxResults` este expusă prin `PATCH /api/v1/mail-accounts/:id/settings`, iar protecția de auto-rescan pentru emailurile cu `userVerdict` este implementată în pipeline-ul de sync
- Ce lipsește încă: endpoint-urile `GET /api/v1/emails` și `GET /api/v1/emails/:id` nu întorc încă starea derivată necesară pentru UI (`userVerdict`, `reviewStatus`, `effectiveVerdict`, `isQuarantined`, `listMembership`)
- Următorul pas imediat: extinderea răspunsurilor din `email.service.js` pentru a expune starea finală și apartenența la liste

## Notă sesiune 2026-04-28 - contract stare email

- Data: `2026-04-28`
- Ce s-a finalizat: endpoint-urile `GET /api/v1/emails` și `GET /api/v1/emails/:id` întorc acum câmpurile de review manual, verdictul efectiv, sursa verdictului, statusul de review, starea de carantină și `listMembership`
- Ce s-a păstrat: starea finală este derivată la citire din `userVerdict`, `latestScan` și allowlist/blocklist, fără acțiuni reale în Gmail și fără refactor în `src/`
- Următorul pas imediat: test manual pe emailuri `safe`, `suspicious`, `likely_phishing`, `mark-safe`, `mark-phishing` și allow/block sender/domain

## Notă sesiune 2026-04-28 - raport lunar phishing

- Data: `2026-04-28`
- Ce s-a finalizat: a fost implementat endpoint-ul protejat `GET /api/v1/reports/monthly-summary`, cu sumar pe utilizator autentificat, perioadă implicită pe luna curentă, suport `month=YYYY-MM`, contoare de sync/scan/review, reguli declanșate frecvent, blocklist recentă și statusuri AI
- Ce s-a păstrat: endpoint-ul este doar de date; nu introduce job programat, nu trimite email și nu schimbă flow-ul Gmail existent
- Următorul pas imediat: test manual cu token real pentru luna curentă și pentru o lună explicită, apoi continuarea deciziei despre `move to spam/junk`

## Notă sesiune 2026-04-28 - Gmail move-to-spam manual

- Data: `2026-04-28`
- Ce s-a finalizat: `mark-phishing` păstrează review-ul local, adaugă expeditorul în blocklist local și apoi încearcă mutarea mesajului Gmail în Spam cu `users.messages.modify`
- Ce s-a păstrat: scanările automate `likely_phishing` nu mută emailuri în Spam, iar `mark-safe` rămâne local-only și nu modifică Gmail sau listele locale
- Detaliu important: scope-ul Gmail a fost schimbat la `gmail.modify`, deci conturile Gmail conectate anterior trebuie reconectate
- Următorul pas imediat: test manual `reconnect Gmail -> sync -> mark-phishing -> verificare mesaj în Spam`

## Notă sesiune 2026-04-28 - digest lunar manual pe email

- Data: `2026-04-28`
- Ce s-a finalizat: a fost implementat endpoint-ul protejat `POST /api/v1/reports/monthly-summary/send`, care reutilizează serviciul de sumar lunar și trimite un template HTML în română către emailul utilizatorului autentificat
- Ce s-a păstrat: trimiterea este manuală, fără scheduler/cron, iar welcome email-ul din auth nu a fost reactivat
- Config necesar: `EMAIL_FROM` și `EMAIL_PASSWORD` în `backend/.env.development.local` sau în fișierul de env al mediului curent
- Următorul pas imediat: test manual cu un cont local care are email valid și cu credentiale Gmail/app password configurate

## Notă sesiune 2026-04-28 - aliniere documentație backend nou

- Data: `2026-04-28`
- Ce s-a finalizat: documentația a fost aliniată cu backend-ul curent pentru starea emailurilor, acțiunea Gmail `mark-phishing`, sumarul lunar, digestul lunar manual, pragurile reale de scor și variabilele de mediu relevante
- Limitări notate explicit: acțiunea Gmail write apare doar după `mark-phishing` manual, filtrele Gmail nu sunt implementate, iar digestul lunar este manual dacă nu se adaugă separat o automatizare
- Următorul pas imediat: test manual cap-coadă `reconnect Gmail -> sync -> mark-phishing -> verificare Spam`, apoi test `POST /api/v1/reports/monthly-summary/send?month=YYYY-MM` cu `EMAIL_FROM` și `EMAIL_PASSWORD`

## Notă sesiune 2026-04-28 - ordine acțiuni manuale și semantică finală email

- Data: `2026-04-28`
- Ce s-a finalizat: `mark-phishing` salvează local `userVerdict: phishing` înainte de blocklist și înainte de acțiunea Gmail, iar eșecul blocklist este întors explicit prin `listEntry.status: failed` fără să anuleze review-ul local
- Ce s-a aliniat: starea finală a emailului separă acum verdictul algoritmic (`safe`, `suspicious`, `likely_phishing`) de verdictul manual (`safe`, `phishing`), iar `effectiveVerdict`, `isQuarantined` și `riskBucket` urmează regulile finale documentate în `API_PLAN.md`
- Următorul pas imediat: test manual pentru `mark-phishing` cu sender normal, `mark-phishing` cu eșec de blocklist, `mark-safe` și verificarea câmpurilor de stare după fiecare acțiune

## Notă sesiune 2026-04-28 - filtre email după starea finală

- Data: `2026-04-28`
- Ce s-a finalizat: `GET /api/v1/emails` filtrează acum `verdict` după `effectiveVerdict`, nu după `latestScan.verdict`, și acceptă `phishing` pentru emailurile marcate manual
- Ce s-a adăugat: query-ul opțional `riskBucket` permite listarea directă a grupurilor UI (`needs_review`, `quarantine`, `confirmed_phishing`, `reviewed_safe`, `safe`, `unscanned`), iar `pagination.total` se calculează după aceleași filtre
- Următorul pas imediat: test manual cu token real pentru filtrele `verdict=safe`, `verdict=likely_phishing`, `verdict=phishing`, `riskBucket=needs_review`, `riskBucket=quarantine` și `riskBucket=confirmed_phishing`

## Notă sesiune 2026-04-28 - scanare curentă sigură la concurență

- Data: `2026-04-28`
- Ce s-a finalizat: modelul `Scan` are acum index unic `userId + emailId`, iar salvarea scanării curente folosește `findOneAndUpdate` atomic cu `upsert: true`, deci două scanări concurente pentru același email nu mai pot crea documente duplicate când indexul există
- Ce s-a păstrat: verdicturile (`safe`, `suspicious`, `likely_phishing`), logica de scorare, câmpurile AI și modelul MVP cu o singură scanare curentă per email
- Migrare locală: dacă există duplicate vechi în `scans`, trebuie rulat din `backend/` `npm run cleanup:duplicate-scans` înainte ca MongoDB să poată construi indexul unic
- Impact raport lunar: duplicatele vechi puteau umfla `scannedEmails`, verdicturile, regulile frecvente și statusurile AI; cu o scanare curentă per email, sumarul lunar nu mai dublează același email din cauza concurenței
- Următorul pas imediat: test manual de concurență cu două request-uri simultane către `POST /api/v1/scans/emails/:emailId`, apoi verificare că există un singur document `Scan` pentru perechea `userId + emailId`

## Notă sesiune 2026-05-02 - eliminare lists din MVP

- Data: `2026-05-02`
- Ce s-a finalizat: allowlist/blocklist au fost scoase din MVP ca endpoint-uri publice, acțiuni manuale, influență în scoring și câmpuri expuse în răspunsurile emailurilor
- Ce s-a păstrat: flow-ul Gmail OAuth/sync, scanarea de bază pe reguli + AI semantic și acțiunea Gmail `move to spam` după `mark-phishing` manual
- Următorul pas imediat: test manual pentru `mark-safe`, `mark-phishing`, răspunsurile `GET /api/v1/emails` fără `listMembership` și verificarea că `/api/v1/lists` întoarce 404

## Notă sesiune 2026-05-02 - explainability AI structurată

- Data: `2026-05-02`
- Ce s-a finalizat: scanarea folosește setarea `User.settings.aiEnabled`, endpoint-ul `PATCH /api/v1/users/me/ai-settings` poate porni/opri AI per utilizator, iar `aiExplanation` este salvat ca obiect simplu pentru frontend, cu `summary` ca unic text de explicație
- Ce s-a păstrat: LLM-ul nu decide verdictul, nu schimbă scorul și primește pentru explicația finală doar verdictul, scorurile, regulile declanșate și semnalele AI deja calculate; outputul este un `summary` în 1-3 fraze scurte cu recomandare inclusă
- Fallback: dacă AI este oprit, Ollama nu este apelat și `aiExplanationMeta.fallbackReason` devine `ai_disabled`; dacă Ollama eșuează sau întoarce output invalid, backend-ul folosește explicația controlată
- Regula de rescanare: oprirea AI nu forțează rescanări, dar când AI este pornit o scanare curentă făcută fără AI sau fără explicație Ollama poate fi refăcută într-un flow eligibil
- Următorul pas imediat: test manual cu `aiEnabled=0`, scanare, apoi `aiEnabled=1`, rescanare manuală sau sync eligibil și verificare `aiExplanationMeta`

## Notă sesiune 2026-05-02 - checklist teste manuale backend

- Data: `2026-05-02`
- Ce s-a finalizat: a fost adăugat `docs/MANUAL_TESTS.md`, cu lista endpoint-urilor care trebuie testate manual, ordinea recomandată de testare, cazurile de eroare și tipurile de teste utile pentru proiect
- Ce s-a corectat: `docs/TODO.md` nu mai listează `block sender local` și `allow sender/domain` ca taskuri critice pentru MVP, deoarece allowlist/blocklist au fost scoase din MVP și rămân opționale după MVP
- Următorul pas imediat: rularea checklist-ului din `docs/MANUAL_TESTS.md`, în special flow-ul `register -> login -> connect Gmail -> sync -> scan automat -> mark-phishing -> verificare Gmail Spam`

## Notă sesiune 2026-05-02 - reorganizare în `src/`

- Data: `2026-05-02`
- Ce s-a finalizat: codul runtime al backend-ului a fost mutat în `src/`, inclusiv `app.js`, `server.js`, `config`, `database`, `common`, `middlewares`, `models`, `controllers`, `services`, `routes` și `validations`
- Notă ulterioară: în sesiunea 2026-05-11, acest `src/` a fost mutat sub `backend/src/`, împreună cu `manual-tests/`, `scripts/`, `extras/` și fișierele de package.
- Ce s-a aliniat atunci: scripturile `start` și `dev` porneau `src/server.js`, scripturile utilitare importau din `src/`, iar `manual-tests` era servit corect.
- Verificare făcută atunci: `npm run lint` trecea, iar importul aplicației prin `src/app.js` funcționa.
- Următorul pas imediat: rularea testelor manuale cap-coadă după noua structură, ca să confirmăm că nu s-a stricat flow-ul real cu MongoDB și Gmail

## Notă sesiune 2026-05-11 - testare backend și explicații AI expuse corect

- Data: `2026-05-11`
- Ce s-a finalizat: endpoint-urile backend au fost testate manual și funcționează, iar răspunsurile `GET /api/v1/emails` și `GET /api/v1/emails/:id` afișează acum corect `aiExplanation` și `aiExplanationMeta` atunci când scanarea le-a generat.
- Ce s-a clarificat: `aiExplanationMeta.status: generated`, `source: ollama`, `fallbackUsed: false` înseamnă că explicația a fost generată de Ollama, nu de fallback-ul controlat din backend; `hostFallbackUsed` se referă doar la fallback-ul de host local (`localhost` / `127.0.0.1`).
- Ce s-a păstrat: scanarea manuală forțează rescanarea, iar scanarea automată din sync poate sări emailurile deja scanate cu motorul curent și setarea AI curentă.
- Următorul pas imediat: construirea frontend-ului minim pentru demonstrație peste API-ul backend stabil.

## Notă sesiune 2026-05-11 - structură `backend/`

- Data: `2026-05-11`
- Ce s-a finalizat: fișierele backend au fost mutate în `backend/`: `src/`, `package.json`, `package-lock.json`, `scripts/`, `manual-tests/`, `postman/`, `.postman/`, `extras/`, `eslint.config.js` și fișierele `.env.*.local`.
- Ce s-a păstrat: documentația proiectului rămâne în `docs/`, iar endpoint-urile API nu s-au schimbat.
- Următorul pas imediat: verifică backend-ul din nou din `backend/`, apoi construiește frontend-ul minim peste API-ul existent.

## Notă sesiune 2026-05-11 - README profesional

- Data: `2026-05-11`
- Ce s-a finalizat: `README.md` a fost rescris ca prezentare profesională pentru recrutori, cu descrierea proiectului, statusul real, stack-ul, arhitectura, setup local, endpoint-uri principale, limitări și ce rămâne de făcut.
- Ce s-a păstrat: nu s-au schimbat endpoint-uri, cod runtime sau flow-uri backend.
- Următorul pas imediat: construirea frontend-ului minim pentru demonstrație peste API-ul backend existent.

## Notă sesiune 2026-05-11 - plan frontend și taskuri pentru agenți

- Data: `2026-05-11`
- Ce s-a finalizat: a fost documentat planul frontend pe termen lung în `docs/FRONTEND_PLAN.md`, cu structură propusă pentru `frontend/src/`, pagini MVP, reguli de UI și decizia de temă dark-only pentru prima versiune.
- Ce s-a adăugat: `docs/FRONTEND_AGENT_TASKS.md` împarte implementarea frontend în taskuri mici, paralelizabile, fiecare cu fișiere probabile, endpoint-uri și criteriu de finalizare.
- Ce s-a decis atunci: folderul brut de frontend urma să fie folosit doar ca sursă de inspirație pentru UI-ul de login/register; nu se preia Firebase și nu se păstrează brandul vechi `AthleteAtlas`. Folderul a fost șters ulterior în sesiunea 2026-05-19.
- Următorul pas imediat: inițializarea folderului `frontend/` cu React + Vite, temă dark-only și structura `src/` descrisă în plan.

## Notă sesiune 2026-05-18 - frontend auth inițial

- Data: `2026-05-18`
- Ce s-a finalizat: a fost inițializat `frontend/` cu React + Vite, React Router, MUI, temă dark-only, client API central, stocare token JWT în `localStorage`, `AuthContext`, `ProtectedRoute`, pagină de login/register fără Firebase și un dashboard placeholder protejat.
- Ce s-a verificat: `npm run build` trece în `frontend/`, dev serverul răspunde pe `http://127.0.0.1:5173/login`, proxy-ul Vite trimite corect `/api/v1/*` către backend pe portul `5500`, iar `/api/v1/health` răspunde prin frontend.
- Limitare: verificarea vizuală în Browser-ul intern nu a putut fi rulată deoarece unealta `node_repl js` nu este disponibilă în sesiunea curentă; verificarea s-a făcut prin build și request-uri HTTP locale.
- Următorul pas imediat: test manual din browser pentru `register -> dashboard -> refresh -> logout -> login`, apoi implementarea layout-ului principal și a dashboardului cu status Gmail + sync manual.

## Notă sesiune 2026-05-18 - layout și dashboard Gmail

- Data: `2026-05-18`
- Ce s-a finalizat: frontend-ul are layout protejat cu sidebar/topbar, navigare către Dashboard, Emailuri, Rapoarte și Setări, pagini placeholder pentru ecranele următoare, componente comune pentru loading/error/empty și dashboard funcțional peste endpoint-urile `GET /api/v1/meta/status`, `GET /api/v1/mail-accounts`, `GET /api/v1/mail-accounts/google/start` și `POST /api/v1/mail-accounts/:id/sync`.
- Ce poate testa utilizatorul: după login, pagina Dashboard afișează contoare pentru conturi/emailuri/scanări, status Gmail, conectare Gmail și buton de sync manual pentru contul Gmail activ.
- Ce s-a verificat: `npm run build` trece în `frontend/`, rutele `/dashboard` și `/emails` sunt servite de Vite, proxy-ul frontend către backend răspunde la `/api/v1/health`, iar `/api/v1/meta/status` întoarce corect `401` fără token.
- Următorul pas imediat: implementarea listei de emailuri cu filtre după `riskBucket`, apoi detaliul emailului cu scanare, reguli, `aiExplanation` și acțiunile `mark-safe`/`mark-phishing`.

## Notă sesiune 2026-05-18 - ecrane frontend MVP

- Data: `2026-05-18`
- Ce s-a finalizat: au fost implementate lista de emailuri cu filtre `riskBucket`, căutare și paginare, detaliul emailului cu scanarea curentă, motive, reguli declanșate și `aiExplanation.summary`, acțiunile `mark-safe`, `mark-phishing` și rescan manual, pagina de rapoarte lunare cu trimitere digest manual și pagina Settings pentru profil, AI on/off și `syncMaxResults`.
- Ce s-a integrat: ruta protejată `/emails/:id` a fost montată în `App.jsx`, iar paginile folosesc API-urile frontend dedicate pentru `emails`, `scans`, `actions`, `reports`, `users` și `mailAccounts`.
- Ce s-a verificat: `npm run build` trece în `frontend/`; rutele `/emails`, `/emails/:id`, `/reports` și `/settings` sunt servite de Vite; proxy-ul către backend răspunde la `/api/v1/health`; endpoint-ul `/api/v1/emails` întoarce corect `401` fără token.
- Limitare: nu a fost rulat încă testul manual cap-coadă cu un utilizator autentificat și cont Gmail conectat.
- Următorul pas imediat: test manual complet `login -> dashboard -> connect/sync Gmail -> emails -> email detail -> mark-phishing -> reports -> settings`, apoi polish și documentarea pașilor de demo.

## Notă sesiune 2026-05-19 - polish frontend, avatar și contact suport

- Data: `2026-05-19`
- Ce s-a finalizat: frontend-ul a primit polish vizual pentru `XAI Phishing Shield`, tranziții între pagini cu `framer-motion`, charturi/statistici cu `recharts`, avatar utilizator în profil/topbar, drawer de chat/contact accesibil din topbar și status mai clar pentru trimiterea digestului lunar.
- Ce s-a adăugat în backend: `User.avatarDataUrl`, actualizare profil prin `PATCH /api/v1/users/me` cu `avatarDataUrl`, endpoint protejat `POST /api/v1/contact/message` și rută montată sub `/api/v1/contact`.
- Ce s-a păstrat: logica de phishing, Gmail sync, scorarea, AI-ul și acțiunile manuale existente nu au fost schimbate.
- Ce s-a verificat: `npm --prefix frontend run build -- --outDir /private/tmp/xai-licenta-frontend-build --emptyOutDir` trece, iar `npm --prefix backend run lint` trece.
- Limitare: nu a fost rulat încă testul vizual/manual cap-coadă în browser cu user real, Gmail conectat și email config complet.
- Următorul pas imediat: pornește backend-ul pe `5500`, frontend-ul Vite și rulează demo-ul `login -> avatar -> dashboard -> sync Gmail -> emails -> reports -> send digest -> chat contact`.

## Notă sesiune 2026-05-19 - polish UX layout și Gmail

- Data: `2026-05-19`
- Ce s-a finalizat: sidebar-ul desktop este collapsible și resizable, profilul + logout au fost mutate în sidebar, topbar-ul afișează doar titlul/subtitlul paginii plus butoanele Settings și chat, iar conținutul principal se extinde smooth când sidebar-ul se restrânge.
- Ce s-a ajustat în fluxul Gmail: Dashboard afișează conectarea Gmail doar când nu există cont conectat; când există cont activ, acțiunea principală este `Sincronizează și scanează`. Deconectarea contului Gmail se face acum din Settings prin `DELETE /api/v1/mail-accounts/:id`.
- Ce s-a îmbunătățit în UI: lista de emailuri are filtru după cont Gmail, ecranele folosesc mai bine lățimea disponibilă, enum-urile tehnice sunt mapate în texte lizibile, iar digestul lunar afișează destinatar, perioadă și sumar util în loc să scoată ID-uri tehnice în prim-plan.
- Ce s-a verificat: `npm --prefix frontend run build -- --outDir /private/tmp/xai-licenta-ui-pass-build --emptyOutDir` trece, `npm --prefix backend run lint` trece, rutele locale `/dashboard`, `/emails`, `/reports`, `/settings` răspund cu `200`, iar `/api/v1/health` răspunde cu `ok`.
- Limitare: verificarea vizuală completă cu un utilizator real și cont Gmail conectat rămâne de făcut manual în browser.
- Următorul pas imediat: rulează flow-ul demo cap-coadă și verifică în special sidebar resize/collapse, sync + scan, filtrul pe cont Gmail, deconectarea contului din Settings și trimiterea digestului.

## Notă sesiune 2026-05-19 - polish UX dashboard, rapoarte și settings

- Data: `2026-05-19`
- Ce s-a finalizat: `Topbar` a fost simplificat la acțiuni globale, controlul desktop pentru sidebar a rămas doar în sidebar cu icon de meniu, profilul din sidebar duce direct la secțiunea de profil din Settings, iar footerul sidebar afișează `XAI - toate drepturile rezervate`.
- Ce s-a îmbunătățit în dashboard: acțiunea principală `Sincronizează și scanează` este primul bloc important, statisticile sunt orientate pe emailuri de verificat, probabil phishing, phishing confirmat și acoperire scanare, iar chartul `Pipeline date` a fost înlocuit cu distribuția verdicturilor lunii curente.
- Ce s-a îmbunătățit în rapoarte/settings: Rapoarte și Settings folosesc full width, cardurile de raport au fost reduse la indicatorii principali, regulile frecvente sunt separate între euristici și semnale AI, iar charturile au animații mai fluide.
- Curățare repo: folderul istoric `frontent-raw/` a fost șters deoarece UI-ul final nu mai folosește Firebase sau brandul vechi `AthleteAtlas`.
- Următorul pas imediat: rulează verificarea vizuală cu frontend pornit și flow demo `login -> dashboard -> sync -> reports -> settings`.

## Notă sesiune 2026-05-27 - eliminare frontend și analiză backend

- Data: `2026-05-27`
- Ce s-a finalizat: folderul `frontend/` a fost șters intenționat, iar backend-ul a fost analizat pe fișiere, responsabilități, complexitate și endpoint-uri în `docs/BACKEND_REVIEW.md`.
- Ce s-a clarificat: backend-ul acoperă fluxul MVP principal, dar merită simplificate zonele `mail-account.service.js`, `scan.service.js`, `email.service.js`, endpoint-urile de tip `contact`, avatarul de profil și rutele care au fost adăugate mai mult pentru frontend-ul vechi.
- Următorul pas imediat: utilizatorul trebuie să decidă răspunsurile la întrebările din `docs/BACKEND_REVIEW.md`, apoi se poate trece la curățarea backend-ului în pași mici, fără reconstruirea frontend-ului încă.

## Notă sesiune 2026-06-02 - SecureInbox frontend și contract stabilizat

- Data: `2026-06-02`
- Ce s-a finalizat: contractul backend a fost aliniat pentru frontend (`syncMaxResults` 1..50 cu default 10, `Scan.engineVersion`, `Email.syncSource`, profil `name` only, Gmail callback redirect către frontend), iar frontend-ul `SecureInbox` a fost reconstruit cu React + Vite + MUI.
- Ce s-a adăugat: inbox pe 3 panouri, filtre de securitate, detaliu email, randare `htmlBody` sanitizată cu DOMPurify și blocare imagini remote, rapoarte, settings, teste unitare backend în `backend/tests/unit` și teste unitare frontend în `frontend/tests/unit`.
- Ce s-a verificat: `npm --prefix backend run lint`, `npm --prefix backend test`, `npm --prefix frontend test` și `npm --prefix frontend run build` trec.
- Următorul pas imediat: pornește backend-ul și frontend-ul local, apoi rulează testul manual cap-coadă cu Gmail conectat: `login -> connect Gmail -> sync -> inbox -> open email -> mark phishing -> reports`.

## Ce este gata

- documentul principal de context;
- planul de implementare;
- arhitectura backend recomandată;
- planul API;
- checklist-ul de teste manuale backend;
- documentul regulilor de phishing;
- notele de învățare;
- registrul de decizii;
- roadmap-ul proiectului;
- server Express inițial;
- separare `app.js` de `server.js`;
- backend izolat în `backend/`, cu runtime-ul în `backend/src/`;
- încărcare config din `dotenv`;
- conexiune MongoDB de bază;
- model `User` cu `passwordHash` și `role`;
- endpoint-uri funcționale pentru `register` și `login`; logout-ul este local în frontend prin ștergerea tokenului;
- middleware de auth și de erori;
- middleware minim pentru roluri;
- middleware de validare Joi pentru `register/login`;
- logică mutată din `controllers` în `services` pentru `auth` și `users`;
- endpoint `GET /api/v1/users/me`;
- endpoint `GET /api/v1/health`;
- restricționare endpoint-uri users pentru admin;
- UI temporar de test pentru auth;
- test manual reușit pentru `register`, `login`, `users/me` și persistență la refresh.
- strategie clară pentru auth MVP: `Bearer token` în header-ul `Authorization`;
- răspunsuri de eroare mai uniforme în middleware-uri și auth;
- script de bootstrap pentru primul admin;
- mutarea integrărilor opționale `Arcjet` și welcome email în `backend/extras/`.
- model `MailAccount` pentru Gmail;
- endpoint `GET /api/v1/mail-accounts/google/start`;
- endpoint `GET /api/v1/mail-accounts/google/callback`;
- endpoint `GET /api/v1/mail-accounts`;
- endpoint `DELETE /api/v1/mail-accounts/:id`;
- salvarea conexiunii Gmail în MongoDB după callback-ul Google.
- test manual reușit pentru conectarea unui cont Gmail din lista de test users Google.
- model `Email` pentru emailurile sincronizate;
- endpoint `POST /api/v1/mail-accounts/:id/sync`;
- sync Gmail manual pentru ultimele emailuri din inbox;
- prevenire duplicate prin index `userId + providerMessageId`;
- actualizare `lastSyncedAt` după fiecare sync;
- refresh automat pentru `accessToken` la răspuns `401` de la Gmail API.
- test manual reușit pentru fluxul API complet: `register -> login -> connect Gmail -> sync manual`.
- fetch Gmail message details în `format=full` pentru parsare;
- parser dedicat pentru emailuri, separat de serviciul de sync;
- extracție `replyTo`, `displayName`, `senderDomain`, `replyToDomain`;
- extracție `textBody` și `htmlBody`;
- extracție și analiză linkuri: `links`, `linkDomains`, `linkCount`, `hasShortenedUrl`, `suspiciousLinkPatterns`;
- extracție extensii de atașamente: `attachmentExtensions`.
- model `Scan` cu suport pentru verdict, reasons și `triggeredRules`;
- endpoint `POST /api/v1/scans/emails/:emailId` pentru scan manual;
- endpoint `GET /api/v1/scans/emails/:emailId/latest` pentru ultima scanare;
- endpoint `GET /api/v1/emails`;
- endpoint `GET /api/v1/emails/:id`;
- endpoint `GET /api/v1/emails/:id/raw`;
- endpoint `GET /api/v1/meta/status`;
- reguli euristice inițiale (`replyTo mismatch`, shorteners, link patterns, attachments, many links);
- mapare scor -> verdict (`safe`, `suspicious`, `likely_phishing`);
- helper dedicat pentru input AI pe text complet (`subject + textBody`, cu fallback).
- test manual reușit pentru `scan` și `latest`, inclusiv declanșare de reguli pe emailuri de test cu linkuri și arhive.
- flow unificat `sync -> scan` fără pas manual obligatoriu după sync;
- scanare automată după sync pentru emailuri noi;
- pentru emailuri `updated`, rescanare doar dacă lipsește scanarea curentă sau diferă `engineVersion`;
- scanare cu `upsert` pentru rezultat curent per email (fără creare repetată de istorice inutile);
- scanarea curentă este protejată la concurență prin index unic `userId + emailId` și upsert atomic;
- scriptul `npm run cleanup:duplicate-scans` rulat din `backend/` curăță duplicatele vechi înainte de construirea indexului unic în development;
- răspunsul de sync include acum sumar de scanare (`scanSummary`).
- erorile de sync sunt logate clar în backend și sunt întoarse controlat în `syncErrors`, cu limită pentru a evita răspunsuri foarte mari.
- integrare Ollama local în flow-ul de scanare, fără a schimba verdictul principal pe reguli;
- semnale AI semantice salvate în `aiSignals` (`urgencyLevel`, `sensitiveDataRequest`, `loginOrActionRequest`, `socialEngineeringLevel`, `brandImpersonationSuspected`);
- metadata de performanță AI salvată în scan (`status`, `model`, `promptVersion`, `latencyMs`, `evaluatedAt`);
- prompt semantic în engleză cu output JSON strict;
- explicație finală scurtă în română, salvată în `aiExplanation.summary`, în 1-3 fraze cu recomandare inclusă și metadata în `aiExplanationMeta`;
- fallback sigur dacă AI este dezactivat sau Ollama nu răspunde (`status: disabled/failed` în `aiSignals`).
- fallback de conectare Ollama pe host local (`127.0.0.1` / `localhost`) pentru a evita erori de rezoluție locală;
- clasificare mai clară a erorilor AI (`ollama_unreachable`, `ollama_timeout`, `ollama_invalid_output`) cu detalii de diagnostic.
- payload-ul trimis la Ollama a fost redus (body trunchiat + număr limitat de linkuri) pentru a scădea latența și a evita timeout-uri pe emailuri mari.
- tuning suplimentar pentru latență AI locală: input semantic mai scurt și limită de generare (`num_predict`) pentru răspuns JSON rapid.
- scor hibrid activ: `ruleScore + aiScore` (AI bonus limitat), iar verdictul folosește `finalScore`;
- `summary` din semnalele AI este cerut acum în română.
- modelul `qwen2.5:3b` s-a dovedit mai stabil decât `gemma3:4b` în testele locale inițiale pentru output semantic JSON și latență.
- explainability-ul în română folosește acum formulări mai naturale pentru verdict, nu etichete brute precum `suspicious` sau `likely_phishing`.
- scoring-ul MVP rulează fără allowlist/blocklist;
- endpoint `GET /api/v1/meta/status` întoarce un sumar per utilizator: număr de conturi conectate, emailuri, scanări și flag-uri utile pentru UI/debug;
- endpoint `GET /api/v1/reports/monthly-summary` întoarce sumarul lunar de phishing pentru utilizatorul autentificat, cu suport pentru `month=YYYY-MM`;
- endpoint `POST /api/v1/reports/monthly-summary/send` trimite manual digestul lunar pe emailul utilizatorului autentificat, cu template HTML în română și configurare prin `EMAIL_FROM`/`EMAIL_PASSWORD`;
- endpoint-uri locale pentru acțiuni manuale pe email:
  - `POST /api/v1/actions/emails/:id/mark-safe`
  - `POST /api/v1/actions/emails/:id/mark-phishing`
- câmpuri de review local salvate pe email: `userVerdict`, `reviewedAt`, `lastManualAction`;
- câmpuri de tracking pentru ultima acțiune provider-side pe email: `lastProviderAction`, `lastProviderActionStatus`, `lastProviderActionAt`, `lastProviderActionError`;
- `mark-phishing` încearcă mutarea mesajului Gmail în Spam doar după acțiunea explicită a utilizatorului și returnează `providerAction`;
- câmpuri derivate expuse în răspunsurile email: `reviewStatus`, `effectiveVerdict`, `verdictSource`, `isQuarantined`, `riskBucket`;
- filtre pentru `GET /api/v1/emails` bazate pe starea finală expusă UI-ului: `verdict` filtrează după `effectiveVerdict`, iar `riskBucket` filtrează după gruparea finală;
- `mark-phishing` salvează verdictul local înainte de acțiunea Gmail, deci eșecurile externe nu pierd `userVerdict: phishing`;
- setare locală `syncMaxResults` pe `MailAccount`, cu interval valid `1..50` și default `10`;
- profil utilizator minim cu `name`, `email`, `role` și `settings.aiEnabled`;
- endpoint protejat `POST /api/v1/contact/message`, care trimite mesajul de contact către `EMAIL_FROM`;
- endpoint `DELETE /api/v1/mail-accounts/:id` este folosit acum din Settings pentru deconectarea contului Gmail;
- emailurile cu `userVerdict` sunt sărite la auto-rescan în flow-ul de sync, indiferent de schimbări de model sau `engineVersion`;
- rutele `auth`, `users`, `mail-accounts`, `emails`, `meta`, `reports`, `scans`, `actions` și `contact` sunt montate în `app.js` sub prefixul `/api/v1`.
- frontend-ul `SecureInbox` este reconstruit în `frontend/` peste API-ul backend stabilizat.

## Ce NU este încă început

- verificări externe de reputație URL/domeniu.
- calibrare fină a punctajelor AI pe seturi mai mari de emailuri.
- filtre Gmail automate pentru emailuri viitoare.
- scheduler/cron pentru digest lunar automat.

## Unde am rămas exact

Ultimul lucru finalizat:

- frontend-ul `SecureInbox` a fost reconstruit și contractul backend necesar pentru el a fost stabilizat.

Următorul pas imediat recomandat:

- test manual complet cu backend, frontend, MongoDB și Gmail conectat.

## 2026-06-05 - Faza 18: redesign frontend profesional (implementat)

Ce s-a terminat:

- rebuild de la zero al frontend-ului cu **Tailwind CSS v4 + shadcn/ui**, temă dark-only, layout sidebar + dashboard-first;
- stratul `src/api/*`, `AuthContext`, `tokenStorage` și `sanitizeEmailHtml` au fost păstrate (logică dovedită);
- sursă unică pentru limbajul de risc în `src/lib/risk.js` (6 risk buckets, culori + iconițe);
- pagini noi: Login/Register (adaptat după `athlete_atlas`, fără Firebase), Dashboard (statistici + donut risc + mesaje de atenție), Inbox (filtre pe risk bucket + search), Email detail (verdict banner + scor + reguli + explicație AI + acțiuni review), Reports (sumar lunar + top reguli + statistici AI + trimitere digest), Settings (profil, Gmail connect/disconnect, AI on/off, alerts on/off, syncMaxResults, contact);
- shell aplicație: `AppShell` + `Sidebar` (brand, navigație, user + logout) + `Topbar` (titlu pagină, chip status Gmail, buton Sync & scan);
- context nou `MailAccountContext` pentru starea Gmail + sync partajat, cu `syncVersion` ca trigger de refetch;
- state-uri loading/empty/error unificate (`components/common/states.jsx`);
- teste unitare rescrise pentru componentele noi.

Verificat:

- `npm --prefix frontend run build` trece;
- `npm --prefix frontend test` — 18 teste, toate trec;
- dev server pornește și servește corect.

Următorul pas recomandat: test manual cap-coadă cu backend + MongoDB + Gmail real (login → connect Gmail → sync → vezi verdicte → mark-phishing → verificare în Gmail Spam), apoi capturi pentru prezentare.

## Blocaje

Nu există blocaje tehnice majore cunoscute pentru backend.

Rămân de finalizat:

- test manual cap-coadă cu Gmail real;
- scenariul de demo și capturile pentru prezentare;
- alegerea modelului Ollama final pentru demo, în funcție de latență și stabilitate locală.

## Notițe rapide pentru sesiunea următoare

- citește mai întâi `LICENTA.md`;
- verifică `TODO.md`;
- păstrează focusul pe MVP;
- păstrează naming-ul `register/login/logout`;
- păstrează sync-ul manual ca bază pentru validare;
- separă clar ce vine din reguli clasice și ce va veni mai târziu din semnale AI;
- folosește helperul de AI input cu text complet, nu doar `snippet`;
- tratează `scanSummary` din răspunsul de sync ca punct de verificare rapidă pentru flow-ul unificat;
- verifică variabilele de mediu pentru AI local: `AI_SEMANTIC_ENABLED`, `OLLAMA_BASE_URL`, `OLLAMA_MODEL`, `OLLAMA_TIMEOUT_MS`, `OLLAMA_PROMPT_VERSION`;
- verifică setarea per utilizator `settings.aiEnabled` prin `PATCH /api/v1/users/me/ai-settings`;
- compară local modelele după `latencyMs`, consum de RAM, consistența outputului JSON și stabilitatea pe același set de emailuri;
- folosește emailuri de test cu `Reply-To` diferit și text de presiune pentru validarea semnalelor AI viitoare;
- nu reconstrui frontend-ul până când nu este clarificat contractul API backend.
