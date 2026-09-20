const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');
const { Pool } = require('pg');

const envFile = path.resolve(process.argv[2] || 'apps/api/.env');
const grnNumber = String(process.argv[3] || '').trim();
const confirmation = String(process.argv[4] || '').trim();
const backupFile = path.resolve(process.argv[5] || `artifacts/${grnNumber}-before-delete.json`);
if (!grnNumber || confirmation !== `DELETE:${grnNumber}`) {
  throw new Error('Exact confirmation required: DELETE:<grn-number>');
}

dotenv.config({ path: envFile, quiet: true });
const raw = process.env.DIRECT_URL || process.env.DATABASE_URL;
if (!raw) throw new Error('DIRECT_URL or DATABASE_URL is required');
const url = new URL(raw);
['sslmode', 'sslrootcert', 'sslcert', 'sslkey'].forEach((key) => url.searchParams.delete(key));
const pool = new Pool({ connectionString: url.toString(), ssl: { rejectUnauthorized: false } });
const ident = (value) => `"${String(value).replaceAll('"', '""')}"`;

async function main() {
  const client = await pool.connect();
  try {
    await client.query('begin');
    const { rows: grns } = await client.query(
      'select * from public.grns where grn_number = $1 for update',
      [grnNumber],
    );
    if (grns.length !== 1) throw new Error(`Expected exactly one GRN, found ${grns.length}`);
    const grn = grns[0];
    const terminal = new Set(['CANCELLED', 'CANCELED', 'REJECTED', 'VOID', 'VOIDED']);
    if (!terminal.has(String(grn.status || '').toUpperCase())) throw new Error(`Refusing non-terminal GRN status ${grn.status}`);
    if (grn.qc_completed || grn.invoice_approved) throw new Error('Refusing QC-completed or invoice-approved GRN');

    const { rows: columns } = await client.query(
      `select table_schema, table_name
         from information_schema.columns
        where column_name = 'grn_id' and table_schema = 'public'
        order by table_name`,
    );
    const dependencies = [];
    for (const column of columns) {
      const sql = `select * from ${ident(column.table_schema)}.${ident(column.table_name)} where grn_id = $1`;
      const { rows } = await client.query(sql, [grn.id]);
      if (rows.length) dependencies.push({ table: column.table_name, rows });
    }
    if (dependencies.length) {
      throw new Error(`Refusing GRN with dependent rows: ${dependencies.map((entry) => `${entry.table}=${entry.rows.length}`).join(', ')}`);
    }

    const { rows: locks } = await client.query(
      `select * from public.grn_invoice_locks
        where tenant_id = $1 and po_id = $2 and invoice_key = lower(btrim($3))`,
      [grn.tenant_id, grn.po_id, grn.invoice_number || ''],
    );
    const backup = {
      exported_at: new Date().toISOString(),
      reason: 'Permanent removal of cancelled zero-line technical GRN requested by administrator',
      grn,
      dependencies,
      invoice_locks: locks,
    };
    fs.mkdirSync(path.dirname(backupFile), { recursive: true });
    fs.writeFileSync(backupFile, `${JSON.stringify(backup, null, 2)}\n`, { flag: 'wx', mode: 0o600 });

    await client.query(
      `delete from public.grn_invoice_locks
        where tenant_id = $1 and po_id = $2 and invoice_key = lower(btrim($3))`,
      [grn.tenant_id, grn.po_id, grn.invoice_number || ''],
    );
    const deleted = await client.query('delete from public.grns where id = $1 returning id, grn_number', [grn.id]);
    if (deleted.rowCount !== 1) throw new Error('GRN deletion did not affect exactly one row');
    await client.query('commit');
    console.log(JSON.stringify({ deleted: deleted.rows[0], backup_file: backupFile }, null, 2));
  } catch (error) {
    await client.query('rollback');
    throw error;
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
