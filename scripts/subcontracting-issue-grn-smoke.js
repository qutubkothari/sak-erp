// Verifies SAP-style partial subcontract GRN reconciliation against one outward issue.
const BASE_URL = process.env.SUBCONTRACTING_SMOKE_BASE_URL || 'https://mizantra.saksolution.com';
const api = async (method, path, token, body) => {
  const res = await fetch(`${BASE_URL}/api/v1${path}`, { method, headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: body ? JSON.stringify(body) : undefined });
  const text = await res.text(); let data; try { data = text ? JSON.parse(text) : {}; } catch { data = { text }; }
  if (!res.ok) throw new Error(`${method} ${path}: ${res.status} ${JSON.stringify(data)}`); return data;
};
const list = (x) => Array.isArray(x) ? x : x?.data || x?.items || [];
(async () => {
  const login = await api('POST', '/auth/login', null, { username: process.env.SUBCONTRACTING_SMOKE_USER || 'hnoman', password: process.env.SUBCONTRACTING_SMOKE_PASSWORD || 'Password' });
  const token = login.accessToken || login.data?.accessToken;
  const [itemsRaw, vendorsRaw, warehousesRaw] = await Promise.all([api('GET', '/items?limit=200', token), api('GET', '/purchase/vendors?isActive=true', token), api('GET', '/inventory/warehouses', token)]);
  const raw = list(itemsRaw).find((x) => x.is_active && x.type === 'RAW_MATERIAL' && Number(x.available_quantity || x.current_stock || 0) >= 2);
  const fg = list(itemsRaw).find((x) => x.is_active && (x.type === 'FINISHED_GOODS' || x.type === 'SUB_ASSEMBLY'));
  const vendor = list(vendorsRaw)[0]; const wh = list(warehousesRaw)[0];
  if (!raw || !fg || !vendor || !wh) throw new Error('Required smoke seed data not available');
  const stamp = Date.now();
  const route = await api('POST', '/production/subcontracting/routes', token, { route_number: `GRN-${stamp}`, name: 'Partial GRN reconciliation smoke', input_item_id: raw.id, output_item_id: fg.id, default_input_qty: 2, default_output_qty: 2, uom: raw.uom || 'PCS', steps: [{ sequence_no: 1, node_key: 'N1', operation_name: 'Outside process', vendor_id: vendor.id, input_item_id: raw.id, output_item_id: fg.id, default_input_qty: 2, default_output_qty: 2, output_uom: fg.uom || 'NOS', output_size: 1 }] });
  let order = await api('POST', '/production/subcontracting/orders', token, { route_id: route.id, planned_input_qty: 2, planned_output_qty: 2, source_warehouse_id: wh.id, output_warehouse_id: wh.id });
  const step = order.steps[0];
  order = await api('POST', `/production/subcontracting/orders/${order.id}/issue`, token, { quantity: 2, reference_number: `OUT-${stamp}` });
  const issue = order.movements.find((x) => x.movement_type === 'SUBCON_SIV' && !x.order_step_id);
  await api('POST', `/production/subcontracting/orders/${order.id}/steps/${step.id}/receive`, token, { issue_id: issue.id, finished_goods: [{ item_id: fg.id, quantity: 1, raw_material_qty: 1 }], scrap_qty: 0, unused_return_qty: 0, loss_qty: 0, processing_rate: 1 });
  order = await api('GET', `/production/subcontracting/orders/${order.id}`, token);
  const partialIssue = order.movements.find((x) => x.id === issue.id);
  if (Number(partialIssue.remaining_qty) !== 1 || partialIssue.balance_status !== 'OPEN') throw new Error(`Partial receipt did not leave issue open: ${JSON.stringify(partialIssue)}`);
  // A first partial GRN must be inspected before the supplier can submit the
  // remaining balance. This preserves line-level QC control at every receipt.
  const firstReceipt = order.movements.find((x) => x.movement_type === 'SUBCON_SRV' && x.issue_movement_id === issue.id);
  order = await api('POST', `/production/subcontracting/orders/${order.id}/receipts/${firstReceipt.id}/qc-approve`, token, { approved_qty: 1 });
  await api('POST', `/production/subcontracting/orders/${order.id}/steps/${step.id}/receive`, token, { issue_id: issue.id, finished_goods: [{ item_id: fg.id, quantity: 1, raw_material_qty: 1 }], scrap_qty: 0, unused_return_qty: 0, loss_qty: 0, processing_rate: 1, invoice_number: `INV-${stamp}`, invoice_date: new Date().toISOString().slice(0, 10) });
  order = await api('GET', `/production/subcontracting/orders/${order.id}`, token);
  const closedIssue = order.movements.find((x) => x.id === issue.id);
  if (Number(closedIssue.remaining_qty) !== 0 || closedIssue.balance_status !== 'CLOSED') throw new Error(`Final receipt did not close issue: ${JSON.stringify(closedIssue)}`);
  const receipt = order.movements.find((x) => x.movement_type === 'SUBCON_SRV' && x.invoice_number === `INV-${stamp}`);
  if (receipt.qc_status !== 'PENDING_QC' || Number(receipt.payable_amount || 0) !== 0) throw new Error(`Receipt was released to payables before QC: ${JSON.stringify(receipt)}`);
  order = await api('POST', `/production/subcontracting/orders/${order.id}/receipts/${receipt.id}/qc-approve`, token, { approved_qty: 1 });
  const approved = order.movements.find((x) => x.id === receipt.id);
  if (approved.qc_status !== 'APPROVED' || Number(approved.payable_amount || 0) <= 0) throw new Error(`QC approval did not release payable: ${JSON.stringify(approved)}`);
  const apRows = await api('GET', '/purchase/debit-notes/grns-with-payment-status', token);
  const apMatch = list(apRows).find((row) => row.source_type === 'SUBCONTRACT' && row.source_id === step.id && Number(row.outstanding_amount || 0) > 0);
  if (!apMatch) throw new Error(`QC-approved, invoice-matched subcontract GRN did not appear in Accounts Payable: ${JSON.stringify(list(apRows).filter((row) => row.source_type === 'SUBCONTRACT').slice(0, 5))}`);
  console.log(JSON.stringify({ pass: true, order: order.order_number, issue: issue.document_number, partial_balance: 1, final_balance: 0, qc_released_payable: approved.payable_amount, ap_document: apMatch.grn_number }));
})().catch((e) => { console.error(e.message); process.exit(1); });
