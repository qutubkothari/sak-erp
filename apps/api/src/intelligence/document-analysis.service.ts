import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from "@nestjs/common";
import { createClient } from "@supabase/supabase-js";
import { createHash, randomUUID } from "node:crypto";
import { hasAdminBypass, hasPermission } from "../auth/utils/permission-utils";
import { PurchaseOrdersService } from "../purchase/services/purchase-orders.service";
import { BrainService } from "./brain.service";
import {
  compareDocument,
  comparisonWorkbook,
  DOCUMENT_TYPES,
  emptyExtraction,
  ERPFacts,
  HEADER_FIELDS,
  key,
  LINE_FIELDS,
  numeric,
  explicitCurrency,
  quotationMatrix,
  reviewedExtraction,
} from "./document-analysis.engine";
import {
  extractDocument,
  safeDocumentFile,
} from "./document-analysis.extraction";
const uploads = "mizantra_analysis_uploads",
  comparisons = "mizantra_analysis_comparisons",
  audits = "mizantra_analysis_audit",
  bucket = "mizantra-document-intelligence";
const uuid =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
type Scope = { tenant: string; profile: string; owner: string; user: any };
@Injectable()
export class DocumentAnalysisService {
  private readonly db = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_KEY!,
  );
  private readonly running = new Set<string>();
  constructor(
    private readonly orders: PurchaseOrdersService,
    private readonly brain: BrainService,
  ) {}
  private scope(user: any, requireEnabled = true): Scope {
    const tenant = String(user?.tenantId || ""),
      owner = String(user?.userId || user?.id || ""),
      profile = String(process.env.ERP_TENANT_PROFILE || "").toUpperCase();
    if (
      !uuid.test(tenant) ||
      !uuid.test(owner) ||
      !["SAIFSEAS", "MIZANTRA", "ARWA"].includes(profile)
    )
      throw new ForbiddenException("Authenticated document scope is required.");
    if (
      requireEnabled &&
      process.env.MIZANTRA_DOCUMENT_INTELLIGENCE_ENABLED !== "true"
    )
      throw new ForbiddenException("Document Intelligence is not enabled.");
    if (
      ![
        "documents:read",
        "purchase_requisitions:read",
        "purchase_orders:read",
        "items:read",
      ].some((permission) => hasPermission(user, permission))
    )
      throw new ForbiddenException("Document module access is required.");
    return { tenant, owner, profile, user };
  }
  private typeAccess(scope: Scope, type: string) {
    const policy: Record<string, [string, string]> = {
      SUPPLIER_QUOTATION: [
        "MIZANTRA_QUOTATION_COMPARE_ENABLED",
        "purchase_requisitions:read",
      ],
      SUPPLIER_INVOICE: [
        "MIZANTRA_INVOICE_COMPARE_ENABLED",
        "purchase_orders:read",
      ],
      TECHNICAL_DRAWING: [
        "MIZANTRA_DRAWING_INTELLIGENCE_ENABLED",
        "items:read",
      ],
    };
    const gate = policy[type];
    if (
      gate &&
      (process.env[gate[0]] !== "true" || !hasPermission(scope.user, gate[1]))
    )
      throw new ForbiddenException("Document workflow is not authorized.");
  }
  configuration(user: any) {
    const scope = this.scope(user, false),
      enabled = process.env.MIZANTRA_DOCUMENT_INTELLIGENCE_ENABLED === "true";
    return {
      enabled,
      quotation:
        enabled &&
        process.env.MIZANTRA_QUOTATION_COMPARE_ENABLED === "true" &&
        hasPermission(user, "purchase_requisitions:read"),
      invoice:
        enabled &&
        process.env.MIZANTRA_INVOICE_COMPARE_ENABLED === "true" &&
        hasPermission(user, "purchase_orders:read"),
      drawing:
        enabled &&
        process.env.MIZANTRA_DRAWING_INTELLIGENCE_ENABLED === "true" &&
        hasPermission(user, "items:read"),
      profile: scope.profile,
      max_files: 3,
      max_bytes: 10485760,
      retention_days: 30,
      supported_mimes: ["application/pdf", "image/png", "image/jpeg"],
      smart_import_route: "/dashboard/support/admin/smart-imports",
      read_only: true,
    };
  }
  private scoped(table: string, scope: Scope, projection: string): any {
    return this.db
      .from(table)
      .select(projection)
      .eq("tenant_id", scope.tenant)
      .eq("profile", scope.profile)
      .eq("owner_id", scope.owner);
  }
  private async audit(
    scope: Scope,
    action: string,
    documentId?: string,
    payload: any = {},
  ) {
    const { error } = await this.db.from(audits).insert({
      tenant_id: scope.tenant,
      profile: scope.profile,
      owner_id: scope.owner,
      action,
      document_id: documentId || null,
      payload,
    });
    if (error)
      throw new ServiceUnavailableException(
        "Document audit metadata is unavailable.",
      );
  }
  private async privateBucket() {
    const { data, error } = await this.db.storage.getBucket(bucket);
    if (error || !data || data.public)
      throw new ServiceUnavailableException(
        "Private analysis storage is unavailable.",
      );
  }
  private publicDocument(row: any) {
    return {
      id: row.id,
      filename: row.filename,
      mime: row.mime,
      size: row.size,
      checksum: row.checksum,
      created_at: row.created_at,
      expires_at: row.expires_at,
      version: row.extraction_version,
      extraction: row.extraction,
      review_required:
        row.extraction.classification_confidence !== "HIGH" ||
        [
          ...Object.values(row.extraction.fields),
          ...row.extraction.lines.flatMap((line: any) => Object.values(line)),
        ].some((fact: any) => fact.value != null && fact.confidence !== "HIGH"),
      read_only: true,
    };
  }
  private async owned(scope: Scope, id: string) {
    if (!uuid.test(id))
      throw new BadRequestException("Opaque document ID is required.");
    const { data, error } = await this.scoped(
      uploads,
      scope,
      "id,filename,mime,size,page_count,checksum,storage_path,extraction,extraction_version,created_at,expires_at",
    )
      .eq("id", id)
      .is("deleted_at", null)
      .gt("expires_at", new Date().toISOString())
      .maybeSingle();
    if (error || !data)
      throw new NotFoundException("Document is unavailable in this scope.");
    this.typeAccess(scope, data.extraction.type);
    return data;
  }
  async list(user: any) {
    const scope = this.scope(user),
      { data, error } = await this.scoped(
        uploads,
        scope,
        "id,filename,mime,size,checksum,extraction,extraction_version,created_at,expires_at",
      )
        .is("deleted_at", null)
        .gt("expires_at", new Date().toISOString())
        .order("created_at", { ascending: false })
        .limit(51);
    if (error)
      throw new ServiceUnavailableException(
        "Document metadata is unavailable.",
      );
    return (data || [])
      .filter((row: any) => {
        try {
          this.typeAccess(scope, row.extraction.type);
          return true;
        } catch {
          return false;
        }
      })
      .map((row: any) => this.publicDocument(row));
  }
  async upload(user: any, file: Express.Multer.File, instruction = "") {
    const scope = this.scope(user),
      ownerKey = `${scope.tenant}:${scope.profile}:${scope.owner}`;
    if (this.running.has(ownerKey) || this.running.size >= 4)
      throw new ConflictException(
        "Document processing is busy; retry after the current upload.",
      );
    if ((await this.list(user)).length >= 50)
      throw new BadRequestException(
        "Remove an analysis upload before adding another document.",
      );
    await this.privateBucket();
    this.running.add(ownerKey);
    let path: string | undefined, insertedId: string | undefined;
    try {
      const validated = await safeDocumentFile(file),
        extraction = await extractDocument(
          validated,
          String(file.originalname).slice(0, 180),
          String(instruction).slice(0, 1000),
        );
      this.typeAccess(scope, extraction.type);
      const id = randomUUID(),
        extension =
          validated.mime === "application/pdf"
            ? "pdf"
            : validated.mime === "image/png"
              ? "png"
              : "jpg";
      path = `${scope.tenant}/${scope.profile}/${scope.owner}/${id}.${extension}`;
      const { error: storageError } = await this.db.storage
        .from(bucket)
        .upload(path, validated.bytes, {
          contentType: validated.mime,
          upsert: false,
        });
      if (storageError)
        throw new ServiceUnavailableException(
          "Private document storage failed.",
        );
      const row = {
        id,
        tenant_id: scope.tenant,
        profile: scope.profile,
        owner_id: scope.owner,
        filename: String(file.originalname)
          .replace(/^.*[\\/]/, "")
          .replace(/[\x00-\x1f]/g, "")
          .slice(0, 180),
        mime: validated.mime,
        size: validated.bytes.length,
        page_count:
          validated.mime === "application/pdf" ? validated.pages.length : 1,
        checksum: createHash("sha256").update(validated.bytes).digest("hex"),
        storage_path: path,
        extraction,
        extraction_version: 1,
        created_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 30 * 86400000).toISOString(),
      };
      const { error } = await this.db.from(uploads).insert(row);
      if (error)
        throw new ServiceUnavailableException(
          "Analysis metadata storage failed.",
        );
      insertedId = id;
      await this.audit(scope, "UPLOAD_CLASSIFY_EXTRACT", id, {
        checksum: row.checksum,
        mime: row.mime,
        size: row.size,
        type: extraction.type,
        confidence: extraction.classification_confidence,
        sanitized: validated.sanitized,
      });
      return this.publicDocument(row);
    } catch (error) {
      if (path) await this.db.storage.from(bucket).remove([path]);
      if (insertedId)
        await this.db
          .from(uploads)
          .delete()
          .eq("id", insertedId)
          .eq("tenant_id", scope.tenant)
          .eq("profile", scope.profile)
          .eq("owner_id", scope.owner);
      if (
        error instanceof ForbiddenException ||
        error instanceof ServiceUnavailableException
      )
        throw error;
      throw new BadRequestException(
        error instanceof Error ? error.message : "Document processing failed.",
      );
    } finally {
      this.running.delete(ownerKey);
    }
  }
  async get(user: any, id: string) {
    return this.publicDocument(await this.owned(this.scope(user), id));
  }
  async download(user: any, id: string) {
    const scope = this.scope(user),
      row = await this.owned(scope, id);
    await this.privateBucket();
    await this.audit(scope, "VIEW_DOCUMENT", id);
    const { data, error } = await this.db.storage
      .from(bucket)
      .download(row.storage_path);
    if (error || !data)
      throw new NotFoundException("Private document is unavailable.");
    const bytes = Buffer.from(await data.arrayBuffer());
    if (createHash("sha256").update(bytes).digest("hex") !== row.checksum)
      throw new ServiceUnavailableException("Document integrity check failed.");
    return { bytes, mime: row.mime };
  }
  async correct(user: any, id: string, body: any) {
    const scope = this.scope(user),
      row = await this.owned(scope, id),
      extraction = reviewedExtraction(row.extraction);
    if (
      !Number.isInteger(body?.version) ||
      body.version !== row.extraction_version ||
      !Array.isArray(body.changes || []) ||
      (body.changes || []).length > 1500
    )
      throw new ConflictException("Refresh extraction before correcting it.");
    if (body.type != null) {
      if (!DOCUMENT_TYPES.includes(body.type))
        throw new BadRequestException("Invalid document type.");
      extraction.type = body.type;
      this.typeAccess(scope, extraction.type);
    }
    if (body.confirm_type === true)
      extraction.classification_confidence = "HIGH";
    if (body.add_line === true) {
      if (extraction.lines.length >= 200)
        throw new BadRequestException("Line bound exceeded.");
      extraction.lines.push(
        Object.fromEntries(
          LINE_FIELDS.map((field) => [field, emptyExtraction().fields.notes]),
        ),
      );
    }
    for (const change of body.changes || []) {
      const line = change.line == null ? null : change.line;
      const allowedFields: readonly string[] =
        line == null ? HEADER_FIELDS : LINE_FIELDS;
      if (
        (line !== null &&
          (!Number.isInteger(line) || !extraction.lines[line])) ||
        !allowedFields.includes(change.field)
      )
        throw new BadRequestException("Invalid correction field.");
      const target = line == null ? extraction.fields : extraction.lines[line];
      target[change.field] = {
        ...target[change.field],
        value: change.value,
        page: change.page ?? target[change.field].page,
        snippet: change.snippet ?? target[change.field].snippet,
        confidence: "HIGH",
        method: "HUMAN_REVIEW",
      };
    }
    if (body.confirm_extraction === true)
      for (const fact of [
        ...Object.values(extraction.fields),
        ...extraction.lines.flatMap((line) => Object.values(line)),
      ])
        if (fact.value != null) {
          fact.confidence = "HIGH";
          fact.method = "HUMAN_REVIEW";
        }
    let reviewed;
    try {
      reviewed = reviewedExtraction(extraction);
      if (
        [
          ...Object.values(reviewed.fields),
          ...reviewed.lines.flatMap((line) => Object.values(line)),
        ].some((fact) => fact.page != null && fact.page > row.page_count)
      )
        throw new Error("Page outside document.");
    } catch {
      throw new BadRequestException(
        "Correction requires explicit values and valid page evidence.",
      );
    }
    const { error } = await this.db.rpc("mizantra_document_correct", {
      p_id: id,
      p_tenant: scope.tenant,
      p_profile: scope.profile,
      p_owner: scope.owner,
      p_version: body.version,
      p_extraction: reviewed,
    });
    if (error)
      throw new ConflictException(
        "Extraction changed or correction audit is unavailable; refresh and retry.",
      );
    return this.get(user, id);
  }
  private async rows(query: any): Promise<any[]> {
    const { data, error } = await query.limit(201);
    if (error || !data || data.length > 200)
      throw new ServiceUnavailableException(
        "Complete authorized ERP evidence is unavailable.",
      );
    return data;
  }
  private pricing(scope: Scope) {
    return ["purchase_orders:read", "reports:read", "vendors:read"].every(
      (permission) => hasPermission(scope.user, permission),
    );
  }
  private async resolve(scope: Scope, documents: any[], body: any) {
    let envelope = body?.brain_context;
    if (!envelope) {
      const type = documents[0].extraction.type,
        reference = String(
          body?.reference ||
            (type === "SUPPLIER_INVOICE"
              ? documents[0].extraction.fields.po_reference.value
              : type === "TECHNICAL_DRAWING"
                ? documents[0].extraction.fields.part_number.value
                : documents[0].extraction.fields.rfq_reference.value) ||
            "",
        ).trim();
      const entityType =
        type === "SUPPLIER_INVOICE"
          ? "purchase_order"
          : type === "TECHNICAL_DRAWING"
            ? "item"
            : "rfq";
      if (!reference || reference.length > 120)
        throw new BadRequestException(
          "Choose the current RFQ, PO or item, or provide an exact reference.",
        );
      const policy: Record<string, [string, string, string]> = {
        rfq: ["rfqs", "rfq_number", "purchase_requisitions:read"],
        purchase_order: [
          "purchase_orders",
          "po_number",
          "purchase_orders:read",
        ],
        item: ["items", "code", "items:read"],
      };
      const [table, field, permission] = policy[entityType];
      if (!hasPermission(scope.user, permission))
        throw new ForbiddenException("ERP context access is required.");
      const { data, error } = await this.db
        .from(table)
        .select("id")
        .eq("tenant_id", scope.tenant)
        .eq(field, reference)
        .limit(2);
      if (error || data?.length !== 1)
        throw new BadRequestException(
          "Exact reference is unavailable or ambiguous; select an authorized record.",
        );
      envelope = {
        tenant_id: scope.tenant,
        profile: scope.profile,
        user_id: scope.owner,
        entity_type: entityType,
        entity_id: data[0].id,
      };
    }
    const validated = await this.brain.validateContext(scope.user, envelope);
    if (!validated.enabled || !validated.context)
      throw new ForbiddenException("Validated Brain context is required.");
    return validated.context;
  }
  private async source(
    scope: Scope,
    context: any,
    drawingNumber?: string | null,
  ): Promise<ERPFacts> {
    const type = context.entity_type,
      id = context.entity_id,
      pricing = this.pricing(scope);
    const result: ERPFacts = {
      kind: "ERP_FACT",
      entity_type: type,
      entity_id: id,
      reference: context.document_number,
      supplier: null,
      currency: null,
      delivery_date: null,
      payment_terms: null,
      lines: [],
      pricing_visible: pricing,
    };
    if (type === "rfq") {
      const header = await this.rows(
        this.db
          .from("rfqs")
          .select("id,vendor_id,rfq_number,pr_id")
          .eq("tenant_id", scope.tenant)
          .eq("id", id),
      );
      if (header.length !== 1)
        throw new NotFoundException("Authorized RFQ is unavailable.");
      const lines = await this.rows(
        this.db
          .from("rfq_items")
          .select("id,pr_item_id,item_code,item_name,requested_qty,uom")
          .eq("rfq_id", id),
      );
      result.lines = lines.map((row) => ({
        id: row.id,
        code: row.item_code,
        description: row.item_name,
        quantity: numeric(row.requested_qty),
        uom: row.uom,
      }));
      const requisitions = header[0].pr_id
        ? await this.rows(
            this.db
              .from("purchase_requisitions")
              .select("id")
              .eq("tenant_id", scope.tenant)
              .eq("id", header[0].pr_id),
          )
        : [];
      if (
        requisitions.length === 1 &&
        lines.length &&
        lines.every((row) => row.pr_item_id)
      ) {
        const requests = await this.rows(
          this.db
            .from("purchase_requisition_items")
            .select("id,required_date,payment_terms")
            .eq("pr_id", requisitions[0].id)
            .in(
              "id",
              lines.map((row) => row.pr_item_id),
            ),
        );
        const common = (field: string) =>
          requests.length === lines.length &&
          requests.every(
            (row) => row[field] != null && row[field] === requests[0][field],
          )
            ? requests[0][field]
            : null;
        result.delivery_date = common("required_date");
        result.payment_terms = common("payment_terms");
      }
      if (hasPermission(scope.user, "vendors:read") && header[0].vendor_id) {
        const vendors = await this.rows(
          this.db
            .from("vendors")
            .select("id,name")
            .eq("tenant_id", scope.tenant)
            .eq("id", header[0].vendor_id),
        );
        result.supplier = vendors[0]?.name ?? null;
      }
    } else if (type === "purchase_order") {
      const header = await this.rows(
        this.db
          .from("purchase_orders")
          .select(
            `id,vendor_id,po_number,payment_terms,delivery_date${pricing ? ",total_amount,tax_amount,terms_and_conditions" : ""}`,
          )
          .eq("tenant_id", scope.tenant)
          .eq("id", id),
      );
      if (header.length !== 1)
        throw new NotFoundException("Authorized PO is unavailable.");
      const lines = await this.rows(
        this.db
          .from("purchase_order_items")
          .select(
            `id,item_id,item_code,ordered_qty,uom${pricing ? ",rate" : ""}`,
          )
          .eq("po_id", id),
      );
      const receipt = hasPermission(scope.user, "grn:read")
        ? (await this.orders.reportingReceiptEvidence(scope.tenant, [id]))[0]
        : null;
      result.currency = explicitCurrency(
        null,
        pricing ? header[0].terms_and_conditions : null,
      );
      result.payment_terms = header[0].payment_terms ?? null;
      result.delivery_date = header[0].delivery_date ?? null;
      if (pricing) {
        result.total = numeric(header[0].total_amount);
        result.tax_total = numeric(header[0].tax_amount);
      }
      result.lines = lines.map((row) => {
        const received = receipt?.lines.find((line) => line.id === row.id);
        return {
          id: row.id,
          code: row.item_code,
          description: null,
          quantity: numeric(row.ordered_qty),
          uom: row.uom ?? null,
          ...(pricing ? { rate: numeric(row.rate) } : {}),
          received: received ? numeric(received.received_qty) : null,
          accepted: received ? numeric(received.accepted_qty) : null,
        };
      });
      if (hasPermission(scope.user, "vendors:read") && header[0].vendor_id) {
        const vendors = await this.rows(
          this.db
            .from("vendors")
            .select("id,name")
            .eq("tenant_id", scope.tenant)
            .eq("id", header[0].vendor_id),
        );
        result.supplier = vendors[0]?.name ?? null;
      }
    } else if (type === "item" || type === "item_drawing") {
      let query = this.db
        .from("item_drawings")
        .select(
          "id,item_id,drawing_number,revision_code,version,file_role,lifecycle_status",
        )
        .eq("tenant_id", scope.tenant)
        .eq(type === "item" ? "item_id" : "id", id)
        .neq("lifecycle_status", "DELETED");
      if (type === "item" && drawingNumber)
        query = query.eq("drawing_number", drawingNumber);
      const drawings = await this.rows(
        query.order("version", { ascending: false }),
      );
      const ambiguous =
        new Set(drawings.map((row) => row.drawing_number)).size > 1;
      const current = ambiguous ? null : drawings[0],
        itemId = type === "item" ? id : current?.item_id;
      const items = itemId
        ? await this.rows(
            this.db
              .from("items")
              .select("id,code")
              .eq("tenant_id", scope.tenant)
              .eq("id", itemId),
          )
        : [];
      result.part_number = items[0]?.code ?? null;
      result.drawing_number = current?.drawing_number ?? null;
      result.revision = current?.revision_code ?? null;
      result.latest_revision = false;
      if (type === "item" && current) {
        const sameVersion = drawings.filter(
          (row) => row.version === current.version,
        );
        result.latest_revision = sameVersion.every(
          (row) =>
            row.revision_code === current.revision_code &&
            row.drawing_number === current.drawing_number,
        );
      }
    } else
      throw new BadRequestException(
        "Select an RFQ, PO, item or drawing context for comparison.",
      );
    return result;
  }
  private async evaluate(scope: Scope, documents: any[], context: any) {
    this.typeAccess(scope, context.entity_type === 'rfq' ? 'SUPPLIER_QUOTATION' : context.entity_type === 'purchase_order' ? 'SUPPLIER_INVOICE' : 'TECHNICAL_DRAWING');
    if (
      (documents.some((row) => row.extraction.type === "SUPPLIER_QUOTATION") &&
        context.entity_type !== "rfq") ||
      (documents.some((row) => row.extraction.type === "SUPPLIER_INVOICE") &&
        context.entity_type !== "purchase_order") ||
      (documents.some((row) => row.extraction.type === "TECHNICAL_DRAWING") &&
        !["item", "item_drawing"].includes(context.entity_type))
    )
      throw new BadRequestException(
        "Document type and ERP context are incompatible.",
      );
    if (
      documents.length > 1 &&
      (context.entity_type !== "rfq" ||
        documents.some((row) => row.extraction.type !== "SUPPLIER_QUOTATION"))
    )
      throw new BadRequestException(
        "Multiple comparison requires 2-3 quotations for the same RFQ.",
      );
    const drawingFact = documents[0].extraction.fields.drawing_number;
    const facts = await this.source(
      scope,
      context,
      drawingFact.confidence === "HIGH" ? drawingFact.value : null,
    );
    const results = documents.flatMap((row) =>
      compareDocument(row.extraction, facts).map((result) => ({
        ...result,
        document_id: row.id,
      })),
    );
    return {
      status: "DOCUMENT_INTELLIGENCE_READ_ONLY",
      provider: "MIZANTRA_DOCUMENT_INTELLIGENCE_V1",
      intent_type: "DOCUMENT_COMPARE",
      context: facts,
      brain_context: context,
      results,
      ...(documents.length > 1
        ? {
            matrix: quotationMatrix(
              documents.map((row) => ({
                id: row.id,
                extraction: row.extraction,
              })),
              facts,
            ),
          }
        : {}),
      documents: documents.map((row) => ({
        id: row.id,
        version: row.extraction_version,
        filename: row.filename,
      })),
      generated_at: new Date().toISOString(),
      safety: { read_only: true, executable: false, erp_business_writes: 0 },
      assistant_message:
        "Evidence-backed document comparison. Uncertain extracted values require human review; no approval, supplier-selection, accounting or CAD verdict is produced.",
      smart_approval_evidence: {
        read_only: true,
        context_id: context.entity_id,
        use: "Factual comparison only; not an approval or rejection signal.",
      },
      doctor_handoff: {
        brain_context: context,
        business_mismatches_are_software_defects: false,
      },
      smart_import_handoff: {
        route: "/dashboard/support/admin/smart-imports",
        preview_only: true,
      },
    };
  }
  async compare(user: any, body: any) {
    const scope = this.scope(user);
    if (
      !Array.isArray(body?.document_ids) ||
      body.document_ids.length < 1 ||
      body.document_ids.length > 3 ||
      new Set(body.document_ids).size !== body.document_ids.length
    )
      throw new BadRequestException(
        "Choose 1-3 distinct authorized documents.",
      );
    const documents = await Promise.all(
        body.document_ids.map((id: string) => this.owned(scope, id)),
      ),
      context = await this.resolve(scope, documents, body),
      result = await this.evaluate(scope, documents, context),
      id = randomUUID();
    const { error } = await this.db.rpc("mizantra_document_save_comparison", {
      p_id: id,
      p_tenant: scope.tenant,
      p_profile: scope.profile,
      p_owner: scope.owner,
      p_result: result,
    });
    if (error)
      throw new ServiceUnavailableException(
        "Comparison metadata is unavailable.",
      );
    return { id, ...result };
  }
  async export(user: any, id: string) {
    const scope = this.scope(user);
    if (!uuid.test(id))
      throw new BadRequestException("Opaque comparison ID is required.");
    const { data, error } = await this.scoped(
      comparisons,
      scope,
      "id,document_versions,brain_context",
    )
      .eq("id", id)
      .maybeSingle();
    if (error || !data)
      throw new NotFoundException("Comparison is unavailable in this scope.");
    const documents = await Promise.all(
      data.document_versions.map((document: any) =>
        this.owned(scope, document.id),
      ),
    );
    if (
      documents.some(
        (row: any, index: number) =>
          row.extraction_version !== data.document_versions[index].version,
      )
    )
      throw new ConflictException(
        "Extraction changed; run a fresh comparison before exporting.",
      );
    const context = await this.resolve(scope, documents, {
        brain_context: data.brain_context,
      }),
      result = await this.evaluate(scope, documents, context);
    await this.audit(scope, "EXPORT", undefined, { comparison_id: id });
    return comparisonWorkbook(result);
  }
  async remove(user: any, id: string) {
    const scope = this.scope(user),
      row = await this.owned(scope, id);
    await this.audit(scope, "DELETE_ANALYSIS_UPLOAD", id);
    const { error } = await this.db
      .from(uploads)
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", id)
      .eq("tenant_id", scope.tenant)
      .eq("profile", scope.profile)
      .eq("owner_id", scope.owner);
    if (error)
      throw new ServiceUnavailableException(
        "Analysis metadata removal failed.",
      );
    const { error: storageError } = await this.db.storage
      .from(bucket)
      .remove([row.storage_path]);
    if (storageError)
      throw new ServiceUnavailableException(
        "Upload access was removed; private storage deletion requires an administrator retry.",
      );
    const { error: tombstoneError } = await this.db
      .from(uploads)
      .update({ storage_deleted_at: new Date().toISOString() })
      .eq("id", id)
      .eq("tenant_id", scope.tenant)
      .eq("profile", scope.profile)
      .eq("owner_id", scope.owner);
    if (tombstoneError)
      throw new ServiceUnavailableException(
        "Storage was removed; deletion metadata needs a retry.",
      );
    return { deleted: true, read_only: true, erp_business_writes: 0 };
  }
  async approvalHint(user: any, context: any) {
    if (
      process.env.MIZANTRA_DOCUMENT_INTELLIGENCE_ENABLED !== "true" ||
      process.env.MIZANTRA_QUOTATION_COMPARE_ENABLED !== "true" ||
      !hasPermission(user, "purchase_requisitions:read")
    )
      return null;
    const scope = this.scope(user);
    let prId =
        context.entity_type === "purchase_requisition"
          ? context.entity_id
          : null,
      vendorId: string | null = null;
    if (context.entity_type === "purchase_order") {
      const orders = await this.rows(
        this.db
          .from("purchase_orders")
          .select("id,pr_id,vendor_id")
          .eq("tenant_id", scope.tenant)
          .eq("id", context.entity_id),
      );
      prId = orders[0]?.pr_id ?? null;
      vendorId = orders[0]?.vendor_id ?? null;
    }
    if (!prId) return null;
    let query = this.db
      .from("rfqs")
      .select("id")
      .eq("tenant_id", scope.tenant)
      .eq("pr_id", prId);
    if (vendorId) query = query.eq("vendor_id", vendorId);
    const rfqs = await this.rows(query);
    if (!rfqs.length) return null;
    const { data, error } = await this.scoped(
      comparisons,
      scope,
      "id,document_versions,brain_context",
    )
      .eq("brain_context->>entity_type", "rfq")
      .in(
        "brain_context->>entity_id",
        rfqs.map((row) => row.id),
      )
      .order("created_at", { ascending: false })
      .limit(1);
    if (error || !data?.length) return null;
    const comparison = data[0],
      documents = await Promise.all(
        comparison.document_versions.map((document: any) =>
          this.owned(scope, document.id),
        ),
      );
    if (
      documents.some(
        (document: any, index: number) =>
          document.extraction_version !==
          comparison.document_versions[index].version,
      )
    )
      return null;
    return {
      comparison_id: comparison.id,
      document_ids: documents.map((document: any) => document.id),
      brain_context: comparison.brain_context,
      read_only: true,
      affects_review_verdict: false,
    };
  }
  async cleanupExpired(user: any) {
    const scope = this.scope(user);
    if (!hasAdminBypass(user))
      throw new ForbiddenException("Administrator access is required.");
    await this.privateBucket();
    const { data, error } = await this.db
      .from(uploads)
      .select("id,owner_id,storage_path")
      .eq("tenant_id", scope.tenant)
      .eq("profile", scope.profile)
      .is("storage_deleted_at", null)
      .or(`expires_at.lt.${new Date().toISOString()},deleted_at.not.is.null`)
      .limit(100);
    if (error)
      throw new ServiceUnavailableException(
        "Retention metadata is unavailable.",
      );
    let removed = 0;
    for (const row of data || []) {
      if (
        row.storage_path !==
          `${scope.tenant}/${scope.profile}/${row.owner_id}/${row.id}.${row.storage_path.split(".").pop()}` ||
        !/\.(pdf|png|jpg)$/.test(row.storage_path)
      )
        throw new ServiceUnavailableException(
          "Retention path integrity check failed.",
        );
      await this.audit(scope, "RETENTION_DELETE", row.id);
      const { error: storageError } = await this.db.storage
        .from(bucket)
        .remove([row.storage_path]);
      if (storageError)
        throw new ServiceUnavailableException(
          "Private retention deletion failed.",
        );
      const { error: metadataError } = await this.db
        .from(uploads)
        .update({
          deleted_at: new Date().toISOString(),
          storage_deleted_at: new Date().toISOString(),
        })
        .eq("tenant_id", scope.tenant)
        .eq("profile", scope.profile)
        .eq("id", row.id);
      if (metadataError)
        throw new ServiceUnavailableException("Retention tombstone failed.");
      removed++;
    }
    return { removed, erp_business_writes: 0 };
  }
  async health(user: any) {
    const scope = this.scope(user);
    if (!hasAdminBypass(user))
      throw new ForbiddenException("Administrator access is required.");
    await this.privateBucket();
    return {
      enabled: true,
      profile: scope.profile,
      storage: "PRIVATE_AUTHORIZED_PROXY",
      processing: this.running.size,
      format_validation: true,
      antivirus_scan: false,
      provider_available: !!process.env.OPENAI_API_KEY,
      erp_business_writes: 0,
    };
  }
}
