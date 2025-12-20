#!/usr/bin/env bash
set -euo pipefail

image_tag="${1:-woodglass-affine:$(git rev-parse --short HEAD)}"
platform="${PLATFORM:-linux/amd64}"

repo_root="$(git rev-parse --show-toplevel)"
cd "$repo_root"

tmp_dir="$(mktemp -d)"
saved_dev_node_modules=""
saved_server_node_modules=""

cleanup() {
  if [[ -d "packages/backend/server/node_modules" ]]; then
    rm -rf "packages/backend/server/node_modules"
  fi

  if [[ -n "$saved_server_node_modules" && -d "$saved_server_node_modules" ]]; then
    mv "$saved_server_node_modules" "packages/backend/server/node_modules"
  fi

  if [[ -n "$saved_dev_node_modules" && -d "$saved_dev_node_modules" ]]; then
    rm -rf "node_modules"
    mv "$saved_dev_node_modules" "node_modules"
  fi

  rm -rf "$tmp_dir"
}
trap cleanup EXIT

if [[ "$platform" != "linux/amd64" ]]; then
  echo "Unsupported PLATFORM=$platform (this script targets linux/amd64)" >&2
  exit 1
fi

host_arch="$(uname -m)"
if [[ "$host_arch" != "x86_64" && "$host_arch" != "amd64" ]]; then
  cat >&2 <<EOF
Host arch is '$host_arch'. Building a linux/amd64 runtime image requires the native addon
(@affine/server-native) to match the runtime arch. Prefer running this build on amd64 Linux.
EOF
  exit 1
fi

if [[ ! -d "node_modules" ]]; then
  echo "[0/5] node_modules not found, running yarn install"
  yarn install
fi

if [[ -d "packages/backend/server/node_modules" ]]; then
  saved_server_node_modules="$tmp_dir/node_modules.server.dev"
  mv "packages/backend/server/node_modules" "$saved_server_node_modules"
fi

echo "[1/5] Build server-native (must match linux/amd64)"
yarn workspace @affine/server-native build

echo "[2/5] Build frontend apps"
yarn affine @affine/web build
yarn affine @affine/admin build
yarn affine @affine/mobile build

echo "[3/5] Build server"
yarn workspace @affine/reader build
yarn workspace @affine/server build

if [[ -d "node_modules" ]]; then
  saved_dev_node_modules="$tmp_dir/node_modules.dev"
  mv "node_modules" "$saved_dev_node_modules"
fi

echo "[4/5] Prepare production dependencies for image"
yarn workspaces focus @affine/server --production
yarn workspace @affine/server prisma generate

rm -rf "packages/backend/server/node_modules"
mv "node_modules" "packages/backend/server/node_modules"

echo "[5/5] Build image: $image_tag ($platform)"
docker buildx build --platform "$platform" -f .github/deployment/node/Dockerfile -t "$image_tag" --load .

echo "Built image: $image_tag"
echo "Next: bash deploy/selfhost/pack-image.sh $image_tag"
