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
    | 'FETCH_STOCK'
    | 'UPDATE_STOCK_ENTRY'
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

  private async issueJobOrderMaterials(tenantId: string, jobOrderId: string): Promise<JobOrderIssueMaterialsSummary> {
    const startedAt = Date.now();

    this.logger.log('[SmartJO] issueJobOrderMaterials called');
    this.logger.log(JSON.stringify({ tenantId, jobOrderId }));
    
    const { data: jobOrder } = await this.supabase
      .from('production_job_orders')
      .select('*, job_order_materials(*)')
      .eq('tenant_id', tenantId)
      .eq('id', jobOrderId)
      .single();

    if (!jobOrder) throw new NotFoundException('Job order not found');

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
        const { data: found } = await this.supabase
          .from('items')
          .select('id, code')
          .eq('tenant_id', tenantId)
          .ilike('code', code)
          .limit(1);

        const row = Array.isArray(found) ? found[0] : null;
        if (row?.id) {
          itemIdByCode.set(code, String(row.id));
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
        .eq('id', jobOrderId);

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
      jobOrderId,
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

    const first = await this.issueJobOrderMaterials(tenantId, jobOrderId);
    first.autoRepair = {
      requested: autoRepairRequested,
      attempted: false,
      triggered: false,
    };

    if (!autoRepairRequested) return first;

    // Only attempt auto-repair if issuing is completely blocked by NO_STOCK.
    // This is aimed at legacy Smart JOs created before the improved BOM explosion logic.
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
      .eq('id', jobOrderId)
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
      JSON.stringify({ tenantId, jobOrderId, jobOrderNumber: (joRow as any)?.job_order_number || null, noStockFailures: noStockFailures.length }),
    );

    first.autoRepair.attempted = true;

    try {
      const repaired = await this.repairSmartJobOrderAndIssueMaterials(tenantId, userId, jobOrderId);
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

    const { data: jobOrder, error: jobOrderError } = await this.supabase
      .from('production_job_orders')
      .select('id, tenant_id, item_id, job_order_number, quantity, start_date, status')
      .eq('tenant_id', tenantId)
      .eq('id', jobOrderId)
      .single();

    if (jobOrderError) throw new BadRequestException(jobOrderError.message);
    if (!jobOrder) throw new NotFoundException('Job order not found');

    const status = String(jobOrder.status || '');
    if (status === 'COMPLETED' || status === 'CANCELLED') {
      throw new BadRequestException('Cannot repair/issue materials for a completed/cancelled job order');
    }

    const startDate = this.toStartDate(String((jobOrder as any).start_date || ''));

    // Rebuild Smart JO preview using the *current* BOM explosion logic.
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
      .eq('job_order_id', jobOrderId);

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
        jobOrderId,
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
    const issueMaterialsSummary = await this.issueJobOrderMaterials(tenantId, jobOrderId);

    return {
      jobOrderId,
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

    if (filters?.search) {
      query = query.or(`job_order_number.ilike.%${filters.search}%,item_code.ilike.%${filters.search}%,item_name.ilike.%${filters.search}%`);
    }

    const { data, error } = await query;

    if (error) throw new BadRequestException(error.message);

    return data || [];
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

  async createFromBOM(tenantId: string, userId: string, itemId: string, bomId: string, quantity: number, startDate: string) {
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

    return this.create(tenantId, userId, {
      itemId,
      bomId,
      quantity,
      startDate,
      operations,
      materials,
    });
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
    // Get job order with materials
    const { data: jobOrder } = await this.supabase
      .from('production_job_orders')
      .select('*, job_order_materials(*)')
      .eq('tenant_id', tenantId)
      .eq('id', jobOrderId)
      .single();

    if (!jobOrder) throw new NotFoundException('Job order not found');
    if (jobOrder.status !== 'IN_PROGRESS') {
      throw new BadRequestException('Job order must be IN_PROGRESS to complete');
    }

    const allowPartial = Boolean(options?.allowPartialConsumption);
    const autoBuildMissingSubAssemblies = options?.autoBuildMissingSubAssemblies ?? true;

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
    // This is intentionally conservative: only triggers for items that have an active BOM.
    if (!allowPartial && autoBuildMissingSubAssemblies) {
      if (!userId) {
        throw new BadRequestException('userId is required to auto-build missing sub-assemblies');
      }

      const startDate = this.toStartDate(String((jobOrder as any)?.start_date || ''));
      const materials = Array.isArray(jobOrder.job_order_materials) ? jobOrder.job_order_materials : [];

      for (const material of materials) {
        const requiredQty = Number(material.required_quantity) || 0;
        const alreadyIssued = Number(material.issued_quantity) || 0;
        const consumeQty = Math.max(0, requiredQty - alreadyIssued);
        if (consumeQty <= 0) continue;

        const itemIdToConsume = material.selected_variant_id || material.item_id;
        if (!this.isUuid(String(itemIdToConsume || ''))) continue;

        const available = await this.getAvailableStock(tenantId, String(itemIdToConsume));
        const shortage = Math.max(0, consumeQty - available);
        if (shortage <= 0) continue;

        const bom = await this.getActiveBomForItem(tenantId, String(itemIdToConsume));
        if (!bom?.id) continue; // No BOM => raw material; cannot auto-build.

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
      const { data: refreshed } = await this.supabase
        .from('production_job_orders')
        .select('*, job_order_materials(*)')
        .eq('tenant_id', tenantId)
        .eq('id', jobOrderId)
        .single();
      if (refreshed?.job_order_materials) {
        jobOrder.job_order_materials = refreshed.job_order_materials;
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

      // 3. Generate UIDs for finished goods
      // NOTE: Stock will NOT be added until QC approval
      const quantityProduced = Math.max(0, Number(jobOrder.quantity) || 0);
      const uidsCreated = await this.generateJobOrderUids(
        tenantId,
        userId,
        jobOrder,
        finishedItem,
        quantityProduced,
        'COMPLETE',
      );

      if (uidsCreated.length !== quantityProduced) {
        throw new BadRequestException(
          `Failed to generate UIDs for this job order. Needed ${quantityProduced}, created ${uidsCreated.length}.`,
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
    const { data: allUids } = await this.supabase
      .from('uid_registry')
      .select('uid, status')
      .eq('tenant_id', tenantId)
      .eq('job_order_id', jobOrderId);

    if (!allUids || allUids.length === 0) {
      throw new BadRequestException('No UIDs found for this job order');
    }

    const totalUids = allUids.length;
    const providedCount = approvedUids.length + rejectedUids.length;

    if (providedCount !== totalUids) {
      throw new BadRequestException(
        `Total UIDs mismatch. Job order has ${totalUids} UIDs, but ${providedCount} were provided for QC`
      );
    }

    try {
      // 0. Idempotency: avoid adding stock multiple times if QC is submitted again
      const { data: existingQcStockEntries, error: existingQcStockError } = await this.supabase
        .from('stock_entries')
        .select('id, metadata')
        .eq('tenant_id', tenantId)
        .eq('item_id', jobOrder.item_id)
        .eq('metadata->>created_from', 'QC_APPROVAL')
        .eq('metadata->>job_order_id', jobOrderId);

      if (existingQcStockError) {
        throw new BadRequestException(existingQcStockError.message);
      }

      const alreadyApprovedUidSet = new Set<string>();
      for (const entry of existingQcStockEntries || []) {
        const approvedList = (entry as any)?.metadata?.approved_uids;
        if (Array.isArray(approvedList)) {
          for (const u of approvedList) {
            const s = String(u || '').trim();
            if (s) alreadyApprovedUidSet.add(s);
          }
        }
      }

      const newlyApprovedUids = (approvedUids || []).filter((u) => !alreadyApprovedUidSet.has(u));

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
              quality_status: 'ON_HOLD',
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

      // 3. Add stock ONLY for approved UIDs
      if (newlyApprovedUids.length > 0) {
        // Get warehouse
        const { data: warehouses } = await this.supabase
          .from('warehouses')
          .select('id')
          .eq('tenant_id', tenantId)
          .limit(1);

        if (!warehouses || warehouses.length === 0) {
          throw new BadRequestException('No warehouse configured');
        }

        const warehouseId = warehouses[0].id;

        const { data: itemRow, error: itemErr } = await this.supabase
          .from('items')
          .select('category')
          .eq('tenant_id', tenantId)
          .eq('id', jobOrder.item_id)
          .single();

        if (itemErr) {
          throw new BadRequestException(itemErr.message);
        }

        // Add stock entry for approved quantity
        const { error: addError } = await this.supabase
          .from('stock_entries')
          .insert({
            tenant_id: tenantId,
            item_id: jobOrder.item_id,
            warehouse_id: warehouseId,
            quantity: newlyApprovedUids.length,
            available_quantity: newlyApprovedUids.length,
            allocated_quantity: 0,
            metadata: {
              created_from: 'QC_APPROVAL',
              job_order_id: jobOrderId,
              job_order_number: jobOrder.job_order_number,
              total_produced: totalUids,
              qc_approved: approvedUids.length,
              qc_rejected: rejectedUids.length,
              approved_uids: newlyApprovedUids,
            },
          });

        if (addError) {
          console.error('Error adding approved stock:', addError);
          throw new BadRequestException(`Failed to add stock: ${addError.message}`);
        }

        // Keep inventory_stock in sync (used by Smart JO preview + other modules)
        const { error: invError } = await this.supabase.rpc('adjust_inventory_stock', {
          p_tenant_id: tenantId,
          p_item_id: jobOrder.item_id,
          p_warehouse_id: warehouseId,
          p_location_id: null,
          p_quantity_change: newlyApprovedUids.length,
          p_category: normalizeInventoryCategory(itemRow?.category, 'WIP'),
        });

        if (invError) {
          console.error('Error syncing inventory_stock after QC approval:', invError);
          throw new BadRequestException(`Failed to sync inventory stock: ${invError.message}`);
        }
      }

      console.log(`[QC Approval] Job Order ${jobOrder.job_order_number}: ${approvedUids.length} approved, ${rejectedUids.length} rejected`);
      console.log(`[QC Approval] Added ${newlyApprovedUids.length} new units to stock (idempotent)`);

      return {
        jobOrderId,
        jobOrderNumber: jobOrder.job_order_number,
        totalProduced: totalUids,
        qcApproved: approvedUids.length,
        qcRejected: rejectedUids.length,
        stockAdded: newlyApprovedUids.length,
        message:
          newlyApprovedUids.length === 0
            ? `QC already applied: no new approved UIDs to add to stock.`
            : `QC Complete: ${newlyApprovedUids.length} approved units added to stock, ${rejectedUids.length} rejected`,
      };
    } catch (error) {
      console.error('Error during QC approval:', error);
      throw error;
    }
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
      .eq('metadata->>created_from', 'QC_APPROVAL')
      .eq('metadata->>job_order_id', jobOrderId);

    if (qcStockError) throw new BadRequestException(qcStockError.message);

    const entries = Array.isArray(qcStockEntries) ? qcStockEntries : [];
    const stockAdded = entries.reduce(
      (sum, e: any) => sum + (Number(e?.quantity) || 0),
      0,
    );

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
      if (Array.isArray(approved)) {
        for (const u of approved) {
          const s = String(u || '').trim();
          if (s) approvedUidSet.add(s);
        }
      }
    }

    return {
      jobOrderId: jobOrder.id,
      jobOrderNumber: jobOrder.job_order_number,
      status: jobOrder.status,
      qcStockEntriesCount: entries.length,
      stockAdded,
      approvedUidsCount: approvedUidSet.size,
      isQcApplied: entries.length > 0,
      qcAppliedAt,
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
      .select('id, item_id, selected_variant_id, required_quantity')
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

    // Fetch stock entries for all relevant items in one shot
    const { data: stockEntries, error: stockError } = itemIds.length
      ? await this.supabase
          .from('stock_entries')
          .select('item_id, available_quantity, allocated_quantity')
          .eq('tenant_id', tenantId)
          .in('item_id', itemIds)
      : { data: [], error: null };

    if (stockError) throw new BadRequestException(stockError.message);

    const stockByItemId = new Map<string, { available: number; allocated: number }>();
    for (const entry of stockEntries || []) {
      const itemId = String((entry as any)?.item_id || '').trim();
      if (!itemId) continue;
      const prev = stockByItemId.get(itemId) || { available: 0, allocated: 0 };
      prev.available += parseFloat(String((entry as any)?.available_quantity ?? '0')) || 0;
      prev.allocated += parseFloat(String((entry as any)?.allocated_quantity ?? '0')) || 0;
      stockByItemId.set(itemId, prev);
    }

    const finishedItemId = String(jobOrder.item_id || '').trim();
    const finishedItem = itemById.get(finishedItemId);
    const finishedStock = stockByItemId.get(finishedItemId) || { available: 0, allocated: 0 };

    const quantityToAdd = Number(jobOrder.quantity) || 0;
    const currentFinishedStock = finishedStock.available;
    const newFinishedStock = currentFinishedStock + quantityToAdd;

    const materialsToConsume = materialsList.map((material: any) => {
      const materialItemId = String((material?.selected_variant_id || material?.item_id) || '').trim();
      const materialItem = itemById.get(materialItemId);
      const materialStock = stockByItemId.get(materialItemId) || { available: 0, allocated: 0 };
      const toConsume = Number(material?.required_quantity) || 0;
      const currentStock = materialStock.available;
      const reservedStock = materialStock.allocated;
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
        toConsume,
        currentStock,
        reservedStock,
        newStock,
        autoBuildable,
        autoBuildQuantity,
        status,
        sufficient: currentStock >= toConsume || autoBuildable,
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
    // IMPORTANT: Smart JO issuing consumes from stock_entries FIFO.
    // If we use inventory_stock here, Smart preview can be wrong when inventory_stock
    // drifts (e.g. when some flows only update stock_entries).
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
        });

        if (toMakeQuantity > 0) {
          subAssemblies.push({
            bomId: childBomId,
            itemId: subItemId,
            itemCode: subItem.code,
            itemName: subItem.name,
            requiredQuantity,
            availableQuantity: available,
            toMakeQuantity,
          });
        }

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

          const shouldExplodeChild = Boolean(options?.includeAllComponents) || toMakeQuantity > 0;
          if (shouldExplodeChild) {
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

    const subAssembliesToMakeAll = ([...(preview.subAssembliesToMake as SmartSubAssemblyPlan[])] || []).sort((a, b) => {
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
      priority: 'NORMAL',
      notes: mainNotesParts.join(' | '),
      variantSelections: req.variantSelections,
      itemSelections: req.itemSelections,
    });

    // Issue materials for the main job order (reduce stock for sub-assemblies + raw materials).
    // At this point, all raw materials should already be in stock (user fulfilled shortages during planning),
    // and sub-assemblies were just created and QC-approved above.
    console.log('[JobOrderService] Smart job order created:', {
      jobOrderId: main.id,
      jobOrderNumber: main.job_order_number,
      note: 'Issuing materials (sub-assemblies + raw materials)',
    });

    onProgress?.({
      current: totalSteps,
      total: totalSteps,
      phase: 'ISSUE_MATERIALS',
      message: 'Issuing materials (reducing stock)…',
    });

    // CRITICAL FIX: Retry issuing with inline repair for nested sub-assemblies.
    // The preview may only capture ONE level of missing sub-assemblies, but deeper nested
    // items won't have stock until we recursively build them.
    const MAX_ISSUE_RETRIES = 5;
    let issueMaterialsSummary: JobOrderIssueMaterialsSummary | { error: string } | null = null;
    let retryCount = 0;

    while (retryCount < MAX_ISSUE_RETRIES) {
      retryCount += 1;
      try {
        const summary = await this.issueJobOrderMaterials(tenantId, main.id);
        issueMaterialsSummary = summary;

        // If all materials are issued (no noStockLines), we're done
        if (summary.noStockLines === 0) {
          console.log(`[JobOrderService] All materials issued for ${main.job_order_number} on attempt ${retryCount}`);
          break;
        }

        console.log(`[JobOrderService] Issuing attempt ${retryCount}: ${summary.issuedLines} issued, ${summary.noStockLines} no-stock`);

        // Still have no-stock lines - identify which items need sub-assemblies built
        const noStockItemIds = summary.failures
          .filter((f) => f.message === 'NO_STOCK_AVAILABLE' && f.itemId)
          .map((f) => f.itemId!);

        if (noStockItemIds.length === 0) {
          console.log('[JobOrderService] No recoverable no-stock items, stopping retry loop');
          break;
        }

        // For each no-stock item, check if it has a BOM and build it
        let builtAny = false;
        for (const itemId of noStockItemIds) {
          const bom = await this.getActiveBomForItem(tenantId, itemId);
          if (!bom?.id) continue; // No BOM = raw material, can't auto-build

          // Check current stock
          const currentStock = await this.getAvailableStock(tenantId, itemId);
          if (currentStock > 0) continue; // Already have some stock now

          // Find required quantity from pending materials
          const { data: pendingMat } = await this.supabase
            .from('job_order_materials')
            .select('item_id, item_code, required_quantity, issued_quantity')
            .eq('job_order_id', main.id)
            .eq('item_id', itemId)
            .single();

          const needed = Math.max(0, (Number(pendingMat?.required_quantity) || 1) - (Number(pendingMat?.issued_quantity) || 0));
          if (needed <= 0) continue;

          console.log(`[JobOrderService] Auto-building missing sub-assembly: ${pendingMat?.item_code || itemId} x${needed}`);

          // Create, complete, and QC approve the sub-assembly
          const created = await this.createFromBOMWithVariantSelections(tenantId, userId, {
            itemId,
            bomId: bom.id,
            quantity: needed,
            startDate,
            priority: 'NORMAL',
            notes: `Auto-created by Smart JO for ${main.job_order_number} (nested dependency)`,
            variantSelections: req.variantSelections,
            itemSelections: req.itemSelections,
          });

          await this.supabase
            .from('production_job_orders')
            .update({ status: 'IN_PROGRESS', actual_start_date: new Date().toISOString() })
            .eq('id', created.id);

          await this.completeJobOrder(tenantId, created.id, userId, { allowPartialConsumption: true });
          completedSubJobOrders.push(created);

          const { data: uidRows } = await this.supabase
            .from('uid_registry')
            .select('uid')
            .eq('tenant_id', tenantId)
            .eq('job_order_id', created.id);

          const uids = (uidRows || []).map((r: any) => String(r?.uid || '').trim()).filter(Boolean);
          if (uids.length > 0) {
            await this.approveQC(tenantId, created.id, uids, [], userId);
          }

          builtAny = true;
        }

        if (!builtAny) {
          console.log('[JobOrderService] Could not build any more sub-assemblies, stopping retry loop');
          break;
        }

        // Loop will retry issuing with the newly created stock
      } catch (issueError: any) {
        console.error(`[JobOrderService] Issue attempt ${retryCount} failed:`, issueError);
        issueMaterialsSummary = { error: issueError?.message || 'Failed to issue materials' };
        break;
      }
    }

    if (retryCount >= MAX_ISSUE_RETRIES) {
      console.warn(`[JobOrderService] Reached max retries (${MAX_ISSUE_RETRIES}) for issuing materials`);
    }

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
}
