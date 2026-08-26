// Current subcontracting lifecycle smoke: route -> service order -> one RM issue
// -> six-line receipt/backflush -> QC -> payable -> payment.
// This intentionally defaults to Mizantra. Set the base URL explicitly for any
// other environment; never silently point a destructive smoke at live.
const BASE_URL = process.env.SUBCONTRACTING_SMOKE_BASE_URL || 'https://mizantra.saksolution.com';
const USERNAME = process.env.SUBCONTRACTING_SMOKE_USER || 'hnoman';
const PASSWORD = process.env.SUBCONTRACTING_SMOKE_PASSWORD || 'Password';

const unwrap = (value) => value?.data ?? value;
const list = (value) => {
  const unwrapped = unwrap(value);
  return Array.isArray(unwrapped) ? unwrapped : unwrapped?.items || unwrapped?.data || [];
};
const api = async (method, path, token, body) => {
  const response = await fetch(`${BASE_URL}/api/v1${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const raw = await response.text();
  let data;
  try { data = raw ? JSON.parse(raw) : {}; } catch { data = { raw }; }
  if (!response.ok) throw new Error(`${method} ${path}: ${response.status} ${JSON.stringify(data)}`);
  return unwrap(data);
};
const assert = (condition, message, detail) => {
  if (!condition) throw new Error(`${message}${detail === undefined ? '' : `: ${JSON.stringify(detail)}`}`);
};

(async () => {
  assert(!/pmstest/i.test(BASE_URL) || process.env.ALLOW_LIVE_SUBCONTRACTING_SMOKE === 'YES', 'Refusing to run a stock-changing smoke on live without ALLOW_LIVE_SUBCONTRACTING_SMOKE=YES');
  const login = await api('POST', '/auth/login', null, { username: USERNAME, password: PASSWORD });
  const token = login.accessToken || login.access_token;
  assert(token, 'Login did not return an access token');

  const [itemsRaw, vendorsRaw, warehousesRaw] = await Promise.all([
    api('GET', '/items?limit=500', token),
    api('GET', '/purchase/vendors?isActive=true', token),
    api('GET', '/inventory/warehouses', token),
  ]);
  const items = list(itemsRaw);
  const vendors = list(vendorsRaw);
  const warehouses = list(warehousesRaw);
  // This scenario specifically verifies a weight-to-counted-product route.
  // Selecting any raw item could select a NUMBER-UOM item and turn the
  // expected KG/MTR reconciliation into a false test failure.
  const raw = items.find((item) => item.is_active !== false
    && item.type === 'RAW_MATERIAL'
    && String(item.uom || '').toUpperCase() === 'KG'
    && Number(item.available_quantity ?? item.current_stock ?? 0) >= 0.06);
  const products = items.filter((item) => item.is_active !== false && item.id !== raw?.id && ['FINISHED_GOODS', 'SUB_ASSEMBLY'].includes(item.type)).slice(0, 6);
  const vendor = vendors[0];
  const warehouse = warehouses.find((row) => /main/i.test(`${row.code || ''} ${row.name || ''}`)) || warehouses[0];
  assert(raw && products.length === 6 && vendor && warehouse, 'Required raw stock, six output products, vendor, or warehouse is unavailable', { raw: !!raw, products: products.length, vendors: vendors.length, warehouses: warehouses.length });

  const stamp = Date.now();
  const sizes = [8, 9, 10, 11, 12, 10]; // total 60 mm for six pieces
  const route = await api('POST', '/production/subcontracting/routes', token, {
    route_number: `STAB-${stamp}`,
    name: `STABILIZATION SIX OUTPUT ${stamp}`,
    input_item_id: raw.id,
    notes: `AUTOMATED STABILIZATION SMOKE ${stamp}`,
    steps: products.map((product, index) => ({
      sequence_no: index + 1,
      node_key: `OUTPUT-${index + 1}`,
      operation_name: 'Subcontract Processing',
      process_type: 'OUTSIDE_PROCESSING',
      input_item_id: raw.id,
      output_item_id: product.id,
      output_uom: 'NOS',
      output_size: sizes[index],
    })),
  });
  assert(route.id && route.route_number && route.steps?.length === 6, 'Route response is incomplete', route);

  let order = await api('POST', '/production/subcontracting/orders', token, {
    route_id: route.id,
    vendor_id: vendor.id,
    source_warehouse_id: warehouse.id,
    output_warehouse_id: warehouse.id,
    planned_input_qty: 0.06,
    input_uom: 'KG',
    secondary_input_qty: 0.06,
    secondary_input_uom: 'MTR',
    notes: `AUTOMATED STABILIZATION SMOKE ${stamp}`,
    output_lines: route.steps.map((step, index) => ({
      node_key: step.node_key,
      item_id: step.output_item_id,
      uom: 'NOS',
      quantity: 1,
      size: sizes[index],
      price: 10,
      hsn_code: '998873',
      discount_percent: 0,
    })),
  });
  assert(order.id && order.order_number && order.steps?.length === 6, 'Order response contract is incomplete', { id: order.id, order_number: order.order_number, steps: order.steps?.length, keys: Object.keys(order || {}) });
  assert(order.order?.id === order.id, 'Backward-compatible nested order response is missing');
  assert(Number(order.secondary_input_qty) === 0.06, 'Secondary input quantity was not saved', order.secondary_input_qty);

  order = await api('POST', `/production/subcontracting/orders/${order.id}/issue`, token, { quantity: 0.06, notes: `SMOKE ${stamp}` });
  const issues = (order.movements || []).filter((movement) => movement.movement_type === 'SUBCON_SIV');
  assert(issues.length === 1 && issues[0].document_number, 'Exactly one numbered material outward challan was not created', issues);
  assert(order.status === 'IN_PROCESS', 'Order did not enter IN_PROCESS after issue', order.status);

  const rootStep = [...order.steps].sort((a, b) => Number(a.sequence_no) - Number(b.sequence_no))[0];
  order = await api('POST', `/production/subcontracting/orders/${order.id}/steps/${rootStep.id}/receive`, token, {
    issue_id: issues[0].id,
    finished_goods: order.steps.map((step) => ({ item_id: step.output_item_id, quantity: 1 })),
    rejected_qty: 0,
    scrap_qty: 0,
    unused_return_qty: 0,
    loss_qty: 0,
    deduction_amount: 5,
    tax_percent: 18,
    invoice_number: `VINV-${stamp}`,
    invoice_date: new Date().toISOString().slice(0, 10),
    notes: `AUTOMATED STABILIZATION SMOKE ${stamp}`,
  });
  const receipt = (order.movements || []).find((movement) => movement.movement_type === 'SUBCON_SRV');
  const issueAfterReceipt = (order.movements || []).find((movement) => movement.id === issues[0].id);
  assert(receipt?.document_number && receipt.qc_status === 'PENDING_QC', 'Receipt/GRN was not created in PENDING_QC', receipt);
  assert(Number(receipt.consumed_qty) === 0.06, 'Backflush did not consume the planned 60 mm / 0.06 KG', receipt.consumed_qty);
  assert(Number(issueAfterReceipt.remaining_qty) === 0, 'Outward challan did not reconcile to zero', issueAfterReceipt);
  assert(order.status === 'IN_PROCESS', 'Receipt completed the order before QC', order.status);
  assert(order.steps.some((step) => step.status === 'PENDING_QC'), 'Receipt did not place operation into PENDING_QC');
  assert(Number(receipt.payable_amount || 0) === 0, 'Payable was released before QC', receipt.payable_amount);

  // QC is line-level, exactly like GRN. Submit one inspection per received
  // finished-good line rather than the obsolete aggregate approved_qty.
  const lineInspections = (receipt.receipt_lines || [])
    .filter((line) => String(line.line_type || '').toUpperCase() === 'FINISHED_GOOD')
    .map((line) => ({
      receipt_line_id: line.id,
      approved_qty: Number(line.quantity || 0),
      notes: `SMOKE QC ${stamp}`,
    }));
  assert(lineInspections.length === 6, 'Receipt did not return six finished-good lines for QC', receipt.receipt_lines);
  order = await api('POST', `/production/subcontracting/orders/${order.id}/receipts/${receipt.id}/qc-approve`, token, {
    line_inspections: lineInspections,
    notes: `SMOKE QC ${stamp}`,
  });
  const approvedReceipt = (order.movements || []).find((movement) => movement.id === receipt.id);
  assert(approvedReceipt.qc_status === 'APPROVED', 'QC did not approve the receipt', approvedReceipt);
  assert(order.status === 'COMPLETED', 'Order did not complete after full QC approval', order.status);
  assert(order.steps.every((step) => step.status === 'COMPLETED'), 'All six output lines did not complete together', order.steps.map((step) => step.status));
  assert(Number(approvedReceipt.processing_amount) === 60, 'Processing amount is not calculated from six service-order lines', approvedReceipt.processing_amount);
  assert(Number(approvedReceipt.tax_amount) === 10.8, 'GST is incorrect', approvedReceipt.tax_amount);
  assert(Number(approvedReceipt.payable_amount) === 65.8, 'Payable is incorrect (60 + 10.8 - 5 = 65.80)', approvedReceipt.payable_amount);

  const finance = list(await api('GET', '/production/subcontracting/finance', token));
  const payable = finance.find((row) => row.order_id === order.id);
  assert(payable && Number(payable.payable_amount) === 65.8, 'QC-approved payable is missing from Finance', finance.filter((row) => row.order_id === order.id));
  order = await api('POST', `/production/subcontracting/orders/${order.id}/steps/${payable.id}/pay`, token, { amount: 65.8, payment_reference: `SMOKE-PAY-${stamp}` });
  const paidStep = order.steps.find((step) => step.id === payable.id);
  assert(paidStep.invoice_status === 'PAID' && Number(paidStep.paid_amount) === 65.8, 'Payment did not close the payable', paidStep);

  console.log(JSON.stringify({
    pass: true,
    environment: BASE_URL,
    route: route.route_number,
    order: order.order_number,
    material_outward_challan: issues[0].document_number,
    grn: receipt.document_number,
    output_lines: 6,
    backflushed_kg: approvedReceipt.consumed_qty,
    processing: approvedReceipt.processing_amount,
    tax: approvedReceipt.tax_amount,
    deduction: 5,
    payable: approvedReceipt.payable_amount,
    payment_status: paidStep.invoice_status,
  }, null, 2));
})().catch((error) => {
  console.error(error.stack || error.message || error);
  process.exit(1);
});
