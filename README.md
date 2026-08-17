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
| Styling | Tailwind CSS v4 + Framer Motion | Cyberpunk/hacker terminal aesthetic: scanlines, glitch text, neon glow, monospace fonts. Framer Motion also drives page-to-page transitions (`src/components/RouteTransition.tsx`), panel/card entrance animations, and button hover/tap feedback throughout. |
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
  it), a word reward, and an optional hint — shown either when the Game
  Master manually releases it, or when the team spends one of their own
  limited self-service hint requests (see
  [Self-service hints](#self-service-hints)).
- **Unlocking a level never hands over its word.** Getting the password
  right only unlocks the level and reveals its location clue — the team
  still has to go find the physical card and type in the *exact word*
  printed on it (see
  [Confirming the word you found](#confirming-the-word-you-found)) before
  it counts toward their final sentence. This closes the gap where a lucky
  password guess would otherwise auto-hand over the word without the team
  ever visiting the location.
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

**Only the Game Master creates teams**, and each gets a permanent number
(Team 1, Team 2, ...) the moment it's created. Players can never mint a new
team from the app — they can only join one that already exists — so the
number of digital teams always matches however many physical groups you
actually have. A team's **number never changes**, but its **display name is
entirely up to whoever joins it** — they can call themselves "Code Breakers"
or anything else, rename it any time, and the admin dashboard, leaderboard,
and join screen all show both (`#3 — Code Breakers`) so renaming never
causes confusion about which physical group is which.

1. **Add each team** ahead of time: log into `/admin` with `ADMIN_KEY`, go to
   the **Team Puzzles** tab, and click **Add Team** once per physical
   group — zero typing, each gets the next number and a colored hacker-badge
   avatar automatically. This is required before you can configure a team's
   puzzle, since levels are tied to a team's ID once it exists.
2. **Configure each team's own puzzle**: still in **Team Puzzles**, pick a
   team from the selector and set its passwords, location clues, word
   rewards, optional hints, and its own final winning sentence. Add/remove
   levels with **Add Level** / **Delete** — numbering stays contiguous
   automatically, per team.
3. Print/write each team's Level 1 password's cipher onto the physical
   whiteboard (or hand out per-team QR codes/cards) — this is Level 0 and
   lives entirely outside the app.
4. Hide your physical word cards + next-level cipher at each location.
5. **Have players join** at `/register`: they see the list of teams you
   created (each with its avatar), pick theirs, optionally give their squad
   its own name, and add their own name to the member list. No team creation
   option is shown to them. Multiple people can join the same team from
   their own phones and they'll all see and drive the same shared progress
   live. They'll land on a "waiting for Game Master" screen until you start.
   If someone joined the wrong team, **Leave Team** on `/play` (with a
   confirm-again step, so it's not an accidental one-click) clears their
   session and sends them back to `/register` to pick a different one.
6. Hit **Start** in the admin **Game Control** tab. Teams can now decode
   their whiteboard clue and start entering passwords at `/play`.
7. Watch progress live on the admin **Overview** tab (leaderboard + activity
   feed, both refresh every few seconds). If a team is stuck, use the
   **Unlock** or **Hint** buttons next to their row to nudge them without
   giving away the whole puzzle.
8. A team correctly assembling and submitting *their own* sentence at
   `/final` gets its own results screen immediately — **this never stops the
   hunt for anyone else.** The first team to do it is tagged 🏆 on the
   leaderboard for bragging rights, but every other team keeps playing
   exactly as before.
9. **End Game** (Game Control tab, in the "danger zone") is the *only*
   thing that stops the hunt for everyone — nobody can unlock levels or
   submit sentences anymore once you hit it. Use it when you're ready to
   wrap up, not automatically.
10. **Reset** (also in the danger zone) wipes all progress back to Level 1
    for a re-run — teams stay joined, and each team's puzzle/sentence
    (configured in step 2) is untouched, so you can replay without
    recreating anything.

## Team avatars

Every team gets a deterministic "hacker badge" avatar — no image uploads
needed, so there's nothing to store or moderate. `src/components/TeamAvatar.tsx`
picks one of 10 icons by the team's number and renders it in that team's
color; the same team always gets the same avatar everywhere (join screen,
play hub, leaderboard, winner screen).

## Live team stats for players

`/play` shows a **live "all squads" side panel** (`src/components/TeamStatsPanel.tsx`,
backed by the public `GET /api/game/stats`) so every team can see how
everyone else is doing, not just the admin — avatar, name, a progress bar,
and level count per team, refreshing every few seconds, with your own squad
highlighted. It's a real sidebar next to the level list on wide screens and
stacks below it on mobile. Deliberately excludes anything sensitive
(attempts, collected words, clues, member names) — it's just a friendly
"who's ahead" scoreboard, not a way to leak puzzle content.

## Self-service hints

Teams don't have to wait on the Game Master for help — an **"Ask for a
Hint"** button appears on a team's active level (`src/components/LevelCard.tsx`)
whenever that level actually has a hint configured. Each team gets
**2 hint requests for the whole hunt** (`TeamProgress.helpCreditsRemaining`,
resettable via the admin's **Reset** action), tracked and decremented
per-team by `POST /api/game/help`. A few rules that keep it fair:

- Re-opening a hint that's already showing for the current level is free —
  it only ever charges a credit the first time a level's hint is revealed.
- The admin's own manual hint release (leaderboard's **Hint** button) is a
  completely separate, unlimited mechanism and never touches a team's
  self-service budget.
- Revealing a hint (either way) plays the `help/` sound effect automatically
  on the team's screen — no separate wiring needed, it's just watching for
  the hint becoming visible.

## Confirming the word you found

Once a level is unlocked, its card shows a plain single-line prompt —
**"Type the exact word you found at this location"** — instead of
immediately handing over the word. The team types what's printed on the
physical card and hits the arrow button (`POST /api/game/verify-word`):

- **Wrong word** → an inline red "Wrong word — check what you found at the
  location" message, same shake feedback as a wrong password. Nothing is
  recorded against the team except a rate-limited attempt (10/minute,
  same as password guesses).
- **Correct word** → the prompt is replaced with the familiar
  "WORD COLLECTED: "..."" badge, and it now counts toward the team's final
  sentence.
- The check is **case- and spacing-insensitive on purpose** — "The Secret",
  "THE  SECRET", and "TheSecret" all match the same word reward, so a team
  isn't penalized for how they transcribed a physical card
  (`normalizeWord` in `src/lib/normalize.ts` compares on letters/digits
  only).
- Re-submitting an already-confirmed word is a harmless no-op, not an
  error.
- The Game Master's own **force-unlock** button (leaderboard's **Unlock**
  icon) is a complete bypass, same as it always was — it confirms the word
  for free too, since a team that's stuck wouldn't have any way to type in
  a word they never found.

`src/app/api/team/status`'s `unlockedClues[].wordReward` is `undefined`
until a level's word is actually confirmed — the word text itself is never
sent to the client before that point, so there's no way to read it off the
network tab either.

## Sound effects

`public/sounds/` is split by moment, and **files are auto-discovered — just
drop one in, no code change, no filename to type anywhere**:

- `wrong_pass/` — meme stingers on an incorrect password
- `right_pass/` — plays on a correct password / level unlock
- `help/` — plays when the Game Master releases a hint for a stuck team
- `winning/` — plays when a team finishes the whole hunt

`GET /api/sounds/<category>` (`src/app/api/sounds/[category]/route.ts`)
lists whatever `.mp3`/`.wav`/`.ogg`/`.m4a` files actually exist in that
folder at request time; `src/lib/sfx.ts` fetches and caches that list on
first use, then plays a random one (never the same one twice in a row).
Filenames can have spaces/punctuation — they're URL-encoded automatically.
A category with **no** files falls back to a small synthesized chime
instead (`winning/` currently ships empty and uses one), so the feature
works with zero assets out of the box. Wired up in
`src/components/PasswordModal.tsx` (wrong/right), `src/app/play/page.tsx`
(help, on hint reveal), and `src/app/winner/page.tsx` (winning). To add a
sound: just drop the file in the right folder — that's it.

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
  has actually unlocked — the location clue is sent once the password is
  verified, but the **word reward specifically waits until the word itself
  is separately confirmed** via `/api/game/verify-word` (see
  [Confirming the word you found](#confirming-the-word-you-found)) — a
  correct password alone can never leak the word text.
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
- `/api/game/unlock-level` is rate-limited to 10 attempts/minute per team;
  `/api/admin/login` is rate-limited per IP.
- The "who finished first" race (two teams submitting their correct sentence
  near-simultaneously) is resolved atomically with a conditional
  `updateMany` against `GameConfig.winningTeamId`, so exactly one team can
  ever hold that title — but it's purely informational: finishing never sets
  `isFinished` or stops any other team. Only the admin's explicit **End
  Game** action (`POST /api/admin/game {action:"end"}`) does that.
- Team creation is admin-only (`POST /api/admin/teams`, requires the admin
  session) and needs no input — the server assigns the next `teamNumber` and
  a color, so there's no path for a player to influence how many teams
  exist. The only self-service writes to a `Team` row are joining
  (`POST /api/auth/join-team`, adds a member) and renaming
  (`PUT /api/team/name`) — neither can create a new team or change its
  number.

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

### Step 1 — build the image

```bash
docker build -t opday-ctf .
```

### Step 2 — generate your credentials

The admin key isn't looked up anywhere — it's whatever string you pass in
when you start the container. Generate strong values and print the admin
key so you can note it down:

```bash
JWT_SECRET=$(openssl rand -base64 48)
ADMIN_KEY=$(openssl rand -hex 8)

echo "Your admin master key is: $ADMIN_KEY"
```

(To reuse a specific key instead of generating one, just set
`ADMIN_KEY="your-chosen-key"` directly instead of the `openssl rand` line.)

### Step 3 — run it

```bash
docker run -d -p 3000:3000 \
  -e JWT_SECRET="$JWT_SECRET" \
  -e ADMIN_KEY="$ADMIN_KEY" \
  -v opday_data:/app/data \
  --name opday-ctf \
  opday-ctf
```

Then open `http://localhost:3000/admin` and log in with the `ADMIN_KEY` you
printed in Step 2. (`npm run docker:build` / `npm run docker:run` wrap
Steps 1 and 3 if you'd rather not type the full commands.)

A few operational notes:

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
                           rateLimit.ts, normalize.ts, json.ts, adminGuard.ts, sfx.ts
  app/
    page.tsx               Landing
    register/               Join an existing team (no team creation here)
    play/                   Level hub, squad rename control
    final/                  Sentence assembly
    winner/                 Results screen (first-place or "hunt complete") + confetti
    admin/                  Game Master dashboard (login-gated)
    api/                    All routes — see inline comments for behavior
  components/               UI primitives + game components (TeamAvatar.tsx, TeamStatsPanel.tsx)
  components/admin/         Leaderboard, ActivityFeed, LevelsEditor, GameControls
  hooks/useTeamStatus.ts    Polling hook for a team's live progress
```

## Sample puzzles (from `npm run db:seed`)

Five sample teams are seeded — named generically "Team 1".."Team 5", since
team names are player-owned and never pre-defined (see
[Game model](#game-model)) — each with its own independent 4-level puzzle
and its own final sentence. Run `npm run db:seed` and the console prints
every team's plaintext level passwords (for the physical cards) plus their
sentence:

| Team # | Level 1 | Level 2 | Level 3 | Level 4 | Winning sentence |
|---|---|---|---|---|---|
| 1 | `ALPHA` | `BEANSTALK` | `CIRCUIT` | `FIREWALL` | THE SECRET KEY LIES BEHIND THE OLD SERVER RACK |
| 2 | `BRAVO` | `PIXELATE` | `LATTICE` | `SKYLINE` | FOLLOW THE BLUE WIRE TO THE ROOFTOP GENERATOR |
| 3 | `CHARLIE` | `SEGFAULT` | `RECURSION` | `ESPRESSO` | THE PASSWORD WAS HIDDEN INSIDE THE COFFEE MACHINE ALL ALONG |
| 4 | `DELTA` | `KEYSTONE` | `MAINFRAME` | `BLUEPRINT` | TEAMWORK UNLOCKS EVERY DOOR IN THIS ENTIRE BUILDING |
| 5 | `ECHO` | `STACKTRACE` | `NULLBYTE` | `CHECKSUM` | PANIC LESS DEBUG MORE AND THE FLAG IS YOURS |

Edit any of this — passwords, clues, words, hints, or the sentence — for any
team at any time from the admin **Team Puzzles** tab. See `prisma/seed.ts`
for the full source if you want to design your own set from scratch.
