import { Injectable, Logger } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import { createClient, SupabaseClient } from "@supabase/supabase-js";

type ApprovalSource = {
  table: string;
  module: string;
  documentType: string;
  statuses: string[];
  numberFields: string[];
  recipient: string;
  route: string;
};

const SOURCES: ApprovalSource[] = [
  { table: "purchase_requisitions", module: "PURCHASE", documentType: "PURCHASE_REQUISITION", statuses: ["SUBMITTED", "PENDING_APPROVAL"], numberFields: ["pr_number"], recipient: "PROCUREMENT_MANAGER", route: "/dashboard/purchase/requisitions" },
  { table: "purchase_orders", module: "PURCHASE", documentType: "PURCHASE_ORDER", statuses: ["SUBMITTED", "PENDING_APPROVAL"], numberFields: ["po_number"], recipient: "PROCUREMENT_MANAGER", route: "/dashboard/purchase/orders" },
  { table: "items", module: "INVENTORY", documentType: "ITEM", statuses: ["PENDING"], numberFields: ["code", "name"], recipient: "INVENTORY_MANAGER", route: "/dashboard/inventory/items" },
  { table: "grns", module: "PURCHASE", documentType: "GOODS_RECEIPT", statuses: ["SUBMITTED", "PENDING_APPROVAL", "QC_PENDING"], numberFields: ["grn_number"], recipient: "QUALITY_MANAGER", route: "/dashboard/purchase/grn" },
  { table: "leave_requests", module: "HR", documentType: "LEAVE_REQUEST", statuses: ["PENDING", "PENDING_APPROVAL"], numberFields: ["leave_number"], recipient: "HR_MANAGER", route: "/dashboard/hr/management?section=management&tab=leave" },
];

@Injectable()
export class ApprovalNotificationScheduler {
  private readonly logger = new Logger(ApprovalNotificationScheduler.name);
  private readonly db: SupabaseClient = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_KEY!);
  private running = false;

  @Cron(CronExpression.EVERY_HOUR)
  async notifyPendingApprovals() {
    if (this.running) return;
    this.running = true;
    try {
      const tenants = await this.db.from("tenants").select("id");
      if (tenants.error) throw tenants.error;
      for (const tenant of tenants.data || []) await this.notifyTenant(String(tenant.id));
    } catch (error: any) {
      this.logger.warn(`Approval notification scan skipped: ${error?.message || error}`);
    } finally {
      this.running = false;
    }
  }

  private async notifyTenant(tenantId: string) {
    const rows: any[] = [];
    for (const source of SOURCES) {
      const result = await this.db.from(source.table).select("*").eq("tenant_id", tenantId).in(source.table === "items" ? "approval_status" : "status", source.statuses).limit(250);
      if (result.error) {
        this.logger.warn(`${source.documentType} approval scan unavailable: ${result.error.message}`);
        continue;
      }
      for (const record of result.data || []) {
        const number = source.numberFields.map((field) => record[field]).find(Boolean) || String(record.id).slice(0, 8);
        rows.push({
          tenant_id: tenantId,
          module: source.module,
          document_type: source.documentType,
          document_id: record.id,
          document_number: String(number),
          channel: "IN_APP",
          direction: "OUTBOUND",
          recipient: source.recipient,
          subject: `${source.documentType.replaceAll("_", " ")} ${number} needs approval`,
          message_preview: `Maker submission ${number} is waiting for independent checker review.`,
          delivery_status: "DELIVERED",
          dedupe_key: `APPROVAL:${source.documentType}:${record.id}:${String(record.status || record.approval_status).toUpperCase()}`,
          metadata: { stage: "APPROVAL", route: source.route, source_table: source.table, deduplicated: true },
        });
      }
    }
    if (!rows.length) return;
    const saved = await this.db.from("communication_log").upsert(rows, { onConflict: "tenant_id,dedupe_key", ignoreDuplicates: true });
    if (saved.error) this.logger.warn(`Approval notifications not recorded: ${saved.error.message}`);
  }
}
