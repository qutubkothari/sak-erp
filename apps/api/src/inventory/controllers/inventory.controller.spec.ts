import { Reflector } from "@nestjs/core";
import { RolesGuard } from "../../auth/guards/roles.guard";
import { InventoryController } from "./inventory.controller";

describe("InventoryController drawing deletion authorization", () => {
  const handler = InventoryController.prototype.deleteItemDrawing;
  const guard = new RolesGuard(new Reflector());

  const contextFor = (roleName: string) =>
    ({
      getHandler: () => handler,
      getClass: () => InventoryController,
      switchToHttp: () => ({
        getRequest: () => ({ user: { roles: [{ role: { name: roleName } }] } }),
      }),
    }) as any;

  it("allows the Super Admin role", () => {
    expect(guard.canActivate(contextFor("Super Admin"))).toBe(true);
  });

  it("rejects ordinary Admin and user roles", () => {
    expect(guard.canActivate(contextFor("Admin"))).toBe(false);
    expect(guard.canActivate(contextFor("Inventory User"))).toBe(false);
  });
});
