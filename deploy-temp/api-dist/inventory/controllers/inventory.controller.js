"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "InventoryController", {
    enumerable: true,
    get: function() {
        return InventoryController;
    }
});
const _common = require("@nestjs/common");
const _inventoryservice = require("../services/inventory.service");
const _itemsservice = require("../../items/services/items.service");
const _jwtauthguard = require("../../auth/guards/jwt-auth.guard");
function _ts_decorate(decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for(var i = decorators.length - 1; i >= 0; i--)if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
}
function _ts_metadata(k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
}
function _ts_param(paramIndex, decorator) {
    return function(target, key) {
        decorator(target, key, paramIndex);
    };
}
let InventoryController = class InventoryController {
    // Items Master
    async getItems(req, search, includeInactive) {
        const includeInactiveBool = includeInactive === 'true';
        return this.itemsService.findAll(req.user.tenantId, search, includeInactiveBool);
    }
    async searchItems(req, query) {
        return this.itemsService.search(req.user.tenantId, query);
    }
    async getItem(req, id) {
        return this.itemsService.findOne(req.user.tenantId, id);
    }
    async createItem(req, body) {
        return this.itemsService.create(req.user.tenantId, body);
    }
    async updateItem(req, id, body) {
        return this.itemsService.update(req.user.tenantId, id, body);
    }
    async deleteItem(req, id) {
        return this.itemsService.delete(req.user.tenantId, id);
    }
    // Stock levels
    async getStockLevels(req, filters) {
        return this.inventoryService.getStockLevels(req, filters);
    }
    async deleteStockEntry(req, id) {
        return this.inventoryService.deleteStockEntry(req, id);
    }
    // Stock movements
    async getStockMovements(req, filters) {
        return this.inventoryService.getStockMovements(req, filters);
    }
    async createStockMovement(req, movementData) {
        return this.inventoryService.createStockMovement(req, movementData);
    }
    async deleteStockMovement(req, id) {
        return this.inventoryService.deleteStockMovement(req, id);
    }
    // Reservations
    async reserveStock(req, reservationData) {
        return this.inventoryService.reserveStock(req, reservationData);
    }
    async releaseReservation(req, reservationId) {
        return this.inventoryService.releaseReservation(req, reservationId);
    }
    // Alerts
    async getAlerts(req, acknowledged) {
        const ack = acknowledged === 'true' ? true : acknowledged === 'false' ? false : undefined;
        return this.inventoryService.getAlerts(req, ack);
    }
    async acknowledgeAlert(req, alertId) {
        return this.inventoryService.acknowledgeAlert(req, alertId);
    }
    async sendLowStockEmail(req, emailData) {
        return this.inventoryService.sendLowStockEmail(req, emailData.recipientEmail);
    }
    async checkAllLowStock(req) {
        return this.inventoryService.checkAllLowStock(req);
    }
    async checkJobOrderAlerts(req) {
        try {
            console.log('[Controller] checkJobOrderAlerts called');
            const result = await this.inventoryService.checkJobOrderAlerts(req);
            console.log('[Controller] checkJobOrderAlerts result:', result);
            return result;
        } catch (error) {
            console.error('[Controller] checkJobOrderAlerts error:', error);
            throw error;
        }
    }
    async deleteAlert(req, alertId) {
        return this.inventoryService.deleteAlert(req, alertId);
    }
    // Demo inventory
    async getDemoInventory(req, filters) {
        return this.inventoryService.getDemoInventory(req, filters);
    }
    async issueDemoStock(req, demoData) {
        return this.inventoryService.issueDemoStock(req, demoData);
    }
    async returnDemoStock(req, demoId, returnData) {
        return this.inventoryService.returnDemoStock(req, demoId, returnData);
    }
    async convertDemoToSale(req, demoId, body) {
        return this.inventoryService.convertDemoToSale(req, demoId, body.sales_order_id);
    }
    async deleteDemoItem(req, id) {
        return this.inventoryService.deleteDemoItem(req, id);
    }
    // Warehouses
    async getWarehouses(req) {
        return this.inventoryService.getWarehouses(req);
    }
    async createWarehouse(req, warehouseData) {
        return this.inventoryService.createWarehouse(req, warehouseData);
    }
    // Item Drawings/Documents
    async getItemDrawings(req, itemId) {
        return this.itemsService.getDrawings(req.user.tenantId, itemId);
    }
    async uploadItemDrawing(req, itemId, drawingData) {
        const userId = req.user?.userId || req.user?.sub || req.user?.id;
        return this.itemsService.uploadDrawing(req.user.tenantId, userId, itemId, drawingData);
    }
    async updateItemDrawing(req, itemId, drawingId, drawingData) {
        return this.itemsService.updateDrawing(req.user.tenantId, itemId, drawingId, drawingData);
    }
    async deleteItemDrawing(req, itemId, drawingId) {
        return this.itemsService.deleteDrawing(req.user.tenantId, itemId, drawingId);
    }
    // Item-Vendor Relationships
    async getItemVendors(req, itemId) {
        return this.itemsService.getItemVendors(req.user.tenantId, itemId);
    }
    async addItemVendor(req, itemId, body) {
        return this.itemsService.addItemVendor(req.user.tenantId, req.user.userId, itemId, body);
    }
    async updateItemVendor(req, itemId, vendorId, body) {
        return this.itemsService.updateItemVendor(req.user.tenantId, req.user.userId, itemId, vendorId, body);
    }
    async deleteItemVendor(req, itemId, vendorId) {
        return this.itemsService.deleteItemVendor(req.user.tenantId, itemId, vendorId);
    }
    constructor(inventoryService, itemsService){
        this.inventoryService = inventoryService;
        this.itemsService = itemsService;
    }
};
_ts_decorate([
    (0, _common.Get)('items'),
    _ts_param(0, (0, _common.Request)()),
    _ts_param(1, (0, _common.Query)('search')),
    _ts_param(2, (0, _common.Query)('includeInactive')),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        Object,
        String,
        String
    ]),
    _ts_metadata("design:returntype", Promise)
], InventoryController.prototype, "getItems", null);
_ts_decorate([
    (0, _common.Get)('items/search'),
    _ts_param(0, (0, _common.Request)()),
    _ts_param(1, (0, _common.Query)('q')),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        Object,
        String
    ]),
    _ts_metadata("design:returntype", Promise)
], InventoryController.prototype, "searchItems", null);
_ts_decorate([
    (0, _common.Get)('items/:id'),
    _ts_param(0, (0, _common.Request)()),
    _ts_param(1, (0, _common.Param)('id')),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        Object,
        String
    ]),
    _ts_metadata("design:returntype", Promise)
], InventoryController.prototype, "getItem", null);
_ts_decorate([
    (0, _common.Post)('items'),
    _ts_param(0, (0, _common.Request)()),
    _ts_param(1, (0, _common.Body)()),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        Object,
        Object
    ]),
    _ts_metadata("design:returntype", Promise)
], InventoryController.prototype, "createItem", null);
_ts_decorate([
    (0, _common.Put)('items/:id'),
    _ts_param(0, (0, _common.Request)()),
    _ts_param(1, (0, _common.Param)('id')),
    _ts_param(2, (0, _common.Body)()),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        Object,
        String,
        Object
    ]),
    _ts_metadata("design:returntype", Promise)
], InventoryController.prototype, "updateItem", null);
_ts_decorate([
    (0, _common.Delete)('items/:id'),
    _ts_param(0, (0, _common.Request)()),
    _ts_param(1, (0, _common.Param)('id')),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        Object,
        String
    ]),
    _ts_metadata("design:returntype", Promise)
], InventoryController.prototype, "deleteItem", null);
_ts_decorate([
    (0, _common.Get)('stock'),
    _ts_param(0, (0, _common.Request)()),
    _ts_param(1, (0, _common.Query)()),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        Object,
        Object
    ]),
    _ts_metadata("design:returntype", Promise)
], InventoryController.prototype, "getStockLevels", null);
_ts_decorate([
    (0, _common.Delete)('stock/:id'),
    _ts_param(0, (0, _common.Request)()),
    _ts_param(1, (0, _common.Param)('id')),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        Object,
        String
    ]),
    _ts_metadata("design:returntype", Promise)
], InventoryController.prototype, "deleteStockEntry", null);
_ts_decorate([
    (0, _common.Get)('movements'),
    _ts_param(0, (0, _common.Request)()),
    _ts_param(1, (0, _common.Query)()),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        Object,
        Object
    ]),
    _ts_metadata("design:returntype", Promise)
], InventoryController.prototype, "getStockMovements", null);
_ts_decorate([
    (0, _common.Post)('movements'),
    _ts_param(0, (0, _common.Request)()),
    _ts_param(1, (0, _common.Body)()),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        Object,
        Object
    ]),
    _ts_metadata("design:returntype", Promise)
], InventoryController.prototype, "createStockMovement", null);
_ts_decorate([
    (0, _common.Delete)('movements/:id'),
    _ts_param(0, (0, _common.Request)()),
    _ts_param(1, (0, _common.Param)('id')),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        Object,
        String
    ]),
    _ts_metadata("design:returntype", Promise)
], InventoryController.prototype, "deleteStockMovement", null);
_ts_decorate([
    (0, _common.Post)('reservations'),
    _ts_param(0, (0, _common.Request)()),
    _ts_param(1, (0, _common.Body)()),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        Object,
        Object
    ]),
    _ts_metadata("design:returntype", Promise)
], InventoryController.prototype, "reserveStock", null);
_ts_decorate([
    (0, _common.Put)('reservations/:id/release'),
    _ts_param(0, (0, _common.Request)()),
    _ts_param(1, (0, _common.Param)('id')),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        Object,
        String
    ]),
    _ts_metadata("design:returntype", Promise)
], InventoryController.prototype, "releaseReservation", null);
_ts_decorate([
    (0, _common.Get)('alerts'),
    _ts_param(0, (0, _common.Request)()),
    _ts_param(1, (0, _common.Query)('acknowledged')),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        Object,
        String
    ]),
    _ts_metadata("design:returntype", Promise)
], InventoryController.prototype, "getAlerts", null);
_ts_decorate([
    (0, _common.Put)('alerts/:id/acknowledge'),
    _ts_param(0, (0, _common.Request)()),
    _ts_param(1, (0, _common.Param)('id')),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        Object,
        String
    ]),
    _ts_metadata("design:returntype", Promise)
], InventoryController.prototype, "acknowledgeAlert", null);
_ts_decorate([
    (0, _common.Post)('alerts/send-email'),
    _ts_param(0, (0, _common.Request)()),
    _ts_param(1, (0, _common.Body)()),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        Object,
        Object
    ]),
    _ts_metadata("design:returntype", Promise)
], InventoryController.prototype, "sendLowStockEmail", null);
_ts_decorate([
    (0, _common.Post)('alerts/check-low-stock'),
    _ts_param(0, (0, _common.Request)()),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        Object
    ]),
    _ts_metadata("design:returntype", Promise)
], InventoryController.prototype, "checkAllLowStock", null);
_ts_decorate([
    (0, _common.Post)('alerts/check-job-orders'),
    _ts_param(0, (0, _common.Request)()),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        Object
    ]),
    _ts_metadata("design:returntype", Promise)
], InventoryController.prototype, "checkJobOrderAlerts", null);
_ts_decorate([
    (0, _common.Delete)('alerts/:id'),
    _ts_param(0, (0, _common.Request)()),
    _ts_param(1, (0, _common.Param)('id')),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        Object,
        String
    ]),
    _ts_metadata("design:returntype", Promise)
], InventoryController.prototype, "deleteAlert", null);
_ts_decorate([
    (0, _common.Get)('demo'),
    _ts_param(0, (0, _common.Request)()),
    _ts_param(1, (0, _common.Query)()),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        Object,
        Object
    ]),
    _ts_metadata("design:returntype", Promise)
], InventoryController.prototype, "getDemoInventory", null);
_ts_decorate([
    (0, _common.Post)('demo/issue'),
    _ts_param(0, (0, _common.Request)()),
    _ts_param(1, (0, _common.Body)()),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        Object,
        Object
    ]),
    _ts_metadata("design:returntype", Promise)
], InventoryController.prototype, "issueDemoStock", null);
_ts_decorate([
    (0, _common.Put)('demo/:demoId/return'),
    _ts_param(0, (0, _common.Request)()),
    _ts_param(1, (0, _common.Param)('demoId')),
    _ts_param(2, (0, _common.Body)()),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        Object,
        String,
        Object
    ]),
    _ts_metadata("design:returntype", Promise)
], InventoryController.prototype, "returnDemoStock", null);
_ts_decorate([
    (0, _common.Put)('demo/:demoId/convert-to-sale'),
    _ts_param(0, (0, _common.Request)()),
    _ts_param(1, (0, _common.Param)('demoId')),
    _ts_param(2, (0, _common.Body)()),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        Object,
        String,
        Object
    ]),
    _ts_metadata("design:returntype", Promise)
], InventoryController.prototype, "convertDemoToSale", null);
_ts_decorate([
    (0, _common.Delete)('demo/:id'),
    _ts_param(0, (0, _common.Request)()),
    _ts_param(1, (0, _common.Param)('id')),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        Object,
        String
    ]),
    _ts_metadata("design:returntype", Promise)
], InventoryController.prototype, "deleteDemoItem", null);
_ts_decorate([
    (0, _common.Get)('warehouses'),
    _ts_param(0, (0, _common.Request)()),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        Object
    ]),
    _ts_metadata("design:returntype", Promise)
], InventoryController.prototype, "getWarehouses", null);
_ts_decorate([
    (0, _common.Post)('warehouses'),
    _ts_param(0, (0, _common.Request)()),
    _ts_param(1, (0, _common.Body)()),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        Object,
        Object
    ]),
    _ts_metadata("design:returntype", Promise)
], InventoryController.prototype, "createWarehouse", null);
_ts_decorate([
    (0, _common.Get)('items/:id/drawings'),
    _ts_param(0, (0, _common.Request)()),
    _ts_param(1, (0, _common.Param)('id')),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        Object,
        String
    ]),
    _ts_metadata("design:returntype", Promise)
], InventoryController.prototype, "getItemDrawings", null);
_ts_decorate([
    (0, _common.Post)('items/:id/drawings'),
    _ts_param(0, (0, _common.Request)()),
    _ts_param(1, (0, _common.Param)('id')),
    _ts_param(2, (0, _common.Body)()),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        Object,
        String,
        Object
    ]),
    _ts_metadata("design:returntype", Promise)
], InventoryController.prototype, "uploadItemDrawing", null);
_ts_decorate([
    (0, _common.Put)('items/:id/drawings/:drawingId'),
    _ts_param(0, (0, _common.Request)()),
    _ts_param(1, (0, _common.Param)('id')),
    _ts_param(2, (0, _common.Param)('drawingId')),
    _ts_param(3, (0, _common.Body)()),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        Object,
        String,
        String,
        Object
    ]),
    _ts_metadata("design:returntype", Promise)
], InventoryController.prototype, "updateItemDrawing", null);
_ts_decorate([
    (0, _common.Delete)('items/:id/drawings/:drawingId'),
    _ts_param(0, (0, _common.Request)()),
    _ts_param(1, (0, _common.Param)('id')),
    _ts_param(2, (0, _common.Param)('drawingId')),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        Object,
        String,
        String
    ]),
    _ts_metadata("design:returntype", Promise)
], InventoryController.prototype, "deleteItemDrawing", null);
_ts_decorate([
    (0, _common.Get)('items/:id/vendors'),
    _ts_param(0, (0, _common.Request)()),
    _ts_param(1, (0, _common.Param)('id')),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        Object,
        String
    ]),
    _ts_metadata("design:returntype", Promise)
], InventoryController.prototype, "getItemVendors", null);
_ts_decorate([
    (0, _common.Post)('items/:id/vendors'),
    _ts_param(0, (0, _common.Request)()),
    _ts_param(1, (0, _common.Param)('id')),
    _ts_param(2, (0, _common.Body)()),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        Object,
        String,
        Object
    ]),
    _ts_metadata("design:returntype", Promise)
], InventoryController.prototype, "addItemVendor", null);
_ts_decorate([
    (0, _common.Put)('items/:id/vendors/:vendorId'),
    _ts_param(0, (0, _common.Request)()),
    _ts_param(1, (0, _common.Param)('id')),
    _ts_param(2, (0, _common.Param)('vendorId')),
    _ts_param(3, (0, _common.Body)()),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        Object,
        String,
        String,
        Object
    ]),
    _ts_metadata("design:returntype", Promise)
], InventoryController.prototype, "updateItemVendor", null);
_ts_decorate([
    (0, _common.Delete)('items/:id/vendors/:vendorId'),
    _ts_param(0, (0, _common.Request)()),
    _ts_param(1, (0, _common.Param)('id')),
    _ts_param(2, (0, _common.Param)('vendorId')),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        Object,
        String,
        String
    ]),
    _ts_metadata("design:returntype", Promise)
], InventoryController.prototype, "deleteItemVendor", null);
InventoryController = _ts_decorate([
    (0, _common.Controller)('inventory'),
    (0, _common.UseGuards)(_jwtauthguard.JwtAuthGuard),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        typeof _inventoryservice.InventoryService === "undefined" ? Object : _inventoryservice.InventoryService,
        typeof _itemsservice.ItemsService === "undefined" ? Object : _itemsservice.ItemsService
    ])
], InventoryController);

//# sourceMappingURL=inventory.controller.js.map