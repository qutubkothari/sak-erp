import { ForbiddenException, Injectable, Logger } from "@nestjs/common";
import { hasAdminBypass } from "../auth/utils/permission-utils";
import { BrainDiagnosticEvidence, BrainService } from "./brain.service";
import { BRAIN_REGISTRY, brainEntitySummary } from "./brain-registry";
import { DATA_DOCTOR_RULES, DoctorModule, DoctorSnapshot, evaluateDoctor } from "./data-doctor.rules";

export function dataDoctorIntent(message: string) {
  return /\b(diagnos(?:e|is)|reconcile|reconciles?|data issues)\b/i.test(message) || /\b(?:check|find)\b.*\b(?:problems?|issues?|wrong|batch)\b/i.test(message) || /^why\b.*\b(?:wrong|incorrect|doesn['\u2019]?t.*match|does not.*match)\b/i.test(message);
}
const supported: Record<string, DoctorModule[]> = {
  item: ["INVENTORY", "ITEM", "DRAWING"], purchase_order: ["PO"], grn: ["GRN"], item_drawing: ["DRAWING"],
  employee: ["ATTENDANCE"], attendance: ["ATTENDANCE"], smart_import_batch: ["SMART_IMPORT"], autoqa_finding: ["AUTO_QA"],
  supplier: ["ITEM"],
};

@Injectable()
export class DataDoctorService {
  private readonly logger = new Logger(DataDoctorService.name);
  private readonly metrics = new Map<string, { count: number; duration: number; errors: number }>();
  constructor(private readonly brain: BrainService) {}

  private reply(message: string, extra: Record<string, any> = {}) {
    return { status: "DATA_DOCTOR_READ_ONLY", intent_type: "DATA_DOCTOR", provider: "DETERMINISTIC_DATA_DOCTOR_V1", assistant_message: message, message, summary: message,
      extracted: {}, resolved: {}, questions: [], context_token: "", safety: { read_only: true, executable: false }, diagnoses: [], evidence: [], entities: [], ...extra };
  }

  async interpret(user: any, body: any) {
    if (!dataDoctorIntent(String(body?.message || ""))) return null;
    if (process.env.MIZANTRA_DATA_DOCTOR_ENABLED !== "true") return this.reply("Data Doctor is not enabled for this deployment.");
    if (!body?.brain_context) return this.reply("Which record should I diagnose? Open or select the item, PO, GRN, employee, drawing, import batch or finding.", { questions: ["Which record should I diagnose?"] });
    const started = Date.now();
    let failed = false, rules: string[] = [], entityCount = 0, resultCount = 0;
    let auditContext: Record<string, any> = {};
    try {
      return await this.brain.withDiagnosticEvidence(user, body.brain_context, async evidence => {
        auditContext = evidence.context;
        const modules = supported[evidence.context.entity_type];
        if (!modules) return this.reply("This authorized context has no Data Doctor rules in V1.", { brain_context: evidence.context });
        const snapshot = await this.snapshot(evidence);
        const result = evaluateDoctor(snapshot, modules);
        if (evidence.context.entity_type === "autoqa_finding" && snapshot.datasets.qaTarget?.length) {
          const target = snapshot.datasets.qaTarget[0];
          try {
            const expanded = await evidence.expand(target.type, target.id);
            const expandedSnapshot = await this.snapshot({ ...evidence, ...expanded });
            const expandedResult = evaluateDoctor(expandedSnapshot, supported[expanded.context.entity_type] || []);
            result.diagnoses.push(...expandedResult.diagnoses);
            result.rules_executed.push(...expandedResult.rules_executed);
            snapshot.related_entities.push(...expandedSnapshot.related_entities);
          } catch {
            snapshot.datasets.qaTarget = [];
            const unavailable = evaluateDoctor(snapshot, ["AUTO_QA"]);
            result.diagnoses.push(...unavailable.diagnoses.filter(issue => issue.diagnosis_key === "AUTO_QA_TARGET_UNAVAILABLE"));
          }
        }
        rules = result.rules_executed; entityCount = snapshot.related_entities.length; resultCount = result.diagnoses.length;
        const message = result.diagnoses.length ? result.diagnoses.slice(0, 12).map(issue => `${issue.severity} | ${issue.title}\n${issue.explanation}\n${issue.confidence}: ${issue.recommended_action}`).join("\n\n") : "No inconsistency was found in the checks supported by this authorized evidence. This is not proof of complete historical correctness.";
        return this.reply(message, { ...result, brain_context: evidence.context, entities: snapshot.related_entities,
          evidence: [{ claim: "DIAGNOSTIC_COVERAGE", values: { entity_type: evidence.context.entity_type, entity_id: evidence.context.entity_id, document_number: evidence.context.document_number, dataset_counts: Object.fromEntries(Object.entries(snapshot.datasets).map(([key, records]) => [key, records?.length ?? null])), period: snapshot.datasets.period?.[0] || null } },
            ...(snapshot.receipt ? [{ claim: "PO_RECEIPT_STATE", values: Object.fromEntries(["po_id", "po_number", "po_status", "receipt_status", "ordered_qty", "received_qty", "accepted_qty", "rejected_qty", "remaining_qty", "open_po"].map(key => [key, snapshot.receipt![key] ?? null])) }] : []),
            ...result.diagnoses.map(issue => ({ claim: issue.diagnosis_key, values: issue.evidence.fact }))],
          timeline: evidence.nodes.filter(node => ["purchase_requisition", "purchase_order", "grn", "stock_movement"].includes(node.type)).map(node => ({ ...brainEntitySummary(node.type, node.row), recorded_at: node.row.created_at || node.row.movement_date || null, issue_keys: result.diagnoses.filter(issue => issue.entity.entity_id === node.row.id).map(issue => issue.diagnosis_key) })),
          execution_enabled: false,
        });
      });
    } catch (error) { failed = true; throw error; }
    finally {
      const duration = Date.now() - started;
      const key = `${auditContext.profile || "UNVALIDATED"}:${user?.tenantId || ""}`;
      const metrics = this.metrics.get(key) || { count: 0, duration: 0, errors: 0 };
      metrics.count++; metrics.duration += duration; metrics.errors += Number(failed);
      if (this.metrics.size >= 1000 && !this.metrics.has(key)) this.metrics.delete(this.metrics.keys().next().value!);
      this.metrics.set(key, metrics);
      this.logger.log(JSON.stringify({ event: "DATA_DOCTOR_DIAGNOSTIC", profile: auditContext.profile || null, tenant: user?.tenantId || null, user: user?.userId || user?.id || null, entity_type: auditContext.entity_type || null, entity_id: auditContext.entity_id || null, modules: supported[auditContext.entity_type] || [], rules_executed: rules, entities_inspected: entityCount, duration_ms: duration, result_count: resultCount, error: failed }));
    }
  }

  async inspectEvidence(evidence: BrainDiagnosticEvidence) {
    const snapshot = await this.snapshot(evidence);
    const modules: DoctorModule[] = evidence.context.entity_type === "purchase_requisition" ? ["ITEM"] : supported[evidence.context.entity_type] || [];
    return { snapshot, ...evaluateDoctor(snapshot, modules) };
  }

  private async snapshot(evidence: BrainDiagnosticEvidence): Promise<DoctorSnapshot> {
    const root = evidence.nodes[0].row, type = evidence.context.entity_type;
    const datasets: DoctorSnapshot["datasets"] = {};
    const related_entities = evidence.nodes.map(node => brainEntitySummary(node.type, node.row));
    const snapshot: DoctorSnapshot = { context: evidence.context, root, datasets, related_entities };
    const graphRows = (nodeType: string) => evidence.canRead(nodeType) ? evidence.nodes.filter(node => node.type === nodeType).map(node => node.row) : undefined;
    const load = async (key: string, resolver: string, filters: Record<string, string | string[]>, options?: Parameters<BrainDiagnosticEvidence["read"]>[2]) => {
      if (!evidence.canRead(resolver)) return;
      try { datasets[key] = await evidence.read(resolver, filters, options); } catch (error) { if (error instanceof ForbiddenException) throw error; datasets[key] = undefined; }
    };
    datasets.poLines = graphRows("purchase_order_item"); datasets.grnLines = graphRows("grn_item"); datasets.items = graphRows("item"); datasets.vendors = graphRows("supplier"); datasets.requisitions = graphRows("purchase_requisition");
    if (type === "purchase_requisition") {
      const itemIds = datasets.items?.map(item => String(item.id)) || [];
      if (itemIds.length) await load("itemDetails", "doctor_item", { id: itemIds }); else if (datasets.items) datasets.itemDetails = [];
    }
    if (type === "purchase_order") {
      datasets.poLines = datasets.poLines?.filter(line => line.po_id === root.id);
      const grnIds = new Set(evidence.nodes.filter(node => node.type === "grn" && node.row.po_id === root.id && !["REJECTED", "CANCELLED"].includes(String(node.row.status).toUpperCase())).map(node => node.row.id));
      datasets.grnLines = datasets.grnLines?.filter(line => grnIds.has(line.grn_id));
      await Promise.all([load("matchingOrders", "purchase_order", {}, { match: { field: "po_number", value: String(root.po_number || "").trim() } }), evidence.canRead("grn") ? evidence.receipt(root.id).then(value => { snapshot.receipt = value; }) : Promise.resolve()]);
    }
    if (type === "grn") {
      datasets.grnLines = datasets.grnLines?.filter(line => line.grn_id === root.id);
      datasets.poLines = datasets.poLines?.filter(line => line.po_id === root.po_id);
      await load("movements", "doctor_movements", { reference_type: "GRN", reference_id: root.id });
    }
    if (type === "item" || type === "item_drawing") {
      const itemId = type === "item" ? root.id : root.item_id;
      await Promise.all([load("itemDetails", "doctor_item", { id: itemId }), load("dimensions", "doctor_dimensions", { id: itemId }), load("stock", "doctor_stock", { item_id: itemId }), load("movements", "doctor_movements", { item_id: itemId }), load("links", "doctor_links", { item_id: itemId }), load("drawings", "item_drawing", { item_id: itemId }), load("packages", "doctor_packages", { owner_item_id: itemId }), load("matchingItems", "item", {}, { match: { field: "code", value: String(root.code || "").trim() } }), load("oemDetails", "doctor_oem", { id: itemId })]);
      const vendorIds = datasets.links?.map(link => String(link.vendor_id)).filter(Boolean) || [];
      if (vendorIds.length) await load("vendors", "supplier", { id: vendorIds });
      const oem = datasets.oemDetails?.[0];
      if (oem?.oem_name && oem?.oem_part_no) await load("matchingOem", "doctor_oem", { oem_name: oem.oem_name }, { match: { field: "oem_part_no", value: oem.oem_part_no } }); else if (datasets.oemDetails) datasets.matchingOem = [];
    }
    if (type === "employee" || type === "attendance") {
      const employeeId = type === "employee" ? root.id : root.employee_id;
      const since = type === "attendance" ? String(root.attendance_date).slice(0, 10) : new Date(Date.now() - 31 * 86_400_000).toISOString().slice(0, 10);
      await Promise.all([load("attendance", "attendance", { employee_id: employeeId }, { since: { field: "attendance_date", value: since } }), load("punches", "doctor_punches", { employee_id: employeeId }, { since: { field: "punch_at", value: since } })]);
      datasets.period = [{ since, employee_id: employeeId }];
    }
    if (type === "smart_import_batch") await Promise.all([load("batchDetails", "doctor_batch", { id: root.id }), load("importRows", "doctor_import_rows", { batch_id: root.id })]);
    if (type === "autoqa_finding") {
      const targetType = String(root.entity_type || "").toLowerCase();
      const targetId = targetType === "grn" ? root.evidence?.grnId || root.entity_id : root.entity_id;
      datasets.qaTarget = targetType !== "autoqa_finding" && BRAIN_REGISTRY[targetType] && supported[targetType] && typeof targetId === "string" && evidence.canRead(targetType) ? [{ type: targetType, id: targetId }] : [];
    }
    if (type === "supplier") {
      await load("links", "doctor_links", { vendor_id: root.id });
      const itemIds = datasets.links?.map(link => String(link.item_id)).filter(Boolean) || [];
      if (itemIds.length) await load("itemDetails", "doctor_item", { id: itemIds }); else if (datasets.links) datasets.itemDetails = [];
    }
    return snapshot;
  }

  health(user: any) {
    const configuration = this.brain.configuration(user);
    if (!hasAdminBypass(user)) throw new ForbiddenException("Admin authorization is required.");
    const metrics = this.metrics.get(`${configuration.profile}:${configuration.tenant_id}`) || { count: 0, duration: 0, errors: 0 };
    return { enabled: process.env.MIZANTRA_DATA_DOCTOR_ENABLED === "true", rule_count: DATA_DOCTOR_RULES.length, modules: [...new Set(DATA_DOCTOR_RULES.map(rule => rule.module))], recent_diagnostics: metrics.count, average_duration_ms: metrics.count ? Math.round(metrics.duration / metrics.count) : 0, errors: metrics.errors, execution_enabled: false, metrics_scope: "CURRENT_TENANT_SINCE_API_START" };
  }

  async prepareFix(user: any, body: any) {
    if (body?.action !== "PREPARE_FIX_WITH_AUTOENGINEER") throw new ForbiddenException("An explicit Prepare Fix with AutoEngineer action is required.");
    const result = await this.interpret(user, { message: "diagnose this", brain_context: body?.brain_context });
    const diagnosis = result?.diagnoses?.find((issue: any) => issue.diagnosis_key === body?.diagnosis_key && issue.classification === "SOFTWARE_DEFECT_CANDIDATE" && issue.confidence === "CONFIRMED");
    if (!diagnosis || !result?.brain_context) throw new ForbiddenException("Only a freshly confirmed software defect can be prepared. Data issues require controlled correction.");
    return { diagnosis, context: result.brain_context, related_entities: result.entities };
  }
}