# OP Day CTF // Scavenger Hunt

A hybrid physical/digital Capture-The-Flag scavenger hunt for OP Day. Teams
decode a physical whiteboard cipher, race between physical locations
collecting words, and type decoded passwords into this app to unlock the next
clue — until they assemble everything into a final winning sentence.

Built as a single self-contained Next.js app (frontend + API + DB) so it can
run on a laptop on the office wifi with zero external services.

## Tech stack & why

| Concern | Choice | Why |
|---|---|---|
| Framework | Next.js 16 (App Router) | One deploy for both the UI and the API routes — no separate backend to stand up for a one-day event. |
| Database | SQLite via Prisma | Zero setup — no Postgres/Supabase account needed. `schema.sql` documents the exact shape and how to port to Postgres later if you outgrow it. |
| Auth | JWT in httpOnly cookies | Players get a session token when they join a team; no passwords, no accounts to manage. Admin gets a separate JWT after entering the master key. |
| "Realtime" | Polling (2–5s) | Simpler and more robust than WebSockets/SSE for a few dozen phones on venue wifi — no reconnect logic, works behind any proxy. Good enough for a scoreboard that updates every few seconds. See [Scaling notes](#scaling-notes) if you want true push updates later. |
| Styling | Tailwind CSS v4 + Framer Motion | Cyberpunk/hacker terminal aesthetic: scanlines, glitch text, neon glow, monospace fonts. |
| Rate limiting | In-memory sliding window | No Redis needed for a single-process deployment. See [Scaling notes](#scaling-notes). |

## Game model

**Only the Game Master creates teams.** Players joining at `/register` pick
from the list of teams the admin already set up and add their own name —
there is no "create a team" option anywhere in the player-facing app. This
keeps the digital team count locked to whatever the admin decided matches
the physical groups at the event, and multiple people can join the same
team from their own phones and all drive the same shared progress.

**Every team has its own independent puzzle.** Passwords, location clues,
word rewards, and the final winning sentence all belong to a specific team —
not to the game as a whole. Team A's Level 2 password does nothing for Team
B, and each team assembles a completely different final sentence. This is
what stops teams from just shouting answers at each other or copying a
password they overheard at a shared physical location.

- **Level 0** is the physical whiteboard cipher — it lives on paper, not in
  this app, and can be the same starting clue for everyone or per-team (your
  call). Decoding it gives a team its own Level 1 password.
- **Levels 1..N-1** each belong to one team and have: a password
  (bcrypt-hashed), a location clue (revealed only after that team unlocks
  it), a word reward, and an optional hint (only shown if the Game Master
  manually releases it for that team).
- **Level N** (the final level) is implicit per team — it's just
  `count(that team's LevelConfig rows) + 1`. There's no config row for it:
  it's the sentence-assembly screen, unlocked once that team clears every
  one of its own password levels.
- Each **team's winning sentence** lives on the `Team` row itself and is
  editable by the admin at any time — before, during, or after the game —
  from the **Team Puzzles** tab.
- Teams don't need the same number of levels. Add/remove levels per team
  from the admin dashboard and everything (progression, the final assembly
  screen, the leaderboard) adapts automatically.
- The **race to win** is still global: whichever team is first to correctly
  submit *their own* sentence wins and locks the whole game — a second,
  later-but-still-correct submission from another team is told "solved it,
  but too late" instead of also winning.

## Getting started

**Single entry point** — this does everything (install deps, generate a
`.env` with fresh secrets if one doesn't exist, sync the DB, seed it if it's
empty, then launch and open your browser):

```bash
./run.sh
# or: npm run start:event
```

It's safe to re-run any time: it never overwrites an existing `.env`, and it
only seeds sample data if the database is empty — so re-running mid-event
won't touch registered teams or progress.

<details>
<summary>Manual step-by-step (if you'd rather run each piece yourself)</summary>

```bash
npm install
cp .env.example .env        # then edit JWT_SECRET and ADMIN_KEY (see below)
npm run db:push             # creates prisma/dev.db from the schema
npm run db:seed             # loads 5 sample teams + a 4-level demo puzzle
npm run dev                 # http://localhost:3000
```

Generate strong secrets instead of the placeholders:

```bash
openssl rand -base64 48     # → JWT_SECRET
openssl rand -hex 8         # → ADMIN_KEY (this is what the Game Master types at /admin)
```

</details>

### Environment variables (`.env`)

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | SQLite file path, e.g. `file:./dev.db` |
| `JWT_SECRET` | Signs team + admin session tokens. Keep it secret; rotating it logs everyone out. |
| `ADMIN_KEY` | The master key the Game Master enters at `/admin`. Generate a fresh one per event. |
| `NODE_ENV` | Set to `production` on deploy so cookies get `Secure` (requires HTTPS). |

## Scripts

| Command | Effect |
|---|---|
| `npm run dev` | Local dev server |
| `npm run build` / `npm start` | Production build + serve |
| `npm run db:push` | Sync `prisma/schema.prisma` → the SQLite file |
| `npm run db:seed` | Load the sample teams/levels/sentence (also prints the plaintext level passwords for the physical cards) |
| `npm run db:reset` | Wipe and reseed from scratch |
| `npm run db:studio` | Prisma Studio — browse/edit the DB visually |

## Running the event

**Only the Game Master creates teams.** Players can never mint a new team
from the app — they can only join one that already exists — so the number
of digital teams always matches however many physical groups you actually
have at the event. No duplicate/joke/extra teams from open self-service
sign-up.

1. **Create each team** ahead of time: log into `/admin` with `ADMIN_KEY`,
   go to the **Team Puzzles** tab, and use **Create Team** (name + color) —
   once per physical group. This is required before you can configure a
   team's puzzle, since levels are tied to a team's ID once it exists.
2. **Configure each team's own puzzle**: still in **Team Puzzles**, pick a
   team from the selector and set its passwords, location clues, word
   rewards, optional hints, and its own final winning sentence. Add/remove
   levels with **Add Level** / **Delete** — numbering stays contiguous
   automatically, per team. Repeat for every team you created (they can all
   be totally different puzzles, or variations on a theme — up to you).
3. Print/write each team's Level 1 password's cipher onto the physical
   whiteboard (or hand out per-team QR codes/cards) — this is Level 0 and
   lives entirely outside the app.
4. Hide your physical word cards + next-level cipher at each location —
   remember each team may be heading to different locations for the same
   "level number" if you gave them different clues.
5. **Have players join** at `/register`: they see the list of teams you
   created, pick theirs, and add their own name — no team creation option is
   shown to them. Multiple people can join the same team from their own
   phones and they'll all see and drive the same shared progress live.
   They'll land on a "waiting for Game Master" screen until you start.
6. Hit **Start** in the admin **Game Control** tab. This starts the clock
   for every team at once. Teams can now decode their whiteboard clue and
   start entering passwords at `/play`.
7. Watch progress live on the admin **Overview** tab (leaderboard + activity
   feed, both refresh every few seconds). If a team is stuck, use the
   unlock (⚡) or hint (💡) icons next to their row to nudge them without
   giving away the whole puzzle.
8. First team to correctly assemble and submit *their own* sentence at
   `/final` wins — the game auto-locks (`isFinished`) for everyone the
   instant that happens.
9. **Reset** (Game Control tab) wipes all progress back to Level 1 for a
   re-run — teams and their puzzle/sentence (configured in step 2) are
   untouched, so you can replay without recreating anything.

## Sound effects

`public/sounds/` holds a set of meme sound effects (`bruh.mp3`,
`dramatic-fart.mp3`, `fahhh.mp3`, `goat-scream.mp3`, `roblox-oof.mp3`,
`yeet.mp3`). One is picked at random (never the same one twice in a row) and
played whenever a team enters a wrong level password — wired up in
`src/components/PasswordModal.tsx` via `src/lib/sfx.ts`. Drop in your own
files and update the list in `sfx.ts` to change the roster.

## Security notes (what's enforced server-side, not just in the UI)

- Team creation is admin-only: `POST /api/admin/teams` requires the admin
  JWT cookie (`requireAdmin`). The only public, unauthenticated write to a
  `Team` row is `POST /api/auth/join-team`, and it can only append a member
  name to a team that already exists — there's no code path for a player to
  create a new team, by design.
- Route guarding in `src/proxy.ts` (Next 16 renamed `middleware.js` to
  `proxy.js`) redirects unauthenticated browsers away from `/play`, `/final`,
  `/winner` — but that's just UX. The actual enforcement is in every API
  route: `/api/team/status`, `/api/game/unlock-level`, and
  `/api/game/submit-final-sentence` all re-derive the team's progress from
  the database and the signed JWT cookie, so there's no client-suppliable
  "level" or "team ID" parameter to tamper with.
- `unlockedClues` in `/api/team/status` only ever includes levels the team
  has actually unlocked — a level's location clue and word reward are never
  sent to the client before that level's password is verified.
- Every level lookup (`unlock-level`, `force-unlock`) is scoped by both
  `teamId` *and* `levelNumber` — a team's password only ever matches its own
  levels, never another team's, even if they happen to be on the same level
  number.
- Passwords are bcrypt-hashed at rest; the admin API never returns password
  hashes, only a `hasPassword` boolean.
- Each team's winning sentence is never sent to any team-facing endpoint —
  only compared server-side, against that team's own `Team.winningSentence`,
  in `/api/game/submit-final-sentence`.
- Password/sentence comparisons are case-insensitive and whitespace/
  punctuation-normalized (`src/lib/normalize.ts`) so teams aren't tripped up
  by formatting, but the comparison itself always happens on the server.
- `/api/game/unlock-level` is rate-limited to 5 attempts/minute per team;
  `/api/admin/login` is rate-limited per IP.
- The final-win race (two teams submitting the correct sentence near-
  simultaneously) is resolved atomically with a conditional `updateMany`
  against `GameConfig.isFinished`, so exactly one team can ever win.

## Scaling notes

This is intentionally built for **one Node.js process** running the whole
event (a laptop, or a single small VM/container) — that's the realistic
deployment for an internal one-day activity, and it keeps the stack free of
Redis/Postgres/managed-realtime accounts. Two things are process-local as a
result:

- **Rate limiting** (`src/lib/rateLimit.ts`) is an in-memory map. If you ever
  run multiple instances behind a load balancer, move this to Redis.
- **"Realtime" updates** are polling, not push. If you want instant
  cross-client updates (e.g., true sub-second leaderboard sync), swap the
  polling hooks in `src/hooks/useTeamStatus.ts` and `src/components/admin/*`
  for Server-Sent Events or a Postgres/Supabase Realtime subscription after
  porting the DB (see `schema.sql`).

Since SQLite is a single file, deploy this to a platform that gives you a
**persistent disk and a long-running Node process** — Render, Fly.io, a
plain VPS, or Docker with a mounted volume. Don't deploy it to a stateless
serverless platform (e.g. Vercel's default) unless you first port to
Postgres, since the SQLite file (and the in-memory rate limiter) won't
survive across serverless invocations/instances.

## Deploying with Docker

The `Dockerfile` builds a single self-contained image — no separate database
or cache to provision. It's a multi-stage build (build stage has the full
toolchain; the shipped image only has production dependencies + the
compiled app), runs as a non-root user, and the entrypoint
(`docker-entrypoint.sh`) syncs the SQLite schema and seeds sample data on
first boot only, every time the container starts.

```bash
docker build -t opday-ctf .

docker run -d -p 3000:3000 \
  -e JWT_SECRET="$(openssl rand -base64 48)" \
  -e ADMIN_KEY="$(openssl rand -hex 8)" \
  -v opday_data:/app/data \
  opday-ctf
```

(or `npm run docker:build` / `npm run docker:run`, which do the same thing)

- **`-v opday_data:/app/data`** is required — the SQLite file lives at
  `/app/data/prod.db` inside the container. Without a volume, every restart
  starts from an empty database. With it, `docker rm` + `docker run` again
  against the same volume name picks up right where you left off (verified:
  teams, progress, and puzzles all survive container recreation).
- **`JWT_SECRET`/`ADMIN_KEY`** are required — the container refuses to start
  and prints a clear error if either is missing, instead of failing
  confusingly on the first request.
- Set **`SEED_ON_BOOT=false`** to skip auto-seeding entirely (e.g. once
  you're running a real event and don't want any sample data ever inserted,
  even into a fresh volume).
- The app listens on `$PORT` (defaults to `3000`) — pass `-e PORT=8080` to
  change it, matching whatever port your cloud platform expects.

### Pull-and-run on a cloud host

Build once, push to a registry, then any cloud VM/container service just
pulls and runs — no repo checkout or Node.js install needed on the host.

```bash
docker build -t <registry>/<you>/opday-ctf:latest .
docker push <registry>/<you>/opday-ctf:latest
```

Then on the target host/platform:

```bash
docker pull <registry>/<you>/opday-ctf:latest
docker run -d -p 3000:3000 \
  -e JWT_SECRET="..." -e ADMIN_KEY="..." \
  -v opday_data:/app/data \
  <registry>/<you>/opday-ctf:latest
```

This works as-is on any platform that runs a plain Docker image with a
persistent volume — a VPS with Docker installed, Fly.io (`fly volumes
create` + `fly deploy`), Render/Railway (Docker deploy + a persistent disk
mounted at `/app/data`), or a self-managed VM. Since the container is a
single Node process talking to a local SQLite file (see
[Scaling notes](#scaling-notes)), avoid platforms that run multiple
replicas of the same container or wipe the filesystem between requests
(e.g. bare serverless functions) unless you first port to Postgres.

**Updating a running deployment:** rebuild and push a new tag, then on the
host `docker pull` the new tag and `docker run` again with the *same*
volume name — your data carries over since it never lived in the image.

## Deployment (Render example, without Docker)

1. Push this repo to GitHub.
2. Create a new Render **Web Service** from the repo.
   - Build command: `npm install && npm run build`
   - Start command: `npm run db:push && npm start`
   - Add a **persistent disk** mounted so `prisma/dev.db` survives restarts.
3. Set the environment variables from `.env.example` in Render's dashboard
   (generate fresh `JWT_SECRET` / `ADMIN_KEY` — don't reuse the ones from
   local dev).
4. After the first deploy, run `npm run db:seed` once via Render's shell (or
   just configure your own levels from `/admin` — seeding is optional).

## Project structure

```
Dockerfile                Multi-stage build → single self-contained runtime image
docker-entrypoint.sh       Schema sync + first-boot seed, runs before the server starts
run.sh                     Single-command local entry point (install/setup/seed/launch)
prisma/
  schema.prisma          Team / GameConfig / LevelConfig / TeamProgress / ActivityLog
  seed.ts                 Sample 5-team, 4-level demo puzzle
src/
  proxy.ts                Route guarding (redirect unauthenticated browsers)
  lib/                     jwt.ts, auth.ts (cookies), game.ts (progress logic),
                           rateLimit.ts, normalize.ts, json.ts, adminGuard.ts
  app/
    page.tsx               Landing
    register/               Join an existing team (no team creation here)
    play/                   Level hub
    final/                  Sentence assembly
    winner/                 Victory screen + confetti
    admin/                  Game Master dashboard (login-gated)
    api/                    All routes — see inline comments for behavior
  components/               UI primitives + game components
  components/admin/         Leaderboard, ActivityFeed, LevelsEditor, GameControls
  hooks/useTeamStatus.ts    Polling hook for a team's live progress
```

## Sample puzzles (from `npm run db:seed`)

Five sample teams are seeded, each with its own independent 4-level puzzle
and its own final sentence — run `npm run db:seed` and the console prints
every team's plaintext level passwords (for the physical cards) plus their
sentence. Example (yours will differ per team):

| Team | Level 1 | Level 2 | Level 3 | Level 4 | Winning sentence |
|---|---|---|---|---|---|
| Code Breakers | `ALPHA` | `BEANSTALK` | `CIRCUIT` | `FIREWALL` | THE SECRET KEY LIES BEHIND THE OLD SERVER RACK |
| Byte Bandits | `BRAVO` | `PIXELATE` | `LATTICE` | `SKYLINE` | FOLLOW THE BLUE WIRE TO THE ROOFTOP GENERATOR |
| Null Pointers | `CHARLIE` | `SEGFAULT` | `RECURSION` | `ESPRESSO` | THE PASSWORD WAS HIDDEN INSIDE THE COFFEE MACHINE ALL ALONG |
| Cyber Ninjas | `DELTA` | `KEYSTONE` | `MAINFRAME` | `BLUEPRINT` | TEAMWORK UNLOCKS EVERY DOOR IN THIS ENTIRE BUILDING |
| Kernel Panic | `ECHO` | `STACKTRACE` | `NULLBYTE` | `CHECKSUM` | PANIC LESS DEBUG MORE AND THE FLAG IS YOURS |

Edit any of this — passwords, clues, words, hints, or the sentence — for any
team at any time from the admin **Team Puzzles** tab. See `prisma/seed.ts`
for the full source if you want to design your own set from scratch.
