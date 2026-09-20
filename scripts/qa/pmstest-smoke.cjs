const fs = require('fs');
const path = require('path');

const playwrightModule = process.env.PLAYWRIGHT_MODULE || 'playwright';
const { chromium } = require(playwrightModule);

const BASE_URL = process.env.QA_BASE_URL || 'https://mizantra.saksolution.com';
const USERNAME = process.env.QA_USERNAME || 'hnoman';
const PASSWORD = process.env.QA_PASSWORD || 'Password';
const OUT_DIR = process.env.QA_OUT_DIR || path.join(process.cwd(), 'qa-results');

const routes = [
  { name: 'Dashboard', path: '/dashboard' },
  { name: 'Vendors', path: '/dashboard/purchase/vendors' },
  { name: 'Purchase Requisitions', path: '/dashboard/purchase/requisitions' },
  { name: 'Purchase Orders', path: '/dashboard/purchase/orders' },
  { name: 'GRN', path: '/dashboard/purchase/grn' },
  { name: 'Debit Notes', path: '/dashboard/purchase/debit-notes' },
  { name: 'Stock Master', path: '/dashboard/inventory/items' },
  { name: 'Stock Adjustments', path: '/dashboard/inventory/stock-adjustments' },
  { name: 'SIV', path: '/dashboard/inventory/siv' },
  { name: 'SRV', path: '/dashboard/inventory/srv' },
  { name: 'Accounts Payable', path: '/dashboard/accounts/payables' },
  { name: 'Supplier Invoices', path: '/dashboard/accounts/supplier-invoices' },
  { name: 'HR Employees', path: '/dashboard/hr/employees' },
  { name: 'HR Management', path: '/dashboard/hr/management' },
];

const viewports = [
  { name: 'desktop', width: 1365, height: 768 },
  { name: 'mobile', width: 390, height: 844 },
];

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function isIgnorableNetworkFailure(url, status) {
  if (url.includes('/favicon.ico') && status === 404) return true;
  return false;
}

async function login(page, run) {
  const loginResponses = [];
  page.on('response', async (response) => {
    if (response.url().includes('/api/v1/auth/login')) {
      let body = '';
      try {
        body = (await response.text()).slice(0, 1000);
      } catch {
        body = '';
      }
      loginResponses.push({ status: response.status(), body });
    }
  });

  await page.goto(`${BASE_URL}/login`, { waitUntil: 'domcontentloaded' });
  await page.locator('#username').fill(USERNAME);
  await page.locator('#password').fill(PASSWORD);
  await Promise.all([
    page.waitForURL(/\/dashboard/, { timeout: 20000 }).catch(() => null),
    page.getByRole('button', { name: /sign in|continue/i }).click(),
  ]);

  if (!page.url().includes('/dashboard')) {
    const selector = page.locator('select#tenant');
    if (await selector.count()) {
      await selector.selectOption({ index: 0 });
      await Promise.all([
        page.waitForURL(/\/dashboard/, { timeout: 20000 }).catch(() => null),
        page.getByRole('button', { name: /continue|sign in/i }).click(),
      ]);
    }
  }

  run.loginUrlAfterSubmit = page.url();
  run.loginResponses = loginResponses;
  run.loginSucceeded = page.url().includes('/dashboard');
  if (!run.loginSucceeded) {
    run.loginText = (await page.locator('body').innerText().catch(() => '')).slice(0, 1000);
    throw new Error('Login failed');
  }
}

async function apiLogin() {
  const response = await fetch(`${BASE_URL}/api/v1/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: USERNAME, password: PASSWORD }),
  });
  const body = await response.text();
  let data = null;
  try {
    data = body ? JSON.parse(body) : null;
  } catch {
    data = body;
  }
  if (!response.ok || !data?.accessToken || !data?.refreshToken || !data?.user) {
    throw new Error(`API login failed: ${response.status} ${body.slice(0, 500)}`);
  }
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

async function inspectRoute(page, route, viewportName) {
  const entry = {
    route: route.name,
    path: route.path,
    viewport: viewportName,
    url: `${BASE_URL}${route.path}`,
    ok: false,
    title: '',
    bodySample: '',
    consoleErrors: [],
    failedResponses: [],
    pageError: null,
    layout: null,
  };

  const consoleListener = (msg) => {
    if (msg.type() === 'error') {
      entry.consoleErrors.push(msg.text().slice(0, 1000));
    }
  };
  const responseListener = (response) => {
    const status = response.status();
    const url = response.url();
    if (status >= 400 && !isIgnorableNetworkFailure(url, status)) {
      entry.failedResponses.push({ status, url });
    }
  };
  const pageErrorListener = (error) => {
    entry.pageError = String(error?.message || error).slice(0, 1000);
  };

  page.on('console', consoleListener);
  page.on('response', responseListener);
  page.on('pageerror', pageErrorListener);
  try {
    await page.goto(entry.url, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForLoadState('networkidle', { timeout: 12000 }).catch(() => null);
    entry.title = await page.title().catch(() => '');
    entry.bodySample = (await page.locator('body').innerText().catch(() => '')).slice(0, 1200);
    entry.layout = await page.evaluate(() => {
      const doc = document.documentElement;
      const body = document.body;
      const buttons = Array.from(document.querySelectorAll('button'));
      const inputs = Array.from(document.querySelectorAll('input, select, textarea'));
      const clippedButtons = buttons
        .filter((button) => button.scrollWidth > button.clientWidth + 2)
        .slice(0, 10)
        .map((button) => (button.textContent || button.getAttribute('aria-label') || '').trim());
      return {
        viewportWidth: window.innerWidth,
        viewportHeight: window.innerHeight,
        documentScrollWidth: doc.scrollWidth,
        bodyScrollWidth: body.scrollWidth,
        pageHorizontalOverflow: Math.max(doc.scrollWidth, body.scrollWidth) > window.innerWidth + 4,
        buttonCount: buttons.length,
        inputCount: inputs.length,
        clippedButtons,
      };
    });
    entry.ok =
      entry.bodySample.length > 0 &&
      !/minified react error|application error|cannot read properties|runtime error/i.test(entry.bodySample) &&
      !entry.pageError &&
      entry.consoleErrors.length === 0 &&
      entry.failedResponses.length === 0;
  } catch (error) {
    entry.pageError = String(error?.message || error).slice(0, 1000);
  } finally {
    page.off('console', consoleListener);
    page.off('response', responseListener);
    page.off('pageerror', pageErrorListener);
  }

  return entry;
}

async function inspectRouteInIsolatedPage(context, route, viewportName) {
  const page = await context.newPage();
  try {
    return await inspectRoute(page, route, viewportName);
  } finally {
    await page.close().catch(() => null);
  }
}

async function main() {
  ensureDir(OUT_DIR);
  const startedAt = new Date().toISOString();
  const browser = await chromium.launch({ headless: true });
  const auth = await apiLogin();
  const report = {
    baseUrl: BASE_URL,
    username: USERNAME,
    startedAt,
    finishedAt: null,
    baseline: {},
    authUser: {
      id: auth.user.id,
      username: auth.user.username,
      email: auth.user.email,
    },
    runs: [],
    summary: {},
  };

  for (const viewport of viewports) {
    const context = await browser.newContext({
      viewport: { width: viewport.width, height: viewport.height },
      ignoreHTTPSErrors: true,
    });
    await seedSession(context, auth);
    const run = { viewport: viewport.name, loginSucceeded: true, loginUrlAfterSubmit: 'api-session-seeded', routes: [] };
    try {
      for (const route of routes) {
        run.routes.push(await inspectRouteInIsolatedPage(context, route, viewport.name));
      }
    } catch (error) {
      run.fatal = String(error?.message || error);
    } finally {
      report.runs.push(run);
      await context.close();
    }
  }

  await browser.close();

  const allRoutes = report.runs.flatMap((run) => run.routes);
  report.finishedAt = new Date().toISOString();
  report.summary = {
    totalRouteChecks: allRoutes.length,
    passedRouteChecks: allRoutes.filter((route) => route.ok).length,
    failedRouteChecks: allRoutes.filter((route) => !route.ok).length,
    consoleErrorRoutes: allRoutes.filter((route) => route.consoleErrors.length > 0).length,
    networkErrorRoutes: allRoutes.filter((route) => route.failedResponses.length > 0).length,
    pageErrorRoutes: allRoutes.filter((route) => route.pageError).length,
    horizontalOverflowRoutes: allRoutes.filter((route) => route.layout?.pageHorizontalOverflow).length,
  };

  const stamp = startedAt.replace(/[:.]/g, '-');
  const jsonPath = path.join(OUT_DIR, `pmstest-smoke-${stamp}.json`);
  fs.writeFileSync(jsonPath, JSON.stringify(report, null, 2));
  console.log(JSON.stringify({ report: jsonPath, summary: report.summary }, null, 2));
  if (report.summary.failedRouteChecks > 0) process.exitCode = 1;
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
