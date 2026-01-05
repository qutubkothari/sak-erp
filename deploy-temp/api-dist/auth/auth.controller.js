"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "AuthController", {
    enumerable: true,
    get: function() {
        return AuthController;
    }
});
const _common = require("@nestjs/common");
const _swagger = require("@nestjs/swagger");
const _authservice = require("./auth.service");
const _publicdecorator = require("./decorators/public.decorator");
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
let AuthController = class AuthController {
    async register(dto) {
        return this.authService.register(dto);
    }
    async login(dto) {
        return this.authService.login(dto);
    }
    async refresh(refreshToken) {
        return this.authService.refreshToken(refreshToken);
    }
    async logout(req) {
        return this.authService.logout(req.user?.id);
    }
    async changePassword(req, oldPassword, newPassword) {
        return this.authService.changePassword(req.user.id, oldPassword, newPassword);
    }
    async resetPasswordRequest(email, tenantId) {
        return this.authService.resetPasswordRequest(email, tenantId);
    }
    async resetPassword(token, newPassword) {
        return this.authService.resetPassword(token, newPassword);
    }
    constructor(authService){
        this.authService = authService;
    }
};
_ts_decorate([
    (0, _publicdecorator.Public)(),
    (0, _common.Post)('register'),
    (0, _swagger.ApiOperation)({
        summary: 'Register a new user'
    }),
    (0, _swagger.ApiResponse)({
        status: 201,
        description: 'User successfully registered'
    }),
    (0, _swagger.ApiResponse)({
        status: 409,
        description: 'User already exists'
    }),
    _ts_param(0, (0, _common.Body)()),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        Object
    ]),
    _ts_metadata("design:returntype", Promise)
], AuthController.prototype, "register", null);
_ts_decorate([
    (0, _publicdecorator.Public)(),
    (0, _common.Post)('login'),
    (0, _common.HttpCode)(_common.HttpStatus.OK),
    (0, _swagger.ApiOperation)({
        summary: 'User login'
    }),
    (0, _swagger.ApiResponse)({
        status: 200,
        description: 'Successfully logged in'
    }),
    (0, _swagger.ApiResponse)({
        status: 401,
        description: 'Invalid credentials'
    }),
    _ts_param(0, (0, _common.Body)()),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        Object
    ]),
    _ts_metadata("design:returntype", Promise)
], AuthController.prototype, "login", null);
_ts_decorate([
    (0, _publicdecorator.Public)(),
    (0, _common.Post)('refresh'),
    (0, _common.HttpCode)(_common.HttpStatus.OK),
    (0, _swagger.ApiOperation)({
        summary: 'Refresh access token'
    }),
    (0, _swagger.ApiResponse)({
        status: 200,
        description: 'Token refreshed successfully'
    }),
    (0, _swagger.ApiResponse)({
        status: 401,
        description: 'Invalid refresh token'
    }),
    _ts_param(0, (0, _common.Body)('refreshToken')),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        String
    ]),
    _ts_metadata("design:returntype", Promise)
], AuthController.prototype, "refresh", null);
_ts_decorate([
    (0, _common.Post)('logout'),
    (0, _common.HttpCode)(_common.HttpStatus.OK),
    (0, _swagger.ApiOperation)({
        summary: 'User logout'
    }),
    _ts_param(0, (0, _common.Request)()),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        Object
    ]),
    _ts_metadata("design:returntype", Promise)
], AuthController.prototype, "logout", null);
_ts_decorate([
    (0, _common.Post)('change-password'),
    (0, _swagger.ApiOperation)({
        summary: 'Change user password'
    }),
    (0, _swagger.ApiResponse)({
        status: 200,
        description: 'Password changed successfully'
    }),
    (0, _swagger.ApiResponse)({
        status: 401,
        description: 'Current password is incorrect'
    }),
    _ts_param(0, (0, _common.Request)()),
    _ts_param(1, (0, _common.Body)('oldPassword')),
    _ts_param(2, (0, _common.Body)('newPassword')),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        Object,
        String,
        String
    ]),
    _ts_metadata("design:returntype", Promise)
], AuthController.prototype, "changePassword", null);
_ts_decorate([
    (0, _publicdecorator.Public)(),
    (0, _common.Post)('reset-password-request'),
    (0, _common.HttpCode)(_common.HttpStatus.OK),
    (0, _swagger.ApiOperation)({
        summary: 'Request password reset'
    }),
    _ts_param(0, (0, _common.Body)('email')),
    _ts_param(1, (0, _common.Body)('tenantId')),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        String,
        String
    ]),
    _ts_metadata("design:returntype", Promise)
], AuthController.prototype, "resetPasswordRequest", null);
_ts_decorate([
    (0, _publicdecorator.Public)(),
    (0, _common.Post)('reset-password'),
    (0, _common.HttpCode)(_common.HttpStatus.OK),
    (0, _swagger.ApiOperation)({
        summary: 'Reset password with token'
    }),
    _ts_param(0, (0, _common.Body)('token')),
    _ts_param(1, (0, _common.Body)('newPassword')),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        String,
        String
    ]),
    _ts_metadata("design:returntype", Promise)
], AuthController.prototype, "resetPassword", null);
AuthController = _ts_decorate([
    (0, _swagger.ApiTags)('Authentication'),
    (0, _common.Controller)('auth'),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        typeof _authservice.AuthService === "undefined" ? Object : _authservice.AuthService
    ])
], AuthController);

//# sourceMappingURL=auth.controller.js.map