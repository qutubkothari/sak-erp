/** One query contract for the register and its full Excel export. */
export function poRegisterQuery(status: string, vendorId: string, search: string): string {
  const params = new URLSearchParams();
  if (status !== 'ALL') params.set('status', status);
  if (vendorId) params.set('vendorId', vendorId);
  if (search.trim()) params.set('search', search.trim());
  return params.toString();
}
