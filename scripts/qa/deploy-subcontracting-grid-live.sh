#!/usr/bin/env bash
set -euo pipefail

live=/var/www/sak-erp
build=/tmp/saifseas-subcontract-build-20260830
backup=/home/qutubk/sak-deploy-backups/subcontracting-grid-20260830

[[ "$(readlink -f "$live")" == /var/www/sak-erp ]]
[[ -f "$build/apps/web/.next/BUILD_ID" ]]
[[ -f "$build/apps/web/src/app/dashboard/production/subcontracting/page.tsx" ]]
[[ ! -e "$backup" ]]

mkdir -p "$backup"
cp -a "$live/apps/web/.next" "$backup/web-next"
cp -a "$live/apps/web/src/app/dashboard/production/subcontracting/page.tsx" "$backup/page.tsx"

pm2 stop sak-web >/dev/null
rollback() {
  echo 'Grid deployment failed; restoring the previous live web build.' >&2
  rm -rf "$live/apps/web/.next"
  cp -a "$backup/web-next" "$live/apps/web/.next"
  cp -a "$backup/page.tsx" "$live/apps/web/src/app/dashboard/production/subcontracting/page.tsx"
  pm2 restart sak-web >/dev/null || true
}
trap rollback ERR

rm -rf "$live/apps/web/.next"
cp -a "$build/apps/web/.next" "$live/apps/web/.next"
cp -a "$build/apps/web/src/app/dashboard/production/subcontracting/page.tsx" "$live/apps/web/src/app/dashboard/production/subcontracting/page.tsx"
pm2 restart sak-web >/dev/null

for attempt in {1..20}; do
  sleep 2
  status="$(pm2 jlist | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{const p=JSON.parse(s).find(x=>x.name==='sak-web');process.stdout.write(p?.pm2_env?.status||'missing')})")"
  http="$(curl -sS -o /dev/null -w '%{http_code}' https://erp.saifseas.com/login || true)"
  if [[ "$status" == online && "$http" == 200 ]]; then
    trap - ERR
    printf '{"web_deployed":true,"status":"%s","login_http":%s,"backup":"%s"}\n' "$status" "$http" "$backup"
    exit 0
  fi
done

echo 'Web runtime probe failed.' >&2
false
