import {
  BadRequestException,
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  Request,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  Logger,
  Res,
} from "@nestjs/common";
import type { Response } from "express";
import { HrService } from "../services/hr.service";
import { HrAttendanceControlService } from "../services/hr-attendance-control.service";
import { JwtAuthGuard } from "../../auth/guards/jwt-auth.guard";
import { PermissionsGuard } from "../../auth/guards/permissions.guard";
import {
  RequireApprove,
  RequireDelete,
  RequireCreate,
  RequireRead,
  RequireUpdate,
  RequirePermissions,
} from "../../auth/decorators/permissions.decorator";
import { hasSuperAdminBypass } from "../../auth/utils/permission-utils";
import { FileInterceptor } from "@nestjs/platform-express";
import { memoryStorage } from "multer";
import { HrHistoricalAttendanceImportService } from "../services/hr-historical-attendance-import.service";

@Controller("hr")
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class HrController {
  private readonly logger = new Logger(HrController.name);

  constructor(
    private readonly hrService: HrService,
    private readonly attendanceControl: HrAttendanceControlService,
    private readonly historicalImport: HrHistoricalAttendanceImportService,
  ) {}

  // Employee CRUD
  @Post("employees")
  @RequireCreate("hr")
  createEmployee(@Request() req: any, @Body() body: any) {
    return this.hrService.createEmployee(req.user.tenantId, body);
  }
  @Get("employees")
  getEmployees(@Request() req: any) {
    return this.hrService.getEmployees(req.user.tenantId);
  }
  @Get("employees/:id")
  getEmployee(@Request() req: any, @Param("id") id: string) {
    return this.hrService.getEmployee(req.user.tenantId, id);
  }
  @Put("employees/:id")
  @RequireUpdate("hr")
  updateEmployee(
    @Request() req: any,
    @Param("id") id: string,
    @Body() body: any,
  ) {
    return this.hrService.updateEmployee(req.user.tenantId, id, body);
  }
  @Delete("employees/:id")
  @RequireDelete("hr")
  deleteEmployee(@Request() req: any, @Param("id") id: string) {
    return this.hrService.deleteEmployee(req.user.tenantId, id);
  }

  // Attendance with Geo-tagging
  @Post("attendance/check-in")
  async checkIn(
    @Request() req: any,
    @Body()
    body: {
      lat?: number;
      lng?: number;
      accuracy?: number | null;
      location?: string;
      photoUrl?: string;
      notes?: string;
      isOutsideZone?: boolean;
      outsideZoneReason?: string;
    },
  ) {
    try {
      this.logger.log(
        `Check-in attempt by user: ${req.user.userId}, tenant: ${req.user.tenantId}`,
      );
      const employee = await this.hrService.getEmployeeByUserId(
        req.user.tenantId,
        req.user.userId,
      );
      if (!employee) {
        this.logger.error(`Employee not found for user: ${req.user.userId}`);
        throw new BadRequestException("Employee record not found");
      }
      this.logger.log(`Found employee: ${employee.id} for check-in`);
      return await this.hrService.checkIn(
        req.user.tenantId,
        req.user.userId,
        employee.id,
        body,
        {
          skipOutsideEvidence: hasSuperAdminBypass(req.user),
          employee,
        },
      );
    } catch (error) {
      this.logger.error(`Check-in error: ${error.message}`, error.stack);
      throw error;
    }
  }

  @Post("attendance/check-out")
  checkOut(
    @Request() req: any,
    @Body()
    body: {
      lat?: number;
      lng?: number;
      accuracy?: number | null;
      location?: string;
      photoUrl?: string;
      notes?: string;
      isOutsideZone?: boolean;
      endDay?: boolean;
    },
  ) {
    return this.hrService.checkOut(req.user.userId, body, {
      skipOutsideEvidence: hasSuperAdminBypass(req.user),
    });
  }

  @Post("attendance/return")
  returnToOffice(
    @Request() req: any,
    @Body()
    body: {
      lat?: number;
      lng?: number;
      accuracy?: number | null;
      location?: string;
      notes?: string;
      isOutsideZone?: boolean;
    },
  ) {
    return this.hrService.returnToOffice(req.user.userId, body);
  }

  @Get("attendance/today")
  getTodayAttendance(@Request() req: any) {
    return this.hrService.getTodayAttendance(req.user.userId);
  }

  @Get("attendance/my")
  getMyAttendance(@Request() req: any, @Query("month") month?: string) {
    const currentMonth = month || new Date().toISOString().slice(0, 7);
    return this.hrService.getMyAttendance(req.user.userId, currentMonth);
  }

  @Get("attendance")
  getAttendance(
    @Request() req: any,
    @Query("month") month?: string,
    @Query("employeeId") employeeId?: string,
    @Query("fromDate") fromDate?: string,
    @Query("toDate") toDate?: string,
  ) {
    const currentMonth = month || new Date().toISOString().slice(0, 7);
    return this.hrService.getAttendanceForUser(
      req.user,
      currentMonth,
      employeeId,
      fromDate,
      toDate,
    );
  }

  @Get("attendance/policy")
  getAttendancePolicy(@Request() req: any) {
    return this.attendanceControl.getPolicy(req.user.tenantId);
  }

  @Get("attendance/historical-import/template")
  @RequireCreate("hr")
  async historicalAttendanceTemplate(@Res() response: Response) {
    const workbook = await this.historicalImport.template();
    response.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    response.setHeader("Content-Disposition", 'attachment; filename="historical-attendance-template.xlsx"');
    response.send(workbook);
  }

  @Post("attendance/historical-import/preview")
  @RequireCreate("hr")
  @UseInterceptors(FileInterceptor("file", { storage: memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } }))
  historicalAttendancePreview(@Request() req: any, @UploadedFile() file: Express.Multer.File, @Body("month") month: string) {
    if (!file) throw new BadRequestException("Choose an Excel workbook");
    return this.historicalImport.preview(req.user.tenantId, file, month, file.originalname);
  }

  @Post("attendance/historical-import/confirm")
  @RequireCreate("hr")
  historicalAttendanceConfirm(@Request() req: any, @Body() body: any) {
    return this.historicalImport.confirm(req.user.tenantId, req.user.userId, body);
  }

  @Put("attendance/policy")
  @RequireUpdate("hr")
  updateAttendancePolicy(@Request() req: any, @Body() body: any) {
    return this.attendanceControl.updatePolicy(req.user.tenantId, body);
  }

  @Get("attendance/approvals")
  getAttendanceApprovals(
    @Request() req: any,
    @Query("status") status?: string,
  ) {
    return this.attendanceControl.getApprovals(req.user, status || "PENDING");
  }

  @Put("attendance/approvals/:id/approve")
  approveAttendance(
    @Request() req: any,
    @Param("id") id: string,
    @Body() body: any,
  ) {
    return this.attendanceControl.decideApproval(
      req.user,
      id,
      "APPROVED",
      body?.comment,
    );
  }

  @Put("attendance/approvals/:id/reject")
  rejectAttendance(
    @Request() req: any,
    @Param("id") id: string,
    @Body() body: any,
  ) {
    return this.attendanceControl.decideApproval(
      req.user,
      id,
      "REJECTED",
      body?.comment,
    );
  }

  @Get("attendance/register")
  getAttendanceRegister(
    @Request() req: any,
    @Query("fromDate") fromDate: string,
    @Query("toDate") toDate: string,
    @Query("employeeId") employeeId?: string,
  ) {
    return this.attendanceControl.buildRegisterForUser(
      req.user,
      fromDate,
      toDate,
      employeeId,
    );
  }

  @Get("attendance/export.xlsx")
  async exportAttendanceRegister(
    @Request() req: any,
    @Res() response: Response,
    @Query("fromDate") fromDate: string,
    @Query("toDate") toDate: string,
    @Query("employeeId") employeeId?: string,
  ) {
    const workbook = await this.attendanceControl.exportRegisterForUser(
      req.user,
      fromDate,
      toDate,
      employeeId,
    );
    response.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    );
    response.setHeader(
      "Content-Disposition",
      `attachment; filename="attendance-${fromDate}-to-${toDate}.xlsx"`,
    );
    response.send(workbook);
  }

  // Legacy attendance endpoints
  @Post("attendance")
  @RequireUpdate("hr")
  recordAttendance(@Request() req: any, @Body() body: any) {
    return this.hrService.createManualAttendance(
      req.user.tenantId,
      req.user,
      body,
      req,
    );
  }

  @Post("attendance/manual")
  @RequireUpdate("hr")
  createManualAttendance(@Request() req: any, @Body() body: any) {
    return this.hrService.createManualAttendance(
      req.user.tenantId,
      req.user,
      body,
      req,
    );
  }

  @Post("attendance/import")
  @RequireCreate("hr")
  importAttendance(@Request() req: any, @Body() body: { records: any[] }) {
    return this.hrService.importBiometricAttendance(req.user.tenantId, body);
  }

  @Put("attendance/:id")
  @RequireUpdate("hr")
  updateAttendance(
    @Request() req: any,
    @Param("id") id: string,
    @Body() body: any,
  ) {
    return this.hrService.correctManualAttendance(
      req.user.tenantId,
      req.user,
      id,
      body,
      req,
    );
  }

  // Self-service: any employee may declare outstation travel / per diem on their own attendance day.
  @Put("attendance/:id/travel")
  updateOwnAttendanceTravel(
    @Request() req: any,
    @Param("id") id: string,
    @Body() body: any,
  ) {
    return this.hrService.updateOwnAttendanceTravel(
      req.user.tenantId,
      req.user.userId,
      id,
      body,
    );
  }

  @Delete("attendance/:id")
  @RequireDelete("hr")
  deleteAttendance(@Request() req: any, @Param("id") id: string) {
    return this.hrService.deleteAttendance(req.user.tenantId, id);
  }

  // Leave Requests
  @Post("leaves")
  applyLeave(@Request() req: any, @Body() body: any) {
    return this.hrService.applyLeave(req.user.tenantId, body);
  }
  @Get("leaves")
  getLeaves(@Request() req: any, @Query("employeeId") employeeId?: string) {
    return this.hrService.getLeaves(req.user.tenantId, employeeId);
  }
  @Put("leaves/:id/approve")
  @RequireApprove("hr")
  approveLeave(@Request() req: any, @Param("id") id: string) {
    return this.hrService.approveLeave(req.user.tenantId, id, req.user.userId, {
      overrideMakerChecker: hasSuperAdminBypass(req.user),
    });
  }
  @Put("leaves/:id/reject")
  @RequireApprove("hr")
  rejectLeave(@Request() req: any, @Param("id") id: string) {
    return this.hrService.rejectLeave(req.user.tenantId, id, req.user.userId, {
      overrideMakerChecker: hasSuperAdminBypass(req.user),
    });
  }

  @Put("leaves/:id")
  updateLeave(@Request() req: any, @Param("id") id: string, @Body() body: any) {
    return this.hrService.updateLeave(req.user.tenantId, id, body);
  }

  // Holiday Calendar
  @Get("holidays")
  getHolidays(@Request() req: any, @Query("year") year?: string) {
    const parsedYear = year ? Number.parseInt(year, 10) : undefined;
    return this.hrService.getHolidays(
      req.user.tenantId,
      Number.isFinite(parsedYear as number) ? parsedYear : undefined,
    );
  }

  @Post("holidays")
  @RequireCreate("hr")
  createHoliday(@Request() req: any, @Body() body: any) {
    return this.hrService.createHoliday(req.user.tenantId, body);
  }

  @Put("holidays/:id")
  @RequireUpdate("hr")
  updateHoliday(
    @Request() req: any,
    @Param("id") id: string,
    @Body() body: any,
  ) {
    return this.hrService.updateHoliday(req.user.tenantId, id, body);
  }

  @Delete("holidays/:id")
  @RequireDelete("hr")
  deleteHoliday(@Request() req: any, @Param("id") id: string) {
    return this.hrService.deleteHoliday(req.user.tenantId, id);
  }

  // Salary Components
  @Post("salary")
  @RequireCreate("hr")
  addSalaryComponent(@Request() req: any, @Body() body: any) {
    return this.hrService.addSalaryComponent(req.user.tenantId, body, req.user.userId);
  }
  @Get("salary-components")
  @RequireRead("hr")
  getAllSalaryComponents(@Request() req: any) {
    return this.hrService.getSalaryComponents(req.user.tenantId);
  }
  @Get("salary/:employeeId")
  getSalaryComponents(
    @Request() req: any,
    @Param("employeeId") employeeId: string,
  ) {
    return this.hrService.getSalaryComponents(req.user.tenantId, employeeId);
  }

  @Get("salary/:employeeId/history")
  @RequireRead("hr")
  getSalaryComponentHistory(@Request() req: any, @Param("employeeId") employeeId: string, @Query("componentId") componentId?: string) {
    return this.hrService.getSalaryComponentHistory(req.user.tenantId, employeeId, componentId);
  }

  @Post("salary/:employeeId/revisions")
  @RequireUpdate("hr")
  createSalaryRevision(
    @Request() req: any,
    @Param("employeeId") employeeId: string,
    @Body() body: any,
  ) {
    return this.hrService.createEffectiveDatedSalaryRevision(
      req.user.tenantId,
      employeeId,
      req.user.userId,
      body,
    );
  }

  @Put("salary/:employeeId/components/:componentId/end")
  @RequireUpdate("hr")
  endSalaryComponent(@Request() req: any, @Param("employeeId") employeeId: string, @Param("componentId") componentId: string, @Body() body: any) {
    return this.hrService.endEffectiveDatedSalaryComponent(req.user.tenantId, employeeId, componentId, req.user.userId, body);
  }

  @Put("salary/employee/:employeeId")
  @RequireUpdate("hr")
  replaceSalaryComponents(
    @Request() req: any,
    @Param("employeeId") employeeId: string,
    @Body() body: { components?: any[] },
  ) {
    return this.hrService.replaceSalaryComponents(
      req.user.tenantId,
      employeeId,
      body?.components,
    );
  }

  @Delete("salary/:id")
  @RequireDelete("hr")
  deleteSalaryComponent(@Request() req: any, @Param("id") id: string) {
    return this.hrService.deleteSalaryComponent(req.user.tenantId, id);
  }

  // Payroll Run
  @Post("payroll/run")
  @RequireCreate("hr")
  createPayrollRun(@Request() req: any, @Body() body: any) {
    return this.hrService.createPayrollRun(
      req.user.tenantId,
      body,
      req.user.userId,
    );
  }
  @Get("payroll/runs")
  getPayrollRuns(@Request() req: any) {
    return this.hrService.getPayrollRuns(req.user.tenantId);
  }

  @Get("payroll/control/features")
  @RequireRead("hr")
  getPayrollControlFeatures(@Request() req: any) {
    return this.hrService.getPayrollControlFlags(req.user.tenantId);
  }

  @Get("payroll/control/profile")
  @RequireRead("hr")
  getHrPayrollProfile(@Request() req: any) {
    return this.hrService.getHrPayrollProfile(req.user.tenantId);
  }

  @Get("payroll/control/rules")
  @RequireRead("hr")
  getEffectivePayrollRuleCatalog(@Request() req: any, @Query("effectiveDate") effectiveDate?: string, @Query("employeeId") employeeId?: string) {
    return this.hrService.getEffectivePayrollRuleCatalog(req.user.tenantId, effectiveDate || new Date().toISOString().slice(0, 10), employeeId);
  }

  @Post("payroll/control/rules")
  @RequireUpdate("hr")
  saveEffectivePayrollRule(@Request() req: any, @Body() body: any) {
    return this.hrService.saveEffectivePayrollRule(req.user.tenantId, req.user.userId, body);
  }

  @Put("payroll/control/rules/:id/end")
  @RequireUpdate("hr")
  endEffectivePayrollRule(@Request() req: any, @Param("id") id: string, @Body() body: any) {
    return this.hrService.endEffectivePayrollRule(req.user.tenantId, req.user.userId, id, body);
  }

  @Get("employees/:employeeId/payroll-rule-overrides")
  @RequireRead("hr")
  getEmployeePayrollRuleOverrides(@Request() req: any, @Param("employeeId") employeeId: string, @Query("effectiveDate") effectiveDate?: string) {
    return this.hrService.getEffectivePayrollRuleCatalog(req.user.tenantId, effectiveDate || new Date().toISOString().slice(0, 10), employeeId);
  }

  @Post("employees/:employeeId/payroll-rule-overrides")
  @RequireUpdate("hr")
  saveEmployeePayrollOverride(@Request() req: any, @Param("employeeId") employeeId: string, @Body() body: any) {
    return this.hrService.saveEmployeePayrollOverride(req.user.tenantId, employeeId, req.user.userId, body);
  }

  @Put("employees/:employeeId/payroll-rule-overrides/:id/end")
  @RequireUpdate("hr")
  endEmployeePayrollOverride(@Request() req: any, @Param("employeeId") employeeId: string, @Param("id") id: string, @Body() body: any) {
    return this.hrService.endEmployeePayrollOverride(req.user.tenantId, employeeId, req.user.userId, id, body);
  }

  @Get("payroll/control/month/:month")
  @RequireRead("hr")
  getPayrollMonthCockpit(@Request() req: any, @Param("month") month: string) {
    return this.hrService.getPayrollMonthCockpit(req.user.tenantId, month);
  }

  @Put("payroll/control/maker-checker")
  @RequireUpdate("hr")
  setPayrollMakerCheckerConfig(@Request() req: any, @Body() body: any) {
    return this.hrService.setPayrollMakerCheckerConfig(req.user.tenantId, req.user.userId, body);
  }

  @Post("payroll/control/month/:month/check-again")
  @RequirePermissions("hr:read")
  checkPayrollMonthAgain(@Request() req: any, @Param("month") month: string) {
    return this.hrService.checkPayrollMonthAgain(req.user.tenantId, month, req.user.userId);
  }

  @Post("payroll/control/month/:month/close")
  @RequirePermissions("PAYROLL_CLOSE")
  closePayrollMonth(@Request() req: any, @Param("month") month: string) {
    return this.hrService.closePayrollMonth(req.user.tenantId, month, req.user.userId);
  }

  @Post("payroll/control/month/:month/calculate")
  @RequirePermissions("PAYROLL_CALCULATE")
  calculateControlledPayroll(@Request() req: any, @Param("month") month: string) {
    return this.hrService.calculateControlledPayroll(req.user.tenantId, month, req.user.userId);
  }

  @Post("payroll/control/month/:month/submit")
  @RequirePermissions("PAYROLL_CALCULATE")
  submitControlledPayroll(@Request() req: any, @Param("month") month: string) {
    return this.hrService.submitControlledPayroll(req.user.tenantId, month, req.user.userId);
  }

  @Post("payroll/control/month/:month/approve")
  @RequirePermissions("PAYROLL_APPROVE")
  approveControlledPayroll(@Request() req: any, @Param("month") month: string) {
    return this.hrService.approveControlledPayroll(req.user.tenantId, month, req.user.userId);
  }

  @Post("payroll/control/month/:month/countersign")
  @RequirePermissions("PAYROLL_COUNTERSIGN")
  countersignControlledPayroll(@Request() req: any, @Param("month") month: string) {
    return this.hrService.countersignControlledPayroll(req.user.tenantId, month, req.user.userId);
  }

  @Post("payroll/control/month/:month/pay")
  @RequirePermissions("PAYROLL_PAY")
  markControlledPayrollPaid(@Request() req: any, @Param("month") month: string) {
    return this.hrService.markControlledPayrollPaid(req.user.tenantId, month, req.user.userId);
  }

  @Get("payroll/control/working/:payslipId")
  @RequireRead("hr")
  getPayrollWorking(@Request() req: any, @Param("payslipId") payslipId: string) {
    return this.hrService.getPayrollWorking(req.user.tenantId, payslipId);
  }

  @Post("payroll/control/corrections")
  @RequirePermissions("PAYROLL_CALCULATE")
  openPayrollCorrection(@Request() req: any, @Body() body: any) {
    return this.hrService.openPayrollCorrection(req.user.tenantId, req.user.userId, body);
  }

  @Post("payroll/control/corrections/:id/calculate")
  @RequirePermissions("PAYROLL_CALCULATE")
  calculatePayrollCorrection(@Request() req: any, @Param("id") id: string) {
    return this.hrService.calculatePayrollCorrection(req.user.tenantId, req.user.userId, id);
  }

  @Post("payroll/control/corrections/:id/submit")
  @RequirePermissions("PAYROLL_CALCULATE")
  submitPayrollCorrection(@Request() req: any, @Param("id") id: string) {
    return this.hrService.submitPayrollCorrection(req.user.tenantId, req.user.userId, id);
  }

  @Post("payroll/control/corrections/:id/return")
  @RequirePermissions("PAYROLL_APPROVE")
  returnPayrollCorrection(@Request() req: any, @Param("id") id: string, @Body() body: any) {
    return this.hrService.returnPayrollCorrection(req.user.tenantId, req.user.userId, id, body?.reason);
  }

  @Post("payroll/control/corrections/:id/approve")
  @RequirePermissions("PAYROLL_APPROVE")
  approvePayrollCorrection(@Request() req: any, @Param("id") id: string) {
    return this.hrService.approvePayrollCorrection(req.user.tenantId, req.user.userId, id);
  }

  @Post("payroll/control/corrections/:id/countersign")
  @RequirePermissions("PAYROLL_COUNTERSIGN")
  countersignPayrollCorrection(@Request() req: any, @Param("id") id: string) {
    return this.hrService.countersignPayrollCorrection(req.user.tenantId, req.user.userId, id);
  }

  @Post("payroll/control/corrections/:id/record-paid")
  @RequirePermissions("PAYROLL_PAY")
  markPayrollCorrectionRecorded(@Request() req: any, @Param("id") id: string) {
    return this.hrService.markPayrollCorrectionRecorded(req.user.tenantId, req.user.userId, id);
  }

  @Get("team-desk")
  getTeamDesk(@Request() req: any) {
    return this.hrService.getTeamDesk(req.user);
  }

  // Payslip Generation
  @Post("payroll/run/:runId/generate")
  @RequirePermissions("PAYROLL_CALCULATE")
  async generatePayslips(@Request() req: any, @Param("runId") runId: string) {
    try {
      return await this.hrService.calculateControlledPayrollByRun(req.user.tenantId, runId, req.user.userId);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      const stack = err instanceof Error ? err.stack : undefined;
      this.logger.error(
        `Payslip generation failed (tenantId=${req?.user?.tenantId}, runId=${runId}): ${message}`,
        stack,
      );
      throw new BadRequestException(`Failed to generate payslips: ${message}`);
    }
  }
  @Get("payroll/payslips")
  getPayslips(@Request() req: any, @Query("employeeId") employeeId?: string) {
    return this.hrService.getPayslips(req.user.tenantId, employeeId);
  }

  // Monthly Payroll Processing
  @Get("payroll/monthly/attendance-preview")
  @RequireRead("hr")
  getMonthlyPayrollAttendancePreview(
    @Request() req: any,
    @Query("employeeId") employeeId: string,
    @Query("month") month: string,
  ) {
    return this.hrService.getMonthlyPayrollAttendancePreview(
      req.user.tenantId,
      employeeId,
      month,
    );
  }

  @Post("payroll/monthly")
  @RequireCreate("hr")
  createMonthlyPayroll(@Request() req: any, @Body() body: any) {
    return this.hrService.createMonthlyPayroll(req.user.tenantId, body);
  }

  @Get("payroll/monthly")
  getMonthlyPayrolls(@Request() req: any, @Query("month") month?: string) {
    return this.hrService.getMonthlyPayrolls(req.user.tenantId, month);
  }

  @Put("payroll/monthly/:id")
  @RequireUpdate("hr")
  updateMonthlyPayroll(
    @Request() req: any,
    @Param("id") id: string,
    @Body() body: any,
  ) {
    return this.hrService.updateMonthlyPayroll(req.user.tenantId, id, body);
  }

  @Put("payroll/monthly/:id/process")
  @RequireApprove("hr")
  processMonthlyPayroll(@Request() req: any, @Param("id") id: string) {
    return this.hrService.processMonthlyPayroll(req.user.tenantId, id);
  }

  @Delete("payroll/monthly/:id")
  @RequireDelete("hr")
  deleteMonthlyPayroll(@Request() req: any, @Param("id") id: string) {
    return this.hrService.deleteMonthlyPayroll(req.user.tenantId, id);
  }

  // Employee Documents
  @Get("employees/:id/documents")
  getEmployeeDocuments(@Request() req: any, @Param("id") employeeId: string) {
    return this.hrService.getEmployeeDocuments(req.user.tenantId, employeeId);
  }

  @Post("employees/:id/documents")
  @RequireUpdate("hr")
  addEmployeeDocument(
    @Request() req: any,
    @Param("id") employeeId: string,
    @Body() body: any,
  ) {
    return this.hrService.addEmployeeDocument(
      req.user.tenantId,
      employeeId,
      body,
    );
  }

  @Delete("employees/:id/documents/:docId")
  @RequireDelete("hr")
  deleteEmployeeDocument(
    @Request() req: any,
    @Param("id") employeeId: string,
    @Param("docId") docId: string,
  ) {
    return this.hrService.deleteEmployeeDocument(
      req.user.tenantId,
      employeeId,
      docId,
    );
  }

  // Merits & Demerits
  @Get("employees/:id/merits-demerits")
  getMeritsDemerits(@Request() req: any, @Param("id") employeeId: string) {
    return this.hrService.getMeritsDemerits(req.user.tenantId, employeeId);
  }

  @Post("employees/:id/merits-demerits")
  @RequireCreate("hr")
  addMeritDemerit(
    @Request() req: any,
    @Param("id") employeeId: string,
    @Body() body: any,
  ) {
    return this.hrService.addMeritDemerit(
      req.user.tenantId,
      employeeId,
      body,
      req.user,
    );
  }

  @Put("employees/:id/merits-demerits/:recordId/approval")
  @RequireApprove("hr")
  approveMeritDemerit(
    @Request() req: any,
    @Param("id") employeeId: string,
    @Param("recordId") recordId: string,
    @Body() body: any,
  ) {
    return this.hrService.approveMeritDemerit(
      req.user.tenantId,
      employeeId,
      recordId,
      body,
      req.user,
    );
  }

  @Delete("employees/:id/merits-demerits/:recordId")
  @RequireDelete("hr")
  deleteMeritDemerit(
    @Request() req: any,
    @Param("id") employeeId: string,
    @Param("recordId") recordId: string,
  ) {
    return this.hrService.deleteMeritDemerit(
      req.user.tenantId,
      employeeId,
      recordId,
    );
  }

  // KPI Definitions (Master Config)
  @Post("performance/seed-defaults")
  @RequireCreate("hr")
  seedPerformanceDefaults(@Request() req: any) {
    return this.hrService.seedPerformanceDefaults(req.user.tenantId);
  }

  // KPI reviews are a separate controlled record.  A KPI result is evidence;
  // it never creates a merit, demerit or payroll impact by itself.
  @Get("employees/:id/kpi-reviews")
  getKpiReviews(@Request() req: any, @Param("id") employeeId: string) {
    return this.hrService.getKpiReviews(req.user.tenantId, employeeId);
  }

  @Post("employees/:id/kpi-reviews")
  @RequireCreate("hr")
  saveKpiReview(
    @Request() req: any,
    @Param("id") employeeId: string,
    @Body() body: any,
  ) {
    return this.hrService.saveKpiReview(
      req.user.tenantId,
      employeeId,
      body,
      req.user,
    );
  }

  @Put("employees/:id/kpi-reviews/:reviewId/approval")
  @RequireApprove("hr")
  approveKpiReview(
    @Request() req: any,
    @Param("id") employeeId: string,
    @Param("reviewId") reviewId: string,
    @Body() body: any,
  ) {
    return this.hrService.approveKpiReview(
      req.user.tenantId,
      employeeId,
      reviewId,
      body,
      req.user,
    );
  }

  @Get("kpi-definitions")
  getKPIDefinitions(@Request() req: any) {
    return this.hrService.getKPIDefinitions(req.user.tenantId);
  }

  @Post("kpi-definitions")
  @RequireCreate("hr")
  createKPIDefinition(@Request() req: any, @Body() body: any) {
    return this.hrService.createKPIDefinition(req.user.tenantId, body);
  }

  @Put("kpi-definitions/:id")
  @RequireUpdate("hr")
  updateKPIDefinition(
    @Request() req: any,
    @Param("id") id: string,
    @Body() body: any,
  ) {
    return this.hrService.updateKPIDefinition(req.user.tenantId, id, body);
  }

  @Delete("kpi-definitions/:id")
  @RequireDelete("hr")
  deleteKPIDefinition(@Request() req: any, @Param("id") id: string) {
    return this.hrService.deleteKPIDefinition(req.user.tenantId, id);
  }

  // Merit/Demerit Types (Master Config)
  @Get("merit-demerit-types")
  getMeritDemeritTypes(@Request() req: any) {
    return this.hrService.getMeritDemeritTypes(req.user.tenantId);
  }

  @Post("merit-demerit-types")
  @RequireCreate("hr")
  createMeritDemeritType(@Request() req: any, @Body() body: any) {
    return this.hrService.createMeritDemeritType(req.user.tenantId, body);
  }

  @Put("merit-demerit-types/:id")
  @RequireUpdate("hr")
  updateMeritDemeritType(
    @Request() req: any,
    @Param("id") id: string,
    @Body() body: any,
  ) {
    return this.hrService.updateMeritDemeritType(req.user.tenantId, id, body);
  }

  @Delete("merit-demerit-types/:id")
  @RequireDelete("hr")
  deleteMeritDemeritType(@Request() req: any, @Param("id") id: string) {
    return this.hrService.deleteMeritDemeritType(req.user.tenantId, id);
  }
}
