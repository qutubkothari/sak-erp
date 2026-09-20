#!/usr/bin/env bash
set -Eeuo pipefail

app=/var/www/sak-erp-test
stage=/tmp/mizantra-pr-multi-date-search-20260909
backup=/root/sak-deploy-backups/mizantra-pr-multi-date-search-$(date +%Y%m%d-%H%M%S)

[[ "$PWD" == "$app" ]]
[[ "$(readlink -f "$app")" == "$app" ]]
grep -q 'db.nwkaruzvzwwuftjquypk.supabase.co' apps/api/.env

files=(
  apps/api/src/intelligence/semantic-erp-query.service.ts
  apps/api/dist/intelligence/semantic-erp-query.service.js
)
for file in "${files[@]}"; do [[ -f "$stage/$file" ]]; done
grep -q dateFilterFields "$stage/apps/api/dist/intelligence/semantic-erp-query.service.js"

mkdir -p "$backup"
for file in "${files[@]}"; do
  mkdir -p "$backup/$(dirname "$file")"
  cp -a "$file" "$backup/$file"
done

rollback() {
  result=$?
  trap - ERR
  for file in "${files[@]}"; do cp -a "$backup/$file" "$file"; done
  pm2 restart sak-api-test --update-env >/dev/null || true
  exit "$result"
}
trap rollback ERR

for file in "${files[@]}"; do cp -a "$stage/$file" "$file"; done
pm2 restart sak-api-test --update-env >/dev/null
pm2 save >/dev/null

for _ in $(seq 1 45); do
  api_http=$(curl -sS -o /dev/null -w '%{http_code}' http://127.0.0.1:4001/api/v1/active-planner/conversations || true)
  api_status=$(pm2 jlist | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{const p=JSON.parse(s).find(x=>x.name==='sak-api-test');process.stdout.write(p?.pm2_env?.status||'missing')})")
  if [[ "$api_http" =~ ^(401|403)$ && "$api_status" == online ]] &&
    grep -q dateFilterFields apps/api/dist/intelligence/semantic-erp-query.service.js; then
    trap - ERR
    rm -rf -- "$stage"
    printf '{"deployed":true,"target":"mizantra-only","api":"%s","api_http":%s,"backup":"%s"}\n' "$api_status" "$api_http" "$backup"
    exit 0
  fi
  sleep 2
done
false
