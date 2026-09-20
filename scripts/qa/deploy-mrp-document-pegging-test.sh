#!/usr/bin/env bash
set -euo pipefail

app=/var/www/sak-erp-test
stage=/tmp/mizantra-mrp-document-pegging-20260830
backup=/root/sak-deploy-backups/mizantra-mrp-document-pegging-$(date +%Y%m%d-%H%M%S)

test "$PWD" = "$app"
test "$(readlink -f "$app")" = "$app"
test -f "$stage/apps/web/.next/BUILD_ID"
test -f "$stage/apps/api/dist/mrp/mrp.service.js"
test -f "$stage/apps/api/dist/intelligence/mrp-release.service.js"

paths=(
  apps/api/src/mrp/mrp.service.ts
  apps/api/src/intelligence/mrp-release.service.ts
  apps/api/src/intelligence/governed-tool-registry.service.ts
  apps/api/src/intelligence/governed-action.service.ts
  apps/api/dist/mrp/mrp.service.js
  apps/api/dist/mrp/mrp.service.js.map
  apps/api/dist/intelligence/mrp-release.service.js
  apps/api/dist/intelligence/mrp-release.service.js.map
  apps/api/dist/intelligence/governed-tool-registry.service.js
  apps/api/dist/intelligence/governed-tool-registry.service.js.map
  apps/api/dist/intelligence/governed-action.service.js
  apps/api/dist/intelligence/governed-action.service.js.map
  apps/web/src/app/dashboard/production/mrp/page.tsx
)

mkdir -p "$backup"
tar -czf "$backup/files-before.tar.gz" "${paths[@]}"

for path in "${paths[@]}"; do
  cp "$stage/$path" "$path"
done

mv apps/web/.next "$backup/web-next"
mv "$stage/apps/web/.next" apps/web/.next
pm2 restart sak-api-test sak-web-test
pm2 save

verified=false
for _ in 1 2 3 4 5 6 7 8 9 10; do
  api_code="$(curl -sS -o /dev/null -w '%{http_code}' http://127.0.0.1:4001/api/v1/mrp/latest || true)"
  release_code="$(curl -sS -o /dev/null -w '%{http_code}' -X POST -H 'content-type: application/json' -d '{}' http://127.0.0.1:4001/api/v1/intelligence/mrp-release/preview || true)"
  web_code="$(curl -sS -o /dev/null -w '%{http_code}' http://127.0.0.1:3001/dashboard/production/mrp || true)"
  if [[ "$api_code" =~ ^(401|403)$ ]] && [[ "$release_code" =~ ^(401|403)$ ]] && [ "$web_code" = 200 ]; then
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
  echo 'MRP document-pegging deployment failed health checks; previous test runtime restored.' >&2
  exit 1
fi

echo "Mizantra TEST MRP document pegging deployed and verified. Backup: $backup"
