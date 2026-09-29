import { SupportAutofixService } from './support-autofix.service';
import { canDeployFix } from './deployment';
import { AUTOHEAL_PATCH_QUEUE, patchRedisOptions } from './patch-queue';

describe('initial patch queue handoff', () => {
  const original = { ...process.env };
  afterEach(() => { process.env = { ...original }; });
  function setup(risk = 'LOW') {
    process.env.AUTOHEAL_ENABLED = 'true'; process.env.AUTOHEAL_MODE = 'SHADOW';
    process.env.AUTOHEAL_WORKER_ENABLED = 'false'; process.env.AUTOHEAL_AGENT_PROVIDER = 'mock';
    const incident = { id: 'i', tenant_id: 't', status: 'NEW', risk_level: risk, title: 'PO search is broken', description: 'Search all purchase orders', module: 'Procurement / Purchase Orders', route: '/dashboard/purchase/orders' };
    const jobs = new Map();
    const queue = {
      isReady: jest.fn().mockResolvedValue(true), client: { ping: jest.fn().mockResolvedValue('PONG') },
      isPaused: jest.fn().mockResolvedValue(false), getJob: jest.fn(async (id) => jobs.get(id)),
      add: jest.fn(async (_name, data, options) => { if (!jobs.has(options.jobId)) jobs.set(options.jobId, { data, getState: async () => 'waiting' }); return jobs.get(options.jobId); }),
    };
    const store = {
      getIncident: jest.fn(async () => ({ ...incident })), countHistoricalAttempts: jest.fn().mockResolvedValue(0),
      markInitialIncidentQueued: jest.fn(async () => { if (incident.status === 'NEW') incident.status = 'TRIAGING'; }),
      updateIncident: jest.fn(async (_t, _i, patch) => Object.assign(incident, patch)), writeEvent: jest.fn(),
      captureIncident: jest.fn().mockResolvedValue({ incident, deduplicated: false }),
      getWorkerHeartbeat: jest.fn().mockResolvedValue({ updated_at: new Date().toISOString(), current_incident: null, queue_depth: 0 }),
    };
    const service = Object.create(SupportAutofixService.prototype) as any;
    Object.assign(service, { store, queue });
    return { service, store, queue, incident, jobs };
  }
  it.each(['SHADOW', 'APPROVAL'])('queues LOW in %s independent of worker credentials and API mock provider', async mode => {
    const f = setup(); process.env.AUTOHEAL_MODE = mode;
    expect(await f.service.queueInitialIncident('t', 'i')).toMatchObject({ state: 'QUEUED', status: 'TRIAGING' });
    expect(f.queue.add).toHaveBeenCalledWith('incident', { tenantId: 't', incidentId: 'i' }, expect.objectContaining({ jobId: 'incident-i', attempts: 1, removeOnComplete: false }));
    expect(f.incident.status).toBe('TRIAGING');
    expect(f.store.writeEvent).toHaveBeenCalledWith(expect.objectContaining({ type: 'autofix.queued' }), undefined);
  });
  it('SHADOW never permits deployment even after patch validation', () => {
    expect(canDeployFix('SHADOW', true, 'LOW', { allowed: true, risk: 'LOW', reasons: [], changedFiles: 1, linesChanged: 1 }, true)).toBe(false);
  });
  it.each(['HIGH', 'BLOCKED'])('does not queue %s', async risk => {
    const f = setup(risk); await f.service.queueInitialIncident('t', 'i'); expect(f.queue.add).not.toHaveBeenCalled();
  });
  it('honors the global kill switch', async () => {
    const f = setup(); process.env.AUTOHEAL_ENABLED = 'false';
    expect(await f.service.queueInitialIncident('t', 'i')).toMatchObject({ state: 'DISABLED' }); expect(f.queue.add).not.toHaveBeenCalled();
  });
  it('surfaces a paused or unhealthy worker while preserving one durable job', async () => {
    const f = setup(); f.queue.isPaused.mockResolvedValue(true);
    f.store.getWorkerHeartbeat.mockResolvedValue({ updated_at: new Date().toISOString(), current_incident: 'VALIDATION_TOOLS_BLOCKED', queue_depth: 1 });
    const result = await f.service.captureIncident({ tenantId: 't', userId: 'u' }, {});
    expect(result.status).toContain('Support automation temporarily unavailable'); expect(f.jobs.size).toBe(1);
    expect(f.incident.status).toBe('TRIAGING');
  });
  it.each(['add', 'readiness'])('records %s failure and does not leave silent NEW', async failure => {
    const f = setup();
    if (failure === 'add') f.queue.add.mockRejectedValue(new Error('queue add failed'));
    else f.queue.client.ping.mockRejectedValue(new Error('queue unavailable'));
    expect(await f.service.queueInitialIncident('t', 'i')).toMatchObject({ state: 'UNAVAILABLE', status: 'FAILED' });
    expect(f.store.writeEvent).toHaveBeenCalledWith(expect.objectContaining({ type: 'autofix.queue-failed' }), undefined);
    expect(f.incident.status).toBe('FAILED');
  });
  it('does not suppress the first job for a deduplicated report', async () => {
    const f = setup(); f.store.captureIncident.mockResolvedValue({ incident: f.incident, deduplicated: true });
    await f.service.captureIncident({ tenantId: 't', userId: 'u' }, {}); expect(f.jobs.size).toBe(1);
  });
  it('reconciles an existing paused job without adding another', async () => {
    const f = setup(); f.jobs.set('incident-i', { getState: async () => 'paused' });
    await f.service.queueInitialIncident('t', 'i'); expect(f.queue.add).not.toHaveBeenCalled(); expect(f.incident.status).toBe('TRIAGING');
  });
  it('concurrent duplicate requests retain one deterministic job', async () => {
    const f = setup(); await Promise.all([f.service.queueInitialIncident('t', 'i'), f.service.queueInitialIncident('t', 'i')]);
    expect(f.jobs.size).toBe(1);
    await f.service.queueInitialIncident('t', 'i'); expect(f.jobs.size).toBe(1);
  });
  it('never requeues completed jobs or incidents with attempts', async () => {
    const f = setup(); f.jobs.set('incident-i', { getState: async () => 'completed' });
    await f.service.queueInitialIncident('t', 'i'); expect(f.queue.add).not.toHaveBeenCalled();
    f.jobs.clear(); f.store.countHistoricalAttempts.mockResolvedValue(1);
    await f.service.queueInitialIncident('t', 'i'); expect(f.queue.add).not.toHaveBeenCalled();
  });
  it('shares queue name and URL/legacy connection semantics', () => {
    expect(AUTOHEAL_PATCH_QUEUE).toBe('autoheal-patch');
    expect(patchRedisOptions({ REDIS_URL: 'rediss://user:pass@redis.example:6380/2', REDIS_HOST: 'ignored' })).toEqual({ host: 'redis.example', port: 6380, db: 2, username: 'user', password: 'pass', tls: {} });
    expect(patchRedisOptions({ REDIS_HOST: 'host', REDIS_PORT: '6381' })).toEqual({ host: 'host', port: 6381 });
    expect(() => patchRedisOptions({ REDIS_URL: 'redis://host/no' })).toThrow();
  });
});
