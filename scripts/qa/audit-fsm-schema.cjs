const path = require('path');
const dotenv = require('dotenv');
const { Client } = require('pg');

const [envFile, expectedProject, targetName] = process.argv.slice(2);
if (!envFile || !expectedProject || !targetName) {
  throw new Error('Usage: node audit-fsm-schema.cjs <env-file> <expected-project-ref> <target-name>');
}

dotenv.config({ path: path.resolve(envFile), quiet: true });
const rawUrl = process.env.DIRECT_URL || process.env.DATABASE_URL;
if (!rawUrl) throw new Error(`Database URL is missing from ${envFile}`);

const databaseUrl = new URL(rawUrl);
const identity = `${databaseUrl.hostname}/${decodeURIComponent(databaseUrl.username)}`;
if (!identity.includes(expectedProject)) {
  throw new Error(`Refusing unexpected database target for ${targetName}`);
}
for (const key of ['sslmode', 'sslrootcert', 'sslcert', 'sslkey']) {
  databaseUrl.searchParams.delete(key);
}

async function main() {
  const client = new Client({
    connectionString: databaseUrl.toString(),
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 15000,
  });
  await client.connect();
  try {
    const result = await client.query(`
      SELECT
        (SELECT count(*)::int
           FROM information_schema.tables
          WHERE table_schema = 'public' AND table_name LIKE 'fsm\\_%' ESCAPE '\\') AS fsm_tables,
        (SELECT count(*)::int
           FROM public.app_feature_catalogue
          WHERE feature_key = 'crm-field-sales') AS feature_entries
    `);
    console.log(JSON.stringify({
      target: targetName,
      project: expectedProject,
      ...result.rows[0],
    }));
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error(`${targetName} FSM schema audit failed: ${error.message}`);
  process.exit(1);
});
