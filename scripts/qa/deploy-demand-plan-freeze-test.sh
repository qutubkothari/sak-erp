#!/usr/bin/env bash
set -euo pipefail

app=/var/www/sak-erp-test
stage=/tmp/mizantra-demand-plan-freeze-20260830
backup=/root/sak-deploy-backups/mizantra-demand-plan-freeze-$(date +%Y%m%d-%H%M%S)

test "$PWD" = "$app"
test "$(readlink -f "$app")" = "$app"
test -f "$stage/apps/web/.next/BUILD_ID"
test -f "$stage/apps/api/dist/mrp/demand-planning.service.js"

paths=(
  apps/api/src/mrp/demand-planning.service.ts
  apps/api/src/mrp/demand-planning.service.spec.ts
  apps/api/dist/mrp/demand-planning.service.js
  apps/api/dist/mrp/demand-planning.service.js.map
  apps/web/src/app/dashboard/production/demand-planning/page.tsx
  migrations/add-demand-plan-freeze-control.sql
)

mkdir -p "$backup"
existing=()
for path in "${paths[@]}"; do
  if [ -e "$path" ]; then existing+=("$path"); fi
done
tar -czf "$backup/files-before.tar.gz" "${existing[@]}"
for path in "${paths[@]}"; do cp "$stage/$path" "$path"; done

mv apps/web/.next "$backup/web-next"
mv "$stage/apps/web/.next" apps/web/.next
pm2 restart sak-api-test sak-web-test
pm2 save

verified=false
for _ in 1 2 3 4 5 6 7 8 9 10; do
  api_code="$(curl -sS -o /dev/null -w '%{http_code}' http://127.0.0.1:4001/api/v1/demand-planning/dashboard || true)"
  page_code="$(curl -sS -o /dev/null -w '%{http_code}' http://127.0.0.1:3001/dashboard/production/demand-planning || true)"
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
  echo 'Demand-plan freeze deployment failed health checks; previous Mizantra test runtime restored.' >&2
  exit 1
fi

echo "Mizantra TEST demand-plan freeze deployed and verified. Backup: $backup"
