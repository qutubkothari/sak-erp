import { BadRequestException } from '@nestjs/common';
import { ImportFilesService } from './import-files.service';

describe('Import file GRN linkage', () => {
  const tenantId = 'tenant-1';
  const fileId = 'file-1';
  const grnId = 'grn-1';

  function serviceFor(poId: string) {
    const service = Object.create(ImportFilesService.prototype) as ImportFilesService;
    const select = jest.fn().mockReturnThis();
    const eq = jest.fn().mockReturnThis();
    const maybeSingle = jest.fn().mockResolvedValue({
      data: { id: grnId, grn_number: 'GRN-TEST', po_id: poId }, error: null,
    });
    const single = jest.fn().mockResolvedValue({ data: { id: 'link-1', allocation_basis: 'VALUE' }, error: null });
    const upsert = jest.fn().mockReturnValue({ select: jest.fn().mockReturnValue({ single }) });
    const from = jest.fn().mockImplementation((table: string) => table === 'grns'
      ? { select, eq, maybeSingle }
      : { upsert });
    (service as any).supabase = { from };
    jest.spyOn(service, 'one').mockResolvedValue({ po_id: 'po-1' } as any);
    (service as any).event = jest.fn().mockResolvedValue(undefined);
    return { service, select, upsert };
  }

  it('links a GRN using the actual grns.po_id column', async () => {
    const { service, select, upsert } = serviceFor('po-1');
    await service.linkGrn(tenantId, fileId, 'user-1', { grnId, allocatedLandedCost: 10 });
    expect(select).toHaveBeenCalledWith('id,grn_number,po_id');
    expect(upsert).toHaveBeenCalledWith(expect.objectContaining({ grn_id: grnId }), expect.anything());
  });

  it('rejects a GRN belonging to another PO', async () => {
    const { service, upsert } = serviceFor('po-2');
    await expect(service.linkGrn(tenantId, fileId, 'user-1', { grnId })).rejects.toBeInstanceOf(BadRequestException);
    expect(upsert).not.toHaveBeenCalled();
  });
});
