#!/usr/bin/env bash
set -euo pipefail

app=/var/www/sak-erp-test
test "$PWD" = "$app"

pm2 describe sak-api-test >/dev/null
pm2 describe sak-web-test >/dev/null

eval "$(tr -d '\r' < apps/api/.env)"
test -n "${DATABASE_URL:-}"

columns="$(psql "$DATABASE_URL" -At <<'SQL'
select column_name
from information_schema.columns
where table_schema = 'public'
  and table_name = 'production_programs'
  and column_name in ('demand_source', 'sales_order_id', 'sales_order_item_id')
order by column_name;
SQL
)"

indexes="$(psql "$DATABASE_URL" -At <<'SQL'
select indexname
from pg_indexes
where schemaname = 'public'
  and tablename = 'production_programs'
  and indexname in ('uq_production_program_sales_order_line', 'idx_production_program_sales_order')
order by indexname;
SQL
)"

test "$(printf '%s\n' "$columns" | grep -c .)" = 3
test "$(printf '%s\n' "$indexes" | grep -c .)" = 2
test "$(curl -sS -o /dev/null -w '%{http_code}' http://127.0.0.1:4001/api/v1/production-planning/sales-orders)" = 401
curl -fsS http://127.0.0.1:3001/dashboard/production/smart-planning >/dev/null

printf 'schema_columns=%s\n' "$(printf '%s' "$columns" | tr '\n' ',')"
printf 'schema_indexes=%s\n' "$(printf '%s' "$indexes" | tr '\n' ',')"
printf 'runtime=healthy\n'
