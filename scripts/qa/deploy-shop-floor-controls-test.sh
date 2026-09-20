#!/usr/bin/env bash
set -euo pipefail

app=/var/www/sak-erp-test
stage=/tmp/mizantra-shop-floor-controls-20260830
backup=/root/sak-deploy-backups/mizantra-shop-floor-controls-$(date +%Y%m%d-%H%M%S)

test "$PWD" = "$app"
test "$(readlink -f "$app")" = "$app"
test -f "$stage/apps/web/.next/BUILD_ID"
test -f "$stage/apps/api/dist/production/services/station-completion.service.js"

paths=(
  apps/api/src/production/controllers/production.controller.ts
  apps/api/src/production/services/work-station.service.ts
  apps/api/src/production/services/work-station.service.spec.ts
  apps/api/src/production/services/station-completion.service.ts
  apps/api/src/production/services/station-completion.service.spec.ts
  apps/api/dist/production/controllers/production.controller.js
  apps/api/dist/production/controllers/production.controller.js.map
  apps/api/dist/production/services/work-station.service.js
  apps/api/dist/production/services/work-station.service.js.map
  apps/api/dist/production/services/station-completion.service.js
  apps/api/dist/production/services/station-completion.service.js.map
  apps/web/src/app/dashboard/shop-floor/page.tsx
  apps/web/src/app/dashboard/work-stations/page.tsx
  apps/web/src/components/Sidebar.tsx
  migrations/add-shop-floor-execution-controls.sql
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
  api_code="$(curl -sS -o /dev/null -w '%{http_code}' http://127.0.0.1:4001/api/v1/production/completions/my-active || true)"
  page_code="$(curl -sS -o /dev/null -w '%{http_code}' http://127.0.0.1:3001/dashboard/shop-floor || true)"
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
  echo 'Shop-floor control deployment failed health checks; previous Mizantra test runtime restored.' >&2
  exit 1
fi

echo "Mizantra TEST shop-floor controls deployed and verified. Backup: $backup"
