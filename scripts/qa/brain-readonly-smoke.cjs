const path = require('node:path');
const { createRequire } = require('node:module');
const assert = require('node:assert/strict');
const root = process.cwd();
const apiRequire = createRequire(path.join(root, 'apps/api/package.json'));
apiRequire('dotenv').config({ path: path.join(root, 'apps/api/.env'), quiet: true });
const { createClient } = apiRequire('@supabase/supabase-js');
const db = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
const registry = JSON.parse(process.env.BRAIN_SCHEMA_REGISTRY || 'null') || require(path.join(root, 'apps/api/dist/intelligence/brain-registry.js')).BRAIN_REGISTRY;
const phase = process.env.BRAIN_PROBE_PHASE || 'SCHEMA';
const profile = process.env.ERP_TENANT_PROFILE;
const report = { profile, phase, schema: {}, smoke: {}, business_writes: 0, request_paths: [] };

async function schema() {
  for (const [type, resolver] of Object.entries(registry)) {
    const columns = resolver.parent ? `${resolver.columns},brain_parent:${resolver.parent.table}!inner(tenant_id)` : resolver.columns;
    const result = await db.from(resolver.table).select(columns).limit(0);
    report.schema[type] = result.error ? `BLOCKED:${result.error.code || 'QUERY_ERROR'}` : 'PASS';
  }
  const rows = await db.from('smart_import_batch_rows').select('row_reference,decision,validation,target_entity,tenant_id,batch_id').limit(0);
  report.schema.smart_import_rows = rows.error ? `BLOCKED:${rows.error.code || 'QUERY_ERROR'}` : 'PASS';
  assert(Object.values(report.schema).every(value => value === 'PASS'), 'Brain schema compatibility failed.');
}

async function smoke() {
  const users = await db.from('users').select('id,tenant_id,role:roles(name)').eq('is_active', true).limit(100);
  assert(!users.error, 'Authorized smoke actors could not be inspected.');
  const user = (users.data || []).find(row => ['SUPER_ADMIN', 'ADMIN', 'ADMINISTRATOR'].includes(String(row.role?.name || '').toUpperCase().replace(/[ -]/g, '_')));
  if (!user) { report.smoke.actor = 'NOT TESTABLE'; return; }
  assert(process.env.JWT_SECRET, 'An explicitly configured JWT secret is required for authenticated read-only smoke.');
  const token = apiRequire('jsonwebtoken').sign({ sub: user.id, tenantId: user.tenant_id }, process.env.JWT_SECRET, { expiresIn: '5m' });
  const origin = process.env.BRAIN_API_ORIGIN || `http://127.0.0.1:${process.env.PORT || 4000}`;
  async function request(route, body, expected = 200) {
    assert(['/active-planner/brain/configuration', '/active-planner/brain/context', '/active-planner/interpret'].includes(route), 'Mutation route forbidden.');
    report.request_paths.push(route);
    const response = await fetch(`${origin}/api/v1${route}`, { method: body ? 'POST' : 'GET', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, ...(body ? { body: JSON.stringify(body) } : {}), signal: AbortSignal.timeout(20000) });
    assert.equal(response.status, body ? (expected === 200 ? 201 : expected) : expected, `Read-only request ${route} failed: HTTP ${response.status}`);
    return response.json();
  }
  const configuration = await request('/active-planner/brain/configuration');
  report.smoke.enabled = configuration.enabled;
  assert.equal(configuration.profile, profile);
  assert.equal(configuration.actionPlannerMode, 'PREVIEW_ONLY');
  if (!configuration.enabled) { report.smoke.context = 'OFF'; return; }
  const base = { profile, tenant_id: user.tenant_id, current_user_id: user.id, current_route: '/dashboard/purchase/orders', locale: 'en' };
  const po = await db.from('purchase_orders').select('id,pr_id,tenant_id').eq('tenant_id', user.tenant_id).order('created_at', { ascending: false }).limit(1);
  assert(!po.error, 'Existing purchase order lookup failed.');
  if (po.data?.length) {
    const context = { ...base, entity_type: 'purchase_order', entity_id: po.data[0].id };
    const validated = await request('/active-planner/brain/context', context);
    assert.equal(validated.context?.entity_id, context.entity_id);
    const answer = await request('/active-planner/interpret', { message: 'Why is this still open?', brain_context: context });
    assert.equal(answer.provider, 'DETERMINISTIC_BRAIN_V1');
    assert.equal(answer.safety.read_only, true);
    assert(answer.evidence.some(entry => entry.claim === 'PO_RECEIPT_STATE'));
    report.smoke.po_context = 'PASS';
    const trace = await request('/active-planner/interpret', { message: 'Which PR did this come from?', brain_context: context });
    assert.equal(trace.provider, 'DETERMINISTIC_BRAIN_V1');
    report.smoke.purchase_trace = trace.entities.some(entity => entity.entity_type === 'purchase_requisition') ? 'PASS' : 'NOT TESTABLE: no authorized recorded PR link';
    const foreignTenant = await db.from('tenants').select('id').neq('id', user.tenant_id).limit(1);
    const forgedTenant = foreignTenant.data?.[0]?.id || '00000000-0000-4000-8000-000000000001';
    await request('/active-planner/brain/context', { ...context, tenant_id: forgedTenant }, 403);
    report.smoke.tenant_forgery = 'PASS';
  } else { report.smoke.po_context = 'NOT TESTABLE'; report.smoke.purchase_trace = 'NOT TESTABLE'; }
  for (const [type, message] of [['smart_import_batch', 'Why are these rows blocked?'], ['autoqa_finding', 'What exactly is wrong?']]) {
    const resolver = registry[type];
    const record = await db.from(resolver.table).select('id').eq('tenant_id', user.tenant_id).eq('profile', profile).limit(1);
    assert(!record.error, `${type} existing record lookup failed.`);
    if (!record.data?.length) { report.smoke[type] = 'NOT TESTABLE'; continue; }
    const answer = await request('/active-planner/interpret', { message, brain_context: { ...base, entity_type: type, entity_id: record.data[0].id } });
    assert.equal(answer.provider, 'DETERMINISTIC_BRAIN_V1');
    assert(answer.evidence.length);
    report.smoke[type] = 'PASS';
  }
  const preview = await request('/active-planner/interpret', { message: 'Create PRs for all items below reorder level' });
  assert.equal(preview.action_plan?.mode, 'PREVIEW_ONLY'); assert.equal(preview.action_plan?.executable, false);
  report.smoke.preview_only = 'PASS';
}

(async () => {
  try { await schema(); if (phase === 'SMOKE') await smoke(); console.log(JSON.stringify(report)); }
  catch (error) { report.error = String(error.message).replace(/Bearer\s+\S+/gi, '[redacted]'); console.log(JSON.stringify(report)); process.exitCode = 1; }
})();