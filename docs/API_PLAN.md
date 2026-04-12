# API_PLAN

## Scop

Acest document descrie endpoint-urile principale planificate pentru MVP. Nu toate trebuie implementate imediat, dar structura lor trebuie păstrată coerentă.

Prefix recomandat pentru API:

`/api/v1`

## Principii pentru API

- Endpoint-urile trebuie grupate pe module.
- Rutele trebuie să fie clare și previzibile.
- Se evită endpoint-uri foarte generice care fac prea multe lucruri.
- Răspunsurile trebuie să fie simple și ușor de consumat.

## Auth

| Metodă | Rută | Scop | Input principal | Output principal | Auth |
| --- | --- | --- | --- | --- | --- |
| `POST` | `/api/v1/auth/register` | Creează cont nou | `name`, `email`, `password` | user minim + token sau mesaj de succes | Nu |
| `POST` | `/api/v1/auth/login` | Autentifică utilizatorul | `email`, `password` | token JWT + user minim | Nu |
| `POST` | `/api/v1/auth/logout` | Închide sesiunea în client | fără body | mesaj de succes | Nu |

## Users

| Metodă | Rută | Scop | Input principal | Output principal | Auth |
| --- | --- | --- | --- | --- | --- |
| `GET` | `/api/v1/users/me` | Profil utilizator | fără body | date profil | Da |
| `PATCH` | `/api/v1/users/me` | Actualizează setări simple | câmpuri editabile | utilizator actualizat | Da |

## Mail Accounts

| Metodă | Rută | Scop | Input principal | Output principal | Auth |
| --- | --- | --- | --- | --- | --- |
| `GET` | `/api/v1/mail-accounts/google/start` | Generează URL-ul pentru conectarea Gmail | fără body | `authUrl` | Da |
| `GET` | `/api/v1/mail-accounts/google/callback` | Procesează întoarcerea de la Google | query `code`, `state` | cont conectat | Nu |
| `GET` | `/api/v1/mail-accounts` | Listează conturile conectate | fără body | listă conturi | Da |
| `POST` | `/api/v1/mail-accounts/:id/sync` | Rulează sync manual pentru contul conectat și declanșează scanarea automată | param `id` | raport sync (`fetched`, `inserted`, `updated`, `skipped`) + `scanSummary` | Da |
| `DELETE` | `/api/v1/mail-accounts/:id` | Deconectează contul | param `id` | mesaj de succes | Da |

## Emails

| Metodă | Rută | Scop | Input principal | Output principal | Auth |
| --- | --- | --- | --- | --- | --- |
| `GET` | `/api/v1/emails` | Listează emailurile salvate | query pentru filtrare și paginare | listă emailuri | Da |
| `GET` | `/api/v1/emails/:id` | Detalii email | param `id` | email detaliat | Da |
| `GET` | `/api/v1/emails/:id/raw` | Returnează varianta brută sau aproape brută | param `id` | conținut email | Da |

## Scans

| Metodă | Rută | Scop | Input principal | Output principal | Auth |
| --- | --- | --- | --- | --- | --- |
| `POST` | `/api/v1/scans/emails/:emailId` | Scanează manual un email (update scanarea curentă) | param `emailId` | `score`, `ruleScore`, `aiScore`, verdict, motive + `aiSignals` + `aiExplanation` | Da |
| `GET` | `/api/v1/scans/emails/:emailId/latest` | Scanarea curentă pentru email | param `emailId` | rezultat scan complet (inclusiv scor hibrid și AI) | Da |
| `GET` | `/api/v1/scans/:id` | Detalii scanare | param `id` | scan complet | Da |

## Actions

| Metodă | Rută | Scop | Input principal | Output principal | Auth |
| --- | --- | --- | --- | --- | --- |
| `POST` | `/api/v1/actions/emails/:emailId/mark-safe` | Marchează emailul ca sigur | param `emailId`, eventual notă | status acțiune | Da |
| `POST` | `/api/v1/actions/emails/:emailId/block-sender` | Adaugă expeditorul în blocklist local | param `emailId` | status acțiune + intrare listă | Da |
| `POST` | `/api/v1/actions/emails/:emailId/move-to-spam` | Mută emailul în spam/junk unde este posibil | param `emailId` | status acțiune | Da |

## Lists

| Metodă | Rută | Scop | Input principal | Output principal | Auth |
| --- | --- | --- | --- | --- | --- |
| `GET` | `/api/v1/lists` | Listează intrările din allowlist și blocklist | query `type` | listă intrări | Da |
| `POST` | `/api/v1/lists` | Creează intrare nouă | `type`, `value`, `scope`, `note` | intrare creată | Da |
| `DELETE` | `/api/v1/lists/:id` | Șterge o intrare | param `id` | mesaj de succes | Da |

## Endpoint-uri utile de suport

| Metodă | Rută | Scop | Input principal | Output principal | Auth |
| --- | --- | --- | --- | --- | --- |
| `GET` | `/api/v1/health` | Verifică dacă serverul rulează | fără body | status simplu | Nu |
| `GET` | `/api/v1/meta/status` | Status aplicație și informații utile | fără body | stare generală | Da |

## Format simplu recomandat pentru răspunsuri

Exemplu pentru răspuns reușit:

```json
{
  "success": true,
  "data": {}
}
```

Exemplu pentru eroare:

```json
{
  "success": false,
  "message": "Mesaj clar de eroare"
}
```

## Observații importante

- Pentru MVP, strategia aleasă este `Bearer token` trimis în header-ul `Authorization`.
- `logout` nu invalidează tokenul pe server, ci doar cere clientului să șteargă tokenul salvat local.
- Endpoint-ul pentru utilizatorul curent rămâne doar `GET /api/v1/users/me`.
- Flow-ul Gmail actual este bazat pe `google/start -> google/callback`.
- Pentru sync-ul manual Gmail se folosește `POST /api/v1/mail-accounts/:id/sync`.
- Sync-ul manual Gmail salvează și câmpuri parse-ate utile pentru scanare (`replyTo`, corp text/html, linkuri, domenii, extensii atașamente).
- După sync, scanarea pornește automat în backend:
  - emailurile noi sunt scanate;
  - emailurile actualizate sunt rescannate doar dacă nu există scanare curentă validă sau s-a schimbat `engineVersion`.
- Răspunsul de sync include `scanSummary` cu numărul de emailuri scanate, sărite și eșuate la scanare.
- `google/start` este protejat cu JWT-ul aplicației, iar `google/callback` se bazează pe `state`, nu pe header-ul `Authorization`.
- `move-to-spam` rămâne condiționat de ce permite providerul.
- `mail-accounts` trebuie gândit astfel încât să poată primi și alți provideri în viitor, fără a complica MVP-ul acum.
- Endpoint-urile de scanare trebuie să poată returna clar:
  - scorul;
  - verdictul;
  - motivele;
  - regulile declanșate.
- Pentru explainability AI, inputul pregătit trebuie să folosească textul relevant complet (`subject + textBody`, cu fallback), nu doar `snippet`.
- AI semantic este rulat local prin Ollama (`/api/chat`) cu prompt în engleză și output JSON strict.
- `aiSignals` trebuie să includă și metadata de execuție: `status`, `model`, `promptVersion`, `latencyMs`, `evaluatedAt`.
- la eșec AI, `aiSignals` poate include și câmpuri de diagnostic (`endpoint`, `errorDetail`) pentru debugging local.
- pentru stabilitate și latență mai bună, inputul AI este limitat (body trunchiat + subset de linkuri) înainte de request.
- requestul AI folosește răspuns JSON și limită de generare pentru a evita blocaje la inferență locală.
- `summary` din semnalele AI este cerut în română pentru consistență cu explainability-ul afișat utilizatorului.
- `aiExplanation` este compusă controlat în backend, în română; nu este text liber generat direct de model.
- Variabile de mediu recomandate pentru integrarea locală AI:
  - `AI_SEMANTIC_ENABLED`
  - `OLLAMA_BASE_URL`
  - `OLLAMA_MODEL`
  - `OLLAMA_TIMEOUT_MS`
  - `OLLAMA_PROMPT_VERSION`
