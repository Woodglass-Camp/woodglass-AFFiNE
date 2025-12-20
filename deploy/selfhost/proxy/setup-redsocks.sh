#!/usr/bin/env bash
set -euo pipefail

PROXY_SERVER_HOST="${PROXY_SERVER_HOST:-192.168.195.1}"
PROXY_SERVER_PORT="${PROXY_SERVER_PORT:-7890}"
PROXY_TYPE="${PROXY_TYPE:-socks5}"

REDSOCKS_LOCAL_IP="${REDSOCKS_LOCAL_IP:-127.0.0.1}"
REDSOCKS_LOCAL_PORT="${REDSOCKS_LOCAL_PORT:-12345}"

REDSOCKS_CONF="${REDSOCKS_CONF:-/etc/redsocks.conf}"

if ! command -v sudo >/dev/null 2>&1; then
  echo "sudo not found. Please install sudo or run as root." >&2
  exit 1
fi

echo "Installing redsocks (requires sudo)..."
sudo apt-get update
sudo apt-get install -y redsocks

if [[ -f "$REDSOCKS_CONF" ]]; then
  ts="$(date +%Y%m%d-%H%M%S)"
  backup="${REDSOCKS_CONF}.bak.${ts}"
  echo "Backing up existing config: $REDSOCKS_CONF -> $backup"
  sudo cp "$REDSOCKS_CONF" "$backup"
fi

echo "Writing redsocks config: $REDSOCKS_CONF"
tmp="$(mktemp)"
cat >"$tmp" <<EOF
base {
  log_debug = off;
  log_info = on;
  daemon = on;
  redirector = iptables;
}

redsocks {
  local_ip = ${REDSOCKS_LOCAL_IP};
  local_port = ${REDSOCKS_LOCAL_PORT};
  ip = ${PROXY_SERVER_HOST};
  port = ${PROXY_SERVER_PORT};
  type = ${PROXY_TYPE};
}
EOF

sudo install -m 0644 "$tmp" "$REDSOCKS_CONF"
rm -f "$tmp"

echo "Enabling and starting redsocks..."
sudo systemctl enable --now redsocks
sudo systemctl restart redsocks

echo ""
echo "OK. Next:"
echo "  REDIR_PORT=${REDSOCKS_LOCAL_PORT} PROXY_SERVER_IP=${PROXY_SERVER_HOST} bash deploy/selfhost/proxy/enable-docker0-transparent-proxy.sh"
echo "Check:"
echo "  bash deploy/selfhost/proxy/check-redsocks.sh"

