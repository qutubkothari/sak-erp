#!/usr/bin/env bash
set -euo pipefail

app=/var/www/sak-erp-test
stage=/tmp/mizantra-active-planner-fuzzy-entities
backup=/root/sak-deploy-backups/mizantra-active-planner-fuzzy-entities-$(date +%Y%m%d-%H%M%S)
name=conversational-analytics.service

[[ "$PWD" == "$app" ]]
[[ "$(readlink -f "$app")" == "$app" ]]
[[ -f "$stage/$name.ts" ]]
[[ -f "$stage/$name.js" ]]

mkdir -p "$backup/src" "$backup/dist"
cp -a "apps/api/src/intelligence/$name.ts" "$backup/src/"
cp -a "apps/api/dist/intelligence/$name.js"* "$backup/dist/"

rollback() {
  echo 'Fuzzy entity deployment failed; restoring Mizantra API.' >&2
  cp -a "$backup/src/$name.ts" apps/api/src/intelligence/
  cp -a "$backup/dist/$name.js"* apps/api/dist/intelligence/
  pm2 restart sak-api-test >/dev/null || true
}
trap rollback ERR

cp -a "$stage/$name.ts" apps/api/src/intelligence/
cp -a "$stage/$name.js" apps/api/dist/intelligence/
[[ ! -f "$stage/$name.js.map" ]] || cp -a "$stage/$name.js.map" apps/api/dist/intelligence/
pm2 restart sak-api-test >/dev/null

for attempt in {1..60}; do
  sleep 2
  status="$(pm2 jlist | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{const p=JSON.parse(s).find(x=>x.name==='sak-api-test');process.stdout.write(p?.pm2_env?.status||'missing')})")"
  auth_http="$(curl -sS -o /dev/null -w '%{http_code}' http://127.0.0.1:4001/api/v1/active-planner/conversations || true)"
  if [[ "$status" == online && "$auth_http" =~ ^(401|403)$ ]]; then
    trap - ERR
    printf '{"deployed":true,"target":"mizantra-test-api","status":"%s","auth_guard_http":%s,"backup":"%s"}\n' "$status" "$auth_http" "$backup"
    exit 0
  fi
done
false
