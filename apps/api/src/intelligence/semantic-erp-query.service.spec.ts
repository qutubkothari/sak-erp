import { ForbiddenException } from "@nestjs/common";
import { hasAnyPermissionForResource } from "../auth/utils/permission-utils";
import {
  deterministicRecordPlan,
  explicitRecordDataset,
  SemanticErpQueryService,
  SemanticQueryPlan,
} from "./semantic-erp-query.service";

jest.mock("../auth/utils/permission-utils", () => ({
  hasAnyPermissionForResource: jest.fn(() => true),
}));

const permission = hasAnyPermissionForResource as jest.Mock;

const query = (result: any) => {
  const chain: any = {};
  for (const method of [
    "select",
    "eq",
    "in",
    "gte",
    "lte",
    "lt",
    "or",
    "order",
    "limit",
  ])
    chain[method] = jest.fn(() => chain);
  chain.then = (resolve: any) => resolve(result);
  return chain;
};

const plan = (
  overrides: Partial<SemanticQueryPlan> = {},
): SemanticQueryPlan => ({
  mode: "RECORDS",
  specialist_kind: "",
  dataset: "PURCHASE_ORDERS",
  operation: "LATEST",
  entity_query: "Asons",
  entity_is_named: true,
  statuses: [],
  date_from: "",
  date_to: "",
  sort_by: "DATE",
  sort_direction: "DESC",
  limit: 25,
  clarification: "",
  confidence: 0.96,
  ...overrides,
});

const serviceWith = (
  selectedPlan: SemanticQueryPlan | { queries: SemanticQueryPlan[] },
  tables: Record<string, any[]> = {},
  provider = "OPENAI",
) => {
  process.env.SUPABASE_URL ||= "http://localhost:54321";
  process.env.SUPABASE_KEY ||= "semantic-query-test-key";
  const ai = {
    structuredJson: jest.fn().mockResolvedValue({
      value: selectedPlan,
      provider,
      fallback_used: provider !== "OPENAI",
    }),
  };
  const specialist = { answer: jest.fn().mockResolvedValue(null) };
  const service = new SemanticErpQueryService(ai as any, specialist as any);
  (service as any).db = {
    from: jest.fn((table: string) =>
      query({ data: tables[table] || [], error: null }),
    ),
  };
  return { service, ai, specialist };
};

describe("SemanticErpQueryService", () => {
  beforeEach(() => permission.mockReturnValue(true));

  it("keeps an explicitly requested job-order register even when AI selects PRs", async () => {
    const { service } = serviceWith(
      plan({
        dataset: "PURCHASE_REQUISITIONS",
        operation: "LIST",
        entity_query: "",
        entity_is_named: false,
      }),
      {
        production_job_orders: [
          {
            id: "jo-1",
            job_order_number: "JO-2026-09-0005",
            item_code: "700-0002",
            item_name: "Rectangular GI Duct Section",
            quantity: 100,
            completed_quantity: 0,
            start_date: "2026-09-09",
            status: "DRAFT",
            created_at: "2026-09-09T10:00:00Z",
          },
        ],
      },
    );

    const answer = await service.answer(
      "tenant-1",
      { permissions: ["job_orders:read"] },
      "list all job orders",
    );

    expect(answer).toMatchObject({
      title: "Job orders",
      headline: "1 matching job orders record found.",
      rows: [expect.objectContaining({ reference: "JO-2026-09-0005" })],
    });
  });

  it("recognizes explicit governed document datasets without cross-module substitution", () => {
    expect(explicitRecordDataset("list all job orders")).toBe(
      "PRODUCTION_ORDERS",
    );
    expect(explicitRecordDataset("print today's job cards")).toBe(
      "PRODUCTION_ORDERS",
    );
    expect(explicitRecordDataset("show purchase requisitions")).toBe(
      "PURCHASE_REQUISITIONS",
    );
    expect(explicitRecordDataset("show PO-2026-09-001")).toBe(
      "PURCHASE_ORDERS",
    );
    expect(
      explicitRecordDataset("compare job orders and purchase orders"),
    ).toBeNull();
  });

  it("routes the reported BOM, SIV, machine, customer and employee prompts deterministically", () => {
    expect(deterministicRecordPlan("display all BOM")?.dataset).toBe("BOMS");
    expect(deterministicRecordPlan("display AC duct BOM")).toMatchObject({
      dataset: "BOMS",
      entity_query: "duct",
      entity_is_named: true,
    });
    expect(deterministicRecordPlan("list all SIV issued today")).toMatchObject({
      dataset: "STORE_ISSUE_VOUCHERS",
      operation: "LIST",
      date_from: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
      date_to: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
    });
    expect(
      deterministicRecordPlan("list all machines on shop floor")?.dataset,
    ).toBe("WORK_STATIONS");
    expect(deterministicRecordPlan("list all customers")?.dataset).toBe(
      "CUSTOMERS",
    );
    expect(deterministicRecordPlan("no of employees")).toMatchObject({
      dataset: "EMPLOYEES",
      operation: "COUNT",
    });
    expect(
      deterministicRecordPlan("show customer sales this month"),
    ).toBeNull();
    expect(
      deterministicRecordPlan("which employees came late today"),
    ).toBeNull();
  });

  it("preserves pending approval context when purchase orders supplies the subject", () => {
    expect(
      deterministicRecordPlan("purchase orders", {
        prior_clarification: {
          questions: ["Pending approvals for which business process?"],
          transcript: [{ role: "user", content: "pending approvals" }],
        },
      }),
    ).toMatchObject({
      dataset: "PURCHASE_ORDERS",
      statuses: ["PENDING", "PENDING_APPROVAL", "SUBMITTED"],
    });
  });

  it("keeps direct customer names and opens the customer workspace", async () => {
    const { service } = serviceWith(plan(), {
      customers: [
        {
          id: "customer-1",
          customer_code: "CUS-001",
          customer_name: "ABC Projects",
          is_active: true,
          created_at: "2026-09-01T10:00:00Z",
        },
      ],
    });
    const answer = await service.answer(
      "tenant-1",
      { permissions: ["sales:read"] },
      "list all customers",
    );
    expect(answer).toMatchObject({
      title: "Customers",
      rows: [
        expect.objectContaining({
          reference: "CUS-001",
          name: "ABC Projects",
        }),
      ],
      drill_down: {
        route: "/dashboard/sales?tab=customers",
      },
    });
  });

  it("returns a clean headcount answer without a misleading zero-row warning", async () => {
    const { service } = serviceWith(plan(), {
      employees: [
        {
          id: "employee-1",
          employee_code: "EMP-001",
          employee_name: "Employee One",
          status: "ACTIVE",
          created_at: "2026-09-01T10:00:00Z",
        },
      ],
    });
    const answer = await service.answer(
      "tenant-1",
      { permissions: ["hr:read"] },
      "no of employees",
    );
    expect(answer).toMatchObject({
      metrics: [{ label: "Matching records", value: 1 }],
      warnings: [],
      drill_down: { route: "/dashboard/hr/employees" },
    });
  });

  it("executes a typo-tolerant AI-planned latest-record query without phrase rules", async () => {
    const { service, ai } = serviceWith(plan({ entity_query: "Macfso" }), {
      purchase_orders: [
        {
          id: "po-1",
          po_number: "PO-001",
          po_date: "2026-08-10",
          vendor_id: "vendor-1",
          status: "APPROVED",
          grand_total: 100,
        },
        {
          id: "po-2",
          po_number: "PO-002",
          po_date: "2026-08-20",
          vendor_id: "vendor-2",
          status: "APPROVED",
          grand_total: 200,
        },
      ],
      vendors: [
        { id: "vendor-1", code: "V001", name: "Macfos" },
        { id: "vendor-2", code: "V002", name: "Other Supplier" },
      ],
    });

    const answer = await service.answer(
      "tenant-1",
      { permissions: ["purchase_orders:read"] },
      "can u pull d newest buy ordr frm macfso",
    );

    expect(ai.structuredJson).toHaveBeenCalledWith(
      expect.objectContaining({
        capability: "SEMANTIC_ERP_QUERY_PLAN",
        cacheTtlMs: 0,
      }),
    );
    expect(answer).toMatchObject({
      kind: "SEMANTIC_QUERY",
      status: "READY",
      title: "Purchase orders matching Macfso",
      rows: [expect.objectContaining({ reference: "PO-001", name: "Macfos" })],
      warnings: [expect.stringContaining("closest governed master value")],
    });
  });

  it("finds PRs by required date when the user asks for PRs on a day", async () => {
    const { service } = serviceWith(
      plan({
        dataset: "PURCHASE_REQUISITIONS",
        operation: "LIST",
        entity_query: "",
        entity_is_named: false,
        date_from: "2026-09-03",
        date_to: "2026-09-03",
      }),
      {
        purchase_requisitions: [
          {
            id: "pr-1",
            pr_number: "PR-2026-08-052",
            request_date: "2026-08-27",
            required_date: "2026-09-03",
            created_at: "2026-08-27T13:19:29.140379Z",
            status: "SUBMITTED",
          },
          {
            id: "pr-2",
            pr_number: "PR-2026-08-051",
            request_date: "2026-08-27",
            required_date: "2026-09-02",
            created_at: "2026-08-27T12:00:00Z",
            status: "SUBMITTED",
          },
        ],
        purchase_requisition_items: [],
      },
    );

    const answer = await service.answer(
      "tenant-1",
      { permissions: ["purchase_requisitions:read"] },
      "show PRs from 3rd September",
    );

    expect(answer).toMatchObject({
      title: "Purchase requisitions",
      headline: "1 matching purchase requisitions record found.",
      actions: [
        expect.objectContaining({
          kind: "OPEN_RECORD",
          label: "Open official PR-2026-08-052 document",
          route: "/dashboard/purchase/requisitions?open=pr-1",
        }),
      ],
      rows: [
        expect.objectContaining({
          reference: "PR-2026-08-052",
          date: "2026-09-03",
        }),
      ],
    });
  });

  it("queries the canonical job-order register and opens the exact native job order", async () => {
    const { service } = serviceWith(
      plan({
        dataset: "PRODUCTION_ORDERS",
        operation: "LATEST",
        entity_query: "JO-2026-09-001",
        entity_is_named: true,
      }),
      {
        production_job_orders: [
          {
            id: "jo-1",
            job_order_number: "JO-2026-09-001",
            item_code: "700-0002",
            item_name: "Rectangular GI Duct Section",
            quantity: 10,
            completed_quantity: 0,
            start_date: "2026-09-09",
            status: "DRAFT",
            created_at: "2026-09-09T10:00:00Z",
          },
        ],
      },
    );

    const answer = await service.answer(
      "tenant-1",
      { permissions: ["job_orders:read"] },
      "show JO-2026-09-001",
    );

    expect(answer).toMatchObject({
      title: "Job orders matching JO-2026-09-001",
      rows: [expect.objectContaining({ reference: "JO-2026-09-001" })],
      actions: [
        expect.objectContaining({
          kind: "OPEN_RECORD",
          route: "/dashboard/production/job-orders?open=jo-1",
        }),
      ],
    });
  });

  it("uses specialist calculations selected semantically by the model", async () => {
    const selected = plan({
      mode: "SPECIALIST",
      specialist_kind: "SUPPLIER_ADVANCES",
      dataset: "",
      operation: "SUMMARY",
      entity_query: "",
    });
    const { service, specialist } = serviceWith(selected);
    specialist.answer.mockResolvedValue({
      kind: "SUPPLIER_ADVANCES",
      status: "READY",
      title: "Available supplier advances",
      questions: [],
      generated_at: new Date().toISOString(),
      read_only: true,
    });

    const answer = await service.answer(
      "tenant-1",
      { permissions: ["accounting:read"] },
      "kitna paisa vendor ko advance pada hai",
    );

    expect(answer?.kind).toBe("SUPPLIER_ADVANCES");
    expect(specialist.answer).toHaveBeenCalledWith(
      "tenant-1",
      expect.anything(),
      "kitna paisa vendor ko advance pada hai",
      expect.objectContaining({
        query_scope: "PORTFOLIO",
        query_operation: "SUMMARY",
      }),
      "SUPPLIER_ADVANCES",
    );
  });

  it("executes and combines several semantically planned read-only questions", async () => {
    const stock = plan({
      mode: "SPECIALIST",
      specialist_kind: "INVENTORY_POSITION",
      dataset: "",
      operation: "SUMMARY",
      entity_query: "Super8 antenna",
      entity_is_named: true,
      request_text: "What is the stock of Super8 antenna?",
    });
    const dues = plan({
      mode: "SPECIALIST",
      specialist_kind: "SUPPLIER_DUES",
      dataset: "",
      operation: "OVERDUE",
      entity_query: "",
      entity_is_named: false,
      request_text: "Which supplier payments are overdue?",
    });
    const { service, specialist } = serviceWith({ queries: [stock, dues] });
    specialist.answer.mockImplementation(
      async (
        _tenant: string,
        _user: any,
        _prompt: string,
        _extracted: any,
        kind: string,
      ) => ({
        kind,
        status: "READY",
        title:
          kind === "INVENTORY_POSITION"
            ? "Inventory position"
            : "Supplier payables",
        headline:
          kind === "INVENTORY_POSITION"
            ? "15 PCS available."
            : "12 suppliers have overdue balances.",
        questions: [],
        sources: [],
        generated_at: new Date().toISOString(),
        read_only: true,
      }),
    );

    const answer = await service.answer(
      "tenant-1",
      { permissions: ["items:read", "accounting:read"] },
      "stock of Super8 antenna and which suppliers are overdue?",
    );

    expect(answer).toMatchObject({
      kind: "SEMANTIC_QUERY",
      status: "READY",
      title: "Combined business analysis",
      sections: [
        expect.objectContaining({ kind: "INVENTORY_POSITION" }),
        expect.objectContaining({ kind: "SUPPLIER_DUES" }),
      ],
      semantic_plan: expect.objectContaining({ mode: "MULTI" }),
    });
    expect(specialist.answer).toHaveBeenNthCalledWith(
      1,
      "tenant-1",
      expect.anything(),
      "What is the stock of Super8 antenna?",
      expect.objectContaining({ item_query: "Super8 antenna" }),
      "INVENTORY_POSITION",
    );
    expect(specialist.answer).toHaveBeenNthCalledWith(
      2,
      "tenant-1",
      expect.anything(),
      "Which supplier payments are overdue?",
      expect.objectContaining({ query_scope: "PORTFOLIO" }),
      "SUPPLIER_DUES",
    );
  });

  it("refuses a dataset when the user lacks its permission", async () => {
    permission.mockReturnValue(false);
    const { service } = serviceWith(plan(), { purchase_orders: [] });
    await expect(
      service.answer("tenant-1", { permissions: [] }, "latest PO"),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it("falls back safely when the semantic provider is unavailable", async () => {
    const { service } = serviceWith(plan(), {}, "DETERMINISTIC_FALLBACK");
    await expect(
      service.answer("tenant-1", {}, "random business question"),
    ).resolves.toBeNull();
  });

  it("leaves write requests to the controlled transaction planner", async () => {
    const { service } = serviceWith(
      plan({
        mode: "UNSUPPORTED",
        dataset: "",
        operation: "",
        entity_query: "",
        confidence: 0.99,
      }),
    );
    await expect(
      service.answer(
        "tenant-1",
        { permissions: ["purchase_orders:create"] },
        "create and approve a purchase order for 100 bearings",
      ),
    ).resolves.toBeNull();
  });

  it("asks for clarification when both semantic passes remain low confidence", async () => {
    const uncertain = plan({ confidence: 0.41, clarification: "" });
    const { service, specialist } = serviceWith(uncertain);

    const answer = await service.answer(
      "tenant-1",
      { permissions: ["purchase_orders:read"] },
      "show me the latest one",
    );

    expect(answer).toMatchObject({
      kind: "SEMANTIC_QUERY",
      status: "NEEDS_INFORMATION",
      semantic_plan: expect.objectContaining({
        mode: "CLARIFY",
        confidence: 0.41,
      }),
    });
    expect(answer?.questions[0]).toContain("not confident enough");
    expect(specialist.answer).not.toHaveBeenCalled();
  });

  it("blocks a low-confidence disagreement between independent semantic passes", async () => {
    process.env.SUPABASE_URL ||= "http://localhost:54321";
    process.env.SUPABASE_KEY ||= "semantic-query-test-key";
    const first = plan({
      mode: "SPECIALIST",
      specialist_kind: "INVENTORY_POSITION",
      dataset: "",
      entity_query: "Super8 antenna",
      confidence: 0.72,
    });
    const second = plan({
      mode: "SPECIALIST",
      specialist_kind: "SUPPLIER_DUES",
      dataset: "",
      entity_query: "",
      entity_is_named: false,
      confidence: 0.7,
    });
    const ai = {
      structuredJson: jest
        .fn()
        .mockResolvedValueOnce({
          value: { queries: [first] },
          provider: "OPENAI",
          fallback_used: false,
        })
        .mockResolvedValueOnce({
          value: { queries: [second] },
          provider: "OPENAI",
          fallback_used: false,
        }),
    };
    const specialist = { answer: jest.fn() };
    const service = new SemanticErpQueryService(ai as any, specialist as any);

    const answer = await service.answer(
      "tenant-1",
      { permissions: ["items:read", "accounting:read"] },
      "what is pending for super8?",
    );

    expect(answer).toMatchObject({
      status: "NEEDS_INFORMATION",
      semantic_plan: expect.objectContaining({ mode: "CLARIFY" }),
    });
    expect(answer?.questions[0]).toContain("more than one possible");
    expect(specialist.answer).not.toHaveBeenCalled();
  });

  it("uses semantic tie-breaking when one pass over-clarifies a clear portfolio question", async () => {
    process.env.SUPABASE_URL ||= "http://localhost:54321";
    process.env.SUPABASE_KEY ||= "semantic-query-test-key";
    const concrete = plan({
      mode: "SPECIALIST",
      specialist_kind: "INVENTORY_POSITION",
      dataset: "",
      operation: "SUMMARY",
      entity_query: "",
      entity_is_named: false,
      confidence: 0.9,
    });
    const clarify = plan({
      mode: "CLARIFY",
      specialist_kind: "",
      dataset: "",
      operation: "",
      entity_query: "",
      entity_is_named: false,
      clarification: "Which item?",
      confidence: 0.7,
    });
    const ai = {
      structuredJson: jest
        .fn()
        .mockResolvedValueOnce({
          value: { queries: [concrete] },
          provider: "OPENAI",
          fallback_used: false,
        })
        .mockResolvedValueOnce({
          value: { queries: [clarify] },
          provider: "OPENAI",
          fallback_used: false,
        })
        .mockResolvedValueOnce({
          value: {
            decision: "USE_CONCRETE",
            clarification: "",
            confidence: 0.94,
          },
          provider: "OPENAI",
          fallback_used: false,
        }),
    };
    const specialist = {
      answer: jest.fn().mockResolvedValue({
        kind: "INVENTORY_POSITION",
        status: "READY",
        title: "Low stock",
        questions: [],
        generated_at: new Date().toISOString(),
        read_only: true,
      }),
    };
    const service = new SemanticErpQueryService(ai as any, specialist as any);

    const answer = await service.answer(
      "tenant-1",
      { permissions: ["items:read"] },
      "Anything running low in stores?",
    );

    expect(answer).toMatchObject({
      kind: "INVENTORY_POSITION",
      status: "READY",
    });
    expect(ai.structuredJson).toHaveBeenNthCalledWith(
      3,
      expect.objectContaining({
        capability: "SEMANTIC_ERP_AMBIGUITY_ADJUDICATION",
      }),
    );
    expect(specialist.answer).toHaveBeenCalled();
  });
});
