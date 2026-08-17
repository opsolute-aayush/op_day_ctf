-- OP Day CTF — reference schema
--
-- The app itself is Prisma-managed (see prisma/schema.prisma) and talks to a
-- local SQLite file by default, so there is no hand-maintained migration to
-- run — `npm run db:push` creates these tables for you from the Prisma schema.
--
-- This file is a plain-SQL reference for anyone who wants to read the shape
-- of the data without installing anything, or who is porting the app onto
-- Postgres/Supabase (see the notes at the bottom).
--
-- Dialect below: SQLite (matches what `prisma db push` actually creates).
--
-- KEY DESIGN POINT: every team has its own independent puzzle. Levels
-- (passwords/clues/words) and the final winning sentence both belong to a
-- specific team, not to the game as a whole — Team A's Level 2 password does
-- nothing for Team B, and each team assembles its own unique sentence.

CREATE TABLE "GameConfig" (
    "id"            INTEGER PRIMARY KEY DEFAULT 1,
    "isActive"      BOOLEAN NOT NULL DEFAULT false,
    "isFinished"    BOOLEAN NOT NULL DEFAULT false,
    "winningTeamId" TEXT,
    "startedAt"     DATETIME,
    "updatedAt"     DATETIME NOT NULL,
    FOREIGN KEY ("winningTeamId") REFERENCES "Team" ("id") ON DELETE SET NULL
);

CREATE TABLE "Team" (
    "id"              TEXT PRIMARY KEY,             -- uuid
    "name"            TEXT NOT NULL UNIQUE,
    "color"           TEXT NOT NULL DEFAULT '#39FF14',
    "members"         TEXT NOT NULL,                -- JSON string array, e.g. ["Asha","Rohit"]
    "winningSentence" TEXT NOT NULL DEFAULT '',      -- THIS team's own final sentence
    "createdAt"       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Levels 1..N-1 require a password and reveal a location clue + word reward.
-- The final level (N) is the sentence-assembly stage and has no row here —
-- N is simply (COUNT(*) FROM LevelConfig WHERE teamId = <team>) + 1.
-- Every row belongs to exactly one team; two teams can reuse the same
-- levelNumber (e.g. both have a "Level 2") with totally different content.
CREATE TABLE "LevelConfig" (
    "id"           INTEGER PRIMARY KEY AUTOINCREMENT,
    "teamId"       TEXT NOT NULL,
    "levelNumber"  INTEGER NOT NULL,
    "password"     TEXT NOT NULL,                -- bcrypt hash, never plaintext
    "locationClue" TEXT NOT NULL,
    "wordReward"   TEXT NOT NULL,
    "hint"         TEXT,
    "createdAt"    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"    DATETIME NOT NULL,
    FOREIGN KEY ("teamId") REFERENCES "Team" ("id") ON DELETE CASCADE,
    UNIQUE ("teamId", "levelNumber")
);

CREATE TABLE "TeamProgress" (
    "id"                TEXT PRIMARY KEY,        -- uuid
    "teamId"            TEXT NOT NULL UNIQUE,
    "currentLevel"      INTEGER NOT NULL DEFAULT 1,
    "unlockedLevels"    TEXT NOT NULL DEFAULT '[0]', -- JSON int array
    "collectedWords"    TEXT NOT NULL DEFAULT '[]',  -- JSON string array, in level order
    "hintReleasedLevel" INTEGER,                 -- level number a hint was manually released for
    "completed"         BOOLEAN NOT NULL DEFAULT false,
    "completedAt"       DATETIME,
    "updatedAt"         DATETIME NOT NULL,
    FOREIGN KEY ("teamId") REFERENCES "Team" ("id") ON DELETE CASCADE
);

CREATE TABLE "ActivityLog" (
    "id"        TEXT PRIMARY KEY,                -- uuid
    "teamId"    TEXT,
    "eventType" TEXT NOT NULL,                    -- LEVEL_UNLOCKED | WRONG_PASSWORD | WIN | ...
    "details"   TEXT,                             -- JSON string
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY ("teamId") REFERENCES "Team" ("id")
);

-- ---------------------------------------------------------------------------
-- Porting to Postgres / Supabase
-- ---------------------------------------------------------------------------
-- 1. In prisma/schema.prisma, change `provider = "sqlite"` to `"postgresql"`
--    and point DATABASE_URL at your Postgres instance.
-- 2. Optionally convert the JSON-as-TEXT columns to native types for cleaner
--    querying:
--      "members"         TEXT[]  instead of TEXT
--      "unlockedLevels"  INT[]   instead of TEXT
--      "collectedWords"  TEXT[]  instead of TEXT
--      "details"         JSONB   instead of TEXT
--    (the app layer already isolates all JSON encode/decode in
--    src/lib/json.ts, so this is a contained change).
-- 3. Run `npx prisma db push` (or generate a proper migration with
--    `npx prisma migrate dev`) against the new datasource.
-- 4. If you want Supabase Realtime instead of the built-in polling, enable
--    replication on these tables and swap the polling hooks in
--    src/hooks/useTeamStatus.ts and src/components/admin/* for a Supabase
--    Realtime subscription — the REST API shape stays the same either way.
