import { BadRequestException, ConflictException, ForbiddenException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { hasAdminBypass, hasPermission } from '../auth/utils/permission-utils';
import { SmartImportService } from '../smart-import/smart-import.service';
import { FeatureAccessService } from '../feature-access/feature-access.service';
import { BrainService } from './brain.service';
import { BRAIN_REGISTRY } from './brain-registry';
import { DataDoctorService } from './data-doctor.service';
import { ReportingService } from './reporting.service';
import { DocumentAnalysisService } from './document-analysis.service';
import { ActionOperatorService } from './action-operator.service';
import { SmartApprovalService } from './smart-approval.service';
import { PlannerSupportService } from './planner-support.service';
import { ProactiveOperationsService } from './proactive-operations.service';
import { UnifiedAiContextService, UnifiedSession, UnifiedWorkingRef, UnifiedTelemetry } from './unified-ai.context';
import { isExplicitPoReport, isPoGrnRequest, isPoRemainingFilter, selectUnifiedRoute, UnifiedResultType, UnifiedRoute, unifiedFlags } from './unified-ai.registry';
import { aiPerformance, withAiPerformance } from './unified-ai.performance';

const nextActions = {
  DIAGNOSE: { label: 'Diagnose', message: 'Diagnose this record' },
  VIEW_GRNS: { label: 'View GRNs', message: 'Show related GRNs' },
  PURCHASE_HISTORY: { label: 'Purchase history', message: 'Show related purchase history' },
  PREPARE_PR_PLAN: { label: 'Prepare PR plan', message: 'Prepare a PR for these items' },
  VIEW_ATTENTION: { label: "Today's attention", message: 'What needs my attention today?' },
  EXPORT_REPORT: { label: 'Export', message: 'Export that' },
  REPORT_SOFTWARE_ISSUE: { label: 'Report software issue', message: 'Fix this software issue' },
} as const;
type NextActionKey = keyof typeof nextActions;
export function customerAiMessage(message: string): string {
  return /\b(?:resolver|GraphQL|PostgREST|PGRST\w*|schema|worker|Codex|database table|stack trace)\b/i.test(message)
    ? 'Some information could not be checked. Review the available evidence or contact your administrator.' : message;
}

@Injectable()
export class UnifiedAiService {
  private readonly logger = new Logger(UnifiedAiService.name);
  constructor(
    private readonly contexts: UnifiedAiContextService,
    private readonly brain: BrainService,
    private readonly doctor: DataDoctorService,
    private readonly reporting: ReportingService,
    private readonly documents: DocumentAnalysisService,
    private readonly operator: ActionOperatorService,
    private readonly approval: SmartApprovalService,
    private readonly support: PlannerSupportService,
    private readonly proactive: ProactiveOperationsService,
    private readonly imports: SmartImportService,
    private readonly features: FeatureAccessService,
  ) {}

  async configuration(user: any) {
    const scope = this.contexts.scope(user), flags = unifiedFlags(), brain = this.brain.configuration(user);
    const readTypes = Object.entries(BRAIN_REGISTRY).filter(([, resolver]) => hasPermission(user, resolver.permission)).map(([type]) => type);
    const brainEnabled = brain.enabled && brain.contextEnabled && brain.graphEnabled && readTypes.length > 0;
    const reports = this.reporting.configuration(user);
    let documents: any = { enabled: false };
    try { documents = this.documents.configuration(user); } catch (error) { if (!(error instanceof ForbiddenException)) throw error; }
    const approval = this.approval.configuration(user), operator = this.operator.configuration(user), proactive = this.proactive.configuration(user);
    const enabled: Record<UnifiedRoute, boolean> = {
      ERP_QUERY: true, NORMAL_ERP_COMMAND: true,
      BRAIN_QUERY: brainEnabled,
      DATA_DOCTOR: brainEnabled && process.env.MIZANTRA_DATA_DOCTOR_ENABLED === 'true',
      REPORT_BUILDER: reports.enabled && reports.datasets.length > 0,
      DOCUMENT_INTELLIGENCE: documents.enabled && (documents.quotation || documents.invoice || documents.drawing),
      SMART_IMPORT: process.env.SMART_IMPORT_ENABLED === 'true',
      AUTOENGINEER: true,
      SMART_APPROVAL: approval.enabled && approval.supported_document_types.length > 0,
      ACTION_PLANNER: operator.enabled,
      PROACTIVE_OPERATIONS: proactive.enabled,
    };
    const paths: Record<UnifiedRoute,string> = {ERP_QUERY:'/active-planner/interpret',NORMAL_ERP_COMMAND:'/active-planner/interpret',BRAIN_QUERY:'/active-planner/brain/context',DATA_DOCTOR:'/active-planner/data-doctor/prepare-fix',REPORT_BUILDER:'/active-planner/reports/query',DOCUMENT_INTELLIGENCE:'/active-planner/document-intelligence/compare',SMART_IMPORT:'/smart-imports',AUTOENGINEER:'/active-planner/support-status',SMART_APPROVAL:'/active-planner/smart-approval/review',ACTION_PLANNER:'/active-planner/action-operator/plans',PROACTIVE_OPERATIONS:'/active-planner/proactive-operations/attention'};
    await Promise.all(Object.entries(enabled).filter(([,permitted])=>permitted).map(async ([route])=>{
      const feature=await this.features.featureForApiPath(scope.tenant,paths[route as UnifiedRoute]);
      if(feature?.is_enabled===false) enabled[route as UnifiedRoute]=false;
    }));
    return { ...flags, profile: scope.profile, tenant_id: scope.tenant, current_user_id: scope.owner, capabilities: Object.entries(enabled).filter(([, permitted]) => permitted).map(([route]) => route as UnifiedRoute), context_enabled: brainEnabled, can_export: enabled.REPORT_BUILDER && !!reports.can_export, entity_types: readTypes, modes: { operator: operator.enabled ? operator.mode : 'OFF', operator_pr: !!operator.can_execute_pr, operator_rfq: !!operator.rfq, smart_import: process.env.SMART_IMPORT_WRITE_MODE || 'APPROVAL_REQUIRED', autoqa: process.env.AUTOQA_MODE || 'OBSERVE', autoengineer: process.env.AUTOHEAL_MODE || 'SHADOW' }, autonomous_execution: false };
  }
  private failure(error: any): UnifiedTelemetry['failure_type'] {
    const status = typeof error?.getStatus === 'function' ? error.getStatus() : 503;
    return [401,403,404].includes(status) ? 'AUTHORIZATION' : [400,409].includes(status) ? 'INVALID_INPUT' : 'UNAVAILABLE';
  }
  private clarification(message: string) {
    return { status: 'UNIFIED_CLARIFICATION', intent_type: 'UNIFIED_AI', provider: 'MIZANTRA_UNIFIED_AI_V1', assistant_message: message, summary: message, questions: [message], safety: { read_only: true, executable: false }, extracted: {}, resolved: {}, context_token: '' };
  }
  async preview(user: any, body: any) {
    const configuration = await this.configuration(user);
    if (!configuration.enabled || !configuration.router) throw new ForbiddenException('Unified routing is not enabled.');
    if (typeof body?.message !== 'string' || body.message.length > 2000) throw new BadRequestException('Supply a bounded request.');
    const kinds = Array.isArray(body.attachment_kinds) ? body.attachment_kinds.filter((kind: string) => ['SPREADSHEET','DOCUMENT'].includes(kind)).slice(0,3) : [];
    const decision = selectUnifiedRoute(body.message, { attachmentKinds:kinds,contextType:body.context_type,profile:configuration.profile });
    return { ...decision, allowed:decision.operation !== 'BLOCKED' && (!decision.route || configuration.capabilities.includes(decision.route)), executable:false };
  }
  private actions(configuration: Awaited<ReturnType<UnifiedAiService['configuration']>>, ref: UnifiedWorkingRef, reportDataset?: string) {
    const allowed: NextActionKey[] = [], enabled = new Set(configuration.capabilities);
    if (ref.entity && enabled.has('DATA_DOCTOR')) allowed.push('DIAGNOSE');
    if (ref.entity?.entity_type === 'purchase_order' && enabled.has('BRAIN_QUERY') && configuration.entity_types.includes('grn')) allowed.push('VIEW_GRNS');
    if (enabled.has('REPORT_BUILDER') && (ref.entity || ref.document_ids?.length)) allowed.push('PURCHASE_HISTORY');
    if (enabled.has('ACTION_PLANNER') && (reportDataset === 'ITEMS' || ref.entity?.entity_type === 'item' || ref.current_type === 'ATTENTION_ITEM')) allowed.push('PREPARE_PR_PLAN');
    if (enabled.has('PROACTIVE_OPERATIONS')) allowed.push('VIEW_ATTENTION');
    if (ref.current_type === 'REPORT' && configuration.can_export) allowed.push('EXPORT_REPORT');
    if (ref.current_type === 'DIAGNOSIS' && ref.diagnosis_key && enabled.has('AUTOENGINEER')) allowed.push('REPORT_SOFTWARE_ISSUE');
    return allowed.map(key => ({ key, ...nextActions[key] }));
  }
  private async validate(user: any, ref: UnifiedWorkingRef) {
    const result = { ...ref };
    let currentPlan: any, currentEngineering: any;
    if (ref.current_type === 'ENGINEERING_REQUEST' && ref.engineering_request_id) {
      const owned = await this.support.history(user);
      currentEngineering = owned.support_incidents?.find((request: any) => request.id === ref.engineering_request_id);
      if (!currentEngineering) throw new ForbiddenException('The current software request is unavailable in your owned active history.');
      result.entity = undefined;
    }
    if (ref.current_type === 'ACTION_PLAN' && ref.plan_id) {
      currentPlan = await this.operator.get(user, ref.plan_id);
      result.entity = currentPlan.payload?.request?.brain_context || undefined;
    }
    if (result.entity) {
      const validated = await this.brain.validateContext(user, result.entity);
      if (!validated.enabled || !validated.context) throw new ForbiddenException('This record context is not enabled or authorized.');
      result.entity = validated.context;
    }
    let reportDataset: string | undefined;
    if (ref.current_type === 'REPORT' && ref.report_session_id) {
      reportDataset = (await this.reporting.workingContext(user, ref.report_session_id)).plan?.dataset;
      if (ref.saved_report_id) await this.reporting.workingContext(user, ref.saved_report_id, 'REPORT');
    }
    if (ref.current_type === 'DASHBOARD' && ref.dashboard_id) await this.reporting.workingContext(user, ref.dashboard_id, 'DASHBOARD');
    if (ref.current_type === 'DOCUMENT_ANALYSIS') for (const id of ref.document_ids || []) await this.documents.get(user, id);
    if (ref.current_type === 'IMPORT_BATCH' && ref.import_batch_id) await this.imports.workingContext(user, ref.import_batch_id);
    if (ref.current_type === 'ATTENTION_ITEM' && ref.attention_item_id) {
      const evidence: any = await this.proactive.why(user, ref.attention_item_id);
      const item = evidence.evidence_reference;
      const type = ({ PO:'purchase_order',GRN:'grn',ITEM:'item',PR:'purchase_requisition' } as Record<string,string>)[item?.entity_type] || item?.entity_type;
      if (item && BRAIN_REGISTRY[type]) {
        const scope = this.contexts.scope(user);
        const validated = await this.brain.validateContext(user, { profile: scope.profile, tenant_id: scope.tenant, current_user_id: scope.owner, entity_type: type, entity_id: item.entity_id, current_route: '/dashboard', locale: 'en' });
        result.entity = validated.context || undefined;
      }
    }
    return { ref: result, reportDataset, currentPlan, currentEngineering };
  }
  private resultType(route: UnifiedRoute | null, result: any): UnifiedResultType {
    if (result.status === 'UNIFIED_ERROR' || result.status === 'UNIFIED_BLOCKED') return 'ERROR';
    if (result.status === 'UNIFIED_PARTIAL') return 'PARTIAL_RESULT';
    if (result.report) return result.report.plan?.visualization === 'TABLE' ? 'REPORT' : 'CHART';
    if (result.action_operator_plan) return 'ACTION_PLAN';
    return ({ BRAIN_QUERY: 'EVIDENCE', DATA_DOCTOR: 'DIAGNOSIS', DOCUMENT_INTELLIGENCE: 'DOCUMENT_COMPARISON', SMART_APPROVAL: 'APPROVAL_REVIEW', SMART_IMPORT: 'IMPORT_PREVIEW', AUTOENGINEER: 'ENGINEERING_REQUEST', PROACTIVE_OPERATIONS: 'ATTENTION_LIST' } as Partial<Record<UnifiedRoute, UnifiedResultType>>)[route!] || 'TEXT_ANSWER';
  }
  async interpret(user: any, body: any, erp: (body: any) => Promise<any>): Promise<any | null> {
    return withAiPerformance(() => this.interpretScoped(user, body, erp));
  }
  private async drawerOrigin(user: any, origin: any) {
    if (!origin || Object.keys(origin).some(key => !['current_route','entity_type','entity_id','view'].includes(key)) || typeof origin.current_route !== 'string' || !/^\/dashboard(?:\/[a-z0-9_-]+)*$/i.test(origin.current_route) || origin.current_route.length > 200) throw new BadRequestException('Supply a registered originating screen.');
    if (origin.view && (origin.current_route !== '/dashboard/purchase/orders' || !['ALL','OPEN_PO'].includes(origin.view) || origin.entity_id)) throw new BadRequestException('Unsupported originating list.');
    if (origin.entity_id || origin.entity_type) {
      const scope = this.contexts.scope(user);
      const validated = await this.brain.validateContext(user, {profile:scope.profile,tenant_id:scope.tenant,current_user_id:scope.owner,entity_type:origin.entity_type,entity_id:origin.entity_id,current_route:origin.current_route,locale:'en'});
      if (!validated.enabled || !validated.context || validated.context.entity_id !== origin.entity_id || validated.context.entity_type !== origin.entity_type) throw new ForbiddenException('The originating record is not authorized.');
    }
    return `${origin.current_route}|${origin.entity_id ? `${origin.entity_type}:${origin.entity_id}` : ''}|${origin.view || ''}`;
  }
  async resumeContext(user: any, body: any) {
    const configuration = await this.configuration(user);
    if (!configuration.enabled || !configuration.router) throw new ForbiddenException('Ask is not enabled.');
    if (!body || Object.keys(body).some(key => !['session_id','context_ref','drawer_origin','explicit_history'].includes(key)) || (body.explicit_history !== undefined && typeof body.explicit_history !== 'boolean')) throw new BadRequestException('Supply an owned working session.');
    let session = await this.contexts.get(user, body.session_id);
    let ref = session.working_ref;
    const origin = body.drawer_origin ? await this.drawerOrigin(user, body.drawer_origin) : undefined;
    if (origin && origin !== ref.drawer_origin && !body.explicit_history) throw new NotFoundException('No active task belongs to this screen.');
    if (body.context_ref) {
      if (body.context_ref.type !== 'REPORT' || typeof body.context_ref.id !== 'string' || Object.keys(body.context_ref).some(key => !['type','id','saved_report_id'].includes(key))) throw new BadRequestException('Unsupported working reference.');
      ref = {...ref,current_type:'REPORT',report_session_id:body.context_ref.id,saved_report_id:body.context_ref.saved_report_id || (body.context_ref.id === ref.report_session_id ? ref.saved_report_id : undefined)};
    }
    if (!ref.current_type) throw new NotFoundException('This working request has been cleared. Select an authorized saved result.');
    const validated = await this.validate(user, ref);
    const capability = ref.current_type && this.routeContextCapability(ref.current_type);
    if (capability && !configuration.capabilities.includes(capability)) throw new ForbiddenException('Working capability access is required.');
    if (ref.current_type === 'REPORT' && !configuration.capabilities.includes('REPORT_BUILDER')) throw new ForbiddenException('Report access is required.');
    const report = ref.current_type === 'REPORT' && ref.report_session_id ? {...await this.reporting.query(user, {session_id:ref.report_session_id}),saved_report_id:ref.saved_report_id} : undefined;
    if (body.context_ref || (body.explicit_history && origin)) session = await this.contexts.save(user, {...validated.ref,...(origin ? {drawer_origin:origin} : {})}, session);
    return {session_id:session.id,session_version:session.version,working_ref:validated.ref,report,executable:false};
  }
  private routeContextCapability(type: string): UnifiedRoute | undefined {
    return ({ERP_ENTITY:'BRAIN_QUERY',REPORT:'REPORT_BUILDER',DASHBOARD:'REPORT_BUILDER',DIAGNOSIS:'DATA_DOCTOR',DOCUMENT_ANALYSIS:'DOCUMENT_INTELLIGENCE',IMPORT_BATCH:'SMART_IMPORT',ACTION_PLAN:'ACTION_PLANNER',APPROVAL_REVIEW:'SMART_APPROVAL',ATTENTION_ITEM:'PROACTIVE_OPERATIONS',ENGINEERING_REQUEST:'AUTOENGINEER'} as Record<string,UnifiedRoute>)[type];
  }
  async clearContext(user: any, body: any) {
    const configuration = await this.configuration(user);
    if (!configuration.enabled || !configuration.router) throw new ForbiddenException('Ask is not enabled.');
    if (!body || Object.keys(body).some(key => !['session_id','session_version'].includes(key)) || !Number.isInteger(body.session_version)) throw new BadRequestException('Supply the owned session and version.');
    const previous = await this.contexts.get(user, body.session_id);
    if (Object.keys(previous.working_ref).length === 0) return {session_id:previous.id,session_version:previous.version,context:null,executable:false};
    if (previous.version !== body.session_version) throw new ConflictException('The request changed. Reload it before clearing context.');
    const cleared = await this.contexts.save(user, {}, previous);
    return {session_id:cleared.id,session_version:cleared.version,context:null,executable:false};
  }
  private async interpretScoped(user: any, body: any, erp: (body: any) => Promise<any>): Promise<any | null> {
    if (!unifiedFlags().enabled || !unifiedFlags().router) return null;
    const started = Date.now(), configuration = await this.configuration(user);
    if (!body || ['tenant_id','tenantId','profile','owner_id','user_id','sql','table','where'].some(key => Object.prototype.hasOwnProperty.call(body, key))) throw new ForbiddenException('AI tenant, profile, and permissions are server-controlled.');
    if (typeof body.message !== 'string' || !body.message.trim() || body.message.length > 2000) throw new BadRequestException('Supply a request of 1-2000 characters.');
    let session: UnifiedSession | undefined, ref: UnifiedWorkingRef = {}, reportDataset: string | undefined, currentPlan: any, currentEngineering: any;
    let decision = selectUnifiedRoute(body.message, {profile:configuration.profile}), result: any, subsystemMs = 0;
    const failures: Array<{ capability: UnifiedRoute | null; type: UnifiedTelemetry['failure_type']; message: string }> = [];
    let failureType: UnifiedTelemetry['failure_type'] = null, clarification = false, handoff = 0;
    let contextValidated = false, subsystemStarted: number | undefined;
    let routingMs = -1;
    let attentionHandoff: any;
    try {
      if (body.attention_handoff) {
        const requested = body.attention_handoff;
        if (requested.source !== 'PROACTIVE_OPERATIONS') throw new BadRequestException('Select a registered attention action.');
        attentionHandoff = await this.proactive.handoff(user, requested.attention_id, { action: requested.action });
        for (const key of Object.keys(requested)) if (!(key in attentionHandoff) || requested[key] !== attentionHandoff[key]) throw new ForbiddenException('Attention handoff does not match the current authorized target.');
        const target = { profile: attentionHandoff.profile, tenant_id: attentionHandoff.tenant, current_user_id: attentionHandoff.owner_id, entity_type: attentionHandoff.entity_type, entity_id: attentionHandoff.entity_id, current_route: body.drawer_origin?.current_route || attentionHandoff.current_route, locale: 'en' };
        const validated = await this.brain.validateContext(user, target);
        if (!validated.enabled || !validated.context || validated.context.entity_id !== target.entity_id || validated.context.entity_type !== target.entity_type) throw new ForbiddenException('Attention target is not authorized.');
        const messages: Record<string, string> = { DATA_DOCTOR: 'Diagnose this record', WHY: 'Why is this on my attention list?', REPORT_BUILDER: 'Show all overdue POs', PREPARE_PR_PLAN: 'Create a PR for this item', VIEW: `What is this ${target.entity_type === 'purchase_order' ? 'PO' : 'record'} status?` };
        body = { message: messages[attentionHandoff.action], brain_context: validated.context, attention_id: attentionHandoff.attention_id, ...(body.drawer_origin ? { drawer_origin: { current_route: target.current_route, ...(body.drawer_origin.entity_id ? { entity_type: target.entity_type, entity_id: target.entity_id } : {}) } } : {}) };
        decision = selectUnifiedRoute(body.message, { profile: configuration.profile });
        handoff = 1;
      }
      if (body.unified_session_id) {
        session = await this.contexts.get(user, body.unified_session_id);
        ref = session.working_ref;
      }
      const drawerOrigin = body.drawer_origin && decision.operation !== 'BLOCKED' ? await this.drawerOrigin(user, body.drawer_origin) : undefined;
      if (body.context_ref) {
        const context = body.context_ref;
        const fields: Record<string, keyof UnifiedWorkingRef> = { REPORT:'report_session_id', DASHBOARD:'dashboard_id', IMPORT_BATCH:'import_batch_id', ACTION_PLAN:'plan_id', ATTENTION_ITEM:'attention_item_id', ENGINEERING_REQUEST:'engineering_request_id', AUTOQA_FINDING:'autoqa_finding_id' };
        if (!fields[context.type] || typeof context.id !== 'string') throw new BadRequestException('Unsupported working reference.');
        const previousReportId = ref.report_session_id;
        ref = { ...ref, current_type: context.type, [fields[context.type]]: context.id };
        if (context.type === 'REPORT') ref.saved_report_id = context.saved_report_id || (context.id === previousReportId ? ref.saved_report_id : undefined);
        if (['AUTOQA_FINDING','ENGINEERING_REQUEST'].includes(context.type)) {
          const scope = this.contexts.scope(user);
          ref.entity = { profile: scope.profile, tenant_id: scope.tenant, current_user_id: scope.owner, entity_type: context.type === 'AUTOQA_FINDING' ? 'autoqa_finding' : 'support_incident', entity_id: context.id, current_route: '/dashboard', locale: 'en' } as any;
        }
      }
      if (body.brain_context) ref = { ...ref, entity: body.brain_context, current_type: 'ERP_ENTITY' };
      if (attentionHandoff) ref.attention_item_id = attentionHandoff.attention_id;
      if (attentionHandoff?.action === 'PREPARE_PR_PLAN') ref.current_type = 'ATTENTION_ITEM';
      if (body.screen_context && !body.brain_context && !ref.entity && (isPoGrnRequest(body.message) || /\bthis (?:PO|purchase order|GRN|item|supplier)\b/i.test(body.message))) {
        if (!configuration.capabilities.includes('BRAIN_QUERY')) throw new ForbiddenException('Record context is not available.');
        ref = {...ref,entity:body.screen_context,current_type:'ERP_ENTITY'};
      }
      if (body.document_ids?.length) ref = { ...ref, document_ids: body.document_ids, current_type: 'DOCUMENT_ANALYSIS' };
      if (body.session_id && !ref.report_session_id) ref = { ...ref, report_session_id: body.session_id, current_type: 'REPORT' };
      const listContext = body.list_context;
      if (listContext !== undefined) {
        if (!listContext || typeof listContext !== 'object' || Array.isArray(listContext) || Object.keys(listContext).some(key => !['module','view','current_route'].includes(key)) || listContext.module !== 'PURCHASE_ORDERS' || !['ALL','OPEN_PO'].includes(listContext.view) || listContext.current_route !== '/dashboard/purchase/orders' || body.brain_context) throw new BadRequestException('Select one registered list view or one record.');
        if (!configuration.capabilities.includes('REPORT_BUILDER')) throw new ForbiddenException('The purchase order list is not available.');
        if (/^export\b/i.test(body.message) && !configuration.can_export) throw new ForbiddenException('Report export is not permitted.');
        if (decision.operation !== 'BLOCKED' && !ref.current_type && !isExplicitPoReport(body.message) && /\b(?:these|this list|this view)\b/i.test(body.message)) {
          const report = await this.reporting.interpret(user, {message:listContext.view === 'OPEN_PO' ? 'Show all open purchase orders' : 'Show all purchase orders'});
          if (!report?.session_id || report.report?.plan?.dataset !== 'PURCHASE_ORDERS') throw new BadRequestException('The current list could not be verified.');
          ref = {current_type:'REPORT',report_session_id:report.session_id};
        }
      }
      if (decision.operation !== 'BLOCKED' && isPoGrnRequest(body.message) && configuration.capabilities.includes('BRAIN_QUERY')) {
        const number = body.message.match(/\bPO[-/][A-Za-z0-9_/-]+\b/i)?.[0];
        if (number) ref = {current_type:'ERP_ENTITY',entity:await this.brain.purchaseOrderContext(user,number)};
      }
      ({ ref, reportDataset, currentPlan, currentEngineering } = await this.validate(user, ref));
      if (isExplicitPoReport(body.message) || (isPoRemainingFilter(body.message) && ref.current_type !== 'REPORT')) { ref = {};reportDataset=undefined;currentPlan=undefined;currentEngineering=undefined; }
      contextValidated = true;
      let message = body.message;
      if (ref.current_type === 'REPORT' && ref.report_session_id && /^(?:open|select|diagnose)(?: the)? oldest(?: one| PO)?[.!?]?$/i.test(message)) {
        if (!configuration.capabilities.includes('REPORT_BUILDER') || !configuration.capabilities.includes('BRAIN_QUERY')) throw new ForbiddenException('Report record selection is not available.');
        const context = await this.reporting.oldestContext(user, ref.report_session_id);
        const validated = await this.brain.validateContext(user, context);
        if (!validated.enabled || !validated.context) throw new ForbiddenException('The selected report record is unavailable.');
        ref = {current_type:'ERP_ENTITY',entity:validated.context};
        message = /^diagnose/i.test(message) ? 'Diagnose this PO' : 'What is this PO status?';
      }
      if (body.next_action) {
        const action = this.actions(configuration, ref, reportDataset).find(action => action.key === body.next_action);
        if (!action) throw new ForbiddenException('This next action is not available in your current authorized context.');
        message = action.message;
      }
      decision = selectUnifiedRoute(message, { contextType: ref.current_type, entityType: ref.entity?.entity_type, profile:configuration.profile,attachmentKinds: ref.document_ids?.length ? ['DOCUMENT'] : ref.import_batch_id ? ['SPREADSHEET'] : [] });
      if (listContext && /^why\b.*\b(?:these|this list|this view)\b/i.test(message)) decision = selectUnifiedRoute('Show all purchase orders');
      routingMs = Date.now() - started;
      if (decision.operation === 'BLOCKED') {
        failureType = 'AUTHORIZATION'; result = { ...this.clarification(decision.question!), status: 'UNIFIED_BLOCKED' };
      } else if (!decision.route) { clarification = true; result = this.clarification(decision.question!); }
      else if (!configuration.capabilities.includes(decision.route)) {
        result = this.clarification('That capability is not enabled or permitted here. I can help with the information available in your environment.');
        failureType = 'AUTHORIZATION'; clarification = true;
      } else if (decision.operation === 'EXPORT' && !configuration.can_export) {
        result = this.clarification('Report export is not permitted with your current access.');failureType='AUTHORIZATION';clarification=true;
      } else if (decision.operation === 'DISCOVER') {
        const descriptions: Partial<Record<UnifiedRoute, string>> = { ERP_QUERY:'answer authorized ERP questions', BRAIN_QUERY:'explain records and their relationships', DATA_DOCTOR:'diagnose recorded data issues', REPORT_BUILDER:'build and refine reports', DOCUMENT_INTELLIGENCE:'review and compare documents', SMART_IMPORT:'prepare spreadsheet import previews for approval', AUTOENGINEER:'report software problems', SMART_APPROVAL:'review documents before approval', ACTION_PLANNER:'prepare governed action plans', PROACTIVE_OPERATIONS:'show items needing attention' };
        result = { status: 'UNIFIED_DISCOVERY', assistant_message: `I can ${configuration.capabilities.filter(route => descriptions[route]).map(route => descriptions[route]).join(', ')}.${configuration.capabilities.includes('ACTION_PLANNER') ? ' Material actions still require their normal authorization and approval.' : ' Action execution is not enabled for this environment.'}`, questions: [], safety: { executable:false, read_only:true } };
      } else {
        handoff = attentionHandoff ? 1 : Number(!!session && ref.current_type !== this.routeContext(decision.route));
        const input = { ...body, message, brain_context: ref.entity, session_id: ref.current_type === 'REPORT' ? ref.report_session_id : undefined, saved_report_id:ref.current_type === 'REPORT' ? ref.saved_report_id : undefined, document_ids: ref.current_type === 'DOCUMENT_ANALYSIS' ? ref.document_ids : undefined };
        delete input.context_ref; delete input.unified_session_id; delete input.next_action;
        subsystemStarted = Date.now();
        switch (decision.route) {
          case 'BRAIN_QUERY': {
            const brainMessage = isPoGrnRequest(message) ? 'What are the related GRNs for this PO?' : ref.entity?.entity_type === 'purchase_order' && /\b(?:quantity|how many)\b/i.test(message) ? 'What is the ordered and received quantity for this PO?' : message;
            result = await this.brain.interpret(user, { ...input, message:brainMessage });
            break;
          }
          case 'DATA_DOCTOR': result = await this.doctor.interpret(user, { ...input, message: 'Diagnose this record' }); break;
          case 'SMART_APPROVAL': result = ref.entity ? await this.approval.interpret(user, { ...input, message: 'Review this before approval' }) : this.clarification('Which authorized PR, PO, or GRN should I review?'); break;
          case 'REPORT_BUILDER':
            if (isPoRemainingFilter(message)) {
              if (ref.current_type === 'REPORT' && reportDataset !== 'PURCHASE_ORDERS') throw new BadRequestException('Select a purchase order report for the remaining-quantity filter.');
              input.message = ref.current_type === 'REPORT' ? 'Only with remaining quantity > 0' : 'Show all purchase orders with remaining quantity greater than 0';
            }
            if (listContext && /^why\b.*\b(?:these|this list|this view)\b/i.test(message)) {
              const report = await this.reporting.query(user, {session_id:ref.report_session_id});
              result = {status:'REPORT_READY',session_id:ref.report_session_id,report,assistant_message:listContext.view === 'OPEN_PO' ? 'These purchase orders are eligible for receipt and have remaining quantity greater than 0. Select one PO for its receipt evidence.' : 'This is the purchase order list. Select one PO to explain its receipt evidence.'};
            } else if (decision.operation === 'EXPORT') {
              const report = await this.reporting.query(user, { session_id: ref.report_session_id });
              result = { status:'REPORT_EXPORT_READY', report, session_id:ref.report_session_id, assistant_message:'Your current report is ready to export.', export_request:{session_id:ref.report_session_id,version:report.version} };
            } else if (ref.current_type === 'DOCUMENT_ANALYSIS' && /\b(?:history|previous purchases)\b/i.test(message)) {
              const documents = await Promise.all((ref.document_ids || []).map(id => this.documents.get(user, id)));
              result = await this.reporting.documentHistory(user, documents);
            } else if (ref.entity && /\b(?:related|similar|previous purchases|purchase history)\b/i.test(message)) result = await this.reporting.contextualHistory(user, ref.entity, /\bopen\b/i.test(message) ? {openOnly:true} : undefined);
            else result = await this.reporting.interpret(user, input);
            if (/^export\b/i.test(message) && decision.operation !== 'EXPORT' && result?.report) {
              if (!configuration.can_export) throw new ForbiddenException('Report export is not permitted.');
              result.export_request = {session_id:result.session_id,version:result.report.version};
            }
            break;
          case 'DOCUMENT_INTELLIGENCE':
            const references = [...new Set((message.match(/\b(?:RFQ|PO)[-/][A-Z0-9_/-]+/gi) || []).map((value: string) => value.trim()))];
            result = !ref.entity && references.length > 1 ? this.clarification('Choose one exact authorized RFQ or PO for comparison.') : ref.document_ids?.length ? await this.documents.compare(user, { ...input, reference:body.reference || references[0] }) : this.clarification('Attach the PDF or image and select the authorized RFQ or PO for comparison.');
            if (result && !result.questions?.length) result = { ...result, document_comparison: result };
            break;
          case 'SMART_IMPORT': {
            if (ref.import_batch_id) {
              const preview = await this.imports.workingContext(user, ref.import_batch_id);
              result = { status:'UNIFIED_IMPORT_PREVIEW', import_preview:{batch_id:preview.batch.id,status:preview.batch.status,row_count:preview.rows.length,requires_approval:true}, assistant_message:`This import is ${preview.batch.status.replaceAll('_',' ').toLowerCase()}. ${preview.rows.length} rows are recorded. Importing still requires the native approval workflow.`, safety:{read_only:true,executable:false} };
            } else result = this.clarification('Attach the XLSX or CSV workbook to prepare an import preview. Nothing will be imported without native authorization and approval.');
            break;
          }
          case 'AUTOENGINEER':
            if (decision.operation === 'REVIEW') result={status:'SUPPORT_STATUS',support_incidents:[currentEngineering],assistant_message:`Your software request is ${String(currentEngineering?.status || 'awaiting review')}.`,safety:{read_only:true,executable:false}};
            else if (decision.operation === 'PREPARE_FIX') {
              if (!ref.entity || !ref.diagnosis_key) result = this.clarification('Select one freshly confirmed software-defect diagnosis before preparing a fix request.');
              else result = await this.support.prepareDoctorFix(user, await this.doctor.prepareFix(user, { action:'PREPARE_FIX_WITH_AUTOENGINEER',brain_context:ref.entity,diagnosis_key:ref.diagnosis_key }));
            } else result = await this.support.route(user, input);
            break;
          case 'ACTION_PLANNER':
            if (decision.operation === 'REVIEW' && currentPlan) result={status:'ACTION_OPERATOR_PLAN',action_operator_plan:currentPlan,assistant_message:'Review the exact plan effects and warnings. Approval and execution still use the native governed controls.',safety:{read_only:true,executable:false}};
            else if (ref.current_type === 'REPORT' && reportDataset !== 'ITEMS') result = this.clarification('This report does not contain eligible item references. Select an ungrouped item report before preparing a PR plan.');
            else if (ref.current_type === 'IMPORT_BATCH' && ref.import_batch_id) {
              const items = await this.imports.actionItems(user, ref.import_batch_id);
              result = await this.operator.interpret(user, { ...input, brain_context:undefined, item_ids:items.item_ids });
            }
            else if (ref.current_type === 'ATTENTION_ITEM' && ref.attention_item_id) result = await this.proactive.preparePlan(user, ref.attention_item_id);
            else result = await this.operator.interpret(user, currentPlan ? { ...currentPlan.payload?.request, ...input, brain_context:currentPlan.payload?.request?.brain_context, session_id:currentPlan.payload?.request?.session_id, item_ids:currentPlan.payload?.request?.item_ids, document_ids:currentPlan.payload?.request?.document_ids,inputs:{...currentPlan.payload?.request?.inputs,...body.inputs},replaces_plan_id:currentPlan.id } : input);
            break;
          case 'PROACTIVE_OPERATIONS': result = await this.proactive.interpret(user, input); break;
          default: result = await erp(input);
        }
        subsystemMs = Date.now() - subsystemStarted;
        subsystemStarted = undefined;
        if (!result) { clarification = true; result = this.clarification('Which authorized record or task would you like to work with?'); }
        if (result.brain_context) ref.entity = result.brain_context;
        if (decision.route === 'BRAIN_QUERY' && result.brain_context) ref.current_type = 'ERP_ENTITY';
        if (decision.route === 'SMART_APPROVAL' && result.brain_context) ref.current_type = 'APPROVAL_REVIEW';
        if (result.session_id) { ref.report_session_id = result.session_id; ref.current_type = 'REPORT'; }
        if (result.dashboard?.id) { ref.dashboard_id = result.dashboard.id; ref.current_type = ref.report_session_id ? 'REPORT' : 'DASHBOARD'; }
        if (result.diagnoses) {
          ref.current_type = 'DIAGNOSIS';
          const confirmed = result.diagnoses.filter((issue: any) => issue.classification === 'SOFTWARE_DEFECT_CANDIDATE' && issue.confidence === 'CONFIRMED');
          ref.diagnosis_key = confirmed.length === 1 ? confirmed[0].diagnosis_key : undefined;
        }
        if (result.document_comparison) ref.current_type = 'DOCUMENT_ANALYSIS';
        if (result.support_incident?.id) { ref.engineering_request_id = result.support_incident.id; ref.current_type = 'ENGINEERING_REQUEST'; }
        if (result.action_operator_plan?.id) { ref.plan_id = result.action_operator_plan.id; ref.current_type = 'ACTION_PLAN'; }
        clarification ||= !!result.questions?.length && !result.action_operator_plan;
      }
      if (result?.report?.plan) reportDataset = result.report.plan.dataset;
      if (attentionHandoff) {
        result.attention_handoff = attentionHandoff;
        if (attentionHandoff.action === 'DATA_DOCTOR') result.assistant_message = `Diagnosis: ${ref.entity?.document_number || attentionHandoff.entity_reference}. ${result.assistant_message || result.summary || 'Review the deterministic findings below.'}`;
        if (result.attention_evidence) { result.evidence = [{ claim: 'ATTENTION_EVIDENCE', values: result.attention_evidence.evidence }]; ref.current_type = 'ATTENTION_ITEM'; }
      }
      if (drawerOrigin) ref.drawer_origin = drawerOrigin;
      if (result?.saved_report?.id) ref.saved_report_id = result.saved_report.id;
      if (result?.report && ref.saved_report_id) result.report = {...result.report,saved_report_id:ref.saved_report_id};
      result = await this.finish(user, result, ref, session, configuration, reportDataset, decision, routingMs, subsystemMs, failures);
    } catch (error) {
      if (subsystemStarted !== undefined) subsystemMs = Date.now() - subsystemStarted;
      failureType = this.failure(error);
      const message = failureType === 'AUTHORIZATION' ? 'That record or capability is not available in your current authorized scope.' : failureType === 'INVALID_INPUT' ? 'This request needs a valid, current record or result. Please select it and try again.' : 'This part of your request is temporarily unavailable. Your previous task has not been replaced.';
      failures.push({capability:decision.route,type:failureType,message});
      result = { ...this.clarification(message), status:'UNIFIED_ERROR', unified:{version:1,type:'ERROR',route:decision.route,confidence:decision.confidence,session_id:session?.id,session_version:session?.version,failures,next_actions:[],executable:false} };
      if (failureType === 'UNAVAILABLE' && contextValidated && ref.entity) {
        result = { ...result, status:'UNIFIED_PARTIAL', brain_context:ref.entity,
          working_record:{entity_type:ref.entity.entity_type,entity_id:ref.entity.entity_id,document_number:ref.entity.document_number},
          assistant_message:`${message} Your selected ${ref.entity.document_number || ref.entity.entity_type} is still authorized. No business action was executed.`,
          unified:{...result.unified,type:'PARTIAL_RESULT',content_type:'EVIDENCE',partial:true,context:{type:ref.current_type,label:ref.entity.document_number || ref.entity.entity_type}} };
      }
    }
    const event: UnifiedTelemetry = { route:decision.route,confidence:decision.confidence,routing_ms:routingMs >= 0 ? routingMs : Math.max(0,Date.now()-started-subsystemMs),response_ms:Date.now()-started,subsystem_ms:subsystemMs,handoff_count:handoff,failure_type:failureType || failures[0]?.type || null,partial_result:result.unified?.type === 'PARTIAL_RESULT',clarification,user_correction:body.user_correction === true,performance:aiPerformance() };
    try { await this.contexts.telemetry(user, event); } catch { this.logger.warn('Unified AI health metadata is unavailable. No chat content was logged.');result.unified.telemetry_status='UNAVAILABLE'; }
    return result;
  }
  private routeContext(route: UnifiedRoute) {
    return ({BRAIN_QUERY:'ERP_ENTITY',REPORT_BUILDER:'REPORT',DATA_DOCTOR:'DIAGNOSIS',SMART_APPROVAL:'APPROVAL_REVIEW',DOCUMENT_INTELLIGENCE:'DOCUMENT_ANALYSIS',SMART_IMPORT:'IMPORT_BATCH',AUTOENGINEER:'ENGINEERING_REQUEST',ACTION_PLANNER:'ACTION_PLAN',PROACTIVE_OPERATIONS:'ATTENTION_ITEM'} as any)[route];
  }
  private async finish(user: any, result: any, ref: UnifiedWorkingRef, previous: UnifiedSession | undefined, configuration: Awaited<ReturnType<UnifiedAiService['configuration']>>, reportDataset: string | undefined, decision: ReturnType<typeof selectUnifiedRoute>, routingMs: number, subsystemMs: number, failures: any[]) {
    let session = previous;
    try { session = await this.contexts.save(user, ref, previous); }
    catch { session = undefined; failures.push({capability:null,type:'METADATA_UNAVAILABLE',message:'The answer is available, but its working context could not be saved. Start a fresh task before relying on follow-up references.'}); }
    const incomplete = result.proactive_brief?.incomplete_sources?.length || result.incomplete_sources?.length || result.items?.some((item: any) => item.confidence === 'INSUFFICIENT_EVIDENCE') || result.diagnoses?.some((item: any) => item.confidence === 'INSUFFICIENT_EVIDENCE');
    const partial = failures.length > 0 || !!incomplete;
    const originalMessage = customerAiMessage(String(result.assistant_message || result.summary || result.report?.plan?.title || 'The authorized result is ready.'));
    const partialMessages: Partial<Record<UnifiedRoute,string>> = {BRAIN_QUERY:'The selected record is available, but some related information could not be checked.',DATA_DOCTOR:'I found the selected record, but some diagnosis checks could not be completed.',REPORT_BUILDER:'Report data is available, but some values could not be verified.',DOCUMENT_INTELLIGENCE:'Document evidence is available, but some extracted values need review.',PROACTIVE_OPERATIONS:'Some attention checks are unavailable. The recorded findings are shown.'};
    const message = incomplete && decision.route ? `${partialMessages[decision.route] || 'Some checks could not be completed.'} ${originalMessage}` : originalMessage;
    return { status:'UNIFIED_READY',intent_type:'UNIFIED_AI',provider:'MIZANTRA_UNIFIED_AI_V1',safety:{read_only:true,executable:false},extracted:{},resolved:{},questions:[],context_token:'',...result,assistant_message:message,unified:{version:1,type:partial ? 'PARTIAL_RESULT' : this.resultType(decision.route,result),content_type:this.resultType(decision.route,result),route:decision.route,confidence:decision.confidence,session_id:session?.id || null,session_version:session?.version || null,context:{type:ref.current_type || null,label:ref.entity?.document_number || (ref.current_type === 'REPORT' ? 'Current report' : ref.current_type?.replaceAll('_',' ').toLowerCase() || null)},next_actions:this.actions(configuration,ref,reportDataset),failures,partial,timing:{routing_ms:routingMs,subsystem_ms:subsystemMs},executable:false,autonomous_execution:false} };
  }
  async health(user: any) {
    const health = await this.contexts.health(user), configuration = await this.configuration(user);
    const extraction = this.documents.operationalHealth?.(user) || {ocr_fallback_rate:null,document_extraction_failure_rate:null};
    const capability_status = Object.fromEntries(['UNIFIED_ROUTER','BRAIN_QUERY','DATA_DOCTOR','REPORT_BUILDER','DOCUMENT_INTELLIGENCE','SMART_APPROVAL','ACTION_PLANNER','PROACTIVE_OPERATIONS','SMART_IMPORT','AUTOENGINEER','AUTOQA'].map(capability => [capability, capability === 'UNIFIED_ROUTER' ? configuration.enabled && configuration.router ? 'AVAILABLE' : 'DISABLED' : capability === 'AUTOQA' ? process.env.AUTOQA_ENABLED === 'true' ? 'AVAILABLE' : 'DISABLED' : configuration.capabilities.includes(capability as UnifiedRoute) ? 'AVAILABLE' : 'DISABLED_OR_NOT_PERMITTED']));
    return { ...health,...extraction, enabled:configuration.enabled,router:configuration.router,capabilities:configuration.capabilities,capability_status,health_kind:'OPERATIONAL_CONFIGURATION_AND_SCOPED_METRICS',release_sha:/^[a-f0-9]{40}$/i.test(process.env.BUILD_GIT_SHA || '') ? process.env.BUILD_GIT_SHA : null,modes:configuration.modes,status:!configuration.enabled ? 'DISABLED' : health.routing_failures ? 'DEGRADED' : 'AVAILABLE',specialist_links:hasAdminBypass(user) ? ['/dashboard/support/admin/brain','/dashboard/support/admin/autoqa','/dashboard/support/admin','/dashboard/support/admin/smart-imports'] : [] };
  }
  async correction(user: any, body: any) {
    if (!unifiedFlags().enabled || !unifiedFlags().router) throw new ForbiddenException('Unified AI is not enabled.');
    if (!body || Object.keys(body).some(key => !['session_id','session_version'].includes(key))) throw new BadRequestException('Supply only the current session reference.');
    const session = await this.contexts.get(user, body.session_id);
    if (body.session_version !== session.version) throw new BadRequestException('This answer has been replaced. Select the current answer.');
    await this.validate(user, session.working_ref);
    await this.contexts.telemetry(user, {route:null,confidence:'CONTEXTUAL',routing_ms:0,response_ms:0,subsystem_ms:0,handoff_count:0,failure_type:null,partial_result:false,clarification:false,user_correction:true});
    return { recorded:true };
  }
}