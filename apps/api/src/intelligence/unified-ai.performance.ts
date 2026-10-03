import { AsyncLocalStorage } from 'node:async_hooks';

export const AI_LATENCY_TARGETS = { routing_ms: 500, BRAIN_QUERY: 2000, REPORT_BUILDER: 3000, DATA_DOCTOR: 5000 } as const;
export type AiPerformance = { query_ms: number; query_count: number; slow_query_count: number; cache_hits: number; model_calls: number };
type RequestPerformance = AiPerformance & { reads: Map<string, Promise<Record<string, unknown>[]>> };
const requests = new AsyncLocalStorage<RequestPerformance>();

export function withAiPerformance<Result>(work: () => Promise<Result>): Promise<Result> {
  return requests.run({ query_ms: 0, query_count: 0, slow_query_count: 0, cache_hits: 0, model_calls: 0, reads: new Map() }, work);
}
export function aiModelCall() { const request = requests.getStore(); if (request) request.model_calls++; }
export function aiPerformance(): AiPerformance {
  const request = requests.getStore();
  return { query_ms: request?.query_ms || 0, query_count: request?.query_count || 0, slow_query_count: request?.slow_query_count || 0, cache_hits: request?.cache_hits || 0, model_calls: request?.model_calls || 0 };
}
export async function observedBrainRead<Row extends Record<string, unknown>>(key: string, work: () => Promise<Row[]>): Promise<Row[]> {
  const request = requests.getStore();
  if (!request) return work();
  const cached = key && request.reads.get(key);
  if (cached) { request.cache_hits++; return structuredClone(await cached) as Row[]; }
  const started = performance.now();
  const result = work().finally(() => {
    const elapsed = Math.max(0, performance.now() - started);
    request.query_count++; request.query_ms += elapsed; request.slow_query_count += Number(elapsed > 1000);
  });
  if (key && request.reads.size < 100) request.reads.set(key, result);
  try { return structuredClone(await result); }
  catch (error) { if (key) request.reads.delete(key); throw error; }
}