#!/usr/bin/env bash
set -Eeuo pipefail

app=/var/www/sak-erp-test
stage=/tmp/mizantra-partial-production-opening-balance-20260910-v1
release=partial-production-opening-balance-20260910
backup="$app/backups/$release-$(date +%Y%m%d-%H%M%S)"
paths=(
  apps/api/src/production/controllers/job-order.controller.ts
  apps/api/src/production/services/job-order.service.ts
)

[[ "$PWD" == "$app" ]]
[[ "$(readlink -f "$app")" == "$app" ]]
[[ -d "$stage/apps/api/src" ]]

mkdir -p "$backup/source"
for path in "${paths[@]}"; do
  [[ -f "$stage/$path" ]]
  mkdir -p "$backup/source/$(dirname "$path")"
  cp -a "$path" "$backup/source/$path"
done
tar -czf "$backup/api-dist.tgz" -C apps/api dist

rollback() {
  code=$?
  trap - ERR
  pm2 stop sak-api-test >/dev/null 2>&1 || true
  for path in "${paths[@]}"; do
    cp -a "$backup/source/$path" "$path"
  done
  rm -rf -- apps/api/dist
  tar -xzf "$backup/api-dist.tgz" -C apps/api
  pm2 restart sak-api-test --update-env >/dev/null 2>&1 || true
  exit "$code"
}
trap rollback ERR

for path in "${paths[@]}"; do
  cp -a "$stage/$path" "$path"
done

pnpm --filter @sak-erp/api build
pm2 restart sak-api-test --update-env
pm2 save

api_ok=0
for _ in $(seq 1 40); do
  api_status="$(curl -sS -o /dev/null -w '%{http_code}' http://127.0.0.1:4001/api/v1/job-orders || true)"
  [[ "$api_status" =~ ^(401|403)$ ]] && api_ok=1
  if (( api_ok )); then break; fi
  sleep 2
done
(( api_ok ))
pm2 describe sak-api-test | grep -q online

trap - ERR
rm -rf -- "$stage"
printf '{"deployed":true,"target":"mizantra-only","api":%s,"backup":"%s"}\n' \
  "$api_status" "$backup"
