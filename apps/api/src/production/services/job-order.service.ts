import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { createClient } from '@supabase/supabase-js';
import { CreateJobOrderDto, UpdateJobOrderDto, UpdateOperationDto } from '../dto/job-order.dto';

@Injectable()
export class JobOrderService {
  private supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_KEY!,
  );

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
    // Get BOM details
    const { data: bom } = await this.supabase
      .from('bom')
      .select(`
        *,
        bom_items(*, items(code, name)),
        bom_routing(*, workstations(id, name))
      `)
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

  private async checkMaterialAvailability(tenantId: string, materials: any[], jobQuantity: number) {
    const shortages = [];

    for (const material of materials) {
      const required = material.requiredQuantity * jobQuantity;

      // Get available stock from inventory
      const { data: stock } = await this.supabase
        .from('inventory_stock')
        .select('available_quantity, item:items(code, name)')
        .eq('tenant_id', tenantId)
        .eq('item_id', material.itemId)
        .maybeSingle();

      const available = stock?.available_quantity || 0;

      if (available < required) {
        const item = stock?.item as any;
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

    return {
      available: shortages.length === 0,
      shortages,
    };
  }

  async completeJobOrder(tenantId: string, jobOrderId: string) {
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
      // 1. Consume materials from inventory
      for (const material of jobOrder.job_order_materials) {
        const consumeQty = material.required_quantity;

        // Update inventory stock
        const { error: stockError } = await this.supabase.rpc('consume_inventory', {
          p_tenant_id: tenantId,
          p_item_id: material.item_id,
          p_quantity: consumeQty,
        });

        if (stockError) {
          console.error('Error consuming inventory:', stockError);
          throw new BadRequestException(`Failed to consume ${material.item_code}: ${stockError.message}`);
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

      // 2. Add finished goods to inventory
      const { error: addError } = await this.supabase.rpc('add_to_inventory', {
        p_tenant_id: tenantId,
        p_item_id: jobOrder.item_id,
        p_quantity: jobOrder.quantity,
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

    // Get current stock for finished item
    const { data: finishedStock } = await this.supabase
      .from('inventory_stock')
      .select('total_quantity, available_quantity, reserved_quantity')
      .eq('tenant_id', tenantId)
      .eq('item_id', jobOrder.item_id)
      .maybeSingle();

    const currentFinishedStock = finishedStock?.available_quantity ? parseFloat(finishedStock.available_quantity.toString()) : 0;
    const newFinishedStock = currentFinishedStock + jobOrder.quantity;

    // Get current stock for each material
    const materialsWithStock = await Promise.all(
      jobOrder.job_order_materials.map(async (material: any) => {
        const { data: stock } = await this.supabase
          .from('inventory_stock')
          .select('total_quantity, available_quantity, reserved_quantity')
          .eq('tenant_id', tenantId)
          .eq('item_id', material.item_id)
          .maybeSingle();

        const currentStock = stock?.available_quantity ? parseFloat(stock.available_quantity.toString()) : 0;
        const reservedStock = stock?.reserved_quantity ? parseFloat(stock.reserved_quantity.toString()) : 0;
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
