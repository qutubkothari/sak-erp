#!/usr/bin/env bash
set -euo pipefail

app=/var/www/sak-erp-test
stage=/tmp/mizantra-mdg-uid-demo-20260830
backup=/root/sak-deploy-backups/mizantra-mdg-uid-demo-$(date +%Y%m%d-%H%M%S)

test "$PWD" = "$app"
test "$(readlink -f "$app")" = "$app"
test -f "$stage/apps/api/dist/master-data-governance/master-data-governance.service.js"
test -f "$stage/scripts/qa/seed-mizantra-demo-golden.cjs"

paths=(
  apps/api/src/master-data-governance/master-data-governance.service.ts
  apps/api/dist/master-data-governance/master-data-governance.service.js
  apps/api/dist/master-data-governance/master-data-governance.service.js.map
  scripts/qa/seed-mizantra-demo-golden.cjs
)

mkdir -p "$backup"
existing=()
for path in "${paths[@]}"; do
  if [ -e "$path" ]; then existing+=("$path"); fi
done
tar -czf "$backup/files-before.tar.gz" "${existing[@]}"

for path in "${paths[@]}"; do
  mkdir -p "$(dirname "$path")"
  cp "$stage/$path" "$path"
done

pm2 restart sak-api-test
verified=false
for _ in 1 2 3 4 5 6 7 8 9 10 11 12 13 14 15; do
  code="$(curl -sS -o /dev/null -w '%{http_code}' -X POST \
    -H 'content-type: application/json' \
    -d '{"username":"__health__","password":"__health__"}' \
    http://127.0.0.1:4001/api/v1/auth/login || true)"
  if [ "$code" = 401 ]; then
    verified=true
    break
  fi
  sleep 2
done

if [ "$verified" != true ]; then
  tar -xzf "$backup/files-before.tar.gz" -C "$app"
  pm2 restart sak-api-test
  echo 'Mizantra UID-governance deployment failed; prior files restored.' >&2
  exit 1
fi

pm2 save
echo "Mizantra UID-governance deployment verified. Backup: $backup"
