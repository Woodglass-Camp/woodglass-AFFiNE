# 自托管离线部署（docker save/scp，wrap 方式）

本目录提供一套 **wrap** 风格的自托管离线部署流程：

- 不改动上游 `.docker/selfhost/compose.yml`
- 通过 `deploy/selfhost/compose.override.yml` 覆盖 `affine`/`affine_migration` 的镜像为“自建镜像”
- 通过 `docker save | gzip` + `scp` 离线分发到服务器（服务器侧不构建）

## 构建机

构建 `linux/amd64` 镜像（推荐在 amd64 Linux 构建机上执行）。该构建流程通过 Dockerfile 固化 Node/Rust/系统依赖环境，避免宿主机差异导致构建不稳定：

```bash
bash deploy/selfhost/build-image.sh woodglass-affine:$(git rev-parse --short HEAD)
```

打包成可传输的离线镜像包：

```bash
bash deploy/selfhost/pack-image.sh woodglass-affine:<tag>
```

生成部署 bundle（compose + env 模板 + 一键脚本）：

```bash
bash deploy/selfhost/bundle.sh
```

## 服务器

1. 复制两个产物到服务器（同一目录即可）：

- `deploy/selfhost/dist/selfhost-bundle.tar.gz`
- `deploy/selfhost/dist/<image>.tar.gz`

2. 在服务器上执行：

```bash
tar -xzf selfhost-bundle.tar.gz
cd affine-selfhost
docker load -i ../<image>.tar.gz
cp .env.example .env
# 必填：AFFINE_IMAGE、DB_PASSWORD
bash up.sh
```

查看日志：

```bash
bash logs.sh
```

备份：

```bash
bash backup-db.sh
bash backup-files.sh
```
