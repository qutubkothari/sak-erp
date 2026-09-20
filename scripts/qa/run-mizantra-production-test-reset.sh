#!/usr/bin/env bash
set -Eeuo pipefail

app=/var/www/sak-erp-test
reset_script=/tmp/reset-mizantra-production-test-data.cjs
env_file="$app/apps/api/.env"
backup="$app/backups/production-test-reset-$(date +%Y%m%d-%H%M%S)"

[[ "$PWD" == "$app" ]]
[[ "$(readlink -f "$app")" == "$app" ]]
[[ -s "$reset_script" ]]
[[ -s "$env_file" ]]
grep -q 'nwkaruzvzwwuftjquypk' "$env_file"

mkdir -p "$backup"
database_url="$(ENV_FILE="$env_file" NODE_PATH="$app/node_modules:$app/apps/api/node_modules" node -e "require('dotenv').config({path:process.env.ENV_FILE,quiet:true});const u=new URL(process.env.DIRECT_URL||process.env.DATABASE_URL);if(!(u.hostname.includes('nwkaruzvzwwuftjquypk')||decodeURIComponent(u.username).includes('nwkaruzvzwwuftjquypk')))throw new Error('Unexpected database');process.stdout.write(u.toString())")"
if ! pg_dump "$database_url" --format=custom --no-owner --no-acl --file="$backup/database.dump"; then
  backup_abs="$(readlink -f "$backup")"
  docker run --rm --network host --user "$(id -u):$(id -g)" --volume "$backup_abs:/backup" postgres:17 pg_dump "$database_url" --format=custom --no-owner --no-acl --file=/backup/database.dump
fi
[[ -s "$backup/database.dump" ]]
unset database_url

result="$(ENV_FILE="$env_file" NODE_PATH="$app/node_modules:$app/apps/api/node_modules" MIZANTRA_RESET_CONFIRM=DELETE_PRODUCTION_TEST_DATA MIZANTRA_EXPECTED_JOB_COUNT=5 node "$reset_script")"
rm -f -- "$reset_script"
printf '{"backup":"%s","result":%s}\n' "$backup/database.dump" "$result"
