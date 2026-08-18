#!/usr/bin/env bash
# One-time bootstrap for HTTPS on aegios.co.in — run this ONCE before the
# first `docker compose -f docker-compose.prod.yml up -d`. After this,
# certs renew themselves (see the certbot/nginx services' loops).
#
# This whole docker/ folder is meant to be self-contained: copy just this
# folder (docker-compose.prod.yml, nginx/app.conf, certbot-init.sh, and a
# .env you create) to a VM — no repo clone needed — cd into it, and run
# this script from there.
#
# Needs, before running:
#   - aegios.co.in's DNS A record already pointing at this machine's public IP
#   - ports 80 and 443 open (Security Group, on AWS)
#   - .env in this same folder, with JWT_SECRET and LETSENCRYPT_EMAIL set
set -euo pipefail
cd "$(dirname "$0")"

DOMAIN="aegios.co.in"
# Explicit project name (-p) so container/volume names are always
# "opday-ctf_*" regardless of what this folder happens to be called on
# whatever machine it's copied to.
COMPOSE=(docker compose -p opday-ctf -f docker-compose.prod.yml)

# LETSENCRYPT_EMAIL is used directly below (not just passed through to a
# container), so it has to actually be loaded into this shell, not just
# present somewhere in .env.
# shellcheck disable=SC1091
[ -f .env ] && set -a && source .env && set +a

if [ -z "${LETSENCRYPT_EMAIL:-}" ]; then
  echo "ERROR: Set LETSENCRYPT_EMAIL in .env first (Let's Encrypt needs it for renewal notices)." >&2
  exit 1
fi

EXISTING=$("${COMPOSE[@]}" run --rm --entrypoint sh certbot -c \
  "test -d /etc/letsencrypt/live/$DOMAIN && echo yes || echo no" 2>/dev/null | tr -d '\r\n')
if [ "$EXISTING" = "yes" ]; then
  echo "==> A certificate for $DOMAIN already exists — nothing to do."
  echo "    (To force a fresh one, remove it first: docker volume rm opday-ctf_certbot_conf)"
  exit 0
fi

echo "==> Creating a temporary self-signed cert so nginx has something to start with..."
"${COMPOSE[@]}" run --rm --entrypoint sh certbot -c "
  mkdir -p /etc/letsencrypt/live/$DOMAIN &&
  openssl req -x509 -nodes -newkey rsa:2048 -days 1 \
    -keyout /etc/letsencrypt/live/$DOMAIN/privkey.pem \
    -out /etc/letsencrypt/live/$DOMAIN/fullchain.pem \
    -subj /CN=localhost
"

echo "==> Starting nginx..."
"${COMPOSE[@]}" up -d nginx

echo "==> Swapping in the real Let's Encrypt certificate..."
"${COMPOSE[@]}" run --rm --entrypoint sh certbot -c "
  rm -rf /etc/letsencrypt/live/$DOMAIN /etc/letsencrypt/archive/$DOMAIN /etc/letsencrypt/renewal/$DOMAIN.conf &&
  certbot certonly --webroot -w /var/www/certbot \
    --email $LETSENCRYPT_EMAIL -d $DOMAIN -d www.$DOMAIN \
    --rsa-key-size 2048 --agree-tos --no-eff-email --non-interactive
"

echo "==> Reloading nginx with the real certificate..."
"${COMPOSE[@]}" exec nginx nginx -s reload

echo "==> Starting the app + renewal loop..."
"${COMPOSE[@]}" up -d

echo ""
echo "Done — https://$DOMAIN should be live."
