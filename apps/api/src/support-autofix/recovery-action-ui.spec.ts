import { canRenderInfrastructureRecoveryAction } from '../../../web/lib/support-autofix-recovery';

describe('AutoHeal infrastructure recovery action visibility', () => {
  it('shows only for an existing central support admin when backend eligibility is true', () => {
    expect(canRenderInfrastructureRecoveryAction(true, { eligible: true })).toBe(true);
    expect(canRenderInfrastructureRecoveryAction(false, { eligible: true })).toBe(false);
    expect(canRenderInfrastructureRecoveryAction(undefined, { eligible: true })).toBe(false);
    expect(canRenderInfrastructureRecoveryAction(true, { eligible: false })).toBe(false);
    expect(canRenderInfrastructureRecoveryAction(true, undefined)).toBe(false);
  });
});
