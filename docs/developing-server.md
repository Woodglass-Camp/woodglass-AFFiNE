# `scripts/start-affine-stack.mjs` 使用指南

以下命令全部在仓库根目录下执行（`/mnt/usbdisk1/emasi/WORKSPACE2/AFFINE_space/woodglass-AFFiNE`）。可以根据需要替换端口或 `--stack-name`，确保不同实例之间不冲突。

## 👨‍💻 日常启动流程（已完成初始化后）

1. **启动数据库服务（终端 1）**

   ```bash
   node scripts/start-affine-stack.mjs \
     --stage db \
     --stack-name emasi \
     --db-port 55432 \
     --redis-port 16379 \
     --mailhog-smtp-port 1126 \
     --mailhog-http-port 8826 \
     --manticore-port 19309
   ```

   - 进程会常驻；需要停止时按 `Ctrl+C`，脚本会自动 `docker compose down`。

2. **启动后端（终端 2）**

   ```bash
   node scripts/start-affine-stack.mjs \
     --stage server \
     --stack-name emasi \
     --db-port 55432 \
     --server-port 3310
   ```

   - 进程会常驻；`Ctrl+C` 会正常退出。

3. **启动前端（终端 3）**
   ```bash
   node scripts/start-affine-stack.mjs \
     --stage web \
     --stack-name emasi \
     --server-port 3310 \
     --web-port 8090
   ```

> 若想一次启动多个阶段，可以把 `--stage` 写成逗号分隔值，例如 `--stage server,web`。

## 🌱 首次初始化 / 重新部署

在全新数据库或执行完 `clean-db` 后，按照以下顺序操作：

1. **启动数据库**（同上 `--stage db`）。
2. **初始化数据库（迁移 + 数据写入）**
   ```bash
   node scripts/start-affine-stack.mjs \
     --stage init-db \
     --stack-name emasi \
     --db-port 55432 \
     --redis-port 16379 \
     --mailhog-smtp-port 1126 \
     --mailhog-http-port 8826 \
     --manticore-port 19309
   ```
   - 实际执行等价于：
     ```bash
     # 在 packages/backend/server 下
     DATABASE_URL=postgres://affine:affine@127.0.0.1:55432/affine yarn prisma migrate dev
     # 在仓库根目录
     DATABASE_URL=postgres://affine:affine@127.0.0.1:55432/affine yarn affine @affine/server data-migration run
     ```
3. **按“日常启动流程”启动 server 与 web。**

## 🧹 清理（删除容器 + 数据卷）

若需重新体验“首启”或彻底清除某个实例的数据，可执行：

```bash
node scripts/start-affine-stack.mjs \
  --stage clean-db \
  --stack-name emasi \
  --db-port 55432 \
  --redis-port 16379 \
  --mailhog-smtp-port 1126 \
  --mailhog-http-port 8826 \
  --manticore-port 19309
```

该命令会调用 `docker compose down -v`，删除容器、网络和所有数据卷。完成后可重新执行“初始化”流程。

## 🔍 常用参数说明

- `--stack-name`：同一个 Docker compose 项目的后缀，用于区分多套实例。不同实例必须使用不同名称。
- `--db-port` / `--redis-port` / `--mailhog-smtp-port` / `--mailhog-http-port` / `--manticore-port`：宿主机映射端口，需与实际占用情况错开。
- `--server-port` / `--web-port`：后端、前端监听端口。
- 其他辅助参数（例如 `--skip-db`、`--keep-db` 等）可通过 `node scripts/start-affine-stack.mjs --help` 查看。

---

以下为旧的手动流程记录，供需要时参考。

This document explains how to start server (@affine/server) locally with Docker

> **Warning**:
>
> This document is not guaranteed to be up-to-date.
> If you find any outdated information, please feel free to open an issue or submit a PR.

## Run required dev services in docker compose

Running yarn's server package (@affine/server) requires some dev services to be running, i.e.:

- postgres
- redis
- mailhog

You can run these services in docker compose by running the following command:

```sh
cp ./.docker/dev/compose.yml.example ./.docker/dev/compose.yml
cp ./.docker/dev/.env.example ./.docker/dev/.env

docker compose -f ./.docker/dev/compose.yml up
```

### Notify

> Starting from AFFiNE 0.20, compose.yml includes a breaking change: the default database image has switched from `postgres:16` to `pgvector/pgvector:pg16`. If you were previously using another major version of Postgres, please change the number after `pgvector/pgvector:pg` to the major version you are using.

## Build native packages (you need to setup rust toolchain first)

Server also requires native packages to be built, you can build them by running the following command:

```sh
# build native
yarn affine @affine/server-native build
```

## Build @affine/reader package

```sh
yarn affine @affine/reader build
```

## Prepare dev environment

```sh
# uncomment all env variables here
cp packages/backend/server/.env.example packages/backend/server/.env

# everytime there are new migrations, init command should runned again
yarn affine server init
```

## Start server

```sh
# at project root
yarn affine server dev
```

when server started, it will created a default user and a pro user for testing:

### default user

Workspace members up to 3

- email: dev@affine.pro
- name: Dev User
- password: dev

### pro user

Workspace members up to 10

- email: pro@affine.pro
- name: Pro User
- password: pro

### team user

Include a default `Team Workspace` and the members up to 10

- email: team@affine.pro
- name: Team User
- password: team

## Start frontend

```sh
# at project root
yarn dev
```

You can login with the user (dev@affine.pro / dev) above to test the server.

## Done

Now you should be able to start developing affine with server enabled.

## Bonus

### Enable prisma studio (Database GUI)

```sh
# available at http://localhost:5555
yarn affine server prisma studio
```

### Seed the db

```sh
yarn affine server seed -h
```
