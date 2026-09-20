const dotenv = require("dotenv");
const { Client } = require("pg");

dotenv.config({ path: process.env.ENV_FILE || "apps/api/.env", quiet: true });

async function main() {
  const url = new URL(process.env.DIRECT_URL || process.env.DATABASE_URL);
  for (const key of ["sslmode", "sslrootcert", "sslcert", "sslkey"]) url.searchParams.delete(key);
  const client = new Client({ connectionString: url.toString(), ssl: { rejectUnauthorized: false } });
  await client.connect();
  const tenantId = "f87a5ab0-0619-4f1c-bab9-e78ca750e56c";
  const job = await client.query(
    `select id,job_order_number,status,item_id,bom_id,quantity,created_by,created_at
       from public.production_job_orders where tenant_id=$1 order by created_at desc limit 5`,
    [tenantId],
  );
  const orders = await client.query(
    `select po.id,po.order_number,po.status,po.job_order_id,po.bom_id,po.quantity,po.created_at
       from public.production_orders po where po.tenant_id=$1 order by po.created_at desc limit 10`,
    [tenantId],
  );
  const bomIds = [...new Set(orders.rows.map((row) => row.bom_id).filter(Boolean))];
  const routing = bomIds.length
    ? await client.query(
        `select r.id,r.bom_id,r.sequence_no,r.operation_name,r.work_station_id,w.station_name,w.is_active
           from public.production_routing r left join public.work_stations w on w.id=r.work_station_id
          where r.tenant_id=$1 and r.bom_id=any($2::uuid[]) order by r.bom_id,r.sequence_no`,
        [tenantId, bomIds],
      )
    : { rows: [] };
  const completions = await client.query(
    `select id,production_order_id,routing_id,work_station_id,operator_id,status,created_at
       from public.station_completions where tenant_id=$1 order by created_at desc limit 20`,
    [tenantId],
  );
  const constraints = await client.query(
    `select conname,pg_get_constraintdef(oid) as definition
       from pg_constraint where conrelid='public.station_completions'::regclass order by conname`,
  );
  await client.end();
  console.log(JSON.stringify({ jobs: job.rows, production_orders: orders.rows, routing: routing.rows, completions: completions.rows, station_completion_constraints: constraints.rows }, null, 2));
}

main().catch((error) => { console.error(error.message); process.exit(1); });
