# OP Day CTF

A hybrid physical/digital scavenger hunt. Teams decode a physical cipher, hunt for word cards hidden around a venue, and race to assemble a final sentence. One self-contained Next.js app — no external services required.

## Quick start

```bash
npm run start:event
```

Installs dependencies, creates the database, seeds a demo game, and opens the app in your browser. Safe to re-run any time.

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
npm run db:seed              # optional — loads a demo session
npm run dev                  # → http://localhost:3000
```

### 2. Docker (single container)

```bash
docker build -f docker/Dockerfile -t opday-ctf .
docker run -d -p 3000:3000 \
  -e JWT_SECRET="$(openssl rand -base64 48)" \
  -v opday_data:/app/data \
  opday-ctf
```

Open `http://localhost:3000/admin` → **Create New Session**.

### 3. Docker Compose (recommended for a live event)

```bash
cp .env.example .env         # set JWT_SECRET
npm run compose:up
```

Open `http://localhost/admin` (port 80). To make a custom domain (e.g. `aegios.co.in`) resolve on the venue wifi, set `HOST_IP` in `.env` and run `npm run compose:dns` too — see `docker/docker-compose.yml` for details.

### 4. A cloud host without Docker (Render, Fly.io, a VPS)

```bash
npm install && npm run build
npm run db:push
npm start
```

Set `JWT_SECRET` in the platform's env vars and mount a persistent disk (the SQLite file must survive restarts).

## Environment variables

| Variable | Required | Purpose |
|---|---|---|
| `DATABASE_URL` | yes | SQLite file path, e.g. `file:./dev.db` |
| `JWT_SECRET` | yes | Signs session tokens. Rotating it logs everyone out. |
| `NODE_ENV` | prod only | Set `production` behind HTTPS so cookies are marked `Secure`. |
| `HOST_IP` | no | LAN IP for the optional Docker Compose `dns` profile. |
| `SEED_ON_BOOT` | no | Set `false` to skip auto-seeding a demo session in Docker. |

There's no admin password to configure — each session generates its own when created, changeable any time from the dashboard's Security tab.

## Scripts

| Command | Effect |
|---|---|
| `npm run dev` | Local dev server |
| `npm run build` / `npm start` | Production build + serve |
| `npm run db:push` | Sync the schema to the SQLite file |
| `npm run db:seed` | Create a demo session with 5 sample teams |
| `npm run db:reset` | Wipe and reseed from scratch |
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
docker/          Dockerfile, docker-compose.yml
scripts/         run.sh, docker-entrypoint.sh
prisma/          schema.prisma, seed.ts
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
