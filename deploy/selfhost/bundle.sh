#!/usr/bin/env bash
set -euo pipefail

repo_root="$(git rev-parse --show-toplevel)"
cd "$repo_root"

dist_dir="deploy/selfhost/dist"
mkdir -p "$dist_dir"

tmp_dir="$(mktemp -d)"
trap 'rm -rf "$tmp_dir"' EXIT

bundle_root="$tmp_dir/affine-selfhost"
mkdir -p "$bundle_root"

cp ".docker/selfhost/compose.yml" "$bundle_root/compose.yml"
cp "deploy/selfhost/compose.override.yml" "$bundle_root/compose.override.yml"

cp ".docker/selfhost/.env.example" "$bundle_root/.env.example"
cat >>"$bundle_root/.env.example" <<'EOF'

# custom image (required for wrap deploy)
AFFINE_IMAGE=
EOF

cat >"$bundle_root/up.sh" <<'EOF'
#!/usr/bin/env bash
set -euo pipefail
docker compose --env-file .env -f compose.yml -f compose.override.yml up -d
EOF

cat >"$bundle_root/down.sh" <<'EOF'
#!/usr/bin/env bash
set -euo pipefail
docker compose --env-file .env -f compose.yml -f compose.override.yml down
EOF

cat >"$bundle_root/logs.sh" <<'EOF'
#!/usr/bin/env bash
set -euo pipefail
docker compose --env-file .env -f compose.yml -f compose.override.yml logs -f --tail=200
EOF

cat >"$bundle_root/backup-db.sh" <<'EOF'
#!/usr/bin/env bash
set -euo pipefail

set -a
. ./.env
set +a

ts="$(date +%Y%m%d-%H%M%S)"
out_dir="./backups/$ts"
mkdir -p "$out_dir"

db_name="${DB_DATABASE:-affine}"

echo "Dumping DB to $out_dir/db.sql"
docker compose --env-file .env -f compose.yml -f compose.override.yml exec -T \
  -e PGPASSWORD="${DB_PASSWORD:-}" postgres \
  pg_dump -U "${DB_USERNAME:-affine}" --clean --if-exists --no-owner --no-privileges "$db_name" >"$out_dir/db.sql"
EOF

cat >"$bundle_root/backup-files.sh" <<'EOF'
#!/usr/bin/env bash
set -euo pipefail

set -a
. ./.env
set +a

ts="$(date +%Y%m%d-%H%M%S)"
out_dir="./backups/$ts"
mkdir -p "$out_dir"

upload="${UPLOAD_LOCATION%/}"
config="${CONFIG_LOCATION%/}"

if [[ -n "$upload" && -d "$upload" ]]; then
  echo "Backing up storage: $upload"
  tar -czf "$out_dir/storage.tar.gz" -C "$(dirname "$upload")" "$(basename "$upload")"
else
  echo "Storage directory not found: $upload" >&2
fi

if [[ -n "$config" && -d "$config" ]]; then
  echo "Backing up config: $config"
  tar -czf "$out_dir/config.tar.gz" -C "$(dirname "$config")" "$(basename "$config")"
else
  echo "Config directory not found: $config" >&2
fi
EOF

chmod +x "$bundle_root/"*.sh

tar_name="selfhost-bundle.tar.gz"
tar -czf "$dist_dir/$tar_name" -C "$tmp_dir" "affine-selfhost"

echo "Bundle created: $dist_dir/$tar_name"

