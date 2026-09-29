import { egyptArabicPlannerEnabled } from './egypt-arabic-planner';
import { EGYPT_ARABIC_ROUTING_GUIDANCE, EGYPT_ARABIC_RESPONSE_GUIDANCE, preserveVerifiedCurrencyCodes } from './egypt-arabic-language-pack';

describe('Egyptian Arabic planner profile', () => {
  it('requires Egypt and an explicit tenant feature flag', () => {
    expect(egyptArabicPlannerEnabled({ market_profile: 'EGYPT', settings: { features: { egyptArabicPlanner: true } } })).toBe(true);
    expect(egyptArabicPlannerEnabled({ market_profile: 'INDIA', settings: { features: { egyptArabicPlanner: true } } })).toBe(false);
    expect(egyptArabicPlannerEnabled({ market_profile: 'EGYPT', settings: {} })).toBe(false);
  });

  it('keeps read-only requests separate from mutations and preserves currency codes', () => {
    expect(EGYPT_ARABIC_ROUTING_GUIDANCE).toContain('REPORT');
    expect(EGYPT_ARABIC_ROUTING_GUIDANCE).toContain('GOODS_RECEIPT');
    expect(EGYPT_ARABIC_RESPONSE_GUIDANCE).toContain('EGP');
    expect(preserveVerifiedCurrencyCodes('1250 جنيه مصري', '1250 EGP')).toBe('1250 EGP');
    expect(preserveVerifiedCurrencyCodes('1250 جنيه مصري', '1250 USD')).toBe('1250 جنيه مصري');
  });
});
