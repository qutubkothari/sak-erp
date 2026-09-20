import {
  normalizeComponentSupplyPolicy,
  planComponentSupply,
} from "./component-supply-policy";

describe("component supply policy", () => {
  it("creates a child build only for the net manufactured shortage", () => {
    expect(
      planComponentSupply({
        requiredQuantity: 100,
        availableQuantity: 20,
        scheduledSupplyQuantity: 15,
        supplyPolicy: "MAKE",
        hasBom: true,
      }),
    ).toMatchObject({
      action: "BUILD",
      stockUsedQuantity: 20,
      scheduledSupplyUsedQuantity: 15,
      shortageQuantity: 65,
      createJobOrder: true,
      childExplosionQuantity: 65,
    });
  });

  it("never creates a job order for purchased or subcontracted assemblies", () => {
    expect(
      planComponentSupply({
        requiredQuantity: 100,
        availableQuantity: 20,
        supplyPolicy: "BUY",
        hasBom: true,
      }),
    ).toMatchObject({
      action: "BUY",
      shortageQuantity: 80,
      createJobOrder: false,
    });
    expect(
      planComponentSupply({
        requiredQuantity: 100,
        availableQuantity: 20,
        supplyPolicy: "SUBCONTRACT",
        hasBom: true,
      }),
    ).toMatchObject({
      action: "SUBCONTRACT",
      shortageQuantity: 80,
      createJobOrder: false,
    });
  });

  it("explodes phantom assemblies without creating stock or a job order", () => {
    expect(
      planComponentSupply({
        requiredQuantity: 100,
        availableQuantity: 999,
        supplyPolicy: "PHANTOM",
        hasBom: true,
      }),
    ).toMatchObject({
      policy: "PHANTOM",
      stockUsedQuantity: 0,
      scheduledSupplyUsedQuantity: 0,
      createJobOrder: false,
      explodeChildren: true,
      childExplosionQuantity: 100,
    });
  });

  it("uses safe AUTO defaults", () => {
    expect(normalizeComponentSupplyPolicy("", true)).toBe("AUTO");
    expect(
      planComponentSupply({
        requiredQuantity: 10,
        availableQuantity: 0,
        hasBom: true,
      }).action,
    ).toBe("BUILD");
    expect(
      planComponentSupply({
        requiredQuantity: 10,
        availableQuantity: 0,
        hasBom: false,
      }).action,
    ).toBe("ISSUE");
  });
});
