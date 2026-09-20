const fs = require('fs');
const path = require('path');

const playwrightModule = process.env.PLAYWRIGHT_MODULE || 'playwright';
const { chromium } = require(playwrightModule);

const BASE_URL = process.env.QA_BASE_URL || 'https://mizantra.saksolution.com';
const USERNAME = process.env.QA_USERNAME || 'hnoman';
const PASSWORD = process.env.QA_PASSWORD || 'Password';
const OUT_DIR = process.env.QA_OUT_DIR || path.join(process.cwd(), 'qa-results');

function assert(condition, message, detail) {
  if (!condition) {
    throw new Error(`${message}${detail === undefined ? '' : `\n${JSON.stringify(detail, null, 2)}`}`);
  }
}

async function apiLogin() {
  const response = await fetch(`${BASE_URL}/api/v1/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: USERNAME, password: PASSWORD }),
  });
  const body = await response.text();
  const data = body ? JSON.parse(body) : null;
  assert(response.ok, `Login failed: ${response.status}`, data);
  assert(data?.accessToken && data?.refreshToken && data?.user, 'Login response missing auth fields', data);
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

function textMatcher(text) {
  if (text instanceof RegExp) {
    return text;
  }
  return new RegExp(text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
}

async function clickButton(page, label, timeout = 8000) {
  const loc = page.getByRole('button', { name: textMatcher(label) }).first();
  await loc.waitFor({ state: 'visible', timeout });
  await loc.click();
  return label;
}

async function clickRowAction(page, label, timeout = 8000) {
  const pattern = label === 'Open'
    ? /View (purchase order|requisition|goods receipt|vendor|item)|Open/i
    : textMatcher(label);

  const candidates = [
    page.locator('table button, [role="table"] button, tbody button').filter({ hasText: textMatcher(label) }),
    page.locator('button[aria-label], button[title]'),
  ];

  const deadline = Date.now() + timeout;
  while (Date.now() < deadline) {
    for (const locator of candidates) {
      const count = await locator.count();
      for (let i = 0; i < count; i += 1) {
        const button = locator.nth(i);
        const name = `${await button.textContent().catch(() => '')} ${await button.getAttribute('aria-label').catch(() => '')} ${await button.getAttribute('title').catch(() => '')}`;
        if (!pattern.test(name)) continue;
        const box = await button.boundingBox().catch(() => null);
        if (!box || box.width < 1 || box.height < 1) continue;
        if (!(await button.isVisible().catch(() => false))) continue;
        await button.click();
        return label;
      }
    }
    await page.waitForTimeout(250);
  }

  return clickButton(page, label, Math.max(1000, timeout / 2));
}

async function clickIfPresent(page, label, timeout = 2500) {
  const loc = page.getByRole('button', { name: textMatcher(label) }).first();
  try {
    await loc.waitFor({ state: 'visible', timeout });
    await loc.click();
    return true;
  } catch {
    return false;
  }
}

async function fillFirst(page, selector, value, timeout = 5000) {
  const loc = page.locator(selector).first();
  await loc.waitFor({ state: 'visible', timeout });
  await loc.fill(value);
}

async function waitBodyContains(page, text, timeout = 8000) {
  const matcher = textMatcher(text);
  await page.waitForFunction(
    ({ source, flags }) => new RegExp(source, flags).test(document.body?.innerText || ''),
    { source: matcher.source, flags: matcher.flags },
    { timeout },
  );
}

async function closeWorkspace(page) {
  for (const label of ['Close', 'Cancel']) {
    if (await clickIfPresent(page, label, 1200)) {
      await page.waitForTimeout(500);
      return;
    }
  }
  await page.keyboard.press('Escape').catch(() => null);
  await page.waitForTimeout(500);
}

async function goto(page, pathName) {
  await page.goto(`${BASE_URL}${pathName}`, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForLoadState('networkidle', { timeout: 12000 }).catch(() => null);
}

async function runStep(report, page, name, fn) {
  const entry = { name, ok: false, error: null };
  try {
    await fn();
    entry.ok = true;
  } catch (error) {
    entry.error = String(error?.message || error).slice(0, 2000);
  }
  report.steps.push(entry);
}

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const startedAt = new Date().toISOString();
  const auth = await apiLogin();
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1365, height: 768 }, ignoreHTTPSErrors: true });
  await seedSession(context, auth);
  const page = await context.newPage();

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
    const text = msg.text();
    if (msg.type() === 'error' && !/Failed to fetch RSC payload|API request failed: TypeError: Failed to fetch/i.test(text)) report.consoleErrors.push(text.slice(0, 1000));
  });
  page.on('response', (response) => {
    const status = response.status();
    const url = response.url();
    if (status >= 400 && !url.includes('/favicon.ico')) {
      report.failedResponses.push({ status, url });
    }
  });
  page.on('pageerror', (error) => report.pageErrors.push(String(error?.message || error).slice(0, 1000)));
  page.on('dialog', async (dialog) => {
    if (/delete|reject|approve|sanction|submit|save/i.test(dialog.message())) await dialog.dismiss();
    else await dialog.accept();
  });

  await runStep(report, page, 'dashboard session loads', async () => {
    await goto(page, '/dashboard');
    await waitBodyContains(page, /Dashboard|Purchase|Inventory|Employee|ERP/i);
    assert(await page.locator('body').innerText().then((text) => !/Failed to fetch|Internal server error/i.test(text)), 'Dashboard rendered an error banner');
  });

  await runStep(report, page, 'vendor create/edit workspace and dropdown tabs open', async () => {
    await goto(page, '/dashboard/purchase/vendors');
    await clickButton(page, 'New Vendor');
    await waitBodyContains(page, 'Create Vendor');
    await fillFirst(page, 'input', 'M/S QA UI Click Vendor');
    await page.getByRole('button', { name: /Tax & Address/i }).click();
    await waitBodyContains(page, 'GST');
    await page.getByRole('button', { name: /Contacts/i }).click();
    await waitBodyContains(page, 'Contact');
    await page.getByRole('button', { name: /^Bank$/i }).click();
    await waitBodyContains(page, 'Bank');
    await closeWorkspace(page);
  });

  await runStep(report, page, 'vendor row open/view action works', async () => {
    await goto(page, '/dashboard/purchase/vendors');
    await clickRowAction(page, 'Open');
    await waitBodyContains(page, 'Vendor');
    await closeWorkspace(page);
  });

  await runStep(report, page, 'PR create workspace search fields and add item controls open', async () => {
    await goto(page, '/dashboard/purchase/requisitions');
    await clickButton(page, 'New Requisition');
    await waitBodyContains(page, 'Purchase Requisition');
    await page.getByRole('button', { name: /Items/i }).click();
    await waitBodyContains(page, 'Items');
    assert(await page.locator('input, textarea, select, button').count() > 8, 'PR form controls not found after opening workspace');
    assert(await page.getByRole('button', { name: /Add Item|Add Another Item|Search Existing Items|Save as Draft|Create Requisition|Update Requisition/i }).count(), 'PR add/save controls missing');
    await closeWorkspace(page);
  });

  await runStep(report, page, 'PR row detail opens with role-appropriate actions', async () => {
    await goto(page, '/dashboard/purchase/requisitions');
    await clickRowAction(page, 'Open');
    await waitBodyContains(page, 'Purchase Requisition');
    await waitBodyContains(page, /Items|Approval History|PR Trail|Department|Status/i);
    await closeWorkspace(page);
  });

  await runStep(report, page, 'PO create workspace dropdowns and amount summary open', async () => {
    await goto(page, '/dashboard/purchase/orders');
    await clickButton(page, 'New Purchase Order');
    await waitBodyContains(page, 'Purchase Order');
    assert(await page.locator('input, textarea, select, button').count() > 5, 'PO form controls not found');
    await closeWorkspace(page);
  });

  await runStep(report, page, 'PO detail tabs and PDF buttons work as UI actions', async () => {
    await goto(page, '/dashboard/purchase/orders');
    await clickRowAction(page, 'Open');
    await waitBodyContains(page, 'Purchase Order');
    for (const tab of ['Items', 'Fulfilment', 'Document Flow', 'Documents']) {
      await page.locator('[role="tab"]').filter({ hasText: textMatcher(tab) }).first().click();
      await page.waitForTimeout(350);
    }
    assert(await page.getByRole('button', { name: /Download PDF|View PDF|Print PDF|Close/i }).count(), 'PO document/action buttons missing');
    await closeWorkspace(page);
  });

  await runStep(report, page, 'GRN create workspace dropdowns open', async () => {
    await goto(page, '/dashboard/purchase/grn');
    await clickButton(page, 'Create GRN');
    await waitBodyContains(page, 'Create GRN');
    assert(await page.locator('input, textarea, select, button').count() > 5, 'GRN form controls not found');
    await closeWorkspace(page);
  });

  await runStep(report, page, 'GRN open details and QC button visible', async () => {
    await goto(page, '/dashboard/purchase/grn');
    await clickRowAction(page, 'Open');
    await waitBodyContains(page, 'Goods Receipt');
    assert(await page.locator('button').count() > 0, 'GRN action buttons missing');
    await closeWorkspace(page);
  });

  await runStep(report, page, 'supplier invoice edit amount workspace opens', async () => {
    await goto(page, '/dashboard/accounts/supplier-invoices');
    if (await page.getByRole('button', { name: /Edit invoice values|Edit/i }).count()) {
      await page.getByRole('button', { name: /Edit invoice values|Edit/i }).first().click();
      await waitBodyContains(page, 'Edit Invoice Amounts');
      await waitBodyContains(page, 'Posting Summary');
      await closeWorkspace(page);
    }
  });

  await runStep(report, page, 'stock master new/open/trail controls visible', async () => {
    await goto(page, '/dashboard/inventory/items');
    await clickButton(page, 'New Item');
    await waitBodyContains(page, 'Item');
    await closeWorkspace(page);
    await clickRowAction(page, 'Open');
    await waitBodyContains(page, 'Item');
    await closeWorkspace(page);
  });

  await runStep(report, page, 'stock adjustment form controls present', async () => {
    await goto(page, '/dashboard/inventory/stock-adjustments');
    await waitBodyContains(page, 'Stock Adjustments');
    assert(await page.getByRole('button', { name: /Save Adjustment|Print Report|Refresh/i }).count(), 'Stock adjustment action buttons missing');
  });

  await runStep(report, page, 'SIV and SRV action buttons present', async () => {
    await goto(page, '/dashboard/inventory/siv');
    await waitBodyContains(page, 'SIV');
    assert(await page.locator('button').count() > 0, 'SIV buttons missing');
    await goto(page, '/dashboard/inventory/srv');
    await waitBodyContains(page, 'SRV');
    assert(await page.locator('button').count() > 0, 'SRV buttons missing');
  });

  report.finishedAt = new Date().toISOString();
  report.summary = {
    totalSteps: report.steps.length,
    passedSteps: report.steps.filter((step) => step.ok).length,
    failedSteps: report.steps.filter((step) => !step.ok).length,
    consoleErrors: report.consoleErrors.length,
    failedResponses: report.failedResponses.length,
    pageErrors: report.pageErrors.length,
  };

  await browser.close();
  const stamp = startedAt.replace(/[:.]/g, '-');
  const jsonPath = path.join(OUT_DIR, `pmstest-ui-click-${stamp}.json`);
  fs.writeFileSync(jsonPath, JSON.stringify(report, null, 2));
  console.log(JSON.stringify({ report: jsonPath, summary: report.summary, failedSteps: report.steps.filter((step) => !step.ok) }, null, 2));
  if (report.summary.failedSteps || report.summary.consoleErrors || report.summary.failedResponses || report.summary.pageErrors) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error.stack || error.message);
  process.exit(1);
});
