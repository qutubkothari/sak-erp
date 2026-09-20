#!/usr/bin/env bash
set -euo pipefail

app=/var/www/sak-erp-test
stage=/tmp/mizantra-active-planner-safety-contract-20260830
backup=/root/sak-deploy-backups/mizantra-active-planner-safety-contract-$(date +%Y%m%d-%H%M%S)
test "$PWD" = "$app"
test "$(readlink -f "$app")" = "$app"

paths=(
  apps/api/src/intelligence/active-planner.service.ts
  apps/api/dist/intelligence/active-planner.service.js
  apps/api/dist/intelligence/active-planner.service.js.map
)
for path in "${paths[@]}"; do test -f "$stage/$path"; done
mkdir -p "$backup"
tar -czf "$backup/files-before.tar.gz" "${paths[@]}"
for path in "${paths[@]}"; do cp "$stage/$path" "$path"; done
pm2 restart sak-api-test

verified=false
for _ in 1 2 3 4 5 6 7 8 9 10 11 12 13 14 15; do
  code="$(curl -sS -o /dev/null -w '%{http_code}' -X POST -H 'content-type: application/json' -d '{}' http://127.0.0.1:4001/api/v1/active-planner/interpret || true)"
  if [[ "$code" =~ ^(401|403)$ ]]; then verified=true; break; fi
  sleep 2
done
if [ "$verified" != true ]; then
  tar -xzf "$backup/files-before.tar.gz" -C "$app"
  pm2 restart sak-api-test
  echo 'Safety-contract deployment failed; prior Mizantra files restored.' >&2
  exit 1
fi
pm2 save
echo "Mizantra Active Planner safety contract deployed. Backup: $backup"
