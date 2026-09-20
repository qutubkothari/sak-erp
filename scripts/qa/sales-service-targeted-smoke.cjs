const { chromium } = require('playwright');

const baseUrl = process.env.SMOKE_BASE_URL || 'https://mizantra.saksolution.com';
const username = process.env.SMOKE_USER || 'hnoman';
const password = process.env.SMOKE_PASSWORD || 'Password';
const tag = `Automated sales-service smoke ${Date.now()}`;

function rows(value) {
  if (Array.isArray(value)) return value;
  for (const key of ['data', 'items', 'results', 'records']) {
    if (Array.isArray(value?.[key])) return value[key];
  }
  return [];
}

async function request(path, options = {}) {
  const response = await fetch(`${baseUrl}/api/v1${path}`, {
    ...options,
    headers: {
      authorization: `Bearer ${request.token}`,
      'content-type': 'application/json',
      ...(options.headers || {}),
    },
  });
  const text = await response.text();
  let body;
  try { body = text ? JSON.parse(text) : null; } catch { body = text; }
  if (!response.ok) {
    throw new Error(`${options.method || 'GET'} ${path}: ${response.status} ${typeof body === 'string' ? body.slice(0, 250) : JSON.stringify(body).slice(0, 250)}`);
  }
  return body;
}

async function authenticate(result) {
  const loginResponse = await fetch(`${baseUrl}/api/v1/auth/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });
  const auth = await loginResponse.json();
  if (!loginResponse.ok || !auth.accessToken) throw new Error(`Login failed: ${loginResponse.status}`);
  request.token = auth.accessToken;
  result.auth = auth;
}

async function apiSmoke(result) {
  await authenticate(result);

  const [customerResponse, itemResponse, uidResponse] = await Promise.all([
    request('/sales/customers'),
    request('/items?limit=100'),
    request('/uid?status=IN_STOCK&quality_status=PASSED&limit=10'),
  ]);
  const customers = rows(customerResponse);
  const items = rows(itemResponse);
  const saleableUids = rows(uidResponse);
  if (!customers.length) throw new Error('No customer exists for sales-order smoke test');
  if (!items.length) throw new Error('No item exists for sales-order smoke test');

  let order;
  try {
    order = await request('/sales/orders', {
      method: 'POST',
      body: JSON.stringify({
        customer_id: customers[0].id,
        order_date: new Date().toISOString().slice(0, 10),
        expected_delivery_date: new Date(Date.now() + 86400000).toISOString().slice(0, 10),
        payment_terms: 'Net 30 Days',
        delivery_terms: 'Ex Works',
        notes: tag,
        items: [{
          item_id: items[0].id,
          item_description: `${items[0].code || ''} ${items[0].name || 'Smoke item'}`.trim(),
          quantity: 1,
          unit_price: 125,
          discount_percentage: 4,
          tax_percentage: 18,
          notes: tag,
        }],
      }),
    });
    if (!order?.id || !order?.so_number) throw new Error('Order response did not include id and SO number');

    const detail = await request(`/sales/orders/${order.id}`);
    const orderLines = rows(detail.sales_order_items);
    if (orderLines.length !== 1) throw new Error('Sales order detail did not return its line item');
    const flow = await request(`/sales/orders/${order.id}/document-flow`);
    if (flow?.sales_order?.id !== order.id) throw new Error('Document flow did not return the source sales order');
    await request(`/sales/orders/${order.id}`, {
      method: 'PUT',
      body: JSON.stringify({
        customer_po_number: `QA-${Date.now()}`,
        currency_code: 'INR',
        place_of_supply: 'Test State',
        incoterm: 'EXW',
        payment_terms: 'Net 15 Days',
        delivery_terms: 'Ex Works',
        notes: `${tag} updated`,
        status: 'CONFIRMED',
        items: [{
          item_id: orderLines[0].item_id,
          item_description: orderLines[0].item_description,
          quantity: 1,
          unit_price: 130,
          discount_percentage: 5,
          tax_percentage: 18,
          ordered_uom: 'NOS',
          hsn_code: 'QA-HSN',
        }],
      }),
    });
    const edited = await request(`/sales/orders/${order.id}`);
    const editedLines = rows(edited.sales_order_items);
    if (edited.customer_po_number?.startsWith('QA-') !== true || Number(editedLines[0]?.unit_price) !== 130 || editedLines[0]?.hsn_code !== 'QA-HSN') {
      throw new Error('Sales-order commercial header or item edit did not persist');
    }

    if (edited.release_status !== 'PENDING') throw new Error(`New sales order did not enter the release queue (${edited.release_status})`);
    const availability = await request(`/sales/orders/${order.id}/availability`);
    if (!availability?.status || !Array.isArray(availability.lines) || availability.lines.length !== 1) {
      throw new Error('ATP availability check did not return the sales-order line');
    }
    const released = await request(`/sales/orders/${order.id}/release`, { method: 'POST', body: JSON.stringify({ remarks: tag }) });
    if (released?.release_status !== 'RELEASED' || !released?.availability?.status) {
      throw new Error('Commercial release did not persist credit and ATP controls');
    }

    await request(`/sales/orders/${order.id}/blocks`, {
      method: 'PUT',
      body: JSON.stringify({ delivery_block: true, block_reason: 'Automated delivery-block control test' }),
    });
    let deliveryBlockRejected = false;
    let deliveryBlockError = '';
    try {
      await request('/sales/dispatch', {
        method: 'POST',
        body: JSON.stringify({
          sales_order_id: order.id,
          dispatch_date: new Date().toISOString().slice(0, 10),
          items: [{
            sales_order_item_id: editedLines[0].id,
            item_id: editedLines[0].item_id,
            quantity: 1,
            uid: [`BLOCK-CONTROL-${Date.now()}`],
          }],
        }),
      });
    } catch (error) {
      deliveryBlockError = String(error?.message || error);
      deliveryBlockRejected = /delivery.*block/i.test(deliveryBlockError);
    }
    if (!deliveryBlockRejected) throw new Error(`Sales-order delivery block did not prevent PGI (${deliveryBlockError || 'dispatch unexpectedly succeeded'})`);
    await request(`/sales/orders/${order.id}/blocks`, {
      method: 'PUT',
      body: JSON.stringify({ delivery_block: false, block_reason: '' }),
    });

    const dispatchesBefore = rows(await request('/sales/dispatch'));
    let invalidDispatchRejected = false;
    try {
      await request('/sales/dispatch', {
        method: 'POST',
        body: JSON.stringify({
          sales_order_id: order.id,
          dispatch_date: new Date().toISOString().slice(0, 10),
          delivery_address: 'Automated negative-test address',
          notes: tag,
          items: [{
            sales_order_item_id: editedLines[0].id,
            item_id: editedLines[0].item_id,
            quantity: 1,
            uid: [`INVALID-SALES-SMOKE-${Date.now()}`],
          }],
        }),
      });
    } catch (error) {
      invalidDispatchRejected = /UID|saleable|not found/i.test(String(error?.message || error));
    }
    if (!invalidDispatchRejected) throw new Error('Invalid/non-saleable UID dispatch was not rejected correctly');
    const dispatchesAfter = rows(await request('/sales/dispatch'));
    const beforeIds = new Set(dispatchesBefore.map(entry => entry.id));
    const orphanDispatches = dispatchesAfter.filter(entry => !beforeIds.has(entry.id) && String(entry?.notes || '').includes(tag));
    if (orphanDispatches.length) throw new Error('Rejected dispatch left an orphan dispatch-note header');

    result.salesOrder = {
      number: order.so_number,
      lineCount: rows(detail.sales_order_items).length,
      documentFlow: true,
      edit: true,
      commercialFieldsAndLineEdit: true,
      commercialRelease: true,
      atpStatus: released.availability.status,
      deliveryBlockRejected: true,
      invalidDispatchRejected: true,
      rejectedDispatchOrphans: 0,
      saleableUidCount: saleableUids.length,
      dispatchGate: saleableUids.length ? 'available-for-manual-stock-linked-test' : 'correctly-blocked-no-saleable-uid',
    };
  } finally {
    if (order?.id) await request(`/sales/orders/${order.id}`, { method: 'DELETE' });
  }

  const [remainingOrders, remainingTickets] = await Promise.all([
    request('/sales/orders'),
    request('/service/tickets'),
  ]);
  // ERP-safe deletion cancels an order and retains its audit trail. Only an
  // active smoke order is residue; a CANCELLED document is the expected archive.
  const salesResidue = rows(remainingOrders).filter(entry =>
    String(entry?.notes || '').includes('Automated sales-service smoke')
      && String(entry?.status || '').toUpperCase() !== 'CANCELLED'
  );
  const serviceResidue = rows(remainingTickets).filter(entry => String(entry?.complaint_description || '').includes(tag));
  if (salesResidue.length || serviceResidue.length) {
    throw new Error(`Smoke cleanup incomplete: ${salesResidue.length} sales order(s), ${serviceResidue.length} service ticket(s)`);
  }
  result.cleanup = { salesOrders: 0, serviceTickets: 0 };
}

async function browserSmoke(result) {
  const browser = await chromium.launch({ headless: true });
  try {
    const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
    const page = await context.newPage();
    const failures = [];
    page.on('pageerror', error => failures.push(`pageerror: ${error.message}`));
    page.on('response', response => {
      if (response.url().includes('/api/v1/') && response.status() >= 500) {
        failures.push(`${response.status()} ${response.request().method()} ${response.url()}`);
      }
    });

    await page.goto(baseUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.evaluate(auth => {
      localStorage.setItem('accessToken', auth.accessToken);
      localStorage.setItem('refreshToken', auth.refreshToken);
      localStorage.setItem('user', JSON.stringify(auth.user || {}));
      localStorage.setItem('userId', auth.user?.id || '');
      localStorage.setItem('tenantId', auth.user?.tenantId || auth.user?.tenant_id || '');
    }, result.auth);
    // The unauthenticated landing page is only used to seed browser storage;
    // assess console/runtime failures from the authenticated ERP pages below.
    failures.length = 0;

    const checks = [];
    for (const target of [
      { path: '/dashboard/sales', heading: /(Order-to-Cash Control Center|Sales Management)/i, tabs: [/Orders/i, /Dispatch/i, /Billing/i] },
      { path: '/dashboard/service', heading: /Service & Warranty Management/i, tabs: [/Tickets/i, /Technicians/i, /Billing/i] },
    ]) {
      await page.goto(`${baseUrl}${target.path}`, { waitUntil: 'domcontentloaded', timeout: 30000 });
      await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => null);
      const heading = await page.getByText(target.heading).first().isVisible().catch(() => false);
      const tabs = [];
      for (const tab of target.tabs) {
        const button = page.getByRole('button', { name: tab }).first();
        const visible = await button.isVisible().catch(() => false);
        if (visible) {
          await button.click();
          await page.waitForTimeout(400);
        }
        tabs.push({ name: String(tab), visible });
      }
      const body = await page.locator('body').innerText();
      const registerSearch = page.getByPlaceholder(/Search (billing|tickets|customers|orders|dispatch|warranties|technicians)/i).first();
      const searchVisible = await registerSearch.isVisible().catch(() => false);
      const statusFilterVisible = await page.getByRole('combobox').filter({ has: page.locator('option[value="ALL"]') }).first().isVisible().catch(() => false);
      const registerRoot = target.path.endsWith('/sales') ? '#sales-management-root' : '#service-management-root';
      await page.locator(`${registerRoot} table`).first().waitFor({ state: 'visible', timeout: 10000 }).catch(() => null);
      const sortableHeader = page.locator(`${registerRoot} table thead th:not(:last-child)`).first();
      const headerVisible = await sortableHeader.isVisible().catch(() => false);
      const sortStatus = page.getByText(/Sorted by .*click a header to change/i).first();
      const sortBefore = await sortStatus.textContent().catch(() => '');
      if (headerVisible) { await sortableHeader.click(); await page.waitForTimeout(100); }
      const sortAfter = await sortStatus.textContent().catch(() => '');
      const resizeEnabled = headerVisible ? await sortableHeader.evaluate(element => getComputedStyle(element).resize === 'horizontal').catch(() => false) : false;
      const tableCount = await page.locator(`${registerRoot} table`).count();
      const searchProbe = `__NO_REGISTER_MATCH_${Date.now()}__`;
      if (searchVisible) { await registerSearch.fill(searchProbe); await page.waitForTimeout(100); }
      const searchReactive = searchVisible && await registerSearch.inputValue().then(value => value === searchProbe).catch(() => false);
      if (searchVisible) await registerSearch.fill('');

      let modalOpenClose = false;
      let customerStatement = true;
      let collectionsWorklist = true;
      if (target.path.endsWith('/sales')) {
        const collectionsTab = page.getByRole('button', { name: /Collections/i }).first();
        collectionsWorklist = await collectionsTab.isVisible().catch(() => false);
        if (collectionsWorklist) {
          await collectionsTab.click();
          collectionsWorklist = await page.getByRole('heading', { name: /Credit & Collections Worklist/i }).isVisible().catch(() => false);
        }
        await page.getByRole('button', { name: /Customers/i }).first().click();
        const statementButton = page.getByTitle('Customer account statement').first();
        if (await statementButton.isVisible().catch(() => false)) {
          await statementButton.click();
          const statementHeading = page.getByRole('heading', { name: /Customer Account Statement/i });
          customerStatement = await statementHeading.isVisible().catch(() => false);
          if (customerStatement) {
            await page.getByRole('button', { name: 'Close' }).first().click();
            customerStatement = !(await statementHeading.isVisible().catch(() => false));
          }
        }
        await page.getByRole('button', { name: /Sales Orders/i }).first().click();
        const createButton = page.getByRole('button', { name: /New Sales Order/i }).first();
        if (await createButton.isVisible().catch(() => false)) {
          await createButton.click();
          const modalHeading = page.getByRole('heading', { name: /Create Direct Sales Order/i });
          const opened = await modalHeading.isVisible().catch(() => false);
          await page.keyboard.press('Escape');
          modalOpenClose = opened && !(await modalHeading.isVisible().catch(() => false));
        }
      } else {
        await page.getByRole('button', { name: /Service Tickets/i }).first().click();
        const createButton = page.getByRole('button', { name: /Create Ticket/i }).first();
        if (await createButton.isVisible().catch(() => false)) {
          await createButton.click();
          const modalHeading = page.getByRole('heading', { name: /Create Service Ticket/i });
          const opened = await modalHeading.isVisible().catch(() => false);
          if (opened) await modalHeading.locator('xpath=ancestor::div[contains(@class,"fixed")]').getByRole('button', { name: 'Cancel' }).click();
          modalOpenClose = opened && !(await modalHeading.isVisible().catch(() => false));
        }
      }
      checks.push({
        path: target.path,
        heading,
        tabs,
        registerControls: { searchVisible, searchReactive, statusFilterVisible, sortableHeader: headerVisible, sortChanged: sortBefore !== sortAfter, resizeEnabled, modalOpenClose, customerStatement, collectionsWorklist, tableCount },
        fatalText: /502 Bad Gateway|Application error|Failed to fetch/i.test(body),
      });
    }
    result.browser = { checks, failures };
  } finally {
    await browser.close();
  }
}

(async () => {
  const result = { baseUrl, api: 'pending', browser: null };
  try {
    if (process.env.SMOKE_READ_ONLY === '1') {
      await authenticate(result);
      result.api = 'authenticated-read-only';
    } else {
      await apiSmoke(result);
      result.api = 'passed';
    }
    await browserSmoke(result);
    const failedUi = result.browser.failures.length || result.browser.checks.some(check => !check.heading || check.fatalText || check.tabs.some(tab => !tab.visible) || Object.entries(check.registerControls).some(([key, value]) => key === 'tableCount' ? !value : !value));
    delete result.auth;
    console.log(JSON.stringify(result, null, 2));
    if (failedUi) process.exitCode = 1;
  } catch (error) {
    result.api = `failed: ${error.message}`;
    delete result.auth;
    console.log(JSON.stringify(result, null, 2));
    process.exitCode = 1;
  }
})();
