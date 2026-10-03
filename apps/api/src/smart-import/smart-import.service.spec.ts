import { BadRequestException, ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
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
  it('blocks unowned unified import tasks before loading rows',async()=>{
    response={data:{id:'33333333-3333-4333-8333-333333333333',tenant_id:tenant,requested_by:'44444444-4444-4444-8444-444444444444'},error:null};
    (service as any).rows=jest.fn();
    await expect(service.workingContext({userId,tenantId:tenant,permissions:[]},response.data.id)).rejects.toBeInstanceOf(ForbiddenException);
    expect((service as any).rows).not.toHaveBeenCalled();
  });
  it('allows the owner to inspect a native import task',async()=>{
    response={data:{id:'33333333-3333-4333-8333-333333333333',tenant_id:tenant,requested_by:userId},error:null};
    (service as any).rows=jest.fn().mockResolvedValue([]);
    expect((await service.workingContext({userId,tenantId:tenant},response.data.id)).rows).toEqual([]);
  });
  it('hands only recorded completed import item IDs to planning',async()=>{
    response={data:{id:'33333333-3333-4333-8333-333333333333',tenant_id:tenant,requested_by:userId,status:'COMPLETED'},error:null};
    (service as any).rows=jest.fn().mockResolvedValue([{created_table:'items',created_entity_id:userId,decision:'ALREADY_IMPORTED',result:{imported:true}},{created_table:'vendors',created_entity_id:tenant,decision:'ALREADY_IMPORTED',result:{imported:true}}]);
    expect(await service.actionItems({userId,tenantId:tenant},response.data.id)).toEqual({item_ids:[userId]});
  });
  it('does not plan from an unapproved preview',async()=>{
    response={data:{id:'33333333-3333-4333-8333-333333333333',tenant_id:tenant,requested_by:userId,status:'AWAITING_APPROVAL'},error:null};
    (service as any).rows=jest.fn().mockResolvedValue([]);
    await expect(service.actionItems({userId,tenantId:tenant},response.data.id)).rejects.toBeInstanceOf(BadRequestException);
  });
});
