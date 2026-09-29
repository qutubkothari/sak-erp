const { execFileSync } = require('child_process');
const { writeFileSync, mkdirSync } = require('fs');
const path = require('path');

const target = process.argv[2];
if (!['api', 'web'].includes(target)) throw new Error('Expected api or web');
const root = path.resolve(__dirname, '..');
let version = process.env.BUILD_GIT_SHA || '';
if (!version) {
  version = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim();
}
if (!/^[0-9a-f]{40}$/.test(version)) throw new Error('Build provenance requires a full Git commit SHA');
const profile = String(process.env.ERP_TENANT_PROFILE || '').toUpperCase();
if (!['SAIFSEAS', 'MIZANTRA', 'ARWA'].includes(profile)) {
  throw new Error('Set ERP_TENANT_PROFILE to SAIFSEAS, MIZANTRA or ARWA for a release build');
}
const metadata = { version, profile, built_at: new Date().toISOString() };
const output = path.join(root, 'apps', target, target === 'api' ? 'dist' : '.next', 'build-provenance.json');
mkdirSync(path.dirname(output), { recursive: true });
writeFileSync(output, JSON.stringify(metadata) + '\n');
console.log(`Build provenance written: ${target} ${version} ${profile}`);
