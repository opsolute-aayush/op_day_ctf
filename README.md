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
| Auth | JWT in httpOnly cookies | Teams get a session token on registration; no passwords, no accounts to manage. Admin gets a separate JWT after entering the master key. |
| "Realtime" | Polling (2–5s) | Simpler and more robust than WebSockets/SSE for a few dozen phones on venue wifi — no reconnect logic, works behind any proxy. Good enough for a scoreboard that updates every few seconds. See [Scaling notes](#scaling-notes) if you want true push updates later. |
| Styling | Tailwind CSS v4 + Framer Motion | Cyberpunk/hacker terminal aesthetic: scanlines, glitch text, neon glow, monospace fonts. |
| Rate limiting | In-memory sliding window | No Redis needed for a single-process deployment. See [Scaling notes](#scaling-notes). |

## Game model

- **Level 0** is the physical whiteboard cipher — it lives on paper, not in
  this app. Decoding it gives teams the Level 1 password.
- **Levels 1..N-1** each have: a password (bcrypt-hashed), a location clue
  (revealed only after that level is unlocked), a word reward, and an
  optional hint (only shown if the Game Master manually releases it).
- **Level N** (the final level) is implicit — it's just
  `count(LevelConfig) + 1`. There's no config row for it: it's the
  sentence-assembly screen, unlocked once every password level is cleared.
- The **winning sentence** lives on `GameConfig` and is editable by the admin
  at any time — before, during, or after the game — via the dashboard's
  Control tab.

Nothing about level structure is hardcoded to 5 levels: add or remove levels
from the admin dashboard and the rest of the app (progression, the final
assembly screen, the leaderboard) adapts automatically.

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

1. **Configure your own puzzle** before doors open: log into `/admin` with
   `ADMIN_KEY`, go to the **Levels** tab, and edit each level's password,
   location clue, word reward, and optional hint. Add/remove levels with the
   **Add Level** / **Delete** controls — numbering stays contiguous
   automatically. Set the **winning sentence** in the **Control** tab.
2. Print/write your Level 1 password's cipher onto the physical whiteboard
   (or a QR code) — this is Level 0 and lives entirely outside the app.
3. Hide your physical word cards + next-level cipher at each location.
4. Have teams open the app on their phones and register at `/register`
   (team name, members, color). They'll land on a "waiting for Game Master"
   screen.
5. Hit **Start** in the admin **Control** tab. Teams can now decode the
   whiteboard and start entering passwords at `/play`.
6. Watch progress live on the admin **Overview** tab (leaderboard + activity
   feed, both refresh every few seconds). If a team is stuck, use the
   unlock (⚡) or hint (💡) icons next to their row to nudge them without
   giving away the whole puzzle.
7. First team to correctly assemble and submit the sentence at `/final` wins
   — the game auto-locks (`isFinished`) the instant that happens, so a
   second correct submission a moment later is told "solved it — but too
   late" instead of also winning.
8. **Reset** (Control tab) wipes all progress back to Level 1 for a re-run —
   teams stay registered so they don't need to sign up again.

## Sound effects

`public/sounds/` holds a set of meme sound effects (`bruh.mp3`,
`dramatic-fart.mp3`, `fahhh.mp3`, `goat-scream.mp3`, `roblox-oof.mp3`,
`yeet.mp3`). One is picked at random (never the same one twice in a row) and
played whenever a team enters a wrong level password — wired up in
`src/components/PasswordModal.tsx` via `src/lib/sfx.ts`. Drop in your own
files and update the list in `sfx.ts` to change the roster.

## Security notes (what's enforced server-side, not just in the UI)

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
- Passwords are bcrypt-hashed at rest; the admin API never returns password
  hashes, only a `hasPassword` boolean.
- The winning sentence is never sent to any team-facing endpoint — only
  compared server-side in `/api/game/submit-final-sentence`.
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

## Deployment (Render example)

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
prisma/
  schema.prisma          Team / GameConfig / LevelConfig / TeamProgress / ActivityLog
  seed.ts                 Sample 5-team, 4-level demo puzzle
src/
  proxy.ts                Route guarding (redirect unauthenticated browsers)
  lib/                     jwt.ts, auth.ts (cookies), game.ts (progress logic),
                           rateLimit.ts, normalize.ts, json.ts, adminGuard.ts
  app/
    page.tsx               Landing
    register/               Team sign-up
    play/                   Level hub
    final/                  Sentence assembly
    winner/                 Victory screen + confetti
    admin/                  Game Master dashboard (login-gated)
    api/                    All routes — see inline comments for behavior
  components/               UI primitives + game components
  components/admin/         Leaderboard, ActivityFeed, LevelsEditor, GameControls
  hooks/useTeamStatus.ts    Polling hook for a team's live progress
```

## Sample puzzle (from `npm run db:seed`)

| Level | Password | Word reward |
|---|---|---|
| 1 | `ALPHA` | THE SECRET |
| 2 | `BEANSTALK` | KEY LIES |
| 3 | `CIRCUIT` | BEHIND THE |
| 4 | `FIREWALL` | OLD SERVER |

Winning sentence: **THE SECRET KEY LIES BEHIND THE OLD SERVER RACK**

(Note the sample sentence has one extra word, "RACK", beyond the four
collected fragments — that's intentional flavor from the original brief:
teams have to notice it's implied/missing and add it themselves. Edit the
sentence and word rewards from the admin dashboard if you'd rather every
word be physically collected.)
