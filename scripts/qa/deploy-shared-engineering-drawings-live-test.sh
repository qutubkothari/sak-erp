#!/usr/bin/env bash
set -Eeuo pipefail

stage=/tmp/shared-engineering-drawings-20260912
stamp="$(date +%Y%m%d-%H%M%S)"
live=/var/www/sak-erp
test=/var/www/sak-erp-test
db_backup="/home/qutubk/sak-deploy-backups/shared-drawings-before-${stamp}.tgz"

files=(
  apps/api/src/items/services/items.service.ts
  apps/api/src/inventory/controllers/inventory.controller.ts
  apps/api/src/purchase/services/purchase-orders.service.ts
  apps/web/src/components/DrawingManager.tsx
)

sources_staged=0
rollback() {
  code=$?
  if (( code != 0 && sources_staged == 1 )); then
    echo "Shared-drawing deployment failed; restoring prior sources." >&2
    for app in "$live" "$test"; do
      backup="$app/backups/shared-drawings-${stamp}"
      for file in "${files[@]}"; do
        if [[ -f "$backup/$file" ]]; then cp -a "$backup/$file" "$app/$file"; fi
      done
      (cd "$app" && pnpm --filter @sak-erp/api build && pnpm --filter @sak-erp/web build) >/dev/null 2>&1 || true
    done
    pm2 restart sak-api sak-web sak-api-test sak-web-test --update-env >/dev/null 2>&1 || true
  fi
  exit "$code"
}
trap rollback EXIT

[[ "$(readlink -f "$live")" == "$live" ]]
[[ "$(readlink -f "$test")" == "$test" ]]
[[ -f "$stage/migrations/add-shared-engineering-document-links.sql" ]]
for file in "${files[@]}"; do [[ -f "$stage/$file" ]]; done

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
backup_dir="$(mktemp -d /tmp/shared-drawing-db-backup-XXXXXX)"
for table in items item_drawings purchase_order_items purchase_orders; do
  psql "$database_url" -v ON_ERROR_STOP=1 -At \
    -c "SELECT COALESCE(json_agg(t), '[]'::json) FROM public.${table} t" \
    > "$backup_dir/${table}.json"
done
psql "$database_url" -v ON_ERROR_STOP=1 -At \
  -c "SELECT json_build_object('captured_at', now(), 'database', current_database(), 'server_version', current_setting('server_version'))" \
  > "$backup_dir/manifest.json"
tar -czf "$db_backup" -C "$backup_dir" .
rm -rf -- "$backup_dir"
[[ -s "$db_backup" ]]

for app in "$live" "$test"; do
  backup="$app/backups/shared-drawings-${stamp}"
  mkdir -p "$backup"
  for file in "${files[@]}"; do
    mkdir -p "$backup/$(dirname "$file")" "$app/$(dirname "$file")"
    cp -a "$app/$file" "$backup/$file"
    cp -a "$stage/$file" "$app/$file"
  done
done
sources_staged=1

# Live and test intentionally share one database, so migrate and seed links once.
psql "$database_url" -v ON_ERROR_STOP=1 -f "$stage/migrations/add-shared-engineering-document-links.sql" >/dev/null
psql "$database_url" -v ON_ERROR_STOP=1 <<'SQL'
DO $$
DECLARE
  source_tenant uuid;
  source_drawing uuid;
  matched_count integer;
BEGIN
  SELECT i.tenant_id, d.id INTO source_tenant, source_drawing
  FROM public.items i
  JOIN public.item_drawings d ON d.tenant_id = i.tenant_id AND d.item_id = i.id
  WHERE upper(i.code) = '400-0010'
  ORDER BY d.is_active DESC, d.version DESC, d.created_at DESC
  LIMIT 1;

  IF source_drawing IS NULL THEN
    RAISE EXCEPTION 'No drawing found for item 400-0010';
  END IF;

  SELECT count(*) INTO matched_count
  FROM public.items
  WHERE tenant_id = source_tenant
    AND upper(code) IN ('400-0010','400-0009','100-0040','100-0039');
  IF matched_count <> 4 THEN
    RAISE EXCEPTION 'Expected four target items, found %', matched_count;
  END IF;

  INSERT INTO public.engineering_drawing_item_links
    (tenant_id, drawing_id, item_id, relation_type)
  SELECT source_tenant, source_drawing, i.id,
    CASE WHEN upper(i.code) = '400-0010' THEN 'OWNER' ELSE 'APPLICABLE' END
  FROM public.items i
  WHERE i.tenant_id = source_tenant
    AND upper(i.code) IN ('400-0010','400-0009','100-0040','100-0039')
  ON CONFLICT (tenant_id, drawing_id, item_id)
  DO UPDATE SET relation_type = EXCLUDED.relation_type;
END $$;
SQL

for app in "$live" "$test"; do
  (cd "$app" && pnpm --filter @sak-erp/api build && pnpm --filter @sak-erp/web build)
done

pm2 restart sak-api sak-web sak-api-test sak-web-test --update-env >/dev/null

for attempt in $(seq 1 45); do
  live_api="$(curl -sS -o /dev/null -w '%{http_code}' http://127.0.0.1:4000/api/v1/inventory/items/00000000-0000-0000-0000-000000000000/drawings || true)"
  test_api="$(curl -sS -o /dev/null -w '%{http_code}' http://127.0.0.1:4001/api/v1/inventory/items/00000000-0000-0000-0000-000000000000/drawings || true)"
  live_web="$(curl -sS -o /dev/null -w '%{http_code}' http://127.0.0.1:3000/dashboard/inventory/items || true)"
  test_web="$(curl -sS -o /dev/null -w '%{http_code}' http://127.0.0.1:3001/dashboard/inventory/items || true)"
  if [[ "$live_api" == 401 && "$test_api" == 401 && "$live_web" =~ ^(200|307|308)$ && "$test_web" =~ ^(200|307|308)$ ]]; then break; fi
  sleep 2
done

[[ "$live_api" == 401 && "$test_api" == 401 ]]
[[ "$live_web" =~ ^(200|307|308)$ && "$test_web" =~ ^(200|307|308)$ ]]
for process in sak-api sak-web sak-api-test sak-web-test; do pm2 describe "$process" | grep -q online; done

psql "$database_url" -At -v ON_ERROR_STOP=1 <<'SQL'
WITH source AS (
  SELECT d.id, d.file_url
  FROM public.items i
  JOIN public.item_drawings d ON d.tenant_id=i.tenant_id AND d.item_id=i.id
  WHERE upper(i.code)='400-0010'
  ORDER BY d.is_active DESC, d.version DESC, d.created_at DESC LIMIT 1
)
SELECT json_build_object(
  'item_drawings', (SELECT count(*) FROM public.item_drawings),
  'shared_links', (SELECT count(*) FROM public.engineering_drawing_item_links),
  'target_file_rows', (SELECT count(*) FROM public.item_drawings d JOIN source s ON d.file_url=s.file_url),
  'target_item_links', (SELECT count(*) FROM public.engineering_drawing_item_links l JOIN source s ON l.drawing_id=s.id),
  'target_codes', (SELECT json_agg(i.code ORDER BY i.code) FROM public.engineering_drawing_item_links l JOIN source s ON l.drawing_id=s.id JOIN public.items i ON i.id=l.item_id)
);
SQL

printf '{"deployed":true,"live_api":%s,"live_web":%s,"test_api":%s,"test_web":%s,"backup":"%s"}\n' \
  "$live_api" "$live_web" "$test_api" "$test_web" "$db_backup"
trap - EXIT
