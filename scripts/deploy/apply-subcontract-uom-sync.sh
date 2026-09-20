#!/usr/bin/env bash
set -euo pipefail

app_dir="${1:?application directory is required}"
cd "$app_dir"

project_ref="$(sed -n 's#^SUPABASE_URL=https://\([^.]*\)\.supabase\.co.*#\1#p' apps/api/.env | tr -d '\r')"
database_url="$(sed -n 's/^DATABASE_URL=//p' apps/api/.env | tr -d '\r')"

# Older deployments contain harmless spelling mistakes in the direct DB URL.
# Normalize only in memory; do not alter the live environment file.
database_url="${database_url/postgesql:/postgresql:}"
database_url="${database_url/postges:/postgres:}"
database_url="$(printf '%s' "$database_url" | sed "s#db\.[^.]*\.supabase#db.${project_ref}.supabase#")"

psql "$database_url" -v ON_ERROR_STOP=1 -f migrations/sync-subcontract-output-uom-with-item-master.sql
psql "$database_url" -v ON_ERROR_STOP=1 -f /tmp/subcontract-uom-audit.sql
