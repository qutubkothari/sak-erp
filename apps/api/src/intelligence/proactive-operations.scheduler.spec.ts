import { ProactiveOperationsScheduler } from './proactive-operations.scheduler';

let mockUsers: any[] = [], mockError = false;
const mockReads = jest.fn();
jest.mock('@supabase/supabase-js', () => ({ createClient: () => ({ from: (table: string) => {
  mockReads(table);
  const query: any = { select: () => query, eq: () => query, order: () => query, range: () => query, abortSignal: async () => ({ data: mockUsers, error: mockError ? { message: 'private failure' } : null }) };
  return query;
} }) }));

describe('Read-only local morning schedule', () => {
  let scheduler: ProactiveOperationsScheduler, auth: any, operations: any;
  beforeEach(() => {
    process.env.ERP_TENANT_PROFILE = 'MIZANTRA';
    process.env.MIZANTRA_PROACTIVE_OPERATIONS_ENABLED = 'true';
    process.env.MIZANTRA_DAILY_BRIEF_ENABLED = 'true';
    mockReads.mockClear(); mockError = false; mockUsers = [{ id: 'actor', tenant_id: 'tenant' }];
    auth = { validateUser: jest.fn(async () => ({ id: 'actor', tenantId: 'tenant' })) };
    operations = { due: jest.fn(async () => true), refresh: jest.fn(async () => ({})), brief: jest.fn(async () => ({})), execute: jest.fn(), approve: jest.fn() };
    scheduler = new ProactiveOperationsScheduler(auth, operations);
  });
  afterEach(() => { expect(operations.execute).not.toHaveBeenCalled(); expect(operations.approve).not.toHaveBeenCalled(); });
  it('uses current native authentication before refreshing and briefing', async () => { await scheduler.tick(); expect(auth.validateUser).toHaveBeenCalledWith('actor', 'tenant'); expect(operations.refresh).toHaveBeenCalledWith({ id: 'actor', tenantId: 'tenant' }); expect(operations.brief).toHaveBeenCalledTimes(1); expect(mockReads).toHaveBeenCalledWith('users'); });
  it('does no work when daily briefs are off', async () => { process.env.MIZANTRA_DAILY_BRIEF_ENABLED = 'false'; await scheduler.tick(); expect(mockReads).not.toHaveBeenCalled(); });
  it('does no work on Saif even when raw flags are on', async () => { process.env.ERP_TENANT_PROFILE = 'SAIFSEAS'; await scheduler.tick(); expect(mockReads).not.toHaveBeenCalled(); });
  it('does not brief before local 08:00 or repeat an existing local-day brief', async () => { operations.due.mockResolvedValue(false); await scheduler.tick(); expect(operations.refresh).not.toHaveBeenCalled(); expect(operations.brief).not.toHaveBeenCalled(); });
  it('does not brief an inactive or invalid authenticated user', async () => { auth.validateUser.mockResolvedValue(null); await scheduler.tick(); expect(operations.due).not.toHaveBeenCalled(); });
  it('contains one audience failure and continues with the next user', async () => { mockUsers.push({ id: 'other', tenant_id: 'other-tenant' }); auth.validateUser.mockRejectedValueOnce(new Error('private failure')); await scheduler.tick(); expect(operations.brief).toHaveBeenCalledTimes(1); });
  it('releases the running guard after a source failure', async () => { mockError = true; await scheduler.tick(); mockError = false; await scheduler.tick(); expect(operations.brief).toHaveBeenCalledTimes(1); });
  it('does not overlap ticks in the same process', async () => { let release!: () => void; operations.due.mockImplementationOnce(() => new Promise<void>(resolve => { release = () => resolve(); })); const first = scheduler.tick(); await Promise.resolve(); await Promise.resolve(); await Promise.resolve(); await scheduler.tick(); expect(auth.validateUser).toHaveBeenCalledTimes(1); release(); await first; });
});