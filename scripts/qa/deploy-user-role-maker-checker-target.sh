#!/usr/bin/env bash
set -Eeuo pipefail

if [[ "$#" -ne 3 ]]; then
  echo "usage: $0 <live|test> <app-root> <stage-dir>" >&2
  exit 64
fi

target="$1"
app_root="$(readlink -f "$2")"
stage="$(readlink -f "$3")"
export SAK_DEPLOY_TARGET="$target"

case "$target:$app_root" in
  live:/var/www/sak-erp)
    api_process=sak-api; web_process=sak-web; api_port=4000; web_port=3000
    host=72.62.192.228; ssh_user=qutubk; public_url=https://erp.saifseas.com
    export SAK_LIVE_RELEASE_APPROVED=YES
    export SAK_LIVE_RELEASE_TICKET=USER-REQUEST-20260917-ROLE-MAKER-CHECKER
    ;;
  test:/var/www/sak-erp-test)
    api_process=sak-api-test; web_process=sak-web-test; api_port=4001; web_port=3001
    host=200.141.1.206; ssh_user=root; public_url=https://mizantra.saksolution.com
    ;;
  *) echo "deployment target/root mismatch" >&2; exit 65 ;;
esac

cd "$app_root"
node scripts/assert-deployment-target.cjs \
  --target "$target" --host "$host" --ssh-user "$ssh_user" \
  --app-root "$app_root" --api-process "$api_process" --web-process "$web_process" \
  --api-port "$api_port" --web-port "$web_port" --public-url "$public_url"

files=(
  apps/api/src/user/user.controller.ts
  apps/api/src/user/user.service.ts
  apps/web/src/app/dashboard/settings/components/UserManagement.tsx
  migrations/add-user-role-maker-checker.sql
)
for file in "${files[@]}"; do test -f "$stage/$file"; done

stamp="$(date +%Y%m%d-%H%M%S)"
backup="$app_root/backups/user-role-maker-checker-$stamp"
mkdir -p "$backup"
tar -czf "$backup/source-and-builds.tar.gz" \
  apps/api/src/user/user.controller.ts \
  apps/api/src/user/user.service.ts \
  apps/web/src/app/dashboard/settings/components/UserManagement.tsx \
  apps/api/dist apps/web/.next

for file in "${files[@]}"; do
  mkdir -p "$(dirname "$app_root/$file")"
  cp "$stage/$file" "$app_root/$file"
done

database_url="$(tr -d '\r' < apps/api/.env | sed -n 's/^DATABASE_URL=//p' | head -n 1 | sed -e 's/^"//' -e 's/"$//' -e "s/^'//" -e "s/'$//")"
test -n "$database_url"
psql "$database_url" -X -v ON_ERROR_STOP=1 -1 -f migrations/add-user-role-maker-checker.sql

pnpm --filter @sak-erp/api build
pnpm --filter @sak-erp/web build
pm2 restart "$api_process" --update-env
pm2 restart "$web_process" --update-env

api_ok=0; web_ok=0
for _ in $(seq 1 30); do
  api_status="$(curl -sS -o /dev/null -w '%{http_code}' "http://127.0.0.1:$api_port/api/v1/users" || true)"
  web_status="$(curl -sS -o /dev/null -w '%{http_code}' "http://127.0.0.1:$web_port/dashboard/settings" || true)"
  [[ "$api_status" == "401" ]] && api_ok=1
  [[ "$web_status" =~ ^(200|307)$ ]] && web_ok=1
  [[ "$api_ok" -eq 1 && "$web_ok" -eq 1 ]] && break
  sleep 2
done
test "$api_ok" -eq 1
test "$web_ok" -eq 1
pm2 describe "$api_process" | grep -q online
pm2 describe "$web_process" | grep -q online

echo "USER_ROLE_MAKER_CHECKER_DEPLOYED target=$target api=$api_status web=$web_status backup=$backup"
