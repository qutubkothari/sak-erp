export type AutoHealRisk = 'LOW' | 'MEDIUM' | 'HIGH' | 'BLOCKED';
export type AutoHealMode = 'SHADOW' | 'APPROVAL' | 'AUTO';
export type IncidentStatus =
  | 'NEW'
  | 'TRIAGING'
  | 'PATCHING'
  | 'TESTING'
  | 'READY_FOR_APPROVAL'
  | 'DEPLOYING'
  | 'VERIFYING'
  | 'RESOLVED'
  | 'ROLLED_BACK'
  | 'ESCALATED'
  | 'FAILED';

export interface IncidentInput {
  source?: string;
  title?: string;
  description?: string;
  page_url?: string;
  route?: string;
  module?: string;
  browser_info?: string;
  build_sha?: string;
  error_message?: string;
  failed_endpoint?: string;
  http_status?: number;
  request_id?: string;
  screenshot_ref?: string;
  timestamp?: string;
}

export interface RiskDecision {
  risk: AutoHealRisk;
  reason: string;
  category: string;
}

export interface ValidationResults {
  focusedTest: { passed: boolean; detail: string };
  typeCheck: { passed: boolean; detail: string };
  build: { passed: boolean; detail: string };
  diffCheck: { passed: boolean; detail: string };
  smoke: { passed: boolean; detail: string };
}

export interface SafetyGateInput {
  initialRisk: AutoHealRisk;
  module?: string;
  category?: string;
  changedPaths: string[];
  diff: string;
  linesChanged: number;
  validation: ValidationResults;
  limits?: { files: number; lines: number };
}

export interface SafetyGateResult {
  risk: AutoHealRisk;
  allowed: boolean;
  reasons: string[];
  changedFiles: number;
  linesChanged: number;
}

export interface SupportEvent {
  type:
    | 'incident.created'
    | 'autofix.queued'
    | 'autofix.queue-failed'
    | 'autofix.succeeded'
    | 'autofix.infrastructure-retry-requested'
    | 'autofix.infrastructure-failure'
    | 'approval.required'
    | 'deployment.succeeded'
    | 'deployment.failed'
    | 'rollback.triggered';
  tenantId: string;
  incidentId: string;
  at: string;
  details?: Record<string, unknown>;
}
