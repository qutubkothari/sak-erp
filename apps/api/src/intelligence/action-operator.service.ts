import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from "@nestjs/common";
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { hasPermission } from "../auth/utils/permission-utils";
import { classifyAutoEngineerIntent } from "../support-autofix/autoengineer-policy";
import { PurchaseRequisitionsService } from "../purchase/services/purchase-requisitions.service";
import { BrainService } from "./brain.service";
import { DataDoctorService } from "./data-doctor.service";
import { ReportingService } from "./reporting.service";
import { DocumentAnalysisService } from "./document-analysis.service";
import {
  draftPrPreview,
  operatorChecksum,
  operatorFlags,
  operatorIntent,
  operatorRisk,
  OPERATOR_ACTIONS,
  OperatorInputs,
  positiveQuantity,
} from "./action-operator.registry";

const uuid =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
type Scope = { tenant: string; owner: string; profile: string; user: any };

@Injectable()
export class ActionOperatorService {
  private readonly db = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_KEY!,
  );
  private readonly buildSha = (() => {
    try {
      return JSON.parse(
        readFileSync(resolve(__dirname, "../build-provenance.json"), "utf8"),
      ).version as string;
    } catch {
      return String(process.env.BUILD_GIT_SHA || "");
    }
  })();
  constructor(
    private readonly requisitions: PurchaseRequisitionsService,
    private readonly brain: BrainService,
    private readonly doctor: DataDoctorService,
    private readonly reporting: ReportingService,
    private readonly documents: DocumentAnalysisService,
  ) {}

  private scope(user: any): Scope {
    const flags = operatorFlags(),
      tenant = String(user?.tenantId || ""),
      owner = String(user?.userId || user?.id || "");
    if (!flags.enabled || !uuid.test(tenant) || !uuid.test(owner))
      throw new ForbiddenException(
        "Action Operator is not available in your authenticated scope.",
      );
    if (
      !hasPermission(user, "items:read") &&
      !hasPermission(user, "purchase_requisitions:read")
    )
      throw new ForbiddenException(
        "Authorized ERP context access is required.",
      );
    if (!/^[a-f0-9]{40}$/.test(this.buildSha))
      throw new ServiceUnavailableException(
        "Operator build identity is unavailable.",
      );
    return { tenant, owner, profile: flags.profile, user };
  }
  configuration(user: any) {
    const flags = operatorFlags();
    return {
      ...flags,
      enabled:
        flags.enabled &&
        (hasPermission(user, "items:read") ||
          hasPermission(user, "purchase_requisitions:read")),
      can_execute_pr:
        flags.pr && hasPermission(user, "purchase_requisitions:create"),
      actions: OPERATOR_ACTIONS,
      expiry_minutes: 30,
      autonomous_execution: false,
    };
  }
  private executionPermission(scope: Scope) {
    if (
      !operatorFlags().pr ||
      !hasPermission(scope.user, "purchase_requisitions:create")
    )
      throw new ForbiddenException(
        "purchase_requisitions:create is required; analysis does not grant execution authority.",
      );
  }
  private async checked(query: any) {
    const result = await query;
    if (result.error) {
      if (
        /PLAN_CHANGED_REVIEW_REQUIRED|PLAN_CANNOT_BE_REPLACED/.test(
          result.error.message || "",
        )
      )
        throw new ConflictException("PLAN_CHANGED_REVIEW_REQUIRED");
      if (
        /APPROVAL_NOT_ELIGIBLE|EXPLICIT_APPROVAL_REQUIRED/.test(
          result.error.message || "",
        )
      )
        throw new ForbiddenException("EXPLICIT_APPROVAL_REQUIRED");
      if (/PLAN_NOT_FOUND/.test(result.error.message || ""))
        throw new NotFoundException("Plan is not available in your scope.");
      throw new ServiceUnavailableException(
        "Operator evidence or metadata could not be loaded safely.",
      );
    }
    return result.data;
  }
  private context(scope: Scope, id: string) {
    return {
      tenant_id: scope.tenant,
      profile: scope.profile,
      current_user_id: scope.owner,
      entity_type: "item",
      entity_id: id,
      current_route: "/dashboard/active-planner",
      locale: "en",
    };
  }
  private async diagnosis(scope: Scope, item: any) {
    if (process.env.MIZANTRA_DATA_DOCTOR_ENABLED !== "true")
      throw new ForbiddenException("Data Doctor precheck is not enabled.");
    return this.brain.withDiagnosticEvidence(
      scope.user,
      this.context(scope, item.id),
      async (evidence) => {
        const result = await this.doctor.inspectEvidence(evidence);
        return result.diagnoses
          .filter(
            (issue) =>
              ["CRITICAL", "HIGH"].includes(issue.severity) &&
              issue.entity.entity_id === item.id,
          )
          .map((issue) => ({
            item_id: item.id,
            reason: "DATA_DOCTOR_BLOCK",
            check: issue.diagnosis_key,
          }));
      },
    );
  }
  private date(value: unknown): string | null {
    if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value))
      return null;
    const date = new Date(value + "T00:00:00Z");
    return Number.isFinite(date.getTime()) &&
      date.toISOString().slice(0, 10) === value &&
      value >= new Date().toISOString().slice(0, 10) &&
      Number(value.slice(0, 4)) <= 2100
      ? value
      : null;
  }
  private async resolveInputs(scope: Scope, body: any) {
    if (!hasPermission(scope.user, "items:read"))
      throw new ForbiddenException("items:read is required for PR planning.");
    const message = String(body.message || ""),
      blocked: any[] = [];
    const source = {
      report_id: body.report_id || undefined,
      session_id: body.session_id || undefined,
      below_reorder: /below reorder/i.test(message),
    };
    let report: any = null;
    let ids: string[] = Array.isArray(body.item_ids)
      ? body.item_ids.map(String)
      : [];
    let context: any = null;
    if (source.report_id || source.session_id || source.below_reorder) {
      report = await this.reporting.actionItems(scope.user, source);
      ids = report.item_ids;
    } else if (body.brain_context) {
      const validated = await this.brain.validateContext(
        scope.user,
        body.brain_context,
      );
      context = validated.context;
      if (!context || context.entity_type !== "item")
        throw new BadRequestException(
          "Select an item or a semantic item report for a draft PR.",
        );
      ids = [context.entity_id];
    }
    const codes: string[] =
      Array.isArray(body.item_codes) && body.item_codes.length
        ? body.item_codes.map(String)
        : [...message.matchAll(/\bitem\s+([A-Z0-9][A-Z0-9_./-]*)/gi)]
            .map((match) => match[1])
            .filter(
              (code) =>
                !["this", "these", "master", "report"].includes(
                  code.toLowerCase(),
                ),
            );
    if (
      ids.some((id) => !uuid.test(id)) ||
      ids.length > 200 ||
      codes.length > 200
    )
      throw new BadRequestException(
        "Choose at most 200 exact item references.",
      );
    if (
      new Set(ids).size !== ids.length ||
      new Set(codes).size !== codes.length
    )
      blocked.push({ reason: "DUPLICATE_ITEM_REFERENCE" });
    let masters: any[] = [];
    if (ids.length || codes.length) {
      let query: any = this.db
        .from("items")
        .select("id,code,name,uom,is_active,is_verified,updated_at")
        .eq("tenant_id", scope.tenant);
      query = ids.length ? query.in("id", ids) : query.in("code", codes);
      masters = (await this.checked(query.limit(201))) || [];
      if (masters.length > 200)
        throw new BadRequestException(
          "Ambiguous item references require review.",
        );
      const requested = ids.length ? ids : codes;
      for (const reference of requested)
        if (
          masters.filter(
            (item) => (ids.length ? item.id : item.code) === reference,
          ).length !== 1
        )
          blocked.push({ reference, reason: "ITEM_NOT_FOUND_OR_AMBIGUOUS" });
    }
    const raw = body.inputs || {};
    if (
      typeof raw !== "object" ||
      Array.isArray(raw) ||
      Object.keys(raw).some(
        (key) =>
          !["department", "requiredDate", "quantity", "items"].includes(key),
      ) ||
      (raw.items &&
        (!Array.isArray(raw.items) ||
          raw.items.length > 200 ||
          raw.items.some(
            (line: any) =>
              !line ||
              typeof line !== "object" ||
              Object.keys(line).some(
                (key) => !["itemId", "requestedQty", "uom"].includes(key),
              ),
          )))
    )
      throw new BadRequestException(
        "Only bounded registered PR inputs are allowed.",
      );
    const quantityText = message.match(
      /\b(?:qty|quantity)\s*[:=]?\s*(\d+(?:\.\d+)?)\b(?![\w.,])/i,
    )?.[1];
    const quantity = positiveQuantity(
      raw.quantity ?? (quantityText ? Number(quantityText) : null),
    );
    const departmentText = String(
      raw.department ||
        message.match(/\bdepartment\s*[:=]?\s*(Production|R&D)\b/i)?.[1] ||
        "",
    ).toUpperCase();
    const requiredDate = this.date(
      raw.requiredDate ||
        message.match(
          /\brequired(?: date)?\s*[:=]?\s*(\d{4}-\d{2}-\d{2})\b/i,
        )?.[1],
    );
    const documentSources: any[] = [];
    const documentLines: any[] = [];
    const documentIds = Array.isArray(body.document_ids)
      ? body.document_ids
      : [];
    if (
      documentIds.length > 3 ||
      new Set(documentIds).size !== documentIds.length
    )
      throw new BadRequestException(
        "Choose at most three unique reviewed documents.",
      );
    for (const id of documentIds) {
      const document = await this.documents.get(scope.user, id);
      documentSources.push({ id: document.id, version: document.version });
      if (
        document.review_required ||
        document.extraction.classification_confidence !== "HIGH"
      )
        blocked.push({ document_id: id, reason: "DOCUMENT_REVIEW_REQUIRED" });
      for (const line of document.extraction.lines) {
        const facts = ["source_item_code", "quantity", "uom"].map(
          (field) => line[field],
        );
        if (
          facts.some(
            (fact) => !fact || fact.confidence !== "HIGH" || fact.value == null,
          )
        )
          blocked.push({
            document_id: id,
            reason: "DOCUMENT_CONFIDENCE_REQUIRED",
          });
        else
          documentLines.push({
            code: line.source_item_code.value,
            quantity: line.quantity.value,
            uom: line.uom.value,
          });
      }
    }
    const masterStates = masters
      .sort((left, right) => left.id.localeCompare(right.id))
      .map((item) => ({
        id: item.id,
        code: item.code,
        name: item.name,
        uom: item.uom,
        is_active: item.is_active,
        is_verified: item.is_verified,
        updated_at: item.updated_at ?? null,
      }));
    const items: OperatorInputs["items"] = [];
    for (const item of masterStates) {
      if (item.is_active !== true || item.is_verified !== true)
        blocked.push({
          item_id: item.id,
          reason: "ACTIVE_VERIFIED_MASTER_REQUIRED",
        });
      const documentValues = documentLines.filter(
        (line) => line.code === item.code,
      );
      if (documentValues.length > 1)
        blocked.push({ item_id: item.id, reason: "AMBIGUOUS_DOCUMENT_INPUT" });
      const manual = Array.isArray(raw.items)
        ? raw.items.find((line: any) => line.itemId === item.id)
        : null;
      const uom =
        typeof item.uom === "string" && item.uom.trim()
          ? item.uom.trim()
          : null;
      if (
        (manual?.uom && manual.uom !== uom) ||
        (documentValues[0]?.uom && documentValues[0].uom !== uom)
      )
        blocked.push({ item_id: item.id, reason: "UOM_MASTER_MISMATCH" });
      const explicitQuantity =
        manual?.requestedQty ??
        (masterStates.length === 1 ||
        /\b(?:quantity|qty)\s*[:=]?\s*\d+(?:\.\d+)?\s+each\b/i.test(message)
          ? quantity
          : null);
      items.push({
        itemId: item.id,
        itemCode: item.code,
        itemName: item.name,
        uom,
        requestedQty: positiveQuantity(
          explicitQuantity ?? documentValues[0]?.quantity,
        ),
        evidence: {
          quantity_source:
            explicitQuantity != null
              ? "USER_EXPLICIT"
              : documentValues.length
                ? "REVIEWED_DOCUMENT"
                : "UNKNOWN",
          uom_source: "ERP_MASTER",
          master_checksum: operatorChecksum(item),
        },
      });
      try {
        blocked.push(...(await this.diagnosis(scope, item)));
      } catch {
        blocked.push({
          item_id: item.id,
          reason: "DATA_DOCTOR_EVIDENCE_UNAVAILABLE",
        });
      }
    }
    let relevantFindings: any[] = [];
    if (items.length) {
      relevantFindings =
        (await this.checked(
          this.db
            .from("autoqa_findings")
            .select("id,severity,entity_type,entity_id")
            .eq("tenant_id", scope.tenant)
            .eq("profile", scope.profile)
            .eq("entity_type", "item")
            .in(
              "entity_id",
              items.map((item) => item.itemId),
            )
            .in("severity", ["CRITICAL", "HIGH"])
            .in("status", ["OPEN", "ACKNOWLEDGED"])
            .limit(201),
        )) || [];
      if (relevantFindings.length > 200)
        throw new ServiceUnavailableException(
          "Too many relevant findings for complete validation.",
        );
      blocked.push(
        ...relevantFindings.map((finding) => ({
          item_id: finding.entity_id,
          reason: "RELEVANT_AUTOQA_BLOCK",
          severity: finding.severity,
        })),
      );
    }
    const inputs: OperatorInputs = {
      department: ["PRODUCTION", "R&D"].includes(departmentText)
        ? departmentText
        : null,
      requiredDate,
      items,
    };
    let duplicate = false;
    if (items.length && items.every((line) => line.requestedQty != null)) {
      const result = await this.requisitions.checkDuplicates(
        scope.tenant,
        items,
      );
      duplicate = result.hasDuplicates;
      if (duplicate) blocked.push({ reason: "DUPLICATE_PR_REVIEW_REQUIRED" });
    }
    return {
      inputs,
      master_states: masterStates,
      blocked_rows: blocked,
      context,
      report_state: report
        ? { source, version: report.version, plan: report.plan }
        : null,
      document_sources: documentSources,
      duplicate,
      relevant_findings: relevantFindings
        .map((finding) => ({
          fingerprint: operatorChecksum({
            id: finding.id,
            severity: finding.severity,
            entity_id: finding.entity_id,
          }),
          severity: finding.severity,
          entity_id: finding.entity_id,
        }))
        .sort((left, right) =>
          left.fingerprint.localeCompare(right.fingerprint),
        ),
    };
  }
  async interpret(user: any, body: any) {
    if (
      !operatorFlags().enabled ||
      ["support", "improvement", "status"].includes(body?.support_mode)
    )
      return null;
    const message = String(body?.message || "");
    if (
      classifyAutoEngineerIntent(message, body?.support_mode).intent !==
      "NORMAL_ERP_REQUEST"
    )
      return null;
    if (!operatorIntent(message) && /\b(?:report|dashboard)\b/i.test(message))
      return null;
    if (
      !operatorIntent(message) &&
      !(
        operatorRisk(message) !== "MEDIUM" &&
        /^\s*(?:create|prepare|raise|submit|approve|receive|post|delete|reverse|update|change)\b/i.test(
          message,
        )
      )
    )
      return null;
    return this.createPlan(user, body);
  }
  async createPlan(user: any, body: any) {
    const scope = this.scope(user),
      instruction = String(body?.message || "").trim();
    if (!instruction || instruction.length > 2000)
      throw new BadRequestException("Supply a bounded explicit instruction.");
    if (body.action_key && !(body.action_key in OPERATOR_ACTIONS))
      throw new BadRequestException("UNREGISTERED_ACTION");
    const risk = operatorRisk(instruction);
    const action =
      risk !== "MEDIUM"
        ? "PLAN_ONLY"
        : /\bRFQ|request for quotation\b/i.test(instruction)
          ? "CREATE_DRAFT_RFQ_FROM_PR"
          : "CREATE_DRAFT_PR";
    if (body.action_key && body.action_key !== action)
      throw new BadRequestException("Action does not match the instruction.");
    const request = {
      message: instruction,
      brain_context: body.brain_context || null,
      item_ids: body.item_ids || [],
      item_codes: body.item_codes || [],
      inputs: body.inputs || {},
      report_id: body.report_id || null,
      session_id: body.session_id || null,
      document_ids: body.document_ids || [],
    };
    const evidence: any =
      action === "CREATE_DRAFT_PR"
        ? await this.resolveInputs(scope, request)
        : {
            inputs: { department: null, requiredDate: null, items: [] },
            master_states: [],
            blocked_rows: [],
            context: null,
            report_state: null,
            document_sources: [],
            duplicate: false,
            relevant_findings: [],
          };
    if (action === "CREATE_DRAFT_RFQ_FROM_PR" && body.brain_context) {
      const validated = await this.brain.validateContext(
        scope.user,
        body.brain_context,
      );
      if (validated.context?.entity_type === "purchase_requisition")
        evidence.context = validated.context;
      else evidence.blocked_rows.push({ reason: "PR_CONTEXT_REQUIRED" });
    }
    const preview = draftPrPreview(evidence.inputs, evidence.blocked_rows);
    if (action !== "CREATE_DRAFT_PR") {
      preview.status = "NEEDS_INPUT";
      preview.warnings = [
        risk === "PROTECTED"
          ? "PROTECTED_ACTION_BLOCKED"
          : risk === "HIGH"
            ? "HIGH_RISK_PLAN_ONLY"
            : "SAFE_DRAFT_RFQ_NOT_AVAILABLE",
      ];
    }
    if (action === "CREATE_DRAFT_PR" && !operatorFlags().pr) {
      preview.status = "NEEDS_INPUT";
      preview.warnings.push("PR_ACTION_DISABLED");
    }
    if (preview.status !== "READY_FOR_APPROVAL")
      preview.expected_effects.draft_pr = 0;
    const expires = new Date(Date.now() + 30 * 60 * 1000).toISOString();
    const payload = {
      scope: {
        tenant_id: scope.tenant,
        profile: scope.profile,
        requester_id: scope.owner,
      },
      instruction,
      action_key: action,
      risk,
      request,
      ...evidence,
      resolved_entities: evidence.master_states.map((item: any) => ({
        entity_type: "item",
        entity_id: item.id,
        code: item.code,
        name: item.name,
        source: "LIVE_ERP_MASTER",
      })),
      ...preview,
      build_sha: this.buildSha,
      expires_at: expires,
    };
    const checksum = operatorChecksum(payload);
    const plan = await this.checked(
      this.db.rpc("mizantra_operator_create_plan", {
        p_tenant: scope.tenant,
        p_profile: scope.profile,
        p_user: scope.owner,
        p_action: action,
        p_risk: risk,
        p_status: preview.status,
        p_payload: payload,
        p_checksum: checksum,
        p_build: this.buildSha,
        p_expiry: expires,
        p_replaces: body.replaces_plan_id || null,
      }),
    );
    return this.reply(plan);
  }
  private reply(plan: any) {
    return {
      status: "ACTION_OPERATOR_PLAN",
      intent_type: "ACTION_OPERATOR",
      provider: "MIZANTRA_ACTION_OPERATOR_V1",
      extracted: {},
      resolved: {},
      questions: plan.payload.warnings || [],
      context_token: "",
      assistant_message: `MIZANTRA ACTION PLAN\n${plan.action_key.replaceAll("_", " ")}\nLines: ${plan.payload.inputs.items.length}\n${plan.payload.warnings.join("\n")}`,
      action_operator_plan: plan,
      safety: {
        read_only: plan.status !== "COMPLETED",
        executable: false,
        explicit_approval_required: true,
        autonomous_execution: false,
      },
    };
  }
  async get(user: any, id: string) {
    const scope = this.scope(user);
    if (!uuid.test(id || ""))
      throw new BadRequestException("Invalid plan reference.");
    const plan = await this.checked(
      this.db
        .from("mizantra_action_plans")
        .select("*")
        .eq("id", id)
        .eq("tenant_id", scope.tenant)
        .eq("profile", scope.profile)
        .eq("requester_id", scope.owner)
        .maybeSingle(),
    );
    if (!plan)
      throw new NotFoundException("Plan is not available in your scope.");
    if (operatorChecksum(plan.payload) !== plan.checksum)
      throw new ConflictException("PLAN_CHANGED_REVIEW_REQUIRED");
    if (
      plan.payload.scope.tenant_id !== plan.tenant_id ||
      plan.payload.scope.profile !== plan.profile ||
      plan.payload.scope.requester_id !== plan.requester_id ||
      plan.payload.action_key !== plan.action_key ||
      plan.payload.risk !== plan.risk ||
      plan.payload.build_sha !== plan.build_sha ||
      Date.parse(plan.payload.expires_at) !== Date.parse(plan.expires_at)
    )
      throw new ConflictException("PLAN_CHANGED_REVIEW_REQUIRED");
    if (
      Date.parse(plan.expires_at) <= Date.now() &&
      ![
        "COMPLETED",
        "PARTIALLY_COMPLETED",
        "FAILED",
        "CANCELLED",
        "EXPIRED",
      ].includes(plan.status)
    ) {
      const expired = await this.checked(
        this.db.rpc("mizantra_operator_transition", {
          p_id: plan.id,
          p_tenant: scope.tenant,
          p_profile: scope.profile,
          p_user: scope.owner,
          p_checksum: plan.checksum,
          p_build: plan.build_sha,
          p_event: "EXPIRE",
          p_evidence: {},
        }),
      );
      return expired.plan;
    }
    return plan;
  }
  async list(user: any) {
    const scope = this.scope(user);
    return this.checked(
      this.db
        .from("mizantra_action_plans")
        .select("id,action_key,risk,status,expires_at,created_at")
        .eq("tenant_id", scope.tenant)
        .eq("profile", scope.profile)
        .eq("requester_id", scope.owner)
        .order("created_at", { ascending: false })
        .limit(30),
    );
  }
  private binding(plan: any, body: any) {
    if (
      body.checksum !== plan.checksum ||
      body.build_sha !== plan.build_sha ||
      body.action_key !== plan.action_key ||
      body.expires_at !== plan.expires_at
    )
      throw new ConflictException("PLAN_CHANGED_REVIEW_REQUIRED");
    if (plan.build_sha !== this.buildSha)
      throw new ConflictException("PLAN_CHANGED_REVIEW_REQUIRED");
    if (Date.parse(plan.expires_at) <= Date.now())
      throw new ConflictException("PLAN_EXPIRED");
  }
  private async transition(
    scope: Scope,
    plan: any,
    event: string,
    evidence: any = {},
  ) {
    const result = await this.checked(
      this.db.rpc("mizantra_operator_transition", {
        p_id: plan.id,
        p_tenant: scope.tenant,
        p_profile: scope.profile,
        p_user: scope.owner,
        p_checksum: plan.checksum,
        p_build: this.buildSha,
        p_event: event,
        p_evidence: evidence,
      }),
    );
    if (result.plan.status === "EXPIRED")
      throw new ConflictException("PLAN_EXPIRED");
    return result;
  }
  async approve(user: any, id: string, body: any) {
    const scope = this.scope(user),
      plan = await this.get(user, id);
    this.executionPermission(scope);
    this.binding(plan, body);
    if (
      body.confirm !== true ||
      plan.action_key !== "CREATE_DRAFT_PR" ||
      plan.risk !== "MEDIUM"
    )
      throw new ForbiddenException(
        "Explicit approval is required for this exact registered draft action.",
      );
    return (
      await this.transition(scope, plan, "APPROVE", {
        checksum: plan.checksum,
        build_sha: plan.build_sha,
        expires_at: plan.expires_at,
        action: plan.action_key,
      })
    ).plan;
  }
  async execute(user: any, id: string, body: any) {
    const scope = this.scope(user),
      plan = await this.get(user, id);
    this.executionPermission(scope);
    if (plan.status === "COMPLETED") {
      if (
        body.checksum !== plan.checksum ||
        body.build_sha !== plan.build_sha ||
        body.action_key !== plan.action_key ||
        body.expires_at !== plan.expires_at
      )
        throw new ConflictException("PLAN_CHANGED_REVIEW_REQUIRED");
      return plan;
    }
    this.binding(plan, body);
    if (
      plan.action_key !== "CREATE_DRAFT_PR" ||
      plan.risk !== "MEDIUM" ||
      !["APPROVED", "EXECUTING"].includes(plan.status)
    )
      throw new ForbiddenException("EXPLICIT_APPROVAL_REQUIRED");
    const current = await this.resolveInputs(scope, plan.payload.request);
    const prior = Object.fromEntries(
      Object.keys(current).map((key) => [key, plan.payload[key]]),
    );
    if (
      current.blocked_rows.length ||
      operatorChecksum(current) !== operatorChecksum(prior)
    )
      throw new ConflictException("PLAN_CHANGED_REVIEW_REQUIRED");
    this.executionPermission(scope);
    const claim = await this.transition(scope, plan, "CLAIM");
    if (!claim.claimed && claim.plan.status !== "EXECUTING") return claim.plan;
    try {
      await this.requisitions.create(
        scope.tenant,
        scope.owner,
        {
          ...current.inputs,
          status: "DRAFT",
          purpose: plan.payload.instruction,
          remarks: `Mizantra action plan ${plan.id}`,
          items: current.inputs.items.map((line) => ({
            itemId: line.itemId,
            itemCode: line.itemCode,
            itemName: line.itemName,
            requestedQty: line.requestedQty,
            uom: line.uom,
            requiredDate: current.inputs.requiredDate,
          })),
        },
        {
          planId: plan.id,
          checksum: plan.checksum,
          profile: scope.profile,
          buildSha: this.buildSha,
          revalidate: async () => {
            this.executionPermission(scope);
            const final = await this.resolveInputs(scope, plan.payload.request);
            if (
              final.blocked_rows.length ||
              operatorChecksum(final) !== operatorChecksum(prior) ||
              Date.parse(plan.expires_at) <= Date.now()
            )
              throw new ConflictException("PLAN_CHANGED_REVIEW_REQUIRED");
          },
        },
      );
      const completed = await this.get(user, id);
      if (
        completed.status !== "COMPLETED" ||
        completed.result?.status !== "DRAFT" ||
        completed.result?.line_count !== current.inputs.items.length
      )
        throw new Error("DRAFT_VERIFICATION_FAILED");
      return completed;
    } catch (error) {
      const currentPlan = await this.get(user, id);
      if (currentPlan.status === "COMPLETED") return currentPlan;
      const businessFailure =
        error instanceof BadRequestException ||
        error instanceof ForbiddenException ||
        error instanceof ConflictException;
      const failure = {
        code: businessFailure
          ? "PLAN_CHANGED_REVIEW_REQUIRED"
          : "EXECUTION_SOFTWARE_FAILURE",
        autoengineer_handoff: businessFailure
          ? null
          : {
              offered: true,
              plan_id: plan.id,
              build_sha: this.buildSha,
              patch_during_execution: false,
            },
      };
      return (await this.transition(scope, currentPlan, "FAIL", failure)).plan;
    }
  }
  async cancel(user: any, id: string, body: any) {
    const scope = this.scope(user),
      plan = await this.get(user, id);
    if (body.checksum !== plan.checksum)
      throw new ConflictException("PLAN_CHANGED_REVIEW_REQUIRED");
    return this.transition(scope, plan, "CANCEL");
  }
}
