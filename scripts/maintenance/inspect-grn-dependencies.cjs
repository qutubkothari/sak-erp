const path = require('path');
const dotenv = require('dotenv');
const { Pool } = require('pg');

const envFile = path.resolve(process.argv[2] || 'apps/api/.env');
const grnNumber = String(process.argv[3] || '').trim();
if (!grnNumber) throw new Error('Usage: node inspect-grn-dependencies.cjs <env-file> <grn-number>');

dotenv.config({ path: envFile, quiet: true });
const raw = process.env.DIRECT_URL || process.env.DATABASE_URL;
if (!raw) throw new Error('DIRECT_URL or DATABASE_URL is required');
const url = new URL(raw);
['sslmode', 'sslrootcert', 'sslcert', 'sslkey'].forEach((key) => url.searchParams.delete(key));
const pool = new Pool({ connectionString: url.toString(), ssl: { rejectUnauthorized: false } });
const ident = (value) => `"${String(value).replaceAll('"', '""')}"`;

async function main() {
  const { rows: grns } = await pool.query('select * from public.grns where grn_number = $1', [grnNumber]);
  if (grns.length !== 1) throw new Error(`Expected exactly one GRN, found ${grns.length}`);
  const grn = grns[0];
  const { rows: columns } = await pool.query(
    `select table_schema, table_name
       from information_schema.columns
      where column_name = 'grn_id' and table_schema = 'public'
      order by table_name`,
  );
  const dependencies = [];
  for (const column of columns) {
    const sql = `select count(*)::int as count from ${ident(column.table_schema)}.${ident(column.table_name)} where grn_id = $1`;
    const { rows } = await pool.query(sql, [grn.id]);
    if (rows[0].count > 0) dependencies.push({ table: column.table_name, count: rows[0].count });
  }
  const { rows: locks } = await pool.query(
    `select * from public.grn_invoice_locks
      where tenant_id = $1 and po_id = $2 and invoice_key = lower(btrim($3))`,
    [grn.tenant_id, grn.po_id, grn.invoice_number || ''],
  );
  console.log(JSON.stringify({
    grn: {
      id: grn.id,
      grn_number: grn.grn_number,
      tenant_id: grn.tenant_id,
      po_id: grn.po_id,
      vendor_id: grn.vendor_id,
      invoice_number: grn.invoice_number,
      status: grn.status,
      qc_completed: grn.qc_completed,
      invoice_approved: grn.invoice_approved,
      is_active: grn.is_active,
      notes: grn.notes,
    },
    dependencies,
    invoice_locks: locks.map((row) => ({ id: row.id, invoice_key: row.invoice_key, created_at: row.created_at })),
  }, null, 2));
}

main()
  .catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
