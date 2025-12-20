#!/usr/bin/env bash
set -euo pipefail

DOCKER_IF="${DOCKER_IF:-docker0}"
DOCKER_SUBNET="${DOCKER_SUBNET:-}"
CHAIN="${CHAIN:-WG_DOCKER0_REDIR}"

comment="wg-docker0-transparent-proxy"

detect_docker_subnet() {
  docker network inspect bridge --format '{{(index .IPAM.Config 0).Subnet}}' 2>/dev/null || true
}

if [[ -z "$DOCKER_SUBNET" ]]; then
  DOCKER_SUBNET="$(detect_docker_subnet)"
fi

if [[ -n "$DOCKER_SUBNET" && "$DOCKER_SUBNET" != "<no value>" ]]; then
  while sudo iptables -t nat -C PREROUTING -s "$DOCKER_SUBNET" -p tcp -j "$CHAIN" -m comment --comment "$comment" 2>/dev/null; do
    sudo iptables -t nat -D PREROUTING -s "$DOCKER_SUBNET" -p tcp -j "$CHAIN" -m comment --comment "$comment"
  done
fi

while sudo iptables -t nat -C PREROUTING -i "$DOCKER_IF" -p tcp -j "$CHAIN" -m comment --comment "$comment" 2>/dev/null; do
  sudo iptables -t nat -D PREROUTING -i "$DOCKER_IF" -p tcp -j "$CHAIN" -m comment --comment "$comment"
done

sudo iptables -t nat -F "$CHAIN" 2>/dev/null || true
sudo iptables -t nat -X "$CHAIN" 2>/dev/null || true

echo "Disabled transparent proxy for ${DOCKER_SUBNET:-$DOCKER_IF}"
