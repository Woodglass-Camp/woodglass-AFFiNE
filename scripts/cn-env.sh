#!/usr/bin/env bash
set -euo pipefail

# CN-friendly mirrors and timeouts for Yarn installs and binary downloads.
# Usage:
#   source scripts/china-env.sh   # export env into current shell
# or
#   bash scripts/china-env.sh && yarn install   # run in subshell then install

# npm registry via env (picked up by .yarnrc.yml)
export NPM_REGISTRY_SERVER=${NPM_REGISTRY_SERVER:-https://registry.npmmirror.com}

# Common heavy binary mirrors
export ELECTRON_MIRROR=${ELECTRON_MIRROR:-https://npmmirror.com/mirrors/electron/}
export PLAYWRIGHT_DOWNLOAD_HOST=${PLAYWRIGHT_DOWNLOAD_HOST:-https://npmmirror.com/mirrors/playwright/}
export PRISMA_ENGINES_MIRROR=${PRISMA_ENGINES_MIRROR:-https://npmmirror.com/mirrors/prisma/}
export PRISMA_ENGINES_CHECKSUMS_MIRROR=${PRISMA_ENGINES_CHECKSUMS_MIRROR:-https://npmmirror.com/mirrors/prisma/}
export SHARP_DIST_BASE_URL=${SHARP_DIST_BASE_URL:-https://npmmirror.com/mirrors/sharp-libvips/}

# Node headers (node-gyp, prebuilds)
export NODEJS_ORG_MIRROR=${NODEJS_ORG_MIRROR:-https://npmmirror.com/mirrors/node/}
export npm_config_disturl=${npm_config_disturl:-https://npmmirror.com/mirrors/node}

# Optional: Sentry CLI, if used in env
export SENTRYCLI_CDNURL=${SENTRYCLI_CDNURL:-https://npmmirror.com/mirrors/sentry-cli/}

# Yarn robustness knobs
export YARN_ENABLE_INLINE_BUILDS=${YARN_ENABLE_INLINE_BUILDS:-1}
export YARN_ENABLE_TIMINGS=${YARN_ENABLE_TIMINGS:-1}

echo "[cn-env] Applied CN mirrors and Yarn debug env." >&2
