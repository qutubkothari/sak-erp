import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards, Request } from '@nestjs/common';
import { DeploymentService } from './deployment.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CreateDeploymentDto, UpdateDeploymentDto, PublicDeploymentUpdateDto } from './dto/deployment.dto';

@Controller('api/v1/uid/deployment')
@UseGuards(JwtAuthGuard)
export class DeploymentController {
  constructor(private readonly deploymentService: DeploymentService) {}

  @Post()
  async create(@Request() req: any, @Body() dto: CreateDeploymentDto) {
    return this.deploymentService.createDeployment(
      req.user.tenantId,
      req.user.userId,
      dto,
    );
  }

  @Get()
  async findAll(
    @Request() req: any,
    @Query('uid_id') uidId?: string,
    @Query('organization') organization?: string,
    @Query('deployment_level') deploymentLevel?: string,
    @Query('is_current') isCurrent?: string,
  ) {
    return this.deploymentService.getDeployments(req.user.tenantId, {
      uid_id: uidId,
      organization,
      deployment_level: deploymentLevel,
      is_current: isCurrent === 'true' ? true : isCurrent === 'false' ? false : undefined,
    });
  }

  @Get(':id')
  async findOne(@Request() req: any, @Param('id') id: string) {
    return this.deploymentService.getDeploymentById(req.user.tenantId, id);
  }

  @Get('uid/:uidId/chain')
  async getChain(@Request() req: any, @Param('uidId') uidId: string) {
    return this.deploymentService.getDeploymentChain(req.user.tenantId, uidId);
  }

  @Get('uid/:uidId/current')
  async getCurrentLocation(@Request() req: any, @Param('uidId') uidId: string) {
    return this.deploymentService.getCurrentLocation(req.user.tenantId, uidId);
  }

  @Put(':id')
  async update(
    @Request() req: any,
    @Param('id') id: string,
    @Body() dto: UpdateDeploymentDto,
  ) {
    return this.deploymentService.updateDeployment(req.user.tenantId, id, dto);
  }

  @Post('uid/:uidId/set-current/:deploymentId')
  async setCurrentLocation(
    @Request() req: any,
    @Param('uidId') uidId: string,
    @Param('deploymentId') deploymentId: string,
  ) {
    return this.deploymentService.setCurrentLocation(
      req.user.tenantId,
      uidId,
      deploymentId,
    );
  }

  @Delete(':id')
  async delete(@Request() req: any, @Param('id') id: string) {
    return this.deploymentService.deleteDeployment(req.user.tenantId, id);
  }
}
