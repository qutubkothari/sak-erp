import { BadRequestException } from '@nestjs/common';
import { IntelligenceService } from './intelligence.service';
import { GovernedToolRegistryService } from './governed-tool-registry.service';

process.env.SUPABASE_URL = process.env.SUPABASE_URL || 'http://127.0.0.1:54321';
process.env.SUPABASE_KEY = process.env.SUPABASE_KEY || 'test-anon-key';

describe('IntelligenceService critical behaviour', () => {
  const dashboard = { getCockpit: jest.fn() };
  const value = { dashboard: jest.fn() };
  const audit = { logActivity: jest.fn().mockResolvedValue(undefined) };
  const events = { recent: jest.fn(), record: jest.fn() };
  const tools = new GovernedToolRegistryService();
  const ai = { structuredJson: jest.fn(async (request: any) => ({ value: request.fallback, provider: 'DETERMINISTIC_FALLBACK', model: null, fallback_used: true, latency_ms: 0 })), status: jest.fn(() => ({ configured: false })) };
  let service: IntelligenceService;

  beforeEach(() => { jest.clearAllMocks(); service = new IntelligenceService(dashboard as any, value as any, audit as any, events as any, tools, ai as any); });

  it('rejects empty and oversized Copilot questions', async () => {
    await expect(service.ask('tenant-a', { id: 'u' }, '', {})).rejects.toBeInstanceOf(BadRequestException);
    await expect(service.ask('tenant-a', { id: 'u' }, 'x'.repeat(501), {})).rejects.toBeInstanceOf(BadRequestException);
  });

  it('returns missing-data behaviour instead of inventing a report', async () => {
    jest.spyOn(service, 'commandCenter').mockResolvedValue({ decision_inbox: [], metrics: [], operating_health: {}, role_view: 'EXECUTIVE' } as any);
    const result = await service.naturalLanguageReport('tenant-a', { id: 'u' }, 'invent a number', {});
    expect(result.sufficient_data).toBe(false); expect(result.confidence).toBe('LOW'); expect(result.rows).toEqual([]);
  });

  it('does not execute a high-risk native action through the task endpoint', async () => {
    await expect(service.executeControlledAction('tenant-a', { id: 'u', permissions: ['job_orders:create'] }, { insight_id: 'i', action_code: 'CREATE_MAINTENANCE_WORK_ORDER' }, {})).rejects.toThrow('governed action-request workflow');
  });

  it('passes tenant scope to the AI provider and audits the question', async () => {
    jest.spyOn(service, 'commandCenter').mockResolvedValue({ decision_inbox: [], daily_focus: [], operating_health: { open_exceptions: 0 }, roi_impact: null } as any);
    const result = await service.ask('tenant-a', { id: 'u' }, 'What needs attention?', { ip: '127.0.0.1', headers: {} });
    expect(ai.structuredJson).toHaveBeenCalledWith(expect.objectContaining({ scope: 'tenant:tenant-a' })); expect(audit.logActivity).toHaveBeenCalledWith(expect.objectContaining({ tenantId: 'tenant-a' })); expect(result.read_only).toBe(true);
  });

  it('keeps business-memory queries tenant scoped', async () => {
    jest.spyOn(service, 'exceptionRegister').mockResolvedValue([{ id: 'e1', source_type: 'INVENTORY', source_key: 'risk-1', title: 'Shortage', status: 'OPEN', evidence: {}, last_seen_at: '2026-01-01' }] as any);
    events.recent.mockResolvedValue([{ id: 'v1', title: 'Task created', event_type: 'TASK', correlation_id: 'risk-1', source_type: 'automation_task', source_id: 't1', payload: {}, created_at: '2026-01-01' }]);
    const result = await service.businessMemory('tenant-a', 100);
    expect(events.recent).toHaveBeenCalledWith('tenant-a', 100); expect(result.edges.some((edge: any) => edge.relationship === 'CORRELATED_WITH')).toBe(true);
  });

  it('requires historical observations before forecasting', async () => {
    jest.spyOn(service, 'healthHistory').mockResolvedValue({ history: [] } as any);
    const result = await service.healthForecast('tenant-a', 7);
    expect(result.sufficient_data).toBe(false); expect(result.confidence).toBe('LOW'); expect(result.forecast).toEqual([]);
  });
});
