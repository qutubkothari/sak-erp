#!/usr/bin/env bash
set -Eeuo pipefail

stage=/tmp/grn-po-download-20260913
stamp="$(date +%Y%m%d-%H%M%S)"
app=/var/www/sak-erp
api_file=apps/api/src/purchase/controllers/purchase-orders.controller.ts
web_file=apps/web/src/app/dashboard/purchase/grn/page.tsx
backup="$app/backups/grn-po-download-${stamp}"
staged=0
export SAK_LIVE_RELEASE_APPROVED=YES
export SAK_LIVE_RELEASE_TICKET=GRN-PO-DOWNLOAD-20260913

rollback() {
  code=$?
  if (( code != 0 && staged == 1 )); then
    echo "GRN PO download deployment failed; restoring prior runtime." >&2
    cp -a "$backup/$api_file" "$app/$api_file"
    cp -a "$backup/$web_file" "$app/$web_file"
    (cd "$app" && pnpm --filter @sak-erp/api build && pnpm --filter @sak-erp/web build) >/dev/null 2>&1 || true
    pm2 restart sak-api sak-web --update-env >/dev/null 2>&1 || true
  fi
  exit "$code"
}
trap rollback EXIT

[[ "$(readlink -f "$app")" == "$app" ]]
[[ -f "$stage/$api_file" && -f "$stage/$web_file" ]]

mkdir -p "$backup/$(dirname "$api_file")" "$backup/$(dirname "$web_file")"
cp -a "$app/$api_file" "$backup/$api_file"
cp -a "$app/$web_file" "$backup/$web_file"
cp -a "$stage/$api_file" "$app/$api_file"
cp -a "$stage/$web_file" "$app/$web_file"
staged=1

(cd "$app" && pnpm --filter @sak-erp/api build)
(cd "$app" && pnpm --filter @sak-erp/web build)
pm2 restart sak-api sak-web --update-env >/dev/null

for attempt in $(seq 1 45); do
  api_http="$(curl -sS -o /dev/null -w '%{http_code}' http://127.0.0.1:4000/api/v1/purchase/orders/00000000-0000-0000-0000-000000000000/pdf/world-class || true)"
  web_http="$(curl -sS -o /dev/null -w '%{http_code}' http://127.0.0.1:3000/dashboard/purchase/grn || true)"
  if [[ "$api_http" == 401 && "$web_http" =~ ^(200|307|308)$ ]]; then break; fi
  sleep 2
done

[[ "$api_http" == 401 ]]
[[ "$web_http" =~ ^(200|307|308)$ ]]
pm2 describe sak-api | grep -q online
pm2 describe sak-web | grep -q online
grep -q "isFinalPurchaseOrderDocumentStatus" "$app/$api_file"
grep -q "Download PDF" "$app/$web_file"

printf '{"deployed":true,"api_http":%s,"web_http":%s,"backup":"%s"}\n' "$api_http" "$web_http" "$backup"
trap - EXIT
