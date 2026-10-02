const assert = require('node:assert/strict');
const fs = require('node:fs');
const test = require('node:test');
const ts = require('typescript');
const vm = require('node:vm');
const compiled = ts.transpileModule(fs.readFileSync(require.resolve('./brain-context.ts'), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
const sandbox = { exports: {}, Set, Date };
vm.runInNewContext(compiled, sandbox);
const { buildBrainEnvelope } = sandbox.exports;
const config = { profile: 'MIZANTRA', tenant_id: 'tenant', current_user_id: 'user' };
const selection = { entity_type: 'purchase_order', entity_id: '44444444-4444-4444-8444-444444444444', document_number: 'PO-312', current_route: '/dashboard/purchase/orders', tenant_id: 'tenant', current_user_id: 'user', captured_at: 1000 };
test('captures only allowlisted PO envelope fields', () => {
  const context = buildBrainEnvelope({ ...selection, token: 'secret', cookie: 'secret', html: '<body>', unrelated: ['record'] }, config, 'ADMIN', 'en', 1001);
  assert.equal(context.document_number, 'PO-312');
  assert.equal(context.module, 'PURCHASE_ORDER');
  assert.equal(context.profile, 'MIZANTRA');
  for (const field of ['token', 'cookie', 'html', 'unrelated', 'captured_at']) assert.equal(field in context, false);
});
test('rejects stale or future context', () => {
  assert.equal(buildBrainEnvelope(selection, config, '', 'en', 901001), null);
  assert.equal(buildBrainEnvelope(selection, config, '', 'en', 999), null);
});
test('rejects previous tenant or previous user context', () => {
  assert.equal(buildBrainEnvelope(selection, { ...config, tenant_id: 'other' }, '', 'en', 1001), null);
  assert.equal(buildBrainEnvelope(selection, { ...config, current_user_id: 'other' }, '', 'en', 1001), null);
});
test('rejects unsupported entities and secret-bearing routes', () => {
  assert.equal(buildBrainEnvelope({ ...selection, entity_type: 'payroll' }, config, '', 'en', 1001), null);
  assert.equal(buildBrainEnvelope({ ...selection, current_route: '/dashboard/purchase/orders?token=secret' }, config, '', 'en', 1001), null);
});