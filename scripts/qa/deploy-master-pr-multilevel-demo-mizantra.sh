#!/usr/bin/env bash
set -Eeuo pipefail

app=/var/www/sak-erp-test
stage=/tmp/mizantra-master-pr-multilevel-demo-20260909-v1
release=master-pr-multilevel-demo-20260909-v1
backup="$app/backups/$release-$(date +%Y%m%d-%H%M%S)"
env_file="$app/apps/api/.env"

[[ "$PWD" == "$app" ]]
[[ "$(readlink -f "$app")" == "$app" ]]
[[ -f "$env_file" ]]
[[ -d "$stage/apps/api/src" && -d "$stage/migrations" ]]

paths=(
  apps/api/src/production/services/job-order.service.ts
  apps/api/src/production/services/job-order-launch-pack.spec.ts
  migrations/seed-mizantra-multilevel-master-pr-demo.sql
)

mkdir -p "$backup/source"
for item in "${paths[@]}"; do
  if [[ -f "$item" ]]; then
    mkdir -p "$backup/source/$(dirname "$item")"
    cp -a "$item" "$backup/source/$item"
  fi
done
tar -czf "$backup/api-dist.tgz" -C apps/api dist

database_url="$(ENV_FILE="$env_file" NODE_PATH="$app/node_modules:$app/apps/api/node_modules" node -e "require('dotenv').config({path:process.env.ENV_FILE,quiet:true});const u=new URL(process.env.DIRECT_URL||process.env.DATABASE_URL);if(u.hostname!=='db.nwkaruzvzwwuftjquypk.supabase.co')throw new Error('Refusing non-Mizantra database');process.stdout.write(u.toString())")"
if ! pg_dump "$database_url" --format=custom --no-owner --no-acl --file="$backup/database.dump"; then
  backup_abs="$(readlink -f "$backup")"
  docker run --rm --network host --user "$(id -u):$(id -g)" \
    --volume "$backup_abs:/backup" postgres:17 \
    pg_dump "$database_url" --format=custom --no-owner --no-acl --file=/backup/database.dump
fi
[[ -s "$backup/database.dump" ]]
unset database_url

rollback_app() {
  code=$?
  trap - ERR
  pm2 stop sak-api-test >/dev/null 2>&1 || true
  for item in "${paths[@]}"; do
    if [[ -f "$backup/source/$item" ]]; then
      mkdir -p "$(dirname "$item")"
      cp -a "$backup/source/$item" "$item"
    elif [[ -f "$item" ]]; then
      rm -f -- "$item"
    fi
  done
  rm -rf -- "$app/apps/api/dist"
  tar -xzf "$backup/api-dist.tgz" -C apps/api
  pm2 restart sak-api-test --update-env >/dev/null 2>&1 || true
  echo "Application rollback completed. Database backup: $backup/database.dump" >&2
  exit "$code"
}
trap rollback_app ERR

for item in "${paths[@]}"; do
  [[ -f "$stage/$item" ]]
  mkdir -p "$(dirname "$item")"
  cp -a "$stage/$item" "$item"
done

pnpm --filter @sak-erp/api exec jest --runInBand src/production/services/job-order-launch-pack.spec.ts
pnpm --filter @sak-erp/api build
node scripts/apply-sql-env-noverify.cjs "$env_file" migrations/seed-mizantra-multilevel-master-pr-demo.sql

pm2 restart sak-api-test --update-env
pm2 save

api_status=000
for _ in $(seq 1 40); do
  api_status="$(curl -sS -o /dev/null -w '%{http_code}' http://127.0.0.1:4001/api/v1/production/job-orders || true)"
  [[ "$api_status" =~ ^(401|403)$ ]] && break
  sleep 2
done
[[ "$api_status" =~ ^(401|403)$ ]]
pm2 describe sak-api-test | grep -q online

trap - ERR
rm -rf -- "$stage"
printf '{"deployed":true,"target":"mizantra-only","api":%s,"backup":"%s"}\n' \
  "$api_status" "$backup"
