#!/usr/bin/env bash
set -Eeuo pipefail

app=/var/www/sak-erp-test
stage=/tmp/mizantra-partial-production-continuation-20260910-v1
release=partial-production-continuation-20260910
backup="$app/backups/$release-$(date +%Y%m%d-%H%M%S)"
paths=(
  apps/api/src/production/controllers/job-order.controller.ts
  apps/api/src/production/services/job-order.service.ts
  apps/api/src/production/services/station-completion.service.ts
  apps/web/src/app/dashboard/shop-floor/page.tsx
  apps/web/src/app/dashboard/production/job-orders/page.tsx
)

[[ "$PWD" == "$app" ]]
[[ "$(readlink -f "$app")" == "$app" ]]
[[ -d "$stage/apps/api/src" && -d "$stage/apps/web/src" ]]

mkdir -p "$backup/source"
for path in "${paths[@]}"; do
  [[ -f "$stage/$path" ]]
  mkdir -p "$backup/source/$(dirname "$path")"
  cp -a "$path" "$backup/source/$path"
done
tar -czf "$backup/api-dist.tgz" -C apps/api dist
tar -czf "$backup/web-next.tgz" -C apps/web .next

rollback() {
  code=$?
  trap - ERR
  pm2 stop sak-api-test sak-web-test >/dev/null 2>&1 || true
  for path in "${paths[@]}"; do
    cp -a "$backup/source/$path" "$path"
  done
  rm -rf -- apps/api/dist apps/web/.next
  tar -xzf "$backup/api-dist.tgz" -C apps/api
  tar -xzf "$backup/web-next.tgz" -C apps/web
  pm2 restart sak-api-test sak-web-test --update-env >/dev/null 2>&1 || true
  exit "$code"
}
trap rollback ERR

for path in "${paths[@]}"; do
  cp -a "$stage/$path" "$path"
done

pnpm --filter @sak-erp/api build
pnpm --filter @sak-erp/web build
pm2 restart sak-api-test sak-web-test --update-env
pm2 save

api_ok=0
web_ok=0
for _ in $(seq 1 45); do
  api_status="$(curl -sS -o /dev/null -w '%{http_code}' http://127.0.0.1:4001/api/v1/production/completions/my-active || true)"
  web_status="$(curl -sS -o /dev/null -w '%{http_code}' http://127.0.0.1:3001/dashboard/shop-floor || true)"
  [[ "$api_status" =~ ^(401|403)$ ]] && api_ok=1
  [[ "$web_status" == 200 ]] && web_ok=1
  if (( api_ok && web_ok )); then break; fi
  sleep 2
done
(( api_ok && web_ok ))
pm2 describe sak-api-test | grep -q online
pm2 describe sak-web-test | grep -q online

trap - ERR
rm -rf -- "$stage"
printf '{"deployed":true,"target":"mizantra-only","api":%s,"shopFloor":%s,"backup":"%s"}\n' \
  "$api_status" "$web_status" "$backup"
