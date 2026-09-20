#!/usr/bin/env bash
set -euo pipefail

app=/var/www/sak-erp-test
stage=/tmp/mizantra-mrp-exception-queue-20260829
backup=/root/sak-deploy-backups/mizantra-mrp-exception-queue-$(date +%Y%m%d-%H%M%S)

test "$PWD" = "$app"
test "$(readlink -f "$app")" = "$app"
test -f "$stage/apps/web/.next/BUILD_ID"
test -f "$stage/apps/api/dist/mrp/mrp-exception.service.js"

mkdir -p "$backup"
tar -czf "$backup/files-before.tar.gz" \
  apps/api/src/mrp/mrp.service.ts \
  apps/api/src/mrp/mrp.module.ts \
  apps/api/src/intelligence/mrp-release.service.ts \
  apps/api/dist/mrp/mrp.service.js \
  apps/api/dist/mrp/mrp.service.js.map \
  apps/api/dist/mrp/mrp.module.js \
  apps/api/dist/mrp/mrp.module.js.map \
  apps/api/dist/intelligence/mrp-release.service.js \
  apps/api/dist/intelligence/mrp-release.service.js.map \
  apps/web/src/app/dashboard/production/mrp/page.tsx \
  apps/web/src/app/dashboard/command-center/exceptions/page.tsx
if [ -f apps/api/src/mrp/mrp-exception.service.ts ]; then cp apps/api/src/mrp/mrp-exception.service.ts "$backup/"; else touch "$backup/exception-source-was-absent"; fi
if [ -f apps/api/dist/mrp/mrp-exception.service.js ]; then cp apps/api/dist/mrp/mrp-exception.service.js* "$backup/"; else touch "$backup/exception-runtime-was-absent"; fi

cp "$stage/apps/api/src/mrp/mrp-exception.service.ts" apps/api/src/mrp/
cp "$stage/apps/api/src/mrp/mrp.service.ts" apps/api/src/mrp/
cp "$stage/apps/api/src/mrp/mrp.module.ts" apps/api/src/mrp/
cp "$stage/apps/api/src/intelligence/mrp-release.service.ts" apps/api/src/intelligence/
cp "$stage/apps/api/dist/mrp/mrp-exception.service.js"* apps/api/dist/mrp/
cp "$stage/apps/api/dist/mrp/mrp.service.js"* apps/api/dist/mrp/
cp "$stage/apps/api/dist/mrp/mrp.module.js"* apps/api/dist/mrp/
cp "$stage/apps/api/dist/intelligence/mrp-release.service.js"* apps/api/dist/intelligence/
cp "$stage/apps/web/src/app/dashboard/production/mrp/page.tsx" apps/web/src/app/dashboard/production/mrp/
cp "$stage/apps/web/src/app/dashboard/command-center/exceptions/page.tsx" apps/web/src/app/dashboard/command-center/exceptions/

mv apps/web/.next "$backup/web-next"
mv "$stage/apps/web/.next" apps/web/.next
pm2 restart sak-api-test sak-web-test
pm2 save

verified=false
for _ in 1 2 3 4 5 6 7 8 9 10; do
  api_code="$(curl -sS -o /dev/null -w '%{http_code}' http://127.0.0.1:4001/api/v1/mrp/latest || true)"
  mrp_code="$(curl -sS -o /dev/null -w '%{http_code}' http://127.0.0.1:3001/dashboard/production/mrp || true)"
  queue_code="$(curl -sS -o /dev/null -w '%{http_code}' http://127.0.0.1:3001/dashboard/command-center/exceptions || true)"
  if [[ "$api_code" =~ ^(401|403)$ ]] && [ "$mrp_code" = 200 ] && [ "$queue_code" = 200 ]; then verified=true; break; fi
  sleep 2
done

if [ "$verified" != true ]; then
  rm -rf -- apps/web/.next
  mv "$backup/web-next" apps/web/.next
  tar -xzf "$backup/files-before.tar.gz" -C "$app"
  if [ -f "$backup/exception-source-was-absent" ]; then rm -f -- apps/api/src/mrp/mrp-exception.service.ts; else cp "$backup/mrp-exception.service.ts" apps/api/src/mrp/; fi
  if [ -f "$backup/exception-runtime-was-absent" ]; then rm -f -- apps/api/dist/mrp/mrp-exception.service.js apps/api/dist/mrp/mrp-exception.service.js.map; else cp "$backup/mrp-exception.service.js"* apps/api/dist/mrp/; fi
  pm2 restart sak-api-test sak-web-test
  echo 'MRP exception queue deployment failed health checks; previous test runtime restored.' >&2
  exit 1
fi

echo "Mizantra TEST MRP exception queue deployed and verified. Backup: $backup"
