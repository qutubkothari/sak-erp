import 'reflect-metadata';
import { SupportAutofixService } from './support-autofix.service';
import { SupportAutofixController } from './support-autofix.controller';
import { canTransitionIncident } from './incident-state';

function fixture(status = 'FAILED') {
  const service: any = Object.create(SupportAutofixService.prototype);
  service.store = { getIncident: jest.fn().mockResolvedValue({id:'current', status}), updateIncident:jest.fn().mockResolvedValue({id:'current',status:'RESOLVED'}), writeEvent:jest.fn() };
  service.audit = {logActivity:jest.fn()}; service.queue = {add:jest.fn()};
  return service;
}
const input = { summary:'Purchase Order search verified in production with matching Excel export.', verified:true };
describe('Authenticated manual incident resolution', () => {
  it('resolves only the specified incident and audits the actor and verification', async () => {
    const s=fixture(); expect(await s.resolveVerifiedIncident('t','current','admin',input)).toMatchObject({status:'RESOLVED'});
    expect(s.store.updateIncident).toHaveBeenCalledWith('t','current',expect.objectContaining({status:'RESOLVED',risk_reason:input.summary,resolved_at:expect.any(String)}),'FAILED');
    expect(s.store.writeEvent).toHaveBeenCalledWith(expect.objectContaining({type:'incident.resolved',incidentId:'current',details:expect.objectContaining({production_verified:true})}),'admin');
    expect(s.audit.logActivity).toHaveBeenCalledWith(expect.objectContaining({userId:'admin',resourceId:'current'}));
    expect(s.queue.add).not.toHaveBeenCalled();
    expect(canTransitionIncident('FAILED','RESOLVED')).toBe(true);
  });
  it.each(['NEW','TRIAGING','PATCHING','TESTING','READY_FOR_APPROVAL','DEPLOYING','VERIFYING'])('rejects active state %s', async status => {
    const s=fixture(status); await expect(s.resolveVerifiedIncident('t','current','admin',input)).rejects.toThrow('Only inactive'); expect(s.store.updateIncident).not.toHaveBeenCalled();
  });
  it.each([{...input,verified:false},{...input,summary:''}])('requires verified summary', async body => {
    const s=fixture();await expect(s.resolveVerifiedIncident('t','current','admin',body)).rejects.toThrow('Confirm production'); expect(s.store.updateIncident).not.toHaveBeenCalled();
  });
  it('does not alter archived or missing records',async()=>{
    const s=fixture();s.store.getIncident.mockResolvedValueOnce({status:'FAILED',archived_at:'2026-01-01'}).mockResolvedValueOnce(null);
    await expect(s.resolveVerifiedIncident('t','current','admin',input)).rejects.toThrow('Only inactive');
    await expect(s.resolveVerifiedIncident('other','current','admin',input)).rejects.toThrow('not found'); expect(s.store.updateIncident).not.toHaveBeenCalled();
  });
  it('is idempotent after resolution',async()=>{const s=fixture('RESOLVED');await s.resolveVerifiedIncident('t','current','admin',input);expect(s.store.updateIncident).not.toHaveBeenCalled();expect(s.store.writeEvent).not.toHaveBeenCalled();});
  it('uses existing admin tenant resolution and manage permissions',async()=>{
    const service:any={adminTenantId:jest.fn().mockResolvedValue('t'),resolveVerifiedIncident:jest.fn()};const c=new SupportAutofixController(service); await c.resolve({user:{userId:'admin'}},'current',input);
    expect(service.resolveVerifiedIncident).toHaveBeenCalledWith('t','current','admin',input);
    expect(Reflect.getMetadata('permissions',SupportAutofixController.prototype.resolve)).toEqual(['support_autofix:manage']);
    expect(Reflect.getMetadata('__guards__',SupportAutofixController.prototype.resolve).map((guard:any)=>guard.name)).toEqual(['JwtAuthGuard','SuperAdminGuard','PermissionsGuard']);
  });
});
