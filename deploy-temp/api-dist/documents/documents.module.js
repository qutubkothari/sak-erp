"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "DocumentsModule", {
    enumerable: true,
    get: function() {
        return DocumentsModule;
    }
});
const _common = require("@nestjs/common");
const _documentsservice = require("./services/documents.service");
const _documentcategoriesservice = require("./services/document-categories.service");
const _documentrevisionsservice = require("./services/document-revisions.service");
const _documentapprovalsservice = require("./services/document-approvals.service");
const _supabasestorageservice = require("./services/supabase-storage.service");
const _openaidocumentservice = require("./services/openai-document.service");
const _quotepdfservice = require("./services/quote-pdf.service");
const _documentworkflowservice = require("./services/document-workflow.service");
const _documentscontroller = require("./controllers/documents.controller");
const _documentcategoriescontroller = require("./controllers/document-categories.controller");
const _clientuploadcontroller = require("./controllers/client-upload.controller");
const _emailmodule = require("../email/email.module");
function _ts_decorate(decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for(var i = decorators.length - 1; i >= 0; i--)if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
}
let DocumentsModule = class DocumentsModule {
};
DocumentsModule = _ts_decorate([
    (0, _common.Module)({
        imports: [
            _emailmodule.EmailModule
        ],
        controllers: [
            _documentscontroller.DocumentsController,
            _documentcategoriescontroller.DocumentCategoriesController,
            _clientuploadcontroller.ClientUploadController
        ],
        providers: [
            _documentsservice.DocumentsService,
            _documentcategoriesservice.DocumentCategoriesService,
            _documentrevisionsservice.DocumentRevisionsService,
            _documentapprovalsservice.DocumentApprovalsService,
            _supabasestorageservice.SupabaseStorageService,
            _openaidocumentservice.OpenAIDocumentService,
            _quotepdfservice.QuotePdfService,
            _documentworkflowservice.DocumentWorkflowService
        ],
        exports: [
            _documentsservice.DocumentsService,
            _documentcategoriesservice.DocumentCategoriesService,
            _documentrevisionsservice.DocumentRevisionsService,
            _documentapprovalsservice.DocumentApprovalsService,
            _supabasestorageservice.SupabaseStorageService,
            _openaidocumentservice.OpenAIDocumentService,
            _quotepdfservice.QuotePdfService,
            _documentworkflowservice.DocumentWorkflowService
        ]
    })
], DocumentsModule);

//# sourceMappingURL=documents.module.js.map