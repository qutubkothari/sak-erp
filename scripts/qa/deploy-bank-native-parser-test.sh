#!/usr/bin/env bash
set -euo pipefail
app=/var/www/sak-erp-test
cd "$app"
web_target="$(readlink -f apps/web/.next)"
api_target="$(readlink -f apps/api/dist)"
test "$web_target" = "$app/apps/web/.next" || { echo "Unexpected web path" >&2; exit 1; }
test "$api_target" = "$app/apps/api/dist" || { echo "Unexpected API path" >&2; exit 1; }
pm2 stop sak-web-test sak-api-test
rm -rf -- "$web_target" "$api_target"
tar -xzf /tmp/bank-native-parser-test-20260824.tar.gz -C "$app"
rm -f /tmp/bank-native-parser-test-20260824.tar.gz
pm2 restart sak-api-test sak-web-test
pm2 save
for _ in 1 2 3 4 5 6 7 8 9 10; do
  if curl -fs http://127.0.0.1:3001/dashboard/accounts >/dev/null && curl -s http://127.0.0.1:4001/api/v1 >/dev/null; then exit 0; fi
  sleep 1
done
exit 1
