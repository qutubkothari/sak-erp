#!/usr/bin/env bash
set -Eeuo pipefail

app=/var/www/sak-erp-test
stage=/tmp/mizantra-smart-reports-20260908
backup=/root/sak-deploy-backups/mizantra-smart-reports-$(date +%Y%m%d-%H%M%S)

[[ "$PWD" == "$app" ]]
[[ "$(readlink -f "$app")" == "$app" ]]
grep -q 'db.nwkaruzvzwwuftjquypk.supabase.co' apps/api/.env
[[ -f "$stage/web-next.tgz" ]]
[[ -f "$stage/apps/api/src/intelligence/conversational-analytics.service.ts" ]]

files=(
  apps/api/src/intelligence/conversational-analytics.service.ts
  apps/api/src/intelligence/semantic-erp-query.service.ts
  apps/api/src/intelligence/active-planner.service.ts
  apps/api/src/intelligence/active-planner.capabilities.ts
  apps/api/src/production/production.module.ts
  apps/api/dist/intelligence/conversational-analytics.service.js
  apps/api/dist/intelligence/semantic-erp-query.service.js
  apps/api/dist/intelligence/active-planner.service.js
  apps/api/dist/intelligence/active-planner.capabilities.js
  apps/api/dist/production/production.module.js
  apps/web/src/app/dashboard/active-planner/page.tsx
)

mkdir -p "$backup/source"
for file in "${files[@]}"; do
  mkdir -p "$backup/source/$(dirname "$file")"
  cp -a "$file" "$backup/source/$file"
done
mv apps/web/.next "$backup/web-next"

rollback() {
  result=$?
  trap - ERR
  for file in "${files[@]}"; do cp -a "$backup/source/$file" "$file"; done
  [[ ! -d apps/web/.next ]] || rm -rf -- apps/web/.next
  mv "$backup/web-next" apps/web/.next
  pm2 restart sak-api-test sak-web-test --update-env >/dev/null || true
  exit "$result"
}
trap rollback ERR

for file in "${files[@]}"; do
  mkdir -p "$(dirname "$file")"
  cp -a "$stage/$file" "$file"
done
tar -xzf "$stage/web-next.tgz" -C apps/web

pm2 restart sak-api-test sak-web-test --update-env >/dev/null
pm2 save >/dev/null
for _ in $(seq 1 45); do
  api_http=$(curl -sS -o /dev/null -w '%{http_code}' http://127.0.0.1:4001/api/v1/active-planner/conversations || true)
  web_http=$(curl -sS -o /dev/null -w '%{http_code}' http://127.0.0.1:3001/dashboard/active-planner || true)
  api_status=$(pm2 jlist | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{const p=JSON.parse(s).find(x=>x.name==='sak-api-test');process.stdout.write(p?.pm2_env?.status||'missing')})")
  web_status=$(pm2 jlist | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{const p=JSON.parse(s).find(x=>x.name==='sak-web-test');process.stdout.write(p?.pm2_env?.status||'missing')})")
  if [[ "$api_http" =~ ^(401|403)$ && "$web_http" == 200 && "$api_status" == online && "$web_status" == online ]] &&
    grep -q 'PROFIT_AND_LOSS' apps/api/dist/intelligence/conversational-analytics.service.js &&
    grep -R -q 'Print / Save PDF' apps/web/.next/static/chunks/app/dashboard/active-planner; then
    trap - ERR
    rm -rf -- "$stage"
    printf '{"deployed":true,"target":"mizantra-only","api":"%s","web":"%s","api_http":%s,"web_http":%s,"backup":"%s"}\n' "$api_status" "$web_status" "$api_http" "$web_http" "$backup"
    exit 0
  fi
  sleep 2
done
false
