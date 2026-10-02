import { PDFDocument, PDFName, PDFString, StandardFonts } from "pdf-lib";
import sharp from "sharp";
import {
  extractLabelledText,
  safeDocumentFile,
} from "./document-analysis.extraction";
import { DocumentAnalysisService } from "./document-analysis.service";
import {
  emptyExtraction,
  explicitCurrency,
  comparisonWorkbook,
} from "./document-analysis.engine";
import * as XLSX from "xlsx";
import { ActivePlannerController } from "./active-planner.controller";
jest.mock("@supabase/supabase-js", () => ({ createClient: () => mockDb }));
const mockDb: any = {
  from: jest.fn(),
  rpc: jest.fn(),
  storage: { getBucket: jest.fn(), from: jest.fn() },
};
const upload = (bytes: Buffer, name: string, mimetype: string) =>
  ({
    buffer: bytes,
    size: bytes.length,
    originalname: name,
    mimetype,
  }) as Express.Multer.File;
describe("Secure document upload and source extraction", () => {
  it("validates PDF upload with embedded page text", async () => {
    const pdf = await PDFDocument.create(),
      font = await pdf.embedFont(StandardFonts.Helvetica);
    pdf.addPage().drawText("Quotation number: QT-1287", { font, size: 12 });
    const result = await safeDocumentFile(
      upload(Buffer.from(await pdf.save()), "quotation.pdf", "application/pdf"),
    );
    expect(result.pages[0].page).toBe(1);
    expect(result.pages[0].text).toContain("QT-1287");
  });
  it.each(["png", "jpeg"] as const)(
    "validates and sanitizes %s images",
    async (format) => {
      const bytes = await sharp({
        create: { width: 10, height: 10, channels: 3, background: "white" },
      })
        .toFormat(format)
        .toBuffer();
      const result = await safeDocumentFile(
        upload(
          bytes,
          "document." + (format === "jpeg" ? "jpg" : format),
          "image/" + format,
        ),
      );
      expect(result.sanitized).toBe(true);
    },
  );
  it("rejects unsupported Excel upload", async () =>
    expect(
      safeDocumentFile(
        upload(
          Buffer.from("unsupported spreadsheet"),
          "items.xlsx",
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        ),
      ),
    ).rejects.toThrow(/Smart Import/));
  it("rejects MIME spoofing", async () =>
    expect(
      safeDocumentFile(
        upload(
          Buffer.from("<html>not a png</html>"),
          "document.png",
          "image/png",
        ),
      ),
    ).rejects.toThrow());
  it("rejects active PDF actions", async () => {
    const pdf = await PDFDocument.create();
    pdf.addPage();
    pdf.catalog.set(
      PDFName.of("OpenAction"),
      pdf.context.obj({
        S: PDFName.of("JavaScript"),
        JS: PDFString.of("alert(1)"),
      }),
    );
    await expect(
      safeDocumentFile(
        upload(Buffer.from(await pdf.save()), "unsafe.pdf", "application/pdf"),
      ),
    ).rejects.toThrow(/active-content/);
  });
  it("rejects actions nested in annotation arrays", async () => {
    const pdf = await PDFDocument.create(),
      page = pdf.addPage();
    page.node.set(
      PDFName.of("Annots"),
      pdf.context.obj([
        {
          Type: "Annot",
          Subtype: "Link",
          A: { S: "Launch", F: PDFString.of("untrusted.exe") },
        },
      ]),
    );
    await expect(
      safeDocumentFile(
        upload(Buffer.from(await pdf.save()), "unsafe.pdf", "application/pdf"),
      ),
    ).rejects.toThrow(/active-content/);
  });
  it("rejects PDF page bounds", async () => {
    const pdf = await PDFDocument.create();
    for (let page = 0; page < 51; page++) pdf.addPage();
    await expect(
      safeDocumentFile(
        upload(Buffer.from(await pdf.save()), "large.pdf", "application/pdf"),
      ),
    ).rejects.toThrow(/safe limits/);
  });
  it("rejects oversize files before parsing", async () => {
    await expect(
      safeDocumentFile(
        upload(Buffer.alloc(10485761), "large.pdf", "application/pdf"),
      ),
    ).rejects.toThrow(/10 MB/);
  });
  it("extracts quotation schema with evidence and explicit unknowns", () => {
    const extraction = extractLabelledText(
      [
        {
          page: 1,
          text: "Supplier quotation\nSupplier: Hero Steel\nQuotation number: QT-1287\nCurrency: EGP\nItem code | Description | Qty | UOM | Unit rate\nITEM-1 | Steel part | 1000 | PCS | 125",
        },
      ],
      "quotation.pdf",
    );
    expect(extraction.fields.quotation_number.value).toBe("QT-1287");
    expect(extraction.fields.validity.value).toBeNull();
    expect(extraction.lines[0].quantity.value).toBe(1000);
    expect(extraction.lines[0].quantity.page).toBe(1);
  });
  it("extracts invoice fields without inventing tax", () => {
    const extraction = extractLabelledText(
      [
        {
          page: 2,
          text: "Supplier invoice\nInvoice number: INV-1\nPO reference: PO-014\nTotal: 12500",
        },
      ],
      "invoice.pdf",
    );
    expect(extraction.type).toBe("SUPPLIER_INVOICE");
    expect(extraction.fields.tax_total.value).toBeNull();
    expect(extraction.fields.po_reference.page).toBe(2);
  });
  it("extracts visible drawing metadata only", () => {
    const extraction = extractLabelledText(
      [
        {
          page: 1,
          text: "Drawing number: DRW-14\nRevision: B\nPart number: 400-0009\nDimensions: 100 x 50 mm",
        },
      ],
      "drawing.pdf",
    );
    expect(extraction.type).toBe("TECHNICAL_DRAWING");
    expect(extraction.fields.revision.value).toBe("B");
    expect(extraction.fields.dimensions.value).toBe("100 x 50 mm");
  });
});
describe("Document Intelligence metadata ownership and source boundary", () => {
  const tenant = "11111111-1111-4111-8111-111111111111",
    owner = "22222222-2222-4222-8222-222222222222",
    id = "33333333-3333-4333-8333-333333333333";
  const user = { tenantId: tenant, userId: owner, role: "ADMIN" };
  const environment = { ...process.env };
  let service: DocumentAnalysisService,
    row: any,
    selections: Record<string, string>,
    orders: any;
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.ERP_TENANT_PROFILE = "MIZANTRA";
    for (const flag of [
      "MIZANTRA_DOCUMENT_INTELLIGENCE_ENABLED",
      "MIZANTRA_QUOTATION_COMPARE_ENABLED",
      "MIZANTRA_INVOICE_COMPARE_ENABLED",
      "MIZANTRA_DRAWING_INTELLIGENCE_ENABLED",
    ])
      process.env[flag] = "true";
    row = {
      id,
      tenant_id: tenant,
      profile: "MIZANTRA",
      owner_id: owner,
      filename: "quotation.pdf",
      extraction: emptyExtraction("SUPPLIER_QUOTATION"),
      extraction_version: 1,
      storage_path: "private/opaque.pdf",
    };
    selections = {};
    mockDb.from.mockImplementation((table: string) => {
      const filters: Record<string, string> = {};
      const data =
        table === "purchase_orders"
          ? [{ id, currency: null }]
          : table === "purchase_order_items"
            ? [
                {
                  id,
                  item_code: "ITEM-1",
                  ordered_qty: 100,
                  uom: "PCS",
                  rate: 999,
                },
              ]
            : table === "rfqs"
              ? []
              : [];
      const query: any = {
        select: jest.fn((projection: string) => {
          selections[table] = projection;
          return query;
        }),
        eq: jest.fn((field: string, value: string) => {
          filters[field] = value;
          return query;
        }),
        is: jest.fn(() => query),
        gt: jest.fn(() => query),
        order: jest.fn(() => query),
        limit: jest.fn(() => query),
        maybeSingle: jest.fn(async () => ({
          data: Object.entries(filters).every(
            ([field, value]) => row[field] === value,
          )
            ? row
            : null,
          error: null,
        })),
        then: (resolve: any) => resolve({ data, error: null }),
      };
      return query;
    });
    mockDb.storage.getBucket.mockResolvedValue({
      data: { public: false },
      error: null,
    });
    mockDb.rpc.mockResolvedValue({ error: null });
    orders = {
      reportingReceiptEvidence: jest
        .fn()
        .mockResolvedValue([
          { lines: [{ id, received_qty: 90, accepted_qty: 80 }] },
        ]),
    };
    service = new DocumentAnalysisService(orders, {
      validateContext: jest.fn(),
    } as any);
  });
  afterAll(() => {
    process.env = environment;
  });
  it("defaults flags OFF", () => {
    delete process.env.MIZANTRA_DOCUMENT_INTELLIGENCE_ENABLED;
    expect(service.configuration(user).enabled).toBe(false);
  });
  it("blocks disabled uploads before storage or ERP access", async () => {
    process.env.MIZANTRA_DOCUMENT_INTELLIGENCE_ENABLED = "false";
    await expect(
      service.upload(user, upload(Buffer.alloc(8), "a.pdf", "application/pdf")),
    ).rejects.toThrow(/not enabled/);
    expect(mockDb.from).not.toHaveBeenCalled();
  });
  it("rejects unauthenticated tenant identity", async () => {
    await expect(service.get({ ...user, tenantId: "" }, id)).rejects.toThrow(
      /scope/,
    );
    expect(mockDb.from).not.toHaveBeenCalled();
  });
  it("isolates document ownership", async () => {
    await expect(
      service.get(
        { ...user, userId: "44444444-4444-4444-8444-444444444444" },
        id,
      ),
    ).rejects.toThrow(/unavailable/);
  });
  it("isolates tenant scope", async () => {
    await expect(
      service.get(
        { ...user, tenantId: "44444444-4444-4444-8444-444444444444" },
        id,
      ),
    ).rejects.toThrow(/unavailable/);
  });
  it("isolates deployment profile", async () => {
    process.env.ERP_TENANT_PROFILE = "ARWA";
    await expect(service.get(user, id)).rejects.toThrow(/unavailable/);
  });
  it("does not expose private object paths", async () => {
    const result = await service.get(user, id);
    expect(result).not.toHaveProperty("storage_path");
    expect(result).not.toHaveProperty("owner_id");
  });
  it("rejects module permissions even for owned metadata", async () => {
    await expect(
      service.get(
        { tenantId: tenant, userId: owner, permissions: ["items:read"] },
        id,
      ),
    ).rejects.toThrow(/not authorized/);
  });
  it("rejects public buckets rather than falling back", async () => {
    mockDb.storage.getBucket.mockResolvedValue({ data: { public: true } });
    await expect(
      service.upload(user, upload(Buffer.alloc(8), "a.pdf", "application/pdf")),
    ).rejects.toThrow(/Private/);
    expect(mockDb.storage.from).not.toHaveBeenCalled();
  });
  it("uses version-locked metadata-only audited correction RPC", async () => {
    await service.correct(user, id, {
      version: 1,
      changes: [{ field: "supplier", value: "Hero Steel" }],
      tenant_id: "spoofed",
    });
    expect(mockDb.rpc).toHaveBeenCalledWith(
      "mizantra_document_correct",
      expect.objectContaining({
        p_tenant: tenant,
        p_owner: owner,
        p_version: 1,
        p_extraction: expect.objectContaining({
          fields: expect.objectContaining({
            supplier: expect.objectContaining({
              value: "Hero Steel",
              method: "HUMAN_REVIEW",
            }),
          }),
        }),
      }),
    );
    expect(
      mockDb.from.mock.calls.every(
        ([table]: [string]) => table === "mizantra_analysis_uploads",
      ),
    ).toBe(true);
  });
  it("rejects stale corrections", async () => {
    await expect(
      service.correct(user, id, { version: 0, changes: [] }),
    ).rejects.toThrow(/Refresh/);
    expect(mockDb.rpc).not.toHaveBeenCalled();
  });
  it("omits protected ERP prices and uses authoritative accepted receipt quantities", async () => {
    const restricted = {
      tenantId: tenant,
      userId: owner,
      permissions: ["purchase_orders:read", "grn:read"],
    };
    const facts = await (service as any).source(
      { tenant, profile: "MIZANTRA", owner, user: restricted },
      {
        entity_type: "purchase_order",
        entity_id: id,
        document_number: "PO-014",
      },
    );
    expect(selections.purchase_order_items).not.toContain("rate");
    expect(facts.lines[0]).not.toHaveProperty("rate");
    expect(facts.lines[0].accepted).toBe(80);
    expect(facts.currency).toBeNull();
  });
  it("rejects missing exact references rather than fuzzy-matching", async () => {
    await expect(
      (service as any).resolve(
        { tenant, owner, profile: "MIZANTRA", user },
        [row],
        { reference: "RFQ-unknown" },
      ),
    ).rejects.toThrow(/Exact reference/);
  });
  it("rejects stale export before reading ERP facts", async () => {
    row.document_versions = [{ id, version: 0 }];
    row.brain_context = {};
    await expect(service.export(user, id)).rejects.toThrow(
      /Extraction changed/,
    );
    expect(orders.reportingReceiptEvidence).not.toHaveBeenCalled();
  });
  it("never permits document execute or approval requests", () => {
    const controller = new ActivePlannerController(
      { execute: jest.fn(), requestApproval: jest.fn() } as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
    );
    expect(() =>
      controller.execute({ user }, { intent_type: "DOCUMENT_COMPARE" }),
    ).toThrow(/cannot execute/);
    expect(() =>
      controller.requestApproval(
        { user },
        { provider: "MIZANTRA_DOCUMENT_INTELLIGENCE_V1" },
      ),
    ).toThrow(/cannot request approvals/);
  });
  it("reads only explicit stored currency and rejects conflicting values", () => {
    expect(explicitCurrency(null, '{"supplierCurrency":"AED"}')).toBe("AED");
    expect(explicitCurrency(null, "Currency symbol: $")).toBeNull();
    expect(explicitCurrency("EGP", '{"supplierCurrency":"USD"}')).toBeNull();
  });
  it("exports source evidence and opaque document identifiers without formulas", () => {
    const bytes = comparisonWorkbook({
      generated_at: "2026-10-02T00:00:00Z",
      context: { reference: "RFQ-014" } as any,
      results: [
        {
          kind: "MATCH_RESULT",
          document_id: id,
          field: "supplier",
          document_value: "=untrusted()",
          erp_value: "Hero Steel",
          operator: "EXACT_MATCH",
          status: "SUPPLIER_DIFFERENCE",
          evidence: {
            kind: "EXTRACTED_FACT",
            value: "=untrusted()",
            page: 1,
            snippet: "Supplier: =untrusted()",
            confidence: "HIGH",
            method: "PDF_TEXT",
          },
        },
      ],
    });
    const workbook = XLSX.read(bytes, { type: "buffer" }),
      rows: any[] = XLSX.utils.sheet_to_json(workbook.Sheets.Differences);
    expect(rows[0]["Document ID"]).toBe(id);
    expect(rows[0]["Source Snippet"]).toBe("Supplier: =untrusted()");
    expect(rows[0]["Source Method"]).toBe("PDF_TEXT");
    expect(workbook.Sheets.Differences.D2.f).toBeUndefined();
  });
  it("rejects multiple documents with duplicate identifiers", async () => {
    await expect(
      service.compare(user, { document_ids: [id, id] }),
    ).rejects.toThrow(/distinct/);
    expect(mockDb.from).not.toHaveBeenCalled();
  });
});
