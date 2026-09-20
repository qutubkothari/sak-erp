#!/usr/bin/env bash
set -Eeuo pipefail

app=/var/www/sak-erp-test
stage=/tmp/mizantra-production-setup-20260906
release=production-setup-20260906
backup="$app/backups/$release-$(date +%Y%m%d-%H%M%S)"
env_file="$app/apps/api/.env"

[[ "$PWD" == "$app" ]]
[[ "$(readlink -f "$app")" == "$app" ]]
[[ -d "$stage/apps/api/src" && -d "$stage/apps/web/src" ]]
[[ -f "$env_file" ]]

paths=(
  apps/api/src/mrp/advanced-production-planning.controller.ts
  apps/api/src/mrp/advanced-production-planning.service.ts
  apps/api/src/production/production.module.ts
  apps/api/src/production/controllers/production-report.controller.ts
  apps/api/src/production/services/production-report.service.ts
  apps/api/src/production/services/station-completion.service.ts
  apps/web/src/components/SearchableSelect.tsx
  apps/web/src/components/Sidebar.tsx
  apps/web/src/lib/permission-config.ts
  apps/web/src/app/dashboard/production/page.tsx
  apps/web/src/app/dashboard/production/reports/page.tsx
  apps/web/src/app/dashboard/shop-floor/page.tsx
  apps/web/src/app/dashboard/settings/production-setup/page.tsx
)

mkdir -p "$backup/source"
for path in "${paths[@]}"; do
  if [[ -f "$path" ]]; then
    mkdir -p "$backup/source/$(dirname "$path")"
    cp -a "$path" "$backup/source/$path"
  fi
done
tar -czf "$backup/api-dist.tgz" -C apps/api dist
tar -czf "$backup/web-next.tgz" -C apps/web .next

database_url="$(ENV_FILE="$env_file" NODE_PATH="$app/node_modules:$app/apps/api/node_modules" node -e "require('dotenv').config({path:process.env.ENV_FILE,quiet:true});process.stdout.write(process.env.DIRECT_URL||process.env.DATABASE_URL||'')")"
[[ -n "$database_url" ]]
if ! pg_dump "$database_url" --format=custom --no-owner --no-acl --file="$backup/database.dump"; then
  backup_abs="$(readlink -f "$backup")"
  sudo docker run --rm --network host --user "$(id -u):$(id -g)" \
    --volume "$backup_abs:/backup" postgres:17 \
    pg_dump "$database_url" --format=custom --no-owner --no-acl --file=/backup/database.dump
fi
[[ -s "$backup/database.dump" ]]
unset database_url

rollback() {
  code=$?
  trap - ERR
  if (( code == 0 )); then return; fi
  echo "Deployment failed; restoring Mizantra runtime and source." >&2
  pm2 stop sak-api-test sak-web-test >/dev/null 2>&1 || true
  for path in "${paths[@]}"; do
    if [[ -f "$backup/source/$path" ]]; then
      mkdir -p "$(dirname "$path")"
      cp -a "$backup/source/$path" "$path"
    else
      rm -f -- "$path"
    fi
  done
  [[ "$(readlink -f apps/api/dist)" == "$app/apps/api/dist" ]]
  [[ "$(readlink -f apps/web/.next)" == "$app/apps/web/.next" ]]
  rm -rf -- apps/api/dist apps/web/.next
  tar -xzf "$backup/api-dist.tgz" -C apps/api
  tar -xzf "$backup/web-next.tgz" -C apps/web
  pm2 restart sak-api-test sak-web-test --update-env >/dev/null 2>&1 || true
  exit "$code"
}
trap rollback ERR

for path in "${paths[@]}"; do
  [[ -f "$stage/$path" ]]
  mkdir -p "$(dirname "$path")"
  cp -a "$stage/$path" "$path"
done
cp -a "$stage/migrations/add-production-downtime-execution-reporting.sql" migrations/
cp -a "$stage/migrations/add-production-process-resource-profiles.sql" migrations/

ENV_FILE="$env_file" node - <<'NODE'
const fs = require('fs');
require('dotenv').config({ path: process.env.ENV_FILE, quiet: true });
const { Client } = require('pg');
(async () => {
  const connection = new URL(process.env.DIRECT_URL || process.env.DATABASE_URL);
  ['sslmode', 'sslrootcert', 'sslcert', 'sslkey'].forEach((key) => connection.searchParams.delete(key));
  const client = new Client({ connectionString: connection.toString(), ssl: { rejectUnauthorized: false } });
  await client.connect();
  for (const file of [
    'migrations/add-production-downtime-execution-reporting.sql',
    'migrations/add-production-process-resource-profiles.sql',
  ]) {
    await client.query(fs.readFileSync(file, 'utf8'));
    console.log(`Applied ${file}`);
  }
  await client.end();
})().catch((error) => { console.error(error); process.exit(1); });
NODE

pnpm --filter @sak-erp/api build
pnpm --filter @sak-erp/web build
pm2 restart sak-api-test sak-web-test --update-env
pm2 save

api_ok=0
web_ok=0
setup_ok=0
report_ok=0
for _ in $(seq 1 40); do
  api_status="$(curl -sS -o /dev/null -w '%{http_code}' http://127.0.0.1:4001/api/v1/production-planning/configuration || true)"
  web_status="$(curl -sS -o /dev/null -w '%{http_code}' http://127.0.0.1:3001/dashboard/production || true)"
  setup_status="$(curl -sS -o /dev/null -w '%{http_code}' http://127.0.0.1:3001/dashboard/settings/production-setup || true)"
  report_status="$(curl -sS -o /dev/null -w '%{http_code}' http://127.0.0.1:3001/dashboard/production/reports || true)"
  [[ "$api_status" =~ ^(401|403)$ ]] && api_ok=1
  [[ "$web_status" == 200 ]] && web_ok=1
  [[ "$setup_status" == 200 ]] && setup_ok=1
  [[ "$report_status" == 200 ]] && report_ok=1
  if (( api_ok && web_ok && setup_ok && report_ok )); then break; fi
  sleep 2
done
(( api_ok && web_ok && setup_ok && report_ok ))
pm2 describe sak-api-test | grep -q online
pm2 describe sak-web-test | grep -q online

trap - ERR
rm -rf -- "$stage"
printf '{"deployed":true,"target":"mizantra-only","api":%s,"production":%s,"setup":%s,"reports":%s,"backup":"%s"}\n' \
  "$api_status" "$web_status" "$setup_status" "$report_status" "$backup"
