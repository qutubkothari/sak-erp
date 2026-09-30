import { ConflictException, NotFoundException } from '@nestjs/common';
import { SmartImportService } from './smart-import.service';

describe('SmartImportService tenant guards',()=>{
  const tenant='11111111-1111-4111-8111-111111111111';const userId='22222222-2222-4222-8222-222222222222';
  let service:SmartImportService;let filters:Array<[string,unknown]>;let response:any;
  beforeEach(()=>{
    process.env.SUPABASE_URL='https://unit-test.supabase.co';process.env.SUPABASE_SERVICE_KEY='unit-test-service-key';process.env.ERP_TENANT_PROFILE='ARWA';process.env.SMART_IMPORT_ENABLED='true';
    filters=[];response={data:null,error:null};const query:any={select:()=>query,eq:(field:string,value:unknown)=>{filters.push([field,value]);return query;},maybeSingle:async()=>response};
    service=new SmartImportService({} as any);(service as any).db={from:()=>query};
  });
  afterEach(()=>{delete process.env.SUPABASE_URL;delete process.env.SUPABASE_SERVICE_KEY;delete process.env.ERP_TENANT_PROFILE;delete process.env.SMART_IMPORT_ENABLED;});
  it('scopes each batch lookup to the authenticated tenant and active profile',async()=>{
    await expect((service as any).ownedBatch({userId,tenantId:tenant},'33333333-3333-4333-8333-333333333333')).rejects.toBeInstanceOf(NotFoundException);
    expect(filters).toContainEqual(['tenant_id',tenant]);expect(filters).toContainEqual(['profile','ARWA']);
  });
  it('blocks feature access when the profile flag is off',()=>{
    process.env.SMART_IMPORT_ENABLED='false';expect(()=> (service as any).assertEnabled()).toThrow(ConflictException);
  });
});
