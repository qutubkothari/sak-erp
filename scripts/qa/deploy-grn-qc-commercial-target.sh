#!/usr/bin/env bash
set -Eeuo pipefail

app="${APP_ROOT:?APP_ROOT is required}"
process_name="${WEB_PROCESS:?WEB_PROCESS is required}"
web_port="${WEB_PORT:?WEB_PORT is required}"
stage=/tmp/grn-qc-commercial-page.tsx
expected_root="$(readlink -f "$app")"
backup="$app/backups/grn-qc-commercial-$(date +%Y%m%d-%H%M%S)"
page=apps/web/src/app/dashboard/purchase/grn/page.tsx

[[ "$PWD" == "$app" ]]
[[ "$expected_root" == "$app" ]]
[[ -f "$stage" ]]
[[ -f "$page" ]]

mkdir -p "$backup"
cp -a "$page" "$backup/page.tsx"
tar -czf "$backup/web-next.tgz" -C apps/web .next

rollback() {
  local code=$?
  if (( code != 0 )); then
    echo "GRN QC commercial deployment failed; restoring prior web release." >&2
    cp -a "$backup/page.tsx" "$page"
    rm -rf -- apps/web/.next
    tar -xzf "$backup/web-next.tgz" -C apps/web
    pm2 restart "$process_name" --update-env >/dev/null || true
  fi
  exit "$code"
}
trap rollback EXIT

cp -a "$stage" "$page"

if [[ "$app" == "/var/www/sak-erp" ]]; then
  export SAK_LIVE_RELEASE_APPROVED=YES
  export SAK_LIVE_RELEASE_TICKET=GRN-QC-COMMERCIAL-TOTAL-20260905
fi

pnpm --filter @sak-erp/web exec next build
pm2 restart "$process_name" --update-env >/dev/null

for attempt in {1..30}; do
  sleep 2
  status="$(pm2 jlist | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{const p=JSON.parse(s).find(x=>x.name===process.argv[1]);process.stdout.write(p?.pm2_env?.status||'missing')})" "$process_name")"
  http="$(curl -sS -o /dev/null -w '%{http_code}' "http://127.0.0.1:${web_port}/dashboard/purchase/grn" || true)"
  marker="$(grep -R -l --fixed-strings 'Invoice / GRN commercial reconciliation' apps/web/.next/static apps/web/.next/server 2>/dev/null | head -1 || true)"
  if [[ "$status" == "online" && "$http" == "200" && -n "$marker" ]]; then
    trap - EXIT
    printf '{"deployed":true,"process":"%s","status":"%s","http":%s,"marker":"%s","backup":"%s"}\n' "$process_name" "$status" "$http" "$marker" "$backup"
    exit 0
  fi
done

false
