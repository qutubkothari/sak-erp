import { createHash } from "node:crypto";

export type OperatorRisk = "LOW" | "MEDIUM" | "HIGH" | "PROTECTED";
export type OperatorStatus =
  | "DRAFT"
  | "NEEDS_INPUT"
  | "READY_FOR_APPROVAL"
  | "APPROVED"
  | "EXECUTING"
  | "COMPLETED"
  | "PARTIALLY_COMPLETED"
  | "FAILED"
  | "EXPIRED"
  | "CANCELLED";
export type OperatorActionKey = "CREATE_DRAFT_PR" | "CREATE_DRAFT_RFQ_FROM_PR";
export type OperatorLine = {
  itemId: string;
  itemCode: string;
  itemName: string;
  uom: string | null;
  requestedQty: number | null;
  evidence: Record<string, unknown>;
};
export type OperatorInputs = {
  department: string | null;
  requiredDate: string | null;
  items: OperatorLine[];
};

export const OPERATOR_ACTIONS = {
  CREATE_DRAFT_PR: {
    action_key: "CREATE_DRAFT_PR",
    description: "Create one draft purchase requisition",
    allowed_contexts: ["item", "semantic_report", "document_analysis"],
    required_permissions: ["purchase_requisitions:create"],
    required_inputs: [
      "department",
      "requiredDate",
      "items.itemId",
      "items.uom",
      "items.requestedQty",
    ],
    risk: "MEDIUM",
    preconditions: [
      "ACTIVE_VERIFIED_MASTER",
      "CURRENT_REPORT",
      "SAFE_DIAGNOSIS",
      "NO_RELEVANT_CRITICAL_HIGH_FINDING",
    ],
    preview_builder: "draftPrPreview",
    revalidation: "resolveCurrentInputs",
    execution_handler: "PurchaseRequisitionsService.create",
    verification: "DRAFT_HEADER_AND_EXACT_LINES",
    idempotency: "PLAN_ID_ATOMIC_COMMIT",
    profile_applicability: ["MIZANTRA", "ARWA"],
  },
  CREATE_DRAFT_RFQ_FROM_PR: {
    action_key: "CREATE_DRAFT_RFQ_FROM_PR",
    description: "Draft RFQ planning only: existing RFQ creation sends the RFQ",
    allowed_contexts: ["purchase_requisition"],
    required_permissions: ["purchase_requisitions:update"],
    required_inputs: ["prId", "supplierIds"],
    risk: "MEDIUM",
    preconditions: ["GENUINE_SAFE_DRAFT_RFQ_NOT_AVAILABLE"],
    preview_builder: "rfqPlanOnly",
    revalidation: "DISABLED",
    execution_handler: null,
    verification: "NO_RFQ_WRITES",
    idempotency: "NO_EXECUTION",
    profile_applicability: ["MIZANTRA", "ARWA"],
  },
} as const;

export function operatorFlags(settings: Record<string, unknown> = process.env) {
  const profile = String(settings.ERP_TENANT_PROFILE || "").toUpperCase();
  const enabled =
    ["MIZANTRA", "ARWA"].includes(profile) &&
    settings.MIZANTRA_ACTION_OPERATOR_ENABLED === "true" &&
    settings.MIZANTRA_ACTION_PLANNER_MODE === "APPROVAL_REQUIRED";
  return {
    profile,
    enabled,
    mode: enabled ? "APPROVAL_REQUIRED" : "PREVIEW_ONLY",
    pr: enabled && settings.MIZANTRA_ACTION_PR_ENABLED === "true",
    rfq: false,
  };
}

export function operatorIntent(message: string): boolean {
  return /\b(?:create|prepare|raise)\b[\s\S]*\b(?:PRs?|purchase requisitions?|RFQs?|requests? for quotation)\b/i.test(
    message,
  );
}

export function operatorRisk(message: string): OperatorRisk {
  if (
    /\b(?:accounting|payroll|attendance|valuation|security|delete|reverse|reversal)\b/i.test(
      message,
    )
  )
    return "PROTECTED";
  if (
    /\b(?:submit|approve|award|purchase order|PO|GRN|reserve stock|stock movement|change master|update master)\b/i.test(
      message,
    )
  )
    return "HIGH";
  return "MEDIUM";
}

export function operatorChecksum(value: unknown): string {
  const canonical = (entry: any): any =>
    Array.isArray(entry)
      ? entry.map(canonical)
      : entry && typeof entry === "object"
        ? Object.fromEntries(
            Object.keys(entry)
              .sort()
              .filter((key) => entry[key] !== undefined)
              .map((key) => [key, canonical(entry[key])]),
          )
        : entry;
  return createHash("sha256")
    .update(JSON.stringify(canonical(value)))
    .digest("hex");
}

export function positiveQuantity(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0)
    return null;
  return value;
}

export function draftPrPreview(
  inputs: OperatorInputs,
  blockedRows: unknown[] = [],
) {
  const warnings: string[] = [];
  if (!inputs.items.length) warnings.push("ITEM_REQUIRED");
  if (!inputs.department) warnings.push("DEPARTMENT_REQUIRED");
  if (!inputs.requiredDate) warnings.push("REQUIRED_DATE_REQUIRED");
  if (inputs.items.some((line) => positiveQuantity(line.requestedQty) === null))
    warnings.push("QUANTITY_REQUIRED");
  if (inputs.items.some((line) => !line.uom)) warnings.push("UOM_REQUIRED");
  if (
    new Set(inputs.items.map((line) => line.itemId)).size !==
    inputs.items.length
  )
    warnings.push("DUPLICATE_ITEM");
  return {
    status: (warnings.length || blockedRows.length
      ? "NEEDS_INPUT"
      : "READY_FOR_APPROVAL") as OperatorStatus,
    warnings,
    blocked_rows: blockedRows,
    expected_effects: {
      draft_pr: warnings.length || blockedRows.length ? 0 : 1,
      pr_lines: inputs.items.length,
      po: 0,
      grn: 0,
      stock_movement: 0,
      accounting: 0,
      submission: 0,
      approval: 0,
      rfq: 0,
    },
    approval_required: true,
    autonomous_execution: false,
  };
}
