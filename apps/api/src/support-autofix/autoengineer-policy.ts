import { AutoHealRisk, SafetyGateInput, SafetyGateResult } from './support-autofix.types';

export type AutoEngineerRequestType = 'BUG' | 'IMPROVEMENT' | 'FEATURE_REQUEST';
export type AutoEngineerScope = 'CURRENT_PROFILE' | 'SELECTED_PROFILES' | 'SHARED_CORE' | 'UNKNOWN';
export type AutoEngineerChangeKind = 'PDF_LAYOUT_CHANGE' | 'DISPLAY_EXISTING_FIELD' | 'NEW_PERSISTED_FIELD' | 'GENERAL';

export interface AutoEngineerClassification {
  intent: 'NORMAL_ERP_REQUEST' | 'BUG' | 'IMPROVEMENT' | 'FEATURE_REQUEST' | 'SUPPORT_STATUS' | 'CLARIFY_CHANGE_REQUEST';
  requestType: AutoEngineerRequestType | null;
  risk: AutoHealRisk | null;
  reason: string;
  changeKind: AutoEngineerChangeKind | null;
  requiresMigration: boolean;
  requiresBackend: boolean;
  requiresBusinessLogic: boolean;
  changeSummary: string;
  acceptanceCriteria: string[];
  implementationPlan: string[];
}

const PROFILES = ['SAIFSEAS', 'MIZANTRA', 'ARWA'] as const;

const HIGH_RISK = /\b(inventory quantities?|stock movements?|valuation|grn posting|goods receipt|accounting|journals?|payroll|attendance calculations?|po transactional state|approval workflow|authentication|authorization|permissions?|security|delete|deletions|reversal|financial posting|data correction|payment posting|pricing calculations?)\b/i;
const BLOCKED = /\b(password|credential|secret|api[ _-]?key|access token|bypass (?:security|authentication|approval)|disable (?:auth|authentication|authorization)|cross[- ]tenant|all tenants|drop table|wipe (?:the )?(?:database|data)|delete all)\b/i;
const NEW_DATA = /\b(new|add|create)\b.{0,60}\b(field|column|attribute|stored|persist(?:ed|ence)?|database|db|migration|api endpoint|form field|workflow|feature flag|customer drawing number)\b|\b(save|store|persist)\b/i;
const UI_ONLY = /\b(existing|already stored|item master|optional column|display|show|hide|visible|visibility|label|wording|layout|styling|responsive|sort|filter|search|format(?:ting)?|export formatting|pdf layout|move .* (?:above|below|before|after))\b/i;
const PDF = /\b(pdf|print(?:ed)? layout|printout|printed document)\b/i;
const FIELD_DISPLAY = /\b(show|display|add|include|column|field)\b.{0,70}\b(existing|item master|optional|column|field|oem|manufacturer)\b/i;
const BUSINESS_ACTION = /^(?:please\s+)?(?:create|prepare|raise|submit|post|receive|issue|transfer|pay|approve|reject|cancel|convert)\b.{0,100}\b(?:pr|purchase requisition|po|purchase order|stock issue|material issue|grn|goods receipt|journal|payment|invoice|job order)\b/i;
const NORMAL_ISSUE_TRANSACTION = /^(?:show|list|find|create|prepare|raise)\b.{0,100}\b(?:stock issue|material issue|issue voucher|error report)\b/i;
const BUG = /\b(not working|does not work|doesn't work|broken|getting (?:an? )?(?:internal server )?error|internal server error|error when|unable to (?:search|save|open|update|load|submit)|cannot (?:search|save|open|update|load|submit)|can't (?:search|save|open|update|load|submit)|page is blank|button does nothing|is not opening|not opening|failed to)\b/i;
const IMPROVEMENT = /\b(improve|improvement|add (?:an? )?(?:optional )?(?:column|label|filter|search|sort|field|oem)|show (?:the )?existing|display (?:the )?existing|include (?:the )?existing|move .* (?:above|below|before|after)|change the layout|rearrange|format the|change wording|change label|optional column)\b/i;
const FEATURE = /\b(feature request|new feature|build a feature|add a new|new field|new capability|introduce|i want .* (?:in|on) .*(?:and|also).*(?:pdf|report|register)|customer drawing number|persist(?:ed|ence)? field)\b/i;
const STATUS = /\b(what happened to my (?:issue|problem|request)|status of .*\b(?:issue|problem|request)|my (?:support )?(?:issues|incidents|requests)|issue status|request status)\b/i;

export function classifyAutoEngineerIntent(message: string, mode?: string): AutoEngineerClassification {
  if (mode === 'planner') return normalResult();
  if (mode === 'support') return classifyRequest(message, 'BUG');
  if (mode === 'improvement') return classifyRequest(message, 'IMPROVEMENT');
  if (mode === 'feature') return classifyRequest(message, 'FEATURE_REQUEST');
  const text = String(message || '').trim().toLowerCase();
  if (!text) return normalResult();
  if (STATUS.test(text)) return { ...normalResult(), intent: 'SUPPORT_STATUS' };
  // Preserve ordinary ERP transactions before looking for product-change language.
  if (NORMAL_ISSUE_TRANSACTION.test(text)) return normalResult();
  if (BUSINESS_ACTION.test(text)) return normalResult();
  if (BUG.test(text)) return classifyRequest(text, 'BUG');
  if (IMPROVEMENT.test(text)) return classifyRequest(text, 'IMPROVEMENT');
  if (FEATURE.test(text)) return classifyRequest(text, 'FEATURE_REQUEST');
  if (/\b(?:change|improve|enhance|add|include|display|show|move|rearrange|new feature)\b/i.test(text)) {
    return { ...normalResult(), intent: 'CLARIFY_CHANGE_REQUEST' };
  }
  if (/\b(error|problem|broken|issue|not responding|doesn't work|does not work)\b/i.test(text)) {
    return { ...normalResult(), intent: 'CLARIFY_CHANGE_REQUEST' };
  }
  return normalResult();
}

function normalResult(): AutoEngineerClassification {
  return {
    intent: 'NORMAL_ERP_REQUEST', requestType: null, risk: null, reason: '',
    changeKind: null, requiresMigration: false, requiresBackend: false,
    requiresBusinessLogic: false, changeSummary: '', acceptanceCriteria: [], implementationPlan: [],
  };
}

function classifyRequest(message: string, requestType: AutoEngineerRequestType): AutoEngineerClassification {
  const text = String(message || '').trim();
  let changeKind: AutoEngineerChangeKind = 'GENERAL';
  const requiresMigration = NEW_DATA.test(text) && !FIELD_DISPLAY.test(text);
  const requiresBackend = requiresMigration || /\b(api|server|backend|save|store|persist|workflow)\b/i.test(text);
  const requiresBusinessLogic = /\b(calculate|calculation|approval|approve|reject|quantity|stock|inventory|posting|payroll|attendance)\b/i.test(text);
  if (requiresMigration) changeKind = 'NEW_PERSISTED_FIELD';
  else if (PDF.test(text) && !requiresMigration && /\b(move|above|below|layout|resize|branding|position|visual|column width)\b/i.test(text)) changeKind = 'PDF_LAYOUT_CHANGE';
  else if (FIELD_DISPLAY.test(text) || /\b(optional column|existing field|show .*column|display .*field)\b/i.test(text)) changeKind = 'DISPLAY_EXISTING_FIELD';

  let risk: AutoHealRisk = requestType === 'BUG' ? 'MEDIUM' : 'MEDIUM';
  let reason = 'The request needs an implementation plan and privileged build approval.';
  if (BLOCKED.test(text) || /\b(?:unclear|unknown) tenant(?:s| scope)?\b/i.test(text)) {
    risk = 'BLOCKED';
    reason = 'The request includes a security, secret, destructive, or unknown tenant-crossing instruction.';
  } else if (requiresBusinessLogic || HIGH_RISK.test(text)) {
    risk = 'HIGH';
    reason = 'The request touches protected transactional, financial, HR, inventory, approval, or security behavior.';
  } else if (!requiresMigration && !requiresBackend && (UI_ONLY.test(text) || changeKind === 'PDF_LAYOUT_CHANGE')) {
    risk = 'LOW';
    reason = 'The request appears limited to presentation of existing data or other read-only UI behavior.';
  }

  const criteria = buildAcceptanceCriteria(text, changeKind);
  return {
    intent: requestType, requestType, risk, reason, changeKind,
    requiresMigration, requiresBackend, requiresBusinessLogic,
    changeSummary: text.slice(0, 1000), acceptanceCriteria: criteria,
    implementationPlan: buildImplementationPlan(changeKind, risk, requiresBackend),
  };
}

function buildAcceptanceCriteria(text: string, kind: AutoEngineerChangeKind): string[] {
  if (/\boem\b/i.test(text) && kind === 'DISPLAY_EXISTING_FIELD') {
    return [
      'An optional OEM Name column reads the existing Item Master value.',
      'Missing OEM Name displays as “-”.',
      'The existing Columns selector can hide or show the column.',
      'Purchase order create, edit, approval, export, and posting behavior stays unchanged unless separately approved.',
    ];
  }
  if (kind === 'PDF_LAYOUT_CHANGE') {
    return ['Only the requested visual PDF layout changes.', 'Existing PDF values and calculations remain unchanged.', 'Affected profile branding and the rendered PDF are checked.'];
  }
  if (kind === 'NEW_PERSISTED_FIELD') {
    return ['The field is stored and read back through the approved data path.', 'Validation and empty-value behavior are defined.', 'Existing workflows and unrelated business calculations remain unchanged.', 'The additive migration is reviewed and is not automatically applied.'];
  }
  return ['The requested display or behavior is implemented in the named ERP area.', 'Existing stored values are used where available.', 'Unrequested transaction and business logic remain unchanged.', 'The relevant screen is checked at desktop and mobile sizes.'];
}

function buildImplementationPlan(kind: AutoEngineerChangeKind, risk: AutoHealRisk, backend: boolean): string[] {
  if (risk === 'BLOCKED') return ['Stop autonomous work and refer the request for security review.'];
  if (risk === 'HIGH') return ['Map affected modules, data paths, and tables.', 'Prepare an implementation plan and acceptance tests.', 'Wait for explicit engineering approval before any code generation.'];
  if (risk === 'MEDIUM') return [
    'Identify affected API, data, screen, PDF, and export layers.',
    ...(backend ? ['Prepare one additive migration proposal where storage is required.'] : []),
    'Wait for privileged Build approval before code generation.',
    'Validate the shared change against SaifSeas, Mizantra, and Arwa where applicable.',
    'Wait for separate release approval for each target profile before deployment.',
  ];
  return [
    kind === 'PDF_LAYOUT_CHANGE' ? 'Update only PDF presentation using existing values.' : 'Update only the read-only presentation or UI behavior.',
    'Run focused tests, type-check, build, diff checks, and a relevant smoke check.',
    'Stop at Review Change; deployment requires separate explicit approval.',
  ];
}

export function resolveAutoEngineerScope(input: {
  isSuperAdmin: boolean;
  currentProfile?: unknown;
  requestedScope?: unknown;
  targetProfiles?: unknown;
}): { requestedScope: AutoEngineerScope; targetProfiles: string[]; scopeReason: string; requestedByProfile: string } {
  const profile = String(input.currentProfile || '').trim().toUpperCase();
  const current = PROFILES.includes(profile as typeof PROFILES[number]) ? profile : '';
  if (!input.isSuperAdmin) {
    return {
      requestedScope: current ? 'CURRENT_PROFILE' : 'UNKNOWN',
      targetProfiles: current ? [current] : [],
      scopeReason: current ? 'Tenant user requests are restricted to their current ERP profile.' : 'The current ERP profile could not be established.',
      requestedByProfile: current,
    };
  }
  const scope = String(input.requestedScope || 'CURRENT_PROFILE').toUpperCase();
  if (scope === 'SHARED_CORE') return {
    requestedScope: 'SHARED_CORE', targetProfiles: [...PROFILES],
    scopeReason: 'Super Admin selected the shared core; all applicable profiles require separate release approval.',
    requestedByProfile: current,
  };
  if (scope === 'SELECTED_PROFILES') {
    const selected = Array.isArray(input.targetProfiles)
      ? [...new Set(input.targetProfiles.map((value) => String(value).trim().toUpperCase()).filter((value) => PROFILES.includes(value as typeof PROFILES[number])))]
      : [];
    if (!selected.length) return {
      requestedScope: 'UNKNOWN', targetProfiles: [],
      scopeReason: 'Super Admin selected profile scope without a valid target profile.', requestedByProfile: current,
    };
    return {
      requestedScope: 'SELECTED_PROFILES', targetProfiles: selected,
      scopeReason: 'Super Admin selected the listed ERP profiles; each deployment remains separately approved.',
      requestedByProfile: current,
    };
  }
  return {
    requestedScope: current ? 'CURRENT_PROFILE' : 'UNKNOWN',
    targetProfiles: current ? [current] : [],
    scopeReason: current ? 'Super Admin scoped this request to the current ERP profile.' : 'The current ERP profile could not be established.',
    requestedByProfile: current,
  };
}

export function classifyAutoEngineerDiff(input: SafetyGateInput & { risk: AutoHealRisk; engineeringApproved?: boolean }): SafetyGateResult {
  const paths = [...new Set(input.changedPaths.map((path) => path.replace(/\\/g, '/').replace(/^\.\//, '')))];
  const lines = input.diff.split(/\r?\n/).filter((line) => /^[+-]/.test(line) && !line.startsWith('+++') && !line.startsWith('---')).join('\n');
  const reasons: string[] = [];
  if (input.risk === 'BLOCKED') reasons.push('Blocked requests cannot produce code patches.');
  if (input.risk === 'HIGH' && !input.engineeringApproved) reasons.push('Explicit engineering approval is required before high-risk code generation.');
  if (input.risk === 'LOW' && paths.some((path) => !path.toLowerCase().startsWith('apps/web/src/'))) reasons.push('Low-risk changes may edit web presentation source only.');
  if (input.risk === 'LOW' && paths.some((path) => /(^|\/)(?:auth|security|permissions?|payroll|account(?:ing)?|inventory|stock|grn|attendance|leave)(?:\/|\.|-|$)/i.test(path))) reasons.push('Low-risk changes cannot edit protected security, financial, HR, or transactional paths.');
  if (!paths.length || paths.length > 20) reasons.push('The patch must change between 1 and 20 files.');
  if (input.linesChanged > 1000) reasons.push('The patch exceeds the 1,000-line AutoEngineer review limit.');
  const allowedPath = /^apps\/(?:api|web)\/src\//i;
  const additiveMigration = /^migrations\/add-[a-z0-9-]+\.sql$/i;
  if (paths.some((path) => !allowedPath.test(path) && !additiveMigration.test(path))) reasons.push('The patch contains files outside API/UI source and additive SQL migrations.');
  const forbiddenPath = /(^|\/)(\.env[^/]*|package(?:-lock)?\.json|pnpm-lock\.yaml|yarn\.lock|node_modules)(?:\/|$)/i;
  if (paths.some((path) => forbiddenPath.test(path))) reasons.push('The patch changes secrets, dependencies, or generated packages.');
  const secrets = /(?:^|\n)[+\-].*(?:SUPABASE_(?:KEY|URL)|DATABASE_URL|BEGIN (?:RSA|OPENSSH|EC) PRIVATE KEY|password\s*[:=]|api[_-]?key\s*[:=]|authorization\s*[:=])/i;
  if (secrets.test(lines)) reasons.push('The patch contains a secret or credential change.');
  if (input.risk === 'LOW' && /(?:\.insert\s*\(|\.update\s*\(|\.delete\s*\(|\b(?:POST|PUT|PATCH|DELETE)\b|\b(?:quantity|qty|valuation|posting|payroll|attendance|approval)\b)/i.test(lines)) reasons.push('Low-risk work cannot change data writes or transactional/business calculations.');
  const destructiveSql = /\b(DROP\s+(?:TABLE|COLUMN|SCHEMA)|TRUNCATE|DELETE\s+FROM|UPDATE\s+public\.|INSERT\s+INTO\s+public\.)\b/i;
  if (paths.some((path) => path.toLowerCase().startsWith('migrations/')) && destructiveSql.test(input.diff)) {
    reasons.push('SQL migrations may add schema only; data changes and destructive statements are blocked.');
  }
  if (!input.validation.focusedTest.passed) reasons.push('Focused acceptance tests did not pass.');
  if (!input.validation.typeCheck.passed) reasons.push('A relevant type-check did not pass.');
  if (!input.validation.build.passed) reasons.push('A relevant API or web build did not pass.');
  if (!input.validation.diffCheck.passed) reasons.push('git diff --check did not pass.');
  if (!input.validation.smoke.passed) reasons.push('A relevant smoke check did not pass.');
  const allowed = reasons.length === 0;
  return {
    risk: allowed ? input.risk : reasons.some((reason) => /secret|destructive|blocked|security|engineering approval/i.test(reason)) ? 'BLOCKED' : 'MEDIUM',
    allowed, reasons, changedFiles: paths.length, linesChanged: input.linesChanged,
  };
}
