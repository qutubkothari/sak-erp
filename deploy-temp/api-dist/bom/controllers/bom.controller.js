"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "BomController", {
    enumerable: true,
    get: function() {
        return BomController;
    }
});
const _common = require("@nestjs/common");
const _bomservice = require("../services/bom.service");
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
let BomController = class BomController {
    async create(req, body) {
        return this.bomService.create(req.user.tenantId, body);
    }
    async findAll(req, query) {
        console.log('[BomController] findAll called:', {
            tenantId: req.user.tenantId,
            query
        });
        try {
            const result = await this.bomService.findAll(req.user.tenantId, query);
            console.log('[BomController] findAll success:', {
                count: result?.length
            });
            return result;
        } catch (error) {
            console.error('[BomController] findAll error:', error);
            throw error;
        }
    }
    async getBomItems(req, id) {
        console.log('[BomController] getBomItems called:', {
            tenantId: req.user.tenantId,
            bomId: id
        });
        return this.bomService.getBomItems(req.user.tenantId, id);
    }
    async findOne(req, id) {
        return this.bomService.findOne(req.user.tenantId, id);
    }
    async update(req, id, body) {
        return this.bomService.update(req.user.tenantId, id, body);
    }
    async generatePR(req, id, body) {
        return this.bomService.generatePurchaseRequisition(req.user.tenantId, req.user.userId, id, body.quantity);
    }
    async delete(req, id) {
        return this.bomService.delete(req.user.tenantId, id);
    }
    constructor(bomService){
        this.bomService = bomService;
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
], BomController.prototype, "create", null);
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
], BomController.prototype, "findAll", null);
_ts_decorate([
    (0, _common.Get)(':id/items'),
    _ts_param(0, (0, _common.Request)()),
    _ts_param(1, (0, _common.Param)('id')),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        Object,
        String
    ]),
    _ts_metadata("design:returntype", Promise)
], BomController.prototype, "getBomItems", null);
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
], BomController.prototype, "findOne", null);
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
], BomController.prototype, "update", null);
_ts_decorate([
    (0, _common.Post)(':id/generate-pr'),
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
], BomController.prototype, "generatePR", null);
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
], BomController.prototype, "delete", null);
BomController = _ts_decorate([
    (0, _common.Controller)('bom'),
    (0, _common.UseGuards)(_jwtauthguard.JwtAuthGuard),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        typeof _bomservice.BomService === "undefined" ? Object : _bomservice.BomService
    ])
], BomController);

//# sourceMappingURL=bom.controller.js.map