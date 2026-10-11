/** Base currency for a dedicated tenant runtime; explicit document currencies take precedence. */
export function runtimeBaseCurrency(): 'AED' | 'EGP' {
  return String(process.env.ERP_TENANT_PROFILE || '').toUpperCase() === 'ARWA' ? 'EGP' : 'AED';
}

export function runtimeBaseCountry(): 'AE' | 'EG' {
  return runtimeBaseCurrency() === 'EGP' ? 'EG' : 'AE';
}
