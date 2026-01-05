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
    get CreateJobOrderDto () {
        return CreateJobOrderDto;
    },
    get JobOrderMaterialDto () {
        return JobOrderMaterialDto;
    },
    get JobOrderOperationDto () {
        return JobOrderOperationDto;
    },
    get UpdateJobOrderDto () {
        return UpdateJobOrderDto;
    },
    get UpdateOperationDto () {
        return UpdateOperationDto;
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
let JobOrderOperationDto = class JobOrderOperationDto {
};
_ts_decorate([
    (0, _classvalidator.IsNumber)(),
    _ts_metadata("design:type", Number)
], JobOrderOperationDto.prototype, "sequenceNumber", void 0);
_ts_decorate([
    (0, _classvalidator.IsNotEmpty)(),
    (0, _classvalidator.IsString)(),
    _ts_metadata("design:type", String)
], JobOrderOperationDto.prototype, "operationName", void 0);
_ts_decorate([
    (0, _classvalidator.IsNotEmpty)(),
    (0, _classvalidator.IsUUID)(),
    _ts_metadata("design:type", String)
], JobOrderOperationDto.prototype, "workstationId", void 0);
_ts_decorate([
    (0, _classvalidator.IsOptional)(),
    (0, _classvalidator.IsUUID)(),
    _ts_metadata("design:type", String)
], JobOrderOperationDto.prototype, "assignedUserId", void 0);
_ts_decorate([
    (0, _classvalidator.IsOptional)(),
    (0, _classvalidator.IsDateString)(),
    _ts_metadata("design:type", String)
], JobOrderOperationDto.prototype, "startDatetime", void 0);
_ts_decorate([
    (0, _classvalidator.IsOptional)(),
    (0, _classvalidator.IsDateString)(),
    _ts_metadata("design:type", String)
], JobOrderOperationDto.prototype, "endDatetime", void 0);
_ts_decorate([
    (0, _classvalidator.IsOptional)(),
    (0, _classvalidator.IsNumber)(),
    _ts_metadata("design:type", Number)
], JobOrderOperationDto.prototype, "expectedDurationHours", void 0);
_ts_decorate([
    (0, _classvalidator.IsOptional)(),
    (0, _classvalidator.IsNumber)(),
    _ts_metadata("design:type", Number)
], JobOrderOperationDto.prototype, "setupTimeHours", void 0);
_ts_decorate([
    (0, _classvalidator.IsOptional)(),
    (0, _classvalidator.IsNumber)(),
    _ts_metadata("design:type", Number)
], JobOrderOperationDto.prototype, "acceptedVariationPercent", void 0);
_ts_decorate([
    (0, _classvalidator.IsOptional)(),
    (0, _classvalidator.IsString)(),
    _ts_metadata("design:type", String)
], JobOrderOperationDto.prototype, "notes", void 0);
let JobOrderMaterialDto = class JobOrderMaterialDto {
};
_ts_decorate([
    (0, _classvalidator.IsNotEmpty)(),
    (0, _classvalidator.IsUUID)(),
    _ts_metadata("design:type", String)
], JobOrderMaterialDto.prototype, "itemId", void 0);
_ts_decorate([
    (0, _classvalidator.IsOptional)(),
    (0, _classvalidator.IsUUID)(),
    _ts_metadata("design:type", String)
], JobOrderMaterialDto.prototype, "selectedVariantId", void 0);
_ts_decorate([
    (0, _classvalidator.IsOptional)(),
    (0, _classvalidator.IsString)(),
    _ts_metadata("design:type", String)
], JobOrderMaterialDto.prototype, "variantNotes", void 0);
_ts_decorate([
    (0, _classvalidator.IsNotEmpty)(),
    (0, _classvalidator.IsNumber)(),
    _ts_metadata("design:type", Number)
], JobOrderMaterialDto.prototype, "requiredQuantity", void 0);
_ts_decorate([
    (0, _classvalidator.IsOptional)(),
    (0, _classvalidator.IsUUID)(),
    _ts_metadata("design:type", String)
], JobOrderMaterialDto.prototype, "warehouseId", void 0);
let CreateJobOrderDto = class CreateJobOrderDto {
};
_ts_decorate([
    (0, _classvalidator.IsNotEmpty)(),
    (0, _classvalidator.IsUUID)(),
    _ts_metadata("design:type", String)
], CreateJobOrderDto.prototype, "itemId", void 0);
_ts_decorate([
    (0, _classvalidator.IsOptional)(),
    (0, _classvalidator.IsUUID)(),
    _ts_metadata("design:type", String)
], CreateJobOrderDto.prototype, "bomId", void 0);
_ts_decorate([
    (0, _classvalidator.IsNotEmpty)(),
    (0, _classvalidator.IsNumber)(),
    _ts_metadata("design:type", Number)
], CreateJobOrderDto.prototype, "quantity", void 0);
_ts_decorate([
    (0, _classvalidator.IsNotEmpty)(),
    (0, _classvalidator.IsDateString)(),
    _ts_metadata("design:type", String)
], CreateJobOrderDto.prototype, "startDate", void 0);
_ts_decorate([
    (0, _classvalidator.IsOptional)(),
    (0, _classvalidator.IsDateString)(),
    _ts_metadata("design:type", String)
], CreateJobOrderDto.prototype, "endDate", void 0);
_ts_decorate([
    (0, _classvalidator.IsOptional)(),
    (0, _classvalidator.IsString)(),
    _ts_metadata("design:type", String)
], CreateJobOrderDto.prototype, "priority", void 0);
_ts_decorate([
    (0, _classvalidator.IsOptional)(),
    (0, _classvalidator.IsString)(),
    _ts_metadata("design:type", String)
], CreateJobOrderDto.prototype, "notes", void 0);
_ts_decorate([
    (0, _classvalidator.IsOptional)(),
    (0, _classvalidator.IsArray)(),
    (0, _classvalidator.ValidateNested)({
        each: true
    }),
    (0, _classtransformer.Type)(()=>JobOrderOperationDto),
    _ts_metadata("design:type", Array)
], CreateJobOrderDto.prototype, "operations", void 0);
_ts_decorate([
    (0, _classvalidator.IsOptional)(),
    (0, _classvalidator.IsArray)(),
    (0, _classvalidator.ValidateNested)({
        each: true
    }),
    (0, _classtransformer.Type)(()=>JobOrderMaterialDto),
    _ts_metadata("design:type", Array)
], CreateJobOrderDto.prototype, "materials", void 0);
let UpdateJobOrderDto = class UpdateJobOrderDto {
};
_ts_decorate([
    (0, _classvalidator.IsOptional)(),
    (0, _classvalidator.IsNumber)(),
    _ts_metadata("design:type", Number)
], UpdateJobOrderDto.prototype, "quantity", void 0);
_ts_decorate([
    (0, _classvalidator.IsOptional)(),
    (0, _classvalidator.IsDateString)(),
    _ts_metadata("design:type", String)
], UpdateJobOrderDto.prototype, "startDate", void 0);
_ts_decorate([
    (0, _classvalidator.IsOptional)(),
    (0, _classvalidator.IsDateString)(),
    _ts_metadata("design:type", String)
], UpdateJobOrderDto.prototype, "endDate", void 0);
_ts_decorate([
    (0, _classvalidator.IsOptional)(),
    (0, _classvalidator.IsString)(),
    _ts_metadata("design:type", String)
], UpdateJobOrderDto.prototype, "priority", void 0);
_ts_decorate([
    (0, _classvalidator.IsOptional)(),
    (0, _classvalidator.IsString)(),
    _ts_metadata("design:type", String)
], UpdateJobOrderDto.prototype, "status", void 0);
_ts_decorate([
    (0, _classvalidator.IsOptional)(),
    (0, _classvalidator.IsString)(),
    _ts_metadata("design:type", String)
], UpdateJobOrderDto.prototype, "notes", void 0);
let UpdateOperationDto = class UpdateOperationDto {
};
_ts_decorate([
    (0, _classvalidator.IsOptional)(),
    (0, _classvalidator.IsUUID)(),
    _ts_metadata("design:type", String)
], UpdateOperationDto.prototype, "assignedUserId", void 0);
_ts_decorate([
    (0, _classvalidator.IsOptional)(),
    (0, _classvalidator.IsDateString)(),
    _ts_metadata("design:type", String)
], UpdateOperationDto.prototype, "startDatetime", void 0);
_ts_decorate([
    (0, _classvalidator.IsOptional)(),
    (0, _classvalidator.IsDateString)(),
    _ts_metadata("design:type", String)
], UpdateOperationDto.prototype, "endDatetime", void 0);
_ts_decorate([
    (0, _classvalidator.IsOptional)(),
    (0, _classvalidator.IsDateString)(),
    _ts_metadata("design:type", String)
], UpdateOperationDto.prototype, "actualStartDatetime", void 0);
_ts_decorate([
    (0, _classvalidator.IsOptional)(),
    (0, _classvalidator.IsDateString)(),
    _ts_metadata("design:type", String)
], UpdateOperationDto.prototype, "actualEndDatetime", void 0);
_ts_decorate([
    (0, _classvalidator.IsOptional)(),
    (0, _classvalidator.IsNumber)(),
    _ts_metadata("design:type", Number)
], UpdateOperationDto.prototype, "completedQuantity", void 0);
_ts_decorate([
    (0, _classvalidator.IsOptional)(),
    (0, _classvalidator.IsNumber)(),
    _ts_metadata("design:type", Number)
], UpdateOperationDto.prototype, "rejectedQuantity", void 0);
_ts_decorate([
    (0, _classvalidator.IsOptional)(),
    (0, _classvalidator.IsString)(),
    _ts_metadata("design:type", String)
], UpdateOperationDto.prototype, "status", void 0);
_ts_decorate([
    (0, _classvalidator.IsOptional)(),
    (0, _classvalidator.IsString)(),
    _ts_metadata("design:type", String)
], UpdateOperationDto.prototype, "notes", void 0);

//# sourceMappingURL=job-order.dto.js.map