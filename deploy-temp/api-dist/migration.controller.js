"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "MigrationController", {
    enumerable: true,
    get: function() {
        return MigrationController;
    }
});
const _common = require("@nestjs/common");
const _migrationservice = require("./migration.service");
function _ts_decorate(decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for(var i = decorators.length - 1; i >= 0; i--)if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
}
function _ts_metadata(k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
}
let MigrationController = class MigrationController {
    async createHRTables() {
        return this.migrationService.createHRTables();
    }
    async getStatus() {
        return {
            status: 'Migration service ready',
            timestamp: new Date().toISOString()
        };
    }
    constructor(migrationService){
        this.migrationService = migrationService;
    }
};
_ts_decorate([
    (0, _common.Post)('hr-tables'),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", []),
    _ts_metadata("design:returntype", Promise)
], MigrationController.prototype, "createHRTables", null);
_ts_decorate([
    (0, _common.Get)('status'),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", []),
    _ts_metadata("design:returntype", Promise)
], MigrationController.prototype, "getStatus", null);
MigrationController = _ts_decorate([
    (0, _common.Controller)('migrate'),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        typeof _migrationservice.MigrationService === "undefined" ? Object : _migrationservice.MigrationService
    ])
], MigrationController);

//# sourceMappingURL=migration.controller.js.map