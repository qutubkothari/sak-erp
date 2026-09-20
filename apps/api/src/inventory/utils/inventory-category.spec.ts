import {
  normalizeInventoryCategory,
  normalizeInventoryStockCategory,
} from './inventory-category';

describe('inventory category normalization', () => {
  it('keeps the item-master consumable category singular', () => {
    expect(normalizeInventoryCategory('CONSUMABLES')).toBe('CONSUMABLE');
  });

  it('converts item-master categories to the inventory_stock enum', () => {
    expect(normalizeInventoryStockCategory('CONSUMABLE')).toBe('CONSUMABLES');
    expect(normalizeInventoryStockCategory('SUB_ASSEMBLY')).toBe('WIP');
  });

  it('accepts categories already stored in inventory_stock', () => {
    expect(normalizeInventoryStockCategory('CONSUMABLES')).toBe('CONSUMABLES');
    expect(normalizeInventoryStockCategory('SERVICE_SPARES')).toBe('SERVICE_SPARES');
  });
});
