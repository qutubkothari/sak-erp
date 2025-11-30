import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { UidService } from './uid.service';

@ApiTags('UID Tracking')
@Controller('uid')
export class UidController {
  constructor(private uidService: UidService) {}

  @Get()
  @ApiOperation({ summary: 'Get all UIDs (filterable for inspections)' })
  async getAllUids(
    @Query('status') status?: string,
    @Query('entityType') entityType?: string,
  ) {
    return this.uidService.getAllUids(status, entityType);
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
