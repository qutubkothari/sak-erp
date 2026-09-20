#!/usr/bin/env bash
set -euo pipefail

app=/var/www/sak-erp-test
stage=/tmp/mizantra-aps-dated-capacity-20260830
backup=/root/sak-deploy-backups/mizantra-aps-dated-capacity-$(date +%Y%m%d-%H%M%S)

test "$PWD" = "$app"
test "$(readlink -f "$app")" = "$app"
test -f "$stage/apps/web/.next/BUILD_ID"
test -f "$stage/apps/api/dist/mrp/advanced-production-planning.service.js"

paths=(
  apps/api/src/mrp/advanced-production-planning.service.ts
  apps/api/dist/mrp/advanced-production-planning.service.js
  apps/api/dist/mrp/advanced-production-planning.service.js.map
  apps/web/src/app/dashboard/production/smart-planning/page.tsx
)

mkdir -p "$backup"
tar -czf "$backup/files-before.tar.gz" "${paths[@]}"
for path in "${paths[@]}"; do cp "$stage/$path" "$path"; done
cp "$stage/migrations/add-aps-capacity-calendar.sql" migrations/add-aps-capacity-calendar.sql

mv apps/web/.next "$backup/web-next"
mv "$stage/apps/web/.next" apps/web/.next
pm2 restart sak-api-test sak-web-test
pm2 save

verified=false
for _ in 1 2 3 4 5 6 7 8 9 10; do
  api_code="$(curl -sS -o /dev/null -w '%{http_code}' http://127.0.0.1:4001/api/v1/production-planning/dashboard || true)"
  planning_code="$(curl -sS -o /dev/null -w '%{http_code}' http://127.0.0.1:3001/dashboard/production/smart-planning || true)"
  mrp_code="$(curl -sS -o /dev/null -w '%{http_code}' http://127.0.0.1:3001/dashboard/production/mrp || true)"
  if [[ "$api_code" =~ ^(401|403)$ ]] && [ "$planning_code" = 200 ] && [ "$mrp_code" = 200 ]; then
    verified=true
    break
  fi
  sleep 2
done

if [ "$verified" != true ]; then
  rm -rf -- "$app/apps/web/.next"
  mv "$backup/web-next" "$app/apps/web/.next"
  tar -xzf "$backup/files-before.tar.gz" -C "$app"
  pm2 restart sak-api-test sak-web-test
  echo 'APS dated-capacity deployment failed health checks; previous Mizantra test runtime restored.' >&2
  exit 1
fi

echo "Mizantra TEST APS dated capacity deployed and verified. Backup: $backup"
