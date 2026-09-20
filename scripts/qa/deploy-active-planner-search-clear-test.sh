#!/usr/bin/env bash
set -euo pipefail

app=/var/www/sak-erp-test
stage=/tmp/mizantra-active-planner-search-clear-20260831
backup=/root/sak-deploy-backups/mizantra-active-planner-search-clear-$(date +%Y%m%d-%H%M%S)
api_names=(active-planner.controller active-planner-memory.service)

[[ "$PWD" == "$app" ]]
[[ "$(readlink -f "$app")" == "$app" ]]
[[ -f "$stage/web-next.tgz" ]]
[[ -f "$stage/web/page.tsx" ]]
for name in "${api_names[@]}"; do
  [[ -f "$stage/api/$name.ts" ]]
  [[ -f "$stage/dist/$name.js" ]]
done

mkdir -p "$backup/api-src" "$backup/api-dist" "$backup/web-src"
for name in "${api_names[@]}"; do
  cp -a "apps/api/src/intelligence/$name.ts" "$backup/api-src/"
  cp -a "apps/api/dist/intelligence/$name.js"* "$backup/api-dist/"
done
cp -a apps/web/src/app/dashboard/active-planner/page.tsx "$backup/web-src/page.tsx"
mv apps/web/.next "$backup/web-next"

rollback() {
  echo 'Planner conversation selector deployment failed; restoring Mizantra.' >&2
  cp -a "$backup/api-src/"*.ts apps/api/src/intelligence/
  cp -a "$backup/api-dist/"*.js* apps/api/dist/intelligence/
  cp -a "$backup/web-src/page.tsx" apps/web/src/app/dashboard/active-planner/page.tsx
  [[ ! -d "$app/apps/web/.next" ]] || rm -rf -- "$app/apps/web/.next"
  mv "$backup/web-next" apps/web/.next
  pm2 restart sak-api-test sak-web-test >/dev/null || true
}
trap rollback ERR

for name in "${api_names[@]}"; do
  cp -a "$stage/api/$name.ts" "apps/api/src/intelligence/$name.ts"
  cp -a "$stage/dist/$name.js" "apps/api/dist/intelligence/$name.js"
  [[ ! -f "$stage/dist/$name.js.map" ]] || cp -a "$stage/dist/$name.js.map" "apps/api/dist/intelligence/$name.js.map"
done
cp -a "$stage/web/page.tsx" apps/web/src/app/dashboard/active-planner/page.tsx
tar -xzf "$stage/web-next.tgz" -C "$app"

pm2 restart sak-api-test sak-web-test >/dev/null
for attempt in {1..30}; do
  sleep 2
  api_status="$(pm2 jlist | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{const p=JSON.parse(s).find(x=>x.name==='sak-api-test');process.stdout.write(p?.pm2_env?.status||'missing')})")"
  web_status="$(pm2 jlist | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{const p=JSON.parse(s).find(x=>x.name==='sak-web-test');process.stdout.write(p?.pm2_env?.status||'missing')})")"
  auth_http="$(curl -sS -o /dev/null -w '%{http_code}' http://127.0.0.1:4001/api/v1/active-planner/conversations || true)"
  page_http="$(curl -sS -o /tmp/mizantra-planner-search-clear.html -w '%{http_code}' http://127.0.0.1:3001/dashboard/active-planner || true)"
  if [[ "$api_status" == online && "$web_status" == online && "$auth_http" =~ ^(401|403)$ && "$page_http" == 200 ]] && grep -R -q 'Type to search chats' "$app/apps/web/.next/static/chunks/app/dashboard/active-planner"; then
    trap - ERR
    printf '{"deployed":true,"target":"mizantra-test","api":"%s","web":"%s","history_auth_http":%s,"page_http":%s,"backup":"%s"}\n' "$api_status" "$web_status" "$auth_http" "$page_http" "$backup"
    exit 0
  fi
done
false
