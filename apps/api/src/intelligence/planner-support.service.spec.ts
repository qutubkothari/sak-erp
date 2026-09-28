import { ActivePlannerController } from "./active-planner.controller";
import {
  PlannerSupportService,
  supportIntent,
  supportRoute,
} from "./planner-support.service";
import { PlannerSupportAttachmentsService } from "./planner-support-attachments.service";
import { SupportAutofixService } from "../support-autofix/support-autofix.service";
import { SupportStoreService } from "../support-autofix/support-store.service";

const user = {
  tenantId: "11111111-1111-4111-8111-111111111111",
  userId: "22222222-2222-4222-8222-222222222222",
};
const screenshot = "33333333-3333-4333-8333-333333333333";
const poMessage =
  "While trying to enter name in Search Bar of PO, there is some error, and unable to search.";

describe("Mizantra support intake", () => {
  it.each([
    "this is not working",
    "getting error",
    "unable to search",
    "page is blank",
    "cannot update holiday",
    "invoice is not opening",
    "button does nothing",
    "getting internal server error",
    "PO search not working",
    poMessage,
  ])("detects %s", (message) => {
    expect(supportIntent(message)).toBe("SUPPORT_INCIDENT");
  });
  it.each([
    "Create a PR for 50 bearings",
    "Show stock issue vouchers",
    "Create material issue voucher",
  ])("preserves planner request %s", (message) => {
    expect(supportIntent(message)).toBe("NORMAL_PLANNER_REQUEST");
  });
  it("forces only intake through explicit report mode", () => {
    expect(supportIntent("The supplier field", "support")).toBe(
      "SUPPORT_INCIDENT",
    );
    expect(supportIntent("Help with a problem", "planner")).toBe(
      "NORMAL_PLANNER_REQUEST",
    );
  });
  it.each(["what happened to my issue?", "status of the PO search problem"])(
    "routes history: %s",
    (message) => {
      expect(supportIntent(message)).toBe("SUPPORT_STATUS");
    },
  );
  it("asks for clarification without creating or planning", async () => {
    const captureIncident = jest.fn();
    const service = new PlannerSupportService(
      { captureIncident } as any,
      {} as any,
    );
    expect(
      await service.route(user, {
        message: "There is a problem with my order",
      }),
    ).toMatchObject({
      intent_type: "CLARIFY_SUPPORT",
      assistant_message: "Are you reporting a problem with the ERP?",
    });
    expect(captureIncident).not.toHaveBeenCalled();
  });
  it("binds the screenshot, source page and exact description to authenticated identity; ignores policy and credential fields", async () => {
    const captureIncident = jest.fn().mockResolvedValue({
      id: "INC-1042",
      status: "Checking the problem.",
      riskLevel: "LOW",
    });
    const assertOwned = jest.fn();
    const service = new PlannerSupportService(
      { captureIncident } as any,
      { assertOwned } as any,
    );
    const response = await service.route(user, {
      message: poMessage,
      source_route: "/dashboard/purchase/orders?token=secret#tab",
      support_screenshot_ref: screenshot,
      tenant_id: "attacker",
      user_id: "attacker",
      authorization: "secret",
      cookie: "secret",
      password: "secret",
      mode: "AUTO",
      risk: "LOW",
      approve: true,
      browser_info: "desktop; Chrome",
      failed_endpoint: "/purchase/orders?token=secret",
      http_status: 500,
    });
    expect(assertOwned).toHaveBeenCalledWith(user, screenshot);
    expect(captureIncident).toHaveBeenCalledWith(
      user,
      expect.objectContaining({
        description: poMessage,
        route: "/dashboard/purchase/orders",
        module: "Procurement / Purchase Orders",
        screenshot_ref: screenshot,
        browser_info: "desktop; Chrome",
        failed_endpoint: "/purchase/orders",
        http_status: 500,
      }),
    );
    expect(JSON.stringify(captureIncident.mock.calls)).not.toMatch(
      /attacker|secret|AUTO|approve/,
    );
    expect(response).toMatchObject({
      intent_type: "SUPPORT_INCIDENT",
      support_incident: { id: "INC-1042" },
    });
    expect(response.assistant_message).toContain("INC-1042");
    expect(response).not.toHaveProperty("riskLevel");
  });
  it("returns only safe status fields for authenticated recent incidents", async () => {
    const listMine = jest.fn().mockResolvedValue([
      {
        id: "INC-1",
        status: "Checking the problem.",
        title: "/secret/path",
        risk_reason: "internal",
      },
    ]);
    const service = new PlannerSupportService({ listMine } as any, {} as any);
    const response = await service.route(user, {
      message: "what happened to my issue?",
    });
    expect(listMine).toHaveBeenCalledWith(user);
    expect(response.support_incidents).toEqual([
      { id: "INC-1", status: "Checking the problem." },
    ]);
    expect(JSON.stringify(response)).not.toMatch(/secret|internal/);
  });
  it("finds a reported problem by topic without disclosing its free text", async () => {
    const listMine = jest.fn().mockResolvedValue([
      {
        id: "INC-1",
        title: "PO search not working",
        status: "Checking the problem.",
      },
      {
        id: "INC-2",
        title: "Invoice not opening",
        status: "Checking the problem.",
      },
    ]);
    const service = new PlannerSupportService({ listMine } as any, {} as any);
    const response = await service.route(user, {
      message: "status of the PO search problem",
    });
    expect(response.support_incidents.map((row) => row.id)).toEqual(["INC-1"]);
  });
  it("keeps normal planner memory, interpreter and completion intact", async () => {
    const body = { message: "Create a PR for 50 bearings" };
    const planner = {
      interpret: jest
        .fn()
        .mockResolvedValue({ status: "READY_TO_CREATE_DRAFT" }),
    };
    const memory = {
      prepare: jest.fn().mockResolvedValue({ body, conversation: { id: "c" } }),
      complete: jest
        .fn()
        .mockResolvedValue({ status: "READY_TO_CREATE_DRAFT" }),
    };
    const support = new PlannerSupportService({} as any, {} as any);
    const controller = new ActivePlannerController(
      planner as any,
      {} as any,
      memory as any,
      support,
      {} as any,
    );
    await expect(controller.interpret({ user }, body)).resolves.toMatchObject({
      status: "READY_TO_CREATE_DRAFT",
    });
    expect(planner.interpret).toHaveBeenCalledWith(user.tenantId, user, body);
    expect(memory.complete).toHaveBeenCalledTimes(1);
  });
  it("never forwards support incidents to planner memory or an LLM", async () => {
    const planner = { interpret: jest.fn() };
    const memory = { prepare: jest.fn(), complete: jest.fn() };
    const support = new PlannerSupportService(
      {
        captureIncident: jest
          .fn()
          .mockResolvedValue({ id: "INC-1", status: "Checking the problem." }),
      } as any,
      {} as any,
    );
    const controller = new ActivePlannerController(
      planner as any,
      {} as any,
      memory as any,
      support,
      {} as any,
    );
    await controller.interpret({ user }, { message: "PO search not working" });
    expect(planner.interpret).not.toHaveBeenCalled();
    expect(memory.prepare).not.toHaveBeenCalled();
    expect(memory.complete).not.toHaveBeenCalled();
  });
  it("strips source query credentials and rejects external or malformed routes", () => {
    expect(supportRoute("/dashboard/purchase/orders?token=x#secret")).toBe(
      "/dashboard/purchase/orders",
    );
    expect(supportRoute("https://host/private")).toBe("/dashboard");
    expect(supportRoute("//host/private")).toBe("/dashboard");
  });
  it.each([
    ["NEW", "Checking the problem."],
    ["TRIAGING", "Checking the problem."],
    ["PATCHING", "A safe fix is being tested."],
    ["TESTING", "A safe fix is being tested."],
    ["VERIFYING", "A safe fix is being tested."],
    ["DEPLOYING", "A safe fix is being tested."],
    [
      "READY_FOR_APPROVAL",
      "The fix has passed checks and is awaiting engineering approval.",
    ],
    ["RESOLVED", "The issue has been fixed."],
    [
      "ROLLED_BACK",
      "The attempted change was reversed safely and engineering is reviewing it.",
    ],
    [
      "ESCALATED",
      "This needs engineering review. Your issue is recorded and has not been lost.",
    ],
  ])("maps %s without premature resolution", (status, expected) => {
    const service = Object.create(SupportAutofixService.prototype) as any;
    expect(service.clientStatus(status)).toBe(expected);
  });
  it("redacts secrets before database persistence while retaining authenticated ownership", async () => {
    const insert = jest.fn().mockReturnValue({
      select: () => ({ single: async () => ({ data: { id: "INC-1" } }) }),
    });
    const lookup = {
      eq: jest.fn().mockReturnThis(),
      gte: jest.fn().mockReturnThis(),
      maybeSingle: async () => ({ data: null }),
    };
    const service = Object.create(SupportStoreService.prototype) as any;
    service.supabase = { from: () => ({ select: () => lookup, insert }) };
    service.writeEvent = jest.fn();
    service.auditService = { logActivity: jest.fn() };
    await service.captureIncident(
      user.tenantId,
      user.userId,
      {
        description:
          "PO error. password: secret, token=credential, authorization: Bearer hidden",
        route: "/dashboard/purchase/orders?token=hidden",
        screenshot_ref: screenshot,
      },
      { risk: "LOW", reason: "UI", category: "search" },
      "fingerprint",
    );
    expect(insert.mock.calls[0][0]).toMatchObject({
      tenant_id: user.tenantId,
      reported_by: user.userId,
      screenshot_ref: screenshot,
    });
    expect(JSON.stringify(insert.mock.calls)).not.toMatch(
      /secret|credential|hidden/,
    );
    expect(lookup.eq).toHaveBeenCalledWith("reported_by", user.userId);
  });
});

describe("Private support screenshots", () => {
  const makeService = () => {
    const service = Object.create(
      PlannerSupportAttachmentsService.prototype,
    ) as any;
    service.storage = {
      uploadFile: jest.fn().mockResolvedValue({ path: "private/path.png" }),
      deleteFile: jest.fn().mockResolvedValue(undefined),
    };
    service.logger = { warn: jest.fn() };
    service.db = {
      storage: {
        getBucket: jest
          .fn()
          .mockResolvedValue({ data: { public: false }, error: null }),
      },
      from: jest.fn().mockReturnValue({
        insert: jest.fn().mockResolvedValue({ error: null }),
      }),
    };
    return service;
  };
  it("returns an opaque reference with no storage internals", async () => {
    const service = makeService();
    const result = await service.upload(user, {
      mimetype: "image/png",
      buffer: Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
      size: 8,
    });
    expect(Object.keys(result)).toEqual(["ref"]);
    expect(result.ref).toMatch(/^[0-9a-f-]{36}$/);
    expect(service.db.from().insert).toHaveBeenCalledWith(
      expect.objectContaining({
        tenant_id: user.tenantId,
        uploaded_by: user.userId,
      }),
    );
  });
  it("uploads a JPG screenshot and returns only an opaque reference", async () => {
    const service = makeService();
    service.storage.uploadFile.mockResolvedValue({ path: "private/path.jpg" });
    const result = await service.upload(user, {
      originalname: "screen.jpg",
      mimetype: "image/jpeg",
      buffer: Buffer.from([255, 216, 255]),
      size: 3,
    });
    expect(Object.keys(result)).toEqual(["ref"]);
    expect(result.ref).toMatch(/^[0-9a-f-]{36}$/);
    expect(service.storage.uploadFile).toHaveBeenCalledWith(
      expect.objectContaining({ originalname: expect.stringMatching(/\.jpg$/) }),
      "support-screenshots",
      user.tenantId,
    );
  });
  it("refuses public storage before uploading screenshots", async () => {
    const service = makeService();
    service.db.storage.getBucket.mockResolvedValue({ data: { public: true } });
    await expect(
      service.upload(user, {
        mimetype: "image/png",
        buffer: Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
        size: 8,
      }),
    ).rejects.toThrow("Screenshot upload failed");
    expect(service.storage.uploadFile).not.toHaveBeenCalled();
  });
  it("rejects disguised files", async () => {
    await expect(
      makeService().upload(user, {
        mimetype: "image/png",
        buffer: Buffer.from("not an image"),
        size: 12,
      }),
    ).rejects.toThrow("PNG or JPEG");
  });
  it("rejects oversized screenshots before storage is called", async () => {
    const service = makeService();
    await expect(
      service.upload(user, {
        mimetype: "image/jpeg",
        buffer: Buffer.from([255, 216, 255]),
        size: 10 * 1024 * 1024 + 1,
      }),
    ).rejects.toThrow("up to 10 MB");
    expect(service.storage.uploadFile).not.toHaveBeenCalled();
  });
  it("returns usable upload failure without exposing internals", async () => {
    const service = makeService();
    service.storage.uploadFile.mockRejectedValue(
      new Error("/server/secret/path"),
    );
    await expect(
      service.upload(user, {
        mimetype: "image/jpeg",
        buffer: Buffer.from([255, 216, 255]),
        size: 3,
      }),
    ).rejects.toThrow("Your description is still here");
    expect(service.logger.warn).toHaveBeenCalledWith(
      "Support screenshot upload failed (code=unknown).",
    );
  });
  it("logs only a safe backend code when screenshot metadata cannot be saved", async () => {
    const service = makeService();
    const metadataError = Object.assign(
      new Error("sensitive server detail"),
      { code: "PGRST205" },
    );
    service.db.from.mockReturnValue({
      insert: jest.fn().mockResolvedValue({ error: metadataError }),
    });
    await expect(
      service.upload(user, {
        mimetype: "image/jpeg",
        buffer: Buffer.from([255, 216, 255]),
        size: 3,
      }),
    ).rejects.toThrow("Your description is still here");
    expect(service.logger.warn).toHaveBeenCalledWith(
      "Support screenshot upload failed (code=PGRST205).",
    );
    expect(service.logger.warn.mock.calls.flat().join(" ")).not.toContain(
      "sensitive server detail",
    );
    expect(service.storage.deleteFile).toHaveBeenCalledWith("private/path.png");
  });
  it("rejects cross-user and cross-tenant references", async () => {
    const service = makeService();
    const query = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      maybeSingle: async () => ({ data: null }),
    };
    service.db.from.mockReturnValue(query);
    await expect(service.assertOwned(user, screenshot)).rejects.toThrow(
      "attach",
    );
    expect(query.eq).toHaveBeenCalledWith("tenant_id", user.tenantId);
    expect(query.eq).toHaveBeenCalledWith("uploaded_by", user.userId);
  });
});
