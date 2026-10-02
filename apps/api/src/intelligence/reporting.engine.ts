import { createHash } from "node:crypto";
import * as XLSX from "xlsx";
import { REPORT_DATASETS, ReportPlan } from "./reporting.registry";
export type ReportRow = Record<string, string | number | boolean | null>;
export const REPORT_SOURCE_LIMIT = 20000;
export const REPORT_PAGE_LIMIT = 100;
const normalized = (value: unknown) =>
  String(value ?? "")
    .normalize("NFKC")
    .toLocaleLowerCase("en");
export function reportNumber(value: unknown): number | null {
  if (
    value == null ||
    (typeof value === "string" && !value.trim()) ||
    typeof value === "boolean"
  )
    return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}
export function reportCalendarDay(
  value: unknown,
  timeZone: string,
): string | null {
  if (value == null || !Number.isFinite(Date.parse(String(value)))) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(String(value))) return String(value);
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date(String(value)));
  const part = (key: string) =>
    parts.find((value) => value.type === key)!.value;
  return `${part("year")}-${part("month")}-${part("day")}`;
}
export function reportDateBoundary(day: string, timeZone: string): string {
  const desired = Date.parse(day + "T00:00:00Z");
  let candidate = desired;
  for (let iteration = 0; iteration < 2; iteration++) {
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hourCycle: "h23",
    }).formatToParts(new Date(candidate));
    const part = (key: string) =>
      Number(parts.find((value) => value.type === key)!.value);
    const wall = Date.UTC(
      part("year"),
      part("month") - 1,
      part("day"),
      part("hour"),
      part("minute"),
      part("second"),
    );
    candidate += desired - wall;
  }
  return new Date(candidate).toISOString();
}
export function evaluateReport(plan: ReportPlan, source: ReportRow[]) {
  if (source.length > REPORT_SOURCE_LIMIT)
    throw new Error(
      "Report exceeds the safe source limit; narrow the date range or filters.",
    );
  const dataset = REPORT_DATASETS[plan.dataset];
  const filtered = source.filter((row) =>
    plan.filters.every((filter) => {
      const current = row[filter.field];
      if (current == null) return false;
      if (filter.operator === "contains")
        return normalized(current).includes(normalized(filter.value));
      if (filter.operator === "eq")
        return typeof filter.value === "string"
          ? normalized(current) === normalized(filter.value)
          : current === filter.value;
      if (filter.operator === "in")
        return (filter.value as string[]).some(
          (value) => normalized(value) === normalized(current),
        );
      const comparable =
        dataset.fields[filter.field].type === "date"
          ? String(current).slice(0, 10)
          : current;
      return filter.operator === "gte"
        ? comparable >= (filter.value as any)
        : comparable <= (filter.value as any);
    }),
  );
  let rows: ReportRow[];
  const keys = plan.aggregations.length
    ? [...plan.grouping, ...plan.aggregations]
    : plan.columns;
  if (plan.aggregations.length) {
    const groups = new Map<string, ReportRow[]>();
    for (const row of filtered) {
      const key = JSON.stringify(
        plan.grouping.map((field) => row[field] ?? null),
      );
      const group = groups.get(key) || [];
      group.push(row);
      groups.set(key, group);
    }
    if (!filtered.length && !plan.grouping.length) groups.set("[]", []);
    rows = [...groups.values()].map((group) => {
      const result: ReportRow = Object.fromEntries(
        plan.grouping.map((field) => [field, group[0]?.[field] ?? null]),
      );
      for (const key of plan.aggregations) {
        const registered = dataset.measures[key];
        const operation = registered?.operation || key.split(":")[0];
        const field = registered?.field || key.split(":")[1];
        const measured = ["OPEN_PO_COUNT", "OPEN_PO_VALUE"].includes(key)
          ? group.filter((row) => row.open_state === "OPEN")
          : group;
        const monetary =
          registered?.monetary || dataset.fields[field]?.monetary;
        const unit =
          registered?.unit ||
          [
            "ordered_qty",
            "received_qty",
            "accepted_qty",
            "rejected_qty",
            "open_qty",
            "quantity",
            "current_stock",
          ].includes(field);
        if (operation === "COUNT") result[key] = measured.length;
        else if (operation === "DISTINCT")
          result[key] = new Set(
            measured.map((row) => row[field]).filter((value) => value != null),
          ).size;
        else {
          const numbers = measured.map((row) => reportNumber(row[field]));
          if (
            !numbers.length ||
            numbers.some((value) => value == null) ||
            (monetary && measured.some((row) => !row.currency)) ||
            (unit && measured.some((row) => !row.uom))
          )
            result[key] = null;
          else {
            const values = numbers as number[];
            const sum = values.reduce((total, value) => total + value, 0);
            result[key] =
              operation === "SUM"
                ? sum
                : operation === "AVG"
                  ? sum / values.length
                  : operation === "MIN"
                    ? Math.min(...values)
                    : Math.max(...values);
          }
        }
      }
      return result;
    });
  } else
    rows = filtered.map((row) =>
      Object.fromEntries(plan.columns.map((key) => [key, row[key] ?? null])),
    );
  const rankedUnits = plan.sort.some((sort) => {
    const measure = dataset.measures[sort.field];
    const field = measure?.field || sort.field.split(":")[1] || sort.field;
    return (
      measure?.monetary ||
      measure?.unit ||
      dataset.fields[field]?.monetary ||
      [
        "ordered_qty",
        "received_qty",
        "accepted_qty",
        "rejected_qty",
        "open_qty",
        "quantity",
        "current_stock",
      ].includes(field)
    );
  });
  const partitionKey = (row: ReportRow) =>
    JSON.stringify([row.currency ?? null, row.uom ?? null]);
  if (plan.sort.length)
    rows.sort((left, right) => {
      if (rankedUnits) {
        const partition = partitionKey(left).localeCompare(partitionKey(right));
        if (partition) return partition;
      }
      for (const sort of plan.sort) {
        const first = left[sort.field],
          second = right[sort.field];
        if (first == null && second != null) return 1;
        if (second == null && first != null) return -1;
        const comparison =
          typeof first === "number" && typeof second === "number"
            ? first - second
            : String(first ?? "").localeCompare(String(second ?? ""), "en", {
                numeric: true,
              });
        if (comparison)
          return sort.direction === "asc" ? comparison : -comparison;
      }
      return 0;
    });
  const matchingRows = rows.length;
  if (rankedUnits) {
    const counts = new Map<string, number>();
    rows = rows.filter((row) => {
      const key = partitionKey(row),
        count = counts.get(key) || 0;
      counts.set(key, count + 1);
      return count < plan.limit;
    });
  } else rows = rows.slice(0, plan.limit);
  const columns = keys.map((key) => ({
    key,
    label:
      dataset.fields[key]?.label ||
      dataset.measures[key]?.label ||
      `${key.split(":")[0]} ${dataset.fields[key.split(":")[1]]?.label || ""}`,
    type: dataset.fields[key]?.type || "number",
  }));
  const version = createHash("sha256")
    .update(JSON.stringify({ plan, rows, matchingRows }))
    .digest("hex");
  return {
    rows,
    columns,
    matching_rows: matchingRows,
    result_rows: rows.length,
    limit_scope: rankedUnits ? "PER_CURRENCY_UOM_PARTITION" : "RESULT",
    source_rows: source.length,
    matching_documents:
      plan.dataset === "PURCHASE_ORDERS"
        ? new Set(filtered.map((row) => row.po_id)).size
        : null,
    version,
    incomplete_cells: rows.reduce(
      (total, row) =>
        total + Object.values(row).filter((value) => value == null).length,
      0,
    ),
  };
}
export function pageReport(
  result: ReturnType<typeof evaluateReport>,
  page: number,
  pageSize: number,
) {
  if (
    !Number.isInteger(page) ||
    page < 1 ||
    !Number.isInteger(pageSize) ||
    pageSize < 1 ||
    pageSize > REPORT_PAGE_LIMIT
  )
    throw new Error("Invalid reporting page.");
  const rows = result.rows.slice((page - 1) * pageSize, page * pageSize);
  return {
    ...result,
    rows,
    chart_data: rows,
    page,
    page_size: pageSize,
    pages: Math.ceil(result.result_rows / pageSize),
  };
}
export function reportWorkbook(
  plan: ReportPlan,
  result: ReturnType<typeof evaluateReport>,
  generatedAt = new Date().toISOString(),
) {
  const workbook = XLSX.utils.book_new();
  const metadata = [
    ["Report", plan.title],
    ["Generated", generatedAt],
    ["Business category", REPORT_DATASETS[plan.dataset].label],
    ["Result rows", result.result_rows],
    ["Matching purchase orders", result.matching_documents ?? "Not applicable"],
    ["Query explanation", REPORT_DATASETS[plan.dataset].explanation],
    ["Result version", result.version],
    ["Row limit", plan.limit],
    ["Limit scope", result.limit_scope],
    ...plan.filters.map((filter) => [
      REPORT_DATASETS[plan.dataset].fields[filter.field].label,
      `${filter.operator} ${JSON.stringify(filter.value)}`,
    ]),
  ];
  XLSX.utils.book_append_sheet(
    workbook,
    XLSX.utils.aoa_to_sheet(metadata),
    "Report",
  );
  const data = [
    result.columns.map((column) => column.label),
    ...result.rows.map((row) =>
      result.columns.map((column) => row[column.key] ?? null),
    ),
  ];
  const sheet = XLSX.utils.aoa_to_sheet(data);
  sheet["!cols"] = result.columns.map(() => ({ wch: 22 }));
  XLSX.utils.book_append_sheet(workbook, sheet, "Data");
  return XLSX.write(workbook, { type: "buffer", bookType: "xlsx" }) as Buffer;
}
