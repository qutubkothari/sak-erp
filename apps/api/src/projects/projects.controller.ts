import { Body, Controller, Get, Param, Post, Put, Query, Request, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RequireCreate, RequireUpdate } from '../auth/decorators/permissions.decorator';
import { ProjectsService } from './projects.service';

@Controller('projects')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class ProjectsController {
  constructor(private readonly projectsService: ProjectsService) {}

  @Get()
  findAll(@Request() req: any, @Query() query: any) {
    return this.projectsService.findAll(req.user.tenantId, query);
  }

  @Post()
  @RequireCreate('projects')
  create(@Request() req: any, @Body() body: any) {
    return this.projectsService.create(req.user.tenantId, req.user.userId, body);
  }

  @Get(':id/trail')
  trail(@Request() req: any, @Param('id') id: string) {
    return this.projectsService.trail(req.user.tenantId, id);
  }

  @Get(':id')
  findOne(@Request() req: any, @Param('id') id: string) {
    return this.projectsService.findOne(req.user.tenantId, id);
  }

  @Put(':id')
  @RequireUpdate('projects')
  update(@Request() req: any, @Param('id') id: string, @Body() body: any) {
    return this.projectsService.update(req.user.tenantId, id, body);
  }
}
