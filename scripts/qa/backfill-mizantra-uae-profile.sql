-- TEST ONLY: Mizantra tenant regional profile. Never include in a production migration bundle.
DO $$
BEGIN
  UPDATE public.tenants
  SET market_profile = 'UAE',
      default_currency = 'AED',
      tax_regime = 'VAT',
      locale = 'en-AE',
      timezone = 'Asia/Dubai',
      updated_at = NOW()
  WHERE id = 'f87a5ab0-0619-4f1c-bab9-e78ca750e56c';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Mizantra test tenant not found; refusing broad market-profile backfill';
  END IF;
END $$;
