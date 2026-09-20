#!/usr/bin/env bash
set -euo pipefail

app=/var/www/sak-erp-test
stage=/tmp/mizantra-production-transformation-cockpit-20260830
backup=/root/sak-deploy-backups/mizantra-production-transformation-cockpit-$(date +%Y%m%d-%H%M%S)

test "$PWD" = "$app"
test "$(readlink -f "$app")" = "$app"
test -f "$stage/apps/web/.next/BUILD_ID"
test -f "$stage/apps/api/dist/mrp/advanced-production-planning.service.js"

paths=(
  apps/api/src/mrp/advanced-production-planning.service.ts
  apps/api/dist/mrp/advanced-production-planning.service.js
  apps/api/dist/mrp/advanced-production-planning.service.js.map
  apps/web/src/app/dashboard/production/planning-control-tower/page.tsx
)

mkdir -p "$backup"
tar -czf "$backup/files-before.tar.gz" "${paths[@]}"
for path in "${paths[@]}"; do cp "$stage/$path" "$path"; done

mv apps/web/.next "$backup/web-next"
mv "$stage/apps/web/.next" apps/web/.next
pm2 restart sak-api-test sak-web-test
pm2 save

verified=false
for _ in 1 2 3 4 5 6 7 8 9 10; do
  api_code="$(curl -sS -o /dev/null -w '%{http_code}' http://127.0.0.1:4001/api/v1/production-planning/control-tower || true)"
  tower_code="$(curl -sS -o /dev/null -w '%{http_code}' http://127.0.0.1:3001/dashboard/production/planning-control-tower || true)"
  if [[ "$api_code" =~ ^(401|403)$ ]] && [ "$tower_code" = 200 ]; then
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
  echo 'Production transformation cockpit deployment failed health checks; previous Mizantra test runtime restored.' >&2
  exit 1
fi

echo "Mizantra TEST production transformation cockpit deployed and verified. Backup: $backup"
