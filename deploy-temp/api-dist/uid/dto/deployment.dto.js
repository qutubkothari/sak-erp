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
    get CreateDeploymentDto () {
        return CreateDeploymentDto;
    },
    get DeploymentLevel () {
        return DeploymentLevel;
    },
    get PublicDeploymentUpdateDto () {
        return PublicDeploymentUpdateDto;
    },
    get UpdateDeploymentDto () {
        return UpdateDeploymentDto;
    },
    get UpdatePartNumberDto () {
        return UpdatePartNumberDto;
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
var DeploymentLevel = /*#__PURE__*/ function(DeploymentLevel) {
    DeploymentLevel["CUSTOMER"] = "CUSTOMER";
    DeploymentLevel["DEPOT"] = "DEPOT";
    DeploymentLevel["END_LOCATION"] = "END_LOCATION";
    DeploymentLevel["SERVICE_CENTER"] = "SERVICE_CENTER";
    DeploymentLevel["RETURNED"] = "RETURNED";
    return DeploymentLevel;
}({});
let CreateDeploymentDto = class CreateDeploymentDto {
};
_ts_decorate([
    (0, _classvalidator.IsNotEmpty)(),
    (0, _classvalidator.IsUUID)(),
    _ts_metadata("design:type", String)
], CreateDeploymentDto.prototype, "uid_id", void 0);
_ts_decorate([
    (0, _classvalidator.IsNotEmpty)(),
    (0, _classvalidator.IsString)(),
    _ts_metadata("design:type", String)
], CreateDeploymentDto.prototype, "deployment_level", void 0);
_ts_decorate([
    (0, _classvalidator.IsNotEmpty)(),
    (0, _classvalidator.IsString)(),
    _ts_metadata("design:type", String)
], CreateDeploymentDto.prototype, "organization_name", void 0);
_ts_decorate([
    (0, _classvalidator.IsNotEmpty)(),
    (0, _classvalidator.IsString)(),
    _ts_metadata("design:type", String)
], CreateDeploymentDto.prototype, "location_name", void 0);
_ts_decorate([
    (0, _classvalidator.IsNotEmpty)(),
    (0, _classvalidator.IsDateString)(),
    _ts_metadata("design:type", String)
], CreateDeploymentDto.prototype, "deployment_date", void 0);
_ts_decorate([
    (0, _classvalidator.IsOptional)(),
    (0, _classvalidator.IsUUID)(),
    _ts_metadata("design:type", String)
], CreateDeploymentDto.prototype, "parent_deployment_id", void 0);
_ts_decorate([
    (0, _classvalidator.IsOptional)(),
    (0, _classvalidator.IsString)(),
    _ts_metadata("design:type", String)
], CreateDeploymentDto.prototype, "contact_person", void 0);
_ts_decorate([
    (0, _classvalidator.IsOptional)(),
    (0, _classvalidator.IsEmail)(),
    _ts_metadata("design:type", String)
], CreateDeploymentDto.prototype, "contact_email", void 0);
_ts_decorate([
    (0, _classvalidator.IsOptional)(),
    (0, _classvalidator.IsString)(),
    _ts_metadata("design:type", String)
], CreateDeploymentDto.prototype, "contact_phone", void 0);
_ts_decorate([
    (0, _classvalidator.IsOptional)(),
    (0, _classvalidator.IsString)(),
    _ts_metadata("design:type", String)
], CreateDeploymentDto.prototype, "deployment_notes", void 0);
_ts_decorate([
    (0, _classvalidator.IsOptional)(),
    (0, _classvalidator.IsDateString)(),
    _ts_metadata("design:type", String)
], CreateDeploymentDto.prototype, "warranty_expiry_date", void 0);
_ts_decorate([
    (0, _classvalidator.IsOptional)(),
    (0, _classvalidator.IsString)(),
    _ts_metadata("design:type", String)
], CreateDeploymentDto.prototype, "maintenance_schedule", void 0);
_ts_decorate([
    (0, _classvalidator.IsOptional)(),
    (0, _classvalidator.IsBoolean)(),
    _ts_metadata("design:type", Boolean)
], CreateDeploymentDto.prototype, "is_current_location", void 0);
let UpdateDeploymentDto = class UpdateDeploymentDto {
};
_ts_decorate([
    (0, _classvalidator.IsOptional)(),
    (0, _classvalidator.IsString)(),
    _ts_metadata("design:type", String)
], UpdateDeploymentDto.prototype, "organization_name", void 0);
_ts_decorate([
    (0, _classvalidator.IsOptional)(),
    (0, _classvalidator.IsString)(),
    _ts_metadata("design:type", String)
], UpdateDeploymentDto.prototype, "location_name", void 0);
_ts_decorate([
    (0, _classvalidator.IsOptional)(),
    (0, _classvalidator.IsDateString)(),
    _ts_metadata("design:type", String)
], UpdateDeploymentDto.prototype, "deployment_date", void 0);
_ts_decorate([
    (0, _classvalidator.IsOptional)(),
    (0, _classvalidator.IsString)(),
    _ts_metadata("design:type", String)
], UpdateDeploymentDto.prototype, "contact_person", void 0);
_ts_decorate([
    (0, _classvalidator.IsOptional)(),
    (0, _classvalidator.IsEmail)(),
    _ts_metadata("design:type", String)
], UpdateDeploymentDto.prototype, "contact_email", void 0);
_ts_decorate([
    (0, _classvalidator.IsOptional)(),
    (0, _classvalidator.IsString)(),
    _ts_metadata("design:type", String)
], UpdateDeploymentDto.prototype, "contact_phone", void 0);
_ts_decorate([
    (0, _classvalidator.IsOptional)(),
    (0, _classvalidator.IsString)(),
    _ts_metadata("design:type", String)
], UpdateDeploymentDto.prototype, "deployment_notes", void 0);
_ts_decorate([
    (0, _classvalidator.IsOptional)(),
    (0, _classvalidator.IsDateString)(),
    _ts_metadata("design:type", String)
], UpdateDeploymentDto.prototype, "warranty_expiry_date", void 0);
_ts_decorate([
    (0, _classvalidator.IsOptional)(),
    (0, _classvalidator.IsString)(),
    _ts_metadata("design:type", String)
], UpdateDeploymentDto.prototype, "maintenance_schedule", void 0);
_ts_decorate([
    (0, _classvalidator.IsOptional)(),
    (0, _classvalidator.IsBoolean)(),
    _ts_metadata("design:type", Boolean)
], UpdateDeploymentDto.prototype, "is_current_location", void 0);
let UpdatePartNumberDto = class UpdatePartNumberDto {
};
_ts_decorate([
    (0, _classvalidator.IsNotEmpty)(),
    (0, _classvalidator.IsString)(),
    _ts_metadata("design:type", String)
], UpdatePartNumberDto.prototype, "client_part_number", void 0);
let PublicDeploymentUpdateDto = class PublicDeploymentUpdateDto {
};
_ts_decorate([
    (0, _classvalidator.IsNotEmpty)(),
    (0, _classvalidator.IsString)(),
    _ts_metadata("design:type", String)
], PublicDeploymentUpdateDto.prototype, "organization_name", void 0);
_ts_decorate([
    (0, _classvalidator.IsNotEmpty)(),
    (0, _classvalidator.IsString)(),
    _ts_metadata("design:type", String)
], PublicDeploymentUpdateDto.prototype, "location_name", void 0);
_ts_decorate([
    (0, _classvalidator.IsOptional)(),
    (0, _classvalidator.IsString)(),
    _ts_metadata("design:type", String)
], PublicDeploymentUpdateDto.prototype, "deployment_notes", void 0);
_ts_decorate([
    (0, _classvalidator.IsNotEmpty)(),
    (0, _classvalidator.IsEmail)(),
    _ts_metadata("design:type", String)
], PublicDeploymentUpdateDto.prototype, "verification_email", void 0);

//# sourceMappingURL=deployment.dto.js.map