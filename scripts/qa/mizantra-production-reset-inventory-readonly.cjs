const dotenv = require("dotenv");
const { Client } = require("pg");

dotenv.config({ path: process.env.ENV_FILE || "apps/api/.env", quiet: true });

const ident = (value) => `"${String(value).replaceAll('"', '""')}"`;

async function main() {
  const connection = new URL(process.env.DIRECT_URL || process.env.DATABASE_URL);
  for (const key of ["sslmode", "sslrootcert", "sslcert", "sslkey"]) {
    connection.searchParams.delete(key);
  }
  const client = new Client({
    connectionString: connection.toString(),
    ssl: { rejectUnauthorized: false },
  });
  await client.connect();
  const tenant = await client.query(
    `select tenant_id from public.users where lower(username)=lower($1) limit 1`,
    [process.env.QA_USERNAME || "hnoman"],
  );
  if (!tenant.rows[0]?.tenant_id) throw new Error("Mizantra tenant not found");
  const tenantId = tenant.rows[0].tenant_id;
  const jobs = await client.query(
    `select status, count(*)::int as count
       from public.production_job_orders
      where tenant_id=$1 group by status order by status`,
    [tenantId],
  );
  const relations = await client.query(`
    select distinct n.nspname as schema_name, c.relname as table_name,
           a.attname as column_name, con.confdeltype as delete_action
      from pg_constraint con
      join pg_class c on c.oid=con.conrelid
      join pg_namespace n on n.oid=c.relnamespace
      join unnest(con.conkey) with ordinality ck(attnum,ord) on true
      join pg_attribute a on a.attrelid=con.conrelid and a.attnum=ck.attnum
     where con.contype='f'
       and con.confrelid='public.production_job_orders'::regclass
     order by n.nspname,c.relname,a.attname
  `);
  const counts = [];
  for (const relation of relations.rows) {
    const sql = `select count(*)::int as count from ${ident(relation.schema_name)}.${ident(relation.table_name)} r join public.production_job_orders j on j.id=r.${ident(relation.column_name)} where j.tenant_id=$1`;
    const count = await client.query(sql, [tenantId]);
    counts.push({ ...relation, count: count.rows[0].count });
  }
  const jobColumns = await client.query(`
    select table_schema as schema_name, table_name, column_name, data_type
      from information_schema.columns
     where table_schema='public'
       and column_name like '%job_order%'
     order by table_name,column_name
  `);
  const columnCounts = [];
  for (const column of jobColumns.rows) {
    if (column.table_name === "production_job_orders") continue;
    const sql = `select count(*)::int as count from ${ident(column.schema_name)}.${ident(column.table_name)} where ${ident(column.column_name)}::text in (select id::text from public.production_job_orders where tenant_id=$1)`;
    const count = await client.query(sql, [tenantId]);
    if (count.rows[0].count) columnCounts.push({ ...column, count: count.rows[0].count });
  }
  const indirect = await client.query(
    `select
       (select count(*)::int from public.stock_reservations where tenant_id=$1 and reference_type='PRODUCTION_JOB_ORDER' and reference_id::text in (select id::text from public.production_job_orders where tenant_id=$1)) as reservations,
       (select count(*)::int from public.stock_movements where tenant_id=$1 and reference_type='SIV' and reference_id::text in (select id::text from public.production_job_orders where tenant_id=$1)) as siv_movements,
       (select count(*)::int from public.stock_entries where tenant_id=$1 and metadata->>'job_order_id' in (select id::text from public.production_job_orders where tenant_id=$1)) as receipt_entries`,
    [tenantId],
  );
  const sivRows = await client.query(
    `select j.job_order_number, sm.id, sm.item_id, i.category as item_category,
            sm.from_warehouse_id, sm.quantity, sm.approved_at, sm.notes,
            coalesce((select jsonb_agg(jsonb_build_object('category',s.category,'quantity',s.quantity,'reserved_quantity',s.reserved_quantity))
                        from public.inventory_stock s
                       where s.tenant_id=sm.tenant_id and s.item_id=sm.item_id
                         and s.warehouse_id=sm.from_warehouse_id),'[]'::jsonb) as stock_buckets
       from public.stock_movements sm
       join public.production_job_orders j on j.id=sm.reference_id
       join public.items i on i.id=sm.item_id
      where j.tenant_id=$1 and sm.reference_type='SIV'
      order by j.job_order_number,sm.created_at`,
    [tenantId],
  );
  const mrp = await client.query(
    `select
       (select count(*)::int from public.mrp_planning_runs where tenant_id=$1) as runs,
       (select count(*)::int from public.mrp_planning_lines l join public.mrp_planning_runs r on r.id=l.run_id where r.tenant_id=$1) as lines,
       (select count(*)::int from public.mizantra_exception_register where tenant_id=$1 and source_type in ('MRP_PLAN','MRP_READINESS','MRP_RELEASE')) as exceptions`,
    [tenantId],
  );
  const governed = await client.query(
    `select tool_code,status,count(*)::int as count
       from public.mizantra_governed_action_requests
      where tenant_id=$1
        and (insight_id like 'mrp-%' or tool_code in ('CREATE_PRODUCTION_JOB_ORDER_DRAFT','CREATE_SUPPLY_RESCHEDULE_REVIEW'))
      group by tool_code,status order by tool_code,status`,
    [tenantId],
  );
  await client.end();
  process.stdout.write(
    `${JSON.stringify({ tenant_id: tenantId, job_orders: jobs.rows, dependencies: counts, job_order_columns: columnCounts, indirect: indirect.rows[0], siv_rows: sivRows.rows, mrp: mrp.rows[0], governed_actions: governed.rows }, null, 2)}\n`,
  );
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
