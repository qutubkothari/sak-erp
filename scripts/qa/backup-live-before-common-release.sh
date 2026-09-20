#!/usr/bin/env bash
set -euo pipefail

app=/var/www/sak-erp
backup_root=/var/www/sak-erp-release-backups
minimum_free_kb=2097152

[[ "$(readlink -f "$app")" == "$app" ]]
[[ -f "$app/apps/api/.env" ]]

available_kb="$(df --output=avail -k /var/www | tail -1 | tr -d ' ')"
if (( available_kb < minimum_free_kb )); then
  echo "Backup blocked: less than 2 GB is available on the live server." >&2
  exit 1
fi

stamp="$(date +%Y%m%d-%H%M%S)"
backup="$backup_root/common-release-$stamp"
umask 077
mkdir -p "$backup"

database_url="$(tr -d '\r' < "$app/apps/api/.env" | sed -n 's/^DATABASE_URL=//p' | head -1)"
test -n "$database_url"

printf 'DATABASE_URL=%s\n' "$database_url" > "$backup/.postgres17.env"
sudo docker run --rm --env-file "$backup/.postgres17.env" postgres:17 \
  sh -c 'pg_dump "$DATABASE_URL" --format=custom --no-owner --no-acl' \
  > "$backup/live-database.dump"
sudo docker run --rm -i postgres:17 pg_restore --list \
  < "$backup/live-database.dump" \
  > "$backup/live-database.restore-list.txt"
sudo docker run --rm --env-file "$backup/.postgres17.env" postgres:17 \
  sh -c 'pg_dump "$DATABASE_URL" --schema-only --no-owner --no-acl' \
  > "$backup/live-schema.sql"
rm -f -- "$backup/.postgres17.env"
psql "$database_url" -At <<'SQL' > "$backup/live-table-row-estimates.tsv"
SELECT schemaname || '.' || relname || E'\t' || n_live_tup
FROM pg_stat_user_tables
ORDER BY schemaname, relname;
SQL

tar \
  --exclude='sak-erp/node_modules' \
  --exclude='sak-erp/apps/api/node_modules' \
  --exclude='sak-erp/apps/web/node_modules' \
  --exclude='sak-erp/apps/web/.next/cache' \
  --exclude='sak-erp/apps/web/.next.*' \
  --exclude='sak-erp/backups' \
  --exclude='sak-erp/.deploy-backups' \
  --exclude='sak-erp/.git' \
  --exclude='sak-erp/.codex*' \
  -czf "$backup/live-application-and-uploads.tar.gz" \
  -C /var/www sak-erp

gzip -t "$backup/live-application-and-uploads.tar.gz"
tar -tzf "$backup/live-application-and-uploads.tar.gz" >/dev/null

sha256sum \
  "$backup/live-database.dump" \
  "$backup/live-schema.sql" \
  "$backup/live-table-row-estimates.tsv" \
  "$backup/live-application-and-uploads.tar.gz" \
  > "$backup/SHA256SUMS"
sha256sum -c "$backup/SHA256SUMS"

find "$backup" -maxdepth 1 -type f -printf '%f|%s bytes\n' | sort
printf 'VERIFIED_BACKUP=%s\n' "$backup"
