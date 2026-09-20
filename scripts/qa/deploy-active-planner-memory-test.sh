#!/usr/bin/env bash
set -euo pipefail

app=/var/www/sak-erp-test
stage=/tmp/mizantra-active-planner-memory-20260830
backup=/root/sak-deploy-backups/mizantra-active-planner-memory-$(date +%Y%m%d-%H%M%S)
api_names=(active-planner.service conversational-analytics.service active-planner.controller active-planner-memory.service)

[[ "$PWD" == "$app" ]]
[[ "$(readlink -f "$app")" == "$app" ]]
[[ -f "$stage/migrations/add-active-planner-conversation-memory.sql" ]]
[[ -f "$stage/apply-active-planner-memory-test.cjs" ]]
[[ -f "$stage/.next/BUILD_ID" ]]
[[ -f "$stage/web/page.tsx" ]]
[[ -f "$stage/api/intelligence.module.ts" ]]
[[ -f "$stage/dist/intelligence.module.js" ]]
for name in "${api_names[@]}"; do
  [[ -f "$stage/api/$name.ts" ]]
  [[ -f "$stage/dist/$name.js" ]]
done

mkdir -p "$backup/api-src" "$backup/api-dist" "$backup/web-src" "$backup/migrations"
for name in "${api_names[@]}"; do
  [[ ! -f "apps/api/src/intelligence/$name.ts" ]] || cp -a "apps/api/src/intelligence/$name.ts" "$backup/api-src/"
  [[ ! -f "apps/api/dist/intelligence/$name.js" ]] || cp -a "apps/api/dist/intelligence/$name.js"* "$backup/api-dist/"
done
cp -a apps/api/src/intelligence/intelligence.module.ts "$backup/api-src/"
cp -a apps/api/dist/intelligence/intelligence.module.js* "$backup/api-dist/"
cp -a apps/web/src/app/dashboard/active-planner/page.tsx "$backup/web-src/page.tsx"
[[ ! -f migrations/add-active-planner-conversation-memory.sql ]] || cp -a migrations/add-active-planner-conversation-memory.sql "$backup/migrations/"
mv apps/web/.next "$backup/web-next"

rollback() {
  echo 'Planner memory deployment failed; restoring Mizantra application runtime.' >&2
  for name in "${api_names[@]}"; do
    if [[ -f "$backup/api-src/$name.ts" ]]; then
      cp -a "$backup/api-src/$name.ts" "apps/api/src/intelligence/$name.ts"
    else
      rm -f "apps/api/src/intelligence/$name.ts"
    fi
    if compgen -G "$backup/api-dist/$name.js*" >/dev/null; then
      cp -a "$backup/api-dist/$name.js"* apps/api/dist/intelligence/
    else
      rm -f "apps/api/dist/intelligence/$name.js" "apps/api/dist/intelligence/$name.js.map"
    fi
  done
  cp -a "$backup/api-src/intelligence.module.ts" apps/api/src/intelligence/intelligence.module.ts
  cp -a "$backup/api-dist/intelligence.module.js"* apps/api/dist/intelligence/
  cp -a "$backup/web-src/page.tsx" apps/web/src/app/dashboard/active-planner/page.tsx
  [[ ! -d apps/web/.next ]] || rm -rf "$app/apps/web/.next"
  mv "$backup/web-next" apps/web/.next
  pm2 restart sak-api-test sak-web-test >/dev/null || true
}
trap rollback ERR

cp -a "$stage/migrations/add-active-planner-conversation-memory.sql" migrations/
NODE_PATH="$app/node_modules" node "$stage/apply-active-planner-memory-test.cjs" apps/api/.env "$stage/migrations/add-active-planner-conversation-memory.sql"

for name in "${api_names[@]}"; do
  cp -a "$stage/api/$name.ts" "apps/api/src/intelligence/$name.ts"
  cp -a "$stage/dist/$name.js" "apps/api/dist/intelligence/$name.js"
  [[ ! -f "$stage/dist/$name.js.map" ]] || cp -a "$stage/dist/$name.js.map" "apps/api/dist/intelligence/$name.js.map"
done
cp -a "$stage/api/intelligence.module.ts" apps/api/src/intelligence/intelligence.module.ts
cp -a "$stage/dist/intelligence.module.js" apps/api/dist/intelligence/intelligence.module.js
[[ ! -f "$stage/dist/intelligence.module.js.map" ]] || cp -a "$stage/dist/intelligence.module.js.map" apps/api/dist/intelligence/intelligence.module.js.map
cp -a "$stage/web/page.tsx" apps/web/src/app/dashboard/active-planner/page.tsx
mv "$stage/.next" apps/web/.next

pm2 restart sak-api-test sak-web-test >/dev/null
for attempt in {1..30}; do
  sleep 2
  api_status="$(pm2 jlist | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{const p=JSON.parse(s).find(x=>x.name==='sak-api-test');process.stdout.write(p?.pm2_env?.status||'missing')})")"
  web_status="$(pm2 jlist | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{const p=JSON.parse(s).find(x=>x.name==='sak-web-test');process.stdout.write(p?.pm2_env?.status||'missing')})")"
  auth_http="$(curl -sS -o /dev/null -w '%{http_code}' http://127.0.0.1:4001/api/v1/active-planner/conversations || true)"
  page_http="$(curl -sS -o /dev/null -w '%{http_code}' http://127.0.0.1:3001/dashboard/active-planner || true)"
  if [[ "$api_status" == online && "$web_status" == online && "$auth_http" =~ ^(401|403)$ && "$page_http" == 200 ]]; then
    trap - ERR
    printf '{"deployed":true,"target":"mizantra-test","api":"%s","web":"%s","history_auth_http":%s,"page_http":%s,"backup":"%s"}\n' "$api_status" "$web_status" "$auth_http" "$page_http" "$backup"
    exit 0
  fi
done

echo 'Planner memory runtime probes failed.' >&2
false
