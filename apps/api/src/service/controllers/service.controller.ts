import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  UseInterceptors,
  UploadedFiles,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { ServiceService } from '../services/service.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';

@Controller('service')
@UseGuards(JwtAuthGuard)
export class ServiceController {
  constructor(private readonly serviceService: ServiceService) {}

  // ==================== Service Tickets ====================

  @Post('tickets')
  async createServiceTicket(@Request() req: any, @Body() body: any) {
    return this.serviceService.createServiceTicket(
      req.user.tenantId,
      req.user.userId,
      body,
    );
  }

  @Post('uploads')
  @UseInterceptors(
    FilesInterceptor('files', 10, {
      storage: memoryStorage(),
      limits: {
        fileSize: 50 * 1024 * 1024, // 50MB
      },
    }),
  )
  async uploadServiceAttachments(
    @Request() req: any,
    @UploadedFiles() files: Array<Express.Multer.File>,
  ) {
    const urls = await this.serviceService.uploadServiceAttachments(
      req.user.tenantId,
      req.user.userId,
      files,
    );

    return { urls };
  }

  @Get('tickets')
  async getServiceTickets(@Request() req: any, @Query() query: any) {
    return this.serviceService.getServiceTickets(req.user.tenantId, query);
  }

  @Get('tickets/:id')
  async getServiceTicketById(@Request() req: any, @Param('id') id: string) {
    return this.serviceService.getServiceTicketById(req.user.tenantId, id);
  }

  @Put('tickets/:id')
  async updateServiceTicket(
    @Request() req: any,
    @Param('id') id: string,
    @Body() body: any,
  ) {
    return this.serviceService.updateServiceTicket(
      req.user.tenantId,
      id,
      body,
    );
  }

  @Post('tickets/:id/close')
  async closeServiceTicket(
    @Request() req: any,
    @Param('id') id: string,
    @Body() body: any,
  ) {
    return this.serviceService.closeServiceTicket(
      req.user.tenantId,
      id,
      req.user.userId,
      body,
    );
  }

  // ==================== Warranty Validation ====================

  @Get('warranty/validate/:uid')
  async validateWarranty(@Request() req: any, @Param('uid') uid: string) {
    return this.serviceService.validateWarrantyForUID(req.user.tenantId, uid);
  }

  // ==================== Technicians ====================

  @Post('technicians')
  async createTechnician(@Request() req: any, @Body() body: any) {
    return this.serviceService.createTechnician(req.user.tenantId, body);
  }

  @Get('technicians')
  async getTechnicians(@Request() req: any, @Query('active_only') activeOnly?: string) {
    return this.serviceService.getTechnicians(
      req.user.tenantId,
      activeOnly !== 'false',
    );
  }

  // ==================== Service Assignments ====================

  @Post('assignments')
  async assignTechnician(@Request() req: any, @Body() body: any) {
    return this.serviceService.assignTechnician(
      req.user.tenantId,
      req.user.userId,
      body,
    );
  }

  @Get('assignments/technician/:technicianId')
  async getAssignmentsByTechnician(
    @Param('technicianId') technicianId: string,
    @Query('status') status?: string,
  ) {
    return this.serviceService.getAssignmentsByTechnician(technicianId, status);
  }

  @Put('assignments/:id')
  async updateAssignment(@Param('id') id: string, @Body() body: any) {
    return this.serviceService.updateAssignment(id, body);
  }

  // ==================== Service Parts Used ====================

  @Post('parts')
  async addServicePart(@Request() req: any, @Body() body: any) {
    return this.serviceService.addServicePart(req.user.tenantId, body);
  }

  @Get('parts/ticket/:ticketId')
  async getServicePartsByTicket(@Param('ticketId') ticketId: string) {
    return this.serviceService.getServicePartsByTicket(ticketId);
  }

  // ==================== Service History ====================

  @Get('history/:uid')
  async getServiceHistoryByUID(@Request() req: any, @Param('uid') uid: string) {
    return this.serviceService.getServiceHistoryByUID(req.user.tenantId, uid);
  }

  // ==================== Reports ====================

  @Get('reports')
  async getServiceReports(@Request() req: any, @Query() query: any) {
    return this.serviceService.getServiceReports(req.user.tenantId, query);
  }
}
