import { Worker } from 'node:worker_threads';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { attentionHash } from './proactive-operations.registry';

const tenant = '11111111-1111-4111-8111-111111111111', owner = '22222222-2222-4222-8222-222222222222', foreign = '44444444-4444-4444-8444-444444444444';
describe('Proactive metadata PostgreSQL lifecycle', () => {
  let worker: Worker, sequence = 0;
  const businessTables = ['purchase_orders', 'purchase_requisitions', 'grns', 'inventory_stock', 'accounting_journals', 'attendance', 'payroll'];
  const pending = new Map<number, { resolve: (value: any) => void; reject: (error: Error) => void }>();
  const sql = (query: string, params: any[] = []) => new Promise<any>(async (resolveQuery, reject) => { const id = ++sequence; pending.set(id, { resolve: resolveQuery, reject }); worker.postMessage({ id, query, params }); });
  const item = (extra: any = {}) => ({ attention_key: 'OVERDUE_OPEN_PO:po-1', category: 'OVERDUE_OPEN_PO', module: 'Purchasing', entity_type: 'PO', entity_id: '33333333-3333-4333-8333-333333333333', entity_reference: 'PO-1', severity: 'HIGH', title: 'PO-1 is overdue', explanation: '30 accepted units remain outstanding.', evidence: { remaining_qty: 30 }, source: 'ERP', permission: 'purchase_orders:read', available_actions: [], due_date: '2026-10-01', fingerprint: attentionHash({ qty: 30 }), ...extra });
  const scan = async (items = [item()], rules = ['OVERDUE_OPEN_PO'], notify = true, scopeOwner = owner, started = new Date().toISOString()) => (await sql('SELECT public.mizantra_attention_reconcile($1::uuid,$2,$3::uuid,$4::timestamptz,$5::jsonb,$6::text[],$7::jsonb,$8,$9) AS result', [tenant, 'MIZANTRA', scopeOwner, started, JSON.stringify(items), rules, '[]', 12, notify])).rows[0].result;
  const rows = async (table: string) => (await sql(`SELECT * FROM public.${table} ORDER BY created_at`, [])).rows;
  beforeAll(async () => {
    worker = new Worker(`const {parentPort}=require('node:worker_threads');(async()=>{const {PGlite}=await import(${JSON.stringify(pathToFileURL(require.resolve('@electric-sql/pglite')).href)});const db=new PGlite();await db.exec('CREATE ROLE anon;CREATE ROLE authenticated;CREATE ROLE service_role;');parentPort.on('message',async message=>{try{const result=await db.query(message.query,message.params);parentPort.postMessage({id:message.id,result});}catch(error){parentPort.postMessage({id:message.id,error:error.message});}});parentPort.postMessage({ready:true});})().catch(error=>parentPort.postMessage({fatal:error.message}));`, { eval: true });
    await new Promise<void>((ready, reject) => { worker.on('message', message => { if (message.ready) ready(); else if (message.fatal) reject(new Error(message.fatal)); else { const callback = pending.get(message.id); if (!callback) return; pending.delete(message.id); message.error ? callback.reject(new Error(message.error)) : callback.resolve(message.result); } }); worker.on('error', reject); });
    const migration = readFileSync(resolve(__dirname, '../../../../migrations/add-proactive-operations.sql'), 'utf8');
    await sql('DO $migration$ BEGIN EXECUTE ' + "'" + migration.replace(/'/g, "''") + "'" + ';END $migration$;');
    await sql('CREATE TABLE public.purchase_orders(id uuid PRIMARY KEY,status text);');
    await sql("INSERT INTO public.purchase_orders VALUES('33333333-3333-4333-8333-333333333333','APPROVED');");
    for (const table of businessTables.slice(1)) {
      await sql(`CREATE TABLE public.${table}(id uuid PRIMARY KEY,payload jsonb)`);
      await sql(`INSERT INTO public.${table} VALUES($1::uuid,$2::jsonb)`, [foreign, JSON.stringify({ recorded_fact: table, quantity: 7 })]);
    }
  }, 60000);
  beforeEach(async () => { await sql('TRUNCATE public.mizantra_attention_items CASCADE'); await sql('TRUNCATE public.mizantra_attention_scans,public.mizantra_daily_briefs'); });
  afterAll(async () => { await worker.terminate(); });
  it('deduplicates scans and refreshes last_detected', async () => { await scan(); const first = (await sql('SELECT * FROM mizantra_attention_items')).rows[0]; await scan(); const second = (await sql('SELECT * FROM mizantra_attention_items')).rows[0]; expect(second.id).toBe(first.id); expect(new Date(second.last_detected).getTime()).toBeGreaterThanOrEqual(new Date(first.last_detected).getTime()); expect(await rows('mizantra_attention_events')).toHaveLength(1); });
  it('sends only one new High notification', async () => { await scan(); await scan(); expect(await rows('mizantra_attention_notifications')).toHaveLength(1); });
  it('keeps lower priority items digest-only', async () => { await scan([item({ severity: 'MEDIUM' })]); expect(await rows('mizantra_attention_notifications')).toHaveLength(0); });
  it('notifies a new input requirement', async () => { await scan([item({ category: 'OPERATOR_PLAN_REVIEW', evidence: { source_state: 'NEEDS_INPUT' }, severity: 'MEDIUM' })], ['OPERATOR_PLAN_REVIEW']); expect(await rows('mizantra_attention_notifications')).toHaveLength(1); });
  it('never notifies expired plans as actionable', async () => { await scan([item({ category: 'OPERATOR_PLAN_REVIEW', evidence: { source_state: 'EXPIRED' }, severity: 'LOW' })], ['OPERATOR_PLAN_REVIEW']); expect(await rows('mizantra_attention_notifications')).toHaveLength(0); });
  it('resolves absent issues without deleting history', async () => { await scan(); await scan([]); expect((await sql('SELECT status FROM mizantra_attention_items')).rows[0].status).toBe('RESOLVED'); expect((await rows('mizantra_attention_events')).map((row: any) => row.event)).toEqual(['NEW', 'RESOLVED']); });
  it('does not resolve incomplete or unauthorized sources', async () => { await scan(); await scan([], []); expect((await sql('SELECT status FROM mizantra_attention_items')).rows[0].status).toBe('ACTIVE'); });
  it('reactivates a returning issue and preserves occurrence history', async () => { await scan(); await scan([]); await scan(); const stored = (await sql('SELECT * FROM mizantra_attention_items')).rows[0]; expect(stored.occurrence).toBe(2); expect(stored.status).toBe('ACTIVE'); expect((await rows('mizantra_attention_events')).map((row: any) => row.event)).toContain('REACTIVATED'); });
  it('records acknowledgement privately', async () => { await scan(); const stored = (await sql('SELECT id FROM mizantra_attention_items')).rows[0]; await sql('SELECT mizantra_attention_state($1::uuid,$2,$3::uuid,$4::uuid,$5)', [tenant, 'MIZANTRA', owner, stored.id, 'ACKNOWLEDGED']); await scan(); expect((await sql('SELECT status FROM mizantra_attention_items')).rows[0].status).toBe('ACKNOWLEDGED'); expect(await rows('mizantra_attention_notifications')).toHaveLength(1); });
  it('dismisses metadata without resolving or changing the native PO', async () => { await scan(); const stored = (await sql('SELECT id FROM mizantra_attention_items')).rows[0]; await sql('SELECT mizantra_attention_state($1::uuid,$2,$3::uuid,$4::uuid,$5)', [tenant, 'MIZANTRA', owner, stored.id, 'DISMISSED']); await scan(); expect((await sql('SELECT status FROM mizantra_attention_items')).rows[0].status).toBe('DISMISSED'); expect((await sql('SELECT status FROM purchase_orders')).rows[0].status).toBe('APPROVED'); });
  it('does not renotify mere quantity/fingerprint changes', async () => { await scan(); await scan([item({ evidence: { remaining_qty: 20 }, fingerprint: attentionHash({ qty: 20 }) })]); expect(await rows('mizantra_attention_notifications')).toHaveLength(1); expect(await rows('mizantra_attention_events')).toHaveLength(1); });
  it('records and notifies meaningful severity changes', async () => { await scan([item({ severity: 'MEDIUM' })]); await scan(); expect((await rows('mizantra_attention_events')).map((row: any) => row.event)).toEqual(['NEW', 'CHANGED']); expect(await rows('mizantra_attention_notifications')).toHaveLength(1); });
  it('can disable all notifications while recording attention', async () => { await scan([item()], ['OVERDUE_OPEN_PO'], false); expect(await rows('mizantra_attention_notifications')).toHaveLength(0); });
  it('blocks cross-tenant state mutation', async () => { await scan(); const stored = (await sql('SELECT id FROM mizantra_attention_items')).rows[0]; await expect(sql('SELECT mizantra_attention_state($1::uuid,$2,$3::uuid,$4::uuid,$5)', [foreign, 'MIZANTRA', owner, stored.id, 'DISMISSED'])).rejects.toThrow('ATTENTION_NOT_FOUND'); });
  it('blocks cross-owner state mutation', async () => { await scan(); const stored = (await sql('SELECT id FROM mizantra_attention_items')).rows[0]; await expect(sql('SELECT mizantra_attention_state($1::uuid,$2,$3::uuid,$4::uuid,$5)', [tenant, 'MIZANTRA', foreign, stored.id, 'DISMISSED'])).rejects.toThrow('ATTENTION_NOT_FOUND'); });
  it('blocks cross-profile state mutation', async () => { await scan(); const stored = (await sql('SELECT id FROM mizantra_attention_items')).rows[0]; await expect(sql('SELECT mizantra_attention_state($1::uuid,$2,$3::uuid,$4::uuid,$5)', [tenant, 'ARWA', owner, stored.id, 'DISMISSED'])).rejects.toThrow('ATTENTION_NOT_FOUND'); });
  it('persists one daily brief per local day', async () => { await scan(); const stored = (await sql('SELECT id FROM mizantra_attention_items')).rows[0]; const params = [tenant, 'MIZANTRA', owner, '2026-10-03', 'UTC', [stored.id]]; await sql('SELECT mizantra_attention_brief($1::uuid,$2,$3::uuid,$4::date,$5,$6::uuid[])', params); await sql('SELECT mizantra_attention_brief($1::uuid,$2,$3::uuid,$4::date,$5,$6::uuid[])', params); expect(await rows('mizantra_daily_briefs')).toHaveLength(1); });
  it('rejects foreign attention in a daily brief', async () => { await scan(); const stored = (await sql('SELECT id FROM mizantra_attention_items')).rows[0]; await expect(sql('SELECT mizantra_attention_brief($1::uuid,$2,$3::uuid,$4::date,$5,$6::uuid[])', [tenant, 'MIZANTRA', foreign, '2026-10-03', 'UTC', [stored.id]])).rejects.toThrow('BRIEF_SCOPE_INVALID'); });
  it('denies authenticated direct metadata reads and RPC', async () => { await sql('SET ROLE authenticated'); try { await expect(sql('SELECT * FROM mizantra_attention_items')).rejects.toThrow('permission denied'); await expect(scan()).rejects.toThrow('permission denied'); } finally { await sql('RESET ROLE'); } });
  it('fails atomic reconciliation on invalid payload', async () => { await expect(scan([item(), item({ attention_key: 'second', severity: 'OPAQUE_SCORE' })])).rejects.toThrow('ATTENTION_PAYLOAD_INVALID'); expect((await sql('SELECT count(*)::int AS count FROM mizantra_attention_items')).rows[0].count).toBe(0); });
  it('does not let an older scan resolve newer evidence', async () => { await scan(); const result = await scan([], ['OVERDUE_OPEN_PO'], true, owner, '2020-01-01'); expect(result.stale_scan).toBe(true); expect((await sql('SELECT status FROM mizantra_attention_items')).rows[0].status).toBe('ACTIVE'); });
  it('keeps user audiences separate', async () => { await scan(); await scan([item()], ['OVERDUE_OPEN_PO'], true, foreign); expect((await sql('SELECT count(*)::int AS count FROM mizantra_attention_items')).rows[0].count).toBe(2); });
  it('changes zero native PR/PO/GRN/stock/accounting/attendance/payroll rows through the full metadata lifecycle', async () => {
    const snapshot = async () => attentionHash(await Promise.all(businessTables.map(async table => ({ table, rows: (await sql(`SELECT to_jsonb(record) AS row FROM public.${table} record ORDER BY id`)).rows }))));
    const before = await snapshot();
    await scan();
    const stored = (await sql('SELECT id FROM mizantra_attention_items')).rows[0];
    await sql('SELECT mizantra_attention_state($1::uuid,$2,$3::uuid,$4::uuid,$5)', [tenant, 'MIZANTRA', owner, stored.id, 'ACKNOWLEDGED']);
    await sql('SELECT mizantra_attention_state($1::uuid,$2,$3::uuid,$4::uuid,$5)', [tenant, 'MIZANTRA', owner, stored.id, 'DISMISSED']);
    await scan([]); await scan();
    await sql('SELECT mizantra_attention_brief($1::uuid,$2,$3::uuid,$4::date,$5,$6::uuid[])', [tenant, 'MIZANTRA', owner, '2026-10-03', 'UTC', [stored.id]]);
    expect(await snapshot()).toBe(before);
  });
});