#!/usr/bin/env bash
set -Eeuo pipefail

app=/var/www/sak-erp-test
archive=/tmp/msme-factory-hardening-20260909-v2.tgz
release=msme-factory-hardening-20260909-v2
backup="$app/backups/$release-$(date +%Y%m%d-%H%M%S)"
stage="$(mktemp -d /tmp/msme-production-stage.XXXXXX)"
env_file="$app/apps/api/.env"

[[ "$PWD" == "$app" ]]
[[ "$(readlink -f "$app")" == "$app" ]]
[[ -s "$archive" ]]
[[ -f "$env_file" ]]

mkdir -p "$backup"
tar -czf "$backup/api-dist.tgz" -C "$app/apps/api" dist
tar -czf "$backup/web-next.tgz" -C "$app/apps/web" .next
tar -xzf "$archive" -C "$stage"

[[ -f "$stage/apps/api/dist/main.js" ]]
[[ -f "$stage/apps/api/dist/production/services/component-supply-policy.js" ]]
[[ -f "$stage/apps/api/dist/mrp/mrp.service.js" ]]
[[ -f "$stage/apps/web/.next/BUILD_ID" ]]
[[ -f "$stage/migrations/add-msme-component-supply-and-wip-control.sql" ]]
[[ -f "$stage/migrations/harden-msme-factory-execution.sql" ]]

database_url="$(ENV_FILE="$env_file" NODE_PATH="$app/node_modules:$app/apps/api/node_modules" node -e "require('dotenv').config({path:process.env.ENV_FILE,quiet:true});const u=new URL(process.env.DIRECT_URL||process.env.DATABASE_URL);const ref='xjiyiywzmklljrpblcqj';const isSupabase=u.hostname.endsWith('.supabase.co')||u.hostname.endsWith('.supabase.com');const isTarget=u.hostname.includes(ref)||decodeURIComponent(u.username).includes(ref);if(!isSupabase||!isTarget)throw new Error('Refusing unexpected database');process.stdout.write(u.toString())")"
if ! pg_dump "$database_url" --format=custom --no-owner --no-acl --file="$backup/database.dump"; then
  backup_abs="$(readlink -f "$backup")"
  sudo docker run --rm --network host --user "$(id -u):$(id -g)" \
    --volume "$backup_abs:/backup" postgres:17 \
    pg_dump "$database_url" --format=custom --no-owner --no-acl --file=/backup/database.dump
fi
[[ -s "$backup/database.dump" ]]
unset database_url

node scripts/apply-sql-env-noverify.cjs \
  "$env_file" \
  "$stage/migrations/add-msme-component-supply-and-wip-control.sql"
node scripts/apply-sql-env-noverify.cjs \
  "$env_file" \
  "$stage/migrations/harden-msme-factory-execution.sql"

rollback_runtime() {
  code=$?
  trap - ERR
  pm2 stop sak-api-test sak-web-test >/dev/null 2>&1 || true
  rm -rf -- "$app/apps/api/dist" "$app/apps/web/.next"
  tar -xzf "$backup/api-dist.tgz" -C "$app/apps/api"
  tar -xzf "$backup/web-next.tgz" -C "$app/apps/web"
  pm2 restart sak-api-test sak-web-test --update-env >/dev/null 2>&1 || true
  echo "Runtime rollback completed. Database migration is additive; database backup: $backup/database.dump" >&2
  exit "$code"
}
trap rollback_runtime ERR

pm2 stop sak-api-test sak-web-test >/dev/null
rm -rf -- "$app/apps/api/dist" "$app/apps/web/.next"
cp -a "$stage/apps/api/dist" "$app/apps/api/dist"
cp -a "$stage/apps/web/.next" "$app/apps/web/.next"
cp -a "$stage/migrations/add-msme-component-supply-and-wip-control.sql" "$app/migrations/"
cp -a "$stage/migrations/harden-msme-factory-execution.sql" "$app/migrations/"
pm2 restart sak-api-test sak-web-test --update-env >/dev/null
pm2 save >/dev/null

api_code=000
web_code=000
for _ in $(seq 1 40); do
  api_code="$(curl -sS -o /dev/null -w '%{http_code}' http://127.0.0.1:4001/api/v1/production/completions/my-active || true)"
  web_code="$(curl -sS -o /dev/null -w '%{http_code}' http://127.0.0.1:3001/dashboard/settings/production-setup || true)"
  if [[ "$api_code" =~ ^(401|403)$ && "$web_code" == 200 ]]; then break; fi
  sleep 2
done
[[ "$api_code" =~ ^(401|403)$ ]]
[[ "$web_code" == 200 ]]
pm2 describe sak-api-test | grep -q online
pm2 describe sak-web-test | grep -q online

schema_json="$(ENV_FILE="$env_file" NODE_PATH="$app/node_modules:$app/apps/api/node_modules" node - <<'NODE'
require('dotenv').config({path:process.env.ENV_FILE,quiet:true});
const {Client}=require('pg');
(async()=>{const u=new URL(process.env.DIRECT_URL||process.env.DATABASE_URL);['sslmode','sslrootcert','sslcert','sslkey'].forEach(k=>u.searchParams.delete(k));const c=new Client({connectionString:u.toString(),ssl:{rejectUnauthorized:false}});await c.connect();const q=await c.query(`select to_regclass('public.production_supply_pegging') as pegging,to_regclass('public.production_operation_wip') as wip,to_regclass('public.production_creation_runs') as creation_runs,to_regclass('public.production_supply_actions') as supply_actions,to_regprocedure('public.reserve_production_job_materials(uuid,uuid,uuid)') as reservation_rpc,(select count(*) from information_schema.triggers where trigger_schema='public' and trigger_name in ('trg_validate_station_completion_atomic','trg_record_station_completion_wip','trg_consume_production_material_reservations'))::int as safety_triggers`);await c.end();process.stdout.write(JSON.stringify(q.rows[0]));})().catch(e=>{console.error(e.message);process.exit(1)});
NODE
)"

trap - ERR
rm -rf -- "$stage"
rm -f -- "$archive"
printf '{"deployed":true,"target":"mizantra-only","api":%s,"web":%s,"backup":"%s","schema":%s}\n' \
  "$api_code" "$web_code" "$backup" "$schema_json"
