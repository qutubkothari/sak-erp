import { Injectable } from '@nestjs/common';

@Injectable()
export class AutoHealWorkerApiClient {
  private readonly baseUrl = String(process.env.AUTOHEAL_WORKER_API_URL || '').replace(/\/$/, '');
  private readonly token = String(process.env.AUTOHEAL_WORKER_API_TOKEN || '');

  private async request(path: string, method = 'GET', body?: unknown) {
    if (!this.baseUrl || !this.token) throw new Error('Worker API URL and token are required.');
    const url = new URL(`${this.baseUrl}${path}`);
    if (url.protocol !== 'https:' && !['localhost', '127.0.0.1'].includes(url.hostname)) throw new Error('Worker API must use HTTPS outside localhost.');
    const response = await fetch(url, { method, headers: { authorization: `Bearer ${this.token}`, ...(body ? { 'content-type': 'application/json' } : {}) }, body: body ? JSON.stringify(body) : undefined, signal: AbortSignal.timeout(30_000) });
    if (!response.ok) throw new Error(`AutoHeal API returned HTTP ${response.status}.`);
    return response.status === 204 ? null : response.json();
  }

  getIncident(tenantId: string, incidentId: string) { return this.request(`/support/worker/incidents/${encodeURIComponent(tenantId)}/${encodeURIComponent(incidentId)}`); }
  startAttempt(tenantId: string, incidentId: string, body: unknown) { return this.request(`/support/worker/incidents/${encodeURIComponent(tenantId)}/${encodeURIComponent(incidentId)}/start`, 'POST', body); }
  finishAttempt(tenantId: string, incidentId: string, body: unknown) { return this.request(`/support/worker/incidents/${encodeURIComponent(tenantId)}/${encodeURIComponent(incidentId)}/finish`, 'POST', body); }
  heartbeat(body: unknown) { return this.request('/support/worker/heartbeat', 'POST', body); }
}
