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

  it('routes LOW incident capture through the audited queue handoff', async () => {
    process.env.AUTOHEAL_ENABLED = 'true';
    const store = { captureIncident: jest.fn().mockResolvedValue({ deduplicated: false, incident: { id: 'incident-low', status: 'NEW', risk_level: 'LOW', occurrence_count: 1 } }) };
    const service = Object.create(SupportAutofixService.prototype) as any;
    service.store = store;
    service.queueInitialIncident = jest.fn().mockResolvedValue({ state: 'QUEUED', status: 'TRIAGING' });
    await service.captureIncident({ tenantId: 'tenant-a', userId: 'user-a' }, { title: 'Date display', description: 'Weekday label missing' });
    expect(service.queueInitialIncident).toHaveBeenCalledWith('tenant-a', 'incident-low', 'user-a');
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
      latestAttempt: jest.fn().mockResolvedValue({ id: 'a', incident_id: 'i', status: 'RUNNING', base_sha: 'a'.repeat(40) }),
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
      latestAttempt: jest.fn().mockResolvedValue({ id: 'a', incident_id: 'i', status: 'RUNNING', base_sha: 'a'.repeat(40) }),
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
    expect(store.updateAttempt).toHaveBeenCalledWith('i', 'a', expect.objectContaining({ status: 'FAILED', risk_after_diff: 'MEDIUM', test_result: expect.objectContaining({ agent_diagnostics: expect.objectContaining({ exit_code: 0, files_changed: false, validation_stage: 'diff', summary: 'No changes. token [redacted]', stderr_summary: 'password [redacted]', cwd: '/home/autoheal/workspaces/worktrees/i', sandbox_mode: 'workspace-write', command_summary: expect.stringContaining('--sandbox workspace-write') }) }) }));
    expect(store.updateIncident).toHaveBeenCalledWith('t', 'i', expect.objectContaining({ status: 'FAILED', risk_level: 'LOW' }));
  });

  it('rejects a completion whose attempt belongs to another incident', async () => {
    const store = {
      getIncident: jest.fn().mockResolvedValue({ id: 'incident-a', status: 'PATCHING', risk_level: 'LOW' }),
      latestAttempt: jest.fn().mockResolvedValue({ id: 'attempt-b', incident_id: 'incident-b', status: 'RUNNING' }),
      updateAttempt: jest.fn(), updateIncident: jest.fn(),
    };
    const service = Object.create(SupportAutofixService.prototype) as any;
    service.store = store;
    await expect(service.finishWorkerAttempt('tenant-a', 'incident-a', { attemptId: 'attempt-b', status: 'INFRASTRUCTURE_FAILURE' }))
      .rejects.toThrow('does not belong to the active incident attempt');
    expect(store.updateAttempt).not.toHaveBeenCalled();
    expect(store.updateIncident).not.toHaveBeenCalled();
  });

  it('keeps simultaneous incident completions bound to their own attempts', async () => {
    const store = {
      getIncident: jest.fn(async (_tenantId: string, incidentId: string) => ({ id: incidentId, status: 'PATCHING', risk_level: 'LOW' })),
      latestAttempt: jest.fn(async (incidentId: string) => ({ id: `attempt-${incidentId}`, incident_id: incidentId, status: 'RUNNING' })),
      updateAttempt: jest.fn().mockResolvedValue({}),
      updateIncident: jest.fn().mockResolvedValue({}),
      writeEvent: jest.fn().mockResolvedValue(undefined),
    };
    const service = Object.create(SupportAutofixService.prototype) as any;
    service.store = store;
    await Promise.all(['incident-a', 'incident-b'].map((incidentId) => service.finishWorkerAttempt('tenant-a', incidentId, {
      attemptId: `attempt-${incidentId}`, status: 'INFRASTRUCTURE_FAILURE', agentDiagnostics: { summary: 'validation tooling blocked' },
    })));
    expect(store.updateAttempt.mock.calls.map((call: any[]) => call.slice(0, 2)).sort()).toEqual([
      ['incident-a', 'attempt-incident-a'], ['incident-b', 'attempt-incident-b'],
    ]);
    expect(store.updateIncident.mock.calls.map((call: any[]) => call.slice(0, 2)).sort()).toEqual([
      ['tenant-a', 'incident-a'], ['tenant-a', 'incident-b'],
    ]);
  });

  it('records sandbox startup failures as infrastructure only without changing risk or fabricating validation failures', async () => {
    const store = {
      getIncident: jest.fn().mockResolvedValue({ id: 'i', status: 'PATCHING', risk_level: 'LOW', risk_reason: 'Recognized low-risk UI category: search-filter-ui.' }),
      latestAttempt: jest.fn().mockResolvedValue({ id: 'a', incident_id: 'i', status: 'RUNNING', base_sha: 'a'.repeat(40) }),
      updateAttempt: jest.fn(), updateIncident: jest.fn(), writeEvent: jest.fn(),
    };
    const service = Object.create(SupportAutofixService.prototype) as any;
    service.store = store;
    const result = await service.finishWorkerAttempt('t', 'i', {
      attemptId: 'a', status: 'INFRASTRUCTURE_FAILURE', provider: 'codex-cli', model: 'gpt-6-luna', riskAfterDiff: 'LOW',
      testResult: {}, buildResult: {}, agentDiagnostics: { failureClass: 'INFRASTRUCTURE_FAILURE', summary: 'bwrap: Failed RTM_NEWADDR' },
    });
    expect(result).toEqual({ status: 'TRIAGING', attemptStatus: 'INFRASTRUCTURE_FAILURE' });
    expect(store.updateAttempt).toHaveBeenCalledWith('i', 'a', expect.objectContaining({ status: 'FAILED', risk_after_diff: 'LOW', test_result: expect.objectContaining({ agent_diagnostics: expect.objectContaining({ failure_class: 'INFRASTRUCTURE_FAILURE' }) }) }));
    expect(store.updateAttempt.mock.calls[0][2].test_result).not.toHaveProperty('focusedTest');
    expect(store.updateIncident).toHaveBeenCalledWith('t', 'i', { status: 'TRIAGING' });
    expect(store.writeEvent).toHaveBeenCalledWith(expect.objectContaining({ type: 'autofix.infrastructure-failure', details: expect.objectContaining({ attemptCounted: false }) }));
  });

  it('reports a live sandbox block distinctly from online and offline worker states', async () => {
    const service = Object.create(SupportAutofixService.prototype) as any;
    service.store = { getWorkerHeartbeat: jest.fn().mockResolvedValue({ worker_id: 'worker-a', current_incident: 'SANDBOX_BLOCKED', queue_depth: 3, updated_at: new Date().toISOString() }) };
    await expect(service.getWorkerHealth()).resolves.toMatchObject({ status: 'DEGRADED', stateCode: 'SANDBOX_BLOCKED', stateMessage: 'Worker sandbox unavailable', queueDepth: 3, currentIncident: null });
  });

  it('reports unavailable web validation tools as a distinct degraded worker state', async () => {
    const service = Object.create(SupportAutofixService.prototype) as any;
    service.store = { getWorkerHeartbeat: jest.fn().mockResolvedValue({ worker_id: 'worker-a', current_incident: 'VALIDATION_TOOLS_BLOCKED', queue_depth: 1, updated_at: new Date().toISOString() }) };
    await expect(service.getWorkerHealth()).resolves.toMatchObject({ status: 'DEGRADED', stateCode: 'VALIDATION_TOOLS_BLOCKED', stateMessage: 'Worker validation tools unavailable', queueDepth: 1, currentIncident: null });
  });

  it('restores LOW risk only for a recognized failed-attempt reason and normalizes route before retry', async () => {
    process.env.AUTOHEAL_ENABLED = 'true';
    const store = {
      getIncident: jest.fn().mockResolvedValue({ id: 'i', status: 'FAILED', risk_level: 'MEDIUM', risk_reason: 'No changed files were found. Focused test did not pass. Web type-check did not pass. Web build did not pass. git diff --check did not pass. Relevant smoke check did not pass. Fix commit SHA is missing or invalid.', title: 'Procurement / Purchase Orders: PO search', description: 'Unable to search PO', module: 'Procurement / Purchase Orders', route: '/dashboard/reports/executive/overview', page_url: '/dashboard/reports/executive/overview' }),
      countAttempts: jest.fn().mockResolvedValue(1), latestAttempt: jest.fn().mockResolvedValue(null), updateIncident: jest.fn().mockResolvedValue({}), writeEvent: jest.fn(),
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

  it('allows one audited recovery after legacy infrastructure failures while preserving historical numbering', async () => {
    process.env.AUTOHEAL_ENABLED = 'true';
    const incident = { id: 'i', status: 'ESCALATED', risk_level: 'LOW', title: 'PO Search', description: 'Unable to search Purchase Orders', module: 'Procurement / Purchase Orders', route: '/dashboard/purchase/orders' };
    const latest = { status: 'FAILED', files_changed: [], commit_sha: null, test_result: { agent_diagnostics: { summary: 'Blocked before inspection: bwrap: loopback: Failed RTM_NEWADDR: Operation not permitted' } } };
    const history = [
      { status: 'FAILED', files_changed: [], test_result: { agent_diagnostics: { summary: 'Wrong module and route context.' } } },
      { status: 'FAILED', files_changed: [], test_result: { agent_diagnostics: { stderr_summary: 'EWADDR: Operation not permitted' } } },
      latest,
    ];
    const store = { getIncident: jest.fn().mockResolvedValue(incident), countAttempts: jest.fn().mockResolvedValue(1), countHistoricalAttempts: jest.fn().mockResolvedValue(3), listAttempts: jest.fn().mockResolvedValue(history), latestAttempt: jest.fn().mockResolvedValue(latest), hasInfrastructureRetryRequest: jest.fn().mockResolvedValue(false), hasReadyAttempt: jest.fn().mockResolvedValue(false), updateIncident: jest.fn().mockResolvedValue({}), writeEvent: jest.fn().mockResolvedValue(undefined) };
    const queue = { add: jest.fn().mockResolvedValue(undefined) };
    const audit = { logActivity: jest.fn().mockResolvedValue(undefined) };
    const service = Object.create(SupportAutofixService.prototype) as any;
    service.store = store; service.queue = queue; service.audit = audit; service.getWorkerHealth = jest.fn().mockResolvedValue({ status: 'ONLINE' });
    await expect(service.retryAfterInfrastructureFailure('tenant', 'i', 'admin')).resolves.toEqual({ queued: true, attemptNumber: 4 });
    expect(store.updateIncident).toHaveBeenCalledWith('tenant', 'i', expect.objectContaining({ status: 'TRIAGING', risk_level: 'LOW', route: '/dashboard/purchase/orders' }));
    expect(store.writeEvent).toHaveBeenCalledWith(expect.objectContaining({ type: 'autofix.infrastructure-retry-requested', details: expect.objectContaining({ attemptNumber: 4, priorAttempts: 3, genuineAttempts: 1 }) }), 'admin');
    expect(queue.add).toHaveBeenCalledTimes(1);
    expect(queue.add).toHaveBeenCalledWith('incident', { tenantId: 'tenant', incidentId: 'i' }, expect.objectContaining({ jobId: 'infrastructure-retry-i-attempt-4' }));
  });

  it('prevents reuse of the one-time infrastructure retry and keeps ordinary attempts capped at two', async () => {
    process.env.AUTOHEAL_ENABLED = 'true';
    const incident = { id: 'i', status: 'ESCALATED', risk_level: 'LOW', title: 'PO Search', description: 'Unable to search Purchase Orders', module: 'Procurement / Purchase Orders', route: '/dashboard/purchase/orders' };
    const latest = { status: 'FAILED', files_changed: [], test_result: { agent_diagnostics: { summary: 'EWADDR: Operation not permitted' } } };
    const store = { getIncident: jest.fn().mockResolvedValue(incident), countAttempts: jest.fn().mockResolvedValue(1), countHistoricalAttempts: jest.fn().mockResolvedValue(1), latestAttempt: jest.fn().mockResolvedValue(latest), listAttempts: jest.fn().mockResolvedValue([latest]), hasInfrastructureRetryRequest: jest.fn().mockResolvedValue(true), hasReadyAttempt: jest.fn().mockResolvedValue(false), updateIncident: jest.fn() };
    const queue = { add: jest.fn() };
    const service = Object.create(SupportAutofixService.prototype) as any;
    service.store = store; service.queue = queue; service.getWorkerHealth = jest.fn().mockResolvedValue({ status: 'ONLINE' });
    await expect(service.retryAfterInfrastructureFailure('tenant', 'i', 'admin')).rejects.toThrow('already used');
    await expect(service.retryAnalysis('tenant', 'i', 'admin')).rejects.toThrow('audited infrastructure recovery');
    expect(queue.add).not.toHaveBeenCalled();
  });

  it('allows the worker to create the next historical attempt only after authorized infrastructure recovery', async () => {
    process.env.AUTOHEAL_ENABLED = 'true';
    const store = { getIncident: jest.fn().mockResolvedValue({ id: 'i', status: 'TRIAGING', risk_level: 'LOW', title: 'PO Search', description: 'Unable to search Purchase Orders', module: 'Procurement / Purchase Orders', route: '/dashboard/purchase/orders' }), countAttempts: jest.fn().mockResolvedValue(1), countHistoricalAttempts: jest.fn().mockResolvedValue(4), latestAttempt: jest.fn().mockResolvedValue({ status: 'FAILED', files_changed: [], test_result: { agent_diagnostics: { summary: 'bwrap: Failed RTM_NEWADDR' } } }), hasInfrastructureRetryRequest: jest.fn().mockResolvedValue(true), updateIncident: jest.fn().mockResolvedValue({}), createAttempt: jest.fn().mockResolvedValue({ id: 'attempt-5', branch_name: 'autofix/i-attempt-5-po-search' }) };
    const service = Object.create(SupportAutofixService.prototype) as any;
    service.store = store;
    const started = await service.startWorkerAttempt('tenant', 'i', { branchName: 'autofix/i-attempt-5-po-search', baseSha: 'a'.repeat(40) });
    expect(started).toMatchObject({ incidentId: 'i', branchName: 'autofix/i-attempt-5-po-search', attemptId: 'attempt-5', attemptNumber: 5, incident: { id: 'i', riskLevel: 'LOW', module: 'Procurement / Purchase Orders', route: '/dashboard/purchase/orders', category: 'search-filter-ui' } });
    expect(store.createAttempt).toHaveBeenCalledTimes(1);
  });

  it('rejects a worktree branch whose incident ID does not match the requested attempt', async () => {
    process.env.AUTOHEAL_ENABLED = 'true';
    const store = {
      getIncident: jest.fn().mockResolvedValue({ id: 'incident-a', status: 'NEW', risk_level: 'LOW', title: 'PO search', description: 'Search UI', module: 'Procurement / Purchase Orders', route: '/dashboard/purchase/orders' }),
      countAttempts: jest.fn().mockResolvedValue(0), latestAttempt: jest.fn().mockResolvedValue(null),
      countHistoricalAttempts: jest.fn().mockResolvedValue(0), hasInfrastructureRetryRequest: jest.fn().mockResolvedValue(false), createAttempt: jest.fn(), updateIncident: jest.fn(),
    };
    const service = Object.create(SupportAutofixService.prototype) as any;
    service.store = store;
    await expect(service.startWorkerAttempt('tenant-a', 'incident-a', { branchName: 'autofix/incident-b-attempt-1-po-search', baseSha: 'a'.repeat(40) }))
      .rejects.toThrow('branch identity does not match');
    expect(store.createAttempt).not.toHaveBeenCalled();
  });

  it('blocks recovery unless the worker heartbeat confirms a fresh green preflight', async () => {
    process.env.AUTOHEAL_ENABLED = 'true';
    const latest = { status: 'FAILED', files_changed: [], test_result: { agent_diagnostics: { summary: 'bwrap sandbox initialization failed' } } };
    const store = { getIncident: jest.fn().mockResolvedValue({ id: 'i', status: 'ESCALATED', risk_level: 'LOW', title: 'PO Search', description: 'Unable to search Purchase Orders', module: 'Procurement / Purchase Orders', route: '/dashboard/purchase/orders' }), countAttempts: jest.fn().mockResolvedValue(1), latestAttempt: jest.fn().mockResolvedValue(latest), listAttempts: jest.fn().mockResolvedValue([latest]), hasInfrastructureRetryRequest: jest.fn().mockResolvedValue(false), hasReadyAttempt: jest.fn().mockResolvedValue(false), updateIncident: jest.fn(), countHistoricalAttempts: jest.fn() };
    const queue = { add: jest.fn() };
    const service = Object.create(SupportAutofixService.prototype) as any;
    service.store = store; service.queue = queue; service.getWorkerHealth = jest.fn().mockResolvedValue({ status: 'DEGRADED' });
    await expect(service.retryAfterInfrastructureFailure('tenant', 'i', 'admin')).rejects.toThrow('healthy worker sandbox and validation-tool preflight');
    expect(store.updateIncident).not.toHaveBeenCalled();
    expect(queue.add).not.toHaveBeenCalled();
  });

  it('keeps normal tenant admins inside their tenant and grants central visibility only to SUPER_ADMIN', async () => {
    const service = Object.create(SupportAutofixService.prototype) as any;
    service.store = { listIncidents: jest.fn().mockResolvedValue([]), getIncident: jest.fn().mockResolvedValue(null), getIncidentById: jest.fn().mockResolvedValue({ id: 'i', tenant_id: 'tenant-b' }) };
    await service.listAdminForUser({ tenantId: 'tenant-a', role: 'ADMIN' }, {});
    expect(service.store.listIncidents).toHaveBeenLastCalledWith('tenant-a', {});
    await expect(service.getAdminIncidentForUser({ tenantId: 'tenant-a', role: 'ADMIN' }, 'i')).rejects.toThrow('Support incident not found');
    expect(service.store.getIncidentById).not.toHaveBeenCalled();
    await service.listAdminForUser({ tenantId: 'tenant-a', role: 'SUPER_ADMIN' }, {});
    expect(service.store.listIncidents).toHaveBeenLastCalledWith(null, {});
    await expect(service.adminTenantId({ role: 'SUPER_ADMIN' }, 'i')).resolves.toBe('tenant-b');
  });

  it('loads Admin attempts only through the selected incident ID', async () => {
    const service = Object.create(SupportAutofixService.prototype) as any;
    const incident = { id: 'incident-a', tenant_id: 'tenant-a', status: 'FAILED', risk_level: 'LOW' };
    service.store = {
      getIncidentById: jest.fn().mockResolvedValue(incident),
      getIncident: jest.fn().mockResolvedValue(incident),
      listAttempts: jest.fn().mockResolvedValue([{ id: 'attempt-a', incident_id: 'incident-a' }]),
      listDeployments: jest.fn().mockResolvedValue([]),
      countAttempts: jest.fn().mockResolvedValue(0), countHistoricalAttempts: jest.fn().mockResolvedValue(1),
      hasInfrastructureRetryRequest: jest.fn().mockResolvedValue(false), hasReadyAttempt: jest.fn().mockResolvedValue(false),
    };
    service.getWorkerHealth = jest.fn().mockResolvedValue({ status: 'OFFLINE' });
    const detail = await service.getAdminIncidentForUser({ tenantId: 'tenant-a', role: 'ADMIN' }, 'incident-a');
    expect(service.store.listAttempts).toHaveBeenCalledWith('incident-a');
    expect(detail.attempts).toEqual([expect.objectContaining({ id: 'attempt-a', incident_id: 'incident-a' })]);
  });

  it('derives recovery eligibility and hides post-diff risk for legacy infrastructure attempts without rewriting history', async () => {
    process.env.AUTOHEAL_ENABLED = 'true';
    const attempts = [
      { id: 'a3', status: 'FAILED', risk_after_diff: 'MEDIUM', files_changed: [], commit_sha: null, test_result: { agent_diagnostics: { summary: 'Blocked before inspection: bwrap: loopback: Failed RTM_NEWADDR: Operation not permitted' } } },
      { id: 'a2', status: 'FAILED', risk_after_diff: 'MEDIUM', files_changed: [], commit_sha: null, test_result: { agent_diagnostics: { stderr_summary: 'EWADDR: Operation not permitted' } } },
      { id: 'a1', status: 'FAILED', risk_after_diff: 'MEDIUM', files_changed: [], commit_sha: null, test_result: { agent_diagnostics: { summary: 'Wrong module and route context.' } } },
    ];
    const incident = { id: 'i', tenant_id: 'tenant-b', status: 'ESCALATED', risk_level: 'LOW', title: 'PO search', description: 'Unable to search Purchase Orders', module: 'Procurement / Purchase Orders', route: '/dashboard/purchase/orders', reported_by: 'reporter' };
    const service = Object.create(SupportAutofixService.prototype) as any;
    service.store = {
      getIncidentById: jest.fn().mockResolvedValue(incident), getIncident: jest.fn().mockResolvedValue(incident),
      listAttempts: jest.fn().mockResolvedValue(attempts), listDeployments: jest.fn().mockResolvedValue([]),
      countAttempts: jest.fn().mockResolvedValue(1), countHistoricalAttempts: jest.fn().mockResolvedValue(3), hasInfrastructureRetryRequest: jest.fn().mockResolvedValue(false), hasReadyAttempt: jest.fn().mockResolvedValue(false),
    };
    service.getWorkerHealth = jest.fn().mockResolvedValue({ status: 'ONLINE' });
    const result = await service.getAdminIncidentForUser({ role: 'SUPER_ADMIN' }, 'i');
    expect(result).toMatchObject({ tenant_id: 'tenant-b', reported_by: 'reporter', isCentralSupportAdmin: true, recovery: { eligible: true, reason: null, genuineAttempts: 1, remainingAttempts: 1, workerReady: true } });
    expect(result.attempts[0]).toMatchObject({ attempt_number: 3, failure_class: 'INFRASTRUCTURE_FAILURE', display_risk_after_diff: null });
    expect(result.attempts[0].risk_after_diff).toBe('MEDIUM');
    expect(result.attempts[2].failure_class).toBeNull();
  });

  it.each([
    { name: 'exhausted genuine attempts', genuine: 2, used: false, worker: 'ONLINE', reason: 'No genuine coding attempts remain under the two-attempt limit.' },
    { name: 'unhealthy worker', genuine: 1, used: false, worker: 'OFFLINE', reason: 'The worker sandbox and validation-tool preflight is not currently healthy.' },
    { name: 'already-used recovery', genuine: 1, used: true, worker: 'ONLINE', reason: 'The one-time infrastructure recovery retry was already used.' },
  ])('returns an authoritative ineligible result for $name', async ({ genuine, used, worker, reason }) => {
    process.env.AUTOHEAL_ENABLED = 'true';
    const latest = { id: 'a3', status: 'FAILED', risk_after_diff: 'MEDIUM', files_changed: [], commit_sha: null, test_result: { agent_diagnostics: { summary: 'bwrap: loopback: Failed RTM_NEWADDR: Operation not permitted' } } };
    const incident = { id: 'i', tenant_id: 'tenant-b', status: 'ESCALATED', risk_level: 'LOW', title: 'PO search', description: 'Unable to search Purchase Orders', module: 'Procurement / Purchase Orders', route: '/dashboard/purchase/orders' };
    const service = Object.create(SupportAutofixService.prototype) as any;
    service.store = {
      getIncidentById: jest.fn().mockResolvedValue(incident), getIncident: jest.fn().mockResolvedValue(incident),
      listAttempts: jest.fn().mockResolvedValue([latest]), listDeployments: jest.fn().mockResolvedValue([]),
      countAttempts: jest.fn().mockResolvedValue(genuine), countHistoricalAttempts: jest.fn().mockResolvedValue(3),
      hasInfrastructureRetryRequest: jest.fn().mockResolvedValue(used), hasReadyAttempt: jest.fn().mockResolvedValue(false),
    };
    service.getWorkerHealth = jest.fn().mockResolvedValue({ status: worker });
    const result = await service.getAdminIncidentForUser({ role: 'SUPER_ADMIN' }, 'i');
    expect(result.recovery).toMatchObject({ eligible: false, reason, genuineAttempts: genuine, remainingAttempts: Math.max(0, 2 - genuine), workerReady: worker === 'ONLINE' });
  });
});
