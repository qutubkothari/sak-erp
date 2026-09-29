jest.mock("@supabase/supabase-js", () => ({ createClient: jest.fn() }));

import { createClient } from "@supabase/supabase-js";
import { SupportStoreService } from "./support-store.service";

describe("SupportStoreService.listMine", () => {
  it("scopes issue details to both the authenticated tenant and reporter", async () => {
    const limit = jest.fn().mockResolvedValue({
      data: [
        { id: "owned", title: "My issue", module: "Purchasing", status: "NEW" },
      ],
      error: null,
    });
    const order = jest.fn(() => ({ limit }));
    const filters: Array<[string, string]> = [];
    const query: any = {
      select: jest.fn(() => query),
      eq: jest.fn((column: string, value: string) => {
        filters.push([column, value]);
        return query;
      }),
      is: jest.fn(() => query),
      in: jest.fn(() => query),
      not: jest.fn(() => query),
      order,
    };
    (createClient as jest.Mock).mockReturnValue({ from: jest.fn(() => query) });
    const service = new SupportStoreService(
      { logActivity: jest.fn() } as any,
      {} as any,
    );

    const result = await service.listMine("tenant-a", "reporter-a", "ACTIVE");

    expect(filters).toEqual([
      ["tenant_id", "tenant-a"],
      ["reported_by", "reporter-a"],
    ]);
    expect(query.in).toHaveBeenCalledWith("status", expect.arrayContaining(["FAILED", "ESCALATED", "ROLLED_BACK"]));
    expect(query.select).toHaveBeenCalledWith(
      "id,title,module,status,created_at,updated_at,occurrence_count,archived_at,archived_by",
    );
    expect(result).toEqual([
      { id: "owned", title: "My issue", module: "Purchasing", status: "NEW" },
    ]);
  });

  it("updates only archive metadata and enforces reporter ownership in the tenant", async () => {
    const query: any = {
      eq: jest.fn().mockReturnThis(),
      is: jest.fn().mockReturnThis(),
      not: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      maybeSingle: jest.fn().mockResolvedValue({ data: { id: "owned", status: "ESCALATED", archived_at: "2026-09-29T10:00:00Z" }, error: null }),
    };
    const update = jest.fn(() => query);
    const service = Object.create(SupportStoreService.prototype) as any;
    service.supabase = { from: jest.fn(() => ({ update })) };

    await service.setIncidentArchived("tenant-a", "owned", "reporter-a", "reporter-a", true);

    expect(update.mock.calls[0][0]).toEqual(expect.objectContaining({ archived_by: "reporter-a", archived_at: expect.any(String) }));
    expect(update.mock.calls[0][0]).not.toHaveProperty("status");
    expect(query.eq).toHaveBeenCalledWith("tenant_id", "tenant-a");
    expect(query.eq).toHaveBeenCalledWith("id", "owned");
    expect(query.eq).toHaveBeenCalledWith("reported_by", "reporter-a");
    expect(query.is).toHaveBeenCalledWith("archived_at", null);
  });

  it("bulk archives only this reporter’s unarchived RESOLVED rows", async () => {
    const query: any = {
      eq: jest.fn().mockReturnThis(),
      is: jest.fn().mockReturnThis(),
      select: jest.fn().mockResolvedValue({ data: [{ id: "resolved-a", status: "RESOLVED" }], error: null }),
    };
    const update = jest.fn(() => query);
    const service = Object.create(SupportStoreService.prototype) as any;
    service.supabase = { from: jest.fn(() => ({ update })) };
    await expect(service.archiveResolvedMine("tenant-a", "reporter-a", "reporter-a")).resolves.toEqual([{ id: "resolved-a", status: "RESOLVED" }]);
    expect(update.mock.calls[0][0]).toEqual(expect.objectContaining({ archived_by: "reporter-a" }));
    expect(query.eq).toHaveBeenCalledWith("tenant_id", "tenant-a");
    expect(query.eq).toHaveBeenCalledWith("reported_by", "reporter-a");
    expect(query.eq).toHaveBeenCalledWith("status", "RESOLVED");
    expect(query.is).toHaveBeenCalledWith("archived_at", null);
  });
});
