#!/usr/bin/env bash
set -Eeuo pipefail

app=/var/www/sak-erp-test
stage=/tmp/mizantra-production-completion-20260909-v2
release=production-completion-20260909-v2
backup="$app/backups/$release-$(date +%Y%m%d-%H%M%S)"
env_file="$app/apps/api/.env"

[[ "$PWD" == "$app" ]]
[[ "$(readlink -f "$app")" == "$app" ]]
[[ -f "$env_file" ]]
[[ -d "$stage/apps/api/src" && -d "$stage/apps/web/src" ]]

paths=(
  apps/api/src/production/services/job-order.service.ts
  apps/api/src/production/services/job-order-launch-pack.spec.ts
  apps/web/src/app/dashboard/bom/[id]/routing/page.tsx
  apps/web/src/app/dashboard/production/job-orders/page.tsx
  docs/production/mizantra-production-deep-audit-2026-09-09.md
)

mkdir -p "$backup/source"
for item in "${paths[@]}"; do
  if [[ -f "$item" ]]; then
    mkdir -p "$backup/source/$(dirname "$item")"
    cp -a "$item" "$backup/source/$item"
  fi
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
    if [[ -f "$backup/source/$item" ]]; then
      mkdir -p "$(dirname "$item")"
      cp -a "$backup/source/$item" "$item"
    fi
  done
  rm -rf -- "$app/apps/api/dist" "$app/apps/web/.next"
  tar -xzf "$backup/api-dist.tgz" -C apps/api
  tar -xzf "$backup/web-next.tgz" -C apps/web
  pm2 restart sak-api-test sak-web-test --update-env >/dev/null 2>&1 || true
  echo "Application rollback completed; backup: $backup" >&2
  exit "$code"
}
trap rollback_app ERR

for item in "${paths[@]}"; do
  [[ -f "$stage/$item" ]]
  mkdir -p "$(dirname "$item")"
  cp -a "$stage/$item" "$item"
done

node scripts/qa/audit-unified-production-schema.cjs "$env_file"
pnpm --filter @sak-erp/api exec jest --runInBand \
  src/production/services/job-order-launch-pack.spec.ts \
  src/production/services/station-completion.service.spec.ts \
  src/production/services/work-station.service.spec.ts
pnpm --filter @sak-erp/api build
pnpm --filter @sak-erp/web build
pm2 restart sak-api-test sak-web-test --update-env
pm2 save

api_ok=0
web_ok=0
for _ in $(seq 1 40); do
  api_status="$(curl -sS -o /dev/null -w '%{http_code}' http://127.0.0.1:4001/api/v1/production/completions/my-active || true)"
  route_status="$(curl -sS -o /dev/null -w '%{http_code}' http://127.0.0.1:3001/dashboard/bom/test/routing || true)"
  jobs_status="$(curl -sS -o /dev/null -w '%{http_code}' http://127.0.0.1:3001/dashboard/production/job-orders || true)"
  floor_status="$(curl -sS -o /dev/null -w '%{http_code}' http://127.0.0.1:3001/dashboard/shop-floor || true)"
  [[ "$api_status" =~ ^(401|403)$ ]] && api_ok=1
  [[ "$route_status" == 200 && "$jobs_status" == 200 && "$floor_status" == 200 ]] && web_ok=1
  if (( api_ok && web_ok )); then break; fi
  sleep 2
done
(( api_ok && web_ok ))
pm2 describe sak-api-test | grep -q online
pm2 describe sak-web-test | grep -q online
schema_result="$(node scripts/qa/audit-unified-production-schema.cjs "$env_file")"

trap - ERR
rm -rf -- "$stage"
printf '{"deployed":true,"target":"mizantra-only","api":%s,"routing":%s,"jobOrders":%s,"shopFloor":%s,"backup":"%s","schema":%s}\n' \
  "$api_status" "$route_status" "$jobs_status" "$floor_status" "$backup" "$schema_result"
