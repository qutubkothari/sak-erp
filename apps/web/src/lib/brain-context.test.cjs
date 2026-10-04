const assert = require('node:assert/strict');
const fs = require('node:fs');
const test = require('node:test');
const ts = require('typescript');
const vm = require('node:vm');
const compiled = ts.transpileModule(fs.readFileSync(require.resolve('./brain-context.ts'), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
const sandbox = { exports: {}, Set, Date };
vm.runInNewContext(compiled, sandbox);
const { buildBrainEnvelope } = sandbox.exports;
const drawerCompiled = ts.transpileModule(fs.readFileSync(require.resolve('./unified-drawer-session.ts'), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
const drawerSandbox = { exports: {}, Date, URL, URLSearchParams };
vm.runInNewContext(drawerCompiled, drawerSandbox);
const drawer = drawerSandbox.exports;
const drawerScope = {profile:'MIZANTRA',tenant_id:'11111111-1111-4111-8111-111111111111',current_user_id:'22222222-2222-4222-8222-222222222222'};
const drawerOrigin = {current_route:'/dashboard/purchase/orders',entity_type:'purchase_order',entity_id:'33333333-3333-4333-8333-333333333333'};
test('explicit attention entry has priority even with legacy handoff params',()=>{
  assert.equal(drawer.hasExplicitAttentionEntry('?attention_entity=PO&attention_id='+drawerOrigin.entity_id),true);
  assert.equal(drawer.hasExplicitAttentionEntry('?tab=history'),false);
  assert.equal(drawer.attentionEntry('?attention_handoff='+drawerOrigin.entity_id+'&attention_action=DATA_DOCTOR').action,'DATA_DOCTOR');
  assert.equal(drawer.attentionEntry('?attention_handoff=foreign&attention_action=EXECUTE'),null);
});
test('consumed attention URL removes stale retargeting params without changing back-route or other params',()=>{
  assert.equal(drawer.consumedAttentionUrl('https://example.test/dashboard/active-planner?attention_handoff='+drawerOrigin.entity_id+'&attention_action=DATA_DOCTOR&tab=review#answer'),'/dashboard/active-planner?tab=review#answer');
});
test('explicit handoff invalidates suspended report and late old-task replies within owned scope only',()=>{
  const storage=drawerStorage();drawer.writeDrawerSession(storage,drawerScope,drawerOrigin,{session_id:drawerOrigin.entity_id,session_version:1,context_ref:{type:'REPORT',id:drawerScope.tenant_id}});
  drawer.suspendDrawerSession(storage,drawerScope,drawerOrigin);
  const epoch=drawer.attentionTaskEpoch(storage,drawerScope);
  drawer.beginAttentionTask(storage,drawerScope);
  assert.equal(drawer.readDrawerSession(storage,drawerScope,drawerOrigin),null);
  assert.notEqual(drawer.attentionTaskEpoch(storage,drawerScope),epoch);
  assert.equal(drawer.attentionTaskEpoch(storage,{...drawerScope,profile:'ARWA'}),'0');
});
test('Attention task origin remains stable when the ephemeral screen selection expires',()=>{
  const origin=drawer.drawerOrigin('/dashboard/active-planner/attention',drawerOrigin,null);
  assert.equal(drawer.drawerOriginKey(origin),drawer.drawerOriginKey(drawer.drawerOrigin('/dashboard/active-planner/attention',null,null)));
  const storage=drawerStorage();drawer.writeDrawerSession(storage,drawerScope,origin,{session_id:drawerOrigin.entity_id,session_version:1});drawer.suspendDrawerSession(storage,drawerScope,origin);
  assert.equal(drawer.readDrawerSession(storage,drawerScope,origin).status,'SUSPENDED');
});
function drawerStorage() {
  const values = new Map();
  return {getItem:key=>values.get(key)||null,setItem:(key,value)=>values.set(key,value),removeItem:key=>values.delete(key),values};
}
test('drawer close and component remount preserve only opaque working references',()=>{
  const storage=drawerStorage(),now=Date.now();
  drawer.writeDrawerSession(storage,drawerScope,drawerOrigin,{session_id:drawerOrigin.entity_id,session_version:2,conversation_id:drawerScope.current_user_id,context_ref:{type:'REPORT',id:drawerScope.tenant_id,saved_report_id:drawerScope.current_user_id},sql:'SELECT secret',report:{rows:['protected']}},now);
  drawer.suspendDrawerSession(storage,drawerScope,drawerOrigin);
  const restored=drawer.readDrawerSession(storage,drawerScope,drawerOrigin,now+1);
  assert.equal(restored.status,'SUSPENDED');assert.equal(restored.context_ref.saved_report_id,drawerScope.current_user_id);
  assert.equal(restored.conversation_id,drawerScope.current_user_id);
  assert.equal([...storage.values.values()][0].includes('SELECT secret'),false);
  assert.equal([...storage.values.values()][0].includes('protected'),false);
  drawer.writeDrawerSession(storage,drawerScope,drawerOrigin,restored,now+2);
  assert.equal(drawer.readDrawerSession(storage,drawerScope,drawerOrigin,now+3).status,'ACTIVE');
});
test('drawer pointer cannot activate on a materially different entity or route',()=>{
  for(const origin of [{...drawerOrigin,entity_id:drawerScope.current_user_id},{current_route:'/dashboard/inventory/items',entity_type:'item',entity_id:drawerOrigin.entity_id}]){
    const storage=drawerStorage();drawer.writeDrawerSession(storage,drawerScope,drawerOrigin,{session_id:drawerOrigin.entity_id,session_version:1});
    assert.equal(drawer.readDrawerSession(storage,drawerScope,origin),null);
  }
});
test('drawer session identity is isolated by user tenant and profile',()=>{
  const storage=drawerStorage();drawer.writeDrawerSession(storage,drawerScope,drawerOrigin,{session_id:drawerOrigin.entity_id,session_version:1});
  for(const scope of [{...drawerScope,profile:'ARWA'},{...drawerScope,tenant_id:drawerOrigin.entity_id},{...drawerScope,current_user_id:drawerOrigin.entity_id}]) assert.equal(drawer.readDrawerSession(storage,scope,drawerOrigin),null);
});
test('expired drawer pointer is not silently restored or extended by suspension',()=>{
  const storage=drawerStorage(),now=Date.now();drawer.writeDrawerSession(storage,drawerScope,drawerOrigin,{session_id:drawerOrigin.entity_id,session_version:1},now-86400000);
  assert.equal(drawer.readDrawerSession(storage,drawerScope,drawerOrigin,now),null);
});
test('New Request removes report identity while leaving independent fresh screen context',()=>{
  const storage=drawerStorage();storage.setItem('screen-context',JSON.stringify(drawerOrigin));drawer.writeDrawerSession(storage,drawerScope,drawerOrigin,{session_id:drawerOrigin.entity_id,session_version:1});
  drawer.clearDrawerSession(storage,drawerScope);assert.equal(drawer.readDrawerSession(storage,drawerScope,drawerOrigin),null);assert.ok(storage.getItem('screen-context'));
});
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