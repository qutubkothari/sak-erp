#!/usr/bin/env bash
set -Eeuo pipefail

app=/var/www/sak-erp-test
archive=/tmp/mizantra-stock-trail-hotfix-20260910-v1.tar.gz
stage=/tmp/mizantra-stock-trail-hotfix-20260910-v1-stage
release=stock-trail-hotfix-20260910-v1
backup="$app/backups/$release-$(date +%Y%m%d-%H%M%S)"

[[ "$PWD" == "$app" ]]
[[ "$(readlink -f "$app")" == "$app" ]]
[[ -f "$archive" ]]

paths=(
  apps/api/src/items/services/items.service.ts
  apps/api/dist/items/services/items.service.js
  apps/api/dist/items/services/items.service.js.map
  scripts/qa/diagnose-stock-trail-item.cjs
  scripts/qa/stock-trail-readonly.cjs
)

rm -rf -- "$stage"
mkdir -p "$stage" "$backup/files"
tar -xzf "$archive" -C "$stage"

for file in "${paths[@]}"; do
  [[ -f "$stage/$file" ]]
  if [[ -f "$app/$file" ]]; then
    mkdir -p "$backup/files/$(dirname "$file")"
    cp -a "$app/$file" "$backup/files/$file"
  else
    printf '%s\n' "$file" >> "$backup/files-created.txt"
  fi
done

rollback() {
  status=$?
  trap - ERR
  for file in "${paths[@]}"; do
    if [[ -f "$backup/files/$file" ]]; then
      mkdir -p "$app/$(dirname "$file")"
      cp -a "$backup/files/$file" "$app/$file"
    else
      rm -f -- "$app/$file"
    fi
  done
  pm2 restart sak-api-test --update-env >/dev/null 2>&1 || true
  echo "Stock Trail deployment rolled back: $backup" >&2
  exit "$status"
}
trap rollback ERR

for file in "${paths[@]}"; do
  mkdir -p "$app/$(dirname "$file")"
  cp -a "$stage/$file" "$app/$file"
done

pm2 restart sak-api-test --update-env >/dev/null

api_status=000
for _ in $(seq 1 30); do
  api_status="$(curl -sS -o /dev/null -w '%{http_code}' http://127.0.0.1:4001/api/v1/auth/me || true)"
  [[ "$api_status" =~ ^(401|403)$ ]] && break
  sleep 1
done
[[ "$api_status" =~ ^(401|403)$ ]]
pm2 describe sak-api-test | grep -q online

acceptance="$(node scripts/qa/stock-trail-readonly.cjs apps/api/.env 700-0002)"
printf '%s\n' "$acceptance"
grep -q '"status": "PASS"' <<<"$acceptance"
grep -q '"currentBalance": 80' <<<"$acceptance"
grep -q 'JO-2026-09-0001' <<<"$acceptance"
grep -q 'JO-2026-09-0003' <<<"$acceptance"

trap - ERR
rm -rf -- "$stage"
echo "STOCK_TRAIL_HOTFIX_DEPLOYED api=$api_status backup=$backup"
