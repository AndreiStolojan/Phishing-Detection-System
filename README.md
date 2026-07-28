# SecureInbox

[![Quality](https://github.com/AndreiStolojan/SecureInbox/actions/workflows/quality.yml/badge.svg)](https://github.com/AndreiStolojan/SecureInbox/actions/workflows/quality.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

SecureInbox is an explainable phishing triage application for Gmail. It combines
deterministic security rules with optional local AI signals and shows the
evidence behind each verdict.

<p align="center">
  <img src="assets/screenshots/dashboard.png" alt="SecureInbox dashboard" width="900" />
</p>

## What it does

- Synchronizes Gmail messages when OAuth is configured.
- Detects suspicious links, attachments, headers, and sender patterns.
- Separates deterministic rule scores from bounded local AI signals.
- Explains why a message was marked safe, suspicious, or likely phishing.
- Supports trusted and blocked sender rules plus manual review decisions.
- Runs locally with Docker, MongoDB, Ollama, Prometheus, and Grafana.

## Architecture

```text
Browser -> nginx / React -> Express -> MongoDB
                              |
                              +-> optional Gmail OAuth
                              +-> local Ollama

Prometheus -> Express /metrics -> Grafana
```

The backend owns authentication, synchronization, scoring, reports, and data.
The frontend talks to it through the nginx reverse proxy. See
[architecture.md](docs/architecture.md) and
[detection-engine.md](docs/detection-engine.md) for the deeper design.

## Quick start

Requirements:

- Docker Engine or Docker Desktop with the Docker Compose plugin, running and
  accessible without `sudo`.
- OpenSSL, used to generate the local secrets.

```bash
git clone https://github.com/AndreiStolojan/SecureInbox.git
cd SecureInbox
./provision
```

`./provision` creates `.env`, generates the local secrets, builds and starts all
containers, downloads the Ollama model, and creates a demo account with six
scanned emails. Leave the script running until it prints `SecureInbox is
ready`.

| Service | Address |
| --- | --- |
| SecureInbox | `http://localhost:8080` |
| Prometheus | `http://localhost:9090` |
| Grafana | `http://localhost:3000` |

Demo email: `demo@secureinbox.test`

The generated demo and Grafana passwords are printed at the end and stored in
`.env`.

Verify the installation:

```bash
docker compose ps
curl --fail http://127.0.0.1:8080/api/v1/ready
curl --fail http://127.0.0.1:9090/-/ready
curl --fail http://127.0.0.1:3000/api/health
```

All six services should be healthy. You can safely run `./provision` again:
existing configuration, database contents, monitoring data, and the Ollama
model are preserved.

For the Raspberry Pi / public Cloudflare deployment, use the separate
[`prod` branch and production Compose guide](docs/raspberry-pi-deployment.md).
Never run the local Compose file or `./provision` on that deployment.

## Optional Gmail connection

The local application starts without Google, email, or Arcjet credentials.
Features that need a missing integration return a clear message only when used.

To connect Gmail, add these values to `.env`:

```dotenv
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
GOOGLE_REDIRECT_URI=http://localhost:8080/api/v1/mail-accounts/google/callback
```

Add the same redirect URI to the OAuth client in Google Cloud, then run
`./provision` again:

```bash
nano .env
./provision
```

SMTP and Arcjet variables are documented in `.env.example` and are optional.

## Local operations

Show status and logs:

```bash
docker compose ps
docker compose logs --tail=100
docker compose logs --follow backend
```

Restart the application:

```bash
docker compose restart
```

Update the local installation:

```bash
git pull --ff-only origin main
./provision
```

Create a validated MongoDB backup:

```bash
./scripts/backup
ls -lh backups
```

Restore the latest backup:

```bash
LATEST_BACKUP="$(find backups -name '*.archive.gz' -type f | sort | tail -1)"
./scripts/restore "$LATEST_BACKUP" --confirm-replace
```

Keep an encrypted backup of `.env` with every MongoDB backup. In particular,
`MAIL_TOKEN_ENCRYPTION_KEY` is required to decrypt restored Gmail tokens.

Stop the application while preserving all data:

```bash
docker compose down
```

To erase MongoDB, Grafana, Prometheus, and the downloaded Ollama model:

```bash
docker compose down --volumes
```

That command is destructive and cannot be undone without a backup.

## Development checks

```bash
npm --prefix backend install
npm --prefix frontend install
npm --prefix backend run lint
npm --prefix backend test
npm --prefix frontend test
npm --prefix frontend run build
```

## Limitations

- Gmail OAuth requires a Google Cloud client and configured test users.
- Gmail synchronization uses polling rather than push notifications.
- Local AI is a secondary signal and cannot declare phishing on its own.
- SecureInbox does not claim precision or recall without a labeled evaluation dataset.

## Author and license

Andrei Stolojan — [GitHub](https://github.com/AndreiStolojan) ·
[LinkedIn](https://www.linkedin.com/in/andrei-stolojan/)

Released under the [MIT License](LICENSE).
