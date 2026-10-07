import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

describe('tenant profile isolation', () => {
  it('keeps Mizantra on UAE defaults without changing SAIFSEAS or ARWA profiles', () => {
    const profiles = JSON.parse(readFileSync(resolve(__dirname, '../../../../../tenant/profiles.json'), 'utf8'));
    expect(profiles.MIZANTRA).toEqual(expect.objectContaining({
      country: 'AE', marketProfile: 'UAE', currency: 'AED', locale: 'en-AE', timezone: 'Asia/Dubai',
    }));
    expect(profiles.SAIFSEAS).toEqual(expect.objectContaining({
      country: 'IN', marketProfile: 'INDIA', currency: 'INR', timezone: 'Asia/Kolkata',
    }));
    expect(profiles.ARWA).toEqual(expect.objectContaining({
      country: 'EG', marketProfile: 'EGYPT', currency: 'EGP', timezone: 'Africa/Cairo',
    }));
  });
});
