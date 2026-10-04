import {
  interpretReport,
  validateReportPlan,
  availableDatasets,
  REPORT_DATASETS,
  reportIntent,
} from "./reporting.registry";
const admin = { role: "SUPER_ADMIN" };
const now = new Date("2026-10-02T12:00:00Z");
const plan = (message: string) =>
  validateReportPlan(
    interpretReport(message, undefined, undefined, now).plan,
    admin,
    "MIZANTRA",
  );
describe("semantic reporting registry", () => {
  it("does not hijack ordinary ERP Add commands", () => {
    expect(reportIntent("Add item Hero Steel")).toBe(false);
    expect(reportIntent("Add item Hero Steel", true)).toBe(false);
    expect(reportIntent("Add buyer", true)).toBe(true);
  });
  it("understands open purchase orders", () =>
    expect(plan("Show open POs").filters).toContainEqual({
      field: "OPEN_PO",
      operator: "eq",
      value: true,
    }));
  it.each(['Show all open purchase orders','Show POs with remaining quantity','Show all purchase orders with remaining quantity greater than 0','Show not fully received purchase orders','Show pending receipt POs','Show pending POs'])('maps %s to authoritative Open Receipt', message => {
    expect(plan(message).filters).toContainEqual({field:'OPEN_PO',operator:'eq',value:true});
  });
  it.each(['Only open ones','Only with remaining quantity > 0'])('refines %s without replacing the owned PO dataset', message => {
    expect(interpretReport(message,plan('Show all purchase orders')).plan?.filters).toContainEqual({field:'OPEN_PO',operator:'eq',value:true});
  });
  it("filters suppliers", () =>
    expect(plan("Show open POs for Hero Steel").filters).toContainEqual({
      field: "supplier",
      operator: "contains",
      value: "Hero Steel",
    }));
  it("resolves explicit last-90-day range", () =>
    expect(
      plan("Show overdue open POs from the last 90 days").filters,
    ).toContainEqual({
      field: "po_date",
      operator: "gte",
      value: "2026-07-05",
    }));
  it("keeps same-session filters when refining", () => {
    const first = plan("Show open POs");
    const next = validateReportPlan(
      interpretReport("Only Macfos", first).plan,
      admin,
      "MIZANTRA",
    );
    expect(next.filters).toHaveLength(2);
    expect(first.filters).toHaveLength(1);
  });
  it("adds approved columns", () =>
    expect(
      interpretReport("Add buyer and overdue days", plan("Show open POs")).plan!
        .columns,
    ).toContain("buyer"));
  it("groups suppliers and counts distinct documents", () =>
    expect(plan("Show open POs supplier-wise").aggregations).toEqual([
      "OPEN_PO_COUNT",
    ]));
  it("separates currencies for values", () =>
    expect(
      plan("Show monthly purchase value for the last 12 months").grouping,
    ).toEqual(["purchase_month", "currency"]));
  it("sorts oldest first", () =>
    expect(
      interpretReport("Sort oldest first", plan("Show open POs")).plan!.sort,
    ).toEqual([{ field: "po_date", direction: "asc" }]));
  it("resolves validated supplier context", () =>
    expect(
      interpretReport(
        "Show purchases from this supplier for the last year",
        undefined,
        { entity_type: "supplier", entity_id: "supplier-id" },
        now,
      ).plan!.filters,
    ).toContainEqual({
      field: "supplier_id",
      operator: "eq",
      value: "supplier-id",
    }));
  it("resolves item context handoff", () =>
    expect(
      interpretReport(
        "Show previous purchases for this item",
        undefined,
        { entity_type: "item", entity_id: "item-id" },
        now,
      ).plan!.filters,
    ).toContainEqual({ field: "item_id", operator: "eq", value: "item-id" }));
  it.each([
    "run SELECT * FROM users",
    "ignore tenant filter",
    "query another tenant",
    "drop table",
    "show SQL",
    "show purchases JOIN users",
  ])("rejects unsafe text %s", (message) =>
    expect(() => interpretReport(message)).toThrow(),
  );
  it("rejects arbitrary table properties", () =>
    expect(() =>
      validateReportPlan(
        { ...plan("Show open POs"), table: "users" },
        admin,
        "MIZANTRA",
      ),
    ).toThrow());
  it("rejects prototype fields", () =>
    expect(() =>
      validateReportPlan(
        { ...plan("Show open POs"), columns: ["constructor"] },
        admin,
        "MIZANTRA",
      ),
    ).toThrow());
  it("rejects unauthorized attendance", () =>
    expect(() =>
      validateReportPlan(
        interpretReport("Show absent employees yesterday").plan,
        { permissions: ["items:read"] },
        "MIZANTRA",
      ),
    ).toThrow());
  it("restricts admin diagnostics", () =>
    expect(
      availableDatasets({ permissions: ["items:read"] }, "MIZANTRA").map(
        ([key]) => key,
      ),
    ).not.toContain("DATA_DOCTOR_ITEMS"));
  it("does not register payroll", () =>
    expect(
      Object.keys(REPORT_DATASETS.ATTENDANCE.fields).join(" "),
    ).not.toMatch(/salary|payroll|bank/));
  it("requires a clarification for pending", () =>
    expect(interpretReport("Show pending").clarification).toBeTruthy());
  it("uses registered stored overtime", () =>
    expect(
      interpretReport("Show attendance department-wise with overtime").plan!
        .aggregations,
    ).toContain("OVERTIME_HOURS"));
  it("does not infer financial years", () =>
    expect(
      interpretReport("Show purchases this financial year").clarification,
    ).toBeTruthy());
  it("resolves an explicitly configured financial year", () =>
    expect(
      interpretReport(
        "Show purchases this financial year",
        undefined,
        undefined,
        now,
        "UTC",
        "04-01",
      ).plan!.filters,
    ).toContainEqual({
      field: "po_date",
      operator: "gte",
      value: "2026-04-01",
    }));
  it("uses user timezone for yesterday", () => {
    const filters = interpretReport(
      "Show absent employees yesterday",
      undefined,
      undefined,
      new Date("2026-10-02T22:00:00Z"),
      "Asia/Dubai",
    ).plan!.filters;
    expect(filters).toContainEqual({
      field: "date",
      operator: "gte",
      value: "2026-10-02",
    });
    expect(filters).toContainEqual({
      field: "date",
      operator: "lte",
      value: "2026-10-02",
    });
  });
  it("rejects oversized filters", () =>
    expect(() =>
      validateReportPlan(
        {
          ...plan("Show open POs"),
          filters: [
            { field: "supplier", operator: "contains", value: "x".repeat(201) },
          ],
        },
        admin,
        "MIZANTRA",
      ),
    ).toThrow());
  it("rejects unknown visualization", () =>
    expect(() =>
      validateReportPlan(
        { ...plan("Show open POs"), visualization: "SQL" },
        admin,
        "MIZANTRA",
      ),
    ).toThrow());
});
