"use client";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  Download,
  Eye,
  FileText,
  Loader2,
  Plus,
  Save,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import Link from "next/link";
import { apiClient } from "../../lib/api-client";
import type { BrainEnvelope } from "@/lib/brain-context";
type Fact = {
  value: string | number | null;
  page: number | null;
  snippet: string | null;
  confidence: string;
  method: string;
  kind: string;
};
type Document = {
  id: string;
  filename: string;
  mime: string;
  version: number;
  expires_at: string;
  review_required: boolean;
  extraction: {
    type: string;
    classification_confidence: string;
    fields: Record<string, Fact>;
    lines: Record<string, Fact>[];
    warnings: string[];
  };
};
export type DocumentComparison = {
  id: string;
  status: string;
  brain_context: BrainEnvelope;
  context: { reference: string };
  generated_at: string;
  results: Array<{
    document_id: string;
    item_code?: string;
    field: string;
    document_value: unknown;
    erp_value: unknown;
    operator: string;
    status: string;
    evidence?: Fact;
  }>;
  matrix?: Array<{
    item: string;
    requested_qty: number | null;
    status: string;
    lowest_quoted_rate: number | null;
    quotes: Array<{
      document_id: string;
      supplier: string | null;
      quantity: number | null;
      rate: number | null;
      currency: string | null;
      uom: string | null;
      delivery: string | null;
      payment_terms: string | null;
    }>;
  }>;
};
const base = "/active-planner/document-intelligence";
const types = [
  "SUPPLIER_QUOTATION",
  "SUPPLIER_INVOICE",
  "TECHNICAL_DRAWING",
  "PURCHASE_DOCUMENT",
  "GENERIC_BUSINESS_DOCUMENT",
];
const labels = (value: string) => value.toLowerCase().replaceAll("_", " ");
const display = (value: unknown) =>
  value == null || value === "" ? "Unknown" : String(value);
export default function MizantraDocuments({
  refreshSignal,
  selectedIds,
  onSelection,
  onEnabled,
  comparison,
  onDiagnosis,
}: {
  refreshSignal: number;
  selectedIds: string[];
  onSelection: (ids: string[]) => void;
  onEnabled: (enabled: boolean) => void;
  comparison?: DocumentComparison;
  onDiagnosis: (context: BrainEnvelope) => void;
}) {
  const [enabled, setEnabled] = useState(false),
    [documents, setDocuments] = useState<Document[]>([]),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [review, setReview] = useState<Document | null>(null),
    [confirmed, setConfirmed] = useState(false),
    [confirmedType, setConfirmedType] = useState(false),
    [addedLine, setAddedLine] = useState(false),
    [preview, setPreview] = useState<{
      url: string;
      mime: string;
      filename: string;
    } | null>(null);
  const previewRef = useRef<string | null>(null);
  const [manualPage, setManualPage] = useState("");
  useEffect(() => {
    let active = true;
    void apiClient
      .get<{ enabled: boolean }>(base + "/configuration")
      .then((config) => {
        if (active) {
          setEnabled(config.enabled);
          onEnabled(config.enabled);
        }
      })
      .catch(() => {
        if (active) {
          setEnabled(false);
          onEnabled(false);
        }
      });
    return () => {
      active = false;
    };
  }, []);
  const load = async () => {
    const rows = await apiClient.get<Document[]>(base + "/uploads");
    setDocuments(rows);
  };
  useEffect(() => {
    if (enabled)
      void load().catch(() => setError("Document metadata is unavailable."));
  }, [enabled, refreshSignal]);
  useEffect(
    () => () => {
      if (previewRef.current) URL.revokeObjectURL(previewRef.current);
    },
    [],
  );
  if (!enabled) return null;
  const run = async (action: () => Promise<void>) => {
    setBusy(true);
    setError("");
    try {
      await action();
    } catch (cause: any) {
      setError(cause?.message || "Document operation could not be completed.");
    } finally {
      setBusy(false);
    }
  };
  const view = (document: Document) =>
    run(async () => {
      const blob = await apiClient.getBlob(
        base + "/uploads/" + document.id + "/file",
      );
      if (previewRef.current) URL.revokeObjectURL(previewRef.current);
      const url = URL.createObjectURL(blob);
      previewRef.current = url;
      setPreview({ url, mime: document.mime, filename: document.filename });
    });
  const download = async () => {
    if (!comparison) return;
    const blob = await apiClient.postBlob(
        base + "/comparisons/" + comparison.id + "/export",
        {},
      ),
      url = URL.createObjectURL(blob),
      anchor = window.document.createElement("a");
    anchor.href = url;
    anchor.download = "mizantra-document-comparison.xlsx";
    anchor.click();
    URL.revokeObjectURL(url);
  };
  const change = (field: string, value: string, line?: number) => {
    if (!review) return;
    const next = structuredClone(review),
      target =
        line == null ? next.extraction.fields : next.extraction.lines[line];
    target[field].value =
      value.trim() === ""
        ? null
        : [
              "quantity",
              "unit_rate",
              "tax",
              "line_amount",
              "total",
              "tax_total",
            ].includes(field) && /^-?\d+(?:\.\d+)?$/.test(value)
          ? Number(value)
          : value;
    setReview(next);
    setConfirmed(false);
  };
  const saveReview = () =>
    run(async () => {
      if (!review) return;
      const changes = [
        ...Object.entries(review.extraction.fields).map(([field, fact]) => ({
          field,
          value: fact.value,
          page: fact.page ?? (manualPage ? Number(manualPage) : null),
          snippet: fact.snippet,
        })),
        ...review.extraction.lines.flatMap((line, index) =>
          Object.entries(line).map(([field, fact]) => ({
            line: index,
            field,
            value: fact.value,
            page: fact.page ?? (manualPage ? Number(manualPage) : null),
            snippet: fact.snippet,
          })),
        ),
      ];
      await apiClient.post(base + "/uploads/" + review.id + "/review", {
        version: review.version,
        changes,
        type: review.extraction.type,
        confirm_type: confirmedType,
        confirm_extraction: confirmed,
        add_line: addedLine,
      });
      setReview(null);
      await load();
    });
  return (
    <section
      aria-label="Document Intelligence"
      className="max-h-[45vh] min-w-0 overflow-y-auto border-t border-stone-200 px-3 py-3 text-sm"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="flex items-center gap-2 text-sm font-semibold">
          <FileText className="h-4 w-4" />
          Documents
        </h3>
        <div className="flex items-center gap-2">
          <Link
            href="/dashboard/support/admin/smart-imports"
            className="text-xs underline"
          >
            Smart Import
          </Link>
          <label
            title="Upload business document"
            className="cursor-pointer p-2"
          >
            <Upload className="h-4 w-4" />
            <input
              aria-label="Upload business document"
              type="file"
              className="hidden"
              accept="application/pdf,image/png,image/jpeg"
              disabled={busy}
              onChange={(event) => {
                const file = event.target.files?.[0];
                event.target.value = "";
                if (file)
                  void run(async () => {
                    const form = new FormData();
                    form.append("file", file);
                    const document = await apiClient.postForm<Document>(
                      base + "/uploads",
                      form,
                    );
                    onSelection([
                      ...selectedIds
                        .filter((id) => id !== document.id)
                        .slice(-2),
                      document.id,
                    ]);
                    await load();
                  });
              }}
            />
          </label>
          {busy && (
            <Loader2
              className="h-4 w-4 animate-spin"
              aria-label="Processing document"
            />
          )}
        </div>
      </div>
      {error && (
        <p role="alert" className="break-words py-2 text-xs text-red-700">
          {error}
        </p>
      )}
      <div className="max-h-48 overflow-auto">
        <table className="w-full text-left text-xs">
          <thead>
            <tr>
              <th className="w-8">
                <span className="sr-only">Select</span>
              </th>
              <th>Document</th>
              <th>Review</th>
              <th className="w-28">Actions</th>
            </tr>
          </thead>
          <tbody>
            {documents.map((document) => (
              <tr key={document.id} className="border-t border-stone-100">
                <td>
                  <input
                    aria-label={"Compare " + document.filename}
                    type="checkbox"
                    checked={selectedIds.includes(document.id)}
                    disabled={
                      busy ||
                      (!selectedIds.includes(document.id) &&
                        selectedIds.length >= 3)
                    }
                    onChange={(event) =>
                      onSelection(
                        event.target.checked
                          ? [...selectedIds, document.id]
                          : selectedIds.filter((id) => id !== document.id),
                      )
                    }
                  />
                </td>
                <td className="max-w-48 break-words py-2 pr-2">
                  {document.filename}
                  <span className="block text-stone-500">
                    {labels(document.extraction.type)}
                  </span>
                </td>
                <td>{document.review_required ? "Required" : "Reviewed"}</td>
                <td>
                  <div className="flex">
                    <button
                      type="button"
                      disabled={busy}
                      title="View Document"
                      aria-label={"View " + document.filename}
                      onClick={() => void view(document)}
                      className="p-2"
                    >
                      <Eye className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      title="Review Extraction"
                      aria-label={"Review " + document.filename}
                      onClick={() => {
                        setReview(structuredClone(document));
                        setConfirmed(false);
                        setConfirmedType(false);
                        setAddedLine(false);
                        setManualPage("");
                      }}
                      className="p-2"
                    >
                      <FileText className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      disabled={busy}
                      title="Delete analysis upload"
                      aria-label={"Delete " + document.filename}
                      className="p-2"
                      onClick={() => {
                        if (window.confirm("Delete this analysis upload?"))
                          void run(async () => {
                            await apiClient.delete(
                              base + "/uploads/" + document.id,
                            );
                            onSelection(
                              selectedIds.filter((id) => id !== document.id),
                            );
                            await load();
                          });
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {comparison && (
        <details open className="mt-3 border-t border-stone-200 pt-2">
          <summary className="font-semibold">
            Comparison: {comparison.context.reference}
          </summary>
          <div className="flex flex-wrap justify-end gap-2 py-2">
            <button
              type="button"
              disabled={busy}
              title="Export Comparison"
              aria-label="Export Comparison"
              className="p-2"
              onClick={() => void run(download)}
            >
              <Download className="h-4 w-4" />
            </button>
            <button
              type="button"
              disabled={busy}
              className="text-xs underline"
              onClick={() => onDiagnosis(comparison.brain_context)}
            >
              Diagnose ERP Data
            </button>
          </div>
          <div className="max-h-96 overflow-auto">
            <table className="w-full min-w-[650px] text-left text-xs">
              <thead>
                <tr>
                  <th>Item / Field</th>
                  <th>Extracted Fact</th>
                  <th>ERP Fact</th>
                  <th>Match Result</th>
                  <th>Evidence</th>
                </tr>
              </thead>
              <tbody>
                {comparison.results.map((row, index) => (
                  <tr
                    key={index}
                    className="border-t border-stone-100 align-top"
                  >
                    <td className="p-2">
                      {row.item_code}
                      <span className="block">{labels(row.field)}</span>
                    </td>
                    <td className="max-w-48 break-words p-2">
                      {display(row.document_value)}
                    </td>
                    <td className="max-w-48 break-words p-2">
                      {display(row.erp_value)}
                    </td>
                    <td className="p-2">
                      {labels(row.status)}
                      <span className="block text-stone-500">
                        {labels(row.operator)}
                      </span>
                    </td>
                    <td className="max-w-60 break-words p-2">
                      {row.evidence ? (
                        <details>
                          <summary>
                            Page {display(row.evidence.page)} /{" "}
                            {row.evidence.confidence}
                          </summary>
                          {display(row.evidence.snippet)}
                        </details>
                      ) : (
                        "Unknown"
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {comparison.matrix && (
            <div className="mt-3 overflow-auto">
              <table className="w-full min-w-[700px] text-left text-xs">
                <thead>
                  <tr>
                    <th>Item</th>
                    <th>Supplier</th>
                    <th>Requested / Quoted Qty</th>
                    <th>Rate / Currency / UOM</th>
                    <th>Delivery / Terms</th>
                    <th>Comparable</th>
                  </tr>
                </thead>
                <tbody>
                  {comparison.matrix.flatMap((row) =>
                    row.quotes.map((quote) => (
                      <tr
                        key={row.item + ":" + quote.document_id}
                        className="border-t border-stone-100 align-top"
                      >
                        <td className="p-2">{row.item}</td>
                        <td className="p-2">{display(quote.supplier)}</td>
                        <td className="p-2">
                          {display(row.requested_qty)} /{" "}
                          {display(quote.quantity)}
                        </td>
                        <td className="p-2">
                          {display(quote.rate)} / {display(quote.currency)} /{" "}
                          {display(quote.uom)}
                        </td>
                        <td className="max-w-40 break-words p-2">
                          {display(quote.delivery)} /{" "}
                          {display(quote.payment_terms)}
                        </td>
                        <td className="p-2">
                          {labels(row.status)}
                          {row.lowest_quoted_rate != null && (
                            <span className="block">
                              Lowest quoted rate: {row.lowest_quoted_rate}
                            </span>
                          )}
                        </td>
                      </tr>
                    )),
                  )}
                </tbody>
              </table>
            </div>
          )}
        </details>
      )}
      {review &&
        createPortal(
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Review Extraction"
            className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/40 p-3"
          >
            <div className="max-h-[90vh] w-full max-w-4xl overflow-auto rounded-md bg-white p-4">
              <div className="flex items-center justify-between gap-2">
                <h3 className="min-w-0 break-words text-base font-semibold">
                  {review.filename}
                </h3>
                <button
                  type="button"
                  title="Close Review"
                  aria-label="Close Review"
                  onClick={() => setReview(null)}
                  className="p-2"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <div className="my-3 flex flex-wrap items-center gap-3">
                <select
                  aria-label="Document type"
                  className="max-w-full border border-stone-300 p-2"
                  value={review.extraction.type}
                  onChange={(event) => {
                    setReview({
                      ...review,
                      extraction: {
                        ...review.extraction,
                        type: event.target.value,
                      },
                    });
                    setConfirmedType(false);
                  }}
                >
                  {types.map((type) => (
                    <option key={type} value={type}>
                      {labels(type)}
                    </option>
                  ))}
                </select>
                <span className="text-xs">
                  {review.extraction.classification_confidence}
                </span>
                <label className="flex items-center gap-2 text-xs">
                  <input
                    type="checkbox"
                    checked={confirmedType}
                    onChange={(event) => setConfirmedType(event.target.checked)}
                  />
                  Confirm document type
                </label>
                <label className="flex items-center gap-2 text-xs">
                  Page for manual values
                  <input
                    aria-label="Page for manual values"
                    type="number"
                    min={1}
                    max={50}
                    className="w-16 border border-stone-300 p-2"
                    value={manualPage}
                    onChange={(event) => {
                      setManualPage(event.target.value);
                      setConfirmed(false);
                    }}
                  />
                </label>
                <button
                  type="button"
                  title="View original document"
                  onClick={() => void view(review)}
                  className="p-2"
                >
                  <Eye className="h-4 w-4" />
                </button>
              </div>
              {review.extraction.warnings.map((warning, index) => (
                <p className="mb-2 text-xs text-amber-800" key={index}>
                  {warning}
                </p>
              ))}
              <table className="w-full text-left text-xs">
                <thead>
                  <tr>
                    <th>Field</th>
                    <th>Extracted Value</th>
                    <th>Evidence</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(review.extraction.fields).map(
                    ([field, fact]) => (
                      <tr key={field} className="border-t border-stone-100">
                        <td className="w-1/4 p-2">{labels(field)}</td>
                        <td className="p-2">
                          <input
                            aria-label={labels(field)}
                            maxLength={2000}
                            className="w-full min-w-0 border border-stone-200 p-2"
                            placeholder="Unknown"
                            value={fact.value ?? ""}
                            onChange={(event) =>
                              change(field, event.target.value)
                            }
                          />
                        </td>
                        <td className="w-1/4 p-2">
                          <details>
                            <summary>
                              Page {display(fact.page)} / {fact.confidence}
                            </summary>
                            <p className="max-w-48 break-words">
                              {display(fact.snippet)}
                            </p>
                          </details>
                        </td>
                      </tr>
                    ),
                  )}
                </tbody>
              </table>
              <div className="mt-3 overflow-auto">
                <table className="w-full min-w-[800px] text-left text-xs">
                  <thead>
                    <tr>
                      {[
                        "source_item_code",
                        "source_description",
                        "quantity",
                        "uom",
                        "unit_rate",
                        "tax",
                        "line_amount",
                      ].map((field) => (
                        <th className="p-2" key={field}>
                          {labels(field)}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {review.extraction.lines.map((line, index) => (
                      <tr key={index}>
                        {[
                          "source_item_code",
                          "source_description",
                          "quantity",
                          "uom",
                          "unit_rate",
                          "tax",
                          "line_amount",
                        ].map((field) => (
                          <td className="p-1" key={field}>
                            <input
                              aria-label={`Line ${index + 1} ${labels(field)}`}
                              maxLength={2000}
                              className="w-full min-w-20 border border-stone-200 p-2"
                              value={line[field]?.value ?? ""}
                              placeholder="Unknown"
                              onChange={(event) =>
                                change(field, event.target.value, index)
                              }
                            />
                            <details>
                              <summary className="text-[10px]">
                                {line[field]?.confidence || "LOW"} / p.
                                {display(line[field]?.page)}
                              </summary>
                              <p className="max-w-32 break-words">
                                {display(line[field]?.snippet)}
                              </p>
                            </details>
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  title="Add extracted line"
                  aria-label="Add extracted line"
                  disabled={addedLine || review.extraction.lines.length >= 200}
                  className="p-2"
                  onClick={() => {
                    const line = Object.fromEntries(
                      [
                        "source_item_code",
                        "source_description",
                        "quantity",
                        "uom",
                        "unit_rate",
                        "tax",
                        "line_amount",
                      ].map((field) => [
                        field,
                        {
                          kind: "EXTRACTED_FACT",
                          value: null,
                          page: null,
                          snippet: null,
                          confidence: "LOW",
                          method: "UNKNOWN",
                        },
                      ]),
                    );
                    setReview({
                      ...review,
                      extraction: {
                        ...review.extraction,
                        lines: [...review.extraction.lines, line],
                      },
                    });
                    setAddedLine(true);
                    setConfirmed(false);
                  }}
                >
                  <Plus className="h-4 w-4" />
                </button>
                <label className="flex items-center gap-2 text-xs">
                  <input
                    type="checkbox"
                    checked={confirmed}
                    onChange={(event) => setConfirmed(event.target.checked)}
                  />
                  I reviewed the extracted values
                </label>
                <button
                  type="button"
                  disabled={busy || !confirmed || !confirmedType}
                  onClick={() => void saveReview()}
                  className="ml-auto flex items-center gap-2 rounded-md border border-stone-300 px-3 py-2 text-xs"
                >
                  <Save className="h-4 w-4" />
                  Save Extraction
                </button>
              </div>
              {error && (
                <p role="alert" className="mt-2 text-xs text-red-700">
                  {error}
                </p>
              )}
            </div>
          </div>,
          document.body,
        )}
      {preview &&
        createPortal(
          <div
            role="dialog"
            aria-modal="true"
            aria-label="View Document"
            className="fixed inset-0 z-[10010] flex items-center justify-center bg-black/50 p-3"
          >
            <div className="flex h-[90vh] w-full max-w-5xl flex-col rounded-md bg-white">
              <div className="flex items-center justify-between gap-2 p-3">
                <h3 className="min-w-0 break-words text-sm font-semibold">
                  {preview.filename}
                </h3>
                <button
                  type="button"
                  aria-label="Close Document"
                  title="Close Document"
                  className="p-2"
                  onClick={() => {
                    setPreview(null);
                    if (previewRef.current)
                      URL.revokeObjectURL(previewRef.current);
                    previewRef.current = null;
                  }}
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              {preview.mime === "application/pdf" ? (
                <iframe
                  title={preview.filename}
                  className="min-h-0 w-full flex-1"
                  src={preview.url}
                />
              ) : (
                <div className="min-h-0 flex-1 overflow-auto">
                  <img
                    alt={preview.filename}
                    src={preview.url}
                    className="mx-auto max-h-full max-w-full object-contain"
                  />
                </div>
              )}
            </div>
          </div>,
          document.body,
        )}
    </section>
  );
}
