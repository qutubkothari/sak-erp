const dotenv = require("dotenv");
const { Client } = require("pg");

dotenv.config({ path: process.env.ENV_FILE || "apps/api/.env", quiet: true });

const EXPECTED_TENANT = "f87a5ab0-0619-4f1c-bab9-e78ca750e56c";

function inventoryCategory(value) {
  const key = String(value || "").trim().toUpperCase().replace(/[\s-]+/g, "_");
  const mapped = {
    CONSUMABLE: "CONSUMABLES",
    CONSUMABLES: "CONSUMABLES",
    SUB_ASSEMBLY: "WIP",
    SUB_ASSEMBLIES: "WIP",
    FINISHED_GOOD: "FINISHED_GOODS",
    FINISHED_GOODS: "FINISHED_GOODS",
    CAPITAL_GOOD: "FINISHED_GOODS",
    CAPITAL_GOODS: "FINISHED_GOODS",
    SERVICE: "SERVICE_SPARES",
    SERVICES: "SERVICE_SPARES",
  };
  return mapped[key] || "RAW_MATERIAL";
}

async function count(client, sql, values) {
  const result = await client.query(sql, values);
  return Number(result.rows[0]?.count || 0);
}

async function main() {
  if (process.env.MIZANTRA_RESET_CONFIRM !== "DELETE_PRODUCTION_TEST_DATA") {
    throw new Error("Explicit MIZANTRA_RESET_CONFIRM is required");
  }
  const connection = new URL(process.env.DIRECT_URL || process.env.DATABASE_URL);
  if (!`${connection.hostname}/${connection.username}`.includes("nwkaruzvzwwuftjquypk")) {
    throw new Error("Refusing to reset an unexpected database");
  }
  for (const key of ["sslmode", "sslrootcert", "sslcert", "sslkey"]) {
    connection.searchParams.delete(key);
  }
  const client = new Client({
    connectionString: connection.toString(),
    ssl: { rejectUnauthorized: false },
  });
  await client.connect();
  try {
    await client.query("begin");
    const tenant = await client.query(
      `select tenant_id,id from public.users where lower(username)=lower($1) limit 1`,
      [process.env.QA_USERNAME || "hnoman"],
    );
    const tenantId = tenant.rows[0]?.tenant_id;
    const userId = tenant.rows[0]?.id;
    if (tenantId !== EXPECTED_TENANT) throw new Error("Mizantra tenant mismatch");

    const jobs = await client.query(
      `select id,job_order_number,status from public.production_job_orders where tenant_id=$1 order by created_at for update`,
      [tenantId],
    );
    const expectedCount = Number(process.env.MIZANTRA_EXPECTED_JOB_COUNT || 5);
    if (jobs.rowCount !== expectedCount) {
      throw new Error(`Job-order count changed: expected ${expectedCount}, found ${jobs.rowCount}`);
    }
    const unsupported = jobs.rows.filter(
      (job) => !["DRAFT", "SCHEDULED", "IN_PROGRESS", "STORE_ISSUED", "STOPPED", "CANCELLED"].includes(job.status),
    );
    if (unsupported.length) {
      throw new Error(`Refusing job orders with completed/posted status: ${unsupported.map((job) => job.job_order_number).join(", ")}`);
    }
    const ids = jobs.rows.map((job) => job.id);
    const protectedRows = await count(
      client,
      `select count(*) from (
         select job_order_id from public.production_material_consumptions where job_order_id=any($1::uuid[])
         union all select job_order_id from public.production_job_cost_statements where job_order_id=any($1::uuid[])
         union all select job_order_id from public.uid_registry where job_order_id=any($1::uuid[])
       ) protected`,
      [ids],
    );
    if (protectedRows) throw new Error(`Refusing reset: ${protectedRows} protected production records exist`);

    const movements = await client.query(
      `select sm.id,sm.item_id,sm.from_warehouse_id,sm.quantity,i.category,sm.reference_id,sm.reference_number
         from public.stock_movements sm
         join public.items i on i.id=sm.item_id and i.tenant_id=sm.tenant_id
        where sm.tenant_id=$1 and sm.reference_type='SIV' and sm.reference_id=any($2::uuid[])
        order by sm.created_at for update`,
      [tenantId, ids],
    );
    for (const movement of movements.rows) {
      const quantity = Number(movement.quantity || 0);
      if (!(quantity > 0) || !movement.from_warehouse_id) {
        throw new Error(`Invalid SIV movement ${movement.id}`);
      }
      await client.query(
        `insert into public.stock_entries
          (tenant_id,item_id,warehouse_id,quantity,available_quantity,allocated_quantity,metadata)
         values ($1,$2,$3,$4,$4,0,$5::jsonb)`,
        [
          tenantId,
          movement.item_id,
          movement.from_warehouse_id,
          quantity,
          JSON.stringify({
            created_from: "PRODUCTION_TEST_RESET_REVERSAL",
            siv_movement_id: movement.id,
            job_order_id: movement.reference_id,
            job_order_number: movement.reference_number,
            reversed_at: new Date().toISOString(),
            reversed_by: userId,
          }),
        ],
      );
      await client.query(
        `select public.adjust_inventory_stock($1,$2,$3,null,$4,$5)`,
        [
          tenantId,
          movement.item_id,
          movement.from_warehouse_id,
          quantity,
          inventoryCategory(movement.category),
        ],
      );
    }

    await client.query(
      `delete from public.stock_movements where tenant_id=$1 and reference_type='SIV' and reference_id=any($2::uuid[])`,
      [tenantId, ids],
    );
    await client.query(
      `delete from public.stock_reservations where tenant_id=$1 and reference_type='PRODUCTION_JOB_ORDER' and reference_id=any($2::uuid[])`,
      [tenantId, ids],
    );
    const deletedJobs = await client.query(
      `delete from public.production_job_orders where tenant_id=$1 and id=any($2::uuid[]) returning id`,
      [tenantId, ids],
    );
    await client.query(
      `delete from public.mizantra_exception_register where tenant_id=$1 and source_type in ('MRP_PLAN','MRP_READINESS','MRP_RELEASE')`,
      [tenantId],
    );
    await client.query(
      `delete from public.mizantra_governed_action_requests where tenant_id=$1 and (insight_id like 'mrp-%' or tool_code in ('CREATE_PRODUCTION_JOB_ORDER_DRAFT','CREATE_SUPPLY_RESCHEDULE_REVIEW'))`,
      [tenantId],
    );
    const deletedRuns = await client.query(
      `delete from public.mrp_planning_runs where tenant_id=$1 returning id`,
      [tenantId],
    );

    const remainingJobs = await count(
      client,
      `select count(*) from public.production_job_orders where tenant_id=$1`,
      [tenantId],
    );
    const remainingRuns = await count(
      client,
      `select count(*) from public.mrp_planning_runs where tenant_id=$1`,
      [tenantId],
    );
    const remainingMovements = await count(
      client,
      `select count(*) from public.stock_movements where tenant_id=$1 and reference_type='SIV' and reference_id=any($2::uuid[])`,
      [tenantId, ids],
    );
    if (remainingJobs || remainingRuns || remainingMovements) {
      throw new Error("Reset verification failed; transaction will be rolled back");
    }
    await client.query("commit");
    process.stdout.write(
      `${JSON.stringify({
        reset: true,
        tenant: "MIZANTRA_TEST",
        deleted_job_orders: deletedJobs.rowCount,
        reversed_siv_movements: movements.rowCount,
        deleted_mrp_runs: deletedRuns.rowCount,
        preserved: ["items", "BOMs", "routings", "machines", "warehouses", "sales orders", "purchasing", "CRM", "finance"],
      })}\n`,
    );
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
