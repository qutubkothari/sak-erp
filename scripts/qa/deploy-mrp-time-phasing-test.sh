#!/usr/bin/env bash
set -euo pipefail

app=/var/www/sak-erp-test
stage=/tmp/mizantra-mrp-time-phasing-20260830
backup=/root/sak-deploy-backups/mizantra-mrp-time-phasing-$(date +%Y%m%d-%H%M%S)

test "$PWD" = "$app"
test "$(readlink -f "$app")" = "$app"
test -f "$stage/apps/web/.next/BUILD_ID"
test -f "$stage/apps/api/dist/mrp/mrp.service.js"

mkdir -p "$backup"
tar -czf "$backup/files-before.tar.gz" \
  apps/api/src/mrp/mrp.service.ts \
  apps/api/dist/mrp/mrp.service.js \
  apps/api/dist/mrp/mrp.service.js.map \
  apps/web/src/app/dashboard/production/mrp/page.tsx

cp "$stage/apps/api/src/mrp/mrp.service.ts" apps/api/src/mrp/
cp "$stage/apps/api/dist/mrp/mrp.service.js"* apps/api/dist/mrp/
cp "$stage/apps/web/src/app/dashboard/production/mrp/page.tsx" apps/web/src/app/dashboard/production/mrp/

mv apps/web/.next "$backup/web-next"
mv "$stage/apps/web/.next" apps/web/.next
pm2 restart sak-api-test sak-web-test
pm2 save

verified=false
for _ in 1 2 3 4 5 6 7 8 9 10; do
  api_code="$(curl -sS -o /dev/null -w '%{http_code}' http://127.0.0.1:4001/api/v1/mrp/latest || true)"
  web_code="$(curl -sS -o /dev/null -w '%{http_code}' http://127.0.0.1:3001/dashboard/production/mrp || true)"
  if [[ "$api_code" =~ ^(401|403)$ ]] && [ "$web_code" = 200 ]; then
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
  echo 'MRP time-phasing deployment failed health checks; previous test runtime restored.' >&2
  exit 1
fi

echo "Mizantra TEST time-phased MRP deployed and verified. Backup: $backup"
