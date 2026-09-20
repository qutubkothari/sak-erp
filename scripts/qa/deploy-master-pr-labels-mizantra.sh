#!/usr/bin/env bash
set -Eeuo pipefail

app=/var/www/sak-erp-test
stage=/tmp/mizantra-master-pr-labels-20260909-v2
release=master-pr-labels-20260909-v2
backup="$app/backups/$release-$(date +%Y%m%d-%H%M%S)"
env_file="$app/apps/api/.env"

[[ "$PWD" == "$app" ]]
[[ "$(readlink -f "$app")" == "$app" ]]
[[ -f "$env_file" ]]
[[ -d "$stage/apps/api/src" && -d "$stage/apps/web/src" ]]

paths=(
  apps/api/src/production/services/job-order.service.ts
  apps/api/src/production/services/job-order-launch-pack.spec.ts
  apps/web/src/app/dashboard/production/job-orders/smart-items/page.tsx
)

mkdir -p "$backup/source"
for item in "${paths[@]}"; do
  mkdir -p "$backup/source/$(dirname "$item")"
  cp -a "$item" "$backup/source/$item"
done
tar -czf "$backup/api-dist.tgz" -C apps/api dist
tar -czf "$backup/web-next.tgz" -C apps/web .next

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
  pm2 stop sak-api-test sak-web-test >/dev/null 2>&1 || true
  for item in "${paths[@]}"; do
    cp -a "$backup/source/$item" "$item"
  done
  rm -rf -- "$app/apps/api/dist" "$app/apps/web/.next"
  tar -xzf "$backup/api-dist.tgz" -C apps/api
  tar -xzf "$backup/web-next.tgz" -C apps/web
  pm2 restart sak-api-test sak-web-test --update-env >/dev/null 2>&1 || true
  echo "Application rollback completed. Database backup: $backup/database.dump" >&2
  exit "$code"
}
trap rollback_app ERR

for item in "${paths[@]}"; do
  cp -a "$stage/$item" "$item"
done

pnpm --filter @sak-erp/api exec jest --runInBand src/production/services/job-order-launch-pack.spec.ts
pnpm --filter @sak-erp/api build
pnpm --filter @sak-erp/web build
pm2 restart sak-api-test sak-web-test --update-env
pm2 save

api_status=000
web_status=000
for _ in $(seq 1 45); do
  api_status="$(curl -sS -o /dev/null -w '%{http_code}' http://127.0.0.1:4001/api/v1/production/job-orders || true)"
  web_status="$(curl -sS -o /dev/null -w '%{http_code}' http://127.0.0.1:3001/dashboard/production/job-orders/smart-items || true)"
  if [[ "$api_status" =~ ^(401|403)$ && "$web_status" == 200 ]]; then break; fi
  sleep 2
done
[[ "$api_status" =~ ^(401|403)$ ]]
[[ "$web_status" == 200 ]]
pm2 describe sak-api-test | grep -q online
pm2 describe sak-web-test | grep -q online

trap - ERR
rm -rf -- "$stage"
printf '{"deployed":true,"target":"mizantra-only","api":%s,"web":%s,"backup":"%s"}\n' \
  "$api_status" "$web_status" "$backup"
