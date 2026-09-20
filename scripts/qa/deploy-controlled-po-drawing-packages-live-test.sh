#!/usr/bin/env bash
set -Eeuo pipefail

stage=/tmp/controlled-po-packages-20260912
stamp="$(date +%Y%m%d-%H%M%S)"
live=/var/www/sak-erp
test=/var/www/sak-erp-test
db_backup="/home/qutubk/sak-deploy-backups/controlled-po-drawings-before-${stamp}.tgz"

common_files=(
  apps/api/src/items/services/items.service.ts
  apps/api/src/inventory/controllers/inventory.controller.ts
  apps/api/src/purchase/services/purchase-orders.service.ts
  apps/web/src/components/DrawingManager.tsx
  apps/web/src/components/PODrawingPackageSelector.tsx
)
orders_file=apps/web/src/app/dashboard/purchase/orders/page.tsx
sources_staged=0

rollback() {
  code=$?
  if (( code != 0 && sources_staged == 1 )); then
    echo "Controlled drawing-package deployment failed; restoring prior application sources." >&2
    for app in "$live" "$test"; do
      backup="$app/backups/controlled-po-drawings-${stamp}"
      for file in "${common_files[@]}" "$orders_file"; do
        if [[ -f "$backup/$file" ]]; then
          mkdir -p "$app/$(dirname "$file")"
          cp -a "$backup/$file" "$app/$file"
        elif [[ -f "$backup/.absent-${file//\//_}" ]]; then
          rm -f -- "$app/$file"
        fi
      done
      (cd "$app" && SAK_LIVE_RELEASE_APPROVED=YES SAK_LIVE_RELEASE_TICKET=CONTROLLED-PO-DRAWINGS-20260912 pnpm --filter @sak-erp/api build && SAK_LIVE_RELEASE_APPROVED=YES SAK_LIVE_RELEASE_TICKET=CONTROLLED-PO-DRAWINGS-20260912 pnpm --filter @sak-erp/web build) >/dev/null 2>&1 || true
    done
    pm2 restart sak-api sak-web sak-api-test sak-web-test --update-env >/dev/null 2>&1 || true
  fi
  exit "$code"
}
trap rollback EXIT

[[ "$(readlink -f "$live")" == "$live" ]]
[[ "$(readlink -f "$test")" == "$test" ]]
[[ -f "$stage/migrations/add-controlled-po-drawing-packages.sql" ]]
for file in "${common_files[@]}"; do [[ -f "$stage/common/$file" ]]; done
[[ -f "$stage/live/$orders_file" && -f "$stage/test/$orders_file" ]]

read_database_url() {
  node - "$1" <<'NODE'
const fs = require('fs');
const line = fs.readFileSync(process.argv[2], 'utf8').split(/\r?\n/).find((v) => /^DATABASE_URL=/.test(v));
if (!line) process.exit(2);
let value = line.slice(line.indexOf('=') + 1).trim();
if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) value = value.slice(1, -1);
process.stdout.write(value);
NODE
}

database_url="$(read_database_url "$live/apps/api/.env")"
test_database_url="$(read_database_url "$test/apps/api/.env")"
[[ -n "$database_url" && "$database_url" == "$test_database_url" ]]

mkdir -p /home/qutubk/sak-deploy-backups
backup_dir="$(mktemp -d /tmp/controlled-po-drawings-db-XXXXXX)"
for table in item_drawings purchase_orders purchase_order_items; do
  psql "$database_url" -v ON_ERROR_STOP=1 -At -c "SELECT COALESCE(json_agg(t), '[]'::json) FROM public.${table} t" > "$backup_dir/${table}.json"
done
psql "$database_url" -v ON_ERROR_STOP=1 -At -c "SELECT COALESCE(json_agg(t), '[]'::json) FROM public.engineering_drawing_item_links t" > "$backup_dir/engineering_drawing_item_links.json"
psql "$database_url" -v ON_ERROR_STOP=1 -At -c "SELECT json_build_object('captured_at', now(), 'database', current_database())" > "$backup_dir/manifest.json"
tar -czf "$db_backup" -C "$backup_dir" .
rm -rf -- "$backup_dir"
[[ -s "$db_backup" ]]

for app in "$live" "$test"; do
  backup="$app/backups/controlled-po-drawings-${stamp}"
  mkdir -p "$backup"
  for file in "${common_files[@]}" "$orders_file"; do
    mkdir -p "$backup/$(dirname "$file")" "$app/$(dirname "$file")"
    if [[ -f "$app/$file" ]]; then cp -a "$app/$file" "$backup/$file"; else touch "$backup/.absent-${file//\//_}"; fi
  done
  for file in "${common_files[@]}"; do cp -a "$stage/common/$file" "$app/$file"; done
done
cp -a "$stage/live/$orders_file" "$live/$orders_file"
cp -a "$stage/test/$orders_file" "$test/$orders_file"
sources_staged=1

# The two applications intentionally share one production database.
psql "$database_url" -v ON_ERROR_STOP=1 -f "$stage/migrations/add-controlled-po-drawing-packages.sql"

for app in "$live" "$test"; do
  (cd "$app" && SAK_LIVE_RELEASE_APPROVED=YES SAK_LIVE_RELEASE_TICKET=CONTROLLED-PO-DRAWINGS-20260912 pnpm --filter @sak-erp/api build)
  (cd "$app" && SAK_LIVE_RELEASE_APPROVED=YES SAK_LIVE_RELEASE_TICKET=CONTROLLED-PO-DRAWINGS-20260912 pnpm --filter @sak-erp/web build)
done

pm2 restart sak-api sak-web sak-api-test sak-web-test --update-env >/dev/null

for attempt in $(seq 1 45); do
  live_api="$(curl -sS -o /dev/null -w '%{http_code}' http://127.0.0.1:4000/api/v1/inventory/items/00000000-0000-0000-0000-000000000000/drawings || true)"
  test_api="$(curl -sS -o /dev/null -w '%{http_code}' http://127.0.0.1:4001/api/v1/inventory/items/00000000-0000-0000-0000-000000000000/drawings || true)"
  live_web="$(curl -sS -o /dev/null -w '%{http_code}' http://127.0.0.1:3000/dashboard/purchase/orders || true)"
  test_web="$(curl -sS -o /dev/null -w '%{http_code}' http://127.0.0.1:3001/dashboard/purchase/orders || true)"
  if [[ "$live_api" == 401 && "$test_api" == 401 && "$live_web" =~ ^(200|307|308)$ && "$test_web" =~ ^(200|307|308)$ ]]; then break; fi
  sleep 2
done

[[ "$live_api" == 401 && "$test_api" == 401 ]]
[[ "$live_web" =~ ^(200|307|308)$ && "$test_web" =~ ^(200|307|308)$ ]]
for process in sak-api sak-web sak-api-test sak-web-test; do pm2 describe "$process" | grep -q online; done

psql "$database_url" -At -v ON_ERROR_STOP=1 <<'SQL'
SELECT json_build_object(
  'drawing_files', (SELECT count(*) FROM public.item_drawings),
  'revision_packages', (SELECT count(*) FROM public.engineering_drawing_revision_packages),
  'po_frozen_packages', (SELECT count(*) FROM public.purchase_order_drawing_packages),
  'po_frozen_files', (SELECT count(*) FROM public.purchase_order_drawing_files),
  'unpackaged_files', (SELECT count(*) FROM public.item_drawings WHERE revision_package_id IS NULL),
  'approved_without_number', (SELECT count(*) FROM public.item_drawings WHERE lifecycle_status='APPROVED' AND (drawing_number IS NULL OR revision_code IS NULL))
);
SQL

printf '{"deployed":true,"live_api":%s,"live_web":%s,"test_api":%s,"test_web":%s,"backup":"%s"}\n' "$live_api" "$live_web" "$test_api" "$test_web" "$db_backup"
trap - EXIT
