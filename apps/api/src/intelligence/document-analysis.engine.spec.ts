import {
  classifyDocument,
  compareDocument,
  emptyExtraction,
  ERPFacts,
  Fact,
  numeric,
  quotationMatrix,
} from "./document-analysis.engine";
const fact = (
  value: string | number | null,
  confidence: Fact["confidence"] = "HIGH",
): Fact => ({
  kind: "EXTRACTED_FACT",
  value,
  confidence,
  page: 1,
  snippet: String(value),
  method: "PDF_TEXT",
});
const erp: ERPFacts = {
  kind: "ERP_FACT",
  entity_type: "rfq",
  entity_id: "rfq",
  reference: "RFQ-014",
  supplier: "Supplier",
  currency: "EGP",
  delivery_date: null,
  payment_terms: null,
  pricing_visible: true,
  lines: [
    {
      id: "one",
      code: "ITEM-1",
      description: "Part",
      quantity: 100,
      uom: "PCS",
      rate: 120,
      received: 90,
      accepted: 80,
    },
  ],
};
function quote(currency: string | null = "EGP") {
  const result = emptyExtraction("SUPPLIER_QUOTATION");
  result.classification_confidence = "HIGH";
  result.fields.currency = fact(currency);
  result.fields.supplier = fact("Supplier");
  result.lines = [
    {
      source_item_code: fact("ITEM-1"),
      source_description: fact("Part"),
      quantity: fact(100),
      uom: fact("PCS"),
      unit_rate: fact(125),
      tax: fact(null),
      line_amount: fact(null),
    },
  ];
  return result;
}
describe("Document Intelligence deterministic boundaries", () => {
  it.each([null, "", " ", "unknown", true, "1,000"])(
    "does not invent numeric values from %p",
    (value) => expect(numeric(value)).toBeNull(),
  );
  it("classifies text quotations", () =>
    expect(classifyDocument("file.pdf", "Supplier quotation QT-1").type).toBe(
      "SUPPLIER_QUOTATION",
    ));
  it("asks for classification confirmation on filename-only evidence", () =>
    expect(classifyDocument("quotation.pdf", "").confidence).toBe("LOW"));
  it("keeps absent fields unknown", () =>
    expect(emptyExtraction().fields.currency.value).toBeNull());
  it("exactly matches RFQ items", () =>
    expect(
      compareDocument(quote(), erp).some(
        (row) => row.status === "MATCHED" && row.field === "item",
      ),
    ).toBe(true));
  it("detects missing items in an extracted quotation", () => {
    const additional = {
      ...erp,
      lines: [
        ...erp.lines,
        {
          id: "second-line",
          code: "ITEM-2",
          description: "Second item",
          quantity: 20,
          uom: "PCS",
        },
      ],
    };
    expect(
      compareDocument(quote(), additional).some(
        (row) =>
          row.status === "MISSING_FROM_QUOTE" && row.item_code === "ITEM-2",
      ),
    ).toBe(true);
  });
  it("does not invent missing items when line extraction is unavailable", () => {
    const document = quote();
    document.lines = [];
    expect(
      compareDocument(document, erp).some(
        (row) =>
          row.status === "INSUFFICIENT_EVIDENCE" && row.field === "line_items",
      ),
    ).toBe(true);
    expect(
      compareDocument(document, erp).some(
        (row) => row.status === "MISSING_FROM_QUOTE",
      ),
    ).toBe(false);
  });
  it("detects extra items", () => {
    const document = quote();
    document.lines[0].source_item_code = fact("OTHER");
    document.lines[0].source_description = fact("Other");
    expect(
      compareDocument(document, erp).some(
        (row) => row.status === "EXTRA_IN_QUOTE",
      ),
    ).toBe(true);
  });
  it("requires review for description-only matches", () => {
    const document = quote();
    document.lines[0].source_item_code = fact(null);
    expect(
      compareDocument(document, erp).some(
        (row) => row.status === "POSSIBLE_MATCH",
      ),
    ).toBe(true);
  });
  it("detects quantity differences", () => {
    const document = quote();
    document.lines[0].quantity = fact(120);
    expect(
      compareDocument(document, erp).some(
        (row) => row.status === "QUANTITY_DIFFERENCE",
      ),
    ).toBe(true);
  });
  it("detects UOM differences without conversion", () => {
    const document = quote();
    document.lines[0].uom = fact("KG");
    expect(
      compareDocument(document, erp).some(
        (row) => row.status === "UOM_DIFFERENCE",
      ),
    ).toBe(true);
  });
  it("compares same-currency rates", () =>
    expect(
      compareDocument(quote(), erp).some(
        (row) => row.status === "PRICE_DIFFERENCE",
      ),
    ).toBe(true));
  it.each(["USD", null])(
    "does not compare unknown or differing currency %p",
    (currency) =>
      expect(
        compareDocument(quote(currency), erp).some(
          (row) => row.status === "NOT_COMPARABLE",
        ),
      ).toBe(true),
  );
  it("does not confirm medium confidence quantities", () => {
    const document = quote();
    document.lines[0].quantity = fact(1000, "MEDIUM");
    expect(
      compareDocument(document, erp).some(
        (row) => row.status === "REVIEW_REQUIRED",
      ),
    ).toBe(true);
  });
  it("compares invoice accepted GRN quantity", () => {
    const document = quote();
    document.type = "SUPPLIER_INVOICE";
    expect(
      compareDocument(document, erp).find((row) => row.field === "accepted_qty")
        ?.erp_value,
    ).toBe(80);
  });
  it("never exposes ERP pricing without permission", () =>
    expect(
      compareDocument(quote(), { ...erp, pricing_visible: false }).some(
        (row) => row.field === "unit_rate",
      ),
    ).toBe(false));
  it("builds multi-quote facts without a supplier verdict", () => {
    const matrix = quotationMatrix(
      [
        { id: "a", extraction: quote() },
        { id: "b", extraction: quote() },
      ],
      erp,
    );
    expect(matrix[0].lowest_quoted_rate).toBe(125);
    expect(JSON.stringify(matrix)).not.toMatch(
      /best_supplier|recommended_supplier|approve/i,
    );
  });
  it("does not rank cross-currency quotations", () =>
    expect(
      quotationMatrix(
        [
          { id: "a", extraction: quote() },
          { id: "b", extraction: quote("USD") },
        ],
        erp,
      )[0].lowest_quoted_rate,
    ).toBeNull());
  it.each([
    ["B", "B", "MATCH"],
    ["A", "B", "OLDER_REVISION"],
    ["C", "B", "NEWER_UNREGISTERED_REVISION"],
  ])(
    "compares registered drawing revision %s to %s",
    (revision, registered, status) => {
      const document = emptyExtraction("TECHNICAL_DRAWING");
      document.classification_confidence = "HIGH";
      document.fields.revision = fact(revision);
      expect(
        compareDocument(document, {
          ...erp,
          revision: registered,
          latest_revision: true,
        }).find((row) => row.field === "revision")?.status,
      ).toBe(status);
    },
  );
});
