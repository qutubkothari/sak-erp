import { HrController } from "./hr.controller";

describe("HR salary component collection read", () => {
  it("loads tenant-scoped salary rows through the existing read model", async () => {
    const rows = [{ id: "salary-1", employee_id: "employee-1", component_type: "CTC", amount: 1000 }];
    const hrService = { getSalaryComponents: jest.fn().mockResolvedValue(rows) };
    const controller = new HrController(hrService as any, {} as any, {} as any);

    await expect(controller.getAllSalaryComponents({ user: { tenantId: "tenant-1" } })).resolves.toBe(rows);
    expect(hrService.getSalaryComponents).toHaveBeenCalledTimes(1);
    expect(hrService.getSalaryComponents).toHaveBeenCalledWith("tenant-1");
  });
});
