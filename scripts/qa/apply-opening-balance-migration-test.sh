#!/usr/bin/env bash
set -euo pipefail

app=/var/www/sak-erp-test
test "$PWD" = "$app" || { echo "Refusing to run outside $app" >&2; exit 1; }
database_url="$(tr -d '\r' < apps/api/.env | sed -n 's/^DATABASE_URL=//p' | head -1)"
test -n "$database_url" || { echo "DATABASE_URL is missing" >&2; exit 1; }
psql "$database_url" -v ON_ERROR_STOP=1 -f /tmp/upgrade-opening-balance-four-stage-control.sql

