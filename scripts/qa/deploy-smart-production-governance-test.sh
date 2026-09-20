#!/usr/bin/env bash
set -euo pipefail
app=/var/www/sak-erp-test
test "$PWD" = "$app"
test "$(readlink -f "$app")" = "$app"
test -f migrations/add-smart-production-governance.sql

node - <<'NODE'
const fs = require('fs');
require('dotenv').config({ path: 'apps/api/.env.test' });
const { Client } = require('pg');
(async () => {
  const connection = new URL(process.env.DIRECT_URL || process.env.DATABASE_URL);
  ['sslmode', 'sslrootcert', 'sslcert', 'sslkey'].forEach((key) => connection.searchParams.delete(key));
  const client = new Client({ connectionString: connection.toString(), ssl: { rejectUnauthorized: false } });
  await client.connect();
  await client.query(fs.readFileSync('migrations/add-smart-production-governance.sql', 'utf8'));
  await client.end();
  console.log('Smart-production governance migration applied to Mizantra TEST.');
})().catch((error) => { console.error(error.message); process.exit(1); });
NODE
