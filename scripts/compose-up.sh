#!/usr/bin/env bash
# `npm run compose:up` calls this with no args; `npm run compose:dns` calls
# it with `dns` to also start the DNS sidecar.
#
# Makes `docker compose up` work with zero manual setup on any machine or
# VM: generates .env + a JWT_SECRET the first time, auto-detects this
# machine's LAN IP for HOST_IP (used by the optional dns profile), and
# prints the URL(s) to reach the app on.
set -euo pipefail
cd "$(dirname "$0")/.."

ENV_FILE=".env"

if [ ! -f "$ENV_FILE" ]; then
  echo "==> No .env found — creating one for this machine..."
  touch "$ENV_FILE"
fi

if ! grep -q '^JWT_SECRET=' "$ENV_FILE" 2>/dev/null; then
  echo "==> Generating JWT_SECRET..."
  GENERATED_SECRET=$(openssl rand -base64 48 | tr -d '\n')
  printf 'JWT_SECRET="%s"\n' "$GENERATED_SECRET" >> "$ENV_FILE"
fi

detect_lan_ip() {
  if [[ "$OSTYPE" == "darwin"* ]]; then
    ipconfig getifaddr en0 2>/dev/null || ipconfig getifaddr en1 2>/dev/null || true
    return
  fi
  local ip
  ip="$(hostname -I 2>/dev/null | awk '{print $1}')"
  if [ -z "$ip" ]; then
    ip="$(ip route get 1.1.1.1 2>/dev/null | awk '{for (i=1;i<=NF;i++) if ($i=="src") print $(i+1)}')"
  fi
  echo "$ip"
}

# Auto-detected every run unless the caller already exported HOST_IP (e.g. a
# cloud VM behind NAT where the private-IP autodetect would be wrong).
if [ -z "${HOST_IP:-}" ]; then
  DETECTED_IP="$(detect_lan_ip | head -n1)"
  [ -n "$DETECTED_IP" ] && HOST_IP="$DETECTED_IP"
fi

if [ -n "${HOST_IP:-}" ]; then
  export HOST_IP
  if grep -q '^HOST_IP=' "$ENV_FILE" 2>/dev/null; then
    # BSD sed (macOS) requires an argument to -i; GNU sed (Linux) accepts an
    # empty one the same way, so this one-liner works on both.
    sed -i.bak "s|^HOST_IP=.*|HOST_IP=\"${HOST_IP}\"|" "$ENV_FILE" && rm -f "${ENV_FILE}.bak"
  else
    printf 'HOST_IP="%s"\n' "$HOST_IP" >> "$ENV_FILE"
  fi
fi

HOST_IP_OR_PLACEHOLDER="${HOST_IP:-THIS_MACHINE_IP}"

echo ""
echo "=================================================================="
echo "  OP Day CTF"
echo "  LAN IP detected:  ${HOST_IP:-none — set HOST_IP manually in .env}"
echo ""
echo "  Once containers are up:"
echo "    http://localhost/admin        (this machine only)"
[ -n "${HOST_IP:-}" ] && echo "    http://${HOST_IP}/admin        (share this on the venue wifi)"
echo ""
echo "  aegios.co.in on this wifi network (one venue, one router):"
echo "    npm run compose:dns   — needs router-level DHCP DNS control,"
echo "    or add \"${HOST_IP_OR_PLACEHOLDER} aegios.co.in\" to each device"
echo "    hosts file instead."
echo "=================================================================="
echo ""

# Branches into two full commands rather than building an optional-flag
# array — macOS ships bash 3.2 as /bin/bash, which errors on
# "unbound variable" when expanding an empty array under `set -u`.
if [ "${1:-}" = "dns" ]; then
  exec docker compose -f docker/docker-compose.yml --project-directory . --profile dns up -d --build
else
  exec docker compose -f docker/docker-compose.yml --project-directory . up -d --build
fi
