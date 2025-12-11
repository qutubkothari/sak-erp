#!/usr/bin/env python3
"""
UPDATED: Generate SQL Import Scripts with Item-Vendor Relationships
Handles multiple vendors per item (e.g., "Robu / Vyom" = 2 vendors)
"""

import pandas as pd
import re
from datetime import datetime

def clean_string(s):
    """Clean string for SQL insertion"""
    if pd.isna(s) or s is None:
        return None
    s = str(s).strip()
    s = s.replace("'", "''")
    return s if s else None

def clean_number(n):
    """Clean number for SQL insertion"""
    if pd.isna(n) or n is None or n == '':
        return None
    try:
        return float(n)
    except:
        return None

def split_vendors(vendor_string):
    """Split vendor string by / or , and return list of vendor names"""
    if pd.isna(vendor_string) or not vendor_string:
        return []
    # Split by / or , and clean each vendor
    vendors = re.split(r'[/,]', str(vendor_string))
    return [v.strip() for v in vendors if v.strip()]

def generate_code(name):
    """Generate vendor code from name"""
    return re.sub(r'[^a-zA-Z0-9]', '', name.upper().replace(' ', '_'))[:20]

def generate_item_code(name, index):
    """Generate item code from name"""
    if pd.isna(name):
        return f"ITEM-{index:04d}"
    clean_name = re.sub(r'[^a-zA-Z0-9\s]', '', str(name))
    words = clean_name.upper().split()[:3]
    code = '-'.join(words) if words else f"ITEM-{index:04d}"
    return code[:50]

# Read Excel file
print("Reading Excel file...")
xl = pd.ExcelFile('Stock List 2024-2025.xlsx')

# =============================================================================
# 1. EXTRACT ALL UNIQUE VENDORS (Split multi-vendor entries)
# =============================================================================
print("\n=== Extracting Vendors ===")
rm_df = pd.read_excel(xl, 'RM', header=1)

all_vendors = set()
for vendor_str in rm_df['SUPPLIER'].dropna():
    vendors_list = split_vendors(vendor_str)
    all_vendors.update(vendors_list)

all_vendors = sorted(list(all_vendors))
print(f"Found {len(all_vendors)} unique vendors (after splitting multi-vendor entries)")

# =============================================================================
# 2. GENERATE VENDORS SQL
# =============================================================================
vendors_sql = []
vendors_sql.append("-- ============================================================================")
vendors_sql.append("-- INSERT VENDORS/SUPPLIERS (with multi-vendor support)")
vendors_sql.append("-- ============================================================================\n")

vendor_map = {}  # Map vendor name to code
for vendor in all_vendors:
    clean_vendor = clean_string(vendor)
    if clean_vendor:
        vendor_code = generate_code(vendor)
        vendor_map[vendor] = vendor_code
        
        vendors_sql.append(f"""INSERT INTO vendors (tenant_id, code, name, legal_name, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    '{vendor_code}',
    '{clean_vendor}',
    '{clean_vendor}',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM vendors WHERE code = '{vendor_code}'
);
""")

# =============================================================================
# 3. GENERATE RAW MATERIALS SQL
# =============================================================================
print("=== Generating Raw Materials SQL ===")
rm_items_sql = []
rm_items_sql.append("\n-- ============================================================================")
rm_items_sql.append("-- INSERT RAW MATERIALS (Category: RM)")
rm_items_sql.append("-- ============================================================================\n")

item_vendors_sql = []
item_vendors_sql.append("\n-- ============================================================================")
item_vendors_sql.append("-- INSERT ITEM-VENDOR RELATIONSHIPS")
item_vendors_sql.append("-- Priority 1 = Preferred Vendor, 2+ = Alternate Vendors")
item_vendors_sql.append("-- ============================================================================\n")

rm_stock_sql = []
rm_stock_sql.append("\n-- ============================================================================")
rm_stock_sql.append("-- INSERT INITIAL STOCK FOR RAW MATERIALS")
rm_stock_sql.append("-- ============================================================================\n")

item_map = {}

for idx, row in rm_df.iterrows():
    item_name = clean_string(row['RAW MATERIAL NAME'])
    if not item_name:
        continue
    
    item_code = generate_item_code(item_name, idx + 1)
    uom = clean_string(row['UNIT OF MEASURE']) or 'PCS'
    cost = clean_number(row['COST']) or 0
    vendor_string = clean_string(row['SUPPLIER'])
    current_stock = clean_number(row['Current Stock']) or 0
    part_number = clean_string(row['PART #'])
    
    item_map[item_name] = item_code
    
    # Item INSERT
    rm_items_sql.append(f"""INSERT INTO items (tenant_id, code, name, type, uom, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    '{item_code}',
    '{item_name}',
    'RAW_MATERIAL',
    '{uom}',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM items WHERE code = '{item_code}'
);
""")
    
    # Item-Vendor Relationships
    if vendor_string:
        vendors_list = split_vendors(vendor_string)
        for priority, vendor_name in enumerate(vendors_list, start=1):
            vendor_code = vendor_map.get(vendor_name)
            if vendor_code:
                item_vendors_sql.append(f"""-- {item_name} → {vendor_name} (Priority {priority})
INSERT INTO item_vendors (item_id, vendor_id, priority, unit_price, is_active, created_at, updated_at)
SELECT 
    i.id,
    v.id,
    {priority},
    {cost if priority == 1 else 'NULL'},
    true,
    NOW(),
    NOW()
FROM items i
CROSS JOIN vendors v
WHERE i.code = '{item_code}'
  AND v.code = '{vendor_code}'
  AND NOT EXISTS (
      SELECT 1 FROM item_vendors WHERE item_id = i.id AND vendor_id = v.id
  )
LIMIT 1;
""")
    
    # Stock entry INSERT (if stock > 0)
    if current_stock > 0:
        rm_stock_sql.append(f"""-- Stock for {item_name}
INSERT INTO stock_entries (
    item_id, 
    quantity, 
    transaction_type, 
    reference_type, 
    reference_number, 
    notes,
    created_at
)
SELECT 
    id,
    {current_stock},
    'IN',
    'OPENING_STOCK',
    'INITIAL-IMPORT',
    'Imported from Stock List 2024-2025.xlsx',
    NOW()
FROM items 
WHERE code = '{item_code}'
  AND NOT EXISTS (
      SELECT 1 FROM stock_entries 
      WHERE item_id = items.id 
        AND reference_type = 'OPENING_STOCK'
        AND reference_number = 'INITIAL-IMPORT'
  )
LIMIT 1;
""")

# =============================================================================
# 4. GENERATE SUB-ASSEMBLIES SQL
# =============================================================================
print("=== Generating Sub-Assemblies SQL ===")
sfg_df = pd.read_excel(xl, 'CombineSFG')
sfg_items_sql = []
sfg_items_sql.append("\n-- ============================================================================")
sfg_items_sql.append("-- INSERT SUB-ASSEMBLIES (Category: SA)")
sfg_items_sql.append("-- ============================================================================\n")

for idx, row in sfg_df.iterrows():
    item_name = clean_string(row['SEMI FINISHED GOODS'])
    if not item_name or item_name == 'nan':
        continue
    
    item_code = generate_item_code(item_name, idx + 1000)
    uom = clean_string(row['UoM']) or 'PCS'
    
    item_map[item_name] = item_code
    
    sfg_items_sql.append(f"""INSERT INTO items (tenant_id, code, name, type, uom, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    '{item_code}',
    '{item_name}',
    'SUB_ASSEMBLY',
    '{uom}',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM items WHERE code = '{item_code}'
);
""")

# =============================================================================
# 5. GENERATE BOM SQL
# =============================================================================
print("=== Generating BOMs SQL ===")
bom_df = pd.read_excel(xl, 'S-BOM', header=1)
bom_sql = []
bom_sql.append("\n-- ============================================================================")
bom_sql.append("-- INSERT BOMS (Sub-Assembly Bill of Materials)")
bom_sql.append("-- ============================================================================\n")

current_assembly = None
bom_number = None

for idx, row in bom_df.iterrows():
    assembly_name = clean_string(row['SUB ASSEMBLY NAME'])
    if not assembly_name or assembly_name == 'nan':
        continue
    
    if assembly_name != current_assembly:
        current_assembly = assembly_name
        assembly_code = generate_item_code(assembly_name, idx + 2000)
        bom_number = f"BOM-{assembly_code}"
        
        bom_sql.append(f"""-- BOM for {assembly_name}
INSERT INTO bom_headers (bom_number, item_id, version, status, is_multi_level, created_at, updated_at)
SELECT '{bom_number}', id, '1.0', 'ACTIVE', false, NOW(), NOW()
FROM items 
WHERE name = '{assembly_name}' AND type IN ('SUB_ASSEMBLY', 'FINISHED_GOOD')
  AND NOT EXISTS (SELECT 1 FROM bom_headers WHERE bom_number = '{bom_number}')
LIMIT 1;
""")
    
    rm_name = clean_string(row['RAW MATERIAL NAME'])
    if rm_name and rm_name != 'nan':
        quantity = clean_number(row['UNITS']) or 1
        uom = clean_string(row['UoM']) or 'PCS'
        
        bom_sql.append(f"""INSERT INTO bom_items (bom_id, item_id, quantity, uom, created_at, updated_at)
SELECT 
    bh.id,
    i.id,
    {quantity},
    '{uom}',
    NOW(),
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.bom_number = '{bom_number}'
  AND i.name = '{rm_name}'
  AND NOT EXISTS (
      SELECT 1 FROM bom_items WHERE bom_id = bh.id AND item_id = i.id
  )
LIMIT 1;
""")

# =============================================================================
# WRITE ALL SQL TO FILE
# =============================================================================
print("\n=== Writing SQL file ===")
output_file = 'import-data-from-excel-with-vendors.sql'

with open(output_file, 'w', encoding='utf-8') as f:
    f.write("-- ============================================================================\n")
    f.write("-- DATA IMPORT FROM Stock List 2024-2025.xlsx\n")
    f.write("-- WITH ITEM-VENDOR RELATIONSHIPS SUPPORT\n")
    f.write(f"-- Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n")
    f.write("-- ============================================================================\n")
    f.write("-- Features:\n")
    f.write("-- - Splits multi-vendor entries (e.g., 'Robu / Vyom' → 2 vendors)\n")
    f.write("-- - Priority 1 = Preferred vendor\n")
    f.write("-- - Priority 2+ = Alternate vendors\n")
    f.write("-- - Enables auto-selection in PR creation\n")
    f.write("-- ============================================================================\n")
    f.write("-- Prerequisites:\n")
    f.write("-- 1. Run backup-database-before-import.sql\n")
    f.write("-- 2. Run add-item-vendor-relationships.sql (creates item_vendors table)\n")
    f.write("-- 3. Then run this script\n")
    f.write("-- ============================================================================\n\n")
    
    f.write("BEGIN;\n\n")
    
    f.write('\n'.join(vendors_sql))
    f.write('\n\n')
    
    f.write('\n'.join(rm_items_sql))
    f.write('\n\n')
    
    f.write('\n'.join(sfg_items_sql))
    f.write('\n\n')
    
    f.write('\n'.join(item_vendors_sql))
    f.write('\n\n')
    
    f.write('\n'.join(bom_sql))
    f.write('\n\n')
    
    f.write('\n'.join(rm_stock_sql))
    f.write('\n\n')
    
    f.write("COMMIT;\n\n")
    f.write("-- ============================================================================\n")
    f.write("-- VERIFICATION QUERIES\n")
    f.write("-- ============================================================================\n\n")
    f.write("SELECT 'Vendors' as entity, COUNT(*) as count FROM vendors\n")
    f.write("UNION ALL\n")
    f.write("SELECT 'Items (RM)', COUNT(*) FROM items WHERE type = 'RAW_MATERIAL'\n")
    f.write("UNION ALL\n")
    f.write("SELECT 'Items (SA)', COUNT(*) FROM items WHERE type = 'SUB_ASSEMBLY'\n")
    f.write("UNION ALL\n")
    f.write("SELECT 'Item-Vendor Links', COUNT(*) FROM item_vendors\n")
    f.write("UNION ALL\n")
    f.write("SELECT 'BOMs', COUNT(*) FROM bom_headers\n")
    f.write("UNION ALL\n")
    f.write("SELECT 'BOM Items', COUNT(*) FROM bom_items\n")
    f.write("UNION ALL\n")
    f.write("SELECT 'Stock Entries', COUNT(*) FROM stock_entries;\n\n")
    
    f.write("-- Show items with multiple vendors\n")
    f.write("SELECT \n")
    f.write("    i.code,\n")
    f.write("    i.name,\n")
    f.write("    COUNT(iv.vendor_id) as vendor_count,\n")
    f.write("    STRING_AGG(v.name || ' (P' || iv.priority || ')', ', ' ORDER BY iv.priority) as vendors\n")
    f.write("FROM items i\n")
    f.write("INNER JOIN item_vendors iv ON i.id = iv.item_id\n")
    f.write("INNER JOIN vendors v ON iv.vendor_id = v.id\n")
    f.write("GROUP BY i.id, i.code, i.name\n")
    f.write("HAVING COUNT(iv.vendor_id) > 1\n")
    f.write("ORDER BY vendor_count DESC, i.name\n")
    f.write("LIMIT 20;\n")

print(f"\n✅ SQL file generated: {output_file}")
print(f"   - Vendors: {len(all_vendors)} (after splitting)")
print(f"   - Raw Materials: {len(rm_df)}")
print(f"   - Sub-Assemblies: {len(sfg_df)}")
print(f"   - BOM Relationships: {len(bom_df)}")
print("\nIMPORTANT: Run add-item-vendor-relationships.sql FIRST!")
print("Then run this file in Supabase SQL Editor")
