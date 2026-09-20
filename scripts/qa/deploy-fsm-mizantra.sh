#!/usr/bin/env bash
set -Eeuo pipefail

app=/var/www/sak-erp-test
archive=/tmp/mizantra-fsm-release-20260911.tgz
stage="$(mktemp -d /tmp/mizantra-fsm-release.XXXXXX)"
backup="$app/backups/fsm-release-$(date +%Y%m%d-%H%M%S)"
env_file="$app/apps/api/.env"

[[ "$PWD" == "$app" ]]
[[ "$(readlink -f "$app")" == "$app" ]]
[[ -s "$archive" ]]
[[ -f "$env_file" ]]
grep -q 'nwkaruzvzwwuftjquypk' "$env_file"

tar -xzf "$archive" -C "$stage"

paths=(
  apps/api/src/app.module.ts
  apps/api/src/auth/guards/permissions.guard.ts
  apps/api/src/auth/utils/permission-utils.ts
  apps/api/src/common/pipes/no-future-dates.pipe.ts
  apps/api/src/common/pipes/no-future-dates.pipe.spec.ts
  apps/api/src/crm/crm.controller.ts
  apps/api/src/crm/crm.module.ts
  apps/api/src/intelligence/intelligence.module.ts
  apps/api/src/intelligence/conversational-analytics.service.ts
  apps/api/src/intelligence/active-planner.service.ts
  apps/api/src/fsm/fsm.domain.ts
  apps/api/src/fsm/fsm.service.ts
  apps/api/src/fsm/fsm.controller.ts
  apps/api/src/fsm/fsm.module.ts
  apps/api/src/fsm/fsm.domain.spec.ts
  apps/api/src/fsm/fsm-bot-intent.spec.ts
  apps/web/src/components/Sidebar.tsx
  apps/web/src/lib/permission-config.ts
  apps/web/src/lib/fsm-offline.ts
  apps/web/src/app/dashboard/fsm/page.tsx
)

for item in "${paths[@]}"; do
  [[ -f "$stage/$item" ]]
done

mkdir -p "$backup/source"
for item in "${paths[@]}"; do
  if [[ -f "$app/$item" ]]; then
    mkdir -p "$backup/source/$(dirname "$item")"
    cp -a "$app/$item" "$backup/source/$item"
  fi
done
tar -czf "$backup/api-dist.tgz" -C "$app/apps/api" dist
tar -czf "$backup/web-next.tgz" -C "$app/apps/web" .next

rollback() {
  code=$?
  trap - ERR
  pm2 stop sak-api-test sak-web-test >/dev/null 2>&1 || true
  for item in "${paths[@]}"; do
    rm -f -- "$app/$item"
    if [[ -f "$backup/source/$item" ]]; then
      mkdir -p "$app/$(dirname "$item")"
      cp -a "$backup/source/$item" "$app/$item"
    fi
  done
  rm -rf -- "$app/apps/api/dist" "$app/apps/web/.next"
  tar -xzf "$backup/api-dist.tgz" -C "$app/apps/api"
  tar -xzf "$backup/web-next.tgz" -C "$app/apps/web"
  pm2 restart sak-api-test sak-web-test --update-env >/dev/null 2>&1 || true
  rm -rf -- "$stage"
  echo "FSM application deployment failed; Mizantra runtime restored from $backup" >&2
  exit "$code"
}
trap rollback ERR

for item in "${paths[@]}"; do
  mkdir -p "$app/$(dirname "$item")"
  cp -a "$stage/$item" "$app/$item"
done

pnpm --filter @sak-erp/api exec jest \
  src/common/pipes/no-future-dates.pipe.spec.ts \
  src/fsm/fsm.domain.spec.ts \
  src/fsm/fsm-bot-intent.spec.ts \
  --runInBand
pnpm --filter @sak-erp/api build
pnpm --filter @sak-erp/web build

pm2 restart sak-api-test sak-web-test --update-env >/dev/null
pm2 save >/dev/null

api_http=000
web_http=000
for _ in $(seq 1 45); do
  api_http="$(curl -sS -o /dev/null -w '%{http_code}' http://127.0.0.1:4001/api/v1/fsm/capabilities || true)"
  web_http="$(curl -sS -o /dev/null -w '%{http_code}' http://127.0.0.1:3001/dashboard/fsm || true)"
  if [[ "$api_http" =~ ^(401|403)$ && "$web_http" == 200 ]]; then
    break
  fi
  sleep 2
done

[[ "$api_http" =~ ^(401|403)$ ]]
[[ "$web_http" == 200 ]]
pm2 describe sak-api-test | grep -q online
pm2 describe sak-web-test | grep -q online
grep -q 'FsmModule' "$app/apps/api/dist/app.module.js"
grep -q 'Field Sales' "$app/apps/web/src/components/Sidebar.tsx"

trap - ERR
rm -rf -- "$stage"
rm -f -- "$archive"
printf '{"deployed":true,"target":"mizantra-only","api_http":%s,"web_http":%s,"backup":"%s"}\n' \
  "$api_http" "$web_http" "$backup"
