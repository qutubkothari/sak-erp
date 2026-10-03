import { aiModelCall, aiPerformance, observedBrainRead, withAiPerformance } from './unified-ai.performance';

describe('Request-only AI performance', () => {
  it('coalesces identical reads and returns independent copies', async () => {
    const read = jest.fn(async () => [{ id: 'record', value: 1 }]);
    await withAiPerformance(async () => {
      const [first, second] = await Promise.all([observedBrainRead('owned-query', read), observedBrainRead('owned-query', read)]);
      first[0].value = 9;
      expect(second[0].value).toBe(1);
      expect(read).toHaveBeenCalledTimes(1);
      expect(aiPerformance()).toMatchObject({ query_count: 1, cache_hits: 1, model_calls: 0 });
      expect(aiPerformance().query_ms).toBeGreaterThanOrEqual(0);
    });
  });
  it('never reuses results between concurrent users or tenants', async () => {
    const results = await Promise.all(['tenant-a', 'tenant-b'].map(tenant => withAiPerformance(async () => observedBrainRead('same-query', async () => [{ tenant }]))));
    expect(results).toEqual([[{ tenant: 'tenant-a' }], [{ tenant: 'tenant-b' }]]);
  });
  it('evicts failed reads without caching unavailable evidence', async () => {
    await withAiPerformance(async () => {
      await expect(observedBrainRead('query', async () => { throw new Error('Unavailable'); })).rejects.toThrow('Unavailable');
      expect(await observedBrainRead('query', async () => [{ id: 'recovered' }])).toEqual([{ id: 'recovered' }]);
      expect(aiPerformance().query_count).toBe(2);
    });
  });
  it('does not memoize reads outside an authorized request', async () => {
    const read = jest.fn(async () => []);
    await observedBrainRead('query', read); await observedBrainRead('query', read);
    expect(read).toHaveBeenCalledTimes(2);
  });
  it('stores only bounded numeric observations, not prompt or query text', async () => {
    await withAiPerformance(async () => {
      aiModelCall(); await observedBrainRead('confidential-query', async () => [{ secret: 'private-value' }]);
      expect(aiPerformance()).toMatchObject({ model_calls: 1 });
      expect(JSON.stringify(aiPerformance())).not.toMatch(/confidential|private|secret/);
    });
  });
});