import { ReportingService } from "./reporting.service";
import { interpretReport } from "./reporting.registry";
import * as XLSX from "xlsx";
import { ActivePlannerController } from "./active-planner.controller";
jest.mock("@supabase/supabase-js", () => ({
  createClient: jest.fn(() => ({ from: jest.fn() })),
}));
const tenant = "11111111-1111-4111-8111-111111111111",
  owner = "22222222-2222-4222-8222-222222222222";
const user = { tenantId: tenant, userId: owner, role: "SUPER_ADMIN" };
describe("report service isolation and metadata boundary", () => {
  it("does not read purchasing or duplicate suppliers for a master-only report", async () => {
    const subject = new ReportingService({} as any, {} as any, {} as any),
      reads: string[] = [];
    (subject as any).read = async (_scope: any, table: string) => {
      reads.push(table);
      return table === "vendors"
        ? [
            {
              id: "vendor",
              code: "V1",
              name: "Existing supplier",
              is_active: true,
            },
          ]
        : [];
    };
    const rows = await (subject as any).sourceRows(
      (subject as any).scope(user),
      interpretReport("Show all suppliers").plan,
      new AbortController().signal,
    );
    expect(rows).toHaveLength(1);
    expect(reads).not.toContain("purchase_orders");
  });
  it("uses timezone-adjusted database bounds for timestamp dates", async () => {
    const subject = new ReportingService({} as any, {} as any, {} as any);
    const query = {
      gte: jest.fn().mockReturnThis(),
      lt: jest.fn().mockReturnThis(),
    };
    (subject as any).read = async (
      _scope: any,
      _table: string,
      _columns: string,
      _signal: any,
      configure: any,
    ) => {
      if (configure) configure(query);
      return [];
    };
    const scope = (subject as any).scope({ ...user, timezone: "Asia/Dubai" });
    await (subject as any).sourceRows(
      scope,
      interpretReport("Show GRNs 2026-10-03 to 2026-10-03").plan,
      new AbortController().signal,
    );
    expect(query.gte).toHaveBeenCalledWith(
      "created_at",
      "2026-10-02T20:00:00.000Z",
    );
    expect(query.lt).toHaveBeenCalledWith(
      "created_at",
      "2026-10-03T20:00:00.000Z",
    );
  });
  let service: ReportingService,
    storage: any[],
    writes: string[],
    queries: any[],
    brain: any;
  beforeEach(() => {
    process.env.ERP_TENANT_PROFILE = "MIZANTRA";
    process.env.MIZANTRA_REPORT_BUILDER_ENABLED = "true";
    process.env.MIZANTRA_DASHBOARD_BUILDER_ENABLED = "true";
    storage = [];
    writes = [];
    queries = [];
    brain = {
      validateContext: jest.fn(async (_user, context) => ({
        enabled: true,
        context,
      })),
    };
    service = new ReportingService({} as any, brain, {} as any);
    (service as any).db = {
      from: (table: string) => {
        const filters: Array<[string, any]> = [];
        let mutation: string | undefined,
          payload: any,
          single = false;
        const query: any = {
          select: () => query,
          eq: (key: string, value: any) => {
            filters.push([key, value]);
            return query;
          },
          order: () => query,
          limit: () => query,
          single: () => {
            single = true;
            return query;
          },
          maybeSingle: () => {
            single = true;
            return query;
          },
          upsert: (value: any) => {
            mutation = "upsert";
            payload = value;
            return query;
          },
          insert: (value: any) => {
            mutation = "insert";
            payload = value;
            return query;
          },
          delete: () => {
            mutation = "delete";
            return query;
          },
          then: (resolve: any) => {
            queries.push({ table, filters });
            let data = storage.filter((row) =>
              filters.every(([key, value]) => row[key] === value),
            );
            if (mutation) {
              writes.push(table);
              if (mutation === "upsert") {
                storage = storage.filter((row) => row.id !== payload.id);
                storage.push(payload);
                data = [payload];
              }
              if (mutation === "delete")
                storage = storage.filter((row) => !data.includes(row));
            }
            return Promise.resolve({
              data: single ? data[0] || null : data,
              error: null,
            }).then(resolve);
          },
        };
        return query;
      },
    };
    (service as any).sourceRows = jest.fn(async () =>
      Array.from({ length: 119 }, (_, index) => ({
        po_id: `po-${index}`,
        po_number: `PO-${index}`,
        open_state: "OPEN",
        supplier: "Macfos",
        currency: "INR",
        open_value: 100,
      })),
    );
  });
  it("creates an NL report and owner-scoped session", async () => {
    const response = await service.interpret(user, {
      message: "Show open POs",
    });
    expect(response.status).toBe("REPORT_READY");
    expect(response.report!.matching_documents).toBe(119);
    expect(storage[0].owner_id).toBe(owner);
  });
  it("requeries an owner-scoped item report for the Operator", async () => {
    const itemId="33333333-3333-4333-8333-333333333333";
    (service as any).sourceRows=jest.fn().mockResolvedValue([{item_id:itemId,item_code:"RM-1",item:"Material",uom:"PCS",below_reorder:true,item_type:"RAW_MATERIAL"}]);
    const saved=await service.saveReport(user,{title:"Materials",plan:interpretReport("Show raw materials below reorder level").plan});
    const result=await service.actionItems(user,{report_id:saved.id});
    expect(result.item_ids).toEqual([itemId]);
    expect(result.plan.columns).toEqual(expect.arrayContaining(["item_id","uom"]));
    expect(queries).toContainEqual(expect.objectContaining({filters:expect.arrayContaining([["tenant_id",tenant],["profile","MIZANTRA"],["id",saved.id]])}));
    await expect(service.actionItems({...user,userId:itemId},{report_id:saved.id})).rejects.toThrow();
    expect(writes.every(table=>table.startsWith("mizantra_"))).toBe(true);
  });
  it("rejects non-item reports for PR planning", async () => {
    const saved=await service.saveReport(user,{title:"Purchases",plan:interpretReport("Show open POs").plan});
    await expect(service.actionItems(user,{report_id:saved.id})).rejects.toThrow("ungrouped item report");
  });
  it("rejects reports without unique authoritative item references", async () => {
    (service as any).sourceRows=jest.fn().mockResolvedValue([{item_id:"not-an-id",below_reorder:true,item_type:"RAW_MATERIAL"}]);
    await expect(service.actionItems(user,{below_reorder:true})).rejects.toThrow("authoritative item references");
  });
  it("does not silently truncate a report larger than 200 items", async () => {
    (service as any).run=jest.fn().mockResolvedValue({result_rows:201,rows:[],version:"live"});
    await expect(service.actionItems(user,{below_reorder:true})).rejects.toThrow("at most 200");
  });
  it("refines the same session", async () => {
    const first = await service.interpret(user, { message: "Show open POs" });
    const next = await service.interpret(user, {
      message: "Only Macfos",
      session_id: first.session_id,
    });
    expect(next.session_id).toBe(first.session_id);
    expect(next.report!.plan.filters).toHaveLength(2);
  });
  it("rejects another tenant's saved report", async () => {
    const report = await service.saveReport(user, {
      title: "Follow-up",
      plan: interpretReport("Show open POs").plan,
    });
    await expect(
      service.query(
        { ...user, tenantId: "33333333-3333-4333-8333-333333333333" },
        { report_id: report.id },
      ),
    ).rejects.toThrow();
  });
  it("rejects another owner's session", async () => {
    const first = await service.interpret(user, { message: "Show open POs" });
    await expect(
      service.interpret(
        { ...user, userId: "44444444-4444-4444-8444-444444444444" },
        { message: "Only Macfos", session_id: first.session_id },
      ),
    ).rejects.toThrow();
  });
  it("rejects explicit client tenant overrides", async () =>
    await expect(
      service.query(user, {
        tenant_id: tenant,
        plan: interpretReport("Show open POs").plan,
      }),
    ).rejects.toThrow());
  it("validates context through Brain", async () => {
    await service.interpret(user, {
      message: "Show purchases from this supplier",
      brain_context: { entity_type: "supplier", entity_id: owner },
    });
    expect(brain.validateContext).toHaveBeenCalledWith(
      user,
      expect.any(Object),
    );
  });
  it("fails closed on disabled context", async () => {
    brain.validateContext.mockResolvedValue({ enabled: false });
    await expect(
      service.interpret(user, {
        message: "Show purchases from this supplier",
        brain_context: {},
      }),
    ).rejects.toThrow();
  });
  it("exports complete 119-row filtered result", async () => {
    const first = await service.interpret(user, { message: "Show open POs" });
    const buffer = await service.export(user, {
      session_id: first.session_id,
      version: first.report!.version,
    });
    const book = XLSX.read(buffer, { type: "buffer" });
    expect(XLSX.utils.sheet_to_json(book.Sheets.Data)).toHaveLength(119);
    expect(first.report!.rows).toHaveLength(50);
  });
  it("rejects export if evidence changed", async () => {
    const first = await service.interpret(user, { message: "Show open POs" });
    await expect(
      service.export(user, { session_id: first.session_id, version: "stale" }),
    ).rejects.toThrow(/changed/);
  });
  it("reloads saved report semantic definition", async () => {
    const saved = await service.saveReport(user, {
      title: "Purchase Follow-up",
      plan: interpretReport("Show open POs").plan,
    });
    const result = await service.query(user, { report_id: saved.id });
    expect(result.plan.title).toBe("Purchase Follow-up");
    expect(result.rows).toHaveLength(50);
  });
  it("refines a reloaded saved definition without resetting filters", async () => {
    const saved = await service.saveReport(user, {
      title: "Supplier Follow-up",
      plan: interpretReport("Show open POs for Macfos").plan,
    });
    const result = await service.query(user, {
      report_id: saved.id,
      create_session: true,
    });
    const next = await service.interpret(user, {
      message: "Add buyer",
      session_id: result.session_id,
    });
    expect(next.report!.plan.filters).toEqual(result.plan.filters);
    expect(next.report!.plan.columns).toContain("buyer");
  });
  it("omits unauthorized pricing and supplier fields from discovery", () => {
    const config = service.configuration({
      tenantId: tenant,
      userId: owner,
      permissions: ["reports:read", "purchase_orders:read", "grns:read"],
    });
    const fields = config.datasets
      .find((dataset) => dataset.key === "PURCHASE_ORDERS")!
      .fields.map((field) => field.key);
    expect(fields).not.toContain("unit_price");
    expect(fields).not.toContain("supplier");
    expect(fields).toContain("po_number");
  });
  it("builds a purchasing dashboard from semantic presets only", async () => {
    const response = await service.interpret(user, {
      message: "Create a purchasing dashboard",
    });
    expect(response.dashboard!.definition.widgets).toHaveLength(4);
    expect(
      writes.every((table) => table.startsWith("mizantra_reporting_")),
    ).toBe(true);
  });
  it("duplicates and renames own report", async () => {
    const saved = await service.saveReport(user, {
      title: "Follow-up",
      plan: interpretReport("Show open POs").plan,
    });
    const copy = await service.duplicateReport(user, saved.id);
    expect(copy.id).not.toBe(saved.id);
    const renamed = await service.saveReport(user, {
      id: saved.id,
      title: "Renamed",
    });
    expect(renamed.title).toBe("Renamed");
  });
  it("creates, removes and reorders dashboard widgets", async () => {
    const saved = await service.saveReport(user, {
      title: "Follow-up",
      plan: interpretReport("Show open POs").plan,
    });
    const first = {
      id: "55555555-5555-4555-8555-555555555555",
      report_id: saved.id,
      width: "half",
    };
    const second = {
      id: "66666666-6666-4666-8666-666666666666",
      report_id: saved.id,
      width: "full",
    };
    const dashboard = await service.saveDashboard(user, {
      title: "Purchasing",
      widgets: [first, second],
    });
    const reordered = await service.saveDashboard(user, {
      id: dashboard.id,
      widgets: [second, first],
    });
    expect(reordered.definition.widgets[0].id).toBe(second.id);
    const removed = await service.saveDashboard(user, {
      id: dashboard.id,
      widgets: [first],
    });
    expect(removed.definition.widgets).toHaveLength(1);
  });
  it("prevents cross-owner deletion", async () => {
    const saved = await service.saveReport(user, {
      title: "Follow-up",
      plan: interpretReport("Show open POs").plan,
    });
    await expect(
      service.remove(
        { ...user, userId: "44444444-4444-4444-8444-444444444444" },
        saved.id,
      ),
    ).rejects.toThrow();
  });
  it("limits writes exclusively to reporting metadata", async () => {
    await service.interpret(user, { message: "Show open POs" });
    await service.saveDashboard(user, {
      title: "Empty dashboard",
      widgets: [],
    });
    expect(
      writes.every((table) =>
        ["mizantra_reporting_definitions", "mizantra_reporting_audit"].includes(
          table,
        ),
      ),
    ).toBe(true);
    expect(writes.length).toBeGreaterThan(0);
  });
  it("revalidates persisted field permissions", async () => {
    const saved = await service.saveReport(user, {
      title: "Follow-up",
      plan: interpretReport("Show open POs").plan,
    });
    await expect(
      service.query(
        {
          tenantId: tenant,
          userId: owner,
          permissions: ["reports:read", "items:read"],
        },
        { report_id: saved.id },
      ),
    ).rejects.toThrow();
  });
  it("defaults flags off", () => {
    delete process.env.MIZANTRA_REPORT_BUILDER_ENABLED;
    expect(service.configuration(user).enabled).toBe(false);
  });
  it("unsafe text never reaches a source query", async () => {
    await expect(
      service.interpret(user, { message: "run SELECT * FROM users" }),
    ).rejects.toThrow();
    expect((service as any).sourceRows).not.toHaveBeenCalled();
    expect(writes).toHaveLength(0);
  });
  it("prevents reporting output from reaching ERP execution or approval", () => {
    const controller = new ActivePlannerController(
      { execute: jest.fn(), requestApproval: jest.fn() } as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      service,
    );
    expect(() =>
      controller.execute({ user }, { intent_type: "REPORT_QUERY" }),
    ).toThrow();
    expect(() =>
      controller.requestApproval(
        { user },
        { provider: "DETERMINISTIC_REPORT_BUILDER_V1" },
      ),
    ).toThrow();
  });
  it("routes report requests in Ask without invoking ERP mutations", async () => {
    const controller = new ActivePlannerController(
      { execute: jest.fn() } as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      { interpret: async () => null } as any,
      { interpret: async () => null } as any,
      service,
    );
    const result = await controller.interpret(
      { user },
      { message: "Show open POs" },
    );
    expect(result.status).toBe("REPORT_READY");
    expect(result.questions).toEqual([]);
    expect(result.assistant_message).toBeTruthy();
  });
  it("denies unauthorized AutoQA and Doctor datasets", async () => {
    const reader = {
      tenantId: tenant,
      userId: owner,
      permissions: ["reports:read", "items:read"],
    };
    await expect(
      service.interpret(reader, {
        message: "Show open High Critical Auto QA findings by module",
      }),
    ).rejects.toThrow();
    await expect(
      service.interpret(reader, {
        message: "Show all items with active Data Doctor issues",
      }),
    ).rejects.toThrow();
  });
  it("projects no restricted price fields at the database boundary", async () => {
    const subject = new ReportingService(
      {
        reportingReceiptEvidence: async () => [
          {
            id: owner,
            status: "APPROVED",
            open_po: true,
            lines: [
              {
                id: tenant,
                ordered_qty: 10,
                received_qty: 2,
                accepted_qty: 2,
                rejected_qty: 0,
                open_qty: 8,
              },
            ],
          },
        ],
      } as any,
      brain,
      {} as any,
    );
    const reads: Array<{ table: string; columns: string }> = [];
    (subject as any).read = async (
      _scope: any,
      table: string,
      columns: string,
    ) => {
      reads.push({ table, columns });
      return table === "purchase_orders"
        ? [
            {
              id: owner,
              po_number: "PO-1",
              po_date: "2026-09-01",
              status: "APPROVED",
              vendor_id: "supplier",
              delivery_date: "2026-09-01",
            },
          ]
        : table === "purchase_order_items"
          ? [
              {
                id: tenant,
                po_id: owner,
                item_code: "ITEM-1",
                ordered_qty: 10,
                uom: "PCS",
              },
            ]
          : [];
    };
    const reader = {
      tenantId: tenant,
      userId: owner,
      permissions: ["reports:read", "purchase_orders:read", "grns:read"],
    };
    const scope = (subject as any).scope(reader);
    const result = await (subject as any).sourceRows(
      scope,
      interpretReport("Show open POs").plan,
      new AbortController().signal,
    );
    expect(
      reads.find((row) => row.table === "purchase_order_items")!.columns,
    ).not.toMatch(/rate|amount/);
    expect(
      reads.find((row) => row.table === "purchase_orders")!.columns,
    ).not.toMatch(/terms_and_conditions|total_amount/);
    expect(reads.some((row) => row.table === "vendors")).toBe(false);
    expect(result[0].unit_price).toBeNull();
    expect(result[0].open_qty).toBe(8);
    expect(result[0].overdue_days).toBeGreaterThan(0);
  });
  it("tenant scopes child reads through their parent", async () => {
    const query: any = {
      select: jest.fn(() => query),
      eq: jest.fn(() => query),
      order: () => query,
      range: () => query,
      abortSignal: async () => ({ data: [], error: null }),
    };
    (service as any).db = { from: () => query };
    await (service as any).read(
      (service as any).scope(user),
      "purchase_order_items",
      "id,po_id",
      new AbortController().signal,
      undefined,
      "purchase_orders",
    );
    expect(query.select).toHaveBeenCalledWith(
      "id,po_id,report_parent:purchase_orders!inner(tenant_id)",
    );
    expect(query.eq).toHaveBeenCalledWith("report_parent.tenant_id", tenant);
  });
  it("validates widgets against inaccessible saved reports", async () => {
    await expect(
      service.saveDashboard(user, {
        title: "Denied",
        widgets: [{ id: owner, report_id: tenant, width: "full" }],
      }),
    ).rejects.toThrow();
  });
  it("requires independent export authorization", async () => {
    const reader = {
      tenantId: tenant,
      userId: owner,
      permissions: ["reports:read", "purchase_orders:read", "grns:read"],
    };
    await expect(
      service.export(reader, {
        plan: interpretReport("Show open POs").plan,
        version: "any",
      }),
    ).rejects.toThrow(/export permission/);
  });
});
