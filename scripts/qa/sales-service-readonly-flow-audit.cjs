const baseUrl = process.env.QA_BASE_URL || 'https://mizantra.saksolution.com';
const username = process.env.QA_USERNAME || 'hnoman';
const password = process.env.QA_PASSWORD || 'Password';
const maxDocuments = Math.max(1, Number(process.env.QA_MAX_DOCUMENTS || 50));

function rows(value) {
  if (Array.isArray(value)) return value;
  for (const key of ['data', 'items', 'results', 'records']) {
    if (Array.isArray(value?.[key])) return value[key];
  }
  return [];
}

async function request(path) {
  const started = Date.now();
  const response = await fetch(`${baseUrl}/api/v1${path}`, {
    headers: { authorization: `Bearer ${request.token}` },
  });
  const text = await response.text();
  let body;
  try { body = text ? JSON.parse(text) : null; } catch { body = text; }
  if (!response.ok) {
    throw new Error(`GET ${path}: ${response.status} ${String(text).slice(0, 240)}`);
  }
  request.timings.push({ path, status: response.status, ms: Date.now() - started });
  return body;
}
request.timings = [];

function assert(condition, message, failures) {
  if (!condition) failures.push(message);
}

function idSet(list) {
  return new Set(list.map((entry) => String(entry?.id || '')).filter(Boolean));
}

async function authenticate() {
  const response = await fetch(`${baseUrl}/api/v1/auth/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });
  const body = await response.json();
  if (!response.ok || !body.accessToken) throw new Error(`Login failed: ${response.status}`);
  request.token = body.accessToken;
}

async function main() {
  await authenticate();
  const failures = [];

  const [ordersResult, dispatchResult, invoicesResult, ticketsResult, serviceInvoicesResult] = await Promise.all([
    request('/sales/orders'),
    request('/sales/dispatch'),
    request('/sales/invoices'),
    request('/service/tickets'),
    request('/service/customer-invoices'),
  ]);

  const orders = rows(ordersResult);
  const dispatches = rows(dispatchResult);
  const invoices = rows(invoicesResult);
  const tickets = rows(ticketsResult);
  const serviceInvoices = rows(serviceInvoicesResult);
  const orderIds = idSet(orders);
  const dispatchIds = idSet(dispatches);
  const ticketIds = idSet(tickets);

  for (const dispatch of dispatches) {
    assert(orderIds.has(String(dispatch?.sales_order_id || '')), `Dispatch ${dispatch?.dn_number || dispatch?.id} has no listed source sales order`, failures);
  }
  for (const invoice of invoices) {
    if (invoice?.sales_order_id) {
      assert(orderIds.has(String(invoice.sales_order_id)), `Invoice ${invoice?.invoice_number || invoice?.id} has no listed source sales order`, failures);
    }
    if (invoice?.dispatch_note_id) {
      assert(dispatchIds.has(String(invoice.dispatch_note_id)), `Invoice ${invoice?.invoice_number || invoice?.id} has no listed dispatch`, failures);
    }
    if (String(invoice?.billing_status || '').toUpperCase() !== 'CANCELLED') {
      const net = Number(invoice?.net_amount || 0);
      const paid = Number(invoice?.paid_amount || 0);
      const balance = Number(invoice?.balance_amount || 0);
      assert(Math.abs(paid + balance - net) <= 0.02, `Invoice ${invoice?.invoice_number || invoice?.id} financial balance is inconsistent`, failures);
    }
  }

  let salesFlowsChecked = 0;
  for (const order of orders.slice(0, maxDocuments)) {
    const id = String(order?.id || '');
    if (!id) continue;
    const [detail, flow] = await Promise.all([
      request(`/sales/orders/${encodeURIComponent(id)}`),
      request(`/sales/orders/${encodeURIComponent(id)}/document-flow`),
    ]);
    assert(String(detail?.id || '') === id, `Sales order ${order?.so_number || id} detail returned a different document`, failures);
    assert(String(flow?.sales_order?.id || '') === id, `Sales order ${order?.so_number || id} document flow has the wrong source`, failures);
    assert(Array.isArray(flow?.dispatches), `Sales order ${order?.so_number || id} flow is missing dispatches`, failures);
    assert(Array.isArray(flow?.invoices), `Sales order ${order?.so_number || id} flow is missing invoices`, failures);
    for (const flowDispatch of rows(flow?.dispatches)) {
      assert(String(flowDispatch?.sales_order_id || '') === id, `Sales order ${order?.so_number || id} flow contains an unrelated dispatch`, failures);
    }
    salesFlowsChecked += 1;
  }

  for (const invoice of serviceInvoices) {
    if (invoice?.service_ticket_id) {
      assert(ticketIds.has(String(invoice.service_ticket_id)), `Service invoice ${invoice?.invoice_number || invoice?.id} has no listed ticket`, failures);
    }
    if (String(invoice?.billing_status || '').toUpperCase() !== 'CANCELLED') {
      const net = Number(invoice?.net_amount || 0);
      const paid = Number(invoice?.paid_amount || 0);
      const balance = Number(invoice?.balance_amount || 0);
      assert(Math.abs(paid + balance - net) <= 0.02, `Service invoice ${invoice?.invoice_number || invoice?.id} financial balance is inconsistent`, failures);
    }
  }

  let serviceFlowsChecked = 0;
  for (const ticket of tickets.slice(0, maxDocuments)) {
    const id = String(ticket?.id || '');
    if (!id) continue;
    const [detail, confirmationsResult, flow] = await Promise.all([
      request(`/service/tickets/${encodeURIComponent(id)}`),
      request(`/service/tickets/${encodeURIComponent(id)}/confirmations`),
      request(`/service/tickets/${encodeURIComponent(id)}/document-flow`),
    ]);
    assert(String(detail?.id || '') === id, `Service ticket ${ticket?.ticket_number || id} detail returned a different document`, failures);
    assert(String(flow?.ticket?.id || flow?.service_ticket?.id || '') === id, `Service ticket ${ticket?.ticket_number || id} document flow has the wrong source`, failures);
    assert(Array.isArray(flow?.confirmations), `Service ticket ${ticket?.ticket_number || id} flow is missing confirmations`, failures);
    assert(Array.isArray(flow?.invoices), `Service ticket ${ticket?.ticket_number || id} flow is missing invoices`, failures);
    const confirmationIds = idSet(rows(confirmationsResult));
    for (const confirmation of rows(flow?.confirmations)) {
      assert(confirmationIds.has(String(confirmation?.id || '')), `Service ticket ${ticket?.ticket_number || id} flow contains an unrelated confirmation`, failures);
    }
    serviceFlowsChecked += 1;
  }

  const slowest = [...request.timings].sort((a, b) => b.ms - a.ms).slice(0, 10);
  const report = {
    baseUrl,
    status: failures.length ? 'failed' : 'passed',
    counts: {
      salesOrders: orders.length,
      salesDispatches: dispatches.length,
      salesInvoices: invoices.length,
      serviceTickets: tickets.length,
      serviceInvoices: serviceInvoices.length,
      salesFlowsChecked,
      serviceFlowsChecked,
      requests: request.timings.length,
    },
    slowestRequests: slowest,
    failures,
  };
  console.log(JSON.stringify(report, null, 2));
  if (failures.length) process.exitCode = 1;
}

main().catch((error) => {
  console.log(JSON.stringify({ baseUrl, status: 'failed', failures: [error.message] }, null, 2));
  process.exit(1);
});
