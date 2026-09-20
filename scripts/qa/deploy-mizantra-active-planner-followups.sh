#!/usr/bin/env bash
set -euo pipefail

app=/var/www/sak-erp-test
stage=/tmp/mizantra-active-planner-followups
backup=/root/sak-deploy-backups/mizantra-active-planner-followups-$(date +%Y%m%d-%H%M%S)
page=apps/web/src/app/dashboard/active-planner/page.tsx

[[ "$PWD" == "$app" ]]
[[ "$(readlink -f "$app")" == "$app" ]]
[[ -f "$stage/page.tsx" ]]
mkdir -p "$backup"
cp -a "$page" "$backup/page.tsx"
if [[ -d apps/web/.next ]]; then mv apps/web/.next "$backup/web-next"; fi

rollback() {
  echo 'Active Planner follow-up deployment failed; restoring Mizantra web.' >&2
  cp -a "$backup/page.tsx" "$page"
  rm -rf apps/web/.next
  if [[ -d "$backup/web-next" ]]; then mv "$backup/web-next" apps/web/.next; fi
  pm2 restart sak-web-test >/dev/null || true
}
trap rollback ERR

cp -a "$stage/page.tsx" "$page"
npm run build --workspace=apps/web
pm2 restart sak-web-test >/dev/null
for attempt in {1..75}; do
  sleep 2
  web_http="$(curl -sS -o /dev/null -w '%{http_code}' http://127.0.0.1:3001/dashboard/active-planner || true)"
  if [[ "$web_http" == 200 ]]; then
    trap - ERR
    printf '{"deployed":true,"target":"mizantra-only","planner_http":%s,"backup":"%s"}\n' "$web_http" "$backup"
    exit 0
  fi
done
false
