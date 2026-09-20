#!/usr/bin/env bash
set -euo pipefail
app=/var/www/sak-erp-test
target="$app/apps/api/dist"
test "$PWD" = "$app" || exit 1
test "$(readlink -f "$target")" = "$target" || exit 1
pm2 stop sak-api-test
rm -rf -- "$target"
tar -xzf /tmp/inventory-api-hotfix-test.tar.gz -C "$app"
pm2 restart sak-api-test
pm2 save
sleep 5
curl -fsS http://127.0.0.1:4001/api/v1/costing/inventory-events -o /dev/null -w '%{http_code}\n' | grep -Eq '^(401|403)$'
