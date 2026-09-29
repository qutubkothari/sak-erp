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

  it('upserts heartbeat without exposing worker host information', async () => {
    const single = jest.fn().mockResolvedValue({ data: { worker_id: 'worker-a', current_incident: 'incident-a', queue_depth: 2, updated_at: '2026-09-28T00:00:00Z' }, error: null });
    const select = jest.fn(() => ({ single }));
    const upsert = jest.fn(() => ({ select }));
    const service = Object.create(SupportStoreService.prototype) as any;
    service.supabase = { from: jest.fn(() => ({ upsert })) };
    const result = await service.recordWorkerHeartbeat({ worker_id: 'worker-a', current_incident: 'incident-a', queue_depth: 2, updated_at: '2026-09-28T00:00:00Z' });
    expect(result).toEqual({ worker_id: 'worker-a', current_incident: 'incident-a', queue_depth: 2, updated_at: '2026-09-28T00:00:00Z' });
    expect(upsert).toHaveBeenCalledWith(expect.not.objectContaining({ hostname: expect.anything(), host: expect.anything() }), { onConflict: 'worker_id' });
  });

  it('excludes explicit and strong legacy infrastructure failures while counting generic no-change attempts', async () => {
    const eq = jest.fn().mockResolvedValue({ data: [
      { status: 'FAILED', files_changed: [], commit_sha: null, test_result: { agent_diagnostics: { failure_class: 'INFRASTRUCTURE_FAILURE' } } },
      { status: 'FAILED', files_changed: [], commit_sha: null, test_result: { agent_diagnostics: { summary: 'bwrap: loopback: Failed RTM_NEWADDR: Operation not permitted' } } },
      { status: 'FAILED', files_changed: [], commit_sha: null, test_result: { agent_diagnostics: { stderr_summary: 'EWADDR: Operation not permitted' } } },
      { status: 'FAILED', files_changed: [], commit_sha: null, test_result: { agent_diagnostics: { summary: 'No files changed.' } } },
      { status: 'FAILED', files_changed: ['apps/web/example.tsx'], commit_sha: null, test_result: { agent_diagnostics: { summary: 'A focused test failed.' } } },
    ], error: null });
    const service = Object.create(SupportStoreService.prototype) as any;
    service.supabase = { from: jest.fn(() => ({ select: jest.fn(() => ({ eq })) })) };
    await expect(service.countAttempts('incident-a')).resolves.toBe(2);
    expect(eq).toHaveBeenCalledWith('incident_id', 'incident-a');
  });
});
