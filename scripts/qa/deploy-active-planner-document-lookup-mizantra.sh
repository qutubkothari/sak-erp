#!/usr/bin/env bash
set -Eeuo pipefail

app=/var/www/sak-erp-test
stage=/tmp/mizantra-document-lookup-20260908
backup=/root/sak-deploy-backups/mizantra-document-lookup-$(date +%Y%m%d-%H%M%S)
files=(
  apps/api/src/intelligence/active-planner.service.ts
  apps/api/src/intelligence/active-planner.capabilities.ts
  apps/api/src/intelligence/semantic-erp-query.service.ts
  apps/api/src/intelligence/active-planner-memory.service.ts
)

[[ "$PWD" == "$app" ]]
[[ "$(readlink -f "$app")" == "$app" ]]
grep -q 'db.nwkaruzvzwwuftjquypk.supabase.co' apps/api/.env
for file in "${files[@]}"; do [[ -f "$stage/$file" ]]; done

mkdir -p "$backup/source"
for file in "${files[@]}"; do
  mkdir -p "$backup/source/$(dirname "$file")"
  cp -a "$file" "$backup/source/$file"
done
tar -czf "$backup/api-dist.tgz" -C apps/api dist

rollback() {
  result=$?
  trap - ERR
  for file in "${files[@]}"; do cp -a "$backup/source/$file" "$file"; done
  rm -rf -- "$app/apps/api/dist"
  tar -xzf "$backup/api-dist.tgz" -C "$app/apps/api"
  pm2 restart sak-api-test --update-env >/dev/null || true
  exit "$result"
}
trap rollback ERR

for file in "${files[@]}"; do cp -a "$stage/$file" "$file"; done
pnpm --filter @sak-erp/api build
pm2 restart sak-api-test --update-env >/dev/null
pm2 save >/dev/null
for _ in $(seq 1 30); do
  api_http=$(curl -sS -o /dev/null -w '%{http_code}' http://127.0.0.1:4001/api/v1/active-planner/conversations || true)
  api_status=$(pm2 jlist | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{const p=JSON.parse(s).find(x=>x.name==='sak-api-test');process.stdout.write(p?.pm2_env?.status||'missing')})")
  if [[ "$api_http" =~ ^(401|403)$ && "$api_status" == online ]] &&
    grep -q 'PURCHASE_REQUISITIONS' apps/api/dist/intelligence/semantic-erp-query.service.js &&
    grep -q 'isReadOnlyDocumentLookup' apps/api/dist/intelligence/active-planner.service.js; then
    trap - ERR
    rm -rf -- "$stage"
    printf '{"deployed":true,"target":"mizantra-only","api":"%s","api_http":%s,"backup":"%s"}\n' "$api_status" "$api_http" "$backup"
    exit 0
  fi
  sleep 2
done
false
