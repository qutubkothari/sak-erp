/* Mizantra-only UAE accounting template activation and four-stage workflow acceptance. */
const fs = require('fs');
const path = require('path');
const bcrypt = require('../../apps/api/node_modules/bcryptjs');
const { createClient } = require('@supabase/supabase-js');

const BASE = process.env.QA_BASE_URL || 'https://mizantra.saksolution.com';
if (!/^https:\/\/mizantra\.saksolution\.com\/?$/i.test(BASE)) throw new Error('Refusing to activate UAE accounting outside Mizantra test.');
const env = {};
for (const line of fs.readFileSync(process.env.QA_API_ENV_FILE || path.join(process.cwd(), 'apps/api/.env.test'), 'utf8').split(/\r?\n/)) {
  if (!line || /^\s*#/.test(line) || !line.includes('=')) continue;
  const i = line.indexOf('='); env[line.slice(0, i).trim()] = line.slice(i + 1).trim();
}
const key = env.SUPABASE_SERVICE_KEY || env.SUPABASE_KEY;
const db = createClient(env.SUPABASE_URL, key);
const today = new Date().toISOString().slice(0, 10);
const stamp = new Date().toISOString().replace(/[-:TZ.]/g, '').slice(0, 14);
function assert(value, message, detail) { if (!value) throw new Error(`${message}${detail === undefined ? '' : `\n${JSON.stringify(detail, null, 2)}`}`); }
async function login(username) {
  const response = await fetch(`${BASE}/api/v1/auth/login`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ username, password: 'Password' }) });
  const data = await response.json(); assert(response.ok && data.accessToken, `Login failed for ${username}`, data); return data;
}
async function api(token, method, endpoint, body, allowed = [200, 201]) {
  const response = await fetch(`${BASE}/api/v1${endpoint}`, { method, headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' }, body: body === undefined ? undefined : JSON.stringify(body) });
  const text = await response.text(); let data; try { data = text ? JSON.parse(text) : null; } catch { data = text; }
  assert(allowed.includes(response.status), `${method} ${endpoint} returned ${response.status}`, data); return { status: response.status, data };
}
async function ensureUser(tenantId, roleId, username, label) {
  const password = await bcrypt.hash('Password', 12);
  const values = { tenant_id: tenantId, username, email: `${username}@sak-qa.local`, password, first_name: 'QA Finance', last_name: label, role_id: roleId, is_active: true, metadata: { test_only: true, purpose: 'UAE accounting acceptance' } };
  const { data: existing, error: lookupError } = await db.from('users').select('id').eq('username', username).maybeSingle(); if (lookupError) throw lookupError;
  const result = existing ? await db.from('users').update(values).eq('id', existing.id).select('id,username').single() : await db.from('users').insert(values).select('id,username').single();
  if (result.error) throw result.error;
  const { data: link } = await db.from('user_roles').select('user_id').eq('user_id', result.data.id).eq('role_id', roleId).maybeSingle();
  if (!link) { const inserted = await db.from('user_roles').insert({ user_id: result.data.id, role_id: roleId, tenant_id: tenantId }); if (inserted.error && inserted.error.code !== '23505') throw inserted.error; }
  return result.data;
}

(async () => {
  const adminAuth = await login('hnoman');
  const tenantId = adminAuth.user.tenantId || adminAuth.user.tenant_id;
  const adminId = adminAuth.user.id;
  const { data: roles, error: roleError } = await db.from('roles').select('id,name').eq('tenant_id', tenantId); if (roleError) throw roleError;
  const role = (roles || []).find((row) => ['SUPER ADMIN','OWNER','ADMIN'].includes(String(row.name).trim().toUpperCase())) || roles?.[0]; assert(role?.id, 'No administrative role available.');
  const users = {
    preparer: await ensureUser(tenantId, role.id, 'qa_roi_maker', 'PREPARER'),
    reviewer: await ensureUser(tenantId, role.id, 'qa_roi_checker', 'REVIEWER'),
    approver: await ensureUser(tenantId, role.id, 'qa_roi_finance', 'APPROVER'),
    poster: await ensureUser(tenantId, role.id, 'qa_roi_poster', 'POSTER'),
  };
  const tokens = {
    preparer: (await login(users.preparer.username)).accessToken,
    reviewer: (await login(users.reviewer.username)).accessToken,
    approver: (await login(users.approver.username)).accessToken,
    poster: (await login(users.poster.username)).accessToken,
  };

  const accountDefinitions = [
    ['100000','Cash and Bank','ASSET','BANK',true,false], ['110000','Trade Receivables','ASSET','RECEIVABLE',true,false],
    ['120000','Inventory','ASSET','INVENTORY',true,false], ['130000','Recoverable Input VAT','ASSET','INPUT_TAX',true,false],
    ['140000','Prepayments and Deposits','ASSET','PREPAYMENT',false,false], ['150000','Property Plant and Equipment','ASSET','FIXED_ASSET',false,false],
    ['159000','Accumulated Depreciation','ASSET','ACCUMULATED_DEPRECIATION',false,false], ['200000','Trade Payables','LIABILITY','PAYABLE',true,false],
    ['210000','Output VAT Payable','LIABILITY','OUTPUT_TAX',true,false], ['220000','Accrued Expenses','LIABILITY','ACCRUAL',false,false],
    ['230000','Employee Settlements','LIABILITY','EMPLOYEE_PAYABLE',false,false], ['240000','Corporate Tax Payable','LIABILITY','CORPORATE_TAX',false,false],
    ['300000','Share Capital','EQUITY','CAPITAL',false,false], ['310000','Retained Earnings','EQUITY','RETAINED_EARNINGS',false,false],
    ['400000','Goods Sales Revenue','REVENUE','GOODS_SALES',false,false], ['410000','Service Revenue','REVENUE','SERVICE_SALES',false,false],
    ['500000','Cost of Goods Sold','EXPENSE','COGS',false,false], ['510000','Purchases and Direct Materials','EXPENSE','PURCHASE',false,false],
    ['520000','Payroll and Employee Cost','EXPENSE','PAYROLL',false,false], ['530000','Operating Overheads','EXPENSE','OVERHEAD',false,false],
    ['540000','Depreciation Expense','EXPENSE','DEPRECIATION',false,false], ['550000','Foreign Exchange Gain or Loss','EXPENSE','FX',false,false],
    ['590000','Suspense and Clearing','LIABILITY','SUSPENSE',false,true],
  ];
  const accountRows = accountDefinitions.map(([account_code,account_name,account_type,account_subtype,is_control_account,is_suspense_account]) => ({ tenant_id: tenantId, account_code, account_name, account_type, account_subtype, is_control_account, is_suspense_account, currency_code: 'AED', is_active: true, created_by: adminId, updated_at: new Date().toISOString() }));
  const accountResult = await db.from('accounting_accounts').upsert(accountRows, { onConflict: 'tenant_id,account_code' }).select(); if (accountResult.error) throw accountResult.error;
  const accounts = new Map(accountResult.data.map((row) => [row.account_code, row]));

  const gstDisable = await db.from('accounting_tax_codes').update({ is_active: false }).eq('tenant_id', tenantId).eq('tax_type', 'GST'); if (gstDisable.error) throw gstDisable.error;
  const vatDefinitions = [
    ['UAE-VAT-STD-5','UAE VAT Standard Rated 5%',5,'130000','210000'],
    ['UAE-VAT-ZERO-0','UAE VAT Zero Rated',0,'130000','210000'],
    ['UAE-VAT-EXEMPT-0','UAE VAT Exempt Supply',0,null,null],
    ['UAE-VAT-OOS-0','UAE VAT Out of Scope',0,null,null],
    ['UAE-VAT-RCM-5','UAE VAT Reverse Charge 5%',5,'130000','210000'],
  ];
  const taxRows = vatDefinitions.map(([tax_code,tax_name,rate,input,output]) => ({ tenant_id: tenantId, tax_code, tax_name, tax_type: 'VAT', rate, input_account_id: input ? accounts.get(input).id : null, output_account_id: output ? accounts.get(output).id : null, is_active: true }));
  const taxResult = await db.from('accounting_tax_codes').upsert(taxRows, { onConflict: 'tenant_id,tax_code' }).select(); if (taxResult.error) throw taxResult.error;

  const disabledRoles = await db.from('accounting_workflow_role_assignments').update({ is_active: false, updated_at: new Date().toISOString() }).eq('tenant_id', tenantId); if (disabledRoles.error) throw disabledRoles.error;
  const assignments = [
    [users.preparer.id,'JOURNAL_PREPARER'], [users.reviewer.id,'JOURNAL_REVIEWER'], [users.approver.id,'JOURNAL_APPROVER'], [users.poster.id,'JOURNAL_POSTER'],
    [users.preparer.id,'PAYMENT_PREPARER'], [users.reviewer.id,'PAYMENT_APPROVER'], [users.poster.id,'PAYMENT_POSTER'],
  ].map(([user_id,workflow_role]) => ({ tenant_id: tenantId, user_id, workflow_role, is_active: true, assigned_by: adminId, updated_at: new Date().toISOString() }));
  const assignmentResult = await db.from('accounting_workflow_role_assignments').upsert(assignments, { onConflict: 'tenant_id,user_id,workflow_role' }).select(); if (assignmentResult.error) throw assignmentResult.error;

  const rules = [
    ['SALES_INVOICE','UAE sales invoice to receivables','110000','400000','210000'],
    ['SALES_RECEIPT','UAE customer receipt to bank','100000','110000',null],
    ['PURCHASE_INVOICE','UAE purchase invoice to payables','510000','200000','130000'],
    ['SERVICE_INVOICE','UAE service invoice to receivables','110000','410000','210000'],
    ['SUBCONTRACT_RECEIPT','UAE subcontract cost to payables','500000','200000','130000'],
    ['PAYROLL_RUN','UAE payroll accrual','520000','220000',null],
    ['STOCK_ADJUSTMENT','UAE stock adjustment to clearing','120000','590000',null],
  ];
  const currentRules = (await api(adminAuth.accessToken, 'GET', '/accounting/posting-rules')).data;
  for (const [source, name, debit, credit, tax] of rules) {
    const existing = currentRules.find((row) => row.source_type === source);
    const payload = { rule_name: name, debit_account_id: accounts.get(debit).id, credit_account_id: accounts.get(credit).id, tax_account_id: tax ? accounts.get(tax).id : null, narration_template: `${name}: {{document_number}}`, is_active: true };
    if (existing) await api(adminAuth.accessToken, 'PATCH', `/accounting/posting-rules/${existing.id}`, payload);
    else await api(adminAuth.accessToken, 'POST', '/accounting/posting-rules', { ...payload, rule_code: `UAE-${source}`, source_type: source });
  }

  const journal = (await api(tokens.preparer, 'POST', '/accounting/journals', {
    journal_number: `QA-UAE-VAT-${stamp}`, journal_date: today, source_type: 'MANUAL_UAE_ACCEPTANCE', transaction_currency_code: 'AED', exchange_rate: 1,
    narration: `QA UAE ${stamp} four-stage VAT workflow acceptance`,
    lines: [
      { account_id: accounts.get('110000').id, debit: 105, credit: 0, description: 'QA trade receivable' },
      { account_id: accounts.get('400000').id, debit: 0, credit: 100, description: 'QA goods revenue' },
      { account_id: accounts.get('210000').id, debit: 0, credit: 5, tax_code: 'UAE-VAT-STD-5', description: 'QA output VAT' },
    ],
  })).data;
  const selfReview = await api(tokens.preparer, 'POST', `/accounting/journals/${journal.id}/review`, { review_status: 'APPROVED' }, [400]);
  await api(tokens.reviewer, 'POST', `/accounting/journals/${journal.id}/review`, { review_status: 'APPROVED', review_note: 'QA UAE independent review completed.' });
  await api(tokens.approver, 'POST', `/accounting/journals/${journal.id}/approve`, { approval_status: 'APPROVED', approval_note: 'QA UAE independent approval completed.' });
  const wrongPoster = await api(tokens.approver, 'POST', `/accounting/journals/${journal.id}/post`, {}, [400]);
  const posted = (await api(tokens.poster, 'POST', `/accounting/journals/${journal.id}/post`, {})).data;

  const activeAccounts = (await api(adminAuth.accessToken, 'GET', '/accounting/accounts?active=true')).data;
  const taxCodes = (await api(adminAuth.accessToken, 'GET', '/accounting/tax-codes')).data;
  const workflow = (await api(adminAuth.accessToken, 'GET', '/accounting/workflow-roles')).data;
  const finalRules = (await api(adminAuth.accessToken, 'GET', '/accounting/posting-rules')).data.filter((row) => row.is_active && rules.some(([source]) => source === row.source_type));
  const taxRegister = (await api(adminAuth.accessToken, 'GET', `/accounting/tax-register?from=${today}&to=${today}`)).data;
  const uaeIds = new Set(accountResult.data.map((row) => row.id));
  assert(accountResult.data.length === accountDefinitions.length && accountResult.data.every((row) => row.currency_code === 'AED'), 'UAE AED chart activation failed.', accountResult.data);
  assert(taxCodes.filter((row) => row.is_active && row.tax_type === 'VAT').length === 5, 'Expected five active UAE VAT treatments.', taxCodes);
  assert(taxCodes.filter((row) => row.is_active && row.tax_type === 'GST').length === 0, 'Legacy GST codes must be inactive on the UAE test tenant.', taxCodes);
  assert(workflow.filter((row) => row.is_active).length === 7 && new Set(workflow.filter((row) => row.is_active).map((row) => row.user_id)).size === 4, 'Seven duties across four users are required.', workflow);
  assert(finalRules.length === 7 && finalRules.every((row) => uaeIds.has(row.debit_account_id) && uaeIds.has(row.credit_account_id)), 'Every posting rule must map to the UAE ledger.', finalRules);
  assert(posted.status === 'POSTED' && Number(posted.total_debit) === 105 && Number(posted.total_credit) === 105, 'Four-stage journal did not post correctly.', posted);
  assert(/not assigned as journal reviewer|preparer cannot review/i.test(String(selfReview.data.message || '')), 'Preparer review was not blocked.', selfReview.data);
  assert(String(wrongPoster.data.message || '').includes('not assigned as journal poster'), 'Unassigned poster was not blocked.', wrongPoster.data);
  const vatEntry = taxRegister.entries.find((row) => row.journal_id === journal.id && row.tax_code === 'UAE-VAT-STD-5');
  assert(vatEntry && Number(vatEntry.credit) === 5, 'UAE VAT register did not capture the posted VAT line.', taxRegister);

  const report = {
    pass: true, environment: BASE, test_only: true, activation_id: stamp, tenant_id: tenantId,
    chart: { uae_accounts: accountDefinitions.length, currency: 'AED' },
    tax: { active_uae_vat_codes: 5, active_legacy_gst_codes: 0, posted_output_vat: 5 },
    workflow: { active_assignments: 7, distinct_users: 4, self_review_blocked: true, wrong_poster_blocked: true },
    posting_rules: { active_uae_mapped_rules: 7 },
    acceptance_journal: { id: journal.id, journal_number: journal.journal_number, status: posted.status, debit: Number(posted.total_debit), credit: Number(posted.total_credit) },
  };
  const dir = path.join(process.cwd(), 'artifacts', 'qa'); fs.mkdirSync(dir, { recursive: true });
  const output = path.join(dir, `uae-accounting-activation-${stamp}.json`); fs.writeFileSync(output, JSON.stringify(report, null, 2));
  console.log(JSON.stringify({ output, report }, null, 2));
})().catch((error) => { console.error(error.stack || error.message || error); process.exit(1); });
