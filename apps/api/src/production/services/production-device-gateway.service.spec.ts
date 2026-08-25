import { UnauthorizedException } from '@nestjs/common';
import { createHash } from 'crypto';
import { ProductionDeviceGatewayService } from './production-device-gateway.service';

process.env.SUPABASE_URL = process.env.SUPABASE_URL || 'http://127.0.0.1:54321';
process.env.SUPABASE_KEY = process.env.SUPABASE_KEY || 'test-anon-key';

const gatewayQuery = (gateway: any) => { const query:any={}; for(const method of ['select','eq','in'])query[method]=jest.fn(()=>query);query.maybeSingle=jest.fn(async()=>({data:gateway,error:null}));return query; };

describe('ProductionDeviceGatewayService external boundary', () => {
  it('rejects an invalid gateway key before accepting an event', async () => {
    const gateway={id:'g1',tenant_id:'tenant-a',api_key_hash:createHash('sha256').update('correct').digest('hex'),status:'ACTIVE',field_mapping:{}};
    const service=new ProductionDeviceGatewayService({} as any);(service as any).db={from:jest.fn(()=>gatewayQuery(gateway))};
    await expect(service.ingestExternal('gw_public','wrong',{source_event_id:'e1',event_type:'RUN',payload:{}})).rejects.toBeInstanceOf(UnauthorizedException);
  });
  it('rejects replay-window timestamps after authenticating the gateway', async () => {
    const gateway={id:'g1',tenant_id:'tenant-a',api_key_hash:createHash('sha256').update('correct').digest('hex'),status:'ACTIVE',field_mapping:{}};
    const service=new ProductionDeviceGatewayService({} as any);(service as any).db={from:jest.fn(()=>gatewayQuery(gateway))};
    await expect(service.ingestExternal('gw_public','correct',{source_event_id:'e1',event_type:'RUN',occurred_at:'2020-01-01T00:00:00Z',payload:{}})).rejects.toThrow('31-day acceptance window');
  });
});
