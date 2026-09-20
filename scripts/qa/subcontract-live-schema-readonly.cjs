const path = require("path");
const { Client } = require("pg");
require("dotenv").config({ path: path.resolve(process.argv[2] || "apps/api/.env"), quiet: true });

const raw = process.env.DATABASE_URL || process.env.DIRECT_URL;
if (!raw) throw new Error("DATABASE_URL or DIRECT_URL is required");
const url = new URL(raw);
url.searchParams.set("sslmode", "no-verify");

async function main() {
  const client = new Client({ connectionString: url.toString(), ssl: { rejectUnauthorized: false } });
  await client.connect();
  try {
    const schema = await client.query(`
      SELECT
        to_regclass('public.subcontract_reconciliations') IS NOT NULL AS reconciliation_table,
        (SELECT COUNT(*)::int FROM information_schema.columns
          WHERE table_schema='public' AND table_name='subcontract_reconciliations'
            AND column_name IN ('input_reconciliation_variance','yield_variance_quantity','standard_service_cost','actual_service_cost','service_cost_variance','status')) AS reconciliation_columns,
        (SELECT COUNT(*)::int FROM public.subcontract_reconciliations) AS reconciliation_rows,
        (SELECT COUNT(*)::int FROM public.subcontract_orders) AS orders,
        (SELECT COUNT(*)::int FROM public.subcontract_movements) AS movements,
        (SELECT COUNT(*)::int FROM public.subcontract_receipt_lines) AS receipt_lines
    `);
    console.log(JSON.stringify({ database_host: url.hostname, ...schema.rows[0] }));
  } finally {
    await client.end();
  }
}

main().catch((error) => { console.error(error.message); process.exit(1); });
