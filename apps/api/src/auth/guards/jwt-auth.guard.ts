import { ForbiddenException, Injectable, ExecutionContext } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Reflector } from '@nestjs/core';
import { isObservable, lastValueFrom, Observable } from 'rxjs';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private reflector: Reflector) {
    super();
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Check if route is marked as public
    const isPublic = this.reflector.getAllAndOverride<boolean>('isPublic', [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    const authenticated = super.canActivate(context);
    const allowed = isObservable(authenticated) ? await lastValueFrom(authenticated) : await authenticated;
    const request = context.switchToHttp().getRequest();
    const path = String(request.originalUrl || request.url || '').split('?')[0];
    if (request.user?.must_change_password && !path.endsWith('/auth/change-password')) {
      throw new ForbiddenException('Change your temporary password before continuing.');
    }
    return Boolean(allowed);
  }
}
