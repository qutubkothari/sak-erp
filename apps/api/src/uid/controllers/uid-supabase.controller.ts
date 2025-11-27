import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { UidSupabaseService } from '../services/uid-supabase.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';

@Controller('api/v1/uid')
@UseGuards(JwtAuthGuard)
export class UidSupabaseController {
  constructor(private readonly uidService: UidSupabaseService) {}

  @Post()
  create(@Request() req: any, @Body() createDto: any) {
    return this.uidService.createUID(req, createDto);
  }

  @Get()
  findAll(@Request() req: any, @Query() filters: any) {
    return this.uidService.findAll(req, filters);
  }

  @Get('search/:uid')
  searchUID(@Request() req: any, @Param('uid') uid: string) {
    return this.uidService.searchUID(req, uid);
  }

  @Get(':uid/hierarchy')
  getHierarchy(@Request() req: any, @Param('uid') uid: string) {
    return this.uidService.getUIDWithHierarchy(req, uid);
  }

  @Post(':uid/lifecycle')
  updateLifecycle(
    @Request() req: any,
    @Param('uid') uid: string,
    @Body() body: { stage: string; location: string; reference: string },
  ) {
    return this.uidService.updateLifecycle(
      req,
      uid,
      body.stage,
      body.location,
      body.reference,
    );
  }

  @Post('link')
  linkUIDs(
    @Request() req: any,
    @Body() body: { parentUID: string; childUID: string },
  ) {
    return this.uidService.linkUIDs(req, body.parentUID, body.childUID);
  }

  @Put(':uid/status')
  updateStatus(
    @Request() req: any,
    @Param('uid') uid: string,
    @Body() body: { status: string; location?: string },
  ) {
    return this.uidService.updateStatus(req, uid, body.status, body.location);
  }

  @Get(':uid/validate')
  validateUID(@Param('uid') uid: string) {
    const isValid = this.uidService.validateUIDFormat(uid);
    return {
      uid,
      isValid,
      message: isValid ? 'UID format is valid' : 'Invalid UID format',
    };
  }
}
