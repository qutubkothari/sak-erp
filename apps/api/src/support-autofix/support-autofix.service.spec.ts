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
    expect(result).toMatchObject({ status: 'Issue received', riskLevel: 'LOW' });
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
    const store = { getIncident: jest.fn().mockResolvedValue({ id: 'i', status: 'TRIAGING', risk_level: 'LOW', title: 'Date display', description: 'Weekday missing' }), countAttempts: jest.fn().mockResolvedValue(2), latestAttempt: jest.fn().mockResolvedValue(null), hasInfrastructureRetryRequest: jest.fn().mockResolvedValue(false), updateIncident: jest.fn() };
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

  it('keeps initial LOW risk when an attempt fails without a patch and stores safe diagnostics', async () => {
    const store = {
      getIncident: jest.fn().mockResolvedValue({ id: 'i', status: 'PATCHING', risk_level: 'LOW', risk_reason: 'Recognized low-risk UI category: search-filter-ui.', title: 'PO search', description: 'Unable to search', module: 'Procurement / Purchase Orders', route: '/dashboard/purchase/orders' }),
      latestAttempt: jest.fn().mockResolvedValue({ id: 'a', status: 'RUNNING', base_sha: 'a'.repeat(40) }),
      countAttempts: jest.fn().mockResolvedValue(1), updateAttempt: jest.fn(), updateIncident: jest.fn(), writeEvent: jest.fn(),
    };
    const service = Object.create(SupportAutofixService.prototype) as any;
    service.store = store;
    const failed = { passed: false, detail: 'No files changed' };
    const result = await service.finishWorkerAttempt('t', 'i', {
      attemptId: 'a', status: 'ESCALATED', filesChanged: [], diff: '',
      testResult: { focusedTest: failed, typeCheck: failed, diffCheck: failed, smoke: failed },
      buildResult: failed,
      agentDiagnostics: { exitCode: 0, durationMs: 1200, summary: 'No changes. token=private', filesChanged: false, validationStage: 'diff', stderrSummary: 'password=private', cwd: '/home/autoheal/workspaces/worktrees/i', sandboxMode: 'workspace-write', commandSummary: 'codex exec --cd /home/autoheal/workspaces/worktrees/i --sandbox workspace-write --ephemeral --model gpt-6-luna <prompt>' },
    });
    expect(result).toEqual({ status: 'FAILED', attemptStatus: 'FAILED' });
    expect(store.updateAttempt).toHaveBeenCalledWith('a', expect.objectContaining({ status: 'FAILED', risk_after_diff: 'MEDIUM', test_result: expect.objectContaining({ agent_diagnostics: expect.objectContaining({ exit_code: 0, files_changed: false, validation_stage: 'diff', summary: 'No changes. token [redacted]', stderr_summary: 'password [redacted]', cwd: '/home/autoheal/workspaces/worktrees/i', sandbox_mode: 'workspace-write', command_summary: expect.stringContaining('--sandbox workspace-write') }) }) }));
    expect(store.updateIncident).toHaveBeenCalledWith('t', 'i', expect.objectContaining({ status: 'FAILED', risk_level: 'LOW' }));
  });

  it('restores LOW risk only for a recognized failed-attempt reason and normalizes route before retry', async () => {
    process.env.AUTOHEAL_ENABLED = 'true';
    const store = {
      getIncident: jest.fn().mockResolvedValue({ id: 'i', status: 'FAILED', risk_level: 'MEDIUM', risk_reason: 'No changed files were found. Focused test did not pass. Web type-check did not pass. Web build did not pass. git diff --check did not pass. Relevant smoke check did not pass. Fix commit SHA is missing or invalid.', title: 'Procurement / Purchase Orders: PO search', description: 'Unable to search PO', module: 'Procurement / Purchase Orders', route: '/dashboard/reports/executive/overview', page_url: '/dashboard/reports/executive/overview' }),
      countAttempts: jest.fn().mockResolvedValue(1), updateIncident: jest.fn().mockResolvedValue({}), writeEvent: jest.fn(),
    };
    const queue = { add: jest.fn().mockResolvedValue(undefined) };
    const audit = { logActivity: jest.fn().mockResolvedValue(undefined) };
    const service = Object.create(SupportAutofixService.prototype) as any;
    service.store = store; service.queue = queue; service.audit = audit;
    await expect(service.retryAnalysis('tenant', 'i', 'admin')).resolves.toEqual({ queued: true });
    expect(store.updateIncident).toHaveBeenCalledWith('tenant', 'i', expect.objectContaining({ status: 'TRIAGING', risk_level: 'LOW', module: 'Procurement / Purchase Orders', route: '/dashboard/purchase/orders', page_url: '/dashboard/purchase/orders' }));
    expect(queue.add).toHaveBeenCalledTimes(1);
    expect(queue.add).toHaveBeenCalledWith('incident', { tenantId: 'tenant', incidentId: 'i' }, expect.objectContaining({ jobId: 'retry-i-2' }));
  });

  it('allows one admin infrastructure retry after exactly two attempts with a recognized Codex failure', async () => {
    process.env.AUTOHEAL_ENABLED = 'true';
    const incident = { id: 'i', status: 'ESCALATED', risk_level: 'LOW', title: 'PO Search', description: 'Unable to search Purchase Orders', module: 'Procurement / Purchase Orders', route: '/dashboard/purchase/orders' };
    const latest = { status: 'FAILED', files_changed: [], commit_sha: null, test_result: { agent_diagnostics: { summary: 'EWADDR: Operation not permitted' } } };
    const store = { getIncident: jest.fn().mockResolvedValue(incident), countAttempts: jest.fn().mockResolvedValue(2), latestAttempt: jest.fn().mockResolvedValue(latest), hasInfrastructureRetryRequest: jest.fn().mockResolvedValue(false), updateIncident: jest.fn().mockResolvedValue({}), writeEvent: jest.fn().mockResolvedValue(undefined) };
    const queue = { add: jest.fn().mockResolvedValue(undefined) };
    const audit = { logActivity: jest.fn().mockResolvedValue(undefined) };
    const service = Object.create(SupportAutofixService.prototype) as any;
    service.store = store; service.queue = queue; service.audit = audit;
    await expect(service.retryAfterInfrastructureFailure('tenant', 'i', 'admin')).resolves.toEqual({ queued: true, attemptNumber: 3 });
    expect(store.updateIncident).toHaveBeenCalledWith('tenant', 'i', expect.objectContaining({ status: 'TRIAGING', risk_level: 'LOW', route: '/dashboard/purchase/orders' }));
    expect(store.writeEvent).toHaveBeenCalledWith(expect.objectContaining({ type: 'autofix.infrastructure-retry-requested', details: expect.objectContaining({ attemptNumber: 3, priorAttempts: 2 }) }), 'admin');
    expect(queue.add).toHaveBeenCalledTimes(1);
    expect(queue.add).toHaveBeenCalledWith('incident', { tenantId: 'tenant', incidentId: 'i' }, expect.objectContaining({ jobId: 'infrastructure-retry-i-attempt-3' }));
  });

  it('prevents reuse of the one-time infrastructure retry and keeps ordinary attempts capped at two', async () => {
    process.env.AUTOHEAL_ENABLED = 'true';
    const incident = { id: 'i', status: 'ESCALATED', risk_level: 'LOW', title: 'PO Search', description: 'Unable to search Purchase Orders', module: 'Procurement / Purchase Orders', route: '/dashboard/purchase/orders' };
    const store = { getIncident: jest.fn().mockResolvedValue(incident), countAttempts: jest.fn().mockResolvedValue(2), latestAttempt: jest.fn().mockResolvedValue({ status: 'FAILED', files_changed: [], test_result: { agent_diagnostics: { summary: 'EWADDR: Operation not permitted' } } }), hasInfrastructureRetryRequest: jest.fn().mockResolvedValue(true), updateIncident: jest.fn() };
    const queue = { add: jest.fn() };
    const service = Object.create(SupportAutofixService.prototype) as any;
    service.store = store; service.queue = queue;
    await expect(service.retryAfterInfrastructureFailure('tenant', 'i', 'admin')).rejects.toThrow('already used');
    await expect(service.retryAnalysis('tenant', 'i', 'admin')).rejects.toThrow('automatic attempt limit');
    expect(queue.add).not.toHaveBeenCalled();
  });

  it('allows the worker to create attempt three only when the one-time infrastructure recovery was authorized', async () => {
    process.env.AUTOHEAL_ENABLED = 'true';
    const store = { getIncident: jest.fn().mockResolvedValue({ id: 'i', status: 'TRIAGING', risk_level: 'LOW', title: 'PO Search', description: 'Unable to search Purchase Orders', module: 'Procurement / Purchase Orders', route: '/dashboard/purchase/orders' }), countAttempts: jest.fn().mockResolvedValue(2), latestAttempt: jest.fn().mockResolvedValue({ status: 'FAILED', files_changed: [], test_result: { agent_diagnostics: { summary: 'EWADDR: Operation not permitted' } } }), hasInfrastructureRetryRequest: jest.fn().mockResolvedValue(true), updateIncident: jest.fn().mockResolvedValue({}), createAttempt: jest.fn().mockResolvedValue({ id: 'attempt-3' }) };
    const service = Object.create(SupportAutofixService.prototype) as any;
    service.store = store;
    const started = await service.startWorkerAttempt('tenant', 'i', { branchName: 'autofix/i-attempt-3-po-search', baseSha: 'a'.repeat(40) });
    expect(started).toMatchObject({ attemptId: 'attempt-3', attemptNumber: 3, incident: { riskLevel: 'LOW', module: 'Procurement / Purchase Orders', route: '/dashboard/purchase/orders', category: 'search-filter-ui' } });
    expect(store.createAttempt).toHaveBeenCalledTimes(1);
  });
});
