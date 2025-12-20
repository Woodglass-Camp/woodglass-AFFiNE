#!/usr/bin/env bash
set -euo pipefail

image="${1:?Usage: pack-image.sh <image:tag> [output.tar.gz]}"
out="${2:-}"

repo_root="$(git rev-parse --show-toplevel)"
cd "$repo_root"

mkdir -p "deploy/selfhost/dist"

if [[ -z "$out" ]]; then
  ts="$(date +%Y%m%d-%H%M%S)"
  safe_name="$(printf '%s' "$image" | tr '/:@' '___')"
  out="deploy/selfhost/dist/${safe_name}-${ts}.tar.gz"
fi

docker image inspect "$image" >/dev/null 2>&1 || {
  echo "Docker image not found: $image" >&2
  exit 1
}

echo "Saving image '$image' to '$out'"
docker save "$image" | gzip -c >"$out"
echo "Done: $out"

