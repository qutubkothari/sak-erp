import { BadRequestException } from '@nestjs/common';
import { AutomationService } from './automation.service';

describe('AutomationService branch profile controls', () => {
  let service: AutomationService;

  beforeEach(() => {
    service = new AutomationService({ get: (key: string) => key === 'SUPABASE_URL' ? 'https://example.supabase.co' : 'test-key' } as any, {} as any, {} as any, {} as any);
  });

  function setTenantMarket(market: string) {
    const query: any = {};
    query.select = jest.fn(() => query);
    query.eq = jest.fn(() => query);
    query.single = jest.fn().mockResolvedValue({ data: { market_profile: market }, error: null });
    (service as any).supabase = { from: jest.fn(() => query) };
  }

  it('uses Egypt currency, tax regime and timezone for the Egypt tenant profile', async () => {
    setTenantMarket('EGYPT');
    await expect((service as any).branchMarket('tenant-egypt', 'EGYPT')).resolves.toEqual({
      market: 'EGYPT', currency_code: 'EGP', tax_regime: 'EGYPT_VAT', timezone: 'Africa/Cairo',
    });
  });

  it('rejects a branch market that differs from the tenant profile', async () => {
    setTenantMarket('EGYPT');
    await expect((service as any).branchMarket('tenant-egypt', 'INDIA')).rejects.toBeInstanceOf(BadRequestException);
  });
});
