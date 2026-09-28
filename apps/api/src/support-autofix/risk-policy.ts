import { createHash } from 'crypto';
import { AutoHealRisk, RiskDecision, SafetyGateInput, SafetyGateResult } from './support-autofix.types';

const LOW_RISK_CATEGORIES: Array<{ category: string; pattern: RegExp }> = [
  { category: 'visual-rendering', pattern: /\b(render(?:ing)?|display|layout|styling|css|responsive|mobile)\b/i },
  { category: 'label-text', pattern: /\b(label|text|copy|wording|caption|translation)\b/i },
  { category: 'date-formatting', pattern: /\b(date|day|weekday|format(?:ting)?)\b/i },
  { category: 'search-filter-ui', pattern: /\b(search|filter)\b/i },
  { category: 'table-visibility', pattern: /\b(table|column|visibility|hide column)\b/i },
  { category: 'export-formatting', pattern: /\b(excel|spreadsheet|export formatting)\b/i },
  { category: 'client-cache', pattern: /\b(client[- ]side cache|stale ui cache)\b/i },
  { category: 'navigation-link', pattern: /\b(navigation|broken link|route link)\b/i },
  { category: 'optional-ui-field', pattern: /\b(optional ui field|missing optional field)\b/i },
  { category: 'null-rendering', pattern: /\b(null|undefined|empty state)\b/i },
];

const HIGH_RISK_TERMS = /\b(database|migration|sql|schema|stock|inventory quantities?|stock movements?|grns?|sivs?|srvs?|purchase transactions?|accounting|journals?|payments?|payroll|salar(?:y|ies)|attendance corrections?|attendance writes?|leave balances?|uid tracking|authentication|authorization|permissions?|security|secrets?|nginx|pm2|deploy(?:ment infrastructure)?|deletions?|reversals?|document numbers?|external integrations?|api writes?|backend writes?)\b/i;
const SAFE_WEB_PATH = /^apps\/web\//i;
const PROTECTED_PATH = /(^|\/)(migrations?|prisma|schema|sql|auth|security|permissions?|payroll|account(?:ing|s)?|finance|inventory|stock|purchase|grns?|sivs?|srvs?|uid|leave|production|deployment|infra|nginx|pm2|config|settings|integration(?:-hub)?|deletions?|reversals?|document-numbers?|\.env)(?:\/|\.|-|$)|(^|\/)(?:attendance-corrections?|attendance-writes?)(?:\/|\.|$)|(^|\/)(package\.json|pnpm-lock\.yaml|yarn\.lock|package-lock\.json)$/i;
const WEB_PROTECTED_NAME = /(^|\/)(?:auth|security|permissions?(?:[-_.][^/]*)?|payroll|account(?:ing|s)?|inventory|stock|purchase|grn|siv|srv|uid|attendance-correction|attendance-write|leave-balance|payments?)(?:\/|$)/i;
const WRITE_OR_CALCULATION = /(?:\.insert\s*\(|\.update\s*\(|\.delete\s*\(|\b(?:create|update|delete|save|submit|approve|reverse|calculate|compute|payable days|check[- ]?in|check[- ]?out|correction|balance|quantity|journal|payment)\b)/i;
const SECRET_OR_CONFIG_DIFF = /(?:^|\n)[+\-].*(?:SUPABASE_(?:KEY|URL)|DATABASE_URL|BEGIN (?:RSA|OPENSSH|EC) PRIVATE KEY|password\s*[:=]|api[_-]?key\s*[:=]|authorization\s*[:=])/i;

export function classifyIncident(input: {
  title?: string;
  description?: string;
  module?: string;
  route?: string;
  error?: string;
}): RiskDecision {
  const content = [input.title, input.description, input.module, input.route, input.error]
    .filter(Boolean)
    .join(' ');
  if (HIGH_RISK_TERMS.test(content)) {
    return { risk: 'HIGH', category: 'protected-domain', reason: 'The report touches a protected business, data, security, or infrastructure area.' };
  }
  const match = LOW_RISK_CATEGORIES.find(({ pattern }) => pattern.test(content));
  if (match) {
    return { risk: 'LOW', category: match.category, reason: `Recognized low-risk UI category: ${match.category}.` };
  }
  return { risk: 'MEDIUM', category: 'unclassified', reason: 'The report does not match an explicitly allowed low-risk UI category.' };
}

function escalatesForDiff(paths: string[], diff: string): string[] {
  const reasons: string[] = [];
  if (paths.some((path) => !SAFE_WEB_PATH.test(path))) reasons.push('Every changed file must be under apps/web/.');
  if (paths.some((path) => PROTECTED_PATH.test(path))) reasons.push('The diff touches a protected path.');
  if (paths.some((path) => WEB_PROTECTED_NAME.test(path))) reasons.push('The diff touches a protected business or security UI area.');
  if (SECRET_OR_CONFIG_DIFF.test(diff)) reasons.push('The diff contains a secret or environment/configuration change.');
  if (HIGH_RISK_TERMS.test(diff)) reasons.push('The diff contains protected-domain changes.');
  if (WRITE_OR_CALCULATION.test(diff) && HIGH_RISK_TERMS.test(diff)) reasons.push('The diff appears to change writes, calculations, or protected business behavior.');
  return reasons;
}

export function classifyDiff(input: SafetyGateInput): SafetyGateResult {
  const paths = [...new Set(input.changedPaths.map((path) => path.replace(/\\/g, '/').replace(/^\.\//, '')))];
  const reasons = escalatesForDiff(paths, input.diff);
  const maxFiles = input.limits?.files ?? 5;
  const maxLines = input.limits?.lines ?? 250;
  if (input.initialRisk !== 'LOW') reasons.push('Initial incident classification was not LOW.');
  if (paths.length === 0) reasons.push('No changed files were found.');
  if (paths.length > maxFiles) reasons.push(`Changed file count exceeds the ${maxFiles}-file limit.`);
  if (input.linesChanged > maxLines) reasons.push(`Changed line count exceeds the ${maxLines}-line limit.`);
  if (!input.validation.focusedTest.passed) reasons.push('Focused test did not pass.');
  if (!input.validation.typeCheck.passed) reasons.push('Web type-check did not pass.');
  if (!input.validation.build.passed) reasons.push('Web build did not pass.');
  if (!input.validation.diffCheck.passed) reasons.push('git diff --check did not pass.');
  if (!input.validation.smoke.passed) reasons.push('Relevant smoke check did not pass.');
  return {
    risk: reasons.length ? (reasons.some((reason) => /protected|secret|every changed|initial incident/i.test(reason)) ? 'BLOCKED' : 'MEDIUM') : 'LOW',
    allowed: reasons.length === 0,
    reasons,
    changedFiles: paths.length,
    linesChanged: input.linesChanged,
  };
}

export function makeIncidentFingerprint(input: {
  tenantId: string;
  route?: string;
  endpoint?: string;
  status?: number;
  error?: string;
  buildSha?: string;
}): string {
  const normalizedError = String(input.error || '').toLowerCase().replace(/[0-9a-f]{8}-[0-9a-f-]{27,}/g, '<id>').replace(/\s+/g, ' ').trim();
  return createHash('sha256')
    .update([input.tenantId, input.route || '', input.endpoint || '', input.status || '', normalizedError, input.buildSha || ''].join('|'))
    .digest('hex');
}

export function canAttemptAutoFix(attemptCount: number, maximum = 2): boolean {
  return Number.isInteger(attemptCount) && attemptCount >= 0 && attemptCount < maximum;
}

export function autoHealDiffLimits(env: NodeJS.ProcessEnv = process.env): { files: number; lines: number } {
  const bounded = (value: string | undefined, fallback: number, ceiling: number) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) && parsed >= 1 ? Math.min(Math.floor(parsed), ceiling) : fallback;
  };
  return {
    files: bounded(env.AUTOHEAL_MAX_CHANGED_FILES, 5, 5),
    lines: bounded(env.AUTOHEAL_MAX_CHANGED_LINES, 250, 250),
  };
}

export function modeCanDeploy(mode: string, risk: AutoHealRisk, enabled: boolean, approved = false): boolean {
  if (!enabled || risk !== 'LOW') return false;
  if (mode === 'AUTO') return true;
  return mode === 'APPROVAL' && approved;
}

export function safeAutoHealMode(value?: string | null): 'SHADOW' | 'APPROVAL' | 'AUTO' {
  const mode = String(value || 'SHADOW').toUpperCase();
  return mode === 'AUTO' || mode === 'APPROVAL' ? mode : 'SHADOW';
}
