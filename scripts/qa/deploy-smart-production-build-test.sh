#!/usr/bin/env bash
set -euo pipefail
app=/var/www/sak-erp-test
api="$app/apps/api/dist"
web="$app/apps/web/.next"
test "$PWD" = "$app"
test "$(readlink -f "$api")" = "$api"
test "$(readlink -f "$web")" = "$web"
test -f /tmp/smart-production-planning-build-test.tar.gz
pm2 stop sak-api-test sak-web-test
rm -rf -- "$api" "$web"
tar -xzf /tmp/smart-production-planning-build-test.tar.gz -C "$app"
pm2 restart sak-api-test sak-web-test
pm2 save
for _ in 1 2 3 4 5 6 7 8 9 10; do
  api_code="$(curl -sS -o /dev/null -w '%{http_code}' http://127.0.0.1:4001/api/v1/production-planning/dashboard || true)"
  if [[ "$api_code" =~ ^(401|403)$ ]] && curl -fsS http://127.0.0.1:3001/dashboard/production/smart-planning >/dev/null; then
    rm -f /tmp/smart-production-planning-build-test.tar.gz
    echo 'Mizantra TEST build verified.'
    exit 0
  fi
  sleep 2
done
exit 1
