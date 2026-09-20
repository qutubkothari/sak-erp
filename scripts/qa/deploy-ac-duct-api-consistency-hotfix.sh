#!/usr/bin/env bash
set -Eeuo pipefail
app=/var/www/sak-erp-test
stage=/tmp/mizantra-ac-duct-api-hotfix
backup="$app/backups/ac-duct-api-consistency-20260907-$(date +%Y%m%d-%H%M%S)"
target=apps/api/src/production/services/job-order.service.ts
[[ "$PWD" == "$app" ]]
[[ "$(readlink -f "$app")" == "$app" ]]
[[ -f "$stage/job-order.service.ts" ]]
mkdir -p "$backup/$(dirname "$target")"
cp -a "$target" "$backup/$target"
[[ ! -d apps/api/dist ]] || tar -czf "$backup/api-dist.tgz" -C apps/api dist
rollback() {
  result=$?
  trap - ERR
  cp -a "$backup/$target" "$target"
  if [[ -f "$backup/api-dist.tgz" ]]; then rm -rf -- apps/api/dist; tar -xzf "$backup/api-dist.tgz" -C apps/api; fi
  pm2 restart sak-api-test --update-env || true
  exit "$result"
}
trap rollback ERR
cp -a "$stage/job-order.service.ts" "$target"
pnpm --filter @sak-erp/api build
pm2 restart sak-api-test --update-env
api_status=000
for _ in $(seq 1 30); do
  api_status=$(curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:4001/api/v1/production-standardization/configuration-packs || true)
  [[ "$api_status" == 401 ]] && break
  sleep 2
done
[[ "$api_status" == 401 ]]
pm2 describe sak-api-test | grep -q online
trap - ERR
printf '{"result":"deployed","backup":"%s","api":%s}\n' "$backup" "$api_status"
