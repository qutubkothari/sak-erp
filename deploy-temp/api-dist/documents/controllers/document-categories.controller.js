"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "DocumentCategoriesController", {
    enumerable: true,
    get: function() {
        return DocumentCategoriesController;
    }
});
const _common = require("@nestjs/common");
const _documentcategoriesservice = require("../services/document-categories.service");
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
let DocumentCategoriesController = class DocumentCategoriesController {
    create(req, createDto) {
        return this.categoriesService.create(req, createDto);
    }
    findAll(req) {
        return this.categoriesService.findAll(req);
    }
    findOne(req, id) {
        return this.categoriesService.findOne(req, id);
    }
    update(req, id, updateDto) {
        return this.categoriesService.update(req, id, updateDto);
    }
    delete(req, id) {
        return this.categoriesService.delete(req, id);
    }
    constructor(categoriesService){
        this.categoriesService = categoriesService;
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
    _ts_metadata("design:returntype", void 0)
], DocumentCategoriesController.prototype, "create", null);
_ts_decorate([
    (0, _common.Get)(),
    _ts_param(0, (0, _common.Request)()),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        Object
    ]),
    _ts_metadata("design:returntype", void 0)
], DocumentCategoriesController.prototype, "findAll", null);
_ts_decorate([
    (0, _common.Get)(':id'),
    _ts_param(0, (0, _common.Request)()),
    _ts_param(1, (0, _common.Param)('id')),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        Object,
        String
    ]),
    _ts_metadata("design:returntype", void 0)
], DocumentCategoriesController.prototype, "findOne", null);
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
    _ts_metadata("design:returntype", void 0)
], DocumentCategoriesController.prototype, "update", null);
_ts_decorate([
    (0, _common.Delete)(':id'),
    _ts_param(0, (0, _common.Request)()),
    _ts_param(1, (0, _common.Param)('id')),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        Object,
        String
    ]),
    _ts_metadata("design:returntype", void 0)
], DocumentCategoriesController.prototype, "delete", null);
DocumentCategoriesController = _ts_decorate([
    (0, _common.Controller)('document-categories'),
    (0, _common.UseGuards)(_jwtauthguard.JwtAuthGuard),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        typeof _documentcategoriesservice.DocumentCategoriesService === "undefined" ? Object : _documentcategoriesservice.DocumentCategoriesService
    ])
], DocumentCategoriesController);

//# sourceMappingURL=document-categories.controller.js.map