import {
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
} from '@nestjs/common';
import { DocumentsService } from '../services/documents.service';
import { DocumentRevisionsService } from '../services/document-revisions.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';

@Controller('api/v1/documents')
@UseGuards(JwtAuthGuard)
export class DocumentsController {
  constructor(
    private readonly documentsService: DocumentsService,
    private readonly revisionsService: DocumentRevisionsService,
  ) {}

  @Post()
  create(@Request() req: any, @Body() createDto: any) {
    return this.documentsService.create(req, createDto);
  }

  @Get()
  findAll(@Request() req: any, @Query() filters: any) {
    return this.documentsService.findAll(req, filters);
  }

  @Get('pending-approvals')
  getPendingApprovals(@Request() req: any) {
    return this.documentsService.getPendingApprovals(req);
  }

  @Get(':id')
  findOne(@Request() req: any, @Param('id') id: string) {
    return this.documentsService.findOne(req, id);
  }

  @Put(':id')
  update(
    @Request() req: any,
    @Param('id') id: string,
    @Body() updateDto: any,
  ) {
    return this.documentsService.update(req, id, updateDto);
  }

  @Delete(':id')
  delete(@Request() req: any, @Param('id') id: string) {
    return this.documentsService.delete(req, id);
  }

  @Post(':id/revisions')
  addRevision(
    @Request() req: any,
    @Param('id') id: string,
    @Body() revisionDto: any,
  ) {
    return this.documentsService.addRevision(req, id, revisionDto);
  }

  @Get(':id/revisions')
  getRevisions(@Request() req: any, @Param('id') id: string) {
    return this.revisionsService.findAllByDocument(req, id);
  }

  @Post(':id/submit-approval')
  submitForApproval(
    @Request() req: any,
    @Param('id') id: string,
    @Body() approvalWorkflow: any,
  ) {
    return this.documentsService.submitForApproval(req, id, approvalWorkflow);
  }

  @Post(':id/approve/:approvalId')
  approveDocument(
    @Request() req: any,
    @Param('id') id: string,
    @Param('approvalId') approvalId: string,
    @Body() body: { comments?: string },
  ) {
    return this.documentsService.approveDocument(
      req,
      id,
      approvalId,
      body.comments,
    );
  }

  @Post(':id/reject/:approvalId')
  rejectDocument(
    @Request() req: any,
    @Param('id') id: string,
    @Param('approvalId') approvalId: string,
    @Body() body: { reason: string },
  ) {
    return this.documentsService.rejectDocument(
      req,
      id,
      approvalId,
      body.reason,
    );
  }

  @Post(':id/archive')
  archiveDocument(@Request() req: any, @Param('id') id: string) {
    return this.documentsService.archiveDocument(req, id);
  }

  @Get(':id/access-logs')
  getAccessLogs(@Request() req: any, @Param('id') id: string) {
    return this.documentsService.getAccessLogs(req, id);
  }
}
