import { BadRequestException, ForbiddenException, Injectable, Logger, NotFoundException, ServiceUnavailableException } from "@nestjs/common";
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { hasAdminBypass, hasPermission, hasSuperAdminBypass } from "../auth/utils/permission-utils";
import { PurchaseOrdersService } from "../purchase/services/purchase-orders.service";
import { sanitizeSupportText } from "../support-autofix/support-store.service";
import { classifyAutoEngineerIntent } from "../support-autofix/autoengineer-policy";
import { brainActionPreview, brainDepth, brainFlags, BRAIN_MAX_RECORDS, BRAIN_TIMEOUT_MS } from "./brain-policy";
import { BRAIN_REGISTRY, brainEntitySummary } from "./brain-registry";

export type BrainContext = {
  profile: string; tenant_id: string; current_route: string; module: string;
  entity_type: string; entity_id: string; document_number: string;
  current_user_id: string; current_user_role: string; locale: string;
};
type BrainScope = { tenantId: string; userId: string; profile: string; user: any };
type BrainNode = { type: string; row: Record<string, any>; depth: number };
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

@Injectable()
export class BrainService {
  private readonly db: SupabaseClient = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_KEY!);
  private readonly logger = new Logger(BrainService.name);
  private readonly metrics = new Map<string, { count: number; totalMs: number; errors: number }>();
  constructor(private readonly orders: PurchaseOrdersService) {}

  private scope(user: any): BrainScope {
    const tenantId = String(user?.tenantId || "");
    const userId = String(user?.userId || user?.id || "");
    const profile = String(process.env.ERP_TENANT_PROFILE || "").toUpperCase();
    if (!uuid.test(tenantId) || !uuid.test(userId)) throw new ForbiddenException("Authenticated tenant and user are required.");
    if (!["SAIFSEAS", "MIZANTRA", "ARWA"].includes(profile)) throw new ForbiddenException("Brain profile is not configured.");
    return { tenantId, userId, profile, user };
  }

  private allowed(scope: BrainScope, type: string): boolean {
    const permission = BRAIN_REGISTRY[type]?.permission;
    if (permission === "AUTO_QA" || permission === "SMART_IMPORT") return hasAdminBypass(scope.user);
    if (permission === "SUPPORT") return true;
    return !!permission && hasPermission(scope.user, permission);
  }

  private query(scope: BrainScope, type: string, signal: AbortSignal) {
    const resolver = BRAIN_REGISTRY[type];
    if (!resolver || !this.allowed(scope, type)) throw new ForbiddenException("You cannot view this context.");
    const columns = resolver.parent ? `${resolver.columns},brain_parent:${resolver.parent.table}!inner(tenant_id)` : resolver.columns;
    let query: any = this.db.from(resolver.table).select(columns).eq(resolver.parent ? "brain_parent.tenant_id" : "tenant_id", scope.tenantId).abortSignal(signal);
    if (resolver.profileScoped) query = query.eq("profile", scope.profile);
    if (type === "support_incident" && !hasSuperAdminBypass(scope.user)) query = query.eq("reported_by", scope.userId);
    return query;
  }

  private async rows(query: any): Promise<Record<string, any>[]> {
    const result = await query.limit(BRAIN_MAX_RECORDS + 1);
    if (result.error) throw new ServiceUnavailableException("Recorded evidence could not be loaded safely.");
    if ((result.data || []).length > BRAIN_MAX_RECORDS) throw new ServiceUnavailableException("There are too many related records for a complete Brain V1 answer. Narrow the context.");
    return result.data || [];
  }

  private async validated(scope: BrainScope, envelope: any, signal: AbortSignal) {
    if (!envelope || typeof envelope !== "object" || Array.isArray(envelope)) throw new BadRequestException("A document context is required.");
    if (envelope.tenant_id !== scope.tenantId || envelope.profile !== scope.profile || (envelope.current_user_id && envelope.current_user_id !== scope.userId)) throw new ForbiddenException("Browser context does not match your authenticated scope.");
    const type = String(envelope.entity_type || "");
    const id = String(envelope.entity_id || "");
    if (!BRAIN_REGISTRY[type] || !uuid.test(id)) throw new BadRequestException("Unsupported or invalid document context.");
    const tenants = await this.rows(this.db.from("tenants").select("id").eq("id", scope.tenantId).abortSignal(signal));
    if (!tenants.length) throw new ForbiddenException("Authenticated tenant is unavailable.");
    const records = await this.rows(this.query(scope, type, signal).eq("id", id));
    if (!records.length) throw new NotFoundException("Context not found in your authorized tenant.");
    const row = records[0];
    const context: BrainContext = {
      profile: scope.profile, tenant_id: scope.tenantId,
      current_route: /^\/dashboard(?:\/[a-zA-Z0-9_-]+)*$/.test(String(envelope.current_route)) ? envelope.current_route : "/dashboard",
      module: type.toUpperCase(), entity_type: type, entity_id: id,
      document_number: brainEntitySummary(type, row).document_number,
      current_user_id: scope.userId,
      current_user_role: String(typeof scope.user.role === "string" ? scope.user.role : scope.user.role?.name || ""),
      locale: /^[a-z]{2}(?:-[A-Z]{2})?$/.test(String(envelope.locale)) ? envelope.locale : "en",
    };
    return { context, root: { type, row, depth: 0 } as BrainNode };
  }

  private async bounded<T>(work: (signal: AbortSignal) => Promise<T>): Promise<T> {
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout>;
    try {
      return await Promise.race([work(controller.signal), new Promise<T>((_resolve, reject) => {
        timer = setTimeout(() => { controller.abort(); reject(new ServiceUnavailableException("Brain data resolution timed out.")); }, BRAIN_TIMEOUT_MS);
      })]);
    } finally { clearTimeout(timer!); controller.abort(); }
  }

  async validateContext(user: any, envelope: any) {
    if (!brainFlags().contextEnabled) return { enabled: false, context: null };
    return this.bounded(async signal => ({ enabled: true, context: (await this.validated(this.scope(user), envelope, signal)).context }));
  }

  private async graph(scope: BrainScope, root: BrainNode, depthRaw: unknown, signal: AbortSignal) {
    const maximumDepth = brainDepth(depthRaw);
    const nodes = [root];
    const edges: { from: string; to: string; relationship: string }[] = [];
    const seen = new Set([`${root.type}:${root.row.id}`]);
    for (let depth = 0; depth < maximumDepth; depth++) {
      const frontier = nodes.filter(node => node.depth === depth);
      for (const type of new Set(frontier.map(node => node.type))) {
        const parents = frontier.filter(node => node.type === type);
        for (const relation of BRAIN_REGISTRY[type].relations) {
          if (relation.direction === "incoming" && ["supplier", "item", "purchase_requisition"].includes(type) && type !== root.type && relation.type !== "rfq" && relation.type !== "purchase_requisition_item") continue;
          if (!this.allowed(scope, relation.type)) continue;
          const eligibleParents = parents.filter(node => relation.direction === "incoming" || !relation.condition || node.row[relation.condition.field] === relation.condition.value);
          const keys = [...new Set(eligibleParents.map(node => String(relation.direction === "incoming" ? node.row.id : node.row[relation.foreignKey] || "")).filter(Boolean))];
          if (!keys.length) continue;
          let request = this.query(scope, relation.type, signal).in(relation.direction === "incoming" ? relation.foreignKey : "id", keys);
          if (relation.direction === "incoming" && relation.condition) request = request.eq(relation.condition.field, relation.condition.value);
          const records = await this.rows(request);
          for (const row of records) {
            const key = `${relation.type}:${row.id}`;
            for (const parent of eligibleParents) {
              if (String(relation.direction === "incoming" ? row[relation.foreignKey] : row.id) !== String(relation.direction === "incoming" ? parent.row.id : parent.row[relation.foreignKey])) continue;
              edges.push({ from: `${type}:${parent.row.id}`, to: key, relationship: relation.direction });
            }
            if (!seen.has(key)) { seen.add(key); nodes.push({ type: relation.type, row, depth: depth + 1 }); }
            if (nodes.length > BRAIN_MAX_RECORDS) throw new ServiceUnavailableException("Purchase history exceeds Brain V1 limits. Narrow the context.");
          }
        }
      }
    }
    if ((root.type === "item" || root.type === "supplier") && this.allowed(scope, "item") && this.allowed(scope, "supplier") && maximumDepth > 0) {
      const field = root.type === "item" ? "item_id" : "vendor_id";
      const targetType = root.type === "item" ? "supplier" : "item";
      const targetField = root.type === "item" ? "vendor_id" : "item_id";
      const links = await this.rows(this.db.from("item_vendors").select("item_id,vendor_id").eq("tenant_id", scope.tenantId).eq("is_active", true).eq(field, root.row.id).abortSignal(signal));
      const ids = [...new Set(links.map(link => String(link[targetField])))];
      if (ids.length) for (const row of await this.rows(this.query(scope, targetType, signal).in("id", ids))) {
        const key = `${targetType}:${row.id}`;
        edges.push({ from: `${root.type}:${root.row.id}`, to: key, relationship: "approved_supplier_mapping" });
        if (!seen.has(key)) { seen.add(key); nodes.push({ type: targetType, row, depth: 1 }); }
      }
      if (nodes.length > BRAIN_MAX_RECORDS) throw new ServiceUnavailableException("Related records exceed Brain V1 limits.");
    }
    return { nodes, edges, maximumDepth };
  }

  private reply(message: string, evidence: any[] = [], entities: any[] = [], extra: Record<string, unknown> = {}) {
    return { status: "BRAIN_READ_ONLY", intent_type: "BRAIN_QUERY", provider: "DETERMINISTIC_BRAIN_V1", extracted: {}, resolved: {}, questions: [], context_token: "", safety: { read_only: true, executable: false }, assistant_message: message, message, summary: message, evidence, entities, ...extra };
  }

  async interpret(user: any, body: any): Promise<any | null> {
    const flags = brainFlags();
    if (!flags.enabled || !flags.contextEnabled || !flags.graphEnabled) return null;
    const text = String(body?.message || "").trim();
    const supportIntent = classifyAutoEngineerIntent(text, body?.support_mode).intent;
    const contextType = String(body?.brain_context?.entity_type || "");
    if (supportIntent !== "NORMAL_ERP_REQUEST" && !/^show\b.*\bhistory\b/i.test(text) && !["autoqa_finding", "support_incident", "smart_import_batch"].includes(contextType)) return null;
    const action = /^(?:create|prepare|raise)\b.*\b(?:reorder|below|replenish)/i.test(text);
    const contextual = /\b(this|these|it|them|here|he)\b/i.test(text);
    const supported = /\b(open|pending|received|receipt|history|happened|come from|created|supplier|supplies|purchase|items|buy|used|blocked|wrong|status|late|delay|PR|PO|GRN)\b/i.test(text);
    const question = /^(?:why|what|which|who|where|has|have|is|how many|show.*history)\b/i.test(text);
    if (!action && (!supported || (!contextual && !(body?.brain_context && question)))) return null;
    const started = Date.now();
    const scope = this.scope(user);
    const intent = action ? "ACTION_PREVIEW" : "CONTEXT_QUERY";
    let used: string[] = [];
    let failed = false;
    try {
      if (action) return this.reply(brainActionPreview().steps.map((step, index) => `${index + 1}. ${step}`).join("\n") + "\n\nExecution is not enabled in Brain V1.", [], [], { action_plan: brainActionPreview() });
      if (!body.brain_context) return this.reply("Which document do you mean? Open or select a purchase order, receipt, item, supplier, or finding.", [], [], { questions: ["Which document do you mean?"] });
      return await this.bounded(async signal => {
        const { context, root } = await this.validated(scope, body.brain_context, signal);
        const graph = await this.graph(scope, root, body?.brain_depth, signal);
        used = [...new Set(graph.nodes.map(node => node.type))];
        const entities = graph.nodes.map(node => brainEntitySummary(node.type, node.row));
        const evidence: any[] = [];
        const extra = { brain_context: context, graph: { edges: graph.edges, maximum_depth: graph.maximumDepth }, authoritative_source: "LIVE_ERP" };
        if (/\b(late|delay|cause)\b/i.test(text)) return this.reply("I can see the document, but there is not enough recorded evidence to determine the cause of a supplier delay.", [{ claim: "INSUFFICIENT_EVIDENCE", entities }], entities, extra);
        if (root.type === "smart_import_batch") {
          const rows = await this.rows(this.db.from("smart_import_batch_rows").select("row_reference,decision,validation,target_entity").eq("tenant_id", scope.tenantId).eq("batch_id", root.row.id).abortSignal(signal));
          const blocked = rows.filter(row => !["CREATE", "USE_EXISTING", "SKIP"].includes(String(row.decision)));
          evidence.push({ claim: "IMPORT_ROW_VALIDATION", values: blocked });
          const reasons = blocked.map(row => `${row.row_reference}: ${(Array.isArray(row.validation) ? row.validation : []).map((issue: any) => sanitizeSupportText(issue.message, 200)).join("; ") || row.decision}`);
          return this.reply(`${context.document_number}: ${blocked.length} of ${rows.length} recorded rows require review.\n${reasons.join("\n")}`, evidence, entities, extra);
        }
        if (root.type === "autoqa_finding") return this.reply(`${sanitizeSupportText(root.row.title, 200)}\n${sanitizeSupportText(root.row.summary, 1000)}\nStatus: ${root.row.status}.`, [{ claim: "AUTO_QA_FINDING", values: { check_key: root.row.check_key, status: root.row.status, evidence: root.row.evidence, entity_type: root.row.entity_type, entity_id: root.row.entity_id } }], entities, extra);
        if (root.type === "support_incident") return this.reply(`This issue is ${root.row.status}. Module: ${root.row.module}.`, [{ claim: "INCIDENT_STATUS", values: { status: root.row.status, module: root.row.module } }], entities, extra);
        let poNodes = graph.nodes.filter(node => node.type === "purchase_order");
        if (root.type === "supplier") poNodes = poNodes.filter(node => node.row.vendor_id === root.row.id);
        if (root.type === "item") {
          const relevantPoIds = new Set(graph.nodes.filter(node => node.type === "purchase_order_item" && node.row.item_id === root.row.id).map(node => node.row.po_id));
          poNodes = poNodes.filter(node => relevantPoIds.has(node.row.id));
        }
        if (/\blast purchase\b/i.test(text)) poNodes = poNodes.sort((left, right) => String(right.row.po_date || right.row.created_at || "").localeCompare(String(left.row.po_date || left.row.created_at || ""))).slice(0, 1);
        const summaries: string[] = [];
        if (/\b(open|pending|received|receipt|last purchase)\b/i.test(text)) {
          if (poNodes.length > 15) return this.reply("There are too many related purchase orders to analyze within Brain V1 limits. Select one purchase order.", [], entities, extra);
          if (!this.allowed(scope, "grn")) return this.reply("Receipt evidence is unavailable with your current permissions.", [], entities, extra);
          for (const node of poNodes) {
            const values = await this.orders.brainReceiptEvidence(scope.tenantId, String(node.row.id), signal);
            evidence.push({ claim: "PO_RECEIPT_STATE", values, source_entity: brainEntitySummary(node.type, node.row) });
            if (/\b(open|pending)\b/i.test(text) && root.type !== "purchase_order" && !values.open_po) continue;
            summaries.push(`${values.document_number}: ${values.ordered_qty} ordered, ${values.physical_received_qty} physically received, ${values.accepted_qty || 0} accepted, ${values.rejected_qty || 0} rejected, ${values.qc_pending_qty} awaiting QC, ${values.remaining_qty} remaining under the ERP receipt calculation. Receipt status: ${values.receipt_status}; PO status: ${values.status}.`);
          }
          if (/\b(open|pending)\b/i.test(text) && ["supplier", "item"].includes(root.type)) summaries.unshift(`${summaries.length} open purchase orders are recorded in this bounded context.`);
        }
        const suppliers = entities.filter(entity => entity.entity_type === "supplier" && (root.type !== "purchase_order" || entity.entity_id === root.row.vendor_id));
        if (root.type === "supplier" && /\b(items|buy)\b/i.test(text)) {
          const directPoIds = new Set(poNodes.map(node => node.row.id));
          const itemIds = new Set(graph.nodes.filter(node => node.type === "purchase_order_item" && directPoIds.has(node.row.po_id)).map(node => node.row.item_id));
          const items = entities.filter(entity => entity.entity_type === "item" && itemIds.has(entity.entity_id));
          summaries.push(items.length ? `Recorded purchased items: ${items.map(entity => entity.document_number).join(", ")}.` : "No accessible item purchase relationship is recorded for this supplier.");
        }
        if (/\b(supplies|supplier)\b/i.test(text) && !summaries.length) summaries.push(suppliers.length ? `Recorded suppliers: ${suppliers.map(entity => entity.document_number).join(", ")}.` : "No supplier relationship is recorded or accessible for this context.");
        if (!summaries.length && root.type === "purchase_order" && /\b(PR|requisition|come from|origin)\b/i.test(text)) {
          const origin = entities.find(entity => entity.entity_type === "purchase_requisition" && entity.entity_id === root.row.pr_id);
          summaries.push(origin ? `${context.document_number} originates from ${origin.document_number}.` : "No accessible originating purchase requisition is recorded for this PO.");
        }
        if (!summaries.length) summaries.push(graph.edges.length ? "Recorded purchase relationships:\n" + graph.edges.map(edge => {
          const source = entities.find(entity => `${entity.entity_type}:${entity.entity_id}` === edge.from);
          const target = entities.find(entity => `${entity.entity_type}:${entity.entity_id}` === edge.to);
          return `${source?.document_number} -> ${target?.document_number}`;
        }).join("\n") : "No related records are available.");
        evidence.push({ claim: "PURCHASE_CHAIN", entities, relationships: graph.edges });
        return this.reply(summaries.join("\n"), evidence, entities, extra);
      });
    } catch (error) { failed = true; throw error; }
    finally {
      const durationMs = Date.now() - started;
      const key = `${scope.profile}:${scope.tenantId}`;
      const metrics = this.metrics.get(key) || { count: 0, totalMs: 0, errors: 0 };
      metrics.count++; metrics.totalMs += durationMs; metrics.errors += Number(failed);
      if (this.metrics.size >= 1000 && !this.metrics.has(key)) this.metrics.delete(this.metrics.keys().next().value!);
      this.metrics.set(key, metrics);
      this.logger.log(JSON.stringify({ event: "BRAIN_QUERY", tenant: scope.tenantId, user: scope.userId, profile: scope.profile, module: BRAIN_REGISTRY[String(body?.brain_context?.entity_type)] ? String(body.brain_context.entity_type).toUpperCase() : null, entity_type: BRAIN_REGISTRY[String(body?.brain_context?.entity_type)] ? body.brain_context.entity_type : null, entity_id: uuid.test(String(body?.brain_context?.entity_id)) ? body.brain_context.entity_id : null, intent, resolvers: used, duration_ms: durationMs, error: failed }));
    }
  }

  health(user: any) {
    const scope = this.scope(user);
    if (!hasAdminBypass(user)) throw new ForbiddenException("Admin authorization is required.");
    const metrics = this.metrics.get(`${scope.profile}:${scope.tenantId}`) || { count: 0, totalMs: 0, errors: 0 };
    return { ...brainFlags(), profile: scope.profile, resolver_count: Object.keys(BRAIN_REGISTRY).length, recent_query_count: metrics.count, average_resolution_ms: metrics.count ? Math.round(metrics.totalMs / metrics.count) : 0, errors: metrics.errors, metrics_scope: "CURRENT_TENANT_SINCE_API_START", business_writes: false };
  }

  configuration(user: any) {
    const scope = this.scope(user);
    return { ...brainFlags(), profile: scope.profile, tenant_id: scope.tenantId, current_user_id: scope.userId };
  }
}