#!/usr/bin/env bash
set -Eeuo pipefail

app=/var/www/sak-erp-test
stage=/tmp/mizantra-ac-duct-configuration
release=ac-duct-configuration-20260907
backup="$app/backups/$release-$(date +%Y%m%d-%H%M%S)"

[[ "$PWD" == "$app" ]]
[[ "$(readlink -f "$app")" == "$app" ]]
[[ -f "$stage/apps/api/src/production/configuration-packs/production-configuration-packs.ts" ]]
[[ -f "$stage/migrations/add-production-uom-bom-basis-and-pack-mapping.sql" ]]

files=(
  apps/api/tsconfig.spec.json
  apps/api/src/production/configuration-packs/production-configuration-packs.ts
  apps/api/src/production/configuration-packs/production-configuration-packs.spec.ts
  apps/api/src/production/controllers/production-standardization.controller.ts
  apps/api/src/production/services/production-standardization.service.ts
  apps/api/src/production/services/bom-quantity-basis.ts
  apps/api/src/production/services/bom-quantity-basis.spec.ts
  apps/api/src/production/services/job-order.service.ts
  apps/api/src/mrp/mrp.service.ts
  apps/web/src/app/dashboard/settings/production-setup/ProductionStandardizationStudio.tsx
  docs/production/mizantra-production-standardization-roadmap.md
)

mkdir -p "$backup"
for file in "${files[@]}"; do
  if [[ -f "$file" ]]; then
    mkdir -p "$backup/source/$(dirname "$file")"
    cp -a "$file" "$backup/source/$file"
  fi
done
[[ ! -d apps/api/dist ]] || tar -czf "$backup/api-dist.tgz" -C apps/api dist
[[ ! -d apps/web/.next ]] || tar -czf "$backup/web-next.tgz" -C apps/web .next

rollback() {
  result=$?
  trap - ERR
  for file in "${files[@]}"; do
    if [[ -f "$backup/source/$file" ]]; then
      mkdir -p "$(dirname "$file")"
      cp -a "$backup/source/$file" "$file"
    else
      rm -f -- "$file"
    fi
  done
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
cp -a "$stage/migrations/add-production-uom-bom-basis-and-pack-mapping.sql" migrations/
cp -a "$stage/scripts/qa/apply-production-standardization-gaps-3-8.cjs" scripts/qa/

node scripts/qa/apply-production-standardization-gaps-3-8.cjs apps/api/.env \
  migrations/add-production-uom-bom-basis-and-pack-mapping.sql
pnpm --filter @sak-erp/api test -- --runInBand \
  src/production/services/bom-quantity-basis.spec.ts \
  src/production/configuration-packs/production-configuration-packs.spec.ts
pnpm --filter @sak-erp/api build
pnpm --filter @sak-erp/web build

pm2 restart sak-api-test sak-web-test --update-env
pm2 save
web_status=000
api_status=000
for _ in $(seq 1 45); do
  web_status=$(curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:3001/dashboard/settings/production-setup || true)
  api_status=$(curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:4001/api/v1/production-standardization/configuration-packs || true)
  [[ "$web_status" == 200 && "$api_status" == 401 ]] && break
  sleep 2
done
[[ "$web_status" == 200 && "$api_status" == 401 ]]
pm2 describe sak-web-test | grep -q online
pm2 describe sak-api-test | grep -q online
trap - ERR
rm -rf -- "$stage"
printf '{"result":"deployed","backup":"%s","web":%s,"api":%s}\n' "$backup" "$web_status" "$api_status"
