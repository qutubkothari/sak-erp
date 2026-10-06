import { Module } from '@nestjs/common';
import { UserController } from './user.controller';
import { UserService } from './user.service';
import { RoleController } from './role.controller';
import { RoleService } from './role.service';
import { AuditModule } from '../audit/audit.module';

@Module({
  controllers: [UserController, RoleController],
  imports: [AuditModule],
  providers: [UserService, RoleService],
  exports: [UserService, RoleService],
})
export class UserModule {}
