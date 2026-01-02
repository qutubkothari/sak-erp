import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Request } from 'express';
import { EmailService } from '../../email/email.service';

@Injectable()
export class InventoryService {
  private supabase: SupabaseClient;

  constructor(private emailService: EmailService) {
    this.supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_KEY!
    );
  }

  // Get current stock levels with filters
  async getStockLevels(req: Request, filters?: any) {
    const { tenantId } = req.user as any;

    // Get stock entries first
    let query = this.supabase
      .from('inventory_stock')
      .select('*')
      .eq('tenant_id', tenantId);

    if (filters?.warehouse_id) {
      query = query.eq('warehouse_id', filters.warehouse_id);
    }

    if (filters?.item_id) {
      query = query.eq('item_id', filters.item_id);
    }

    if (filters?.low_stock) {
      query = query.lt('available_quantity', 10); // Low stock threshold
    }

    const { data: stockEntries, error: stockError } = await query;
    if (stockError) throw new BadRequestException(stockError.message);

    if (!stockEntries || stockEntries.length === 0) {
      return [];
    }

    // Get item details separately
    const itemIds = [...new Set(stockEntries.map(entry => entry.item_id))];
    const { data: items, error: itemError } = await this.supabase
      .from('items')
      .select('id, code, name, uom, category, standard_cost, selling_price')
      .in('id', itemIds);

    if (itemError) throw new BadRequestException(itemError.message);

    // Get warehouse details separately
    const warehouseIds = [...new Set(stockEntries.map(entry => entry.warehouse_id))];
    const { data: warehouses, error: warehouseError } = await this.supabase
      .from('warehouses')
      .select('id, code, name')
      .in('id', warehouseIds);

    if (warehouseError) throw new BadRequestException(warehouseError.message);

    // Combine the data manually
    const result = stockEntries.map(entry => {
      const item = items?.find(i => i.id === entry.item_id);
      const warehouse = warehouses?.find(w => w.id === entry.warehouse_id);
      
      return {
        ...entry,
        items: item || { code: 'N/A', name: 'Unknown Item', uom: '', category: '', standard_cost: 0, selling_price: 0 },
        warehouses: warehouse || { code: 'N/A', name: 'Unknown Warehouse' }
      };
    });

    // Apply category filter if needed
    if (filters?.category) {
      return result.filter(entry => entry.items.category === filters.category);
    }

    return result;
  }

  // Get stock movements history
  async getStockMovements(req: Request, filters?: any) {
    
    const { tenantId } = req.user as any;

    let query = this.supabase
      .from('stock_movements')
      .select('*')
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

    const { data: movements, error: movementError } = await query
      .order('movement_date', { ascending: false })
      .limit(filters?.limit || 100);

    if (movementError) throw new BadRequestException(movementError.message);

    if (!movements || movements.length === 0) {
      return [];
    }

    // Get item details separately
    const itemIds = [...new Set(movements.map(m => m.item_id))];
    const { data: items, error: itemError } = await this.supabase
      .from('items')
      .select('id, code, name')
      .in('id', itemIds);

    if (itemError) throw new BadRequestException(itemError.message);

    // Get warehouse details separately
    const warehouseIds = [...new Set([
      ...movements.filter(m => m.from_warehouse_id).map(m => m.from_warehouse_id),
      ...movements.filter(m => m.to_warehouse_id).map(m => m.to_warehouse_id)
    ])];
    
    const { data: warehouses, error: warehouseError } = await this.supabase
      .from('warehouses')
      .select('id, code, name')
      .in('id', warehouseIds);

    if (warehouseError) throw new BadRequestException(warehouseError.message);

    // Combine the data manually
    const result = movements.map(movement => {
      const item = items?.find(i => i.id === movement.item_id);
      const fromWarehouse = warehouses?.find(w => w.id === movement.from_warehouse_id);
      const toWarehouse = warehouses?.find(w => w.id === movement.to_warehouse_id);
      
      return {
        ...movement,
        items: item || { code: 'N/A', name: 'Unknown Item' },
        from_warehouse: fromWarehouse || null,
        to_warehouse: toWarehouse || null
      };
    });

    return result;
  }

  // Create stock movement (generic)
  async createStockMovement(req: Request, movementData: any) {
    
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
    const { data: movementRecord, error: movementError } = await this.supabase
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
    const { tenantId } = req.user as any;

    const { error } = await this.supabase.rpc('adjust_inventory_stock', {
      p_tenant_id: tenantId,
      p_item_id: itemId,
      p_warehouse_id: warehouseId,
      p_location_id: locationId,
      p_quantity_change: quantityChange,
      p_category: category || 'RAW_MATERIAL',
    });

    if (error) {
      console.error('Error in adjustStock RPC call:', error);
      throw new BadRequestException('Failed to adjust stock levels.');
    }
  }

  // Generate movement number
  private async generateMovementNumber(req: Request, movementType: string): Promise<string> {
    
    const { tenantId } = req.user as any;

    const prefix = this.getMovementPrefix(movementType);
    const { count } = await this.supabase
      .from('stock_movements')
      .select('*', { count: 'exact', head: true })
      .eq('tenant_id', tenantId)
      .like('movement_number', `${prefix}%`);

    return `${prefix}${String((count || 0) + 1).padStart(6, '0')}`;
  }

  private getMovementPrefix(movementType: string): string {
    const prefixes: Record<string, string> = {
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
    
    const { tenantId, userId } = req.user as any;

    // Check available quantity
    const { data: stock } = await this.supabase
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

    const { data, error } = await this.supabase
      .from('stock_reservations')
      .insert(reservation)
      .select()
      .single();

    if (error) throw new BadRequestException(error.message);

    // Update stock reserved_quantity
    await this.supabase.rpc('increment_reserved_quantity', {
      p_tenant_id: tenantId,
      p_item_id: reservationData.item_id,
      p_warehouse_id: reservationData.warehouse_id,
      p_quantity: reservationData.reserved_quantity,
    });

    return data;
  }

  // Release stock reservation
  async releaseReservation(req: Request, reservationId: string) {
    
    const { tenantId } = req.user as any;

    const { data: reservation } = await this.supabase
      .from('stock_reservations')
      .select('*')
      .eq('id', reservationId)
      .eq('tenant_id', tenantId)
      .single();

    if (!reservation) throw new NotFoundException('Reservation not found');

    // Update reservation
    await this.supabase
      .from('stock_reservations')
      .update({ released: true, released_at: new Date().toISOString() })
      .eq('id', reservationId);

    // Decrease stock reserved_quantity
    await this.supabase.rpc('decrement_reserved_quantity', {
      p_tenant_id: tenantId,
      p_item_id: reservation.item_id,
      p_warehouse_id: reservation.warehouse_id,
      p_quantity: reservation.reserved_quantity,
    });

    return { message: 'Reservation released successfully' };
  }

  // Check and create low stock alerts
  private async checkLowStockAlerts(req: Request, itemId: string, warehouseId: string) {
    
    const { tenantId } = req.user as any;

    // Get stock and item details (need item's reorder_level)
    const { data: stock } = await this.supabase
      .from('inventory_stock')
      .select('*, items!inner(reorder_level)')
      .eq('tenant_id', tenantId)
      .eq('item_id', itemId)
      .eq('warehouse_id', warehouseId)
      .maybeSingle();

    if (!stock || !stock.items) return;

    const reorderLevel = stock.items.reorder_level || 0;
    const availableQty = parseFloat(stock.available_quantity) || 0;

    if (reorderLevel > 0 && availableQty <= reorderLevel) {
      // Check if alert already exists
      const { data: existingAlert } = await this.supabase
        .from('inventory_alerts')
        .select('id')
        .eq('tenant_id', tenantId)
        .eq('item_id', itemId)
        .eq('warehouse_id', warehouseId)
        .eq('alert_type', 'LOW_STOCK')
        .eq('acknowledged', false)
        .maybeSingle();

      if (!existingAlert) {
        await this.supabase.from('inventory_alerts').insert({
          tenant_id: tenantId,
          alert_type: 'LOW_STOCK',
          item_id: itemId,
          warehouse_id: warehouseId,
          current_quantity: availableQty,
          threshold_quantity: reorderLevel,
          message: `Low stock alert: Available quantity (${availableQty}) is at or below reorder level (${reorderLevel})`,
          severity: availableQty <= 0 ? 'CRITICAL' : 'HIGH',
        });
      }
    }
  }

  // Check all items for low stock and create alerts
  async checkAllLowStock(req: Request) {
    const { tenantId } = req.user as any;

    // Get all items with reorder levels set
    const { data: items, error: itemsError } = await this.supabase
      .from('items')
      .select('id, code, name, reorder_level')
      .eq('tenant_id', tenantId)
      .gt('reorder_level', 0);

    if (itemsError) throw new BadRequestException(itemsError.message);

    if (!items || items.length === 0) {
      return {
        success: true,
        itemsChecked: 0,
        alertsCreated: 0,
        message: 'No items found with reorder levels set.'
      };
    }

    let alertsCreated = 0;
    let itemsChecked = 0;

    // Check stock for each item
    for (const item of items) {
      const { data: stockRecords } = await this.supabase
        .from('inventory_stock')
        .select('*')
        .eq('tenant_id', tenantId)
        .eq('item_id', item.id);

      if (stockRecords && stockRecords.length > 0) {
        for (const stock of stockRecords) {
          itemsChecked++;
          const availableQty = parseFloat(stock.available_quantity) || 0;

          if (availableQty <= item.reorder_level) {
            // Check if alert already exists
            const { data: existingAlert } = await this.supabase
              .from('inventory_alerts')
              .select('id')
              .eq('tenant_id', tenantId)
              .eq('item_id', item.id)
              .eq('warehouse_id', stock.warehouse_id)
              .eq('alert_type', 'LOW_STOCK')
              .eq('acknowledged', false)
              .maybeSingle();

            if (!existingAlert) {
              await this.supabase.from('inventory_alerts').insert({
                tenant_id: tenantId,
                alert_type: 'LOW_STOCK',
                item_id: item.id,
                warehouse_id: stock.warehouse_id,
                current_quantity: availableQty,
                threshold_quantity: item.reorder_level,
                message: `Low stock: ${item.code} - ${item.name} (Available: ${availableQty}, Reorder: ${item.reorder_level})`,
                severity: availableQty <= 0 ? 'CRITICAL' : 'HIGH',
              });
              alertsCreated++;
            }
          }
        }
      }
    }

    return {
      success: true,
      itemsChecked,
      alertsCreated,
      message: `Checked ${itemsChecked} stock records from ${items.length} items with reorder levels. Created ${alertsCreated} new alerts.`
    };
  }

  // Check for overdue and approaching due job orders
  async checkJobOrderAlerts(req: Request) {
    try {
      console.log('[checkJobOrderAlerts] Starting job order alerts check');
      const { tenantId } = req.user as any;
      console.log('[checkJobOrderAlerts] Tenant ID:', tenantId);

      const today = new Date();
      const threeDaysFromNow = new Date();
      threeDaysFromNow.setDate(today.getDate() + 3);

      // Get all active job orders
      console.log('[checkJobOrderAlerts] Querying production_job_orders table...');
      const { data: jobOrders, error } = await this.supabase
        .from('production_job_orders')
        .select('id, job_order_number, item_code, item_name, item_id, end_date, status')
        .eq('tenant_id', tenantId)
        .in('status', ['DRAFT', 'SCHEDULED', 'IN_PROGRESS']);

      if (error) {
        console.error('[checkJobOrderAlerts] Database error:', error);
        throw new BadRequestException(`Failed to fetch job orders: ${error.message}`);
      }

      console.log('[checkJobOrderAlerts] Found', jobOrders?.length || 0, 'active job orders');

    let alertsCreated = 0;
    const todayStr = today.toISOString().split('T')[0];

    for (const job of jobOrders || []) {
      if (!job.end_date) continue;

      const endDate = new Date(job.end_date);

      // Check if overdue
      if (endDate < today && job.status !== 'COMPLETED') {
        const { data: existingAlert } = await this.supabase
          .from('inventory_alerts')
          .select('id')
          .eq('tenant_id', tenantId)
          .eq('alert_type', 'JOB_OVERDUE')
          .eq('item_id', job.item_id)
          .ilike('message', `%${job.job_order_number}%`)
          .eq('acknowledged', false)
          .maybeSingle();

        if (!existingAlert) {
          const daysOverdue = Math.floor((today.getTime() - endDate.getTime()) / (1000 * 60 * 60 * 24));
          await this.supabase.from('inventory_alerts').insert({
            tenant_id: tenantId,
            alert_type: 'JOB_OVERDUE',
            item_id: job.item_id,
            warehouse_id: null,
            current_quantity: null,
            threshold_quantity: null,
            message: `⚠️ Job Order ${job.job_order_number} is OVERDUE by ${daysOverdue} day(s) | Item: ${job.item_code} - ${job.item_name} | Due: ${job.end_date}`,
            severity: 'CRITICAL',
          });
          alertsCreated++;
        }
      }
      // Check if approaching due date (within 3 days)
      else if (endDate >= today && endDate <= threeDaysFromNow) {
        const { data: existingAlert } = await this.supabase
          .from('inventory_alerts')
          .select('id')
          .eq('tenant_id', tenantId)
          .eq('alert_type', 'JOB_DUE_SOON')
          .eq('item_id', job.item_id)
          .ilike('message', `%${job.job_order_number}%`)
          .eq('acknowledged', false)
          .maybeSingle();

        if (!existingAlert) {
          const daysRemaining = Math.ceil((endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
          await this.supabase.from('inventory_alerts').insert({
            tenant_id: tenantId,
            alert_type: 'JOB_DUE_SOON',
            item_id: job.item_id,
            warehouse_id: null,
            current_quantity: null,
            threshold_quantity: null,
            message: `📅 Job Order ${job.job_order_number} due in ${daysRemaining} day(s) | Item: ${job.item_code} - ${job.item_name} | Due: ${job.end_date}`,
            severity: daysRemaining === 0 ? 'HIGH' : 'MEDIUM',
          });
          alertsCreated++;
        }
      }
    }

      console.log('[checkJobOrderAlerts] Successfully created', alertsCreated, 'new alerts');
      return {
        success: true,
        jobOrdersChecked: jobOrders?.length || 0,
        alertsCreated,
        message: `Checked ${jobOrders?.length || 0} active job orders. Created ${alertsCreated} new alerts.`
      };
    } catch (error) {
      console.error('[checkJobOrderAlerts] Error occurred:', error);
      console.error('[checkJobOrderAlerts] Error stack:', error.stack);
      throw error;
    }
  }

  // Get inventory alerts
  async getAlerts(req: Request, acknowledged?: boolean) {
    
    const { tenantId } = req.user as any;

    let query = this.supabase
      .from('inventory_alerts')
      .select('*')
      .eq('tenant_id', tenantId);

    if (acknowledged !== undefined) {
      query = query.eq('acknowledged', acknowledged);
    }

    const { data: alerts, error: alertError } = await query
      .order('created_at', { ascending: false });

    if (alertError) throw new BadRequestException(alertError.message);

    if (!alerts || alerts.length === 0) {
      return [];
    }

    // Get item details separately
    const itemIds = [...new Set(alerts.map(a => a.item_id))];
    const { data: items, error: itemError } = await this.supabase
      .from('items')
      .select('id, code, name')
      .in('id', itemIds);

    if (itemError) throw new BadRequestException(itemError.message);

    // Get warehouse details separately
    const warehouseIds = [...new Set(alerts.map(a => a.warehouse_id))];
    const { data: warehouses, error: warehouseError } = await this.supabase
      .from('warehouses')
      .select('id, code, name')
      .in('id', warehouseIds);

    if (warehouseError) throw new BadRequestException(warehouseError.message);

    // Combine the data manually
    const result = alerts.map(alert => {
      const item = items?.find(i => i.id === alert.item_id);
      const warehouse = warehouses?.find(w => w.id === alert.warehouse_id);
      
      return {
        ...alert,
        items: item ? {
          item_code: item.code,
          item_name: item.name
        } : null,
        warehouses: warehouse ? {
          warehouse_code: warehouse.code,
          warehouse_name: warehouse.name
        } : null
      };
    });

    return result;
  }

  // Acknowledge alert
  async acknowledgeAlert(req: Request, alertId: string) {
    
    const { tenantId, userId } = req.user as any;

    const { error } = await this.supabase
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

  // Send low stock email alert
  async sendLowStockEmail(req: Request, recipientEmail: string) {
    
    const { tenantId } = req.user as any;

    // Get all unacknowledged low stock alerts
    const alerts = await this.getAlerts(req, false);
    const lowStockAlerts = alerts.filter((alert: any) => alert.alert_type === 'LOW_STOCK');

    if (lowStockAlerts.length === 0) {
      throw new BadRequestException('No low stock alerts to send');
    }

    try {
      await this.emailService.sendLowStockAlert(recipientEmail, lowStockAlerts);
      return { 
        success: true, 
        message: `Low stock alert email sent to ${recipientEmail}`,
        itemCount: lowStockAlerts.length 
      };
    } catch (error) {
      throw new BadRequestException(`Failed to send email: ${error.message}`);
    }
  }

  // Demo inventory management
  async issueDemoStock(req: Request, demoData: any) {
    
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

    const { data, error } = await this.supabase
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
    
    const { tenantId } = req.user as any;

    const { data: demo } = await this.supabase
      .from('demo_inventory')
      .select('*')
      .eq('demo_id', demoId)
      .eq('tenant_id', tenantId)
      .single();

    if (!demo) throw new NotFoundException('Demo record not found');

    // Update demo record
    const { data: updatedDemo, error } = await this.supabase
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
    
    const { tenantId } = req.user as any;

    const { data: demo } = await this.supabase
      .from('demo_inventory')
      .select('*')
      .eq('demo_id', demoId)
      .eq('tenant_id', tenantId)
      .single();

    if (!demo) throw new NotFoundException('Demo record not found');

    // Update demo record
    const { error } = await this.supabase
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
    
    const { tenantId } = req.user as any;

    let query = this.supabase
      .from('demo_inventory')
      .select('*')
      .eq('tenant_id', tenantId);

    if (filters?.status) {
      query = query.eq('status', filters.status);
    }

    if (filters?.staff_id) {
      query = query.eq('issued_to_staff_id', filters.staff_id);
    }

    const { data: demos, error: demoError } = await query
      .order('issue_date', { ascending: false });

    if (demoError) throw new BadRequestException(demoError.message);

    if (!demos || demos.length === 0) {
      return [];
    }

    // Get item details separately
    const itemIds = [...new Set(demos.map(d => d.item_id))];
    const { data: items, error: itemError } = await this.supabase
      .from('items')
      .select('id, code, name')
      .in('id', itemIds);

    if (itemError) throw new BadRequestException(itemError.message);

    // Combine the data manually
    const result = demos.map(demo => {
      const item = items?.find(i => i.id === demo.item_id);
      
      return {
        ...demo,
        items: item ? {
          item_code: item.code,
          item_name: item.name
        } : null
      };
    });

    return result;
  }

  private async generateDemoId(req: Request): Promise<string> {
    
    const { tenantId } = req.user as any;

    const { count } = await this.supabase
      .from('demo_inventory')
      .select('*', { count: 'exact', head: true })
      .eq('tenant_id', tenantId);

    return `DEMO-${String((count || 0) + 1).padStart(6, '0')}`;
  }

  // Get warehouses
  async getWarehouses(req: Request) {
    
    const { tenantId } = req.user as any;

    const { data, error } = await this.supabase
      .from('warehouses')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('is_active', true)
      .order('name');

    if (error) throw new BadRequestException(error.message);
    return data;
  }

  // Create warehouse
  async createWarehouse(req: Request, warehouseData: any) {
    
    const { tenantId } = req.user as any;

    const warehouse = {
      tenant_id: tenantId,
      code: warehouseData.code || warehouseData.warehouse_code,
      name: warehouseData.name || warehouseData.warehouse_name,
      type: warehouseData.type,
      plant_id: warehouseData.plant_id,
      is_active: true,
      metadata: warehouseData.metadata || {},
    };

    const { data, error } = await this.supabase
      .from('warehouses')
      .insert(warehouse)
      .select()
      .single();

    if (error) throw new BadRequestException(error.message);
    return data;
  }

  // Delete stock entry
  async deleteStockEntry(req: Request, id: string) {
    const { tenantId } = req.user as any;

    const { data, error } = await this.supabase
      .from('inventory_stock')
      .delete()
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .select()
      .single();

    if (error) throw new BadRequestException(error.message);
    if (!data) throw new NotFoundException('Stock entry not found');
    return data;
  }

  // Delete stock movement
  async deleteStockMovement(req: Request, id: string) {
    const { tenantId } = req.user as any;

    const { data, error } = await this.supabase
      .from('stock_movements')
      .delete()
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .select()
      .single();

    if (error) throw new BadRequestException(error.message);
    if (!data) throw new NotFoundException('Stock movement not found');
    return data;
  }

  // Delete alert
  async deleteAlert(req: Request, id: string) {
    const { tenantId } = req.user as any;

    const { data, error } = await this.supabase
      .from('inventory_alerts')
      .delete()
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .select()
      .single();

    if (error) throw new BadRequestException(error.message);
    if (!data) throw new NotFoundException('Alert not found');
    return data;
  }

  // Delete demo item
  async deleteDemoItem(req: Request, id: string) {
    const { tenantId } = req.user as any;

    const { data, error } = await this.supabase
      .from('demo_inventory')
      .delete()
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .select()
      .single();

    if (error) throw new BadRequestException(error.message);
    if (!data) throw new NotFoundException('Demo item not found');
    return data;
  }
}
