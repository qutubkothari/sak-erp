const BASE = process.env.QA_BASE_URL || 'https://mizantra.saksolution.com';
if (!/^https:\/\/mizantra\.saksolution\.com\/?$/i.test(BASE)) {
  throw new Error('Refusing to run outside Mizantra TEST.');
}

function assert(value, message, details) {
  if (!value) throw new Error(`${message}${details === undefined ? '' : `\n${JSON.stringify(details, null, 2)}`}`);
}

async function jsonRequest(path, options = {}) {
  const response = await fetch(`${BASE}${path}`, options);
  const text = await response.text();
  let data;
  try { data = text ? JSON.parse(text) : null; } catch { data = text; }
  return { response, data };
}

(async () => {
  const login = await jsonRequest('/api/v1/auth/login', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      username: process.env.QA_USERNAME || 'hnoman',
      password: process.env.QA_PASSWORD || 'Password',
    }),
  });
  assert(login.response.ok && login.data?.accessToken, 'Mizantra TEST login failed.', login.data);
  const headers = { authorization: `Bearer ${login.data.accessToken}`, 'content-type': 'application/json' };

  const demand = await jsonRequest('/api/v1/production-planning/sales-orders', { headers });
  assert(demand.response.ok && Array.isArray(demand.data), 'Sales-order demand endpoint failed.', demand.data);
  const lines = demand.data.flatMap((order) => Array.isArray(order.lines) ? order.lines : []);
  assert(lines.every((line) =>
    Object.hasOwn(line, 'open_quantity') &&
    Object.hasOwn(line, 'due_date') &&
    Object.hasOwn(line, 'eligible') &&
    Object.hasOwn(line, 'blocked_reason') &&
    Object.hasOwn(line, 'linked_program') &&
    Object.hasOwn(line, 'item')
  ), 'Sales-order line eligibility contract is incomplete.', lines[0]);

  const dashboard = await jsonRequest('/api/v1/production-planning/dashboard', { headers });
  assert(dashboard.response.ok && Array.isArray(dashboard.data?.programs), 'Planning dashboard failed.', dashboard.data);
  assert(dashboard.data.programs.every((program) => Object.hasOwn(program, 'demand_source')), 'Existing programs lack the MANUAL default.', dashboard.data.programs[0]);

  const invalid = await jsonRequest('/api/v1/production-planning/programs', {
    method: 'POST',
    headers,
    body: JSON.stringify({ demand_source: 'SALES_ORDER' }),
  });
  assert(invalid.response.status === 400, 'Missing Sales Order IDs were not rejected server-side.', invalid.data);

  const page = await fetch(`${BASE}/dashboard/production/smart-planning`);
  assert(page.ok, `Smart Planning page returned ${page.status}.`);

  console.log(JSON.stringify({
    pass: true,
    environment: 'MIZANTRA TEST ONLY',
    sales_orders: demand.data.length,
    sales_order_lines: lines.length,
    eligible_lines: lines.filter((line) => line.eligible).length,
    blocked_lines: lines.filter((line) => !line.eligible).length,
    existing_programs: dashboard.data.programs.length,
    missing_source_ids_rejected: true,
    page_status: page.status,
  }, null, 2));
})().catch((error) => {
  console.error(error.stack || error);
  process.exit(1);
});
