#!/usr/bin/env bash
set -Eeuo pipefail
app=/var/www/sak-erp-test
web="$app/apps/web/.next"
archive=/tmp/factory-readiness-web-20260909.tgz
backup="$app/backups/factory-readiness-web-$(date +%Y%m%d-%H%M%S).tgz"
test "$PWD" = "$app"
test "$(readlink -f "$web")" = "$web"
test -s "$archive"
tar -czf "$backup" -C "$app/apps/web" .next
rollback(){ code=$?; trap - ERR; pm2 stop sak-web-test >/dev/null 2>&1 || true; rm -rf -- "$web"; tar -xzf "$backup" -C "$app/apps/web"; pm2 restart sak-web-test >/dev/null 2>&1 || true; exit "$code"; }
trap rollback ERR
pm2 stop sak-web-test >/dev/null
rm -rf -- "$web"
tar -xzf "$archive" -C "$app/apps/web"
test -f "$web/BUILD_ID"
pm2 restart sak-web-test --update-env >/dev/null
for _ in $(seq 1 30); do
  code="$(curl -sS -o /dev/null -w '%{http_code}' http://127.0.0.1:3001/dashboard/production/job-orders || true)"
  test "$code" = 200 && break
  sleep 1
done
test "$code" = 200
pm2 describe sak-web-test | grep -q online
trap - ERR
rm -f -- "$archive"
echo "FACTORY_READINESS_WEB_DEPLOYED backup=$backup http=$code"
