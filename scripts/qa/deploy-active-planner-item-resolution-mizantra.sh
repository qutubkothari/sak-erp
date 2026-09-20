#!/usr/bin/env bash
set -Eeuo pipefail

app=/var/www/sak-erp-test
source_file=/tmp/active-planner.service.ts
backup="$app/backups/active-planner-item-resolution-$(date +%Y%m%d-%H%M%S)"

[[ "$PWD" == "$app" ]]
[[ "$(readlink -f "$app")" == "$app" ]]
[[ -f "$source_file" ]]
mkdir -p "$backup"
cp -a apps/api/src/intelligence/active-planner.service.ts "$backup/active-planner.service.ts"
tar -czf "$backup/api-dist.tgz" -C apps/api dist

rollback() {
  result=$?
  trap - ERR
  cp -a "$backup/active-planner.service.ts" apps/api/src/intelligence/active-planner.service.ts
  rm -rf -- "$app/apps/api/dist"
  tar -xzf "$backup/api-dist.tgz" -C "$app/apps/api"
  pm2 restart sak-api-test --update-env || true
  exit "$result"
}
trap rollback ERR

cp -a "$source_file" apps/api/src/intelligence/active-planner.service.ts
pnpm --filter @sak-erp/api build
pm2 restart sak-api-test --update-env

api_status=000
for _ in $(seq 1 30); do
  api_status=$(curl -sS -o /dev/null -w '%{http_code}' -X POST -H 'content-type: application/json' -d '{}' http://127.0.0.1:4001/api/v1/active-planner/interpret || true)
  [[ "$api_status" =~ ^(401|403)$ ]] && break
  sleep 2
done
[[ "$api_status" =~ ^(401|403)$ ]]
pm2 describe sak-api-test | grep -q online
trap - ERR
printf '{"result":"deployed","target":"mizantra","backup":"%s","api":%s}\n' "$backup" "$api_status"
