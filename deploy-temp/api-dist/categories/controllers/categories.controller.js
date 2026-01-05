"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "CategoriesController", {
    enumerable: true,
    get: function() {
        return CategoriesController;
    }
});
const _common = require("@nestjs/common");
const _jwtauthguard = require("../../auth/guards/jwt-auth.guard");
const _categoriesservice = require("../services/categories.service");
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
let CategoriesController = class CategoriesController {
    async getCategories(req) {
        return this.categoriesService.findAll(req.user.tenantId);
    }
    async createCategory(req, body) {
        return this.categoriesService.create(req.user.tenantId, body.name);
    }
    async seedCategories(req) {
        return this.categoriesService.seed(req.user.tenantId);
    }
    async updateCategory(req, id, body) {
        return this.categoriesService.update(req.user.tenantId, id, body.name);
    }
    async deleteCategory(req, id) {
        return this.categoriesService.delete(req.user.tenantId, id);
    }
    constructor(categoriesService){
        this.categoriesService = categoriesService;
    }
};
_ts_decorate([
    (0, _common.Get)(),
    _ts_param(0, (0, _common.Request)()),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        Object
    ]),
    _ts_metadata("design:returntype", Promise)
], CategoriesController.prototype, "getCategories", null);
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
], CategoriesController.prototype, "createCategory", null);
_ts_decorate([
    (0, _common.Post)('seed'),
    _ts_param(0, (0, _common.Request)()),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        Object
    ]),
    _ts_metadata("design:returntype", Promise)
], CategoriesController.prototype, "seedCategories", null);
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
], CategoriesController.prototype, "updateCategory", null);
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
], CategoriesController.prototype, "deleteCategory", null);
CategoriesController = _ts_decorate([
    (0, _common.Controller)('categories'),
    (0, _common.UseGuards)(_jwtauthguard.JwtAuthGuard),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        typeof _categoriesservice.CategoriesService === "undefined" ? Object : _categoriesservice.CategoriesService
    ])
], CategoriesController);

//# sourceMappingURL=categories.controller.js.map