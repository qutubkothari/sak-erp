#!/usr/bin/env bash
set -euo pipefail

live=/var/www/sak-erp
build=/tmp/saifseas-subcontract-build-20260830
backup=/home/qutubk/sak-deploy-backups/subcontract-finance-20260830

[[ "$(readlink -f "$live")" == /var/www/sak-erp ]]
[[ -f "$build/apps/web/.next/BUILD_ID" ]]
[[ -f "$build/apps/web/src/app/dashboard/accounts/subcontract-payables/page.tsx" ]]
[[ ! -e "$backup" ]]

mkdir -p "$backup/source"
cp -a "$live/apps/web/.next" "$backup/web-next"
cp -a "$live/apps/web/src/components/Sidebar.tsx" "$backup/source/Sidebar.tsx"
cp -a "$live/apps/web/src/lib/permission-config.ts" "$backup/source/permission-config.ts"

pm2 stop sak-web >/dev/null
rollback() {
  echo 'Finance UI deployment failed; restoring the previous live web build.' >&2
  rm -rf "$live/apps/web/.next"
  cp -a "$backup/web-next" "$live/apps/web/.next"
  cp -a "$backup/source/Sidebar.tsx" "$live/apps/web/src/components/Sidebar.tsx"
  cp -a "$backup/source/permission-config.ts" "$live/apps/web/src/lib/permission-config.ts"
  rm -rf "$live/apps/web/src/app/dashboard/accounts/subcontract-payables"
  pm2 restart sak-web >/dev/null || true
}
trap rollback ERR

rm -rf "$live/apps/web/.next"
cp -a "$build/apps/web/.next" "$live/apps/web/.next"
cp -a "$build/apps/web/src/components/Sidebar.tsx" "$live/apps/web/src/components/Sidebar.tsx"
cp -a "$build/apps/web/src/lib/permission-config.ts" "$live/apps/web/src/lib/permission-config.ts"
mkdir -p "$live/apps/web/src/app/dashboard/accounts/subcontract-payables"
cp -a "$build/apps/web/src/app/dashboard/accounts/subcontract-payables/page.tsx" "$live/apps/web/src/app/dashboard/accounts/subcontract-payables/page.tsx"
pm2 restart sak-web >/dev/null

for attempt in {1..20}; do
  sleep 2
  status="$(pm2 jlist | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{const p=JSON.parse(s).find(x=>x.name==='sak-web');process.stdout.write(p?.pm2_env?.status||'missing')})")"
  page_http="$(curl -sS -o /dev/null -w '%{http_code}' https://erp.saifseas.com/dashboard/accounts/subcontract-payables || true)"
  if [[ "$status" == online && "$page_http" == 200 ]]; then
    trap - ERR
    printf '{"web_deployed":true,"status":"%s","page_http":%s,"backup":"%s"}\n' "$status" "$page_http" "$backup"
    exit 0
  fi
done

echo 'Subcontract finance page runtime probe failed.' >&2
false
