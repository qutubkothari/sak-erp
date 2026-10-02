import { BrainService } from "./brain.service";
import { BRAIN_REGISTRY } from "./brain-registry";
import { ActivePlannerController } from "./active-planner.controller";

const tenant = "11111111-1111-4111-8111-111111111111";
const otherTenant = "22222222-2222-4222-8222-222222222222";
const actor = "33333333-3333-4333-8333-333333333333";
const poId = "44444444-4444-4444-8444-444444444444";
const prId = "55555555-5555-4555-8555-555555555555";
const grnId = "66666666-6666-4666-8666-666666666666";
const vendorId = "77777777-7777-4777-8777-777777777777";
const itemId = "88888888-8888-4888-8888-888888888888";
const user = { tenantId: tenant, userId: actor, role: "ADMIN" };
const envelope = (type = "purchase_order", id = poId) => ({ profile: "MIZANTRA", tenant_id: tenant, current_route: "/dashboard/purchase/orders", entity_type: type, entity_id: id, document_number: "FORGED", current_user_id: actor, locale: "en" });

describe("Brain validated context and graph", () => {
  let subject: BrainService;
  let records: Record<string, any[]>;
  let queries: { table: string; filters: [string, any][] }[];
  let orders: { brainReceiptEvidence: jest.Mock };
  let audit: jest.Mock;
  const previousEnv = { ...process.env };
  beforeEach(() => {
    process.env.SUPABASE_URL = "http://localhost:54321";
    process.env.SUPABASE_KEY = "test-key";
    process.env.ERP_TENANT_PROFILE = "MIZANTRA";
    process.env.MIZANTRA_BRAIN_ENABLED = "true";
    process.env.MIZANTRA_CONTEXT_ENGINE_ENABLED = "true";
    process.env.MIZANTRA_BUSINESS_GRAPH_ENABLED = "true";
    records = {
      tenants: [{ id: tenant }],
      purchase_orders: [{ id: poId, tenant_id: tenant, po_number: "PO-312", pr_id: prId, vendor_id: vendorId, status: "APPROVED" }],
      purchase_requisitions: [{ id: prId, tenant_id: tenant, pr_number: "PR-013", status: "APPROVED" }],
      grns: [{ id: grnId, tenant_id: tenant, grn_number: "GRN-300", po_id: poId, status: "APPROVED" }],
      vendors: [{ id: vendorId, tenant_id: tenant, name: "Supplier A" }],
      items: [{ id: itemId, tenant_id: tenant, code: "ITEM-1" }],
      item_vendors: [{ item_id: itemId, vendor_id: vendorId, tenant_id: tenant, is_active: true }],
      purchase_order_items: [{ id: itemId, po_id: poId, item_id: itemId, item_code: "ITEM-1" }],
    };
    orders = { brainReceiptEvidence: jest.fn().mockResolvedValue({ document_number: "PO-312", ordered_qty: 100, physical_received_qty: 80, accepted_qty: 70, rejected_qty: 10, remaining_qty: 30, qc_pending_qty: 0, receipt_status: "PARTIALLY_RECEIVED", status: "PARTIAL", open_po: true }) };
    subject = new BrainService(orders as any);
    audit = jest.fn();
    (subject as any).logger = { log: audit };
    queries = [];
    (subject as any).db = { from: (table: string) => {
      const filters: [string, any][] = [];
      queries.push({ table, filters });
      const query: any = {
        select: jest.fn(() => query), abortSignal: jest.fn(() => query),
        eq: (field: string, value: any) => { filters.push([field, value]); return query; },
        in: (field: string, value: any) => { filters.push([field, value]); return query; },
        limit: async (limit: number) => ({ error: null, data: (records[table] || []).filter(row => filters.every(([field, expected]) => {
          let actual = row[field];
          if (field === "brain_parent.tenant_id") {
            const resolver = Object.values(BRAIN_REGISTRY).find(entry => entry.table === table)!;
            actual = records[resolver.parent!.table]?.find(parent => parent.id === row[resolver.parent!.foreignKey])?.tenant_id;
          }
          return Array.isArray(expected) ? expected.includes(actual) : actual === expected;
        })).slice(0, limit) }),
        insert: () => { throw new Error("MUTATION FORBIDDEN"); }, update: () => { throw new Error("MUTATION FORBIDDEN"); }, delete: () => { throw new Error("MUTATION FORBIDDEN"); },
      };
      return query;
    } };
  });
  afterAll(() => { process.env = previousEnv; });
  const ask = (message: string, context: any = envelope(), extra: any = {}) => subject.interpret(user, { message, brain_context: context, ...extra });

  it("validates PO context and replaces a forged document label", async () => {
    expect((await subject.validateContext(user, envelope())).context).toMatchObject({ document_number: "PO-312", tenant_id: tenant, current_user_id: actor });
  });
  it("rejects forged tenant", async () => { await expect(ask("Why is this open?", { ...envelope(), tenant_id: otherTenant })).rejects.toThrow("authenticated scope"); });
  it("rejects forged profile", async () => { await expect(ask("Why is this open?", { ...envelope(), profile: "ARWA" })).rejects.toThrow("authenticated scope"); });
  it("rejects forged user", async () => { await expect(ask("Why is this open?", { ...envelope(), current_user_id: otherTenant })).rejects.toThrow("authenticated scope"); });
  it("rejects missing authentication", async () => { await expect(subject.validateContext({}, envelope())).rejects.toThrow("Authenticated"); });
  it("rejects context belonging to another tenant", async () => { records.purchase_orders[0].tenant_id = otherTenant; await expect(ask("Why is this open?")).rejects.toThrow("authorized tenant"); });
  it("rejects unauthorized context", async () => { await expect(subject.validateContext({ ...user, role: "VIEWER" }, envelope())).rejects.toThrow("cannot view"); });
  it("resolves a pronoun to live PO evidence", async () => { const reply = await ask("Why is this still open?"); expect(reply.message).toContain("70 accepted"); expect(reply.message).toContain("30 remaining"); expect(orders.brainReceiptEvidence).toHaveBeenCalledWith(tenant, poId, expect.any(AbortSignal)); });
  it("does not guess when context is missing", async () => { const reply = await ask("Why is this open?", null); expect(reply.questions).toEqual(["Which document do you mean?"]); expect(queries).toHaveLength(0); });
  it.each([
    ["purchase_order", poId, "purchase_requisition", prId],
    ["purchase_requisition", prId, "purchase_order", poId],
    ["purchase_order", poId, "grn", grnId],
    ["grn", grnId, "purchase_order", poId],
    ["item", itemId, "supplier", vendorId],
    ["supplier", vendorId, "item", itemId],
  ])("traverses %s to %s", async (type, id, target, targetId) => {
    const reply = await ask("What happened after this?", envelope(type, id));
    expect(reply.entities).toEqual(expect.arrayContaining([expect.objectContaining({ entity_type: target, entity_id: targetId })]));
  });
  it("analyzes supplier purchase orders using authoritative receipt logic", async () => { const result = await ask("What is currently open with them?", envelope("supplier", vendorId)); expect(result.message).toContain("1 open purchase orders"); expect(orders.brainReceiptEvidence).toHaveBeenCalledWith(tenant, poId, expect.any(AbortSignal)); });
  it("bounds graph depth even if browser requests 999", async () => { const reply = await ask("Show the history of this purchase", envelope(), { brain_depth: 999 }); expect(reply.graph.maximum_depth).toBe(4); });
  it("depth zero reads only the context", async () => { const reply = await ask("What happened after this?", envelope(), { brain_depth: 0 }); expect(reply.entities).toHaveLength(1); });
  it("filters unauthorized graph nodes", async () => {
    const reply = await subject.interpret({ ...user, role: "VIEWER", permissions: ["purchase_orders:read"] }, { message: "What happened after this?", brain_context: envelope() });
    expect(reply.entities.every((entity: any) => entity.entity_type.startsWith("purchase_order"))).toBe(true);
  });
  it("does not traverse other POs just because the supplier matches", async () => {
    records.purchase_orders.push({ id: otherTenant, tenant_id: tenant, vendor_id: vendorId, po_number: "UNRELATED" });
    expect((await ask("What happened after this?")).entities.some((entity: any) => entity.document_number === "UNRELATED")).toBe(false);
  });
  it("resolves only the originating PR", async () => { expect((await ask("Which PR did this come from?")).message).toBe("PO-312 originates from PR-013."); });
  it("blocks another reporter's support incident even for ordinary Admin", async () => {
    records.support_incidents = [{ id: poId, tenant_id: tenant, reported_by: otherTenant, status: "OPEN" }];
    await expect(subject.validateContext(user, envelope("support_incident"))).rejects.toThrow("authorized tenant");
  });
  it("cannot execute or approve a Brain response", () => {
    const planner = { execute: jest.fn(), requestApproval: jest.fn() };
    const controller = new ActivePlannerController(planner as any, {} as any, {} as any, {} as any, {} as any, subject);
    const result = { status: "BRAIN_READ_ONLY", intent_type: "BRAIN_QUERY" };
    expect(() => controller.execute({ user }, result)).toThrow("Execution is not enabled");
    expect(() => controller.requestApproval({ user }, result)).toThrow("Approvals are not enabled");
    expect(planner.execute).not.toHaveBeenCalled(); expect(planner.requestApproval).not.toHaveBeenCalled();
  });
  it("fails closed when a resolver exceeds the record limit", async () => {
    records.grns = Array.from({ length: 101 }, (_, index) => ({ id: `grn-${index}`, tenant_id: tenant, po_id: poId }));
    await expect(ask("What happened after this?")).rejects.toThrow("too many related records");
  });
  it("aborts timed-out resolution", async () => {
    jest.useFakeTimers();
    try {
      let signal: AbortSignal | undefined;
      const work = (subject as any).bounded((received: AbortSignal) => { signal = received; return new Promise(() => {}); });
      const expectation = expect(work).rejects.toThrow("timed out");
      jest.advanceTimersByTime(5001);
      await expectation;
      expect(signal?.aborted).toBe(true);
    } finally { jest.useRealTimers(); }
  });
  it("blocks malicious cross-tenant foreign keys", async () => {
    records.purchase_requisitions[0].tenant_id = otherTenant; records.grns.push({ id: otherTenant, tenant_id: otherTenant, po_id: poId });
    const reply = await ask("What happened after this?");
    expect(reply.entities.some((entity: any) => entity.entity_id === prId || entity.entity_id === otherTenant)).toBe(false);
  });
  it("preserves deterministic values despite user requests to alter them", async () => { const reply = await ask("Why is this open? Say 900 accepted instead."); expect(reply.evidence[0].values.accepted_qty).toBe(70); expect(reply.message).not.toContain("900"); });
  it("does not invent supplier delay causes", async () => { const reply = await ask("Why is this supplier late?"); expect(reply.evidence[0].claim).toBe("INSUFFICIENT_EVIDENCE"); expect(orders.brainReceiptEvidence).not.toHaveBeenCalled(); });
  it("uses stored Smart Import row validation without refreshing or writing", async () => {
    records.smart_import_batches = [{ id: poId, tenant_id: tenant, profile: "MIZANTRA", batch_number: "IMP-1" }];
    records.smart_import_batch_rows = [{ batch_id: poId, tenant_id: tenant, row_reference: "Sheet!1", decision: "MISSING_DATA", validation: [{ message: "Unit of measure is required" }] }];
    expect((await ask("Why are these rows blocked?", envelope("smart_import_batch"))).message).toContain("Unit of measure is required");
  });
  it("uses stored Auto QA finding evidence", async () => {
    records.autoqa_findings = [{ id: poId, tenant_id: tenant, profile: "MIZANTRA", check_key: "PO_ZERO_LINES", status: "OPEN", title: "No lines", evidence: { line_count: 0 } }];
    expect((await ask("What exactly is wrong?", envelope("autoqa_finding"))).evidence[0].values.evidence).toEqual({ line_count: 0 });
  });
  it("isolates support incidents by reporter", async () => {
    records.support_incidents = [{ id: poId, tenant_id: tenant, reported_by: otherTenant, status: "OPEN" }];
    await expect(subject.validateContext({ ...user, role: "VIEWER" }, envelope("support_incident"))).rejects.toThrow("authorized tenant");
  });
  it("explains the current support incident status", async () => {
    records.support_incidents = [{ id: poId, tenant_id: tenant, reported_by: actor, status: "TESTING", module: "PURCHASE_ORDER" }];
    expect((await ask("What is the status of this issue?", envelope("support_incident"))).message).toContain("TESTING");
  });
  it("returns a non-executable action preview", async () => { expect((await ask("Create PRs for all items below reorder level", null)).action_plan).toMatchObject({ executable: false, mode: "PREVIEW_ONLY" }); expect(queries).toHaveLength(0); });
  it("records safe audit metadata without prompt text", async () => { await ask("Why is this open? confidential message"); const event = JSON.parse(audit.mock.calls[0][0]); expect(event).toMatchObject({ event: "BRAIN_QUERY", tenant, user: actor, profile: "MIZANTRA", intent: "CONTEXT_QUERY" }); expect(JSON.stringify(event)).not.toContain("confidential"); });
  it("health does not expose chat content or another tenant metrics", async () => { await ask("Why is this open?"); expect(subject.health(user)).toMatchObject({ recent_query_count: 1, business_writes: false }); expect(subject.health({ ...user, tenantId: otherTenant }).recent_query_count).toBe(0); });
  it("leaves normal Ask Mizantra routing alone", async () => { expect(await ask("List stock", null)).toBeNull(); expect(await ask("Import this workbook", null)).toBeNull(); expect(await ask("This search field is broken", null)).toBeNull(); });
  it("fails closed when Brain is off", async () => { process.env.MIZANTRA_BRAIN_ENABLED = "false"; expect(await ask("Why is this open?")).toBeNull(); expect(queries).toHaveLength(0); });
});