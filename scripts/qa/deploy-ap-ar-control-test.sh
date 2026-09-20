#!/usr/bin/env bash
set -euo pipefail
app=/var/www/sak-erp-test
api="$app/apps/api/dist"; web="$app/apps/web/.next"
test "$PWD" = "$app" || exit 1
test "$(readlink -f "$api")" = "$api" || exit 1
test "$(readlink -f "$web")" = "$web" || exit 1
pm2 stop sak-api-test sak-web-test
rm -rf -- "$api" "$web"
tar -xzf /tmp/ap-ar-control-build-test.tar.gz -C "$app"
pm2 restart sak-api-test sak-web-test
pm2 save
sleep 5
curl -sS -o /dev/null -w '%{http_code}' http://127.0.0.1:4001/api/v1/accounting/working-capital-control | grep -Eq '^(401|403)$'
curl -fsS http://127.0.0.1:3001/dashboard/accounts/collections >/dev/null
