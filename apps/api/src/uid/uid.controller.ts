import { Controller, Get, Param, Query, UseGuards, Inject } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { UidService } from './uid.service';
import { UidSupabaseService } from './services/uid-supabase.service';

@ApiTags('UID Tracking')
@Controller('uid')
export class UidController {
  constructor(
    private uidService: UidService,
    @Inject(UidSupabaseService) private uidSupabaseService: UidSupabaseService,
  ) {}
  @Get('trace/:uid')
  @ApiOperation({ summary: 'Get complete UID traceability report (full details)' })
  async getUidTrace(@Param('uid') uid: string, @Query() req: any) {
    // Simulate req.user for local testing; in production, use auth middleware
    if (!req.user) req.user = { tenantId: req.tenantId || 'default', email: req.email || 'system' };
    return this.uidSupabaseService.getCompleteTrace(req, uid);
  }

  @Get()
  @ApiOperation({ summary: 'Get all UIDs (filterable for inspections)' })
  async getAllUids(
    @Query('status') status?: string,
    @Query('entityType') entityType?: string,
    @Query('item_id') itemId?: string,
  ) {
    return this.uidService.getAllUids(status, entityType, itemId);
  }

  @Get(':uid')
  @ApiOperation({ summary: 'Get complete UID details with vendor and item information' })
  async getUidDetails(@Param('uid') uid: string) {
    return this.uidService.getUidDetails(uid);
  }

  @Get(':uid/history')
  @ApiOperation({ summary: 'Get UID traceability history' })
  async getUidHistory(@Param('uid') uid: string) {
    return this.uidService.getUidHistory(uid);
  }

  @Get(':uid/validate')
  @ApiOperation({ summary: 'Validate UID format and checksum' })
  async validateUid(@Param('uid') uid: string) {
    const isValid = this.uidService.validateUid(uid);
    return {
      uid,
      isValid,
      message: isValid ? 'UID is valid' : 'Invalid UID format or checksum',
    };
  }
}
