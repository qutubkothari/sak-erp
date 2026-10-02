export type BrainRelation = { type: string; foreignKey: string; direction: "outgoing" | "incoming"; condition?: { field: string; value: string } };
export type BrainResolver = {
  table: string;
  columns: string;
  permission: string;
  label: string;
  route?: string;
  profileScoped?: boolean;
  parent?: { table: string; foreignKey: string };
  relations: BrainRelation[];
};

export const BRAIN_REGISTRY: Record<string, BrainResolver> = {
  purchase_order: {
    table: "purchase_orders", columns: "id,tenant_id,po_number,status,pr_id,vendor_id,created_at,po_date",
    permission: "purchase_orders:read", label: "po_number", route: "/dashboard/purchase/orders",
    relations: [
      { type: "purchase_requisition", foreignKey: "pr_id", direction: "outgoing" },
      { type: "supplier", foreignKey: "vendor_id", direction: "outgoing" },
      { type: "purchase_order_item", foreignKey: "po_id", direction: "incoming" },
      { type: "grn", foreignKey: "po_id", direction: "incoming" },
    ],
  },
  purchase_requisition: {
    table: "purchase_requisitions", columns: "id,tenant_id,pr_number,status,created_at",
    permission: "purchase_requisitions:read", label: "pr_number", route: "/dashboard/purchase/requisitions",
    relations: [
      { type: "purchase_order", foreignKey: "pr_id", direction: "incoming" },
      { type: "rfq", foreignKey: "pr_id", direction: "incoming" },
      { type: "purchase_requisition_item", foreignKey: "pr_id", direction: "incoming" },
    ],
  },
  grn: {
    table: "grns", columns: "id,tenant_id,grn_number,status,po_id,created_at",
    permission: "grns:read", label: "grn_number", route: "/dashboard/purchase/grn",
    relations: [
      { type: "purchase_order", foreignKey: "po_id", direction: "outgoing" },
      { type: "grn_item", foreignKey: "grn_id", direction: "incoming" },
      { type: "stock_movement", foreignKey: "reference_id", direction: "incoming", condition: { field: "reference_type", value: "GRN" } },
    ],
  },
  supplier: {
    table: "vendors", columns: "id,tenant_id,code,name",
    permission: "vendors:read", label: "name", route: "/dashboard/purchase/vendors",
    relations: [{ type: "purchase_order", foreignKey: "vendor_id", direction: "incoming" }],
  },
  item: {
    table: "items", columns: "id,tenant_id,code,name,uom",
    permission: "items:read", label: "code", route: "/dashboard/inventory/items",
    relations: [{ type: "purchase_order_item", foreignKey: "item_id", direction: "incoming" }],
  },
  purchase_order_item: {
    table: "purchase_order_items", columns: "id,po_id,item_id,item_code,ordered_qty",
    permission: "purchase_orders:read", label: "item_code", parent: { table: "purchase_orders", foreignKey: "po_id" },
    relations: [
      { type: "purchase_order", foreignKey: "po_id", direction: "outgoing" },
      { type: "item", foreignKey: "item_id", direction: "outgoing" },
      { type: "grn_item", foreignKey: "po_item_id", direction: "incoming" },
    ],
  },
  purchase_requisition_item: {
    table: "purchase_requisition_items", columns: "id,pr_id,item_id,item_code,requested_qty",
    permission: "purchase_requisitions:read", label: "item_code", parent: { table: "purchase_requisitions", foreignKey: "pr_id" },
    relations: [{ type: "purchase_requisition", foreignKey: "pr_id", direction: "outgoing" }, { type: "item", foreignKey: "item_id", direction: "outgoing" }],
  },
  grn_item: {
    table: "grn_items", columns: "id,grn_id,po_item_id,received_qty,accepted_qty,rejected_qty,qc_status",
    permission: "grns:read", label: "id", parent: { table: "grns", foreignKey: "grn_id" },
    relations: [{ type: "grn", foreignKey: "grn_id", direction: "outgoing" }, { type: "purchase_order_item", foreignKey: "po_item_id", direction: "outgoing" }],
  },
  rfq: {
    table: "rfqs", columns: "id,tenant_id,rfq_number,status,pr_id,vendor_id,created_at",
    permission: "purchase_requisitions:read", label: "rfq_number",
    relations: [{ type: "purchase_requisition", foreignKey: "pr_id", direction: "outgoing" }, { type: "supplier", foreignKey: "vendor_id", direction: "outgoing" }],
  },
  stock_movement: {
    table: "stock_movements", columns: "id,tenant_id,movement_number,movement_type,reference_type,reference_id,item_id,quantity,movement_date",
    permission: "items:read", label: "movement_number", route: "/dashboard/inventory",
    relations: [{ type: "grn", foreignKey: "reference_id", direction: "outgoing", condition: { field: "reference_type", value: "GRN" } }, { type: "item", foreignKey: "item_id", direction: "outgoing" }],
  },
  smart_import_batch: {
    table: "smart_import_batches", columns: "id,tenant_id,profile,batch_number,status,row_count,error_count",
    permission: "SMART_IMPORT", label: "batch_number", route: "/dashboard/support/admin/smart-imports", profileScoped: true, relations: [],
  },
  autoqa_finding: {
    table: "autoqa_findings", columns: "id,tenant_id,profile,check_key,status,title,summary,evidence,entity_type,entity_id,entity_code",
    permission: "AUTO_QA", label: "check_key", route: "/dashboard/support/admin/system-health", profileScoped: true, relations: [],
  },
  support_incident: {
    table: "support_incidents", columns: "id,tenant_id,reported_by,status,module,route,build_sha",
    permission: "SUPPORT", label: "id", route: "/dashboard/support", relations: [],
  },
};

export function brainEntitySummary(type: string, row: Record<string, any>) {
  const resolver = BRAIN_REGISTRY[type];
  return {
    entity_type: type,
    entity_id: String(row.id),
    document_number: String(row[resolver.label] || row.id),
    status: row.status || row.qc_status || null,
    route: resolver.route ? `${resolver.route}?${type === "purchase_order" ? "viewId" : type === "purchase_requisition" ? "open" : "brain_entity"}=${encodeURIComponent(row.id)}` : null,
  };
}