#!/usr/bin/env bash
set -euo pipefail

app=/var/www/sak-erp-test
stage=/tmp/mizantra-mrp-release-readiness-20260829
backup=/root/sak-deploy-backups/mizantra-mrp-release-readiness-$(date +%Y%m%d-%H%M%S)

test "$PWD" = "$app"
test "$(readlink -f "$app")" = "$app"
test -f "$stage/apps/web/.next/BUILD_ID"
test -f "$stage/apps/api/dist/intelligence/mrp-release-readiness.service.js"

mkdir -p "$backup"
tar -czf "$backup/files-before.tar.gz" \
  apps/api/src/intelligence/mrp-release.service.ts \
  apps/api/src/intelligence/intelligence.module.ts \
  apps/api/dist/intelligence/mrp-release.service.js \
  apps/api/dist/intelligence/mrp-release.service.js.map \
  apps/api/dist/intelligence/intelligence.module.js \
  apps/api/dist/intelligence/intelligence.module.js.map \
  apps/web/src/app/dashboard/production/mrp/page.tsx
if [ -f apps/api/src/intelligence/mrp-release-readiness.service.ts ]; then
  cp apps/api/src/intelligence/mrp-release-readiness.service.ts "$backup/"
else
  touch "$backup/readiness-source-was-absent"
fi
if [ -f apps/api/dist/intelligence/mrp-release-readiness.service.js ]; then
  cp apps/api/dist/intelligence/mrp-release-readiness.service.js* "$backup/"
else
  touch "$backup/readiness-runtime-was-absent"
fi

cp "$stage/apps/api/src/intelligence/mrp-release-readiness.service.ts" apps/api/src/intelligence/
cp "$stage/apps/api/src/intelligence/mrp-release.service.ts" apps/api/src/intelligence/
cp "$stage/apps/api/src/intelligence/intelligence.module.ts" apps/api/src/intelligence/
cp "$stage/apps/api/dist/intelligence/mrp-release-readiness.service.js"* apps/api/dist/intelligence/
cp "$stage/apps/api/dist/intelligence/mrp-release.service.js"* apps/api/dist/intelligence/
cp "$stage/apps/api/dist/intelligence/intelligence.module.js"* apps/api/dist/intelligence/
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
  if [ -f "$backup/readiness-source-was-absent" ]; then rm -f -- apps/api/src/intelligence/mrp-release-readiness.service.ts; else cp "$backup/mrp-release-readiness.service.ts" apps/api/src/intelligence/; fi
  if [ -f "$backup/readiness-runtime-was-absent" ]; then rm -f -- apps/api/dist/intelligence/mrp-release-readiness.service.js apps/api/dist/intelligence/mrp-release-readiness.service.js.map; else cp "$backup/mrp-release-readiness.service.js"* apps/api/dist/intelligence/; fi
  pm2 restart sak-api-test sak-web-test
  echo 'MRP readiness deployment failed health checks; previous test runtime restored.' >&2
  exit 1
fi

echo "Mizantra TEST MRP readiness gate deployed and verified. Backup: $backup"
