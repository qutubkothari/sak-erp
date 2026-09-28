import { SupportAutofixService } from './support-autofix.service';

describe('AutoHeal service safety controls', () => {
  const originalEnabled = process.env.AUTOHEAL_ENABLED;
  const originalMode = process.env.AUTOHEAL_MODE;

  afterEach(() => {
    if (originalEnabled === undefined) delete process.env.AUTOHEAL_ENABLED;
    else process.env.AUTOHEAL_ENABLED = originalEnabled;
    if (originalMode === undefined) delete process.env.AUTOHEAL_MODE;
    else process.env.AUTOHEAL_MODE = originalMode;
  });

  it('keeps incident capture active but never queues coding work when the kill switch is off', async () => {
    process.env.AUTOHEAL_ENABLED = 'false';
    const queue = { add: jest.fn() };
    const store = { captureIncident: jest.fn().mockResolvedValue({ deduplicated: false, incident: { id: 'incident-a', status: 'NEW', risk_level: 'LOW', occurrence_count: 1 } }) };
    const service = Object.create(SupportAutofixService.prototype) as any;
    service.queue = queue;
    service.store = store;
    const result = await service.captureIncident({ tenantId: 'tenant-a', userId: 'user-a' }, { title: 'Date display', description: 'Weekday missing' });
    expect(result).toMatchObject({ status: 'Checking the problem.', riskLevel: 'LOW' });
    expect(store.captureIncident).toHaveBeenCalledTimes(1);
    expect(queue.add).not.toHaveBeenCalled();
  });

  it('forces SHADOW when the configured mode is invalid or unspecified', () => {
    process.env.AUTOHEAL_ENABLED = 'false';
    delete process.env.AUTOHEAL_MODE;
    const service = Object.create(SupportAutofixService.prototype) as any;
    expect(service.configuration()).toEqual({ enabled: false, mode: 'SHADOW', maxAttempts: 2 });
    process.env.AUTOHEAL_MODE = 'AUTO';
    expect(service.configuration().mode).toBe('AUTO');
  });
});
