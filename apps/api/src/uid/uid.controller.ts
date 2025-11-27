import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { UidService } from './uid.service';

@ApiTags('UID Tracking')
@Controller('uid')
export class UidController {
  constructor(private uidService: UidService) {}

  @Get(':uid')
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
