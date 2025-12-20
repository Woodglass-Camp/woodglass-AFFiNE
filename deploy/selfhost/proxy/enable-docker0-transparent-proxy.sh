#!/usr/bin/env bash
set -euo pipefail

DOCKER_IF="${DOCKER_IF:-docker0}"
DOCKER_SUBNET="${DOCKER_SUBNET:-}"
CHAIN="${CHAIN:-WG_DOCKER0_REDIR}"
REDIR_PORT="${REDIR_PORT:-12345}"

PROXY_SERVER_IP="${PROXY_SERVER_IP:-192.168.195.1}"

comment="wg-docker0-transparent-proxy"

detect_docker_subnet() {
  docker network inspect bridge --format '{{(index .IPAM.Config 0).Subnet}}' 2>/dev/null || true
}

ensure_chain() {
  sudo iptables -t nat -N "$CHAIN" 2>/dev/null || true
  sudo iptables -t nat -F "$CHAIN"

  sudo iptables -t nat -A "$CHAIN" -d "$PROXY_SERVER_IP/32" -j RETURN
  sudo iptables -t nat -A "$CHAIN" -d 0.0.0.0/8 -j RETURN
  sudo iptables -t nat -A "$CHAIN" -d 10.0.0.0/8 -j RETURN
  sudo iptables -t nat -A "$CHAIN" -d 127.0.0.0/8 -j RETURN
  sudo iptables -t nat -A "$CHAIN" -d 169.254.0.0/16 -j RETURN
  sudo iptables -t nat -A "$CHAIN" -d 172.16.0.0/12 -j RETURN
  sudo iptables -t nat -A "$CHAIN" -d 192.168.0.0/16 -j RETURN

  sudo iptables -t nat -A "$CHAIN" -p tcp -m multiport --dports 80,443 -j REDIRECT --to-ports "$REDIR_PORT"
}

ensure_prerouting() {
  if [[ -z "$DOCKER_SUBNET" ]]; then
    DOCKER_SUBNET="$(detect_docker_subnet)"
  fi

  if [[ -z "$DOCKER_SUBNET" || "$DOCKER_SUBNET" == "<no value>" ]]; then
    echo "Failed to detect docker bridge subnet. Set DOCKER_SUBNET=... (e.g. 172.17.0.0/16)" >&2
    exit 1
  fi

  if sudo iptables -t nat -C PREROUTING -s "$DOCKER_SUBNET" -p tcp -j "$CHAIN" -m comment --comment "$comment" 2>/dev/null; then
    return 0
  fi

  while sudo iptables -t nat -C PREROUTING -i "$DOCKER_IF" -p tcp -j "$CHAIN" -m comment --comment "$comment" 2>/dev/null; do
    sudo iptables -t nat -D PREROUTING -i "$DOCKER_IF" -p tcp -j "$CHAIN" -m comment --comment "$comment"
  done

  sudo iptables -t nat -A PREROUTING -s "$DOCKER_SUBNET" -p tcp -j "$CHAIN" -m comment --comment "$comment"
}

echo "Enabling transparent proxy for docker subnet: ${DOCKER_SUBNET:-<detect>} -> 127.0.0.1:$REDIR_PORT"
ensure_chain
ensure_prerouting
echo "OK"
echo "Check:"
echo "  sudo iptables -t nat -S PREROUTING | rg \"$CHAIN|$comment\""
echo "  sudo iptables -t nat -S $CHAIN"
