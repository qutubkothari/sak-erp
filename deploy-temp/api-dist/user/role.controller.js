"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "RoleController", {
    enumerable: true,
    get: function() {
        return RoleController;
    }
});
const _common = require("@nestjs/common");
const _swagger = require("@nestjs/swagger");
const _roleservice = require("./role.service");
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
let RoleController = class RoleController {
    async findAll(req) {
        return this.roleService.findAll(req.user.tenantId);
    }
    async findOne(id, req) {
        return this.roleService.findOne(id, req.user.tenantId);
    }
    async create(dto, req) {
        return this.roleService.create({
            ...dto,
            tenantId: req.user.tenantId
        });
    }
    async update(id, dto, req) {
        return this.roleService.update(id, dto, req.user.tenantId);
    }
    async delete(id, req) {
        return this.roleService.delete(id, req.user.tenantId);
    }
    constructor(roleService){
        this.roleService = roleService;
    }
};
_ts_decorate([
    (0, _common.Get)(),
    (0, _swagger.ApiOperation)({
        summary: 'Get all roles in tenant'
    }),
    (0, _swagger.ApiResponse)({
        status: 200,
        description: 'List of roles'
    }),
    _ts_param(0, (0, _common.Request)()),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        Object
    ]),
    _ts_metadata("design:returntype", Promise)
], RoleController.prototype, "findAll", null);
_ts_decorate([
    (0, _common.Get)(':id'),
    (0, _swagger.ApiOperation)({
        summary: 'Get role by ID'
    }),
    (0, _swagger.ApiResponse)({
        status: 200,
        description: 'Role found'
    }),
    (0, _swagger.ApiResponse)({
        status: 404,
        description: 'Role not found'
    }),
    _ts_param(0, (0, _common.Param)('id')),
    _ts_param(1, (0, _common.Request)()),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        String,
        Object
    ]),
    _ts_metadata("design:returntype", Promise)
], RoleController.prototype, "findOne", null);
_ts_decorate([
    (0, _common.Post)(),
    (0, _swagger.ApiOperation)({
        summary: 'Create new role'
    }),
    (0, _swagger.ApiResponse)({
        status: 201,
        description: 'Role created successfully'
    }),
    _ts_param(0, (0, _common.Body)()),
    _ts_param(1, (0, _common.Request)()),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        Object,
        Object
    ]),
    _ts_metadata("design:returntype", Promise)
], RoleController.prototype, "create", null);
_ts_decorate([
    (0, _common.Put)(':id'),
    (0, _swagger.ApiOperation)({
        summary: 'Update role'
    }),
    (0, _swagger.ApiResponse)({
        status: 200,
        description: 'Role updated successfully'
    }),
    (0, _swagger.ApiResponse)({
        status: 404,
        description: 'Role not found'
    }),
    _ts_param(0, (0, _common.Param)('id')),
    _ts_param(1, (0, _common.Body)()),
    _ts_param(2, (0, _common.Request)()),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        String,
        Object,
        Object
    ]),
    _ts_metadata("design:returntype", Promise)
], RoleController.prototype, "update", null);
_ts_decorate([
    (0, _common.Delete)(':id'),
    (0, _swagger.ApiOperation)({
        summary: 'Delete role'
    }),
    (0, _swagger.ApiResponse)({
        status: 200,
        description: 'Role deleted successfully'
    }),
    (0, _swagger.ApiResponse)({
        status: 404,
        description: 'Role not found'
    }),
    _ts_param(0, (0, _common.Param)('id')),
    _ts_param(1, (0, _common.Request)()),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        String,
        Object
    ]),
    _ts_metadata("design:returntype", Promise)
], RoleController.prototype, "delete", null);
RoleController = _ts_decorate([
    (0, _swagger.ApiTags)('Roles'),
    (0, _common.Controller)('roles'),
    (0, _common.UseGuards)(_jwtauthguard.JwtAuthGuard),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        typeof _roleservice.RoleService === "undefined" ? Object : _roleservice.RoleService
    ])
], RoleController);

//# sourceMappingURL=role.controller.js.map