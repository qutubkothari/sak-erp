#!/usr/bin/env bash
set -euo pipefail

app=/var/www/sak-erp-test
stage=/tmp/mizantra-active-planner-currency-api-20260830
backup=/root/sak-deploy-backups/mizantra-active-planner-currency-api-$(date +%Y%m%d-%H%M%S)

[[ "$PWD" == "$app" ]]
[[ "$(readlink -f "$app")" == "$app" ]]
[[ -f "$stage/active-planner.service.ts" ]]
[[ -f "$stage/active-planner.service.js" ]]

mkdir -p "$backup"
cp -a apps/api/src/intelligence/active-planner.service.ts "$backup/"
cp -a apps/api/dist/intelligence/active-planner.service.js* "$backup/"

rollback() {
  echo 'Planner API currency deployment failed; restoring Mizantra API.' >&2
  cp -a "$backup/active-planner.service.ts" apps/api/src/intelligence/active-planner.service.ts
  cp -a "$backup/active-planner.service.js"* apps/api/dist/intelligence/
  pm2 restart sak-api-test >/dev/null || true
}
trap rollback ERR

cp -a "$stage/active-planner.service.ts" apps/api/src/intelligence/active-planner.service.ts
cp -a "$stage/active-planner.service.js" apps/api/dist/intelligence/active-planner.service.js
if [[ -f "$stage/active-planner.service.js.map" ]]; then
  cp -a "$stage/active-planner.service.js.map" apps/api/dist/intelligence/active-planner.service.js.map
fi
pm2 restart sak-api-test >/dev/null

for attempt in {1..20}; do
  sleep 2
  status="$(pm2 jlist | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{const p=JSON.parse(s).find(x=>x.name==='sak-api-test');process.stdout.write(p?.pm2_env?.status||'missing')})")"
  http="$(curl -sS -o /dev/null -w '%{http_code}' -X POST -H 'content-type: application/json' -d '{}' http://127.0.0.1:4001/api/v1/active-planner/interpret || true)"
  if [[ "$status" == online && "$http" =~ ^(401|403)$ ]]; then
    trap - ERR
    printf '{"deployed":true,"target":"mizantra-test-api","status":"%s","auth_guard_http":%s,"backup":"%s"}\n' "$status" "$http" "$backup"
    exit 0
  fi
done

echo 'Planner API runtime probe failed.' >&2
false
