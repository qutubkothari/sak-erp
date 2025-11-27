import { Controller, Get, Post, Put, Delete, Body, Param, Query, Request, UseGuards } from '@nestjs/common';
import { HrService } from '../services/hr.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';

@Controller('api/v1/hr')
@UseGuards(JwtAuthGuard)
export class HrController {
  constructor(private readonly hrService: HrService) {}

  // Employee CRUD
  @Post('employees')
  createEmployee(@Body() body: any) {
    return this.hrService.createEmployee(body);
  }
  @Get('employees')
  getEmployees() {
    return this.hrService.getEmployees();
  }
  @Get('employees/:id')
  getEmployee(@Param('id') id: string) {
    return this.hrService.getEmployee(id);
  }
  @Put('employees/:id')
  updateEmployee(@Param('id') id: string, @Body() body: any) {
    return this.hrService.updateEmployee(id, body);
  }
  @Delete('employees/:id')
  deleteEmployee(@Param('id') id: string) {
    return this.hrService.deleteEmployee(id);
  }

  // Attendance
  @Post('attendance')
  recordAttendance(@Body() body: any) {
    return this.hrService.recordAttendance(body);
  }
  @Get('attendance')
  getAttendance(@Query('employeeId') employeeId: string, @Query('month') month?: string) {
    return this.hrService.getAttendance(employeeId, month);
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
