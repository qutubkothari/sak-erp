#!/usr/bin/env bash
set -Eeuo pipefail

app=/var/www/sak-erp-test
stage=${MIZANTRA_PRICE_UOM_STAGE:-/tmp/mizantra-sales-price-uom-20260909}
backup=/root/sak-deploy-backups/mizantra-sales-price-uom-$(date +%Y%m%d-%H%M%S)
migration=migrations/add-sales-price-uom.sql
source_files=(
  apps/api/src/sales/services/sales.service.ts
  apps/api/src/sales/services/sales.service.spec.ts
  apps/api/src/intelligence/active-planner.service.ts
  apps/api/src/intelligence/active-planner.service.spec.ts
  apps/web/src/app/dashboard/sales/page.tsx
  "$migration"
)

[[ "$PWD" == "$app" ]]
[[ "$(readlink -f "$app")" == "$app" ]]
grep -q 'db.nwkaruzvzwwuftjquypk.supabase.co' apps/api/.env
[[ -f "$stage/api-dist.tgz" ]]
[[ -f "$stage/web-next.tgz" ]]
for file in "${source_files[@]}"; do [[ -f "$stage/$file" ]]; done

mkdir -p "$backup/source"
for file in "${source_files[@]}"; do
  mkdir -p "$backup/source/$(dirname "$file")"
  [[ ! -f "$file" ]] || cp -a "$file" "$backup/source/$file"
done
mv apps/api/dist "$backup/api-dist"
mv apps/web/.next "$backup/web-next"

rollback() {
  result=$?
  trap - ERR
  for file in "${source_files[@]}"; do
    [[ ! -f "$backup/source/$file" ]] || cp -a "$backup/source/$file" "$file"
  done
  [[ ! -d "$app/apps/api/dist" ]] || rm -rf -- "$app/apps/api/dist"
  [[ ! -d "$app/apps/web/.next" ]] || rm -rf -- "$app/apps/web/.next"
  mv "$backup/api-dist" "$app/apps/api/dist"
  mv "$backup/web-next" "$app/apps/web/.next"
  pm2 restart sak-api-test sak-web-test --update-env >/dev/null || true
  exit "$result"
}
trap rollback ERR

for file in "${source_files[@]}"; do
  mkdir -p "$(dirname "$file")"
  cp -a "$stage/$file" "$file"
done

database_url=$(awk '/^DATABASE_URL=/{sub(/^DATABASE_URL=/, ""); gsub(/\r/, ""); print; exit}' apps/api/.env)
[[ -n "$database_url" ]]
psql "$database_url" -v ON_ERROR_STOP=1 -1 -f "$migration" >/dev/null
unset database_url

tar -xzf "$stage/api-dist.tgz" -C "$app/apps/api"
tar -xzf "$stage/web-next.tgz" -C "$app/apps/web"
pm2 restart sak-api-test sak-web-test --update-env >/dev/null
pm2 save >/dev/null

for _ in $(seq 1 60); do
  api_status=$(pm2 jlist | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{const p=JSON.parse(s).find(x=>x.name==='sak-api-test');process.stdout.write(p?.pm2_env?.status||'missing')})")
  web_status=$(pm2 jlist | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{const p=JSON.parse(s).find(x=>x.name==='sak-web-test');process.stdout.write(p?.pm2_env?.status||'missing')})")
  api_http=$(curl -sS -o /dev/null -w '%{http_code}' http://127.0.0.1:4001/api/v1/items || true)
  web_sales_http=$(curl -sS -o /dev/null -w '%{http_code}' http://127.0.0.1:3001/dashboard/sales || true)
  schema_ok=$(psql "$(awk '/^DATABASE_URL=/{sub(/^DATABASE_URL=/, ""); gsub(/\r/, ""); print; exit}' apps/api/.env)" -Atqc "select count(*) from information_schema.columns where table_schema='public' and table_name in ('quotation_items','sales_order_items','sales_invoice_items') and column_name in ('price_uom','price_uom_factor');" || true)
  if [[ "$api_status" == online && "$web_status" == online && "$api_http" =~ ^(401|403)$ && "$web_sales_http" == 200 && "$schema_ok" == 6 ]] &&
    grep -R -q 'Rate / Basis' apps/web/.next/static/chunks/app/dashboard/sales &&
    grep -R -q 'cannot be priced per' apps/api/dist/sales/services/sales.service.js; then
    trap - ERR
    rm -rf -- "$stage"
    printf '{"deployed":true,"target":"mizantra-only","api":"%s","web":"%s","schema_columns":%s,"backup":"%s"}\n' "$api_status" "$web_status" "$schema_ok" "$backup"
    exit 0
  fi
  sleep 2
done
false
