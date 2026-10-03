import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
} from "@nestjs/common";
import { createClient } from "@supabase/supabase-js";
import { randomUUID } from "node:crypto";
import { hasAdminBypass, hasPermission } from "../auth/utils/permission-utils";
import { PurchaseOrdersService } from "../purchase/services/purchase-orders.service";
import { BrainService } from "./brain.service";
import { DataDoctorService } from "./data-doctor.service";
import {
  availableDatasets,
  canSeeField,
  interpretReport,
  REPORT_DATASETS,
  ReportPlan,
  validateReportPlan,
} from "./reporting.registry";
import {
  evaluateReport,
  pageReport,
  reportNumber,
  ReportRow,
  REPORT_SOURCE_LIMIT,
  reportWorkbook,
  reportCalendarDay,
  reportDateBoundary,
} from "./reporting.engine";
type Scope = {
  tenant: string;
  profile: string;
  owner: string;
  timeZone: string;
  user: any;
};
type DiscoveryDataset = {
  key: string;
  label: string;
  category: string;
  fields: Array<{
    key: string;
    label: string;
    type: string;
    filters?: boolean;
    grouping?: boolean;
    aggregation?: boolean;
  }>;
  measures: Array<{ key: string; label: string }>;
  explanation: string;
};
const uuid =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const metadataTable = "mizantra_reporting_definitions";
const auditTable = "mizantra_reporting_audit";

@Injectable()
export class ReportingService {
  private readonly db = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_KEY!,
  );
  private readonly logger = new Logger(ReportingService.name);
  private readonly recent: Array<{
    tenant: string;
    profile: string;
    duration: number;
    error: boolean;
  }> = [];
  private readonly running = new Map<string, number>();
  constructor(
    private readonly orders: PurchaseOrdersService,
    private readonly brain: BrainService,
    private readonly doctor: DataDoctorService,
  ) {}
  private scope(user: any, dashboard = false): Scope {
    const tenant = String(user?.tenantId || ""),
      owner = String(user?.userId || user?.id || ""),
      profile = String(process.env.ERP_TENANT_PROFILE || "").toUpperCase();
    if (
      !uuid.test(tenant) ||
      !uuid.test(owner) ||
      !["SAIFSEAS", "MIZANTRA", "ARWA"].includes(profile)
    )
      throw new ForbiddenException(
        "Authenticated reporting scope is required.",
      );
    if (
      process.env.MIZANTRA_REPORT_BUILDER_ENABLED !== "true" ||
      (dashboard && process.env.MIZANTRA_DASHBOARD_BUILDER_ENABLED !== "true")
    )
      throw new ForbiddenException("Reporting is not enabled.");
    if (!hasPermission(user, "reports:read"))
      throw new ForbiddenException("Report access is required.");
    let timeZone = String(user.timezone || process.env.ERP_TIMEZONE || "UTC");
    try {
      new Intl.DateTimeFormat("en", { timeZone }).format();
    } catch {
      timeZone = "UTC";
    }
    return { tenant, profile, owner, timeZone, user };
  }
  configuration(user: any) {
    const enabled =
      process.env.MIZANTRA_REPORT_BUILDER_ENABLED === "true" &&
      hasPermission(user, "reports:read");
    if (!enabled)
      return {
        enabled: false,
        dashboard_enabled: false,
        categories: [],
        datasets: [] as DiscoveryDataset[],
      };
    const scope = this.scope(user);
    const datasets = availableDatasets(user, scope.profile).map(
      ([key, dataset]) => ({
        key,
        label: dataset.label,
        category: dataset.category,
        fields: Object.entries(dataset.fields)
          .filter(([, field]) => canSeeField(user, field))
          .map(([key, field]) => ({
            key,
            label: field.label,
            type: field.type,
            filters: field.filter,
            grouping: field.group,
            aggregation: field.aggregate,
          })),
        measures: Object.entries(dataset.measures)
          .filter(
            ([, measure]) =>
              !measure.field ||
              canSeeField(user, dataset.fields[measure.field]),
          )
          .map(([key, measure]) => ({ key, label: measure.label })),
        explanation: dataset.explanation,
      }),
    );
    return {
      enabled: true,
      dashboard_enabled:
        process.env.MIZANTRA_DASHBOARD_BUILDER_ENABLED === "true",
      can_share: hasPermission(user, "reports:share"),
      can_export: hasPermission(user, "reports:download"),
      admin: hasAdminBypass(user),
      profile: scope.profile,
      tenant_id: scope.tenant,
      current_user_id: scope.owner,
      timezone: scope.timeZone,
      categories: [...new Set(datasets.map((dataset) => dataset.category))],
      datasets,
      limits: {
        source_rows: REPORT_SOURCE_LIMIT,
        page_rows: 100,
        result_rows: 20000,
        execution_seconds: 30,
      },
    };
  }
  private plan(input: any, scope: Scope) {
    try {
      return validateReportPlan(input, scope.user, scope.profile);
    } catch (error) {
      throw new BadRequestException((error as Error).message);
    }
  }
  private rejectScopeInput(body: any) {
    if (
      body &&
      [
        "tenant_id",
        "tenantId",
        "profile",
        "owner",
        "user_id",
        "sql",
        "table",
        "where",
      ].some((key) => Object.prototype.hasOwnProperty.call(body, key))
    )
      throw new ForbiddenException("Report scope is server-controlled.");
  }
  private definitionQuery(scope: Scope) {
    return this.db
      .from(metadataTable)
      .select("id,kind,title,definition,owner_id,shared,updated_at")
      .eq("tenant_id", scope.tenant)
      .eq("profile", scope.profile);
  }
  private async definition(scope: Scope, id: string, kind?: string) {
    if (!uuid.test(id || ""))
      throw new BadRequestException("Invalid saved definition reference.");
    const { data, error } = await this.definitionQuery(scope)
      .eq("id", id)
      .maybeSingle();
    if (error)
      throw new ServiceUnavailableException(
        "Reporting definitions are unavailable.",
      );
    if (
      !data ||
      (kind && data.kind !== kind) ||
      (data.owner_id !== scope.owner &&
        !(data.kind === "REPORT" && data.shared))
    )
      throw new NotFoundException("Definition is not available in your scope.");
    return data;
  }
  private async store(
    scope: Scope,
    kind: string,
    title: string,
    definition: unknown,
    id = randomUUID(),
    shared = false,
  ) {
    if (typeof title !== "string" || !title.trim() || title.length > 120)
      throw new BadRequestException(
        "A title of up to 120 characters is required.",
      );
    const { data, error } = await this.db
      .from(metadataTable)
      .upsert({
        id,
        tenant_id: scope.tenant,
        profile: scope.profile,
        owner_id: scope.owner,
        kind,
        title: title.trim(),
        definition,
        shared,
        updated_at: new Date().toISOString(),
      })
      .select("id,kind,title,definition,shared,updated_at")
      .single();
    if (error)
      throw new ServiceUnavailableException(
        "Reporting metadata could not be saved.",
      );
    return data;
  }
  private async audit(
    scope: Scope,
    event: string,
    plan: ReportPlan | null,
    duration = 0,
    rowCount = 0,
  ) {
    const { error } = await this.db.from(auditTable).insert({
      tenant_id: scope.tenant,
      profile: scope.profile,
      user_id: scope.owner,
      event,
      dataset: plan?.dataset || null,
      semantic_plan: plan,
      duration_ms: duration,
      row_count: rowCount,
    });
    if (error)
      throw new ServiceUnavailableException(
        "Reporting audit metadata is unavailable.",
      );
    this.logger.log(
      JSON.stringify({
        event: `REPORT_${event}`,
        user: scope.owner,
        tenant: scope.tenant,
        profile: scope.profile,
        dataset: plan?.dataset || null,
        duration_ms: duration,
        row_count: rowCount,
      }),
    );
  }
  async workingContext(user: any, id: string, kind = 'SESSION') {
    const scope = this.scope(user, kind === 'DASHBOARD');
    const stored = await this.definition(scope, id, kind);
    return kind === 'DASHBOARD' ? { id: stored.id, kind } : { id: stored.id, kind, plan: this.plan(stored.definition, scope) };
  }
  async oldestContext(user: any, sessionId: string) {
    const scope = this.scope(user);
    const stored = await this.definition(scope, sessionId, 'SESSION');
    const original = this.plan(stored.definition, scope);
    if (original.dataset !== 'PURCHASE_ORDERS' || original.grouping.length || original.aggregations.length)
      throw new BadRequestException('Select an ungrouped PO report before opening a record.');
    const plan = this.plan({ ...original, columns: ['po_id','po_number','po_date'], sort: [{field:'po_date',direction:'asc'},{field:'po_id',direction:'asc'}], limit:1 }, scope);
    const result = await this.run(scope, plan, 1, 1);
    const row = result.rows[0];
    if (!row || !uuid.test(String(row.po_id || '')) || !Number.isFinite(Date.parse(String(row.po_date || ''))))
      throw new BadRequestException('No dated authorized PO is available in this report. Select a record explicitly.');
    return { profile:scope.profile,tenant_id:scope.tenant,current_user_id:scope.owner,entity_type:'purchase_order',entity_id:String(row.po_id),current_route:'/dashboard/purchase/orders',locale:'en' };
  }
  async contextualHistory(user: any, context: any, options: {openOnly?: boolean} = {}) {
    const scope = this.scope(user);
    const filter = await this.brain.withDiagnosticEvidence(user, context, async evidence => {
      const root = evidence.nodes[0];
      if (root.type === 'item') return { field: 'item_id', operator: 'eq' as const, value: String(root.row.id) };
      if (root.type === 'supplier') return { field: 'supplier_id', operator: 'eq' as const, value: String(root.row.id) };
      const order = root.type === 'purchase_order' ? root : evidence.nodes.find(node => node.type === 'purchase_order' && node.row.id === root.row.po_id);
      if (order?.row.vendor_id && evidence.canRead('supplier')) return { field: 'supplier_id', operator: 'eq' as const, value: String(order.row.vendor_id) };
      const ids = [...new Set(evidence.nodes.filter(node => ['purchase_order_item','purchase_requisition_item'].includes(node.type)).map(node => String(node.row.item_id || '')).filter(value => uuid.test(value)))];
      if (!ids.length) throw new BadRequestException('Select an authorized item or supplier for related purchase history.');
      return { field: 'item_id', operator: 'in' as const, value: ids };
    });
    const base = interpretReport('Show all POs').plan!;
    const plan = this.plan({ ...base, filters: [filter, ...(options.openOnly ? [{field:'open_state',operator:'eq' as const,value:'OPEN'}] : [])], title: options.openOnly ? 'Related open purchase orders' : 'Related purchase history', columns: base.columns.filter(key => canSeeField(user, REPORT_DATASETS.PURCHASE_ORDERS.fields[key])) }, scope);
    const result = await this.query(user, { plan, create_session: true });
    return { status: 'REPORT_READY', session_id: result.session_id, report: result, assistant_message: plan.title, safety: { read_only: true, executable: false } };
  }
  async documentHistory(user: any, documents: Array<{ extraction: any; review_required: boolean }>) {
    const scope = this.scope(user);
    if (!hasPermission(user, 'items:read')) throw new ForbiddenException('Item access is required for document purchase history.');
    if (documents.some(document => document.review_required || document.extraction.classification_confidence !== 'HIGH')) throw new BadRequestException('Review document extraction before selecting items for purchase history.');
    const codes = [...new Set(documents.flatMap(document => document.extraction.lines.map((line: any) => line.source_item_code).filter((fact: any) => fact?.value && fact.confidence === 'HIGH' && fact.method === 'HUMAN_REVIEW').map((fact: any) => String(fact.value))))];
    if (!codes.length || codes.length > 200) throw new BadRequestException('Select reviewed document lines with explicit item codes.');
    const controller = new AbortController(), timer = setTimeout(() => controller.abort(), 5000);
    let itemIds: string[];
    try {
      const masters = await this.read(scope, 'items', 'id,code', controller.signal, query => query.in('code', codes).eq('is_active', true));
      if (codes.some(code => masters.filter(item => item.code === code).length !== 1)) throw new BadRequestException('Some document codes are missing or ambiguous in active item masters. Select exact ERP items.');
      itemIds = masters.map(item => String(item.id));
    } finally { clearTimeout(timer); controller.abort(); }
    const base = interpretReport('Show all POs').plan!;
    const plan = this.plan({ ...base, filters: [{ field: 'item_id', operator: 'in', value: itemIds }], title: 'Document item purchase history', columns: base.columns.filter(key => canSeeField(user, REPORT_DATASETS.PURCHASE_ORDERS.fields[key])) }, scope);
    const result = await this.query(user, { plan, create_session: true });
    return { status: 'REPORT_READY', session_id: result.session_id, report: result, assistant_message: plan.title, safety: { read_only: true, executable: false } };
  }
  async interpret(user: any, body: any) {
    this.rejectScopeInput(body);
    const scope = this.scope(user);
    const previous = body.session_id
      ? this.plan(
          (await this.definition(scope, body.session_id, "SESSION")).definition,
          scope,
        )
      : undefined;
    let context: any;
    if (body.brain_context) {
      const validated = await this.brain.validateContext(
        user,
        body.brain_context,
      );
      if (!validated.enabled || !validated.context)
        throw new ForbiddenException("Validated Brain context is required.");
      context = validated.context;
    }
    let understood: ReturnType<typeof interpretReport>;
    try {
      understood = interpretReport(
        String(body.message || ""),
        previous,
        context,
        new Date(),
        scope.timeZone,
        process.env.ERP_FINANCIAL_YEAR_START,
      );
    } catch (error) {
      throw new BadRequestException((error as Error).message);
    }
    if (understood.clarification)
      return {
        status: "REPORT_CLARIFICATION",
        intent: "ask",
        intent_type: "REPORT_QUERY",
        provider: "DETERMINISTIC_REPORT_BUILDER_V1",
        executable: false,
        questions: [understood.clarification],
        summary: understood.clarification,
        session_id: body.session_id || null,
      };
    if (understood.action === "DISCOVER")
      return {
        status: "REPORT_DISCOVERY",
        ...this.configuration(user),
        session_id: body.session_id || null,
      };
    if (understood.action === "CREATE_DASHBOARD") {
      const requests = /purchas/i.test(understood.name || "")
        ? [
            "Show open PO value as KPI",
            "Show overdue PO count as KPI",
            "Show monthly purchase value for the last 12 months",
            "Top 10 suppliers by purchase value",
          ]
        : /inventory/i.test(understood.name || "")
          ? [
              "Show items count as KPI",
              "Show items grouped by type",
              "Show raw materials below reorder level",
            ]
          : [];
      const plans = requests.map((message) =>
        this.plan(
          interpretReport(
            message,
            undefined,
            undefined,
            new Date(),
            scope.timeZone,
          ).plan,
          scope,
        ),
      );
      const widgets: Array<{ id: string; report_id: string; width: string }> =
        [];
      for (const plan of plans) {
        const report = await this.saveReport(user, {
          title: plan.title + " " + plan.aggregations.join(" "),
          plan,
        });
        widgets.push({
          id: randomUUID(),
          report_id: report.id,
          width: plan.visualization === "KPI" ? "half" : "full",
        });
      }
      return {
        status: "DASHBOARD_SAVED",
        dashboard: await this.saveDashboard(user, {
          title: understood.name || "My Dashboard",
          widgets,
        }),
      };
    }
    if (understood.action) {
      if (!previous)
        throw new BadRequestException("Create or select a report first.");
      if (understood.action === "EXPLAIN")
        return {
          status: "REPORT_EXPLANATION",
          summary: REPORT_DATASETS[previous.dataset].explanation,
          session_id: body.session_id,
        };
      if (understood.action === "SAVE")
        return {
          status: "REPORT_SAVED",
          saved_report: await this.saveReport(user, {
            title: understood.name || previous.title,
            plan: previous,
          }),
          session_id: body.session_id,
        };
      if (understood.action === "DASHBOARD") {
        const report = await this.saveReport(user, {
          title: previous.title,
          plan: previous,
        });
        const dashboards = await this.list(user, "DASHBOARD");
        const dashboard = dashboards.find(
          (row: any) => row.owner_id === scope.owner,
        );
        const widgets = dashboard?.definition?.widgets || [];
        return {
          status: "DASHBOARD_SAVED",
          dashboard: await this.saveDashboard(user, {
            id: dashboard?.id,
            title: dashboard?.title || "My Dashboard",
            widgets: [
              ...widgets,
              { id: randomUUID(), report_id: report.id, width: "full" },
            ],
          }),
          session_id: body.session_id,
        };
      }
      return {
        status: "REPORT_EXPORT_READY",
        session_id: body.session_id,
        plan: previous,
      };
    }
    let candidate = understood.plan!;
    if (!previous)
      candidate.columns = candidate.columns.filter(
        (key) =>
          REPORT_DATASETS[candidate.dataset].fields[key] &&
          canSeeField(user, REPORT_DATASETS[candidate.dataset].fields[key]),
      );
    const plan = this.plan(candidate, scope);
    const result = await this.run(
      scope,
      plan,
      Number(body.page || 1),
      Number(body.page_size || 50),
    );
    const session = await this.store(
      scope,
      "SESSION",
      plan.title,
      plan,
      body.session_id,
    );
    return {
      status: "REPORT_READY",
      intent: "ask",
      intent_type: "REPORT_QUERY",
      provider: "DETERMINISTIC_REPORT_BUILDER_V1",
      executable: false,
      summary: plan.title,
      session_id: session.id,
      report: {
        ...result,
        plan,
        explanation: REPORT_DATASETS[plan.dataset].explanation,
        generated_at: new Date().toISOString(),
      },
      safety: { business_writes: false, semantic_only: true },
    };
  }
  async query(user: any, body: any) {
    this.rejectScopeInput(body);
    const scope = this.scope(user);
    const session = body.session_id
      ? await this.definition(scope, body.session_id, "SESSION")
      : undefined;
    const plan = body.report_id
      ? this.plan(
          (await this.definition(scope, body.report_id, "REPORT")).definition,
          scope,
        )
      : this.plan(body.plan || session?.definition, scope);
    const result = await this.run(
      scope,
      plan,
      Number(body.page || 1),
      Number(body.page_size || 50),
    );
    const storedSession =
      body.create_session || (session && body.plan)
        ? await this.store(scope, "SESSION", plan.title, plan, session?.id)
        : session;
    return {
      ...result,
      session_id: storedSession?.id,
      plan,
      explanation: REPORT_DATASETS[plan.dataset].explanation,
      generated_at: new Date().toISOString(),
    };
  }
  async actionItems(user: any, source: { report_id?: string; session_id?: string; below_reorder?: boolean }) {
    const scope = this.scope(user);
    const stored = source.report_id
      ? (await this.definition(scope, source.report_id, 'REPORT')).definition
      : source.session_id
        ? (await this.definition(scope, source.session_id, 'SESSION')).definition
        : source.below_reorder ? interpretReport('Show raw materials below reorder level').plan : null;
    const original = this.plan(stored, scope);
    if (original.dataset !== 'ITEMS' || original.grouping.length || original.aggregations.length)
      throw new BadRequestException('Select an ungrouped item report for draft PR planning.');
    const plan = this.plan({ ...original, columns: [...new Set([...original.columns, 'item_id', 'uom'])] }, scope);
    const result = await this.run(scope, plan, 1, 100, true);
    if (result.result_rows > 200) throw new BadRequestException('Narrow the report to at most 200 items before planning.');
    const itemIds = result.rows.map(row => String(row.item_id || ''));
    if (itemIds.some(id => !uuid.test(id)) || new Set(itemIds).size !== itemIds.length)
      throw new BadRequestException('Report does not contain unique authoritative item references.');
    return { item_ids: itemIds, version: result.version, plan };
  }
  async export(user: any, body: any) {
    this.rejectScopeInput(body);
    const scope = this.scope(user);
    if (!hasPermission(user, "reports:download"))
      throw new ForbiddenException("Report export permission is required.");
    const plan = body.report_id
      ? this.plan(
          (await this.definition(scope, body.report_id, "REPORT")).definition,
          scope,
        )
      : this.plan(
          body.plan ||
            (await this.definition(scope, body.session_id, "SESSION"))
              .definition,
          scope,
        );
    const result = await this.run(scope, plan, 1, 100, true);
    if (typeof body.version !== "string" || result.version !== body.version)
      throw new ConflictException(
        "Report changed since the preview. Refresh before exporting.",
      );
    await this.audit(scope, "EXPORT", plan, 0, result.result_rows);
    return reportWorkbook(plan, result);
  }
  private async run(
    scope: Scope,
    plan: ReportPlan,
    page: number,
    pageSize: number,
    complete = false,
  ) {
    const key = `${scope.tenant}:${scope.owner}`;
    if ((this.running.get(key) || 0) >= 2 || this.running.size >= 100)
      throw new ServiceUnavailableException(
        "Reporting capacity is busy. Try again shortly.",
      );
    this.running.set(key, (this.running.get(key) || 0) + 1);
    const started = Date.now();
    let failed = false;
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout>;
    try {
      const rows = await Promise.race([
        this.sourceRows(scope, plan, controller.signal),
        new Promise<ReportRow[]>((_, reject) => {
          timer = setTimeout(() => {
            controller.abort();
            reject(
              new ServiceUnavailableException(
                "Report timed out. Narrow the filters.",
              ),
            );
          }, 30000);
        }),
      ]);
      const result = evaluateReport(plan, rows);
      const paged = pageReport(result, page, pageSize);
      await this.audit(
        scope,
        "QUERY",
        plan,
        Date.now() - started,
        result.result_rows,
      );
      return complete ? result : paged;
    } catch (error) {
      failed = true;
      throw error;
    } finally {
      clearTimeout(timer!);
      controller.abort();
      const active = (this.running.get(key) || 1) - 1;
      if (active) this.running.set(key, active);
      else this.running.delete(key);
      this.recent.push({
        tenant: scope.tenant,
        profile: scope.profile,
        duration: Date.now() - started,
        error: failed,
      });
      if (this.recent.length > 1000) this.recent.shift();
    }
  }
  private async read(
    scope: Scope,
    table: string,
    columns: string,
    signal: AbortSignal,
    configure?: (query: any) => any,
    parent?: string,
  ) {
    const rows: any[] = [];
    for (let offset = 0; offset <= REPORT_SOURCE_LIMIT; offset += 500) {
      if (signal.aborted)
        throw new ServiceUnavailableException("Report timed out.");
      let query: any = this.db
        .from(table)
        .select(
          parent
            ? `${columns},report_parent:${parent}!inner(tenant_id)`
            : columns,
        )
        .eq(parent ? "report_parent.tenant_id" : "tenant_id", scope.tenant)
        .order("id", { ascending: true })
        .range(offset, offset + 499)
        .abortSignal(signal);
      if (configure) query = configure(query);
      const { data, error } = await query;
      if (error)
        throw new ServiceUnavailableException(
          "Complete authorized reporting evidence is unavailable.",
        );
      rows.push(...(data || []));
      if (rows.length > REPORT_SOURCE_LIMIT)
        throw new BadRequestException(
          "Report exceeds the safe source limit. Narrow its filters.",
        );
      if ((data || []).length < 500) return rows;
    }
    throw new BadRequestException(
      "Report source limit reached. Narrow its filters.",
    );
  }
  private async sourceRows(
    scope: Scope,
    plan: ReportPlan,
    signal: AbortSignal,
  ): Promise<ReportRow[]> {
    const dateFilters = (field: string) => (query: any) => {
      for (const filter of plan.filters.filter(
        (filter) =>
          filter.field === REPORT_DATASETS[plan.dataset].dateField &&
          ["gte", "lte", "eq"].includes(filter.operator),
      )) {
        const value = String(filter.value);
        const nextDay = new Date(Date.parse(value) + 86400000)
          .toISOString()
          .slice(0, 10);
        const start =
          field === "created_at"
            ? reportDateBoundary(value, scope.timeZone)
            : value;
        const end =
          field === "created_at"
            ? reportDateBoundary(nextDay, scope.timeZone)
            : nextDay;
        query =
          filter.operator === "gte"
            ? query.gte(field, start)
            : filter.operator === "lte"
              ? query.lt(field, end)
              : query.gte(field, start).lt(field, end);
      }
      return query;
    };
    const read = (
      table: string,
      columns: string,
      configure?: (query: any) => any,
      parent?: string,
    ) => this.read(scope, table, columns, signal, configure, parent);
    const related = async (
      table: string,
      columns: string,
      field: string,
      references: string[],
      parent?: string,
    ) => {
      const identifiers = [...new Set(references.filter(Boolean))];
      const rows: any[] = [];
      for (let index = 0; index < identifiers.length; index += 100) {
        rows.push(
          ...(await read(
            table,
            columns,
            (query) => query.in(field, identifiers.slice(index, index + 100)),
            parent,
          )),
        );
        if (rows.length > REPORT_SOURCE_LIMIT)
          throw new BadRequestException(
            "Related reporting evidence exceeds the safe limit. Narrow the filters.",
          );
      }
      return rows;
    };
    const map = (rows: any[]) => new Map(rows.map((row) => [row.id, row]));
    const value = (input: unknown) => (input == null ? null : String(input));
    if (plan.dataset === "PURCHASE_ORDERS") {
      const pricing = canSeeField(
        scope.user,
        REPORT_DATASETS.PURCHASE_ORDERS.fields.unit_price,
      );
      const headers = await read(
        "purchase_orders",
        `id,po_number,po_date,vendor_id,pr_id,status,created_by,delivery_date${pricing ? ",terms_and_conditions,total_amount" : ""}`,
        dateFilters("po_date"),
      );
      const ids = headers.map((row) => row.id);
      if (!ids.length) return [];
      const [lines, vendors, users, requisitions] = await Promise.all([
        related(
          "purchase_order_items",
          `id,po_id,item_id,item_code,item_name,uom,ordered_qty,delivery_date,pr_item_id${pricing ? ",rate,amount" : ""}`,
          "po_id",
          ids,
          "purchase_orders",
        ),
        hasPermission(scope.user, "vendors:read")
          ? related(
              "vendors",
              "id,name",
              "id",
              headers.map((row) => row.vendor_id),
            )
          : [],
        related(
          "users",
          "id,first_name,last_name,username",
          "id",
          headers.map((row) => row.created_by),
        ),
        hasPermission(scope.user, "purchase_requisitions:read")
          ? related(
              "purchase_requisitions",
              "id,pr_number,required_date",
              "id",
              headers.map((row) => row.pr_id),
            )
          : [],
      ]);
      const items = hasPermission(scope.user, "items:read")
        ? await related(
            "items",
            "id,code,name,uom",
            "id",
            lines.map((row) => row.item_id),
          )
        : [];
      const receiptRows: any[] = [];
      for (let index = 0; index < ids.length; index += 100) {
        if (signal.aborted)
          throw new ServiceUnavailableException("Report timed out.");
        receiptRows.push(
          ...(await this.orders.reportingReceiptEvidence(
            scope.tenant,
            ids.slice(index, index + 100),
            signal,
          )),
        );
      }
      const receiptMap = map(receiptRows),
        headerMap = map(headers),
        vendorMap = map(vendors),
        userMap = map(users),
        prMap = map(requisitions),
        itemMap = map(items);
      const dayParts = new Intl.DateTimeFormat("en-CA", {
        timeZone: scope.timeZone,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }).formatToParts(new Date());
      const dayPart = (key: string) =>
        dayParts.find((part) => part.type === key)!.value;
      const today = Date.parse(
        `${dayPart("year")}-${dayPart("month")}-${dayPart("day")}T00:00:00Z`,
      );
      return lines
        .filter((line) => headerMap.has(line.po_id))
        .map((line) => {
          const header = headerMap.get(line.po_id),
            receipt = receiptMap.get(line.po_id),
            fact = receipt?.lines.find((row: any) => row.id === line.id);
          if (!fact)
            throw new ServiceUnavailableException(
              "Complete line receipt evidence is unavailable.",
            );
          let currency: string | null = null;
          if (pricing && typeof header.terms_and_conditions === "string") {
            try {
              const candidate = JSON.parse(
                header.terms_and_conditions,
              ).supplierCurrency;
              if (typeof candidate === "string" && /^[A-Z]{3}$/.test(candidate))
                currency = candidate;
            } catch {}
          }
          const rate = pricing ? reportNumber(line.rate) : null,
            open = reportNumber(fact.open_qty),
            ordered = reportNumber(fact.ordered_qty);
          const delivery = value(line.delivery_date || header.delivery_date);
          const promised = delivery
            ? Date.parse(delivery.slice(0, 10) + "T00:00:00Z")
            : NaN;
          const buyer = userMap.get(header.created_by);
          const item = itemMap.get(line.item_id);
          return {
            po_id: header.id,
            po_number: value(header.po_number),
            po_date: value(header.po_date),
            supplier_id: header.vendor_id,
            supplier: value(vendorMap.get(header.vendor_id)?.name),
            buyer: buyer
              ? [buyer.first_name, buyer.last_name].filter(Boolean).join(" ") ||
                value(buyer.username)
              : null,
            status: receipt.status,
            open_state: receipt.open_po ? "OPEN" : "CLOSED",
            item_id: value(line.item_id),
            item: value(line.item_name || item?.name),
            item_code: value(line.item_code || item?.code),
            uom: value(line.uom || item?.uom),
            ordered_qty: ordered,
            received_qty: reportNumber(fact.received_qty),
            accepted_qty: reportNumber(fact.accepted_qty),
            rejected_qty: reportNumber(fact.rejected_qty),
            open_qty: open,
            unit_price: rate,
            currency,
            line_value:
              currency && rate != null && ordered != null
                ? ordered * rate
                : null,
            open_value:
              receipt.open_po && currency && rate != null && open != null
                ? open * rate
                : receipt.open_po
                  ? null
                  : 0,
            po_total: pricing ? reportNumber(header.total_amount) : null,
            pr_number: value(prMap.get(header.pr_id)?.pr_number),
            required_date: value(prMap.get(header.pr_id)?.required_date),
            delivery_date: delivery,
            overdue_days:
              receipt.open_po && Number.isFinite(promised)
                ? Math.max(0, Math.floor((today - promised) / 86400000))
                : receipt.open_po
                  ? null
                  : 0,
            purchase_month: value(header.po_date)?.slice(0, 7) || null,
          };
        });
    }
    if (plan.dataset === "PURCHASE_REQUISITIONS") {
      const headers = await read(
        "purchase_requisitions",
        "id,pr_number,created_at,requested_by,department,status,required_date",
        dateFilters("created_at"),
      );
      const [lines, users, relatedOrders] = await Promise.all([
        related(
          "purchase_requisition_items",
          "id,pr_id,item_id,item_code,uom,requested_qty,required_date",
          "pr_id",
          headers.map((row) => row.id),
          "purchase_requisitions",
        ),
        related(
          "users",
          "id,first_name,last_name,username",
          "id",
          headers.map((row) => row.requested_by),
        ),
        hasPermission(scope.user, "purchase_orders:read")
          ? related(
              "purchase_orders",
              "id,pr_id,po_number",
              "pr_id",
              headers.map((row) => row.id),
            )
          : [],
      ]);
      const items = await related(
        "items",
        "id,code,name",
        "id",
        lines.map((row) => row.item_id),
      );
      const headerMap = map(headers),
        itemMap = map(items),
        userMap = map(users);
      return lines
        .filter((line) => headerMap.has(line.pr_id))
        .map((line) => {
          const header = headerMap.get(line.pr_id),
            user = userMap.get(header.requested_by);
          return {
            pr_number: value(header.pr_number),
            date: reportCalendarDay(header.created_at, scope.timeZone),
            requester: user
              ? [user.first_name, user.last_name].filter(Boolean).join(" ") ||
                value(user.username)
              : null,
            department: value(header.department),
            status: value(header.status),
            item_id: value(line.item_id),
            item: value(itemMap.get(line.item_id)?.name),
            item_code: value(line.item_code),
            uom: value(line.uom),
            quantity: reportNumber(line.requested_qty),
            required_date: value(line.required_date || header.required_date),
            related_po: hasPermission(scope.user, "purchase_orders:read")
              ? relatedOrders
                  .filter((order) => order.pr_id === header.id)
                  .map((order) => order.po_number)
                  .join(", ")
              : null,
          };
        });
    }
    if (plan.dataset === "GRN") {
      const headers = await read(
        "grns",
        "id,grn_number,created_at,po_id,status",
        dateFilters("created_at"),
      );
      const [lines, orders] = await Promise.all([
        related(
          "grn_items",
          "id,grn_id,po_item_id,received_qty,accepted_qty,rejected_qty,qc_status",
          "grn_id",
          headers.map((row) => row.id),
          "grns",
        ),
        related(
          "purchase_orders",
          "id,po_number,vendor_id",
          "id",
          headers.map((row) => row.po_id),
        ),
      ]);
      const [poLines, vendors] = await Promise.all([
        related(
          "purchase_order_items",
          "id,item_code,uom",
          "id",
          lines.map((row) => row.po_item_id),
          "purchase_orders",
        ),
        related(
          "vendors",
          "id,name",
          "id",
          orders.map((row) => row.vendor_id),
        ),
      ]);
      const headerMap = map(headers),
        orderMap = map(orders),
        lineMap = map(poLines),
        vendorMap = map(vendors);
      return lines
        .filter((line) => headerMap.has(line.grn_id))
        .map((line) => {
          const header = headerMap.get(line.grn_id),
            order = orderMap.get(header.po_id),
            item = lineMap.get(line.po_item_id);
          return {
            grn_number: value(header.grn_number),
            date: reportCalendarDay(header.created_at, scope.timeZone),
            supplier: value(vendorMap.get(order?.vendor_id)?.name),
            po_number: value(order?.po_number),
            item_code: value(item?.item_code),
            uom: value(item?.uom),
            received_qty: reportNumber(line.received_qty),
            accepted_qty: reportNumber(line.accepted_qty),
            rejected_qty: reportNumber(line.rejected_qty),
            qc_state: value(line.qc_status),
            status: value(header.status),
          };
        });
    }
    if (plan.dataset === "ITEMS" || plan.dataset === "DATA_DOCTOR_ITEMS") {
      const oem = hasPermission(scope.user, "vendors:read");
      const items = await read(
        "items",
        `id,code,name,item_type,category,uom,is_active,reorder_level${oem ? ",oem_name,oem_part_no" : ""}`,
        (query) => {
          const filter = plan.filters.find(
            (filter) => filter.field === "item_id" && filter.operator === "eq",
          );
          return filter ? query.eq("id", filter.value) : query;
        },
      );
      if (plan.dataset === "DATA_DOCTOR_ITEMS") {
        if (process.env.MIZANTRA_DATA_DOCTOR_ENABLED !== "true")
          throw new ForbiddenException("Data Doctor is not enabled.");
        if (items.length > 25)
          throw new BadRequestException(
            "Current diagnoses are bounded to 25 items. Select an item to narrow the report.",
          );
        const result: ReportRow[] = [];
        for (const item of items) {
          if (signal.aborted)
            throw new ServiceUnavailableException("Report timed out.");
          const diagnoses = await this.brain.withDiagnosticEvidence(
            scope.user,
            {
              profile: scope.profile,
              tenant_id: scope.tenant,
              current_user_id: scope.owner,
              entity_type: "item",
              entity_id: item.id,
              current_route: "/dashboard/reports",
            },
            (evidence) => this.doctor.inspectEvidence(evidence),
          );
          for (const finding of diagnoses.diagnoses)
            result.push({
              item_id: item.id,
              item_code: item.code,
              item: item.name,
              check: finding.diagnosis_key,
              severity: finding.severity,
              confidence: finding.confidence,
            });
        }
        return result;
      }
      const [stock, links] = await Promise.all([
        hasPermission(scope.user, "inventory:read")
          ? related(
              "inventory_stock",
              "id,item_id,quantity",
              "item_id",
              items.map((row) => row.id),
            )
          : [],
        oem
          ? related(
              "item_vendors",
              "id,item_id,vendor_id,is_active",
              "item_id",
              items.map((row) => row.id),
            )
          : [],
      ]);
      const vendors = oem
        ? await related(
            "vendors",
            "id,name",
            "id",
            links.map((row) => row.vendor_id),
          )
        : [];
      const vendorMap = map(vendors);
      return items.map((item) => {
        const balances = stock.filter((row) => row.item_id === item.id),
          quantities = balances.map((row) => reportNumber(row.quantity));
        const current =
          balances.length && quantities.every((number) => number != null)
            ? (quantities as number[]).reduce((sum, number) => sum + number, 0)
            : null;
        const reorder = reportNumber(item.reorder_level);
        return {
          item_id: item.id,
          item_code: value(item.code),
          item: value(item.name),
          item_type: value(item.item_type),
          category: value(item.category),
          uom: value(item.uom),
          active: typeof item.is_active === "boolean" ? item.is_active : null,
          current_stock: current,
          reorder_level: reorder,
          below_reorder:
            current != null && reorder != null ? current < reorder : null,
          oem_name: oem ? value(item.oem_name) : null,
          oem_part_no: oem ? value(item.oem_part_no) : null,
          suppliers: oem
            ? links
                .filter(
                  (link) =>
                    link.item_id === item.id && link.is_active !== false,
                )
                .map((link) => vendorMap.get(link.vendor_id)?.name)
                .filter(Boolean)
                .join(", ")
            : null,
        };
      });
    }
    if (plan.dataset === "SUPPLIERS") {
      const [vendors, links, items] = await Promise.all([
        read("vendors", "id,code,name,is_active"),
        hasPermission(scope.user, "items:read")
          ? read("item_vendors", "id,item_id,vendor_id,is_active")
          : [],
        hasPermission(scope.user, "items:read") ? read("items", "id,code") : [],
      ]);
      const itemMap = map(items);
      const wanted = [
        ...plan.columns,
        ...plan.grouping,
        ...plan.filters.map((filter) => filter.field),
        ...plan.sort.map((sort) => sort.field),
        ...plan.aggregations.map(
          (key) =>
            REPORT_DATASETS.SUPPLIERS.measures[key]?.field || key.split(":")[1],
        ),
      ];
      const splitCurrency = wanted.some((field) =>
        ["currency", "open_po_value", "historical_purchase_value"].includes(
          field,
        ),
      );
      const purchasing =
        canSeeField(
          scope.user,
          REPORT_DATASETS.SUPPLIERS.fields.open_po_count,
        ) &&
        wanted.some((field) =>
          [
            "currency",
            "open_po_count",
            "open_po_value",
            "historical_purchase_value",
          ].includes(field),
        );
      const purchaseRows = purchasing
        ? await this.sourceRows(
            scope,
            {
              ...plan,
              dataset: "PURCHASE_ORDERS",
              filters: [],
              grouping: [],
              aggregations: [],
              sort: [],
              columns: REPORT_DATASETS.PURCHASE_ORDERS.defaults,
            },
            signal,
          )
        : [];
      return vendors.flatMap((vendor) => {
        const supplierRows = purchaseRows.filter(
          (row) => row.supplier_id === vendor.id,
        );
        const currencies = splitCurrency
          ? [...new Set(supplierRows.map((row) => row.currency))]
          : [null];
        if (!currencies.length) currencies.push(null);
        return currencies.map((currency) => {
          const recorded = supplierRows.filter(
              (row) => !splitCurrency || row.currency === currency,
            ),
            open = recorded.filter((row) => row.open_state === "OPEN");
          const sum = (rows: ReportRow[], field: string) =>
            currency && rows.every((row) => reportNumber(row[field]) != null)
              ? rows.reduce((total, row) => total + Number(row[field]), 0)
              : null;
          return {
            supplier_id: vendor.id,
            supplier: value(vendor.name),
            supplier_code: value(vendor.code),
            active:
              typeof vendor.is_active === "boolean" ? vendor.is_active : null,
            items_supplied: hasPermission(scope.user, "items:read")
              ? links
                  .filter(
                    (link) =>
                      link.vendor_id === vendor.id && link.is_active !== false,
                  )
                  .map((link) => itemMap.get(link.item_id)?.code)
                  .filter(Boolean)
                  .join(", ")
              : null,
            currency,
            open_po_count: purchasing
              ? new Set(open.map((row) => row.po_id)).size
              : null,
            open_po_value: canSeeField(
              scope.user,
              REPORT_DATASETS.SUPPLIERS.fields.open_po_value,
            )
              ? sum(open, "open_value")
              : null,
            historical_purchase_value: canSeeField(
              scope.user,
              REPORT_DATASETS.SUPPLIERS.fields.historical_purchase_value,
            )
              ? sum(recorded, "line_value")
              : null,
          };
        });
      });
    }
    if (plan.dataset === "ATTENDANCE") {
      const attendance = await read(
        "attendance",
        "id,employee_id,attendance_date,status,check_in_time,check_out_time,work_hours,late_minutes,overtime_hours",
        dateFilters("attendance_date"),
      );
      const employees = await related(
        "employees",
        "id,employee_code,employee_name,department",
        "id",
        attendance.map((row) => row.employee_id),
      );
      const employeeMap = map(employees);
      return attendance.map((row) => ({
        employee: value(employeeMap.get(row.employee_id)?.employee_name),
        employee_code: value(employeeMap.get(row.employee_id)?.employee_code),
        department: value(employeeMap.get(row.employee_id)?.department),
        date: reportCalendarDay(row.attendance_date, scope.timeZone),
        status: value(row.status),
        check_in: value(row.check_in_time),
        check_out: value(row.check_out_time),
        working_hours: reportNumber(row.work_hours),
        late_minutes: reportNumber(row.late_minutes),
        overtime_hours: reportNumber(row.overtime_hours),
      }));
    }
    if (plan.dataset === "AUTO_QA") {
      const findings = await read(
        "autoqa_findings",
        "id,module,check_key,status,severity,entity_type,entity_id,created_at",
        (query) =>
          dateFilters("created_at")(query.eq("profile", scope.profile)),
      );
      return findings.map((row) => ({
        module: value(row.module),
        check: value(row.check_key),
        status: value(row.status),
        severity: value(row.severity),
        entity_type: value(row.entity_type),
        entity_id: value(row.entity_id),
        date: reportCalendarDay(row.created_at, scope.timeZone),
      }));
    }
    throw new BadRequestException("Unsupported reporting category.");
  }
  async list(user: any, kind = "REPORT") {
    const scope = this.scope(user, kind === "DASHBOARD");
    if (!["REPORT", "DASHBOARD"].includes(kind))
      throw new BadRequestException("Invalid reporting definition category.");
    const { data, error } = await this.definitionQuery(scope)
      .eq("kind", kind)
      .order("updated_at", { ascending: false })
      .limit(501);
    if (error)
      throw new ServiceUnavailableException(
        "Reporting definitions are unavailable.",
      );
    if (data?.length > 500)
      throw new BadRequestException(
        "Too many reporting definitions. Remove unused definitions.",
      );
    return (data || [])
      .filter(
        (row) =>
          row.owner_id === scope.owner || (kind === "REPORT" && row.shared),
      )
      .map((row) => {
        if (kind === "REPORT") {
          try {
            return { ...row, definition: this.plan(row.definition, scope) };
          } catch {
            return null;
          }
        }
        return row;
      })
      .filter(Boolean);
  }
  async saveReport(user: any, body: any) {
    this.rejectScopeInput(body);
    const scope = this.scope(user);
    let old: any;
    if (body.id) {
      old = await this.definition(scope, body.id, "REPORT");
      if (old.owner_id !== scope.owner)
        throw new ForbiddenException("Only the owner can change this report.");
    }
    const plan = this.plan(body.plan || old?.definition, scope);
    const shared =
      body.shared === undefined ? !!old?.shared : body.shared === true;
    if (shared && !hasPermission(user, "reports:share"))
      throw new ForbiddenException("Report sharing permission is required.");
    const result = await this.store(
      scope,
      "REPORT",
      body.title || old?.title || plan.title,
      { ...plan, title: body.title || old?.title || plan.title },
      body.id,
      shared,
    );
    await this.audit(scope, "SAVE", plan);
    return result;
  }
  async duplicateReport(user: any, id: string) {
    const scope = this.scope(user);
    const old = await this.definition(scope, id, "REPORT");
    return this.saveReport(user, {
      title: `${old.title.slice(0, 110)} Copy`,
      plan: old.definition,
    });
  }
  async remove(user: any, id: string) {
    const scope = this.scope(user);
    const old = await this.definition(scope, id);
    if (
      old.owner_id !== scope.owner ||
      !["REPORT", "DASHBOARD"].includes(old.kind)
    )
      throw new ForbiddenException(
        "Only the owner can remove this definition.",
      );
    const { error } = await this.db
      .from(metadataTable)
      .delete()
      .eq("id", id)
      .eq("tenant_id", scope.tenant)
      .eq("profile", scope.profile)
      .eq("owner_id", scope.owner);
    if (error)
      throw new ServiceUnavailableException(
        "Reporting metadata could not be removed.",
      );
    await this.audit(scope, "DELETE", null);
    return { removed: true };
  }
  async saveDashboard(user: any, body: any) {
    this.rejectScopeInput(body);
    const scope = this.scope(user, true);
    let old: any;
    if (body.id) {
      old = await this.definition(scope, body.id, "DASHBOARD");
      if (old.owner_id !== scope.owner)
        throw new ForbiddenException(
          "Only the owner can change this dashboard.",
        );
    }
    if (!Array.isArray(body.widgets) || body.widgets.length > 12)
      throw new BadRequestException("A dashboard supports up to 12 widgets.");
    const identifiers = new Set<string>();
    for (const widget of body.widgets) {
      if (
        !widget ||
        Object.keys(widget).some(
          (key) => !["id", "report_id", "width"].includes(key),
        ) ||
        !uuid.test(widget.id || "") ||
        identifiers.has(widget.id) ||
        !["half", "full"].includes(widget.width)
      )
        throw new BadRequestException("Invalid widget definition.");
      identifiers.add(widget.id);
      this.plan(
        (await this.definition(scope, widget.report_id, "REPORT")).definition,
        scope,
      );
    }
    const result = await this.store(
      scope,
      "DASHBOARD",
      body.title || old?.title || "My Dashboard",
      { widgets: body.widgets },
      body.id,
    );
    await this.audit(scope, "DASHBOARD", null);
    return result;
  }
  async health(user: any) {
    const scope = this.scope(user);
    if (!hasAdminBypass(user))
      throw new ForbiddenException(
        "Reporting health is restricted to administrators.",
      );
    const counts: Record<string, number> = {};
    for (const kind of ["REPORT", "DASHBOARD"]) {
      const { count, error } = await this.db
        .from(metadataTable)
        .select("id", { count: "exact", head: true })
        .eq("tenant_id", scope.tenant)
        .eq("profile", scope.profile)
        .eq("kind", kind);
      if (error)
        throw new ServiceUnavailableException(
          "Reporting health metadata unavailable.",
        );
      counts[kind] = count || 0;
    }
    const recent = this.recent.filter(
      (row) => row.tenant === scope.tenant && row.profile === scope.profile,
    );
    return {
      datasets: Object.keys(REPORT_DATASETS).length,
      registered_fields: Object.values(REPORT_DATASETS).reduce(
        (count, dataset) => count + Object.keys(dataset.fields).length,
        0,
      ),
      registered_measures: Object.values(REPORT_DATASETS).reduce(
        (count, dataset) => count + Object.keys(dataset.measures).length,
        0,
      ),
      saved_reports: counts.REPORT,
      dashboards: counts.DASHBOARD,
      recent_queries: recent.length,
      average_execution_ms: recent.length
        ? Math.round(
            recent.reduce((sum, row) => sum + row.duration, 0) / recent.length,
          )
        : 0,
      errors: recent.filter((row) => row.error).length,
      slow_queries: recent.filter((row) => row.duration > 5000).length,
      scope: "CURRENT_TENANT_PROFILE_LAST_1000_QUERIES_SINCE_API_START",
    };
  }
}
