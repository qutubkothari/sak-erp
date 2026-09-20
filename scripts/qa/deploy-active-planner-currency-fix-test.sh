#!/usr/bin/env bash
set -euo pipefail

app=/var/www/sak-erp-test
stage=/tmp/mizantra-active-planner-currency-20260830
backup=/root/sak-deploy-backups/mizantra-active-planner-currency-$(date +%Y%m%d-%H%M%S)

[[ "$PWD" == "$app" ]]
[[ "$(readlink -f "$app")" == "$app" ]]
[[ -f "$stage/.next/BUILD_ID" ]]
[[ -f "$stage/src/app/dashboard/active-planner/page.tsx" ]]

mkdir -p "$backup"
cp -a apps/web/src/app/dashboard/active-planner/page.tsx "$backup/page.tsx"
mv apps/web/.next "$backup/web-next"

rollback() {
  echo 'Planner currency deployment failed; restoring Mizantra web.' >&2
  rm -rf "$app/apps/web/.next"
  mv "$backup/web-next" "$app/apps/web/.next"
  cp -a "$backup/page.tsx" "$app/apps/web/src/app/dashboard/active-planner/page.tsx"
  pm2 restart sak-web-test >/dev/null || true
}
trap rollback ERR

cp -a "$stage/.next" apps/web/.next
cp -a "$stage/src/app/dashboard/active-planner/page.tsx" apps/web/src/app/dashboard/active-planner/page.tsx
pm2 restart sak-web-test >/dev/null

for attempt in {1..20}; do
  sleep 2
  status="$(pm2 jlist | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{const p=JSON.parse(s).find(x=>x.name==='sak-web-test');process.stdout.write(p?.pm2_env?.status||'missing')})")"
  http="$(curl -sS -o /dev/null -w '%{http_code}' http://127.0.0.1:3001/dashboard/active-planner || true)"
  if [[ "$status" == online && "$http" == 200 ]]; then
    trap - ERR
    printf '{"deployed":true,"target":"mizantra-test","status":"%s","page_http":%s,"backup":"%s"}\n' "$status" "$http" "$backup"
    exit 0
  fi
done

echo 'Planner currency runtime probe failed.' >&2
false
