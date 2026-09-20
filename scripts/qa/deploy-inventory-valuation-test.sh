#!/usr/bin/env bash
set -euo pipefail
app=/var/www/sak-erp-test
api_target="$app/apps/api/dist"
web_target="$app/apps/web/.next"
test "$PWD" = "$app" || { echo "Refusing to deploy outside $app" >&2; exit 1; }
test "$(readlink -f "$api_target")" = "$api_target" || exit 1
test "$(readlink -f "$web_target")" = "$web_target" || exit 1
pm2 stop sak-api-test sak-web-test
rm -rf -- "$api_target" "$web_target"
tar -xzf /tmp/inventory-valuation-build-test.tar.gz -C "$app"
pm2 restart sak-api-test sak-web-test
pm2 save
sleep 5
curl -fsS http://127.0.0.1:4001/api/v1/health >/dev/null
curl -fsS http://127.0.0.1:3001/dashboard/accounts/costing >/dev/null
pm2 status sak-api-test sak-web-test
