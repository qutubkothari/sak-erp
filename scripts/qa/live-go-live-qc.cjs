const fs = require('fs');
const path = require('path');

function loadPlaywright() {
  try {
    return require('playwright');
  } catch {
    return require(path.join(process.cwd(), 'apps/web/node_modules/playwright'));
  }
}

const { chromium, devices } = loadPlaywright();

const BASE = process.env.QA_BASE_URL || 'https://erp.saifseas.com';
const USER = process.env.QA_USERNAME || 'hnoman';
const PASS = process.env.QA_PASSWORD || 'Password';
const OUT = path.join(process.cwd(), 'qa-results');
fs.mkdirSync(OUT, { recursive: true });

const startedAt = new Date().toISOString();
const report = {
  base: BASE,
  user: USER,
  startedAt,
  checks: [],
  summary: { total: 0, passed: 0, failed: 0 },
};

const outputFile = path.join(
  OUT,
  `go-live-qc-${startedAt.replace(/[:.]/g, '-')}.json`,
);

function flush() {
  report.summary = {
    total: report.checks.length,
    passed: report.checks.filter((c) => c.ok).length,
    failed: report.checks.filter((c) => !c.ok).length,
  };
  fs.writeFileSync(outputFile, JSON.stringify(report, null, 2));
}

const badText = [
  /Failed to fetch/i,
  /Internal server error/i,
  /Cannot (GET|POST|PUT|PATCH|DELETE)/i,
  /Application error/i,
  /Unhandled Runtime Error/i,
  /schema cache/i,
  /does not exist/i,
  /duplicate key value violates/i,
  /TypeError: fetch failed/i,
];

const routes = [
  ['Dashboard', '/dashboard', ['Operations Dashboard', 'Dashboard']],
  ['Manager Dashboard', '/dashboard/manager', ['Manager Approval Dashboard']],
  ['Purchase overview', '/dashboard/purchase', ['Purchase Management']],
  ['Vendors', '/dashboard/purchase/vendors', ['Vendors']],
  ['Purchase Requisitions', '/dashboard/purchase/requisitions', ['Purchase Requisitions', 'New Requisition']],
  ['Purchase Orders', '/dashboard/purchase/orders', ['Purchase Orders', 'New Purchase Order']],
  ['GRN', '/dashboard/purchase/grn', ['Goods Receipt Notes', 'Create GRN']],
  ['Import Files', '/dashboard/purchase/import-files', ['Import']],
  ['Service Entry Sheets', '/dashboard/purchase/service-entries', ['Service Entry Sheets', 'Record Service Entry']],
  ['Debit Notes', '/dashboard/purchase/debit-notes', ['Debit Notes']],
  ['Stock Master', '/dashboard/inventory/items', ['Stock Master', 'New Item']],
  ['Low Stock Planning', '/dashboard/inventory/low-stock', ['Low Stock Planning']],
  ['Stock Adjustments', '/dashboard/inventory/stock-adjustments', ['Stock Adjustments']],
  ['SIV', '/dashboard/inventory/siv', ['Store Issue Voucher', 'SIV']],
  ['SRV', '/dashboard/inventory/srv', ['Store Receipt Voucher', 'SRV']],
  ['Production Create JO', '/dashboard/production/job-orders/smart-items', ['Create Job Order']],
  ['Production View JO', '/dashboard/production/job-orders', ['Job Orders']],
  ['Subcontracting', '/dashboard/production/subcontracting', ['Subcontracting']],
  ['BOM', '/dashboard/bom', ['Bill of Materials', 'BOM']],
  ['Supplier Invoices', '/dashboard/accounts/supplier-invoices', ['Supplier Invoices']],
  ['Accounts Payable', '/dashboard/accounts/payables', ['Accounts Payable']],
  ['HR Attendance', '/dashboard/hr/employees?section=employees&tab=attendance', ['Attendance', 'Check In', 'Check Out']],
  ['HR Leaves', '/dashboard/hr/employees?section=employees&tab=leaves', ['Leave']],
  ['HR Management Employees', '/dashboard/hr/management?section=management&tab=employees', ['HR Management', 'Employees']],
  ['HR Management Attendance', '/dashboard/hr/management?section=management&tab=attendance', ['Attendance']],
  ['Payroll redirect', '/dashboard/hr/payroll', ['Payroll']],
  ['BOM direct', '/dashboard/bom', ['BOM']],
  ['Settings', '/dashboard/settings', ['Settings']],
];

async function apiLogin() {
  const res = await fetch(`${BASE}/api/v1/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: USER, password: PASS }),
  });
  const txt = await res.text();
  if (!res.ok) throw new Error(`Login failed ${res.status}: ${txt}`);
  return JSON.parse(txt);
}

async function seed(ctx, auth) {
  await ctx.addInitScript((s) => {
    localStorage.setItem('accessToken', s.accessToken);
    localStorage.setItem('refreshToken', s.refreshToken);
    localStorage.setItem('user', JSON.stringify(s.user));
    localStorage.setItem('userId', s.user.id);
  }, auth);
}

async function withTimeout(label, fn, ms = 45000) {
  let timer;
  return Promise.race([
    fn(),
    new Promise((_, reject) => {
      timer = setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms);
    }),
  ]).finally(() => clearTimeout(timer));
}

async function visibleText(page) {
  return page.locator('body').innerText({ timeout: 5000 }).catch(() => '');
}

async function runCheck(name, fn) {
  const started = Date.now();
  const check = { name, ok: false, reason: '', ms: 0 };
  try {
    await withTimeout(name, fn);
    check.ok = true;
    check.reason = 'OK';
  } catch (err) {
    check.reason = String(err && err.message ? err.message : err).slice(0, 2500);
  } finally {
    check.ms = Date.now() - started;
    report.checks.push(check);
    flush();
    console.log(`${check.ok ? 'PASS' : 'FAIL'} ${name} (${check.ms}ms)`);
    if (!check.ok) console.log(check.reason);
  }
}

async function newAuthedPage(browser, auth, viewport = { width: 1440, height: 1000 }) {
  const context = await browser.newContext({ viewport, ignoreHTTPSErrors: true });
  await seed(context, auth);
  const page = await context.newPage();
  return { context, page };
}

async function routeCheck(browser, auth, name, url, expected) {
  const { context, page } = await newAuthedPage(browser, auth);
  const failed = [];
  const consoleErrors = [];
  const pageErrors = [];
  page.on('response', (r) => {
    const status = r.status();
    const u = r.url();
    if (status >= 400 && !/favicon|manifest|sw\.js/.test(u)) {
      failed.push({ status, url: u.slice(0, 240) });
    }
  });
  page.on('console', (m) => {
    const text = m.text();
    if (m.type() === 'error' && !/excalidraw|chrome-extension|Failed to fetch RSC payload/.test(text)) {
      consoleErrors.push(text.slice(0, 600));
    }
  });
  page.on('pageerror', (e) => pageErrors.push(String(e.message || e).slice(0, 600)));
  try {
    await page.goto(BASE + url, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForLoadState('networkidle', { timeout: 9000 }).catch(() => {});
    await page.waitForTimeout(800);
    const text = await visibleText(page);
    const hasExpected = expected.some((part) => text.toLowerCase().includes(part.toLowerCase()));
    const bads = badText.filter((rx) => rx.test(text)).map(String);
    const stuck = /Loading\.\.\.|Please wait\.{3}/i.test(text) && !/Check In|Check Out/i.test(text);
    if (!hasExpected || failed.length || consoleErrors.length || pageErrors.length || bads.length || stuck) {
      throw new Error(JSON.stringify({
        url,
        hasExpected,
        failed,
        consoleErrors,
        pageErrors,
        bads,
        stuck,
        sample: text.slice(0, 900),
      }, null, 2));
    }
  } finally {
    await context.close().catch(() => {});
  }
}

async function main() {
  const auth = await apiLogin();
  report.authUser = {
    username: auth.user && auth.user.username,
    role: auth.user && auth.user.role && auth.user.role.name,
  };
  flush();
  const browser = await chromium.launch({ headless: true });
  try {
    for (const [name, url, expected] of routes) {
      await runCheck(name, () => routeCheck(browser, auth, name, url, expected));
    }

    await runCheck('PR create modal: item search and required date available', async () => {
      const { context, page } = await newAuthedPage(browser, auth);
      try {
        await page.goto(BASE + '/dashboard/purchase/requisitions', { waitUntil: 'domcontentloaded' });
        await page.getByRole('button', { name: /New Requisition/i }).click({ timeout: 12000 });
        const text1 = await visibleText(page);
        if (!/Required Date/i.test(text1)) throw new Error('Required Date not visible on PR general screen');
        await page.getByRole('button', { name: /Items/i }).click({ timeout: 12000 });
        const text2 = await visibleText(page);
        if (!/Line Items|Items/i.test(text2)) throw new Error('PR Items tab did not open');
        if ((await page.locator('input[placeholder*="Search item"], input[placeholder*="item code"], input[placeholder*="name"], input[placeholder*="description"]').count()) < 1) {
          throw new Error('PR item/product search input missing');
        }
      } finally {
        await context.close().catch(() => {});
      }
    });

    await runCheck('PO create modal: payment terms/project/docs/search controls available', async () => {
      const { context, page } = await newAuthedPage(browser, auth);
      try {
        await page.goto(BASE + '/dashboard/purchase/orders', { waitUntil: 'domcontentloaded' });
        await page.getByRole('button', { name: /New Purchase Order/i }).click({ timeout: 12000 });
        const text = await visibleText(page);
        for (const label of ['Payment Terms', 'Project Name', 'Documents / Quotation']) {
          if (!text.toLowerCase().includes(label.toLowerCase())) throw new Error(`${label} missing on PO create`);
        }
      } finally {
        await context.close().catch(() => {});
      }
    });

    await runCheck('GRN create modal: approved PO dropdown opens and service warning does not block material screen', async () => {
      const { context, page } = await newAuthedPage(browser, auth);
      try {
        await page.goto(BASE + '/dashboard/purchase/grn', { waitUntil: 'domcontentloaded' });
        await page.getByRole('button', { name: /Create GRN/i }).click({ timeout: 12000 });
        const text = await visibleText(page);
        if (!/Purchase Order/i.test(text) || !/Invoice Number/i.test(text)) throw new Error('GRN create modal missing header fields');
        if (/Failed to fetch|schema cache|does not exist|Internal server error/i.test(text)) throw new Error(`GRN create shows error text: ${text.slice(0, 800)}`);
      } finally {
        await context.close().catch(() => {});
      }
    });

    await runCheck('SES record modal: approved service PO picker opens', async () => {
      const { context, page } = await newAuthedPage(browser, auth);
      try {
        await page.goto(BASE + '/dashboard/purchase/service-entries', { waitUntil: 'domcontentloaded' });
        await page.getByRole('button', { name: /Record Service Entry/i }).click({ timeout: 12000 });
        const text = await visibleText(page);
        if (!/Record Service Entry|Approved Service PO|Submit for Acceptance/i.test(text)) throw new Error(`SES modal did not open correctly: ${text.slice(0, 800)}`);
      } finally {
        await context.close().catch(() => {});
      }
    });

    await runCheck('Mobile employee attendance: clean tab UI and logout visible', async () => {
      const context = await browser.newContext({ ...devices['iPhone 12'], ignoreHTTPSErrors: true });
      await seed(context, auth);
      const page = await context.newPage();
      try {
        await page.goto(BASE + '/dashboard/hr/employees?section=employees&tab=attendance', { waitUntil: 'domcontentloaded' });
        await page.waitForTimeout(1500);
        const text = await visibleText(page);
        if (!/Attendance/i.test(text) || !/Check In/i.test(text) || !/Check Out/i.test(text)) {
          throw new Error(`Mobile attendance controls missing: ${text.slice(0, 700)}`);
        }
        if (!/Logout/i.test(text)) throw new Error('Mobile logout tab missing');
        if (/Employee workspace for attendance|Monitor daily punch|operational base/i.test(text)) {
          throw new Error('Mobile attendance still includes clutter/help text');
        }
      } finally {
        await context.close().catch(() => {});
      }
    });
  } finally {
    await browser.close().catch(() => {});
  }
  flush();
  const failed = report.checks.filter((c) => !c.ok);
  console.log(JSON.stringify({ file: outputFile, summary: report.summary, failed }, null, 2));
  if (failed.length) process.exit(1);
}

main().catch((err) => {
  report.checks.push({ name: 'QC runner fatal', ok: false, reason: String(err && err.stack ? err.stack : err) });
  flush();
  console.error(err);
  process.exit(1);
});
