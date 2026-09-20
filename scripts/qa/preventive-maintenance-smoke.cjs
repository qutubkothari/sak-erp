const baseUrl = process.env.QA_BASE_URL || 'https://mizantra.saksolution.com';
const username = process.env.QA_USERNAME || 'hnoman';
const password = process.env.QA_PASSWORD || 'Password';

async function call(method, path, token, body) {
  const response = await fetch(`${baseUrl}/api/v1${path}`, {
    method,
    headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
    body: body == null ? undefined : JSON.stringify(body),
  });
  const text = await response.text();
  let data; try { data = text ? JSON.parse(text) : null; } catch { data = text; }
  if (!response.ok) throw new Error(`${method} ${path}: ${response.status} ${text.slice(0, 500)}`);
  return data;
}

async function main() {
  const login = await call('POST', '/auth/login', '', { username, password });
  const token = login.accessToken;
  const customers = await call('GET', '/sales/customers', token);
  if (!customers.length) throw new Error('No customer is available for the PM smoke test');
  const marker = Date.now();
  let schedule; let ticket;
  try {
    schedule = await call('POST', '/service/maintenance-schedules', token, {
      customer_id: customers[0].id, uid: `PM-SMOKE-${marker}`,
      schedule_name: `PM Smoke ${marker}`, frequency_days: 90,
      next_service_date: new Date().toISOString().slice(0, 10), notify_before_days: 7,
      service_checklist: 'Inspect, test and document readings', is_active: true,
    });
    if (schedule.maintenance_status !== 'DUE') throw new Error(`Expected DUE, received ${schedule.maintenance_status}`);
    ticket = await call('POST', `/service/maintenance-schedules/${schedule.id}/generate-ticket`, token, {});
    if (!ticket.ticket_number || ticket.pm_schedule_id !== schedule.id) throw new Error('Generated ticket is not linked to the schedule');
    const rows = await call('GET', '/service/maintenance-schedules', token);
    const persisted = rows.find((row) => row.id === schedule.id);
    if (persisted?.last_ticket?.id !== ticket.id) throw new Error('Schedule does not expose its generated ticket');
    let duplicateBlocked = false;
    try { await call('POST', `/service/maintenance-schedules/${schedule.id}/generate-ticket`, token, {}); }
    catch (error) { duplicateBlocked = String(error.message).includes('already OPEN'); }
    if (!duplicateBlocked) throw new Error('Duplicate open PM ticket was not blocked');
    console.log(JSON.stringify({ status: 'passed', schedule: schedule.schedule_name, ticket: ticket.ticket_number, duplicateBlocked }, null, 2));
  } finally {
    if (ticket?.id) await call('DELETE', `/service/tickets/${ticket.id}`, token).catch(() => null);
    if (schedule?.id) await call('DELETE', `/service/maintenance-schedules/${schedule.id}`, token).catch(() => null);
  }
}

main().catch((error) => { console.error(error.message); process.exitCode = 1; });
