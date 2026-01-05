"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "PurchaseRequisitionsController", {
    enumerable: true,
    get: function() {
        return PurchaseRequisitionsController;
    }
});
const _common = require("@nestjs/common");
const _purchaserequisitionsservice = require("../services/purchase-requisitions.service");
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
let PurchaseRequisitionsController = class PurchaseRequisitionsController {
    async create(req, body) {
        return this.prService.create(req.user.tenantId, req.user.userId, body);
    }
    async findAll(req, query) {
        return this.prService.findAll(req.user.tenantId, query);
    }
    async findOne(req, id) {
        return this.prService.findOne(req.user.tenantId, id);
    }
    async update(req, id, body) {
        return this.prService.update(req.user.tenantId, id, body);
    }
    async submit(req, id) {
        return this.prService.submit(req.user.tenantId, id);
    }
    async approve(req, id) {
        return this.prService.approve(req.user.tenantId, id, req.user.userId);
    }
    async reject(req, id) {
        return this.prService.reject(req.user.tenantId, id, req.user.userId);
    }
    async sendRFQ(req, id, body) {
        return this.prService.sendRFQ(req.user.tenantId, id, body);
    }
    async delete(req, id) {
        return this.prService.delete(req.user.tenantId, id);
    }
    constructor(prService){
        this.prService = prService;
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
], PurchaseRequisitionsController.prototype, "create", null);
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
], PurchaseRequisitionsController.prototype, "findAll", null);
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
], PurchaseRequisitionsController.prototype, "findOne", null);
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
], PurchaseRequisitionsController.prototype, "update", null);
_ts_decorate([
    (0, _common.Post)(':id/submit'),
    _ts_param(0, (0, _common.Request)()),
    _ts_param(1, (0, _common.Param)('id')),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        Object,
        String
    ]),
    _ts_metadata("design:returntype", Promise)
], PurchaseRequisitionsController.prototype, "submit", null);
_ts_decorate([
    (0, _common.Post)(':id/approve'),
    _ts_param(0, (0, _common.Request)()),
    _ts_param(1, (0, _common.Param)('id')),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        Object,
        String
    ]),
    _ts_metadata("design:returntype", Promise)
], PurchaseRequisitionsController.prototype, "approve", null);
_ts_decorate([
    (0, _common.Post)(':id/reject'),
    _ts_param(0, (0, _common.Request)()),
    _ts_param(1, (0, _common.Param)('id')),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        Object,
        String
    ]),
    _ts_metadata("design:returntype", Promise)
], PurchaseRequisitionsController.prototype, "reject", null);
_ts_decorate([
    (0, _common.Post)(':id/rfq/send'),
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
], PurchaseRequisitionsController.prototype, "sendRFQ", null);
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
], PurchaseRequisitionsController.prototype, "delete", null);
PurchaseRequisitionsController = _ts_decorate([
    (0, _common.Controller)('purchase/requisitions'),
    (0, _common.UseGuards)(_jwtauthguard.JwtAuthGuard),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        typeof _purchaserequisitionsservice.PurchaseRequisitionsService === "undefined" ? Object : _purchaserequisitionsservice.PurchaseRequisitionsService
    ])
], PurchaseRequisitionsController);

//# sourceMappingURL=purchase-requisitions.controller.js.map