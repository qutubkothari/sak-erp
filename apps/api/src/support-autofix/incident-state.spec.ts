import { ConflictException } from '@nestjs/common';
import { assertIncidentTransition, canTransitionIncident } from './incident-state';

describe('AutoHeal incident state machine', () => {
  it('allows the explicit triage, patch, test, approval, deploy and resolve flow', () => {
    const flow = ['NEW', 'TRIAGING', 'PATCHING', 'TESTING', 'READY_FOR_APPROVAL', 'DEPLOYING', 'RESOLVED'] as const;
    for (let index = 0; index < flow.length - 1; index += 1) expect(canTransitionIncident(flow[index], flow[index + 1])).toBe(true);
  });

  it('rejects invalid state transitions', () => {
    expect(canTransitionIncident('NEW', 'RESOLVED')).toBe(false);
    expect(() => assertIncidentTransition('NEW', 'RESOLVED')).toThrow(ConflictException);
  });

  it('allows retry after failure and escalation only through triage', () => {
    expect(canTransitionIncident('FAILED', 'TRIAGING')).toBe(true);
    expect(canTransitionIncident('ESCALATED', 'TRIAGING')).toBe(true);
    expect(canTransitionIncident('RESOLVED', 'TRIAGING')).toBe(false);
  });
});
