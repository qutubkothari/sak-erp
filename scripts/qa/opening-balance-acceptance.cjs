/* Test-only four-stage UAE opening-balance migration acceptance. */
const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

const BASE = process.env.QA_BASE_URL || 'https://mizantra.saksolution.com';
if (!/^https:\/\/mizantra\.saksolution\.com\/?$/i.test(BASE)) throw new Error('Refusing to run opening-balance acceptance outside Mizantra test.');
const env = {};
for (const line of fs.readFileSync(process.env.QA_API_ENV_FILE || path.join(process.cwd(), 'apps/api/.env.test'), 'utf8').split(/\r?\n/)) {
  if (!line || /^\s*#/.test(line) || !line.includes('=')) continue;
  const i = line.indexOf('='); env[line.slice(0, i).trim()] = line.slice(i + 1).trim();
}
const db = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_KEY || env.SUPABASE_KEY);
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

(async () => {
  const auth = {
    preparer: await login('qa_roi_maker'), reviewer: await login('qa_roi_checker'),
    approver: await login('qa_roi_finance'), poster: await login('qa_roi_poster'),
  };
  const tenantId = auth.preparer.user.tenantId || auth.preparer.user.tenant_id;
  assert(tenantId === 'f87a5ab0-0619-4f1c-bab9-e78ca750e56c', 'Unexpected tenant; refusing test data insertion.', tenantId);
  const { error: cleanupError } = await db.from('accounting_opening_balance_batches').delete().eq('tenant_id', tenantId).eq('status', 'DRAFT').like('batch_number', 'QA-OB-UAE-%');
  if (cleanupError) throw cleanupError;
  const tokens = Object.fromEntries(Object.entries(auth).map(([key, value]) => [key, value.accessToken]));
  const codes = ['100000','110000','120000','140000','150000','200000','210000','220000','300000','310000'];
  const { data: accountRows, error: accountError } = await db.from('accounting_accounts').select('id,account_code,account_name,currency_code').eq('tenant_id', tenantId).in('account_code', codes).eq('is_active', true);
  if (accountError) throw accountError;
  const accounts = new Map((accountRows || []).map((row) => [row.account_code, row]));
  assert(accounts.size === codes.length, 'Required UAE ledgers are missing.', { expected: codes, actual: [...accounts.keys()] });
  assert([...accounts.values()].every((row) => row.currency_code === 'AED'), 'Opening ledgers must be AED.', accountRows);
  const definitions = [
    ['100000',200000,0,'QA opening bank'], ['110000',120000,0,'QA opening receivables'], ['120000',80000,0,'QA opening inventory'],
    ['140000',20000,0,'QA opening prepayments'], ['150000',100000,0,'QA opening PPE'], ['200000',0,90000,'QA opening payables'],
    ['210000',0,10000,'QA opening output VAT'], ['220000',0,20000,'QA opening accruals'], ['300000',0,300000,'QA opening share capital'],
    ['310000',0,100000,'QA opening retained earnings'],
  ];
  const lines = definitions.map(([code, debit, credit, description]) => ({ account_id: accounts.get(code).id, debit, credit, description }));
  const totalDebit = lines.reduce((sum, row) => sum + row.debit, 0); const totalCredit = lines.reduce((sum, row) => sum + row.credit, 0);
  assert(totalDebit === 520000 && totalCredit === 520000, 'QA opening balance does not balance.', { totalDebit, totalCredit });
  const beforeRows = (await api(tokens.poster, 'GET', `/accounting/trial-balance?as_of=${today}`)).data;
  const before = new Map(beforeRows.map((row) => [row.account_code, { debit: Number(row.debit), credit: Number(row.credit) }]));
  const batchNumber = `QA-OB-UAE-${stamp}`;
  const created = (await api(tokens.preparer, 'POST', '/accounting/opening-balances', { batch_number: batchNumber, as_of_date: today, source_reference: 'QA signed opening trial balance rehearsal; TEST DATA ONLY', lines })).data;
  const selfValidation = await api(tokens.preparer, 'POST', `/accounting/opening-balances/${created.id}/validate`, undefined, [400]);
  assert(/preparer cannot validate|not assigned as journal reviewer/i.test(JSON.stringify(selfValidation.data)), 'Self-validation gate did not explain maker-checker block.', selfValidation.data);
  const validated = (await api(tokens.reviewer, 'POST', `/accounting/opening-balances/${created.id}/validate`)).data;
  assert(validated.status === 'VALIDATED' && Number(validated.debit) === 520000 && Number(validated.credit) === 520000, 'Independent validation failed.', validated);
  const selfApproval = await api(tokens.reviewer, 'POST', `/accounting/opening-balances/${created.id}/approve`, { approval_note: 'invalid self approval' }, [400]);
  assert(/third finance user|not assigned as journal approver/i.test(JSON.stringify(selfApproval.data)), 'Validator self-approval gate failed.', selfApproval.data);
  const approved = (await api(tokens.approver, 'POST', `/accounting/opening-balances/${created.id}/approve`, { approval_note: 'QA finance approval against signed UAE opening trial balance rehearsal.' })).data;
  assert(approved.status === 'APPROVED', 'Opening-balance approval failed.', approved);
  const wrongPost = await api(tokens.approver, 'POST', `/accounting/opening-balances/${created.id}/post`, undefined, [400]);
  assert(/fourth independent finance user|not assigned as journal poster/i.test(JSON.stringify(wrongPost.data)), 'Approver/poster independence gate failed.', wrongPost.data);
  const posted = (await api(tokens.poster, 'POST', `/accounting/opening-balances/${created.id}/post`)).data;
  assert(posted.batch.status === 'POSTED' && posted.journal.status === 'POSTED', 'Opening batch or journal did not post.', posted);
  assert(posted.journal.transaction_currency_code === 'AED', 'Opening journal is not denominated in AED.', posted.journal);
  const duplicatePost = await api(tokens.poster, 'POST', `/accounting/opening-balances/${created.id}/post`, undefined, [400]);
  assert(/only approved/i.test(JSON.stringify(duplicatePost.data)), 'Repeat posting was not blocked.', duplicatePost.data);
  const afterRows = (await api(tokens.poster, 'GET', `/accounting/trial-balance?as_of=${today}`)).data;
  const after = new Map(afterRows.map((row) => [row.account_code, { debit: Number(row.debit), credit: Number(row.credit) }]));
  const reconciliation = definitions.map(([code, debit, credit]) => ({ code, expected_debit_delta: debit, actual_debit_delta: Number((after.get(code).debit - before.get(code).debit).toFixed(2)), expected_credit_delta: credit, actual_credit_delta: Number((after.get(code).credit - before.get(code).credit).toFixed(2)) }));
  assert(reconciliation.every((row) => row.expected_debit_delta === row.actual_debit_delta && row.expected_credit_delta === row.actual_credit_delta), 'Trial-balance reconciliation failed.', reconciliation);
  const { data: events, error: eventError } = await db.from('accounting_journal_workflow_events').select('event_type,performed_by').eq('tenant_id', tenantId).eq('journal_id', posted.journal.id).order('created_at');
  if (eventError) throw eventError;
  assert(events.map((row) => row.event_type).join(',') === 'PREPARED,REVIEWED,APPROVED,POSTED', 'Journal workflow audit is incomplete.', events);
  assert(new Set(events.map((row) => row.performed_by)).size === 4, 'Four distinct finance users were not recorded.', events);
  const result = { environment: 'MIZANTRA TEST ONLY', tenant_id: tenantId, batch_id: created.id, batch_number: batchNumber, journal_id: posted.journal.id, journal_number: posted.journal.journal_number, currency: posted.journal.transaction_currency_code, totals: { debit: totalDebit, credit: totalCredit }, controls: { self_validation_blocked: true, validator_self_approval_blocked: true, approver_post_blocked: true, duplicate_post_blocked: true, distinct_users: 4 }, workflow_events: events, trial_balance_reconciliation: reconciliation };
  const outputDir = path.join(process.cwd(), 'artifacts/qa'); fs.mkdirSync(outputDir, { recursive: true });
  const output = path.join(outputDir, `opening-balance-acceptance-${stamp}.json`); fs.writeFileSync(output, `${JSON.stringify(result, null, 2)}\n`);
  console.log(JSON.stringify({ ...result, artifact: output }, null, 2));
})().catch((error) => { console.error(error.stack || error); process.exit(1); });
