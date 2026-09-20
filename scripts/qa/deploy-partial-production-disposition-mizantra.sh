#!/usr/bin/env bash
set -Eeuo pipefail

app=/var/www/sak-erp-test
stage=/tmp/mizantra-partial-production-disposition-20260908-v1
release=partial-production-disposition-20260908
backup="$app/backups/$release-$(date +%Y%m%d-%H%M%S)"
env_file="$app/apps/api/.env"

[[ "$PWD" == "$app" ]]
[[ "$(readlink -f "$app")" == "$app" ]]
[[ -f "$env_file" ]]
[[ -d "$stage/apps/api/src" && -d "$stage/apps/web/src" && -d "$stage/migrations" ]]

paths=(
  apps/api/src/production/services/station-completion.service.ts
  apps/api/src/production/controllers/production.controller.ts
  apps/web/src/app/dashboard/shop-floor/page.tsx
  migrations/add-partial-production-disposition-control.sql
)

mkdir -p "$backup/source"
for path in "${paths[@]}"; do
  if [[ -f "$path" ]]; then
    mkdir -p "$backup/source/$(dirname "$path")"
    cp -a "$path" "$backup/source/$path"
  fi
done
tar -czf "$backup/api-dist.tgz" -C apps/api dist
tar -czf "$backup/web-next.tgz" -C apps/web .next

database_url="$(ENV_FILE="$env_file" NODE_PATH="$app/node_modules:$app/apps/api/node_modules" node -e "require('dotenv').config({path:process.env.ENV_FILE,quiet:true});const u=new URL(process.env.DIRECT_URL||process.env.DATABASE_URL);if(u.hostname!=='db.nwkaruzvzwwuftjquypk.supabase.co')throw new Error('Refusing non-Mizantra database');process.stdout.write(u.toString())")"
[[ -n "$database_url" ]]
if ! pg_dump "$database_url" --format=custom --no-owner --no-acl --file="$backup/database.dump"; then
  backup_abs="$(readlink -f "$backup")"
  sudo docker run --rm --network host --user "$(id -u):$(id -g)" \
    --volume "$backup_abs:/backup" postgres:17 \
    pg_dump "$database_url" --format=custom --no-owner --no-acl --file=/backup/database.dump
fi
[[ -s "$backup/database.dump" ]]
unset database_url

rollback() {
  code=$?
  trap - ERR
  echo "Deployment failed; restoring Mizantra application files." >&2
  pm2 stop sak-api-test sak-web-test >/dev/null 2>&1 || true
  for path in "${paths[@]}"; do
    if [[ -f "$backup/source/$path" ]]; then
      mkdir -p "$(dirname "$path")"
      cp -a "$backup/source/$path" "$path"
    fi
  done
  rm -rf -- apps/api/dist apps/web/.next
  tar -xzf "$backup/api-dist.tgz" -C apps/api
  tar -xzf "$backup/web-next.tgz" -C apps/web
  pm2 restart sak-api-test sak-web-test --update-env >/dev/null 2>&1 || true
  exit "$code"
}
trap rollback ERR

for path in "${paths[@]}"; do
  [[ -f "$stage/$path" ]]
  mkdir -p "$(dirname "$path")"
  cp -a "$stage/$path" "$path"
done

ENV_FILE="$env_file" node scripts/apply-sql-env-noverify.cjs "$env_file" migrations/add-partial-production-disposition-control.sql
pnpm --filter @sak-erp/api build
pnpm --filter @sak-erp/web build
pm2 restart sak-api-test sak-web-test --update-env
pm2 save

api_ok=0
shop_floor_ok=0
for _ in $(seq 1 40); do
  api_status="$(curl -sS -o /dev/null -w '%{http_code}' http://127.0.0.1:4001/api/v1/production/completions/my-active || true)"
  shop_floor_status="$(curl -sS -o /dev/null -w '%{http_code}' http://127.0.0.1:3001/dashboard/shop-floor || true)"
  [[ "$api_status" =~ ^(401|403)$ ]] && api_ok=1
  [[ "$shop_floor_status" == 200 ]] && shop_floor_ok=1
  if (( api_ok && shop_floor_ok )); then break; fi
  sleep 2
done
(( api_ok && shop_floor_ok ))
pm2 describe sak-api-test | grep -q online
pm2 describe sak-web-test | grep -q online

trap - ERR
rm -rf -- "$stage"
printf '{"deployed":true,"target":"mizantra-only","api":%s,"shopFloor":%s,"backup":"%s"}\n' \
  "$api_status" "$shop_floor_status" "$backup"
