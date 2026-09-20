const { chromium } = require('playwright');

const baseURL = process.env.SMOKE_BASE_URL || 'http://localhost:3001';
const username = process.env.SMOKE_USER || 'taher@saifautomations.com';
const password = process.env.SMOKE_PASSWORD || 'password';
const suppliedToken = process.env.SMOKE_TOKEN || '';

const routes = [
  ['/dashboard', 'Operations Dashboard', ['Operations Dashboard', 'Executive Cockpit']],
  ['/dashboard/purchase', 'Purchase overview', ['Purchase Management']],
  ['/dashboard/purchase/requisitions', 'Purchase Requisitions', ['Purchase Requisitions']],
  ['/dashboard/purchase/orders', 'Purchase Orders', ['Purchase Orders']],
  ['/dashboard/purchase/vendors', 'Vendors', ['Vendors']],
  ['/dashboard/purchase/grn', 'GRN', ['Goods Receipt Notes']],
  ['/dashboard/purchase/service-entries', 'Service Entry Sheets', ['Service Entry Sheets']],
  ['/dashboard/inventory/items', 'Stock Master', ['Stock Master', 'Material Master']],
  ['/dashboard/inventory/low-stock', 'Low Stock Planning', ['Low Stock Planning']],
  ['/dashboard/inventory/siv', 'SIV', ['Store Issue Voucher']],
  ['/dashboard/inventory/srv', 'SRV', ['Store Receipt Voucher']],
  ['/dashboard/production/job-orders/smart-items', 'Create Job Order', ['Create Job Order']],
  ['/dashboard/production/job-orders', 'View Job Orders', ['Job Orders']],
  ['/dashboard/production/subcontracting', 'Subcontracting', ['Subcontracting']],
  ['/dashboard/hr/employees?section=employees&tab=attendance', 'Employee Attendance', ['Attendance']],
  ['/dashboard/hr/management?section=management&tab=attendance', 'HR Management Attendance', ['Attendance history', 'Attendance Report']],
  ['/dashboard/accounts/supplier-invoices', 'Supplier Invoices', ['Supplier Invoices']],
  ['/dashboard/accounts/payables', 'Accounts Payable', ['Accounts Payable']],
];

function visibleTextRegex(words) {
  return new RegExp(words.map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|'), 'i');
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 1100 } });
  const page = await context.newPage();
  const failures = [];
  const requests = [];
  page.on('pageerror', (err) => failures.push({ type: 'pageerror', route: page.url(), message: err.message }));
  page.on('console', (msg) => {
    if (['error'].includes(msg.type())) {
      failures.push({ type: 'console', route: page.url(), message: msg.text().slice(0, 400) });
    }
  });
  page.on('response', async (res) => {
    const url = res.url();
    if (url.includes('/api/') && res.status() >= 400) {
      requests.push({ status: res.status(), method: res.request().method(), url });
    }
  });

  const result = {
    baseURL,
    login: 'not-run',
    routes: [],
    failures,
    failedRequests: requests,
  };

  try {
    let authData;
    if (suppliedToken) {
      const meResponse = await fetch(`${baseURL}/api/v1/auth/me`, {
        headers: { authorization: `Bearer ${suppliedToken}` },
      });
      const meData = await meResponse.json().catch(() => null);
      const meUser = meData?.user || meData;
      if (!meResponse.ok || !meUser?.id) {
        throw new Error(`Token auth failed: ${meResponse.status} ${JSON.stringify(meData).slice(0, 300)}`);
      }
      authData = { accessToken: suppliedToken, refreshToken: suppliedToken, user: meUser };
    } else {
      const authResponse = await fetch(`${baseURL}/api/v1/auth/login`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      authData = await authResponse.json().catch(() => null);
      if (!authResponse.ok || !authData?.accessToken || !authData?.refreshToken) {
        throw new Error(`API login failed: ${authResponse.status} ${JSON.stringify(authData).slice(0, 300)}`);
      }
    }
    const user = authData.user || {};
    await page.goto(baseURL, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.evaluate(({ accessToken, refreshToken, user }) => {
      localStorage.setItem('accessToken', accessToken);
      localStorage.setItem('refreshToken', refreshToken);
      localStorage.setItem('user', JSON.stringify(user));
      localStorage.setItem('userId', user.id || '');
      localStorage.setItem('tenantId', user.tenantId || user.tenant_id || '');
    }, authData);
    await page.goto(`${baseURL}/dashboard`, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => null);
    result.login = page.url().includes('/dashboard') ? 'passed' : `ended-at:${page.url()}`;
  } catch (err) {
    result.login = `failed:${err.message}`;
  }

  for (const [path, name, expected] of routes) {
    const entry = { path, name, status: 'not-run', titleFound: false, error: null };
    try {
      await page.goto(`${baseURL}${path}`, { waitUntil: 'domcontentloaded', timeout: 30000 });
      await page.waitForLoadState('networkidle', { timeout: 12000 }).catch(() => null);
      const locator = page.getByText(visibleTextRegex(expected)).first();
      entry.titleFound = await locator.isVisible({ timeout: 7000 }).catch(() => false);
      const bodyText = (await page.locator('body').innerText({ timeout: 10000 })).slice(0, 1000);
      if (/failed to fetch|application error|something went wrong|cannot get \/api/i.test(bodyText)) {
        entry.status = 'failed';
        entry.error = bodyText.match(/(Failed to fetch|Application error|Something went wrong|Cannot GET[^\n]*)/i)?.[0] || 'error text visible';
      } else if (!entry.titleFound) {
        entry.status = 'warning';
        entry.error = `Expected heading/text missing: ${expected.join(' / ')}`;
      } else {
        entry.status = 'passed';
      }
    } catch (err) {
      entry.status = 'failed';
      entry.error = err.message;
    }
    result.routes.push(entry);
  }

  console.log(JSON.stringify(result, null, 2));
  await browser.close();
  if (result.login !== 'passed' || result.routes.some((r) => r.status === 'failed') || requests.length) {
    process.exitCode = 1;
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
