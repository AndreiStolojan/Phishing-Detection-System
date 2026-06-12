# DEPLOYMENT

A step-by-step guide to deploy SecureInbox (backend + frontend + Ollama) to a single
low-cost VPS using GitHub Student Pack credits, with MongoDB hosted on Atlas's free
tier. Every step says **what to click/type, what to pick, and why**.

Steps marked **YOU DO THIS (browser)** create external accounts/resources — nothing in
this repo does this for you, and none of it should cost money if you pick the options
listed. Steps marked **(terminal)** are commands you run, either on your own machine or
over SSH on the droplet (noted in each case).

## Architecture (what we're building)

```
Internet
   │
   ▼
Caddy (TLS cert + reverse proxy)
   ├── /api/*  → backend  (Express, port 5500)
   └── /*      → frontend (nginx, built Vite app)

backend → ollama (gemma3:4b, internal only — not exposed to the internet)
backend → MongoDB Atlas (M0, managed, lives outside the droplet)
```

One droplet runs four containers via Docker Compose (`docker-compose.yml` at the repo
root): `caddy`, `backend`, `frontend`, `ollama`. MongoDB is **not** a container — it
runs on Atlas's free M0 tier so the droplet's RAM is free for Ollama.

- **Droplet size**: 8GB RAM / 4 vCPU (≈ $48/mo) — needed for `gemma3:4b` (~3.3GB model)
  to run alongside the app containers without swapping. The $200 Student Pack credit
  covers ~4 months at this size.
- **If you'd rather stretch the credit further (~16 months)**: pick a 2GB droplet
  (~$12/mo), set `AI_SEMANTIC_ENABLED=false` in the backend env, and don't start the
  `ollama` service. Keep using Ollama locally for AI explanations during development.
  This guide assumes the 8GB option; the 2GB variant is called out where it differs.

---

## Phase 0 — accounts and external resources (YOU DO THIS)

Do these once, in order. Keep a scratch note open — you'll collect 5–6 values
(connection string, secrets, domain) that go into config files in Phase 2.

### 0.1 Confirm GitHub Student Developer Pack is active

1. Go to https://education.github.com/pack while logged into the GitHub account
   linked to your school email.
2. If it shows "Your benefits" with a list of partner offers, you're verified —
   continue. If it asks you to apply, follow the prompts (school email + ID/proof);
   approval can take from minutes to a few days, so do this first if unsure.

### 0.2 DigitalOcean — redeem the $200 credit and create the droplet

1. From the Student Pack page (0.1), find **DigitalOcean** in the offer list and
   click it — this takes you to a DigitalOcean signup page with the credit
   pre-attached. Sign up with your GitHub/school email.
2. **Why DigitalOcean and not, say, Azure**: DO's interface is simpler for a single
   Docker Compose droplet, and $200 at $48/mo gives a comfortable ~4 months — enough
   for the thesis demo period and beyond.
3. **Write down the date** — the credit typically expires 12 months after this step.
   Set a personal reminder before that date so you're not surprised by a real charge.
4. Once logged into the DO dashboard: click **Create → Droplets**.
5. **Choose an image**: "Ubuntu" → **Ubuntu 24.04 (LTS) x64**. *Why*: long-term support,
   widest Docker documentation, what the install commands below assume.
6. **Choose a plan**: under "Droplet Type" pick **Basic**, under "CPU options" pick
   **Regular (Disk type: SSD)**, then pick the **8 GB RAM / 4 vCPU / 160 GB SSD**
   option (~$48/mo). *Why*: this is the smallest tier that comfortably runs
   `gemma3:4b` alongside the app. (If you decided on the 2GB path instead, pick the
   **2 GB RAM / 1 vCPU** option, ~$12/mo, and skip Ollama entirely — see the note in
   "Architecture" above.)
7. **Choose a datacenter region**: pick the one geographically closest to you (e.g.
   **Frankfurt** if you're in Romania). *Why*: lower latency for you when testing/demoing;
   doesn't materially affect Atlas connectivity.
8. **Authentication**: choose **SSH Key**. If you don't have one yet, on your own
   machine (terminal):
   ```bash
   ssh-keygen -t ed25519 -C "secureinbox-deploy"
   ```
   Press enter through the prompts (default file location, empty passphrase is fine
   for a throwaway deploy key, or set one if you prefer). Then print the public key:
   ```bash
   cat ~/.ssh/id_ed25519.pub
   ```
   Paste that into DO's "New SSH Key" box. *Why SSH key over password*: it's the
   default-secure option and avoids a password ever existing for root.
9. **Hostname**: leave default or set something memorable like `secureinbox`. Click
   **Create Droplet**.
10. Wait ~1 minute, then copy the droplet's **public IPv4 address** from the DO
    dashboard — you'll need it repeatedly below.

### 0.3 MongoDB Atlas — free M0 cluster

1. Go to https://www.mongodb.com/cloud/atlas/register and create a free account
   (no credit card required for M0).
2. You'll be prompted to create an organization/project — accept the defaults or
   name it `secureinbox`.
3. Click **Build a Database**. On the tier selection screen, choose **M0 (Free)**.
   *Why*: M0 gives 512MB storage and is free forever — more than enough for a
   thesis-scale dataset, and removes the need to run/maintain Mongo yourself.
4. **Provider/Region**: pick **AWS** and the region closest to your droplet (e.g.
   `eu-central-1 (Frankfurt)` if your droplet is also in Frankfurt). *Why*: keeping
   the DB and the app in the same region minimizes latency on every query.
5. **Cluster name**: leave default (`Cluster0`) or rename to `secureinbox`. Click
   **Create**.
6. You'll be prompted to **create a database user** — choose "Username and Password",
   pick a username (e.g. `secureinbox`) and click "Autogenerate Secure Password".
   **Copy this password now** — it's shown once. *Why*: this is the credential your
   backend uses to connect; Atlas needs at least one DB user to allow any connection.
7. **Network Access**: you'll be asked to add an IP address that's allowed to connect.
   For simplicity, click **Add a Different IP Address**, enter `0.0.0.0/0`
   (Allow Access from Anywhere), and confirm. *Why this is acceptable here*: the
   connection still requires the username/password from step 6 — `0.0.0.0/0` just
   means "any IP can attempt to authenticate", which is the same exposure as any
   public website's login form. If you want to tighten this later, replace it with
   your droplet's IP from 0.2.10.
8. Once the cluster is created (takes ~1–3 minutes), click **Connect** → **Drivers**
   → choose **Node.js**. Copy the connection string shown — it looks like:
   ```
   mongodb+srv://secureinbox:<password>@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority
   ```
   - Replace `<password>` with the password from step 6.
   - Add a database name before the `?`, e.g. `.../secureinbox?retryWrites=true...`
     so all collections live in a `secureinbox` database, not Atlas's default.
   - **Save this full string** — it's your `DB_URI` for Phase 2.

### 0.4 Domain name

1. From the Student Pack page (0.1), look for a domain offer — historically
   **Namecheap** or **Name.com**, giving a free `.me` or `.tech` domain for ~1 year.
   If you don't see one, you can also use any domain you already own, or buy one
   (~$10–20/yr) from any registrar — the steps below are the same regardless of
   registrar.
2. Register a domain, e.g. `secureinbox-andrei.me`.
3. In that registrar's **DNS management / Advanced DNS** page, add a record:
   - **Type**: `A`
   - **Host**: `@` (means the root domain, i.e. `secureinbox-andrei.me` itself — use
     `app` instead if you'd rather use `app.secureinbox-andrei.me`)
   - **Value**: the droplet's public IPv4 from step 0.2.10
   - **TTL**: leave as "Automatic"
4. **Save this domain name** — it's your `DOMAIN` for Phase 2.
5. DNS changes can take anywhere from a couple of minutes to ~30 minutes (rarely
   longer) to propagate. You can check with (on your own machine):
   ```bash
   nslookup yourdomain.com
   ```
   It should eventually return the droplet's IP. Don't proceed to Phase 3 (starting
   Caddy) until this resolves correctly, or Caddy's HTTPS certificate request will
   fail.

### 0.5 Google Cloud Console — add the new redirect URI

You already have a Google OAuth client (the existing `GOOGLE_CLIENT_ID` /
`GOOGLE_CLIENT_SECRET` your dev setup uses for Gmail).

1. Go to https://console.cloud.google.com/apis/credentials and select the project
   used by SecureInbox.
2. Click your existing **OAuth 2.0 Client ID** (the one used for Gmail access).
3. Under **Authorized redirect URIs**, click **Add URI** and add:
   ```
   https://yourdomain.com/api/v1/mail-accounts/google/callback
   ```
   (replace `yourdomain.com` with your real domain from 0.4). Keep the existing
   `http://localhost:5500/...` entry too — you still need it for local dev. Click
   **Save**.
4. In the left sidebar, go to **OAuth consent screen**. Since this app is in
   **Testing** mode (not verified by Google — see `docs/PROJECT_STATE.md`), scroll to
   **Test users** and confirm your Google account is listed. If not, click **Add
   Users** and add it. *Why this matters*: in Testing mode, only accounts on this
   list can complete the Gmail OAuth flow — anyone else gets an "access blocked"
   error, which is expected and fine for a thesis demo.

### 0.6 Email sending credentials (digest / contact form)

If your dev `.env.development.local` already has working `EMAIL_FROM` /
`EMAIL_PASSWORD` (e.g. a Gmail address + app password), you can reuse the same
values in production — skip this step. Otherwise, if `EMAIL_FROM` is a Gmail address:

1. Go to https://myaccount.google.com/security
2. Enable **2-Step Verification** if not already on.
3. Go to **App passwords** (search for it in the security page's search box), choose
   app "Mail", device "Other", name it `secureinbox-prod`, and click **Generate**.
4. Copy the 16-character password shown — this is your `EMAIL_PASSWORD`. Use the
   Gmail address itself as `EMAIL_FROM`.

---

## Phase 1 — prepare the droplet (terminal, on the droplet)

1. SSH into the droplet using the IP from 0.2.10:
   ```bash
   ssh root@YOUR_DROPLET_IP
   ```
2. Install Docker Engine + the Compose plugin using Docker's official convenience
   script:
   ```bash
   curl -fsSL https://get.docker.com | sh
   ```
   *Why this script*: it's the officially documented way to get a current Docker +
   `docker compose` on Ubuntu in one step, avoiding distro-package version drift.
3. Set up the firewall — allow only SSH, HTTP, and HTTPS:
   ```bash
   ufw allow OpenSSH
   ufw allow 80,443/tcp
   ufw enable
   ```
   Type `y` to confirm. *Why*: this blocks every other port from the internet,
   including Mongo (not relevant here since Mongo is on Atlas) and Ollama's port
   11434 (which Docker Compose keeps internal anyway, but the firewall is a second
   layer of defense).

---

## Phase 2 — get the code and fill in configuration

1. Still on the droplet (terminal):
   ```bash
   git clone <your repo URL> secureinbox
   cd secureinbox
   ```
2. **Root `.env`** (tells Caddy which domain to issue a certificate for):
   ```bash
   cp .env.example .env
   nano .env
   ```
   Set:
   ```
   DOMAIN=yourdomain.com
   ```
   using the domain from 0.4. Save with `Ctrl+O`, Enter, then exit with `Ctrl+X`.

3. **Backend env** — copy the template:
   ```bash
   cp backend/.env.production.local.example backend/.env.production.local
   nano backend/.env.production.local
   ```
   Fill in each value. Here's what each one is and where it comes from:

   | Variable | What to put | Where it comes from |
   |---|---|---|
   | `PORT` | `5500` | leave as-is — internal port, Caddy proxies to it |
   | `NODE_ENV` | `production` | leave as-is |
   | `DB_URI` | the full connection string | Phase 0.3, step 8 |
   | `JWT_SECRET` | a long random string | generate with `openssl rand -hex 32` (run this in the terminal, paste the output) |
   | `JWT_EXPIRES_IN` | `7d` | leave as-is, or your preferred session length |
   | `MAIL_TOKEN_ENCRYPTION_KEY` | another long random string | generate with `openssl rand -hex 32` again (must be **different** from `JWT_SECRET`) |
   | `GOOGLE_CLIENT_ID` | same value as your dev `.env` | copy from `backend/.env.development.local` |
   | `GOOGLE_CLIENT_SECRET` | same value as your dev `.env` | copy from `backend/.env.development.local` |
   | `GOOGLE_REDIRECT_URI` | `https://yourdomain.com/api/v1/mail-accounts/google/callback` | your domain (0.4) — **must match exactly** what you added in Google Cloud Console (0.5) |
   | `FRONTEND_APP_URL` | `https://yourdomain.com` | your domain (0.4) — used for CORS, must match the URL the browser actually uses |
   | `ARCJET_KEY` | same value as dev, or leave blank | from `backend/.env.development.local` (optional — disables bot/rate-limit protection if blank) |
   | `ARCJET_ENV` | `production` | leave as-is |
   | `EMAIL_FROM` | your sending email address | Phase 0.6 |
   | `EMAIL_PASSWORD` | the app password | Phase 0.6 |
   | `SUPPORT_EMAIL` | your email | shown to users on error pages / contact form |
   | `AI_SEMANTIC_ENABLED` | `true` (or `false` for the 2GB path) | see "Architecture" note above |
   | `OLLAMA_BASE_URL` | `http://ollama:11434` | leave as-is — `ollama` is the container name on the Docker network |
   | `OLLAMA_MODEL` | `gemma3:4b` | leave as-is unless you chose a smaller model |
   | `OLLAMA_TIMEOUT_MS` | `45000` | leave as-is; raise if you see AI timeouts under load |
   | `OLLAMA_PROMPT_VERSION` | same value as dev, or leave blank | from `backend/.env.development.local` |
   | `SYNC_INTERVAL_MINUTES` | `15` | leave as-is, or your preferred auto-sync cadence |
   | `ADMIN_NAME` / `ADMIN_EMAIL` / `ADMIN_PASSWORD` | optional | only needed if you run `npm run bootstrap:admin` in production |

   Save (`Ctrl+O`, Enter) and exit (`Ctrl+X`).

4. Double check neither `.env` nor `backend/.env.production.local` will be committed:
   ```bash
   git status
   ```
   Both should be absent from the output (they're covered by `.gitignore`). If either
   shows up as untracked-but-about-to-be-added, **do not `git add` them**.

---

## Phase 3 — build and start the containers (terminal, on the droplet)

1. Build all images (first time only — this compiles the backend, builds the frontend
   bundle, and pulls the `caddy`/`ollama` base images). This can take 5–10 minutes:
   ```bash
   docker compose build
   ```
2. Start everything in the background:
   ```bash
   docker compose up -d
   ```
   *What this does*: starts `caddy`, `backend`, `frontend`, `ollama` as long-running
   containers, networked together, with `restart: unless-stopped` so they come back
   after a reboot.
3. **If `AI_SEMANTIC_ENABLED=true`**, download the Ollama model (one-time, ~3.3GB —
   takes a few minutes depending on the droplet's bandwidth):
   ```bash
   docker compose exec ollama ollama pull gemma3:4b
   ```
4. **If you chose the 2GB / `AI_SEMANTIC_ENABLED=false` path**, remove the now-unused
   `ollama` service so it doesn't reserve resources:
   - In `docker-compose.yml`, delete the `ollama:` service block, the `depends_on:
     ollama` line under `backend`, and `ollama_data:` from `volumes:`.
   - In `docker-compose.yml`, remove the `OLLAMA_BASE_URL` override under
     `backend.environment` (the value from `.env.production.local` will simply be
     unused since `AI_SEMANTIC_ENABLED=false` skips Ollama calls entirely).
   - Re-run `docker compose up -d` after editing.
5. Caddy needs DNS to already point at this droplet (Phase 0.4) before it can get a
   certificate. Give it ~1 minute after `docker compose up -d`, then check logs:
   ```bash
   docker compose logs caddy --tail=50
   ```
   You're looking for a line mentioning `certificate obtained successfully`. If you
   instead see DNS or timeout errors, re-check that `nslookup yourdomain.com` (from
   0.4) resolves to this droplet's IP, then run `docker compose restart caddy`.

---

## Phase 4 — verify it works

From your own machine (browser or terminal):

- `https://yourdomain.com/api/v1/health` should return:
  ```json
  {"success":true,"data":{"status":"ok"}}
  ```
- `https://yourdomain.com/` should load the SecureInbox login page with a valid
  HTTPS padlock (no certificate warning).
- Register a new account, log in, go to Settings → connect Gmail. The OAuth flow
  should redirect to Google and back to `yourdomain.com` without errors (assuming
  your account is a Test User per 0.5.4).
- Trigger a manual sync and confirm emails appear with scan verdicts. Check for
  errors with:
  ```bash
  docker compose logs backend --tail=100
  ```

---

## Rollback / cleanup

- **Stop everything** (keeps data — Ollama model, Caddy certificates, your code):
  ```bash
  docker compose down
  ```
- **Full reset** (also deletes the downloaded Ollama model and TLS certs — next
  `up` will re-download/re-issue them):
  ```bash
  docker compose down -v
  ```
- **Roll back to a previous version of the app**:
  ```bash
  git log --oneline          # find the commit you want
  git checkout <commit-hash>
  docker compose up -d --build
  ```
- **Decommission everything** (no more cost, no leftover resources):
  1. DigitalOcean dashboard → Droplets → your droplet → **Destroy**.
  2. Atlas dashboard → your cluster → **...** menu → **Terminate**.
  3. Your domain registrar's DNS page → delete the `A` record (or let the domain
     expire if it was the free Student Pack one and you no longer need it).
  4. Google Cloud Console → Credentials → remove the production redirect URI added
     in 0.5 (optional — harmless to leave, but tidy).
  - Your MongoDB data lives on Atlas independently of the droplet — destroying the
    droplet alone does **not** delete your data.

---

## Updating after a code change

```bash
ssh root@YOUR_DROPLET_IP
cd secureinbox
git pull
docker compose up -d --build backend     # if backend/ changed
docker compose up -d --build frontend    # if frontend/ changed
```
`caddy` and `ollama` don't need rebuilding for app code changes. If you only changed
`backend/.env.production.local`, no rebuild is needed — just
`docker compose up -d backend` to restart it with the new values.

---

## What to watch out for

- **DigitalOcean credit expiry** — note the date from 0.2.3; billing switches to your
  card automatically afterwards. Set a calendar reminder ~1 week before.
- **Atlas M0 limits** — 512MB storage, no automated backups. Fine for thesis-scale
  data; if you outgrow it, Atlas prompts you to upgrade (a paid action — do not click
  through without thinking about it).
- **Ollama RAM** — if `docker compose logs backend` shows Ollama timeouts under load,
  the droplet is likely swapping; either resize the droplet (DO dashboard → droplet →
  Resize, a paid/billed action) or set `AI_SEMANTIC_ENABLED=false`.
- **Google OAuth "Testing" mode** — only accounts explicitly added as test users
  (0.5.4) can connect Gmail. Fine for a thesis demo, not for public sign-up.
- **Secrets** — `backend/.env.production.local` and root `.env` are gitignored;
  `git status` (Phase 2.4) should never show them as tracked.
