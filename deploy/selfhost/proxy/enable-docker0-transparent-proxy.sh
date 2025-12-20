#!/usr/bin/env bash
set -euo pipefail

DOCKER_IF="${DOCKER_IF:-docker0}"
CHAIN="${CHAIN:-WG_DOCKER0_REDIR}"
REDIR_PORT="${REDIR_PORT:-12345}"

PROXY_SERVER_IP="${PROXY_SERVER_IP:-192.168.195.1}"

comment="wg-docker0-transparent-proxy"

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
  if sudo iptables -t nat -C PREROUTING -i "$DOCKER_IF" -p tcp -j "$CHAIN" -m comment --comment "$comment" 2>/dev/null; then
    return 0
  fi

  sudo iptables -t nat -A PREROUTING -i "$DOCKER_IF" -p tcp -j "$CHAIN" -m comment --comment "$comment"
}

echo "Enabling transparent proxy for docker interface: $DOCKER_IF -> 127.0.0.1:$REDIR_PORT"
ensure_chain
ensure_prerouting
echo "OK"
echo "Check:"
echo "  sudo iptables -t nat -S PREROUTING | rg \"$DOCKER_IF|$CHAIN\""
echo "  sudo iptables -t nat -S $CHAIN"

