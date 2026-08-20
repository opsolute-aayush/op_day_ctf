#!/bin/sh
# Container startup: sync the DB schema, start the server.
set -e

if [ -z "$JWT_SECRET" ]; then
  echo "ERROR: JWT_SECRET is not set. Pass it with -e JWT_SECRET=... (generate with: openssl rand -base64 48)" >&2
  exit 1
fi

mkdir -p "$(dirname "${DATABASE_URL#file:}")" 2>/dev/null || true

echo "==> Syncing database schema..."
npx prisma db push --skip-generate

echo "==> Seeding cipher hint bank..."
npx tsx prisma/seed-cipher-hints.ts

echo "==> Starting OP Day CTF on port ${PORT:-3000}"
exec node_modules/.bin/next start -H 0.0.0.0 -p "${PORT:-3000}"
