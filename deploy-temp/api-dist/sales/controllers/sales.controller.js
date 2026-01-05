"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "SalesController", {
    enumerable: true,
    get: function() {
        return SalesController;
    }
});
const _common = require("@nestjs/common");
const _salesservice = require("../services/sales.service");
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
let SalesController = class SalesController {
    // ==================== CUSTOMERS ====================
    async getCustomers(req, filters) {
        return this.salesService.getCustomers(req, filters);
    }
    async createCustomer(req, customerData) {
        return this.salesService.createCustomer(req, customerData);
    }
    async updateCustomer(req, customerId, customerData) {
        return this.salesService.updateCustomer(req, customerId, customerData);
    }
    async deleteCustomer(req, customerId) {
        return this.salesService.deleteCustomer(req, customerId);
    }
    // ==================== QUOTATIONS ====================
    async getQuotations(req, filters) {
        return this.salesService.getQuotations(req, filters);
    }
    async getQuotationById(req, quotationId) {
        return this.salesService.getQuotationById(req, quotationId);
    }
    async createQuotation(req, quotationData) {
        return this.salesService.createQuotation(req, quotationData);
    }
    async updateQuotation(req, quotationId, quotationData) {
        return this.salesService.updateQuotation(req, quotationId, quotationData);
    }
    async approveQuotation(req, quotationId) {
        return this.salesService.approveQuotation(req, quotationId);
    }
    async deleteQuotation(req, quotationId) {
        return this.salesService.deleteQuotation(req, quotationId);
    }
    async convertQuotationToSO(req, quotationId, conversionData) {
        return this.salesService.convertQuotationToSO(req, quotationId, conversionData);
    }
    // ==================== SALES ORDERS ====================
    async getSalesOrders(req, filters) {
        return this.salesService.getSalesOrders(req, filters);
    }
    async getSalesOrderById(req, soId) {
        return this.salesService.getSalesOrderById(req, soId);
    }
    async updateSalesOrder(req, soId, soData) {
        return this.salesService.updateSalesOrder(req, soId, soData);
    }
    async deleteSalesOrder(req, soId) {
        return this.salesService.deleteSalesOrder(req, soId);
    }
    async sendSalesOrderEmail(req, soId) {
        return this.salesService.sendSalesOrderEmail(req, soId);
    }
    // ==================== DISPATCH ====================
    async getDispatchNotes(req, filters) {
        return this.salesService.getDispatchNotes(req, filters);
    }
    async createDispatch(req, dispatchData) {
        return this.salesService.createDispatch(req, dispatchData);
    }
    async updateDispatch(req, dispatchId, dispatchData) {
        return this.salesService.updateDispatch(req, dispatchId, dispatchData);
    }
    async deleteDispatch(req, dispatchId) {
        return this.salesService.deleteDispatch(req, dispatchId);
    }
    // ==================== WARRANTY ====================
    async createWarranty(req, warrantyData) {
        return this.salesService.createWarranty(req, warrantyData);
    }
    async getWarranties(req, filters) {
        return this.salesService.getWarranties(req, filters);
    }
    async getWarrantyById(req, warrantyId) {
        return this.salesService.getWarrantyById(req, warrantyId);
    }
    async validateWarranty(req, uid) {
        return this.salesService.validateWarranty(req, uid);
    }
    async updateWarranty(req, warrantyId, warrantyData) {
        return this.salesService.updateWarranty(req, warrantyId, warrantyData);
    }
    async deleteWarranty(req, warrantyId) {
        return this.salesService.deleteWarranty(req, warrantyId);
    }
    constructor(salesService){
        this.salesService = salesService;
    }
};
_ts_decorate([
    (0, _common.Get)('customers'),
    _ts_param(0, (0, _common.Request)()),
    _ts_param(1, (0, _common.Query)()),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        Object,
        Object
    ]),
    _ts_metadata("design:returntype", Promise)
], SalesController.prototype, "getCustomers", null);
_ts_decorate([
    (0, _common.Post)('customers'),
    _ts_param(0, (0, _common.Request)()),
    _ts_param(1, (0, _common.Body)()),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        Object,
        Object
    ]),
    _ts_metadata("design:returntype", Promise)
], SalesController.prototype, "createCustomer", null);
_ts_decorate([
    (0, _common.Put)('customers/:id'),
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
], SalesController.prototype, "updateCustomer", null);
_ts_decorate([
    (0, _common.Delete)('customers/:id'),
    _ts_param(0, (0, _common.Request)()),
    _ts_param(1, (0, _common.Param)('id')),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        Object,
        String
    ]),
    _ts_metadata("design:returntype", Promise)
], SalesController.prototype, "deleteCustomer", null);
_ts_decorate([
    (0, _common.Get)('quotations'),
    _ts_param(0, (0, _common.Request)()),
    _ts_param(1, (0, _common.Query)()),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        Object,
        Object
    ]),
    _ts_metadata("design:returntype", Promise)
], SalesController.prototype, "getQuotations", null);
_ts_decorate([
    (0, _common.Get)('quotations/:id'),
    _ts_param(0, (0, _common.Request)()),
    _ts_param(1, (0, _common.Param)('id')),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        Object,
        String
    ]),
    _ts_metadata("design:returntype", Promise)
], SalesController.prototype, "getQuotationById", null);
_ts_decorate([
    (0, _common.Post)('quotations'),
    _ts_param(0, (0, _common.Request)()),
    _ts_param(1, (0, _common.Body)()),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        Object,
        Object
    ]),
    _ts_metadata("design:returntype", Promise)
], SalesController.prototype, "createQuotation", null);
_ts_decorate([
    (0, _common.Put)('quotations/:id'),
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
], SalesController.prototype, "updateQuotation", null);
_ts_decorate([
    (0, _common.Put)('quotations/:id/approve'),
    _ts_param(0, (0, _common.Request)()),
    _ts_param(1, (0, _common.Param)('id')),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        Object,
        String
    ]),
    _ts_metadata("design:returntype", Promise)
], SalesController.prototype, "approveQuotation", null);
_ts_decorate([
    (0, _common.Delete)('quotations/:id'),
    _ts_param(0, (0, _common.Request)()),
    _ts_param(1, (0, _common.Param)('id')),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        Object,
        String
    ]),
    _ts_metadata("design:returntype", Promise)
], SalesController.prototype, "deleteQuotation", null);
_ts_decorate([
    (0, _common.Post)('quotations/:id/convert-to-so'),
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
], SalesController.prototype, "convertQuotationToSO", null);
_ts_decorate([
    (0, _common.Get)('orders'),
    _ts_param(0, (0, _common.Request)()),
    _ts_param(1, (0, _common.Query)()),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        Object,
        Object
    ]),
    _ts_metadata("design:returntype", Promise)
], SalesController.prototype, "getSalesOrders", null);
_ts_decorate([
    (0, _common.Get)('orders/:id'),
    _ts_param(0, (0, _common.Request)()),
    _ts_param(1, (0, _common.Param)('id')),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        Object,
        String
    ]),
    _ts_metadata("design:returntype", Promise)
], SalesController.prototype, "getSalesOrderById", null);
_ts_decorate([
    (0, _common.Put)('orders/:id'),
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
], SalesController.prototype, "updateSalesOrder", null);
_ts_decorate([
    (0, _common.Delete)('orders/:id'),
    _ts_param(0, (0, _common.Request)()),
    _ts_param(1, (0, _common.Param)('id')),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        Object,
        String
    ]),
    _ts_metadata("design:returntype", Promise)
], SalesController.prototype, "deleteSalesOrder", null);
_ts_decorate([
    (0, _common.Post)('orders/:id/send-email'),
    _ts_param(0, (0, _common.Request)()),
    _ts_param(1, (0, _common.Param)('id')),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        Object,
        String
    ]),
    _ts_metadata("design:returntype", Promise)
], SalesController.prototype, "sendSalesOrderEmail", null);
_ts_decorate([
    (0, _common.Get)('dispatch'),
    _ts_param(0, (0, _common.Request)()),
    _ts_param(1, (0, _common.Query)()),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        Object,
        Object
    ]),
    _ts_metadata("design:returntype", Promise)
], SalesController.prototype, "getDispatchNotes", null);
_ts_decorate([
    (0, _common.Post)('dispatch'),
    _ts_param(0, (0, _common.Request)()),
    _ts_param(1, (0, _common.Body)()),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        Object,
        Object
    ]),
    _ts_metadata("design:returntype", Promise)
], SalesController.prototype, "createDispatch", null);
_ts_decorate([
    (0, _common.Put)('dispatch/:id'),
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
], SalesController.prototype, "updateDispatch", null);
_ts_decorate([
    (0, _common.Delete)('dispatch/:id'),
    _ts_param(0, (0, _common.Request)()),
    _ts_param(1, (0, _common.Param)('id')),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        Object,
        String
    ]),
    _ts_metadata("design:returntype", Promise)
], SalesController.prototype, "deleteDispatch", null);
_ts_decorate([
    (0, _common.Post)('warranties'),
    _ts_param(0, (0, _common.Request)()),
    _ts_param(1, (0, _common.Body)()),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        Object,
        Object
    ]),
    _ts_metadata("design:returntype", Promise)
], SalesController.prototype, "createWarranty", null);
_ts_decorate([
    (0, _common.Get)('warranties'),
    _ts_param(0, (0, _common.Request)()),
    _ts_param(1, (0, _common.Query)()),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        Object,
        Object
    ]),
    _ts_metadata("design:returntype", Promise)
], SalesController.prototype, "getWarranties", null);
_ts_decorate([
    (0, _common.Get)('warranties/:id'),
    _ts_param(0, (0, _common.Request)()),
    _ts_param(1, (0, _common.Param)('id')),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        Object,
        String
    ]),
    _ts_metadata("design:returntype", Promise)
], SalesController.prototype, "getWarrantyById", null);
_ts_decorate([
    (0, _common.Get)('warranties/validate/:uid'),
    _ts_param(0, (0, _common.Request)()),
    _ts_param(1, (0, _common.Param)('uid')),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        Object,
        String
    ]),
    _ts_metadata("design:returntype", Promise)
], SalesController.prototype, "validateWarranty", null);
_ts_decorate([
    (0, _common.Put)('warranties/:id'),
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
], SalesController.prototype, "updateWarranty", null);
_ts_decorate([
    (0, _common.Delete)('warranties/:id'),
    _ts_param(0, (0, _common.Request)()),
    _ts_param(1, (0, _common.Param)('id')),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        Object,
        String
    ]),
    _ts_metadata("design:returntype", Promise)
], SalesController.prototype, "deleteWarranty", null);
SalesController = _ts_decorate([
    (0, _common.Controller)('sales'),
    (0, _common.UseGuards)(_jwtauthguard.JwtAuthGuard),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        typeof _salesservice.SalesService === "undefined" ? Object : _salesservice.SalesService
    ])
], SalesController);

//# sourceMappingURL=sales.controller.js.map