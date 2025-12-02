import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

@Injectable()
export class WorkStationService {
  private supabase: SupabaseClient;

  constructor() {
    this.supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_KEY!,
    );
  }

  /**
   * Create work station
   */
  async create(tenantId: string, data: any) {
    const { data: station, error } = await this.supabase
      .from('work_stations')
      .insert({
        tenant_id: tenantId,
        station_code: data.stationCode,
        station_name: data.stationName,
        station_type: data.stationType,
        capacity_per_hour: data.capacityPerHour,
        is_active: data.isActive !== undefined ? data.isActive : true,
      })
      .select()
      .single();

    if (error) {
      console.error('[WorkStation] Failed to create', { tenantId, data, error });
      throw new BadRequestException(error.message);
    }

    return station;
  }

  /**
   * Get all work stations
   */
  async findAll(tenantId: string, filters?: any) {
    let query = this.supabase
      .from('work_stations')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('station_code', { ascending: true });

    if (filters?.stationType) {
      query = query.eq('station_type', filters.stationType);
    }

    if (filters?.isActive !== undefined) {
      query = query.eq('is_active', filters.isActive);
    }

    const { data, error } = await query;

    if (error) {
      console.error('[WorkStation] Failed to fetch', { tenantId, filters, error });
      throw new BadRequestException(error.message);
    }

    return data || [];
  }

  /**
   * Get single work station
   */
  async findOne(tenantId: string, id: string) {
    const { data, error } = await this.supabase
      .from('work_stations')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('id', id)
      .single();

    if (error) {
      throw new NotFoundException('Work station not found');
    }

    return data;
  }

  /**
   * Update work station
   */
  async update(tenantId: string, id: string, data: any) {
    const updateData: any = {
      updated_at: new Date().toISOString(),
    };

    if (data.stationName) updateData.station_name = data.stationName;
    if (data.stationType) updateData.station_type = data.stationType;
    if (data.capacityPerHour !== undefined) updateData.capacity_per_hour = data.capacityPerHour;
    if (data.isActive !== undefined) updateData.is_active = data.isActive;

    const { data: station, error } = await this.supabase
      .from('work_stations')
      .update(updateData)
      .eq('tenant_id', tenantId)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('[WorkStation] Failed to update', { tenantId, id, data, error });
      throw new BadRequestException(error.message);
    }

    return station;
  }

  /**
   * Delete work station
   */
  async delete(tenantId: string, id: string) {
    const { error } = await this.supabase
      .from('work_stations')
      .delete()
      .eq('tenant_id', tenantId)
      .eq('id', id);

    if (error) {
      console.error('[WorkStation] Failed to delete', { tenantId, id, error });
      throw new BadRequestException(error.message);
    }

    return { success: true };
  }

  /**
   * Get work station queue (pending operations)
   */
  async getQueue(tenantId: string, stationId: string) {
    // Get all production orders with routing that includes this station
    // and have not been completed at this station yet
    const { data: routings, error: routingError } = await this.supabase
      .from('production_routing')
      .select(`
        id,
        sequence_no,
        operation_name,
        setup_time_minutes,
        cycle_time_minutes,
        qc_required,
        bom_id
      `)
      .eq('work_station_id', stationId)
      .eq('tenant_id', tenantId);

    if (routingError) {
      console.error('[WorkStation] Failed to fetch routing', { tenantId, stationId, routingError });
      throw new BadRequestException(routingError.message);
    }

    if (!routings || routings.length === 0) {
      return [];
    }

    // Get production orders using these BOMs
    const bomIds = [...new Set(routings.map(r => r.bom_id))];
    
    const { data: orders, error: ordersError } = await this.supabase
      .from('production_orders')
      .select('id, order_number, status, quantity, item_id, created_at')
      .eq('tenant_id', tenantId)
      .in('status', ['RELEASED', 'IN_PROGRESS'])
      .order('created_at', { ascending: true });

    if (ordersError) {
      console.error('[WorkStation] Failed to fetch orders', { tenantId, ordersError });
      throw new BadRequestException(ordersError.message);
    }

    if (!orders || orders.length === 0) {
      return [];
    }

    // Get item details
    const itemIds = [...new Set(orders.map(o => o.item_id))];
    const { data: items } = await this.supabase
      .from('items')
      .select('id, code, name, uom')
      .in('id', itemIds);

    const itemsMap = new Map(items?.map(i => [i.id, i]));

    // Get completions for these operations
    const orderIds = orders.map(o => o.id);
    const routingIds = routings.map(r => r.id);

    const { data: completions } = await this.supabase
      .from('station_completions')
      .select('production_order_id, routing_id, quantity_completed')
      .in('production_order_id', orderIds)
      .in('routing_id', routingIds);

    const completionsMap = new Map();
    completions?.forEach(c => {
      const key = `${c.production_order_id}-${c.routing_id}`;
      completionsMap.set(key, c.quantity_completed);
    });

    // Build queue: combine orders with their routing operations for this station
    const queue: any[] = [];

    orders.forEach(order => {
      routings.forEach(routing => {
        const key = `${order.id}-${routing.id}`;
        const completed = completionsMap.get(key) || 0;
        const remaining = Number(order.quantity) - Number(completed);

        if (remaining > 0) {
          queue.push({
            production_order_id: order.id,
            order_number: order.order_number,
            routing_id: routing.id,
            operation_name: routing.operation_name,
            sequence_no: routing.sequence_no,
            quantity_required: order.quantity,
            quantity_completed: completed,
            quantity_remaining: remaining,
            setup_time_minutes: routing.setup_time_minutes,
            cycle_time_minutes: routing.cycle_time_minutes,
            qc_required: routing.qc_required,
            item: itemsMap.get(order.item_id),
            order_status: order.status,
          });
        }
      });
    });

    // Sort by order creation date, then sequence number
    queue.sort((a, b) => {
      if (a.production_order_id === b.production_order_id) {
        return a.sequence_no - b.sequence_no;
      }
      return 0; // Keep original order (FIFO by created_at already sorted above)
    });

    return queue;
  }
}
