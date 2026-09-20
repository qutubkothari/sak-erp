#!/usr/bin/env bash
set -euo pipefail
app=/var/www/sak-erp-test
cd "$app"
target="$(readlink -f apps/web/.next)"
test "$target" = "$app/apps/web/.next" || { echo "Unexpected web build path: $target" >&2; exit 1; }
pm2 stop sak-web-test
rm -rf -- "$target"
tar -xzf /tmp/bank-ui-test-20260824.tar.gz -C "$app"
rm -f /tmp/bank-ui-test-20260824.tar.gz
pm2 restart sak-web-test
pm2 save
for _ in 1 2 3 4 5 6 7 8 9 10; do
  if curl -fs http://127.0.0.1:3001/dashboard/accounts >/dev/null; then exit 0; fi
  sleep 1
done
exit 1
