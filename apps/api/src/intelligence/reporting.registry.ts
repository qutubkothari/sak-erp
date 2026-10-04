import { hasAdminBypass, hasPermission } from "../auth/utils/permission-utils";

export type ReportField = {
  label: string;
  type: "text" | "number" | "date" | "boolean";
  permissions?: string[];
  monetary?: boolean;
  aggregate?: boolean;
  filter?: boolean;
  group?: boolean;
};
export type ReportMeasure = {
  label: string;
  field?: string;
  operation: "COUNT" | "SUM" | "AVG" | "MIN" | "MAX" | "DISTINCT";
  monetary?: boolean;
  unit?: boolean;
};
export type ReportDataset = {
  label: string;
  category: string;
  entities: string[];
  permissions: string[];
  admin?: boolean;
  profiles: string[];
  fields: Record<string, ReportField>;
  measures: Record<string, ReportMeasure>;
  defaults: string[];
  dateField?: string;
  explanation: string;
  relationships: string[];
};
export type ReportFilter = {
  field: string;
  operator: "eq" | "contains" | "gte" | "lte" | "in";
  value: string | number | boolean | string[];
};
export type ReportPlan = {
  dataset: string;
  columns: string[];
  filters: ReportFilter[];
  grouping: string[];
  aggregations: string[];
  sort: { field: string; direction: "asc" | "desc" }[];
  limit: number;
  visualization: "TABLE" | "KPI" | "BAR" | "LINE" | "DONUT" | "SUMMARY";
  title: string;
};
const text = (label: string): ReportField => ({
  label,
  type: "text",
  filter: true,
  group: true,
});
const number = (label: string, aggregate = true): ReportField => ({
  label,
  type: "number",
  aggregate,
  filter: true,
});
const date = (label: string): ReportField => ({
  label,
  type: "date",
  filter: true,
  group: true,
});
const price = (label: string): ReportField => ({
  ...number(label),
  monetary: true,
  permissions: ["reports:read", "vendors:read", "purchase_orders:read"],
});
const profiles = ["SAIFSEAS", "MIZANTRA", "ARWA"];
const quantityMeasures = {
  ORDERED_QTY: {
    label: "Ordered quantity",
    field: "ordered_qty",
    operation: "SUM",
    unit: true,
  },
  RECEIVED_QTY: {
    label: "Received quantity",
    field: "received_qty",
    operation: "SUM",
    unit: true,
  },
  ACCEPTED_QTY: {
    label: "Accepted quantity",
    field: "accepted_qty",
    operation: "SUM",
    unit: true,
  },
  REJECTED_QTY: {
    label: "Rejected quantity",
    field: "rejected_qty",
    operation: "SUM",
    unit: true,
  },
} as const;

export const REPORT_DATASETS: Record<string, ReportDataset> = {
  PURCHASE_ORDERS: {
    label: "Purchase Orders",
    category: "Purchasing",
    entities: ["purchase_orders", "purchase_order_items"],
    permissions: ["purchase_orders:read", "grns:read"],
    profiles,
    relationships: [
      "supplier",
      "items",
      "source requisition",
      "authoritative receipt ledger",
    ],
    fields: {
      po_id: text("PO reference"),
      po_number: text("PO number"),
      po_date: date("PO date"),
      supplier_id: {
        ...text("Supplier reference"),
        permissions: ["vendors:read"],
      },
      supplier: { ...text("Supplier"), permissions: ["vendors:read"] },
      buyer: text("Buyer"),
      status: text("Status"),
      open_state: text("Open PO state"),
      OPEN_PO: { label: "Open receipt", type: "boolean", filter: true },
      item_id: text("Item reference"),
      item: text("Item"),
      item_code: text("Item code"),
      uom: text("UOM"),
      ordered_qty: number("Ordered quantity"),
      received_qty: number("Received quantity"),
      accepted_qty: number("Accepted quantity"),
      rejected_qty: number("Rejected quantity"),
      open_qty: number("Open quantity"),
      remaining_qty: number("Remaining quantity"),
      unit_price: price("Unit price"),
      currency: text("Currency"),
      line_value: price("Line value"),
      open_value: price("Open value"),
      po_total: { ...price("PO total"), aggregate: false },
      pr_number: {
        ...text("PR number"),
        permissions: ["purchase_requisitions:read"],
      },
      required_date: {
        ...date("Required date"),
        permissions: ["purchase_requisitions:read"],
      },
      delivery_date: date("Promised date"),
      overdue_days: number("Overdue days", false),
      purchase_month: text("Purchase month"),
    },
    measures: {
      PO_COUNT: { label: "PO count", field: "po_id", operation: "DISTINCT" },
      OPEN_PO_COUNT: {
        label: "Open PO count",
        field: "po_id",
        operation: "DISTINCT",
      },
      OPEN_PO_VALUE: {
        label: "Open PO value",
        field: "open_value",
        operation: "SUM",
        monetary: true,
      },
      PURCHASE_VALUE: {
        label: "Purchase value",
        field: "line_value",
        operation: "SUM",
        monetary: true,
      },
      ...quantityMeasures,
    },
    defaults: [
      "po_number",
      "po_date",
      "supplier",
      "status",
      "open_state",
      "item_code",
      "uom",
      "open_qty",
      "delivery_date",
      "overdue_days",
    ],
    dateField: "po_date",
    explanation:
      "Open quantity and Open PO state use the ERP purchase service's authoritative receipt ledger. Open value is remaining accepted quantity times the recorded line rate. Values are separated by recorded currency; missing currency is never inferred. PO count counts distinct purchase orders, not lines.",
  },
  PURCHASE_REQUISITIONS: {
    label: "Purchase Requisitions",
    category: "Purchasing",
    entities: ["purchase_requisitions", "purchase_requisition_items"],
    permissions: ["purchase_requisitions:read", "items:read"],
    profiles,
    relationships: ["items", "requester"],
    fields: {
      pr_number: text("PR number"),
      date: date("Date"),
      requester: text("Requester"),
      department: text("Department"),
      status: text("Status"),
      item_id: text("Item reference"),
      item: text("Item"),
      item_code: text("Item code"),
      uom: text("UOM"),
      quantity: number("Quantity"),
      required_date: date("Required date"),
      related_po: {
        ...text("Related PO"),
        permissions: ["purchase_orders:read"],
      },
    },
    measures: {
      ROW_COUNT: { label: "Line count", operation: "COUNT" },
      QUANTITY: {
        label: "Requested quantity",
        field: "quantity",
        operation: "SUM",
        unit: true,
      },
    },
    defaults: [
      "pr_number",
      "date",
      "requester",
      "status",
      "item_code",
      "uom",
      "quantity",
      "required_date",
    ],
    dateField: "date",
    explanation:
      "Recorded requisition lines, requester, department and authorized related orders. Pending quantities are unavailable without an authoritative allocation calculation.",
  },
  GRN: {
    label: "Goods Receipts",
    category: "Purchasing",
    entities: ["grns", "grn_items"],
    permissions: ["grns:read", "purchase_orders:read", "vendors:read"],
    profiles,
    relationships: ["source purchase order", "source PO line", "supplier"],
    fields: {
      grn_number: text("GRN number"),
      date: date("Date"),
      supplier: text("Supplier"),
      po_number: text("PO number"),
      item_code: text("Item code"),
      uom: text("UOM"),
      received_qty: number("Received quantity"),
      accepted_qty: number("Accepted quantity"),
      rejected_qty: number("Rejected quantity"),
      qc_state: text("QC state"),
      status: text("Status"),
    },
    measures: {
      ROW_COUNT: { label: "Line count", operation: "COUNT" },
      RECEIVED_QTY: quantityMeasures.RECEIVED_QTY,
      ACCEPTED_QTY: quantityMeasures.ACCEPTED_QTY,
      REJECTED_QTY: quantityMeasures.REJECTED_QTY,
    },
    defaults: [
      "grn_number",
      "date",
      "supplier",
      "po_number",
      "item_code",
      "received_qty",
      "accepted_qty",
      "rejected_qty",
      "qc_state",
      "status",
    ],
    dateField: "date",
    explanation:
      "Recorded goods-receipt quantities and QC states; no invented QC outcomes.",
  },
  ITEMS: {
    label: "Items and Inventory",
    category: "Inventory",
    entities: ["items", "inventory_stock"],
    permissions: ["items:read"],
    profiles,
    relationships: ["recorded stock", "item supplier associations"],
    fields: {
      item_id: text("Item reference"),
      item_code: text("Item code"),
      item: text("Item name"),
      item_type: text("Item type"),
      category: text("Category"),
      uom: text("UOM"),
      current_stock: {
        ...number("Current stock"),
        permissions: ["inventory:read"],
      },
      reorder_level: number("Reorder level"),
      below_reorder: {
        label: "Below reorder level",
        type: "boolean",
        filter: true,
        group: true,
        permissions: ["inventory:read"],
      },
      oem_name: { ...text("OEM name"), permissions: ["vendors:read"] },
      oem_part_no: {
        ...text("OEM part number"),
        permissions: ["vendors:read"],
      },
      suppliers: { ...text("Suppliers"), permissions: ["vendors:read"] },
      active: { label: "Active", type: "boolean", filter: true, group: true },
    },
    measures: {
      ITEM_COUNT: { label: "Item count", operation: "COUNT" },
      STOCK_QTY: {
        label: "Current stock quantity",
        field: "current_stock",
        operation: "SUM",
        unit: true,
      },
    },
    defaults: ["item_code", "item", "item_type", "category", "uom", "active"],
    explanation:
      "Stock uses recorded inventory_stock, never a reconstructed movement estimate. Missing stock/reorder evidence stays unavailable.",
  },
  SUPPLIERS: {
    label: "Suppliers",
    category: "Suppliers",
    entities: ["vendors", "item_vendors"],
    permissions: ["vendors:read"],
    profiles,
    relationships: ["recorded item supplier associations", "purchase orders"],
    fields: {
      supplier_id: text("Supplier reference"),
      supplier: text("Supplier"),
      supplier_code: text("Supplier code"),
      active: { label: "Active", type: "boolean", filter: true, group: true },
      items_supplied: text("Items supplied"),
      currency: text("Currency"),
      open_po_count: {
        ...number("Open PO count"),
        permissions: ["purchase_orders:read", "grns:read"],
      },
      open_po_value: {
        ...price("Open PO value"),
        permissions: [
          "reports:read",
          "vendors:read",
          "purchase_orders:read",
          "grns:read",
        ],
      },
      historical_purchase_value: {
        ...price("Historical purchase value"),
        permissions: [
          "reports:read",
          "vendors:read",
          "purchase_orders:read",
          "grns:read",
        ],
      },
    },
    measures: {
      SUPPLIER_COUNT: {
        label: "Supplier count",
        field: "supplier_id",
        operation: "DISTINCT",
      },
      SUPPLIER_OPEN_VALUE: {
        label: "Open PO value",
        field: "open_po_value",
        operation: "SUM",
        monetary: true,
      },
      SUPPLIER_PURCHASE_VALUE: {
        label: "Historical purchase value",
        field: "historical_purchase_value",
        operation: "SUM",
        monetary: true,
      },
    },
    defaults: ["supplier_code", "supplier", "active", "items_supplied"],
    explanation:
      "Recorded supplier master and item associations. Authorized purchasing measures reuse the Purchase Orders dataset and authoritative receipt state, separated by currency. No subjective score.",
  },
  ATTENDANCE: {
    label: "Attendance",
    category: "Attendance",
    entities: ["attendance", "employees"],
    permissions: ["hr:read"],
    profiles,
    relationships: ["employee", "department"],
    fields: {
      employee: text("Employee"),
      employee_code: text("Employee code"),
      department: text("Department"),
      date: date("Date"),
      status: text("Status"),
      check_in: text("Check in"),
      check_out: text("Check out"),
      working_hours: number("Working hours"),
      late_minutes: number("Late minutes"),
      overtime_hours: number("Overtime hours"),
    },
    measures: {
      ROW_COUNT: { label: "Attendance records", operation: "COUNT" },
      WORKING_HOURS: {
        label: "Recorded working hours",
        field: "working_hours",
        operation: "SUM",
      },
      OVERTIME_HOURS: {
        label: "Recorded overtime hours",
        field: "overtime_hours",
        operation: "SUM",
      },
    },
    defaults: [
      "employee_code",
      "employee",
      "department",
      "date",
      "status",
      "check_in",
      "check_out",
      "working_hours",
      "late_minutes",
      "overtime_hours",
    ],
    dateField: "date",
    explanation:
      "Existing recorded attendance working hours, late minutes and overtime hours; missing metrics stay unavailable and payroll is never selected.",
  },
  AUTO_QA: {
    label: "Auto QA Findings",
    category: "Administration",
    entities: ["autoqa_findings"],
    permissions: [],
    admin: true,
    profiles,
    relationships: ["authorized entity references"],
    fields: {
      module: text("Module"),
      check: text("Check"),
      status: text("Status"),
      severity: text("Severity"),
      entity_type: text("Entity type"),
      entity_id: text("Entity reference"),
      date: date("Detected date"),
    },
    measures: { ISSUE_COUNT: { label: "Finding count", operation: "COUNT" } },
    defaults: ["module", "check", "status", "severity", "entity_type", "date"],
    dateField: "date",
    explanation:
      "Only tenant/profile scoped Auto QA metadata, not private diagnostic payloads.",
  },
  DATA_DOCTOR_ITEMS: {
    label: "Items with Data Doctor Issues",
    category: "Inventory",
    entities: ["items", "Brain", "Data Doctor"],
    permissions: ["items:read"],
    admin: true,
    profiles,
    relationships: ["authorized item diagnostics"],
    fields: {
      item_id: text("Item reference"),
      item_code: text("Item code"),
      item: text("Item"),
      check: text("Check"),
      severity: text("Severity"),
      confidence: text("Confidence"),
    },
    measures: {
      ISSUE_COUNT: { label: "Current issue count", operation: "COUNT" },
    },
    defaults: ["item_code", "item", "check", "severity", "confidence"],
    explanation:
      "Current deterministic Data Doctor diagnoses of authorized items; no stored private evidence is exposed.",
  },
};

export function availableDatasets(user: any, profile: string) {
  return Object.entries(REPORT_DATASETS).filter(
    ([, dataset]) =>
      dataset.profiles.includes(profile) &&
      dataset.permissions.every((permission) =>
        hasPermission(user, permission),
      ) &&
      (!dataset.admin || hasAdminBypass(user)),
  );
}
export function canSeeField(user: any, field: ReportField) {
  return (field.permissions || []).every((permission) =>
    hasPermission(user, permission),
  );
}
export function validateReportPlan(
  input: any,
  user: any,
  profile: string,
): ReportPlan {
  if (!input || typeof input !== "object" || Array.isArray(input))
    throw new Error("A semantic report definition is required.");
  const allowedKeys = [
    "dataset",
    "columns",
    "filters",
    "grouping",
    "aggregations",
    "sort",
    "limit",
    "visualization",
    "title",
  ];
  if (Object.keys(input).some((key) => !allowedKeys.includes(key)))
    throw new Error("Only registered semantic plan properties are supported.");
  const dataset = availableDatasets(user, profile).find(
    ([key]) => key === input.dataset,
  )?.[1];
  if (!dataset) throw new Error("This reporting category is unavailable.");
  const arrays = ["columns", "filters", "grouping", "aggregations", "sort"];
  if (
    arrays.some((key) => !Array.isArray(input[key]) || input[key].length > 40)
  )
    throw new Error("Invalid report definition.");
  const field = (key: any) => {
    if (
      typeof key !== "string" ||
      !Object.prototype.hasOwnProperty.call(dataset.fields, key) ||
      !canSeeField(user, dataset.fields[key])
    )
      throw new Error("Field is unavailable.");
    return dataset.fields[key];
  };
  input.columns.forEach(field);
  input.grouping.forEach((key: string) => {
    if (!field(key).group)
      throw new Error("Grouping is not supported for this field.");
  });
  input.filters.forEach((filter: any) => {
    const definition = field(filter?.field);
    if (
      !definition.filter ||
      Object.keys(filter).some(
        (key) => !["field", "operator", "value"].includes(key),
      ) ||
      !["eq", "contains", "gte", "lte", "in"].includes(filter.operator)
    )
      throw new Error("Filter is unavailable.");
    const values = filter.operator === "in" ? filter.value : [filter.value];
    if (
      !Array.isArray(values) ||
      values.length > 100 ||
      values.some(
        (value) =>
          value == null ||
          !["string", "number", "boolean"].includes(typeof value) ||
          String(value).length > 200 ||
          (typeof value === "number" && !Number.isFinite(value)),
      )
    )
      throw new Error("Invalid filter value.");
    if (
      (definition.type === "number" &&
        values.some((value) => typeof value !== "number")) ||
      (definition.type === "boolean" &&
        values.some((value) => typeof value !== "boolean")) ||
      (definition.type === "date" &&
        values.some(
          (value) =>
            typeof value !== "string" ||
            !/^\d{4}-\d{2}-\d{2}$/.test(value) ||
            !Number.isFinite(Date.parse(value)),
        ))
    )
      throw new Error("Filter type does not match the field.");
    if (filter.operator === "contains" && definition.type !== "text")
      throw new Error("Text filter required.");
  });
  input.filters.forEach((filter: any) => {
    if (field(filter.field).type === "date") {
      const values = filter.operator === "in" ? filter.value : [filter.value];
      if (
        values.some(
          (value: string) =>
            new Date(value).toISOString().slice(0, 10) !== value,
        )
      )
        throw new Error("Calendar date is invalid.");
    }
  });
  input.aggregations.forEach((key: string) => {
    if (Object.prototype.hasOwnProperty.call(dataset.measures, key)) {
      const measure = dataset.measures[key];
      if (measure.field) field(measure.field);
    } else {
      const match = /^(COUNT|SUM|AVG|MIN|MAX):([a-z_]+)$/.exec(key);
      if (
        !match ||
        !field(match[2]).aggregate ||
        field(match[2]).type !== "number"
      )
        throw new Error("Aggregation is unavailable.");
    }
  });
  input.sort.forEach((sort: any) => {
    if (
      !sort ||
      Object.keys(sort).some((key) => !["field", "direction"].includes(key)) ||
      !["asc", "desc"].includes(sort.direction)
    )
      throw new Error("Invalid sorting.");
    if (!input.aggregations.includes(sort.field)) field(sort.field);
    if (
      input.aggregations.length &&
      ![...input.grouping, ...input.aggregations].includes(sort.field)
    )
      throw new Error("Sort must be part of the summarized result.");
  });
  if (
    !Number.isInteger(input.limit) ||
    input.limit < 1 ||
    input.limit > 20000 ||
    !["TABLE", "KPI", "BAR", "LINE", "DONUT", "SUMMARY"].includes(
      input.visualization,
    ) ||
    typeof input.title !== "string" ||
    !input.title.trim() ||
    input.title.length > 120
  )
    throw new Error("Invalid report display options.");
  const plan: ReportPlan = JSON.parse(JSON.stringify(input));
  if (
    !plan.aggregations.length &&
    plan.columns.some((key) => dataset.fields[key].monetary) &&
    !plan.columns.includes("currency")
  )
    plan.columns.push("currency");
  const measures = plan.aggregations.map(
    (key) =>
      dataset.measures[key] || {
        field: key.split(":")[1],
        monetary: dataset.fields[key.split(":")[1]]?.monetary,
        unit: [
          "ordered_qty",
          "received_qty",
          "accepted_qty",
          "rejected_qty",
          "open_qty",
          "quantity",
          "current_stock",
        ].includes(key.split(":")[1]),
      },
  );
  if (
    measures.some((measure) => measure.monetary) &&
    !plan.grouping.includes("currency")
  )
    plan.grouping.push("currency");
  if (
    measures.some((measure) => measure.unit) &&
    !plan.grouping.includes("uom")
  )
    plan.grouping.push("uom");
  plan.grouping.forEach(field);
  plan.columns.forEach(field);
  if (
    plan.visualization !== "TABLE" &&
    plan.visualization !== "SUMMARY" &&
    !plan.aggregations.length
  )
    throw new Error("Charts and KPIs require a registered summarized measure.");
  if (
    plan.visualization === "DONUT" &&
    (plan.grouping.length !== 1 ||
      plan.aggregations.length !== 1 ||
      measures.some((measure) => measure.monetary || measure.unit))
  )
    throw new Error("A donut requires a single comparable count grouping.");
  return plan;
}

export function reportIntent(message: string, hasSession = false) {
  return (
    /^(?:show|group|only|sort|export|save|create.*dashboard|what reports|what can I see|how did you calculate|top \d+)\b/i.test(
      message.trim(),
    ) ||
    (/^add\b/i.test(message.trim()) &&
      ((hasSession &&
        !/\b(?:item|supplier|vendor|employee|purchase order|PO|PR)\b/i.test(
          message,
        )) ||
        /dashboard|buyer|overdue|PR number|value|overtime|late minutes|column/i.test(
          message,
        ))) ||
    /\b(?:select|drop table|ignore.*tenant|another tenant)\b/i.test(message)
  );
}
export function interpretReport(
  message: string,
  previous?: ReportPlan,
  context?: {
    entity_type: string;
    entity_id: string;
    document_number?: string;
  },
  now = new Date(),
  timeZone = "UTC",
  financialYearStart?: string,
): {
  plan?: ReportPlan;
  action?: string;
  name?: string;
  clarification?: string;
} {
  const textMessage = message.trim();
  if (
    !textMessage ||
    textMessage.length > 1000 ||
    /\b(?:select|insert|update|delete\s+from|drop|alter|truncate|sql|table\s+users|ignore.*tenant|another tenant|other tenant|raw where|join)\b/i.test(
      textMessage,
    )
  )
    throw new Error(
      "Only authorized semantic reports are supported; arbitrary SQL and cross-tenant queries are unavailable.",
    );
  if (/^export\b/i.test(textMessage)) return { action: "EXPORT" };
  if (/^save\b/i.test(textMessage))
    return {
      action: "SAVE",
      name: textMessage
        .replace(/^save\s+(?:this\s+)?(?:as\s+)?/i, "")
        .slice(0, 120),
    };
  if (/^add\s+(?:this|one widget|this report).*dashboard/i.test(textMessage))
    return { action: "DASHBOARD" };
  if (/^create.*dashboard/i.test(textMessage))
    return {
      action: "CREATE_DASHBOARD",
      name: textMessage.replace(/^create\s+(?:a\s+)?/i, ""),
    };
  if (/^how did you calculate/i.test(textMessage)) return { action: "EXPLAIN" };
  if (
    /^what reports/i.test(textMessage) ||
    /^what can I see/i.test(textMessage)
  )
    return { action: "DISCOVER" };
  let dataset = /auto\s*qa/i.test(textMessage)
    ? "AUTO_QA"
    : /data doctor/i.test(textMessage)
      ? "DATA_DOCTOR_ITEMS"
      : /attendance|employees|absent/i.test(textMessage)
        ? "ATTENDANCE"
        : /\b(?:grn|goods receipt)/i.test(textMessage)
          ? "GRN"
          : /requisition|\bPRs?\b/i.test(textMessage) &&
              !/^add/i.test(textMessage)
            ? "PURCHASE_REQUISITIONS"
            : /\bPOs?\b|purchase|purchases|suppliers.*value/i.test(textMessage)
              ? "PURCHASE_ORDERS"
              : /\bitems?\b|raw materials|stock|inventory/i.test(textMessage)
                ? "ITEMS"
                : /suppliers|vendors/i.test(textMessage)
                  ? "SUPPLIERS"
                  : previous?.dataset;
  if (!dataset && context && /pending|this|supplier|history/i.test(textMessage))
    dataset = ["supplier", "item", "purchase_order"].includes(
      context.entity_type,
    )
      ? "PURCHASE_ORDERS"
      : context.entity_type === "purchase_requisition"
        ? "PURCHASE_REQUISITIONS"
        : context.entity_type === "grn"
          ? "GRN"
          : undefined;
  if (!dataset)
    return {
      clarification:
        "Pending purchase orders, requisitions, GRNs or something else?",
    };
  const definition = REPORT_DATASETS[dataset];
  const plan: ReportPlan =
    previous?.dataset === dataset
      ? JSON.parse(JSON.stringify(previous))
      : {
          dataset,
          columns: [...definition.defaults],
          filters: [],
          grouping: [],
          aggregations: [],
          sort: [],
          limit: 20000,
          visualization: "TABLE",
          title: definition.label,
        };
  const put = (filter: ReportFilter) => {
    plan.filters = plan.filters.filter(
      (existing) =>
        existing.field !== filter.field ||
        existing.operator !== filter.operator,
    );
    plan.filters.push(filter);
  };
  if (/\b(?:open|pending|not fully received)\b|\bremaining\s+(?:quantity|qty)\b/i.test(textMessage) && dataset === "PURCHASE_ORDERS")
    put({ field: "OPEN_PO", operator: "eq", value: true });
  if (/overdue/i.test(textMessage) && dataset === "PURCHASE_ORDERS") {
    put({ field: "open_state", operator: "eq", value: "OPEN" });
    put({ field: "overdue_days", operator: "gte", value: 1 });
  }
  if (/raw material/i.test(textMessage))
    put({ field: "item_type", operator: "eq", value: "RAW_MATERIAL" });
  if (/below reorder/i.test(textMessage)) {
    put({ field: "below_reorder", operator: "eq", value: true });
    for (const key of ["current_stock", "reorder_level"])
      if (!plan.columns.includes(key)) plan.columns.push(key);
  }
  if (/absent/i.test(textMessage))
    put({ field: "status", operator: "eq", value: "ABSENT" });
  const supplier =
    /^(?:only)\s+(.+?)[.!]?$/i.exec(textMessage) ||
    /(?:\bPOs?\s+for|purchases?\s+(?:from|for)|supplier\s+named)\s+(.+?)(?:\s+(?:for the|from the|in the|last|this)\b.*|[.!])?$/i.exec(
      textMessage,
    );
  if (supplier && !/^overdue|open|pending|this supplier/i.test(supplier[1])) {
    if (!definition.fields.supplier)
      return {
        clarification: "Which purchasing report should use this supplier?",
      };
    put({ field: "supplier", operator: "contains", value: supplier[1].trim() });
  }
  if (
    context &&
    /this supplier|this item|for this|history for this|previous purchases/i.test(
      textMessage,
    )
  ) {
    const key =
      context.entity_type === "supplier"
        ? "supplier_id"
        : context.entity_type === "item"
          ? "item_id"
          : null;
    if (!key || !definition.fields[key])
      return {
        clarification: "Select a supplier or item for purchase history.",
      };
    put({ field: key, operator: "eq", value: context.entity_id });
  }
  if (
    /supplier[- ]wise|group.*supplier|top\s+\d+\s+suppliers/i.test(textMessage)
  ) {
    plan.grouping = ["supplier"];
    plan.aggregations = [
      plan.filters.some((filter) => filter.field === "open_state" || filter.field === "OPEN_PO")
        ? "OPEN_PO_COUNT"
        : "PO_COUNT",
    ];
  }
  if (/by type|items.*type|group.*item type/i.test(textMessage)) {
    plan.grouping = ["item_type"];
    plan.aggregations = ["ITEM_COUNT"];
  }
  if (/department[- ]wise|group.*department/i.test(textMessage)) {
    plan.grouping = ["department"];
    plan.aggregations = ["ROW_COUNT", "WORKING_HOURS"];
    if (/overtime/i.test(textMessage)) plan.aggregations.push("OVERTIME_HOURS");
  }
  if (/by module/i.test(textMessage)) {
    plan.grouping = ["module"];
    plan.aggregations = ["ISSUE_COUNT"];
  }
  if (/high.*critical|critical.*high/i.test(textMessage))
    put({ field: "severity", operator: "in", value: ["HIGH", "CRITICAL"] });
  if (/open.*(?:qa|findings)|findings.*open/i.test(textMessage))
    put({
      field: "status",
      operator: "in",
      value: ["OPEN", "ACKNOWLEDGED", "CONFIRMED"],
    });
  if (/value/i.test(textMessage) && dataset === "PURCHASE_ORDERS") {
    const measure =
      /open/i.test(textMessage) ||
      plan.filters.some((filter) => filter.field === "open_state" || filter.field === "OPEN_PO")
        ? "OPEN_PO_VALUE"
        : "PURCHASE_VALUE";
    if (!plan.aggregations.includes(measure)) plan.aggregations.push(measure);
  }
  if (/\bcount\b/i.test(textMessage) && !plan.aggregations.length)
    plan.aggregations = [
      dataset === "PURCHASE_ORDERS"
        ? plan.filters.some((filter) => filter.field === "open_state" || filter.field === "OPEN_PO")
          ? "OPEN_PO_COUNT"
          : "PO_COUNT"
        : dataset === "ITEMS"
          ? "ITEM_COUNT"
          : dataset === "SUPPLIERS"
            ? "SUPPLIER_COUNT"
            : dataset === "AUTO_QA" || dataset === "DATA_DOCTOR_ITEMS"
              ? "ISSUE_COUNT"
              : "ROW_COUNT",
    ];
  if (
    /month[- ]wise|monthly/i.test(textMessage) &&
    dataset === "PURCHASE_ORDERS"
  ) {
    plan.grouping = ["purchase_month"];
    plan.aggregations = ["PURCHASE_VALUE"];
    plan.sort = [{ field: "purchase_month", direction: "asc" }];
    plan.visualization = "LINE";
  }
  if (/^add\b/i.test(textMessage)) {
    const aliases: Record<string, string> = {
      buyer: "buyer",
      "overdue days": "overdue_days",
      "PR number": "pr_number",
      "PR reference": "pr_number",
      currency: "currency",
      "delivery date": "delivery_date",
      "unit price": "unit_price",
      "working hours": "working_hours",
      overtime: "overtime_hours",
      "late minutes": "late_minutes",
    };
    for (const [alias, key] of Object.entries(aliases))
      if (
        textMessage.toLowerCase().includes(alias.toLowerCase()) &&
        !plan.columns.includes(key)
      )
        plan.columns.push(key);
    if (
      /overtime/i.test(textMessage) &&
      plan.aggregations.length &&
      dataset === "ATTENDANCE" &&
      !plan.aggregations.includes("OVERTIME_HOURS")
    )
      plan.aggregations.push("OVERTIME_HOURS");
  }
  if (/oldest first/i.test(textMessage)) {
    if (!definition.dateField || plan.aggregations.length)
      return {
        clarification: "Oldest-first sorting needs a date-based detail report.",
      };
    plan.sort = [{ field: definition.dateField, direction: "asc" }];
  }
  const top = /top\s+(\d+)/i.exec(textMessage);
  if (top) {
    plan.limit = Math.min(10000, Number(top[1]));
    if (plan.aggregations.length)
      plan.sort = [
        {
          field: plan.aggregations[plan.aggregations.length - 1],
          direction: "desc",
        },
      ];
  }
  if (/bar chart/i.test(textMessage)) plan.visualization = "BAR";
  if (/line chart/i.test(textMessage)) plan.visualization = "LINE";
  if (/donut|pie chart/i.test(textMessage)) plan.visualization = "DONUT";
  if (/\bkpi\b/i.test(textMessage)) plan.visualization = "KPI";
  if (/\btable\b/i.test(textMessage)) plan.visualization = "TABLE";
  const today = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const part = (type: string) =>
    today.find((value) => value.type === type)!.value;
  const localDay = `${part("year")}-${part("month")}-${part("day")}`;
  const anchor = new Date(localDay + "T00:00:00Z");
  let start: string | undefined, end: string | undefined;
  const format = (value: Date) => value.toISOString().slice(0, 10);
  const ago = (days: number) =>
    format(new Date(anchor.getTime() - days * 86400000));
  if (/today/i.test(textMessage)) start = end = localDay;
  else if (/yesterday/i.test(textMessage)) start = end = ago(1);
  else if (/this week/i.test(textMessage)) {
    start = ago((anchor.getUTCDay() + 6) % 7);
    end = localDay;
  } else if (/this month/i.test(textMessage)) {
    start = localDay.slice(0, 7) + "-01";
    end = localDay;
  } else if (/last month/i.test(textMessage)) {
    start = format(
      new Date(Date.UTC(anchor.getUTCFullYear(), anchor.getUTCMonth() - 1, 1)),
    );
    end = format(
      new Date(Date.UTC(anchor.getUTCFullYear(), anchor.getUTCMonth(), 0)),
    );
  }
  const days = /last\s+(\d+)\s+days/i.exec(textMessage);
  if (days) {
    start = ago(Number(days[1]) - 1);
    end = localDay;
  }
  const months = /last\s+(\d+)\s+months|last year/i.exec(textMessage);
  if (months) {
    start = format(
      new Date(
        Date.UTC(
          anchor.getUTCFullYear(),
          anchor.getUTCMonth() - Number(months[1] || 12) + 1,
          1,
        ),
      ),
    );
    end = localDay;
  }
  const range =
    /(\d{4}-\d{2}-\d{2})\s+(?:to|through)\s+(\d{4}-\d{2}-\d{2})/.exec(
      textMessage,
    );
  if (range) {
    start = range[1];
    end = range[2];
  }
  const older = /older than\s+(\d+)\s+days/i.exec(textMessage);
  if (older) end = ago(Number(older[1]));
  if (/financial year/i.test(textMessage)) {
    const configured = /^(\d{2})-(\d{2})$/.exec(financialYearStart || "");
    if (!configured)
      return {
        clarification:
          "A configured financial-year start is required; specify a date range.",
      };
    const month = Number(configured[1]),
      day = Number(configured[2]);
    let fiscal = new Date(Date.UTC(anchor.getUTCFullYear(), month - 1, day));
    if (
      month < 1 ||
      month > 12 ||
      day < 1 ||
      fiscal.getUTCMonth() !== month - 1 ||
      fiscal.getUTCDate() !== day
    )
      throw new Error("Configured financial-year start is invalid.");
    if (fiscal > anchor)
      fiscal = new Date(Date.UTC(anchor.getUTCFullYear() - 1, month - 1, day));
    start = format(fiscal);
    end = localDay;
  }
  if ((start || end) && !definition.dateField)
    return {
      clarification:
        "This category has no registered report date. Choose a date-based purchasing or attendance report.",
    };
  if (start && end && start > end) throw new Error("Date range is reversed.");
  if (definition.dateField) {
    if (start)
      put({ field: definition.dateField, operator: "gte", value: start });
    if (end) put({ field: definition.dateField, operator: "lte", value: end });
  }
  return { plan };
}
