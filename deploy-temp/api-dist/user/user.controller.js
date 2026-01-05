"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "UserController", {
    enumerable: true,
    get: function() {
        return UserController;
    }
});
const _common = require("@nestjs/common");
const _swagger = require("@nestjs/swagger");
const _userservice = require("./user.service");
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
let UserController = class UserController {
    async findAll(req) {
        return this.userService.findAll(req.user.tenantId);
    }
    async findOne(id, req) {
        return this.userService.findOne(id, req.user.tenantId);
    }
    async create(dto, req) {
        return this.userService.create({
            ...dto,
            tenantId: req.user.tenantId
        });
    }
    async update(id, dto, req) {
        return this.userService.update(id, dto, req.user.tenantId);
    }
    async delete(id, req) {
        return this.userService.delete(id, req.user.tenantId);
    }
    constructor(userService){
        this.userService = userService;
    }
};
_ts_decorate([
    (0, _common.Get)(),
    (0, _swagger.ApiOperation)({
        summary: 'Get all users in tenant'
    }),
    (0, _swagger.ApiResponse)({
        status: 200,
        description: 'List of users'
    }),
    _ts_param(0, (0, _common.Request)()),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        Object
    ]),
    _ts_metadata("design:returntype", Promise)
], UserController.prototype, "findAll", null);
_ts_decorate([
    (0, _common.Get)(':id'),
    (0, _swagger.ApiOperation)({
        summary: 'Get user by ID'
    }),
    (0, _swagger.ApiResponse)({
        status: 200,
        description: 'User found'
    }),
    (0, _swagger.ApiResponse)({
        status: 404,
        description: 'User not found'
    }),
    _ts_param(0, (0, _common.Param)('id')),
    _ts_param(1, (0, _common.Request)()),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        String,
        Object
    ]),
    _ts_metadata("design:returntype", Promise)
], UserController.prototype, "findOne", null);
_ts_decorate([
    (0, _common.Post)(),
    (0, _swagger.ApiOperation)({
        summary: 'Create new user'
    }),
    (0, _swagger.ApiResponse)({
        status: 201,
        description: 'User created successfully'
    }),
    (0, _swagger.ApiResponse)({
        status: 409,
        description: 'User already exists'
    }),
    _ts_param(0, (0, _common.Body)()),
    _ts_param(1, (0, _common.Request)()),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        Object,
        Object
    ]),
    _ts_metadata("design:returntype", Promise)
], UserController.prototype, "create", null);
_ts_decorate([
    (0, _common.Put)(':id'),
    (0, _swagger.ApiOperation)({
        summary: 'Update user'
    }),
    (0, _swagger.ApiResponse)({
        status: 200,
        description: 'User updated successfully'
    }),
    (0, _swagger.ApiResponse)({
        status: 404,
        description: 'User not found'
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
], UserController.prototype, "update", null);
_ts_decorate([
    (0, _common.Delete)(':id'),
    (0, _swagger.ApiOperation)({
        summary: 'Delete user'
    }),
    (0, _swagger.ApiResponse)({
        status: 200,
        description: 'User deleted successfully'
    }),
    (0, _swagger.ApiResponse)({
        status: 404,
        description: 'User not found'
    }),
    _ts_param(0, (0, _common.Param)('id')),
    _ts_param(1, (0, _common.Request)()),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        String,
        Object
    ]),
    _ts_metadata("design:returntype", Promise)
], UserController.prototype, "delete", null);
UserController = _ts_decorate([
    (0, _swagger.ApiTags)('Users'),
    (0, _common.Controller)('users'),
    (0, _common.UseGuards)(_jwtauthguard.JwtAuthGuard),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        typeof _userservice.UserService === "undefined" ? Object : _userservice.UserService
    ])
], UserController);

//# sourceMappingURL=user.controller.js.map