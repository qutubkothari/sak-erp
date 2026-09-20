#!/usr/bin/env bash
set -euo pipefail

app=/var/www/sak-erp-test
stage=/tmp/mizantra-crm-production-completion-20260902
backup=/root/sak-deploy-backups/mizantra-crm-completion-$(date +%Y%m%d-%H%M%S)

test "$PWD" = "$app"
test "$(readlink -f "$app")" = "$app"
test -f "$stage/apps/api/dist/crm/crm.service.js"
test -f "$stage/apps/api/dist/intelligence/active-planner.service.js"
test -f "$stage/apps/web/src/app/dashboard/crm/page.tsx"
test -f "$stage/migrations/add-crm-production-completion.sql"

sources=(
  apps/api/src/auth/guards/permissions.guard.ts
  apps/api/src/crm/crm.controller.ts
  apps/api/src/crm/crm.module.ts
  apps/api/src/crm/crm-reminder.scheduler.ts
  apps/api/src/crm/crm.service.ts
  apps/api/src/intelligence/active-planner.capabilities.ts
  apps/api/src/intelligence/active-planner.service.ts
  apps/api/src/intelligence/intelligence.module.ts
  apps/web/src/app/dashboard/crm/page.tsx
  apps/web/src/components/Sidebar.tsx
  apps/web/src/lib/rbac.ts
  migrations/add-crm-production-completion.sql
  scripts/qa/crm-production-schema-check.cjs
)

compiled=(
  apps/api/dist/auth/guards/permissions.guard.js
  apps/api/dist/auth/guards/permissions.guard.js.map
  apps/api/dist/intelligence/active-planner.capabilities.js
  apps/api/dist/intelligence/active-planner.capabilities.js.map
  apps/api/dist/intelligence/active-planner.service.js
  apps/api/dist/intelligence/active-planner.service.js.map
  apps/api/dist/intelligence/intelligence.module.js
  apps/api/dist/intelligence/intelligence.module.js.map
)

mkdir -p "$backup"
existing=()
for path in "${sources[@]}"; do
  if [ -e "$path" ]; then existing+=("$path"); fi
done
if [ "${#existing[@]}" -gt 0 ]; then tar -czf "$backup/sources-before.tar.gz" "${existing[@]}"; fi
compiled_existing=()
for path in "${compiled[@]}"; do
  if [ -e "$path" ]; then compiled_existing+=("$path"); fi
done
if [ "${#compiled_existing[@]}" -gt 0 ]; then tar -czf "$backup/api-compiled-before.tar.gz" "${compiled_existing[@]}"; fi
if [ -d apps/api/dist/crm ]; then cp -a apps/api/dist/crm "$backup/crm-dist-before"; fi
cp -a apps/web/.next "$backup/web-next-before"

rollback() {
  if [ -f "$backup/sources-before.tar.gz" ]; then tar -xzf "$backup/sources-before.tar.gz" -C "$app"; fi
  if [ -f "$backup/api-compiled-before.tar.gz" ]; then tar -xzf "$backup/api-compiled-before.tar.gz" -C "$app"; fi
  if [ -d "$backup/crm-dist-before" ]; then rm -rf -- "$app/apps/api/dist/crm"; cp -a "$backup/crm-dist-before" "$app/apps/api/dist/crm"; fi
  rm -rf -- "$app/apps/web/.next"
  cp -a "$backup/web-next-before" "$app/apps/web/.next"
  pm2 restart sak-api-test sak-web-test >/dev/null
  echo "CRM deployment failed; Mizantra runtime restored from $backup" >&2
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
rm -rf -- apps/api/dist/crm
cp -a "$stage/apps/api/dist/crm" apps/api/dist/crm

node scripts/apply-sql-env-noverify.cjs apps/api/.env migrations/add-crm-production-completion.sql
node scripts/qa/crm-production-schema-check.cjs apps/api/.env
pnpm --filter web build

pm2 restart sak-api-test sak-web-test >/dev/null
pm2 save >/dev/null

healthy=false
for _ in 1 2 3 4 5 6 7 8 9 10 11 12; do
  api_code=$(curl -sS -o /dev/null -w '%{http_code}' http://127.0.0.1:4001/api/v1/crm/dashboard || true)
  page_code=$(curl -sS -o /dev/null -w '%{http_code}' http://127.0.0.1:3001/dashboard/crm || true)
  planner_code=$(curl -sS -o /dev/null -w '%{http_code}' http://127.0.0.1:4001/api/v1/active-planner/interpret || true)
  if [[ "$api_code" =~ ^(401|403)$ ]] && [ "$page_code" = 200 ] && [[ "$planner_code" =~ ^(401|403|404)$ ]]; then
    healthy=true
    break
  fi
  sleep 2
done
test "$healthy" = true
trap - ERR

echo "Mizantra CRM production completion deployed. Backup: $backup"
