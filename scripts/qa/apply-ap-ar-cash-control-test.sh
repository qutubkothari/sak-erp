#!/usr/bin/env bash
set -euo pipefail
app=/var/www/sak-erp-test
test "$PWD" = "$app" || exit 1
database_url="$(tr -d '\r' < apps/api/.env | sed -n 's/^DATABASE_URL=//p' | head -1)"
test -n "$database_url" || exit 1
psql "$database_url" -v ON_ERROR_STOP=1 -f /tmp/add-ap-ar-cash-application-control.sql
