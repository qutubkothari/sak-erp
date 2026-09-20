#!/usr/bin/env bash
set -Eeuo pipefail

app=/var/www/sak-erp-test
stage=/tmp/mizantra-ac-duct-demo-baseline
release=ac-duct-demo-baseline-20260907
backup="$app/backups/$release-$(date +%Y%m%d-%H%M%S)"
files=(
  apps/api/src/production/configuration-packs/production-configuration-packs.ts
  apps/api/src/production/configuration-packs/production-configuration-packs.spec.ts
  apps/web/src/app/dashboard/settings/production-setup/ProductionStandardizationStudio.tsx
)

[[ "$PWD" == "$app" ]]
[[ "$(readlink -f "$app")" == "$app" ]]
for file in "${files[@]}"; do [[ -f "$stage/$file" ]]; done

mkdir -p "$backup/source"
for file in "${files[@]}"; do
  mkdir -p "$backup/source/$(dirname "$file")"
  cp -a "$file" "$backup/source/$file"
done
tar -czf "$backup/api-dist.tgz" -C apps/api dist
tar -czf "$backup/web-next.tgz" -C apps/web .next

rollback() {
  result=$?
  trap - ERR
  for file in "${files[@]}"; do cp -a "$backup/source/$file" "$file"; done
  rm -rf -- apps/api/dist apps/web/.next
  tar -xzf "$backup/api-dist.tgz" -C apps/api
  tar -xzf "$backup/web-next.tgz" -C apps/web
  pm2 restart sak-api-test sak-web-test --update-env >/dev/null 2>&1 || true
  exit "$result"
}
trap rollback ERR

for file in "${files[@]}"; do cp -a "$stage/$file" "$file"; done
pnpm --filter @sak-erp/api exec jest src/production/configuration-packs/production-configuration-packs.spec.ts --runInBand
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
printf '{"result":"deployed","target":"mizantra-only","backup":"%s","web":%s,"api":%s}\n' "$backup" "$web_status" "$api_status"
