#!/usr/bin/env bash
set -euo pipefail

repo_root=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd -P)
cd "$repo_root"

# Load env and run install immutably (if lockfile present)
source scripts/cn-env.sh

exec yarn install "$@"
