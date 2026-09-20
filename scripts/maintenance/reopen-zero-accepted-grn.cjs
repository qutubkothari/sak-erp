const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');
const { Pool } = require('pg');

const envFile = path.resolve(process.argv[2] || 'apps/api/.env');
const grnNumber = String(process.argv[3] || '').trim();
const invoiceNumber = String(process.argv[4] || '').trim();
const mode = String(process.argv[5] || 'DRY_RUN').trim();
const backupFile = process.argv[6] ? path.resolve(process.argv[6]) : '';
const executeToken = `REOPEN:${grnNumber}:${invoiceNumber}`;

if (!grnNumber || !invoiceNumber) {
  throw new Error('Usage: node reopen-zero-accepted-grn.cjs <env> <grn> <invoice> DRY_RUN|REOPEN:<grn>:<invoice> [backup]');
}
if (mode !== 'DRY_RUN' && mode !== executeToken) {
  throw new Error(`Exact confirmation required: ${executeToken}`);
}
if (mode !== 'DRY_RUN' && !backupFile) {
  throw new Error('A backup file is required for execution');
}

dotenv.config({ path: envFile, quiet: true });
const raw = process.env.DIRECT_URL || process.env.DATABASE_URL;
if (!raw) throw new Error('DIRECT_URL or DATABASE_URL is required');
const url = new URL(raw);
['sslmode', 'sslrootcert', 'sslcert', 'sslkey'].forEach((key) => url.searchParams.delete(key));
const pool = new Pool({ connectionString: url.toString(), ssl: { rejectUnauthorized: false } });
const ident = (value) => `"${String(value).replaceAll('"', '""')}"`;
const number = (value) => Number(value || 0);

async function rowsByColumn(client, column, value) {
  const { rows: tables } = await client.query(
    `select table_schema, table_name
       from information_schema.columns
      where table_schema = 'public' and column_name = $1
      order by table_name`,
    [column],
  );
  const result = [];
  for (const table of tables) {
    const { rows } = await client.query(
      `select * from ${ident(table.table_schema)}.${ident(table.table_name)} where ${ident(column)} = $1`,
      [value],
    );
    if (rows.length) result.push({ table: table.table_name, rows });
  }
  return result;
}

async function main() {
  const client = await pool.connect();
  try {
    await client.query('begin');
    const { rows: grns } = await client.query(
      `select * from public.grns
        where grn_number = $1 and lower(btrim(invoice_number)) = lower(btrim($2))
        for update`,
      [grnNumber, invoiceNumber],
    );
    if (grns.length !== 1) throw new Error(`Expected exactly one matching GRN, found ${grns.length}`);
    const grn = grns[0];
    if (String(grn.status || '').toUpperCase() !== 'COMPLETED' || !grn.qc_completed) {
      throw new Error(`Refusing GRN in status ${grn.status} with qc_completed=${grn.qc_completed}`);
    }
    if (grn.invoice_approved) throw new Error('Refusing invoice-approved GRN');
    if (number(grn.paid_amount) !== 0 || ['PAID', 'PARTIAL'].includes(String(grn.payment_status || '').toUpperCase())) {
      throw new Error('Refusing paid or partially paid GRN');
    }

    const { rows: grnItems } = await client.query(
      'select * from public.grn_items where grn_id = $1 order by created_at, id for update',
      [grn.id],
    );
    if (!grnItems.length) throw new Error('Refusing because the GRN has no item rows');
    const accepted = grnItems.reduce((sum, item) => sum + number(item.accepted_qty), 0);
    if (Math.abs(accepted) > 0.000001) throw new Error(`Refusing because accepted quantity is ${accepted}`);

    const dependencies = await rowsByColumn(client, 'grn_id', grn.id);
    const allowedGrnTables = new Set(['grn_items', 'grn_sap_controls', 'grn_sap_control_items', 'debit_notes']);
    const unknownGrnDependencies = dependencies.filter((entry) => !allowedGrnTables.has(entry.table));
    if (unknownGrnDependencies.length) {
      throw new Error(`Refusing unknown GRN dependencies: ${unknownGrnDependencies.map((entry) => `${entry.table}=${entry.rows.length}`).join(', ')}`);
    }

    const { rows: debitNotes } = await client.query(
      'select * from public.debit_notes where grn_id = $1 for update',
      [grn.id],
    );
    if (debitNotes.some((note) => String(note.status || '').toUpperCase() !== 'DRAFT')) {
      throw new Error('Refusing non-draft debit note');
    }
    const debitNoteItems = [];
    for (const note of debitNotes) {
      const deps = await rowsByColumn(client, 'debit_note_id', note.id);
      const allowedDebitTables = new Set(['debit_note_items', 'grn_items']);
      const unknown = deps.filter((entry) => !allowedDebitTables.has(entry.table));
      if (unknown.length) {
        throw new Error(`Refusing unknown debit-note dependencies: ${unknown.map((entry) => `${entry.table}=${entry.rows.length}`).join(', ')}`);
      }
      debitNoteItems.push(...deps.filter((entry) => entry.table === 'debit_note_items').flatMap((entry) => entry.rows));
    }

    const { rows: locks } = await client.query(
      `select * from public.grn_invoice_locks
        where tenant_id = $1 and po_id = $2 and invoice_key = lower(btrim($3))
        for update`,
      [grn.tenant_id, grn.po_id, invoiceNumber],
    );
    const { rows: poItems } = await client.query(
      'select * from public.purchase_order_items where po_id = $1 order by id for update',
      [grn.po_id],
    );
    const { rows: purchaseOrders } = await client.query(
      'select * from public.purchase_orders where id = $1 for update',
      [grn.po_id],
    );
    if (purchaseOrders.length !== 1) throw new Error('Purchase order not found');

    const controls = dependencies.filter((entry) => ['grn_sap_controls', 'grn_sap_control_items'].includes(entry.table));
    const snapshot = {
      exported_at: new Date().toISOString(),
      reason: 'Controlled reversal of zero-accepted, unpaid GRN to allow correct receipt recreation',
      grn,
      grn_items: grnItems,
      debit_notes: debitNotes,
      debit_note_items: debitNoteItems,
      sap_controls: controls,
      invoice_locks: locks,
      purchase_order: purchaseOrders[0],
      purchase_order_items: poItems,
    };

    const proposal = {
      grn: grn.grn_number,
      po: purchaseOrders[0].po_number,
      invoice: grn.invoice_number,
      received_qty: grnItems.reduce((sum, item) => sum + number(item.received_qty), 0),
      accepted_qty: accepted,
      draft_debit_notes: debitNotes.map((note) => ({ id: note.id, number: note.debit_note_number, total: note.total_amount })),
      invoice_locks: locks.length,
      action: 'Delete draft debit-note/control artifacts, reverse PO receipts, reject GRN, and release invoice lock',
    };

    if (mode === 'DRY_RUN') {
      await client.query('rollback');
      console.log(JSON.stringify({ dry_run: true, proposal }, null, 2));
      return;
    }

    fs.mkdirSync(path.dirname(backupFile), { recursive: true });
    fs.writeFileSync(backupFile, `${JSON.stringify(snapshot, null, 2)}\n`, { flag: 'wx', mode: 0o600 });

    const debitNoteIds = debitNotes.map((note) => note.id);
    if (debitNoteIds.length) {
      await client.query('delete from public.debit_note_items where debit_note_id = any($1::uuid[])', [debitNoteIds]);
      await client.query('update public.grn_items set debit_note_id = null where grn_id = $1', [grn.id]);
      await client.query('delete from public.debit_notes where id = any($1::uuid[])', [debitNoteIds]);
    }
    await client.query('delete from public.grn_sap_control_items where grn_id = $1', [grn.id]);
    await client.query('delete from public.grn_sap_controls where grn_id = $1', [grn.id]);

    const receiptByPoItem = new Map();
    for (const item of grnItems) {
      if (!item.po_item_id) throw new Error(`GRN item ${item.id} has no PO item reference`);
      receiptByPoItem.set(item.po_item_id, (receiptByPoItem.get(item.po_item_id) || 0) + number(item.received_qty));
    }
    for (const [poItemId, receivedQty] of receiptByPoItem.entries()) {
      const poItem = poItems.find((item) => item.id === poItemId);
      if (!poItem) throw new Error(`PO item ${poItemId} not found`);
      const currentReceived = number(poItem.received_qty);
      if (currentReceived + 0.000001 < receivedQty) {
        throw new Error(`PO item ${poItemId} received quantity ${currentReceived} is below rollback ${receivedQty}`);
      }
      await client.query(
        'update public.purchase_order_items set received_qty = greatest(0, coalesce(received_qty, 0) - $1), updated_at = now() where id = $2',
        [receivedQty, poItemId],
      );
    }

    const reversalNote = `Administrative reversal on ${new Date().toISOString()}: zero accepted quantity; reopened PO/invoice for correct GRN recreation.`;
    await client.query(
      `update public.grns
          set status = 'REJECTED', qc_completed = false, debit_note_amount = 0,
              notes = concat_ws(E'\n', nullif(notes, ''), $1::text), updated_at = now()
        where id = $2`,
      [reversalNote, grn.id],
    );
    await client.query(
      `delete from public.grn_invoice_locks
        where tenant_id = $1 and po_id = $2 and invoice_key = lower(btrim($3))`,
      [grn.tenant_id, grn.po_id, invoiceNumber],
    );

    const { rows: currentPoItems } = await client.query(
      'select ordered_qty, received_qty from public.purchase_order_items where po_id = $1',
      [grn.po_id],
    );
    const orderedTotal = currentPoItems.reduce((sum, item) => sum + number(item.ordered_qty), 0);
    const receivedTotal = currentPoItems.reduce((sum, item) => sum + number(item.received_qty), 0);
    const nextStatus = receivedTotal >= orderedTotal - 0.000001 ? 'CLOSED' : receivedTotal > 0.000001 ? 'PARTIAL' : 'APPROVED';
    const currentPoStatus = String(purchaseOrders[0].status || '').toUpperCase();
    if (!['DRAFT', 'PENDING', 'REJECTED', 'CANCELLED', 'CANCELED'].includes(currentPoStatus)) {
      await client.query(
        'update public.purchase_orders set status = $1, updated_at = now() where id = $2',
        [nextStatus, grn.po_id],
      );
    }

    await client.query('commit');

    const { rows: verification } = await client.query(
      `select g.grn_number, g.status, g.qc_completed, g.debit_note_amount,
              po.po_number, po.status as po_status,
              (select count(*) from public.debit_notes dn where dn.grn_id = g.id)::int as debit_notes,
              (select count(*) from public.grn_invoice_locks l where l.tenant_id = g.tenant_id and l.po_id = g.po_id and l.invoice_key = lower(btrim(g.invoice_number)))::int as invoice_locks
         from public.grns g join public.purchase_orders po on po.id = g.po_id
        where g.id = $1`,
      [grn.id],
    );
    console.log(JSON.stringify({ executed: true, proposal, verification: verification[0], backup_file: backupFile }, null, 2));
  } catch (error) {
    try { await client.query('rollback'); } catch (_) {}
    throw error;
  } finally {
    client.release();
  }
}

main()
  .catch((error) => {
    console.error(error.stack || error.message);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
