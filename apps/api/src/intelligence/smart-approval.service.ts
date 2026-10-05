import { BadRequestException, ForbiddenException, Injectable, Logger, Optional } from "@nestjs/common";
import { createHash } from "node:crypto";
import { hasAdminBypass, hasPermission } from "../auth/utils/permission-utils";
import { BrainDiagnosticEvidence, BrainService } from "./brain.service";
import { brainEntitySummary } from "./brain-registry";
import { DataDoctorService } from "./data-doctor.service";
import { DocumentAnalysisService } from "./document-analysis.service";
import { evaluateApproval, ReviewDocument, ReviewSnapshot, SMART_APPROVAL_CHECKS } from "./smart-approval.rules";
const resources: Record<ReviewDocument, string> = { purchase_order: "purchase_orders", purchase_requisition: "purchase_requisitions", grn: "grns", payslip: "PAYROLL_APPROVE" };
type SmartApprovalResponse = { [key: string]: any; items: any[]; checks_executed?: string[]; attention_points?: number; status: string; intent_type: string; provider: string };
export function smartApprovalIntent(message: string) { return /\breview\b.*\b(?:approv|this|before)/i.test(message) || (/\bpayroll\b/i.test(message) && /\b(?:review|evidence|approval)\b/i.test(message)) || /what should I look at here/i.test(message) || /anything unusual.*\b(?:PO|PR|GRN)\b/i.test(message) || /^check this (?:GRN|PO|PR)[.!?]?$/i.test(message.trim()); }
function currencyFromTerms(value: unknown): string | null {
  if (typeof value !== "string") return null;
  try { const parsed = JSON.parse(value); const currency = parsed.supplierCurrency; return typeof currency === "string" && /^[A-Z]{3}$/.test(currency) ? currency : null; } catch { return null; }
}
function stable(value: any): any { if (Array.isArray(value)) return value.map(stable).sort((left, right) => JSON.stringify(left).localeCompare(JSON.stringify(right))); if (value && typeof value === "object") return Object.fromEntries(Object.keys(value).sort().map(key => [key, stable(value[key])])); return value; }

@Injectable()
export class SmartApprovalService {
  private readonly logger = new Logger(SmartApprovalService.name);
  private readonly metrics = new Map<string, { count: number; duration: number; errors: number }>();
  constructor(private readonly brain: BrainService, private readonly doctor: DataDoctorService, @Optional() private readonly documents?: DocumentAnalysisService) {}
  configuration(user: any) {
    const brain = this.brain.configuration(user);
    const supported_document_types = (Object.keys(resources) as ReviewDocument[]).filter(type => type === "payslip" ? hasPermission(user, "PAYROLL_APPROVE") && hasPermission(user, "hr:read") : hasPermission(user, `${resources[type]}:approve`) && process.env[`MIZANTRA_SMART_APPROVAL_${type === "purchase_order" ? "PO" : type === "purchase_requisition" ? "PR" : "GRN"}`] !== "false");
    return { enabled: process.env.MIZANTRA_SMART_APPROVAL_ENABLED === "true" && brain.enabled && brain.contextEnabled && brain.graphEnabled, supported_document_types, profile: brain.profile, tenant_id: brain.tenant_id };
  }
  async review(user: any, body: any): Promise<SmartApprovalResponse> {
    const configuration = this.configuration(user);
    if (!configuration.enabled) throw new ForbiddenException("Mizantra Review is not enabled.");
    const type = body?.brain_context?.entity_type as ReviewDocument;
    if (!Object.prototype.hasOwnProperty.call(resources, type)) throw new BadRequestException("This document type has no Smart Approval review in V1.");
    if (!configuration.supported_document_types.includes(type)) throw new ForbiddenException("Document approval-review permission is required.");
    const start = Date.now(); let error = false, checks: string[] = [], count = 0, context: any = {};
    if (type === "payslip") return this.reviewPayroll(user, body);
    try { return await this.brain.withDiagnosticEvidence(user, body.brain_context, async evidence => {
      context = evidence.context;
      const snapshot = await this.snapshot(evidence, type);
      const version = createHash("sha256").update(JSON.stringify(stable({ context: { profile: context.profile, tenant_id: context.tenant_id, entity_type: type, entity_id: context.entity_id }, root: snapshot.root, datasets: snapshot.datasets, receipt: snapshot.receipt, doctor: snapshot.doctor, qa: snapshot.qa }))).digest("hex");
      const result = evaluateApproval(snapshot); checks = result.checks_executed; count = result.items.length;
      const changed = typeof body.previous_review_version === "string" && body.previous_review_version !== version;
      const document_quote_hint = this.documents ? await this.documents.approvalHint(user, evidence.context).catch(() => null) : null;
      const receipt_quantities = type === "grn" && snapshot.datasets.lines ? { received_qty: snapshot.datasets.lines.reduce((sum, line) => sum + (Number(line.received_qty) || 0), 0), accepted_qty: snapshot.datasets.lines.reduce((sum, line) => sum + (Number(line.accepted_qty) || 0), 0), rejected_qty: snapshot.datasets.lines.reduce((sum, line) => sum + (Number(line.rejected_qty) || 0), 0) } : undefined;
      return { status: "SMART_APPROVAL_READ_ONLY", intent_type: "SMART_APPROVAL_REVIEW", provider: "DETERMINISTIC_SMART_APPROVAL_V1", brain_context: evidence.context, document_quote_hint, workflow_state: snapshot.root.status, receipt_quantities, ...result, review_version: version, reviewed_at: snapshot.timestamp, valid_until: new Date(Date.parse(snapshot.timestamp) + 30000).toISOString(), remaining_validity_ms: Math.max(0, 30000 - (Date.now() - Date.parse(snapshot.timestamp))), previous_review_status: changed ? "REVIEW_STALE" : null, regenerated: true, safety: { read_only: true, executable: false, workflow_mutation: false }, attention_points: result.items.filter(item => ["ATTENTION_REQUIRED", "CRITICAL_DATA_INCONSISTENCY"].includes(item.outcome)).length };
    }); } catch (caught) { error = true; throw caught; } finally {
      const key = `${configuration.profile}:${configuration.tenant_id}`; const previous = this.metrics.get(key) || { count: 0, duration: 0, errors: 0 }; const duration = Date.now() - start; previous.count++; previous.duration += duration; previous.errors += Number(error); if (this.metrics.size >= 1000 && !this.metrics.has(key)) this.metrics.delete(this.metrics.keys().next().value!); this.metrics.set(key, previous);
      this.logger.log(JSON.stringify({ event: "SMART_APPROVAL_REVIEW", profile: configuration.profile, tenant: configuration.tenant_id, user: user.userId || user.id, entity_type: type, entity_id: context.entity_id || null, reviewed_at: new Date().toISOString(), checks_executed: checks, result_count: count, duration_ms: duration, error }));
    }
  }

  private async reviewPayroll(user: any, body: any): Promise<SmartApprovalResponse> {
    return this.brain.withDiagnosticEvidence(user, body.brain_context, async evidence => {
      const root = evidence.nodes[0].row;
      const slips = evidence.canRead("doctor_payroll_slips") ? await evidence.read("doctor_payroll_slips", { payroll_run_id: String(root.payroll_run_id || "") }).catch(() => []) : [];
      const controls = evidence.canRead("doctor_payroll_controls") ? await evidence.read("doctor_payroll_controls", { payroll_run_id: String(root.payroll_run_id || "") }).catch(() => []) : [];
      const correctionRows = evidence.canRead("doctor_payroll_corrections") ? await evidence.read("doctor_payroll_corrections", { payroll_month: String(root.salary_month || "") }).catch(() => []) : [];
      const control = controls.slice().sort((a: any, b: any) => Number(b.version || 0) - Number(a.version || 0))[0] || null;
      const activeSlips = slips.filter((slip: any) => slip.is_current !== false);
      const aggregate = { employee_count: activeSlips.length, gross: activeSlips.reduce((sum: number, slip: any) => sum + (Number(slip.gross_salary) || 0), 0), deductions: activeSlips.reduce((sum: number, slip: any) => sum + (Number(slip.total_deductions) || 0), 0), net: activeSlips.reduce((sum: number, slip: any) => sum + (Number(slip.net_salary) || 0), 0) };
      const monthDate = new Date(`${String(root.salary_month || "").slice(0, 7)}-01T00:00:00Z`);
      monthDate.setUTCMonth(monthDate.getUTCMonth() - 1);
      const previousMonth = monthDate.toISOString().slice(0, 7);
      const previousSlipsRaw = evidence.canRead("doctor_payroll_slips") ? await evidence.read("doctor_payroll_slips", { salary_month: previousMonth }).catch(() => []) : [];
      const previousSlips = previousSlipsRaw.filter((slip: any) => slip.is_current !== false);
      const previousNet = previousSlips.reduce((sum: number, slip: any) => sum + (Number(slip.net_salary) || 0), 0);
      const thresholdRows = evidence.canRead("doctor_payroll_rules") ? await evidence.read("doctor_payroll_rules", { rule_key: "PAYROLL_VARIANCE_REVIEW_THRESHOLD_PERCENT" }).catch(() => []) : [];
      const currentMonth = String(root.salary_month).slice(0, 7);
      const currentMonthEnd = new Date(Date.UTC(Number(currentMonth.slice(0, 4)), Number(currentMonth.slice(5, 7)), 0)).toISOString().slice(0, 10);
      const thresholdRule = thresholdRows.filter((rule: any) => String(rule.effective_from) <= currentMonthEnd && (!rule.effective_to || rule.effective_to >= `${currentMonth}-01`)).sort((a: any, b: any) => String(b.effective_from).localeCompare(String(a.effective_from)))[0];
      const thresholdPercent = Number(thresholdRule?.rule_value);
      const previousByEmployee = new Map<string, number>(previousSlips.map((slip: any) => [String(slip.employee_id), Number(slip.net_salary) || 0] as [string, number]));
      const flagged = Number.isFinite(thresholdPercent) && thresholdPercent >= 0 ? activeSlips.flatMap((slip: any) => { const before = previousByEmployee.get(String(slip.employee_id)); if (before === undefined || before === 0) return []; const changePercent = ((Number(slip.net_salary || 0) - before) / Math.abs(before)) * 100; return Math.abs(changePercent) >= thresholdPercent ? [{ employee_id: slip.employee_id, payslip_id: slip.id, difference_percent: Math.round(changePercent * 100) / 100, threshold_percent: thresholdPercent, rule_version_id: thresholdRule?.id || null, status: "FLAGGED_FOR_REVIEW" }] : []; }) : [];
      const answer = `Payroll evidence review for ${root.salary_month}: ${aggregate.employee_count} current employee payslip(s), gross ${aggregate.gross}, deductions ${aggregate.deductions}, net ${aggregate.net}.`;
      const review_version = createHash("sha256").update(JSON.stringify(stable({ root, aggregate, previous_net: previousNet, control, flagged, corrections: correctionRows }))).digest("hex");
      return { status: "SMART_APPROVAL_READ_ONLY", intent_type: "PAYROLL_REVIEW_EVIDENCE", provider: "DETERMINISTIC_SMART_APPROVAL_V1", brain_context: evidence.context, answer, evidence: { ...aggregate, previous_net: previousNet, month_over_month_difference: Math.round((aggregate.net - previousNet) * 100) / 100, flagged_employees: flagged, blockers: control?.blocker_snapshot || [], correction_state: correctionRows.map((row: any) => ({ version: row.correction_version, status: row.status, difference_total: row.difference_total })), maker_identity: control?.opened_by || null, calculator_identity: control?.calculated_by || null, workflow_stage: control?.stage || null }, items: [], review_version, reviewed_at: new Date().toISOString(), attention_points: flagged.length + (Array.isArray(control?.blocker_snapshot) ? control.blocker_snapshot.length : 0), recommendation: "Review the listed deterministic evidence with the authorized payroll owner.", safety: { read_only: true, executable: false, workflow_mutation: false, ai_verdict: false, can_approve: false } };
    });
  }
  private async snapshot(evidence: BrainDiagnosticEvidence, type: ReviewDocument): Promise<ReviewSnapshot> {
    const root = evidence.nodes[0].row;
    const snapshot: ReviewSnapshot = { type, root, datasets: {}, related: evidence.nodes.map(node => brainEntitySummary(node.type, node.row)), timestamp: new Date().toISOString() };
    const datasets = snapshot.datasets;
    const graph = (nodeType: string) => evidence.canRead(nodeType) ? evidence.nodes.filter(node => node.type === nodeType).map(node => node.row) : undefined;
    const load = async (key: string, resolver: string, filters: Record<string, string | string[]>, options?: Parameters<BrainDiagnosticEvidence["read"]>[2]) => { if (!evidence.canRead(resolver)) return; try { datasets[key] = await evidence.read(resolver, filters, options); } catch { datasets[key] = undefined; } };
    datasets.prHeaders = graph("purchase_requisition"); datasets.poHeaders = graph("purchase_order"); datasets.poLines = graph("purchase_order_item"); datasets.items = graph("item"); datasets.vendors = graph("supplier");
    const rootResolver = type === "purchase_order" ? "approval_po" : type === "purchase_requisition" ? "approval_pr" : "approval_grn";
    await load("headerDetails", rootResolver, { id: root.id }); if (datasets.headerDetails?.[0]) snapshot.root = datasets.headerDetails[0];
    const itemIds = [...new Set(evidence.nodes.filter(node => node.type === "item").map(node => String(node.row.id)))];
    const prIds = [...new Set((datasets.prHeaders || []).map(pr => String(pr.id)))];
    await Promise.all([type === "grn" ? Promise.resolve().then(() => { datasets.lines = graph("grn_item")?.filter(line => line.grn_id === root.id); }) : load("lines", type === "purchase_order" ? "approval_po_lines" : "approval_pr_lines", { [type === "purchase_order" ? "po_id" : "pr_id"]: root.id }), itemIds.length ? load("items", "doctor_item", { id: itemIds }) : Promise.resolve(), root.vendor_id ? load("vendors", "approval_vendor", { id: root.vendor_id }) : Promise.resolve(), prIds.length ? load("prLines", "approval_pr_lines", { pr_id: prIds }) : Promise.resolve().then(() => { if (evidence.canRead("purchase_requisition")) datasets.prLines = []; })]);
    if (type === "purchase_requisition") datasets.linkedOrders = datasets.poHeaders?.filter(order => order.pr_id === root.id);
    if (type === "purchase_order") {
      await Promise.all([load("matchingOrders", "purchase_order", {}, { match: { field: "po_number", value: root.po_number } }), load("supplierOrders", "purchase_order", { vendor_id: root.vendor_id }), itemIds.length ? load("links", "doctor_links", { item_id: itemIds, vendor_id: root.vendor_id }) : Promise.resolve().then(() => { if (evidence.canRead("doctor_links")) datasets.links = []; }), evidence.canRead("grn") ? evidence.receipt(root.id).then(receipt => { snapshot.receipt = Object.fromEntries(["receipt_status", "ordered_qty", "received_qty", "physical_received_qty", "qc_pending_qty", "accepted_qty", "rejected_qty", "remaining_qty", "open_po"].map(key => [key, receipt[key]])); datasets.receipt = [snapshot.receipt]; }) : Promise.resolve()]);
      const supplierOrders = datasets.supplierOrders?.filter(order => order.id !== root.id);
      if (supplierOrders && supplierOrders.length <= 10 && evidence.canRead("grn")) {
        try { datasets.supplierReceiptStates = await Promise.all(supplierOrders.map(async order => { const receipt = await evidence.receipt(order.id); return { po_id: order.id, status: order.status, open_po: receipt.open_po, remaining_qty: receipt.remaining_qty, receipt_status: receipt.receipt_status }; })); } catch { datasets.supplierReceiptStates = undefined; }
      }
      if (evidence.canRead("approval_price_lines") && evidence.canRead("approval_po_prices")) {
        await Promise.all([load("priceHeaders", "approval_po_prices", { id: root.id }), itemIds.length ? load("allPrices", "approval_price_lines", { item_id: itemIds }) : Promise.resolve().then(() => { datasets.allPrices = []; })]);
        const historyIds = [...new Set((datasets.allPrices || []).filter(line => line.po_id !== root.id).map(line => String(line.po_id)))];
        if (historyIds.length) await load("historicalHeaders", "approval_po_prices", { id: historyIds }); else datasets.historicalHeaders = [];
        const currentHeader = datasets.priceHeaders?.[0];
          if (currentHeader && datasets.allPrices && datasets.historicalHeaders) {
            datasets.pricedLines = datasets.allPrices.filter(line => line.po_id === root.id).map(line => ({ ...line, tenant_id: evidence.context.tenant_id, currency: currencyFromTerms(currentHeader.terms_and_conditions) }));
            datasets.history = datasets.allPrices.flatMap(line => { const order = datasets.historicalHeaders!.find(header => header.id === line.po_id && ["APPROVED", "CLOSED"].includes(String(header.status).toUpperCase())); return order ? [{ ...line, tenant_id: evidence.context.tenant_id, currency: currencyFromTerms(order.terms_and_conditions), po_date: order.po_date, po_number: order.po_number, vendor_id: order.vendor_id }] : []; });
        }
        delete datasets.priceHeaders; delete datasets.historicalHeaders; delete datasets.allPrices;
      }
    }
    if (type === "grn") {
      datasets.poLines = datasets.poLines?.filter(line => line.po_id === root.po_id);
      datasets.lines = datasets.lines?.map(line => ({ ...line, item_id: datasets.poLines?.find(source => source.id === line.po_item_id)?.item_id }));
    }
    if (process.env.MIZANTRA_DATA_DOCTOR_ENABLED === "true") {
      const doctor = await this.doctor.inspectEvidence(evidence); snapshot.doctor = doctor.diagnoses; datasets.doctor = [];
    }
    if (evidence.canRead("approval_qa")) {
      const ids = evidence.nodes.map(node => String(node.row.id));
      await load("qa", "approval_qa", { entity_id: ids, severity: ["CRITICAL", "HIGH"] });
      const pairs = new Set(evidence.nodes.map(node => `${node.type}:${node.row.id}`));
      if (datasets.qa) snapshot.qa = datasets.qa.filter(finding => ["OPEN", "ACKNOWLEDGED", "CONFIRMED"].includes(String(finding.status).toUpperCase()) && pairs.has(`${String(finding.entity_type).toLowerCase()}:${finding.entity_id}`));
    }
    return snapshot;
  }
  async interpret(user: any, body: any) {
    if (!smartApprovalIntent(String(body?.message || ""))) return null;
    if (!body?.brain_context) return { status: "SMART_APPROVAL_READ_ONLY", intent_type: "SMART_APPROVAL_REVIEW", provider: "DETERMINISTIC_SMART_APPROVAL_V1", assistant_message: "Which PR, PO, GRN or payroll version should I review? Open the authorized record first.", extracted: {}, resolved: {}, questions: ["Which authorized record should I review?"], context_token: "", safety: { read_only: true, executable: false } };
    const review = await this.review(user, body);
    return { ...review, assistant_message: `I found ${review.attention_points} points that may deserve your attention. ${review.items.filter(item => item.confidence === "INSUFFICIENT_EVIDENCE").length} checks have incomplete evidence.`, extracted: {}, resolved: {}, questions: [], context_token: "" };
  }
  health(user: any) { if (!hasAdminBypass(user)) throw new ForbiddenException("Admin authorization is required."); const configuration = this.configuration(user); const metrics = this.metrics.get(`${configuration.profile}:${configuration.tenant_id}`) || { count: 0, duration: 0, errors: 0 }; return { enabled: configuration.enabled, supported_document_types: configuration.supported_document_types, check_count: SMART_APPROVAL_CHECKS.length, review_count: metrics.count, average_execution_ms: metrics.count ? Math.round(metrics.duration / metrics.count) : 0, errors: metrics.errors, scope: "CURRENT_TENANT_SINCE_API_START" }; }
}
