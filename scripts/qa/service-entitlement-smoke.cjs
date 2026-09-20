const baseUrl = process.env.SMOKE_BASE_URL || 'https://mizantra.saksolution.com';
const username = process.env.SMOKE_USER || 'hnoman';
const password = process.env.SMOKE_PASSWORD || 'Password';
const tag = `Service entitlement smoke ${Date.now()}`;

async function request(path, options = {}) {
  const response = await fetch(`${baseUrl}/api/v1${path}`, { ...options, headers: { authorization: `Bearer ${request.token}`, 'content-type': 'application/json', ...(options.headers || {}) } });
  const text = await response.text(); let body;
  try { body = text ? JSON.parse(text) : null; } catch { body = text; }
  if (!response.ok) throw new Error(`${options.method || 'GET'} ${path}: ${response.status} ${typeof body === 'string' ? body.slice(0, 400) : JSON.stringify(body).slice(0, 400)}`);
  return body;
}

(async () => {
  let asset; let contract; let ticket;
  const result = { baseUrl, tag, status: 'pending' };
  try {
    const login = await fetch(`${baseUrl}/api/v1/auth/login`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ username, password }) });
    const auth = await login.json();
    if (!login.ok || !auth.accessToken) throw new Error(`Login failed: ${login.status}`);
    request.token = auth.accessToken;
    const customers = await request('/sales/customers');
    if (!customers.length) throw new Error('Customer master is required');
    const customer = customers[0];
    asset = await request('/service/installed-assets', { method: 'POST', body: JSON.stringify({ customer_id: customer.id, asset_name: tag, uid: `QA-AST-${Date.now()}`, status: 'ACTIVE', installation_date: new Date().toISOString().slice(0, 10), location: 'QA test location' }) });
    contract = await request('/service/contracts', { method: 'POST', body: JSON.stringify({ customer_id: customer.id, contract_type: 'AMC', start_date: new Date().toISOString().slice(0, 10), end_date: new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10), status: 'ACTIVE', response_hours: 2, resolution_hours: 6, contract_value: 1000, tax_percentage: 18, asset_ids: [asset.id], notes: tag }) });
    const contracts = await request('/service/contracts');
    const hydrated = contracts.find((entry) => entry.id === contract.id);
    if (!hydrated || hydrated.contract_assets?.[0]?.asset_id !== asset.id) throw new Error('Contract/asset linkage was not returned');
    const openedAt = Date.now();
    ticket = await request('/service/tickets', { method: 'POST', body: JSON.stringify({ customer_id: customer.id, installed_asset_id: asset.id, service_contract_id: contract.id, priority: 'CRITICAL', complaint_description: tag, reported_by: 'Automated QA' }) });
    if (ticket.entitlement_status !== 'CONTRACT' || ticket.service_contract_id !== contract.id || ticket.installed_asset_id !== asset.id) throw new Error('Ticket entitlement was not frozen correctly');
    const mutationAttempt = await fetch(`${baseUrl}/api/v1/service/contracts/${contract.id}`, { method: 'PUT', headers: { authorization: `Bearer ${request.token}`, 'content-type': 'application/json' }, body: JSON.stringify({ response_hours: 99 }) });
    if (mutationAttempt.status !== 400) throw new Error(`Used contract terms were not frozen (HTTP ${mutationAttempt.status})`);
    const responseHours = (new Date(ticket.response_due_at).getTime() - openedAt) / 3600000;
    const resolutionHours = (new Date(ticket.resolution_due_at).getTime() - openedAt) / 3600000;
    if (Math.abs(responseHours - 2) > 0.05 || Math.abs(resolutionHours - 6) > 0.05) throw new Error(`Contract SLA was not applied: ${responseHours}/${resolutionHours}`);
    result.status = 'passed'; result.asset = asset.asset_number; result.contract = contract.contract_number; result.ticket = ticket.ticket_number; result.contractTermsFrozen = true; result.sla = { responseHours, resolutionHours };
  } catch (error) { result.status = 'failed'; result.error = error.message; process.exitCode = 1; }
  finally {
    const cleanup = {};
    try { if (ticket?.id) { await request(`/service/tickets/${ticket.id}`, { method: 'DELETE' }); cleanup.ticket = 'deleted'; } } catch (error) { cleanup.ticket = error.message; }
    try { if (contract?.id) { await request(`/service/contracts/${contract.id}`, { method: 'PUT', body: JSON.stringify({ status: 'DRAFT' }) }); await request(`/service/contracts/${contract.id}`, { method: 'DELETE' }); cleanup.contract = 'deleted'; } } catch (error) { cleanup.contract = error.message; }
    try { if (asset?.id) { await request(`/service/installed-assets/${asset.id}`, { method: 'DELETE' }); cleanup.asset = 'deleted'; } } catch (error) { cleanup.asset = error.message; }
    result.cleanup = cleanup; console.log(JSON.stringify(result, null, 2));
  }
})();
