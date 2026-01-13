export const INVENTORY_CATEGORIES = [
  'RAW_MATERIAL',
  'WIP',
  'FINISHED_GOODS',
  'DEMO',
  'SERVICE_SPARES',
  'CONSUMABLES',
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
    CONSUMABLE: 'CONSUMABLES',
    CONSUMABLES: 'CONSUMABLES',

    // Item-master style categories -> inventory stock buckets
    COMPONENT: 'RAW_MATERIAL',
    RAW: 'RAW_MATERIAL',
    RAW_MATERIAL: 'RAW_MATERIAL',

    SUBASSEMBLY: 'WIP',
    SUB_ASSEMBLY: 'WIP',
    SUB_ASSEMBLIES: 'WIP',

    ASSEMBLY: 'WIP',
    ASSEMBLIES: 'WIP',

    FINISHED: 'FINISHED_GOODS',
    FINISHED_GOOD: 'FINISHED_GOODS',
    FINISHED_GOODS: 'FINISHED_GOODS',

    SPARE_PART: 'SERVICE_SPARES',
    SPARE_PARTS: 'SERVICE_SPARES',
    SERVICE: 'SERVICE_SPARES',
    SERVICE_SPARES: 'SERVICE_SPARES',

    PACKING_MATERIAL: 'CONSUMABLES',
    PACKING: 'CONSUMABLES',

    // Free-text groups seen in production data
    FASTENERS: 'RAW_MATERIAL',
    ELECTRONICS: 'RAW_MATERIAL',
    GENERAL: 'RAW_MATERIAL',
  };

  return mapped[key] ?? fallback;
}
