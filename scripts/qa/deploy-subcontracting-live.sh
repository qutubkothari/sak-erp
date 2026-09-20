#!/usr/bin/env bash
set -euo pipefail

live=/var/www/sak-erp
build=/tmp/saifseas-subcontract-build-20260830
backup=/home/qutubk/sak-deploy-backups/subcontracting-20260830

[[ "$(readlink -f "$live")" == /var/www/sak-erp ]]
[[ -f "$build/apps/api/dist/subcontracting/subcontracting.service.js" ]]
[[ -f "$build/apps/web/.next/BUILD_ID" ]]
[[ -f "$build/apps/api/src/subcontracting/subcontracting.service.ts" ]]
[[ -f "$build/apps/web/src/app/dashboard/production/subcontracting/page.tsx" ]]
[[ ! -e "$backup" ]]

mkdir -p "$backup/source/api" "$backup/source/web"
cp -a "$live/apps/api/src/subcontracting/subcontracting.service.ts" "$backup/source/api/"
cp -a "$live/apps/web/src/app/dashboard/production/subcontracting/page.tsx" "$backup/source/web/"
cp -a "$live/apps/api/dist" "$backup/api-dist"
cp -a "$live/apps/web/.next" "$backup/web-next"
pm2 jlist > "$backup/pm2-before.json"

pm2 stop sak-api sak-web

rollback() {
  echo 'Deployment failed; restoring the previous live artifacts.' >&2
  rm -rf "$live/apps/api/dist" "$live/apps/web/.next"
  cp -a "$backup/api-dist" "$live/apps/api/dist"
  cp -a "$backup/web-next" "$live/apps/web/.next"
  cp -a "$backup/source/api/subcontracting.service.ts" "$live/apps/api/src/subcontracting/subcontracting.service.ts"
  cp -a "$backup/source/web/page.tsx" "$live/apps/web/src/app/dashboard/production/subcontracting/page.tsx"
  pm2 restart sak-api sak-web || true
}
trap rollback ERR

rm -rf "$live/apps/api/dist" "$live/apps/web/.next"
cp -a "$build/apps/api/dist" "$live/apps/api/dist"
cp -a "$build/apps/web/.next" "$live/apps/web/.next"
cp -a "$build/apps/api/src/subcontracting/subcontracting.service.ts" "$live/apps/api/src/subcontracting/subcontracting.service.ts"
cp -a "$build/apps/web/src/app/dashboard/production/subcontracting/page.tsx" "$live/apps/web/src/app/dashboard/production/subcontracting/page.tsx"

pm2 restart sak-api sak-web

for attempt in {1..20}; do
  api_status="$(pm2 jlist | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{const a=JSON.parse(s);const p=a.find(x=>x.name==='sak-api');process.stdout.write(p?.pm2_env?.status||'missing')})")"
  web_status="$(pm2 jlist | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{const a=JSON.parse(s);const p=a.find(x=>x.name==='sak-web');process.stdout.write(p?.pm2_env?.status||'missing')})")"
  http_status="$(curl -sS -o /dev/null -w '%{http_code}' https://erp.saifseas.com/login || true)"
  if [[ "$api_status" == online && "$web_status" == online && "$http_status" == 200 ]]; then
    trap - ERR
    printf '{"deployed":true,"api":"%s","web":"%s","login_http":%s,"backup":"%s"}\n' "$api_status" "$web_status" "$http_status" "$backup"
    exit 0
  fi
  sleep 2
done

echo 'Live health checks did not become ready.' >&2
false
