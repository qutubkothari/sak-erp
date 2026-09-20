#!/usr/bin/env bash
set -euo pipefail

app=/var/www/sak-erp-test
stage=/tmp/mizantra-crm-inbound-completion-20260902
backup=/root/sak-deploy-backups/mizantra-crm-inbound-completion-$(date +%Y%m%d-%H%M%S)

test "$PWD" = "$app"
test "$(readlink -f "$app")" = "$app"
test -f "$stage/apps/api/dist/crm/crm-inbound.controller.js"
test -f "$stage/apps/api/dist/whatsapp/whatsapp.service.js"
test -f "$stage/apps/web/src/app/dashboard/crm/page.tsx"
test -f "$stage/migrations/add-crm-inbound-channels.sql"

sources=(
  apps/api/src/crm/crm-inbound.controller.ts
  apps/api/src/crm/crm.controller.ts
  apps/api/src/crm/crm.module.ts
  apps/api/src/crm/crm.service.ts
  apps/api/src/whatsapp/whatsapp.controller.ts
  apps/api/src/whatsapp/whatsapp.module.ts
  apps/api/src/whatsapp/whatsapp.service.ts
  apps/web/src/app/dashboard/crm/page.tsx
  apps/web/src/app/dashboard/settings/whatsapp/page.tsx
  migrations/add-crm-inbound-channels.sql
  scripts/qa/crm-inbound-channel-live.cjs
)

mkdir -p "$backup"
existing=()
for path in "${sources[@]}"; do [ ! -e "$path" ] || existing+=("$path"); done
[ "${#existing[@]}" -eq 0 ] || tar -czf "$backup/sources-before.tar.gz" "${existing[@]}"
[ ! -d apps/api/dist/crm ] || cp -a apps/api/dist/crm "$backup/crm-dist-before"
[ ! -d apps/api/dist/whatsapp ] || cp -a apps/api/dist/whatsapp "$backup/whatsapp-dist-before"
cp -a apps/web/.next "$backup/web-next-before"

rollback() {
  [ ! -f "$backup/sources-before.tar.gz" ] || tar -xzf "$backup/sources-before.tar.gz" -C "$app"
  [ ! -d "$backup/crm-dist-before" ] || { rm -rf -- "$app/apps/api/dist/crm"; cp -a "$backup/crm-dist-before" "$app/apps/api/dist/crm"; }
  [ ! -d "$backup/whatsapp-dist-before" ] || { rm -rf -- "$app/apps/api/dist/whatsapp"; cp -a "$backup/whatsapp-dist-before" "$app/apps/api/dist/whatsapp"; }
  rm -rf -- "$app/apps/web/.next"
  cp -a "$backup/web-next-before" "$app/apps/web/.next"
  pm2 restart sak-api-test sak-web-test >/dev/null
  echo "Focused CRM deployment failed; Mizantra runtime restored from $backup" >&2
}
trap rollback ERR

for path in "${sources[@]}"; do mkdir -p "$(dirname "$path")"; cp "$stage/$path" "$path"; done
rm -rf -- apps/api/dist/crm apps/api/dist/whatsapp
cp -a "$stage/apps/api/dist/crm" apps/api/dist/crm
cp -a "$stage/apps/api/dist/whatsapp" apps/api/dist/whatsapp

node scripts/apply-sql-env-noverify.cjs apps/api/.env migrations/add-crm-inbound-channels.sql
pnpm --filter web build
pm2 restart sak-api-test sak-web-test >/dev/null
pm2 save >/dev/null

healthy=false
for _ in 1 2 3 4 5 6 7 8 9 10 11 12; do
  api_code=$(curl -sS -o /dev/null -w '%{http_code}' http://127.0.0.1:4001/api/v1/crm/dashboard || true)
  page_code=$(curl -sS -o /dev/null -w '%{http_code}' http://127.0.0.1:3001/dashboard/crm || true)
  if [[ "$api_code" =~ ^(401|403)$ ]] && [ "$page_code" = 200 ]; then healthy=true; break; fi
  sleep 2
done
test "$healthy" = true
node scripts/qa/crm-inbound-channel-live.cjs apps/api/.env
trap - ERR
echo "Focused Mizantra CRM inbound completion deployed. Backup: $backup"
