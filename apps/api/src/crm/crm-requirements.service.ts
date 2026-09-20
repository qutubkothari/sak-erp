import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { createClient, SupabaseClient } from "@supabase/supabase-js";

const CLASSIFICATIONS = [
  "STANDARD_FEATURE",
  "CONFIGURATION",
  "CUSTOMIZATION",
  "INTEGRATION",
  "NEW_PRODUCT_FEATURE",
  "BUG",
  "REPORT",
  "DATA_MIGRATION",
  "TRAINING",
  "PROCESS_CHANGE",
  "OTHER",
];

const STATES = [
  "DRAFT",
  "UNDER_REVIEW",
  "CLARIFICATION_REQUIRED",
  "APPROVED",
  "REJECTED",
  "IN_SCOPE",
  "OUT_OF_SCOPE",
  "CONVERTED_TO_CHANGE_REQUEST",
  "CONVERTED_TO_DEVELOPMENT_REQUEST",
  "COMPLETED",
  "CANCELLED",
];

function isMissingSchemaError(error: any) {
  const message = String(error?.message || error || "").toLowerCase();
  return (
    message.includes("schema cache") ||
    message.includes("does not exist") ||
    message.includes("exec_sql")
  );
}

/** Structured requirement records (SAK ONE spec section 8), linked to a CRM lead/opportunity. */
@Injectable()
export class CrmRequirementsService {
  private readonly db: SupabaseClient = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_KEY!,
  );
  private schemaReady: Promise<void> | null = null;

  private text(value: any) {
    return String(value ?? "").trim();
  }

  private fail(error: any, fallback: string): never {
    throw new BadRequestException(error?.message || fallback);
  }

  async ensureSchema() {
    if (this.schemaReady) return this.schemaReady;

    this.schemaReady = (async () => {
      const sql = `
CREATE TABLE IF NOT EXISTS public.crm_requirements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  requirement_number VARCHAR(40) NOT NULL,
  lead_id UUID REFERENCES public.crm_leads(id) ON DELETE CASCADE,
  customer_id UUID,
  title VARCHAR(255) NOT NULL,
  business_requirement TEXT,
  current_process TEXT,
  expected_process TEXT,
  acceptance_criteria TEXT,
  module VARCHAR(120),
  classification VARCHAR(40) NOT NULL DEFAULT 'OTHER',
  priority VARCHAR(20) NOT NULL DEFAULT 'MEDIUM',
  status VARCHAR(40) NOT NULL DEFAULT 'DRAFT',
  owner_user_id UUID,
  approver_user_id UUID,
  target_date DATE,
  source_document VARCHAR(255),
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, requirement_number)
);
CREATE INDEX IF NOT EXISTS idx_crm_requirements_tenant ON public.crm_requirements(tenant_id, lead_id);
CREATE INDEX IF NOT EXISTS idx_crm_requirements_status ON public.crm_requirements(tenant_id, status);
NOTIFY pgrst, 'reload schema';
`;
      const { error } = await this.db.rpc("exec_sql", { sql });
      if (!error) return;

      const message = String(error.message || "");
      if (message.includes("exec_sql")) {
        const probe = await this.db.from("crm_requirements").select("id", { count: "exact", head: true }).limit(1);
        if (!probe.error) return;
      }
      if (isMissingSchemaError(error)) {
        console.warn("[CrmRequirementsService] schema unavailable; returning empty results until migration is applied.");
        return;
      }
      throw new BadRequestException(`Requirement schema setup failed: ${error.message}`);
    })();

    return this.schemaReady;
  }

  async listOptions() {
    return { classifications: CLASSIFICATIONS, states: STATES };
  }

  async listForLead(tenantId: string, leadId: string) {
    await this.ensureSchema();
    const { data, error } = await this.db
      .from("crm_requirements")
      .select("*")
      .eq("tenant_id", tenantId)
      .eq("lead_id", leadId)
      .order("created_at", { ascending: false });
    if (error) {
      if (isMissingSchemaError(error)) return [];
      this.fail(error, "Unable to load requirements.");
    }
    return data || [];
  }

  private async nextNumber(tenantId: string) {
    const { data } = await this.db
      .from("crm_requirements")
      .select("requirement_number")
      .eq("tenant_id", tenantId)
      .order("created_at", { ascending: false })
      .limit(1);
    const last = data?.[0]?.requirement_number || "REQ-000000";
    const lastSeq = Number(last.split("-")[1] || 0);
    return `REQ-${String(lastSeq + 1).padStart(6, "0")}`;
  }

  async create(tenantId: string, userId: string, leadId: string, body: any) {
    await this.ensureSchema();
    const title = this.text(body.title);
    if (!title) throw new BadRequestException("Requirement title is required.");

    const { data: lead, error: leadError } = await this.db
      .from("crm_leads")
      .select("id,customer_id")
      .eq("tenant_id", tenantId)
      .eq("id", leadId)
      .maybeSingle();
    if (leadError || !lead) throw new NotFoundException("Lead not found.");

    const classification = CLASSIFICATIONS.includes(this.text(body.classification).toUpperCase())
      ? this.text(body.classification).toUpperCase()
      : "OTHER";

    const requirementNumber = await this.nextNumber(tenantId);
    const { data, error } = await this.db
      .from("crm_requirements")
      .insert({
        tenant_id: tenantId,
        requirement_number: requirementNumber,
        lead_id: leadId,
        customer_id: lead.customer_id || null,
        title,
        business_requirement: this.text(body.business_requirement) || null,
        current_process: this.text(body.current_process) || null,
        expected_process: this.text(body.expected_process) || null,
        acceptance_criteria: this.text(body.acceptance_criteria) || null,
        module: this.text(body.module) || null,
        classification,
        priority: this.text(body.priority).toUpperCase() || "MEDIUM",
        status: "DRAFT",
        owner_user_id: this.text(body.owner_user_id) || userId,
        target_date: this.text(body.target_date) || null,
        created_by: userId,
      })
      .select()
      .single();
    if (error) this.fail(error, "Unable to create requirement.");
    return data;
  }

  async update(tenantId: string, id: string, body: any) {
    await this.ensureSchema();
    const payload: Record<string, any> = { updated_at: new Date().toISOString() };
    for (const key of [
      "title",
      "business_requirement",
      "current_process",
      "expected_process",
      "acceptance_criteria",
      "module",
      "source_document",
    ]) {
      if (body[key] !== undefined) payload[key] = this.text(body[key]) || null;
    }
    if (body.classification !== undefined) {
      const value = this.text(body.classification).toUpperCase();
      payload.classification = CLASSIFICATIONS.includes(value) ? value : "OTHER";
    }
    if (body.priority !== undefined) payload.priority = this.text(body.priority).toUpperCase() || "MEDIUM";
    if (body.status !== undefined) {
      const value = this.text(body.status).toUpperCase();
      if (!STATES.includes(value)) throw new BadRequestException(`Status must be one of: ${STATES.join(", ")}`);
      payload.status = value;
    }
    if (body.owner_user_id !== undefined) payload.owner_user_id = this.text(body.owner_user_id) || null;
    if (body.approver_user_id !== undefined) payload.approver_user_id = this.text(body.approver_user_id) || null;
    if (body.target_date !== undefined) payload.target_date = this.text(body.target_date) || null;

    const { data, error } = await this.db
      .from("crm_requirements")
      .update(payload)
      .eq("tenant_id", tenantId)
      .eq("id", id)
      .select()
      .single();
    if (error) this.fail(error, "Unable to update requirement.");
    if (!data) throw new NotFoundException("Requirement not found.");
    return data;
  }

  async delete(tenantId: string, id: string) {
    await this.ensureSchema();
    const { error } = await this.db
      .from("crm_requirements")
      .delete()
      .eq("tenant_id", tenantId)
      .eq("id", id);
    if (error) this.fail(error, "Unable to delete requirement.");
    return { deleted: true, id };
  }
}
