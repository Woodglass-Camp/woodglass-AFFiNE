#!/usr/bin/env bash
set -euo pipefail

image_tag="${1:-woodglass-affine:$(git rev-parse --short HEAD)}"
platform="${PLATFORM:-linux/amd64}"

repo_root="$(git rev-parse --show-toplevel)"
cd "$repo_root"

if [[ "$platform" != "linux/amd64" ]]; then
  echo "Unsupported PLATFORM=$platform (this script targets linux/amd64)" >&2
  exit 1
fi

if ! command -v docker >/dev/null 2>&1; then
  echo "docker not found. Please install Docker first." >&2
  exit 1
fi

echo "Building image: $image_tag ($platform)"
if docker buildx version >/dev/null 2>&1; then
  docker buildx build \
    --platform "$platform" \
    -f deploy/selfhost/Dockerfile \
    -t "$image_tag" \
    --load \
    .
else
  echo "docker buildx not found; falling back to 'docker build'." >&2
  echo "Tip: install buildx for faster/multi-arch builds: https://docs.docker.com/go/buildx/" >&2
  docker build \
    --platform "$platform" \
    -f deploy/selfhost/Dockerfile \
    -t "$image_tag" \
    .
fi

echo "Built image: $image_tag"
echo "Next: bash deploy/selfhost/pack-image.sh $image_tag"
