#!/usr/bin/env bash
set -euo pipefail

app=/var/www/sak-erp-test
test "$PWD" = "$app"
eval "$(tr -d '\r' < apps/api/.env)"
test -n "${DATABASE_URL:-}"

psql "$DATABASE_URL" -At <<'SQL'
SELECT table_name || ':' || string_agg(column_name, ',' ORDER BY ordinal_position)
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name IN (
    'bom_headers',
    'production_routing',
    'production_capacity_slots',
    'production_schedule_operations'
  )
GROUP BY table_name
ORDER BY table_name;
SQL
