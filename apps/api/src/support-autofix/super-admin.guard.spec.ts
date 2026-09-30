import 'reflect-metadata';
import { ExecutionContext } from '@nestjs/common';
import { ActivePlannerController } from '../intelligence/active-planner.controller';
import { SupportAutofixController } from './support-autofix.controller';
import { SuperAdminGuard } from './super-admin.guard';

const contextFor = (user: unknown) => ({
  switchToHttp: () => ({ getRequest: () => ({ user }) }),
} as unknown as ExecutionContext);

describe('AutoHeal Super Admin boundary', () => {
  const guard = new SuperAdminGuard();

  it('accepts only an exact Super Admin role', () => {
    expect(guard.canActivate(contextFor({ role: { name: 'Super Admin' } }))).toBe(true);
    expect(guard.canActivate(contextFor({ roles: [{ role: { name: 'SUPER_ADMIN' } }] }))).toBe(true);
    expect(guard.canActivate(contextFor({ role: { name: 'ADMIN' }, permissions: ['support_autofix:approve'] }))).toBe(false);
    expect(guard.canActivate(contextFor({ role: { name: 'OWNER' } }))).toBe(false);
    expect(guard.canActivate(contextFor(null))).toBe(false);
  });

  it('guards every AutoHeal admin endpoint and admin screenshot download', () => {
    const adminMethods = [
      'workerHealth', 'configuration', 'list', 'get', 'retry', 'resolve',
      'retryInfrastructure', 'approve', 'reject', 'rollback',
    ] as const;
    for (const name of adminMethods) {
      const guards = Reflect.getMetadata('__guards__', SupportAutofixController.prototype[name]) || [];
      expect(guards).toContain(SuperAdminGuard);
    }
    const screenshotGuards = Reflect.getMetadata(
      '__guards__', ActivePlannerController.prototype.supportScreenshotForAdmin,
    ) || [];
    expect(screenshotGuards).toContain(SuperAdminGuard);
  });
});
