## 面向中国大陆网络的安装与镜像指引

本文档提供“可选、可复现”的 CN 环境优化方案，不影响默认配置。通过环境变量与脚本启用国内镜像与更友好的安装日志，便于在公共仓库和 CI 里复现。

## 快速开始

Linux/macOS（bash/zsh）：

```sh
corepack enable && nvm use
./scripts/cn-install.sh
```

Windows（PowerShell）：

```powershell
corepack enable; nvm use
. ./scripts/cn-env.ps1
yarn install
```

安装过程中会显示内联构建输出与耗时，便于观察进度。

## 提供内容

- 参数化 Yarn 源：`.yarnrc.yml` 读取 `NPM_REGISTRY_SERVER`（默认仍为 npmjs）。
- 常见大文件镜像：Electron、Playwright、Prisma 引擎、sharp/libvips、Node 头文件等，均通过环境变量开启。
- 脚本入口：
  - `scripts/cn-env.sh`（bash）
  - `scripts/cn-env.ps1`（PowerShell）
  - `scripts/cn-install.sh`（一键加载镜像并执行 `yarn install`）

## 环境变量一览（已在脚本中默认赋值）

- Registry
  - `NPM_REGISTRY_SERVER`（默认 `https://registry.npmjs.org`，CN 推荐 `https://registry.npmmirror.com`）
- 大文件/二进制
  - `ELECTRON_MIRROR` → `https://npmmirror.com/mirrors/electron/`
  - `PLAYWRIGHT_DOWNLOAD_HOST` → `https://npmmirror.com/mirrors/playwright/`
  - `PRISMA_ENGINES_MIRROR` / `PRISMA_ENGINES_CHECKSUMS_MIRROR` → `https://npmmirror.com/mirrors/prisma/`
  - `SHARP_DIST_BASE_URL` → `https://npmmirror.com/mirrors/sharp-libvips/`
- Node 头文件 / 预构建
  - `NODEJS_ORG_MIRROR` → `https://npmmirror.com/mirrors/node/`
  - `npm_config_disturl` → `https://npmmirror.com/mirrors/node`
- 可选工具
  - `SENTRYCLI_CDNURL` → `https://npmmirror.com/mirrors/sentry-cli/`
- Yarn 诊断
  - `YARN_ENABLE_INLINE_BUILDS=1`、`YARN_ENABLE_TIMINGS=1`

以上变量由 `scripts/cn-env.sh` 与 `scripts/cn-env.ps1` 统一导出。

## CI 建议

- 在 `yarn install` 前执行：
  - Linux：`bash scripts/cn-env.sh`
  - Windows：`. ./scripts/cn-env.ps1`
- 使用 `yarn install --immutable`，并缓存 `.yarn/cache` 与 `~/.cache/yarn`。

## 常见问题与技巧

- Electron/Prisma 下载慢或失败：确认已加载本文件所述镜像变量后重试。
- 仅做前端开发，暂时跳过 Electron 下载：`ELECTRON_SKIP_BINARY_DOWNLOAD=1 yarn install`。
- Playwright 浏览器需单独安装：`npx playwright install`（可保留 `PLAYWRIGHT_DOWNLOAD_HOST`）。
- 验证变量是否生效：`echo $ELECTRON_MIRROR`（或 PowerShell `echo $Env:ELECTRON_MIRROR`）。
- 有企业代理时可同时设置 `HTTP_PROXY/HTTPS_PROXY/NO_PROXY` 环境变量，与本镜像方案并用。

## 注意

- 这些更改为“可选增强”，默认行为与国外环境保持一致；不会强行更改仓库的全局源配置。
- 我们通过环境变量切换 registry 与镜像，避免把镜像地址写死在仓库配置里，便于开源共享与跨地区复现。
