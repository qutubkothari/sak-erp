#!/usr/bin/env bash
set -Eeuo pipefail

app=/var/www/sak-erp-test
stage=/tmp/mizantra-inclusive-bot-20260911
backup="$app/backups/inclusive-bot-$(date +%Y%m%d-%H%M%S)"
api_source=apps/api/src/intelligence/active-planner-memory.service.ts
web_source=apps/web/src/app/dashboard/active-planner/page.tsx

[[ "$PWD" == "$app" ]]
[[ "$(readlink -f "$app")" == "$app" ]]
[[ -f "$stage/$api_source" ]]
[[ -f "$stage/$web_source" ]]

mkdir -p "$backup/$(dirname "$api_source")" "$backup/$(dirname "$web_source")"
cp -a "$api_source" "$backup/$api_source"
cp -a "$web_source" "$backup/$web_source"
tar -czf "$backup/api-dist.tgz" -C apps/api dist
tar -czf "$backup/web-next.tgz" -C apps/web .next

rollback() {
  code=$?
  if (( code != 0 )); then
    cp -a "$backup/$api_source" "$api_source"
    cp -a "$backup/$web_source" "$web_source"
    rm -rf -- "$app/apps/api/dist" "$app/apps/web/.next"
    tar -xzf "$backup/api-dist.tgz" -C "$app/apps/api"
    tar -xzf "$backup/web-next.tgz" -C "$app/apps/web"
    pm2 restart sak-api-test sak-web-test --update-env >/dev/null 2>&1 || true
  fi
  exit "$code"
}
trap rollback EXIT

cp -a "$stage/$api_source" "$api_source"
cp -a "$stage/$web_source" "$web_source"
pnpm --filter @sak-erp/api build
pnpm --filter @sak-erp/web build
pm2 restart sak-api-test sak-web-test --update-env >/dev/null

api_http=0
web_http=0
for _ in $(seq 1 40); do
  api_http="$(curl -sS -o /dev/null -w '%{http_code}' http://127.0.0.1:4001/api/v1/active-planner/conversations || true)"
  web_http="$(curl -sS -o /dev/null -w '%{http_code}' http://127.0.0.1:3001/dashboard/active-planner || true)"
  [[ "$api_http" =~ ^(401|403)$ && "$web_http" =~ ^(200|307|308)$ ]] && break
  sleep 2
done

[[ "$api_http" =~ ^(401|403)$ ]]
[[ "$web_http" =~ ^(200|307|308)$ ]]
grep -Fq "explicitNonEnglishLanguage" "$api_source"
grep -Fq 'aria-label="Conversation with Mizantra"' "$web_source"
pm2 describe sak-api-test | grep -q online
pm2 describe sak-web-test | grep -q online
pm2 save >/dev/null

trap - EXIT
printf '{"deployed":true,"api":%s,"web":%s,"backup":"%s"}\n' "$api_http" "$web_http" "$backup"
