#!/usr/bin/env bash
set -euo pipefail

app=/var/www/sak-erp-test
stage=/tmp/mizantra-my-work-health-links
backup=/root/sak-deploy-backups/mizantra-my-work-health-links-$(date +%Y%m%d-%H%M%S)

[[ "$PWD" == "$app" ]]
[[ "$(readlink -f "$app")" == "$app" ]]
for file in intelligence.controller.ts intelligence.controller.js active-planner-page.tsx actions-page.tsx; do
  [[ -f "$stage/$file" ]]
done

mkdir -p "$backup/api-src" "$backup/api-dist" "$backup/web-src"
cp -a apps/api/src/intelligence/intelligence.controller.ts "$backup/api-src/"
cp -a apps/api/dist/intelligence/intelligence.controller.js* "$backup/api-dist/"
cp -a apps/web/src/app/dashboard/active-planner/page.tsx "$backup/web-src/active-planner-page.tsx"
cp -a apps/web/src/app/dashboard/command-center/actions/page.tsx "$backup/web-src/actions-page.tsx"
if [[ -d apps/web/.next ]]; then mv apps/web/.next "$backup/web-next"; fi

rollback() {
  echo 'My Work deployment failed; restoring Mizantra.' >&2
  cp -a "$backup/api-src/intelligence.controller.ts" apps/api/src/intelligence/
  cp -a "$backup/api-dist/intelligence.controller.js"* apps/api/dist/intelligence/
  cp -a "$backup/web-src/active-planner-page.tsx" apps/web/src/app/dashboard/active-planner/page.tsx
  cp -a "$backup/web-src/actions-page.tsx" apps/web/src/app/dashboard/command-center/actions/page.tsx
  rm -rf apps/web/.next
  if [[ -d "$backup/web-next" ]]; then mv "$backup/web-next" apps/web/.next; fi
  pm2 restart sak-api-test sak-web-test >/dev/null || true
}
trap rollback ERR

cp -a "$stage/intelligence.controller.ts" apps/api/src/intelligence/
cp -a "$stage/intelligence.controller.js" apps/api/dist/intelligence/
[[ ! -f "$stage/intelligence.controller.js.map" ]] || cp -a "$stage/intelligence.controller.js.map" apps/api/dist/intelligence/
cp -a "$stage/active-planner-page.tsx" apps/web/src/app/dashboard/active-planner/page.tsx
cp -a "$stage/actions-page.tsx" apps/web/src/app/dashboard/command-center/actions/page.tsx
npm run build --workspace=apps/web
pm2 restart sak-api-test sak-web-test >/dev/null

for attempt in {1..90}; do
  sleep 2
  api_http="$(curl -sS -o /dev/null -w '%{http_code}' http://127.0.0.1:4001/api/v1/intelligence/notifications || true)"
  work_http="$(curl -sS -o /dev/null -w '%{http_code}' http://127.0.0.1:3001/dashboard/command-center/actions || true)"
  planner_http="$(curl -sS -o /dev/null -w '%{http_code}' http://127.0.0.1:3001/dashboard/active-planner || true)"
  if [[ "$api_http" =~ ^(401|403)$ ]] && [[ "$work_http" == 200 ]] && [[ "$planner_http" == 200 ]]; then
    trap - ERR
    printf '{"deployed":true,"target":"mizantra-only","api_auth_http":%s,"my_work_http":%s,"planner_http":%s,"backup":"%s"}\n' "$api_http" "$work_http" "$planner_http" "$backup"
    exit 0
  fi
done
false
