# Raspberry Pi deployment

This guide deploys SecureInbox on a 64-bit Raspberry Pi through a remotely
managed Cloudflare Tunnel. The public hostname points to the internal
`frontend` container, nginx serves the React application and proxies `/api/`
to the Express container. MongoDB remains on Atlas and Ollama is disabled.

```text
Browser -> Cloudflare -> cloudflared -> nginx -> Express -> MongoDB Atlas
```

The Compose file publishes no host ports. Do not configure router port
forwarding for ports 80, 443, 5500, or 11434.

## 1. Prerequisites

- Raspberry Pi 5 running Raspberry Pi OS Lite 64-bit (`arm64`)
- SSD or NVMe storage, Ethernet, active cooling, and a stable power supply
- Docker Engine and the Docker Compose plugin
- a domain whose DNS is managed by Cloudflare
- a MongoDB Atlas database and application database user
- a Google Cloud OAuth web client with the Gmail API enabled

Verify the host before continuing:

```bash
dpkg --print-architecture
docker run --rm hello-world
docker compose version
```

The architecture must be `arm64` and the Docker test must work without
`sudo`. If it only works with `sudo`, log out and reconnect after adding the
user to the `docker` group.

## 2. Clone the public repository

```bash
sudo mkdir -p /opt/secureinbox
sudo chown "$USER":"$USER" /opt/secureinbox
git clone https://github.com/AndreiStolojan/SecureInbox.git /opt/secureinbox
cd /opt/secureinbox
```

Deploy only a reviewed commit from `main`. Record the deployed revision:

```bash
git status --short --branch
git rev-parse --short HEAD
```

## 3. Create the production configuration

```bash
cp .env.example .env
cp backend/.env.production.local.example backend/.env.production.local
chmod 600 .env backend/.env.production.local
```

Generate two different secrets:

```bash
openssl rand -hex 32
openssl rand -hex 32
```

Use one output for `JWT_SECRET` and the other for
`MAIL_TOKEN_ENCRYPTION_KEY`. Never commit either real environment file.

Set these values in `backend/.env.production.local`:

```dotenv
PORT=5500
NODE_ENV=production
DB_URI=mongodb+srv://...
JWT_SECRET=...
JWT_EXPIRES_IN=7d
MAIL_TOKEN_ENCRYPTION_KEY=...
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
GOOGLE_REDIRECT_URI=https://YOUR_HOSTNAME/api/v1/mail-accounts/google/callback
FRONTEND_APP_URL=https://YOUR_HOSTNAME
EMAIL_FROM=...
EMAIL_PASSWORD=...
SUPPORT_EMAIL=...
AI_SEMANTIC_ENABLED=false
OLLAMA_BASE_URL=
SYNC_INTERVAL_MINUTES=15
```

Keep a separate encrypted backup of `MAIL_TOKEN_ENCRYPTION_KEY`. A database
backup cannot restore encrypted Gmail tokens without this key.

## 4. Configure MongoDB Atlas

Create a database user dedicated to SecureInbox and grant access only to the
SecureInbox database. Add the Pi's current public IP address as a `/32` entry
in the Atlas IP Access List. Do not use `0.0.0.0/0` for the final setup.

Cloudflare Tunnel handles incoming traffic but does not give outgoing Atlas
connections a static address. If the ISP changes the public IP, update the
Atlas IP Access List.

## 5. Configure Google OAuth

In the Google Cloud OAuth web client add this exact authorized redirect URI:

```text
https://YOUR_HOSTNAME/api/v1/mail-accounts/google/callback
```

It must match `GOOGLE_REDIRECT_URI` exactly. Add the domain and policy links to
the OAuth consent screen and add the Gmail accounts used for the demonstration
as test users.

An external OAuth application in `Testing` can be used for a portfolio demo,
but Gmail refresh tokens normally expire after seven days in this state. A
public application using `gmail.modify` requires Google's restricted-scope
verification process and may require a security assessment.

## 6. Create the Cloudflare Tunnel

In Cloudflare Zero Trust:

1. Open **Networks -> Tunnels**.
2. Create a remotely managed tunnel named `secureinbox-production`.
3. Choose the Docker connector and copy its tunnel token.
4. Create a public hostname such as `secureinbox.example.com`.
5. Set the service type to `HTTP` and the service URL to
   `http://frontend:80`.

Put only the token in the root `.env` file:

```dotenv
TUNNEL_TOKEN=...
```

The token is a secret. Rotate it in Cloudflare if it is ever exposed.

## 7. Validate and start the stack

```bash
cd /opt/secureinbox
docker compose config
docker compose build --pull
docker compose up -d
docker compose ps
```

All three services should become healthy/running: `backend`, `frontend`, and
`cloudflared`.

Inspect bounded logs when troubleshooting:

```bash
docker compose logs --tail=100 backend
docker compose logs --tail=100 frontend
docker compose logs --tail=100 cloudflared
```

The Compose stack rotates JSON logs at 10 MB and retains three files per
service.

## 8. Verify the deployment

Test the containers from inside the Compose network:

```bash
docker compose exec frontend wget -qO- http://backend:5500/api/v1/health
docker compose exec frontend wget -qO- http://backend:5500/api/v1/ready
```

Then test through Cloudflare:

```bash
curl -i https://YOUR_HOSTNAME/api/v1/health
curl -i https://YOUR_HOSTNAME/api/v1/ready
```

Complete these browser checks:

1. register and log in;
2. connect a Google test account;
3. synchronize the default batch of 10 messages;
4. open a message and verify its score and explanation;
5. mark a message safe or phishing;
6. restart the Pi and verify that all containers return automatically.

The current manual synchronization request is synchronous. Keep the batch at
the default of 10 messages and AI disabled on the Pi. Before increasing the
batch substantially, move synchronization to a background job with status
polling so the request cannot exceed Cloudflare's proxy timeout.

## 9. Update safely

```bash
cd /opt/secureinbox
git fetch origin
git status --short --branch
git pull --ff-only
docker compose build --pull
docker compose up -d
docker compose ps
```

Do not deploy with local code changes on the Pi. Build and test changes on a
branch, merge them to `main`, and then pull the reviewed commit.

## 10. Backup and maintenance

- back up MongoDB on a schedule and test restoration;
- keep encrypted copies of both environment files outside the Pi;
- keep the Gmail token encryption key in a separate protected backup;
- install OS and Docker security updates regularly;
- monitor disk space, temperature, container restarts, tunnel status, and
  expired Gmail credentials;
- use a small UPS if the database is ever moved from Atlas onto the Pi.

Useful checks:

```bash
docker compose ps
docker stats
df -h
free -h
vcgencmd measure_temp
```
