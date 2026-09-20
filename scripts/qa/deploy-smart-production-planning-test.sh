#!/usr/bin/env bash
set -euo pipefail

app=/var/www/sak-erp-test
test "$PWD" = "$app"
test "$(readlink -f "$app")" = "$app"

node - <<'NODE'
const fs = require('fs');
require('dotenv').config({ path: 'apps/api/.env.test' });
const { Client } = require('pg');
(async () => {
  const connection = new URL(process.env.DATABASE_URL);
  connection.searchParams.delete('sslmode');
  const client = new Client({ connectionString: connection.toString(), ssl: { rejectUnauthorized: false } });
  await client.connect();
  await client.query(fs.readFileSync('migrations/add-smart-production-planning.sql', 'utf8'));
  await client.end();
  console.log('Smart production planning migration applied to Mizantra TEST.');
})().catch((error) => { console.error(error.message); process.exit(1); });
NODE

pnpm --filter @sak-erp/api build
pnpm --filter @sak-erp/web build
pm2 restart sak-api-test sak-web-test
pm2 save

for _ in 1 2 3 4 5 6 7 8 9 10; do
  api_code="$(curl -sS -o /dev/null -w '%{http_code}' http://127.0.0.1:4001/api/v1/production-planning/dashboard || true)"
  if [[ "$api_code" =~ ^(401|403)$ ]] && curl -fsS http://127.0.0.1:3001/dashboard/production/smart-planning >/dev/null; then
    echo 'Mizantra TEST smart production planning deployment verified.'
    exit 0
  fi
  sleep 2
done
exit 1
