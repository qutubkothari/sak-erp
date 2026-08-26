const { chromium } = require('playwright');
const base = process.env.QA_BASE_URL || 'https://mizantra.saksolution.com';
const username = process.env.QA_USERNAME || 'hnoman';
const password = process.env.QA_PASSWORD || 'Password';
(async () => {
  const login = await fetch(`${base}/api/v1/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username, password }) }).then(r => r.json());
  const browser = await chromium.launch({ headless: true }); const context = await browser.newContext();
  await context.addInitScript((s) => { localStorage.setItem('accessToken', s.accessToken); localStorage.setItem('refreshToken', s.refreshToken); localStorage.setItem('user', JSON.stringify(s.user)); localStorage.setItem('userId', s.user.id); }, login);
  const page = await context.newPage(); const go = async () => { await page.goto(`${base}/dashboard/production/subcontracting`, { waitUntil: 'domcontentloaded', timeout: 15000 }); await page.waitForTimeout(1500); };
  await go(); const must = async (name) => { const b = page.getByRole('button', { name }).first(); await b.click({ timeout: 4000 }); await page.waitForTimeout(150); };
  // Payables are now owned by Accounts; the subcontracting workspace has only
  // operational tabs. Keep this smoke aligned with the supported UI flow.
  for (const name of [/Orders/i, /Routes/i, /Vendor WIP/i]) await must(name);
  await must(/New Route/i);
  await page.getByRole('heading', { name: /Create Process Route/i }).waitFor({ state: 'visible', timeout: 10000 });
  await page.getByRole('button', { name: /Cancel/i }).click();
  await must(/New Order/i);
  await page.getByRole('heading', { name: /Create Subcontracting Order/i }).waitFor({ state: 'visible', timeout: 10000 });
  await page.getByRole('button', { name: /Cancel/i }).click();
  await must(/Orders/i); const view = page.getByRole('button', { name: /View order document flow/i }).first(); if (await view.count()) { await view.click(); await page.getByText(/Document Flow/i).first().waitFor({ timeout: 8000 }); const qc = page.getByRole('button', { name: /QC Decision/i }).first(); if (await qc.count()) { await qc.click(); await page.getByText(/Subcontract GRN QC/i).waitFor({ timeout: 8000 }); await page.getByRole('button', { name: /Cancel/i }).click(); } }
  console.log(JSON.stringify({ pass: true, base, checks: ['tabs','route modal','order modal','document flow','qc dialog when pending receipt exists'] })); await browser.close();
})().catch(e => { console.error(e.stack || e.message); process.exit(1); });
