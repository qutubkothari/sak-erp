#!/usr/bin/env bash
set -Eeuo pipefail
stage=/tmp/controlled-po-history-20260912
stamp="$(date +%Y%m%d-%H%M%S)"
live=/var/www/sak-erp
test=/var/www/sak-erp-test
file=apps/api/src/purchase/services/purchase-orders.service.ts
staged=0

rollback() {
  code=$?
  if (( code != 0 && staged == 1 )); then
    for app in "$live" "$test"; do
      cp -a "$app/backups/controlled-po-history-${stamp}/purchase-orders.service.ts" "$app/$file"
      (cd "$app" && SAK_LIVE_RELEASE_APPROVED=YES SAK_LIVE_RELEASE_TICKET=CONTROLLED-PO-HISTORY-20260912 pnpm --filter @sak-erp/api build) >/dev/null 2>&1 || true
    done
    pm2 restart sak-api sak-api-test --update-env >/dev/null 2>&1 || true
  fi
  exit "$code"
}
trap rollback EXIT

[[ "$(readlink -f "$live")" == "$live" && "$(readlink -f "$test")" == "$test" ]]
read_db() { node - "$1" <<'NODE'
const fs=require('fs');const l=fs.readFileSync(process.argv[2],'utf8').split(/\r?\n/).find(x=>/^DATABASE_URL=/.test(x));if(!l)process.exit(2);let v=l.slice(l.indexOf('=')+1).trim();if((v[0]==='"'&&v.at(-1)==='"')||(v[0]==="'"&&v.at(-1)==="'"))v=v.slice(1,-1);process.stdout.write(v);
NODE
}
db="$(read_db "$live/apps/api/.env")"
[[ "$db" == "$(read_db "$test/apps/api/.env")" ]]
mkdir -p /home/qutubk/sak-deploy-backups
psql "$db" -At -v ON_ERROR_STOP=1 -c "SELECT COALESCE(json_agg(t),'[]'::json) FROM purchase_order_drawing_packages t" | gzip > "/home/qutubk/sak-deploy-backups/po-drawing-packages-${stamp}.json.gz"
for app in "$live" "$test"; do
  mkdir -p "$app/backups/controlled-po-history-${stamp}"
  cp -a "$app/$file" "$app/backups/controlled-po-history-${stamp}/purchase-orders.service.ts"
  cp -a "$stage/purchase-orders.service.ts" "$app/$file"
done
staged=1
psql "$db" -v ON_ERROR_STOP=1 -f "$stage/add-controlled-po-drawing-packages.sql" >/dev/null
for app in "$live" "$test"; do (cd "$app" && SAK_LIVE_RELEASE_APPROVED=YES SAK_LIVE_RELEASE_TICKET=CONTROLLED-PO-HISTORY-20260912 pnpm --filter @sak-erp/api build); done
pm2 restart sak-api sak-api-test --update-env >/dev/null
for attempt in $(seq 1 30); do
  l="$(curl -sS -o /dev/null -w '%{http_code}' http://127.0.0.1:4000/api/v1/purchase/orders || true)"
  t="$(curl -sS -o /dev/null -w '%{http_code}' http://127.0.0.1:4001/api/v1/purchase/orders || true)"
  [[ "$l" == 401 && "$t" == 401 ]] && break
  sleep 2
done
[[ "$l" == 401 && "$t" == 401 ]]
psql "$db" -At -v ON_ERROR_STOP=1 -c "SELECT json_build_object('history_table',to_regclass('public.purchase_order_drawing_package_history') IS NOT NULL,'history_rows',(SELECT count(*) FROM purchase_order_drawing_package_history))"
printf '{"deployed":true,"live_api":%s,"test_api":%s}\n' "$l" "$t"
trap - EXIT
