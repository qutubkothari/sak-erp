export type IncidentLifecycle = 'ACTIVE' | 'RESOLVED' | 'ARCHIVED';

export const ACTIVE_INCIDENT_STATUSES = [
  'NEW', 'TRIAGING', 'PATCHING', 'TESTING', 'READY_FOR_APPROVAL',
  'DEPLOYING', 'VERIFYING', 'FAILED', 'ESCALATED', 'ROLLED_BACK',
] as const;

export function incidentLifecycle(status: unknown, archivedAt?: unknown): IncidentLifecycle {
  if (archivedAt) return 'ARCHIVED';
  return String(status).toUpperCase() === 'RESOLVED' ? 'RESOLVED' : 'ACTIVE';
}

export function filterIncidentsByLifecycle<T extends { status: string; archived_at?: string | null }>(rows: T[], lifecycle: IncidentLifecycle) {
  return rows.filter((row) => incidentLifecycle(row.status, row.archived_at) === lifecycle);
}
