#!/usr/bin/env bash
set -Eeuo pipefail

if [ "$#" -ne 6 ]; then
  echo "usage: $0 <app-root> <api-process> <web-process> <api-port> <web-port> <env-file>" >&2
  exit 64
fi

app_root="$(readlink -f "$1")"
api_process="$2"
web_process="$3"
api_port="$4"
web_port="$5"
env_file="$6"
release="20260905-generic-mfg-model"
archive="/tmp/$release.tar.gz"
stage="/tmp/$release-stage"

case "$app_root" in
  /var/www/sak-erp|/var/www/sak-erp-test) ;;
  *) echo "refusing unexpected application root: $app_root" >&2; exit 65 ;;
esac
case "$stage" in /tmp/20260905-generic-mfg-model-stage) ;; *) exit 66;; esac
test -f "$archive"
echo "f69e9f501ed03e431d9a36d30ee139c9bb3c5a1acf4e14505b8108a599b52f65  $archive" | sha256sum -c -
cd "$app_root"
test -f "$env_file"
test -f apps/api/dist/main.js
test -f apps/web/.next/BUILD_ID

mkdir -p backups
database_url="$(ENV_FILE="$env_file" NODE_PATH="$app_root/node_modules:$app_root/apps/api/node_modules" node -e "require('dotenv').config({path:process.env.ENV_FILE,quiet:true});process.stdout.write(process.env.DIRECT_URL||process.env.DATABASE_URL||'')")"
test -n "$database_url"
backup_file="backups/database-before-$release.dump"
if ! pg_dump "$database_url" --format=custom --no-owner --no-acl --file="$backup_file"; then
  rm -f -- "$backup_file"
  backup_dir="$(readlink -f backups)"
  sudo docker run --rm --network host --user "$(id -u):$(id -g)" \
    --volume "$backup_dir:/backup" postgres:17 \
    pg_dump "$database_url" --format=custom --no-owner --no-acl \
    --file="/backup/database-before-$release.dump"
fi
test -s "$backup_file"
unset database_url

rm -rf -- "$stage"
mkdir -p "$stage"
tar -xzf "$archive" -C "$stage"
test -f "$stage/apps/api/dist/main.js"
test -f "$stage/apps/web/.next/BUILD_ID"

cp "$stage/migrations/add-generic-manufacturing-model.sql" migrations/add-generic-manufacturing-model.sql
ENV_FILE="$env_file" node - <<'NODE'
const fs = require('fs');
require('dotenv').config({ path: process.env.ENV_FILE, quiet: true });
const { Client } = require('pg');
(async () => {
  const connection = new URL(process.env.DIRECT_URL || process.env.DATABASE_URL);
  ['sslmode', 'sslrootcert', 'sslcert', 'sslkey'].forEach((key) => connection.searchParams.delete(key));
  const client = new Client({ connectionString: connection.toString(), ssl: { rejectUnauthorized: false } });
  await client.connect();
  await client.query(fs.readFileSync('migrations/add-generic-manufacturing-model.sql', 'utf8'));
  await client.end();
  console.log('Generic manufacturing model migration applied.');
})().catch((error) => { console.error(error); process.exit(1); });
NODE

runtime_paths=(apps/api/dist apps/web/.next)
rollback() {
  status=$?
  trap - ERR
  if [ "$status" -eq 0 ]; then return; fi
  pm2 stop "$api_process" "$web_process" >/dev/null 2>&1 || true
  for path in "${runtime_paths[@]}"; do
    if [ -e "$app_root/$path.pre-$release" ]; then
      rm -rf -- "$app_root/$path"
      mv -- "$app_root/$path.pre-$release" "$app_root/$path"
    fi
  done
  pm2 restart "$api_process" "$web_process" --update-env >/dev/null 2>&1 || true
  exit "$status"
}
trap rollback ERR

for path in "${runtime_paths[@]}"; do
  test ! -e "$app_root/$path.pre-$release"
  mv -- "$app_root/$path" "$app_root/$path.pre-$release"
  mv -- "$stage/$path" "$app_root/$path"
done
cp "$stage/apps/api/src/mrp/advanced-production-planning.controller.ts" apps/api/src/mrp/
cp "$stage/apps/api/src/mrp/advanced-production-planning.service.ts" apps/api/src/mrp/
cp "$stage/apps/api/src/mrp/manufacturing-model-engine.ts" apps/api/src/mrp/
cp "$stage/apps/api/src/mrp/manufacturing-model-engine.spec.ts" apps/api/src/mrp/
mkdir -p apps/web/src/app/dashboard/production/manufacturing-models
cp "$stage/apps/web/src/app/dashboard/production/manufacturing-models/page.tsx" apps/web/src/app/dashboard/production/manufacturing-models/
cp "$stage/apps/web/src/app/dashboard/production/smart-planning/page.tsx" apps/web/src/app/dashboard/production/smart-planning/
cp "$stage/apps/web/src/components/Sidebar.tsx" apps/web/src/components/

pm2 restart "$api_process" "$web_process" --update-env
pm2 save
api_ok=0; web_ok=0; model_ok=0
for _ in $(seq 1 30); do
  api_status="$(curl -sS -o /dev/null -w '%{http_code}' "http://127.0.0.1:$api_port/api/v1/production-planning/masters" || true)"
  web_status="$(curl -sS -o /dev/null -w '%{http_code}' "http://127.0.0.1:$web_port/dashboard/production/smart-planning" || true)"
  model_status="$(curl -sS -o /dev/null -w '%{http_code}' "http://127.0.0.1:$web_port/dashboard/production/manufacturing-models" || true)"
  [[ "$api_status" =~ ^(401|403)$ ]] && api_ok=1
  [[ "$web_status" =~ ^(200|307)$ ]] && web_ok=1
  [[ "$model_status" =~ ^(200|307)$ ]] && model_ok=1
  if [ "$api_ok" -eq 1 ] && [ "$web_ok" -eq 1 ] && [ "$model_ok" -eq 1 ]; then break; fi
  sleep 1
done
test "$api_ok" -eq 1
test "$web_ok" -eq 1
test "$model_ok" -eq 1
pm2 describe "$api_process" | grep -q online
pm2 describe "$web_process" | grep -q online

trap - ERR
rm -rf -- "$stage"
rm -f -- "$archive"
echo "GENERIC_MANUFACTURING_MODEL_DEPLOYED api=$api_status planning=$web_status models=$model_status"
