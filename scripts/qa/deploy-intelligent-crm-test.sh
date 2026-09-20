#!/usr/bin/env bash
set -euo pipefail

app=/var/www/sak-erp-test
stage=/tmp/mizantra-crm-release-20260902
backup=/root/sak-deploy-backups/mizantra-crm-$(date +%Y%m%d-%H%M%S)

test "$PWD" = "$app"
test "$(readlink -f "$app")" = "$app"
test -f "$stage/apps/api/dist/crm/crm.service.js"
test -f "$stage/apps/api/dist/intelligence/semantic-erp-query.service.js"
test -f "$stage/apps/web/.next/BUILD_ID"
test -f "$stage/apps/web/src/app/dashboard/crm/page.tsx"

sources=(
  apps/api/src/app.module.ts
  apps/api/src/auth/guards/permissions.guard.ts
  apps/api/src/intelligence/conversational-analytics.service.ts
  apps/api/src/intelligence/semantic-erp-query.service.ts
  apps/api/src/crm/crm.module.ts
  apps/api/src/crm/crm.controller.ts
  apps/api/src/crm/crm.service.ts
  apps/web/src/components/Sidebar.tsx
  apps/web/src/lib/permission-config.ts
  apps/web/src/app/dashboard/crm/page.tsx
  migrations/add-intelligent-crm.sql
)

compiled=(
  apps/api/dist/app.module.js
  apps/api/dist/app.module.js.map
  apps/api/dist/auth/guards/permissions.guard.js
  apps/api/dist/auth/guards/permissions.guard.js.map
  apps/api/dist/intelligence/conversational-analytics.service.js
  apps/api/dist/intelligence/conversational-analytics.service.js.map
  apps/api/dist/intelligence/semantic-erp-query.service.js
  apps/api/dist/intelligence/semantic-erp-query.service.js.map
)

mkdir -p "$backup"
existing=()
for path in "${sources[@]}"; do
  if [ -e "$path" ]; then existing+=("$path"); fi
done
tar -czf "$backup/sources-before.tar.gz" "${existing[@]}"
compiled_existing=()
for path in "${compiled[@]}"; do
  if [ -e "$path" ]; then compiled_existing+=("$path"); fi
done
tar -czf "$backup/api-compiled-before.tar.gz" "${compiled_existing[@]}"
cp -a apps/web/.next "$backup/web-next"

rollback() {
  rm -rf -- "$app/apps/api/src/crm" "$app/apps/web/src/app/dashboard/crm"
  tar -xzf "$backup/sources-before.tar.gz" -C "$app"
  rm -rf -- "$app/apps/api/dist/crm" "$app/apps/web/.next"
  tar -xzf "$backup/api-compiled-before.tar.gz" -C "$app"
  cp -a "$backup/web-next" "$app/apps/web/.next"
  pm2 restart sak-api-test sak-web-test >/dev/null
  echo "CRM deployment failed; prior Mizantra runtime restored from $backup" >&2
}
trap rollback ERR

for path in "${sources[@]}"; do
  mkdir -p "$(dirname "$path")"
  cp "$stage/$path" "$path"
done
for path in "${compiled[@]}"; do
  mkdir -p "$(dirname "$path")"
  cp "$stage/$path" "$path"
done
rm -rf -- apps/api/dist/crm apps/web/.next
cp -a "$stage/apps/api/dist/crm" apps/api/dist/crm
cp -a "$stage/apps/web/.next" apps/web/.next

pm2 restart sak-api-test sak-web-test >/dev/null
pm2 save >/dev/null

healthy=false
for _ in 1 2 3 4 5 6 7 8 9 10 11 12; do
  api_code=$(curl -sS -o /dev/null -w '%{http_code}' http://127.0.0.1:4001/api/v1/crm/dashboard || true)
  page_code=$(curl -sS -o /dev/null -w '%{http_code}' http://127.0.0.1:3001/dashboard/crm || true)
  if [[ "$api_code" =~ ^(401|403)$ ]] && [ "$page_code" = 200 ]; then
    healthy=true
    break
  fi
  sleep 2
done
test "$healthy" = true
trap - ERR

echo "Mizantra Intelligent CRM deployed and verified. Backup: $backup"
