const baseUrl = process.env.SMOKE_BASE_URL || 'https://mizantra.saksolution.com';
const username = process.env.SMOKE_USER || 'hnoman';
const password = process.env.SMOKE_PASSWORD || 'Password';
const tag = `Automated sales-service smoke ${Date.now()}`;

function rows(value) {
  if (Array.isArray(value)) return value;
  for (const key of ['data', 'items', 'results', 'records']) if (Array.isArray(value?.[key])) return value[key];
  return [];
}

async function request(path, options = {}) {
  const response = await fetch(`${baseUrl}/api/v1${path}`, { ...options, headers: { authorization: `Bearer ${request.token}`, 'content-type': 'application/json', ...(options.headers || {}) } });
  const text = await response.text();
  let body;
  try { body = text ? JSON.parse(text) : null; } catch { body = text; }
  if (!response.ok) throw new Error(`${options.method || 'GET'} ${path}: ${response.status} ${typeof body === 'string' ? body.slice(0, 300) : JSON.stringify(body).slice(0, 300)}`);
  return body;
}

async function uploadEvidence(label) {
  const form = new FormData();
  const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Wl2nWQAAAAASUVORK5CYII=', 'base64');
  form.append('files', new Blob([png], { type: 'image/png' }), `${label}.png`);
  const response = await fetch(`${baseUrl}/api/v1/service/uploads`, {
    method: 'POST',
    headers: { authorization: `Bearer ${request.token}` },
    body: form,
  });
  const text = await response.text();
  let body;
  try { body = text ? JSON.parse(text) : null; } catch { body = text; }
  if (!response.ok) throw new Error(`POST /service/uploads: ${response.status} ${String(text).slice(0, 300)}`);
  if (!body?.urls?.[0]) throw new Error('Service evidence upload did not return a URL');
  return body.urls[0];
}

async function verifyPdf(path, label) {
  const response = await fetch(`${baseUrl}/api/v1${path}`, {
    headers: { authorization: `Bearer ${request.token}` },
  });
  const bytes = Buffer.from(await response.arrayBuffer());
  if (!response.ok || !String(response.headers.get('content-type')).includes('application/pdf') || bytes.subarray(0, 4).toString() !== '%PDF') {
    throw new Error(`${label} PDF failed: HTTP ${response.status}, ${bytes.subarray(0, 200).toString()}`);
  }
  return bytes.length;
}

(async () => {
  const result = { baseUrl, tag, status: 'pending' };
  try {
    const login = await fetch(`${baseUrl}/api/v1/auth/login`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ username, password }) });
    const auth = await login.json();
    if (!login.ok || !auth.accessToken) throw new Error(`Login failed: ${login.status}`);
    request.token = auth.accessToken;
    const customers = rows(await request('/sales/customers'));
    let technicians = rows(await request('/service/technicians?active_only=true'));
    if (!customers.length) throw new Error('Customer master data is required');
    if (!technicians.length) {
      technicians = [await request('/service/technicians', { method: 'POST', body: JSON.stringify({ technician_name: 'Automated QA Technician', specialization: 'QA', email: 'automated-service-smoke@example.invalid' }) })];
    }

    const ticket = await request('/service/tickets', { method: 'POST', body: JSON.stringify({ customer_id: customers[0].id, service_type: 'PAID', priority: 'MEDIUM', complaint_description: tag, reported_by: 'Automated QA', product_name: 'Service QA unit', service_location: 'Customer site', expected_completion_date: new Date(Date.now() + 86400000).toISOString().slice(0, 10) }) });
    const assignment = await request('/service/assignments', { method: 'POST', body: JSON.stringify({ service_ticket_id: ticket.id, technician_id: technicians[0].id }) });
    const detail = await request(`/service/tickets/${ticket.id}`);
    if (rows(detail.assignments).length !== 1) throw new Error('Assigned technician was not returned in ticket detail');

    const initialEstimate = await request(`/service/tickets/${ticket.id}/estimates`, {
      method: 'POST',
      body: JSON.stringify({
        tax_percentage: 18,
        terms_and_conditions: 'Automated QA commercial approval test',
        items: [{ description: 'Automated service scope', quantity: 1, uom: 'JOB', unit_price: 1000, discount_percent: 0 }],
      }),
    });
    const estimate = await request(`/service/estimates/${initialEstimate.id}/revise`, {
      method: 'POST',
      body: JSON.stringify({
        tax_percentage: 18,
        terms_and_conditions: 'Automated QA revised commercial approval test',
        items: [{ description: 'Automated revised service scope', quantity: 1, uom: 'JOB', unit_price: 1150, discount_percent: 0 }],
      }),
    });
    await request(`/service/estimates/${estimate.id}/customer-comment`, {
      method: 'POST',
      body: JSON.stringify({ notes: 'Automated customer clarification recorded before approval' }),
    });
    await request(`/service/estimates/${estimate.id}/decision`, {
      method: 'POST',
      body: JSON.stringify({ decision: 'APPROVE', approval_reference: `QA-APPROVAL-${Date.now()}` }),
    });
    const estimatePdfBytes = await verifyPdf(`/service/estimates/${estimate.id}/pdf`, 'Estimate');

    const checklistTemplate = await request('/service/checklist-templates', {
      method: 'POST',
      body: JSON.stringify({
        template_name: `Automated QA Checklist ${Date.now()}`,
        service_type: 'PAID',
        description: tag,
        items: [
          { item_text: 'Verify complaint and corrective action', is_required: true },
          { item_text: 'Record customer acknowledgement', is_required: true },
        ],
      }),
    });
    const checklist = await request(`/service/tickets/${ticket.id}/checklist`, {
      method: 'POST',
      body: JSON.stringify({ template_id: checklistTemplate.id }),
    });
    for (const item of rows(checklist)) {
      await request(`/service/tickets/${ticket.id}/checklist/${item.id}`, {
        method: 'PUT',
        body: JSON.stringify({ status: 'COMPLETED', remarks: 'Automated QA verification complete' }),
      });
    }

    const beforeEvidence = await uploadEvidence(`service-before-${Date.now()}`);
    const afterEvidence = await uploadEvidence(`service-after-${Date.now()}`);
    const visit = await request(`/service/tickets/${ticket.id}/visits/check-in`, {
      method: 'POST',
      body: JSON.stringify({
        service_assignment_id: assignment.id,
        purpose: 'Automated end-to-end field-service visit',
        site_contact_name: 'Automated Customer Contact',
        site_contact_designation: 'QA Approver',
        site_contact_mobile: '9999999999',
        check_in_lat: 17.72,
        check_in_lng: 83.30,
        check_in_location: 'Automated QA site',
        before_attachments: [beforeEvidence],
      }),
    });
    const completedVisit = await request(`/service/visits/${visit.id}/check-out`, {
      method: 'PUT',
      body: JSON.stringify({
        work_notes: 'Automated service visit completed with evidence',
        customer_acknowledgement_name: 'Automated Customer Contact',
        signature_declined_reason: 'Automated test: customer signature capture is not available in the test harness.',
        check_out_lat: 17.72,
        check_out_lng: 83.30,
        check_out_location: 'Automated QA site',
        after_attachments: [afterEvidence],
        complete_assignment: true,
      }),
    });
    if (completedVisit.status !== 'COMPLETED') throw new Error('Field-service visit did not complete');

    let warehouseGate = '';
    try {
      await request('/service/parts', { method: 'POST', body: JSON.stringify({ service_ticket_id: ticket.id, part_id: '00000000-0000-0000-0000-000000000000', part_name: 'Invalid QA part', quantity: 1, unit_price: 1 }) });
      throw new Error('Part issue without a warehouse was unexpectedly accepted');
    } catch (error) {
      if (!String(error.message).includes('Source warehouse is required')) throw error;
      warehouseGate = 'passed';
    }

    const stockRows = rows(await request('/inventory/stock'));
    let stockCandidate = null;
    for (const stockRow of stockRows.filter((row) => Number(row?.available_quantity || 0) >= 0.01)) {
      const item = await request(`/items/${stockRow.item_id}`);
      if (item?.uid_tracking !== true) {
        stockCandidate = { stockRow, item };
        break;
      }
    }
    if (!stockCandidate) throw new Error('No non-UID stock item is available for the service-part posting test');

    const issueQuantity = 0.01;
    const beforeStock = Number(stockCandidate.stockRow.available_quantity || 0);
    let partIssue;
    try {
      partIssue = await request('/service/parts', {
        method: 'POST',
        body: JSON.stringify({
          service_ticket_id: ticket.id,
          service_assignment_id: assignment.id,
          part_id: stockCandidate.item.id,
          part_code: stockCandidate.item.code,
          part_name: stockCandidate.item.name,
          warehouse_id: stockCandidate.stockRow.warehouse_id,
          quantity: issueQuantity,
          unit_price: Number(stockCandidate.item.standard_cost || 1),
          charged_to_customer: false,
          notes: tag,
        }),
      });
      if (!partIssue?.stock_movement_id || !partIssue?.stock_movement_number) {
        throw new Error('Service-part issue did not return its stock movement reference');
      }
      const afterIssueRows = rows(await request(`/inventory/stock?item_id=${stockCandidate.item.id}&warehouse_id=${stockCandidate.stockRow.warehouse_id}`));
      const afterIssue = Number(afterIssueRows[0]?.available_quantity || 0);
      if (Math.abs(afterIssue - (beforeStock - issueQuantity)) > 0.000001) {
        throw new Error(`Service-part stock did not decrease correctly: before=${beforeStock}, after=${afterIssue}`);
      }
    } finally {
      if (partIssue?.stock_movement_id) {
        await request('/inventory/movements', {
          method: 'POST',
          body: JSON.stringify({
            movement_type: 'ADJUSTMENT',
            item_id: stockCandidate.item.id,
            to_warehouse_id: stockCandidate.stockRow.warehouse_id,
            quantity: issueQuantity,
            reference_type: 'AUTOMATED_SERVICE_PART_RESTORE',
            reference_id: ticket.id,
            reference_number: ticket.ticket_number,
            notes: tag,
          }),
        });
      }
    }
    const restoredRows = rows(await request(`/inventory/stock?item_id=${stockCandidate.item.id}&warehouse_id=${stockCandidate.stockRow.warehouse_id}`));
    const restoredStock = Number(restoredRows[0]?.available_quantity || 0);
    if (Math.abs(restoredStock - beforeStock) > 0.000001) {
      throw new Error(`Service-part stock restoration failed: before=${beforeStock}, restored=${restoredStock}`);
    }

    const confirmation = await request(`/service/tickets/${ticket.id}/confirmations`, { method: 'POST', body: JSON.stringify({ service_assignment_id: assignment.id, work_performed: 'Automated service completed', failure_category: 'MECHANICAL', root_cause: 'Automated QA root-cause validation', corrective_action: 'Automated QA corrective action completed', preventive_action: 'Automated QA preventive action recorded', labor_hours: 2, labor_rate: 500, travel_cost: 100, other_amount: 50, tax_percentage: 18, customer_signoff_name: 'Automated QA', is_final: true }) });
    if (Number(confirmation.total_amount) !== 1357) throw new Error(`Unexpected confirmation total ${confirmation.total_amount}`);
    const feedback = await request(`/service/tickets/${ticket.id}/feedback`, {
      method: 'POST',
      body: JSON.stringify({
        overall_rating: 5,
        technician_rating: 5,
        response_time_rating: 4,
        service_quality_rating: 5,
        feedback_text: 'Automated end-to-end service feedback',
        suggestions: 'Automated QA validation',
        would_recommend: true,
      }),
    });
    if (Number(feedback.overall_rating) !== 5) throw new Error('Customer service feedback did not persist');
    const invoice = await request(`/service/confirmations/${confirmation.id}/create-invoice`, { method: 'POST', body: JSON.stringify({ notes: tag }) });
    const payment = await request(`/service/customer-invoices/${invoice.id}/payments`, { method: 'POST', body: JSON.stringify({ amount: 357, payment_method: 'NEFT', payment_reference: 'QA-REVERSAL' }) });
    const invoicePdfBytes = await verifyPdf(`/service/customer-invoices/${invoice.id}/pdf`, 'Invoice');
    const receiptPdfBytes = await verifyPdf(`/service/customer-invoices/${invoice.id}/payments/${payment.id}/pdf`, 'Receipt');
    const reversed = await request(`/service/customer-invoices/${invoice.id}/payments/${payment.id}/reverse`, { method: 'POST', body: JSON.stringify({ reason: 'Automated reversal validation' }) });
    if (Number(reversed.balance_amount) !== 1357) throw new Error('Receipt reversal did not restore invoice balance');
    const cancelled = await request(`/service/customer-invoices/${invoice.id}/cancel`, { method: 'POST', body: JSON.stringify({ reason: 'Automated cancellation validation' }) });
    if (cancelled.billing_status !== 'CANCELLED') throw new Error('Service invoice was not cancelled');
    const flow = await request(`/service/tickets/${ticket.id}/document-flow`);
    if (rows(flow.confirmations).length !== 1 || rows(flow.invoices).length !== 1 || rows(flow.visits).length !== 1 || rows(flow.checklist).length !== 2 || !flow.feedback || !rows(flow.invoices[0].payments).some((row) => row.reversed_at)) throw new Error('Service document flow is incomplete');

    result.status = 'passed';
    result.ticket = ticket.ticket_number;
    result.confirmation = confirmation.confirmation_number;
    result.estimate = estimate.estimate_number;
    result.estimateRevision = Number(estimate.revision_no || 0);
    result.checklistItems = rows(checklist).length;
    result.siteVisit = completedVisit.status;
    result.evidenceUploads = 2;
    result.feedbackRating = Number(feedback.overall_rating);
    result.invoice = invoice.invoice_number;
    result.receipt = payment.receipt_number;
    result.pdfBytes = { estimate: estimatePdfBytes, invoice: invoicePdfBytes, receipt: receiptPdfBytes };
    result.warehouseGate = warehouseGate;
    result.servicePartStock = {
      item: stockCandidate.item.code,
      movement: partIssue.stock_movement_number,
      before: beforeStock,
      afterIssue: Number((beforeStock - issueQuantity).toFixed(6)),
      restored: restoredStock,
    };
    result.documentFlow = 'complete';
  } catch (error) {
    result.status = `failed: ${error.message}`;
    process.exitCode = 1;
  }
  console.log(JSON.stringify(result, null, 2));
})();
