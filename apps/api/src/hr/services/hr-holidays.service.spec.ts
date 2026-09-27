import { BadRequestException, ConflictException, NotFoundException } from "@nestjs/common";
import { HrService } from "./hr.service";

describe("HR holiday updates", () => {
  const tenantId = "tenant-a";
  const existingHoliday = (overrides: Record<string, unknown> = {}) => ({
    id: "holiday-a",
    tenant_id: tenantId,
    holiday_name: "Founders Day",
    start_date: "2026-09-10",
    end_date: null,
    holiday_type: "PUBLIC",
    notes: null,
    ...overrides,
  });

  const makeService = (initialRows: any[] = []) => {
    const rows = initialRows.map((row) => ({ ...row }));
    const updates: Array<{ filters: Record<string, unknown>; values: any }> = [];
    const inserts: any[] = [];
    const service = Object.create(HrService.prototype) as any;
    service.supabase = {
      rpc: jest.fn().mockResolvedValue({ error: { message: "exec_sql is unavailable" } }),
      from: jest.fn(() => ({
        select: jest.fn(() => {
          const query: any = {
            eq: jest.fn(() => query),
            then: (resolve: any, reject: any) =>
              Promise.resolve({ data: rows.map((row) => ({ ...row })), error: null }).then(resolve, reject),
          };
          return query;
        }),
        update: jest.fn((values: any) => {
          const filters: Record<string, unknown> = {};
          const query: any = {
            eq: jest.fn((key: string, value: unknown) => {
              filters[key] = value;
              return query;
            }),
            select: jest.fn(() => query),
            maybeSingle: jest.fn(async () => {
              updates.push({ filters, values });
              const row = rows.find(
                (item) => item.id === filters.id && item.tenant_id === filters.tenant_id,
              );
              if (!row) return { data: null, error: null };
              Object.assign(row, values);
              return { data: { ...row }, error: null };
            }),
          };
          return query;
        }),
        insert: jest.fn((values: any) => {
          inserts.push(values);
          const row = { ...values };
          rows.push(row);
          return { select: jest.fn(() => ({ single: jest.fn().mockResolvedValue({ data: { ...row }, error: null }) })) };
        }),
      })),
    };
    return { service, rows, updates, inserts };
  };

  const payload = (overrides: Record<string, unknown> = {}) => ({
    holiday_name: "Founders Day",
    start_date: "2026-09-10",
    end_date: null,
    holiday_type: "PUBLIC",
    notes: "",
    ...overrides,
  });

  it("updates a holiday name and returns the saved record", async () => {
    const { service, rows, inserts } = makeService([existingHoliday()]);
    const updated = await service.updateHoliday(tenantId, "holiday-a", payload({ holiday_name: "Company Day" }));
    expect(updated.holiday_name).toBe("Company Day");
    expect(rows).toHaveLength(1);
    expect(inserts).toHaveLength(0);
  });

  it("updates a holiday date", async () => {
    const { service, rows } = makeService([existingHoliday()]);
    const updated = await service.updateHoliday(tenantId, "holiday-a", payload({ start_date: "2026-09-11" }));
    expect(updated.start_date).toBe("2026-09-11");
    expect(rows[0].start_date).toBe("2026-09-11");
  });

  it("filters by the owning tenant and never writes tenant ownership from the request", async () => {
    const { service, updates } = makeService([existingHoliday()]);
    await service.updateHoliday(tenantId, "holiday-a", payload());
    expect(updates[0].filters).toMatchObject({ tenant_id: tenantId, id: "holiday-a" });
    expect(updates[0].values).not.toHaveProperty("tenant_id");
  });

  it("returns a controlled 404 for a missing holiday", async () => {
    const { service } = makeService();
    await expect(service.updateHoliday(tenantId, "missing-id", payload())).rejects.toBeInstanceOf(NotFoundException);
  });

  it("rejects an overlapping holiday date with a clear conflict", async () => {
    const { service } = makeService([
      existingHoliday(),
      existingHoliday({ id: "holiday-b", holiday_name: "Other Day", start_date: "2026-09-11" }),
    ]);
    await expect(
      service.updateHoliday(tenantId, "holiday-a", payload({ start_date: "2026-09-11" })),
    ).rejects.toMatchObject({
      status: 409,
      response: { message: "A holiday already exists for this date." },
    });
  });

  it("rejects an invalid calendar date with a controlled 400", async () => {
    const { service } = makeService([existingHoliday()]);
    await expect(
      service.updateHoliday(tenantId, "holiday-a", payload({ start_date: "2026-02-30" })),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it("updates a real row without inserting a duplicate", async () => {
    const { service, rows, inserts, updates } = makeService([existingHoliday()]);
    await service.updateHoliday(tenantId, "holiday-a", payload({ holiday_name: "Updated Day" }));
    expect(updates).toHaveLength(1);
    expect(inserts).toHaveLength(0);
    expect(rows).toHaveLength(1);
  });

  it("materializes one legacy default holiday and lists its updated value", async () => {
    const { service, rows, inserts, updates } = makeService();
    const first = await service.updateHoliday(
      tenantId,
      "default-2026-11",
      payload({ holiday_name: "Vinayaka Chavithi Celebration", start_date: "2026-08-22" }),
    );
    expect(first.holiday_name).toBe("Vinayaka Chavithi Celebration");
    expect(inserts).toHaveLength(1);

    await service.updateHoliday(
      tenantId,
      "default-2026-11",
      payload({ holiday_name: "Vinayaka Chavithi Observed", start_date: "2026-08-22" }),
    );
    expect(inserts).toHaveLength(1);
    expect(updates).toHaveLength(1);
    expect(rows).toHaveLength(1);

    const list = await service.getHolidays(tenantId, 2026);
    expect(list.find((holiday: any) => holiday.id === first.id)).toMatchObject({
      holiday_name: "Vinayaka Chavithi Observed",
      start_date: "2026-08-22",
    });
    expect(list).toHaveLength(16);
  });
});
