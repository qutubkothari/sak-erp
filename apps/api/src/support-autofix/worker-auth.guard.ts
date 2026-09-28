import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { timingSafeEqual } from 'crypto';

@Injectable()
export class AutoHealWorkerGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const expected = String(process.env.AUTOHEAL_WORKER_API_TOKEN || '');
    const supplied = String(context.switchToHttp().getRequest().headers.authorization || '').replace(/^Bearer\s+/i, '');
    const expectedBytes = Buffer.from(expected);
    const suppliedBytes = Buffer.from(supplied);
    if (expectedBytes.length < 32 || !supplied || expectedBytes.length !== suppliedBytes.length || !timingSafeEqual(expectedBytes, suppliedBytes)) {
      throw new UnauthorizedException('Invalid AutoHeal worker credentials.');
    }
    return true;
  }
}
