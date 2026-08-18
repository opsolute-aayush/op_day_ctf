# OP Day CTF

A hybrid physical/digital scavenger hunt. Teams decode a physical cipher, hunt for word cards hidden around a venue, and race to assemble a final sentence. One self-contained Next.js app — no external services required.

## Quick start

```bash
npm run start:event
```

Installs dependencies, creates the database, and opens the app in your browser. Safe to re-run any time.

## How it works

- A **Game Master** creates a **session** at `/admin` and gets a 6-digit code + a password (shown once).
- **Players** enter that code at `/register`, pick a team, and play at `/play`.
- One deployment can run many sessions at once — each is fully independent (own teams, puzzles, leaderboard).
- Each team has its own passwords, clues, words, and final sentence, so teams can't share answers.
- A correct password reveals a location clue. The team must then type the *exact word* found at that location to actually collect it and advance.

## Running it

### 1. Local development

```bash
npm install
cp .env.example .env        # set JWT_SECRET
npm run db:push
npm run dev                  # → http://localhost:3000
```

### 2. Docker (single container)

Build and run on the same machine:

```bash
docker build -f docker/Dockerfile -t opday-ctf .
docker run -d -p 3000:3000 \
  -e JWT_SECRET="$(openssl rand -base64 48)" \
  -v opday_data:/app/data \
  opday-ctf
```

Open `http://localhost:3000/admin` → **Create New Session**.

**Running it on a different machine/VM without cloning the repo:** build once, push to a registry, then just pull and run.

```bash
# once, on a machine with this repo
docker build -f docker/Dockerfile -t youruser/opday-ctf .
docker push youruser/opday-ctf

# on the other machine/VM — no repo needed
echo "JWT_SECRET=$(openssl rand -base64 48)" > .env
docker pull youruser/opday-ctf
docker run -d -p 80:3000 --env-file .env -v opday_data:/app/data youruser/opday-ctf
```

The `--env-file .env` keeps the same `JWT_SECRET` across restarts — regenerating it every run logs everyone out.

Want a real domain, HTTPS, and auto-updates instead of plain HTTP? See **Deploying on a VM** below.

### 3. Docker Compose (recommended — works the same on a laptop or a VM)

```bash
git clone <this repo> && cd opday-ctf
npm run compose:up
```

That's the whole setup. This one command creates `.env`, generates a `JWT_SECRET`, detects this machine's IP, builds the image, and starts it on port 80 — every time, on any machine. Open the URL it prints, e.g. `http://<IP>/admin`, and create a session.

**On a cloud VM**, also do this:

- Open port 80 in the VM's firewall / security group.
- Share the VM's **public** IP with players — not the private one the script detects (that's only for the venue-wifi case below).

**Custom domain (`aegios.co.in`):**

- One shared venue wifi → `npm run compose:dns`, or add `<IP> aegios.co.in` to each device's hosts file.
- Real internet domain → point its DNS **A record** at the VM's public IP (Docker can't do this step for you).

### 4. A cloud host without Docker (Render, Fly.io, a VPS)

```bash
npm install && npm run build
npm run db:push
npm start
```

Set `JWT_SECRET` in the platform's env vars and mount a persistent disk (the SQLite file must survive restarts).

## Deploying on a VM (production, HTTPS, auto-updating)

The full production setup for a real domain: nginx terminates HTTPS for `aegios.co.in`, Let's Encrypt provides the cert and renews itself, and Watchtower auto-updates the app whenever you push a new image. No repo clone on the VM — just the `docker/` folder — and nothing to run there again after the first setup.

**Before starting:**
- `aegios.co.in`'s DNS A record already points at the VM's public IP.
- Ports 80 and 443 are open (Security Group, on AWS).

**1. Install Docker + the Compose plugin** (Amazon Linux 2023, amd64):

```bash
sudo dnf install -y docker
sudo systemctl enable --now docker
sudo usermod -aG docker $USER   # log out and back in after this
mkdir -p ~/.docker/cli-plugins
curl -SL https://github.com/docker/compose/releases/latest/download/docker-compose-linux-x86_64 \
  -o ~/.docker/cli-plugins/docker-compose
chmod +x ~/.docker/cli-plugins/docker-compose
```

**2. Copy just the `docker/` folder onto the VM** — scp/rsync from your repo, no clone needed:

```bash
scp -r docker/ your-vm:~/opday-ctf/
```

**3. Create `docker/.env`** on the VM:

```bash
cd ~/opday-ctf/docker
cat > .env <<EOF
JWT_SECRET=$(openssl rand -base64 48)
LETSENCRYPT_EMAIL=you@example.com
DOCKER_IMAGE=aayushop/opday-ctf
DOCKER_TAG=latest
EOF
```

**4. Bootstrap the Let's Encrypt certificate — once:**

```bash
./certbot-init.sh
```

**5. Bring the stack up:**

```bash
docker compose -p opday-ctf -f docker-compose.prod.yml up -d
```

Open `https://aegios.co.in/admin` → **Create New Session**.

**Deploying a change from then on is just this — nothing to run on the VM:**

```bash
docker build --platform linux/amd64 -f docker/Dockerfile -t aayushop/opday-ctf . && docker push aayushop/opday-ctf
```

Watchtower notices the new image within 5 minutes and pulls + restarts the app on its own.

**What's running:**

| Service | Job |
|---|---|
| `app` | The game itself — only reachable through `nginx`, never exposed directly |
| `nginx` | Terminates HTTPS, redirects port 80 → 443, reloads every 12h for renewed certs |
| `certbot` | Renews the Let's Encrypt cert automatically every 12h |
| `watchtower` | Checks Docker Hub every 5 min; pulls + restarts `app` alone when a new image lands |

## Environment variables

| Variable | Required | Purpose |
|---|---|---|
| `DATABASE_URL` | yes | SQLite file path, e.g. `file:./dev.db` |
| `JWT_SECRET` | yes | Signs session tokens. Rotating it logs everyone out. |
| `NODE_ENV` | prod only | Set `production` behind HTTPS so cookies are marked `Secure`. |
| `HOST_IP` | no | LAN IP for the optional Docker Compose `dns` profile — auto-detected and written by `npm run compose:up`/`compose:dns`, only set it by hand to override. |
| `DOCKER_IMAGE` / `DOCKER_TAG` | `docker-compose.prod.yml` only | Which pushed image to pull, e.g. `aayushop/opday-ctf` / `latest`. |
| `LETSENCRYPT_EMAIL` | `docker-compose.prod.yml` only | Email Let's Encrypt sends renewal/expiry notices to. |

There's no admin password to configure — each session generates its own when created, changeable any time from the dashboard's Security tab.

## Scripts

| Command | Effect |
|---|---|
| `npm run dev` | Local dev server |
| `npm run build` / `npm start` | Production build + serve |
| `npm run db:push` | Sync the schema to the SQLite file |
| `npm run db:reset` | Wipe the database and re-sync the schema |
| `npm run db:studio` | Browse/edit the DB visually |
| `npm run docker:build` / `docker:run` | Build/run the single-container image |
| `npm run compose:up` / `compose:dns` / `compose:down` | Docker Compose, with or without the LAN-domain profile |

## Features

- **Teams pick their own color** — a neon swatch picker at join time or from `/play`.
- **Self-service hints** — 2 free hints per team; the admin can also release one for free.
- **Live leaderboard** for players — everyone can see everyone's progress, not just the admin.
- **Sound effects, video clips, background music** — drop files into `public/sounds/<category>/` or `public/videos/<category>/` (`wrong_pass`, `right_pass`, `help`, `winning`, plus `intro`/`outro` for music) and they play automatically. No code changes needed.
- **Player settings** at `/settings` — mute or adjust volume for sound/video/music, per device.
- **Non-blocking wins** — a team finishing never stops the hunt for anyone else. Only the admin's **End Game** does that.

## Security

- Team/session creation and joins are all validated server-side, not just hidden in the UI.
- A team's password, clues, and words are scoped to its own session and team ID — no cross-session or cross-team access, even with a guessed ID.
- The winning sentence and word rewards are never sent to the client before they're actually earned.
- Passwords and session credentials are bcrypt-hashed; sensitive comparisons happen server-side only.

## Project structure

```
docker/          Dockerfile, docker-compose.yml, docker-compose.prod.yml,
                 certbot-init.sh, nginx/app.conf
scripts/         run.sh, docker-entrypoint.sh, compose-up.sh
prisma/          schema.prisma
src/
  app/           Pages: /, /register, /play, /final, /winner, /admin, /settings
  app/api/       API routes
  components/    UI components
  lib/           Auth, sessions, game logic, sound/video/settings
public/
  sounds/        Auto-discovered audio, by category
  videos/        Auto-discovered green-screen clips, by category
```

## Scaling

Built for one Node.js process (a laptop or single small VM) — that's the realistic setup for a one-day internal event. Rate limiting is in-memory and "realtime" updates are polling, both fine at this scale. Deploy to a platform with a persistent disk and a long-running process (Render, Fly.io, a VPS, or Docker with a volume) — not a stateless serverless platform, since the SQLite file needs to persist.
