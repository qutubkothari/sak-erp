/*
 * Mizantra-only accounting control smoke.
 * It deliberately creates clearly-labelled, posted audit records. Do not run
 * this against live: posted accounting records must never be deleted.
 *
 * Usage:
 *   node scripts/qa/accounting-full-smoke.cjs
 *   SMOKE_USER=... SMOKE_PASSWORD=... node scripts/qa/accounting-full-smoke.cjs
 */
const baseUrl = process.env.SMOKE_BASE_URL || 'https://mizantra.saksolution.com';
const username = process.env.SMOKE_USER || 'hnoman';
const password = process.env.SMOKE_PASSWORD || 'Password';

if (!/^https:\/\/mizantra\.saksolution\.com\/?$/i.test(baseUrl)) {
  throw new Error('Refusing to run accounting smoke anywhere except https://mizantra.saksolution.com.');
}

let token = '';
async function request(path, options = {}) {
  const response = await fetch(`${baseUrl}/api/v1${path}`, {
    ...options,
    headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json', ...(options.headers || {}) },
  });
  const text = await response.text();
  let body;
  try { body = text ? JSON.parse(text) : null; } catch { body = text; }
  if (!response.ok) throw new Error(`${options.method || 'GET'} ${path}: ${response.status} ${typeof body === 'string' ? body : JSON.stringify(body)}`);
  return body;
}

(async () => {
  const login = await fetch(`${baseUrl}/api/v1/auth/login`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ username, password }) });
  const auth = await login.json();
  if (!login.ok || !auth.accessToken) throw new Error(`Login failed: ${login.status}`);
  token = auth.accessToken;

  const stamp = Date.now();
  const today = new Date().toISOString().slice(0, 10);
  await request('/accounting/accounts/seed-defaults', { method: 'POST' });
  const accounts = await request('/accounting/accounts');
  const byCode = (code) => accounts.find((account) => account.account_code === code);
  const receivable = byCode('1100');
  const cash = byCode('1000');
  const revenue = byCode('4000');
  if (!receivable || !cash || !revenue) throw new Error('Starter chart is missing a required control account.');

  const sale = await request('/accounting/journals', { method: 'POST', body: JSON.stringify({
    journal_date: today, narration: `QA Accounting sale ${stamp}`, source_type: 'QA_SMOKE',
    lines: [{ account_id: receivable.id, debit: 100, credit: 0 }, { account_id: revenue.id, debit: 0, credit: 100 }],
  }) });
  await request(`/accounting/journals/${sale.id}/post`, { method: 'POST' });

  const party = await request('/accounting/parties', { method: 'POST', body: JSON.stringify({
    party_name: `QA Accounting Customer ${stamp}`, party_type: 'CUSTOMER', party_code: `QA-${stamp}`,
    receivable_account_id: receivable.id, credit_limit: 1000, credit_days: 30,
  }) });
  const openItem = await request('/accounting/open-items', { method: 'POST', body: JSON.stringify({
    direction: 'RECEIVABLE', party_id: party.id, document_number: `QA-INV-${stamp}`,
    document_date: today, due_date: today, original_amount: 100, currency_code: 'INR', journal_id: sale.id,
  }) });

  const receipt = await request('/accounting/journals', { method: 'POST', body: JSON.stringify({
    journal_date: today, narration: `QA Accounting receipt ${stamp}`, source_type: 'QA_SMOKE',
    lines: [{ account_id: cash.id, debit: 100, credit: 0 }, { account_id: receivable.id, debit: 0, credit: 100 }],
  }) });
  await request(`/accounting/journals/${receipt.id}/post`, { method: 'POST' });
  await request(`/accounting/open-items/${openItem.id}/settle`, { method: 'POST', body: JSON.stringify({ amount: 100, settlement_date: today, journal_id: receipt.id }) });

  const bank = await request('/accounting/bank-accounts', { method: 'POST', body: JSON.stringify({ bank_name: `QA Bank ${stamp}`, account_name: 'QA Current Account', account_id: cash.id, opening_balance: 0 }) });
  const bankTransaction = await request('/accounting/bank-transactions', { method: 'POST', body: JSON.stringify({ bank_account_id: bank.id, transaction_date: today, direction: 'IN', amount: 100, reference_number: `QA-${stamp}`, description: 'Accounting smoke receipt' }) });
  let unlinkedMatchBlocked = false;
  try { await request(`/accounting/bank-transactions/${bankTransaction.id}/reconcile`, { method: 'POST', body: JSON.stringify({ status: 'MATCHED' }) }); } catch (error) { unlinkedMatchBlocked = String(error.message).includes('posted receipt or payment journal'); }
  if (!unlinkedMatchBlocked) throw new Error('Unlinked bank matching was not blocked.');
  await request(`/accounting/bank-transactions/${bankTransaction.id}/reconcile`, { method: 'POST', body: JSON.stringify({ status: 'MATCHED', journal_id: receipt.id }) });

  const [trial, profitLoss, balanceSheet, ageing, ledger, cashFlow] = await Promise.all([
    request('/accounting/trial-balance'), request('/accounting/reports/profit-loss'),
    request('/accounting/reports/balance-sheet'), request('/accounting/reports/ageing?direction=RECEIVABLE'),
    request(`/accounting/accounts/${receivable.id}/ledger`), request('/accounting/reports/cash-flow'),
  ]);
  if (!ledger.entries.some((entry) => entry.journal?.id === sale.id) || !ledger.entries.some((entry) => entry.journal?.id === receipt.id)) throw new Error('Account ledger drill-down is missing posted vouchers.');
  if (Number(cashFlow.total_inflows || 0) < 100) throw new Error('Cash movement report is missing the posted receipt.');
  console.log(JSON.stringify({ status: 'PASS', sale_journal: sale.journal_number, receipt_journal: receipt.journal_number, settlement: 'SETTLED', bank_match: 'MATCHED', unlinked_match_blocked: true, ledger_entries: ledger.entries.length, cash_inflows: cashFlow.total_inflows, trial_lines: trial.length, net_profit: profitLoss.net_profit, total_assets: balanceSheet.total_assets, receivable_ageing: ageing.buckets }, null, 2));
})().catch((error) => { console.error(error.stack || error.message); process.exit(1); });
