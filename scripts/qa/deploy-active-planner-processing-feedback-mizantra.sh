#!/usr/bin/env bash
set -Eeuo pipefail

app=/var/www/sak-erp-test
stage=/tmp/mizantra-processing-feedback-20260908
backup=/root/sak-deploy-backups/mizantra-processing-feedback-$(date +%Y%m%d-%H%M%S)
page=apps/web/src/app/dashboard/active-planner/page.tsx

[[ "$PWD" == "$app" ]]
[[ "$(readlink -f "$app")" == "$app" ]]
grep -q 'db.nwkaruzvzwwuftjquypk.supabase.co' apps/api/.env
[[ -f "$stage/web-next.tgz" ]]
[[ -f "$stage/$page" ]]
grep -q 'Request is processing' "$stage/$page"

mkdir -p "$backup/$(dirname "$page")"
cp -a "$page" "$backup/$page"
mv apps/web/.next "$backup/web-next"

rollback() {
  result=$?
  trap - ERR
  cp -a "$backup/$page" "$page"
  [[ ! -d apps/web/.next ]] || rm -rf -- apps/web/.next
  mv "$backup/web-next" apps/web/.next
  pm2 restart sak-web-test --update-env >/dev/null || true
  exit "$result"
}
trap rollback ERR

cp -a "$stage/$page" "$page"
tar -xzf "$stage/web-next.tgz" -C apps/web

pm2 restart sak-web-test --update-env >/dev/null
pm2 save >/dev/null
for _ in $(seq 1 45); do
  web_http=$(curl -sS -o /dev/null -w '%{http_code}' http://127.0.0.1:3001/dashboard/active-planner || true)
  web_status=$(pm2 jlist | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{const p=JSON.parse(s).find(x=>x.name==='sak-web-test');process.stdout.write(p?.pm2_env?.status||'missing')})")
  if [[ "$web_http" == 200 && "$web_status" == online ]] &&
    grep -R -q 'Request is processing' apps/web/.next/static/chunks/app/dashboard/active-planner; then
    trap - ERR
    rm -rf -- "$stage"
    printf '{"deployed":true,"target":"mizantra-only","web":"%s","web_http":%s,"backup":"%s"}\n' "$web_status" "$web_http" "$backup"
    exit 0
  fi
  sleep 2
done
false
