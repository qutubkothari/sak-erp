const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');
const { Client } = require('pg');

const EXPECTED_PROJECT = 'nwkaruzvzwwuftjquypk';
const [envFile, migrationFile] = process.argv.slice(2);
if (!envFile || !migrationFile) {
  throw new Error('Usage: node apply-fsm-mizantra.cjs <env-file> <migration-file>');
}

dotenv.config({ path: path.resolve(envFile), quiet: true });
const rawUrl = process.env.DIRECT_URL || process.env.DATABASE_URL;
if (!rawUrl) throw new Error(`Database URL is missing from ${envFile}`);

const databaseUrl = new URL(rawUrl);
const identity = `${databaseUrl.hostname}/${decodeURIComponent(databaseUrl.username)}`;
if (!identity.includes(EXPECTED_PROJECT)) {
  throw new Error('Refusing to apply FSM outside the Mizantra database');
}
for (const key of ['sslmode', 'sslrootcert', 'sslcert', 'sslkey']) {
  databaseUrl.searchParams.delete(key);
}

const sql = fs.readFileSync(path.resolve(migrationFile), 'utf8');
if (!sql.includes("'crm-field-sales'") || !sql.includes('CREATE TABLE IF NOT EXISTS public.fsm_visits')) {
  throw new Error('The supplied SQL file is not the expected FSM migration');
}

async function main() {
  const client = new Client({
    connectionString: databaseUrl.toString(),
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 15000,
  });
  await client.connect();
  try {
    await client.query(sql);
    const result = await client.query(`
      SELECT
        (SELECT count(*)::int
           FROM information_schema.tables
          WHERE table_schema = 'public' AND table_name LIKE 'fsm\\_%' ESCAPE '\\') AS fsm_tables,
        (SELECT count(*)::int
           FROM public.app_feature_catalogue
          WHERE feature_key = 'crm-field-sales') AS feature_entries,
        (SELECT count(*)::int
           FROM public.tenant_feature_entitlements
          WHERE feature_key = 'crm-field-sales' AND is_enabled = TRUE) AS enabled_tenants
    `);
    console.log(JSON.stringify({
      target: 'Mizantra',
      project: EXPECTED_PROJECT,
      migration: path.basename(migrationFile),
      ...result.rows[0],
    }));
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error(`Mizantra FSM migration failed: ${error.message}`);
  process.exit(1);
});
