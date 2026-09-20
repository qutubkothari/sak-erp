const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');
const { Client } = require('pg');

const envPath = path.resolve(process.argv[2] || '.env');
const sqlPath = path.resolve(process.argv[3] || 'migrations/add-subcontract-reconciliation-control.sql');
dotenv.config({ path: envPath });

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error(`DATABASE_URL is missing from ${envPath}`);
const databaseUrlObject = new URL(databaseUrl);
databaseUrlObject.searchParams.set('sslmode', 'no-verify');

const expectedHost = 'db.xjiyiywzmklljrpblcqj.supabase.co';
const actualHost = databaseUrlObject.hostname;
if (actualHost !== expectedHost) {
  throw new Error(`Refusing migration: expected SaifSeas database host ${expectedHost}, got ${actualHost}`);
}

const sql = fs.readFileSync(sqlPath, 'utf8');
const client = new Client({ connectionString: databaseUrlObject.toString(), ssl: { rejectUnauthorized: false } });

(async () => {
  await client.connect();
  try {
    await client.query('BEGIN');
    await client.query(sql);
    const verification = await client.query(`
      SELECT COUNT(*)::int AS columns
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'subcontract_reconciliations'
    `);
    if (verification.rows[0].columns < 10) {
      throw new Error('Reconciliation table verification failed');
    }
    await client.query('COMMIT');
    console.log(JSON.stringify({
      applied: true,
      database_host: actualHost,
      table: 'public.subcontract_reconciliations',
      columns: verification.rows[0].columns,
    }));
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    await client.end();
  }
})().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
