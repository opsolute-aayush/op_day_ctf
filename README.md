# OP Day CTF

[![Build and push Docker image](https://github.com/opsolute-aayush/op_day_ctf/actions/workflows/docker-publish.yml/badge.svg)](https://github.com/opsolute-aayush/op_day_ctf/actions/workflows/docker-publish.yml)
[![Docker Hub](https://img.shields.io/docker/v/aayushop/opday-ctf?sort=semver&label=docker&logo=docker)](https://hub.docker.com/r/aayushop/opday-ctf/tags)
[![Docker Pulls](https://img.shields.io/docker/pulls/aayushop/opday-ctf?label=pulls&logo=docker)](https://hub.docker.com/r/aayushop/opday-ctf)
[![Status](https://img.shields.io/endpoint?url=https%3A%2F%2Fraw.githubusercontent.com%2Fopsolute-aayush%2Fop_day_ctf%2Fstatus%2Fstatus.json&cacheSeconds=300)](https://aegios.co.in)

A physical + digital scavenger hunt. Teams decode a cipher, find hidden word cards, and race to build a final sentence. One self-contained Next.js app, no external services needed.

## Quick start

```bash
npm run start:event
```

Installs everything, sets up the database, and opens the app. Safe to re-run anytime.

## How it works

- A **Game Master** creates a **session** at `/admin` and gets a 6-digit code + password (shown once).
- **Players** enter that code at `/register`, pick a team, and play at `/play`.
- One deployment can run many sessions at once, each fully separate (own teams, puzzles, leaderboard).
- Each team has its own passwords, clues, words, and final sentence. Teams can't share answers.
- A correct password reveals a location clue. The team must then type the exact word found there to collect it and move on.

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

The `-v opday_data:/app/data` volume keeps the SQLite file (and your `JWT_SECRET`) across restarts.

Need a different machine/VM, a real domain, HTTPS, and auto-updates instead of plain HTTP? See **Deploying on a VM** below. It already builds and pushes `aayushop/opday-ctf` via GitHub Actions.

### 3. Docker Compose (recommended: same steps on a laptop or a VM)

```bash
git clone <this repo> && cd opday-ctf
npm run compose:up
```

That's the whole setup. One command creates `.env`, generates a `JWT_SECRET`, detects the machine's IP, builds the image, and starts it on port 80. Open the printed URL, e.g. `http://<IP>/admin`, and create a session.

**On a cloud VM**, also:

- Open port 80 in the VM's firewall / security group.
- Share the VM's **public** IP with players, not the private one the script detects (that's only for shared venue wifi, below).

**Custom domain (`aegios.co.in`):**

- Shared venue wifi → run `npm run compose:dns`, or add `<IP> aegios.co.in` to each device's hosts file.
- Real internet domain → point its DNS **A record** at the VM's public IP (Docker can't do this step for you).

### 4. A cloud host without Docker (Render, Fly.io, a VPS)

```bash
npm install && npm run build
npm run db:push
npm start
```

Set `JWT_SECRET` in the platform's env vars and mount a persistent disk (the SQLite file must survive restarts).

## Deploying on a VM (production, HTTPS, auto-updating)

Full production setup for a real domain: nginx handles HTTPS for `aegios.co.in`, Let's Encrypt issues and renews the cert, and Watchtower auto-updates the app on every new image. No repo clone needed on the VM, just the `docker/` folder, and nothing to run there again after setup.

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

**2. Copy just the `docker/` folder to the VM** (scp/rsync, no clone needed):

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

**4. Bootstrap the Let's Encrypt certificate (once):**

```bash
./certbot-init.sh
```

**5. Start the stack:**

```bash
docker compose -p opday-ctf -f docker-compose.prod.yml up -d
```

Open `https://aegios.co.in/admin` → **Create New Session**.

**Releasing an update is manual, by version.** Go to **Actions → Build and push Docker image → Run workflow**, and type a version. Nothing publishes on its own. You choose when and what version.

Versioning is `x.y.z`:
- **x**: major change or new feature
- **y**: UI change, placement, or fix
- **z**: bug fix

The workflow builds and pushes both `aayushop/opday-ctf:<version>` and `aayushop/opday-ctf:latest`. Watchtower on the VM watches `latest` (that's `DOCKER_TAG`'s default), so it auto-updates within 5 minutes of a release, nothing to run on the VM. It also refuses to reuse a version that's already published. It deletes every other version tag from Docker Hub after a successful push, so old images don't pile up.

The workflow needs two repo secrets, set once under **Settings → Secrets and variables → Actions**:

| Secret | Value |
|---|---|
| `DOCKERHUB_USERNAME` | Docker Hub username (`aayushop`) |
| `DOCKERHUB_TOKEN` | A Docker Hub **access token** with Read/Write/Delete scope (Account Settings → Personal access tokens). Delete is needed to prune old version tags |

To build and push by hand instead (CI down, or testing before secrets are set):

```bash
docker buildx build --platform linux/amd64 -f docker/Dockerfile \
  -t aayushop/opday-ctf:<version> -t aayushop/opday-ctf:latest --push .
```

**What's running:**

| Service | Job |
|---|---|
| `app` | The game itself, only reachable through `nginx`, never exposed directly |
| `nginx` | Handles HTTPS, redirects port 80 → 443, reloads every 12h for renewed certs |
| `certbot` | Renews the Let's Encrypt cert every 12h |
| `watchtower` | Checks Docker Hub every 5 min; pulls + restarts `app` when a new image lands |

**Status badge:** `.github/workflows/status-badge.yml` pings `aegios.co.in` every 15 min and publishes Operational/Degraded/Down to the `status` branch, shown as the **Status** badge above. Update `CHECK_URL` in that workflow if the domain changes. It only reflects reality while the VM is actually running; expect "Down" between events unless something stays up in between.

## Environment variables

| Variable | Required | Purpose |
|---|---|---|
| `DATABASE_URL` | yes | SQLite file path, e.g. `file:./dev.db` |
| `JWT_SECRET` | yes | Signs session tokens. Rotating it logs everyone out. |
| `NODE_ENV` | prod only | Set to `production` behind HTTPS so cookies are marked `Secure`. |
| `HOST_IP` | no | LAN IP for the Docker Compose `dns` profile, auto-set by `npm run compose:up`/`compose:dns`; only set by hand to override. |
| `DOCKER_IMAGE` / `DOCKER_TAG` | `docker-compose.prod.yml` only | Which pushed image to pull, e.g. `aayushop/opday-ctf` / `latest`. |
| `LETSENCRYPT_EMAIL` | `docker-compose.prod.yml` only | Email for Let's Encrypt renewal/expiry notices. |

No admin password to set up front. Each session generates its own, changeable anytime from the dashboard's Security tab.

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

- **Teams pick their own color**: a neon swatch picker at join time or from `/play`.
- **Self-service hints**: 2 free hints per team; the admin can also release one for free.
- **Live leaderboard**: every player sees everyone's progress, not just the admin.
- **Sound, video, music**: drop files into `public/sounds/<category>/` or `public/videos/<category>/` (`wrong_pass`, `right_pass`, `help`, `winning`, `hacking`, `alert`, plus `intro`/`outro` for music) and they auto-play. No code changes needed. `hacking` plays for the team that just launched a sabotage or swap; `alert` plays for the team on the other end.
- **Player settings** at `/settings`: mute or adjust volume per device.
- **Non-blocking wins**: a team finishing doesn't stop the hunt for others. Only the admin's **End Game** does that.

## Cipher

Each level's **Ye Lee** field holds a Base64 string that decodes to the next level's password. Made from the admin dashboard's Team Management tab, which randomly picks a technique (Easy has 2) and shows the admin which one it used.

Full details: **[docs/cipher/README.md](docs/cipher/README.md)**.

## Security

- Team/session creation and joins are validated server-side, not just in the UI.
- A team's password, clues, and words are scoped to its own session and team ID, with no cross-session or cross-team access, even with a guessed ID.
- The winning sentence and word rewards are never sent to the client before they're earned.
- Passwords and session credentials are bcrypt-hashed; sensitive comparisons happen server-side only.

## Project structure

```
docs/cipher/     Per-difficulty cipher technique specs (see docs/cipher/README.md)
docker/          Dockerfile, docker-compose.yml, docker-compose.prod.yml,
                 certbot-init.sh, nginx/app.conf
scripts/         run.sh, docker-entrypoint.sh, compose-up.sh
prisma/          schema.prisma
src/
  app/           Pages: /, /register, /play, /final, /winner, /admin, /settings
  app/api/       API routes
  components/    UI components
  lib/           Auth, sessions, game logic, sound/video/settings
  lib/ciphers/   One script per cipher technique + registry picking randomly per difficulty
public/
  sounds/        Auto-discovered audio, by category
  videos/        Auto-discovered green-screen clips, by category
```

## Scaling

Built for one Node.js process (a laptop or small VM), the realistic setup for a one-day internal event. Rate limiting is in-memory and "realtime" updates are polling, both fine at this scale. Deploy to a platform with a persistent disk and a long-running process (Render, Fly.io, a VPS, or Docker with a volume), not stateless serverless, since the SQLite file needs to persist.
