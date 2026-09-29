import { filterIncidentsByLifecycle, incidentLifecycle } from './incident-lifecycle';

describe('support incident lifecycle', () => {
  const rows = [
    { id: 'active', status: 'ESCALATED', archived_at: null },
    { id: 'resolved', status: 'RESOLVED', archived_at: null },
    { id: 'archived-active', status: 'FAILED', archived_at: '2026-09-29T10:00:00Z' },
    { id: 'archived-resolved', status: 'RESOLVED', archived_at: '2026-09-29T10:00:00Z' },
  ];

  it('places active engineering statuses, resolved state, and explicit archives in separate views', () => {
    expect(filterIncidentsByLifecycle(rows, 'ACTIVE').map((row) => row.id)).toEqual(['active']);
    expect(filterIncidentsByLifecycle(rows, 'RESOLVED').map((row) => row.id)).toEqual(['resolved']);
    expect(filterIncidentsByLifecycle(rows, 'ARCHIVED').map((row) => row.id)).toEqual(['archived-active', 'archived-resolved']);
    expect(incidentLifecycle('FAILED')).toBe('ACTIVE');
  });

  it('models archival independently of engineering status', () => {
    const archived = { ...rows[0], archived_at: '2026-09-29T10:00:00Z', archived_by: 'user-a' };
    expect(archived.status).toBe('ESCALATED');
    expect(incidentLifecycle(archived.status, archived.archived_at)).toBe('ARCHIVED');
    expect(archived.id).toBe(rows[0].id); // attempts, events, and related history remain attached to the same incident.
  });
});
