import { ActionOperatorService } from "./action-operator.service";

describe("Governed Action Operator service", () => {
  const tenant = "11111111-1111-4111-8111-111111111111",
    owner = "22222222-2222-4222-8222-222222222222",
    itemId = "33333333-3333-4333-8333-333333333333",
    planId = "44444444-4444-4444-8444-444444444444",
    other = "55555555-5555-4555-8555-555555555555";
  const actor = {
    tenantId: tenant,
    userId: owner,
    permissions: [
      "items:read",
      "purchase_requisitions:create",
      "purchase_requisitions:read",
      "reports:read",
      "inventory:read",
    ],
  };
  let service: ActionOperatorService,
    masters: any[],
    findings: any[],
    plans: any[],
    doctor: any,
    brain: any,
    reporting: any,
    documents: any,
    requisitions: any;
  const request = () => ({
    message: "Create a PR for this item",
    brain_context: {
      tenant_id: tenant,
      profile: "MIZANTRA",
      current_user_id: owner,
      entity_type: "item",
      entity_id: itemId,
    },
    inputs: {
      quantity: 3,
      department: "PRODUCTION",
      requiredDate: "2099-01-01",
    },
  });
  const binding = (plan: any) => ({
    checksum: plan.checksum,
    build_sha: plan.build_sha,
    expires_at: plan.expires_at,
    action_key: plan.action_key,
    confirm: true,
  });
  const create = async (body: any = request()) =>
    (await service.createPlan(actor, body)).action_operator_plan;
  beforeEach(() => {
    Object.assign(process.env, {
      SUPABASE_URL: "http://localhost:54321",
      SUPABASE_KEY: "test-key",
      ERP_TENANT_PROFILE: "MIZANTRA",
      BUILD_GIT_SHA: "a".repeat(40),
      MIZANTRA_ACTION_OPERATOR_ENABLED: "true",
      MIZANTRA_ACTION_PR_ENABLED: "true",
      MIZANTRA_ACTION_PLANNER_MODE: "APPROVAL_REQUIRED",
      MIZANTRA_DATA_DOCTOR_ENABLED: "true",
    });
    masters = [
      {
        id: itemId,
        tenant_id: tenant,
        code: "RM-1",
        name: "Material",
        uom: "PCS",
        is_active: true,
        is_verified: true,
        updated_at: null,
      },
    ];
    findings = [];
    plans = [];
    doctor = {
      inspectEvidence: jest.fn().mockResolvedValue({ diagnoses: [] }),
    };
    brain = {
      validateContext: jest.fn(async (_user: any, context: any) => {
        if (
          context.tenant_id !== tenant ||
          context.current_user_id !== owner ||
          context.profile !== "MIZANTRA"
        )
          throw Error("Unauthorized context");
        return { context };
      }),
      withDiagnosticEvidence: jest.fn(
        async (_user: any, _context: any, inspect: any) => inspect({}),
      ),
    };
    reporting = {
      actionItems: jest
        .fn()
        .mockResolvedValue({
          item_ids: [itemId],
          version: "live-version",
          plan: { dataset: "ITEMS" },
        }),
    };
    documents = {
      get: jest
        .fn()
        .mockResolvedValue({
          id: other,
          version: 1,
          review_required: false,
          extraction: {
            classification_confidence: "HIGH",
            lines: [
              {
                source_item_code: { value: "RM-1", confidence: "HIGH" },
                quantity: { value: 3, confidence: "HIGH" },
                uom: { value: "PCS", confidence: "HIGH" },
              },
            ],
          },
        }),
    };
    requisitions = {
      checkDuplicates: jest.fn().mockResolvedValue({ hasDuplicates: false }),
      create: jest.fn(
        async (_tenant: any, _owner: any, data: any, control: any) => {
          await control.revalidate();
          const plan = plans.find((row) => row.id === control.planId);
          plan.status = "COMPLETED";
          plan.result = {
            status: "DRAFT",
            pr_id: other,
            line_count: data.items.length,
          };
          return plan.result;
        },
      ),
      submit: jest.fn(),
      approve: jest.fn(),
      createRFQ: jest.fn(),
    };
    service = new ActionOperatorService(
      requisitions,
      brain,
      doctor,
      reporting,
      documents,
    );
    (service as any).db = {
      from: jest.fn((table: string) => {
        let rows =
          table === "items"
            ? masters
            : table === "autoqa_findings"
              ? findings
              : plans;
        const query: any = {
          select: () => query,
          eq: (key: string, value: any) => {
            rows = rows.filter((row) => row[key] === value);
            return query;
          },
          in: (key: string, values: any[]) => {
            rows = rows.filter((row) => values.includes(row[key]));
            return query;
          },
          limit: () => query,
          maybeSingle: async () => ({ data: rows[0] || null, error: null }),
          then: (resolve: any, reject: any) =>
            Promise.resolve({ data: rows, error: null }).then(resolve, reject),
        };
        return query;
      }),
      rpc: jest.fn(async (name: string, args: any) => {
        if (name === "mizantra_operator_create_plan") {
          const plan = {
            id: planId,
            tenant_id: tenant,
            profile: "MIZANTRA",
            requester_id: owner,
            action_key: args.p_action,
            risk: args.p_risk,
            status: args.p_status,
            payload: args.p_payload,
            checksum: args.p_checksum,
            build_sha: args.p_build,
            expires_at: args.p_expiry,
          };
          plans.push(plan);
          return { data: plan, error: null };
        }
        const plan = plans.find((row) => row.id === args.p_id);
        let claimed = false;
        if (args.p_event === "APPROVE") plan.status = "APPROVED";
        else if (args.p_event === "CLAIM") {
          claimed = plan.status === "APPROVED";
          plan.status = "EXECUTING";
        } else if (args.p_event === "FAIL") {
          plan.status = "FAILED";
          plan.result = args.p_evidence;
        } else if (args.p_event === "EXPIRE") plan.status = "EXPIRED";
        else if (
          args.p_event === "CANCEL" &&
          !["COMPLETED", "EXECUTING"].includes(plan.status)
        )
          plan.status = "CANCELLED";
        return {
          data: { plan, claimed, cancelled: plan.status === "CANCELLED" },
          error: null,
        };
      }),
    };
  });
  it("natural-language and context planning uses real masters with zero business writes", async () => {
    const plan = await create({
      ...request(),
      inputs: {},
      message:
        "Create a PR for item RM-1 quantity 3 department Production required date 2099-01-01",
      brain_context: null,
    });
    expect(plan.status).toBe("READY_FOR_APPROVAL");
    expect(plan.payload.inputs.items[0]).toMatchObject({
      itemId,
      uom: "PCS",
      requestedQty: 3,
    });
    expect(requisitions.create).not.toHaveBeenCalled();
  });
  it("requires missing quantity, department and required date", async () => {
    const plan = await create({ ...request(), inputs: {} });
    expect(plan.status).toBe("NEEDS_INPUT");
    expect(plan.payload.warnings).toEqual(
      expect.arrayContaining([
        "QUANTITY_REQUIRED",
        "DEPARTMENT_REQUIRED",
        "REQUIRED_DATE_REQUIRED",
      ]),
    );
  });
  it("blocks missing master UOM", async () => {
    masters[0].uom = null;
    expect((await create()).payload.warnings).toContain("UOM_REQUIRED");
  });
  it("requeries the semantic report instead of trusting browser rows", async () => {
    await create({
      ...request(),
      brain_context: null,
      session_id: other,
      rows: [{ item_id: "forged" }],
    });
    expect(reporting.actionItems).toHaveBeenCalledWith(
      actor,
      expect.objectContaining({ session_id: other }),
    );
  });
  it("below-reorder does not derive an invented replenishment amount", async () => {
    const plan = await create({
      ...request(),
      brain_context: null,
      message: "Create PRs for raw materials below reorder level",
      inputs: { department: "PRODUCTION", requiredDate: "2099-01-01" },
    });
    expect(reporting.actionItems).toHaveBeenCalledWith(
      actor,
      expect.objectContaining({ below_reorder: true }),
    );
    expect(plan.payload.warnings).toContain("QUANTITY_REQUIRED");
  });
  it("allows analysis but denies approval without PR_CREATE", async () => {
    const reader = { ...actor, permissions: ["items:read"] };
    const plan = (await service.createPlan(reader, request()))
      .action_operator_plan;
    await expect(
      service.approve(reader, plan.id, binding(plan)),
    ).rejects.toThrow("purchase_requisitions:create");
  });
  it("never resolves a foreign tenant item", async () => {
    masters[0].tenant_id = other;
    expect((await create()).status).toBe("NEEDS_INPUT");
    expect(requisitions.create).not.toHaveBeenCalled();
  });
  it("never retrieves a foreign owner plan", async () => {
    const plan = await create();
    await expect(
      service.get({ ...actor, userId: other }, plan.id),
    ).rejects.toThrow("scope");
  });
  it("requires explicit approval and a bound checksum", async () => {
    const plan = await create();
    await expect(
      service.execute(actor, plan.id, binding(plan)),
    ).rejects.toThrow("EXPLICIT_APPROVAL_REQUIRED");
    await expect(
      service.approve(actor, plan.id, { ...binding(plan), confirm: false }),
    ).rejects.toThrow("Explicit approval");
    await expect(
      service.approve(actor, plan.id, {
        ...binding(plan),
        checksum: "changed",
      }),
    ).rejects.toThrow("PLAN_CHANGED_REVIEW_REQUIRED");
  });
  it("invalidates execution after material master data changes", async () => {
    const plan = await create();
    await service.approve(actor, plan.id, binding(plan));
    masters[0].uom = "KG";
    await expect(
      service.execute(actor, plan.id, binding(plan)),
    ).rejects.toThrow("PLAN_CHANGED_REVIEW_REQUIRED");
    expect(requisitions.create).not.toHaveBeenCalled();
  });
  it("rejects expired plans", async () => {
    const plan = await create();
    const clock = jest
      .spyOn(Date, "now")
      .mockReturnValue(Date.parse(plan.expires_at) + 1);
    try {
      await expect(
        service.approve(actor, plan.id, binding(plan)),
      ).rejects.toThrow("PLAN_EXPIRED");
    } finally {
      clock.mockRestore();
    }
  });
  it("creates only a draft through the existing service and reuses network retries", async () => {
    const plan = await create();
    await service.approve(actor, plan.id, binding(plan));
    const first = await service.execute(actor, plan.id, binding(plan));
    expect(await service.execute(actor, plan.id, binding(plan))).toEqual(first);
    expect(requisitions.create).toHaveBeenCalledTimes(1);
    expect(requisitions.create).toHaveBeenCalledWith(
      tenant,
      owner,
      expect.objectContaining({
        status: "DRAFT",
        items: [
          expect.objectContaining({ itemId, requestedQty: 3, uom: "PCS" }),
        ],
      }),
      expect.objectContaining({ planId: plan.id, checksum: plan.checksum }),
    );
    expect(requisitions.submit).not.toHaveBeenCalled();
    expect(requisitions.approve).not.toHaveBeenCalled();
    expect(requisitions.createRFQ).not.toHaveBeenCalled();
  });
  it("returns committed results when the ERP response is lost", async () => {
    const original = requisitions.create.getMockImplementation();
    requisitions.create.mockImplementation(async (...args: any[]) => {
      await original(...args);
      throw Error("Response lost");
    });
    const plan = await create();
    await service.approve(actor, plan.id, binding(plan));
    expect((await service.execute(actor, plan.id, binding(plan))).status).toBe(
      "COMPLETED",
    );
    expect(requisitions.create).toHaveBeenCalledTimes(1);
  });
  it("blocks relevant unsafe Data Doctor findings but not unrelated findings", async () => {
    doctor.inspectEvidence.mockResolvedValue({
      diagnoses: [
        {
          severity: "HIGH",
          entity: { entity_id: itemId },
          diagnosis_key: "MASTER_UNSAFE",
        },
      ],
    });
    expect((await create()).payload.blocked_rows).toContainEqual(
      expect.objectContaining({ reason: "DATA_DOCTOR_BLOCK" }),
    );
    doctor.inspectEvidence.mockResolvedValue({
      diagnoses: [
        {
          severity: "HIGH",
          entity: { entity_id: other },
          diagnosis_key: "UNRELATED",
        },
      ],
    });
    expect((await create()).status).toBe("READY_FOR_APPROVAL");
  });
  it("blocks only deterministically relevant active Critical/High AutoQA records", async () => {
    findings.push({
      id: other,
      tenant_id: tenant,
      profile: "MIZANTRA",
      entity_type: "item",
      entity_id: itemId,
      severity: "HIGH",
      status: "OPEN",
    });
    expect((await create()).payload.blocked_rows).toContainEqual(
      expect.objectContaining({ reason: "RELEVANT_AUTOQA_BLOCK" }),
    );
    findings[0].entity_id = other;
    expect((await create()).status).toBe("READY_FOR_APPROVAL");
  });
  it("does not bypass Smart Import verification of masters", async () => {
    masters[0].is_verified = false;
    expect((await create()).payload.blocked_rows).toContainEqual(
      expect.objectContaining({ reason: "ACTIVE_VERIFIED_MASTER_REQUIRED" }),
    );
    masters[0].is_verified = true;
    expect((await create()).status).toBe("READY_FOR_APPROVAL");
  });
  it("uses high-confidence reviewed document facts only", async () => {
    const body = {
      ...request(),
      document_ids: [other],
      inputs: { department: "PRODUCTION", requiredDate: "2099-01-01" },
    };
    expect((await create(body)).payload.inputs.items[0].requestedQty).toBe(3);
    documents.get.mockResolvedValue({
      id: other,
      version: 2,
      review_required: true,
      extraction: { classification_confidence: "LOW", lines: [] },
    });
    expect((await create(body)).payload.blocked_rows).toContainEqual(
      expect.objectContaining({ reason: "DOCUMENT_REVIEW_REQUIRED" }),
    );
  });
  it("offers AutoEngineer after a software failure without patching during execution", async () => {
    requisitions.create.mockRejectedValue(Error("Software defect"));
    const plan = await create();
    await service.approve(actor, plan.id, binding(plan));
    expect(
      (await service.execute(actor, plan.id, binding(plan))).result
        .autoengineer_handoff,
    ).toMatchObject({ offered: true, patch_during_execution: false });
  });
  it("keeps RFQ planning non-executable without a genuine draft state", async () => {
    const plan = await create({
      ...request(),
      message: "Create RFQ from this PR",
    });
    expect(plan.payload.warnings).toContain("SAFE_DRAFT_RFQ_NOT_AVAILABLE");
    await expect(
      service.approve(actor, plan.id, binding(plan)),
    ).rejects.toThrow();
    expect(requisitions.createRFQ).not.toHaveBeenCalled();
  });
  it.each([
    "Create a PO",
    "Create a PR then submit it",
    "Delete this accounting transaction",
  ])("blocks unsupported risk escalation: %s", async (message) => {
    const plan = await create({ ...request(), message });
    expect(plan.action_key).toBe("PLAN_ONLY");
    expect(plan.status).toBe("NEEDS_INPUT");
    await expect(
      service.approve(actor, plan.id, binding(plan)),
    ).rejects.toThrow();
  });
  it("cancels without deleting business records", async () => {
    const plan = await create();
    expect(
      (await service.cancel(actor, plan.id, binding(plan))).plan.status,
    ).toBe("CANCELLED");
    expect(requisitions.create).not.toHaveBeenCalled();
  });
  it("binds metadata columns as well as payload inputs", async () => {
    const plan = await create();
    plan.expires_at = "2099-01-01";
    await expect(
      service.approve(actor, plan.id, binding(plan)),
    ).rejects.toThrow("PLAN_CHANGED_REVIEW_REQUIRED");
  });
  it("rejects mutation of reviewed input values", async () => {
    const plan = await create();
    plan.payload.inputs.items[0].requestedQty = 4;
    await expect(
      service.approve(actor, plan.id, binding(plan)),
    ).rejects.toThrow("PLAN_CHANGED_REVIEW_REQUIRED");
  });
  it("rejects arbitrary input mutations outside the registry", async () => {
    await expect(
      create({
        ...request(),
        inputs: { ...request().inputs, status: "SUBMITTED" },
      }),
    ).rejects.toThrow("registered PR inputs");
  });
  it("revalidates report versions before execution", async () => {
    const plan = await create({
      ...request(),
      brain_context: null,
      session_id: other,
    });
    await service.approve(actor, plan.id, binding(plan));
    reporting.actionItems.mockResolvedValue({
      item_ids: [itemId],
      version: "changed",
      plan: { dataset: "ITEMS" },
    });
    await expect(
      service.execute(actor, plan.id, binding(plan)),
    ).rejects.toThrow("PLAN_CHANGED_REVIEW_REQUIRED");
  });
  it("revalidates document versions before execution", async () => {
    const plan = await create({ ...request(), document_ids: [other] });
    await service.approve(actor, plan.id, binding(plan));
    const document = await documents.get();
    documents.get.mockResolvedValue({ ...document, version: 2 });
    await expect(
      service.execute(actor, plan.id, binding(plan)),
    ).rejects.toThrow("PLAN_CHANGED_REVIEW_REQUIRED");
  });
  it("does not allocate one global quantity among multiple selected items", async () => {
    masters.push({ ...masters[0], id: other, code: "RM-2" });
    const plan = await create({
      ...request(),
      brain_context: null,
      item_ids: [itemId, other],
    });
    expect(plan.payload.warnings).toContain("QUANTITY_REQUIRED");
  });
  it("preserves explicit support requests instead of treating them as actions", async () => {
    expect(
      await service.interpret(actor, {
        ...request(),
        support_mode: "support",
        message: "Create PR button is broken",
      }),
    ).toBeNull();
  });
  it("routes normal contextual PR requests into the governed planner", async () => {
    expect(await service.interpret(actor, request())).toMatchObject({
      provider: "MIZANTRA_ACTION_OPERATOR_V1",
    });
  });
  it("recovers an explicit retry after the original claim response was lost", async () => {
    const plan = await create();
    await service.approve(actor, plan.id, binding(plan));
    plan.status = "EXECUTING";
    expect((await service.execute(actor, plan.id, binding(plan))).status).toBe(
      "COMPLETED",
    );
    expect(requisitions.create).toHaveBeenCalledTimes(1);
  });
  it("checks evidence again in the existing ERP service immediately before commit", async () => {
    const original = requisitions.create.getMockImplementation();
    requisitions.create.mockImplementation(async (...args: any[]) => {
      masters[0].uom = "KG";
      return original(...args);
    });
    const plan = await create();
    await service.approve(actor, plan.id, binding(plan));
    expect(
      (await service.execute(actor, plan.id, binding(plan))).result.code,
    ).toBe("PLAN_CHANGED_REVIEW_REQUIRED");
    expect(plan.status).toBe("FAILED");
  });
});
