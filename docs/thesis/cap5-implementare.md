# 5. IMPLEMENTAREA APLICAȚIEI

După proiectare, urmează construcția efectivă. În acest capitol parcurg implementarea pe componente, în ordinea în care un email le străbate: autentificarea care protejează totul, conectarea la Gmail, parsarea mesajelor, motorul de scor, stratul AI, straturile de context, automatizarea din fundal și, la final, interfața. Pentru părțile cheie includ fragmente scurte de cod, comentate; restul îl explic în cuvinte, pentru că nu codul în sine contează la o lucrare de licență, ci raționamentul din spatele lui.

Codul backend este scris în Node.js cu Express și organizat pe straturile descrise în 4.2. Frontend-ul este o aplicație React cu Vite. Toate fragmentele de mai jos sunt din codul real al aplicației.


## 5.1 Organizarea proiectului

Proiectul este împărțit în două directoare independente: `backend/` și `frontend/`. Backend-ul își ține codul sub `backend/src/`, cu câte un director pentru fiecare strat — `routes/`, `middlewares/`, `controllers/`, `services/`, `models/` — plus `config/` pentru variabilele de mediu și conexiuni, și `validations/` pentru schemele de verificare a datelor de intrare. Fiecare modul al aplicației (autentificare, conturi de mail, emailuri, scanări, acțiuni, rapoarte) apare consecvent în toate straturile: există un `auth.routes.js`, un `auth.controller.js`, un `auth.service.js`.

Această repetiție nu este redundanță, ci predictibilitate. Când caut logica de scanare, știu că este în `services/scan.service.js`, nu trebuie să o vânez. Pentru cineva care încă învață, o convenție clară valorează mai mult decât o structură inteligentă, dar greu de urmărit.


## 5.2 Autentificarea

Autentificarea rezolvă o singură întrebare: la fiecare cerere, cine este utilizatorul? Răspunsul folosește două mecanisme — parole stocate ca **hash** și **token-uri JWT**.

La înregistrare, parola nu este salvată niciodată în clar. Trece printr-o funcție de hash (bcrypt) cu un **salt** — un șir aleator care face ca două parole identice să producă hash-uri diferite:

```js
const salt = await bcrypt.genSalt(10);
const hashedPassword = await bcrypt.hash(password, salt);
await User.create({ name, email, passwordHash: hashedPassword, role: 'user' });
```

Hash-ul este ireversibil: din el nu se poate reface parola. La login, parola introdusă este hash-uită din nou și comparată cu cea salvată; dacă se potrivesc, aplicația **semnează un token JWT** care conține id-ul utilizatorului:

```js
const signToken = (userId) => jwt.sign({ userId }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
```

Token-ul este trimis apoi la fiecare cerere, în antetul `Authorization: Bearer <token>`. Un middleware îl verifică înainte ca cererea să ajungă la controller. Avantajul acestei scheme este că serverul rămâne **fără stare** (stateless): nu trebuie să țină minte sesiuni în memorie, ci doar să verifice semnătura token-ului. Nu există logout pe backend — frontend-ul pur și simplu șterge token-ul.

Rutele de autentificare au o protecție în plus: un middleware (arcjet) care limitează rata cererilor și blochează boții, ca un atacator să nu poată încerca mii de parole automat.


## 5.3 Integrarea cu Gmail

Conectarea la Gmail ridică o cerință delicată: aplicația trebuie să citească emailurile utilizatorului fără să îi ceară parola de Google. Soluția standard este **OAuth2**. Utilizatorul aprobă accesul direct la Google, iar aplicația primește în schimb niște **token-uri** (unul de acces, unul de reîmprospătare). Pentru a lega întoarcerea de la Google de utilizatorul corect, aplicația include în cererea de consimțământ un `state` — un JWT scurt, de 10 minute, care funcționează ca apărare împotriva atacurilor de tip CSRF.

Token-urile primite sunt cheile către cutia poștală a utilizatorului, deci nu pot sta în clar în baza de date. Le criptez cu **AES-256-GCM** înainte de salvare:

```js
const iv = crypto.randomBytes(12);
const cipher = crypto.createCipheriv('aes-256-gcm', getMailTokenEncryptionKey(), iv);
const encryptedValue = Buffer.concat([cipher.update(token, 'utf8'), cipher.final()]);
const authTag = cipher.getAuthTag();
return JSON.stringify({ v: 1, iv: iv.toString('base64'), tag: authTag.toString('base64'), data: encryptedValue.toString('base64') });
```

Două detalii contează aici. **IV-ul** (Initialization Vector) este o valoare aleatoare, unică la fiecare criptare, ceea ce face ca același token criptat de două ori să arate diferit. **Tag-ul de autentificare** produs de modul GCM permite ca, la decriptare, să se verifice dacă datele au fost alterate. Consecința practică: chiar dacă cineva ar fura baza de date, token-urile Gmail rămân ilizibile.

Sincronizarea propriu-zisă cere lista de mesaje din Inbox (limitată la un număr ales de utilizator), apoi detaliile fiecărui mesaj. Dacă token-ul de acces a expirat — Gmail răspunde cu `401` — aplicația îl reîmprospătează automat folosind token-ul de reîmprospătare și reia cererea, fără ca utilizatorul să observe ceva.

> `[ANDREI]` — la comisie poate apărea: „de ce criptezi token-urile, dacă baza de date e locală?" Răspunsul: un produs de securitate trebuie să presupună că baza de date poate fi compromisă; criptarea la repaus e o practică standard, nu un moft.


## 5.4 Parsarea emailului și extragerea semnalelor

Un mesaj brut de la Gmail este greu de analizat direct. De aceea, la sincronizare, fiecare mesaj trece printr-un parser care extrage informațiile utile și le salvează gata pregătite: expeditorul și domeniul lui, subiectul, corpul (text și HTML), atașamentele și linkurile.

Linkurile primesc un tratament aparte. O componentă dedicată le analizează și marchează **tiparele suspecte**: link către o adresă IP în loc de domeniu, domeniu scris în punycode (folosit pentru imitare vizuală, ca `paypaI.com`), credențiale incluse în URL (`user:parolă@site`), URL-uri neobișnuit de lungi și servicii de scurtare a linkurilor. Aceste tipare sunt salvate pe email, ca motorul de scor să nu mai aibă nevoie să reparseze nimic.

Decizia de a extrage totul **o singură dată**, la intrare, am explicat-o în 4.3. Efectul în implementare este că documentul de email ajunge să conțină câmpuri ca `senderDomain`, `linkCount`, `hasShortenedUrl` și `suspiciousLinkPatterns` — toate pre-calculate. Scanarea devine, astfel, doar aritmetică peste niște valori deja pregătite.


## 5.5 Motorul de reguli și verdictul

Motorul de scor este componenta centrală. El primește un email cu semnalele lui și produce un scor, un verdict și o listă de motive.

Regulile deterministe sunt aplicate prima dată. Fiecare regulă verifică un semnal salvat pe email și, dacă se declanșează, adaugă punctele ei fixe (definite în `scoring.config.js`). Apoi se adaugă scorul AI, dacă există. Scorul final respectă formula din proiectare, plafonată la 100:

```js
const finalScore = Math.min(SCORE_MAX, rulesResult.ruleScore + aiScoreResult.aiScore);
```

Traducerea scorului în verdict este o funcție scurtă, dar este, practic, decizia finală a aplicației:

```js
export const mapScoreToVerdict = (score) => {
    if (score >= RISK_THRESHOLDS.likelyPhishing) return 'likely_phishing'; // >= 60
    if (score >= RISK_THRESHOLDS.suspicious) return 'suspicious';          // >= 30
    return 'safe';
};
```

Rezultatul scanării este salvat în colecția `scans`, împreună cu versiunea motorului (`rules-ai-v7`). Versiunea este utilă pentru că, atunci când îmbunătățesc regulile, pot identifica scanările vechi care ar trebui refăcute, fără să le reprocesez orbește pe toate.


## 5.6 Stratul semantic Ollama și explicația

Regulile prind tiparele tehnice, dar nu „înțeleg" textul. Un email care spune politicos „vă rugăm să vă confirmați datele în 24 de ore" nu conține niciun link suspect, totuși este alarmant. Aici intervine stratul semantic, activat opțional de utilizator.

Când AI-ul este pornit, emailul este trimis unui model local rulat prin Ollama (implicit `gemma3:4b`). Modelului i se cere un **JSON strict** cu semnale, nu un text liber:

```text
"urgencyLevel": "none|low|medium|high",
"sensitiveDataRequest": true|false,
"loginOrActionRequest": true|false,
"socialEngineeringLevel": "none|low|medium|high",
"brandImpersonationSuspected": true|false
```

Cererea unui JSON cu formă fixă este o decizie de implementare importantă: un model de limbaj tinde să „povestească", iar un răspuns în formă liberă ar fi greu de transformat în puncte. Cerând o structură strictă, pot parsa răspunsul sigur — și, dacă modelul tot greșește forma, aplicația cade pe o valoare implicită neutră în loc să se blocheze. Semnalele devin apoi puncte, însumate în `aiScore` și plafonate la 50, conform invariantei a treia.

Separat, o a doua componentă produce **explicația în limbaj natural** afișată utilizatorului. Dacă AI-ul este disponibil, el reformulează motivele tehnice într-un text prietenos; dacă nu (AI dezactivat sau eșuat), o componentă de rezervă construiește o explicație **controlată**, direct din regulile declanșate. Aplicația nu rămâne niciodată fără explicație — cerința de explicabilitate din 4.1 este respectată în ambele cazuri.

> `[ANDREI]` — adaugă o observație proprie despre Ollama: cât de bine s-a descurcat `gemma3:4b` în practică? Unde a greșit? O observație onestă despre limitele modelului impresionează mai mult decât o laudă.


## 5.7 Straturile de context: brand verificat și liste

Peste reguli și AI rulează cele două straturi proiectate în 4.5. Implementarea lor respectă o regulă strictă: ele pot **reduce** punctele unui semnal, niciodată să le crească (singura excepție fiind blocarea explicită).

Verificarea de brand compară domeniul real al expeditorului cu o listă de domenii oficiale cunoscute, potrivirea fiind pe **sufix** — `mail.paypal.com` este acceptat ca PayPal, dar `paypal.com.evil.com` nu. Când potrivirea reușește, niște multiplicatori reduc semnalele tipice mailului de brand legitim, lăsând intacte semnalele periculoase.

Listele utilizatorului se aplică la sfârșit. Un expeditor de pe allowlist primește reduceri similare; unul de pe blocklist primește exact 60 de puncte, garantând verdictul de phishing. Când ambele straturi s-ar aplica unui același semnal, motorul folosește multiplicatorul **minim** — adică reducerea cea mai puternică — ca cele două straturi să nu se anuleze reciproc.


## 5.8 Automatizarea: sync programat, alerte, digest

Cerința coordonatorului a fost ca protecția să funcționeze fără ca utilizatorul să deschidă aplicația. Am rezolvat-o cu `node-cron`, o bibliotecă ce rulează sarcini după un orar. La pornirea serverului se înregistrează două asemenea sarcini:

```js
cron.schedule(syncCron, async () => {        // la fiecare 15 minute (implicit)
    await runAutoSyncForAllUsers();
});
cron.schedule('0 * * * *', async () => {     // din oră în oră, la minutul 0
    await runDailyDigestForHour(new Date().getUTCHours());
});
```

Prima sarcină rulează la fiecare 15 minute și sincronizează automat toate conturile Gmail active, scanând emailurile noi. Dacă în urma sincronizării apare un email `likely_phishing` și utilizatorul are alertele activate, i se trimite imediat un email de avertizare. A doua sarcină rulează din oră în oră și trimite rezumatul zilnic utilizatorilor a căror oră aleasă coincide cu ora curentă.

Erorile din interiorul acestor sarcini sunt prinse local: dacă un cont eșuează la sincronizare, sarcina continuă cu celelalte, iar serverul nu cade. Am explicat în 4.6 de ce am ales `node-cron` în locul notificărilor push de la Gmail.


## 5.9 Interfața (frontend)

Frontend-ul este construit în React și consumă exclusiv datele calculate de backend — nu duplică logica de phishing. Afișează `riskBucket`, `effectiveVerdict` și motivele primite prin API.

Două pagini concentrează experiența. **Tabloul de bord** oferă imaginea de ansamblu pe un interval de timp ales: postura de securitate, statistici, evoluția amenințărilor și cele mai frecvente semnale de risc. **Pagina de detaliu a unui email** arată verdictul cu un inel de scor colorat, un avertisment pentru emailurile riscante și panoul cu regulile declanșate, traduse în limbaj uman.

Un aspect de implementare ține de siguranță: corpul HTML al emailului este **curățat** de scripturi înainte de afișare, iar imaginile externe sunt blocate. Linkurile nu se deschid la click — sunt afișate ca text, cu un buton de copiere. Astfel, utilizatorul vede pericolul fără să-l declanșeze: simpla deschidere a unui email periculos nu confirmă adresa către atacator și nu execută cod.

> `[FIGURĂ 5.1]` — captură de ecran cu pagina de detaliu a unui email `likely_phishing` (inelul de scor, avertismentul, panoul de reguli). Capturile reale le pui tu din aplicație.

> `[ANDREI]` — opțional: o frază despre ce a fost mai greu pe frontend (ex. curățarea HTML-ului fără să strici aspectul emailului legitim).
