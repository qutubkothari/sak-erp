import { AiProviderService } from './ai-provider.service';

const config = (values: Record<string, string> = {}) => ({ get: (key: string) => values[key] }) as any;

describe('AiProviderService controlled degradation', () => {
  it('returns deterministic fallback when no provider is configured', async () => {
    const service = new AiProviderService(config({ AI_PROVIDER: 'DISABLED' }));
    const result = await service.structuredJson({ capability: 'TEST', system: 'Return JSON', data: {}, fallback: { answer: 'safe' } });
    expect(result.value).toEqual({ answer: 'safe' }); expect(result.fallback_used).toBe(true); expect(result.failure_reason).toBe('PROVIDER_NOT_CONFIGURED');
  });

  it('rejects oversized provider context before making a provider call', async () => {
    const service = new AiProviderService(config({ AI_PROVIDER: 'DISABLED' }));
    const result = await service.structuredJson({ capability: 'TEST', system: 'Return JSON', data: { text: 'x'.repeat(200001) }, fallback: { safe: true } });
    expect(result.failure_reason).toBe('BOUNDED_CONTEXT_EXCEEDED');
  });

  it('uses tenant-scoped cache without a second provider call', async () => {
    const service = new AiProviderService(config({ OPENAI_API_KEY: 'test', AI_CACHE_TTL_MS: '60000' }));
    const create = jest.fn().mockResolvedValue({ choices: [{ message: { content: '{"answer":"verified"}' } }], usage: { prompt_tokens: 2, completion_tokens: 1, total_tokens: 3 } });
    (service as any).client = { chat: { completions: { create } } };
    const request = { capability: 'TEST', scope: 'tenant:t-1', system: 'Return JSON', data: { bounded: true }, fallback: { answer: 'safe' } };
    const first = await service.structuredJson(request); const second = await service.structuredJson(request);
    expect(first.value).toEqual({ answer: 'verified' }); expect(second.value).toEqual({ answer: 'verified' }); expect(create).toHaveBeenCalledTimes(1); expect(service.status().cache.entries).toBe(1);
  });

  it('opens its circuit after configured provider failures', async () => {
    const service = new AiProviderService(config({ OPENAI_API_KEY: 'test', AI_CIRCUIT_FAILURE_THRESHOLD: '1', AI_CIRCUIT_RESET_MS: '60000' }));
    const create = jest.fn().mockRejectedValue(new Error('provider unavailable')); (service as any).client = { chat: { completions: { create } } };
    const request = { capability: 'TEST', system: 'Return JSON', data: {}, fallback: { safe: true } };
    const first = await service.structuredJson(request); const second = await service.structuredJson(request);
    expect(first.fallback_used).toBe(true); expect(second.failure_reason).toBe('PROVIDER_CIRCUIT_OPEN'); expect(create).toHaveBeenCalledTimes(1); expect(service.status().circuit).toBe('OPEN');
  });
});
