export const INVENTORY_CATEGORIES = [
  'RAW_MATERIAL',
  'CAPITAL_GOODS',
  'CONSUMABLE',
  'PACKING_MATERIAL',
  'SERVICES',
] as const;

export type InventoryCategory = (typeof INVENTORY_CATEGORIES)[number];

const INVENTORY_CATEGORY_SET = new Set<string>(INVENTORY_CATEGORIES);

const normalizeKey = (value: unknown) =>
  String(value || '')
    .trim()
    .toUpperCase()
    .replace(/[\s-]+/g, '_');

export function normalizeInventoryCategory(
  value: unknown,
  fallback: InventoryCategory = 'RAW_MATERIAL',
): InventoryCategory {
  const key = normalizeKey(value);
  if (!key) return fallback;
  if (INVENTORY_CATEGORY_SET.has(key)) return key as InventoryCategory;

  const mapped: Record<string, InventoryCategory> = {
    // Common plural/singular mismatches
    CONSUMABLES: 'CONSUMABLE',
    PACKING: 'PACKING_MATERIAL',
    SERVICE: 'SERVICES',
    CAPITAL_GOOD: 'CAPITAL_GOODS',
    RAW_MATERIALS: 'RAW_MATERIAL',
  };

  return mapped[key] ?? fallback;
}
