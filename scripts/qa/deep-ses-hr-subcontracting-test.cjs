const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const BASE_URL = process.env.QA_BASE_URL || 'https://mizantra.saksolution.com';
const USERNAME = process.env.QA_USERNAME || 'hnoman';
const PASSWORD = process.env.QA_PASSWORD || 'Password';
const OUT_DIR = process.env.QA_OUT_DIR || path.join(process.cwd(), 'qa-results');

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
  if (!response.ok) throw new Error(`GET ${endpoint} failed: ${response.status} ${text.slice(0, 800)}`);
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
    await sleep(200);
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
      await sleep(350);
      return;
    }
  }
  await page.keyboard.press('Escape').catch(() => null);
  await sleep(300);
}

async function expectText(page, pattern, timeout = 8000) {
  const deadline = Date.now() + timeout;
  while (Date.now() < deadline) {
    const matches = page.getByText(pattern);
    const count = await matches.count();
    for (let index = 0; index < count; index += 1) {
      if (await matches.nth(index).isVisible().catch(() => false)) return;
    }
    await sleep(150);
  }
  throw new Error(`Visible text matching ${pattern} was not found within ${timeout}ms`);
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
    const navigationNoise = entry.failedResponses.length === 0 && entry.pageErrors.length === 0 &&
      entry.consoleErrors.every((msg) => /Failed to fetch|API request failed|AbortError|NetworkError/i.test(msg));
    if (entry.consoleErrors.length || entry.failedResponses.length || entry.pageErrors.length) {
      entry.notes.push(navigationNoise
        ? `ignored ${entry.consoleErrors.length} navigation-aborted fetch console message(s)`
        : `captured ${entry.consoleErrors.length + entry.failedResponses.length + entry.pageErrors.length} browser/API issue(s)`);
    }
    entry.ok = true;
  } catch (error) {
    entry.error = String(error?.message || error).slice(0, 2500);
  }
  report.steps.push(entry);
}

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const auth = await apiLogin();
  const startedAt = new Date().toISOString();
  const report = {
    baseUrl: BASE_URL,
    username: USERNAME,
    startedAt,
    finishedAt: null,
    apiChecks: [],
    consoleErrors: [],
    failedResponses: [],
    pageErrors: [],
    steps: [],
  };

  const apiEndpoints = [
    '/purchase/service-entries',
    '/purchase/service-entries/eligible-pos',
    '/purchase/service-entries/invoices/list',
    '/purchase/service-entries/invoices/eligible-ses',
    '/production/subcontracting/dashboard',
    '/production/subcontracting/routes',
    '/production/subcontracting/orders',
    '/production/subcontracting/vendor-stock',
    '/production/subcontracting/finance',
    '/hr/employees',
    '/hr/attendance',
    '/hr/leaves',
    '/hr/holidays',
    '/hr/payroll/runs',
  ];

  for (const endpoint of apiEndpoints) {
    try {
      const data = await apiGet(auth.accessToken, endpoint);
      const rows = Array.isArray(data) ? data.length : Array.isArray(data?.data) ? data.data.length : undefined;
      report.apiChecks.push({ endpoint, ok: true, rows });
    } catch (error) {
      report.apiChecks.push({ endpoint, ok: false, error: String(error?.message || error).slice(0, 800) });
    }
  }

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, ignoreHTTPSErrors: true });
  await seedSession(context, auth);
  const page = await context.newPage();

  page.on('console', (msg) => {
    if (msg.type() === 'error') report.consoleErrors.push(msg.text().slice(0, 1200));
  });
  page.on('response', (response) => {
    const status = response.status();
    const url = response.url();
    if (status >= 400 && !url.includes('/favicon.ico')) report.failedResponses.push({ status, url });
  });
  page.on('pageerror', (error) => report.pageErrors.push(String(error?.message || error).slice(0, 1200)));
  page.on('dialog', async (dialog) => dialog.dismiss().catch(() => null));

  await step(report, page, 'SES register, eligible PO dropdown, and create modal render', async () => {
    await goto(page, '/dashboard/purchase/service-entries');
    await expectText(page, /Service Entry Sheets/i);
    await expectText(page, /Service PO.*Service Entry Sheet.*Accounts Payable/i);
    await clickButton(page, /Record Service Entry/i);
    await expectText(page, /Record Service Entry/i);
    await expectText(page, /Service completion is accepted/i);
    await expectText(page, /Purchase Order|Service PO/i);
    const controls = await page.locator('select, [role="combobox"], input, textarea, button').count();
    if (controls < 6) throw new Error(`SES create modal controls look incomplete (${controls})`);
    await closeAny(page);
  });

  await step(report, page, 'Service invoices page, record invoice modal, and service controls render', async () => {
    await goto(page, '/dashboard/accounts/service-invoices');
    await expectText(page, /Service Invoices|Service Supplier Invoices|service supplier invoice/i);
    await expectText(page, /Service Entry Sheet|sanctioned|payable|invoice/i);
    const clicked = await clickFirstVisible(page, [
      page.getByRole('button', { name: /Record.*Invoice|New.*Invoice|Create.*Invoice/i }),
      page.locator('button').filter({ hasText: /Invoice/i }),
    ], 6000);
    if (clicked) {
      await expectText(page, /Record|Invoice|Service Entry/i);
      await closeAny(page);
    }
  });

  await step(report, page, 'Subcontracting dashboard tabs, route/order actions, and WIP/finance views render', async () => {
    await goto(page, '/dashboard/production/subcontracting');
    await expectText(page, /Subcontracting|Outside Processing/i);
    await expectText(page, /Subcontracting process flow/i);
    // Finance is deliberately available under Accounts > Subcontract Payables,
    // not as a second financial workspace inside Production > Subcontracting.
    for (const label of [/Orders/i, /Routes/i, /Vendor WIP/i]) {
      const clicked = await clickFirstVisible(page, [
        page.getByRole('tab', { name: label }),
        page.getByRole('button', { name: label }),
        page.locator('button, a').filter({ hasText: label }),
      ], 4000);
      if (!clicked) throw new Error(`Could not click subcontracting tab ${label}`);
      await sleep(400);
    }
    const financeInsideProduction =
      (await page.getByRole('tab', { name: /Finance/i }).count()) +
      (await page.getByRole('button', { name: /Finance/i }).count());
    if (financeInsideProduction) {
      throw new Error('Finance must not remain as a Subcontracting tab; use Accounts > Subcontract Payables.');
    }
    const actionCount = await page.getByRole('button', { name: /New Route|New Order|Refresh|Open|Issue|Receive|Invoice/i }).count();
    if (actionCount < 2) throw new Error(`Subcontracting action controls missing (${actionCount})`);
  });

  await step(report, page, 'Subcontracting new order and route modals open without saving', async () => {
    await goto(page, '/dashboard/production/subcontracting');
    const newRoute = await clickFirstVisible(page, [page.getByRole('button', { name: /New Route/i })], 5000);
    if (newRoute) {
      await expectText(page, /Route|Subcontracting/i);
      await closeAny(page);
    }
    const newOrder = await clickFirstVisible(page, [page.getByRole('button', { name: /New Order/i })], 5000);
    if (newOrder) {
      await expectText(page, /Order|Subcontracting/i);
      await closeAny(page);
    }
  });

  await step(report, page, 'HR management workspace tabs are clickable and dashboard-only cockpit does not clutter tab bodies', async () => {
    await goto(page, '/dashboard/hr/management');
    await expectText(page, /HR Management/i);
    const tabLabels = [/Employees/i, /Attendance/i, /Leave Requests/i, /Holiday Calendar/i, /Payroll/i, /Master Config/i];
    for (const label of tabLabels) {
      const clicked = await clickFirstVisible(page, [
        page.getByRole('tab', { name: label }),
        page.getByRole('button', { name: label }),
        page.locator('button, a').filter({ hasText: label }),
      ], 4500);
      if (!clicked) throw new Error(`Could not click HR tab ${label}`);
      await sleep(500);
      if (!/Employees/i.test(String(label))) {
        const cockpitVisible = await page.getByText(/People operations cockpit/i).isVisible().catch(() => false);
        if (cockpitVisible && !/Employees/i.test(String(label))) {
          throw new Error(`People operations cockpit is still visible after clicking HR tab ${label}`);
        }
      }
    }
  });

  await step(report, page, 'HR employee register add/open controls render', async () => {
    await goto(page, '/dashboard/hr/management?section=management&tab=employees');
    await expectText(page, /Employee|People|Headcount/i);
    const opened = await clickFirstVisible(page, [
      page.getByRole('button', { name: /New Employee|Add Employee/i }),
      page.locator('tbody button').first(),
      page.locator('tbody tr').first(),
    ], 7000);
    if (!opened) throw new Error('Could not open employee add/detail control');
    await expectText(page, /Employee|Personal|Employment|Profile/i);
    await closeAny(page);
  });

  await step(report, page, 'Apply Leave modal employee dropdown and dates render', async () => {
    await goto(page, '/dashboard/hr/management?section=management&tab=leaves&applyLeave=1');
    const modalAlreadyOpen = await page.locator('.fixed').filter({ hasText: /Apply Leave|Leave Management/i }).first().isVisible().catch(() => false);
    if (!modalAlreadyOpen) {
      const leaveButton = await clickFirstVisible(page, [
        page.getByRole('button', { name: /Apply Leave|Request Leave|New Leave/i }),
        page.locator('button, a').filter({ hasText: /Apply Leave|Request Leave|New Leave/i }),
      ], 5000);
      if (!leaveButton) throw new Error('Apply Leave button not found and modal did not auto-open');
    }
    await expectText(page, /Apply Leave|Leave Management/i);
    await expectText(page, /Employee/i);
    await expectText(page.locator('.fixed').filter({ hasText: /Apply Leave|Leave Management/i }), /Leave|Type/i);
    await expectText(page, /Start Date/i);
    const employeeDropdown = await page.locator('select, [role="combobox"]').first().count();
    if (!employeeDropdown) throw new Error('Employee dropdown/combobox missing in Apply Leave modal');
    await closeAny(page);
  });

  await step(report, page, 'HR attendance, leave, holiday, payroll, and master config pages render directly', async () => {
    const paths = [
      ['/dashboard/hr/management?section=management&tab=attendance', /Attendance|Time/i],
      ['/dashboard/hr/management?section=management&tab=leaves', /Leave/i],
      ['/dashboard/hr/management?section=management&tab=holidays', /Holiday/i],
      ['/dashboard/hr/management?section=management&tab=payroll', /Payroll|Payslip/i],
      ['/dashboard/hr/management?section=management&tab=config', /KPI Definitions|Master Config|Payroll logic/i],
    ];
    for (const [pathName, pattern] of paths) {
      await goto(page, pathName);
      await expectText(page, pattern);
    }
  });

  await browser.close();
  report.finishedAt = new Date().toISOString();
  const failedApiChecks = report.apiChecks.filter((check) => !check.ok);
  const substantiveConsoleErrors = report.failedResponses.length || report.pageErrors.length
    ? report.consoleErrors
    : report.consoleErrors.filter((msg) => !/Failed to fetch|API request failed|AbortError|NetworkError/i.test(msg));
  report.summary = {
    totalApiChecks: report.apiChecks.length,
    failedApiChecks: failedApiChecks.length,
    totalSteps: report.steps.length,
    passedSteps: report.steps.filter((s) => s.ok).length,
    failedSteps: report.steps.filter((s) => !s.ok).length,
    consoleErrors: substantiveConsoleErrors.length,
    navigationFetchNoise: report.consoleErrors.length - substantiveConsoleErrors.length,
    failedResponses: report.failedResponses.length,
    pageErrors: report.pageErrors.length,
  };

  const stamp = startedAt.replace(/[:.]/g, '-');
  const out = path.join(OUT_DIR, `deep-ses-hr-subcontracting-${stamp}.json`);
  fs.writeFileSync(out, JSON.stringify(report, null, 2));
  console.log(JSON.stringify({
    report: out,
    summary: report.summary,
    failedApiChecks,
    failedSteps: report.steps.filter((s) => !s.ok),
  }, null, 2));
  if (report.summary.failedApiChecks || report.summary.failedSteps || report.summary.consoleErrors || report.summary.failedResponses || report.summary.pageErrors) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
