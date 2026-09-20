#!/usr/bin/env bash
set -euo pipefail

cd /var/www/sak-erp-test/apps/api
ERP_DB_URL="$(tr -d '\r' < .env | sed -n 's/^DIRECT_URL=//p' | tail -1)"
if [[ -z "$ERP_DB_URL" ]]; then
  ERP_DB_URL="$(tr -d '\r' < .env | sed -n 's/^DATABASE_URL=//p' | tail -1)"
fi
ERP_DB_URL="${ERP_DB_URL%\"}"
ERP_DB_URL="${ERP_DB_URL#\"}"
sql_file="${1:-/tmp/diagnose-shop-floor-start.sql}"
psql "$ERP_DB_URL" -v ON_ERROR_STOP=1 -f "$sql_file"
