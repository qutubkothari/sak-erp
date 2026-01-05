"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "StationCompletionService", {
    enumerable: true,
    get: function() {
        return StationCompletionService;
    }
});
const _common = require("@nestjs/common");
const _supabasejs = require("@supabase/supabase-js");
function _ts_decorate(decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for(var i = decorators.length - 1; i >= 0; i--)if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
}
function _ts_metadata(k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
}
let StationCompletionService = class StationCompletionService {
    /**
   * Start an operation at a workstation
   */ async startOperation(tenantId, dto) {
        // Verify production order exists
        const { data: order, error: orderError } = await this.supabase.from('production_orders').select('id, status').eq('tenant_id', tenantId).eq('id', dto.production_order_id).single();
        if (orderError || !order) {
            throw new _common.NotFoundException(`Production order with ID ${dto.production_order_id} not found`);
        }
        if (order.status !== 'RELEASED' && order.status !== 'IN_PROGRESS') {
            throw new _common.BadRequestException(`Production order must be RELEASED or IN_PROGRESS to start operations`);
        }
        // Verify routing exists
        const { data: routing, error: routingError } = await this.supabase.from('production_routing').select('id, work_station_id').eq('tenant_id', tenantId).eq('id', dto.routing_id).single();
        if (routingError || !routing) {
            throw new _common.NotFoundException(`Routing with ID ${dto.routing_id} not found`);
        }
        // Check if operator already has an active operation
        const { data: activeOps } = await this.supabase.from('station_completions').select('id').eq('tenant_id', tenantId).eq('operator_id', dto.operator_id).eq('status', 'IN_PROGRESS').limit(1);
        if (activeOps && activeOps.length > 0) {
            throw new _common.BadRequestException('Operator already has an active operation. Please complete or pause it first.');
        }
        // Check if there's already an active completion for this production order + routing
        const { data: existingCompletion } = await this.supabase.from('station_completions').select('id, status').eq('tenant_id', tenantId).eq('production_order_id', dto.production_order_id).eq('routing_id', dto.routing_id).eq('status', 'IN_PROGRESS').limit(1);
        if (existingCompletion && existingCompletion.length > 0) {
            throw new _common.BadRequestException('This operation is already in progress by another operator');
        }
        const startTime = new Date().toISOString();
        const { data, error } = await this.supabase.from('station_completions').insert({
            tenant_id: tenantId,
            production_order_id: dto.production_order_id,
            routing_id: dto.routing_id,
            work_station_id: routing.work_station_id,
            operator_id: dto.operator_id,
            quantity_completed: 0,
            quantity_rejected: 0,
            start_time: startTime,
            end_time: null,
            actual_time_minutes: null,
            notes: dto.notes || null,
            status: 'IN_PROGRESS'
        }).select().single();
        if (error) {
            throw new _common.BadRequestException(`Failed to start operation: ${error.message}`);
        }
        // Update production order status to IN_PROGRESS if it was RELEASED
        if (order.status === 'RELEASED') {
            await this.supabase.from('production_orders').update({
                status: 'IN_PROGRESS',
                updated_at: new Date().toISOString()
            }).eq('tenant_id', tenantId).eq('id', dto.production_order_id);
        }
        return data;
    }
    /**
   * Complete an operation
   */ async completeOperation(tenantId, completionId, dto) {
        // Verify completion exists and is IN_PROGRESS
        const { data: existing, error: fetchError } = await this.supabase.from('station_completions').select('*').eq('tenant_id', tenantId).eq('id', completionId).single();
        if (fetchError || !existing) {
            throw new _common.NotFoundException(`Station completion with ID ${completionId} not found`);
        }
        if (existing.status !== 'IN_PROGRESS') {
            throw new _common.BadRequestException('Only IN_PROGRESS operations can be completed');
        }
        if (dto.quantity_completed <= 0) {
            throw new _common.BadRequestException('Quantity completed must be greater than 0');
        }
        const endTime = new Date();
        const startTime = new Date(existing.start_time);
        const actualTimeMinutes = Math.round((endTime.getTime() - startTime.getTime()) / 60000);
        const { data, error } = await this.supabase.from('station_completions').update({
            quantity_completed: dto.quantity_completed,
            quantity_rejected: dto.quantity_rejected || 0,
            end_time: endTime.toISOString(),
            actual_time_minutes: actualTimeMinutes,
            notes: dto.notes || existing.notes,
            status: 'COMPLETED',
            updated_at: new Date().toISOString()
        }).eq('tenant_id', tenantId).eq('id', completionId).select().single();
        if (error) {
            throw new _common.BadRequestException(`Failed to complete operation: ${error.message}`);
        }
        // Check if all operations for this production order are completed
        await this.checkAndUpdateOrderCompletion(tenantId, existing.production_order_id);
        return data;
    }
    /**
   * Pause an operation
   */ async pauseOperation(tenantId, completionId, dto) {
        const { data: existing, error: fetchError } = await this.supabase.from('station_completions').select('*').eq('tenant_id', tenantId).eq('id', completionId).single();
        if (fetchError || !existing) {
            throw new _common.NotFoundException(`Station completion with ID ${completionId} not found`);
        }
        if (existing.status !== 'IN_PROGRESS') {
            throw new _common.BadRequestException('Only IN_PROGRESS operations can be paused');
        }
        const { data, error } = await this.supabase.from('station_completions').update({
            notes: dto.notes || existing.notes,
            status: 'PAUSED',
            updated_at: new Date().toISOString()
        }).eq('tenant_id', tenantId).eq('id', completionId).select().single();
        if (error) {
            throw new _common.BadRequestException(`Failed to pause operation: ${error.message}`);
        }
        return data;
    }
    /**
   * Resume a paused operation
   */ async resumeOperation(tenantId, completionId) {
        const { data: existing, error: fetchError } = await this.supabase.from('station_completions').select('*, operator_id').eq('tenant_id', tenantId).eq('id', completionId).single();
        if (fetchError || !existing) {
            throw new _common.NotFoundException(`Station completion with ID ${completionId} not found`);
        }
        if (existing.status !== 'PAUSED') {
            throw new _common.BadRequestException('Only PAUSED operations can be resumed');
        }
        // Check if operator has another active operation
        const { data: activeOps } = await this.supabase.from('station_completions').select('id').eq('tenant_id', tenantId).eq('operator_id', existing.operator_id).eq('status', 'IN_PROGRESS').limit(1);
        if (activeOps && activeOps.length > 0) {
            throw new _common.BadRequestException('Operator already has an active operation. Please complete or pause it first.');
        }
        const { data, error } = await this.supabase.from('station_completions').update({
            status: 'IN_PROGRESS',
            updated_at: new Date().toISOString()
        }).eq('tenant_id', tenantId).eq('id', completionId).select().single();
        if (error) {
            throw new _common.BadRequestException(`Failed to resume operation: ${error.message}`);
        }
        return data;
    }
    /**
   * Get active operation for an operator
   */ async getActiveOperation(tenantId, operatorId) {
        const { data } = await this.supabase.from('station_completions').select('*').eq('tenant_id', tenantId).eq('operator_id', operatorId).eq('status', 'IN_PROGRESS').limit(1).maybeSingle();
        return data;
    }
    /**
   * Get completions for a production order with routing and work station details
   */ async findByProductionOrder(tenantId, productionOrderId) {
        // Fetch completions
        const { data: completions, error } = await this.supabase.from('station_completions').select('*').eq('tenant_id', tenantId).eq('production_order_id', productionOrderId).order('created_at', {
            ascending: true
        });
        if (error) {
            throw new _common.BadRequestException(`Failed to fetch completions: ${error.message}`);
        }
        if (!completions || completions.length === 0) {
            return [];
        }
        // Fetch routing details
        const routingIds = [
            ...new Set(completions.map((c)=>c.routing_id))
        ];
        const { data: routings } = await this.supabase.from('production_routing').select('*').eq('tenant_id', tenantId).in('id', routingIds);
        // Fetch work stations
        const stationIds = [
            ...new Set(completions.map((c)=>c.work_station_id))
        ];
        const { data: stations } = await this.supabase.from('work_stations').select('*').eq('tenant_id', tenantId).in('id', stationIds);
        // Build maps
        const routingMap = new Map(routings?.map((r)=>[
                r.id,
                r
            ]) || []);
        const stationMap = new Map(stations?.map((s)=>[
                s.id,
                s
            ]) || []);
        // Merge data
        return completions.map((completion)=>({
                ...completion,
                routing: routingMap.get(completion.routing_id) || null,
                work_station: stationMap.get(completion.work_station_id) || null
            }));
    }
    /**
   * Get completions by work station
   */ async findByWorkStation(tenantId, workStationId, filters) {
        let query = this.supabase.from('station_completions').select('*').eq('tenant_id', tenantId).eq('work_station_id', workStationId);
        if (filters?.startDate) {
            query = query.gte('start_time', filters.startDate);
        }
        if (filters?.endDate) {
            query = query.lte('start_time', filters.endDate);
        }
        if (filters?.operatorId) {
            query = query.eq('operator_id', filters.operatorId);
        }
        query = query.order('start_time', {
            ascending: false
        });
        const { data, error } = await query;
        if (error) {
            throw new _common.BadRequestException(`Failed to fetch completions: ${error.message}`);
        }
        return data || [];
    }
    /**
   * Check if all operations are completed and update production order status
   */ async checkAndUpdateOrderCompletion(tenantId, productionOrderId) {
        // Get production order
        const { data: order } = await this.supabase.from('production_orders').select('bom_id, quantity').eq('tenant_id', tenantId).eq('id', productionOrderId).single();
        if (!order) return;
        // Get all routing operations for this BOM
        const { data: routings } = await this.supabase.from('production_routing').select('id').eq('tenant_id', tenantId).eq('bom_id', order.bom_id).eq('is_active', true);
        if (!routings || routings.length === 0) return;
        // Get all completions for this production order
        const { data: completions } = await this.supabase.from('station_completions').select('routing_id, quantity_completed, status').eq('tenant_id', tenantId).eq('production_order_id', productionOrderId);
        if (!completions) return;
        // Check if all operations are completed with full quantity
        const routingIds = routings.map((r)=>r.id);
        const allCompleted = routingIds.every((routingId)=>{
            const completionsForRouting = completions.filter((c)=>c.routing_id === routingId && c.status === 'COMPLETED');
            const totalCompleted = completionsForRouting.reduce((sum, c)=>sum + c.quantity_completed, 0);
            return totalCompleted >= order.quantity;
        });
        if (allCompleted) {
            await this.supabase.from('production_orders').update({
                status: 'COMPLETED',
                updated_at: new Date().toISOString()
            }).eq('tenant_id', tenantId).eq('id', productionOrderId);
        }
    }
    /**
   * Get operator productivity report
   */ async getOperatorProductivity(tenantId, operatorId, startDate, endDate) {
        const { data: completions, error } = await this.supabase.from('station_completions').select('*').eq('tenant_id', tenantId).eq('operator_id', operatorId).eq('status', 'COMPLETED').gte('start_time', startDate).lte('end_time', endDate);
        if (error) {
            throw new _common.BadRequestException(`Failed to fetch productivity data: ${error.message}`);
        }
        if (!completions || completions.length === 0) {
            return {
                operator_id: operatorId,
                total_operations: 0,
                total_quantity: 0,
                total_rejected: 0,
                total_time_minutes: 0,
                average_time_per_operation: 0
            };
        }
        const totalQuantity = completions.reduce((sum, c)=>sum + c.quantity_completed, 0);
        const totalRejected = completions.reduce((sum, c)=>sum + c.quantity_rejected, 0);
        const totalTime = completions.reduce((sum, c)=>sum + (c.actual_time_minutes || 0), 0);
        return {
            operator_id: operatorId,
            total_operations: completions.length,
            total_quantity: totalQuantity,
            total_rejected: totalRejected,
            rejection_rate: totalQuantity > 0 ? totalRejected / totalQuantity * 100 : 0,
            total_time_minutes: totalTime,
            average_time_per_operation: completions.length > 0 ? totalTime / completions.length : 0
        };
    }
    constructor(){
        this.supabase = (0, _supabasejs.createClient)(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);
    }
};
StationCompletionService = _ts_decorate([
    (0, _common.Injectable)(),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [])
], StationCompletionService);

//# sourceMappingURL=station-completion.service.js.map