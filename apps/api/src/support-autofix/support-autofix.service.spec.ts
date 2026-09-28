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

  it('enqueues a dedicated patch job for a LOW incident only', async () => {
    process.env.AUTOHEAL_ENABLED = 'true';
    const queue = { add: jest.fn().mockResolvedValue(undefined) };
    const store = { captureIncident: jest.fn().mockResolvedValue({ deduplicated: false, incident: { id: 'incident-low', status: 'NEW', risk_level: 'LOW', occurrence_count: 1 } }) };
    const service = Object.create(SupportAutofixService.prototype) as any;
    service.queue = queue; service.store = store;
    await service.captureIncident({ tenantId: 'tenant-a', userId: 'user-a' }, { title: 'Date display', description: 'Weekday label missing' });
    expect(queue.add).toHaveBeenCalledWith('incident', { tenantId: 'tenant-a', incidentId: 'incident-low' }, expect.objectContaining({ attempts: 2 }));
  });

  it('never queues HIGH-risk reports', async () => {
    process.env.AUTOHEAL_ENABLED = 'true';
    const queue = { add: jest.fn() };
    const store = { captureIncident: jest.fn().mockResolvedValue({ deduplicated: false, incident: { id: 'incident-high', status: 'NEW', risk_level: 'HIGH', occurrence_count: 1 } }) };
    const service = Object.create(SupportAutofixService.prototype) as any;
    service.queue = queue; service.store = store;
    await service.captureIncident({ tenantId: 'tenant-a', userId: 'user-a' }, { title: 'Payroll update', description: 'Need payroll fix' });
    expect(queue.add).not.toHaveBeenCalled();
  });

  it('escalates before creating a third automatic attempt', async () => {
    process.env.AUTOHEAL_ENABLED = 'true'; process.env.AUTOHEAL_WORKER_ENABLED = 'false';
    const store = { getIncident: jest.fn().mockResolvedValue({ id: 'i', status: 'TRIAGING', risk_level: 'LOW', title: 'Date display', description: 'Weekday missing' }), countAttempts: jest.fn().mockResolvedValue(2), updateIncident: jest.fn() };
    const service = Object.create(SupportAutofixService.prototype) as any;
    service.store = store;
    await expect(service.startWorkerAttempt('t', 'i', {})).rejects.toThrow('automatic attempt limit has been reached');
    expect(store.updateIncident).toHaveBeenCalledWith('t', 'i', expect.objectContaining({ status: 'ESCALATED' }));
  });

  it('rechecks the reported diff and validations before setting READY_FOR_APPROVAL', async () => {
    process.env.AUTOHEAL_ENABLED = 'true'; process.env.AUTOHEAL_WORKER_ENABLED = 'false';
    const store = {
      getIncident: jest.fn().mockResolvedValue({ id: 'i', status: 'PATCHING', risk_level: 'LOW' }),
      latestAttempt: jest.fn().mockResolvedValue({ id: 'a', status: 'RUNNING', base_sha: 'a'.repeat(40) }),
      countAttempts: jest.fn().mockResolvedValue(1), updateAttempt: jest.fn(), updateIncident: jest.fn(), writeEvent: jest.fn(),
    };
    const service = Object.create(SupportAutofixService.prototype) as any; service.store = store;
    const passed = { passed: true, detail: 'ok' };
    const result = await service.finishWorkerAttempt('t', 'i', { attemptId: 'a', status: 'READY_FOR_APPROVAL', filesChanged: ['apps/web/src/example.tsx'], diff: '+<div>fixed</div>', linesAdded: 1, linesRemoved: 0, testResult: { focusedTest: passed, typeCheck: passed, diffCheck: passed, smoke: passed }, buildResult: passed, riskAfterDiff: 'LOW', commitSha: 'b'.repeat(40), rootCause: 'Corrected the visible label.' });
    expect(result.status).toBe('READY_FOR_APPROVAL');
    expect(store.updateIncident).toHaveBeenNthCalledWith(1, 't', 'i', { status: 'TESTING' });
    expect(store.updateIncident).toHaveBeenNthCalledWith(2, 't', 'i', expect.objectContaining({ status: 'READY_FOR_APPROVAL' }));
  });
});
