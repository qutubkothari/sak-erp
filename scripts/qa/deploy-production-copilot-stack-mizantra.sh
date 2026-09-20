#!/usr/bin/env bash
set -Eeuo pipefail

app=/var/www/sak-erp-test
archive=/tmp/mizantra-production-copilot-stack-20260909.tgz
stage="$(mktemp -d /tmp/mizantra-production-copilot-stack.XXXXXX)"
backup="$app/backups/production-copilot-stack-$(date +%Y%m%d-%H%M%S)"
env_file="$app/apps/api/.env"

[[ "$PWD" == "$app" ]]
[[ "$(readlink -f "$app")" == "$app" ]]
[[ -s "$archive" ]]
[[ -f "$env_file" ]]
grep -q 'db.nwkaruzvzwwuftjquypk.supabase.co' "$env_file"

tar -xzf "$archive" -C "$stage"
[[ -f "$stage/apps/api/dist/main.js" ]]
[[ -f "$stage/apps/api/dist/production/services/job-order.service.js" ]]
[[ -f "$stage/apps/api/dist/intelligence/active-planner.service.js" ]]
[[ -f "$stage/apps/web/.next/BUILD_ID" ]]
[[ -f "$stage/migrations/add-msme-component-supply-and-wip-control.sql" ]]
[[ -f "$stage/migrations/harden-msme-factory-execution.sql" ]]

mkdir -p "$backup"
tar -czf "$backup/api-dist.tgz" -C "$app/apps/api" dist
tar -czf "$backup/web-next.tgz" -C "$app/apps/web" .next

database_url="$(ENV_FILE="$env_file" NODE_PATH="$app/node_modules:$app/apps/api/node_modules" node -e "require('dotenv').config({path:process.env.ENV_FILE,quiet:true});const u=new URL(process.env.DIRECT_URL||process.env.DATABASE_URL);const ref='nwkaruzvzwwuftjquypk';const host=u.hostname;const user=decodeURIComponent(u.username);if(!(host.includes(ref)||user.includes(ref)))throw new Error('Refusing unexpected database');process.stdout.write(u.toString())")"
if ! pg_dump "$database_url" --format=custom --no-owner --no-acl --file="$backup/database.dump"; then
  backup_abs="$(readlink -f "$backup")"
  docker run --rm --network host --user "$(id -u):$(id -g)" --volume "$backup_abs:/backup" postgres:17 pg_dump "$database_url" --format=custom --no-owner --no-acl --file=/backup/database.dump
fi
[[ -s "$backup/database.dump" ]]
unset database_url

node scripts/apply-sql-env-noverify.cjs "$env_file" "$stage/migrations/add-msme-component-supply-and-wip-control.sql"
node scripts/apply-sql-env-noverify.cjs "$env_file" "$stage/migrations/harden-msme-factory-execution.sql"

rollback() {
  code=$?
  trap - ERR
  pm2 stop sak-api-test sak-web-test >/dev/null 2>&1 || true
  rm -rf -- "$app/apps/api/dist" "$app/apps/web/.next"
  tar -xzf "$backup/api-dist.tgz" -C "$app/apps/api"
  tar -xzf "$backup/web-next.tgz" -C "$app/apps/web"
  pm2 restart sak-api-test sak-web-test --update-env >/dev/null 2>&1 || true
  echo "Production-copilot stack deployment failed; runtime restored. Database backup: $backup/database.dump" >&2
  exit "$code"
}
trap rollback ERR

pm2 stop sak-api-test sak-web-test >/dev/null
rm -rf -- "$app/apps/api/dist" "$app/apps/web/.next"
cp -a "$stage/apps/api/dist" "$app/apps/api/dist"
cp -a "$stage/apps/web/.next" "$app/apps/web/.next"
cp -a "$stage/migrations/add-msme-component-supply-and-wip-control.sql" "$app/migrations/"
cp -a "$stage/migrations/harden-msme-factory-execution.sql" "$app/migrations/"
cp -a "$stage/apps/api/src/intelligence/active-planner.capabilities.ts" "$app/apps/api/src/intelligence/"
cp -a "$stage/apps/api/src/intelligence/active-planner.service.ts" "$app/apps/api/src/intelligence/"
cp -a "$stage/apps/api/src/production/services/job-order.service.ts" "$app/apps/api/src/production/services/"
cp -a "$stage/apps/api/src/production/controllers/job-order.controller.ts" "$app/apps/api/src/production/controllers/"
cp -a "$stage/apps/web/src/app/dashboard/active-planner/page.tsx" "$app/apps/web/src/app/dashboard/active-planner/"
pm2 restart sak-api-test sak-web-test --update-env >/dev/null
pm2 save >/dev/null

api_code=000
web_code=000
for _ in $(seq 1 45); do
  api_code="$(curl -sS -o /dev/null -w '%{http_code}' http://127.0.0.1:4001/api/v1/job-orders/not-a-real-id/factory-readiness || true)"
  web_code="$(curl -sS -o /dev/null -w '%{http_code}' http://127.0.0.1:3001/dashboard/active-planner || true)"
  if [[ "$api_code" =~ ^(401|403)$ && "$web_code" == 200 ]]; then break; fi
  sleep 2
done
[[ "$api_code" =~ ^(401|403)$ ]]
[[ "$web_code" == 200 ]]
pm2 describe sak-api-test | grep -q online
pm2 describe sak-web-test | grep -q online
grep -q 'getFactoryReadiness' apps/api/dist/production/services/job-order.service.js
grep -q 'FACTORY_READINESS' apps/api/dist/intelligence/active-planner.service.js

schema_json="$(ENV_FILE="$env_file" NODE_PATH="$app/node_modules:$app/apps/api/node_modules" node - <<'NODE'
require('dotenv').config({path:process.env.ENV_FILE,quiet:true});
const {Client}=require('pg');
(async()=>{const u=new URL(process.env.DIRECT_URL||process.env.DATABASE_URL);['sslmode','sslrootcert','sslcert','sslkey'].forEach(k=>u.searchParams.delete(k));const c=new Client({connectionString:u.toString(),ssl:{rejectUnauthorized:false}});await c.connect();const q=await c.query(`select to_regclass('public.production_supply_pegging') as pegging,to_regclass('public.production_operation_wip') as wip,to_regclass('public.production_creation_runs') as creation_runs,to_regclass('public.production_supply_actions') as supply_actions,to_regclass('public.production_supervisor_overrides') as overrides`);await c.end();process.stdout.write(JSON.stringify(q.rows[0]));})().catch(e=>{console.error(e.message);process.exit(1)});
NODE
)"

trap - ERR
rm -rf -- "$stage"
rm -f -- "$archive"
printf '{"deployed":true,"target":"mizantra-only","api_http":%s,"web_http":%s,"backup":"%s","schema":%s}\n' "$api_code" "$web_code" "$backup" "$schema_json"
