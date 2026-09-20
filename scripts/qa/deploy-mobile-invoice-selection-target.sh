#!/usr/bin/env bash
set -Eeuo pipefail

app="${APP_ROOT:?APP_ROOT is required}"
process_name="${WEB_PROCESS:?WEB_PROCESS is required}"
web_port="${WEB_PORT:?WEB_PORT is required}"
stage="${STAGE_ROOT:?STAGE_ROOT is required}"
backup_root="${BACKUP_ROOT:?BACKUP_ROOT is required}"
backup="$backup_root/mobile-invoice-selection-$(date +%Y%m%d-%H%M%S)"
paths=(apps/web/src/components/ui/ListTable.tsx apps/web/src/app/dashboard/accounts/supplier-invoices/page.tsx)

case "$(readlink -f "$app")" in /var/www/sak-erp|/var/www/sak-erp-test) ;; *) exit 65 ;; esac
[[ "$PWD" == "$app" ]]
for file in "${paths[@]}"; do [[ -f "$stage/$file" && -f "$file" ]]; done

mkdir -p "$backup"
tar -czf "$backup/sources-before.tgz" "${paths[@]}"
tar -czf "$backup/web-next-before.tgz" -C apps/web .next

rollback() {
  code=$?
  if ((code == 0)); then return; fi
  tar -xzf "$backup/sources-before.tgz" -C "$app"
  rm -rf -- apps/web/.next
  tar -xzf "$backup/web-next-before.tgz" -C apps/web
  pm2 restart "$process_name" --update-env >/dev/null 2>&1 || true
  echo "Mobile invoice-selection deployment failed; restored $backup" >&2
  exit "$code"
}
trap rollback ERR

for file in "${paths[@]}"; do cp "$stage/$file" "$file"; done
if [[ "$app" == "/var/www/sak-erp" ]]; then
  export SAK_LIVE_RELEASE_APPROVED=YES
  export SAK_LIVE_RELEASE_TICKET=MOBILE-INVOICE-SELECTION-20260906
fi
pm2 stop "$process_name" >/dev/null
pnpm --filter @sak-erp/web build
pm2 start "$process_name" --update-env >/dev/null
pm2 save >/dev/null

for _ in {1..30}; do
  status="$(curl -sS -o /dev/null -w '%{http_code}' "http://127.0.0.1:$web_port/dashboard/accounts/supplier-invoices" || true)"
  state="$(pm2 jlist | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{const p=JSON.parse(s).find(x=>x.name===process.argv[1]);process.stdout.write(p?.pm2_env?.status||'missing')})" "$process_name")"
  marker="$(grep -R -l --fixed-strings 'isRowSelectable' apps/web/.next/server 2>/dev/null | head -1 || true)"
  if [[ "$status" == "200" && "$state" == "online" && -n "$marker" ]]; then
    trap - ERR
    echo "MOBILE_INVOICE_SELECTION_DEPLOYED backup=$backup http=$status"
    exit 0
  fi
  sleep 2
done
false
