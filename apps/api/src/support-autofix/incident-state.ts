import { ConflictException } from '@nestjs/common';
import { IncidentStatus } from './support-autofix.types';

const TRANSITIONS: Record<IncidentStatus, IncidentStatus[]> = {
  NEW: ['TRIAGING', 'READY_FOR_APPROVAL', 'FAILED', 'ESCALATED'],
  TRIAGING: ['PATCHING', 'READY_FOR_APPROVAL', 'FAILED', 'ESCALATED'],
  PATCHING: ['TRIAGING', 'TESTING', 'FAILED', 'ESCALATED'],
  TESTING: ['READY_FOR_APPROVAL', 'DEPLOYING', 'FAILED', 'ESCALATED'],
  READY_FOR_APPROVAL: ['TRIAGING', 'DEPLOYING', 'ESCALATED'],
  DEPLOYING: ['VERIFYING', 'RESOLVED', 'ROLLED_BACK', 'FAILED', 'ESCALATED'],
  VERIFYING: ['RESOLVED', 'ROLLED_BACK', 'FAILED', 'ESCALATED'],
  RESOLVED: ['DEPLOYING'],
  ROLLED_BACK: ['TRIAGING', 'ESCALATED'],
  ESCALATED: ['TRIAGING'],
  FAILED: ['TRIAGING', 'READY_FOR_APPROVAL', 'ESCALATED'],
};

export function canTransitionIncident(from: IncidentStatus, to: IncidentStatus): boolean {
  return from === to || TRANSITIONS[from]?.includes(to) === true;
}

export function assertIncidentTransition(from: IncidentStatus, to: IncidentStatus): void {
  if (!canTransitionIncident(from, to)) throw new ConflictException(`Invalid support incident transition: ${from} → ${to}.`);
}
