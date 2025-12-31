import { Controller, Get, Post, Put, Delete, Body, Param, Query, Request, UseGuards } from '@nestjs/common';
import { HrService } from '../services/hr.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';

@Controller('hr')
@UseGuards(JwtAuthGuard)
export class HrController {
  constructor(private readonly hrService: HrService) {}

  // Employee CRUD
  @Post('employees')
  createEmployee(@Request() req: any, @Body() body: any) {
    return this.hrService.createEmployee(req.user.tenantId, body);
  }
  @Get('employees')
  getEmployees(@Request() req: any) {
    return this.hrService.getEmployees(req.user.tenantId);
  }
  @Get('employees/:id')
  getEmployee(@Request() req: any, @Param('id') id: string) {
    return this.hrService.getEmployee(req.user.tenantId, id);
  }
  @Put('employees/:id')
  updateEmployee(@Request() req: any, @Param('id') id: string, @Body() body: any) {
    return this.hrService.updateEmployee(req.user.tenantId, id, body);
  }
  @Delete('employees/:id')
  deleteEmployee(@Request() req: any, @Param('id') id: string) {
    return this.hrService.deleteEmployee(req.user.tenantId, id);
  }

  // Attendance
  @Post('attendance')
  recordAttendance(@Request() req: any, @Body() body: any) {
    return this.hrService.recordAttendance(req.user.tenantId, body);
  }
  @Get('attendance')
  getAttendance(@Request() req: any, @Query('employeeId') employeeId?: string, @Query('month') month?: string) {
    return this.hrService.getAttendance(req.user.tenantId, employeeId, month);
  }

  // Leave Requests
  @Post('leaves')
  applyLeave(@Request() req: any, @Body() body: any) {
    return this.hrService.applyLeave(req.user.tenantId, body);
  }
  @Get('leaves')
  getLeaves(@Request() req: any, @Query('employeeId') employeeId?: string) {
    return this.hrService.getLeaves(req.user.tenantId, employeeId);
  }
  @Put('leaves/:id/approve')
  approveLeave(@Request() req: any, @Param('id') id: string, @Body('approverId') approverId: string) {
    return this.hrService.approveLeave(req.user.tenantId, id, approverId);
  }
  @Put('leaves/:id/reject')
  rejectLeave(@Request() req: any, @Param('id') id: string, @Body('approverId') approverId: string) {
    return this.hrService.rejectLeave(req.user.tenantId, id, approverId);
  }

  // Salary Components
  @Post('salary')
  addSalaryComponent(@Request() req: any, @Body() body: any) {
    return this.hrService.addSalaryComponent(req.user.tenantId, body);
  }
  @Get('salary/:employeeId')
  getSalaryComponents(@Request() req: any, @Param('employeeId') employeeId: string) {
    return this.hrService.getSalaryComponents(req.user.tenantId, employeeId);
  }

  // Payroll Run
  @Post('payroll/run')
  createPayrollRun(@Request() req: any, @Body() body: any) {
    return this.hrService.createPayrollRun(req.user.tenantId, body);
  }
  @Get('payroll/runs')
  getPayrollRuns(@Request() req: any) {
    return this.hrService.getPayrollRuns(req.user.tenantId);
  }

  // Payslip Generation
  @Post('payroll/run/:runId/generate')
  generatePayslips(@Request() req: any, @Param('runId') runId: string) {
    return this.hrService.generatePayslip(req.user.tenantId, { run_id: runId });
  }
  @Get('payroll/payslips')
  getPayslips(@Request() req: any, @Query('employeeId') employeeId?: string) {
    return this.hrService.getPayslips(req.user.tenantId, employeeId);
  }
}
