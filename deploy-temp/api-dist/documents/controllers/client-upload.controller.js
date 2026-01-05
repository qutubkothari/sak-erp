"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "ClientUploadController", {
    enumerable: true,
    get: function() {
        return ClientUploadController;
    }
});
const _common = require("@nestjs/common");
const _platformexpress = require("@nestjs/platform-express");
const _multer = require("multer");
const _documentworkflowservice = require("../services/document-workflow.service");
const _workflowdto = require("../dto/workflow.dto");
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
let ClientUploadController = class ClientUploadController {
    async uploadRevision(token, file, dto) {
        if (!file) {
            throw new _common.BadRequestException('No file uploaded');
        }
        return this.workflowService.clientUploadRevision(token, file, dto);
    }
    constructor(workflowService){
        this.workflowService = workflowService;
    }
};
_ts_decorate([
    (0, _common.Post)('upload/:token'),
    (0, _common.UseInterceptors)((0, _platformexpress.FileInterceptor)('file', {
        storage: (0, _multer.memoryStorage)(),
        limits: {
            fileSize: 100 * 1024 * 1024
        }
    })),
    _ts_param(0, (0, _common.Param)('token')),
    _ts_param(1, (0, _common.UploadedFile)()),
    _ts_param(2, (0, _common.Body)()),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        String,
        typeof Express === "undefined" || typeof Express.Multer === "undefined" || typeof Express.Multer.File === "undefined" ? Object : Express.Multer.File,
        typeof _workflowdto.ClientUploadDto === "undefined" ? Object : _workflowdto.ClientUploadDto
    ]),
    _ts_metadata("design:returntype", Promise)
], ClientUploadController.prototype, "uploadRevision", null);
ClientUploadController = _ts_decorate([
    (0, _common.Controller)('client'),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        typeof _documentworkflowservice.DocumentWorkflowService === "undefined" ? Object : _documentworkflowservice.DocumentWorkflowService
    ])
], ClientUploadController);

//# sourceMappingURL=client-upload.controller.js.map