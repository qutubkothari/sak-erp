#!/usr/bin/env bash
set -Eeuo pipefail

app=/var/www/sak-erp-test
stage=/tmp/mizantra-engineering-release-snapshot
release=engineering-release-snapshot-20260906
backup="$app/backups/$release-$(date +%Y%m%d-%H%M%S)"

[[ "$PWD" == "$app" ]]
[[ "$(readlink -f "$app")" == "$app" ]]
[[ -f "$stage/apps/api/src/items/services/items.service.ts" ]]
[[ -f "$stage/migrations/complete-engineering-release-snapshot-control.sql" ]]

files=(
  apps/api/src/items/services/items.service.ts
  apps/api/src/inventory/controllers/inventory.controller.ts
  apps/web/src/components/DrawingManager.tsx
)

mkdir -p "$backup"
tar -czf "$backup/source.tgz" "${files[@]}"
[[ ! -d apps/api/dist ]] || tar -czf "$backup/api-dist.tgz" -C apps/api dist
[[ ! -d apps/web/.next ]] || tar -czf "$backup/web-next.tgz" -C apps/web .next

rollback() {
  result=$?
  trap - ERR
  tar -xzf "$backup/source.tgz" -C "$app"
  if [[ -f "$backup/api-dist.tgz" ]]; then rm -rf -- apps/api/dist; tar -xzf "$backup/api-dist.tgz" -C apps/api; fi
  if [[ -f "$backup/web-next.tgz" ]]; then rm -rf -- apps/web/.next; tar -xzf "$backup/web-next.tgz" -C apps/web; fi
  pm2 restart sak-api-test sak-web-test --update-env || true
  exit "$result"
}
trap rollback ERR

for file in "${files[@]}"; do
  mkdir -p "$(dirname "$file")"
  cp -a "$stage/$file" "$file"
done
cp -a "$stage/migrations/complete-engineering-release-snapshot-control.sql" migrations/
cp -a "$stage/scripts/qa/verify-engineering-release-snapshot-schema.cjs" scripts/qa/

pnpm --filter @sak-erp/api build
pnpm --filter @sak-erp/web build
node scripts/apply-sql-env-noverify.cjs apps/api/.env migrations/complete-engineering-release-snapshot-control.sql
node scripts/qa/verify-engineering-release-snapshot-schema.cjs apps/api/.env

pm2 restart sak-api-test sak-web-test --update-env
pm2 save

web_status=000
api_status=000
for _ in $(seq 1 45); do
  web_status=$(curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:3001/dashboard/production/job-orders || true)
  api_status=$(curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:4001/api/v1/inventory/items || true)
  [[ "$web_status" == 200 && "$api_status" == 401 ]] && break
  sleep 2
done
[[ "$web_status" == 200 ]]
[[ "$api_status" == 401 ]]
pm2 describe sak-web-test | grep -q online
pm2 describe sak-api-test | grep -q online

trap - ERR
rm -rf -- "$stage"
printf '{"result":"deployed","backup":"%s","web":%s,"api":%s}\n' "$backup" "$web_status" "$api_status"
