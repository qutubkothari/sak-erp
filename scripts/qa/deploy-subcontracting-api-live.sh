#!/usr/bin/env bash
set -euo pipefail

live=/var/www/sak-erp
build=/tmp/saifseas-subcontract-build-20260830
backup=/home/qutubk/sak-deploy-backups/subcontracting-20260830/api-compat-rollback

[[ "$(readlink -f "$live")" == /var/www/sak-erp ]]
[[ -f "$build/apps/api/dist/subcontracting/subcontracting.service.js" ]]
[[ ! -e "$backup" ]]

mkdir -p "$backup"
cp -a "$live/apps/api/dist" "$backup/dist"
cp -a "$live/apps/api/src/subcontracting/subcontracting.service.ts" "$backup/subcontracting.service.ts"

pm2 stop sak-api >/dev/null
rollback() {
  echo 'API promotion failed; restoring the working SaifSeas API.' >&2
  rm -rf "$live/apps/api/dist"
  cp -a "$backup/dist" "$live/apps/api/dist"
  cp -a "$backup/subcontracting.service.ts" "$live/apps/api/src/subcontracting/subcontracting.service.ts"
  pm2 restart sak-api >/dev/null || true
}
trap rollback ERR

rm -rf "$live/apps/api/dist"
cp -a "$build/apps/api/dist" "$live/apps/api/dist"
cp -a "$build/apps/api/src/subcontracting/subcontracting.service.ts" "$live/apps/api/src/subcontracting/subcontracting.service.ts"
pm2 restart sak-api >/dev/null

for attempt in {1..20}; do
  sleep 2
  api_status="$(pm2 jlist | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{const a=JSON.parse(s);const p=a.find(x=>x.name==='sak-api');process.stdout.write(p?.pm2_env?.status||'missing')})")"
  http_status="$(curl -sS -o /dev/null -w '%{http_code}' https://erp.saifseas.com/api/v1/production/subcontracting/orders || true)"
  if [[ "$api_status" == online && "$http_status" == 401 ]]; then
    trap - ERR
    printf '{"api_deployed":true,"status":"%s","unauthenticated_http":%s}\n' "$api_status" "$http_status"
    exit 0
  fi
done

echo 'API did not pass its runtime probe.' >&2
false
