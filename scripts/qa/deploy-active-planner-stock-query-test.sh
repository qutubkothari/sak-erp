#!/usr/bin/env bash
set -euo pipefail

app=/var/www/sak-erp-test
stage=/tmp/mizantra-active-planner-stock-query-20260830
backup=/root/sak-deploy-backups/mizantra-active-planner-stock-query-$(date +%Y%m%d-%H%M%S)

[[ "$PWD" == "$app" ]]
[[ "$(readlink -f "$app")" == "$app" ]]
for name in active-planner.service conversational-analytics.service; do
  [[ -f "$stage/$name.ts" ]]
  [[ -f "$stage/$name.js" ]]
done

mkdir -p "$backup"
for name in active-planner.service conversational-analytics.service; do
  cp -a "apps/api/src/intelligence/$name.ts" "$backup/"
  cp -a "apps/api/dist/intelligence/$name.js"* "$backup/"
done

rollback() {
  echo 'Stock-query deployment failed; restoring Mizantra intelligence services.' >&2
  for name in active-planner.service conversational-analytics.service; do
    cp -a "$backup/$name.ts" "apps/api/src/intelligence/$name.ts"
    cp -a "$backup/$name.js"* apps/api/dist/intelligence/
  done
  pm2 restart sak-api-test >/dev/null || true
}
trap rollback ERR

for name in active-planner.service conversational-analytics.service; do
  cp -a "$stage/$name.ts" "apps/api/src/intelligence/$name.ts"
  cp -a "$stage/$name.js" "apps/api/dist/intelligence/$name.js"
  if [[ -f "$stage/$name.js.map" ]]; then
    cp -a "$stage/$name.js.map" "apps/api/dist/intelligence/$name.js.map"
  fi
done
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

echo 'Stock-query API runtime probe failed.' >&2
false
