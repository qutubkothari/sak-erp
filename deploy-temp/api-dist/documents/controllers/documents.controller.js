"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "DocumentsController", {
    enumerable: true,
    get: function() {
        return DocumentsController;
    }
});
const _common = require("@nestjs/common");
const _platformexpress = require("@nestjs/platform-express");
const _multer = require("multer");
const _documentsservice = require("../services/documents.service");
const _documentrevisionsservice = require("../services/document-revisions.service");
const _documentworkflowservice = require("../services/document-workflow.service");
const _jwtauthguard = require("../../auth/guards/jwt-auth.guard");
const _generatequotedto = require("../dto/generate-quote.dto");
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
let DocumentsController = class DocumentsController {
    uploadDocument(req, file, body) {
        return this.documentsService.uploadAndCreate(req, file, body);
    }
    uploadRevision(req, id, file, body) {
        return this.documentsService.uploadAndAddRevision(req, id, file, body);
    }
    reanalyzeDocument(req, id) {
        return this.documentsService.reanalyze(req, id);
    }
    qualityCheck(req, id) {
        return this.documentsService.qualityCheck(req, id);
    }
    generateQuote(req, dto) {
        return this.documentsService.generateQuote(req, dto);
    }
    getSignedUrl(req, id, expiresIn) {
        return this.documentsService.getSignedUrl(req, id, expiresIn);
    }
    create(req, createDto) {
        return this.documentsService.create(req, createDto);
    }
    findAll(req, filters) {
        return this.documentsService.findAll(req, filters);
    }
    getPendingApprovals(req) {
        return this.documentsService.getPendingApprovals(req);
    }
    findOne(req, id) {
        return this.documentsService.findOne(req, id);
    }
    update(req, id, updateDto) {
        return this.documentsService.update(req, id, updateDto);
    }
    delete(req, id) {
        return this.documentsService.delete(req, id);
    }
    addRevision(req, id, revisionDto) {
        return this.documentsService.addRevision(req, id, revisionDto);
    }
    getRevisions(req, id) {
        return this.revisionsService.findAllByDocument(req, id);
    }
    submitForApproval(req, id, approvalWorkflow) {
        return this.documentsService.submitForApproval(req, id, approvalWorkflow);
    }
    approveDocument(req, id, approvalId, body) {
        return this.documentsService.approveDocument(req, id, approvalId, body.comments);
    }
    rejectDocument(req, id, approvalId, body) {
        return this.documentsService.rejectDocument(req, id, approvalId, body.reason);
    }
    archiveDocument(req, id) {
        return this.documentsService.archiveDocument(req, id);
    }
    getAccessLogs(req, id) {
        return this.documentsService.getAccessLogs(req, id);
    }
    // Workflow endpoints
    async forwardToStaff(req, id, dto) {
        return this.workflowService.forwardToStaff(req, id, dto);
    }
    async returnToAdmin(req, id, body) {
        return this.workflowService.returnToAdmin(req, id, body);
    }
    async forwardToManager(req, id, dto) {
        return this.workflowService.forwardToManager(req, id, dto);
    }
    async sendToClient(req, id, dto) {
        return this.workflowService.sendToClient(req, id, dto);
    }
    async workflowReject(req, id, dto) {
        return this.workflowService.rejectDocument(req, id, dto);
    }
    async finalApprove(req, id) {
        return this.workflowService.finalApprove(req, id);
    }
    async getWorkflowHistory(req, id) {
        return this.workflowService.getWorkflowHistory(req, id);
    }
    constructor(documentsService, revisionsService, workflowService){
        this.documentsService = documentsService;
        this.revisionsService = revisionsService;
        this.workflowService = workflowService;
    }
};
_ts_decorate([
    (0, _common.Post)('upload'),
    (0, _common.UseInterceptors)((0, _platformexpress.FileInterceptor)('file', {
        storage: (0, _multer.memoryStorage)(),
        limits: {
            fileSize: 50 * 1024 * 1024
        }
    })),
    _ts_param(0, (0, _common.Request)()),
    _ts_param(1, (0, _common.UploadedFile)()),
    _ts_param(2, (0, _common.Body)()),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        Object,
        typeof Express === "undefined" || typeof Express.Multer === "undefined" || typeof Express.Multer.File === "undefined" ? Object : Express.Multer.File,
        Object
    ]),
    _ts_metadata("design:returntype", void 0)
], DocumentsController.prototype, "uploadDocument", null);
_ts_decorate([
    (0, _common.Post)(':id/revisions/upload'),
    (0, _common.UseInterceptors)((0, _platformexpress.FileInterceptor)('file', {
        storage: (0, _multer.memoryStorage)(),
        limits: {
            fileSize: 50 * 1024 * 1024
        }
    })),
    _ts_param(0, (0, _common.Request)()),
    _ts_param(1, (0, _common.Param)('id')),
    _ts_param(2, (0, _common.UploadedFile)()),
    _ts_param(3, (0, _common.Body)()),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        Object,
        String,
        typeof Express === "undefined" || typeof Express.Multer === "undefined" || typeof Express.Multer.File === "undefined" ? Object : Express.Multer.File,
        Object
    ]),
    _ts_metadata("design:returntype", void 0)
], DocumentsController.prototype, "uploadRevision", null);
_ts_decorate([
    (0, _common.Post)(':id/reanalyze'),
    _ts_param(0, (0, _common.Request)()),
    _ts_param(1, (0, _common.Param)('id')),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        Object,
        String
    ]),
    _ts_metadata("design:returntype", void 0)
], DocumentsController.prototype, "reanalyzeDocument", null);
_ts_decorate([
    (0, _common.Post)(':id/quality-check'),
    _ts_param(0, (0, _common.Request)()),
    _ts_param(1, (0, _common.Param)('id')),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        Object,
        String
    ]),
    _ts_metadata("design:returntype", void 0)
], DocumentsController.prototype, "qualityCheck", null);
_ts_decorate([
    (0, _common.Post)('generate-quote'),
    _ts_param(0, (0, _common.Request)()),
    _ts_param(1, (0, _common.Body)()),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        Object,
        typeof _generatequotedto.GenerateQuoteDto === "undefined" ? Object : _generatequotedto.GenerateQuoteDto
    ]),
    _ts_metadata("design:returntype", void 0)
], DocumentsController.prototype, "generateQuote", null);
_ts_decorate([
    (0, _common.Get)(':id/signed-url'),
    _ts_param(0, (0, _common.Request)()),
    _ts_param(1, (0, _common.Param)('id')),
    _ts_param(2, (0, _common.Query)('expiresIn')),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        Object,
        String,
        String
    ]),
    _ts_metadata("design:returntype", void 0)
], DocumentsController.prototype, "getSignedUrl", null);
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
], DocumentsController.prototype, "create", null);
_ts_decorate([
    (0, _common.Get)(),
    _ts_param(0, (0, _common.Request)()),
    _ts_param(1, (0, _common.Query)()),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        Object,
        Object
    ]),
    _ts_metadata("design:returntype", void 0)
], DocumentsController.prototype, "findAll", null);
_ts_decorate([
    (0, _common.Get)('pending-approvals'),
    _ts_param(0, (0, _common.Request)()),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        Object
    ]),
    _ts_metadata("design:returntype", void 0)
], DocumentsController.prototype, "getPendingApprovals", null);
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
], DocumentsController.prototype, "findOne", null);
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
], DocumentsController.prototype, "update", null);
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
], DocumentsController.prototype, "delete", null);
_ts_decorate([
    (0, _common.Post)(':id/revisions'),
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
], DocumentsController.prototype, "addRevision", null);
_ts_decorate([
    (0, _common.Get)(':id/revisions'),
    _ts_param(0, (0, _common.Request)()),
    _ts_param(1, (0, _common.Param)('id')),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        Object,
        String
    ]),
    _ts_metadata("design:returntype", void 0)
], DocumentsController.prototype, "getRevisions", null);
_ts_decorate([
    (0, _common.Post)(':id/submit-approval'),
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
], DocumentsController.prototype, "submitForApproval", null);
_ts_decorate([
    (0, _common.Post)(':id/approve/:approvalId'),
    _ts_param(0, (0, _common.Request)()),
    _ts_param(1, (0, _common.Param)('id')),
    _ts_param(2, (0, _common.Param)('approvalId')),
    _ts_param(3, (0, _common.Body)()),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        Object,
        String,
        String,
        Object
    ]),
    _ts_metadata("design:returntype", void 0)
], DocumentsController.prototype, "approveDocument", null);
_ts_decorate([
    (0, _common.Post)(':id/reject/:approvalId'),
    _ts_param(0, (0, _common.Request)()),
    _ts_param(1, (0, _common.Param)('id')),
    _ts_param(2, (0, _common.Param)('approvalId')),
    _ts_param(3, (0, _common.Body)()),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        Object,
        String,
        String,
        Object
    ]),
    _ts_metadata("design:returntype", void 0)
], DocumentsController.prototype, "rejectDocument", null);
_ts_decorate([
    (0, _common.Post)(':id/archive'),
    _ts_param(0, (0, _common.Request)()),
    _ts_param(1, (0, _common.Param)('id')),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        Object,
        String
    ]),
    _ts_metadata("design:returntype", void 0)
], DocumentsController.prototype, "archiveDocument", null);
_ts_decorate([
    (0, _common.Get)(':id/access-logs'),
    _ts_param(0, (0, _common.Request)()),
    _ts_param(1, (0, _common.Param)('id')),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        Object,
        String
    ]),
    _ts_metadata("design:returntype", void 0)
], DocumentsController.prototype, "getAccessLogs", null);
_ts_decorate([
    (0, _common.Post)(':id/forward-to-staff'),
    _ts_param(0, (0, _common.Request)()),
    _ts_param(1, (0, _common.Param)('id')),
    _ts_param(2, (0, _common.Body)()),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        Object,
        String,
        typeof _workflowdto.ForwardDocumentDto === "undefined" ? Object : _workflowdto.ForwardDocumentDto
    ]),
    _ts_metadata("design:returntype", Promise)
], DocumentsController.prototype, "forwardToStaff", null);
_ts_decorate([
    (0, _common.Post)(':id/return-to-admin'),
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
], DocumentsController.prototype, "returnToAdmin", null);
_ts_decorate([
    (0, _common.Post)(':id/forward-to-manager'),
    _ts_param(0, (0, _common.Request)()),
    _ts_param(1, (0, _common.Param)('id')),
    _ts_param(2, (0, _common.Body)()),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        Object,
        String,
        typeof _workflowdto.ForwardDocumentDto === "undefined" ? Object : _workflowdto.ForwardDocumentDto
    ]),
    _ts_metadata("design:returntype", Promise)
], DocumentsController.prototype, "forwardToManager", null);
_ts_decorate([
    (0, _common.Post)(':id/send-to-client'),
    _ts_param(0, (0, _common.Request)()),
    _ts_param(1, (0, _common.Param)('id')),
    _ts_param(2, (0, _common.Body)()),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        Object,
        String,
        typeof _workflowdto.SendToClientDto === "undefined" ? Object : _workflowdto.SendToClientDto
    ]),
    _ts_metadata("design:returntype", Promise)
], DocumentsController.prototype, "sendToClient", null);
_ts_decorate([
    (0, _common.Post)(':id/workflow-reject'),
    _ts_param(0, (0, _common.Request)()),
    _ts_param(1, (0, _common.Param)('id')),
    _ts_param(2, (0, _common.Body)()),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        Object,
        String,
        typeof _workflowdto.RejectDocumentDto === "undefined" ? Object : _workflowdto.RejectDocumentDto
    ]),
    _ts_metadata("design:returntype", Promise)
], DocumentsController.prototype, "workflowReject", null);
_ts_decorate([
    (0, _common.Post)(':id/final-approve'),
    _ts_param(0, (0, _common.Request)()),
    _ts_param(1, (0, _common.Param)('id')),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        Object,
        String
    ]),
    _ts_metadata("design:returntype", Promise)
], DocumentsController.prototype, "finalApprove", null);
_ts_decorate([
    (0, _common.Get)(':id/workflow-history'),
    _ts_param(0, (0, _common.Request)()),
    _ts_param(1, (0, _common.Param)('id')),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        Object,
        String
    ]),
    _ts_metadata("design:returntype", Promise)
], DocumentsController.prototype, "getWorkflowHistory", null);
DocumentsController = _ts_decorate([
    (0, _common.Controller)('documents'),
    (0, _common.UseGuards)(_jwtauthguard.JwtAuthGuard),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        typeof _documentsservice.DocumentsService === "undefined" ? Object : _documentsservice.DocumentsService,
        typeof _documentrevisionsservice.DocumentRevisionsService === "undefined" ? Object : _documentrevisionsservice.DocumentRevisionsService,
        typeof _documentworkflowservice.DocumentWorkflowService === "undefined" ? Object : _documentworkflowservice.DocumentWorkflowService
    ])
], DocumentsController);

//# sourceMappingURL=documents.controller.js.map