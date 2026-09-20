#!/usr/bin/env bash
set -euo pipefail

app=/var/www/sak-erp-test
stage=/tmp/mizantra-mrp-release-control-20260829
backup=/root/sak-deploy-backups/mizantra-mrp-release-control-$(date +%Y%m%d-%H%M%S)

test "$PWD" = "$app"
test "$(readlink -f "$app")" = "$app"
test -f "$stage/apps/web/.next/BUILD_ID"
test -f "$stage/apps/api/dist/intelligence/mrp-release.service.js"
test -f "$stage/apps/api/src/intelligence/mrp-release.service.ts"

mkdir -p "$backup"
paths=(
  apps/api/src/intelligence/governed-tool-registry.service.ts
  apps/api/src/intelligence/governed-action.service.ts
  apps/api/src/intelligence/intelligence.controller.ts
  apps/api/src/intelligence/intelligence.module.ts
  apps/api/src/mrp/mrp.module.ts
  apps/web/src/app/dashboard/production/mrp/page.tsx
  apps/api/dist/intelligence/governed-tool-registry.service.js
  apps/api/dist/intelligence/governed-tool-registry.service.js.map
  apps/api/dist/intelligence/governed-action.service.js
  apps/api/dist/intelligence/governed-action.service.js.map
  apps/api/dist/intelligence/intelligence.controller.js
  apps/api/dist/intelligence/intelligence.controller.js.map
  apps/api/dist/intelligence/intelligence.module.js
  apps/api/dist/intelligence/intelligence.module.js.map
  apps/api/dist/mrp/mrp.module.js
  apps/api/dist/mrp/mrp.module.js.map
)
existing=()
for path in "${paths[@]}"; do
  if [ -f "$path" ]; then existing+=("$path"); fi
done
if [ -f apps/api/src/intelligence/mrp-release.service.ts ]; then
  existing+=(apps/api/src/intelligence/mrp-release.service.ts)
else
  touch "$backup/mrp-release-source-was-absent"
fi
if [ -f apps/api/dist/intelligence/mrp-release.service.js ]; then
  existing+=(apps/api/dist/intelligence/mrp-release.service.js)
else
  touch "$backup/mrp-release-runtime-was-absent"
fi
if [ -f apps/api/dist/intelligence/mrp-release.service.js.map ]; then
  existing+=(apps/api/dist/intelligence/mrp-release.service.js.map)
fi
tar -czf "$backup/files-before.tar.gz" "${existing[@]}"

mkdir -p apps/api/src/intelligence apps/api/src/mrp apps/api/dist/intelligence apps/api/dist/mrp apps/web/src/app/dashboard/production/mrp
cp "$stage/apps/api/src/intelligence/governed-tool-registry.service.ts" apps/api/src/intelligence/
cp "$stage/apps/api/src/intelligence/governed-action.service.ts" apps/api/src/intelligence/
cp "$stage/apps/api/src/intelligence/mrp-release.service.ts" apps/api/src/intelligence/
cp "$stage/apps/api/src/intelligence/intelligence.controller.ts" apps/api/src/intelligence/
cp "$stage/apps/api/src/intelligence/intelligence.module.ts" apps/api/src/intelligence/
cp "$stage/apps/api/src/mrp/mrp.module.ts" apps/api/src/mrp/
cp "$stage/apps/api/dist/intelligence/governed-tool-registry.service.js"* apps/api/dist/intelligence/
cp "$stage/apps/api/dist/intelligence/governed-action.service.js"* apps/api/dist/intelligence/
cp "$stage/apps/api/dist/intelligence/mrp-release.service.js"* apps/api/dist/intelligence/
cp "$stage/apps/api/dist/intelligence/intelligence.controller.js"* apps/api/dist/intelligence/
cp "$stage/apps/api/dist/intelligence/intelligence.module.js"* apps/api/dist/intelligence/
cp "$stage/apps/api/dist/mrp/mrp.module.js"* apps/api/dist/mrp/
cp "$stage/apps/web/src/app/dashboard/production/mrp/page.tsx" apps/web/src/app/dashboard/production/mrp/

mv apps/web/.next "$backup/web-next"
mv "$stage/apps/web/.next" apps/web/.next
pm2 restart sak-api-test sak-web-test
pm2 save

verified=false
for _ in 1 2 3 4 5 6 7 8 9 10; do
  api_code="$(curl -sS -o /dev/null -w '%{http_code}' -X POST -H 'content-type: application/json' -d '{}' http://127.0.0.1:4001/api/v1/intelligence/mrp-release/preview || true)"
  page_code="$(curl -sS -o /dev/null -w '%{http_code}' http://127.0.0.1:3001/dashboard/production/mrp || true)"
  if [[ "$api_code" =~ ^(401|403)$ ]] && [ "$page_code" = 200 ]; then
    verified=true
    break
  fi
  sleep 2
done

if [ "$verified" != true ]; then
  rm -rf -- apps/web/.next
  mv "$backup/web-next" apps/web/.next
  tar -xzf "$backup/files-before.tar.gz" -C "$app"
  if [ -f "$backup/mrp-release-source-was-absent" ]; then rm -f -- apps/api/src/intelligence/mrp-release.service.ts; fi
  if [ -f "$backup/mrp-release-runtime-was-absent" ]; then rm -f -- apps/api/dist/intelligence/mrp-release.service.js apps/api/dist/intelligence/mrp-release.service.js.map; fi
  pm2 restart sak-api-test sak-web-test
  echo 'MRP release deployment failed health checks; previous test runtime restored.' >&2
  exit 1
fi

echo "Mizantra TEST MRP release control deployed and verified. Backup: $backup"
