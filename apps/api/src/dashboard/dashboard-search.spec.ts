import {
  dashboardSearchResources,
  normalizeDashboardSearchQuery,
} from "./dashboard.service";

describe("dashboard global search controls", () => {
  it("normalizes unsafe PostgREST punctuation and caps input length", () => {
    expect(normalizeDashboardSearchQuery("  JO-42,(status.eq.OPEN)  ")).toBe(
      "JO-42 status.eq.OPEN",
    );
    expect(normalizeDashboardSearchQuery("x".repeat(100))).toHaveLength(80);
  });

  it("only enables record sources covered by the user's permissions", () => {
    const user = {
      tenantId: "tenant-1",
      permissions: [
        { module: "Production", view: true },
        { module: "Sales Management", view: true },
      ],
    };
    const resources = dashboardSearchResources(user);
    expect(resources).toContain("job_orders");
    expect(resources).toContain("crm");
    expect(resources).not.toContain("purchase_orders");
    expect(resources).not.toContain("items");
  });
});
