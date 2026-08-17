#!/usr/bin/env bash
# Single entry point: installs deps, sets up the DB, seeds it if empty, and
# starts the app. Safe to re-run any time — it never overwrites an existing
# .env or wipes existing team progress.
set -euo pipefail
cd "$(dirname "$0")"

# --- Node.js -----------------------------------------------------------
if ! command -v node >/dev/null 2>&1; then
  export NVM_DIR="$HOME/.nvm"
  [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
fi

if ! command -v node >/dev/null 2>&1; then
  echo "Node.js is required but wasn't found." >&2
  echo "Install it from https://nodejs.org, or run:" >&2
  echo '  curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash' >&2
  echo '  nvm install --lts' >&2
  exit 1
fi

# --- Dependencies --------------------------------------------------------
if [ ! -d node_modules ]; then
  echo "==> Installing dependencies (first run, this can take a minute)..."
  npm install
fi

# --- Secrets ---------------------------------------------------------------
if [ ! -f .env ]; then
  echo "==> No .env found — generating fresh secrets..."
  JWT_SECRET=$(openssl rand -base64 48 | tr -d '\n')
  ADMIN_KEY=$(openssl rand -hex 8)
  cat > .env <<EOF
DATABASE_URL="file:./dev.db"
JWT_SECRET="${JWT_SECRET}"
ADMIN_KEY="${ADMIN_KEY}"
NODE_ENV="development"
EOF
  echo ""
  echo "    Game Master master key (for /admin): ${ADMIN_KEY}"
  echo "    (also saved in .env — write it down for event day)"
  echo ""
fi

# --- Database ------------------------------------------------------------
echo "==> Syncing database schema..."
npx prisma generate >/dev/null
npx prisma db push >/dev/null

TEAM_COUNT=$(node -e "
const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
p.team.count().then((n) => { console.log(n); process.exit(0); }).catch(() => { console.log(0); process.exit(0); });
")

if [ "${TEAM_COUNT}" = "0" ]; then
  echo "==> Database is empty — loading sample teams/levels..."
  npm run db:seed
else
  echo "==> Database already has ${TEAM_COUNT} team(s) registered — skipping seed."
  echo "    (run 'npm run db:reset' if you want to wipe and reseed from scratch)"
fi

# --- Launch ----------------------------------------------------------------
PORT="${PORT:-3000}"
URL="http://localhost:${PORT}"

echo ""
echo "==> Starting OP Day CTF"
echo "    App:   ${URL}"
echo "    Admin: ${URL}/admin"
echo ""

if [[ "$OSTYPE" == "darwin"* ]]; then
  ( sleep 2 && open "${URL}" ) >/dev/null 2>&1 &
fi

exec npm run dev -- -p "${PORT}"
