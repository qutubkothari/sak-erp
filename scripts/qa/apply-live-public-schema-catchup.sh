#!/usr/bin/env bash
set -euo pipefail

app=/var/www/sak-erp
backup=/var/www/sak-erp-release-backups/common-release-20260904-173857
diff=/tmp/live-to-mizantra-public-schema.sql

[[ "$(readlink -f "$app")" == "$app" ]]
[[ -s "$backup/live-database.dump" ]]
[[ -s "$backup/live-application-and-uploads.tar.gz" ]]
[[ -s "$diff" ]]
sha256sum -c "$backup/SHA256SUMS" >/dev/null

if grep -Eiq 'drop (table|column|type|function|index|view|policy|trigger)|^[[:space:]]*truncate|alter column .* type|alter column .* set not null' "$diff"; then
  echo "Schema catch-up blocked: destructive or narrowing DDL was detected." >&2
  exit 1
fi

[[ "$(grep -Eic '^[[:space:]]*create table' "$diff")" == "167" ]]
[[ "$(grep -Eic 'add column' "$diff")" == "64" ]]
[[ "$(grep -Eic 'alter table .* drop constraint' "$diff")" == "3" ]]

cp "$diff" "$backup/live-to-mizantra-public-schema.applied.sql"
sha256sum "$backup/live-to-mizantra-public-schema.applied.sql" \
  > "$backup/live-to-mizantra-public-schema.applied.sql.sha256"

database_url="$(tr -d '\r' < "$app/apps/api/.env" | sed -n 's/^DATABASE_URL=//p' | head -1)"
test -n "$database_url"
umask 077
printf 'DATABASE_URL=%s\n' "$database_url" > "$backup/.postgres17-apply.env"

set +e
sudo docker run --rm -i --env-file "$backup/.postgres17-apply.env" postgres:17 \
  sh -c 'psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -1' \
  < "$diff" > "$backup/live-schema-apply.log" 2>&1
apply_rc=$?
set -e
rm -f -- "$backup/.postgres17-apply.env"

if (( apply_rc != 0 )); then
  tail -80 "$backup/live-schema-apply.log" >&2
  echo "Live schema catch-up failed; PostgreSQL rolled back the transaction." >&2
  exit "$apply_rc"
fi

echo "LIVE_SCHEMA_CATCHUP_APPLIED"
tail -20 "$backup/live-schema-apply.log"
