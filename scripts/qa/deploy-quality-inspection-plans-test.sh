#!/usr/bin/env bash
set -euo pipefail

app=/var/www/sak-erp-test
stage=/tmp/mizantra-quality-plans-20260830
backup=/root/sak-deploy-backups/mizantra-quality-plans-$(date +%Y%m%d-%H%M%S)

test "$PWD" = "$app"
test "$(readlink -f "$app")" = "$app"
test -f "$stage/apps/web/.next/BUILD_ID"
test -f "$stage/apps/api/dist/quality/services/quality.service.js"

paths=(
  apps/api/src/quality/controllers/quality.controller.ts
  apps/api/src/quality/services/quality.service.ts
  apps/api/src/quality/services/quality.service.spec.ts
  apps/api/dist/quality/controllers/quality.controller.js
  apps/api/dist/quality/controllers/quality.controller.js.map
  apps/api/dist/quality/services/quality.service.js
  apps/api/dist/quality/services/quality.service.js.map
  apps/web/src/app/dashboard/quality/inspection-plans/page.tsx
  apps/web/src/components/Sidebar.tsx
  apps/web/src/lib/permission-config.ts
  migrations/add-quality-inspection-plan-control.sql
)

mkdir -p "$backup"
existing=()
for path in "${paths[@]}"; do
  if [ -e "$path" ]; then existing+=("$path"); fi
done
tar -czf "$backup/files-before.tar.gz" "${existing[@]}"
for path in "${paths[@]}"; do
  mkdir -p "$(dirname "$path")"
  cp "$stage/$path" "$path"
done

mv apps/web/.next "$backup/web-next"
mv "$stage/apps/web/.next" apps/web/.next
pm2 restart sak-api-test sak-web-test
pm2 save

verified=false
for _ in 1 2 3 4 5 6 7 8 9 10; do
  api_code="$(curl -sS -o /dev/null -w '%{http_code}' http://127.0.0.1:4001/api/v1/quality/plans || true)"
  page_code="$(curl -sS -o /dev/null -w '%{http_code}' http://127.0.0.1:3001/dashboard/quality/inspection-plans || true)"
  if [[ "$api_code" =~ ^(401|403)$ ]] && [ "$page_code" = 200 ]; then
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
  echo 'Inspection-plan deployment failed health checks; previous Mizantra test runtime restored.' >&2
  exit 1
fi

echo "Mizantra TEST inspection plans deployed and verified. Backup: $backup"
