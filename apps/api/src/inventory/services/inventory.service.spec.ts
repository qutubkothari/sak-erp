import { BadRequestException } from '@nestjs/common';
import { InventoryService } from './inventory.service';

process.env.SUPABASE_URL = process.env.SUPABASE_URL || 'http://localhost:54321';
process.env.SUPABASE_KEY = process.env.SUPABASE_KEY || 'test-key';

describe('InventoryService low-stock purchasing', () => {
  const request = { user: { tenantId: 'tenant-1', userId: 'user-1' } } as any;

  it('groups selected items into one submitted PR per preferred supplier', async () => {
    const create = jest.fn()
      .mockResolvedValueOnce({ id: 'pr-1', pr_number: 'PR-001', status: 'AWAITING_APPROVAL' })
      .mockResolvedValueOnce({ id: 'pr-2', pr_number: 'PR-002', status: 'AWAITING_APPROVAL' });
    const service = new InventoryService({} as any, {} as any, { create } as any);
    jest.spyOn(service, 'getLowStockPlanning').mockResolvedValue({
      generated_at: '2026-07-15T00:00:00.000Z',
      summary: { low_stock: 3, missing_vendor: 0, covered_by_open_supply: 0 },
      items: [
        { item_id: 'item-1', item_code: 'ITEM-1', item_name: 'One', uom: 'NOS', available_qty: 0, reorder_level: 10, open_pr_qty: 0, open_po_qty: 0, preferred_vendor_id: 'vendor-a', preferred_vendor_name: 'Supplier A', preferred_price: 10, purchasable: true },
        { item_id: 'item-2', item_code: 'ITEM-2', item_name: 'Two', uom: 'NOS', available_qty: 2, reorder_level: 5, open_pr_qty: 0, open_po_qty: 0, preferred_vendor_id: 'vendor-a', preferred_vendor_name: 'Supplier A', preferred_price: 20, purchasable: true },
        { item_id: 'item-3', item_code: 'ITEM-3', item_name: 'Three', uom: 'MTR', available_qty: 0, reorder_level: 4, open_pr_qty: 0, open_po_qty: 0, preferred_vendor_id: 'vendor-b', preferred_vendor_name: 'Supplier B', preferred_price: 30, purchasable: true },
      ],
    } as any);

    const result = await service.createLowStockPurchaseRequisitions(request, {
      requiredDate: '2026-07-22',
      priority: 'HIGH',
      items: [
        { itemId: 'item-1', requiredQty: 10 },
        { itemId: 'item-2', requiredQty: 3 },
        { itemId: 'item-3', requiredQty: 4 },
      ],
    });

    expect(create).toHaveBeenCalledTimes(2);
    expect(create).toHaveBeenNthCalledWith(1, 'tenant-1', 'user-1', expect.objectContaining({
      status: 'SUBMITTED',
      requiredDate: '2026-07-22',
      priority: 'HIGH',
      purpose: 'Low stock replenishment - Supplier A',
      items: expect.arrayContaining([
        expect.objectContaining({ itemId: 'item-1', vendorId: 'vendor-a', requestedQty: 10 }),
        expect.objectContaining({ itemId: 'item-2', vendorId: 'vendor-a', requestedQty: 3 }),
      ]),
    }));
    expect(create).toHaveBeenNthCalledWith(2, 'tenant-1', 'user-1', expect.objectContaining({
      purpose: 'Low stock replenishment - Supplier B',
      items: [expect.objectContaining({ itemId: 'item-3', vendorId: 'vendor-b', requestedQty: 4 })],
    }));
    expect(result.created_prs).toHaveLength(2);
  });

  it('blocks purchasing when a preferred supplier is missing', async () => {
    const service = new InventoryService({} as any, {} as any, { create: jest.fn() } as any);
    jest.spyOn(service, 'getLowStockPlanning').mockResolvedValue({
      generated_at: '2026-07-15T00:00:00.000Z',
      summary: { low_stock: 1, missing_vendor: 1, covered_by_open_supply: 0 },
      items: [{ item_id: 'item-1', item_code: 'ITEM-1', purchasable: false, block_reason: 'Preferred supplier is not configured' }],
    } as any);

    await expect(service.createLowStockPurchaseRequisitions(request, {
      items: [{ itemId: 'item-1', requiredQty: 5 }],
    })).rejects.toBeInstanceOf(BadRequestException);
  });
});

describe('InventoryService stock movement numbering', () => {
  it('allocates after the highest global sequence instead of reusing a row-count gap', async () => {
    const service = new InventoryService({} as any, {} as any, {} as any);
    const query: any = {
      select: jest.fn(() => query),
      like: jest.fn(() => query),
      order: jest.fn(() => query),
      limit: jest.fn().mockResolvedValue({
        data: [{ movement_number: 'TRN-000142' }],
        error: null,
      }),
    };
    (service as any).supabase = { from: jest.fn(() => query) };

    const movementNumber = await (service as any).generateMovementNumber(
      { user: { tenantId: 'tenant-1' } },
      'TRANSFER',
    );

    expect(movementNumber).toBe('TRN-000143');
    expect(query.like).toHaveBeenCalledWith('movement_number', 'TRN-%');
    expect(query.order).toHaveBeenCalledWith('movement_number', { ascending: false });
  });
});

describe('InventoryService stock deduction fallback', () => {
  const stockRows = [
    { id: 'stock-1', quantity: 3, reserved_quantity: 1, available_quantity: 2, location_id: 'location-1' },
    { id: 'stock-2', quantity: 5, reserved_quantity: 0, available_quantity: 5, location_id: 'location-2' },
  ];

  const createService = () => {
    const selectQuery: any = {
      select: jest.fn(() => selectQuery),
      eq: jest.fn(() => selectQuery),
      order: jest.fn().mockResolvedValue({ data: stockRows, error: null }),
    };
    const updateQuery: any = {
      update: jest.fn(() => updateQuery),
      eq: jest.fn().mockResolvedValue({ error: null }),
    };
    const from = jest.fn()
      .mockReturnValueOnce(selectQuery)
      .mockReturnValue(updateQuery);
    const service = new InventoryService({} as any, {} as any, {} as any);
    (service as any).supabase = { from };
    return { service, from, updateQuery };
  };

  it('rejects a shortage before changing any stock row', async () => {
    const { service, from, updateQuery } = createService();

    await expect((service as any).adjustStockFallbackDirect({
      tenantId: 'tenant-1',
      itemId: 'item-1',
      warehouseId: 'warehouse-1',
      quantityChange: -8,
      category: 'RAW_MATERIAL',
    })).rejects.toThrow('Insufficient inventory stock');

    expect(from).toHaveBeenCalledTimes(1);
    expect(updateQuery.update).not.toHaveBeenCalled();
  });

  it('allocates a valid deduction across available stock rows without going negative', async () => {
    const { service, updateQuery } = createService();

    await (service as any).adjustStockFallbackDirect({
      tenantId: 'tenant-1',
      itemId: 'item-1',
      warehouseId: 'warehouse-1',
      quantityChange: -6,
      category: 'RAW_MATERIAL',
    });

    expect(updateQuery.update).toHaveBeenNthCalledWith(1, expect.objectContaining({ quantity: 1 }));
    expect(updateQuery.update).toHaveBeenNthCalledWith(2, expect.objectContaining({ quantity: 1 }));
  });
});
