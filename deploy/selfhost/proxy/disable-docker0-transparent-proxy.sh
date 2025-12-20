#!/usr/bin/env bash
set -euo pipefail

DOCKER_IF="${DOCKER_IF:-docker0}"
CHAIN="${CHAIN:-WG_DOCKER0_REDIR}"

comment="wg-docker0-transparent-proxy"

while sudo iptables -t nat -C PREROUTING -i "$DOCKER_IF" -p tcp -j "$CHAIN" -m comment --comment "$comment" 2>/dev/null; do
  sudo iptables -t nat -D PREROUTING -i "$DOCKER_IF" -p tcp -j "$CHAIN" -m comment --comment "$comment"
done

sudo iptables -t nat -F "$CHAIN" 2>/dev/null || true
sudo iptables -t nat -X "$CHAIN" 2>/dev/null || true

echo "Disabled transparent proxy for $DOCKER_IF"

