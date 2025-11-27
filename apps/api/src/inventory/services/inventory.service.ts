import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { SupabaseService } from '../../supabase/supabase.service';
import { Request } from 'express';

@Injectable()
export class InventoryService {
  constructor(private readonly supabase: SupabaseService) {}

  // Get current stock levels with filters
  async getStockLevels(req: Request, filters?: any) {
    const supabaseClient = this.supabase.getClient();
    const { tenantId } = req.user as any;

    let query = supabaseClient
      .from('inventory_stock')
      .select(`
        *,
        items:item_id(id, item_code, item_name, uom),
        warehouses:warehouse_id(id, warehouse_code, warehouse_name),
        storage_locations:location_id(id, location_code, location_name)
      `)
      .eq('tenant_id', tenantId);

    if (filters?.warehouse_id) {
      query = query.eq('warehouse_id', filters.warehouse_id);
    }

    if (filters?.category) {
      query = query.eq('category', filters.category);
    }

    if (filters?.item_id) {
      query = query.eq('item_id', filters.item_id);
    }

    if (filters?.low_stock) {
      query = query.filter('available_quantity', 'lte', 'reorder_point');
    }

    const { data, error } = await query.order('updated_at', { ascending: false });

    if (error) throw new BadRequestException(error.message);
    return data;
  }

  // Get stock movements history
  async getStockMovements(req: Request, filters?: any) {
    const supabaseClient = this.supabase.getClient();
    const { tenantId } = req.user as any;

    let query = supabaseClient
      .from('stock_movements')
      .select(`
        *,
        items:item_id(id, item_code, item_name),
        from_warehouse:from_warehouse_id(warehouse_code, warehouse_name),
        to_warehouse:to_warehouse_id(warehouse_code, warehouse_name)
      `)
      .eq('tenant_id', tenantId);

    if (filters?.movement_type) {
      query = query.eq('movement_type', filters.movement_type);
    }

    if (filters?.item_id) {
      query = query.eq('item_id', filters.item_id);
    }

    if (filters?.uid) {
      query = query.eq('uid', filters.uid);
    }

    if (filters?.from_date) {
      query = query.gte('movement_date', filters.from_date);
    }

    if (filters?.to_date) {
      query = query.lte('movement_date', filters.to_date);
    }

    const { data, error } = await query
      .order('movement_date', { ascending: false })
      .limit(filters?.limit || 100);

    if (error) throw new BadRequestException(error.message);
    return data;
  }

  // Create stock movement (generic)
  async createStockMovement(req: Request, movementData: any) {
    const supabaseClient = this.supabase.getClient();
    const { tenantId, userId } = req.user as any;

    // Generate movement number
    const movementNumber = await this.generateMovementNumber(req, movementData.movement_type);

    const movement = {
      tenant_id: tenantId,
      movement_number: movementNumber,
      movement_type: movementData.movement_type,
      item_id: movementData.item_id,
      uid: movementData.uid,
      from_warehouse_id: movementData.from_warehouse_id,
      from_location_id: movementData.from_location_id,
      to_warehouse_id: movementData.to_warehouse_id,
      to_location_id: movementData.to_location_id,
      quantity: movementData.quantity,
      reference_type: movementData.reference_type,
      reference_id: movementData.reference_id,
      reference_number: movementData.reference_number,
      batch_number: movementData.batch_number,
      notes: movementData.notes,
      moved_by: userId,
      movement_date: movementData.movement_date || new Date().toISOString(),
    };

    // Insert movement
    const { data: movementRecord, error: movementError } = await supabaseClient
      .from('stock_movements')
      .insert(movement)
      .select()
      .single();

    if (movementError) throw new BadRequestException(movementError.message);

    // Update stock levels
    await this.updateStockLevels(req, movementData);

    // Check for low stock alerts
    await this.checkLowStockAlerts(req, movementData.item_id, movementData.to_warehouse_id || movementData.from_warehouse_id);

    return movementRecord;
  }

  // Update stock levels after movement
  private async updateStockLevels(req: Request, movementData: any) {
    const supabaseClient = this.supabase.getClient();
    const { tenantId } = req.user as any;

    // Decrease from source warehouse
    if (movementData.from_warehouse_id) {
      await this.adjustStock(
        req,
        movementData.item_id,
        movementData.from_warehouse_id,
        movementData.from_location_id,
        -movementData.quantity
      );
    }

    // Increase at destination warehouse
    if (movementData.to_warehouse_id) {
      await this.adjustStock(
        req,
        movementData.item_id,
        movementData.to_warehouse_id,
        movementData.to_location_id,
        movementData.quantity,
        movementData.category
      );
    }
  }

  // Adjust stock quantity (upsert)
  private async adjustStock(
    req: Request,
    itemId: string,
    warehouseId: string,
    locationId: string | null,
    quantityChange: number,
    category?: string
  ) {
    const supabaseClient = this.supabase.getClient();
    const { tenantId } = req.user as any;

    // Get current stock
    const { data: currentStock } = await supabaseClient
      .from('inventory_stock')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('item_id', itemId)
      .eq('warehouse_id', warehouseId)
      .eq('location_id', locationId || 'null')
      .maybeSingle();

    if (currentStock) {
      // Update existing stock
      const newQuantity = parseFloat(currentStock.quantity) + quantityChange;
      await supabaseClient
        .from('inventory_stock')
        .update({
          quantity: newQuantity,
          last_movement_date: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', currentStock.id);
    } else {
      // Create new stock record (for receipts)
      if (quantityChange > 0) {
        await supabaseClient.from('inventory_stock').insert({
          tenant_id: tenantId,
          item_id: itemId,
          warehouse_id: warehouseId,
          location_id: locationId,
          category: category || 'RAW_MATERIAL',
          quantity: quantityChange,
          last_movement_date: new Date().toISOString(),
        });
      }
    }
  }

  // Generate movement number
  private async generateMovementNumber(req: Request, movementType: string): Promise<string> {
    const supabaseClient = this.supabase.getClient();
    const { tenantId } = req.user as any;

    const prefix = this.getMovementPrefix(movementType);
    const { count } = await supabaseClient
      .from('stock_movements')
      .select('*', { count: 'exact', head: true })
      .eq('tenant_id', tenantId)
      .like('movement_number', `${prefix}%`);

    return `${prefix}${String((count || 0) + 1).padStart(6, '0')}`;
  }

  private getMovementPrefix(movementType: string): string {
    const prefixes = {
      GRN_RECEIPT: 'RCP-',
      PRODUCTION_ISSUE: 'ISS-',
      PRODUCTION_RETURN: 'RET-',
      PRODUCTION_RECEIPT: 'PRD-',
      SALES_ISSUE: 'SAL-',
      DEMO_ISSUE: 'DMO-',
      DEMO_RETURN: 'DMR-',
      DEMO_SOLD: 'DMS-',
      SERVICE_ISSUE: 'SRV-',
      TRANSFER: 'TRN-',
      ADJUSTMENT: 'ADJ-',
      SCRAP: 'SCR-',
    };
    return prefixes[movementType] || 'MOV-';
  }

  // Reserve stock for production/sales
  async reserveStock(req: Request, reservationData: any) {
    const supabaseClient = this.supabase.getClient();
    const { tenantId, userId } = req.user as any;

    // Check available quantity
    const { data: stock } = await supabaseClient
      .from('inventory_stock')
      .select('available_quantity')
      .eq('tenant_id', tenantId)
      .eq('item_id', reservationData.item_id)
      .eq('warehouse_id', reservationData.warehouse_id)
      .single();

    if (!stock || parseFloat(stock.available_quantity) < reservationData.reserved_quantity) {
      throw new BadRequestException('Insufficient stock available for reservation');
    }

    // Create reservation
    const reservation = {
      tenant_id: tenantId,
      item_id: reservationData.item_id,
      warehouse_id: reservationData.warehouse_id,
      reserved_quantity: reservationData.reserved_quantity,
      reference_type: reservationData.reference_type,
      reference_id: reservationData.reference_id,
      reference_number: reservationData.reference_number,
      reserved_by: userId,
      expires_at: reservationData.expires_at,
    };

    const { data, error } = await supabaseClient
      .from('stock_reservations')
      .insert(reservation)
      .select()
      .single();

    if (error) throw new BadRequestException(error.message);

    // Update stock reserved_quantity
    await supabaseClient.rpc('increment_reserved_quantity', {
      p_tenant_id: tenantId,
      p_item_id: reservationData.item_id,
      p_warehouse_id: reservationData.warehouse_id,
      p_quantity: reservationData.reserved_quantity,
    });

    return data;
  }

  // Release stock reservation
  async releaseReservation(req: Request, reservationId: string) {
    const supabaseClient = this.supabase.getClient();
    const { tenantId } = req.user as any;

    const { data: reservation } = await supabaseClient
      .from('stock_reservations')
      .select('*')
      .eq('id', reservationId)
      .eq('tenant_id', tenantId)
      .single();

    if (!reservation) throw new NotFoundException('Reservation not found');

    // Update reservation
    await supabaseClient
      .from('stock_reservations')
      .update({ released: true, released_at: new Date().toISOString() })
      .eq('id', reservationId);

    // Decrease stock reserved_quantity
    await supabaseClient.rpc('decrement_reserved_quantity', {
      p_tenant_id: tenantId,
      p_item_id: reservation.item_id,
      p_warehouse_id: reservation.warehouse_id,
      p_quantity: reservation.reserved_quantity,
    });

    return { message: 'Reservation released successfully' };
  }

  // Check and create low stock alerts
  private async checkLowStockAlerts(req: Request, itemId: string, warehouseId: string) {
    const supabaseClient = this.supabase.getClient();
    const { tenantId } = req.user as any;

    const { data: stock } = await supabaseClient
      .from('inventory_stock')
      .select('*, items:item_id(item_code, item_name)')
      .eq('tenant_id', tenantId)
      .eq('item_id', itemId)
      .eq('warehouse_id', warehouseId)
      .single();

    if (stock && parseFloat(stock.available_quantity) <= parseFloat(stock.reorder_point)) {
      // Check if alert already exists
      const { data: existingAlert } = await supabaseClient
        .from('inventory_alerts')
        .select('id')
        .eq('tenant_id', tenantId)
        .eq('item_id', itemId)
        .eq('warehouse_id', warehouseId)
        .eq('alert_type', 'LOW_STOCK')
        .eq('acknowledged', false)
        .maybeSingle();

      if (!existingAlert) {
        await supabaseClient.from('inventory_alerts').insert({
          tenant_id: tenantId,
          alert_type: 'LOW_STOCK',
          item_id: itemId,
          warehouse_id: warehouseId,
          current_quantity: stock.available_quantity,
          threshold_quantity: stock.reorder_point,
          message: `Low stock alert: ${stock.items.item_name} (${stock.items.item_code}) - Available: ${stock.available_quantity}, Reorder Point: ${stock.reorder_point}`,
          severity: parseFloat(stock.available_quantity) <= 0 ? 'CRITICAL' : 'HIGH',
        });
      }
    }
  }

  // Get inventory alerts
  async getAlerts(req: Request, acknowledged?: boolean) {
    const supabaseClient = this.supabase.getClient();
    const { tenantId } = req.user as any;

    let query = supabaseClient
      .from('inventory_alerts')
      .select(`
        *,
        items:item_id(item_code, item_name),
        warehouses:warehouse_id(warehouse_code, warehouse_name)
      `)
      .eq('tenant_id', tenantId);

    if (acknowledged !== undefined) {
      query = query.eq('acknowledged', acknowledged);
    }

    const { data, error } = await query.order('created_at', { ascending: false });

    if (error) throw new BadRequestException(error.message);
    return data;
  }

  // Acknowledge alert
  async acknowledgeAlert(req: Request, alertId: string) {
    const supabaseClient = this.supabase.getClient();
    const { tenantId, userId } = req.user as any;

    const { error } = await supabaseClient
      .from('inventory_alerts')
      .update({
        acknowledged: true,
        acknowledged_by: userId,
        acknowledged_at: new Date().toISOString(),
      })
      .eq('id', alertId)
      .eq('tenant_id', tenantId);

    if (error) throw new BadRequestException(error.message);
    return { message: 'Alert acknowledged successfully' };
  }

  // Demo inventory management
  async issueDemoStock(req: Request, demoData: any) {
    const supabaseClient = this.supabase.getClient();
    const { tenantId, userId } = req.user as any;

    // Generate demo ID
    const demoId = await this.generateDemoId(req);

    const demo = {
      tenant_id: tenantId,
      demo_id: demoId,
      uid: demoData.uid,
      item_id: demoData.item_id,
      issued_to_staff_id: demoData.issued_to_staff_id,
      customer_name: demoData.customer_name,
      customer_contact: demoData.customer_contact,
      issue_date: demoData.issue_date || new Date().toISOString().split('T')[0],
      expected_return_date: demoData.expected_return_date,
      warehouse_id: demoData.warehouse_id,
      status: 'ISSUED',
    };

    const { data, error } = await supabaseClient
      .from('demo_inventory')
      .insert(demo)
      .select()
      .single();

    if (error) throw new BadRequestException(error.message);

    // Create stock movement for demo issue
    await this.createStockMovement(req, {
      movement_type: 'DEMO_ISSUE',
      item_id: demoData.item_id,
      uid: demoData.uid,
      from_warehouse_id: demoData.warehouse_id,
      quantity: 1,
      reference_type: 'DEMO',
      reference_id: data.id,
      reference_number: demoId,
      notes: `Demo issued to ${demoData.issued_to_staff_id} for ${demoData.customer_name}`,
    });

    return data;
  }

  // Return demo stock
  async returnDemoStock(req: Request, demoId: string, returnData: any) {
    const supabaseClient = this.supabase.getClient();
    const { tenantId } = req.user as any;

    const { data: demo } = await supabaseClient
      .from('demo_inventory')
      .select('*')
      .eq('demo_id', demoId)
      .eq('tenant_id', tenantId)
      .single();

    if (!demo) throw new NotFoundException('Demo record not found');

    // Update demo record
    const { data: updatedDemo, error } = await supabaseClient
      .from('demo_inventory')
      .update({
        status: 'RETURNED',
        actual_return_date: returnData.return_date || new Date().toISOString().split('T')[0],
        inspection_notes: returnData.inspection_notes,
        updated_at: new Date().toISOString(),
      })
      .eq('id', demo.id)
      .select()
      .single();

    if (error) throw new BadRequestException(error.message);

    // Create stock movement for demo return
    await this.createStockMovement(req, {
      movement_type: 'DEMO_RETURN',
      item_id: demo.item_id,
      uid: demo.uid,
      to_warehouse_id: demo.warehouse_id,
      quantity: 1,
      reference_type: 'DEMO',
      reference_id: demo.id,
      reference_number: demoId,
      notes: returnData.inspection_notes,
    });

    return updatedDemo;
  }

  // Convert demo to sale
  async convertDemoToSale(req: Request, demoId: string, salesOrderId: string) {
    const supabaseClient = this.supabase.getClient();
    const { tenantId } = req.user as any;

    const { data: demo } = await supabaseClient
      .from('demo_inventory')
      .select('*')
      .eq('demo_id', demoId)
      .eq('tenant_id', tenantId)
      .single();

    if (!demo) throw new NotFoundException('Demo record not found');

    // Update demo record
    const { error } = await supabaseClient
      .from('demo_inventory')
      .update({
        status: 'SOLD',
        converted_to_sale: true,
        sales_order_id: salesOrderId,
        updated_at: new Date().toISOString(),
      })
      .eq('id', demo.id);

    if (error) throw new BadRequestException(error.message);

    // Create stock movement for demo sold
    await this.createStockMovement(req, {
      movement_type: 'DEMO_SOLD',
      item_id: demo.item_id,
      uid: demo.uid,
      from_warehouse_id: demo.warehouse_id,
      quantity: 1,
      reference_type: 'SALES_ORDER',
      reference_id: salesOrderId,
      reference_number: demoId,
      notes: `Demo converted to sale for ${demo.customer_name}`,
    });

    return { message: 'Demo converted to sale successfully', demo_expenses: demo.demo_expenses };
  }

  // Get demo inventory
  async getDemoInventory(req: Request, filters?: any) {
    const supabaseClient = this.supabase.getClient();
    const { tenantId } = req.user as any;

    let query = supabaseClient
      .from('demo_inventory')
      .select(`
        *,
        items:item_id(item_code, item_name)
      `)
      .eq('tenant_id', tenantId);

    if (filters?.status) {
      query = query.eq('status', filters.status);
    }

    if (filters?.staff_id) {
      query = query.eq('issued_to_staff_id', filters.staff_id);
    }

    const { data, error } = await query.order('issue_date', { ascending: false });

    if (error) throw new BadRequestException(error.message);
    return data;
  }

  private async generateDemoId(req: Request): Promise<string> {
    const supabaseClient = this.supabase.getClient();
    const { tenantId } = req.user as any;

    const { count } = await supabaseClient
      .from('demo_inventory')
      .select('*', { count: 'exact', head: true })
      .eq('tenant_id', tenantId);

    return `DEMO-${String((count || 0) + 1).padStart(6, '0')}`;
  }

  // Get warehouses
  async getWarehouses(req: Request) {
    const supabaseClient = this.supabase.getClient();
    const { tenantId } = req.user as any;

    const { data, error } = await supabaseClient
      .from('warehouses')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('is_active', true)
      .order('warehouse_name');

    if (error) throw new BadRequestException(error.message);
    return data;
  }

  // Create warehouse
  async createWarehouse(req: Request, warehouseData: any) {
    const supabaseClient = this.supabase.getClient();
    const { tenantId } = req.user as any;

    const warehouse = {
      tenant_id: tenantId,
      warehouse_code: warehouseData.warehouse_code,
      warehouse_name: warehouseData.warehouse_name,
      location: warehouseData.location,
      plant_code: warehouseData.plant_code,
      manager_id: warehouseData.manager_id,
      is_active: true,
    };

    const { data, error } = await supabaseClient
      .from('warehouses')
      .insert(warehouse)
      .select()
      .single();

    if (error) throw new BadRequestException(error.message);
    return data;
  }
}
