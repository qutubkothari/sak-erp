#!/usr/bin/env bash
set -Eeuo pipefail

app=/var/www/sak-erp-test
stage=/tmp/mizantra-ac-duct-demo-catalog-v1
release=ac-duct-demo-catalog-v1
backup="$app/backups/$release-$(date +%Y%m%d-%H%M%S)"
env_file="$app/apps/api/.env"

[[ "$PWD" == "$app" ]]
[[ "$(readlink -f "$app")" == "$app" ]]
[[ -f "$env_file" ]]
[[ -f "$stage/migrations/seed-mizantra-ac-duct-demo-catalog.sql" ]]
[[ -f "$stage/scripts/qa/audit-duct-demo-catalog.cjs" ]]

mkdir -p "$backup"
database_url="$(ENV_FILE="$env_file" NODE_PATH="$app/node_modules:$app/apps/api/node_modules" node -e "require('dotenv').config({path:process.env.ENV_FILE,quiet:true});const u=new URL(process.env.DIRECT_URL||process.env.DATABASE_URL);if(u.hostname!=='db.nwkaruzvzwwuftjquypk.supabase.co')throw new Error('Refusing non-Mizantra database');process.stdout.write(u.toString())")"

if ! pg_dump "$database_url" --format=custom --no-owner --no-acl --file="$backup/database.dump"; then
  backup_abs="$(readlink -f "$backup")"
  docker run --rm --network host --user "$(id -u):$(id -g)" \
    --volume "$backup_abs:/backup" postgres:17 \
    pg_dump "$database_url" --format=custom --no-owner --no-acl --file=/backup/database.dump
fi
[[ -s "$backup/database.dump" ]]

mkdir -p migrations scripts/qa
cp -a "$stage/migrations/seed-mizantra-ac-duct-demo-catalog.sql" migrations/
cp -a "$stage/scripts/qa/audit-duct-demo-catalog.cjs" scripts/qa/

DATABASE_URL="$database_url" NODE_PATH="$app/node_modules:$app/apps/api/node_modules" \
  node scripts/apply-sql-file.cjs migrations/seed-mizantra-ac-duct-demo-catalog.sql

audit_result="$(NODE_PATH="$app/node_modules:$app/apps/api/node_modules" \
  node scripts/qa/audit-duct-demo-catalog.cjs "$env_file")"

rm -rf -- "$stage"
printf '{"deployed":true,"target":"mizantra-only","backup":"%s","audit":%s}\n' \
  "$backup" "$audit_result"
