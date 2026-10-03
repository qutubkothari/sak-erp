import { ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { UnifiedAiContextService } from './unified-ai.context';
jest.mock('@supabase/supabase-js', () => ({ createClient: jest.fn(() => ({})) }));
const tenant='11111111-1111-4111-8111-111111111111', owner='22222222-2222-4222-8222-222222222222', id='33333333-3333-4333-8333-333333333333';
describe('Unified private working context', () => {
  let service: UnifiedAiContextService;
  beforeEach(() => { process.env.ERP_TENANT_PROFILE='MIZANTRA';service=new UnifiedAiContextService(); });
  it.each(['SAIFSEAS','MIZANTRA','ARWA'])('uses authenticated scope for %s', profile => {
    process.env.ERP_TENANT_PROFILE=profile;
    expect(service.scope({tenantId:tenant,id:owner})).toEqual({tenant,owner,profile});
  });
  it('rejects unauthenticated scope', () => expect(() => service.scope({})).toThrow(ForbiddenException));
  it('filters every session read by tenant/profile/owner/expiry', async () => {
    const query:any={select:jest.fn().mockReturnThis(),eq:jest.fn().mockReturnThis(),gt:jest.fn().mockReturnThis(),maybeSingle:jest.fn().mockResolvedValue({data:{id,version:1,working_ref:{current_type:'REPORT',report_session_id:id,prompt:'secret'}},error:null})};
    (service as any).db={from:jest.fn(()=>query)};
    const result=await service.get({tenantId:tenant,id:owner},id);
    expect(query.eq.mock.calls).toEqual([['tenant_id',tenant],['profile','MIZANTRA'],['owner_id',owner],['id',id]]);
    expect(query.gt).toHaveBeenCalledWith('expires_at',expect.any(String));
    expect(result.working_ref).not.toHaveProperty('prompt');
  });
  it('does not resolve another owner or expired task', async () => {
    const query:any={select:jest.fn().mockReturnThis(),eq:jest.fn().mockReturnThis(),gt:jest.fn().mockReturnThis(),maybeSingle:jest.fn().mockResolvedValue({data:null,error:null})};
    (service as any).db={from:()=>query};
    await expect(service.get({tenantId:tenant,id:owner},id)).rejects.toThrow(NotFoundException);
  });
  it('rejects cross-profile entity before metadata mutation', async () => {
    await expect(service.save({tenantId:tenant,id:owner},{entity:{tenant_id:tenant,profile:'ARWA',current_user_id:owner,entity_id:id} as any})).rejects.toThrow(ForbiddenException);
  });
  it('detects overlapping turns', async () => {
    const query:any={update:jest.fn().mockReturnThis(),eq:jest.fn().mockReturnThis(),select:jest.fn().mockReturnThis(),maybeSingle:jest.fn().mockResolvedValue({data:null,error:null})};
    (service as any).db={from:()=>query};
    await expect(service.save({tenantId:tenant,id:owner},{current_type:'REPORT'},{id,version:3,working_ref:{}})).rejects.toThrow(ConflictException);
    expect(query.eq).toHaveBeenCalledWith('version',3);
  });
  it('denies ordinary-user aggregate health', async () => {
    await expect(service.health({tenantId:tenant,id:owner,permissions:[]})).rejects.toThrow(ForbiddenException);
  });
});