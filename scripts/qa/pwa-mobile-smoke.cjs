const path = require('path');

function loadPlaywright() {
  try {
    return require('playwright');
  } catch {
    return require(path.join(process.cwd(), 'apps/web/node_modules/playwright'));
  }
}

const { chromium, devices } = loadPlaywright();

const baseUrl = process.env.QA_BASE_URL || 'http://localhost:3101';
const username = process.env.QA_USERNAME || 'hnoman';
const password = process.env.QA_PASSWORD || 'Password';

async function apiLogin() {
  const response = await fetch(`${baseUrl}/api/v1/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });
  if (!response.ok) {
    throw new Error(`Login failed for PWA smoke: ${response.status} ${await response.text()}`);
  }
  return response.json();
}

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ ...devices['iPhone 12'] });
  const auth = await apiLogin();
  await context.addInitScript((session) => {
    localStorage.setItem('accessToken', session.accessToken);
    localStorage.setItem('refreshToken', session.refreshToken);
    localStorage.setItem('user', JSON.stringify(session.user));
    localStorage.setItem('userId', session.user.id);
  }, auth);
  const page = await context.newPage();
  const results = {};

  await page.goto(`${baseUrl}/login`, { waitUntil: 'domcontentloaded', timeout: 45000 });
  await page.locator('input, button').first().waitFor({ state: 'visible', timeout: 15000 });
  results.loginUrl = page.url();
  results.manifest = await page.locator('link[rel="manifest"]').first().getAttribute('href');
  results.themeColor = await page.locator('meta[name="theme-color"]').getAttribute('content');
  results.loginHorizontalOverflow = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
  );

  const manifestResponse = await page.request.get(`${baseUrl}/manifest.webmanifest`);
  results.manifestStatus = manifestResponse.status();
  const swResponse = await page.request.get(`${baseUrl}/sw.js`);
  results.serviceWorkerStatus = swResponse.status();
  const offlineResponse = await page.request.get(`${baseUrl}/offline.html`);
  results.offlineStatus = offlineResponse.status();

  await page.goto(`${baseUrl}/dashboard/purchase/vendors`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1500);
  results.sidebarDisplay = await page.locator('aside').evaluate((el) => getComputedStyle(el).display).catch(() => 'missing');
  results.mobileNavDisplay = await page
    .locator('nav[aria-label="Mobile primary navigation"]')
    .evaluate((el) => getComputedStyle(el).display)
    .catch(() => 'missing');
  results.mobileNavLinks = await page
    .locator('nav[aria-label="Mobile primary navigation"] a')
    .evaluateAll((links) => links.map((link) => ({
      text: link.textContent?.trim() || '',
      href: link.getAttribute('href') || '',
    })))
    .catch(() => []);
  results.desktopTableWrapperDisplay = await page
    .locator('table')
    .first()
    .evaluate((el) => getComputedStyle(el.closest('div')).display)
    .catch(() => 'no-table');
  results.mobileCards = await page.locator('article').count();
  results.dashboardWidth = await page.evaluate(() => ({
    client: document.documentElement.clientWidth,
    scroll: document.documentElement.scrollWidth,
  }));

  console.log(JSON.stringify(results, null, 2));

  const failures = [];
  if (results.manifest !== '/manifest.webmanifest') failures.push('manifest link missing');
  if (results.themeColor !== '#8B6F47') failures.push('theme color missing');
  if (results.manifestStatus !== 200) failures.push('manifest not served');
  if (results.serviceWorkerStatus !== 200) failures.push('service worker not served');
  if (results.offlineStatus !== 200) failures.push('offline page not served');
  if (results.sidebarDisplay !== 'none') failures.push('desktop sidebar visible on mobile');
  if (results.mobileNavDisplay === 'none' || results.mobileNavDisplay === 'missing') failures.push('mobile nav hidden');
  if (!results.mobileNavLinks.some((link) => link.href.includes('/dashboard/purchase/requisitions'))) failures.push('PR link missing in mobile nav');
  if (!results.mobileNavLinks.some((link) => link.href.includes('/dashboard/purchase/orders'))) failures.push('PO link missing in mobile nav');
  if (!results.mobileNavLinks.some((link) => link.href.includes('/dashboard/purchase/grn'))) failures.push('GRN link missing in mobile nav');
  if (results.desktopTableWrapperDisplay !== 'none' && results.desktopTableWrapperDisplay !== 'no-table') {
    failures.push('desktop table visible on mobile');
  }

  await browser.close();

  if (failures.length) {
    console.error(`PWA/mobile smoke failed: ${failures.join(', ')}`);
    process.exit(1);
  }
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
