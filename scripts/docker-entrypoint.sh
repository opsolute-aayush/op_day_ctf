#!/bin/sh
# Container startup: sync the DB schema, seed on first boot, start the server.
set -e

if [ -z "$JWT_SECRET" ]; then
  echo "ERROR: JWT_SECRET is not set. Pass it with -e JWT_SECRET=... (generate with: openssl rand -base64 48)" >&2
  exit 1
fi

mkdir -p "$(dirname "${DATABASE_URL#file:}")" 2>/dev/null || true

echo "==> Syncing database schema..."
npx prisma db push --skip-generate

if [ "${SEED_ON_BOOT:-true}" = "true" ]; then
  SESSION_COUNT=$(node -e "
    const { PrismaClient } = require('@prisma/client');
    const p = new PrismaClient();
    p.gameSession.count().then((n) => { console.log(n); process.exit(0); }).catch(() => { console.log(0); process.exit(0); });
  ")
  if [ "$SESSION_COUNT" = "0" ]; then
    echo "==> No sessions exist yet — seeding a demo session with sample teams/puzzles..."
    npx tsx prisma/seed.ts || true
  else
    echo "==> Database already has ${SESSION_COUNT} session(s) — skipping seed."
  fi
fi

echo "==> Starting OP Day CTF on port ${PORT:-3000}"
exec node_modules/.bin/next start -H 0.0.0.0 -p "${PORT:-3000}"
