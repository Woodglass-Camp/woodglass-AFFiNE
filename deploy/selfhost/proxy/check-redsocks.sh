#!/usr/bin/env bash
set -euo pipefail

REDSOCKS_LOCAL_PORT="${REDSOCKS_LOCAL_PORT:-12345}"

echo "redsocks service:"
sudo systemctl --no-pager --full status redsocks || true
echo ""

echo "Listening check (tcp:${REDSOCKS_LOCAL_PORT}):"
sudo ss -lntp | rg ":${REDSOCKS_LOCAL_PORT}\\b" || {
  echo "No listener found on :${REDSOCKS_LOCAL_PORT}" >&2
  exit 1
}

echo ""
echo "iptables (docker0 redirect) quick check:"
sudo iptables -t nat -S PREROUTING | rg "WG_DOCKER0_REDIR|wg-docker0-transparent-proxy" || true
