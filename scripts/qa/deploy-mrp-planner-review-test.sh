#!/usr/bin/env bash
set -euo pipefail

app=/var/www/sak-erp-test
stage=/tmp/mizantra-mrp-planner-review-20260829
backup=/root/sak-deploy-backups/mizantra-mrp-planner-review-$(date +%Y%m%d-%H%M%S)

test "$PWD" = "$app"
test "$(readlink -f "$app")" = "$app"
test -f "$stage/apps/web/.next/BUILD_ID"
test -f "$stage/apps/api/dist/mrp/mrp.service.js"
test -f "$stage/apps/web/src/app/dashboard/production/mrp/PlannerDecisionDialog.tsx"

mkdir -p "$backup"
tar -czf "$backup/files-before.tar.gz" \
  apps/api/src/mrp/mrp.service.ts \
  apps/api/dist/mrp/mrp.service.js \
  apps/api/dist/mrp/mrp.service.js.map \
  apps/web/src/app/dashboard/production/mrp/page.tsx
if [ -f apps/web/src/app/dashboard/production/mrp/PlannerDecisionDialog.tsx ]; then
  cp apps/web/src/app/dashboard/production/mrp/PlannerDecisionDialog.tsx "$backup/PlannerDecisionDialog.tsx"
else
  touch "$backup/dialog-source-was-absent"
fi

cp "$stage/apps/api/src/mrp/mrp.service.ts" apps/api/src/mrp/
cp "$stage/apps/api/dist/mrp/mrp.service.js"* apps/api/dist/mrp/
cp "$stage/apps/web/src/app/dashboard/production/mrp/page.tsx" apps/web/src/app/dashboard/production/mrp/
cp "$stage/apps/web/src/app/dashboard/production/mrp/PlannerDecisionDialog.tsx" apps/web/src/app/dashboard/production/mrp/

mv apps/web/.next "$backup/web-next"
mv "$stage/apps/web/.next" apps/web/.next
pm2 restart sak-api-test sak-web-test
pm2 save

verified=false
for _ in 1 2 3 4 5 6 7 8 9 10; do
  api_code="$(curl -sS -o /dev/null -w '%{http_code}' http://127.0.0.1:4001/api/v1/mrp/latest || true)"
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
  if [ -f "$backup/dialog-source-was-absent" ]; then
    rm -f -- apps/web/src/app/dashboard/production/mrp/PlannerDecisionDialog.tsx
  else
    cp "$backup/PlannerDecisionDialog.tsx" apps/web/src/app/dashboard/production/mrp/
  fi
  pm2 restart sak-api-test sak-web-test
  echo 'MRP planner review deployment failed health checks; previous test runtime restored.' >&2
  exit 1
fi

echo "Mizantra TEST planner review deployed and verified. Backup: $backup"
