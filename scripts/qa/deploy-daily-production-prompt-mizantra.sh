#!/usr/bin/env bash
set -Eeuo pipefail

app=/var/www/sak-erp-test
archive=/tmp/mizantra-daily-production-20260908-194858.tar.gz
release=daily-production-prompt-20260908
backup="$app/backups/$release-$(date +%Y%m%d-%H%M%S)"

[[ "$PWD" == "$app" ]]
[[ "$(readlink -f "$app")" == "$app" ]]
[[ -f "$archive" ]]

files=(
  apps/api/src/intelligence/active-planner.capabilities.ts
  apps/api/src/intelligence/active-planner.service.ts
  apps/api/src/production/services/job-order.service.ts
  apps/api/src/production/controllers/job-order.controller.ts
  apps/web/src/app/dashboard/active-planner/page.tsx
)

mkdir -p "$backup/source"
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
    fi
  done
  if [[ -f "$backup/api-dist.tgz" ]]; then
    rm -rf -- "$app/apps/api/dist"
    tar -xzf "$backup/api-dist.tgz" -C "$app/apps/api"
  fi
  if [[ -f "$backup/web-next.tgz" ]]; then
    rm -rf -- "$app/apps/web/.next"
    tar -xzf "$backup/web-next.tgz" -C "$app/apps/web"
  fi
  pm2 restart sak-api-test sak-web-test --update-env || true
  exit "$result"
}
trap rollback ERR

tar -xzf "$archive" -C "$app"
pnpm --filter @sak-erp/api build
pnpm --filter @sak-erp/web build
pm2 restart sak-api-test sak-web-test --update-env
pm2 save

web_status=000
api_status=000
for _ in $(seq 1 45); do
  web_status=$(curl -sS -o /dev/null -w '%{http_code}' http://127.0.0.1:3001/dashboard/active-planner || true)
  api_status=$(curl -sS -o /dev/null -w '%{http_code}' -X POST -H 'content-type: application/json' -d '{}' http://127.0.0.1:4001/api/v1/active-planner/interpret || true)
  [[ "$web_status" == 200 && "$api_status" =~ ^(401|403)$ ]] && break
  sleep 2
done
[[ "$web_status" == 200 ]]
[[ "$api_status" =~ ^(401|403)$ ]]
pm2 describe sak-web-test | grep -q online
pm2 describe sak-api-test | grep -q online

trap - ERR
printf '{"result":"deployed","target":"mizantra","backup":"%s","web":%s,"api":%s}\n' "$backup" "$web_status" "$api_status"
