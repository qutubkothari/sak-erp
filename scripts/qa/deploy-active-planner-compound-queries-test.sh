#!/usr/bin/env bash
set -euo pipefail

app=/var/www/sak-erp-test
stage=/tmp/mizantra-active-planner-compound-queries
backup=/root/sak-deploy-backups/mizantra-active-planner-compound-queries-$(date +%Y%m%d-%H%M%S)

[[ "$PWD" == "$app" ]]
[[ "$(readlink -f "$app")" == "$app" ]]
[[ -f "$stage/web-next.tgz" ]]
[[ -f "$stage/web/page.tsx" ]]
[[ -f "$stage/api/semantic-erp-query.service.ts" ]]
[[ -f "$stage/api/conversational-analytics.service.ts" ]]
[[ -f "$stage/dist/semantic-erp-query.service.js" ]]

mkdir -p "$backup/api-src" "$backup/api-dist" "$backup/web-src"
cp -a apps/api/src/intelligence/semantic-erp-query.service.ts "$backup/api-src/"
cp -a apps/api/src/intelligence/conversational-analytics.service.ts "$backup/api-src/"
cp -a apps/api/dist/intelligence/semantic-erp-query.service.js* "$backup/api-dist/"
cp -a apps/web/src/app/dashboard/active-planner/page.tsx "$backup/web-src/page.tsx"
mv apps/web/.next "$backup/web-next"

rollback() {
  echo 'Compound-query deployment failed; restoring Mizantra.' >&2
  cp -a "$backup/api-src/"*.ts apps/api/src/intelligence/
  cp -a "$backup/api-dist/"*.js* apps/api/dist/intelligence/
  cp -a "$backup/web-src/page.tsx" apps/web/src/app/dashboard/active-planner/page.tsx
  [[ ! -d "$app/apps/web/.next" ]] || rm -rf -- "$app/apps/web/.next"
  mv "$backup/web-next" apps/web/.next
  pm2 restart sak-api-test sak-web-test >/dev/null || true
}
trap rollback ERR

cp -a "$stage/api/semantic-erp-query.service.ts" apps/api/src/intelligence/
cp -a "$stage/api/conversational-analytics.service.ts" apps/api/src/intelligence/
cp -a "$stage/dist/semantic-erp-query.service.js" apps/api/dist/intelligence/
[[ ! -f "$stage/dist/semantic-erp-query.service.js.map" ]] || cp -a "$stage/dist/semantic-erp-query.service.js.map" apps/api/dist/intelligence/
cp -a "$stage/web/page.tsx" apps/web/src/app/dashboard/active-planner/page.tsx
tar -xzf "$stage/web-next.tgz" -C "$app"

pm2 restart sak-api-test sak-web-test >/dev/null
for attempt in {1..60}; do
  sleep 2
  api_status="$(pm2 jlist | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{const p=JSON.parse(s).find(x=>x.name==='sak-api-test');process.stdout.write(p?.pm2_env?.status||'missing')})")"
  web_status="$(pm2 jlist | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{const p=JSON.parse(s).find(x=>x.name==='sak-web-test');process.stdout.write(p?.pm2_env?.status||'missing')})")"
  auth_http="$(curl -sS -o /dev/null -w '%{http_code}' http://127.0.0.1:4001/api/v1/active-planner/conversations || true)"
  page_http="$(curl -sS -o /tmp/mizantra-planner-compound.html -w '%{http_code}' http://127.0.0.1:3001/dashboard/active-planner || true)"
  if [[ "$api_status" == online && "$web_status" == online && "$auth_http" =~ ^(401|403)$ && "$page_http" == 200 ]] && grep -R -q 'VERIFIED' "$app/apps/web/.next/static/chunks/app/dashboard/active-planner"; then
    trap - ERR
    printf '{"deployed":true,"target":"mizantra-test","api":"%s","web":"%s","history_auth_http":%s,"page_http":%s,"backup":"%s"}\n' "$api_status" "$web_status" "$auth_http" "$page_http" "$backup"
    exit 0
  fi
done
printf 'verification failed: api=%s web=%s auth_http=%s page_http=%s ui_marker=%s\n' \
  "$api_status" "$web_status" "$auth_http" "$page_http" \
  "$(grep -R -q 'VERIFIED' "$app/apps/web/.next/static/chunks/app/dashboard/active-planner" && echo present || echo missing)" >&2
false
