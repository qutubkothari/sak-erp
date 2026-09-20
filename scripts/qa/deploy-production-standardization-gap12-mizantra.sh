#!/usr/bin/env bash
set -Eeuo pipefail

app=/var/www/sak-erp-test
stage=/tmp/mizantra-production-standardization-gap12
release=production-standardization-gap12-20260906
backup="$app/backups/$release-$(date +%Y%m%d-%H%M%S)"

[[ "$PWD" == "$app" ]]
[[ "$(readlink -f "$app")" == "$app" ]]
[[ -f "$stage/apps/api/src/projects/projects.service.ts" ]]
[[ -f "$stage/migrations/add-project-manufacturing-structure.sql" ]]

files=(
  apps/api/src/projects/projects.service.ts
  apps/api/src/projects/projects.controller.ts
  apps/api/src/items/services/items.service.ts
  apps/api/src/inventory/controllers/inventory.controller.ts
  apps/api/src/mrp/mrp.service.ts
  apps/web/src/app/dashboard/projects/page.tsx
  apps/web/src/components/DrawingManager.tsx
  scripts/apply-sql-env-noverify.cjs
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
cp -a "$stage/migrations/add-project-manufacturing-structure.sql" migrations/
cp -a "$stage/migrations/add-controlled-engineering-drawing-revisions.sql" migrations/

node scripts/apply-sql-env-noverify.cjs apps/api/.env migrations/add-project-manufacturing-structure.sql
node scripts/apply-sql-env-noverify.cjs apps/api/.env migrations/add-controlled-engineering-drawing-revisions.sql

pnpm --filter @sak-erp/api build
pnpm --filter @sak-erp/web build
pm2 restart sak-api-test sak-web-test --update-env
pm2 save

web_status=000
api_status=000
for _ in $(seq 1 45); do
  web_status=$(curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:3001/dashboard/projects || true)
  api_status=$(curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:4001/api/v1/projects || true)
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
