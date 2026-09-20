const BASE = process.env.QA_BASE_URL || 'https://mizantra.saksolution.com';
const USERNAME = process.env.QA_USERNAME || 'qa_roi_finance';
const PASSWORD = process.env.QA_PASSWORD;

if (!/^https:\/\/mizantra\.saksolution\.com\/?$/i.test(BASE)) {
  throw new Error('Refusing to run outside the Mizantra test environment.');
}
if (!PASSWORD) throw new Error('QA_PASSWORD is required.');

function assert(value, message, detail) {
  if (!value) throw new Error(`${message}${detail === undefined ? '' : `\n${JSON.stringify(detail, null, 2)}`}`);
}

async function request(method, path, token, body, expected = [200, 201]) {
  const response = await fetch(`${BASE}/api/v1${path}`, {
    method,
    headers: {
      ...(token ? { authorization: `Bearer ${token}` } : {}),
      ...(body === undefined ? {} : { 'content-type': 'application/json' }),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await response.text();
  let data;
  try { data = text ? JSON.parse(text) : null; } catch { data = text; }
  assert(expected.includes(response.status), `${method} ${path} returned ${response.status}`, data);
  return data;
}

(async () => {
  const login = await request('POST', '/auth/login', null, { username: USERNAME, password: PASSWORD });
  assert(login.accessToken, 'Login did not return an access token.');
  const token = login.accessToken;

  const inventoryResponse = await request('GET', '/inventory/items', token);
  const inventoryItems = Array.isArray(inventoryResponse)
    ? inventoryResponse
    : (inventoryResponse?.data || inventoryResponse?.items || []);
  assert(Array.isArray(inventoryItems) && inventoryItems.length > 0, 'Raw-material selector has no inventory items.', inventoryResponse);

  const subcontractOrders = await request('GET', '/production/subcontracting/orders', token);
  assert(Array.isArray(subcontractOrders), 'Subcontract order list failed to load.', subcontractOrders);

  const tools = await request('GET', '/intelligence/tools', token);
  const toolList = Array.isArray(tools) ? tools : tools.tools;
  assert(Array.isArray(toolList) && toolList.length === 13, 'Expected exactly thirteen governed tools.', tools);
  for (const code of ['CREATE_PURCHASE_ORDER_DRAFT','APPLY_SALES_ORDER_HOLD','CREATE_QUALITY_CONTAINMENT','CREATE_BANK_RECONCILIATION_REVIEW']) {
    assert(toolList.some((tool) => tool.code === code), `Governed tool ${code} is unavailable.`, toolList);
  }

  const documentIntakes = await request('GET', '/intelligence/document-intakes', token);
  assert(Array.isArray(documentIntakes), 'Document-intelligence queue failed to load.', documentIntakes);

  const observability = await request('GET', '/intelligence/observability', token);
  assert(observability && typeof observability === 'object', 'Observability response is missing.', observability);

  const report = await request('POST', '/intelligence/reports/query', token, {
    question: 'Show the purchase and supplier trend for the last week and explain any supported root cause.',
  });
  assert(report && typeof report === 'object', 'Natural-language report response is missing.', report);

  const brief = await request('GET', '/intelligence/root-cause-brief?period=WEEK', token);
  assert(brief && typeof brief === 'object', 'Historical root-cause brief response is missing.', brief);

  const stamp = new Date().toISOString().replace(/\D/g, '').slice(0, 14);
  const onboarding = await request('POST', '/intelligence/onboarding/analyse', token, {
    dataset_type: 'CUSTOMERS',
    source_name: `MIZANTRA2-QA-${stamp}`,
    rows: [{ 'Customer Code': `M2QA-${stamp}`, 'Customer Name': 'Mizantra 2 Test Customer', TRN: '100000000000001' }],
  });
  assert(onboarding.summary?.total === 1, 'Onboarding analysis did not stage exactly one row.', onboarding);

  const graphRefresh = await request('POST', '/intelligence/knowledge-graph/refresh', token);
  assert(graphRefresh && typeof graphRefresh === 'object', 'Knowledge graph refresh response is missing.', graphRefresh);
  const graph = await request('GET', '/intelligence/knowledge-graph?limit=20', token);
  assert(Array.isArray(graph.nodes) && Array.isArray(graph.edges), 'Knowledge graph response is invalid.', graph);

  const agents = await request('GET', '/intelligence/agents', token);
  assert(agents.safety?.execution_mode === 'PROPOSE_ONLY', 'Agent execution mode is not PROPOSE_ONLY.', agents.safety);
  assert(agents.safety?.external_delivery === false, 'External delivery must remain disabled.', agents.safety);

  console.log(JSON.stringify({
    result: 'PASS',
    raw_material_options: inventoryItems.length,
    subcontract_orders: subcontractOrders.length,
    governed_tools: toolList.length,
    document_intakes: documentIntakes.length,
    onboarding_batch: onboarding.batch?.id,
    graph_nodes_sampled: graph.nodes.length,
    graph_edges_sampled: graph.edges.length,
    agent_mode: agents.safety.execution_mode,
    external_delivery: agents.safety.external_delivery,
  }, null, 2));
})().catch((error) => {
  console.error(error.stack || error.message || error);
  process.exit(1);
});
