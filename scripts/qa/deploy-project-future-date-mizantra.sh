#!/usr/bin/env bash
set -Eeuo pipefail

app=/var/www/sak-erp-test
stage=/tmp/mizantra-project-future-date-20260908-v1
release=project-future-date-20260908-v1
file=apps/api/src/common/pipes/no-future-dates.pipe.ts
backup="$app/backups/$release-$(date +%Y%m%d-%H%M%S)"

[[ "$PWD" == "$app" ]]
[[ "$(readlink -f "$app")" == "$app" ]]
[[ -f "$stage/$file" ]]
pm2 describe sak-api-test | grep -q online

mkdir -p "$backup/source/$(dirname "$file")"
cp -a "$file" "$backup/source/$file"
[[ ! -d apps/api/dist ]] || tar -czf "$backup/api-dist.tgz" -C apps/api dist

rollback() {
  code=$?
  trap - ERR
  echo "Deployment failed; restoring the previous Mizantra API release." >&2
  pm2 stop sak-api-test >/dev/null 2>&1 || true
  cp -a "$backup/source/$file" "$file"
  if [[ -f "$backup/api-dist.tgz" ]]; then
    [[ "$(readlink -f apps/api/dist)" == "$app/apps/api/dist" ]]
    rm -rf -- apps/api/dist
    tar -xzf "$backup/api-dist.tgz" -C apps/api
  fi
  pm2 restart sak-api-test --update-env >/dev/null 2>&1 || true
  exit "$code"
}
trap rollback ERR

cp -a "$stage/$file" "$file"
grep -q '"committedDeliveryDate"' "$file"
pnpm --filter @sak-erp/api build
pm2 restart sak-api-test --update-env
pm2 save

status=000
for _ in $(seq 1 40); do
  status="$(curl -sS -o /dev/null -w '%{http_code}' http://127.0.0.1:4001/api/v1/projects || true)"
  [[ "$status" == 401 ]] && break
  sleep 2
done

[[ "$status" == 401 ]]
pm2 describe sak-api-test | grep -q online

trap - ERR
rm -rf -- "$stage"
printf '{"result":"deployed","target":"mizantra-only","service":"sak-api-test","api":%s,"backup":"%s"}\n' "$status" "$backup"
