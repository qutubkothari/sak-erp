const fs = require('fs');
const path = require('path');

const BASE_URL = process.env.QA_BASE_URL || 'https://mizantra.saksolution.com';
const USERNAME = process.env.QA_USERNAME || 'hnoman';
const PASSWORD = process.env.QA_PASSWORD || 'Password';
const OUT_DIR = process.env.QA_OUT_DIR || path.join(process.cwd(), 'qa-results');

function assert(condition, message, detail) {
  if (!condition) {
    throw new Error(`${message}${detail === undefined ? '' : `\n${JSON.stringify(detail, null, 2)}`}`);
  }
}

function today(offsetDays = 0) {
  const date = new Date();
  date.setDate(date.getDate() + offsetDays);
  return date.toISOString().slice(0, 10);
}

async function login() {
  const response = await fetch(`${BASE_URL}/api/v1/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: USERNAME, password: PASSWORD }),
  });
  const text = await response.text();
  const data = text ? JSON.parse(text) : null;
  assert(response.ok, `Login failed: ${response.status}`, data);
  assert(data?.accessToken, 'Login response missing access token', data);
  return data;
}

async function api(token, method, endpoint, body) {
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
  return { response, data };
}

async function apiOk(token, method, endpoint, body) {
  const { response, data } = await api(token, method, endpoint, body);
  assert(response.ok, `${method} ${endpoint} failed: ${response.status}`, data);
  return data;
}

async function runCheck(report, name, fn) {
  const entry = { name, ok: false, error: null, detail: null };
  try {
    const detail = await fn();
    entry.ok = true;
    entry.detail = detail ?? null;
  } catch (error) {
    entry.error = String(error?.message || error).slice(0, 3000);
  }
  report.checks.push(entry);
}

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const auth = await login();
  const token = auth.accessToken;
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const report = {
    baseUrl: BASE_URL,
    username: USERNAME,
    startedAt: new Date().toISOString(),
    checks: [],
  };

  await runCheck(report, 'multi-word item search returns motor mount records', async () => {
    const rows = await apiOk(token, 'GET', '/items/search?q=motor%20mount');
    assert(Array.isArray(rows), 'Item search did not return an array', rows);
    const match = rows.find((row) => `${row.item_name || row.name || ''} ${row.item_code || row.code || ''}`.toLowerCase().includes('motor') &&
      `${row.item_name || row.name || ''} ${row.item_code || row.code || ''}`.toLowerCase().includes('mount'));
    assert(match, 'No motor mount result found for multi-word search', rows.slice(0, 5));
    return { count: rows.length, sample: match.item_name || match.name || match.item_code || match.code };
  });

  await runCheck(report, 'CSV/item bulk validation returns render-safe string errors', async () => {
    const result = await apiOk(token, 'POST', '/items/bulk', {
      items: [
        {
          code: `QA-BAD-HSN-${stamp.slice(0, 12)}`,
          name: 'QA Invalid HSN Probe',
          category: 'Raw Material',
          uom: 'NUMBER',
          hsn_code: 'BAD-HSN',
        },
      ],
    });
    assert(Number(result.failed || 0) === 1, 'Invalid HSN row should fail validation', result);
    assert(Array.isArray(result.errors), 'Bulk import response missing errors array', result);
    assert(result.errors.every((entry) => typeof entry === 'string'), 'Bulk import errors must be strings for React rendering', result);
    return { errors: result.errors };
  });

  await runCheck(report, 'PR create rejects backdated required date', async () => {
    const items = await apiOk(token, 'GET', '/items/search?q=motor%20mount');
    const item = items.find((row) => row.id);
    assert(item?.id, 'No item available for PR backdate validation', items.slice(0, 3));
    const vendors = await apiOk(token, 'GET', '/purchase/vendors?isActive=true');
    const vendor = vendors.find((row) => row.id && row.is_verified !== false) || vendors[0];
    assert(vendor?.id, 'No vendor available for PR backdate validation', vendors.slice(0, 3));

    const { response, data } = await api(token, 'POST', '/purchase/requisitions', {
      requestDate: today(),
      requiredDate: today(-1),
      department: 'PRODUCTION',
      purpose: 'QA backdate rejection probe',
      priority: 'MEDIUM',
      status: 'DRAFT',
      items: [
        {
          itemId: item.id,
          itemCode: item.item_code || item.code,
          itemName: item.item_name || item.name,
          vendorId: vendor.id,
          uom: item.uom || 'NUMBER',
          requestedQty: 1,
          estimatedRate: 1,
          requiredDate: today(-1),
        },
      ],
    });
    assert(response.status >= 400, 'Backdated PR should be rejected', data);
    assert(/date|back|current|future/i.test(JSON.stringify(data)), 'Backdate rejection should explain date problem', data);
    return { status: response.status, message: data?.message || data };
  });

  await runCheck(report, 'linked PR delete is blocked with business reason', async () => {
    const list = await apiOk(token, 'GET', '/purchase/requisitions');
    const pr = list.find((row) => row.pr_number === 'PR-2026-07-009') || list.find((row) => Number(row.rfq_summary?.sentCount || 0) > 0 || Number(row.po_count || 0) > 0);
    assert(pr?.id, 'No linked PR found to validate delete restriction', list.slice(0, 5));
    const { response, data } = await api(token, 'DELETE', `/purchase/requisitions/${pr.id}`);
    assert(response.status >= 400, 'Linked PR delete should be blocked', data);
    assert(/cannot be deleted|linked|RFQ|PO|GRN|receipt|AP/i.test(JSON.stringify(data)), 'Linked delete response should include reason/trail reference', data);
    return { prNumber: pr.pr_number, status: response.status, message: data?.message || data };
  });

  await runCheck(report, 'RFQ trail endpoint exposes vendors and line response structure', async () => {
    const list = await apiOk(token, 'GET', '/purchase/requisitions');
    const pr = list.find((row) => row.pr_number === 'PR-2026-07-009') || list.find((row) => Number(row.rfq_summary?.sentCount || 0) > 0);
    assert(pr?.id, 'No PR with RFQ trail found', list.slice(0, 5));
    const rows = await apiOk(token, 'GET', `/purchase/requisitions/${pr.id}/rfqs`);
    assert(Array.isArray(rows), 'RFQ trail endpoint did not return an array', rows);
    assert(rows.length > 0, 'RFQ trail should contain at least one vendor record', { pr: pr.pr_number, rows });
    const first = rows[0];
    assert(first.rfq_number && (first.vendor || first.vendor_id || first.recipient_email), 'RFQ trail row missing vendor identity', first);
    assert(Array.isArray(first.rfq_items), 'RFQ trail row missing rfq_items array', first);
    return { prNumber: pr.pr_number, rfqCount: rows.length, firstRfq: first.rfq_number };
  });

  report.finishedAt = new Date().toISOString();
  report.summary = {
    totalChecks: report.checks.length,
    passedChecks: report.checks.filter((check) => check.ok).length,
    failedChecks: report.checks.filter((check) => !check.ok).length,
  };
  const jsonPath = path.join(OUT_DIR, `release-gate-targeted-${stamp}.json`);
  fs.writeFileSync(jsonPath, JSON.stringify(report, null, 2));
  console.log(JSON.stringify({ report: jsonPath, summary: report.summary, failedChecks: report.checks.filter((check) => !check.ok) }, null, 2));
  if (report.summary.failedChecks > 0) process.exitCode = 1;
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
