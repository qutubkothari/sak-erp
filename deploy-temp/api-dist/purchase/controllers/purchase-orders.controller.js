"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "PurchaseOrdersController", {
    enumerable: true,
    get: function() {
        return PurchaseOrdersController;
    }
});
const _common = require("@nestjs/common");
const _purchaseordersservice = require("../services/purchase-orders.service");
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
let PurchaseOrdersController = class PurchaseOrdersController {
    async create(req, body) {
        return this.poService.create(req.user.tenantId, req.user.userId, body);
    }
    async findAll(req, query) {
        return this.poService.findAll(req.user.tenantId, query);
    }
    async findOne(req, id) {
        return this.poService.findOne(req.user.tenantId, id);
    }
    async update(req, id, body) {
        return this.poService.update(req.user.tenantId, id, body);
    }
    async updateStatus(req, id, body) {
        return this.poService.updateStatus(req.user.tenantId, id, body.status);
    }
    async updateTracking(req, id, body) {
        return this.poService.updateTracking(req.user.tenantId, id, body);
    }
    async sendPOEmail(req, id) {
        return this.poService.sendPOEmail(req.user.tenantId, id);
    }
    async sendTrackingReminder(req, id) {
        return this.poService.sendTrackingReminder(req.user.tenantId, id);
    }
    async delete(req, id) {
        return this.poService.delete(req.user.tenantId, id);
    }
    constructor(poService){
        this.poService = poService;
    }
};
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
], PurchaseOrdersController.prototype, "create", null);
_ts_decorate([
    (0, _common.Get)(),
    _ts_param(0, (0, _common.Request)()),
    _ts_param(1, (0, _common.Query)()),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        Object,
        Object
    ]),
    _ts_metadata("design:returntype", Promise)
], PurchaseOrdersController.prototype, "findAll", null);
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
], PurchaseOrdersController.prototype, "findOne", null);
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
], PurchaseOrdersController.prototype, "update", null);
_ts_decorate([
    (0, _common.Post)(':id/status'),
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
], PurchaseOrdersController.prototype, "updateStatus", null);
_ts_decorate([
    (0, _common.Post)(':id/tracking'),
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
], PurchaseOrdersController.prototype, "updateTracking", null);
_ts_decorate([
    (0, _common.Post)(':id/send-email'),
    _ts_param(0, (0, _common.Request)()),
    _ts_param(1, (0, _common.Param)('id')),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        Object,
        String
    ]),
    _ts_metadata("design:returntype", Promise)
], PurchaseOrdersController.prototype, "sendPOEmail", null);
_ts_decorate([
    (0, _common.Post)(':id/send-tracking-reminder'),
    _ts_param(0, (0, _common.Request)()),
    _ts_param(1, (0, _common.Param)('id')),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        Object,
        String
    ]),
    _ts_metadata("design:returntype", Promise)
], PurchaseOrdersController.prototype, "sendTrackingReminder", null);
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
], PurchaseOrdersController.prototype, "delete", null);
PurchaseOrdersController = _ts_decorate([
    (0, _common.Controller)('purchase/orders'),
    (0, _common.UseGuards)(_jwtauthguard.JwtAuthGuard),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        typeof _purchaseordersservice.PurchaseOrdersService === "undefined" ? Object : _purchaseordersservice.PurchaseOrdersService
    ])
], PurchaseOrdersController);

//# sourceMappingURL=purchase-orders.controller.js.map