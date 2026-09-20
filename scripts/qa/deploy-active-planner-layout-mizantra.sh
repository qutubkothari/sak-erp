#!/usr/bin/env bash
set -Eeuo pipefail

app=/var/www/sak-erp-test
source_file=/tmp/active-planner-page.tsx
backup="$app/backups/active-planner-layout-$(date +%Y%m%d-%H%M%S)"

[[ "$PWD" == "$app" ]]
[[ "$(readlink -f "$app")" == "$app" ]]
[[ -f "$source_file" ]]

mkdir -p "$backup"
cp -a apps/web/src/app/dashboard/active-planner/page.tsx "$backup/page.tsx"
tar -czf "$backup/web-next.tgz" -C apps/web .next

rollback() {
  result=$?
  trap - ERR
  cp -a "$backup/page.tsx" apps/web/src/app/dashboard/active-planner/page.tsx
  rm -rf -- "$app/apps/web/.next"
  tar -xzf "$backup/web-next.tgz" -C "$app/apps/web"
  pm2 restart sak-web-test --update-env || true
  exit "$result"
}
trap rollback ERR

cp -a "$source_file" apps/web/src/app/dashboard/active-planner/page.tsx
pnpm --filter @sak-erp/web build
pm2 restart sak-web-test --update-env

web_status=000
for _ in $(seq 1 45); do
  web_status=$(curl -sS -o /dev/null -w '%{http_code}' http://127.0.0.1:3001/dashboard/active-planner || true)
  [[ "$web_status" =~ ^(200|307|308)$ ]] && break
  sleep 2
done
[[ "$web_status" =~ ^(200|307|308)$ ]]
pm2 describe sak-web-test | grep -q online
trap - ERR
printf '{"result":"deployed","target":"mizantra","backup":"%s","web":%s}\n' "$backup" "$web_status"
