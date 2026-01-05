"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "GenerateQuoteDto", {
    enumerable: true,
    get: function() {
        return GenerateQuoteDto;
    }
});
const _classvalidator = require("class-validator");
const _classtransformer = require("class-transformer");
function _ts_decorate(decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for(var i = decorators.length - 1; i >= 0; i--)if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
}
function _ts_metadata(k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
}
let QuoteCompanyDto = class QuoteCompanyDto {
};
_ts_decorate([
    (0, _classvalidator.IsString)(),
    _ts_metadata("design:type", String)
], QuoteCompanyDto.prototype, "name", void 0);
_ts_decorate([
    (0, _classvalidator.IsOptional)(),
    (0, _classvalidator.IsString)(),
    _ts_metadata("design:type", String)
], QuoteCompanyDto.prototype, "legal_name", void 0);
_ts_decorate([
    (0, _classvalidator.IsOptional)(),
    (0, _classvalidator.IsString)(),
    _ts_metadata("design:type", String)
], QuoteCompanyDto.prototype, "address", void 0);
_ts_decorate([
    (0, _classvalidator.IsOptional)(),
    (0, _classvalidator.IsString)(),
    _ts_metadata("design:type", String)
], QuoteCompanyDto.prototype, "phone", void 0);
_ts_decorate([
    (0, _classvalidator.IsOptional)(),
    (0, _classvalidator.IsEmail)(),
    _ts_metadata("design:type", String)
], QuoteCompanyDto.prototype, "email", void 0);
_ts_decorate([
    (0, _classvalidator.IsOptional)(),
    (0, _classvalidator.IsString)(),
    _ts_metadata("design:type", String)
], QuoteCompanyDto.prototype, "website", void 0);
let QuoteCustomerDto = class QuoteCustomerDto {
};
_ts_decorate([
    (0, _classvalidator.IsString)(),
    _ts_metadata("design:type", String)
], QuoteCustomerDto.prototype, "name", void 0);
_ts_decorate([
    (0, _classvalidator.IsOptional)(),
    (0, _classvalidator.IsString)(),
    _ts_metadata("design:type", String)
], QuoteCustomerDto.prototype, "address", void 0);
_ts_decorate([
    (0, _classvalidator.IsOptional)(),
    (0, _classvalidator.IsString)(),
    _ts_metadata("design:type", String)
], QuoteCustomerDto.prototype, "phone", void 0);
_ts_decorate([
    (0, _classvalidator.IsOptional)(),
    (0, _classvalidator.IsEmail)(),
    _ts_metadata("design:type", String)
], QuoteCustomerDto.prototype, "email", void 0);
let QuoteItemDto = class QuoteItemDto {
};
_ts_decorate([
    (0, _classvalidator.IsString)(),
    _ts_metadata("design:type", String)
], QuoteItemDto.prototype, "description", void 0);
_ts_decorate([
    (0, _classvalidator.IsNumber)(),
    (0, _classvalidator.Min)(0),
    _ts_metadata("design:type", Number)
], QuoteItemDto.prototype, "quantity", void 0);
_ts_decorate([
    (0, _classvalidator.IsOptional)(),
    (0, _classvalidator.IsString)(),
    _ts_metadata("design:type", String)
], QuoteItemDto.prototype, "unit", void 0);
_ts_decorate([
    (0, _classvalidator.IsNumber)(),
    (0, _classvalidator.Min)(0),
    _ts_metadata("design:type", Number)
], QuoteItemDto.prototype, "unit_price", void 0);
let GenerateQuoteDto = class GenerateQuoteDto {
};
_ts_decorate([
    (0, _classvalidator.IsOptional)(),
    (0, _classvalidator.IsString)(),
    _ts_metadata("design:type", String)
], GenerateQuoteDto.prototype, "category_id", void 0);
_ts_decorate([
    (0, _classvalidator.IsOptional)(),
    (0, _classvalidator.IsString)(),
    _ts_metadata("design:type", String)
], GenerateQuoteDto.prototype, "title", void 0);
_ts_decorate([
    (0, _classvalidator.IsOptional)(),
    (0, _classvalidator.IsString)(),
    _ts_metadata("design:type", String)
], GenerateQuoteDto.prototype, "quote_number", void 0);
_ts_decorate([
    (0, _classvalidator.IsOptional)(),
    (0, _classvalidator.IsString)(),
    _ts_metadata("design:type", String)
], GenerateQuoteDto.prototype, "quote_date_iso", void 0);
_ts_decorate([
    (0, _classvalidator.ValidateNested)(),
    (0, _classtransformer.Type)(()=>QuoteCompanyDto),
    _ts_metadata("design:type", typeof QuoteCompanyDto === "undefined" ? Object : QuoteCompanyDto)
], GenerateQuoteDto.prototype, "company", void 0);
_ts_decorate([
    (0, _classvalidator.ValidateNested)(),
    (0, _classtransformer.Type)(()=>QuoteCustomerDto),
    _ts_metadata("design:type", typeof QuoteCustomerDto === "undefined" ? Object : QuoteCustomerDto)
], GenerateQuoteDto.prototype, "customer", void 0);
_ts_decorate([
    (0, _classvalidator.IsArray)(),
    (0, _classvalidator.ValidateNested)({
        each: true
    }),
    (0, _classtransformer.Type)(()=>QuoteItemDto),
    _ts_metadata("design:type", Array)
], GenerateQuoteDto.prototype, "items", void 0);
_ts_decorate([
    (0, _classvalidator.IsOptional)(),
    (0, _classvalidator.IsString)(),
    _ts_metadata("design:type", String)
], GenerateQuoteDto.prototype, "currency", void 0);
_ts_decorate([
    (0, _classvalidator.IsOptional)(),
    (0, _classvalidator.IsNumber)(),
    _ts_metadata("design:type", Number)
], GenerateQuoteDto.prototype, "tax_rate", void 0);
_ts_decorate([
    (0, _classvalidator.IsOptional)(),
    (0, _classvalidator.IsNumber)(),
    _ts_metadata("design:type", Number)
], GenerateQuoteDto.prototype, "discount", void 0);
_ts_decorate([
    (0, _classvalidator.IsOptional)(),
    (0, _classvalidator.IsString)(),
    _ts_metadata("design:type", String)
], GenerateQuoteDto.prototype, "notes", void 0);
_ts_decorate([
    (0, _classvalidator.IsOptional)(),
    (0, _classvalidator.IsString)(),
    _ts_metadata("design:type", String)
], GenerateQuoteDto.prototype, "terms", void 0);
_ts_decorate([
    (0, _classvalidator.IsOptional)(),
    (0, _classvalidator.IsString)(),
    _ts_metadata("design:type", String)
], GenerateQuoteDto.prototype, "related_entity_type", void 0);
_ts_decorate([
    (0, _classvalidator.IsOptional)(),
    (0, _classvalidator.IsString)(),
    _ts_metadata("design:type", String)
], GenerateQuoteDto.prototype, "related_entity_id", void 0);
_ts_decorate([
    (0, _classvalidator.IsOptional)(),
    (0, _classvalidator.IsString)(),
    _ts_metadata("design:type", String)
], GenerateQuoteDto.prototype, "access_level", void 0);
_ts_decorate([
    (0, _classvalidator.IsOptional)(),
    (0, _classvalidator.IsString)(),
    _ts_metadata("design:type", String)
], GenerateQuoteDto.prototype, "tags", void 0);

//# sourceMappingURL=generate-quote.dto.js.map