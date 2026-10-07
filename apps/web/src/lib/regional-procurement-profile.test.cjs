const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '../../../..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const market = read('apps/web/src/lib/market-profile.ts');
const hook = read('apps/web/src/hooks/useRegionalProfile.ts');
const orders = read('apps/web/src/app/dashboard/purchase/orders/page.tsx');
const vendors = read('apps/web/src/app/dashboard/purchase/vendors/page.tsx');

test('ARWA build identity resolves to the Egypt market profile', () => {
  assert.match(market, /market === 'EGYPT' \|\| market === 'ARWA'/);
  assert.match(market, /market === 'UAE' \|\| market === 'MIZANTRA'/);
  assert.match(hook, /NEXT_PUBLIC_ERP_TENANT_PROFILE \|\| process\.env\.ERP_TENANT_PROFILE/);
  assert.match(hook, /setProfile\(buildProfile\)/);
});

test('purchase order currency and tax labels follow the profile without assuming Egypt tax', () => {
  assert.match(orders, /resolveRegionalProfile\([\s\S]*NEXT_PUBLIC_ERP_TENANT_PROFILE/);
  assert.match(orders, /marketProfile === 'EGYPT'[\s\S]*\? 0/);
  assert.match(orders, /supplierCurrency: REGIONAL_PROFILE\.currency/);
  assert.match(orders, /REGIONAL_PROFILE\.taxLabel/);
  assert.doesNotMatch(orders, /₹|taxRate:\s*18|supplierCurrency:\s*'INR'|toLocaleString\('en-IN'/);
});

test('vendor tax verification and documents remain India-only', () => {
  assert.match(vendors, /profile\.marketProfile === "INDIA" \? "GSTIN Verification"/);
  assert.match(vendors, /profile\.taxRegistrationLabel/);
  assert.match(vendors, /profile\.marketProfile === "INDIA" \? <ErpButton/);
  assert.match(vendors, /formatCompanyMoney\(vendor\.credit_limit\)/);
});
