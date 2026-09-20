import {
  ActivePlannerMemoryService,
  plannerAssistantMessage,
} from "./active-planner-memory.service";

process.env.SUPABASE_URL ||= "http://localhost:54321";
process.env.SUPABASE_KEY ||= "planner-memory-test-key";

describe("ActivePlannerMemoryService presentation", () => {
  it("persists the direct analytics answer as the planner message", () => {
    expect(
      plannerAssistantMessage({
        status: "READY_WITH_ANALYTICS",
        analytics: { headline: "15 PCS available across 1 warehouse." },
        questions: [],
      }),
    ).toBe("15 PCS available across 1 warehouse.");
  });

  it("persists follow-up questions before generic status text", () => {
    expect(
      plannerAssistantMessage({
        status: "NEEDS_INFORMATION",
        questions: ["Which customer?", "Which period?"],
      }),
    ).toBe("Which customer?\nWhich period?");
  });

  it("preserves the workflow-specific production-pack explanation", () => {
    expect(
      plannerAssistantMessage({
        status: "READY_TO_CREATE_DRAFT",
        questions: [],
        assistant_message:
          "Review the BOM explosion, shortages and sub-assembly jobs before confirmation.",
      }),
    ).toBe(
      "Review the BOM explosion, shortages and sub-assembly jobs before confirmation.",
    );
  });

  it("does not rephrase a fact-grounded workflow answer in another language", async () => {
    const ai = {
      isEnabled: jest.fn(() => true),
      structuredJson: jest.fn().mockResolvedValue({
        value: {
          answer: "Aaj ke liye koi Job Card nahi hai.",
          language_code: "hi-Latn",
        },
        fallback_used: false,
      }),
    };
    const service = new ActivePlannerMemoryService(ai as any);
    await expect(
      (service as any).groundedAssistantMessage(
        "tenant-1",
        "user-1",
        "print todays job card for me",
        {
          status: "READY_WITH_ANALYTICS",
          assistant_message: "No Job Cards are planned for 2026-09-10.",
          analytics: { headline: "No Job Cards are planned for 2026-09-10." },
          questions: [],
        },
      ),
    ).resolves.toBe("No Job Cards are planned for 2026-09-10.");
    expect(ai.structuredJson).not.toHaveBeenCalled();
  });

  it("forces a fact-grounded Arabic reply when the application language is Arabic", async () => {
    const ai = {
      isEnabled: jest.fn(() => true),
      structuredJson: jest.fn().mockResolvedValue({
        value: {
          answer: "الكمية المتاحة هي 15 PCS.",
          language_code: "ar-EG",
        },
        fallback_used: false,
      }),
    };
    const service = new ActivePlannerMemoryService(ai as any);
    await expect(
      (service as any).groundedAssistantMessage(
        "tenant-1",
        "user-1",
        "what is the stock?",
        {
          status: "READY_WITH_ANALYTICS",
          analytics: { headline: "15 PCS available." },
          questions: [],
        },
        "ar-EG",
      ),
    ).resolves.toBe("الكمية المتاحة هي 15 PCS.");
    expect(ai.structuredJson).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ response_language: "ar-EG" }),
      }),
    );
  });

  it("answers an Arabic request in Arabic even when the application is in English", async () => {
    const ai = {
      isEnabled: jest.fn(() => true),
      structuredJson: jest.fn().mockResolvedValue({
        value: {
          answer: "تم التحقق من الطلب. راجعه قبل إنشاء المسودة.",
          language_code: "ar",
        },
        fallback_used: false,
      }),
    };
    const service = new ActivePlannerMemoryService(ai as any);

    await expect(
      (service as any).groundedAssistantMessage(
        "tenant-1",
        "user-1",
        "أنشئ طلب شراء للمورد الحالي",
        {
          status: "READY_TO_CREATE_DRAFT",
          assistant_message:
            "The request is validated. Review it before creating the draft.",
          questions: [],
        },
        "en",
      ),
    ).resolves.toBe("تم التحقق من الطلب. راجعه قبل إنشاء المسودة.");
    expect(ai.structuredJson).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ response_language: "MATCH_USER" }),
      }),
    );
  });

  it("uses an explicitly selected voice language for workflow replies", async () => {
    const ai = {
      isEnabled: jest.fn(() => true),
      structuredJson: jest.fn().mockResolvedValue({
        value: {
          answer: "अनुरोध जाँच लिया गया है। मसौदा बनाने से पहले समीक्षा करें।",
          language_code: "hi",
        },
        fallback_used: false,
      }),
    };
    const service = new ActivePlannerMemoryService(ai as any);

    await expect(
      (service as any).groundedAssistantMessage(
        "tenant-1",
        "user-1",
        "Create a purchase request",
        {
          status: "READY_TO_CREATE_DRAFT",
          assistant_message:
            "The request is validated. Review it before creating the draft.",
          questions: [],
        },
        "hi",
      ),
    ).resolves.toBe(
      "अनुरोध जाँच लिया गया है। मसौदा बनाने से पहले समीक्षा करें।",
    );
    expect(ai.structuredJson).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ response_language: "hi" }),
      }),
    );
  });

  it("auto-detects a Latin-script language instead of assuming English", async () => {
    const ai = {
      isEnabled: jest.fn(() => true),
      structuredJson: jest.fn().mockResolvedValue({
        value: {
          answer:
            "La demande est validée. Vérifiez-la avant de créer le brouillon.",
          language_code: "fr",
        },
        fallback_used: false,
      }),
    };
    const service = new ActivePlannerMemoryService(ai as any);

    await expect(
      (service as any).groundedAssistantMessage(
        "tenant-1",
        "user-1",
        "Créez une demande d'achat",
        {
          status: "READY_TO_CREATE_DRAFT",
          assistant_message:
            "The request is validated. Review it before creating the draft.",
          questions: [],
        },
        "auto",
      ),
    ).resolves.toBe(
      "La demande est validée. Vérifiez-la avant de créer le brouillon.",
    );
    expect(ai.structuredJson).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ response_language: "AUTO" }),
      }),
    );
  });

  it("matches scripts outside the original Arabic and Indic ranges", async () => {
    const ai = {
      isEnabled: jest.fn(() => true),
      structuredJson: jest.fn().mockResolvedValue({
        value: { answer: "库存为 15 PCS。", language_code: "zh" },
        fallback_used: false,
      }),
    };
    const service = new ActivePlannerMemoryService(ai as any);

    await expect(
      (service as any).groundedAssistantMessage(
        "tenant-1",
        "user-1",
        "库存是多少？",
        {
          status: "READY_WITH_ANALYTICS",
          analytics: { headline: "15 PCS available." },
          questions: [],
        },
        "en",
      ),
    ).resolves.toBe("库存为 15 PCS。");
    expect(ai.structuredJson).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ response_language: "MATCH_USER" }),
      }),
    );
  });

  it("rejects localized digits so verified business figures stay unchanged", async () => {
    const ai = {
      isEnabled: jest.fn(() => true),
      structuredJson: jest.fn().mockResolvedValue({
        value: { answer: "الكمية المتاحة هي ١٥ PCS.", language_code: "ar" },
        fallback_used: false,
      }),
    };
    const service = new ActivePlannerMemoryService(ai as any);

    await expect(
      (service as any).groundedAssistantMessage(
        "tenant-1",
        "user-1",
        "ما هي الكمية المتاحة؟",
        {
          status: "READY_WITH_ANALYTICS",
          analytics: { headline: "15 PCS available." },
          questions: [],
        },
        "ar-EG",
      ),
    ).resolves.toBe("15 PCS available.");
  });

  it("uses a grounded same-language answer without allowing new figures", async () => {
    const ai = {
      isEnabled: jest.fn(() => true),
      structuredJson: jest.fn().mockResolvedValue({
        value: {
          answer: "Super8 Antenna ka available stock 15 PCS hai.",
          language_code: "hi-Latn",
        },
        fallback_used: false,
      }),
    };
    const service = new ActivePlannerMemoryService(ai as any);
    await expect(
      (service as any).groundedAssistantMessage(
        "tenant-1",
        "user-1",
        "super8 antenna ka stock kitna hai?",
        {
          status: "READY_WITH_ANALYTICS",
          analytics: {
            title: "Inventory — Super8 Antenna",
            headline: "15 PCS available across 1 warehouse.",
          },
          questions: [],
        },
      ),
    ).resolves.toBe("Super8 Antenna ka available stock 15 PCS hai.");
  });

  it("rejects a composed answer that introduces an unverified number", async () => {
    const ai = {
      isEnabled: jest.fn(() => true),
      structuredJson: jest.fn().mockResolvedValue({
        value: {
          answer: "You have 15000 PCS available.",
          language_code: "en",
        },
        fallback_used: false,
      }),
    };
    const service = new ActivePlannerMemoryService(ai as any);
    await expect(
      (service as any).groundedAssistantMessage(
        "tenant-1",
        "user-1",
        "stock?",
        {
          status: "READY_WITH_ANALYTICS",
          analytics: { headline: "15 PCS available across 1 warehouse." },
          questions: [],
        },
      ),
    ).resolves.toBe("15 PCS available across 1 warehouse.");
  });

  it("classifies a user correction into a bounded learning target", async () => {
    const ai = {
      isEnabled: jest.fn(() => true),
      structuredJson: jest.fn().mockResolvedValue({
        value: {
          intent_type: "REPORT",
          analytics_kind: "SUPPLIER_ADVANCES",
          confidence: 0.96,
        },
        fallback_used: false,
      }),
    };
    const service = new ActivePlannerMemoryService(ai as any);

    await expect(
      (service as any).classifyCorrection(
        "tenant-1",
        "user-1",
        "supplier money",
        "I meant unused supplier advances, not outstanding payables",
      ),
    ).resolves.toEqual({
      intent_type: "REPORT",
      analytics_kind: "SUPPLIER_ADVANCES",
      confidence: 0.96,
    });
    expect(ai.structuredJson).toHaveBeenCalledWith(
      expect.objectContaining({
        capability: "ACTIVE_PLANNER_VERIFIED_CORRECTION",
        cacheTtlMs: 0,
      }),
    );
  });

  it("does not learn a low-confidence correction", async () => {
    const ai = {
      isEnabled: jest.fn(() => true),
      structuredJson: jest.fn().mockResolvedValue({
        value: {
          intent_type: "REPORT",
          analytics_kind: "SUPPLIER_DUES",
          confidence: 0.61,
        },
        fallback_used: false,
      }),
    };
    const service = new ActivePlannerMemoryService(ai as any);

    await expect(
      (service as any).classifyCorrection(
        "tenant-1",
        "user-1",
        "supplier money",
        "something else",
      ),
    ).resolves.toBeNull();
  });

  it("clears only the signed-in user's visible conversation list by archiving it", async () => {
    const chain: any = {};
    chain.update = jest.fn(() => chain);
    chain.eq = jest.fn(() => chain);
    chain.then = (resolve: any) => resolve({ error: null });
    const service = new ActivePlannerMemoryService();
    (service as any).db = { from: jest.fn(() => chain) };

    await expect(
      service.clear("tenant-1", { id: "user-1" }),
    ).resolves.toMatchObject({ cleared: true });
    expect(chain.update).toHaveBeenCalledWith(
      expect.objectContaining({
        is_archived: true,
        current_context_token: null,
      }),
    );
    expect(chain.eq).toHaveBeenCalledWith("tenant_id", "tenant-1");
    expect(chain.eq).toHaveBeenCalledWith("user_id", "user-1");
    expect(chain.eq).toHaveBeenCalledWith("is_archived", false);
  });
});
