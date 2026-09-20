#!/usr/bin/env bash
set -euo pipefail

app=/var/www/sak-erp-test
stage=/tmp/mizantra-so-planning-20260829
backup=/root/sak-deploy-backups/mizantra-smart-planning-so-$(date +%Y%m%d-%H%M%S)

test "$PWD" = "$app"
test "$(readlink -f "$app")" = "$app"
test -f "$stage/apps/web/.next/BUILD_ID"
test -f "$stage/apps/api/dist-service.js"
test -f "$stage/migrations/add-smart-production-sales-order-link.sql"

mkdir -p "$backup/source" "$backup/runtime" "$backup/database"
cp apps/api/src/mrp/advanced-production-planning.service.ts "$backup/source/"
cp apps/api/src/mrp/advanced-production-planning.controller.ts "$backup/source/"
cp apps/web/src/app/dashboard/production/smart-planning/page.tsx "$backup/source/"
cp apps/api/dist/mrp/advanced-production-planning.service.js "$backup/runtime/"
cp apps/api/dist/mrp/advanced-production-planning.service.js.map "$backup/runtime/"
cp apps/api/dist/mrp/advanced-production-planning.controller.js "$backup/runtime/"
cp apps/api/dist/mrp/advanced-production-planning.controller.js.map "$backup/runtime/"

eval "$(tr -d '\r' < apps/api/.env)"
test -n "${DATABASE_URL:-}"
pg_dump "$DATABASE_URL" --format=custom --table=public.production_programs \
  --file="$backup/database/production_programs.dump"
psql "$DATABASE_URL" -Atc 'select count(*) from public.production_programs' \
  > "$backup/database/production_programs.count"

cp "$stage/migrations/add-smart-production-sales-order-link.sql" migrations/
bash scripts/apply-test-migration.sh "$app/migrations/add-smart-production-sales-order-link.sql"

cp "$stage/apps/api/src/mrp/advanced-production-planning.service.ts" apps/api/src/mrp/
cp "$stage/apps/api/src/mrp/advanced-production-planning.controller.ts" apps/api/src/mrp/
cp "$stage/apps/web/src/app/dashboard/production/smart-planning/page.tsx" \
  apps/web/src/app/dashboard/production/smart-planning/
cp "$stage/apps/api/dist-service.js" apps/api/dist/mrp/advanced-production-planning.service.js
cp "$stage/apps/api/dist-service.js.map" apps/api/dist/mrp/advanced-production-planning.service.js.map
cp "$stage/apps/api/dist-controller.js" apps/api/dist/mrp/advanced-production-planning.controller.js
cp "$stage/apps/api/dist-controller.js.map" apps/api/dist/mrp/advanced-production-planning.controller.js.map

mv apps/web/.next "$backup/web-next"
mv "$stage/apps/web/.next" apps/web/.next

pm2 restart sak-api-test sak-web-test
pm2 save

verified=false
for _ in 1 2 3 4 5 6 7 8 9 10; do
  api_code="$(curl -sS -o /dev/null -w '%{http_code}' \
    http://127.0.0.1:4001/api/v1/production-planning/sales-orders || true)"
  if [[ "$api_code" =~ ^(401|403)$ ]] \
    && curl -fsS http://127.0.0.1:3001/dashboard/production/smart-planning >/dev/null; then
    verified=true
    break
  fi
  sleep 2
done

if [ "$verified" != true ]; then
  rm -rf apps/web/.next
  mv "$backup/web-next" apps/web/.next
  cp "$backup/source/advanced-production-planning.service.ts" apps/api/src/mrp/
  cp "$backup/source/advanced-production-planning.controller.ts" apps/api/src/mrp/
  cp "$backup/source/page.tsx" apps/web/src/app/dashboard/production/smart-planning/
  cp "$backup/runtime/advanced-production-planning.service.js" apps/api/dist/mrp/
  cp "$backup/runtime/advanced-production-planning.service.js.map" apps/api/dist/mrp/
  cp "$backup/runtime/advanced-production-planning.controller.js" apps/api/dist/mrp/
  cp "$backup/runtime/advanced-production-planning.controller.js.map" apps/api/dist/mrp/
  pm2 restart sak-api-test sak-web-test
  echo 'Deployment health check failed; application runtime was restored.' >&2
  exit 1
fi

echo "Mizantra TEST Sales Order planning deployed and verified. Backup: $backup"
