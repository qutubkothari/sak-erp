#!/usr/bin/env bash
set -euo pipefail

app=/var/www/sak-erp-test
stage=/tmp/mizantra-active-planner-native-executors-20260829
backup=/root/sak-deploy-backups/mizantra-active-planner-native-executors-$(date +%Y%m%d-%H%M%S)
test "$PWD" = "$app"
test "$(readlink -f "$app")" = "$app"
test -f "$stage/apps/web/.next/BUILD_ID"
test -f "$stage/apps/api/dist/intelligence/active-planner.service.js"

mkdir -p "$backup/api-source" "$backup/api-runtime" "$backup/web-source"
if [ -f apps/api/src/intelligence/intelligence.module.ts ]; then
  cp apps/api/src/intelligence/intelligence.module.ts "$backup/api-source/"
fi
cp apps/api/dist/intelligence/intelligence.module.js* "$backup/api-runtime/"
cp apps/api/dist/mrp/mrp.module.js* "$backup/api-runtime/"
cp apps/web/src/components/Sidebar.tsx "$backup/web-source/"
cp apps/web/src/lib/permission-config.ts "$backup/web-source/"

mkdir -p apps/api/src/intelligence
cp "$stage/apps/api/src/intelligence/active-planner.service.ts" apps/api/src/intelligence/
cp "$stage/apps/api/src/intelligence/active-planner.controller.ts" apps/api/src/intelligence/
cp "$stage/apps/api/src/intelligence/active-planner.capabilities.ts" apps/api/src/intelligence/
cp "$stage/apps/api/src/intelligence/intelligence.module.ts" apps/api/src/intelligence/
cp "$stage/apps/api/src/mrp/mrp.module.ts" apps/api/src/mrp/
cp "$stage/apps/api/dist/intelligence/active-planner."*.js* apps/api/dist/intelligence/
cp "$stage/apps/api/dist/intelligence/intelligence.module.js"* apps/api/dist/intelligence/
cp "$stage/apps/api/dist/mrp/mrp.module.js"* apps/api/dist/mrp/
mkdir -p apps/web/src/app/dashboard/active-planner
cp "$stage/apps/web/src/app/dashboard/active-planner/page.tsx" apps/web/src/app/dashboard/active-planner/
cp "$stage/apps/web/src/components/Sidebar.tsx" apps/web/src/components/
cp "$stage/apps/web/src/lib/permission-config.ts" apps/web/src/lib/

mv apps/web/.next "$backup/web-next"
mv "$stage/apps/web/.next" apps/web/.next
pm2 restart sak-api-test sak-web-test
pm2 save

for _ in 1 2 3 4 5 6 7 8 9 10; do
  api_code="$(curl -sS -o /dev/null -w '%{http_code}' -X POST -H 'content-type: application/json' -d '{}' http://127.0.0.1:4001/api/v1/active-planner/interpret || true)"
  if [[ "$api_code" =~ ^(401|403)$ ]] && curl -fsS http://127.0.0.1:3001/dashboard/active-planner >/dev/null; then
    echo "Mizantra TEST Active Planner deployed. Backup: $backup"
    exit 0
  fi
  sleep 2
done

echo 'Active Planner health verification failed.' >&2
exit 1
