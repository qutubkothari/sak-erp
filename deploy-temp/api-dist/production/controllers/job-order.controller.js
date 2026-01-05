"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "JobOrderController", {
    enumerable: true,
    get: function() {
        return JobOrderController;
    }
});
const _common = require("@nestjs/common");
const _joborderservice = require("../services/job-order.service");
const _joborderdto = require("../dto/job-order.dto");
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
let JobOrderController = class JobOrderController {
    async getSmartPreview(req, query) {
        const tenantId = req.user?.tenantId || req.headers['x-tenant-id'];
        const quantity = typeof query.quantity === 'string' ? Number(query.quantity) : Number(query.quantity);
        return this.jobOrderService.getSmartJobOrderPreview(tenantId, {
            itemId: String(query.itemId || ''),
            quantity,
            salesOrderId: query.salesOrderId,
            salesOrderItemId: query.salesOrderItemId
        });
    }
    async createSmartJobOrder(req, body) {
        const tenantId = req.user?.tenantId || req.headers['x-tenant-id'];
        const userId = req.user?.id || req.user?.sub;
        return this.jobOrderService.createSmartJobOrder(tenantId, userId, body);
    }
    async create(req, dto) {
        const tenantId = req.user?.tenantId || req.headers['x-tenant-id'];
        const userId = req.user?.id;
        return this.jobOrderService.create(tenantId, userId, dto);
    }
    async createFromBOM(req, body) {
        const tenantId = req.user?.tenantId || req.headers['x-tenant-id'];
        const userId = req.user?.id;
        return this.jobOrderService.createFromBOM(tenantId, userId, body.itemId, body.bomId, body.quantity, body.startDate);
    }
    async findAll(req, filters) {
        const tenantId = req.user?.tenantId || req.headers['x-tenant-id'];
        return this.jobOrderService.findAll(tenantId, filters);
    }
    async findOne(req, id) {
        const tenantId = req.user?.tenantId || req.headers['x-tenant-id'];
        return this.jobOrderService.findOne(tenantId, id);
    }
    async update(req, id, dto) {
        const tenantId = req.user?.tenantId || req.headers['x-tenant-id'];
        return this.jobOrderService.update(tenantId, id, dto);
    }
    async updateStatus(req, id, status) {
        const tenantId = req.user?.tenantId || req.headers['x-tenant-id'];
        return this.jobOrderService.updateStatus(tenantId, id, status);
    }
    async updateOperation(req, id, operationId, dto) {
        const tenantId = req.user?.tenantId || req.headers['x-tenant-id'];
        return this.jobOrderService.updateOperation(tenantId, id, operationId, dto);
    }
    async completeJobOrder(req, id) {
        const tenantId = req.user?.tenantId || req.headers['x-tenant-id'];
        const userId = req.user?.id || req.user?.sub;
        return this.jobOrderService.completeJobOrder(tenantId, id, userId);
    }
    async getCompletionPreview(req, id) {
        const tenantId = req.user?.tenantId || req.headers['x-tenant-id'];
        return this.jobOrderService.getCompletionPreview(tenantId, id);
    }
    async delete(req, id) {
        const tenantId = req.user?.tenantId || req.headers['x-tenant-id'];
        return this.jobOrderService.delete(tenantId, id);
    }
    constructor(jobOrderService){
        this.jobOrderService = jobOrderService;
    }
};
_ts_decorate([
    (0, _common.Get)('smart/preview'),
    _ts_param(0, (0, _common.Request)()),
    _ts_param(1, (0, _common.Query)()),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        Object,
        Object
    ]),
    _ts_metadata("design:returntype", Promise)
], JobOrderController.prototype, "getSmartPreview", null);
_ts_decorate([
    (0, _common.Post)('smart/create'),
    _ts_param(0, (0, _common.Request)()),
    _ts_param(1, (0, _common.Body)()),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        Object,
        Object
    ]),
    _ts_metadata("design:returntype", Promise)
], JobOrderController.prototype, "createSmartJobOrder", null);
_ts_decorate([
    (0, _common.Post)(),
    _ts_param(0, (0, _common.Request)()),
    _ts_param(1, (0, _common.Body)()),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        Object,
        typeof _joborderdto.CreateJobOrderDto === "undefined" ? Object : _joborderdto.CreateJobOrderDto
    ]),
    _ts_metadata("design:returntype", Promise)
], JobOrderController.prototype, "create", null);
_ts_decorate([
    (0, _common.Post)('from-bom'),
    _ts_param(0, (0, _common.Request)()),
    _ts_param(1, (0, _common.Body)()),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        Object,
        Object
    ]),
    _ts_metadata("design:returntype", Promise)
], JobOrderController.prototype, "createFromBOM", null);
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
], JobOrderController.prototype, "findAll", null);
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
], JobOrderController.prototype, "findOne", null);
_ts_decorate([
    (0, _common.Put)(':id'),
    _ts_param(0, (0, _common.Request)()),
    _ts_param(1, (0, _common.Param)('id')),
    _ts_param(2, (0, _common.Body)()),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        Object,
        String,
        typeof _joborderdto.UpdateJobOrderDto === "undefined" ? Object : _joborderdto.UpdateJobOrderDto
    ]),
    _ts_metadata("design:returntype", Promise)
], JobOrderController.prototype, "update", null);
_ts_decorate([
    (0, _common.Put)(':id/status'),
    _ts_param(0, (0, _common.Request)()),
    _ts_param(1, (0, _common.Param)('id')),
    _ts_param(2, (0, _common.Body)('status')),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        Object,
        String,
        String
    ]),
    _ts_metadata("design:returntype", Promise)
], JobOrderController.prototype, "updateStatus", null);
_ts_decorate([
    (0, _common.Put)(':id/operations/:operationId'),
    _ts_param(0, (0, _common.Request)()),
    _ts_param(1, (0, _common.Param)('id')),
    _ts_param(2, (0, _common.Param)('operationId')),
    _ts_param(3, (0, _common.Body)()),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        Object,
        String,
        String,
        typeof _joborderdto.UpdateOperationDto === "undefined" ? Object : _joborderdto.UpdateOperationDto
    ]),
    _ts_metadata("design:returntype", Promise)
], JobOrderController.prototype, "updateOperation", null);
_ts_decorate([
    (0, _common.Post)(':id/complete'),
    _ts_param(0, (0, _common.Request)()),
    _ts_param(1, (0, _common.Param)('id')),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        Object,
        String
    ]),
    _ts_metadata("design:returntype", Promise)
], JobOrderController.prototype, "completeJobOrder", null);
_ts_decorate([
    (0, _common.Get)(':id/completion-preview'),
    _ts_param(0, (0, _common.Request)()),
    _ts_param(1, (0, _common.Param)('id')),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        Object,
        String
    ]),
    _ts_metadata("design:returntype", Promise)
], JobOrderController.prototype, "getCompletionPreview", null);
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
], JobOrderController.prototype, "delete", null);
JobOrderController = _ts_decorate([
    (0, _common.Controller)('job-orders'),
    (0, _common.UseGuards)(_jwtauthguard.JwtAuthGuard),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        typeof _joborderservice.JobOrderService === "undefined" ? Object : _joborderservice.JobOrderService
    ])
], JobOrderController);

//# sourceMappingURL=job-order.controller.js.map