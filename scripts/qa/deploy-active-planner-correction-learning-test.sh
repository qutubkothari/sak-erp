#!/usr/bin/env bash
set -euo pipefail

app=/var/www/sak-erp-test
stage=/tmp/mizantra-active-planner-correction-learning
backup=/root/sak-deploy-backups/mizantra-active-planner-correction-learning-$(date +%Y%m%d-%H%M%S)
api_name=active-planner-memory.service
web_page=apps/web/src/app/dashboard/active-planner/page.tsx

[[ "$PWD" == "$app" ]]
[[ "$(readlink -f "$app")" == "$app" ]]
[[ -f "$stage/$api_name.ts" ]]
[[ -f "$stage/$api_name.js" ]]
[[ -f "$stage/page.tsx" ]]

mkdir -p "$backup/api-src" "$backup/api-dist" "$backup/web-src"
cp -a "apps/api/src/intelligence/$api_name.ts" "$backup/api-src/"
cp -a "apps/api/dist/intelligence/$api_name.js"* "$backup/api-dist/"
cp -a "$web_page" "$backup/web-src/page.tsx"
if [[ -d apps/web/.next ]]; then
  mv apps/web/.next "$backup/web-next"
fi

rollback() {
  echo 'Correction-learning deployment failed; restoring Mizantra.' >&2
  cp -a "$backup/api-src/$api_name.ts" apps/api/src/intelligence/
  cp -a "$backup/api-dist/$api_name.js"* apps/api/dist/intelligence/
  cp -a "$backup/web-src/page.tsx" "$web_page"
  rm -rf apps/web/.next
  if [[ -d "$backup/web-next" ]]; then
    mv "$backup/web-next" apps/web/.next
  fi
  pm2 restart sak-api-test sak-web-test >/dev/null || true
}
trap rollback ERR

cp -a "$stage/$api_name.ts" apps/api/src/intelligence/
cp -a "$stage/$api_name.js" apps/api/dist/intelligence/
[[ ! -f "$stage/$api_name.js.map" ]] || cp -a "$stage/$api_name.js.map" apps/api/dist/intelligence/
cp -a "$stage/page.tsx" "$web_page"

npm run build --workspace=apps/web
pm2 restart sak-api-test sak-web-test >/dev/null

for attempt in {1..90}; do
  sleep 2
  statuses="$(pm2 jlist | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{const a=JSON.parse(s);for(const n of ['sak-api-test','sak-web-test']){const p=a.find(x=>x.name===n);process.stdout.write(n+':'+(p?.pm2_env?.status||'missing')+'\n')}})")"
  auth_http="$(curl -sS -o /dev/null -w '%{http_code}' http://127.0.0.1:4001/api/v1/active-planner/conversations || true)"
  web_http="$(curl -sS -o /dev/null -w '%{http_code}' http://127.0.0.1:3001/dashboard/active-planner || true)"
  if grep -q 'sak-api-test:online' <<<"$statuses" &&
     grep -q 'sak-web-test:online' <<<"$statuses" &&
     [[ "$auth_http" =~ ^(401|403)$ ]] && [[ "$web_http" == 200 ]]; then
    trap - ERR
    printf '{"deployed":true,"target":"mizantra-only","api_auth_http":%s,"web_http":%s,"backup":"%s"}\n' "$auth_http" "$web_http" "$backup"
    exit 0
  fi
done
false
