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
      order,
    };
    (createClient as jest.Mock).mockReturnValue({ from: jest.fn(() => query) });
    const service = new SupportStoreService(
      { logActivity: jest.fn() } as any,
      {} as any,
    );

    const result = await service.listMine("tenant-a", "reporter-a");

    expect(filters).toEqual([
      ["tenant_id", "tenant-a"],
      ["reported_by", "reporter-a"],
    ]);
    expect(query.select).toHaveBeenCalledWith(
      "id,title,module,status,created_at,updated_at,occurrence_count",
    );
    expect(result).toEqual([
      { id: "owned", title: "My issue", module: "Purchasing", status: "NEW" },
    ]);
  });
});
