const fs = require('fs');
const { Client } = require('pg');
require('dotenv').config({ path: '/var/www/sak-erp-test/apps/api/.env' });

async function main() {
  const url = new URL(process.env.DATABASE_URL);
  if (url.hostname !== 'db.nwkaruzvzwwuftjquypk.supabase.co') {
    throw new Error(`Refusing non-Mizantra database host: ${url.hostname}`);
  }
  url.searchParams.set('sslmode', 'no-verify');
  const client = new Client({ connectionString: url.toString() });
  await client.connect();
  try {
    await client.query('BEGIN');
    await client.query(
      fs.readFileSync(
        '/tmp/mizantra-shop-floor-controls-20260830/migrations/add-shop-floor-execution-controls.sql',
        'utf8',
      ),
    );
    const result = await client.query(`
      SELECT
        COUNT(*) FILTER (WHERE column_name IN ('paused_at','total_paused_minutes','completed_by'))::int AS control_columns,
        (SELECT COUNT(*)::int FROM pg_constraint WHERE conname IN (
          'station_completion_nonnegative_quantities',
          'station_completion_nonnegative_time',
          'station_completion_completed_evidence'
        )) AS control_constraints,
        (SELECT COUNT(*)::int FROM public.app_feature_catalogue
          WHERE feature_key IN ('production-shop-floor','production-work-stations')) AS feature_rows
      FROM information_schema.columns
      WHERE table_schema='public' AND table_name='station_completions'
    `);
    if (
      result.rows[0].control_columns !== 3 ||
      result.rows[0].control_constraints !== 3 ||
      result.rows[0].feature_rows !== 2
    ) {
      throw new Error(`Shop-floor schema verification failed: ${JSON.stringify(result.rows[0])}`);
    }
    await client.query('COMMIT');
    console.log(JSON.stringify({ database_host: url.hostname, ...result.rows[0] }));
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
