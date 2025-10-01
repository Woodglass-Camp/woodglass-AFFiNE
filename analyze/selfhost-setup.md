AFFiNE 自托管后端部署与多端同步指引

本文档指导在本机/服务器上部署 AFFiNE 自托管后端，并启用多端（浏览器/桌面）同步。

前置条件
- Docker 与 Docker Compose 已安装
- 使用本仓库的自托管编排：`.docker/selfhost/compose.yml`
- 服务器（或内网主机）可被各设备访问

核心概念：外部地址识别（非常重要）
后端需要知道自己对外被访问的地址，用于生成链接、校验来源、设置 Cookie 等。

- 推荐使用：`AFFINE_SERVER_EXTERNAL_URL`
  - 例如内网：`http://192.168.195.135:3010`
  - 例如域名+HTTPS：`https://woodglass.affine.top`

未正确设置时，链接与实时协作（WebSocket/Cookie）可能异常。

快速启动（HTTP）
- 复制并编辑环境文件：
  - `cp .docker/selfhost/.env.example .docker/selfhost/.env`
  - 编辑 `.docker/selfhost/.env`（最少项）：
    - `AFFINE_REVISION=stable`
    - `PORT=3010`
    - `DB_DATA_LOCATION=~/.affine/self-host/postgres/pgdata`
    - `UPLOAD_LOCATION=~/.affine/self-host/storage`
    - `CONFIG_LOCATION=~/.affine/self-host/config`
    - `AFFINE_SERVER_EXTERNAL_URL=http://192.168.195.135:3010`
- 启动服务：`docker compose -f .docker/selfhost/compose.yml up -d`
- 验证：
  - 容器与日志：
    - `docker compose -f .docker/selfhost/compose.yml ps`
    - `docker logs affine_migration_job -f`
  - 查看后端识别的对外地址：`docker logs affine_server | rg "public server should be recognized as"`
  - 本机连通性：`curl -I http://127.0.0.1:3010`

开启 HTTPS（可选）
- 反向代理（推荐）
  - 用 Nginx/Caddy 在 443 终止 TLS，回源 `http://127.0.0.1:3010`
  - Nginx 最小示例：
    - `server { listen 80; server_name woodglass.affine.top; return 301 https://$host$request_uri; }`
    - `server { listen 443 ssl http2; server_name woodglass.affine.top; ssl_certificate /etc/letsencrypt/live/woodglass.affine.top/fullchain.pem; ssl_certificate_key /etc/letsencrypt/live/woodglass.affine.top/privkey.pem; location / { proxy_pass http://127.0.0.1:3010; proxy_set_header Host $host; proxy_set_header X-Real-IP $remote_addr; proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for; proxy_set_header X-Forwarded-Proto $scheme; proxy_set_header Upgrade $http_upgrade; proxy_set_header Connection "upgrade"; } }`
  - 同时把 `.env` 的 `AFFINE_SERVER_EXTERNAL_URL` 设为 `https://woodglass.affine.top`
- 局域网仅测试
  - 可用 mkcert 生成本地 CA 证书并在设备上信任；反代或 Node 进程加载证书
  - Android 7.0+ 对用户 CA 信任不一致，需谨慎
- 无公网 IP 且想要正规 HTTPS
  - 可用隧道服务（如 Cloudflare Tunnel/Tailscale）在边缘终止 TLS；或通过 DNS-01 预签发证书再本地加载

登录与邮件（多端协作需要账户）
- 自托管默认使用邮箱验证码登录，请配置 SMTP。推荐在配置目录写 `config.json`。
- 目录：容器内 `/root/.affine/config/config.json`（宿主由 `CONFIG_LOCATION` 挂载）
- 最小示例：
  - `{ "server": { "name": "AFFiNE Self Hosted", "externalUrl": "https://woodglass.affine.top", "hosts": ["woodglass.affine.top"] }, "mailer": { "SMTP": { "host": "smtp.example.com", "port": 465, "username": "user", "password": "pass", "sender": "AFFiNE <noreply@example.com>", "ignoreTLS": false } } }`
- 也可通过环境变量配置（参考 `.docker/selfhost/schema.json` 的 `MAILER_*` 描述）

多端同步使用
- Web：在两台设备打开同一地址并登录同一账号，实时协作与同步应正常（确保反代已转发 WebSocket）
- 桌面：AFFiNE Desktop 可连接你的自托管服务（后端 `server.name` 会在连接界面显示）
- 邀请协作：在工作区设置邀请成员，系统会发送邀请邮件（依赖 SMTP）

子路径与多域（可选）
- 子路径：设置 `AFFINE_SERVER_SUB_PATH=/affine`，反代保持子路径转发
- 多域：在 `server.hosts` 中加入额外主机名，允许多来源访问

常见问题排查
- 识别外部地址不对：检查 `.env` 的 `AFFINE_SERVER_EXTERNAL_URL` 与实际访问一致（协议/端口/路径）
- WebSocket 失败：反代需转发 `Upgrade` 与 `Connection: upgrade`，并保留 `Host/X-Forwarded-*`
- 邮件收不到：核对 SMTP 配置；可用 Mailpit 等工具先做联通测试

更新与备份
- 更新：`docker compose -f .docker/selfhost/compose.yml pull && docker compose -f .docker/selfhost/compose.yml up -d`
- 备份：数据库(`DB_DATA_LOCATION`)、上传(`UPLOAD_LOCATION`)、配置(`CONFIG_LOCATION`)

如需，我可以根据你的域名/IP 与 SMTP 信息，直接生成 `.docker/selfhost/.env` 与 `config.json` 模板，并提供可用的 Nginx 配置片段。
