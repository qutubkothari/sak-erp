import { VendorsService, filterVendorSearchResults } from './vendors.service';

process.env.SUPABASE_URL = process.env.SUPABASE_URL || 'http://localhost:54321';
process.env.SUPABASE_KEY = process.env.SUPABASE_KEY || 'test-key';

describe('vendor register search and onboarding requirements', () => {
  it('matches only supported, explicit fields and returns visible match context', () => {
    const rows = filterVendorSearchResults([
      { id: '1', name: 'Horizon', code: 'VEN-1', email: 'accounts@example.com', metadata: { internal_token: 'h2-secret' } },
      { id: '2', name: 'Other', contact_person: 'H2 Contact', metadata: { alias: 'h2-hidden' } },
    ], 'h2');
    expect(rows).toEqual([{ id: '2', name: 'Other', contact_person: 'H2 Contact', metadata: { alias: 'h2-hidden' }, matched_on: ['Contact person'] }]);
  });

  it('filters before the caller takes a page and identifies non-obvious matches', () => {
    const rows = filterVendorSearchResults([
      { id: '1', name: 'Acme', code: 'VEN-1' },
      { id: '2', name: 'Supplier', email: 'orders@example.com' },
      { id: '3', name: 'Supplier 2', tax_id: 'GSTIN-H2' },
    ], 'example.com');
    expect(rows.map((row) => row.id)).toEqual(['2']);
    expect(rows[0].matched_on).toEqual(['Contact email']);
    expect(rows.slice(0, 1)).toHaveLength(1);
  });

  it('requires India documents separately from GSTIN validation and isolates other profiles', async () => {
    const service = new VendorsService();
    const maybeSingle = jest.fn().mockResolvedValue({ data: { market_profile: 'INDIA' }, error: null });
    (service as any).supabase = { from: jest.fn(() => ({ select: jest.fn(() => ({ eq: jest.fn(() => ({ maybeSingle })) })) })) };
    const vendor = { tax_id: '27AAPFU0939F1ZV', gst_verification: { valid: true }, attachments: [{ document_type: 'PAN' }] };
    await expect((service as any).missingRequiredDocuments('tenant-in', vendor)).resolves.toEqual(['GST Certificate']);
    maybeSingle.mockResolvedValue({ data: { market_profile: 'UAE' }, error: null });
    await expect((service as any).missingRequiredDocuments('tenant-uae', vendor)).resolves.toEqual([]);
  });

  it('blocks incomplete approval unless a privileged user confirms and explains the audited override', async () => {
    const service = new VendorsService();
    const vendor = { id: 'vendor-1', approval_status: 'PENDING', metadata: {} };
    jest.spyOn(service, 'findOne').mockResolvedValue(vendor as any);
    jest.spyOn(service as any, 'assertMakerChecker').mockImplementation(() => undefined);
    jest.spyOn(service as any, 'missingRequiredDocuments').mockResolvedValue(['PAN']);
    const update = jest.spyOn(service as any, 'updateVendorWithSchemaFallback').mockResolvedValue(undefined);
    const audit = jest.spyOn(service as any, 'logApprovalHistory').mockResolvedValue(undefined);

    await expect(service.setVerification('tenant-1', 'user-1', 'vendor-1', true, {
      overrideMakerChecker: false,
      overrideRequiredDocuments: true,
      overrideConfirmed: true,
      overrideReason: 'Emergency sourcing approved by procurement leadership',
    })).rejects.toThrow('Required documents missing: PAN');
    expect(update).not.toHaveBeenCalled();

    await service.setVerification('tenant-1', 'admin-1', 'vendor-1', true, {
      overrideMakerChecker: true,
      overrideRequiredDocuments: true,
      overrideConfirmed: true,
      overrideReason: 'Emergency sourcing approved by procurement leadership',
    });
    expect(update).toHaveBeenCalledWith('tenant-1', 'vendor-1', expect.objectContaining({ approval_status: 'APPROVED' }));
    expect(audit).toHaveBeenCalledWith(expect.objectContaining({
      action: 'DOCUMENT_REQUIREMENT_OVERRIDE',
      reason: 'Emergency sourcing approved by procurement leadership',
      metadata: expect.objectContaining({ requiredDocumentOverride: true, missingRequiredDocuments: ['PAN'] }),
    }));
  });
});
