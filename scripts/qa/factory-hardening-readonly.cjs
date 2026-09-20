const path = require("path");
const { Client } = require("pg");
require("dotenv").config({ path: path.resolve(process.argv[2] || "apps/api/.env"), quiet: true });

async function main() {
  const raw = process.env.DIRECT_URL || process.env.DATABASE_URL;
  if (!raw) throw new Error("Database URL is missing");
  const url = new URL(raw);
  ["sslmode", "sslrootcert", "sslcert", "sslkey"].forEach((key) => url.searchParams.delete(key));
  const client = new Client({ connectionString: url.toString(), ssl: { rejectUnauthorized: false } });
  await client.connect();
  try {
    const result = await client.query(`
      SELECT
        (SELECT count(*)::int FROM information_schema.triggers
         WHERE trigger_schema='public' AND trigger_name IN (
           'trg_validate_station_completion_atomic','trg_record_station_completion_wip',
           'trg_consume_production_material_reservations','trg_allocate_completed_child_supply'
         )) AS safety_triggers,
        (SELECT count(*)::int FROM public.production_creation_runs
         WHERE status='CREATING' AND updated_at < now()-interval '15 minutes') AS stranded_creation_runs,
        (SELECT count(*)::int FROM public.production_operation_wip_balance
         WHERE available_quantity < -0.0001) AS negative_wip_balances,
        (SELECT count(*)::int FROM public.stock_reservations r
         LEFT JOIN public.inventory_stock s ON s.id=r.inventory_stock_id
         WHERE r.reference_type='PRODUCTION_JOB_ORDER' AND r.released=false
           AND (s.id IS NULL OR r.reserved_quantity <= 0)) AS invalid_active_reservations,
        (SELECT count(*)::int FROM public.production_supply_actions
         WHERE status='ACTION_REQUIRED') AS open_supply_actions
    `);
    const audit = result.rows[0];
    const pass = audit.safety_triggers === 4 && audit.stranded_creation_runs === 0 &&
      audit.negative_wip_balances === 0 && audit.invalid_active_reservations === 0;
    console.log(JSON.stringify({ pass, ...audit }));
    if (!pass) process.exitCode = 2;
  } finally {
    await client.end();
  }
}

main().catch((error) => { console.error(error.message); process.exit(1); });
