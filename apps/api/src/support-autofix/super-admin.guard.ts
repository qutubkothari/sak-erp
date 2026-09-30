import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { hasSuperAdminBypass } from '../auth/utils/permission-utils';

@Injectable()
export class SuperAdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    return hasSuperAdminBypass(context.switchToHttp().getRequest()?.user);
  }
}
