import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { createClient } from '@supabase/supabase-js';
import { CreateJobOrderDto, UpdateJobOrderDto, UpdateOperationDto } from '../dto/job-order.dto';
import { UidSupabaseService } from '../../uid/services/uid-supabase.service';

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
  private supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_KEY!,
  );

  constructor(private readonly uidService: UidSupabaseService) {}

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

  private async issueJobOrderMaterials(tenantId: string, jobOrderId: string) {
    console.log('[JobOrderService] issueJobOrderMaterials called', { tenantId, jobOrderId });
    
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

    console.log('[JobOrderService] Found', jobOrder.job_order_materials?.length || 0, 'materials to issue');

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

      const itemIdToConsume = material.selected_variant_id || material.item_id;
      if (!this.isUuid(String(itemIdToConsume || ''))) {
        console.error('[JobOrderService] Invalid item_id for material:', material.item_code, itemIdToConsume);
        throw new BadRequestException(`Invalid material itemId for consumption: ${String(itemIdToConsume)}`);
      }

      console.log('[JobOrderService] Issuing material:', {
        code: material.item_code,
        itemId: itemIdToConsume,
        requiredQty,
        alreadyIssued,
        consumeQty,
      });

      const { data: item } = await this.supabase
        .from('items')
        .select('code, name')
        .eq('id', itemIdToConsume)
        .single();

      const { data: stockEntries } = await this.supabase
        .from('stock_entries')
        .select('*')
        .eq('tenant_id', tenantId)
        .eq('item_id', itemIdToConsume)
        .gt('available_quantity', 0)
        .order('created_at', { ascending: true});

      if (!stockEntries || stockEntries.length === 0) {
        console.error('[JobOrderService] No stock entries found for:', item?.code);
        throw new BadRequestException(`Failed to issue ${item?.code || ''}: Item not found in inventory`);
      }

      const totalAvailable = stockEntries.reduce(
        (sum, entry) => sum + parseFloat(entry.available_quantity.toString()),
        0,
      );

      console.log('[JobOrderService] Stock available:', {
        code: item?.code,
        totalAvailable,
        needed: consumeQty,
        entries: stockEntries.length,
      });

      if (totalAvailable < consumeQty) {
        throw new BadRequestException(
          `Failed to issue ${item?.code || ''}: Insufficient stock. Need ${consumeQty}, have ${totalAvailable}`,
        );
      }

      let remainingToConsume = consumeQty;
      for (const entry of stockEntries) {
        if (remainingToConsume <= 0) break;

        const entryAvailable = parseFloat(entry.available_quantity.toString());
        const toConsumeFromEntry = Math.min(entryAvailable, remainingToConsume);
        const newAvailable = entryAvailable - toConsumeFromEntry;

        console.log('[JobOrderService] Consuming from stock entry:', {
          entryId: entry.id,
          before: entryAvailable,
          consuming: toConsumeFromEntry,
          after: newAvailable,
        });

        const { error: updateError } = await this.supabase
          .from('stock_entries')
          .update({
            available_quantity: newAvailable,
            updated_at: new Date().toISOString(),
          })
          .eq('id', entry.id);

        if (updateError) {
          console.error('[JobOrderService] Failed to update stock entry:', updateError);
          throw new BadRequestException(`Failed to issue ${item?.code || ''}: ${updateError.message}`);
        }

        remainingToConsume -= toConsumeFromEntry;
      }

      const nextIssued = alreadyIssued + consumeQty;
      console.log('[JobOrderService] Material issued successfully:', {
        code: material.item_code,
        issued: nextIssued,
        required: requiredQty,
        status: nextIssued >= requiredQty ? 'ISSUED' : 'PARTIAL',
      });
      
      await this.supabase
        .from('job_order_materials')
        .update({
          issued_quantity: nextIssued,
          status: nextIssued >= requiredQty ? 'ISSUED' : 'PARTIAL',
        })
        .eq('id', material.id);
    }

    // Move JO to IN_PROGRESS once materials are issued
    if (status !== 'IN_PROGRESS') {
      await this.supabase
        .from('production_job_orders')
        .update({ status: 'IN_PROGRESS', actual_start_date: new Date().toISOString() })
        .eq('tenant_id', tenantId)
        .eq('id', jobOrderId);
    }
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

    // Check material availability if materials are provided
    if (normalizedMaterials && normalizedMaterials.length > 0) {
      const availability = await this.checkMaterialAvailability(tenantId, normalizedMaterials, dto.quantity);
      if (!availability.available) {
        throw new BadRequestException(
          `Insufficient materials:\n${availability.shortages.map(s => 
            `${s.itemCode} - ${s.itemName}: Need ${s.required}, Available ${s.available}, Short ${s.shortage}`
          ).join('\n')}`
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

  async completeJobOrder(tenantId: string, jobOrderId: string, userId?: string) {
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
          throw new BadRequestException(`Failed to consume ${item?.code}: Item not found in inventory`);
        }

        // Calculate total available
        const totalAvailable = stockEntries.reduce(
          (sum, entry) => sum + parseFloat(entry.available_quantity.toString()),
          0,
        );

        if (totalAvailable < consumeQty) {
          throw new BadRequestException(
            `Failed to consume ${item?.code}: Insufficient stock. Need ${consumeQty}, have ${totalAvailable}`,
          );
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

          remainingToConsume -= toConsumeFromEntry;
        }

        // Update material issued quantity
        await this.supabase
          .from('job_order_materials')
          .update({ 
            issued_quantity: alreadyIssued + consumeQty,
            status: 'ISSUED'
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
    const { data: materials, error: materialsError } = await this.supabase
      .from('job_order_materials')
      .select('item_id, required_quantity')
      .eq('job_order_id', jobOrderId);

    if (materialsError) throw new BadRequestException(materialsError.message);
    const materialsList = Array.isArray(materials) ? materials : [];

    const itemIds = Array.from(
      new Set(
        [jobOrder.item_id, ...materialsList.map((m: any) => m?.item_id)]
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
      const materialItemId = String(material?.item_id || '').trim();
      const materialItem = itemById.get(materialItemId);
      const materialStock = stockByItemId.get(materialItemId) || { available: 0, allocated: 0 };
      const toConsume = Number(material?.required_quantity) || 0;
      const currentStock = materialStock.available;
      const reservedStock = materialStock.allocated;
      const newStock = currentStock - toConsume;
      return {
        itemId: materialItemId,
        itemCode: materialItem?.code || 'Unknown',
        itemName: materialItem?.name || 'Unknown',
        toConsume,
        currentStock,
        reservedStock,
        newStock,
        sufficient: currentStock >= toConsume,
      };
    });

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
    const { data } = await this.supabase.rpc('get_item_stock_summary', {
      p_item_id: itemId,
      p_tenant_id: tenantId,
    });

    const summary = Array.isArray(data) && data.length > 0 ? data[0] : null;
    return Number(summary?.available_quantity) || 0;
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

        const shouldExplodeChild = Boolean(options?.includeAllComponents) || toMakeQuantity > 0;
        if (shouldExplodeChild) {
          const nextMultiplier = Boolean(options?.includeAllComponents) ? requiredQuantity : toMakeQuantity;
          const childResult = await this.buildSmartExplosion(
            tenantId,
            childBomId,
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

      if (itemId) {
        let item = caches.itemById.get(itemId);
        if (!item) {
          item = await this.getItemBasic(itemId);
          if (!item) throw new NotFoundException('Item not found');
          caches.itemById.set(itemId, item);
        }

        // Infer if this item is actually a subassembly and should be treated as BOM
        const isSubassembly = item.category === 'SUBASSEMBLY' || item.type === 'SUBASSEMBLY';
        if (isSubassembly) {
          // Attempt to find an active BOM for this subassembly
          const subBom = await this.getActiveBomForItem(tenantId, itemId);
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
    if (!req?.itemId) throw new BadRequestException('itemId is required');
    if (!req?.quantity || Number(req.quantity) <= 0) throw new BadRequestException('quantity must be > 0');

    const startDate = this.toStartDate(req.startDate);
    const preview = await this.getSmartJobOrderPreview(tenantId, {
      itemId: req.itemId,
      quantity: Number(req.quantity),
      salesOrderId: req.salesOrderId,
      salesOrderItemId: req.salesOrderItemId,
    });

    const completedSubJobOrders: any[] = [];

    // Auto-create and auto-complete missing sub assemblies.
    for (const sa of preview.subAssembliesToMake as SmartSubAssemblyPlan[]) {
      if (sa.toMakeQuantity <= 0) continue;

      console.log('[JobOrderService] Creating sub-assembly:', {
        itemId: sa.itemId,
        itemCode: sa.itemCode,
        bomId: sa.bomId,
        quantity: sa.toMakeQuantity,
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

      // Ensure status is IN_PROGRESS so completeJobOrder can run.
      await this.supabase
        .from('production_job_orders')
        .update({ status: 'IN_PROGRESS', actual_start_date: new Date().toISOString() })
        .eq('id', created.id);

      const completed = await this.completeJobOrder(tenantId, created.id, userId);
      completedSubJobOrders.push(completed);
    }

    // Create the main finished-goods job order. Keep it as-is (typically PLANNED) for shop floor execution.
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

    // Smart job order UX expects stock to reduce immediately upon creation.
    // Issue materials for the main job order (does NOT add finished goods stock).
    const shouldAutoIssue = req.autoIssueMaterials !== false;
    console.log('[JobOrderService] Smart job order created:', {
      jobOrderId: main.id,
      jobOrderNumber: main.job_order_number,
      shouldAutoIssue,
    });
    
    if (shouldAutoIssue) {
      await this.issueJobOrderMaterials(tenantId, main.id);
      console.log('[JobOrderService] Materials issued successfully for', main.job_order_number);
    }

    const mainWithMaterials = shouldAutoIssue ? await this.findOne(tenantId, main.id) : main;

    return {
      jobOrder: mainWithMaterials,
      autoCompletedSubJobOrders: completedSubJobOrders,
      preview,
    };
  }
}
