#!/usr/bin/env bash
set -Eeuo pipefail

target="${1:-}"
case "$target" in
  saif-live)
    app=/var/www/sak-erp
    api_service=sak-api
    web_service=sak-web
    api_port=4000
    web_port=3000
    export SAK_LIVE_RELEASE_APPROVED=YES
    export SAK_LIVE_RELEASE_TICKET=RND-PR-APPROVAL-GATE-20260908
    ;;
  mizantra)
    app=/var/www/sak-erp-test
    api_service=sak-api-test
    web_service=sak-web-test
    api_port=4001
    web_port=3001
    ;;
  *)
    echo "Usage: $0 saif-live|mizantra" >&2
    exit 2
    ;;
esac

stage="/tmp/rnd-pr-approval-gate-$target-20260908-v1"
release="rnd-pr-approval-gate-$target-20260908-v1"
files=(
  apps/api/src/purchase/services/purchase-requisitions.service.ts
  apps/web/src/components/RndTemporaryItemModal.tsx
)
backup="$app/backups/$release-$(date +%Y%m%d-%H%M%S)"

[[ "$PWD" == "$app" ]]
[[ "$(readlink -f "$app")" == "$app" ]]
for file in "${files[@]}"; do [[ -f "$stage/$file" ]]; done
pm2 describe "$api_service" | grep -q online
pm2 describe "$web_service" | grep -q online

mkdir -p "$backup"
tar -czf "$backup/source.tgz" "${files[@]}"
[[ ! -d apps/api/dist ]] || tar -czf "$backup/api-dist.tgz" -C apps/api dist
[[ ! -d apps/web/.next ]] || tar -czf "$backup/web-next.tgz" -C apps/web .next

rollback() {
  code=$?
  trap - ERR
  echo "Deployment failed; restoring the previous $target release." >&2
  pm2 stop "$api_service" "$web_service" >/dev/null 2>&1 || true
  tar -xzf "$backup/source.tgz" -C "$app"
  if [[ -f "$backup/api-dist.tgz" ]]; then
    [[ "$(readlink -f apps/api/dist)" == "$app/apps/api/dist" ]]
    rm -rf -- apps/api/dist
    tar -xzf "$backup/api-dist.tgz" -C apps/api
  fi
  if [[ -f "$backup/web-next.tgz" ]]; then
    [[ "$(readlink -f apps/web/.next)" == "$app/apps/web/.next" ]]
    rm -rf -- apps/web/.next
    tar -xzf "$backup/web-next.tgz" -C apps/web
  fi
  pm2 restart "$api_service" "$web_service" --update-env >/dev/null 2>&1 || true
  exit "$code"
}
trap rollback ERR

for file in "${files[@]}"; do cp -a "$stage/$file" "$file"; done
grep -q "allowUnverifiedRndTemporary" "${files[0]}"
grep -q "cannot be approved until the item is verified and active" "${files[1]}"

pnpm --filter @sak-erp/api build
pnpm --filter @sak-erp/web build
pm2 restart "$api_service" "$web_service" --update-env
pm2 save

api_status=000
web_status=000
for _ in $(seq 1 45); do
  api_status="$(curl -sS -o /dev/null -w '%{http_code}' "http://127.0.0.1:$api_port/api/v1/purchase/requisitions" || true)"
  web_status="$(curl -sS -o /dev/null -w '%{http_code}' "http://127.0.0.1:$web_port/dashboard/purchase/requisitions" || true)"
  [[ "$api_status" == 401 && "$web_status" == 200 ]] && break
  sleep 2
done

[[ "$api_status" == 401 ]]
[[ "$web_status" == 200 ]]
pm2 describe "$api_service" | grep -q online
pm2 describe "$web_service" | grep -q online

trap - ERR
rm -rf -- "$stage"
printf '{"result":"deployed","target":"%s","api":%s,"web":%s,"backup":"%s"}\n' "$target" "$api_status" "$web_status" "$backup"
