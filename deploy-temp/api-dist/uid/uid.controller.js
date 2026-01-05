"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "UidController", {
    enumerable: true,
    get: function() {
        return UidController;
    }
});
const _common = require("@nestjs/common");
const _swagger = require("@nestjs/swagger");
const _uidservice = require("./uid.service");
const _uidsupabaseservice = require("./services/uid-supabase.service");
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
let UidController = class UidController {
    async getUidTrace(uid, req) {
        return this.uidSupabaseService.getCompleteTrace(req, uid);
    }
    async getAllUids(req, status, entityType, itemId, qualityStatus, jobOrderId, search, limit, offset, sortBy, sortOrder) {
        const parsedLimit = limit ? parseInt(limit) : undefined;
        const parsedOffset = offset ? parseInt(offset) : undefined;
        return this.uidSupabaseService.getAllUIDs(req, status, entityType, itemId, qualityStatus, search, parsedLimit, parsedOffset, sortBy, sortOrder, jobOrderId);
    }
    async getUidDetails(uid) {
        return this.uidService.getUidDetails(uid);
    }
    async getUidHistory(uid) {
        return this.uidService.getUidHistory(uid);
    }
    async validateUid(uid) {
        const isValid = this.uidService.validateUid(uid);
        return {
            uid,
            isValid,
            message: isValid ? 'UID is valid' : 'Invalid UID format or checksum'
        };
    }
    async updatePartNumber(uid, dto, req) {
        await this.uidSupabaseService.updatePartNumber(req, uid, dto.client_part_number);
        return {
            message: 'Part number updated successfully',
            uid,
            client_part_number: dto.client_part_number
        };
    }
    async searchByPartNumber(partNumber) {
        return this.uidService.searchByPartNumber(partNumber);
    }
    constructor(uidService, uidSupabaseService){
        this.uidService = uidService;
        this.uidSupabaseService = uidSupabaseService;
    }
};
_ts_decorate([
    (0, _common.Get)('trace/:uid'),
    (0, _swagger.ApiOperation)({
        summary: 'Get complete UID traceability report (full details)'
    }),
    _ts_param(0, (0, _common.Param)('uid')),
    _ts_param(1, (0, _common.Request)()),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        String,
        Object
    ]),
    _ts_metadata("design:returntype", Promise)
], UidController.prototype, "getUidTrace", null);
_ts_decorate([
    (0, _common.Get)(),
    (0, _swagger.ApiOperation)({
        summary: 'Get all UIDs (filterable for inspections)'
    }),
    _ts_param(0, (0, _common.Request)()),
    _ts_param(1, (0, _common.Query)('status')),
    _ts_param(2, (0, _common.Query)('entityType')),
    _ts_param(3, (0, _common.Query)('item_id')),
    _ts_param(4, (0, _common.Query)('quality_status')),
    _ts_param(5, (0, _common.Query)('job_order_id')),
    _ts_param(6, (0, _common.Query)('search')),
    _ts_param(7, (0, _common.Query)('limit')),
    _ts_param(8, (0, _common.Query)('offset')),
    _ts_param(9, (0, _common.Query)('sortBy')),
    _ts_param(10, (0, _common.Query)('sortOrder')),
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
        String,
        String
    ]),
    _ts_metadata("design:returntype", Promise)
], UidController.prototype, "getAllUids", null);
_ts_decorate([
    (0, _common.Get)(':uid'),
    (0, _swagger.ApiOperation)({
        summary: 'Get complete UID details with vendor and item information'
    }),
    _ts_param(0, (0, _common.Param)('uid')),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        String
    ]),
    _ts_metadata("design:returntype", Promise)
], UidController.prototype, "getUidDetails", null);
_ts_decorate([
    (0, _common.Get)(':uid/history'),
    (0, _swagger.ApiOperation)({
        summary: 'Get UID traceability history'
    }),
    _ts_param(0, (0, _common.Param)('uid')),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        String
    ]),
    _ts_metadata("design:returntype", Promise)
], UidController.prototype, "getUidHistory", null);
_ts_decorate([
    (0, _common.Get)(':uid/validate'),
    (0, _swagger.ApiOperation)({
        summary: 'Validate UID format and checksum'
    }),
    _ts_param(0, (0, _common.Param)('uid')),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        String
    ]),
    _ts_metadata("design:returntype", Promise)
], UidController.prototype, "validateUid", null);
_ts_decorate([
    (0, _common.Put)(':uid/part-number'),
    (0, _swagger.ApiOperation)({
        summary: 'Update client part number for UID'
    }),
    _ts_param(0, (0, _common.Param)('uid')),
    _ts_param(1, (0, _common.Body)()),
    _ts_param(2, (0, _common.Request)()),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        String,
        typeof _deploymentdto.UpdatePartNumberDto === "undefined" ? Object : _deploymentdto.UpdatePartNumberDto,
        Object
    ]),
    _ts_metadata("design:returntype", Promise)
], UidController.prototype, "updatePartNumber", null);
_ts_decorate([
    (0, _common.Get)('search/part-number'),
    (0, _swagger.ApiOperation)({
        summary: 'Search UIDs by client part number'
    }),
    _ts_param(0, (0, _common.Query)('q')),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        String
    ]),
    _ts_metadata("design:returntype", Promise)
], UidController.prototype, "searchByPartNumber", null);
UidController = _ts_decorate([
    (0, _swagger.ApiTags)('UID Tracking'),
    (0, _common.Controller)('uid'),
    (0, _common.UseGuards)(_jwtauthguard.JwtAuthGuard),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        typeof _uidservice.UidService === "undefined" ? Object : _uidservice.UidService,
        typeof _uidsupabaseservice.UidSupabaseService === "undefined" ? Object : _uidsupabaseservice.UidSupabaseService
    ])
], UidController);

//# sourceMappingURL=uid.controller.js.map