import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { createClient } from '@supabase/supabase-js';
import { CreateJobOrderDto, UpdateJobOrderDto, UpdateOperationDto } from '../dto/job-order.dto';
import { UidSupabaseService } from '../../uid/services/uid-supabase.service';

type SmartJobOrderPreviewRequest = {
  itemId: string;
  quantity: number;
  salesOrderId?: string;
  salesOrderItemId?: string;
};

type SmartJobOrderCreateRequest = {
  itemId: string;
  quantity: number;
  startDate?: string;
  salesOrderId?: string;
  salesOrderItemId?: string;
  variantSelections?: Record<string, string>;
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

  async create(tenantId: string, userId: string, dto: CreateJobOrderDto) {
    // Get item details
    const { data: item } = await this.supabase
      .from('items')
      .select('code, name')
      .eq('id', dto.itemId)
      .single();

    if (!item) throw new NotFoundException('Item not found');

    // Check material availability if materials are provided
    if (dto.materials && dto.materials.length > 0) {
      const availability = await this.checkMaterialAvailability(tenantId, dto.materials, dto.quantity);
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

      await this.supabase.from('job_order_operations').insert(operations);
    }

    // Create materials if provided
    if (dto.materials && dto.materials.length > 0) {
      const materials = await Promise.all(
        dto.materials.map(async (mat) => {
          const { data: matItem } = await this.supabase
            .from('items')
            .select('code, name')
            .eq('id', mat.itemId)
            .single();

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

      await this.supabase.from('job_order_materials').insert(materials);
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
    // Get BOM details
    const { data: bom } = await this.supabase
      .from('bom_headers')
      .select(`
        *,
        bom_items(*, items(code, name)),
        bom_routing(*, workstations(id, name))
      `)
      .eq('tenant_id', tenantId)
      .eq('id', bomId)
      .single();

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

    // Create materials from BOM items
    const materials = (bom.bom_items || []).map((item: any) => ({
      itemId: item.item_id,
      requiredQuantity: item.quantity * quantity,
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
    },
  ) {
    const { data: bom } = await this.supabase
      .from('bom_headers')
      .select(`
        *,
        bom_items(*, items(code, name)),
        bom_routing(*, workstations(id, name))
      `)
      .eq('tenant_id', tenantId)
      .eq('id', args.bomId)
      .single();

    if (!bom) throw new NotFoundException('BOM not found');

    const operations = (bom.bom_routing || []).map((route: any, idx: number) => ({
      sequenceNumber: route.operation_sequence || (idx + 1) * 10,
      operationName: route.operation_name,
      workstationId: route.workstation_id,
      expectedDurationHours: route.cycle_time || 0,
      setupTimeHours: route.setup_time || 0,
      acceptedVariationPercent: 5,
    }));

    const materials = (bom.bom_items || []).map((item: any) => {
      const baseItemId = item.item_id;
      const selectionKey = `${args.bomId}:${baseItemId}`;
      const selectedVariantId = args.variantSelections?.[selectionKey];

      return {
        itemId: baseItemId,
        requiredQuantity: item.quantity * args.quantity,
        selectedVariantId: selectedVariantId && selectedVariantId !== baseItemId ? selectedVariantId : undefined,
      };
    });

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
    console.log('[JobOrderService] checkMaterialAvailability - materials:', materials);
    console.log('[JobOrderService] checkMaterialAvailability - jobQuantity:', jobQuantity);
    
    const shortages = [];

    for (const material of materials) {
      const required = material.requiredQuantity;  // Don't multiply by jobQuantity - it's already included in requiredQuantity

      const itemIdToCheck = material.selectedVariantId || material.selected_variant_id || material.itemId;

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

      if (available < required) {
        // Fetch item details
        const { data: item } = await this.supabase
          .from('items')
          .select('code, name')
          .eq('id', itemIdToCheck)
          .single();

        shortages.push({
          itemId: itemIdToCheck,
          itemCode: item?.code || 'Unknown',
          itemName: item?.name || 'Unknown',
          required,
          available,
          shortage: required - available,
        });
      }
    }

    console.log('[JobOrderService] Final shortages:', shortages);
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
        const consumeQty = material.required_quantity;

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
            issued_quantity: consumeQty,
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
      const quantityProduced = jobOrder.quantity;
      const uidsCreated = [];

      // Determine entity type based on item category
      let entityType = 'FG'; // Finished Good
      if (finishedItem.category?.includes('SUB_ASSEMBLY') || finishedItem.category?.includes('ASSEMBLY')) {
        entityType = 'SA'; // Sub Assembly
      } else if (finishedItem.category?.includes('COMPONENT')) {
        entityType = 'CP';
      }

      console.log(`[JobOrder] Generating ${quantityProduced} UIDs for ${finishedItem.code}, entityType: ${entityType}`);

      for (let i = 0; i < quantityProduced; i++) {
        // Generate UID
        const uid = await this.uidService.generateUID(
          'SAIF', // tenant code
          'MFG',  // plant code
          entityType,
        );

        // Create UID record with job order trail
        const { error: uidError } = await this.supabase
          .from('uid_registry')
          .insert({
            tenant_id: tenantId,
            uid: uid,
            entity_type: entityType,
            entity_id: finishedItem.id,
            job_order_id: jobOrderId,
            location: 'Production',
            status: 'GENERATED',
            lifecycle: JSON.stringify([
              {
                stage: 'PRODUCED',
                timestamp: new Date().toISOString(),
                location: 'Production',
                reference: `JOB ORDER ${jobOrder.job_order_number}`,
                user: userId,
              },
            ]),
            metadata: JSON.stringify({
              item_code: finishedItem.code,
              item_name: finishedItem.name,
              job_order_id: jobOrderId,
              job_order_number: jobOrder.job_order_number,
              production_date: new Date().toISOString(),
            }),
          });

        if (!uidError) {
          uidsCreated.push(uid);
        } else {
          console.error('[JobOrder] UID generation error:', uidError);
        }
      }

      console.log(`[JobOrder] Generated ${uidsCreated.length} UIDs for job order ${jobOrder.job_order_number}`);

      const { error: addError } = await this.supabase
        .from('stock_entries')
        .insert({
          tenant_id: tenantId,
          item_id: jobOrder.item_id,
          warehouse_id: warehouseId,
          quantity: jobOrder.quantity,
          available_quantity: jobOrder.quantity,
          allocated_quantity: 0,
          metadata: {
            created_from: 'JOB_ORDER_COMPLETION',
            job_order_id: jobOrderId,
            job_order_number: jobOrder.job_order_number,
            uids_generated: uidsCreated.length,
          },
        });

      if (addError) {
        console.error('Error adding finished goods:', addError);
        throw new BadRequestException(`Failed to add finished goods: ${addError.message}`);
      }

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

  async getCompletionPreview(tenantId: string, jobOrderId: string) {
    // Get job order with materials and finished item
    const { data: jobOrder } = await this.supabase
      .from('production_job_orders')
      .select(`
        *,
        job_order_materials(*, item:items(code, name)),
        finished_item:items!production_job_orders_item_id_fkey(code, name)
      `)
      .eq('tenant_id', tenantId)
      .eq('id', jobOrderId)
      .single();

    if (!jobOrder) throw new NotFoundException('Job order not found');

    // Get current stock for finished item from stock_entries
    const { data: finishedStockEntries } = await this.supabase
      .from('stock_entries')
      .select('available_quantity')
      .eq('tenant_id', tenantId)
      .eq('item_id', jobOrder.item_id);

    const currentFinishedStock = finishedStockEntries?.reduce((sum, entry) => sum + (parseFloat(entry.available_quantity?.toString() || '0')), 0) || 0;
    const newFinishedStock = currentFinishedStock + jobOrder.quantity;

    // Get current stock for each material from stock_entries
    const materialsWithStock = await Promise.all(
      jobOrder.job_order_materials.map(async (material: any) => {
        const { data: stockEntries } = await this.supabase
          .from('stock_entries')
          .select('available_quantity, allocated_quantity')
          .eq('tenant_id', tenantId)
          .eq('item_id', material.item_id);

        const currentStock = stockEntries?.reduce((sum, entry) => sum + (parseFloat(entry.available_quantity?.toString() || '0')), 0) || 0;
        const reservedStock = stockEntries?.reduce((sum, entry) => sum + (parseFloat(entry.allocated_quantity?.toString() || '0')), 0) || 0;
        const newStock = currentStock - material.required_quantity;

        return {
          itemId: material.item_id,
          itemCode: material.item?.code || 'Unknown',
          itemName: material.item?.name || 'Unknown',
          toConsume: material.required_quantity,
          currentStock: currentStock,
          reservedStock: reservedStock,
          newStock: newStock,
          sufficient: currentStock >= material.required_quantity,
        };
      })
    );

    return {
      jobOrderNumber: jobOrder.job_order_number,
      finishedProduct: {
        itemCode: jobOrder.finished_item?.code || 'Unknown',
        itemName: jobOrder.finished_item?.name || 'Unknown',
        quantityToAdd: jobOrder.quantity,
        currentStock: currentFinishedStock,
        newStock: newFinishedStock,
      },
      materialsToConsume: materialsWithStock,
      canComplete: materialsWithStock.every(m => m.sufficient),
      insufficientMaterials: materialsWithStock.filter(m => !m.sufficient),
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

          const childResult = await this.buildSmartExplosion(
            tenantId,
            childBomId,
            toMakeQuantity,
            level + 1,
            new Set(visitedBomIds),
            caches,
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

              const childResult = await this.buildSmartExplosion(
                tenantId,
                subBom.id,
                toMakeQuantity,
                level + 1,
                new Set(visitedBomIds),
                caches,
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

      const created = await this.createFromBOMWithVariantSelections(tenantId, userId, {
        itemId: sa.itemId,
        bomId: sa.bomId,
        quantity: sa.toMakeQuantity,
        startDate,
        priority: 'NORMAL',
        notes: `Auto-created by Smart Job Order for ${preview.finishedItem.code}`,
        variantSelections: req.variantSelections,
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
    });

    return {
      jobOrder: main,
      autoCompletedSubJobOrders: completedSubJobOrders,
      preview,
    };
  }
}
