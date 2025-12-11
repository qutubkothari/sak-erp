#!/usr/bin/env python3
"""
Generate SQL Import Scripts from Stock List 2024-2025.xlsx
Creates INSERT statements for items, vendors, BOMs, and stock
"""

import pandas as pd
import re
from datetime import datetime

def clean_string(s):
    """Clean string for SQL insertion"""
    if pd.isna(s) or s is None:
        return None
    s = str(s).strip()
    # Escape single quotes
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

def generate_item_code(name, index):
    """Generate item code from name"""
    if pd.isna(name):
        return f"ITEM-{index:04d}"
    # Remove special characters and take first 3 words
    clean_name = re.sub(r'[^a-zA-Z0-9\s]', '', str(name))
    words = clean_name.upper().split()[:3]
    code = '-'.join(words) if words else f"ITEM-{index:04d}"
    return code[:50]  # Limit length

# Read Excel file
print("Reading Excel file...")
xl = pd.ExcelFile('Stock List 2024-2025.xlsx')

# =============================================================================
# 1. GENERATE VENDORS SQL
# =============================================================================
print("\n=== Generating Vendors SQL ===")
rm_df = pd.read_excel(xl, 'RM', header=1)
suppliers = rm_df['SUPPLIER'].dropna().unique()

vendors_sql = []
vendors_sql.append("-- ============================================================================")
vendors_sql.append("-- INSERT VENDORS/SUPPLIERS")
vendors_sql.append("-- ============================================================================\n")

vendor_map = {}  # Map vendor name to ID for later use
for idx, supplier in enumerate(suppliers, start=1):
    clean_supplier = clean_string(supplier)
    if clean_supplier:
        vendor_code = re.sub(r'[^a-zA-Z0-9]', '', supplier.upper().replace(' ', '_'))[:20]
        vendor_map[supplier] = vendor_code
        
        vendors_sql.append(f"""INSERT INTO vendors (vendor_code, vendor_name, is_active, created_at, updated_at)
VALUES ('{vendor_code}', '{clean_supplier}', true, NOW(), NOW())
ON CONFLICT (vendor_code) DO NOTHING;
""")

# =============================================================================
# 2. GENERATE RAW MATERIALS SQL
# =============================================================================
print("=== Generating Raw Materials SQL ===")
rm_items_sql = []
rm_items_sql.append("\n-- ============================================================================")
rm_items_sql.append("-- INSERT RAW MATERIALS (Category: RM)")
rm_items_sql.append("-- ============================================================================\n")

rm_stock_sql = []
rm_stock_sql.append("\n-- ============================================================================")
rm_stock_sql.append("-- INSERT INITIAL STOCK FOR RAW MATERIALS")
rm_stock_sql.append("-- ============================================================================\n")

item_map = {}  # Map item name to code

for idx, row in rm_df.iterrows():
    item_name = clean_string(row['RAW MATERIAL NAME'])
    if not item_name:
        continue
    
    item_code = generate_item_code(item_name, idx + 1)
    uom = clean_string(row['UNIT OF MEASURE']) or 'PCS'
    cost = clean_number(row['COST']) or 0
    supplier = clean_string(row['SUPPLIER'])
    current_stock = clean_number(row['Current Stock']) or 0
    part_number = clean_string(row['PART #'])
    
    item_map[item_name] = item_code
    
    # Item INSERT
    rm_items_sql.append(f"""INSERT INTO items (item_code, item_name, category, uom, unit_price, is_active, created_at, updated_at)
VALUES ('{item_code}', '{item_name}', 'RM', '{uom}', {cost}, true, NOW(), NOW())
ON CONFLICT (item_code) DO NOTHING;
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
WHERE item_code = '{item_code}'
LIMIT 1;
""")

# =============================================================================
# 3. GENERATE SUB-ASSEMBLIES SQL
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
    
    sfg_items_sql.append(f"""INSERT INTO items (item_code, item_name, category, uom, is_active, created_at, updated_at)
VALUES ('{item_code}', '{item_name}', 'SA', '{uom}', true, NOW(), NOW())
ON CONFLICT (item_code) DO NOTHING;
""")

# =============================================================================
# 4. GENERATE BOM SQL (from S-BOM sheet)
# =============================================================================
print("=== Generating BOMs SQL ===")
bom_df = pd.read_excel(xl, 'S-BOM', header=1)
bom_sql = []
bom_sql.append("\n-- ============================================================================")
bom_sql.append("-- INSERT BOMS (Sub-Assembly Bill of Materials)")
bom_sql.append("-- ============================================================================\n")

# Group by SUB ASSEMBLY NAME
current_assembly = None
bom_number = None

for idx, row in bom_df.iterrows():
    assembly_name = clean_string(row['SUB ASSEMBLY NAME'])
    if not assembly_name or assembly_name == 'nan':
        continue
    
    # New assembly - create BOM header
    if assembly_name != current_assembly:
        current_assembly = assembly_name
        assembly_code = generate_item_code(assembly_name, idx + 2000)
        bom_number = f"BOM-{assembly_code}"
        
        bom_sql.append(f"""-- BOM for {assembly_name}
INSERT INTO bom_headers (bom_number, item_id, version, status, is_multi_level, created_at, updated_at)
SELECT '{bom_number}', id, '1.0', 'ACTIVE', false, NOW(), NOW()
FROM items 
WHERE item_name = '{assembly_name}' AND category IN ('SA', 'FG')
LIMIT 1
ON CONFLICT (bom_number) DO NOTHING;
""")
    
    # Add BOM items
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
  AND i.item_name = '{rm_name}'
LIMIT 1
ON CONFLICT DO NOTHING;
""")

# =============================================================================
# WRITE ALL SQL TO FILE
# =============================================================================
print("\n=== Writing SQL file ===")
output_file = 'import-data-from-excel.sql'

with open(output_file, 'w', encoding='utf-8') as f:
    f.write("-- ============================================================================\n")
    f.write("-- DATA IMPORT FROM Stock List 2024-2025.xlsx\n")
    f.write(f"-- Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n")
    f.write("-- ============================================================================\n")
    f.write("-- Instructions:\n")
    f.write("-- 1. Ensure backup is completed (backup-database-before-import.sql)\n")
    f.write("-- 2. Run this script in Supabase SQL Editor\n")
    f.write("-- 3. Verify data after import\n")
    f.write("-- ============================================================================\n\n")
    
    f.write("BEGIN;\n\n")
    
    # Write vendors
    f.write('\n'.join(vendors_sql))
    f.write('\n\n')
    
    # Write raw materials
    f.write('\n'.join(rm_items_sql))
    f.write('\n\n')
    
    # Write sub-assemblies
    f.write('\n'.join(sfg_items_sql))
    f.write('\n\n')
    # Write BOMs
    f.write('\n'.join(bom_sql))
    f.write('\n\n')
    
    # Write stock entries
    f.write('\n'.join(rm_stock_sql))
    f.write('\n\n')
    
    f.write("COMMIT;\n\n")
    f.write("-- ============================================================================\n")
    f.write("-- VERIFICATION QUERIES\n")
    f.write("-- ============================================================================\n\n")
    f.write("SELECT 'Vendors' as entity, COUNT(*) as count FROM vendors\n")
    f.write("UNION ALL\n")
    f.write("SELECT 'Items (RM)', COUNT(*) FROM items WHERE category = 'RM'\n")
    f.write("UNION ALL\n")
    f.write("SELECT 'Items (SA)', COUNT(*) FROM items WHERE category = 'SA'\n")
    f.write("UNION ALL\n")
    f.write("SELECT 'BOMs', COUNT(*) FROM bom_headers\n")
    f.write("UNION ALL\n")
    f.write("SELECT 'BOM Items', COUNT(*) FROM bom_items\n")
    f.write("UNION ALL\n")
    f.write("SELECT 'Stock Entries', COUNT(*) FROM stock_entries;\n")

print(f"\n✅ SQL file generated: {output_file}")
print(f"   - Vendors: {len(suppliers)}")
print(f"   - Raw Materials: {len(rm_df)}")
print(f"   - Sub-Assemblies: {len(sfg_df)}")
print(f"   - BOM Relationships: {len(bom_df)}")
print("\nRun this file in Supabase SQL Editor to import all data!")
