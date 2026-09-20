#!/usr/bin/env bash
set -Eeuo pipefail

app="${APP_ROOT:?APP_ROOT is required}"
process_name="${WEB_PROCESS:?WEB_PROCESS is required}"
web_port="${WEB_PORT:?WEB_PORT is required}"
stage=/tmp/hr-attendance-camera-page.tsx
page=apps/web/src/app/dashboard/hr/page.tsx
backup="$app/backups/hr-attendance-camera-$(date +%Y%m%d-%H%M%S)"
next_backup="/tmp/${process_name}-before-hr-attendance-camera.tgz"

[[ "$PWD" == "$app" ]]
[[ "$(readlink -f "$app")" == "$app" ]]
[[ -f "$stage" ]]
[[ -f "$page" ]]

mkdir -p "$backup"
cp -a "$page" "$backup/page.tsx"
tar -czf "$next_backup" -C apps/web .next

rollback() {
  local code=$?
  if (( code != 0 )); then
    echo "Attendance camera deployment failed; restoring prior web release." >&2
    cp -a "$backup/page.tsx" "$page"
    rm -rf -- apps/web/.next
    tar -xzf "$next_backup" -C apps/web
    pm2 restart "$process_name" --update-env >/dev/null || true
  fi
  rm -f -- "$next_backup"
  exit "$code"
}
trap rollback EXIT

cp -a "$stage" "$page"
pnpm --filter @sak-erp/web exec next build
pm2 restart "$process_name" --update-env >/dev/null

for attempt in {1..30}; do
  sleep 2
  status="$(pm2 jlist | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{const p=JSON.parse(s).find(x=>x.name===process.argv[1]);process.stdout.write(p?.pm2_env?.status||'missing')})" "$process_name")"
  http="$(curl -sS -o /dev/null -w '%{http_code}' "http://127.0.0.1:${web_port}/dashboard/hr/employees" || true)"
  marker="$(grep -R -l --fixed-strings 'Take Selfie & Complete End Day' apps/web/.next/static apps/web/.next/server 2>/dev/null | head -1 || true)"
  if [[ "$status" == "online" && "$http" == "200" && -n "$marker" ]]; then
    rm -f -- "$next_backup"
    trap - EXIT
    printf '{"deployed":true,"process":"%s","status":"%s","http":%s,"marker":"%s","source_backup":"%s"}\n' "$process_name" "$status" "$http" "$marker" "$backup"
    exit 0
  fi
done

false
