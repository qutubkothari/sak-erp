const assert = require('node:assert/strict');
const fs = require('node:fs');
const { test } = require('node:test');
const ts = require('typescript');

require.extensions['.ts'] = (module, filename) => {
  const source = fs.readFileSync(filename, 'utf8');
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
    fileName: filename,
  });
  module._compile(outputText, filename);
};

const { hasSuperAdminRole, isPathAllowedForUser } = require('./rbac.ts');

test('AutoHeal admin route is limited to the exact Super Admin role', () => {
  const superAdmin = { role: { name: 'Super Admin' } };
  const normalAdmin = { role: { name: 'Admin' } };
  const employee = { role: { name: 'Employee' } };
  assert.equal(hasSuperAdminRole(superAdmin), true);
  assert.equal(hasSuperAdminRole(normalAdmin), false);
  assert.equal(isPathAllowedForUser(superAdmin, '/dashboard/support/admin'), true);
  assert.equal(isPathAllowedForUser(normalAdmin, '/dashboard/support/admin'), false);
  assert.equal(isPathAllowedForUser(employee, '/dashboard/support/admin/incidents'), false);
  assert.equal(isPathAllowedForUser(employee, '/dashboard/support'), true);
  assert.equal(isPathAllowedForUser(null, '/dashboard/support/admin'), false);
});
