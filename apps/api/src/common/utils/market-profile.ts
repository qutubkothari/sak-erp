export type MarketProfile = 'INDIA' | 'UAE' | 'EGYPT';

export type RegionalDefaults = {
  marketProfile: MarketProfile;
  currency: 'INR' | 'AED' | 'EGP';
  taxRegime: 'GST' | 'UAE_VAT' | 'EGYPT_VAT';
  defaultTaxRate: number;
  locale: string;
  timezone: string;
};

export const INDIA_DEFAULTS: RegionalDefaults = {
  marketProfile: 'INDIA',
  currency: 'INR',
  taxRegime: 'GST',
  defaultTaxRate: 18,
  locale: 'en-IN',
  timezone: 'Asia/Kolkata',
};

export const UAE_DEFAULTS: RegionalDefaults = {
  marketProfile: 'UAE',
  currency: 'AED',
  taxRegime: 'UAE_VAT',
  defaultTaxRate: 5,
  locale: 'en-AE',
  timezone: 'Asia/Dubai',
};

export const EGYPT_DEFAULTS: RegionalDefaults = {
  marketProfile: 'EGYPT',
  currency: 'EGP',
  taxRegime: 'EGYPT_VAT',
  defaultTaxRate: 14,
  locale: 'ar-EG',
  timezone: 'Africa/Cairo',
};

export function regionalDefaults(value?: unknown): RegionalDefaults {
  const market = String(value || '').trim().toUpperCase();
  return market === 'EGYPT' ? EGYPT_DEFAULTS : market === 'UAE' ? UAE_DEFAULTS : INDIA_DEFAULTS;
}
