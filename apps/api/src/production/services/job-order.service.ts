import { Injectable, BadRequestException, NotFoundException, Logger } from '@nestjs/common';
import { createClient } from '@supabase/supabase-js';
import { randomUUID } from 'crypto';
import { CreateJobOrderDto, UpdateJobOrderDto, UpdateOperationDto } from '../dto/job-order.dto';
import { UidSupabaseService } from '../../uid/services/uid-supabase.service';
import { normalizeInventoryCategory } from '../../inventory/utils/inventory-category';

type JobOrderIssueMaterialsFailure = {
  materialId: string;
  itemCode?: string;
  itemId?: string;
  step:
    | 'RESOLVE_ITEM_ID'
    | 'FETCH_ITEM'
    | 'UID_REQUIRED'
    | 'FETCH_STOCK'
    | 'UPDATE_STOCK_ENTRY'
    | 'AUDIT_SIV'
    | 'UPDATE_MATERIAL'
    | 'UPDATE_JOB_ORDER';
  message: string;
};

type JobOrderIssueMaterialsSummary = {
  jobOrderId: string;
  totalMaterials: number;
  materialsNeedingIssue: number;
  attempted: number;
  issuedLines: number;
  partialLines: number;
  noStockLines: number;
  skippedInvalidItemLines: number;
  failures: JobOrderIssueMaterialsFailure[];
  durationMs: number;
  autoRepair?: {
    requested: boolean;
    attempted: boolean;
    triggered: boolean;
    reason?: string;
    plannedSubAssembliesToMake?: number;
    createdSubJobOrders?: number;
    qcApprovedSubJobOrders?: number;
  };
};

type IssueMaterialsOptions = {
  userId?: string;
  autoRepair?: boolean;
};

type SmartJobOrderPreviewRequest = {
  itemId: string;
  quantity: number;
  salesOrderId?: string;
  salesOrderItemId?: string;
  includeAllComponents?: boolean;
};

type SmartJobOrderCreateRequest = {
  itemId: string;
  quantity: number;
  startDate?: string;
  salesOrderId?: string;
  salesOrderItemId?: string;
  variantSelections?: Record<string, string>;
  itemSelections?: Record<string, string>;
  autoIssueMaterials?: boolean;
};

type SmartJobOrderCreateProgress = {
  current: number;
  total: number;
  phase: 'PREVIEW' | 'SUB_ASSEMBLIES' | 'MAIN_JOB_ORDER' | 'ISSUE_MATERIALS' | 'DONE';
  message: string;
  itemCode?: string;
  itemName?: string;
};

type SmartJobOrderCreateAsyncStatus = {
  id: string;
  tenantId: string;
  userId: string;
  status: 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED';
  createdAt: string;
  startedAt?: string;
  finishedAt?: string;
  progress: SmartJobOrderCreateProgress;
  result?: any;
  error?: string;
};

type SmartExplosionNode = {
  level: number;
  componentType: 'ITEM' | 'BOM';
  bomId: string;
  parentBomId?: string;
  itemId: string;
  itemCode: string;
  itemName: string;
  requiredQuantity: number;
  availableQuantity: number;
  toMakeQuantity: number;
  shortageQuantity: number;
  uidStrategy?: 'SERIALIZED' | 'BATCHED' | 'NONE';
  sequence?: number;
};

type SmartSubAssemblyPlan = {
  bomId: string;
  itemId: string;
  itemCode: string;
  itemName: string;
  requiredQuantity: number;
  availableQuantity: number;
  toMakeQuantity: number;
};

@Injectable()
export class JobOrderService {
  private readonly logger = new Logger(JobOrderService.name);
  private supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_KEY!,
  );

  private smartCreateJobs = new Map<string, SmartJobOrderCreateAsyncStatus>();
  private smartCreateJobTtlMs = 1000 * 60 * 60; // 1 hour

  constructor(private readonly uidService: UidSupabaseService) {}

  private pruneSmartCreateJobs(now = Date.now()) {
    for (const [id, job] of this.smartCreateJobs.entries()) {
      const createdAt = Date.parse(job.createdAt);
      const ageMs = Number.isFinite(createdAt) ? now - createdAt : this.smartCreateJobTtlMs + 1;
      const done = job.status === 'COMPLETED' || job.status === 'FAILED';
      if (done && ageMs > this.smartCreateJobTtlMs) {
        this.smartCreateJobs.delete(id);
      }
    }
  }

  async startSmartJobOrderCreateAsync(tenantId: string, userId: string, req: SmartJobOrderCreateRequest) {
    if (!tenantId) throw new BadRequestException('tenantId is required');
    if (!userId) throw new BadRequestException('userId is required');
    if (!req?.itemId) throw new BadRequestException('itemId is required');
    if (!req?.quantity || Number(req.quantity) <= 0) throw new BadRequestException('quantity must be > 0');

    this.pruneSmartCreateJobs();

    const jobId = randomUUID();
    const createdAt = new Date().toISOString();

    const job: SmartJobOrderCreateAsyncStatus = {
      id: jobId,
      tenantId,
      userId,
      status: 'PENDING',
      createdAt,
      progress: {
        current: 0,
        total: 0,
        phase: 'PREVIEW',
        message: 'Preparing Smart Job Order…',
      },
    };

    this.smartCreateJobs.set(jobId, job);

    // Run in background (do NOT await) to avoid request timeouts.
    setTimeout(() => {
      void this.runSmartJobOrderCreateJob(jobId, req);
    }, 0);

    return { jobId };
  }

  async getSmartJobOrderCreateAsyncStatus(tenantId: string, jobId: string) {
    if (!tenantId) throw new BadRequestException('tenantId is required');
    this.pruneSmartCreateJobs();

    const job = this.smartCreateJobs.get(jobId);
    if (!job) throw new NotFoundException('Smart job order create job not found');
    if (job.tenantId !== tenantId) throw new NotFoundException('Smart job order create job not found');

    // Do not leak tenant/user ids.
    const { tenantId: _t, userId: _u, ...safe } = job;
    return safe;
  }

  private async runSmartJobOrderCreateJob(jobId: string, req: SmartJobOrderCreateRequest) {
    const job = this.smartCreateJobs.get(jobId);
    if (!job) return;

    const update = (patch: Partial<SmartJobOrderCreateAsyncStatus>) => {
      const current = this.smartCreateJobs.get(jobId);
      if (!current) return;
      this.smartCreateJobs.set(jobId, {
        ...current,
        ...patch,
        progress: patch.progress ? { ...current.progress, ...patch.progress } : current.progress,
      });
    };

    try {
      update({ status: 'RUNNING', startedAt: new Date().toISOString() });

      const result = await this.createSmartJobOrderInternal(job.tenantId, job.userId, req, (p) => {
        update({ progress: p });
      });

      update({
        status: 'COMPLETED',
        finishedAt: new Date().toISOString(),
        progress: {
          current: result?._progressTotal ?? job.progress.current,
          total: result?._progressTotal ?? job.progress.total,
          phase: 'DONE',
          message: 'Smart Job Order created successfully',
        },
        result: {
          jobOrder: result.jobOrder,
          autoCompletedSubJobOrders: result.autoCompletedSubJobOrders,
          preview: result.preview,
          issueMaterialsSummary: (result as any).issueMaterialsSummary,
        },
      });
    } catch (err: any) {
      update({
        status: 'FAILED',
        finishedAt: new Date().toISOString(),
        error: err?.message || 'Failed to create Smart Job Order',
      });
    }
  }

  private isUuid(value: unknown): value is string {
    if (typeof value !== 'string') return false;
    const v = value.trim();
    if (!v) return false;
    // Basic UUID v1-v5 validation (case-insensitive)
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v);
  }

  /** Generate a unique movement_number for stock_movements inserts (ISS-000001, PRD-000001, etc.) */
  private async generateMovementNumber(tenantId: string, movementType: string): Promise<string> {
    const prefixes: Record<string, string> = {
      GRN_RECEIPT: 'RCP-',
      PRODUCTION_ISSUE: 'ISS-',
      PRODUCTION_RETURN: 'RET-',
      PRODUCTION_RECEIPT: 'PRD-',
      SALES_ISSUE: 'SAL-',
      TRANSFER: 'TRN-',
      ADJUSTMENT: 'ADJ-',
      SCRAP: 'SCR-',
    };
    const prefix = prefixes[movementType] || 'MOV-';
    const { count } = await this.supabase
      .from('stock_movements')
      .select('*', { count: 'exact', head: true })
      .eq('tenant_id', tenantId)
      .like('movement_number', `${prefix}%`);
    return `${prefix}${String((count || 0) + 1).padStart(6, '0')}`;
  }

  private resolveUidEntityTypeFromItemCategory(category: unknown): string {
    const c = String(category || '').toUpperCase();
    if (c.includes('COMPONENT')) return 'CP';
    if (c.includes('FINISHED')) return 'FG';
    if (c.includes('SUB_ASSEMBLY') || c.includes('ASSEMBLY')) return 'SA';
    return 'FG';
  }

  private async generateJobOrderUids(
    tenantId: string,
    userId: string | undefined,
    jobOrder: any,
    finishedItem: any,
    countToGenerate: number,
    reason: string,
  ) {
    const quantity = Math.max(0, Number(countToGenerate) || 0);
    if (quantity <= 0) return [];

    // Check if item has UID tracking enabled
    if (finishedItem?.uid_tracking === false || finishedItem?.uid_strategy === 'NONE') {
      console.log(`[JobOrder] Skipping UID generation for ${finishedItem?.code} - uid_tracking disabled or strategy is NONE`);
      return [];
    }

    const entityType = this.resolveUidEntityTypeFromItemCategory(finishedItem?.category);

    const uidsCreated: string[] = [];

    console.log(`[JobOrder] Generating ${quantity} UIDs for ${finishedItem?.code}, entityType: ${entityType}, reason: ${reason}`);

    for (let i = 0; i < quantity; i++) {
      const uid = await this.uidService.generateUID(
        'SAIF',
        'MFG',
        entityType,
      );

      const { error: uidError } = await this.supabase
        .from('uid_registry')
        .insert({
          tenant_id: tenantId,
          uid,
          entity_type: entityType,
          entity_id: finishedItem.id,
          job_order_id: jobOrder.id,
          location: 'QC',
          status: 'GENERATED',
          quality_status: 'PENDING',
          lifecycle: JSON.stringify([
            {
              stage: 'PRODUCED',
              timestamp: new Date().toISOString(),
              location: 'Production',
              reference: `${reason} JOB ORDER ${jobOrder.job_order_number}`,
              user: userId,
            },
            {
              stage: 'PENDING_QC',
              timestamp: new Date().toISOString(),
              location: 'QC',
              reference: 'Awaiting Quality Control Inspection',
              user: userId,
            },
          ]),
          metadata: JSON.stringify({
            item_code: finishedItem.code,
            item_name: finishedItem.name,
            job_order_id: jobOrder.id,
            job_order_number: jobOrder.job_order_number,
            production_date: new Date().toISOString(),
            qc_status: 'PENDING',
            reason,
          }),
        });

      if (!uidError) {
        uidsCreated.push(uid);
      } else {
        console.error('[JobOrder] UID generation error:', uidError);
      }
    }

    return uidsCreated;
  }

  async ensureUidsForJobOrder(tenantId: string, jobOrderId: string, userId?: string) {
    const { data: jobOrder, error: jobOrderError } = await this.supabase
      .from('production_job_orders')
      .select('id, tenant_id, job_order_number, status, item_id, quantity, completed_quantity')
      .eq('tenant_id', tenantId)
      .eq('id', jobOrderId)
      .single();

    if (jobOrderError) throw new BadRequestException(jobOrderError.message);
    if (!jobOrder) throw new NotFoundException('Job order not found');

    const desiredCount = Math.max(
      0,
      Number(jobOrder.completed_quantity ?? jobOrder.quantity ?? 0) || 0,
    );

    const { count: existingCount, error: countError } = await this.supabase
      .from('uid_registry')
      .select('uid', { count: 'exact', head: true })
      .eq('tenant_id', tenantId)
      .eq('job_order_id', jobOrderId);

    if (countError) throw new BadRequestException(countError.message);

    const have = Number(existingCount) || 0;
    const missing = Math.max(0, desiredCount - have);
    if (missing <= 0) {
      return {
        jobOrderId,
        jobOrderNumber: jobOrder.job_order_number,
        desired: desiredCount,
        existing: have,
        created: 0,
        message: 'UIDs already exist for this job order',
      };
    }

    const { data: finishedItem, error: itemError } = await this.supabase
      .from('items')
      .select('id, code, name, category')
      .eq('id', jobOrder.item_id)
      .single();

    if (itemError) throw new BadRequestException(itemError.message);
    if (!finishedItem) throw new BadRequestException('Finished item not found');

    const createdUids = await this.generateJobOrderUids(
      tenantId,
      userId,
      jobOrder,
      finishedItem,
      missing,
      'ENSURE_UIDS',
    );

    if (createdUids.length !== missing) {
      throw new BadRequestException(
        `Failed to generate all UIDs. Needed ${missing}, created ${createdUids.length}.`,
      );
    }

    return {
      jobOrderId,
      jobOrderNumber: jobOrder.job_order_number,
      desired: desiredCount,
      existing: have,
      created: createdUids.length,
      uids: createdUids,
      message: `Generated ${createdUids.length} missing UIDs`,
    };
  }

  async completeJobOrderPartial(
    tenantId: string,
    jobOrderId: string,
    userId?: string,
    details?: { producedQuantity: number },
  ) {
    const producedQuantity = Number(details?.producedQuantity);
    if (!Number.isFinite(producedQuantity) || producedQuantity <= 0) {
      throw new BadRequestException('producedQuantity must be > 0');
    }

    const { data: jobOrder, error: jobOrderError } = await this.supabase
      .from('production_job_orders')
      .select('id, tenant_id, job_order_number, status, item_id, quantity, completed_quantity')
      .eq('tenant_id', tenantId)
      .eq('id', jobOrderId)
      .single();

    if (jobOrderError) throw new BadRequestException(jobOrderError.message);
    if (!jobOrder) throw new NotFoundException('Job order not found');

    if (String(jobOrder.status || '').toUpperCase() !== 'IN_PROGRESS') {
      throw new BadRequestException('Job order must be IN_PROGRESS to record partial completion');
    }

    const planned = Math.max(0, Number(jobOrder.quantity) || 0);
    if (planned <= 0) {
      throw new BadRequestException('Invalid job order quantity');
    }

    const { count: existingCount, error: countError } = await this.supabase
      .from('uid_registry')
      .select('uid', { count: 'exact', head: true })
      .eq('tenant_id', tenantId)
      .eq('job_order_id', jobOrderId);

    if (countError) throw new BadRequestException(countError.message);

    const haveUids = Math.max(0, Number(existingCount) || 0);
    const alreadyCompleted = Math.max(
      0,
      Number(jobOrder.completed_quantity) || 0,
      haveUids,
    );

    if (alreadyCompleted > planned) {
      throw new BadRequestException(
        `Job order has inconsistent quantities (planned ${planned}, completed ${alreadyCompleted}). Please contact admin.`,
      );
    }

    const nextCompleted = Math.min(planned, alreadyCompleted + producedQuantity);
    const producedNow = Math.max(0, nextCompleted - alreadyCompleted);

    if (producedNow <= 0) {
      return {
        jobOrderId,
        jobOrderNumber: jobOrder.job_order_number,
        plannedQuantity: planned,
        completedQuantity: alreadyCompleted,
        producedNow: 0,
        message: 'No remaining quantity to record (already at planned quantity)',
      };
    }

    const { error: updateError } = await this.supabase
      .from('production_job_orders')
      .update({ completed_quantity: nextCompleted })
      .eq('tenant_id', tenantId)
      .eq('id', jobOrderId);

    if (updateError) throw new BadRequestException(updateError.message);

    const ensureResult = await this.ensureUidsForJobOrder(tenantId, jobOrderId, userId);

    return {
      jobOrderId,
      jobOrderNumber: jobOrder.job_order_number,
      plannedQuantity: planned,
      completedQuantity: nextCompleted,
      producedNow,
      uids: ensureResult,
      message:
        nextCompleted >= planned
          ? 'Partial completion recorded. Planned quantity reached; use Complete to finish the job order.'
          : 'Partial completion recorded. UIDs generated and pending SRV receipt.',
    };
  }

  private async resolveJobOrderIdentity(
    tenantId: string,
    jobOrderIdOrNumber: string,
  ): Promise<{ id: string; job_order_number?: string; status?: string }> {
    const raw = String(jobOrderIdOrNumber || '').trim();
    if (!raw) throw new BadRequestException('jobOrderId is required');

    if (this.isUuid(raw)) {
      const { data: byId, error: byIdError } = await this.supabase
        .from('production_job_orders')
        .select('id, job_order_number, status')
        .eq('tenant_id', tenantId)
        .eq('id', raw)
        .maybeSingle();

      if (byIdError) throw new BadRequestException(byIdError.message);
      if (byId?.id) {
        return {
          id: String(byId.id),
          job_order_number: String((byId as any).job_order_number || ''),
          status: String((byId as any).status || ''),
        };
      }
    }

    const { data: byNumber, error: byNumberError } = await this.supabase
      .from('production_job_orders')
      .select('id, job_order_number, status')
      .eq('tenant_id', tenantId)
      .eq('job_order_number', raw)
      .maybeSingle();

    if (byNumberError) throw new BadRequestException(byNumberError.message);
    if (!byNumber?.id) throw new NotFoundException('Job order not found');

    return {
      id: String(byNumber.id),
      job_order_number: String((byNumber as any).job_order_number || ''),
      status: String((byNumber as any).status || ''),
    };
  }

  private async issueJobOrderMaterials(tenantId: string, jobOrderId: string, movedByUserId?: string): Promise<JobOrderIssueMaterialsSummary> {
    const startedAt = Date.now();

    const resolvedJobOrder = await this.resolveJobOrderIdentity(tenantId, jobOrderId);
    const targetJobOrderId = resolvedJobOrder.id;

    this.logger.log('[SmartJO] issueJobOrderMaterials called');
    this.logger.log(JSON.stringify({ tenantId, jobOrderId, targetJobOrderId }));

    const { data: jobOrder, error: jobOrderError } = await this.supabase
      .from('production_job_orders')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('id', targetJobOrderId)
      .single();

    if (jobOrderError) throw new BadRequestException(jobOrderError.message);
    if (!jobOrder) throw new NotFoundException('Job order not found');

    const { data: materialsRaw, error: materialsError } = await this.supabase
      .from('job_order_materials')
      .select('*')
      .eq('job_order_id', targetJobOrderId);

    if (materialsError) throw new BadRequestException(materialsError.message);
    jobOrder.job_order_materials = Array.isArray(materialsRaw) ? materialsRaw : [];

    const status = String(jobOrder.status || '');
    if (status === 'COMPLETED' || status === 'CANCELLED') {
      throw new BadRequestException('Cannot issue materials for a completed/cancelled job order');
    }

    const totalMaterials = jobOrder.job_order_materials?.length || 0;
    this.logger.log(`[SmartJO] Found ${totalMaterials} materials on job order`);

    // Some deployments (and some historical rows) store BOM header IDs into job_order_materials.item_id
    // for BOM-type components. Those are valid UUIDs but not item IDs, so stock lookups will fail.
    // Normalize any BOM header IDs to their corresponding items up-front.
    try {
      const rawMaterials = Array.isArray(jobOrder.job_order_materials) ? jobOrder.job_order_materials : [];
      const candidateIds = new Set<string>();
      for (const m of rawMaterials) {
        const itemId = String(m?.item_id || '').trim();
        const variantId = String(m?.selected_variant_id || '').trim();
        if (itemId && this.isUuid(itemId)) candidateIds.add(itemId);
        if (variantId && this.isUuid(variantId)) candidateIds.add(variantId);
      }

      const idList = Array.from(candidateIds);
      if (idList.length) {
        const { data: existingItems } = await this.supabase
          .from('items')
          .select('id')
          .eq('tenant_id', tenantId)
          .in('id', idList);

        const existingItemIds = new Set((existingItems || []).map((r: any) => String(r?.id || '').trim()).filter(Boolean));
        const missingIds = idList.filter((id) => !existingItemIds.has(id));

        if (missingIds.length) {
          const { data: bomHeaders } = await this.supabase
            .from('bom_headers')
            .select('id, item_id')
            .eq('tenant_id', tenantId)
            .in('id', missingIds);

          const headerIdToItemId = new Map<string, string>();
          for (const h of bomHeaders || []) {
            const headerId = String((h as any)?.id || '').trim();
            const mappedItemId = String((h as any)?.item_id || '').trim();
            if (headerId && mappedItemId && this.isUuid(mappedItemId)) {
              headerIdToItemId.set(headerId, mappedItemId);
            }
          }

          if (headerIdToItemId.size) {
            for (const m of rawMaterials) {
              const currentItemId = String(m?.item_id || '').trim();
              const currentVariantId = String(m?.selected_variant_id || '').trim();
              const mappedItemId = currentItemId ? headerIdToItemId.get(currentItemId) : undefined;
              const mappedVariantId = currentVariantId ? headerIdToItemId.get(currentVariantId) : undefined;

              const patch: any = {};
              if (mappedItemId && mappedItemId !== currentItemId) patch.item_id = mappedItemId;
              if (mappedVariantId && mappedVariantId !== currentVariantId) patch.selected_variant_id = mappedVariantId;

              if (Object.keys(patch).length) {
                await this.supabase
                  .from('job_order_materials')
                  .update(patch)
                  .eq('id', m.id);
              }
            }

            // Keep the in-memory copy consistent for this request.
            jobOrder.job_order_materials = rawMaterials.map((m: any) => {
              const currentItemId = String(m?.item_id || '').trim();
              const currentVariantId = String(m?.selected_variant_id || '').trim();
              const mappedItemId = currentItemId ? headerIdToItemId.get(currentItemId) : undefined;
              const mappedVariantId = currentVariantId ? headerIdToItemId.get(currentVariantId) : undefined;
              return {
                ...m,
                item_id: mappedItemId || m.item_id,
                selected_variant_id: mappedVariantId || m.selected_variant_id,
              };
            });
          }
        }
      }
    } catch (e) {
      // Never block issuing because of normalization; proceed with best-effort.
      this.logger.warn('[SmartJO] Material ID normalization skipped due to error');
      this.logger.warn(String((e as any)?.message || e));
    }

    // Some legacy/edge flows can create job_order_materials with missing/invalid UUIDs.
    // If we just skip them, the JO appears to stop issuing around N lines.
    // Resolve missing item ids from item_code up-front so we can issue all materials.
    const normalizeCode = (value: unknown) => String(value || '').trim().toUpperCase();
    const resolveCodeCandidate = (m: any) => {
      const fromItemCode = normalizeCode(m?.item_code);
      if (fromItemCode) return fromItemCode;

      // Some buggy historical rows stored item_code into selected_variant_id / item_id.
      const sv = String(m?.selected_variant_id || '').trim();
      if (sv && !this.isUuid(sv)) return normalizeCode(sv);

      const itemId = String(m?.item_id || '').trim();
      if (itemId && !this.isUuid(itemId)) return normalizeCode(itemId);

      return '';
    };

    const materialsNeedingIssue = (jobOrder.job_order_materials || []).filter((m: any) => {
      const requiredQty = Number(m.required_quantity) || 0;
      const alreadyIssued = Number(m.issued_quantity) || 0;
      return Math.max(0, requiredQty - alreadyIssued) > 0;
    });

    const failures: JobOrderIssueMaterialsFailure[] = [];
    let attempted = 0;
    let issuedLines = 0;
    let partialLines = 0;
    let noStockLines = 0;
    let skippedInvalidItemLines = 0;

    const codesToResolve = Array.from(
      new Set(materialsNeedingIssue.map((m: any) => resolveCodeCandidate(m)).filter(Boolean)),
    );

    const itemIdByCode = new Map<string, string>();
    for (const code of codesToResolve) {
      try {
        const codeStr = String(code);
        const { data: found } = await this.supabase
          .from('items')
          .select('id, code')
          .eq('tenant_id', tenantId)
          .ilike('code', codeStr)
          .limit(1);

        const row = Array.isArray(found) ? found[0] : null;
        if (row?.id) {
          itemIdByCode.set(codeStr, String(row.id));
        }
      } catch (e) {
        console.warn('[JobOrderService] Failed resolving item_id from code', { tenantId, code, e });
      }
    }

    for (const material of jobOrder.job_order_materials || []) {
      const requiredQty = Number(material.required_quantity) || 0;
      const alreadyIssued = Number(material.issued_quantity) || 0;
      const consumeQty = Math.max(0, requiredQty - alreadyIssued);
      if (consumeQty <= 0) {
        // Keep status consistent if fully issued.
        if (requiredQty > 0 && alreadyIssued >= requiredQty && material.status !== 'ISSUED') {
          await this.supabase
            .from('job_order_materials')
            .update({ status: 'ISSUED' })
            .eq('id', material.id);
        }
        continue;
      }

      attempted += 1;

      try {

      let itemIdToConsume = material.selected_variant_id || material.item_id;

      const normalizedCode = resolveCodeCandidate(material);

      // If we have a UUID, still validate it exists and matches the material code.
      // Some legacy rows have a UUID that points to the wrong item.
      if (this.isUuid(String(itemIdToConsume || ''))) {
        const { data: existingItem, error: existingItemError } = await this.supabase
          .from('items')
          .select('id, code')
          .eq('tenant_id', tenantId)
          .eq('id', itemIdToConsume)
          .maybeSingle();

        const resolvedByCode = normalizedCode ? itemIdByCode.get(normalizedCode) : undefined;

        const existingCode = normalizeCode(existingItem?.code);
        const isMissing = Boolean(existingItemError) || !existingItem;
        const isMismatch = Boolean(existingItem && normalizedCode && existingCode && existingCode !== normalizedCode);

        if ((isMissing || isMismatch) && resolvedByCode && this.isUuid(String(resolvedByCode))) {
          console.warn('[JobOrderService] Corrected material item_id using item_code', {
            materialId: material.id,
            item_code: material.item_code,
            from: itemIdToConsume,
            to: resolvedByCode,
            reason: isMissing ? 'MISSING_ITEM' : 'CODE_MISMATCH',
          });

          itemIdToConsume = resolvedByCode;
          const patch: any = { item_id: resolvedByCode };
          if (material.selected_variant_id && !this.isUuid(String(material.selected_variant_id || ''))) {
            patch.selected_variant_id = null;
          }
          await this.supabase
            .from('job_order_materials')
            .update(patch)
            .eq('id', material.id);
        }
      }

      if (!this.isUuid(String(itemIdToConsume || ''))) {
        const resolved = normalizedCode ? itemIdByCode.get(normalizedCode) : undefined;

        if (resolved && this.isUuid(String(resolved))) {
          console.warn('[JobOrderService] Backfilled missing item_id from item_code', {
            materialId: material.id,
            item_code: material.item_code,
            from: itemIdToConsume,
            to: resolved,
          });

          itemIdToConsume = resolved;

          // Persist the fix so subsequent actions (edit/issue/complete) are consistent.
          const patch: any = { item_id: resolved };
          if (material.selected_variant_id && !this.isUuid(String(material.selected_variant_id || ''))) {
            patch.selected_variant_id = null;
          }
          await this.supabase
            .from('job_order_materials')
            .update(patch)
            .eq('id', material.id);
        } else {
          skippedInvalidItemLines += 1;
          failures.push({
            materialId: String(material.id),
            itemCode: material.item_code,
            itemId: String(itemIdToConsume || ''),
            step: 'RESOLVE_ITEM_ID',
            message: 'Skipping material with invalid item_id (cannot resolve)'
          });
          this.logger.error('[SmartJO] Skipping material: invalid item_id cannot resolve');
          this.logger.error(JSON.stringify({ tenantId, jobOrderId, materialId: material.id, item_code: material.item_code, itemIdToConsume }));
          // Keep pending; continue processing remaining materials.
          continue;
        }
      }

      this.logger.log('[SmartJO] Issuing material');
      this.logger.log(
        JSON.stringify({
        code: material.item_code,
        itemId: itemIdToConsume,
        requiredQty,
        alreadyIssued,
        consumeQty,
        }),
      );

      const { data: item, error: itemErr } = await this.supabase
        .from('items')
        .select('code, name, category')
        .eq('id', itemIdToConsume)
        .single();

      if (itemErr) {
        failures.push({
          materialId: String(material.id),
          itemCode: material.item_code,
          itemId: String(itemIdToConsume || ''),
          step: 'FETCH_ITEM',
          message: itemErr.message,
        });
        this.logger.error('[SmartJO] Failed fetching item for material');
        this.logger.error(JSON.stringify({ tenantId, jobOrderId, materialId: material.id, itemIdToConsume, error: itemErr }));
        continue;
      }

      // If item is UID-tracked (has ACTIVE UIDs), require scanned UID issuing via issue-line.
      // Prevent bypassing the UID mapping requirement through the bulk issue endpoint.
      try {
        const { count: activeUidCount, error: uidCountErr } = await this.supabase
          .from('uid_registry')
          .select('id', { count: 'exact', head: true })
          .eq('tenant_id', tenantId)
          .eq('entity_id', itemIdToConsume)
          .eq('status', 'ACTIVE');

        if (uidCountErr) throw uidCountErr;

        if ((activeUidCount || 0) > 0) {
          failures.push({
            materialId: String(material.id),
            itemCode: material.item_code,
            itemId: String(itemIdToConsume || ''),
            step: 'UID_REQUIRED',
            message: 'UID_MAPPING_REQUIRED',
          });
          this.logger.warn('[SmartJO] Skipping bulk issue for UID-tracked item; requires scanned UID issue-line');
          this.logger.warn(JSON.stringify({ tenantId, jobOrderId, materialId: material.id, itemIdToConsume, activeUidCount }));
          continue;
        }
      } catch (e: any) {
        // If UID check fails, don't block bulk issuing for non-UID items; log and continue.
        this.logger.warn('[SmartJO] UID check failed; proceeding without UID enforcement for bulk issuing');
        this.logger.warn(String(e?.message || e));
      }

      const { data: stockEntries, error: stockErr } = await this.supabase
        .from('stock_entries')
        .select('*')
        .eq('tenant_id', tenantId)
        .eq('item_id', itemIdToConsume)
        .gt('available_quantity', 0)
        .order('created_at', { ascending: true });

      if (stockErr) {
        failures.push({
          materialId: String(material.id),
          itemCode: material.item_code,
          itemId: String(itemIdToConsume || ''),
          step: 'FETCH_STOCK',
          message: stockErr.message,
        });
        this.logger.error('[SmartJO] Failed fetching stock entries for material');
        this.logger.error(JSON.stringify({ tenantId, jobOrderId, materialId: material.id, itemIdToConsume, error: stockErr }));
        continue;
      }

      const safeEntries = Array.isArray(stockEntries) ? stockEntries : [];
      const totalAvailable = safeEntries.reduce(
        (sum, entry) => sum + parseFloat(entry.available_quantity.toString()),
        0,
      );

      this.logger.log('[SmartJO] Stock available');
      this.logger.log(JSON.stringify({ code: item?.code, totalAvailable, needed: consumeQty, entries: safeEntries.length }));

      // Best-effort issuing: consume up to what's available, never throw for missing/insufficient stock.
      // Smart Job Orders often start with shortages and should still be created.
      const issueNow = Math.max(0, Math.min(consumeQty, totalAvailable));
      if (issueNow <= 0) {
        // Nothing to issue; keep issued_quantity as-is.
        noStockLines += 1;
        failures.push({
          materialId: String(material.id),
          itemCode: material.item_code,
          itemId: String(itemIdToConsume || ''),
          step: 'FETCH_STOCK',
          message: 'NO_STOCK_AVAILABLE',
        });

        this.logger.warn('[SmartJO] No stock available for material; leaving PENDING');
        this.logger.warn(
          JSON.stringify({
            tenantId,
            jobOrderId,
            materialId: material.id,
            code: material.item_code,
            itemId: itemIdToConsume,
            requiredQty,
            alreadyIssued,
            consumeQty,
            totalAvailable,
            entryCount: safeEntries.length,
          }),
        );
        continue;
      }

      let remainingToConsume = issueNow;
      let updateFailed = false;
      for (const entry of safeEntries) {
        if (remainingToConsume <= 0) break;

        const entryAvailable = parseFloat(entry.available_quantity.toString());
        const toConsumeFromEntry = Math.min(entryAvailable, remainingToConsume);
        const newAvailable = entryAvailable - toConsumeFromEntry;

        this.logger.log('[SmartJO] Consuming from stock entry');
        this.logger.log(JSON.stringify({ entryId: entry.id, before: entryAvailable, consuming: toConsumeFromEntry, after: newAvailable }));

        const { error: updateError } = await this.supabase
          .from('stock_entries')
          .update({
            available_quantity: newAvailable,
            updated_at: new Date().toISOString(),
          })
          .eq('id', entry.id);

        if (updateError) {
          updateFailed = true;
          failures.push({
            materialId: String(material.id),
            itemCode: material.item_code,
            itemId: String(itemIdToConsume || ''),
            step: 'UPDATE_STOCK_ENTRY',
            message: updateError.message,
          });
          this.logger.error('[SmartJO] Failed to update stock entry');
          this.logger.error(
            JSON.stringify({ tenantId, jobOrderId, materialId: material.id, itemIdToConsume, entryId: entry.id, error: updateError }),
          );
          break; // Exit this material's stock entry loop, move to next material
        }

        // Keep inventory_stock consistent with stock_entries.
        // Smart JO preview uses stock checks and other modules rely on inventory_stock.
        const warehouseId = String((entry as any)?.warehouse_id || '').trim();
        if (warehouseId && this.isUuid(warehouseId)) {
          const { error: invError } = await this.supabase.rpc('adjust_inventory_stock', {
            p_tenant_id: tenantId,
            p_item_id: itemIdToConsume,
            p_warehouse_id: warehouseId,
            p_location_id: null,
            p_quantity_change: -toConsumeFromEntry,
            p_category: normalizeInventoryCategory((item as any)?.category, 'RAW_MATERIAL'),
          });

          if (invError) {
            failures.push({
              materialId: String(material.id),
              itemCode: material.item_code,
              itemId: String(itemIdToConsume || ''),
              step: 'UPDATE_STOCK_ENTRY',
              message: `INVENTORY_STOCK_SYNC_FAILED: ${invError.message}`,
            });
            this.logger.error('[SmartJO] Failed syncing inventory_stock after consuming stock entry');
            this.logger.error(
              JSON.stringify({
                tenantId,
                jobOrderId,
                materialId: material.id,
                itemIdToConsume,
                warehouseId,
                consumed: toConsumeFromEntry,
                error: invError,
              }),
            );
          }
        }

        remainingToConsume -= toConsumeFromEntry;

        // Audit trail: record SIV (store issue voucher) movement when user is known.
        const movedBy = String(movedByUserId || '').trim();
        if (movedBy && this.isUuid(movedBy)) {
          const warehouseId = String((entry as any)?.warehouse_id || '').trim();
          const movementNumber = await this.generateMovementNumber(tenantId, 'PRODUCTION_ISSUE');
          const { error: auditError } = await this.supabase
            .from('stock_movements')
            .insert({
              tenant_id: tenantId,
              movement_number: movementNumber,
              movement_type: 'PRODUCTION_ISSUE',
              item_id: itemIdToConsume,
              from_warehouse_id: warehouseId && this.isUuid(warehouseId) ? warehouseId : null,
              quantity: toConsumeFromEntry,
              reference_type: 'SIV',
              reference_id: targetJobOrderId,
              reference_number: String((jobOrder as any)?.job_order_number || ''),
              notes: `SIV: Issued material ${String(material?.item_code || '').trim()} (${String(material?.item_name || '').trim()}) for ${String((jobOrder as any)?.job_order_number || '').trim()} (material_id=${String(material?.id || '').trim()})`,
              moved_by: movedBy,
              movement_date: new Date().toISOString(),
            } as any);

          if (auditError) {
            failures.push({
              materialId: String(material.id),
              itemCode: material.item_code,
              itemId: String(itemIdToConsume || ''),
              step: 'AUDIT_SIV',
              message: `STOCK_MOVEMENTS_INSERT_FAILED: ${auditError.message}`,
            });
            this.logger.error('[SmartJO] Failed inserting SIV stock_movements audit row');
            this.logger.error(
              JSON.stringify({
                tenantId,
                jobOrderId: targetJobOrderId,
                materialId: material.id,
                itemIdToConsume,
                consumed: toConsumeFromEntry,
                movedBy,
                error: auditError,
              }),
            );
          }
        }
      }

      const actuallyConsumed = Math.max(0, issueNow - remainingToConsume);
      if (actuallyConsumed <= 0) {
        // If we planned to consume but couldn't update any stock entries, keep material unchanged.
        if (updateFailed) {
          this.logger.warn('[SmartJO] Planned consumption but consumed 0 due to stock update failure');
        }
        continue;
      }

      const nextIssued = alreadyIssued + actuallyConsumed;
      const nextStatus = nextIssued >= requiredQty ? 'ISSUED' : 'PARTIAL';
      if (nextStatus === 'ISSUED') issuedLines += 1;
      else partialLines += 1;

      this.logger.log('[SmartJO] Material issued');
      this.logger.log(JSON.stringify({ code: material.item_code, issued: nextIssued, required: requiredQty, status: nextStatus }));
      
      const { error: matUpdateErr } = await this.supabase
        .from('job_order_materials')
        .update({
          issued_quantity: nextIssued,
          status: nextStatus,
        })
        .eq('id', material.id);

      if (matUpdateErr) {
        failures.push({
          materialId: String(material.id),
          itemCode: material.item_code,
          itemId: String(itemIdToConsume || ''),
          step: 'UPDATE_MATERIAL',
          message: matUpdateErr.message,
        });
        this.logger.error('[SmartJO] Failed to update job_order_materials');
        this.logger.error(JSON.stringify({ tenantId, jobOrderId, materialId: material.id, error: matUpdateErr }));
      }
      } catch (e: any) {
        failures.push({
          materialId: String(material.id),
          itemCode: material.item_code,
          itemId: String(material.selected_variant_id || material.item_id || ''),
          step: 'UPDATE_MATERIAL',
          message: e?.message || 'Unknown error while issuing material',
        });
        this.logger.error('[SmartJO] Unexpected error issuing material');
        this.logger.error(
          JSON.stringify({ tenantId, jobOrderId, materialId: material.id, item_code: material.item_code, error: e?.message || e }),
        );
        continue;
      }
    }

    // Move JO to IN_PROGRESS once materials are issued
    if (status !== 'IN_PROGRESS') {
      const { error: joUpdateErr } = await this.supabase
        .from('production_job_orders')
        .update({ status: 'IN_PROGRESS', actual_start_date: new Date().toISOString() })
        .eq('tenant_id', tenantId)
        .eq('id', targetJobOrderId);

      if (joUpdateErr) {
        failures.push({
          materialId: '',
          step: 'UPDATE_JOB_ORDER',
          message: joUpdateErr.message,
        });
        this.logger.error('[SmartJO] Failed to update job order status to IN_PROGRESS');
        this.logger.error(JSON.stringify({ tenantId, jobOrderId, error: joUpdateErr }));
      }
    }

    const durationMs = Date.now() - startedAt;
    const summary: JobOrderIssueMaterialsSummary = {
      jobOrderId: targetJobOrderId,
      totalMaterials,
      materialsNeedingIssue: materialsNeedingIssue.length,
      attempted,
      issuedLines,
      partialLines,
      noStockLines,
      skippedInvalidItemLines,
      failures,
      durationMs,
    };

    this.logger.log('[SmartJO] issueJobOrderMaterials summary');
    this.logger.log(JSON.stringify(summary));
    return summary;
  }

  async issueMaterialsForJobOrder(
    tenantId: string,
    jobOrderId: string,
    options: IssueMaterialsOptions = {},
  ): Promise<JobOrderIssueMaterialsSummary> {
    if (!tenantId) throw new BadRequestException('tenantId is required');
    if (!jobOrderId) throw new BadRequestException('jobOrderId is required');

    const autoRepairRequested = options.autoRepair !== false;
    const userId = String(options.userId || '').trim();

    const first = await this.issueJobOrderMaterials(tenantId, jobOrderId, userId || undefined);
    first.autoRepair = {
      requested: autoRepairRequested,
      attempted: false,
      triggered: false,
    };

    if (!autoRepairRequested) return first;

    // Only attempt auto-repair if issuing is completely blocked by NO_STOCK.
    // This is aimed at legacy Smart JOs created before the improved BOM expansion logic.
    const hasIssuedAnything = (first.issuedLines || 0) > 0 || (first.partialLines || 0) > 0;
    const hasNoStock = (first.noStockLines || 0) > 0;
    const isFullyBlocked = !hasIssuedAnything && hasNoStock;
    if (!isFullyBlocked) {
      first.autoRepair.reason = 'NOT_FULLY_BLOCKED';
      return first;
    }

    // Only for Smart JOs (avoid creating sub-job-orders for normal/manual JOs).
    const { data: joRow, error: joErr } = await this.supabase
      .from('production_job_orders')
      .select('id, job_order_number, notes')
      .eq('tenant_id', tenantId)
      .eq('id', first.jobOrderId)
      .single();

    if (joErr) {
      first.autoRepair.reason = `JOB_ORDER_FETCH_FAILED: ${joErr.message}`;
      return first;
    }

    const notes = String((joRow as any)?.notes || '');
    const looksSmart = /\bsmart\s+job\s+order\b/i.test(notes);
    if (!looksSmart) {
      first.autoRepair.reason = 'NOT_SMART_JOB_ORDER';
      return first;
    }

    if (!userId) {
      first.autoRepair.reason = 'MISSING_USER_ID_FOR_REPAIR';
      return first;
    }

    // Additionally, only trigger if NO_STOCK is the dominant failure mode.
    const failures = Array.isArray(first.failures) ? first.failures : [];
    const noStockFailures = failures.filter((f) => String(f?.message || '') === 'NO_STOCK_AVAILABLE');
    if (noStockFailures.length === 0) {
      first.autoRepair.reason = 'NO_NO_STOCK_FAILURES';
      return first;
    }

    this.logger.log('[SmartJO][AutoRepair] Triggering smart repair+issue from issue-materials endpoint');
    this.logger.log(
      JSON.stringify({ tenantId, jobOrderId: first.jobOrderId, jobOrderNumber: (joRow as any)?.job_order_number || null, noStockFailures: noStockFailures.length }),
    );

    first.autoRepair.attempted = true;

    try {
      const repaired = await this.repairSmartJobOrderAndIssueMaterials(tenantId, userId, first.jobOrderId);
      const finalSummary = repaired.issueMaterialsSummary;
      finalSummary.autoRepair = {
        requested: true,
        attempted: true,
        triggered: true,
        reason: 'SMART_REPAIR_RAN',
        plannedSubAssembliesToMake: repaired.plannedSubAssembliesToMake,
        createdSubJobOrders: repaired.createdSubJobOrders,
        qcApprovedSubJobOrders: repaired.qcApprovedSubJobOrders,
      };
      return finalSummary;
    } catch (e: any) {
      first.autoRepair.triggered = true;
      first.autoRepair.reason = `SMART_REPAIR_FAILED: ${e?.message || 'Unknown error'}`;
      this.logger.error('[SmartJO][AutoRepair] Smart repair failed');
      this.logger.error(JSON.stringify({ tenantId, jobOrderId, error: e?.message || e }));
      return first;
    }
  }

  async repairSmartJobOrderAndIssueMaterials(
    tenantId: string,
    userId: string,
    jobOrderId: string,
  ): Promise<{
    jobOrderId: string;
    jobOrderNumber: string;
    preview: any;
    plannedSubAssembliesToMake: number;
    createdSubJobOrders: number;
    qcApprovedSubJobOrders: number;
    issueMaterialsSummary: JobOrderIssueMaterialsSummary;
  }> {
    if (!tenantId) throw new BadRequestException('tenantId is required');
    if (!userId) throw new BadRequestException('userId is required');
    if (!jobOrderId) throw new BadRequestException('jobOrderId is required');

    const resolvedJobOrder = await this.resolveJobOrderIdentity(tenantId, jobOrderId);

    const { data: jobOrder, error: jobOrderError } = await this.supabase
      .from('production_job_orders')
      .select('id, tenant_id, item_id, job_order_number, quantity, start_date, status')
      .eq('tenant_id', tenantId)
      .eq('id', resolvedJobOrder.id)
      .single();

    if (jobOrderError) throw new BadRequestException(jobOrderError.message);
    if (!jobOrder) throw new NotFoundException('Job order not found');

    const status = String(jobOrder.status || '');
    if (status === 'COMPLETED' || status === 'CANCELLED') {
      throw new BadRequestException('Cannot repair/issue materials for a completed/cancelled job order');
    }

    const startDate = this.toStartDate(String((jobOrder as any).start_date || ''));

    // Rebuild Smart JO preview using the *current* BOM expansion logic.
    // This is the key fix for legacy Smart JOs created before BOM-detection improvements.
    const preview = await this.getSmartJobOrderPreview(tenantId, {
      itemId: String((jobOrder as any).item_id || ''),
      quantity: Number((jobOrder as any).quantity || 0),
    });

    const completedSubJobOrders: any[] = [];
    let qcApprovedSubJobOrders = 0;

    const normalizeCode = (value: unknown) => String(value || '').trim().toUpperCase();

    const createCompleteAndQcApprove = async (args: {
      itemId: string;
      itemCode?: string;
      bomId: string;
      quantity: number;
      reason: string;
    }) => {
      this.logger.log('[SmartJO][Repair] Creating sub-assembly');
      this.logger.log(
        JSON.stringify({
          itemId: args.itemId,
          itemCode: args.itemCode,
          bomId: args.bomId,
          quantity: args.quantity,
          forJobOrder: jobOrder.job_order_number,
          reason: args.reason,
        }),
      );

      const created = await this.createFromBOMWithVariantSelections(tenantId, userId, {
        itemId: args.itemId,
        bomId: args.bomId,
        quantity: args.quantity,
        startDate,
        priority: 'NORMAL',
        notes: `Auto-created by Smart JO Repair for ${jobOrder.job_order_number} (${args.reason})`,
      } as any);

      // Ensure status is IN_PROGRESS so completeJobOrder can run.
      await this.supabase
        .from('production_job_orders')
        .update({ status: 'IN_PROGRESS', actual_start_date: new Date().toISOString() })
        .eq('id', created.id);

      const completed = await this.completeJobOrder(tenantId, created.id, userId, {
        allowPartialConsumption: true,
        autoBuildMissingSubAssemblies: true,
      } as any);
      completedSubJobOrders.push(completed);

      // Auto-approve QC to immediately create stock for this sub-assembly.
      const { data: uidRows, error: uidErr } = await this.supabase
        .from('uid_registry')
        .select('uid')
        .eq('tenant_id', tenantId)
        .eq('job_order_id', created.id);

      if (uidErr) throw new BadRequestException(uidErr.message);
      const uids = (uidRows || []).map((r: any) => String(r?.uid || '').trim()).filter(Boolean);
      if (uids.length === 0) {
        throw new BadRequestException(
          `Failed to auto-approve QC during Smart JO repair for ${args.itemCode || args.itemId}: no UIDs found for job order ${created.id}`,
        );
      }

      // SRV-first workflow: create SRV (SYSTEM) before QC release.
      await this.receiveStoreReceiptVoucher(tenantId, created.id, userId, { receiverName: 'SYSTEM' });
      await this.approveQC(tenantId, created.id, uids, [], userId);
      qcApprovedSubJobOrders += 1;
    };

    // Create deeper sub-assemblies first to satisfy nested BOM dependencies.
    const subAssemblyLevelByKey = new Map<string, number>();
    for (const n of (preview.nodes || []) as any[]) {
      if (n?.componentType !== 'BOM') continue;
      const key = `${String(n.bomId)}:${String(n.itemId)}`;
      const lvl = Number(n.level) || 0;
      const existing = subAssemblyLevelByKey.get(key);
      if (existing === undefined || lvl > existing) subAssemblyLevelByKey.set(key, lvl);
    }

    const subAssembliesToMakeAll = ([...(preview.subAssembliesToMake || [])] as any[]).sort((a, b) => {
      const aKey = `${String(a.bomId)}:${String(a.itemId)}`;
      const bKey = `${String(b.bomId)}:${String(b.itemId)}`;
      const aLvl = subAssemblyLevelByKey.get(aKey) ?? 0;
      const bLvl = subAssemblyLevelByKey.get(bKey) ?? 0;
      if (aLvl !== bLvl) return bLvl - aLvl; // deeper first
      return (Number(b.toMakeQuantity) || 0) - (Number(a.toMakeQuantity) || 0);
    });

    const subAssembliesToMake = subAssembliesToMakeAll.filter((sa) => Number(sa?.toMakeQuantity || 0) > 0);

    this.logger.log('[SmartJO][Repair] Planning sub-assembly rebuild');
    this.logger.log(
      JSON.stringify({
        tenantId,
        jobOrderId,
        jobOrderNumber: jobOrder.job_order_number,
        planned: subAssembliesToMake.length,
      }),
    );

    for (const sa of subAssembliesToMake) {
      await createCompleteAndQcApprove({
        itemId: String(sa.itemId),
        itemCode: sa.itemCode,
        bomId: String(sa.bomId),
        quantity: Number(sa.toMakeQuantity),
        reason: 'SMART_PREVIEW',
      });
    }

    // IMPORTANT: Legacy Smart JOs may have been created with user selections (alternate items/variants)
    // that the current preview call doesn't know about. So after preview-based rebuild, we ALSO ensure
    // stock for the *actual pending materials* on the existing job order.
    const { data: joMaterials, error: joMaterialsErr } = await this.supabase
      .from('job_order_materials')
      .select('id, item_id, item_code, required_quantity, issued_quantity, status')
      .eq('job_order_id', resolvedJobOrder.id);

    if (joMaterialsErr) throw new BadRequestException(joMaterialsErr.message);
    const materialsRows = Array.isArray(joMaterials) ? joMaterials : [];
    const pendingMaterials = materialsRows.filter((m: any) => {
      const required = Number(m?.required_quantity) || 0;
      const issued = Number(m?.issued_quantity) || 0;
      return required - issued > 0;
    });

    const pendingCodes = Array.from(
      new Set(
        pendingMaterials
          .map((m: any) => normalizeCode(String(m?.item_code || '')))
          .filter(Boolean),
      ),
    );

    const itemIdByCode = new Map<string, string>();
    if (pendingCodes.length > 0) {
      const { data: itemsByCode } = await this.supabase
        .from('items')
        .select('id, code')
        .eq('tenant_id', tenantId)
        .in('code', pendingCodes);

      (itemsByCode || []).forEach((i: any) => {
        const c = normalizeCode(String(i?.code || ''));
        const id = String(i?.id || '').trim();
        if (c && this.isUuid(id)) itemIdByCode.set(c, id);
      });
    }

    const neededByItemId = new Map<string, { itemId: string; itemCode: string; needed: number }>();
    for (const m of pendingMaterials) {
      const itemCode = normalizeCode(String((m as any)?.item_code || ''));
      let itemId = String((m as any)?.item_id || '').trim();
      if (!this.isUuid(itemId) && itemCode) {
        const resolved = itemIdByCode.get(itemCode);
        if (resolved) itemId = resolved;
      }
      if (!this.isUuid(itemId) || !itemCode) continue;

      const required = Number((m as any)?.required_quantity) || 0;
      const issued = Number((m as any)?.issued_quantity) || 0;
      const needed = Math.max(0, required - issued);
      if (needed <= 0) continue;

      const existing = neededByItemId.get(itemId);
      if (existing) existing.needed += needed;
      else neededByItemId.set(itemId, { itemId, itemCode, needed });
    }

    const targeted = Array.from(neededByItemId.values());
    this.logger.log('[SmartJO][Repair] Ensuring stock for pending BOM materials');
    this.logger.log(
      JSON.stringify({
        tenantId,
        jobOrderId: resolvedJobOrder.id,
        jobOrderNumber: jobOrder.job_order_number,
        pendingMaterialItems: targeted.length,
      }),
    );

    for (const t of targeted) {
      // Match issuing behavior: use stock_entries.available_quantity (not inventory_stock)
      const { data: stockEntries, error: stockErr } = await this.supabase
        .from('stock_entries')
        .select('available_quantity')
        .eq('tenant_id', tenantId)
        .eq('item_id', t.itemId)
        .gt('available_quantity', 0);

      if (stockErr) {
        this.logger.error('[SmartJO][Repair] Failed fetching stock for pending material');
        this.logger.error(JSON.stringify({ tenantId, jobOrderId, itemId: t.itemId, itemCode: t.itemCode, error: stockErr }));
        continue;
      }

      const entries = Array.isArray(stockEntries) ? stockEntries : [];
      const available = entries.reduce((sum: number, e: any) => sum + (Number(e?.available_quantity) || 0), 0);
      const shortage = Math.max(0, (Number(t.needed) || 0) - available);
      if (shortage <= 0) continue;

      const bom = await this.getActiveBomForItem(tenantId, t.itemId);
      if (!bom?.id) {
        this.logger.warn('[SmartJO][Repair] Pending material has no BOM; cannot auto-build');
        this.logger.warn(JSON.stringify({ tenantId, jobOrderId, itemId: t.itemId, itemCode: t.itemCode, needed: t.needed, available }));
        continue;
      }

      await createCompleteAndQcApprove({
        itemId: t.itemId,
        itemCode: t.itemCode,
        bomId: String(bom.id),
        quantity: shortage,
        reason: 'PENDING_MATERIAL_SHORTAGE',
      });
    }

    // Finally, re-issue materials for the existing main job order.
    const issueMaterialsSummary = await this.issueJobOrderMaterials(tenantId, resolvedJobOrder.id);

    return {
      jobOrderId: resolvedJobOrder.id,
      jobOrderNumber: String(jobOrder.job_order_number || ''),
      preview,
      plannedSubAssembliesToMake: subAssembliesToMake.length,
      createdSubJobOrders: completedSubJobOrders.length,
      qcApprovedSubJobOrders,
      issueMaterialsSummary,
    };
  }

  private async normalizeMaterialIds(
    tenantId: string,
    materials: any[],
  ): Promise<any[]> {
    const safeMaterials = Array.isArray(materials) ? materials : [];
    if (safeMaterials.length === 0) return safeMaterials;

    const candidateIds = new Set<string>();
    for (const material of safeMaterials) {
      const itemId = String(material?.itemId || '').trim();
      const selectedVariantId = String(
        material?.selectedVariantId || material?.selected_variant_id || '',
      ).trim();
      if (itemId) candidateIds.add(itemId);
      if (selectedVariantId) candidateIds.add(selectedVariantId);
    }

    const ids = Array.from(candidateIds);
    if (ids.length === 0) return safeMaterials;

    const { data: items } = await this.supabase
      .from('items')
      .select('id')
      .in('id', ids);
    const itemIdSet = new Set((items || []).map((i: any) => i.id));

    const missingIds = ids.filter((id) => !itemIdSet.has(id));
    if (missingIds.length === 0) return safeMaterials;

    const { data: bomHeaders } = await this.supabase
      .from('bom_headers')
      .select('id, item_id')
      .eq('tenant_id', tenantId)
      .in('id', missingIds);

    const headerIdToItemId = new Map<string, string>();
    (bomHeaders || []).forEach((h: any) => {
      if (h?.id && h?.item_id) headerIdToItemId.set(h.id, h.item_id);
    });

    if (headerIdToItemId.size === 0) return safeMaterials;

    return safeMaterials.map((material) => {
      const originalItemId = String(material?.itemId || '').trim();
      const originalVariantId = String(
        material?.selectedVariantId || material?.selected_variant_id || '',
      ).trim();

      const resolvedItemId = headerIdToItemId.get(originalItemId) || originalItemId;
      const resolvedVariantId = headerIdToItemId.get(originalVariantId) || originalVariantId;

      const next: any = { ...material };
      if (resolvedItemId !== originalItemId) next.itemId = resolvedItemId;

      if (originalVariantId) {
        // Preserve existing key style (frontend sends selectedVariantId)
        if ((material as any).selectedVariantId !== undefined) {
          if (resolvedVariantId !== originalVariantId) next.selectedVariantId = resolvedVariantId;
        } else {
          if (resolvedVariantId !== originalVariantId) next.selected_variant_id = resolvedVariantId;
        }
      }

      // If the UI used itemId as a proxy for selectedVariantId, keep them aligned.
      if (originalVariantId && originalVariantId === originalItemId && resolvedItemId !== originalItemId) {
        if ((material as any).selectedVariantId !== undefined) next.selectedVariantId = resolvedItemId;
        else next.selected_variant_id = resolvedItemId;
      }

      return next;
    });
  }

  async create(tenantId: string, userId: string, dto: CreateJobOrderDto) {
    console.log('[JobOrderService] create called - itemId:', dto.itemId, 'quantity:', dto.quantity);
    console.log('[JobOrderService] create - materials:', JSON.stringify(dto.materials, null, 2));
    
    // Get item details
    const { data: item } = await this.supabase
      .from('items')
      .select('code, name')
      .eq('id', dto.itemId)
      .single();

    if (!item) throw new NotFoundException('Item not found');

    const normalizedMaterials = await this.normalizeMaterialIds(tenantId, dto.materials || []);

    // Only enforce material availability if explicitly requested.
    // (For production planning / Smart Job Orders, shortages are expected and should not block creation.)
    if (dto.validateMaterialsOnCreate && normalizedMaterials && normalizedMaterials.length > 0) {
      const availability = await this.checkMaterialAvailability(tenantId, normalizedMaterials, dto.quantity);
      if (!availability.available) {
        throw new BadRequestException(
          `Insufficient materials:\n${availability.shortages
            .map(
              (s) =>
                `${s.itemCode} - ${s.itemName}: Need ${s.required}, Available ${s.available}, Short ${s.shortage}`,
            )
            .join('\n')}`,
        );
      }
    }

    // Create job order
    const { data: jobOrder, error } = await this.supabase
      .from('production_job_orders')
      .insert({
        tenant_id: tenantId,
        item_id: dto.itemId,
        item_code: item.code,
        item_name: item.name,
        bom_id: dto.bomId || null,
        quantity: dto.quantity,
        start_date: dto.startDate,
        end_date: dto.endDate || null,
        sales_order_id: dto.salesOrderId || null,
        sales_order_item_id: dto.salesOrderItemId || null,
        priority: dto.priority || 'NORMAL',
        notes: dto.notes || null,
        created_by: userId,
      })
      .select()
      .single();

    if (error) throw new BadRequestException(error.message);

    // Create operations if provided
    if (dto.operations && dto.operations.length > 0) {
      const operations = await Promise.all(
        dto.operations.map(async (op) => {
          const { data: workstation } = await this.supabase
            .from('workstations')
            .select('name')
            .eq('id', op.workstationId)
            .single();

          let assignedUserName = null;
          if (op.assignedUserId) {
            const { data: user } = await this.supabase
              .from('users')
              .select('full_name')
              .eq('id', op.assignedUserId)
              .single();
            assignedUserName = user?.full_name;
          }

          return {
            job_order_id: jobOrder.id,
            sequence_number: op.sequenceNumber,
            operation_name: op.operationName,
            workstation_id: op.workstationId,
            workstation_name: workstation?.name,
            assigned_user_id: op.assignedUserId || null,
            assigned_user_name: assignedUserName,
            start_datetime: op.startDatetime || null,
            end_datetime: op.endDatetime || null,
            expected_duration_hours: op.expectedDurationHours || 0,
            setup_time_hours: op.setupTimeHours || 0,
            accepted_variation_percent: op.acceptedVariationPercent || 0,
            notes: op.notes || null,
          };
        })
      );

      const { error: opErr } = await this.supabase.from('job_order_operations').insert(operations);
      if (opErr) throw new BadRequestException(opErr.message);
    }

    // Create materials if provided
    if (normalizedMaterials && normalizedMaterials.length > 0) {
      const materials = await Promise.all(
        normalizedMaterials.map(async (mat) => {
          const { data: matItem } = await this.supabase
            .from('items')
            .select('code, name')
            .eq('id', mat.itemId)
            .single();

          if (!matItem?.code || !matItem?.name) {
            throw new BadRequestException(`Material item not found: ${String(mat.itemId)}`);
          }

          let warehouseName = null;
          if (mat.warehouseId) {
            const { data: wh } = await this.supabase
              .from('warehouses')
              .select('name')
              .eq('id', mat.warehouseId)
              .single();
            warehouseName = wh?.name;
          }

          return {
            job_order_id: jobOrder.id,
            item_id: mat.itemId,
            item_code: matItem?.code,
            item_name: matItem?.name,
            required_quantity: mat.requiredQuantity,
            warehouse_id: mat.warehouseId || null,
            warehouse_name: warehouseName,
            selected_variant_id: (mat as any).selectedVariantId || null,
            variant_notes: (mat as any).variantNotes || null,
          };
        })
      );

      const { error: matErr } = await this.supabase.from('job_order_materials').insert(materials);
      if (matErr) throw new BadRequestException(matErr.message);
    }

    return this.findOne(tenantId, jobOrder.id);
  }

  async findAll(tenantId: string, filters?: any) {
    let query = this.supabase
      .from('production_job_orders')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false });

    if (filters?.status) {
      query = query.eq('status', filters.status);
    }

    if (filters?.itemId) {
      query = query.eq('item_id', filters.itemId);
    }

    if (filters?.salesOrderId) {
      query = query.eq('sales_order_id', filters.salesOrderId);
    }

    if (filters?.salesOrderItemId) {
      query = query.eq('sales_order_item_id', filters.salesOrderItemId);
    }

    if (filters?.search) {
      query = query.or(`job_order_number.ilike.%${filters.search}%,item_code.ilike.%${filters.search}%,item_name.ilike.%${filters.search}%`);
    }

    const { data, error } = await query;

    if (error) throw new BadRequestException(error.message);

    const rows = Array.isArray(data) ? data : [];

    // Derive a user-facing workflow status for completed job orders.
    // Rules:
    // - If any UID is ON_HOLD/FAILED => QC Failed
    // - Else if all UIDs are decided (no pending) => QC Completed
    // - Else => Awaiting QC
    const jobOrderIds = rows.map((r: any) => r?.id).filter(Boolean);
    if (jobOrderIds.length === 0) return rows;

    const { data: uidRows, error: uidError } = await this.supabase
      .from('uid_registry')
      .select('job_order_id, quality_status')
      .eq('tenant_id', tenantId)
      .in('job_order_id', jobOrderIds);

    if (uidError) throw new BadRequestException(uidError.message);

    const qcCountsByJobOrderId = new Map<
      string,
      { total: number; passed: number; onHold: number; pending: number }
    >();
    for (const row of Array.isArray(uidRows) ? uidRows : []) {
      const id = String((row as any)?.job_order_id || '').trim();
      if (!id) continue;
      const s = String((row as any)?.quality_status || '').toUpperCase();

      const counts = qcCountsByJobOrderId.get(id) || {
        total: 0,
        passed: 0,
        onHold: 0,
        pending: 0,
      };

      counts.total += 1;
      if (s === 'PASSED') counts.passed += 1;
      else if (s === 'ON_HOLD' || s === 'FAILED') counts.onHold += 1;
      else counts.pending += 1;

      qcCountsByJobOrderId.set(id, counts);
    }

    return rows.map((r: any) => {
      const baseStatus = String(r?.status || '').trim();
      const baseKey = baseStatus.toUpperCase();

      // Default: keep raw status
      let workflowStatus = baseStatus;
      const counts = qcCountsByJobOrderId.get(String(r?.id || '')) || {
        total: 0,
        passed: 0,
        onHold: 0,
        pending: 0,
      };

      if (baseKey === 'COMPLETED') {
        if (counts.onHold > 0) workflowStatus = 'QC Failed';
        else if (counts.total > 0 && counts.pending === 0) workflowStatus = 'QC Completed';
        else workflowStatus = 'Awaiting QC';
      }

      return {
        ...r,
        workflow_status: workflowStatus,
        qc_total_uids: counts.total,
        qc_passed_uids: counts.passed,
        qc_rejected_uids: counts.onHold,
        qc_pending_uids: counts.pending,
      };
    });
  }

  async findOne(tenantId: string, id: string) {
    const { data: jobOrder, error } = await this.supabase
      .from('production_job_orders')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('id', id)
      .single();

    if (error) throw new NotFoundException('Job order not found');

    // Get operations
    const { data: operations } = await this.supabase
      .from('job_order_operations')
      .select('*')
      .eq('job_order_id', id)
      .order('sequence_number', { ascending: true });

    // Get materials
    const { data: materials } = await this.supabase
      .from('job_order_materials')
      .select('*')
      .eq('job_order_id', id);

    return {
      ...jobOrder,
      operations: operations || [],
      materials: materials || [],
    };
  }

  async update(tenantId: string, id: string, dto: UpdateJobOrderDto) {
    const { error } = await this.supabase
      .from('production_job_orders')
      .update(dto)
      .eq('tenant_id', tenantId)
      .eq('id', id);

    if (error) throw new BadRequestException(error.message);

    return this.findOne(tenantId, id);
  }

  async updateStatus(tenantId: string, id: string, status: string) {
    const updates: any = { status };

    if (status === 'IN_PROGRESS') {
      const { data: materialRows, error: materialError } = await this.supabase
        .from('job_order_materials')
        .select('required_quantity, issued_quantity')
        .eq('job_order_id', id);

      if (materialError) throw new BadRequestException(materialError.message);

      const hasPendingMaterials = (materialRows || []).some((m: any) => {
        const required = Number(m?.required_quantity || 0);
        const issued = Number(m?.issued_quantity || 0);
        return issued + 1e-9 < required;
      });

      if (hasPendingMaterials) {
        throw new BadRequestException(
          'SIV pending: materials are not fully assigned yet. Complete SIV (Store Issue Voucher) first from Inventory.',
        );
      }

      updates.actual_start_date = new Date().toISOString();
    } else if (status === 'COMPLETED') {
      updates.actual_end_date = new Date().toISOString();
    }

    const { error } = await this.supabase
      .from('production_job_orders')
      .update(updates)
      .eq('tenant_id', tenantId)
      .eq('id', id);

    if (error) throw new BadRequestException(error.message);

    return this.findOne(tenantId, id);
  }

  async updateOperation(tenantId: string, jobOrderId: string, operationId: string, dto: UpdateOperationDto) {
    // Verify job order belongs to tenant
    const { data: jobOrder } = await this.supabase
      .from('production_job_orders')
      .select('id')
      .eq('tenant_id', tenantId)
      .eq('id', jobOrderId)
      .single();

    if (!jobOrder) throw new NotFoundException('Job order not found');

    const { error } = await this.supabase
      .from('job_order_operations')
      .update(dto)
      .eq('id', operationId)
      .eq('job_order_id', jobOrderId);

    if (error) throw new BadRequestException(error.message);

    return this.findOne(tenantId, jobOrderId);
  }

  async delete(tenantId: string, id: string) {
    const { error } = await this.supabase
      .from('production_job_orders')
      .delete()
      .eq('tenant_id', tenantId)
      .eq('id', id);

    if (error) throw new BadRequestException(error.message);

    return { message: 'Job order deleted successfully' };
  }

  async createFromBOM(
    tenantId: string,
    userId: string,
    itemId: string,
    bomId: string,
    quantity: number,
    startDate: string,
    options?: { autoIssueMaterials?: boolean; autoRepair?: boolean },
  ) {
    // Get BOM details (avoid PostgREST ambiguous embed between bom_headers and bom_items)
    const bom = await this.getBomWithItemsAndRoutingForJobOrder(tenantId, bomId);
    if (!bom) throw new NotFoundException('BOM not found');

    // Create operations from routing
    const operations = (bom.bom_routing || []).map((route: any, idx: number) => ({
      sequenceNumber: route.operation_sequence || (idx + 1) * 10,
      operationName: route.operation_name,
      workstationId: route.workstation_id,
      expectedDurationHours: route.cycle_time || 0,
      setupTimeHours: route.setup_time || 0,
      acceptedVariationPercent: 5, // default 5%
    }));

    // Create materials from BOM items.
    // IMPORTANT: bom_items can represent either:
    // - direct ITEM component via item_id
    // - sub-BOM component via child_bom_id (multi-level BOM)
    // For child_bom_id we consume the sub-assembly item (bom_headers.item_id) at this level.
    const bomItems = Array.isArray(bom.bom_items) ? bom.bom_items : [];

    const childBomIds = Array.from(
      new Set(
        bomItems
          .map((bi: any) => bi?.child_bom_id || bi?.childBomId)
          .filter(Boolean)
          .map((v: any) => String(v)),
      ),
    );

    const childBomIdToItemId = new Map<string, string>();
    if (childBomIds.length > 0) {
      const { data: childBoms, error: childBomsError } = await this.supabase
        .from('bom_headers')
        .select('id, item_id')
        .in('id', childBomIds);
      if (childBomsError) throw new BadRequestException(childBomsError.message);
      for (const cb of childBoms || []) {
        if (cb?.id && cb?.item_id) childBomIdToItemId.set(String(cb.id), String(cb.item_id));
      }
    }

    // Deduplicate by itemId to avoid repeated rows
    const requiredByItemId = new Map<string, number>();
    for (const bi of bomItems) {
      const lineQty = Number(bi?.quantity) || 0;
      if (lineQty <= 0) continue;

      const requiredQuantity = lineQty * Number(quantity);
      const directItemId = bi?.item_id || bi?.itemId;
      const childBomId = bi?.child_bom_id || bi?.childBomId;

      let materialItemId: string | null = null;
      if (directItemId) {
        materialItemId = String(directItemId);
      } else if (childBomId) {
        materialItemId = childBomIdToItemId.get(String(childBomId)) || null;
        if (!materialItemId) {
          console.warn('[JobOrderService] BOM item references child_bom_id but child BOM has no item_id:', {
            bomId,
            bomItemId: bi?.id,
            childBomId,
          });
        }
      } else {
        console.warn('[JobOrderService] Skipping BOM item with neither item_id nor child_bom_id:', {
          bomId,
          bomItemId: bi?.id,
        });
      }

      if (!materialItemId) continue;
      requiredByItemId.set(materialItemId, (requiredByItemId.get(materialItemId) || 0) + requiredQuantity);
    }

    const materials = Array.from(requiredByItemId.entries()).map(([materialItemId, requiredQuantity]) => ({
      itemId: materialItemId,
      requiredQuantity,
    }));

    const created = await this.create(tenantId, userId, {
      itemId,
      bomId,
      quantity,
      startDate,
      operations,
      materials,
    });

    if (options?.autoIssueMaterials !== true) {
      return created;
    }

    const issueMaterialsSummary = await this.issueMaterialsForJobOrder(tenantId, created.id, {
      userId,
      autoRepair: options?.autoRepair,
    });

    return {
      ...created,
      issueMaterialsSummary,
    };
  }

  private async createFromBOMWithVariantSelections(
    tenantId: string,
    userId: string,
    args: {
      itemId: string;
      bomId: string;
      quantity: number;
      startDate: string;
      priority?: string;
      notes?: string;
      salesOrderId?: string;
      salesOrderItemId?: string;
      variantSelections?: Record<string, string>;
      itemSelections?: Record<string, string>;
    },
  ) {
    const bom = await this.getBomWithItemsAndRoutingForJobOrder(tenantId, args.bomId);
    if (!bom) {
      console.error('[JobOrderService] BOM not found - bomId:', args.bomId);
      throw new NotFoundException(`BOM not found for ID: ${args.bomId}`);
    }

    // For multi-level BOMs, bom_items can reference child_bom_id instead of item_id.
    // Resolve those child BOMs to their item_id so job_order_materials never gets null itemIds.
    const childBomIds = Array.from(
      new Set(
        (bom.bom_items || [])
          .map((bi: any) => bi?.child_bom_id || bi?.childBomId)
          .filter(Boolean)
          .map((id: any) => String(id)),
      ),
    );

    const childBomIdToItemId = new Map<string, string>();
    if (childBomIds.length > 0) {
      const { data: childBoms, error: childBomsErr } = await this.supabase
        .from('bom_headers')
        .select('id, item_id')
        .eq('tenant_id', tenantId)
        .in('id', childBomIds);

      if (childBomsErr) throw new BadRequestException(childBomsErr.message);
      (childBoms || []).forEach((cb: any) => {
        if (cb?.id && cb?.item_id) childBomIdToItemId.set(String(cb.id), String(cb.item_id));
      });
    }

    const operations = (bom.bom_routing || []).map((route: any, idx: number) => ({
      sequenceNumber: route.operation_sequence || (idx + 1) * 10,
      operationName: route.operation_name,
      workstationId: route.workstation_id,
      expectedDurationHours: route.cycle_time || 0,
      setupTimeHours: route.setup_time || 0,
      acceptedVariationPercent: 5,
    }));

    const materials = (bom.bom_items || [])
      .map((item: any) => {
        const directItemId = item?.item_id || item?.itemId || null;
        const childBomId = item?.child_bom_id || item?.childBomId || null;

        const baseItemId = directItemId
          ? String(directItemId)
          : childBomId
            ? childBomIdToItemId.get(String(childBomId)) || null
            : null;

        if (!baseItemId) {
          console.warn('[JobOrderService] Skipping BOM item with neither item_id nor resolvable child_bom_id:', {
            bomId: args.bomId,
            bomItemId: item?.id,
            directItemId,
            childBomId,
          });
          return null;
        }

        const selectionKey = `${args.bomId}:${baseItemId}`;

        const selectedItemIdRaw = args.itemSelections?.[selectionKey];
        const selectedItemId = String(selectedItemIdRaw || '').trim();
        const effectiveItemId = selectedItemId ? selectedItemId : baseItemId;

        const selectedVariantIdRaw = args.variantSelections?.[selectionKey];
        const selectedVariantId = String(selectedVariantIdRaw || '').trim();
        const shouldApplyVariant = effectiveItemId === baseItemId;

        return {
          itemId: effectiveItemId,
          requiredQuantity: (Number(item?.quantity) || 0) * args.quantity,
          selectedVariantId:
            shouldApplyVariant && selectedVariantId && selectedVariantId !== baseItemId
              ? selectedVariantId
              : undefined,
        };
      })
      .filter(Boolean);

    return this.create(tenantId, userId, {
      itemId: args.itemId,
      bomId: args.bomId,
      quantity: args.quantity,
      startDate: args.startDate,
      salesOrderId: args.salesOrderId,
      salesOrderItemId: args.salesOrderItemId,
      priority: args.priority || 'NORMAL',
      notes: args.notes,
      operations,
      materials,
    } as any);
  }

  private async checkMaterialAvailability(tenantId: string, materials: any[], jobQuantity: number) {
    console.log('[JobOrderService] checkMaterialAvailability - tenantId:', tenantId);
    console.log('[JobOrderService] checkMaterialAvailability - materials:', JSON.stringify(materials, null, 2));
    console.log('[JobOrderService] checkMaterialAvailability - jobQuantity:', jobQuantity);

    const normalizedMaterials = await this.normalizeMaterialIds(tenantId, materials || []);
    
    const shortages = [];

    for (const material of normalizedMaterials) {
      const required = material.requiredQuantity;  // Don't multiply by jobQuantity - it's already included in requiredQuantity

      const itemIdToCheck = material.selectedVariantId || material.selected_variant_id || material.itemId;
      if (!this.isUuid(String(itemIdToCheck || ''))) {
        throw new BadRequestException(`Invalid material itemId: ${String(itemIdToCheck)}`);
      }
      console.log('[JobOrderService] Checking material - itemIdToCheck:', itemIdToCheck, 'required:', required);

      // IMPORTANT: Use stock_entries-backed summary (same as GET /items/:id/stock)
      // so Job Order validation matches the stock shown across the app.
      const { data, error } = await this.supabase.rpc('get_item_stock_summary', {
        p_item_id: itemIdToCheck,
        p_tenant_id: tenantId,
      });

      console.log('[JobOrderService] Stock check for item:', itemIdToCheck);
      console.log('[JobOrderService] Stock summary found:', data);
      console.log('[JobOrderService] Stock summary query error:', error);

      const summary = Array.isArray(data) && data.length > 0 ? data[0] : null;
      const available = Number(summary?.available_quantity) || 0;
      
      console.log('[JobOrderService] Required:', required, 'Available:', available);

      // Check material availability
      if (available < required) {
        // Fetch item details
        const { data: item, error: itemError } = await this.supabase
          .from('items')
          .select('id, code, name')
          .eq('id', itemIdToCheck)
          .single();

        if (itemError) {
          console.error('[JobOrderService] Error fetching item details for', itemIdToCheck, ':', itemError);
        }

        console.log('[JobOrderService] Item lookup for', itemIdToCheck, '- found:', item, 'error:', itemError);

        // If item doesn't exist, try to get item code/name from other sources
        const itemCode = item?.code || 'Unknown';
        const itemName = item?.name || 'Unknown';
        
        if (!item && itemIdToCheck) {
          console.warn('[JobOrderService] Item not found in items table for ID:', itemIdToCheck);
        }

        shortages.push({
          itemId: itemIdToCheck,
          itemCode: itemCode,
          itemName: itemName,
          required,
          available,
          shortage: required - available,
        });
      }
    }

    console.log('[JobOrderService] Final shortages:', JSON.stringify(shortages, null, 2));
    return {
      available: shortages.length === 0,
      shortages,
    };
  }

  async completeJobOrder(
    tenantId: string,
    jobOrderId: string,
    userId?: string,
    options?: { allowPartialConsumption?: boolean; autoBuildMissingSubAssemblies?: boolean },
  ) {
    // Get job order header first (avoid masking embed/join errors as NotFound)
    const { data: jobOrder, error: jobOrderError } = await this.supabase
      .from('production_job_orders')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('id', jobOrderId)
      .single();

    if (jobOrderError) throw new BadRequestException(jobOrderError.message);
    if (!jobOrder) throw new NotFoundException('Job order not found');

    const { data: materialsRaw, error: materialsError } = await this.supabase
      .from('job_order_materials')
      .select('*')
      .eq('job_order_id', jobOrderId);

    if (materialsError) throw new BadRequestException(materialsError.message);
    jobOrder.job_order_materials = Array.isArray(materialsRaw) ? materialsRaw : [];

    if (jobOrder.status !== 'IN_PROGRESS') {
      throw new BadRequestException('Job order must be IN_PROGRESS to complete');
    }

    const allowPartial = Boolean(options?.allowPartialConsumption);
    const autoBuildMissingSubAssemblies = options?.autoBuildMissingSubAssemblies ?? true;

    console.log('[completeJobOrder] Starting completion', {
      jobOrderId,
      jobOrderNumber: jobOrder.job_order_number,
      status: jobOrder.status,
      materialsCount: (jobOrder.job_order_materials || []).length,
      allowPartial,
      autoBuildMissingSubAssemblies,
    });

    // Normalize legacy/buggy material rows (some historical flows stored bom_header IDs in item_id/selected_variant_id).
    try {
      jobOrder.job_order_materials = await this.normalizeJobOrderMaterialRows(
        tenantId,
        jobOrder.job_order_materials || [],
      );
    } catch (e: any) {
      console.warn('[completeJobOrder] Material normalization failed:', e?.message || e);
    }

    // Auto-build missing sub-assemblies if the job order is blocked by assembly shortages.
    // This runs BEFORE consumption regardless of partial mode (tries to create what's needed first).
    // Only triggers for items that have an active BOM.
    if (autoBuildMissingSubAssemblies) {
      console.log('[completeJobOrder] Auto-build enabled, checking materials for shortages');
      if (!userId) {
        throw new BadRequestException('userId is required to auto-build missing sub-assemblies');
      }

      const startDate = this.toStartDate(String((jobOrder as any)?.start_date || ''));
      const materials = Array.isArray(jobOrder.job_order_materials) ? jobOrder.job_order_materials : [];
      console.log('[completeJobOrder] Materials to check:', materials.length);

      for (const material of materials) {
        const requiredQty = Number(material.required_quantity) || 0;
        const alreadyIssued = Number(material.issued_quantity) || 0;
        const consumeQty = Math.max(0, requiredQty - alreadyIssued);
        if (consumeQty <= 0) {
          console.log('[completeJobOrder] Skipping material (already issued):', material.item_id);
          continue;
        }

        const itemIdToConsume = material.selected_variant_id || material.item_id;
        if (!this.isUuid(String(itemIdToConsume || ''))) {
          console.log('[completeJobOrder] Skipping material (invalid UUID):', itemIdToConsume);
          continue;
        }

        const available = await this.getAvailableStock(tenantId, String(itemIdToConsume));
        const shortage = Math.max(0, consumeQty - available);
        console.log('[completeJobOrder] Material check:', { itemIdToConsume, consumeQty, available, shortage });
        if (shortage <= 0) continue;

        const bom = await this.getActiveBomForItem(tenantId, String(itemIdToConsume));
        if (!bom?.id) {
          console.log('[completeJobOrder] No BOM for item (raw material):', itemIdToConsume);
          continue; // No BOM => raw material; cannot auto-build.
        }

        // Build the missing sub-assembly quantity, complete it, then QC-approve so stock is created.
        const itemBasic = await this.getItemBasic(String(itemIdToConsume));
        console.log('[completeJobOrder] Auto-building missing sub-assembly', {
          jobOrderId,
          jobOrderNumber: jobOrder.job_order_number,
          itemId: itemIdToConsume,
          itemCode: itemBasic?.code,
          shortage,
          bomId: bom.id,
        });

        const created = await this.createFromBOMWithVariantSelections(tenantId, userId, {
          itemId: String(itemIdToConsume),
          bomId: String(bom.id),
          quantity: shortage,
          startDate,
          priority: 'NORMAL',
          notes: `Auto-created during completion of ${jobOrder.job_order_number} (missing sub-assembly)`,
        } as any);

        await this.supabase
          .from('production_job_orders')
          .update({ status: 'IN_PROGRESS', actual_start_date: new Date().toISOString() })
          .eq('id', created.id);

        await this.completeJobOrder(tenantId, created.id, userId, {
          allowPartialConsumption: false,
          autoBuildMissingSubAssemblies: true,
        } as any);

        const { data: uidRows, error: uidErr } = await this.supabase
          .from('uid_registry')
          .select('uid')
          .eq('tenant_id', tenantId)
          .eq('job_order_id', created.id);

        if (uidErr) throw new BadRequestException(uidErr.message);
        const uids = (uidRows || []).map((r: any) => String(r?.uid || '').trim()).filter(Boolean);
        if (uids.length > 0) {
          await this.approveQC(tenantId, created.id, uids, [], userId);
        } else {
          throw new BadRequestException(`Failed to auto-approve QC for sub-assembly ${itemBasic?.code || itemIdToConsume}: no UIDs found`);
        }
      }

      // Re-load materials after auto-build (issued quantities / ids may have changed)
      const { data: refreshed, error: refreshedError } = await this.supabase
        .from('production_job_orders')
        .select('*')
        .eq('tenant_id', tenantId)
        .eq('id', jobOrderId)
        .single();

      if (refreshedError) throw new BadRequestException(refreshedError.message);
      if (refreshed) {
        const { data: refreshedMaterials, error: refreshedMaterialsError } = await this.supabase
          .from('job_order_materials')
          .select('*')
          .eq('job_order_id', jobOrderId);

        if (refreshedMaterialsError) throw new BadRequestException(refreshedMaterialsError.message);
        jobOrder.job_order_materials = Array.isArray(refreshedMaterials) ? refreshedMaterials : [];
      }
    }

    // Start transaction-like operations
    try {
      // 1. Consume materials from inventory (stock_entries)
      for (const material of jobOrder.job_order_materials) {
        const requiredQty = Number(material.required_quantity) || 0;
        const alreadyIssued = Number(material.issued_quantity) || 0;
        const consumeQty = Math.max(0, requiredQty - alreadyIssued);
        if (consumeQty <= 0) {
          // Nothing left to consume for this material.
          continue;
        }

        // Use selected_variant_id if available, otherwise use item_id
        const itemIdToConsume = material.selected_variant_id || material.item_id;
        if (!this.isUuid(String(itemIdToConsume || ''))) {
          if (allowPartial) {
            console.warn('[completeJobOrder] Skipping material with invalid item id (partial consumption mode)');
            continue;
          }
          throw new BadRequestException('Failed to consume material: invalid item id');
        }

        // Get item details
        const { data: item } = await this.supabase
          .from('items')
          .select('code, name, category')
          .eq('id', itemIdToConsume)
          .single();

        // If manual inventory adjustments were done (inventory_stock updated) but stock_entries
        // wasn't, completion would incorrectly fail with "Item not found" or shortages.
        await this.ensureStockEntriesAtLeastInventoryAvailable(tenantId, String(itemIdToConsume));

        // Get available stock entries for this material (use variant if selected)
        const { data: stockEntries } = await this.supabase
          .from('stock_entries')
          .select('*')
          .eq('tenant_id', tenantId)
          .eq('item_id', itemIdToConsume)
          .gt('available_quantity', 0)
          .order('created_at', { ascending: true });

        if (!stockEntries || stockEntries.length === 0) {
          if (allowPartial) {
            console.warn(`[completeJobOrder] Skipping material ${item?.code}: not found in inventory (partial consumption mode)`);
            continue;
          }
          throw new BadRequestException(`Failed to consume ${item?.code}: Item not found in inventory`);
        }

        // Calculate total available
        const totalAvailable = stockEntries.reduce(
          (sum, entry) => sum + parseFloat(entry.available_quantity.toString()),
          0,
        );

        if (totalAvailable < consumeQty) {
          if (allowPartial) {
            console.warn(`[completeJobOrder] Partial consumption for ${item?.code}: need ${consumeQty}, have ${totalAvailable}`);
            // Will consume what's available below
          } else {
            throw new BadRequestException(
              `Failed to consume ${item?.code}: Insufficient stock. Need ${consumeQty}, have ${totalAvailable}`,
            );
          }
        }

        // Consume from stock entries using FIFO
        let remainingToConsume = consumeQty;
        for (const entry of stockEntries) {
          if (remainingToConsume <= 0) break;

          const entryAvailable = parseFloat(entry.available_quantity.toString());
          const toConsumeFromEntry = Math.min(entryAvailable, remainingToConsume);
          const newAvailable = entryAvailable - toConsumeFromEntry;

          const { error: updateError } = await this.supabase
            .from('stock_entries')
            .update({
              available_quantity: newAvailable,
              updated_at: new Date().toISOString(),
            })
            .eq('id', entry.id);

          if (updateError) {
            console.error('Error updating stock entry:', updateError);
            throw new BadRequestException(`Failed to consume ${item?.code}: ${updateError.message}`);
          }

          // Keep inventory_stock consistent with stock_entries.
          const warehouseId = String((entry as any)?.warehouse_id || '').trim();
          if (warehouseId && this.isUuid(warehouseId)) {
            const { error: invError } = await this.supabase.rpc('adjust_inventory_stock', {
              p_tenant_id: tenantId,
              p_item_id: itemIdToConsume,
              p_warehouse_id: warehouseId,
              p_location_id: null,
              p_quantity_change: -toConsumeFromEntry,
              p_category: normalizeInventoryCategory((item as any)?.category, 'RAW_MATERIAL'),
            });

            if (invError) {
              console.error('Error syncing inventory_stock after consumption:', invError);
              throw new BadRequestException(`Failed to sync inventory stock: ${invError.message}`);
            }
          }

          remainingToConsume -= toConsumeFromEntry;
        }

        const actuallyConsumed = Math.max(0, consumeQty - remainingToConsume);
        if (actuallyConsumed <= 0) {
          if (allowPartial) {
            continue;
          }
          throw new BadRequestException(`Failed to consume ${item?.code}: Unable to consume from stock`);
        }

        // Update material issued quantity (accurate for partial consumption)
        const nextIssued = alreadyIssued + actuallyConsumed;
        const nextStatus = nextIssued >= requiredQty ? 'ISSUED' : 'PARTIAL';
        await this.supabase
          .from('job_order_materials')
          .update({
            issued_quantity: nextIssued,
            status: nextStatus,
          })
          .eq('id', material.id);
      }

      // 2. Add finished goods to inventory (create new stock entry)
      // Get a warehouse - try to find default or use first available
      const { data: warehouses } = await this.supabase
        .from('warehouses')
        .select('id')
        .eq('tenant_id', tenantId)
        .limit(1);

      if (!warehouses || warehouses.length === 0) {
        throw new BadRequestException('No warehouse configured. Please create a warehouse first.');
      }

      const warehouseId = warehouses[0].id;

      // Get finished item details for UID generation
      const { data: finishedItem } = await this.supabase
        .from('items')
        .select('id, code, name, category')
        .eq('id', jobOrder.item_id)
        .single();

      if (!finishedItem) {
        throw new BadRequestException('Finished item not found');
      }

      // 3. Generate UIDs for finished goods (idempotent)
      // NOTE: Stock will NOT be added until QC approval
      const quantityProduced = Math.max(0, Number(jobOrder.quantity) || 0);
      const { count: existingUidCount, error: uidCountError } = await this.supabase
        .from('uid_registry')
        .select('uid', { count: 'exact', head: true })
        .eq('tenant_id', tenantId)
        .eq('job_order_id', jobOrderId);

      if (uidCountError) throw new BadRequestException(uidCountError.message);

      const have = Math.max(0, Number(existingUidCount) || 0);
      if (have > quantityProduced) {
        throw new BadRequestException(
          `Job order already has ${have} UID(s), which exceeds planned quantity ${quantityProduced}.`,
        );
      }

      const missing = Math.max(0, quantityProduced - have);
      const uidsCreated = missing > 0
        ? await this.generateJobOrderUids(
            tenantId,
            userId,
            jobOrder,
            finishedItem,
            missing,
            'COMPLETE',
          )
        : [];

      if (uidsCreated.length !== missing) {
        throw new BadRequestException(
          `Failed to generate UIDs for this job order. Needed ${missing}, created ${uidsCreated.length}.`,
        );
      }

      console.log(`[JobOrder] Generated ${uidsCreated.length} UIDs (status=GENERATED, quality_status=PENDING) for job order ${jobOrder.job_order_number}`);
      console.log(`[JobOrder] Stock will be added ONLY after QC approval via approveQC endpoint`);

      // DO NOT add stock_entries here - will be added after QC approval

      // 3. Update job order status
      const { error: updateError } = await this.supabase
        .from('production_job_orders')
        .update({
          status: 'COMPLETED',
          actual_end_date: new Date().toISOString(),
          completed_quantity: jobOrder.quantity,
        })
        .eq('id', jobOrderId);

      if (updateError) throw new BadRequestException(updateError.message);

      return this.findOne(tenantId, jobOrderId);
    } catch (error) {
      console.error('Error completing job order:', error);
      throw error;
    }
  }

  async approveQC(
    tenantId: string, 
    jobOrderId: string, 
    approvedUids: string[], 
    rejectedUids: string[], 
    userId?: string
  ) {
    // Validate job order exists and is completed
    const { data: jobOrder } = await this.supabase
      .from('production_job_orders')
      .select('*, finished_item:items!production_job_orders_item_id_fkey(id, code, name)')
      .eq('tenant_id', tenantId)
      .eq('id', jobOrderId)
      .single();

    if (!jobOrder) throw new NotFoundException('Job order not found');
    if (jobOrder.status !== 'COMPLETED') {
      throw new BadRequestException('Job order must be COMPLETED before QC approval');
    }

    // Get all UIDs for this job order
    const { data: allUids, error: allUidsError } = await this.supabase
      .from('uid_registry')
      .select('uid, lifecycle, metadata')
      .eq('tenant_id', tenantId)
      .eq('job_order_id', jobOrderId);

    if (allUidsError) throw new BadRequestException(allUidsError.message);
    if (!allUids || allUids.length === 0) throw new BadRequestException('No UIDs found for this job order');

    const totalUids = allUids.length;
    const providedCount = approvedUids.length + rejectedUids.length;

    if (providedCount !== totalUids) {
      throw new BadRequestException(
        `Total UIDs mismatch. Job order has ${totalUids} UIDs, but ${providedCount} were provided for QC`
      );
    }

    try {
      // SRV must be completed before QC (GRN-like flow)
      const { data: existingReceipts, error: receiptError } = await this.supabase
        .from('stock_entries')
        .select('id, quantity, available_quantity, warehouse_id, metadata')
        .eq('tenant_id', tenantId)
        .eq('metadata->>created_from', 'STORE_RECEIPT')
        .eq('metadata->>job_order_id', jobOrderId)
        .order('created_at', { ascending: false })
        .limit(1);

      if (receiptError) throw new BadRequestException(receiptError.message);
      const receiptEntry = Array.isArray(existingReceipts) ? existingReceipts[0] : null;
      if (!receiptEntry) {
        throw new BadRequestException('SRV pending: please complete SRV (Store Receipt Voucher) before QC.');
      }

      const receivedUids = Array.isArray((receiptEntry as any)?.metadata?.received_uids)
        ? ((receiptEntry as any).metadata.received_uids as any[]).map((u) => String(u || '').trim()).filter(Boolean)
        : [];

      // Enforce full receipt for the job order before QC.
      if (receivedUids.length !== totalUids) {
        throw new BadRequestException(
          `SRV pending: ${Math.max(0, totalUids - receivedUids.length)} unit(s) not received in SRV yet. Complete SRV first, then QC.`,
        );
      }

      const alreadyApprovedUidSet = new Set<string>();
      const approvedList = (receiptEntry as any)?.metadata?.approved_uids;
      if (Array.isArray(approvedList)) {
        for (const u of approvedList) {
          const s = String(u || '').trim();
          if (s) alreadyApprovedUidSet.add(s);
        }
      }

      const newlyApprovedUids = (approvedUids || []).filter((u) => !alreadyApprovedUidSet.has(String(u || '').trim()));

      // 1. Update approved UIDs
      if (approvedUids.length > 0) {
        for (const uid of approvedUids) {
          const { data: existing } = await this.supabase
            .from('uid_registry')
            .select('lifecycle, metadata')
            .eq('uid', uid)
            .single();

          const currentLifecycle = existing?.lifecycle ? JSON.parse(existing.lifecycle) : [];
          const currentMetadata = existing?.metadata ? JSON.parse(existing.metadata) : {};

          await this.supabase
            .from('uid_registry')
            .update({
              status: 'QC_APPROVED',
              quality_status: 'PASSED',
              location: 'Warehouse',
              lifecycle: JSON.stringify([
                ...currentLifecycle,
                {
                  stage: 'QC_APPROVED',
                  timestamp: new Date().toISOString(),
                  location: 'QC',
                  reference: 'Quality Control Passed',
                  user: userId,
                },
              ]),
              metadata: JSON.stringify({
                ...currentMetadata,
                qc_status: 'APPROVED',
                qc_approved_at: new Date().toISOString(),
                qc_approved_by: userId,
              }),
            })
            .eq('uid', uid);
        }
      }

      // 2. Update rejected UIDs
      if (rejectedUids.length > 0) {
        for (const uid of rejectedUids) {
          const { data: existing } = await this.supabase
            .from('uid_registry')
            .select('lifecycle, metadata')
            .eq('uid', uid)
            .single();

          const currentLifecycle = existing?.lifecycle ? JSON.parse(existing.lifecycle) : [];
          const currentMetadata = existing?.metadata ? JSON.parse(existing.metadata) : {};

          await this.supabase
            .from('uid_registry')
            .update({
              status: 'QC_REJECTED',
              quality_status: 'FAILED',
              location: 'Rework/Scrap',
              lifecycle: JSON.stringify([
                ...currentLifecycle,
                {
                  stage: 'QC_REJECTED',
                  timestamp: new Date().toISOString(),
                  location: 'QC',
                  reference: 'Quality Control Failed',
                  user: userId,
                },
              ]),
              metadata: JSON.stringify({
                ...currentMetadata,
                qc_status: 'REJECTED',
                qc_rejected_at: new Date().toISOString(),
                qc_rejected_by: userId,
              }),
            })
            .eq('uid', uid);
        }
      }

      // 3. Release approved quantity to stock from the STORE_RECEIPT entry
      const existingAvailable = Number((receiptEntry as any)?.available_quantity) || 0;
      const receiptQty = Number((receiptEntry as any)?.quantity) || 0;
      const deltaToRelease = newlyApprovedUids.length;
      const nextAvailable = Math.min(receiptQty, existingAvailable + deltaToRelease);

      const mergedApproved = Array.from(
        new Set([
          ...Array.from(alreadyApprovedUidSet),
          ...newlyApprovedUids.map((u) => String(u || '').trim()).filter(Boolean),
        ]),
      );

      const { error: receiptUpdateErr } = await this.supabase
        .from('stock_entries')
        .update({
          available_quantity: nextAvailable,
          metadata: {
            ...(receiptEntry as any)?.metadata,
            approved_uids: mergedApproved,
            qc_released_at: new Date().toISOString(),
            qc_released_by: userId || null,
          },
        })
        .eq('tenant_id', tenantId)
        .eq('id', (receiptEntry as any)?.id);

      if (receiptUpdateErr) throw new BadRequestException(receiptUpdateErr.message);

      // Sync inventory_stock only for newly released (approved) units
      if (deltaToRelease > 0) {
        const warehouseId = String((receiptEntry as any)?.warehouse_id || '').trim();
        if (!warehouseId || !this.isUuid(warehouseId)) {
          throw new BadRequestException('Warehouse not set on SRV entry');
        }

        const { data: itemRow, error: itemErr } = await this.supabase
          .from('items')
          .select('category')
          .eq('tenant_id', tenantId)
          .eq('id', jobOrder.item_id)
          .single();

        if (itemErr) throw new BadRequestException(itemErr.message);

        const { error: invError } = await this.supabase.rpc('adjust_inventory_stock', {
          p_tenant_id: tenantId,
          p_item_id: jobOrder.item_id,
          p_warehouse_id: warehouseId,
          p_location_id: null,
          p_quantity_change: deltaToRelease,
          p_category: normalizeInventoryCategory(itemRow?.category, 'FINISHED_GOODS'),
        });

        if (invError) throw new BadRequestException(invError.message);
      }

      console.log(`[QC Approval] Job Order ${jobOrder.job_order_number}: ${approvedUids.length} approved, ${rejectedUids.length} rejected`);
      console.log(`[QC Approval] Released ${newlyApprovedUids.length} newly approved unit(s) to stock from SRV receipt`);

      return {
        jobOrderId,
        jobOrderNumber: jobOrder.job_order_number,
        itemId: jobOrder.item_id,
        itemCode: jobOrder.item_code,
        itemName: jobOrder.item_name,
        totalProduced: totalUids,
        qcApproved: approvedUids.length,
        qcRejected: rejectedUids.length,
        stockAdded: newlyApprovedUids.length,
        pendingStoreReceipt: 0,
        newlyApproved: newlyApprovedUids.length,
        message:
          newlyApprovedUids.length > 0
            ? `QC Complete: ${newlyApprovedUids.length} unit(s) released to stock.`
            : `QC already applied: no new units to release.`,
      };
    } catch (error) {
      console.error('Error during QC approval:', error);
      throw error;
    }
  }

  async getOpenMaterialRequisitions(tenantId: string) {
    const { data: jobOrders, error: jobOrderError } = await this.supabase
      .from('production_job_orders')
      .select('id, job_order_number, item_id, item_code, item_name, quantity, status, start_date, created_at')
      .eq('tenant_id', tenantId)
      .neq('status', 'COMPLETED')
      .neq('status', 'CANCELLED')
      .order('created_at', { ascending: false })
      .limit(200);

    if (jobOrderError) throw new BadRequestException(jobOrderError.message);

    const ids = (jobOrders || []).map((j: any) => String(j.id)).filter(Boolean);
    if (ids.length === 0) return [];

    const { data: materials, error: materialsError } = await this.supabase
      .from('job_order_materials')
      .select('id, job_order_id, item_id, item_code, item_name, required_quantity, issued_quantity, status')
      .in('job_order_id', ids);

    if (materialsError) throw new BadRequestException(materialsError.message);

    const byJob = new Map<string, any[]>();
    for (const row of materials || []) {
      const key = String((row as any)?.job_order_id || '').trim();
      if (!key) continue;
      if (!byJob.has(key)) byJob.set(key, []);
      byJob.get(key)!.push(row);
    }

    return (jobOrders || [])
      .map((jo: any) => {
        const rows = byJob.get(String(jo.id)) || [];
        const requiredQuantity = rows.reduce((sum, r: any) => sum + (Number(r?.required_quantity) || 0), 0);
        const issuedQuantity = rows.reduce((sum, r: any) => sum + (Number(r?.issued_quantity) || 0), 0);
        const pendingLines = rows.filter((r: any) => (Number(r?.issued_quantity) || 0) + 1e-9 < (Number(r?.required_quantity) || 0)).length;
        return {
          ...jo,
          requisitionStatus: pendingLines > 0 ? 'OPEN' : 'ISSUED',
          requiredQuantity,
          issuedQuantity,
          pendingQuantity: Math.max(0, requiredQuantity - issuedQuantity),
          pendingLines,
          materialLines: rows.map((line: any) => {
            const required = Number(line?.required_quantity) || 0;
            const issued = Number(line?.issued_quantity) || 0;
            return {
              ...line,
              pending_quantity: Math.max(0, required - issued),
            };
          }),
        };
      })
      .filter((row) => row.pendingLines > 0);
  }

  async issueMaterialRequisition(tenantId: string, jobOrderId: string, userId?: string) {
    const summary = await this.issueMaterialsForJobOrder(tenantId, jobOrderId, {
      userId,
      autoRepair: true,
    });

    const updated = await this.findOne(tenantId, jobOrderId);
    return {
      jobOrder: updated,
      summary,
    };
  }

  async issueMaterialRequisitionLine(
    tenantId: string,
    jobOrderId: string,
    materialId: string,
    issueQuantity: number,
    uids?: string[],
    userId?: string,
  ) {
    // Master try-catch for detailed error reporting (v2026-02-17-v5)
    try {
      const formatSupabaseError = (err: any, location: string) => {
        const message = String(err?.message || '').trim();
        const details = String(err?.details || '').trim();
        const hint = String(err?.hint || '').trim();
        const code = String(err?.code || '').trim();
        const parts = [message, details, hint].filter(Boolean);
        const joined = parts.join(' | ');
        const base = code ? `${joined}${joined ? ` (code=${code})` : `code=${code}`}` : joined;
        // CRITICAL: Never return empty string - NestJS treats falsy as generic "Bad Request"
        return base || `Supabase error at ${location} (raw: ${JSON.stringify(err)})`;
      };

      if (!tenantId) throw new BadRequestException('tenantId is required');
    if (!jobOrderId) throw new BadRequestException('jobOrderId is required');
    if (!materialId) throw new BadRequestException('materialId is required');

    const requestedIssueQty = Number(issueQuantity);
    if (!Number.isFinite(requestedIssueQty) || requestedIssueQty <= 0) {
      throw new BadRequestException('issueQuantity must be greater than 0');
    }

    const normalizedUids = Array.from(
      new Set(
        (Array.isArray(uids) ? uids : [])
          .map((u) => String(u || '').trim())
          .filter(Boolean),
      ),
    );

    const resolvedJobOrder = await this.resolveJobOrderIdentity(tenantId, jobOrderId);
    const targetJobOrderId = resolvedJobOrder.id;

    const { data: jobOrder, error: jobError } = await this.supabase
      .from('production_job_orders')
      .select('id, tenant_id, status, job_order_number')
      .eq('tenant_id', tenantId)
      .eq('id', targetJobOrderId)
      .single();

    this.logger.log(`[SIV v5] STEP-1: Fetched job order for tenant=${tenantId}, jobOrderId=${targetJobOrderId}, error=${!!jobError}`);
    if (jobError) throw new BadRequestException(formatSupabaseError(jobError, 'STEP-1:job_order_lookup'));
    if (!jobOrder) throw new NotFoundException('Job order not found');

    const status = String((jobOrder as any)?.status || '');
    if (status === 'COMPLETED' || status === 'CANCELLED') {
      throw new BadRequestException('Cannot issue materials for a completed/cancelled job order');
    }

    const { data: material, error: materialError } = await this.supabase
      .from('job_order_materials')
      .select('id, job_order_id, item_id, selected_variant_id, item_code, item_name, required_quantity, issued_quantity, status')
      .eq('id', materialId)
      .eq('job_order_id', targetJobOrderId)
      .maybeSingle();

    this.logger.log(`[SIV v5] STEP-2: Fetched material for materialId=${materialId}, jobOrderId=${targetJobOrderId}, error=${!!materialError}, found=${!!material}`);
    if (materialError) throw new BadRequestException(formatSupabaseError(materialError, 'STEP-2:material_lookup'));
    if (!material) throw new NotFoundException('Material line not found for this job order');

    const requiredQty = Number((material as any)?.required_quantity) || 0;
    const alreadyIssued = Number((material as any)?.issued_quantity) || 0;
    const pendingQty = Math.max(0, requiredQty - alreadyIssued);

    if (pendingQty <= 0) {
      return {
        jobOrderId: targetJobOrderId,
        jobOrderNumber: (jobOrder as any)?.job_order_number,
        materialId,
        requestedIssueQty,
        issuedNow: 0,
        totalIssued: alreadyIssued,
        pendingQuantity: 0,
        materialStatus: 'ISSUED',
        message: 'This material line is already fully issued',
      };
    }

    let itemIdToConsume =
      String((material as any)?.selected_variant_id || '').trim() ||
      String((material as any)?.item_id || '').trim();

    if (!this.isUuid(itemIdToConsume)) {
      const code = String((material as any)?.item_code || '').trim();
      if (code) {
        const { data: itemByCode, error: itemByCodeError } = await this.supabase
          .from('items')
          .select('id, code')
          .eq('tenant_id', tenantId)
          .ilike('code', code)
          .limit(1);

        if (itemByCodeError) throw new BadRequestException(formatSupabaseError(itemByCodeError, 'STEP-3a:item_code_lookup'));
        const row = Array.isArray(itemByCode) ? itemByCode[0] : null;
        if (row?.id) {
          itemIdToConsume = String(row.id);
          await this.supabase
            .from('job_order_materials')
            .update({ item_id: itemIdToConsume })
            .eq('id', materialId);
        }
      }
    }

    if (!this.isUuid(itemIdToConsume)) {
      throw new BadRequestException('Material line has invalid item mapping; cannot issue quantity');
    }

    this.logger.log(`[SIV v5] STEP-3: Looking up item: itemIdToConsume=${itemIdToConsume}, tenantId=${tenantId}`);
    const { data: item, error: itemError } = await this.supabase
      .from('items')
      .select('code, name, category, uid_tracking, uid_strategy, batch_uom, batch_quantity')
      .eq('tenant_id', tenantId)
      .eq('id', itemIdToConsume)
      .single();

    if (itemError) throw new BadRequestException(formatSupabaseError(itemError, `STEP-3:item_lookup(itemId=${itemIdToConsume})`));

    // Some legacy/manual flows update only inventory_stock (not stock_entries).
    // Reconcile so FIFO issuing doesn't fail with "No stock available" while stock exists.
    this.logger.log(`[SIV v5] STEP-4: Reconciling stock entries for item=${itemIdToConsume}`);
    await this.ensureStockEntriesAtLeastInventoryAvailable(tenantId, String(itemIdToConsume));
    this.logger.log(`[SIV v5] STEP-4: Reconciliation complete`);

    // UID policy comes from Item Master.
    const uidTrackingEnabled = (item as any)?.uid_tracking === true && String((item as any)?.uid_strategy || '').toUpperCase() !== 'NONE';
    const uidStrategy = String((item as any)?.uid_strategy || (uidTrackingEnabled ? 'SERIALIZED' : 'NONE')).toUpperCase();
    const rawBatchQty = Number((item as any)?.batch_quantity);
    const qtyPerUid = uidStrategy === 'BATCHED' ? (Number.isFinite(rawBatchQty) && rawBatchQty > 0 ? rawBatchQty : NaN) : 1;

    if (uidTrackingEnabled && uidStrategy === 'BATCHED' && !Number.isFinite(qtyPerUid)) {
      throw new BadRequestException('Item UID strategy is BATCHED but batch_quantity is missing/invalid in Item Master');
    }

    // If UID tracking is enabled, UIDs are compulsory for issuing (otherwise traceability breaks).
    // If UID tracking is disabled, UIDs are optional; if user provided them, we will validate them.
    const requiresUidMapping = uidTrackingEnabled || normalizedUids.length > 0;

    if (uidTrackingEnabled && normalizedUids.length === 0) {
      throw new BadRequestException('This item requires UID mapping. Please scan UIDs before issuing.');
    }

    const issueQtyFromUids = normalizedUids.length > 0 ? normalizedUids.length * qtyPerUid : 0;

    if (normalizedUids.length > 0 && Math.abs(issueQtyFromUids - requestedIssueQty) > 1e-9) {
      const extra = uidStrategy === 'BATCHED' ? ` (batch_quantity=${qtyPerUid})` : '';
      throw new BadRequestException(`issueQuantity must match scanned UIDs${extra}`);
    }

    if (normalizedUids.length > 0 && issueQtyFromUids - pendingQty > 1e-9) {
      throw new BadRequestException('Scanned UID quantity exceeds pending quantity for this material line');
    }

    const issueTargetQty = normalizedUids.length > 0 ? issueQtyFromUids : Math.min(requestedIssueQty, pendingQty);

    if (requiresUidMapping) {
      // Validate scanned UIDs exist, match item, and are ACTIVE
      const { data: uidRows, error: uidErr } = await this.supabase
        .from('uid_registry')
        .select('uid, status, location, entity_id, entity_type, lifecycle, metadata')
        .eq('tenant_id', tenantId)
        .in('uid', normalizedUids);

      if (uidErr) throw new BadRequestException(formatSupabaseError(uidErr, 'STEP-5a:uid_registry_select'));

      const byUid = new Map<string, any>();
      for (const row of uidRows || []) {
        const uid = String((row as any)?.uid || '').trim();
        if (uid) byUid.set(uid, row);
      }

      const missing = normalizedUids.filter((u) => !byUid.has(u));
      if (missing.length > 0) {
        throw new BadRequestException(`Unknown UID(s): ${missing.slice(0, 5).join(', ')}${missing.length > 5 ? '…' : ''}`);
      }

      for (const uid of normalizedUids) {
        const row = byUid.get(uid);
        const status = String((row as any)?.status || '').trim();
        const entityId = String((row as any)?.entity_id || '').trim();

        if (status !== 'ACTIVE') {
          throw new BadRequestException(`UID ${uid} is not ACTIVE (status=${status || 'N/A'})`);
        }
        if (entityId !== itemIdToConsume) {
          throw new BadRequestException(`UID ${uid} does not belong to the selected item`);
        }
      }
    }

    const { data: stockEntries, error: stockError } = await this.supabase
      .from('stock_entries')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('item_id', itemIdToConsume)
      .gt('available_quantity', 0)
      .order('created_at', { ascending: true });

    this.logger.log(`[SIV v5] STEP-6: Stock query for item=${itemIdToConsume}: entries=${Array.isArray(stockEntries) ? stockEntries.length : 'null'}, error=${!!stockError}`);
    if (stockError) throw new BadRequestException(formatSupabaseError(stockError, 'STEP-6:stock_entries_query'));

    const safeEntries = Array.isArray(stockEntries) ? stockEntries : [];
    const uidWarehouseId = requiresUidMapping
      ? String((safeEntries[0] as any)?.warehouse_id || '').trim()
      : '';

    const relevantEntries = requiresUidMapping && uidWarehouseId
      ? safeEntries.filter((e: any) => String(e?.warehouse_id || '').trim() === uidWarehouseId)
      : safeEntries;

    const totalAvailable = relevantEntries.reduce(
      (sum, entry: any) => sum + (Number(entry?.available_quantity) || 0),
      0,
    );

    // If UIDs are involved, do not allow partial issuing; it would consume FIFO but not map all scanned UIDs.
    if (requiresUidMapping && totalAvailable + 1e-9 < issueTargetQty) {
      throw new BadRequestException(
        `Insufficient stock to issue scanned UIDs. Required=${issueTargetQty}, available=${totalAvailable}`,
      );
    }
    const issueNow = Math.max(0, Math.min(issueTargetQty, totalAvailable));

    if (issueNow <= 0) {
      this.logger.warn(`[SIV v5] STEP-6a: NO STOCK! item=${itemIdToConsume}, totalAvailable=${totalAvailable}, issueTargetQty=${issueTargetQty}, entriesCount=${relevantEntries.length}`);
      throw new BadRequestException(
        `No stock available to issue for this material line. Item=${itemIdToConsume}, available=${totalAvailable}, required=${issueTargetQty}, entries=${relevantEntries.length}`,
      );
    }

    let remainingToConsume = issueNow;
    for (const entry of relevantEntries) {
      if (remainingToConsume <= 0) break;

      const entryAvailable = Number((entry as any)?.available_quantity) || 0;
      const toConsumeFromEntry = Math.min(entryAvailable, remainingToConsume);
      if (toConsumeFromEntry <= 0) continue;

      const newAvailable = entryAvailable - toConsumeFromEntry;

      const { error: updateError } = await this.supabase
        .from('stock_entries')
        .update({
          available_quantity: newAvailable,
          updated_at: new Date().toISOString(),
        })
        .eq('id', (entry as any)?.id);

      if (updateError) throw new BadRequestException(formatSupabaseError(updateError, `STEP-7:stock_entry_update(entryId=${(entry as any)?.id})`));

      const warehouseId = String((entry as any)?.warehouse_id || '').trim();
      
      // Enhanced diagnostic logging for warehouse validation (v2026-02-16-v3)
      this.logger.log(`[SIV DEBUG v2026-02-16-v3] Processing stock entry: entryId=${(entry as any)?.id}, warehouseId="${warehouseId}", isValidUuid=${this.isUuid(warehouseId)}, itemId=${itemIdToConsume}, qty=${toConsumeFromEntry}`);
      
      if (!warehouseId) {
        throw new BadRequestException(`Stock entry ${(entry as any)?.id} has no warehouse_id. Cannot adjust inventory. Entry data: ${JSON.stringify(entry)}`);
      }
      
      if (!this.isUuid(warehouseId)) {
        throw new BadRequestException(`Stock entry ${(entry as any)?.id} has invalid warehouse_id: "${warehouseId}". Must be a valid UUID.`);
      }
      
      if (warehouseId && this.isUuid(warehouseId)) {
        try {
          await this.adjustInventoryStockWithFallback({
            tenantId,
            itemId: itemIdToConsume,
            warehouseId,
            locationId: null,
            quantityChange: -toConsumeFromEntry,
            category: normalizeInventoryCategory((item as any)?.category, 'RAW_MATERIAL'),
            context: {
              source: 'SIV_ISSUE_LINE',
              jobOrderId: targetJobOrderId,
              jobOrderNumber: String((jobOrder as any)?.job_order_number || '').trim(),
              materialId,
              stockEntryId: String((entry as any)?.id || '').trim(),
            },
          });
        } catch (err: any) {
          // Enhanced error context (v2026-02-16-v3)
          this.logger.error(`[SIV ERROR v2026-02-16-v3] adjust_inventory_stock failed: ${err?.message}. Entry: ${(entry as any)?.id}, Warehouse: ${warehouseId}, Item: ${itemIdToConsume}`);
          
          // Roll back stock_entries update so we don't partially consume FIFO without updating inventory_stock.
          await this.supabase
            .from('stock_entries')
            .update({
              available_quantity: entryAvailable,
              updated_at: new Date().toISOString(),
            })
            .eq('id', (entry as any)?.id);
          throw err;
        }
      }

      // Audit trail handled below (one-per-uid if UID mapped; otherwise per chunk).
      if (!requiresUidMapping) {
        const movedBy = String(userId || '').trim();
        if (movedBy && this.isUuid(movedBy)) {
          const movementNumber = await this.generateMovementNumber(tenantId, 'PRODUCTION_ISSUE');
          const { error: auditError } = await this.supabase
            .from('stock_movements')
            .insert({
              tenant_id: tenantId,
              movement_number: movementNumber,
              movement_type: 'PRODUCTION_ISSUE',
              item_id: itemIdToConsume,
              from_warehouse_id: warehouseId && this.isUuid(warehouseId) ? warehouseId : null,
              quantity: toConsumeFromEntry,
              reference_type: 'SIV',
              reference_id: targetJobOrderId,
              reference_number: String((jobOrder as any)?.job_order_number || ''),
              notes: `SIV: Issued ${toConsumeFromEntry} of ${String((material as any)?.item_code || '').trim()} (${String((material as any)?.item_name || '').trim()}) for ${String((jobOrder as any)?.job_order_number || '').trim()} (material_id=${materialId})`,
              moved_by: movedBy,
              movement_date: new Date().toISOString(),
            } as any);

          if (auditError) {
            this.logger.error('[SIV] Failed inserting stock_movements audit row (issueMaterialRequisitionLine)');
            this.logger.error(
              JSON.stringify({
                tenantId,
                jobOrderId: targetJobOrderId,
                materialId,
                itemIdToConsume,
                consumed: toConsumeFromEntry,
                movedBy,
                error: auditError,
              }),
            );
          }
        }
      }

      remainingToConsume -= toConsumeFromEntry;
    }

    const issuedNow = Math.max(0, issueNow - remainingToConsume);

    if (requiresUidMapping) {
      const movedBy = String(userId || '').trim();
      if (movedBy && this.isUuid(movedBy)) {
        const uidsToConsumeCount = Math.min(
          normalizedUids.length,
          qtyPerUid > 0 ? Math.floor(issuedNow / qtyPerUid + 1e-9) : normalizedUids.length,
        );
        const uidsToRecord = normalizedUids.slice(0, uidsToConsumeCount);
        const uidMovementNumbers: string[] = [];
        for (let i = 0; i < uidsToRecord.length; i++) {
          uidMovementNumbers.push(await this.generateMovementNumber(tenantId, 'PRODUCTION_ISSUE'));
        }
        const rows = uidsToRecord.map((uid, idx) => ({
          tenant_id: tenantId,
          movement_number: uidMovementNumbers[idx],
          movement_type: 'PRODUCTION_ISSUE',
          item_id: itemIdToConsume,
          uid,
          from_warehouse_id: uidWarehouseId && this.isUuid(uidWarehouseId) ? uidWarehouseId : null,
          quantity: qtyPerUid,
          reference_type: 'SIV',
          reference_id: targetJobOrderId,
          reference_number: String((jobOrder as any)?.job_order_number || ''),
          notes: `SIV: Issued UID ${uid} for ${String((jobOrder as any)?.job_order_number || '').trim()} (material_id=${materialId})`,
          moved_by: movedBy,
          movement_date: new Date().toISOString(),
        }));

        if (rows.length > 0) {
          const { error: auditError } = await this.supabase.from('stock_movements').insert(rows as any);
          if (auditError) throw new BadRequestException(formatSupabaseError(auditError, 'STEP-8:stock_movements_insert'));
        }
      }

      // Mark UIDs as consumed for traceability
      const uidsToConsumeCount = Math.min(
        normalizedUids.length,
        qtyPerUid > 0 ? Math.floor(issuedNow / qtyPerUid + 1e-9) : normalizedUids.length,
      );
      const { data: uidRows, error: uidErr } = await this.supabase
        .from('uid_registry')
        .select('uid, lifecycle, metadata')
        .eq('tenant_id', tenantId)
        .in('uid', normalizedUids.slice(0, uidsToConsumeCount));

      if (uidErr) throw new BadRequestException(formatSupabaseError(uidErr, 'STEP-9:uid_registry_consumed'));

      for (const row of uidRows || []) {
        const uid = String((row as any)?.uid || '').trim();
        if (!uid) continue;

        const rawLifecycle = (row as any)?.lifecycle;
        const rawMetadata = (row as any)?.metadata;
        const currentLifecycle = Array.isArray(rawLifecycle)
          ? rawLifecycle
          : rawLifecycle
            ? JSON.parse(String(rawLifecycle))
            : [];
        const currentMetadata = rawMetadata && typeof rawMetadata === 'object'
          ? rawMetadata
          : rawMetadata
            ? JSON.parse(String(rawMetadata))
            : {};

        await this.supabase
          .from('uid_registry')
          .update({
            status: 'CONSUMED',
            location: `Issued to ${String((jobOrder as any)?.job_order_number || '').trim()}`,
            lifecycle: [
              ...currentLifecycle,
              {
                stage: 'SIV_ISSUED',
                timestamp: new Date().toISOString(),
                job_order_id: targetJobOrderId,
                job_order_number: String((jobOrder as any)?.job_order_number || '').trim(),
                material_id: materialId,
                user: userId || null,
              },
            ],
            metadata: {
              ...currentMetadata,
              siv_issued_at: new Date().toISOString(),
              siv_issued_by: userId || null,
              siv_job_order_id: targetJobOrderId,
              siv_job_order_number: String((jobOrder as any)?.job_order_number || '').trim(),
              siv_material_id: materialId,
            },
          } as any)
          .eq('tenant_id', tenantId)
          .eq('uid', uid);
      }
    }

    const nextIssued = alreadyIssued + issuedNow;
    const nextStatus = nextIssued + 1e-9 >= requiredQty ? 'ISSUED' : 'PARTIAL';

    const { error: matUpdateErr } = await this.supabase
      .from('job_order_materials')
      .update({
        issued_quantity: nextIssued,
        status: nextStatus,
      })
      .eq('id', materialId)
      .eq('job_order_id', targetJobOrderId);

    if (matUpdateErr) throw new BadRequestException(formatSupabaseError(matUpdateErr, 'STEP-10:job_order_materials_update'));

    const newPending = Math.max(0, requiredQty - nextIssued);

    return {
      jobOrderId: targetJobOrderId,
      jobOrderNumber: (jobOrder as any)?.job_order_number,
      materialId,
      materialItemCode: (material as any)?.item_code,
      materialItemName: (material as any)?.item_name,
      requestedIssueQty,
      issuedNow,
      totalIssued: nextIssued,
      pendingQuantity: newPending,
      materialStatus: nextStatus,
      issuedBy: userId || null,
      message:
        newPending > 0
          ? `Issued ${issuedNow.toFixed(2)}. Pending ${newPending.toFixed(2)} for this line.`
          : `Issued ${issuedNow.toFixed(2)}. This line is now fully issued.`,
    };
    } catch (error: any) {
      // Enhanced error context for v2026-02-17-v4
      const errorDetails = {
        errorType: error?.constructor?.name || 'UnknownError',
        errorMessage: error?.message || 'No message',
        tenantId,
        jobOrderId,
        materialId,
        issueQuantity,
        uidsProvided: Array.isArray(uids) ? uids.length : 0,
        timestamp: new Date().toISOString(),
      };

      this.logger.error('[SIV issueMaterialRequisitionLine FAILED v2026-02-17-v5]');
      this.logger.error(JSON.stringify(errorDetails, null, 2));

      // Re-throw with enhanced context - NEVER use empty/falsy message
      const errMsg = error?.message && error.message !== 'Bad Request'
        ? error.message
        : `Unknown error (type=${errorDetails.errorType}, raw=${JSON.stringify(error?.response || error?.stack?.split('\n')[0] || 'no-info')})`;
      throw new BadRequestException(
        `SIV Issue Failed (v5): ${errMsg}. Details: ${JSON.stringify(errorDetails)}`,
      );
    }
  }

  private supabaseErrorToString(err: any): string {
    const message = String(err?.message || '').trim();
    const details = String(err?.details || '').trim();
    const hint = String(err?.hint || '').trim();
    const code = String(err?.code || '').trim();

    const parts = [message, details, hint].filter(Boolean);
    const joined = parts.join(' | ');
    const base = code ? `${joined}${joined ? ` (code=${code})` : `code=${code}`}` : joined;

    // PostgrestError may not serialize well; include own-property JSON if it helps.
    let raw = '';
    try {
      raw = JSON.stringify(err, Object.getOwnPropertyNames(err));
    } catch {
      raw = '';
    }

    const rawUseful = raw && raw !== '{}' && raw !== 'null' ? raw : '';
    if (rawUseful && base && rawUseful.includes(base)) return rawUseful;
    if (rawUseful && base) return `${base} | raw=${rawUseful}`;
    if (rawUseful) return rawUseful;
    return base || String(err || '').trim() || 'Unknown error';
  }

  private async adjustInventoryStockWithFallback(args: {
    tenantId: string;
    itemId: string;
    warehouseId: string;
    locationId: string | null;
    quantityChange: number;
    category: string;
    context?: Record<string, any>;
  }): Promise<void> {
    const { tenantId, itemId, warehouseId, locationId, quantityChange, category, context } = args;

    const { error: invError } = await this.supabase.rpc('adjust_inventory_stock', {
      p_tenant_id: tenantId,
      p_item_id: itemId,
      p_warehouse_id: warehouseId,
      p_location_id: locationId,
      p_quantity_change: quantityChange,
      p_category: category,
    });

    if (!invError) return;

    const rpcErr = this.supabaseErrorToString(invError);
    this.logger.error('[Inventory] adjust_inventory_stock RPC failed; attempting fallback update on inventory_stock');
    this.logger.error(
      JSON.stringify(
        {
          tenantId,
          itemId,
          warehouseId,
          locationId,
          quantityChange,
          category,
          rpcErr,
          context: context || null,
        },
        null,
        2,
      ),
    );

    try {
      await this.adjustInventoryStockFallbackDirect({
        tenantId,
        itemId,
        warehouseId,
        quantityChange,
        category,
      });
    } catch (fallbackErr: any) {
      const fbErr = this.supabaseErrorToString(fallbackErr);
      throw new BadRequestException(`adjust_inventory_stock failed: ${rpcErr}; fallback failed: ${fbErr}`);
    }
  }

  private async adjustInventoryStockFallbackDirect(args: {
    tenantId: string;
    itemId: string;
    warehouseId: string;
    quantityChange: number;
    category: string;
  }): Promise<void> {
    const { tenantId, itemId, warehouseId, quantityChange } = args;
    const category = normalizeInventoryCategory(args.category, 'RAW_MATERIAL');

    if (!Number.isFinite(quantityChange) || Math.abs(quantityChange) < 1e-9) return;

    // Prefer consuming/adding from existing rows to avoid creating duplicate NULL-location rows.
    const { data: rows, error } = await this.supabase
      .from('inventory_stock')
      .select('id, quantity, reserved_quantity, available_quantity, location_id')
      .eq('tenant_id', tenantId)
      .eq('item_id', itemId)
      .eq('warehouse_id', warehouseId)
      .eq('category', category)
      .order('available_quantity', { ascending: false });

    if (error) throw error;

    const safeRows = Array.isArray(rows) ? rows : [];
    if (safeRows.length === 0) {
      // Last resort: try to insert a row. This may fail if your schema enforces location_id.
      const { error: insErr } = await this.supabase
        .from('inventory_stock')
        .insert({
          tenant_id: tenantId,
          item_id: itemId,
          warehouse_id: warehouseId,
          location_id: null,
          category,
          quantity: quantityChange,
          reserved_quantity: 0,
          last_movement_date: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        } as any);
      if (insErr) throw insErr;
      return;
    }

    let remaining = quantityChange;
    if (remaining < 0) {
      // Deduct across rows with the most available first.
      for (const row of safeRows) {
        if (remaining >= -1e-9) break;
        const currentQty = Number((row as any)?.quantity || 0);
        const reservedQty = Number((row as any)?.reserved_quantity || 0);
        const maxDeduct = Math.max(0, currentQty - reservedQty);
        const want = Math.min(maxDeduct, -remaining);
        if (want <= 0) continue;

        const nextQty = currentQty - want;
        const { error: upErr } = await this.supabase
          .from('inventory_stock')
          .update({
            quantity: nextQty,
            last_movement_date: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          } as any)
          .eq('id', (row as any)?.id);
        if (upErr) throw upErr;
        remaining += want;
      }

      if (remaining < -1e-6) {
        throw new Error(`Fallback inventory_stock deduction short by ${Math.abs(remaining).toFixed(6)}`);
      }
      return;
    }

    // Add to the most available row (simple).
    const target = safeRows[0];
    const currentQty = Number((target as any)?.quantity || 0);
    const nextQty = currentQty + remaining;
    const { error: upErr } = await this.supabase
      .from('inventory_stock')
      .update({
        quantity: nextQty,
        last_movement_date: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      } as any)
      .eq('id', (target as any)?.id);
    if (upErr) throw upErr;
  }

  async getOpenStoreReceiptVouchers(tenantId: string) {
    const { data: completedJobs, error: jobsError } = await this.supabase
      .from('production_job_orders')
      .select('id, job_order_number, item_id, item_code, item_name, quantity, completed_quantity, status, actual_end_date, created_at')
      .eq('tenant_id', tenantId)
      .in('status', ['COMPLETED', 'IN_PROGRESS'])
      .order('created_at', { ascending: false })
      .limit(200);

    if (jobsError) throw new BadRequestException(jobsError.message);

    const ids = (completedJobs || []).map((j: any) => String(j.id)).filter(Boolean);
    if (ids.length === 0) return [];

    const { data: uidRows, error: uidError } = await this.supabase
      .from('uid_registry')
      .select('job_order_id, uid')
      .eq('tenant_id', tenantId)
      .in('job_order_id', ids)

    if (uidError) throw new BadRequestException(uidError.message);

    const allByJob = new Map<string, Set<string>>();
    for (const row of uidRows || []) {
      const jobId = String((row as any)?.job_order_id || '').trim();
      const uid = String((row as any)?.uid || '').trim();
      if (!jobId || !uid) continue;
      if (!allByJob.has(jobId)) allByJob.set(jobId, new Set<string>());
      allByJob.get(jobId)!.add(uid);
    }

    const { data: receiptEntries, error: receiptError } = await this.supabase
      .from('stock_entries')
      .select('id, item_id, quantity, available_quantity, created_at, metadata')
      .eq('tenant_id', tenantId)
      .eq('metadata->>created_from', 'STORE_RECEIPT')
      .order('created_at', { ascending: false })
      .limit(500);

    if (receiptError) throw new BadRequestException(receiptError.message);

    // Latest SRV stock_entry per job order (one SRV entry holds many UIDs).
    const latestReceiptByJob = new Map<string, any>();
    for (const entry of receiptEntries || []) {
      const jobId = String((entry as any)?.metadata?.job_order_id || '').trim();
      if (!jobId) continue;
      if (!latestReceiptByJob.has(jobId)) {
        latestReceiptByJob.set(jobId, entry);
      }
    }

    // OPEN SRVs = jobs that have UIDs but either:
    // - no STORE_RECEIPT stock_entry exists yet, OR
    // - SRV exists but is not approved.
    return (completedJobs || [])
      .map((jo: any) => {
        const all = allByJob.get(String(jo.id)) || new Set<string>();
        const receiptEntry = latestReceiptByJob.get(String(jo.id)) || null;
        const meta = receiptEntry?.metadata || {};
        const srvApprovedAt = meta?.srv_approved_at || null;

        return {
          id: String(jo.id),
          job_order_id: String(jo.id),
          job_order_number: jo.job_order_number,
          item_id: jo.item_id,
          item_code: jo.item_code,
          item_name: jo.item_name,
          uid: null,
          quantity: all.size || Number(jo.quantity || 0) || 0,
          to_warehouse_id: null,
          movement_date: meta?.received_at || jo.actual_end_date || jo.created_at || null,
          received_by: meta?.received_by_name || meta?.received_by || null,
          approved_by: meta?.srv_approved_by || null,
          approved_at: meta?.srv_approved_at || null,
          notes: null,
          // internal/debug fields (ignored by UI)
          _srv_stock_entry_id: receiptEntry?.id || null,
          _srv_approved_at: srvApprovedAt,
        };
      })
      .filter((row: any) => {
        // Only show jobs that actually have UIDs (otherwise SRV not applicable)
        if (Number(row.quantity || 0) <= 0) return false;
        // Show when not approved
        return !row._srv_approved_at;
      });
  }

  private async resolveStoreReceiptVoucherEntry(
    tenantId: string,
    entryIdOrJobOrderId: string,
  ): Promise<{ id: string; metadata: any } | null> {
    const id = String(entryIdOrJobOrderId || '').trim();
    if (!tenantId || !id) return null;

    // 1) Try by stock_entries.id (history row)
    const { data: byId, error: byIdError } = await this.supabase
      .from('stock_entries')
      .select('id, metadata')
      .eq('tenant_id', tenantId)
      .eq('id', id)
      .maybeSingle();
    if (byIdError) throw new BadRequestException(byIdError.message);
    if (byId) return { id: String((byId as any).id), metadata: (byId as any).metadata };

    // 2) Try by job_order_id stored in metadata (open SRV UI passes job order id)
    const { data: rows, error: byJobError } = await this.supabase
      .from('stock_entries')
      .select('id, metadata, created_at')
      .eq('tenant_id', tenantId)
      .eq('metadata->>created_from', 'STORE_RECEIPT')
      .eq('metadata->>job_order_id', id)
      .order('created_at', { ascending: false })
      .limit(1);
    if (byJobError) throw new BadRequestException(byJobError.message);
    const row = Array.isArray(rows) ? rows[0] : null;
    if (!row?.id) return null;
    return { id: String((row as any).id), metadata: (row as any).metadata };
  }

  async getStoreIssueVoucherHistory(tenantId: string) {
    const { data: movements, error: mvErr } = await this.supabase
      .from('stock_movements')
      .select('id, tenant_id, movement_type, item_id, uid, from_warehouse_id, quantity, reference_type, reference_id, reference_number, movement_date, notes, moved_by, approved_by, approved_at')
      .eq('tenant_id', tenantId)
      .eq('reference_type', 'SIV')
      .order('movement_date', { ascending: false })
      .limit(500);

    if (mvErr) throw new BadRequestException(mvErr.message);

    const safe = Array.isArray(movements) ? movements : [];
    const itemIds = Array.from(
      new Set(safe.map((m: any) => String(m?.item_id || '').trim()).filter(Boolean)),
    );
    const jobIds = Array.from(
      new Set(safe.map((m: any) => String(m?.reference_id || '').trim()).filter(Boolean)),
    );

    const [itemsResult, jobsResult] = await Promise.all([
      itemIds.length
        ? this.supabase
            .from('items')
            .select('id, code, name')
            .eq('tenant_id', tenantId)
            .in('id', itemIds)
        : Promise.resolve({ data: [], error: null } as any),
      jobIds.length
        ? this.supabase
            .from('production_job_orders')
            .select('id, job_order_number, item_code, item_name')
            .eq('tenant_id', tenantId)
            .in('id', jobIds)
        : Promise.resolve({ data: [], error: null } as any),
    ]);

    if (itemsResult?.error) throw new BadRequestException(itemsResult.error.message);
    if (jobsResult?.error) throw new BadRequestException(jobsResult.error.message);

    const itemsById = new Map<string, any>();
    for (const it of (itemsResult?.data || []) as any[]) {
      const id = String((it as any)?.id || '').trim();
      if (!id) continue;
      itemsById.set(id, it);
    }

    const jobsById = new Map<string, any>();
    for (const jo of (jobsResult?.data || []) as any[]) {
      const id = String((jo as any)?.id || '').trim();
      if (!id) continue;
      jobsById.set(id, jo);
    }

    return safe.map((m: any) => {
      const itemId = String(m?.item_id || '').trim();
      const jobId = String(m?.reference_id || '').trim();
      const item = itemId ? itemsById.get(itemId) : null;
      const job = jobId ? jobsById.get(jobId) : null;

      return {
        id: String(m?.id || ''),
        job_order_id: jobId || null,
        job_order_number: String(job?.job_order_number || m?.reference_number || ''),
        item_id: itemId || null,
        item_code: String(job?.item_code || item?.code || ''),
        item_name: String(job?.item_name || item?.name || ''),
        uid: String(m?.uid || ''),
        quantity: Number(m?.quantity || 0),
        from_warehouse_id: String(m?.from_warehouse_id || ''),
        movement_date: m?.movement_date || null,
        moved_by: String(m?.moved_by || ''),
        approved_by: String(m?.approved_by || ''),
        approved_at: m?.approved_at || null,
        notes: String(m?.notes || ''),
      };
    });
  }

  async updateStoreIssueVoucherHistoryRow(
    tenantId: string,
    movementId: string,
    details: { notes?: string; userId?: string },
  ) {
    if (!tenantId) throw new BadRequestException('tenantId is required');
    if (!movementId) throw new BadRequestException('movementId is required');

    const notes = String(details?.notes || '').trim();
    const { data: row, error } = await this.supabase
      .from('stock_movements')
      .select('id, reference_type')
      .eq('tenant_id', tenantId)
      .eq('id', movementId)
      .maybeSingle();

    if (error) throw new BadRequestException(error.message);
    if (!row) throw new NotFoundException('SIV history row not found');
    if (String((row as any)?.reference_type || '').trim() !== 'SIV') {
      throw new BadRequestException('Not a SIV history row');
    }

    const { error: upErr } = await this.supabase
      .from('stock_movements')
      .update({ notes } as any)
      .eq('tenant_id', tenantId)
      .eq('id', movementId);

    if (upErr) throw new BadRequestException(upErr.message);
    return { id: movementId, message: 'Updated' };
  }

  async approveStoreIssueVoucherHistoryRow(tenantId: string, movementId: string, userId?: string) {
    if (!tenantId) throw new BadRequestException('tenantId is required');
    if (!movementId) throw new BadRequestException('movementId is required');

    const approver = String(userId || '').trim();
    if (!approver || !this.isUuid(approver)) {
      throw new BadRequestException('Valid userId is required to approve');
    }

    const { data: row, error } = await this.supabase
      .from('stock_movements')
      .select('id, reference_type, approved_at')
      .eq('tenant_id', tenantId)
      .eq('id', movementId)
      .maybeSingle();

    if (error) throw new BadRequestException(error.message);
    if (!row) throw new NotFoundException('SIV history row not found');
    if (String((row as any)?.reference_type || '').trim() !== 'SIV') {
      throw new BadRequestException('Not a SIV history row');
    }
    if ((row as any)?.approved_at) {
      return { id: movementId, message: 'Already approved' };
    }

    const { error: upErr } = await this.supabase
      .from('stock_movements')
      .update({
        approved_by: approver,
        approved_at: new Date().toISOString(),
      } as any)
      .eq('tenant_id', tenantId)
      .eq('id', movementId);

    if (upErr) throw new BadRequestException(upErr.message);
    return { id: movementId, message: 'Approved' };
  }

  async deleteStoreIssueVoucherHistoryRow(tenantId: string, movementId: string, userId?: string) {
    if (!tenantId) throw new BadRequestException('tenantId is required');
    if (!movementId) throw new BadRequestException('movementId is required');

    const { data: mv, error } = await this.supabase
      .from('stock_movements')
      .select('id, reference_type, item_id, uid, from_warehouse_id, quantity, reference_id, reference_number, notes, approved_at')
      .eq('tenant_id', tenantId)
      .eq('id', movementId)
      .maybeSingle();

    if (error) throw new BadRequestException(error.message);
    if (!mv) throw new NotFoundException('SIV history row not found');
    if (String((mv as any)?.reference_type || '').trim() !== 'SIV') {
      throw new BadRequestException('Not a SIV history row');
    }
    if ((mv as any)?.approved_at) {
      throw new BadRequestException('Cannot delete an approved SIV row');
    }

    const itemId = String((mv as any)?.item_id || '').trim();
    const warehouseId = String((mv as any)?.from_warehouse_id || '').trim();
    const qty = Number((mv as any)?.quantity || 0);
    if (!itemId || !this.isUuid(itemId)) throw new BadRequestException('Invalid item_id on movement');
    if (!warehouseId || !this.isUuid(warehouseId)) throw new BadRequestException('Invalid from_warehouse_id on movement');
    if (!Number.isFinite(qty) || qty <= 0) throw new BadRequestException('Invalid quantity on movement');

    const { data: item, error: itemErr } = await this.supabase
      .from('items')
      .select('id, category')
      .eq('tenant_id', tenantId)
      .eq('id', itemId)
      .single();
    if (itemErr) throw new BadRequestException(itemErr.message);

    // Restore stock_entries (FIFO pool) and inventory_stock aggregate
    const { error: addErr } = await this.supabase
      .from('stock_entries')
      .insert({
        tenant_id: tenantId,
        item_id: itemId,
        warehouse_id: warehouseId,
        quantity: qty,
        available_quantity: qty,
        allocated_quantity: 0,
        metadata: {
          created_from: 'SIV_DELETE_REVERSAL',
          siv_movement_id: movementId,
          job_order_id: String((mv as any)?.reference_id || '').trim() || null,
          job_order_number: String((mv as any)?.reference_number || '').trim() || null,
          reversed_at: new Date().toISOString(),
          reversed_by: String(userId || '').trim() || null,
        },
      } as any);
    if (addErr) throw new BadRequestException(addErr.message);

    const { error: invErr } = await this.supabase.rpc('adjust_inventory_stock', {
      p_tenant_id: tenantId,
      p_item_id: itemId,
      p_warehouse_id: warehouseId,
      p_location_id: null,
      p_quantity_change: qty,
      p_category: normalizeInventoryCategory((item as any)?.category, 'RAW_MATERIAL'),
    });
    if (invErr) throw new BadRequestException(invErr.message);

    // If UID-based movement, unconsume UID
    const uid = String((mv as any)?.uid || '').trim();
    if (uid) {
      const { data: uidRow, error: uidErr } = await this.supabase
        .from('uid_registry')
        .select('uid, lifecycle, metadata')
        .eq('tenant_id', tenantId)
        .eq('uid', uid)
        .maybeSingle();
      if (uidErr) throw new BadRequestException(uidErr.message);

      if (uidRow) {
        const rawLifecycle = (uidRow as any)?.lifecycle;
        const rawMetadata = (uidRow as any)?.metadata;
        const currentLifecycle = Array.isArray(rawLifecycle)
          ? rawLifecycle
          : rawLifecycle
            ? JSON.parse(String(rawLifecycle))
            : [];
        const currentMetadata = rawMetadata && typeof rawMetadata === 'object'
          ? rawMetadata
          : rawMetadata
            ? JSON.parse(String(rawMetadata))
            : {};

        await this.supabase
          .from('uid_registry')
          .update({
            status: 'ACTIVE',
            location: 'Warehouse',
            lifecycle: [
              ...currentLifecycle,
              {
                stage: 'SIV_DELETED',
                timestamp: new Date().toISOString(),
                siv_movement_id: movementId,
                user: String(userId || '').trim() || null,
              },
            ],
            metadata: {
              ...currentMetadata,
              siv_deleted_at: new Date().toISOString(),
              siv_deleted_by: String(userId || '').trim() || null,
            },
          } as any)
          .eq('tenant_id', tenantId)
          .eq('uid', uid);
      }
    }

    // Reduce issued qty on material line (best-effort via parsing notes)
    const materialMatch = String((mv as any)?.notes || '').match(/material_id=([0-9a-fA-F-]{36})/);
    const parsedMaterialId = materialMatch?.[1];
    if (parsedMaterialId && this.isUuid(parsedMaterialId)) {
      const { data: mat, error: matErr } = await this.supabase
        .from('job_order_materials')
        .select('id, required_quantity, issued_quantity')
        .eq('id', parsedMaterialId)
        .maybeSingle();
      if (!matErr && mat) {
        const required = Number((mat as any)?.required_quantity || 0);
        const issued = Number((mat as any)?.issued_quantity || 0);
        const nextIssued = Math.max(0, issued - qty);
        const nextStatus = nextIssued + 1e-9 >= required ? 'ISSUED' : nextIssued > 0 ? 'PARTIAL' : 'PENDING';
        await this.supabase
          .from('job_order_materials')
          .update({ issued_quantity: nextIssued, status: nextStatus } as any)
          .eq('id', parsedMaterialId);
      }
    }

    const { error: delErr } = await this.supabase
      .from('stock_movements')
      .delete()
      .eq('tenant_id', tenantId)
      .eq('id', movementId);
    if (delErr) throw new BadRequestException(delErr.message);

    return { id: movementId, message: 'Deleted and reversed' };
  }

  async updateStoreReceiptVoucherHistoryRow(
    tenantId: string,
    entryId: string,
    details: { receiverName?: string; receiverPhone?: string; userId?: string },
  ) {
    if (!tenantId) throw new BadRequestException('tenantId is required');
    if (!entryId) throw new BadRequestException('entryId is required');

    const { data: entry, error } = await this.supabase
      .from('stock_entries')
      .select('id, metadata')
      .eq('tenant_id', tenantId)
      .eq('id', entryId)
      .maybeSingle();
    if (error) throw new BadRequestException(error.message);
    if (!entry) throw new NotFoundException('SRV history row not found');

    const meta = (entry as any)?.metadata || {};
    if (String(meta?.created_from || '').trim() !== 'STORE_RECEIPT') {
      throw new BadRequestException('Not a SRV history row');
    }

    const nextMeta = {
      ...meta,
      received_by_name: String(details?.receiverName || '').trim() || meta?.received_by_name || null,
      received_by_phone: String(details?.receiverPhone || '').trim() || meta?.received_by_phone || null,
      srv_updated_at: new Date().toISOString(),
      srv_updated_by: String(details?.userId || '').trim() || null,
    };

    const { error: upErr } = await this.supabase
      .from('stock_entries')
      .update({ metadata: nextMeta } as any)
      .eq('tenant_id', tenantId)
      .eq('id', entryId);
    if (upErr) throw new BadRequestException(upErr.message);

    return { id: entryId, message: 'Updated' };
  }

  async approveStoreReceiptVoucherHistoryRow(tenantId: string, entryId: string, userId?: string) {
    if (!tenantId) throw new BadRequestException('tenantId is required');
    if (!entryId) throw new BadRequestException('entryId is required');

    const approver = String(userId || '').trim();
    if (!approver || !this.isUuid(approver)) {
      throw new BadRequestException('Valid userId is required to approve');
    }

    // UI may pass either stock_entries.id (history row) OR production_job_orders.id (open tab).
    let resolved = await this.resolveStoreReceiptVoucherEntry(tenantId, entryId);
    if (!resolved) {
      // If no SRV row exists yet, auto-receive to create it, then approve.
      await this.receiveStoreReceiptVoucher(tenantId, entryId, userId, { receiverName: 'SYSTEM' });
      resolved = await this.resolveStoreReceiptVoucherEntry(tenantId, entryId);
    }
    if (!resolved) throw new NotFoundException('SRV history row not found');

    const meta = resolved.metadata || {};
    if (String(meta?.created_from || '').trim() !== 'STORE_RECEIPT') {
      throw new BadRequestException('Not a SRV history row');
    }

    const nextMeta = {
      ...meta,
      srv_approved_by: approver,
      srv_approved_at: new Date().toISOString(),
    };

    const { error: upErr } = await this.supabase
      .from('stock_entries')
      .update({ metadata: nextMeta } as any)
      .eq('tenant_id', tenantId)
      .eq('id', resolved.id);
    if (upErr) throw new BadRequestException(upErr.message);

    return { id: resolved.id, message: 'Approved' };
  }

  async deleteStoreReceiptVoucherHistoryRow(tenantId: string, entryId: string, userId?: string) {
    if (!tenantId) throw new BadRequestException('tenantId is required');
    if (!entryId) throw new BadRequestException('entryId is required');

    const resolved = await this.resolveStoreReceiptVoucherEntry(tenantId, entryId);
    if (!resolved) throw new NotFoundException('SRV history row not found');

    const { data: entry, error } = await this.supabase
      .from('stock_entries')
      .select('id, available_quantity, metadata')
      .eq('tenant_id', tenantId)
      .eq('id', resolved.id)
      .maybeSingle();
    if (error) throw new BadRequestException(error.message);
    if (!entry) throw new NotFoundException('SRV history row not found');

    const meta = (entry as any)?.metadata || {};
    if (String(meta?.created_from || '').trim() !== 'STORE_RECEIPT') {
      throw new BadRequestException('Not a SRV history row');
    }

    const approvedUids = Array.isArray(meta?.approved_uids) ? meta.approved_uids : [];
    if (approvedUids.length > 0 || Number((entry as any)?.available_quantity || 0) > 0) {
      throw new BadRequestException('Cannot delete SRV after QC release has started');
    }

    const receivedUids = Array.isArray(meta?.received_uids) ? meta.received_uids : [];
    const safeUids = receivedUids.map((u: any) => String(u || '').trim()).filter(Boolean);

    // Revert UID location back to Store (best effort)
    if (safeUids.length > 0) {
      const { data: uidRows, error: uidErr } = await this.supabase
        .from('uid_registry')
        .select('uid, lifecycle, metadata')
        .eq('tenant_id', tenantId)
        .in('uid', safeUids);
      if (uidErr) throw new BadRequestException(uidErr.message);

      for (const row of uidRows || []) {
        const uid = String((row as any)?.uid || '').trim();
        if (!uid) continue;

        const rawLifecycle = (row as any)?.lifecycle;
        const rawMetadata = (row as any)?.metadata;
        const currentLifecycle = Array.isArray(rawLifecycle)
          ? rawLifecycle
          : rawLifecycle
            ? JSON.parse(String(rawLifecycle))
            : [];
        const currentMetadata = rawMetadata && typeof rawMetadata === 'object'
          ? rawMetadata
          : rawMetadata
            ? JSON.parse(String(rawMetadata))
            : {};

        await this.supabase
          .from('uid_registry')
          .update({
            location: 'Store',
            lifecycle: [
              ...currentLifecycle,
              {
                stage: 'SRV_DELETED',
                timestamp: new Date().toISOString(),
                srv_entry_id: entryId,
                user: String(userId || '').trim() || null,
              },
            ],
            metadata: {
              ...currentMetadata,
              srv_deleted_at: new Date().toISOString(),
              srv_deleted_by: String(userId || '').trim() || null,
            },
          } as any)
          .eq('tenant_id', tenantId)
          .eq('uid', uid);
      }
    }

    const { error: delErr } = await this.supabase
      .from('stock_entries')
      .delete()
      .eq('tenant_id', tenantId)
      .eq('id', entryId);
    if (delErr) throw new BadRequestException(delErr.message);

    return { id: entryId, message: 'Deleted' };
  }

  async receiveStoreReceiptVoucher(
    tenantId: string,
    jobOrderId: string,
    userId?: string,
    details?: { receiverName?: string; receiverPhone?: string },
  ) {
    const { data: jobOrder, error: jobError } = await this.supabase
      .from('production_job_orders')
      .select('id, tenant_id, item_id, item_code, item_name, job_order_number, status')
      .eq('tenant_id', tenantId)
      .eq('id', jobOrderId)
      .single();

    if (jobError) throw new BadRequestException(jobError.message);
    if (!jobOrder) throw new NotFoundException('Job order not found');

    const status = String(jobOrder.status || '').toUpperCase();
    if (status !== 'COMPLETED' && status !== 'IN_PROGRESS') {
      throw new BadRequestException('SRV is allowed only for IN_PROGRESS / COMPLETED job orders');
    }

    const { data: uidRows, error: uidError } = await this.supabase
      .from('uid_registry')
      .select('uid, lifecycle, metadata')
      .eq('tenant_id', tenantId)
      .eq('job_order_id', jobOrderId)

    if (uidError) throw new BadRequestException(uidError.message);

    const allUids = (uidRows || []).map((r: any) => String(r?.uid || '').trim()).filter(Boolean);
    if (allUids.length === 0) throw new BadRequestException('No UIDs found for this job order');

    const { data: existingReceipts, error: existingError } = await this.supabase
      .from('stock_entries')
      .select('metadata')
      .eq('tenant_id', tenantId)
      .eq('metadata->>created_from', 'STORE_RECEIPT')
      .eq('metadata->>job_order_id', jobOrderId);

    if (existingError) throw new BadRequestException(existingError.message);

    const receivedSet = new Set<string>();
    for (const row of existingReceipts || []) {
      const arr = (row as any)?.metadata?.received_uids;
      if (!Array.isArray(arr)) continue;
      for (const uid of arr) {
        const normalized = String(uid || '').trim();
        if (normalized) receivedSet.add(normalized);
      }
    }

    const pendingUids = allUids.filter((uid) => !receivedSet.has(uid));
    if (pendingUids.length === 0) {
      return {
        jobOrderId,
        jobOrderNumber: jobOrder.job_order_number,
        receivedQuantity: 0,
        pendingReceipt: 0,
        message: 'No pending SRV quantity for this job order',
      };
    }

    const { data: warehouses, error: whError } = await this.supabase
      .from('warehouses')
      .select('id')
      .eq('tenant_id', tenantId)
      .limit(1);

    if (whError) throw new BadRequestException(whError.message);
    if (!warehouses || warehouses.length === 0) {
      throw new BadRequestException('No warehouse configured');
    }
    const warehouseId = warehouses[0].id;

    const { error: addError } = await this.supabase
      .from('stock_entries')
      .insert({
        tenant_id: tenantId,
        item_id: jobOrder.item_id,
        warehouse_id: warehouseId,
        quantity: pendingUids.length,
        // SRV is GRN-like receipt into QC-hold: stock becomes AVAILABLE only after QC approval.
        available_quantity: 0,
        allocated_quantity: 0,
        metadata: {
          created_from: 'STORE_RECEIPT',
          job_order_id: jobOrderId,
          job_order_number: jobOrder.job_order_number,
          received_uids: pendingUids,
          received_by: userId || null,
          received_by_name: String(details?.receiverName || '').trim() || null,
          received_by_phone: String(details?.receiverPhone || '').trim() || null,
          received_at: new Date().toISOString(),
          approved_uids: [],
        },
      });

    if (addError) {
      throw new BadRequestException(`Failed to add stock receipt: ${addError.message}`);
    }

    for (const row of uidRows || []) {
      const uid = String((row as any)?.uid || '').trim();
      if (!uid || !pendingUids.includes(uid)) continue;

      const currentLifecycle = (row as any)?.lifecycle ? JSON.parse((row as any).lifecycle) : [];
      const currentMetadata = (row as any)?.metadata ? JSON.parse((row as any).metadata) : {};

      await this.supabase
        .from('uid_registry')
        .update({
          location: 'QC',
          lifecycle: JSON.stringify([
            ...currentLifecycle,
            {
              stage: 'STORE_RECEIVED',
              timestamp: new Date().toISOString(),
              location: 'Store',
              reference: `Store receipt voucher for ${jobOrder.job_order_number}`,
              user: userId,
            },
          ]),
          metadata: JSON.stringify({
            ...currentMetadata,
            store_received_at: new Date().toISOString(),
            store_received_by: userId,
            store_received_by_name: String(details?.receiverName || '').trim() || null,
            store_received_by_phone: String(details?.receiverPhone || '').trim() || null,
          }),
        })
        .eq('tenant_id', tenantId)
        .eq('uid', uid);
    }

    return {
      jobOrderId,
      jobOrderNumber: jobOrder.job_order_number,
      receivedQuantity: pendingUids.length,
      pendingReceipt: 0,
      message: `SRV complete: ${pendingUids.length} unit(s) received to QC (waiting for QC approval)`,
    };
  }

  async getStoreReceiptVoucherHistory(tenantId: string) {
    const { data: entries, error } = await this.supabase
      .from('stock_entries')
      .select('id, item_id, warehouse_id, quantity, available_quantity, created_at, metadata')
      .eq('tenant_id', tenantId)
      .eq('metadata->>created_from', 'STORE_RECEIPT')
      .order('created_at', { ascending: false })
      .limit(200);

    if (error) throw new BadRequestException(error.message);

    const safe = Array.isArray(entries) ? entries : [];
    const itemIds = Array.from(new Set(safe.map((e: any) => String(e?.item_id || '').trim()).filter(Boolean)));
    const itemById = new Map<string, { code?: string; name?: string }>();

    if (itemIds.length > 0) {
      const { data: items, error: itemError } = await this.supabase
        .from('items')
        .select('id, code, name')
        .eq('tenant_id', tenantId)
        .in('id', itemIds);
      if (itemError) throw new BadRequestException(itemError.message);
      for (const it of items || []) {
        itemById.set(String((it as any)?.id), { code: (it as any)?.code, name: (it as any)?.name });
      }
    }

    return safe.map((e: any) => {
      const meta = (e as any)?.metadata || {};
      const itemInfo = itemById.get(String((e as any)?.item_id || '')) || {};
      const receivedUids = Array.isArray(meta?.received_uids) ? meta.received_uids : [];
      const approvedUids = Array.isArray(meta?.approved_uids) ? meta.approved_uids : [];

      const singleUid = receivedUids.length === 1 ? String(receivedUids[0] || '').trim() : '';
      return {
        id: e.id,
        job_order_id: meta?.job_order_id || null,
        job_order_number: meta?.job_order_number || null,
        item_id: e.item_id,
        item_code: itemInfo.code || null,
        item_name: itemInfo.name || null,
        uid: singleUid || null,
        quantity: Number(e.quantity || 0),
        to_warehouse_id: (e as any)?.warehouse_id || null,
        movement_date: meta?.received_at || e.created_at || null,
        received_by: meta?.received_by_name || meta?.received_by || null,
        approved_by: meta?.srv_approved_by || null,
        approved_at: meta?.srv_approved_at || null,
        notes: null,

        // Keep extended fields for other UI consumers (ignored by current SRV page)
        received_quantity: Number(e.quantity || 0),
        available_quantity: Number(e.available_quantity || 0),
        received_at: meta?.received_at || e.created_at || null,
        received_by_name: meta?.received_by_name || null,
        received_by_phone: meta?.received_by_phone || null,
        srv_approved_by: meta?.srv_approved_by || null,
        srv_approved_at: meta?.srv_approved_at || null,
        received_uids: receivedUids,
        approved_uids: approvedUids,
      };
    });
  }

  async getQcSummary(tenantId: string, jobOrderId: string) {
    const { data: jobOrder, error: jobOrderError } = await this.supabase
      .from('production_job_orders')
      .select('id, tenant_id, item_id, job_order_number, quantity, status')
      .eq('tenant_id', tenantId)
      .eq('id', jobOrderId)
      .single();

    if (jobOrderError) throw new BadRequestException(jobOrderError.message);
    if (!jobOrder) throw new NotFoundException('Job order not found');

    const { data: qcStockEntries, error: qcStockError } = await this.supabase
      .from('stock_entries')
      .select('id, quantity, available_quantity, metadata, created_at')
      .eq('tenant_id', tenantId)
      .eq('item_id', jobOrder.item_id)
      .eq('metadata->>job_order_id', jobOrderId);

    if (qcStockError) throw new BadRequestException(qcStockError.message);

    const entries = Array.isArray(qcStockEntries) ? qcStockEntries : [];
    // With SRV-first flow, STORE_RECEIPT quantity is received-to-QC and does not mean available stock.
    // Use available_quantity (or approved_uids) to represent released-to-stock.
    const stockAdded = entries
      .filter((e: any) => {
        const from = String((e as any)?.metadata?.created_from || '').toUpperCase();
        return from === 'STORE_RECEIPT' || from === 'QC_APPROVAL';
      })
      .reduce((sum, e: any) => sum + (Number(e?.available_quantity) || 0), 0);

    const qcAppliedAt = entries.reduce<string | null>((latest, e: any) => {
      const raw = e?.created_at;
      if (!raw) return latest;
      const ts = Date.parse(String(raw));
      if (Number.isNaN(ts)) return latest;

      if (!latest) return String(raw);
      const latestTs = Date.parse(String(latest));
      if (Number.isNaN(latestTs)) return String(raw);
      return ts > latestTs ? String(raw) : latest;
    }, null);

    const approvedUidSet = new Set<string>();
    for (const e of entries) {
      const approved = (e as any)?.metadata?.approved_uids;
      const received = (e as any)?.metadata?.received_uids;
      const merged = [
        ...(Array.isArray(approved) ? approved : []),
        ...(Array.isArray(received) ? received : []),
      ];
      if (merged.length > 0) {
        for (const u of merged) {
          const s = String(u || '').trim();
          if (s) approvedUidSet.add(s);
        }
      }
    }
    
    // Also summarize UID quality statuses (PASS/FAIL/PENDING)
    const { data: uidRows, error: uidError } = await this.supabase
      .from('uid_registry')
      .select('quality_status')
      .eq('tenant_id', tenantId)
      .eq('job_order_id', jobOrderId);

    if (uidError) throw new BadRequestException(uidError.message);

    const uidList = Array.isArray(uidRows) ? uidRows : [];
    const totalUidsCount = uidList.length;
    const passedUidsCount = uidList.filter((u: any) => String(u?.quality_status || '').toUpperCase() === 'PASSED').length;
    const rejectedUidsCount = uidList.filter((u: any) => {
      const status = String(u?.quality_status || '').toUpperCase();
      return status === 'ON_HOLD' || status === 'FAILED';
    }).length;
    const pendingUidsCount = Math.max(0, totalUidsCount - passedUidsCount - rejectedUidsCount);

    return {
      jobOrderId: jobOrder.id,
      jobOrderNumber: jobOrder.job_order_number,
      status: jobOrder.status,
      qcStockEntriesCount: entries.length,
      stockAdded,
      approvedUidsCount: approvedUidSet.size,
      isQcApplied: entries.length > 0,
      qcAppliedAt,
      totalUidsCount,
      passedUidsCount,
      rejectedUidsCount,
      pendingUidsCount,
    };
  }

  async getCompletionPreview(tenantId: string, jobOrderId: string) {
    // Get job order first (avoid masking embed errors as NotFound)
    const { data: jobOrder, error: jobOrderError } = await this.supabase
      .from('production_job_orders')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('id', jobOrderId)
      .single();

    if (jobOrderError) throw new BadRequestException(jobOrderError.message);
    if (!jobOrder) throw new NotFoundException('Job order not found');

    // Get materials (no embeds; item joins can be ambiguous when multiple FKs exist)
    const { data: materialsRaw, error: materialsError } = await this.supabase
      .from('job_order_materials')
      .select('id, item_id, selected_variant_id, required_quantity, issued_quantity, status')
      .eq('job_order_id', jobOrderId);

    if (materialsError) throw new BadRequestException(materialsError.message);
    let materialsList = Array.isArray(materialsRaw) ? materialsRaw : [];
    try {
      materialsList = await this.normalizeJobOrderMaterialRows(tenantId, materialsList);
    } catch (e: any) {
      console.warn('[getCompletionPreview] Material normalization failed:', e?.message || e);
    }

    const itemIds = Array.from(
      new Set(
        [jobOrder.item_id, ...materialsList.map((m: any) => (m?.selected_variant_id || m?.item_id))]
          .map((v) => String(v || '').trim())
          .filter(Boolean),
      ),
    );

    // Fetch item details in one shot
    const { data: items, error: itemsError } = itemIds.length
      ? await this.supabase.from('items').select('id, code, name').in('id', itemIds)
      : { data: [], error: null };

    if (itemsError) throw new BadRequestException(itemsError.message);
    const itemById = new Map<string, { code: string; name: string }>();
    (items || []).forEach((it: any) => {
      if (it?.id) itemById.set(String(it.id), { code: it.code, name: it.name });
    });

    // Determine which materials are sub-assemblies (have a BOM header) so the UI can
    // allow completion even when assembly stock is currently 0 (it will be auto-built).
    const { data: bomHeaders, error: bomHeadersError } = itemIds.length
      ? await this.supabase
          .from('bom_headers')
          .select('item_id')
          .eq('tenant_id', tenantId)
          .in('item_id', itemIds)
      : { data: [], error: null };

    if (bomHeadersError) throw new BadRequestException(bomHeadersError.message);
    const bomItemIdSet = new Set(
      (bomHeaders || [])
        .map((h: any) => String(h?.item_id || '').trim())
        .filter(Boolean),
    );

    // Fetch stock summaries from both sources:
    // - stock_entries: used for FIFO consumption
    // - inventory_stock: used by the Inventory module & reservations
    // Some legacy flows update only inventory_stock (e.g. manual adjustments). To avoid false
    // shortages blocking job completion, the preview will use the higher of the two totals.
    const [{ data: stockEntries, error: stockError }, { data: invStock, error: invError }] = itemIds.length
      ? await Promise.all([
          this.supabase
            .from('stock_entries')
            .select('item_id, available_quantity, allocated_quantity')
            .eq('tenant_id', tenantId)
            .in('item_id', itemIds),
          this.supabase
            .from('inventory_stock')
            .select('item_id, available_quantity, reserved_quantity')
            .eq('tenant_id', tenantId)
            .in('item_id', itemIds),
        ])
      : [{ data: [], error: null }, { data: [], error: null }];

    if (stockError) throw new BadRequestException(stockError.message);
    if (invError) throw new BadRequestException(invError.message);

    const stockByItemId = new Map<
      string,
      { available: number; allocated: number; invAvailable: number; invReserved: number }
    >();

    for (const entry of stockEntries || []) {
      const itemId = String((entry as any)?.item_id || '').trim();
      if (!itemId) continue;
      const prev = stockByItemId.get(itemId) || { available: 0, allocated: 0, invAvailable: 0, invReserved: 0 };
      prev.available += parseFloat(String((entry as any)?.available_quantity ?? '0')) || 0;
      prev.allocated += parseFloat(String((entry as any)?.allocated_quantity ?? '0')) || 0;
      stockByItemId.set(itemId, prev);
    }

    for (const row of invStock || []) {
      const itemId = String((row as any)?.item_id || '').trim();
      if (!itemId) continue;
      const prev = stockByItemId.get(itemId) || { available: 0, allocated: 0, invAvailable: 0, invReserved: 0 };
      prev.invAvailable += parseFloat(String((row as any)?.available_quantity ?? '0')) || 0;
      prev.invReserved += parseFloat(String((row as any)?.reserved_quantity ?? '0')) || 0;
      stockByItemId.set(itemId, prev);
    }

    const finishedItemId = String(jobOrder.item_id || '').trim();
    const finishedItem = itemById.get(finishedItemId);
    const finishedStock = stockByItemId.get(finishedItemId) || { available: 0, allocated: 0, invAvailable: 0, invReserved: 0 };

    const quantityToAdd = Number(jobOrder.quantity) || 0;
    const currentFinishedStock = Math.max(Number(finishedStock.available) || 0, Number(finishedStock.invAvailable) || 0);
    const newFinishedStock = currentFinishedStock + quantityToAdd;

    const materialsToConsume = materialsList.map((material: any) => {
      const materialItemId = String((material?.selected_variant_id || material?.item_id) || '').trim();
      const materialItem = itemById.get(materialItemId);
      const materialStock = stockByItemId.get(materialItemId) || { available: 0, allocated: 0, invAvailable: 0, invReserved: 0 };
      const requiredQty = Number(material?.required_quantity) || 0;
      const alreadyIssued = Number(material?.issued_quantity) || 0;
      const toConsume = Math.max(0, requiredQty - alreadyIssued);
      const currentStock = Math.max(Number(materialStock.available) || 0, Number(materialStock.invAvailable) || 0);
      const reservedStock = Math.max(Number(materialStock.allocated) || 0, Number(materialStock.invReserved) || 0);
      const autoBuildable = Boolean(materialItemId && bomItemIdSet.has(materialItemId));

      // If an item has a BOM, completion can auto-build the missing quantity before consuming.
      // In that case, avoid showing negative "newStock" in preview; report what will be built.
      const autoBuildQuantity = autoBuildable ? Math.max(0, toConsume - currentStock) : 0;
      const newStock = autoBuildable && currentStock < toConsume ? 0 : currentStock - toConsume;

      const status =
        autoBuildQuantity > 0
          ? 'AUTO_BUILD'
          : currentStock >= toConsume
            ? 'OK'
            : 'INSUFFICIENT';
      return {
        itemId: materialItemId,
        itemCode: materialItem?.code || 'Unknown',
        itemName: materialItem?.name || 'Unknown',
        requiredQty,
        alreadyIssued,
        toConsume,
        currentStock,
        reservedStock,
        newStock,
        autoBuildable,
        autoBuildQuantity,
        status,
        sufficient: currentStock >= toConsume || autoBuildable,
        // Diagnostic fields (safe to ignore on UI)
        _sources: {
          stock_entries_available: materialStock.available,
          inventory_stock_available: materialStock.invAvailable,
          stock_entries_reserved: materialStock.allocated,
          inventory_stock_reserved: materialStock.invReserved,
        },
      };
    });

    const autoBuildMaterials = materialsToConsume.filter(
      (m: any) => m.autoBuildable && Number(m.currentStock) < Number(m.toConsume),
    );

    return {
      jobOrderId,
      jobOrderNumber: jobOrder.job_order_number,
      finishedProduct: {
        itemCode: finishedItem?.code || 'Unknown',
        itemName: finishedItem?.name || 'Unknown',
        quantityToAdd,
        currentStock: currentFinishedStock,
        newStock: newFinishedStock,
      },
      materialsToConsume,
      autoBuildMaterials,
      canComplete: materialsToConsume.every((m) => m.sufficient),
      insufficientMaterials: materialsToConsume.filter((m) => !m.sufficient),
    };
  }

  private toStartDate(value?: string): string {
    if (value && value.trim()) return value;
    return new Date().toISOString().slice(0, 10);
  }

  private async getItemBasic(itemId: string): Promise<{ id: string; code: string; name: string; category?: string | null } | null> {
    const { data } = await this.supabase
      .from('items')
      .select('id, code, name, category')
      .eq('id', itemId)
      .single();
    return data || null;
  }

  private async getAvailableStock(tenantId: string, itemId: string): Promise<number> {
    // IMPORTANT:
    // - Job completion consumes from stock_entries FIFO.
    // - Inventory adjustments/movements (legacy) may update only inventory_stock.
    // If inventory_stock shows more available than stock_entries, we opportunistically
    // top-up stock_entries so completion doesn't get blocked by a drift.
    await this.ensureStockEntriesAtLeastInventoryAvailable(tenantId, itemId);

    const { data: entries, error } = await this.supabase
      .from('stock_entries')
      .select('available_quantity')
      .eq('tenant_id', tenantId)
      .eq('item_id', itemId)
      .gt('available_quantity', 0);

    if (error) throw new BadRequestException(error.message);

    const safe = Array.isArray(entries) ? entries : [];
    return safe.reduce((sum: number, e: any) => sum + (Number(e?.available_quantity) || 0), 0);
  }

  private async ensureStockEntriesAtLeastInventoryAvailable(tenantId: string, itemId: string): Promise<void> {
    const formatErr = (err: any, location: string) => {
      const message = String(err?.message || '').trim();
      const details = String(err?.details || '').trim();
      const hint = String(err?.hint || '').trim();
      const code = String(err?.code || '').trim();
      const parts = [message, details, hint].filter(Boolean);
      const joined = parts.join(' | ');
      const base = code ? `${joined}${joined ? ` (code=${code})` : `code=${code}`}` : joined;
      return base || `Supabase error at ${location} (raw: ${JSON.stringify(err)})`;
    };

    // If inventory_stock indicates stock exists but stock_entries does not, create a synthetic
    // stock_entries row so FIFO consumption can proceed.
    // This is intentionally one-way (we only ever increase stock_entries to match inventory_stock).
    const [{ data: invRows, error: invErr }, { data: entryRows, error: entryErr }] = await Promise.all([
      this.supabase
        .from('inventory_stock')
        .select('warehouse_id, available_quantity')
        .eq('tenant_id', tenantId)
        .eq('item_id', itemId),
      this.supabase
        .from('stock_entries')
        .select('available_quantity')
        .eq('tenant_id', tenantId)
        .eq('item_id', itemId)
        .gt('available_quantity', 0),
    ]);

    if (invErr) throw new BadRequestException(formatErr(invErr, 'ensureStock:inventory_stock'));
    if (entryErr) throw new BadRequestException(formatErr(entryErr, 'ensureStock:stock_entries'));

    const invList = Array.isArray(invRows) ? invRows : [];
    const invAvailable = invList.reduce((sum: number, r: any) => sum + (Number(r?.available_quantity) || 0), 0);

    const entryList = Array.isArray(entryRows) ? entryRows : [];
    const entriesAvailable = entryList.reduce((sum: number, r: any) => sum + (Number(r?.available_quantity) || 0), 0);

    const delta = Math.max(0, invAvailable - entriesAvailable);
    if (delta <= 0.0001) return;

    const best = invList
      .filter((r: any) => this.isUuid(String(r?.warehouse_id || '')))
      .sort((a: any, b: any) => (Number(b?.available_quantity) || 0) - (Number(a?.available_quantity) || 0))[0];

    const warehouseId = String(best?.warehouse_id || '').trim();
    if (!warehouseId || !this.isUuid(warehouseId)) return;

    console.warn('[StockReconcile] inventory_stock > stock_entries; inserting synthetic stock entry', {
      tenantId,
      itemId,
      invAvailable,
      entriesAvailable,
      delta,
      warehouseId,
    });

    const { error: insertErr } = await this.supabase
      .from('stock_entries')
      .insert({
        tenant_id: tenantId,
        item_id: itemId,
        warehouse_id: warehouseId,
        quantity: delta,
        available_quantity: delta,
        allocated_quantity: 0,
        unit_price: 0,
        metadata: {
          reconciled_from_inventory_stock: true,
          reason: 'inventory_stock showed more available than stock_entries',
          inv_available: invAvailable,
          entries_available: entriesAvailable,
          reconciled_at: new Date().toISOString(),
        },
      });

    if (insertErr) {
      // Don't block the flow; caller will still rely on stock_entries and may throw a shortage.
      console.error('[StockReconcile] Failed inserting synthetic stock entry', {
        tenantId,
        itemId,
        warehouseId,
        delta,
        error: formatErr(insertErr, 'ensureStock:insert'),
      });
    }
  }

  private async normalizeJobOrderMaterialRows(tenantId: string, materials: any[]): Promise<any[]> {
    const safeMaterials = Array.isArray(materials) ? materials : [];
    if (safeMaterials.length === 0) return safeMaterials;

    const candidateIds = new Set<string>();
    for (const m of safeMaterials) {
      const itemId = String(m?.item_id || '').trim();
      const variantId = String(m?.selected_variant_id || '').trim();
      if (itemId && this.isUuid(itemId)) candidateIds.add(itemId);
      if (variantId && this.isUuid(variantId)) candidateIds.add(variantId);
    }

    const idList = Array.from(candidateIds);
    if (idList.length === 0) return safeMaterials;

    const { data: existingItems } = await this.supabase
      .from('items')
      .select('id')
      .eq('tenant_id', tenantId)
      .in('id', idList);

    const existingItemIds = new Set(
      (existingItems || [])
        .map((r: any) => String(r?.id || '').trim())
        .filter(Boolean),
    );

    const missingIds = idList.filter((id) => !existingItemIds.has(id));
    if (missingIds.length === 0) return safeMaterials;

    const { data: bomHeaders } = await this.supabase
      .from('bom_headers')
      .select('id, item_id')
      .eq('tenant_id', tenantId)
      .in('id', missingIds);

    const headerIdToItemId = new Map<string, string>();
    for (const h of bomHeaders || []) {
      const headerId = String((h as any)?.id || '').trim();
      const mappedItemId = String((h as any)?.item_id || '').trim();
      if (headerId && mappedItemId && this.isUuid(mappedItemId)) {
        headerIdToItemId.set(headerId, mappedItemId);
      }
    }

    if (headerIdToItemId.size === 0) return safeMaterials;

    const nextMaterials = safeMaterials.map((m: any) => {
      const currentItemId = String(m?.item_id || '').trim();
      const currentVariantId = String(m?.selected_variant_id || '').trim();
      const mappedItemId = currentItemId ? headerIdToItemId.get(currentItemId) : undefined;
      const mappedVariantId = currentVariantId ? headerIdToItemId.get(currentVariantId) : undefined;
      return {
        ...m,
        item_id: mappedItemId || m.item_id,
        selected_variant_id: mappedVariantId || m.selected_variant_id,
      };
    });

    for (let i = 0; i < safeMaterials.length; i += 1) {
      const before = safeMaterials[i];
      const after = nextMaterials[i];
      const patch: any = {};

      const beforeItemId = String(before?.item_id || '').trim();
      const afterItemId = String(after?.item_id || '').trim();
      const beforeVariantId = String(before?.selected_variant_id || '').trim();
      const afterVariantId = String(after?.selected_variant_id || '').trim();

      if (afterItemId && afterItemId !== beforeItemId) patch.item_id = afterItemId;
      if (afterVariantId !== beforeVariantId) patch.selected_variant_id = afterVariantId || null;

      if (Object.keys(patch).length) {
        await this.supabase
          .from('job_order_materials')
          .update(patch)
          .eq('id', before.id);
      }
    }

    return nextMaterials;
  }

  private async getActiveBomForItem(tenantId: string, itemId: string): Promise<any | null> {
    // Prefer active BOM. If is_active is not present or no active exists, fall back to latest version.
    const { data: active } = await this.supabase
      .from('bom_headers')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('item_id', itemId)
      .eq('is_active', true)
      .order('version', { ascending: false })
      .limit(1);

    if (Array.isArray(active) && active.length > 0) return active[0];

    const { data: latest } = await this.supabase
      .from('bom_headers')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('item_id', itemId)
      .order('version', { ascending: false })
      .limit(1);

    if (Array.isArray(latest) && latest.length > 0) return latest[0];
    return null;
  }

  private async getBomById(tenantId: string, bomId: string): Promise<any | null> {
    const { data } = await this.supabase
      .from('bom_headers')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('id', bomId)
      .single();
    return data || null;
  }

  private async getBomItems(bomId: string): Promise<any[]> {
    const { data } = await this.supabase
      .from('bom_items')
      .select('*')
      .eq('bom_id', bomId)
      .order('sequence', { ascending: true });
    return Array.isArray(data) ? data : [];
  }

  private async getBomWithItemsAndRoutingForJobOrder(tenantId: string, bomId: string): Promise<any | null> {
    const { data: header, error: headerError } = await this.supabase
      .from('bom_headers')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('id', bomId)
      .single();

    if (headerError) throw new BadRequestException(headerError.message);
    if (!header) return null;

    const [itemsRes, routingRes] = await Promise.all([
      this.supabase
        .from('bom_items')
        .select('*')
        .eq('bom_id', bomId)
        .order('sequence', { ascending: true }),
      this.supabase
        .from('bom_routing')
        .select('*')
        .eq('bom_id', bomId)
        .order('operation_sequence', { ascending: true }),
    ]);

    if (itemsRes.error) throw new BadRequestException(itemsRes.error.message);
    if (routingRes.error) throw new BadRequestException(routingRes.error.message);

    return {
      ...header,
      bom_items: Array.isArray(itemsRes.data) ? itemsRes.data : [],
      bom_routing: Array.isArray(routingRes.data) ? routingRes.data : [],
    };
  }

  private async buildSmartExplosion(
    tenantId: string,
    bomId: string,
    multiplier: number,
    level: number,
    visitedBomIds: Set<string>,
    caches: {
      itemById: Map<string, any>;
      stockByItemId: Map<string, number>;
      bomById: Map<string, any>;
    },
    options?: {
      includeAllComponents?: boolean;
    },
  ): Promise<{ nodes: SmartExplosionNode[]; subAssemblies: SmartSubAssemblyPlan[] }> {
    if (multiplier <= 0) return { nodes: [], subAssemblies: [] };

    if (visitedBomIds.has(bomId)) {
      throw new BadRequestException('BOM cycle detected. Please check BOM hierarchy.');
    }
    visitedBomIds.add(bomId);

    const nodes: SmartExplosionNode[] = [];
    const subAssemblies: SmartSubAssemblyPlan[] = [];

    let bom = caches.bomById.get(bomId);
    if (!bom) {
      bom = await this.getBomById(tenantId, bomId);
      if (!bom) throw new NotFoundException('BOM not found');
      caches.bomById.set(bomId, bom);
    }

    const bomItems = await this.getBomItems(bomId);
    for (const bi of bomItems) {
      const lineQty = Number(bi.quantity) || 0;
      if (lineQty <= 0) continue;

      const requiredQuantity = lineQty * multiplier;

      const childBomId = (bi as any).child_bom_id || (bi as any).child_bomId || null;
      const itemId = (bi as any).item_id || (bi as any).itemId || null;

      if (childBomId) {
        let childBom = caches.bomById.get(childBomId);
        if (!childBom) {
          childBom = await this.getBomById(tenantId, childBomId);
          if (!childBom) throw new NotFoundException('Child BOM not found');
          caches.bomById.set(childBomId, childBom);
        }

        const subItemId = childBom.item_id;
        if (!subItemId) continue;

        let subItem = caches.itemById.get(subItemId);
        if (!subItem) {
          subItem = await this.getItemBasic(subItemId);
          if (!subItem) throw new NotFoundException('Item not found');
          caches.itemById.set(subItemId, subItem);
        }

        let available = caches.stockByItemId.get(subItemId);
        if (available === undefined) {
          available = await this.getAvailableStock(tenantId, subItemId);
          caches.stockByItemId.set(subItemId, available);
        }

        const toMakeQuantity = Math.max(0, requiredQuantity - available);

        nodes.push({
          level,
          componentType: 'BOM',
          bomId: childBomId,
          parentBomId: bomId,
          itemId: subItemId,
          itemCode: subItem.code,
          itemName: subItem.name,
          requiredQuantity,
          availableQuantity: available,
          toMakeQuantity,
          shortageQuantity: 0,
          uidStrategy: subItem.uid_strategy || subItem.uidStrategy || 'NONE',
          sequence: typeof (bi as any).sequence === 'number' ? (bi as any).sequence : Number((bi as any).sequence || 0) || undefined,
        });

        subAssemblies.push({
          bomId: childBomId,
          itemId: subItemId,
          itemCode: subItem.code,
          itemName: subItem.name,
          requiredQuantity,
          availableQuantity: available,
          toMakeQuantity,
        });

        // Always explode full required quantity (not just shortage) to include all raw materials
        // This ensures consistent shortage reporting across quantity changes
        const shouldExplodeChild = Boolean(options?.includeAllComponents) || requiredQuantity > 0;
        if (shouldExplodeChild) {
          const childResult = await this.buildSmartExplosion(
            tenantId,
            childBomId,
            requiredQuantity,
            level + 1,
            new Set(visitedBomIds),
            caches,
            options,
          );
          nodes.push(...childResult.nodes);
          subAssemblies.push(...childResult.subAssemblies);
        }

        continue;
      }

      if (itemId) {
        let item = caches.itemById.get(itemId);
        if (!item) {
          item = await this.getItemBasic(itemId);
          if (!item) throw new NotFoundException('Item not found');
          caches.itemById.set(itemId, item);
        }

        // If this item has its own BOM, treat it as a sub-assembly even if category/type is not set.
        // Many BOMs reference assemblies via item_id (without child_bom_id), so relying only on
        // category/type can cause assemblies to be treated as plain items and appear as "NO_STOCK".
        const subBom = await this.getActiveBomForItem(tenantId, itemId);
        
        // Debug: Log when an item has/doesn't have a BOM
        if (!subBom && (item.code?.startsWith('SA-') || item.code?.startsWith('ITEM-06'))) {
          console.log(`[SmartJO Explosion] Item ${item.code} (${itemId}) has NO BOM - treating as ITEM`);
        }
        
        if (subBom) {
          caches.bomById.set(subBom.id, subBom);

          let available = caches.stockByItemId.get(itemId);
          if (available === undefined) {
            available = await this.getAvailableStock(tenantId, itemId);
            caches.stockByItemId.set(itemId, available);
          }

          const toMakeQuantity = Math.max(0, requiredQuantity - available);

          nodes.push({
            level,
            componentType: 'BOM',
            bomId: subBom.id,
            parentBomId: bomId,
            itemId,
            itemCode: item.code,
            itemName: item.name,
            requiredQuantity,
            availableQuantity: available,
            toMakeQuantity,
            shortageQuantity: 0,
            uidStrategy: item.uid_strategy || item.uidStrategy || 'NONE',
            sequence: typeof (bi as any).sequence === 'number' ? (bi as any).sequence : Number((bi as any).sequence || 0) || undefined,
          });

          if (toMakeQuantity > 0) {
            subAssemblies.push({
              bomId: subBom.id,
              itemId,
              itemCode: item.code,
              itemName: item.name,
              requiredQuantity,
              availableQuantity: available,
              toMakeQuantity,
            });
          }

          const shouldExpandChild = Boolean(options?.includeAllComponents) || toMakeQuantity > 0;
          if (shouldExpandChild) {
            const nextMultiplier = Boolean(options?.includeAllComponents) ? requiredQuantity : toMakeQuantity;
            const childResult = await this.buildSmartExplosion(
              tenantId,
              subBom.id,
              nextMultiplier,
              level + 1,
              new Set(visitedBomIds),
              caches,
              options,
            );
            nodes.push(...childResult.nodes);
            subAssemblies.push(...childResult.subAssemblies);
          }

          continue;
        }

        // Standard ITEM component (not a subassembly or no BOM found)
        let available = caches.stockByItemId.get(itemId);
        if (available === undefined) {
          available = await this.getAvailableStock(tenantId, itemId);
          caches.stockByItemId.set(itemId, available);
        }

        const shortageQuantity = Math.max(0, requiredQuantity - available);

        nodes.push({
          level,
          componentType: 'ITEM',
          bomId,
          parentBomId: bomId,
          itemId,
          itemCode: item.code,
          itemName: item.name,
          requiredQuantity,
          availableQuantity: available,
          toMakeQuantity: 0,
          shortageQuantity,
          uidStrategy: item.uid_strategy || item.uidStrategy || 'NONE',
          sequence: typeof (bi as any).sequence === 'number' ? (bi as any).sequence : Number((bi as any).sequence || 0) || undefined,
        });
      }
    }

    return { nodes, subAssemblies };
  }

  async getSmartJobOrderPreview(tenantId: string, req: SmartJobOrderPreviewRequest) {
    if (!req?.itemId) throw new BadRequestException('itemId is required');
    if (!req?.quantity || Number(req.quantity) <= 0) throw new BadRequestException('quantity must be > 0');

    const finishedItem = await this.getItemBasic(req.itemId);
    if (!finishedItem) throw new NotFoundException('Item not found');

    const topBom = await this.getActiveBomForItem(tenantId, req.itemId);
    if (!topBom) {
      throw new BadRequestException('No BOM found for this item');
    }

    const caches = {
      itemById: new Map<string, any>([[finishedItem.id, finishedItem]]),
      stockByItemId: new Map<string, number>(),
      bomById: new Map<string, any>([[topBom.id, topBom]]),
    };

    const { nodes, subAssemblies } = await this.buildSmartExplosion(
      tenantId,
      topBom.id,
      Number(req.quantity),
      0,
      new Set<string>(),
      caches,
      { includeAllComponents: Boolean(req.includeAllComponents) },
    );

    // Log explosion results for debugging
    const bomNodes = nodes.filter((n: any) => n.componentType === 'BOM');
    const bomNodesWithStock = bomNodes.filter((n: any) => n.toMakeQuantity === 0);
    const bomNodesNeedMake = bomNodes.filter((n: any) => n.toMakeQuantity > 0);
    console.log(`[SmartJO Preview] Explosion results:`, {
      totalNodes: nodes.length,
      bomNodes: bomNodes.length,
      subAssembliesWithStock: bomNodesWithStock.length,
      subAssembliesNeedToMake: bomNodesNeedMake.length,
      subAssembliesBeforeDedup: subAssemblies.length,
    });
    if (bomNodesWithStock.length > 0) {
      console.log(`[SmartJO Preview] Sub-assemblies with existing stock (skipped):`, 
        bomNodesWithStock.map((n: any) => `${n.itemCode} (has ${n.availableQuantity})`).join(', '));
    }

    // De-dup sub assemblies by (bomId,itemId) keeping the max-toMake (covers repeated usage).
    const planMap = new Map<string, SmartSubAssemblyPlan>();
    for (const sa of subAssemblies) {
      const key = `${sa.bomId}:${sa.itemId}`;
      const existing = planMap.get(key);
      if (!existing || sa.toMakeQuantity > existing.toMakeQuantity) {
        planMap.set(key, sa);
      }
    }

    const requestedQuantity = Number(req.quantity) || 0;
    const itemNodes = (nodes || []).filter((n: any) => n?.componentType === 'ITEM');
    let maxProducibleQuantity = requestedQuantity;
    for (const node of itemNodes) {
      const requiredForRequested = Number((node as any)?.requiredQuantity || 0);
      if (requiredForRequested <= 0 || requestedQuantity <= 0) continue;

      const perUnitNeed = requiredForRequested / requestedQuantity;
      if (perUnitNeed <= 0) continue;

      const availableNow = Number((node as any)?.availableQuantity || 0);
      const possibleForThisItem = availableNow / perUnitNeed;
      if (Number.isFinite(possibleForThisItem)) {
        maxProducibleQuantity = Math.min(maxProducibleQuantity, Math.max(0, possibleForThisItem));
      }
    }

    if (!Number.isFinite(maxProducibleQuantity) || maxProducibleQuantity < 0) {
      maxProducibleQuantity = 0;
    }

    // For finished goods we plan in pieces, so floor to whole units.
    const makeNowQuantity = Math.max(0, Math.floor(maxProducibleQuantity));
    const shortageToTargetQuantity = Math.max(0, Math.floor(requestedQuantity - makeNowQuantity));

    return {
      finishedItem,
      quantity: Number(req.quantity),
      topBom: {
        id: topBom.id,
        version: topBom.version,
        is_active: (topBom as any).is_active,
      },
      nodes,
      subAssembliesToMake: Array.from(planMap.values()).sort((a, b) => b.toMakeQuantity - a.toMakeQuantity),
      makeNowQuantity,
      shortageToTargetQuantity,
      source: {
        salesOrderId: req.salesOrderId || null,
        salesOrderItemId: req.salesOrderItemId || null,
      },
    };
  }

  async createSmartJobOrder(tenantId: string, userId: string, req: SmartJobOrderCreateRequest) {
    const result = await this.createSmartJobOrderInternal(tenantId, userId, req);
    return {
      jobOrder: result.jobOrder,
      autoCompletedSubJobOrders: result.autoCompletedSubJobOrders,
      preview: result.preview,
    };
  }

  private async createSmartJobOrderInternal(
    tenantId: string,
    userId: string,
    req: SmartJobOrderCreateRequest,
    onProgress?: (p: SmartJobOrderCreateProgress) => void,
  ) {
    if (!req?.itemId) throw new BadRequestException('itemId is required');
    if (!req?.quantity || Number(req.quantity) <= 0) throw new BadRequestException('quantity must be > 0');

    const startDate = this.toStartDate(req.startDate);
    onProgress?.({ current: 0, total: 0, phase: 'PREVIEW', message: 'Building preview…' });

    const preview = await this.getSmartJobOrderPreview(tenantId, {
      itemId: req.itemId,
      quantity: Number(req.quantity),
      salesOrderId: req.salesOrderId,
      salesOrderItemId: req.salesOrderItemId,
    });

    const completedSubJobOrders: any[] = [];

    // Create deeper sub-assemblies first to satisfy nested BOM dependencies.
    const subAssemblyLevelByKey = new Map<string, number>();
    for (const n of (preview.nodes || []) as SmartExplosionNode[]) {
      if (n?.componentType !== 'BOM') continue;
      const key = `${String(n.bomId)}:${String(n.itemId)}`;
      const lvl = Number(n.level) || 0;
      const existing = subAssemblyLevelByKey.get(key);
      if (existing === undefined || lvl > existing) subAssemblyLevelByKey.set(key, lvl);
    }

    const subAssembliesToMakeAll = ([...(preview.subAssembliesToMake as SmartSubAssemblyPlan[] || [])]).sort((a, b) => {
      const aKey = `${String(a.bomId)}:${String(a.itemId)}`;
      const bKey = `${String(b.bomId)}:${String(b.itemId)}`;
      const aLvl = subAssemblyLevelByKey.get(aKey) ?? 0;
      const bLvl = subAssemblyLevelByKey.get(bKey) ?? 0;
      if (aLvl !== bLvl) return bLvl - aLvl; // deeper first
      return (Number(b.toMakeQuantity) || 0) - (Number(a.toMakeQuantity) || 0);
    });

    const subAssembliesToMake = subAssembliesToMakeAll.filter((sa) => Number(sa?.toMakeQuantity || 0) > 0);

    // Log the processing order for debugging
    console.log('[SmartJO] Sub-assembly processing order (deepest first):');
    for (const sa of subAssembliesToMake) {
      const key = `${String(sa.bomId)}:${String(sa.itemId)}`;
      const lvl = subAssemblyLevelByKey.get(key) ?? 0;
      console.log(`  Level ${lvl}: ${sa.itemCode} (qty: ${sa.toMakeQuantity})`);
    }
    const totalSteps = subAssembliesToMake.length + 1; // +1 for main job order
    let currentStep = 0;

    onProgress?.({
      current: 0,
      total: totalSteps,
      phase: 'SUB_ASSEMBLIES',
      message: subAssembliesToMake.length ? `Creating ${subAssembliesToMake.length} sub-assemblies…` : 'No sub-assemblies required',
    });

    // PHASE 1: Create ALL sub-assembly job orders first (without completing).
    // This ensures they all exist before we try to complete any of them.
    const createdSubJobOrders: Array<{ sa: SmartSubAssemblyPlan; jobOrder: any; completed: boolean }> = [];
    
    for (const sa of subAssembliesToMake) {
      currentStep += 1;
      onProgress?.({
        current: currentStep,
        total: totalSteps,
        phase: 'SUB_ASSEMBLIES',
        message: `Creating sub-assembly ${currentStep} of ${subAssembliesToMake.length}`,
        itemCode: sa.itemCode,
        itemName: sa.itemName,
      });

      console.log('[SmartJO] Creating sub-assembly job order:', {
        itemId: sa.itemId,
        itemCode: sa.itemCode,
        bomId: sa.bomId,
        quantity: sa.toMakeQuantity,
        level: subAssemblyLevelByKey.get(`${sa.bomId}:${sa.itemId}`) ?? 'unknown',
      });

      const created = await this.createFromBOMWithVariantSelections(tenantId, userId, {
        itemId: sa.itemId,
        bomId: sa.bomId,
        quantity: sa.toMakeQuantity,
        startDate,
        priority: 'NORMAL',
        notes: `Auto-created by Smart Job Order for ${preview.finishedItem.code}`,
        variantSelections: req.variantSelections,
        itemSelections: req.itemSelections,
      });

      createdSubJobOrders.push({ sa, jobOrder: created, completed: false });
    }

    console.log(`[SmartJO] Created ${createdSubJobOrders.length} sub-assembly job orders. Starting multi-pass completion...`);

    // PHASE 2: Complete sub-assemblies in multiple passes (deepest first).
    // Each pass completes sub-assemblies whose materials are now available.
    // This handles nested dependencies where SUB-A needs SUB-B's output.
    const MAX_COMPLETION_PASSES = 10;
    let passNumber = 0;
    let completedInLastPass = 0;

    do {
      passNumber += 1;
      completedInLastPass = 0;

      console.log(`[SmartJO] Completion pass ${passNumber}/${MAX_COMPLETION_PASSES}...`);

      for (const entry of createdSubJobOrders) {
        if (entry.completed) continue;

        const { sa, jobOrder } = entry;

        // Check if this sub-assembly's materials are now available
        const { data: materialsRaw } = await this.supabase
          .from('job_order_materials')
          .select('id, item_id, selected_variant_id, required_quantity')
          .eq('job_order_id', jobOrder.id);

        let materials = Array.isArray(materialsRaw) ? materialsRaw : [];
        try {
          materials = await this.normalizeJobOrderMaterialRows(tenantId, materials);
        } catch (e: any) {
          console.warn('[SmartJO] Material normalization skipped during availability check:', e?.message || e);
        }

        let allMaterialsAvailable = true;
        for (const mat of (materials || [])) {
          const needed = Number(mat.required_quantity) || 0;
          if (needed <= 0) continue;

          const itemIdToCheck = (mat as any)?.selected_variant_id || (mat as any)?.item_id;
          if (!this.isUuid(String(itemIdToCheck || ''))) {
            allMaterialsAvailable = false;
            console.log(`[SmartJO] ${sa.itemCode}: Material has invalid item id (cannot check stock)`);
            break;
          }

          const available = await this.getAvailableStock(tenantId, itemIdToCheck);
          if (available < needed) {
            allMaterialsAvailable = false;
            console.log(`[SmartJO] ${sa.itemCode}: Material ${mat.item_id} insufficient (need ${needed}, have ${available})`);
            break;
          }
        }

        if (!allMaterialsAvailable) {
          console.log(`[SmartJO] ${sa.itemCode}: Skipping completion pass ${passNumber} - materials not yet available`);
          continue;
        }

        try {
          // Set to IN_PROGRESS so completeJobOrder can run
          await this.supabase
            .from('production_job_orders')
            .update({ status: 'IN_PROGRESS', actual_start_date: new Date().toISOString() })
            .eq('id', jobOrder.id);

          // Complete the job order (consume materials, generate UIDs)
          const completed = await this.completeJobOrder(tenantId, jobOrder.id, userId, { allowPartialConsumption: false });
          completedSubJobOrders.push(completed);

          // Auto-approve QC to create stock immediately
          const { data: uidRows, error: uidErr } = await this.supabase
            .from('uid_registry')
            .select('uid')
            .eq('tenant_id', tenantId)
            .eq('job_order_id', jobOrder.id);

          if (uidErr) throw new BadRequestException(uidErr.message);
          const uids = (uidRows || [])
            .map((r: any) => String(r?.uid || '').trim())
            .filter(Boolean);

          if (uids.length === 0) {
            throw new BadRequestException(
              `Failed to auto-approve QC for sub-assembly ${sa.itemCode}: no UIDs found for job order ${jobOrder.id}`,
            );
          }

          // SRV-first workflow: create SRV (SYSTEM) before QC release.
          await this.receiveStoreReceiptVoucher(tenantId, jobOrder.id, userId, { receiverName: 'SYSTEM' });
          await this.approveQC(tenantId, jobOrder.id, uids, [], userId);

          entry.completed = true;
          completedInLastPass += 1;
          console.log(`[SmartJO] ${sa.itemCode}: Completed and QC approved (pass ${passNumber})`);
        } catch (err: any) {
          console.error(`[SmartJO] ${sa.itemCode}: Failed to complete in pass ${passNumber}:`, err?.message || err);
          // Don't throw - try again in next pass
        }
      }

      console.log(`[SmartJO] Pass ${passNumber} completed: ${completedInLastPass} sub-assemblies finished`);

    } while (completedInLastPass > 0 && passNumber < MAX_COMPLETION_PASSES);

    // Check if all sub-assemblies were completed
    const incompleteSubAssemblies = createdSubJobOrders.filter((e) => !e.completed);
    if (incompleteSubAssemblies.length > 0) {
      const incompleteList = incompleteSubAssemblies.map((e) => e.sa.itemCode).join(', ');
      console.warn(`[SmartJO] ${incompleteSubAssemblies.length} sub-assemblies could not be completed: ${incompleteList}`);
      console.warn(`[SmartJO] This usually means raw materials are missing. Please GRN the required materials first.`);
      // Don't throw - let the main JO be created, user can see the issue in the materials preview
    }

    // Create the main finished-goods job order. Keep it as-is (typically PLANNED) for shop floor execution.
    onProgress?.({
      current: subAssembliesToMake.length + 1,
      total: totalSteps,
      phase: 'MAIN_JOB_ORDER',
      message: 'Creating main finished-goods job order…',
      itemCode: preview.finishedItem.code,
      itemName: preview.finishedItem.name,
    });

    const mainNotesParts: string[] = ['Created via Smart Job Order'];
    if (preview.source?.salesOrderId) mainNotesParts.push(`SalesOrder: ${preview.source.salesOrderId}`);
    if (preview.source?.salesOrderItemId) mainNotesParts.push(`SOItem: ${preview.source.salesOrderItemId}`);

    const main = await this.createFromBOMWithVariantSelections(tenantId, userId, {
      itemId: preview.finishedItem.id,
      bomId: preview.topBom.id,
      quantity: preview.quantity,
      startDate,
      salesOrderId: preview.source?.salesOrderId || undefined,
      salesOrderItemId: preview.source?.salesOrderItemId || undefined,
      priority: 'NORMAL',
      notes: mainNotesParts.join(' | '),
      variantSelections: req.variantSelections,
      itemSelections: req.itemSelections,
    });

    // Do NOT auto-issue materials for the main job order.
    // Materials will appear as a Material Requisition in the SIV (Store Issue Voucher) screen
    // so the storekeeper can physically verify and issue inventory.
    console.log('[JobOrderService] Smart job order created:', {
      jobOrderId: main.id,
      jobOrderNumber: main.job_order_number,
      note: 'Materials NOT auto-issued — will appear in SIV for manual issue',
    });

    const issueMaterialsSummary = null;

    const mainWithMaterials = await this.findOne(tenantId, main.id);
    onProgress?.({ current: totalSteps, total: totalSteps, phase: 'DONE', message: 'Done' });

    return {
      jobOrder: mainWithMaterials,
      autoCompletedSubJobOrders: completedSubJobOrders,
      preview,
      issueMaterialsSummary,
      _progressTotal: totalSteps,
    };
  }

  /**
   * Force auto-complete DRAFT job orders with sub-assemblies.
   * Transitions DRAFT → IN_PROGRESS → COMPLETED with auto-approval.
   * Used when BOMs have sub-assemblies and should auto-complete like other job orders.
   */
  async forceAutoCompleteDraftJobOrder(
    tenantId: string,
    jobOrderId: string,
    userId?: string,
  ) {
    const { data: jobOrder, error: joErr } = await this.supabase
      .from('production_job_orders')
      .select('*, job_order_materials(*)')
      .eq('tenant_id', tenantId)
      .eq('id', jobOrderId)
      .single();

    if (joErr || !jobOrder) throw new NotFoundException('Job order not found');
    if (jobOrder.status !== 'DRAFT') {
      throw new BadRequestException(`Cannot force-complete job order with status ${jobOrder.status}. Only DRAFT jobs can be force-completed.`);
    }

    this.logger.log('[ForceAutoComplete] Starting for DRAFT job order:', {
      jobOrderId,
      jobOrderNumber: jobOrder.job_order_number,
      hasMaterials: Array.isArray(jobOrder.job_order_materials),
    });

    // Transition DRAFT → IN_PROGRESS
    await this.supabase
      .from('production_job_orders')
      .update({ status: 'IN_PROGRESS', actual_start_date: new Date().toISOString() })
      .eq('id', jobOrderId);

    // Complete the job order
    const completed = await this.completeJobOrder(tenantId, jobOrderId, userId, {
      allowPartialConsumption: true,
      autoBuildMissingSubAssemblies: true,
    });

    // Auto-approve QC to immediately create stock
    const { data: uidRows, error: uidErr } = await this.supabase
      .from('uid_registry')
      .select('uid')
      .eq('tenant_id', tenantId)
      .eq('job_order_id', jobOrderId);

    if (!uidErr && uidRows && uidRows.length > 0) {
      const uids = uidRows.map((r: any) => String(r?.uid || '').trim()).filter(Boolean);
      try {
        // SRV-first workflow: create SRV (SYSTEM) before QC release.
        await this.receiveStoreReceiptVoucher(tenantId, jobOrderId, userId, { receiverName: 'SYSTEM' });
        await this.approveQC(tenantId, jobOrderId, uids, [], userId);
        this.logger.log('[ForceAutoComplete] QC auto-approved for UIDs:', uids.length);
      } catch (qcErr: any) {
        this.logger.warn('[ForceAutoComplete] QC auto-approval failed (non-fatal):', qcErr?.message);
      }
    }

    this.logger.log('[ForceAutoComplete] Completed successfully');
    return completed;
  }
}
