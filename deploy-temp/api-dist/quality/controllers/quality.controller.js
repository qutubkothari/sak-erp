"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "QualityController", {
    enumerable: true,
    get: function() {
        return QualityController;
    }
});
const _common = require("@nestjs/common");
const _qualityservice = require("../services/quality.service");
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
let QualityController = class QualityController {
    // ==================== Inspections ====================
    async createInspection(req, body) {
        return this.qualityService.createInspection(req.user.tenantId, req.user.userId, body);
    }
    async getInspections(req, query) {
        return this.qualityService.getInspections(req.user.tenantId, query);
    }
    async getInspectionById(req, id) {
        return this.qualityService.getInspectionById(req.user.tenantId, id);
    }
    async updateInspection(req, id, body) {
        return this.qualityService.updateInspection(req.user.tenantId, id, body);
    }
    async deleteInspection(req, id) {
        return this.qualityService.deleteInspection(req.user.tenantId, id);
    }
    async completeInspection(req, id, body) {
        return this.qualityService.completeInspection(req.user.tenantId, req.user.userId, id, body);
    }
    async addInspectionParameters(id, body) {
        return this.qualityService.addInspectionParameters(id, body.parameters);
    }
    async addInspectionDefects(id, body) {
        return this.qualityService.addInspectionDefects(id, body.defects);
    }
    // ==================== NCR Management ====================
    async createNCR(req, body) {
        return this.qualityService.createNCR(req.user.tenantId, req.user.userId, body);
    }
    async getNCRs(req, query) {
        return this.qualityService.getNCRs(req.user.tenantId, query);
    }
    async getNCRById(req, id) {
        return this.qualityService.getNCRById(req.user.tenantId, id);
    }
    async updateNCR(req, id, body) {
        return this.qualityService.updateNCR(req.user.tenantId, id, body);
    }
    async closeNCR(req, id, body) {
        return this.qualityService.closeNCR(req.user.tenantId, id, req.user.userId, body);
    }
    // ==================== Quality Analytics ====================
    async getVendorQualityRatings(req, vendorId) {
        return this.qualityService.getVendorQualityRatings(req.user.tenantId, vendorId);
    }
    async calculateVendorQualityRating(req, body) {
        return this.qualityService.calculateVendorQualityRating(req.user.tenantId, body.vendor_id, body.period_start, body.period_end);
    }
    async getQualityDashboard(req) {
        return this.qualityService.getQualityDashboard(req.user.tenantId);
    }
    constructor(qualityService){
        this.qualityService = qualityService;
    }
};
_ts_decorate([
    (0, _common.Post)('inspections'),
    _ts_param(0, (0, _common.Request)()),
    _ts_param(1, (0, _common.Body)()),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        Object,
        Object
    ]),
    _ts_metadata("design:returntype", Promise)
], QualityController.prototype, "createInspection", null);
_ts_decorate([
    (0, _common.Get)('inspections'),
    _ts_param(0, (0, _common.Request)()),
    _ts_param(1, (0, _common.Query)()),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        Object,
        Object
    ]),
    _ts_metadata("design:returntype", Promise)
], QualityController.prototype, "getInspections", null);
_ts_decorate([
    (0, _common.Get)('inspections/:id'),
    _ts_param(0, (0, _common.Request)()),
    _ts_param(1, (0, _common.Param)('id')),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        Object,
        String
    ]),
    _ts_metadata("design:returntype", Promise)
], QualityController.prototype, "getInspectionById", null);
_ts_decorate([
    (0, _common.Put)('inspections/:id'),
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
], QualityController.prototype, "updateInspection", null);
_ts_decorate([
    (0, _common.Delete)('inspections/:id'),
    _ts_param(0, (0, _common.Request)()),
    _ts_param(1, (0, _common.Param)('id')),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        Object,
        String
    ]),
    _ts_metadata("design:returntype", Promise)
], QualityController.prototype, "deleteInspection", null);
_ts_decorate([
    (0, _common.Post)('inspections/:id/complete'),
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
], QualityController.prototype, "completeInspection", null);
_ts_decorate([
    (0, _common.Post)('inspections/:id/parameters'),
    _ts_param(0, (0, _common.Param)('id')),
    _ts_param(1, (0, _common.Body)()),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        String,
        Object
    ]),
    _ts_metadata("design:returntype", Promise)
], QualityController.prototype, "addInspectionParameters", null);
_ts_decorate([
    (0, _common.Post)('inspections/:id/defects'),
    _ts_param(0, (0, _common.Param)('id')),
    _ts_param(1, (0, _common.Body)()),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        String,
        Object
    ]),
    _ts_metadata("design:returntype", Promise)
], QualityController.prototype, "addInspectionDefects", null);
_ts_decorate([
    (0, _common.Post)('ncr'),
    _ts_param(0, (0, _common.Request)()),
    _ts_param(1, (0, _common.Body)()),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        Object,
        Object
    ]),
    _ts_metadata("design:returntype", Promise)
], QualityController.prototype, "createNCR", null);
_ts_decorate([
    (0, _common.Get)('ncr'),
    _ts_param(0, (0, _common.Request)()),
    _ts_param(1, (0, _common.Query)()),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        Object,
        Object
    ]),
    _ts_metadata("design:returntype", Promise)
], QualityController.prototype, "getNCRs", null);
_ts_decorate([
    (0, _common.Get)('ncr/:id'),
    _ts_param(0, (0, _common.Request)()),
    _ts_param(1, (0, _common.Param)('id')),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        Object,
        String
    ]),
    _ts_metadata("design:returntype", Promise)
], QualityController.prototype, "getNCRById", null);
_ts_decorate([
    (0, _common.Put)('ncr/:id'),
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
], QualityController.prototype, "updateNCR", null);
_ts_decorate([
    (0, _common.Post)('ncr/:id/close'),
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
], QualityController.prototype, "closeNCR", null);
_ts_decorate([
    (0, _common.Get)('vendor-ratings'),
    _ts_param(0, (0, _common.Request)()),
    _ts_param(1, (0, _common.Query)('vendor_id')),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        Object,
        String
    ]),
    _ts_metadata("design:returntype", Promise)
], QualityController.prototype, "getVendorQualityRatings", null);
_ts_decorate([
    (0, _common.Post)('vendor-ratings/calculate'),
    _ts_param(0, (0, _common.Request)()),
    _ts_param(1, (0, _common.Body)()),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        Object,
        Object
    ]),
    _ts_metadata("design:returntype", Promise)
], QualityController.prototype, "calculateVendorQualityRating", null);
_ts_decorate([
    (0, _common.Get)('dashboard'),
    _ts_param(0, (0, _common.Request)()),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        Object
    ]),
    _ts_metadata("design:returntype", Promise)
], QualityController.prototype, "getQualityDashboard", null);
QualityController = _ts_decorate([
    (0, _common.Controller)('quality'),
    (0, _common.UseGuards)(_jwtauthguard.JwtAuthGuard),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        typeof _qualityservice.QualityService === "undefined" ? Object : _qualityservice.QualityService
    ])
], QualityController);

//# sourceMappingURL=quality.controller.js.map