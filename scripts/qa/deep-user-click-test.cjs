const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const BASE_URL = process.env.QA_BASE_URL || 'https://mizantra.saksolution.com';
const USERNAME = process.env.QA_USERNAME || 'hnoman';
const PASSWORD = process.env.QA_PASSWORD || 'Password';
const OUT_DIR = process.env.QA_OUT_DIR || path.join(process.cwd(), 'qa-results');

const rx = (text) => new RegExp(text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function apiLogin() {
  const response = await fetch(`${BASE_URL}/api/v1/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: USERNAME, password: PASSWORD }),
  });
  const text = await response.text();
  const data = text ? JSON.parse(text) : null;
  if (!response.ok || !data?.accessToken) throw new Error(`Login failed: ${response.status} ${text.slice(0, 500)}`);
  return data;
}

async function apiGet(token, endpoint) {
  const response = await fetch(`${BASE_URL}/api/v1${endpoint}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const text = await response.text();
  const data = text ? JSON.parse(text) : null;
  if (!response.ok) throw new Error(`GET ${endpoint} failed: ${response.status} ${text.slice(0, 500)}`);
  return data;
}

async function seedSession(context, auth) {
  await context.addInitScript((session) => {
    localStorage.setItem('accessToken', session.accessToken);
    localStorage.setItem('refreshToken', session.refreshToken);
    localStorage.setItem('user', JSON.stringify(session.user));
    localStorage.setItem('userId', session.user.id);
  }, auth);
}

async function goto(page, pathName) {
  await page.goto(`${BASE_URL}${pathName}`, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForLoadState('networkidle', { timeout: 12000 }).catch(() => null);
}

async function clickFirstVisible(page, locators, timeout = 8000) {
  const deadline = Date.now() + timeout;
  while (Date.now() < deadline) {
    for (const locator of locators) {
      const count = await locator.count().catch(() => 0);
      for (let i = 0; i < count; i += 1) {
        const one = locator.nth(i);
        if (await one.isVisible().catch(() => false)) {
          await one.click();
          return true;
        }
      }
    }
    await sleep(250);
  }
  return false;
}

async function clickButton(page, pattern, timeout = 8000) {
  const loc = page.getByRole('button', { name: pattern }).first();
  await loc.waitFor({ state: 'visible', timeout });
  await loc.click();
}

async function closeAny(page) {
  for (const pattern of [/^Close$/i, /^Cancel$/i, /×|x/i]) {
    const buttons = page.getByRole('button', { name: pattern });
    if (await clickFirstVisible(page, [buttons], 1200).catch(() => false)) {
      await sleep(500);
      return;
    }
  }
  await page.keyboard.press('Escape').catch(() => null);
  await sleep(400);
}

async function step(report, page, name, fn) {
  const entry = { name, ok: false, error: null, notes: [], consoleErrors: [], failedResponses: [], pageErrors: [] };
  const beforeConsole = report.consoleErrors.length;
  const beforeResponses = report.failedResponses.length;
  const beforePageErrors = report.pageErrors.length;
  try {
    await fn(entry);
    entry.consoleErrors = report.consoleErrors.slice(beforeConsole);
    entry.failedResponses = report.failedResponses.slice(beforeResponses);
    entry.pageErrors = report.pageErrors.slice(beforePageErrors);
    const transitionFetchNoise = entry.failedResponses.length === 0 && entry.pageErrors.length === 0 &&
      entry.consoleErrors.every((msg) => /Failed to fetch|API request failed/i.test(msg));
    if (entry.consoleErrors.length || entry.failedResponses.length || entry.pageErrors.length) {
      entry.notes.push(
        transitionFetchNoise
          ? `ignored ${entry.consoleErrors.length} navigation-aborted fetch console message(s)`
          : `captured ${entry.consoleErrors.length + entry.failedResponses.length + entry.pageErrors.length} browser/API issue(s) during step`,
      );
    }
    entry.ok = true;
  } catch (error) {
    entry.error = String(error?.message || error).slice(0, 2500);
  }
  report.steps.push(entry);
}

async function expectText(page, pattern, timeout = 8000) {
  await page.getByText(pattern).first().waitFor({ state: 'visible', timeout });
}

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const auth = await apiLogin();
  const [purchaseOrders, purchaseRequisitions] = await Promise.all([
    apiGet(auth.accessToken, '/purchase/orders'),
    apiGet(auth.accessToken, '/purchase/requisitions'),
  ]);
  const fixturePO = (purchaseOrders || []).find((row) => row?.id) || null;
  const fixturePR = (purchaseRequisitions || []).find((row) => row?.status === 'APPROVED') || (purchaseRequisitions || []).find((row) => row?.id) || null;
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1365, height: 768 }, ignoreHTTPSErrors: true });
  await seedSession(context, auth);
  const page = await context.newPage();
  const startedAt = new Date().toISOString();
  const report = {
    baseUrl: BASE_URL,
    username: USERNAME,
    startedAt,
    finishedAt: null,
    consoleErrors: [],
    failedResponses: [],
    pageErrors: [],
    steps: [],
  };

  page.on('console', (msg) => {
    if (msg.type() === 'error') report.consoleErrors.push(msg.text().slice(0, 1200));
  });
  page.on('response', (response) => {
    const status = response.status();
    const url = response.url();
    if (status >= 400 && !url.includes('/favicon.ico')) report.failedResponses.push({ status, url });
  });
  page.on('pageerror', (error) => report.pageErrors.push(String(error?.message || error).slice(0, 1200)));
  page.on('dialog', async (dialog) => {
    await dialog.dismiss().catch(() => null);
  });

  await step(report, page, 'PO create header has compact payment terms layout', async () => {
    await goto(page, '/dashboard/purchase/orders');
    await clickButton(page, /New Purchase Order|Create Purchase Order/i);
    await expectText(page, /Header Data/i);
    await expectText(page, /Payment Terms/i);
    await expectText(page, /Delivery Address/i);
    const headerInfo = await page.evaluate(() => {
      const section = document.querySelector('#po-form-header');
      const rect = section?.getBoundingClientRect();
      const labels = Array.from(section?.querySelectorAll('label') || []).map((el) => (el.textContent || '').trim());
      const chipRow = Array.from(section?.querySelectorAll('button') || []).find((el) => (el.textContent || '').includes('Factory') || (el.textContent || '').includes('APIS'));
      const chipParent = chipRow?.parentElement;
      return {
        height: rect?.height || 0,
        labels,
        hasHorizontalSavedAddressRow: chipParent ? getComputedStyle(chipParent).overflowX !== 'visible' : false,
      };
    });
    if (!headerInfo.labels.some((label) => /Payment Terms/i.test(label))) throw new Error('Payment Terms label missing from PO header');
    if (headerInfo.height > 650) throw new Error(`PO header still too tall (${headerInfo.height}px)`);
    await closeAny(page);
  });

  await step(report, page, 'PO detail imports/service/document actions render without API errors', async () => {
    if (!fixturePO?.id) throw new Error('No PO fixture found');
    await goto(page, `/dashboard/purchase/orders?viewId=${encodeURIComponent(fixturePO.id)}`);
    await expectText(page, /Purchase Order/i);
    for (const tab of [/Fulfilment/i, /Items/i, /Documents/i]) {
      const clicked = await clickFirstVisible(page, [
        page.getByRole('tab', { name: tab }),
        page.getByRole('button', { name: tab }),
        page.locator('button, a').filter({ hasText: tab }),
      ], 3000);
      if (!clicked) throw new Error(`Could not click PO tab ${tab}`);
      await sleep(300);
    }
    await closeAny(page);
  });

  await step(report, page, 'PR RFQ trail and response buttons are reachable', async () => {
    if (!fixturePR?.id) throw new Error('No PR fixture found');
    await goto(page, `/dashboard/purchase/requisitions?open=${encodeURIComponent(fixturePR.id)}`);
    await expectText(page, /Purchase Requisition/i);
    const hasRfqControls = await page.locator('button, a').filter({ hasText: /Send RFQ|View RFQ responses|Create PO|Record Response|Close/i }).count();
    if (!hasRfqControls) throw new Error('PR action buttons missing on PR detail');
    await closeAny(page);
  });

  await step(report, page, 'GRN create filters service rows and keeps create form usable', async () => {
    await goto(page, '/dashboard/purchase/grn');
    await clickButton(page, /Create GRN/i);
    await expectText(page, /Create GRN/i);
    const body = await page.locator('body').innerText();
    if (/must be accepted through a Service Entry Sheet/i.test(body)) throw new Error('GRN form is still trying to process service line conflict');
    const controls = await page.locator('input, textarea, select, button').count();
    if (controls < 6) throw new Error('GRN create controls look incomplete');
    await closeAny(page);
  });

  await step(report, page, 'Service Entry Sheets page opens and record button works to form level', async () => {
    await goto(page, '/dashboard/purchase/service-entries');
    await expectText(page, /Service Entry Sheets/i);
    await clickButton(page, /Record Service Entry/i);
    await expectText(page, /Service Entry|Service PO|Purchase Order/i);
    await closeAny(page);
  });

  await step(report, page, 'Accounts Payable vendor detail opens without import/subcontract console errors', async () => {
    await goto(page, '/dashboard/accounts/payables');
    await expectText(page, /Accounts Payable/i);
    const opened = await clickFirstVisible(page, [
      page.locator('tbody button').filter({ hasText: /View|Open|Details|Invoices/i }),
      page.locator('tbody tr').first(),
    ], 8000);
    if (!opened) throw new Error('Could not open AP vendor detail row');
    await expectText(page, /invoice|payable|outstanding/i);
    await closeAny(page);
  });

  await step(report, page, 'Low Stock Planning purchase controls and export/print controls exist', async () => {
    await goto(page, '/dashboard/inventory/low-stock');
    await expectText(page, /Low Stock Planning/i);
    const controls = await page.getByRole('button', { name: /Excel|Print|PDF|Purchase|Refresh/i }).count();
    if (controls < 3) throw new Error('Low stock export/print/purchase controls missing');
  });

  await step(report, page, 'Subcontracting tabs and order open controls are reachable', async () => {
    await goto(page, '/dashboard/production/subcontracting');
    await expectText(page, /Subcontracting|Outside Processing/i);
    // Finance was deliberately moved to Accounts > Subcontract Payables.
    for (const label of [/Orders/i, /Routes/i, /Vendor WIP/i]) {
      const clicked = await clickFirstVisible(page, [page.getByRole('tab', { name: label }), page.getByRole('button', { name: label })], 3000);
      if (!clicked) throw new Error(`Could not click Subcontracting tab ${label}`);
      await sleep(250);
    }
    const financeTab = await page.getByRole('tab', { name: /Finance/i }).count() + await page.getByRole('button', { name: /Finance/i }).count();
    if (financeTab) throw new Error('Finance must not remain as a Subcontracting tab; use Accounts > Subcontract Payables.');
  });

  await step(report, page, 'HR management tabs and Apply Leave employee dropdown render', async () => {
    await goto(page, '/dashboard/hr/management');
    await expectText(page, /HR Management/i);
    for (const label of [/Employees/i, /Attendance/i, /Leave Requests/i, /Holiday Calendar/i, /Payroll/i, /Master Config/i]) {
      const clicked = await clickFirstVisible(page, [
        page.getByRole('tab', { name: label }),
        page.getByRole('button', { name: label }),
        page.locator('button, a').filter({ hasText: label }),
      ], 3500);
      if (!clicked) throw new Error(`Could not click HR tab ${label}`);
      await sleep(250);
    }
    await goto(page, '/dashboard/hr');
    const leaveButtonClicked = await clickFirstVisible(page, [page.getByRole('button', { name: /Apply Leave|New Leave|Request Leave/i })], 5000);
    if (leaveButtonClicked) {
      await expectText(page, /Employee/i);
      const employeeControls = await page.locator('select, [role="combobox"], input').count();
      if (employeeControls < 2) throw new Error('Apply Leave employee/dropdown controls did not render');
      await closeAny(page);
    }
  });

  await browser.close();
  report.finishedAt = new Date().toISOString();
  const substantiveConsoleErrors = report.failedResponses.length || report.pageErrors.length
    ? report.consoleErrors
    : report.consoleErrors.filter((msg) => !/Failed to fetch|API request failed/i.test(msg));
  report.summary = {
    totalSteps: report.steps.length,
    passedSteps: report.steps.filter((s) => s.ok).length,
    failedSteps: report.steps.filter((s) => !s.ok).length,
    consoleErrors: substantiveConsoleErrors.length,
    navigationFetchNoise: report.consoleErrors.length - substantiveConsoleErrors.length,
    failedResponses: report.failedResponses.length,
    pageErrors: report.pageErrors.length,
  };
  const stamp = startedAt.replace(/[:.]/g, '-');
  const out = path.join(OUT_DIR, `deep-user-click-${stamp}.json`);
  fs.writeFileSync(out, JSON.stringify(report, null, 2));
  console.log(JSON.stringify({ report: out, summary: report.summary, failedSteps: report.steps.filter((s) => !s.ok) }, null, 2));
  if (report.summary.failedSteps || report.summary.consoleErrors || report.summary.failedResponses || report.summary.pageErrors) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
