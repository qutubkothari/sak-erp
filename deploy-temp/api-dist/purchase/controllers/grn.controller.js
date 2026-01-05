"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "GrnController", {
    enumerable: true,
    get: function() {
        return GrnController;
    }
});
const _common = require("@nestjs/common");
const _grnservice = require("../services/grn.service");
const _jwtauthguard = require("../../auth/guards/jwt-auth.guard");
const _platformexpress = require("@nestjs/platform-express");
const _multer = require("multer");
const _fs = require("fs");
const _path = require("path");
const _crypto = require("crypto");
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
function getUploadsRoot() {
    return process.env.UPLOAD_ROOT_DIR || (0, _path.resolve)(process.cwd(), '..', '..', 'uploads');
}
function buildGrnUploadStorage(kind) {
    return (0, _multer.diskStorage)({
        destination: (req, _file, cb)=>{
            try {
                const user = req?.user;
                const tenantId = user?.tenantId;
                const userId = user?.userId;
                if (!tenantId || !userId) {
                    cb(new _common.BadRequestException('Missing auth context for upload'), '');
                    return;
                }
                const today = new Date().toISOString().slice(0, 10);
                const relativeDir = kind === 'invoice' ? `grn/invoices/${today}/${tenantId}/${userId}` : `grn/qc/${today}/${tenantId}/${userId}`;
                req.__grnUploadRelativeDir = relativeDir;
                const uploadsRoot = getUploadsRoot();
                const targetDir = (0, _path.join)(uploadsRoot, relativeDir);
                (0, _fs.mkdirSync)(targetDir, {
                    recursive: true
                });
                cb(null, targetDir);
            } catch (e) {
                cb(e, '');
            }
        },
        filename: (req, file, cb)=>{
            try {
                const extensionFromName = (0, _path.extname)(file.originalname || '').toLowerCase();
                const safeExtension = extensionFromName && extensionFromName.length <= 10 ? extensionFromName : file.mimetype === 'application/pdf' ? '.pdf' : file.mimetype === 'image/png' ? '.png' : file.mimetype === 'image/jpeg' || file.mimetype === 'image/jpg' ? '.jpg' : '';
                const fileName = `${(0, _crypto.randomUUID)()}${safeExtension}`;
                req.__grnUploadFileName = fileName;
                cb(null, fileName);
            } catch (e) {
                cb(e, '');
            }
        }
    });
}
let GrnController = class GrnController {
    async uploadInvoice(req, file) {
        return this.grnService.uploadInvoice(req.user.tenantId, req.user.userId, file);
    }
    async uploadQcAttachment(req, file) {
        return this.grnService.uploadQcAttachment(req.user.tenantId, req.user.userId, file);
    }
    async create(req, body) {
        return this.grnService.create(req.user.tenantId, req.user.userId, body);
    }
    async findAll(req, query) {
        return this.grnService.findAll(req.user.tenantId, query);
    }
    async findOne(req, id) {
        return this.grnService.findOne(req.user.tenantId, id);
    }
    async update(req, id, body) {
        return this.grnService.update(req.user.tenantId, id, body);
    }
    async submit(req, id) {
        return this.grnService.submit(req.user.tenantId, id, req.user.userId);
    }
    async updateStatus(req, id, body) {
        return this.grnService.updateStatus(req.user.tenantId, id, body.status, req.user.userId);
    }
    async delete(req, id) {
        return this.grnService.delete(req.user.tenantId, id);
    }
    async qcAccept(req, id, body) {
        return this.grnService.qcAccept(req.user.tenantId, id, req.user.userId, body);
    }
    async generateUIDs(req, itemId, body) {
        return this.grnService.generateUIDs(req.user.tenantId, itemId, body);
    }
    async getUIDsByGRN(req, id) {
        return this.grnService.getUIDsByGRN(req.user.tenantId, id);
    }
    constructor(grnService){
        this.grnService = grnService;
    }
};
_ts_decorate([
    (0, _common.Post)('invoice/upload'),
    (0, _common.UseInterceptors)((0, _platformexpress.FileInterceptor)('file', {
        storage: buildGrnUploadStorage('invoice'),
        limits: {
            fileSize: 10 * 1024 * 1024
        }
    })),
    _ts_param(0, (0, _common.Request)()),
    _ts_param(1, (0, _common.UploadedFile)()),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        Object,
        typeof Express === "undefined" || typeof Express.Multer === "undefined" || typeof Express.Multer.File === "undefined" ? Object : Express.Multer.File
    ]),
    _ts_metadata("design:returntype", Promise)
], GrnController.prototype, "uploadInvoice", null);
_ts_decorate([
    (0, _common.Post)('qc/upload'),
    (0, _common.UseInterceptors)((0, _platformexpress.FileInterceptor)('file', {
        storage: buildGrnUploadStorage('qc'),
        limits: {
            fileSize: 10 * 1024 * 1024
        }
    })),
    _ts_param(0, (0, _common.Request)()),
    _ts_param(1, (0, _common.UploadedFile)()),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        Object,
        typeof Express === "undefined" || typeof Express.Multer === "undefined" || typeof Express.Multer.File === "undefined" ? Object : Express.Multer.File
    ]),
    _ts_metadata("design:returntype", Promise)
], GrnController.prototype, "uploadQcAttachment", null);
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
], GrnController.prototype, "create", null);
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
], GrnController.prototype, "findAll", null);
_ts_decorate([
    (0, _common.Get)(':id'),
    _ts_param(0, (0, _common.Request)()),
    _ts_param(1, (0, _common.Param)('id')),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        Object,
        String
    ]),
    _ts_metadata("design:returntype", Promise)
], GrnController.prototype, "findOne", null);
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
], GrnController.prototype, "update", null);
_ts_decorate([
    (0, _common.Post)(':id/submit'),
    _ts_param(0, (0, _common.Request)()),
    _ts_param(1, (0, _common.Param)('id')),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        Object,
        String
    ]),
    _ts_metadata("design:returntype", Promise)
], GrnController.prototype, "submit", null);
_ts_decorate([
    (0, _common.Post)(':id/status'),
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
], GrnController.prototype, "updateStatus", null);
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
], GrnController.prototype, "delete", null);
_ts_decorate([
    (0, _common.Post)(':id/qc-accept'),
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
], GrnController.prototype, "qcAccept", null);
_ts_decorate([
    (0, _common.Post)('items/:itemId/generate-uids'),
    _ts_param(0, (0, _common.Request)()),
    _ts_param(1, (0, _common.Param)('itemId')),
    _ts_param(2, (0, _common.Body)()),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        Object,
        String,
        Object
    ]),
    _ts_metadata("design:returntype", Promise)
], GrnController.prototype, "generateUIDs", null);
_ts_decorate([
    (0, _common.Get)(':id/uids'),
    _ts_param(0, (0, _common.Request)()),
    _ts_param(1, (0, _common.Param)('id')),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        Object,
        String
    ]),
    _ts_metadata("design:returntype", Promise)
], GrnController.prototype, "getUIDsByGRN", null);
GrnController = _ts_decorate([
    (0, _common.Controller)('purchase/grn'),
    (0, _common.UseGuards)(_jwtauthguard.JwtAuthGuard),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        typeof _grnservice.GrnService === "undefined" ? Object : _grnservice.GrnService
    ])
], GrnController);

//# sourceMappingURL=grn.controller.js.map