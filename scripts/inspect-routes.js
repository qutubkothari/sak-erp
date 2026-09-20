const { chromium } = require('playwright');

const baseURL = process.env.SMOKE_BASE_URL || 'http://localhost:3001';
const apiURL = process.env.SMOKE_API_URL || 'http://localhost:4000';
const username = process.env.SMOKE_USER || 'padma_n';
const password = process.env.SMOKE_PASSWORD || 'password';
const token = process.env.SMOKE_TOKEN || '';

const routes = [
  '/dashboard',
  '/dashboard/purchase/service-entries',
  '/dashboard/inventory/low-stock',
  '/dashboard/production/job-orders/smart-items',
  '/dashboard/production/job-orders',
  '/dashboard/production/subcontracting',
  '/dashboard/hr/employees?section=employees&tab=attendance',
  '/dashboard/accounts/supplier-invoices',
  '/dashboard/accounts/payables',
];

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  let login;
  if (token) {
    const user = await fetch(`${apiURL}/api/v1/auth/me`, {
      headers: { authorization: `Bearer ${token}` },
    }).then((response) => response.json());
    login = { accessToken: token, refreshToken: token, user };
  } else {
    login = await fetch(`${apiURL}/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ username, password }),
    }).then((response) => response.json());
  }

  await page.goto(`${baseURL}/login`);
  await page.evaluate((auth) => {
    localStorage.setItem('accessToken', auth.accessToken);
    localStorage.setItem('refreshToken', auth.refreshToken || '');
    localStorage.setItem('user', JSON.stringify(auth.user));
    localStorage.setItem('userId', auth.user?.id || auth.userId || '');
    localStorage.setItem('tenantId', auth.user?.tenantId || auth.tenantId || '');
  }, login);

  for (const route of routes) {
    const failed = [];
    page.removeAllListeners('response');
    page.on('response', (response) => {
      if (response.status() >= 400) {
        failed.push(`${response.status()} ${response.url()}`);
      }
    });

    try {
      await page.goto(`${baseURL}${route}`, { waitUntil: 'networkidle', timeout: 30000 });
    } catch (error) {
      failed.push(`goto ${error.message}`);
    }

    const title = await page.title();
    const headings = await page
      .locator('h1,h2,[data-testid],.erp-page-title')
      .evaluateAll((elements) => elements.slice(0, 8).map((element) => element.textContent?.trim()).filter(Boolean))
      .catch(() => []);
    const text = (await page.locator('body').innerText({ timeout: 5000 }).catch(() => ''))
      .slice(0, 500)
      .replace(/\s+/g, ' ');

    console.log(JSON.stringify({ route, title, headings, failed, text }, null, 2));
  }

  await browser.close();
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
