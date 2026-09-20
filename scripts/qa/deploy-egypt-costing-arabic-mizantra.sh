#!/usr/bin/env bash
set -Eeuo pipefail

app=/var/www/sak-erp-test
stage=/tmp/mizantra-egypt-costing-arabic-20260910-v1
release=egypt-costing-arabic-20260910
backup="$app/backups/$release-$(date +%Y%m%d-%H%M%S)"
paths=(
  apps/api/src/costing/costing.service.ts
  apps/api/src/tenant/tenant.service.ts
  apps/api/src/intelligence/active-planner-memory.service.ts
  apps/api/src/intelligence/active-planner.controller.ts
  apps/web/src/lib/locale.tsx
  apps/web/src/components/LanguageSwitch.tsx
  apps/web/src/components/providers.tsx
  apps/web/src/components/Sidebar.tsx
  apps/web/src/app/globals.css
  apps/web/src/app/dashboard/layout.tsx
  apps/web/src/app/dashboard/accounts/costing/page.tsx
  apps/web/src/app/dashboard/active-planner/page.tsx
  apps/web/src/app/dashboard/settings/components/OrganizationSettings.tsx
  migrations/add-egypt-localization.sql
)

[[ "$PWD" == "$app" ]]
[[ "$(readlink -f "$app")" == "$app" ]]
[[ -d "$stage/apps/api/src" ]]

mkdir -p "$backup/source"
for path in "${paths[@]}"; do
  [[ -f "$stage/$path" ]]
  if [[ -f "$path" ]]; then
    mkdir -p "$backup/source/$(dirname "$path")"
    cp -a "$path" "$backup/source/$path"
  fi
done
tar -czf "$backup/api-dist.tgz" -C apps/api dist
tar -czf "$backup/web-next.tgz" -C apps/web .next

rollback() {
  code=$?
  trap - ERR
  pm2 stop sak-api-test sak-web-test >/dev/null 2>&1 || true
  while IFS= read -r -d '' source_path; do
    relative="${source_path#"$backup/source/"}"
    mkdir -p "$(dirname "$relative")"
    cp -a "$source_path" "$relative"
  done < <(find "$backup/source" -type f -print0)
  rm -rf -- apps/api/dist apps/web/.next
  tar -xzf "$backup/api-dist.tgz" -C apps/api
  tar -xzf "$backup/web-next.tgz" -C apps/web
  pm2 restart sak-api-test sak-web-test --update-env >/dev/null 2>&1 || true
  exit "$code"
}
trap rollback ERR

for path in "${paths[@]}"; do
  mkdir -p "$(dirname "$path")"
  cp -a "$stage/$path" "$path"
done

database_url="$(tr -d '\r' < apps/api/.env | sed -n 's/^DATABASE_URL=//p' | head -1)"
[[ -n "$database_url" ]]
psql "$database_url" -v ON_ERROR_STOP=1 -f migrations/add-egypt-localization.sql

pnpm --filter @sak-erp/api build
pnpm --filter @sak-erp/web build
pm2 restart sak-api-test sak-web-test --update-env
pm2 save

api_ok=0
web_ok=0
for _ in $(seq 1 50); do
  api_status="$(curl -sS -o /dev/null -w '%{http_code}' http://127.0.0.1:4001/api/v1/job-orders || true)"
  web_status="$(curl -sS -o /dev/null -w '%{http_code}' http://127.0.0.1:3001/dashboard/accounts/costing || true)"
  [[ "$api_status" =~ ^(401|403)$ ]] && api_ok=1
  [[ "$web_status" =~ ^(200|307|308)$ ]] && web_ok=1
  if (( api_ok && web_ok )); then break; fi
  sleep 2
done
(( api_ok && web_ok ))
pm2 describe sak-api-test | grep -q online
pm2 describe sak-web-test | grep -q online

trap - ERR
rm -rf -- "$stage"
printf '{"deployed":true,"target":"mizantra-only","api":%s,"web":%s,"backup":"%s"}\n' \
  "$api_status" "$web_status" "$backup"
