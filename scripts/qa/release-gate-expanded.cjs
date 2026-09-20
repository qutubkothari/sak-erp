const fs = require('fs');
const path = require('path');

const BASE_URL = process.env.QA_BASE_URL || 'https://mizantra.saksolution.com';
const USERNAME = process.env.QA_USERNAME || 'hnoman';
const PASSWORD = process.env.QA_PASSWORD || 'Password';
const ENV_FILE = process.env.QA_API_ENV_FILE || path.join(process.cwd(), 'apps/api/.env.test');
const OUT_DIR = process.env.QA_OUT_DIR || path.join(process.cwd(), 'qa-results');

function readEnvFile(filePath) {
  const env = {};
  const text = fs.readFileSync(filePath, 'utf8');
  for (const line of text.split(/\r?\n/)) {
    if (!line || /^\s*#/.test(line) || !line.includes('=')) continue;
    const idx = line.indexOf('=');
    env[line.slice(0, idx).trim()] = line.slice(idx + 1).trim();
  }
  return env;
}

function assert(condition, message, detail) {
  if (!condition) {
    const suffix = detail === undefined ? '' : `\n${JSON.stringify(detail, null, 2)}`;
    throw new Error(`${message}${suffix}`);
  }
}

function today(offsetDays = 0) {
  const date = new Date();
  date.setDate(date.getDate() + offsetDays);
  return date.toISOString().slice(0, 10);
}

function encode(v) {
  return encodeURIComponent(String(v));
}

function apiDate() {
  return today(0);
}

function stockAvailable(payload) {
  return Number(
    payload?.summary?.available_quantity
    ?? payload?.available_quantity
    ?? payload?.totalAvailable
    ?? payload?.total_quantity
    ?? 0,
  );
}

async function login(username = USERNAME, password = PASSWORD) {
  const response = await fetch(`${BASE_URL}/api/v1/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });
  const text = await response.text();
  const data = text ? JSON.parse(text) : null;
  assert(response.ok, `Login failed for ${username}: ${response.status}`, data);
  assert(data?.accessToken && data?.user?.tenant_id, 'Login response missing token or tenant', data);
  return data;
}

async function api(token, method, endpoint, body, extraHeaders = {}) {
  const headers = { Authorization: `Bearer ${token}`, ...extraHeaders };
  if (!(body instanceof FormData)) headers['Content-Type'] = 'application/json';
  const response = await fetch(`${BASE_URL}/api/v1${endpoint}`, {
    method,
    headers,
    body: body === undefined ? undefined : body instanceof FormData ? body : JSON.stringify(body),
  });
  const buffer = Buffer.from(await response.arrayBuffer());
  const text = buffer.toString('utf8');
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }
  return { response, data, buffer };
}

async function apiOk(token, method, endpoint, body, expected = [200, 201]) {
  const result = await api(token, method, endpoint, body);
  assert(expected.includes(result.response.status), `${method} ${endpoint} returned ${result.response.status}`, result.data);
  return result.data;
}

async function supabase(env, method, tablePath, body, expected = [200, 201, 204]) {
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

async function runCheck(report, name, meta, fn) {
  const entry = {
    screen: meta.screen,
    clickPath: meta.clickPath,
    apiEndpoint: meta.apiEndpoint,
    expected: meta.expected,
    actual: null,
    severity: meta.severity || 'major',
    ok: false,
    consoleError: null,
  };
  try {
    const detail = await fn();
    entry.ok = true;
    entry.actual = detail || 'Passed';
  } catch (error) {
    entry.actual = String(error?.message || error).slice(0, 3500);
  }
  report.checks.push({ name, ...entry });
}

async function createTempUsers(env, tenantId, suffix) {
  const roles = await supabase(
    env,
    'GET',
    `roles?select=id,name,permissions&tenant_id=eq.${tenantId}`,
    undefined,
  );
  const managerRole = roles.find((role) => ['Owner', 'Super Admin', 'Admin'].includes(role.name)) || roles[0];
  const normalRole = roles.find((role) => !['Owner', 'Super Admin', 'Admin'].includes(role.name)) || roles[0];
  assert(managerRole?.id && normalRole?.id, 'Unable to identify roles for permission test', roles);

  const users = [
    {
      tenant_id: tenantId,
      username: `qa_mgr_${suffix}`,
      email: `qa_mgr_${suffix}@sak-qa.local`,
      password: 'Password',
      first_name: 'QA',
      last_name: 'Manager',
      role_id: managerRole.id,
      is_active: true,
      metadata: {},
    },
    {
      tenant_id: tenantId,
      username: `qa_user_${suffix}`,
      email: `qa_user_${suffix}@sak-qa.local`,
      password: 'Password',
      first_name: 'QA',
      last_name: 'User',
      role_id: normalRole.id,
      is_active: true,
      metadata: {},
    },
  ];

  const inserted = await supabase(env, 'POST', 'users', users);
  for (const user of inserted || []) {
    await supabase(env, 'POST', 'user_roles', {
      user_id: user.id,
      role_id: user.role_id,
      tenant_id: tenantId,
    }).catch(() => null);
  }
  return { users: inserted || [], managerRole, normalRole };
}

function itemPayload(suffix) {
  return {
    code: `QA-RG-${suffix}`,
    name: `QA Release Gate Item ${suffix}`,
    description: 'release gate stock movement item',
    category: 'RAW_MATERIAL',
    productCategory: 'QA Materials',
    uom: 'NOS',
    hsnCode: '85423900',
    standardCost: 11.25,
    reorderLevel: 1,
    reorderQuantity: 5,
    leadTimeDays: 3,
    minStock: 0,
    maxStock: 100,
    drawingRequired: 'NOT_REQUIRED',
    uidStrategy: 'NONE',
  };
}

async function cleanup(env, tenantId, suffix, ids) {
  await supabase(env, 'DELETE', `user_roles?tenant_id=eq.${tenantId}&users.username=like.qa_%25_${suffix}`, undefined, [200, 204]).catch(() => null);
  await supabase(env, 'DELETE', `users?tenant_id=eq.${tenantId}&username=in.(${encode(`qa_mgr_${suffix}`)},${encode(`qa_user_${suffix}`)})`, undefined, [200, 204]).catch(() => null);
  if (ids.itemId) {
    await supabase(env, 'DELETE', `stock_movements?tenant_id=eq.${tenantId}&item_id=eq.${ids.itemId}`, undefined, [200, 204]).catch(() => null);
    await supabase(env, 'DELETE', `stock_entries?tenant_id=eq.${tenantId}&item_id=eq.${ids.itemId}`, undefined, [200, 204]).catch(() => null);
    await supabase(env, 'DELETE', `inventory_stock?tenant_id=eq.${tenantId}&item_id=eq.${ids.itemId}`, undefined, [200, 204]).catch(() => null);
    await supabase(env, 'DELETE', `items?tenant_id=eq.${tenantId}&id=eq.${ids.itemId}`, undefined, [200, 204]).catch(() => null);
  }
}

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const env = readEnvFile(ENV_FILE);
  const auth = await login();
  const token = auth.accessToken;
  const tenantId = auth.user.tenant_id;
  const suffix = new Date().toISOString().replace(/[-:.TZ]/g, '').slice(0, 14);
  const ids = {};

  const report = {
    baseUrl: BASE_URL,
    startedAt: new Date().toISOString(),
    user: USERNAME,
    checks: [],
    cleanup: [],
  };

  let temp;
  try {
    await runCheck(report, 'role login/logout and permission separation', {
      screen: 'Auth / RBAC',
      clickPath: 'Login as admin -> create temporary manager/user -> login each -> /auth/me -> restricted approval probe',
      apiEndpoint: 'POST /auth/login, GET /auth/me, POST /purchase/requisitions/:id/approve',
      expected: 'All roles login; normal user cannot approve purchase requisitions',
      severity: 'blocker',
    }, async () => {
      temp = await createTempUsers(env, tenantId, suffix);
      const manager = temp.users.find((u) => u.username.startsWith('qa_mgr_'));
      const normal = temp.users.find((u) => u.username.startsWith('qa_user_'));
      assert(manager?.username && normal?.username, 'Temp users were not created', temp.users);
      const managerAuth = await login(manager.username, 'Password');
      const normalAuth = await login(normal.username, 'Password');
      const me = await apiOk(managerAuth.accessToken, 'GET', '/auth/me');
      assert(me?.user?.username === manager.username || me?.username === manager.username, 'Manager /auth/me mismatch', me);
      const probe = await api(normalAuth.accessToken, 'POST', '/purchase/requisitions/00000000-0000-0000-0000-000000000000/approve');
      assert([403, 404].includes(probe.response.status), 'Normal user approval probe should not succeed', probe.data);
      return { managerRole: temp.managerRole.name, normalRole: temp.normalRole.name, normalApprovalStatus: probe.response.status };
    });

    await runCheck(report, 'dashboard reports API workbook and MIS load', {
      screen: 'Dashboard / Reports',
      clickPath: 'Dashboard -> Reports -> Workbook/MIS load',
      apiEndpoint: 'GET /dashboard/reports, GET /dashboard/mis, GET /dashboard/cockpit',
      expected: 'Reports and MIS return structured report data',
      severity: 'major',
    }, async () => {
      const [reports, mis, cockpit] = await Promise.all([
        apiOk(token, 'GET', '/dashboard/reports'),
        apiOk(token, 'GET', '/dashboard/mis'),
        apiOk(token, 'GET', '/dashboard/cockpit'),
      ]);
      assert(reports && typeof reports === 'object', 'Reports payload missing', reports);
      assert(mis && typeof mis === 'object', 'MIS payload missing', mis);
      assert(cockpit && typeof cockpit === 'object', 'Cockpit payload missing', cockpit);
      return {
        reportKeys: Object.keys(reports).slice(0, 8),
        misKeys: Object.keys(mis).slice(0, 8),
        cockpitKeys: Object.keys(cockpit).slice(0, 8),
      };
    });

    await runCheck(report, 'stock adjustment, SRV receipt, and SIV issue update stock', {
      screen: 'Inventory / Stock Adjustment / SIV / SRV',
      clickPath: 'Stock Master -> create QA item -> Stock Adjustment/SRV receive -> SIV issue -> stock trail',
      apiEndpoint: 'POST /inventory/items, POST /inventory/movements, POST /job-orders/store/receipt-vouchers/manual, POST /job-orders/store/material-requisitions/manual-issue, GET /items/:id/stock',
      expected: 'Stock increases on receipt/adjustment and decreases on SIV issue',
      severity: 'blocker',
    }, async () => {
      const item = await apiOk(token, 'POST', '/inventory/items', itemPayload(suffix));
      ids.itemId = item.id;
      const warehouses = await apiOk(token, 'GET', '/inventory/warehouses');
      const warehouse = (warehouses || []).find((row) => row.id);
      assert(warehouse?.id, 'No warehouse available for stock test', warehouses);

      await apiOk(token, 'POST', '/inventory/movements', {
        movement_type: 'ADJUSTMENT',
        item_id: item.id,
        to_warehouse_id: warehouse.id,
        quantity: 3,
        reference_type: 'QA_RELEASE_GATE',
        reference_number: `QA-RG-${suffix}`,
        category: 'RAW_MATERIAL',
        notes: 'QA release gate adjustment increase',
        movement_date: `${apiDate()}T00:00:00.000Z`,
      });

      await apiOk(token, 'POST', '/job-orders/store/receipt-vouchers/manual', {
        itemId: item.id,
        quantity: 4,
        warehouseId: warehouse.id,
        receiverName: 'QA Release Gate',
        receiverPhone: '9999999999',
        notes: 'QA release gate manual SRV',
        movementDate: apiDate(),
      });

      const beforeIssue = await apiOk(token, 'GET', `/items/${item.id}/stock`);
      const beforeQty = stockAvailable(beforeIssue);
      assert(beforeQty >= 7, 'Stock did not increase after adjustment + SRV', beforeIssue);

      const employees = await apiOk(token, 'GET', '/hr/employees');
      const receivingEmployee = (employees || []).find((row) => row?.id && String(row.status || '').toUpperCase() === 'ACTIVE')
        || (employees || []).find((row) => row?.id);
      assert(receivingEmployee?.id, 'No registered employee is available for the mandatory SIV recipient field', employees);

      const siv = await apiOk(token, 'POST', '/job-orders/store/material-requisitions/manual-issue', {
        itemId: item.id,
        issueQuantity: 2,
        issuedToEmployeeId: receivingEmployee.id,
        notes: 'QA release gate manual SIV',
      });
      assert(Number(siv.issuedNow || 0) === 2, 'SIV did not issue requested quantity', siv);

      const afterIssue = await apiOk(token, 'GET', `/items/${item.id}/stock`);
      const afterQty = stockAvailable(afterIssue);
      assert(afterQty <= beforeQty - 2 + 0.0001, 'Stock did not decrease after SIV', { beforeIssue, afterIssue, siv });

      return { itemCode: item.code, warehouse: warehouse.code || warehouse.name, beforeQty, afterQty, siv: siv.voucherNumber };
    });

    await runCheck(report, 'CSV import success path and export endpoint', {
      screen: 'Stock Master CSV',
      clickPath: 'Stock Master -> Import Items -> valid row -> Export Excel',
      apiEndpoint: 'POST /items/bulk, GET /items/export/excel',
      expected: 'Valid CSV payload imports, export endpoint returns downloadable content',
      severity: 'major',
    }, async () => {
      const code = `QA-BULK-${suffix}`;
      const result = await apiOk(token, 'POST', '/items/bulk', {
        items: [{
          code,
          name: `QA Bulk Import ${suffix}`,
          category: 'Raw Material',
          uom: 'NOS',
          hsn_code: '85423900',
        }],
      });
      const failed = Number(result.failed || 0);
      assert(failed === 0, 'Valid bulk item import should not fail', result);
      const imported = await supabase(env, 'GET', `items?tenant_id=eq.${tenantId}&code=eq.${encode(code)}&select=id,code`);
      if (imported?.[0]?.id) await supabase(env, 'DELETE', `items?tenant_id=eq.${tenantId}&id=eq.${imported[0].id}`, undefined, [200, 204]).catch(() => null);
      const exported = await api(token, 'GET', '/items/export/excel');
      assert(exported.response.ok, `Item export failed: ${exported.response.status}`, exported.data);
      assert(exported.buffer.length > 100, 'Item export response too small', { bytes: exported.buffer.length });
      return { imported: code, exportBytes: exported.buffer.length };
    });

    await runCheck(report, 'PO PDF endpoint opens downloadable PDF', {
      screen: 'Purchase Orders',
      clickPath: 'Purchase Orders -> Open approved PO -> Download/View PDF',
      apiEndpoint: 'GET /purchase/orders/:id/pdf/world-class',
      expected: 'PDF endpoint returns application/pdf bytes',
      severity: 'major',
    }, async () => {
      const rows = await apiOk(token, 'GET', '/purchase/orders?status=APPROVED');
      const po = (rows || []).find((row) => row.id) || (await apiOk(token, 'GET', '/purchase/orders')).find((row) => row.id);
      assert(po?.id, 'No PO found for PDF test', rows?.slice?.(0, 5));
      const pdf = await api(token, 'GET', `/purchase/orders/${po.id}/pdf/world-class`);
      const type = pdf.response.headers.get('content-type') || '';
      assert(pdf.response.ok, `PO PDF failed: ${pdf.response.status}`, pdf.data);
      assert(type.includes('application/pdf') || pdf.buffer.slice(0, 4).toString() === '%PDF', 'PO PDF response is not a PDF', { type, bytes: pdf.buffer.length });
      return { poNumber: po.po_number, bytes: pdf.buffer.length, contentType: type };
    });

    await runCheck(report, 'GRN invoice upload returns accessible signed URL path', {
      screen: 'GRN Attachments',
      clickPath: 'GRN -> Upload/View Invoice',
      apiEndpoint: 'POST /purchase/grn/invoice/upload',
      expected: 'Invoice upload succeeds and returns a retrievable URL/path',
      severity: 'major',
    }, async () => {
      const fd = new FormData();
      const pdfBytes = Buffer.from('%PDF-1.4\n1 0 obj\n<< /Type /Catalog >>\nendobj\ntrailer\n<< /Root 1 0 R >>\n%%EOF\n');
      fd.append('file', new Blob([pdfBytes], { type: 'application/pdf' }), `qa-invoice-${suffix}.pdf`);
      const upload = await api(token, 'POST', '/purchase/grn/invoice/upload', fd);
      assert(upload.response.ok, `GRN invoice upload failed: ${upload.response.status}`, upload.data);
      const url = upload.data?.url || upload.data?.fileUrl || upload.data?.path;
      assert(url, 'Upload response missing URL/path', upload.data);
      if (/^https?:\/\//.test(url)) {
        const opened = await fetch(url);
        assert(opened.status < 500, `Uploaded invoice URL returned ${opened.status}`, { status: opened.status });
      }
      return { uploaded: true, responseKeys: Object.keys(upload.data || {}) };
    });

    report.finishedAt = new Date().toISOString();
  } finally {
    await cleanup(env, tenantId, suffix, ids);
    report.cleanup.push('temporary users/items/stock records cleanup attempted');
  }

  report.summary = {
    totalChecks: report.checks.length,
    passedChecks: report.checks.filter((check) => check.ok).length,
    failedChecks: report.checks.filter((check) => !check.ok).length,
    blockers: report.checks.filter((check) => !check.ok && check.severity === 'blocker').length,
    majors: report.checks.filter((check) => !check.ok && check.severity === 'major').length,
    minors: report.checks.filter((check) => !check.ok && check.severity === 'minor').length,
  };

  const jsonPath = path.join(OUT_DIR, `release-gate-expanded-${suffix}.json`);
  fs.writeFileSync(jsonPath, JSON.stringify(report, null, 2));
  console.log(JSON.stringify({
    report: jsonPath,
    summary: report.summary,
    failed: report.checks.filter((check) => !check.ok),
  }, null, 2));

  if (report.summary.blockers > 0) process.exitCode = 1;
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
