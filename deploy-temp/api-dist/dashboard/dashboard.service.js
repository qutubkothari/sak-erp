"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "DashboardService", {
    enumerable: true,
    get: function() {
        return DashboardService;
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
let DashboardService = class DashboardService {
    async getStats(tenantId) {
        // Get active sales orders count
        const { count: activeOrders } = await this.supabase.from('sales_orders').select('*', {
            count: 'exact',
            head: true
        }).eq('tenant_id', tenantId).in('status', [
            'PENDING',
            'CONFIRMED',
            'IN_PRODUCTION'
        ]);
        // Get pending purchase orders count
        const { count: pendingPOs } = await this.supabase.from('purchase_orders').select('*', {
            count: 'exact',
            head: true
        }).eq('tenant_id', tenantId).in('status', [
            'DRAFT',
            'PENDING',
            'APPROVED'
        ]);
        // Get in production count
        const { count: inProduction } = await this.supabase.from('production_orders').select('*', {
            count: 'exact',
            head: true
        }).eq('tenant_id', tenantId).in('status', [
            'IN_PROGRESS',
            'STARTED'
        ]);
        // Get ready to ship count
        const { count: readyToShip } = await this.supabase.from('sales_orders').select('*', {
            count: 'exact',
            head: true
        }).eq('tenant_id', tenantId).eq('status', 'READY_TO_SHIP');
        // Get low stock alerts count
        const { count: lowStockCount } = await this.supabase.from('inventory_alerts').select('*', {
            count: 'exact',
            head: true
        }).eq('tenant_id', tenantId).eq('acknowledged', false);
        return {
            activeOrders: activeOrders || 0,
            pendingPOs: pendingPOs || 0,
            inProduction: inProduction || 0,
            readyToShip: readyToShip || 0,
            lowStockCount: lowStockCount || 0
        };
    }
    constructor(){
        this.supabase = (0, _supabasejs.createClient)(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);
    }
};
DashboardService = _ts_decorate([
    (0, _common.Injectable)(),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [])
], DashboardService);

//# sourceMappingURL=dashboard.service.js.map