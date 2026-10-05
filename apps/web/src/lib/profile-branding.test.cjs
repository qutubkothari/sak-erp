const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '../../../..');
const profiles = JSON.parse(fs.readFileSync(path.join(root, 'tenant/profiles.json'), 'utf8'));
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const sidebar = read('apps/web/src/components/Sidebar.tsx');
const layout = read('apps/web/src/app/layout.tsx');
const dashboardLayout = read('apps/web/src/app/dashboard/layout.tsx');
const login = read('apps/web/src/app/login/page.tsx');
const pwa = read('apps/web/src/components/PWARegister.tsx');
const worker = read('apps/web/public/sw.js');

test('ARWA shell uses the approved Arwa logo and excludes SAK/Saif branding', () => {
  assert.equal(profiles.ARWA.shellLogo, '/branding/arwa-logo.png');
  assert.doesNotMatch(profiles.ARWA.shellLogo, /sak|saif/i);
  assert.doesNotMatch(profiles.ARWA.companyName, /sak|saif automations/i);
});
test('ARWA, MIZANTRA, and SAIFSEAS retain profile-specific names and marks', () => {
  assert.deepEqual([profiles.ARWA.shellLogo, profiles.MIZANTRA.shellLogo, profiles.SAIFSEAS.shellLogo], ['/branding/arwa-logo.png', '/branding/sak-solutions-mark.png', '/branding/saif-seas-logo.png']);
  assert.deepEqual([profiles.ARWA.brand, profiles.MIZANTRA.brand, profiles.SAIFSEAS.brand], ['Arwa', 'Mizantra', 'SaifSeas']);
});
test('unknown profile falls back to generic Mizantra configuration, never Saif', () => {
  const source = read('apps/web/src/lib/profile-branding.ts');
  assert.match(source, /NEXT_PUBLIC_ERP_TENANT_PROFILE \|\| process\.env\.ERP_TENANT_PROFILE/);
  assert.match(source, /brand: 'Mizantra'[\s\S]*?companyName: 'Mizantra ERP'/);
  assert.doesNotMatch(source.slice(source.indexOf('return {', source.indexOf('export function getProfileBranding')), source.indexOf('\n  };', source.indexOf('export function getProfileBranding'))), /Saif/);
});
test('desktop and collapsed desktop sidebar consume the same profile logo/name provider', () => {
  assert.match(sidebar, /const appBranding = getProfileBranding\(\)/);
  assert.match(sidebar, /src=\{appBranding\.logo\}/);
  assert.match(sidebar, /appBranding\.companyName/);
  assert.match(sidebar, /collapsed \? "h-8 w-8"/);
});
test('mobile navigation stays in the same sidebar component and uses profile branding', () => {
  assert.match(sidebar, /appBranding\.logo/);
  assert.match(sidebar, /hideGlobalMobileNavigation/);
});
test('login host resolution and profile fallback use shared branding configuration', () => {
  assert.match(login, /resolveProfileLoginBrand/);
  assert.match(login, /profile\.loginHostContains/);
  assert.match(login, /process\.env\.ERP_TENANT_PROFILE/);
});
test('metadata title, favicon, and manifest are profile aware', () => {
  assert.match(layout, /getProfileBranding/);
  assert.match(layout, /title: `\$\{appBranding\.brand\} ERP`/);
  assert.match(layout, /manifest: appBranding\.manifest/);
  assert.match(layout, /icon: appBranding\.icon/);
  assert.match(dashboardLayout, /document\.title = `\$\{pageTitle\} \| \$\{getProfileBranding\(\)\.brand\} ERP`/);
  assert.doesNotMatch(dashboardLayout, /document\.title = `\$\{pageTitle\} \| SAK ERP`/);
});
test('each profile has a separate PWA manifest and service-worker cache identity', () => {
  assert.equal(profiles.ARWA.manifest, '/manifest-arwa.webmanifest');
  assert.equal(profiles.MIZANTRA.manifest, '/manifest-mizantra.webmanifest');
  assert.match(pwa, /profile=\$\{encodeURIComponent\(profile\)\}/);
  assert.match(worker, /erp-shell-v8-\$\{profile\.toLowerCase\(\)\}/);
  assert.ok(fs.existsSync(path.join(root, 'apps/web/public/manifest-arwa.webmanifest')));
  assert.ok(fs.existsSync(path.join(root, 'apps/web/public/manifest-mizantra.webmanifest')));
});
test('branding changes are shared source rather than per-client forks', () => {
  assert.equal(fs.existsSync(path.join(root, 'apps/web/src/app/arwa')), false);
  assert.equal(fs.existsSync(path.join(root, 'apps/web/src/components/arwa/')), false);
});
test('branding-only change leaves ERP business data and AI capability configuration untouched', () => {
  const { execFileSync } = require('node:child_process');
  const changed = execFileSync('git', ['diff', 'HEAD', '--name-only'], { cwd: root, encoding: 'utf8' }).trim().split(/\r?\n/).filter(Boolean);
  assert.ok(changed.length > 0);
  assert.ok(changed.every((file) => file === 'tenant/profiles.json' || file.startsWith('apps/web/')));
  assert.ok(!changed.some((file) => /migration|\.sql$|business-data|capability/i.test(file)));
});
