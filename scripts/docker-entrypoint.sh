#!/bin/sh
# Runs once per container start: validate required secrets, sync the SQLite
# schema against the mounted /app/data volume, seed sample data on first
# boot only, then hand off to the real server process (`npm start`).
set -e

if [ -z "$JWT_SECRET" ]; then
  echo "ERROR: JWT_SECRET is not set. Pass it with -e JWT_SECRET=... (generate with: openssl rand -base64 48)" >&2
  exit 1
fi

if [ -z "$ADMIN_KEY" ]; then
  echo "ERROR: ADMIN_KEY is not set. Pass it with -e ADMIN_KEY=... (this is the /admin master key)" >&2
  exit 1
fi

mkdir -p "$(dirname "${DATABASE_URL#file:}")" 2>/dev/null || true

echo "==> Syncing database schema..."
npx prisma db push --skip-generate

if [ "${SEED_ON_BOOT:-true}" = "true" ]; then
  TEAM_COUNT=$(node -e "
    const { PrismaClient } = require('@prisma/client');
    const p = new PrismaClient();
    p.team.count().then((n) => { console.log(n); process.exit(0); }).catch(() => { console.log(0); process.exit(0); });
  ")
  if [ "$TEAM_COUNT" = "0" ]; then
    echo "==> Database is empty — seeding sample teams/puzzles..."
    npx tsx prisma/seed.ts || true
  else
    echo "==> Database already has ${TEAM_COUNT} team(s) — skipping seed."
  fi
fi

echo "==> Starting OP Day CTF on port ${PORT:-3000}"
exec node_modules/.bin/next start -H 0.0.0.0 -p "${PORT:-3000}"
