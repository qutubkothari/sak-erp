import { SupportAutofixService } from "./support-autofix.service";

describe("SupportAutofixService.listMine status contract", () => {
  it("returns the raw ESCALATED code and its friendly status for the authenticated owner", async () => {
    const store = {
      listMine: jest.fn().mockResolvedValue([
        {
          id: "existing-incident",
          title: "PO search issue",
          module: "Purchase Orders",
          status: "ESCALATED",
          created_at: "2026-09-29T07:21:15.000Z",
          updated_at: "2026-09-29T07:21:50.000Z",
        },
      ]),
      countMine: jest.fn().mockResolvedValue({ ACTIVE: 1, RESOLVED: 0, ARCHIVED: 0 }),
    };
    const service = Object.create(SupportAutofixService.prototype) as any;
    service.store = store;

    await expect(
      service.listMine({ tenantId: "tenant-a", userId: "reporter-a" }),
    ).resolves.toMatchObject({
      issues: [{ id: "existing-incident", status: "ESCALATED", friendly_status: "Engineering review required" }],
      counts: { ACTIVE: 1, RESOLVED: 0, ARCHIVED: 0 },
      lifecycle: "ACTIVE",
    });
    expect(store.listMine).toHaveBeenCalledWith("tenant-a", "reporter-a", "ACTIVE");
  });
});
