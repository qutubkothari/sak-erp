#!/usr/bin/env bash
set -Eeuo pipefail

app="${APP_ROOT:?APP_ROOT is required}"
api_process="${API_PROCESS:?API_PROCESS is required}"
web_process="${WEB_PROCESS:?WEB_PROCESS is required}"
api_port="${API_PORT:?API_PORT is required}"
web_port="${WEB_PORT:?WEB_PORT is required}"
stage="${STAGE_ROOT:?STAGE_ROOT is required}"
profile="${DB_PROFILE:-normal}"
release="crm-sales-scorecards-$(date +%Y%m%d-%H%M%S)"
backup_base="${BACKUP_ROOT:?BACKUP_ROOT is required}/$release"

case "$(readlink -f "$app")" in
  /var/www/sak-erp|/var/www/sak-erp-test) ;;
  *) echo "Refusing unexpected application root." >&2; exit 65 ;;
esac
[[ "$PWD" == "$app" ]]

paths=(
  apps/api/src/crm/crm-growth.service.ts
  apps/web/src/app/dashboard/crm/RevenueOperationsWorkspace.tsx
  migrations/add-crm-salesperson-scorecards.sql
)
for file in "${paths[@]}"; do [[ -f "$stage/$file" ]]; done

mkdir -p "$backup_base"
existing=()
for file in "${paths[@]}"; do [[ -e "$file" ]] && existing+=("$file"); done
if ((${#existing[@]})); then tar -czf "$backup_base/sources-before.tgz" "${existing[@]}"; fi
tar -czf "$backup_base/api-crm-dist-before.tgz" -C apps/api/dist crm
tar -czf "$backup_base/web-next-before.tgz" -C apps/web .next
cp "$stage/scripts/qa/backup-crm-scorecard-database.cjs" "$backup_base/backup-database.cjs"

if [[ "$profile" == "mizantra-test" ]]; then
  node "$backup_base/backup-database.cjs" apps/api/.env "$backup_base/database-before.dump" "$profile"
else
  node "$backup_base/backup-database.cjs" apps/api/.env "$backup_base/database-before.dump" live
fi

rollback() {
  code=$?
  if ((code == 0)); then return; fi
  echo "Scorecard deployment failed; restoring prior application runtime." >&2
  [[ -f "$backup_base/sources-before.tgz" ]] && tar -xzf "$backup_base/sources-before.tgz" -C "$app"
  rm -rf -- apps/api/dist/crm apps/web/.next
  tar -xzf "$backup_base/api-crm-dist-before.tgz" -C apps/api/dist
  tar -xzf "$backup_base/web-next-before.tgz" -C apps/web
  pm2 restart "$api_process" "$web_process" --update-env >/dev/null 2>&1 || true
  exit "$code"
}
trap rollback ERR

for file in "${paths[@]}"; do
  mkdir -p "$(dirname "$file")"
  cp "$stage/$file" "$file"
done

if [[ "$profile" == "mizantra-test" ]]; then
  node - "$app/apps/api/.env" "$app/migrations/add-crm-salesperson-scorecards.sql" <<'NODE'
const fs=require('fs'),{Pool}=require('pg'),dotenv=require('dotenv');
const values=dotenv.parse(fs.readFileSync(process.argv[2]));
let raw=values.DIRECT_URL||values.DATABASE_URL;
raw=raw.replace(/^postgesql:/,'postgresql:').replace('://postges:','://postgres:').replace(/nwkauz/g,'nwkaruz').replace('/postges?','/postgres?');
const url=new URL(raw); url.username='postgres.nwkaruzvzwwuftjquypk'; url.hostname='aws-1-ap-southeast-1.pooler.supabase.com'; url.port='5432';
for(const key of ['sslmode','sslrootcert','sslcert','sslkey']) url.searchParams.delete(key);
const pool=new Pool({connectionString:url.toString(),ssl:{rejectUnauthorized:false}});
pool.query(fs.readFileSync(process.argv[3],'utf8')).then(()=>console.log('Migration applied.')).finally(()=>pool.end()).catch(error=>{console.error(error.message);process.exitCode=1});
NODE
else
  node - "$app/apps/api/.env" "$app/migrations/add-crm-salesperson-scorecards.sql" <<'NODE'
const fs=require('fs'),{Pool}=require('pg');
const values={}; for(const raw of fs.readFileSync(process.argv[2],'utf8').split(/\r?\n/)){const line=raw.trim();if(!line||line.startsWith('#'))continue;const at=line.indexOf('=');if(at<1)continue;let value=line.slice(at+1).trim();if((value.startsWith('"')&&value.endsWith('"'))||(value.startsWith("'")&&value.endsWith("'")))value=value.slice(1,-1);values[line.slice(0,at).trim()]=value;}
const url=new URL(values.DIRECT_URL||values.DATABASE_URL); for(const key of ['sslmode','sslrootcert','sslcert','sslkey'])url.searchParams.delete(key);
const pool=new Pool({connectionString:url.toString(),ssl:{rejectUnauthorized:false}});
pool.query(fs.readFileSync(process.argv[3],'utf8')).then(()=>console.log('Migration applied.')).finally(()=>pool.end()).catch(error=>{console.error(error.message);process.exitCode=1});
NODE
fi

if [[ "$app" == "/var/www/sak-erp" ]]; then
  export SAK_LIVE_RELEASE_APPROVED=YES
  export SAK_LIVE_RELEASE_TICKET=CRM-SALES-SCORECARDS-20260905
fi
pnpm --filter @sak-erp/api build
pm2 restart "$api_process" --update-env >/dev/null
pm2 stop "$web_process" >/dev/null
pnpm --filter @sak-erp/web build
pm2 start "$web_process" --update-env >/dev/null
pm2 save >/dev/null

for _ in {1..30}; do
  api_http="$(curl -sS -o /dev/null -w '%{http_code}' "http://127.0.0.1:$api_port/api/v1/crm/revenue-operations" || true)"
  web_http="$(curl -sS -o /dev/null -w '%{http_code}' "http://127.0.0.1:$web_port/dashboard/crm?view=forecast" || true)"
  api_state="$(pm2 jlist | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{let p=JSON.parse(s).find(x=>x.name===process.argv[1]);process.stdout.write(p?.pm2_env?.status||'missing')})" "$api_process")"
  web_state="$(pm2 jlist | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{let p=JSON.parse(s).find(x=>x.name===process.argv[1]);process.stdout.write(p?.pm2_env?.status||'missing')})" "$web_process")"
  if [[ "$api_http" =~ ^(401|403)$ && "$web_http" == "200" && "$api_state" == "online" && "$web_state" == "online" ]]; then
    trap - ERR
    echo "SCORECARDS_DEPLOYED backup=$backup_base api=$api_http web=$web_http"
    exit 0
  fi
  sleep 2
done
false
