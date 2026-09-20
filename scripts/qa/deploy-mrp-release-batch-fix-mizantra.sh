#!/usr/bin/env bash
set -Eeuo pipefail

app=/var/www/sak-erp-test
stage=/tmp/mizantra-mrp-release-batch-fix
backup="$app/backups/mrp-release-batch-fix-$(date +%Y%m%d-%H%M%S)"
target="$app/apps/api/dist/mrp"

[[ "$PWD" == "$app" ]]
[[ "$(readlink -f "$app")" == "$app" ]]
[[ -s "$stage/mrp-exception.service.js" ]]
[[ -s "$stage/mrp-exception.service.js.map" ]]
[[ -s "$target/mrp-exception.service.js" ]]

mkdir -p "$backup" "$target"
cp -a "$target/mrp-exception.service.js" "$backup/"
cp -a "$target/mrp-exception.service.js.map" "$backup/"

rollback() {
  code=$?
  trap - ERR
  cp -a "$backup/mrp-exception.service.js" "$target/"
  cp -a "$backup/mrp-exception.service.js.map" "$target/"
  pm2 restart sak-api-test --update-env >/dev/null 2>&1 || true
  echo "MRP release fix failed; API file restored from $backup" >&2
  exit "$code"
}
trap rollback ERR

cp -a "$stage/mrp-exception.service.js" "$target/"
cp -a "$stage/mrp-exception.service.js.map" "$target/"
pm2 restart sak-api-test --update-env >/dev/null

api_code=000
for _ in $(seq 1 30); do
  api_code="$(curl -sS -o /dev/null -w '%{http_code}' http://127.0.0.1:4001/api/v1/mrp/latest || true)"
  [[ "$api_code" =~ ^(401|403)$ ]] && break
  sleep 2
done
[[ "$api_code" =~ ^(401|403)$ ]]
pm2 describe sak-api-test | grep -q online
grep -q 'offset += 75' "$target/mrp-exception.service.js"

trap - ERR
rm -rf -- "$stage"
printf '{"deployed":true,"target":"mizantra-only","api_http":%s,"backup":"%s"}\n' "$api_code" "$backup"
