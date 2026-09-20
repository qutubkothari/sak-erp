const path = require('path');
const { execFileSync } = require('child_process');
const dotenv = require('dotenv');
const { Pool } = require('pg');

const envSource = process.argv[2] || 'apps/api/.env';
const envFile = envSource.startsWith('pm2:') ? envSource : path.resolve(envSource);
const selector = String(process.argv[3] || '').trim();
if (!selector) throw new Error('GRN number, invoice number, or PO number is required');

if (envSource.startsWith('pm2:')) {
  const processName = envSource.slice(4);
  const processes = JSON.parse(execFileSync('pm2', ['jlist'], { encoding: 'utf8' }));
  const target = processes.find((entry) => entry.name === processName);
  if (!target) throw new Error(`PM2 process not found: ${processName}`);
  for (const key of ['DIRECT_URL', 'DATABASE_URL', 'SUPABASE_URL', 'SUPABASE_KEY']) {
    if (target.pm2_env?.[key]) process.env[key] = target.pm2_env[key];
  }
} else {
  dotenv.config({ path: envFile, quiet: true });
}
const raw = process.env.DIRECT_URL || process.env.DATABASE_URL;
if (!raw) throw new Error('DIRECT_URL or DATABASE_URL is required');
const url = new URL(raw);
['sslmode', 'sslrootcert', 'sslcert', 'sslkey'].forEach((key) =>
  url.searchParams.delete(key),
);
const pool = new Pool({
  connectionString: url.toString(),
  ssl: { rejectUnauthorized: false },
});
const ident = (value) => `"${String(value).replaceAll('"', '""')}"`;

async function main() {
  const client = await pool.connect();
  try {
    const { rows } = await client.query(
      `select g.id, g.tenant_id, t.name as tenant_name, g.grn_number,
              po.po_number, g.po_id, g.invoice_number, g.status,
              g.qc_completed, g.invoice_approved, g.payment_status,
              g.paid_amount, g.debit_note_amount, g.created_at,
              count(distinct gi.id)::int as item_count,
              coalesce(sum(gi.received_qty), 0) as received_qty,
              coalesce(sum(gi.accepted_qty), 0) as accepted_qty
         from public.grns g
         left join public.tenants t on t.id = g.tenant_id
         left join public.purchase_orders po on po.id = g.po_id
         left join public.grn_items gi on gi.grn_id = g.id
        where g.grn_number = $1
           or lower(btrim(coalesce(g.invoice_number, ''))) = lower(btrim($1))
           or lower(btrim(coalesce(po.po_number, ''))) = lower(btrim($1))
        group by g.id, t.name, po.po_number`,
      [selector],
    );

    const result = [];
    for (const grn of rows) {
      const { rows: columns } = await client.query(
        `select table_schema, table_name
           from information_schema.columns
          where column_name = 'grn_id' and table_schema = 'public'
          order by table_name`,
      );
      const dependencies = {};
      for (const column of columns) {
        const count = await client.query(
          `select count(*)::int as count from ${ident(column.table_schema)}.${ident(column.table_name)} where grn_id = $1`,
          [grn.id],
        );
        if (count.rows[0].count) dependencies[column.table_name] = count.rows[0].count;
      }
      const locks = await client.query(
        `select count(*)::int as count from public.grn_invoice_locks
          where tenant_id = $1 and po_id = $2
            and invoice_key = lower(btrim($3))`,
        [grn.tenant_id, grn.po_id, grn.invoice_number || ''],
      );
      const debitNotes = await client.query(
        `select dn.id, dn.debit_note_number, dn.status, dn.gross_amount,
                dn.tax_amount, dn.total_amount, dn.created_at,
                count(dni.id)::int as item_count
           from public.debit_notes dn
           left join public.debit_note_items dni on dni.debit_note_id = dn.id
          where dn.grn_id = $1
          group by dn.id
          order by dn.created_at`,
        [grn.id],
      );
      result.push({
        ...grn,
        dependencies,
        invoice_lock_count: locks.rows[0].count,
        debit_notes: debitNotes.rows,
      });
    }
    const { rows: matchingLocks } = await client.query(
      `select l.tenant_id, t.name as tenant_name, l.po_id, po.po_number,
              l.invoice_key,
              exists (
                select 1 from public.grns g
                 where g.tenant_id = l.tenant_id
                   and g.po_id = l.po_id
                   and lower(btrim(coalesce(g.invoice_number, ''))) = l.invoice_key
              ) as has_matching_grn
         from public.grn_invoice_locks l
         left join public.tenants t on t.id = l.tenant_id
         left join public.purchase_orders po on po.id = l.po_id
        where lower(btrim(l.invoice_key)) = lower(btrim($1))
           or lower(btrim(coalesce(po.po_number, ''))) = lower(btrim($1))`,
      [selector],
    );
    console.log(
      JSON.stringify(
        {
          env_file: envFile,
          count: result.length,
          records: result,
          matching_invoice_locks: matchingLocks,
        },
        null,
        2,
      ),
    );
  } finally {
    client.release();
  }
}

main()
  .catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
