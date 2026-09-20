#!/usr/bin/env bash
set -euo pipefail

app=/var/www/sak-erp-test
stage=/tmp/mizantra-bom-revision-governance-20260830
backup=/root/sak-deploy-backups/mizantra-bom-revision-governance-$(date +%Y%m%d-%H%M%S)

test "$PWD" = "$app"
test "$(readlink -f "$app")" = "$app"
test -f "$stage/apps/web/.next/BUILD_ID"
test -f "$stage/apps/api/dist/bom/services/bom.service.js"
test -f "$stage/apps/api/dist/mrp/mrp.service.js"

paths=(
  apps/api/src/bom/controllers/bom.controller.ts
  apps/api/src/bom/services/bom.service.ts
  apps/api/src/mrp/mrp.service.ts
  apps/api/dist/bom/controllers/bom.controller.js
  apps/api/dist/bom/controllers/bom.controller.js.map
  apps/api/dist/bom/services/bom.service.js
  apps/api/dist/bom/services/bom.service.js.map
  apps/api/dist/mrp/mrp.service.js
  apps/api/dist/mrp/mrp.service.js.map
  apps/web/src/app/dashboard/bom/page.tsx
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
  bom_api_code="$(curl -sS -o /dev/null -w '%{http_code}' http://127.0.0.1:4001/api/v1/bom || true)"
  mrp_api_code="$(curl -sS -o /dev/null -w '%{http_code}' http://127.0.0.1:4001/api/v1/mrp/latest || true)"
  web_code="$(curl -sS -o /dev/null -w '%{http_code}' http://127.0.0.1:3001/dashboard/bom || true)"
  if [[ "$bom_api_code" =~ ^(401|403)$ ]] && [[ "$mrp_api_code" =~ ^(401|403)$ ]] && [ "$web_code" = 200 ]; then
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
  echo 'BOM revision-governance deployment failed health checks; previous test runtime restored.' >&2
  exit 1
fi

echo "Mizantra TEST BOM revision governance deployed and verified. Backup: $backup"
