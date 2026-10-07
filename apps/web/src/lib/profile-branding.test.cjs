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
  assert.equal(profiles.ARWA.locale, 'en-EG');
  assert.doesNotMatch(profiles.ARWA.shellLogo, /sak|saif/i);
  assert.doesNotMatch(profiles.ARWA.companyName, /sak|saif automations/i);
});
test('locale defaults follow the selected tenant profile and keep unknown profiles neutral', () => {
  const branding = read('apps/web/src/lib/profile-branding.ts');
  const locale = read('apps/web/src/lib/locale.tsx');
  const market = read('apps/web/src/lib/market-profile.ts');
  assert.match(branding, /getProfileLocaleSettings/);
  assert.match(locale, /useState\(profileLocale\.locale\)/);
  assert.match(locale, /useState\(profileLocale\.currency\)/);
  assert.match(market, /marketProfile: 'EGYPT'[\s\S]*locale: 'en-EG'/);
});
test('ARWA, MIZANTRA, and SAIFSEAS retain profile-specific names and marks', () => {
  assert.deepEqual([profiles.ARWA.shellLogo, profiles.MIZANTRA.shellLogo, profiles.SAIFSEAS.shellLogo], ['/branding/arwa-logo.png', '/branding/sak-solutions-mark.png', '/branding/saif-seas-logo.png']);
  assert.deepEqual([profiles.ARWA.brand, profiles.MIZANTRA.brand, profiles.SAIFSEAS.brand], ['Arwa', 'Mizantra', 'SaifSeas']);
});
test('unknown profile falls back to neutral ERP branding, never another tenant', () => {
  const source = read('apps/web/src/lib/profile-branding.ts');
  const nextConfig = read('apps/web/next.config.js');
  assert.match(source, /NEXT_PUBLIC_ERP_TENANT_PROFILE \|\| process\.env\.ERP_TENANT_PROFILE/);
  assert.match(nextConfig, /NEXT_PUBLIC_ERP_TENANT_PROFILE: tenantProfile/);
  const fallback = source.slice(source.indexOf('return {', source.indexOf('export function getProfileBranding')), source.indexOf('\n  };', source.indexOf('export function getProfileBranding')));
  assert.match(fallback, /brand: 'ERP'[\s\S]*?companyName: 'ERP'/);
  assert.match(fallback, /erp-generic\.svg/);
  assert.doesNotMatch(fallback, /Mizantra|Saif|Arwa|SAK/i);
  assert.ok(fs.existsSync(path.join(root, 'apps/web/public/branding/erp-generic.svg')));
  assert.ok(fs.existsSync(path.join(root, 'apps/web/public/manifest-generic.webmanifest')));
});
test('desktop and collapsed desktop sidebar consume the same profile logo/name provider', () => {
  assert.match(sidebar, /const appBranding = getProfileBranding\(\)/);
  assert.match(sidebar, /apiClient\.get<TenantShellBranding>\("\/tenant\/current"\)/);
  assert.match(sidebar, /tenantShellBranding\?\.name\?\.trim\(\) \|\| appBranding\.companyName/);
  assert.match(sidebar, /tenantShellBranding\?\.logo_url\?\.trim\(\) \|\| appBranding\.logo/);
  assert.match(sidebar, /src=\{shellLogo\}/);
  assert.match(sidebar, /appBranding\.companyName/);
  assert.match(sidebar, /collapsed \? "h-8 w-8"/);
});
test('mobile navigation stays in the same sidebar component and uses profile branding', () => {
  assert.match(sidebar, /appBranding\.logo/);
  assert.match(sidebar, /hideGlobalMobileNavigation/);
  assert.match(dashboardLayout, /md:hidden/);
  assert.match(dashboardLayout, /appBranding\.brand/);
  assert.match(dashboardLayout, /src=\{appBranding\.logo\}/);
});
test('login host resolution and profile fallback use shared branding configuration', () => {
  assert.match(login, /resolveProfileLoginBrand/);
  assert.match(login, /profile\.loginHostContains/);
  assert.match(login, /process\.env\.ERP_TENANT_PROFILE/);
});
test('metadata title, favicon, and manifest are profile aware', () => {
  assert.match(layout, /getProfileBranding/);
  assert.match(layout, /title: `\$\{appBranding\.brand\} ERP`/);
  assert.match(layout, /const profile = getTenantProfile\(\) \|\| 'ERP'/);
  assert.doesNotMatch(layout, /process\.env\.ERP_TENANT_PROFILE \|\| 'MIZANTRA'/);
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
  assert.ok(fs.existsSync(path.join(root, 'apps/web/public/manifest-generic.webmanifest')));
});
test('branding changes are shared source rather than per-client forks', () => {
  assert.equal(fs.existsSync(path.join(root, 'apps/web/src/app/arwa')), false);
  assert.equal(fs.existsSync(path.join(root, 'apps/web/src/components/arwa/')), false);
});
test('branding and release-source safeguards do not change ERP business data or AI capability configuration', () => {
  const { execFileSync } = require('node:child_process');
  const changed = execFileSync('git', ['diff', 'HEAD^', 'HEAD', '--name-only'], { cwd: root, encoding: 'utf8' }).trim().split(/\r?\n/).filter(Boolean);
  assert.ok(changed.length > 0);
  assert.ok(!changed.some((file) => /^(apps\/api|database\/|supabase\/)|migration|\.sql$|business-data|capability/i.test(file)));
});
