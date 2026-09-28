import { sanitizeSupportText, safeRouteOrUrl, SupportStoreService } from './support-store.service';

describe('AutoHeal incident privacy and deduplication', () => {
  it('redacts labeled secrets and sensitive business values', () => {
    expect(sanitizeSupportText('Password: supersecret, salary is INR 80000, token=abc123')).toBe('Password [redacted], salary [redacted], token [redacted]');
    expect(sanitizeSupportText('bank account is 1234 5678, db url: postgres://user:pass@host/db')).toBe('bank account [redacted], db url [redacted]');
  });

  it('stores route and endpoint without query strings or fragments', () => {
    expect(safeRouteOrUrl('https://erp.example/dashboard/hr?token=secret#tab')).toBe('https://erp.example/dashboard/hr');
    expect(safeRouteOrUrl('/dashboard/support?account=123')).toBe('/dashboard/support');
    expect(safeRouteOrUrl('data:text/plain,secret')).toBeNull();
  });

  it('increments one recent matching incident instead of inserting another', async () => {
    const recent = { id: 'incident-a', occurrence_count: 4 };
    const update = jest.fn().mockReturnValue({
      eq: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: { ...recent, occurrence_count: 5 }, error: null }),
    });
    const maybeSingle = jest.fn().mockResolvedValue({ data: recent, error: null });
    const lookup: any = { eq: jest.fn().mockReturnThis(), gte: jest.fn().mockReturnThis(), maybeSingle };
    const from = jest.fn(() => ({ select: jest.fn(() => lookup), update }));
    const service = Object.create(SupportStoreService.prototype) as any;
    service.supabase = { from };
    const result = await service.captureIncident('tenant-a', 'user-a', {}, { risk: 'LOW', reason: 'UI issue', category: 'label-text' }, 'fingerprint-a');
    expect(result).toMatchObject({ deduplicated: true, incident: { id: 'incident-a', occurrence_count: 5 } });
    expect(update).toHaveBeenCalledTimes(1);
    expect(from).toHaveBeenCalledTimes(2);
  });
});
