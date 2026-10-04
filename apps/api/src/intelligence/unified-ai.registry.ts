export const UNIFIED_ROUTES = [
  'ERP_QUERY', 'BRAIN_QUERY', 'DATA_DOCTOR', 'REPORT_BUILDER',
  'DOCUMENT_INTELLIGENCE', 'SMART_IMPORT', 'AUTOENGINEER',
  'SMART_APPROVAL', 'ACTION_PLANNER', 'PROACTIVE_OPERATIONS',
  'NORMAL_ERP_COMMAND',
] as const;

export type UnifiedRoute = typeof UNIFIED_ROUTES[number];
export type UnifiedResultType = 'TEXT_ANSWER' | 'EVIDENCE' | 'REPORT' | 'CHART' |
  'DIAGNOSIS' | 'IMPORT_PREVIEW' | 'DOCUMENT_COMPARISON' | 'APPROVAL_REVIEW' |
  'ACTION_PLAN' | 'ATTENTION_LIST' | 'ENGINEERING_REQUEST' | 'ERROR' | 'PARTIAL_RESULT';
export type UnifiedContextType = 'ERP_ENTITY' | 'REPORT' | 'DASHBOARD' |
  'DOCUMENT_ANALYSIS' | 'IMPORT_BATCH' | 'DIAGNOSIS' | 'AUTOQA_FINDING' |
  'ENGINEERING_REQUEST' | 'ACTION_PLAN' | 'APPROVAL_REVIEW' | 'ATTENTION_ITEM';
export type RouteDecision = {
  route: UnifiedRoute | null;
  confidence: 'EXACT' | 'CONTEXTUAL' | 'CLARIFICATION';
  operation: 'INTERPRET' | 'DISCOVER' | 'EXPORT' | 'REFINE' | 'PREPARE_FIX' | 'REVIEW' | 'BLOCKED';
  question?: string;
};
export type RouteInput = {
  contextType?: UnifiedContextType;
  entityType?: string;
  attachmentKinds?: Array<'SPREADSHEET' | 'DOCUMENT'>;
  profile?: string;
};

export function unifiedFlags() {
  return {
    enabled: process.env.MIZANTRA_UNIFIED_AI_ENABLED === 'true',
    router: process.env.MIZANTRA_UNIFIED_ROUTER_ENABLED === 'true',
  };
}

export function selectUnifiedRoute(message: string, input: RouteInput = {}): RouteDecision {
  const text = message.trim();
  const choose = (route: UnifiedRoute, operation: RouteDecision['operation'] = 'INTERPRET', contextual = false): RouteDecision =>
    ({ route, operation, confidence: contextual ? 'CONTEXTUAL' : 'EXACT' });
  const clarify = (question: string): RouteDecision => ({ route: null, operation: 'INTERPRET', confidence: 'CLARIFICATION', question });
  const profileRequest = text.match(/\b(?:show|use|read|access|from)\s+(?:the\s+)?(ARWA|SAIFSEAS|MIZANTRA)\b.*\b(?:records|data|tenant)\b/i);
  if (/\bexecute\b.*\b(?:plan|approval token)\b/i.test(text)) return {route:null,operation:'BLOCKED',confidence:'EXACT',question:'Approval and execution require the native governed controls and a valid approval token.'};
  if (input.profile && profileRequest && profileRequest[1].toUpperCase() !== input.profile) return { route:null,operation:'BLOCKED',confidence:'EXACT',question:'I can only use records authorized in your current tenant and environment.' };
  if (/\b(?:ignore|bypass|override)\b.*\b(?:permissions?|security|tenant|restrictions?)\b|\b(?:another|different) tenant\b|\b(?:run|execute)\s+(?:raw\s+)?sql\b|\b(?:select\s+.+\s+from|drop\s+table|executeSQL|genericWrite|genericAPIAction)\b|\b(?:skip|bypass)\b.*\b(?:approval|confirmation)\b|\bapprove\b.*\b(?:automatically|then|also)\b|\b(?:then|and)\s+approve\b/i.test(text)) {
    return { route: null, operation: 'BLOCKED', confidence: 'EXACT', question: 'I cannot bypass permissions, change tenants, run SQL, or approve actions automatically.' };
  }
  if (/\bwhat can you do\b|\b(?:your|available) capabilities\b/i.test(text)) return choose('ERP_QUERY', 'DISCOVER');
  if (input.contextType === 'REPORT' && /^(?:diagnose|why|who|check)\b.*\b(?:this|that|it|them)\b/i.test(text) && !/\b(?:PO|GRN|item|supplier|record)\b/i.test(text)) return clarify('Which authorized record in the report do you mean?');
  if (input.contextType === 'ACTION_PLAN' && /^(?:review|show|approve|check)\b/i.test(text)) return choose('ACTION_PLANNER', 'REVIEW', true);
  if (input.contextType === 'ACTION_PLAN' && /^(?:quantity|qty|required date|delivery date|needed|reason|warehouse|cost centre)\b/i.test(text)) return choose('ACTION_PLANNER', 'INTERPRET', true);
  if (input.contextType === 'ENGINEERING_REQUEST' && /\b(?:status|doing|happened|progress)\b/i.test(text)) return choose('AUTOENGINEER', 'REVIEW', true);
  if (/\bimport\b/i.test(text) && input.attachmentKinds?.includes('SPREADSHEET')) return choose('SMART_IMPORT');
  if (/\b(?:compare|quotation|invoice|extract|drawing|document)\b/i.test(text) && input.attachmentKinds?.includes('DOCUMENT')) return choose('DOCUMENT_INTELLIGENCE');
  if ((input.attachmentKinds?.length || 0) > 0 && !text) return clarify('Would you like to import the spreadsheet or review the document?');
  if (/\b(?:attention|morning brief|changed since yesterday|daily brief)\b/i.test(text)) return choose('PROACTIVE_OPERATIONS');
  if (/\b(?:prepare|create|raise|draft)\b.*\b(?:PR|purchase requisition|replenishment|reorder)\b|^prepare the PR\b/i.test(text)) return choose('ACTION_PLANNER', 'INTERPRET', !!input.contextType);
  if (/\b(?:review|check)\b.*\b(?:before approval|approv|price|quotation)\b/i.test(text)) return choose('SMART_APPROVAL');
  if (/\b(?:broken|software issue|bug|search.*(?:wrong|fail)|field.*(?:wrong|fail))\b|\b(?:fix|repair)\b.*\b(?:search|software|screen|field|button|application)\b/i.test(text)) return choose('AUTOENGINEER', input.contextType === 'DIAGNOSIS' ? 'PREPARE_FIX' : 'INTERPRET');
  if (/\b(?:diagnos|reconcil|data issue|data problem|stock wrong|stock incorrect|inconsisten|duplicate|why.*wrong)\w*/i.test(text) || /^check (?:this|the) GRN\b/i.test(text)) return choose('DATA_DOCTOR', 'INTERPRET', !!input.contextType);
  if (/^export\b.*\b(?:related|open|overdue)\b.*\b(?:POs|orders)\b/i.test(text)) return choose('REPORT_BUILDER', 'INTERPRET', !!input.contextType);
  if (/\bexport\b/i.test(text)) return input.contextType === 'REPORT' ? choose('REPORT_BUILDER', 'EXPORT', true) : clarify('Which authorized report would you like to export?');
  if (input.contextType === 'REPORT' && /^(?:only|filter|group|sort|limit|top|instead|the same supplier)\b/i.test(text)) return choose('REPORT_BUILDER', 'REFINE', true);
  if (/\b(?:show|list|report|chart|count|total)\b.*\b(?:overdue|open POs?|similar POs?|history|POs|items|suppliers|purchases|dashboard)\b/i.test(text) && !/\brelated GRNs\b/i.test(text)) return choose('REPORT_BUILDER');
  if (/\bimport\b/i.test(text)) return choose('SMART_IMPORT');
  if (/\b(?:compare|quotation|extract|drawing)\b/i.test(text)) return choose('DOCUMENT_INTELLIGENCE');
  if (/^(?:fix|diagnose|check|review)\s+(?:this|that|it|them)$/i.test(text) && !input.contextType) return clarify('Which record, report, document, or software issue do you mean?');
  if (/^fix\b/i.test(text) && input.contextType === 'DIAGNOSIS') return choose('AUTOENGINEER', 'PREPARE_FIX', true);
  if (/^fix (?:this|that|it|them)[.!?]?$/i.test(text)) return clarify('Do you mean diagnose the data or report a software problem?');
  if (/^diagnose\b|^why is (?:this|that|it) (?:here|wrong)\b/i.test(text) && input.contextType) return choose('DATA_DOCTOR', 'INTERPRET', true);
  if (/\b(?:why|who|what|which|where|how many|related GRNs|show its GRNs|receipt|supplier|supplies|quantity|status|came from)\b/i.test(text) && input.contextType) return choose('BRAIN_QUERY', 'INTERPRET', true);
  if (/\b(?:this|that|these|those|it|them)\b/i.test(text) && !input.contextType) return clarify('Which authorized record or result do you mean?');
  if (/^(?:show|list|find|what|who|which|how many|is|are)\b/i.test(text)) return choose('ERP_QUERY');
  return choose('NORMAL_ERP_COMMAND');
}