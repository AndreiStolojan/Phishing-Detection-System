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

```bash
git clone https://github.com/AndreiStolojan/SecureInbox.git
cd SecureInbox
./provision
```

The first run builds the images and downloads the local Ollama model. It also
creates an idempotent demo account with six pre-scanned emails. The generated
demo and Grafana passwords are printed when provisioning completes and remain
in the local `.env` file.

| Service | Address |
| --- | --- |
| SecureInbox | `http://localhost:8080` |
| Prometheus | `http://localhost:9090` |
| Grafana | `http://localhost:3000` |

Demo email: `demo@secureinbox.test`

Run `./provision` again at any time. It preserves `.env`, database contents,
Grafana data, Prometheus data, and the downloaded Ollama model.

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
`./provision` again. SMTP and Arcjet variables are documented in `.env.example`
and are optional.

## Local operations

```bash
docker compose ps
docker compose logs --tail=100
docker compose stop
docker compose start
docker compose down
```

Create and validate a local MongoDB backup:

```bash
./scripts/backup
```

Restore one explicitly:

```bash
./scripts/restore backups/secureinbox-TIMESTAMP.archive.gz --confirm-replace
```

Keep an encrypted backup of `.env` with every MongoDB backup. In particular,
`MAIL_TOKEN_ENCRYPTION_KEY` is required to decrypt restored Gmail tokens.

To erase all local data, including MongoDB, Grafana, Prometheus, and the Ollama
model:

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
