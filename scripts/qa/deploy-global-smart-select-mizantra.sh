#!/usr/bin/env bash
set -Eeuo pipefail

app=/var/www/sak-erp-test
stage=/tmp/mizantra-global-smart-select
release=global-smart-select-20260908
backup="$app/backups/$release-$(date +%Y%m%d-%H%M%S)"
files=(
  apps/web/src/app/layout.tsx
  apps/web/src/components/GlobalSmartSelect.tsx
  apps/web/src/lib/smart-search.ts
)

[[ "$PWD" == "$app" ]]
[[ "$(readlink -f "$app")" == "$app" ]]
for file in "${files[@]}"; do [[ -f "$stage/$file" ]]; done

mkdir -p "$backup/source"
for file in "${files[@]}"; do
  mkdir -p "$backup/source/$(dirname "$file")"
  if [[ -f "$file" ]]; then
    cp -a "$file" "$backup/source/$file"
  else
    touch "$backup/source/$file.missing"
  fi
done
tar -czf "$backup/web-next.tgz" -C apps/web .next

rollback() {
  result=$?
  trap - ERR
  for file in "${files[@]}"; do
    if [[ -f "$backup/source/$file.missing" ]]; then
      rm -f -- "$file"
    else
      cp -a "$backup/source/$file" "$file"
    fi
  done
  rm -rf -- apps/web/.next
  tar -xzf "$backup/web-next.tgz" -C apps/web
  pm2 restart sak-web-test --update-env >/dev/null 2>&1 || true
  exit "$result"
}
trap rollback ERR

for file in "${files[@]}"; do
  mkdir -p "$(dirname "$file")"
  cp -a "$stage/$file" "$file"
done

pnpm --filter @sak-erp/web build
pm2 restart sak-web-test --update-env
pm2 save

status=000
for _ in $(seq 1 45); do
  status=$(curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:3001/login || true)
  [[ "$status" == 200 ]] && break
  sleep 2
done
[[ "$status" == 200 ]]
pm2 describe sak-web-test | grep -q online
trap - ERR
rm -rf -- "$stage"
printf '{"result":"deployed","target":"mizantra-only","backup":"%s","web":%s}\n' "$backup" "$status"
