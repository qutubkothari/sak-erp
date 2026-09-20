#!/usr/bin/env bash
set -Eeuo pipefail

stage=/tmp/grn-po-access-20260912
stamp="$(date +%Y%m%d-%H%M%S)"
live=/var/www/sak-erp
test=/var/www/sak-erp-test
file=apps/web/src/app/dashboard/purchase/grn/page.tsx
staged=0

rollback() {
  code=$?
  if (( code != 0 && staged == 1 )); then
    echo "GRN PO-access deployment failed; restoring prior web sources." >&2
    cp -a "$live/backups/grn-po-access-${stamp}/page.tsx" "$live/$file"
    cp -a "$test/backups/grn-po-access-${stamp}/page.tsx" "$test/$file"
    (cd "$live" && pnpm --filter @sak-erp/web build) >/dev/null 2>&1 || true
    (cd "$test" && pnpm --filter @sak-erp/web build) >/dev/null 2>&1 || true
    pm2 restart sak-web sak-web-test --update-env >/dev/null 2>&1 || true
  fi
  exit "$code"
}
trap rollback EXIT

[[ "$(readlink -f "$live")" == "$live" ]]
[[ "$(readlink -f "$test")" == "$test" ]]
[[ -f "$stage/live/page.tsx" && -f "$stage/test/page.tsx" ]]

mkdir -p "$live/backups/grn-po-access-${stamp}" "$test/backups/grn-po-access-${stamp}"
cp -a "$live/$file" "$live/backups/grn-po-access-${stamp}/page.tsx"
cp -a "$test/$file" "$test/backups/grn-po-access-${stamp}/page.tsx"
cp -a "$stage/live/page.tsx" "$live/$file"
cp -a "$stage/test/page.tsx" "$test/$file"
staged=1

(cd "$live" && pnpm --filter @sak-erp/web build)
(cd "$test" && pnpm --filter @sak-erp/web build)
pm2 restart sak-web sak-web-test --update-env >/dev/null

for attempt in $(seq 1 45); do
  live_web="$(curl -sS -o /dev/null -w '%{http_code}' http://127.0.0.1:3000/dashboard/purchase/grn || true)"
  test_web="$(curl -sS -o /dev/null -w '%{http_code}' http://127.0.0.1:3001/dashboard/purchase/grn || true)"
  live_pdf="$(curl -sS -o /dev/null -w '%{http_code}' http://127.0.0.1:4000/api/v1/purchase/orders/00000000-0000-0000-0000-000000000000/pdf/world-class || true)"
  test_pdf="$(curl -sS -o /dev/null -w '%{http_code}' http://127.0.0.1:4001/api/v1/purchase/orders/00000000-0000-0000-0000-000000000000/pdf/world-class || true)"
  if [[ "$live_web" =~ ^(200|307|308)$ && "$test_web" =~ ^(200|307|308)$ && "$live_pdf" == 401 && "$test_pdf" == 401 ]]; then break; fi
  sleep 2
done

[[ "$live_web" =~ ^(200|307|308)$ && "$test_web" =~ ^(200|307|308)$ ]]
[[ "$live_pdf" == 401 && "$test_pdf" == 401 ]]
pm2 describe sak-web | grep -q online
pm2 describe sak-web-test | grep -q online

printf '{"deployed":true,"live_web":%s,"test_web":%s,"live_pdf":%s,"test_pdf":%s,"backup_stamp":"%s"}\n' \
  "$live_web" "$test_web" "$live_pdf" "$test_pdf" "$stamp"
trap - EXIT
