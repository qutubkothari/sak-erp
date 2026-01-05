"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "UidSupabaseController", {
    enumerable: true,
    get: function() {
        return UidSupabaseController;
    }
});
const _common = require("@nestjs/common");
const _uidsupabaseservice = require("../services/uid-supabase.service");
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
let UidSupabaseController = class UidSupabaseController {
    create(req, createDto) {
        return this.uidService.createUID(req, createDto);
    }
    async findAll(req, filters) {
        try {
            console.log('[UidController] findAll called with filters:', filters);
            // Support both itemId and item_id (snake_case from frontend)
            const itemId = filters.itemId || filters.item_id;
            const entityType = filters.entityType || filters.entity_type;
            const qualityStatus = filters.qualityStatus || filters.quality_status;
            const jobOrderId = filters.jobOrderId || filters.job_order_id;
            const search = typeof filters.search === 'string' ? filters.search : undefined;
            const parsedLimit = filters.limit !== undefined ? parseInt(filters.limit, 10) : undefined;
            const parsedOffset = filters.offset !== undefined ? parseInt(filters.offset, 10) : undefined;
            const sortBy = typeof filters.sortBy === 'string' ? filters.sortBy : undefined;
            const sortOrder = filters.sortOrder === 'asc' || filters.sortOrder === 'desc' ? filters.sortOrder : undefined;
            console.log('[UidController] Resolved params:', {
                itemId,
                status: filters.status,
                qualityStatus,
                entityType
            });
            // If requesting with item_id and status (dispatch scenario), use getAllUIDs
            if (itemId && filters.status) {
                console.log('[UidController] Using getAllUIDs for dispatch scenario');
                return await this.uidService.getAllUIDs(req, filters.status, entityType, itemId, qualityStatus, search, parsedLimit, parsedOffset, sortBy, sortOrder, jobOrderId);
            }
            // If requesting for quality inspection (simple list), use getAllUIDs
            if (filters.forInspection === 'true') {
                console.log('[UidController] Using getAllUIDs for inspection');
                return await this.uidService.getAllUIDs(req, filters.status, entityType, itemId, qualityStatus, search, parsedLimit, parsedOffset, sortBy, sortOrder, jobOrderId);
            }
            // If the caller is explicitly using pagination/search/sort, route to getAllUIDs
            // so we don't fall back to the legacy full findAll which may cap results.
            const wantsPagedResponse = search !== undefined || parsedLimit !== undefined || parsedOffset !== undefined || sortBy !== undefined || sortOrder !== undefined;
            if (wantsPagedResponse) {
                console.log('[UidController] Using getAllUIDs for paginated/list view');
                return await this.uidService.getAllUIDs(req, filters.status, entityType, itemId, qualityStatus, search, parsedLimit, parsedOffset, sortBy, sortOrder, jobOrderId);
            }
            // Otherwise use the full findAll
            console.log('[UidController] Using full findAll');
            return await this.uidService.findAll(req, filters);
        } catch (error) {
            console.error('[UidController] Error in findAll:', error);
            console.error('[UidController] Error stack:', error.stack);
            console.error('[UidController] Error message:', error.message);
            console.error('[UidController] Full error object:', JSON.stringify(error, Object.getOwnPropertyNames(error), 2));
            // Throw HttpException with detailed message for debugging
            throw new _common.HttpException({
                statusCode: _common.HttpStatus.INTERNAL_SERVER_ERROR,
                message: 'UID Fetch Failed',
                error: error.message,
                stack: error.stack?.substring(0, 500),
                filters: filters
            }, _common.HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
    getDetails(req, uid) {
        return this.uidService.getUIDDetails(req, uid);
    }
    searchUID(req, uid) {
        return this.uidService.searchUID(req, uid);
    }
    getHierarchy(req, uid) {
        return this.uidService.getUIDWithHierarchy(req, uid);
    }
    getPurchaseTrail(req, uid) {
        return this.uidService.getPurchaseTrail(req, uid);
    }
    updateLifecycle(req, uid, body) {
        return this.uidService.updateLifecycle(req, uid, body.stage, body.location, body.reference);
    }
    linkUIDs(req, body) {
        return this.uidService.linkUIDs(req, body.parentUID, body.childUID);
    }
    updateStatus(req, uid, body) {
        return this.uidService.updateStatus(req, uid, body.status, body.location);
    }
    updateQualityStatus(req, uid, body) {
        const qualityStatus = (body.quality_status || body.qualityStatus || '').toString();
        return this.uidService.updateQualityStatus(req, uid, qualityStatus, body.notes);
    }
    validateUID(uid) {
        const isValid = this.uidService.validateUIDFormat(uid);
        return {
            uid,
            isValid,
            message: isValid ? 'UID format is valid' : 'Invalid UID format'
        };
    }
    getCompleteTrace(req, uid) {
        return this.uidService.getCompleteTrace(req, uid);
    }
    constructor(uidService){
        this.uidService = uidService;
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
], UidSupabaseController.prototype, "create", null);
_ts_decorate([
    (0, _common.Get)(),
    _ts_param(0, (0, _common.Request)()),
    _ts_param(1, (0, _common.Query)()),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        Object,
        Object
    ]),
    _ts_metadata("design:returntype", Promise)
], UidSupabaseController.prototype, "findAll", null);
_ts_decorate([
    (0, _common.Get)('details/:uid'),
    _ts_param(0, (0, _common.Request)()),
    _ts_param(1, (0, _common.Param)('uid')),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        Object,
        String
    ]),
    _ts_metadata("design:returntype", void 0)
], UidSupabaseController.prototype, "getDetails", null);
_ts_decorate([
    (0, _common.Get)('search/:uid'),
    _ts_param(0, (0, _common.Request)()),
    _ts_param(1, (0, _common.Param)('uid')),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        Object,
        String
    ]),
    _ts_metadata("design:returntype", void 0)
], UidSupabaseController.prototype, "searchUID", null);
_ts_decorate([
    (0, _common.Get)(':uid/hierarchy'),
    _ts_param(0, (0, _common.Request)()),
    _ts_param(1, (0, _common.Param)('uid')),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        Object,
        String
    ]),
    _ts_metadata("design:returntype", void 0)
], UidSupabaseController.prototype, "getHierarchy", null);
_ts_decorate([
    (0, _common.Get)(':uid/purchase-trail'),
    _ts_param(0, (0, _common.Request)()),
    _ts_param(1, (0, _common.Param)('uid')),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        Object,
        String
    ]),
    _ts_metadata("design:returntype", void 0)
], UidSupabaseController.prototype, "getPurchaseTrail", null);
_ts_decorate([
    (0, _common.Post)(':uid/lifecycle'),
    _ts_param(0, (0, _common.Request)()),
    _ts_param(1, (0, _common.Param)('uid')),
    _ts_param(2, (0, _common.Body)()),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        Object,
        String,
        Object
    ]),
    _ts_metadata("design:returntype", void 0)
], UidSupabaseController.prototype, "updateLifecycle", null);
_ts_decorate([
    (0, _common.Post)('link'),
    _ts_param(0, (0, _common.Request)()),
    _ts_param(1, (0, _common.Body)()),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        Object,
        Object
    ]),
    _ts_metadata("design:returntype", void 0)
], UidSupabaseController.prototype, "linkUIDs", null);
_ts_decorate([
    (0, _common.Put)(':uid/status'),
    _ts_param(0, (0, _common.Request)()),
    _ts_param(1, (0, _common.Param)('uid')),
    _ts_param(2, (0, _common.Body)()),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        Object,
        String,
        Object
    ]),
    _ts_metadata("design:returntype", void 0)
], UidSupabaseController.prototype, "updateStatus", null);
_ts_decorate([
    (0, _common.Put)(':uid/quality-status'),
    _ts_param(0, (0, _common.Request)()),
    _ts_param(1, (0, _common.Param)('uid')),
    _ts_param(2, (0, _common.Body)()),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        Object,
        String,
        Object
    ]),
    _ts_metadata("design:returntype", void 0)
], UidSupabaseController.prototype, "updateQualityStatus", null);
_ts_decorate([
    (0, _common.Get)(':uid/validate'),
    _ts_param(0, (0, _common.Param)('uid')),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        String
    ]),
    _ts_metadata("design:returntype", void 0)
], UidSupabaseController.prototype, "validateUID", null);
_ts_decorate([
    (0, _common.Get)('trace/:uid'),
    _ts_param(0, (0, _common.Request)()),
    _ts_param(1, (0, _common.Param)('uid')),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        Object,
        String
    ]),
    _ts_metadata("design:returntype", void 0)
], UidSupabaseController.prototype, "getCompleteTrace", null);
UidSupabaseController = _ts_decorate([
    (0, _common.Controller)('uid'),
    (0, _common.UseGuards)(_jwtauthguard.JwtAuthGuard),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        typeof _uidsupabaseservice.UidSupabaseService === "undefined" ? Object : _uidsupabaseservice.UidSupabaseService
    ])
], UidSupabaseController);

//# sourceMappingURL=uid-supabase.controller.js.map