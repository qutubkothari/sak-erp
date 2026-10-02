import * as XLSX from "xlsx";

export const DOCUMENT_TYPES = [
  "SUPPLIER_QUOTATION",
  "SUPPLIER_INVOICE",
  "TECHNICAL_DRAWING",
  "PURCHASE_DOCUMENT",
  "GENERIC_BUSINESS_DOCUMENT",
] as const;
export type DocumentType = (typeof DOCUMENT_TYPES)[number];
export type Confidence = "HIGH" | "MEDIUM" | "LOW";
export type Fact = {
  kind: "EXTRACTED_FACT";
  value: string | number | null;
  page: number | null;
  snippet: string | null;
  confidence: Confidence;
  method: "PDF_TEXT" | "VISION_OCR" | "HUMAN_REVIEW" | "UNKNOWN";
};
export const HEADER_FIELDS = [
  "supplier",
  "quotation_number",
  "quotation_date",
  "invoice_number",
  "invoice_date",
  "po_reference",
  "rfq_reference",
  "currency",
  "validity",
  "payment_terms",
  "delivery_terms",
  "delivery_date",
  "total",
  "tax_total",
  "notes",
  "drawing_number",
  "revision",
  "part_number",
  "description",
  "dimensions",
  "date",
  "document_title",
] as const;
export const LINE_FIELDS = [
  "source_description",
  "source_item_code",
  "quantity",
  "uom",
  "unit_rate",
  "tax",
  "line_amount",
] as const;
export type Extraction = {
  type: DocumentType;
  classification_confidence: Confidence;
  fields: Record<string, Fact>;
  lines: Record<string, Fact>[];
  warnings: string[];
};
export type ERPLine = {
  id: string;
  code: string | null;
  description: string | null;
  quantity: number | null;
  uom: string | null;
  rate?: number | null;
  received?: number | null;
  accepted?: number | null;
};
export type ERPFacts = {
  kind: "ERP_FACT";
  entity_type: string;
  entity_id: string;
  reference: string;
  supplier: string | null;
  currency: string | null;
  delivery_date: string | null;
  payment_terms: string | null;
  lines: ERPLine[];
  drawing_number?: string | null;
  revision?: string | null;
  part_number?: string | null;
  latest_revision?: boolean | null;
  total?: number | null;
  tax_total?: number | null;
  pricing_visible: boolean;
};
export type Difference = {
  kind: "MATCH_RESULT";
  operator: string;
  status: string;
  field: string;
  document_value: unknown;
  erp_value: unknown;
  document_id?: string;
  item_code?: string | null;
  evidence?: Fact;
  interpretation?: { kind: "INTERPRETATION"; message: string };
};
export const key = (value: unknown) =>
  String(value ?? "")
    .normalize("NFKC")
    .trim()
    .replace(/\s+/g, " ")
    .toUpperCase();
export function numeric(value: unknown): number | null {
  if (
    value == null ||
    typeof value === "boolean" ||
    !String(value).trim() ||
    !/^-?\d+(?:\.\d+)?$/.test(String(value).trim())
  )
    return null;
  const result = Number(value);
  return Number.isFinite(result) ? result : null;
}
export function explicitCurrency(
  metadata: unknown,
  terms: unknown,
): string | null {
  const values = new Set<string>();
  if (typeof metadata === "string" && /^[A-Z]{3}$/.test(metadata))
    values.add(metadata);
  try {
    const parsed = typeof terms === "string" ? JSON.parse(terms) : terms;
    if (
      typeof parsed?.supplierCurrency === "string" &&
      /^[A-Z]{3}$/.test(parsed.supplierCurrency)
    )
      values.add(parsed.supplierCurrency);
  } catch {}
  return values.size === 1 ? [...values][0] : null;
}
export function unknownFact(): Fact {
  return {
    kind: "EXTRACTED_FACT",
    value: null,
    page: null,
    snippet: null,
    confidence: "LOW",
    method: "UNKNOWN",
  };
}
export function emptyExtraction(
  type: DocumentType = "GENERIC_BUSINESS_DOCUMENT",
): Extraction {
  return {
    type,
    classification_confidence: "LOW",
    fields: Object.fromEntries(
      HEADER_FIELDS.map((field) => [field, unknownFact()]),
    ),
    lines: [],
    warnings: [],
  };
}
export function classifyDocument(
  filename: string,
  text: string,
  instruction = "",
): { type: DocumentType; confidence: Confidence } {
  const content = key(text),
    hint = key(filename + " " + instruction);
  const patterns: Array<[DocumentType, RegExp]> = [
    [
      "TECHNICAL_DRAWING",
      /DRAWING (?:NO|NUMBER)|TITLE BLOCK|TECHNICAL DRAWING/,
    ],
    ["SUPPLIER_INVOICE", /(?:TAX )?INVOICE/],
    ["SUPPLIER_QUOTATION", /QUOTATION|QUOTE NUMBER/],
    [
      "PURCHASE_DOCUMENT",
      /PURCHASE ORDER|PURCHASE REQUISITION|REQUEST FOR QUOTATION|\bRFQ\b/,
    ],
  ];
  const matches = patterns.filter(([, pattern]) => pattern.test(content));
  if (matches.length === 1) return { type: matches[0][0], confidence: "HIGH" };
  if (matches.length > 1) return { type: matches[0][0], confidence: "MEDIUM" };
  const hinted = patterns.filter(([, pattern]) => pattern.test(hint));
  return {
    type: hinted[0]?.[0] || "GENERIC_BUSINESS_DOCUMENT",
    confidence: "LOW",
  };
}
export function reviewedExtraction(input: unknown): Extraction {
  if (!input || typeof input !== "object" || Array.isArray(input))
    throw new Error("Structured extraction required.");
  const data = input as any;
  if (
    !DOCUMENT_TYPES.includes(data.type) ||
    !["HIGH", "MEDIUM", "LOW"].includes(data.classification_confidence)
  )
    throw new Error("Invalid document classification.");
  if (!data.fields || !Array.isArray(data.lines) || data.lines.length > 200)
    throw new Error("Invalid extraction fields or line bound.");
  const output = emptyExtraction(data.type);
  output.classification_confidence = data.classification_confidence;
  function fact(value: any, field: string): Fact {
    if (!value || typeof value !== "object") return unknownFact();
    if (
      value.value != null &&
      !["string", "number"].includes(typeof value.value)
    )
      throw new Error("Invalid extracted value.");
    if (
      String(value.value ?? "").length > 2000 ||
      String(value.snippet ?? "").length > 1000 ||
      !["HIGH", "MEDIUM", "LOW"].includes(value.confidence) ||
      !["PDF_TEXT", "VISION_OCR", "HUMAN_REVIEW", "UNKNOWN"].includes(
        value.method,
      ) ||
      (value.page != null &&
        (!Number.isInteger(value.page) || value.page < 1 || value.page > 50))
    )
      throw new Error("Invalid extraction evidence.");
    const numberField = [
      "quantity",
      "unit_rate",
      "tax",
      "line_amount",
      "total",
      "tax_total",
    ].includes(field);
    const result = numberField
      ? numeric(value.value)
      : value.value == null || !String(value.value).trim()
        ? null
        : String(value.value).trim();
    if (numberField && value.value != null && result == null)
      throw new Error("Numeric extraction must be explicit.");
    if (
      field === "currency" &&
      result != null &&
      !/^[A-Z]{3}$/.test(String(result))
    )
      throw new Error("Currency must be an explicit three-letter code.");
    return {
      kind: "EXTRACTED_FACT",
      value: result,
      page: value.page ?? null,
      snippet: value.snippet ?? null,
      confidence:
        result == null ||
        (value.method === "HUMAN_REVIEW" && value.page == null)
          ? "LOW"
          : value.confidence,
      method: result == null ? "UNKNOWN" : value.method,
    };
  }
  for (const field of HEADER_FIELDS)
    output.fields[field] = fact(data.fields[field], field);
  output.lines = data.lines.map((line: any) =>
    Object.fromEntries(
      LINE_FIELDS.map((field) => [field, fact(line?.[field], field)]),
    ),
  );
  output.warnings = Array.isArray(data.warnings)
    ? data.warnings
        .slice(0, 20)
        .map((value: unknown) => String(value).slice(0, 300))
    : [];
  return output;
}
export function compareFact(
  field: string,
  fact: Fact,
  erpValue: unknown,
  different: string,
): Difference {
  const base = {
    kind: "MATCH_RESULT" as const,
    field,
    document_value: fact.value,
    erp_value: erpValue ?? null,
    evidence: fact,
  };
  if (fact.value == null || erpValue == null)
    return { ...base, operator: "MISSING", status: "INSUFFICIENT_EVIDENCE" };
  if (fact.confidence !== "HIGH")
    return {
      ...base,
      operator: "REVIEW_REQUIRED",
      status: "REVIEW_REQUIRED",
      interpretation: {
        kind: "INTERPRETATION",
        message:
          "Verify the extracted value before relying on this comparison.",
      },
    };
  if (typeof fact.value === "number")
    return {
      ...base,
      operator:
        fact.value === erpValue ? "NUMERIC_MATCH" : "NUMERIC_DIFFERENCE",
      status: fact.value === erpValue ? "MATCHED" : different,
    };
  const exact = fact.value === erpValue,
    match = key(fact.value) === key(erpValue);
  return {
    ...base,
    operator: exact
      ? "EXACT_MATCH"
      : match
        ? "NORMALIZED_MATCH"
        : field.includes("date")
          ? "DATE_DIFFERENCE"
          : "EXACT_MATCH",
    status: match ? "MATCHED" : different,
  };
}
export function compareDocument(
  document: Extraction,
  erp: ERPFacts,
): Difference[] {
  const result: Difference[] = [];
  if (document.classification_confidence !== "HIGH")
    return [
      {
        kind: "MATCH_RESULT",
        operator: "REVIEW_REQUIRED",
        status: "CONFIRM_DOCUMENT_TYPE",
        field: "document_type",
        document_value: document.type,
        erp_value: erp.entity_type,
      },
    ];
  if (document.type === "TECHNICAL_DRAWING") {
    result.push(
      compareFact(
        "drawing_number",
        document.fields.drawing_number,
        erp.drawing_number,
        "DRAWING_NUMBER_MISMATCH",
      ),
    );
    result.push(
      compareFact(
        "part_number",
        document.fields.part_number,
        erp.part_number,
        "ITEM_MISMATCH",
      ),
    );
    const revision = compareFact(
      "revision",
      document.fields.revision,
      erp.revision,
      "INSUFFICIENT_EVIDENCE",
    );
    const first = String(revision.document_value ?? ""),
      second = String(revision.erp_value ?? "");
    if (revision.status === "MATCHED")
      revision.status =
        erp.latest_revision === true ? "MATCH" : "INSUFFICIENT_EVIDENCE";
    else if (
      revision.operator !== "REVIEW_REQUIRED" &&
      erp.latest_revision === true &&
      ((/^\d+$/.test(first) && /^\d+$/.test(second)) ||
        (/^[A-Z]$/.test(first) && /^[A-Z]$/.test(second)))
    )
      revision.status = /^\d+$/.test(first)
        ? Number(first) < Number(second)
          ? "OLDER_REVISION"
          : "NEWER_UNREGISTERED_REVISION"
        : first < second
          ? "OLDER_REVISION"
          : "NEWER_UNREGISTERED_REVISION";
    result.push(revision);
    return result;
  }
  result.push(
    compareFact(
      "supplier",
      document.fields.supplier,
      erp.supplier,
      "SUPPLIER_DIFFERENCE",
    ),
  );
  result.push(
    compareFact(
      "delivery_date",
      document.fields.delivery_date,
      erp.delivery_date,
      "DELIVERY_DIFFERENCE",
    ),
  );
  result.push(
    compareFact(
      "payment_terms",
      document.fields.payment_terms,
      erp.payment_terms,
      "TERM_DIFFERENCE",
    ),
  );
  if (document.type === "SUPPLIER_INVOICE")
    result.push(
      compareFact(
        "po_reference",
        document.fields.po_reference,
        erp.reference,
        "REFERENCE_DIFFERENCE",
      ),
    );
  if (document.type === "SUPPLIER_QUOTATION")
    result.push(
      compareFact(
        "rfq_reference",
        document.fields.rfq_reference,
        erp.reference,
        "REFERENCE_DIFFERENCE",
      ),
    );
  if (erp.pricing_visible)
    for (const field of ["total", "tax_total"] as const) {
      const comparable =
        document.lines.length > 0 &&
        document.lines.length === erp.lines.length &&
        document.lines.every((line) => {
          const matches = erp.lines.filter(
            (item) => key(item.code) === key(line.source_item_code.value),
          );
          return (
            line.source_item_code.confidence === "HIGH" &&
            matches.length === 1 &&
            line.uom.confidence === "HIGH" &&
            line.uom.value != null &&
            key(line.uom.value) === key(matches[0].uom)
          );
        }) &&
        document.fields.currency.confidence === "HIGH" &&
        document.fields.currency.value != null &&
        erp.currency != null &&
        key(document.fields.currency.value) === key(erp.currency);
      result.push(
        comparable
          ? compareFact(
              field,
              document.fields[field],
              erp[field],
              field === "total" ? "TOTAL_DIFFERENCE" : "TAX_DIFFERENCE",
            )
          : {
              kind: "MATCH_RESULT",
              operator: "NOT_COMPARABLE",
              status: "NOT_COMPARABLE",
              field,
              document_value: document.fields[field].value,
              erp_value: null,
              evidence: document.fields[field],
            },
      );
    }
  const consumed = new Set<string>();
  if (!document.lines.length)
    return [
      ...result,
      {
        kind: "MATCH_RESULT",
        operator: "MISSING",
        status: "INSUFFICIENT_EVIDENCE",
        field: "line_items",
        document_value: null,
        erp_value: null,
      },
    ];
  for (const line of document.lines) {
    const code = key(line.source_item_code.value);
    const matches =
      code && line.source_item_code.confidence === "HIGH"
        ? erp.lines.filter((item) => key(item.code) === code)
        : [];
    const base = {
      kind: "MATCH_RESULT" as const,
      field: "item",
      item_code: line.source_item_code.value as string | null,
      document_value: line.source_description.value,
      erp_value: null,
      evidence: line.source_item_code,
    };
    if (matches.length !== 1 || (matches[0] && consumed.has(matches[0].id))) {
      const possible =
        !code ||
        line.source_item_code.confidence !== "HIGH" ||
        erp.lines.some(
          (item) =>
            key(item.description) === key(line.source_description.value),
        );
      result.push({
        ...base,
        operator: possible || matches.length > 1 ? "REVIEW_REQUIRED" : "EXTRA",
        status:
          possible || matches.length > 1 ? "POSSIBLE_MATCH" : "EXTRA_IN_QUOTE",
      });
      continue;
    }
    const matched = matches[0];
    consumed.add(matched.id);
    result.push({
      ...base,
      erp_value: matched.code,
      operator: "EXACT_MATCH",
      status: "MATCHED",
    });
    result.push({
      ...compareFact(
        "quantity",
        line.quantity,
        matched.quantity,
        "QUANTITY_DIFFERENCE",
      ),
      item_code: matched.code,
    });
    result.push({
      ...compareFact("uom", line.uom, matched.uom, "UOM_DIFFERENCE"),
      item_code: matched.code,
    });
    if (document.type === "SUPPLIER_INVOICE") {
      result.push({
        ...compareFact(
          "received_qty",
          line.quantity,
          matched.received,
          "QUANTITY_DIFFERENCE",
        ),
        item_code: matched.code,
      });
      result.push({
        ...compareFact(
          "accepted_qty",
          line.quantity,
          matched.accepted,
          "QUANTITY_DIFFERENCE",
        ),
        item_code: matched.code,
      });
    }
    const comparable =
      line.uom.value != null &&
      document.fields.currency.value != null &&
      key(line.uom.value) === key(matched.uom) &&
      key(document.fields.currency.value) === key(erp.currency) &&
      line.uom.confidence === "HIGH" &&
      document.fields.currency.confidence === "HIGH";
    if (erp.pricing_visible)
      result.push({
        ...(matched.rate == null && erp.entity_type === "rfq"
          ? {
              kind: "MATCH_RESULT" as const,
              operator:
                line.unit_rate.confidence === "HIGH"
                  ? "EXACT_MATCH"
                  : "REVIEW_REQUIRED",
              status:
                line.unit_rate.value != null
                  ? line.unit_rate.confidence === "HIGH"
                    ? "PRICE_PROVIDED"
                    : "REVIEW_REQUIRED"
                  : "INSUFFICIENT_EVIDENCE",
              field: "unit_rate",
              document_value: line.unit_rate.value,
              erp_value: null,
              evidence: line.unit_rate,
            }
          : comparable
            ? compareFact(
                "unit_rate",
                line.unit_rate,
                matched.rate,
                "PRICE_DIFFERENCE",
              )
            : {
                kind: "MATCH_RESULT" as const,
                operator: "NOT_COMPARABLE",
                status: "NOT_COMPARABLE",
                field: "unit_rate",
                document_value: line.unit_rate.value,
                erp_value: null,
                evidence: line.unit_rate,
              }),
        item_code: matched.code,
      });
  }
  for (const item of erp.lines.filter((line) => !consumed.has(line.id)))
    result.push({
      kind: "MATCH_RESULT",
      operator: document.lines.some(
        (line) => line.source_item_code.confidence !== "HIGH",
      )
        ? "REVIEW_REQUIRED"
        : "MISSING",
      status: document.lines.some(
        (line) => line.source_item_code.confidence !== "HIGH",
      )
        ? "REVIEW_REQUIRED"
        : "MISSING_FROM_QUOTE",
      field: "item",
      document_value: null,
      erp_value: item.code,
      item_code: item.code,
    });
  return result;
}
export function quotationMatrix(
  documents: Array<{ id: string; extraction: Extraction }>,
  erp: ERPFacts,
) {
  return erp.lines.map((item) => {
    const quotes = documents.map((document) => {
      const matching = document.extraction.lines.filter(
        (line) =>
          !!item.code &&
          erp.lines.filter(candidate => key(candidate.code) === key(item.code)).length === 1 &&
          key(line.source_item_code.value) === key(item.code) &&
          line.source_item_code.confidence === "HIGH",
      );
      const line = matching.length === 1 ? matching[0] : null;
      const currency = document.extraction.fields.currency,
        rate = line?.unit_rate,
        uom = line?.uom;
      const comparable =
        !!line &&
        document.extraction.classification_confidence === 'HIGH' &&
        (document.extraction.fields.rfq_reference.value == null ||
          (document.extraction.fields.rfq_reference.confidence === "HIGH" &&
            key(document.extraction.fields.rfq_reference.value) ===
              key(erp.reference))) &&
        !!rate &&
        rate.value != null &&
        rate.confidence === "HIGH" &&
        !!uom?.value &&
        uom.confidence === "HIGH" &&
        !!currency.value &&
        currency.confidence === "HIGH" &&
        key(uom.value) === key(item.uom);
      return {
        document_id: document.id,
        supplier: document.extraction.fields.supplier.value,
        quantity: line?.quantity.value ?? null,
        rate: erp.pricing_visible ? (rate?.value ?? null) : null,
        currency: currency.value,
        uom: uom?.value ?? null,
        delivery: document.extraction.fields.delivery_terms.value,
        payment_terms: document.extraction.fields.payment_terms.value,
        comparable,
      };
    });
    const currencies = new Set(quotes.map((quote) => key(quote.currency)));
    const comparable =
      erp.pricing_visible &&
      quotes.every((quote) => quote.comparable) &&
      currencies.size === 1;
    return {
      kind: "MATCH_RESULT",
      item: item.code,
      requested_qty: item.quantity,
      uom: item.uom,
      quotes,
      status: comparable ? "COMPARABLE" : "NOT_COMPARABLE",
      lowest_quoted_rate: comparable
        ? Math.min(...quotes.map((quote) => Number(quote.rate)))
        : null,
    };
  });
}
export function comparisonWorkbook(comparison: {
  results: Difference[];
  matrix?: unknown[];
  context: ERPFacts;
  generated_at: string;
}) {
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(
    workbook,
    XLSX.utils.aoa_to_sheet([
      ["Reference", comparison.context.reference],
      ["Generated", comparison.generated_at],
      [
        "Boundary",
        "Read-only factual comparison; no approval or supplier-selection verdict.",
      ],
    ]),
    "Comparison",
  );
  XLSX.utils.book_append_sheet(
    workbook,
    XLSX.utils.json_to_sheet(
      comparison.results.map((row) => ({
        "Document ID": row.document_id ?? null,
        Item: row.item_code ?? null,
        Field: row.field,
        Document: row.document_value ?? null,
        ERP: row.erp_value ?? null,
        Operator: row.operator,
        Status: row.status,
        Page: row.evidence?.page ?? null,
        Confidence: row.evidence?.confidence ?? null,
        "Source Method": row.evidence?.method ?? null,
        "Source Snippet": row.evidence?.snippet ?? null,
      })),
    ),
    "Differences",
  );
  if (comparison.matrix)
    XLSX.utils.book_append_sheet(
      workbook,
      XLSX.utils.json_to_sheet(
        comparison.matrix.flatMap((row: any) =>
          row.quotes.map((quote: any) => ({
            Item: row.item,
            "Requested Qty": row.requested_qty,
            Supplier: quote.supplier,
            "Quoted Qty": quote.quantity,
            UOM: quote.uom,
            Rate: quote.rate,
            Currency: quote.currency,
            Delivery: quote.delivery,
            "Payment Terms": quote.payment_terms,
            Status: row.status,
            "Lowest Comparable Rate": row.lowest_quoted_rate,
          })),
        ),
      ),
      "Supplier Matrix",
    );
  return XLSX.write(workbook, { type: "buffer", bookType: "xlsx" }) as Buffer;
}
