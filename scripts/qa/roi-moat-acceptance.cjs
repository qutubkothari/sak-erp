/* Test-only end-to-end acceptance for the connected ROI moat.
 * Creates persistent records prefixed QA ROI. Refuses every host except Mizantra.
 */
const fs = require('fs');
const path = require('path');
const bcrypt = require('../../apps/api/node_modules/bcryptjs');
const { createClient } = require('@supabase/supabase-js');

const BASE = process.env.QA_BASE_URL || 'https://mizantra.saksolution.com';
const ENV_FILE = process.env.QA_API_ENV_FILE || path.join(process.cwd(), 'apps/api/.env.test');
if (!/^https:\/\/mizantra\.saksolution\.com\/?$/i.test(BASE)) throw new Error('Refusing to run ROI acceptance outside Mizantra test.');

const env = {};
for (const line of fs.readFileSync(ENV_FILE, 'utf8').split(/\r?\n/)) {
  if (!line || /^\s*#/.test(line) || !line.includes('=')) continue;
  const index = line.indexOf('=');
  env[line.slice(0, index).trim()] = line.slice(index + 1).trim();
}
const serviceKey = env.SUPABASE_SERVICE_KEY || env.SUPABASE_KEY;
if (!env.SUPABASE_URL || !serviceKey) throw new Error('Test Supabase credentials are unavailable.');
const db = createClient(env.SUPABASE_URL, serviceKey);
const stamp = new Date().toISOString().replace(/[-:TZ.]/g, '').slice(0, 14);
const today = new Date().toISOString().slice(0, 10);
const dueDate = new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10);
const periodFrom = `${today.slice(0, 7)}-01`;
// The global no-future-date control also governs ROI statements, so acceptance is month-to-date.
const periodTo = today;

function assert(condition, message, detail) {
  if (!condition) throw new Error(`${message}${detail === undefined ? '' : `\n${JSON.stringify(detail, null, 2)}`}`);
}
async function request(token, method, endpoint, body) {
  const response = await fetch(`${BASE}/api/v1${endpoint}`, {
    method,
    headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await response.text();
  let data;
  try { data = text ? JSON.parse(text) : null; } catch { data = text; }
  assert(response.ok, `${method} ${endpoint} failed with ${response.status}`, data);
  return data;
}
async function login(username) {
  const response = await fetch(`${BASE}/api/v1/auth/login`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ username, password: 'Password' }) });
  const data = await response.json();
  assert(response.ok && data.accessToken, `Login failed for ${username}`, data);
  return data;
}
async function qaUser(tenantId, roleId, kind) {
  const username = `qa_roi_${kind}`;
  const password = await bcrypt.hash('Password', 12);
  const values = { tenant_id: tenantId, username, email: `${username}@sak-qa.local`, password, first_name: 'QA ROI', last_name: kind.toUpperCase(), role_id: roleId, is_active: true, metadata: { test_only: true, purpose: 'ROI moat acceptance' } };
  const { data: current, error: findError } = await db.from('users').select('id').eq('username', username).maybeSingle();
  if (findError) throw findError;
  let user;
  if (current) {
    const result = await db.from('users').update(values).eq('id', current.id).select('id,username').single();
    if (result.error) throw result.error;
    user = result.data;
  } else {
    const result = await db.from('users').insert(values).select('id,username').single();
    if (result.error) throw result.error;
    user = result.data;
  }
  const { data: assignment } = await db.from('user_roles').select('user_id').eq('user_id', user.id).eq('role_id', roleId).maybeSingle();
  if (!assignment) {
    const { error } = await db.from('user_roles').insert({ user_id: user.id, role_id: roleId, tenant_id: tenantId });
    if (error && error.code !== '23505') throw error;
  }
  return user;
}

(async () => {
  const admin = await login(process.env.QA_USERNAME || 'hnoman');
  const tenantId = admin.user.tenantId || admin.user.tenant_id;
  const { data: roles, error: roleError } = await db.from('roles').select('id,name').eq('tenant_id', tenantId);
  if (roleError) throw roleError;
  const adminRole = (roles || []).find((role) => ['SUPER ADMIN', 'OWNER', 'ADMIN'].includes(String(role.name).trim().toUpperCase())) || roles?.[0];
  assert(adminRole?.id, 'No test role is available for dedicated ROI users.');
  await Promise.all(['maker', 'checker', 'finance'].map((kind) => qaUser(tenantId, adminRole.id, kind)));
  const [maker, checker, finance] = await Promise.all(['maker', 'checker', 'finance'].map((kind) => login(`qa_roi_${kind}`)));
  const makerToken = maker.accessToken, checkerToken = checker.accessToken, financeToken = finance.accessToken;

  const inventoryDashboard = await request(makerToken, 'GET', '/inventory-working-capital/dashboard');
  const projectDashboard = await request(makerToken, 'GET', '/project-performance/dashboard');
  const item = inventoryDashboard.items?.[0];
  const project = projectDashboard.projects?.[0];
  assert(item?.id, 'At least one test item is required for inventory ROI acceptance.');
  assert(project?.id, 'At least one test project is required for project ROI acceptance.');

  const treasury = await request(makerToken, 'POST', '/treasury-control/actions', {
    action_type: 'NEGOTIATE_FEES', action_description: `QA ROI ${stamp} treasury fee and liquidity optimisation`, owner_reference: 'QA ROI Treasury Owner', due_date: dueDate, target_cash_release: 120000, target_annual_savings: 24000,
  });
  await request(checkerToken, 'PATCH', `/treasury-control/actions/${treasury.id}/approve`, { approval_note: `QA ROI ${stamp} independent treasury business-case approval` });
  await request(makerToken, 'PATCH', `/treasury-control/actions/${treasury.id}/execute`, { execution_evidence: `QA-EVIDENCE-TREASURY-EXEC-${stamp}` });
  await request(checkerToken, 'PATCH', `/treasury-control/actions/${treasury.id}/verify`, { verification_evidence: `QA-EVIDENCE-TREASURY-OUTCOME-${stamp}`, realized_cash_release: 120000, realized_annual_savings: 24000 });

  const inventory = await request(makerToken, 'POST', '/inventory-working-capital/cases', {
    item_id: item.id, classification: 'EXCESS', disposition_action: 'RETURN', quantity: 10, unit_cost: 5000, target_cash_release: 50000, target_annual_carrying_cost_avoidance: 8000, rationale: `QA ROI ${stamp} controlled excess-stock return test`,
  });
  await request(checkerToken, 'PATCH', `/inventory-working-capital/cases/${inventory.id}/approve`, { approval_note: `QA ROI ${stamp} independent disposition approval` });
  await request(makerToken, 'PATCH', `/inventory-working-capital/cases/${inventory.id}/execute`, { execution_evidence: `QA-EVIDENCE-INVENTORY-EXEC-${stamp}` });
  await request(checkerToken, 'PATCH', `/inventory-working-capital/cases/${inventory.id}/verify`, { verification_evidence: `QA-EVIDENCE-INVENTORY-OUTCOME-${stamp}`, realized_cash_release: 50000, realized_carrying_cost_avoidance: 8000 });

  const projectAction = await request(makerToken, 'POST', '/project-performance/actions', {
    project_id: project.id, issue_category: 'COLLECTION', action_description: `QA ROI ${stamp} recover margin and accelerate collection`, owner_reference: 'QA ROI Project Owner', due_date: dueDate, target_margin_recovery: 40000, target_cash_acceleration: 30000,
  });
  await request(checkerToken, 'PATCH', `/project-performance/actions/${projectAction.id}/approve`, { approval_note: `QA ROI ${stamp} independent project recovery approval` });
  await request(makerToken, 'PATCH', `/project-performance/actions/${projectAction.id}/execute`, { execution_evidence: `QA-EVIDENCE-PROJECT-EXEC-${stamp}` });
  await request(checkerToken, 'PATCH', `/project-performance/actions/${projectAction.id}/verify`, { verification_evidence: `QA-EVIDENCE-PROJECT-OUTCOME-${stamp}`, realized_margin_recovery: 40000, realized_cash_acceleration: 30000 });

  const procurement = await request(makerToken, 'POST', '/purchase/spend-intelligence/opportunities', {
    title: `QA ROI ${stamp} price consolidation`, opportunity_type: 'VOLUME_CONSOLIDATION', baseline_spend: 250000, expected_savings: 25000, target_date: dueDate, notes: 'QA ROI controlled procurement acceptance evidence',
  });
  await request(checkerToken, 'PATCH', `/purchase/spend-intelligence/opportunities/${procurement.id}`, { status: 'VALIDATED', notes: `QA ROI ${stamp} independently validated baseline` });
  await request(checkerToken, 'PATCH', `/purchase/spend-intelligence/opportunities/${procurement.id}`, { status: 'REALIZED', realized_savings: 25000, evidence_reference: `QA-EVIDENCE-PROCUREMENT-OUTCOME-${stamp}` });

  const capa = await request(makerToken, 'POST', '/quality-capa', {
    title: `QA ROI ${stamp} recurring defect prevention`, source: 'INTERNAL', severity: 'HIGH', problem_statement: 'QA-only recurring rework cost used for ROI acceptance.', immediate_containment: 'QA-only inspection hold and controlled recheck.', due_date: dueDate, failure_cost: 18000, estimated_annual_avoidance: 36000, supplier_claim_amount: 10000,
  });
  await request(makerToken, 'PATCH', `/quality-capa/${capa.id}/investigate`, { root_cause_method: '5_WHY', root_cause: `QA ROI ${stamp} test root cause linked to controlled process variance` });
  const capaAction = await request(makerToken, 'POST', `/quality-capa/${capa.id}/actions`, { action_type: 'PREVENTIVE', action_description: `QA ROI ${stamp} controlled preventive inspection`, due_date: dueDate });
  await request(makerToken, 'PATCH', `/quality-capa/${capa.id}/submit`, {});
  await request(checkerToken, 'PATCH', `/quality-capa/${capa.id}/approve`, { approval_note: `QA ROI ${stamp} independent CAPA approval` });
  await request(makerToken, 'PATCH', `/quality-capa/actions/${capaAction.id}/complete`, { completion_evidence: `QA-EVIDENCE-QUALITY-EXEC-${stamp}` });
  await request(checkerToken, 'PATCH', `/quality-capa/${capa.id}/verify`, { outcome: 'EFFECTIVE', effectiveness_result: 'QA-only control was effective for the acceptance scenario.', verification_evidence: `QA-EVIDENCE-QUALITY-OUTCOME-${stamp}`, realized_annual_avoidance: 36000, supplier_recovered_amount: 10000 });

  const firstSync = await request(financeToken, 'POST', '/value-realization/sync-sources', {});
  const secondSync = await request(financeToken, 'POST', '/value-realization/sync-sources', {});
  const sourceIds = new Set([treasury.id, inventory.id, projectAction.id, procurement.id, capa.id]);
  let dashboard = await request(financeToken, 'GET', '/value-realization/dashboard');
  const newBenefits = dashboard.source_benefits.filter((row) => sourceIds.has(row.source_record_id));
  assert(newBenefits.length === 9, 'Expected nine connected benefit components from five source records.', newBenefits);
  assert(secondSync.inserted === 0 && secondSync.drifted === 0, 'Second synchronization must be idempotent.', secondSync);
  for (const benefit of newBenefits) {
    await request(financeToken, 'PATCH', `/value-realization/source-benefits/${benefit.id}/verify`, {
      finance_verified_amount: benefit.gross_amount,
      finance_evidence: `QA-FINANCE-EVIDENCE-${benefit.source_module}-${stamp}`,
      finance_note: 'QA-only finance attribution accepted at the independently source-verified amount.',
    });
  }

  dashboard = await request(makerToken, 'GET', '/value-realization/dashboard');
  const treasuryCash = dashboard.source_benefits.find((row) => row.source_record_id === treasury.id && row.source_benefit_key === 'CASH_RELEASE');
  const projectCash = dashboard.source_benefits.find((row) => row.source_record_id === projectAction.id && row.source_benefit_key === 'CASH_ACCELERATION');
  const overlap = await request(makerToken, 'POST', '/value-realization/overlaps', { primary_benefit_id: treasuryCash.id, overlapping_benefit_id: projectCash.id, overlap_amount: 10000, rationale: `QA ROI ${stamp}: common collection event contributes to both treasury release and project acceleration.` });
  await request(checkerToken, 'PATCH', `/value-realization/overlaps/${overlap.id}/approve`, {});

  const profile = await request(makerToken, 'POST', '/value-realization/commercial-profiles', { contract_reference: `QA-ROI-CONTRACT-${stamp}`, service_start_date: periodFrom, implementation_investment: 15000, monthly_subscription_value: 5000, commercial_evidence: `QA-COMMERCIAL-EVIDENCE-${stamp}` });
  await request(checkerToken, 'PATCH', `/value-realization/commercial-profiles/${profile.id}/approve`, {});
  const statement = await request(financeToken, 'POST', '/value-realization/statements', { period_from: periodFrom, period_to: periodTo });
  const issued = await request(makerToken, 'PATCH', `/value-realization/statements/${statement.id}/issue`, {});

  const expectedGross = 275000 + 68000 / 12;
  const expectedNet = expectedGross - 10000;
  assert(Math.abs(Number(issued.gross_benefit) - expectedGross) < 0.02, 'Monthly gross benefit is incorrect.', issued);
  assert(Math.abs(Number(issued.net_benefit) - expectedNet) < 0.02, 'Overlap-adjusted net benefit is incorrect.', issued);
  assert(issued.status === 'ISSUED' && issued.payback_achieved === true, 'Statement issuance/payback control failed.', issued);

  dashboard = await request(financeToken, 'GET', '/value-realization/dashboard');
  const report = {
    environment: BASE, test_only: true, acceptance_id: stamp, tenant_id: tenantId, generated_at: new Date().toISOString(),
    qa_users: ['qa_roi_maker', 'qa_roi_checker', 'qa_roi_finance'],
    source_records: { treasury: treasury.id, inventory: inventory.id, project: projectAction.id, procurement: procurement.id, quality: capa.id },
    controls: {
      source_components_connected: newBenefits.length,
      first_sync: firstSync, second_sync: secondSync,
      exact_source_deduplication: secondSync.inserted === 0,
      finance_verified_components: newBenefits.length,
      overlap_id: overlap.id, overlap_deduction: 10000,
      statement_status: issued.status, statement_hash: issued.statement_hash,
      benefit_snapshot_count: issued.benefit_snapshot.length,
    },
    economics_aed: {
      one_time_benefit: 275000, annualized_benefit: 68000,
      monthly_annualized_credit: 68000 / 12, monthly_gross_benefit: Number(issued.gross_benefit),
      overlap_deduction: Number(issued.overlap_deduction), monthly_net_benefit: Number(issued.net_benefit),
      implementation_investment: 15000, monthly_subscription: Number(issued.subscription_value),
      cumulative_client_cost: Number(issued.cumulative_client_cost), net_value_created: Number(issued.net_value_created),
      roi_pct: Number(issued.roi_pct), payback_achieved: issued.payback_achieved,
    },
    dashboard_kpis: dashboard.kpis,
  };
  const outputDirectory = path.join(process.cwd(), 'artifacts', 'qa');
  fs.mkdirSync(outputDirectory, { recursive: true });
  const output = path.join(outputDirectory, `roi-moat-acceptance-${stamp}.json`);
  fs.writeFileSync(output, JSON.stringify(report, null, 2));
  console.log(JSON.stringify({ PASS: true, output, report }, null, 2));
})().catch((error) => {
  console.error(error.stack || error.message || error);
  process.exit(1);
});
