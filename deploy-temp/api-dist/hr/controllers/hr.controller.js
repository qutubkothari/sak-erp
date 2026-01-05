"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "HrController", {
    enumerable: true,
    get: function() {
        return HrController;
    }
});
const _common = require("@nestjs/common");
const _hrservice = require("../services/hr.service");
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
let HrController = class HrController {
    // Employee CRUD
    createEmployee(req, body) {
        return this.hrService.createEmployee(req.user.tenantId, body);
    }
    getEmployees(req) {
        return this.hrService.getEmployees(req.user.tenantId);
    }
    getEmployee(req, id) {
        return this.hrService.getEmployee(req.user.tenantId, id);
    }
    updateEmployee(req, id, body) {
        return this.hrService.updateEmployee(req.user.tenantId, id, body);
    }
    deleteEmployee(req, id) {
        return this.hrService.deleteEmployee(req.user.tenantId, id);
    }
    // Attendance
    recordAttendance(req, body) {
        return this.hrService.recordAttendance(req.user.tenantId, body);
    }
    importAttendance(req, body) {
        return this.hrService.importBiometricAttendance(req.user.tenantId, body);
    }
    getAttendance(req, employeeId, month) {
        return this.hrService.getAttendance(req.user.tenantId, employeeId, month);
    }
    updateAttendance(req, id, body) {
        return this.hrService.updateAttendance(req.user.tenantId, id, body);
    }
    deleteAttendance(req, id) {
        return this.hrService.deleteAttendance(req.user.tenantId, id);
    }
    // Leave Requests
    applyLeave(req, body) {
        return this.hrService.applyLeave(req.user.tenantId, body);
    }
    getLeaves(req, employeeId) {
        return this.hrService.getLeaves(req.user.tenantId, employeeId);
    }
    approveLeave(req, id, approverId) {
        return this.hrService.approveLeave(req.user.tenantId, id, approverId);
    }
    rejectLeave(req, id, approverId) {
        return this.hrService.rejectLeave(req.user.tenantId, id, approverId);
    }
    updateLeave(req, id, body) {
        return this.hrService.updateLeave(req.user.tenantId, id, body);
    }
    // Salary Components
    addSalaryComponent(req, body) {
        return this.hrService.addSalaryComponent(req.user.tenantId, body);
    }
    getSalaryComponents(req, employeeId) {
        return this.hrService.getSalaryComponents(req.user.tenantId, employeeId);
    }
    deleteSalaryComponent(req, id) {
        return this.hrService.deleteSalaryComponent(req.user.tenantId, id);
    }
    // Payroll Run
    createPayrollRun(req, body) {
        return this.hrService.createPayrollRun(req.user.tenantId, body);
    }
    getPayrollRuns(req) {
        return this.hrService.getPayrollRuns(req.user.tenantId);
    }
    // Payslip Generation
    async generatePayslips(req, runId) {
        try {
            return await this.hrService.generatePayslip(req.user.tenantId, {
                run_id: runId
            });
        } catch (err) {
            const message = err instanceof Error ? err.message : String(err);
            const stack = err instanceof Error ? err.stack : undefined;
            this.logger.error(`Payslip generation failed (tenantId=${req?.user?.tenantId}, runId=${runId}): ${message}`, stack);
            throw new _common.BadRequestException(`Failed to generate payslips: ${message}`);
        }
    }
    getPayslips(req, employeeId) {
        return this.hrService.getPayslips(req.user.tenantId, employeeId);
    }
    // Monthly Payroll Processing
    createMonthlyPayroll(req, body) {
        return this.hrService.createMonthlyPayroll(req.user.tenantId, body);
    }
    getMonthlyPayrolls(req, month) {
        return this.hrService.getMonthlyPayrolls(req.user.tenantId, month);
    }
    updateMonthlyPayroll(req, id, body) {
        return this.hrService.updateMonthlyPayroll(req.user.tenantId, id, body);
    }
    processMonthlyPayroll(req, id) {
        return this.hrService.processMonthlyPayroll(req.user.tenantId, id);
    }
    deleteMonthlyPayroll(req, id) {
        return this.hrService.deleteMonthlyPayroll(req.user.tenantId, id);
    }
    // Employee Documents
    getEmployeeDocuments(req, employeeId) {
        return this.hrService.getEmployeeDocuments(req.user.tenantId, employeeId);
    }
    addEmployeeDocument(req, employeeId, body) {
        return this.hrService.addEmployeeDocument(req.user.tenantId, employeeId, body);
    }
    deleteEmployeeDocument(req, employeeId, docId) {
        return this.hrService.deleteEmployeeDocument(req.user.tenantId, employeeId, docId);
    }
    // Merits & Demerits
    getMeritsDemerits(req, employeeId) {
        return this.hrService.getMeritsDemerits(req.user.tenantId, employeeId);
    }
    addMeritDemerit(req, employeeId, body) {
        return this.hrService.addMeritDemerit(req.user.tenantId, employeeId, body);
    }
    deleteMeritDemerit(req, employeeId, recordId) {
        return this.hrService.deleteMeritDemerit(req.user.tenantId, employeeId, recordId);
    }
    // KPI Definitions (Master Config)
    getKPIDefinitions(req) {
        return this.hrService.getKPIDefinitions(req.user.tenantId);
    }
    createKPIDefinition(req, body) {
        return this.hrService.createKPIDefinition(req.user.tenantId, body);
    }
    updateKPIDefinition(req, id, body) {
        return this.hrService.updateKPIDefinition(req.user.tenantId, id, body);
    }
    deleteKPIDefinition(req, id) {
        return this.hrService.deleteKPIDefinition(req.user.tenantId, id);
    }
    // Merit/Demerit Types (Master Config)
    getMeritDemeritTypes(req) {
        return this.hrService.getMeritDemeritTypes(req.user.tenantId);
    }
    createMeritDemeritType(req, body) {
        return this.hrService.createMeritDemeritType(req.user.tenantId, body);
    }
    updateMeritDemeritType(req, id, body) {
        return this.hrService.updateMeritDemeritType(req.user.tenantId, id, body);
    }
    deleteMeritDemeritType(req, id) {
        return this.hrService.deleteMeritDemeritType(req.user.tenantId, id);
    }
    constructor(hrService){
        this.hrService = hrService;
        this.logger = new _common.Logger(HrController.name);
    }
};
_ts_decorate([
    (0, _common.Post)('employees'),
    _ts_param(0, (0, _common.Request)()),
    _ts_param(1, (0, _common.Body)()),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        Object,
        Object
    ]),
    _ts_metadata("design:returntype", void 0)
], HrController.prototype, "createEmployee", null);
_ts_decorate([
    (0, _common.Get)('employees'),
    _ts_param(0, (0, _common.Request)()),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        Object
    ]),
    _ts_metadata("design:returntype", void 0)
], HrController.prototype, "getEmployees", null);
_ts_decorate([
    (0, _common.Get)('employees/:id'),
    _ts_param(0, (0, _common.Request)()),
    _ts_param(1, (0, _common.Param)('id')),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        Object,
        String
    ]),
    _ts_metadata("design:returntype", void 0)
], HrController.prototype, "getEmployee", null);
_ts_decorate([
    (0, _common.Put)('employees/:id'),
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
], HrController.prototype, "updateEmployee", null);
_ts_decorate([
    (0, _common.Delete)('employees/:id'),
    _ts_param(0, (0, _common.Request)()),
    _ts_param(1, (0, _common.Param)('id')),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        Object,
        String
    ]),
    _ts_metadata("design:returntype", void 0)
], HrController.prototype, "deleteEmployee", null);
_ts_decorate([
    (0, _common.Post)('attendance'),
    _ts_param(0, (0, _common.Request)()),
    _ts_param(1, (0, _common.Body)()),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        Object,
        Object
    ]),
    _ts_metadata("design:returntype", void 0)
], HrController.prototype, "recordAttendance", null);
_ts_decorate([
    (0, _common.Post)('attendance/import'),
    _ts_param(0, (0, _common.Request)()),
    _ts_param(1, (0, _common.Body)()),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        Object,
        Object
    ]),
    _ts_metadata("design:returntype", void 0)
], HrController.prototype, "importAttendance", null);
_ts_decorate([
    (0, _common.Get)('attendance'),
    _ts_param(0, (0, _common.Request)()),
    _ts_param(1, (0, _common.Query)('employeeId')),
    _ts_param(2, (0, _common.Query)('month')),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        Object,
        String,
        String
    ]),
    _ts_metadata("design:returntype", void 0)
], HrController.prototype, "getAttendance", null);
_ts_decorate([
    (0, _common.Put)('attendance/:id'),
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
], HrController.prototype, "updateAttendance", null);
_ts_decorate([
    (0, _common.Delete)('attendance/:id'),
    _ts_param(0, (0, _common.Request)()),
    _ts_param(1, (0, _common.Param)('id')),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        Object,
        String
    ]),
    _ts_metadata("design:returntype", void 0)
], HrController.prototype, "deleteAttendance", null);
_ts_decorate([
    (0, _common.Post)('leaves'),
    _ts_param(0, (0, _common.Request)()),
    _ts_param(1, (0, _common.Body)()),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        Object,
        Object
    ]),
    _ts_metadata("design:returntype", void 0)
], HrController.prototype, "applyLeave", null);
_ts_decorate([
    (0, _common.Get)('leaves'),
    _ts_param(0, (0, _common.Request)()),
    _ts_param(1, (0, _common.Query)('employeeId')),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        Object,
        String
    ]),
    _ts_metadata("design:returntype", void 0)
], HrController.prototype, "getLeaves", null);
_ts_decorate([
    (0, _common.Put)('leaves/:id/approve'),
    _ts_param(0, (0, _common.Request)()),
    _ts_param(1, (0, _common.Param)('id')),
    _ts_param(2, (0, _common.Body)('approverId')),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        Object,
        String,
        String
    ]),
    _ts_metadata("design:returntype", void 0)
], HrController.prototype, "approveLeave", null);
_ts_decorate([
    (0, _common.Put)('leaves/:id/reject'),
    _ts_param(0, (0, _common.Request)()),
    _ts_param(1, (0, _common.Param)('id')),
    _ts_param(2, (0, _common.Body)('approverId')),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        Object,
        String,
        String
    ]),
    _ts_metadata("design:returntype", void 0)
], HrController.prototype, "rejectLeave", null);
_ts_decorate([
    (0, _common.Put)('leaves/:id'),
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
], HrController.prototype, "updateLeave", null);
_ts_decorate([
    (0, _common.Post)('salary'),
    _ts_param(0, (0, _common.Request)()),
    _ts_param(1, (0, _common.Body)()),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        Object,
        Object
    ]),
    _ts_metadata("design:returntype", void 0)
], HrController.prototype, "addSalaryComponent", null);
_ts_decorate([
    (0, _common.Get)('salary/:employeeId'),
    _ts_param(0, (0, _common.Request)()),
    _ts_param(1, (0, _common.Param)('employeeId')),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        Object,
        String
    ]),
    _ts_metadata("design:returntype", void 0)
], HrController.prototype, "getSalaryComponents", null);
_ts_decorate([
    (0, _common.Delete)('salary/:id'),
    _ts_param(0, (0, _common.Request)()),
    _ts_param(1, (0, _common.Param)('id')),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        Object,
        String
    ]),
    _ts_metadata("design:returntype", void 0)
], HrController.prototype, "deleteSalaryComponent", null);
_ts_decorate([
    (0, _common.Post)('payroll/run'),
    _ts_param(0, (0, _common.Request)()),
    _ts_param(1, (0, _common.Body)()),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        Object,
        Object
    ]),
    _ts_metadata("design:returntype", void 0)
], HrController.prototype, "createPayrollRun", null);
_ts_decorate([
    (0, _common.Get)('payroll/runs'),
    _ts_param(0, (0, _common.Request)()),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        Object
    ]),
    _ts_metadata("design:returntype", void 0)
], HrController.prototype, "getPayrollRuns", null);
_ts_decorate([
    (0, _common.Post)('payroll/run/:runId/generate'),
    _ts_param(0, (0, _common.Request)()),
    _ts_param(1, (0, _common.Param)('runId')),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        Object,
        String
    ]),
    _ts_metadata("design:returntype", Promise)
], HrController.prototype, "generatePayslips", null);
_ts_decorate([
    (0, _common.Get)('payroll/payslips'),
    _ts_param(0, (0, _common.Request)()),
    _ts_param(1, (0, _common.Query)('employeeId')),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        Object,
        String
    ]),
    _ts_metadata("design:returntype", void 0)
], HrController.prototype, "getPayslips", null);
_ts_decorate([
    (0, _common.Post)('payroll/monthly'),
    _ts_param(0, (0, _common.Request)()),
    _ts_param(1, (0, _common.Body)()),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        Object,
        Object
    ]),
    _ts_metadata("design:returntype", void 0)
], HrController.prototype, "createMonthlyPayroll", null);
_ts_decorate([
    (0, _common.Get)('payroll/monthly'),
    _ts_param(0, (0, _common.Request)()),
    _ts_param(1, (0, _common.Query)('month')),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        Object,
        String
    ]),
    _ts_metadata("design:returntype", void 0)
], HrController.prototype, "getMonthlyPayrolls", null);
_ts_decorate([
    (0, _common.Put)('payroll/monthly/:id'),
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
], HrController.prototype, "updateMonthlyPayroll", null);
_ts_decorate([
    (0, _common.Put)('payroll/monthly/:id/process'),
    _ts_param(0, (0, _common.Request)()),
    _ts_param(1, (0, _common.Param)('id')),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        Object,
        String
    ]),
    _ts_metadata("design:returntype", void 0)
], HrController.prototype, "processMonthlyPayroll", null);
_ts_decorate([
    (0, _common.Delete)('payroll/monthly/:id'),
    _ts_param(0, (0, _common.Request)()),
    _ts_param(1, (0, _common.Param)('id')),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        Object,
        String
    ]),
    _ts_metadata("design:returntype", void 0)
], HrController.prototype, "deleteMonthlyPayroll", null);
_ts_decorate([
    (0, _common.Get)('employees/:id/documents'),
    _ts_param(0, (0, _common.Request)()),
    _ts_param(1, (0, _common.Param)('id')),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        Object,
        String
    ]),
    _ts_metadata("design:returntype", void 0)
], HrController.prototype, "getEmployeeDocuments", null);
_ts_decorate([
    (0, _common.Post)('employees/:id/documents'),
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
], HrController.prototype, "addEmployeeDocument", null);
_ts_decorate([
    (0, _common.Delete)('employees/:id/documents/:docId'),
    _ts_param(0, (0, _common.Request)()),
    _ts_param(1, (0, _common.Param)('id')),
    _ts_param(2, (0, _common.Param)('docId')),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        Object,
        String,
        String
    ]),
    _ts_metadata("design:returntype", void 0)
], HrController.prototype, "deleteEmployeeDocument", null);
_ts_decorate([
    (0, _common.Get)('employees/:id/merits-demerits'),
    _ts_param(0, (0, _common.Request)()),
    _ts_param(1, (0, _common.Param)('id')),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        Object,
        String
    ]),
    _ts_metadata("design:returntype", void 0)
], HrController.prototype, "getMeritsDemerits", null);
_ts_decorate([
    (0, _common.Post)('employees/:id/merits-demerits'),
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
], HrController.prototype, "addMeritDemerit", null);
_ts_decorate([
    (0, _common.Delete)('employees/:id/merits-demerits/:recordId'),
    _ts_param(0, (0, _common.Request)()),
    _ts_param(1, (0, _common.Param)('id')),
    _ts_param(2, (0, _common.Param)('recordId')),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        Object,
        String,
        String
    ]),
    _ts_metadata("design:returntype", void 0)
], HrController.prototype, "deleteMeritDemerit", null);
_ts_decorate([
    (0, _common.Get)('kpi-definitions'),
    _ts_param(0, (0, _common.Request)()),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        Object
    ]),
    _ts_metadata("design:returntype", void 0)
], HrController.prototype, "getKPIDefinitions", null);
_ts_decorate([
    (0, _common.Post)('kpi-definitions'),
    _ts_param(0, (0, _common.Request)()),
    _ts_param(1, (0, _common.Body)()),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        Object,
        Object
    ]),
    _ts_metadata("design:returntype", void 0)
], HrController.prototype, "createKPIDefinition", null);
_ts_decorate([
    (0, _common.Put)('kpi-definitions/:id'),
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
], HrController.prototype, "updateKPIDefinition", null);
_ts_decorate([
    (0, _common.Delete)('kpi-definitions/:id'),
    _ts_param(0, (0, _common.Request)()),
    _ts_param(1, (0, _common.Param)('id')),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        Object,
        String
    ]),
    _ts_metadata("design:returntype", void 0)
], HrController.prototype, "deleteKPIDefinition", null);
_ts_decorate([
    (0, _common.Get)('merit-demerit-types'),
    _ts_param(0, (0, _common.Request)()),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        Object
    ]),
    _ts_metadata("design:returntype", void 0)
], HrController.prototype, "getMeritDemeritTypes", null);
_ts_decorate([
    (0, _common.Post)('merit-demerit-types'),
    _ts_param(0, (0, _common.Request)()),
    _ts_param(1, (0, _common.Body)()),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        Object,
        Object
    ]),
    _ts_metadata("design:returntype", void 0)
], HrController.prototype, "createMeritDemeritType", null);
_ts_decorate([
    (0, _common.Put)('merit-demerit-types/:id'),
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
], HrController.prototype, "updateMeritDemeritType", null);
_ts_decorate([
    (0, _common.Delete)('merit-demerit-types/:id'),
    _ts_param(0, (0, _common.Request)()),
    _ts_param(1, (0, _common.Param)('id')),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        Object,
        String
    ]),
    _ts_metadata("design:returntype", void 0)
], HrController.prototype, "deleteMeritDemeritType", null);
HrController = _ts_decorate([
    (0, _common.Controller)('hr'),
    (0, _common.UseGuards)(_jwtauthguard.JwtAuthGuard),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        typeof _hrservice.HrService === "undefined" ? Object : _hrservice.HrService
    ])
], HrController);

//# sourceMappingURL=hr.controller.js.map