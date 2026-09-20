/* Test-only UAE bank format, ownership and reconciliation acceptance. */
const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
const BASE = process.env.QA_BASE_URL || 'https://mizantra.saksolution.com';
if (!/^https:\/\/mizantra\.saksolution\.com\/?$/i.test(BASE)) throw new Error('Refusing to run outside Mizantra test.');
const env = {};
for (const line of fs.readFileSync(process.env.QA_API_ENV_FILE || path.join(process.cwd(), 'apps/api/.env.test'), 'utf8').split(/\r?\n/)) { if (!line || /^\s*#/.test(line) || !line.includes('=')) continue; const i = line.indexOf('='); env[line.slice(0, i).trim()] = line.slice(i + 1).trim(); }
const db = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_KEY || env.SUPABASE_KEY);
const today = new Date().toISOString().slice(0, 10);
const stamp = new Date().toISOString().replace(/[-:TZ.]/g, '').slice(0, 14);
function assert(value, message, detail) { if (!value) throw new Error(`${message}${detail === undefined ? '' : `\n${JSON.stringify(detail, null, 2)}`}`); }
async function login(username) { const response = await fetch(`${BASE}/api/v1/auth/login`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ username, password: 'Password' }) }); const data = await response.json(); assert(response.ok && data.accessToken, `Login failed for ${username}`, data); return data; }
async function api(token, method, endpoint, body, allowed = [200, 201]) { const response = await fetch(`${BASE}/api/v1${endpoint}`, { method, headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' }, body: body === undefined ? undefined : JSON.stringify(body) }); const text = await response.text(); let data; try { data = text ? JSON.parse(text) : null; } catch { data = text; } assert(allowed.includes(response.status), `${method} ${endpoint} returned ${response.status}`, data); return { status: response.status, data }; }
async function postJournal(tokens, accounts, number, direction, amount, counterCode, narration) {
  const bank = accounts.get('101000').id; const counter = accounts.get(counterCode).id;
  const lines = direction === 'IN' ? [{ account_id: bank, debit: amount, credit: 0, description: narration }, { account_id: counter, debit: 0, credit: amount, description: narration }] : [{ account_id: counter, debit: amount, credit: 0, description: narration }, { account_id: bank, debit: 0, credit: amount, description: narration }];
  const journal = (await api(tokens.preparer, 'POST', '/accounting/journals', { journal_number: number, journal_date: today, source_type: 'BANK_RECON_QA', transaction_currency_code: 'AED', exchange_rate: 1, narration, lines })).data;
  await api(tokens.reviewer, 'POST', `/accounting/journals/${journal.id}/review`, { review_status: 'APPROVED', review_note: 'QA bank voucher independently reviewed.' });
  await api(tokens.approver, 'POST', `/accounting/journals/${journal.id}/approve`, { approval_status: 'APPROVED', approval_note: 'QA bank voucher independently approved.' });
  return (await api(tokens.poster, 'POST', `/accounting/journals/${journal.id}/post`)).data;
}
(async () => {
  const auth = { admin: await login('hnoman'), preparer: await login('qa_roi_maker'), reviewer: await login('qa_roi_checker'), approver: await login('qa_roi_finance'), poster: await login('qa_roi_poster') };
  const tenantId = auth.admin.user.tenantId || auth.admin.user.tenant_id;
  assert(tenantId === 'f87a5ab0-0619-4f1c-bab9-e78ca750e56c', 'Unexpected tenant.', tenantId);
  const tokens = Object.fromEntries(Object.entries(auth).map(([key, value]) => [key, value.accessToken]));
  const ids = Object.fromEntries(Object.entries(auth).map(([key, value]) => [key, value.user.id]));
  const accountRows = [
    ['101000','Emirates NBD AED Current Account'], ['102000','ADCB AED Current Account'], ['103000','FAB AED Current Account'],
  ].map(([account_code, account_name]) => ({ tenant_id: tenantId, account_code, account_name, account_type: 'ASSET', account_subtype: 'BANK', currency_code: 'AED', is_active: true, is_control_account: false, is_suspense_account: false, created_by: ids.admin, updated_at: new Date().toISOString() }));
  const accountUpsert = await db.from('accounting_accounts').upsert(accountRows, { onConflict: 'tenant_id,account_code' }).select(); if (accountUpsert.error) throw accountUpsert.error;
  const { data: counterRows, error: counterError } = await db.from('accounting_accounts').select('id,account_code').eq('tenant_id', tenantId).in('account_code', ['110000','200000','530000']); if (counterError) throw counterError;
  const accounts = new Map([...accountUpsert.data, ...counterRows].map((row) => [row.account_code, row]));
  const formats = [
    { format_code: 'ENBD_CSV', format_name: 'Emirates NBD business CSV', bank_name: 'Emirates NBD', date_format: 'DD/MM/YYYY', direction_mode: 'DEBIT_CREDIT', column_mapping: { transaction_date: 'Transaction Date', value_date: 'Value Date', reference_number: 'Reference', external_transaction_id: 'Transaction ID', description: 'Description', debit: 'Debit', credit: 'Credit', running_balance: 'Balance' } },
    { format_code: 'ADCB_CSV', format_name: 'ADCB ProCash CSV', bank_name: 'ADCB', date_format: 'DD-MMM-YYYY', direction_mode: 'DEBIT_CREDIT', column_mapping: { transaction_date: 'Transaction Date', reference_number: 'Transaction Reference', description: 'Narrative', debit: 'Debit Amount', credit: 'Credit Amount', running_balance: 'Running Balance' } },
    { format_code: 'FAB_CSV', format_name: 'FAB corporate CSV', bank_name: 'First Abu Dhabi Bank', date_format: 'YYYY-MM-DD', direction_mode: 'SIGNED_AMOUNT', column_mapping: { transaction_date: 'Booking Date', value_date: 'Value Date', external_transaction_id: 'Transaction ID', description: 'Narrative', amount: 'Amount', running_balance: 'Balance' } },
  ];
  for (const format of formats) await api(tokens.admin, 'POST', '/accounting/bank-statement-formats', format);
  const roleRows = [
    { tenant_id: tenantId, user_id: ids.reviewer, workflow_role: 'BANK_RECONCILER', is_active: true, assigned_by: ids.admin, updated_at: new Date().toISOString() },
    { tenant_id: tenantId, user_id: ids.approver, workflow_role: 'BANK_RECON_REVIEWER', is_active: true, assigned_by: ids.admin, updated_at: new Date().toISOString() },
  ];
  const roleResult = await db.from('accounting_workflow_role_assignments').upsert(roleRows, { onConflict: 'tenant_id,user_id,workflow_role' }); if (roleResult.error) throw roleResult.error;
  const bankDefinitions = [
    ['QA Emirates NBD PJSC','UAE QA Operating Account','101000','****7842','AE**0260********7842','EBILAEAD','ENBD_CSV'],
    ['QA Abu Dhabi Commercial Bank','UAE QA Payroll Account','102000','****3519','AE**0030********3519','ADCBAEAA','ADCB_CSV'],
    ['QA First Abu Dhabi Bank','UAE QA Collections Account','103000','****9016','AE**0350********9016','NBADAEAAXXX','FAB_CSV'],
  ];
  const banks = [];
  for (const [bank_name,account_name,code,account_number_masked,iban_masked,ifsc_or_swift,statement_format_code] of bankDefinitions) {
    const { data: existing, error } = await db.from('accounting_bank_accounts').select('id').eq('tenant_id', tenantId).eq('bank_name', bank_name).maybeSingle(); if (error) throw error;
    const values = { tenant_id: tenantId, bank_name, account_name, account_id: accounts.get(code).id, account_number_masked, iban_masked, ifsc_or_swift, currency_code: 'AED', opening_balance: 0, statement_format_code, reconciliation_owner_id: ids.reviewer, is_active: true, updated_at: new Date().toISOString() };
    const result = existing ? await db.from('accounting_bank_accounts').update(values).eq('id', existing.id).select().single() : await db.from('accounting_bank_accounts').insert(values).select().single(); if (result.error) throw result.error; banks.push(result.data);
  }
  const journals = {
    receipt: await postJournal(tokens, accounts, `QA-BANK-IN-${stamp}`, 'IN', 25000, '110000', 'QA ENBD customer receipt'),
    payment: await postJournal(tokens, accounts, `QA-BANK-OUT-${stamp}`, 'OUT', 5000, '200000', 'QA ENBD supplier payment'),
    fee: await postJournal(tokens, accounts, `QA-BANK-FEE-${stamp}`, 'OUT', 100, '530000', 'QA ENBD bank charge'),
  };
  const [year, month, day] = today.split('-'); const enbdDate = `${day}/${month}/${year}`;
  const rows = [
    { 'Transaction Date': enbdDate, 'Value Date': enbdDate, Credit: 25000, Debit: '', Reference: `ENBD-IN-${stamp}`, 'Transaction ID': `ENBD-${stamp}-1`, Description: 'QA customer transfer', Balance: 225000 },
    { 'Transaction Date': enbdDate, 'Value Date': enbdDate, Credit: '', Debit: 5000, Reference: `ENBD-OUT-${stamp}`, 'Transaction ID': `ENBD-${stamp}-2`, Description: 'QA supplier transfer', Balance: 220000 },
    { 'Transaction Date': enbdDate, 'Value Date': enbdDate, Credit: '', Debit: 100, Reference: `ENBD-FEE-${stamp}`, 'Transaction ID': `ENBD-${stamp}-3`, Description: 'QA bank fee', Balance: 219900 },
    { 'Transaction Date': enbdDate, 'Value Date': enbdDate, Credit: '', Debit: 1, Reference: `ENBD-ADVICE-${stamp}`, 'Transaction ID': `ENBD-${stamp}-4`, Description: 'QA non-ledger bank advice', Balance: 219899 },
  ];
  const payload = { bank_account_id: banks[0].id, format_code: 'ENBD_CSV', statement_reference: `QA-ENBD-STMT-${stamp}`, file_name: `qa-enbd-${stamp}.csv`, opening_balance: 200000, closing_balance: 219899, rows };
  const badTotal = await api(tokens.preparer, 'POST', '/accounting/bank-transactions/import', { ...payload, closing_balance: 999999 }, [400]);
  assert(/control total failed/i.test(JSON.stringify(badTotal.data)), 'Statement balance control did not block bad totals.', badTotal.data);
  const imported = (await api(tokens.preparer, 'POST', '/accounting/bank-transactions/import', payload)).data;
  assert(imported.created_count === 4 && imported.control_totals.net_movement === 19899, 'Statement import totals failed.', imported);
  const duplicate = (await api(tokens.preparer, 'POST', '/accounting/bank-transactions/import', payload)).data;
  assert(duplicate.duplicate_import && duplicate.created_count === 0, 'Statement hash idempotency failed.', duplicate);
  const [inTx, outTx, feeTx, adviceTx] = imported.transactions;
  const wrongOwner = await api(tokens.preparer, 'POST', `/accounting/bank-transactions/${inTx.id}/reconcile`, { status: 'MATCHED', journal_id: journals.receipt.id }, [400]);
  assert(/not assigned as bank reconciler|assigned reconciliation owner/i.test(JSON.stringify(wrongOwner.data)), 'Reconciliation ownership gate failed.', wrongOwner.data);
  const wrongDirection = await api(tokens.reviewer, 'POST', `/accounting/bank-transactions/${outTx.id}/reconcile`, { status: 'MATCHED', journal_id: journals.receipt.id }, [400]);
  assert(/direction and exact/i.test(JSON.stringify(wrongDirection.data)), 'Bank direction control failed.', wrongDirection.data);
  await api(tokens.reviewer, 'POST', `/accounting/bank-transactions/${inTx.id}/reconcile`, { status: 'MATCHED', journal_id: journals.receipt.id, reconciliation_note: 'Exact ENBD credit matched.' });
  await api(tokens.reviewer, 'POST', `/accounting/bank-transactions/${outTx.id}/reconcile`, { status: 'MATCHED', journal_id: journals.payment.id, reconciliation_note: 'Exact ENBD debit matched.' });
  await api(tokens.reviewer, 'POST', `/accounting/bank-transactions/${feeTx.id}/reconcile`, { status: 'MATCHED', journal_id: journals.fee.id, reconciliation_note: 'Bank fee matched.' });
  const missingReason = await api(tokens.reviewer, 'POST', `/accounting/bank-transactions/${adviceTx.id}/reconcile`, { status: 'EXCLUDED' }, [400]);
  assert(/exclusion reason/i.test(JSON.stringify(missingReason.data)), 'Exclusion evidence control failed.', missingReason.data);
  await api(tokens.reviewer, 'POST', `/accounting/bank-transactions/${adviceTx.id}/reconcile`, { status: 'EXCLUDED', exclusion_reason: 'QA non-monetary advice line explicitly excluded.' });
  const importerFinalize = await api(tokens.preparer, 'POST', `/accounting/bank-statements/${imported.batch.id}/finalize`, { reconciliation_note: 'invalid' }, [400]);
  assert(/not assigned as bank reconciler|importer cannot finalise/i.test(JSON.stringify(importerFinalize.data)), 'Importer finalisation gate failed.', importerFinalize.data);
  const finalised = (await api(tokens.reviewer, 'POST', `/accounting/bank-statements/${imported.batch.id}/finalize`, { reconciliation_note: 'All monetary rows matched exactly; one documented non-ledger advice excluded.' })).data;
  assert(finalised.status === 'RECONCILED', 'Statement did not finalise.', finalised);
  const selfReview = await api(tokens.reviewer, 'POST', `/accounting/bank-statements/${imported.batch.id}/review`, { review_note: 'invalid' }, [400]);
  assert(/not assigned as bank recon reviewer|third independent/i.test(JSON.stringify(selfReview.data)), 'Independent review gate failed.', selfReview.data);
  const reviewed = (await api(tokens.approver, 'POST', `/accounting/bank-statements/${imported.batch.id}/review`, { review_note: 'QA finance independently reviewed statement totals, matches and exclusion evidence.' })).data;
  assert(reviewed.status === 'REVIEWED', 'Statement review did not complete.', reviewed);
  const formatList = (await api(tokens.admin, 'GET', '/accounting/bank-statement-formats')).data;
  const statementList = (await api(tokens.admin, 'GET', '/accounting/bank-statements')).data;
  const statement = statementList.find((row) => row.id === imported.batch.id);
  assert(formatList.filter((row) => ['ENBD_CSV','ADCB_CSV','FAB_CSV'].includes(row.format_code) && row.is_active).length === 3, 'Three UAE formats were not active.', formatList);
  assert(statement?.status === 'REVIEWED' && statement.transactions.filter((row) => row.reconciliation_status === 'MATCHED').length === 3 && statement.transactions.filter((row) => row.reconciliation_status === 'EXCLUDED').length === 1, 'Final reconciliation register is incorrect.', statement);
  const report = { pass: true, environment: 'MIZANTRA TEST ONLY', tenant_id: tenantId, formats: ['ENBD_CSV','ADCB_CSV','FAB_CSV'], bank_accounts: banks.map((row) => ({ id: row.id, bank_name: row.bank_name, currency: row.currency_code, owner_id: row.reconciliation_owner_id })), statement: { id: statement.id, reference: statement.statement_reference, status: statement.status, opening_balance: Number(statement.opening_balance), closing_balance: Number(statement.closing_balance), imported: 4, matched: 3, excluded: 1 }, journals: Object.fromEntries(Object.entries(journals).map(([key, value]) => [key, { id: value.id, number: value.journal_number, status: value.status }])), controls: { bad_balance_blocked: true, duplicate_hash_blocked: true, wrong_owner_blocked: true, wrong_direction_blocked: true, undocumented_exclusion_blocked: true, importer_finalize_blocked: true, independent_review_enforced: true } };
  const dir = path.join(process.cwd(), 'artifacts/qa'); fs.mkdirSync(dir, { recursive: true }); const output = path.join(dir, `uae-bank-reconciliation-${stamp}.json`); fs.writeFileSync(output, `${JSON.stringify(report, null, 2)}\n`); console.log(JSON.stringify({ output, report }, null, 2));
})().catch((error) => { console.error(error.stack || error); process.exit(1); });
