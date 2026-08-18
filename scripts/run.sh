#!/usr/bin/env bash
# Installs deps, sets up the DB, starts the app.
# Safe to re-run any time. Run from anywhere: bash scripts/run.sh
set -euo pipefail
cd "$(dirname "$0")/.."

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

if [ ! -d node_modules ]; then
  echo "==> Installing dependencies (first run, this can take a minute)..."
  npm install
fi

if [ ! -f .env ]; then
  echo "==> No .env found — generating fresh secrets..."
  JWT_SECRET=$(openssl rand -base64 48 | tr -d '\n')
  cat > .env <<EOF
DATABASE_URL="file:./dev.db"
JWT_SECRET="${JWT_SECRET}"
NODE_ENV="development"
EOF
fi

echo "==> Syncing database schema..."
npx prisma generate >/dev/null
npx prisma db push >/dev/null

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
