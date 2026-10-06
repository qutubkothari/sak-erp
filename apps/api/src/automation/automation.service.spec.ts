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

  it('uses UAE defaults for Mizantra when the tenant row has no explicit market profile', async () => {
    const previous = process.env.ERP_TENANT_PROFILE;
    process.env.ERP_TENANT_PROFILE = 'MIZANTRA';
    try {
      setTenantMarket('');
      await expect((service as any).branchMarket('tenant-mizantra')).resolves.toEqual({
        market: 'UAE', currency_code: 'AED', tax_regime: 'UAE_VAT', timezone: 'Asia/Dubai',
      });
    } finally {
      if (previous === undefined) delete process.env.ERP_TENANT_PROFILE;
      else process.env.ERP_TENANT_PROFILE = previous;
    }
  });

  it('keeps ARWA on Egypt defaults even when a stale tenant market says India', async () => {
    const previous = process.env.ERP_TENANT_PROFILE;
    process.env.ERP_TENANT_PROFILE = 'ARWA';
    try {
      setTenantMarket('INDIA');
      await expect((service as any).branchMarket('tenant-arwa')).resolves.toEqual({
        market: 'EGYPT', currency_code: 'EGP', tax_regime: 'EGYPT_VAT', timezone: 'Africa/Cairo',
      });
    } finally {
      if (previous === undefined) delete process.env.ERP_TENANT_PROFILE;
      else process.env.ERP_TENANT_PROFILE = previous;
    }
  });
});
