const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');
const { Client } = require('pg');

async function main() {
  const envPath = path.resolve(process.argv[2] || 'apps/api/.env');
  const sqlPath = path.resolve(process.argv[3] || 'migrations/add-active-planner-conversation-memory.sql');
  dotenv.config({ path: envPath });
  const raw = process.env.DIRECT_URL || process.env.DATABASE_URL;
  if (!raw) throw new Error('DIRECT_URL or DATABASE_URL is missing.');
  const url = new URL(raw);
  if (url.hostname !== 'db.nwkaruzvzwwuftjquypk.supabase.co')
    throw new Error(`Refusing non-Mizantra database host: ${url.hostname}`);
  ['sslmode', 'sslrootcert', 'sslcert', 'sslkey'].forEach((key) => url.searchParams.delete(key));
  const client = new Client({
    connectionString: url.toString(),
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 20000,
  });
  await client.connect();
  try {
    await client.query('BEGIN');
    await client.query(fs.readFileSync(sqlPath, 'utf8'));
    const verification = await client.query(`
      SELECT
        COUNT(DISTINCT table_name) FILTER (WHERE table_name IN (
          'active_planner_conversations',
          'active_planner_messages',
          'active_planner_learning_examples'
        ))::int AS tables,
        COUNT(*) FILTER (WHERE table_name = 'active_planner_conversations' AND column_name = 'current_context_token')::int AS context_columns
      FROM information_schema.columns
      WHERE table_schema = 'public'
    `);
    const row = verification.rows[0];
    if (row.tables < 3 || row.context_columns !== 1)
      throw new Error(`Planner-memory schema verification failed: ${JSON.stringify(row)}`);
    await client.query('COMMIT');
    console.log(JSON.stringify({ database_host: url.hostname, schema_applied: true, ...row }));
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
