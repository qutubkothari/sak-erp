#!/usr/bin/env bash
set -euo pipefail

app=/var/www/sak-erp-test
stage=/tmp/mizantra-permission-normalization-20260830
backup=/root/sak-deploy-backups/mizantra-permission-normalization-$(date +%Y%m%d-%H%M%S)

test "$PWD" = "$app"
test "$(readlink -f "$app")" = "$app"

paths=(
  apps/api/src/auth/utils/permission-utils.ts
  apps/api/src/auth/utils/permission-utils.spec.ts
  apps/api/dist/auth/utils/permission-utils.js
  apps/api/dist/auth/utils/permission-utils.js.map
)

for path in "${paths[@]}"; do test -f "$stage/$path"; done
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
  code="$(curl -sS -o /dev/null -w '%{http_code}' -X POST -H 'content-type: application/json' -d '{}' http://127.0.0.1:4001/api/v1/active-planner/interpret || true)"
  if [[ "$code" =~ ^(401|403)$ ]]; then verified=true; break; fi
  sleep 2
done

if [ "$verified" != true ]; then
  for path in "${paths[@]}"; do rm -f -- "$app/$path"; done
  tar -xzf "$backup/files-before.tar.gz" -C "$app"
  pm2 restart sak-api-test
  echo 'Permission normalization deployment failed; prior Mizantra files restored.' >&2
  exit 1
fi

pm2 save
echo "Mizantra permission normalization deployed and verified. Backup: $backup"
