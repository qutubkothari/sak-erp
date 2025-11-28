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
  getAttendance(@Request() req: any, @Query('employeeId') employeeId: string, @Query('month') month?: string) {
    return this.hrService.getAttendance(req.user.tenantId, employeeId, month);
  }

  // Leave Requests
  @Post('leaves')
  applyLeave(@Body() body: any) {
    return this.hrService.applyLeave(body);
  }
  @Get('leaves')
  getLeaves(@Query('employeeId') employeeId: string) {
    return this.hrService.getLeaves(employeeId);
  }
  @Put('leaves/:id/approve')
  approveLeave(@Param('id') id: string, @Body('approverId') approverId: string) {
    return this.hrService.approveLeave(id, approverId);
  }
  @Put('leaves/:id/reject')
  rejectLeave(@Param('id') id: string, @Body('approverId') approverId: string) {
    return this.hrService.rejectLeave(id, approverId);
  }

  // Salary Components
  @Post('salary-components')
  addSalaryComponent(@Body() body: any) {
    return this.hrService.addSalaryComponent(body);
  }
  @Get('salary-components')
  getSalaryComponents(@Query('employeeId') employeeId: string) {
    return this.hrService.getSalaryComponents(employeeId);
  }

  // Payroll Run
  @Post('payroll-runs')
  createPayrollRun(@Body() body: any) {
    return this.hrService.createPayrollRun(body);
  }
  @Get('payroll-runs')
  getPayrollRuns(@Query('tenantId') tenantId: string) {
    return this.hrService.getPayrollRuns(tenantId);
  }

  // Payslip Generation
  @Post('payslips')
  generatePayslip(@Body() body: any) {
    return this.hrService.generatePayslip(body);
  }
  @Get('payslips')
  getPayslips(@Query('employeeId') employeeId: string) {
    return this.hrService.getPayslips(employeeId);
  }
}
