"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "TenantController", {
    enumerable: true,
    get: function() {
        return TenantController;
    }
});
const _common = require("@nestjs/common");
const _swagger = require("@nestjs/swagger");
const _tenantservice = require("./tenant.service");
const _jwtauthguard = require("../auth/guards/jwt-auth.guard");
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
let TenantController = class TenantController {
    async getCurrentTenant(req) {
        return this.tenantService.findOne(req.user.tenantId);
    }
    async updateCurrentTenant(dto, req) {
        return this.tenantService.update(req.user.tenantId, dto);
    }
    constructor(tenantService){
        this.tenantService = tenantService;
    }
};
_ts_decorate([
    (0, _common.Get)('current'),
    (0, _swagger.ApiOperation)({
        summary: 'Get current tenant/company information'
    }),
    (0, _swagger.ApiResponse)({
        status: 200,
        description: 'Tenant information'
    }),
    _ts_param(0, (0, _common.Request)()),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        Object
    ]),
    _ts_metadata("design:returntype", Promise)
], TenantController.prototype, "getCurrentTenant", null);
_ts_decorate([
    (0, _common.Put)('current'),
    (0, _swagger.ApiOperation)({
        summary: 'Update current tenant/company information'
    }),
    (0, _swagger.ApiResponse)({
        status: 200,
        description: 'Tenant updated successfully'
    }),
    _ts_param(0, (0, _common.Body)()),
    _ts_param(1, (0, _common.Request)()),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        Object,
        Object
    ]),
    _ts_metadata("design:returntype", Promise)
], TenantController.prototype, "updateCurrentTenant", null);
TenantController = _ts_decorate([
    (0, _swagger.ApiTags)('Tenant'),
    (0, _common.Controller)('tenant'),
    (0, _common.UseGuards)(_jwtauthguard.JwtAuthGuard),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        typeof _tenantservice.TenantService === "undefined" ? Object : _tenantservice.TenantService
    ])
], TenantController);

//# sourceMappingURL=tenant.controller.js.map