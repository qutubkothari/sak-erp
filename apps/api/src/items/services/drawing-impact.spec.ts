import { ItemsService } from "./items.service";

describe("drawing impact on optional legacy schemas", () => {
  function setup(jobError: any, demandError: any, retryError: any = null) {
    process.env.SUPABASE_URL ||= "https://example.supabase.co";
    process.env.SUPABASE_KEY ||= "test-key";
    const service = new ItemsService({} as any);
    const queries: any[] = [];
    (service as any).supabase = {
      from: jest.fn((table: string) => {
        const query: any = { table };
        let columns = "";
        query.select = jest.fn((value) => { columns = value; return query; });
        query.eq = jest.fn(() => query);
        query.not = jest.fn(() => query);
        query.maybeSingle = jest.fn(() => query);
        query.then = (resolve: any) => resolve(
          table === "item_drawings" ? { data: null, error: null } :
          table === "project_work_package_lines" ? { data: null, error: demandError } :
          columns.includes("drawing_revision_id") && jobError ? { data: null, error: jobError } :
          { data: [{ id: "job-1", drawing_revision_id: "previous" }], error: retryError },
        );
        queries.push(query);
        return query;
      }),
    };
    return { service, queries };
  }

  const missingColumn = { code: "42703", message: "column production_job_orders.drawing_revision_id does not exist" };
  const missingModule = { code: "PGRST205", message: "Could not find the table 'public.project_work_package_lines' in the schema cache" };

  it("still warns about open jobs when optional revision and project features are absent", async () => {
    const { service, queries } = setup(missingColumn, missingModule);
    const result = await service.getDrawingImpact("tenant-1", "item-1", "new");
    expect(result.open_job_count).toBe(1);
    expect(result.open_project_demand_count).toBe(0);
    expect(result.revision_tracking_available).toBe(false);
    expect(result.project_demand_available).toBe(false);
    expect(result.warning).toContain("review all open jobs before approving");
    expect(queries[3].eq).toHaveBeenCalledWith("tenant_id", "tenant-1");
    expect(queries[3].eq).toHaveBeenCalledWith("item_id", "item-1");
    expect(queries[3].not).toHaveBeenCalledWith("status", "in", "(COMPLETED,CANCELLED,STOPPED)");
  });

  it("preserves revision impact on fully installed schemas", async () => {
    const { service } = setup(null, null);
    const result = await service.getDrawingImpact("tenant-1", "item-1", "new");
    expect(result.frozen_open_jobs).toHaveLength(1);
    expect(result.revision_tracking_available).toBe(true);
    expect(result.project_demand_available).toBe(true);
  });

  it.each([
    [{ code: "42501", message: "permission denied" }, null, null],
    [null, { code: "57014", message: "query timeout" }, null],
    [missingColumn, missingModule, { message: "retry failed" }],
  ])("does not hide permission, connection, or retry failures", async (job, demand, retry) => {
    const { service } = setup(job, demand, retry);
    await expect(service.getDrawingImpact("tenant-1", "item-1")).rejects.toThrow();
  });
});
