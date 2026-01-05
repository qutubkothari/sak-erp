"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
function _export(target, all) {
    for(var name in all)Object.defineProperty(target, name, {
        enumerable: true,
        get: Object.getOwnPropertyDescriptor(all, name).get
    });
}
_export(exports, {
    get ApproveDocumentDto () {
        return ApproveDocumentDto;
    },
    get CreateDocumentDto () {
        return CreateDocumentDto;
    },
    get DocumentStatus () {
        return DocumentStatus;
    },
    get DocumentType () {
        return DocumentType;
    },
    get LinkDocumentDto () {
        return LinkDocumentDto;
    },
    get SearchDocumentsDto () {
        return SearchDocumentsDto;
    },
    get UpdateDocumentDto () {
        return UpdateDocumentDto;
    }
});
const _classvalidator = require("class-validator");
function _ts_decorate(decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for(var i = decorators.length - 1; i >= 0; i--)if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
}
function _ts_metadata(k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
}
var DocumentType = /*#__PURE__*/ function(DocumentType) {
    DocumentType["QUOTATION"] = "QUOTATION";
    DocumentType["PURCHASE_ORDER"] = "PURCHASE_ORDER";
    DocumentType["INVOICE"] = "INVOICE";
    DocumentType["CONTRACT"] = "CONTRACT";
    DocumentType["TECHNICAL_DRAWING"] = "TECHNICAL_DRAWING";
    DocumentType["SPECIFICATION"] = "SPECIFICATION";
    DocumentType["REPORT"] = "REPORT";
    DocumentType["CORRESPONDENCE"] = "CORRESPONDENCE";
    DocumentType["CERTIFICATE"] = "CERTIFICATE";
    DocumentType["WARRANTY"] = "WARRANTY";
    DocumentType["OTHER"] = "OTHER";
    return DocumentType;
}({});
var DocumentStatus = /*#__PURE__*/ function(DocumentStatus) {
    DocumentStatus["DRAFT"] = "DRAFT";
    DocumentStatus["PENDING_APPROVAL"] = "PENDING_APPROVAL";
    DocumentStatus["APPROVED"] = "APPROVED";
    DocumentStatus["REJECTED"] = "REJECTED";
    DocumentStatus["ARCHIVED"] = "ARCHIVED";
    DocumentStatus["OBSOLETE"] = "OBSOLETE";
    return DocumentStatus;
}({});
let CreateDocumentDto = class CreateDocumentDto {
};
_ts_decorate([
    (0, _classvalidator.IsString)(),
    _ts_metadata("design:type", String)
], CreateDocumentDto.prototype, "title", void 0);
_ts_decorate([
    (0, _classvalidator.IsOptional)(),
    (0, _classvalidator.IsString)(),
    _ts_metadata("design:type", String)
], CreateDocumentDto.prototype, "description", void 0);
_ts_decorate([
    (0, _classvalidator.IsEnum)(DocumentType),
    _ts_metadata("design:type", String)
], CreateDocumentDto.prototype, "documentType", void 0);
_ts_decorate([
    (0, _classvalidator.IsOptional)(),
    (0, _classvalidator.IsString)(),
    _ts_metadata("design:type", String)
], CreateDocumentDto.prototype, "documentNumber", void 0);
_ts_decorate([
    (0, _classvalidator.IsOptional)(),
    (0, _classvalidator.IsDate)(),
    _ts_metadata("design:type", typeof Date === "undefined" ? Object : Date)
], CreateDocumentDto.prototype, "documentDate", void 0);
_ts_decorate([
    (0, _classvalidator.IsOptional)(),
    (0, _classvalidator.IsArray)(),
    _ts_metadata("design:type", Array)
], CreateDocumentDto.prototype, "tags", void 0);
_ts_decorate([
    (0, _classvalidator.IsOptional)(),
    (0, _classvalidator.IsString)(),
    _ts_metadata("design:type", String)
], CreateDocumentDto.prototype, "entityType", void 0);
_ts_decorate([
    (0, _classvalidator.IsOptional)(),
    (0, _classvalidator.IsUUID)(),
    _ts_metadata("design:type", String)
], CreateDocumentDto.prototype, "entityId", void 0);
let UpdateDocumentDto = class UpdateDocumentDto {
};
_ts_decorate([
    (0, _classvalidator.IsOptional)(),
    (0, _classvalidator.IsString)(),
    _ts_metadata("design:type", String)
], UpdateDocumentDto.prototype, "title", void 0);
_ts_decorate([
    (0, _classvalidator.IsOptional)(),
    (0, _classvalidator.IsString)(),
    _ts_metadata("design:type", String)
], UpdateDocumentDto.prototype, "description", void 0);
_ts_decorate([
    (0, _classvalidator.IsOptional)(),
    (0, _classvalidator.IsEnum)(DocumentStatus),
    _ts_metadata("design:type", String)
], UpdateDocumentDto.prototype, "status", void 0);
_ts_decorate([
    (0, _classvalidator.IsOptional)(),
    (0, _classvalidator.IsArray)(),
    _ts_metadata("design:type", Array)
], UpdateDocumentDto.prototype, "tags", void 0);
let ApproveDocumentDto = class ApproveDocumentDto {
};
_ts_decorate([
    (0, _classvalidator.IsOptional)(),
    (0, _classvalidator.IsString)(),
    _ts_metadata("design:type", String)
], ApproveDocumentDto.prototype, "comments", void 0);
let LinkDocumentDto = class LinkDocumentDto {
};
_ts_decorate([
    (0, _classvalidator.IsString)(),
    _ts_metadata("design:type", String)
], LinkDocumentDto.prototype, "entityType", void 0);
_ts_decorate([
    (0, _classvalidator.IsUUID)(),
    _ts_metadata("design:type", String)
], LinkDocumentDto.prototype, "entityId", void 0);
_ts_decorate([
    (0, _classvalidator.IsOptional)(),
    (0, _classvalidator.IsString)(),
    _ts_metadata("design:type", String)
], LinkDocumentDto.prototype, "linkType", void 0);
_ts_decorate([
    (0, _classvalidator.IsOptional)(),
    (0, _classvalidator.IsString)(),
    _ts_metadata("design:type", String)
], LinkDocumentDto.prototype, "notes", void 0);
let SearchDocumentsDto = class SearchDocumentsDto {
};
_ts_decorate([
    (0, _classvalidator.IsOptional)(),
    (0, _classvalidator.IsString)(),
    _ts_metadata("design:type", String)
], SearchDocumentsDto.prototype, "query", void 0);
_ts_decorate([
    (0, _classvalidator.IsOptional)(),
    (0, _classvalidator.IsEnum)(DocumentType),
    _ts_metadata("design:type", String)
], SearchDocumentsDto.prototype, "documentType", void 0);
_ts_decorate([
    (0, _classvalidator.IsOptional)(),
    (0, _classvalidator.IsEnum)(DocumentStatus),
    _ts_metadata("design:type", String)
], SearchDocumentsDto.prototype, "status", void 0);
_ts_decorate([
    (0, _classvalidator.IsOptional)(),
    (0, _classvalidator.IsDate)(),
    _ts_metadata("design:type", typeof Date === "undefined" ? Object : Date)
], SearchDocumentsDto.prototype, "dateFrom", void 0);
_ts_decorate([
    (0, _classvalidator.IsOptional)(),
    (0, _classvalidator.IsDate)(),
    _ts_metadata("design:type", typeof Date === "undefined" ? Object : Date)
], SearchDocumentsDto.prototype, "dateTo", void 0);
_ts_decorate([
    (0, _classvalidator.IsOptional)(),
    (0, _classvalidator.IsArray)(),
    _ts_metadata("design:type", Array)
], SearchDocumentsDto.prototype, "tags", void 0);
_ts_decorate([
    (0, _classvalidator.IsOptional)(),
    (0, _classvalidator.IsString)(),
    _ts_metadata("design:type", String)
], SearchDocumentsDto.prototype, "entityType", void 0);
_ts_decorate([
    (0, _classvalidator.IsOptional)(),
    (0, _classvalidator.IsUUID)(),
    _ts_metadata("design:type", String)
], SearchDocumentsDto.prototype, "entityId", void 0);
_ts_decorate([
    (0, _classvalidator.IsOptional)(),
    (0, _classvalidator.IsString)(),
    _ts_metadata("design:type", String)
], SearchDocumentsDto.prototype, "sortBy", void 0);
_ts_decorate([
    (0, _classvalidator.IsOptional)(),
    (0, _classvalidator.IsString)(),
    _ts_metadata("design:type", String)
], SearchDocumentsDto.prototype, "sortOrder", void 0);
_ts_decorate([
    (0, _classvalidator.IsOptional)(),
    _ts_metadata("design:type", Number)
], SearchDocumentsDto.prototype, "page", void 0);
_ts_decorate([
    (0, _classvalidator.IsOptional)(),
    _ts_metadata("design:type", Number)
], SearchDocumentsDto.prototype, "limit", void 0);

//# sourceMappingURL=create-document.dto.js.map