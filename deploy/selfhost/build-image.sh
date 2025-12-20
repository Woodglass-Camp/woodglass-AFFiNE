#!/usr/bin/env bash
set -euo pipefail

usage() {
  cat <<'EOF'
Usage:
  build-image.sh [--clean] [image:tag]

Options:
  --clean   Disable Docker build cache for this build and pull latest base images.
EOF
}

clean="0"
image_tag=""

while [[ $# -gt 0 ]]; do
  case "$1" in
    --clean)
      clean="1"
      shift
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    -*)
      echo "Unknown option: $1" >&2
      usage >&2
      exit 2
      ;;
    *)
      if [[ -n "$image_tag" ]]; then
        echo "Unexpected extra argument: $1" >&2
        usage >&2
        exit 2
      fi
      image_tag="$1"
      shift
      ;;
  esac
done

image_tag="${image_tag:-woodglass-affine:$(git rev-parse --short HEAD)}"
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
extra_flags=()
if [[ "$clean" == "1" ]]; then
  extra_flags+=(--no-cache --pull)
fi

if docker buildx version >/dev/null 2>&1; then
  docker buildx build \
    --platform "$platform" \
    -f deploy/selfhost/Dockerfile \
    -t "$image_tag" \
    --load \
    "${extra_flags[@]}" \
    .
else
  echo "docker buildx not found; falling back to 'docker build'." >&2
  echo "Tip: install buildx for faster/multi-arch builds: https://docs.docker.com/go/buildx/" >&2
  docker build \
    --platform "$platform" \
    -f deploy/selfhost/Dockerfile \
    -t "$image_tag" \
    "${extra_flags[@]}" \
    .
fi

echo "Built image: $image_tag"
echo "Next: bash deploy/selfhost/pack-image.sh $image_tag"
