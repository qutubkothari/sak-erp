#!/usr/bin/env bash
set -Eeuo pipefail

app=/var/www/sak-erp-test
stage=/tmp/mizantra-layman-bot-20260911
backup="$app/backups/layman-bot-$(date +%Y%m%d-%H%M%S)"
sources=(
  apps/api/src/intelligence/active-planner.capabilities.ts
  apps/api/src/intelligence/active-planner.service.ts
  apps/api/src/intelligence/active-planner-memory.service.ts
  apps/api/src/intelligence/conversational-analytics.service.ts
)

[[ "$PWD" == "$app" ]]
[[ "$(readlink -f "$app")" == "$app" ]]
for source in "${sources[@]}"; do
  [[ -f "$stage/$source" ]]
  mkdir -p "$backup/$(dirname "$source")"
  cp -a "$source" "$backup/$source"
done
tar -czf "$backup/api-dist.tgz" -C apps/api dist

rollback() {
  code=$?
  if (( code != 0 )); then
    for source in "${sources[@]}"; do
      cp -a "$backup/$source" "$source"
    done
    rm -rf -- "$app/apps/api/dist"
    tar -xzf "$backup/api-dist.tgz" -C "$app/apps/api"
    pm2 restart sak-api-test --update-env >/dev/null 2>&1 || true
  fi
  exit "$code"
}
trap rollback EXIT

for source in "${sources[@]}"; do
  cp -a "$stage/$source" "$source"
done
pnpm --filter @sak-erp/api build
pm2 restart sak-api-test --update-env >/dev/null

api_http=0
for _ in $(seq 1 40); do
  api_http="$(curl -sS -o /dev/null -w '%{http_code}' http://127.0.0.1:4001/api/v1/active-planner/conversations || true)"
  [[ "$api_http" =~ ^(401|403)$ ]] && break
  sleep 2
done

[[ "$api_http" =~ ^(401|403)$ ]]
grep -Fq "normalizeLaymanEnglish" apps/api/src/intelligence/active-planner.capabilities.ts
grep -Fq "ordinary office and factory language" apps/api/src/intelligence/active-planner.service.ts
grep -Fq "Everyday words" apps/api/src/intelligence/active-planner-memory.service.ts || \
  grep -Fq "everyday words" apps/api/src/intelligence/active-planner-memory.service.ts
grep -Fq "are we making money" apps/api/src/intelligence/conversational-analytics.service.ts
pm2 describe sak-api-test | grep -q online
pm2 save >/dev/null

trap - EXIT
printf '{"deployed":true,"api":%s,"backup":"%s"}\n' "$api_http" "$backup"
