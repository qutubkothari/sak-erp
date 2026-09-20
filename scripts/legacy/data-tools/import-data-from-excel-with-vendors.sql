-- ============================================================================
-- DATA IMPORT FROM Stock List 2024-2025.xlsx
-- WITH ITEM-VENDOR RELATIONSHIPS SUPPORT
-- Generated: 2025-12-11 13:28:38
-- ============================================================================
-- Features:
-- - Splits multi-vendor entries (e.g., 'Robu / Vyom' → 2 vendors)
-- - Priority 1 = Preferred vendor
-- - Priority 2+ = Alternate vendors
-- - Enables auto-selection in PR creation
-- ============================================================================
-- Prerequisites:
-- 1. Run backup-database-before-import.sql
-- 2. Run add-item-vendor-relationships.sql (creates item_vendors table)
-- 3. Then run this script
-- ============================================================================

-- Ensure item_type enum exists
DO $$ BEGIN
    CREATE TYPE item_type AS ENUM ('RAW_MATERIAL', 'COMPONENT', 'SUB_ASSEMBLY', 'FINISHED_GOODS', 'CONSUMABLE', 'TOOL', 'SERVICE');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

BEGIN;

-- ============================================================================
-- INSERT VENDORS/SUPPLIERS (with multi-vendor support)
-- ============================================================================

INSERT INTO vendors (tenant_id, code, name, legal_name, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    'ARBACCESSORIES',
    'ARB Accessories',
    'ARB Accessories',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM vendors WHERE code = 'ARBACCESSORIES'
);

INSERT INTO vendors (tenant_id, code, name, legal_name, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    'AGARWALALUMINIUM',
    'Agarwal Aluminium',
    'Agarwal Aluminium',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM vendors WHERE code = 'AGARWALALUMINIUM'
);

INSERT INTO vendors (tenant_id, code, name, legal_name, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    'ALIIRANIKOLKATA',
    'Ali Irani - Kolkata',
    'Ali Irani - Kolkata',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM vendors WHERE code = 'ALIIRANIKOLKATA'
);

INSERT INTO vendors (tenant_id, code, name, legal_name, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    'ALIHUSSAINBHARMAL',
    'AliHussain Bharmal',
    'AliHussain Bharmal',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM vendors WHERE code = 'ALIHUSSAINBHARMAL'
);

INSERT INTO vendors (tenant_id, code, name, legal_name, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    'AMPOWERINDIA',
    'Ampower India',
    'Ampower India',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM vendors WHERE code = 'AMPOWERINDIA'
);

INSERT INTO vendors (tenant_id, code, name, legal_name, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    'ATTITUDEMASTERVIZAG',
    'Attitude Master Vizag',
    'Attitude Master Vizag',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM vendors WHERE code = 'ATTITUDEMASTERVIZAG'
);

INSERT INTO vendors (tenant_id, code, name, legal_name, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    'BAGNAN',
    'Bagnan',
    'Bagnan',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM vendors WHERE code = 'BAGNAN'
);

INSERT INTO vendors (tenant_id, code, name, legal_name, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    'BALAJIPBMANUFACTURIN',
    'Balaji - PB Manufacturing',
    'Balaji - PB Manufacturing',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM vendors WHERE code = 'BALAJIPBMANUFACTURIN'
);

INSERT INTO vendors (tenant_id, code, name, legal_name, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    'BLUEROBOTICS',
    'BlueRobotics',
    'BlueRobotics',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM vendors WHERE code = 'BLUEROBOTICS'
);

INSERT INTO vendors (tenant_id, code, name, legal_name, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    'CABLEFORT',
    'Cable Fort',
    'Cable Fort',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM vendors WHERE code = 'CABLEFORT'
);

INSERT INTO vendors (tenant_id, code, name, legal_name, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    'CANNERCONNECTORS',
    'Canner Connectors',
    'Canner Connectors',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM vendors WHERE code = 'CANNERCONNECTORS'
);

INSERT INTO vendors (tenant_id, code, name, legal_name, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    'COMMERCIALENGINEERIN',
    'Commercial Engineering',
    'Commercial Engineering',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM vendors WHERE code = 'COMMERCIALENGINEERIN'
);

INSERT INTO vendors (tenant_id, code, name, legal_name, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    'DOLPHINRUBBER',
    'Dolphin Rubber',
    'Dolphin Rubber',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM vendors WHERE code = 'DOLPHINRUBBER'
);

INSERT INTO vendors (tenant_id, code, name, legal_name, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    'DONORRC',
    'Donor RC',
    'Donor RC',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM vendors WHERE code = 'DONORRC'
);

INSERT INTO vendors (tenant_id, code, name, legal_name, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    'DYNAMICINDUSTRIALSUP',
    'Dynamic Industrial Supplier',
    'Dynamic Industrial Supplier',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM vendors WHERE code = 'DYNAMICINDUSTRIALSUP'
);

INSERT INTO vendors (tenant_id, code, name, legal_name, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    'ELEGANTENTERPRISES',
    'Elegant Enterprises',
    'Elegant Enterprises',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM vendors WHERE code = 'ELEGANTENTERPRISES'
);

INSERT INTO vendors (tenant_id, code, name, legal_name, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    'EVELTA',
    'Evelta',
    'Evelta',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM vendors WHERE code = 'EVELTA'
);

INSERT INTO vendors (tenant_id, code, name, legal_name, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    'HITECH',
    'Hi Tech',
    'Hi Tech',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM vendors WHERE code = 'HITECH'
);

INSERT INTO vendors (tenant_id, code, name, legal_name, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    'HIMALAYATRADERS',
    'Himalaya Traders',
    'Himalaya Traders',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM vendors WHERE code = 'HIMALAYATRADERS'
);

INSERT INTO vendors (tenant_id, code, name, legal_name, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    'HOBBYWING',
    'Hobbywing',
    'Hobbywing',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM vendors WHERE code = 'HOBBYWING'
);

INSERT INTO vendors (tenant_id, code, name, legal_name, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    'HYDROPNUEMATIC',
    'Hydro Pnuematic',
    'Hydro Pnuematic',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM vendors WHERE code = 'HYDROPNUEMATIC'
);

INSERT INTO vendors (tenant_id, code, name, legal_name, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    'INHOUSE',
    'In-house',
    'In-house',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM vendors WHERE code = 'INHOUSE'
);

INSERT INTO vendors (tenant_id, code, name, legal_name, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    'INNOVINETECHMARKETIN',
    'Innovine Tech Marketing PVt. Ltd.',
    'Innovine Tech Marketing PVt. Ltd.',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM vendors WHERE code = 'INNOVINETECHMARKETIN'
);

INSERT INTO vendors (tenant_id, code, name, legal_name, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    'JLC',
    'JLC',
    'JLC',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM vendors WHERE code = 'JLC'
);

INSERT INTO vendors (tenant_id, code, name, legal_name, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    'JAINWIRENETTING',
    'Jain Wire Netting',
    'Jain Wire Netting',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM vendors WHERE code = 'JAINWIRENETTING'
);

INSERT INTO vendors (tenant_id, code, name, legal_name, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    'JANKIDIE',
    'Janki Die',
    'Janki Die',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM vendors WHERE code = 'JANKIDIE'
);

INSERT INTO vendors (tenant_id, code, name, legal_name, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    'LEOPARD',
    'Leopard',
    'Leopard',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM vendors WHERE code = 'LEOPARD'
);

INSERT INTO vendors (tenant_id, code, name, legal_name, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    'LOCALMARKET',
    'Local Market',
    'Local Market',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM vendors WHERE code = 'LOCALMARKET'
);

INSERT INTO vendors (tenant_id, code, name, legal_name, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    'LOCALMARKETKOLKATA',
    'Local Market Kolkata',
    'Local Market Kolkata',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM vendors WHERE code = 'LOCALMARKETKOLKATA'
);

INSERT INTO vendors (tenant_id, code, name, legal_name, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    'MARHASHTOROIDRINGS',
    'Marhash Toroid Rings',
    'Marhash Toroid Rings',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM vendors WHERE code = 'MARHASHTOROIDRINGS'
);

INSERT INTO vendors (tenant_id, code, name, legal_name, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    'NDP',
    'NDP',
    'NDP',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM vendors WHERE code = 'NDP'
);

INSERT INTO vendors (tenant_id, code, name, legal_name, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    'NSKELECTRONICS',
    'NSK Electronics',
    'NSK Electronics',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM vendors WHERE code = 'NSKELECTRONICS'
);

INSERT INTO vendors (tenant_id, code, name, legal_name, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    'NAVEEN',
    'Naveen',
    'Naveen',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM vendors WHERE code = 'NAVEEN'
);

INSERT INTO vendors (tenant_id, code, name, legal_name, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    'POPULARPNUEMATIC',
    'Popular Pnuematic',
    'Popular Pnuematic',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM vendors WHERE code = 'POPULARPNUEMATIC'
);

INSERT INTO vendors (tenant_id, code, name, legal_name, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    'PRATHAMESHTECHNOLOGY',
    'PrathameshTechnology & Industries',
    'PrathameshTechnology & Industries',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM vendors WHERE code = 'PRATHAMESHTECHNOLOGY'
);

INSERT INTO vendors (tenant_id, code, name, legal_name, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    'PREMIERELECTRONICS',
    'Premier Electronics',
    'Premier Electronics',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM vendors WHERE code = 'PREMIERELECTRONICS'
);

INSERT INTO vendors (tenant_id, code, name, legal_name, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    'RRINNOVATIONS',
    'RR Innovations',
    'RR Innovations',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM vendors WHERE code = 'RRINNOVATIONS'
);

INSERT INTO vendors (tenant_id, code, name, legal_name, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    'ROBU',
    'Robu',
    'Robu',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM vendors WHERE code = 'ROBU'
);

INSERT INTO vendors (tenant_id, code, name, legal_name, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    'ROBU3DPRINT',
    'Robu 3D print',
    'Robu 3D print',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM vendors WHERE code = 'ROBU3DPRINT'
);

INSERT INTO vendors (tenant_id, code, name, legal_name, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    'ROLAND',
    'Roland',
    'Roland',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM vendors WHERE code = 'ROLAND'
);

INSERT INTO vendors (tenant_id, code, name, legal_name, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    'SEUTES',
    'Seutes',
    'Seutes',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM vendors WHERE code = 'SEUTES'
);

INSERT INTO vendors (tenant_id, code, name, legal_name, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    'SHENZENISDTECHNOLOGY',
    'Shenzen ISD Technology',
    'Shenzen ISD Technology',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM vendors WHERE code = 'SHENZENISDTECHNOLOGY'
);

INSERT INTO vendors (tenant_id, code, name, legal_name, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    'SUZHOUVOLSUNELECTRON',
    'Suzhou Volsun Electronics Technology',
    'Suzhou Volsun Electronics Technology',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM vendors WHERE code = 'SUZHOUVOLSUNELECTRON'
);

INSERT INTO vendors (tenant_id, code, name, legal_name, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    'SVTHERMTECHNOLOGIES',
    'Svtherm Technologies',
    'Svtherm Technologies',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM vendors WHERE code = 'SVTHERMTECHNOLOGIES'
);

INSERT INTO vendors (tenant_id, code, name, legal_name, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    'SYNERGY',
    'Synergy',
    'Synergy',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM vendors WHERE code = 'SYNERGY'
);

INSERT INTO vendors (tenant_id, code, name, legal_name, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    'TANVEERINTERNATIONAL',
    'Tanveer International',
    'Tanveer International',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM vendors WHERE code = 'TANVEERINTERNATIONAL'
);

INSERT INTO vendors (tenant_id, code, name, legal_name, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    'VINODRAI',
    'Vinod Rai',
    'Vinod Rai',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM vendors WHERE code = 'VINODRAI'
);

INSERT INTO vendors (tenant_id, code, name, legal_name, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    'VYOM',
    'Vyom',
    'Vyom',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM vendors WHERE code = 'VYOM'
);

INSERT INTO vendors (tenant_id, code, name, legal_name, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    'WEBEL',
    'Webel',
    'Webel',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM vendors WHERE code = 'WEBEL'
);

INSERT INTO vendors (tenant_id, code, name, legal_name, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    'WEIPU',
    'Weipu',
    'Weipu',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM vendors WHERE code = 'WEIPU'
);



-- ============================================================================
-- INSERT RAW MATERIALS (Category: RM)
-- ============================================================================

INSERT INTO items (tenant_id, code, name, type, uom, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    'QX7-TRANSMITTER-WITH',
    'QX7 Transmitter with R9M',
    'RAW_MATERIAL'::item_type,
    'Number',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM items WHERE code = 'QX7-TRANSMITTER-WITH'
);

INSERT INTO items (tenant_id, code, name, type, uom, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    'RECEIVER-MODULE-R9MMR9MXR9',
    'Receiver Module R9MM/R9MX/R9',
    'RAW_MATERIAL'::item_type,
    'Number',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM items WHERE code = 'RECEIVER-MODULE-R9MMR9MXR9'
);

INSERT INTO items (tenant_id, code, name, type, uom, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    'R9M-MINI-RECEIVER',
    'R9M Mini Receiver Module',
    'RAW_MATERIAL'::item_type,
    'PCS',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM items WHERE code = 'R9M-MINI-RECEIVER'
);

INSERT INTO items (tenant_id, code, name, type, uom, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    'FREE-WHEEL-DIODE',
    'Free Wheel Diode SMD M7',
    'RAW_MATERIAL'::item_type,
    'Number',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM items WHERE code = 'FREE-WHEEL-DIODE'
);

INSERT INTO items (tenant_id, code, name, type, uom, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    'AMS1117-50V',
    'AMS1117 5.0v',
    'RAW_MATERIAL'::item_type,
    'Number',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM items WHERE code = 'AMS1117-50V'
);

INSERT INTO items (tenant_id, code, name, type, uom, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    'AMS1117-33V',
    'AMS1117 3.3v',
    'RAW_MATERIAL'::item_type,
    'Number',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM items WHERE code = 'AMS1117-33V'
);

INSERT INTO items (tenant_id, code, name, type, uom, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    'NEO6M-GPSL80-GPS',
    'NEO-6M GPS/L80 GPS',
    'RAW_MATERIAL'::item_type,
    'Number',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM items WHERE code = 'NEO6M-GPSL80-GPS'
);

INSERT INTO items (tenant_id, code, name, type, uom, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    'LC86G-GPS',
    'LC86G GPS',
    'RAW_MATERIAL'::item_type,
    'Number',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM items WHERE code = 'LC86G-GPS'
);

INSERT INTO items (tenant_id, code, name, type, uom, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    'HERE3GPS',
    'Here3+GPS',
    'RAW_MATERIAL'::item_type,
    'PCS',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM items WHERE code = 'HERE3GPS'
);

INSERT INTO items (tenant_id, code, name, type, uom, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    '55MM-FEMALE-BULLET',
    '5.5mm Female Bullet connector',
    'RAW_MATERIAL'::item_type,
    'Number',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM items WHERE code = '55MM-FEMALE-BULLET'
);

INSERT INTO items (tenant_id, code, name, type, uom, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    '4MM-MALE-BULLET',
    '4mm Male Bullet connector',
    'RAW_MATERIAL'::item_type,
    'Number',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM items WHERE code = '4MM-MALE-BULLET'
);

INSERT INTO items (tenant_id, code, name, type, uom, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    '4MM-FEMALE-BULLET',
    '4mm Female Bullet connector',
    'RAW_MATERIAL'::item_type,
    'Number',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM items WHERE code = '4MM-FEMALE-BULLET'
);

INSERT INTO items (tenant_id, code, name, type, uom, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    '2MM-MALE-BULLET',
    '2mm male bullet connector',
    'RAW_MATERIAL'::item_type,
    'Number',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM items WHERE code = '2MM-MALE-BULLET'
);

INSERT INTO items (tenant_id, code, name, type, uom, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    '2MM-FEMALE-BULLET',
    '2mm Female Bullet connector',
    'RAW_MATERIAL'::item_type,
    'Number',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM items WHERE code = '2MM-FEMALE-BULLET'
);

INSERT INTO items (tenant_id, code, name, type, uom, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    '6MM-MALE-BULLET',
    '6mm male bullet connector',
    'RAW_MATERIAL'::item_type,
    'Number',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM items WHERE code = '6MM-MALE-BULLET'
);

INSERT INTO items (tenant_id, code, name, type, uom, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    '6MM-FEMALE-BULLET',
    '6mm female bullet connector',
    'RAW_MATERIAL'::item_type,
    'Number',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM items WHERE code = '6MM-FEMALE-BULLET'
);

INSERT INTO items (tenant_id, code, name, type, uom, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    '8MM-MALE-BULLET',
    '8mm male bullet connector',
    'RAW_MATERIAL'::item_type,
    'Number',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM items WHERE code = '8MM-MALE-BULLET'
);

INSERT INTO items (tenant_id, code, name, type, uom, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    '8MM-FEMALE-BULLET',
    '8mm female bullet connector',
    'RAW_MATERIAL'::item_type,
    'Number',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM items WHERE code = '8MM-FEMALE-BULLET'
);

INSERT INTO items (tenant_id, code, name, type, uom, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    'ULTRA-FLEXIBLE-BLACK',
    'Ultra Flexible Black 8AWG',
    'RAW_MATERIAL'::item_type,
    'Meter',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM items WHERE code = 'ULTRA-FLEXIBLE-BLACK'
);

INSERT INTO items (tenant_id, code, name, type, uom, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    'ULTRA-FLEXIBLE-RED',
    'Ultra Flexible  Red 8AWG',
    'RAW_MATERIAL'::item_type,
    'Meter',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM items WHERE code = 'ULTRA-FLEXIBLE-RED'
);

INSERT INTO items (tenant_id, code, name, type, uom, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    'ULTRA-FLEXIBLE-BLACK',
    'Ultra Flexible Black 12AWG',
    'RAW_MATERIAL'::item_type,
    'Meter',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM items WHERE code = 'ULTRA-FLEXIBLE-BLACK'
);

INSERT INTO items (tenant_id, code, name, type, uom, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    'ULTRA-FLEXIBLE-RED',
    'Ultra Flexible Red 12AWG',
    'RAW_MATERIAL'::item_type,
    'Meter',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM items WHERE code = 'ULTRA-FLEXIBLE-RED'
);

INSERT INTO items (tenant_id, code, name, type, uom, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    'ULTRA-FLEXIBLE-BLACK',
    'Ultra Flexible Black 18 AWG',
    'RAW_MATERIAL'::item_type,
    'Meter',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM items WHERE code = 'ULTRA-FLEXIBLE-BLACK'
);

INSERT INTO items (tenant_id, code, name, type, uom, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    'ULTRA-FLEXIBLE-RED',
    'Ultra Flexible Red 18 AWG',
    'RAW_MATERIAL'::item_type,
    'Meter',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM items WHERE code = 'ULTRA-FLEXIBLE-RED'
);

INSERT INTO items (tenant_id, code, name, type, uom, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    'ULTRA-FLEXIBLE-BLACK',
    'Ultra Flexible Black 20 AWG',
    'RAW_MATERIAL'::item_type,
    'Meter',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM items WHERE code = 'ULTRA-FLEXIBLE-BLACK'
);

INSERT INTO items (tenant_id, code, name, type, uom, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    'ULTRA-FLEXIBLE-RED',
    'Ultra Flexible Red 20 AWG',
    'RAW_MATERIAL'::item_type,
    'Meter',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM items WHERE code = 'ULTRA-FLEXIBLE-RED'
);

INSERT INTO items (tenant_id, code, name, type, uom, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    'ULTRA-FLEXIBLE-BLUE',
    'Ultra Flexible Blue 20 AWG',
    'RAW_MATERIAL'::item_type,
    'PCS',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM items WHERE code = 'ULTRA-FLEXIBLE-BLUE'
);

INSERT INTO items (tenant_id, code, name, type, uom, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    'WATER-FLOW-SENSOR',
    'Water flow sensor YFS401',
    'RAW_MATERIAL'::item_type,
    'Number',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM items WHERE code = 'WATER-FLOW-SENSOR'
);

INSERT INTO items (tenant_id, code, name, type, uom, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    'WATER-PUMP-550',
    'Water pump 550 diaphragm',
    'RAW_MATERIAL'::item_type,
    'Number',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM items WHERE code = 'WATER-PUMP-550'
);

INSERT INTO items (tenant_id, code, name, type, uom, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    '1S-LIPO-INDICATOR',
    '1S Lipo indicator (Not Using)',
    'RAW_MATERIAL'::item_type,
    'Number',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM items WHERE code = '1S-LIPO-INDICATOR'
);

INSERT INTO items (tenant_id, code, name, type, uom, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    '2S-LIPO-INDICATOR',
    '2S Lipo indicator',
    'RAW_MATERIAL'::item_type,
    'Number',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM items WHERE code = '2S-LIPO-INDICATOR'
);

INSERT INTO items (tenant_id, code, name, type, uom, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    'LIPO-INDICATOR-CASINGS',
    'Lipo Indicator Casings',
    'RAW_MATERIAL'::item_type,
    'Number',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM items WHERE code = 'LIPO-INDICATOR-CASINGS'
);

INSERT INTO items (tenant_id, code, name, type, uom, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    'BUCK-CONVERTER-XL7015',
    'Buck converter XL7015 50v',
    'RAW_MATERIAL'::item_type,
    'Number',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM items WHERE code = 'BUCK-CONVERTER-XL7015'
);

INSERT INTO items (tenant_id, code, name, type, uom, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    'LM2596-IN-AMCA',
    'LM2596 in AMCA',
    'RAW_MATERIAL'::item_type,
    'Number',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM items WHERE code = 'LM2596-IN-AMCA'
);

INSERT INTO items (tenant_id, code, name, type, uom, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    'XL4015XL4005-5A-BUCK',
    'XL4015/XL4005 5A buck converter',
    'RAW_MATERIAL'::item_type,
    'Number',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM items WHERE code = 'XL4015XL4005-5A-BUCK'
);

INSERT INTO items (tenant_id, code, name, type, uom, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    'XT90-FEMALE-HOUSING',
    'XT90 Female housing',
    'RAW_MATERIAL'::item_type,
    'Number',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM items WHERE code = 'XT90-FEMALE-HOUSING'
);

INSERT INTO items (tenant_id, code, name, type, uom, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    'XT30',
    'XT30',
    'RAW_MATERIAL'::item_type,
    'PCS',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM items WHERE code = 'XT30'
);

INSERT INTO items (tenant_id, code, name, type, uom, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    'XT60',
    'XT60',
    'RAW_MATERIAL'::item_type,
    'PCS',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM items WHERE code = 'XT60'
);

INSERT INTO items (tenant_id, code, name, type, uom, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    '24V-ACDC-MODULE',
    '24v AC/DC module',
    'RAW_MATERIAL'::item_type,
    'Number',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM items WHERE code = '24V-ACDC-MODULE'
);

INSERT INTO items (tenant_id, code, name, type, uom, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    'MOMENTARY-SWITCH-JCB',
    'Momentary Switch JCB',
    'RAW_MATERIAL'::item_type,
    'Number',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM items WHERE code = 'MOMENTARY-SWITCH-JCB'
);

INSERT INTO items (tenant_id, code, name, type, uom, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    'LATCHING-POWER-SWITCH',
    'Latching Power switch JCB',
    'RAW_MATERIAL'::item_type,
    'Number',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM items WHERE code = 'LATCHING-POWER-SWITCH'
);

INSERT INTO items (tenant_id, code, name, type, uom, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    'PWB-FOR-IFU',
    'PWB for IFU',
    'RAW_MATERIAL'::item_type,
    'Number',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM items WHERE code = 'PWB-FOR-IFU'
);

INSERT INTO items (tenant_id, code, name, type, uom, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    'PWB-FOR-JCB',
    'PWB for JCB',
    'RAW_MATERIAL'::item_type,
    'Number',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM items WHERE code = 'PWB-FOR-JCB'
);

INSERT INTO items (tenant_id, code, name, type, uom, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    'PWB-OF-STBD',
    'PWB of STBD flash light',
    'RAW_MATERIAL'::item_type,
    'Number',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM items WHERE code = 'PWB-OF-STBD'
);

INSERT INTO items (tenant_id, code, name, type, uom, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    'PWB-OF-PORT',
    'PWB of PORT flash light',
    'RAW_MATERIAL'::item_type,
    'Number',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM items WHERE code = 'PWB-OF-PORT'
);

INSERT INTO items (tenant_id, code, name, type, uom, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    'PWB-OF-A4',
    'PWB of A4 Motherboard',
    'RAW_MATERIAL'::item_type,
    'Number',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM items WHERE code = 'PWB-OF-A4'
);

INSERT INTO items (tenant_id, code, name, type, uom, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    'PWB-OF-CURRENT',
    'PWB of Current Sensor',
    'RAW_MATERIAL'::item_type,
    'Number',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM items WHERE code = 'PWB-OF-CURRENT'
);

INSERT INTO items (tenant_id, code, name, type, uom, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    'PWB-OF-BUTTON',
    'PWB of Button -2',
    'RAW_MATERIAL'::item_type,
    'Number',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM items WHERE code = 'PWB-OF-BUTTON'
);

INSERT INTO items (tenant_id, code, name, type, uom, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    'PWB-FOR-PC',
    'PWB for PC (in charger)',
    'RAW_MATERIAL'::item_type,
    'Number',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM items WHERE code = 'PWB-FOR-PC'
);

INSERT INTO items (tenant_id, code, name, type, uom, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    'PWB-FOR-BATHEMETRY',
    'PWB for Bathemetry Sensor',
    'RAW_MATERIAL'::item_type,
    'Number',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM items WHERE code = 'PWB-FOR-BATHEMETRY'
);

INSERT INTO items (tenant_id, code, name, type, uom, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    'GENERAL-PCB-6X6',
    'General PCB 6x6',
    'RAW_MATERIAL'::item_type,
    'PCS',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM items WHERE code = 'GENERAL-PCB-6X6'
);

INSERT INTO items (tenant_id, code, name, type, uom, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    'GENERAL-PCB-6X4',
    'General PCB 6X4',
    'RAW_MATERIAL'::item_type,
    'PCS',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM items WHERE code = 'GENERAL-PCB-6X4'
);

INSERT INTO items (tenant_id, code, name, type, uom, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    'PCB-OF-ROHM',
    'PCB of ROHM Buck  on Murata Foot Print',
    'RAW_MATERIAL'::item_type,
    'PCS',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM items WHERE code = 'PCB-OF-ROHM'
);

INSERT INTO items (tenant_id, code, name, type, uom, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    'PCB-OF-ROHM',
    'PCB of ROHM buck on XL4007 Foot Print',
    'RAW_MATERIAL'::item_type,
    'PCS',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM items WHERE code = 'PCB-OF-ROHM'
);

INSERT INTO items (tenant_id, code, name, type, uom, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    'PCB-OF-MP9486',
    'PCB of MP9486 on Murata FootPrint',
    'RAW_MATERIAL'::item_type,
    'PCS',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM items WHERE code = 'PCB-OF-MP9486'
);

INSERT INTO items (tenant_id, code, name, type, uom, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    'AMCA-ONBOARD-CHARGING',
    'AMCA Onboard Charging Circuit',
    'RAW_MATERIAL'::item_type,
    'Number',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM items WHERE code = 'AMCA-ONBOARD-CHARGING'
);

INSERT INTO items (tenant_id, code, name, type, uom, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    'SBUS-GENERATOR-CIRCUIT',
    'SBus Generator Circuit (Tailored Solution)',
    'RAW_MATERIAL'::item_type,
    'Number',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM items WHERE code = 'SBUS-GENERATOR-CIRCUIT'
);

INSERT INTO items (tenant_id, code, name, type, uom, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    'A5-BOARD-WITH',
    'A5 Board with own bucks',
    'RAW_MATERIAL'::item_type,
    'Number',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM items WHERE code = 'A5-BOARD-WITH'
);

INSERT INTO items (tenant_id, code, name, type, uom, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    'WCS1700-CURRENT-SENSOR',
    'WCS1700 current Sensor',
    'RAW_MATERIAL'::item_type,
    'Number',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM items WHERE code = 'WCS1700-CURRENT-SENSOR'
);

INSERT INTO items (tenant_id, code, name, type, uom, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    '6X3-BATTERY-BLOCKS',
    '6X3 BATTERY blocks',
    'RAW_MATERIAL'::item_type,
    'Number',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM items WHERE code = '6X3-BATTERY-BLOCKS'
);

INSERT INTO items (tenant_id, code, name, type, uom, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    '21700-BATTERRIES',
    '21700 Batterries',
    'RAW_MATERIAL'::item_type,
    'PCS',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM items WHERE code = '21700-BATTERRIES'
);

INSERT INTO items (tenant_id, code, name, type, uom, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    '18650-CELLS-LIION',
    '18650 cells Li-Ion for JCB',
    'RAW_MATERIAL'::item_type,
    'Number',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM items WHERE code = '18650-CELLS-LIION'
);

INSERT INTO items (tenant_id, code, name, type, uom, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    '18650-CELL-HOLDER',
    '18650 Cell Holder',
    'RAW_MATERIAL'::item_type,
    'Number',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM items WHERE code = '18650-CELL-HOLDER'
);

INSERT INTO items (tenant_id, code, name, type, uom, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    'USB-DATA-CHARGING',
    'USB Data & Charging Cable 1.5m length Black',
    'RAW_MATERIAL'::item_type,
    'Number',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM items WHERE code = 'USB-DATA-CHARGING'
);

INSERT INTO items (tenant_id, code, name, type, uom, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    'DC-JACK-PANEL',
    'DC Jack Panel Mount',
    'RAW_MATERIAL'::item_type,
    'Number',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM items WHERE code = 'DC-JACK-PANEL'
);

INSERT INTO items (tenant_id, code, name, type, uom, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    'HEAT-SINK-PASTE',
    'Heat Sink Paste',
    'RAW_MATERIAL'::item_type,
    'PCS',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM items WHERE code = 'HEAT-SINK-PASTE'
);

INSERT INTO items (tenant_id, code, name, type, uom, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    'LEAD-PASTE',
    'Lead paste',
    'RAW_MATERIAL'::item_type,
    'Grm',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM items WHERE code = 'LEAD-PASTE'
);

INSERT INTO items (tenant_id, code, name, type, uom, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    'LEAD-WIRE-22AWG',
    'Lead wire 22AWG',
    'RAW_MATERIAL'::item_type,
    'grm',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM items WHERE code = 'LEAD-WIRE-22AWG'
);

INSERT INTO items (tenant_id, code, name, type, uom, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    'HEAT-SINK-PAD',
    'Heat Sink Pad',
    'RAW_MATERIAL'::item_type,
    'Packet',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM items WHERE code = 'HEAT-SINK-PAD'
);

INSERT INTO items (tenant_id, code, name, type, uom, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    'LM358DT-SMD',
    'LM358DT SMD',
    'RAW_MATERIAL'::item_type,
    'Number',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM items WHERE code = 'LM358DT-SMD'
);

INSERT INTO items (tenant_id, code, name, type, uom, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    '01UF-0805',
    '0.1uF 0805',
    'RAW_MATERIAL'::item_type,
    'Number',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM items WHERE code = '01UF-0805'
);

INSERT INTO items (tenant_id, code, name, type, uom, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    '001UF-0805',
    '0.01uF 0805',
    'RAW_MATERIAL'::item_type,
    'Number',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM items WHERE code = '001UF-0805'
);

INSERT INTO items (tenant_id, code, name, type, uom, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    'LED-0805-SMD',
    'LED 0805 SMD',
    'RAW_MATERIAL'::item_type,
    'Number',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM items WHERE code = 'LED-0805-SMD'
);

INSERT INTO items (tenant_id, code, name, type, uom, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    'TS5A3157DBVR-SSR-ENCODER',
    'TS5A3157DBVR SSR Encoder Signal Cut-Off',
    'RAW_MATERIAL'::item_type,
    'Number',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM items WHERE code = 'TS5A3157DBVR-SSR-ENCODER'
);

INSERT INTO items (tenant_id, code, name, type, uom, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    'TACTILE-SWITCH-FOR',
    'Tactile Switch for IFU four leg',
    'RAW_MATERIAL'::item_type,
    'Number',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM items WHERE code = 'TACTILE-SWITCH-FOR'
);

INSERT INTO items (tenant_id, code, name, type, uom, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    'LM2596HVSADJ-BUCK-ONLY',
    'LM2596HVS-ADJ Buck only IC',
    'RAW_MATERIAL'::item_type,
    'Number',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM items WHERE code = 'LM2596HVSADJ-BUCK-ONLY'
);

INSERT INTO items (tenant_id, code, name, type, uom, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    'MP9486AGNZ-100V-BUCK',
    'MP9486AGN-Z 100v Buck converter IC',
    'RAW_MATERIAL'::item_type,
    'Number',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM items WHERE code = 'MP9486AGNZ-100V-BUCK'
);

INSERT INTO items (tenant_id, code, name, type, uom, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    '12V-FIXED-BUCK',
    '12v Fixed Buck 18-75 In MultiCom Pro',
    'RAW_MATERIAL'::item_type,
    'Number',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM items WHERE code = '12V-FIXED-BUCK'
);

INSERT INTO items (tenant_id, code, name, type, uom, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    '5V-FIXED-BUCK',
    '5v Fixed Buck 18-75 In MultiCom Pro',
    'RAW_MATERIAL'::item_type,
    'Number',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM items WHERE code = '5V-FIXED-BUCK'
);

INSERT INTO items (tenant_id, code, name, type, uom, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    '1N4148-SMD',
    '1N4148 SMD',
    'RAW_MATERIAL'::item_type,
    'Number',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM items WHERE code = '1N4148-SMD'
);

INSERT INTO items (tenant_id, code, name, type, uom, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    '18PF-0805-CAPACITOR',
    '18pF 0805 capacitor',
    'RAW_MATERIAL'::item_type,
    'Number',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM items WHERE code = '18PF-0805-CAPACITOR'
);

INSERT INTO items (tenant_id, code, name, type, uom, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    '10UF-0805-CAPACITOR',
    '10uF 0805 capacitor',
    'RAW_MATERIAL'::item_type,
    'PCS',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM items WHERE code = '10UF-0805-CAPACITOR'
);

INSERT INTO items (tenant_id, code, name, type, uom, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    '10UF-10V-TANTALUM',
    '10uF 10v Tantalum Capacitor Case A',
    'RAW_MATERIAL'::item_type,
    'Number',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM items WHERE code = '10UF-10V-TANTALUM'
);

INSERT INTO items (tenant_id, code, name, type, uom, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    '1K-0805-RESISTOR',
    '1k 0805 Resistor',
    'RAW_MATERIAL'::item_type,
    'Number',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM items WHERE code = '1K-0805-RESISTOR'
);

INSERT INTO items (tenant_id, code, name, type, uom, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    '10K-0805-RESISTOR',
    '10k 0805 resistor',
    'RAW_MATERIAL'::item_type,
    'Number',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM items WHERE code = '10K-0805-RESISTOR'
);

INSERT INTO items (tenant_id, code, name, type, uom, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    '510K-RESISTOR',
    '510K Resistor',
    'RAW_MATERIAL'::item_type,
    'PCS',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM items WHERE code = '510K-RESISTOR'
);

INSERT INTO items (tenant_id, code, name, type, uom, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    '560K-RESISTOR',
    '560K Resistor',
    'RAW_MATERIAL'::item_type,
    'PCS',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM items WHERE code = '560K-RESISTOR'
);

INSERT INTO items (tenant_id, code, name, type, uom, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    '330E-0805-RESISTOR',
    '330E 0805 Resistor',
    'RAW_MATERIAL'::item_type,
    'Number',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM items WHERE code = '330E-0805-RESISTOR'
);

INSERT INTO items (tenant_id, code, name, type, uom, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    'MURATA-12V-45A',
    'Murata 12v 4.5A buck',
    'RAW_MATERIAL'::item_type,
    'Number',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM items WHERE code = 'MURATA-12V-45A'
);

INSERT INTO items (tenant_id, code, name, type, uom, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    'MURATA-5V-10A',
    'Murata 5v 10A buck',
    'RAW_MATERIAL'::item_type,
    'Number',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM items WHERE code = 'MURATA-5V-10A'
);

INSERT INTO items (tenant_id, code, name, type, uom, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    '1-MEG-3296',
    '1 Meg 3296',
    'RAW_MATERIAL'::item_type,
    'PCS',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM items WHERE code = '1-MEG-3296'
);

INSERT INTO items (tenant_id, code, name, type, uom, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    '1K-3296-RESISTOR',
    '1K 3296 Resistor',
    'RAW_MATERIAL'::item_type,
    'PCS',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM items WHERE code = '1K-3296-RESISTOR'
);

INSERT INTO items (tenant_id, code, name, type, uom, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    '2K-3296-RESISTOR',
    '2K 3296 Resistor',
    'RAW_MATERIAL'::item_type,
    'PCS',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM items WHERE code = '2K-3296-RESISTOR'
);

INSERT INTO items (tenant_id, code, name, type, uom, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    '5-W-1',
    '5 W 1 Ω Resistor',
    'RAW_MATERIAL'::item_type,
    'PCS',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM items WHERE code = '5-W-1'
);

INSERT INTO items (tenant_id, code, name, type, uom, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    '5-W-5',
    '5 W 5 Ω Resistor',
    'RAW_MATERIAL'::item_type,
    'PCS',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM items WHERE code = '5-W-5'
);

INSERT INTO items (tenant_id, code, name, type, uom, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    'FUSE-500MA',
    'Fuse 500mA',
    'RAW_MATERIAL'::item_type,
    'Number',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM items WHERE code = 'FUSE-500MA'
);

INSERT INTO items (tenant_id, code, name, type, uom, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    'MCP3208',
    'MCP3208',
    'RAW_MATERIAL'::item_type,
    'Number',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM items WHERE code = 'MCP3208'
);

INSERT INTO items (tenant_id, code, name, type, uom, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    '23A-24V-POWER',
    '23A 24v Power relay',
    'RAW_MATERIAL'::item_type,
    'Number',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM items WHERE code = '23A-24V-POWER'
);

INSERT INTO items (tenant_id, code, name, type, uom, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    'LM61-TEMPERATURE-SENSOR',
    'LM61 Temperature Sensor',
    'RAW_MATERIAL'::item_type,
    'Number',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM items WHERE code = 'LM61-TEMPERATURE-SENSOR'
);

INSERT INTO items (tenant_id, code, name, type, uom, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    '47K-0805',
    '47k 0805',
    'RAW_MATERIAL'::item_type,
    'Number',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM items WHERE code = '47K-0805'
);

INSERT INTO items (tenant_id, code, name, type, uom, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    '470K-0805-PANASONICBOURNSMURATA',
    '470k 0805 PANASONIC/BOURNS/MURATA',
    'RAW_MATERIAL'::item_type,
    'Number',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM items WHERE code = '470K-0805-PANASONICBOURNSMURATA'
);

INSERT INTO items (tenant_id, code, name, type, uom, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    '20K-0805-PANASONICBOURNSMURATA',
    '20k 0805 PANASONIC/BOURNS/MURATA',
    'RAW_MATERIAL'::item_type,
    'Number',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM items WHERE code = '20K-0805-PANASONICBOURNSMURATA'
);

INSERT INTO items (tenant_id, code, name, type, uom, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    '1UF-0805-PANASONIC',
    '1uF 0805 PANASONIC',
    'RAW_MATERIAL'::item_type,
    'Number',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM items WHERE code = '1UF-0805-PANASONIC'
);

INSERT INTO items (tenant_id, code, name, type, uom, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    '16MHZ-CRYSTAL-OSCILLATOR',
    '16MHz Crystal Oscillator',
    'RAW_MATERIAL'::item_type,
    'Number',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM items WHERE code = '16MHZ-CRYSTAL-OSCILLATOR'
);

INSERT INTO items (tenant_id, code, name, type, uom, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    'ULN2004-SMD',
    'ULN2004 SMD',
    'RAW_MATERIAL'::item_type,
    'Number',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM items WHERE code = 'ULN2004-SMD'
);

INSERT INTO items (tenant_id, code, name, type, uom, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    'SSR-AQW282SX',
    'SSR AQW282SX',
    'RAW_MATERIAL'::item_type,
    'Number',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM items WHERE code = 'SSR-AQW282SX'
);

INSERT INTO items (tenant_id, code, name, type, uom, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    'ATMEGA328P-CONTROLLER',
    'Atmega328P Controller',
    'RAW_MATERIAL'::item_type,
    'Number',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM items WHERE code = 'ATMEGA328P-CONTROLLER'
);

INSERT INTO items (tenant_id, code, name, type, uom, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    'POWER-RELAY-120A',
    'Power Relay 120A 12v Y7',
    'RAW_MATERIAL'::item_type,
    'Number',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM items WHERE code = 'POWER-RELAY-120A'
);

INSERT INTO items (tenant_id, code, name, type, uom, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    'POWER-RELAY-90A',
    'Power Relay 90A 12v Y6',
    'RAW_MATERIAL'::item_type,
    'Number',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM items WHERE code = 'POWER-RELAY-90A'
);

INSERT INTO items (tenant_id, code, name, type, uom, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    'SPST-RELAY-5A12V',
    'SPST relay 5A-12v ANTI_S & KILL',
    'RAW_MATERIAL'::item_type,
    'Number',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM items WHERE code = 'SPST-RELAY-5A12V'
);

INSERT INTO items (tenant_id, code, name, type, uom, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    'BALANCING-1A-DPDT',
    'Balancing 1A DPDT 24v Relay',
    'RAW_MATERIAL'::item_type,
    'Number',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM items WHERE code = 'BALANCING-1A-DPDT'
);

INSERT INTO items (tenant_id, code, name, type, uom, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    'BALANCING-RELAY-5A2A',
    'Balancing relay 5A/2A 24v SPST',
    'RAW_MATERIAL'::item_type,
    'Number',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM items WHERE code = 'BALANCING-RELAY-5A2A'
);

INSERT INTO items (tenant_id, code, name, type, uom, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    '5V-2A-USB',
    '5v 2A USB Adapter',
    'RAW_MATERIAL'::item_type,
    'Number',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM items WHERE code = '5V-2A-USB'
);

INSERT INTO items (tenant_id, code, name, type, uom, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    '5V-3A-POWER',
    '5v 3A Power adapter DC Plug Orange',
    'RAW_MATERIAL'::item_type,
    'Number',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM items WHERE code = '5V-3A-POWER'
);

INSERT INTO items (tenant_id, code, name, type, uom, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    '5V-3A-POWER',
    '5v 3A Power adapter DC Plug Ordinary',
    'RAW_MATERIAL'::item_type,
    'Number',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM items WHERE code = '5V-3A-POWER'
);

INSERT INTO items (tenant_id, code, name, type, uom, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    '9V-2A-POWER',
    '9v 2A Power adapter DC Plug Orange',
    'RAW_MATERIAL'::item_type,
    'Number',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM items WHERE code = '9V-2A-POWER'
);

INSERT INTO items (tenant_id, code, name, type, uom, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    '32GB-SD-CARD',
    '32Gb SD Card',
    'RAW_MATERIAL'::item_type,
    'Number',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM items WHERE code = '32GB-SD-CARD'
);

INSERT INTO items (tenant_id, code, name, type, uom, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    '16PIN-IC-BASE',
    '16pin IC base',
    'RAW_MATERIAL'::item_type,
    'Number',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM items WHERE code = '16PIN-IC-BASE'
);

INSERT INTO items (tenant_id, code, name, type, uom, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    'BLUETOOTH-MODULE',
    'BlueTooth Module',
    'RAW_MATERIAL'::item_type,
    'Number',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM items WHERE code = 'BLUETOOTH-MODULE'
);

INSERT INTO items (tenant_id, code, name, type, uom, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    '24AWG-SOLDERING-WIRE',
    '24AWG Soldering Wire',
    'RAW_MATERIAL'::item_type,
    'Grm',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM items WHERE code = '24AWG-SOLDERING-WIRE'
);

INSERT INTO items (tenant_id, code, name, type, uom, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    '12E-2W-RESISTOR',
    '12E 2W Resistor THT',
    'RAW_MATERIAL'::item_type,
    'Number',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM items WHERE code = '12E-2W-RESISTOR'
);

INSERT INTO items (tenant_id, code, name, type, uom, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    'IMAX-B3-CHARGER',
    'iMAx B3 Charger',
    'RAW_MATERIAL'::item_type,
    'Number',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM items WHERE code = 'IMAX-B3-CHARGER'
);

INSERT INTO items (tenant_id, code, name, type, uom, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    '9V-PIEZO-ELECTRIC',
    '9v Piezo Electric Buzzer',
    'RAW_MATERIAL'::item_type,
    'Number',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM items WHERE code = '9V-PIEZO-ELECTRIC'
);

INSERT INTO items (tenant_id, code, name, type, uom, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    'FEMALE-BERGSTRIP-40X1',
    'Female Bergstrip 40x1 2.54mm',
    'RAW_MATERIAL'::item_type,
    'Number',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM items WHERE code = 'FEMALE-BERGSTRIP-40X1'
);

INSERT INTO items (tenant_id, code, name, type, uom, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    'MALE-BERGSTRIP-40X1',
    'Male Bergstrip 40x1 2.54mm',
    'RAW_MATERIAL'::item_type,
    'Number',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM items WHERE code = 'MALE-BERGSTRIP-40X1'
);

INSERT INTO items (tenant_id, code, name, type, uom, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    'FEMALE-BERGSTRIP-40X1',
    'Female Bergstrip 40x1 2.0mm',
    'RAW_MATERIAL'::item_type,
    'Number',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM items WHERE code = 'FEMALE-BERGSTRIP-40X1'
);

INSERT INTO items (tenant_id, code, name, type, uom, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    'MALE-BERGSTRIP-40X1',
    'Male Bergstrip 40x1 2.0mm',
    'RAW_MATERIAL'::item_type,
    'Number',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM items WHERE code = 'MALE-BERGSTRIP-40X1'
);

INSERT INTO items (tenant_id, code, name, type, uom, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    'CONFORMAL-COATING',
    'Conformal Coating',
    'RAW_MATERIAL'::item_type,
    'ml',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM items WHERE code = 'CONFORMAL-COATING'
);

INSERT INTO items (tenant_id, code, name, type, uom, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    'SOLDERING-FLUX-SMALL',
    'Soldering flux Small lead',
    'RAW_MATERIAL'::item_type,
    'ml',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM items WHERE code = 'SOLDERING-FLUX-SMALL'
);

INSERT INTO items (tenant_id, code, name, type, uom, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    '3-PIN-CONNECTORS',
    '3 Pin Connectors',
    'RAW_MATERIAL'::item_type,
    'PCS',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM items WHERE code = '3-PIN-CONNECTORS'
);

INSERT INTO items (tenant_id, code, name, type, uom, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    '5-PIN-MALE',
    '5 pin male 2510 connector',
    'RAW_MATERIAL'::item_type,
    'PCS',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM items WHERE code = '5-PIN-MALE'
);

INSERT INTO items (tenant_id, code, name, type, uom, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    '3-PIN-3',
    '3 pin 3 yrd power cord',
    'RAW_MATERIAL'::item_type,
    'Number',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM items WHERE code = '3-PIN-3'
);

INSERT INTO items (tenant_id, code, name, type, uom, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    '2-PIN-JSTXH',
    '2 pin JST-XH housing',
    'RAW_MATERIAL'::item_type,
    'Number',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM items WHERE code = '2-PIN-JSTXH'
);

INSERT INTO items (tenant_id, code, name, type, uom, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    '3-PIN-JSTXH',
    '3 pin JST-XH housing',
    'RAW_MATERIAL'::item_type,
    'Number',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM items WHERE code = '3-PIN-JSTXH'
);

INSERT INTO items (tenant_id, code, name, type, uom, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    '13-PIN-JSTXH',
    '13 pin JST-XH housing',
    'RAW_MATERIAL'::item_type,
    'Number',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM items WHERE code = '13-PIN-JSTXH'
);

INSERT INTO items (tenant_id, code, name, type, uom, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    '15-PIN-JSTXH',
    '15 pin JST-XH housing',
    'RAW_MATERIAL'::item_type,
    'Number',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM items WHERE code = '15-PIN-JSTXH'
);

INSERT INTO items (tenant_id, code, name, type, uom, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    '2-PIN-JSTXH',
    '2 pin JST-XH male top entry',
    'RAW_MATERIAL'::item_type,
    'Number',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM items WHERE code = '2-PIN-JSTXH'
);

INSERT INTO items (tenant_id, code, name, type, uom, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    '2-PIN-JSTXH',
    '2 pin JST-XH male top entry RED',
    'RAW_MATERIAL'::item_type,
    'Number',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM items WHERE code = '2-PIN-JSTXH'
);

INSERT INTO items (tenant_id, code, name, type, uom, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    '2-PIN-JSTXH',
    '2 pin JST-XH male side entry',
    'RAW_MATERIAL'::item_type,
    'Number',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM items WHERE code = '2-PIN-JSTXH'
);

INSERT INTO items (tenant_id, code, name, type, uom, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    '3-PIN-JSTXH',
    '3 pin JST-XH male top entry',
    'RAW_MATERIAL'::item_type,
    'Number',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM items WHERE code = '3-PIN-JSTXH'
);

INSERT INTO items (tenant_id, code, name, type, uom, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    '4-PIN-JSTXH',
    '4 pin JST-XH housing',
    'RAW_MATERIAL'::item_type,
    'Number',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM items WHERE code = '4-PIN-JSTXH'
);

INSERT INTO items (tenant_id, code, name, type, uom, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    '4-PIN-JSTXH',
    '4 pin JST-XH male top entry',
    'RAW_MATERIAL'::item_type,
    'Number',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM items WHERE code = '4-PIN-JSTXH'
);

INSERT INTO items (tenant_id, code, name, type, uom, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    '4-PIN-JSTXH',
    '4 pin JST-XH male side entry',
    'RAW_MATERIAL'::item_type,
    'Number',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM items WHERE code = '4-PIN-JSTXH'
);

INSERT INTO items (tenant_id, code, name, type, uom, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    '5-PIN-JSTXH',
    '5 pin JST-XH housing',
    'RAW_MATERIAL'::item_type,
    'Number',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM items WHERE code = '5-PIN-JSTXH'
);

INSERT INTO items (tenant_id, code, name, type, uom, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    '5-PIN-JSTXH',
    '5 pin JST-XH male top entry',
    'RAW_MATERIAL'::item_type,
    'Number',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM items WHERE code = '5-PIN-JSTXH'
);

INSERT INTO items (tenant_id, code, name, type, uom, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    '6-PIN-JSTXH',
    '6 pin JST-XH housing',
    'RAW_MATERIAL'::item_type,
    'Number',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM items WHERE code = '6-PIN-JSTXH'
);

INSERT INTO items (tenant_id, code, name, type, uom, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    '6-PIN-JSTXH',
    '6 pin JST-XH male top entry',
    'RAW_MATERIAL'::item_type,
    'Number',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM items WHERE code = '6-PIN-JSTXH'
);

INSERT INTO items (tenant_id, code, name, type, uom, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    '2510-CRIMPING-PINS',
    '2510 Crimping pins',
    'RAW_MATERIAL'::item_type,
    'Number',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM items WHERE code = '2510-CRIMPING-PINS'
);

INSERT INTO items (tenant_id, code, name, type, uom, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    '13-PIN-JSTXH',
    '13 pin JST-XH male top entry',
    'RAW_MATERIAL'::item_type,
    'Number',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM items WHERE code = '13-PIN-JSTXH'
);

INSERT INTO items (tenant_id, code, name, type, uom, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    '15-PIN-JSTXH',
    '15 pin JST-XH male top entry',
    'RAW_MATERIAL'::item_type,
    'Number',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM items WHERE code = '15-PIN-JSTXH'
);

INSERT INTO items (tenant_id, code, name, type, uom, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    'JSTXH-CRIMPING-PINS',
    'JST-XH Crimping pins',
    'RAW_MATERIAL'::item_type,
    'Number',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM items WHERE code = 'JSTXH-CRIMPING-PINS'
);

INSERT INTO items (tenant_id, code, name, type, uom, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    'JSTXH-CRIMPING-PINS',
    'JST-XH Crimping pins Gold Finger',
    'RAW_MATERIAL'::item_type,
    'Number',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM items WHERE code = 'JSTXH-CRIMPING-PINS'
);

INSERT INTO items (tenant_id, code, name, type, uom, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    '25CM-RED-ONE',
    '25cm Red one side crimped wire',
    'RAW_MATERIAL'::item_type,
    'Number',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM items WHERE code = '25CM-RED-ONE'
);

INSERT INTO items (tenant_id, code, name, type, uom, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    '25CM-GREEN-ONE',
    '25cm Green one side crimped wire',
    'RAW_MATERIAL'::item_type,
    'Number',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM items WHERE code = '25CM-GREEN-ONE'
);

INSERT INTO items (tenant_id, code, name, type, uom, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    '25CM-BLACK-ONE',
    '25cm Black one side crimped wire',
    'RAW_MATERIAL'::item_type,
    'Number',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM items WHERE code = '25CM-BLACK-ONE'
);

INSERT INTO items (tenant_id, code, name, type, uom, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    '10CM-ONE-SIDED',
    '10cm one sided JST crimped Black',
    'RAW_MATERIAL'::item_type,
    'Number',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM items WHERE code = '10CM-ONE-SIDED'
);

INSERT INTO items (tenant_id, code, name, type, uom, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    '10CM-ONE-SIDED',
    '10cm one sided JST crimped Green',
    'RAW_MATERIAL'::item_type,
    'Number',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM items WHERE code = '10CM-ONE-SIDED'
);

INSERT INTO items (tenant_id, code, name, type, uom, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    '10CM-ONE-SIDED',
    '10cm one sided JST crimped Voilet',
    'RAW_MATERIAL'::item_type,
    'Number',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM items WHERE code = '10CM-ONE-SIDED'
);

INSERT INTO items (tenant_id, code, name, type, uom, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    '10CM-ONE-SIDED',
    '10cm one sided JST crimped Yellow',
    'RAW_MATERIAL'::item_type,
    'Number',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM items WHERE code = '10CM-ONE-SIDED'
);

INSERT INTO items (tenant_id, code, name, type, uom, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    '10CM-ONE-SIDED',
    '10cm one sided JST crimped Sky Blue',
    'RAW_MATERIAL'::item_type,
    'Number',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM items WHERE code = '10CM-ONE-SIDED'
);

INSERT INTO items (tenant_id, code, name, type, uom, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    '10CM-ONE-SIDED',
    '10cm one sided JST crimped Pink',
    'RAW_MATERIAL'::item_type,
    'Number',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM items WHERE code = '10CM-ONE-SIDED'
);

INSERT INTO items (tenant_id, code, name, type, uom, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    '10CM-ONE-SIDED',
    '10cm one sided JST crimped Orange',
    'RAW_MATERIAL'::item_type,
    'Number',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM items WHERE code = '10CM-ONE-SIDED'
);

INSERT INTO items (tenant_id, code, name, type, uom, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    '10CM-ONE-SIDED',
    '10cm one sided JST crimped Dark Blue',
    'RAW_MATERIAL'::item_type,
    'Number',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM items WHERE code = '10CM-ONE-SIDED'
);

INSERT INTO items (tenant_id, code, name, type, uom, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    '10CM-ONE-SIDED',
    '10cm one sided JST crimped Light Brown',
    'RAW_MATERIAL'::item_type,
    'Number',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM items WHERE code = '10CM-ONE-SIDED'
);

INSERT INTO items (tenant_id, code, name, type, uom, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    '10CM-ONE-SIDED',
    '10cm one sided JST crimped Dark Brown',
    'RAW_MATERIAL'::item_type,
    'Number',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM items WHERE code = '10CM-ONE-SIDED'
);

INSERT INTO items (tenant_id, code, name, type, uom, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    '10CM-ONE-SIDED',
    '10cm one sided JST crimped White with Red strip',
    'RAW_MATERIAL'::item_type,
    'Number',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM items WHERE code = '10CM-ONE-SIDED'
);

INSERT INTO items (tenant_id, code, name, type, uom, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    '10CM-ONE-SIDED',
    '10cm one sided JST crimped White with black strip',
    'RAW_MATERIAL'::item_type,
    'Number',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM items WHERE code = '10CM-ONE-SIDED'
);

INSERT INTO items (tenant_id, code, name, type, uom, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    '10CM-ONE-SIDED',
    '10cm one sided JST crimped White',
    'RAW_MATERIAL'::item_type,
    'Number',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM items WHERE code = '10CM-ONE-SIDED'
);

INSERT INTO items (tenant_id, code, name, type, uom, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    '10CM-ONE-SIDED',
    '10cm one sided JST crimped Red',
    'RAW_MATERIAL'::item_type,
    'Number',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM items WHERE code = '10CM-ONE-SIDED'
);

INSERT INTO items (tenant_id, code, name, type, uom, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    '10CM-ONE-SIDED',
    '10cm one sided JST crimped Light Grey',
    'RAW_MATERIAL'::item_type,
    'Number',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM items WHERE code = '10CM-ONE-SIDED'
);

INSERT INTO items (tenant_id, code, name, type, uom, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    '10CM-ONE-SIDED',
    '10cm one sided JST crimped Cyan',
    'RAW_MATERIAL'::item_type,
    'Number',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM items WHERE code = '10CM-ONE-SIDED'
);

INSERT INTO items (tenant_id, code, name, type, uom, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    '10CM-ONE-SIDED',
    '10cm one sided JST crimped Dark Parrot Green',
    'RAW_MATERIAL'::item_type,
    'Number',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM items WHERE code = '10CM-ONE-SIDED'
);

INSERT INTO items (tenant_id, code, name, type, uom, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    '25CM-BLACK-MICROFIT',
    '25cm Black Microfit one side crimped wires',
    'RAW_MATERIAL'::item_type,
    'Number',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM items WHERE code = '25CM-BLACK-MICROFIT'
);

INSERT INTO items (tenant_id, code, name, type, uom, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    '25CM-GREEN-MICROFIT',
    '25cm Green Microfit one side crimped wires',
    'RAW_MATERIAL'::item_type,
    'Number',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM items WHERE code = '25CM-GREEN-MICROFIT'
);

INSERT INTO items (tenant_id, code, name, type, uom, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    '25CM-VIOLET-MICROFIT',
    '25cm Violet Microfit one side crimped wires',
    'RAW_MATERIAL'::item_type,
    'Number',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM items WHERE code = '25CM-VIOLET-MICROFIT'
);

INSERT INTO items (tenant_id, code, name, type, uom, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    '25CM-YELLOW-MICROFIT',
    '25cm Yellow Microfit one side crimped wires',
    'RAW_MATERIAL'::item_type,
    'Number',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM items WHERE code = '25CM-YELLOW-MICROFIT'
);

INSERT INTO items (tenant_id, code, name, type, uom, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    '25CM-SKY-BLUE',
    '25cm Sky  Blue Microfit one side crimped wires',
    'RAW_MATERIAL'::item_type,
    'Number',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM items WHERE code = '25CM-SKY-BLUE'
);

INSERT INTO items (tenant_id, code, name, type, uom, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    '25CM-PINK-MICROFIT',
    '25cm Pink Microfit one side crimped wires',
    'RAW_MATERIAL'::item_type,
    'Number',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM items WHERE code = '25CM-PINK-MICROFIT'
);

INSERT INTO items (tenant_id, code, name, type, uom, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    '25CM-DARK-PINK',
    '25cm Dark Pink Microfit one side crimped wires',
    'RAW_MATERIAL'::item_type,
    'PCS',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM items WHERE code = '25CM-DARK-PINK'
);

INSERT INTO items (tenant_id, code, name, type, uom, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    '25CM-LBROWN-MICROFIT',
    '25cm L.Brown Microfit one side crimped wires',
    'RAW_MATERIAL'::item_type,
    'Number',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM items WHERE code = '25CM-LBROWN-MICROFIT'
);

INSERT INTO items (tenant_id, code, name, type, uom, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    '25CM-DBROWN-MICROFIT',
    '25cm D.Brown Microfit one side crimped wires',
    'RAW_MATERIAL'::item_type,
    'Number',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM items WHERE code = '25CM-DBROWN-MICROFIT'
);

INSERT INTO items (tenant_id, code, name, type, uom, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    '25CM-WHITE-MICROFIT',
    '25cm White Microfit one side crimped wires',
    'RAW_MATERIAL'::item_type,
    'Number',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM items WHERE code = '25CM-WHITE-MICROFIT'
);

INSERT INTO items (tenant_id, code, name, type, uom, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    '25CM-WHITERED-MICROFIT',
    '25cm White-Red Microfit one side crimped wires (Not Using)',
    'RAW_MATERIAL'::item_type,
    'Number',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM items WHERE code = '25CM-WHITERED-MICROFIT'
);

INSERT INTO items (tenant_id, code, name, type, uom, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    '25CM-WHITEBLACK-MICROFIT',
    '25cm White-Black Microfit one side crimped wires',
    'RAW_MATERIAL'::item_type,
    'PCS',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM items WHERE code = '25CM-WHITEBLACK-MICROFIT'
);

INSERT INTO items (tenant_id, code, name, type, uom, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    '25CM-RED-MICROFIT',
    '25cm Red Microfit one side crimped wires',
    'RAW_MATERIAL'::item_type,
    'Number',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM items WHERE code = '25CM-RED-MICROFIT'
);

INSERT INTO items (tenant_id, code, name, type, uom, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    '25CM-DARK-BLUE',
    '25cm Dark Blue Microfit one side crimped wires',
    'RAW_MATERIAL'::item_type,
    'Number',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM items WHERE code = '25CM-DARK-BLUE'
);

INSERT INTO items (tenant_id, code, name, type, uom, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    '25CM-ORANGE-MICROFIT',
    '25cm Orange Microfit one side crimped wires',
    'RAW_MATERIAL'::item_type,
    'Number',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM items WHERE code = '25CM-ORANGE-MICROFIT'
);

INSERT INTO items (tenant_id, code, name, type, uom, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    'MICROFIT-BALANCING-CABLES',
    'Microfit Balancing Cables',
    'RAW_MATERIAL'::item_type,
    'PCS',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM items WHERE code = 'MICROFIT-BALANCING-CABLES'
);

INSERT INTO items (tenant_id, code, name, type, uom, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    '18PIN-MICROFIT-HOUSING',
    '18pin Microfit housing',
    'RAW_MATERIAL'::item_type,
    'Number',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM items WHERE code = '18PIN-MICROFIT-HOUSING'
);

INSERT INTO items (tenant_id, code, name, type, uom, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    'TACTILE-SWITCH-FOR',
    'Tactile switch for reset two leg',
    'RAW_MATERIAL'::item_type,
    'Number',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM items WHERE code = 'TACTILE-SWITCH-FOR'
);

INSERT INTO items (tenant_id, code, name, type, uom, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    '915MHZ-ANTENNA',
    '915MHz Antenna',
    'RAW_MATERIAL'::item_type,
    'Number',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM items WHERE code = '915MHZ-ANTENNA'
);

INSERT INTO items (tenant_id, code, name, type, uom, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    'IPEX4-TO-SMA',
    'Ipex4 to SMA converter extension (1675015) (Antenna pigtail connectror)',
    'RAW_MATERIAL'::item_type,
    'Number',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM items WHERE code = 'IPEX4-TO-SMA'
);

INSERT INTO items (tenant_id, code, name, type, uom, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    'IPEX4-TO-SMA',
    'Ipex4 to SMA converter extension (for R9MM ipex4)',
    'RAW_MATERIAL'::item_type,
    'Number',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM items WHERE code = 'IPEX4-TO-SMA'
);

INSERT INTO items (tenant_id, code, name, type, uom, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    'R9M-ANTENNA-EXTENSION',
    'R9M Antenna Extension wire RP-SMA to Open',
    'RAW_MATERIAL'::item_type,
    'Number',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM items WHERE code = 'R9M-ANTENNA-EXTENSION'
);

INSERT INTO items (tenant_id, code, name, type, uom, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    'RPSMA-FEMALE-INLINE',
    'RP-SMA Female inline connector for RG174',
    'RAW_MATERIAL'::item_type,
    'Number',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM items WHERE code = 'RPSMA-FEMALE-INLINE'
);

INSERT INTO items (tenant_id, code, name, type, uom, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    'RPSMA-MALE-INLINE',
    'RP-SMA Male inline connector for RG174',
    'RAW_MATERIAL'::item_type,
    'Number',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM items WHERE code = 'RPSMA-MALE-INLINE'
);

INSERT INTO items (tenant_id, code, name, type, uom, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    'RPSMA-FEMALE-INLINE',
    'RP-SMA Female inline connector for RG142',
    'RAW_MATERIAL'::item_type,
    'Number',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM items WHERE code = 'RPSMA-FEMALE-INLINE'
);

INSERT INTO items (tenant_id, code, name, type, uom, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    'RPSMA-MALE-INLINE',
    'RP-SMA Male inline connector for RG142',
    'RAW_MATERIAL'::item_type,
    'Number',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM items WHERE code = 'RPSMA-MALE-INLINE'
);

INSERT INTO items (tenant_id, code, name, type, uom, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    'SMA-FEMALE-INLINE',
    'SMA Female inline connector for RG174',
    'RAW_MATERIAL'::item_type,
    'Number',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM items WHERE code = 'SMA-FEMALE-INLINE'
);

INSERT INTO items (tenant_id, code, name, type, uom, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    'SMA-MALE-INLINE',
    'SMA Male inline connector for RG174',
    'RAW_MATERIAL'::item_type,
    'Number',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM items WHERE code = 'SMA-MALE-INLINE'
);

INSERT INTO items (tenant_id, code, name, type, uom, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    'SMA-FEMALE-INLINE',
    'SMA Female inline connector for RG142',
    'RAW_MATERIAL'::item_type,
    'Number',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM items WHERE code = 'SMA-FEMALE-INLINE'
);

INSERT INTO items (tenant_id, code, name, type, uom, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    'SMA-MALE-CONNECTOR',
    'SMA Male connector inline for RG142',
    'RAW_MATERIAL'::item_type,
    'Number',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM items WHERE code = 'SMA-MALE-CONNECTOR'
);

INSERT INTO items (tenant_id, code, name, type, uom, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    'RG174-COAXIAL-CABLE',
    'RG174 Coaxial cable',
    'RAW_MATERIAL'::item_type,
    'Meter',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM items WHERE code = 'RG174-COAXIAL-CABLE'
);

INSERT INTO items (tenant_id, code, name, type, uom, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    'RG142-COAXIAL-CABLE',
    'RG142 Coaxial cable',
    'RAW_MATERIAL'::item_type,
    'Meter',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM items WHERE code = 'RG142-COAXIAL-CABLE'
);

INSERT INTO items (tenant_id, code, name, type, uom, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    '20-AWG-SILICONE',
    '20 AWG Silicone Red - Wire',
    'RAW_MATERIAL'::item_type,
    'Meter',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM items WHERE code = '20-AWG-SILICONE'
);

INSERT INTO items (tenant_id, code, name, type, uom, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    '25CORE-WIRE-1438',
    '25Core Wire 14/38',
    'RAW_MATERIAL'::item_type,
    'Meter',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM items WHERE code = '25CORE-WIRE-1438'
);

INSERT INTO items (tenant_id, code, name, type, uom, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    '20CORE-WIRE-1438',
    '20Core Wire 14/38',
    'RAW_MATERIAL'::item_type,
    'Meter',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM items WHERE code = '20CORE-WIRE-1438'
);

INSERT INTO items (tenant_id, code, name, type, uom, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    '10CORE-WIRE-1438',
    '10Core Wire 14/38',
    'RAW_MATERIAL'::item_type,
    'PCS',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM items WHERE code = '10CORE-WIRE-1438'
);

INSERT INTO items (tenant_id, code, name, type, uom, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    '8CORE-WIRE-1438',
    '8core Wire 14/38',
    'RAW_MATERIAL'::item_type,
    'Meter',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM items WHERE code = '8CORE-WIRE-1438'
);

INSERT INTO items (tenant_id, code, name, type, uom, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    '1438-16-CORE',
    '14/38 16 Core Wire',
    'RAW_MATERIAL'::item_type,
    'Meter',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM items WHERE code = '1438-16-CORE'
);

INSERT INTO items (tenant_id, code, name, type, uom, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    'RED-1438-WIRE',
    'Red 14/38 wire',
    'RAW_MATERIAL'::item_type,
    'Meter',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM items WHERE code = 'RED-1438-WIRE'
);

INSERT INTO items (tenant_id, code, name, type, uom, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    'BLACK-1438-WIRE',
    'Black 14/38 Wire',
    'RAW_MATERIAL'::item_type,
    'Meter',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM items WHERE code = 'BLACK-1438-WIRE'
);

INSERT INTO items (tenant_id, code, name, type, uom, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    'YELLOW-1438-WIRE',
    'Yellow 14/38 Wire',
    'RAW_MATERIAL'::item_type,
    'Meter',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM items WHERE code = 'YELLOW-1438-WIRE'
);

INSERT INTO items (tenant_id, code, name, type, uom, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    'WHITE-1438-WIRE',
    'White 14/38 Wire',
    'RAW_MATERIAL'::item_type,
    'Meter',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM items WHERE code = 'WHITE-1438-WIRE'
);

INSERT INTO items (tenant_id, code, name, type, uom, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    'SKY-BLUE-1438',
    'Sky Blue 14/38 Wire',
    'RAW_MATERIAL'::item_type,
    'Meter',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM items WHERE code = 'SKY-BLUE-1438'
);

INSERT INTO items (tenant_id, code, name, type, uom, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    'ORANGE-1438-WIRE',
    'Orange 14/38 Wire',
    'RAW_MATERIAL'::item_type,
    'Meter',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM items WHERE code = 'ORANGE-1438-WIRE'
);

INSERT INTO items (tenant_id, code, name, type, uom, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    'GREEN-1438-WIRE',
    'Green 14/38 Wire',
    'RAW_MATERIAL'::item_type,
    'Meter',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM items WHERE code = 'GREEN-1438-WIRE'
);

INSERT INTO items (tenant_id, code, name, type, uom, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    'PURPLE-1438-WIRE',
    'Purple 14/38 Wire',
    'RAW_MATERIAL'::item_type,
    'Meter',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM items WHERE code = 'PURPLE-1438-WIRE'
);

INSERT INTO items (tenant_id, code, name, type, uom, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    'BROWN-1438-WIRE',
    'Brown 14/38 Wire',
    'RAW_MATERIAL'::item_type,
    'Meter',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM items WHERE code = 'BROWN-1438-WIRE'
);

INSERT INTO items (tenant_id, code, name, type, uom, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    'AFT-PLATE-ACRYLICE',
    'Aft plate Acrylice for Template',
    'RAW_MATERIAL'::item_type,
    'Number',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM items WHERE code = 'AFT-PLATE-ACRYLICE'
);

INSERT INTO items (tenant_id, code, name, type, uom, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    '12S-LIPO-CHARGER',
    '12S Lipo Charger',
    'RAW_MATERIAL'::item_type,
    'Number',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM items WHERE code = '12S-LIPO-CHARGER'
);

INSERT INTO items (tenant_id, code, name, type, uom, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    '8S-LIPO-CHARGER',
    '8S Lipo Charger ISDT Q8',
    'RAW_MATERIAL'::item_type,
    'Number',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM items WHERE code = '8S-LIPO-CHARGER'
);

INSERT INTO items (tenant_id, code, name, type, uom, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    '4S-LIPO-CHARGER',
    '4S Lipo Charger ISDT PD60',
    'RAW_MATERIAL'::item_type,
    'Number',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM items WHERE code = '4S-LIPO-CHARGER'
);

INSERT INTO items (tenant_id, code, name, type, uom, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    '8KG-HULL',
    '8kg Hull',
    'RAW_MATERIAL'::item_type,
    'Number',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM items WHERE code = '8KG-HULL'
);

INSERT INTO items (tenant_id, code, name, type, uom, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    'JCB-BODY-CUM',
    'JCB Body cum mounting frame',
    'RAW_MATERIAL'::item_type,
    'Number',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM items WHERE code = 'JCB-BODY-CUM'
);

INSERT INTO items (tenant_id, code, name, type, uom, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    'SR-STRUCTURE',
    'SR Structure',
    'RAW_MATERIAL'::item_type,
    'Number',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM items WHERE code = 'SR-STRUCTURE'
);

INSERT INTO items (tenant_id, code, name, type, uom, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    'SR-PILLOW',
    'SR Pillow',
    'RAW_MATERIAL'::item_type,
    'Number',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM items WHERE code = 'SR-PILLOW'
);

INSERT INTO items (tenant_id, code, name, type, uom, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    'COUPLING-HOOD',
    'Coupling Hood',
    'RAW_MATERIAL'::item_type,
    'Number',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM items WHERE code = 'COUPLING-HOOD'
);

INSERT INTO items (tenant_id, code, name, type, uom, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    '2MM-FRP-60X70MM',
    '2mm FRP 60x70mm with 18 mm hole',
    'RAW_MATERIAL'::item_type,
    'Number',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM items WHERE code = '2MM-FRP-60X70MM'
);

INSERT INTO items (tenant_id, code, name, type, uom, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    'FLOW-SENSOR-CLAMP',
    'flow sensor Clamp',
    'RAW_MATERIAL'::item_type,
    'Number',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM items WHERE code = 'FLOW-SENSOR-CLAMP'
);

INSERT INTO items (tenant_id, code, name, type, uom, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    'ESC-TEMPERATURE-SENSOR',
    'ESC Temperature Sensor Clamp',
    'RAW_MATERIAL'::item_type,
    'Number',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM items WHERE code = 'ESC-TEMPERATURE-SENSOR'
);

INSERT INTO items (tenant_id, code, name, type, uom, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    'BATTERY-CLAMP',
    'Battery Clamp',
    'RAW_MATERIAL'::item_type,
    'Number',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM items WHERE code = 'BATTERY-CLAMP'
);

INSERT INTO items (tenant_id, code, name, type, uom, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    'ELECTRONIC-BOX-TOP',
    'Electronic Box Top Lid',
    'RAW_MATERIAL'::item_type,
    'Number',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM items WHERE code = 'ELECTRONIC-BOX-TOP'
);

INSERT INTO items (tenant_id, code, name, type, uom, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    'BATTERY-HOLDING-FOAM',
    'Battery holding foam block Side (115×80×35)',
    'RAW_MATERIAL'::item_type,
    'Number',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM items WHERE code = 'BATTERY-HOLDING-FOAM'
);

INSERT INTO items (tenant_id, code, name, type, uom, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    'BATTERY-HOLDING-FOAM',
    'Battery holding foam block Upside (80×80×35)',
    'RAW_MATERIAL'::item_type,
    'Number',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM items WHERE code = 'BATTERY-HOLDING-FOAM'
);

INSERT INTO items (tenant_id, code, name, type, uom, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    'BATTERY-CLAMPING-UP',
    'Battery Clamping UP EPE on jet plate (150×80×20)',
    'RAW_MATERIAL'::item_type,
    'Number',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM items WHERE code = 'BATTERY-CLAMPING-UP'
);

INSERT INTO items (tenant_id, code, name, type, uom, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    'BATTERY-CLAMPING-BF',
    'Battery Clamping B&F EPE on jet plate (80×80×10)',
    'RAW_MATERIAL'::item_type,
    'Number',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM items WHERE code = 'BATTERY-CLAMPING-BF'
);

INSERT INTO items (tenant_id, code, name, type, uom, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    'UNDER-ELECBOX-EPE',
    'Under ElecBox EPE (150x230x25)',
    'RAW_MATERIAL'::item_type,
    'Number',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM items WHERE code = 'UNDER-ELECBOX-EPE'
);

INSERT INTO items (tenant_id, code, name, type, uom, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    'ABOVE-ELECBOX-EPE',
    'Above ElecBox EPE (150x80x30)',
    'RAW_MATERIAL'::item_type,
    'Number',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM items WHERE code = 'ABOVE-ELECBOX-EPE'
);

INSERT INTO items (tenant_id, code, name, type, uom, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    'ZIP-TIES-100X3',
    'Zip ties 100x3 MultiCompro',
    'RAW_MATERIAL'::item_type,
    'Number',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM items WHERE code = 'ZIP-TIES-100X3'
);

INSERT INTO items (tenant_id, code, name, type, uom, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    'ZIP-TIES-250M',
    'Zip ties 250m Regular',
    'RAW_MATERIAL'::item_type,
    'Number',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM items WHERE code = 'ZIP-TIES-250M'
);

INSERT INTO items (tenant_id, code, name, type, uom, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    'FERRITE-CORE',
    'Ferrite Core',
    'RAW_MATERIAL'::item_type,
    'Number',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM items WHERE code = 'FERRITE-CORE'
);

INSERT INTO items (tenant_id, code, name, type, uom, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    'SY2115-PIN-PANEL',
    'SY21-15 pin panel mount(Male)',
    'RAW_MATERIAL'::item_type,
    'Number',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM items WHERE code = 'SY2115-PIN-PANEL'
);

INSERT INTO items (tenant_id, code, name, type, uom, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    'SY2115-PIN-CABLE',
    'SY21-15 pin Cable Mount(Female)',
    'RAW_MATERIAL'::item_type,
    'Number',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM items WHERE code = 'SY2115-PIN-CABLE'
);

INSERT INTO items (tenant_id, code, name, type, uom, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    'SY2115-PIN-PANEL',
    'SY21-15 pin panel mount(Female)',
    'RAW_MATERIAL'::item_type,
    'Number',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM items WHERE code = 'SY2115-PIN-PANEL'
);

INSERT INTO items (tenant_id, code, name, type, uom, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    'SY2115-PIN-CABLE',
    'SY21-15 pin Cable Mount(Male)',
    'RAW_MATERIAL'::item_type,
    'Number',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM items WHERE code = 'SY2115-PIN-CABLE'
);

INSERT INTO items (tenant_id, code, name, type, uom, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    'WY28-METAL-CONNECTOR',
    'WY-28 Metal connector CM',
    'RAW_MATERIAL'::item_type,
    'Number',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM items WHERE code = 'WY28-METAL-CONNECTOR'
);

INSERT INTO items (tenant_id, code, name, type, uom, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    'WY28-METAL-CONNECTOR',
    'WY-28 Metal connector PM',
    'RAW_MATERIAL'::item_type,
    'Number',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM items WHERE code = 'WY28-METAL-CONNECTOR'
);

INSERT INTO items (tenant_id, code, name, type, uom, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    'WK15-IP68-CABLE',
    'WK-15 IP68 Cable Metal Connector',
    'RAW_MATERIAL'::item_type,
    'Number',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM items WHERE code = 'WK15-IP68-CABLE'
);

INSERT INTO items (tenant_id, code, name, type, uom, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    'WK15-IP68-CABLE',
    'WK-15 IP68 Cable Metal Connector',
    'RAW_MATERIAL'::item_type,
    'PCS',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM items WHERE code = 'WK15-IP68-CABLE'
);

INSERT INTO items (tenant_id, code, name, type, uom, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    '15-PIN-IP68',
    '15 pin IP68 connectors (Female)',
    'RAW_MATERIAL'::item_type,
    'PCS',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM items WHERE code = '15-PIN-IP68'
);

INSERT INTO items (tenant_id, code, name, type, uom, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    '15-PIN-IP68',
    '15 pin IP68 Connectors (Male)',
    'RAW_MATERIAL'::item_type,
    'PCS',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM items WHERE code = '15-PIN-IP68'
);

INSERT INTO items (tenant_id, code, name, type, uom, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    'SA12-9PIN-CM',
    'SA12 9pin CM Pushpull Male',
    'RAW_MATERIAL'::item_type,
    'Number',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM items WHERE code = 'SA12-9PIN-CM'
);

INSERT INTO items (tenant_id, code, name, type, uom, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    'SA12-9PIN-PM',
    'SA12 9pin PM Pushpull female',
    'RAW_MATERIAL'::item_type,
    'Number',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM items WHERE code = 'SA12-9PIN-PM'
);

INSERT INTO items (tenant_id, code, name, type, uom, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    'SA12-9PIN-COUNTER',
    'SA12 9pin Counter',
    'RAW_MATERIAL'::item_type,
    'Number',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM items WHERE code = 'SA12-9PIN-COUNTER'
);

INSERT INTO items (tenant_id, code, name, type, uom, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    'LP12-3-PIN',
    'LP12 3 pin plug male clip lock CM',
    'RAW_MATERIAL'::item_type,
    'Number',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM items WHERE code = 'LP12-3-PIN'
);

INSERT INTO items (tenant_id, code, name, type, uom, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    'LP12-3-PIN',
    'LP12 3 pin socket female clip lock PM',
    'RAW_MATERIAL'::item_type,
    'Number',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM items WHERE code = 'LP12-3-PIN'
);

INSERT INTO items (tenant_id, code, name, type, uom, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    'LP12-4-PIN',
    'LP12 4 pin plug male clip lock CM',
    'RAW_MATERIAL'::item_type,
    'Number',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM items WHERE code = 'LP12-4-PIN'
);

INSERT INTO items (tenant_id, code, name, type, uom, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    'LP12-4-PIN',
    'LP12 4 pin socket female clip lock PM',
    'RAW_MATERIAL'::item_type,
    'Number',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM items WHERE code = 'LP12-4-PIN'
);

INSERT INTO items (tenant_id, code, name, type, uom, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    'LP12-8-PIN',
    'LP12 8 pin plug male clip lock CM',
    'RAW_MATERIAL'::item_type,
    'Number',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM items WHERE code = 'LP12-8-PIN'
);

INSERT INTO items (tenant_id, code, name, type, uom, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    'LP12-8-PIN',
    'LP12 8 pin socket female clip lock PM',
    'RAW_MATERIAL'::item_type,
    'Number',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM items WHERE code = 'LP12-8-PIN'
);

INSERT INTO items (tenant_id, code, name, type, uom, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    'LP24-24-PIN',
    'LP24 24 pin plug male clip lock CM (Not Using)',
    'RAW_MATERIAL'::item_type,
    'Number',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM items WHERE code = 'LP24-24-PIN'
);

INSERT INTO items (tenant_id, code, name, type, uom, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    'LP24-24-PIN',
    'LP24 24 pin socket female clip lock PM (Not Using)',
    'RAW_MATERIAL'::item_type,
    'Number',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM items WHERE code = 'LP24-24-PIN'
);

INSERT INTO items (tenant_id, code, name, type, uom, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    'LP24-24-PIN',
    'LP24 24 pin plug female clip lock CM',
    'RAW_MATERIAL'::item_type,
    'Number',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM items WHERE code = 'LP24-24-PIN'
);

INSERT INTO items (tenant_id, code, name, type, uom, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    'LP24-24-PIN',
    'LP24 24 pin socket male clip lock PM',
    'RAW_MATERIAL'::item_type,
    'Number',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM items WHERE code = 'LP24-24-PIN'
);

INSERT INTO items (tenant_id, code, name, type, uom, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    'WATER-TANK-FOR',
    'Water tank for JCB',
    'RAW_MATERIAL'::item_type,
    'Number',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM items WHERE code = 'WATER-TANK-FOR'
);

INSERT INTO items (tenant_id, code, name, type, uom, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    'BLUEROBOTICS-LEAK-PROBE',
    'BlueRobotics Leak probe',
    'RAW_MATERIAL'::item_type,
    'Number',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM items WHERE code = 'BLUEROBOTICS-LEAK-PROBE'
);

INSERT INTO items (tenant_id, code, name, type, uom, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    'BLUEROBOTICS-INDICATOR',
    'BlueRobotics Indicator',
    'RAW_MATERIAL'::item_type,
    'Number',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM items WHERE code = 'BLUEROBOTICS-INDICATOR'
);

INSERT INTO items (tenant_id, code, name, type, uom, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    'IP68-ROTARY-MAIN',
    'IP68 Rotary main Switch',
    'RAW_MATERIAL'::item_type,
    'Number',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM items WHERE code = 'IP68-ROTARY-MAIN'
);

INSERT INTO items (tenant_id, code, name, type, uom, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    'RED-2835-SMD',
    'Red 2835 SMD LED 1W',
    'RAW_MATERIAL'::item_type,
    'Number',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM items WHERE code = 'RED-2835-SMD'
);

INSERT INTO items (tenant_id, code, name, type, uom, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    'GREEN-2835-SMD',
    'Green 2835 SMD LED 1W',
    'RAW_MATERIAL'::item_type,
    'Number',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM items WHERE code = 'GREEN-2835-SMD'
);

INSERT INTO items (tenant_id, code, name, type, uom, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    'NO-4-SELF',
    'No. 4 Self tap Screw SS304 (M4x6.5 Philips)',
    'RAW_MATERIAL'::item_type,
    'Number',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM items WHERE code = 'NO-4-SELF'
);

INSERT INTO items (tenant_id, code, name, type, uom, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    'M2X12-ALLEN-HEAD',
    'M2x12 Allen Head SS304',
    'RAW_MATERIAL'::item_type,
    'Number',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM items WHERE code = 'M2X12-ALLEN-HEAD'
);

INSERT INTO items (tenant_id, code, name, type, uom, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    'M3X6-CSK-PHILLIPS',
    'M3x6 CSK Phillips',
    'RAW_MATERIAL'::item_type,
    'Number',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM items WHERE code = 'M3X6-CSK-PHILLIPS'
);

INSERT INTO items (tenant_id, code, name, type, uom, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    'M3X8-CSK-PHILLIPS',
    'M3x8 CSK Phillips',
    'RAW_MATERIAL'::item_type,
    'Number',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM items WHERE code = 'M3X8-CSK-PHILLIPS'
);

INSERT INTO items (tenant_id, code, name, type, uom, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    'M3X30-CSK-PHILLIPS',
    'M3x30 CSK Phillips',
    'RAW_MATERIAL'::item_type,
    'Number',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM items WHERE code = 'M3X30-CSK-PHILLIPS'
);

INSERT INTO items (tenant_id, code, name, type, uom, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    'M3X8-BUTTON-HEAD',
    'M3x8 Button head',
    'RAW_MATERIAL'::item_type,
    'Number',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM items WHERE code = 'M3X8-BUTTON-HEAD'
);

INSERT INTO items (tenant_id, code, name, type, uom, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    'M3X10-PLAIN-WASHER',
    'M3x10 plain washer',
    'RAW_MATERIAL'::item_type,
    'Number',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM items WHERE code = 'M3X10-PLAIN-WASHER'
);

INSERT INTO items (tenant_id, code, name, type, uom, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    'M4X8-CSK-PHILLIPS',
    'M4x8 CSK Phillips',
    'RAW_MATERIAL'::item_type,
    'Number',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM items WHERE code = 'M4X8-CSK-PHILLIPS'
);

INSERT INTO items (tenant_id, code, name, type, uom, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    'M4X8-CSK-PHILLIPS',
    'M4x8 CSK Phillips GI',
    'RAW_MATERIAL'::item_type,
    'Number',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM items WHERE code = 'M4X8-CSK-PHILLIPS'
);

INSERT INTO items (tenant_id, code, name, type, uom, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    'M2X15-ALLEN-HEAD',
    'M2x15 Allen Head SS304',
    'RAW_MATERIAL'::item_type,
    'PCS',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM items WHERE code = 'M2X15-ALLEN-HEAD'
);

INSERT INTO items (tenant_id, code, name, type, uom, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    'M4X10-CSK-PHILLIPS',
    'M4x10 CSK Phillips',
    'RAW_MATERIAL'::item_type,
    'Number',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM items WHERE code = 'M4X10-CSK-PHILLIPS'
);

INSERT INTO items (tenant_id, code, name, type, uom, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    'M4X20-CSK-PHILLIPS',
    'M4x20 CSK Phillips',
    'RAW_MATERIAL'::item_type,
    'Number',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM items WHERE code = 'M4X20-CSK-PHILLIPS'
);

INSERT INTO items (tenant_id, code, name, type, uom, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    'M4X20-PLAIN-WASHER',
    'M4x20 Plain Washer',
    'RAW_MATERIAL'::item_type,
    'PCS',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM items WHERE code = 'M4X20-PLAIN-WASHER'
);

INSERT INTO items (tenant_id, code, name, type, uom, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    'M4X12-ALLEN-HEAD',
    'M4x12 Allen Head',
    'RAW_MATERIAL'::item_type,
    'Number',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM items WHERE code = 'M4X12-ALLEN-HEAD'
);

INSERT INTO items (tenant_id, code, name, type, uom, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    'M4X16-ALLEN-HEAD',
    'M4x16 Allen Head',
    'RAW_MATERIAL'::item_type,
    'Number',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM items WHERE code = 'M4X16-ALLEN-HEAD'
);

INSERT INTO items (tenant_id, code, name, type, uom, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    'M4X10-ALLEN-HEAD',
    'M4x10 Allen head',
    'RAW_MATERIAL'::item_type,
    'PCS',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM items WHERE code = 'M4X10-ALLEN-HEAD'
);

INSERT INTO items (tenant_id, code, name, type, uom, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    'M4X30-ALLEN-HEAD',
    'M4x30 Allen head',
    'RAW_MATERIAL'::item_type,
    'PCS',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM items WHERE code = 'M4X30-ALLEN-HEAD'
);

INSERT INTO items (tenant_id, code, name, type, uom, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    'M4X40-ALLEN-HEAD',
    'M4X40 Allen head',
    'RAW_MATERIAL'::item_type,
    'PCS',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM items WHERE code = 'M4X40-ALLEN-HEAD'
);

INSERT INTO items (tenant_id, code, name, type, uom, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    'M5X15-PLAIN-WASHER',
    'M5x15 plain washer',
    'RAW_MATERIAL'::item_type,
    'Number',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM items WHERE code = 'M5X15-PLAIN-WASHER'
);

INSERT INTO items (tenant_id, code, name, type, uom, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    'M4X20-ALLEN-HEAD',
    'M4x20 Allen Head',
    'RAW_MATERIAL'::item_type,
    'Number',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM items WHERE code = 'M4X20-ALLEN-HEAD'
);

INSERT INTO items (tenant_id, code, name, type, uom, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    'M4X12-BUTTON-HEAD',
    'M4x12 Button Head',
    'RAW_MATERIAL'::item_type,
    'Number',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM items WHERE code = 'M4X12-BUTTON-HEAD'
);

INSERT INTO items (tenant_id, code, name, type, uom, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    'M4X12-PAN-COMBI',
    'M4x12 Pan Combi',
    'RAW_MATERIAL'::item_type,
    'Number',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM items WHERE code = 'M4X12-PAN-COMBI'
);

INSERT INTO items (tenant_id, code, name, type, uom, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    'M4X12-PLAIN-WASHER',
    'M4x12 plain washer',
    'RAW_MATERIAL'::item_type,
    'Number',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM items WHERE code = 'M4X12-PLAIN-WASHER'
);

INSERT INTO items (tenant_id, code, name, type, uom, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    'M4-SPRING-WASHER',
    'M4 Spring Washer',
    'RAW_MATERIAL'::item_type,
    'Number',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM items WHERE code = 'M4-SPRING-WASHER'
);

INSERT INTO items (tenant_id, code, name, type, uom, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    'M4-NYLOCK',
    'M4 Nylock',
    'RAW_MATERIAL'::item_type,
    'Number',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM items WHERE code = 'M4-NYLOCK'
);

INSERT INTO items (tenant_id, code, name, type, uom, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    'M4-SQUARE-NUT',
    'M4 Square Nut',
    'RAW_MATERIAL'::item_type,
    'Number',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM items WHERE code = 'M4-SQUARE-NUT'
);

INSERT INTO items (tenant_id, code, name, type, uom, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    'M3-SQUARE-NUTS',
    'M3 Square Nuts',
    'RAW_MATERIAL'::item_type,
    'PCS',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM items WHERE code = 'M3-SQUARE-NUTS'
);

INSERT INTO items (tenant_id, code, name, type, uom, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    'M4X5-GRUB',
    'M4x5 Grub',
    'RAW_MATERIAL'::item_type,
    'PCS',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM items WHERE code = 'M4X5-GRUB'
);

INSERT INTO items (tenant_id, code, name, type, uom, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    'M5X10-ALLEN-HEAD',
    'M5x10 Allen Head (AMCA)',
    'RAW_MATERIAL'::item_type,
    'Number',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM items WHERE code = 'M5X10-ALLEN-HEAD'
);

INSERT INTO items (tenant_id, code, name, type, uom, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    'M5X10-PAN-TORX',
    'M5x10 Pan Torx',
    'RAW_MATERIAL'::item_type,
    'Number',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM items WHERE code = 'M5X10-PAN-TORX'
);

INSERT INTO items (tenant_id, code, name, type, uom, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    'M5X10-GRUB-SCREW',
    'M5x10 Grub Screw',
    'RAW_MATERIAL'::item_type,
    'Number',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM items WHERE code = 'M5X10-GRUB-SCREW'
);

INSERT INTO items (tenant_id, code, name, type, uom, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    'M5X50-CSK-PHILIPS',
    'M5x50 CSK Philips',
    'RAW_MATERIAL'::item_type,
    'PCS',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM items WHERE code = 'M5X50-CSK-PHILIPS'
);

INSERT INTO items (tenant_id, code, name, type, uom, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    'M5X50-ALLEN-CAP',
    'M5x50 Allen Cap',
    'RAW_MATERIAL'::item_type,
    'PCS',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM items WHERE code = 'M5X50-ALLEN-CAP'
);

INSERT INTO items (tenant_id, code, name, type, uom, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    'M6X150-ALLEN-HEAD',
    'M6x150 Allen Head',
    'RAW_MATERIAL'::item_type,
    'Number',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM items WHERE code = 'M6X150-ALLEN-HEAD'
);

INSERT INTO items (tenant_id, code, name, type, uom, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    'M6-NYLOCK',
    'M6 Nylock',
    'RAW_MATERIAL'::item_type,
    'Number',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM items WHERE code = 'M6-NYLOCK'
);

INSERT INTO items (tenant_id, code, name, type, uom, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    'M6X15-PLAIN-WASHER',
    'M6x15 plain washer',
    'RAW_MATERIAL'::item_type,
    'Number',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM items WHERE code = 'M6X15-PLAIN-WASHER'
);

INSERT INTO items (tenant_id, code, name, type, uom, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    'PLAIN-WASHER-6X20X1',
    'Plain Washer 6x20x1',
    'RAW_MATERIAL'::item_type,
    'PCS',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM items WHERE code = 'PLAIN-WASHER-6X20X1'
);

INSERT INTO items (tenant_id, code, name, type, uom, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    'M6X10-GRUB-SCREW',
    'M6x10 Grub Screw',
    'RAW_MATERIAL'::item_type,
    'Number',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM items WHERE code = 'M6X10-GRUB-SCREW'
);

INSERT INTO items (tenant_id, code, name, type, uom, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    'M6-DOM-NUT',
    'M6 Dom Nut',
    'RAW_MATERIAL'::item_type,
    'PCS',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM items WHERE code = 'M6-DOM-NUT'
);

INSERT INTO items (tenant_id, code, name, type, uom, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    'BUTTON-HEAD-6X12',
    'Button Head 6x12',
    'RAW_MATERIAL'::item_type,
    'Number',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM items WHERE code = 'BUTTON-HEAD-6X12'
);

INSERT INTO items (tenant_id, code, name, type, uom, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    'M6X30-BUTTON-HEAD',
    'M6x30 Button Head',
    'RAW_MATERIAL'::item_type,
    'PCS',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM items WHERE code = 'M6X30-BUTTON-HEAD'
);

INSERT INTO items (tenant_id, code, name, type, uom, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    'M6X30-ALLEN-CAP',
    'M6x30 Allen Cap',
    'RAW_MATERIAL'::item_type,
    'PCS',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM items WHERE code = 'M6X30-ALLEN-CAP'
);

INSERT INTO items (tenant_id, code, name, type, uom, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    'HEX-NUT-3MM',
    'Hex Nut 3mm',
    'RAW_MATERIAL'::item_type,
    'PCS',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM items WHERE code = 'HEX-NUT-3MM'
);

INSERT INTO items (tenant_id, code, name, type, uom, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    'HEX-NUT-6MM',
    'Hex Nut 6mm',
    'RAW_MATERIAL'::item_type,
    'PCS',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM items WHERE code = 'HEX-NUT-6MM'
);

INSERT INTO items (tenant_id, code, name, type, uom, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    'M8X20-PLAIN-WASHER',
    'M8x20 plain washer',
    'RAW_MATERIAL'::item_type,
    'Number',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM items WHERE code = 'M8X20-PLAIN-WASHER'
);

INSERT INTO items (tenant_id, code, name, type, uom, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    'M8X25-ALLEN-HEAD',
    'M8x25 Allen Head',
    'RAW_MATERIAL'::item_type,
    'Number',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM items WHERE code = 'M8X25-ALLEN-HEAD'
);

INSERT INTO items (tenant_id, code, name, type, uom, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    'M5X12-BUTTON-HD',
    'M5X12 Button HD Torx',
    'RAW_MATERIAL'::item_type,
    'PCS',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM items WHERE code = 'M5X12-BUTTON-HD'
);

INSERT INTO items (tenant_id, code, name, type, uom, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    'CELLO-TAPE',
    'Cello Tape',
    'RAW_MATERIAL'::item_type,
    'Number',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM items WHERE code = 'CELLO-TAPE'
);

INSERT INTO items (tenant_id, code, name, type, uom, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    'COPPER-STRIPS-3X2',
    'Copper Strips 3x2 cells',
    'RAW_MATERIAL'::item_type,
    'Number',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM items WHERE code = 'COPPER-STRIPS-3X2'
);

INSERT INTO items (tenant_id, code, name, type, uom, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    'KAPTON-TAPE',
    'Kapton Tape',
    'RAW_MATERIAL'::item_type,
    'PCS',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM items WHERE code = 'KAPTON-TAPE'
);

INSERT INTO items (tenant_id, code, name, type, uom, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    '70MM-PAPER-SEPARATOR',
    '70mm Paper Separator',
    'RAW_MATERIAL'::item_type,
    'Number',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM items WHERE code = '70MM-PAPER-SEPARATOR'
);

INSERT INTO items (tenant_id, code, name, type, uom, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    'BARLEY-PAPER-FOR',
    'Barley paper for 21700 cylindrical cell',
    'RAW_MATERIAL'::item_type,
    'Number',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM items WHERE code = 'BARLEY-PAPER-FOR'
);

INSERT INTO items (tenant_id, code, name, type, uom, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    'BATTERY-BARLEY-ROLL',
    'Battery Barley roll',
    'RAW_MATERIAL'::item_type,
    'PCS',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM items WHERE code = 'BATTERY-BARLEY-ROLL'
);

INSERT INTO items (tenant_id, code, name, type, uom, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    '1S-BMS',
    '1S BMS',
    'RAW_MATERIAL'::item_type,
    'PCS',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM items WHERE code = '1S-BMS'
);

INSERT INTO items (tenant_id, code, name, type, uom, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    '2S-BMS',
    '2S BMS',
    'RAW_MATERIAL'::item_type,
    'Number',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM items WHERE code = '2S-BMS'
);

INSERT INTO items (tenant_id, code, name, type, uom, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    '3S-BMS',
    '3S BMS',
    'RAW_MATERIAL'::item_type,
    'Number',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM items WHERE code = '3S-BMS'
);

INSERT INTO items (tenant_id, code, name, type, uom, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    '16AWG-LEAD',
    '16AWG Lead',
    'RAW_MATERIAL'::item_type,
    'Grm',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM items WHERE code = '16AWG-LEAD'
);

INSERT INTO items (tenant_id, code, name, type, uom, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    '130X80X60-ENCLOSURE-BOX',
    '130x80x60 enclosure box',
    'RAW_MATERIAL'::item_type,
    'Number',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM items WHERE code = '130X80X60-ENCLOSURE-BOX'
);

INSERT INTO items (tenant_id, code, name, type, uom, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    'PG7-CABLE-GLAND',
    'PG-7 Cable Gland',
    'RAW_MATERIAL'::item_type,
    'Number',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM items WHERE code = 'PG7-CABLE-GLAND'
);

INSERT INTO items (tenant_id, code, name, type, uom, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    'PG9-CABLE-GLANDPG',
    'PG-9 Cable Gland(PG -11)',
    'RAW_MATERIAL'::item_type,
    'Number',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM items WHERE code = 'PG9-CABLE-GLANDPG'
);

INSERT INTO items (tenant_id, code, name, type, uom, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    'SOLID-COUPLING-ALUMINIUM',
    'Solid coupling (Aluminium)',
    'RAW_MATERIAL'::item_type,
    'Number',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM items WHERE code = 'SOLID-COUPLING-ALUMINIUM'
);

INSERT INTO items (tenant_id, code, name, type, uom, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    'ROTEX14-COUPLING',
    'Rotex14 Coupling',
    'RAW_MATERIAL'::item_type,
    'Number',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM items WHERE code = 'ROTEX14-COUPLING'
);

INSERT INTO items (tenant_id, code, name, type, uom, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    'SPIDERS',
    'Spiders',
    'RAW_MATERIAL'::item_type,
    'PCS',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM items WHERE code = 'SPIDERS'
);

INSERT INTO items (tenant_id, code, name, type, uom, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    'ELECTRONIC-BOX',
    'Electronic Box',
    'RAW_MATERIAL'::item_type,
    'Number',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM items WHERE code = 'ELECTRONIC-BOX'
);

INSERT INTO items (tenant_id, code, name, type, uom, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    'FRONT-LID',
    'Front Lid',
    'RAW_MATERIAL'::item_type,
    'Number',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM items WHERE code = 'FRONT-LID'
);

INSERT INTO items (tenant_id, code, name, type, uom, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    'BOTTOM-BLOCK-INLET',
    'Bottom Block (Inlet Block)',
    'RAW_MATERIAL'::item_type,
    'Number',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM items WHERE code = 'BOTTOM-BLOCK-INLET'
);

INSERT INTO items (tenant_id, code, name, type, uom, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    'IP-REMOTE',
    'IP Remote',
    'RAW_MATERIAL'::item_type,
    'PCS',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM items WHERE code = 'IP-REMOTE'
);

INSERT INTO items (tenant_id, code, name, type, uom, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    'IP-REMOTE-UPPER',
    'IP Remote Upper Shell',
    'RAW_MATERIAL'::item_type,
    'Number',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM items WHERE code = 'IP-REMOTE-UPPER'
);

INSERT INTO items (tenant_id, code, name, type, uom, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    'IP-REMOTE-LOWER',
    'IP Remote Lower Shell',
    'RAW_MATERIAL'::item_type,
    'Number',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM items WHERE code = 'IP-REMOTE-LOWER'
);

INSERT INTO items (tenant_id, code, name, type, uom, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    'REMOTE-BOX',
    'Remote Box',
    'RAW_MATERIAL'::item_type,
    'PCS',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM items WHERE code = 'REMOTE-BOX'
);

INSERT INTO items (tenant_id, code, name, type, uom, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    'FLASHING-LIGHT-PORT',
    'Flashing Light Port',
    'RAW_MATERIAL'::item_type,
    'PCS',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM items WHERE code = 'FLASHING-LIGHT-PORT'
);

INSERT INTO items (tenant_id, code, name, type, uom, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    'FLSHING-LIGHT-STBD',
    'Flshing Light STBD',
    'RAW_MATERIAL'::item_type,
    'PCS',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM items WHERE code = 'FLSHING-LIGHT-STBD'
);

INSERT INTO items (tenant_id, code, name, type, uom, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    'FLASHING-LIGHT-GLASS',
    'Flashing Light glass',
    'RAW_MATERIAL'::item_type,
    'Number',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM items WHERE code = 'FLASHING-LIGHT-GLASS'
);

INSERT INTO items (tenant_id, code, name, type, uom, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    'FLASHING-LIGHT-BOTTOM',
    'Flashing Light bottom plate',
    'RAW_MATERIAL'::item_type,
    'Number',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM items WHERE code = 'FLASHING-LIGHT-BOTTOM'
);

INSERT INTO items (tenant_id, code, name, type, uom, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    'PU-GASKET-REMOTE',
    'PU Gasket Remote Lower Shell',
    'RAW_MATERIAL'::item_type,
    'Number',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM items WHERE code = 'PU-GASKET-REMOTE'
);

INSERT INTO items (tenant_id, code, name, type, uom, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    'PU-GASKET-ELECTRONIC',
    'PU Gasket Electronic Box',
    'RAW_MATERIAL'::item_type,
    'Number',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM items WHERE code = 'PU-GASKET-ELECTRONIC'
);

INSERT INTO items (tenant_id, code, name, type, uom, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    'PU-GASKET-FRONT',
    'PU Gasket Front Lid',
    'RAW_MATERIAL'::item_type,
    'Number',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM items WHERE code = 'PU-GASKET-FRONT'
);

INSERT INTO items (tenant_id, code, name, type, uom, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    'GREASE',
    'Grease',
    'RAW_MATERIAL'::item_type,
    'Grm',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM items WHERE code = 'GREASE'
);

INSERT INTO items (tenant_id, code, name, type, uom, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    'HEATSHRINK-TUBE-6416',
    'Heatshrink Tube 6.4:1.6',
    'RAW_MATERIAL'::item_type,
    'Meter',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM items WHERE code = 'HEATSHRINK-TUBE-6416'
);

INSERT INTO items (tenant_id, code, name, type, uom, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    'HEATSHRINK-TUBE-93',
    'Heatshrink Tube 9:3',
    'RAW_MATERIAL'::item_type,
    'Meter',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM items WHERE code = 'HEATSHRINK-TUBE-93'
);

INSERT INTO items (tenant_id, code, name, type, uom, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    'HEATSHRINK-TUBE-41',
    'HeatShrink Tube 4:1',
    'RAW_MATERIAL'::item_type,
    'Meter',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM items WHERE code = 'HEATSHRINK-TUBE-41'
);

INSERT INTO items (tenant_id, code, name, type, uom, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    'HEATSHRINK-TUBE-24',
    'HeatShrink Tube 2:4',
    'RAW_MATERIAL'::item_type,
    'Meter',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM items WHERE code = 'HEATSHRINK-TUBE-24'
);

INSERT INTO items (tenant_id, code, name, type, uom, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    'HEATSHRINK-TUBE-31',
    'HeatShrink Tube 3:1',
    'RAW_MATERIAL'::item_type,
    'Meter',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM items WHERE code = 'HEATSHRINK-TUBE-31'
);

INSERT INTO items (tenant_id, code, name, type, uom, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    'HEATSHRINK-TUBE-123',
    'HeatShrink Tube 12:3',
    'RAW_MATERIAL'::item_type,
    'Meter',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM items WHERE code = 'HEATSHRINK-TUBE-123'
);

INSERT INTO items (tenant_id, code, name, type, uom, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    'HEATSHRINK-TUBE-4812',
    'HeatShrink Tube 4.8/1.2',
    'RAW_MATERIAL'::item_type,
    'Meter',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM items WHERE code = 'HEATSHRINK-TUBE-4812'
);

INSERT INTO items (tenant_id, code, name, type, uom, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    'HEATSHRINK-TUBE-15MM16MM',
    'HeatShrink Tube 1.5mm/1.6mm',
    'RAW_MATERIAL'::item_type,
    'Meter',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM items WHERE code = 'HEATSHRINK-TUBE-15MM16MM'
);

INSERT INTO items (tenant_id, code, name, type, uom, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    'HEATSHRINK-TUBE-100MM',
    'HeatShrink Tube 100mm',
    'RAW_MATERIAL'::item_type,
    'Meter',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM items WHERE code = 'HEATSHRINK-TUBE-100MM'
);

INSERT INTO items (tenant_id, code, name, type, uom, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    'HEATSHRINK-TUBE-30MM',
    'HeatShrink Tube 30mm',
    'RAW_MATERIAL'::item_type,
    'PCS',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM items WHERE code = 'HEATSHRINK-TUBE-30MM'
);

INSERT INTO items (tenant_id, code, name, type, uom, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    'HEAT-SHRINK-SLEEVE',
    'Heat Shrink Sleeve 16mm Transparent',
    'RAW_MATERIAL'::item_type,
    'PCS',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM items WHERE code = 'HEAT-SHRINK-SLEEVE'
);

INSERT INTO items (tenant_id, code, name, type, uom, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    'GREASING-PUMP',
    'Greasing Pump',
    'RAW_MATERIAL'::item_type,
    'Number',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM items WHERE code = 'GREASING-PUMP'
);

INSERT INTO items (tenant_id, code, name, type, uom, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    'HEATSINK-PASTE',
    'Heatsink paste',
    'RAW_MATERIAL'::item_type,
    'Grm',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM items WHERE code = 'HEATSINK-PASTE'
);

INSERT INTO items (tenant_id, code, name, type, uom, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    'TEROSON-MS930',
    'Teroson MS930',
    'RAW_MATERIAL'::item_type,
    'ml',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM items WHERE code = 'TEROSON-MS930'
);

INSERT INTO items (tenant_id, code, name, type, uom, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    'SILICON-RTV-732',
    'Silicon RTV 732',
    'RAW_MATERIAL'::item_type,
    'ml',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM items WHERE code = 'SILICON-RTV-732'
);

INSERT INTO items (tenant_id, code, name, type, uom, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    'SILICON-RTV-734',
    'Silicon RTV 734 Potting compound',
    'RAW_MATERIAL'::item_type,
    'ml',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM items WHERE code = 'SILICON-RTV-734'
);

INSERT INTO items (tenant_id, code, name, type, uom, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    'MASKING-TAPE-12',
    'Masking Tape 1/2 inch',
    'RAW_MATERIAL'::item_type,
    'PCS',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM items WHERE code = 'MASKING-TAPE-12'
);

INSERT INTO items (tenant_id, code, name, type, uom, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    'MASKING-TAPE-34',
    'Masking Tape 3/4',
    'RAW_MATERIAL'::item_type,
    'PCS',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM items WHERE code = 'MASKING-TAPE-34'
);

INSERT INTO items (tenant_id, code, name, type, uom, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    '1-MASKING-TAPE',
    '1" Masking Tape',
    'RAW_MATERIAL'::item_type,
    'Meter',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM items WHERE code = '1-MASKING-TAPE'
);

INSERT INTO items (tenant_id, code, name, type, uom, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    '2-MASKING-TAPE',
    '2" Masking Tape',
    'RAW_MATERIAL'::item_type,
    'PCS',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM items WHERE code = '2-MASKING-TAPE'
);

INSERT INTO items (tenant_id, code, name, type, uom, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    'DUCK-TAPE',
    'Duck Tape',
    'RAW_MATERIAL'::item_type,
    'PCS',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM items WHERE code = 'DUCK-TAPE'
);

INSERT INTO items (tenant_id, code, name, type, uom, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    '3M-TAPE',
    '3M Tape',
    'RAW_MATERIAL'::item_type,
    'PCS',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM items WHERE code = '3M-TAPE'
);

INSERT INTO items (tenant_id, code, name, type, uom, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    'RR-TAPE',
    'RR Tape',
    'RAW_MATERIAL'::item_type,
    'Meter',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM items WHERE code = 'RR-TAPE'
);

INSERT INTO items (tenant_id, code, name, type, uom, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    'FLEXBOND',
    'FlexBond',
    'RAW_MATERIAL'::item_type,
    'ml',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM items WHERE code = 'FLEXBOND'
);

INSERT INTO items (tenant_id, code, name, type, uom, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    'LOCK-TITE-242',
    'Lock Tite 242',
    'RAW_MATERIAL'::item_type,
    'PCS',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM items WHERE code = 'LOCK-TITE-242'
);

INSERT INTO items (tenant_id, code, name, type, uom, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    'LOCK-TITE-270',
    'Lock Tite 270',
    'RAW_MATERIAL'::item_type,
    'PCS',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM items WHERE code = 'LOCK-TITE-270'
);

INSERT INTO items (tenant_id, code, name, type, uom, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    'STAPLES-PINS',
    'Staples pins',
    'RAW_MATERIAL'::item_type,
    'Number',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM items WHERE code = 'STAPLES-PINS'
);

INSERT INTO items (tenant_id, code, name, type, uom, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    'BRASS-NOZZLE-FOR',
    'Brass nozzle for water outlet from JCB',
    'RAW_MATERIAL'::item_type,
    'Number',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM items WHERE code = 'BRASS-NOZZLE-FOR'
);

INSERT INTO items (tenant_id, code, name, type, uom, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    'JCB-BATTERY-HOLDERS',
    'JCB Battery Holders 3D Print',
    'RAW_MATERIAL'::item_type,
    'PCS',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM items WHERE code = 'JCB-BATTERY-HOLDERS'
);

INSERT INTO items (tenant_id, code, name, type, uom, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    'SS-COOLING-WATER',
    'SS Cooling Water Outlet nozzle',
    'RAW_MATERIAL'::item_type,
    'Number',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM items WHERE code = 'SS-COOLING-WATER'
);

INSERT INTO items (tenant_id, code, name, type, uom, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    'SS-COOLING-WATER',
    'SS Cooling Water Inlet nozzle',
    'RAW_MATERIAL'::item_type,
    'Number',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM items WHERE code = 'SS-COOLING-WATER'
);

INSERT INTO items (tenant_id, code, name, type, uom, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    'GREASING-NOZZLE',
    'Greasing nozzle',
    'RAW_MATERIAL'::item_type,
    'Number',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM items WHERE code = 'GREASING-NOZZLE'
);

INSERT INTO items (tenant_id, code, name, type, uom, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    'GREASING-NIPPLE',
    'Greasing Nipple',
    'RAW_MATERIAL'::item_type,
    'PCS',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM items WHERE code = 'GREASING-NIPPLE'
);

INSERT INTO items (tenant_id, code, name, type, uom, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    'NOZZLE-ON-JET',
    'Nozzle on Jet',
    'RAW_MATERIAL'::item_type,
    'Number',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM items WHERE code = 'NOZZLE-ON-JET'
);

INSERT INTO items (tenant_id, code, name, type, uom, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    'JET-NOZZLES-BLACK',
    'Jet Nozzles (Black big)',
    'RAW_MATERIAL'::item_type,
    'PCS',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM items WHERE code = 'JET-NOZZLES-BLACK'
);

INSERT INTO items (tenant_id, code, name, type, uom, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    'IMPELLERS',
    'Impellers',
    'RAW_MATERIAL'::item_type,
    'PCS',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM items WHERE code = 'IMPELLERS'
);

INSERT INTO items (tenant_id, code, name, type, uom, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    'SILICON-HOSE-PIPE',
    'Silicon hose pipe clip 7mm',
    'RAW_MATERIAL'::item_type,
    'Number',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM items WHERE code = 'SILICON-HOSE-PIPE'
);

INSERT INTO items (tenant_id, code, name, type, uom, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    'WATER-JET-S52',
    'Water Jet S52',
    'RAW_MATERIAL'::item_type,
    'Number',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM items WHERE code = 'WATER-JET-S52'
);

INSERT INTO items (tenant_id, code, name, type, uom, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    'ESC-MOUNTING-PLATE',
    'ESC Mounting Plate',
    'RAW_MATERIAL'::item_type,
    'Number',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM items WHERE code = 'ESC-MOUNTING-PLATE'
);

INSERT INTO items (tenant_id, code, name, type, uom, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    'JET-S52-MOUNTING',
    'Jet S52 Mounting plate',
    'RAW_MATERIAL'::item_type,
    'Number',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM items WHERE code = 'JET-S52-MOUNTING'
);

INSERT INTO items (tenant_id, code, name, type, uom, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    'MOTOR-MOUNT-HEATBLOCK',
    'Motor mount heatblock TOP',
    'RAW_MATERIAL'::item_type,
    'Number',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM items WHERE code = 'MOTOR-MOUNT-HEATBLOCK'
);

INSERT INTO items (tenant_id, code, name, type, uom, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    'MOTOR-MOUNT-HEATBLOCK',
    'Motor mount heatblock BOTTOM',
    'RAW_MATERIAL'::item_type,
    'Number',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM items WHERE code = 'MOTOR-MOUNT-HEATBLOCK'
);

INSERT INTO items (tenant_id, code, name, type, uom, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    'TWO-HALF-MOTOR',
    'Two half Motor Mount side plates',
    'RAW_MATERIAL'::item_type,
    'PCS',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM items WHERE code = 'TWO-HALF-MOTOR'
);

INSERT INTO items (tenant_id, code, name, type, uom, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    'REVERSE-BUKETING-SIDE',
    'Reverse Buketing side plates',
    'RAW_MATERIAL'::item_type,
    'PCS',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM items WHERE code = 'REVERSE-BUKETING-SIDE'
);

INSERT INTO items (tenant_id, code, name, type, uom, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    'ALUMINIUM-SHEET-2MM',
    'Aluminium Sheet 2mm thick 4ftx2ft',
    'RAW_MATERIAL'::item_type,
    'Number',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM items WHERE code = 'ALUMINIUM-SHEET-2MM'
);

INSERT INTO items (tenant_id, code, name, type, uom, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    'HEAT-CONDENSORJET-HEAT',
    'Heat condensor/Jet Heat Sink',
    'RAW_MATERIAL'::item_type,
    'Number',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM items WHERE code = 'HEAT-CONDENSORJET-HEAT'
);

INSERT INTO items (tenant_id, code, name, type, uom, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    'LH1-THERMOSYPHENS',
    'LH-1 Thermosyphens',
    'RAW_MATERIAL'::item_type,
    'Number',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM items WHERE code = 'LH1-THERMOSYPHENS'
);

INSERT INTO items (tenant_id, code, name, type, uom, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    'HEAT-CONDENSORJET-HEAT',
    'Heat condensor/Jet Heat Sink LHS 2 Plate',
    'RAW_MATERIAL'::item_type,
    'PCS',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM items WHERE code = 'HEAT-CONDENSORJET-HEAT'
);

INSERT INTO items (tenant_id, code, name, type, uom, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    'HEAT-CONDENSORJET-HEAT',
    'Heat condensor/Jet Heat Sink RHS 1 Plate',
    'RAW_MATERIAL'::item_type,
    'Number',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM items WHERE code = 'HEAT-CONDENSORJET-HEAT'
);

INSERT INTO items (tenant_id, code, name, type, uom, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    'HEAT-CONDENSORJET-HEAT',
    'Heat condensor/Jet Heat Sink RHS 2 Plate',
    'RAW_MATERIAL'::item_type,
    'PCS',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM items WHERE code = 'HEAT-CONDENSORJET-HEAT'
);

INSERT INTO items (tenant_id, code, name, type, uom, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    'HEAT-CONDENSORJET-HEAT',
    'Heat condensor/Jet Heat Sink Top Plate',
    'RAW_MATERIAL'::item_type,
    'Number',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM items WHERE code = 'HEAT-CONDENSORJET-HEAT'
);

INSERT INTO items (tenant_id, code, name, type, uom, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    'MOTOR-BLOCK-SIDE',
    'Motor Block Side Plate',
    'RAW_MATERIAL'::item_type,
    'Number',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM items WHERE code = 'MOTOR-BLOCK-SIDE'
);

INSERT INTO items (tenant_id, code, name, type, uom, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    'CONDENSOR-CLAMP',
    'Condensor Clamp',
    'RAW_MATERIAL'::item_type,
    'Number',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM items WHERE code = 'CONDENSOR-CLAMP'
);

INSERT INTO items (tenant_id, code, name, type, uom, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    'COPPER-HEAT-PIPE',
    'Copper heat pipe (set of 2)',
    'RAW_MATERIAL'::item_type,
    'Number',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM items WHERE code = 'COPPER-HEAT-PIPE'
);

INSERT INTO items (tenant_id, code, name, type, uom, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    'COPPER-HEAT-PIPES',
    'Copper heat pipes ( New)',
    'RAW_MATERIAL'::item_type,
    'PCS',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM items WHERE code = 'COPPER-HEAT-PIPES'
);

INSERT INTO items (tenant_id, code, name, type, uom, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    'STBD-AFT-PLATE',
    'STBD Aft Plate',
    'RAW_MATERIAL'::item_type,
    'Number',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM items WHERE code = 'STBD-AFT-PLATE'
);

INSERT INTO items (tenant_id, code, name, type, uom, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    'PORT-AFT-PLATE',
    'PORT Aft Plate',
    'RAW_MATERIAL'::item_type,
    'Number',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM items WHERE code = 'PORT-AFT-PLATE'
);

INSERT INTO items (tenant_id, code, name, type, uom, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    '3D-PRINTED-SR',
    '3D printed SR Pillow Side Caps 3D Print',
    'RAW_MATERIAL'::item_type,
    'Number',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM items WHERE code = '3D-PRINTED-SR'
);

INSERT INTO items (tenant_id, code, name, type, uom, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    '3D-PRINTED-SR',
    '3D printed SR Pillow Middle Caps 3D Print',
    'RAW_MATERIAL'::item_type,
    'Number',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM items WHERE code = '3D-PRINTED-SR'
);

INSERT INTO items (tenant_id, code, name, type, uom, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    '3D-PRINTED-BOTTOM',
    '3D printed bottom block caps',
    'RAW_MATERIAL'::item_type,
    'Number',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM items WHERE code = '3D-PRINTED-BOTTOM'
);

INSERT INTO items (tenant_id, code, name, type, uom, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    'BUTTON-SPACER-NO',
    'Button spacer No. 1/1 3D Print',
    'RAW_MATERIAL'::item_type,
    'Number',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM items WHERE code = 'BUTTON-SPACER-NO'
);

INSERT INTO items (tenant_id, code, name, type, uom, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    'BUTTON-SPACER-NO',
    'Button Spacer No. 1/2 3D Print',
    'RAW_MATERIAL'::item_type,
    'Number',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM items WHERE code = 'BUTTON-SPACER-NO'
);

INSERT INTO items (tenant_id, code, name, type, uom, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    'BUTTON-SPACER-NO',
    'Button Spacer No. 2 3D Print',
    'RAW_MATERIAL'::item_type,
    'Number',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM items WHERE code = 'BUTTON-SPACER-NO'
);

INSERT INTO items (tenant_id, code, name, type, uom, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    'BUTTON-NO-1',
    'Button No. 1 pressure bracket 3D Print',
    'RAW_MATERIAL'::item_type,
    'Number',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM items WHERE code = 'BUTTON-NO-1'
);

INSERT INTO items (tenant_id, code, name, type, uom, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    'REMOTE-BATTERY-HOLDING',
    'Remote Battery Holding Bracket 3D Print',
    'RAW_MATERIAL'::item_type,
    'Number',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM items WHERE code = 'REMOTE-BATTERY-HOLDING'
);

INSERT INTO items (tenant_id, code, name, type, uom, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    'CRAFT-BATTERY-HOLDING',
    'Craft Battery Holding Bracket 3D Print',
    'RAW_MATERIAL'::item_type,
    'PCS',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM items WHERE code = 'CRAFT-BATTERY-HOLDING'
);

INSERT INTO items (tenant_id, code, name, type, uom, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    'REMOTE-STRAPS',
    'Remote Straps',
    'RAW_MATERIAL'::item_type,
    'PCS',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM items WHERE code = 'REMOTE-STRAPS'
);

INSERT INTO items (tenant_id, code, name, type, uom, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    'REMOTE-STRAP-HOLDER',
    'Remote Strap Holder',
    'RAW_MATERIAL'::item_type,
    'PCS',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM items WHERE code = 'REMOTE-STRAP-HOLDER'
);

INSERT INTO items (tenant_id, code, name, type, uom, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    'JOYSTICK-SCREWS',
    'Joystick Screws',
    'RAW_MATERIAL'::item_type,
    'PCS',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM items WHERE code = 'JOYSTICK-SCREWS'
);

INSERT INTO items (tenant_id, code, name, type, uom, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    'LCD-SCREEN',
    'LCD Screen',
    'RAW_MATERIAL'::item_type,
    'PCS',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM items WHERE code = 'LCD-SCREEN'
);

INSERT INTO items (tenant_id, code, name, type, uom, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    'ANTENNA-CLAMP-1',
    'Antenna clamp -1 3D Print',
    'RAW_MATERIAL'::item_type,
    'Number',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM items WHERE code = 'ANTENNA-CLAMP-1'
);

INSERT INTO items (tenant_id, code, name, type, uom, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    'ANTENNA-CLAMP-2',
    'Antenna Clamp -2 3D Print',
    'RAW_MATERIAL'::item_type,
    'Number',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM items WHERE code = 'ANTENNA-CLAMP-2'
);

INSERT INTO items (tenant_id, code, name, type, uom, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    'LCD-HOLDER-BRACKET',
    'LCD holder bracket 3D print',
    'RAW_MATERIAL'::item_type,
    'PCS',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM items WHERE code = 'LCD-HOLDER-BRACKET'
);

INSERT INTO items (tenant_id, code, name, type, uom, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    'CHARGER-SPACER-3D',
    'Charger Spacer 3D Print',
    'RAW_MATERIAL'::item_type,
    'PCS',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM items WHERE code = 'CHARGER-SPACER-3D'
);

INSERT INTO items (tenant_id, code, name, type, uom, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    'BUTTON-11-3D',
    'Button 1/1 3D print',
    'RAW_MATERIAL'::item_type,
    'PCS',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM items WHERE code = 'BUTTON-11-3D'
);

INSERT INTO items (tenant_id, code, name, type, uom, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    'BUTTON-12-3D',
    'Button 1/2 3D Print',
    'RAW_MATERIAL'::item_type,
    'PCS',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM items WHERE code = 'BUTTON-12-3D'
);

INSERT INTO items (tenant_id, code, name, type, uom, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    'ROTARY-KNOB-BOX',
    'Rotary Knob Box 3D print',
    'RAW_MATERIAL'::item_type,
    'Number',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM items WHERE code = 'ROTARY-KNOB-BOX'
);

INSERT INTO items (tenant_id, code, name, type, uom, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    'ROTARY-ENCODER',
    'Rotary Encoder',
    'RAW_MATERIAL'::item_type,
    'PCS',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM items WHERE code = 'ROTARY-ENCODER'
);

INSERT INTO items (tenant_id, code, name, type, uom, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    'IFU-3D-MIDDLE',
    'IFU 3D Middle',
    'RAW_MATERIAL'::item_type,
    'PCS',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM items WHERE code = 'IFU-3D-MIDDLE'
);

INSERT INTO items (tenant_id, code, name, type, uom, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    'IFU-TOP',
    'IFU top',
    'RAW_MATERIAL'::item_type,
    'PCS',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM items WHERE code = 'IFU-TOP'
);

INSERT INTO items (tenant_id, code, name, type, uom, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    'IFU-BOTTOM',
    'IFU Bottom',
    'RAW_MATERIAL'::item_type,
    'PCS',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM items WHERE code = 'IFU-BOTTOM'
);

INSERT INTO items (tenant_id, code, name, type, uom, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    'MOTOR-4092',
    'Motor 4092',
    'RAW_MATERIAL'::item_type,
    'PCS',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM items WHERE code = 'MOTOR-4092'
);

INSERT INTO items (tenant_id, code, name, type, uom, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    '4092-COOLING-JACKETS',
    '4092 cooling jackets',
    'RAW_MATERIAL'::item_type,
    'PCS',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM items WHERE code = '4092-COOLING-JACKETS'
);

INSERT INTO items (tenant_id, code, name, type, uom, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    'MOTOR-5692-495',
    'Motor 5692 495 KV',
    'RAW_MATERIAL'::item_type,
    'Number',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM items WHERE code = 'MOTOR-5692-495'
);

INSERT INTO items (tenant_id, code, name, type, uom, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    '5692-MOTOR-COOLING',
    '5692 motor cooling jacket',
    'RAW_MATERIAL'::item_type,
    'PCS',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM items WHERE code = '5692-MOTOR-COOLING'
);

INSERT INTO items (tenant_id, code, name, type, uom, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    'HV130-ESC',
    'HV130 ESC',
    'RAW_MATERIAL'::item_type,
    'Number',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM items WHERE code = 'HV130-ESC'
);

INSERT INTO items (tenant_id, code, name, type, uom, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    '8-MM-OD',
    '8 mm OD pneaumatic pipe',
    'RAW_MATERIAL'::item_type,
    'Meter',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM items WHERE code = '8-MM-OD'
);

INSERT INTO items (tenant_id, code, name, type, uom, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    '12-TO-8',
    '12 to 8 right angled reducer with lock clips',
    'RAW_MATERIAL'::item_type,
    'Number',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM items WHERE code = '12-TO-8'
);

INSERT INTO items (tenant_id, code, name, type, uom, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    '12-TO-8',
    '12 to 8 right angled lock clips',
    'RAW_MATERIAL'::item_type,
    'PCS',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM items WHERE code = '12-TO-8'
);

INSERT INTO items (tenant_id, code, name, type, uom, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    '12MM-OD-PNEUMATIC',
    '12mm OD pneumatic pipe',
    'RAW_MATERIAL'::item_type,
    'Meter',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM items WHERE code = '12MM-OD-PNEUMATIC'
);

INSERT INTO items (tenant_id, code, name, type, uom, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    'POLYCARBONATE-GLASS-FOR',
    'Polycarbonate Glass for Remote',
    'RAW_MATERIAL'::item_type,
    'Number',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM items WHERE code = 'POLYCARBONATE-GLASS-FOR'
);

INSERT INTO items (tenant_id, code, name, type, uom, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    '55-NO-BOX',
    '55 No. Box for chraging cable & Tool box',
    'RAW_MATERIAL'::item_type,
    'Number',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM items WHERE code = '55-NO-BOX'
);

INSERT INTO items (tenant_id, code, name, type, uom, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    '22-NO-BOX',
    '22 No. Box for SR structure screws',
    'RAW_MATERIAL'::item_type,
    'Number',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM items WHERE code = '22-NO-BOX'
);

INSERT INTO items (tenant_id, code, name, type, uom, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    'BOTTOM-MESH-120MM',
    'Bottom Mesh (120mm x 100mm, 5"x4")',
    'RAW_MATERIAL'::item_type,
    'Number',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM items WHERE code = 'BOTTOM-MESH-120MM'
);

INSERT INTO items (tenant_id, code, name, type, uom, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    'AIR-NOZZLE',
    'Air nozzle',
    'RAW_MATERIAL'::item_type,
    'Number',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM items WHERE code = 'AIR-NOZZLE'
);

INSERT INTO items (tenant_id, code, name, type, uom, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    'ACETONE',
    'Acetone',
    'RAW_MATERIAL'::item_type,
    'ml',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM items WHERE code = 'ACETONE'
);

INSERT INTO items (tenant_id, code, name, type, uom, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    'IPA',
    'IPA',
    'RAW_MATERIAL'::item_type,
    'ml',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM items WHERE code = 'IPA'
);

INSERT INTO items (tenant_id, code, name, type, uom, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    'FOAM-GASKET-405',
    'Foam Gasket 40/5',
    'RAW_MATERIAL'::item_type,
    'PCS',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM items WHERE code = 'FOAM-GASKET-405'
);

INSERT INTO items (tenant_id, code, name, type, uom, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    'POLY-URETHANE-FOAM',
    'Poly Urethane Foam',
    'RAW_MATERIAL'::item_type,
    'ml',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM items WHERE code = 'POLY-URETHANE-FOAM'
);

INSERT INTO items (tenant_id, code, name, type, uom, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    'SILICON-HOSE-4MM',
    'Silicon Hose 4mm x 8mm',
    'RAW_MATERIAL'::item_type,
    'Meter',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM items WHERE code = 'SILICON-HOSE-4MM'
);

INSERT INTO items (tenant_id, code, name, type, uom, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    'SILICON-HOSE-3MM',
    'Silicon Hose 3mm x 6mm',
    'RAW_MATERIAL'::item_type,
    'Meter',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM items WHERE code = 'SILICON-HOSE-3MM'
);

INSERT INTO items (tenant_id, code, name, type, uom, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    '6MMX12MM-RUBBER-BUSH',
    '6mmx12mm Rubber Bush',
    'RAW_MATERIAL'::item_type,
    'Meter',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM items WHERE code = '6MMX12MM-RUBBER-BUSH'
);

INSERT INTO items (tenant_id, code, name, type, uom, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    'JOYSTICK-WATER-PROOF',
    'Joystick Water proof rubber',
    'RAW_MATERIAL'::item_type,
    'Number',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM items WHERE code = 'JOYSTICK-WATER-PROOF'
);

INSERT INTO items (tenant_id, code, name, type, uom, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    'BUTTON-SILICON-COVER',
    'Button Silicon Cover No. 1',
    'RAW_MATERIAL'::item_type,
    'Number',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM items WHERE code = 'BUTTON-SILICON-COVER'
);

INSERT INTO items (tenant_id, code, name, type, uom, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    'BUTTON-SILICON-COVER',
    'Button Silicon Cover No. 2',
    'RAW_MATERIAL'::item_type,
    'Number',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM items WHERE code = 'BUTTON-SILICON-COVER'
);

INSERT INTO items (tenant_id, code, name, type, uom, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    '3MM-SILICON-RUBBER',
    '3mm Silicon Rubber Gaskets (35mmx10mm)',
    'RAW_MATERIAL'::item_type,
    'Number',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM items WHERE code = '3MM-SILICON-RUBBER'
);

INSERT INTO items (tenant_id, code, name, type, uom, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    'THREAD-LOCKER-242',
    'Thread locker 242',
    'RAW_MATERIAL'::item_type,
    'ml',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM items WHERE code = 'THREAD-LOCKER-242'
);

INSERT INTO items (tenant_id, code, name, type, uom, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    'THREAD-LOCKER-270',
    'Thread locker 270',
    'RAW_MATERIAL'::item_type,
    'PCS',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM items WHERE code = 'THREAD-LOCKER-270'
);

INSERT INTO items (tenant_id, code, name, type, uom, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    'THREAD-LOCKER-290',
    'Thread locker 290',
    'RAW_MATERIAL'::item_type,
    'PCS',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM items WHERE code = 'THREAD-LOCKER-290'
);

INSERT INTO items (tenant_id, code, name, type, uom, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    'THREAD-LOCKER-ACTIVATOR',
    'Thread locker Activator',
    'RAW_MATERIAL'::item_type,
    'ml',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM items WHERE code = 'THREAD-LOCKER-ACTIVATOR'
);

INSERT INTO items (tenant_id, code, name, type, uom, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    'INSTANT-ADHESIVE-407',
    'Instant Adhesive 407 for EPE sticking',
    'RAW_MATERIAL'::item_type,
    'ml',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM items WHERE code = 'INSTANT-ADHESIVE-407'
);

INSERT INTO items (tenant_id, code, name, type, uom, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    'ORING-AFT-PLATE',
    'Oring AFT plate',
    'RAW_MATERIAL'::item_type,
    'Number',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM items WHERE code = 'ORING-AFT-PLATE'
);

INSERT INTO items (tenant_id, code, name, type, uom, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    'STBD-SR-RUBBER',
    'STBD SR Rubber Boot',
    'RAW_MATERIAL'::item_type,
    'Number',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM items WHERE code = 'STBD-SR-RUBBER'
);

INSERT INTO items (tenant_id, code, name, type, uom, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    'PORT-SR-RUBBER',
    'PORT SR Rubber Boot',
    'RAW_MATERIAL'::item_type,
    'Number',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM items WHERE code = 'PORT-SR-RUBBER'
);

INSERT INTO items (tenant_id, code, name, type, uom, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    'SAIFSEAS-NECK-STRAP',
    'SaifSeas Neck Strap',
    'RAW_MATERIAL'::item_type,
    'Number',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM items WHERE code = 'SAIFSEAS-NECK-STRAP'
);

INSERT INTO items (tenant_id, code, name, type, uom, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    'HOOK-STICKER-STBD',
    'Hook Sticker STBD',
    'RAW_MATERIAL'::item_type,
    'Number',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM items WHERE code = 'HOOK-STICKER-STBD'
);

INSERT INTO items (tenant_id, code, name, type, uom, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    'HOOK-STIKER-PORT',
    'Hook Stiker PORT',
    'RAW_MATERIAL'::item_type,
    'Number',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM items WHERE code = 'HOOK-STIKER-PORT'
);

INSERT INTO items (tenant_id, code, name, type, uom, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    'HOLD-HERE-STICKER',
    'Hold here sticker STBD',
    'RAW_MATERIAL'::item_type,
    'Number',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM items WHERE code = 'HOLD-HERE-STICKER'
);

INSERT INTO items (tenant_id, code, name, type, uom, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    'HOLD-HERE-STICKER',
    'Hold here sticker PORT',
    'RAW_MATERIAL'::item_type,
    'Number',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM items WHERE code = 'HOLD-HERE-STICKER'
);

INSERT INTO items (tenant_id, code, name, type, uom, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    'CRAFT-CLEANING-NOTIFY',
    'Craft Cleaning Notify Sticker',
    'RAW_MATERIAL'::item_type,
    'Number',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM items WHERE code = 'CRAFT-CLEANING-NOTIFY'
);

INSERT INTO items (tenant_id, code, name, type, uom, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    'FERROLE',
    'Ferrole',
    'RAW_MATERIAL'::item_type,
    'Number',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM items WHERE code = 'FERROLE'
);

INSERT INTO items (tenant_id, code, name, type, uom, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    'ROPE-8MM',
    'Rope 8mm',
    'RAW_MATERIAL'::item_type,
    'Meter',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM items WHERE code = 'ROPE-8MM'
);

INSERT INTO items (tenant_id, code, name, type, uom, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    'PACKING-WOODEN-HARDBOX',
    'Packing Wooden HardBox',
    'RAW_MATERIAL'::item_type,
    'Number',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM items WHERE code = 'PACKING-WOODEN-HARDBOX'
);

INSERT INTO items (tenant_id, code, name, type, uom, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    '10MM-NUT-DRIVER',
    '10mm Nut Driver with 15mm Depth',
    'RAW_MATERIAL'::item_type,
    'Number',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM items WHERE code = '10MM-NUT-DRIVER'
);

INSERT INTO items (tenant_id, code, name, type, uom, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    '4MM-ALLEN-KEY',
    '4mm Allen Key',
    'RAW_MATERIAL'::item_type,
    'PCS',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM items WHERE code = '4MM-ALLEN-KEY'
);

INSERT INTO items (tenant_id, code, name, type, uom, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    '5MM-ALLEN-KEY',
    '5mm Allen Key',
    'RAW_MATERIAL'::item_type,
    'PCS',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM items WHERE code = '5MM-ALLEN-KEY'
);

INSERT INTO items (tenant_id, code, name, type, uom, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    '6MM-ALLEN-KEY',
    '6mm Allen Key',
    'RAW_MATERIAL'::item_type,
    'Number',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM items WHERE code = '6MM-ALLEN-KEY'
);

INSERT INTO items (tenant_id, code, name, type, uom, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    '6MM-T-HANDLE',
    '6mm T Handle',
    'RAW_MATERIAL'::item_type,
    'PCS',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM items WHERE code = '6MM-T-HANDLE'
);

INSERT INTO items (tenant_id, code, name, type, uom, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    '10MM-SPANNER',
    '10mm Spanner',
    'RAW_MATERIAL'::item_type,
    'PCS',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM items WHERE code = '10MM-SPANNER'
);

INSERT INTO items (tenant_id, code, name, type, uom, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    'EPE-SHEET-20MM',
    'EPE sheet 20mm 48"x72"',
    'RAW_MATERIAL'::item_type,
    'Number',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM items WHERE code = 'EPE-SHEET-20MM'
);

INSERT INTO items (tenant_id, code, name, type, uom, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    'USER-MANUAL',
    'User Manual',
    'RAW_MATERIAL'::item_type,
    'Number',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM items WHERE code = 'USER-MANUAL'
);

INSERT INTO items (tenant_id, code, name, type, uom, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    'ENVELOPE-FOR-USER',
    'Envelope for User Manual',
    'RAW_MATERIAL'::item_type,
    'Number',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM items WHERE code = 'ENVELOPE-FOR-USER'
);

INSERT INTO items (tenant_id, code, name, type, uom, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    'SURGICAL-GLOVES',
    'Surgical Gloves',
    'RAW_MATERIAL'::item_type,
    'Number',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM items WHERE code = 'SURGICAL-GLOVES'
);

INSERT INTO items (tenant_id, code, name, type, uom, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    'X16-EXTENSION-PANEL',
    'X16 extension panel',
    'RAW_MATERIAL'::item_type,
    'Number',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM items WHERE code = 'X16-EXTENSION-PANEL'
);

INSERT INTO items (tenant_id, code, name, type, uom, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    'POLISH-BOTTLE',
    'Polish Bottle',
    'RAW_MATERIAL'::item_type,
    'ml',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM items WHERE code = 'POLISH-BOTTLE'
);

INSERT INTO items (tenant_id, code, name, type, uom, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    'SHAVISON-SMPS',
    'Shavison SMPS',
    'RAW_MATERIAL'::item_type,
    'PCS',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM items WHERE code = 'SHAVISON-SMPS'
);

INSERT INTO items (tenant_id, code, name, type, uom, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    'WIFI-ADAPTER',
    'Wifi Adapter',
    'RAW_MATERIAL'::item_type,
    'PCS',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM items WHERE code = 'WIFI-ADAPTER'
);

INSERT INTO items (tenant_id, code, name, type, uom, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    'WIFI-ROUTER',
    'Wifi router',
    'RAW_MATERIAL'::item_type,
    'PCS',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM items WHERE code = 'WIFI-ROUTER'
);

INSERT INTO items (tenant_id, code, name, type, uom, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    'ADAPTER-913V',
    'Adapter 9.13V',
    'RAW_MATERIAL'::item_type,
    'PCS',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM items WHERE code = 'ADAPTER-913V'
);

INSERT INTO items (tenant_id, code, name, type, uom, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    'ADAPTER-519V',
    'Adapter 5.19V',
    'RAW_MATERIAL'::item_type,
    'PCS',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM items WHERE code = 'ADAPTER-519V'
);

INSERT INTO items (tenant_id, code, name, type, uom, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    'ROAST-FLASH-PRO',
    'Roast Flash Pro bottle',
    'RAW_MATERIAL'::item_type,
    'PCS',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM items WHERE code = 'ROAST-FLASH-PRO'
);

INSERT INTO items (tenant_id, code, name, type, uom, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    'LIQUID-POLISH',
    'Liquid Polish',
    'RAW_MATERIAL'::item_type,
    'PCS',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM items WHERE code = 'LIQUID-POLISH'
);

INSERT INTO items (tenant_id, code, name, type, uom, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    'BIG-SYRINGES',
    'Big Syringes',
    'RAW_MATERIAL'::item_type,
    'PCS',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM items WHERE code = 'BIG-SYRINGES'
);

INSERT INTO items (tenant_id, code, name, type, uom, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    'SMALL-SYRINGES',
    'Small Syringes',
    'RAW_MATERIAL'::item_type,
    'PCS',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM items WHERE code = 'SMALL-SYRINGES'
);

INSERT INTO items (tenant_id, code, name, type, uom, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    'WV-40',
    'WV 40',
    'RAW_MATERIAL'::item_type,
    'PCS',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM items WHERE code = 'WV-40'
);

INSERT INTO items (tenant_id, code, name, type, uom, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    '5-56-POWER',
    '5 56 power spray',
    'RAW_MATERIAL'::item_type,
    'PCS',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM items WHERE code = '5-56-POWER'
);

INSERT INTO items (tenant_id, code, name, type, uom, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    'REMOTE-DISPLAY-GLASS',
    'Remote Display glass',
    'RAW_MATERIAL'::item_type,
    'PCS',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM items WHERE code = 'REMOTE-DISPLAY-GLASS'
);

INSERT INTO items (tenant_id, code, name, type, uom, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    'EXTRUSION-CLAMPS-40MM',
    'Extrusion Clamps 40mm',
    'RAW_MATERIAL'::item_type,
    'PCS',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM items WHERE code = 'EXTRUSION-CLAMPS-40MM'
);

INSERT INTO items (tenant_id, code, name, type, uom, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    'EXTRUSION-CLAMPS30MM',
    'Extrusion Clamps30mm',
    'RAW_MATERIAL'::item_type,
    'PCS',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM items WHERE code = 'EXTRUSION-CLAMPS30MM'
);

INSERT INTO items (tenant_id, code, name, type, uom, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    'EXTRUSION-CLAMPS-20MM',
    'Extrusion Clamps 20mm',
    'RAW_MATERIAL'::item_type,
    'PCS',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM items WHERE code = 'EXTRUSION-CLAMPS-20MM'
);

INSERT INTO items (tenant_id, code, name, type, uom, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    'SHEENAIC',
    'Sheenaic',
    'RAW_MATERIAL'::item_type,
    'PCS',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM items WHERE code = 'SHEENAIC'
);

INSERT INTO items (tenant_id, code, name, type, uom, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    'TURPENTRATE-OIL',
    'Turpentrate Oil',
    'RAW_MATERIAL'::item_type,
    'PCS',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM items WHERE code = 'TURPENTRATE-OIL'
);

INSERT INTO items (tenant_id, code, name, type, uom, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    'SPOT-CHECK-SKC',
    'Spot Check SKC - 1 (Cleaner/Remover)',
    'RAW_MATERIAL'::item_type,
    'PCS',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM items WHERE code = 'SPOT-CHECK-SKC'
);

INSERT INTO items (tenant_id, code, name, type, uom, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    'TEROSON-GUN',
    'Teroson Gun',
    'RAW_MATERIAL'::item_type,
    'PCS',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM items WHERE code = 'TEROSON-GUN'
);

INSERT INTO items (tenant_id, code, name, type, uom, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    'M6-THUMBOLTS',
    'M6 Thumbolts',
    'RAW_MATERIAL'::item_type,
    'PCS',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM items WHERE code = 'M6-THUMBOLTS'
);

INSERT INTO items (tenant_id, code, name, type, uom, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    'M4-THUMBOLTS',
    'M4 Thumbolts',
    'RAW_MATERIAL'::item_type,
    'PCS',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM items WHERE code = 'M4-THUMBOLTS'
);

INSERT INTO items (tenant_id, code, name, type, uom, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    '125-MM-HEAT',
    '125 MM heat Shrinkable Sleeve',
    'RAW_MATERIAL'::item_type,
    'Meter',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM items WHERE code = '125-MM-HEAT'
);

INSERT INTO items (tenant_id, code, name, type, uom, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    'JET-PLATE-ASSY',
    'Jet & Plate Assy (Jet, plate)',
    'RAW_MATERIAL'::item_type,
    'PCS',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM items WHERE code = 'JET-PLATE-ASSY'
);

INSERT INTO items (tenant_id, code, name, type, uom, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    'JET-MOTOR-ASSY',
    'Jet Motor Assy (Jet, Plate, mount))',
    'RAW_MATERIAL'::item_type,
    'PCS',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM items WHERE code = 'JET-MOTOR-ASSY'
);

INSERT INTO items (tenant_id, code, name, type, uom, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    'JET-MOTOR-ASSY',
    'Jet Motor Assy (Jet, plate, mount, heatpipes)',
    'RAW_MATERIAL'::item_type,
    'PCS',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM items WHERE code = 'JET-MOTOR-ASSY'
);

INSERT INTO items (tenant_id, code, name, type, uom, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    'POWER-SWITCH-ASSY',
    'Power Switch Assy',
    'RAW_MATERIAL'::item_type,
    'PCS',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM items WHERE code = 'POWER-SWITCH-ASSY'
);

INSERT INTO items (tenant_id, code, name, type, uom, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    'CHARGING-PM-ASSY',
    'Charging PM Assy',
    'RAW_MATERIAL'::item_type,
    'PCS',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM items WHERE code = 'CHARGING-PM-ASSY'
);

INSERT INTO items (tenant_id, code, name, type, uom, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    'CHARGING-CM-ASSY',
    'Charging CM Assy',
    'RAW_MATERIAL'::item_type,
    'PCS',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM items WHERE code = 'CHARGING-CM-ASSY'
);

INSERT INTO items (tenant_id, code, name, type, uom, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    'STBD-SIGNAL-PM',
    'STBD Signal PM Assy',
    'RAW_MATERIAL'::item_type,
    'PCS',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM items WHERE code = 'STBD-SIGNAL-PM'
);

INSERT INTO items (tenant_id, code, name, type, uom, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    'PORT-SIGNAL-PM',
    'PORT Signal PM Assy',
    'RAW_MATERIAL'::item_type,
    'PCS',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM items WHERE code = 'PORT-SIGNAL-PM'
);

INSERT INTO items (tenant_id, code, name, type, uom, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    'STBD-SIGNAL-CM',
    'STBD Signal CM Assy',
    'RAW_MATERIAL'::item_type,
    'PCS',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM items WHERE code = 'STBD-SIGNAL-CM'
);

INSERT INTO items (tenant_id, code, name, type, uom, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    'PORT-SIGNAL-CM',
    'PORT Signal CM Assy',
    'RAW_MATERIAL'::item_type,
    'PCS',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM items WHERE code = 'PORT-SIGNAL-CM'
);

INSERT INTO items (tenant_id, code, name, type, uom, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    'CURRENT-SENSOR-ASSY',
    'Current Sensor Assy',
    'RAW_MATERIAL'::item_type,
    'PCS',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM items WHERE code = 'CURRENT-SENSOR-ASSY'
);

INSERT INTO items (tenant_id, code, name, type, uom, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    'RPM-SENSOR-ASSY',
    'RPM Sensor Assy',
    'RAW_MATERIAL'::item_type,
    'PCS',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM items WHERE code = 'RPM-SENSOR-ASSY'
);

INSERT INTO items (tenant_id, code, name, type, uom, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    'A21-MOTHERBOARD-ASSY',
    'A21 MotherBoard Assy',
    'RAW_MATERIAL'::item_type,
    'PCS',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM items WHERE code = 'A21-MOTHERBOARD-ASSY'
);

INSERT INTO items (tenant_id, code, name, type, uom, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    'BATTERY-BLOCK-ASSY',
    'Battery Block Assy',
    'RAW_MATERIAL'::item_type,
    'PCS',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM items WHERE code = 'BATTERY-BLOCK-ASSY'
);

INSERT INTO items (tenant_id, code, name, type, uom, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    'STBDESC-ASSY',
    'STBD_ESC Assy',
    'RAW_MATERIAL'::item_type,
    'PCS',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM items WHERE code = 'STBDESC-ASSY'
);

INSERT INTO items (tenant_id, code, name, type, uom, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    'PORTESC-ASSY',
    'PORT_ESC Assy',
    'RAW_MATERIAL'::item_type,
    'PCS',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM items WHERE code = 'PORTESC-ASSY'
);

INSERT INTO items (tenant_id, code, name, type, uom, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    'STBD-BATTERY-ASSY',
    'STBD Battery Assy',
    'RAW_MATERIAL'::item_type,
    'PCS',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM items WHERE code = 'STBD-BATTERY-ASSY'
);

INSERT INTO items (tenant_id, code, name, type, uom, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    'PORT-BATTERY-ASSY',
    'PORT Battery Assy',
    'RAW_MATERIAL'::item_type,
    'PCS',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM items WHERE code = 'PORT-BATTERY-ASSY'
);

INSERT INTO items (tenant_id, code, name, type, uom, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    'CHARGER-BOX-ASSY',
    'Charger Box Assy',
    'RAW_MATERIAL'::item_type,
    'PCS',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM items WHERE code = 'CHARGER-BOX-ASSY'
);

INSERT INTO items (tenant_id, code, name, type, uom, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    'ELECTRONIC-BOX-ASSY',
    'Electronic Box Assy',
    'RAW_MATERIAL'::item_type,
    'PCS',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM items WHERE code = 'ELECTRONIC-BOX-ASSY'
);

INSERT INTO items (tenant_id, code, name, type, uom, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    'FLSTBD-ELEC',
    'FL_STBD Elec',
    'RAW_MATERIAL'::item_type,
    'PCS',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM items WHERE code = 'FLSTBD-ELEC'
);

INSERT INTO items (tenant_id, code, name, type, uom, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    'FLPORT-ELEC',
    'FL_PORT Elec',
    'RAW_MATERIAL'::item_type,
    'PCS',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM items WHERE code = 'FLPORT-ELEC'
);

INSERT INTO items (tenant_id, code, name, type, uom, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    'FLSTBD-MECH',
    'FL_STBD Mech',
    'RAW_MATERIAL'::item_type,
    'PCS',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM items WHERE code = 'FLSTBD-MECH'
);

INSERT INTO items (tenant_id, code, name, type, uom, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    'FLPORT-MECH',
    'FL_PORT Mech',
    'RAW_MATERIAL'::item_type,
    'PCS',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM items WHERE code = 'FLPORT-MECH'
);

INSERT INTO items (tenant_id, code, name, type, uom, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    'STBD-UNIT-ASSY',
    'STBD Unit Assy',
    'RAW_MATERIAL'::item_type,
    'PCS',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM items WHERE code = 'STBD-UNIT-ASSY'
);

INSERT INTO items (tenant_id, code, name, type, uom, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    'PORT-UNIT-ASSY',
    'PORT Unit Assy',
    'RAW_MATERIAL'::item_type,
    'PCS',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM items WHERE code = 'PORT-UNIT-ASSY'
);

INSERT INTO items (tenant_id, code, name, type, uom, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    'SELF-RIGHTENING-ASSY',
    'Self Rightening Assy',
    'RAW_MATERIAL'::item_type,
    'PCS',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM items WHERE code = 'SELF-RIGHTENING-ASSY'
);

INSERT INTO items (tenant_id, code, name, type, uom, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    'IP-REMOTE-ASSY',
    'IP Remote Assy',
    'RAW_MATERIAL'::item_type,
    'PCS',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM items WHERE code = 'IP-REMOTE-ASSY'
);

INSERT INTO items (tenant_id, code, name, type, uom, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    'IP-REMOTE-CHARGING',
    'IP Remote Charging Cable Assy',
    'RAW_MATERIAL'::item_type,
    'PCS',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM items WHERE code = 'IP-REMOTE-CHARGING'
);

INSERT INTO items (tenant_id, code, name, type, uom, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    'AMCA-ELEC-ASSY',
    'AMCA Elec Assy',
    'RAW_MATERIAL'::item_type,
    'PCS',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM items WHERE code = 'AMCA-ELEC-ASSY'
);

INSERT INTO items (tenant_id, code, name, type, uom, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    'AMCA-MECH-ASSY',
    'AMCA Mech Assy',
    'RAW_MATERIAL'::item_type,
    'PCS',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM items WHERE code = 'AMCA-MECH-ASSY'
);

INSERT INTO items (tenant_id, code, name, type, uom, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    'FINAL-CRAFT-ASSY',
    'Final Craft Assy',
    'RAW_MATERIAL'::item_type,
    'PCS',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM items WHERE code = 'FINAL-CRAFT-ASSY'
);

INSERT INTO items (tenant_id, code, name, type, uom, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    'BOTTOM-BLOCK-ASSY',
    'Bottom Block Assy',
    'RAW_MATERIAL'::item_type,
    'PCS',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM items WHERE code = 'BOTTOM-BLOCK-ASSY'
);

INSERT INTO items (tenant_id, code, name, type, uom, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    'STBD-AFT-PLATE',
    'STBD Aft Plate Assy',
    'RAW_MATERIAL'::item_type,
    'Number',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM items WHERE code = 'STBD-AFT-PLATE'
);

INSERT INTO items (tenant_id, code, name, type, uom, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    'PORT-AFT-PLATE',
    'PORT Aft Plate Assy',
    'RAW_MATERIAL'::item_type,
    'Number',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM items WHERE code = 'PORT-AFT-PLATE'
);

INSERT INTO items (tenant_id, code, name, type, uom, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    '156-TFT-LCD',
    '15.6" TFT LCD, LED B 2000 Nits',
    'RAW_MATERIAL'::item_type,
    'PCS',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM items WHERE code = '156-TFT-LCD'
);

INSERT INTO items (tenant_id, code, name, type, uom, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    '156-TFT-LCD',
    '15.6" TFT LCD, LED backlight 1800 nits, FHD (1920x1080)',
    'RAW_MATERIAL'::item_type,
    'PCS',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM items WHERE code = '156-TFT-LCD'
);

INSERT INTO items (tenant_id, code, name, type, uom, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    'BOX-HANDLES',
    'Box handles',
    'RAW_MATERIAL'::item_type,
    'PCS',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM items WHERE code = 'BOX-HANDLES'
);

INSERT INTO items (tenant_id, code, name, type, uom, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    'DUMMY-LOAD-50',
    'Dummy Load 50 ohms',
    'RAW_MATERIAL'::item_type,
    'PCS',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM items WHERE code = 'DUMMY-LOAD-50'
);

INSERT INTO items (tenant_id, code, name, type, uom, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    'EYELID-FOR-CRADLE',
    'Eyelid for cradle',
    'RAW_MATERIAL'::item_type,
    'PCS',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM items WHERE code = 'EYELID-FOR-CRADLE'
);

INSERT INTO items (tenant_id, code, name, type, uom, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    'RUBBER-CUFF-SIZE',
    'Rubber Cuff (Size 40mm)(1,57")',
    'RAW_MATERIAL'::item_type,
    'PCS',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM items WHERE code = 'RUBBER-CUFF-SIZE'
);

INSERT INTO items (tenant_id, code, name, type, uom, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    'RUBBER-CUFF-SIZE',
    'Rubber  Cuff )Size 32mm (1,26")',
    'RAW_MATERIAL'::item_type,
    'PCS',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM items WHERE code = 'RUBBER-CUFF-SIZE'
);

INSERT INTO items (tenant_id, code, name, type, uom, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    'PCB-OF-MURATA',
    'PCB of Murata ROHM',
    'RAW_MATERIAL'::item_type,
    'PCS',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM items WHERE code = 'PCB-OF-MURATA'
);

INSERT INTO items (tenant_id, code, name, type, uom, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    'PCB-OF-XLROHM',
    'PCB of XLROHM',
    'RAW_MATERIAL'::item_type,
    'PCS',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM items WHERE code = 'PCB-OF-XLROHM'
);

INSERT INTO items (tenant_id, code, name, type, uom, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    'PAINT-REMOVER',
    'Paint remover',
    'RAW_MATERIAL'::item_type,
    'PCS',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM items WHERE code = 'PAINT-REMOVER'
);



-- ============================================================================
-- INSERT SUB-ASSEMBLIES (Category: SA)
-- ============================================================================

INSERT INTO items (tenant_id, code, name, type, uom, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    'JET-MOTOR-ASSY',
    'Jet Motor Assy',
    'SUB_ASSEMBLY'::item_type,
    'Number',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM items WHERE code = 'JET-MOTOR-ASSY'
);

INSERT INTO items (tenant_id, code, name, type, uom, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    'POWER-SWITCH-ASSY',
    'Power Switch Assy',
    'SUB_ASSEMBLY'::item_type,
    'Number',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM items WHERE code = 'POWER-SWITCH-ASSY'
);

INSERT INTO items (tenant_id, code, name, type, uom, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    'CHARGING-PM-ASSY',
    'Charging PM Assy',
    'SUB_ASSEMBLY'::item_type,
    'Number',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM items WHERE code = 'CHARGING-PM-ASSY'
);

INSERT INTO items (tenant_id, code, name, type, uom, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    'CHARGING-CM-ASSY',
    'Charging CM Assy',
    'SUB_ASSEMBLY'::item_type,
    'Number',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM items WHERE code = 'CHARGING-CM-ASSY'
);

INSERT INTO items (tenant_id, code, name, type, uom, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    'STBD-SIGNAL-PM',
    'STBD Signal PM Assy',
    'SUB_ASSEMBLY'::item_type,
    'Number',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM items WHERE code = 'STBD-SIGNAL-PM'
);

INSERT INTO items (tenant_id, code, name, type, uom, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    'PORT-SIGNAL-PM',
    'PORT Signal PM Assy',
    'SUB_ASSEMBLY'::item_type,
    'Number',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM items WHERE code = 'PORT-SIGNAL-PM'
);

INSERT INTO items (tenant_id, code, name, type, uom, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    'STBD-SIGNAL-CM',
    'STBD Signal CM Assy',
    'SUB_ASSEMBLY'::item_type,
    'Number',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM items WHERE code = 'STBD-SIGNAL-CM'
);

INSERT INTO items (tenant_id, code, name, type, uom, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    'PORT-SIGNAL-CM',
    'PORT Signal CM Assy',
    'SUB_ASSEMBLY'::item_type,
    'Number',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM items WHERE code = 'PORT-SIGNAL-CM'
);

INSERT INTO items (tenant_id, code, name, type, uom, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    'CURRENT-SENSOR-ASSY',
    'Current Sensor Assy',
    'SUB_ASSEMBLY'::item_type,
    'Number',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM items WHERE code = 'CURRENT-SENSOR-ASSY'
);

INSERT INTO items (tenant_id, code, name, type, uom, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    'RPM-SENSOR-ASSY',
    'RPM Sensor Assy',
    'SUB_ASSEMBLY'::item_type,
    'Number',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM items WHERE code = 'RPM-SENSOR-ASSY'
);

INSERT INTO items (tenant_id, code, name, type, uom, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    'A21-MOTHERBOARD-ASSY',
    'A21 MotherBoard Assy',
    'SUB_ASSEMBLY'::item_type,
    'Number',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM items WHERE code = 'A21-MOTHERBOARD-ASSY'
);

INSERT INTO items (tenant_id, code, name, type, uom, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    'BATTERY-BLOCK-ASSY',
    'Battery Block Assy',
    'SUB_ASSEMBLY'::item_type,
    'Number',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM items WHERE code = 'BATTERY-BLOCK-ASSY'
);

INSERT INTO items (tenant_id, code, name, type, uom, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    'STBDESC-ASSY',
    'STBD_ESC Assy',
    'SUB_ASSEMBLY'::item_type,
    'Number',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM items WHERE code = 'STBDESC-ASSY'
);

INSERT INTO items (tenant_id, code, name, type, uom, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    'PORTESC-ASSY',
    'PORT_ESC Assy',
    'SUB_ASSEMBLY'::item_type,
    'Number',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM items WHERE code = 'PORTESC-ASSY'
);

INSERT INTO items (tenant_id, code, name, type, uom, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    'STBD-BATTERY-ASSY',
    'STBD Battery Assy',
    'SUB_ASSEMBLY'::item_type,
    'Number',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM items WHERE code = 'STBD-BATTERY-ASSY'
);

INSERT INTO items (tenant_id, code, name, type, uom, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    'PORT-BATTERY-ASSY',
    'PORT Battery Assy',
    'SUB_ASSEMBLY'::item_type,
    'Number',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM items WHERE code = 'PORT-BATTERY-ASSY'
);

INSERT INTO items (tenant_id, code, name, type, uom, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    'CHARGER-BOX-ASSY',
    'Charger Box Assy',
    'SUB_ASSEMBLY'::item_type,
    'Number',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM items WHERE code = 'CHARGER-BOX-ASSY'
);

INSERT INTO items (tenant_id, code, name, type, uom, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    'ELECTRONIC-BOX-ASSY',
    'Electronic Box Assy',
    'SUB_ASSEMBLY'::item_type,
    'Number',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM items WHERE code = 'ELECTRONIC-BOX-ASSY'
);

INSERT INTO items (tenant_id, code, name, type, uom, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    'FLSTBD-ELEC',
    'FL_STBD Elec',
    'SUB_ASSEMBLY'::item_type,
    'Number',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM items WHERE code = 'FLSTBD-ELEC'
);

INSERT INTO items (tenant_id, code, name, type, uom, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    'FLPORT-ELEC',
    'FL_PORT Elec',
    'SUB_ASSEMBLY'::item_type,
    'Number',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM items WHERE code = 'FLPORT-ELEC'
);

INSERT INTO items (tenant_id, code, name, type, uom, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    'FLSTBD-MECH',
    'FL_STBD Mech',
    'SUB_ASSEMBLY'::item_type,
    'Number',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM items WHERE code = 'FLSTBD-MECH'
);

INSERT INTO items (tenant_id, code, name, type, uom, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    'FLPORT-MECH',
    'FL_PORT Mech',
    'SUB_ASSEMBLY'::item_type,
    'Number',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM items WHERE code = 'FLPORT-MECH'
);

INSERT INTO items (tenant_id, code, name, type, uom, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    'STBD-UNIT-ASSY',
    'STBD Unit Assy',
    'SUB_ASSEMBLY'::item_type,
    'Number',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM items WHERE code = 'STBD-UNIT-ASSY'
);

INSERT INTO items (tenant_id, code, name, type, uom, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    'PORT-UNIT-ASSY',
    'PORT Unit Assy',
    'SUB_ASSEMBLY'::item_type,
    'Number',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM items WHERE code = 'PORT-UNIT-ASSY'
);

INSERT INTO items (tenant_id, code, name, type, uom, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    'SELF-RIGHTENING-ASSY',
    'Self Rightening Assy',
    'SUB_ASSEMBLY'::item_type,
    'Number',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM items WHERE code = 'SELF-RIGHTENING-ASSY'
);

INSERT INTO items (tenant_id, code, name, type, uom, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    'IP-REMOTE-ASSY',
    'IP Remote Assy',
    'SUB_ASSEMBLY'::item_type,
    'Number',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM items WHERE code = 'IP-REMOTE-ASSY'
);

INSERT INTO items (tenant_id, code, name, type, uom, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    'IP-REMOTE-CHARGING',
    'IP Remote Charging Cable Assy',
    'SUB_ASSEMBLY'::item_type,
    'Number',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM items WHERE code = 'IP-REMOTE-CHARGING'
);

INSERT INTO items (tenant_id, code, name, type, uom, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    'AMCA-ELEC-ASSY',
    'AMCA Elec Assy',
    'SUB_ASSEMBLY'::item_type,
    'Number',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM items WHERE code = 'AMCA-ELEC-ASSY'
);

INSERT INTO items (tenant_id, code, name, type, uom, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    'AMCA-MECH-ASSY',
    'AMCA Mech Assy',
    'SUB_ASSEMBLY'::item_type,
    'Number',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM items WHERE code = 'AMCA-MECH-ASSY'
);

INSERT INTO items (tenant_id, code, name, type, uom, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    'FINAL-CRAFT-ASSY',
    'Final Craft Assy',
    'SUB_ASSEMBLY'::item_type,
    'Number',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM items WHERE code = 'FINAL-CRAFT-ASSY'
);

INSERT INTO items (tenant_id, code, name, type, uom, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    'BOTTOM-BLOCK-ASSY',
    'Bottom Block Assy',
    'SUB_ASSEMBLY'::item_type,
    'Number',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM items WHERE code = 'BOTTOM-BLOCK-ASSY'
);

INSERT INTO items (tenant_id, code, name, type, uom, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    'STBD-AFT-PLATE',
    'STBD Aft Plate Assy',
    'SUB_ASSEMBLY'::item_type,
    'Number',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM items WHERE code = 'STBD-AFT-PLATE'
);

INSERT INTO items (tenant_id, code, name, type, uom, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    'PORT-AFT-PLATE',
    'PORT Aft Plate Assy',
    'SUB_ASSEMBLY'::item_type,
    'Number',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM items WHERE code = 'PORT-AFT-PLATE'
);

INSERT INTO items (tenant_id, code, name, type, uom, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    'R9MX-ADAPTER',
    'R9MX Adapter',
    'SUB_ASSEMBLY'::item_type,
    'Number',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM items WHERE code = 'R9MX-ADAPTER'
);

INSERT INTO items (tenant_id, code, name, type, uom, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    'FINAL-PACKING',
    'Final Packing',
    'SUB_ASSEMBLY'::item_type,
    'Number',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM items WHERE code = 'FINAL-PACKING'
);



-- ============================================================================
-- INSERT ITEM-VENDOR RELATIONSHIPS
-- Priority 1 = Preferred Vendor, 2+ = Alternate Vendors
-- ============================================================================

-- QX7 Transmitter with R9M → Robu (Priority 1)
INSERT INTO item_vendors (item_id, vendor_id, priority, unit_price, is_active, created_at, updated_at)
SELECT 
    i.id,
    v.id,
    1,
    12000.0,
    true,
    NOW(),
    NOW()
FROM items i
CROSS JOIN vendors v
WHERE i.code = 'QX7-TRANSMITTER-WITH'
  AND v.code = 'ROBU'
  AND NOT EXISTS (
      SELECT 1 FROM item_vendors WHERE item_id = i.id AND vendor_id = v.id
  )
LIMIT 1;

-- QX7 Transmitter with R9M → Vyom (Priority 2)
INSERT INTO item_vendors (item_id, vendor_id, priority, unit_price, is_active, created_at, updated_at)
SELECT 
    i.id,
    v.id,
    2,
    NULL,
    true,
    NOW(),
    NOW()
FROM items i
CROSS JOIN vendors v
WHERE i.code = 'QX7-TRANSMITTER-WITH'
  AND v.code = 'VYOM'
  AND NOT EXISTS (
      SELECT 1 FROM item_vendors WHERE item_id = i.id AND vendor_id = v.id
  )
LIMIT 1;

-- Receiver Module R9MM/R9MX/R9 → Robu (Priority 1)
INSERT INTO item_vendors (item_id, vendor_id, priority, unit_price, is_active, created_at, updated_at)
SELECT 
    i.id,
    v.id,
    1,
    2200.0,
    true,
    NOW(),
    NOW()
FROM items i
CROSS JOIN vendors v
WHERE i.code = 'RECEIVER-MODULE-R9MMR9MXR9'
  AND v.code = 'ROBU'
  AND NOT EXISTS (
      SELECT 1 FROM item_vendors WHERE item_id = i.id AND vendor_id = v.id
  )
LIMIT 1;

-- Receiver Module R9MM/R9MX/R9 → Vyom (Priority 2)
INSERT INTO item_vendors (item_id, vendor_id, priority, unit_price, is_active, created_at, updated_at)
SELECT 
    i.id,
    v.id,
    2,
    NULL,
    true,
    NOW(),
    NOW()
FROM items i
CROSS JOIN vendors v
WHERE i.code = 'RECEIVER-MODULE-R9MMR9MXR9'
  AND v.code = 'VYOM'
  AND NOT EXISTS (
      SELECT 1 FROM item_vendors WHERE item_id = i.id AND vendor_id = v.id
  )
LIMIT 1;

-- Free Wheel Diode SMD M7 → Robu (Priority 1)
INSERT INTO item_vendors (item_id, vendor_id, priority, unit_price, is_active, created_at, updated_at)
SELECT 
    i.id,
    v.id,
    1,
    1.7,
    true,
    NOW(),
    NOW()
FROM items i
CROSS JOIN vendors v
WHERE i.code = 'FREE-WHEEL-DIODE'
  AND v.code = 'ROBU'
  AND NOT EXISTS (
      SELECT 1 FROM item_vendors WHERE item_id = i.id AND vendor_id = v.id
  )
LIMIT 1;

-- AMS1117 5.0v → Robu (Priority 1)
INSERT INTO item_vendors (item_id, vendor_id, priority, unit_price, is_active, created_at, updated_at)
SELECT 
    i.id,
    v.id,
    1,
    10.0,
    true,
    NOW(),
    NOW()
FROM items i
CROSS JOIN vendors v
WHERE i.code = 'AMS1117-50V'
  AND v.code = 'ROBU'
  AND NOT EXISTS (
      SELECT 1 FROM item_vendors WHERE item_id = i.id AND vendor_id = v.id
  )
LIMIT 1;

-- AMS1117 3.3v → Robu (Priority 1)
INSERT INTO item_vendors (item_id, vendor_id, priority, unit_price, is_active, created_at, updated_at)
SELECT 
    i.id,
    v.id,
    1,
    10.0,
    true,
    NOW(),
    NOW()
FROM items i
CROSS JOIN vendors v
WHERE i.code = 'AMS1117-33V'
  AND v.code = 'ROBU'
  AND NOT EXISTS (
      SELECT 1 FROM item_vendors WHERE item_id = i.id AND vendor_id = v.id
  )
LIMIT 1;

-- NEO-6M GPS/L80 GPS → Roland (Priority 1)
INSERT INTO item_vendors (item_id, vendor_id, priority, unit_price, is_active, created_at, updated_at)
SELECT 
    i.id,
    v.id,
    1,
    245.0,
    true,
    NOW(),
    NOW()
FROM items i
CROSS JOIN vendors v
WHERE i.code = 'NEO6M-GPSL80-GPS'
  AND v.code = 'ROLAND'
  AND NOT EXISTS (
      SELECT 1 FROM item_vendors WHERE item_id = i.id AND vendor_id = v.id
  )
LIMIT 1;

-- 5.5mm Female Bullet connector → Hobbywing (Priority 1)
INSERT INTO item_vendors (item_id, vendor_id, priority, unit_price, is_active, created_at, updated_at)
SELECT 
    i.id,
    v.id,
    1,
    0,
    true,
    NOW(),
    NOW()
FROM items i
CROSS JOIN vendors v
WHERE i.code = '55MM-FEMALE-BULLET'
  AND v.code = 'HOBBYWING'
  AND NOT EXISTS (
      SELECT 1 FROM item_vendors WHERE item_id = i.id AND vendor_id = v.id
  )
LIMIT 1;

-- 4mm Male Bullet connector → Robu (Priority 1)
INSERT INTO item_vendors (item_id, vendor_id, priority, unit_price, is_active, created_at, updated_at)
SELECT 
    i.id,
    v.id,
    1,
    22.5,
    true,
    NOW(),
    NOW()
FROM items i
CROSS JOIN vendors v
WHERE i.code = '4MM-MALE-BULLET'
  AND v.code = 'ROBU'
  AND NOT EXISTS (
      SELECT 1 FROM item_vendors WHERE item_id = i.id AND vendor_id = v.id
  )
LIMIT 1;

-- 4mm Female Bullet connector → Robu (Priority 1)
INSERT INTO item_vendors (item_id, vendor_id, priority, unit_price, is_active, created_at, updated_at)
SELECT 
    i.id,
    v.id,
    1,
    22.5,
    true,
    NOW(),
    NOW()
FROM items i
CROSS JOIN vendors v
WHERE i.code = '4MM-FEMALE-BULLET'
  AND v.code = 'ROBU'
  AND NOT EXISTS (
      SELECT 1 FROM item_vendors WHERE item_id = i.id AND vendor_id = v.id
  )
LIMIT 1;

-- 2mm male bullet connector → Robu (Priority 1)
INSERT INTO item_vendors (item_id, vendor_id, priority, unit_price, is_active, created_at, updated_at)
SELECT 
    i.id,
    v.id,
    1,
    9.0,
    true,
    NOW(),
    NOW()
FROM items i
CROSS JOIN vendors v
WHERE i.code = '2MM-MALE-BULLET'
  AND v.code = 'ROBU'
  AND NOT EXISTS (
      SELECT 1 FROM item_vendors WHERE item_id = i.id AND vendor_id = v.id
  )
LIMIT 1;

-- 2mm Female Bullet connector → Robu (Priority 1)
INSERT INTO item_vendors (item_id, vendor_id, priority, unit_price, is_active, created_at, updated_at)
SELECT 
    i.id,
    v.id,
    1,
    9.0,
    true,
    NOW(),
    NOW()
FROM items i
CROSS JOIN vendors v
WHERE i.code = '2MM-FEMALE-BULLET'
  AND v.code = 'ROBU'
  AND NOT EXISTS (
      SELECT 1 FROM item_vendors WHERE item_id = i.id AND vendor_id = v.id
  )
LIMIT 1;

-- 6mm male bullet connector → Robu (Priority 1)
INSERT INTO item_vendors (item_id, vendor_id, priority, unit_price, is_active, created_at, updated_at)
SELECT 
    i.id,
    v.id,
    1,
    50.0,
    true,
    NOW(),
    NOW()
FROM items i
CROSS JOIN vendors v
WHERE i.code = '6MM-MALE-BULLET'
  AND v.code = 'ROBU'
  AND NOT EXISTS (
      SELECT 1 FROM item_vendors WHERE item_id = i.id AND vendor_id = v.id
  )
LIMIT 1;

-- 6mm female bullet connector → Robu (Priority 1)
INSERT INTO item_vendors (item_id, vendor_id, priority, unit_price, is_active, created_at, updated_at)
SELECT 
    i.id,
    v.id,
    1,
    50.0,
    true,
    NOW(),
    NOW()
FROM items i
CROSS JOIN vendors v
WHERE i.code = '6MM-FEMALE-BULLET'
  AND v.code = 'ROBU'
  AND NOT EXISTS (
      SELECT 1 FROM item_vendors WHERE item_id = i.id AND vendor_id = v.id
  )
LIMIT 1;

-- 8mm male bullet connector → Robu (Priority 1)
INSERT INTO item_vendors (item_id, vendor_id, priority, unit_price, is_active, created_at, updated_at)
SELECT 
    i.id,
    v.id,
    1,
    56.0,
    true,
    NOW(),
    NOW()
FROM items i
CROSS JOIN vendors v
WHERE i.code = '8MM-MALE-BULLET'
  AND v.code = 'ROBU'
  AND NOT EXISTS (
      SELECT 1 FROM item_vendors WHERE item_id = i.id AND vendor_id = v.id
  )
LIMIT 1;

-- 8mm female bullet connector → Robu (Priority 1)
INSERT INTO item_vendors (item_id, vendor_id, priority, unit_price, is_active, created_at, updated_at)
SELECT 
    i.id,
    v.id,
    1,
    56.0,
    true,
    NOW(),
    NOW()
FROM items i
CROSS JOIN vendors v
WHERE i.code = '8MM-FEMALE-BULLET'
  AND v.code = 'ROBU'
  AND NOT EXISTS (
      SELECT 1 FROM item_vendors WHERE item_id = i.id AND vendor_id = v.id
  )
LIMIT 1;

-- Ultra Flexible Black 8AWG → Robu (Priority 1)
INSERT INTO item_vendors (item_id, vendor_id, priority, unit_price, is_active, created_at, updated_at)
SELECT 
    i.id,
    v.id,
    1,
    263.0,
    true,
    NOW(),
    NOW()
FROM items i
CROSS JOIN vendors v
WHERE i.code = 'ULTRA-FLEXIBLE-BLACK'
  AND v.code = 'ROBU'
  AND NOT EXISTS (
      SELECT 1 FROM item_vendors WHERE item_id = i.id AND vendor_id = v.id
  )
LIMIT 1;

-- Ultra Flexible  Red 8AWG → Robu (Priority 1)
INSERT INTO item_vendors (item_id, vendor_id, priority, unit_price, is_active, created_at, updated_at)
SELECT 
    i.id,
    v.id,
    1,
    263.0,
    true,
    NOW(),
    NOW()
FROM items i
CROSS JOIN vendors v
WHERE i.code = 'ULTRA-FLEXIBLE-RED'
  AND v.code = 'ROBU'
  AND NOT EXISTS (
      SELECT 1 FROM item_vendors WHERE item_id = i.id AND vendor_id = v.id
  )
LIMIT 1;

-- Ultra Flexible Black 12AWG → Robu (Priority 1)
INSERT INTO item_vendors (item_id, vendor_id, priority, unit_price, is_active, created_at, updated_at)
SELECT 
    i.id,
    v.id,
    1,
    110.0,
    true,
    NOW(),
    NOW()
FROM items i
CROSS JOIN vendors v
WHERE i.code = 'ULTRA-FLEXIBLE-BLACK'
  AND v.code = 'ROBU'
  AND NOT EXISTS (
      SELECT 1 FROM item_vendors WHERE item_id = i.id AND vendor_id = v.id
  )
LIMIT 1;

-- Ultra Flexible Red 12AWG → Robu (Priority 1)
INSERT INTO item_vendors (item_id, vendor_id, priority, unit_price, is_active, created_at, updated_at)
SELECT 
    i.id,
    v.id,
    1,
    110.0,
    true,
    NOW(),
    NOW()
FROM items i
CROSS JOIN vendors v
WHERE i.code = 'ULTRA-FLEXIBLE-RED'
  AND v.code = 'ROBU'
  AND NOT EXISTS (
      SELECT 1 FROM item_vendors WHERE item_id = i.id AND vendor_id = v.id
  )
LIMIT 1;

-- Ultra Flexible Black 18 AWG → Robu (Priority 1)
INSERT INTO item_vendors (item_id, vendor_id, priority, unit_price, is_active, created_at, updated_at)
SELECT 
    i.id,
    v.id,
    1,
    35.0,
    true,
    NOW(),
    NOW()
FROM items i
CROSS JOIN vendors v
WHERE i.code = 'ULTRA-FLEXIBLE-BLACK'
  AND v.code = 'ROBU'
  AND NOT EXISTS (
      SELECT 1 FROM item_vendors WHERE item_id = i.id AND vendor_id = v.id
  )
LIMIT 1;

-- Ultra Flexible Red 18 AWG → Robu (Priority 1)
INSERT INTO item_vendors (item_id, vendor_id, priority, unit_price, is_active, created_at, updated_at)
SELECT 
    i.id,
    v.id,
    1,
    35.0,
    true,
    NOW(),
    NOW()
FROM items i
CROSS JOIN vendors v
WHERE i.code = 'ULTRA-FLEXIBLE-RED'
  AND v.code = 'ROBU'
  AND NOT EXISTS (
      SELECT 1 FROM item_vendors WHERE item_id = i.id AND vendor_id = v.id
  )
LIMIT 1;

-- Ultra Flexible Black 20 AWG → Robu (Priority 1)
INSERT INTO item_vendors (item_id, vendor_id, priority, unit_price, is_active, created_at, updated_at)
SELECT 
    i.id,
    v.id,
    1,
    26.5,
    true,
    NOW(),
    NOW()
FROM items i
CROSS JOIN vendors v
WHERE i.code = 'ULTRA-FLEXIBLE-BLACK'
  AND v.code = 'ROBU'
  AND NOT EXISTS (
      SELECT 1 FROM item_vendors WHERE item_id = i.id AND vendor_id = v.id
  )
LIMIT 1;

-- Ultra Flexible Red 20 AWG → Robu (Priority 1)
INSERT INTO item_vendors (item_id, vendor_id, priority, unit_price, is_active, created_at, updated_at)
SELECT 
    i.id,
    v.id,
    1,
    26.5,
    true,
    NOW(),
    NOW()
FROM items i
CROSS JOIN vendors v
WHERE i.code = 'ULTRA-FLEXIBLE-RED'
  AND v.code = 'ROBU'
  AND NOT EXISTS (
      SELECT 1 FROM item_vendors WHERE item_id = i.id AND vendor_id = v.id
  )
LIMIT 1;

-- Ultra Flexible Blue 20 AWG → Robu (Priority 1)
INSERT INTO item_vendors (item_id, vendor_id, priority, unit_price, is_active, created_at, updated_at)
SELECT 
    i.id,
    v.id,
    1,
    0,
    true,
    NOW(),
    NOW()
FROM items i
CROSS JOIN vendors v
WHERE i.code = 'ULTRA-FLEXIBLE-BLUE'
  AND v.code = 'ROBU'
  AND NOT EXISTS (
      SELECT 1 FROM item_vendors WHERE item_id = i.id AND vendor_id = v.id
  )
LIMIT 1;

-- Water flow sensor YFS401 → Roland (Priority 1)
INSERT INTO item_vendors (item_id, vendor_id, priority, unit_price, is_active, created_at, updated_at)
SELECT 
    i.id,
    v.id,
    1,
    200.0,
    true,
    NOW(),
    NOW()
FROM items i
CROSS JOIN vendors v
WHERE i.code = 'WATER-FLOW-SENSOR'
  AND v.code = 'ROLAND'
  AND NOT EXISTS (
      SELECT 1 FROM item_vendors WHERE item_id = i.id AND vendor_id = v.id
  )
LIMIT 1;

-- Water pump 550 diaphragm → Robu (Priority 1)
INSERT INTO item_vendors (item_id, vendor_id, priority, unit_price, is_active, created_at, updated_at)
SELECT 
    i.id,
    v.id,
    1,
    473.0,
    true,
    NOW(),
    NOW()
FROM items i
CROSS JOIN vendors v
WHERE i.code = 'WATER-PUMP-550'
  AND v.code = 'ROBU'
  AND NOT EXISTS (
      SELECT 1 FROM item_vendors WHERE item_id = i.id AND vendor_id = v.id
  )
LIMIT 1;

-- 1S Lipo indicator (Not Using) → Robu (Priority 1)
INSERT INTO item_vendors (item_id, vendor_id, priority, unit_price, is_active, created_at, updated_at)
SELECT 
    i.id,
    v.id,
    1,
    91.0,
    true,
    NOW(),
    NOW()
FROM items i
CROSS JOIN vendors v
WHERE i.code = '1S-LIPO-INDICATOR'
  AND v.code = 'ROBU'
  AND NOT EXISTS (
      SELECT 1 FROM item_vendors WHERE item_id = i.id AND vendor_id = v.id
  )
LIMIT 1;

-- 2S Lipo indicator → Robu (Priority 1)
INSERT INTO item_vendors (item_id, vendor_id, priority, unit_price, is_active, created_at, updated_at)
SELECT 
    i.id,
    v.id,
    1,
    100.0,
    true,
    NOW(),
    NOW()
FROM items i
CROSS JOIN vendors v
WHERE i.code = '2S-LIPO-INDICATOR'
  AND v.code = 'ROBU'
  AND NOT EXISTS (
      SELECT 1 FROM item_vendors WHERE item_id = i.id AND vendor_id = v.id
  )
LIMIT 1;

-- Lipo Indicator Casings → Robu (Priority 1)
INSERT INTO item_vendors (item_id, vendor_id, priority, unit_price, is_active, created_at, updated_at)
SELECT 
    i.id,
    v.id,
    1,
    120.0,
    true,
    NOW(),
    NOW()
FROM items i
CROSS JOIN vendors v
WHERE i.code = 'LIPO-INDICATOR-CASINGS'
  AND v.code = 'ROBU'
  AND NOT EXISTS (
      SELECT 1 FROM item_vendors WHERE item_id = i.id AND vendor_id = v.id
  )
LIMIT 1;

-- Buck converter XL7015 50v → Robu (Priority 1)
INSERT INTO item_vendors (item_id, vendor_id, priority, unit_price, is_active, created_at, updated_at)
SELECT 
    i.id,
    v.id,
    1,
    78.0,
    true,
    NOW(),
    NOW()
FROM items i
CROSS JOIN vendors v
WHERE i.code = 'BUCK-CONVERTER-XL7015'
  AND v.code = 'ROBU'
  AND NOT EXISTS (
      SELECT 1 FROM item_vendors WHERE item_id = i.id AND vendor_id = v.id
  )
LIMIT 1;

-- LM2596 in AMCA → Robu (Priority 1)
INSERT INTO item_vendors (item_id, vendor_id, priority, unit_price, is_active, created_at, updated_at)
SELECT 
    i.id,
    v.id,
    1,
    65.0,
    true,
    NOW(),
    NOW()
FROM items i
CROSS JOIN vendors v
WHERE i.code = 'LM2596-IN-AMCA'
  AND v.code = 'ROBU'
  AND NOT EXISTS (
      SELECT 1 FROM item_vendors WHERE item_id = i.id AND vendor_id = v.id
  )
LIMIT 1;

-- XL4015/XL4005 5A buck converter → Robu (Priority 1)
INSERT INTO item_vendors (item_id, vendor_id, priority, unit_price, is_active, created_at, updated_at)
SELECT 
    i.id,
    v.id,
    1,
    72.0,
    true,
    NOW(),
    NOW()
FROM items i
CROSS JOIN vendors v
WHERE i.code = 'XL4015XL4005-5A-BUCK'
  AND v.code = 'ROBU'
  AND NOT EXISTS (
      SELECT 1 FROM item_vendors WHERE item_id = i.id AND vendor_id = v.id
  )
LIMIT 1;

-- XT90 Female housing → Robu (Priority 1)
INSERT INTO item_vendors (item_id, vendor_id, priority, unit_price, is_active, created_at, updated_at)
SELECT 
    i.id,
    v.id,
    1,
    48.0,
    true,
    NOW(),
    NOW()
FROM items i
CROSS JOIN vendors v
WHERE i.code = 'XT90-FEMALE-HOUSING'
  AND v.code = 'ROBU'
  AND NOT EXISTS (
      SELECT 1 FROM item_vendors WHERE item_id = i.id AND vendor_id = v.id
  )
LIMIT 1;

-- 24v AC/DC module → Robu (Priority 1)
INSERT INTO item_vendors (item_id, vendor_id, priority, unit_price, is_active, created_at, updated_at)
SELECT 
    i.id,
    v.id,
    1,
    372.0,
    true,
    NOW(),
    NOW()
FROM items i
CROSS JOIN vendors v
WHERE i.code = '24V-ACDC-MODULE'
  AND v.code = 'ROBU'
  AND NOT EXISTS (
      SELECT 1 FROM item_vendors WHERE item_id = i.id AND vendor_id = v.id
  )
LIMIT 1;

-- Momentary Switch JCB → RR Innovations (Priority 1)
INSERT INTO item_vendors (item_id, vendor_id, priority, unit_price, is_active, created_at, updated_at)
SELECT 
    i.id,
    v.id,
    1,
    200.0,
    true,
    NOW(),
    NOW()
FROM items i
CROSS JOIN vendors v
WHERE i.code = 'MOMENTARY-SWITCH-JCB'
  AND v.code = 'RRINNOVATIONS'
  AND NOT EXISTS (
      SELECT 1 FROM item_vendors WHERE item_id = i.id AND vendor_id = v.id
  )
LIMIT 1;

-- Latching Power switch JCB → RR Innovations (Priority 1)
INSERT INTO item_vendors (item_id, vendor_id, priority, unit_price, is_active, created_at, updated_at)
SELECT 
    i.id,
    v.id,
    1,
    215.0,
    true,
    NOW(),
    NOW()
FROM items i
CROSS JOIN vendors v
WHERE i.code = 'LATCHING-POWER-SWITCH'
  AND v.code = 'RRINNOVATIONS'
  AND NOT EXISTS (
      SELECT 1 FROM item_vendors WHERE item_id = i.id AND vendor_id = v.id
  )
LIMIT 1;

-- PWB for IFU → JLC (Priority 1)
INSERT INTO item_vendors (item_id, vendor_id, priority, unit_price, is_active, created_at, updated_at)
SELECT 
    i.id,
    v.id,
    1,
    20.0,
    true,
    NOW(),
    NOW()
FROM items i
CROSS JOIN vendors v
WHERE i.code = 'PWB-FOR-IFU'
  AND v.code = 'JLC'
  AND NOT EXISTS (
      SELECT 1 FROM item_vendors WHERE item_id = i.id AND vendor_id = v.id
  )
LIMIT 1;

-- PWB for JCB → JLC (Priority 1)
INSERT INTO item_vendors (item_id, vendor_id, priority, unit_price, is_active, created_at, updated_at)
SELECT 
    i.id,
    v.id,
    1,
    100.0,
    true,
    NOW(),
    NOW()
FROM items i
CROSS JOIN vendors v
WHERE i.code = 'PWB-FOR-JCB'
  AND v.code = 'JLC'
  AND NOT EXISTS (
      SELECT 1 FROM item_vendors WHERE item_id = i.id AND vendor_id = v.id
  )
LIMIT 1;

-- PWB of STBD flash light → JLC (Priority 1)
INSERT INTO item_vendors (item_id, vendor_id, priority, unit_price, is_active, created_at, updated_at)
SELECT 
    i.id,
    v.id,
    1,
    30.0,
    true,
    NOW(),
    NOW()
FROM items i
CROSS JOIN vendors v
WHERE i.code = 'PWB-OF-STBD'
  AND v.code = 'JLC'
  AND NOT EXISTS (
      SELECT 1 FROM item_vendors WHERE item_id = i.id AND vendor_id = v.id
  )
LIMIT 1;

-- PWB of PORT flash light → JLC (Priority 1)
INSERT INTO item_vendors (item_id, vendor_id, priority, unit_price, is_active, created_at, updated_at)
SELECT 
    i.id,
    v.id,
    1,
    30.0,
    true,
    NOW(),
    NOW()
FROM items i
CROSS JOIN vendors v
WHERE i.code = 'PWB-OF-PORT'
  AND v.code = 'JLC'
  AND NOT EXISTS (
      SELECT 1 FROM item_vendors WHERE item_id = i.id AND vendor_id = v.id
  )
LIMIT 1;

-- PWB of A4 Motherboard → JLC (Priority 1)
INSERT INTO item_vendors (item_id, vendor_id, priority, unit_price, is_active, created_at, updated_at)
SELECT 
    i.id,
    v.id,
    1,
    200.0,
    true,
    NOW(),
    NOW()
FROM items i
CROSS JOIN vendors v
WHERE i.code = 'PWB-OF-A4'
  AND v.code = 'JLC'
  AND NOT EXISTS (
      SELECT 1 FROM item_vendors WHERE item_id = i.id AND vendor_id = v.id
  )
LIMIT 1;

-- PWB of Current Sensor → JLC (Priority 1)
INSERT INTO item_vendors (item_id, vendor_id, priority, unit_price, is_active, created_at, updated_at)
SELECT 
    i.id,
    v.id,
    1,
    20.0,
    true,
    NOW(),
    NOW()
FROM items i
CROSS JOIN vendors v
WHERE i.code = 'PWB-OF-CURRENT'
  AND v.code = 'JLC'
  AND NOT EXISTS (
      SELECT 1 FROM item_vendors WHERE item_id = i.id AND vendor_id = v.id
  )
LIMIT 1;

-- PWB of Button -2 → JLC (Priority 1)
INSERT INTO item_vendors (item_id, vendor_id, priority, unit_price, is_active, created_at, updated_at)
SELECT 
    i.id,
    v.id,
    1,
    10.0,
    true,
    NOW(),
    NOW()
FROM items i
CROSS JOIN vendors v
WHERE i.code = 'PWB-OF-BUTTON'
  AND v.code = 'JLC'
  AND NOT EXISTS (
      SELECT 1 FROM item_vendors WHERE item_id = i.id AND vendor_id = v.id
  )
LIMIT 1;

-- PWB for PC (in charger) → JLC (Priority 1)
INSERT INTO item_vendors (item_id, vendor_id, priority, unit_price, is_active, created_at, updated_at)
SELECT 
    i.id,
    v.id,
    1,
    10.0,
    true,
    NOW(),
    NOW()
FROM items i
CROSS JOIN vendors v
WHERE i.code = 'PWB-FOR-PC'
  AND v.code = 'JLC'
  AND NOT EXISTS (
      SELECT 1 FROM item_vendors WHERE item_id = i.id AND vendor_id = v.id
  )
LIMIT 1;

-- PWB for Bathemetry Sensor → JLC (Priority 1)
INSERT INTO item_vendors (item_id, vendor_id, priority, unit_price, is_active, created_at, updated_at)
SELECT 
    i.id,
    v.id,
    1,
    0,
    true,
    NOW(),
    NOW()
FROM items i
CROSS JOIN vendors v
WHERE i.code = 'PWB-FOR-BATHEMETRY'
  AND v.code = 'JLC'
  AND NOT EXISTS (
      SELECT 1 FROM item_vendors WHERE item_id = i.id AND vendor_id = v.id
  )
LIMIT 1;

-- WCS1700 current Sensor → NSK Electronics (Priority 1)
INSERT INTO item_vendors (item_id, vendor_id, priority, unit_price, is_active, created_at, updated_at)
SELECT 
    i.id,
    v.id,
    1,
    185.0,
    true,
    NOW(),
    NOW()
FROM items i
CROSS JOIN vendors v
WHERE i.code = 'WCS1700-CURRENT-SENSOR'
  AND v.code = 'NSKELECTRONICS'
  AND NOT EXISTS (
      SELECT 1 FROM item_vendors WHERE item_id = i.id AND vendor_id = v.id
  )
LIMIT 1;

-- 6X3 BATTERY blocks → Ampower India (Priority 1)
INSERT INTO item_vendors (item_id, vendor_id, priority, unit_price, is_active, created_at, updated_at)
SELECT 
    i.id,
    v.id,
    1,
    450.0,
    true,
    NOW(),
    NOW()
FROM items i
CROSS JOIN vendors v
WHERE i.code = '6X3-BATTERY-BLOCKS'
  AND v.code = 'AMPOWERINDIA'
  AND NOT EXISTS (
      SELECT 1 FROM item_vendors WHERE item_id = i.id AND vendor_id = v.id
  )
LIMIT 1;

-- 18650 cells Li-Ion for JCB → Ampower India (Priority 1)
INSERT INTO item_vendors (item_id, vendor_id, priority, unit_price, is_active, created_at, updated_at)
SELECT 
    i.id,
    v.id,
    1,
    750.0,
    true,
    NOW(),
    NOW()
FROM items i
CROSS JOIN vendors v
WHERE i.code = '18650-CELLS-LIION'
  AND v.code = 'AMPOWERINDIA'
  AND NOT EXISTS (
      SELECT 1 FROM item_vendors WHERE item_id = i.id AND vendor_id = v.id
  )
LIMIT 1;

-- 18650 Cell Holder → Robu (Priority 1)
INSERT INTO item_vendors (item_id, vendor_id, priority, unit_price, is_active, created_at, updated_at)
SELECT 
    i.id,
    v.id,
    1,
    68.0,
    true,
    NOW(),
    NOW()
FROM items i
CROSS JOIN vendors v
WHERE i.code = '18650-CELL-HOLDER'
  AND v.code = 'ROBU'
  AND NOT EXISTS (
      SELECT 1 FROM item_vendors WHERE item_id = i.id AND vendor_id = v.id
  )
LIMIT 1;

-- USB Data & Charging Cable 1.5m length Black → Roland (Priority 1)
INSERT INTO item_vendors (item_id, vendor_id, priority, unit_price, is_active, created_at, updated_at)
SELECT 
    i.id,
    v.id,
    1,
    35.0,
    true,
    NOW(),
    NOW()
FROM items i
CROSS JOIN vendors v
WHERE i.code = 'USB-DATA-CHARGING'
  AND v.code = 'ROLAND'
  AND NOT EXISTS (
      SELECT 1 FROM item_vendors WHERE item_id = i.id AND vendor_id = v.id
  )
LIMIT 1;

-- DC Jack Panel Mount → Roland (Priority 1)
INSERT INTO item_vendors (item_id, vendor_id, priority, unit_price, is_active, created_at, updated_at)
SELECT 
    i.id,
    v.id,
    1,
    5.0,
    true,
    NOW(),
    NOW()
FROM items i
CROSS JOIN vendors v
WHERE i.code = 'DC-JACK-PANEL'
  AND v.code = 'ROLAND'
  AND NOT EXISTS (
      SELECT 1 FROM item_vendors WHERE item_id = i.id AND vendor_id = v.id
  )
LIMIT 1;

-- Lead paste → Roland (Priority 1)
INSERT INTO item_vendors (item_id, vendor_id, priority, unit_price, is_active, created_at, updated_at)
SELECT 
    i.id,
    v.id,
    1,
    5.0,
    true,
    NOW(),
    NOW()
FROM items i
CROSS JOIN vendors v
WHERE i.code = 'LEAD-PASTE'
  AND v.code = 'ROLAND'
  AND NOT EXISTS (
      SELECT 1 FROM item_vendors WHERE item_id = i.id AND vendor_id = v.id
  )
LIMIT 1;

-- Lead wire 22AWG → Roland (Priority 1)
INSERT INTO item_vendors (item_id, vendor_id, priority, unit_price, is_active, created_at, updated_at)
SELECT 
    i.id,
    v.id,
    1,
    2.5,
    true,
    NOW(),
    NOW()
FROM items i
CROSS JOIN vendors v
WHERE i.code = 'LEAD-WIRE-22AWG'
  AND v.code = 'ROLAND'
  AND NOT EXISTS (
      SELECT 1 FROM item_vendors WHERE item_id = i.id AND vendor_id = v.id
  )
LIMIT 1;

-- Heat Sink Pad → Seutes (Priority 1)
INSERT INTO item_vendors (item_id, vendor_id, priority, unit_price, is_active, created_at, updated_at)
SELECT 
    i.id,
    v.id,
    1,
    800.0,
    true,
    NOW(),
    NOW()
FROM items i
CROSS JOIN vendors v
WHERE i.code = 'HEAT-SINK-PAD'
  AND v.code = 'SEUTES'
  AND NOT EXISTS (
      SELECT 1 FROM item_vendors WHERE item_id = i.id AND vendor_id = v.id
  )
LIMIT 1;

-- LM358DT SMD → Seutes (Priority 1)
INSERT INTO item_vendors (item_id, vendor_id, priority, unit_price, is_active, created_at, updated_at)
SELECT 
    i.id,
    v.id,
    1,
    8.0,
    true,
    NOW(),
    NOW()
FROM items i
CROSS JOIN vendors v
WHERE i.code = 'LM358DT-SMD'
  AND v.code = 'SEUTES'
  AND NOT EXISTS (
      SELECT 1 FROM item_vendors WHERE item_id = i.id AND vendor_id = v.id
  )
LIMIT 1;

-- 0.1uF 0805 → Seutes (Priority 1)
INSERT INTO item_vendors (item_id, vendor_id, priority, unit_price, is_active, created_at, updated_at)
SELECT 
    i.id,
    v.id,
    1,
    0.7,
    true,
    NOW(),
    NOW()
FROM items i
CROSS JOIN vendors v
WHERE i.code = '01UF-0805'
  AND v.code = 'SEUTES'
  AND NOT EXISTS (
      SELECT 1 FROM item_vendors WHERE item_id = i.id AND vendor_id = v.id
  )
LIMIT 1;

-- 0.01uF 0805 → Seutes (Priority 1)
INSERT INTO item_vendors (item_id, vendor_id, priority, unit_price, is_active, created_at, updated_at)
SELECT 
    i.id,
    v.id,
    1,
    0.7,
    true,
    NOW(),
    NOW()
FROM items i
CROSS JOIN vendors v
WHERE i.code = '001UF-0805'
  AND v.code = 'SEUTES'
  AND NOT EXISTS (
      SELECT 1 FROM item_vendors WHERE item_id = i.id AND vendor_id = v.id
  )
LIMIT 1;

-- LED 0805 SMD → Seutes (Priority 1)
INSERT INTO item_vendors (item_id, vendor_id, priority, unit_price, is_active, created_at, updated_at)
SELECT 
    i.id,
    v.id,
    1,
    0.7,
    true,
    NOW(),
    NOW()
FROM items i
CROSS JOIN vendors v
WHERE i.code = 'LED-0805-SMD'
  AND v.code = 'SEUTES'
  AND NOT EXISTS (
      SELECT 1 FROM item_vendors WHERE item_id = i.id AND vendor_id = v.id
  )
LIMIT 1;

-- TS5A3157DBVR SSR Encoder Signal Cut-Off → Seutes (Priority 1)
INSERT INTO item_vendors (item_id, vendor_id, priority, unit_price, is_active, created_at, updated_at)
SELECT 
    i.id,
    v.id,
    1,
    27.48,
    true,
    NOW(),
    NOW()
FROM items i
CROSS JOIN vendors v
WHERE i.code = 'TS5A3157DBVR-SSR-ENCODER'
  AND v.code = 'SEUTES'
  AND NOT EXISTS (
      SELECT 1 FROM item_vendors WHERE item_id = i.id AND vendor_id = v.id
  )
LIMIT 1;

-- Tactile Switch for IFU four leg → Seutes (Priority 1)
INSERT INTO item_vendors (item_id, vendor_id, priority, unit_price, is_active, created_at, updated_at)
SELECT 
    i.id,
    v.id,
    1,
    11.58,
    true,
    NOW(),
    NOW()
FROM items i
CROSS JOIN vendors v
WHERE i.code = 'TACTILE-SWITCH-FOR'
  AND v.code = 'SEUTES'
  AND NOT EXISTS (
      SELECT 1 FROM item_vendors WHERE item_id = i.id AND vendor_id = v.id
  )
LIMIT 1;

-- LM2596HVS-ADJ Buck only IC → Seutes (Priority 1)
INSERT INTO item_vendors (item_id, vendor_id, priority, unit_price, is_active, created_at, updated_at)
SELECT 
    i.id,
    v.id,
    1,
    628.0,
    true,
    NOW(),
    NOW()
FROM items i
CROSS JOIN vendors v
WHERE i.code = 'LM2596HVSADJ-BUCK-ONLY'
  AND v.code = 'SEUTES'
  AND NOT EXISTS (
      SELECT 1 FROM item_vendors WHERE item_id = i.id AND vendor_id = v.id
  )
LIMIT 1;

-- MP9486AGN-Z 100v Buck converter IC → Seutes (Priority 1)
INSERT INTO item_vendors (item_id, vendor_id, priority, unit_price, is_active, created_at, updated_at)
SELECT 
    i.id,
    v.id,
    1,
    215.71,
    true,
    NOW(),
    NOW()
FROM items i
CROSS JOIN vendors v
WHERE i.code = 'MP9486AGNZ-100V-BUCK'
  AND v.code = 'SEUTES'
  AND NOT EXISTS (
      SELECT 1 FROM item_vendors WHERE item_id = i.id AND vendor_id = v.id
  )
LIMIT 1;

-- 12v Fixed Buck 18-75 In MultiCom Pro → Seutes (Priority 1)
INSERT INTO item_vendors (item_id, vendor_id, priority, unit_price, is_active, created_at, updated_at)
SELECT 
    i.id,
    v.id,
    1,
    2288.0,
    true,
    NOW(),
    NOW()
FROM items i
CROSS JOIN vendors v
WHERE i.code = '12V-FIXED-BUCK'
  AND v.code = 'SEUTES'
  AND NOT EXISTS (
      SELECT 1 FROM item_vendors WHERE item_id = i.id AND vendor_id = v.id
  )
LIMIT 1;

-- 5v Fixed Buck 18-75 In MultiCom Pro → Seutes (Priority 1)
INSERT INTO item_vendors (item_id, vendor_id, priority, unit_price, is_active, created_at, updated_at)
SELECT 
    i.id,
    v.id,
    1,
    2288.0,
    true,
    NOW(),
    NOW()
FROM items i
CROSS JOIN vendors v
WHERE i.code = '5V-FIXED-BUCK'
  AND v.code = 'SEUTES'
  AND NOT EXISTS (
      SELECT 1 FROM item_vendors WHERE item_id = i.id AND vendor_id = v.id
  )
LIMIT 1;

-- 1N4148 SMD → Seutes (Priority 1)
INSERT INTO item_vendors (item_id, vendor_id, priority, unit_price, is_active, created_at, updated_at)
SELECT 
    i.id,
    v.id,
    1,
    0.75,
    true,
    NOW(),
    NOW()
FROM items i
CROSS JOIN vendors v
WHERE i.code = '1N4148-SMD'
  AND v.code = 'SEUTES'
  AND NOT EXISTS (
      SELECT 1 FROM item_vendors WHERE item_id = i.id AND vendor_id = v.id
  )
LIMIT 1;

-- 18pF 0805 capacitor → Seutes (Priority 1)
INSERT INTO item_vendors (item_id, vendor_id, priority, unit_price, is_active, created_at, updated_at)
SELECT 
    i.id,
    v.id,
    1,
    0.7,
    true,
    NOW(),
    NOW()
FROM items i
CROSS JOIN vendors v
WHERE i.code = '18PF-0805-CAPACITOR'
  AND v.code = 'SEUTES'
  AND NOT EXISTS (
      SELECT 1 FROM item_vendors WHERE item_id = i.id AND vendor_id = v.id
  )
LIMIT 1;

-- 10uF 0805 capacitor → Seutes (Priority 1)
INSERT INTO item_vendors (item_id, vendor_id, priority, unit_price, is_active, created_at, updated_at)
SELECT 
    i.id,
    v.id,
    1,
    0,
    true,
    NOW(),
    NOW()
FROM items i
CROSS JOIN vendors v
WHERE i.code = '10UF-0805-CAPACITOR'
  AND v.code = 'SEUTES'
  AND NOT EXISTS (
      SELECT 1 FROM item_vendors WHERE item_id = i.id AND vendor_id = v.id
  )
LIMIT 1;

-- 10uF 10v Tantalum Capacitor Case A → Seutes (Priority 1)
INSERT INTO item_vendors (item_id, vendor_id, priority, unit_price, is_active, created_at, updated_at)
SELECT 
    i.id,
    v.id,
    1,
    4.5,
    true,
    NOW(),
    NOW()
FROM items i
CROSS JOIN vendors v
WHERE i.code = '10UF-10V-TANTALUM'
  AND v.code = 'SEUTES'
  AND NOT EXISTS (
      SELECT 1 FROM item_vendors WHERE item_id = i.id AND vendor_id = v.id
  )
LIMIT 1;

-- 1k 0805 Resistor → Seutes (Priority 1)
INSERT INTO item_vendors (item_id, vendor_id, priority, unit_price, is_active, created_at, updated_at)
SELECT 
    i.id,
    v.id,
    1,
    0.25,
    true,
    NOW(),
    NOW()
FROM items i
CROSS JOIN vendors v
WHERE i.code = '1K-0805-RESISTOR'
  AND v.code = 'SEUTES'
  AND NOT EXISTS (
      SELECT 1 FROM item_vendors WHERE item_id = i.id AND vendor_id = v.id
  )
LIMIT 1;

-- 10k 0805 resistor → Seutes (Priority 1)
INSERT INTO item_vendors (item_id, vendor_id, priority, unit_price, is_active, created_at, updated_at)
SELECT 
    i.id,
    v.id,
    1,
    0.25,
    true,
    NOW(),
    NOW()
FROM items i
CROSS JOIN vendors v
WHERE i.code = '10K-0805-RESISTOR'
  AND v.code = 'SEUTES'
  AND NOT EXISTS (
      SELECT 1 FROM item_vendors WHERE item_id = i.id AND vendor_id = v.id
  )
LIMIT 1;

-- 330E 0805 Resistor → Seutes (Priority 1)
INSERT INTO item_vendors (item_id, vendor_id, priority, unit_price, is_active, created_at, updated_at)
SELECT 
    i.id,
    v.id,
    1,
    0.25,
    true,
    NOW(),
    NOW()
FROM items i
CROSS JOIN vendors v
WHERE i.code = '330E-0805-RESISTOR'
  AND v.code = 'SEUTES'
  AND NOT EXISTS (
      SELECT 1 FROM item_vendors WHERE item_id = i.id AND vendor_id = v.id
  )
LIMIT 1;

-- Murata 12v 4.5A buck → Seutes (Priority 1)
INSERT INTO item_vendors (item_id, vendor_id, priority, unit_price, is_active, created_at, updated_at)
SELECT 
    i.id,
    v.id,
    1,
    2750.0,
    true,
    NOW(),
    NOW()
FROM items i
CROSS JOIN vendors v
WHERE i.code = 'MURATA-12V-45A'
  AND v.code = 'SEUTES'
  AND NOT EXISTS (
      SELECT 1 FROM item_vendors WHERE item_id = i.id AND vendor_id = v.id
  )
LIMIT 1;

-- Murata 5v 10A buck → Seutes (Priority 1)
INSERT INTO item_vendors (item_id, vendor_id, priority, unit_price, is_active, created_at, updated_at)
SELECT 
    i.id,
    v.id,
    1,
    2750.0,
    true,
    NOW(),
    NOW()
FROM items i
CROSS JOIN vendors v
WHERE i.code = 'MURATA-5V-10A'
  AND v.code = 'SEUTES'
  AND NOT EXISTS (
      SELECT 1 FROM item_vendors WHERE item_id = i.id AND vendor_id = v.id
  )
LIMIT 1;

-- Fuse 500mA → Seutes (Priority 1)
INSERT INTO item_vendors (item_id, vendor_id, priority, unit_price, is_active, created_at, updated_at)
SELECT 
    i.id,
    v.id,
    1,
    35.0,
    true,
    NOW(),
    NOW()
FROM items i
CROSS JOIN vendors v
WHERE i.code = 'FUSE-500MA'
  AND v.code = 'SEUTES'
  AND NOT EXISTS (
      SELECT 1 FROM item_vendors WHERE item_id = i.id AND vendor_id = v.id
  )
LIMIT 1;

-- MCP3208 → Seutes (Priority 1)
INSERT INTO item_vendors (item_id, vendor_id, priority, unit_price, is_active, created_at, updated_at)
SELECT 
    i.id,
    v.id,
    1,
    311.0,
    true,
    NOW(),
    NOW()
FROM items i
CROSS JOIN vendors v
WHERE i.code = 'MCP3208'
  AND v.code = 'SEUTES'
  AND NOT EXISTS (
      SELECT 1 FROM item_vendors WHERE item_id = i.id AND vendor_id = v.id
  )
LIMIT 1;

-- 23A 24v Power relay → Seutes (Priority 1)
INSERT INTO item_vendors (item_id, vendor_id, priority, unit_price, is_active, created_at, updated_at)
SELECT 
    i.id,
    v.id,
    1,
    90.0,
    true,
    NOW(),
    NOW()
FROM items i
CROSS JOIN vendors v
WHERE i.code = '23A-24V-POWER'
  AND v.code = 'SEUTES'
  AND NOT EXISTS (
      SELECT 1 FROM item_vendors WHERE item_id = i.id AND vendor_id = v.id
  )
LIMIT 1;

-- LM61 Temperature Sensor → Seutes (Priority 1)
INSERT INTO item_vendors (item_id, vendor_id, priority, unit_price, is_active, created_at, updated_at)
SELECT 
    i.id,
    v.id,
    1,
    104.0,
    true,
    NOW(),
    NOW()
FROM items i
CROSS JOIN vendors v
WHERE i.code = 'LM61-TEMPERATURE-SENSOR'
  AND v.code = 'SEUTES'
  AND NOT EXISTS (
      SELECT 1 FROM item_vendors WHERE item_id = i.id AND vendor_id = v.id
  )
LIMIT 1;

-- 47k 0805 → Seutes (Priority 1)
INSERT INTO item_vendors (item_id, vendor_id, priority, unit_price, is_active, created_at, updated_at)
SELECT 
    i.id,
    v.id,
    1,
    0.25,
    true,
    NOW(),
    NOW()
FROM items i
CROSS JOIN vendors v
WHERE i.code = '47K-0805'
  AND v.code = 'SEUTES'
  AND NOT EXISTS (
      SELECT 1 FROM item_vendors WHERE item_id = i.id AND vendor_id = v.id
  )
LIMIT 1;

-- 470k 0805 PANASONIC/BOURNS/MURATA → Seutes (Priority 1)
INSERT INTO item_vendors (item_id, vendor_id, priority, unit_price, is_active, created_at, updated_at)
SELECT 
    i.id,
    v.id,
    1,
    3.3,
    true,
    NOW(),
    NOW()
FROM items i
CROSS JOIN vendors v
WHERE i.code = '470K-0805-PANASONICBOURNSMURATA'
  AND v.code = 'SEUTES'
  AND NOT EXISTS (
      SELECT 1 FROM item_vendors WHERE item_id = i.id AND vendor_id = v.id
  )
LIMIT 1;

-- 20k 0805 PANASONIC/BOURNS/MURATA → Seutes (Priority 1)
INSERT INTO item_vendors (item_id, vendor_id, priority, unit_price, is_active, created_at, updated_at)
SELECT 
    i.id,
    v.id,
    1,
    3.3,
    true,
    NOW(),
    NOW()
FROM items i
CROSS JOIN vendors v
WHERE i.code = '20K-0805-PANASONICBOURNSMURATA'
  AND v.code = 'SEUTES'
  AND NOT EXISTS (
      SELECT 1 FROM item_vendors WHERE item_id = i.id AND vendor_id = v.id
  )
LIMIT 1;

-- 1uF 0805 PANASONIC → Seutes (Priority 1)
INSERT INTO item_vendors (item_id, vendor_id, priority, unit_price, is_active, created_at, updated_at)
SELECT 
    i.id,
    v.id,
    1,
    5.0,
    true,
    NOW(),
    NOW()
FROM items i
CROSS JOIN vendors v
WHERE i.code = '1UF-0805-PANASONIC'
  AND v.code = 'SEUTES'
  AND NOT EXISTS (
      SELECT 1 FROM item_vendors WHERE item_id = i.id AND vendor_id = v.id
  )
LIMIT 1;

-- 16MHz Crystal Oscillator → Seutes (Priority 1)
INSERT INTO item_vendors (item_id, vendor_id, priority, unit_price, is_active, created_at, updated_at)
SELECT 
    i.id,
    v.id,
    1,
    46.0,
    true,
    NOW(),
    NOW()
FROM items i
CROSS JOIN vendors v
WHERE i.code = '16MHZ-CRYSTAL-OSCILLATOR'
  AND v.code = 'SEUTES'
  AND NOT EXISTS (
      SELECT 1 FROM item_vendors WHERE item_id = i.id AND vendor_id = v.id
  )
LIMIT 1;

-- ULN2004 SMD → Seutes (Priority 1)
INSERT INTO item_vendors (item_id, vendor_id, priority, unit_price, is_active, created_at, updated_at)
SELECT 
    i.id,
    v.id,
    1,
    57.0,
    true,
    NOW(),
    NOW()
FROM items i
CROSS JOIN vendors v
WHERE i.code = 'ULN2004-SMD'
  AND v.code = 'SEUTES'
  AND NOT EXISTS (
      SELECT 1 FROM item_vendors WHERE item_id = i.id AND vendor_id = v.id
  )
LIMIT 1;

-- SSR AQW282SX → Seutes (Priority 1)
INSERT INTO item_vendors (item_id, vendor_id, priority, unit_price, is_active, created_at, updated_at)
SELECT 
    i.id,
    v.id,
    1,
    208.0,
    true,
    NOW(),
    NOW()
FROM items i
CROSS JOIN vendors v
WHERE i.code = 'SSR-AQW282SX'
  AND v.code = 'SEUTES'
  AND NOT EXISTS (
      SELECT 1 FROM item_vendors WHERE item_id = i.id AND vendor_id = v.id
  )
LIMIT 1;

-- Atmega328P Controller → Seutes (Priority 1)
INSERT INTO item_vendors (item_id, vendor_id, priority, unit_price, is_active, created_at, updated_at)
SELECT 
    i.id,
    v.id,
    1,
    319.0,
    true,
    NOW(),
    NOW()
FROM items i
CROSS JOIN vendors v
WHERE i.code = 'ATMEGA328P-CONTROLLER'
  AND v.code = 'SEUTES'
  AND NOT EXISTS (
      SELECT 1 FROM item_vendors WHERE item_id = i.id AND vendor_id = v.id
  )
LIMIT 1;

-- Power Relay 120A 12v Y7 → Seutes (Priority 1)
INSERT INTO item_vendors (item_id, vendor_id, priority, unit_price, is_active, created_at, updated_at)
SELECT 
    i.id,
    v.id,
    1,
    2600.0,
    true,
    NOW(),
    NOW()
FROM items i
CROSS JOIN vendors v
WHERE i.code = 'POWER-RELAY-120A'
  AND v.code = 'SEUTES'
  AND NOT EXISTS (
      SELECT 1 FROM item_vendors WHERE item_id = i.id AND vendor_id = v.id
  )
LIMIT 1;

-- Power Relay 90A 12v Y6 → Seutes (Priority 1)
INSERT INTO item_vendors (item_id, vendor_id, priority, unit_price, is_active, created_at, updated_at)
SELECT 
    i.id,
    v.id,
    1,
    2067.0,
    true,
    NOW(),
    NOW()
FROM items i
CROSS JOIN vendors v
WHERE i.code = 'POWER-RELAY-90A'
  AND v.code = 'SEUTES'
  AND NOT EXISTS (
      SELECT 1 FROM item_vendors WHERE item_id = i.id AND vendor_id = v.id
  )
LIMIT 1;

-- SPST relay 5A-12v ANTI_S & KILL → Roland (Priority 1)
INSERT INTO item_vendors (item_id, vendor_id, priority, unit_price, is_active, created_at, updated_at)
SELECT 
    i.id,
    v.id,
    1,
    90.0,
    true,
    NOW(),
    NOW()
FROM items i
CROSS JOIN vendors v
WHERE i.code = 'SPST-RELAY-5A12V'
  AND v.code = 'ROLAND'
  AND NOT EXISTS (
      SELECT 1 FROM item_vendors WHERE item_id = i.id AND vendor_id = v.id
  )
LIMIT 1;

-- Balancing 1A DPDT 24v Relay → Roland (Priority 1)
INSERT INTO item_vendors (item_id, vendor_id, priority, unit_price, is_active, created_at, updated_at)
SELECT 
    i.id,
    v.id,
    1,
    90.0,
    true,
    NOW(),
    NOW()
FROM items i
CROSS JOIN vendors v
WHERE i.code = 'BALANCING-1A-DPDT'
  AND v.code = 'ROLAND'
  AND NOT EXISTS (
      SELECT 1 FROM item_vendors WHERE item_id = i.id AND vendor_id = v.id
  )
LIMIT 1;

-- Balancing relay 5A/2A 24v SPST → Roland (Priority 1)
INSERT INTO item_vendors (item_id, vendor_id, priority, unit_price, is_active, created_at, updated_at)
SELECT 
    i.id,
    v.id,
    1,
    55.0,
    true,
    NOW(),
    NOW()
FROM items i
CROSS JOIN vendors v
WHERE i.code = 'BALANCING-RELAY-5A2A'
  AND v.code = 'ROLAND'
  AND NOT EXISTS (
      SELECT 1 FROM item_vendors WHERE item_id = i.id AND vendor_id = v.id
  )
LIMIT 1;

-- 5v 2A USB Adapter → Roland (Priority 1)
INSERT INTO item_vendors (item_id, vendor_id, priority, unit_price, is_active, created_at, updated_at)
SELECT 
    i.id,
    v.id,
    1,
    120.0,
    true,
    NOW(),
    NOW()
FROM items i
CROSS JOIN vendors v
WHERE i.code = '5V-2A-USB'
  AND v.code = 'ROLAND'
  AND NOT EXISTS (
      SELECT 1 FROM item_vendors WHERE item_id = i.id AND vendor_id = v.id
  )
LIMIT 1;

-- 5v 3A Power adapter DC Plug Orange → Robu (Priority 1)
INSERT INTO item_vendors (item_id, vendor_id, priority, unit_price, is_active, created_at, updated_at)
SELECT 
    i.id,
    v.id,
    1,
    408.0,
    true,
    NOW(),
    NOW()
FROM items i
CROSS JOIN vendors v
WHERE i.code = '5V-3A-POWER'
  AND v.code = 'ROBU'
  AND NOT EXISTS (
      SELECT 1 FROM item_vendors WHERE item_id = i.id AND vendor_id = v.id
  )
LIMIT 1;

-- 5v 3A Power adapter DC Plug Ordinary → Robu (Priority 1)
INSERT INTO item_vendors (item_id, vendor_id, priority, unit_price, is_active, created_at, updated_at)
SELECT 
    i.id,
    v.id,
    1,
    168.0,
    true,
    NOW(),
    NOW()
FROM items i
CROSS JOIN vendors v
WHERE i.code = '5V-3A-POWER'
  AND v.code = 'ROBU'
  AND NOT EXISTS (
      SELECT 1 FROM item_vendors WHERE item_id = i.id AND vendor_id = v.id
  )
LIMIT 1;

-- 9v 2A Power adapter DC Plug Orange → Robu (Priority 1)
INSERT INTO item_vendors (item_id, vendor_id, priority, unit_price, is_active, created_at, updated_at)
SELECT 
    i.id,
    v.id,
    1,
    368.0,
    true,
    NOW(),
    NOW()
FROM items i
CROSS JOIN vendors v
WHERE i.code = '9V-2A-POWER'
  AND v.code = 'ROBU'
  AND NOT EXISTS (
      SELECT 1 FROM item_vendors WHERE item_id = i.id AND vendor_id = v.id
  )
LIMIT 1;

-- 32Gb SD Card → Roland (Priority 1)
INSERT INTO item_vendors (item_id, vendor_id, priority, unit_price, is_active, created_at, updated_at)
SELECT 
    i.id,
    v.id,
    1,
    300.0,
    true,
    NOW(),
    NOW()
FROM items i
CROSS JOIN vendors v
WHERE i.code = '32GB-SD-CARD'
  AND v.code = 'ROLAND'
  AND NOT EXISTS (
      SELECT 1 FROM item_vendors WHERE item_id = i.id AND vendor_id = v.id
  )
LIMIT 1;

-- 16pin IC base → Roland (Priority 1)
INSERT INTO item_vendors (item_id, vendor_id, priority, unit_price, is_active, created_at, updated_at)
SELECT 
    i.id,
    v.id,
    1,
    2.0,
    true,
    NOW(),
    NOW()
FROM items i
CROSS JOIN vendors v
WHERE i.code = '16PIN-IC-BASE'
  AND v.code = 'ROLAND'
  AND NOT EXISTS (
      SELECT 1 FROM item_vendors WHERE item_id = i.id AND vendor_id = v.id
  )
LIMIT 1;

-- BlueTooth Module → Roland (Priority 1)
INSERT INTO item_vendors (item_id, vendor_id, priority, unit_price, is_active, created_at, updated_at)
SELECT 
    i.id,
    v.id,
    1,
    215.0,
    true,
    NOW(),
    NOW()
FROM items i
CROSS JOIN vendors v
WHERE i.code = 'BLUETOOTH-MODULE'
  AND v.code = 'ROLAND'
  AND NOT EXISTS (
      SELECT 1 FROM item_vendors WHERE item_id = i.id AND vendor_id = v.id
  )
LIMIT 1;

-- 24AWG Soldering Wire → Roland (Priority 1)
INSERT INTO item_vendors (item_id, vendor_id, priority, unit_price, is_active, created_at, updated_at)
SELECT 
    i.id,
    v.id,
    1,
    3.0,
    true,
    NOW(),
    NOW()
FROM items i
CROSS JOIN vendors v
WHERE i.code = '24AWG-SOLDERING-WIRE'
  AND v.code = 'ROLAND'
  AND NOT EXISTS (
      SELECT 1 FROM item_vendors WHERE item_id = i.id AND vendor_id = v.id
  )
LIMIT 1;

-- 12E 2W Resistor THT → Roland (Priority 1)
INSERT INTO item_vendors (item_id, vendor_id, priority, unit_price, is_active, created_at, updated_at)
SELECT 
    i.id,
    v.id,
    1,
    2.0,
    true,
    NOW(),
    NOW()
FROM items i
CROSS JOIN vendors v
WHERE i.code = '12E-2W-RESISTOR'
  AND v.code = 'ROLAND'
  AND NOT EXISTS (
      SELECT 1 FROM item_vendors WHERE item_id = i.id AND vendor_id = v.id
  )
LIMIT 1;

-- iMAx B3 Charger → Robu (Priority 1)
INSERT INTO item_vendors (item_id, vendor_id, priority, unit_price, is_active, created_at, updated_at)
SELECT 
    i.id,
    v.id,
    1,
    220.0,
    true,
    NOW(),
    NOW()
FROM items i
CROSS JOIN vendors v
WHERE i.code = 'IMAX-B3-CHARGER'
  AND v.code = 'ROBU'
  AND NOT EXISTS (
      SELECT 1 FROM item_vendors WHERE item_id = i.id AND vendor_id = v.id
  )
LIMIT 1;

-- 9v Piezo Electric Buzzer → Roland (Priority 1)
INSERT INTO item_vendors (item_id, vendor_id, priority, unit_price, is_active, created_at, updated_at)
SELECT 
    i.id,
    v.id,
    1,
    20.0,
    true,
    NOW(),
    NOW()
FROM items i
CROSS JOIN vendors v
WHERE i.code = '9V-PIEZO-ELECTRIC'
  AND v.code = 'ROLAND'
  AND NOT EXISTS (
      SELECT 1 FROM item_vendors WHERE item_id = i.id AND vendor_id = v.id
  )
LIMIT 1;

-- Female Bergstrip 40x1 2.54mm → Roland (Priority 1)
INSERT INTO item_vendors (item_id, vendor_id, priority, unit_price, is_active, created_at, updated_at)
SELECT 
    i.id,
    v.id,
    1,
    5.0,
    true,
    NOW(),
    NOW()
FROM items i
CROSS JOIN vendors v
WHERE i.code = 'FEMALE-BERGSTRIP-40X1'
  AND v.code = 'ROLAND'
  AND NOT EXISTS (
      SELECT 1 FROM item_vendors WHERE item_id = i.id AND vendor_id = v.id
  )
LIMIT 1;

-- Male Bergstrip 40x1 2.54mm → Roland (Priority 1)
INSERT INTO item_vendors (item_id, vendor_id, priority, unit_price, is_active, created_at, updated_at)
SELECT 
    i.id,
    v.id,
    1,
    5.0,
    true,
    NOW(),
    NOW()
FROM items i
CROSS JOIN vendors v
WHERE i.code = 'MALE-BERGSTRIP-40X1'
  AND v.code = 'ROLAND'
  AND NOT EXISTS (
      SELECT 1 FROM item_vendors WHERE item_id = i.id AND vendor_id = v.id
  )
LIMIT 1;

-- Female Bergstrip 40x1 2.0mm → Roland (Priority 1)
INSERT INTO item_vendors (item_id, vendor_id, priority, unit_price, is_active, created_at, updated_at)
SELECT 
    i.id,
    v.id,
    1,
    20.0,
    true,
    NOW(),
    NOW()
FROM items i
CROSS JOIN vendors v
WHERE i.code = 'FEMALE-BERGSTRIP-40X1'
  AND v.code = 'ROLAND'
  AND NOT EXISTS (
      SELECT 1 FROM item_vendors WHERE item_id = i.id AND vendor_id = v.id
  )
LIMIT 1;

-- Male Bergstrip 40x1 2.0mm → Roland (Priority 1)
INSERT INTO item_vendors (item_id, vendor_id, priority, unit_price, is_active, created_at, updated_at)
SELECT 
    i.id,
    v.id,
    1,
    20.0,
    true,
    NOW(),
    NOW()
FROM items i
CROSS JOIN vendors v
WHERE i.code = 'MALE-BERGSTRIP-40X1'
  AND v.code = 'ROLAND'
  AND NOT EXISTS (
      SELECT 1 FROM item_vendors WHERE item_id = i.id AND vendor_id = v.id
  )
LIMIT 1;

-- Conformal Coating → Roland (Priority 1)
INSERT INTO item_vendors (item_id, vendor_id, priority, unit_price, is_active, created_at, updated_at)
SELECT 
    i.id,
    v.id,
    1,
    1.0,
    true,
    NOW(),
    NOW()
FROM items i
CROSS JOIN vendors v
WHERE i.code = 'CONFORMAL-COATING'
  AND v.code = 'ROLAND'
  AND NOT EXISTS (
      SELECT 1 FROM item_vendors WHERE item_id = i.id AND vendor_id = v.id
  )
LIMIT 1;

-- Soldering flux Small lead → Roland (Priority 1)
INSERT INTO item_vendors (item_id, vendor_id, priority, unit_price, is_active, created_at, updated_at)
SELECT 
    i.id,
    v.id,
    1,
    2.0,
    true,
    NOW(),
    NOW()
FROM items i
CROSS JOIN vendors v
WHERE i.code = 'SOLDERING-FLUX-SMALL'
  AND v.code = 'ROLAND'
  AND NOT EXISTS (
      SELECT 1 FROM item_vendors WHERE item_id = i.id AND vendor_id = v.id
  )
LIMIT 1;

-- 3 pin 3 yrd power cord → Roland (Priority 1)
INSERT INTO item_vendors (item_id, vendor_id, priority, unit_price, is_active, created_at, updated_at)
SELECT 
    i.id,
    v.id,
    1,
    65.0,
    true,
    NOW(),
    NOW()
FROM items i
CROSS JOIN vendors v
WHERE i.code = '3-PIN-3'
  AND v.code = 'ROLAND'
  AND NOT EXISTS (
      SELECT 1 FROM item_vendors WHERE item_id = i.id AND vendor_id = v.id
  )
LIMIT 1;

-- 2 pin JST-XH housing → Canner Connectors (Priority 1)
INSERT INTO item_vendors (item_id, vendor_id, priority, unit_price, is_active, created_at, updated_at)
SELECT 
    i.id,
    v.id,
    1,
    2.0,
    true,
    NOW(),
    NOW()
FROM items i
CROSS JOIN vendors v
WHERE i.code = '2-PIN-JSTXH'
  AND v.code = 'CANNERCONNECTORS'
  AND NOT EXISTS (
      SELECT 1 FROM item_vendors WHERE item_id = i.id AND vendor_id = v.id
  )
LIMIT 1;

-- 3 pin JST-XH housing → Canner Connectors (Priority 1)
INSERT INTO item_vendors (item_id, vendor_id, priority, unit_price, is_active, created_at, updated_at)
SELECT 
    i.id,
    v.id,
    1,
    2.0,
    true,
    NOW(),
    NOW()
FROM items i
CROSS JOIN vendors v
WHERE i.code = '3-PIN-JSTXH'
  AND v.code = 'CANNERCONNECTORS'
  AND NOT EXISTS (
      SELECT 1 FROM item_vendors WHERE item_id = i.id AND vendor_id = v.id
  )
LIMIT 1;

-- 13 pin JST-XH housing → Canner Connectors (Priority 1)
INSERT INTO item_vendors (item_id, vendor_id, priority, unit_price, is_active, created_at, updated_at)
SELECT 
    i.id,
    v.id,
    1,
    10.0,
    true,
    NOW(),
    NOW()
FROM items i
CROSS JOIN vendors v
WHERE i.code = '13-PIN-JSTXH'
  AND v.code = 'CANNERCONNECTORS'
  AND NOT EXISTS (
      SELECT 1 FROM item_vendors WHERE item_id = i.id AND vendor_id = v.id
  )
LIMIT 1;

-- 15 pin JST-XH housing → Canner Connectors (Priority 1)
INSERT INTO item_vendors (item_id, vendor_id, priority, unit_price, is_active, created_at, updated_at)
SELECT 
    i.id,
    v.id,
    1,
    10.0,
    true,
    NOW(),
    NOW()
FROM items i
CROSS JOIN vendors v
WHERE i.code = '15-PIN-JSTXH'
  AND v.code = 'CANNERCONNECTORS'
  AND NOT EXISTS (
      SELECT 1 FROM item_vendors WHERE item_id = i.id AND vendor_id = v.id
  )
LIMIT 1;

-- 2 pin JST-XH male top entry → Canner Connectors (Priority 1)
INSERT INTO item_vendors (item_id, vendor_id, priority, unit_price, is_active, created_at, updated_at)
SELECT 
    i.id,
    v.id,
    1,
    2.0,
    true,
    NOW(),
    NOW()
FROM items i
CROSS JOIN vendors v
WHERE i.code = '2-PIN-JSTXH'
  AND v.code = 'CANNERCONNECTORS'
  AND NOT EXISTS (
      SELECT 1 FROM item_vendors WHERE item_id = i.id AND vendor_id = v.id
  )
LIMIT 1;

-- 2 pin JST-XH male top entry RED → Canner Connectors (Priority 1)
INSERT INTO item_vendors (item_id, vendor_id, priority, unit_price, is_active, created_at, updated_at)
SELECT 
    i.id,
    v.id,
    1,
    2.0,
    true,
    NOW(),
    NOW()
FROM items i
CROSS JOIN vendors v
WHERE i.code = '2-PIN-JSTXH'
  AND v.code = 'CANNERCONNECTORS'
  AND NOT EXISTS (
      SELECT 1 FROM item_vendors WHERE item_id = i.id AND vendor_id = v.id
  )
LIMIT 1;

-- 2 pin JST-XH male side entry → Canner Connectors (Priority 1)
INSERT INTO item_vendors (item_id, vendor_id, priority, unit_price, is_active, created_at, updated_at)
SELECT 
    i.id,
    v.id,
    1,
    2.0,
    true,
    NOW(),
    NOW()
FROM items i
CROSS JOIN vendors v
WHERE i.code = '2-PIN-JSTXH'
  AND v.code = 'CANNERCONNECTORS'
  AND NOT EXISTS (
      SELECT 1 FROM item_vendors WHERE item_id = i.id AND vendor_id = v.id
  )
LIMIT 1;

-- 3 pin JST-XH male top entry → Canner Connectors (Priority 1)
INSERT INTO item_vendors (item_id, vendor_id, priority, unit_price, is_active, created_at, updated_at)
SELECT 
    i.id,
    v.id,
    1,
    2.0,
    true,
    NOW(),
    NOW()
FROM items i
CROSS JOIN vendors v
WHERE i.code = '3-PIN-JSTXH'
  AND v.code = 'CANNERCONNECTORS'
  AND NOT EXISTS (
      SELECT 1 FROM item_vendors WHERE item_id = i.id AND vendor_id = v.id
  )
LIMIT 1;

-- 4 pin JST-XH housing → Canner Connectors (Priority 1)
INSERT INTO item_vendors (item_id, vendor_id, priority, unit_price, is_active, created_at, updated_at)
SELECT 
    i.id,
    v.id,
    1,
    0,
    true,
    NOW(),
    NOW()
FROM items i
CROSS JOIN vendors v
WHERE i.code = '4-PIN-JSTXH'
  AND v.code = 'CANNERCONNECTORS'
  AND NOT EXISTS (
      SELECT 1 FROM item_vendors WHERE item_id = i.id AND vendor_id = v.id
  )
LIMIT 1;

-- 4 pin JST-XH male top entry → Canner Connectors (Priority 1)
INSERT INTO item_vendors (item_id, vendor_id, priority, unit_price, is_active, created_at, updated_at)
SELECT 
    i.id,
    v.id,
    1,
    0,
    true,
    NOW(),
    NOW()
FROM items i
CROSS JOIN vendors v
WHERE i.code = '4-PIN-JSTXH'
  AND v.code = 'CANNERCONNECTORS'
  AND NOT EXISTS (
      SELECT 1 FROM item_vendors WHERE item_id = i.id AND vendor_id = v.id
  )
LIMIT 1;

-- 4 pin JST-XH male side entry → Canner Connectors (Priority 1)
INSERT INTO item_vendors (item_id, vendor_id, priority, unit_price, is_active, created_at, updated_at)
SELECT 
    i.id,
    v.id,
    1,
    3.0,
    true,
    NOW(),
    NOW()
FROM items i
CROSS JOIN vendors v
WHERE i.code = '4-PIN-JSTXH'
  AND v.code = 'CANNERCONNECTORS'
  AND NOT EXISTS (
      SELECT 1 FROM item_vendors WHERE item_id = i.id AND vendor_id = v.id
  )
LIMIT 1;

-- 5 pin JST-XH housing → Canner Connectors (Priority 1)
INSERT INTO item_vendors (item_id, vendor_id, priority, unit_price, is_active, created_at, updated_at)
SELECT 
    i.id,
    v.id,
    1,
    0,
    true,
    NOW(),
    NOW()
FROM items i
CROSS JOIN vendors v
WHERE i.code = '5-PIN-JSTXH'
  AND v.code = 'CANNERCONNECTORS'
  AND NOT EXISTS (
      SELECT 1 FROM item_vendors WHERE item_id = i.id AND vendor_id = v.id
  )
LIMIT 1;

-- 5 pin JST-XH male top entry → Canner Connectors (Priority 1)
INSERT INTO item_vendors (item_id, vendor_id, priority, unit_price, is_active, created_at, updated_at)
SELECT 
    i.id,
    v.id,
    1,
    0,
    true,
    NOW(),
    NOW()
FROM items i
CROSS JOIN vendors v
WHERE i.code = '5-PIN-JSTXH'
  AND v.code = 'CANNERCONNECTORS'
  AND NOT EXISTS (
      SELECT 1 FROM item_vendors WHERE item_id = i.id AND vendor_id = v.id
  )
LIMIT 1;

-- 6 pin JST-XH housing → Canner Connectors (Priority 1)
INSERT INTO item_vendors (item_id, vendor_id, priority, unit_price, is_active, created_at, updated_at)
SELECT 
    i.id,
    v.id,
    1,
    0,
    true,
    NOW(),
    NOW()
FROM items i
CROSS JOIN vendors v
WHERE i.code = '6-PIN-JSTXH'
  AND v.code = 'CANNERCONNECTORS'
  AND NOT EXISTS (
      SELECT 1 FROM item_vendors WHERE item_id = i.id AND vendor_id = v.id
  )
LIMIT 1;

-- 6 pin JST-XH male top entry → Canner Connectors (Priority 1)
INSERT INTO item_vendors (item_id, vendor_id, priority, unit_price, is_active, created_at, updated_at)
SELECT 
    i.id,
    v.id,
    1,
    0,
    true,
    NOW(),
    NOW()
FROM items i
CROSS JOIN vendors v
WHERE i.code = '6-PIN-JSTXH'
  AND v.code = 'CANNERCONNECTORS'
  AND NOT EXISTS (
      SELECT 1 FROM item_vendors WHERE item_id = i.id AND vendor_id = v.id
  )
LIMIT 1;

-- 2510 Crimping pins → Canner Connectors (Priority 1)
INSERT INTO item_vendors (item_id, vendor_id, priority, unit_price, is_active, created_at, updated_at)
SELECT 
    i.id,
    v.id,
    1,
    0.5,
    true,
    NOW(),
    NOW()
FROM items i
CROSS JOIN vendors v
WHERE i.code = '2510-CRIMPING-PINS'
  AND v.code = 'CANNERCONNECTORS'
  AND NOT EXISTS (
      SELECT 1 FROM item_vendors WHERE item_id = i.id AND vendor_id = v.id
  )
LIMIT 1;

-- 13 pin JST-XH male top entry → Canner Connectors (Priority 1)
INSERT INTO item_vendors (item_id, vendor_id, priority, unit_price, is_active, created_at, updated_at)
SELECT 
    i.id,
    v.id,
    1,
    10.0,
    true,
    NOW(),
    NOW()
FROM items i
CROSS JOIN vendors v
WHERE i.code = '13-PIN-JSTXH'
  AND v.code = 'CANNERCONNECTORS'
  AND NOT EXISTS (
      SELECT 1 FROM item_vendors WHERE item_id = i.id AND vendor_id = v.id
  )
LIMIT 1;

-- 15 pin JST-XH male top entry → Canner Connectors (Priority 1)
INSERT INTO item_vendors (item_id, vendor_id, priority, unit_price, is_active, created_at, updated_at)
SELECT 
    i.id,
    v.id,
    1,
    10.0,
    true,
    NOW(),
    NOW()
FROM items i
CROSS JOIN vendors v
WHERE i.code = '15-PIN-JSTXH'
  AND v.code = 'CANNERCONNECTORS'
  AND NOT EXISTS (
      SELECT 1 FROM item_vendors WHERE item_id = i.id AND vendor_id = v.id
  )
LIMIT 1;

-- JST-XH Crimping pins → Canner Connectors (Priority 1)
INSERT INTO item_vendors (item_id, vendor_id, priority, unit_price, is_active, created_at, updated_at)
SELECT 
    i.id,
    v.id,
    1,
    1.0,
    true,
    NOW(),
    NOW()
FROM items i
CROSS JOIN vendors v
WHERE i.code = 'JSTXH-CRIMPING-PINS'
  AND v.code = 'CANNERCONNECTORS'
  AND NOT EXISTS (
      SELECT 1 FROM item_vendors WHERE item_id = i.id AND vendor_id = v.id
  )
LIMIT 1;

-- JST-XH Crimping pins Gold Finger → Canner Connectors (Priority 1)
INSERT INTO item_vendors (item_id, vendor_id, priority, unit_price, is_active, created_at, updated_at)
SELECT 
    i.id,
    v.id,
    1,
    0,
    true,
    NOW(),
    NOW()
FROM items i
CROSS JOIN vendors v
WHERE i.code = 'JSTXH-CRIMPING-PINS'
  AND v.code = 'CANNERCONNECTORS'
  AND NOT EXISTS (
      SELECT 1 FROM item_vendors WHERE item_id = i.id AND vendor_id = v.id
  )
LIMIT 1;

-- 25cm Red one side crimped wire → Canner Connectors (Priority 1)
INSERT INTO item_vendors (item_id, vendor_id, priority, unit_price, is_active, created_at, updated_at)
SELECT 
    i.id,
    v.id,
    1,
    3.0,
    true,
    NOW(),
    NOW()
FROM items i
CROSS JOIN vendors v
WHERE i.code = '25CM-RED-ONE'
  AND v.code = 'CANNERCONNECTORS'
  AND NOT EXISTS (
      SELECT 1 FROM item_vendors WHERE item_id = i.id AND vendor_id = v.id
  )
LIMIT 1;

-- 25cm Green one side crimped wire → Canner Connectors (Priority 1)
INSERT INTO item_vendors (item_id, vendor_id, priority, unit_price, is_active, created_at, updated_at)
SELECT 
    i.id,
    v.id,
    1,
    3.0,
    true,
    NOW(),
    NOW()
FROM items i
CROSS JOIN vendors v
WHERE i.code = '25CM-GREEN-ONE'
  AND v.code = 'CANNERCONNECTORS'
  AND NOT EXISTS (
      SELECT 1 FROM item_vendors WHERE item_id = i.id AND vendor_id = v.id
  )
LIMIT 1;

-- 25cm Black one side crimped wire → Canner Connectors (Priority 1)
INSERT INTO item_vendors (item_id, vendor_id, priority, unit_price, is_active, created_at, updated_at)
SELECT 
    i.id,
    v.id,
    1,
    3.0,
    true,
    NOW(),
    NOW()
FROM items i
CROSS JOIN vendors v
WHERE i.code = '25CM-BLACK-ONE'
  AND v.code = 'CANNERCONNECTORS'
  AND NOT EXISTS (
      SELECT 1 FROM item_vendors WHERE item_id = i.id AND vendor_id = v.id
  )
LIMIT 1;

-- 10cm one sided JST crimped Black → Canner Connectors (Priority 1)
INSERT INTO item_vendors (item_id, vendor_id, priority, unit_price, is_active, created_at, updated_at)
SELECT 
    i.id,
    v.id,
    1,
    2.5,
    true,
    NOW(),
    NOW()
FROM items i
CROSS JOIN vendors v
WHERE i.code = '10CM-ONE-SIDED'
  AND v.code = 'CANNERCONNECTORS'
  AND NOT EXISTS (
      SELECT 1 FROM item_vendors WHERE item_id = i.id AND vendor_id = v.id
  )
LIMIT 1;

-- 10cm one sided JST crimped Green → Canner Connectors (Priority 1)
INSERT INTO item_vendors (item_id, vendor_id, priority, unit_price, is_active, created_at, updated_at)
SELECT 
    i.id,
    v.id,
    1,
    2.5,
    true,
    NOW(),
    NOW()
FROM items i
CROSS JOIN vendors v
WHERE i.code = '10CM-ONE-SIDED'
  AND v.code = 'CANNERCONNECTORS'
  AND NOT EXISTS (
      SELECT 1 FROM item_vendors WHERE item_id = i.id AND vendor_id = v.id
  )
LIMIT 1;

-- 10cm one sided JST crimped Voilet → Canner Connectors (Priority 1)
INSERT INTO item_vendors (item_id, vendor_id, priority, unit_price, is_active, created_at, updated_at)
SELECT 
    i.id,
    v.id,
    1,
    2.5,
    true,
    NOW(),
    NOW()
FROM items i
CROSS JOIN vendors v
WHERE i.code = '10CM-ONE-SIDED'
  AND v.code = 'CANNERCONNECTORS'
  AND NOT EXISTS (
      SELECT 1 FROM item_vendors WHERE item_id = i.id AND vendor_id = v.id
  )
LIMIT 1;

-- 10cm one sided JST crimped Yellow → Canner Connectors (Priority 1)
INSERT INTO item_vendors (item_id, vendor_id, priority, unit_price, is_active, created_at, updated_at)
SELECT 
    i.id,
    v.id,
    1,
    2.5,
    true,
    NOW(),
    NOW()
FROM items i
CROSS JOIN vendors v
WHERE i.code = '10CM-ONE-SIDED'
  AND v.code = 'CANNERCONNECTORS'
  AND NOT EXISTS (
      SELECT 1 FROM item_vendors WHERE item_id = i.id AND vendor_id = v.id
  )
LIMIT 1;

-- 10cm one sided JST crimped Sky Blue → Canner Connectors (Priority 1)
INSERT INTO item_vendors (item_id, vendor_id, priority, unit_price, is_active, created_at, updated_at)
SELECT 
    i.id,
    v.id,
    1,
    2.5,
    true,
    NOW(),
    NOW()
FROM items i
CROSS JOIN vendors v
WHERE i.code = '10CM-ONE-SIDED'
  AND v.code = 'CANNERCONNECTORS'
  AND NOT EXISTS (
      SELECT 1 FROM item_vendors WHERE item_id = i.id AND vendor_id = v.id
  )
LIMIT 1;

-- 10cm one sided JST crimped Pink → Canner Connectors (Priority 1)
INSERT INTO item_vendors (item_id, vendor_id, priority, unit_price, is_active, created_at, updated_at)
SELECT 
    i.id,
    v.id,
    1,
    2.5,
    true,
    NOW(),
    NOW()
FROM items i
CROSS JOIN vendors v
WHERE i.code = '10CM-ONE-SIDED'
  AND v.code = 'CANNERCONNECTORS'
  AND NOT EXISTS (
      SELECT 1 FROM item_vendors WHERE item_id = i.id AND vendor_id = v.id
  )
LIMIT 1;

-- 10cm one sided JST crimped Orange → Canner Connectors (Priority 1)
INSERT INTO item_vendors (item_id, vendor_id, priority, unit_price, is_active, created_at, updated_at)
SELECT 
    i.id,
    v.id,
    1,
    2.5,
    true,
    NOW(),
    NOW()
FROM items i
CROSS JOIN vendors v
WHERE i.code = '10CM-ONE-SIDED'
  AND v.code = 'CANNERCONNECTORS'
  AND NOT EXISTS (
      SELECT 1 FROM item_vendors WHERE item_id = i.id AND vendor_id = v.id
  )
LIMIT 1;

-- 10cm one sided JST crimped Dark Blue → Canner Connectors (Priority 1)
INSERT INTO item_vendors (item_id, vendor_id, priority, unit_price, is_active, created_at, updated_at)
SELECT 
    i.id,
    v.id,
    1,
    2.5,
    true,
    NOW(),
    NOW()
FROM items i
CROSS JOIN vendors v
WHERE i.code = '10CM-ONE-SIDED'
  AND v.code = 'CANNERCONNECTORS'
  AND NOT EXISTS (
      SELECT 1 FROM item_vendors WHERE item_id = i.id AND vendor_id = v.id
  )
LIMIT 1;

-- 10cm one sided JST crimped Light Brown → Canner Connectors (Priority 1)
INSERT INTO item_vendors (item_id, vendor_id, priority, unit_price, is_active, created_at, updated_at)
SELECT 
    i.id,
    v.id,
    1,
    2.5,
    true,
    NOW(),
    NOW()
FROM items i
CROSS JOIN vendors v
WHERE i.code = '10CM-ONE-SIDED'
  AND v.code = 'CANNERCONNECTORS'
  AND NOT EXISTS (
      SELECT 1 FROM item_vendors WHERE item_id = i.id AND vendor_id = v.id
  )
LIMIT 1;

-- 10cm one sided JST crimped Dark Brown → Canner Connectors (Priority 1)
INSERT INTO item_vendors (item_id, vendor_id, priority, unit_price, is_active, created_at, updated_at)
SELECT 
    i.id,
    v.id,
    1,
    2.5,
    true,
    NOW(),
    NOW()
FROM items i
CROSS JOIN vendors v
WHERE i.code = '10CM-ONE-SIDED'
  AND v.code = 'CANNERCONNECTORS'
  AND NOT EXISTS (
      SELECT 1 FROM item_vendors WHERE item_id = i.id AND vendor_id = v.id
  )
LIMIT 1;

-- 10cm one sided JST crimped White with Red strip → Canner Connectors (Priority 1)
INSERT INTO item_vendors (item_id, vendor_id, priority, unit_price, is_active, created_at, updated_at)
SELECT 
    i.id,
    v.id,
    1,
    2.5,
    true,
    NOW(),
    NOW()
FROM items i
CROSS JOIN vendors v
WHERE i.code = '10CM-ONE-SIDED'
  AND v.code = 'CANNERCONNECTORS'
  AND NOT EXISTS (
      SELECT 1 FROM item_vendors WHERE item_id = i.id AND vendor_id = v.id
  )
LIMIT 1;

-- 10cm one sided JST crimped White with black strip → Canner Connectors (Priority 1)
INSERT INTO item_vendors (item_id, vendor_id, priority, unit_price, is_active, created_at, updated_at)
SELECT 
    i.id,
    v.id,
    1,
    2.5,
    true,
    NOW(),
    NOW()
FROM items i
CROSS JOIN vendors v
WHERE i.code = '10CM-ONE-SIDED'
  AND v.code = 'CANNERCONNECTORS'
  AND NOT EXISTS (
      SELECT 1 FROM item_vendors WHERE item_id = i.id AND vendor_id = v.id
  )
LIMIT 1;

-- 10cm one sided JST crimped White → Canner Connectors (Priority 1)
INSERT INTO item_vendors (item_id, vendor_id, priority, unit_price, is_active, created_at, updated_at)
SELECT 
    i.id,
    v.id,
    1,
    2.5,
    true,
    NOW(),
    NOW()
FROM items i
CROSS JOIN vendors v
WHERE i.code = '10CM-ONE-SIDED'
  AND v.code = 'CANNERCONNECTORS'
  AND NOT EXISTS (
      SELECT 1 FROM item_vendors WHERE item_id = i.id AND vendor_id = v.id
  )
LIMIT 1;

-- 10cm one sided JST crimped Red → Canner Connectors (Priority 1)
INSERT INTO item_vendors (item_id, vendor_id, priority, unit_price, is_active, created_at, updated_at)
SELECT 
    i.id,
    v.id,
    1,
    2.5,
    true,
    NOW(),
    NOW()
FROM items i
CROSS JOIN vendors v
WHERE i.code = '10CM-ONE-SIDED'
  AND v.code = 'CANNERCONNECTORS'
  AND NOT EXISTS (
      SELECT 1 FROM item_vendors WHERE item_id = i.id AND vendor_id = v.id
  )
LIMIT 1;

-- 10cm one sided JST crimped Light Grey → Canner Connectors (Priority 1)
INSERT INTO item_vendors (item_id, vendor_id, priority, unit_price, is_active, created_at, updated_at)
SELECT 
    i.id,
    v.id,
    1,
    2.5,
    true,
    NOW(),
    NOW()
FROM items i
CROSS JOIN vendors v
WHERE i.code = '10CM-ONE-SIDED'
  AND v.code = 'CANNERCONNECTORS'
  AND NOT EXISTS (
      SELECT 1 FROM item_vendors WHERE item_id = i.id AND vendor_id = v.id
  )
LIMIT 1;

-- 10cm one sided JST crimped Cyan → Canner Connectors (Priority 1)
INSERT INTO item_vendors (item_id, vendor_id, priority, unit_price, is_active, created_at, updated_at)
SELECT 
    i.id,
    v.id,
    1,
    2.5,
    true,
    NOW(),
    NOW()
FROM items i
CROSS JOIN vendors v
WHERE i.code = '10CM-ONE-SIDED'
  AND v.code = 'CANNERCONNECTORS'
  AND NOT EXISTS (
      SELECT 1 FROM item_vendors WHERE item_id = i.id AND vendor_id = v.id
  )
LIMIT 1;

-- 10cm one sided JST crimped Dark Parrot Green → Canner Connectors (Priority 1)
INSERT INTO item_vendors (item_id, vendor_id, priority, unit_price, is_active, created_at, updated_at)
SELECT 
    i.id,
    v.id,
    1,
    2.5,
    true,
    NOW(),
    NOW()
FROM items i
CROSS JOIN vendors v
WHERE i.code = '10CM-ONE-SIDED'
  AND v.code = 'CANNERCONNECTORS'
  AND NOT EXISTS (
      SELECT 1 FROM item_vendors WHERE item_id = i.id AND vendor_id = v.id
  )
LIMIT 1;

-- 25cm Black Microfit one side crimped wires → Canner Connectors (Priority 1)
INSERT INTO item_vendors (item_id, vendor_id, priority, unit_price, is_active, created_at, updated_at)
SELECT 
    i.id,
    v.id,
    1,
    6.0,
    true,
    NOW(),
    NOW()
FROM items i
CROSS JOIN vendors v
WHERE i.code = '25CM-BLACK-MICROFIT'
  AND v.code = 'CANNERCONNECTORS'
  AND NOT EXISTS (
      SELECT 1 FROM item_vendors WHERE item_id = i.id AND vendor_id = v.id
  )
LIMIT 1;

-- 25cm Green Microfit one side crimped wires → Canner Connectors (Priority 1)
INSERT INTO item_vendors (item_id, vendor_id, priority, unit_price, is_active, created_at, updated_at)
SELECT 
    i.id,
    v.id,
    1,
    6.0,
    true,
    NOW(),
    NOW()
FROM items i
CROSS JOIN vendors v
WHERE i.code = '25CM-GREEN-MICROFIT'
  AND v.code = 'CANNERCONNECTORS'
  AND NOT EXISTS (
      SELECT 1 FROM item_vendors WHERE item_id = i.id AND vendor_id = v.id
  )
LIMIT 1;

-- 25cm Violet Microfit one side crimped wires → Canner Connectors (Priority 1)
INSERT INTO item_vendors (item_id, vendor_id, priority, unit_price, is_active, created_at, updated_at)
SELECT 
    i.id,
    v.id,
    1,
    6.0,
    true,
    NOW(),
    NOW()
FROM items i
CROSS JOIN vendors v
WHERE i.code = '25CM-VIOLET-MICROFIT'
  AND v.code = 'CANNERCONNECTORS'
  AND NOT EXISTS (
      SELECT 1 FROM item_vendors WHERE item_id = i.id AND vendor_id = v.id
  )
LIMIT 1;

-- 25cm Yellow Microfit one side crimped wires → Canner Connectors (Priority 1)
INSERT INTO item_vendors (item_id, vendor_id, priority, unit_price, is_active, created_at, updated_at)
SELECT 
    i.id,
    v.id,
    1,
    6.0,
    true,
    NOW(),
    NOW()
FROM items i
CROSS JOIN vendors v
WHERE i.code = '25CM-YELLOW-MICROFIT'
  AND v.code = 'CANNERCONNECTORS'
  AND NOT EXISTS (
      SELECT 1 FROM item_vendors WHERE item_id = i.id AND vendor_id = v.id
  )
LIMIT 1;

-- 25cm Sky  Blue Microfit one side crimped wires → Canner Connectors (Priority 1)
INSERT INTO item_vendors (item_id, vendor_id, priority, unit_price, is_active, created_at, updated_at)
SELECT 
    i.id,
    v.id,
    1,
    6.0,
    true,
    NOW(),
    NOW()
FROM items i
CROSS JOIN vendors v
WHERE i.code = '25CM-SKY-BLUE'
  AND v.code = 'CANNERCONNECTORS'
  AND NOT EXISTS (
      SELECT 1 FROM item_vendors WHERE item_id = i.id AND vendor_id = v.id
  )
LIMIT 1;

-- 25cm Pink Microfit one side crimped wires → Canner Connectors (Priority 1)
INSERT INTO item_vendors (item_id, vendor_id, priority, unit_price, is_active, created_at, updated_at)
SELECT 
    i.id,
    v.id,
    1,
    6.0,
    true,
    NOW(),
    NOW()
FROM items i
CROSS JOIN vendors v
WHERE i.code = '25CM-PINK-MICROFIT'
  AND v.code = 'CANNERCONNECTORS'
  AND NOT EXISTS (
      SELECT 1 FROM item_vendors WHERE item_id = i.id AND vendor_id = v.id
  )
LIMIT 1;

-- 25cm L.Brown Microfit one side crimped wires → Canner Connectors (Priority 1)
INSERT INTO item_vendors (item_id, vendor_id, priority, unit_price, is_active, created_at, updated_at)
SELECT 
    i.id,
    v.id,
    1,
    6.0,
    true,
    NOW(),
    NOW()
FROM items i
CROSS JOIN vendors v
WHERE i.code = '25CM-LBROWN-MICROFIT'
  AND v.code = 'CANNERCONNECTORS'
  AND NOT EXISTS (
      SELECT 1 FROM item_vendors WHERE item_id = i.id AND vendor_id = v.id
  )
LIMIT 1;

-- 25cm D.Brown Microfit one side crimped wires → Canner Connectors (Priority 1)
INSERT INTO item_vendors (item_id, vendor_id, priority, unit_price, is_active, created_at, updated_at)
SELECT 
    i.id,
    v.id,
    1,
    6.0,
    true,
    NOW(),
    NOW()
FROM items i
CROSS JOIN vendors v
WHERE i.code = '25CM-DBROWN-MICROFIT'
  AND v.code = 'CANNERCONNECTORS'
  AND NOT EXISTS (
      SELECT 1 FROM item_vendors WHERE item_id = i.id AND vendor_id = v.id
  )
LIMIT 1;

-- 25cm White Microfit one side crimped wires → Canner Connectors (Priority 1)
INSERT INTO item_vendors (item_id, vendor_id, priority, unit_price, is_active, created_at, updated_at)
SELECT 
    i.id,
    v.id,
    1,
    6.0,
    true,
    NOW(),
    NOW()
FROM items i
CROSS JOIN vendors v
WHERE i.code = '25CM-WHITE-MICROFIT'
  AND v.code = 'CANNERCONNECTORS'
  AND NOT EXISTS (
      SELECT 1 FROM item_vendors WHERE item_id = i.id AND vendor_id = v.id
  )
LIMIT 1;

-- 25cm White-Red Microfit one side crimped wires (Not Using) → Canner Connectors (Priority 1)
INSERT INTO item_vendors (item_id, vendor_id, priority, unit_price, is_active, created_at, updated_at)
SELECT 
    i.id,
    v.id,
    1,
    6.0,
    true,
    NOW(),
    NOW()
FROM items i
CROSS JOIN vendors v
WHERE i.code = '25CM-WHITERED-MICROFIT'
  AND v.code = 'CANNERCONNECTORS'
  AND NOT EXISTS (
      SELECT 1 FROM item_vendors WHERE item_id = i.id AND vendor_id = v.id
  )
LIMIT 1;

-- 25cm Red Microfit one side crimped wires → Canner Connectors (Priority 1)
INSERT INTO item_vendors (item_id, vendor_id, priority, unit_price, is_active, created_at, updated_at)
SELECT 
    i.id,
    v.id,
    1,
    6.0,
    true,
    NOW(),
    NOW()
FROM items i
CROSS JOIN vendors v
WHERE i.code = '25CM-RED-MICROFIT'
  AND v.code = 'CANNERCONNECTORS'
  AND NOT EXISTS (
      SELECT 1 FROM item_vendors WHERE item_id = i.id AND vendor_id = v.id
  )
LIMIT 1;

-- 25cm Dark Blue Microfit one side crimped wires → Canner Connectors (Priority 1)
INSERT INTO item_vendors (item_id, vendor_id, priority, unit_price, is_active, created_at, updated_at)
SELECT 
    i.id,
    v.id,
    1,
    6.0,
    true,
    NOW(),
    NOW()
FROM items i
CROSS JOIN vendors v
WHERE i.code = '25CM-DARK-BLUE'
  AND v.code = 'CANNERCONNECTORS'
  AND NOT EXISTS (
      SELECT 1 FROM item_vendors WHERE item_id = i.id AND vendor_id = v.id
  )
LIMIT 1;

-- 25cm Orange Microfit one side crimped wires → Canner Connectors (Priority 1)
INSERT INTO item_vendors (item_id, vendor_id, priority, unit_price, is_active, created_at, updated_at)
SELECT 
    i.id,
    v.id,
    1,
    6.0,
    true,
    NOW(),
    NOW()
FROM items i
CROSS JOIN vendors v
WHERE i.code = '25CM-ORANGE-MICROFIT'
  AND v.code = 'CANNERCONNECTORS'
  AND NOT EXISTS (
      SELECT 1 FROM item_vendors WHERE item_id = i.id AND vendor_id = v.id
  )
LIMIT 1;

-- 18pin Microfit housing → Canner Connectors (Priority 1)
INSERT INTO item_vendors (item_id, vendor_id, priority, unit_price, is_active, created_at, updated_at)
SELECT 
    i.id,
    v.id,
    1,
    10.0,
    true,
    NOW(),
    NOW()
FROM items i
CROSS JOIN vendors v
WHERE i.code = '18PIN-MICROFIT-HOUSING'
  AND v.code = 'CANNERCONNECTORS'
  AND NOT EXISTS (
      SELECT 1 FROM item_vendors WHERE item_id = i.id AND vendor_id = v.id
  )
LIMIT 1;

-- Tactile switch for reset two leg → Donor RC (Priority 1)
INSERT INTO item_vendors (item_id, vendor_id, priority, unit_price, is_active, created_at, updated_at)
SELECT 
    i.id,
    v.id,
    1,
    36.0,
    true,
    NOW(),
    NOW()
FROM items i
CROSS JOIN vendors v
WHERE i.code = 'TACTILE-SWITCH-FOR'
  AND v.code = 'DONORRC'
  AND NOT EXISTS (
      SELECT 1 FROM item_vendors WHERE item_id = i.id AND vendor_id = v.id
  )
LIMIT 1;

-- 915MHz Antenna → Synergy (Priority 1)
INSERT INTO item_vendors (item_id, vendor_id, priority, unit_price, is_active, created_at, updated_at)
SELECT 
    i.id,
    v.id,
    1,
    165.0,
    true,
    NOW(),
    NOW()
FROM items i
CROSS JOIN vendors v
WHERE i.code = '915MHZ-ANTENNA'
  AND v.code = 'SYNERGY'
  AND NOT EXISTS (
      SELECT 1 FROM item_vendors WHERE item_id = i.id AND vendor_id = v.id
  )
LIMIT 1;

-- Ipex4 to SMA converter extension (1675015) (Antenna pigtail connectror) → Robu (Priority 1)
INSERT INTO item_vendors (item_id, vendor_id, priority, unit_price, is_active, created_at, updated_at)
SELECT 
    i.id,
    v.id,
    1,
    84.0,
    true,
    NOW(),
    NOW()
FROM items i
CROSS JOIN vendors v
WHERE i.code = 'IPEX4-TO-SMA'
  AND v.code = 'ROBU'
  AND NOT EXISTS (
      SELECT 1 FROM item_vendors WHERE item_id = i.id AND vendor_id = v.id
  )
LIMIT 1;

-- Ipex4 to SMA converter extension (for R9MM ipex4) → Synergy (Priority 1)
INSERT INTO item_vendors (item_id, vendor_id, priority, unit_price, is_active, created_at, updated_at)
SELECT 
    i.id,
    v.id,
    1,
    45.0,
    true,
    NOW(),
    NOW()
FROM items i
CROSS JOIN vendors v
WHERE i.code = 'IPEX4-TO-SMA'
  AND v.code = 'SYNERGY'
  AND NOT EXISTS (
      SELECT 1 FROM item_vendors WHERE item_id = i.id AND vendor_id = v.id
  )
LIMIT 1;

-- R9M Antenna Extension wire RP-SMA to Open → Synergy (Priority 1)
INSERT INTO item_vendors (item_id, vendor_id, priority, unit_price, is_active, created_at, updated_at)
SELECT 
    i.id,
    v.id,
    1,
    45.0,
    true,
    NOW(),
    NOW()
FROM items i
CROSS JOIN vendors v
WHERE i.code = 'R9M-ANTENNA-EXTENSION'
  AND v.code = 'SYNERGY'
  AND NOT EXISTS (
      SELECT 1 FROM item_vendors WHERE item_id = i.id AND vendor_id = v.id
  )
LIMIT 1;

-- RP-SMA Female inline connector for RG174 → Synergy (Priority 1)
INSERT INTO item_vendors (item_id, vendor_id, priority, unit_price, is_active, created_at, updated_at)
SELECT 
    i.id,
    v.id,
    1,
    0,
    true,
    NOW(),
    NOW()
FROM items i
CROSS JOIN vendors v
WHERE i.code = 'RPSMA-FEMALE-INLINE'
  AND v.code = 'SYNERGY'
  AND NOT EXISTS (
      SELECT 1 FROM item_vendors WHERE item_id = i.id AND vendor_id = v.id
  )
LIMIT 1;

-- RP-SMA Male inline connector for RG174 → Synergy (Priority 1)
INSERT INTO item_vendors (item_id, vendor_id, priority, unit_price, is_active, created_at, updated_at)
SELECT 
    i.id,
    v.id,
    1,
    0,
    true,
    NOW(),
    NOW()
FROM items i
CROSS JOIN vendors v
WHERE i.code = 'RPSMA-MALE-INLINE'
  AND v.code = 'SYNERGY'
  AND NOT EXISTS (
      SELECT 1 FROM item_vendors WHERE item_id = i.id AND vendor_id = v.id
  )
LIMIT 1;

-- RP-SMA Female inline connector for RG142 → Synergy (Priority 1)
INSERT INTO item_vendors (item_id, vendor_id, priority, unit_price, is_active, created_at, updated_at)
SELECT 
    i.id,
    v.id,
    1,
    0,
    true,
    NOW(),
    NOW()
FROM items i
CROSS JOIN vendors v
WHERE i.code = 'RPSMA-FEMALE-INLINE'
  AND v.code = 'SYNERGY'
  AND NOT EXISTS (
      SELECT 1 FROM item_vendors WHERE item_id = i.id AND vendor_id = v.id
  )
LIMIT 1;

-- RP-SMA Male inline connector for RG142 → Synergy (Priority 1)
INSERT INTO item_vendors (item_id, vendor_id, priority, unit_price, is_active, created_at, updated_at)
SELECT 
    i.id,
    v.id,
    1,
    0,
    true,
    NOW(),
    NOW()
FROM items i
CROSS JOIN vendors v
WHERE i.code = 'RPSMA-MALE-INLINE'
  AND v.code = 'SYNERGY'
  AND NOT EXISTS (
      SELECT 1 FROM item_vendors WHERE item_id = i.id AND vendor_id = v.id
  )
LIMIT 1;

-- SMA Female inline connector for RG174 → Synergy (Priority 1)
INSERT INTO item_vendors (item_id, vendor_id, priority, unit_price, is_active, created_at, updated_at)
SELECT 
    i.id,
    v.id,
    1,
    0,
    true,
    NOW(),
    NOW()
FROM items i
CROSS JOIN vendors v
WHERE i.code = 'SMA-FEMALE-INLINE'
  AND v.code = 'SYNERGY'
  AND NOT EXISTS (
      SELECT 1 FROM item_vendors WHERE item_id = i.id AND vendor_id = v.id
  )
LIMIT 1;

-- SMA Male inline connector for RG174 → Synergy (Priority 1)
INSERT INTO item_vendors (item_id, vendor_id, priority, unit_price, is_active, created_at, updated_at)
SELECT 
    i.id,
    v.id,
    1,
    0,
    true,
    NOW(),
    NOW()
FROM items i
CROSS JOIN vendors v
WHERE i.code = 'SMA-MALE-INLINE'
  AND v.code = 'SYNERGY'
  AND NOT EXISTS (
      SELECT 1 FROM item_vendors WHERE item_id = i.id AND vendor_id = v.id
  )
LIMIT 1;

-- SMA Female inline connector for RG142 → Synergy (Priority 1)
INSERT INTO item_vendors (item_id, vendor_id, priority, unit_price, is_active, created_at, updated_at)
SELECT 
    i.id,
    v.id,
    1,
    0,
    true,
    NOW(),
    NOW()
FROM items i
CROSS JOIN vendors v
WHERE i.code = 'SMA-FEMALE-INLINE'
  AND v.code = 'SYNERGY'
  AND NOT EXISTS (
      SELECT 1 FROM item_vendors WHERE item_id = i.id AND vendor_id = v.id
  )
LIMIT 1;

-- SMA Male connector inline for RG142 → Synergy (Priority 1)
INSERT INTO item_vendors (item_id, vendor_id, priority, unit_price, is_active, created_at, updated_at)
SELECT 
    i.id,
    v.id,
    1,
    0,
    true,
    NOW(),
    NOW()
FROM items i
CROSS JOIN vendors v
WHERE i.code = 'SMA-MALE-CONNECTOR'
  AND v.code = 'SYNERGY'
  AND NOT EXISTS (
      SELECT 1 FROM item_vendors WHERE item_id = i.id AND vendor_id = v.id
  )
LIMIT 1;

-- RG174 Coaxial cable → Synergy (Priority 1)
INSERT INTO item_vendors (item_id, vendor_id, priority, unit_price, is_active, created_at, updated_at)
SELECT 
    i.id,
    v.id,
    1,
    0,
    true,
    NOW(),
    NOW()
FROM items i
CROSS JOIN vendors v
WHERE i.code = 'RG174-COAXIAL-CABLE'
  AND v.code = 'SYNERGY'
  AND NOT EXISTS (
      SELECT 1 FROM item_vendors WHERE item_id = i.id AND vendor_id = v.id
  )
LIMIT 1;

-- RG142 Coaxial cable → Synergy (Priority 1)
INSERT INTO item_vendors (item_id, vendor_id, priority, unit_price, is_active, created_at, updated_at)
SELECT 
    i.id,
    v.id,
    1,
    0,
    true,
    NOW(),
    NOW()
FROM items i
CROSS JOIN vendors v
WHERE i.code = 'RG142-COAXIAL-CABLE'
  AND v.code = 'SYNERGY'
  AND NOT EXISTS (
      SELECT 1 FROM item_vendors WHERE item_id = i.id AND vendor_id = v.id
  )
LIMIT 1;

-- 20 AWG Silicone Red - Wire → Robu (Priority 1)
INSERT INTO item_vendors (item_id, vendor_id, priority, unit_price, is_active, created_at, updated_at)
SELECT 
    i.id,
    v.id,
    1,
    0,
    true,
    NOW(),
    NOW()
FROM items i
CROSS JOIN vendors v
WHERE i.code = '20-AWG-SILICONE'
  AND v.code = 'ROBU'
  AND NOT EXISTS (
      SELECT 1 FROM item_vendors WHERE item_id = i.id AND vendor_id = v.id
  )
LIMIT 1;

-- 25Core Wire 14/38 → Cable Fort (Priority 1)
INSERT INTO item_vendors (item_id, vendor_id, priority, unit_price, is_active, created_at, updated_at)
SELECT 
    i.id,
    v.id,
    1,
    0,
    true,
    NOW(),
    NOW()
FROM items i
CROSS JOIN vendors v
WHERE i.code = '25CORE-WIRE-1438'
  AND v.code = 'CABLEFORT'
  AND NOT EXISTS (
      SELECT 1 FROM item_vendors WHERE item_id = i.id AND vendor_id = v.id
  )
LIMIT 1;

-- 20Core Wire 14/38 → Cable Fort (Priority 1)
INSERT INTO item_vendors (item_id, vendor_id, priority, unit_price, is_active, created_at, updated_at)
SELECT 
    i.id,
    v.id,
    1,
    185.0,
    true,
    NOW(),
    NOW()
FROM items i
CROSS JOIN vendors v
WHERE i.code = '20CORE-WIRE-1438'
  AND v.code = 'CABLEFORT'
  AND NOT EXISTS (
      SELECT 1 FROM item_vendors WHERE item_id = i.id AND vendor_id = v.id
  )
LIMIT 1;

-- 10Core Wire 14/38 → Cable Fort (Priority 1)
INSERT INTO item_vendors (item_id, vendor_id, priority, unit_price, is_active, created_at, updated_at)
SELECT 
    i.id,
    v.id,
    1,
    0,
    true,
    NOW(),
    NOW()
FROM items i
CROSS JOIN vendors v
WHERE i.code = '10CORE-WIRE-1438'
  AND v.code = 'CABLEFORT'
  AND NOT EXISTS (
      SELECT 1 FROM item_vendors WHERE item_id = i.id AND vendor_id = v.id
  )
LIMIT 1;

-- 8core Wire 14/38 → Cable Fort (Priority 1)
INSERT INTO item_vendors (item_id, vendor_id, priority, unit_price, is_active, created_at, updated_at)
SELECT 
    i.id,
    v.id,
    1,
    42.0,
    true,
    NOW(),
    NOW()
FROM items i
CROSS JOIN vendors v
WHERE i.code = '8CORE-WIRE-1438'
  AND v.code = 'CABLEFORT'
  AND NOT EXISTS (
      SELECT 1 FROM item_vendors WHERE item_id = i.id AND vendor_id = v.id
  )
LIMIT 1;

-- 14/38 16 Core Wire → Cable Fort (Priority 1)
INSERT INTO item_vendors (item_id, vendor_id, priority, unit_price, is_active, created_at, updated_at)
SELECT 
    i.id,
    v.id,
    1,
    180.0,
    true,
    NOW(),
    NOW()
FROM items i
CROSS JOIN vendors v
WHERE i.code = '1438-16-CORE'
  AND v.code = 'CABLEFORT'
  AND NOT EXISTS (
      SELECT 1 FROM item_vendors WHERE item_id = i.id AND vendor_id = v.id
  )
LIMIT 1;

-- Red 14/38 wire → Cable Fort (Priority 1)
INSERT INTO item_vendors (item_id, vendor_id, priority, unit_price, is_active, created_at, updated_at)
SELECT 
    i.id,
    v.id,
    1,
    4.0,
    true,
    NOW(),
    NOW()
FROM items i
CROSS JOIN vendors v
WHERE i.code = 'RED-1438-WIRE'
  AND v.code = 'CABLEFORT'
  AND NOT EXISTS (
      SELECT 1 FROM item_vendors WHERE item_id = i.id AND vendor_id = v.id
  )
LIMIT 1;

-- Black 14/38 Wire → Cable Fort (Priority 1)
INSERT INTO item_vendors (item_id, vendor_id, priority, unit_price, is_active, created_at, updated_at)
SELECT 
    i.id,
    v.id,
    1,
    4.0,
    true,
    NOW(),
    NOW()
FROM items i
CROSS JOIN vendors v
WHERE i.code = 'BLACK-1438-WIRE'
  AND v.code = 'CABLEFORT'
  AND NOT EXISTS (
      SELECT 1 FROM item_vendors WHERE item_id = i.id AND vendor_id = v.id
  )
LIMIT 1;

-- Yellow 14/38 Wire → Cable Fort (Priority 1)
INSERT INTO item_vendors (item_id, vendor_id, priority, unit_price, is_active, created_at, updated_at)
SELECT 
    i.id,
    v.id,
    1,
    4.0,
    true,
    NOW(),
    NOW()
FROM items i
CROSS JOIN vendors v
WHERE i.code = 'YELLOW-1438-WIRE'
  AND v.code = 'CABLEFORT'
  AND NOT EXISTS (
      SELECT 1 FROM item_vendors WHERE item_id = i.id AND vendor_id = v.id
  )
LIMIT 1;

-- White 14/38 Wire → Cable Fort (Priority 1)
INSERT INTO item_vendors (item_id, vendor_id, priority, unit_price, is_active, created_at, updated_at)
SELECT 
    i.id,
    v.id,
    1,
    4.0,
    true,
    NOW(),
    NOW()
FROM items i
CROSS JOIN vendors v
WHERE i.code = 'WHITE-1438-WIRE'
  AND v.code = 'CABLEFORT'
  AND NOT EXISTS (
      SELECT 1 FROM item_vendors WHERE item_id = i.id AND vendor_id = v.id
  )
LIMIT 1;

-- Sky Blue 14/38 Wire → Cable Fort (Priority 1)
INSERT INTO item_vendors (item_id, vendor_id, priority, unit_price, is_active, created_at, updated_at)
SELECT 
    i.id,
    v.id,
    1,
    4.0,
    true,
    NOW(),
    NOW()
FROM items i
CROSS JOIN vendors v
WHERE i.code = 'SKY-BLUE-1438'
  AND v.code = 'CABLEFORT'
  AND NOT EXISTS (
      SELECT 1 FROM item_vendors WHERE item_id = i.id AND vendor_id = v.id
  )
LIMIT 1;

-- Orange 14/38 Wire → Cable Fort (Priority 1)
INSERT INTO item_vendors (item_id, vendor_id, priority, unit_price, is_active, created_at, updated_at)
SELECT 
    i.id,
    v.id,
    1,
    4.0,
    true,
    NOW(),
    NOW()
FROM items i
CROSS JOIN vendors v
WHERE i.code = 'ORANGE-1438-WIRE'
  AND v.code = 'CABLEFORT'
  AND NOT EXISTS (
      SELECT 1 FROM item_vendors WHERE item_id = i.id AND vendor_id = v.id
  )
LIMIT 1;

-- Green 14/38 Wire → Cable Fort (Priority 1)
INSERT INTO item_vendors (item_id, vendor_id, priority, unit_price, is_active, created_at, updated_at)
SELECT 
    i.id,
    v.id,
    1,
    4.0,
    true,
    NOW(),
    NOW()
FROM items i
CROSS JOIN vendors v
WHERE i.code = 'GREEN-1438-WIRE'
  AND v.code = 'CABLEFORT'
  AND NOT EXISTS (
      SELECT 1 FROM item_vendors WHERE item_id = i.id AND vendor_id = v.id
  )
LIMIT 1;

-- Purple 14/38 Wire → Cable Fort (Priority 1)
INSERT INTO item_vendors (item_id, vendor_id, priority, unit_price, is_active, created_at, updated_at)
SELECT 
    i.id,
    v.id,
    1,
    4.0,
    true,
    NOW(),
    NOW()
FROM items i
CROSS JOIN vendors v
WHERE i.code = 'PURPLE-1438-WIRE'
  AND v.code = 'CABLEFORT'
  AND NOT EXISTS (
      SELECT 1 FROM item_vendors WHERE item_id = i.id AND vendor_id = v.id
  )
LIMIT 1;

-- Brown 14/38 Wire → Cable Fort (Priority 1)
INSERT INTO item_vendors (item_id, vendor_id, priority, unit_price, is_active, created_at, updated_at)
SELECT 
    i.id,
    v.id,
    1,
    4.0,
    true,
    NOW(),
    NOW()
FROM items i
CROSS JOIN vendors v
WHERE i.code = 'BROWN-1438-WIRE'
  AND v.code = 'CABLEFORT'
  AND NOT EXISTS (
      SELECT 1 FROM item_vendors WHERE item_id = i.id AND vendor_id = v.id
  )
LIMIT 1;

-- Aft plate Acrylice for Template → Ali Irani - Kolkata (Priority 1)
INSERT INTO item_vendors (item_id, vendor_id, priority, unit_price, is_active, created_at, updated_at)
SELECT 
    i.id,
    v.id,
    1,
    25.0,
    true,
    NOW(),
    NOW()
FROM items i
CROSS JOIN vendors v
WHERE i.code = 'AFT-PLATE-ACRYLICE'
  AND v.code = 'ALIIRANIKOLKATA'
  AND NOT EXISTS (
      SELECT 1 FROM item_vendors WHERE item_id = i.id AND vendor_id = v.id
  )
LIMIT 1;

-- 12S Lipo Charger → Shenzen ISD Technology (Priority 1)
INSERT INTO item_vendors (item_id, vendor_id, priority, unit_price, is_active, created_at, updated_at)
SELECT 
    i.id,
    v.id,
    1,
    45000.0,
    true,
    NOW(),
    NOW()
FROM items i
CROSS JOIN vendors v
WHERE i.code = '12S-LIPO-CHARGER'
  AND v.code = 'SHENZENISDTECHNOLOGY'
  AND NOT EXISTS (
      SELECT 1 FROM item_vendors WHERE item_id = i.id AND vendor_id = v.id
  )
LIMIT 1;

-- 8S Lipo Charger ISDT Q8 → Robu (Priority 1)
INSERT INTO item_vendors (item_id, vendor_id, priority, unit_price, is_active, created_at, updated_at)
SELECT 
    i.id,
    v.id,
    1,
    7220.0,
    true,
    NOW(),
    NOW()
FROM items i
CROSS JOIN vendors v
WHERE i.code = '8S-LIPO-CHARGER'
  AND v.code = 'ROBU'
  AND NOT EXISTS (
      SELECT 1 FROM item_vendors WHERE item_id = i.id AND vendor_id = v.id
  )
LIMIT 1;

-- 4S Lipo Charger ISDT PD60 → Robu (Priority 1)
INSERT INTO item_vendors (item_id, vendor_id, priority, unit_price, is_active, created_at, updated_at)
SELECT 
    i.id,
    v.id,
    1,
    1245.0,
    true,
    NOW(),
    NOW()
FROM items i
CROSS JOIN vendors v
WHERE i.code = '4S-LIPO-CHARGER'
  AND v.code = 'ROBU'
  AND NOT EXISTS (
      SELECT 1 FROM item_vendors WHERE item_id = i.id AND vendor_id = v.id
  )
LIMIT 1;

-- 8kg Hull → Vinod Rai (Priority 1)
INSERT INTO item_vendors (item_id, vendor_id, priority, unit_price, is_active, created_at, updated_at)
SELECT 
    i.id,
    v.id,
    1,
    8500.0,
    true,
    NOW(),
    NOW()
FROM items i
CROSS JOIN vendors v
WHERE i.code = '8KG-HULL'
  AND v.code = 'VINODRAI'
  AND NOT EXISTS (
      SELECT 1 FROM item_vendors WHERE item_id = i.id AND vendor_id = v.id
  )
LIMIT 1;

-- JCB Body cum mounting frame → Vinod Rai (Priority 1)
INSERT INTO item_vendors (item_id, vendor_id, priority, unit_price, is_active, created_at, updated_at)
SELECT 
    i.id,
    v.id,
    1,
    2000.0,
    true,
    NOW(),
    NOW()
FROM items i
CROSS JOIN vendors v
WHERE i.code = 'JCB-BODY-CUM'
  AND v.code = 'VINODRAI'
  AND NOT EXISTS (
      SELECT 1 FROM item_vendors WHERE item_id = i.id AND vendor_id = v.id
  )
LIMIT 1;

-- SR Structure → Vinod Rai (Priority 1)
INSERT INTO item_vendors (item_id, vendor_id, priority, unit_price, is_active, created_at, updated_at)
SELECT 
    i.id,
    v.id,
    1,
    1000.0,
    true,
    NOW(),
    NOW()
FROM items i
CROSS JOIN vendors v
WHERE i.code = 'SR-STRUCTURE'
  AND v.code = 'VINODRAI'
  AND NOT EXISTS (
      SELECT 1 FROM item_vendors WHERE item_id = i.id AND vendor_id = v.id
  )
LIMIT 1;

-- SR Pillow → Vinod Rai (Priority 1)
INSERT INTO item_vendors (item_id, vendor_id, priority, unit_price, is_active, created_at, updated_at)
SELECT 
    i.id,
    v.id,
    1,
    1000.0,
    true,
    NOW(),
    NOW()
FROM items i
CROSS JOIN vendors v
WHERE i.code = 'SR-PILLOW'
  AND v.code = 'VINODRAI'
  AND NOT EXISTS (
      SELECT 1 FROM item_vendors WHERE item_id = i.id AND vendor_id = v.id
  )
LIMIT 1;

-- Coupling Hood → Agarwal Aluminium (Priority 1)
INSERT INTO item_vendors (item_id, vendor_id, priority, unit_price, is_active, created_at, updated_at)
SELECT 
    i.id,
    v.id,
    1,
    10.0,
    true,
    NOW(),
    NOW()
FROM items i
CROSS JOIN vendors v
WHERE i.code = 'COUPLING-HOOD'
  AND v.code = 'AGARWALALUMINIUM'
  AND NOT EXISTS (
      SELECT 1 FROM item_vendors WHERE item_id = i.id AND vendor_id = v.id
  )
LIMIT 1;

-- 2mm FRP 60x70mm with 18 mm hole → Dolphin Rubber (Priority 1)
INSERT INTO item_vendors (item_id, vendor_id, priority, unit_price, is_active, created_at, updated_at)
SELECT 
    i.id,
    v.id,
    1,
    5.0,
    true,
    NOW(),
    NOW()
FROM items i
CROSS JOIN vendors v
WHERE i.code = '2MM-FRP-60X70MM'
  AND v.code = 'DOLPHINRUBBER'
  AND NOT EXISTS (
      SELECT 1 FROM item_vendors WHERE item_id = i.id AND vendor_id = v.id
  )
LIMIT 1;

-- flow sensor Clamp → Agarwal Aluminium (Priority 1)
INSERT INTO item_vendors (item_id, vendor_id, priority, unit_price, is_active, created_at, updated_at)
SELECT 
    i.id,
    v.id,
    1,
    10.0,
    true,
    NOW(),
    NOW()
FROM items i
CROSS JOIN vendors v
WHERE i.code = 'FLOW-SENSOR-CLAMP'
  AND v.code = 'AGARWALALUMINIUM'
  AND NOT EXISTS (
      SELECT 1 FROM item_vendors WHERE item_id = i.id AND vendor_id = v.id
  )
LIMIT 1;

-- ESC Temperature Sensor Clamp → Agarwal Aluminium (Priority 1)
INSERT INTO item_vendors (item_id, vendor_id, priority, unit_price, is_active, created_at, updated_at)
SELECT 
    i.id,
    v.id,
    1,
    10.0,
    true,
    NOW(),
    NOW()
FROM items i
CROSS JOIN vendors v
WHERE i.code = 'ESC-TEMPERATURE-SENSOR'
  AND v.code = 'AGARWALALUMINIUM'
  AND NOT EXISTS (
      SELECT 1 FROM item_vendors WHERE item_id = i.id AND vendor_id = v.id
  )
LIMIT 1;

-- Battery Clamp → Agarwal Aluminium (Priority 1)
INSERT INTO item_vendors (item_id, vendor_id, priority, unit_price, is_active, created_at, updated_at)
SELECT 
    i.id,
    v.id,
    1,
    10.0,
    true,
    NOW(),
    NOW()
FROM items i
CROSS JOIN vendors v
WHERE i.code = 'BATTERY-CLAMP'
  AND v.code = 'AGARWALALUMINIUM'
  AND NOT EXISTS (
      SELECT 1 FROM item_vendors WHERE item_id = i.id AND vendor_id = v.id
  )
LIMIT 1;

-- Electronic Box Top Lid → Janki Die (Priority 1)
INSERT INTO item_vendors (item_id, vendor_id, priority, unit_price, is_active, created_at, updated_at)
SELECT 
    i.id,
    v.id,
    1,
    30.0,
    true,
    NOW(),
    NOW()
FROM items i
CROSS JOIN vendors v
WHERE i.code = 'ELECTRONIC-BOX-TOP'
  AND v.code = 'JANKIDIE'
  AND NOT EXISTS (
      SELECT 1 FROM item_vendors WHERE item_id = i.id AND vendor_id = v.id
  )
LIMIT 1;

-- Battery holding foam block Side (115×80×35) → In-house (Priority 1)
INSERT INTO item_vendors (item_id, vendor_id, priority, unit_price, is_active, created_at, updated_at)
SELECT 
    i.id,
    v.id,
    1,
    5.0,
    true,
    NOW(),
    NOW()
FROM items i
CROSS JOIN vendors v
WHERE i.code = 'BATTERY-HOLDING-FOAM'
  AND v.code = 'INHOUSE'
  AND NOT EXISTS (
      SELECT 1 FROM item_vendors WHERE item_id = i.id AND vendor_id = v.id
  )
LIMIT 1;

-- Battery holding foam block Upside (80×80×35) → In-house (Priority 1)
INSERT INTO item_vendors (item_id, vendor_id, priority, unit_price, is_active, created_at, updated_at)
SELECT 
    i.id,
    v.id,
    1,
    5.0,
    true,
    NOW(),
    NOW()
FROM items i
CROSS JOIN vendors v
WHERE i.code = 'BATTERY-HOLDING-FOAM'
  AND v.code = 'INHOUSE'
  AND NOT EXISTS (
      SELECT 1 FROM item_vendors WHERE item_id = i.id AND vendor_id = v.id
  )
LIMIT 1;

-- Battery Clamping UP EPE on jet plate (150×80×20) → In-house (Priority 1)
INSERT INTO item_vendors (item_id, vendor_id, priority, unit_price, is_active, created_at, updated_at)
SELECT 
    i.id,
    v.id,
    1,
    5.0,
    true,
    NOW(),
    NOW()
FROM items i
CROSS JOIN vendors v
WHERE i.code = 'BATTERY-CLAMPING-UP'
  AND v.code = 'INHOUSE'
  AND NOT EXISTS (
      SELECT 1 FROM item_vendors WHERE item_id = i.id AND vendor_id = v.id
  )
LIMIT 1;

-- Battery Clamping B&F EPE on jet plate (80×80×10) → In-house (Priority 1)
INSERT INTO item_vendors (item_id, vendor_id, priority, unit_price, is_active, created_at, updated_at)
SELECT 
    i.id,
    v.id,
    1,
    5.0,
    true,
    NOW(),
    NOW()
FROM items i
CROSS JOIN vendors v
WHERE i.code = 'BATTERY-CLAMPING-BF'
  AND v.code = 'INHOUSE'
  AND NOT EXISTS (
      SELECT 1 FROM item_vendors WHERE item_id = i.id AND vendor_id = v.id
  )
LIMIT 1;

-- Under ElecBox EPE (150x230x25) → In-house (Priority 1)
INSERT INTO item_vendors (item_id, vendor_id, priority, unit_price, is_active, created_at, updated_at)
SELECT 
    i.id,
    v.id,
    1,
    10.0,
    true,
    NOW(),
    NOW()
FROM items i
CROSS JOIN vendors v
WHERE i.code = 'UNDER-ELECBOX-EPE'
  AND v.code = 'INHOUSE'
  AND NOT EXISTS (
      SELECT 1 FROM item_vendors WHERE item_id = i.id AND vendor_id = v.id
  )
LIMIT 1;

-- Above ElecBox EPE (150x80x30) → In-house (Priority 1)
INSERT INTO item_vendors (item_id, vendor_id, priority, unit_price, is_active, created_at, updated_at)
SELECT 
    i.id,
    v.id,
    1,
    10.0,
    true,
    NOW(),
    NOW()
FROM items i
CROSS JOIN vendors v
WHERE i.code = 'ABOVE-ELECBOX-EPE'
  AND v.code = 'INHOUSE'
  AND NOT EXISTS (
      SELECT 1 FROM item_vendors WHERE item_id = i.id AND vendor_id = v.id
  )
LIMIT 1;

-- Zip ties 100x3 MultiCompro → Seutes (Priority 1)
INSERT INTO item_vendors (item_id, vendor_id, priority, unit_price, is_active, created_at, updated_at)
SELECT 
    i.id,
    v.id,
    1,
    1.0,
    true,
    NOW(),
    NOW()
FROM items i
CROSS JOIN vendors v
WHERE i.code = 'ZIP-TIES-100X3'
  AND v.code = 'SEUTES'
  AND NOT EXISTS (
      SELECT 1 FROM item_vendors WHERE item_id = i.id AND vendor_id = v.id
  )
LIMIT 1;

-- Zip ties 250m Regular → Local Market (Priority 1)
INSERT INTO item_vendors (item_id, vendor_id, priority, unit_price, is_active, created_at, updated_at)
SELECT 
    i.id,
    v.id,
    1,
    0,
    true,
    NOW(),
    NOW()
FROM items i
CROSS JOIN vendors v
WHERE i.code = 'ZIP-TIES-250M'
  AND v.code = 'LOCALMARKET'
  AND NOT EXISTS (
      SELECT 1 FROM item_vendors WHERE item_id = i.id AND vendor_id = v.id
  )
LIMIT 1;

-- Ferrite Core → Marhash Toroid Rings (Priority 1)
INSERT INTO item_vendors (item_id, vendor_id, priority, unit_price, is_active, created_at, updated_at)
SELECT 
    i.id,
    v.id,
    1,
    7.0,
    true,
    NOW(),
    NOW()
FROM items i
CROSS JOIN vendors v
WHERE i.code = 'FERRITE-CORE'
  AND v.code = 'MARHASHTOROIDRINGS'
  AND NOT EXISTS (
      SELECT 1 FROM item_vendors WHERE item_id = i.id AND vendor_id = v.id
  )
LIMIT 1;

-- SY21-15 pin panel mount(Male) → Weipu (Priority 1)
INSERT INTO item_vendors (item_id, vendor_id, priority, unit_price, is_active, created_at, updated_at)
SELECT 
    i.id,
    v.id,
    1,
    350.0,
    true,
    NOW(),
    NOW()
FROM items i
CROSS JOIN vendors v
WHERE i.code = 'SY2115-PIN-PANEL'
  AND v.code = 'WEIPU'
  AND NOT EXISTS (
      SELECT 1 FROM item_vendors WHERE item_id = i.id AND vendor_id = v.id
  )
LIMIT 1;

-- SY21-15 pin Cable Mount(Female) → Weipu (Priority 1)
INSERT INTO item_vendors (item_id, vendor_id, priority, unit_price, is_active, created_at, updated_at)
SELECT 
    i.id,
    v.id,
    1,
    350.0,
    true,
    NOW(),
    NOW()
FROM items i
CROSS JOIN vendors v
WHERE i.code = 'SY2115-PIN-CABLE'
  AND v.code = 'WEIPU'
  AND NOT EXISTS (
      SELECT 1 FROM item_vendors WHERE item_id = i.id AND vendor_id = v.id
  )
LIMIT 1;

-- SY21-15 pin panel mount(Female) → Weipu (Priority 1)
INSERT INTO item_vendors (item_id, vendor_id, priority, unit_price, is_active, created_at, updated_at)
SELECT 
    i.id,
    v.id,
    1,
    350.0,
    true,
    NOW(),
    NOW()
FROM items i
CROSS JOIN vendors v
WHERE i.code = 'SY2115-PIN-PANEL'
  AND v.code = 'WEIPU'
  AND NOT EXISTS (
      SELECT 1 FROM item_vendors WHERE item_id = i.id AND vendor_id = v.id
  )
LIMIT 1;

-- SY21-15 pin Cable Mount(Male) → Weipu (Priority 1)
INSERT INTO item_vendors (item_id, vendor_id, priority, unit_price, is_active, created_at, updated_at)
SELECT 
    i.id,
    v.id,
    1,
    350.0,
    true,
    NOW(),
    NOW()
FROM items i
CROSS JOIN vendors v
WHERE i.code = 'SY2115-PIN-CABLE'
  AND v.code = 'WEIPU'
  AND NOT EXISTS (
      SELECT 1 FROM item_vendors WHERE item_id = i.id AND vendor_id = v.id
  )
LIMIT 1;

-- WY-28 Metal connector CM → Weipu (Priority 1)
INSERT INTO item_vendors (item_id, vendor_id, priority, unit_price, is_active, created_at, updated_at)
SELECT 
    i.id,
    v.id,
    1,
    650.0,
    true,
    NOW(),
    NOW()
FROM items i
CROSS JOIN vendors v
WHERE i.code = 'WY28-METAL-CONNECTOR'
  AND v.code = 'WEIPU'
  AND NOT EXISTS (
      SELECT 1 FROM item_vendors WHERE item_id = i.id AND vendor_id = v.id
  )
LIMIT 1;

-- WY-28 Metal connector PM → Weipu (Priority 1)
INSERT INTO item_vendors (item_id, vendor_id, priority, unit_price, is_active, created_at, updated_at)
SELECT 
    i.id,
    v.id,
    1,
    500.0,
    true,
    NOW(),
    NOW()
FROM items i
CROSS JOIN vendors v
WHERE i.code = 'WY28-METAL-CONNECTOR'
  AND v.code = 'WEIPU'
  AND NOT EXISTS (
      SELECT 1 FROM item_vendors WHERE item_id = i.id AND vendor_id = v.id
  )
LIMIT 1;

-- SA12 9pin CM Pushpull Male → Weipu (Priority 1)
INSERT INTO item_vendors (item_id, vendor_id, priority, unit_price, is_active, created_at, updated_at)
SELECT 
    i.id,
    v.id,
    1,
    500.0,
    true,
    NOW(),
    NOW()
FROM items i
CROSS JOIN vendors v
WHERE i.code = 'SA12-9PIN-CM'
  AND v.code = 'WEIPU'
  AND NOT EXISTS (
      SELECT 1 FROM item_vendors WHERE item_id = i.id AND vendor_id = v.id
  )
LIMIT 1;

-- SA12 9pin PM Pushpull female → Weipu (Priority 1)
INSERT INTO item_vendors (item_id, vendor_id, priority, unit_price, is_active, created_at, updated_at)
SELECT 
    i.id,
    v.id,
    1,
    350.0,
    true,
    NOW(),
    NOW()
FROM items i
CROSS JOIN vendors v
WHERE i.code = 'SA12-9PIN-PM'
  AND v.code = 'WEIPU'
  AND NOT EXISTS (
      SELECT 1 FROM item_vendors WHERE item_id = i.id AND vendor_id = v.id
  )
LIMIT 1;

-- SA12 9pin Counter → Weipu (Priority 1)
INSERT INTO item_vendors (item_id, vendor_id, priority, unit_price, is_active, created_at, updated_at)
SELECT 
    i.id,
    v.id,
    1,
    0,
    true,
    NOW(),
    NOW()
FROM items i
CROSS JOIN vendors v
WHERE i.code = 'SA12-9PIN-COUNTER'
  AND v.code = 'WEIPU'
  AND NOT EXISTS (
      SELECT 1 FROM item_vendors WHERE item_id = i.id AND vendor_id = v.id
  )
LIMIT 1;

-- LP12 3 pin plug male clip lock CM → Evelta (Priority 1)
INSERT INTO item_vendors (item_id, vendor_id, priority, unit_price, is_active, created_at, updated_at)
SELECT 
    i.id,
    v.id,
    1,
    169.0,
    true,
    NOW(),
    NOW()
FROM items i
CROSS JOIN vendors v
WHERE i.code = 'LP12-3-PIN'
  AND v.code = 'EVELTA'
  AND NOT EXISTS (
      SELECT 1 FROM item_vendors WHERE item_id = i.id AND vendor_id = v.id
  )
LIMIT 1;

-- LP12 3 pin socket female clip lock PM → Evelta (Priority 1)
INSERT INTO item_vendors (item_id, vendor_id, priority, unit_price, is_active, created_at, updated_at)
SELECT 
    i.id,
    v.id,
    1,
    121.0,
    true,
    NOW(),
    NOW()
FROM items i
CROSS JOIN vendors v
WHERE i.code = 'LP12-3-PIN'
  AND v.code = 'EVELTA'
  AND NOT EXISTS (
      SELECT 1 FROM item_vendors WHERE item_id = i.id AND vendor_id = v.id
  )
LIMIT 1;

-- LP12 4 pin plug male clip lock CM → Evelta (Priority 1)
INSERT INTO item_vendors (item_id, vendor_id, priority, unit_price, is_active, created_at, updated_at)
SELECT 
    i.id,
    v.id,
    1,
    141.0,
    true,
    NOW(),
    NOW()
FROM items i
CROSS JOIN vendors v
WHERE i.code = 'LP12-4-PIN'
  AND v.code = 'EVELTA'
  AND NOT EXISTS (
      SELECT 1 FROM item_vendors WHERE item_id = i.id AND vendor_id = v.id
  )
LIMIT 1;

-- LP12 4 pin socket female clip lock PM → Evelta (Priority 1)
INSERT INTO item_vendors (item_id, vendor_id, priority, unit_price, is_active, created_at, updated_at)
SELECT 
    i.id,
    v.id,
    1,
    350.0,
    true,
    NOW(),
    NOW()
FROM items i
CROSS JOIN vendors v
WHERE i.code = 'LP12-4-PIN'
  AND v.code = 'EVELTA'
  AND NOT EXISTS (
      SELECT 1 FROM item_vendors WHERE item_id = i.id AND vendor_id = v.id
  )
LIMIT 1;

-- LP12 8 pin plug male clip lock CM → Evelta (Priority 1)
INSERT INTO item_vendors (item_id, vendor_id, priority, unit_price, is_active, created_at, updated_at)
SELECT 
    i.id,
    v.id,
    1,
    0,
    true,
    NOW(),
    NOW()
FROM items i
CROSS JOIN vendors v
WHERE i.code = 'LP12-8-PIN'
  AND v.code = 'EVELTA'
  AND NOT EXISTS (
      SELECT 1 FROM item_vendors WHERE item_id = i.id AND vendor_id = v.id
  )
LIMIT 1;

-- LP12 8 pin socket female clip lock PM → Evelta (Priority 1)
INSERT INTO item_vendors (item_id, vendor_id, priority, unit_price, is_active, created_at, updated_at)
SELECT 
    i.id,
    v.id,
    1,
    0,
    true,
    NOW(),
    NOW()
FROM items i
CROSS JOIN vendors v
WHERE i.code = 'LP12-8-PIN'
  AND v.code = 'EVELTA'
  AND NOT EXISTS (
      SELECT 1 FROM item_vendors WHERE item_id = i.id AND vendor_id = v.id
  )
LIMIT 1;

-- LP24 24 pin plug male clip lock CM (Not Using) → Evelta (Priority 1)
INSERT INTO item_vendors (item_id, vendor_id, priority, unit_price, is_active, created_at, updated_at)
SELECT 
    i.id,
    v.id,
    1,
    0,
    true,
    NOW(),
    NOW()
FROM items i
CROSS JOIN vendors v
WHERE i.code = 'LP24-24-PIN'
  AND v.code = 'EVELTA'
  AND NOT EXISTS (
      SELECT 1 FROM item_vendors WHERE item_id = i.id AND vendor_id = v.id
  )
LIMIT 1;

-- LP24 24 pin socket female clip lock PM (Not Using) → Evelta (Priority 1)
INSERT INTO item_vendors (item_id, vendor_id, priority, unit_price, is_active, created_at, updated_at)
SELECT 
    i.id,
    v.id,
    1,
    0,
    true,
    NOW(),
    NOW()
FROM items i
CROSS JOIN vendors v
WHERE i.code = 'LP24-24-PIN'
  AND v.code = 'EVELTA'
  AND NOT EXISTS (
      SELECT 1 FROM item_vendors WHERE item_id = i.id AND vendor_id = v.id
  )
LIMIT 1;

-- LP24 24 pin plug female clip lock CM → Evelta (Priority 1)
INSERT INTO item_vendors (item_id, vendor_id, priority, unit_price, is_active, created_at, updated_at)
SELECT 
    i.id,
    v.id,
    1,
    556.0,
    true,
    NOW(),
    NOW()
FROM items i
CROSS JOIN vendors v
WHERE i.code = 'LP24-24-PIN'
  AND v.code = 'EVELTA'
  AND NOT EXISTS (
      SELECT 1 FROM item_vendors WHERE item_id = i.id AND vendor_id = v.id
  )
LIMIT 1;

-- LP24 24 pin socket male clip lock PM → Evelta (Priority 1)
INSERT INTO item_vendors (item_id, vendor_id, priority, unit_price, is_active, created_at, updated_at)
SELECT 
    i.id,
    v.id,
    1,
    425.0,
    true,
    NOW(),
    NOW()
FROM items i
CROSS JOIN vendors v
WHERE i.code = 'LP24-24-PIN'
  AND v.code = 'EVELTA'
  AND NOT EXISTS (
      SELECT 1 FROM item_vendors WHERE item_id = i.id AND vendor_id = v.id
  )
LIMIT 1;

-- Water tank for JCB → Tanveer International (Priority 1)
INSERT INTO item_vendors (item_id, vendor_id, priority, unit_price, is_active, created_at, updated_at)
SELECT 
    i.id,
    v.id,
    1,
    200.0,
    true,
    NOW(),
    NOW()
FROM items i
CROSS JOIN vendors v
WHERE i.code = 'WATER-TANK-FOR'
  AND v.code = 'TANVEERINTERNATIONAL'
  AND NOT EXISTS (
      SELECT 1 FROM item_vendors WHERE item_id = i.id AND vendor_id = v.id
  )
LIMIT 1;

-- BlueRobotics Leak probe → BlueRobotics (Priority 1)
INSERT INTO item_vendors (item_id, vendor_id, priority, unit_price, is_active, created_at, updated_at)
SELECT 
    i.id,
    v.id,
    1,
    200.0,
    true,
    NOW(),
    NOW()
FROM items i
CROSS JOIN vendors v
WHERE i.code = 'BLUEROBOTICS-LEAK-PROBE'
  AND v.code = 'BLUEROBOTICS'
  AND NOT EXISTS (
      SELECT 1 FROM item_vendors WHERE item_id = i.id AND vendor_id = v.id
  )
LIMIT 1;

-- BlueRobotics Indicator → BlueRobotics (Priority 1)
INSERT INTO item_vendors (item_id, vendor_id, priority, unit_price, is_active, created_at, updated_at)
SELECT 
    i.id,
    v.id,
    1,
    1000.0,
    true,
    NOW(),
    NOW()
FROM items i
CROSS JOIN vendors v
WHERE i.code = 'BLUEROBOTICS-INDICATOR'
  AND v.code = 'BLUEROBOTICS'
  AND NOT EXISTS (
      SELECT 1 FROM item_vendors WHERE item_id = i.id AND vendor_id = v.id
  )
LIMIT 1;

-- IP68 Rotary main Switch → BlueRobotics (Priority 1)
INSERT INTO item_vendors (item_id, vendor_id, priority, unit_price, is_active, created_at, updated_at)
SELECT 
    i.id,
    v.id,
    1,
    1000.0,
    true,
    NOW(),
    NOW()
FROM items i
CROSS JOIN vendors v
WHERE i.code = 'IP68-ROTARY-MAIN'
  AND v.code = 'BLUEROBOTICS'
  AND NOT EXISTS (
      SELECT 1 FROM item_vendors WHERE item_id = i.id AND vendor_id = v.id
  )
LIMIT 1;

-- Red 2835 SMD LED 1W → Premier Electronics (Priority 1)
INSERT INTO item_vendors (item_id, vendor_id, priority, unit_price, is_active, created_at, updated_at)
SELECT 
    i.id,
    v.id,
    1,
    7.0,
    true,
    NOW(),
    NOW()
FROM items i
CROSS JOIN vendors v
WHERE i.code = 'RED-2835-SMD'
  AND v.code = 'PREMIERELECTRONICS'
  AND NOT EXISTS (
      SELECT 1 FROM item_vendors WHERE item_id = i.id AND vendor_id = v.id
  )
LIMIT 1;

-- Green 2835 SMD LED 1W → Premier Electronics (Priority 1)
INSERT INTO item_vendors (item_id, vendor_id, priority, unit_price, is_active, created_at, updated_at)
SELECT 
    i.id,
    v.id,
    1,
    7.0,
    true,
    NOW(),
    NOW()
FROM items i
CROSS JOIN vendors v
WHERE i.code = 'GREEN-2835-SMD'
  AND v.code = 'PREMIERELECTRONICS'
  AND NOT EXISTS (
      SELECT 1 FROM item_vendors WHERE item_id = i.id AND vendor_id = v.id
  )
LIMIT 1;

-- No. 4 Self tap Screw SS304 (M4x6.5 Philips) → Dynamic Industrial Supplier (Priority 1)
INSERT INTO item_vendors (item_id, vendor_id, priority, unit_price, is_active, created_at, updated_at)
SELECT 
    i.id,
    v.id,
    1,
    0,
    true,
    NOW(),
    NOW()
FROM items i
CROSS JOIN vendors v
WHERE i.code = 'NO-4-SELF'
  AND v.code = 'DYNAMICINDUSTRIALSUP'
  AND NOT EXISTS (
      SELECT 1 FROM item_vendors WHERE item_id = i.id AND vendor_id = v.id
  )
LIMIT 1;

-- M2x12 Allen Head SS304 → Dynamic Industrial Supplier (Priority 1)
INSERT INTO item_vendors (item_id, vendor_id, priority, unit_price, is_active, created_at, updated_at)
SELECT 
    i.id,
    v.id,
    1,
    0,
    true,
    NOW(),
    NOW()
FROM items i
CROSS JOIN vendors v
WHERE i.code = 'M2X12-ALLEN-HEAD'
  AND v.code = 'DYNAMICINDUSTRIALSUP'
  AND NOT EXISTS (
      SELECT 1 FROM item_vendors WHERE item_id = i.id AND vendor_id = v.id
  )
LIMIT 1;

-- M3x6 CSK Phillips → Dynamic Industrial Supplier (Priority 1)
INSERT INTO item_vendors (item_id, vendor_id, priority, unit_price, is_active, created_at, updated_at)
SELECT 
    i.id,
    v.id,
    1,
    0,
    true,
    NOW(),
    NOW()
FROM items i
CROSS JOIN vendors v
WHERE i.code = 'M3X6-CSK-PHILLIPS'
  AND v.code = 'DYNAMICINDUSTRIALSUP'
  AND NOT EXISTS (
      SELECT 1 FROM item_vendors WHERE item_id = i.id AND vendor_id = v.id
  )
LIMIT 1;

-- M3x8 CSK Phillips → Dynamic Industrial Supplier (Priority 1)
INSERT INTO item_vendors (item_id, vendor_id, priority, unit_price, is_active, created_at, updated_at)
SELECT 
    i.id,
    v.id,
    1,
    0,
    true,
    NOW(),
    NOW()
FROM items i
CROSS JOIN vendors v
WHERE i.code = 'M3X8-CSK-PHILLIPS'
  AND v.code = 'DYNAMICINDUSTRIALSUP'
  AND NOT EXISTS (
      SELECT 1 FROM item_vendors WHERE item_id = i.id AND vendor_id = v.id
  )
LIMIT 1;

-- M3x30 CSK Phillips → Dynamic Industrial Supplier (Priority 1)
INSERT INTO item_vendors (item_id, vendor_id, priority, unit_price, is_active, created_at, updated_at)
SELECT 
    i.id,
    v.id,
    1,
    0,
    true,
    NOW(),
    NOW()
FROM items i
CROSS JOIN vendors v
WHERE i.code = 'M3X30-CSK-PHILLIPS'
  AND v.code = 'DYNAMICINDUSTRIALSUP'
  AND NOT EXISTS (
      SELECT 1 FROM item_vendors WHERE item_id = i.id AND vendor_id = v.id
  )
LIMIT 1;

-- M3x8 Button head → Dynamic Industrial Supplier (Priority 1)
INSERT INTO item_vendors (item_id, vendor_id, priority, unit_price, is_active, created_at, updated_at)
SELECT 
    i.id,
    v.id,
    1,
    0,
    true,
    NOW(),
    NOW()
FROM items i
CROSS JOIN vendors v
WHERE i.code = 'M3X8-BUTTON-HEAD'
  AND v.code = 'DYNAMICINDUSTRIALSUP'
  AND NOT EXISTS (
      SELECT 1 FROM item_vendors WHERE item_id = i.id AND vendor_id = v.id
  )
LIMIT 1;

-- M3x10 plain washer → Dynamic Industrial Supplier (Priority 1)
INSERT INTO item_vendors (item_id, vendor_id, priority, unit_price, is_active, created_at, updated_at)
SELECT 
    i.id,
    v.id,
    1,
    0,
    true,
    NOW(),
    NOW()
FROM items i
CROSS JOIN vendors v
WHERE i.code = 'M3X10-PLAIN-WASHER'
  AND v.code = 'DYNAMICINDUSTRIALSUP'
  AND NOT EXISTS (
      SELECT 1 FROM item_vendors WHERE item_id = i.id AND vendor_id = v.id
  )
LIMIT 1;

-- M4x8 CSK Phillips → Dynamic Industrial Supplier (Priority 1)
INSERT INTO item_vendors (item_id, vendor_id, priority, unit_price, is_active, created_at, updated_at)
SELECT 
    i.id,
    v.id,
    1,
    0,
    true,
    NOW(),
    NOW()
FROM items i
CROSS JOIN vendors v
WHERE i.code = 'M4X8-CSK-PHILLIPS'
  AND v.code = 'DYNAMICINDUSTRIALSUP'
  AND NOT EXISTS (
      SELECT 1 FROM item_vendors WHERE item_id = i.id AND vendor_id = v.id
  )
LIMIT 1;

-- M4x8 CSK Phillips GI → Dynamic Industrial Supplier (Priority 1)
INSERT INTO item_vendors (item_id, vendor_id, priority, unit_price, is_active, created_at, updated_at)
SELECT 
    i.id,
    v.id,
    1,
    0,
    true,
    NOW(),
    NOW()
FROM items i
CROSS JOIN vendors v
WHERE i.code = 'M4X8-CSK-PHILLIPS'
  AND v.code = 'DYNAMICINDUSTRIALSUP'
  AND NOT EXISTS (
      SELECT 1 FROM item_vendors WHERE item_id = i.id AND vendor_id = v.id
  )
LIMIT 1;

-- M2x15 Allen Head SS304 → Dynamic Industrial Supplier (Priority 1)
INSERT INTO item_vendors (item_id, vendor_id, priority, unit_price, is_active, created_at, updated_at)
SELECT 
    i.id,
    v.id,
    1,
    0,
    true,
    NOW(),
    NOW()
FROM items i
CROSS JOIN vendors v
WHERE i.code = 'M2X15-ALLEN-HEAD'
  AND v.code = 'DYNAMICINDUSTRIALSUP'
  AND NOT EXISTS (
      SELECT 1 FROM item_vendors WHERE item_id = i.id AND vendor_id = v.id
  )
LIMIT 1;

-- M4x10 CSK Phillips → Dynamic Industrial Supplier (Priority 1)
INSERT INTO item_vendors (item_id, vendor_id, priority, unit_price, is_active, created_at, updated_at)
SELECT 
    i.id,
    v.id,
    1,
    0,
    true,
    NOW(),
    NOW()
FROM items i
CROSS JOIN vendors v
WHERE i.code = 'M4X10-CSK-PHILLIPS'
  AND v.code = 'DYNAMICINDUSTRIALSUP'
  AND NOT EXISTS (
      SELECT 1 FROM item_vendors WHERE item_id = i.id AND vendor_id = v.id
  )
LIMIT 1;

-- M4x20 CSK Phillips → Dynamic Industrial Supplier (Priority 1)
INSERT INTO item_vendors (item_id, vendor_id, priority, unit_price, is_active, created_at, updated_at)
SELECT 
    i.id,
    v.id,
    1,
    0,
    true,
    NOW(),
    NOW()
FROM items i
CROSS JOIN vendors v
WHERE i.code = 'M4X20-CSK-PHILLIPS'
  AND v.code = 'DYNAMICINDUSTRIALSUP'
  AND NOT EXISTS (
      SELECT 1 FROM item_vendors WHERE item_id = i.id AND vendor_id = v.id
  )
LIMIT 1;

-- M4x12 Allen Head → Dynamic Industrial Supplier (Priority 1)
INSERT INTO item_vendors (item_id, vendor_id, priority, unit_price, is_active, created_at, updated_at)
SELECT 
    i.id,
    v.id,
    1,
    0,
    true,
    NOW(),
    NOW()
FROM items i
CROSS JOIN vendors v
WHERE i.code = 'M4X12-ALLEN-HEAD'
  AND v.code = 'DYNAMICINDUSTRIALSUP'
  AND NOT EXISTS (
      SELECT 1 FROM item_vendors WHERE item_id = i.id AND vendor_id = v.id
  )
LIMIT 1;

-- M4x16 Allen Head → Dynamic Industrial Supplier (Priority 1)
INSERT INTO item_vendors (item_id, vendor_id, priority, unit_price, is_active, created_at, updated_at)
SELECT 
    i.id,
    v.id,
    1,
    0,
    true,
    NOW(),
    NOW()
FROM items i
CROSS JOIN vendors v
WHERE i.code = 'M4X16-ALLEN-HEAD'
  AND v.code = 'DYNAMICINDUSTRIALSUP'
  AND NOT EXISTS (
      SELECT 1 FROM item_vendors WHERE item_id = i.id AND vendor_id = v.id
  )
LIMIT 1;

-- M5x15 plain washer → Dynamic Industrial Supplier (Priority 1)
INSERT INTO item_vendors (item_id, vendor_id, priority, unit_price, is_active, created_at, updated_at)
SELECT 
    i.id,
    v.id,
    1,
    0,
    true,
    NOW(),
    NOW()
FROM items i
CROSS JOIN vendors v
WHERE i.code = 'M5X15-PLAIN-WASHER'
  AND v.code = 'DYNAMICINDUSTRIALSUP'
  AND NOT EXISTS (
      SELECT 1 FROM item_vendors WHERE item_id = i.id AND vendor_id = v.id
  )
LIMIT 1;

-- M4x20 Allen Head → Dynamic Industrial Supplier (Priority 1)
INSERT INTO item_vendors (item_id, vendor_id, priority, unit_price, is_active, created_at, updated_at)
SELECT 
    i.id,
    v.id,
    1,
    0,
    true,
    NOW(),
    NOW()
FROM items i
CROSS JOIN vendors v
WHERE i.code = 'M4X20-ALLEN-HEAD'
  AND v.code = 'DYNAMICINDUSTRIALSUP'
  AND NOT EXISTS (
      SELECT 1 FROM item_vendors WHERE item_id = i.id AND vendor_id = v.id
  )
LIMIT 1;

-- M4x12 Button Head → Dynamic Industrial Supplier (Priority 1)
INSERT INTO item_vendors (item_id, vendor_id, priority, unit_price, is_active, created_at, updated_at)
SELECT 
    i.id,
    v.id,
    1,
    0,
    true,
    NOW(),
    NOW()
FROM items i
CROSS JOIN vendors v
WHERE i.code = 'M4X12-BUTTON-HEAD'
  AND v.code = 'DYNAMICINDUSTRIALSUP'
  AND NOT EXISTS (
      SELECT 1 FROM item_vendors WHERE item_id = i.id AND vendor_id = v.id
  )
LIMIT 1;

-- M4x12 Pan Combi → Dynamic Industrial Supplier (Priority 1)
INSERT INTO item_vendors (item_id, vendor_id, priority, unit_price, is_active, created_at, updated_at)
SELECT 
    i.id,
    v.id,
    1,
    0,
    true,
    NOW(),
    NOW()
FROM items i
CROSS JOIN vendors v
WHERE i.code = 'M4X12-PAN-COMBI'
  AND v.code = 'DYNAMICINDUSTRIALSUP'
  AND NOT EXISTS (
      SELECT 1 FROM item_vendors WHERE item_id = i.id AND vendor_id = v.id
  )
LIMIT 1;

-- M4x12 plain washer → Dynamic Industrial Supplier (Priority 1)
INSERT INTO item_vendors (item_id, vendor_id, priority, unit_price, is_active, created_at, updated_at)
SELECT 
    i.id,
    v.id,
    1,
    0,
    true,
    NOW(),
    NOW()
FROM items i
CROSS JOIN vendors v
WHERE i.code = 'M4X12-PLAIN-WASHER'
  AND v.code = 'DYNAMICINDUSTRIALSUP'
  AND NOT EXISTS (
      SELECT 1 FROM item_vendors WHERE item_id = i.id AND vendor_id = v.id
  )
LIMIT 1;

-- M4 Spring Washer → Dynamic Industrial Supplier (Priority 1)
INSERT INTO item_vendors (item_id, vendor_id, priority, unit_price, is_active, created_at, updated_at)
SELECT 
    i.id,
    v.id,
    1,
    0,
    true,
    NOW(),
    NOW()
FROM items i
CROSS JOIN vendors v
WHERE i.code = 'M4-SPRING-WASHER'
  AND v.code = 'DYNAMICINDUSTRIALSUP'
  AND NOT EXISTS (
      SELECT 1 FROM item_vendors WHERE item_id = i.id AND vendor_id = v.id
  )
LIMIT 1;

-- M4 Nylock → Dynamic Industrial Supplier (Priority 1)
INSERT INTO item_vendors (item_id, vendor_id, priority, unit_price, is_active, created_at, updated_at)
SELECT 
    i.id,
    v.id,
    1,
    0,
    true,
    NOW(),
    NOW()
FROM items i
CROSS JOIN vendors v
WHERE i.code = 'M4-NYLOCK'
  AND v.code = 'DYNAMICINDUSTRIALSUP'
  AND NOT EXISTS (
      SELECT 1 FROM item_vendors WHERE item_id = i.id AND vendor_id = v.id
  )
LIMIT 1;

-- M4 Square Nut → Dynamic Industrial Supplier (Priority 1)
INSERT INTO item_vendors (item_id, vendor_id, priority, unit_price, is_active, created_at, updated_at)
SELECT 
    i.id,
    v.id,
    1,
    0,
    true,
    NOW(),
    NOW()
FROM items i
CROSS JOIN vendors v
WHERE i.code = 'M4-SQUARE-NUT'
  AND v.code = 'DYNAMICINDUSTRIALSUP'
  AND NOT EXISTS (
      SELECT 1 FROM item_vendors WHERE item_id = i.id AND vendor_id = v.id
  )
LIMIT 1;

-- M5x10 Allen Head (AMCA) → Dynamic Industrial Supplier (Priority 1)
INSERT INTO item_vendors (item_id, vendor_id, priority, unit_price, is_active, created_at, updated_at)
SELECT 
    i.id,
    v.id,
    1,
    0,
    true,
    NOW(),
    NOW()
FROM items i
CROSS JOIN vendors v
WHERE i.code = 'M5X10-ALLEN-HEAD'
  AND v.code = 'DYNAMICINDUSTRIALSUP'
  AND NOT EXISTS (
      SELECT 1 FROM item_vendors WHERE item_id = i.id AND vendor_id = v.id
  )
LIMIT 1;

-- M5x10 Pan Torx → Dynamic Industrial Supplier (Priority 1)
INSERT INTO item_vendors (item_id, vendor_id, priority, unit_price, is_active, created_at, updated_at)
SELECT 
    i.id,
    v.id,
    1,
    0,
    true,
    NOW(),
    NOW()
FROM items i
CROSS JOIN vendors v
WHERE i.code = 'M5X10-PAN-TORX'
  AND v.code = 'DYNAMICINDUSTRIALSUP'
  AND NOT EXISTS (
      SELECT 1 FROM item_vendors WHERE item_id = i.id AND vendor_id = v.id
  )
LIMIT 1;

-- M5x10 Grub Screw → Dynamic Industrial Supplier (Priority 1)
INSERT INTO item_vendors (item_id, vendor_id, priority, unit_price, is_active, created_at, updated_at)
SELECT 
    i.id,
    v.id,
    1,
    0,
    true,
    NOW(),
    NOW()
FROM items i
CROSS JOIN vendors v
WHERE i.code = 'M5X10-GRUB-SCREW'
  AND v.code = 'DYNAMICINDUSTRIALSUP'
  AND NOT EXISTS (
      SELECT 1 FROM item_vendors WHERE item_id = i.id AND vendor_id = v.id
  )
LIMIT 1;

-- M6x150 Allen Head → Dynamic Industrial Supplier (Priority 1)
INSERT INTO item_vendors (item_id, vendor_id, priority, unit_price, is_active, created_at, updated_at)
SELECT 
    i.id,
    v.id,
    1,
    0,
    true,
    NOW(),
    NOW()
FROM items i
CROSS JOIN vendors v
WHERE i.code = 'M6X150-ALLEN-HEAD'
  AND v.code = 'DYNAMICINDUSTRIALSUP'
  AND NOT EXISTS (
      SELECT 1 FROM item_vendors WHERE item_id = i.id AND vendor_id = v.id
  )
LIMIT 1;

-- M6 Nylock → Dynamic Industrial Supplier (Priority 1)
INSERT INTO item_vendors (item_id, vendor_id, priority, unit_price, is_active, created_at, updated_at)
SELECT 
    i.id,
    v.id,
    1,
    0,
    true,
    NOW(),
    NOW()
FROM items i
CROSS JOIN vendors v
WHERE i.code = 'M6-NYLOCK'
  AND v.code = 'DYNAMICINDUSTRIALSUP'
  AND NOT EXISTS (
      SELECT 1 FROM item_vendors WHERE item_id = i.id AND vendor_id = v.id
  )
LIMIT 1;

-- M6x15 plain washer → Dynamic Industrial Supplier (Priority 1)
INSERT INTO item_vendors (item_id, vendor_id, priority, unit_price, is_active, created_at, updated_at)
SELECT 
    i.id,
    v.id,
    1,
    0,
    true,
    NOW(),
    NOW()
FROM items i
CROSS JOIN vendors v
WHERE i.code = 'M6X15-PLAIN-WASHER'
  AND v.code = 'DYNAMICINDUSTRIALSUP'
  AND NOT EXISTS (
      SELECT 1 FROM item_vendors WHERE item_id = i.id AND vendor_id = v.id
  )
LIMIT 1;

-- M6x10 Grub Screw → Dynamic Industrial Supplier (Priority 1)
INSERT INTO item_vendors (item_id, vendor_id, priority, unit_price, is_active, created_at, updated_at)
SELECT 
    i.id,
    v.id,
    1,
    0,
    true,
    NOW(),
    NOW()
FROM items i
CROSS JOIN vendors v
WHERE i.code = 'M6X10-GRUB-SCREW'
  AND v.code = 'DYNAMICINDUSTRIALSUP'
  AND NOT EXISTS (
      SELECT 1 FROM item_vendors WHERE item_id = i.id AND vendor_id = v.id
  )
LIMIT 1;

-- Button Head 6x12 → Dynamic Industrial Supplier (Priority 1)
INSERT INTO item_vendors (item_id, vendor_id, priority, unit_price, is_active, created_at, updated_at)
SELECT 
    i.id,
    v.id,
    1,
    0,
    true,
    NOW(),
    NOW()
FROM items i
CROSS JOIN vendors v
WHERE i.code = 'BUTTON-HEAD-6X12'
  AND v.code = 'DYNAMICINDUSTRIALSUP'
  AND NOT EXISTS (
      SELECT 1 FROM item_vendors WHERE item_id = i.id AND vendor_id = v.id
  )
LIMIT 1;

-- M8x20 plain washer → Dynamic Industrial Supplier (Priority 1)
INSERT INTO item_vendors (item_id, vendor_id, priority, unit_price, is_active, created_at, updated_at)
SELECT 
    i.id,
    v.id,
    1,
    0,
    true,
    NOW(),
    NOW()
FROM items i
CROSS JOIN vendors v
WHERE i.code = 'M8X20-PLAIN-WASHER'
  AND v.code = 'DYNAMICINDUSTRIALSUP'
  AND NOT EXISTS (
      SELECT 1 FROM item_vendors WHERE item_id = i.id AND vendor_id = v.id
  )
LIMIT 1;

-- M8x25 Allen Head → Dynamic Industrial Supplier (Priority 1)
INSERT INTO item_vendors (item_id, vendor_id, priority, unit_price, is_active, created_at, updated_at)
SELECT 
    i.id,
    v.id,
    1,
    0,
    true,
    NOW(),
    NOW()
FROM items i
CROSS JOIN vendors v
WHERE i.code = 'M8X25-ALLEN-HEAD'
  AND v.code = 'DYNAMICINDUSTRIALSUP'
  AND NOT EXISTS (
      SELECT 1 FROM item_vendors WHERE item_id = i.id AND vendor_id = v.id
  )
LIMIT 1;

-- Cello Tape → Local Market (Priority 1)
INSERT INTO item_vendors (item_id, vendor_id, priority, unit_price, is_active, created_at, updated_at)
SELECT 
    i.id,
    v.id,
    1,
    0,
    true,
    NOW(),
    NOW()
FROM items i
CROSS JOIN vendors v
WHERE i.code = 'CELLO-TAPE'
  AND v.code = 'LOCALMARKET'
  AND NOT EXISTS (
      SELECT 1 FROM item_vendors WHERE item_id = i.id AND vendor_id = v.id
  )
LIMIT 1;

-- Copper Strips 3x2 cells → Naveen (Priority 1)
INSERT INTO item_vendors (item_id, vendor_id, priority, unit_price, is_active, created_at, updated_at)
SELECT 
    i.id,
    v.id,
    1,
    10.0,
    true,
    NOW(),
    NOW()
FROM items i
CROSS JOIN vendors v
WHERE i.code = 'COPPER-STRIPS-3X2'
  AND v.code = 'NAVEEN'
  AND NOT EXISTS (
      SELECT 1 FROM item_vendors WHERE item_id = i.id AND vendor_id = v.id
  )
LIMIT 1;

-- 70mm Paper Separator → ARB Accessories (Priority 1)
INSERT INTO item_vendors (item_id, vendor_id, priority, unit_price, is_active, created_at, updated_at)
SELECT 
    i.id,
    v.id,
    1,
    11.5,
    true,
    NOW(),
    NOW()
FROM items i
CROSS JOIN vendors v
WHERE i.code = '70MM-PAPER-SEPARATOR'
  AND v.code = 'ARBACCESSORIES'
  AND NOT EXISTS (
      SELECT 1 FROM item_vendors WHERE item_id = i.id AND vendor_id = v.id
  )
LIMIT 1;

-- Barley paper for 21700 cylindrical cell → ARB Accessories (Priority 1)
INSERT INTO item_vendors (item_id, vendor_id, priority, unit_price, is_active, created_at, updated_at)
SELECT 
    i.id,
    v.id,
    1,
    1.0,
    true,
    NOW(),
    NOW()
FROM items i
CROSS JOIN vendors v
WHERE i.code = 'BARLEY-PAPER-FOR'
  AND v.code = 'ARBACCESSORIES'
  AND NOT EXISTS (
      SELECT 1 FROM item_vendors WHERE item_id = i.id AND vendor_id = v.id
  )
LIMIT 1;

-- 2S BMS → ARB Accessories (Priority 1)
INSERT INTO item_vendors (item_id, vendor_id, priority, unit_price, is_active, created_at, updated_at)
SELECT 
    i.id,
    v.id,
    1,
    35.0,
    true,
    NOW(),
    NOW()
FROM items i
CROSS JOIN vendors v
WHERE i.code = '2S-BMS'
  AND v.code = 'ARBACCESSORIES'
  AND NOT EXISTS (
      SELECT 1 FROM item_vendors WHERE item_id = i.id AND vendor_id = v.id
  )
LIMIT 1;

-- 3S BMS → ARB Accessories (Priority 1)
INSERT INTO item_vendors (item_id, vendor_id, priority, unit_price, is_active, created_at, updated_at)
SELECT 
    i.id,
    v.id,
    1,
    50.0,
    true,
    NOW(),
    NOW()
FROM items i
CROSS JOIN vendors v
WHERE i.code = '3S-BMS'
  AND v.code = 'ARBACCESSORIES'
  AND NOT EXISTS (
      SELECT 1 FROM item_vendors WHERE item_id = i.id AND vendor_id = v.id
  )
LIMIT 1;

-- 16AWG Lead → ARB Accessories (Priority 1)
INSERT INTO item_vendors (item_id, vendor_id, priority, unit_price, is_active, created_at, updated_at)
SELECT 
    i.id,
    v.id,
    1,
    1.3,
    true,
    NOW(),
    NOW()
FROM items i
CROSS JOIN vendors v
WHERE i.code = '16AWG-LEAD'
  AND v.code = 'ARBACCESSORIES'
  AND NOT EXISTS (
      SELECT 1 FROM item_vendors WHERE item_id = i.id AND vendor_id = v.id
  )
LIMIT 1;

-- 130x80x60 enclosure box → NDP (Priority 1)
INSERT INTO item_vendors (item_id, vendor_id, priority, unit_price, is_active, created_at, updated_at)
SELECT 
    i.id,
    v.id,
    1,
    260.0,
    true,
    NOW(),
    NOW()
FROM items i
CROSS JOIN vendors v
WHERE i.code = '130X80X60-ENCLOSURE-BOX'
  AND v.code = 'NDP'
  AND NOT EXISTS (
      SELECT 1 FROM item_vendors WHERE item_id = i.id AND vendor_id = v.id
  )
LIMIT 1;

-- PG-7 Cable Gland → NDP (Priority 1)
INSERT INTO item_vendors (item_id, vendor_id, priority, unit_price, is_active, created_at, updated_at)
SELECT 
    i.id,
    v.id,
    1,
    15.0,
    true,
    NOW(),
    NOW()
FROM items i
CROSS JOIN vendors v
WHERE i.code = 'PG7-CABLE-GLAND'
  AND v.code = 'NDP'
  AND NOT EXISTS (
      SELECT 1 FROM item_vendors WHERE item_id = i.id AND vendor_id = v.id
  )
LIMIT 1;

-- PG-9 Cable Gland(PG -11) → NDP (Priority 1)
INSERT INTO item_vendors (item_id, vendor_id, priority, unit_price, is_active, created_at, updated_at)
SELECT 
    i.id,
    v.id,
    1,
    15.0,
    true,
    NOW(),
    NOW()
FROM items i
CROSS JOIN vendors v
WHERE i.code = 'PG9-CABLE-GLANDPG'
  AND v.code = 'NDP'
  AND NOT EXISTS (
      SELECT 1 FROM item_vendors WHERE item_id = i.id AND vendor_id = v.id
  )
LIMIT 1;

-- Solid coupling (Aluminium) → Bagnan (Priority 1)
INSERT INTO item_vendors (item_id, vendor_id, priority, unit_price, is_active, created_at, updated_at)
SELECT 
    i.id,
    v.id,
    1,
    0,
    true,
    NOW(),
    NOW()
FROM items i
CROSS JOIN vendors v
WHERE i.code = 'SOLID-COUPLING-ALUMINIUM'
  AND v.code = 'BAGNAN'
  AND NOT EXISTS (
      SELECT 1 FROM item_vendors WHERE item_id = i.id AND vendor_id = v.id
  )
LIMIT 1;

-- Rotex14 Coupling → Himalaya Traders (Priority 1)
INSERT INTO item_vendors (item_id, vendor_id, priority, unit_price, is_active, created_at, updated_at)
SELECT 
    i.id,
    v.id,
    1,
    1500.0,
    true,
    NOW(),
    NOW()
FROM items i
CROSS JOIN vendors v
WHERE i.code = 'ROTEX14-COUPLING'
  AND v.code = 'HIMALAYATRADERS'
  AND NOT EXISTS (
      SELECT 1 FROM item_vendors WHERE item_id = i.id AND vendor_id = v.id
  )
LIMIT 1;

-- Electronic Box → Janki Die (Priority 1)
INSERT INTO item_vendors (item_id, vendor_id, priority, unit_price, is_active, created_at, updated_at)
SELECT 
    i.id,
    v.id,
    1,
    3000.0,
    true,
    NOW(),
    NOW()
FROM items i
CROSS JOIN vendors v
WHERE i.code = 'ELECTRONIC-BOX'
  AND v.code = 'JANKIDIE'
  AND NOT EXISTS (
      SELECT 1 FROM item_vendors WHERE item_id = i.id AND vendor_id = v.id
  )
LIMIT 1;

-- Front Lid → Janki Die (Priority 1)
INSERT INTO item_vendors (item_id, vendor_id, priority, unit_price, is_active, created_at, updated_at)
SELECT 
    i.id,
    v.id,
    1,
    1100.0,
    true,
    NOW(),
    NOW()
FROM items i
CROSS JOIN vendors v
WHERE i.code = 'FRONT-LID'
  AND v.code = 'JANKIDIE'
  AND NOT EXISTS (
      SELECT 1 FROM item_vendors WHERE item_id = i.id AND vendor_id = v.id
  )
LIMIT 1;

-- Bottom Block (Inlet Block) → Janki Die (Priority 1)
INSERT INTO item_vendors (item_id, vendor_id, priority, unit_price, is_active, created_at, updated_at)
SELECT 
    i.id,
    v.id,
    1,
    1000.0,
    true,
    NOW(),
    NOW()
FROM items i
CROSS JOIN vendors v
WHERE i.code = 'BOTTOM-BLOCK-INLET'
  AND v.code = 'JANKIDIE'
  AND NOT EXISTS (
      SELECT 1 FROM item_vendors WHERE item_id = i.id AND vendor_id = v.id
  )
LIMIT 1;

-- IP Remote Upper Shell → Webel (Priority 1)
INSERT INTO item_vendors (item_id, vendor_id, priority, unit_price, is_active, created_at, updated_at)
SELECT 
    i.id,
    v.id,
    1,
    1000.0,
    true,
    NOW(),
    NOW()
FROM items i
CROSS JOIN vendors v
WHERE i.code = 'IP-REMOTE-UPPER'
  AND v.code = 'WEBEL'
  AND NOT EXISTS (
      SELECT 1 FROM item_vendors WHERE item_id = i.id AND vendor_id = v.id
  )
LIMIT 1;

-- IP Remote Lower Shell → Webel (Priority 1)
INSERT INTO item_vendors (item_id, vendor_id, priority, unit_price, is_active, created_at, updated_at)
SELECT 
    i.id,
    v.id,
    1,
    1000.0,
    true,
    NOW(),
    NOW()
FROM items i
CROSS JOIN vendors v
WHERE i.code = 'IP-REMOTE-LOWER'
  AND v.code = 'WEBEL'
  AND NOT EXISTS (
      SELECT 1 FROM item_vendors WHERE item_id = i.id AND vendor_id = v.id
  )
LIMIT 1;

-- Flashing Light glass → Janki Die (Priority 1)
INSERT INTO item_vendors (item_id, vendor_id, priority, unit_price, is_active, created_at, updated_at)
SELECT 
    i.id,
    v.id,
    1,
    1000.0,
    true,
    NOW(),
    NOW()
FROM items i
CROSS JOIN vendors v
WHERE i.code = 'FLASHING-LIGHT-GLASS'
  AND v.code = 'JANKIDIE'
  AND NOT EXISTS (
      SELECT 1 FROM item_vendors WHERE item_id = i.id AND vendor_id = v.id
  )
LIMIT 1;

-- Flashing Light bottom plate → Janki Die (Priority 1)
INSERT INTO item_vendors (item_id, vendor_id, priority, unit_price, is_active, created_at, updated_at)
SELECT 
    i.id,
    v.id,
    1,
    1000.0,
    true,
    NOW(),
    NOW()
FROM items i
CROSS JOIN vendors v
WHERE i.code = 'FLASHING-LIGHT-BOTTOM'
  AND v.code = 'JANKIDIE'
  AND NOT EXISTS (
      SELECT 1 FROM item_vendors WHERE item_id = i.id AND vendor_id = v.id
  )
LIMIT 1;

-- PU Gasket Remote Lower Shell → PrathameshTechnology & Industries (Priority 1)
INSERT INTO item_vendors (item_id, vendor_id, priority, unit_price, is_active, created_at, updated_at)
SELECT 
    i.id,
    v.id,
    1,
    100.0,
    true,
    NOW(),
    NOW()
FROM items i
CROSS JOIN vendors v
WHERE i.code = 'PU-GASKET-REMOTE'
  AND v.code = 'PRATHAMESHTECHNOLOGY'
  AND NOT EXISTS (
      SELECT 1 FROM item_vendors WHERE item_id = i.id AND vendor_id = v.id
  )
LIMIT 1;

-- PU Gasket Electronic Box → PrathameshTechnology & Industries (Priority 1)
INSERT INTO item_vendors (item_id, vendor_id, priority, unit_price, is_active, created_at, updated_at)
SELECT 
    i.id,
    v.id,
    1,
    100.0,
    true,
    NOW(),
    NOW()
FROM items i
CROSS JOIN vendors v
WHERE i.code = 'PU-GASKET-ELECTRONIC'
  AND v.code = 'PRATHAMESHTECHNOLOGY'
  AND NOT EXISTS (
      SELECT 1 FROM item_vendors WHERE item_id = i.id AND vendor_id = v.id
  )
LIMIT 1;

-- PU Gasket Front Lid → PrathameshTechnology & Industries (Priority 1)
INSERT INTO item_vendors (item_id, vendor_id, priority, unit_price, is_active, created_at, updated_at)
SELECT 
    i.id,
    v.id,
    1,
    100.0,
    true,
    NOW(),
    NOW()
FROM items i
CROSS JOIN vendors v
WHERE i.code = 'PU-GASKET-FRONT'
  AND v.code = 'PRATHAMESHTECHNOLOGY'
  AND NOT EXISTS (
      SELECT 1 FROM item_vendors WHERE item_id = i.id AND vendor_id = v.id
  )
LIMIT 1;

-- Heatshrink Tube 6.4:1.6 → Suzhou Volsun Electronics Technology (Priority 1)
INSERT INTO item_vendors (item_id, vendor_id, priority, unit_price, is_active, created_at, updated_at)
SELECT 
    i.id,
    v.id,
    1,
    35.0,
    true,
    NOW(),
    NOW()
FROM items i
CROSS JOIN vendors v
WHERE i.code = 'HEATSHRINK-TUBE-6416'
  AND v.code = 'SUZHOUVOLSUNELECTRON'
  AND NOT EXISTS (
      SELECT 1 FROM item_vendors WHERE item_id = i.id AND vendor_id = v.id
  )
LIMIT 1;

-- Heatshrink Tube 9:3 → Suzhou Volsun Electronics Technology (Priority 1)
INSERT INTO item_vendors (item_id, vendor_id, priority, unit_price, is_active, created_at, updated_at)
SELECT 
    i.id,
    v.id,
    1,
    64.0,
    true,
    NOW(),
    NOW()
FROM items i
CROSS JOIN vendors v
WHERE i.code = 'HEATSHRINK-TUBE-93'
  AND v.code = 'SUZHOUVOLSUNELECTRON'
  AND NOT EXISTS (
      SELECT 1 FROM item_vendors WHERE item_id = i.id AND vendor_id = v.id
  )
LIMIT 1;

-- HeatShrink Tube 4:1 → Suzhou Volsun Electronics Technology (Priority 1)
INSERT INTO item_vendors (item_id, vendor_id, priority, unit_price, is_active, created_at, updated_at)
SELECT 
    i.id,
    v.id,
    1,
    30.0,
    true,
    NOW(),
    NOW()
FROM items i
CROSS JOIN vendors v
WHERE i.code = 'HEATSHRINK-TUBE-41'
  AND v.code = 'SUZHOUVOLSUNELECTRON'
  AND NOT EXISTS (
      SELECT 1 FROM item_vendors WHERE item_id = i.id AND vendor_id = v.id
  )
LIMIT 1;

-- HeatShrink Tube 3:1 → Suzhou Volsun Electronics Technology (Priority 1)
INSERT INTO item_vendors (item_id, vendor_id, priority, unit_price, is_active, created_at, updated_at)
SELECT 
    i.id,
    v.id,
    1,
    30.0,
    true,
    NOW(),
    NOW()
FROM items i
CROSS JOIN vendors v
WHERE i.code = 'HEATSHRINK-TUBE-31'
  AND v.code = 'SUZHOUVOLSUNELECTRON'
  AND NOT EXISTS (
      SELECT 1 FROM item_vendors WHERE item_id = i.id AND vendor_id = v.id
  )
LIMIT 1;

-- HeatShrink Tube 12:3 → Suzhou Volsun Electronics Technology (Priority 1)
INSERT INTO item_vendors (item_id, vendor_id, priority, unit_price, is_active, created_at, updated_at)
SELECT 
    i.id,
    v.id,
    1,
    50.0,
    true,
    NOW(),
    NOW()
FROM items i
CROSS JOIN vendors v
WHERE i.code = 'HEATSHRINK-TUBE-123'
  AND v.code = 'SUZHOUVOLSUNELECTRON'
  AND NOT EXISTS (
      SELECT 1 FROM item_vendors WHERE item_id = i.id AND vendor_id = v.id
  )
LIMIT 1;

-- HeatShrink Tube 4.8/1.2 → Suzhou Volsun Electronics Technology (Priority 1)
INSERT INTO item_vendors (item_id, vendor_id, priority, unit_price, is_active, created_at, updated_at)
SELECT 
    i.id,
    v.id,
    1,
    50.0,
    true,
    NOW(),
    NOW()
FROM items i
CROSS JOIN vendors v
WHERE i.code = 'HEATSHRINK-TUBE-4812'
  AND v.code = 'SUZHOUVOLSUNELECTRON'
  AND NOT EXISTS (
      SELECT 1 FROM item_vendors WHERE item_id = i.id AND vendor_id = v.id
  )
LIMIT 1;

-- HeatShrink Tube 1.5mm/1.6mm → Suzhou Volsun Electronics Technology (Priority 1)
INSERT INTO item_vendors (item_id, vendor_id, priority, unit_price, is_active, created_at, updated_at)
SELECT 
    i.id,
    v.id,
    1,
    8.0,
    true,
    NOW(),
    NOW()
FROM items i
CROSS JOIN vendors v
WHERE i.code = 'HEATSHRINK-TUBE-15MM16MM'
  AND v.code = 'SUZHOUVOLSUNELECTRON'
  AND NOT EXISTS (
      SELECT 1 FROM item_vendors WHERE item_id = i.id AND vendor_id = v.id
  )
LIMIT 1;

-- HeatShrink Tube 100mm → Suzhou Volsun Electronics Technology (Priority 1)
INSERT INTO item_vendors (item_id, vendor_id, priority, unit_price, is_active, created_at, updated_at)
SELECT 
    i.id,
    v.id,
    1,
    265.0,
    true,
    NOW(),
    NOW()
FROM items i
CROSS JOIN vendors v
WHERE i.code = 'HEATSHRINK-TUBE-100MM'
  AND v.code = 'SUZHOUVOLSUNELECTRON'
  AND NOT EXISTS (
      SELECT 1 FROM item_vendors WHERE item_id = i.id AND vendor_id = v.id
  )
LIMIT 1;

-- Heatsink paste → Hi Tech (Priority 1)
INSERT INTO item_vendors (item_id, vendor_id, priority, unit_price, is_active, created_at, updated_at)
SELECT 
    i.id,
    v.id,
    1,
    2.0,
    true,
    NOW(),
    NOW()
FROM items i
CROSS JOIN vendors v
WHERE i.code = 'HEATSINK-PASTE'
  AND v.code = 'HITECH'
  AND NOT EXISTS (
      SELECT 1 FROM item_vendors WHERE item_id = i.id AND vendor_id = v.id
  )
LIMIT 1;

-- Teroson MS930 → Innovine Tech Marketing PVt. Ltd. (Priority 1)
INSERT INTO item_vendors (item_id, vendor_id, priority, unit_price, is_active, created_at, updated_at)
SELECT 
    i.id,
    v.id,
    1,
    2.0,
    true,
    NOW(),
    NOW()
FROM items i
CROSS JOIN vendors v
WHERE i.code = 'TEROSON-MS930'
  AND v.code = 'INNOVINETECHMARKETIN'
  AND NOT EXISTS (
      SELECT 1 FROM item_vendors WHERE item_id = i.id AND vendor_id = v.id
  )
LIMIT 1;

-- Silicon RTV 732 → Hi Tech (Priority 1)
INSERT INTO item_vendors (item_id, vendor_id, priority, unit_price, is_active, created_at, updated_at)
SELECT 
    i.id,
    v.id,
    1,
    1.0,
    true,
    NOW(),
    NOW()
FROM items i
CROSS JOIN vendors v
WHERE i.code = 'SILICON-RTV-732'
  AND v.code = 'HITECH'
  AND NOT EXISTS (
      SELECT 1 FROM item_vendors WHERE item_id = i.id AND vendor_id = v.id
  )
LIMIT 1;

-- Silicon RTV 734 Potting compound → Hi Tech (Priority 1)
INSERT INTO item_vendors (item_id, vendor_id, priority, unit_price, is_active, created_at, updated_at)
SELECT 
    i.id,
    v.id,
    1,
    2.0,
    true,
    NOW(),
    NOW()
FROM items i
CROSS JOIN vendors v
WHERE i.code = 'SILICON-RTV-734'
  AND v.code = 'HITECH'
  AND NOT EXISTS (
      SELECT 1 FROM item_vendors WHERE item_id = i.id AND vendor_id = v.id
  )
LIMIT 1;

-- 1" Masking Tape → Hi Tech (Priority 1)
INSERT INTO item_vendors (item_id, vendor_id, priority, unit_price, is_active, created_at, updated_at)
SELECT 
    i.id,
    v.id,
    1,
    2.0,
    true,
    NOW(),
    NOW()
FROM items i
CROSS JOIN vendors v
WHERE i.code = '1-MASKING-TAPE'
  AND v.code = 'HITECH'
  AND NOT EXISTS (
      SELECT 1 FROM item_vendors WHERE item_id = i.id AND vendor_id = v.id
  )
LIMIT 1;

-- RR Tape → Hi Tech (Priority 1)
INSERT INTO item_vendors (item_id, vendor_id, priority, unit_price, is_active, created_at, updated_at)
SELECT 
    i.id,
    v.id,
    1,
    50.0,
    true,
    NOW(),
    NOW()
FROM items i
CROSS JOIN vendors v
WHERE i.code = 'RR-TAPE'
  AND v.code = 'HITECH'
  AND NOT EXISTS (
      SELECT 1 FROM item_vendors WHERE item_id = i.id AND vendor_id = v.id
  )
LIMIT 1;

-- FlexBond → Hi Tech (Priority 1)
INSERT INTO item_vendors (item_id, vendor_id, priority, unit_price, is_active, created_at, updated_at)
SELECT 
    i.id,
    v.id,
    1,
    3.0,
    true,
    NOW(),
    NOW()
FROM items i
CROSS JOIN vendors v
WHERE i.code = 'FLEXBOND'
  AND v.code = 'HITECH'
  AND NOT EXISTS (
      SELECT 1 FROM item_vendors WHERE item_id = i.id AND vendor_id = v.id
  )
LIMIT 1;

-- Staples pins → Hi Tech (Priority 1)
INSERT INTO item_vendors (item_id, vendor_id, priority, unit_price, is_active, created_at, updated_at)
SELECT 
    i.id,
    v.id,
    1,
    0.25,
    true,
    NOW(),
    NOW()
FROM items i
CROSS JOIN vendors v
WHERE i.code = 'STAPLES-PINS'
  AND v.code = 'HITECH'
  AND NOT EXISTS (
      SELECT 1 FROM item_vendors WHERE item_id = i.id AND vendor_id = v.id
  )
LIMIT 1;

-- Brass nozzle for water outlet from JCB → AliHussain Bharmal (Priority 1)
INSERT INTO item_vendors (item_id, vendor_id, priority, unit_price, is_active, created_at, updated_at)
SELECT 
    i.id,
    v.id,
    1,
    70.0,
    true,
    NOW(),
    NOW()
FROM items i
CROSS JOIN vendors v
WHERE i.code = 'BRASS-NOZZLE-FOR'
  AND v.code = 'ALIHUSSAINBHARMAL'
  AND NOT EXISTS (
      SELECT 1 FROM item_vendors WHERE item_id = i.id AND vendor_id = v.id
  )
LIMIT 1;

-- SS Cooling Water Outlet nozzle → AliHussain Bharmal (Priority 1)
INSERT INTO item_vendors (item_id, vendor_id, priority, unit_price, is_active, created_at, updated_at)
SELECT 
    i.id,
    v.id,
    1,
    100.0,
    true,
    NOW(),
    NOW()
FROM items i
CROSS JOIN vendors v
WHERE i.code = 'SS-COOLING-WATER'
  AND v.code = 'ALIHUSSAINBHARMAL'
  AND NOT EXISTS (
      SELECT 1 FROM item_vendors WHERE item_id = i.id AND vendor_id = v.id
  )
LIMIT 1;

-- SS Cooling Water Inlet nozzle → AliHussain Bharmal (Priority 1)
INSERT INTO item_vendors (item_id, vendor_id, priority, unit_price, is_active, created_at, updated_at)
SELECT 
    i.id,
    v.id,
    1,
    100.0,
    true,
    NOW(),
    NOW()
FROM items i
CROSS JOIN vendors v
WHERE i.code = 'SS-COOLING-WATER'
  AND v.code = 'ALIHUSSAINBHARMAL'
  AND NOT EXISTS (
      SELECT 1 FROM item_vendors WHERE item_id = i.id AND vendor_id = v.id
  )
LIMIT 1;

-- Greasing nozzle → AliHussain Bharmal (Priority 1)
INSERT INTO item_vendors (item_id, vendor_id, priority, unit_price, is_active, created_at, updated_at)
SELECT 
    i.id,
    v.id,
    1,
    100.0,
    true,
    NOW(),
    NOW()
FROM items i
CROSS JOIN vendors v
WHERE i.code = 'GREASING-NOZZLE'
  AND v.code = 'ALIHUSSAINBHARMAL'
  AND NOT EXISTS (
      SELECT 1 FROM item_vendors WHERE item_id = i.id AND vendor_id = v.id
  )
LIMIT 1;

-- Nozzle on Jet → AliHussain Bharmal (Priority 1)
INSERT INTO item_vendors (item_id, vendor_id, priority, unit_price, is_active, created_at, updated_at)
SELECT 
    i.id,
    v.id,
    1,
    100.0,
    true,
    NOW(),
    NOW()
FROM items i
CROSS JOIN vendors v
WHERE i.code = 'NOZZLE-ON-JET'
  AND v.code = 'ALIHUSSAINBHARMAL'
  AND NOT EXISTS (
      SELECT 1 FROM item_vendors WHERE item_id = i.id AND vendor_id = v.id
  )
LIMIT 1;

-- Silicon hose pipe clip 7mm → Local Market Kolkata (Priority 1)
INSERT INTO item_vendors (item_id, vendor_id, priority, unit_price, is_active, created_at, updated_at)
SELECT 
    i.id,
    v.id,
    1,
    13.0,
    true,
    NOW(),
    NOW()
FROM items i
CROSS JOIN vendors v
WHERE i.code = 'SILICON-HOSE-PIPE'
  AND v.code = 'LOCALMARKETKOLKATA'
  AND NOT EXISTS (
      SELECT 1 FROM item_vendors WHERE item_id = i.id AND vendor_id = v.id
  )
LIMIT 1;

-- Water Jet S52 → Bagnan (Priority 1)
INSERT INTO item_vendors (item_id, vendor_id, priority, unit_price, is_active, created_at, updated_at)
SELECT 
    i.id,
    v.id,
    1,
    10000.0,
    true,
    NOW(),
    NOW()
FROM items i
CROSS JOIN vendors v
WHERE i.code = 'WATER-JET-S52'
  AND v.code = 'BAGNAN'
  AND NOT EXISTS (
      SELECT 1 FROM item_vendors WHERE item_id = i.id AND vendor_id = v.id
  )
LIMIT 1;

-- ESC Mounting Plate → Balaji - PB Manufacturing (Priority 1)
INSERT INTO item_vendors (item_id, vendor_id, priority, unit_price, is_active, created_at, updated_at)
SELECT 
    i.id,
    v.id,
    1,
    200.0,
    true,
    NOW(),
    NOW()
FROM items i
CROSS JOIN vendors v
WHERE i.code = 'ESC-MOUNTING-PLATE'
  AND v.code = 'BALAJIPBMANUFACTURIN'
  AND NOT EXISTS (
      SELECT 1 FROM item_vendors WHERE item_id = i.id AND vendor_id = v.id
  )
LIMIT 1;

-- Jet S52 Mounting plate → Bagnan (Priority 1)
INSERT INTO item_vendors (item_id, vendor_id, priority, unit_price, is_active, created_at, updated_at)
SELECT 
    i.id,
    v.id,
    1,
    1500.0,
    true,
    NOW(),
    NOW()
FROM items i
CROSS JOIN vendors v
WHERE i.code = 'JET-S52-MOUNTING'
  AND v.code = 'BAGNAN'
  AND NOT EXISTS (
      SELECT 1 FROM item_vendors WHERE item_id = i.id AND vendor_id = v.id
  )
LIMIT 1;

-- Motor mount heatblock TOP → Bagnan (Priority 1)
INSERT INTO item_vendors (item_id, vendor_id, priority, unit_price, is_active, created_at, updated_at)
SELECT 
    i.id,
    v.id,
    1,
    3000.0,
    true,
    NOW(),
    NOW()
FROM items i
CROSS JOIN vendors v
WHERE i.code = 'MOTOR-MOUNT-HEATBLOCK'
  AND v.code = 'BAGNAN'
  AND NOT EXISTS (
      SELECT 1 FROM item_vendors WHERE item_id = i.id AND vendor_id = v.id
  )
LIMIT 1;

-- Motor mount heatblock BOTTOM → Bagnan (Priority 1)
INSERT INTO item_vendors (item_id, vendor_id, priority, unit_price, is_active, created_at, updated_at)
SELECT 
    i.id,
    v.id,
    1,
    3000.0,
    true,
    NOW(),
    NOW()
FROM items i
CROSS JOIN vendors v
WHERE i.code = 'MOTOR-MOUNT-HEATBLOCK'
  AND v.code = 'BAGNAN'
  AND NOT EXISTS (
      SELECT 1 FROM item_vendors WHERE item_id = i.id AND vendor_id = v.id
  )
LIMIT 1;

-- Aluminium Sheet 2mm thick 4ftx2ft → Local Market (Priority 1)
INSERT INTO item_vendors (item_id, vendor_id, priority, unit_price, is_active, created_at, updated_at)
SELECT 
    i.id,
    v.id,
    1,
    0,
    true,
    NOW(),
    NOW()
FROM items i
CROSS JOIN vendors v
WHERE i.code = 'ALUMINIUM-SHEET-2MM'
  AND v.code = 'LOCALMARKET'
  AND NOT EXISTS (
      SELECT 1 FROM item_vendors WHERE item_id = i.id AND vendor_id = v.id
  )
LIMIT 1;

-- Heat condensor/Jet Heat Sink → Bagnan (Priority 1)
INSERT INTO item_vendors (item_id, vendor_id, priority, unit_price, is_active, created_at, updated_at)
SELECT 
    i.id,
    v.id,
    1,
    0,
    true,
    NOW(),
    NOW()
FROM items i
CROSS JOIN vendors v
WHERE i.code = 'HEAT-CONDENSORJET-HEAT'
  AND v.code = 'BAGNAN'
  AND NOT EXISTS (
      SELECT 1 FROM item_vendors WHERE item_id = i.id AND vendor_id = v.id
  )
LIMIT 1;

-- Copper heat pipe (set of 2) → Svtherm Technologies (Priority 1)
INSERT INTO item_vendors (item_id, vendor_id, priority, unit_price, is_active, created_at, updated_at)
SELECT 
    i.id,
    v.id,
    1,
    0,
    true,
    NOW(),
    NOW()
FROM items i
CROSS JOIN vendors v
WHERE i.code = 'COPPER-HEAT-PIPE'
  AND v.code = 'SVTHERMTECHNOLOGIES'
  AND NOT EXISTS (
      SELECT 1 FROM item_vendors WHERE item_id = i.id AND vendor_id = v.id
  )
LIMIT 1;

-- STBD Aft Plate → Balaji - PB Manufacturing (Priority 1)
INSERT INTO item_vendors (item_id, vendor_id, priority, unit_price, is_active, created_at, updated_at)
SELECT 
    i.id,
    v.id,
    1,
    2000.0,
    true,
    NOW(),
    NOW()
FROM items i
CROSS JOIN vendors v
WHERE i.code = 'STBD-AFT-PLATE'
  AND v.code = 'BALAJIPBMANUFACTURIN'
  AND NOT EXISTS (
      SELECT 1 FROM item_vendors WHERE item_id = i.id AND vendor_id = v.id
  )
LIMIT 1;

-- PORT Aft Plate → Balaji - PB Manufacturing (Priority 1)
INSERT INTO item_vendors (item_id, vendor_id, priority, unit_price, is_active, created_at, updated_at)
SELECT 
    i.id,
    v.id,
    1,
    2000.0,
    true,
    NOW(),
    NOW()
FROM items i
CROSS JOIN vendors v
WHERE i.code = 'PORT-AFT-PLATE'
  AND v.code = 'BALAJIPBMANUFACTURIN'
  AND NOT EXISTS (
      SELECT 1 FROM item_vendors WHERE item_id = i.id AND vendor_id = v.id
  )
LIMIT 1;

-- 3D printed SR Pillow Side Caps 3D Print → Robu 3D print (Priority 1)
INSERT INTO item_vendors (item_id, vendor_id, priority, unit_price, is_active, created_at, updated_at)
SELECT 
    i.id,
    v.id,
    1,
    25.0,
    true,
    NOW(),
    NOW()
FROM items i
CROSS JOIN vendors v
WHERE i.code = '3D-PRINTED-SR'
  AND v.code = 'ROBU3DPRINT'
  AND NOT EXISTS (
      SELECT 1 FROM item_vendors WHERE item_id = i.id AND vendor_id = v.id
  )
LIMIT 1;

-- 3D printed SR Pillow Middle Caps 3D Print → Robu 3D print (Priority 1)
INSERT INTO item_vendors (item_id, vendor_id, priority, unit_price, is_active, created_at, updated_at)
SELECT 
    i.id,
    v.id,
    1,
    25.0,
    true,
    NOW(),
    NOW()
FROM items i
CROSS JOIN vendors v
WHERE i.code = '3D-PRINTED-SR'
  AND v.code = 'ROBU3DPRINT'
  AND NOT EXISTS (
      SELECT 1 FROM item_vendors WHERE item_id = i.id AND vendor_id = v.id
  )
LIMIT 1;

-- 3D printed bottom block caps → Robu 3D print (Priority 1)
INSERT INTO item_vendors (item_id, vendor_id, priority, unit_price, is_active, created_at, updated_at)
SELECT 
    i.id,
    v.id,
    1,
    20.0,
    true,
    NOW(),
    NOW()
FROM items i
CROSS JOIN vendors v
WHERE i.code = '3D-PRINTED-BOTTOM'
  AND v.code = 'ROBU3DPRINT'
  AND NOT EXISTS (
      SELECT 1 FROM item_vendors WHERE item_id = i.id AND vendor_id = v.id
  )
LIMIT 1;

-- Button spacer No. 1/1 3D Print → In-house (Priority 1)
INSERT INTO item_vendors (item_id, vendor_id, priority, unit_price, is_active, created_at, updated_at)
SELECT 
    i.id,
    v.id,
    1,
    20.0,
    true,
    NOW(),
    NOW()
FROM items i
CROSS JOIN vendors v
WHERE i.code = 'BUTTON-SPACER-NO'
  AND v.code = 'INHOUSE'
  AND NOT EXISTS (
      SELECT 1 FROM item_vendors WHERE item_id = i.id AND vendor_id = v.id
  )
LIMIT 1;

-- Button Spacer No. 1/2 3D Print → In-house (Priority 1)
INSERT INTO item_vendors (item_id, vendor_id, priority, unit_price, is_active, created_at, updated_at)
SELECT 
    i.id,
    v.id,
    1,
    20.0,
    true,
    NOW(),
    NOW()
FROM items i
CROSS JOIN vendors v
WHERE i.code = 'BUTTON-SPACER-NO'
  AND v.code = 'INHOUSE'
  AND NOT EXISTS (
      SELECT 1 FROM item_vendors WHERE item_id = i.id AND vendor_id = v.id
  )
LIMIT 1;

-- Button Spacer No. 2 3D Print → In-house (Priority 1)
INSERT INTO item_vendors (item_id, vendor_id, priority, unit_price, is_active, created_at, updated_at)
SELECT 
    i.id,
    v.id,
    1,
    20.0,
    true,
    NOW(),
    NOW()
FROM items i
CROSS JOIN vendors v
WHERE i.code = 'BUTTON-SPACER-NO'
  AND v.code = 'INHOUSE'
  AND NOT EXISTS (
      SELECT 1 FROM item_vendors WHERE item_id = i.id AND vendor_id = v.id
  )
LIMIT 1;

-- Button No. 1 pressure bracket 3D Print → In-house (Priority 1)
INSERT INTO item_vendors (item_id, vendor_id, priority, unit_price, is_active, created_at, updated_at)
SELECT 
    i.id,
    v.id,
    1,
    20.0,
    true,
    NOW(),
    NOW()
FROM items i
CROSS JOIN vendors v
WHERE i.code = 'BUTTON-NO-1'
  AND v.code = 'INHOUSE'
  AND NOT EXISTS (
      SELECT 1 FROM item_vendors WHERE item_id = i.id AND vendor_id = v.id
  )
LIMIT 1;

-- Remote Battery Holding Bracket 3D Print → In-house (Priority 1)
INSERT INTO item_vendors (item_id, vendor_id, priority, unit_price, is_active, created_at, updated_at)
SELECT 
    i.id,
    v.id,
    1,
    20.0,
    true,
    NOW(),
    NOW()
FROM items i
CROSS JOIN vendors v
WHERE i.code = 'REMOTE-BATTERY-HOLDING'
  AND v.code = 'INHOUSE'
  AND NOT EXISTS (
      SELECT 1 FROM item_vendors WHERE item_id = i.id AND vendor_id = v.id
  )
LIMIT 1;

-- Antenna clamp -1 3D Print → In-house (Priority 1)
INSERT INTO item_vendors (item_id, vendor_id, priority, unit_price, is_active, created_at, updated_at)
SELECT 
    i.id,
    v.id,
    1,
    20.0,
    true,
    NOW(),
    NOW()
FROM items i
CROSS JOIN vendors v
WHERE i.code = 'ANTENNA-CLAMP-1'
  AND v.code = 'INHOUSE'
  AND NOT EXISTS (
      SELECT 1 FROM item_vendors WHERE item_id = i.id AND vendor_id = v.id
  )
LIMIT 1;

-- Antenna Clamp -2 3D Print → In-house (Priority 1)
INSERT INTO item_vendors (item_id, vendor_id, priority, unit_price, is_active, created_at, updated_at)
SELECT 
    i.id,
    v.id,
    1,
    20.0,
    true,
    NOW(),
    NOW()
FROM items i
CROSS JOIN vendors v
WHERE i.code = 'ANTENNA-CLAMP-2'
  AND v.code = 'INHOUSE'
  AND NOT EXISTS (
      SELECT 1 FROM item_vendors WHERE item_id = i.id AND vendor_id = v.id
  )
LIMIT 1;

-- Rotary Knob Box 3D print → Robu 3D print (Priority 1)
INSERT INTO item_vendors (item_id, vendor_id, priority, unit_price, is_active, created_at, updated_at)
SELECT 
    i.id,
    v.id,
    1,
    500.0,
    true,
    NOW(),
    NOW()
FROM items i
CROSS JOIN vendors v
WHERE i.code = 'ROTARY-KNOB-BOX'
  AND v.code = 'ROBU3DPRINT'
  AND NOT EXISTS (
      SELECT 1 FROM item_vendors WHERE item_id = i.id AND vendor_id = v.id
  )
LIMIT 1;

-- IFU 3D Middle → Webel (Priority 1)
INSERT INTO item_vendors (item_id, vendor_id, priority, unit_price, is_active, created_at, updated_at)
SELECT 
    i.id,
    v.id,
    1,
    225.0,
    true,
    NOW(),
    NOW()
FROM items i
CROSS JOIN vendors v
WHERE i.code = 'IFU-3D-MIDDLE'
  AND v.code = 'WEBEL'
  AND NOT EXISTS (
      SELECT 1 FROM item_vendors WHERE item_id = i.id AND vendor_id = v.id
  )
LIMIT 1;

-- Motor 5692 495 KV → Leopard (Priority 1)
INSERT INTO item_vendors (item_id, vendor_id, priority, unit_price, is_active, created_at, updated_at)
SELECT 
    i.id,
    v.id,
    1,
    7000.0,
    true,
    NOW(),
    NOW()
FROM items i
CROSS JOIN vendors v
WHERE i.code = 'MOTOR-5692-495'
  AND v.code = 'LEOPARD'
  AND NOT EXISTS (
      SELECT 1 FROM item_vendors WHERE item_id = i.id AND vendor_id = v.id
  )
LIMIT 1;

-- HV130 ESC → Hobbywing (Priority 1)
INSERT INTO item_vendors (item_id, vendor_id, priority, unit_price, is_active, created_at, updated_at)
SELECT 
    i.id,
    v.id,
    1,
    8000.0,
    true,
    NOW(),
    NOW()
FROM items i
CROSS JOIN vendors v
WHERE i.code = 'HV130-ESC'
  AND v.code = 'HOBBYWING'
  AND NOT EXISTS (
      SELECT 1 FROM item_vendors WHERE item_id = i.id AND vendor_id = v.id
  )
LIMIT 1;

-- 8 mm OD pneaumatic pipe → Popular Pnuematic (Priority 1)
INSERT INTO item_vendors (item_id, vendor_id, priority, unit_price, is_active, created_at, updated_at)
SELECT 
    i.id,
    v.id,
    1,
    70.0,
    true,
    NOW(),
    NOW()
FROM items i
CROSS JOIN vendors v
WHERE i.code = '8-MM-OD'
  AND v.code = 'POPULARPNUEMATIC'
  AND NOT EXISTS (
      SELECT 1 FROM item_vendors WHERE item_id = i.id AND vendor_id = v.id
  )
LIMIT 1;

-- 8 mm OD pneaumatic pipe → Hydro Pnuematic (Priority 2)
INSERT INTO item_vendors (item_id, vendor_id, priority, unit_price, is_active, created_at, updated_at)
SELECT 
    i.id,
    v.id,
    2,
    NULL,
    true,
    NOW(),
    NOW()
FROM items i
CROSS JOIN vendors v
WHERE i.code = '8-MM-OD'
  AND v.code = 'HYDROPNUEMATIC'
  AND NOT EXISTS (
      SELECT 1 FROM item_vendors WHERE item_id = i.id AND vendor_id = v.id
  )
LIMIT 1;

-- 12 to 8 right angled reducer with lock clips → Popular Pnuematic (Priority 1)
INSERT INTO item_vendors (item_id, vendor_id, priority, unit_price, is_active, created_at, updated_at)
SELECT 
    i.id,
    v.id,
    1,
    154.0,
    true,
    NOW(),
    NOW()
FROM items i
CROSS JOIN vendors v
WHERE i.code = '12-TO-8'
  AND v.code = 'POPULARPNUEMATIC'
  AND NOT EXISTS (
      SELECT 1 FROM item_vendors WHERE item_id = i.id AND vendor_id = v.id
  )
LIMIT 1;

-- 12 to 8 right angled reducer with lock clips → Hydro Pnuematic (Priority 2)
INSERT INTO item_vendors (item_id, vendor_id, priority, unit_price, is_active, created_at, updated_at)
SELECT 
    i.id,
    v.id,
    2,
    NULL,
    true,
    NOW(),
    NOW()
FROM items i
CROSS JOIN vendors v
WHERE i.code = '12-TO-8'
  AND v.code = 'HYDROPNUEMATIC'
  AND NOT EXISTS (
      SELECT 1 FROM item_vendors WHERE item_id = i.id AND vendor_id = v.id
  )
LIMIT 1;

-- 12mm OD pneumatic pipe → Popular Pnuematic (Priority 1)
INSERT INTO item_vendors (item_id, vendor_id, priority, unit_price, is_active, created_at, updated_at)
SELECT 
    i.id,
    v.id,
    1,
    120.0,
    true,
    NOW(),
    NOW()
FROM items i
CROSS JOIN vendors v
WHERE i.code = '12MM-OD-PNEUMATIC'
  AND v.code = 'POPULARPNUEMATIC'
  AND NOT EXISTS (
      SELECT 1 FROM item_vendors WHERE item_id = i.id AND vendor_id = v.id
  )
LIMIT 1;

-- 12mm OD pneumatic pipe → Hydro Pnuematic (Priority 2)
INSERT INTO item_vendors (item_id, vendor_id, priority, unit_price, is_active, created_at, updated_at)
SELECT 
    i.id,
    v.id,
    2,
    NULL,
    true,
    NOW(),
    NOW()
FROM items i
CROSS JOIN vendors v
WHERE i.code = '12MM-OD-PNEUMATIC'
  AND v.code = 'HYDROPNUEMATIC'
  AND NOT EXISTS (
      SELECT 1 FROM item_vendors WHERE item_id = i.id AND vendor_id = v.id
  )
LIMIT 1;

-- Polycarbonate Glass for Remote → Local Market (Priority 1)
INSERT INTO item_vendors (item_id, vendor_id, priority, unit_price, is_active, created_at, updated_at)
SELECT 
    i.id,
    v.id,
    1,
    50.0,
    true,
    NOW(),
    NOW()
FROM items i
CROSS JOIN vendors v
WHERE i.code = 'POLYCARBONATE-GLASS-FOR'
  AND v.code = 'LOCALMARKET'
  AND NOT EXISTS (
      SELECT 1 FROM item_vendors WHERE item_id = i.id AND vendor_id = v.id
  )
LIMIT 1;

-- 55 No. Box for chraging cable & Tool box → Local Market (Priority 1)
INSERT INTO item_vendors (item_id, vendor_id, priority, unit_price, is_active, created_at, updated_at)
SELECT 
    i.id,
    v.id,
    1,
    50.0,
    true,
    NOW(),
    NOW()
FROM items i
CROSS JOIN vendors v
WHERE i.code = '55-NO-BOX'
  AND v.code = 'LOCALMARKET'
  AND NOT EXISTS (
      SELECT 1 FROM item_vendors WHERE item_id = i.id AND vendor_id = v.id
  )
LIMIT 1;

-- 22 No. Box for SR structure screws → Local Market (Priority 1)
INSERT INTO item_vendors (item_id, vendor_id, priority, unit_price, is_active, created_at, updated_at)
SELECT 
    i.id,
    v.id,
    1,
    20.0,
    true,
    NOW(),
    NOW()
FROM items i
CROSS JOIN vendors v
WHERE i.code = '22-NO-BOX'
  AND v.code = 'LOCALMARKET'
  AND NOT EXISTS (
      SELECT 1 FROM item_vendors WHERE item_id = i.id AND vendor_id = v.id
  )
LIMIT 1;

-- Bottom Mesh (120mm x 100mm, 5"x4") → Jain Wire Netting (Priority 1)
INSERT INTO item_vendors (item_id, vendor_id, priority, unit_price, is_active, created_at, updated_at)
SELECT 
    i.id,
    v.id,
    1,
    25.0,
    true,
    NOW(),
    NOW()
FROM items i
CROSS JOIN vendors v
WHERE i.code = 'BOTTOM-MESH-120MM'
  AND v.code = 'JAINWIRENETTING'
  AND NOT EXISTS (
      SELECT 1 FROM item_vendors WHERE item_id = i.id AND vendor_id = v.id
  )
LIMIT 1;

-- Air nozzle → Local Market (Priority 1)
INSERT INTO item_vendors (item_id, vendor_id, priority, unit_price, is_active, created_at, updated_at)
SELECT 
    i.id,
    v.id,
    1,
    15.0,
    true,
    NOW(),
    NOW()
FROM items i
CROSS JOIN vendors v
WHERE i.code = 'AIR-NOZZLE'
  AND v.code = 'LOCALMARKET'
  AND NOT EXISTS (
      SELECT 1 FROM item_vendors WHERE item_id = i.id AND vendor_id = v.id
  )
LIMIT 1;

-- Acetone → Local Market (Priority 1)
INSERT INTO item_vendors (item_id, vendor_id, priority, unit_price, is_active, created_at, updated_at)
SELECT 
    i.id,
    v.id,
    1,
    2.0,
    true,
    NOW(),
    NOW()
FROM items i
CROSS JOIN vendors v
WHERE i.code = 'ACETONE'
  AND v.code = 'LOCALMARKET'
  AND NOT EXISTS (
      SELECT 1 FROM item_vendors WHERE item_id = i.id AND vendor_id = v.id
  )
LIMIT 1;

-- IPA → Local Market (Priority 1)
INSERT INTO item_vendors (item_id, vendor_id, priority, unit_price, is_active, created_at, updated_at)
SELECT 
    i.id,
    v.id,
    1,
    2.0,
    true,
    NOW(),
    NOW()
FROM items i
CROSS JOIN vendors v
WHERE i.code = 'IPA'
  AND v.code = 'LOCALMARKET'
  AND NOT EXISTS (
      SELECT 1 FROM item_vendors WHERE item_id = i.id AND vendor_id = v.id
  )
LIMIT 1;

-- Poly Urethane Foam → Local Market (Priority 1)
INSERT INTO item_vendors (item_id, vendor_id, priority, unit_price, is_active, created_at, updated_at)
SELECT 
    i.id,
    v.id,
    1,
    1.0,
    true,
    NOW(),
    NOW()
FROM items i
CROSS JOIN vendors v
WHERE i.code = 'POLY-URETHANE-FOAM'
  AND v.code = 'LOCALMARKET'
  AND NOT EXISTS (
      SELECT 1 FROM item_vendors WHERE item_id = i.id AND vendor_id = v.id
  )
LIMIT 1;

-- Silicon Hose 4mm x 8mm → Dolphin Rubber (Priority 1)
INSERT INTO item_vendors (item_id, vendor_id, priority, unit_price, is_active, created_at, updated_at)
SELECT 
    i.id,
    v.id,
    1,
    125.0,
    true,
    NOW(),
    NOW()
FROM items i
CROSS JOIN vendors v
WHERE i.code = 'SILICON-HOSE-4MM'
  AND v.code = 'DOLPHINRUBBER'
  AND NOT EXISTS (
      SELECT 1 FROM item_vendors WHERE item_id = i.id AND vendor_id = v.id
  )
LIMIT 1;

-- Silicon Hose 3mm x 6mm → Dolphin Rubber (Priority 1)
INSERT INTO item_vendors (item_id, vendor_id, priority, unit_price, is_active, created_at, updated_at)
SELECT 
    i.id,
    v.id,
    1,
    95.0,
    true,
    NOW(),
    NOW()
FROM items i
CROSS JOIN vendors v
WHERE i.code = 'SILICON-HOSE-3MM'
  AND v.code = 'DOLPHINRUBBER'
  AND NOT EXISTS (
      SELECT 1 FROM item_vendors WHERE item_id = i.id AND vendor_id = v.id
  )
LIMIT 1;

-- 6mmx12mm Rubber Bush → Dolphin Rubber (Priority 1)
INSERT INTO item_vendors (item_id, vendor_id, priority, unit_price, is_active, created_at, updated_at)
SELECT 
    i.id,
    v.id,
    1,
    95.0,
    true,
    NOW(),
    NOW()
FROM items i
CROSS JOIN vendors v
WHERE i.code = '6MMX12MM-RUBBER-BUSH'
  AND v.code = 'DOLPHINRUBBER'
  AND NOT EXISTS (
      SELECT 1 FROM item_vendors WHERE item_id = i.id AND vendor_id = v.id
  )
LIMIT 1;

-- Joystick Water proof rubber → Dolphin Rubber (Priority 1)
INSERT INTO item_vendors (item_id, vendor_id, priority, unit_price, is_active, created_at, updated_at)
SELECT 
    i.id,
    v.id,
    1,
    75.0,
    true,
    NOW(),
    NOW()
FROM items i
CROSS JOIN vendors v
WHERE i.code = 'JOYSTICK-WATER-PROOF'
  AND v.code = 'DOLPHINRUBBER'
  AND NOT EXISTS (
      SELECT 1 FROM item_vendors WHERE item_id = i.id AND vendor_id = v.id
  )
LIMIT 1;

-- Button Silicon Cover No. 1 → Dolphin Rubber (Priority 1)
INSERT INTO item_vendors (item_id, vendor_id, priority, unit_price, is_active, created_at, updated_at)
SELECT 
    i.id,
    v.id,
    1,
    35.0,
    true,
    NOW(),
    NOW()
FROM items i
CROSS JOIN vendors v
WHERE i.code = 'BUTTON-SILICON-COVER'
  AND v.code = 'DOLPHINRUBBER'
  AND NOT EXISTS (
      SELECT 1 FROM item_vendors WHERE item_id = i.id AND vendor_id = v.id
  )
LIMIT 1;

-- Button Silicon Cover No. 2 → Dolphin Rubber (Priority 1)
INSERT INTO item_vendors (item_id, vendor_id, priority, unit_price, is_active, created_at, updated_at)
SELECT 
    i.id,
    v.id,
    1,
    35.0,
    true,
    NOW(),
    NOW()
FROM items i
CROSS JOIN vendors v
WHERE i.code = 'BUTTON-SILICON-COVER'
  AND v.code = 'DOLPHINRUBBER'
  AND NOT EXISTS (
      SELECT 1 FROM item_vendors WHERE item_id = i.id AND vendor_id = v.id
  )
LIMIT 1;

-- 3mm Silicon Rubber Gaskets (35mmx10mm) → Dolphin Rubber (Priority 1)
INSERT INTO item_vendors (item_id, vendor_id, priority, unit_price, is_active, created_at, updated_at)
SELECT 
    i.id,
    v.id,
    1,
    2.0,
    true,
    NOW(),
    NOW()
FROM items i
CROSS JOIN vendors v
WHERE i.code = '3MM-SILICON-RUBBER'
  AND v.code = 'DOLPHINRUBBER'
  AND NOT EXISTS (
      SELECT 1 FROM item_vendors WHERE item_id = i.id AND vendor_id = v.id
  )
LIMIT 1;

-- Thread locker 242 → Elegant Enterprises (Priority 1)
INSERT INTO item_vendors (item_id, vendor_id, priority, unit_price, is_active, created_at, updated_at)
SELECT 
    i.id,
    v.id,
    1,
    10.0,
    true,
    NOW(),
    NOW()
FROM items i
CROSS JOIN vendors v
WHERE i.code = 'THREAD-LOCKER-242'
  AND v.code = 'ELEGANTENTERPRISES'
  AND NOT EXISTS (
      SELECT 1 FROM item_vendors WHERE item_id = i.id AND vendor_id = v.id
  )
LIMIT 1;

-- Thread locker Activator → Elegant Enterprises (Priority 1)
INSERT INTO item_vendors (item_id, vendor_id, priority, unit_price, is_active, created_at, updated_at)
SELECT 
    i.id,
    v.id,
    1,
    8.0,
    true,
    NOW(),
    NOW()
FROM items i
CROSS JOIN vendors v
WHERE i.code = 'THREAD-LOCKER-ACTIVATOR'
  AND v.code = 'ELEGANTENTERPRISES'
  AND NOT EXISTS (
      SELECT 1 FROM item_vendors WHERE item_id = i.id AND vendor_id = v.id
  )
LIMIT 1;

-- Instant Adhesive 407 for EPE sticking → Elegant Enterprises (Priority 1)
INSERT INTO item_vendors (item_id, vendor_id, priority, unit_price, is_active, created_at, updated_at)
SELECT 
    i.id,
    v.id,
    1,
    15.0,
    true,
    NOW(),
    NOW()
FROM items i
CROSS JOIN vendors v
WHERE i.code = 'INSTANT-ADHESIVE-407'
  AND v.code = 'ELEGANTENTERPRISES'
  AND NOT EXISTS (
      SELECT 1 FROM item_vendors WHERE item_id = i.id AND vendor_id = v.id
  )
LIMIT 1;

-- Oring AFT plate → Ali Irani - Kolkata (Priority 1)
INSERT INTO item_vendors (item_id, vendor_id, priority, unit_price, is_active, created_at, updated_at)
SELECT 
    i.id,
    v.id,
    1,
    30.0,
    true,
    NOW(),
    NOW()
FROM items i
CROSS JOIN vendors v
WHERE i.code = 'ORING-AFT-PLATE'
  AND v.code = 'ALIIRANIKOLKATA'
  AND NOT EXISTS (
      SELECT 1 FROM item_vendors WHERE item_id = i.id AND vendor_id = v.id
  )
LIMIT 1;

-- STBD SR Rubber Boot → Webel (Priority 1)
INSERT INTO item_vendors (item_id, vendor_id, priority, unit_price, is_active, created_at, updated_at)
SELECT 
    i.id,
    v.id,
    1,
    0,
    true,
    NOW(),
    NOW()
FROM items i
CROSS JOIN vendors v
WHERE i.code = 'STBD-SR-RUBBER'
  AND v.code = 'WEBEL'
  AND NOT EXISTS (
      SELECT 1 FROM item_vendors WHERE item_id = i.id AND vendor_id = v.id
  )
LIMIT 1;

-- PORT SR Rubber Boot → Webel (Priority 1)
INSERT INTO item_vendors (item_id, vendor_id, priority, unit_price, is_active, created_at, updated_at)
SELECT 
    i.id,
    v.id,
    1,
    0,
    true,
    NOW(),
    NOW()
FROM items i
CROSS JOIN vendors v
WHERE i.code = 'PORT-SR-RUBBER'
  AND v.code = 'WEBEL'
  AND NOT EXISTS (
      SELECT 1 FROM item_vendors WHERE item_id = i.id AND vendor_id = v.id
  )
LIMIT 1;

-- SaifSeas Neck Strap → Local Market (Priority 1)
INSERT INTO item_vendors (item_id, vendor_id, priority, unit_price, is_active, created_at, updated_at)
SELECT 
    i.id,
    v.id,
    1,
    100.0,
    true,
    NOW(),
    NOW()
FROM items i
CROSS JOIN vendors v
WHERE i.code = 'SAIFSEAS-NECK-STRAP'
  AND v.code = 'LOCALMARKET'
  AND NOT EXISTS (
      SELECT 1 FROM item_vendors WHERE item_id = i.id AND vendor_id = v.id
  )
LIMIT 1;

-- Hook Sticker STBD → Attitude Master Vizag (Priority 1)
INSERT INTO item_vendors (item_id, vendor_id, priority, unit_price, is_active, created_at, updated_at)
SELECT 
    i.id,
    v.id,
    1,
    20.0,
    true,
    NOW(),
    NOW()
FROM items i
CROSS JOIN vendors v
WHERE i.code = 'HOOK-STICKER-STBD'
  AND v.code = 'ATTITUDEMASTERVIZAG'
  AND NOT EXISTS (
      SELECT 1 FROM item_vendors WHERE item_id = i.id AND vendor_id = v.id
  )
LIMIT 1;

-- Hook Stiker PORT → Attitude Master Vizag (Priority 1)
INSERT INTO item_vendors (item_id, vendor_id, priority, unit_price, is_active, created_at, updated_at)
SELECT 
    i.id,
    v.id,
    1,
    20.0,
    true,
    NOW(),
    NOW()
FROM items i
CROSS JOIN vendors v
WHERE i.code = 'HOOK-STIKER-PORT'
  AND v.code = 'ATTITUDEMASTERVIZAG'
  AND NOT EXISTS (
      SELECT 1 FROM item_vendors WHERE item_id = i.id AND vendor_id = v.id
  )
LIMIT 1;

-- Hold here sticker STBD → Attitude Master Vizag (Priority 1)
INSERT INTO item_vendors (item_id, vendor_id, priority, unit_price, is_active, created_at, updated_at)
SELECT 
    i.id,
    v.id,
    1,
    20.0,
    true,
    NOW(),
    NOW()
FROM items i
CROSS JOIN vendors v
WHERE i.code = 'HOLD-HERE-STICKER'
  AND v.code = 'ATTITUDEMASTERVIZAG'
  AND NOT EXISTS (
      SELECT 1 FROM item_vendors WHERE item_id = i.id AND vendor_id = v.id
  )
LIMIT 1;

-- Hold here sticker PORT → Attitude Master Vizag (Priority 1)
INSERT INTO item_vendors (item_id, vendor_id, priority, unit_price, is_active, created_at, updated_at)
SELECT 
    i.id,
    v.id,
    1,
    20.0,
    true,
    NOW(),
    NOW()
FROM items i
CROSS JOIN vendors v
WHERE i.code = 'HOLD-HERE-STICKER'
  AND v.code = 'ATTITUDEMASTERVIZAG'
  AND NOT EXISTS (
      SELECT 1 FROM item_vendors WHERE item_id = i.id AND vendor_id = v.id
  )
LIMIT 1;

-- Craft Cleaning Notify Sticker → Attitude Master Vizag (Priority 1)
INSERT INTO item_vendors (item_id, vendor_id, priority, unit_price, is_active, created_at, updated_at)
SELECT 
    i.id,
    v.id,
    1,
    20.0,
    true,
    NOW(),
    NOW()
FROM items i
CROSS JOIN vendors v
WHERE i.code = 'CRAFT-CLEANING-NOTIFY'
  AND v.code = 'ATTITUDEMASTERVIZAG'
  AND NOT EXISTS (
      SELECT 1 FROM item_vendors WHERE item_id = i.id AND vendor_id = v.id
  )
LIMIT 1;

-- Ferrole → Commercial Engineering (Priority 1)
INSERT INTO item_vendors (item_id, vendor_id, priority, unit_price, is_active, created_at, updated_at)
SELECT 
    i.id,
    v.id,
    1,
    0,
    true,
    NOW(),
    NOW()
FROM items i
CROSS JOIN vendors v
WHERE i.code = 'FERROLE'
  AND v.code = 'COMMERCIALENGINEERIN'
  AND NOT EXISTS (
      SELECT 1 FROM item_vendors WHERE item_id = i.id AND vendor_id = v.id
  )
LIMIT 1;

-- Rope 8mm → Local Market Kolkata (Priority 1)
INSERT INTO item_vendors (item_id, vendor_id, priority, unit_price, is_active, created_at, updated_at)
SELECT 
    i.id,
    v.id,
    1,
    0,
    true,
    NOW(),
    NOW()
FROM items i
CROSS JOIN vendors v
WHERE i.code = 'ROPE-8MM'
  AND v.code = 'LOCALMARKETKOLKATA'
  AND NOT EXISTS (
      SELECT 1 FROM item_vendors WHERE item_id = i.id AND vendor_id = v.id
  )
LIMIT 1;

-- User Manual → Local Market Kolkata (Priority 1)
INSERT INTO item_vendors (item_id, vendor_id, priority, unit_price, is_active, created_at, updated_at)
SELECT 
    i.id,
    v.id,
    1,
    0,
    true,
    NOW(),
    NOW()
FROM items i
CROSS JOIN vendors v
WHERE i.code = 'USER-MANUAL'
  AND v.code = 'LOCALMARKETKOLKATA'
  AND NOT EXISTS (
      SELECT 1 FROM item_vendors WHERE item_id = i.id AND vendor_id = v.id
  )
LIMIT 1;

-- Envelope for User Manual → Local Market (Priority 1)
INSERT INTO item_vendors (item_id, vendor_id, priority, unit_price, is_active, created_at, updated_at)
SELECT 
    i.id,
    v.id,
    1,
    15.0,
    true,
    NOW(),
    NOW()
FROM items i
CROSS JOIN vendors v
WHERE i.code = 'ENVELOPE-FOR-USER'
  AND v.code = 'LOCALMARKET'
  AND NOT EXISTS (
      SELECT 1 FROM item_vendors WHERE item_id = i.id AND vendor_id = v.id
  )
LIMIT 1;

-- Surgical Gloves → Local Market (Priority 1)
INSERT INTO item_vendors (item_id, vendor_id, priority, unit_price, is_active, created_at, updated_at)
SELECT 
    i.id,
    v.id,
    1,
    3.5,
    true,
    NOW(),
    NOW()
FROM items i
CROSS JOIN vendors v
WHERE i.code = 'SURGICAL-GLOVES'
  AND v.code = 'LOCALMARKET'
  AND NOT EXISTS (
      SELECT 1 FROM item_vendors WHERE item_id = i.id AND vendor_id = v.id
  )
LIMIT 1;

-- X16 extension panel → Webel (Priority 1)
INSERT INTO item_vendors (item_id, vendor_id, priority, unit_price, is_active, created_at, updated_at)
SELECT 
    i.id,
    v.id,
    1,
    0,
    true,
    NOW(),
    NOW()
FROM items i
CROSS JOIN vendors v
WHERE i.code = 'X16-EXTENSION-PANEL'
  AND v.code = 'WEBEL'
  AND NOT EXISTS (
      SELECT 1 FROM item_vendors WHERE item_id = i.id AND vendor_id = v.id
  )
LIMIT 1;



-- ============================================================================
-- INSERT BOMS (Sub-Assembly Bill of Materials)
-- ============================================================================

-- BOM for Jet Motor Assy
INSERT INTO bom_headers (tenant_id, item_id, version, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    id, 
    1, 
    true, 
    NOW(), 
    NOW()
FROM items 
WHERE name = 'Jet Motor Assy' AND type IN ('SUB_ASSEMBLY'::item_type, 'FINISHED_GOODS'::item_type)
  AND NOT EXISTS (
      SELECT 1 FROM bom_headers bh2 
      WHERE bh2.item_id = items.id
  )
LIMIT 1;

INSERT INTO bom_items (bom_id, item_id, quantity, created_at)
SELECT 
    bh.id,
    i.id,
    1.0,
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.item_id = (SELECT id FROM items WHERE name = 'Jet Motor Assy' AND type = 'SUB_ASSEMBLY'::item_type LIMIT 1)
  AND i.name = 'Coupling Hood'
  AND NOT EXISTS (
      SELECT 1 FROM bom_items WHERE bom_id = bh.id AND item_id = i.id
  )
LIMIT 1;

INSERT INTO bom_items (bom_id, item_id, quantity, created_at)
SELECT 
    bh.id,
    i.id,
    2.0,
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.item_id = (SELECT id FROM items WHERE name = 'Jet Motor Assy' AND type = 'SUB_ASSEMBLY'::item_type LIMIT 1)
  AND i.name = 'Battery Clamp'
  AND NOT EXISTS (
      SELECT 1 FROM bom_items WHERE bom_id = bh.id AND item_id = i.id
  )
LIMIT 1;

INSERT INTO bom_items (bom_id, item_id, quantity, created_at)
SELECT 
    bh.id,
    i.id,
    4.0,
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.item_id = (SELECT id FROM items WHERE name = 'Jet Motor Assy' AND type = 'SUB_ASSEMBLY'::item_type LIMIT 1)
  AND i.name = 'M4x25 Hex Head'
  AND NOT EXISTS (
      SELECT 1 FROM bom_items WHERE bom_id = bh.id AND item_id = i.id
  )
LIMIT 1;

INSERT INTO bom_items (bom_id, item_id, quantity, created_at)
SELECT 
    bh.id,
    i.id,
    7.0,
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.item_id = (SELECT id FROM items WHERE name = 'Jet Motor Assy' AND type = 'SUB_ASSEMBLY'::item_type LIMIT 1)
  AND i.name = 'M4 Square Nut'
  AND NOT EXISTS (
      SELECT 1 FROM bom_items WHERE bom_id = bh.id AND item_id = i.id
  )
LIMIT 1;

INSERT INTO bom_items (bom_id, item_id, quantity, created_at)
SELECT 
    bh.id,
    i.id,
    16.0,
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.item_id = (SELECT id FROM items WHERE name = 'Jet Motor Assy' AND type = 'SUB_ASSEMBLY'::item_type LIMIT 1)
  AND i.name = 'M4 Nyloc'
  AND NOT EXISTS (
      SELECT 1 FROM bom_items WHERE bom_id = bh.id AND item_id = i.id
  )
LIMIT 1;

INSERT INTO bom_items (bom_id, item_id, quantity, created_at)
SELECT 
    bh.id,
    i.id,
    20.0,
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.item_id = (SELECT id FROM items WHERE name = 'Jet Motor Assy' AND type = 'SUB_ASSEMBLY'::item_type LIMIT 1)
  AND i.name = 'M4 Spring washer'
  AND NOT EXISTS (
      SELECT 1 FROM bom_items WHERE bom_id = bh.id AND item_id = i.id
  )
LIMIT 1;

INSERT INTO bom_items (bom_id, item_id, quantity, created_at)
SELECT 
    bh.id,
    i.id,
    24.0,
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.item_id = (SELECT id FROM items WHERE name = 'Jet Motor Assy' AND type = 'SUB_ASSEMBLY'::item_type LIMIT 1)
  AND i.name = 'M4x12 plain washer'
  AND NOT EXISTS (
      SELECT 1 FROM bom_items WHERE bom_id = bh.id AND item_id = i.id
  )
LIMIT 1;

INSERT INTO bom_items (bom_id, item_id, quantity, created_at)
SELECT 
    bh.id,
    i.id,
    4.0,
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.item_id = (SELECT id FROM items WHERE name = 'Jet Motor Assy' AND type = 'SUB_ASSEMBLY'::item_type LIMIT 1)
  AND i.name = 'M4x16 CSK Phillips'
  AND NOT EXISTS (
      SELECT 1 FROM bom_items WHERE bom_id = bh.id AND item_id = i.id
  )
LIMIT 1;

INSERT INTO bom_items (bom_id, item_id, quantity, created_at)
SELECT 
    bh.id,
    i.id,
    1,
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.item_id = (SELECT id FROM items WHERE name = 'Jet Motor Assy' AND type = 'SUB_ASSEMBLY'::item_type LIMIT 1)
  AND i.name = 'M4x10 CSK Phillips'
  AND NOT EXISTS (
      SELECT 1 FROM bom_items WHERE bom_id = bh.id AND item_id = i.id
  )
LIMIT 1;

INSERT INTO bom_items (bom_id, item_id, quantity, created_at)
SELECT 
    bh.id,
    i.id,
    8.0,
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.item_id = (SELECT id FROM items WHERE name = 'Jet Motor Assy' AND type = 'SUB_ASSEMBLY'::item_type LIMIT 1)
  AND i.name = 'M4x20 CSK Phillips'
  AND NOT EXISTS (
      SELECT 1 FROM bom_items WHERE bom_id = bh.id AND item_id = i.id
  )
LIMIT 1;

INSERT INTO bom_items (bom_id, item_id, quantity, created_at)
SELECT 
    bh.id,
    i.id,
    2.0,
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.item_id = (SELECT id FROM items WHERE name = 'Jet Motor Assy' AND type = 'SUB_ASSEMBLY'::item_type LIMIT 1)
  AND i.name = 'Grub M6x10 SS (Coupling tightening)'
  AND NOT EXISTS (
      SELECT 1 FROM bom_items WHERE bom_id = bh.id AND item_id = i.id
  )
LIMIT 1;

INSERT INTO bom_items (bom_id, item_id, quantity, created_at)
SELECT 
    bh.id,
    i.id,
    1.0,
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.item_id = (SELECT id FROM items WHERE name = 'Jet Motor Assy' AND type = 'SUB_ASSEMBLY'::item_type LIMIT 1)
  AND i.name = 'Rotex14 Coupling'
  AND NOT EXISTS (
      SELECT 1 FROM bom_items WHERE bom_id = bh.id AND item_id = i.id
  )
LIMIT 1;

INSERT INTO bom_items (bom_id, item_id, quantity, created_at)
SELECT 
    bh.id,
    i.id,
    15.0,
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.item_id = (SELECT id FROM items WHERE name = 'Jet Motor Assy' AND type = 'SUB_ASSEMBLY'::item_type LIMIT 1)
  AND i.name = 'Teroson MS930'
  AND NOT EXISTS (
      SELECT 1 FROM bom_items WHERE bom_id = bh.id AND item_id = i.id
  )
LIMIT 1;

INSERT INTO bom_items (bom_id, item_id, quantity, created_at)
SELECT 
    bh.id,
    i.id,
    1.0,
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.item_id = (SELECT id FROM items WHERE name = 'Jet Motor Assy' AND type = 'SUB_ASSEMBLY'::item_type LIMIT 1)
  AND i.name = 'Nozzle on Jet'
  AND NOT EXISTS (
      SELECT 1 FROM bom_items WHERE bom_id = bh.id AND item_id = i.id
  )
LIMIT 1;

INSERT INTO bom_items (bom_id, item_id, quantity, created_at)
SELECT 
    bh.id,
    i.id,
    1.0,
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.item_id = (SELECT id FROM items WHERE name = 'Jet Motor Assy' AND type = 'SUB_ASSEMBLY'::item_type LIMIT 1)
  AND i.name = 'Silicon hose pipe clip 7mm'
  AND NOT EXISTS (
      SELECT 1 FROM bom_items WHERE bom_id = bh.id AND item_id = i.id
  )
LIMIT 1;

INSERT INTO bom_items (bom_id, item_id, quantity, created_at)
SELECT 
    bh.id,
    i.id,
    1.0,
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.item_id = (SELECT id FROM items WHERE name = 'Jet Motor Assy' AND type = 'SUB_ASSEMBLY'::item_type LIMIT 1)
  AND i.name = 'Water Jet pump Jet S52'
  AND NOT EXISTS (
      SELECT 1 FROM bom_items WHERE bom_id = bh.id AND item_id = i.id
  )
LIMIT 1;

INSERT INTO bom_items (bom_id, item_id, quantity, created_at)
SELECT 
    bh.id,
    i.id,
    1.0,
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.item_id = (SELECT id FROM items WHERE name = 'Jet Motor Assy' AND type = 'SUB_ASSEMBLY'::item_type LIMIT 1)
  AND i.name = 'ESC Mounting Plate'
  AND NOT EXISTS (
      SELECT 1 FROM bom_items WHERE bom_id = bh.id AND item_id = i.id
  )
LIMIT 1;

INSERT INTO bom_items (bom_id, item_id, quantity, created_at)
SELECT 
    bh.id,
    i.id,
    1.0,
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.item_id = (SELECT id FROM items WHERE name = 'Jet Motor Assy' AND type = 'SUB_ASSEMBLY'::item_type LIMIT 1)
  AND i.name = 'Jet S52 Mounting plate'
  AND NOT EXISTS (
      SELECT 1 FROM bom_items WHERE bom_id = bh.id AND item_id = i.id
  )
LIMIT 1;

INSERT INTO bom_items (bom_id, item_id, quantity, created_at)
SELECT 
    bh.id,
    i.id,
    2.0,
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.item_id = (SELECT id FROM items WHERE name = 'Jet Motor Assy' AND type = 'SUB_ASSEMBLY'::item_type LIMIT 1)
  AND i.name = 'Motor Mount 5692'
  AND NOT EXISTS (
      SELECT 1 FROM bom_items WHERE bom_id = bh.id AND item_id = i.id
  )
LIMIT 1;

INSERT INTO bom_items (bom_id, item_id, quantity, created_at)
SELECT 
    bh.id,
    i.id,
    1.0,
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.item_id = (SELECT id FROM items WHERE name = 'Jet Motor Assy' AND type = 'SUB_ASSEMBLY'::item_type LIMIT 1)
  AND i.name = 'Motor 5692 495 KV'
  AND NOT EXISTS (
      SELECT 1 FROM bom_items WHERE bom_id = bh.id AND item_id = i.id
  )
LIMIT 1;

INSERT INTO bom_items (bom_id, item_id, quantity, created_at)
SELECT 
    bh.id,
    i.id,
    1.0,
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.item_id = (SELECT id FROM items WHERE name = 'Jet Motor Assy' AND type = 'SUB_ASSEMBLY'::item_type LIMIT 1)
  AND i.name = 'Motor Cooling Jacket 56mm x 50mm'
  AND NOT EXISTS (
      SELECT 1 FROM bom_items WHERE bom_id = bh.id AND item_id = i.id
  )
LIMIT 1;

INSERT INTO bom_items (bom_id, item_id, quantity, created_at)
SELECT 
    bh.id,
    i.id,
    0.2,
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.item_id = (SELECT id FROM items WHERE name = 'Jet Motor Assy' AND type = 'SUB_ASSEMBLY'::item_type LIMIT 1)
  AND i.name = 'Silicon Hose 4mm x 8mm'
  AND NOT EXISTS (
      SELECT 1 FROM bom_items WHERE bom_id = bh.id AND item_id = i.id
  )
LIMIT 1;

INSERT INTO bom_items (bom_id, item_id, quantity, created_at)
SELECT 
    bh.id,
    i.id,
    0.75,
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.item_id = (SELECT id FROM items WHERE name = 'Jet Motor Assy' AND type = 'SUB_ASSEMBLY'::item_type LIMIT 1)
  AND i.name = 'Silicon Hose 3mm x 6mm'
  AND NOT EXISTS (
      SELECT 1 FROM bom_items WHERE bom_id = bh.id AND item_id = i.id
  )
LIMIT 1;

INSERT INTO bom_items (bom_id, item_id, quantity, created_at)
SELECT 
    bh.id,
    i.id,
    2.0,
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.item_id = (SELECT id FROM items WHERE name = 'Jet Motor Assy' AND type = 'SUB_ASSEMBLY'::item_type LIMIT 1)
  AND i.name = 'Thread locker 242/270/290'
  AND NOT EXISTS (
      SELECT 1 FROM bom_items WHERE bom_id = bh.id AND item_id = i.id
  )
LIMIT 1;

INSERT INTO bom_items (bom_id, item_id, quantity, created_at)
SELECT 
    bh.id,
    i.id,
    2.0,
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.item_id = (SELECT id FROM items WHERE name = 'Jet Motor Assy' AND type = 'SUB_ASSEMBLY'::item_type LIMIT 1)
  AND i.name = 'Thread locker Activator'
  AND NOT EXISTS (
      SELECT 1 FROM bom_items WHERE bom_id = bh.id AND item_id = i.id
  )
LIMIT 1;

-- BOM for STBD_ESC Assy
INSERT INTO bom_headers (tenant_id, item_id, version, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    id, 
    1, 
    true, 
    NOW(), 
    NOW()
FROM items 
WHERE name = 'STBD_ESC Assy' AND type IN ('SUB_ASSEMBLY'::item_type, 'FINISHED_GOODS'::item_type)
  AND NOT EXISTS (
      SELECT 1 FROM bom_headers bh2 
      WHERE bh2.item_id = items.id
  )
LIMIT 1;

INSERT INTO bom_items (bom_id, item_id, quantity, created_at)
SELECT 
    bh.id,
    i.id,
    1.0,
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.item_id = (SELECT id FROM items WHERE name = 'STBD_ESC Assy' AND type = 'SUB_ASSEMBLY'::item_type LIMIT 1)
  AND i.name = '5.5mm Female Bullet connector'
  AND NOT EXISTS (
      SELECT 1 FROM bom_items WHERE bom_id = bh.id AND item_id = i.id
  )
LIMIT 1;

INSERT INTO bom_items (bom_id, item_id, quantity, created_at)
SELECT 
    bh.id,
    i.id,
    2.0,
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.item_id = (SELECT id FROM items WHERE name = 'STBD_ESC Assy' AND type = 'SUB_ASSEMBLY'::item_type LIMIT 1)
  AND i.name = '4mm Male Bullet connector'
  AND NOT EXISTS (
      SELECT 1 FROM bom_items WHERE bom_id = bh.id AND item_id = i.id
  )
LIMIT 1;

INSERT INTO bom_items (bom_id, item_id, quantity, created_at)
SELECT 
    bh.id,
    i.id,
    1.0,
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.item_id = (SELECT id FROM items WHERE name = 'STBD_ESC Assy' AND type = 'SUB_ASSEMBLY'::item_type LIMIT 1)
  AND i.name = '4mm Female Bullet connector'
  AND NOT EXISTS (
      SELECT 1 FROM bom_items WHERE bom_id = bh.id AND item_id = i.id
  )
LIMIT 1;

INSERT INTO bom_items (bom_id, item_id, quantity, created_at)
SELECT 
    bh.id,
    i.id,
    0.55,
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.item_id = (SELECT id FROM items WHERE name = 'STBD_ESC Assy' AND type = 'SUB_ASSEMBLY'::item_type LIMIT 1)
  AND i.name = 'Black 12AWG'
  AND NOT EXISTS (
      SELECT 1 FROM bom_items WHERE bom_id = bh.id AND item_id = i.id
  )
LIMIT 1;

INSERT INTO bom_items (bom_id, item_id, quantity, created_at)
SELECT 
    bh.id,
    i.id,
    0.55,
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.item_id = (SELECT id FROM items WHERE name = 'STBD_ESC Assy' AND type = 'SUB_ASSEMBLY'::item_type LIMIT 1)
  AND i.name = 'Red 12AWG'
  AND NOT EXISTS (
      SELECT 1 FROM bom_items WHERE bom_id = bh.id AND item_id = i.id
  )
LIMIT 1;

INSERT INTO bom_items (bom_id, item_id, quantity, created_at)
SELECT 
    bh.id,
    i.id,
    1.0,
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.item_id = (SELECT id FROM items WHERE name = 'STBD_ESC Assy' AND type = 'SUB_ASSEMBLY'::item_type LIMIT 1)
  AND i.name = 'Ferrite Core'
  AND NOT EXISTS (
      SELECT 1 FROM bom_items WHERE bom_id = bh.id AND item_id = i.id
  )
LIMIT 1;

INSERT INTO bom_items (bom_id, item_id, quantity, created_at)
SELECT 
    bh.id,
    i.id,
    5.0,
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.item_id = (SELECT id FROM items WHERE name = 'STBD_ESC Assy' AND type = 'SUB_ASSEMBLY'::item_type LIMIT 1)
  AND i.name = '16AWG Lead'
  AND NOT EXISTS (
      SELECT 1 FROM bom_items WHERE bom_id = bh.id AND item_id = i.id
  )
LIMIT 1;

INSERT INTO bom_items (bom_id, item_id, quantity, created_at)
SELECT 
    bh.id,
    i.id,
    0.05,
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.item_id = (SELECT id FROM items WHERE name = 'STBD_ESC Assy' AND type = 'SUB_ASSEMBLY'::item_type LIMIT 1)
  AND i.name = 'Heatshrink Tube 9:3'
  AND NOT EXISTS (
      SELECT 1 FROM bom_items WHERE bom_id = bh.id AND item_id = i.id
  )
LIMIT 1;

INSERT INTO bom_items (bom_id, item_id, quantity, created_at)
SELECT 
    bh.id,
    i.id,
    0.05,
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.item_id = (SELECT id FROM items WHERE name = 'STBD_ESC Assy' AND type = 'SUB_ASSEMBLY'::item_type LIMIT 1)
  AND i.name = 'HeatShrink Tube 4.8/1.2'
  AND NOT EXISTS (
      SELECT 1 FROM bom_items WHERE bom_id = bh.id AND item_id = i.id
  )
LIMIT 1;

INSERT INTO bom_items (bom_id, item_id, quantity, created_at)
SELECT 
    bh.id,
    i.id,
    1.0,
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.item_id = (SELECT id FROM items WHERE name = 'STBD_ESC Assy' AND type = 'SUB_ASSEMBLY'::item_type LIMIT 1)
  AND i.name = 'HV130 ESC'
  AND NOT EXISTS (
      SELECT 1 FROM bom_items WHERE bom_id = bh.id AND item_id = i.id
  )
LIMIT 1;

-- BOM for PORT_ESC Assy
INSERT INTO bom_headers (tenant_id, item_id, version, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    id, 
    1, 
    true, 
    NOW(), 
    NOW()
FROM items 
WHERE name = 'PORT_ESC Assy' AND type IN ('SUB_ASSEMBLY'::item_type, 'FINISHED_GOODS'::item_type)
  AND NOT EXISTS (
      SELECT 1 FROM bom_headers bh2 
      WHERE bh2.item_id = items.id
  )
LIMIT 1;

INSERT INTO bom_items (bom_id, item_id, quantity, created_at)
SELECT 
    bh.id,
    i.id,
    1.0,
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.item_id = (SELECT id FROM items WHERE name = 'PORT_ESC Assy' AND type = 'SUB_ASSEMBLY'::item_type LIMIT 1)
  AND i.name = '5.5mm Female Bullet connector'
  AND NOT EXISTS (
      SELECT 1 FROM bom_items WHERE bom_id = bh.id AND item_id = i.id
  )
LIMIT 1;

INSERT INTO bom_items (bom_id, item_id, quantity, created_at)
SELECT 
    bh.id,
    i.id,
    2.0,
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.item_id = (SELECT id FROM items WHERE name = 'PORT_ESC Assy' AND type = 'SUB_ASSEMBLY'::item_type LIMIT 1)
  AND i.name = '4mm Male Bullet connector'
  AND NOT EXISTS (
      SELECT 1 FROM bom_items WHERE bom_id = bh.id AND item_id = i.id
  )
LIMIT 1;

INSERT INTO bom_items (bom_id, item_id, quantity, created_at)
SELECT 
    bh.id,
    i.id,
    1.0,
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.item_id = (SELECT id FROM items WHERE name = 'PORT_ESC Assy' AND type = 'SUB_ASSEMBLY'::item_type LIMIT 1)
  AND i.name = '4mm Female Bullet connector'
  AND NOT EXISTS (
      SELECT 1 FROM bom_items WHERE bom_id = bh.id AND item_id = i.id
  )
LIMIT 1;

INSERT INTO bom_items (bom_id, item_id, quantity, created_at)
SELECT 
    bh.id,
    i.id,
    0.55,
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.item_id = (SELECT id FROM items WHERE name = 'PORT_ESC Assy' AND type = 'SUB_ASSEMBLY'::item_type LIMIT 1)
  AND i.name = 'Red 12AWG'
  AND NOT EXISTS (
      SELECT 1 FROM bom_items WHERE bom_id = bh.id AND item_id = i.id
  )
LIMIT 1;

INSERT INTO bom_items (bom_id, item_id, quantity, created_at)
SELECT 
    bh.id,
    i.id,
    1.0,
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.item_id = (SELECT id FROM items WHERE name = 'PORT_ESC Assy' AND type = 'SUB_ASSEMBLY'::item_type LIMIT 1)
  AND i.name = 'Ferrite Core'
  AND NOT EXISTS (
      SELECT 1 FROM bom_items WHERE bom_id = bh.id AND item_id = i.id
  )
LIMIT 1;

INSERT INTO bom_items (bom_id, item_id, quantity, created_at)
SELECT 
    bh.id,
    i.id,
    5.0,
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.item_id = (SELECT id FROM items WHERE name = 'PORT_ESC Assy' AND type = 'SUB_ASSEMBLY'::item_type LIMIT 1)
  AND i.name = '16AWG Lead'
  AND NOT EXISTS (
      SELECT 1 FROM bom_items WHERE bom_id = bh.id AND item_id = i.id
  )
LIMIT 1;

INSERT INTO bom_items (bom_id, item_id, quantity, created_at)
SELECT 
    bh.id,
    i.id,
    0.05,
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.item_id = (SELECT id FROM items WHERE name = 'PORT_ESC Assy' AND type = 'SUB_ASSEMBLY'::item_type LIMIT 1)
  AND i.name = 'Heatshrink Tube 9:3'
  AND NOT EXISTS (
      SELECT 1 FROM bom_items WHERE bom_id = bh.id AND item_id = i.id
  )
LIMIT 1;

INSERT INTO bom_items (bom_id, item_id, quantity, created_at)
SELECT 
    bh.id,
    i.id,
    0.05,
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.item_id = (SELECT id FROM items WHERE name = 'PORT_ESC Assy' AND type = 'SUB_ASSEMBLY'::item_type LIMIT 1)
  AND i.name = 'HeatShrink Tube 4.8/1.2'
  AND NOT EXISTS (
      SELECT 1 FROM bom_items WHERE bom_id = bh.id AND item_id = i.id
  )
LIMIT 1;

INSERT INTO bom_items (bom_id, item_id, quantity, created_at)
SELECT 
    bh.id,
    i.id,
    1.0,
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.item_id = (SELECT id FROM items WHERE name = 'PORT_ESC Assy' AND type = 'SUB_ASSEMBLY'::item_type LIMIT 1)
  AND i.name = 'HV130 ESC'
  AND NOT EXISTS (
      SELECT 1 FROM bom_items WHERE bom_id = bh.id AND item_id = i.id
  )
LIMIT 1;

-- BOM for STBD Signal PM Assy
INSERT INTO bom_headers (tenant_id, item_id, version, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    id, 
    1, 
    true, 
    NOW(), 
    NOW()
FROM items 
WHERE name = 'STBD Signal PM Assy' AND type IN ('SUB_ASSEMBLY'::item_type, 'FINISHED_GOODS'::item_type)
  AND NOT EXISTS (
      SELECT 1 FROM bom_headers bh2 
      WHERE bh2.item_id = items.id
  )
LIMIT 1;

INSERT INTO bom_items (bom_id, item_id, quantity, created_at)
SELECT 
    bh.id,
    i.id,
    1.0,
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.item_id = (SELECT id FROM items WHERE name = 'STBD Signal PM Assy' AND type = 'SUB_ASSEMBLY'::item_type LIMIT 1)
  AND i.name = '15 pin JST-XH housing'
  AND NOT EXISTS (
      SELECT 1 FROM bom_items WHERE bom_id = bh.id AND item_id = i.id
  )
LIMIT 1;

INSERT INTO bom_items (bom_id, item_id, quantity, created_at)
SELECT 
    bh.id,
    i.id,
    1.0,
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.item_id = (SELECT id FROM items WHERE name = 'STBD Signal PM Assy' AND type = 'SUB_ASSEMBLY'::item_type LIMIT 1)
  AND i.name = '10cm one sided JST crimped Black'
  AND NOT EXISTS (
      SELECT 1 FROM bom_items WHERE bom_id = bh.id AND item_id = i.id
  )
LIMIT 1;

INSERT INTO bom_items (bom_id, item_id, quantity, created_at)
SELECT 
    bh.id,
    i.id,
    1.0,
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.item_id = (SELECT id FROM items WHERE name = 'STBD Signal PM Assy' AND type = 'SUB_ASSEMBLY'::item_type LIMIT 1)
  AND i.name = '10cm one sided JST crimped Green'
  AND NOT EXISTS (
      SELECT 1 FROM bom_items WHERE bom_id = bh.id AND item_id = i.id
  )
LIMIT 1;

INSERT INTO bom_items (bom_id, item_id, quantity, created_at)
SELECT 
    bh.id,
    i.id,
    1.0,
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.item_id = (SELECT id FROM items WHERE name = 'STBD Signal PM Assy' AND type = 'SUB_ASSEMBLY'::item_type LIMIT 1)
  AND i.name = '10cm one sided JST crimped Voilet'
  AND NOT EXISTS (
      SELECT 1 FROM bom_items WHERE bom_id = bh.id AND item_id = i.id
  )
LIMIT 1;

INSERT INTO bom_items (bom_id, item_id, quantity, created_at)
SELECT 
    bh.id,
    i.id,
    1.0,
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.item_id = (SELECT id FROM items WHERE name = 'STBD Signal PM Assy' AND type = 'SUB_ASSEMBLY'::item_type LIMIT 1)
  AND i.name = '10cm one sided JST crimped Yellow'
  AND NOT EXISTS (
      SELECT 1 FROM bom_items WHERE bom_id = bh.id AND item_id = i.id
  )
LIMIT 1;

INSERT INTO bom_items (bom_id, item_id, quantity, created_at)
SELECT 
    bh.id,
    i.id,
    1.0,
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.item_id = (SELECT id FROM items WHERE name = 'STBD Signal PM Assy' AND type = 'SUB_ASSEMBLY'::item_type LIMIT 1)
  AND i.name = '10cm one sided JST crimped Sky Blue'
  AND NOT EXISTS (
      SELECT 1 FROM bom_items WHERE bom_id = bh.id AND item_id = i.id
  )
LIMIT 1;

INSERT INTO bom_items (bom_id, item_id, quantity, created_at)
SELECT 
    bh.id,
    i.id,
    1.0,
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.item_id = (SELECT id FROM items WHERE name = 'STBD Signal PM Assy' AND type = 'SUB_ASSEMBLY'::item_type LIMIT 1)
  AND i.name = '10cm one sided JST crimped Pink'
  AND NOT EXISTS (
      SELECT 1 FROM bom_items WHERE bom_id = bh.id AND item_id = i.id
  )
LIMIT 1;

INSERT INTO bom_items (bom_id, item_id, quantity, created_at)
SELECT 
    bh.id,
    i.id,
    1.0,
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.item_id = (SELECT id FROM items WHERE name = 'STBD Signal PM Assy' AND type = 'SUB_ASSEMBLY'::item_type LIMIT 1)
  AND i.name = '10cm one sided JST crimped Orange'
  AND NOT EXISTS (
      SELECT 1 FROM bom_items WHERE bom_id = bh.id AND item_id = i.id
  )
LIMIT 1;

INSERT INTO bom_items (bom_id, item_id, quantity, created_at)
SELECT 
    bh.id,
    i.id,
    1.0,
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.item_id = (SELECT id FROM items WHERE name = 'STBD Signal PM Assy' AND type = 'SUB_ASSEMBLY'::item_type LIMIT 1)
  AND i.name = '10cm one sided JST crimped Dark Blue'
  AND NOT EXISTS (
      SELECT 1 FROM bom_items WHERE bom_id = bh.id AND item_id = i.id
  )
LIMIT 1;

INSERT INTO bom_items (bom_id, item_id, quantity, created_at)
SELECT 
    bh.id,
    i.id,
    1.0,
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.item_id = (SELECT id FROM items WHERE name = 'STBD Signal PM Assy' AND type = 'SUB_ASSEMBLY'::item_type LIMIT 1)
  AND i.name = '10cm one sided JST crimped Light Brown'
  AND NOT EXISTS (
      SELECT 1 FROM bom_items WHERE bom_id = bh.id AND item_id = i.id
  )
LIMIT 1;

INSERT INTO bom_items (bom_id, item_id, quantity, created_at)
SELECT 
    bh.id,
    i.id,
    1.0,
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.item_id = (SELECT id FROM items WHERE name = 'STBD Signal PM Assy' AND type = 'SUB_ASSEMBLY'::item_type LIMIT 1)
  AND i.name = '10cm one sided JST crimped Dark Brown'
  AND NOT EXISTS (
      SELECT 1 FROM bom_items WHERE bom_id = bh.id AND item_id = i.id
  )
LIMIT 1;

INSERT INTO bom_items (bom_id, item_id, quantity, created_at)
SELECT 
    bh.id,
    i.id,
    1.0,
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.item_id = (SELECT id FROM items WHERE name = 'STBD Signal PM Assy' AND type = 'SUB_ASSEMBLY'::item_type LIMIT 1)
  AND i.name = '10cm one sided JST crimped White with Red strip'
  AND NOT EXISTS (
      SELECT 1 FROM bom_items WHERE bom_id = bh.id AND item_id = i.id
  )
LIMIT 1;

INSERT INTO bom_items (bom_id, item_id, quantity, created_at)
SELECT 
    bh.id,
    i.id,
    1.0,
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.item_id = (SELECT id FROM items WHERE name = 'STBD Signal PM Assy' AND type = 'SUB_ASSEMBLY'::item_type LIMIT 1)
  AND i.name = '10cm one sided JST crimped White with black strip'
  AND NOT EXISTS (
      SELECT 1 FROM bom_items WHERE bom_id = bh.id AND item_id = i.id
  )
LIMIT 1;

INSERT INTO bom_items (bom_id, item_id, quantity, created_at)
SELECT 
    bh.id,
    i.id,
    1.0,
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.item_id = (SELECT id FROM items WHERE name = 'STBD Signal PM Assy' AND type = 'SUB_ASSEMBLY'::item_type LIMIT 1)
  AND i.name = '10cm one sided JST crimped White'
  AND NOT EXISTS (
      SELECT 1 FROM bom_items WHERE bom_id = bh.id AND item_id = i.id
  )
LIMIT 1;

INSERT INTO bom_items (bom_id, item_id, quantity, created_at)
SELECT 
    bh.id,
    i.id,
    1.0,
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.item_id = (SELECT id FROM items WHERE name = 'STBD Signal PM Assy' AND type = 'SUB_ASSEMBLY'::item_type LIMIT 1)
  AND i.name = '10cm one sided JST crimped Red'
  AND NOT EXISTS (
      SELECT 1 FROM bom_items WHERE bom_id = bh.id AND item_id = i.id
  )
LIMIT 1;

INSERT INTO bom_items (bom_id, item_id, quantity, created_at)
SELECT 
    bh.id,
    i.id,
    1.0,
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.item_id = (SELECT id FROM items WHERE name = 'STBD Signal PM Assy' AND type = 'SUB_ASSEMBLY'::item_type LIMIT 1)
  AND i.name = 'SY21-15 pin panel mount'
  AND NOT EXISTS (
      SELECT 1 FROM bom_items WHERE bom_id = bh.id AND item_id = i.id
  )
LIMIT 1;

INSERT INTO bom_items (bom_id, item_id, quantity, created_at)
SELECT 
    bh.id,
    i.id,
    0.15,
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.item_id = (SELECT id FROM items WHERE name = 'STBD Signal PM Assy' AND type = 'SUB_ASSEMBLY'::item_type LIMIT 1)
  AND i.name = 'HeatShrink Tube 1.5mm/1.6mm'
  AND NOT EXISTS (
      SELECT 1 FROM bom_items WHERE bom_id = bh.id AND item_id = i.id
  )
LIMIT 1;

INSERT INTO bom_items (bom_id, item_id, quantity, created_at)
SELECT 
    bh.id,
    i.id,
    2.0,
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.item_id = (SELECT id FROM items WHERE name = 'STBD Signal PM Assy' AND type = 'SUB_ASSEMBLY'::item_type LIMIT 1)
  AND i.name = 'Teroson MS930'
  AND NOT EXISTS (
      SELECT 1 FROM bom_items WHERE bom_id = bh.id AND item_id = i.id
  )
LIMIT 1;

INSERT INTO bom_items (bom_id, item_id, quantity, created_at)
SELECT 
    bh.id,
    i.id,
    5.0,
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.item_id = (SELECT id FROM items WHERE name = 'STBD Signal PM Assy' AND type = 'SUB_ASSEMBLY'::item_type LIMIT 1)
  AND i.name = 'Silicon RTV 734 Potting compound'
  AND NOT EXISTS (
      SELECT 1 FROM bom_items WHERE bom_id = bh.id AND item_id = i.id
  )
LIMIT 1;

INSERT INTO bom_items (bom_id, item_id, quantity, created_at)
SELECT 
    bh.id,
    i.id,
    5.0,
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.item_id = (SELECT id FROM items WHERE name = 'STBD Signal PM Assy' AND type = 'SUB_ASSEMBLY'::item_type LIMIT 1)
  AND i.name = 'Lead wire 22AWG'
  AND NOT EXISTS (
      SELECT 1 FROM bom_items WHERE bom_id = bh.id AND item_id = i.id
  )
LIMIT 1;

-- BOM for PORT Signal PM Assy
INSERT INTO bom_headers (tenant_id, item_id, version, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    id, 
    1, 
    true, 
    NOW(), 
    NOW()
FROM items 
WHERE name = 'PORT Signal PM Assy' AND type IN ('SUB_ASSEMBLY'::item_type, 'FINISHED_GOODS'::item_type)
  AND NOT EXISTS (
      SELECT 1 FROM bom_headers bh2 
      WHERE bh2.item_id = items.id
  )
LIMIT 1;

INSERT INTO bom_items (bom_id, item_id, quantity, created_at)
SELECT 
    bh.id,
    i.id,
    1.0,
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.item_id = (SELECT id FROM items WHERE name = 'PORT Signal PM Assy' AND type = 'SUB_ASSEMBLY'::item_type LIMIT 1)
  AND i.name = '15 pin JST-XH housing'
  AND NOT EXISTS (
      SELECT 1 FROM bom_items WHERE bom_id = bh.id AND item_id = i.id
  )
LIMIT 1;

INSERT INTO bom_items (bom_id, item_id, quantity, created_at)
SELECT 
    bh.id,
    i.id,
    1.0,
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.item_id = (SELECT id FROM items WHERE name = 'PORT Signal PM Assy' AND type = 'SUB_ASSEMBLY'::item_type LIMIT 1)
  AND i.name = '10cm one sided JST crimped Black'
  AND NOT EXISTS (
      SELECT 1 FROM bom_items WHERE bom_id = bh.id AND item_id = i.id
  )
LIMIT 1;

INSERT INTO bom_items (bom_id, item_id, quantity, created_at)
SELECT 
    bh.id,
    i.id,
    1.0,
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.item_id = (SELECT id FROM items WHERE name = 'PORT Signal PM Assy' AND type = 'SUB_ASSEMBLY'::item_type LIMIT 1)
  AND i.name = '10cm one sided JST crimped Green'
  AND NOT EXISTS (
      SELECT 1 FROM bom_items WHERE bom_id = bh.id AND item_id = i.id
  )
LIMIT 1;

INSERT INTO bom_items (bom_id, item_id, quantity, created_at)
SELECT 
    bh.id,
    i.id,
    1.0,
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.item_id = (SELECT id FROM items WHERE name = 'PORT Signal PM Assy' AND type = 'SUB_ASSEMBLY'::item_type LIMIT 1)
  AND i.name = '10cm one sided JST crimped Voilet'
  AND NOT EXISTS (
      SELECT 1 FROM bom_items WHERE bom_id = bh.id AND item_id = i.id
  )
LIMIT 1;

INSERT INTO bom_items (bom_id, item_id, quantity, created_at)
SELECT 
    bh.id,
    i.id,
    1.0,
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.item_id = (SELECT id FROM items WHERE name = 'PORT Signal PM Assy' AND type = 'SUB_ASSEMBLY'::item_type LIMIT 1)
  AND i.name = '10cm one sided JST crimped Yellow'
  AND NOT EXISTS (
      SELECT 1 FROM bom_items WHERE bom_id = bh.id AND item_id = i.id
  )
LIMIT 1;

INSERT INTO bom_items (bom_id, item_id, quantity, created_at)
SELECT 
    bh.id,
    i.id,
    1.0,
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.item_id = (SELECT id FROM items WHERE name = 'PORT Signal PM Assy' AND type = 'SUB_ASSEMBLY'::item_type LIMIT 1)
  AND i.name = '10cm one sided JST crimped Sky Blue'
  AND NOT EXISTS (
      SELECT 1 FROM bom_items WHERE bom_id = bh.id AND item_id = i.id
  )
LIMIT 1;

INSERT INTO bom_items (bom_id, item_id, quantity, created_at)
SELECT 
    bh.id,
    i.id,
    1.0,
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.item_id = (SELECT id FROM items WHERE name = 'PORT Signal PM Assy' AND type = 'SUB_ASSEMBLY'::item_type LIMIT 1)
  AND i.name = '10cm one sided JST crimped Pink'
  AND NOT EXISTS (
      SELECT 1 FROM bom_items WHERE bom_id = bh.id AND item_id = i.id
  )
LIMIT 1;

INSERT INTO bom_items (bom_id, item_id, quantity, created_at)
SELECT 
    bh.id,
    i.id,
    1.0,
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.item_id = (SELECT id FROM items WHERE name = 'PORT Signal PM Assy' AND type = 'SUB_ASSEMBLY'::item_type LIMIT 1)
  AND i.name = '10cm one sided JST crimped Orange'
  AND NOT EXISTS (
      SELECT 1 FROM bom_items WHERE bom_id = bh.id AND item_id = i.id
  )
LIMIT 1;

INSERT INTO bom_items (bom_id, item_id, quantity, created_at)
SELECT 
    bh.id,
    i.id,
    1.0,
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.item_id = (SELECT id FROM items WHERE name = 'PORT Signal PM Assy' AND type = 'SUB_ASSEMBLY'::item_type LIMIT 1)
  AND i.name = '10cm one sided JST crimped Dark Blue'
  AND NOT EXISTS (
      SELECT 1 FROM bom_items WHERE bom_id = bh.id AND item_id = i.id
  )
LIMIT 1;

INSERT INTO bom_items (bom_id, item_id, quantity, created_at)
SELECT 
    bh.id,
    i.id,
    1.0,
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.item_id = (SELECT id FROM items WHERE name = 'PORT Signal PM Assy' AND type = 'SUB_ASSEMBLY'::item_type LIMIT 1)
  AND i.name = '10cm one sided JST crimped Light Brown'
  AND NOT EXISTS (
      SELECT 1 FROM bom_items WHERE bom_id = bh.id AND item_id = i.id
  )
LIMIT 1;

INSERT INTO bom_items (bom_id, item_id, quantity, created_at)
SELECT 
    bh.id,
    i.id,
    1.0,
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.item_id = (SELECT id FROM items WHERE name = 'PORT Signal PM Assy' AND type = 'SUB_ASSEMBLY'::item_type LIMIT 1)
  AND i.name = '10cm one sided JST crimped Dark Brown'
  AND NOT EXISTS (
      SELECT 1 FROM bom_items WHERE bom_id = bh.id AND item_id = i.id
  )
LIMIT 1;

INSERT INTO bom_items (bom_id, item_id, quantity, created_at)
SELECT 
    bh.id,
    i.id,
    1.0,
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.item_id = (SELECT id FROM items WHERE name = 'PORT Signal PM Assy' AND type = 'SUB_ASSEMBLY'::item_type LIMIT 1)
  AND i.name = '10cm one sided JST crimped White with Red strip'
  AND NOT EXISTS (
      SELECT 1 FROM bom_items WHERE bom_id = bh.id AND item_id = i.id
  )
LIMIT 1;

INSERT INTO bom_items (bom_id, item_id, quantity, created_at)
SELECT 
    bh.id,
    i.id,
    1.0,
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.item_id = (SELECT id FROM items WHERE name = 'PORT Signal PM Assy' AND type = 'SUB_ASSEMBLY'::item_type LIMIT 1)
  AND i.name = '10cm one sided JST crimped White with black strip'
  AND NOT EXISTS (
      SELECT 1 FROM bom_items WHERE bom_id = bh.id AND item_id = i.id
  )
LIMIT 1;

INSERT INTO bom_items (bom_id, item_id, quantity, created_at)
SELECT 
    bh.id,
    i.id,
    1.0,
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.item_id = (SELECT id FROM items WHERE name = 'PORT Signal PM Assy' AND type = 'SUB_ASSEMBLY'::item_type LIMIT 1)
  AND i.name = '10cm one sided JST crimped White'
  AND NOT EXISTS (
      SELECT 1 FROM bom_items WHERE bom_id = bh.id AND item_id = i.id
  )
LIMIT 1;

INSERT INTO bom_items (bom_id, item_id, quantity, created_at)
SELECT 
    bh.id,
    i.id,
    1.0,
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.item_id = (SELECT id FROM items WHERE name = 'PORT Signal PM Assy' AND type = 'SUB_ASSEMBLY'::item_type LIMIT 1)
  AND i.name = '10cm one sided JST crimped Dark Parrot Green'
  AND NOT EXISTS (
      SELECT 1 FROM bom_items WHERE bom_id = bh.id AND item_id = i.id
  )
LIMIT 1;

INSERT INTO bom_items (bom_id, item_id, quantity, created_at)
SELECT 
    bh.id,
    i.id,
    1.0,
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.item_id = (SELECT id FROM items WHERE name = 'PORT Signal PM Assy' AND type = 'SUB_ASSEMBLY'::item_type LIMIT 1)
  AND i.name = 'SY21-15 pin panel mount'
  AND NOT EXISTS (
      SELECT 1 FROM bom_items WHERE bom_id = bh.id AND item_id = i.id
  )
LIMIT 1;

INSERT INTO bom_items (bom_id, item_id, quantity, created_at)
SELECT 
    bh.id,
    i.id,
    0.15,
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.item_id = (SELECT id FROM items WHERE name = 'PORT Signal PM Assy' AND type = 'SUB_ASSEMBLY'::item_type LIMIT 1)
  AND i.name = 'HeatShrink Tube 1.5mm/1.6mm'
  AND NOT EXISTS (
      SELECT 1 FROM bom_items WHERE bom_id = bh.id AND item_id = i.id
  )
LIMIT 1;

INSERT INTO bom_items (bom_id, item_id, quantity, created_at)
SELECT 
    bh.id,
    i.id,
    2.0,
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.item_id = (SELECT id FROM items WHERE name = 'PORT Signal PM Assy' AND type = 'SUB_ASSEMBLY'::item_type LIMIT 1)
  AND i.name = 'Teroson MS930'
  AND NOT EXISTS (
      SELECT 1 FROM bom_items WHERE bom_id = bh.id AND item_id = i.id
  )
LIMIT 1;

INSERT INTO bom_items (bom_id, item_id, quantity, created_at)
SELECT 
    bh.id,
    i.id,
    5.0,
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.item_id = (SELECT id FROM items WHERE name = 'PORT Signal PM Assy' AND type = 'SUB_ASSEMBLY'::item_type LIMIT 1)
  AND i.name = 'Silicon RTV 734 Potting compound'
  AND NOT EXISTS (
      SELECT 1 FROM bom_items WHERE bom_id = bh.id AND item_id = i.id
  )
LIMIT 1;

INSERT INTO bom_items (bom_id, item_id, quantity, created_at)
SELECT 
    bh.id,
    i.id,
    5.0,
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.item_id = (SELECT id FROM items WHERE name = 'PORT Signal PM Assy' AND type = 'SUB_ASSEMBLY'::item_type LIMIT 1)
  AND i.name = 'Lead wire 22AWG'
  AND NOT EXISTS (
      SELECT 1 FROM bom_items WHERE bom_id = bh.id AND item_id = i.id
  )
LIMIT 1;

-- BOM for STBD Signal CM Assy
INSERT INTO bom_headers (tenant_id, item_id, version, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    id, 
    1, 
    true, 
    NOW(), 
    NOW()
FROM items 
WHERE name = 'STBD Signal CM Assy' AND type IN ('SUB_ASSEMBLY'::item_type, 'FINISHED_GOODS'::item_type)
  AND NOT EXISTS (
      SELECT 1 FROM bom_headers bh2 
      WHERE bh2.item_id = items.id
  )
LIMIT 1;

INSERT INTO bom_items (bom_id, item_id, quantity, created_at)
SELECT 
    bh.id,
    i.id,
    1,
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.item_id = (SELECT id FROM items WHERE name = 'STBD Signal CM Assy' AND type = 'SUB_ASSEMBLY'::item_type LIMIT 1)
  AND i.name = '2mm male bullet connector'
  AND NOT EXISTS (
      SELECT 1 FROM bom_items WHERE bom_id = bh.id AND item_id = i.id
  )
LIMIT 1;

INSERT INTO bom_items (bom_id, item_id, quantity, created_at)
SELECT 
    bh.id,
    i.id,
    1,
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.item_id = (SELECT id FROM items WHERE name = 'STBD Signal CM Assy' AND type = 'SUB_ASSEMBLY'::item_type LIMIT 1)
  AND i.name = '2mm Female Bullet connector'
  AND NOT EXISTS (
      SELECT 1 FROM bom_items WHERE bom_id = bh.id AND item_id = i.id
  )
LIMIT 1;

INSERT INTO bom_items (bom_id, item_id, quantity, created_at)
SELECT 
    bh.id,
    i.id,
    5.0,
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.item_id = (SELECT id FROM items WHERE name = 'STBD Signal CM Assy' AND type = 'SUB_ASSEMBLY'::item_type LIMIT 1)
  AND i.name = 'Lead wire 22AWG'
  AND NOT EXISTS (
      SELECT 1 FROM bom_items WHERE bom_id = bh.id AND item_id = i.id
  )
LIMIT 1;

INSERT INTO bom_items (bom_id, item_id, quantity, created_at)
SELECT 
    bh.id,
    i.id,
    2.0,
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.item_id = (SELECT id FROM items WHERE name = 'STBD Signal CM Assy' AND type = 'SUB_ASSEMBLY'::item_type LIMIT 1)
  AND i.name = 'Soldering flux'
  AND NOT EXISTS (
      SELECT 1 FROM bom_items WHERE bom_id = bh.id AND item_id = i.id
  )
LIMIT 1;

INSERT INTO bom_items (bom_id, item_id, quantity, created_at)
SELECT 
    bh.id,
    i.id,
    1.0,
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.item_id = (SELECT id FROM items WHERE name = 'STBD Signal CM Assy' AND type = 'SUB_ASSEMBLY'::item_type LIMIT 1)
  AND i.name = 'LM61 Temperature Sensor'
  AND NOT EXISTS (
      SELECT 1 FROM bom_items WHERE bom_id = bh.id AND item_id = i.id
  )
LIMIT 1;

INSERT INTO bom_items (bom_id, item_id, quantity, created_at)
SELECT 
    bh.id,
    i.id,
    0.85,
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.item_id = (SELECT id FROM items WHERE name = 'STBD Signal CM Assy' AND type = 'SUB_ASSEMBLY'::item_type LIMIT 1)
  AND i.name = '20Core Wire 14/38'
  AND NOT EXISTS (
      SELECT 1 FROM bom_items WHERE bom_id = bh.id AND item_id = i.id
  )
LIMIT 1;

INSERT INTO bom_items (bom_id, item_id, quantity, created_at)
SELECT 
    bh.id,
    i.id,
    0.15,
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.item_id = (SELECT id FROM items WHERE name = 'STBD Signal CM Assy' AND type = 'SUB_ASSEMBLY'::item_type LIMIT 1)
  AND i.name = 'Red 14/38 wire'
  AND NOT EXISTS (
      SELECT 1 FROM bom_items WHERE bom_id = bh.id AND item_id = i.id
  )
LIMIT 1;

INSERT INTO bom_items (bom_id, item_id, quantity, created_at)
SELECT 
    bh.id,
    i.id,
    1.0,
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.item_id = (SELECT id FROM items WHERE name = 'STBD Signal CM Assy' AND type = 'SUB_ASSEMBLY'::item_type LIMIT 1)
  AND i.name = 'SY21-15 pin Cable Mount'
  AND NOT EXISTS (
      SELECT 1 FROM bom_items WHERE bom_id = bh.id AND item_id = i.id
  )
LIMIT 1;

INSERT INTO bom_items (bom_id, item_id, quantity, created_at)
SELECT 
    bh.id,
    i.id,
    1.0,
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.item_id = (SELECT id FROM items WHERE name = 'STBD Signal CM Assy' AND type = 'SUB_ASSEMBLY'::item_type LIMIT 1)
  AND i.name = 'BlueRobotics Leak'
  AND NOT EXISTS (
      SELECT 1 FROM bom_items WHERE bom_id = bh.id AND item_id = i.id
  )
LIMIT 1;

INSERT INTO bom_items (bom_id, item_id, quantity, created_at)
SELECT 
    bh.id,
    i.id,
    0.05,
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.item_id = (SELECT id FROM items WHERE name = 'STBD Signal CM Assy' AND type = 'SUB_ASSEMBLY'::item_type LIMIT 1)
  AND i.name = 'HeatShrink Tube 4:1'
  AND NOT EXISTS (
      SELECT 1 FROM bom_items WHERE bom_id = bh.id AND item_id = i.id
  )
LIMIT 1;

INSERT INTO bom_items (bom_id, item_id, quantity, created_at)
SELECT 
    bh.id,
    i.id,
    0.1,
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.item_id = (SELECT id FROM items WHERE name = 'STBD Signal CM Assy' AND type = 'SUB_ASSEMBLY'::item_type LIMIT 1)
  AND i.name = 'HeatShrink Tube 12:3'
  AND NOT EXISTS (
      SELECT 1 FROM bom_items WHERE bom_id = bh.id AND item_id = i.id
  )
LIMIT 1;

INSERT INTO bom_items (bom_id, item_id, quantity, created_at)
SELECT 
    bh.id,
    i.id,
    0.15,
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.item_id = (SELECT id FROM items WHERE name = 'STBD Signal CM Assy' AND type = 'SUB_ASSEMBLY'::item_type LIMIT 1)
  AND i.name = 'HeatShrink Tube 1.5mm/1.6mm'
  AND NOT EXISTS (
      SELECT 1 FROM bom_items WHERE bom_id = bh.id AND item_id = i.id
  )
LIMIT 1;

INSERT INTO bom_items (bom_id, item_id, quantity, created_at)
SELECT 
    bh.id,
    i.id,
    1.0,
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.item_id = (SELECT id FROM items WHERE name = 'STBD Signal CM Assy' AND type = 'SUB_ASSEMBLY'::item_type LIMIT 1)
  AND i.name = '1uF 0805 PANASONIC'
  AND NOT EXISTS (
      SELECT 1 FROM bom_items WHERE bom_id = bh.id AND item_id = i.id
  )
LIMIT 1;

INSERT INTO bom_items (bom_id, item_id, quantity, created_at)
SELECT 
    bh.id,
    i.id,
    0.1,
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.item_id = (SELECT id FROM items WHERE name = 'STBD Signal CM Assy' AND type = 'SUB_ASSEMBLY'::item_type LIMIT 1)
  AND i.name = 'HeatShrink Tube 3:1'
  AND NOT EXISTS (
      SELECT 1 FROM bom_items WHERE bom_id = bh.id AND item_id = i.id
  )
LIMIT 1;

INSERT INTO bom_items (bom_id, item_id, quantity, created_at)
SELECT 
    bh.id,
    i.id,
    10.0,
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.item_id = (SELECT id FROM items WHERE name = 'STBD Signal CM Assy' AND type = 'SUB_ASSEMBLY'::item_type LIMIT 1)
  AND i.name = 'Silicon RTV 734 Potting compound'
  AND NOT EXISTS (
      SELECT 1 FROM bom_items WHERE bom_id = bh.id AND item_id = i.id
  )
LIMIT 1;

-- BOM for PORT Signal CM Assy
INSERT INTO bom_headers (tenant_id, item_id, version, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    id, 
    1, 
    true, 
    NOW(), 
    NOW()
FROM items 
WHERE name = 'PORT Signal CM Assy' AND type IN ('SUB_ASSEMBLY'::item_type, 'FINISHED_GOODS'::item_type)
  AND NOT EXISTS (
      SELECT 1 FROM bom_headers bh2 
      WHERE bh2.item_id = items.id
  )
LIMIT 1;

INSERT INTO bom_items (bom_id, item_id, quantity, created_at)
SELECT 
    bh.id,
    i.id,
    1,
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.item_id = (SELECT id FROM items WHERE name = 'PORT Signal CM Assy' AND type = 'SUB_ASSEMBLY'::item_type LIMIT 1)
  AND i.name = '2mm male bullet connector'
  AND NOT EXISTS (
      SELECT 1 FROM bom_items WHERE bom_id = bh.id AND item_id = i.id
  )
LIMIT 1;

INSERT INTO bom_items (bom_id, item_id, quantity, created_at)
SELECT 
    bh.id,
    i.id,
    1,
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.item_id = (SELECT id FROM items WHERE name = 'PORT Signal CM Assy' AND type = 'SUB_ASSEMBLY'::item_type LIMIT 1)
  AND i.name = '2mm Female Bullet connector'
  AND NOT EXISTS (
      SELECT 1 FROM bom_items WHERE bom_id = bh.id AND item_id = i.id
  )
LIMIT 1;

INSERT INTO bom_items (bom_id, item_id, quantity, created_at)
SELECT 
    bh.id,
    i.id,
    5.0,
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.item_id = (SELECT id FROM items WHERE name = 'PORT Signal CM Assy' AND type = 'SUB_ASSEMBLY'::item_type LIMIT 1)
  AND i.name = 'Lead wire 22AWG'
  AND NOT EXISTS (
      SELECT 1 FROM bom_items WHERE bom_id = bh.id AND item_id = i.id
  )
LIMIT 1;

INSERT INTO bom_items (bom_id, item_id, quantity, created_at)
SELECT 
    bh.id,
    i.id,
    2.0,
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.item_id = (SELECT id FROM items WHERE name = 'PORT Signal CM Assy' AND type = 'SUB_ASSEMBLY'::item_type LIMIT 1)
  AND i.name = 'Soldering flux'
  AND NOT EXISTS (
      SELECT 1 FROM bom_items WHERE bom_id = bh.id AND item_id = i.id
  )
LIMIT 1;

INSERT INTO bom_items (bom_id, item_id, quantity, created_at)
SELECT 
    bh.id,
    i.id,
    1.0,
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.item_id = (SELECT id FROM items WHERE name = 'PORT Signal CM Assy' AND type = 'SUB_ASSEMBLY'::item_type LIMIT 1)
  AND i.name = 'LM61 Temperature Sensor'
  AND NOT EXISTS (
      SELECT 1 FROM bom_items WHERE bom_id = bh.id AND item_id = i.id
  )
LIMIT 1;

INSERT INTO bom_items (bom_id, item_id, quantity, created_at)
SELECT 
    bh.id,
    i.id,
    0.85,
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.item_id = (SELECT id FROM items WHERE name = 'PORT Signal CM Assy' AND type = 'SUB_ASSEMBLY'::item_type LIMIT 1)
  AND i.name = '20Core Wire 14/38'
  AND NOT EXISTS (
      SELECT 1 FROM bom_items WHERE bom_id = bh.id AND item_id = i.id
  )
LIMIT 1;

INSERT INTO bom_items (bom_id, item_id, quantity, created_at)
SELECT 
    bh.id,
    i.id,
    0.15,
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.item_id = (SELECT id FROM items WHERE name = 'PORT Signal CM Assy' AND type = 'SUB_ASSEMBLY'::item_type LIMIT 1)
  AND i.name = 'Black 14/38 Wire'
  AND NOT EXISTS (
      SELECT 1 FROM bom_items WHERE bom_id = bh.id AND item_id = i.id
  )
LIMIT 1;

INSERT INTO bom_items (bom_id, item_id, quantity, created_at)
SELECT 
    bh.id,
    i.id,
    1.0,
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.item_id = (SELECT id FROM items WHERE name = 'PORT Signal CM Assy' AND type = 'SUB_ASSEMBLY'::item_type LIMIT 1)
  AND i.name = 'SY21-15 pin Cable Mount'
  AND NOT EXISTS (
      SELECT 1 FROM bom_items WHERE bom_id = bh.id AND item_id = i.id
  )
LIMIT 1;

INSERT INTO bom_items (bom_id, item_id, quantity, created_at)
SELECT 
    bh.id,
    i.id,
    1.0,
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.item_id = (SELECT id FROM items WHERE name = 'PORT Signal CM Assy' AND type = 'SUB_ASSEMBLY'::item_type LIMIT 1)
  AND i.name = 'BlueRobotics Leak'
  AND NOT EXISTS (
      SELECT 1 FROM bom_items WHERE bom_id = bh.id AND item_id = i.id
  )
LIMIT 1;

INSERT INTO bom_items (bom_id, item_id, quantity, created_at)
SELECT 
    bh.id,
    i.id,
    0.05,
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.item_id = (SELECT id FROM items WHERE name = 'PORT Signal CM Assy' AND type = 'SUB_ASSEMBLY'::item_type LIMIT 1)
  AND i.name = 'HeatShrink Tube 4:1'
  AND NOT EXISTS (
      SELECT 1 FROM bom_items WHERE bom_id = bh.id AND item_id = i.id
  )
LIMIT 1;

INSERT INTO bom_items (bom_id, item_id, quantity, created_at)
SELECT 
    bh.id,
    i.id,
    0.1,
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.item_id = (SELECT id FROM items WHERE name = 'PORT Signal CM Assy' AND type = 'SUB_ASSEMBLY'::item_type LIMIT 1)
  AND i.name = 'HeatShrink Tube 12:3'
  AND NOT EXISTS (
      SELECT 1 FROM bom_items WHERE bom_id = bh.id AND item_id = i.id
  )
LIMIT 1;

INSERT INTO bom_items (bom_id, item_id, quantity, created_at)
SELECT 
    bh.id,
    i.id,
    0.15,
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.item_id = (SELECT id FROM items WHERE name = 'PORT Signal CM Assy' AND type = 'SUB_ASSEMBLY'::item_type LIMIT 1)
  AND i.name = 'HeatShrink Tube 1.5mm/1.6mm'
  AND NOT EXISTS (
      SELECT 1 FROM bom_items WHERE bom_id = bh.id AND item_id = i.id
  )
LIMIT 1;

INSERT INTO bom_items (bom_id, item_id, quantity, created_at)
SELECT 
    bh.id,
    i.id,
    1.0,
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.item_id = (SELECT id FROM items WHERE name = 'PORT Signal CM Assy' AND type = 'SUB_ASSEMBLY'::item_type LIMIT 1)
  AND i.name = '1uF 0805 PANASONIC'
  AND NOT EXISTS (
      SELECT 1 FROM bom_items WHERE bom_id = bh.id AND item_id = i.id
  )
LIMIT 1;

INSERT INTO bom_items (bom_id, item_id, quantity, created_at)
SELECT 
    bh.id,
    i.id,
    0.1,
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.item_id = (SELECT id FROM items WHERE name = 'PORT Signal CM Assy' AND type = 'SUB_ASSEMBLY'::item_type LIMIT 1)
  AND i.name = 'HeatShrink Tube 3:1'
  AND NOT EXISTS (
      SELECT 1 FROM bom_items WHERE bom_id = bh.id AND item_id = i.id
  )
LIMIT 1;

INSERT INTO bom_items (bom_id, item_id, quantity, created_at)
SELECT 
    bh.id,
    i.id,
    10.0,
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.item_id = (SELECT id FROM items WHERE name = 'PORT Signal CM Assy' AND type = 'SUB_ASSEMBLY'::item_type LIMIT 1)
  AND i.name = 'Silicon RTV 734 Potting compound'
  AND NOT EXISTS (
      SELECT 1 FROM bom_items WHERE bom_id = bh.id AND item_id = i.id
  )
LIMIT 1;

-- BOM for Charging PM Assy
INSERT INTO bom_headers (tenant_id, item_id, version, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    id, 
    1, 
    true, 
    NOW(), 
    NOW()
FROM items 
WHERE name = 'Charging PM Assy' AND type IN ('SUB_ASSEMBLY'::item_type, 'FINISHED_GOODS'::item_type)
  AND NOT EXISTS (
      SELECT 1 FROM bom_headers bh2 
      WHERE bh2.item_id = items.id
  )
LIMIT 1;

INSERT INTO bom_items (bom_id, item_id, quantity, created_at)
SELECT 
    bh.id,
    i.id,
    1.0,
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.item_id = (SELECT id FROM items WHERE name = 'Charging PM Assy' AND type = 'SUB_ASSEMBLY'::item_type LIMIT 1)
  AND i.name = '2mm male bullet connector'
  AND NOT EXISTS (
      SELECT 1 FROM bom_items WHERE bom_id = bh.id AND item_id = i.id
  )
LIMIT 1;

INSERT INTO bom_items (bom_id, item_id, quantity, created_at)
SELECT 
    bh.id,
    i.id,
    0.35,
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.item_id = (SELECT id FROM items WHERE name = 'Charging PM Assy' AND type = 'SUB_ASSEMBLY'::item_type LIMIT 1)
  AND i.name = 'Black 18 AWG'
  AND NOT EXISTS (
      SELECT 1 FROM bom_items WHERE bom_id = bh.id AND item_id = i.id
  )
LIMIT 1;

INSERT INTO bom_items (bom_id, item_id, quantity, created_at)
SELECT 
    bh.id,
    i.id,
    0.3,
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.item_id = (SELECT id FROM items WHERE name = 'Charging PM Assy' AND type = 'SUB_ASSEMBLY'::item_type LIMIT 1)
  AND i.name = 'Black 20 AWG'
  AND NOT EXISTS (
      SELECT 1 FROM bom_items WHERE bom_id = bh.id AND item_id = i.id
  )
LIMIT 1;

INSERT INTO bom_items (bom_id, item_id, quantity, created_at)
SELECT 
    bh.id,
    i.id,
    0.3,
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.item_id = (SELECT id FROM items WHERE name = 'Charging PM Assy' AND type = 'SUB_ASSEMBLY'::item_type LIMIT 1)
  AND i.name = 'Red 20 AWG'
  AND NOT EXISTS (
      SELECT 1 FROM bom_items WHERE bom_id = bh.id AND item_id = i.id
  )
LIMIT 1;

INSERT INTO bom_items (bom_id, item_id, quantity, created_at)
SELECT 
    bh.id,
    i.id,
    1.0,
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.item_id = (SELECT id FROM items WHERE name = 'Charging PM Assy' AND type = 'SUB_ASSEMBLY'::item_type LIMIT 1)
  AND i.name = '13 pin JST-XH housing'
  AND NOT EXISTS (
      SELECT 1 FROM bom_items WHERE bom_id = bh.id AND item_id = i.id
  )
LIMIT 1;

INSERT INTO bom_items (bom_id, item_id, quantity, created_at)
SELECT 
    bh.id,
    i.id,
    1.0,
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.item_id = (SELECT id FROM items WHERE name = 'Charging PM Assy' AND type = 'SUB_ASSEMBLY'::item_type LIMIT 1)
  AND i.name = '10cm one sided JST crimped Green'
  AND NOT EXISTS (
      SELECT 1 FROM bom_items WHERE bom_id = bh.id AND item_id = i.id
  )
LIMIT 1;

INSERT INTO bom_items (bom_id, item_id, quantity, created_at)
SELECT 
    bh.id,
    i.id,
    1.0,
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.item_id = (SELECT id FROM items WHERE name = 'Charging PM Assy' AND type = 'SUB_ASSEMBLY'::item_type LIMIT 1)
  AND i.name = '10cm one sided JST crimped Voilet'
  AND NOT EXISTS (
      SELECT 1 FROM bom_items WHERE bom_id = bh.id AND item_id = i.id
  )
LIMIT 1;

INSERT INTO bom_items (bom_id, item_id, quantity, created_at)
SELECT 
    bh.id,
    i.id,
    1.0,
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.item_id = (SELECT id FROM items WHERE name = 'Charging PM Assy' AND type = 'SUB_ASSEMBLY'::item_type LIMIT 1)
  AND i.name = '10cm one sided JST crimped Yellow'
  AND NOT EXISTS (
      SELECT 1 FROM bom_items WHERE bom_id = bh.id AND item_id = i.id
  )
LIMIT 1;

INSERT INTO bom_items (bom_id, item_id, quantity, created_at)
SELECT 
    bh.id,
    i.id,
    1.0,
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.item_id = (SELECT id FROM items WHERE name = 'Charging PM Assy' AND type = 'SUB_ASSEMBLY'::item_type LIMIT 1)
  AND i.name = '10cm one sided JST crimped Sky Blue'
  AND NOT EXISTS (
      SELECT 1 FROM bom_items WHERE bom_id = bh.id AND item_id = i.id
  )
LIMIT 1;

INSERT INTO bom_items (bom_id, item_id, quantity, created_at)
SELECT 
    bh.id,
    i.id,
    1.0,
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.item_id = (SELECT id FROM items WHERE name = 'Charging PM Assy' AND type = 'SUB_ASSEMBLY'::item_type LIMIT 1)
  AND i.name = '10cm one sided JST crimped Pink'
  AND NOT EXISTS (
      SELECT 1 FROM bom_items WHERE bom_id = bh.id AND item_id = i.id
  )
LIMIT 1;

INSERT INTO bom_items (bom_id, item_id, quantity, created_at)
SELECT 
    bh.id,
    i.id,
    1.0,
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.item_id = (SELECT id FROM items WHERE name = 'Charging PM Assy' AND type = 'SUB_ASSEMBLY'::item_type LIMIT 1)
  AND i.name = '10cm one sided JST crimped Orange'
  AND NOT EXISTS (
      SELECT 1 FROM bom_items WHERE bom_id = bh.id AND item_id = i.id
  )
LIMIT 1;

INSERT INTO bom_items (bom_id, item_id, quantity, created_at)
SELECT 
    bh.id,
    i.id,
    1.0,
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.item_id = (SELECT id FROM items WHERE name = 'Charging PM Assy' AND type = 'SUB_ASSEMBLY'::item_type LIMIT 1)
  AND i.name = '10cm one sided JST crimped Dark Blue'
  AND NOT EXISTS (
      SELECT 1 FROM bom_items WHERE bom_id = bh.id AND item_id = i.id
  )
LIMIT 1;

INSERT INTO bom_items (bom_id, item_id, quantity, created_at)
SELECT 
    bh.id,
    i.id,
    1.0,
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.item_id = (SELECT id FROM items WHERE name = 'Charging PM Assy' AND type = 'SUB_ASSEMBLY'::item_type LIMIT 1)
  AND i.name = '10cm one sided JST crimped Light Brown'
  AND NOT EXISTS (
      SELECT 1 FROM bom_items WHERE bom_id = bh.id AND item_id = i.id
  )
LIMIT 1;

INSERT INTO bom_items (bom_id, item_id, quantity, created_at)
SELECT 
    bh.id,
    i.id,
    1.0,
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.item_id = (SELECT id FROM items WHERE name = 'Charging PM Assy' AND type = 'SUB_ASSEMBLY'::item_type LIMIT 1)
  AND i.name = '10cm one sided JST crimped Dark Brown'
  AND NOT EXISTS (
      SELECT 1 FROM bom_items WHERE bom_id = bh.id AND item_id = i.id
  )
LIMIT 1;

INSERT INTO bom_items (bom_id, item_id, quantity, created_at)
SELECT 
    bh.id,
    i.id,
    1.0,
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.item_id = (SELECT id FROM items WHERE name = 'Charging PM Assy' AND type = 'SUB_ASSEMBLY'::item_type LIMIT 1)
  AND i.name = '10cm one sided JST crimped White with Red strip'
  AND NOT EXISTS (
      SELECT 1 FROM bom_items WHERE bom_id = bh.id AND item_id = i.id
  )
LIMIT 1;

INSERT INTO bom_items (bom_id, item_id, quantity, created_at)
SELECT 
    bh.id,
    i.id,
    1.0,
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.item_id = (SELECT id FROM items WHERE name = 'Charging PM Assy' AND type = 'SUB_ASSEMBLY'::item_type LIMIT 1)
  AND i.name = '10cm one sided JST crimped White with black strip'
  AND NOT EXISTS (
      SELECT 1 FROM bom_items WHERE bom_id = bh.id AND item_id = i.id
  )
LIMIT 1;

INSERT INTO bom_items (bom_id, item_id, quantity, created_at)
SELECT 
    bh.id,
    i.id,
    1.0,
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.item_id = (SELECT id FROM items WHERE name = 'Charging PM Assy' AND type = 'SUB_ASSEMBLY'::item_type LIMIT 1)
  AND i.name = '10cm one sided JST crimped White'
  AND NOT EXISTS (
      SELECT 1 FROM bom_items WHERE bom_id = bh.id AND item_id = i.id
  )
LIMIT 1;

INSERT INTO bom_items (bom_id, item_id, quantity, created_at)
SELECT 
    bh.id,
    i.id,
    1.0,
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.item_id = (SELECT id FROM items WHERE name = 'Charging PM Assy' AND type = 'SUB_ASSEMBLY'::item_type LIMIT 1)
  AND i.name = '10cm one sided JST crimped Light Grey'
  AND NOT EXISTS (
      SELECT 1 FROM bom_items WHERE bom_id = bh.id AND item_id = i.id
  )
LIMIT 1;

INSERT INTO bom_items (bom_id, item_id, quantity, created_at)
SELECT 
    bh.id,
    i.id,
    1.0,
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.item_id = (SELECT id FROM items WHERE name = 'Charging PM Assy' AND type = 'SUB_ASSEMBLY'::item_type LIMIT 1)
  AND i.name = 'WY-28 Metal connector PM'
  AND NOT EXISTS (
      SELECT 1 FROM bom_items WHERE bom_id = bh.id AND item_id = i.id
  )
LIMIT 1;

INSERT INTO bom_items (bom_id, item_id, quantity, created_at)
SELECT 
    bh.id,
    i.id,
    0.05,
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.item_id = (SELECT id FROM items WHERE name = 'Charging PM Assy' AND type = 'SUB_ASSEMBLY'::item_type LIMIT 1)
  AND i.name = 'Heatshrink Tube 6.4:1.6'
  AND NOT EXISTS (
      SELECT 1 FROM bom_items WHERE bom_id = bh.id AND item_id = i.id
  )
LIMIT 1;

INSERT INTO bom_items (bom_id, item_id, quantity, created_at)
SELECT 
    bh.id,
    i.id,
    0.06,
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.item_id = (SELECT id FROM items WHERE name = 'Charging PM Assy' AND type = 'SUB_ASSEMBLY'::item_type LIMIT 1)
  AND i.name = 'HeatShrink Tube 4:1'
  AND NOT EXISTS (
      SELECT 1 FROM bom_items WHERE bom_id = bh.id AND item_id = i.id
  )
LIMIT 1;

INSERT INTO bom_items (bom_id, item_id, quantity, created_at)
SELECT 
    bh.id,
    i.id,
    0.2,
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.item_id = (SELECT id FROM items WHERE name = 'Charging PM Assy' AND type = 'SUB_ASSEMBLY'::item_type LIMIT 1)
  AND i.name = 'HeatShrink Tube 1.5mm/1.6mm'
  AND NOT EXISTS (
      SELECT 1 FROM bom_items WHERE bom_id = bh.id AND item_id = i.id
  )
LIMIT 1;

INSERT INTO bom_items (bom_id, item_id, quantity, created_at)
SELECT 
    bh.id,
    i.id,
    2.0,
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.item_id = (SELECT id FROM items WHERE name = 'Charging PM Assy' AND type = 'SUB_ASSEMBLY'::item_type LIMIT 1)
  AND i.name = 'Teroson MS930'
  AND NOT EXISTS (
      SELECT 1 FROM bom_items WHERE bom_id = bh.id AND item_id = i.id
  )
LIMIT 1;

INSERT INTO bom_items (bom_id, item_id, quantity, created_at)
SELECT 
    bh.id,
    i.id,
    10.0,
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.item_id = (SELECT id FROM items WHERE name = 'Charging PM Assy' AND type = 'SUB_ASSEMBLY'::item_type LIMIT 1)
  AND i.name = 'Silicon RTV 734 Potting compound'
  AND NOT EXISTS (
      SELECT 1 FROM bom_items WHERE bom_id = bh.id AND item_id = i.id
  )
LIMIT 1;

-- BOM for Charger Box Assy
INSERT INTO bom_headers (tenant_id, item_id, version, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    id, 
    1, 
    true, 
    NOW(), 
    NOW()
FROM items 
WHERE name = 'Charger Box Assy' AND type IN ('SUB_ASSEMBLY'::item_type, 'FINISHED_GOODS'::item_type)
  AND NOT EXISTS (
      SELECT 1 FROM bom_headers bh2 
      WHERE bh2.item_id = items.id
  )
LIMIT 1;

INSERT INTO bom_items (bom_id, item_id, quantity, created_at)
SELECT 
    bh.id,
    i.id,
    1.0,
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.item_id = (SELECT id FROM items WHERE name = 'Charger Box Assy' AND type = 'SUB_ASSEMBLY'::item_type LIMIT 1)
  AND i.name = '24v AC/DC module'
  AND NOT EXISTS (
      SELECT 1 FROM bom_items WHERE bom_id = bh.id AND item_id = i.id
  )
LIMIT 1;

INSERT INTO bom_items (bom_id, item_id, quantity, created_at)
SELECT 
    bh.id,
    i.id,
    10.0,
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.item_id = (SELECT id FROM items WHERE name = 'Charger Box Assy' AND type = 'SUB_ASSEMBLY'::item_type LIMIT 1)
  AND i.name = 'Lead wire 22AWG'
  AND NOT EXISTS (
      SELECT 1 FROM bom_items WHERE bom_id = bh.id AND item_id = i.id
  )
LIMIT 1;

INSERT INTO bom_items (bom_id, item_id, quantity, created_at)
SELECT 
    bh.id,
    i.id,
    1.0,
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.item_id = (SELECT id FROM items WHERE name = 'Charger Box Assy' AND type = 'SUB_ASSEMBLY'::item_type LIMIT 1)
  AND i.name = 'Soldering flux'
  AND NOT EXISTS (
      SELECT 1 FROM bom_items WHERE bom_id = bh.id AND item_id = i.id
  )
LIMIT 1;

INSERT INTO bom_items (bom_id, item_id, quantity, created_at)
SELECT 
    bh.id,
    i.id,
    1.0,
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.item_id = (SELECT id FROM items WHERE name = 'Charger Box Assy' AND type = 'SUB_ASSEMBLY'::item_type LIMIT 1)
  AND i.name = '3 pin 3 yrd power cord'
  AND NOT EXISTS (
      SELECT 1 FROM bom_items WHERE bom_id = bh.id AND item_id = i.id
  )
LIMIT 1;

INSERT INTO bom_items (bom_id, item_id, quantity, created_at)
SELECT 
    bh.id,
    i.id,
    1.0,
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.item_id = (SELECT id FROM items WHERE name = 'Charger Box Assy' AND type = 'SUB_ASSEMBLY'::item_type LIMIT 1)
  AND i.name = '25cm Black Microfit one side crimped wires'
  AND NOT EXISTS (
      SELECT 1 FROM bom_items WHERE bom_id = bh.id AND item_id = i.id
  )
LIMIT 1;

INSERT INTO bom_items (bom_id, item_id, quantity, created_at)
SELECT 
    bh.id,
    i.id,
    1.0,
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.item_id = (SELECT id FROM items WHERE name = 'Charger Box Assy' AND type = 'SUB_ASSEMBLY'::item_type LIMIT 1)
  AND i.name = '25cm Green Microfit one side crimped wires'
  AND NOT EXISTS (
      SELECT 1 FROM bom_items WHERE bom_id = bh.id AND item_id = i.id
  )
LIMIT 1;

INSERT INTO bom_items (bom_id, item_id, quantity, created_at)
SELECT 
    bh.id,
    i.id,
    1.0,
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.item_id = (SELECT id FROM items WHERE name = 'Charger Box Assy' AND type = 'SUB_ASSEMBLY'::item_type LIMIT 1)
  AND i.name = '25cm Violet Microfit one side crimped wires'
  AND NOT EXISTS (
      SELECT 1 FROM bom_items WHERE bom_id = bh.id AND item_id = i.id
  )
LIMIT 1;

INSERT INTO bom_items (bom_id, item_id, quantity, created_at)
SELECT 
    bh.id,
    i.id,
    1.0,
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.item_id = (SELECT id FROM items WHERE name = 'Charger Box Assy' AND type = 'SUB_ASSEMBLY'::item_type LIMIT 1)
  AND i.name = '25cm Yellow Microfit one side crimped wires'
  AND NOT EXISTS (
      SELECT 1 FROM bom_items WHERE bom_id = bh.id AND item_id = i.id
  )
LIMIT 1;

INSERT INTO bom_items (bom_id, item_id, quantity, created_at)
SELECT 
    bh.id,
    i.id,
    1.0,
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.item_id = (SELECT id FROM items WHERE name = 'Charger Box Assy' AND type = 'SUB_ASSEMBLY'::item_type LIMIT 1)
  AND i.name = '25cm Blue Microfit one side crimped wires'
  AND NOT EXISTS (
      SELECT 1 FROM bom_items WHERE bom_id = bh.id AND item_id = i.id
  )
LIMIT 1;

INSERT INTO bom_items (bom_id, item_id, quantity, created_at)
SELECT 
    bh.id,
    i.id,
    1.0,
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.item_id = (SELECT id FROM items WHERE name = 'Charger Box Assy' AND type = 'SUB_ASSEMBLY'::item_type LIMIT 1)
  AND i.name = '25cm Pink Microfit one side crimped wires'
  AND NOT EXISTS (
      SELECT 1 FROM bom_items WHERE bom_id = bh.id AND item_id = i.id
  )
LIMIT 1;

INSERT INTO bom_items (bom_id, item_id, quantity, created_at)
SELECT 
    bh.id,
    i.id,
    1.0,
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.item_id = (SELECT id FROM items WHERE name = 'Charger Box Assy' AND type = 'SUB_ASSEMBLY'::item_type LIMIT 1)
  AND i.name = '25cm L.Brown Microfit one side crimped wires'
  AND NOT EXISTS (
      SELECT 1 FROM bom_items WHERE bom_id = bh.id AND item_id = i.id
  )
LIMIT 1;

INSERT INTO bom_items (bom_id, item_id, quantity, created_at)
SELECT 
    bh.id,
    i.id,
    1.0,
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.item_id = (SELECT id FROM items WHERE name = 'Charger Box Assy' AND type = 'SUB_ASSEMBLY'::item_type LIMIT 1)
  AND i.name = '25cm D.Brown Microfit one side crimped wires'
  AND NOT EXISTS (
      SELECT 1 FROM bom_items WHERE bom_id = bh.id AND item_id = i.id
  )
LIMIT 1;

INSERT INTO bom_items (bom_id, item_id, quantity, created_at)
SELECT 
    bh.id,
    i.id,
    1.0,
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.item_id = (SELECT id FROM items WHERE name = 'Charger Box Assy' AND type = 'SUB_ASSEMBLY'::item_type LIMIT 1)
  AND i.name = '25cm White Microfit one side crimped wires'
  AND NOT EXISTS (
      SELECT 1 FROM bom_items WHERE bom_id = bh.id AND item_id = i.id
  )
LIMIT 1;

INSERT INTO bom_items (bom_id, item_id, quantity, created_at)
SELECT 
    bh.id,
    i.id,
    1.0,
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.item_id = (SELECT id FROM items WHERE name = 'Charger Box Assy' AND type = 'SUB_ASSEMBLY'::item_type LIMIT 1)
  AND i.name = '25cm White-Red Microfit one side crimped wires'
  AND NOT EXISTS (
      SELECT 1 FROM bom_items WHERE bom_id = bh.id AND item_id = i.id
  )
LIMIT 1;

INSERT INTO bom_items (bom_id, item_id, quantity, created_at)
SELECT 
    bh.id,
    i.id,
    1.0,
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.item_id = (SELECT id FROM items WHERE name = 'Charger Box Assy' AND type = 'SUB_ASSEMBLY'::item_type LIMIT 1)
  AND i.name = '25cm Red Microfit one side crimped wires'
  AND NOT EXISTS (
      SELECT 1 FROM bom_items WHERE bom_id = bh.id AND item_id = i.id
  )
LIMIT 1;

INSERT INTO bom_items (bom_id, item_id, quantity, created_at)
SELECT 
    bh.id,
    i.id,
    1.0,
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.item_id = (SELECT id FROM items WHERE name = 'Charger Box Assy' AND type = 'SUB_ASSEMBLY'::item_type LIMIT 1)
  AND i.name = '25cm Dark Blue Microfit one side crimped wires'
  AND NOT EXISTS (
      SELECT 1 FROM bom_items WHERE bom_id = bh.id AND item_id = i.id
  )
LIMIT 1;

INSERT INTO bom_items (bom_id, item_id, quantity, created_at)
SELECT 
    bh.id,
    i.id,
    1.0,
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.item_id = (SELECT id FROM items WHERE name = 'Charger Box Assy' AND type = 'SUB_ASSEMBLY'::item_type LIMIT 1)
  AND i.name = '25cm Orange Microfit one side crimped wires'
  AND NOT EXISTS (
      SELECT 1 FROM bom_items WHERE bom_id = bh.id AND item_id = i.id
  )
LIMIT 1;

INSERT INTO bom_items (bom_id, item_id, quantity, created_at)
SELECT 
    bh.id,
    i.id,
    1.0,
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.item_id = (SELECT id FROM items WHERE name = 'Charger Box Assy' AND type = 'SUB_ASSEMBLY'::item_type LIMIT 1)
  AND i.name = '18pin Microfit housing'
  AND NOT EXISTS (
      SELECT 1 FROM bom_items WHERE bom_id = bh.id AND item_id = i.id
  )
LIMIT 1;

INSERT INTO bom_items (bom_id, item_id, quantity, created_at)
SELECT 
    bh.id,
    i.id,
    1.0,
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.item_id = (SELECT id FROM items WHERE name = 'Charger Box Assy' AND type = 'SUB_ASSEMBLY'::item_type LIMIT 1)
  AND i.name = '12S Lipo Charger'
  AND NOT EXISTS (
      SELECT 1 FROM bom_items WHERE bom_id = bh.id AND item_id = i.id
  )
LIMIT 1;

INSERT INTO bom_items (bom_id, item_id, quantity, created_at)
SELECT 
    bh.id,
    i.id,
    1.0,
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.item_id = (SELECT id FROM items WHERE name = 'Charger Box Assy' AND type = 'SUB_ASSEMBLY'::item_type LIMIT 1)
  AND i.name = '130x80x60 enclosure box'
  AND NOT EXISTS (
      SELECT 1 FROM bom_items WHERE bom_id = bh.id AND item_id = i.id
  )
LIMIT 1;

INSERT INTO bom_items (bom_id, item_id, quantity, created_at)
SELECT 
    bh.id,
    i.id,
    2.0,
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.item_id = (SELECT id FROM items WHERE name = 'Charger Box Assy' AND type = 'SUB_ASSEMBLY'::item_type LIMIT 1)
  AND i.name = 'PG-7 Cable Gland'
  AND NOT EXISTS (
      SELECT 1 FROM bom_items WHERE bom_id = bh.id AND item_id = i.id
  )
LIMIT 1;

INSERT INTO bom_items (bom_id, item_id, quantity, created_at)
SELECT 
    bh.id,
    i.id,
    2.0,
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.item_id = (SELECT id FROM items WHERE name = 'Charger Box Assy' AND type = 'SUB_ASSEMBLY'::item_type LIMIT 1)
  AND i.name = 'PG-11 Cable Gland'
  AND NOT EXISTS (
      SELECT 1 FROM bom_items WHERE bom_id = bh.id AND item_id = i.id
  )
LIMIT 1;

INSERT INTO bom_items (bom_id, item_id, quantity, created_at)
SELECT 
    bh.id,
    i.id,
    10.0,
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.item_id = (SELECT id FROM items WHERE name = 'Charger Box Assy' AND type = 'SUB_ASSEMBLY'::item_type LIMIT 1)
  AND i.name = 'Teroson MS930'
  AND NOT EXISTS (
      SELECT 1 FROM bom_items WHERE bom_id = bh.id AND item_id = i.id
  )
LIMIT 1;

INSERT INTO bom_items (bom_id, item_id, quantity, created_at)
SELECT 
    bh.id,
    i.id,
    0.25,
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.item_id = (SELECT id FROM items WHERE name = 'Charger Box Assy' AND type = 'SUB_ASSEMBLY'::item_type LIMIT 1)
  AND i.name = 'Red 18 AWG'
  AND NOT EXISTS (
      SELECT 1 FROM bom_items WHERE bom_id = bh.id AND item_id = i.id
  )
LIMIT 1;

INSERT INTO bom_items (bom_id, item_id, quantity, created_at)
SELECT 
    bh.id,
    i.id,
    0.25,
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.item_id = (SELECT id FROM items WHERE name = 'Charger Box Assy' AND type = 'SUB_ASSEMBLY'::item_type LIMIT 1)
  AND i.name = 'Black 18 AWG'
  AND NOT EXISTS (
      SELECT 1 FROM bom_items WHERE bom_id = bh.id AND item_id = i.id
  )
LIMIT 1;

-- BOM for Charging CM Assy
INSERT INTO bom_headers (tenant_id, item_id, version, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    id, 
    1, 
    true, 
    NOW(), 
    NOW()
FROM items 
WHERE name = 'Charging CM Assy' AND type IN ('SUB_ASSEMBLY'::item_type, 'FINISHED_GOODS'::item_type)
  AND NOT EXISTS (
      SELECT 1 FROM bom_headers bh2 
      WHERE bh2.item_id = items.id
  )
LIMIT 1;

INSERT INTO bom_items (bom_id, item_id, quantity, created_at)
SELECT 
    bh.id,
    i.id,
    10.0,
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.item_id = (SELECT id FROM items WHERE name = 'Charging CM Assy' AND type = 'SUB_ASSEMBLY'::item_type LIMIT 1)
  AND i.name = 'Lead wire 22AWG'
  AND NOT EXISTS (
      SELECT 1 FROM bom_items WHERE bom_id = bh.id AND item_id = i.id
  )
LIMIT 1;

INSERT INTO bom_items (bom_id, item_id, quantity, created_at)
SELECT 
    bh.id,
    i.id,
    1.0,
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.item_id = (SELECT id FROM items WHERE name = 'Charging CM Assy' AND type = 'SUB_ASSEMBLY'::item_type LIMIT 1)
  AND i.name = 'Soldering flux'
  AND NOT EXISTS (
      SELECT 1 FROM bom_items WHERE bom_id = bh.id AND item_id = i.id
  )
LIMIT 1;

INSERT INTO bom_items (bom_id, item_id, quantity, created_at)
SELECT 
    bh.id,
    i.id,
    1.5,
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.item_id = (SELECT id FROM items WHERE name = 'Charging CM Assy' AND type = 'SUB_ASSEMBLY'::item_type LIMIT 1)
  AND i.name = '20Core Wire 14/38'
  AND NOT EXISTS (
      SELECT 1 FROM bom_items WHERE bom_id = bh.id AND item_id = i.id
  )
LIMIT 1;

INSERT INTO bom_items (bom_id, item_id, quantity, created_at)
SELECT 
    bh.id,
    i.id,
    1.0,
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.item_id = (SELECT id FROM items WHERE name = 'Charging CM Assy' AND type = 'SUB_ASSEMBLY'::item_type LIMIT 1)
  AND i.name = 'WY-28 Metal connector CM'
  AND NOT EXISTS (
      SELECT 1 FROM bom_items WHERE bom_id = bh.id AND item_id = i.id
  )
LIMIT 1;

-- BOM for RPM Sensor Assy
INSERT INTO bom_headers (tenant_id, item_id, version, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    id, 
    1, 
    true, 
    NOW(), 
    NOW()
FROM items 
WHERE name = 'RPM Sensor Assy' AND type IN ('SUB_ASSEMBLY'::item_type, 'FINISHED_GOODS'::item_type)
  AND NOT EXISTS (
      SELECT 1 FROM bom_headers bh2 
      WHERE bh2.item_id = items.id
  )
LIMIT 1;

INSERT INTO bom_items (bom_id, item_id, quantity, created_at)
SELECT 
    bh.id,
    i.id,
    1.0,
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.item_id = (SELECT id FROM items WHERE name = 'RPM Sensor Assy' AND type = 'SUB_ASSEMBLY'::item_type LIMIT 1)
  AND i.name = 'PWB of RPM Sensor'
  AND NOT EXISTS (
      SELECT 1 FROM bom_items WHERE bom_id = bh.id AND item_id = i.id
  )
LIMIT 1;

INSERT INTO bom_items (bom_id, item_id, quantity, created_at)
SELECT 
    bh.id,
    i.id,
    1.0,
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.item_id = (SELECT id FROM items WHERE name = 'RPM Sensor Assy' AND type = 'SUB_ASSEMBLY'::item_type LIMIT 1)
  AND i.name = 'LM358D SMD'
  AND NOT EXISTS (
      SELECT 1 FROM bom_items WHERE bom_id = bh.id AND item_id = i.id
  )
LIMIT 1;

INSERT INTO bom_items (bom_id, item_id, quantity, created_at)
SELECT 
    bh.id,
    i.id,
    8.0,
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.item_id = (SELECT id FROM items WHERE name = 'RPM Sensor Assy' AND type = 'SUB_ASSEMBLY'::item_type LIMIT 1)
  AND i.name = '47k 0805'
  AND NOT EXISTS (
      SELECT 1 FROM bom_items WHERE bom_id = bh.id AND item_id = i.id
  )
LIMIT 1;

INSERT INTO bom_items (bom_id, item_id, quantity, created_at)
SELECT 
    bh.id,
    i.id,
    4.0,
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.item_id = (SELECT id FROM items WHERE name = 'RPM Sensor Assy' AND type = 'SUB_ASSEMBLY'::item_type LIMIT 1)
  AND i.name = '470k 0805 Com grade'
  AND NOT EXISTS (
      SELECT 1 FROM bom_items WHERE bom_id = bh.id AND item_id = i.id
  )
LIMIT 1;

INSERT INTO bom_items (bom_id, item_id, quantity, created_at)
SELECT 
    bh.id,
    i.id,
    2.0,
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.item_id = (SELECT id FROM items WHERE name = 'RPM Sensor Assy' AND type = 'SUB_ASSEMBLY'::item_type LIMIT 1)
  AND i.name = '0.1uF 0805'
  AND NOT EXISTS (
      SELECT 1 FROM bom_items WHERE bom_id = bh.id AND item_id = i.id
  )
LIMIT 1;

INSERT INTO bom_items (bom_id, item_id, quantity, created_at)
SELECT 
    bh.id,
    i.id,
    2.0,
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.item_id = (SELECT id FROM items WHERE name = 'RPM Sensor Assy' AND type = 'SUB_ASSEMBLY'::item_type LIMIT 1)
  AND i.name = '0.01uF 0805'
  AND NOT EXISTS (
      SELECT 1 FROM bom_items WHERE bom_id = bh.id AND item_id = i.id
  )
LIMIT 1;

INSERT INTO bom_items (bom_id, item_id, quantity, created_at)
SELECT 
    bh.id,
    i.id,
    1.0,
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.item_id = (SELECT id FROM items WHERE name = 'RPM Sensor Assy' AND type = 'SUB_ASSEMBLY'::item_type LIMIT 1)
  AND i.name = 'LED 0805 SMD'
  AND NOT EXISTS (
      SELECT 1 FROM bom_items WHERE bom_id = bh.id AND item_id = i.id
  )
LIMIT 1;

INSERT INTO bom_items (bom_id, item_id, quantity, created_at)
SELECT 
    bh.id,
    i.id,
    4.0,
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.item_id = (SELECT id FROM items WHERE name = 'RPM Sensor Assy' AND type = 'SUB_ASSEMBLY'::item_type LIMIT 1)
  AND i.name = '1N4148 SMD'
  AND NOT EXISTS (
      SELECT 1 FROM bom_items WHERE bom_id = bh.id AND item_id = i.id
  )
LIMIT 1;

INSERT INTO bom_items (bom_id, item_id, quantity, created_at)
SELECT 
    bh.id,
    i.id,
    2.0,
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.item_id = (SELECT id FROM items WHERE name = 'RPM Sensor Assy' AND type = 'SUB_ASSEMBLY'::item_type LIMIT 1)
  AND i.name = '2 pin JST-XH male side entry'
  AND NOT EXISTS (
      SELECT 1 FROM bom_items WHERE bom_id = bh.id AND item_id = i.id
  )
LIMIT 1;

-- BOM for Current Sensor Assy
INSERT INTO bom_headers (tenant_id, item_id, version, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    id, 
    1, 
    true, 
    NOW(), 
    NOW()
FROM items 
WHERE name = 'Current Sensor Assy' AND type IN ('SUB_ASSEMBLY'::item_type, 'FINISHED_GOODS'::item_type)
  AND NOT EXISTS (
      SELECT 1 FROM bom_headers bh2 
      WHERE bh2.item_id = items.id
  )
LIMIT 1;

INSERT INTO bom_items (bom_id, item_id, quantity, created_at)
SELECT 
    bh.id,
    i.id,
    1.0,
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.item_id = (SELECT id FROM items WHERE name = 'Current Sensor Assy' AND type = 'SUB_ASSEMBLY'::item_type LIMIT 1)
  AND i.name = 'PWB of Current Sensor'
  AND NOT EXISTS (
      SELECT 1 FROM bom_items WHERE bom_id = bh.id AND item_id = i.id
  )
LIMIT 1;

INSERT INTO bom_items (bom_id, item_id, quantity, created_at)
SELECT 
    bh.id,
    i.id,
    2.0,
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.item_id = (SELECT id FROM items WHERE name = 'Current Sensor Assy' AND type = 'SUB_ASSEMBLY'::item_type LIMIT 1)
  AND i.name = 'WCS1700 current Sensor'
  AND NOT EXISTS (
      SELECT 1 FROM bom_items WHERE bom_id = bh.id AND item_id = i.id
  )
LIMIT 1;

INSERT INTO bom_items (bom_id, item_id, quantity, created_at)
SELECT 
    bh.id,
    i.id,
    2.0,
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.item_id = (SELECT id FROM items WHERE name = 'Current Sensor Assy' AND type = 'SUB_ASSEMBLY'::item_type LIMIT 1)
  AND i.name = '0.1uF 0805'
  AND NOT EXISTS (
      SELECT 1 FROM bom_items WHERE bom_id = bh.id AND item_id = i.id
  )
LIMIT 1;

INSERT INTO bom_items (bom_id, item_id, quantity, created_at)
SELECT 
    bh.id,
    i.id,
    1.0,
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.item_id = (SELECT id FROM items WHERE name = 'Current Sensor Assy' AND type = 'SUB_ASSEMBLY'::item_type LIMIT 1)
  AND i.name = '4 pin JST-XH male side entry'
  AND NOT EXISTS (
      SELECT 1 FROM bom_items WHERE bom_id = bh.id AND item_id = i.id
  )
LIMIT 1;

-- BOM for A21 MotherBoard Assy
INSERT INTO bom_headers (tenant_id, item_id, version, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    id, 
    1, 
    true, 
    NOW(), 
    NOW()
FROM items 
WHERE name = 'A21 MotherBoard Assy' AND type IN ('SUB_ASSEMBLY'::item_type, 'FINISHED_GOODS'::item_type)
  AND NOT EXISTS (
      SELECT 1 FROM bom_headers bh2 
      WHERE bh2.item_id = items.id
  )
LIMIT 1;

INSERT INTO bom_items (bom_id, item_id, quantity, created_at)
SELECT 
    bh.id,
    i.id,
    1.0,
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.item_id = (SELECT id FROM items WHERE name = 'A21 MotherBoard Assy' AND type = 'SUB_ASSEMBLY'::item_type LIMIT 1)
  AND i.name = 'Receiver Module R9MM/R9MX/R9'
  AND NOT EXISTS (
      SELECT 1 FROM bom_items WHERE bom_id = bh.id AND item_id = i.id
  )
LIMIT 1;

INSERT INTO bom_items (bom_id, item_id, quantity, created_at)
SELECT 
    bh.id,
    i.id,
    7.0,
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.item_id = (SELECT id FROM items WHERE name = 'A21 MotherBoard Assy' AND type = 'SUB_ASSEMBLY'::item_type LIMIT 1)
  AND i.name = 'Free Wheel Diode SMD M7'
  AND NOT EXISTS (
      SELECT 1 FROM bom_items WHERE bom_id = bh.id AND item_id = i.id
  )
LIMIT 1;

INSERT INTO bom_items (bom_id, item_id, quantity, created_at)
SELECT 
    bh.id,
    i.id,
    3.0,
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.item_id = (SELECT id FROM items WHERE name = 'A21 MotherBoard Assy' AND type = 'SUB_ASSEMBLY'::item_type LIMIT 1)
  AND i.name = 'LM1117 5.0v'
  AND NOT EXISTS (
      SELECT 1 FROM bom_items WHERE bom_id = bh.id AND item_id = i.id
  )
LIMIT 1;

INSERT INTO bom_items (bom_id, item_id, quantity, created_at)
SELECT 
    bh.id,
    i.id,
    1.0,
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.item_id = (SELECT id FROM items WHERE name = 'A21 MotherBoard Assy' AND type = 'SUB_ASSEMBLY'::item_type LIMIT 1)
  AND i.name = 'LM1117 3.3v'
  AND NOT EXISTS (
      SELECT 1 FROM bom_items WHERE bom_id = bh.id AND item_id = i.id
  )
LIMIT 1;

INSERT INTO bom_items (bom_id, item_id, quantity, created_at)
SELECT 
    bh.id,
    i.id,
    1.0,
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.item_id = (SELECT id FROM items WHERE name = 'A21 MotherBoard Assy' AND type = 'SUB_ASSEMBLY'::item_type LIMIT 1)
  AND i.name = 'NEO-6M GPS'
  AND NOT EXISTS (
      SELECT 1 FROM bom_items WHERE bom_id = bh.id AND item_id = i.id
  )
LIMIT 1;

INSERT INTO bom_items (bom_id, item_id, quantity, created_at)
SELECT 
    bh.id,
    i.id,
    2.0,
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.item_id = (SELECT id FROM items WHERE name = 'A21 MotherBoard Assy' AND type = 'SUB_ASSEMBLY'::item_type LIMIT 1)
  AND i.name = '4mm Male Bullet connector'
  AND NOT EXISTS (
      SELECT 1 FROM bom_items WHERE bom_id = bh.id AND item_id = i.id
  )
LIMIT 1;

INSERT INTO bom_items (bom_id, item_id, quantity, created_at)
SELECT 
    bh.id,
    i.id,
    4.0,
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.item_id = (SELECT id FROM items WHERE name = 'A21 MotherBoard Assy' AND type = 'SUB_ASSEMBLY'::item_type LIMIT 1)
  AND i.name = '4mm Female Bullet connector'
  AND NOT EXISTS (
      SELECT 1 FROM bom_items WHERE bom_id = bh.id AND item_id = i.id
  )
LIMIT 1;

INSERT INTO bom_items (bom_id, item_id, quantity, created_at)
SELECT 
    bh.id,
    i.id,
    1,
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.item_id = (SELECT id FROM items WHERE name = 'A21 MotherBoard Assy' AND type = 'SUB_ASSEMBLY'::item_type LIMIT 1)
  AND i.name = '2mm male bullet connector'
  AND NOT EXISTS (
      SELECT 1 FROM bom_items WHERE bom_id = bh.id AND item_id = i.id
  )
LIMIT 1;

INSERT INTO bom_items (bom_id, item_id, quantity, created_at)
SELECT 
    bh.id,
    i.id,
    1,
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.item_id = (SELECT id FROM items WHERE name = 'A21 MotherBoard Assy' AND type = 'SUB_ASSEMBLY'::item_type LIMIT 1)
  AND i.name = '2mm Female Bullet connector'
  AND NOT EXISTS (
      SELECT 1 FROM bom_items WHERE bom_id = bh.id AND item_id = i.id
  )
LIMIT 1;

INSERT INTO bom_items (bom_id, item_id, quantity, created_at)
SELECT 
    bh.id,
    i.id,
    2.0,
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.item_id = (SELECT id FROM items WHERE name = 'A21 MotherBoard Assy' AND type = 'SUB_ASSEMBLY'::item_type LIMIT 1)
  AND i.name = '6mm male bullet connector'
  AND NOT EXISTS (
      SELECT 1 FROM bom_items WHERE bom_id = bh.id AND item_id = i.id
  )
LIMIT 1;

INSERT INTO bom_items (bom_id, item_id, quantity, created_at)
SELECT 
    bh.id,
    i.id,
    1.0,
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.item_id = (SELECT id FROM items WHERE name = 'A21 MotherBoard Assy' AND type = 'SUB_ASSEMBLY'::item_type LIMIT 1)
  AND i.name = '6mm female bullet connector'
  AND NOT EXISTS (
      SELECT 1 FROM bom_items WHERE bom_id = bh.id AND item_id = i.id
  )
LIMIT 1;

INSERT INTO bom_items (bom_id, item_id, quantity, created_at)
SELECT 
    bh.id,
    i.id,
    0.25,
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.item_id = (SELECT id FROM items WHERE name = 'A21 MotherBoard Assy' AND type = 'SUB_ASSEMBLY'::item_type LIMIT 1)
  AND i.name = 'Red 8AWG'
  AND NOT EXISTS (
      SELECT 1 FROM bom_items WHERE bom_id = bh.id AND item_id = i.id
  )
LIMIT 1;

INSERT INTO bom_items (bom_id, item_id, quantity, created_at)
SELECT 
    bh.id,
    i.id,
    0.5,
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.item_id = (SELECT id FROM items WHERE name = 'A21 MotherBoard Assy' AND type = 'SUB_ASSEMBLY'::item_type LIMIT 1)
  AND i.name = 'Red 12AWG'
  AND NOT EXISTS (
      SELECT 1 FROM bom_items WHERE bom_id = bh.id AND item_id = i.id
  )
LIMIT 1;

INSERT INTO bom_items (bom_id, item_id, quantity, created_at)
SELECT 
    bh.id,
    i.id,
    0.3,
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.item_id = (SELECT id FROM items WHERE name = 'A21 MotherBoard Assy' AND type = 'SUB_ASSEMBLY'::item_type LIMIT 1)
  AND i.name = 'Red 18 AWG'
  AND NOT EXISTS (
      SELECT 1 FROM bom_items WHERE bom_id = bh.id AND item_id = i.id
  )
LIMIT 1;

INSERT INTO bom_items (bom_id, item_id, quantity, created_at)
SELECT 
    bh.id,
    i.id,
    2.0,
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.item_id = (SELECT id FROM items WHERE name = 'A21 MotherBoard Assy' AND type = 'SUB_ASSEMBLY'::item_type LIMIT 1)
  AND i.name = 'Buck converter XL7015 50v'
  AND NOT EXISTS (
      SELECT 1 FROM bom_items WHERE bom_id = bh.id AND item_id = i.id
  )
LIMIT 1;

INSERT INTO bom_items (bom_id, item_id, quantity, created_at)
SELECT 
    bh.id,
    i.id,
    1.0,
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.item_id = (SELECT id FROM items WHERE name = 'A21 MotherBoard Assy' AND type = 'SUB_ASSEMBLY'::item_type LIMIT 1)
  AND i.name = 'LM2596HW for PC'
  AND NOT EXISTS (
      SELECT 1 FROM bom_items WHERE bom_id = bh.id AND item_id = i.id
  )
LIMIT 1;

INSERT INTO bom_items (bom_id, item_id, quantity, created_at)
SELECT 
    bh.id,
    i.id,
    1.0,
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.item_id = (SELECT id FROM items WHERE name = 'A21 MotherBoard Assy' AND type = 'SUB_ASSEMBLY'::item_type LIMIT 1)
  AND i.name = 'PWB of Motherboard'
  AND NOT EXISTS (
      SELECT 1 FROM bom_items WHERE bom_id = bh.id AND item_id = i.id
  )
LIMIT 1;

INSERT INTO bom_items (bom_id, item_id, quantity, created_at)
SELECT 
    bh.id,
    i.id,
    10.0,
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.item_id = (SELECT id FROM items WHERE name = 'A21 MotherBoard Assy' AND type = 'SUB_ASSEMBLY'::item_type LIMIT 1)
  AND i.name = 'Lead paste'
  AND NOT EXISTS (
      SELECT 1 FROM bom_items WHERE bom_id = bh.id AND item_id = i.id
  )
LIMIT 1;

INSERT INTO bom_items (bom_id, item_id, quantity, created_at)
SELECT 
    bh.id,
    i.id,
    10.0,
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.item_id = (SELECT id FROM items WHERE name = 'A21 MotherBoard Assy' AND type = 'SUB_ASSEMBLY'::item_type LIMIT 1)
  AND i.name = 'Lead wire 22AWG'
  AND NOT EXISTS (
      SELECT 1 FROM bom_items WHERE bom_id = bh.id AND item_id = i.id
  )
LIMIT 1;

INSERT INTO bom_items (bom_id, item_id, quantity, created_at)
SELECT 
    bh.id,
    i.id,
    1.0,
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.item_id = (SELECT id FROM items WHERE name = 'A21 MotherBoard Assy' AND type = 'SUB_ASSEMBLY'::item_type LIMIT 1)
  AND i.name = 'LED 0805 SMD'
  AND NOT EXISTS (
      SELECT 1 FROM bom_items WHERE bom_id = bh.id AND item_id = i.id
  )
LIMIT 1;

INSERT INTO bom_items (bom_id, item_id, quantity, created_at)
SELECT 
    bh.id,
    i.id,
    4.0,
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.item_id = (SELECT id FROM items WHERE name = 'A21 MotherBoard Assy' AND type = 'SUB_ASSEMBLY'::item_type LIMIT 1)
  AND i.name = '18pF 0805 capacitor'
  AND NOT EXISTS (
      SELECT 1 FROM bom_items WHERE bom_id = bh.id AND item_id = i.id
  )
LIMIT 1;

INSERT INTO bom_items (bom_id, item_id, quantity, created_at)
SELECT 
    bh.id,
    i.id,
    3.0,
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.item_id = (SELECT id FROM items WHERE name = 'A21 MotherBoard Assy' AND type = 'SUB_ASSEMBLY'::item_type LIMIT 1)
  AND i.name = '10uF 10v Tantalum Capacitor Case A'
  AND NOT EXISTS (
      SELECT 1 FROM bom_items WHERE bom_id = bh.id AND item_id = i.id
  )
LIMIT 1;

INSERT INTO bom_items (bom_id, item_id, quantity, created_at)
SELECT 
    bh.id,
    i.id,
    2.0,
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.item_id = (SELECT id FROM items WHERE name = 'A21 MotherBoard Assy' AND type = 'SUB_ASSEMBLY'::item_type LIMIT 1)
  AND i.name = 'SPST relay 5A-12v ANTI_S & KILL'
  AND NOT EXISTS (
      SELECT 1 FROM bom_items WHERE bom_id = bh.id AND item_id = i.id
  )
LIMIT 1;

INSERT INTO bom_items (bom_id, item_id, quantity, created_at)
SELECT 
    bh.id,
    i.id,
    5.0,
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.item_id = (SELECT id FROM items WHERE name = 'A21 MotherBoard Assy' AND type = 'SUB_ASSEMBLY'::item_type LIMIT 1)
  AND i.name = 'Balancing 1A DPDT 24v Relay'
  AND NOT EXISTS (
      SELECT 1 FROM bom_items WHERE bom_id = bh.id AND item_id = i.id
  )
LIMIT 1;

INSERT INTO bom_items (bom_id, item_id, quantity, created_at)
SELECT 
    bh.id,
    i.id,
    1.0,
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.item_id = (SELECT id FROM items WHERE name = 'A21 MotherBoard Assy' AND type = 'SUB_ASSEMBLY'::item_type LIMIT 1)
  AND i.name = 'Balancing relay 5A/2A 24v SPST'
  AND NOT EXISTS (
      SELECT 1 FROM bom_items WHERE bom_id = bh.id AND item_id = i.id
  )
LIMIT 1;

INSERT INTO bom_items (bom_id, item_id, quantity, created_at)
SELECT 
    bh.id,
    i.id,
    1.0,
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.item_id = (SELECT id FROM items WHERE name = 'A21 MotherBoard Assy' AND type = 'SUB_ASSEMBLY'::item_type LIMIT 1)
  AND i.name = 'BlueTooth Module'
  AND NOT EXISTS (
      SELECT 1 FROM bom_items WHERE bom_id = bh.id AND item_id = i.id
  )
LIMIT 1;

INSERT INTO bom_items (bom_id, item_id, quantity, created_at)
SELECT 
    bh.id,
    i.id,
    10.0,
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.item_id = (SELECT id FROM items WHERE name = 'A21 MotherBoard Assy' AND type = 'SUB_ASSEMBLY'::item_type LIMIT 1)
  AND i.name = '24AWG Soldering Wire'
  AND NOT EXISTS (
      SELECT 1 FROM bom_items WHERE bom_id = bh.id AND item_id = i.id
  )
LIMIT 1;

INSERT INTO bom_items (bom_id, item_id, quantity, created_at)
SELECT 
    bh.id,
    i.id,
    1.0,
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.item_id = (SELECT id FROM items WHERE name = 'A21 MotherBoard Assy' AND type = 'SUB_ASSEMBLY'::item_type LIMIT 1)
  AND i.name = '12E 2W Resistor THT'
  AND NOT EXISTS (
      SELECT 1 FROM bom_items WHERE bom_id = bh.id AND item_id = i.id
  )
LIMIT 1;

INSERT INTO bom_items (bom_id, item_id, quantity, created_at)
SELECT 
    bh.id,
    i.id,
    1.0,
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.item_id = (SELECT id FROM items WHERE name = 'A21 MotherBoard Assy' AND type = 'SUB_ASSEMBLY'::item_type LIMIT 1)
  AND i.name = '1k 0805 Resistor'
  AND NOT EXISTS (
      SELECT 1 FROM bom_items WHERE bom_id = bh.id AND item_id = i.id
  )
LIMIT 1;

INSERT INTO bom_items (bom_id, item_id, quantity, created_at)
SELECT 
    bh.id,
    i.id,
    2.0,
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.item_id = (SELECT id FROM items WHERE name = 'A21 MotherBoard Assy' AND type = 'SUB_ASSEMBLY'::item_type LIMIT 1)
  AND i.name = '51k 0805 resistor'
  AND NOT EXISTS (
      SELECT 1 FROM bom_items WHERE bom_id = bh.id AND item_id = i.id
  )
LIMIT 1;

INSERT INTO bom_items (bom_id, item_id, quantity, created_at)
SELECT 
    bh.id,
    i.id,
    1.0,
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.item_id = (SELECT id FROM items WHERE name = 'A21 MotherBoard Assy' AND type = 'SUB_ASSEMBLY'::item_type LIMIT 1)
  AND i.name = '10k 0805 resistor'
  AND NOT EXISTS (
      SELECT 1 FROM bom_items WHERE bom_id = bh.id AND item_id = i.id
  )
LIMIT 1;

INSERT INTO bom_items (bom_id, item_id, quantity, created_at)
SELECT 
    bh.id,
    i.id,
    12.0,
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.item_id = (SELECT id FROM items WHERE name = 'A21 MotherBoard Assy' AND type = 'SUB_ASSEMBLY'::item_type LIMIT 1)
  AND i.name = '330E 0805 Resistor'
  AND NOT EXISTS (
      SELECT 1 FROM bom_items WHERE bom_id = bh.id AND item_id = i.id
  )
LIMIT 1;

INSERT INTO bom_items (bom_id, item_id, quantity, created_at)
SELECT 
    bh.id,
    i.id,
    1.0,
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.item_id = (SELECT id FROM items WHERE name = 'A21 MotherBoard Assy' AND type = 'SUB_ASSEMBLY'::item_type LIMIT 1)
  AND i.name = 'Female Bergstrip 40x1 2.54mm'
  AND NOT EXISTS (
      SELECT 1 FROM bom_items WHERE bom_id = bh.id AND item_id = i.id
  )
LIMIT 1;

INSERT INTO bom_items (bom_id, item_id, quantity, created_at)
SELECT 
    bh.id,
    i.id,
    1.0,
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.item_id = (SELECT id FROM items WHERE name = 'A21 MotherBoard Assy' AND type = 'SUB_ASSEMBLY'::item_type LIMIT 1)
  AND i.name = 'Male Bergstrip 40x1 2.54mm'
  AND NOT EXISTS (
      SELECT 1 FROM bom_items WHERE bom_id = bh.id AND item_id = i.id
  )
LIMIT 1;

INSERT INTO bom_items (bom_id, item_id, quantity, created_at)
SELECT 
    bh.id,
    i.id,
    20.0,
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.item_id = (SELECT id FROM items WHERE name = 'A21 MotherBoard Assy' AND type = 'SUB_ASSEMBLY'::item_type LIMIT 1)
  AND i.name = 'Conformal Coating'
  AND NOT EXISTS (
      SELECT 1 FROM bom_items WHERE bom_id = bh.id AND item_id = i.id
  )
LIMIT 1;

INSERT INTO bom_items (bom_id, item_id, quantity, created_at)
SELECT 
    bh.id,
    i.id,
    5.0,
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.item_id = (SELECT id FROM items WHERE name = 'A21 MotherBoard Assy' AND type = 'SUB_ASSEMBLY'::item_type LIMIT 1)
  AND i.name = 'Soldering flux'
  AND NOT EXISTS (
      SELECT 1 FROM bom_items WHERE bom_id = bh.id AND item_id = i.id
  )
LIMIT 1;

INSERT INTO bom_items (bom_id, item_id, quantity, created_at)
SELECT 
    bh.id,
    i.id,
    3.0,
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.item_id = (SELECT id FROM items WHERE name = 'A21 MotherBoard Assy' AND type = 'SUB_ASSEMBLY'::item_type LIMIT 1)
  AND i.name = '2 pin JST-XH male top entry'
  AND NOT EXISTS (
      SELECT 1 FROM bom_items WHERE bom_id = bh.id AND item_id = i.id
  )
LIMIT 1;

INSERT INTO bom_items (bom_id, item_id, quantity, created_at)
SELECT 
    bh.id,
    i.id,
    1.0,
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.item_id = (SELECT id FROM items WHERE name = 'A21 MotherBoard Assy' AND type = 'SUB_ASSEMBLY'::item_type LIMIT 1)
  AND i.name = '2 pin JST-XH male top entry RED'
  AND NOT EXISTS (
      SELECT 1 FROM bom_items WHERE bom_id = bh.id AND item_id = i.id
  )
LIMIT 1;

INSERT INTO bom_items (bom_id, item_id, quantity, created_at)
SELECT 
    bh.id,
    i.id,
    1.0,
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.item_id = (SELECT id FROM items WHERE name = 'A21 MotherBoard Assy' AND type = 'SUB_ASSEMBLY'::item_type LIMIT 1)
  AND i.name = '13 pin JST-XH male top entry'
  AND NOT EXISTS (
      SELECT 1 FROM bom_items WHERE bom_id = bh.id AND item_id = i.id
  )
LIMIT 1;

INSERT INTO bom_items (bom_id, item_id, quantity, created_at)
SELECT 
    bh.id,
    i.id,
    2.0,
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.item_id = (SELECT id FROM items WHERE name = 'A21 MotherBoard Assy' AND type = 'SUB_ASSEMBLY'::item_type LIMIT 1)
  AND i.name = '15 pin JST-XH male top entry'
  AND NOT EXISTS (
      SELECT 1 FROM bom_items WHERE bom_id = bh.id AND item_id = i.id
  )
LIMIT 1;

INSERT INTO bom_items (bom_id, item_id, quantity, created_at)
SELECT 
    bh.id,
    i.id,
    10.0,
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.item_id = (SELECT id FROM items WHERE name = 'A21 MotherBoard Assy' AND type = 'SUB_ASSEMBLY'::item_type LIMIT 1)
  AND i.name = 'JST-XH Crimping pins'
  AND NOT EXISTS (
      SELECT 1 FROM bom_items WHERE bom_id = bh.id AND item_id = i.id
  )
LIMIT 1;

INSERT INTO bom_items (bom_id, item_id, quantity, created_at)
SELECT 
    bh.id,
    i.id,
    1.0,
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.item_id = (SELECT id FROM items WHERE name = 'A21 MotherBoard Assy' AND type = 'SUB_ASSEMBLY'::item_type LIMIT 1)
  AND i.name = 'Fuse 500mA'
  AND NOT EXISTS (
      SELECT 1 FROM bom_items WHERE bom_id = bh.id AND item_id = i.id
  )
LIMIT 1;

INSERT INTO bom_items (bom_id, item_id, quantity, created_at)
SELECT 
    bh.id,
    i.id,
    2.0,
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.item_id = (SELECT id FROM items WHERE name = 'A21 MotherBoard Assy' AND type = 'SUB_ASSEMBLY'::item_type LIMIT 1)
  AND i.name = 'MCP3208'
  AND NOT EXISTS (
      SELECT 1 FROM bom_items WHERE bom_id = bh.id AND item_id = i.id
  )
LIMIT 1;

INSERT INTO bom_items (bom_id, item_id, quantity, created_at)
SELECT 
    bh.id,
    i.id,
    1.0,
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.item_id = (SELECT id FROM items WHERE name = 'A21 MotherBoard Assy' AND type = 'SUB_ASSEMBLY'::item_type LIMIT 1)
  AND i.name = '23A 24v Power relay'
  AND NOT EXISTS (
      SELECT 1 FROM bom_items WHERE bom_id = bh.id AND item_id = i.id
  )
LIMIT 1;

INSERT INTO bom_items (bom_id, item_id, quantity, created_at)
SELECT 
    bh.id,
    i.id,
    12.0,
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.item_id = (SELECT id FROM items WHERE name = 'A21 MotherBoard Assy' AND type = 'SUB_ASSEMBLY'::item_type LIMIT 1)
  AND i.name = '470k 0805 PANASONIC'
  AND NOT EXISTS (
      SELECT 1 FROM bom_items WHERE bom_id = bh.id AND item_id = i.id
  )
LIMIT 1;

INSERT INTO bom_items (bom_id, item_id, quantity, created_at)
SELECT 
    bh.id,
    i.id,
    12.0,
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.item_id = (SELECT id FROM items WHERE name = 'A21 MotherBoard Assy' AND type = 'SUB_ASSEMBLY'::item_type LIMIT 1)
  AND i.name = '20k 0805 resistor PANASONIC'
  AND NOT EXISTS (
      SELECT 1 FROM bom_items WHERE bom_id = bh.id AND item_id = i.id
  )
LIMIT 1;

INSERT INTO bom_items (bom_id, item_id, quantity, created_at)
SELECT 
    bh.id,
    i.id,
    12.0,
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.item_id = (SELECT id FROM items WHERE name = 'A21 MotherBoard Assy' AND type = 'SUB_ASSEMBLY'::item_type LIMIT 1)
  AND i.name = '1uF 0805 PANASONIC'
  AND NOT EXISTS (
      SELECT 1 FROM bom_items WHERE bom_id = bh.id AND item_id = i.id
  )
LIMIT 1;

INSERT INTO bom_items (bom_id, item_id, quantity, created_at)
SELECT 
    bh.id,
    i.id,
    2.0,
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.item_id = (SELECT id FROM items WHERE name = 'A21 MotherBoard Assy' AND type = 'SUB_ASSEMBLY'::item_type LIMIT 1)
  AND i.name = '16MHz Crystal Oscillator'
  AND NOT EXISTS (
      SELECT 1 FROM bom_items WHERE bom_id = bh.id AND item_id = i.id
  )
LIMIT 1;

INSERT INTO bom_items (bom_id, item_id, quantity, created_at)
SELECT 
    bh.id,
    i.id,
    1.0,
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.item_id = (SELECT id FROM items WHERE name = 'A21 MotherBoard Assy' AND type = 'SUB_ASSEMBLY'::item_type LIMIT 1)
  AND i.name = 'ULN2004 SMD'
  AND NOT EXISTS (
      SELECT 1 FROM bom_items WHERE bom_id = bh.id AND item_id = i.id
  )
LIMIT 1;

INSERT INTO bom_items (bom_id, item_id, quantity, created_at)
SELECT 
    bh.id,
    i.id,
    6.0,
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.item_id = (SELECT id FROM items WHERE name = 'A21 MotherBoard Assy' AND type = 'SUB_ASSEMBLY'::item_type LIMIT 1)
  AND i.name = 'SSR AQW282SX'
  AND NOT EXISTS (
      SELECT 1 FROM bom_items WHERE bom_id = bh.id AND item_id = i.id
  )
LIMIT 1;

INSERT INTO bom_items (bom_id, item_id, quantity, created_at)
SELECT 
    bh.id,
    i.id,
    2.0,
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.item_id = (SELECT id FROM items WHERE name = 'A21 MotherBoard Assy' AND type = 'SUB_ASSEMBLY'::item_type LIMIT 1)
  AND i.name = 'Atmega328P-AU'
  AND NOT EXISTS (
      SELECT 1 FROM bom_items WHERE bom_id = bh.id AND item_id = i.id
  )
LIMIT 1;

INSERT INTO bom_items (bom_id, item_id, quantity, created_at)
SELECT 
    bh.id,
    i.id,
    1.0,
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.item_id = (SELECT id FROM items WHERE name = 'A21 MotherBoard Assy' AND type = 'SUB_ASSEMBLY'::item_type LIMIT 1)
  AND i.name = 'Power Relay 120A 12v'
  AND NOT EXISTS (
      SELECT 1 FROM bom_items WHERE bom_id = bh.id AND item_id = i.id
  )
LIMIT 1;

INSERT INTO bom_items (bom_id, item_id, quantity, created_at)
SELECT 
    bh.id,
    i.id,
    0.2,
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.item_id = (SELECT id FROM items WHERE name = 'A21 MotherBoard Assy' AND type = 'SUB_ASSEMBLY'::item_type LIMIT 1)
  AND i.name = 'Heatshrink Tube 6.4:1.6'
  AND NOT EXISTS (
      SELECT 1 FROM bom_items WHERE bom_id = bh.id AND item_id = i.id
  )
LIMIT 1;

INSERT INTO bom_items (bom_id, item_id, quantity, created_at)
SELECT 
    bh.id,
    i.id,
    0.1,
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.item_id = (SELECT id FROM items WHERE name = 'A21 MotherBoard Assy' AND type = 'SUB_ASSEMBLY'::item_type LIMIT 1)
  AND i.name = 'Heatshrink Tube 9:3'
  AND NOT EXISTS (
      SELECT 1 FROM bom_items WHERE bom_id = bh.id AND item_id = i.id
  )
LIMIT 1;

INSERT INTO bom_items (bom_id, item_id, quantity, created_at)
SELECT 
    bh.id,
    i.id,
    1,
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.item_id = (SELECT id FROM items WHERE name = 'A21 MotherBoard Assy' AND type = 'SUB_ASSEMBLY'::item_type LIMIT 1)
  AND i.name = 'Current Sensor Assy'
  AND NOT EXISTS (
      SELECT 1 FROM bom_items WHERE bom_id = bh.id AND item_id = i.id
  )
LIMIT 1;

INSERT INTO bom_items (bom_id, item_id, quantity, created_at)
SELECT 
    bh.id,
    i.id,
    1,
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.item_id = (SELECT id FROM items WHERE name = 'A21 MotherBoard Assy' AND type = 'SUB_ASSEMBLY'::item_type LIMIT 1)
  AND i.name = 'RPM Sensor Assy'
  AND NOT EXISTS (
      SELECT 1 FROM bom_items WHERE bom_id = bh.id AND item_id = i.id
  )
LIMIT 1;

INSERT INTO bom_items (bom_id, item_id, quantity, created_at)
SELECT 
    bh.id,
    i.id,
    1.0,
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.item_id = (SELECT id FROM items WHERE name = 'A21 MotherBoard Assy' AND type = 'SUB_ASSEMBLY'::item_type LIMIT 1)
  AND i.name = 'Tactile switch'
  AND NOT EXISTS (
      SELECT 1 FROM bom_items WHERE bom_id = bh.id AND item_id = i.id
  )
LIMIT 1;

-- BOM for Electronic Box Assy
INSERT INTO bom_headers (tenant_id, item_id, version, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    id, 
    1, 
    true, 
    NOW(), 
    NOW()
FROM items 
WHERE name = 'Electronic Box Assy' AND type IN ('SUB_ASSEMBLY'::item_type, 'FINISHED_GOODS'::item_type)
  AND NOT EXISTS (
      SELECT 1 FROM bom_headers bh2 
      WHERE bh2.item_id = items.id
  )
LIMIT 1;

INSERT INTO bom_items (bom_id, item_id, quantity, created_at)
SELECT 
    bh.id,
    i.id,
    1.0,
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.item_id = (SELECT id FROM items WHERE name = 'Electronic Box Assy' AND type = 'SUB_ASSEMBLY'::item_type LIMIT 1)
  AND i.name = 'Ipex4 to SMA converter extension'
  AND NOT EXISTS (
      SELECT 1 FROM bom_items WHERE bom_id = bh.id AND item_id = i.id
  )
LIMIT 1;

INSERT INTO bom_items (bom_id, item_id, quantity, created_at)
SELECT 
    bh.id,
    i.id,
    1.0,
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.item_id = (SELECT id FROM items WHERE name = 'Electronic Box Assy' AND type = 'SUB_ASSEMBLY'::item_type LIMIT 1)
  AND i.name = 'Electronic Box Top Lid'
  AND NOT EXISTS (
      SELECT 1 FROM bom_items WHERE bom_id = bh.id AND item_id = i.id
  )
LIMIT 1;

INSERT INTO bom_items (bom_id, item_id, quantity, created_at)
SELECT 
    bh.id,
    i.id,
    1.0,
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.item_id = (SELECT id FROM items WHERE name = 'Electronic Box Assy' AND type = 'SUB_ASSEMBLY'::item_type LIMIT 1)
  AND i.name = 'BlueRobotics Leak'
  AND NOT EXISTS (
      SELECT 1 FROM bom_items WHERE bom_id = bh.id AND item_id = i.id
  )
LIMIT 1;

INSERT INTO bom_items (bom_id, item_id, quantity, created_at)
SELECT 
    bh.id,
    i.id,
    1.0,
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.item_id = (SELECT id FROM items WHERE name = 'Electronic Box Assy' AND type = 'SUB_ASSEMBLY'::item_type LIMIT 1)
  AND i.name = 'BlueRobotics Indicator'
  AND NOT EXISTS (
      SELECT 1 FROM bom_items WHERE bom_id = bh.id AND item_id = i.id
  )
LIMIT 1;

INSERT INTO bom_items (bom_id, item_id, quantity, created_at)
SELECT 
    bh.id,
    i.id,
    5.0,
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.item_id = (SELECT id FROM items WHERE name = 'Electronic Box Assy' AND type = 'SUB_ASSEMBLY'::item_type LIMIT 1)
  AND i.name = 'M4x6 PCB mount screw Magnetic'
  AND NOT EXISTS (
      SELECT 1 FROM bom_items WHERE bom_id = bh.id AND item_id = i.id
  )
LIMIT 1;

INSERT INTO bom_items (bom_id, item_id, quantity, created_at)
SELECT 
    bh.id,
    i.id,
    3.0,
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.item_id = (SELECT id FROM items WHERE name = 'Electronic Box Assy' AND type = 'SUB_ASSEMBLY'::item_type LIMIT 1)
  AND i.name = 'PG-7 Cable Gland'
  AND NOT EXISTS (
      SELECT 1 FROM bom_items WHERE bom_id = bh.id AND item_id = i.id
  )
LIMIT 1;

INSERT INTO bom_items (bom_id, item_id, quantity, created_at)
SELECT 
    bh.id,
    i.id,
    1.0,
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.item_id = (SELECT id FROM items WHERE name = 'Electronic Box Assy' AND type = 'SUB_ASSEMBLY'::item_type LIMIT 1)
  AND i.name = 'Electronic Box'
  AND NOT EXISTS (
      SELECT 1 FROM bom_items WHERE bom_id = bh.id AND item_id = i.id
  )
LIMIT 1;

INSERT INTO bom_items (bom_id, item_id, quantity, created_at)
SELECT 
    bh.id,
    i.id,
    1.0,
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.item_id = (SELECT id FROM items WHERE name = 'Electronic Box Assy' AND type = 'SUB_ASSEMBLY'::item_type LIMIT 1)
  AND i.name = 'IM Front Lid'
  AND NOT EXISTS (
      SELECT 1 FROM bom_items WHERE bom_id = bh.id AND item_id = i.id
  )
LIMIT 1;

INSERT INTO bom_items (bom_id, item_id, quantity, created_at)
SELECT 
    bh.id,
    i.id,
    10.0,
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.item_id = (SELECT id FROM items WHERE name = 'Electronic Box Assy' AND type = 'SUB_ASSEMBLY'::item_type LIMIT 1)
  AND i.name = 'Teroson MS930'
  AND NOT EXISTS (
      SELECT 1 FROM bom_items WHERE bom_id = bh.id AND item_id = i.id
  )
LIMIT 1;

INSERT INTO bom_items (bom_id, item_id, quantity, created_at)
SELECT 
    bh.id,
    i.id,
    20.0,
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.item_id = (SELECT id FROM items WHERE name = 'Electronic Box Assy' AND type = 'SUB_ASSEMBLY'::item_type LIMIT 1)
  AND i.name = 'Silicon RTV 732'
  AND NOT EXISTS (
      SELECT 1 FROM bom_items WHERE bom_id = bh.id AND item_id = i.id
  )
LIMIT 1;

INSERT INTO bom_items (bom_id, item_id, quantity, created_at)
SELECT 
    bh.id,
    i.id,
    1,
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.item_id = (SELECT id FROM items WHERE name = 'Electronic Box Assy' AND type = 'SUB_ASSEMBLY'::item_type LIMIT 1)
  AND i.name = 'Power Switch Assy'
  AND NOT EXISTS (
      SELECT 1 FROM bom_items WHERE bom_id = bh.id AND item_id = i.id
  )
LIMIT 1;

INSERT INTO bom_items (bom_id, item_id, quantity, created_at)
SELECT 
    bh.id,
    i.id,
    4.0,
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.item_id = (SELECT id FROM items WHERE name = 'Electronic Box Assy' AND type = 'SUB_ASSEMBLY'::item_type LIMIT 1)
  AND i.name = 'M4x20 CSK Phillips'
  AND NOT EXISTS (
      SELECT 1 FROM bom_items WHERE bom_id = bh.id AND item_id = i.id
  )
LIMIT 1;

INSERT INTO bom_items (bom_id, item_id, quantity, created_at)
SELECT 
    bh.id,
    i.id,
    1,
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.item_id = (SELECT id FROM items WHERE name = 'Electronic Box Assy' AND type = 'SUB_ASSEMBLY'::item_type LIMIT 1)
  AND i.name = 'STBD Signal PM Assy'
  AND NOT EXISTS (
      SELECT 1 FROM bom_items WHERE bom_id = bh.id AND item_id = i.id
  )
LIMIT 1;

INSERT INTO bom_items (bom_id, item_id, quantity, created_at)
SELECT 
    bh.id,
    i.id,
    1,
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.item_id = (SELECT id FROM items WHERE name = 'Electronic Box Assy' AND type = 'SUB_ASSEMBLY'::item_type LIMIT 1)
  AND i.name = 'PORT Signal PM Assy'
  AND NOT EXISTS (
      SELECT 1 FROM bom_items WHERE bom_id = bh.id AND item_id = i.id
  )
LIMIT 1;

INSERT INTO bom_items (bom_id, item_id, quantity, created_at)
SELECT 
    bh.id,
    i.id,
    1,
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.item_id = (SELECT id FROM items WHERE name = 'Electronic Box Assy' AND type = 'SUB_ASSEMBLY'::item_type LIMIT 1)
  AND i.name = 'Current Sensor Assy'
  AND NOT EXISTS (
      SELECT 1 FROM bom_items WHERE bom_id = bh.id AND item_id = i.id
  )
LIMIT 1;

INSERT INTO bom_items (bom_id, item_id, quantity, created_at)
SELECT 
    bh.id,
    i.id,
    1,
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.item_id = (SELECT id FROM items WHERE name = 'Electronic Box Assy' AND type = 'SUB_ASSEMBLY'::item_type LIMIT 1)
  AND i.name = 'A21 MotherBoard Assy'
  AND NOT EXISTS (
      SELECT 1 FROM bom_items WHERE bom_id = bh.id AND item_id = i.id
  )
LIMIT 1;

-- BOM for FL_STBD Elec
INSERT INTO bom_headers (tenant_id, item_id, version, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    id, 
    1, 
    true, 
    NOW(), 
    NOW()
FROM items 
WHERE name = 'FL_STBD Elec' AND type IN ('SUB_ASSEMBLY'::item_type, 'FINISHED_GOODS'::item_type)
  AND NOT EXISTS (
      SELECT 1 FROM bom_headers bh2 
      WHERE bh2.item_id = items.id
  )
LIMIT 1;

INSERT INTO bom_items (bom_id, item_id, quantity, created_at)
SELECT 
    bh.id,
    i.id,
    2.0,
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.item_id = (SELECT id FROM items WHERE name = 'FL_STBD Elec' AND type = 'SUB_ASSEMBLY'::item_type LIMIT 1)
  AND i.name = '2mm male bullet connector'
  AND NOT EXISTS (
      SELECT 1 FROM bom_items WHERE bom_id = bh.id AND item_id = i.id
  )
LIMIT 1;

INSERT INTO bom_items (bom_id, item_id, quantity, created_at)
SELECT 
    bh.id,
    i.id,
    1.0,
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.item_id = (SELECT id FROM items WHERE name = 'FL_STBD Elec' AND type = 'SUB_ASSEMBLY'::item_type LIMIT 1)
  AND i.name = 'PWB of STBD flash light'
  AND NOT EXISTS (
      SELECT 1 FROM bom_items WHERE bom_id = bh.id AND item_id = i.id
  )
LIMIT 1;

INSERT INTO bom_items (bom_id, item_id, quantity, created_at)
SELECT 
    bh.id,
    i.id,
    0.55,
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.item_id = (SELECT id FROM items WHERE name = 'FL_STBD Elec' AND type = 'SUB_ASSEMBLY'::item_type LIMIT 1)
  AND i.name = 'Red 14/38 wire'
  AND NOT EXISTS (
      SELECT 1 FROM bom_items WHERE bom_id = bh.id AND item_id = i.id
  )
LIMIT 1;

INSERT INTO bom_items (bom_id, item_id, quantity, created_at)
SELECT 
    bh.id,
    i.id,
    0.35,
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.item_id = (SELECT id FROM items WHERE name = 'FL_STBD Elec' AND type = 'SUB_ASSEMBLY'::item_type LIMIT 1)
  AND i.name = 'Black 14/38 Wire'
  AND NOT EXISTS (
      SELECT 1 FROM bom_items WHERE bom_id = bh.id AND item_id = i.id
  )
LIMIT 1;

INSERT INTO bom_items (bom_id, item_id, quantity, created_at)
SELECT 
    bh.id,
    i.id,
    4.0,
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.item_id = (SELECT id FROM items WHERE name = 'FL_STBD Elec' AND type = 'SUB_ASSEMBLY'::item_type LIMIT 1)
  AND i.name = 'Green 2835 SMD LED 1W'
  AND NOT EXISTS (
      SELECT 1 FROM bom_items WHERE bom_id = bh.id AND item_id = i.id
  )
LIMIT 1;

-- BOM for FL_PORT Elec
INSERT INTO bom_headers (tenant_id, item_id, version, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    id, 
    1, 
    true, 
    NOW(), 
    NOW()
FROM items 
WHERE name = 'FL_PORT Elec' AND type IN ('SUB_ASSEMBLY'::item_type, 'FINISHED_GOODS'::item_type)
  AND NOT EXISTS (
      SELECT 1 FROM bom_headers bh2 
      WHERE bh2.item_id = items.id
  )
LIMIT 1;

INSERT INTO bom_items (bom_id, item_id, quantity, created_at)
SELECT 
    bh.id,
    i.id,
    1.0,
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.item_id = (SELECT id FROM items WHERE name = 'FL_PORT Elec' AND type = 'SUB_ASSEMBLY'::item_type LIMIT 1)
  AND i.name = '2mm male bullet connector'
  AND NOT EXISTS (
      SELECT 1 FROM bom_items WHERE bom_id = bh.id AND item_id = i.id
  )
LIMIT 1;

INSERT INTO bom_items (bom_id, item_id, quantity, created_at)
SELECT 
    bh.id,
    i.id,
    1.0,
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.item_id = (SELECT id FROM items WHERE name = 'FL_PORT Elec' AND type = 'SUB_ASSEMBLY'::item_type LIMIT 1)
  AND i.name = '2mm Female Bullet connector'
  AND NOT EXISTS (
      SELECT 1 FROM bom_items WHERE bom_id = bh.id AND item_id = i.id
  )
LIMIT 1;

INSERT INTO bom_items (bom_id, item_id, quantity, created_at)
SELECT 
    bh.id,
    i.id,
    1.0,
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.item_id = (SELECT id FROM items WHERE name = 'FL_PORT Elec' AND type = 'SUB_ASSEMBLY'::item_type LIMIT 1)
  AND i.name = 'PWB of PORT flash light'
  AND NOT EXISTS (
      SELECT 1 FROM bom_items WHERE bom_id = bh.id AND item_id = i.id
  )
LIMIT 1;

INSERT INTO bom_items (bom_id, item_id, quantity, created_at)
SELECT 
    bh.id,
    i.id,
    0.35,
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.item_id = (SELECT id FROM items WHERE name = 'FL_PORT Elec' AND type = 'SUB_ASSEMBLY'::item_type LIMIT 1)
  AND i.name = 'Red 14/38 wire'
  AND NOT EXISTS (
      SELECT 1 FROM bom_items WHERE bom_id = bh.id AND item_id = i.id
  )
LIMIT 1;

INSERT INTO bom_items (bom_id, item_id, quantity, created_at)
SELECT 
    bh.id,
    i.id,
    0.55,
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.item_id = (SELECT id FROM items WHERE name = 'FL_PORT Elec' AND type = 'SUB_ASSEMBLY'::item_type LIMIT 1)
  AND i.name = 'Black 14/38 Wire'
  AND NOT EXISTS (
      SELECT 1 FROM bom_items WHERE bom_id = bh.id AND item_id = i.id
  )
LIMIT 1;

INSERT INTO bom_items (bom_id, item_id, quantity, created_at)
SELECT 
    bh.id,
    i.id,
    6.0,
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.item_id = (SELECT id FROM items WHERE name = 'FL_PORT Elec' AND type = 'SUB_ASSEMBLY'::item_type LIMIT 1)
  AND i.name = 'Red 2835 SMD LED 1W'
  AND NOT EXISTS (
      SELECT 1 FROM bom_items WHERE bom_id = bh.id AND item_id = i.id
  )
LIMIT 1;

-- BOM for FL_STBD Mech
INSERT INTO bom_headers (tenant_id, item_id, version, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    id, 
    1, 
    true, 
    NOW(), 
    NOW()
FROM items 
WHERE name = 'FL_STBD Mech' AND type IN ('SUB_ASSEMBLY'::item_type, 'FINISHED_GOODS'::item_type)
  AND NOT EXISTS (
      SELECT 1 FROM bom_headers bh2 
      WHERE bh2.item_id = items.id
  )
LIMIT 1;

INSERT INTO bom_items (bom_id, item_id, quantity, created_at)
SELECT 
    bh.id,
    i.id,
    6.0,
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.item_id = (SELECT id FROM items WHERE name = 'FL_STBD Mech' AND type = 'SUB_ASSEMBLY'::item_type LIMIT 1)
  AND i.name = 'M3x8 Button Head'
  AND NOT EXISTS (
      SELECT 1 FROM bom_items WHERE bom_id = bh.id AND item_id = i.id
  )
LIMIT 1;

INSERT INTO bom_items (bom_id, item_id, quantity, created_at)
SELECT 
    bh.id,
    i.id,
    1.0,
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.item_id = (SELECT id FROM items WHERE name = 'FL_STBD Mech' AND type = 'SUB_ASSEMBLY'::item_type LIMIT 1)
  AND i.name = 'Flashing Light glass'
  AND NOT EXISTS (
      SELECT 1 FROM bom_items WHERE bom_id = bh.id AND item_id = i.id
  )
LIMIT 1;

INSERT INTO bom_items (bom_id, item_id, quantity, created_at)
SELECT 
    bh.id,
    i.id,
    1.0,
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.item_id = (SELECT id FROM items WHERE name = 'FL_STBD Mech' AND type = 'SUB_ASSEMBLY'::item_type LIMIT 1)
  AND i.name = 'Flashing Light bottom plate'
  AND NOT EXISTS (
      SELECT 1 FROM bom_items WHERE bom_id = bh.id AND item_id = i.id
  )
LIMIT 1;

INSERT INTO bom_items (bom_id, item_id, quantity, created_at)
SELECT 
    bh.id,
    i.id,
    5.0,
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.item_id = (SELECT id FROM items WHERE name = 'FL_STBD Mech' AND type = 'SUB_ASSEMBLY'::item_type LIMIT 1)
  AND i.name = 'Heatsink paste'
  AND NOT EXISTS (
      SELECT 1 FROM bom_items WHERE bom_id = bh.id AND item_id = i.id
  )
LIMIT 1;

INSERT INTO bom_items (bom_id, item_id, quantity, created_at)
SELECT 
    bh.id,
    i.id,
    2.0,
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.item_id = (SELECT id FROM items WHERE name = 'FL_STBD Mech' AND type = 'SUB_ASSEMBLY'::item_type LIMIT 1)
  AND i.name = 'M3x6 Allen Head'
  AND NOT EXISTS (
      SELECT 1 FROM bom_items WHERE bom_id = bh.id AND item_id = i.id
  )
LIMIT 1;

INSERT INTO bom_items (bom_id, item_id, quantity, created_at)
SELECT 
    bh.id,
    i.id,
    2.0,
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.item_id = (SELECT id FROM items WHERE name = 'FL_STBD Mech' AND type = 'SUB_ASSEMBLY'::item_type LIMIT 1)
  AND i.name = 'M4x12 Allen Head'
  AND NOT EXISTS (
      SELECT 1 FROM bom_items WHERE bom_id = bh.id AND item_id = i.id
  )
LIMIT 1;

INSERT INTO bom_items (bom_id, item_id, quantity, created_at)
SELECT 
    bh.id,
    i.id,
    5.0,
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.item_id = (SELECT id FROM items WHERE name = 'FL_STBD Mech' AND type = 'SUB_ASSEMBLY'::item_type LIMIT 1)
  AND i.name = 'Teroson MS930'
  AND NOT EXISTS (
      SELECT 1 FROM bom_items WHERE bom_id = bh.id AND item_id = i.id
  )
LIMIT 1;

-- BOM for FL_PORT Mech
INSERT INTO bom_headers (tenant_id, item_id, version, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    id, 
    1, 
    true, 
    NOW(), 
    NOW()
FROM items 
WHERE name = 'FL_PORT Mech' AND type IN ('SUB_ASSEMBLY'::item_type, 'FINISHED_GOODS'::item_type)
  AND NOT EXISTS (
      SELECT 1 FROM bom_headers bh2 
      WHERE bh2.item_id = items.id
  )
LIMIT 1;

INSERT INTO bom_items (bom_id, item_id, quantity, created_at)
SELECT 
    bh.id,
    i.id,
    6.0,
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.item_id = (SELECT id FROM items WHERE name = 'FL_PORT Mech' AND type = 'SUB_ASSEMBLY'::item_type LIMIT 1)
  AND i.name = 'M3x8 Button Head'
  AND NOT EXISTS (
      SELECT 1 FROM bom_items WHERE bom_id = bh.id AND item_id = i.id
  )
LIMIT 1;

INSERT INTO bom_items (bom_id, item_id, quantity, created_at)
SELECT 
    bh.id,
    i.id,
    1.0,
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.item_id = (SELECT id FROM items WHERE name = 'FL_PORT Mech' AND type = 'SUB_ASSEMBLY'::item_type LIMIT 1)
  AND i.name = 'Flashing Light glass'
  AND NOT EXISTS (
      SELECT 1 FROM bom_items WHERE bom_id = bh.id AND item_id = i.id
  )
LIMIT 1;

INSERT INTO bom_items (bom_id, item_id, quantity, created_at)
SELECT 
    bh.id,
    i.id,
    1.0,
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.item_id = (SELECT id FROM items WHERE name = 'FL_PORT Mech' AND type = 'SUB_ASSEMBLY'::item_type LIMIT 1)
  AND i.name = 'Flashing Light bottom plate'
  AND NOT EXISTS (
      SELECT 1 FROM bom_items WHERE bom_id = bh.id AND item_id = i.id
  )
LIMIT 1;

INSERT INTO bom_items (bom_id, item_id, quantity, created_at)
SELECT 
    bh.id,
    i.id,
    5.0,
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.item_id = (SELECT id FROM items WHERE name = 'FL_PORT Mech' AND type = 'SUB_ASSEMBLY'::item_type LIMIT 1)
  AND i.name = 'Heatsink paste'
  AND NOT EXISTS (
      SELECT 1 FROM bom_items WHERE bom_id = bh.id AND item_id = i.id
  )
LIMIT 1;

INSERT INTO bom_items (bom_id, item_id, quantity, created_at)
SELECT 
    bh.id,
    i.id,
    2.0,
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.item_id = (SELECT id FROM items WHERE name = 'FL_PORT Mech' AND type = 'SUB_ASSEMBLY'::item_type LIMIT 1)
  AND i.name = 'M3x6 Allen Head'
  AND NOT EXISTS (
      SELECT 1 FROM bom_items WHERE bom_id = bh.id AND item_id = i.id
  )
LIMIT 1;

INSERT INTO bom_items (bom_id, item_id, quantity, created_at)
SELECT 
    bh.id,
    i.id,
    2.0,
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.item_id = (SELECT id FROM items WHERE name = 'FL_PORT Mech' AND type = 'SUB_ASSEMBLY'::item_type LIMIT 1)
  AND i.name = 'M4x12 Allen Head'
  AND NOT EXISTS (
      SELECT 1 FROM bom_items WHERE bom_id = bh.id AND item_id = i.id
  )
LIMIT 1;

INSERT INTO bom_items (bom_id, item_id, quantity, created_at)
SELECT 
    bh.id,
    i.id,
    5.0,
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.item_id = (SELECT id FROM items WHERE name = 'FL_PORT Mech' AND type = 'SUB_ASSEMBLY'::item_type LIMIT 1)
  AND i.name = 'Teroson MS930'
  AND NOT EXISTS (
      SELECT 1 FROM bom_items WHERE bom_id = bh.id AND item_id = i.id
  )
LIMIT 1;

-- BOM for Battery Block Assy
INSERT INTO bom_headers (tenant_id, item_id, version, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    id, 
    1, 
    true, 
    NOW(), 
    NOW()
FROM items 
WHERE name = 'Battery Block Assy' AND type IN ('SUB_ASSEMBLY'::item_type, 'FINISHED_GOODS'::item_type)
  AND NOT EXISTS (
      SELECT 1 FROM bom_headers bh2 
      WHERE bh2.item_id = items.id
  )
LIMIT 1;

INSERT INTO bom_items (bom_id, item_id, quantity, created_at)
SELECT 
    bh.id,
    i.id,
    18.0,
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.item_id = (SELECT id FROM items WHERE name = 'Battery Block Assy' AND type = 'SUB_ASSEMBLY'::item_type LIMIT 1)
  AND i.name = 'Li-In 21700 Cells Molicel P42A/ Samsung-40T'
  AND NOT EXISTS (
      SELECT 1 FROM bom_items WHERE bom_id = bh.id AND item_id = i.id
  )
LIMIT 1;

INSERT INTO bom_items (bom_id, item_id, quantity, created_at)
SELECT 
    bh.id,
    i.id,
    5.0,
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.item_id = (SELECT id FROM items WHERE name = 'Battery Block Assy' AND type = 'SUB_ASSEMBLY'::item_type LIMIT 1)
  AND i.name = 'Soldering flux'
  AND NOT EXISTS (
      SELECT 1 FROM bom_items WHERE bom_id = bh.id AND item_id = i.id
  )
LIMIT 1;

INSERT INTO bom_items (bom_id, item_id, quantity, created_at)
SELECT 
    bh.id,
    i.id,
    5.0,
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.item_id = (SELECT id FROM items WHERE name = 'Battery Block Assy' AND type = 'SUB_ASSEMBLY'::item_type LIMIT 1)
  AND i.name = 'Copper Strips 3x2 cells'
  AND NOT EXISTS (
      SELECT 1 FROM bom_items WHERE bom_id = bh.id AND item_id = i.id
  )
LIMIT 1;

INSERT INTO bom_items (bom_id, item_id, quantity, created_at)
SELECT 
    bh.id,
    i.id,
    2.5,
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.item_id = (SELECT id FROM items WHERE name = 'Battery Block Assy' AND type = 'SUB_ASSEMBLY'::item_type LIMIT 1)
  AND i.name = '70mm Paper Separator'
  AND NOT EXISTS (
      SELECT 1 FROM bom_items WHERE bom_id = bh.id AND item_id = i.id
  )
LIMIT 1;

INSERT INTO bom_items (bom_id, item_id, quantity, created_at)
SELECT 
    bh.id,
    i.id,
    18.0,
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.item_id = (SELECT id FROM items WHERE name = 'Battery Block Assy' AND type = 'SUB_ASSEMBLY'::item_type LIMIT 1)
  AND i.name = 'Barley paper for 21700 cylindrical cell'
  AND NOT EXISTS (
      SELECT 1 FROM bom_items WHERE bom_id = bh.id AND item_id = i.id
  )
LIMIT 1;

INSERT INTO bom_items (bom_id, item_id, quantity, created_at)
SELECT 
    bh.id,
    i.id,
    0.5,
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.item_id = (SELECT id FROM items WHERE name = 'Battery Block Assy' AND type = 'SUB_ASSEMBLY'::item_type LIMIT 1)
  AND i.name = '1" Masking Tape'
  AND NOT EXISTS (
      SELECT 1 FROM bom_items WHERE bom_id = bh.id AND item_id = i.id
  )
LIMIT 1;

-- BOM for STBD Battery Assy
INSERT INTO bom_headers (tenant_id, item_id, version, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    id, 
    1, 
    true, 
    NOW(), 
    NOW()
FROM items 
WHERE name = 'STBD Battery Assy' AND type IN ('SUB_ASSEMBLY'::item_type, 'FINISHED_GOODS'::item_type)
  AND NOT EXISTS (
      SELECT 1 FROM bom_headers bh2 
      WHERE bh2.item_id = items.id
  )
LIMIT 1;

INSERT INTO bom_items (bom_id, item_id, quantity, created_at)
SELECT 
    bh.id,
    i.id,
    1.0,
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.item_id = (SELECT id FROM items WHERE name = 'STBD Battery Assy' AND type = 'SUB_ASSEMBLY'::item_type LIMIT 1)
  AND i.name = '6mm female bullet connector'
  AND NOT EXISTS (
      SELECT 1 FROM bom_items WHERE bom_id = bh.id AND item_id = i.id
  )
LIMIT 1;

INSERT INTO bom_items (bom_id, item_id, quantity, created_at)
SELECT 
    bh.id,
    i.id,
    1.0,
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.item_id = (SELECT id FROM items WHERE name = 'STBD Battery Assy' AND type = 'SUB_ASSEMBLY'::item_type LIMIT 1)
  AND i.name = '8mm male bullet connector'
  AND NOT EXISTS (
      SELECT 1 FROM bom_items WHERE bom_id = bh.id AND item_id = i.id
  )
LIMIT 1;

INSERT INTO bom_items (bom_id, item_id, quantity, created_at)
SELECT 
    bh.id,
    i.id,
    0.65,
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.item_id = (SELECT id FROM items WHERE name = 'STBD Battery Assy' AND type = 'SUB_ASSEMBLY'::item_type LIMIT 1)
  AND i.name = 'Black 8AWG'
  AND NOT EXISTS (
      SELECT 1 FROM bom_items WHERE bom_id = bh.id AND item_id = i.id
  )
LIMIT 1;

INSERT INTO bom_items (bom_id, item_id, quantity, created_at)
SELECT 
    bh.id,
    i.id,
    0.65,
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.item_id = (SELECT id FROM items WHERE name = 'STBD Battery Assy' AND type = 'SUB_ASSEMBLY'::item_type LIMIT 1)
  AND i.name = 'Red 8AWG'
  AND NOT EXISTS (
      SELECT 1 FROM bom_items WHERE bom_id = bh.id AND item_id = i.id
  )
LIMIT 1;

INSERT INTO bom_items (bom_id, item_id, quantity, created_at)
SELECT 
    bh.id,
    i.id,
    5.0,
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.item_id = (SELECT id FROM items WHERE name = 'STBD Battery Assy' AND type = 'SUB_ASSEMBLY'::item_type LIMIT 1)
  AND i.name = 'Soldering flux'
  AND NOT EXISTS (
      SELECT 1 FROM bom_items WHERE bom_id = bh.id AND item_id = i.id
  )
LIMIT 1;

INSERT INTO bom_items (bom_id, item_id, quantity, created_at)
SELECT 
    bh.id,
    i.id,
    1.0,
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.item_id = (SELECT id FROM items WHERE name = 'STBD Battery Assy' AND type = 'SUB_ASSEMBLY'::item_type LIMIT 1)
  AND i.name = '2mm FRP 60x70mm'
  AND NOT EXISTS (
      SELECT 1 FROM bom_items WHERE bom_id = bh.id AND item_id = i.id
  )
LIMIT 1;

INSERT INTO bom_items (bom_id, item_id, quantity, created_at)
SELECT 
    bh.id,
    i.id,
    1.0,
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.item_id = (SELECT id FROM items WHERE name = 'STBD Battery Assy' AND type = 'SUB_ASSEMBLY'::item_type LIMIT 1)
  AND i.name = '2mm FRP 60x70mm with 18 mm hole'
  AND NOT EXISTS (
      SELECT 1 FROM bom_items WHERE bom_id = bh.id AND item_id = i.id
  )
LIMIT 1;

INSERT INTO bom_items (bom_id, item_id, quantity, created_at)
SELECT 
    bh.id,
    i.id,
    0.5,
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.item_id = (SELECT id FROM items WHERE name = 'STBD Battery Assy' AND type = 'SUB_ASSEMBLY'::item_type LIMIT 1)
  AND i.name = '70mm Paper Separator'
  AND NOT EXISTS (
      SELECT 1 FROM bom_items WHERE bom_id = bh.id AND item_id = i.id
  )
LIMIT 1;

INSERT INTO bom_items (bom_id, item_id, quantity, created_at)
SELECT 
    bh.id,
    i.id,
    30.0,
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.item_id = (SELECT id FROM items WHERE name = 'STBD Battery Assy' AND type = 'SUB_ASSEMBLY'::item_type LIMIT 1)
  AND i.name = '16AWG Lead'
  AND NOT EXISTS (
      SELECT 1 FROM bom_items WHERE bom_id = bh.id AND item_id = i.id
  )
LIMIT 1;

INSERT INTO bom_items (bom_id, item_id, quantity, created_at)
SELECT 
    bh.id,
    i.id,
    0.06,
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.item_id = (SELECT id FROM items WHERE name = 'STBD Battery Assy' AND type = 'SUB_ASSEMBLY'::item_type LIMIT 1)
  AND i.name = 'HeatShrink Tube 12:3'
  AND NOT EXISTS (
      SELECT 1 FROM bom_items WHERE bom_id = bh.id AND item_id = i.id
  )
LIMIT 1;

INSERT INTO bom_items (bom_id, item_id, quantity, created_at)
SELECT 
    bh.id,
    i.id,
    1.0,
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.item_id = (SELECT id FROM items WHERE name = 'STBD Battery Assy' AND type = 'SUB_ASSEMBLY'::item_type LIMIT 1)
  AND i.name = 'STBD Signal CM Assy'
  AND NOT EXISTS (
      SELECT 1 FROM bom_items WHERE bom_id = bh.id AND item_id = i.id
  )
LIMIT 1;

INSERT INTO bom_items (bom_id, item_id, quantity, created_at)
SELECT 
    bh.id,
    i.id,
    1,
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.item_id = (SELECT id FROM items WHERE name = 'STBD Battery Assy' AND type = 'SUB_ASSEMBLY'::item_type LIMIT 1)
  AND i.name = 'Battery Block Assy'
  AND NOT EXISTS (
      SELECT 1 FROM bom_items WHERE bom_id = bh.id AND item_id = i.id
  )
LIMIT 1;

INSERT INTO bom_items (bom_id, item_id, quantity, created_at)
SELECT 
    bh.id,
    i.id,
    0.17,
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.item_id = (SELECT id FROM items WHERE name = 'STBD Battery Assy' AND type = 'SUB_ASSEMBLY'::item_type LIMIT 1)
  AND i.name = 'HeatShrink Tube 100mm'
  AND NOT EXISTS (
      SELECT 1 FROM bom_items WHERE bom_id = bh.id AND item_id = i.id
  )
LIMIT 1;

INSERT INTO bom_items (bom_id, item_id, quantity, created_at)
SELECT 
    bh.id,
    i.id,
    20.0,
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.item_id = (SELECT id FROM items WHERE name = 'STBD Battery Assy' AND type = 'SUB_ASSEMBLY'::item_type LIMIT 1)
  AND i.name = 'Teroson MS930'
  AND NOT EXISTS (
      SELECT 1 FROM bom_items WHERE bom_id = bh.id AND item_id = i.id
  )
LIMIT 1;

-- BOM for PORT Battery Assy
INSERT INTO bom_headers (tenant_id, item_id, version, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    id, 
    1, 
    true, 
    NOW(), 
    NOW()
FROM items 
WHERE name = 'PORT Battery Assy' AND type IN ('SUB_ASSEMBLY'::item_type, 'FINISHED_GOODS'::item_type)
  AND NOT EXISTS (
      SELECT 1 FROM bom_headers bh2 
      WHERE bh2.item_id = items.id
  )
LIMIT 1;

INSERT INTO bom_items (bom_id, item_id, quantity, created_at)
SELECT 
    bh.id,
    i.id,
    2.0,
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.item_id = (SELECT id FROM items WHERE name = 'PORT Battery Assy' AND type = 'SUB_ASSEMBLY'::item_type LIMIT 1)
  AND i.name = '4mm Female Bullet connector'
  AND NOT EXISTS (
      SELECT 1 FROM bom_items WHERE bom_id = bh.id AND item_id = i.id
  )
LIMIT 1;

INSERT INTO bom_items (bom_id, item_id, quantity, created_at)
SELECT 
    bh.id,
    i.id,
    1.0,
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.item_id = (SELECT id FROM items WHERE name = 'PORT Battery Assy' AND type = 'SUB_ASSEMBLY'::item_type LIMIT 1)
  AND i.name = '2mm Female Bullet connector'
  AND NOT EXISTS (
      SELECT 1 FROM bom_items WHERE bom_id = bh.id AND item_id = i.id
  )
LIMIT 1;

INSERT INTO bom_items (bom_id, item_id, quantity, created_at)
SELECT 
    bh.id,
    i.id,
    1.0,
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.item_id = (SELECT id FROM items WHERE name = 'PORT Battery Assy' AND type = 'SUB_ASSEMBLY'::item_type LIMIT 1)
  AND i.name = '8mm female bullet connector'
  AND NOT EXISTS (
      SELECT 1 FROM bom_items WHERE bom_id = bh.id AND item_id = i.id
  )
LIMIT 1;

INSERT INTO bom_items (bom_id, item_id, quantity, created_at)
SELECT 
    bh.id,
    i.id,
    0.65,
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.item_id = (SELECT id FROM items WHERE name = 'PORT Battery Assy' AND type = 'SUB_ASSEMBLY'::item_type LIMIT 1)
  AND i.name = 'Red 8AWG'
  AND NOT EXISTS (
      SELECT 1 FROM bom_items WHERE bom_id = bh.id AND item_id = i.id
  )
LIMIT 1;

INSERT INTO bom_items (bom_id, item_id, quantity, created_at)
SELECT 
    bh.id,
    i.id,
    0.8,
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.item_id = (SELECT id FROM items WHERE name = 'PORT Battery Assy' AND type = 'SUB_ASSEMBLY'::item_type LIMIT 1)
  AND i.name = 'Black 12AWG'
  AND NOT EXISTS (
      SELECT 1 FROM bom_items WHERE bom_id = bh.id AND item_id = i.id
  )
LIMIT 1;

INSERT INTO bom_items (bom_id, item_id, quantity, created_at)
SELECT 
    bh.id,
    i.id,
    0.55,
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.item_id = (SELECT id FROM items WHERE name = 'PORT Battery Assy' AND type = 'SUB_ASSEMBLY'::item_type LIMIT 1)
  AND i.name = 'Black 18 AWG'
  AND NOT EXISTS (
      SELECT 1 FROM bom_items WHERE bom_id = bh.id AND item_id = i.id
  )
LIMIT 1;

INSERT INTO bom_items (bom_id, item_id, quantity, created_at)
SELECT 
    bh.id,
    i.id,
    5.0,
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.item_id = (SELECT id FROM items WHERE name = 'PORT Battery Assy' AND type = 'SUB_ASSEMBLY'::item_type LIMIT 1)
  AND i.name = 'Soldering flux'
  AND NOT EXISTS (
      SELECT 1 FROM bom_items WHERE bom_id = bh.id AND item_id = i.id
  )
LIMIT 1;

INSERT INTO bom_items (bom_id, item_id, quantity, created_at)
SELECT 
    bh.id,
    i.id,
    1.0,
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.item_id = (SELECT id FROM items WHERE name = 'PORT Battery Assy' AND type = 'SUB_ASSEMBLY'::item_type LIMIT 1)
  AND i.name = '2mm FRP 60x70mm'
  AND NOT EXISTS (
      SELECT 1 FROM bom_items WHERE bom_id = bh.id AND item_id = i.id
  )
LIMIT 1;

INSERT INTO bom_items (bom_id, item_id, quantity, created_at)
SELECT 
    bh.id,
    i.id,
    1.0,
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.item_id = (SELECT id FROM items WHERE name = 'PORT Battery Assy' AND type = 'SUB_ASSEMBLY'::item_type LIMIT 1)
  AND i.name = '2mm FRP 60x70mm with 18 mm hole'
  AND NOT EXISTS (
      SELECT 1 FROM bom_items WHERE bom_id = bh.id AND item_id = i.id
  )
LIMIT 1;

INSERT INTO bom_items (bom_id, item_id, quantity, created_at)
SELECT 
    bh.id,
    i.id,
    0.5,
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.item_id = (SELECT id FROM items WHERE name = 'PORT Battery Assy' AND type = 'SUB_ASSEMBLY'::item_type LIMIT 1)
  AND i.name = '70mm Paper Separator'
  AND NOT EXISTS (
      SELECT 1 FROM bom_items WHERE bom_id = bh.id AND item_id = i.id
  )
LIMIT 1;

INSERT INTO bom_items (bom_id, item_id, quantity, created_at)
SELECT 
    bh.id,
    i.id,
    30.0,
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.item_id = (SELECT id FROM items WHERE name = 'PORT Battery Assy' AND type = 'SUB_ASSEMBLY'::item_type LIMIT 1)
  AND i.name = '16AWG Lead'
  AND NOT EXISTS (
      SELECT 1 FROM bom_items WHERE bom_id = bh.id AND item_id = i.id
  )
LIMIT 1;

INSERT INTO bom_items (bom_id, item_id, quantity, created_at)
SELECT 
    bh.id,
    i.id,
    0.03,
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.item_id = (SELECT id FROM items WHERE name = 'PORT Battery Assy' AND type = 'SUB_ASSEMBLY'::item_type LIMIT 1)
  AND i.name = 'HeatShrink Tube 12:3'
  AND NOT EXISTS (
      SELECT 1 FROM bom_items WHERE bom_id = bh.id AND item_id = i.id
  )
LIMIT 1;

INSERT INTO bom_items (bom_id, item_id, quantity, created_at)
SELECT 
    bh.id,
    i.id,
    1,
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.item_id = (SELECT id FROM items WHERE name = 'PORT Battery Assy' AND type = 'SUB_ASSEMBLY'::item_type LIMIT 1)
  AND i.name = 'PORT Signal CM Assy'
  AND NOT EXISTS (
      SELECT 1 FROM bom_items WHERE bom_id = bh.id AND item_id = i.id
  )
LIMIT 1;

INSERT INTO bom_items (bom_id, item_id, quantity, created_at)
SELECT 
    bh.id,
    i.id,
    1,
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.item_id = (SELECT id FROM items WHERE name = 'PORT Battery Assy' AND type = 'SUB_ASSEMBLY'::item_type LIMIT 1)
  AND i.name = 'Battery Block Assy'
  AND NOT EXISTS (
      SELECT 1 FROM bom_items WHERE bom_id = bh.id AND item_id = i.id
  )
LIMIT 1;

INSERT INTO bom_items (bom_id, item_id, quantity, created_at)
SELECT 
    bh.id,
    i.id,
    0.17,
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.item_id = (SELECT id FROM items WHERE name = 'PORT Battery Assy' AND type = 'SUB_ASSEMBLY'::item_type LIMIT 1)
  AND i.name = 'HeatShrink Tube 100mm'
  AND NOT EXISTS (
      SELECT 1 FROM bom_items WHERE bom_id = bh.id AND item_id = i.id
  )
LIMIT 1;

INSERT INTO bom_items (bom_id, item_id, quantity, created_at)
SELECT 
    bh.id,
    i.id,
    20.0,
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.item_id = (SELECT id FROM items WHERE name = 'PORT Battery Assy' AND type = 'SUB_ASSEMBLY'::item_type LIMIT 1)
  AND i.name = 'Teroson MS930'
  AND NOT EXISTS (
      SELECT 1 FROM bom_items WHERE bom_id = bh.id AND item_id = i.id
  )
LIMIT 1;

-- BOM for STBD Unit Assy
INSERT INTO bom_headers (tenant_id, item_id, version, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    id, 
    1, 
    true, 
    NOW(), 
    NOW()
FROM items 
WHERE name = 'STBD Unit Assy' AND type IN ('SUB_ASSEMBLY'::item_type, 'FINISHED_GOODS'::item_type)
  AND NOT EXISTS (
      SELECT 1 FROM bom_headers bh2 
      WHERE bh2.item_id = items.id
  )
LIMIT 1;

INSERT INTO bom_items (bom_id, item_id, quantity, created_at)
SELECT 
    bh.id,
    i.id,
    1.0,
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.item_id = (SELECT id FROM items WHERE name = 'STBD Unit Assy' AND type = 'SUB_ASSEMBLY'::item_type LIMIT 1)
  AND i.name = 'ESC Mounting Clamp'
  AND NOT EXISTS (
      SELECT 1 FROM bom_items WHERE bom_id = bh.id AND item_id = i.id
  )
LIMIT 1;

INSERT INTO bom_items (bom_id, item_id, quantity, created_at)
SELECT 
    bh.id,
    i.id,
    4.0,
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.item_id = (SELECT id FROM items WHERE name = 'STBD Unit Assy' AND type = 'SUB_ASSEMBLY'::item_type LIMIT 1)
  AND i.name = 'M4 Nyloc'
  AND NOT EXISTS (
      SELECT 1 FROM bom_items WHERE bom_id = bh.id AND item_id = i.id
  )
LIMIT 1;

INSERT INTO bom_items (bom_id, item_id, quantity, created_at)
SELECT 
    bh.id,
    i.id,
    4.0,
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.item_id = (SELECT id FROM items WHERE name = 'STBD Unit Assy' AND type = 'SUB_ASSEMBLY'::item_type LIMIT 1)
  AND i.name = 'M4 Spring washer'
  AND NOT EXISTS (
      SELECT 1 FROM bom_items WHERE bom_id = bh.id AND item_id = i.id
  )
LIMIT 1;

INSERT INTO bom_items (bom_id, item_id, quantity, created_at)
SELECT 
    bh.id,
    i.id,
    4.0,
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.item_id = (SELECT id FROM items WHERE name = 'STBD Unit Assy' AND type = 'SUB_ASSEMBLY'::item_type LIMIT 1)
  AND i.name = 'M4x12 plain washer'
  AND NOT EXISTS (
      SELECT 1 FROM bom_items WHERE bom_id = bh.id AND item_id = i.id
  )
LIMIT 1;

INSERT INTO bom_items (bom_id, item_id, quantity, created_at)
SELECT 
    bh.id,
    i.id,
    1.0,
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.item_id = (SELECT id FROM items WHERE name = 'STBD Unit Assy' AND type = 'SUB_ASSEMBLY'::item_type LIMIT 1)
  AND i.name = '3mm Silicon Rubber Gaskets (35mmx10mm)'
  AND NOT EXISTS (
      SELECT 1 FROM bom_items WHERE bom_id = bh.id AND item_id = i.id
  )
LIMIT 1;

INSERT INTO bom_items (bom_id, item_id, quantity, created_at)
SELECT 
    bh.id,
    i.id,
    1,
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.item_id = (SELECT id FROM items WHERE name = 'STBD Unit Assy' AND type = 'SUB_ASSEMBLY'::item_type LIMIT 1)
  AND i.name = 'Jet Motor Assy'
  AND NOT EXISTS (
      SELECT 1 FROM bom_items WHERE bom_id = bh.id AND item_id = i.id
  )
LIMIT 1;

INSERT INTO bom_items (bom_id, item_id, quantity, created_at)
SELECT 
    bh.id,
    i.id,
    1,
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.item_id = (SELECT id FROM items WHERE name = 'STBD Unit Assy' AND type = 'SUB_ASSEMBLY'::item_type LIMIT 1)
  AND i.name = 'STBD_ESC Assy'
  AND NOT EXISTS (
      SELECT 1 FROM bom_items WHERE bom_id = bh.id AND item_id = i.id
  )
LIMIT 1;

INSERT INTO bom_items (bom_id, item_id, quantity, created_at)
SELECT 
    bh.id,
    i.id,
    1,
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.item_id = (SELECT id FROM items WHERE name = 'STBD Unit Assy' AND type = 'SUB_ASSEMBLY'::item_type LIMIT 1)
  AND i.name = 'STBD Battery Assy'
  AND NOT EXISTS (
      SELECT 1 FROM bom_items WHERE bom_id = bh.id AND item_id = i.id
  )
LIMIT 1;

INSERT INTO bom_items (bom_id, item_id, quantity, created_at)
SELECT 
    bh.id,
    i.id,
    2.0,
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.item_id = (SELECT id FROM items WHERE name = 'STBD Unit Assy' AND type = 'SUB_ASSEMBLY'::item_type LIMIT 1)
  AND i.name = 'M4x20 CSK Phillips'
  AND NOT EXISTS (
      SELECT 1 FROM bom_items WHERE bom_id = bh.id AND item_id = i.id
  )
LIMIT 1;

INSERT INTO bom_items (bom_id, item_id, quantity, created_at)
SELECT 
    bh.id,
    i.id,
    2.0,
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.item_id = (SELECT id FROM items WHERE name = 'STBD Unit Assy' AND type = 'SUB_ASSEMBLY'::item_type LIMIT 1)
  AND i.name = 'M4x16 Allen Head'
  AND NOT EXISTS (
      SELECT 1 FROM bom_items WHERE bom_id = bh.id AND item_id = i.id
  )
LIMIT 1;

-- BOM for PORT Unit Assy
INSERT INTO bom_headers (tenant_id, item_id, version, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    id, 
    1, 
    true, 
    NOW(), 
    NOW()
FROM items 
WHERE name = 'PORT Unit Assy' AND type IN ('SUB_ASSEMBLY'::item_type, 'FINISHED_GOODS'::item_type)
  AND NOT EXISTS (
      SELECT 1 FROM bom_headers bh2 
      WHERE bh2.item_id = items.id
  )
LIMIT 1;

INSERT INTO bom_items (bom_id, item_id, quantity, created_at)
SELECT 
    bh.id,
    i.id,
    1.0,
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.item_id = (SELECT id FROM items WHERE name = 'PORT Unit Assy' AND type = 'SUB_ASSEMBLY'::item_type LIMIT 1)
  AND i.name = 'ESC Mounting Clamp'
  AND NOT EXISTS (
      SELECT 1 FROM bom_items WHERE bom_id = bh.id AND item_id = i.id
  )
LIMIT 1;

INSERT INTO bom_items (bom_id, item_id, quantity, created_at)
SELECT 
    bh.id,
    i.id,
    4.0,
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.item_id = (SELECT id FROM items WHERE name = 'PORT Unit Assy' AND type = 'SUB_ASSEMBLY'::item_type LIMIT 1)
  AND i.name = 'M4 Nyloc'
  AND NOT EXISTS (
      SELECT 1 FROM bom_items WHERE bom_id = bh.id AND item_id = i.id
  )
LIMIT 1;

INSERT INTO bom_items (bom_id, item_id, quantity, created_at)
SELECT 
    bh.id,
    i.id,
    4.0,
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.item_id = (SELECT id FROM items WHERE name = 'PORT Unit Assy' AND type = 'SUB_ASSEMBLY'::item_type LIMIT 1)
  AND i.name = 'M4 Spring washer'
  AND NOT EXISTS (
      SELECT 1 FROM bom_items WHERE bom_id = bh.id AND item_id = i.id
  )
LIMIT 1;

INSERT INTO bom_items (bom_id, item_id, quantity, created_at)
SELECT 
    bh.id,
    i.id,
    4.0,
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.item_id = (SELECT id FROM items WHERE name = 'PORT Unit Assy' AND type = 'SUB_ASSEMBLY'::item_type LIMIT 1)
  AND i.name = 'M4x12 plain washer'
  AND NOT EXISTS (
      SELECT 1 FROM bom_items WHERE bom_id = bh.id AND item_id = i.id
  )
LIMIT 1;

INSERT INTO bom_items (bom_id, item_id, quantity, created_at)
SELECT 
    bh.id,
    i.id,
    1.0,
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.item_id = (SELECT id FROM items WHERE name = 'PORT Unit Assy' AND type = 'SUB_ASSEMBLY'::item_type LIMIT 1)
  AND i.name = '3mm Silicon Rubber Gaskets (35mmx10mm)'
  AND NOT EXISTS (
      SELECT 1 FROM bom_items WHERE bom_id = bh.id AND item_id = i.id
  )
LIMIT 1;

INSERT INTO bom_items (bom_id, item_id, quantity, created_at)
SELECT 
    bh.id,
    i.id,
    1,
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.item_id = (SELECT id FROM items WHERE name = 'PORT Unit Assy' AND type = 'SUB_ASSEMBLY'::item_type LIMIT 1)
  AND i.name = 'Jet Motor Assy'
  AND NOT EXISTS (
      SELECT 1 FROM bom_items WHERE bom_id = bh.id AND item_id = i.id
  )
LIMIT 1;

INSERT INTO bom_items (bom_id, item_id, quantity, created_at)
SELECT 
    bh.id,
    i.id,
    1,
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.item_id = (SELECT id FROM items WHERE name = 'PORT Unit Assy' AND type = 'SUB_ASSEMBLY'::item_type LIMIT 1)
  AND i.name = 'PORT_ESC Assy'
  AND NOT EXISTS (
      SELECT 1 FROM bom_items WHERE bom_id = bh.id AND item_id = i.id
  )
LIMIT 1;

INSERT INTO bom_items (bom_id, item_id, quantity, created_at)
SELECT 
    bh.id,
    i.id,
    1,
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.item_id = (SELECT id FROM items WHERE name = 'PORT Unit Assy' AND type = 'SUB_ASSEMBLY'::item_type LIMIT 1)
  AND i.name = 'PORT Battery Assy'
  AND NOT EXISTS (
      SELECT 1 FROM bom_items WHERE bom_id = bh.id AND item_id = i.id
  )
LIMIT 1;

INSERT INTO bom_items (bom_id, item_id, quantity, created_at)
SELECT 
    bh.id,
    i.id,
    2.0,
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.item_id = (SELECT id FROM items WHERE name = 'PORT Unit Assy' AND type = 'SUB_ASSEMBLY'::item_type LIMIT 1)
  AND i.name = 'M4x20 CSK Phillips'
  AND NOT EXISTS (
      SELECT 1 FROM bom_items WHERE bom_id = bh.id AND item_id = i.id
  )
LIMIT 1;

-- BOM for Self Rightening Assy
INSERT INTO bom_headers (tenant_id, item_id, version, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    id, 
    1, 
    true, 
    NOW(), 
    NOW()
FROM items 
WHERE name = 'Self Rightening Assy' AND type IN ('SUB_ASSEMBLY'::item_type, 'FINISHED_GOODS'::item_type)
  AND NOT EXISTS (
      SELECT 1 FROM bom_headers bh2 
      WHERE bh2.item_id = items.id
  )
LIMIT 1;

INSERT INTO bom_items (bom_id, item_id, quantity, created_at)
SELECT 
    bh.id,
    i.id,
    1.0,
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.item_id = (SELECT id FROM items WHERE name = 'Self Rightening Assy' AND type = 'SUB_ASSEMBLY'::item_type LIMIT 1)
  AND i.name = 'SR Structure'
  AND NOT EXISTS (
      SELECT 1 FROM bom_items WHERE bom_id = bh.id AND item_id = i.id
  )
LIMIT 1;

INSERT INTO bom_items (bom_id, item_id, quantity, created_at)
SELECT 
    bh.id,
    i.id,
    1.0,
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.item_id = (SELECT id FROM items WHERE name = 'Self Rightening Assy' AND type = 'SUB_ASSEMBLY'::item_type LIMIT 1)
  AND i.name = 'SR Pillow'
  AND NOT EXISTS (
      SELECT 1 FROM bom_items WHERE bom_id = bh.id AND item_id = i.id
  )
LIMIT 1;

INSERT INTO bom_items (bom_id, item_id, quantity, created_at)
SELECT 
    bh.id,
    i.id,
    6.0,
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.item_id = (SELECT id FROM items WHERE name = 'Self Rightening Assy' AND type = 'SUB_ASSEMBLY'::item_type LIMIT 1)
  AND i.name = 'M6x50 Button head'
  AND NOT EXISTS (
      SELECT 1 FROM bom_items WHERE bom_id = bh.id AND item_id = i.id
  )
LIMIT 1;

INSERT INTO bom_items (bom_id, item_id, quantity, created_at)
SELECT 
    bh.id,
    i.id,
    6.0,
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.item_id = (SELECT id FROM items WHERE name = 'Self Rightening Assy' AND type = 'SUB_ASSEMBLY'::item_type LIMIT 1)
  AND i.name = 'M6 Spring washer (SR structure clamping)'
  AND NOT EXISTS (
      SELECT 1 FROM bom_items WHERE bom_id = bh.id AND item_id = i.id
  )
LIMIT 1;

INSERT INTO bom_items (bom_id, item_id, quantity, created_at)
SELECT 
    bh.id,
    i.id,
    22.0,
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.item_id = (SELECT id FROM items WHERE name = 'Self Rightening Assy' AND type = 'SUB_ASSEMBLY'::item_type LIMIT 1)
  AND i.name = 'M6x20 Plain washer (SR structure clamping)'
  AND NOT EXISTS (
      SELECT 1 FROM bom_items WHERE bom_id = bh.id AND item_id = i.id
  )
LIMIT 1;

INSERT INTO bom_items (bom_id, item_id, quantity, created_at)
SELECT 
    bh.id,
    i.id,
    6.0,
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.item_id = (SELECT id FROM items WHERE name = 'Self Rightening Assy' AND type = 'SUB_ASSEMBLY'::item_type LIMIT 1)
  AND i.name = 'M6 Dome NUT SS (SR structure Clamping)'
  AND NOT EXISTS (
      SELECT 1 FROM bom_items WHERE bom_id = bh.id AND item_id = i.id
  )
LIMIT 1;

INSERT INTO bom_items (bom_id, item_id, quantity, created_at)
SELECT 
    bh.id,
    i.id,
    20.0,
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.item_id = (SELECT id FROM items WHERE name = 'Self Rightening Assy' AND type = 'SUB_ASSEMBLY'::item_type LIMIT 1)
  AND i.name = 'Teroson MS930'
  AND NOT EXISTS (
      SELECT 1 FROM bom_items WHERE bom_id = bh.id AND item_id = i.id
  )
LIMIT 1;

INSERT INTO bom_items (bom_id, item_id, quantity, created_at)
SELECT 
    bh.id,
    i.id,
    4.0,
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.item_id = (SELECT id FROM items WHERE name = 'Self Rightening Assy' AND type = 'SUB_ASSEMBLY'::item_type LIMIT 1)
  AND i.name = '3D printed SR Pillow Side Caps'
  AND NOT EXISTS (
      SELECT 1 FROM bom_items WHERE bom_id = bh.id AND item_id = i.id
  )
LIMIT 1;

INSERT INTO bom_items (bom_id, item_id, quantity, created_at)
SELECT 
    bh.id,
    i.id,
    2.0,
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.item_id = (SELECT id FROM items WHERE name = 'Self Rightening Assy' AND type = 'SUB_ASSEMBLY'::item_type LIMIT 1)
  AND i.name = '3D printed SR Pillow Middle Caps'
  AND NOT EXISTS (
      SELECT 1 FROM bom_items WHERE bom_id = bh.id AND item_id = i.id
  )
LIMIT 1;

INSERT INTO bom_items (bom_id, item_id, quantity, created_at)
SELECT 
    bh.id,
    i.id,
    0.15,
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.item_id = (SELECT id FROM items WHERE name = 'Self Rightening Assy' AND type = 'SUB_ASSEMBLY'::item_type LIMIT 1)
  AND i.name = '6mmx12mm Rubber Bush'
  AND NOT EXISTS (
      SELECT 1 FROM bom_items WHERE bom_id = bh.id AND item_id = i.id
  )
LIMIT 1;

INSERT INTO bom_items (bom_id, item_id, quantity, created_at)
SELECT 
    bh.id,
    i.id,
    1.0,
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.item_id = (SELECT id FROM items WHERE name = 'Self Rightening Assy' AND type = 'SUB_ASSEMBLY'::item_type LIMIT 1)
  AND i.name = 'Thread locker 242/270/290'
  AND NOT EXISTS (
      SELECT 1 FROM bom_items WHERE bom_id = bh.id AND item_id = i.id
  )
LIMIT 1;

INSERT INTO bom_items (bom_id, item_id, quantity, created_at)
SELECT 
    bh.id,
    i.id,
    5.0,
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.item_id = (SELECT id FROM items WHERE name = 'Self Rightening Assy' AND type = 'SUB_ASSEMBLY'::item_type LIMIT 1)
  AND i.name = 'Instant Adhesive 407 for EPE sticking'
  AND NOT EXISTS (
      SELECT 1 FROM bom_items WHERE bom_id = bh.id AND item_id = i.id
  )
LIMIT 1;

INSERT INTO bom_items (bom_id, item_id, quantity, created_at)
SELECT 
    bh.id,
    i.id,
    1.0,
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.item_id = (SELECT id FROM items WHERE name = 'Self Rightening Assy' AND type = 'SUB_ASSEMBLY'::item_type LIMIT 1)
  AND i.name = 'STBD SR Rubber Boot'
  AND NOT EXISTS (
      SELECT 1 FROM bom_items WHERE bom_id = bh.id AND item_id = i.id
  )
LIMIT 1;

INSERT INTO bom_items (bom_id, item_id, quantity, created_at)
SELECT 
    bh.id,
    i.id,
    1.0,
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.item_id = (SELECT id FROM items WHERE name = 'Self Rightening Assy' AND type = 'SUB_ASSEMBLY'::item_type LIMIT 1)
  AND i.name = 'PORT SR Rubber Boot'
  AND NOT EXISTS (
      SELECT 1 FROM bom_items WHERE bom_id = bh.id AND item_id = i.id
  )
LIMIT 1;

INSERT INTO bom_items (bom_id, item_id, quantity, created_at)
SELECT 
    bh.id,
    i.id,
    4.0,
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.item_id = (SELECT id FROM items WHERE name = 'Self Rightening Assy' AND type = 'SUB_ASSEMBLY'::item_type LIMIT 1)
  AND i.name = 'M6x150 Allen head'
  AND NOT EXISTS (
      SELECT 1 FROM bom_items WHERE bom_id = bh.id AND item_id = i.id
  )
LIMIT 1;

INSERT INTO bom_items (bom_id, item_id, quantity, created_at)
SELECT 
    bh.id,
    i.id,
    4.0,
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.item_id = (SELECT id FROM items WHERE name = 'Self Rightening Assy' AND type = 'SUB_ASSEMBLY'::item_type LIMIT 1)
  AND i.name = 'M6 Nyloc Nut'
  AND NOT EXISTS (
      SELECT 1 FROM bom_items WHERE bom_id = bh.id AND item_id = i.id
  )
LIMIT 1;

INSERT INTO bom_items (bom_id, item_id, quantity, created_at)
SELECT 
    bh.id,
    i.id,
    1,
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.item_id = (SELECT id FROM items WHERE name = 'Self Rightening Assy' AND type = 'SUB_ASSEMBLY'::item_type LIMIT 1)
  AND i.name = 'M6x12 Plain washer'
  AND NOT EXISTS (
      SELECT 1 FROM bom_items WHERE bom_id = bh.id AND item_id = i.id
  )
LIMIT 1;

INSERT INTO bom_items (bom_id, item_id, quantity, created_at)
SELECT 
    bh.id,
    i.id,
    2.6,
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.item_id = (SELECT id FROM items WHERE name = 'Self Rightening Assy' AND type = 'SUB_ASSEMBLY'::item_type LIMIT 1)
  AND i.name = 'RR Tape'
  AND NOT EXISTS (
      SELECT 1 FROM bom_items WHERE bom_id = bh.id AND item_id = i.id
  )
LIMIT 1;

-- BOM for IP Remote Assy
INSERT INTO bom_headers (tenant_id, item_id, version, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    id, 
    1, 
    true, 
    NOW(), 
    NOW()
FROM items 
WHERE name = 'IP Remote Assy' AND type IN ('SUB_ASSEMBLY'::item_type, 'FINISHED_GOODS'::item_type)
  AND NOT EXISTS (
      SELECT 1 FROM bom_headers bh2 
      WHERE bh2.item_id = items.id
  )
LIMIT 1;

INSERT INTO bom_items (bom_id, item_id, quantity, created_at)
SELECT 
    bh.id,
    i.id,
    1.0,
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.item_id = (SELECT id FROM items WHERE name = 'IP Remote Assy' AND type = 'SUB_ASSEMBLY'::item_type LIMIT 1)
  AND i.name = 'QX7 Transmitter with R9M'
  AND NOT EXISTS (
      SELECT 1 FROM bom_items WHERE bom_id = bh.id AND item_id = i.id
  )
LIMIT 1;

INSERT INTO bom_items (bom_id, item_id, quantity, created_at)
SELECT 
    bh.id,
    i.id,
    2.0,
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.item_id = (SELECT id FROM items WHERE name = 'IP Remote Assy' AND type = 'SUB_ASSEMBLY'::item_type LIMIT 1)
  AND i.name = 'PWB of Button -2'
  AND NOT EXISTS (
      SELECT 1 FROM bom_items WHERE bom_id = bh.id AND item_id = i.id
  )
LIMIT 1;

INSERT INTO bom_items (bom_id, item_id, quantity, created_at)
SELECT 
    bh.id,
    i.id,
    2.0,
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.item_id = (SELECT id FROM items WHERE name = 'IP Remote Assy' AND type = 'SUB_ASSEMBLY'::item_type LIMIT 1)
  AND i.name = 'Li-In 21700 Cells Molicel P42A/ Samsung-40T'
  AND NOT EXISTS (
      SELECT 1 FROM bom_items WHERE bom_id = bh.id AND item_id = i.id
  )
LIMIT 1;

INSERT INTO bom_items (bom_id, item_id, quantity, created_at)
SELECT 
    bh.id,
    i.id,
    1.0,
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.item_id = (SELECT id FROM items WHERE name = 'IP Remote Assy' AND type = 'SUB_ASSEMBLY'::item_type LIMIT 1)
  AND i.name = '3 pin JST-XH housing'
  AND NOT EXISTS (
      SELECT 1 FROM bom_items WHERE bom_id = bh.id AND item_id = i.id
  )
LIMIT 1;

INSERT INTO bom_items (bom_id, item_id, quantity, created_at)
SELECT 
    bh.id,
    i.id,
    1.0,
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.item_id = (SELECT id FROM items WHERE name = 'IP Remote Assy' AND type = 'SUB_ASSEMBLY'::item_type LIMIT 1)
  AND i.name = '25cm Red one side crimped wire'
  AND NOT EXISTS (
      SELECT 1 FROM bom_items WHERE bom_id = bh.id AND item_id = i.id
  )
LIMIT 1;

INSERT INTO bom_items (bom_id, item_id, quantity, created_at)
SELECT 
    bh.id,
    i.id,
    1.0,
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.item_id = (SELECT id FROM items WHERE name = 'IP Remote Assy' AND type = 'SUB_ASSEMBLY'::item_type LIMIT 1)
  AND i.name = '25cm Green one side crimped wire'
  AND NOT EXISTS (
      SELECT 1 FROM bom_items WHERE bom_id = bh.id AND item_id = i.id
  )
LIMIT 1;

INSERT INTO bom_items (bom_id, item_id, quantity, created_at)
SELECT 
    bh.id,
    i.id,
    1.0,
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.item_id = (SELECT id FROM items WHERE name = 'IP Remote Assy' AND type = 'SUB_ASSEMBLY'::item_type LIMIT 1)
  AND i.name = '25cm Black one side crimped wire'
  AND NOT EXISTS (
      SELECT 1 FROM bom_items WHERE bom_id = bh.id AND item_id = i.id
  )
LIMIT 1;

INSERT INTO bom_items (bom_id, item_id, quantity, created_at)
SELECT 
    bh.id,
    i.id,
    1,
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.item_id = (SELECT id FROM items WHERE name = 'IP Remote Assy' AND type = 'SUB_ASSEMBLY'::item_type LIMIT 1)
  AND i.name = 'Tactile switch'
  AND NOT EXISTS (
      SELECT 1 FROM bom_items WHERE bom_id = bh.id AND item_id = i.id
  )
LIMIT 1;

INSERT INTO bom_items (bom_id, item_id, quantity, created_at)
SELECT 
    bh.id,
    i.id,
    1.0,
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.item_id = (SELECT id FROM items WHERE name = 'IP Remote Assy' AND type = 'SUB_ASSEMBLY'::item_type LIMIT 1)
  AND i.name = 'R9M Antenna Extension wire RP-SMA to Open'
  AND NOT EXISTS (
      SELECT 1 FROM bom_items WHERE bom_id = bh.id AND item_id = i.id
  )
LIMIT 1;

INSERT INTO bom_items (bom_id, item_id, quantity, created_at)
SELECT 
    bh.id,
    i.id,
    0.2,
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.item_id = (SELECT id FROM items WHERE name = 'IP Remote Assy' AND type = 'SUB_ASSEMBLY'::item_type LIMIT 1)
  AND i.name = 'Black 14/38 Wire'
  AND NOT EXISTS (
      SELECT 1 FROM bom_items WHERE bom_id = bh.id AND item_id = i.id
  )
LIMIT 1;

INSERT INTO bom_items (bom_id, item_id, quantity, created_at)
SELECT 
    bh.id,
    i.id,
    0.2,
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.item_id = (SELECT id FROM items WHERE name = 'IP Remote Assy' AND type = 'SUB_ASSEMBLY'::item_type LIMIT 1)
  AND i.name = 'White 14/38 Wire'
  AND NOT EXISTS (
      SELECT 1 FROM bom_items WHERE bom_id = bh.id AND item_id = i.id
  )
LIMIT 1;

INSERT INTO bom_items (bom_id, item_id, quantity, created_at)
SELECT 
    bh.id,
    i.id,
    0.2,
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.item_id = (SELECT id FROM items WHERE name = 'IP Remote Assy' AND type = 'SUB_ASSEMBLY'::item_type LIMIT 1)
  AND i.name = 'Sky Blue 14/38 Wire'
  AND NOT EXISTS (
      SELECT 1 FROM bom_items WHERE bom_id = bh.id AND item_id = i.id
  )
LIMIT 1;

INSERT INTO bom_items (bom_id, item_id, quantity, created_at)
SELECT 
    bh.id,
    i.id,
    0.2,
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.item_id = (SELECT id FROM items WHERE name = 'IP Remote Assy' AND type = 'SUB_ASSEMBLY'::item_type LIMIT 1)
  AND i.name = 'Red 14/38 wire'
  AND NOT EXISTS (
      SELECT 1 FROM bom_items WHERE bom_id = bh.id AND item_id = i.id
  )
LIMIT 1;

INSERT INTO bom_items (bom_id, item_id, quantity, created_at)
SELECT 
    bh.id,
    i.id,
    0.2,
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.item_id = (SELECT id FROM items WHERE name = 'IP Remote Assy' AND type = 'SUB_ASSEMBLY'::item_type LIMIT 1)
  AND i.name = 'Yellow 14/38 Wire'
  AND NOT EXISTS (
      SELECT 1 FROM bom_items WHERE bom_id = bh.id AND item_id = i.id
  )
LIMIT 1;

INSERT INTO bom_items (bom_id, item_id, quantity, created_at)
SELECT 
    bh.id,
    i.id,
    0.2,
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.item_id = (SELECT id FROM items WHERE name = 'IP Remote Assy' AND type = 'SUB_ASSEMBLY'::item_type LIMIT 1)
  AND i.name = 'Orange 14/38 Wire'
  AND NOT EXISTS (
      SELECT 1 FROM bom_items WHERE bom_id = bh.id AND item_id = i.id
  )
LIMIT 1;

INSERT INTO bom_items (bom_id, item_id, quantity, created_at)
SELECT 
    bh.id,
    i.id,
    0.2,
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.item_id = (SELECT id FROM items WHERE name = 'IP Remote Assy' AND type = 'SUB_ASSEMBLY'::item_type LIMIT 1)
  AND i.name = 'Green 14/38 Wire'
  AND NOT EXISTS (
      SELECT 1 FROM bom_items WHERE bom_id = bh.id AND item_id = i.id
  )
LIMIT 1;

INSERT INTO bom_items (bom_id, item_id, quantity, created_at)
SELECT 
    bh.id,
    i.id,
    0.2,
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.item_id = (SELECT id FROM items WHERE name = 'IP Remote Assy' AND type = 'SUB_ASSEMBLY'::item_type LIMIT 1)
  AND i.name = 'Purple 14/38 Wire'
  AND NOT EXISTS (
      SELECT 1 FROM bom_items WHERE bom_id = bh.id AND item_id = i.id
  )
LIMIT 1;

INSERT INTO bom_items (bom_id, item_id, quantity, created_at)
SELECT 
    bh.id,
    i.id,
    0.2,
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.item_id = (SELECT id FROM items WHERE name = 'IP Remote Assy' AND type = 'SUB_ASSEMBLY'::item_type LIMIT 1)
  AND i.name = 'Brown 14/38 Wire'
  AND NOT EXISTS (
      SELECT 1 FROM bom_items WHERE bom_id = bh.id AND item_id = i.id
  )
LIMIT 1;

INSERT INTO bom_items (bom_id, item_id, quantity, created_at)
SELECT 
    bh.id,
    i.id,
    1.0,
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.item_id = (SELECT id FROM items WHERE name = 'IP Remote Assy' AND type = 'SUB_ASSEMBLY'::item_type LIMIT 1)
  AND i.name = 'SA12 9pin PM Pushpull'
  AND NOT EXISTS (
      SELECT 1 FROM bom_items WHERE bom_id = bh.id AND item_id = i.id
  )
LIMIT 1;

INSERT INTO bom_items (bom_id, item_id, quantity, created_at)
SELECT 
    bh.id,
    i.id,
    1.0,
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.item_id = (SELECT id FROM items WHERE name = 'IP Remote Assy' AND type = 'SUB_ASSEMBLY'::item_type LIMIT 1)
  AND i.name = 'IP Remote Lower Shell'
  AND NOT EXISTS (
      SELECT 1 FROM bom_items WHERE bom_id = bh.id AND item_id = i.id
  )
LIMIT 1;

INSERT INTO bom_items (bom_id, item_id, quantity, created_at)
SELECT 
    bh.id,
    i.id,
    1.0,
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.item_id = (SELECT id FROM items WHERE name = 'IP Remote Assy' AND type = 'SUB_ASSEMBLY'::item_type LIMIT 1)
  AND i.name = 'IP Remote Upper Shell'
  AND NOT EXISTS (
      SELECT 1 FROM bom_items WHERE bom_id = bh.id AND item_id = i.id
  )
LIMIT 1;

INSERT INTO bom_items (bom_id, item_id, quantity, created_at)
SELECT 
    bh.id,
    i.id,
    1.0,
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.item_id = (SELECT id FROM items WHERE name = 'IP Remote Assy' AND type = 'SUB_ASSEMBLY'::item_type LIMIT 1)
  AND i.name = 'PU Gasket Remote Lower Shell'
  AND NOT EXISTS (
      SELECT 1 FROM bom_items WHERE bom_id = bh.id AND item_id = i.id
  )
LIMIT 1;

INSERT INTO bom_items (bom_id, item_id, quantity, created_at)
SELECT 
    bh.id,
    i.id,
    20.0,
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.item_id = (SELECT id FROM items WHERE name = 'IP Remote Assy' AND type = 'SUB_ASSEMBLY'::item_type LIMIT 1)
  AND i.name = 'Teroson MS930'
  AND NOT EXISTS (
      SELECT 1 FROM bom_items WHERE bom_id = bh.id AND item_id = i.id
  )
LIMIT 1;

INSERT INTO bom_items (bom_id, item_id, quantity, created_at)
SELECT 
    bh.id,
    i.id,
    2.0,
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.item_id = (SELECT id FROM items WHERE name = 'IP Remote Assy' AND type = 'SUB_ASSEMBLY'::item_type LIMIT 1)
  AND i.name = 'Button Spacer No. 1'
  AND NOT EXISTS (
      SELECT 1 FROM bom_items WHERE bom_id = bh.id AND item_id = i.id
  )
LIMIT 1;

INSERT INTO bom_items (bom_id, item_id, quantity, created_at)
SELECT 
    bh.id,
    i.id,
    2.0,
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.item_id = (SELECT id FROM items WHERE name = 'IP Remote Assy' AND type = 'SUB_ASSEMBLY'::item_type LIMIT 1)
  AND i.name = 'Button Spacer No. 2'
  AND NOT EXISTS (
      SELECT 1 FROM bom_items WHERE bom_id = bh.id AND item_id = i.id
  )
LIMIT 1;

INSERT INTO bom_items (bom_id, item_id, quantity, created_at)
SELECT 
    bh.id,
    i.id,
    2.0,
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.item_id = (SELECT id FROM items WHERE name = 'IP Remote Assy' AND type = 'SUB_ASSEMBLY'::item_type LIMIT 1)
  AND i.name = 'Button No. 1 pressure bracket'
  AND NOT EXISTS (
      SELECT 1 FROM bom_items WHERE bom_id = bh.id AND item_id = i.id
  )
LIMIT 1;

INSERT INTO bom_items (bom_id, item_id, quantity, created_at)
SELECT 
    bh.id,
    i.id,
    4.0,
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.item_id = (SELECT id FROM items WHERE name = 'IP Remote Assy' AND type = 'SUB_ASSEMBLY'::item_type LIMIT 1)
  AND i.name = 'Remote Battery Holding Bracket'
  AND NOT EXISTS (
      SELECT 1 FROM bom_items WHERE bom_id = bh.id AND item_id = i.id
  )
LIMIT 1;

INSERT INTO bom_items (bom_id, item_id, quantity, created_at)
SELECT 
    bh.id,
    i.id,
    1.0,
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.item_id = (SELECT id FROM items WHERE name = 'IP Remote Assy' AND type = 'SUB_ASSEMBLY'::item_type LIMIT 1)
  AND i.name = 'Antenna clamp -1'
  AND NOT EXISTS (
      SELECT 1 FROM bom_items WHERE bom_id = bh.id AND item_id = i.id
  )
LIMIT 1;

INSERT INTO bom_items (bom_id, item_id, quantity, created_at)
SELECT 
    bh.id,
    i.id,
    1.0,
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.item_id = (SELECT id FROM items WHERE name = 'IP Remote Assy' AND type = 'SUB_ASSEMBLY'::item_type LIMIT 1)
  AND i.name = 'Antenna Clamp -2'
  AND NOT EXISTS (
      SELECT 1 FROM bom_items WHERE bom_id = bh.id AND item_id = i.id
  )
LIMIT 1;

INSERT INTO bom_items (bom_id, item_id, quantity, created_at)
SELECT 
    bh.id,
    i.id,
    2.0,
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.item_id = (SELECT id FROM items WHERE name = 'IP Remote Assy' AND type = 'SUB_ASSEMBLY'::item_type LIMIT 1)
  AND i.name = 'Cable Holder'
  AND NOT EXISTS (
      SELECT 1 FROM bom_items WHERE bom_id = bh.id AND item_id = i.id
  )
LIMIT 1;

INSERT INTO bom_items (bom_id, item_id, quantity, created_at)
SELECT 
    bh.id,
    i.id,
    1.0,
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.item_id = (SELECT id FROM items WHERE name = 'IP Remote Assy' AND type = 'SUB_ASSEMBLY'::item_type LIMIT 1)
  AND i.name = 'Remote Handle'
  AND NOT EXISTS (
      SELECT 1 FROM bom_items WHERE bom_id = bh.id AND item_id = i.id
  )
LIMIT 1;

INSERT INTO bom_items (bom_id, item_id, quantity, created_at)
SELECT 
    bh.id,
    i.id,
    1.0,
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.item_id = (SELECT id FROM items WHERE name = 'IP Remote Assy' AND type = 'SUB_ASSEMBLY'::item_type LIMIT 1)
  AND i.name = 'Polycarbonate Glass for Remote'
  AND NOT EXISTS (
      SELECT 1 FROM bom_items WHERE bom_id = bh.id AND item_id = i.id
  )
LIMIT 1;

INSERT INTO bom_items (bom_id, item_id, quantity, created_at)
SELECT 
    bh.id,
    i.id,
    2.0,
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.item_id = (SELECT id FROM items WHERE name = 'IP Remote Assy' AND type = 'SUB_ASSEMBLY'::item_type LIMIT 1)
  AND i.name = 'Joystick Water proof rubber'
  AND NOT EXISTS (
      SELECT 1 FROM bom_items WHERE bom_id = bh.id AND item_id = i.id
  )
LIMIT 1;

INSERT INTO bom_items (bom_id, item_id, quantity, created_at)
SELECT 
    bh.id,
    i.id,
    2.0,
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.item_id = (SELECT id FROM items WHERE name = 'IP Remote Assy' AND type = 'SUB_ASSEMBLY'::item_type LIMIT 1)
  AND i.name = 'Button Silicon Cover No. 1'
  AND NOT EXISTS (
      SELECT 1 FROM bom_items WHERE bom_id = bh.id AND item_id = i.id
  )
LIMIT 1;

INSERT INTO bom_items (bom_id, item_id, quantity, created_at)
SELECT 
    bh.id,
    i.id,
    2.0,
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.item_id = (SELECT id FROM items WHERE name = 'IP Remote Assy' AND type = 'SUB_ASSEMBLY'::item_type LIMIT 1)
  AND i.name = 'Button Silicon Cover No. 2'
  AND NOT EXISTS (
      SELECT 1 FROM bom_items WHERE bom_id = bh.id AND item_id = i.id
  )
LIMIT 1;

INSERT INTO bom_items (bom_id, item_id, quantity, created_at)
SELECT 
    bh.id,
    i.id,
    1.0,
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.item_id = (SELECT id FROM items WHERE name = 'IP Remote Assy' AND type = 'SUB_ASSEMBLY'::item_type LIMIT 1)
  AND i.name = 'Neck Strap Hook'
  AND NOT EXISTS (
      SELECT 1 FROM bom_items WHERE bom_id = bh.id AND item_id = i.id
  )
LIMIT 1;

INSERT INTO bom_items (bom_id, item_id, quantity, created_at)
SELECT 
    bh.id,
    i.id,
    1.0,
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.item_id = (SELECT id FROM items WHERE name = 'IP Remote Assy' AND type = 'SUB_ASSEMBLY'::item_type LIMIT 1)
  AND i.name = 'Neck Strap'
  AND NOT EXISTS (
      SELECT 1 FROM bom_items WHERE bom_id = bh.id AND item_id = i.id
  )
LIMIT 1;

INSERT INTO bom_items (bom_id, item_id, quantity, created_at)
SELECT 
    bh.id,
    i.id,
    20.0,
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.item_id = (SELECT id FROM items WHERE name = 'IP Remote Assy' AND type = 'SUB_ASSEMBLY'::item_type LIMIT 1)
  AND i.name = 'M2x12 Allen Head SS304'
  AND NOT EXISTS (
      SELECT 1 FROM bom_items WHERE bom_id = bh.id AND item_id = i.id
  )
LIMIT 1;

INSERT INTO bom_items (bom_id, item_id, quantity, created_at)
SELECT 
    bh.id,
    i.id,
    1.0,
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.item_id = (SELECT id FROM items WHERE name = 'IP Remote Assy' AND type = 'SUB_ASSEMBLY'::item_type LIMIT 1)
  AND i.name = '32Gb SD Card'
  AND NOT EXISTS (
      SELECT 1 FROM bom_items WHERE bom_id = bh.id AND item_id = i.id
  )
LIMIT 1;

-- BOM for IP Remote Charging Cable Assy
INSERT INTO bom_headers (tenant_id, item_id, version, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    id, 
    1, 
    true, 
    NOW(), 
    NOW()
FROM items 
WHERE name = 'IP Remote Charging Cable Assy' AND type IN ('SUB_ASSEMBLY'::item_type, 'FINISHED_GOODS'::item_type)
  AND NOT EXISTS (
      SELECT 1 FROM bom_headers bh2 
      WHERE bh2.item_id = items.id
  )
LIMIT 1;

INSERT INTO bom_items (bom_id, item_id, quantity, created_at)
SELECT 
    bh.id,
    i.id,
    1.0,
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.item_id = (SELECT id FROM items WHERE name = 'IP Remote Charging Cable Assy' AND type = 'SUB_ASSEMBLY'::item_type LIMIT 1)
  AND i.name = 'USB Data & Charging Cable 1m length'
  AND NOT EXISTS (
      SELECT 1 FROM bom_items WHERE bom_id = bh.id AND item_id = i.id
  )
LIMIT 1;

INSERT INTO bom_items (bom_id, item_id, quantity, created_at)
SELECT 
    bh.id,
    i.id,
    1.0,
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.item_id = (SELECT id FROM items WHERE name = 'IP Remote Charging Cable Assy' AND type = 'SUB_ASSEMBLY'::item_type LIMIT 1)
  AND i.name = '5v 2A USB Adapter'
  AND NOT EXISTS (
      SELECT 1 FROM bom_items WHERE bom_id = bh.id AND item_id = i.id
  )
LIMIT 1;

INSERT INTO bom_items (bom_id, item_id, quantity, created_at)
SELECT 
    bh.id,
    i.id,
    1.0,
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.item_id = (SELECT id FROM items WHERE name = 'IP Remote Charging Cable Assy' AND type = 'SUB_ASSEMBLY'::item_type LIMIT 1)
  AND i.name = 'SA12 9pin CM Pushpull'
  AND NOT EXISTS (
      SELECT 1 FROM bom_items WHERE bom_id = bh.id AND item_id = i.id
  )
LIMIT 1;

INSERT INTO bom_items (bom_id, item_id, quantity, created_at)
SELECT 
    bh.id,
    i.id,
    1.0,
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.item_id = (SELECT id FROM items WHERE name = 'IP Remote Charging Cable Assy' AND type = 'SUB_ASSEMBLY'::item_type LIMIT 1)
  AND i.name = 'Rotary Knob Box 3D print'
  AND NOT EXISTS (
      SELECT 1 FROM bom_items WHERE bom_id = bh.id AND item_id = i.id
  )
LIMIT 1;

-- BOM for AMCA Elec Assy
INSERT INTO bom_headers (tenant_id, item_id, version, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    id, 
    1, 
    true, 
    NOW(), 
    NOW()
FROM items 
WHERE name = 'AMCA Elec Assy' AND type IN ('SUB_ASSEMBLY'::item_type, 'FINISHED_GOODS'::item_type)
  AND NOT EXISTS (
      SELECT 1 FROM bom_headers bh2 
      WHERE bh2.item_id = items.id
  )
LIMIT 1;

INSERT INTO bom_items (bom_id, item_id, quantity, created_at)
SELECT 
    bh.id,
    i.id,
    4.0,
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.item_id = (SELECT id FROM items WHERE name = 'AMCA Elec Assy' AND type = 'SUB_ASSEMBLY'::item_type LIMIT 1)
  AND i.name = '1N4007 THT diode'
  AND NOT EXISTS (
      SELECT 1 FROM bom_items WHERE bom_id = bh.id AND item_id = i.id
  )
LIMIT 1;

INSERT INTO bom_items (bom_id, item_id, quantity, created_at)
SELECT 
    bh.id,
    i.id,
    1.0,
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.item_id = (SELECT id FROM items WHERE name = 'AMCA Elec Assy' AND type = 'SUB_ASSEMBLY'::item_type LIMIT 1)
  AND i.name = 'Water flow sensor'
  AND NOT EXISTS (
      SELECT 1 FROM bom_items WHERE bom_id = bh.id AND item_id = i.id
  )
LIMIT 1;

INSERT INTO bom_items (bom_id, item_id, quantity, created_at)
SELECT 
    bh.id,
    i.id,
    1.0,
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.item_id = (SELECT id FROM items WHERE name = 'AMCA Elec Assy' AND type = 'SUB_ASSEMBLY'::item_type LIMIT 1)
  AND i.name = 'Water pump'
  AND NOT EXISTS (
      SELECT 1 FROM bom_items WHERE bom_id = bh.id AND item_id = i.id
  )
LIMIT 1;

INSERT INTO bom_items (bom_id, item_id, quantity, created_at)
SELECT 
    bh.id,
    i.id,
    1.0,
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.item_id = (SELECT id FROM items WHERE name = 'AMCA Elec Assy' AND type = 'SUB_ASSEMBLY'::item_type LIMIT 1)
  AND i.name = '3S Lipo indicator'
  AND NOT EXISTS (
      SELECT 1 FROM bom_items WHERE bom_id = bh.id AND item_id = i.id
  )
LIMIT 1;

INSERT INTO bom_items (bom_id, item_id, quantity, created_at)
SELECT 
    bh.id,
    i.id,
    1.0,
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.item_id = (SELECT id FROM items WHERE name = 'AMCA Elec Assy' AND type = 'SUB_ASSEMBLY'::item_type LIMIT 1)
  AND i.name = 'Lipo Indicator Casings'
  AND NOT EXISTS (
      SELECT 1 FROM bom_items WHERE bom_id = bh.id AND item_id = i.id
  )
LIMIT 1;

INSERT INTO bom_items (bom_id, item_id, quantity, created_at)
SELECT 
    bh.id,
    i.id,
    1.0,
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.item_id = (SELECT id FROM items WHERE name = 'AMCA Elec Assy' AND type = 'SUB_ASSEMBLY'::item_type LIMIT 1)
  AND i.name = 'LM2596HW for PC'
  AND NOT EXISTS (
      SELECT 1 FROM bom_items WHERE bom_id = bh.id AND item_id = i.id
  )
LIMIT 1;

INSERT INTO bom_items (bom_id, item_id, quantity, created_at)
SELECT 
    bh.id,
    i.id,
    1.0,
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.item_id = (SELECT id FROM items WHERE name = 'AMCA Elec Assy' AND type = 'SUB_ASSEMBLY'::item_type LIMIT 1)
  AND i.name = 'Momentary Switch JCB'
  AND NOT EXISTS (
      SELECT 1 FROM bom_items WHERE bom_id = bh.id AND item_id = i.id
  )
LIMIT 1;

INSERT INTO bom_items (bom_id, item_id, quantity, created_at)
SELECT 
    bh.id,
    i.id,
    1.0,
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.item_id = (SELECT id FROM items WHERE name = 'AMCA Elec Assy' AND type = 'SUB_ASSEMBLY'::item_type LIMIT 1)
  AND i.name = 'Latching Power switch JCB'
  AND NOT EXISTS (
      SELECT 1 FROM bom_items WHERE bom_id = bh.id AND item_id = i.id
  )
LIMIT 1;

INSERT INTO bom_items (bom_id, item_id, quantity, created_at)
SELECT 
    bh.id,
    i.id,
    1.0,
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.item_id = (SELECT id FROM items WHERE name = 'AMCA Elec Assy' AND type = 'SUB_ASSEMBLY'::item_type LIMIT 1)
  AND i.name = 'PWB for JCB'
  AND NOT EXISTS (
      SELECT 1 FROM bom_items WHERE bom_id = bh.id AND item_id = i.id
  )
LIMIT 1;

INSERT INTO bom_items (bom_id, item_id, quantity, created_at)
SELECT 
    bh.id,
    i.id,
    3.0,
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.item_id = (SELECT id FROM items WHERE name = 'AMCA Elec Assy' AND type = 'SUB_ASSEMBLY'::item_type LIMIT 1)
  AND i.name = '3S, >2Ah Li-Ion cell for JCB'
  AND NOT EXISTS (
      SELECT 1 FROM bom_items WHERE bom_id = bh.id AND item_id = i.id
  )
LIMIT 1;

INSERT INTO bom_items (bom_id, item_id, quantity, created_at)
SELECT 
    bh.id,
    i.id,
    1.0,
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.item_id = (SELECT id FROM items WHERE name = 'AMCA Elec Assy' AND type = 'SUB_ASSEMBLY'::item_type LIMIT 1)
  AND i.name = 'DC JAck Panel Mount'
  AND NOT EXISTS (
      SELECT 1 FROM bom_items WHERE bom_id = bh.id AND item_id = i.id
  )
LIMIT 1;

INSERT INTO bom_items (bom_id, item_id, quantity, created_at)
SELECT 
    bh.id,
    i.id,
    5.0,
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.item_id = (SELECT id FROM items WHERE name = 'AMCA Elec Assy' AND type = 'SUB_ASSEMBLY'::item_type LIMIT 1)
  AND i.name = 'Lead wire 22AWG'
  AND NOT EXISTS (
      SELECT 1 FROM bom_items WHERE bom_id = bh.id AND item_id = i.id
  )
LIMIT 1;

INSERT INTO bom_items (bom_id, item_id, quantity, created_at)
SELECT 
    bh.id,
    i.id,
    1.0,
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.item_id = (SELECT id FROM items WHERE name = 'AMCA Elec Assy' AND type = 'SUB_ASSEMBLY'::item_type LIMIT 1)
  AND i.name = '16pin IC base'
  AND NOT EXISTS (
      SELECT 1 FROM bom_items WHERE bom_id = bh.id AND item_id = i.id
  )
LIMIT 1;

INSERT INTO bom_items (bom_id, item_id, quantity, created_at)
SELECT 
    bh.id,
    i.id,
    1.0,
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.item_id = (SELECT id FROM items WHERE name = 'AMCA Elec Assy' AND type = 'SUB_ASSEMBLY'::item_type LIMIT 1)
  AND i.name = 'ULN2003A THT'
  AND NOT EXISTS (
      SELECT 1 FROM bom_items WHERE bom_id = bh.id AND item_id = i.id
  )
LIMIT 1;

INSERT INTO bom_items (bom_id, item_id, quantity, created_at)
SELECT 
    bh.id,
    i.id,
    1.0,
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.item_id = (SELECT id FROM items WHERE name = 'AMCA Elec Assy' AND type = 'SUB_ASSEMBLY'::item_type LIMIT 1)
  AND i.name = 'iMAx B3 Charger'
  AND NOT EXISTS (
      SELECT 1 FROM bom_items WHERE bom_id = bh.id AND item_id = i.id
  )
LIMIT 1;

INSERT INTO bom_items (bom_id, item_id, quantity, created_at)
SELECT 
    bh.id,
    i.id,
    1.0,
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.item_id = (SELECT id FROM items WHERE name = 'AMCA Elec Assy' AND type = 'SUB_ASSEMBLY'::item_type LIMIT 1)
  AND i.name = '8core Wire 14/38'
  AND NOT EXISTS (
      SELECT 1 FROM bom_items WHERE bom_id = bh.id AND item_id = i.id
  )
LIMIT 1;

INSERT INTO bom_items (bom_id, item_id, quantity, created_at)
SELECT 
    bh.id,
    i.id,
    1.0,
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.item_id = (SELECT id FROM items WHERE name = 'AMCA Elec Assy' AND type = 'SUB_ASSEMBLY'::item_type LIMIT 1)
  AND i.name = 'LP12 4 pin plug male clip lock CM'
  AND NOT EXISTS (
      SELECT 1 FROM bom_items WHERE bom_id = bh.id AND item_id = i.id
  )
LIMIT 1;

INSERT INTO bom_items (bom_id, item_id, quantity, created_at)
SELECT 
    bh.id,
    i.id,
    1.0,
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.item_id = (SELECT id FROM items WHERE name = 'AMCA Elec Assy' AND type = 'SUB_ASSEMBLY'::item_type LIMIT 1)
  AND i.name = 'LP12 4 pin socket female clip lock PM'
  AND NOT EXISTS (
      SELECT 1 FROM bom_items WHERE bom_id = bh.id AND item_id = i.id
  )
LIMIT 1;

INSERT INTO bom_items (bom_id, item_id, quantity, created_at)
SELECT 
    bh.id,
    i.id,
    1.0,
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.item_id = (SELECT id FROM items WHERE name = 'AMCA Elec Assy' AND type = 'SUB_ASSEMBLY'::item_type LIMIT 1)
  AND i.name = '9v Piezo Electric Buzzer'
  AND NOT EXISTS (
      SELECT 1 FROM bom_items WHERE bom_id = bh.id AND item_id = i.id
  )
LIMIT 1;

INSERT INTO bom_items (bom_id, item_id, quantity, created_at)
SELECT 
    bh.id,
    i.id,
    1.0,
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.item_id = (SELECT id FROM items WHERE name = 'AMCA Elec Assy' AND type = 'SUB_ASSEMBLY'::item_type LIMIT 1)
  AND i.name = 'Female Bergstrip 40x1 2.54mm'
  AND NOT EXISTS (
      SELECT 1 FROM bom_items WHERE bom_id = bh.id AND item_id = i.id
  )
LIMIT 1;

INSERT INTO bom_items (bom_id, item_id, quantity, created_at)
SELECT 
    bh.id,
    i.id,
    1.0,
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.item_id = (SELECT id FROM items WHERE name = 'AMCA Elec Assy' AND type = 'SUB_ASSEMBLY'::item_type LIMIT 1)
  AND i.name = 'Male Bergstrip 40x1 2.54mm'
  AND NOT EXISTS (
      SELECT 1 FROM bom_items WHERE bom_id = bh.id AND item_id = i.id
  )
LIMIT 1;

INSERT INTO bom_items (bom_id, item_id, quantity, created_at)
SELECT 
    bh.id,
    i.id,
    10.0,
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.item_id = (SELECT id FROM items WHERE name = 'AMCA Elec Assy' AND type = 'SUB_ASSEMBLY'::item_type LIMIT 1)
  AND i.name = 'Conformal Coating'
  AND NOT EXISTS (
      SELECT 1 FROM bom_items WHERE bom_id = bh.id AND item_id = i.id
  )
LIMIT 1;

INSERT INTO bom_items (bom_id, item_id, quantity, created_at)
SELECT 
    bh.id,
    i.id,
    2.0,
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.item_id = (SELECT id FROM items WHERE name = 'AMCA Elec Assy' AND type = 'SUB_ASSEMBLY'::item_type LIMIT 1)
  AND i.name = 'Soldering flux'
  AND NOT EXISTS (
      SELECT 1 FROM bom_items WHERE bom_id = bh.id AND item_id = i.id
  )
LIMIT 1;

INSERT INTO bom_items (bom_id, item_id, quantity, created_at)
SELECT 
    bh.id,
    i.id,
    3.0,
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.item_id = (SELECT id FROM items WHERE name = 'AMCA Elec Assy' AND type = 'SUB_ASSEMBLY'::item_type LIMIT 1)
  AND i.name = '2 pin JST-XH housing'
  AND NOT EXISTS (
      SELECT 1 FROM bom_items WHERE bom_id = bh.id AND item_id = i.id
  )
LIMIT 1;

INSERT INTO bom_items (bom_id, item_id, quantity, created_at)
SELECT 
    bh.id,
    i.id,
    3.0,
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.item_id = (SELECT id FROM items WHERE name = 'AMCA Elec Assy' AND type = 'SUB_ASSEMBLY'::item_type LIMIT 1)
  AND i.name = '2 pin JST-XH male top entry'
  AND NOT EXISTS (
      SELECT 1 FROM bom_items WHERE bom_id = bh.id AND item_id = i.id
  )
LIMIT 1;

INSERT INTO bom_items (bom_id, item_id, quantity, created_at)
SELECT 
    bh.id,
    i.id,
    1.0,
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.item_id = (SELECT id FROM items WHERE name = 'AMCA Elec Assy' AND type = 'SUB_ASSEMBLY'::item_type LIMIT 1)
  AND i.name = '3 pin JST-XH male top entry'
  AND NOT EXISTS (
      SELECT 1 FROM bom_items WHERE bom_id = bh.id AND item_id = i.id
  )
LIMIT 1;

INSERT INTO bom_items (bom_id, item_id, quantity, created_at)
SELECT 
    bh.id,
    i.id,
    2.0,
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.item_id = (SELECT id FROM items WHERE name = 'AMCA Elec Assy' AND type = 'SUB_ASSEMBLY'::item_type LIMIT 1)
  AND i.name = '10cm one sided JST crimped Black'
  AND NOT EXISTS (
      SELECT 1 FROM bom_items WHERE bom_id = bh.id AND item_id = i.id
  )
LIMIT 1;

INSERT INTO bom_items (bom_id, item_id, quantity, created_at)
SELECT 
    bh.id,
    i.id,
    2.0,
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.item_id = (SELECT id FROM items WHERE name = 'AMCA Elec Assy' AND type = 'SUB_ASSEMBLY'::item_type LIMIT 1)
  AND i.name = '10cm one sided JST crimped Red'
  AND NOT EXISTS (
      SELECT 1 FROM bom_items WHERE bom_id = bh.id AND item_id = i.id
  )
LIMIT 1;

INSERT INTO bom_items (bom_id, item_id, quantity, created_at)
SELECT 
    bh.id,
    i.id,
    1.0,
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.item_id = (SELECT id FROM items WHERE name = 'AMCA Elec Assy' AND type = 'SUB_ASSEMBLY'::item_type LIMIT 1)
  AND i.name = 'Atmega328P-AU'
  AND NOT EXISTS (
      SELECT 1 FROM bom_items WHERE bom_id = bh.id AND item_id = i.id
  )
LIMIT 1;

INSERT INTO bom_items (bom_id, item_id, quantity, created_at)
SELECT 
    bh.id,
    i.id,
    2.0,
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.item_id = (SELECT id FROM items WHERE name = 'AMCA Elec Assy' AND type = 'SUB_ASSEMBLY'::item_type LIMIT 1)
  AND i.name = 'Red 14/38 wire'
  AND NOT EXISTS (
      SELECT 1 FROM bom_items WHERE bom_id = bh.id AND item_id = i.id
  )
LIMIT 1;

INSERT INTO bom_items (bom_id, item_id, quantity, created_at)
SELECT 
    bh.id,
    i.id,
    2.0,
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.item_id = (SELECT id FROM items WHERE name = 'AMCA Elec Assy' AND type = 'SUB_ASSEMBLY'::item_type LIMIT 1)
  AND i.name = 'Black 14/38 Wire'
  AND NOT EXISTS (
      SELECT 1 FROM bom_items WHERE bom_id = bh.id AND item_id = i.id
  )
LIMIT 1;

INSERT INTO bom_items (bom_id, item_id, quantity, created_at)
SELECT 
    bh.id,
    i.id,
    2.0,
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.item_id = (SELECT id FROM items WHERE name = 'AMCA Elec Assy' AND type = 'SUB_ASSEMBLY'::item_type LIMIT 1)
  AND i.name = 'Yellow 14/38 Wire'
  AND NOT EXISTS (
      SELECT 1 FROM bom_items WHERE bom_id = bh.id AND item_id = i.id
  )
LIMIT 1;

INSERT INTO bom_items (bom_id, item_id, quantity, created_at)
SELECT 
    bh.id,
    i.id,
    1.0,
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.item_id = (SELECT id FROM items WHERE name = 'AMCA Elec Assy' AND type = 'SUB_ASSEMBLY'::item_type LIMIT 1)
  AND i.name = '3S BMS'
  AND NOT EXISTS (
      SELECT 1 FROM bom_items WHERE bom_id = bh.id AND item_id = i.id
  )
LIMIT 1;

INSERT INTO bom_items (bom_id, item_id, quantity, created_at)
SELECT 
    bh.id,
    i.id,
    1.0,
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.item_id = (SELECT id FROM items WHERE name = 'AMCA Elec Assy' AND type = 'SUB_ASSEMBLY'::item_type LIMIT 1)
  AND i.name = '130x80x60 enclosure box'
  AND NOT EXISTS (
      SELECT 1 FROM bom_items WHERE bom_id = bh.id AND item_id = i.id
  )
LIMIT 1;

INSERT INTO bom_items (bom_id, item_id, quantity, created_at)
SELECT 
    bh.id,
    i.id,
    6.0,
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.item_id = (SELECT id FROM items WHERE name = 'AMCA Elec Assy' AND type = 'SUB_ASSEMBLY'::item_type LIMIT 1)
  AND i.name = '2mm male bullet connector'
  AND NOT EXISTS (
      SELECT 1 FROM bom_items WHERE bom_id = bh.id AND item_id = i.id
  )
LIMIT 1;

INSERT INTO bom_items (bom_id, item_id, quantity, created_at)
SELECT 
    bh.id,
    i.id,
    6.0,
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.item_id = (SELECT id FROM items WHERE name = 'AMCA Elec Assy' AND type = 'SUB_ASSEMBLY'::item_type LIMIT 1)
  AND i.name = '2mm Female Bullet connector'
  AND NOT EXISTS (
      SELECT 1 FROM bom_items WHERE bom_id = bh.id AND item_id = i.id
  )
LIMIT 1;

INSERT INTO bom_items (bom_id, item_id, quantity, created_at)
SELECT 
    bh.id,
    i.id,
    0.12,
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.item_id = (SELECT id FROM items WHERE name = 'AMCA Elec Assy' AND type = 'SUB_ASSEMBLY'::item_type LIMIT 1)
  AND i.name = 'HeatShrink Tube 3:1'
  AND NOT EXISTS (
      SELECT 1 FROM bom_items WHERE bom_id = bh.id AND item_id = i.id
  )
LIMIT 1;

INSERT INTO bom_items (bom_id, item_id, quantity, created_at)
SELECT 
    bh.id,
    i.id,
    10.0,
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.item_id = (SELECT id FROM items WHERE name = 'AMCA Elec Assy' AND type = 'SUB_ASSEMBLY'::item_type LIMIT 1)
  AND i.name = 'Teroson MS930'
  AND NOT EXISTS (
      SELECT 1 FROM bom_items WHERE bom_id = bh.id AND item_id = i.id
  )
LIMIT 1;

-- BOM for AMCA Mech Assy
INSERT INTO bom_headers (tenant_id, item_id, version, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    id, 
    1, 
    true, 
    NOW(), 
    NOW()
FROM items 
WHERE name = 'AMCA Mech Assy' AND type IN ('SUB_ASSEMBLY'::item_type, 'FINISHED_GOODS'::item_type)
  AND NOT EXISTS (
      SELECT 1 FROM bom_headers bh2 
      WHERE bh2.item_id = items.id
  )
LIMIT 1;

INSERT INTO bom_items (bom_id, item_id, quantity, created_at)
SELECT 
    bh.id,
    i.id,
    1.0,
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.item_id = (SELECT id FROM items WHERE name = 'AMCA Mech Assy' AND type = 'SUB_ASSEMBLY'::item_type LIMIT 1)
  AND i.name = 'JCB Body cum mounting frame'
  AND NOT EXISTS (
      SELECT 1 FROM bom_items WHERE bom_id = bh.id AND item_id = i.id
  )
LIMIT 1;

INSERT INTO bom_items (bom_id, item_id, quantity, created_at)
SELECT 
    bh.id,
    i.id,
    2.0,
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.item_id = (SELECT id FROM items WHERE name = 'AMCA Mech Assy' AND type = 'SUB_ASSEMBLY'::item_type LIMIT 1)
  AND i.name = 'flow sensor Clamp'
  AND NOT EXISTS (
      SELECT 1 FROM bom_items WHERE bom_id = bh.id AND item_id = i.id
  )
LIMIT 1;

INSERT INTO bom_items (bom_id, item_id, quantity, created_at)
SELECT 
    bh.id,
    i.id,
    1.0,
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.item_id = (SELECT id FROM items WHERE name = 'AMCA Mech Assy' AND type = 'SUB_ASSEMBLY'::item_type LIMIT 1)
  AND i.name = 'Water tank with clamp'
  AND NOT EXISTS (
      SELECT 1 FROM bom_items WHERE bom_id = bh.id AND item_id = i.id
  )
LIMIT 1;

INSERT INTO bom_items (bom_id, item_id, quantity, created_at)
SELECT 
    bh.id,
    i.id,
    10.0,
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.item_id = (SELECT id FROM items WHERE name = 'AMCA Mech Assy' AND type = 'SUB_ASSEMBLY'::item_type LIMIT 1)
  AND i.name = 'M5x10 Allen / M5x12'
  AND NOT EXISTS (
      SELECT 1 FROM bom_items WHERE bom_id = bh.id AND item_id = i.id
  )
LIMIT 1;

INSERT INTO bom_items (bom_id, item_id, quantity, created_at)
SELECT 
    bh.id,
    i.id,
    4.0,
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.item_id = (SELECT id FROM items WHERE name = 'AMCA Mech Assy' AND type = 'SUB_ASSEMBLY'::item_type LIMIT 1)
  AND i.name = 'M4x12 Allen Head'
  AND NOT EXISTS (
      SELECT 1 FROM bom_items WHERE bom_id = bh.id AND item_id = i.id
  )
LIMIT 1;

INSERT INTO bom_items (bom_id, item_id, quantity, created_at)
SELECT 
    bh.id,
    i.id,
    6.0,
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.item_id = (SELECT id FROM items WHERE name = 'AMCA Mech Assy' AND type = 'SUB_ASSEMBLY'::item_type LIMIT 1)
  AND i.name = 'M4x16 Allen Head'
  AND NOT EXISTS (
      SELECT 1 FROM bom_items WHERE bom_id = bh.id AND item_id = i.id
  )
LIMIT 1;

INSERT INTO bom_items (bom_id, item_id, quantity, created_at)
SELECT 
    bh.id,
    i.id,
    10.0,
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.item_id = (SELECT id FROM items WHERE name = 'AMCA Mech Assy' AND type = 'SUB_ASSEMBLY'::item_type LIMIT 1)
  AND i.name = 'M4 Nyloc'
  AND NOT EXISTS (
      SELECT 1 FROM bom_items WHERE bom_id = bh.id AND item_id = i.id
  )
LIMIT 1;

INSERT INTO bom_items (bom_id, item_id, quantity, created_at)
SELECT 
    bh.id,
    i.id,
    10.0,
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.item_id = (SELECT id FROM items WHERE name = 'AMCA Mech Assy' AND type = 'SUB_ASSEMBLY'::item_type LIMIT 1)
  AND i.name = 'M4 Spring washer'
  AND NOT EXISTS (
      SELECT 1 FROM bom_items WHERE bom_id = bh.id AND item_id = i.id
  )
LIMIT 1;

INSERT INTO bom_items (bom_id, item_id, quantity, created_at)
SELECT 
    bh.id,
    i.id,
    14.0,
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.item_id = (SELECT id FROM items WHERE name = 'AMCA Mech Assy' AND type = 'SUB_ASSEMBLY'::item_type LIMIT 1)
  AND i.name = 'M4x12 plain washer'
  AND NOT EXISTS (
      SELECT 1 FROM bom_items WHERE bom_id = bh.id AND item_id = i.id
  )
LIMIT 1;

INSERT INTO bom_items (bom_id, item_id, quantity, created_at)
SELECT 
    bh.id,
    i.id,
    1.0,
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.item_id = (SELECT id FROM items WHERE name = 'AMCA Mech Assy' AND type = 'SUB_ASSEMBLY'::item_type LIMIT 1)
  AND i.name = 'Brass nozzle for water outlet from JCB'
  AND NOT EXISTS (
      SELECT 1 FROM bom_items WHERE bom_id = bh.id AND item_id = i.id
  )
LIMIT 1;

INSERT INTO bom_items (bom_id, item_id, quantity, created_at)
SELECT 
    bh.id,
    i.id,
    0.5,
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.item_id = (SELECT id FROM items WHERE name = 'AMCA Mech Assy' AND type = 'SUB_ASSEMBLY'::item_type LIMIT 1)
  AND i.name = '8 mm OD pneaumatic pipe'
  AND NOT EXISTS (
      SELECT 1 FROM bom_items WHERE bom_id = bh.id AND item_id = i.id
  )
LIMIT 1;

INSERT INTO bom_items (bom_id, item_id, quantity, created_at)
SELECT 
    bh.id,
    i.id,
    2.0,
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.item_id = (SELECT id FROM items WHERE name = 'AMCA Mech Assy' AND type = 'SUB_ASSEMBLY'::item_type LIMIT 1)
  AND i.name = '12 to 8 reducer with lock clips'
  AND NOT EXISTS (
      SELECT 1 FROM bom_items WHERE bom_id = bh.id AND item_id = i.id
  )
LIMIT 1;

INSERT INTO bom_items (bom_id, item_id, quantity, created_at)
SELECT 
    bh.id,
    i.id,
    0.1,
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.item_id = (SELECT id FROM items WHERE name = 'AMCA Mech Assy' AND type = 'SUB_ASSEMBLY'::item_type LIMIT 1)
  AND i.name = '12mm OD pneumatic pipe'
  AND NOT EXISTS (
      SELECT 1 FROM bom_items WHERE bom_id = bh.id AND item_id = i.id
  )
LIMIT 1;

INSERT INTO bom_items (bom_id, item_id, quantity, created_at)
SELECT 
    bh.id,
    i.id,
    1.0,
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.item_id = (SELECT id FROM items WHERE name = 'AMCA Mech Assy' AND type = 'SUB_ASSEMBLY'::item_type LIMIT 1)
  AND i.name = 'Silicon Hose 3mm x 6mm'
  AND NOT EXISTS (
      SELECT 1 FROM bom_items WHERE bom_id = bh.id AND item_id = i.id
  )
LIMIT 1;

-- BOM for Final Craft Assy
INSERT INTO bom_headers (tenant_id, item_id, version, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    id, 
    1, 
    true, 
    NOW(), 
    NOW()
FROM items 
WHERE name = 'Final Craft Assy' AND type IN ('SUB_ASSEMBLY'::item_type, 'FINISHED_GOODS'::item_type)
  AND NOT EXISTS (
      SELECT 1 FROM bom_headers bh2 
      WHERE bh2.item_id = items.id
  )
LIMIT 1;

INSERT INTO bom_items (bom_id, item_id, quantity, created_at)
SELECT 
    bh.id,
    i.id,
    14.0,
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.item_id = (SELECT id FROM items WHERE name = 'Final Craft Assy' AND type = 'SUB_ASSEMBLY'::item_type LIMIT 1)
  AND i.name = 'M4x20 Allen Head'
  AND NOT EXISTS (
      SELECT 1 FROM bom_items WHERE bom_id = bh.id AND item_id = i.id
  )
LIMIT 1;

INSERT INTO bom_items (bom_id, item_id, quantity, created_at)
SELECT 
    bh.id,
    i.id,
    28.0,
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.item_id = (SELECT id FROM items WHERE name = 'Final Craft Assy' AND type = 'SUB_ASSEMBLY'::item_type LIMIT 1)
  AND i.name = 'M5x10 Torx'
  AND NOT EXISTS (
      SELECT 1 FROM bom_items WHERE bom_id = bh.id AND item_id = i.id
  )
LIMIT 1;

INSERT INTO bom_items (bom_id, item_id, quantity, created_at)
SELECT 
    bh.id,
    i.id,
    50.0,
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.item_id = (SELECT id FROM items WHERE name = 'Final Craft Assy' AND type = 'SUB_ASSEMBLY'::item_type LIMIT 1)
  AND i.name = 'Teroson MS930'
  AND NOT EXISTS (
      SELECT 1 FROM bom_items WHERE bom_id = bh.id AND item_id = i.id
  )
LIMIT 1;

INSERT INTO bom_items (bom_id, item_id, quantity, created_at)
SELECT 
    bh.id,
    i.id,
    4.5,
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.item_id = (SELECT id FROM items WHERE name = 'Final Craft Assy' AND type = 'SUB_ASSEMBLY'::item_type LIMIT 1)
  AND i.name = 'Rope 8mm'
  AND NOT EXISTS (
      SELECT 1 FROM bom_items WHERE bom_id = bh.id AND item_id = i.id
  )
LIMIT 1;

INSERT INTO bom_items (bom_id, item_id, quantity, created_at)
SELECT 
    bh.id,
    i.id,
    1.0,
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.item_id = (SELECT id FROM items WHERE name = 'Final Craft Assy' AND type = 'SUB_ASSEMBLY'::item_type LIMIT 1)
  AND i.name = 'Ferrole'
  AND NOT EXISTS (
      SELECT 1 FROM bom_items WHERE bom_id = bh.id AND item_id = i.id
  )
LIMIT 1;

INSERT INTO bom_items (bom_id, item_id, quantity, created_at)
SELECT 
    bh.id,
    i.id,
    1.0,
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.item_id = (SELECT id FROM items WHERE name = 'Final Craft Assy' AND type = 'SUB_ASSEMBLY'::item_type LIMIT 1)
  AND i.name = 'Hook Sticker STBD'
  AND NOT EXISTS (
      SELECT 1 FROM bom_items WHERE bom_id = bh.id AND item_id = i.id
  )
LIMIT 1;

INSERT INTO bom_items (bom_id, item_id, quantity, created_at)
SELECT 
    bh.id,
    i.id,
    1.0,
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.item_id = (SELECT id FROM items WHERE name = 'Final Craft Assy' AND type = 'SUB_ASSEMBLY'::item_type LIMIT 1)
  AND i.name = 'Hook Stiker PORT'
  AND NOT EXISTS (
      SELECT 1 FROM bom_items WHERE bom_id = bh.id AND item_id = i.id
  )
LIMIT 1;

INSERT INTO bom_items (bom_id, item_id, quantity, created_at)
SELECT 
    bh.id,
    i.id,
    1.0,
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.item_id = (SELECT id FROM items WHERE name = 'Final Craft Assy' AND type = 'SUB_ASSEMBLY'::item_type LIMIT 1)
  AND i.name = 'Hold here sticker STBD'
  AND NOT EXISTS (
      SELECT 1 FROM bom_items WHERE bom_id = bh.id AND item_id = i.id
  )
LIMIT 1;

INSERT INTO bom_items (bom_id, item_id, quantity, created_at)
SELECT 
    bh.id,
    i.id,
    1.0,
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.item_id = (SELECT id FROM items WHERE name = 'Final Craft Assy' AND type = 'SUB_ASSEMBLY'::item_type LIMIT 1)
  AND i.name = 'Hold here sticker PORT'
  AND NOT EXISTS (
      SELECT 1 FROM bom_items WHERE bom_id = bh.id AND item_id = i.id
  )
LIMIT 1;

INSERT INTO bom_items (bom_id, item_id, quantity, created_at)
SELECT 
    bh.id,
    i.id,
    8.0,
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.item_id = (SELECT id FROM items WHERE name = 'Final Craft Assy' AND type = 'SUB_ASSEMBLY'::item_type LIMIT 1)
  AND i.name = 'M4x12 plain washer'
  AND NOT EXISTS (
      SELECT 1 FROM bom_items WHERE bom_id = bh.id AND item_id = i.id
  )
LIMIT 1;

INSERT INTO bom_items (bom_id, item_id, quantity, created_at)
SELECT 
    bh.id,
    i.id,
    1.0,
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.item_id = (SELECT id FROM items WHERE name = 'Final Craft Assy' AND type = 'SUB_ASSEMBLY'::item_type LIMIT 1)
  AND i.name = '915MHz Antenna'
  AND NOT EXISTS (
      SELECT 1 FROM bom_items WHERE bom_id = bh.id AND item_id = i.id
  )
LIMIT 1;

INSERT INTO bom_items (bom_id, item_id, quantity, created_at)
SELECT 
    bh.id,
    i.id,
    6.0,
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.item_id = (SELECT id FROM items WHERE name = 'Final Craft Assy' AND type = 'SUB_ASSEMBLY'::item_type LIMIT 1)
  AND i.name = 'M4x20 plain washer'
  AND NOT EXISTS (
      SELECT 1 FROM bom_items WHERE bom_id = bh.id AND item_id = i.id
  )
LIMIT 1;

INSERT INTO bom_items (bom_id, item_id, quantity, created_at)
SELECT 
    bh.id,
    i.id,
    4.0,
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.item_id = (SELECT id FROM items WHERE name = 'Final Craft Assy' AND type = 'SUB_ASSEMBLY'::item_type LIMIT 1)
  AND i.name = 'M4x12 Button head'
  AND NOT EXISTS (
      SELECT 1 FROM bom_items WHERE bom_id = bh.id AND item_id = i.id
  )
LIMIT 1;

INSERT INTO bom_items (bom_id, item_id, quantity, created_at)
SELECT 
    bh.id,
    i.id,
    1.0,
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.item_id = (SELECT id FROM items WHERE name = 'Final Craft Assy' AND type = 'SUB_ASSEMBLY'::item_type LIMIT 1)
  AND i.name = '8kg Hull'
  AND NOT EXISTS (
      SELECT 1 FROM bom_items WHERE bom_id = bh.id AND item_id = i.id
  )
LIMIT 1;

-- BOM for Bottom Block Assy
INSERT INTO bom_headers (tenant_id, item_id, version, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    id, 
    1, 
    true, 
    NOW(), 
    NOW()
FROM items 
WHERE name = 'Bottom Block Assy' AND type IN ('SUB_ASSEMBLY'::item_type, 'FINISHED_GOODS'::item_type)
  AND NOT EXISTS (
      SELECT 1 FROM bom_headers bh2 
      WHERE bh2.item_id = items.id
  )
LIMIT 1;

INSERT INTO bom_items (bom_id, item_id, quantity, created_at)
SELECT 
    bh.id,
    i.id,
    2.0,
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.item_id = (SELECT id FROM items WHERE name = 'Bottom Block Assy' AND type = 'SUB_ASSEMBLY'::item_type LIMIT 1)
  AND i.name = 'IM Bottom Block'
  AND NOT EXISTS (
      SELECT 1 FROM bom_items WHERE bom_id = bh.id AND item_id = i.id
  )
LIMIT 1;

INSERT INTO bom_items (bom_id, item_id, quantity, created_at)
SELECT 
    bh.id,
    i.id,
    2.0,
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.item_id = (SELECT id FROM items WHERE name = 'Bottom Block Assy' AND type = 'SUB_ASSEMBLY'::item_type LIMIT 1)
  AND i.name = 'Bottom Mesh (120mm x 100mm, 5"x4")'
  AND NOT EXISTS (
      SELECT 1 FROM bom_items WHERE bom_id = bh.id AND item_id = i.id
  )
LIMIT 1;

INSERT INTO bom_items (bom_id, item_id, quantity, created_at)
SELECT 
    bh.id,
    i.id,
    8.0,
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.item_id = (SELECT id FROM items WHERE name = 'Bottom Block Assy' AND type = 'SUB_ASSEMBLY'::item_type LIMIT 1)
  AND i.name = 'M4x12 Pan Combi Screws'
  AND NOT EXISTS (
      SELECT 1 FROM bom_items WHERE bom_id = bh.id AND item_id = i.id
  )
LIMIT 1;

INSERT INTO bom_items (bom_id, item_id, quantity, created_at)
SELECT 
    bh.id,
    i.id,
    14.0,
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.item_id = (SELECT id FROM items WHERE name = 'Bottom Block Assy' AND type = 'SUB_ASSEMBLY'::item_type LIMIT 1)
  AND i.name = 'M3x8 CSK Phillips'
  AND NOT EXISTS (
      SELECT 1 FROM bom_items WHERE bom_id = bh.id AND item_id = i.id
  )
LIMIT 1;

INSERT INTO bom_items (bom_id, item_id, quantity, created_at)
SELECT 
    bh.id,
    i.id,
    2.5,
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.item_id = (SELECT id FROM items WHERE name = 'Bottom Block Assy' AND type = 'SUB_ASSEMBLY'::item_type LIMIT 1)
  AND i.name = 'M3x8 plain wahser'
  AND NOT EXISTS (
      SELECT 1 FROM bom_items WHERE bom_id = bh.id AND item_id = i.id
  )
LIMIT 1;

-- BOM for STBD Aft Plate Assy
INSERT INTO bom_headers (tenant_id, item_id, version, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    id, 
    1, 
    true, 
    NOW(), 
    NOW()
FROM items 
WHERE name = 'STBD Aft Plate Assy' AND type IN ('SUB_ASSEMBLY'::item_type, 'FINISHED_GOODS'::item_type)
  AND NOT EXISTS (
      SELECT 1 FROM bom_headers bh2 
      WHERE bh2.item_id = items.id
  )
LIMIT 1;

INSERT INTO bom_items (bom_id, item_id, quantity, created_at)
SELECT 
    bh.id,
    i.id,
    1.0,
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.item_id = (SELECT id FROM items WHERE name = 'STBD Aft Plate Assy' AND type = 'SUB_ASSEMBLY'::item_type LIMIT 1)
  AND i.name = 'STBD Aft Plate'
  AND NOT EXISTS (
      SELECT 1 FROM bom_items WHERE bom_id = bh.id AND item_id = i.id
  )
LIMIT 1;

INSERT INTO bom_items (bom_id, item_id, quantity, created_at)
SELECT 
    bh.id,
    i.id,
    1.0,
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.item_id = (SELECT id FROM items WHERE name = 'STBD Aft Plate Assy' AND type = 'SUB_ASSEMBLY'::item_type LIMIT 1)
  AND i.name = 'SS Cooling Water Inlet nozzle'
  AND NOT EXISTS (
      SELECT 1 FROM bom_items WHERE bom_id = bh.id AND item_id = i.id
  )
LIMIT 1;

INSERT INTO bom_items (bom_id, item_id, quantity, created_at)
SELECT 
    bh.id,
    i.id,
    1.0,
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.item_id = (SELECT id FROM items WHERE name = 'STBD Aft Plate Assy' AND type = 'SUB_ASSEMBLY'::item_type LIMIT 1)
  AND i.name = 'SS Cooling Water Outlet nozzle'
  AND NOT EXISTS (
      SELECT 1 FROM bom_items WHERE bom_id = bh.id AND item_id = i.id
  )
LIMIT 1;

INSERT INTO bom_items (bom_id, item_id, quantity, created_at)
SELECT 
    bh.id,
    i.id,
    1.0,
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.item_id = (SELECT id FROM items WHERE name = 'STBD Aft Plate Assy' AND type = 'SUB_ASSEMBLY'::item_type LIMIT 1)
  AND i.name = 'Greasing nozzle'
  AND NOT EXISTS (
      SELECT 1 FROM bom_items WHERE bom_id = bh.id AND item_id = i.id
  )
LIMIT 1;

INSERT INTO bom_items (bom_id, item_id, quantity, created_at)
SELECT 
    bh.id,
    i.id,
    3.0,
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.item_id = (SELECT id FROM items WHERE name = 'STBD Aft Plate Assy' AND type = 'SUB_ASSEMBLY'::item_type LIMIT 1)
  AND i.name = 'M8 Slim Locknut'
  AND NOT EXISTS (
      SELECT 1 FROM bom_items WHERE bom_id = bh.id AND item_id = i.id
  )
LIMIT 1;

-- BOM for PORT Aft Plate Assy
INSERT INTO bom_headers (tenant_id, item_id, version, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    id, 
    1, 
    true, 
    NOW(), 
    NOW()
FROM items 
WHERE name = 'PORT Aft Plate Assy' AND type IN ('SUB_ASSEMBLY'::item_type, 'FINISHED_GOODS'::item_type)
  AND NOT EXISTS (
      SELECT 1 FROM bom_headers bh2 
      WHERE bh2.item_id = items.id
  )
LIMIT 1;

INSERT INTO bom_items (bom_id, item_id, quantity, created_at)
SELECT 
    bh.id,
    i.id,
    1.0,
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.item_id = (SELECT id FROM items WHERE name = 'PORT Aft Plate Assy' AND type = 'SUB_ASSEMBLY'::item_type LIMIT 1)
  AND i.name = 'PORT Aft Plate'
  AND NOT EXISTS (
      SELECT 1 FROM bom_items WHERE bom_id = bh.id AND item_id = i.id
  )
LIMIT 1;

INSERT INTO bom_items (bom_id, item_id, quantity, created_at)
SELECT 
    bh.id,
    i.id,
    1.0,
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.item_id = (SELECT id FROM items WHERE name = 'PORT Aft Plate Assy' AND type = 'SUB_ASSEMBLY'::item_type LIMIT 1)
  AND i.name = 'SS Cooling Water Inlet nozzle'
  AND NOT EXISTS (
      SELECT 1 FROM bom_items WHERE bom_id = bh.id AND item_id = i.id
  )
LIMIT 1;

INSERT INTO bom_items (bom_id, item_id, quantity, created_at)
SELECT 
    bh.id,
    i.id,
    1.0,
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.item_id = (SELECT id FROM items WHERE name = 'PORT Aft Plate Assy' AND type = 'SUB_ASSEMBLY'::item_type LIMIT 1)
  AND i.name = 'SS Cooling Water Outlet nozzle'
  AND NOT EXISTS (
      SELECT 1 FROM bom_items WHERE bom_id = bh.id AND item_id = i.id
  )
LIMIT 1;

INSERT INTO bom_items (bom_id, item_id, quantity, created_at)
SELECT 
    bh.id,
    i.id,
    1.0,
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.item_id = (SELECT id FROM items WHERE name = 'PORT Aft Plate Assy' AND type = 'SUB_ASSEMBLY'::item_type LIMIT 1)
  AND i.name = 'Greasing nozzle'
  AND NOT EXISTS (
      SELECT 1 FROM bom_items WHERE bom_id = bh.id AND item_id = i.id
  )
LIMIT 1;

INSERT INTO bom_items (bom_id, item_id, quantity, created_at)
SELECT 
    bh.id,
    i.id,
    1.0,
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.item_id = (SELECT id FROM items WHERE name = 'PORT Aft Plate Assy' AND type = 'SUB_ASSEMBLY'::item_type LIMIT 1)
  AND i.name = 'Air nozzle'
  AND NOT EXISTS (
      SELECT 1 FROM bom_items WHERE bom_id = bh.id AND item_id = i.id
  )
LIMIT 1;

INSERT INTO bom_items (bom_id, item_id, quantity, created_at)
SELECT 
    bh.id,
    i.id,
    3.0,
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.item_id = (SELECT id FROM items WHERE name = 'PORT Aft Plate Assy' AND type = 'SUB_ASSEMBLY'::item_type LIMIT 1)
  AND i.name = 'M8 Slim Locknut'
  AND NOT EXISTS (
      SELECT 1 FROM bom_items WHERE bom_id = bh.id AND item_id = i.id
  )
LIMIT 1;

-- BOM for R9MX Adapter
INSERT INTO bom_headers (tenant_id, item_id, version, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    id, 
    1, 
    true, 
    NOW(), 
    NOW()
FROM items 
WHERE name = 'R9MX Adapter' AND type IN ('SUB_ASSEMBLY'::item_type, 'FINISHED_GOODS'::item_type)
  AND NOT EXISTS (
      SELECT 1 FROM bom_headers bh2 
      WHERE bh2.item_id = items.id
  )
LIMIT 1;

INSERT INTO bom_items (bom_id, item_id, quantity, created_at)
SELECT 
    bh.id,
    i.id,
    1.0,
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.item_id = (SELECT id FROM items WHERE name = 'R9MX Adapter' AND type = 'SUB_ASSEMBLY'::item_type LIMIT 1)
  AND i.name = 'PWB of R9MX adapter'
  AND NOT EXISTS (
      SELECT 1 FROM bom_items WHERE bom_id = bh.id AND item_id = i.id
  )
LIMIT 1;

INSERT INTO bom_items (bom_id, item_id, quantity, created_at)
SELECT 
    bh.id,
    i.id,
    0.25,
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.item_id = (SELECT id FROM items WHERE name = 'R9MX Adapter' AND type = 'SUB_ASSEMBLY'::item_type LIMIT 1)
  AND i.name = 'Female Bergstrip 40x1 2.0mm'
  AND NOT EXISTS (
      SELECT 1 FROM bom_items WHERE bom_id = bh.id AND item_id = i.id
  )
LIMIT 1;

INSERT INTO bom_items (bom_id, item_id, quantity, created_at)
SELECT 
    bh.id,
    i.id,
    0.25,
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.item_id = (SELECT id FROM items WHERE name = 'R9MX Adapter' AND type = 'SUB_ASSEMBLY'::item_type LIMIT 1)
  AND i.name = 'Male Bergstrip 40x1 2.0mm'
  AND NOT EXISTS (
      SELECT 1 FROM bom_items WHERE bom_id = bh.id AND item_id = i.id
  )
LIMIT 1;

INSERT INTO bom_items (bom_id, item_id, quantity, created_at)
SELECT 
    bh.id,
    i.id,
    2.0,
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.item_id = (SELECT id FROM items WHERE name = 'R9MX Adapter' AND type = 'SUB_ASSEMBLY'::item_type LIMIT 1)
  AND i.name = 'Lead wire 22AWG'
  AND NOT EXISTS (
      SELECT 1 FROM bom_items WHERE bom_id = bh.id AND item_id = i.id
  )
LIMIT 1;

INSERT INTO bom_items (bom_id, item_id, quantity, created_at)
SELECT 
    bh.id,
    i.id,
    1.0,
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.item_id = (SELECT id FROM items WHERE name = 'R9MX Adapter' AND type = 'SUB_ASSEMBLY'::item_type LIMIT 1)
  AND i.name = 'LM1117 5.0v'
  AND NOT EXISTS (
      SELECT 1 FROM bom_items WHERE bom_id = bh.id AND item_id = i.id
  )
LIMIT 1;

INSERT INTO bom_items (bom_id, item_id, quantity, created_at)
SELECT 
    bh.id,
    i.id,
    1.0,
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.item_id = (SELECT id FROM items WHERE name = 'R9MX Adapter' AND type = 'SUB_ASSEMBLY'::item_type LIMIT 1)
  AND i.name = '10uF 10v Tantalum Capacitor Case A'
  AND NOT EXISTS (
      SELECT 1 FROM bom_items WHERE bom_id = bh.id AND item_id = i.id
  )
LIMIT 1;

-- BOM for Final Packing
INSERT INTO bom_headers (tenant_id, item_id, version, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    id, 
    1, 
    true, 
    NOW(), 
    NOW()
FROM items 
WHERE name = 'Final Packing' AND type IN ('SUB_ASSEMBLY'::item_type, 'FINISHED_GOODS'::item_type)
  AND NOT EXISTS (
      SELECT 1 FROM bom_headers bh2 
      WHERE bh2.item_id = items.id
  )
LIMIT 1;

INSERT INTO bom_items (bom_id, item_id, quantity, created_at)
SELECT 
    bh.id,
    i.id,
    1.0,
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.item_id = (SELECT id FROM items WHERE name = 'Final Packing' AND type = 'SUB_ASSEMBLY'::item_type LIMIT 1)
  AND i.name = '66 No. Box for chraging cable & Tool box'
  AND NOT EXISTS (
      SELECT 1 FROM bom_items WHERE bom_id = bh.id AND item_id = i.id
  )
LIMIT 1;

INSERT INTO bom_items (bom_id, item_id, quantity, created_at)
SELECT 
    bh.id,
    i.id,
    1.0,
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.item_id = (SELECT id FROM items WHERE name = 'Final Packing' AND type = 'SUB_ASSEMBLY'::item_type LIMIT 1)
  AND i.name = '22 No. Box for SR structure screws'
  AND NOT EXISTS (
      SELECT 1 FROM bom_items WHERE bom_id = bh.id AND item_id = i.id
  )
LIMIT 1;

INSERT INTO bom_items (bom_id, item_id, quantity, created_at)
SELECT 
    bh.id,
    i.id,
    1.0,
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.item_id = (SELECT id FROM items WHERE name = 'Final Packing' AND type = 'SUB_ASSEMBLY'::item_type LIMIT 1)
  AND i.name = '10mm Nut Driver with 15mm Depth'
  AND NOT EXISTS (
      SELECT 1 FROM bom_items WHERE bom_id = bh.id AND item_id = i.id
  )
LIMIT 1;

INSERT INTO bom_items (bom_id, item_id, quantity, created_at)
SELECT 
    bh.id,
    i.id,
    1.0,
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.item_id = (SELECT id FROM items WHERE name = 'Final Packing' AND type = 'SUB_ASSEMBLY'::item_type LIMIT 1)
  AND i.name = '4mm T-Handle'
  AND NOT EXISTS (
      SELECT 1 FROM bom_items WHERE bom_id = bh.id AND item_id = i.id
  )
LIMIT 1;

INSERT INTO bom_items (bom_id, item_id, quantity, created_at)
SELECT 
    bh.id,
    i.id,
    1.0,
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.item_id = (SELECT id FROM items WHERE name = 'Final Packing' AND type = 'SUB_ASSEMBLY'::item_type LIMIT 1)
  AND i.name = 'Greasing Pump'
  AND NOT EXISTS (
      SELECT 1 FROM bom_items WHERE bom_id = bh.id AND item_id = i.id
  )
LIMIT 1;

INSERT INTO bom_items (bom_id, item_id, quantity, created_at)
SELECT 
    bh.id,
    i.id,
    180.0,
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.item_id = (SELECT id FROM items WHERE name = 'Final Packing' AND type = 'SUB_ASSEMBLY'::item_type LIMIT 1)
  AND i.name = 'Grease'
  AND NOT EXISTS (
      SELECT 1 FROM bom_items WHERE bom_id = bh.id AND item_id = i.id
  )
LIMIT 1;

INSERT INTO bom_items (bom_id, item_id, quantity, created_at)
SELECT 
    bh.id,
    i.id,
    1.0,
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.item_id = (SELECT id FROM items WHERE name = 'Final Packing' AND type = 'SUB_ASSEMBLY'::item_type LIMIT 1)
  AND i.name = 'EPE sheet 20mm 48"x72"'
  AND NOT EXISTS (
      SELECT 1 FROM bom_items WHERE bom_id = bh.id AND item_id = i.id
  )
LIMIT 1;

INSERT INTO bom_items (bom_id, item_id, quantity, created_at)
SELECT 
    bh.id,
    i.id,
    1.0,
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.item_id = (SELECT id FROM items WHERE name = 'Final Packing' AND type = 'SUB_ASSEMBLY'::item_type LIMIT 1)
  AND i.name = 'HardBox FRP/HDPE/CARTON/EPE'
  AND NOT EXISTS (
      SELECT 1 FROM bom_items WHERE bom_id = bh.id AND item_id = i.id
  )
LIMIT 1;

INSERT INTO bom_items (bom_id, item_id, quantity, created_at)
SELECT 
    bh.id,
    i.id,
    1.0,
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.item_id = (SELECT id FROM items WHERE name = 'Final Packing' AND type = 'SUB_ASSEMBLY'::item_type LIMIT 1)
  AND i.name = 'User Manual'
  AND NOT EXISTS (
      SELECT 1 FROM bom_items WHERE bom_id = bh.id AND item_id = i.id
  )
LIMIT 1;

INSERT INTO bom_items (bom_id, item_id, quantity, created_at)
SELECT 
    bh.id,
    i.id,
    1.0,
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.item_id = (SELECT id FROM items WHERE name = 'Final Packing' AND type = 'SUB_ASSEMBLY'::item_type LIMIT 1)
  AND i.name = 'Envelope for User Manual'
  AND NOT EXISTS (
      SELECT 1 FROM bom_items WHERE bom_id = bh.id AND item_id = i.id
  )
LIMIT 1;

INSERT INTO bom_items (bom_id, item_id, quantity, created_at)
SELECT 
    bh.id,
    i.id,
    1.0,
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.item_id = (SELECT id FROM items WHERE name = 'Final Packing' AND type = 'SUB_ASSEMBLY'::item_type LIMIT 1)
  AND i.name = '2.5mm T handle'
  AND NOT EXISTS (
      SELECT 1 FROM bom_items WHERE bom_id = bh.id AND item_id = i.id
  )
LIMIT 1;

INSERT INTO bom_items (bom_id, item_id, quantity, created_at)
SELECT 
    bh.id,
    i.id,
    2.0,
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.item_id = (SELECT id FROM items WHERE name = 'Final Packing' AND type = 'SUB_ASSEMBLY'::item_type LIMIT 1)
  AND i.name = 'Oring AFT plate'
  AND NOT EXISTS (
      SELECT 1 FROM bom_items WHERE bom_id = bh.id AND item_id = i.id
  )
LIMIT 1;

-- BOM for Power Switch Assy
INSERT INTO bom_headers (tenant_id, item_id, version, is_active, created_at, updated_at)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    id, 
    1, 
    true, 
    NOW(), 
    NOW()
FROM items 
WHERE name = 'Power Switch Assy' AND type IN ('SUB_ASSEMBLY'::item_type, 'FINISHED_GOODS'::item_type)
  AND NOT EXISTS (
      SELECT 1 FROM bom_headers bh2 
      WHERE bh2.item_id = items.id
  )
LIMIT 1;

INSERT INTO bom_items (bom_id, item_id, quantity, created_at)
SELECT 
    bh.id,
    i.id,
    1.0,
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.item_id = (SELECT id FROM items WHERE name = 'Power Switch Assy' AND type = 'SUB_ASSEMBLY'::item_type LIMIT 1)
  AND i.name = 'IP68 Rotary main Switch'
  AND NOT EXISTS (
      SELECT 1 FROM bom_items WHERE bom_id = bh.id AND item_id = i.id
  )
LIMIT 1;

INSERT INTO bom_items (bom_id, item_id, quantity, created_at)
SELECT 
    bh.id,
    i.id,
    2.0,
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.item_id = (SELECT id FROM items WHERE name = 'Power Switch Assy' AND type = 'SUB_ASSEMBLY'::item_type LIMIT 1)
  AND i.name = '10cm one sided JST crimped White'
  AND NOT EXISTS (
      SELECT 1 FROM bom_items WHERE bom_id = bh.id AND item_id = i.id
  )
LIMIT 1;

INSERT INTO bom_items (bom_id, item_id, quantity, created_at)
SELECT 
    bh.id,
    i.id,
    1.0,
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.item_id = (SELECT id FROM items WHERE name = 'Power Switch Assy' AND type = 'SUB_ASSEMBLY'::item_type LIMIT 1)
  AND i.name = '2 pin JST-XH housing'
  AND NOT EXISTS (
      SELECT 1 FROM bom_items WHERE bom_id = bh.id AND item_id = i.id
  )
LIMIT 1;



-- ============================================================================
-- INSERT INITIAL STOCK FOR RAW MATERIALS
-- ============================================================================

-- Stock for QX7 Transmitter with R9M
INSERT INTO stock_entries (
    tenant_id,
    item_id, 
    warehouse_id,
    quantity, 
    available_quantity,
    allocated_quantity,
    created_at,
    updated_at
)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    i.id,
    (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1),
    11.0,
    11.0,
    0,
    NOW(),
    NOW()
FROM items i
WHERE i.code = 'QX7-TRANSMITTER-WITH'
  AND NOT EXISTS (
      SELECT 1 FROM stock_entries se
      WHERE se.item_id = i.id 
        AND se.warehouse_id = (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1)
  )
LIMIT 1;

-- Stock for Receiver Module R9MM/R9MX/R9
INSERT INTO stock_entries (
    tenant_id,
    item_id, 
    warehouse_id,
    quantity, 
    available_quantity,
    allocated_quantity,
    created_at,
    updated_at
)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    i.id,
    (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1),
    16.0,
    16.0,
    0,
    NOW(),
    NOW()
FROM items i
WHERE i.code = 'RECEIVER-MODULE-R9MMR9MXR9'
  AND NOT EXISTS (
      SELECT 1 FROM stock_entries se
      WHERE se.item_id = i.id 
        AND se.warehouse_id = (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1)
  )
LIMIT 1;

-- Stock for Free Wheel Diode SMD M7
INSERT INTO stock_entries (
    tenant_id,
    item_id, 
    warehouse_id,
    quantity, 
    available_quantity,
    allocated_quantity,
    created_at,
    updated_at
)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    i.id,
    (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1),
    2000.0,
    2000.0,
    0,
    NOW(),
    NOW()
FROM items i
WHERE i.code = 'FREE-WHEEL-DIODE'
  AND NOT EXISTS (
      SELECT 1 FROM stock_entries se
      WHERE se.item_id = i.id 
        AND se.warehouse_id = (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1)
  )
LIMIT 1;

-- Stock for AMS1117 5.0v
INSERT INTO stock_entries (
    tenant_id,
    item_id, 
    warehouse_id,
    quantity, 
    available_quantity,
    allocated_quantity,
    created_at,
    updated_at
)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    i.id,
    (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1),
    482.0,
    482.0,
    0,
    NOW(),
    NOW()
FROM items i
WHERE i.code = 'AMS1117-50V'
  AND NOT EXISTS (
      SELECT 1 FROM stock_entries se
      WHERE se.item_id = i.id 
        AND se.warehouse_id = (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1)
  )
LIMIT 1;

-- Stock for AMS1117 3.3v
INSERT INTO stock_entries (
    tenant_id,
    item_id, 
    warehouse_id,
    quantity, 
    available_quantity,
    allocated_quantity,
    created_at,
    updated_at
)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    i.id,
    (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1),
    135.0,
    135.0,
    0,
    NOW(),
    NOW()
FROM items i
WHERE i.code = 'AMS1117-33V'
  AND NOT EXISTS (
      SELECT 1 FROM stock_entries se
      WHERE se.item_id = i.id 
        AND se.warehouse_id = (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1)
  )
LIMIT 1;

-- Stock for NEO-6M GPS/L80 GPS
INSERT INTO stock_entries (
    tenant_id,
    item_id, 
    warehouse_id,
    quantity, 
    available_quantity,
    allocated_quantity,
    created_at,
    updated_at
)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    i.id,
    (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1),
    5.0,
    5.0,
    0,
    NOW(),
    NOW()
FROM items i
WHERE i.code = 'NEO6M-GPSL80-GPS'
  AND NOT EXISTS (
      SELECT 1 FROM stock_entries se
      WHERE se.item_id = i.id 
        AND se.warehouse_id = (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1)
  )
LIMIT 1;

-- Stock for LC86G GPS
INSERT INTO stock_entries (
    tenant_id,
    item_id, 
    warehouse_id,
    quantity, 
    available_quantity,
    allocated_quantity,
    created_at,
    updated_at
)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    i.id,
    (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1),
    20.0,
    20.0,
    0,
    NOW(),
    NOW()
FROM items i
WHERE i.code = 'LC86G-GPS'
  AND NOT EXISTS (
      SELECT 1 FROM stock_entries se
      WHERE se.item_id = i.id 
        AND se.warehouse_id = (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1)
  )
LIMIT 1;

-- Stock for 5.5mm Female Bullet connector
INSERT INTO stock_entries (
    tenant_id,
    item_id, 
    warehouse_id,
    quantity, 
    available_quantity,
    allocated_quantity,
    created_at,
    updated_at
)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    i.id,
    (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1),
    33.0,
    33.0,
    0,
    NOW(),
    NOW()
FROM items i
WHERE i.code = '55MM-FEMALE-BULLET'
  AND NOT EXISTS (
      SELECT 1 FROM stock_entries se
      WHERE se.item_id = i.id 
        AND se.warehouse_id = (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1)
  )
LIMIT 1;

-- Stock for 4mm Male Bullet connector
INSERT INTO stock_entries (
    tenant_id,
    item_id, 
    warehouse_id,
    quantity, 
    available_quantity,
    allocated_quantity,
    created_at,
    updated_at
)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    i.id,
    (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1),
    735.0,
    735.0,
    0,
    NOW(),
    NOW()
FROM items i
WHERE i.code = '4MM-MALE-BULLET'
  AND NOT EXISTS (
      SELECT 1 FROM stock_entries se
      WHERE se.item_id = i.id 
        AND se.warehouse_id = (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1)
  )
LIMIT 1;

-- Stock for 4mm Female Bullet connector
INSERT INTO stock_entries (
    tenant_id,
    item_id, 
    warehouse_id,
    quantity, 
    available_quantity,
    allocated_quantity,
    created_at,
    updated_at
)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    i.id,
    (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1),
    687.0,
    687.0,
    0,
    NOW(),
    NOW()
FROM items i
WHERE i.code = '4MM-FEMALE-BULLET'
  AND NOT EXISTS (
      SELECT 1 FROM stock_entries se
      WHERE se.item_id = i.id 
        AND se.warehouse_id = (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1)
  )
LIMIT 1;

-- Stock for 2mm male bullet connector
INSERT INTO stock_entries (
    tenant_id,
    item_id, 
    warehouse_id,
    quantity, 
    available_quantity,
    allocated_quantity,
    created_at,
    updated_at
)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    i.id,
    (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1),
    440.0,
    440.0,
    0,
    NOW(),
    NOW()
FROM items i
WHERE i.code = '2MM-MALE-BULLET'
  AND NOT EXISTS (
      SELECT 1 FROM stock_entries se
      WHERE se.item_id = i.id 
        AND se.warehouse_id = (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1)
  )
LIMIT 1;

-- Stock for 2mm Female Bullet connector
INSERT INTO stock_entries (
    tenant_id,
    item_id, 
    warehouse_id,
    quantity, 
    available_quantity,
    allocated_quantity,
    created_at,
    updated_at
)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    i.id,
    (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1),
    537.0,
    537.0,
    0,
    NOW(),
    NOW()
FROM items i
WHERE i.code = '2MM-FEMALE-BULLET'
  AND NOT EXISTS (
      SELECT 1 FROM stock_entries se
      WHERE se.item_id = i.id 
        AND se.warehouse_id = (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1)
  )
LIMIT 1;

-- Stock for 6mm male bullet connector
INSERT INTO stock_entries (
    tenant_id,
    item_id, 
    warehouse_id,
    quantity, 
    available_quantity,
    allocated_quantity,
    created_at,
    updated_at
)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    i.id,
    (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1),
    151.0,
    151.0,
    0,
    NOW(),
    NOW()
FROM items i
WHERE i.code = '6MM-MALE-BULLET'
  AND NOT EXISTS (
      SELECT 1 FROM stock_entries se
      WHERE se.item_id = i.id 
        AND se.warehouse_id = (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1)
  )
LIMIT 1;

-- Stock for 6mm female bullet connector
INSERT INTO stock_entries (
    tenant_id,
    item_id, 
    warehouse_id,
    quantity, 
    available_quantity,
    allocated_quantity,
    created_at,
    updated_at
)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    i.id,
    (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1),
    152.0,
    152.0,
    0,
    NOW(),
    NOW()
FROM items i
WHERE i.code = '6MM-FEMALE-BULLET'
  AND NOT EXISTS (
      SELECT 1 FROM stock_entries se
      WHERE se.item_id = i.id 
        AND se.warehouse_id = (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1)
  )
LIMIT 1;

-- Stock for 8mm male bullet connector
INSERT INTO stock_entries (
    tenant_id,
    item_id, 
    warehouse_id,
    quantity, 
    available_quantity,
    allocated_quantity,
    created_at,
    updated_at
)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    i.id,
    (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1),
    153.0,
    153.0,
    0,
    NOW(),
    NOW()
FROM items i
WHERE i.code = '8MM-MALE-BULLET'
  AND NOT EXISTS (
      SELECT 1 FROM stock_entries se
      WHERE se.item_id = i.id 
        AND se.warehouse_id = (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1)
  )
LIMIT 1;

-- Stock for 8mm female bullet connector
INSERT INTO stock_entries (
    tenant_id,
    item_id, 
    warehouse_id,
    quantity, 
    available_quantity,
    allocated_quantity,
    created_at,
    updated_at
)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    i.id,
    (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1),
    237.0,
    237.0,
    0,
    NOW(),
    NOW()
FROM items i
WHERE i.code = '8MM-FEMALE-BULLET'
  AND NOT EXISTS (
      SELECT 1 FROM stock_entries se
      WHERE se.item_id = i.id 
        AND se.warehouse_id = (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1)
  )
LIMIT 1;

-- Stock for Ultra Flexible Black 8AWG
INSERT INTO stock_entries (
    tenant_id,
    item_id, 
    warehouse_id,
    quantity, 
    available_quantity,
    allocated_quantity,
    created_at,
    updated_at
)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    i.id,
    (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1),
    58.4,
    58.4,
    0,
    NOW(),
    NOW()
FROM items i
WHERE i.code = 'ULTRA-FLEXIBLE-BLACK'
  AND NOT EXISTS (
      SELECT 1 FROM stock_entries se
      WHERE se.item_id = i.id 
        AND se.warehouse_id = (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1)
  )
LIMIT 1;

-- Stock for Ultra Flexible  Red 8AWG
INSERT INTO stock_entries (
    tenant_id,
    item_id, 
    warehouse_id,
    quantity, 
    available_quantity,
    allocated_quantity,
    created_at,
    updated_at
)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    i.id,
    (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1),
    142.0,
    142.0,
    0,
    NOW(),
    NOW()
FROM items i
WHERE i.code = 'ULTRA-FLEXIBLE-RED'
  AND NOT EXISTS (
      SELECT 1 FROM stock_entries se
      WHERE se.item_id = i.id 
        AND se.warehouse_id = (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1)
  )
LIMIT 1;

-- Stock for Ultra Flexible Black 12AWG
INSERT INTO stock_entries (
    tenant_id,
    item_id, 
    warehouse_id,
    quantity, 
    available_quantity,
    allocated_quantity,
    created_at,
    updated_at
)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    i.id,
    (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1),
    109.0,
    109.0,
    0,
    NOW(),
    NOW()
FROM items i
WHERE i.code = 'ULTRA-FLEXIBLE-BLACK'
  AND NOT EXISTS (
      SELECT 1 FROM stock_entries se
      WHERE se.item_id = i.id 
        AND se.warehouse_id = (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1)
  )
LIMIT 1;

-- Stock for Ultra Flexible Red 12AWG
INSERT INTO stock_entries (
    tenant_id,
    item_id, 
    warehouse_id,
    quantity, 
    available_quantity,
    allocated_quantity,
    created_at,
    updated_at
)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    i.id,
    (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1),
    115.0,
    115.0,
    0,
    NOW(),
    NOW()
FROM items i
WHERE i.code = 'ULTRA-FLEXIBLE-RED'
  AND NOT EXISTS (
      SELECT 1 FROM stock_entries se
      WHERE se.item_id = i.id 
        AND se.warehouse_id = (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1)
  )
LIMIT 1;

-- Stock for Ultra Flexible Black 18 AWG
INSERT INTO stock_entries (
    tenant_id,
    item_id, 
    warehouse_id,
    quantity, 
    available_quantity,
    allocated_quantity,
    created_at,
    updated_at
)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    i.id,
    (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1),
    78.0,
    78.0,
    0,
    NOW(),
    NOW()
FROM items i
WHERE i.code = 'ULTRA-FLEXIBLE-BLACK'
  AND NOT EXISTS (
      SELECT 1 FROM stock_entries se
      WHERE se.item_id = i.id 
        AND se.warehouse_id = (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1)
  )
LIMIT 1;

-- Stock for Ultra Flexible Red 18 AWG
INSERT INTO stock_entries (
    tenant_id,
    item_id, 
    warehouse_id,
    quantity, 
    available_quantity,
    allocated_quantity,
    created_at,
    updated_at
)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    i.id,
    (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1),
    13.5,
    13.5,
    0,
    NOW(),
    NOW()
FROM items i
WHERE i.code = 'ULTRA-FLEXIBLE-RED'
  AND NOT EXISTS (
      SELECT 1 FROM stock_entries se
      WHERE se.item_id = i.id 
        AND se.warehouse_id = (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1)
  )
LIMIT 1;

-- Stock for Ultra Flexible Black 20 AWG
INSERT INTO stock_entries (
    tenant_id,
    item_id, 
    warehouse_id,
    quantity, 
    available_quantity,
    allocated_quantity,
    created_at,
    updated_at
)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    i.id,
    (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1),
    40.0,
    40.0,
    0,
    NOW(),
    NOW()
FROM items i
WHERE i.code = 'ULTRA-FLEXIBLE-BLACK'
  AND NOT EXISTS (
      SELECT 1 FROM stock_entries se
      WHERE se.item_id = i.id 
        AND se.warehouse_id = (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1)
  )
LIMIT 1;

-- Stock for Ultra Flexible Blue 20 AWG
INSERT INTO stock_entries (
    tenant_id,
    item_id, 
    warehouse_id,
    quantity, 
    available_quantity,
    allocated_quantity,
    created_at,
    updated_at
)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    i.id,
    (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1),
    10.0,
    10.0,
    0,
    NOW(),
    NOW()
FROM items i
WHERE i.code = 'ULTRA-FLEXIBLE-BLUE'
  AND NOT EXISTS (
      SELECT 1 FROM stock_entries se
      WHERE se.item_id = i.id 
        AND se.warehouse_id = (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1)
  )
LIMIT 1;

-- Stock for Water flow sensor YFS401
INSERT INTO stock_entries (
    tenant_id,
    item_id, 
    warehouse_id,
    quantity, 
    available_quantity,
    allocated_quantity,
    created_at,
    updated_at
)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    i.id,
    (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1),
    54.0,
    54.0,
    0,
    NOW(),
    NOW()
FROM items i
WHERE i.code = 'WATER-FLOW-SENSOR'
  AND NOT EXISTS (
      SELECT 1 FROM stock_entries se
      WHERE se.item_id = i.id 
        AND se.warehouse_id = (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1)
  )
LIMIT 1;

-- Stock for Water pump 550 diaphragm
INSERT INTO stock_entries (
    tenant_id,
    item_id, 
    warehouse_id,
    quantity, 
    available_quantity,
    allocated_quantity,
    created_at,
    updated_at
)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    i.id,
    (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1),
    14.0,
    14.0,
    0,
    NOW(),
    NOW()
FROM items i
WHERE i.code = 'WATER-PUMP-550'
  AND NOT EXISTS (
      SELECT 1 FROM stock_entries se
      WHERE se.item_id = i.id 
        AND se.warehouse_id = (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1)
  )
LIMIT 1;

-- Stock for 1S Lipo indicator (Not Using)
INSERT INTO stock_entries (
    tenant_id,
    item_id, 
    warehouse_id,
    quantity, 
    available_quantity,
    allocated_quantity,
    created_at,
    updated_at
)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    i.id,
    (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1),
    14.0,
    14.0,
    0,
    NOW(),
    NOW()
FROM items i
WHERE i.code = '1S-LIPO-INDICATOR'
  AND NOT EXISTS (
      SELECT 1 FROM stock_entries se
      WHERE se.item_id = i.id 
        AND se.warehouse_id = (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1)
  )
LIMIT 1;

-- Stock for 2S Lipo indicator
INSERT INTO stock_entries (
    tenant_id,
    item_id, 
    warehouse_id,
    quantity, 
    available_quantity,
    allocated_quantity,
    created_at,
    updated_at
)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    i.id,
    (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1),
    33.0,
    33.0,
    0,
    NOW(),
    NOW()
FROM items i
WHERE i.code = '2S-LIPO-INDICATOR'
  AND NOT EXISTS (
      SELECT 1 FROM stock_entries se
      WHERE se.item_id = i.id 
        AND se.warehouse_id = (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1)
  )
LIMIT 1;

-- Stock for Lipo Indicator Casings
INSERT INTO stock_entries (
    tenant_id,
    item_id, 
    warehouse_id,
    quantity, 
    available_quantity,
    allocated_quantity,
    created_at,
    updated_at
)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    i.id,
    (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1),
    46.0,
    46.0,
    0,
    NOW(),
    NOW()
FROM items i
WHERE i.code = 'LIPO-INDICATOR-CASINGS'
  AND NOT EXISTS (
      SELECT 1 FROM stock_entries se
      WHERE se.item_id = i.id 
        AND se.warehouse_id = (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1)
  )
LIMIT 1;

-- Stock for Buck converter XL7015 50v
INSERT INTO stock_entries (
    tenant_id,
    item_id, 
    warehouse_id,
    quantity, 
    available_quantity,
    allocated_quantity,
    created_at,
    updated_at
)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    i.id,
    (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1),
    39.0,
    39.0,
    0,
    NOW(),
    NOW()
FROM items i
WHERE i.code = 'BUCK-CONVERTER-XL7015'
  AND NOT EXISTS (
      SELECT 1 FROM stock_entries se
      WHERE se.item_id = i.id 
        AND se.warehouse_id = (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1)
  )
LIMIT 1;

-- Stock for LM2596 in AMCA
INSERT INTO stock_entries (
    tenant_id,
    item_id, 
    warehouse_id,
    quantity, 
    available_quantity,
    allocated_quantity,
    created_at,
    updated_at
)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    i.id,
    (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1),
    59.0,
    59.0,
    0,
    NOW(),
    NOW()
FROM items i
WHERE i.code = 'LM2596-IN-AMCA'
  AND NOT EXISTS (
      SELECT 1 FROM stock_entries se
      WHERE se.item_id = i.id 
        AND se.warehouse_id = (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1)
  )
LIMIT 1;

-- Stock for XL4015/XL4005 5A buck converter
INSERT INTO stock_entries (
    tenant_id,
    item_id, 
    warehouse_id,
    quantity, 
    available_quantity,
    allocated_quantity,
    created_at,
    updated_at
)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    i.id,
    (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1),
    126.0,
    126.0,
    0,
    NOW(),
    NOW()
FROM items i
WHERE i.code = 'XL4015XL4005-5A-BUCK'
  AND NOT EXISTS (
      SELECT 1 FROM stock_entries se
      WHERE se.item_id = i.id 
        AND se.warehouse_id = (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1)
  )
LIMIT 1;

-- Stock for XT90 Female housing
INSERT INTO stock_entries (
    tenant_id,
    item_id, 
    warehouse_id,
    quantity, 
    available_quantity,
    allocated_quantity,
    created_at,
    updated_at
)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    i.id,
    (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1),
    234.0,
    234.0,
    0,
    NOW(),
    NOW()
FROM items i
WHERE i.code = 'XT90-FEMALE-HOUSING'
  AND NOT EXISTS (
      SELECT 1 FROM stock_entries se
      WHERE se.item_id = i.id 
        AND se.warehouse_id = (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1)
  )
LIMIT 1;

-- Stock for 24v AC/DC module
INSERT INTO stock_entries (
    tenant_id,
    item_id, 
    warehouse_id,
    quantity, 
    available_quantity,
    allocated_quantity,
    created_at,
    updated_at
)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    i.id,
    (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1),
    86.0,
    86.0,
    0,
    NOW(),
    NOW()
FROM items i
WHERE i.code = '24V-ACDC-MODULE'
  AND NOT EXISTS (
      SELECT 1 FROM stock_entries se
      WHERE se.item_id = i.id 
        AND se.warehouse_id = (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1)
  )
LIMIT 1;

-- Stock for Momentary Switch JCB
INSERT INTO stock_entries (
    tenant_id,
    item_id, 
    warehouse_id,
    quantity, 
    available_quantity,
    allocated_quantity,
    created_at,
    updated_at
)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    i.id,
    (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1),
    4.0,
    4.0,
    0,
    NOW(),
    NOW()
FROM items i
WHERE i.code = 'MOMENTARY-SWITCH-JCB'
  AND NOT EXISTS (
      SELECT 1 FROM stock_entries se
      WHERE se.item_id = i.id 
        AND se.warehouse_id = (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1)
  )
LIMIT 1;

-- Stock for Latching Power switch JCB
INSERT INTO stock_entries (
    tenant_id,
    item_id, 
    warehouse_id,
    quantity, 
    available_quantity,
    allocated_quantity,
    created_at,
    updated_at
)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    i.id,
    (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1),
    30.0,
    30.0,
    0,
    NOW(),
    NOW()
FROM items i
WHERE i.code = 'LATCHING-POWER-SWITCH'
  AND NOT EXISTS (
      SELECT 1 FROM stock_entries se
      WHERE se.item_id = i.id 
        AND se.warehouse_id = (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1)
  )
LIMIT 1;

-- Stock for PWB for IFU
INSERT INTO stock_entries (
    tenant_id,
    item_id, 
    warehouse_id,
    quantity, 
    available_quantity,
    allocated_quantity,
    created_at,
    updated_at
)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    i.id,
    (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1),
    180.0,
    180.0,
    0,
    NOW(),
    NOW()
FROM items i
WHERE i.code = 'PWB-FOR-IFU'
  AND NOT EXISTS (
      SELECT 1 FROM stock_entries se
      WHERE se.item_id = i.id 
        AND se.warehouse_id = (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1)
  )
LIMIT 1;

-- Stock for PWB for JCB
INSERT INTO stock_entries (
    tenant_id,
    item_id, 
    warehouse_id,
    quantity, 
    available_quantity,
    allocated_quantity,
    created_at,
    updated_at
)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    i.id,
    (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1),
    16.0,
    16.0,
    0,
    NOW(),
    NOW()
FROM items i
WHERE i.code = 'PWB-FOR-JCB'
  AND NOT EXISTS (
      SELECT 1 FROM stock_entries se
      WHERE se.item_id = i.id 
        AND se.warehouse_id = (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1)
  )
LIMIT 1;

-- Stock for PWB of STBD flash light
INSERT INTO stock_entries (
    tenant_id,
    item_id, 
    warehouse_id,
    quantity, 
    available_quantity,
    allocated_quantity,
    created_at,
    updated_at
)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    i.id,
    (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1),
    212.0,
    212.0,
    0,
    NOW(),
    NOW()
FROM items i
WHERE i.code = 'PWB-OF-STBD'
  AND NOT EXISTS (
      SELECT 1 FROM stock_entries se
      WHERE se.item_id = i.id 
        AND se.warehouse_id = (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1)
  )
LIMIT 1;

-- Stock for PWB of PORT flash light
INSERT INTO stock_entries (
    tenant_id,
    item_id, 
    warehouse_id,
    quantity, 
    available_quantity,
    allocated_quantity,
    created_at,
    updated_at
)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    i.id,
    (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1),
    209.0,
    209.0,
    0,
    NOW(),
    NOW()
FROM items i
WHERE i.code = 'PWB-OF-PORT'
  AND NOT EXISTS (
      SELECT 1 FROM stock_entries se
      WHERE se.item_id = i.id 
        AND se.warehouse_id = (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1)
  )
LIMIT 1;

-- Stock for PWB of A4 Motherboard
INSERT INTO stock_entries (
    tenant_id,
    item_id, 
    warehouse_id,
    quantity, 
    available_quantity,
    allocated_quantity,
    created_at,
    updated_at
)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    i.id,
    (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1),
    93.0,
    93.0,
    0,
    NOW(),
    NOW()
FROM items i
WHERE i.code = 'PWB-OF-A4'
  AND NOT EXISTS (
      SELECT 1 FROM stock_entries se
      WHERE se.item_id = i.id 
        AND se.warehouse_id = (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1)
  )
LIMIT 1;

-- Stock for PWB of Current Sensor
INSERT INTO stock_entries (
    tenant_id,
    item_id, 
    warehouse_id,
    quantity, 
    available_quantity,
    allocated_quantity,
    created_at,
    updated_at
)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    i.id,
    (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1),
    176.0,
    176.0,
    0,
    NOW(),
    NOW()
FROM items i
WHERE i.code = 'PWB-OF-CURRENT'
  AND NOT EXISTS (
      SELECT 1 FROM stock_entries se
      WHERE se.item_id = i.id 
        AND se.warehouse_id = (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1)
  )
LIMIT 1;

-- Stock for PWB of Button -2
INSERT INTO stock_entries (
    tenant_id,
    item_id, 
    warehouse_id,
    quantity, 
    available_quantity,
    allocated_quantity,
    created_at,
    updated_at
)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    i.id,
    (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1),
    346.0,
    346.0,
    0,
    NOW(),
    NOW()
FROM items i
WHERE i.code = 'PWB-OF-BUTTON'
  AND NOT EXISTS (
      SELECT 1 FROM stock_entries se
      WHERE se.item_id = i.id 
        AND se.warehouse_id = (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1)
  )
LIMIT 1;

-- Stock for PWB for PC (in charger)
INSERT INTO stock_entries (
    tenant_id,
    item_id, 
    warehouse_id,
    quantity, 
    available_quantity,
    allocated_quantity,
    created_at,
    updated_at
)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    i.id,
    (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1),
    72.0,
    72.0,
    0,
    NOW(),
    NOW()
FROM items i
WHERE i.code = 'PWB-FOR-PC'
  AND NOT EXISTS (
      SELECT 1 FROM stock_entries se
      WHERE se.item_id = i.id 
        AND se.warehouse_id = (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1)
  )
LIMIT 1;

-- Stock for PWB for Bathemetry Sensor
INSERT INTO stock_entries (
    tenant_id,
    item_id, 
    warehouse_id,
    quantity, 
    available_quantity,
    allocated_quantity,
    created_at,
    updated_at
)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    i.id,
    (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1),
    5.0,
    5.0,
    0,
    NOW(),
    NOW()
FROM items i
WHERE i.code = 'PWB-FOR-BATHEMETRY'
  AND NOT EXISTS (
      SELECT 1 FROM stock_entries se
      WHERE se.item_id = i.id 
        AND se.warehouse_id = (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1)
  )
LIMIT 1;

-- Stock for AMCA Onboard Charging Circuit
INSERT INTO stock_entries (
    tenant_id,
    item_id, 
    warehouse_id,
    quantity, 
    available_quantity,
    allocated_quantity,
    created_at,
    updated_at
)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    i.id,
    (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1),
    5.0,
    5.0,
    0,
    NOW(),
    NOW()
FROM items i
WHERE i.code = 'AMCA-ONBOARD-CHARGING'
  AND NOT EXISTS (
      SELECT 1 FROM stock_entries se
      WHERE se.item_id = i.id 
        AND se.warehouse_id = (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1)
  )
LIMIT 1;

-- Stock for SBus Generator Circuit (Tailored Solution)
INSERT INTO stock_entries (
    tenant_id,
    item_id, 
    warehouse_id,
    quantity, 
    available_quantity,
    allocated_quantity,
    created_at,
    updated_at
)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    i.id,
    (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1),
    5.0,
    5.0,
    0,
    NOW(),
    NOW()
FROM items i
WHERE i.code = 'SBUS-GENERATOR-CIRCUIT'
  AND NOT EXISTS (
      SELECT 1 FROM stock_entries se
      WHERE se.item_id = i.id 
        AND se.warehouse_id = (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1)
  )
LIMIT 1;

-- Stock for A5 Board with own bucks
INSERT INTO stock_entries (
    tenant_id,
    item_id, 
    warehouse_id,
    quantity, 
    available_quantity,
    allocated_quantity,
    created_at,
    updated_at
)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    i.id,
    (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1),
    5.0,
    5.0,
    0,
    NOW(),
    NOW()
FROM items i
WHERE i.code = 'A5-BOARD-WITH'
  AND NOT EXISTS (
      SELECT 1 FROM stock_entries se
      WHERE se.item_id = i.id 
        AND se.warehouse_id = (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1)
  )
LIMIT 1;

-- Stock for WCS1700 current Sensor
INSERT INTO stock_entries (
    tenant_id,
    item_id, 
    warehouse_id,
    quantity, 
    available_quantity,
    allocated_quantity,
    created_at,
    updated_at
)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    i.id,
    (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1),
    191.0,
    191.0,
    0,
    NOW(),
    NOW()
FROM items i
WHERE i.code = 'WCS1700-CURRENT-SENSOR'
  AND NOT EXISTS (
      SELECT 1 FROM stock_entries se
      WHERE se.item_id = i.id 
        AND se.warehouse_id = (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1)
  )
LIMIT 1;

-- Stock for 6X3 BATTERY blocks
INSERT INTO stock_entries (
    tenant_id,
    item_id, 
    warehouse_id,
    quantity, 
    available_quantity,
    allocated_quantity,
    created_at,
    updated_at
)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    i.id,
    (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1),
    235.0,
    235.0,
    0,
    NOW(),
    NOW()
FROM items i
WHERE i.code = '6X3-BATTERY-BLOCKS'
  AND NOT EXISTS (
      SELECT 1 FROM stock_entries se
      WHERE se.item_id = i.id 
        AND se.warehouse_id = (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1)
  )
LIMIT 1;

-- Stock for 18650 cells Li-Ion for JCB
INSERT INTO stock_entries (
    tenant_id,
    item_id, 
    warehouse_id,
    quantity, 
    available_quantity,
    allocated_quantity,
    created_at,
    updated_at
)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    i.id,
    (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1),
    10.0,
    10.0,
    0,
    NOW(),
    NOW()
FROM items i
WHERE i.code = '18650-CELLS-LIION'
  AND NOT EXISTS (
      SELECT 1 FROM stock_entries se
      WHERE se.item_id = i.id 
        AND se.warehouse_id = (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1)
  )
LIMIT 1;

-- Stock for 18650 Cell Holder
INSERT INTO stock_entries (
    tenant_id,
    item_id, 
    warehouse_id,
    quantity, 
    available_quantity,
    allocated_quantity,
    created_at,
    updated_at
)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    i.id,
    (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1),
    100.0,
    100.0,
    0,
    NOW(),
    NOW()
FROM items i
WHERE i.code = '18650-CELL-HOLDER'
  AND NOT EXISTS (
      SELECT 1 FROM stock_entries se
      WHERE se.item_id = i.id 
        AND se.warehouse_id = (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1)
  )
LIMIT 1;

-- Stock for USB Data & Charging Cable 1.5m length Black
INSERT INTO stock_entries (
    tenant_id,
    item_id, 
    warehouse_id,
    quantity, 
    available_quantity,
    allocated_quantity,
    created_at,
    updated_at
)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    i.id,
    (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1),
    2.0,
    2.0,
    0,
    NOW(),
    NOW()
FROM items i
WHERE i.code = 'USB-DATA-CHARGING'
  AND NOT EXISTS (
      SELECT 1 FROM stock_entries se
      WHERE se.item_id = i.id 
        AND se.warehouse_id = (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1)
  )
LIMIT 1;

-- Stock for DC Jack Panel Mount
INSERT INTO stock_entries (
    tenant_id,
    item_id, 
    warehouse_id,
    quantity, 
    available_quantity,
    allocated_quantity,
    created_at,
    updated_at
)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    i.id,
    (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1),
    43.0,
    43.0,
    0,
    NOW(),
    NOW()
FROM items i
WHERE i.code = 'DC-JACK-PANEL'
  AND NOT EXISTS (
      SELECT 1 FROM stock_entries se
      WHERE se.item_id = i.id 
        AND se.warehouse_id = (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1)
  )
LIMIT 1;

-- Stock for Lead paste
INSERT INTO stock_entries (
    tenant_id,
    item_id, 
    warehouse_id,
    quantity, 
    available_quantity,
    allocated_quantity,
    created_at,
    updated_at
)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    i.id,
    (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1),
    51.0,
    51.0,
    0,
    NOW(),
    NOW()
FROM items i
WHERE i.code = 'LEAD-PASTE'
  AND NOT EXISTS (
      SELECT 1 FROM stock_entries se
      WHERE se.item_id = i.id 
        AND se.warehouse_id = (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1)
  )
LIMIT 1;

-- Stock for Lead wire 22AWG
INSERT INTO stock_entries (
    tenant_id,
    item_id, 
    warehouse_id,
    quantity, 
    available_quantity,
    allocated_quantity,
    created_at,
    updated_at
)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    i.id,
    (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1),
    800.0,
    800.0,
    0,
    NOW(),
    NOW()
FROM items i
WHERE i.code = 'LEAD-WIRE-22AWG'
  AND NOT EXISTS (
      SELECT 1 FROM stock_entries se
      WHERE se.item_id = i.id 
        AND se.warehouse_id = (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1)
  )
LIMIT 1;

-- Stock for Heat Sink Pad
INSERT INTO stock_entries (
    tenant_id,
    item_id, 
    warehouse_id,
    quantity, 
    available_quantity,
    allocated_quantity,
    created_at,
    updated_at
)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    i.id,
    (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1),
    11.0,
    11.0,
    0,
    NOW(),
    NOW()
FROM items i
WHERE i.code = 'HEAT-SINK-PAD'
  AND NOT EXISTS (
      SELECT 1 FROM stock_entries se
      WHERE se.item_id = i.id 
        AND se.warehouse_id = (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1)
  )
LIMIT 1;

-- Stock for LM358DT SMD
INSERT INTO stock_entries (
    tenant_id,
    item_id, 
    warehouse_id,
    quantity, 
    available_quantity,
    allocated_quantity,
    created_at,
    updated_at
)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    i.id,
    (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1),
    237.0,
    237.0,
    0,
    NOW(),
    NOW()
FROM items i
WHERE i.code = 'LM358DT-SMD'
  AND NOT EXISTS (
      SELECT 1 FROM stock_entries se
      WHERE se.item_id = i.id 
        AND se.warehouse_id = (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1)
  )
LIMIT 1;

-- Stock for 0.1uF 0805
INSERT INTO stock_entries (
    tenant_id,
    item_id, 
    warehouse_id,
    quantity, 
    available_quantity,
    allocated_quantity,
    created_at,
    updated_at
)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    i.id,
    (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1),
    1870.0,
    1870.0,
    0,
    NOW(),
    NOW()
FROM items i
WHERE i.code = '01UF-0805'
  AND NOT EXISTS (
      SELECT 1 FROM stock_entries se
      WHERE se.item_id = i.id 
        AND se.warehouse_id = (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1)
  )
LIMIT 1;

-- Stock for 0.01uF 0805
INSERT INTO stock_entries (
    tenant_id,
    item_id, 
    warehouse_id,
    quantity, 
    available_quantity,
    allocated_quantity,
    created_at,
    updated_at
)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    i.id,
    (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1),
    890.0,
    890.0,
    0,
    NOW(),
    NOW()
FROM items i
WHERE i.code = '001UF-0805'
  AND NOT EXISTS (
      SELECT 1 FROM stock_entries se
      WHERE se.item_id = i.id 
        AND se.warehouse_id = (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1)
  )
LIMIT 1;

-- Stock for LED 0805 SMD
INSERT INTO stock_entries (
    tenant_id,
    item_id, 
    warehouse_id,
    quantity, 
    available_quantity,
    allocated_quantity,
    created_at,
    updated_at
)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    i.id,
    (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1),
    114.0,
    114.0,
    0,
    NOW(),
    NOW()
FROM items i
WHERE i.code = 'LED-0805-SMD'
  AND NOT EXISTS (
      SELECT 1 FROM stock_entries se
      WHERE se.item_id = i.id 
        AND se.warehouse_id = (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1)
  )
LIMIT 1;

-- Stock for TS5A3157DBVR SSR Encoder Signal Cut-Off
INSERT INTO stock_entries (
    tenant_id,
    item_id, 
    warehouse_id,
    quantity, 
    available_quantity,
    allocated_quantity,
    created_at,
    updated_at
)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    i.id,
    (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1),
    115.0,
    115.0,
    0,
    NOW(),
    NOW()
FROM items i
WHERE i.code = 'TS5A3157DBVR-SSR-ENCODER'
  AND NOT EXISTS (
      SELECT 1 FROM stock_entries se
      WHERE se.item_id = i.id 
        AND se.warehouse_id = (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1)
  )
LIMIT 1;

-- Stock for Tactile Switch for IFU four leg
INSERT INTO stock_entries (
    tenant_id,
    item_id, 
    warehouse_id,
    quantity, 
    available_quantity,
    allocated_quantity,
    created_at,
    updated_at
)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    i.id,
    (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1),
    200.0,
    200.0,
    0,
    NOW(),
    NOW()
FROM items i
WHERE i.code = 'TACTILE-SWITCH-FOR'
  AND NOT EXISTS (
      SELECT 1 FROM stock_entries se
      WHERE se.item_id = i.id 
        AND se.warehouse_id = (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1)
  )
LIMIT 1;

-- Stock for LM2596HVS-ADJ Buck only IC
INSERT INTO stock_entries (
    tenant_id,
    item_id, 
    warehouse_id,
    quantity, 
    available_quantity,
    allocated_quantity,
    created_at,
    updated_at
)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    i.id,
    (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1),
    5.0,
    5.0,
    0,
    NOW(),
    NOW()
FROM items i
WHERE i.code = 'LM2596HVSADJ-BUCK-ONLY'
  AND NOT EXISTS (
      SELECT 1 FROM stock_entries se
      WHERE se.item_id = i.id 
        AND se.warehouse_id = (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1)
  )
LIMIT 1;

-- Stock for MP9486AGN-Z 100v Buck converter IC
INSERT INTO stock_entries (
    tenant_id,
    item_id, 
    warehouse_id,
    quantity, 
    available_quantity,
    allocated_quantity,
    created_at,
    updated_at
)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    i.id,
    (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1),
    5.0,
    5.0,
    0,
    NOW(),
    NOW()
FROM items i
WHERE i.code = 'MP9486AGNZ-100V-BUCK'
  AND NOT EXISTS (
      SELECT 1 FROM stock_entries se
      WHERE se.item_id = i.id 
        AND se.warehouse_id = (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1)
  )
LIMIT 1;

-- Stock for 12v Fixed Buck 18-75 In MultiCom Pro
INSERT INTO stock_entries (
    tenant_id,
    item_id, 
    warehouse_id,
    quantity, 
    available_quantity,
    allocated_quantity,
    created_at,
    updated_at
)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    i.id,
    (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1),
    1.0,
    1.0,
    0,
    NOW(),
    NOW()
FROM items i
WHERE i.code = '12V-FIXED-BUCK'
  AND NOT EXISTS (
      SELECT 1 FROM stock_entries se
      WHERE se.item_id = i.id 
        AND se.warehouse_id = (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1)
  )
LIMIT 1;

-- Stock for 5v Fixed Buck 18-75 In MultiCom Pro
INSERT INTO stock_entries (
    tenant_id,
    item_id, 
    warehouse_id,
    quantity, 
    available_quantity,
    allocated_quantity,
    created_at,
    updated_at
)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    i.id,
    (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1),
    5.0,
    5.0,
    0,
    NOW(),
    NOW()
FROM items i
WHERE i.code = '5V-FIXED-BUCK'
  AND NOT EXISTS (
      SELECT 1 FROM stock_entries se
      WHERE se.item_id = i.id 
        AND se.warehouse_id = (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1)
  )
LIMIT 1;

-- Stock for 1N4148 SMD
INSERT INTO stock_entries (
    tenant_id,
    item_id, 
    warehouse_id,
    quantity, 
    available_quantity,
    allocated_quantity,
    created_at,
    updated_at
)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    i.id,
    (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1),
    751.0,
    751.0,
    0,
    NOW(),
    NOW()
FROM items i
WHERE i.code = '1N4148-SMD'
  AND NOT EXISTS (
      SELECT 1 FROM stock_entries se
      WHERE se.item_id = i.id 
        AND se.warehouse_id = (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1)
  )
LIMIT 1;

-- Stock for 18pF 0805 capacitor
INSERT INTO stock_entries (
    tenant_id,
    item_id, 
    warehouse_id,
    quantity, 
    available_quantity,
    allocated_quantity,
    created_at,
    updated_at
)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    i.id,
    (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1),
    2067.0,
    2067.0,
    0,
    NOW(),
    NOW()
FROM items i
WHERE i.code = '18PF-0805-CAPACITOR'
  AND NOT EXISTS (
      SELECT 1 FROM stock_entries se
      WHERE se.item_id = i.id 
        AND se.warehouse_id = (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1)
  )
LIMIT 1;

-- Stock for 10uF 10v Tantalum Capacitor Case A
INSERT INTO stock_entries (
    tenant_id,
    item_id, 
    warehouse_id,
    quantity, 
    available_quantity,
    allocated_quantity,
    created_at,
    updated_at
)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    i.id,
    (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1),
    594.0,
    594.0,
    0,
    NOW(),
    NOW()
FROM items i
WHERE i.code = '10UF-10V-TANTALUM'
  AND NOT EXISTS (
      SELECT 1 FROM stock_entries se
      WHERE se.item_id = i.id 
        AND se.warehouse_id = (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1)
  )
LIMIT 1;

-- Stock for 1k 0805 Resistor
INSERT INTO stock_entries (
    tenant_id,
    item_id, 
    warehouse_id,
    quantity, 
    available_quantity,
    allocated_quantity,
    created_at,
    updated_at
)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    i.id,
    (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1),
    450.0,
    450.0,
    0,
    NOW(),
    NOW()
FROM items i
WHERE i.code = '1K-0805-RESISTOR'
  AND NOT EXISTS (
      SELECT 1 FROM stock_entries se
      WHERE se.item_id = i.id 
        AND se.warehouse_id = (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1)
  )
LIMIT 1;

-- Stock for 10k 0805 resistor
INSERT INTO stock_entries (
    tenant_id,
    item_id, 
    warehouse_id,
    quantity, 
    available_quantity,
    allocated_quantity,
    created_at,
    updated_at
)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    i.id,
    (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1),
    66.0,
    66.0,
    0,
    NOW(),
    NOW()
FROM items i
WHERE i.code = '10K-0805-RESISTOR'
  AND NOT EXISTS (
      SELECT 1 FROM stock_entries se
      WHERE se.item_id = i.id 
        AND se.warehouse_id = (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1)
  )
LIMIT 1;

-- Stock for 330E 0805 Resistor
INSERT INTO stock_entries (
    tenant_id,
    item_id, 
    warehouse_id,
    quantity, 
    available_quantity,
    allocated_quantity,
    created_at,
    updated_at
)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    i.id,
    (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1),
    1090.0,
    1090.0,
    0,
    NOW(),
    NOW()
FROM items i
WHERE i.code = '330E-0805-RESISTOR'
  AND NOT EXISTS (
      SELECT 1 FROM stock_entries se
      WHERE se.item_id = i.id 
        AND se.warehouse_id = (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1)
  )
LIMIT 1;

-- Stock for Murata 12v 4.5A buck
INSERT INTO stock_entries (
    tenant_id,
    item_id, 
    warehouse_id,
    quantity, 
    available_quantity,
    allocated_quantity,
    created_at,
    updated_at
)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    i.id,
    (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1),
    70.0,
    70.0,
    0,
    NOW(),
    NOW()
FROM items i
WHERE i.code = 'MURATA-12V-45A'
  AND NOT EXISTS (
      SELECT 1 FROM stock_entries se
      WHERE se.item_id = i.id 
        AND se.warehouse_id = (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1)
  )
LIMIT 1;

-- Stock for Murata 5v 10A buck
INSERT INTO stock_entries (
    tenant_id,
    item_id, 
    warehouse_id,
    quantity, 
    available_quantity,
    allocated_quantity,
    created_at,
    updated_at
)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    i.id,
    (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1),
    2.0,
    2.0,
    0,
    NOW(),
    NOW()
FROM items i
WHERE i.code = 'MURATA-5V-10A'
  AND NOT EXISTS (
      SELECT 1 FROM stock_entries se
      WHERE se.item_id = i.id 
        AND se.warehouse_id = (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1)
  )
LIMIT 1;

-- Stock for 1K 3296 Resistor
INSERT INTO stock_entries (
    tenant_id,
    item_id, 
    warehouse_id,
    quantity, 
    available_quantity,
    allocated_quantity,
    created_at,
    updated_at
)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    i.id,
    (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1),
    20.0,
    20.0,
    0,
    NOW(),
    NOW()
FROM items i
WHERE i.code = '1K-3296-RESISTOR'
  AND NOT EXISTS (
      SELECT 1 FROM stock_entries se
      WHERE se.item_id = i.id 
        AND se.warehouse_id = (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1)
  )
LIMIT 1;

-- Stock for 2K 3296 Resistor
INSERT INTO stock_entries (
    tenant_id,
    item_id, 
    warehouse_id,
    quantity, 
    available_quantity,
    allocated_quantity,
    created_at,
    updated_at
)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    i.id,
    (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1),
    20.0,
    20.0,
    0,
    NOW(),
    NOW()
FROM items i
WHERE i.code = '2K-3296-RESISTOR'
  AND NOT EXISTS (
      SELECT 1 FROM stock_entries se
      WHERE se.item_id = i.id 
        AND se.warehouse_id = (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1)
  )
LIMIT 1;

-- Stock for 5 W 1 Ω Resistor
INSERT INTO stock_entries (
    tenant_id,
    item_id, 
    warehouse_id,
    quantity, 
    available_quantity,
    allocated_quantity,
    created_at,
    updated_at
)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    i.id,
    (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1),
    10.0,
    10.0,
    0,
    NOW(),
    NOW()
FROM items i
WHERE i.code = '5-W-1'
  AND NOT EXISTS (
      SELECT 1 FROM stock_entries se
      WHERE se.item_id = i.id 
        AND se.warehouse_id = (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1)
  )
LIMIT 1;

-- Stock for 5 W 5 Ω Resistor
INSERT INTO stock_entries (
    tenant_id,
    item_id, 
    warehouse_id,
    quantity, 
    available_quantity,
    allocated_quantity,
    created_at,
    updated_at
)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    i.id,
    (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1),
    10.0,
    10.0,
    0,
    NOW(),
    NOW()
FROM items i
WHERE i.code = '5-W-5'
  AND NOT EXISTS (
      SELECT 1 FROM stock_entries se
      WHERE se.item_id = i.id 
        AND se.warehouse_id = (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1)
  )
LIMIT 1;

-- Stock for Fuse 500mA
INSERT INTO stock_entries (
    tenant_id,
    item_id, 
    warehouse_id,
    quantity, 
    available_quantity,
    allocated_quantity,
    created_at,
    updated_at
)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    i.id,
    (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1),
    198.0,
    198.0,
    0,
    NOW(),
    NOW()
FROM items i
WHERE i.code = 'FUSE-500MA'
  AND NOT EXISTS (
      SELECT 1 FROM stock_entries se
      WHERE se.item_id = i.id 
        AND se.warehouse_id = (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1)
  )
LIMIT 1;

-- Stock for MCP3208
INSERT INTO stock_entries (
    tenant_id,
    item_id, 
    warehouse_id,
    quantity, 
    available_quantity,
    allocated_quantity,
    created_at,
    updated_at
)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    i.id,
    (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1),
    240.0,
    240.0,
    0,
    NOW(),
    NOW()
FROM items i
WHERE i.code = 'MCP3208'
  AND NOT EXISTS (
      SELECT 1 FROM stock_entries se
      WHERE se.item_id = i.id 
        AND se.warehouse_id = (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1)
  )
LIMIT 1;

-- Stock for 23A 24v Power relay
INSERT INTO stock_entries (
    tenant_id,
    item_id, 
    warehouse_id,
    quantity, 
    available_quantity,
    allocated_quantity,
    created_at,
    updated_at
)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    i.id,
    (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1),
    90.0,
    90.0,
    0,
    NOW(),
    NOW()
FROM items i
WHERE i.code = '23A-24V-POWER'
  AND NOT EXISTS (
      SELECT 1 FROM stock_entries se
      WHERE se.item_id = i.id 
        AND se.warehouse_id = (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1)
  )
LIMIT 1;

-- Stock for LM61 Temperature Sensor
INSERT INTO stock_entries (
    tenant_id,
    item_id, 
    warehouse_id,
    quantity, 
    available_quantity,
    allocated_quantity,
    created_at,
    updated_at
)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    i.id,
    (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1),
    175.0,
    175.0,
    0,
    NOW(),
    NOW()
FROM items i
WHERE i.code = 'LM61-TEMPERATURE-SENSOR'
  AND NOT EXISTS (
      SELECT 1 FROM stock_entries se
      WHERE se.item_id = i.id 
        AND se.warehouse_id = (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1)
  )
LIMIT 1;

-- Stock for 47k 0805
INSERT INTO stock_entries (
    tenant_id,
    item_id, 
    warehouse_id,
    quantity, 
    available_quantity,
    allocated_quantity,
    created_at,
    updated_at
)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    i.id,
    (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1),
    2410.0,
    2410.0,
    0,
    NOW(),
    NOW()
FROM items i
WHERE i.code = '47K-0805'
  AND NOT EXISTS (
      SELECT 1 FROM stock_entries se
      WHERE se.item_id = i.id 
        AND se.warehouse_id = (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1)
  )
LIMIT 1;

-- Stock for 470k 0805 PANASONIC/BOURNS/MURATA
INSERT INTO stock_entries (
    tenant_id,
    item_id, 
    warehouse_id,
    quantity, 
    available_quantity,
    allocated_quantity,
    created_at,
    updated_at
)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    i.id,
    (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1),
    2714.0,
    2714.0,
    0,
    NOW(),
    NOW()
FROM items i
WHERE i.code = '470K-0805-PANASONICBOURNSMURATA'
  AND NOT EXISTS (
      SELECT 1 FROM stock_entries se
      WHERE se.item_id = i.id 
        AND se.warehouse_id = (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1)
  )
LIMIT 1;

-- Stock for 20k 0805 PANASONIC/BOURNS/MURATA
INSERT INTO stock_entries (
    tenant_id,
    item_id, 
    warehouse_id,
    quantity, 
    available_quantity,
    allocated_quantity,
    created_at,
    updated_at
)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    i.id,
    (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1),
    1339.0,
    1339.0,
    0,
    NOW(),
    NOW()
FROM items i
WHERE i.code = '20K-0805-PANASONICBOURNSMURATA'
  AND NOT EXISTS (
      SELECT 1 FROM stock_entries se
      WHERE se.item_id = i.id 
        AND se.warehouse_id = (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1)
  )
LIMIT 1;

-- Stock for 1uF 0805 PANASONIC
INSERT INTO stock_entries (
    tenant_id,
    item_id, 
    warehouse_id,
    quantity, 
    available_quantity,
    allocated_quantity,
    created_at,
    updated_at
)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    i.id,
    (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1),
    1960.0,
    1960.0,
    0,
    NOW(),
    NOW()
FROM items i
WHERE i.code = '1UF-0805-PANASONIC'
  AND NOT EXISTS (
      SELECT 1 FROM stock_entries se
      WHERE se.item_id = i.id 
        AND se.warehouse_id = (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1)
  )
LIMIT 1;

-- Stock for 16MHz Crystal Oscillator
INSERT INTO stock_entries (
    tenant_id,
    item_id, 
    warehouse_id,
    quantity, 
    available_quantity,
    allocated_quantity,
    created_at,
    updated_at
)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    i.id,
    (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1),
    532.0,
    532.0,
    0,
    NOW(),
    NOW()
FROM items i
WHERE i.code = '16MHZ-CRYSTAL-OSCILLATOR'
  AND NOT EXISTS (
      SELECT 1 FROM stock_entries se
      WHERE se.item_id = i.id 
        AND se.warehouse_id = (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1)
  )
LIMIT 1;

-- Stock for ULN2004 SMD
INSERT INTO stock_entries (
    tenant_id,
    item_id, 
    warehouse_id,
    quantity, 
    available_quantity,
    allocated_quantity,
    created_at,
    updated_at
)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    i.id,
    (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1),
    218.0,
    218.0,
    0,
    NOW(),
    NOW()
FROM items i
WHERE i.code = 'ULN2004-SMD'
  AND NOT EXISTS (
      SELECT 1 FROM stock_entries se
      WHERE se.item_id = i.id 
        AND se.warehouse_id = (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1)
  )
LIMIT 1;

-- Stock for SSR AQW282SX
INSERT INTO stock_entries (
    tenant_id,
    item_id, 
    warehouse_id,
    quantity, 
    available_quantity,
    allocated_quantity,
    created_at,
    updated_at
)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    i.id,
    (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1),
    402.0,
    402.0,
    0,
    NOW(),
    NOW()
FROM items i
WHERE i.code = 'SSR-AQW282SX'
  AND NOT EXISTS (
      SELECT 1 FROM stock_entries se
      WHERE se.item_id = i.id 
        AND se.warehouse_id = (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1)
  )
LIMIT 1;

-- Stock for Atmega328P Controller
INSERT INTO stock_entries (
    tenant_id,
    item_id, 
    warehouse_id,
    quantity, 
    available_quantity,
    allocated_quantity,
    created_at,
    updated_at
)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    i.id,
    (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1),
    400.0,
    400.0,
    0,
    NOW(),
    NOW()
FROM items i
WHERE i.code = 'ATMEGA328P-CONTROLLER'
  AND NOT EXISTS (
      SELECT 1 FROM stock_entries se
      WHERE se.item_id = i.id 
        AND se.warehouse_id = (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1)
  )
LIMIT 1;

-- Stock for Power Relay 120A 12v Y7
INSERT INTO stock_entries (
    tenant_id,
    item_id, 
    warehouse_id,
    quantity, 
    available_quantity,
    allocated_quantity,
    created_at,
    updated_at
)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    i.id,
    (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1),
    35.0,
    35.0,
    0,
    NOW(),
    NOW()
FROM items i
WHERE i.code = 'POWER-RELAY-120A'
  AND NOT EXISTS (
      SELECT 1 FROM stock_entries se
      WHERE se.item_id = i.id 
        AND se.warehouse_id = (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1)
  )
LIMIT 1;

-- Stock for Power Relay 90A 12v Y6
INSERT INTO stock_entries (
    tenant_id,
    item_id, 
    warehouse_id,
    quantity, 
    available_quantity,
    allocated_quantity,
    created_at,
    updated_at
)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    i.id,
    (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1),
    301.0,
    301.0,
    0,
    NOW(),
    NOW()
FROM items i
WHERE i.code = 'POWER-RELAY-90A'
  AND NOT EXISTS (
      SELECT 1 FROM stock_entries se
      WHERE se.item_id = i.id 
        AND se.warehouse_id = (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1)
  )
LIMIT 1;

-- Stock for SPST relay 5A-12v ANTI_S & KILL
INSERT INTO stock_entries (
    tenant_id,
    item_id, 
    warehouse_id,
    quantity, 
    available_quantity,
    allocated_quantity,
    created_at,
    updated_at
)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    i.id,
    (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1),
    131.0,
    131.0,
    0,
    NOW(),
    NOW()
FROM items i
WHERE i.code = 'SPST-RELAY-5A12V'
  AND NOT EXISTS (
      SELECT 1 FROM stock_entries se
      WHERE se.item_id = i.id 
        AND se.warehouse_id = (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1)
  )
LIMIT 1;

-- Stock for Balancing 1A DPDT 24v Relay
INSERT INTO stock_entries (
    tenant_id,
    item_id, 
    warehouse_id,
    quantity, 
    available_quantity,
    allocated_quantity,
    created_at,
    updated_at
)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    i.id,
    (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1),
    268.0,
    268.0,
    0,
    NOW(),
    NOW()
FROM items i
WHERE i.code = 'BALANCING-1A-DPDT'
  AND NOT EXISTS (
      SELECT 1 FROM stock_entries se
      WHERE se.item_id = i.id 
        AND se.warehouse_id = (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1)
  )
LIMIT 1;

-- Stock for Balancing relay 5A/2A 24v SPST
INSERT INTO stock_entries (
    tenant_id,
    item_id, 
    warehouse_id,
    quantity, 
    available_quantity,
    allocated_quantity,
    created_at,
    updated_at
)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    i.id,
    (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1),
    87.0,
    87.0,
    0,
    NOW(),
    NOW()
FROM items i
WHERE i.code = 'BALANCING-RELAY-5A2A'
  AND NOT EXISTS (
      SELECT 1 FROM stock_entries se
      WHERE se.item_id = i.id 
        AND se.warehouse_id = (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1)
  )
LIMIT 1;

-- Stock for 32Gb SD Card
INSERT INTO stock_entries (
    tenant_id,
    item_id, 
    warehouse_id,
    quantity, 
    available_quantity,
    allocated_quantity,
    created_at,
    updated_at
)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    i.id,
    (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1),
    25.0,
    25.0,
    0,
    NOW(),
    NOW()
FROM items i
WHERE i.code = '32GB-SD-CARD'
  AND NOT EXISTS (
      SELECT 1 FROM stock_entries se
      WHERE se.item_id = i.id 
        AND se.warehouse_id = (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1)
  )
LIMIT 1;

-- Stock for 16pin IC base
INSERT INTO stock_entries (
    tenant_id,
    item_id, 
    warehouse_id,
    quantity, 
    available_quantity,
    allocated_quantity,
    created_at,
    updated_at
)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    i.id,
    (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1),
    75.0,
    75.0,
    0,
    NOW(),
    NOW()
FROM items i
WHERE i.code = '16PIN-IC-BASE'
  AND NOT EXISTS (
      SELECT 1 FROM stock_entries se
      WHERE se.item_id = i.id 
        AND se.warehouse_id = (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1)
  )
LIMIT 1;

-- Stock for BlueTooth Module
INSERT INTO stock_entries (
    tenant_id,
    item_id, 
    warehouse_id,
    quantity, 
    available_quantity,
    allocated_quantity,
    created_at,
    updated_at
)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    i.id,
    (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1),
    54.0,
    54.0,
    0,
    NOW(),
    NOW()
FROM items i
WHERE i.code = 'BLUETOOTH-MODULE'
  AND NOT EXISTS (
      SELECT 1 FROM stock_entries se
      WHERE se.item_id = i.id 
        AND se.warehouse_id = (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1)
  )
LIMIT 1;

-- Stock for 24AWG Soldering Wire
INSERT INTO stock_entries (
    tenant_id,
    item_id, 
    warehouse_id,
    quantity, 
    available_quantity,
    allocated_quantity,
    created_at,
    updated_at
)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    i.id,
    (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1),
    1000.0,
    1000.0,
    0,
    NOW(),
    NOW()
FROM items i
WHERE i.code = '24AWG-SOLDERING-WIRE'
  AND NOT EXISTS (
      SELECT 1 FROM stock_entries se
      WHERE se.item_id = i.id 
        AND se.warehouse_id = (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1)
  )
LIMIT 1;

-- Stock for 12E 2W Resistor THT
INSERT INTO stock_entries (
    tenant_id,
    item_id, 
    warehouse_id,
    quantity, 
    available_quantity,
    allocated_quantity,
    created_at,
    updated_at
)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    i.id,
    (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1),
    36.0,
    36.0,
    0,
    NOW(),
    NOW()
FROM items i
WHERE i.code = '12E-2W-RESISTOR'
  AND NOT EXISTS (
      SELECT 1 FROM stock_entries se
      WHERE se.item_id = i.id 
        AND se.warehouse_id = (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1)
  )
LIMIT 1;

-- Stock for iMAx B3 Charger
INSERT INTO stock_entries (
    tenant_id,
    item_id, 
    warehouse_id,
    quantity, 
    available_quantity,
    allocated_quantity,
    created_at,
    updated_at
)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    i.id,
    (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1),
    38.0,
    38.0,
    0,
    NOW(),
    NOW()
FROM items i
WHERE i.code = 'IMAX-B3-CHARGER'
  AND NOT EXISTS (
      SELECT 1 FROM stock_entries se
      WHERE se.item_id = i.id 
        AND se.warehouse_id = (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1)
  )
LIMIT 1;

-- Stock for 9v Piezo Electric Buzzer
INSERT INTO stock_entries (
    tenant_id,
    item_id, 
    warehouse_id,
    quantity, 
    available_quantity,
    allocated_quantity,
    created_at,
    updated_at
)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    i.id,
    (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1),
    12.0,
    12.0,
    0,
    NOW(),
    NOW()
FROM items i
WHERE i.code = '9V-PIEZO-ELECTRIC'
  AND NOT EXISTS (
      SELECT 1 FROM stock_entries se
      WHERE se.item_id = i.id 
        AND se.warehouse_id = (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1)
  )
LIMIT 1;

-- Stock for Female Bergstrip 40x1 2.54mm
INSERT INTO stock_entries (
    tenant_id,
    item_id, 
    warehouse_id,
    quantity, 
    available_quantity,
    allocated_quantity,
    created_at,
    updated_at
)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    i.id,
    (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1),
    31.0,
    31.0,
    0,
    NOW(),
    NOW()
FROM items i
WHERE i.code = 'FEMALE-BERGSTRIP-40X1'
  AND NOT EXISTS (
      SELECT 1 FROM stock_entries se
      WHERE se.item_id = i.id 
        AND se.warehouse_id = (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1)
  )
LIMIT 1;

-- Stock for Male Bergstrip 40x1 2.54mm
INSERT INTO stock_entries (
    tenant_id,
    item_id, 
    warehouse_id,
    quantity, 
    available_quantity,
    allocated_quantity,
    created_at,
    updated_at
)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    i.id,
    (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1),
    18.0,
    18.0,
    0,
    NOW(),
    NOW()
FROM items i
WHERE i.code = 'MALE-BERGSTRIP-40X1'
  AND NOT EXISTS (
      SELECT 1 FROM stock_entries se
      WHERE se.item_id = i.id 
        AND se.warehouse_id = (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1)
  )
LIMIT 1;

-- Stock for Female Bergstrip 40x1 2.0mm
INSERT INTO stock_entries (
    tenant_id,
    item_id, 
    warehouse_id,
    quantity, 
    available_quantity,
    allocated_quantity,
    created_at,
    updated_at
)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    i.id,
    (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1),
    38.0,
    38.0,
    0,
    NOW(),
    NOW()
FROM items i
WHERE i.code = 'FEMALE-BERGSTRIP-40X1'
  AND NOT EXISTS (
      SELECT 1 FROM stock_entries se
      WHERE se.item_id = i.id 
        AND se.warehouse_id = (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1)
  )
LIMIT 1;

-- Stock for Male Bergstrip 40x1 2.0mm
INSERT INTO stock_entries (
    tenant_id,
    item_id, 
    warehouse_id,
    quantity, 
    available_quantity,
    allocated_quantity,
    created_at,
    updated_at
)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    i.id,
    (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1),
    31.0,
    31.0,
    0,
    NOW(),
    NOW()
FROM items i
WHERE i.code = 'MALE-BERGSTRIP-40X1'
  AND NOT EXISTS (
      SELECT 1 FROM stock_entries se
      WHERE se.item_id = i.id 
        AND se.warehouse_id = (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1)
  )
LIMIT 1;

-- Stock for Conformal Coating
INSERT INTO stock_entries (
    tenant_id,
    item_id, 
    warehouse_id,
    quantity, 
    available_quantity,
    allocated_quantity,
    created_at,
    updated_at
)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    i.id,
    (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1),
    1000.0,
    1000.0,
    0,
    NOW(),
    NOW()
FROM items i
WHERE i.code = 'CONFORMAL-COATING'
  AND NOT EXISTS (
      SELECT 1 FROM stock_entries se
      WHERE se.item_id = i.id 
        AND se.warehouse_id = (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1)
  )
LIMIT 1;

-- Stock for Soldering flux Small lead
INSERT INTO stock_entries (
    tenant_id,
    item_id, 
    warehouse_id,
    quantity, 
    available_quantity,
    allocated_quantity,
    created_at,
    updated_at
)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    i.id,
    (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1),
    210.0,
    210.0,
    0,
    NOW(),
    NOW()
FROM items i
WHERE i.code = 'SOLDERING-FLUX-SMALL'
  AND NOT EXISTS (
      SELECT 1 FROM stock_entries se
      WHERE se.item_id = i.id 
        AND se.warehouse_id = (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1)
  )
LIMIT 1;

-- Stock for 3 pin 3 yrd power cord
INSERT INTO stock_entries (
    tenant_id,
    item_id, 
    warehouse_id,
    quantity, 
    available_quantity,
    allocated_quantity,
    created_at,
    updated_at
)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    i.id,
    (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1),
    18.0,
    18.0,
    0,
    NOW(),
    NOW()
FROM items i
WHERE i.code = '3-PIN-3'
  AND NOT EXISTS (
      SELECT 1 FROM stock_entries se
      WHERE se.item_id = i.id 
        AND se.warehouse_id = (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1)
  )
LIMIT 1;

-- Stock for 2 pin JST-XH housing
INSERT INTO stock_entries (
    tenant_id,
    item_id, 
    warehouse_id,
    quantity, 
    available_quantity,
    allocated_quantity,
    created_at,
    updated_at
)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    i.id,
    (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1),
    519.0,
    519.0,
    0,
    NOW(),
    NOW()
FROM items i
WHERE i.code = '2-PIN-JSTXH'
  AND NOT EXISTS (
      SELECT 1 FROM stock_entries se
      WHERE se.item_id = i.id 
        AND se.warehouse_id = (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1)
  )
LIMIT 1;

-- Stock for 3 pin JST-XH housing
INSERT INTO stock_entries (
    tenant_id,
    item_id, 
    warehouse_id,
    quantity, 
    available_quantity,
    allocated_quantity,
    created_at,
    updated_at
)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    i.id,
    (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1),
    285.0,
    285.0,
    0,
    NOW(),
    NOW()
FROM items i
WHERE i.code = '3-PIN-JSTXH'
  AND NOT EXISTS (
      SELECT 1 FROM stock_entries se
      WHERE se.item_id = i.id 
        AND se.warehouse_id = (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1)
  )
LIMIT 1;

-- Stock for 13 pin JST-XH housing
INSERT INTO stock_entries (
    tenant_id,
    item_id, 
    warehouse_id,
    quantity, 
    available_quantity,
    allocated_quantity,
    created_at,
    updated_at
)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    i.id,
    (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1),
    373.0,
    373.0,
    0,
    NOW(),
    NOW()
FROM items i
WHERE i.code = '13-PIN-JSTXH'
  AND NOT EXISTS (
      SELECT 1 FROM stock_entries se
      WHERE se.item_id = i.id 
        AND se.warehouse_id = (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1)
  )
LIMIT 1;

-- Stock for 15 pin JST-XH housing
INSERT INTO stock_entries (
    tenant_id,
    item_id, 
    warehouse_id,
    quantity, 
    available_quantity,
    allocated_quantity,
    created_at,
    updated_at
)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    i.id,
    (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1),
    413.0,
    413.0,
    0,
    NOW(),
    NOW()
FROM items i
WHERE i.code = '15-PIN-JSTXH'
  AND NOT EXISTS (
      SELECT 1 FROM stock_entries se
      WHERE se.item_id = i.id 
        AND se.warehouse_id = (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1)
  )
LIMIT 1;

-- Stock for 2 pin JST-XH male top entry
INSERT INTO stock_entries (
    tenant_id,
    item_id, 
    warehouse_id,
    quantity, 
    available_quantity,
    allocated_quantity,
    created_at,
    updated_at
)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    i.id,
    (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1),
    425.0,
    425.0,
    0,
    NOW(),
    NOW()
FROM items i
WHERE i.code = '2-PIN-JSTXH'
  AND NOT EXISTS (
      SELECT 1 FROM stock_entries se
      WHERE se.item_id = i.id 
        AND se.warehouse_id = (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1)
  )
LIMIT 1;

-- Stock for 2 pin JST-XH male side entry
INSERT INTO stock_entries (
    tenant_id,
    item_id, 
    warehouse_id,
    quantity, 
    available_quantity,
    allocated_quantity,
    created_at,
    updated_at
)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    i.id,
    (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1),
    100.0,
    100.0,
    0,
    NOW(),
    NOW()
FROM items i
WHERE i.code = '2-PIN-JSTXH'
  AND NOT EXISTS (
      SELECT 1 FROM stock_entries se
      WHERE se.item_id = i.id 
        AND se.warehouse_id = (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1)
  )
LIMIT 1;

-- Stock for 3 pin JST-XH male top entry
INSERT INTO stock_entries (
    tenant_id,
    item_id, 
    warehouse_id,
    quantity, 
    available_quantity,
    allocated_quantity,
    created_at,
    updated_at
)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    i.id,
    (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1),
    178.0,
    178.0,
    0,
    NOW(),
    NOW()
FROM items i
WHERE i.code = '3-PIN-JSTXH'
  AND NOT EXISTS (
      SELECT 1 FROM stock_entries se
      WHERE se.item_id = i.id 
        AND se.warehouse_id = (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1)
  )
LIMIT 1;

-- Stock for 2510 Crimping pins
INSERT INTO stock_entries (
    tenant_id,
    item_id, 
    warehouse_id,
    quantity, 
    available_quantity,
    allocated_quantity,
    created_at,
    updated_at
)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    i.id,
    (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1),
    500.0,
    500.0,
    0,
    NOW(),
    NOW()
FROM items i
WHERE i.code = '2510-CRIMPING-PINS'
  AND NOT EXISTS (
      SELECT 1 FROM stock_entries se
      WHERE se.item_id = i.id 
        AND se.warehouse_id = (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1)
  )
LIMIT 1;

-- Stock for 13 pin JST-XH male top entry
INSERT INTO stock_entries (
    tenant_id,
    item_id, 
    warehouse_id,
    quantity, 
    available_quantity,
    allocated_quantity,
    created_at,
    updated_at
)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    i.id,
    (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1),
    407.0,
    407.0,
    0,
    NOW(),
    NOW()
FROM items i
WHERE i.code = '13-PIN-JSTXH'
  AND NOT EXISTS (
      SELECT 1 FROM stock_entries se
      WHERE se.item_id = i.id 
        AND se.warehouse_id = (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1)
  )
LIMIT 1;

-- Stock for 15 pin JST-XH male top entry
INSERT INTO stock_entries (
    tenant_id,
    item_id, 
    warehouse_id,
    quantity, 
    available_quantity,
    allocated_quantity,
    created_at,
    updated_at
)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    i.id,
    (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1),
    523.0,
    523.0,
    0,
    NOW(),
    NOW()
FROM items i
WHERE i.code = '15-PIN-JSTXH'
  AND NOT EXISTS (
      SELECT 1 FROM stock_entries se
      WHERE se.item_id = i.id 
        AND se.warehouse_id = (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1)
  )
LIMIT 1;

-- Stock for JST-XH Crimping pins
INSERT INTO stock_entries (
    tenant_id,
    item_id, 
    warehouse_id,
    quantity, 
    available_quantity,
    allocated_quantity,
    created_at,
    updated_at
)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    i.id,
    (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1),
    522.0,
    522.0,
    0,
    NOW(),
    NOW()
FROM items i
WHERE i.code = 'JSTXH-CRIMPING-PINS'
  AND NOT EXISTS (
      SELECT 1 FROM stock_entries se
      WHERE se.item_id = i.id 
        AND se.warehouse_id = (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1)
  )
LIMIT 1;

-- Stock for 25cm Red one side crimped wire
INSERT INTO stock_entries (
    tenant_id,
    item_id, 
    warehouse_id,
    quantity, 
    available_quantity,
    allocated_quantity,
    created_at,
    updated_at
)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    i.id,
    (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1),
    200.0,
    200.0,
    0,
    NOW(),
    NOW()
FROM items i
WHERE i.code = '25CM-RED-ONE'
  AND NOT EXISTS (
      SELECT 1 FROM stock_entries se
      WHERE se.item_id = i.id 
        AND se.warehouse_id = (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1)
  )
LIMIT 1;

-- Stock for 25cm Green one side crimped wire
INSERT INTO stock_entries (
    tenant_id,
    item_id, 
    warehouse_id,
    quantity, 
    available_quantity,
    allocated_quantity,
    created_at,
    updated_at
)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    i.id,
    (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1),
    200.0,
    200.0,
    0,
    NOW(),
    NOW()
FROM items i
WHERE i.code = '25CM-GREEN-ONE'
  AND NOT EXISTS (
      SELECT 1 FROM stock_entries se
      WHERE se.item_id = i.id 
        AND se.warehouse_id = (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1)
  )
LIMIT 1;

-- Stock for 25cm Black one side crimped wire
INSERT INTO stock_entries (
    tenant_id,
    item_id, 
    warehouse_id,
    quantity, 
    available_quantity,
    allocated_quantity,
    created_at,
    updated_at
)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    i.id,
    (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1),
    200.0,
    200.0,
    0,
    NOW(),
    NOW()
FROM items i
WHERE i.code = '25CM-BLACK-ONE'
  AND NOT EXISTS (
      SELECT 1 FROM stock_entries se
      WHERE se.item_id = i.id 
        AND se.warehouse_id = (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1)
  )
LIMIT 1;

-- Stock for 10cm one sided JST crimped Black
INSERT INTO stock_entries (
    tenant_id,
    item_id, 
    warehouse_id,
    quantity, 
    available_quantity,
    allocated_quantity,
    created_at,
    updated_at
)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    i.id,
    (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1),
    130.0,
    130.0,
    0,
    NOW(),
    NOW()
FROM items i
WHERE i.code = '10CM-ONE-SIDED'
  AND NOT EXISTS (
      SELECT 1 FROM stock_entries se
      WHERE se.item_id = i.id 
        AND se.warehouse_id = (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1)
  )
LIMIT 1;

-- Stock for 10cm one sided JST crimped Green
INSERT INTO stock_entries (
    tenant_id,
    item_id, 
    warehouse_id,
    quantity, 
    available_quantity,
    allocated_quantity,
    created_at,
    updated_at
)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    i.id,
    (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1),
    451.0,
    451.0,
    0,
    NOW(),
    NOW()
FROM items i
WHERE i.code = '10CM-ONE-SIDED'
  AND NOT EXISTS (
      SELECT 1 FROM stock_entries se
      WHERE se.item_id = i.id 
        AND se.warehouse_id = (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1)
  )
LIMIT 1;

-- Stock for 10cm one sided JST crimped Voilet
INSERT INTO stock_entries (
    tenant_id,
    item_id, 
    warehouse_id,
    quantity, 
    available_quantity,
    allocated_quantity,
    created_at,
    updated_at
)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    i.id,
    (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1),
    452.0,
    452.0,
    0,
    NOW(),
    NOW()
FROM items i
WHERE i.code = '10CM-ONE-SIDED'
  AND NOT EXISTS (
      SELECT 1 FROM stock_entries se
      WHERE se.item_id = i.id 
        AND se.warehouse_id = (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1)
  )
LIMIT 1;

-- Stock for 10cm one sided JST crimped Yellow
INSERT INTO stock_entries (
    tenant_id,
    item_id, 
    warehouse_id,
    quantity, 
    available_quantity,
    allocated_quantity,
    created_at,
    updated_at
)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    i.id,
    (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1),
    469.0,
    469.0,
    0,
    NOW(),
    NOW()
FROM items i
WHERE i.code = '10CM-ONE-SIDED'
  AND NOT EXISTS (
      SELECT 1 FROM stock_entries se
      WHERE se.item_id = i.id 
        AND se.warehouse_id = (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1)
  )
LIMIT 1;

-- Stock for 10cm one sided JST crimped Sky Blue
INSERT INTO stock_entries (
    tenant_id,
    item_id, 
    warehouse_id,
    quantity, 
    available_quantity,
    allocated_quantity,
    created_at,
    updated_at
)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    i.id,
    (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1),
    485.0,
    485.0,
    0,
    NOW(),
    NOW()
FROM items i
WHERE i.code = '10CM-ONE-SIDED'
  AND NOT EXISTS (
      SELECT 1 FROM stock_entries se
      WHERE se.item_id = i.id 
        AND se.warehouse_id = (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1)
  )
LIMIT 1;

-- Stock for 10cm one sided JST crimped Pink
INSERT INTO stock_entries (
    tenant_id,
    item_id, 
    warehouse_id,
    quantity, 
    available_quantity,
    allocated_quantity,
    created_at,
    updated_at
)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    i.id,
    (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1),
    479.0,
    479.0,
    0,
    NOW(),
    NOW()
FROM items i
WHERE i.code = '10CM-ONE-SIDED'
  AND NOT EXISTS (
      SELECT 1 FROM stock_entries se
      WHERE se.item_id = i.id 
        AND se.warehouse_id = (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1)
  )
LIMIT 1;

-- Stock for 10cm one sided JST crimped Orange
INSERT INTO stock_entries (
    tenant_id,
    item_id, 
    warehouse_id,
    quantity, 
    available_quantity,
    allocated_quantity,
    created_at,
    updated_at
)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    i.id,
    (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1),
    512.0,
    512.0,
    0,
    NOW(),
    NOW()
FROM items i
WHERE i.code = '10CM-ONE-SIDED'
  AND NOT EXISTS (
      SELECT 1 FROM stock_entries se
      WHERE se.item_id = i.id 
        AND se.warehouse_id = (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1)
  )
LIMIT 1;

-- Stock for 10cm one sided JST crimped Dark Blue
INSERT INTO stock_entries (
    tenant_id,
    item_id, 
    warehouse_id,
    quantity, 
    available_quantity,
    allocated_quantity,
    created_at,
    updated_at
)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    i.id,
    (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1),
    450.0,
    450.0,
    0,
    NOW(),
    NOW()
FROM items i
WHERE i.code = '10CM-ONE-SIDED'
  AND NOT EXISTS (
      SELECT 1 FROM stock_entries se
      WHERE se.item_id = i.id 
        AND se.warehouse_id = (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1)
  )
LIMIT 1;

-- Stock for 10cm one sided JST crimped Light Brown
INSERT INTO stock_entries (
    tenant_id,
    item_id, 
    warehouse_id,
    quantity, 
    available_quantity,
    allocated_quantity,
    created_at,
    updated_at
)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    i.id,
    (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1),
    90.0,
    90.0,
    0,
    NOW(),
    NOW()
FROM items i
WHERE i.code = '10CM-ONE-SIDED'
  AND NOT EXISTS (
      SELECT 1 FROM stock_entries se
      WHERE se.item_id = i.id 
        AND se.warehouse_id = (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1)
  )
LIMIT 1;

-- Stock for 10cm one sided JST crimped Dark Brown
INSERT INTO stock_entries (
    tenant_id,
    item_id, 
    warehouse_id,
    quantity, 
    available_quantity,
    allocated_quantity,
    created_at,
    updated_at
)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    i.id,
    (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1),
    210.0,
    210.0,
    0,
    NOW(),
    NOW()
FROM items i
WHERE i.code = '10CM-ONE-SIDED'
  AND NOT EXISTS (
      SELECT 1 FROM stock_entries se
      WHERE se.item_id = i.id 
        AND se.warehouse_id = (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1)
  )
LIMIT 1;

-- Stock for 10cm one sided JST crimped White with Red strip
INSERT INTO stock_entries (
    tenant_id,
    item_id, 
    warehouse_id,
    quantity, 
    available_quantity,
    allocated_quantity,
    created_at,
    updated_at
)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    i.id,
    (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1),
    483.0,
    483.0,
    0,
    NOW(),
    NOW()
FROM items i
WHERE i.code = '10CM-ONE-SIDED'
  AND NOT EXISTS (
      SELECT 1 FROM stock_entries se
      WHERE se.item_id = i.id 
        AND se.warehouse_id = (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1)
  )
LIMIT 1;

-- Stock for 10cm one sided JST crimped White with black strip
INSERT INTO stock_entries (
    tenant_id,
    item_id, 
    warehouse_id,
    quantity, 
    available_quantity,
    allocated_quantity,
    created_at,
    updated_at
)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    i.id,
    (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1),
    470.0,
    470.0,
    0,
    NOW(),
    NOW()
FROM items i
WHERE i.code = '10CM-ONE-SIDED'
  AND NOT EXISTS (
      SELECT 1 FROM stock_entries se
      WHERE se.item_id = i.id 
        AND se.warehouse_id = (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1)
  )
LIMIT 1;

-- Stock for 10cm one sided JST crimped White
INSERT INTO stock_entries (
    tenant_id,
    item_id, 
    warehouse_id,
    quantity, 
    available_quantity,
    allocated_quantity,
    created_at,
    updated_at
)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    i.id,
    (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1),
    584.0,
    584.0,
    0,
    NOW(),
    NOW()
FROM items i
WHERE i.code = '10CM-ONE-SIDED'
  AND NOT EXISTS (
      SELECT 1 FROM stock_entries se
      WHERE se.item_id = i.id 
        AND se.warehouse_id = (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1)
  )
LIMIT 1;

-- Stock for 10cm one sided JST crimped Red
INSERT INTO stock_entries (
    tenant_id,
    item_id, 
    warehouse_id,
    quantity, 
    available_quantity,
    allocated_quantity,
    created_at,
    updated_at
)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    i.id,
    (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1),
    190.0,
    190.0,
    0,
    NOW(),
    NOW()
FROM items i
WHERE i.code = '10CM-ONE-SIDED'
  AND NOT EXISTS (
      SELECT 1 FROM stock_entries se
      WHERE se.item_id = i.id 
        AND se.warehouse_id = (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1)
  )
LIMIT 1;

-- Stock for 10cm one sided JST crimped Light Grey
INSERT INTO stock_entries (
    tenant_id,
    item_id, 
    warehouse_id,
    quantity, 
    available_quantity,
    allocated_quantity,
    created_at,
    updated_at
)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    i.id,
    (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1),
    205.0,
    205.0,
    0,
    NOW(),
    NOW()
FROM items i
WHERE i.code = '10CM-ONE-SIDED'
  AND NOT EXISTS (
      SELECT 1 FROM stock_entries se
      WHERE se.item_id = i.id 
        AND se.warehouse_id = (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1)
  )
LIMIT 1;

-- Stock for 10cm one sided JST crimped Dark Parrot Green
INSERT INTO stock_entries (
    tenant_id,
    item_id, 
    warehouse_id,
    quantity, 
    available_quantity,
    allocated_quantity,
    created_at,
    updated_at
)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    i.id,
    (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1),
    200.0,
    200.0,
    0,
    NOW(),
    NOW()
FROM items i
WHERE i.code = '10CM-ONE-SIDED'
  AND NOT EXISTS (
      SELECT 1 FROM stock_entries se
      WHERE se.item_id = i.id 
        AND se.warehouse_id = (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1)
  )
LIMIT 1;

-- Stock for Tactile switch for reset two leg
INSERT INTO stock_entries (
    tenant_id,
    item_id, 
    warehouse_id,
    quantity, 
    available_quantity,
    allocated_quantity,
    created_at,
    updated_at
)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    i.id,
    (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1),
    78.0,
    78.0,
    0,
    NOW(),
    NOW()
FROM items i
WHERE i.code = 'TACTILE-SWITCH-FOR'
  AND NOT EXISTS (
      SELECT 1 FROM stock_entries se
      WHERE se.item_id = i.id 
        AND se.warehouse_id = (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1)
  )
LIMIT 1;

-- Stock for 915MHz Antenna
INSERT INTO stock_entries (
    tenant_id,
    item_id, 
    warehouse_id,
    quantity, 
    available_quantity,
    allocated_quantity,
    created_at,
    updated_at
)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    i.id,
    (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1),
    40.0,
    40.0,
    0,
    NOW(),
    NOW()
FROM items i
WHERE i.code = '915MHZ-ANTENNA'
  AND NOT EXISTS (
      SELECT 1 FROM stock_entries se
      WHERE se.item_id = i.id 
        AND se.warehouse_id = (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1)
  )
LIMIT 1;

-- Stock for Ipex4 to SMA converter extension (1675015) (Antenna pigtail connectror)
INSERT INTO stock_entries (
    tenant_id,
    item_id, 
    warehouse_id,
    quantity, 
    available_quantity,
    allocated_quantity,
    created_at,
    updated_at
)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    i.id,
    (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1),
    12.0,
    12.0,
    0,
    NOW(),
    NOW()
FROM items i
WHERE i.code = 'IPEX4-TO-SMA'
  AND NOT EXISTS (
      SELECT 1 FROM stock_entries se
      WHERE se.item_id = i.id 
        AND se.warehouse_id = (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1)
  )
LIMIT 1;

-- Stock for Ipex4 to SMA converter extension (for R9MM ipex4)
INSERT INTO stock_entries (
    tenant_id,
    item_id, 
    warehouse_id,
    quantity, 
    available_quantity,
    allocated_quantity,
    created_at,
    updated_at
)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    i.id,
    (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1),
    42.0,
    42.0,
    0,
    NOW(),
    NOW()
FROM items i
WHERE i.code = 'IPEX4-TO-SMA'
  AND NOT EXISTS (
      SELECT 1 FROM stock_entries se
      WHERE se.item_id = i.id 
        AND se.warehouse_id = (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1)
  )
LIMIT 1;

-- Stock for R9M Antenna Extension wire RP-SMA to Open
INSERT INTO stock_entries (
    tenant_id,
    item_id, 
    warehouse_id,
    quantity, 
    available_quantity,
    allocated_quantity,
    created_at,
    updated_at
)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    i.id,
    (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1),
    197.0,
    197.0,
    0,
    NOW(),
    NOW()
FROM items i
WHERE i.code = 'R9M-ANTENNA-EXTENSION'
  AND NOT EXISTS (
      SELECT 1 FROM stock_entries se
      WHERE se.item_id = i.id 
        AND se.warehouse_id = (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1)
  )
LIMIT 1;

-- Stock for 20 AWG Silicone Red - Wire
INSERT INTO stock_entries (
    tenant_id,
    item_id, 
    warehouse_id,
    quantity, 
    available_quantity,
    allocated_quantity,
    created_at,
    updated_at
)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    i.id,
    (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1),
    25.0,
    25.0,
    0,
    NOW(),
    NOW()
FROM items i
WHERE i.code = '20-AWG-SILICONE'
  AND NOT EXISTS (
      SELECT 1 FROM stock_entries se
      WHERE se.item_id = i.id 
        AND se.warehouse_id = (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1)
  )
LIMIT 1;

-- Stock for 25Core Wire 14/38
INSERT INTO stock_entries (
    tenant_id,
    item_id, 
    warehouse_id,
    quantity, 
    available_quantity,
    allocated_quantity,
    created_at,
    updated_at
)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    i.id,
    (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1),
    10.0,
    10.0,
    0,
    NOW(),
    NOW()
FROM items i
WHERE i.code = '25CORE-WIRE-1438'
  AND NOT EXISTS (
      SELECT 1 FROM stock_entries se
      WHERE se.item_id = i.id 
        AND se.warehouse_id = (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1)
  )
LIMIT 1;

-- Stock for 20Core Wire 14/38
INSERT INTO stock_entries (
    tenant_id,
    item_id, 
    warehouse_id,
    quantity, 
    available_quantity,
    allocated_quantity,
    created_at,
    updated_at
)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    i.id,
    (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1),
    400.0,
    400.0,
    0,
    NOW(),
    NOW()
FROM items i
WHERE i.code = '20CORE-WIRE-1438'
  AND NOT EXISTS (
      SELECT 1 FROM stock_entries se
      WHERE se.item_id = i.id 
        AND se.warehouse_id = (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1)
  )
LIMIT 1;

-- Stock for 8core Wire 14/38
INSERT INTO stock_entries (
    tenant_id,
    item_id, 
    warehouse_id,
    quantity, 
    available_quantity,
    allocated_quantity,
    created_at,
    updated_at
)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    i.id,
    (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1),
    33.0,
    33.0,
    0,
    NOW(),
    NOW()
FROM items i
WHERE i.code = '8CORE-WIRE-1438'
  AND NOT EXISTS (
      SELECT 1 FROM stock_entries se
      WHERE se.item_id = i.id 
        AND se.warehouse_id = (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1)
  )
LIMIT 1;

-- Stock for 14/38 16 Core Wire
INSERT INTO stock_entries (
    tenant_id,
    item_id, 
    warehouse_id,
    quantity, 
    available_quantity,
    allocated_quantity,
    created_at,
    updated_at
)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    i.id,
    (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1),
    10.0,
    10.0,
    0,
    NOW(),
    NOW()
FROM items i
WHERE i.code = '1438-16-CORE'
  AND NOT EXISTS (
      SELECT 1 FROM stock_entries se
      WHERE se.item_id = i.id 
        AND se.warehouse_id = (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1)
  )
LIMIT 1;

-- Stock for Red 14/38 wire
INSERT INTO stock_entries (
    tenant_id,
    item_id, 
    warehouse_id,
    quantity, 
    available_quantity,
    allocated_quantity,
    created_at,
    updated_at
)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    i.id,
    (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1),
    259.0,
    259.0,
    0,
    NOW(),
    NOW()
FROM items i
WHERE i.code = 'RED-1438-WIRE'
  AND NOT EXISTS (
      SELECT 1 FROM stock_entries se
      WHERE se.item_id = i.id 
        AND se.warehouse_id = (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1)
  )
LIMIT 1;

-- Stock for Black 14/38 Wire
INSERT INTO stock_entries (
    tenant_id,
    item_id, 
    warehouse_id,
    quantity, 
    available_quantity,
    allocated_quantity,
    created_at,
    updated_at
)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    i.id,
    (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1),
    259.0,
    259.0,
    0,
    NOW(),
    NOW()
FROM items i
WHERE i.code = 'BLACK-1438-WIRE'
  AND NOT EXISTS (
      SELECT 1 FROM stock_entries se
      WHERE se.item_id = i.id 
        AND se.warehouse_id = (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1)
  )
LIMIT 1;

-- Stock for Yellow 14/38 Wire
INSERT INTO stock_entries (
    tenant_id,
    item_id, 
    warehouse_id,
    quantity, 
    available_quantity,
    allocated_quantity,
    created_at,
    updated_at
)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    i.id,
    (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1),
    75.0,
    75.0,
    0,
    NOW(),
    NOW()
FROM items i
WHERE i.code = 'YELLOW-1438-WIRE'
  AND NOT EXISTS (
      SELECT 1 FROM stock_entries se
      WHERE se.item_id = i.id 
        AND se.warehouse_id = (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1)
  )
LIMIT 1;

-- Stock for White 14/38 Wire
INSERT INTO stock_entries (
    tenant_id,
    item_id, 
    warehouse_id,
    quantity, 
    available_quantity,
    allocated_quantity,
    created_at,
    updated_at
)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    i.id,
    (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1),
    75.0,
    75.0,
    0,
    NOW(),
    NOW()
FROM items i
WHERE i.code = 'WHITE-1438-WIRE'
  AND NOT EXISTS (
      SELECT 1 FROM stock_entries se
      WHERE se.item_id = i.id 
        AND se.warehouse_id = (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1)
  )
LIMIT 1;

-- Stock for Sky Blue 14/38 Wire
INSERT INTO stock_entries (
    tenant_id,
    item_id, 
    warehouse_id,
    quantity, 
    available_quantity,
    allocated_quantity,
    created_at,
    updated_at
)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    i.id,
    (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1),
    75.0,
    75.0,
    0,
    NOW(),
    NOW()
FROM items i
WHERE i.code = 'SKY-BLUE-1438'
  AND NOT EXISTS (
      SELECT 1 FROM stock_entries se
      WHERE se.item_id = i.id 
        AND se.warehouse_id = (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1)
  )
LIMIT 1;

-- Stock for Orange 14/38 Wire
INSERT INTO stock_entries (
    tenant_id,
    item_id, 
    warehouse_id,
    quantity, 
    available_quantity,
    allocated_quantity,
    created_at,
    updated_at
)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    i.id,
    (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1),
    75.0,
    75.0,
    0,
    NOW(),
    NOW()
FROM items i
WHERE i.code = 'ORANGE-1438-WIRE'
  AND NOT EXISTS (
      SELECT 1 FROM stock_entries se
      WHERE se.item_id = i.id 
        AND se.warehouse_id = (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1)
  )
LIMIT 1;

-- Stock for Green 14/38 Wire
INSERT INTO stock_entries (
    tenant_id,
    item_id, 
    warehouse_id,
    quantity, 
    available_quantity,
    allocated_quantity,
    created_at,
    updated_at
)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    i.id,
    (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1),
    75.0,
    75.0,
    0,
    NOW(),
    NOW()
FROM items i
WHERE i.code = 'GREEN-1438-WIRE'
  AND NOT EXISTS (
      SELECT 1 FROM stock_entries se
      WHERE se.item_id = i.id 
        AND se.warehouse_id = (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1)
  )
LIMIT 1;

-- Stock for Purple 14/38 Wire
INSERT INTO stock_entries (
    tenant_id,
    item_id, 
    warehouse_id,
    quantity, 
    available_quantity,
    allocated_quantity,
    created_at,
    updated_at
)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    i.id,
    (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1),
    75.0,
    75.0,
    0,
    NOW(),
    NOW()
FROM items i
WHERE i.code = 'PURPLE-1438-WIRE'
  AND NOT EXISTS (
      SELECT 1 FROM stock_entries se
      WHERE se.item_id = i.id 
        AND se.warehouse_id = (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1)
  )
LIMIT 1;

-- Stock for Brown 14/38 Wire
INSERT INTO stock_entries (
    tenant_id,
    item_id, 
    warehouse_id,
    quantity, 
    available_quantity,
    allocated_quantity,
    created_at,
    updated_at
)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    i.id,
    (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1),
    75.0,
    75.0,
    0,
    NOW(),
    NOW()
FROM items i
WHERE i.code = 'BROWN-1438-WIRE'
  AND NOT EXISTS (
      SELECT 1 FROM stock_entries se
      WHERE se.item_id = i.id 
        AND se.warehouse_id = (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1)
  )
LIMIT 1;

-- Stock for Aft plate Acrylice for Template
INSERT INTO stock_entries (
    tenant_id,
    item_id, 
    warehouse_id,
    quantity, 
    available_quantity,
    allocated_quantity,
    created_at,
    updated_at
)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    i.id,
    (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1),
    250.0,
    250.0,
    0,
    NOW(),
    NOW()
FROM items i
WHERE i.code = 'AFT-PLATE-ACRYLICE'
  AND NOT EXISTS (
      SELECT 1 FROM stock_entries se
      WHERE se.item_id = i.id 
        AND se.warehouse_id = (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1)
  )
LIMIT 1;

-- Stock for 12S Lipo Charger
INSERT INTO stock_entries (
    tenant_id,
    item_id, 
    warehouse_id,
    quantity, 
    available_quantity,
    allocated_quantity,
    created_at,
    updated_at
)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    i.id,
    (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1),
    13.0,
    13.0,
    0,
    NOW(),
    NOW()
FROM items i
WHERE i.code = '12S-LIPO-CHARGER'
  AND NOT EXISTS (
      SELECT 1 FROM stock_entries se
      WHERE se.item_id = i.id 
        AND se.warehouse_id = (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1)
  )
LIMIT 1;

-- Stock for 8S Lipo Charger ISDT Q8
INSERT INTO stock_entries (
    tenant_id,
    item_id, 
    warehouse_id,
    quantity, 
    available_quantity,
    allocated_quantity,
    created_at,
    updated_at
)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    i.id,
    (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1),
    1.0,
    1.0,
    0,
    NOW(),
    NOW()
FROM items i
WHERE i.code = '8S-LIPO-CHARGER'
  AND NOT EXISTS (
      SELECT 1 FROM stock_entries se
      WHERE se.item_id = i.id 
        AND se.warehouse_id = (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1)
  )
LIMIT 1;

-- Stock for 8kg Hull
INSERT INTO stock_entries (
    tenant_id,
    item_id, 
    warehouse_id,
    quantity, 
    available_quantity,
    allocated_quantity,
    created_at,
    updated_at
)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    i.id,
    (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1),
    30.0,
    30.0,
    0,
    NOW(),
    NOW()
FROM items i
WHERE i.code = '8KG-HULL'
  AND NOT EXISTS (
      SELECT 1 FROM stock_entries se
      WHERE se.item_id = i.id 
        AND se.warehouse_id = (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1)
  )
LIMIT 1;

-- Stock for JCB Body cum mounting frame
INSERT INTO stock_entries (
    tenant_id,
    item_id, 
    warehouse_id,
    quantity, 
    available_quantity,
    allocated_quantity,
    created_at,
    updated_at
)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    i.id,
    (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1),
    20.0,
    20.0,
    0,
    NOW(),
    NOW()
FROM items i
WHERE i.code = 'JCB-BODY-CUM'
  AND NOT EXISTS (
      SELECT 1 FROM stock_entries se
      WHERE se.item_id = i.id 
        AND se.warehouse_id = (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1)
  )
LIMIT 1;

-- Stock for SR Structure
INSERT INTO stock_entries (
    tenant_id,
    item_id, 
    warehouse_id,
    quantity, 
    available_quantity,
    allocated_quantity,
    created_at,
    updated_at
)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    i.id,
    (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1),
    25.0,
    25.0,
    0,
    NOW(),
    NOW()
FROM items i
WHERE i.code = 'SR-STRUCTURE'
  AND NOT EXISTS (
      SELECT 1 FROM stock_entries se
      WHERE se.item_id = i.id 
        AND se.warehouse_id = (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1)
  )
LIMIT 1;

-- Stock for SR Pillow
INSERT INTO stock_entries (
    tenant_id,
    item_id, 
    warehouse_id,
    quantity, 
    available_quantity,
    allocated_quantity,
    created_at,
    updated_at
)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    i.id,
    (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1),
    59.0,
    59.0,
    0,
    NOW(),
    NOW()
FROM items i
WHERE i.code = 'SR-PILLOW'
  AND NOT EXISTS (
      SELECT 1 FROM stock_entries se
      WHERE se.item_id = i.id 
        AND se.warehouse_id = (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1)
  )
LIMIT 1;

-- Stock for 2mm FRP 60x70mm with 18 mm hole
INSERT INTO stock_entries (
    tenant_id,
    item_id, 
    warehouse_id,
    quantity, 
    available_quantity,
    allocated_quantity,
    created_at,
    updated_at
)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    i.id,
    (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1),
    73.0,
    73.0,
    0,
    NOW(),
    NOW()
FROM items i
WHERE i.code = '2MM-FRP-60X70MM'
  AND NOT EXISTS (
      SELECT 1 FROM stock_entries se
      WHERE se.item_id = i.id 
        AND se.warehouse_id = (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1)
  )
LIMIT 1;

-- Stock for Battery Clamp
INSERT INTO stock_entries (
    tenant_id,
    item_id, 
    warehouse_id,
    quantity, 
    available_quantity,
    allocated_quantity,
    created_at,
    updated_at
)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    i.id,
    (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1),
    70.0,
    70.0,
    0,
    NOW(),
    NOW()
FROM items i
WHERE i.code = 'BATTERY-CLAMP'
  AND NOT EXISTS (
      SELECT 1 FROM stock_entries se
      WHERE se.item_id = i.id 
        AND se.warehouse_id = (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1)
  )
LIMIT 1;

-- Stock for Electronic Box Top Lid
INSERT INTO stock_entries (
    tenant_id,
    item_id, 
    warehouse_id,
    quantity, 
    available_quantity,
    allocated_quantity,
    created_at,
    updated_at
)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    i.id,
    (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1),
    28.0,
    28.0,
    0,
    NOW(),
    NOW()
FROM items i
WHERE i.code = 'ELECTRONIC-BOX-TOP'
  AND NOT EXISTS (
      SELECT 1 FROM stock_entries se
      WHERE se.item_id = i.id 
        AND se.warehouse_id = (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1)
  )
LIMIT 1;

-- Stock for Zip ties 100x3 MultiCompro
INSERT INTO stock_entries (
    tenant_id,
    item_id, 
    warehouse_id,
    quantity, 
    available_quantity,
    allocated_quantity,
    created_at,
    updated_at
)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    i.id,
    (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1),
    15.0,
    15.0,
    0,
    NOW(),
    NOW()
FROM items i
WHERE i.code = 'ZIP-TIES-100X3'
  AND NOT EXISTS (
      SELECT 1 FROM stock_entries se
      WHERE se.item_id = i.id 
        AND se.warehouse_id = (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1)
  )
LIMIT 1;

-- Stock for Ferrite Core
INSERT INTO stock_entries (
    tenant_id,
    item_id, 
    warehouse_id,
    quantity, 
    available_quantity,
    allocated_quantity,
    created_at,
    updated_at
)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    i.id,
    (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1),
    443.0,
    443.0,
    0,
    NOW(),
    NOW()
FROM items i
WHERE i.code = 'FERRITE-CORE'
  AND NOT EXISTS (
      SELECT 1 FROM stock_entries se
      WHERE se.item_id = i.id 
        AND se.warehouse_id = (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1)
  )
LIMIT 1;

-- Stock for SY21-15 pin panel mount(Male)
INSERT INTO stock_entries (
    tenant_id,
    item_id, 
    warehouse_id,
    quantity, 
    available_quantity,
    allocated_quantity,
    created_at,
    updated_at
)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    i.id,
    (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1),
    399.0,
    399.0,
    0,
    NOW(),
    NOW()
FROM items i
WHERE i.code = 'SY2115-PIN-PANEL'
  AND NOT EXISTS (
      SELECT 1 FROM stock_entries se
      WHERE se.item_id = i.id 
        AND se.warehouse_id = (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1)
  )
LIMIT 1;

-- Stock for SY21-15 pin Cable Mount(Female)
INSERT INTO stock_entries (
    tenant_id,
    item_id, 
    warehouse_id,
    quantity, 
    available_quantity,
    allocated_quantity,
    created_at,
    updated_at
)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    i.id,
    (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1),
    399.0,
    399.0,
    0,
    NOW(),
    NOW()
FROM items i
WHERE i.code = 'SY2115-PIN-CABLE'
  AND NOT EXISTS (
      SELECT 1 FROM stock_entries se
      WHERE se.item_id = i.id 
        AND se.warehouse_id = (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1)
  )
LIMIT 1;

-- Stock for SY21-15 pin panel mount(Female)
INSERT INTO stock_entries (
    tenant_id,
    item_id, 
    warehouse_id,
    quantity, 
    available_quantity,
    allocated_quantity,
    created_at,
    updated_at
)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    i.id,
    (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1),
    41.0,
    41.0,
    0,
    NOW(),
    NOW()
FROM items i
WHERE i.code = 'SY2115-PIN-PANEL'
  AND NOT EXISTS (
      SELECT 1 FROM stock_entries se
      WHERE se.item_id = i.id 
        AND se.warehouse_id = (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1)
  )
LIMIT 1;

-- Stock for SY21-15 pin Cable Mount(Male)
INSERT INTO stock_entries (
    tenant_id,
    item_id, 
    warehouse_id,
    quantity, 
    available_quantity,
    allocated_quantity,
    created_at,
    updated_at
)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    i.id,
    (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1),
    32.0,
    32.0,
    0,
    NOW(),
    NOW()
FROM items i
WHERE i.code = 'SY2115-PIN-CABLE'
  AND NOT EXISTS (
      SELECT 1 FROM stock_entries se
      WHERE se.item_id = i.id 
        AND se.warehouse_id = (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1)
  )
LIMIT 1;

-- Stock for WY-28 Metal connector CM
INSERT INTO stock_entries (
    tenant_id,
    item_id, 
    warehouse_id,
    quantity, 
    available_quantity,
    allocated_quantity,
    created_at,
    updated_at
)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    i.id,
    (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1),
    174.0,
    174.0,
    0,
    NOW(),
    NOW()
FROM items i
WHERE i.code = 'WY28-METAL-CONNECTOR'
  AND NOT EXISTS (
      SELECT 1 FROM stock_entries se
      WHERE se.item_id = i.id 
        AND se.warehouse_id = (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1)
  )
LIMIT 1;

-- Stock for WY-28 Metal connector PM
INSERT INTO stock_entries (
    tenant_id,
    item_id, 
    warehouse_id,
    quantity, 
    available_quantity,
    allocated_quantity,
    created_at,
    updated_at
)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    i.id,
    (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1),
    173.0,
    173.0,
    0,
    NOW(),
    NOW()
FROM items i
WHERE i.code = 'WY28-METAL-CONNECTOR'
  AND NOT EXISTS (
      SELECT 1 FROM stock_entries se
      WHERE se.item_id = i.id 
        AND se.warehouse_id = (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1)
  )
LIMIT 1;

-- Stock for WK-15 IP68 Cable Metal Connector
INSERT INTO stock_entries (
    tenant_id,
    item_id, 
    warehouse_id,
    quantity, 
    available_quantity,
    allocated_quantity,
    created_at,
    updated_at
)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    i.id,
    (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1),
    5.0,
    5.0,
    0,
    NOW(),
    NOW()
FROM items i
WHERE i.code = 'WK15-IP68-CABLE'
  AND NOT EXISTS (
      SELECT 1 FROM stock_entries se
      WHERE se.item_id = i.id 
        AND se.warehouse_id = (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1)
  )
LIMIT 1;

-- Stock for WK-15 IP68 Cable Metal Connector
INSERT INTO stock_entries (
    tenant_id,
    item_id, 
    warehouse_id,
    quantity, 
    available_quantity,
    allocated_quantity,
    created_at,
    updated_at
)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    i.id,
    (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1),
    5.0,
    5.0,
    0,
    NOW(),
    NOW()
FROM items i
WHERE i.code = 'WK15-IP68-CABLE'
  AND NOT EXISTS (
      SELECT 1 FROM stock_entries se
      WHERE se.item_id = i.id 
        AND se.warehouse_id = (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1)
  )
LIMIT 1;

-- Stock for 15 pin IP68 connectors (Female)
INSERT INTO stock_entries (
    tenant_id,
    item_id, 
    warehouse_id,
    quantity, 
    available_quantity,
    allocated_quantity,
    created_at,
    updated_at
)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    i.id,
    (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1),
    5.0,
    5.0,
    0,
    NOW(),
    NOW()
FROM items i
WHERE i.code = '15-PIN-IP68'
  AND NOT EXISTS (
      SELECT 1 FROM stock_entries se
      WHERE se.item_id = i.id 
        AND se.warehouse_id = (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1)
  )
LIMIT 1;

-- Stock for 15 pin IP68 Connectors (Male)
INSERT INTO stock_entries (
    tenant_id,
    item_id, 
    warehouse_id,
    quantity, 
    available_quantity,
    allocated_quantity,
    created_at,
    updated_at
)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    i.id,
    (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1),
    5.0,
    5.0,
    0,
    NOW(),
    NOW()
FROM items i
WHERE i.code = '15-PIN-IP68'
  AND NOT EXISTS (
      SELECT 1 FROM stock_entries se
      WHERE se.item_id = i.id 
        AND se.warehouse_id = (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1)
  )
LIMIT 1;

-- Stock for SA12 9pin CM Pushpull Male
INSERT INTO stock_entries (
    tenant_id,
    item_id, 
    warehouse_id,
    quantity, 
    available_quantity,
    allocated_quantity,
    created_at,
    updated_at
)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    i.id,
    (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1),
    217.0,
    217.0,
    0,
    NOW(),
    NOW()
FROM items i
WHERE i.code = 'SA12-9PIN-CM'
  AND NOT EXISTS (
      SELECT 1 FROM stock_entries se
      WHERE se.item_id = i.id 
        AND se.warehouse_id = (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1)
  )
LIMIT 1;

-- Stock for SA12 9pin PM Pushpull female
INSERT INTO stock_entries (
    tenant_id,
    item_id, 
    warehouse_id,
    quantity, 
    available_quantity,
    allocated_quantity,
    created_at,
    updated_at
)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    i.id,
    (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1),
    154.0,
    154.0,
    0,
    NOW(),
    NOW()
FROM items i
WHERE i.code = 'SA12-9PIN-PM'
  AND NOT EXISTS (
      SELECT 1 FROM stock_entries se
      WHERE se.item_id = i.id 
        AND se.warehouse_id = (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1)
  )
LIMIT 1;

-- Stock for SA12 9pin Counter
INSERT INTO stock_entries (
    tenant_id,
    item_id, 
    warehouse_id,
    quantity, 
    available_quantity,
    allocated_quantity,
    created_at,
    updated_at
)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    i.id,
    (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1),
    60.0,
    60.0,
    0,
    NOW(),
    NOW()
FROM items i
WHERE i.code = 'SA12-9PIN-COUNTER'
  AND NOT EXISTS (
      SELECT 1 FROM stock_entries se
      WHERE se.item_id = i.id 
        AND se.warehouse_id = (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1)
  )
LIMIT 1;

-- Stock for LP12 3 pin plug male clip lock CM
INSERT INTO stock_entries (
    tenant_id,
    item_id, 
    warehouse_id,
    quantity, 
    available_quantity,
    allocated_quantity,
    created_at,
    updated_at
)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    i.id,
    (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1),
    50.0,
    50.0,
    0,
    NOW(),
    NOW()
FROM items i
WHERE i.code = 'LP12-3-PIN'
  AND NOT EXISTS (
      SELECT 1 FROM stock_entries se
      WHERE se.item_id = i.id 
        AND se.warehouse_id = (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1)
  )
LIMIT 1;

-- Stock for LP12 3 pin socket female clip lock PM
INSERT INTO stock_entries (
    tenant_id,
    item_id, 
    warehouse_id,
    quantity, 
    available_quantity,
    allocated_quantity,
    created_at,
    updated_at
)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    i.id,
    (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1),
    50.0,
    50.0,
    0,
    NOW(),
    NOW()
FROM items i
WHERE i.code = 'LP12-3-PIN'
  AND NOT EXISTS (
      SELECT 1 FROM stock_entries se
      WHERE se.item_id = i.id 
        AND se.warehouse_id = (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1)
  )
LIMIT 1;

-- Stock for LP12 4 pin plug male clip lock CM
INSERT INTO stock_entries (
    tenant_id,
    item_id, 
    warehouse_id,
    quantity, 
    available_quantity,
    allocated_quantity,
    created_at,
    updated_at
)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    i.id,
    (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1),
    2.0,
    2.0,
    0,
    NOW(),
    NOW()
FROM items i
WHERE i.code = 'LP12-4-PIN'
  AND NOT EXISTS (
      SELECT 1 FROM stock_entries se
      WHERE se.item_id = i.id 
        AND se.warehouse_id = (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1)
  )
LIMIT 1;

-- Stock for LP24 24 pin plug female clip lock CM
INSERT INTO stock_entries (
    tenant_id,
    item_id, 
    warehouse_id,
    quantity, 
    available_quantity,
    allocated_quantity,
    created_at,
    updated_at
)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    i.id,
    (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1),
    126.0,
    126.0,
    0,
    NOW(),
    NOW()
FROM items i
WHERE i.code = 'LP24-24-PIN'
  AND NOT EXISTS (
      SELECT 1 FROM stock_entries se
      WHERE se.item_id = i.id 
        AND se.warehouse_id = (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1)
  )
LIMIT 1;

-- Stock for LP24 24 pin socket male clip lock PM
INSERT INTO stock_entries (
    tenant_id,
    item_id, 
    warehouse_id,
    quantity, 
    available_quantity,
    allocated_quantity,
    created_at,
    updated_at
)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    i.id,
    (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1),
    215.0,
    215.0,
    0,
    NOW(),
    NOW()
FROM items i
WHERE i.code = 'LP24-24-PIN'
  AND NOT EXISTS (
      SELECT 1 FROM stock_entries se
      WHERE se.item_id = i.id 
        AND se.warehouse_id = (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1)
  )
LIMIT 1;

-- Stock for Water tank for JCB
INSERT INTO stock_entries (
    tenant_id,
    item_id, 
    warehouse_id,
    quantity, 
    available_quantity,
    allocated_quantity,
    created_at,
    updated_at
)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    i.id,
    (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1),
    28.0,
    28.0,
    0,
    NOW(),
    NOW()
FROM items i
WHERE i.code = 'WATER-TANK-FOR'
  AND NOT EXISTS (
      SELECT 1 FROM stock_entries se
      WHERE se.item_id = i.id 
        AND se.warehouse_id = (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1)
  )
LIMIT 1;

-- Stock for BlueRobotics Leak probe
INSERT INTO stock_entries (
    tenant_id,
    item_id, 
    warehouse_id,
    quantity, 
    available_quantity,
    allocated_quantity,
    created_at,
    updated_at
)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    i.id,
    (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1),
    350.0,
    350.0,
    0,
    NOW(),
    NOW()
FROM items i
WHERE i.code = 'BLUEROBOTICS-LEAK-PROBE'
  AND NOT EXISTS (
      SELECT 1 FROM stock_entries se
      WHERE se.item_id = i.id 
        AND se.warehouse_id = (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1)
  )
LIMIT 1;

-- Stock for BlueRobotics Indicator
INSERT INTO stock_entries (
    tenant_id,
    item_id, 
    warehouse_id,
    quantity, 
    available_quantity,
    allocated_quantity,
    created_at,
    updated_at
)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    i.id,
    (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1),
    16.0,
    16.0,
    0,
    NOW(),
    NOW()
FROM items i
WHERE i.code = 'BLUEROBOTICS-INDICATOR'
  AND NOT EXISTS (
      SELECT 1 FROM stock_entries se
      WHERE se.item_id = i.id 
        AND se.warehouse_id = (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1)
  )
LIMIT 1;

-- Stock for IP68 Rotary main Switch
INSERT INTO stock_entries (
    tenant_id,
    item_id, 
    warehouse_id,
    quantity, 
    available_quantity,
    allocated_quantity,
    created_at,
    updated_at
)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    i.id,
    (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1),
    34.0,
    34.0,
    0,
    NOW(),
    NOW()
FROM items i
WHERE i.code = 'IP68-ROTARY-MAIN'
  AND NOT EXISTS (
      SELECT 1 FROM stock_entries se
      WHERE se.item_id = i.id 
        AND se.warehouse_id = (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1)
  )
LIMIT 1;

-- Stock for Red 2835 SMD LED 1W
INSERT INTO stock_entries (
    tenant_id,
    item_id, 
    warehouse_id,
    quantity, 
    available_quantity,
    allocated_quantity,
    created_at,
    updated_at
)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    i.id,
    (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1),
    900.0,
    900.0,
    0,
    NOW(),
    NOW()
FROM items i
WHERE i.code = 'RED-2835-SMD'
  AND NOT EXISTS (
      SELECT 1 FROM stock_entries se
      WHERE se.item_id = i.id 
        AND se.warehouse_id = (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1)
  )
LIMIT 1;

-- Stock for Green 2835 SMD LED 1W
INSERT INTO stock_entries (
    tenant_id,
    item_id, 
    warehouse_id,
    quantity, 
    available_quantity,
    allocated_quantity,
    created_at,
    updated_at
)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    i.id,
    (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1),
    600.0,
    600.0,
    0,
    NOW(),
    NOW()
FROM items i
WHERE i.code = 'GREEN-2835-SMD'
  AND NOT EXISTS (
      SELECT 1 FROM stock_entries se
      WHERE se.item_id = i.id 
        AND se.warehouse_id = (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1)
  )
LIMIT 1;

-- Stock for No. 4 Self tap Screw SS304 (M4x6.5 Philips)
INSERT INTO stock_entries (
    tenant_id,
    item_id, 
    warehouse_id,
    quantity, 
    available_quantity,
    allocated_quantity,
    created_at,
    updated_at
)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    i.id,
    (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1),
    2600.0,
    2600.0,
    0,
    NOW(),
    NOW()
FROM items i
WHERE i.code = 'NO-4-SELF'
  AND NOT EXISTS (
      SELECT 1 FROM stock_entries se
      WHERE se.item_id = i.id 
        AND se.warehouse_id = (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1)
  )
LIMIT 1;

-- Stock for M2x12 Allen Head SS304
INSERT INTO stock_entries (
    tenant_id,
    item_id, 
    warehouse_id,
    quantity, 
    available_quantity,
    allocated_quantity,
    created_at,
    updated_at
)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    i.id,
    (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1),
    1500.0,
    1500.0,
    0,
    NOW(),
    NOW()
FROM items i
WHERE i.code = 'M2X12-ALLEN-HEAD'
  AND NOT EXISTS (
      SELECT 1 FROM stock_entries se
      WHERE se.item_id = i.id 
        AND se.warehouse_id = (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1)
  )
LIMIT 1;

-- Stock for M3x6 CSK Phillips
INSERT INTO stock_entries (
    tenant_id,
    item_id, 
    warehouse_id,
    quantity, 
    available_quantity,
    allocated_quantity,
    created_at,
    updated_at
)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    i.id,
    (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1),
    300.0,
    300.0,
    0,
    NOW(),
    NOW()
FROM items i
WHERE i.code = 'M3X6-CSK-PHILLIPS'
  AND NOT EXISTS (
      SELECT 1 FROM stock_entries se
      WHERE se.item_id = i.id 
        AND se.warehouse_id = (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1)
  )
LIMIT 1;

-- Stock for M3x8 CSK Phillips
INSERT INTO stock_entries (
    tenant_id,
    item_id, 
    warehouse_id,
    quantity, 
    available_quantity,
    allocated_quantity,
    created_at,
    updated_at
)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    i.id,
    (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1),
    1200.0,
    1200.0,
    0,
    NOW(),
    NOW()
FROM items i
WHERE i.code = 'M3X8-CSK-PHILLIPS'
  AND NOT EXISTS (
      SELECT 1 FROM stock_entries se
      WHERE se.item_id = i.id 
        AND se.warehouse_id = (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1)
  )
LIMIT 1;

-- Stock for M3x30 CSK Phillips
INSERT INTO stock_entries (
    tenant_id,
    item_id, 
    warehouse_id,
    quantity, 
    available_quantity,
    allocated_quantity,
    created_at,
    updated_at
)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    i.id,
    (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1),
    600.0,
    600.0,
    0,
    NOW(),
    NOW()
FROM items i
WHERE i.code = 'M3X30-CSK-PHILLIPS'
  AND NOT EXISTS (
      SELECT 1 FROM stock_entries se
      WHERE se.item_id = i.id 
        AND se.warehouse_id = (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1)
  )
LIMIT 1;

-- Stock for M3x8 Button head
INSERT INTO stock_entries (
    tenant_id,
    item_id, 
    warehouse_id,
    quantity, 
    available_quantity,
    allocated_quantity,
    created_at,
    updated_at
)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    i.id,
    (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1),
    900.0,
    900.0,
    0,
    NOW(),
    NOW()
FROM items i
WHERE i.code = 'M3X8-BUTTON-HEAD'
  AND NOT EXISTS (
      SELECT 1 FROM stock_entries se
      WHERE se.item_id = i.id 
        AND se.warehouse_id = (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1)
  )
LIMIT 1;

-- Stock for M3x10 plain washer
INSERT INTO stock_entries (
    tenant_id,
    item_id, 
    warehouse_id,
    quantity, 
    available_quantity,
    allocated_quantity,
    created_at,
    updated_at
)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    i.id,
    (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1),
    1200.0,
    1200.0,
    0,
    NOW(),
    NOW()
FROM items i
WHERE i.code = 'M3X10-PLAIN-WASHER'
  AND NOT EXISTS (
      SELECT 1 FROM stock_entries se
      WHERE se.item_id = i.id 
        AND se.warehouse_id = (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1)
  )
LIMIT 1;

-- Stock for M4x8 CSK Phillips
INSERT INTO stock_entries (
    tenant_id,
    item_id, 
    warehouse_id,
    quantity, 
    available_quantity,
    allocated_quantity,
    created_at,
    updated_at
)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    i.id,
    (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1),
    3000.0,
    3000.0,
    0,
    NOW(),
    NOW()
FROM items i
WHERE i.code = 'M4X8-CSK-PHILLIPS'
  AND NOT EXISTS (
      SELECT 1 FROM stock_entries se
      WHERE se.item_id = i.id 
        AND se.warehouse_id = (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1)
  )
LIMIT 1;

-- Stock for M4x8 CSK Phillips GI
INSERT INTO stock_entries (
    tenant_id,
    item_id, 
    warehouse_id,
    quantity, 
    available_quantity,
    allocated_quantity,
    created_at,
    updated_at
)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    i.id,
    (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1),
    300.0,
    300.0,
    0,
    NOW(),
    NOW()
FROM items i
WHERE i.code = 'M4X8-CSK-PHILLIPS'
  AND NOT EXISTS (
      SELECT 1 FROM stock_entries se
      WHERE se.item_id = i.id 
        AND se.warehouse_id = (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1)
  )
LIMIT 1;

-- Stock for M2x15 Allen Head SS304
INSERT INTO stock_entries (
    tenant_id,
    item_id, 
    warehouse_id,
    quantity, 
    available_quantity,
    allocated_quantity,
    created_at,
    updated_at
)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    i.id,
    (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1),
    300.0,
    300.0,
    0,
    NOW(),
    NOW()
FROM items i
WHERE i.code = 'M2X15-ALLEN-HEAD'
  AND NOT EXISTS (
      SELECT 1 FROM stock_entries se
      WHERE se.item_id = i.id 
        AND se.warehouse_id = (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1)
  )
LIMIT 1;

-- Stock for M4x10 CSK Phillips
INSERT INTO stock_entries (
    tenant_id,
    item_id, 
    warehouse_id,
    quantity, 
    available_quantity,
    allocated_quantity,
    created_at,
    updated_at
)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    i.id,
    (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1),
    300.0,
    300.0,
    0,
    NOW(),
    NOW()
FROM items i
WHERE i.code = 'M4X10-CSK-PHILLIPS'
  AND NOT EXISTS (
      SELECT 1 FROM stock_entries se
      WHERE se.item_id = i.id 
        AND se.warehouse_id = (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1)
  )
LIMIT 1;

-- Stock for M4x20 CSK Phillips
INSERT INTO stock_entries (
    tenant_id,
    item_id, 
    warehouse_id,
    quantity, 
    available_quantity,
    allocated_quantity,
    created_at,
    updated_at
)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    i.id,
    (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1),
    900.0,
    900.0,
    0,
    NOW(),
    NOW()
FROM items i
WHERE i.code = 'M4X20-CSK-PHILLIPS'
  AND NOT EXISTS (
      SELECT 1 FROM stock_entries se
      WHERE se.item_id = i.id 
        AND se.warehouse_id = (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1)
  )
LIMIT 1;

-- Stock for M4x12 Allen Head
INSERT INTO stock_entries (
    tenant_id,
    item_id, 
    warehouse_id,
    quantity, 
    available_quantity,
    allocated_quantity,
    created_at,
    updated_at
)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    i.id,
    (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1),
    2000.0,
    2000.0,
    0,
    NOW(),
    NOW()
FROM items i
WHERE i.code = 'M4X12-ALLEN-HEAD'
  AND NOT EXISTS (
      SELECT 1 FROM stock_entries se
      WHERE se.item_id = i.id 
        AND se.warehouse_id = (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1)
  )
LIMIT 1;

-- Stock for M4x16 Allen Head
INSERT INTO stock_entries (
    tenant_id,
    item_id, 
    warehouse_id,
    quantity, 
    available_quantity,
    allocated_quantity,
    created_at,
    updated_at
)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    i.id,
    (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1),
    600.0,
    600.0,
    0,
    NOW(),
    NOW()
FROM items i
WHERE i.code = 'M4X16-ALLEN-HEAD'
  AND NOT EXISTS (
      SELECT 1 FROM stock_entries se
      WHERE se.item_id = i.id 
        AND se.warehouse_id = (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1)
  )
LIMIT 1;

-- Stock for M4x10 Allen head
INSERT INTO stock_entries (
    tenant_id,
    item_id, 
    warehouse_id,
    quantity, 
    available_quantity,
    allocated_quantity,
    created_at,
    updated_at
)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    i.id,
    (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1),
    200.0,
    200.0,
    0,
    NOW(),
    NOW()
FROM items i
WHERE i.code = 'M4X10-ALLEN-HEAD'
  AND NOT EXISTS (
      SELECT 1 FROM stock_entries se
      WHERE se.item_id = i.id 
        AND se.warehouse_id = (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1)
  )
LIMIT 1;

-- Stock for M4x30 Allen head
INSERT INTO stock_entries (
    tenant_id,
    item_id, 
    warehouse_id,
    quantity, 
    available_quantity,
    allocated_quantity,
    created_at,
    updated_at
)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    i.id,
    (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1),
    100.0,
    100.0,
    0,
    NOW(),
    NOW()
FROM items i
WHERE i.code = 'M4X30-ALLEN-HEAD'
  AND NOT EXISTS (
      SELECT 1 FROM stock_entries se
      WHERE se.item_id = i.id 
        AND se.warehouse_id = (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1)
  )
LIMIT 1;

-- Stock for M4X40 Allen head
INSERT INTO stock_entries (
    tenant_id,
    item_id, 
    warehouse_id,
    quantity, 
    available_quantity,
    allocated_quantity,
    created_at,
    updated_at
)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    i.id,
    (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1),
    100.0,
    100.0,
    0,
    NOW(),
    NOW()
FROM items i
WHERE i.code = 'M4X40-ALLEN-HEAD'
  AND NOT EXISTS (
      SELECT 1 FROM stock_entries se
      WHERE se.item_id = i.id 
        AND se.warehouse_id = (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1)
  )
LIMIT 1;

-- Stock for M4x20 Allen Head
INSERT INTO stock_entries (
    tenant_id,
    item_id, 
    warehouse_id,
    quantity, 
    available_quantity,
    allocated_quantity,
    created_at,
    updated_at
)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    i.id,
    (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1),
    1100.0,
    1100.0,
    0,
    NOW(),
    NOW()
FROM items i
WHERE i.code = 'M4X20-ALLEN-HEAD'
  AND NOT EXISTS (
      SELECT 1 FROM stock_entries se
      WHERE se.item_id = i.id 
        AND se.warehouse_id = (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1)
  )
LIMIT 1;

-- Stock for M4x12 Button Head
INSERT INTO stock_entries (
    tenant_id,
    item_id, 
    warehouse_id,
    quantity, 
    available_quantity,
    allocated_quantity,
    created_at,
    updated_at
)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    i.id,
    (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1),
    300.0,
    300.0,
    0,
    NOW(),
    NOW()
FROM items i
WHERE i.code = 'M4X12-BUTTON-HEAD'
  AND NOT EXISTS (
      SELECT 1 FROM stock_entries se
      WHERE se.item_id = i.id 
        AND se.warehouse_id = (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1)
  )
LIMIT 1;

-- Stock for M4x12 Pan Combi
INSERT INTO stock_entries (
    tenant_id,
    item_id, 
    warehouse_id,
    quantity, 
    available_quantity,
    allocated_quantity,
    created_at,
    updated_at
)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    i.id,
    (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1),
    1500.0,
    1500.0,
    0,
    NOW(),
    NOW()
FROM items i
WHERE i.code = 'M4X12-PAN-COMBI'
  AND NOT EXISTS (
      SELECT 1 FROM stock_entries se
      WHERE se.item_id = i.id 
        AND se.warehouse_id = (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1)
  )
LIMIT 1;

-- Stock for M4x12 plain washer
INSERT INTO stock_entries (
    tenant_id,
    item_id, 
    warehouse_id,
    quantity, 
    available_quantity,
    allocated_quantity,
    created_at,
    updated_at
)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    i.id,
    (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1),
    3500.0,
    3500.0,
    0,
    NOW(),
    NOW()
FROM items i
WHERE i.code = 'M4X12-PLAIN-WASHER'
  AND NOT EXISTS (
      SELECT 1 FROM stock_entries se
      WHERE se.item_id = i.id 
        AND se.warehouse_id = (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1)
  )
LIMIT 1;

-- Stock for M4 Spring Washer
INSERT INTO stock_entries (
    tenant_id,
    item_id, 
    warehouse_id,
    quantity, 
    available_quantity,
    allocated_quantity,
    created_at,
    updated_at
)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    i.id,
    (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1),
    1700.0,
    1700.0,
    0,
    NOW(),
    NOW()
FROM items i
WHERE i.code = 'M4-SPRING-WASHER'
  AND NOT EXISTS (
      SELECT 1 FROM stock_entries se
      WHERE se.item_id = i.id 
        AND se.warehouse_id = (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1)
  )
LIMIT 1;

-- Stock for M4 Nylock
INSERT INTO stock_entries (
    tenant_id,
    item_id, 
    warehouse_id,
    quantity, 
    available_quantity,
    allocated_quantity,
    created_at,
    updated_at
)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    i.id,
    (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1),
    2400.0,
    2400.0,
    0,
    NOW(),
    NOW()
FROM items i
WHERE i.code = 'M4-NYLOCK'
  AND NOT EXISTS (
      SELECT 1 FROM stock_entries se
      WHERE se.item_id = i.id 
        AND se.warehouse_id = (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1)
  )
LIMIT 1;

-- Stock for M4 Square Nut
INSERT INTO stock_entries (
    tenant_id,
    item_id, 
    warehouse_id,
    quantity, 
    available_quantity,
    allocated_quantity,
    created_at,
    updated_at
)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    i.id,
    (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1),
    1300.0,
    1300.0,
    0,
    NOW(),
    NOW()
FROM items i
WHERE i.code = 'M4-SQUARE-NUT'
  AND NOT EXISTS (
      SELECT 1 FROM stock_entries se
      WHERE se.item_id = i.id 
        AND se.warehouse_id = (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1)
  )
LIMIT 1;

-- Stock for M4x5 Grub
INSERT INTO stock_entries (
    tenant_id,
    item_id, 
    warehouse_id,
    quantity, 
    available_quantity,
    allocated_quantity,
    created_at,
    updated_at
)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    i.id,
    (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1),
    30.0,
    30.0,
    0,
    NOW(),
    NOW()
FROM items i
WHERE i.code = 'M4X5-GRUB'
  AND NOT EXISTS (
      SELECT 1 FROM stock_entries se
      WHERE se.item_id = i.id 
        AND se.warehouse_id = (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1)
  )
LIMIT 1;

-- Stock for M5x10 Allen Head (AMCA)
INSERT INTO stock_entries (
    tenant_id,
    item_id, 
    warehouse_id,
    quantity, 
    available_quantity,
    allocated_quantity,
    created_at,
    updated_at
)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    i.id,
    (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1),
    1300.0,
    1300.0,
    0,
    NOW(),
    NOW()
FROM items i
WHERE i.code = 'M5X10-ALLEN-HEAD'
  AND NOT EXISTS (
      SELECT 1 FROM stock_entries se
      WHERE se.item_id = i.id 
        AND se.warehouse_id = (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1)
  )
LIMIT 1;

-- Stock for M5x10 Pan Torx
INSERT INTO stock_entries (
    tenant_id,
    item_id, 
    warehouse_id,
    quantity, 
    available_quantity,
    allocated_quantity,
    created_at,
    updated_at
)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    i.id,
    (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1),
    3500.0,
    3500.0,
    0,
    NOW(),
    NOW()
FROM items i
WHERE i.code = 'M5X10-PAN-TORX'
  AND NOT EXISTS (
      SELECT 1 FROM stock_entries se
      WHERE se.item_id = i.id 
        AND se.warehouse_id = (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1)
  )
LIMIT 1;

-- Stock for M5x10 Grub Screw
INSERT INTO stock_entries (
    tenant_id,
    item_id, 
    warehouse_id,
    quantity, 
    available_quantity,
    allocated_quantity,
    created_at,
    updated_at
)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    i.id,
    (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1),
    150.0,
    150.0,
    0,
    NOW(),
    NOW()
FROM items i
WHERE i.code = 'M5X10-GRUB-SCREW'
  AND NOT EXISTS (
      SELECT 1 FROM stock_entries se
      WHERE se.item_id = i.id 
        AND se.warehouse_id = (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1)
  )
LIMIT 1;

-- Stock for M6x150 Allen Head
INSERT INTO stock_entries (
    tenant_id,
    item_id, 
    warehouse_id,
    quantity, 
    available_quantity,
    allocated_quantity,
    created_at,
    updated_at
)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    i.id,
    (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1),
    400.0,
    400.0,
    0,
    NOW(),
    NOW()
FROM items i
WHERE i.code = 'M6X150-ALLEN-HEAD'
  AND NOT EXISTS (
      SELECT 1 FROM stock_entries se
      WHERE se.item_id = i.id 
        AND se.warehouse_id = (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1)
  )
LIMIT 1;

-- Stock for M6 Nylock
INSERT INTO stock_entries (
    tenant_id,
    item_id, 
    warehouse_id,
    quantity, 
    available_quantity,
    allocated_quantity,
    created_at,
    updated_at
)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    i.id,
    (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1),
    300.0,
    300.0,
    0,
    NOW(),
    NOW()
FROM items i
WHERE i.code = 'M6-NYLOCK'
  AND NOT EXISTS (
      SELECT 1 FROM stock_entries se
      WHERE se.item_id = i.id 
        AND se.warehouse_id = (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1)
  )
LIMIT 1;

-- Stock for M6x15 plain washer
INSERT INTO stock_entries (
    tenant_id,
    item_id, 
    warehouse_id,
    quantity, 
    available_quantity,
    allocated_quantity,
    created_at,
    updated_at
)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    i.id,
    (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1),
    300.0,
    300.0,
    0,
    NOW(),
    NOW()
FROM items i
WHERE i.code = 'M6X15-PLAIN-WASHER'
  AND NOT EXISTS (
      SELECT 1 FROM stock_entries se
      WHERE se.item_id = i.id 
        AND se.warehouse_id = (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1)
  )
LIMIT 1;

-- Stock for M6x10 Grub Screw
INSERT INTO stock_entries (
    tenant_id,
    item_id, 
    warehouse_id,
    quantity, 
    available_quantity,
    allocated_quantity,
    created_at,
    updated_at
)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    i.id,
    (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1),
    300.0,
    300.0,
    0,
    NOW(),
    NOW()
FROM items i
WHERE i.code = 'M6X10-GRUB-SCREW'
  AND NOT EXISTS (
      SELECT 1 FROM stock_entries se
      WHERE se.item_id = i.id 
        AND se.warehouse_id = (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1)
  )
LIMIT 1;

-- Stock for Button Head 6x12
INSERT INTO stock_entries (
    tenant_id,
    item_id, 
    warehouse_id,
    quantity, 
    available_quantity,
    allocated_quantity,
    created_at,
    updated_at
)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    i.id,
    (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1),
    100.0,
    100.0,
    0,
    NOW(),
    NOW()
FROM items i
WHERE i.code = 'BUTTON-HEAD-6X12'
  AND NOT EXISTS (
      SELECT 1 FROM stock_entries se
      WHERE se.item_id = i.id 
        AND se.warehouse_id = (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1)
  )
LIMIT 1;

-- Stock for M8x20 plain washer
INSERT INTO stock_entries (
    tenant_id,
    item_id, 
    warehouse_id,
    quantity, 
    available_quantity,
    allocated_quantity,
    created_at,
    updated_at
)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    i.id,
    (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1),
    600.0,
    600.0,
    0,
    NOW(),
    NOW()
FROM items i
WHERE i.code = 'M8X20-PLAIN-WASHER'
  AND NOT EXISTS (
      SELECT 1 FROM stock_entries se
      WHERE se.item_id = i.id 
        AND se.warehouse_id = (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1)
  )
LIMIT 1;

-- Stock for M8x25 Allen Head
INSERT INTO stock_entries (
    tenant_id,
    item_id, 
    warehouse_id,
    quantity, 
    available_quantity,
    allocated_quantity,
    created_at,
    updated_at
)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    i.id,
    (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1),
    600.0,
    600.0,
    0,
    NOW(),
    NOW()
FROM items i
WHERE i.code = 'M8X25-ALLEN-HEAD'
  AND NOT EXISTS (
      SELECT 1 FROM stock_entries se
      WHERE se.item_id = i.id 
        AND se.warehouse_id = (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1)
  )
LIMIT 1;

-- Stock for M5X12 Button HD Torx
INSERT INTO stock_entries (
    tenant_id,
    item_id, 
    warehouse_id,
    quantity, 
    available_quantity,
    allocated_quantity,
    created_at,
    updated_at
)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    i.id,
    (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1),
    1000.0,
    1000.0,
    0,
    NOW(),
    NOW()
FROM items i
WHERE i.code = 'M5X12-BUTTON-HD'
  AND NOT EXISTS (
      SELECT 1 FROM stock_entries se
      WHERE se.item_id = i.id 
        AND se.warehouse_id = (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1)
  )
LIMIT 1;

-- Stock for Copper Strips 3x2 cells
INSERT INTO stock_entries (
    tenant_id,
    item_id, 
    warehouse_id,
    quantity, 
    available_quantity,
    allocated_quantity,
    created_at,
    updated_at
)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    i.id,
    (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1),
    762.0,
    762.0,
    0,
    NOW(),
    NOW()
FROM items i
WHERE i.code = 'COPPER-STRIPS-3X2'
  AND NOT EXISTS (
      SELECT 1 FROM stock_entries se
      WHERE se.item_id = i.id 
        AND se.warehouse_id = (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1)
  )
LIMIT 1;

-- Stock for Kapton Tape
INSERT INTO stock_entries (
    tenant_id,
    item_id, 
    warehouse_id,
    quantity, 
    available_quantity,
    allocated_quantity,
    created_at,
    updated_at
)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    i.id,
    (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1),
    20.0,
    20.0,
    0,
    NOW(),
    NOW()
FROM items i
WHERE i.code = 'KAPTON-TAPE'
  AND NOT EXISTS (
      SELECT 1 FROM stock_entries se
      WHERE se.item_id = i.id 
        AND se.warehouse_id = (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1)
  )
LIMIT 1;

-- Stock for Barley paper for 21700 cylindrical cell
INSERT INTO stock_entries (
    tenant_id,
    item_id, 
    warehouse_id,
    quantity, 
    available_quantity,
    allocated_quantity,
    created_at,
    updated_at
)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    i.id,
    (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1),
    5400.0,
    5400.0,
    0,
    NOW(),
    NOW()
FROM items i
WHERE i.code = 'BARLEY-PAPER-FOR'
  AND NOT EXISTS (
      SELECT 1 FROM stock_entries se
      WHERE se.item_id = i.id 
        AND se.warehouse_id = (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1)
  )
LIMIT 1;

-- Stock for 16AWG Lead
INSERT INTO stock_entries (
    tenant_id,
    item_id, 
    warehouse_id,
    quantity, 
    available_quantity,
    allocated_quantity,
    created_at,
    updated_at
)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    i.id,
    (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1),
    3000.0,
    3000.0,
    0,
    NOW(),
    NOW()
FROM items i
WHERE i.code = '16AWG-LEAD'
  AND NOT EXISTS (
      SELECT 1 FROM stock_entries se
      WHERE se.item_id = i.id 
        AND se.warehouse_id = (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1)
  )
LIMIT 1;

-- Stock for 130x80x60 enclosure box
INSERT INTO stock_entries (
    tenant_id,
    item_id, 
    warehouse_id,
    quantity, 
    available_quantity,
    allocated_quantity,
    created_at,
    updated_at
)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    i.id,
    (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1),
    7.0,
    7.0,
    0,
    NOW(),
    NOW()
FROM items i
WHERE i.code = '130X80X60-ENCLOSURE-BOX'
  AND NOT EXISTS (
      SELECT 1 FROM stock_entries se
      WHERE se.item_id = i.id 
        AND se.warehouse_id = (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1)
  )
LIMIT 1;

-- Stock for PG-7 Cable Gland
INSERT INTO stock_entries (
    tenant_id,
    item_id, 
    warehouse_id,
    quantity, 
    available_quantity,
    allocated_quantity,
    created_at,
    updated_at
)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    i.id,
    (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1),
    164.0,
    164.0,
    0,
    NOW(),
    NOW()
FROM items i
WHERE i.code = 'PG7-CABLE-GLAND'
  AND NOT EXISTS (
      SELECT 1 FROM stock_entries se
      WHERE se.item_id = i.id 
        AND se.warehouse_id = (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1)
  )
LIMIT 1;

-- Stock for PG-9 Cable Gland(PG -11)
INSERT INTO stock_entries (
    tenant_id,
    item_id, 
    warehouse_id,
    quantity, 
    available_quantity,
    allocated_quantity,
    created_at,
    updated_at
)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    i.id,
    (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1),
    70.0,
    70.0,
    0,
    NOW(),
    NOW()
FROM items i
WHERE i.code = 'PG9-CABLE-GLANDPG'
  AND NOT EXISTS (
      SELECT 1 FROM stock_entries se
      WHERE se.item_id = i.id 
        AND se.warehouse_id = (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1)
  )
LIMIT 1;

-- Stock for Rotex14 Coupling
INSERT INTO stock_entries (
    tenant_id,
    item_id, 
    warehouse_id,
    quantity, 
    available_quantity,
    allocated_quantity,
    created_at,
    updated_at
)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    i.id,
    (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1),
    40.0,
    40.0,
    0,
    NOW(),
    NOW()
FROM items i
WHERE i.code = 'ROTEX14-COUPLING'
  AND NOT EXISTS (
      SELECT 1 FROM stock_entries se
      WHERE se.item_id = i.id 
        AND se.warehouse_id = (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1)
  )
LIMIT 1;

-- Stock for Electronic Box
INSERT INTO stock_entries (
    tenant_id,
    item_id, 
    warehouse_id,
    quantity, 
    available_quantity,
    allocated_quantity,
    created_at,
    updated_at
)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    i.id,
    (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1),
    308.0,
    308.0,
    0,
    NOW(),
    NOW()
FROM items i
WHERE i.code = 'ELECTRONIC-BOX'
  AND NOT EXISTS (
      SELECT 1 FROM stock_entries se
      WHERE se.item_id = i.id 
        AND se.warehouse_id = (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1)
  )
LIMIT 1;

-- Stock for Front Lid
INSERT INTO stock_entries (
    tenant_id,
    item_id, 
    warehouse_id,
    quantity, 
    available_quantity,
    allocated_quantity,
    created_at,
    updated_at
)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    i.id,
    (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1),
    230.0,
    230.0,
    0,
    NOW(),
    NOW()
FROM items i
WHERE i.code = 'FRONT-LID'
  AND NOT EXISTS (
      SELECT 1 FROM stock_entries se
      WHERE se.item_id = i.id 
        AND se.warehouse_id = (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1)
  )
LIMIT 1;

-- Stock for Bottom Block (Inlet Block)
INSERT INTO stock_entries (
    tenant_id,
    item_id, 
    warehouse_id,
    quantity, 
    available_quantity,
    allocated_quantity,
    created_at,
    updated_at
)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    i.id,
    (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1),
    210.0,
    210.0,
    0,
    NOW(),
    NOW()
FROM items i
WHERE i.code = 'BOTTOM-BLOCK-INLET'
  AND NOT EXISTS (
      SELECT 1 FROM stock_entries se
      WHERE se.item_id = i.id 
        AND se.warehouse_id = (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1)
  )
LIMIT 1;

-- Stock for IP Remote Upper Shell
INSERT INTO stock_entries (
    tenant_id,
    item_id, 
    warehouse_id,
    quantity, 
    available_quantity,
    allocated_quantity,
    created_at,
    updated_at
)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    i.id,
    (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1),
    54.0,
    54.0,
    0,
    NOW(),
    NOW()
FROM items i
WHERE i.code = 'IP-REMOTE-UPPER'
  AND NOT EXISTS (
      SELECT 1 FROM stock_entries se
      WHERE se.item_id = i.id 
        AND se.warehouse_id = (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1)
  )
LIMIT 1;

-- Stock for IP Remote Lower Shell
INSERT INTO stock_entries (
    tenant_id,
    item_id, 
    warehouse_id,
    quantity, 
    available_quantity,
    allocated_quantity,
    created_at,
    updated_at
)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    i.id,
    (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1),
    54.0,
    54.0,
    0,
    NOW(),
    NOW()
FROM items i
WHERE i.code = 'IP-REMOTE-LOWER'
  AND NOT EXISTS (
      SELECT 1 FROM stock_entries se
      WHERE se.item_id = i.id 
        AND se.warehouse_id = (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1)
  )
LIMIT 1;

-- Stock for Flashing Light glass
INSERT INTO stock_entries (
    tenant_id,
    item_id, 
    warehouse_id,
    quantity, 
    available_quantity,
    allocated_quantity,
    created_at,
    updated_at
)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    i.id,
    (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1),
    240.0,
    240.0,
    0,
    NOW(),
    NOW()
FROM items i
WHERE i.code = 'FLASHING-LIGHT-GLASS'
  AND NOT EXISTS (
      SELECT 1 FROM stock_entries se
      WHERE se.item_id = i.id 
        AND se.warehouse_id = (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1)
  )
LIMIT 1;

-- Stock for Flashing Light bottom plate
INSERT INTO stock_entries (
    tenant_id,
    item_id, 
    warehouse_id,
    quantity, 
    available_quantity,
    allocated_quantity,
    created_at,
    updated_at
)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    i.id,
    (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1),
    240.0,
    240.0,
    0,
    NOW(),
    NOW()
FROM items i
WHERE i.code = 'FLASHING-LIGHT-BOTTOM'
  AND NOT EXISTS (
      SELECT 1 FROM stock_entries se
      WHERE se.item_id = i.id 
        AND se.warehouse_id = (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1)
  )
LIMIT 1;

-- Stock for Grease
INSERT INTO stock_entries (
    tenant_id,
    item_id, 
    warehouse_id,
    quantity, 
    available_quantity,
    allocated_quantity,
    created_at,
    updated_at
)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    i.id,
    (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1),
    5000.0,
    5000.0,
    0,
    NOW(),
    NOW()
FROM items i
WHERE i.code = 'GREASE'
  AND NOT EXISTS (
      SELECT 1 FROM stock_entries se
      WHERE se.item_id = i.id 
        AND se.warehouse_id = (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1)
  )
LIMIT 1;

-- Stock for HeatShrink Tube 30mm
INSERT INTO stock_entries (
    tenant_id,
    item_id, 
    warehouse_id,
    quantity, 
    available_quantity,
    allocated_quantity,
    created_at,
    updated_at
)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    i.id,
    (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1),
    3.0,
    3.0,
    0,
    NOW(),
    NOW()
FROM items i
WHERE i.code = 'HEATSHRINK-TUBE-30MM'
  AND NOT EXISTS (
      SELECT 1 FROM stock_entries se
      WHERE se.item_id = i.id 
        AND se.warehouse_id = (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1)
  )
LIMIT 1;

-- Stock for Heat Shrink Sleeve 16mm Transparent
INSERT INTO stock_entries (
    tenant_id,
    item_id, 
    warehouse_id,
    quantity, 
    available_quantity,
    allocated_quantity,
    created_at,
    updated_at
)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    i.id,
    (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1),
    10.0,
    10.0,
    0,
    NOW(),
    NOW()
FROM items i
WHERE i.code = 'HEAT-SHRINK-SLEEVE'
  AND NOT EXISTS (
      SELECT 1 FROM stock_entries se
      WHERE se.item_id = i.id 
        AND se.warehouse_id = (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1)
  )
LIMIT 1;

-- Stock for Greasing Pump
INSERT INTO stock_entries (
    tenant_id,
    item_id, 
    warehouse_id,
    quantity, 
    available_quantity,
    allocated_quantity,
    created_at,
    updated_at
)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    i.id,
    (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1),
    76.0,
    76.0,
    0,
    NOW(),
    NOW()
FROM items i
WHERE i.code = 'GREASING-PUMP'
  AND NOT EXISTS (
      SELECT 1 FROM stock_entries se
      WHERE se.item_id = i.id 
        AND se.warehouse_id = (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1)
  )
LIMIT 1;

-- Stock for Heatsink paste
INSERT INTO stock_entries (
    tenant_id,
    item_id, 
    warehouse_id,
    quantity, 
    available_quantity,
    allocated_quantity,
    created_at,
    updated_at
)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    i.id,
    (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1),
    5000.0,
    5000.0,
    0,
    NOW(),
    NOW()
FROM items i
WHERE i.code = 'HEATSINK-PASTE'
  AND NOT EXISTS (
      SELECT 1 FROM stock_entries se
      WHERE se.item_id = i.id 
        AND se.warehouse_id = (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1)
  )
LIMIT 1;

-- Stock for Teroson MS930
INSERT INTO stock_entries (
    tenant_id,
    item_id, 
    warehouse_id,
    quantity, 
    available_quantity,
    allocated_quantity,
    created_at,
    updated_at
)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    i.id,
    (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1),
    10850.0,
    10850.0,
    0,
    NOW(),
    NOW()
FROM items i
WHERE i.code = 'TEROSON-MS930'
  AND NOT EXISTS (
      SELECT 1 FROM stock_entries se
      WHERE se.item_id = i.id 
        AND se.warehouse_id = (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1)
  )
LIMIT 1;

-- Stock for Silicon RTV 732
INSERT INTO stock_entries (
    tenant_id,
    item_id, 
    warehouse_id,
    quantity, 
    available_quantity,
    allocated_quantity,
    created_at,
    updated_at
)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    i.id,
    (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1),
    1500.0,
    1500.0,
    0,
    NOW(),
    NOW()
FROM items i
WHERE i.code = 'SILICON-RTV-732'
  AND NOT EXISTS (
      SELECT 1 FROM stock_entries se
      WHERE se.item_id = i.id 
        AND se.warehouse_id = (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1)
  )
LIMIT 1;

-- Stock for FlexBond
INSERT INTO stock_entries (
    tenant_id,
    item_id, 
    warehouse_id,
    quantity, 
    available_quantity,
    allocated_quantity,
    created_at,
    updated_at
)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    i.id,
    (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1),
    80.0,
    80.0,
    0,
    NOW(),
    NOW()
FROM items i
WHERE i.code = 'FLEXBOND'
  AND NOT EXISTS (
      SELECT 1 FROM stock_entries se
      WHERE se.item_id = i.id 
        AND se.warehouse_id = (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1)
  )
LIMIT 1;

-- Stock for Brass nozzle for water outlet from JCB
INSERT INTO stock_entries (
    tenant_id,
    item_id, 
    warehouse_id,
    quantity, 
    available_quantity,
    allocated_quantity,
    created_at,
    updated_at
)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    i.id,
    (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1),
    70.0,
    70.0,
    0,
    NOW(),
    NOW()
FROM items i
WHERE i.code = 'BRASS-NOZZLE-FOR'
  AND NOT EXISTS (
      SELECT 1 FROM stock_entries se
      WHERE se.item_id = i.id 
        AND se.warehouse_id = (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1)
  )
LIMIT 1;

-- Stock for Greasing nozzle
INSERT INTO stock_entries (
    tenant_id,
    item_id, 
    warehouse_id,
    quantity, 
    available_quantity,
    allocated_quantity,
    created_at,
    updated_at
)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    i.id,
    (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1),
    30.0,
    30.0,
    0,
    NOW(),
    NOW()
FROM items i
WHERE i.code = 'GREASING-NOZZLE'
  AND NOT EXISTS (
      SELECT 1 FROM stock_entries se
      WHERE se.item_id = i.id 
        AND se.warehouse_id = (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1)
  )
LIMIT 1;

-- Stock for Nozzle on Jet
INSERT INTO stock_entries (
    tenant_id,
    item_id, 
    warehouse_id,
    quantity, 
    available_quantity,
    allocated_quantity,
    created_at,
    updated_at
)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    i.id,
    (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1),
    10.0,
    10.0,
    0,
    NOW(),
    NOW()
FROM items i
WHERE i.code = 'NOZZLE-ON-JET'
  AND NOT EXISTS (
      SELECT 1 FROM stock_entries se
      WHERE se.item_id = i.id 
        AND se.warehouse_id = (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1)
  )
LIMIT 1;

-- Stock for Water Jet S52
INSERT INTO stock_entries (
    tenant_id,
    item_id, 
    warehouse_id,
    quantity, 
    available_quantity,
    allocated_quantity,
    created_at,
    updated_at
)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    i.id,
    (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1),
    128.0,
    128.0,
    0,
    NOW(),
    NOW()
FROM items i
WHERE i.code = 'WATER-JET-S52'
  AND NOT EXISTS (
      SELECT 1 FROM stock_entries se
      WHERE se.item_id = i.id 
        AND se.warehouse_id = (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1)
  )
LIMIT 1;

-- Stock for ESC Mounting Plate
INSERT INTO stock_entries (
    tenant_id,
    item_id, 
    warehouse_id,
    quantity, 
    available_quantity,
    allocated_quantity,
    created_at,
    updated_at
)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    i.id,
    (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1),
    85.0,
    85.0,
    0,
    NOW(),
    NOW()
FROM items i
WHERE i.code = 'ESC-MOUNTING-PLATE'
  AND NOT EXISTS (
      SELECT 1 FROM stock_entries se
      WHERE se.item_id = i.id 
        AND se.warehouse_id = (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1)
  )
LIMIT 1;

-- Stock for Jet S52 Mounting plate
INSERT INTO stock_entries (
    tenant_id,
    item_id, 
    warehouse_id,
    quantity, 
    available_quantity,
    allocated_quantity,
    created_at,
    updated_at
)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    i.id,
    (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1),
    113.0,
    113.0,
    0,
    NOW(),
    NOW()
FROM items i
WHERE i.code = 'JET-S52-MOUNTING'
  AND NOT EXISTS (
      SELECT 1 FROM stock_entries se
      WHERE se.item_id = i.id 
        AND se.warehouse_id = (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1)
  )
LIMIT 1;

-- Stock for Motor mount heatblock TOP
INSERT INTO stock_entries (
    tenant_id,
    item_id, 
    warehouse_id,
    quantity, 
    available_quantity,
    allocated_quantity,
    created_at,
    updated_at
)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    i.id,
    (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1),
    90.0,
    90.0,
    0,
    NOW(),
    NOW()
FROM items i
WHERE i.code = 'MOTOR-MOUNT-HEATBLOCK'
  AND NOT EXISTS (
      SELECT 1 FROM stock_entries se
      WHERE se.item_id = i.id 
        AND se.warehouse_id = (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1)
  )
LIMIT 1;

-- Stock for Motor mount heatblock BOTTOM
INSERT INTO stock_entries (
    tenant_id,
    item_id, 
    warehouse_id,
    quantity, 
    available_quantity,
    allocated_quantity,
    created_at,
    updated_at
)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    i.id,
    (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1),
    90.0,
    90.0,
    0,
    NOW(),
    NOW()
FROM items i
WHERE i.code = 'MOTOR-MOUNT-HEATBLOCK'
  AND NOT EXISTS (
      SELECT 1 FROM stock_entries se
      WHERE se.item_id = i.id 
        AND se.warehouse_id = (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1)
  )
LIMIT 1;

-- Stock for Two half Motor Mount side plates
INSERT INTO stock_entries (
    tenant_id,
    item_id, 
    warehouse_id,
    quantity, 
    available_quantity,
    allocated_quantity,
    created_at,
    updated_at
)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    i.id,
    (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1),
    158.0,
    158.0,
    0,
    NOW(),
    NOW()
FROM items i
WHERE i.code = 'TWO-HALF-MOTOR'
  AND NOT EXISTS (
      SELECT 1 FROM stock_entries se
      WHERE se.item_id = i.id 
        AND se.warehouse_id = (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1)
  )
LIMIT 1;

-- Stock for Reverse Buketing side plates
INSERT INTO stock_entries (
    tenant_id,
    item_id, 
    warehouse_id,
    quantity, 
    available_quantity,
    allocated_quantity,
    created_at,
    updated_at
)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    i.id,
    (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1),
    6.0,
    6.0,
    0,
    NOW(),
    NOW()
FROM items i
WHERE i.code = 'REVERSE-BUKETING-SIDE'
  AND NOT EXISTS (
      SELECT 1 FROM stock_entries se
      WHERE se.item_id = i.id 
        AND se.warehouse_id = (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1)
  )
LIMIT 1;

-- Stock for Aluminium Sheet 2mm thick 4ftx2ft
INSERT INTO stock_entries (
    tenant_id,
    item_id, 
    warehouse_id,
    quantity, 
    available_quantity,
    allocated_quantity,
    created_at,
    updated_at
)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    i.id,
    (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1),
    2.0,
    2.0,
    0,
    NOW(),
    NOW()
FROM items i
WHERE i.code = 'ALUMINIUM-SHEET-2MM'
  AND NOT EXISTS (
      SELECT 1 FROM stock_entries se
      WHERE se.item_id = i.id 
        AND se.warehouse_id = (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1)
  )
LIMIT 1;

-- Stock for Heat condensor/Jet Heat Sink
INSERT INTO stock_entries (
    tenant_id,
    item_id, 
    warehouse_id,
    quantity, 
    available_quantity,
    allocated_quantity,
    created_at,
    updated_at
)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    i.id,
    (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1),
    90.0,
    90.0,
    0,
    NOW(),
    NOW()
FROM items i
WHERE i.code = 'HEAT-CONDENSORJET-HEAT'
  AND NOT EXISTS (
      SELECT 1 FROM stock_entries se
      WHERE se.item_id = i.id 
        AND se.warehouse_id = (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1)
  )
LIMIT 1;

-- Stock for LH-1 Thermosyphens
INSERT INTO stock_entries (
    tenant_id,
    item_id, 
    warehouse_id,
    quantity, 
    available_quantity,
    allocated_quantity,
    created_at,
    updated_at
)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    i.id,
    (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1),
    89.0,
    89.0,
    0,
    NOW(),
    NOW()
FROM items i
WHERE i.code = 'LH1-THERMOSYPHENS'
  AND NOT EXISTS (
      SELECT 1 FROM stock_entries se
      WHERE se.item_id = i.id 
        AND se.warehouse_id = (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1)
  )
LIMIT 1;

-- Stock for Heat condensor/Jet Heat Sink RHS 1 Plate
INSERT INTO stock_entries (
    tenant_id,
    item_id, 
    warehouse_id,
    quantity, 
    available_quantity,
    allocated_quantity,
    created_at,
    updated_at
)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    i.id,
    (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1),
    89.0,
    89.0,
    0,
    NOW(),
    NOW()
FROM items i
WHERE i.code = 'HEAT-CONDENSORJET-HEAT'
  AND NOT EXISTS (
      SELECT 1 FROM stock_entries se
      WHERE se.item_id = i.id 
        AND se.warehouse_id = (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1)
  )
LIMIT 1;

-- Stock for Heat condensor/Jet Heat Sink Top Plate
INSERT INTO stock_entries (
    tenant_id,
    item_id, 
    warehouse_id,
    quantity, 
    available_quantity,
    allocated_quantity,
    created_at,
    updated_at
)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    i.id,
    (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1),
    89.0,
    89.0,
    0,
    NOW(),
    NOW()
FROM items i
WHERE i.code = 'HEAT-CONDENSORJET-HEAT'
  AND NOT EXISTS (
      SELECT 1 FROM stock_entries se
      WHERE se.item_id = i.id 
        AND se.warehouse_id = (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1)
  )
LIMIT 1;

-- Stock for Motor Block Side Plate
INSERT INTO stock_entries (
    tenant_id,
    item_id, 
    warehouse_id,
    quantity, 
    available_quantity,
    allocated_quantity,
    created_at,
    updated_at
)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    i.id,
    (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1),
    20.0,
    20.0,
    0,
    NOW(),
    NOW()
FROM items i
WHERE i.code = 'MOTOR-BLOCK-SIDE'
  AND NOT EXISTS (
      SELECT 1 FROM stock_entries se
      WHERE se.item_id = i.id 
        AND se.warehouse_id = (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1)
  )
LIMIT 1;

-- Stock for Condensor Clamp
INSERT INTO stock_entries (
    tenant_id,
    item_id, 
    warehouse_id,
    quantity, 
    available_quantity,
    allocated_quantity,
    created_at,
    updated_at
)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    i.id,
    (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1),
    335.0,
    335.0,
    0,
    NOW(),
    NOW()
FROM items i
WHERE i.code = 'CONDENSOR-CLAMP'
  AND NOT EXISTS (
      SELECT 1 FROM stock_entries se
      WHERE se.item_id = i.id 
        AND se.warehouse_id = (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1)
  )
LIMIT 1;

-- Stock for Copper heat pipe (set of 2)
INSERT INTO stock_entries (
    tenant_id,
    item_id, 
    warehouse_id,
    quantity, 
    available_quantity,
    allocated_quantity,
    created_at,
    updated_at
)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    i.id,
    (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1),
    181.0,
    181.0,
    0,
    NOW(),
    NOW()
FROM items i
WHERE i.code = 'COPPER-HEAT-PIPE'
  AND NOT EXISTS (
      SELECT 1 FROM stock_entries se
      WHERE se.item_id = i.id 
        AND se.warehouse_id = (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1)
  )
LIMIT 1;

-- Stock for Copper heat pipes ( New)
INSERT INTO stock_entries (
    tenant_id,
    item_id, 
    warehouse_id,
    quantity, 
    available_quantity,
    allocated_quantity,
    created_at,
    updated_at
)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    i.id,
    (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1),
    60.0,
    60.0,
    0,
    NOW(),
    NOW()
FROM items i
WHERE i.code = 'COPPER-HEAT-PIPES'
  AND NOT EXISTS (
      SELECT 1 FROM stock_entries se
      WHERE se.item_id = i.id 
        AND se.warehouse_id = (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1)
  )
LIMIT 1;

-- Stock for STBD Aft Plate
INSERT INTO stock_entries (
    tenant_id,
    item_id, 
    warehouse_id,
    quantity, 
    available_quantity,
    allocated_quantity,
    created_at,
    updated_at
)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    i.id,
    (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1),
    106.0,
    106.0,
    0,
    NOW(),
    NOW()
FROM items i
WHERE i.code = 'STBD-AFT-PLATE'
  AND NOT EXISTS (
      SELECT 1 FROM stock_entries se
      WHERE se.item_id = i.id 
        AND se.warehouse_id = (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1)
  )
LIMIT 1;

-- Stock for PORT Aft Plate
INSERT INTO stock_entries (
    tenant_id,
    item_id, 
    warehouse_id,
    quantity, 
    available_quantity,
    allocated_quantity,
    created_at,
    updated_at
)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    i.id,
    (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1),
    107.0,
    107.0,
    0,
    NOW(),
    NOW()
FROM items i
WHERE i.code = 'PORT-AFT-PLATE'
  AND NOT EXISTS (
      SELECT 1 FROM stock_entries se
      WHERE se.item_id = i.id 
        AND se.warehouse_id = (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1)
  )
LIMIT 1;

-- Stock for Button Spacer No. 1/2 3D Print
INSERT INTO stock_entries (
    tenant_id,
    item_id, 
    warehouse_id,
    quantity, 
    available_quantity,
    allocated_quantity,
    created_at,
    updated_at
)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    i.id,
    (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1),
    137.0,
    137.0,
    0,
    NOW(),
    NOW()
FROM items i
WHERE i.code = 'BUTTON-SPACER-NO'
  AND NOT EXISTS (
      SELECT 1 FROM stock_entries se
      WHERE se.item_id = i.id 
        AND se.warehouse_id = (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1)
  )
LIMIT 1;

-- Stock for Button No. 1 pressure bracket 3D Print
INSERT INTO stock_entries (
    tenant_id,
    item_id, 
    warehouse_id,
    quantity, 
    available_quantity,
    allocated_quantity,
    created_at,
    updated_at
)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    i.id,
    (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1),
    28.0,
    28.0,
    0,
    NOW(),
    NOW()
FROM items i
WHERE i.code = 'BUTTON-NO-1'
  AND NOT EXISTS (
      SELECT 1 FROM stock_entries se
      WHERE se.item_id = i.id 
        AND se.warehouse_id = (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1)
  )
LIMIT 1;

-- Stock for Remote Battery Holding Bracket 3D Print
INSERT INTO stock_entries (
    tenant_id,
    item_id, 
    warehouse_id,
    quantity, 
    available_quantity,
    allocated_quantity,
    created_at,
    updated_at
)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    i.id,
    (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1),
    34.0,
    34.0,
    0,
    NOW(),
    NOW()
FROM items i
WHERE i.code = 'REMOTE-BATTERY-HOLDING'
  AND NOT EXISTS (
      SELECT 1 FROM stock_entries se
      WHERE se.item_id = i.id 
        AND se.warehouse_id = (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1)
  )
LIMIT 1;

-- Stock for Antenna clamp -1 3D Print
INSERT INTO stock_entries (
    tenant_id,
    item_id, 
    warehouse_id,
    quantity, 
    available_quantity,
    allocated_quantity,
    created_at,
    updated_at
)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    i.id,
    (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1),
    3.0,
    3.0,
    0,
    NOW(),
    NOW()
FROM items i
WHERE i.code = 'ANTENNA-CLAMP-1'
  AND NOT EXISTS (
      SELECT 1 FROM stock_entries se
      WHERE se.item_id = i.id 
        AND se.warehouse_id = (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1)
  )
LIMIT 1;

-- Stock for Antenna Clamp -2 3D Print
INSERT INTO stock_entries (
    tenant_id,
    item_id, 
    warehouse_id,
    quantity, 
    available_quantity,
    allocated_quantity,
    created_at,
    updated_at
)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    i.id,
    (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1),
    10.0,
    10.0,
    0,
    NOW(),
    NOW()
FROM items i
WHERE i.code = 'ANTENNA-CLAMP-2'
  AND NOT EXISTS (
      SELECT 1 FROM stock_entries se
      WHERE se.item_id = i.id 
        AND se.warehouse_id = (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1)
  )
LIMIT 1;

-- Stock for LCD holder bracket 3D print
INSERT INTO stock_entries (
    tenant_id,
    item_id, 
    warehouse_id,
    quantity, 
    available_quantity,
    allocated_quantity,
    created_at,
    updated_at
)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    i.id,
    (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1),
    16.0,
    16.0,
    0,
    NOW(),
    NOW()
FROM items i
WHERE i.code = 'LCD-HOLDER-BRACKET'
  AND NOT EXISTS (
      SELECT 1 FROM stock_entries se
      WHERE se.item_id = i.id 
        AND se.warehouse_id = (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1)
  )
LIMIT 1;

-- Stock for Button 1/1 3D print
INSERT INTO stock_entries (
    tenant_id,
    item_id, 
    warehouse_id,
    quantity, 
    available_quantity,
    allocated_quantity,
    created_at,
    updated_at
)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    i.id,
    (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1),
    24.0,
    24.0,
    0,
    NOW(),
    NOW()
FROM items i
WHERE i.code = 'BUTTON-11-3D'
  AND NOT EXISTS (
      SELECT 1 FROM stock_entries se
      WHERE se.item_id = i.id 
        AND se.warehouse_id = (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1)
  )
LIMIT 1;

-- Stock for Rotary Knob Box 3D print
INSERT INTO stock_entries (
    tenant_id,
    item_id, 
    warehouse_id,
    quantity, 
    available_quantity,
    allocated_quantity,
    created_at,
    updated_at
)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    i.id,
    (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1),
    100.0,
    100.0,
    0,
    NOW(),
    NOW()
FROM items i
WHERE i.code = 'ROTARY-KNOB-BOX'
  AND NOT EXISTS (
      SELECT 1 FROM stock_entries se
      WHERE se.item_id = i.id 
        AND se.warehouse_id = (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1)
  )
LIMIT 1;

-- Stock for IFU 3D Middle
INSERT INTO stock_entries (
    tenant_id,
    item_id, 
    warehouse_id,
    quantity, 
    available_quantity,
    allocated_quantity,
    created_at,
    updated_at
)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    i.id,
    (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1),
    100.0,
    100.0,
    0,
    NOW(),
    NOW()
FROM items i
WHERE i.code = 'IFU-3D-MIDDLE'
  AND NOT EXISTS (
      SELECT 1 FROM stock_entries se
      WHERE se.item_id = i.id 
        AND se.warehouse_id = (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1)
  )
LIMIT 1;

-- Stock for IFU top
INSERT INTO stock_entries (
    tenant_id,
    item_id, 
    warehouse_id,
    quantity, 
    available_quantity,
    allocated_quantity,
    created_at,
    updated_at
)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    i.id,
    (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1),
    100.0,
    100.0,
    0,
    NOW(),
    NOW()
FROM items i
WHERE i.code = 'IFU-TOP'
  AND NOT EXISTS (
      SELECT 1 FROM stock_entries se
      WHERE se.item_id = i.id 
        AND se.warehouse_id = (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1)
  )
LIMIT 1;

-- Stock for IFU Bottom
INSERT INTO stock_entries (
    tenant_id,
    item_id, 
    warehouse_id,
    quantity, 
    available_quantity,
    allocated_quantity,
    created_at,
    updated_at
)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    i.id,
    (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1),
    100.0,
    100.0,
    0,
    NOW(),
    NOW()
FROM items i
WHERE i.code = 'IFU-BOTTOM'
  AND NOT EXISTS (
      SELECT 1 FROM stock_entries se
      WHERE se.item_id = i.id 
        AND se.warehouse_id = (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1)
  )
LIMIT 1;

-- Stock for Motor 5692 495 KV
INSERT INTO stock_entries (
    tenant_id,
    item_id, 
    warehouse_id,
    quantity, 
    available_quantity,
    allocated_quantity,
    created_at,
    updated_at
)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    i.id,
    (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1),
    198.0,
    198.0,
    0,
    NOW(),
    NOW()
FROM items i
WHERE i.code = 'MOTOR-5692-495'
  AND NOT EXISTS (
      SELECT 1 FROM stock_entries se
      WHERE se.item_id = i.id 
        AND se.warehouse_id = (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1)
  )
LIMIT 1;

-- Stock for HV130 ESC
INSERT INTO stock_entries (
    tenant_id,
    item_id, 
    warehouse_id,
    quantity, 
    available_quantity,
    allocated_quantity,
    created_at,
    updated_at
)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    i.id,
    (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1),
    70.0,
    70.0,
    0,
    NOW(),
    NOW()
FROM items i
WHERE i.code = 'HV130-ESC'
  AND NOT EXISTS (
      SELECT 1 FROM stock_entries se
      WHERE se.item_id = i.id 
        AND se.warehouse_id = (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1)
  )
LIMIT 1;

-- Stock for 8 mm OD pneaumatic pipe
INSERT INTO stock_entries (
    tenant_id,
    item_id, 
    warehouse_id,
    quantity, 
    available_quantity,
    allocated_quantity,
    created_at,
    updated_at
)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    i.id,
    (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1),
    3.75,
    3.75,
    0,
    NOW(),
    NOW()
FROM items i
WHERE i.code = '8-MM-OD'
  AND NOT EXISTS (
      SELECT 1 FROM stock_entries se
      WHERE se.item_id = i.id 
        AND se.warehouse_id = (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1)
  )
LIMIT 1;

-- Stock for 12 to 8 right angled reducer with lock clips
INSERT INTO stock_entries (
    tenant_id,
    item_id, 
    warehouse_id,
    quantity, 
    available_quantity,
    allocated_quantity,
    created_at,
    updated_at
)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    i.id,
    (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1),
    108.0,
    108.0,
    0,
    NOW(),
    NOW()
FROM items i
WHERE i.code = '12-TO-8'
  AND NOT EXISTS (
      SELECT 1 FROM stock_entries se
      WHERE se.item_id = i.id 
        AND se.warehouse_id = (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1)
  )
LIMIT 1;

-- Stock for 12 to 8 right angled lock clips
INSERT INTO stock_entries (
    tenant_id,
    item_id, 
    warehouse_id,
    quantity, 
    available_quantity,
    allocated_quantity,
    created_at,
    updated_at
)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    i.id,
    (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1),
    200.0,
    200.0,
    0,
    NOW(),
    NOW()
FROM items i
WHERE i.code = '12-TO-8'
  AND NOT EXISTS (
      SELECT 1 FROM stock_entries se
      WHERE se.item_id = i.id 
        AND se.warehouse_id = (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1)
  )
LIMIT 1;

-- Stock for 12mm OD pneumatic pipe
INSERT INTO stock_entries (
    tenant_id,
    item_id, 
    warehouse_id,
    quantity, 
    available_quantity,
    allocated_quantity,
    created_at,
    updated_at
)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    i.id,
    (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1),
    3.75,
    3.75,
    0,
    NOW(),
    NOW()
FROM items i
WHERE i.code = '12MM-OD-PNEUMATIC'
  AND NOT EXISTS (
      SELECT 1 FROM stock_entries se
      WHERE se.item_id = i.id 
        AND se.warehouse_id = (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1)
  )
LIMIT 1;

-- Stock for Polycarbonate Glass for Remote
INSERT INTO stock_entries (
    tenant_id,
    item_id, 
    warehouse_id,
    quantity, 
    available_quantity,
    allocated_quantity,
    created_at,
    updated_at
)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    i.id,
    (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1),
    52.0,
    52.0,
    0,
    NOW(),
    NOW()
FROM items i
WHERE i.code = 'POLYCARBONATE-GLASS-FOR'
  AND NOT EXISTS (
      SELECT 1 FROM stock_entries se
      WHERE se.item_id = i.id 
        AND se.warehouse_id = (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1)
  )
LIMIT 1;

-- Stock for Bottom Mesh (120mm x 100mm, 5"x4")
INSERT INTO stock_entries (
    tenant_id,
    item_id, 
    warehouse_id,
    quantity, 
    available_quantity,
    allocated_quantity,
    created_at,
    updated_at
)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    i.id,
    (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1),
    216.0,
    216.0,
    0,
    NOW(),
    NOW()
FROM items i
WHERE i.code = 'BOTTOM-MESH-120MM'
  AND NOT EXISTS (
      SELECT 1 FROM stock_entries se
      WHERE se.item_id = i.id 
        AND se.warehouse_id = (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1)
  )
LIMIT 1;

-- Stock for Air nozzle
INSERT INTO stock_entries (
    tenant_id,
    item_id, 
    warehouse_id,
    quantity, 
    available_quantity,
    allocated_quantity,
    created_at,
    updated_at
)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    i.id,
    (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1),
    80.0,
    80.0,
    0,
    NOW(),
    NOW()
FROM items i
WHERE i.code = 'AIR-NOZZLE'
  AND NOT EXISTS (
      SELECT 1 FROM stock_entries se
      WHERE se.item_id = i.id 
        AND se.warehouse_id = (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1)
  )
LIMIT 1;

-- Stock for IPA
INSERT INTO stock_entries (
    tenant_id,
    item_id, 
    warehouse_id,
    quantity, 
    available_quantity,
    allocated_quantity,
    created_at,
    updated_at
)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    i.id,
    (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1),
    10500.0,
    10500.0,
    0,
    NOW(),
    NOW()
FROM items i
WHERE i.code = 'IPA'
  AND NOT EXISTS (
      SELECT 1 FROM stock_entries se
      WHERE se.item_id = i.id 
        AND se.warehouse_id = (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1)
  )
LIMIT 1;

-- Stock for Poly Urethane Foam
INSERT INTO stock_entries (
    tenant_id,
    item_id, 
    warehouse_id,
    quantity, 
    available_quantity,
    allocated_quantity,
    created_at,
    updated_at
)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    i.id,
    (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1),
    5000.0,
    5000.0,
    0,
    NOW(),
    NOW()
FROM items i
WHERE i.code = 'POLY-URETHANE-FOAM'
  AND NOT EXISTS (
      SELECT 1 FROM stock_entries se
      WHERE se.item_id = i.id 
        AND se.warehouse_id = (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1)
  )
LIMIT 1;

-- Stock for Joystick Water proof rubber
INSERT INTO stock_entries (
    tenant_id,
    item_id, 
    warehouse_id,
    quantity, 
    available_quantity,
    allocated_quantity,
    created_at,
    updated_at
)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    i.id,
    (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1),
    185.0,
    185.0,
    0,
    NOW(),
    NOW()
FROM items i
WHERE i.code = 'JOYSTICK-WATER-PROOF'
  AND NOT EXISTS (
      SELECT 1 FROM stock_entries se
      WHERE se.item_id = i.id 
        AND se.warehouse_id = (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1)
  )
LIMIT 1;

-- Stock for Button Silicon Cover No. 1
INSERT INTO stock_entries (
    tenant_id,
    item_id, 
    warehouse_id,
    quantity, 
    available_quantity,
    allocated_quantity,
    created_at,
    updated_at
)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    i.id,
    (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1),
    190.0,
    190.0,
    0,
    NOW(),
    NOW()
FROM items i
WHERE i.code = 'BUTTON-SILICON-COVER'
  AND NOT EXISTS (
      SELECT 1 FROM stock_entries se
      WHERE se.item_id = i.id 
        AND se.warehouse_id = (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1)
  )
LIMIT 1;

-- Stock for Button Silicon Cover No. 2
INSERT INTO stock_entries (
    tenant_id,
    item_id, 
    warehouse_id,
    quantity, 
    available_quantity,
    allocated_quantity,
    created_at,
    updated_at
)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    i.id,
    (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1),
    230.0,
    230.0,
    0,
    NOW(),
    NOW()
FROM items i
WHERE i.code = 'BUTTON-SILICON-COVER'
  AND NOT EXISTS (
      SELECT 1 FROM stock_entries se
      WHERE se.item_id = i.id 
        AND se.warehouse_id = (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1)
  )
LIMIT 1;

-- Stock for Thread locker 242
INSERT INTO stock_entries (
    tenant_id,
    item_id, 
    warehouse_id,
    quantity, 
    available_quantity,
    allocated_quantity,
    created_at,
    updated_at
)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    i.id,
    (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1),
    150.0,
    150.0,
    0,
    NOW(),
    NOW()
FROM items i
WHERE i.code = 'THREAD-LOCKER-242'
  AND NOT EXISTS (
      SELECT 1 FROM stock_entries se
      WHERE se.item_id = i.id 
        AND se.warehouse_id = (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1)
  )
LIMIT 1;

-- Stock for Oring AFT plate
INSERT INTO stock_entries (
    tenant_id,
    item_id, 
    warehouse_id,
    quantity, 
    available_quantity,
    allocated_quantity,
    created_at,
    updated_at
)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    i.id,
    (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1),
    313.0,
    313.0,
    0,
    NOW(),
    NOW()
FROM items i
WHERE i.code = 'ORING-AFT-PLATE'
  AND NOT EXISTS (
      SELECT 1 FROM stock_entries se
      WHERE se.item_id = i.id 
        AND se.warehouse_id = (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1)
  )
LIMIT 1;

-- Stock for Hook Sticker STBD
INSERT INTO stock_entries (
    tenant_id,
    item_id, 
    warehouse_id,
    quantity, 
    available_quantity,
    allocated_quantity,
    created_at,
    updated_at
)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    i.id,
    (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1),
    50.0,
    50.0,
    0,
    NOW(),
    NOW()
FROM items i
WHERE i.code = 'HOOK-STICKER-STBD'
  AND NOT EXISTS (
      SELECT 1 FROM stock_entries se
      WHERE se.item_id = i.id 
        AND se.warehouse_id = (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1)
  )
LIMIT 1;

-- Stock for Hook Stiker PORT
INSERT INTO stock_entries (
    tenant_id,
    item_id, 
    warehouse_id,
    quantity, 
    available_quantity,
    allocated_quantity,
    created_at,
    updated_at
)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    i.id,
    (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1),
    50.0,
    50.0,
    0,
    NOW(),
    NOW()
FROM items i
WHERE i.code = 'HOOK-STIKER-PORT'
  AND NOT EXISTS (
      SELECT 1 FROM stock_entries se
      WHERE se.item_id = i.id 
        AND se.warehouse_id = (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1)
  )
LIMIT 1;

-- Stock for Hold here sticker STBD
INSERT INTO stock_entries (
    tenant_id,
    item_id, 
    warehouse_id,
    quantity, 
    available_quantity,
    allocated_quantity,
    created_at,
    updated_at
)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    i.id,
    (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1),
    60.0,
    60.0,
    0,
    NOW(),
    NOW()
FROM items i
WHERE i.code = 'HOLD-HERE-STICKER'
  AND NOT EXISTS (
      SELECT 1 FROM stock_entries se
      WHERE se.item_id = i.id 
        AND se.warehouse_id = (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1)
  )
LIMIT 1;

-- Stock for Hold here sticker PORT
INSERT INTO stock_entries (
    tenant_id,
    item_id, 
    warehouse_id,
    quantity, 
    available_quantity,
    allocated_quantity,
    created_at,
    updated_at
)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    i.id,
    (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1),
    100.0,
    100.0,
    0,
    NOW(),
    NOW()
FROM items i
WHERE i.code = 'HOLD-HERE-STICKER'
  AND NOT EXISTS (
      SELECT 1 FROM stock_entries se
      WHERE se.item_id = i.id 
        AND se.warehouse_id = (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1)
  )
LIMIT 1;

-- Stock for Ferrole
INSERT INTO stock_entries (
    tenant_id,
    item_id, 
    warehouse_id,
    quantity, 
    available_quantity,
    allocated_quantity,
    created_at,
    updated_at
)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    i.id,
    (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1),
    150.0,
    150.0,
    0,
    NOW(),
    NOW()
FROM items i
WHERE i.code = 'FERROLE'
  AND NOT EXISTS (
      SELECT 1 FROM stock_entries se
      WHERE se.item_id = i.id 
        AND se.warehouse_id = (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1)
  )
LIMIT 1;

-- Stock for Rope 8mm
INSERT INTO stock_entries (
    tenant_id,
    item_id, 
    warehouse_id,
    quantity, 
    available_quantity,
    allocated_quantity,
    created_at,
    updated_at
)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    i.id,
    (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1),
    810.0,
    810.0,
    0,
    NOW(),
    NOW()
FROM items i
WHERE i.code = 'ROPE-8MM'
  AND NOT EXISTS (
      SELECT 1 FROM stock_entries se
      WHERE se.item_id = i.id 
        AND se.warehouse_id = (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1)
  )
LIMIT 1;

-- Stock for Packing Wooden HardBox
INSERT INTO stock_entries (
    tenant_id,
    item_id, 
    warehouse_id,
    quantity, 
    available_quantity,
    allocated_quantity,
    created_at,
    updated_at
)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    i.id,
    (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1),
    16.0,
    16.0,
    0,
    NOW(),
    NOW()
FROM items i
WHERE i.code = 'PACKING-WOODEN-HARDBOX'
  AND NOT EXISTS (
      SELECT 1 FROM stock_entries se
      WHERE se.item_id = i.id 
        AND se.warehouse_id = (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1)
  )
LIMIT 1;

-- Stock for 6mm Allen Key
INSERT INTO stock_entries (
    tenant_id,
    item_id, 
    warehouse_id,
    quantity, 
    available_quantity,
    allocated_quantity,
    created_at,
    updated_at
)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    i.id,
    (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1),
    40.0,
    40.0,
    0,
    NOW(),
    NOW()
FROM items i
WHERE i.code = '6MM-ALLEN-KEY'
  AND NOT EXISTS (
      SELECT 1 FROM stock_entries se
      WHERE se.item_id = i.id 
        AND se.warehouse_id = (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1)
  )
LIMIT 1;

-- Stock for 6mm T Handle
INSERT INTO stock_entries (
    tenant_id,
    item_id, 
    warehouse_id,
    quantity, 
    available_quantity,
    allocated_quantity,
    created_at,
    updated_at
)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    i.id,
    (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1),
    30.0,
    30.0,
    0,
    NOW(),
    NOW()
FROM items i
WHERE i.code = '6MM-T-HANDLE'
  AND NOT EXISTS (
      SELECT 1 FROM stock_entries se
      WHERE se.item_id = i.id 
        AND se.warehouse_id = (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1)
  )
LIMIT 1;

-- Stock for X16 extension panel
INSERT INTO stock_entries (
    tenant_id,
    item_id, 
    warehouse_id,
    quantity, 
    available_quantity,
    allocated_quantity,
    created_at,
    updated_at
)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    i.id,
    (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1),
    154.0,
    154.0,
    0,
    NOW(),
    NOW()
FROM items i
WHERE i.code = 'X16-EXTENSION-PANEL'
  AND NOT EXISTS (
      SELECT 1 FROM stock_entries se
      WHERE se.item_id = i.id 
        AND se.warehouse_id = (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1)
  )
LIMIT 1;

-- Stock for STBD Aft Plate Assy
INSERT INTO stock_entries (
    tenant_id,
    item_id, 
    warehouse_id,
    quantity, 
    available_quantity,
    allocated_quantity,
    created_at,
    updated_at
)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    i.id,
    (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1),
    1.0,
    1.0,
    0,
    NOW(),
    NOW()
FROM items i
WHERE i.code = 'STBD-AFT-PLATE'
  AND NOT EXISTS (
      SELECT 1 FROM stock_entries se
      WHERE se.item_id = i.id 
        AND se.warehouse_id = (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1)
  )
LIMIT 1;

-- Stock for PORT Aft Plate Assy
INSERT INTO stock_entries (
    tenant_id,
    item_id, 
    warehouse_id,
    quantity, 
    available_quantity,
    allocated_quantity,
    created_at,
    updated_at
)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    i.id,
    (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1),
    4.0,
    4.0,
    0,
    NOW(),
    NOW()
FROM items i
WHERE i.code = 'PORT-AFT-PLATE'
  AND NOT EXISTS (
      SELECT 1 FROM stock_entries se
      WHERE se.item_id = i.id 
        AND se.warehouse_id = (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1)
  )
LIMIT 1;

-- Stock for 15.6" TFT LCD, LED B 2000 Nits
INSERT INTO stock_entries (
    tenant_id,
    item_id, 
    warehouse_id,
    quantity, 
    available_quantity,
    allocated_quantity,
    created_at,
    updated_at
)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    i.id,
    (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1),
    200.0,
    200.0,
    0,
    NOW(),
    NOW()
FROM items i
WHERE i.code = '156-TFT-LCD'
  AND NOT EXISTS (
      SELECT 1 FROM stock_entries se
      WHERE se.item_id = i.id 
        AND se.warehouse_id = (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1)
  )
LIMIT 1;

-- Stock for 15.6" TFT LCD, LED backlight 1800 nits, FHD (1920x1080)
INSERT INTO stock_entries (
    tenant_id,
    item_id, 
    warehouse_id,
    quantity, 
    available_quantity,
    allocated_quantity,
    created_at,
    updated_at
)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    i.id,
    (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1),
    2.0,
    2.0,
    0,
    NOW(),
    NOW()
FROM items i
WHERE i.code = '156-TFT-LCD'
  AND NOT EXISTS (
      SELECT 1 FROM stock_entries se
      WHERE se.item_id = i.id 
        AND se.warehouse_id = (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1)
  )
LIMIT 1;

-- Stock for Box handles
INSERT INTO stock_entries (
    tenant_id,
    item_id, 
    warehouse_id,
    quantity, 
    available_quantity,
    allocated_quantity,
    created_at,
    updated_at
)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    i.id,
    (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1),
    120.0,
    120.0,
    0,
    NOW(),
    NOW()
FROM items i
WHERE i.code = 'BOX-HANDLES'
  AND NOT EXISTS (
      SELECT 1 FROM stock_entries se
      WHERE se.item_id = i.id 
        AND se.warehouse_id = (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1)
  )
LIMIT 1;

-- Stock for Dummy Load 50 ohms
INSERT INTO stock_entries (
    tenant_id,
    item_id, 
    warehouse_id,
    quantity, 
    available_quantity,
    allocated_quantity,
    created_at,
    updated_at
)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    i.id,
    (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1),
    10.0,
    10.0,
    0,
    NOW(),
    NOW()
FROM items i
WHERE i.code = 'DUMMY-LOAD-50'
  AND NOT EXISTS (
      SELECT 1 FROM stock_entries se
      WHERE se.item_id = i.id 
        AND se.warehouse_id = (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1)
  )
LIMIT 1;

-- Stock for Eyelid for cradle
INSERT INTO stock_entries (
    tenant_id,
    item_id, 
    warehouse_id,
    quantity, 
    available_quantity,
    allocated_quantity,
    created_at,
    updated_at
)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    i.id,
    (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1),
    10.0,
    10.0,
    0,
    NOW(),
    NOW()
FROM items i
WHERE i.code = 'EYELID-FOR-CRADLE'
  AND NOT EXISTS (
      SELECT 1 FROM stock_entries se
      WHERE se.item_id = i.id 
        AND se.warehouse_id = (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1)
  )
LIMIT 1;

-- Stock for Rubber Cuff (Size 40mm)(1,57")
INSERT INTO stock_entries (
    tenant_id,
    item_id, 
    warehouse_id,
    quantity, 
    available_quantity,
    allocated_quantity,
    created_at,
    updated_at
)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    i.id,
    (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1),
    50.0,
    50.0,
    0,
    NOW(),
    NOW()
FROM items i
WHERE i.code = 'RUBBER-CUFF-SIZE'
  AND NOT EXISTS (
      SELECT 1 FROM stock_entries se
      WHERE se.item_id = i.id 
        AND se.warehouse_id = (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1)
  )
LIMIT 1;

-- Stock for Rubber  Cuff )Size 32mm (1,26")
INSERT INTO stock_entries (
    tenant_id,
    item_id, 
    warehouse_id,
    quantity, 
    available_quantity,
    allocated_quantity,
    created_at,
    updated_at
)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    i.id,
    (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1),
    12.0,
    12.0,
    0,
    NOW(),
    NOW()
FROM items i
WHERE i.code = 'RUBBER-CUFF-SIZE'
  AND NOT EXISTS (
      SELECT 1 FROM stock_entries se
      WHERE se.item_id = i.id 
        AND se.warehouse_id = (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1)
  )
LIMIT 1;

-- Stock for PCB of Murata ROHM
INSERT INTO stock_entries (
    tenant_id,
    item_id, 
    warehouse_id,
    quantity, 
    available_quantity,
    allocated_quantity,
    created_at,
    updated_at
)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    i.id,
    (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1),
    400.0,
    400.0,
    0,
    NOW(),
    NOW()
FROM items i
WHERE i.code = 'PCB-OF-MURATA'
  AND NOT EXISTS (
      SELECT 1 FROM stock_entries se
      WHERE se.item_id = i.id 
        AND se.warehouse_id = (SELECT id FROM warehouses WHERE tenant_id = (SELECT id FROM tenants LIMIT 1) LIMIT 1)
  )
LIMIT 1;


COMMIT;

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

SELECT 'Vendors' as entity, COUNT(*) as count FROM vendors
UNION ALL
SELECT 'Items (RM)', COUNT(*) FROM items WHERE type = 'RAW_MATERIAL'
UNION ALL
SELECT 'Items (SA)', COUNT(*) FROM items WHERE type = 'SUB_ASSEMBLY'
UNION ALL
SELECT 'Item-Vendor Links', COUNT(*) FROM item_vendors
UNION ALL
SELECT 'BOMs', COUNT(*) FROM bom_headers
UNION ALL
SELECT 'BOM Items', COUNT(*) FROM bom_items
UNION ALL
SELECT 'Stock Entries', COUNT(*) FROM stock_entries;

-- Show items with multiple vendors
SELECT 
    i.code,
    i.name,
    COUNT(iv.vendor_id) as vendor_count,
    STRING_AGG(v.name || ' (P' || iv.priority || ')', ', ' ORDER BY iv.priority) as vendors
FROM items i
INNER JOIN item_vendors iv ON i.id = iv.item_id
INNER JOIN vendors v ON iv.vendor_id = v.id
GROUP BY i.id, i.code, i.name
HAVING COUNT(iv.vendor_id) > 1
ORDER BY vendor_count DESC, i.name
LIMIT 20;
