#!/usr/bin/env bash
set -Eeuo pipefail

app=/var/www/sak-erp
stage=/tmp/saif-po-pdf-unicode-20260908
release=po-pdf-unicode-20260908
source_path=apps/api/src/purchase/services/world-class-po-pdf.service.ts
backup="$app/backups/$release-$(date +%Y%m%d-%H%M%S)"

[[ "$PWD" == "$app" ]]
[[ "$(readlink -f "$app")" == "$app" ]]
[[ -f "$stage/$source_path" ]]
pm2 describe sak-api | grep -q online

mkdir -p "$backup/source/$(dirname "$source_path")"
cp -a "$source_path" "$backup/source/$source_path"
tar -czf "$backup/api-dist.tgz" -C apps/api dist

rollback() {
  code=$?
  trap - ERR
  echo 'Deployment failed; restoring the previous Saif API release.' >&2
  pm2 stop sak-api >/dev/null 2>&1 || true
  cp -a "$backup/source/$source_path" "$source_path"
  [[ "$(readlink -f apps/api/dist)" == "$app/apps/api/dist" ]]
  rm -rf -- apps/api/dist
  tar -xzf "$backup/api-dist.tgz" -C apps/api
  pm2 restart sak-api --update-env >/dev/null 2>&1 || true
  exit "$code"
}
trap rollback ERR

cp -a "$stage/$source_path" "$source_path"
SAK_LIVE_RELEASE_APPROVED=YES \
SAK_LIVE_RELEASE_TICKET="$release" \
pnpm --filter @sak-erp/api build
pm2 restart sak-api --update-env
pm2 save

for attempt in {1..20}; do
  sleep 2
  api_status="$(pm2 jlist | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{const p=JSON.parse(s).find(x=>x.name==='sak-api');process.stdout.write(p?.pm2_env?.status||'missing')})")"
  http_status="$(curl -sS -o /dev/null -w '%{http_code}' https://erp.saifseas.com/api/v1/purchase/orders || true)"
  if [[ "$api_status" == online && "$http_status" == 401 ]]; then
    trap - ERR
    printf '{"result":"deployed","target":"saif-live","service":"sak-api","http":%s,"backup":"%s"}\n' "$http_status" "$backup"
    exit 0
  fi
done

echo 'Saif API did not pass its runtime probe.' >&2
false
