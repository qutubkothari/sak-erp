#!/usr/bin/env bash
set -euo pipefail

app=/var/www/sak-erp-test
stage=/tmp/mizantra-mrp-policy-completion-20260830
backup=/root/sak-deploy-backups/mizantra-mrp-policy-completion-$(date +%Y%m%d-%H%M%S)

test "$PWD" = "$app"
test "$(readlink -f "$app")" = "$app"
test -f "$stage/apps/web/.next/BUILD_ID"
test -f "$stage/apps/api/dist/mrp/mrp.service.js"
test -f "$stage/apps/api/dist/mrp/mrp-exception.service.js"

paths=(
  apps/api/src/mrp/mrp.service.ts
  apps/api/src/mrp/mrp-exception.service.ts
  apps/api/dist/mrp/mrp.service.js
  apps/api/dist/mrp/mrp.service.js.map
  apps/api/dist/mrp/mrp-exception.service.js
  apps/api/dist/mrp/mrp-exception.service.js.map
  apps/web/src/app/dashboard/production/mrp/page.tsx
  apps/web/src/app/dashboard/production/planning-configuration/page.tsx
)

mkdir -p "$backup"
existing_paths=()
for path in "${paths[@]}"; do
  if [ -e "$path" ]; then
    existing_paths+=("$path")
  else
    echo "$path" >> "$backup/missing-before.txt"
  fi
done
tar -czf "$backup/files-before.tar.gz" "${existing_paths[@]}"
for path in "${paths[@]}"; do
  mkdir -p "$(dirname "$path")"
  cp "$stage/$path" "$path"
done

mv apps/web/.next "$backup/web-next"
mv "$stage/apps/web/.next" apps/web/.next
pm2 restart sak-api-test sak-web-test
pm2 save

verified=false
for _ in 1 2 3 4 5 6 7 8 9 10; do
  api_code="$(curl -sS -o /dev/null -w '%{http_code}' http://127.0.0.1:4001/api/v1/mrp/latest || true)"
  mrp_code="$(curl -sS -o /dev/null -w '%{http_code}' http://127.0.0.1:3001/dashboard/production/mrp || true)"
  config_code="$(curl -sS -o /dev/null -w '%{http_code}' http://127.0.0.1:3001/dashboard/production/planning-configuration || true)"
  if [[ "$api_code" =~ ^(401|403)$ ]] && [ "$mrp_code" = 200 ] && [ "$config_code" = 200 ]; then
    verified=true
    break
  fi
  sleep 2
done

if [ "$verified" != true ]; then
  rm -rf -- "$app/apps/web/.next"
  mv "$backup/web-next" "$app/apps/web/.next"
  tar -xzf "$backup/files-before.tar.gz" -C "$app"
  if [ -f "$backup/missing-before.txt" ]; then
    while IFS= read -r path; do rm -f -- "$app/$path"; done < "$backup/missing-before.txt"
  fi
  pm2 restart sak-api-test sak-web-test
  echo 'MRP policy-completion deployment failed health checks; previous test runtime restored.' >&2
  exit 1
fi

echo "Mizantra TEST MRP policy completion deployed and verified. Backup: $backup"
