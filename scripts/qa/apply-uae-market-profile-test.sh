#!/usr/bin/env bash
set -euo pipefail
app=/var/www/sak-erp-test
test "$PWD" = "$app" || { echo "Refusing to run outside $app" >&2; exit 1; }
database_url="$(tr -d '\r' < apps/api/.env | sed -n 's/^DATABASE_URL=//p' | head -1)"
test -n "$database_url" || exit 1
psql "$database_url" -v ON_ERROR_STOP=1 -f /tmp/add-tenant-market-profile.sql -f /tmp/backfill-mizantra-uae-profile.sql
psql "$database_url" -v ON_ERROR_STOP=1 -c "select id,market_profile,default_currency,tax_regime,locale,timezone from public.tenants where id='f87a5ab0-0619-4f1c-bab9-e78ca750e56c';"
