const fs = require("fs");
const { Client } = require("pg");
require("dotenv").config({ path: "/var/www/sak-erp-test/apps/api/.env" });

async function main() {
  const url = new URL(process.env.DATABASE_URL);
  if (url.hostname !== "db.nwkaruzvzwwuftjquypk.supabase.co") {
    throw new Error(`Refusing non-Mizantra database host: ${url.hostname}`);
  }
  url.searchParams.set("sslmode", "no-verify");
  const client = new Client({ connectionString: url.toString() });
  await client.connect();
  try {
    await client.query("BEGIN");
    await client.query(
      fs.readFileSync(
        "/tmp/mizantra-demand-plan-freeze-20260830/migrations/add-demand-plan-freeze-control.sql",
        "utf8",
      ),
    );
    const result = await client.query(`
      SELECT
        EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_schema = 'public'
            AND table_name = 'demand_plan_cycles'
            AND column_name = 'snapshot_hash'
        ) AS snapshot_hash_exists,
        (SELECT COUNT(*)::int FROM pg_trigger
          WHERE tgname IN ('trg_guard_approved_demand_cycle', 'trg_guard_approved_demand_line')
            AND NOT tgisinternal) AS freeze_trigger_count
    `);
    if (!result.rows[0].snapshot_hash_exists || result.rows[0].freeze_trigger_count !== 2) {
      throw new Error(`Demand freeze verification failed: ${JSON.stringify(result.rows[0])}`);
    }
    await client.query("COMMIT");
    console.log(JSON.stringify({ database_host: url.hostname, ...result.rows[0] }));
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
