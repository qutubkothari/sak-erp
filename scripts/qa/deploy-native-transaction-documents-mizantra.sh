#!/usr/bin/env bash
set -Eeuo pipefail

app=/var/www/sak-erp-test
stage=${MIZANTRA_NATIVE_DOC_STAGE:-/tmp/mizantra-native-documents-20260909}
backup=/root/sak-deploy-backups/mizantra-native-documents-$(date +%Y%m%d-%H%M%S)
source_files=(
  apps/api/src/intelligence/semantic-erp-query.service.ts
  apps/web/src/app/dashboard/active-planner/page.tsx
  apps/web/src/app/dashboard/purchase/requisitions/page.tsx
  apps/web/src/app/dashboard/production/job-orders/page.tsx
)

[[ "$PWD" == "$app" ]]
[[ "$(readlink -f "$app")" == "$app" ]]
grep -q 'db.nwkaruzvzwwuftjquypk.supabase.co' apps/api/.env
[[ -f "$stage/api-dist.tgz" ]]
[[ -f "$stage/web-next.tgz" ]]
for file in "${source_files[@]}"; do [[ -f "$stage/$file" ]]; done

mkdir -p "$backup/source"
for file in "${source_files[@]}"; do
  mkdir -p "$backup/source/$(dirname "$file")"
  cp -a "$file" "$backup/source/$file"
done
mv apps/api/dist "$backup/api-dist"
mv apps/web/.next "$backup/web-next"

rollback() {
  result=$?
  trap - ERR
  for file in "${source_files[@]}"; do cp -a "$backup/source/$file" "$file"; done
  [[ ! -d "$app/apps/api/dist" ]] || rm -rf -- "$app/apps/api/dist"
  [[ ! -d "$app/apps/web/.next" ]] || rm -rf -- "$app/apps/web/.next"
  mv "$backup/api-dist" "$app/apps/api/dist"
  mv "$backup/web-next" "$app/apps/web/.next"
  pm2 restart sak-api-test sak-web-test --update-env >/dev/null || true
  exit "$result"
}
trap rollback ERR

for file in "${source_files[@]}"; do cp -a "$stage/$file" "$file"; done
tar -xzf "$stage/api-dist.tgz" -C "$app/apps/api"
tar -xzf "$stage/web-next.tgz" -C "$app/apps/web"
pm2 restart sak-api-test sak-web-test --update-env >/dev/null
pm2 save >/dev/null

for _ in $(seq 1 60); do
  api_status=$(pm2 jlist | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{const p=JSON.parse(s).find(x=>x.name==='sak-api-test');process.stdout.write(p?.pm2_env?.status||'missing')})")
  web_status=$(pm2 jlist | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{const p=JSON.parse(s).find(x=>x.name==='sak-web-test');process.stdout.write(p?.pm2_env?.status||'missing')})")
  api_http=$(curl -sS -o /dev/null -w '%{http_code}' http://127.0.0.1:4001/api/v1/active-planner/conversations || true)
  web_http=$(curl -sS -o /dev/null -w '%{http_code}' http://127.0.0.1:3001/dashboard/active-planner || true)
  if [[ "$api_status" == online && "$web_status" == online && "$api_http" =~ ^(401|403)$ && "$web_http" == 200 ]] &&
    grep -R -q 'Open official' apps/api/dist/intelligence/semantic-erp-query.service.js &&
    grep -R -q 'Print PR' apps/web/.next/static/chunks/app/dashboard/purchase/requisitions &&
    grep -R -q 'Print report summary' apps/web/.next/static/chunks/app/dashboard/active-planner; then
    trap - ERR
    rm -rf -- "$stage"
    printf '{"deployed":true,"target":"mizantra-only","api":"%s","web":"%s","api_http":%s,"web_http":%s,"backup":"%s"}\n' "$api_status" "$web_status" "$api_http" "$web_http" "$backup"
    exit 0
  fi
  sleep 2
done
false
