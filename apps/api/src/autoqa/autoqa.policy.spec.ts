import {readFileSync} from 'fs';
import {join} from 'path';
import {isAutoQaAdmin,nextOccurrence,shouldCreateAutoEngineerIncident,shouldResolveFinding,workerIsStale} from './autoqa.policy';

describe('Auto QA mode, lifecycle and safety policies',()=>{
  it('does not bridge incidents in OFF or OBSERVE mode',()=>{expect(shouldCreateAutoEngineerIncident('OFF',true,null)).toBe(false);expect(shouldCreateAutoEngineerIncident('OBSERVE',true,null)).toBe(false);});
  it('creates only eligible, unlinked incidents in INCIDENT mode',()=>{expect(shouldCreateAutoEngineerIncident('INCIDENT',true,null)).toBe(true);expect(shouldCreateAutoEngineerIncident('INCIDENT',false,null)).toBe(false);expect(shouldCreateAutoEngineerIncident('INCIDENT',true,'linked')).toBe(false);});
  it('increments recurring finding occurrence counts without creating another identity',()=>{expect(nextOccurrence(1)).toBe(2);expect(nextOccurrence(7)).toBe(8);});
  it('resolves only findings from a successfully completed check that are absent',()=>{expect(shouldResolveFinding(true,false,'OPEN')).toBe(true);expect(shouldResolveFinding(false,false,'OPEN')).toBe(false);expect(shouldResolveFinding(true,true,'OPEN')).toBe(false);expect(shouldResolveFinding(true,false,'SUPPRESSED')).toBe(false);});
  it('does not flag a disabled AutoEngineer worker',()=>{expect(workerIsStale(false,null)).toBe(false);expect(workerIsStale(true,null)).toBe(true);});
  it('flags a stale heartbeat only after the configured threshold',()=>{const now=Date.now();expect(workerIsStale(true,new Date(now-91_000).toISOString(),now)).toBe(true);expect(workerIsStale(true,new Date(now-30_000).toISOString(),now)).toBe(false);});
  it('authorizes Admin roles and rejects ordinary users',()=>{expect(isAutoQaAdmin({roles:[{name:'TENANT_ADMIN'}]})).toBe(true);expect(isAutoQaAdmin({role:{name:'SUPER_ADMIN'}})).toBe(true);expect(isAutoQaAdmin({role:{name:'EMPLOYEE'}})).toBe(false);expect(isAutoQaAdmin(null)).toBe(false);});
  it('keeps writes limited to QA and notification metadata tables',()=>{const source=readFileSync(join(__dirname,'autoqa.service.ts'),'utf8');const writes=[...source.matchAll(/\.from\(['"]([^'"]+)['"]\)\s*\.(insert|update|delete|upsert)\s*\(/g)].map(m=>m[1]);expect(writes.length).toBeGreaterThan(0);expect(writes.every(table=>['autoqa_runs','autoqa_findings','communication_log'].includes(table))).toBe(true);});
  it('scopes tenant reads and constrains manual runs with a profile/tenant database lock',()=>{const source=readFileSync(join(__dirname,'autoqa.service.ts'),'utf8');const migration=readFileSync(join(__dirname,'../../../../migrations/add-autoqa-v1.sql'),'utf8');expect(source).toContain("request = request.eq('tenant_id', scope.tenantId)");expect(migration).toContain('uq_autoqa_one_running_scope');});
  it('records enabled scheduler configuration but has no active cron runner',()=>{const service=readFileSync(join(__dirname,'autoqa.service.ts'),'utf8');expect(service).toContain('AUTOQA_SCHEDULE_ENABLED');expect(service).not.toMatch(/@Cron\(|@Interval\(/);});
});
