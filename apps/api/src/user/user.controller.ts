import { Controller, Get, Post, Put, Delete, Body, Param, Request, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { UserService } from './user.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RequireDelete, RequireCreate, RequireRead, RequireUpdate, RequireApprove } from '../auth/decorators/permissions.decorator';

@ApiTags('Users')
@Controller('users')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get()
  @RequireRead('users')
  @ApiOperation({ summary: 'Get all users in tenant' })
  @ApiResponse({ status: 200, description: 'List of users' })
  async findAll(@Request() req: any) {
    return this.userService.findAll(req.user.tenantId);
  }

  @Get(':id')
  @RequireRead('users')
  @ApiOperation({ summary: 'Get user by ID' })
  @ApiResponse({ status: 200, description: 'User found' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async findOne(@Param('id') id: string, @Request() req: any) {
    return this.userService.findOne(id, req.user.tenantId);
  }

  @Post()
  @ApiOperation({ summary: 'Create new user' })
  @ApiResponse({ status: 201, description: 'User created successfully' })
  @ApiResponse({ status: 409, description: 'User already exists' })
  @RequireCreate('users')
  async create(@Body() dto: any, @Request() req: any) {
    return this.userService.create({ ...dto, tenantId: req.user.tenantId }, req.user.userId || req.user.id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update user' })
  @ApiResponse({ status: 200, description: 'User updated successfully' })
  @ApiResponse({ status: 404, description: 'User not found' })
  @RequireUpdate('users')
  async update(@Param('id') id: string, @Body() dto: any, @Request() req: any) {
    return this.userService.update(id, dto, req.user.tenantId, req.user.userId || req.user.id);
  }

  @Get('role-approvals/pending')
  @RequireRead('users')
  async pendingRoleApprovals(@Request() req: any) {
    return this.userService.roleApprovalRequests(req.user.tenantId, 'PENDING');
  }

  @Post('role-approvals/:requestId/approve')
  @RequireApprove('users')
  async approveRoles(@Param('requestId') requestId: string, @Body() dto: any, @Request() req: any) {
    return this.userService.decideRoleRequest(requestId, req.user.tenantId, req.user.userId || req.user.id, true, dto?.note);
  }

  @Post('role-approvals/:requestId/reject')
  @RequireApprove('users')
  async rejectRoles(@Param('requestId') requestId: string, @Body() dto: any, @Request() req: any) {
    return this.userService.decideRoleRequest(requestId, req.user.tenantId, req.user.userId || req.user.id, false, dto?.note);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete user' })
  @ApiResponse({ status: 200, description: 'User deleted successfully' })
  @ApiResponse({ status: 404, description: 'User not found' })
  @RequireDelete('users')
  async delete(@Param('id') id: string, @Request() req: any) {
    return this.userService.delete(id, req.user.tenantId);
  }
}
