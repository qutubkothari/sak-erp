const fs = require('fs');
const path = require('path');

const BASE_URL = process.env.QA_BASE_URL || 'https://mizantra.saksolution.com';
const USERNAME = process.env.QA_USERNAME || 'hnoman';
const PASSWORD = process.env.QA_PASSWORD || 'Password';
const ENV_FILE = process.env.QA_API_ENV_FILE || path.join(process.cwd(), 'apps/api/.env.test');

function readEnvFile(filePath) {
  const env = {
    SUPABASE_URL: process.env.SUPABASE_URL,
    SUPABASE_SERVICE_KEY: process.env.SUPABASE_SERVICE_KEY,
  };
  if (fs.existsSync(filePath)) {
    const text = fs.readFileSync(filePath, 'utf8');
    for (const line of text.split(/\r?\n/)) {
      if (!line || /^\s*#/.test(line) || !line.includes('=')) continue;
      const idx = line.indexOf('=');
      env[line.slice(0, idx).trim()] = line.slice(idx + 1).trim();
    }
  }
  return env;
}

function assert(condition, message, detail) {
  if (!condition) {
    const suffix = detail === undefined ? '' : `\n${JSON.stringify(detail, null, 2)}`;
    throw new Error(`${message}${suffix}`);
  }
}

function approx(actual, expected, tolerance = 0.02) {
  return Math.abs(Number(actual) - Number(expected)) <= tolerance;
}

async function apiLogin() {
  const response = await fetch(`${BASE_URL}/api/v1/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: USERNAME, password: PASSWORD }),
  });
  const body = await response.text();
  const data = body ? JSON.parse(body) : null;
  assert(response.ok, `Login failed: ${response.status}`, data);
  assert(data?.accessToken && data?.user?.tenant_id, 'Login response missing token or tenant', data);
  return data;
}

async function apiRequest(token, method, endpoint, body, expected = [200, 201]) {
  const response = await fetch(`${BASE_URL}/api/v1${endpoint}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await response.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }
  assert(expected.includes(response.status), `${method} ${endpoint} returned ${response.status}`, data);
  return data;
}

async function supabaseRequest(env, method, tablePath, body, expected = [200, 204]) {
  const response = await fetch(`${env.SUPABASE_URL}/rest/v1/${tablePath}`, {
    method,
    headers: {
      apikey: env.SUPABASE_SERVICE_KEY,
      Authorization: `Bearer ${env.SUPABASE_SERVICE_KEY}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await response.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }
  assert(expected.includes(response.status), `${method} Supabase ${tablePath} returned ${response.status}`, data);
  return data;
}

async function getAlternateCreator(env, tenantId, currentUserId) {
  const users = await supabaseRequest(
    env,
    'GET',
    `users?select=id,username,first_name,last_name&tenant_id=eq.${tenantId}&is_active=eq.true&limit=50`,
    undefined,
  );
  const alternate = (users || []).find((user) => user.id !== currentUserId);
  assert(alternate, 'No alternate active user found for maker-checker simulation');
  return alternate;
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

function futureDate(days) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

function hasSuperAdminBypass(user) {
  const roleName = String(user?.role?.name || user?.role_name || user?.role || '').toLowerCase();
  const permissions = [
    ...(Array.isArray(user?.permissions) ? user.permissions : []),
    ...(Array.isArray(user?.role?.permissions) ? user.role.permissions : []),
  ].map((value) => JSON.stringify(value).toLowerCase());
  return roleName.includes('super') || permissions.some((value) => value.includes('super_admin') || value.includes('admin_override'));
}

function itemPayload(suffix) {
  return {
    code: `QA-PUR-${suffix}`,
    name: `QA Purchase Flow Item ${suffix}`,
    description: 'purchase flow qa material',
    category: 'RAW_MATERIAL',
    productCategory: 'QA Purchase',
    uom: 'NOS',
    hsnCode: '85423900',
    standardCost: 1000,
    reorderLevel: 1,
    reorderQuantity: 10,
    leadTimeDays: 2,
    minStock: 0,
    maxStock: 100,
    drawingRequired: 'NOT_REQUIRED',
    uidStrategy: 'NONE',
  };
}

async function createVerifiedItem(token, env, auth, alternate, suffix) {
  let item = await apiRequest(token, 'POST', '/inventory/items', itemPayload(suffix));
  await supabaseRequest(env, 'PATCH', `items?id=eq.${item.id}&tenant_id=eq.${auth.user.tenant_id}`, { created_by: alternate.id });
  item = await apiRequest(token, 'PUT', `/items/${item.id}/verify`, {});
  assert(item.id && item.code === `QA-PUR-${suffix}`, 'QA item verification failed', item);
  return item;
}

async function cleanup(token, env, state) {
  const tenantId = state.auth?.user?.tenant_id;
  const attempts = [];
  async function attempt(label, fn) {
    try {
      attempts.push({ label, result: await fn() });
    } catch (error) {
      attempts.push({ label, error: error.message });
    }
  }

  if (state.advanceId) {
    await attempt('delete advance payment', () => supabaseRequest(env, 'DELETE', `po_advance_payments?id=eq.${state.advanceId}&tenant_id=eq.${tenantId}`));
  }
  if (state.grn?.id) {
    await attempt('delete grn payment entries', () => supabaseRequest(env, 'DELETE', `grn_payment_entries?grn_id=eq.${state.grn.id}`));
    if (state.item?.id) {
      await attempt('delete stock entries', () => supabaseRequest(env, 'DELETE', `stock_entries?item_id=eq.${state.item.id}`));
    }
    await attempt('delete grn items', () => supabaseRequest(env, 'DELETE', `grn_items?grn_id=eq.${state.grn.id}`));
    await attempt('delete grn', () => supabaseRequest(env, 'DELETE', `grns?id=eq.${state.grn.id}&tenant_id=eq.${tenantId}`));
  }
  if (state.po?.id) {
    await attempt('delete po items', () => supabaseRequest(env, 'DELETE', `purchase_order_items?po_id=eq.${state.po.id}`));
    await attempt('delete po', () => supabaseRequest(env, 'DELETE', `purchase_orders?id=eq.${state.po.id}&tenant_id=eq.${tenantId}`));
  }
  if (state.pr?.id) {
    await attempt('delete pr items', () => supabaseRequest(env, 'DELETE', `purchase_requisition_items?pr_id=eq.${state.pr.id}`));
    await attempt('delete pr', () => supabaseRequest(env, 'DELETE', `purchase_requisitions?id=eq.${state.pr.id}&tenant_id=eq.${tenantId}`));
  }
  if (state.item?.id) {
    await attempt('delete item vendors', () => supabaseRequest(env, 'DELETE', `item_vendors?item_id=eq.${state.item.id}`));
    await attempt('soft delete item', () => apiRequest(token, 'DELETE', `/inventory/items/${state.item.id}`, undefined, [200, 204]));
  }
  return attempts;
}

async function run() {
  const env = readEnvFile(ENV_FILE);
  assert(env.SUPABASE_URL && env.SUPABASE_SERVICE_KEY, 'Supabase service env is missing');

  const auth = await apiLogin();
  const token = auth.accessToken;
  const tenantId = auth.user.tenant_id;
  const alternate = await getAlternateCreator(env, tenantId, auth.user.id);
  const suffix = new Date().toISOString().replace(/[-:.TZ]/g, '').slice(0, 14);
  const state = { auth };
  const result = {
    baseUrl: BASE_URL,
    username: USERNAME,
    alternateCreator: alternate.username,
    suffix,
    checks: [],
  };

  try {
    const vendors = await apiRequest(token, 'GET', '/purchase/vendors?isActive=true');
    const vendor = (vendors || []).find((row) => row.is_verified === true && row.id && row.name);
    assert(vendor, 'No active verified vendor found');
    result.vendor = { code: vendor.code, name: vendor.name };

    const warehouses = await apiRequest(token, 'GET', '/inventory/warehouses');
    const warehouse = (warehouses || []).find((row) => row.id && row.is_active !== false) || (warehouses || [])[0];
    assert(warehouse?.id, 'No warehouse found for GRN test', warehouses);
    result.warehouse = { code: warehouse.code, name: warehouse.name };

    state.item = await createVerifiedItem(token, env, auth, alternate, suffix);
    result.itemCode = state.item.code;
    result.checks.push('created and verified disposable purchase item');

    state.pr = await apiRequest(token, 'POST', '/purchase/requisitions', {
      requestDate: today(),
      department: 'PRODUCTION',
      purpose: `QA purchase flow ${suffix}`,
      deliveryAddress: 'QA Factory Gate',
      requiredDate: futureDate(7),
      priority: 'MEDIUM',
      status: 'DRAFT',
      remarks: 'QA draft requisition',
      items: [
        {
          itemId: state.item.id,
          itemCode: state.item.code,
          itemName: state.item.name,
          vendorId: vendor.id,
          description: 'QA line item',
          uom: 'NOS',
          requestedQty: 10,
          estimatedRate: 1000,
          requiredDate: futureDate(7),
          paymentTerms: 'Net 30',
          deliveryTerms: 'Door delivery',
          remarks: '10 percent discount should carry to PO/GRN/AP',
        },
      ],
    });
    assert(state.pr.status === 'DRAFT', 'PR should start as draft', state.pr);
    assert(state.pr.purchase_requisition_items?.[0]?.payment_terms === 'Net 30', 'PR payment terms not saved on line', state.pr);
    result.prNumber = state.pr.pr_number;
    result.checks.push('created PR draft with commercial terms');

    const duplicatePr = await apiRequest(token, 'POST', '/purchase/requisitions/check-duplicates', {
      items: [{ itemId: state.item.id, itemCode: state.item.code, requestedQty: 10 }],
    });
    assert(duplicatePr?.hasDuplicates === true, 'PR duplicate check did not flag duplicate item/qty', duplicatePr);
    result.checks.push('PR duplicate check');

    state.pr = await apiRequest(token, 'POST', `/purchase/requisitions/${state.pr.id}/submit`, {});
    assert(state.pr.status === 'SUBMITTED', 'PR submit failed', state.pr);

    const selfPrApproval = await fetch(`${BASE_URL}/api/v1/purchase/requisitions/${state.pr.id}/approve`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ comments: 'self approval should fail' }),
    });
    const selfPrBody = await selfPrApproval.text();
    if (hasSuperAdminBypass(auth.user)) {
      assert(selfPrApproval.ok, 'PR Super Admin self approval override should be allowed', selfPrBody);
      state.pr = JSON.parse(selfPrBody);
    } else {
      assert(selfPrApproval.status === 400, 'PR maker-checker self approval should be blocked', selfPrBody);
      await supabaseRequest(env, 'PATCH', `purchase_requisitions?id=eq.${state.pr.id}&tenant_id=eq.${tenantId}`, { requested_by: alternate.id });
      state.pr = await apiRequest(token, 'POST', `/purchase/requisitions/${state.pr.id}/approve`, { comments: 'QA manager approval' });
    }
    assert(state.pr.status === 'APPROVED', 'PR approval failed', state.pr);
    result.checks.push('PR submit and maker-checker approval');

    const availableForPo = await apiRequest(token, 'GET', `/purchase/requisitions/${state.pr.id}/available-for-po`);
    const prLine = (availableForPo.items || availableForPo.purchase_requisition_items || state.pr.purchase_requisition_items || [])[0];
    assert(prLine?.id, 'Available PR line missing for PO generation', availableForPo);

    const qty = 10;
    const rate = 1000;
    const discountPercent = 10;
    const taxPercent = 18;
    const baseAmount = qty * rate;
    const discountAmount = baseAmount * (discountPercent / 100);
    const taxableAmount = baseAmount - discountAmount;
    const taxAmount = taxableAmount * (taxPercent / 100);
    const grandTotal = taxableAmount + taxAmount;

    state.po = await apiRequest(token, 'POST', '/purchase/orders', {
      prId: state.pr.id,
      vendorId: vendor.id,
      poDate: today(),
      deliveryDate: futureDate(10),
      quotationRef: `QA-QTN-${suffix}`,
      paymentTerms: 'NET_30',
      deliveryAddress: 'QA Factory Gate',
      deliveryContactPerson: 'QA Stores',
      deliveryContactPhone: '9999999999',
      termsAndConditions: 'QA purchase terms',
      status: 'DRAFT',
      totalAmount: taxableAmount,
      taxAmount,
      discountAmount,
      grandTotal,
      remarks: 'QA PO discount propagation test',
      attachments: [{ name: `qa-quotation-${suffix}.pdf`, url: `/uploads/qa/qa-quotation-${suffix}.pdf`, type: 'application/pdf', size: 128 }],
      items: [
        {
          prItemId: prLine.id,
          itemId: state.item.id,
          itemCode: state.item.code,
          itemName: state.item.name,
          description: 'QA PO line',
          uom: 'NOS',
          orderedQty: qty,
          rate,
          taxPercent,
          discountPercent,
          deliveryDate: futureDate(10),
          paymentTerms: 'NET_30',
          deliveryTerms: 'Door delivery',
          remarks: 'Discount line test',
        },
      ],
    });
    assert(state.po.id && state.po.status === 'DRAFT', 'PO draft creation failed', state.po);
    const poLine = state.po.purchase_order_items?.[0];
    assert(poLine?.id, 'PO line missing after create', state.po);
    assert(approx(poLine.discount_percent, discountPercent), 'PO line discount not saved', poLine);
    assert(approx(poLine.amount, grandTotal), 'PO line amount should include discount then GST', poLine);
    assert(approx(state.po.discount_amount, discountAmount), 'PO header discount amount mismatch', state.po);
    result.poNumber = state.po.po_number;
    result.checks.push('created PO from PR with discount and mandatory quotation');

    state.po = await apiRequest(token, 'POST', `/purchase/orders/${state.po.id}/status`, { status: 'PENDING' });
    assert(state.po.status === 'PENDING', 'PO submit-for-approval status failed', state.po);

    const selfPoApproval = await fetch(`${BASE_URL}/api/v1/purchase/orders/${state.po.id}/approve`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ remarks: 'self approval should fail' }),
    });
    const selfPoBody = await selfPoApproval.text();
    if (hasSuperAdminBypass(auth.user)) {
      assert(selfPoApproval.ok, 'PO Super Admin self approval override should be allowed', selfPoBody);
      state.po = JSON.parse(selfPoBody);
    } else {
      assert(selfPoApproval.status === 400, 'PO maker-checker self approval should be blocked', selfPoBody);
      await supabaseRequest(env, 'PATCH', `purchase_orders?id=eq.${state.po.id}&tenant_id=eq.${tenantId}`, { created_by: alternate.id });
      state.po = await apiRequest(token, 'POST', `/purchase/orders/${state.po.id}/approve`, { remarks: 'QA manager approval' });
    }
    assert(state.po.status === 'APPROVED', 'PO approval failed', state.po);
    assert(state.po.approved_at, 'Approved PO should have approval timestamp', state.po);
    assert(state.po.approved_by_name && !/not approved/i.test(state.po.approved_by_name), 'Approved PO detail should show approver name', state.po);
    const poListAfterApproval = await apiRequest(token, 'GET', `/purchase/orders?search=${encodeURIComponent(state.po.po_number)}`);
    const listedApprovedPO = (poListAfterApproval || []).find((row) => row.id === state.po.id);
    assert(listedApprovedPO?.approved_by_name && !/not approved/i.test(listedApprovedPO.approved_by_name), 'Approved PO list/trail source should show approver name', listedApprovedPO || poListAfterApproval);
    result.checks.push('PO maker-checker approval with approver name visible in detail and list');

    const advance = await apiRequest(token, 'POST', '/purchase/debit-notes/advance-payment', {
      advance_type: 'PO',
      po_id: state.po.id,
      vendor_id: vendor.id,
      amount: 4000,
      payment_method: 'BANK_TRANSFER',
      payment_reference: `QA-ADV-${suffix}`,
      payment_date: today(),
      payment_notes: 'QA advance should not auto-deduct',
    });
    state.advanceId = advance.advance_id;
    assert(state.advanceId, 'Advance payment did not return id', advance);
    result.checks.push('recorded supplier advance before invoice');

    state.grn = await apiRequest(token, 'POST', '/purchase/grn', {
      poId: state.po.id,
      vendorId: vendor.id,
      grnDate: today(),
      receiptDate: today(),
      invoiceNumber: `QA-INV-${suffix}`,
      invoiceDate: today(),
      invoiceFileUrl: `/uploads/grn/invoices/qa-${suffix}.pdf`,
      invoiceFileName: `qa-${suffix}.pdf`,
      invoiceFileType: 'application/pdf',
      invoiceFileSize: 128,
      warehouseId: warehouse.id,
      status: 'DRAFT',
      remarks: 'QA partial GRN',
      items: [
        {
          poItemId: poLine.id,
          itemId: state.item.id,
          itemCode: state.item.code,
          itemName: state.item.name,
          description: 'QA GRN line',
          uom: 'NOS',
          orderedQty: qty,
          receivedQty: 4,
          acceptedQty: 0,
          rejectedQty: 0,
          inspectionStatus: 'PENDING',
          remarks: 'partial receipt',
        },
      ],
    });
    assert(state.grn.id && state.grn.grn_items?.[0]?.id, 'GRN creation failed', state.grn);
    result.grnNumber = state.grn.grn_number;
    result.checks.push('created partial GRN against PO');

    const grnLine = state.grn.grn_items[0];
    const qc = await apiRequest(token, 'POST', `/purchase/grn/${state.grn.id}/qc-accept`, {
      items: [
        {
          itemId: grnLine.id,
          itemCode: state.item.code,
          itemName: state.item.name,
          acceptedQty: 4,
          rejectedQty: 0,
          qcNotes: 'QA accepted',
        },
      ],
    });
    assert(qc.qcCompleted === true, 'QC accept did not complete GRN', qc);
    state.grn = await apiRequest(token, 'GET', `/purchase/grn/${state.grn.id}`);
    const expectedGrnGross = 4 * rate * (1 - discountPercent / 100);
    const expectedGrnTax = expectedGrnGross * (taxPercent / 100);
    const expectedGrnNet = Math.round(expectedGrnGross + expectedGrnTax);
    assert(state.grn.status === 'COMPLETED' && state.grn.qc_completed === true, 'GRN should be completed after QC', state.grn);
    assert(approx(state.grn.gross_amount, expectedGrnGross), 'GRN gross should reflect PO discount', state.grn);
    assert(approx(state.grn.tax_amount, expectedGrnTax), 'GRN tax should apply to discounted amount', state.grn);
    assert(approx(state.grn.net_payable_amount, expectedGrnNet), 'GRN net payable mismatch', state.grn);
    result.checks.push('GRN QC posts stock and preserves PO discount in payable');

    const selfInvoiceApproval = await fetch(`${BASE_URL}/api/v1/purchase/grn/${state.grn.id}/approve-invoice`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ notes: 'self sanction should fail' }),
    });
    const selfInvoiceBody = await selfInvoiceApproval.text();
    if (hasSuperAdminBypass(auth.user)) {
      assert(selfInvoiceApproval.ok, 'Supplier invoice Super Admin self sanction override should be allowed', selfInvoiceBody);
      state.grn = JSON.parse(selfInvoiceBody);
    } else {
      assert(selfInvoiceApproval.status === 403, 'Receiver should not sanction own supplier invoice', selfInvoiceBody);
      await supabaseRequest(env, 'PATCH', `grns?id=eq.${state.grn.id}&tenant_id=eq.${tenantId}`, { received_by: alternate.id });
      state.grn = await apiRequest(token, 'POST', `/purchase/grn/${state.grn.id}/approve-invoice`, { notes: 'QA invoice sanction' });
    }
    assert(state.grn.invoice_approved === true, 'Supplier invoice sanction failed', state.grn);
    result.checks.push('supplier invoice sanction maker-checker');

    const beforePayment = await apiRequest(token, 'GET', `/purchase/debit-notes/grn/${state.grn.id}/payable-detail`);
    assert(approx(beforePayment.net_payable_amount ?? beforePayment.net_payable, expectedGrnNet), 'AP payable detail net mismatch', beforePayment);
    assert(approx(beforePayment.outstanding_amount, expectedGrnNet), 'Advance should not auto-deduct before selected payment adjustment', beforePayment);
    assert(Number(beforePayment.available_po_advance || 0) >= 4000, 'PO advance should be visible as available', beforePayment);
    result.checks.push('advance visible but not auto-deducted from invoice');

    const payment = await apiRequest(token, 'POST', `/purchase/debit-notes/grn/${state.grn.id}/payment`, {
      amount: expectedGrnNet - 3000,
      advance_adjustment_amount: 3000,
      payment_method: 'BANK_TRANSFER',
      payment_reference: `QA-PAY-${suffix}`,
      payment_date: today(),
      payment_notes: 'QA selected advance adjustment',
    });
    assert(approx(payment.advance_adjusted_amount, 3000), 'Payment did not record selected advance adjustment', payment);
    assert(approx(payment.remaining_amount, 0), 'Payment should clear invoice after selected advance plus balance cash', payment);
    assert(payment.payment_status === 'PAID', 'Payment status should be PAID after full settlement', payment);
    result.checks.push('AP payment applies only selected advance amount and pays balance');

    const settlement = await apiRequest(token, 'GET', `/purchase/debit-notes/po/${state.po.id}/settlement`);
    const invoiceSettlement = (settlement.invoices || []).find((invoice) => invoice.grn_id === state.grn.id);
    assert(invoiceSettlement, 'PO settlement missing test GRN invoice', settlement);
    assert(approx(invoiceSettlement.settlement.advanceApplied, 3000), 'PO trail settlement advance applied mismatch', invoiceSettlement);
    assert(approx(invoiceSettlement.settlement.outstanding, 0), 'PO trail settlement outstanding mismatch', invoiceSettlement);
    result.checks.push('PO trail/AP settlement includes supplier payments and advance utilization');
  } finally {
    result.cleanup = await cleanup(token, env, state);
  }

  const outputDirectory = path.join(process.cwd(), 'artifacts', 'qa');
  fs.mkdirSync(outputDirectory, { recursive: true });
  const output = path.join(outputDirectory, `purchase-flow-${new Date().toISOString().replace(/[-:TZ.]/g, '').slice(0, 14)}.json`);
  fs.writeFileSync(output, JSON.stringify(result, null, 2));
  console.log(JSON.stringify({ ...result, output }, null, 2));
}

run().catch((error) => {
  const outputDirectory = path.join(process.cwd(), 'artifacts', 'qa');
  fs.mkdirSync(outputDirectory, { recursive: true });
  fs.writeFileSync(path.join(outputDirectory, `purchase-flow-failure-${new Date().toISOString().replace(/[-:TZ.]/g, '').slice(0, 14)}.json`), JSON.stringify({ error: error.stack || error.message }, null, 2));
  console.error(error.stack || error.message);
  process.exit(1);
});
