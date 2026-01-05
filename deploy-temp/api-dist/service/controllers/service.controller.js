"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "ServiceController", {
    enumerable: true,
    get: function() {
        return ServiceController;
    }
});
const _common = require("@nestjs/common");
const _platformexpress = require("@nestjs/platform-express");
const _multer = require("multer");
const _serviceservice = require("../services/service.service");
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
let ServiceController = class ServiceController {
    // ==================== Service Tickets ====================
    async createServiceTicket(req, body) {
        return this.serviceService.createServiceTicket(req.user.tenantId, req.user.userId, body);
    }
    async uploadServiceAttachments(req, files) {
        const urls = await this.serviceService.uploadServiceAttachments(req.user.tenantId, req.user.userId, files);
        return {
            urls
        };
    }
    async getServiceTickets(req, query) {
        return this.serviceService.getServiceTickets(req.user.tenantId, query);
    }
    async getServiceTicketById(req, id) {
        return this.serviceService.getServiceTicketById(req.user.tenantId, id);
    }
    async updateServiceTicket(req, id, body) {
        return this.serviceService.updateServiceTicket(req.user.tenantId, id, body);
    }
    async closeServiceTicket(req, id, body) {
        return this.serviceService.closeServiceTicket(req.user.tenantId, id, req.user.userId, body);
    }
    // ==================== Warranty Validation ====================
    async validateWarranty(req, uid) {
        return this.serviceService.validateWarrantyForUID(req.user.tenantId, uid);
    }
    // ==================== Technicians ====================
    async createTechnician(req, body) {
        return this.serviceService.createTechnician(req.user.tenantId, body);
    }
    async getTechnicians(req, activeOnly) {
        return this.serviceService.getTechnicians(req.user.tenantId, activeOnly !== 'false');
    }
    // ==================== Service Assignments ====================
    async assignTechnician(req, body) {
        return this.serviceService.assignTechnician(req.user.tenantId, req.user.userId, body);
    }
    async getAssignmentsByTechnician(technicianId, status) {
        return this.serviceService.getAssignmentsByTechnician(technicianId, status);
    }
    async updateAssignment(id, body) {
        return this.serviceService.updateAssignment(id, body);
    }
    // ==================== Service Parts Used ====================
    async addServicePart(req, body) {
        return this.serviceService.addServicePart(req.user.tenantId, body);
    }
    async getServicePartsByTicket(ticketId) {
        return this.serviceService.getServicePartsByTicket(ticketId);
    }
    // ==================== Service History ====================
    async getServiceHistoryByUID(req, uid) {
        return this.serviceService.getServiceHistoryByUID(req.user.tenantId, uid);
    }
    // ==================== Reports ====================
    async getServiceReports(req, query) {
        return this.serviceService.getServiceReports(req.user.tenantId, query);
    }
    constructor(serviceService){
        this.serviceService = serviceService;
    }
};
_ts_decorate([
    (0, _common.Post)('tickets'),
    _ts_param(0, (0, _common.Request)()),
    _ts_param(1, (0, _common.Body)()),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        Object,
        Object
    ]),
    _ts_metadata("design:returntype", Promise)
], ServiceController.prototype, "createServiceTicket", null);
_ts_decorate([
    (0, _common.Post)('uploads'),
    (0, _common.UseInterceptors)((0, _platformexpress.FilesInterceptor)('files', 10, {
        storage: (0, _multer.memoryStorage)(),
        limits: {
            fileSize: 50 * 1024 * 1024
        }
    })),
    _ts_param(0, (0, _common.Request)()),
    _ts_param(1, (0, _common.UploadedFiles)()),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        Object,
        typeof Array === "undefined" ? Object : Array
    ]),
    _ts_metadata("design:returntype", Promise)
], ServiceController.prototype, "uploadServiceAttachments", null);
_ts_decorate([
    (0, _common.Get)('tickets'),
    _ts_param(0, (0, _common.Request)()),
    _ts_param(1, (0, _common.Query)()),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        Object,
        Object
    ]),
    _ts_metadata("design:returntype", Promise)
], ServiceController.prototype, "getServiceTickets", null);
_ts_decorate([
    (0, _common.Get)('tickets/:id'),
    _ts_param(0, (0, _common.Request)()),
    _ts_param(1, (0, _common.Param)('id')),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        Object,
        String
    ]),
    _ts_metadata("design:returntype", Promise)
], ServiceController.prototype, "getServiceTicketById", null);
_ts_decorate([
    (0, _common.Put)('tickets/:id'),
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
], ServiceController.prototype, "updateServiceTicket", null);
_ts_decorate([
    (0, _common.Post)('tickets/:id/close'),
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
], ServiceController.prototype, "closeServiceTicket", null);
_ts_decorate([
    (0, _common.Get)('warranty/validate/:uid'),
    _ts_param(0, (0, _common.Request)()),
    _ts_param(1, (0, _common.Param)('uid')),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        Object,
        String
    ]),
    _ts_metadata("design:returntype", Promise)
], ServiceController.prototype, "validateWarranty", null);
_ts_decorate([
    (0, _common.Post)('technicians'),
    _ts_param(0, (0, _common.Request)()),
    _ts_param(1, (0, _common.Body)()),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        Object,
        Object
    ]),
    _ts_metadata("design:returntype", Promise)
], ServiceController.prototype, "createTechnician", null);
_ts_decorate([
    (0, _common.Get)('technicians'),
    _ts_param(0, (0, _common.Request)()),
    _ts_param(1, (0, _common.Query)('active_only')),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        Object,
        String
    ]),
    _ts_metadata("design:returntype", Promise)
], ServiceController.prototype, "getTechnicians", null);
_ts_decorate([
    (0, _common.Post)('assignments'),
    _ts_param(0, (0, _common.Request)()),
    _ts_param(1, (0, _common.Body)()),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        Object,
        Object
    ]),
    _ts_metadata("design:returntype", Promise)
], ServiceController.prototype, "assignTechnician", null);
_ts_decorate([
    (0, _common.Get)('assignments/technician/:technicianId'),
    _ts_param(0, (0, _common.Param)('technicianId')),
    _ts_param(1, (0, _common.Query)('status')),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        String,
        String
    ]),
    _ts_metadata("design:returntype", Promise)
], ServiceController.prototype, "getAssignmentsByTechnician", null);
_ts_decorate([
    (0, _common.Put)('assignments/:id'),
    _ts_param(0, (0, _common.Param)('id')),
    _ts_param(1, (0, _common.Body)()),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        String,
        Object
    ]),
    _ts_metadata("design:returntype", Promise)
], ServiceController.prototype, "updateAssignment", null);
_ts_decorate([
    (0, _common.Post)('parts'),
    _ts_param(0, (0, _common.Request)()),
    _ts_param(1, (0, _common.Body)()),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        Object,
        Object
    ]),
    _ts_metadata("design:returntype", Promise)
], ServiceController.prototype, "addServicePart", null);
_ts_decorate([
    (0, _common.Get)('parts/ticket/:ticketId'),
    _ts_param(0, (0, _common.Param)('ticketId')),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        String
    ]),
    _ts_metadata("design:returntype", Promise)
], ServiceController.prototype, "getServicePartsByTicket", null);
_ts_decorate([
    (0, _common.Get)('history/:uid'),
    _ts_param(0, (0, _common.Request)()),
    _ts_param(1, (0, _common.Param)('uid')),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        Object,
        String
    ]),
    _ts_metadata("design:returntype", Promise)
], ServiceController.prototype, "getServiceHistoryByUID", null);
_ts_decorate([
    (0, _common.Get)('reports'),
    _ts_param(0, (0, _common.Request)()),
    _ts_param(1, (0, _common.Query)()),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        Object,
        Object
    ]),
    _ts_metadata("design:returntype", Promise)
], ServiceController.prototype, "getServiceReports", null);
ServiceController = _ts_decorate([
    (0, _common.Controller)('service'),
    (0, _common.UseGuards)(_jwtauthguard.JwtAuthGuard),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        typeof _serviceservice.ServiceService === "undefined" ? Object : _serviceservice.ServiceService
    ])
], ServiceController);

//# sourceMappingURL=service.controller.js.map