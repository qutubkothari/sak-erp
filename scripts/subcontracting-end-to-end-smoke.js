/**
 * Subcontracting smoke checker
 * - validates API health
 * - validates availability of required seed data
 * - creates a sample route + order (linear + branch)
 * - issues and receives steps
 * - exits with clear guidance when environment is missing schema
 */

const BASE_URL = process.env.SUBCONTRACTING_SMOKE_BASE_URL || 'https://pmstest.saksolution.com';
const USERNAME = process.env.SUBCONTRACTING_SMOKE_USER || 'hnoman';
const PASSWORD = process.env.SUBCONTRACTING_SMOKE_PASSWORD || 'Password';

const headers = (token) => ({
  'Content-Type': 'application/json',
  ...(token ? { Authorization: `Bearer ${token}` } : {}),
});

async function api(method, path, token, body) {
  const response = await fetch(`${BASE_URL}/api/v1${path}`, {
    method,
    headers: headers(token),
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  const raw = await response.text();
  let parsed = {};
  try {
    parsed = raw ? JSON.parse(raw) : {};
  } catch {
    parsed = { raw };
  }

  return { response, data: parsed };
}

async function login() {
  const { response, data } = await api('POST', '/auth/login', null, {
    username: USERNAME,
    password: PASSWORD,
  });
  if (!response.ok) {
    throw new Error(`Login failed (${response.status})`);
  }
  return data?.accessToken || data?.data?.accessToken;
}

function norm(arr) {
  return Array.isArray(arr) ? arr : arr?.data || [];
}

function pickBy(cond, list, fallback = null) {
  const item = list.find(cond);
  return item || fallback;
}

function fail(message) {
  console.error(`[SUBCONTRACTING_SMOKE][FAIL] ${message}`);
  process.exitCode = 1;
}

async function main() {
  const token = await login();
  console.log('Login successful');

  const [wareResp, vendorResp, itemResp, routeListResp] = await Promise.all([
    api('GET', '/inventory/warehouses', token),
    api('GET', '/purchase/vendors?isActive=true', token),
    api('GET', '/items?limit=200', token),
    api('GET', '/production/subcontracting/routes?limit=5', token),
  ]);

  const warehouses = norm(wareResp.data);
  const vendors = norm(vendorResp.data);
  const items = norm(itemResp.data);

  console.log('Warehouses:', Array.isArray(warehouses) ? warehouses.length : 0);
  console.log('Vendors:', Array.isArray(vendors) ? vendors.length : 0);
  console.log('Items:', Array.isArray(items) ? items.length : 0);
  console.log('Routes page:', routeListResp.status, routeListResp.data?.length || 'ok');

  if (!Array.isArray(items) || !items.length) {
    fail('No items returned; aborting smoke.');
    return;
  }
  if (!Array.isArray(vendors) || !vendors.length) {
    fail('No vendors returned; aborting smoke.');
    return;
  }

  // Keep the test small and select material that can genuinely be issued from
  // the source warehouse. This avoids treating a blocked/insufficient item as
  // an application defect.
  const raw = pickBy((i) => i.type === 'RAW_MATERIAL' && Number(i.available_quantity || i.current_stock || 0) >= 10 && i.is_active, items);
  const sub = pickBy((i) => i.is_active && (i.type === 'SUB_ASSEMBLY' || i.type === 'FINISHED_GOODS'), items);
  const mainWh = pickBy((w) => (w?.code || '').toUpperCase() === 'MAIN_WAREHOUSE', warehouses) || warehouses[0];

  if (!raw || !sub || !mainWh) {
    fail('Missing required seed data (raw item, output item, or warehouse).');
    return;
  }

  const vendor = vendors[0];
  const testQty = Math.min(10, Number(raw.available_quantity || raw.current_stock || 10));
  const branchQty = testQty / 2;
  const routePayload = {
    route_number: `SMOKE-${Date.now()}`,
    name: 'Smoke Tree Route',
    input_item_id: raw.id,
    output_item_id: sub.id,
    default_input_qty: testQty,
    default_output_qty: testQty,
    uom: 'PCS',
    notes: 'Automated smoke route',
    steps: [
      {
        sequence_no: 1,
        operation_name: 'Anodize + split',
        node_key: 'A',
        parent_node_key: '',
        vendor_id: vendor.id,
        process_type: 'ANODIZING',
        input_item_id: raw.id,
        output_item_id: sub.id,
        default_input_qty: testQty,
        default_output_qty: testQty,
        standard_yield_pct: 100,
      },
      {
        sequence_no: 2,
        operation_name: 'Branch-1',
        node_key: 'B',
        parent_node_key: 'A',
        vendor_id: vendor.id,
        process_type: 'THREADING',
        input_item_id: sub.id,
        output_item_id: sub.id,
        default_input_qty: branchQty,
        default_output_qty: branchQty,
        standard_yield_pct: 95,
      },
      {
        sequence_no: 3,
        operation_name: 'Branch-2',
        node_key: 'C',
        parent_node_key: 'A',
        vendor_id: vendor.id,
        process_type: 'THREADING',
        input_item_id: sub.id,
        output_item_id: sub.id,
        default_input_qty: branchQty,
        default_output_qty: branchQty,
        standard_yield_pct: 95,
      },
    ],
  };

  const createRoute = await api('POST', '/production/subcontracting/routes', token, routePayload);
  if (!createRoute.response.ok) {
    if (createRoute.data?.message?.includes('Subcontracting schema')) {
      fail('Schema missing: run /migrate/subcontracting-tables on this environment, then rerun smoke.');
    } else {
      fail(`Route create failed (${createRoute.response.status}): ${JSON.stringify(createRoute.data)}`);
    }
    return;
  }

  const orderPayload = {
    route_id: createRoute.data.id,
    planned_input_qty: testQty,
    source_warehouse_id: mainWh.id,
    output_warehouse_id: mainWh.id,
    notes: 'Automated smoke order',
  };

  const createOrder = await api('POST', '/production/subcontracting/orders', token, orderPayload);
  if (!createOrder.response.ok) {
    fail(`Order create failed (${createOrder.response.status}): ${JSON.stringify(createOrder.data)}`);
    return;
  }

  const order = createOrder.data;
  const rootStep = (order.steps || []).find((s) => s.sequence_no === 1);
  if (!rootStep) {
    fail('Order returned without root step.');
    return;
  }

  const issueRoot = await api(
    'POST',
    `/production/subcontracting/orders/${order.id}/steps/${rootStep.id}/issue`,
    token,
    { quantity: testQty }
  );
  if (!issueRoot.response.ok) {
    fail(`Root issue failed (${issueRoot.response.status}): ${JSON.stringify(issueRoot.data)}`);
    return;
  }

  const receiveRoot = await api(
    'POST',
    `/production/subcontracting/orders/${order.id}/steps/${rootStep.id}/receive`,
    token,
    {
      accepted_qty: testQty,
      rejected_qty: 0,
      scrap_qty: 0,
      unused_return_qty: 0,
      consumed_qty: testQty,
      processing_rate: 12,
      tax_percent: 18,
      output_item_id: sub.id,
    }
  );
  if (!receiveRoot.response.ok) {
    fail(`Root receive failed (${receiveRoot.response.status}): ${JSON.stringify(receiveRoot.data)}`);
    return;
  }

  const childSteps = (order.steps || []).filter((s) => s.sequence_no > 1);
  for (const step of childSteps) {
    const issue = await api(
      'POST',
      `/production/subcontracting/orders/${order.id}/steps/${step.id}/issue`,
      token,
      { quantity: branchQty }
    );
    if (!issue.response.ok) {
      fail(`Child issue failed (${step.operation_name}): ${JSON.stringify(issue.data)}`);
      return;
    }

    const receive = await api(
      'POST',
      `/production/subcontracting/orders/${order.id}/steps/${step.id}/receive`,
      token,
      {
        accepted_qty: branchQty,
        rejected_qty: 0,
        scrap_qty: 0,
        unused_return_qty: 0,
        consumed_qty: branchQty,
        processing_rate: 8,
        tax_percent: 18,
        output_item_id: sub.id,
      }
    );
    if (!receive.response.ok) {
      fail(`Child receive failed (${step.operation_name}): ${JSON.stringify(receive.data)}`);
      return;
    }
  }

  const finalOrder = await api('GET', `/production/subcontracting/orders/${order.id}`, token);
  const finalStatus = finalOrder.data?.status || 'UNKNOWN';
  const finalSteps = Array.isArray(finalOrder.data?.steps)
    ? finalOrder.data.steps.map((s) => `${s.sequence_no}:${s.status}`).join(' | ')
    : '';
  console.log('Smoke final status:', finalStatus);
  console.log('Smoke final steps:', finalSteps);

  const finance = await api('GET', '/production/subcontracting/finance', token);
  console.log('Finance entries:', Array.isArray(finance.data) ? finance.data.length : 0);

  console.log('[SUBCONTRACTING_SMOKE][PASS] Subcontracting API smoke completed.');
}

main().catch((error) => {
  fail(error.message || String(error));
});
