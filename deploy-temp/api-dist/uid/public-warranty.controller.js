"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "PublicWarrantyController", {
    enumerable: true,
    get: function() {
        return PublicWarrantyController;
    }
});
const _common = require("@nestjs/common");
const _deploymentservice = require("./deployment.service");
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
let PublicWarrantyController = class PublicWarrantyController {
    async search(search) {
        return this.deploymentService.searchByPartNumberOrUid(search);
    }
    async getByToken(token) {
        return this.deploymentService.getByPublicToken(token);
    }
    async updateLocation(token, dto) {
        return this.deploymentService.updateViaPublicToken(token, dto);
    }
    constructor(deploymentService){
        this.deploymentService = deploymentService;
    }
};
_ts_decorate([
    (0, _common.Get)('search'),
    _ts_param(0, (0, _common.Query)('q')),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        String
    ]),
    _ts_metadata("design:returntype", Promise)
], PublicWarrantyController.prototype, "search", null);
_ts_decorate([
    (0, _common.Get)('token/:token'),
    _ts_param(0, (0, _common.Param)('token')),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        String
    ]),
    _ts_metadata("design:returntype", Promise)
], PublicWarrantyController.prototype, "getByToken", null);
_ts_decorate([
    (0, _common.Post)('token/:token/update'),
    _ts_param(0, (0, _common.Param)('token')),
    _ts_param(1, (0, _common.Body)()),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        String,
        typeof _deploymentdto.PublicDeploymentUpdateDto === "undefined" ? Object : _deploymentdto.PublicDeploymentUpdateDto
    ]),
    _ts_metadata("design:returntype", Promise)
], PublicWarrantyController.prototype, "updateLocation", null);
PublicWarrantyController = _ts_decorate([
    (0, _common.Controller)('public/warranty'),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        typeof _deploymentservice.DeploymentService === "undefined" ? Object : _deploymentservice.DeploymentService
    ])
], PublicWarrantyController);

//# sourceMappingURL=public-warranty.controller.js.map