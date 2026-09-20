const fs = require('fs');
const { Pool } = require('pg');
const envFile = process.argv[2];
const profile = String(process.argv[3] || 'normal');
const values = {};
for (const raw of fs.readFileSync(envFile, 'utf8').split(/\r?\n/)) {
  const line = raw.trim(); if (!line || line.startsWith('#')) continue;
  const at = line.indexOf('='); if (at < 1) continue;
  let value = line.slice(at + 1).trim();
  if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) value = value.slice(1, -1);
  values[line.slice(0, at).trim()] = value;
}
let raw = values.DIRECT_URL || values.DATABASE_URL;
if (profile === 'mizantra-test') {
  raw = raw.replace(/^postgesql:/, 'postgresql:').replace('://postges:', '://postgres:').replace(/nwkauz/g, 'nwkaruz').replace('/postges?', '/postgres?');
  const fixed = new URL(raw); fixed.username = 'postgres.nwkaruzvzwwuftjquypk'; fixed.hostname = 'aws-1-ap-southeast-1.pooler.supabase.com'; fixed.port = '5432'; raw = fixed.toString();
}
const url = new URL(raw); for (const key of ['sslmode','sslrootcert','sslcert','sslkey']) url.searchParams.delete(key);
const pool = new Pool({ connectionString: url.toString(), ssl: { rejectUnauthorized: false } });
(async () => {
  const columns = await pool.query("select column_name from information_schema.columns where table_schema='public' and table_name='crm_sales_targets' and column_name in ('target_calls','target_visits','target_quotations','target_collections') order by column_name");
  const table = await pool.query("select to_regclass('public.crm_sales_target_products')::text as name");
  if (columns.rows.length !== 4 || table.rows[0]?.name !== 'crm_sales_target_products') throw new Error('CRM salesperson scorecard schema is incomplete');
  console.log(JSON.stringify({ columns: columns.rows.map(row => row.column_name), product_target_table: table.rows[0].name }));
})().finally(() => pool.end()).catch(error => { console.error(error.message); process.exitCode = 1; });
