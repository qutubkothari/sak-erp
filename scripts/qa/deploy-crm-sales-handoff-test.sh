#!/usr/bin/env bash
set -euo pipefail

app=/var/www/sak-erp-test
stage=/tmp/mizantra-crm-sales-handoff
backup=/root/sak-deploy-backups/mizantra-crm-sales-handoff-$(date +%Y%m%d-%H%M%S)

test "$PWD" = "$app"
test "$(readlink -f "$app")" = "$app"
test -f "$stage/apps/api/dist/crm/crm.service.js"
test -f "$stage/apps/web/.next/BUILD_ID"
test -f "$stage/apps/web/src/app/dashboard/crm/page.tsx"
test -f "$stage/apps/web/src/app/dashboard/sales/page.tsx"

mkdir -p "$backup"
tar -czf "$backup/sources-before.tar.gz" \
  apps/api/src/crm/crm.service.ts \
  apps/web/src/app/dashboard/crm/page.tsx \
  apps/web/src/app/dashboard/sales/page.tsx \
  apps/api/dist/crm/crm.service.js \
  apps/api/dist/crm/crm.service.js.map
mv apps/web/.next "$backup/web-next"

rollback() {
  tar -xzf "$backup/sources-before.tar.gz" -C "$app"
  rm -rf -- "$app/apps/web/.next"
  mv "$backup/web-next" "$app/apps/web/.next"
  pm2 restart sak-api-test sak-web-test >/dev/null
  echo "CRM handoff deployment failed; Mizantra runtime restored from $backup" >&2
}
trap rollback ERR

cp "$stage/apps/api/src/crm/crm.service.ts" apps/api/src/crm/crm.service.ts
cp "$stage/apps/api/dist/crm/crm.service.js" apps/api/dist/crm/crm.service.js
cp "$stage/apps/api/dist/crm/crm.service.js.map" apps/api/dist/crm/crm.service.js.map
cp "$stage/apps/web/src/app/dashboard/crm/page.tsx" apps/web/src/app/dashboard/crm/page.tsx
cp "$stage/apps/web/src/app/dashboard/sales/page.tsx" apps/web/src/app/dashboard/sales/page.tsx
cp -a "$stage/apps/web/.next" apps/web/.next

pm2 restart sak-api-test sak-web-test >/dev/null
pm2 save >/dev/null

healthy=false
for _ in 1 2 3 4 5 6 7 8 9 10 11 12; do
  api_code=$(curl -sS -o /dev/null -w '%{http_code}' http://127.0.0.1:4001/api/v1/crm/dashboard || true)
  crm_code=$(curl -sS -o /dev/null -w '%{http_code}' http://127.0.0.1:3001/dashboard/crm || true)
  sales_code=$(curl -sS -o /dev/null -w '%{http_code}' http://127.0.0.1:3001/dashboard/sales || true)
  if [[ "$api_code" =~ ^(401|403)$ ]] && [ "$crm_code" = 200 ] && [ "$sales_code" = 200 ]; then
    healthy=true
    break
  fi
  sleep 2
done
test "$healthy" = true
trap - ERR

echo "Mizantra CRM-to-Sales handoff deployed and verified. Backup: $backup"
