import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { createClient } from '@supabase/supabase-js';
import { CreateJobOrderDto, UpdateJobOrderDto, UpdateOperationDto } from '../dto/job-order.dto';
import { UidSupabaseService } from '../../uid/services/uid-supabase.service';

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
    // Get BOM details from bom_headers (new schema)
    const { data: bom } = await this.supabase
      .from('bom_headers')
      .select(`
        *,
        items!bom_headers_item_id_fkey(code, name, type)
      `)
      .eq('id', bomId)
      .eq('tenant_id', tenantId)
      .single();

    if (!bom) throw new NotFoundException('BOM not found');

    // Explode BOM recursively to get all actual leaf items needed
    const explodedItems = await this.explodeBOMRecursively(bomId, quantity, tenantId);
    
    console.log('[JobOrderService] Exploded BOM items:', explodedItems);

    // Create materials from exploded items (only actual items, not sub-assemblies)
    const materials = explodedItems.map((item: any) => ({
      itemId: item.itemId,
      requiredQuantity: item.quantity,
    }));

    // TODO: Get routing/operations if they exist in the future
    const operations: any[] = [];

    return this.create(tenantId, userId, {
      itemId,
      bomId,
      quantity,
      startDate,
      operations,
      materials,
    });
  }

  /**
   * Recursively explode BOM to get all leaf items (raw materials/components)
   * Handles multi-level BOMs with sub-assemblies
   */
  private async explodeBOMRecursively(
    bomId: string,
    quantity: number,
    tenantId: string,
    level: number = 0
  ): Promise<Array<{ itemId: string; quantity: number }>> {
    const indent = '  '.repeat(level);
    console.log(`${indent}[BOM EXPLODE] Level ${level}: BOM ID=${bomId}, Quantity=${quantity}`);

    const { data: bomItems } = await this.supabase
      .from('bom_items')
      .select('component_type, item_id, child_bom_id, quantity, scrap_percentage')
      .eq('bom_id', bomId);

    console.log(`${indent}[BOM EXPLODE] Found ${bomItems?.length || 0} components`);

    if (!bomItems || bomItems.length === 0) return [];

    const allItems: Map<string, number> = new Map();

    for (const bomItem of bomItems) {
      const scrapFactor = 1 + (bomItem.scrap_percentage || 0) / 100;
      const adjustedQty = bomItem.quantity * quantity * scrapFactor;

      console.log(`${indent}[BOM EXPLODE] Component: type=${bomItem.component_type}, qty=${bomItem.quantity}, scrap=${bomItem.scrap_percentage}%, adjustedQty=${adjustedQty}`);

      if (bomItem.component_type === 'ITEM' && bomItem.item_id) {
        // Direct item - this is a leaf node
        console.log(`${indent}[BOM EXPLODE] → Adding ITEM ${bomItem.item_id}: ${adjustedQty} units`);
        const existing = allItems.get(bomItem.item_id) || 0;
        allItems.set(bomItem.item_id, existing + adjustedQty);
      } else if (bomItem.component_type === 'BOM' && bomItem.child_bom_id) {
        // Sub-assembly - recursively explode it
        console.log(`${indent}[BOM EXPLODE] → Recursing into child BOM ${bomItem.child_bom_id} with qty=${adjustedQty}`);
        const childItems = await this.explodeBOMRecursively(bomItem.child_bom_id, adjustedQty, tenantId, level + 1);
        console.log(`${indent}[BOM EXPLODE] ← Child BOM returned ${childItems.length} items`);

        childItems.forEach((childItem) => {
          const existing = allItems.get(childItem.itemId) || 0;
          const newQty = existing + childItem.quantity;
          console.log(`${indent}[BOM EXPLODE]   Aggregating item ${childItem.itemId}: +${childItem.quantity} = ${newQty}`);
          allItems.set(childItem.itemId, newQty);
        });
      }
    }

    const result = Array.from(allItems.entries()).map(([itemId, qty]) => ({
      itemId,
      quantity: qty,
    }));

    console.log(
      `${indent}[BOM EXPLODE] Level ${level} returning ${result.length} unique items:`,
      result.map((r) => `${r.itemId}:${r.quantity}`).join(', ')
    );

    return result;
  }

  private async checkMaterialAvailability(tenantId: string, materials: any[], jobQuantity: number) {
    console.log('[JobOrderService] checkMaterialAvailability - tenantId:', tenantId);
    console.log('[JobOrderService] checkMaterialAvailability - materials:', materials);
    console.log('[JobOrderService] checkMaterialAvailability - jobQuantity:', jobQuantity);
    
    const shortages = [];

    for (const material of materials) {
      const required = material.requiredQuantity * jobQuantity;

      // Get available stock from stock_entries
      const { data: stockEntries, error } = await this.supabase
        .from('stock_entries')
        .select('available_quantity, item_id')
        .eq('tenant_id', tenantId)
        .eq('item_id', material.itemId);

      console.log('[JobOrderService] Stock check for item:', material.itemId);
      console.log('[JobOrderService] Stock entries found:', stockEntries);
      console.log('[JobOrderService] Stock query error:', error);

      // Sum up available quantity across all stock entries for this item
      const available = stockEntries?.reduce((sum, entry) => sum + (Number(entry.available_quantity) || 0), 0) || 0;
      
      console.log('[JobOrderService] Required:', required, 'Available:', available);

      if (available < required) {
        // Fetch item details
        const { data: item } = await this.supabase
          .from('items')
          .select('code, name')
          .eq('id', material.itemId)
          .single();

        shortages.push({
          itemId: material.itemId,
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

        // Get item details
        const { data: item } = await this.supabase
          .from('items')
          .select('code, name')
          .eq('id', material.item_id)
          .single();

        // Get available stock entries for this material
        const { data: stockEntries } = await this.supabase
          .from('stock_entries')
          .select('*')
          .eq('tenant_id', tenantId)
          .eq('item_id', material.item_id)
          .gt('available_quantity', 0)
          .order('created_at', { ascending: true });

        if (!stockEntries || stockEntries.length === 0) {
          throw new BadRequestException(`Failed to consume ${item?.code}: Item not found in inventory`);
        }

        // Calculate total available
        const totalAvailable = stockEntries.reduce((sum, entry) => sum + parseFloat(entry.available_quantity.toString()), 0);
        
        if (totalAvailable < consumeQty) {
          throw new BadRequestException(`Failed to consume ${item?.code}: Insufficient stock. Need ${consumeQty}, have ${totalAvailable}`);
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
              updated_at: new Date().toISOString()
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
          }
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
}
