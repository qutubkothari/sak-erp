import { Worker } from 'node:worker_threads';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const tenant = '11111111-1111-4111-8111-111111111111';
const owner = '22222222-2222-4222-8222-222222222222';
const session = '33333333-3333-4333-8333-333333333333';
describe('Unified metadata PostgreSQL lifecycle', () => {
  let worker: Worker, sequence = 0;
  const pending = new Map<number, { resolve: (value: any) => void; reject: (error: Error) => void }>();
  const sql = (query: string, params: any[] = []) => new Promise<any>((resolveQuery, reject) => {
    const id = ++sequence;
    pending.set(id, { resolve: resolveQuery, reject });
    worker.postMessage({ id, query, params });
  });
  beforeAll(async () => {
    worker = new Worker(`const {parentPort}=require('node:worker_threads');(async()=>{const {PGlite}=await import(${JSON.stringify(pathToFileURL(require.resolve('@electric-sql/pglite')).href)});const db=new PGlite();await db.exec('CREATE ROLE anon;CREATE ROLE authenticated;CREATE ROLE service_role BYPASSRLS;CREATE TABLE tenants(id uuid PRIMARY KEY);CREATE TABLE users(id uuid PRIMARY KEY);');parentPort.on('message',async message=>{try{const result=await db.query(message.query,message.params);parentPort.postMessage({id:message.id,result});}catch(error){parentPort.postMessage({id:message.id,error:error.message});}});parentPort.postMessage({ready:true});})().catch(error=>parentPort.postMessage({fatal:error.message}));`, { eval: true });
    await new Promise<void>((ready, reject) => {
      worker.on('message', message => {
        if (message.ready) ready();
        else if (message.fatal) reject(new Error(message.fatal));
        else {
          const callback = pending.get(message.id);
          if (!callback) return;
          pending.delete(message.id);
          message.error ? callback.reject(new Error(message.error)) : callback.resolve(message.result);
        }
      });
      worker.on('error', reject);
    });
    await sql('INSERT INTO tenants VALUES($1::uuid)', [tenant]);
    await sql('INSERT INTO users VALUES($1::uuid)', [owner]);
    const migration = readFileSync(resolve(__dirname, '../../../../migrations/add-unified-ai.sql'), 'utf8');
    await sql("DO $migration$ BEGIN EXECUTE '" + migration.replace(/'/g, "''") + "';END $migration$;");
    await sql('CREATE TABLE purchase_orders(id uuid PRIMARY KEY,status text)');
    await sql("INSERT INTO purchase_orders VALUES($1::uuid,'APPROVED')", [session]);
  }, 60000);
  beforeEach(async () => { await sql('TRUNCATE mizantra_unified_sessions,mizantra_unified_telemetry'); });
  afterAll(async () => { if (worker) await worker.terminate(); });
  const create = () => sql("INSERT INTO mizantra_unified_sessions(id,tenant_id,profile,owner_id,working_ref) VALUES($1::uuid,$2::uuid,'MIZANTRA',$3::uuid,$4::jsonb)", [session, tenant, owner, JSON.stringify({ current_type:'REPORT', report_session_id:session })]);
  it.each(['anon','authenticated'])('denies %s all direct metadata access', async role => {
    await sql('SET ROLE ' + role);
    try {
      await expect(sql('SELECT * FROM mizantra_unified_sessions')).rejects.toThrow('permission denied');
      await expect(sql('SELECT * FROM mizantra_unified_telemetry')).rejects.toThrow('permission denied');
      await expect(create()).rejects.toThrow('permission denied');
    } finally { await sql('RESET ROLE'); }
  });
  it('allows only service-role metadata lifecycle without changing business records', async () => {
    const before = (await sql('SELECT * FROM purchase_orders')).rows;
    await sql('SET ROLE service_role');
    try {
      await create();
      expect((await sql('SELECT version FROM mizantra_unified_sessions')).rows[0].version).toBe(1);
      await sql("UPDATE mizantra_unified_sessions SET version=version+1,working_ref='{}' WHERE id=$1::uuid AND tenant_id=$2::uuid AND owner_id=$3::uuid AND profile='MIZANTRA' AND version=1", [session,tenant,owner]);
      expect((await sql('SELECT version FROM mizantra_unified_sessions')).rows[0].version).toBe(2);
      await expect(sql('UPDATE purchase_orders SET status=\'DRAFT\'')).rejects.toThrow('permission denied');
      await sql('DELETE FROM mizantra_unified_sessions');
    } finally { await sql('RESET ROLE'); }
    expect((await sql('SELECT * FROM purchase_orders')).rows).toEqual(before);
  });
  it('rejects foreign owner/tenant references and oversized session payloads', async () => {
    await expect(sql("INSERT INTO mizantra_unified_sessions(id,tenant_id,profile,owner_id) VALUES($1::uuid,$2::uuid,'ARWA',$3::uuid)", [session,session,owner])).rejects.toThrow('foreign key');
    await expect(sql("INSERT INTO mizantra_unified_sessions(id,tenant_id,profile,owner_id,working_ref) VALUES($1::uuid,$2::uuid,'MIZANTRA',$3::uuid,$4::jsonb)", [session,tenant,owner,JSON.stringify({payload:'x'.repeat(12001)})])).rejects.toThrow('check constraint');
  });
  it('does not update a stale or differently scoped working version', async () => {
    await create();
    for (const clause of ["profile='ARWA'",'version=2',`owner_id='${session}'::uuid`,`tenant_id='${session}'::uuid`]) {
      expect((await sql(`UPDATE mizantra_unified_sessions SET version=version+1 WHERE id=$1::uuid AND ${clause} RETURNING id`, [session])).rows).toHaveLength(0);
    }
    await sql("UPDATE mizantra_unified_sessions SET expires_at=now()-interval '1 second'");
    expect((await sql('SELECT id FROM mizantra_unified_sessions WHERE expires_at>now()')).rows).toHaveLength(0);
  });
  it('has no prompt or confidential-content telemetry columns', async () => {
    const columns = (await sql("SELECT column_name FROM information_schema.columns WHERE table_name='mizantra_unified_telemetry'")).rows.map((row:any)=>row.column_name);
    expect(columns).toContain('user_correction');
    expect(columns.some((column:string)=>/prompt|message|chat|payload|content/.test(column))).toBe(false);
    expect((await sql("SELECT relrowsecurity FROM pg_class WHERE relname IN ('mizantra_unified_sessions','mizantra_unified_telemetry')")).rows.every((row:any)=>row.relrowsecurity)).toBe(true);
  });
});