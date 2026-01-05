"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "DebitNoteController", {
    enumerable: true,
    get: function() {
        return DebitNoteController;
    }
});
const _common = require("@nestjs/common");
const _debitnoteservice = require("../services/debit-note.service");
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
let DebitNoteController = class DebitNoteController {
    async findAll(req, query) {
        const tenantId = req.user.tenantId;
        return this.debitNoteService.findAll(tenantId, query);
    }
    async getVendorPayables(req) {
        const tenantId = req.user.tenantId;
        return this.debitNoteService.getVendorPayables(tenantId);
    }
    async findByGrn(req, grnId) {
        const tenantId = req.user.tenantId;
        return this.debitNoteService.findByGrn(tenantId, grnId);
    }
    async findOne(req, id) {
        const tenantId = req.user.tenantId;
        return this.debitNoteService.findOne(tenantId, id);
    }
    async create(req, body) {
        const tenantId = req.user.tenantId;
        const userId = req.user.userId;
        return this.debitNoteService.create(tenantId, userId, body);
    }
    async approve(req, id) {
        const tenantId = req.user.tenantId;
        const userId = req.user.userId;
        return this.debitNoteService.approve(tenantId, id, userId);
    }
    async sendEmail(req, id) {
        const tenantId = req.user.tenantId;
        return this.debitNoteService.sendEmail(tenantId, id);
    }
    async updateStatus(req, id, body) {
        const tenantId = req.user.tenantId;
        return this.debitNoteService.updateStatus(tenantId, id, body.status);
    }
    async updateReturnStatus(req, id, itemId, body) {
        const tenantId = req.user.tenantId;
        return this.debitNoteService.updateReturnStatus(tenantId, id, itemId, body.returnStatus, body.disposalNotes);
    }
    async recordPayment(req, grnId, body) {
        const tenantId = req.user.tenantId;
        return this.debitNoteService.recordPayment(tenantId, grnId, body);
    }
    constructor(debitNoteService){
        this.debitNoteService = debitNoteService;
    }
};
_ts_decorate([
    (0, _common.Get)(),
    _ts_param(0, (0, _common.Req)()),
    _ts_param(1, (0, _common.Query)()),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        Object,
        Object
    ]),
    _ts_metadata("design:returntype", Promise)
], DebitNoteController.prototype, "findAll", null);
_ts_decorate([
    (0, _common.Get)('vendor-payables'),
    _ts_param(0, (0, _common.Req)()),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        Object
    ]),
    _ts_metadata("design:returntype", Promise)
], DebitNoteController.prototype, "getVendorPayables", null);
_ts_decorate([
    (0, _common.Get)('grn/:grnId'),
    _ts_param(0, (0, _common.Req)()),
    _ts_param(1, (0, _common.Param)('grnId')),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        Object,
        String
    ]),
    _ts_metadata("design:returntype", Promise)
], DebitNoteController.prototype, "findByGrn", null);
_ts_decorate([
    (0, _common.Get)(':id'),
    _ts_param(0, (0, _common.Req)()),
    _ts_param(1, (0, _common.Param)('id')),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        Object,
        String
    ]),
    _ts_metadata("design:returntype", Promise)
], DebitNoteController.prototype, "findOne", null);
_ts_decorate([
    (0, _common.Post)(),
    _ts_param(0, (0, _common.Req)()),
    _ts_param(1, (0, _common.Body)()),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        Object,
        Object
    ]),
    _ts_metadata("design:returntype", Promise)
], DebitNoteController.prototype, "create", null);
_ts_decorate([
    (0, _common.Post)(':id/approve'),
    _ts_param(0, (0, _common.Req)()),
    _ts_param(1, (0, _common.Param)('id')),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        Object,
        String
    ]),
    _ts_metadata("design:returntype", Promise)
], DebitNoteController.prototype, "approve", null);
_ts_decorate([
    (0, _common.Post)(':id/send-email'),
    _ts_param(0, (0, _common.Req)()),
    _ts_param(1, (0, _common.Param)('id')),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        Object,
        String
    ]),
    _ts_metadata("design:returntype", Promise)
], DebitNoteController.prototype, "sendEmail", null);
_ts_decorate([
    (0, _common.Put)(':id/status'),
    _ts_param(0, (0, _common.Req)()),
    _ts_param(1, (0, _common.Param)('id')),
    _ts_param(2, (0, _common.Body)()),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        Object,
        String,
        Object
    ]),
    _ts_metadata("design:returntype", Promise)
], DebitNoteController.prototype, "updateStatus", null);
_ts_decorate([
    (0, _common.Put)(':id/items/:itemId/return-status'),
    _ts_param(0, (0, _common.Req)()),
    _ts_param(1, (0, _common.Param)('id')),
    _ts_param(2, (0, _common.Param)('itemId')),
    _ts_param(3, (0, _common.Body)()),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        Object,
        String,
        String,
        Object
    ]),
    _ts_metadata("design:returntype", Promise)
], DebitNoteController.prototype, "updateReturnStatus", null);
_ts_decorate([
    (0, _common.Post)('grn/:grnId/payment'),
    _ts_param(0, (0, _common.Req)()),
    _ts_param(1, (0, _common.Param)('grnId')),
    _ts_param(2, (0, _common.Body)()),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        Object,
        String,
        Object
    ]),
    _ts_metadata("design:returntype", Promise)
], DebitNoteController.prototype, "recordPayment", null);
DebitNoteController = _ts_decorate([
    (0, _common.Controller)('purchase/debit-notes'),
    (0, _common.UseGuards)(_jwtauthguard.JwtAuthGuard),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        typeof _debitnoteservice.DebitNoteService === "undefined" ? Object : _debitnoteservice.DebitNoteService
    ])
], DebitNoteController);

//# sourceMappingURL=debit-note.controller.js.map