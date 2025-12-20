#!/usr/bin/env bash
set -euo pipefail

echo "Stopping and disabling redsocks..."
sudo systemctl disable --now redsocks || true
echo "OK"

