"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "ItemsController", {
    enumerable: true,
    get: function() {
        return ItemsController;
    }
});
const _common = require("@nestjs/common");
const _itemsservice = require("../services/items.service");
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
let ItemsController = class ItemsController {
    async findAll(req, search, includeInactive) {
        const includeInactiveBool = includeInactive === 'true';
        console.log('[ItemsController] findAll called:', {
            tenantId: req.user.tenantId,
            search,
            includeInactive,
            includeInactiveBool
        });
        const result = await this.itemsService.findAll(req.user.tenantId, search, includeInactiveBool);
        console.log('[ItemsController] findAll result:', {
            count: result.length
        });
        return result;
    }
    async search(req, query) {
        return this.itemsService.search(req.user.tenantId, query);
    }
    async findOne(req, id) {
        return this.itemsService.findOne(req.user.tenantId, id);
    }
    async create(req, body) {
        return this.itemsService.create(req.user.tenantId, body);
    }
    async bulkCreate(req, body) {
        return this.itemsService.bulkCreate(req.user.tenantId, body.items);
    }
    async update(req, id, body) {
        return this.itemsService.update(req.user.tenantId, id, body);
    }
    async delete(req, id) {
        return this.itemsService.delete(req.user.tenantId, id);
    }
    // Item-Vendor Relationships
    async getItemVendors(req, id) {
        return this.itemsService.getItemVendors(req.user.tenantId, id);
    }
    async getPreferredVendor(req, id) {
        return this.itemsService.getPreferredVendor(id);
    }
    async addVendor(req, id, body) {
        return this.itemsService.addItemVendor(req.user.tenantId, req.user.userId, id, body);
    }
    async updateVendor(req, id, vendorId, body) {
        return this.itemsService.updateItemVendor(req.user.tenantId, req.user.userId, id, vendorId, body);
    }
    async removeVendor(req, id, vendorId) {
        return this.itemsService.deleteItemVendor(req.user.tenantId, id, vendorId);
    }
    async getPriceHistory(req, itemId, vendorId) {
        return this.itemsService.getPurchasePriceHistory(itemId, vendorId);
    }
    async getItemStock(req, itemId) {
        return this.itemsService.getItemStock(itemId, req.user.tenantId);
    }
    async getItemVariants(req, itemId) {
        return this.itemsService.getItemVariants(req.user.tenantId, itemId);
    }
    async getDefaultVariant(req, itemId) {
        return this.itemsService.getDefaultVariant(req.user.tenantId, itemId);
    }
    constructor(itemsService){
        this.itemsService = itemsService;
    }
};
_ts_decorate([
    (0, _common.Get)(),
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
], ItemsController.prototype, "findAll", null);
_ts_decorate([
    (0, _common.Get)('search'),
    _ts_param(0, (0, _common.Request)()),
    _ts_param(1, (0, _common.Query)('q')),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        Object,
        String
    ]),
    _ts_metadata("design:returntype", Promise)
], ItemsController.prototype, "search", null);
_ts_decorate([
    (0, _common.Get)(':id'),
    _ts_param(0, (0, _common.Request)()),
    _ts_param(1, (0, _common.Param)('id')),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        Object,
        String
    ]),
    _ts_metadata("design:returntype", Promise)
], ItemsController.prototype, "findOne", null);
_ts_decorate([
    (0, _common.Post)(),
    _ts_param(0, (0, _common.Request)()),
    _ts_param(1, (0, _common.Body)()),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        Object,
        Object
    ]),
    _ts_metadata("design:returntype", Promise)
], ItemsController.prototype, "create", null);
_ts_decorate([
    (0, _common.Post)('bulk'),
    _ts_param(0, (0, _common.Request)()),
    _ts_param(1, (0, _common.Body)()),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        Object,
        Object
    ]),
    _ts_metadata("design:returntype", Promise)
], ItemsController.prototype, "bulkCreate", null);
_ts_decorate([
    (0, _common.Put)(':id'),
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
], ItemsController.prototype, "update", null);
_ts_decorate([
    (0, _common.Delete)(':id'),
    _ts_param(0, (0, _common.Request)()),
    _ts_param(1, (0, _common.Param)('id')),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        Object,
        String
    ]),
    _ts_metadata("design:returntype", Promise)
], ItemsController.prototype, "delete", null);
_ts_decorate([
    (0, _common.Get)(':id/vendors'),
    _ts_param(0, (0, _common.Request)()),
    _ts_param(1, (0, _common.Param)('id')),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        Object,
        String
    ]),
    _ts_metadata("design:returntype", Promise)
], ItemsController.prototype, "getItemVendors", null);
_ts_decorate([
    (0, _common.Get)(':id/vendors/preferred'),
    _ts_param(0, (0, _common.Request)()),
    _ts_param(1, (0, _common.Param)('id')),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        Object,
        String
    ]),
    _ts_metadata("design:returntype", Promise)
], ItemsController.prototype, "getPreferredVendor", null);
_ts_decorate([
    (0, _common.Post)(':id/vendors'),
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
], ItemsController.prototype, "addVendor", null);
_ts_decorate([
    (0, _common.Put)(':id/vendors/:vendorId'),
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
], ItemsController.prototype, "updateVendor", null);
_ts_decorate([
    (0, _common.Delete)(':id/vendors/:vendorId'),
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
], ItemsController.prototype, "removeVendor", null);
_ts_decorate([
    (0, _common.Get)(':id/vendors/:vendorId/price-history'),
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
], ItemsController.prototype, "getPriceHistory", null);
_ts_decorate([
    (0, _common.Get)(':id/stock'),
    _ts_param(0, (0, _common.Request)()),
    _ts_param(1, (0, _common.Param)('id')),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        Object,
        String
    ]),
    _ts_metadata("design:returntype", Promise)
], ItemsController.prototype, "getItemStock", null);
_ts_decorate([
    (0, _common.Get)(':id/variants'),
    _ts_param(0, (0, _common.Request)()),
    _ts_param(1, (0, _common.Param)('id')),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        Object,
        String
    ]),
    _ts_metadata("design:returntype", Promise)
], ItemsController.prototype, "getItemVariants", null);
_ts_decorate([
    (0, _common.Get)(':id/default-variant'),
    _ts_param(0, (0, _common.Request)()),
    _ts_param(1, (0, _common.Param)('id')),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        Object,
        String
    ]),
    _ts_metadata("design:returntype", Promise)
], ItemsController.prototype, "getDefaultVariant", null);
ItemsController = _ts_decorate([
    (0, _common.Controller)('items'),
    (0, _common.UseGuards)(_jwtauthguard.JwtAuthGuard),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        typeof _itemsservice.ItemsService === "undefined" ? Object : _itemsservice.ItemsService
    ])
], ItemsController);

//# sourceMappingURL=items.controller.js.map