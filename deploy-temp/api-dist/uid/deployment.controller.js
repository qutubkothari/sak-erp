"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "DeploymentController", {
    enumerable: true,
    get: function() {
        return DeploymentController;
    }
});
const _common = require("@nestjs/common");
const _deploymentservice = require("./deployment.service");
const _jwtauthguard = require("../auth/guards/jwt-auth.guard");
const _deploymentdto = require("./dto/deployment.dto");
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
let DeploymentController = class DeploymentController {
    async getStatus(req, uid, partNumber, organization, location, search, offset, limit, sortBy, sortOrder) {
        const parsedOffset = offset !== undefined ? Number(offset) : undefined;
        const parsedLimit = limit !== undefined ? Number(limit) : undefined;
        const wantsPagination = parsedOffset !== undefined || parsedLimit !== undefined || search !== undefined && search !== '' || sortBy !== undefined && sortBy !== '' || sortOrder !== undefined && sortOrder !== '';
        const result = await this.deploymentService.getDeploymentStatus(req.user.tenantId, {
            uid,
            part_number: partNumber,
            organization,
            location,
            search,
            offset: parsedOffset,
            limit: parsedLimit,
            sort_by: sortBy,
            sort_order: sortOrder
        });
        // Backward compatible: existing callers expect an array.
        return wantsPagination ? result : result.data;
    }
    async create(req, dto) {
        return this.deploymentService.createDeployment(req.user.tenantId, req.user.userId, dto);
    }
    async findAll(req, uidId, organization, deploymentLevel, isCurrent) {
        return this.deploymentService.getDeployments(req.user.tenantId, {
            uid_id: uidId,
            organization,
            deployment_level: deploymentLevel,
            is_current: isCurrent === 'true' ? true : isCurrent === 'false' ? false : undefined
        });
    }
    async getHistory(req, uidId) {
        return this.deploymentService.getDeployments(req.user.tenantId, {
            uid_id: uidId
        });
    }
    async findOne(req, id) {
        return this.deploymentService.getDeploymentById(req.user.tenantId, id);
    }
    async getChain(req, uidId) {
        return this.deploymentService.getDeploymentChain(req.user.tenantId, uidId);
    }
    async getCurrentLocation(req, uidId) {
        return this.deploymentService.getCurrentLocation(req.user.tenantId, uidId);
    }
    async update(req, id, dto) {
        return this.deploymentService.updateDeployment(req.user.tenantId, id, dto);
    }
    async setCurrentLocation(req, uidId, deploymentId) {
        return this.deploymentService.setCurrentLocation(req.user.tenantId, uidId, deploymentId);
    }
    async delete(req, id) {
        return this.deploymentService.deleteDeployment(req.user.tenantId, id);
    }
    constructor(deploymentService){
        this.deploymentService = deploymentService;
    }
};
_ts_decorate([
    (0, _common.Get)('status'),
    _ts_param(0, (0, _common.Request)()),
    _ts_param(1, (0, _common.Query)('uid')),
    _ts_param(2, (0, _common.Query)('part_number')),
    _ts_param(3, (0, _common.Query)('organization')),
    _ts_param(4, (0, _common.Query)('location')),
    _ts_param(5, (0, _common.Query)('search')),
    _ts_param(6, (0, _common.Query)('offset')),
    _ts_param(7, (0, _common.Query)('limit')),
    _ts_param(8, (0, _common.Query)('sort_by')),
    _ts_param(9, (0, _common.Query)('sort_order')),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        Object,
        String,
        String,
        String,
        String,
        String,
        String,
        String,
        String,
        String
    ]),
    _ts_metadata("design:returntype", Promise)
], DeploymentController.prototype, "getStatus", null);
_ts_decorate([
    (0, _common.Post)(),
    _ts_param(0, (0, _common.Request)()),
    _ts_param(1, (0, _common.Body)()),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        Object,
        typeof _deploymentdto.CreateDeploymentDto === "undefined" ? Object : _deploymentdto.CreateDeploymentDto
    ]),
    _ts_metadata("design:returntype", Promise)
], DeploymentController.prototype, "create", null);
_ts_decorate([
    (0, _common.Get)(),
    _ts_param(0, (0, _common.Request)()),
    _ts_param(1, (0, _common.Query)('uid_id')),
    _ts_param(2, (0, _common.Query)('organization')),
    _ts_param(3, (0, _common.Query)('deployment_level')),
    _ts_param(4, (0, _common.Query)('is_current')),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        Object,
        String,
        String,
        String,
        String
    ]),
    _ts_metadata("design:returntype", Promise)
], DeploymentController.prototype, "findAll", null);
_ts_decorate([
    (0, _common.Get)(':uidId/history'),
    _ts_param(0, (0, _common.Request)()),
    _ts_param(1, (0, _common.Param)('uidId')),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        Object,
        String
    ]),
    _ts_metadata("design:returntype", Promise)
], DeploymentController.prototype, "getHistory", null);
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
], DeploymentController.prototype, "findOne", null);
_ts_decorate([
    (0, _common.Get)('uid/:uidId/chain'),
    _ts_param(0, (0, _common.Request)()),
    _ts_param(1, (0, _common.Param)('uidId')),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        Object,
        String
    ]),
    _ts_metadata("design:returntype", Promise)
], DeploymentController.prototype, "getChain", null);
_ts_decorate([
    (0, _common.Get)('uid/:uidId/current'),
    _ts_param(0, (0, _common.Request)()),
    _ts_param(1, (0, _common.Param)('uidId')),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        Object,
        String
    ]),
    _ts_metadata("design:returntype", Promise)
], DeploymentController.prototype, "getCurrentLocation", null);
_ts_decorate([
    (0, _common.Put)(':id'),
    _ts_param(0, (0, _common.Request)()),
    _ts_param(1, (0, _common.Param)('id')),
    _ts_param(2, (0, _common.Body)()),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        Object,
        String,
        typeof _deploymentdto.UpdateDeploymentDto === "undefined" ? Object : _deploymentdto.UpdateDeploymentDto
    ]),
    _ts_metadata("design:returntype", Promise)
], DeploymentController.prototype, "update", null);
_ts_decorate([
    (0, _common.Post)('uid/:uidId/set-current/:deploymentId'),
    _ts_param(0, (0, _common.Request)()),
    _ts_param(1, (0, _common.Param)('uidId')),
    _ts_param(2, (0, _common.Param)('deploymentId')),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        Object,
        String,
        String
    ]),
    _ts_metadata("design:returntype", Promise)
], DeploymentController.prototype, "setCurrentLocation", null);
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
], DeploymentController.prototype, "delete", null);
DeploymentController = _ts_decorate([
    (0, _common.Controller)('uid/deployment'),
    (0, _common.UseGuards)(_jwtauthguard.JwtAuthGuard),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        typeof _deploymentservice.DeploymentService === "undefined" ? Object : _deploymentservice.DeploymentService
    ])
], DeploymentController);

//# sourceMappingURL=deployment.controller.js.map