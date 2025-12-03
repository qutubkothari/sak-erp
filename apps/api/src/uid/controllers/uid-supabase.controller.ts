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

@Controller('uid')
@UseGuards(JwtAuthGuard)
export class UidSupabaseController {
  constructor(private readonly uidService: UidSupabaseService) {}

  @Post()
  create(@Request() req: any, @Body() createDto: any) {
    return this.uidService.createUID(req, createDto);
  }

  @Get()
  findAll(@Request() req: any, @Query() filters: any) {
    console.log('[UidController] findAll called with filters:', filters);
    
    // Support both itemId and item_id (snake_case from frontend)
    const itemId = filters.itemId || filters.item_id;
    
    console.log('[UidController] Resolved itemId:', itemId, 'status:', filters.status);
    
    // If requesting with item_id and status (dispatch scenario), use getAllUIDs
    if (itemId && filters.status) {
      console.log('[UidController] Using getAllUIDs for dispatch scenario');
      return this.uidService.getAllUIDs(req, filters.status, filters.entityType, itemId);
    }
    
    // If requesting for quality inspection (simple list), use getAllUIDs
    if (filters.forInspection === 'true') {
      const page = filters.page ? parseInt(filters.page) : undefined;
      const limit = filters.limit ? parseInt(filters.limit) : undefined;
      console.log('[UidController] Using getAllUIDs for inspection');
      return this.uidService.getAllUIDs(req, filters.status, filters.entityType, itemId, page, limit);
    }
    // Otherwise use the full findAll
    console.log('[UidController] Using full findAll');
    return this.uidService.findAll(req, filters);
  }

  @Get('details/:uid')
  getDetails(@Request() req: any, @Param('uid') uid: string) {
    return this.uidService.getUIDDetails(req, uid);
  }

  @Get('search/:uid')
  searchUID(@Request() req: any, @Param('uid') uid: string) {
    return this.uidService.searchUID(req, uid);
  }

  @Get(':uid/hierarchy')
  getHierarchy(@Request() req: any, @Param('uid') uid: string) {
    return this.uidService.getUIDWithHierarchy(req, uid);
  }

  @Get(':uid/purchase-trail')
  getPurchaseTrail(@Request() req: any, @Param('uid') uid: string) {
    return this.uidService.getPurchaseTrail(req, uid);
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

  @Get('trace/:uid')
  getCompleteTrace(@Request() req: any, @Param('uid') uid: string) {
    return this.uidService.getCompleteTrace(req, uid);
  }
}
