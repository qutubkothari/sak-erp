import { Body, Controller, Get, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { SkipAutomaticAudit } from '../audit/skip-automatic-audit.decorator';
import { AutoQaService } from './autoqa.service';

@Controller('autoqa/admin')
@UseGuards(JwtAuthGuard)
@SkipAutomaticAudit()
export class AutoQaController {
  constructor(private readonly autoqa:AutoQaService){}
  @Get() list(@Req() req:any,@Query() query:any){return this.autoqa.list(req.user,{profileWide:String(query.profileWide||'')==='true',tenantId:query.tenantId,status:query.status,limit:query.limit});}
  @Post('run') start(@Req() req:any,@Body() body:any){return this.autoqa.startRun(req.user,body?.profileWide===true);}
  @Get('runs/:id') run(@Req() req:any,@Param('id') id:string){return this.autoqa.getRun(req.user,id);}
  @Patch('findings/:id/acknowledge') acknowledge(@Req() req:any,@Param('id') id:string){return this.autoqa.acknowledge(req.user,id);}
}
