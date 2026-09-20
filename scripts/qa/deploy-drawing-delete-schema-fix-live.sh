#!/usr/bin/env bash
set -Eeuo pipefail

stage=/tmp/drawing-delete-schema-fix-20260913
stamp="$(date +%Y%m%d-%H%M%S)"
app=/var/www/sak-erp
source_file=apps/api/src/items/services/items.service.ts
migration=migrations/fix-item-drawing-delete-metadata.sql
backup="$app/backups/drawing-delete-schema-fix-${stamp}"
db_backup="/home/qutubk/sak-deploy-backups/item-drawings-before-delete-fix-${stamp}.json.gz"
staged=0
export SAK_LIVE_RELEASE_APPROVED=YES
export SAK_LIVE_RELEASE_TICKET=DRAWING-DELETE-SCHEMA-20260913

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

rollback() {
  code=$?
  if (( code != 0 && staged == 1 )); then
    echo "Drawing-delete API deployment failed; restoring prior source." >&2
    cp -a "$backup/$source_file" "$app/$source_file"
    (cd "$app" && pnpm --filter @sak-erp/api build) >/dev/null 2>&1 || true
    pm2 restart sak-api --update-env >/dev/null 2>&1 || true
  fi
  exit "$code"
}
trap rollback EXIT

[[ "$(readlink -f "$app")" == "$app" ]]
[[ -f "$stage/$source_file" && -f "$stage/$migration" ]]
database_url="$(read_database_url "$app/apps/api/.env")"
[[ -n "$database_url" ]]

mkdir -p "$backup/$(dirname "$source_file")" /home/qutubk/sak-deploy-backups
cp -a "$app/$source_file" "$backup/$source_file"
psql "$database_url" -At -v ON_ERROR_STOP=1 \
  -c "SELECT COALESCE(json_agg(t), '[]'::json) FROM public.item_drawings t" \
  | gzip -c > "$db_backup"
[[ -s "$db_backup" ]]

cp -a "$stage/$source_file" "$app/$source_file"
staged=1
psql "$database_url" -v ON_ERROR_STOP=1 -f "$stage/$migration" >/dev/null

(cd "$app" && pnpm --filter @sak-erp/api build)
pm2 restart sak-api --update-env >/dev/null

for attempt in $(seq 1 45); do
  api_http="$(curl -sS -o /dev/null -w '%{http_code}' http://127.0.0.1:4000/api/v1/inventory/items/00000000-0000-0000-0000-000000000000/drawings || true)"
  if [[ "$api_http" == 401 ]]; then break; fi
  sleep 2
done

[[ "$api_http" == 401 ]]
pm2 describe sak-api | grep -q online
column_count="$(psql "$database_url" -At -v ON_ERROR_STOP=1 -c "SELECT count(*) FROM information_schema.columns WHERE table_schema='public' AND table_name='item_drawings' AND column_name='metadata'")"
[[ "$column_count" == 1 ]]
psql "$database_url" -v ON_ERROR_STOP=1 <<'SQL' >/dev/null
BEGIN;
UPDATE public.item_drawings
SET metadata = COALESCE(metadata, '{}'::jsonb) || jsonb_build_object('schema_fix_probe', true)
WHERE id = (SELECT id FROM public.item_drawings ORDER BY created_at DESC LIMIT 1);
ROLLBACK;
SQL

printf '{"deployed":true,"api_http":%s,"metadata_column":%s,"source_backup":"%s","db_backup":"%s"}\n' \
  "$api_http" "$column_count" "$backup" "$db_backup"
trap - EXIT
