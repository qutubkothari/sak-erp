#!/usr/bin/env bash
set -euo pipefail

app=/var/www/sak-erp-test
stage=/tmp/mizantra-active-planner-language-refinement-20260830
backup=/root/sak-deploy-backups/mizantra-active-planner-language-refinement-$(date +%Y%m%d-%H%M%S)
names=(active-planner.service active-planner.capabilities conversational-analytics.service active-planner-memory.service)

[[ "$PWD" == "$app" ]]
[[ "$(readlink -f "$app")" == "$app" ]]
for name in "${names[@]}"; do
  [[ -f "$stage/$name.ts" ]]
  [[ -f "$stage/$name.js" ]]
done

mkdir -p "$backup/src" "$backup/dist"
for name in "${names[@]}"; do
  cp -a "apps/api/src/intelligence/$name.ts" "$backup/src/"
  cp -a "apps/api/dist/intelligence/$name.js"* "$backup/dist/"
done

rollback() {
  echo 'Planner language refinement failed; restoring Mizantra API.' >&2
  cp -a "$backup/src/"*.ts apps/api/src/intelligence/
  cp -a "$backup/dist/"*.js* apps/api/dist/intelligence/
  pm2 restart sak-api-test >/dev/null || true
}
trap rollback ERR

for name in "${names[@]}"; do
  cp -a "$stage/$name.ts" "apps/api/src/intelligence/$name.ts"
  cp -a "$stage/$name.js" "apps/api/dist/intelligence/$name.js"
  [[ ! -f "$stage/$name.js.map" ]] || cp -a "$stage/$name.js.map" "apps/api/dist/intelligence/$name.js.map"
done
pm2 restart sak-api-test >/dev/null

for attempt in {1..20}; do
  sleep 2
  status="$(pm2 jlist | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{const p=JSON.parse(s).find(x=>x.name==='sak-api-test');process.stdout.write(p?.pm2_env?.status||'missing')})")"
  http="$(curl -sS -o /dev/null -w '%{http_code}' http://127.0.0.1:4001/api/v1/active-planner/conversations || true)"
  if [[ "$status" == online && "$http" =~ ^(401|403)$ ]]; then
    trap - ERR
    printf '{"deployed":true,"target":"mizantra-test-api","status":"%s","auth_guard_http":%s,"backup":"%s"}\n' "$status" "$http" "$backup"
    exit 0
  fi
done
false
