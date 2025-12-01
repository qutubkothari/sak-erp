import { Controller, Get, Param, Query, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { UidService } from './uid.service';
import { UidSupabaseService } from './services/uid-supabase.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('UID Tracking')
@Controller('uid')
@UseGuards(JwtAuthGuard)
export class UidController {
  constructor(
    private uidService: UidService,
    private uidSupabaseService: UidSupabaseService,
  ) {}

  @Get('trace/:uid')
  @ApiOperation({ summary: 'Get complete UID traceability report (full details)' })
  async getUidTrace(@Param('uid') uid: string, @Request() req: any) {
    return this.uidSupabaseService.getCompleteTrace(req, uid);
  }

  @Get()
  @ApiOperation({ summary: 'Get all UIDs (filterable for inspections)' })
  async getAllUids(
    @Request() req: any,
    @Query('status') status?: string,
    @Query('entityType') entityType?: string,
    @Query('item_id') itemId?: string,
  ) {
    return this.uidSupabaseService.getAllUIDs(req, status, entityType, itemId);
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
