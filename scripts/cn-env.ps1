# China-friendly mirrors and timeouts for Yarn installs and binary downloads (PowerShell).
# Usage:
#   . ./scripts/china-env.ps1   # dot-source to import into current session

if (-not $Env:NPM_REGISTRY_SERVER) { $Env:NPM_REGISTRY_SERVER = 'https://registry.npmmirror.com' }

if (-not $Env:ELECTRON_MIRROR) { $Env:ELECTRON_MIRROR = 'https://npmmirror.com/mirrors/electron/' }
if (-not $Env:PLAYWRIGHT_DOWNLOAD_HOST) { $Env:PLAYWRIGHT_DOWNLOAD_HOST = 'https://npmmirror.com/mirrors/playwright/' }
if (-not $Env:PRISMA_ENGINES_MIRROR) { $Env:PRISMA_ENGINES_MIRROR = 'https://npmmirror.com/mirrors/prisma/' }
if (-not $Env:PRISMA_ENGINES_CHECKSUMS_MIRROR) { $Env:PRISMA_ENGINES_CHECKSUMS_MIRROR = 'https://npmmirror.com/mirrors/prisma/' }
if (-not $Env:SHARP_DIST_BASE_URL) { $Env:SHARP_DIST_BASE_URL = 'https://npmmirror.com/mirrors/sharp-libvips/' }

if (-not $Env:NODEJS_ORG_MIRROR) { $Env:NODEJS_ORG_MIRROR = 'https://npmmirror.com/mirrors/node/' }
if (-not $Env:npm_config_disturl) { $Env:npm_config_disturl = 'https://npmmirror.com/mirrors/node' }

if (-not $Env:SENTRYCLI_CDNURL) { $Env:SENTRYCLI_CDNURL = 'https://npmmirror.com/mirrors/sentry-cli/' }

if (-not $Env:YARN_ENABLE_INLINE_BUILDS) { $Env:YARN_ENABLE_INLINE_BUILDS = '1' }
if (-not $Env:YARN_ENABLE_TIMINGS) { $Env:YARN_ENABLE_TIMINGS = '1' }

Write-Host '[cn-env] Applied CN mirrors and Yarn debug env.'
