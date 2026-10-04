import * as XLSX from "xlsx";
import { reportCalendarDay, reportDateBoundary } from "./reporting.engine";
import {
  evaluateReport,
  pageReport,
  reportWorkbook,
  reportNumber,
} from "./reporting.engine";
import { interpretReport, validateReportPlan } from "./reporting.registry";
const admin = { role: "SUPER_ADMIN" };
const plan = (message: string) =>
  validateReportPlan(interpretReport(message).plan, admin, "MIZANTRA");
const rows = Array.from({ length: 119 }, (_, index) => ({
  po_id: `po-${index}`,
  po_number: `PO-${index}`,
  po_date: "2026-09-01",
  supplier: index % 2 ? "Hero Steel" : "Macfos",
  open_state: "OPEN",
  currency: index % 2 ? "USD" : "INR",
  uom: "PCS",
  open_value: 10,
  line_value: 20,
  open_qty: 2,
  ordered_qty: 4,
  overdue_days: index % 2 ? 4 : 0,
  purchase_month: "2026-09",
}));
describe("report evaluator and complete XLSX parity", () => {
  it('preserves export versions across JSONB object key ordering but rejects changed data', () => {
    const original=plan('Show open POs');
    const restored={...Object.fromEntries(Object.entries(original).reverse()),filters:original.filters.map(filter=>Object.fromEntries(Object.entries(filter).reverse()))} as typeof original;
    expect(evaluateReport(restored,rows).version).toBe(evaluateReport(original,rows).version);
    expect(evaluateReport(restored,rows.slice(1)).version).not.toBe(evaluateReport(original,rows).version);
  });
  it("resolves timestamp calendar days and query bounds in user timezone", () => {
    expect(reportCalendarDay("2026-10-02T22:00:00Z", "Asia/Dubai")).toBe(
      "2026-10-03",
    );
    expect(reportDateBoundary("2026-10-03", "Asia/Dubai")).toBe(
      "2026-10-02T20:00:00.000Z",
    );
    expect(reportDateBoundary("2026-10-03", "Asia/Kolkata")).toBe(
      "2026-10-02T18:30:00.000Z",
    );
  });
  it("does not invent zeros from blank stored numeric values", () =>
    expect(reportNumber("   ")).toBeNull());
  it("filters open orders", () =>
    expect(
      evaluateReport(plan("Show open POs"), [
        ...rows,
        { ...rows[0], open_state: "CLOSED" },
      ]).rows,
    ).toHaveLength(119));
  it("filters literal supplier text", () =>
    expect(
      evaluateReport(plan("Show open POs for Hero Steel"), rows)
        .matching_documents,
    ).toBe(59));
  it("compares date ranges", () =>
    expect(
      evaluateReport(plan("Show purchases 2026-08-01 to 2026-08-31"), rows)
        .rows,
    ).toHaveLength(0));
  it("selects overdue orders", () =>
    expect(
      evaluateReport(plan("Show overdue POs"), rows).matching_documents,
    ).toBe(59));
  it("counts unique POs rather than lines", () =>
    expect(
      evaluateReport(plan("Show open POs supplier-wise"), [rows[0], rows[0]])
        .rows[0].OPEN_PO_COUNT,
    ).toBe(1));
  it("registered open counts never count closed orders", () => {
    const definition = plan("Show open POs supplier-wise");
    definition.filters = [];
    expect(
      evaluateReport(definition, [{ ...rows[0], open_state: "CLOSED" }]).rows[0]
        .OPEN_PO_COUNT,
    ).toBe(0);
  });
  it("separates currency aggregation", () => {
    const result = evaluateReport(plan("Show monthly purchase value"), rows);
    expect(result.rows).toHaveLength(2);
    expect(result.rows.map((row) => row.PURCHASE_VALUE)).toEqual([1200, 1180]);
  });
  it("sorts and bounds top suppliers", () => {
    const result = evaluateReport(
      plan("Top 1 suppliers by purchase value"),
      rows,
    );
    expect(result.rows).toHaveLength(2);
    expect(result.rows[0].supplier).toBe("Macfos");
  });
  it("paginates without changing chart source", () => {
    const result = pageReport(
      evaluateReport(plan("Show open POs"), rows),
      2,
      50,
    );
    expect(result.rows).toHaveLength(50);
    expect(result.chart_data).toEqual(result.rows);
    expect(result.result_rows).toBe(119);
  });
  it("exports all filtered rows beyond first page", () => {
    const definition = plan("Show open POs");
    const result = evaluateReport(definition, rows);
    const book = XLSX.read(reportWorkbook(definition, result), {
      type: "buffer",
    });
    const data = XLSX.utils.sheet_to_json(book.Sheets.Data);
    expect(data).toHaveLength(119);
    expect(pageReport(result, 1, 50).rows).toHaveLength(50);
  });
  it("exports the same summarized definition", () => {
    const definition = plan("Show monthly purchase value");
    const result = evaluateReport(definition, rows);
    const book = XLSX.read(reportWorkbook(definition, result), {
      type: "buffer",
    });
    const data: any[] = XLSX.utils.sheet_to_json(book.Sheets.Data);
    expect(data.map((row) => row["Purchase value"])).toEqual(
      result.rows.map((row) => row.PURCHASE_VALUE),
    );
  });
  it("does not invent missing numeric evidence", () =>
    expect(
      evaluateReport(plan("Show monthly purchase value"), [
        { ...rows[0], line_value: null },
      ]).rows[0].PURCHASE_VALUE,
    ).toBeNull());
  it("does not aggregate missing currency", () =>
    expect(
      evaluateReport(plan("Show monthly purchase value"), [
        { ...rows[0], currency: null },
      ]).rows[0].PURCHASE_VALUE,
    ).toBeNull());
  it("does not interpret null as zero", () =>
    expect(reportNumber(null)).toBeNull());
  it("has stable export version independent of pagination", () => {
    const result = evaluateReport(plan("Show open POs"), rows);
    expect(pageReport(result, 2, 50).version).toBe(
      pageReport(result, 1, 50).version,
    );
  });
  it("rejects oversized sources", () =>
    expect(() =>
      evaluateReport(
        plan("Show open POs"),
        Array.from({ length: 20001 }, () => rows[0]),
      ),
    ).toThrow());
  it("rejects excessive page sizes", () =>
    expect(() =>
      pageReport(evaluateReport(plan("Show open POs"), rows), 1, 1000),
    ).toThrow());
  it("keeps formula-like strings as XLSX text, not formulas", () => {
    const definition = plan("Show open POs");
    const result = evaluateReport(definition, [
      { ...rows[0], supplier: '=HYPERLINK("https://example.com")' },
    ]);
    const book = XLSX.read(reportWorkbook(definition, result), {
      type: "buffer",
    });
    expect(book.Sheets.Data.C2.t).toBe("s");
    expect(book.Sheets.Data.C2.f).toBeUndefined();
  });
});
