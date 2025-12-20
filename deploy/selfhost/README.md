# Self-host (offline, save/scp) — wrap deploy

This directory provides a **wrap-style** self-host flow:

- Keep upstream `.docker/selfhost/compose.yml` unchanged.
- Use `deploy/selfhost/compose.override.yml` to point `affine` and `affine_migration` to **your custom image**.
- Ship artifacts to the server via `docker save | gzip` + `scp` (no server-side build).

## Build machine

Build a `linux/amd64` image (recommended on an amd64 Linux build machine):

```bash
bash deploy/selfhost/build-image.sh woodglass-affine:$(git rev-parse --short HEAD)
```

Pack it to a transferable archive:

```bash
bash deploy/selfhost/pack-image.sh woodglass-affine:<tag>
```

Create a deploy bundle (compose + env template + one-click scripts):

```bash
bash deploy/selfhost/bundle.sh
```

## Server

1. Copy both artifacts to the server:

- `deploy/selfhost/dist/selfhost-bundle.tar.gz`
- `deploy/selfhost/dist/<image>.tar.gz`

2. On the server:

```bash
tar -xzf selfhost-bundle.tar.gz
cd affine-selfhost
docker load -i ../<image>.tar.gz
cp .env.example .env
# set AFFINE_IMAGE and DB_PASSWORD (required)
bash up.sh
```

Logs:

```bash
bash logs.sh
```

Backups:

```bash
bash backup-db.sh
bash backup-files.sh
```
