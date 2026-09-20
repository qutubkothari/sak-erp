#!/usr/bin/env bash
set -euo pipefail

app="${1:-}"
process_name="${2:-}"
api_port="${3:-}"
stage="${4:-}"

case "$app|$process_name|$api_port" in
  /var/www/sak-erp-test\|sak-api-test\|4001) target=mizantra ;;
  /var/www/sak-erp\|sak-api\|4000) target=saifseas ;;
  *) echo "Refusing unapproved deployment target." >&2; exit 2 ;;
esac

[[ "$(readlink -f "$app")" == "$app" ]]
[[ -d "$stage/src" && -d "$stage/dist" ]]
files=(
  active-planner.service
  conversational-analytics.service
  semantic-erp-query.service
)
for name in "${files[@]}"; do
  [[ -f "$stage/src/$name.ts" ]]
  [[ -f "$stage/dist/$name.js" ]]
  [[ -f "$app/apps/api/src/intelligence/$name.ts" ]]
  [[ -f "$app/apps/api/dist/intelligence/$name.js" ]]
done

backup="/root/sak-deploy-backups/${target}-active-planner-context-$(date +%Y%m%d-%H%M%S)"
mkdir -p "$backup/src" "$backup/dist"
for name in "${files[@]}"; do
  cp -a "$app/apps/api/src/intelligence/$name.ts" "$backup/src/"
  cp -a "$app/apps/api/dist/intelligence/$name.js"* "$backup/dist/"
done

rollback() {
  echo "Planner deployment failed; restoring $target API." >&2
  cp -a "$backup/src/"*.ts "$app/apps/api/src/intelligence/"
  cp -a "$backup/dist/"*.js* "$app/apps/api/dist/intelligence/"
  pm2 restart "$process_name" >/dev/null || true
}
trap rollback ERR

for name in "${files[@]}"; do
  cp -a "$stage/src/$name.ts" "$app/apps/api/src/intelligence/"
  cp -a "$stage/dist/$name.js" "$app/apps/api/dist/intelligence/"
  [[ ! -f "$stage/dist/$name.js.map" ]] || \
    cp -a "$stage/dist/$name.js.map" "$app/apps/api/dist/intelligence/"
done

pm2 restart "$process_name" >/dev/null
for attempt in {1..25}; do
  sleep 2
  status="$(pm2 jlist | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{const p=JSON.parse(s).find(x=>x.name===process.argv[1]);process.stdout.write(p?.pm2_env?.status||'missing')})" "$process_name")"
  auth_http="$(curl -sS -o /dev/null -w '%{http_code}' "http://127.0.0.1:$api_port/api/v1/active-planner/conversations" || true)"
  if [[ "$status" == online && "$auth_http" =~ ^(401|403)$ ]]; then
    trap - ERR
    printf '{"deployed":true,"target":"%s","status":"%s","auth_guard_http":%s,"backup":"%s"}\n' \
      "$target" "$status" "$auth_http" "$backup"
    exit 0
  fi
done

false
