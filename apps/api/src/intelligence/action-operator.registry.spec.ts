import {
  draftPrPreview,
  operatorChecksum,
  operatorFlags,
  operatorIntent,
  operatorRisk,
  OPERATOR_ACTIONS,
  positiveQuantity,
} from "./action-operator.registry";

describe("Action Operator closed registry", () => {
  const inputs = {
    department: "PRODUCTION",
    requiredDate: "2099-01-01",
    items: [
      {
        itemId: "item-1",
        itemCode: "RM-1",
        itemName: "Material",
        uom: "PCS",
        requestedQty: 3,
        evidence: {},
      },
    ],
  };
  it("registers only the requested PR and non-executable RFQ actions", () => {
    expect(Object.keys(OPERATOR_ACTIONS)).toEqual([
      "CREATE_DRAFT_PR",
      "CREATE_DRAFT_RFQ_FROM_PR",
    ]);
    expect(
      OPERATOR_ACTIONS.CREATE_DRAFT_RFQ_FROM_PR.execution_handler,
    ).toBeNull();
  });
  it.each([
    "Create a PR for this item.",
    "Create a PR for these items.",
    "Prepare a PR from this report.",
    "Create PRs for raw materials below reorder level.",
    "Prepare an RFQ from this PR.",
  ])("recognizes governed request: %s", (message) =>
    expect(operatorIntent(message)).toBe(true),
  );
  it.each([null, undefined, "", "3", 0, -1, NaN, Infinity, true])(
    "does not invent a quantity from %p",
    (value) => expect(positiveQuantity(value)).toBeNull(),
  );
  it("previews exact draft effects without workflow advancement", () => {
    expect(draftPrPreview(inputs)).toMatchObject({
      status: "READY_FOR_APPROVAL",
      autonomous_execution: false,
      expected_effects: {
        draft_pr: 1,
        pr_lines: 1,
        po: 0,
        grn: 0,
        stock_movement: 0,
        accounting: 0,
        submission: 0,
        approval: 0,
        rfq: 0,
      },
    });
  });
  it("requires a real quantity", () =>
    expect(
      draftPrPreview({
        ...inputs,
        items: [{ ...inputs.items[0], requestedQty: null }],
      }).warnings,
    ).toContain("QUANTITY_REQUIRED"));
  it("requires UOM", () =>
    expect(
      draftPrPreview({ ...inputs, items: [{ ...inputs.items[0], uom: null }] })
        .warnings,
    ).toContain("UOM_REQUIRED"));
  it("does not silently exclude blocked records", () =>
    expect(draftPrPreview(inputs, [{ itemId: "unsafe" }]).status).toBe(
      "NEEDS_INPUT",
    ));
  it("checksum is order-independent for object keys but binds actual inputs", () => {
    expect(operatorChecksum({ a: 1, b: 2 })).toBe(
      operatorChecksum({ b: 2, a: 1 }),
    );
    expect(operatorChecksum(inputs)).not.toBe(
      operatorChecksum({ ...inputs, department: "R&D" }),
    );
  });
  it.each([
    "Create a PR then submit it",
    "Create a PR and approve it",
    "Create a PR and PO",
    "Create a PR and reserve stock",
  ])("keeps workflow advancement plan-only: %s", (message) =>
    expect(operatorRisk(message)).toBe("HIGH"),
  );
  it.each([
    "Create a PR and post accounting",
    "Create a PR then delete it",
    "Create a PR and change payroll",
  ])("blocks protected requests: %s", (message) =>
    expect(operatorRisk(message)).toBe("PROTECTED"),
  );
  it("defaults OFF and requires all deployment prerequisites", () => {
    expect(operatorFlags({}).enabled).toBe(false);
    expect(
      operatorFlags({
        ERP_TENANT_PROFILE: "MIZANTRA",
        MIZANTRA_ACTION_OPERATOR_ENABLED: "true",
        MIZANTRA_ACTION_PR_ENABLED: "true",
        MIZANTRA_ACTION_PLANNER_MODE: "APPROVAL_REQUIRED",
      }),
    ).toMatchObject({ enabled: true, pr: true, rfq: false });
    expect(
      operatorFlags({
        ERP_TENANT_PROFILE: "SAIFSEAS",
        MIZANTRA_ACTION_OPERATOR_ENABLED: "true",
        MIZANTRA_ACTION_PLANNER_MODE: "APPROVAL_REQUIRED",
      }).enabled,
    ).toBe(false);
  });
});
