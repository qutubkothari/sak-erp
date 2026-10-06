import { HrService } from "./hr.service";

describe("payroll run register query", () => {
  const tenantId = "tenant-a";
  const duplicateMonthRuns = [
    { id: "10000000-0000-0000-0000-000000000001", tenant_id: tenantId, payroll_month: "2026-09", run_date: "2026-10-03", status: "PENDING", remarks: "September rerun", created_by: "creator-a", created_at: "2026-10-03T08:00:00Z" },
    { id: "20000000-0000-0000-0000-000000000002", tenant_id: tenantId, payroll_month: "2026-09", run_date: "2026-10-01", status: "COMPLETED", remarks: "September original", created_by: "creator-a", created_at: "2026-10-01T08:00:00Z" },
  ];

  function makeService() {
    const calls: Array<{ table: string; method: string; args: unknown[] }> = [];
    const service = Object.create(HrService.prototype) as HrService;
    (service as any).supabase = {
      from(table: string) {
        let columns = "*";
        let result: any[] = table === "payroll_runs" ? duplicateMonthRuns : [{ id: "creator-a", first_name: "Asha", last_name: "Rao", username: "asha", email: "asha@example.test" }];
        const builder: any = {};
        for (const method of ["select", "eq", "or", "in", "gte", "lte", "order", "range"]) {
          builder[method] = (...args: unknown[]) => {
            calls.push({ table, method, args });
            if (method === "select") {
              columns = String(args[0]);
              if (table === "payroll_runs" && columns === "id") result = duplicateMonthRuns.map((run) => ({ id: run.id }));
              if (table === "payroll_runs" && columns.startsWith("id,tenant_id")) result = duplicateMonthRuns;
            }
            if (method === "range" && table === "payroll_runs" && columns.startsWith("id,tenant_id")) result = duplicateMonthRuns;
            return builder;
          };
        }
        builder.then = (resolve: (value: unknown) => unknown, reject: (reason: unknown) => unknown) => {
          const rows = table === "users" && columns.startsWith("id,") ? result : result;
          return Promise.resolve({ data: rows, count: table === "payroll_runs" ? 2 : null, error: null }).then(resolve, reject);
        };
        return builder;
      },
    };
    return { service, calls };
  }

  it("applies combined tenant filters before server pagination and resolves creator names", async () => {
    const { service, calls } = makeService();
    const result = await service.getPayrollRuns(tenantId, {
      page: 2,
      limit: 10,
      search: "Asha",
      month: "2026-09",
      status: "pending",
      from: "2026-10-01",
      to: "2026-10-31",
    });

    expect(result).toMatchObject({ total: 2, page: 2, limit: 10 });
    expect(result.data).toHaveLength(2);
    expect(result.data[0].created_by_name).toBe("Asha Rao");
    expect(result.data.map((run) => run.payroll_month)).toEqual(["2026-09", "2026-09"]);
    const runCalls = calls.filter((call) => call.table === "payroll_runs");
    const rangeCall = runCalls.map((call) => call.method).lastIndexOf("range");
    expect(runCalls.filter((call) => ["eq", "or", "gte", "lte", "order"].includes(call.method)).every((call) => runCalls.indexOf(call) < rangeCall)).toBe(true);
    expect(runCalls).toContainEqual({ table: "payroll_runs", method: "eq", args: ["tenant_id", tenantId] });
    expect(runCalls).toContainEqual({ table: "payroll_runs", method: "eq", args: ["payroll_month", "2026-09"] });
    expect(runCalls).toContainEqual({ table: "payroll_runs", method: "eq", args: ["status", "PENDING"] });
    expect(runCalls.some((call) => call.method === "or" && String(call.args[0]).includes("created_by.in.(creator-a)"))).toBe(true);
    expect(runCalls).toContainEqual({ table: "payroll_runs", method: "gte", args: ["run_date", "2026-10-01"] });
    expect(runCalls).toContainEqual({ table: "payroll_runs", method: "lte", args: ["run_date", "2026-10-31"] });
    expect(runCalls).toContainEqual({ table: "payroll_runs", method: "range", args: [10, 19] });
    expect(calls.filter((call) => call.table === "users").every((call) => call.method !== "eq" || call.args[0] !== "tenant_id" || call.args[1] === tenantId)).toBe(true);
    expect(calls.some((call) => ["insert", "update", "delete"].includes(call.method))).toBe(false);
  });

  it("defaults to newest run date then newest payroll month and caps unsupported page sizes", async () => {
    const { service, calls } = makeService();
    const result = await service.getPayrollRuns(tenantId, { page: 0, limit: 500 });
    expect(result).toMatchObject({ page: 1, limit: 25 });
    const runCalls = calls.filter((call) => call.table === "payroll_runs");
    expect(runCalls).toContainEqual({ table: "payroll_runs", method: "order", args: ["run_date", { ascending: false }] });
    expect(runCalls).toContainEqual({ table: "payroll_runs", method: "order", args: ["payroll_month", { ascending: false }] });
    expect(runCalls).toContainEqual({ table: "payroll_runs", method: "order", args: ["created_at", { ascending: false }] });
  });

  it("searches by the visible short run reference", async () => {
    const { service, calls } = makeService();
    await service.getPayrollRuns(tenantId, { search: "RUN-10000000" });
    const runSearch = calls.find((call) => call.table === "payroll_runs" && call.method === "or");
    expect(runSearch?.args[0]).toContain("id.in.(10000000-0000-0000-0000-000000000001)");
  });

  it("sorts ascending when requested and rejects statuses outside the payroll domain", async () => {
    const { service, calls } = makeService();
    await service.getPayrollRuns(tenantId, { sortBy: "status", sortDirection: "asc", status: "PROCESSING" });
    const runCalls = calls.filter((call) => call.table === "payroll_runs");
    expect(runCalls).toContainEqual({ table: "payroll_runs", method: "order", args: ["status", { ascending: true }] });
    expect(runCalls.some((call) => call.method === "eq" && call.args[0] === "status")).toBe(false);
  });
});
