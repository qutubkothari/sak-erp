-- ============================================================================
-- DATA IMPORT FROM Stock List 2024-2025.xlsx
-- WITH ITEM-VENDOR RELATIONSHIPS SUPPORT
-- Generated: 2025-12-11 12:51:16
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

BEGIN;

-- ============================================================================
-- INSERT VENDORS/SUPPLIERS (with multi-vendor support)
-- ============================================================================

INSERT INTO vendors (vendor_code, vendor_name, is_active, created_at, updated_at)
VALUES ('ARBACCESSORIES', 'ARB Accessories', true, NOW(), NOW())
ON CONFLICT (vendor_code) DO NOTHING;

INSERT INTO vendors (vendor_code, vendor_name, is_active, created_at, updated_at)
VALUES ('AGARWALALUMINIUM', 'Agarwal Aluminium', true, NOW(), NOW())
ON CONFLICT (vendor_code) DO NOTHING;

INSERT INTO vendors (vendor_code, vendor_name, is_active, created_at, updated_at)
VALUES ('ALIIRANIKOLKATA', 'Ali Irani - Kolkata', true, NOW(), NOW())
ON CONFLICT (vendor_code) DO NOTHING;

INSERT INTO vendors (vendor_code, vendor_name, is_active, created_at, updated_at)
VALUES ('ALIHUSSAINBHARMAL', 'AliHussain Bharmal', true, NOW(), NOW())
ON CONFLICT (vendor_code) DO NOTHING;

INSERT INTO vendors (vendor_code, vendor_name, is_active, created_at, updated_at)
VALUES ('AMPOWERINDIA', 'Ampower India', true, NOW(), NOW())
ON CONFLICT (vendor_code) DO NOTHING;

INSERT INTO vendors (vendor_code, vendor_name, is_active, created_at, updated_at)
VALUES ('ATTITUDEMASTERVIZAG', 'Attitude Master Vizag', true, NOW(), NOW())
ON CONFLICT (vendor_code) DO NOTHING;

INSERT INTO vendors (vendor_code, vendor_name, is_active, created_at, updated_at)
VALUES ('BAGNAN', 'Bagnan', true, NOW(), NOW())
ON CONFLICT (vendor_code) DO NOTHING;

INSERT INTO vendors (vendor_code, vendor_name, is_active, created_at, updated_at)
VALUES ('BALAJIPBMANUFACTURIN', 'Balaji - PB Manufacturing', true, NOW(), NOW())
ON CONFLICT (vendor_code) DO NOTHING;

INSERT INTO vendors (vendor_code, vendor_name, is_active, created_at, updated_at)
VALUES ('BLUEROBOTICS', 'BlueRobotics', true, NOW(), NOW())
ON CONFLICT (vendor_code) DO NOTHING;

INSERT INTO vendors (vendor_code, vendor_name, is_active, created_at, updated_at)
VALUES ('CABLEFORT', 'Cable Fort', true, NOW(), NOW())
ON CONFLICT (vendor_code) DO NOTHING;

INSERT INTO vendors (vendor_code, vendor_name, is_active, created_at, updated_at)
VALUES ('CANNERCONNECTORS', 'Canner Connectors', true, NOW(), NOW())
ON CONFLICT (vendor_code) DO NOTHING;

INSERT INTO vendors (vendor_code, vendor_name, is_active, created_at, updated_at)
VALUES ('COMMERCIALENGINEERIN', 'Commercial Engineering', true, NOW(), NOW())
ON CONFLICT (vendor_code) DO NOTHING;

INSERT INTO vendors (vendor_code, vendor_name, is_active, created_at, updated_at)
VALUES ('DOLPHINRUBBER', 'Dolphin Rubber', true, NOW(), NOW())
ON CONFLICT (vendor_code) DO NOTHING;

INSERT INTO vendors (vendor_code, vendor_name, is_active, created_at, updated_at)
VALUES ('DONORRC', 'Donor RC', true, NOW(), NOW())
ON CONFLICT (vendor_code) DO NOTHING;

INSERT INTO vendors (vendor_code, vendor_name, is_active, created_at, updated_at)
VALUES ('DYNAMICINDUSTRIALSUP', 'Dynamic Industrial Supplier', true, NOW(), NOW())
ON CONFLICT (vendor_code) DO NOTHING;

INSERT INTO vendors (vendor_code, vendor_name, is_active, created_at, updated_at)
VALUES ('ELEGANTENTERPRISES', 'Elegant Enterprises', true, NOW(), NOW())
ON CONFLICT (vendor_code) DO NOTHING;

INSERT INTO vendors (vendor_code, vendor_name, is_active, created_at, updated_at)
VALUES ('EVELTA', 'Evelta', true, NOW(), NOW())
ON CONFLICT (vendor_code) DO NOTHING;

INSERT INTO vendors (vendor_code, vendor_name, is_active, created_at, updated_at)
VALUES ('HITECH', 'Hi Tech', true, NOW(), NOW())
ON CONFLICT (vendor_code) DO NOTHING;

INSERT INTO vendors (vendor_code, vendor_name, is_active, created_at, updated_at)
VALUES ('HIMALAYATRADERS', 'Himalaya Traders', true, NOW(), NOW())
ON CONFLICT (vendor_code) DO NOTHING;

INSERT INTO vendors (vendor_code, vendor_name, is_active, created_at, updated_at)
VALUES ('HOBBYWING', 'Hobbywing', true, NOW(), NOW())
ON CONFLICT (vendor_code) DO NOTHING;

INSERT INTO vendors (vendor_code, vendor_name, is_active, created_at, updated_at)
VALUES ('HYDROPNUEMATIC', 'Hydro Pnuematic', true, NOW(), NOW())
ON CONFLICT (vendor_code) DO NOTHING;

INSERT INTO vendors (vendor_code, vendor_name, is_active, created_at, updated_at)
VALUES ('INHOUSE', 'In-house', true, NOW(), NOW())
ON CONFLICT (vendor_code) DO NOTHING;

INSERT INTO vendors (vendor_code, vendor_name, is_active, created_at, updated_at)
VALUES ('INNOVINETECHMARKETIN', 'Innovine Tech Marketing PVt. Ltd.', true, NOW(), NOW())
ON CONFLICT (vendor_code) DO NOTHING;

INSERT INTO vendors (vendor_code, vendor_name, is_active, created_at, updated_at)
VALUES ('JLC', 'JLC', true, NOW(), NOW())
ON CONFLICT (vendor_code) DO NOTHING;

INSERT INTO vendors (vendor_code, vendor_name, is_active, created_at, updated_at)
VALUES ('JAINWIRENETTING', 'Jain Wire Netting', true, NOW(), NOW())
ON CONFLICT (vendor_code) DO NOTHING;

INSERT INTO vendors (vendor_code, vendor_name, is_active, created_at, updated_at)
VALUES ('JANKIDIE', 'Janki Die', true, NOW(), NOW())
ON CONFLICT (vendor_code) DO NOTHING;

INSERT INTO vendors (vendor_code, vendor_name, is_active, created_at, updated_at)
VALUES ('LEOPARD', 'Leopard', true, NOW(), NOW())
ON CONFLICT (vendor_code) DO NOTHING;

INSERT INTO vendors (vendor_code, vendor_name, is_active, created_at, updated_at)
VALUES ('LOCALMARKET', 'Local Market', true, NOW(), NOW())
ON CONFLICT (vendor_code) DO NOTHING;

INSERT INTO vendors (vendor_code, vendor_name, is_active, created_at, updated_at)
VALUES ('LOCALMARKETKOLKATA', 'Local Market Kolkata', true, NOW(), NOW())
ON CONFLICT (vendor_code) DO NOTHING;

INSERT INTO vendors (vendor_code, vendor_name, is_active, created_at, updated_at)
VALUES ('MARHASHTOROIDRINGS', 'Marhash Toroid Rings', true, NOW(), NOW())
ON CONFLICT (vendor_code) DO NOTHING;

INSERT INTO vendors (vendor_code, vendor_name, is_active, created_at, updated_at)
VALUES ('NDP', 'NDP', true, NOW(), NOW())
ON CONFLICT (vendor_code) DO NOTHING;

INSERT INTO vendors (vendor_code, vendor_name, is_active, created_at, updated_at)
VALUES ('NSKELECTRONICS', 'NSK Electronics', true, NOW(), NOW())
ON CONFLICT (vendor_code) DO NOTHING;

INSERT INTO vendors (vendor_code, vendor_name, is_active, created_at, updated_at)
VALUES ('NAVEEN', 'Naveen', true, NOW(), NOW())
ON CONFLICT (vendor_code) DO NOTHING;

INSERT INTO vendors (vendor_code, vendor_name, is_active, created_at, updated_at)
VALUES ('POPULARPNUEMATIC', 'Popular Pnuematic', true, NOW(), NOW())
ON CONFLICT (vendor_code) DO NOTHING;

INSERT INTO vendors (vendor_code, vendor_name, is_active, created_at, updated_at)
VALUES ('PRATHAMESHTECHNOLOGY', 'PrathameshTechnology & Industries', true, NOW(), NOW())
ON CONFLICT (vendor_code) DO NOTHING;

INSERT INTO vendors (vendor_code, vendor_name, is_active, created_at, updated_at)
VALUES ('PREMIERELECTRONICS', 'Premier Electronics', true, NOW(), NOW())
ON CONFLICT (vendor_code) DO NOTHING;

INSERT INTO vendors (vendor_code, vendor_name, is_active, created_at, updated_at)
VALUES ('RRINNOVATIONS', 'RR Innovations', true, NOW(), NOW())
ON CONFLICT (vendor_code) DO NOTHING;

INSERT INTO vendors (vendor_code, vendor_name, is_active, created_at, updated_at)
VALUES ('ROBU', 'Robu', true, NOW(), NOW())
ON CONFLICT (vendor_code) DO NOTHING;

INSERT INTO vendors (vendor_code, vendor_name, is_active, created_at, updated_at)
VALUES ('ROBU3DPRINT', 'Robu 3D print', true, NOW(), NOW())
ON CONFLICT (vendor_code) DO NOTHING;

INSERT INTO vendors (vendor_code, vendor_name, is_active, created_at, updated_at)
VALUES ('ROLAND', 'Roland', true, NOW(), NOW())
ON CONFLICT (vendor_code) DO NOTHING;

INSERT INTO vendors (vendor_code, vendor_name, is_active, created_at, updated_at)
VALUES ('SEUTES', 'Seutes', true, NOW(), NOW())
ON CONFLICT (vendor_code) DO NOTHING;

INSERT INTO vendors (vendor_code, vendor_name, is_active, created_at, updated_at)
VALUES ('SHENZENISDTECHNOLOGY', 'Shenzen ISD Technology', true, NOW(), NOW())
ON CONFLICT (vendor_code) DO NOTHING;

INSERT INTO vendors (vendor_code, vendor_name, is_active, created_at, updated_at)
VALUES ('SUZHOUVOLSUNELECTRON', 'Suzhou Volsun Electronics Technology', true, NOW(), NOW())
ON CONFLICT (vendor_code) DO NOTHING;

INSERT INTO vendors (vendor_code, vendor_name, is_active, created_at, updated_at)
VALUES ('SVTHERMTECHNOLOGIES', 'Svtherm Technologies', true, NOW(), NOW())
ON CONFLICT (vendor_code) DO NOTHING;

INSERT INTO vendors (vendor_code, vendor_name, is_active, created_at, updated_at)
VALUES ('SYNERGY', 'Synergy', true, NOW(), NOW())
ON CONFLICT (vendor_code) DO NOTHING;

INSERT INTO vendors (vendor_code, vendor_name, is_active, created_at, updated_at)
VALUES ('TANVEERINTERNATIONAL', 'Tanveer International', true, NOW(), NOW())
ON CONFLICT (vendor_code) DO NOTHING;

INSERT INTO vendors (vendor_code, vendor_name, is_active, created_at, updated_at)
VALUES ('VINODRAI', 'Vinod Rai', true, NOW(), NOW())
ON CONFLICT (vendor_code) DO NOTHING;

INSERT INTO vendors (vendor_code, vendor_name, is_active, created_at, updated_at)
VALUES ('VYOM', 'Vyom', true, NOW(), NOW())
ON CONFLICT (vendor_code) DO NOTHING;

INSERT INTO vendors (vendor_code, vendor_name, is_active, created_at, updated_at)
VALUES ('WEBEL', 'Webel', true, NOW(), NOW())
ON CONFLICT (vendor_code) DO NOTHING;

INSERT INTO vendors (vendor_code, vendor_name, is_active, created_at, updated_at)
VALUES ('WEIPU', 'Weipu', true, NOW(), NOW())
ON CONFLICT (vendor_code) DO NOTHING;



-- ============================================================================
-- INSERT RAW MATERIALS (Category: RM)
-- ============================================================================

INSERT INTO items (item_code, item_name, category, uom, unit_price, is_active, created_at, updated_at)
VALUES ('QX7-TRANSMITTER-WITH', 'QX7 Transmitter with R9M', 'RM', 'Number', 12000.0, true, NOW(), NOW())
ON CONFLICT (item_code) DO NOTHING;

INSERT INTO items (item_code, item_name, category, uom, unit_price, is_active, created_at, updated_at)
VALUES ('RECEIVER-MODULE-R9MMR9MXR9', 'Receiver Module R9MM/R9MX/R9', 'RM', 'Number', 2200.0, true, NOW(), NOW())
ON CONFLICT (item_code) DO NOTHING;

INSERT INTO items (item_code, item_name, category, uom, unit_price, is_active, created_at, updated_at)
VALUES ('R9M-MINI-RECEIVER', 'R9M Mini Receiver Module', 'RM', 'PCS', 0, true, NOW(), NOW())
ON CONFLICT (item_code) DO NOTHING;

INSERT INTO items (item_code, item_name, category, uom, unit_price, is_active, created_at, updated_at)
VALUES ('FREE-WHEEL-DIODE', 'Free Wheel Diode SMD M7', 'RM', 'Number', 1.7, true, NOW(), NOW())
ON CONFLICT (item_code) DO NOTHING;

INSERT INTO items (item_code, item_name, category, uom, unit_price, is_active, created_at, updated_at)
VALUES ('AMS1117-50V', 'AMS1117 5.0v', 'RM', 'Number', 10.0, true, NOW(), NOW())
ON CONFLICT (item_code) DO NOTHING;

INSERT INTO items (item_code, item_name, category, uom, unit_price, is_active, created_at, updated_at)
VALUES ('AMS1117-33V', 'AMS1117 3.3v', 'RM', 'Number', 10.0, true, NOW(), NOW())
ON CONFLICT (item_code) DO NOTHING;

INSERT INTO items (item_code, item_name, category, uom, unit_price, is_active, created_at, updated_at)
VALUES ('NEO6M-GPSL80-GPS', 'NEO-6M GPS/L80 GPS', 'RM', 'Number', 245.0, true, NOW(), NOW())
ON CONFLICT (item_code) DO NOTHING;

INSERT INTO items (item_code, item_name, category, uom, unit_price, is_active, created_at, updated_at)
VALUES ('LC86G-GPS', 'LC86G GPS', 'RM', 'Number', 0, true, NOW(), NOW())
ON CONFLICT (item_code) DO NOTHING;

INSERT INTO items (item_code, item_name, category, uom, unit_price, is_active, created_at, updated_at)
VALUES ('HERE3GPS', 'Here3+GPS', 'RM', 'PCS', 0, true, NOW(), NOW())
ON CONFLICT (item_code) DO NOTHING;

INSERT INTO items (item_code, item_name, category, uom, unit_price, is_active, created_at, updated_at)
VALUES ('55MM-FEMALE-BULLET', '5.5mm Female Bullet connector', 'RM', 'Number', 0, true, NOW(), NOW())
ON CONFLICT (item_code) DO NOTHING;

INSERT INTO items (item_code, item_name, category, uom, unit_price, is_active, created_at, updated_at)
VALUES ('4MM-MALE-BULLET', '4mm Male Bullet connector', 'RM', 'Number', 22.5, true, NOW(), NOW())
ON CONFLICT (item_code) DO NOTHING;

INSERT INTO items (item_code, item_name, category, uom, unit_price, is_active, created_at, updated_at)
VALUES ('4MM-FEMALE-BULLET', '4mm Female Bullet connector', 'RM', 'Number', 22.5, true, NOW(), NOW())
ON CONFLICT (item_code) DO NOTHING;

INSERT INTO items (item_code, item_name, category, uom, unit_price, is_active, created_at, updated_at)
VALUES ('2MM-MALE-BULLET', '2mm male bullet connector', 'RM', 'Number', 9.0, true, NOW(), NOW())
ON CONFLICT (item_code) DO NOTHING;

INSERT INTO items (item_code, item_name, category, uom, unit_price, is_active, created_at, updated_at)
VALUES ('2MM-FEMALE-BULLET', '2mm Female Bullet connector', 'RM', 'Number', 9.0, true, NOW(), NOW())
ON CONFLICT (item_code) DO NOTHING;

INSERT INTO items (item_code, item_name, category, uom, unit_price, is_active, created_at, updated_at)
VALUES ('6MM-MALE-BULLET', '6mm male bullet connector', 'RM', 'Number', 50.0, true, NOW(), NOW())
ON CONFLICT (item_code) DO NOTHING;

INSERT INTO items (item_code, item_name, category, uom, unit_price, is_active, created_at, updated_at)
VALUES ('6MM-FEMALE-BULLET', '6mm female bullet connector', 'RM', 'Number', 50.0, true, NOW(), NOW())
ON CONFLICT (item_code) DO NOTHING;

INSERT INTO items (item_code, item_name, category, uom, unit_price, is_active, created_at, updated_at)
VALUES ('8MM-MALE-BULLET', '8mm male bullet connector', 'RM', 'Number', 56.0, true, NOW(), NOW())
ON CONFLICT (item_code) DO NOTHING;

INSERT INTO items (item_code, item_name, category, uom, unit_price, is_active, created_at, updated_at)
VALUES ('8MM-FEMALE-BULLET', '8mm female bullet connector', 'RM', 'Number', 56.0, true, NOW(), NOW())
ON CONFLICT (item_code) DO NOTHING;

INSERT INTO items (item_code, item_name, category, uom, unit_price, is_active, created_at, updated_at)
VALUES ('ULTRA-FLEXIBLE-BLACK', 'Ultra Flexible Black 8AWG', 'RM', 'Meter', 263.0, true, NOW(), NOW())
ON CONFLICT (item_code) DO NOTHING;

INSERT INTO items (item_code, item_name, category, uom, unit_price, is_active, created_at, updated_at)
VALUES ('ULTRA-FLEXIBLE-RED', 'Ultra Flexible  Red 8AWG', 'RM', 'Meter', 263.0, true, NOW(), NOW())
ON CONFLICT (item_code) DO NOTHING;

INSERT INTO items (item_code, item_name, category, uom, unit_price, is_active, created_at, updated_at)
VALUES ('ULTRA-FLEXIBLE-BLACK', 'Ultra Flexible Black 12AWG', 'RM', 'Meter', 110.0, true, NOW(), NOW())
ON CONFLICT (item_code) DO NOTHING;

INSERT INTO items (item_code, item_name, category, uom, unit_price, is_active, created_at, updated_at)
VALUES ('ULTRA-FLEXIBLE-RED', 'Ultra Flexible Red 12AWG', 'RM', 'Meter', 110.0, true, NOW(), NOW())
ON CONFLICT (item_code) DO NOTHING;

INSERT INTO items (item_code, item_name, category, uom, unit_price, is_active, created_at, updated_at)
VALUES ('ULTRA-FLEXIBLE-BLACK', 'Ultra Flexible Black 18 AWG', 'RM', 'Meter', 35.0, true, NOW(), NOW())
ON CONFLICT (item_code) DO NOTHING;

INSERT INTO items (item_code, item_name, category, uom, unit_price, is_active, created_at, updated_at)
VALUES ('ULTRA-FLEXIBLE-RED', 'Ultra Flexible Red 18 AWG', 'RM', 'Meter', 35.0, true, NOW(), NOW())
ON CONFLICT (item_code) DO NOTHING;

INSERT INTO items (item_code, item_name, category, uom, unit_price, is_active, created_at, updated_at)
VALUES ('ULTRA-FLEXIBLE-BLACK', 'Ultra Flexible Black 20 AWG', 'RM', 'Meter', 26.5, true, NOW(), NOW())
ON CONFLICT (item_code) DO NOTHING;

INSERT INTO items (item_code, item_name, category, uom, unit_price, is_active, created_at, updated_at)
VALUES ('ULTRA-FLEXIBLE-RED', 'Ultra Flexible Red 20 AWG', 'RM', 'Meter', 26.5, true, NOW(), NOW())
ON CONFLICT (item_code) DO NOTHING;

INSERT INTO items (item_code, item_name, category, uom, unit_price, is_active, created_at, updated_at)
VALUES ('ULTRA-FLEXIBLE-BLUE', 'Ultra Flexible Blue 20 AWG', 'RM', 'PCS', 0, true, NOW(), NOW())
ON CONFLICT (item_code) DO NOTHING;

INSERT INTO items (item_code, item_name, category, uom, unit_price, is_active, created_at, updated_at)
VALUES ('WATER-FLOW-SENSOR', 'Water flow sensor YFS401', 'RM', 'Number', 200.0, true, NOW(), NOW())
ON CONFLICT (item_code) DO NOTHING;

INSERT INTO items (item_code, item_name, category, uom, unit_price, is_active, created_at, updated_at)
VALUES ('WATER-PUMP-550', 'Water pump 550 diaphragm', 'RM', 'Number', 473.0, true, NOW(), NOW())
ON CONFLICT (item_code) DO NOTHING;

INSERT INTO items (item_code, item_name, category, uom, unit_price, is_active, created_at, updated_at)
VALUES ('1S-LIPO-INDICATOR', '1S Lipo indicator (Not Using)', 'RM', 'Number', 91.0, true, NOW(), NOW())
ON CONFLICT (item_code) DO NOTHING;

INSERT INTO items (item_code, item_name, category, uom, unit_price, is_active, created_at, updated_at)
VALUES ('2S-LIPO-INDICATOR', '2S Lipo indicator', 'RM', 'Number', 100.0, true, NOW(), NOW())
ON CONFLICT (item_code) DO NOTHING;

INSERT INTO items (item_code, item_name, category, uom, unit_price, is_active, created_at, updated_at)
VALUES ('LIPO-INDICATOR-CASINGS', 'Lipo Indicator Casings', 'RM', 'Number', 120.0, true, NOW(), NOW())
ON CONFLICT (item_code) DO NOTHING;

INSERT INTO items (item_code, item_name, category, uom, unit_price, is_active, created_at, updated_at)
VALUES ('BUCK-CONVERTER-XL7015', 'Buck converter XL7015 50v', 'RM', 'Number', 78.0, true, NOW(), NOW())
ON CONFLICT (item_code) DO NOTHING;

INSERT INTO items (item_code, item_name, category, uom, unit_price, is_active, created_at, updated_at)
VALUES ('LM2596-IN-AMCA', 'LM2596 in AMCA', 'RM', 'Number', 65.0, true, NOW(), NOW())
ON CONFLICT (item_code) DO NOTHING;

INSERT INTO items (item_code, item_name, category, uom, unit_price, is_active, created_at, updated_at)
VALUES ('XL4015XL4005-5A-BUCK', 'XL4015/XL4005 5A buck converter', 'RM', 'Number', 72.0, true, NOW(), NOW())
ON CONFLICT (item_code) DO NOTHING;

INSERT INTO items (item_code, item_name, category, uom, unit_price, is_active, created_at, updated_at)
VALUES ('XT90-FEMALE-HOUSING', 'XT90 Female housing', 'RM', 'Number', 48.0, true, NOW(), NOW())
ON CONFLICT (item_code) DO NOTHING;

INSERT INTO items (item_code, item_name, category, uom, unit_price, is_active, created_at, updated_at)
VALUES ('XT30', 'XT30', 'RM', 'PCS', 0, true, NOW(), NOW())
ON CONFLICT (item_code) DO NOTHING;

INSERT INTO items (item_code, item_name, category, uom, unit_price, is_active, created_at, updated_at)
VALUES ('XT60', 'XT60', 'RM', 'PCS', 0, true, NOW(), NOW())
ON CONFLICT (item_code) DO NOTHING;

INSERT INTO items (item_code, item_name, category, uom, unit_price, is_active, created_at, updated_at)
VALUES ('24V-ACDC-MODULE', '24v AC/DC module', 'RM', 'Number', 372.0, true, NOW(), NOW())
ON CONFLICT (item_code) DO NOTHING;

INSERT INTO items (item_code, item_name, category, uom, unit_price, is_active, created_at, updated_at)
VALUES ('MOMENTARY-SWITCH-JCB', 'Momentary Switch JCB', 'RM', 'Number', 200.0, true, NOW(), NOW())
ON CONFLICT (item_code) DO NOTHING;

INSERT INTO items (item_code, item_name, category, uom, unit_price, is_active, created_at, updated_at)
VALUES ('LATCHING-POWER-SWITCH', 'Latching Power switch JCB', 'RM', 'Number', 215.0, true, NOW(), NOW())
ON CONFLICT (item_code) DO NOTHING;

INSERT INTO items (item_code, item_name, category, uom, unit_price, is_active, created_at, updated_at)
VALUES ('PWB-FOR-IFU', 'PWB for IFU', 'RM', 'Number', 20.0, true, NOW(), NOW())
ON CONFLICT (item_code) DO NOTHING;

INSERT INTO items (item_code, item_name, category, uom, unit_price, is_active, created_at, updated_at)
VALUES ('PWB-FOR-JCB', 'PWB for JCB', 'RM', 'Number', 100.0, true, NOW(), NOW())
ON CONFLICT (item_code) DO NOTHING;

INSERT INTO items (item_code, item_name, category, uom, unit_price, is_active, created_at, updated_at)
VALUES ('PWB-OF-STBD', 'PWB of STBD flash light', 'RM', 'Number', 30.0, true, NOW(), NOW())
ON CONFLICT (item_code) DO NOTHING;

INSERT INTO items (item_code, item_name, category, uom, unit_price, is_active, created_at, updated_at)
VALUES ('PWB-OF-PORT', 'PWB of PORT flash light', 'RM', 'Number', 30.0, true, NOW(), NOW())
ON CONFLICT (item_code) DO NOTHING;

INSERT INTO items (item_code, item_name, category, uom, unit_price, is_active, created_at, updated_at)
VALUES ('PWB-OF-A4', 'PWB of A4 Motherboard', 'RM', 'Number', 200.0, true, NOW(), NOW())
ON CONFLICT (item_code) DO NOTHING;

INSERT INTO items (item_code, item_name, category, uom, unit_price, is_active, created_at, updated_at)
VALUES ('PWB-OF-CURRENT', 'PWB of Current Sensor', 'RM', 'Number', 20.0, true, NOW(), NOW())
ON CONFLICT (item_code) DO NOTHING;

INSERT INTO items (item_code, item_name, category, uom, unit_price, is_active, created_at, updated_at)
VALUES ('PWB-OF-BUTTON', 'PWB of Button -2', 'RM', 'Number', 10.0, true, NOW(), NOW())
ON CONFLICT (item_code) DO NOTHING;

INSERT INTO items (item_code, item_name, category, uom, unit_price, is_active, created_at, updated_at)
VALUES ('PWB-FOR-PC', 'PWB for PC (in charger)', 'RM', 'Number', 10.0, true, NOW(), NOW())
ON CONFLICT (item_code) DO NOTHING;

INSERT INTO items (item_code, item_name, category, uom, unit_price, is_active, created_at, updated_at)
VALUES ('PWB-FOR-BATHEMETRY', 'PWB for Bathemetry Sensor', 'RM', 'Number', 0, true, NOW(), NOW())
ON CONFLICT (item_code) DO NOTHING;

INSERT INTO items (item_code, item_name, category, uom, unit_price, is_active, created_at, updated_at)
VALUES ('GENERAL-PCB-6X6', 'General PCB 6x6', 'RM', 'PCS', 0, true, NOW(), NOW())
ON CONFLICT (item_code) DO NOTHING;

INSERT INTO items (item_code, item_name, category, uom, unit_price, is_active, created_at, updated_at)
VALUES ('GENERAL-PCB-6X4', 'General PCB 6X4', 'RM', 'PCS', 0, true, NOW(), NOW())
ON CONFLICT (item_code) DO NOTHING;

INSERT INTO items (item_code, item_name, category, uom, unit_price, is_active, created_at, updated_at)
VALUES ('PCB-OF-ROHM', 'PCB of ROHM Buck  on Murata Foot Print', 'RM', 'PCS', 0, true, NOW(), NOW())
ON CONFLICT (item_code) DO NOTHING;

INSERT INTO items (item_code, item_name, category, uom, unit_price, is_active, created_at, updated_at)
VALUES ('PCB-OF-ROHM', 'PCB of ROHM buck on XL4007 Foot Print', 'RM', 'PCS', 0, true, NOW(), NOW())
ON CONFLICT (item_code) DO NOTHING;

INSERT INTO items (item_code, item_name, category, uom, unit_price, is_active, created_at, updated_at)
VALUES ('PCB-OF-MP9486', 'PCB of MP9486 on Murata FootPrint', 'RM', 'PCS', 0, true, NOW(), NOW())
ON CONFLICT (item_code) DO NOTHING;

INSERT INTO items (item_code, item_name, category, uom, unit_price, is_active, created_at, updated_at)
VALUES ('AMCA-ONBOARD-CHARGING', 'AMCA Onboard Charging Circuit', 'RM', 'Number', 0, true, NOW(), NOW())
ON CONFLICT (item_code) DO NOTHING;

INSERT INTO items (item_code, item_name, category, uom, unit_price, is_active, created_at, updated_at)
VALUES ('SBUS-GENERATOR-CIRCUIT', 'SBus Generator Circuit (Tailored Solution)', 'RM', 'Number', 0, true, NOW(), NOW())
ON CONFLICT (item_code) DO NOTHING;

INSERT INTO items (item_code, item_name, category, uom, unit_price, is_active, created_at, updated_at)
VALUES ('A5-BOARD-WITH', 'A5 Board with own bucks', 'RM', 'Number', 0, true, NOW(), NOW())
ON CONFLICT (item_code) DO NOTHING;

INSERT INTO items (item_code, item_name, category, uom, unit_price, is_active, created_at, updated_at)
VALUES ('WCS1700-CURRENT-SENSOR', 'WCS1700 current Sensor', 'RM', 'Number', 185.0, true, NOW(), NOW())
ON CONFLICT (item_code) DO NOTHING;

INSERT INTO items (item_code, item_name, category, uom, unit_price, is_active, created_at, updated_at)
VALUES ('6X3-BATTERY-BLOCKS', '6X3 BATTERY blocks', 'RM', 'Number', 450.0, true, NOW(), NOW())
ON CONFLICT (item_code) DO NOTHING;

INSERT INTO items (item_code, item_name, category, uom, unit_price, is_active, created_at, updated_at)
VALUES ('21700-BATTERRIES', '21700 Batterries', 'RM', 'PCS', 0, true, NOW(), NOW())
ON CONFLICT (item_code) DO NOTHING;

INSERT INTO items (item_code, item_name, category, uom, unit_price, is_active, created_at, updated_at)
VALUES ('18650-CELLS-LIION', '18650 cells Li-Ion for JCB', 'RM', 'Number', 750.0, true, NOW(), NOW())
ON CONFLICT (item_code) DO NOTHING;

INSERT INTO items (item_code, item_name, category, uom, unit_price, is_active, created_at, updated_at)
VALUES ('18650-CELL-HOLDER', '18650 Cell Holder', 'RM', 'Number', 68.0, true, NOW(), NOW())
ON CONFLICT (item_code) DO NOTHING;

INSERT INTO items (item_code, item_name, category, uom, unit_price, is_active, created_at, updated_at)
VALUES ('USB-DATA-CHARGING', 'USB Data & Charging Cable 1.5m length Black', 'RM', 'Number', 35.0, true, NOW(), NOW())
ON CONFLICT (item_code) DO NOTHING;

INSERT INTO items (item_code, item_name, category, uom, unit_price, is_active, created_at, updated_at)
VALUES ('DC-JACK-PANEL', 'DC Jack Panel Mount', 'RM', 'Number', 5.0, true, NOW(), NOW())
ON CONFLICT (item_code) DO NOTHING;

INSERT INTO items (item_code, item_name, category, uom, unit_price, is_active, created_at, updated_at)
VALUES ('HEAT-SINK-PASTE', 'Heat Sink Paste', 'RM', 'PCS', 0, true, NOW(), NOW())
ON CONFLICT (item_code) DO NOTHING;

INSERT INTO items (item_code, item_name, category, uom, unit_price, is_active, created_at, updated_at)
VALUES ('LEAD-PASTE', 'Lead paste', 'RM', 'Grm', 5.0, true, NOW(), NOW())
ON CONFLICT (item_code) DO NOTHING;

INSERT INTO items (item_code, item_name, category, uom, unit_price, is_active, created_at, updated_at)
VALUES ('LEAD-WIRE-22AWG', 'Lead wire 22AWG', 'RM', 'grm', 2.5, true, NOW(), NOW())
ON CONFLICT (item_code) DO NOTHING;

INSERT INTO items (item_code, item_name, category, uom, unit_price, is_active, created_at, updated_at)
VALUES ('HEAT-SINK-PAD', 'Heat Sink Pad', 'RM', 'Packet', 800.0, true, NOW(), NOW())
ON CONFLICT (item_code) DO NOTHING;

INSERT INTO items (item_code, item_name, category, uom, unit_price, is_active, created_at, updated_at)
VALUES ('LM358DT-SMD', 'LM358DT SMD', 'RM', 'Number', 8.0, true, NOW(), NOW())
ON CONFLICT (item_code) DO NOTHING;

INSERT INTO items (item_code, item_name, category, uom, unit_price, is_active, created_at, updated_at)
VALUES ('01UF-0805', '0.1uF 0805', 'RM', 'Number', 0.7, true, NOW(), NOW())
ON CONFLICT (item_code) DO NOTHING;

INSERT INTO items (item_code, item_name, category, uom, unit_price, is_active, created_at, updated_at)
VALUES ('001UF-0805', '0.01uF 0805', 'RM', 'Number', 0.7, true, NOW(), NOW())
ON CONFLICT (item_code) DO NOTHING;

INSERT INTO items (item_code, item_name, category, uom, unit_price, is_active, created_at, updated_at)
VALUES ('LED-0805-SMD', 'LED 0805 SMD', 'RM', 'Number', 0.7, true, NOW(), NOW())
ON CONFLICT (item_code) DO NOTHING;

INSERT INTO items (item_code, item_name, category, uom, unit_price, is_active, created_at, updated_at)
VALUES ('TS5A3157DBVR-SSR-ENCODER', 'TS5A3157DBVR SSR Encoder Signal Cut-Off', 'RM', 'Number', 27.48, true, NOW(), NOW())
ON CONFLICT (item_code) DO NOTHING;

INSERT INTO items (item_code, item_name, category, uom, unit_price, is_active, created_at, updated_at)
VALUES ('TACTILE-SWITCH-FOR', 'Tactile Switch for IFU four leg', 'RM', 'Number', 11.58, true, NOW(), NOW())
ON CONFLICT (item_code) DO NOTHING;

INSERT INTO items (item_code, item_name, category, uom, unit_price, is_active, created_at, updated_at)
VALUES ('LM2596HVSADJ-BUCK-ONLY', 'LM2596HVS-ADJ Buck only IC', 'RM', 'Number', 628.0, true, NOW(), NOW())
ON CONFLICT (item_code) DO NOTHING;

INSERT INTO items (item_code, item_name, category, uom, unit_price, is_active, created_at, updated_at)
VALUES ('MP9486AGNZ-100V-BUCK', 'MP9486AGN-Z 100v Buck converter IC', 'RM', 'Number', 215.71, true, NOW(), NOW())
ON CONFLICT (item_code) DO NOTHING;

INSERT INTO items (item_code, item_name, category, uom, unit_price, is_active, created_at, updated_at)
VALUES ('12V-FIXED-BUCK', '12v Fixed Buck 18-75 In MultiCom Pro', 'RM', 'Number', 2288.0, true, NOW(), NOW())
ON CONFLICT (item_code) DO NOTHING;

INSERT INTO items (item_code, item_name, category, uom, unit_price, is_active, created_at, updated_at)
VALUES ('5V-FIXED-BUCK', '5v Fixed Buck 18-75 In MultiCom Pro', 'RM', 'Number', 2288.0, true, NOW(), NOW())
ON CONFLICT (item_code) DO NOTHING;

INSERT INTO items (item_code, item_name, category, uom, unit_price, is_active, created_at, updated_at)
VALUES ('1N4148-SMD', '1N4148 SMD', 'RM', 'Number', 0.75, true, NOW(), NOW())
ON CONFLICT (item_code) DO NOTHING;

INSERT INTO items (item_code, item_name, category, uom, unit_price, is_active, created_at, updated_at)
VALUES ('18PF-0805-CAPACITOR', '18pF 0805 capacitor', 'RM', 'Number', 0.7, true, NOW(), NOW())
ON CONFLICT (item_code) DO NOTHING;

INSERT INTO items (item_code, item_name, category, uom, unit_price, is_active, created_at, updated_at)
VALUES ('10UF-0805-CAPACITOR', '10uF 0805 capacitor', 'RM', 'PCS', 0, true, NOW(), NOW())
ON CONFLICT (item_code) DO NOTHING;

INSERT INTO items (item_code, item_name, category, uom, unit_price, is_active, created_at, updated_at)
VALUES ('10UF-10V-TANTALUM', '10uF 10v Tantalum Capacitor Case A', 'RM', 'Number', 4.5, true, NOW(), NOW())
ON CONFLICT (item_code) DO NOTHING;

INSERT INTO items (item_code, item_name, category, uom, unit_price, is_active, created_at, updated_at)
VALUES ('1K-0805-RESISTOR', '1k 0805 Resistor', 'RM', 'Number', 0.25, true, NOW(), NOW())
ON CONFLICT (item_code) DO NOTHING;

INSERT INTO items (item_code, item_name, category, uom, unit_price, is_active, created_at, updated_at)
VALUES ('10K-0805-RESISTOR', '10k 0805 resistor', 'RM', 'Number', 0.25, true, NOW(), NOW())
ON CONFLICT (item_code) DO NOTHING;

INSERT INTO items (item_code, item_name, category, uom, unit_price, is_active, created_at, updated_at)
VALUES ('510K-RESISTOR', '510K Resistor', 'RM', 'PCS', 0.25, true, NOW(), NOW())
ON CONFLICT (item_code) DO NOTHING;

INSERT INTO items (item_code, item_name, category, uom, unit_price, is_active, created_at, updated_at)
VALUES ('560K-RESISTOR', '560K Resistor', 'RM', 'PCS', 0.25, true, NOW(), NOW())
ON CONFLICT (item_code) DO NOTHING;

INSERT INTO items (item_code, item_name, category, uom, unit_price, is_active, created_at, updated_at)
VALUES ('330E-0805-RESISTOR', '330E 0805 Resistor', 'RM', 'Number', 0.25, true, NOW(), NOW())
ON CONFLICT (item_code) DO NOTHING;

INSERT INTO items (item_code, item_name, category, uom, unit_price, is_active, created_at, updated_at)
VALUES ('MURATA-12V-45A', 'Murata 12v 4.5A buck', 'RM', 'Number', 2750.0, true, NOW(), NOW())
ON CONFLICT (item_code) DO NOTHING;

INSERT INTO items (item_code, item_name, category, uom, unit_price, is_active, created_at, updated_at)
VALUES ('MURATA-5V-10A', 'Murata 5v 10A buck', 'RM', 'Number', 2750.0, true, NOW(), NOW())
ON CONFLICT (item_code) DO NOTHING;

INSERT INTO items (item_code, item_name, category, uom, unit_price, is_active, created_at, updated_at)
VALUES ('1-MEG-3296', '1 Meg 3296', 'RM', 'PCS', 0, true, NOW(), NOW())
ON CONFLICT (item_code) DO NOTHING;

INSERT INTO items (item_code, item_name, category, uom, unit_price, is_active, created_at, updated_at)
VALUES ('1K-3296-RESISTOR', '1K 3296 Resistor', 'RM', 'PCS', 0, true, NOW(), NOW())
ON CONFLICT (item_code) DO NOTHING;

INSERT INTO items (item_code, item_name, category, uom, unit_price, is_active, created_at, updated_at)
VALUES ('2K-3296-RESISTOR', '2K 3296 Resistor', 'RM', 'PCS', 0, true, NOW(), NOW())
ON CONFLICT (item_code) DO NOTHING;

INSERT INTO items (item_code, item_name, category, uom, unit_price, is_active, created_at, updated_at)
VALUES ('5-W-1', '5 W 1 Ω Resistor', 'RM', 'PCS', 0, true, NOW(), NOW())
ON CONFLICT (item_code) DO NOTHING;

INSERT INTO items (item_code, item_name, category, uom, unit_price, is_active, created_at, updated_at)
VALUES ('5-W-5', '5 W 5 Ω Resistor', 'RM', 'PCS', 0, true, NOW(), NOW())
ON CONFLICT (item_code) DO NOTHING;

INSERT INTO items (item_code, item_name, category, uom, unit_price, is_active, created_at, updated_at)
VALUES ('FUSE-500MA', 'Fuse 500mA', 'RM', 'Number', 35.0, true, NOW(), NOW())
ON CONFLICT (item_code) DO NOTHING;

INSERT INTO items (item_code, item_name, category, uom, unit_price, is_active, created_at, updated_at)
VALUES ('MCP3208', 'MCP3208', 'RM', 'Number', 311.0, true, NOW(), NOW())
ON CONFLICT (item_code) DO NOTHING;

INSERT INTO items (item_code, item_name, category, uom, unit_price, is_active, created_at, updated_at)
VALUES ('23A-24V-POWER', '23A 24v Power relay', 'RM', 'Number', 90.0, true, NOW(), NOW())
ON CONFLICT (item_code) DO NOTHING;

INSERT INTO items (item_code, item_name, category, uom, unit_price, is_active, created_at, updated_at)
VALUES ('LM61-TEMPERATURE-SENSOR', 'LM61 Temperature Sensor', 'RM', 'Number', 104.0, true, NOW(), NOW())
ON CONFLICT (item_code) DO NOTHING;

INSERT INTO items (item_code, item_name, category, uom, unit_price, is_active, created_at, updated_at)
VALUES ('47K-0805', '47k 0805', 'RM', 'Number', 0.25, true, NOW(), NOW())
ON CONFLICT (item_code) DO NOTHING;

INSERT INTO items (item_code, item_name, category, uom, unit_price, is_active, created_at, updated_at)
VALUES ('470K-0805-PANASONICBOURNSMURATA', '470k 0805 PANASONIC/BOURNS/MURATA', 'RM', 'Number', 3.3, true, NOW(), NOW())
ON CONFLICT (item_code) DO NOTHING;

INSERT INTO items (item_code, item_name, category, uom, unit_price, is_active, created_at, updated_at)
VALUES ('20K-0805-PANASONICBOURNSMURATA', '20k 0805 PANASONIC/BOURNS/MURATA', 'RM', 'Number', 3.3, true, NOW(), NOW())
ON CONFLICT (item_code) DO NOTHING;

INSERT INTO items (item_code, item_name, category, uom, unit_price, is_active, created_at, updated_at)
VALUES ('1UF-0805-PANASONIC', '1uF 0805 PANASONIC', 'RM', 'Number', 5.0, true, NOW(), NOW())
ON CONFLICT (item_code) DO NOTHING;

INSERT INTO items (item_code, item_name, category, uom, unit_price, is_active, created_at, updated_at)
VALUES ('16MHZ-CRYSTAL-OSCILLATOR', '16MHz Crystal Oscillator', 'RM', 'Number', 46.0, true, NOW(), NOW())
ON CONFLICT (item_code) DO NOTHING;

INSERT INTO items (item_code, item_name, category, uom, unit_price, is_active, created_at, updated_at)
VALUES ('ULN2004-SMD', 'ULN2004 SMD', 'RM', 'Number', 57.0, true, NOW(), NOW())
ON CONFLICT (item_code) DO NOTHING;

INSERT INTO items (item_code, item_name, category, uom, unit_price, is_active, created_at, updated_at)
VALUES ('SSR-AQW282SX', 'SSR AQW282SX', 'RM', 'Number', 208.0, true, NOW(), NOW())
ON CONFLICT (item_code) DO NOTHING;

INSERT INTO items (item_code, item_name, category, uom, unit_price, is_active, created_at, updated_at)
VALUES ('ATMEGA328P-CONTROLLER', 'Atmega328P Controller', 'RM', 'Number', 319.0, true, NOW(), NOW())
ON CONFLICT (item_code) DO NOTHING;

INSERT INTO items (item_code, item_name, category, uom, unit_price, is_active, created_at, updated_at)
VALUES ('POWER-RELAY-120A', 'Power Relay 120A 12v Y7', 'RM', 'Number', 2600.0, true, NOW(), NOW())
ON CONFLICT (item_code) DO NOTHING;

INSERT INTO items (item_code, item_name, category, uom, unit_price, is_active, created_at, updated_at)
VALUES ('POWER-RELAY-90A', 'Power Relay 90A 12v Y6', 'RM', 'Number', 2067.0, true, NOW(), NOW())
ON CONFLICT (item_code) DO NOTHING;

INSERT INTO items (item_code, item_name, category, uom, unit_price, is_active, created_at, updated_at)
VALUES ('SPST-RELAY-5A12V', 'SPST relay 5A-12v ANTI_S & KILL', 'RM', 'Number', 90.0, true, NOW(), NOW())
ON CONFLICT (item_code) DO NOTHING;

INSERT INTO items (item_code, item_name, category, uom, unit_price, is_active, created_at, updated_at)
VALUES ('BALANCING-1A-DPDT', 'Balancing 1A DPDT 24v Relay', 'RM', 'Number', 90.0, true, NOW(), NOW())
ON CONFLICT (item_code) DO NOTHING;

INSERT INTO items (item_code, item_name, category, uom, unit_price, is_active, created_at, updated_at)
VALUES ('BALANCING-RELAY-5A2A', 'Balancing relay 5A/2A 24v SPST', 'RM', 'Number', 55.0, true, NOW(), NOW())
ON CONFLICT (item_code) DO NOTHING;

INSERT INTO items (item_code, item_name, category, uom, unit_price, is_active, created_at, updated_at)
VALUES ('5V-2A-USB', '5v 2A USB Adapter', 'RM', 'Number', 120.0, true, NOW(), NOW())
ON CONFLICT (item_code) DO NOTHING;

INSERT INTO items (item_code, item_name, category, uom, unit_price, is_active, created_at, updated_at)
VALUES ('5V-3A-POWER', '5v 3A Power adapter DC Plug Orange', 'RM', 'Number', 408.0, true, NOW(), NOW())
ON CONFLICT (item_code) DO NOTHING;

INSERT INTO items (item_code, item_name, category, uom, unit_price, is_active, created_at, updated_at)
VALUES ('5V-3A-POWER', '5v 3A Power adapter DC Plug Ordinary', 'RM', 'Number', 168.0, true, NOW(), NOW())
ON CONFLICT (item_code) DO NOTHING;

INSERT INTO items (item_code, item_name, category, uom, unit_price, is_active, created_at, updated_at)
VALUES ('9V-2A-POWER', '9v 2A Power adapter DC Plug Orange', 'RM', 'Number', 368.0, true, NOW(), NOW())
ON CONFLICT (item_code) DO NOTHING;

INSERT INTO items (item_code, item_name, category, uom, unit_price, is_active, created_at, updated_at)
VALUES ('32GB-SD-CARD', '32Gb SD Card', 'RM', 'Number', 300.0, true, NOW(), NOW())
ON CONFLICT (item_code) DO NOTHING;

INSERT INTO items (item_code, item_name, category, uom, unit_price, is_active, created_at, updated_at)
VALUES ('16PIN-IC-BASE', '16pin IC base', 'RM', 'Number', 2.0, true, NOW(), NOW())
ON CONFLICT (item_code) DO NOTHING;

INSERT INTO items (item_code, item_name, category, uom, unit_price, is_active, created_at, updated_at)
VALUES ('BLUETOOTH-MODULE', 'BlueTooth Module', 'RM', 'Number', 215.0, true, NOW(), NOW())
ON CONFLICT (item_code) DO NOTHING;

INSERT INTO items (item_code, item_name, category, uom, unit_price, is_active, created_at, updated_at)
VALUES ('24AWG-SOLDERING-WIRE', '24AWG Soldering Wire', 'RM', 'Grm', 3.0, true, NOW(), NOW())
ON CONFLICT (item_code) DO NOTHING;

INSERT INTO items (item_code, item_name, category, uom, unit_price, is_active, created_at, updated_at)
VALUES ('12E-2W-RESISTOR', '12E 2W Resistor THT', 'RM', 'Number', 2.0, true, NOW(), NOW())
ON CONFLICT (item_code) DO NOTHING;

INSERT INTO items (item_code, item_name, category, uom, unit_price, is_active, created_at, updated_at)
VALUES ('IMAX-B3-CHARGER', 'iMAx B3 Charger', 'RM', 'Number', 220.0, true, NOW(), NOW())
ON CONFLICT (item_code) DO NOTHING;

INSERT INTO items (item_code, item_name, category, uom, unit_price, is_active, created_at, updated_at)
VALUES ('9V-PIEZO-ELECTRIC', '9v Piezo Electric Buzzer', 'RM', 'Number', 20.0, true, NOW(), NOW())
ON CONFLICT (item_code) DO NOTHING;

INSERT INTO items (item_code, item_name, category, uom, unit_price, is_active, created_at, updated_at)
VALUES ('FEMALE-BERGSTRIP-40X1', 'Female Bergstrip 40x1 2.54mm', 'RM', 'Number', 5.0, true, NOW(), NOW())
ON CONFLICT (item_code) DO NOTHING;

INSERT INTO items (item_code, item_name, category, uom, unit_price, is_active, created_at, updated_at)
VALUES ('MALE-BERGSTRIP-40X1', 'Male Bergstrip 40x1 2.54mm', 'RM', 'Number', 5.0, true, NOW(), NOW())
ON CONFLICT (item_code) DO NOTHING;

INSERT INTO items (item_code, item_name, category, uom, unit_price, is_active, created_at, updated_at)
VALUES ('FEMALE-BERGSTRIP-40X1', 'Female Bergstrip 40x1 2.0mm', 'RM', 'Number', 20.0, true, NOW(), NOW())
ON CONFLICT (item_code) DO NOTHING;

INSERT INTO items (item_code, item_name, category, uom, unit_price, is_active, created_at, updated_at)
VALUES ('MALE-BERGSTRIP-40X1', 'Male Bergstrip 40x1 2.0mm', 'RM', 'Number', 20.0, true, NOW(), NOW())
ON CONFLICT (item_code) DO NOTHING;

INSERT INTO items (item_code, item_name, category, uom, unit_price, is_active, created_at, updated_at)
VALUES ('CONFORMAL-COATING', 'Conformal Coating', 'RM', 'ml', 1.0, true, NOW(), NOW())
ON CONFLICT (item_code) DO NOTHING;

INSERT INTO items (item_code, item_name, category, uom, unit_price, is_active, created_at, updated_at)
VALUES ('SOLDERING-FLUX-SMALL', 'Soldering flux Small lead', 'RM', 'ml', 2.0, true, NOW(), NOW())
ON CONFLICT (item_code) DO NOTHING;

INSERT INTO items (item_code, item_name, category, uom, unit_price, is_active, created_at, updated_at)
VALUES ('3-PIN-CONNECTORS', '3 Pin Connectors', 'RM', 'PCS', 0, true, NOW(), NOW())
ON CONFLICT (item_code) DO NOTHING;

INSERT INTO items (item_code, item_name, category, uom, unit_price, is_active, created_at, updated_at)
VALUES ('5-PIN-MALE', '5 pin male 2510 connector', 'RM', 'PCS', 0, true, NOW(), NOW())
ON CONFLICT (item_code) DO NOTHING;

INSERT INTO items (item_code, item_name, category, uom, unit_price, is_active, created_at, updated_at)
VALUES ('3-PIN-3', '3 pin 3 yrd power cord', 'RM', 'Number', 65.0, true, NOW(), NOW())
ON CONFLICT (item_code) DO NOTHING;

INSERT INTO items (item_code, item_name, category, uom, unit_price, is_active, created_at, updated_at)
VALUES ('2-PIN-JSTXH', '2 pin JST-XH housing', 'RM', 'Number', 2.0, true, NOW(), NOW())
ON CONFLICT (item_code) DO NOTHING;

INSERT INTO items (item_code, item_name, category, uom, unit_price, is_active, created_at, updated_at)
VALUES ('3-PIN-JSTXH', '3 pin JST-XH housing', 'RM', 'Number', 2.0, true, NOW(), NOW())
ON CONFLICT (item_code) DO NOTHING;

INSERT INTO items (item_code, item_name, category, uom, unit_price, is_active, created_at, updated_at)
VALUES ('13-PIN-JSTXH', '13 pin JST-XH housing', 'RM', 'Number', 10.0, true, NOW(), NOW())
ON CONFLICT (item_code) DO NOTHING;

INSERT INTO items (item_code, item_name, category, uom, unit_price, is_active, created_at, updated_at)
VALUES ('15-PIN-JSTXH', '15 pin JST-XH housing', 'RM', 'Number', 10.0, true, NOW(), NOW())
ON CONFLICT (item_code) DO NOTHING;

INSERT INTO items (item_code, item_name, category, uom, unit_price, is_active, created_at, updated_at)
VALUES ('2-PIN-JSTXH', '2 pin JST-XH male top entry', 'RM', 'Number', 2.0, true, NOW(), NOW())
ON CONFLICT (item_code) DO NOTHING;

INSERT INTO items (item_code, item_name, category, uom, unit_price, is_active, created_at, updated_at)
VALUES ('2-PIN-JSTXH', '2 pin JST-XH male top entry RED', 'RM', 'Number', 2.0, true, NOW(), NOW())
ON CONFLICT (item_code) DO NOTHING;

INSERT INTO items (item_code, item_name, category, uom, unit_price, is_active, created_at, updated_at)
VALUES ('2-PIN-JSTXH', '2 pin JST-XH male side entry', 'RM', 'Number', 2.0, true, NOW(), NOW())
ON CONFLICT (item_code) DO NOTHING;

INSERT INTO items (item_code, item_name, category, uom, unit_price, is_active, created_at, updated_at)
VALUES ('3-PIN-JSTXH', '3 pin JST-XH male top entry', 'RM', 'Number', 2.0, true, NOW(), NOW())
ON CONFLICT (item_code) DO NOTHING;

INSERT INTO items (item_code, item_name, category, uom, unit_price, is_active, created_at, updated_at)
VALUES ('4-PIN-JSTXH', '4 pin JST-XH housing', 'RM', 'Number', 0, true, NOW(), NOW())
ON CONFLICT (item_code) DO NOTHING;

INSERT INTO items (item_code, item_name, category, uom, unit_price, is_active, created_at, updated_at)
VALUES ('4-PIN-JSTXH', '4 pin JST-XH male top entry', 'RM', 'Number', 0, true, NOW(), NOW())
ON CONFLICT (item_code) DO NOTHING;

INSERT INTO items (item_code, item_name, category, uom, unit_price, is_active, created_at, updated_at)
VALUES ('4-PIN-JSTXH', '4 pin JST-XH male side entry', 'RM', 'Number', 3.0, true, NOW(), NOW())
ON CONFLICT (item_code) DO NOTHING;

INSERT INTO items (item_code, item_name, category, uom, unit_price, is_active, created_at, updated_at)
VALUES ('5-PIN-JSTXH', '5 pin JST-XH housing', 'RM', 'Number', 0, true, NOW(), NOW())
ON CONFLICT (item_code) DO NOTHING;

INSERT INTO items (item_code, item_name, category, uom, unit_price, is_active, created_at, updated_at)
VALUES ('5-PIN-JSTXH', '5 pin JST-XH male top entry', 'RM', 'Number', 0, true, NOW(), NOW())
ON CONFLICT (item_code) DO NOTHING;

INSERT INTO items (item_code, item_name, category, uom, unit_price, is_active, created_at, updated_at)
VALUES ('6-PIN-JSTXH', '6 pin JST-XH housing', 'RM', 'Number', 0, true, NOW(), NOW())
ON CONFLICT (item_code) DO NOTHING;

INSERT INTO items (item_code, item_name, category, uom, unit_price, is_active, created_at, updated_at)
VALUES ('6-PIN-JSTXH', '6 pin JST-XH male top entry', 'RM', 'Number', 0, true, NOW(), NOW())
ON CONFLICT (item_code) DO NOTHING;

INSERT INTO items (item_code, item_name, category, uom, unit_price, is_active, created_at, updated_at)
VALUES ('2510-CRIMPING-PINS', '2510 Crimping pins', 'RM', 'Number', 0.5, true, NOW(), NOW())
ON CONFLICT (item_code) DO NOTHING;

INSERT INTO items (item_code, item_name, category, uom, unit_price, is_active, created_at, updated_at)
VALUES ('13-PIN-JSTXH', '13 pin JST-XH male top entry', 'RM', 'Number', 10.0, true, NOW(), NOW())
ON CONFLICT (item_code) DO NOTHING;

INSERT INTO items (item_code, item_name, category, uom, unit_price, is_active, created_at, updated_at)
VALUES ('15-PIN-JSTXH', '15 pin JST-XH male top entry', 'RM', 'Number', 10.0, true, NOW(), NOW())
ON CONFLICT (item_code) DO NOTHING;

INSERT INTO items (item_code, item_name, category, uom, unit_price, is_active, created_at, updated_at)
VALUES ('JSTXH-CRIMPING-PINS', 'JST-XH Crimping pins', 'RM', 'Number', 1.0, true, NOW(), NOW())
ON CONFLICT (item_code) DO NOTHING;

INSERT INTO items (item_code, item_name, category, uom, unit_price, is_active, created_at, updated_at)
VALUES ('JSTXH-CRIMPING-PINS', 'JST-XH Crimping pins Gold Finger', 'RM', 'Number', 0, true, NOW(), NOW())
ON CONFLICT (item_code) DO NOTHING;

INSERT INTO items (item_code, item_name, category, uom, unit_price, is_active, created_at, updated_at)
VALUES ('25CM-RED-ONE', '25cm Red one side crimped wire', 'RM', 'Number', 3.0, true, NOW(), NOW())
ON CONFLICT (item_code) DO NOTHING;

INSERT INTO items (item_code, item_name, category, uom, unit_price, is_active, created_at, updated_at)
VALUES ('25CM-GREEN-ONE', '25cm Green one side crimped wire', 'RM', 'Number', 3.0, true, NOW(), NOW())
ON CONFLICT (item_code) DO NOTHING;

INSERT INTO items (item_code, item_name, category, uom, unit_price, is_active, created_at, updated_at)
VALUES ('25CM-BLACK-ONE', '25cm Black one side crimped wire', 'RM', 'Number', 3.0, true, NOW(), NOW())
ON CONFLICT (item_code) DO NOTHING;

INSERT INTO items (item_code, item_name, category, uom, unit_price, is_active, created_at, updated_at)
VALUES ('10CM-ONE-SIDED', '10cm one sided JST crimped Black', 'RM', 'Number', 2.5, true, NOW(), NOW())
ON CONFLICT (item_code) DO NOTHING;

INSERT INTO items (item_code, item_name, category, uom, unit_price, is_active, created_at, updated_at)
VALUES ('10CM-ONE-SIDED', '10cm one sided JST crimped Green', 'RM', 'Number', 2.5, true, NOW(), NOW())
ON CONFLICT (item_code) DO NOTHING;

INSERT INTO items (item_code, item_name, category, uom, unit_price, is_active, created_at, updated_at)
VALUES ('10CM-ONE-SIDED', '10cm one sided JST crimped Voilet', 'RM', 'Number', 2.5, true, NOW(), NOW())
ON CONFLICT (item_code) DO NOTHING;

INSERT INTO items (item_code, item_name, category, uom, unit_price, is_active, created_at, updated_at)
VALUES ('10CM-ONE-SIDED', '10cm one sided JST crimped Yellow', 'RM', 'Number', 2.5, true, NOW(), NOW())
ON CONFLICT (item_code) DO NOTHING;

INSERT INTO items (item_code, item_name, category, uom, unit_price, is_active, created_at, updated_at)
VALUES ('10CM-ONE-SIDED', '10cm one sided JST crimped Sky Blue', 'RM', 'Number', 2.5, true, NOW(), NOW())
ON CONFLICT (item_code) DO NOTHING;

INSERT INTO items (item_code, item_name, category, uom, unit_price, is_active, created_at, updated_at)
VALUES ('10CM-ONE-SIDED', '10cm one sided JST crimped Pink', 'RM', 'Number', 2.5, true, NOW(), NOW())
ON CONFLICT (item_code) DO NOTHING;

INSERT INTO items (item_code, item_name, category, uom, unit_price, is_active, created_at, updated_at)
VALUES ('10CM-ONE-SIDED', '10cm one sided JST crimped Orange', 'RM', 'Number', 2.5, true, NOW(), NOW())
ON CONFLICT (item_code) DO NOTHING;

INSERT INTO items (item_code, item_name, category, uom, unit_price, is_active, created_at, updated_at)
VALUES ('10CM-ONE-SIDED', '10cm one sided JST crimped Dark Blue', 'RM', 'Number', 2.5, true, NOW(), NOW())
ON CONFLICT (item_code) DO NOTHING;

INSERT INTO items (item_code, item_name, category, uom, unit_price, is_active, created_at, updated_at)
VALUES ('10CM-ONE-SIDED', '10cm one sided JST crimped Light Brown', 'RM', 'Number', 2.5, true, NOW(), NOW())
ON CONFLICT (item_code) DO NOTHING;

INSERT INTO items (item_code, item_name, category, uom, unit_price, is_active, created_at, updated_at)
VALUES ('10CM-ONE-SIDED', '10cm one sided JST crimped Dark Brown', 'RM', 'Number', 2.5, true, NOW(), NOW())
ON CONFLICT (item_code) DO NOTHING;

INSERT INTO items (item_code, item_name, category, uom, unit_price, is_active, created_at, updated_at)
VALUES ('10CM-ONE-SIDED', '10cm one sided JST crimped White with Red strip', 'RM', 'Number', 2.5, true, NOW(), NOW())
ON CONFLICT (item_code) DO NOTHING;

INSERT INTO items (item_code, item_name, category, uom, unit_price, is_active, created_at, updated_at)
VALUES ('10CM-ONE-SIDED', '10cm one sided JST crimped White with black strip', 'RM', 'Number', 2.5, true, NOW(), NOW())
ON CONFLICT (item_code) DO NOTHING;

INSERT INTO items (item_code, item_name, category, uom, unit_price, is_active, created_at, updated_at)
VALUES ('10CM-ONE-SIDED', '10cm one sided JST crimped White', 'RM', 'Number', 2.5, true, NOW(), NOW())
ON CONFLICT (item_code) DO NOTHING;

INSERT INTO items (item_code, item_name, category, uom, unit_price, is_active, created_at, updated_at)
VALUES ('10CM-ONE-SIDED', '10cm one sided JST crimped Red', 'RM', 'Number', 2.5, true, NOW(), NOW())
ON CONFLICT (item_code) DO NOTHING;

INSERT INTO items (item_code, item_name, category, uom, unit_price, is_active, created_at, updated_at)
VALUES ('10CM-ONE-SIDED', '10cm one sided JST crimped Light Grey', 'RM', 'Number', 2.5, true, NOW(), NOW())
ON CONFLICT (item_code) DO NOTHING;

INSERT INTO items (item_code, item_name, category, uom, unit_price, is_active, created_at, updated_at)
VALUES ('10CM-ONE-SIDED', '10cm one sided JST crimped Cyan', 'RM', 'Number', 2.5, true, NOW(), NOW())
ON CONFLICT (item_code) DO NOTHING;

INSERT INTO items (item_code, item_name, category, uom, unit_price, is_active, created_at, updated_at)
VALUES ('10CM-ONE-SIDED', '10cm one sided JST crimped Dark Parrot Green', 'RM', 'Number', 2.5, true, NOW(), NOW())
ON CONFLICT (item_code) DO NOTHING;

INSERT INTO items (item_code, item_name, category, uom, unit_price, is_active, created_at, updated_at)
VALUES ('25CM-BLACK-MICROFIT', '25cm Black Microfit one side crimped wires', 'RM', 'Number', 6.0, true, NOW(), NOW())
ON CONFLICT (item_code) DO NOTHING;

INSERT INTO items (item_code, item_name, category, uom, unit_price, is_active, created_at, updated_at)
VALUES ('25CM-GREEN-MICROFIT', '25cm Green Microfit one side crimped wires', 'RM', 'Number', 6.0, true, NOW(), NOW())
ON CONFLICT (item_code) DO NOTHING;

INSERT INTO items (item_code, item_name, category, uom, unit_price, is_active, created_at, updated_at)
VALUES ('25CM-VIOLET-MICROFIT', '25cm Violet Microfit one side crimped wires', 'RM', 'Number', 6.0, true, NOW(), NOW())
ON CONFLICT (item_code) DO NOTHING;

INSERT INTO items (item_code, item_name, category, uom, unit_price, is_active, created_at, updated_at)
VALUES ('25CM-YELLOW-MICROFIT', '25cm Yellow Microfit one side crimped wires', 'RM', 'Number', 6.0, true, NOW(), NOW())
ON CONFLICT (item_code) DO NOTHING;

INSERT INTO items (item_code, item_name, category, uom, unit_price, is_active, created_at, updated_at)
VALUES ('25CM-SKY-BLUE', '25cm Sky  Blue Microfit one side crimped wires', 'RM', 'Number', 6.0, true, NOW(), NOW())
ON CONFLICT (item_code) DO NOTHING;

INSERT INTO items (item_code, item_name, category, uom, unit_price, is_active, created_at, updated_at)
VALUES ('25CM-PINK-MICROFIT', '25cm Pink Microfit one side crimped wires', 'RM', 'Number', 6.0, true, NOW(), NOW())
ON CONFLICT (item_code) DO NOTHING;

INSERT INTO items (item_code, item_name, category, uom, unit_price, is_active, created_at, updated_at)
VALUES ('25CM-DARK-PINK', '25cm Dark Pink Microfit one side crimped wires', 'RM', 'PCS', 0, true, NOW(), NOW())
ON CONFLICT (item_code) DO NOTHING;

INSERT INTO items (item_code, item_name, category, uom, unit_price, is_active, created_at, updated_at)
VALUES ('25CM-LBROWN-MICROFIT', '25cm L.Brown Microfit one side crimped wires', 'RM', 'Number', 6.0, true, NOW(), NOW())
ON CONFLICT (item_code) DO NOTHING;

INSERT INTO items (item_code, item_name, category, uom, unit_price, is_active, created_at, updated_at)
VALUES ('25CM-DBROWN-MICROFIT', '25cm D.Brown Microfit one side crimped wires', 'RM', 'Number', 6.0, true, NOW(), NOW())
ON CONFLICT (item_code) DO NOTHING;

INSERT INTO items (item_code, item_name, category, uom, unit_price, is_active, created_at, updated_at)
VALUES ('25CM-WHITE-MICROFIT', '25cm White Microfit one side crimped wires', 'RM', 'Number', 6.0, true, NOW(), NOW())
ON CONFLICT (item_code) DO NOTHING;

INSERT INTO items (item_code, item_name, category, uom, unit_price, is_active, created_at, updated_at)
VALUES ('25CM-WHITERED-MICROFIT', '25cm White-Red Microfit one side crimped wires (Not Using)', 'RM', 'Number', 6.0, true, NOW(), NOW())
ON CONFLICT (item_code) DO NOTHING;

INSERT INTO items (item_code, item_name, category, uom, unit_price, is_active, created_at, updated_at)
VALUES ('25CM-WHITEBLACK-MICROFIT', '25cm White-Black Microfit one side crimped wires', 'RM', 'PCS', 0, true, NOW(), NOW())
ON CONFLICT (item_code) DO NOTHING;

INSERT INTO items (item_code, item_name, category, uom, unit_price, is_active, created_at, updated_at)
VALUES ('25CM-RED-MICROFIT', '25cm Red Microfit one side crimped wires', 'RM', 'Number', 6.0, true, NOW(), NOW())
ON CONFLICT (item_code) DO NOTHING;

INSERT INTO items (item_code, item_name, category, uom, unit_price, is_active, created_at, updated_at)
VALUES ('25CM-DARK-BLUE', '25cm Dark Blue Microfit one side crimped wires', 'RM', 'Number', 6.0, true, NOW(), NOW())
ON CONFLICT (item_code) DO NOTHING;

INSERT INTO items (item_code, item_name, category, uom, unit_price, is_active, created_at, updated_at)
VALUES ('25CM-ORANGE-MICROFIT', '25cm Orange Microfit one side crimped wires', 'RM', 'Number', 6.0, true, NOW(), NOW())
ON CONFLICT (item_code) DO NOTHING;

INSERT INTO items (item_code, item_name, category, uom, unit_price, is_active, created_at, updated_at)
VALUES ('MICROFIT-BALANCING-CABLES', 'Microfit Balancing Cables', 'RM', 'PCS', 0, true, NOW(), NOW())
ON CONFLICT (item_code) DO NOTHING;

INSERT INTO items (item_code, item_name, category, uom, unit_price, is_active, created_at, updated_at)
VALUES ('18PIN-MICROFIT-HOUSING', '18pin Microfit housing', 'RM', 'Number', 10.0, true, NOW(), NOW())
ON CONFLICT (item_code) DO NOTHING;

INSERT INTO items (item_code, item_name, category, uom, unit_price, is_active, created_at, updated_at)
VALUES ('TACTILE-SWITCH-FOR', 'Tactile switch for reset two leg', 'RM', 'Number', 36.0, true, NOW(), NOW())
ON CONFLICT (item_code) DO NOTHING;

INSERT INTO items (item_code, item_name, category, uom, unit_price, is_active, created_at, updated_at)
VALUES ('915MHZ-ANTENNA', '915MHz Antenna', 'RM', 'Number', 165.0, true, NOW(), NOW())
ON CONFLICT (item_code) DO NOTHING;

INSERT INTO items (item_code, item_name, category, uom, unit_price, is_active, created_at, updated_at)
VALUES ('IPEX4-TO-SMA', 'Ipex4 to SMA converter extension (1675015) (Antenna pigtail connectror)', 'RM', 'Number', 84.0, true, NOW(), NOW())
ON CONFLICT (item_code) DO NOTHING;

INSERT INTO items (item_code, item_name, category, uom, unit_price, is_active, created_at, updated_at)
VALUES ('IPEX4-TO-SMA', 'Ipex4 to SMA converter extension (for R9MM ipex4)', 'RM', 'Number', 45.0, true, NOW(), NOW())
ON CONFLICT (item_code) DO NOTHING;

INSERT INTO items (item_code, item_name, category, uom, unit_price, is_active, created_at, updated_at)
VALUES ('R9M-ANTENNA-EXTENSION', 'R9M Antenna Extension wire RP-SMA to Open', 'RM', 'Number', 45.0, true, NOW(), NOW())
ON CONFLICT (item_code) DO NOTHING;

INSERT INTO items (item_code, item_name, category, uom, unit_price, is_active, created_at, updated_at)
VALUES ('RPSMA-FEMALE-INLINE', 'RP-SMA Female inline connector for RG174', 'RM', 'Number', 0, true, NOW(), NOW())
ON CONFLICT (item_code) DO NOTHING;

INSERT INTO items (item_code, item_name, category, uom, unit_price, is_active, created_at, updated_at)
VALUES ('RPSMA-MALE-INLINE', 'RP-SMA Male inline connector for RG174', 'RM', 'Number', 0, true, NOW(), NOW())
ON CONFLICT (item_code) DO NOTHING;

INSERT INTO items (item_code, item_name, category, uom, unit_price, is_active, created_at, updated_at)
VALUES ('RPSMA-FEMALE-INLINE', 'RP-SMA Female inline connector for RG142', 'RM', 'Number', 0, true, NOW(), NOW())
ON CONFLICT (item_code) DO NOTHING;

INSERT INTO items (item_code, item_name, category, uom, unit_price, is_active, created_at, updated_at)
VALUES ('RPSMA-MALE-INLINE', 'RP-SMA Male inline connector for RG142', 'RM', 'Number', 0, true, NOW(), NOW())
ON CONFLICT (item_code) DO NOTHING;

INSERT INTO items (item_code, item_name, category, uom, unit_price, is_active, created_at, updated_at)
VALUES ('SMA-FEMALE-INLINE', 'SMA Female inline connector for RG174', 'RM', 'Number', 0, true, NOW(), NOW())
ON CONFLICT (item_code) DO NOTHING;

INSERT INTO items (item_code, item_name, category, uom, unit_price, is_active, created_at, updated_at)
VALUES ('SMA-MALE-INLINE', 'SMA Male inline connector for RG174', 'RM', 'Number', 0, true, NOW(), NOW())
ON CONFLICT (item_code) DO NOTHING;

INSERT INTO items (item_code, item_name, category, uom, unit_price, is_active, created_at, updated_at)
VALUES ('SMA-FEMALE-INLINE', 'SMA Female inline connector for RG142', 'RM', 'Number', 0, true, NOW(), NOW())
ON CONFLICT (item_code) DO NOTHING;

INSERT INTO items (item_code, item_name, category, uom, unit_price, is_active, created_at, updated_at)
VALUES ('SMA-MALE-CONNECTOR', 'SMA Male connector inline for RG142', 'RM', 'Number', 0, true, NOW(), NOW())
ON CONFLICT (item_code) DO NOTHING;

INSERT INTO items (item_code, item_name, category, uom, unit_price, is_active, created_at, updated_at)
VALUES ('RG174-COAXIAL-CABLE', 'RG174 Coaxial cable', 'RM', 'Meter', 0, true, NOW(), NOW())
ON CONFLICT (item_code) DO NOTHING;

INSERT INTO items (item_code, item_name, category, uom, unit_price, is_active, created_at, updated_at)
VALUES ('RG142-COAXIAL-CABLE', 'RG142 Coaxial cable', 'RM', 'Meter', 0, true, NOW(), NOW())
ON CONFLICT (item_code) DO NOTHING;

INSERT INTO items (item_code, item_name, category, uom, unit_price, is_active, created_at, updated_at)
VALUES ('20-AWG-SILICONE', '20 AWG Silicone Red - Wire', 'RM', 'Meter', 0, true, NOW(), NOW())
ON CONFLICT (item_code) DO NOTHING;

INSERT INTO items (item_code, item_name, category, uom, unit_price, is_active, created_at, updated_at)
VALUES ('25CORE-WIRE-1438', '25Core Wire 14/38', 'RM', 'Meter', 0, true, NOW(), NOW())
ON CONFLICT (item_code) DO NOTHING;

INSERT INTO items (item_code, item_name, category, uom, unit_price, is_active, created_at, updated_at)
VALUES ('20CORE-WIRE-1438', '20Core Wire 14/38', 'RM', 'Meter', 185.0, true, NOW(), NOW())
ON CONFLICT (item_code) DO NOTHING;

INSERT INTO items (item_code, item_name, category, uom, unit_price, is_active, created_at, updated_at)
VALUES ('10CORE-WIRE-1438', '10Core Wire 14/38', 'RM', 'PCS', 0, true, NOW(), NOW())
ON CONFLICT (item_code) DO NOTHING;

INSERT INTO items (item_code, item_name, category, uom, unit_price, is_active, created_at, updated_at)
VALUES ('8CORE-WIRE-1438', '8core Wire 14/38', 'RM', 'Meter', 42.0, true, NOW(), NOW())
ON CONFLICT (item_code) DO NOTHING;

INSERT INTO items (item_code, item_name, category, uom, unit_price, is_active, created_at, updated_at)
VALUES ('1438-16-CORE', '14/38 16 Core Wire', 'RM', 'Meter', 180.0, true, NOW(), NOW())
ON CONFLICT (item_code) DO NOTHING;

INSERT INTO items (item_code, item_name, category, uom, unit_price, is_active, created_at, updated_at)
VALUES ('RED-1438-WIRE', 'Red 14/38 wire', 'RM', 'Meter', 4.0, true, NOW(), NOW())
ON CONFLICT (item_code) DO NOTHING;

INSERT INTO items (item_code, item_name, category, uom, unit_price, is_active, created_at, updated_at)
VALUES ('BLACK-1438-WIRE', 'Black 14/38 Wire', 'RM', 'Meter', 4.0, true, NOW(), NOW())
ON CONFLICT (item_code) DO NOTHING;

INSERT INTO items (item_code, item_name, category, uom, unit_price, is_active, created_at, updated_at)
VALUES ('YELLOW-1438-WIRE', 'Yellow 14/38 Wire', 'RM', 'Meter', 4.0, true, NOW(), NOW())
ON CONFLICT (item_code) DO NOTHING;

INSERT INTO items (item_code, item_name, category, uom, unit_price, is_active, created_at, updated_at)
VALUES ('WHITE-1438-WIRE', 'White 14/38 Wire', 'RM', 'Meter', 4.0, true, NOW(), NOW())
ON CONFLICT (item_code) DO NOTHING;

INSERT INTO items (item_code, item_name, category, uom, unit_price, is_active, created_at, updated_at)
VALUES ('SKY-BLUE-1438', 'Sky Blue 14/38 Wire', 'RM', 'Meter', 4.0, true, NOW(), NOW())
ON CONFLICT (item_code) DO NOTHING;

INSERT INTO items (item_code, item_name, category, uom, unit_price, is_active, created_at, updated_at)
VALUES ('ORANGE-1438-WIRE', 'Orange 14/38 Wire', 'RM', 'Meter', 4.0, true, NOW(), NOW())
ON CONFLICT (item_code) DO NOTHING;

INSERT INTO items (item_code, item_name, category, uom, unit_price, is_active, created_at, updated_at)
VALUES ('GREEN-1438-WIRE', 'Green 14/38 Wire', 'RM', 'Meter', 4.0, true, NOW(), NOW())
ON CONFLICT (item_code) DO NOTHING;

INSERT INTO items (item_code, item_name, category, uom, unit_price, is_active, created_at, updated_at)
VALUES ('PURPLE-1438-WIRE', 'Purple 14/38 Wire', 'RM', 'Meter', 4.0, true, NOW(), NOW())
ON CONFLICT (item_code) DO NOTHING;

INSERT INTO items (item_code, item_name, category, uom, unit_price, is_active, created_at, updated_at)
VALUES ('BROWN-1438-WIRE', 'Brown 14/38 Wire', 'RM', 'Meter', 4.0, true, NOW(), NOW())
ON CONFLICT (item_code) DO NOTHING;

INSERT INTO items (item_code, item_name, category, uom, unit_price, is_active, created_at, updated_at)
VALUES ('AFT-PLATE-ACRYLICE', 'Aft plate Acrylice for Template', 'RM', 'Number', 25.0, true, NOW(), NOW())
ON CONFLICT (item_code) DO NOTHING;

INSERT INTO items (item_code, item_name, category, uom, unit_price, is_active, created_at, updated_at)
VALUES ('12S-LIPO-CHARGER', '12S Lipo Charger', 'RM', 'Number', 45000.0, true, NOW(), NOW())
ON CONFLICT (item_code) DO NOTHING;

INSERT INTO items (item_code, item_name, category, uom, unit_price, is_active, created_at, updated_at)
VALUES ('8S-LIPO-CHARGER', '8S Lipo Charger ISDT Q8', 'RM', 'Number', 7220.0, true, NOW(), NOW())
ON CONFLICT (item_code) DO NOTHING;

INSERT INTO items (item_code, item_name, category, uom, unit_price, is_active, created_at, updated_at)
VALUES ('4S-LIPO-CHARGER', '4S Lipo Charger ISDT PD60', 'RM', 'Number', 1245.0, true, NOW(), NOW())
ON CONFLICT (item_code) DO NOTHING;

INSERT INTO items (item_code, item_name, category, uom, unit_price, is_active, created_at, updated_at)
VALUES ('8KG-HULL', '8kg Hull', 'RM', 'Number', 8500.0, true, NOW(), NOW())
ON CONFLICT (item_code) DO NOTHING;

INSERT INTO items (item_code, item_name, category, uom, unit_price, is_active, created_at, updated_at)
VALUES ('JCB-BODY-CUM', 'JCB Body cum mounting frame', 'RM', 'Number', 2000.0, true, NOW(), NOW())
ON CONFLICT (item_code) DO NOTHING;

INSERT INTO items (item_code, item_name, category, uom, unit_price, is_active, created_at, updated_at)
VALUES ('SR-STRUCTURE', 'SR Structure', 'RM', 'Number', 1000.0, true, NOW(), NOW())
ON CONFLICT (item_code) DO NOTHING;

INSERT INTO items (item_code, item_name, category, uom, unit_price, is_active, created_at, updated_at)
VALUES ('SR-PILLOW', 'SR Pillow', 'RM', 'Number', 1000.0, true, NOW(), NOW())
ON CONFLICT (item_code) DO NOTHING;

INSERT INTO items (item_code, item_name, category, uom, unit_price, is_active, created_at, updated_at)
VALUES ('COUPLING-HOOD', 'Coupling Hood', 'RM', 'Number', 10.0, true, NOW(), NOW())
ON CONFLICT (item_code) DO NOTHING;

INSERT INTO items (item_code, item_name, category, uom, unit_price, is_active, created_at, updated_at)
VALUES ('2MM-FRP-60X70MM', '2mm FRP 60x70mm with 18 mm hole', 'RM', 'Number', 5.0, true, NOW(), NOW())
ON CONFLICT (item_code) DO NOTHING;

INSERT INTO items (item_code, item_name, category, uom, unit_price, is_active, created_at, updated_at)
VALUES ('FLOW-SENSOR-CLAMP', 'flow sensor Clamp', 'RM', 'Number', 10.0, true, NOW(), NOW())
ON CONFLICT (item_code) DO NOTHING;

INSERT INTO items (item_code, item_name, category, uom, unit_price, is_active, created_at, updated_at)
VALUES ('ESC-TEMPERATURE-SENSOR', 'ESC Temperature Sensor Clamp', 'RM', 'Number', 10.0, true, NOW(), NOW())
ON CONFLICT (item_code) DO NOTHING;

INSERT INTO items (item_code, item_name, category, uom, unit_price, is_active, created_at, updated_at)
VALUES ('BATTERY-CLAMP', 'Battery Clamp', 'RM', 'Number', 10.0, true, NOW(), NOW())
ON CONFLICT (item_code) DO NOTHING;

INSERT INTO items (item_code, item_name, category, uom, unit_price, is_active, created_at, updated_at)
VALUES ('ELECTRONIC-BOX-TOP', 'Electronic Box Top Lid', 'RM', 'Number', 30.0, true, NOW(), NOW())
ON CONFLICT (item_code) DO NOTHING;

INSERT INTO items (item_code, item_name, category, uom, unit_price, is_active, created_at, updated_at)
VALUES ('BATTERY-HOLDING-FOAM', 'Battery holding foam block Side (115×80×35)', 'RM', 'Number', 5.0, true, NOW(), NOW())
ON CONFLICT (item_code) DO NOTHING;

INSERT INTO items (item_code, item_name, category, uom, unit_price, is_active, created_at, updated_at)
VALUES ('BATTERY-HOLDING-FOAM', 'Battery holding foam block Upside (80×80×35)', 'RM', 'Number', 5.0, true, NOW(), NOW())
ON CONFLICT (item_code) DO NOTHING;

INSERT INTO items (item_code, item_name, category, uom, unit_price, is_active, created_at, updated_at)
VALUES ('BATTERY-CLAMPING-UP', 'Battery Clamping UP EPE on jet plate (150×80×20)', 'RM', 'Number', 5.0, true, NOW(), NOW())
ON CONFLICT (item_code) DO NOTHING;

INSERT INTO items (item_code, item_name, category, uom, unit_price, is_active, created_at, updated_at)
VALUES ('BATTERY-CLAMPING-BF', 'Battery Clamping B&F EPE on jet plate (80×80×10)', 'RM', 'Number', 5.0, true, NOW(), NOW())
ON CONFLICT (item_code) DO NOTHING;

INSERT INTO items (item_code, item_name, category, uom, unit_price, is_active, created_at, updated_at)
VALUES ('UNDER-ELECBOX-EPE', 'Under ElecBox EPE (150x230x25)', 'RM', 'Number', 10.0, true, NOW(), NOW())
ON CONFLICT (item_code) DO NOTHING;

INSERT INTO items (item_code, item_name, category, uom, unit_price, is_active, created_at, updated_at)
VALUES ('ABOVE-ELECBOX-EPE', 'Above ElecBox EPE (150x80x30)', 'RM', 'Number', 10.0, true, NOW(), NOW())
ON CONFLICT (item_code) DO NOTHING;

INSERT INTO items (item_code, item_name, category, uom, unit_price, is_active, created_at, updated_at)
VALUES ('ZIP-TIES-100X3', 'Zip ties 100x3 MultiCompro', 'RM', 'Number', 1.0, true, NOW(), NOW())
ON CONFLICT (item_code) DO NOTHING;

INSERT INTO items (item_code, item_name, category, uom, unit_price, is_active, created_at, updated_at)
VALUES ('ZIP-TIES-250M', 'Zip ties 250m Regular', 'RM', 'Number', 0, true, NOW(), NOW())
ON CONFLICT (item_code) DO NOTHING;

INSERT INTO items (item_code, item_name, category, uom, unit_price, is_active, created_at, updated_at)
VALUES ('FERRITE-CORE', 'Ferrite Core', 'RM', 'Number', 7.0, true, NOW(), NOW())
ON CONFLICT (item_code) DO NOTHING;

INSERT INTO items (item_code, item_name, category, uom, unit_price, is_active, created_at, updated_at)
VALUES ('SY2115-PIN-PANEL', 'SY21-15 pin panel mount(Male)', 'RM', 'Number', 350.0, true, NOW(), NOW())
ON CONFLICT (item_code) DO NOTHING;

INSERT INTO items (item_code, item_name, category, uom, unit_price, is_active, created_at, updated_at)
VALUES ('SY2115-PIN-CABLE', 'SY21-15 pin Cable Mount(Female)', 'RM', 'Number', 350.0, true, NOW(), NOW())
ON CONFLICT (item_code) DO NOTHING;

INSERT INTO items (item_code, item_name, category, uom, unit_price, is_active, created_at, updated_at)
VALUES ('SY2115-PIN-PANEL', 'SY21-15 pin panel mount(Female)', 'RM', 'Number', 350.0, true, NOW(), NOW())
ON CONFLICT (item_code) DO NOTHING;

INSERT INTO items (item_code, item_name, category, uom, unit_price, is_active, created_at, updated_at)
VALUES ('SY2115-PIN-CABLE', 'SY21-15 pin Cable Mount(Male)', 'RM', 'Number', 350.0, true, NOW(), NOW())
ON CONFLICT (item_code) DO NOTHING;

INSERT INTO items (item_code, item_name, category, uom, unit_price, is_active, created_at, updated_at)
VALUES ('WY28-METAL-CONNECTOR', 'WY-28 Metal connector CM', 'RM', 'Number', 650.0, true, NOW(), NOW())
ON CONFLICT (item_code) DO NOTHING;

INSERT INTO items (item_code, item_name, category, uom, unit_price, is_active, created_at, updated_at)
VALUES ('WY28-METAL-CONNECTOR', 'WY-28 Metal connector PM', 'RM', 'Number', 500.0, true, NOW(), NOW())
ON CONFLICT (item_code) DO NOTHING;

INSERT INTO items (item_code, item_name, category, uom, unit_price, is_active, created_at, updated_at)
VALUES ('WK15-IP68-CABLE', 'WK-15 IP68 Cable Metal Connector', 'RM', 'Number', 0, true, NOW(), NOW())
ON CONFLICT (item_code) DO NOTHING;

INSERT INTO items (item_code, item_name, category, uom, unit_price, is_active, created_at, updated_at)
VALUES ('WK15-IP68-CABLE', 'WK-15 IP68 Cable Metal Connector', 'RM', 'PCS', 0, true, NOW(), NOW())
ON CONFLICT (item_code) DO NOTHING;

INSERT INTO items (item_code, item_name, category, uom, unit_price, is_active, created_at, updated_at)
VALUES ('15-PIN-IP68', '15 pin IP68 connectors (Female)', 'RM', 'PCS', 0, true, NOW(), NOW())
ON CONFLICT (item_code) DO NOTHING;

INSERT INTO items (item_code, item_name, category, uom, unit_price, is_active, created_at, updated_at)
VALUES ('15-PIN-IP68', '15 pin IP68 Connectors (Male)', 'RM', 'PCS', 0, true, NOW(), NOW())
ON CONFLICT (item_code) DO NOTHING;

INSERT INTO items (item_code, item_name, category, uom, unit_price, is_active, created_at, updated_at)
VALUES ('SA12-9PIN-CM', 'SA12 9pin CM Pushpull Male', 'RM', 'Number', 500.0, true, NOW(), NOW())
ON CONFLICT (item_code) DO NOTHING;

INSERT INTO items (item_code, item_name, category, uom, unit_price, is_active, created_at, updated_at)
VALUES ('SA12-9PIN-PM', 'SA12 9pin PM Pushpull female', 'RM', 'Number', 350.0, true, NOW(), NOW())
ON CONFLICT (item_code) DO NOTHING;

INSERT INTO items (item_code, item_name, category, uom, unit_price, is_active, created_at, updated_at)
VALUES ('SA12-9PIN-COUNTER', 'SA12 9pin Counter', 'RM', 'Number', 0, true, NOW(), NOW())
ON CONFLICT (item_code) DO NOTHING;

INSERT INTO items (item_code, item_name, category, uom, unit_price, is_active, created_at, updated_at)
VALUES ('LP12-3-PIN', 'LP12 3 pin plug male clip lock CM', 'RM', 'Number', 169.0, true, NOW(), NOW())
ON CONFLICT (item_code) DO NOTHING;

INSERT INTO items (item_code, item_name, category, uom, unit_price, is_active, created_at, updated_at)
VALUES ('LP12-3-PIN', 'LP12 3 pin socket female clip lock PM', 'RM', 'Number', 121.0, true, NOW(), NOW())
ON CONFLICT (item_code) DO NOTHING;

INSERT INTO items (item_code, item_name, category, uom, unit_price, is_active, created_at, updated_at)
VALUES ('LP12-4-PIN', 'LP12 4 pin plug male clip lock CM', 'RM', 'Number', 141.0, true, NOW(), NOW())
ON CONFLICT (item_code) DO NOTHING;

INSERT INTO items (item_code, item_name, category, uom, unit_price, is_active, created_at, updated_at)
VALUES ('LP12-4-PIN', 'LP12 4 pin socket female clip lock PM', 'RM', 'Number', 350.0, true, NOW(), NOW())
ON CONFLICT (item_code) DO NOTHING;

INSERT INTO items (item_code, item_name, category, uom, unit_price, is_active, created_at, updated_at)
VALUES ('LP12-8-PIN', 'LP12 8 pin plug male clip lock CM', 'RM', 'Number', 0, true, NOW(), NOW())
ON CONFLICT (item_code) DO NOTHING;

INSERT INTO items (item_code, item_name, category, uom, unit_price, is_active, created_at, updated_at)
VALUES ('LP12-8-PIN', 'LP12 8 pin socket female clip lock PM', 'RM', 'Number', 0, true, NOW(), NOW())
ON CONFLICT (item_code) DO NOTHING;

INSERT INTO items (item_code, item_name, category, uom, unit_price, is_active, created_at, updated_at)
VALUES ('LP24-24-PIN', 'LP24 24 pin plug male clip lock CM (Not Using)', 'RM', 'Number', 0, true, NOW(), NOW())
ON CONFLICT (item_code) DO NOTHING;

INSERT INTO items (item_code, item_name, category, uom, unit_price, is_active, created_at, updated_at)
VALUES ('LP24-24-PIN', 'LP24 24 pin socket female clip lock PM (Not Using)', 'RM', 'Number', 0, true, NOW(), NOW())
ON CONFLICT (item_code) DO NOTHING;

INSERT INTO items (item_code, item_name, category, uom, unit_price, is_active, created_at, updated_at)
VALUES ('LP24-24-PIN', 'LP24 24 pin plug female clip lock CM', 'RM', 'Number', 556.0, true, NOW(), NOW())
ON CONFLICT (item_code) DO NOTHING;

INSERT INTO items (item_code, item_name, category, uom, unit_price, is_active, created_at, updated_at)
VALUES ('LP24-24-PIN', 'LP24 24 pin socket male clip lock PM', 'RM', 'Number', 425.0, true, NOW(), NOW())
ON CONFLICT (item_code) DO NOTHING;

INSERT INTO items (item_code, item_name, category, uom, unit_price, is_active, created_at, updated_at)
VALUES ('WATER-TANK-FOR', 'Water tank for JCB', 'RM', 'Number', 200.0, true, NOW(), NOW())
ON CONFLICT (item_code) DO NOTHING;

INSERT INTO items (item_code, item_name, category, uom, unit_price, is_active, created_at, updated_at)
VALUES ('BLUEROBOTICS-LEAK-PROBE', 'BlueRobotics Leak probe', 'RM', 'Number', 200.0, true, NOW(), NOW())
ON CONFLICT (item_code) DO NOTHING;

INSERT INTO items (item_code, item_name, category, uom, unit_price, is_active, created_at, updated_at)
VALUES ('BLUEROBOTICS-INDICATOR', 'BlueRobotics Indicator', 'RM', 'Number', 1000.0, true, NOW(), NOW())
ON CONFLICT (item_code) DO NOTHING;

INSERT INTO items (item_code, item_name, category, uom, unit_price, is_active, created_at, updated_at)
VALUES ('IP68-ROTARY-MAIN', 'IP68 Rotary main Switch', 'RM', 'Number', 1000.0, true, NOW(), NOW())
ON CONFLICT (item_code) DO NOTHING;

INSERT INTO items (item_code, item_name, category, uom, unit_price, is_active, created_at, updated_at)
VALUES ('RED-2835-SMD', 'Red 2835 SMD LED 1W', 'RM', 'Number', 7.0, true, NOW(), NOW())
ON CONFLICT (item_code) DO NOTHING;

INSERT INTO items (item_code, item_name, category, uom, unit_price, is_active, created_at, updated_at)
VALUES ('GREEN-2835-SMD', 'Green 2835 SMD LED 1W', 'RM', 'Number', 7.0, true, NOW(), NOW())
ON CONFLICT (item_code) DO NOTHING;

INSERT INTO items (item_code, item_name, category, uom, unit_price, is_active, created_at, updated_at)
VALUES ('NO-4-SELF', 'No. 4 Self tap Screw SS304 (M4x6.5 Philips)', 'RM', 'Number', 0, true, NOW(), NOW())
ON CONFLICT (item_code) DO NOTHING;

INSERT INTO items (item_code, item_name, category, uom, unit_price, is_active, created_at, updated_at)
VALUES ('M2X12-ALLEN-HEAD', 'M2x12 Allen Head SS304', 'RM', 'Number', 0, true, NOW(), NOW())
ON CONFLICT (item_code) DO NOTHING;

INSERT INTO items (item_code, item_name, category, uom, unit_price, is_active, created_at, updated_at)
VALUES ('M3X6-CSK-PHILLIPS', 'M3x6 CSK Phillips', 'RM', 'Number', 0, true, NOW(), NOW())
ON CONFLICT (item_code) DO NOTHING;

INSERT INTO items (item_code, item_name, category, uom, unit_price, is_active, created_at, updated_at)
VALUES ('M3X8-CSK-PHILLIPS', 'M3x8 CSK Phillips', 'RM', 'Number', 0, true, NOW(), NOW())
ON CONFLICT (item_code) DO NOTHING;

INSERT INTO items (item_code, item_name, category, uom, unit_price, is_active, created_at, updated_at)
VALUES ('M3X30-CSK-PHILLIPS', 'M3x30 CSK Phillips', 'RM', 'Number', 0, true, NOW(), NOW())
ON CONFLICT (item_code) DO NOTHING;

INSERT INTO items (item_code, item_name, category, uom, unit_price, is_active, created_at, updated_at)
VALUES ('M3X8-BUTTON-HEAD', 'M3x8 Button head', 'RM', 'Number', 0, true, NOW(), NOW())
ON CONFLICT (item_code) DO NOTHING;

INSERT INTO items (item_code, item_name, category, uom, unit_price, is_active, created_at, updated_at)
VALUES ('M3X10-PLAIN-WASHER', 'M3x10 plain washer', 'RM', 'Number', 0, true, NOW(), NOW())
ON CONFLICT (item_code) DO NOTHING;

INSERT INTO items (item_code, item_name, category, uom, unit_price, is_active, created_at, updated_at)
VALUES ('M4X8-CSK-PHILLIPS', 'M4x8 CSK Phillips', 'RM', 'Number', 0, true, NOW(), NOW())
ON CONFLICT (item_code) DO NOTHING;

INSERT INTO items (item_code, item_name, category, uom, unit_price, is_active, created_at, updated_at)
VALUES ('M4X8-CSK-PHILLIPS', 'M4x8 CSK Phillips GI', 'RM', 'Number', 0, true, NOW(), NOW())
ON CONFLICT (item_code) DO NOTHING;

INSERT INTO items (item_code, item_name, category, uom, unit_price, is_active, created_at, updated_at)
VALUES ('M2X15-ALLEN-HEAD', 'M2x15 Allen Head SS304', 'RM', 'PCS', 0, true, NOW(), NOW())
ON CONFLICT (item_code) DO NOTHING;

INSERT INTO items (item_code, item_name, category, uom, unit_price, is_active, created_at, updated_at)
VALUES ('M4X10-CSK-PHILLIPS', 'M4x10 CSK Phillips', 'RM', 'Number', 0, true, NOW(), NOW())
ON CONFLICT (item_code) DO NOTHING;

INSERT INTO items (item_code, item_name, category, uom, unit_price, is_active, created_at, updated_at)
VALUES ('M4X20-CSK-PHILLIPS', 'M4x20 CSK Phillips', 'RM', 'Number', 0, true, NOW(), NOW())
ON CONFLICT (item_code) DO NOTHING;

INSERT INTO items (item_code, item_name, category, uom, unit_price, is_active, created_at, updated_at)
VALUES ('M4X20-PLAIN-WASHER', 'M4x20 Plain Washer', 'RM', 'PCS', 0, true, NOW(), NOW())
ON CONFLICT (item_code) DO NOTHING;

INSERT INTO items (item_code, item_name, category, uom, unit_price, is_active, created_at, updated_at)
VALUES ('M4X12-ALLEN-HEAD', 'M4x12 Allen Head', 'RM', 'Number', 0, true, NOW(), NOW())
ON CONFLICT (item_code) DO NOTHING;

INSERT INTO items (item_code, item_name, category, uom, unit_price, is_active, created_at, updated_at)
VALUES ('M4X16-ALLEN-HEAD', 'M4x16 Allen Head', 'RM', 'Number', 0, true, NOW(), NOW())
ON CONFLICT (item_code) DO NOTHING;

INSERT INTO items (item_code, item_name, category, uom, unit_price, is_active, created_at, updated_at)
VALUES ('M4X10-ALLEN-HEAD', 'M4x10 Allen head', 'RM', 'PCS', 0, true, NOW(), NOW())
ON CONFLICT (item_code) DO NOTHING;

INSERT INTO items (item_code, item_name, category, uom, unit_price, is_active, created_at, updated_at)
VALUES ('M4X30-ALLEN-HEAD', 'M4x30 Allen head', 'RM', 'PCS', 0, true, NOW(), NOW())
ON CONFLICT (item_code) DO NOTHING;

INSERT INTO items (item_code, item_name, category, uom, unit_price, is_active, created_at, updated_at)
VALUES ('M4X40-ALLEN-HEAD', 'M4X40 Allen head', 'RM', 'PCS', 0, true, NOW(), NOW())
ON CONFLICT (item_code) DO NOTHING;

INSERT INTO items (item_code, item_name, category, uom, unit_price, is_active, created_at, updated_at)
VALUES ('M5X15-PLAIN-WASHER', 'M5x15 plain washer', 'RM', 'Number', 0, true, NOW(), NOW())
ON CONFLICT (item_code) DO NOTHING;

INSERT INTO items (item_code, item_name, category, uom, unit_price, is_active, created_at, updated_at)
VALUES ('M4X20-ALLEN-HEAD', 'M4x20 Allen Head', 'RM', 'Number', 0, true, NOW(), NOW())
ON CONFLICT (item_code) DO NOTHING;

INSERT INTO items (item_code, item_name, category, uom, unit_price, is_active, created_at, updated_at)
VALUES ('M4X12-BUTTON-HEAD', 'M4x12 Button Head', 'RM', 'Number', 0, true, NOW(), NOW())
ON CONFLICT (item_code) DO NOTHING;

INSERT INTO items (item_code, item_name, category, uom, unit_price, is_active, created_at, updated_at)
VALUES ('M4X12-PAN-COMBI', 'M4x12 Pan Combi', 'RM', 'Number', 0, true, NOW(), NOW())
ON CONFLICT (item_code) DO NOTHING;

INSERT INTO items (item_code, item_name, category, uom, unit_price, is_active, created_at, updated_at)
VALUES ('M4X12-PLAIN-WASHER', 'M4x12 plain washer', 'RM', 'Number', 0, true, NOW(), NOW())
ON CONFLICT (item_code) DO NOTHING;

INSERT INTO items (item_code, item_name, category, uom, unit_price, is_active, created_at, updated_at)
VALUES ('M4-SPRING-WASHER', 'M4 Spring Washer', 'RM', 'Number', 0, true, NOW(), NOW())
ON CONFLICT (item_code) DO NOTHING;

INSERT INTO items (item_code, item_name, category, uom, unit_price, is_active, created_at, updated_at)
VALUES ('M4-NYLOCK', 'M4 Nylock', 'RM', 'Number', 0, true, NOW(), NOW())
ON CONFLICT (item_code) DO NOTHING;

INSERT INTO items (item_code, item_name, category, uom, unit_price, is_active, created_at, updated_at)
VALUES ('M4-SQUARE-NUT', 'M4 Square Nut', 'RM', 'Number', 0, true, NOW(), NOW())
ON CONFLICT (item_code) DO NOTHING;

INSERT INTO items (item_code, item_name, category, uom, unit_price, is_active, created_at, updated_at)
VALUES ('M3-SQUARE-NUTS', 'M3 Square Nuts', 'RM', 'PCS', 0, true, NOW(), NOW())
ON CONFLICT (item_code) DO NOTHING;

INSERT INTO items (item_code, item_name, category, uom, unit_price, is_active, created_at, updated_at)
VALUES ('M4X5-GRUB', 'M4x5 Grub', 'RM', 'PCS', 0, true, NOW(), NOW())
ON CONFLICT (item_code) DO NOTHING;

INSERT INTO items (item_code, item_name, category, uom, unit_price, is_active, created_at, updated_at)
VALUES ('M5X10-ALLEN-HEAD', 'M5x10 Allen Head (AMCA)', 'RM', 'Number', 0, true, NOW(), NOW())
ON CONFLICT (item_code) DO NOTHING;

INSERT INTO items (item_code, item_name, category, uom, unit_price, is_active, created_at, updated_at)
VALUES ('M5X10-PAN-TORX', 'M5x10 Pan Torx', 'RM', 'Number', 0, true, NOW(), NOW())
ON CONFLICT (item_code) DO NOTHING;

INSERT INTO items (item_code, item_name, category, uom, unit_price, is_active, created_at, updated_at)
VALUES ('M5X10-GRUB-SCREW', 'M5x10 Grub Screw', 'RM', 'Number', 0, true, NOW(), NOW())
ON CONFLICT (item_code) DO NOTHING;

INSERT INTO items (item_code, item_name, category, uom, unit_price, is_active, created_at, updated_at)
VALUES ('M5X50-CSK-PHILIPS', 'M5x50 CSK Philips', 'RM', 'PCS', 0, true, NOW(), NOW())
ON CONFLICT (item_code) DO NOTHING;

INSERT INTO items (item_code, item_name, category, uom, unit_price, is_active, created_at, updated_at)
VALUES ('M5X50-ALLEN-CAP', 'M5x50 Allen Cap', 'RM', 'PCS', 0, true, NOW(), NOW())
ON CONFLICT (item_code) DO NOTHING;

INSERT INTO items (item_code, item_name, category, uom, unit_price, is_active, created_at, updated_at)
VALUES ('M6X150-ALLEN-HEAD', 'M6x150 Allen Head', 'RM', 'Number', 0, true, NOW(), NOW())
ON CONFLICT (item_code) DO NOTHING;

INSERT INTO items (item_code, item_name, category, uom, unit_price, is_active, created_at, updated_at)
VALUES ('M6-NYLOCK', 'M6 Nylock', 'RM', 'Number', 0, true, NOW(), NOW())
ON CONFLICT (item_code) DO NOTHING;

INSERT INTO items (item_code, item_name, category, uom, unit_price, is_active, created_at, updated_at)
VALUES ('M6X15-PLAIN-WASHER', 'M6x15 plain washer', 'RM', 'Number', 0, true, NOW(), NOW())
ON CONFLICT (item_code) DO NOTHING;

INSERT INTO items (item_code, item_name, category, uom, unit_price, is_active, created_at, updated_at)
VALUES ('PLAIN-WASHER-6X20X1', 'Plain Washer 6x20x1', 'RM', 'PCS', 0, true, NOW(), NOW())
ON CONFLICT (item_code) DO NOTHING;

INSERT INTO items (item_code, item_name, category, uom, unit_price, is_active, created_at, updated_at)
VALUES ('M6X10-GRUB-SCREW', 'M6x10 Grub Screw', 'RM', 'Number', 0, true, NOW(), NOW())
ON CONFLICT (item_code) DO NOTHING;

INSERT INTO items (item_code, item_name, category, uom, unit_price, is_active, created_at, updated_at)
VALUES ('M6-DOM-NUT', 'M6 Dom Nut', 'RM', 'PCS', 0, true, NOW(), NOW())
ON CONFLICT (item_code) DO NOTHING;

INSERT INTO items (item_code, item_name, category, uom, unit_price, is_active, created_at, updated_at)
VALUES ('BUTTON-HEAD-6X12', 'Button Head 6x12', 'RM', 'Number', 0, true, NOW(), NOW())
ON CONFLICT (item_code) DO NOTHING;

INSERT INTO items (item_code, item_name, category, uom, unit_price, is_active, created_at, updated_at)
VALUES ('M6X30-BUTTON-HEAD', 'M6x30 Button Head', 'RM', 'PCS', 0, true, NOW(), NOW())
ON CONFLICT (item_code) DO NOTHING;

INSERT INTO items (item_code, item_name, category, uom, unit_price, is_active, created_at, updated_at)
VALUES ('M6X30-ALLEN-CAP', 'M6x30 Allen Cap', 'RM', 'PCS', 0, true, NOW(), NOW())
ON CONFLICT (item_code) DO NOTHING;

INSERT INTO items (item_code, item_name, category, uom, unit_price, is_active, created_at, updated_at)
VALUES ('HEX-NUT-3MM', 'Hex Nut 3mm', 'RM', 'PCS', 0, true, NOW(), NOW())
ON CONFLICT (item_code) DO NOTHING;

INSERT INTO items (item_code, item_name, category, uom, unit_price, is_active, created_at, updated_at)
VALUES ('HEX-NUT-6MM', 'Hex Nut 6mm', 'RM', 'PCS', 0, true, NOW(), NOW())
ON CONFLICT (item_code) DO NOTHING;

INSERT INTO items (item_code, item_name, category, uom, unit_price, is_active, created_at, updated_at)
VALUES ('M8X20-PLAIN-WASHER', 'M8x20 plain washer', 'RM', 'Number', 0, true, NOW(), NOW())
ON CONFLICT (item_code) DO NOTHING;

INSERT INTO items (item_code, item_name, category, uom, unit_price, is_active, created_at, updated_at)
VALUES ('M8X25-ALLEN-HEAD', 'M8x25 Allen Head', 'RM', 'Number', 0, true, NOW(), NOW())
ON CONFLICT (item_code) DO NOTHING;

INSERT INTO items (item_code, item_name, category, uom, unit_price, is_active, created_at, updated_at)
VALUES ('M5X12-BUTTON-HD', 'M5X12 Button HD Torx', 'RM', 'PCS', 0, true, NOW(), NOW())
ON CONFLICT (item_code) DO NOTHING;

INSERT INTO items (item_code, item_name, category, uom, unit_price, is_active, created_at, updated_at)
VALUES ('CELLO-TAPE', 'Cello Tape', 'RM', 'Number', 0, true, NOW(), NOW())
ON CONFLICT (item_code) DO NOTHING;

INSERT INTO items (item_code, item_name, category, uom, unit_price, is_active, created_at, updated_at)
VALUES ('COPPER-STRIPS-3X2', 'Copper Strips 3x2 cells', 'RM', 'Number', 10.0, true, NOW(), NOW())
ON CONFLICT (item_code) DO NOTHING;

INSERT INTO items (item_code, item_name, category, uom, unit_price, is_active, created_at, updated_at)
VALUES ('KAPTON-TAPE', 'Kapton Tape', 'RM', 'PCS', 0, true, NOW(), NOW())
ON CONFLICT (item_code) DO NOTHING;

INSERT INTO items (item_code, item_name, category, uom, unit_price, is_active, created_at, updated_at)
VALUES ('70MM-PAPER-SEPARATOR', '70mm Paper Separator', 'RM', 'Number', 11.5, true, NOW(), NOW())
ON CONFLICT (item_code) DO NOTHING;

INSERT INTO items (item_code, item_name, category, uom, unit_price, is_active, created_at, updated_at)
VALUES ('BARLEY-PAPER-FOR', 'Barley paper for 21700 cylindrical cell', 'RM', 'Number', 1.0, true, NOW(), NOW())
ON CONFLICT (item_code) DO NOTHING;

INSERT INTO items (item_code, item_name, category, uom, unit_price, is_active, created_at, updated_at)
VALUES ('BATTERY-BARLEY-ROLL', 'Battery Barley roll', 'RM', 'PCS', 0, true, NOW(), NOW())
ON CONFLICT (item_code) DO NOTHING;

INSERT INTO items (item_code, item_name, category, uom, unit_price, is_active, created_at, updated_at)
VALUES ('1S-BMS', '1S BMS', 'RM', 'PCS', 0, true, NOW(), NOW())
ON CONFLICT (item_code) DO NOTHING;

INSERT INTO items (item_code, item_name, category, uom, unit_price, is_active, created_at, updated_at)
VALUES ('2S-BMS', '2S BMS', 'RM', 'Number', 35.0, true, NOW(), NOW())
ON CONFLICT (item_code) DO NOTHING;

INSERT INTO items (item_code, item_name, category, uom, unit_price, is_active, created_at, updated_at)
VALUES ('3S-BMS', '3S BMS', 'RM', 'Number', 50.0, true, NOW(), NOW())
ON CONFLICT (item_code) DO NOTHING;

INSERT INTO items (item_code, item_name, category, uom, unit_price, is_active, created_at, updated_at)
VALUES ('16AWG-LEAD', '16AWG Lead', 'RM', 'Grm', 1.3, true, NOW(), NOW())
ON CONFLICT (item_code) DO NOTHING;

INSERT INTO items (item_code, item_name, category, uom, unit_price, is_active, created_at, updated_at)
VALUES ('130X80X60-ENCLOSURE-BOX', '130x80x60 enclosure box', 'RM', 'Number', 260.0, true, NOW(), NOW())
ON CONFLICT (item_code) DO NOTHING;

INSERT INTO items (item_code, item_name, category, uom, unit_price, is_active, created_at, updated_at)
VALUES ('PG7-CABLE-GLAND', 'PG-7 Cable Gland', 'RM', 'Number', 15.0, true, NOW(), NOW())
ON CONFLICT (item_code) DO NOTHING;

INSERT INTO items (item_code, item_name, category, uom, unit_price, is_active, created_at, updated_at)
VALUES ('PG9-CABLE-GLANDPG', 'PG-9 Cable Gland(PG -11)', 'RM', 'Number', 15.0, true, NOW(), NOW())
ON CONFLICT (item_code) DO NOTHING;

INSERT INTO items (item_code, item_name, category, uom, unit_price, is_active, created_at, updated_at)
VALUES ('SOLID-COUPLING-ALUMINIUM', 'Solid coupling (Aluminium)', 'RM', 'Number', 0, true, NOW(), NOW())
ON CONFLICT (item_code) DO NOTHING;

INSERT INTO items (item_code, item_name, category, uom, unit_price, is_active, created_at, updated_at)
VALUES ('ROTEX14-COUPLING', 'Rotex14 Coupling', 'RM', 'Number', 1500.0, true, NOW(), NOW())
ON CONFLICT (item_code) DO NOTHING;

INSERT INTO items (item_code, item_name, category, uom, unit_price, is_active, created_at, updated_at)
VALUES ('SPIDERS', 'Spiders', 'RM', 'PCS', 0, true, NOW(), NOW())
ON CONFLICT (item_code) DO NOTHING;

INSERT INTO items (item_code, item_name, category, uom, unit_price, is_active, created_at, updated_at)
VALUES ('ELECTRONIC-BOX', 'Electronic Box', 'RM', 'Number', 3000.0, true, NOW(), NOW())
ON CONFLICT (item_code) DO NOTHING;

INSERT INTO items (item_code, item_name, category, uom, unit_price, is_active, created_at, updated_at)
VALUES ('FRONT-LID', 'Front Lid', 'RM', 'Number', 1100.0, true, NOW(), NOW())
ON CONFLICT (item_code) DO NOTHING;

INSERT INTO items (item_code, item_name, category, uom, unit_price, is_active, created_at, updated_at)
VALUES ('BOTTOM-BLOCK-INLET', 'Bottom Block (Inlet Block)', 'RM', 'Number', 1000.0, true, NOW(), NOW())
ON CONFLICT (item_code) DO NOTHING;

INSERT INTO items (item_code, item_name, category, uom, unit_price, is_active, created_at, updated_at)
VALUES ('IP-REMOTE', 'IP Remote', 'RM', 'PCS', 0, true, NOW(), NOW())
ON CONFLICT (item_code) DO NOTHING;

INSERT INTO items (item_code, item_name, category, uom, unit_price, is_active, created_at, updated_at)
VALUES ('IP-REMOTE-UPPER', 'IP Remote Upper Shell', 'RM', 'Number', 1000.0, true, NOW(), NOW())
ON CONFLICT (item_code) DO NOTHING;

INSERT INTO items (item_code, item_name, category, uom, unit_price, is_active, created_at, updated_at)
VALUES ('IP-REMOTE-LOWER', 'IP Remote Lower Shell', 'RM', 'Number', 1000.0, true, NOW(), NOW())
ON CONFLICT (item_code) DO NOTHING;

INSERT INTO items (item_code, item_name, category, uom, unit_price, is_active, created_at, updated_at)
VALUES ('REMOTE-BOX', 'Remote Box', 'RM', 'PCS', 0, true, NOW(), NOW())
ON CONFLICT (item_code) DO NOTHING;

INSERT INTO items (item_code, item_name, category, uom, unit_price, is_active, created_at, updated_at)
VALUES ('FLASHING-LIGHT-PORT', 'Flashing Light Port', 'RM', 'PCS', 0, true, NOW(), NOW())
ON CONFLICT (item_code) DO NOTHING;

INSERT INTO items (item_code, item_name, category, uom, unit_price, is_active, created_at, updated_at)
VALUES ('FLSHING-LIGHT-STBD', 'Flshing Light STBD', 'RM', 'PCS', 0, true, NOW(), NOW())
ON CONFLICT (item_code) DO NOTHING;

INSERT INTO items (item_code, item_name, category, uom, unit_price, is_active, created_at, updated_at)
VALUES ('FLASHING-LIGHT-GLASS', 'Flashing Light glass', 'RM', 'Number', 1000.0, true, NOW(), NOW())
ON CONFLICT (item_code) DO NOTHING;

INSERT INTO items (item_code, item_name, category, uom, unit_price, is_active, created_at, updated_at)
VALUES ('FLASHING-LIGHT-BOTTOM', 'Flashing Light bottom plate', 'RM', 'Number', 1000.0, true, NOW(), NOW())
ON CONFLICT (item_code) DO NOTHING;

INSERT INTO items (item_code, item_name, category, uom, unit_price, is_active, created_at, updated_at)
VALUES ('PU-GASKET-REMOTE', 'PU Gasket Remote Lower Shell', 'RM', 'Number', 100.0, true, NOW(), NOW())
ON CONFLICT (item_code) DO NOTHING;

INSERT INTO items (item_code, item_name, category, uom, unit_price, is_active, created_at, updated_at)
VALUES ('PU-GASKET-ELECTRONIC', 'PU Gasket Electronic Box', 'RM', 'Number', 100.0, true, NOW(), NOW())
ON CONFLICT (item_code) DO NOTHING;

INSERT INTO items (item_code, item_name, category, uom, unit_price, is_active, created_at, updated_at)
VALUES ('PU-GASKET-FRONT', 'PU Gasket Front Lid', 'RM', 'Number', 100.0, true, NOW(), NOW())
ON CONFLICT (item_code) DO NOTHING;

INSERT INTO items (item_code, item_name, category, uom, unit_price, is_active, created_at, updated_at)
VALUES ('GREASE', 'Grease', 'RM', 'Grm', 1.0, true, NOW(), NOW())
ON CONFLICT (item_code) DO NOTHING;

INSERT INTO items (item_code, item_name, category, uom, unit_price, is_active, created_at, updated_at)
VALUES ('HEATSHRINK-TUBE-6416', 'Heatshrink Tube 6.4:1.6', 'RM', 'Meter', 35.0, true, NOW(), NOW())
ON CONFLICT (item_code) DO NOTHING;

INSERT INTO items (item_code, item_name, category, uom, unit_price, is_active, created_at, updated_at)
VALUES ('HEATSHRINK-TUBE-93', 'Heatshrink Tube 9:3', 'RM', 'Meter', 64.0, true, NOW(), NOW())
ON CONFLICT (item_code) DO NOTHING;

INSERT INTO items (item_code, item_name, category, uom, unit_price, is_active, created_at, updated_at)
VALUES ('HEATSHRINK-TUBE-41', 'HeatShrink Tube 4:1', 'RM', 'Meter', 30.0, true, NOW(), NOW())
ON CONFLICT (item_code) DO NOTHING;

INSERT INTO items (item_code, item_name, category, uom, unit_price, is_active, created_at, updated_at)
VALUES ('HEATSHRINK-TUBE-24', 'HeatShrink Tube 2:4', 'RM', 'Meter', 27.0, true, NOW(), NOW())
ON CONFLICT (item_code) DO NOTHING;

INSERT INTO items (item_code, item_name, category, uom, unit_price, is_active, created_at, updated_at)
VALUES ('HEATSHRINK-TUBE-31', 'HeatShrink Tube 3:1', 'RM', 'Meter', 30.0, true, NOW(), NOW())
ON CONFLICT (item_code) DO NOTHING;

INSERT INTO items (item_code, item_name, category, uom, unit_price, is_active, created_at, updated_at)
VALUES ('HEATSHRINK-TUBE-123', 'HeatShrink Tube 12:3', 'RM', 'Meter', 50.0, true, NOW(), NOW())
ON CONFLICT (item_code) DO NOTHING;

INSERT INTO items (item_code, item_name, category, uom, unit_price, is_active, created_at, updated_at)
VALUES ('HEATSHRINK-TUBE-4812', 'HeatShrink Tube 4.8/1.2', 'RM', 'Meter', 50.0, true, NOW(), NOW())
ON CONFLICT (item_code) DO NOTHING;

INSERT INTO items (item_code, item_name, category, uom, unit_price, is_active, created_at, updated_at)
VALUES ('HEATSHRINK-TUBE-15MM16MM', 'HeatShrink Tube 1.5mm/1.6mm', 'RM', 'Meter', 8.0, true, NOW(), NOW())
ON CONFLICT (item_code) DO NOTHING;

INSERT INTO items (item_code, item_name, category, uom, unit_price, is_active, created_at, updated_at)
VALUES ('HEATSHRINK-TUBE-100MM', 'HeatShrink Tube 100mm', 'RM', 'Meter', 265.0, true, NOW(), NOW())
ON CONFLICT (item_code) DO NOTHING;

INSERT INTO items (item_code, item_name, category, uom, unit_price, is_active, created_at, updated_at)
VALUES ('HEATSHRINK-TUBE-30MM', 'HeatShrink Tube 30mm', 'RM', 'PCS', 0, true, NOW(), NOW())
ON CONFLICT (item_code) DO NOTHING;

INSERT INTO items (item_code, item_name, category, uom, unit_price, is_active, created_at, updated_at)
VALUES ('HEAT-SHRINK-SLEEVE', 'Heat Shrink Sleeve 16mm Transparent', 'RM', 'PCS', 0, true, NOW(), NOW())
ON CONFLICT (item_code) DO NOTHING;

INSERT INTO items (item_code, item_name, category, uom, unit_price, is_active, created_at, updated_at)
VALUES ('GREASING-PUMP', 'Greasing Pump', 'RM', 'Number', 300.0, true, NOW(), NOW())
ON CONFLICT (item_code) DO NOTHING;

INSERT INTO items (item_code, item_name, category, uom, unit_price, is_active, created_at, updated_at)
VALUES ('HEATSINK-PASTE', 'Heatsink paste', 'RM', 'Grm', 2.0, true, NOW(), NOW())
ON CONFLICT (item_code) DO NOTHING;

INSERT INTO items (item_code, item_name, category, uom, unit_price, is_active, created_at, updated_at)
VALUES ('TEROSON-MS930', 'Teroson MS930', 'RM', 'ml', 2.0, true, NOW(), NOW())
ON CONFLICT (item_code) DO NOTHING;

INSERT INTO items (item_code, item_name, category, uom, unit_price, is_active, created_at, updated_at)
VALUES ('SILICON-RTV-732', 'Silicon RTV 732', 'RM', 'ml', 1.0, true, NOW(), NOW())
ON CONFLICT (item_code) DO NOTHING;

INSERT INTO items (item_code, item_name, category, uom, unit_price, is_active, created_at, updated_at)
VALUES ('SILICON-RTV-734', 'Silicon RTV 734 Potting compound', 'RM', 'ml', 2.0, true, NOW(), NOW())
ON CONFLICT (item_code) DO NOTHING;

INSERT INTO items (item_code, item_name, category, uom, unit_price, is_active, created_at, updated_at)
VALUES ('MASKING-TAPE-12', 'Masking Tape 1/2 inch', 'RM', 'PCS', 0, true, NOW(), NOW())
ON CONFLICT (item_code) DO NOTHING;

INSERT INTO items (item_code, item_name, category, uom, unit_price, is_active, created_at, updated_at)
VALUES ('MASKING-TAPE-34', 'Masking Tape 3/4', 'RM', 'PCS', 0, true, NOW(), NOW())
ON CONFLICT (item_code) DO NOTHING;

INSERT INTO items (item_code, item_name, category, uom, unit_price, is_active, created_at, updated_at)
VALUES ('1-MASKING-TAPE', '1" Masking Tape', 'RM', 'Meter', 2.0, true, NOW(), NOW())
ON CONFLICT (item_code) DO NOTHING;

INSERT INTO items (item_code, item_name, category, uom, unit_price, is_active, created_at, updated_at)
VALUES ('2-MASKING-TAPE', '2" Masking Tape', 'RM', 'PCS', 0, true, NOW(), NOW())
ON CONFLICT (item_code) DO NOTHING;

INSERT INTO items (item_code, item_name, category, uom, unit_price, is_active, created_at, updated_at)
VALUES ('DUCK-TAPE', 'Duck Tape', 'RM', 'PCS', 0, true, NOW(), NOW())
ON CONFLICT (item_code) DO NOTHING;

INSERT INTO items (item_code, item_name, category, uom, unit_price, is_active, created_at, updated_at)
VALUES ('3M-TAPE', '3M Tape', 'RM', 'PCS', 0, true, NOW(), NOW())
ON CONFLICT (item_code) DO NOTHING;

INSERT INTO items (item_code, item_name, category, uom, unit_price, is_active, created_at, updated_at)
VALUES ('RR-TAPE', 'RR Tape', 'RM', 'Meter', 50.0, true, NOW(), NOW())
ON CONFLICT (item_code) DO NOTHING;

INSERT INTO items (item_code, item_name, category, uom, unit_price, is_active, created_at, updated_at)
VALUES ('FLEXBOND', 'FlexBond', 'RM', 'ml', 3.0, true, NOW(), NOW())
ON CONFLICT (item_code) DO NOTHING;

INSERT INTO items (item_code, item_name, category, uom, unit_price, is_active, created_at, updated_at)
VALUES ('LOCK-TITE-242', 'Lock Tite 242', 'RM', 'PCS', 0, true, NOW(), NOW())
ON CONFLICT (item_code) DO NOTHING;

INSERT INTO items (item_code, item_name, category, uom, unit_price, is_active, created_at, updated_at)
VALUES ('LOCK-TITE-270', 'Lock Tite 270', 'RM', 'PCS', 0, true, NOW(), NOW())
ON CONFLICT (item_code) DO NOTHING;

INSERT INTO items (item_code, item_name, category, uom, unit_price, is_active, created_at, updated_at)
VALUES ('STAPLES-PINS', 'Staples pins', 'RM', 'Number', 0.25, true, NOW(), NOW())
ON CONFLICT (item_code) DO NOTHING;

INSERT INTO items (item_code, item_name, category, uom, unit_price, is_active, created_at, updated_at)
VALUES ('BRASS-NOZZLE-FOR', 'Brass nozzle for water outlet from JCB', 'RM', 'Number', 70.0, true, NOW(), NOW())
ON CONFLICT (item_code) DO NOTHING;

INSERT INTO items (item_code, item_name, category, uom, unit_price, is_active, created_at, updated_at)
VALUES ('JCB-BATTERY-HOLDERS', 'JCB Battery Holders 3D Print', 'RM', 'PCS', 0, true, NOW(), NOW())
ON CONFLICT (item_code) DO NOTHING;

INSERT INTO items (item_code, item_name, category, uom, unit_price, is_active, created_at, updated_at)
VALUES ('SS-COOLING-WATER', 'SS Cooling Water Outlet nozzle', 'RM', 'Number', 100.0, true, NOW(), NOW())
ON CONFLICT (item_code) DO NOTHING;

INSERT INTO items (item_code, item_name, category, uom, unit_price, is_active, created_at, updated_at)
VALUES ('SS-COOLING-WATER', 'SS Cooling Water Inlet nozzle', 'RM', 'Number', 100.0, true, NOW(), NOW())
ON CONFLICT (item_code) DO NOTHING;

INSERT INTO items (item_code, item_name, category, uom, unit_price, is_active, created_at, updated_at)
VALUES ('GREASING-NOZZLE', 'Greasing nozzle', 'RM', 'Number', 100.0, true, NOW(), NOW())
ON CONFLICT (item_code) DO NOTHING;

INSERT INTO items (item_code, item_name, category, uom, unit_price, is_active, created_at, updated_at)
VALUES ('GREASING-NIPPLE', 'Greasing Nipple', 'RM', 'PCS', 0, true, NOW(), NOW())
ON CONFLICT (item_code) DO NOTHING;

INSERT INTO items (item_code, item_name, category, uom, unit_price, is_active, created_at, updated_at)
VALUES ('NOZZLE-ON-JET', 'Nozzle on Jet', 'RM', 'Number', 100.0, true, NOW(), NOW())
ON CONFLICT (item_code) DO NOTHING;

INSERT INTO items (item_code, item_name, category, uom, unit_price, is_active, created_at, updated_at)
VALUES ('JET-NOZZLES-BLACK', 'Jet Nozzles (Black big)', 'RM', 'PCS', 0, true, NOW(), NOW())
ON CONFLICT (item_code) DO NOTHING;

INSERT INTO items (item_code, item_name, category, uom, unit_price, is_active, created_at, updated_at)
VALUES ('IMPELLERS', 'Impellers', 'RM', 'PCS', 0, true, NOW(), NOW())
ON CONFLICT (item_code) DO NOTHING;

INSERT INTO items (item_code, item_name, category, uom, unit_price, is_active, created_at, updated_at)
VALUES ('SILICON-HOSE-PIPE', 'Silicon hose pipe clip 7mm', 'RM', 'Number', 13.0, true, NOW(), NOW())
ON CONFLICT (item_code) DO NOTHING;

INSERT INTO items (item_code, item_name, category, uom, unit_price, is_active, created_at, updated_at)
VALUES ('WATER-JET-S52', 'Water Jet S52', 'RM', 'Number', 10000.0, true, NOW(), NOW())
ON CONFLICT (item_code) DO NOTHING;

INSERT INTO items (item_code, item_name, category, uom, unit_price, is_active, created_at, updated_at)
VALUES ('ESC-MOUNTING-PLATE', 'ESC Mounting Plate', 'RM', 'Number', 200.0, true, NOW(), NOW())
ON CONFLICT (item_code) DO NOTHING;

INSERT INTO items (item_code, item_name, category, uom, unit_price, is_active, created_at, updated_at)
VALUES ('JET-S52-MOUNTING', 'Jet S52 Mounting plate', 'RM', 'Number', 1500.0, true, NOW(), NOW())
ON CONFLICT (item_code) DO NOTHING;

INSERT INTO items (item_code, item_name, category, uom, unit_price, is_active, created_at, updated_at)
VALUES ('MOTOR-MOUNT-HEATBLOCK', 'Motor mount heatblock TOP', 'RM', 'Number', 3000.0, true, NOW(), NOW())
ON CONFLICT (item_code) DO NOTHING;

INSERT INTO items (item_code, item_name, category, uom, unit_price, is_active, created_at, updated_at)
VALUES ('MOTOR-MOUNT-HEATBLOCK', 'Motor mount heatblock BOTTOM', 'RM', 'Number', 3000.0, true, NOW(), NOW())
ON CONFLICT (item_code) DO NOTHING;

INSERT INTO items (item_code, item_name, category, uom, unit_price, is_active, created_at, updated_at)
VALUES ('TWO-HALF-MOTOR', 'Two half Motor Mount side plates', 'RM', 'PCS', 0, true, NOW(), NOW())
ON CONFLICT (item_code) DO NOTHING;

INSERT INTO items (item_code, item_name, category, uom, unit_price, is_active, created_at, updated_at)
VALUES ('REVERSE-BUKETING-SIDE', 'Reverse Buketing side plates', 'RM', 'PCS', 0, true, NOW(), NOW())
ON CONFLICT (item_code) DO NOTHING;

INSERT INTO items (item_code, item_name, category, uom, unit_price, is_active, created_at, updated_at)
VALUES ('ALUMINIUM-SHEET-2MM', 'Aluminium Sheet 2mm thick 4ftx2ft', 'RM', 'Number', 0, true, NOW(), NOW())
ON CONFLICT (item_code) DO NOTHING;

INSERT INTO items (item_code, item_name, category, uom, unit_price, is_active, created_at, updated_at)
VALUES ('HEAT-CONDENSORJET-HEAT', 'Heat condensor/Jet Heat Sink', 'RM', 'Number', 0, true, NOW(), NOW())
ON CONFLICT (item_code) DO NOTHING;

INSERT INTO items (item_code, item_name, category, uom, unit_price, is_active, created_at, updated_at)
VALUES ('LH1-THERMOSYPHENS', 'LH-1 Thermosyphens', 'RM', 'Number', 0, true, NOW(), NOW())
ON CONFLICT (item_code) DO NOTHING;

INSERT INTO items (item_code, item_name, category, uom, unit_price, is_active, created_at, updated_at)
VALUES ('HEAT-CONDENSORJET-HEAT', 'Heat condensor/Jet Heat Sink LHS 2 Plate', 'RM', 'PCS', 0, true, NOW(), NOW())
ON CONFLICT (item_code) DO NOTHING;

INSERT INTO items (item_code, item_name, category, uom, unit_price, is_active, created_at, updated_at)
VALUES ('HEAT-CONDENSORJET-HEAT', 'Heat condensor/Jet Heat Sink RHS 1 Plate', 'RM', 'Number', 0, true, NOW(), NOW())
ON CONFLICT (item_code) DO NOTHING;

INSERT INTO items (item_code, item_name, category, uom, unit_price, is_active, created_at, updated_at)
VALUES ('HEAT-CONDENSORJET-HEAT', 'Heat condensor/Jet Heat Sink RHS 2 Plate', 'RM', 'PCS', 0, true, NOW(), NOW())
ON CONFLICT (item_code) DO NOTHING;

INSERT INTO items (item_code, item_name, category, uom, unit_price, is_active, created_at, updated_at)
VALUES ('HEAT-CONDENSORJET-HEAT', 'Heat condensor/Jet Heat Sink Top Plate', 'RM', 'Number', 0, true, NOW(), NOW())
ON CONFLICT (item_code) DO NOTHING;

INSERT INTO items (item_code, item_name, category, uom, unit_price, is_active, created_at, updated_at)
VALUES ('MOTOR-BLOCK-SIDE', 'Motor Block Side Plate', 'RM', 'Number', 0, true, NOW(), NOW())
ON CONFLICT (item_code) DO NOTHING;

INSERT INTO items (item_code, item_name, category, uom, unit_price, is_active, created_at, updated_at)
VALUES ('CONDENSOR-CLAMP', 'Condensor Clamp', 'RM', 'Number', 0, true, NOW(), NOW())
ON CONFLICT (item_code) DO NOTHING;

INSERT INTO items (item_code, item_name, category, uom, unit_price, is_active, created_at, updated_at)
VALUES ('COPPER-HEAT-PIPE', 'Copper heat pipe (set of 2)', 'RM', 'Number', 0, true, NOW(), NOW())
ON CONFLICT (item_code) DO NOTHING;

INSERT INTO items (item_code, item_name, category, uom, unit_price, is_active, created_at, updated_at)
VALUES ('COPPER-HEAT-PIPES', 'Copper heat pipes ( New)', 'RM', 'PCS', 0, true, NOW(), NOW())
ON CONFLICT (item_code) DO NOTHING;

INSERT INTO items (item_code, item_name, category, uom, unit_price, is_active, created_at, updated_at)
VALUES ('STBD-AFT-PLATE', 'STBD Aft Plate', 'RM', 'Number', 2000.0, true, NOW(), NOW())
ON CONFLICT (item_code) DO NOTHING;

INSERT INTO items (item_code, item_name, category, uom, unit_price, is_active, created_at, updated_at)
VALUES ('PORT-AFT-PLATE', 'PORT Aft Plate', 'RM', 'Number', 2000.0, true, NOW(), NOW())
ON CONFLICT (item_code) DO NOTHING;

INSERT INTO items (item_code, item_name, category, uom, unit_price, is_active, created_at, updated_at)
VALUES ('3D-PRINTED-SR', '3D printed SR Pillow Side Caps 3D Print', 'RM', 'Number', 25.0, true, NOW(), NOW())
ON CONFLICT (item_code) DO NOTHING;

INSERT INTO items (item_code, item_name, category, uom, unit_price, is_active, created_at, updated_at)
VALUES ('3D-PRINTED-SR', '3D printed SR Pillow Middle Caps 3D Print', 'RM', 'Number', 25.0, true, NOW(), NOW())
ON CONFLICT (item_code) DO NOTHING;

INSERT INTO items (item_code, item_name, category, uom, unit_price, is_active, created_at, updated_at)
VALUES ('3D-PRINTED-BOTTOM', '3D printed bottom block caps', 'RM', 'Number', 20.0, true, NOW(), NOW())
ON CONFLICT (item_code) DO NOTHING;

INSERT INTO items (item_code, item_name, category, uom, unit_price, is_active, created_at, updated_at)
VALUES ('BUTTON-SPACER-NO', 'Button spacer No. 1/1 3D Print', 'RM', 'Number', 20.0, true, NOW(), NOW())
ON CONFLICT (item_code) DO NOTHING;

INSERT INTO items (item_code, item_name, category, uom, unit_price, is_active, created_at, updated_at)
VALUES ('BUTTON-SPACER-NO', 'Button Spacer No. 1/2 3D Print', 'RM', 'Number', 20.0, true, NOW(), NOW())
ON CONFLICT (item_code) DO NOTHING;

INSERT INTO items (item_code, item_name, category, uom, unit_price, is_active, created_at, updated_at)
VALUES ('BUTTON-SPACER-NO', 'Button Spacer No. 2 3D Print', 'RM', 'Number', 20.0, true, NOW(), NOW())
ON CONFLICT (item_code) DO NOTHING;

INSERT INTO items (item_code, item_name, category, uom, unit_price, is_active, created_at, updated_at)
VALUES ('BUTTON-NO-1', 'Button No. 1 pressure bracket 3D Print', 'RM', 'Number', 20.0, true, NOW(), NOW())
ON CONFLICT (item_code) DO NOTHING;

INSERT INTO items (item_code, item_name, category, uom, unit_price, is_active, created_at, updated_at)
VALUES ('REMOTE-BATTERY-HOLDING', 'Remote Battery Holding Bracket 3D Print', 'RM', 'Number', 20.0, true, NOW(), NOW())
ON CONFLICT (item_code) DO NOTHING;

INSERT INTO items (item_code, item_name, category, uom, unit_price, is_active, created_at, updated_at)
VALUES ('CRAFT-BATTERY-HOLDING', 'Craft Battery Holding Bracket 3D Print', 'RM', 'PCS', 0, true, NOW(), NOW())
ON CONFLICT (item_code) DO NOTHING;

INSERT INTO items (item_code, item_name, category, uom, unit_price, is_active, created_at, updated_at)
VALUES ('REMOTE-STRAPS', 'Remote Straps', 'RM', 'PCS', 0, true, NOW(), NOW())
ON CONFLICT (item_code) DO NOTHING;

INSERT INTO items (item_code, item_name, category, uom, unit_price, is_active, created_at, updated_at)
VALUES ('REMOTE-STRAP-HOLDER', 'Remote Strap Holder', 'RM', 'PCS', 0, true, NOW(), NOW())
ON CONFLICT (item_code) DO NOTHING;

INSERT INTO items (item_code, item_name, category, uom, unit_price, is_active, created_at, updated_at)
VALUES ('JOYSTICK-SCREWS', 'Joystick Screws', 'RM', 'PCS', 0, true, NOW(), NOW())
ON CONFLICT (item_code) DO NOTHING;

INSERT INTO items (item_code, item_name, category, uom, unit_price, is_active, created_at, updated_at)
VALUES ('LCD-SCREEN', 'LCD Screen', 'RM', 'PCS', 0, true, NOW(), NOW())
ON CONFLICT (item_code) DO NOTHING;

INSERT INTO items (item_code, item_name, category, uom, unit_price, is_active, created_at, updated_at)
VALUES ('ANTENNA-CLAMP-1', 'Antenna clamp -1 3D Print', 'RM', 'Number', 20.0, true, NOW(), NOW())
ON CONFLICT (item_code) DO NOTHING;

INSERT INTO items (item_code, item_name, category, uom, unit_price, is_active, created_at, updated_at)
VALUES ('ANTENNA-CLAMP-2', 'Antenna Clamp -2 3D Print', 'RM', 'Number', 20.0, true, NOW(), NOW())
ON CONFLICT (item_code) DO NOTHING;

INSERT INTO items (item_code, item_name, category, uom, unit_price, is_active, created_at, updated_at)
VALUES ('LCD-HOLDER-BRACKET', 'LCD holder bracket 3D print', 'RM', 'PCS', 0, true, NOW(), NOW())
ON CONFLICT (item_code) DO NOTHING;

INSERT INTO items (item_code, item_name, category, uom, unit_price, is_active, created_at, updated_at)
VALUES ('CHARGER-SPACER-3D', 'Charger Spacer 3D Print', 'RM', 'PCS', 0, true, NOW(), NOW())
ON CONFLICT (item_code) DO NOTHING;

INSERT INTO items (item_code, item_name, category, uom, unit_price, is_active, created_at, updated_at)
VALUES ('BUTTON-11-3D', 'Button 1/1 3D print', 'RM', 'PCS', 0, true, NOW(), NOW())
ON CONFLICT (item_code) DO NOTHING;

INSERT INTO items (item_code, item_name, category, uom, unit_price, is_active, created_at, updated_at)
VALUES ('BUTTON-12-3D', 'Button 1/2 3D Print', 'RM', 'PCS', 0, true, NOW(), NOW())
ON CONFLICT (item_code) DO NOTHING;

INSERT INTO items (item_code, item_name, category, uom, unit_price, is_active, created_at, updated_at)
VALUES ('ROTARY-KNOB-BOX', 'Rotary Knob Box 3D print', 'RM', 'Number', 500.0, true, NOW(), NOW())
ON CONFLICT (item_code) DO NOTHING;

INSERT INTO items (item_code, item_name, category, uom, unit_price, is_active, created_at, updated_at)
VALUES ('ROTARY-ENCODER', 'Rotary Encoder', 'RM', 'PCS', 0, true, NOW(), NOW())
ON CONFLICT (item_code) DO NOTHING;

INSERT INTO items (item_code, item_name, category, uom, unit_price, is_active, created_at, updated_at)
VALUES ('IFU-3D-MIDDLE', 'IFU 3D Middle', 'RM', 'PCS', 225.0, true, NOW(), NOW())
ON CONFLICT (item_code) DO NOTHING;

INSERT INTO items (item_code, item_name, category, uom, unit_price, is_active, created_at, updated_at)
VALUES ('IFU-TOP', 'IFU top', 'RM', 'PCS', 0, true, NOW(), NOW())
ON CONFLICT (item_code) DO NOTHING;

INSERT INTO items (item_code, item_name, category, uom, unit_price, is_active, created_at, updated_at)
VALUES ('IFU-BOTTOM', 'IFU Bottom', 'RM', 'PCS', 0, true, NOW(), NOW())
ON CONFLICT (item_code) DO NOTHING;

INSERT INTO items (item_code, item_name, category, uom, unit_price, is_active, created_at, updated_at)
VALUES ('MOTOR-4092', 'Motor 4092', 'RM', 'PCS', 0, true, NOW(), NOW())
ON CONFLICT (item_code) DO NOTHING;

INSERT INTO items (item_code, item_name, category, uom, unit_price, is_active, created_at, updated_at)
VALUES ('4092-COOLING-JACKETS', '4092 cooling jackets', 'RM', 'PCS', 0, true, NOW(), NOW())
ON CONFLICT (item_code) DO NOTHING;

INSERT INTO items (item_code, item_name, category, uom, unit_price, is_active, created_at, updated_at)
VALUES ('MOTOR-5692-495', 'Motor 5692 495 KV', 'RM', 'Number', 7000.0, true, NOW(), NOW())
ON CONFLICT (item_code) DO NOTHING;

INSERT INTO items (item_code, item_name, category, uom, unit_price, is_active, created_at, updated_at)
VALUES ('5692-MOTOR-COOLING', '5692 motor cooling jacket', 'RM', 'PCS', 0, true, NOW(), NOW())
ON CONFLICT (item_code) DO NOTHING;

INSERT INTO items (item_code, item_name, category, uom, unit_price, is_active, created_at, updated_at)
VALUES ('HV130-ESC', 'HV130 ESC', 'RM', 'Number', 8000.0, true, NOW(), NOW())
ON CONFLICT (item_code) DO NOTHING;

INSERT INTO items (item_code, item_name, category, uom, unit_price, is_active, created_at, updated_at)
VALUES ('8-MM-OD', '8 mm OD pneaumatic pipe', 'RM', 'Meter', 70.0, true, NOW(), NOW())
ON CONFLICT (item_code) DO NOTHING;

INSERT INTO items (item_code, item_name, category, uom, unit_price, is_active, created_at, updated_at)
VALUES ('12-TO-8', '12 to 8 right angled reducer with lock clips', 'RM', 'Number', 154.0, true, NOW(), NOW())
ON CONFLICT (item_code) DO NOTHING;

INSERT INTO items (item_code, item_name, category, uom, unit_price, is_active, created_at, updated_at)
VALUES ('12-TO-8', '12 to 8 right angled lock clips', 'RM', 'PCS', 0, true, NOW(), NOW())
ON CONFLICT (item_code) DO NOTHING;

INSERT INTO items (item_code, item_name, category, uom, unit_price, is_active, created_at, updated_at)
VALUES ('12MM-OD-PNEUMATIC', '12mm OD pneumatic pipe', 'RM', 'Meter', 120.0, true, NOW(), NOW())
ON CONFLICT (item_code) DO NOTHING;

INSERT INTO items (item_code, item_name, category, uom, unit_price, is_active, created_at, updated_at)
VALUES ('POLYCARBONATE-GLASS-FOR', 'Polycarbonate Glass for Remote', 'RM', 'Number', 50.0, true, NOW(), NOW())
ON CONFLICT (item_code) DO NOTHING;

INSERT INTO items (item_code, item_name, category, uom, unit_price, is_active, created_at, updated_at)
VALUES ('55-NO-BOX', '55 No. Box for chraging cable & Tool box', 'RM', 'Number', 50.0, true, NOW(), NOW())
ON CONFLICT (item_code) DO NOTHING;

INSERT INTO items (item_code, item_name, category, uom, unit_price, is_active, created_at, updated_at)
VALUES ('22-NO-BOX', '22 No. Box for SR structure screws', 'RM', 'Number', 20.0, true, NOW(), NOW())
ON CONFLICT (item_code) DO NOTHING;

INSERT INTO items (item_code, item_name, category, uom, unit_price, is_active, created_at, updated_at)
VALUES ('BOTTOM-MESH-120MM', 'Bottom Mesh (120mm x 100mm, 5"x4")', 'RM', 'Number', 25.0, true, NOW(), NOW())
ON CONFLICT (item_code) DO NOTHING;

INSERT INTO items (item_code, item_name, category, uom, unit_price, is_active, created_at, updated_at)
VALUES ('AIR-NOZZLE', 'Air nozzle', 'RM', 'Number', 15.0, true, NOW(), NOW())
ON CONFLICT (item_code) DO NOTHING;

INSERT INTO items (item_code, item_name, category, uom, unit_price, is_active, created_at, updated_at)
VALUES ('ACETONE', 'Acetone', 'RM', 'ml', 2.0, true, NOW(), NOW())
ON CONFLICT (item_code) DO NOTHING;

INSERT INTO items (item_code, item_name, category, uom, unit_price, is_active, created_at, updated_at)
VALUES ('IPA', 'IPA', 'RM', 'ml', 2.0, true, NOW(), NOW())
ON CONFLICT (item_code) DO NOTHING;

INSERT INTO items (item_code, item_name, category, uom, unit_price, is_active, created_at, updated_at)
VALUES ('FOAM-GASKET-405', 'Foam Gasket 40/5', 'RM', 'PCS', 0, true, NOW(), NOW())
ON CONFLICT (item_code) DO NOTHING;

INSERT INTO items (item_code, item_name, category, uom, unit_price, is_active, created_at, updated_at)
VALUES ('POLY-URETHANE-FOAM', 'Poly Urethane Foam', 'RM', 'ml', 1.0, true, NOW(), NOW())
ON CONFLICT (item_code) DO NOTHING;

INSERT INTO items (item_code, item_name, category, uom, unit_price, is_active, created_at, updated_at)
VALUES ('SILICON-HOSE-4MM', 'Silicon Hose 4mm x 8mm', 'RM', 'Meter', 125.0, true, NOW(), NOW())
ON CONFLICT (item_code) DO NOTHING;

INSERT INTO items (item_code, item_name, category, uom, unit_price, is_active, created_at, updated_at)
VALUES ('SILICON-HOSE-3MM', 'Silicon Hose 3mm x 6mm', 'RM', 'Meter', 95.0, true, NOW(), NOW())
ON CONFLICT (item_code) DO NOTHING;

INSERT INTO items (item_code, item_name, category, uom, unit_price, is_active, created_at, updated_at)
VALUES ('6MMX12MM-RUBBER-BUSH', '6mmx12mm Rubber Bush', 'RM', 'Meter', 95.0, true, NOW(), NOW())
ON CONFLICT (item_code) DO NOTHING;

INSERT INTO items (item_code, item_name, category, uom, unit_price, is_active, created_at, updated_at)
VALUES ('JOYSTICK-WATER-PROOF', 'Joystick Water proof rubber', 'RM', 'Number', 75.0, true, NOW(), NOW())
ON CONFLICT (item_code) DO NOTHING;

INSERT INTO items (item_code, item_name, category, uom, unit_price, is_active, created_at, updated_at)
VALUES ('BUTTON-SILICON-COVER', 'Button Silicon Cover No. 1', 'RM', 'Number', 35.0, true, NOW(), NOW())
ON CONFLICT (item_code) DO NOTHING;

INSERT INTO items (item_code, item_name, category, uom, unit_price, is_active, created_at, updated_at)
VALUES ('BUTTON-SILICON-COVER', 'Button Silicon Cover No. 2', 'RM', 'Number', 35.0, true, NOW(), NOW())
ON CONFLICT (item_code) DO NOTHING;

INSERT INTO items (item_code, item_name, category, uom, unit_price, is_active, created_at, updated_at)
VALUES ('3MM-SILICON-RUBBER', '3mm Silicon Rubber Gaskets (35mmx10mm)', 'RM', 'Number', 2.0, true, NOW(), NOW())
ON CONFLICT (item_code) DO NOTHING;

INSERT INTO items (item_code, item_name, category, uom, unit_price, is_active, created_at, updated_at)
VALUES ('THREAD-LOCKER-242', 'Thread locker 242', 'RM', 'ml', 10.0, true, NOW(), NOW())
ON CONFLICT (item_code) DO NOTHING;

INSERT INTO items (item_code, item_name, category, uom, unit_price, is_active, created_at, updated_at)
VALUES ('THREAD-LOCKER-270', 'Thread locker 270', 'RM', 'PCS', 0, true, NOW(), NOW())
ON CONFLICT (item_code) DO NOTHING;

INSERT INTO items (item_code, item_name, category, uom, unit_price, is_active, created_at, updated_at)
VALUES ('THREAD-LOCKER-290', 'Thread locker 290', 'RM', 'PCS', 0, true, NOW(), NOW())
ON CONFLICT (item_code) DO NOTHING;

INSERT INTO items (item_code, item_name, category, uom, unit_price, is_active, created_at, updated_at)
VALUES ('THREAD-LOCKER-ACTIVATOR', 'Thread locker Activator', 'RM', 'ml', 8.0, true, NOW(), NOW())
ON CONFLICT (item_code) DO NOTHING;

INSERT INTO items (item_code, item_name, category, uom, unit_price, is_active, created_at, updated_at)
VALUES ('INSTANT-ADHESIVE-407', 'Instant Adhesive 407 for EPE sticking', 'RM', 'ml', 15.0, true, NOW(), NOW())
ON CONFLICT (item_code) DO NOTHING;

INSERT INTO items (item_code, item_name, category, uom, unit_price, is_active, created_at, updated_at)
VALUES ('ORING-AFT-PLATE', 'Oring AFT plate', 'RM', 'Number', 30.0, true, NOW(), NOW())
ON CONFLICT (item_code) DO NOTHING;

INSERT INTO items (item_code, item_name, category, uom, unit_price, is_active, created_at, updated_at)
VALUES ('STBD-SR-RUBBER', 'STBD SR Rubber Boot', 'RM', 'Number', 0, true, NOW(), NOW())
ON CONFLICT (item_code) DO NOTHING;

INSERT INTO items (item_code, item_name, category, uom, unit_price, is_active, created_at, updated_at)
VALUES ('PORT-SR-RUBBER', 'PORT SR Rubber Boot', 'RM', 'Number', 0, true, NOW(), NOW())
ON CONFLICT (item_code) DO NOTHING;

INSERT INTO items (item_code, item_name, category, uom, unit_price, is_active, created_at, updated_at)
VALUES ('SAIFSEAS-NECK-STRAP', 'SaifSeas Neck Strap', 'RM', 'Number', 100.0, true, NOW(), NOW())
ON CONFLICT (item_code) DO NOTHING;

INSERT INTO items (item_code, item_name, category, uom, unit_price, is_active, created_at, updated_at)
VALUES ('HOOK-STICKER-STBD', 'Hook Sticker STBD', 'RM', 'Number', 20.0, true, NOW(), NOW())
ON CONFLICT (item_code) DO NOTHING;

INSERT INTO items (item_code, item_name, category, uom, unit_price, is_active, created_at, updated_at)
VALUES ('HOOK-STIKER-PORT', 'Hook Stiker PORT', 'RM', 'Number', 20.0, true, NOW(), NOW())
ON CONFLICT (item_code) DO NOTHING;

INSERT INTO items (item_code, item_name, category, uom, unit_price, is_active, created_at, updated_at)
VALUES ('HOLD-HERE-STICKER', 'Hold here sticker STBD', 'RM', 'Number', 20.0, true, NOW(), NOW())
ON CONFLICT (item_code) DO NOTHING;

INSERT INTO items (item_code, item_name, category, uom, unit_price, is_active, created_at, updated_at)
VALUES ('HOLD-HERE-STICKER', 'Hold here sticker PORT', 'RM', 'Number', 20.0, true, NOW(), NOW())
ON CONFLICT (item_code) DO NOTHING;

INSERT INTO items (item_code, item_name, category, uom, unit_price, is_active, created_at, updated_at)
VALUES ('CRAFT-CLEANING-NOTIFY', 'Craft Cleaning Notify Sticker', 'RM', 'Number', 20.0, true, NOW(), NOW())
ON CONFLICT (item_code) DO NOTHING;

INSERT INTO items (item_code, item_name, category, uom, unit_price, is_active, created_at, updated_at)
VALUES ('FERROLE', 'Ferrole', 'RM', 'Number', 0, true, NOW(), NOW())
ON CONFLICT (item_code) DO NOTHING;

INSERT INTO items (item_code, item_name, category, uom, unit_price, is_active, created_at, updated_at)
VALUES ('ROPE-8MM', 'Rope 8mm', 'RM', 'Meter', 0, true, NOW(), NOW())
ON CONFLICT (item_code) DO NOTHING;

INSERT INTO items (item_code, item_name, category, uom, unit_price, is_active, created_at, updated_at)
VALUES ('PACKING-WOODEN-HARDBOX', 'Packing Wooden HardBox', 'RM', 'Number', 3500.0, true, NOW(), NOW())
ON CONFLICT (item_code) DO NOTHING;

INSERT INTO items (item_code, item_name, category, uom, unit_price, is_active, created_at, updated_at)
VALUES ('10MM-NUT-DRIVER', '10mm Nut Driver with 15mm Depth', 'RM', 'Number', 55.0, true, NOW(), NOW())
ON CONFLICT (item_code) DO NOTHING;

INSERT INTO items (item_code, item_name, category, uom, unit_price, is_active, created_at, updated_at)
VALUES ('4MM-ALLEN-KEY', '4mm Allen Key', 'RM', 'PCS', 0, true, NOW(), NOW())
ON CONFLICT (item_code) DO NOTHING;

INSERT INTO items (item_code, item_name, category, uom, unit_price, is_active, created_at, updated_at)
VALUES ('5MM-ALLEN-KEY', '5mm Allen Key', 'RM', 'PCS', 0, true, NOW(), NOW())
ON CONFLICT (item_code) DO NOTHING;

INSERT INTO items (item_code, item_name, category, uom, unit_price, is_active, created_at, updated_at)
VALUES ('6MM-ALLEN-KEY', '6mm Allen Key', 'RM', 'Number', 65.0, true, NOW(), NOW())
ON CONFLICT (item_code) DO NOTHING;

INSERT INTO items (item_code, item_name, category, uom, unit_price, is_active, created_at, updated_at)
VALUES ('6MM-T-HANDLE', '6mm T Handle', 'RM', 'PCS', 0, true, NOW(), NOW())
ON CONFLICT (item_code) DO NOTHING;

INSERT INTO items (item_code, item_name, category, uom, unit_price, is_active, created_at, updated_at)
VALUES ('10MM-SPANNER', '10mm Spanner', 'RM', 'PCS', 0, true, NOW(), NOW())
ON CONFLICT (item_code) DO NOTHING;

INSERT INTO items (item_code, item_name, category, uom, unit_price, is_active, created_at, updated_at)
VALUES ('EPE-SHEET-20MM', 'EPE sheet 20mm 48"x72"', 'RM', 'Number', 0, true, NOW(), NOW())
ON CONFLICT (item_code) DO NOTHING;

INSERT INTO items (item_code, item_name, category, uom, unit_price, is_active, created_at, updated_at)
VALUES ('USER-MANUAL', 'User Manual', 'RM', 'Number', 0, true, NOW(), NOW())
ON CONFLICT (item_code) DO NOTHING;

INSERT INTO items (item_code, item_name, category, uom, unit_price, is_active, created_at, updated_at)
VALUES ('ENVELOPE-FOR-USER', 'Envelope for User Manual', 'RM', 'Number', 15.0, true, NOW(), NOW())
ON CONFLICT (item_code) DO NOTHING;

INSERT INTO items (item_code, item_name, category, uom, unit_price, is_active, created_at, updated_at)
VALUES ('SURGICAL-GLOVES', 'Surgical Gloves', 'RM', 'Number', 3.5, true, NOW(), NOW())
ON CONFLICT (item_code) DO NOTHING;

INSERT INTO items (item_code, item_name, category, uom, unit_price, is_active, created_at, updated_at)
VALUES ('X16-EXTENSION-PANEL', 'X16 extension panel', 'RM', 'Number', 0, true, NOW(), NOW())
ON CONFLICT (item_code) DO NOTHING;

INSERT INTO items (item_code, item_name, category, uom, unit_price, is_active, created_at, updated_at)
VALUES ('POLISH-BOTTLE', 'Polish Bottle', 'RM', 'ml', 0, true, NOW(), NOW())
ON CONFLICT (item_code) DO NOTHING;

INSERT INTO items (item_code, item_name, category, uom, unit_price, is_active, created_at, updated_at)
VALUES ('SHAVISON-SMPS', 'Shavison SMPS', 'RM', 'PCS', 0, true, NOW(), NOW())
ON CONFLICT (item_code) DO NOTHING;

INSERT INTO items (item_code, item_name, category, uom, unit_price, is_active, created_at, updated_at)
VALUES ('WIFI-ADAPTER', 'Wifi Adapter', 'RM', 'PCS', 0, true, NOW(), NOW())
ON CONFLICT (item_code) DO NOTHING;

INSERT INTO items (item_code, item_name, category, uom, unit_price, is_active, created_at, updated_at)
VALUES ('WIFI-ROUTER', 'Wifi router', 'RM', 'PCS', 0, true, NOW(), NOW())
ON CONFLICT (item_code) DO NOTHING;

INSERT INTO items (item_code, item_name, category, uom, unit_price, is_active, created_at, updated_at)
VALUES ('ADAPTER-913V', 'Adapter 9.13V', 'RM', 'PCS', 0, true, NOW(), NOW())
ON CONFLICT (item_code) DO NOTHING;

INSERT INTO items (item_code, item_name, category, uom, unit_price, is_active, created_at, updated_at)
VALUES ('ADAPTER-519V', 'Adapter 5.19V', 'RM', 'PCS', 0, true, NOW(), NOW())
ON CONFLICT (item_code) DO NOTHING;

INSERT INTO items (item_code, item_name, category, uom, unit_price, is_active, created_at, updated_at)
VALUES ('ROAST-FLASH-PRO', 'Roast Flash Pro bottle', 'RM', 'PCS', 0, true, NOW(), NOW())
ON CONFLICT (item_code) DO NOTHING;

INSERT INTO items (item_code, item_name, category, uom, unit_price, is_active, created_at, updated_at)
VALUES ('LIQUID-POLISH', 'Liquid Polish', 'RM', 'PCS', 0, true, NOW(), NOW())
ON CONFLICT (item_code) DO NOTHING;

INSERT INTO items (item_code, item_name, category, uom, unit_price, is_active, created_at, updated_at)
VALUES ('BIG-SYRINGES', 'Big Syringes', 'RM', 'PCS', 0, true, NOW(), NOW())
ON CONFLICT (item_code) DO NOTHING;

INSERT INTO items (item_code, item_name, category, uom, unit_price, is_active, created_at, updated_at)
VALUES ('SMALL-SYRINGES', 'Small Syringes', 'RM', 'PCS', 0, true, NOW(), NOW())
ON CONFLICT (item_code) DO NOTHING;

INSERT INTO items (item_code, item_name, category, uom, unit_price, is_active, created_at, updated_at)
VALUES ('WV-40', 'WV 40', 'RM', 'PCS', 0, true, NOW(), NOW())
ON CONFLICT (item_code) DO NOTHING;

INSERT INTO items (item_code, item_name, category, uom, unit_price, is_active, created_at, updated_at)
VALUES ('5-56-POWER', '5 56 power spray', 'RM', 'PCS', 0, true, NOW(), NOW())
ON CONFLICT (item_code) DO NOTHING;

INSERT INTO items (item_code, item_name, category, uom, unit_price, is_active, created_at, updated_at)
VALUES ('REMOTE-DISPLAY-GLASS', 'Remote Display glass', 'RM', 'PCS', 0, true, NOW(), NOW())
ON CONFLICT (item_code) DO NOTHING;

INSERT INTO items (item_code, item_name, category, uom, unit_price, is_active, created_at, updated_at)
VALUES ('EXTRUSION-CLAMPS-40MM', 'Extrusion Clamps 40mm', 'RM', 'PCS', 0, true, NOW(), NOW())
ON CONFLICT (item_code) DO NOTHING;

INSERT INTO items (item_code, item_name, category, uom, unit_price, is_active, created_at, updated_at)
VALUES ('EXTRUSION-CLAMPS30MM', 'Extrusion Clamps30mm', 'RM', 'PCS', 0, true, NOW(), NOW())
ON CONFLICT (item_code) DO NOTHING;

INSERT INTO items (item_code, item_name, category, uom, unit_price, is_active, created_at, updated_at)
VALUES ('EXTRUSION-CLAMPS-20MM', 'Extrusion Clamps 20mm', 'RM', 'PCS', 0, true, NOW(), NOW())
ON CONFLICT (item_code) DO NOTHING;

INSERT INTO items (item_code, item_name, category, uom, unit_price, is_active, created_at, updated_at)
VALUES ('SHEENAIC', 'Sheenaic', 'RM', 'PCS', 0, true, NOW(), NOW())
ON CONFLICT (item_code) DO NOTHING;

INSERT INTO items (item_code, item_name, category, uom, unit_price, is_active, created_at, updated_at)
VALUES ('TURPENTRATE-OIL', 'Turpentrate Oil', 'RM', 'PCS', 0, true, NOW(), NOW())
ON CONFLICT (item_code) DO NOTHING;

INSERT INTO items (item_code, item_name, category, uom, unit_price, is_active, created_at, updated_at)
VALUES ('SPOT-CHECK-SKC', 'Spot Check SKC - 1 (Cleaner/Remover)', 'RM', 'PCS', 0, true, NOW(), NOW())
ON CONFLICT (item_code) DO NOTHING;

INSERT INTO items (item_code, item_name, category, uom, unit_price, is_active, created_at, updated_at)
VALUES ('TEROSON-GUN', 'Teroson Gun', 'RM', 'PCS', 0, true, NOW(), NOW())
ON CONFLICT (item_code) DO NOTHING;

INSERT INTO items (item_code, item_name, category, uom, unit_price, is_active, created_at, updated_at)
VALUES ('M6-THUMBOLTS', 'M6 Thumbolts', 'RM', 'PCS', 0, true, NOW(), NOW())
ON CONFLICT (item_code) DO NOTHING;

INSERT INTO items (item_code, item_name, category, uom, unit_price, is_active, created_at, updated_at)
VALUES ('M4-THUMBOLTS', 'M4 Thumbolts', 'RM', 'PCS', 0, true, NOW(), NOW())
ON CONFLICT (item_code) DO NOTHING;

INSERT INTO items (item_code, item_name, category, uom, unit_price, is_active, created_at, updated_at)
VALUES ('125-MM-HEAT', '125 MM heat Shrinkable Sleeve', 'RM', 'Meter', 0, true, NOW(), NOW())
ON CONFLICT (item_code) DO NOTHING;

INSERT INTO items (item_code, item_name, category, uom, unit_price, is_active, created_at, updated_at)
VALUES ('JET-PLATE-ASSY', 'Jet & Plate Assy (Jet, plate)', 'RM', 'PCS', 0, true, NOW(), NOW())
ON CONFLICT (item_code) DO NOTHING;

INSERT INTO items (item_code, item_name, category, uom, unit_price, is_active, created_at, updated_at)
VALUES ('JET-MOTOR-ASSY', 'Jet Motor Assy (Jet, Plate, mount))', 'RM', 'PCS', 0, true, NOW(), NOW())
ON CONFLICT (item_code) DO NOTHING;

INSERT INTO items (item_code, item_name, category, uom, unit_price, is_active, created_at, updated_at)
VALUES ('JET-MOTOR-ASSY', 'Jet Motor Assy (Jet, plate, mount, heatpipes)', 'RM', 'PCS', 0, true, NOW(), NOW())
ON CONFLICT (item_code) DO NOTHING;

INSERT INTO items (item_code, item_name, category, uom, unit_price, is_active, created_at, updated_at)
VALUES ('POWER-SWITCH-ASSY', 'Power Switch Assy', 'RM', 'PCS', 0, true, NOW(), NOW())
ON CONFLICT (item_code) DO NOTHING;

INSERT INTO items (item_code, item_name, category, uom, unit_price, is_active, created_at, updated_at)
VALUES ('CHARGING-PM-ASSY', 'Charging PM Assy', 'RM', 'PCS', 0, true, NOW(), NOW())
ON CONFLICT (item_code) DO NOTHING;

INSERT INTO items (item_code, item_name, category, uom, unit_price, is_active, created_at, updated_at)
VALUES ('CHARGING-CM-ASSY', 'Charging CM Assy', 'RM', 'PCS', 0, true, NOW(), NOW())
ON CONFLICT (item_code) DO NOTHING;

INSERT INTO items (item_code, item_name, category, uom, unit_price, is_active, created_at, updated_at)
VALUES ('STBD-SIGNAL-PM', 'STBD Signal PM Assy', 'RM', 'PCS', 0, true, NOW(), NOW())
ON CONFLICT (item_code) DO NOTHING;

INSERT INTO items (item_code, item_name, category, uom, unit_price, is_active, created_at, updated_at)
VALUES ('PORT-SIGNAL-PM', 'PORT Signal PM Assy', 'RM', 'PCS', 0, true, NOW(), NOW())
ON CONFLICT (item_code) DO NOTHING;

INSERT INTO items (item_code, item_name, category, uom, unit_price, is_active, created_at, updated_at)
VALUES ('STBD-SIGNAL-CM', 'STBD Signal CM Assy', 'RM', 'PCS', 0, true, NOW(), NOW())
ON CONFLICT (item_code) DO NOTHING;

INSERT INTO items (item_code, item_name, category, uom, unit_price, is_active, created_at, updated_at)
VALUES ('PORT-SIGNAL-CM', 'PORT Signal CM Assy', 'RM', 'PCS', 0, true, NOW(), NOW())
ON CONFLICT (item_code) DO NOTHING;

INSERT INTO items (item_code, item_name, category, uom, unit_price, is_active, created_at, updated_at)
VALUES ('CURRENT-SENSOR-ASSY', 'Current Sensor Assy', 'RM', 'PCS', 0, true, NOW(), NOW())
ON CONFLICT (item_code) DO NOTHING;

INSERT INTO items (item_code, item_name, category, uom, unit_price, is_active, created_at, updated_at)
VALUES ('RPM-SENSOR-ASSY', 'RPM Sensor Assy', 'RM', 'PCS', 0, true, NOW(), NOW())
ON CONFLICT (item_code) DO NOTHING;

INSERT INTO items (item_code, item_name, category, uom, unit_price, is_active, created_at, updated_at)
VALUES ('A21-MOTHERBOARD-ASSY', 'A21 MotherBoard Assy', 'RM', 'PCS', 0, true, NOW(), NOW())
ON CONFLICT (item_code) DO NOTHING;

INSERT INTO items (item_code, item_name, category, uom, unit_price, is_active, created_at, updated_at)
VALUES ('BATTERY-BLOCK-ASSY', 'Battery Block Assy', 'RM', 'PCS', 0, true, NOW(), NOW())
ON CONFLICT (item_code) DO NOTHING;

INSERT INTO items (item_code, item_name, category, uom, unit_price, is_active, created_at, updated_at)
VALUES ('STBDESC-ASSY', 'STBD_ESC Assy', 'RM', 'PCS', 0, true, NOW(), NOW())
ON CONFLICT (item_code) DO NOTHING;

INSERT INTO items (item_code, item_name, category, uom, unit_price, is_active, created_at, updated_at)
VALUES ('PORTESC-ASSY', 'PORT_ESC Assy', 'RM', 'PCS', 0, true, NOW(), NOW())
ON CONFLICT (item_code) DO NOTHING;

INSERT INTO items (item_code, item_name, category, uom, unit_price, is_active, created_at, updated_at)
VALUES ('STBD-BATTERY-ASSY', 'STBD Battery Assy', 'RM', 'PCS', 0, true, NOW(), NOW())
ON CONFLICT (item_code) DO NOTHING;

INSERT INTO items (item_code, item_name, category, uom, unit_price, is_active, created_at, updated_at)
VALUES ('PORT-BATTERY-ASSY', 'PORT Battery Assy', 'RM', 'PCS', 0, true, NOW(), NOW())
ON CONFLICT (item_code) DO NOTHING;

INSERT INTO items (item_code, item_name, category, uom, unit_price, is_active, created_at, updated_at)
VALUES ('CHARGER-BOX-ASSY', 'Charger Box Assy', 'RM', 'PCS', 0, true, NOW(), NOW())
ON CONFLICT (item_code) DO NOTHING;

INSERT INTO items (item_code, item_name, category, uom, unit_price, is_active, created_at, updated_at)
VALUES ('ELECTRONIC-BOX-ASSY', 'Electronic Box Assy', 'RM', 'PCS', 0, true, NOW(), NOW())
ON CONFLICT (item_code) DO NOTHING;

INSERT INTO items (item_code, item_name, category, uom, unit_price, is_active, created_at, updated_at)
VALUES ('FLSTBD-ELEC', 'FL_STBD Elec', 'RM', 'PCS', 0, true, NOW(), NOW())
ON CONFLICT (item_code) DO NOTHING;

INSERT INTO items (item_code, item_name, category, uom, unit_price, is_active, created_at, updated_at)
VALUES ('FLPORT-ELEC', 'FL_PORT Elec', 'RM', 'PCS', 0, true, NOW(), NOW())
ON CONFLICT (item_code) DO NOTHING;

INSERT INTO items (item_code, item_name, category, uom, unit_price, is_active, created_at, updated_at)
VALUES ('FLSTBD-MECH', 'FL_STBD Mech', 'RM', 'PCS', 0, true, NOW(), NOW())
ON CONFLICT (item_code) DO NOTHING;

INSERT INTO items (item_code, item_name, category, uom, unit_price, is_active, created_at, updated_at)
VALUES ('FLPORT-MECH', 'FL_PORT Mech', 'RM', 'PCS', 0, true, NOW(), NOW())
ON CONFLICT (item_code) DO NOTHING;

INSERT INTO items (item_code, item_name, category, uom, unit_price, is_active, created_at, updated_at)
VALUES ('STBD-UNIT-ASSY', 'STBD Unit Assy', 'RM', 'PCS', 0, true, NOW(), NOW())
ON CONFLICT (item_code) DO NOTHING;

INSERT INTO items (item_code, item_name, category, uom, unit_price, is_active, created_at, updated_at)
VALUES ('PORT-UNIT-ASSY', 'PORT Unit Assy', 'RM', 'PCS', 0, true, NOW(), NOW())
ON CONFLICT (item_code) DO NOTHING;

INSERT INTO items (item_code, item_name, category, uom, unit_price, is_active, created_at, updated_at)
VALUES ('SELF-RIGHTENING-ASSY', 'Self Rightening Assy', 'RM', 'PCS', 0, true, NOW(), NOW())
ON CONFLICT (item_code) DO NOTHING;

INSERT INTO items (item_code, item_name, category, uom, unit_price, is_active, created_at, updated_at)
VALUES ('IP-REMOTE-ASSY', 'IP Remote Assy', 'RM', 'PCS', 0, true, NOW(), NOW())
ON CONFLICT (item_code) DO NOTHING;

INSERT INTO items (item_code, item_name, category, uom, unit_price, is_active, created_at, updated_at)
VALUES ('IP-REMOTE-CHARGING', 'IP Remote Charging Cable Assy', 'RM', 'PCS', 0, true, NOW(), NOW())
ON CONFLICT (item_code) DO NOTHING;

INSERT INTO items (item_code, item_name, category, uom, unit_price, is_active, created_at, updated_at)
VALUES ('AMCA-ELEC-ASSY', 'AMCA Elec Assy', 'RM', 'PCS', 0, true, NOW(), NOW())
ON CONFLICT (item_code) DO NOTHING;

INSERT INTO items (item_code, item_name, category, uom, unit_price, is_active, created_at, updated_at)
VALUES ('AMCA-MECH-ASSY', 'AMCA Mech Assy', 'RM', 'PCS', 0, true, NOW(), NOW())
ON CONFLICT (item_code) DO NOTHING;

INSERT INTO items (item_code, item_name, category, uom, unit_price, is_active, created_at, updated_at)
VALUES ('FINAL-CRAFT-ASSY', 'Final Craft Assy', 'RM', 'PCS', 0, true, NOW(), NOW())
ON CONFLICT (item_code) DO NOTHING;

INSERT INTO items (item_code, item_name, category, uom, unit_price, is_active, created_at, updated_at)
VALUES ('BOTTOM-BLOCK-ASSY', 'Bottom Block Assy', 'RM', 'PCS', 0, true, NOW(), NOW())
ON CONFLICT (item_code) DO NOTHING;

INSERT INTO items (item_code, item_name, category, uom, unit_price, is_active, created_at, updated_at)
VALUES ('STBD-AFT-PLATE', 'STBD Aft Plate Assy', 'RM', 'Number', 0, true, NOW(), NOW())
ON CONFLICT (item_code) DO NOTHING;

INSERT INTO items (item_code, item_name, category, uom, unit_price, is_active, created_at, updated_at)
VALUES ('PORT-AFT-PLATE', 'PORT Aft Plate Assy', 'RM', 'Number', 0, true, NOW(), NOW())
ON CONFLICT (item_code) DO NOTHING;

INSERT INTO items (item_code, item_name, category, uom, unit_price, is_active, created_at, updated_at)
VALUES ('156-TFT-LCD', '15.6" TFT LCD, LED B 2000 Nits', 'RM', 'PCS', 0, true, NOW(), NOW())
ON CONFLICT (item_code) DO NOTHING;

INSERT INTO items (item_code, item_name, category, uom, unit_price, is_active, created_at, updated_at)
VALUES ('156-TFT-LCD', '15.6" TFT LCD, LED backlight 1800 nits, FHD (1920x1080)', 'RM', 'PCS', 0, true, NOW(), NOW())
ON CONFLICT (item_code) DO NOTHING;

INSERT INTO items (item_code, item_name, category, uom, unit_price, is_active, created_at, updated_at)
VALUES ('BOX-HANDLES', 'Box handles', 'RM', 'PCS', 0, true, NOW(), NOW())
ON CONFLICT (item_code) DO NOTHING;

INSERT INTO items (item_code, item_name, category, uom, unit_price, is_active, created_at, updated_at)
VALUES ('DUMMY-LOAD-50', 'Dummy Load 50 ohms', 'RM', 'PCS', 0, true, NOW(), NOW())
ON CONFLICT (item_code) DO NOTHING;

INSERT INTO items (item_code, item_name, category, uom, unit_price, is_active, created_at, updated_at)
VALUES ('EYELID-FOR-CRADLE', 'Eyelid for cradle', 'RM', 'PCS', 0, true, NOW(), NOW())
ON CONFLICT (item_code) DO NOTHING;

INSERT INTO items (item_code, item_name, category, uom, unit_price, is_active, created_at, updated_at)
VALUES ('RUBBER-CUFF-SIZE', 'Rubber Cuff (Size 40mm)(1,57")', 'RM', 'PCS', 0, true, NOW(), NOW())
ON CONFLICT (item_code) DO NOTHING;

INSERT INTO items (item_code, item_name, category, uom, unit_price, is_active, created_at, updated_at)
VALUES ('RUBBER-CUFF-SIZE', 'Rubber  Cuff )Size 32mm (1,26")', 'RM', 'PCS', 0, true, NOW(), NOW())
ON CONFLICT (item_code) DO NOTHING;

INSERT INTO items (item_code, item_name, category, uom, unit_price, is_active, created_at, updated_at)
VALUES ('PCB-OF-MURATA', 'PCB of Murata ROHM', 'RM', 'PCS', 0, true, NOW(), NOW())
ON CONFLICT (item_code) DO NOTHING;

INSERT INTO items (item_code, item_name, category, uom, unit_price, is_active, created_at, updated_at)
VALUES ('PCB-OF-XLROHM', 'PCB of XLROHM', 'RM', 'PCS', 0, true, NOW(), NOW())
ON CONFLICT (item_code) DO NOTHING;

INSERT INTO items (item_code, item_name, category, uom, unit_price, is_active, created_at, updated_at)
VALUES ('PAINT-REMOVER', 'Paint remover', 'RM', 'PCS', 0, true, NOW(), NOW())
ON CONFLICT (item_code) DO NOTHING;



-- ============================================================================
-- INSERT SUB-ASSEMBLIES (Category: SA)
-- ============================================================================

INSERT INTO items (item_code, item_name, category, uom, is_active, created_at, updated_at)
VALUES ('JET-MOTOR-ASSY', 'Jet Motor Assy', 'SA', 'Number', true, NOW(), NOW())
ON CONFLICT (item_code) DO NOTHING;

INSERT INTO items (item_code, item_name, category, uom, is_active, created_at, updated_at)
VALUES ('POWER-SWITCH-ASSY', 'Power Switch Assy', 'SA', 'Number', true, NOW(), NOW())
ON CONFLICT (item_code) DO NOTHING;

INSERT INTO items (item_code, item_name, category, uom, is_active, created_at, updated_at)
VALUES ('CHARGING-PM-ASSY', 'Charging PM Assy', 'SA', 'Number', true, NOW(), NOW())
ON CONFLICT (item_code) DO NOTHING;

INSERT INTO items (item_code, item_name, category, uom, is_active, created_at, updated_at)
VALUES ('CHARGING-CM-ASSY', 'Charging CM Assy', 'SA', 'Number', true, NOW(), NOW())
ON CONFLICT (item_code) DO NOTHING;

INSERT INTO items (item_code, item_name, category, uom, is_active, created_at, updated_at)
VALUES ('STBD-SIGNAL-PM', 'STBD Signal PM Assy', 'SA', 'Number', true, NOW(), NOW())
ON CONFLICT (item_code) DO NOTHING;

INSERT INTO items (item_code, item_name, category, uom, is_active, created_at, updated_at)
VALUES ('PORT-SIGNAL-PM', 'PORT Signal PM Assy', 'SA', 'Number', true, NOW(), NOW())
ON CONFLICT (item_code) DO NOTHING;

INSERT INTO items (item_code, item_name, category, uom, is_active, created_at, updated_at)
VALUES ('STBD-SIGNAL-CM', 'STBD Signal CM Assy', 'SA', 'Number', true, NOW(), NOW())
ON CONFLICT (item_code) DO NOTHING;

INSERT INTO items (item_code, item_name, category, uom, is_active, created_at, updated_at)
VALUES ('PORT-SIGNAL-CM', 'PORT Signal CM Assy', 'SA', 'Number', true, NOW(), NOW())
ON CONFLICT (item_code) DO NOTHING;

INSERT INTO items (item_code, item_name, category, uom, is_active, created_at, updated_at)
VALUES ('CURRENT-SENSOR-ASSY', 'Current Sensor Assy', 'SA', 'Number', true, NOW(), NOW())
ON CONFLICT (item_code) DO NOTHING;

INSERT INTO items (item_code, item_name, category, uom, is_active, created_at, updated_at)
VALUES ('RPM-SENSOR-ASSY', 'RPM Sensor Assy', 'SA', 'Number', true, NOW(), NOW())
ON CONFLICT (item_code) DO NOTHING;

INSERT INTO items (item_code, item_name, category, uom, is_active, created_at, updated_at)
VALUES ('A21-MOTHERBOARD-ASSY', 'A21 MotherBoard Assy', 'SA', 'Number', true, NOW(), NOW())
ON CONFLICT (item_code) DO NOTHING;

INSERT INTO items (item_code, item_name, category, uom, is_active, created_at, updated_at)
VALUES ('BATTERY-BLOCK-ASSY', 'Battery Block Assy', 'SA', 'Number', true, NOW(), NOW())
ON CONFLICT (item_code) DO NOTHING;

INSERT INTO items (item_code, item_name, category, uom, is_active, created_at, updated_at)
VALUES ('STBDESC-ASSY', 'STBD_ESC Assy', 'SA', 'Number', true, NOW(), NOW())
ON CONFLICT (item_code) DO NOTHING;

INSERT INTO items (item_code, item_name, category, uom, is_active, created_at, updated_at)
VALUES ('PORTESC-ASSY', 'PORT_ESC Assy', 'SA', 'Number', true, NOW(), NOW())
ON CONFLICT (item_code) DO NOTHING;

INSERT INTO items (item_code, item_name, category, uom, is_active, created_at, updated_at)
VALUES ('STBD-BATTERY-ASSY', 'STBD Battery Assy', 'SA', 'Number', true, NOW(), NOW())
ON CONFLICT (item_code) DO NOTHING;

INSERT INTO items (item_code, item_name, category, uom, is_active, created_at, updated_at)
VALUES ('PORT-BATTERY-ASSY', 'PORT Battery Assy', 'SA', 'Number', true, NOW(), NOW())
ON CONFLICT (item_code) DO NOTHING;

INSERT INTO items (item_code, item_name, category, uom, is_active, created_at, updated_at)
VALUES ('CHARGER-BOX-ASSY', 'Charger Box Assy', 'SA', 'Number', true, NOW(), NOW())
ON CONFLICT (item_code) DO NOTHING;

INSERT INTO items (item_code, item_name, category, uom, is_active, created_at, updated_at)
VALUES ('ELECTRONIC-BOX-ASSY', 'Electronic Box Assy', 'SA', 'Number', true, NOW(), NOW())
ON CONFLICT (item_code) DO NOTHING;

INSERT INTO items (item_code, item_name, category, uom, is_active, created_at, updated_at)
VALUES ('FLSTBD-ELEC', 'FL_STBD Elec', 'SA', 'Number', true, NOW(), NOW())
ON CONFLICT (item_code) DO NOTHING;

INSERT INTO items (item_code, item_name, category, uom, is_active, created_at, updated_at)
VALUES ('FLPORT-ELEC', 'FL_PORT Elec', 'SA', 'Number', true, NOW(), NOW())
ON CONFLICT (item_code) DO NOTHING;

INSERT INTO items (item_code, item_name, category, uom, is_active, created_at, updated_at)
VALUES ('FLSTBD-MECH', 'FL_STBD Mech', 'SA', 'Number', true, NOW(), NOW())
ON CONFLICT (item_code) DO NOTHING;

INSERT INTO items (item_code, item_name, category, uom, is_active, created_at, updated_at)
VALUES ('FLPORT-MECH', 'FL_PORT Mech', 'SA', 'Number', true, NOW(), NOW())
ON CONFLICT (item_code) DO NOTHING;

INSERT INTO items (item_code, item_name, category, uom, is_active, created_at, updated_at)
VALUES ('STBD-UNIT-ASSY', 'STBD Unit Assy', 'SA', 'Number', true, NOW(), NOW())
ON CONFLICT (item_code) DO NOTHING;

INSERT INTO items (item_code, item_name, category, uom, is_active, created_at, updated_at)
VALUES ('PORT-UNIT-ASSY', 'PORT Unit Assy', 'SA', 'Number', true, NOW(), NOW())
ON CONFLICT (item_code) DO NOTHING;

INSERT INTO items (item_code, item_name, category, uom, is_active, created_at, updated_at)
VALUES ('SELF-RIGHTENING-ASSY', 'Self Rightening Assy', 'SA', 'Number', true, NOW(), NOW())
ON CONFLICT (item_code) DO NOTHING;

INSERT INTO items (item_code, item_name, category, uom, is_active, created_at, updated_at)
VALUES ('IP-REMOTE-ASSY', 'IP Remote Assy', 'SA', 'Number', true, NOW(), NOW())
ON CONFLICT (item_code) DO NOTHING;

INSERT INTO items (item_code, item_name, category, uom, is_active, created_at, updated_at)
VALUES ('IP-REMOTE-CHARGING', 'IP Remote Charging Cable Assy', 'SA', 'Number', true, NOW(), NOW())
ON CONFLICT (item_code) DO NOTHING;

INSERT INTO items (item_code, item_name, category, uom, is_active, created_at, updated_at)
VALUES ('AMCA-ELEC-ASSY', 'AMCA Elec Assy', 'SA', 'Number', true, NOW(), NOW())
ON CONFLICT (item_code) DO NOTHING;

INSERT INTO items (item_code, item_name, category, uom, is_active, created_at, updated_at)
VALUES ('AMCA-MECH-ASSY', 'AMCA Mech Assy', 'SA', 'Number', true, NOW(), NOW())
ON CONFLICT (item_code) DO NOTHING;

INSERT INTO items (item_code, item_name, category, uom, is_active, created_at, updated_at)
VALUES ('FINAL-CRAFT-ASSY', 'Final Craft Assy', 'SA', 'Number', true, NOW(), NOW())
ON CONFLICT (item_code) DO NOTHING;

INSERT INTO items (item_code, item_name, category, uom, is_active, created_at, updated_at)
VALUES ('BOTTOM-BLOCK-ASSY', 'Bottom Block Assy', 'SA', 'Number', true, NOW(), NOW())
ON CONFLICT (item_code) DO NOTHING;

INSERT INTO items (item_code, item_name, category, uom, is_active, created_at, updated_at)
VALUES ('STBD-AFT-PLATE', 'STBD Aft Plate Assy', 'SA', 'Number', true, NOW(), NOW())
ON CONFLICT (item_code) DO NOTHING;

INSERT INTO items (item_code, item_name, category, uom, is_active, created_at, updated_at)
VALUES ('PORT-AFT-PLATE', 'PORT Aft Plate Assy', 'SA', 'Number', true, NOW(), NOW())
ON CONFLICT (item_code) DO NOTHING;

INSERT INTO items (item_code, item_name, category, uom, is_active, created_at, updated_at)
VALUES ('R9MX-ADAPTER', 'R9MX Adapter', 'SA', 'Number', true, NOW(), NOW())
ON CONFLICT (item_code) DO NOTHING;

INSERT INTO items (item_code, item_name, category, uom, is_active, created_at, updated_at)
VALUES ('FINAL-PACKING', 'Final Packing', 'SA', 'Number', true, NOW(), NOW())
ON CONFLICT (item_code) DO NOTHING;



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
WHERE i.item_code = 'QX7-TRANSMITTER-WITH'
  AND v.vendor_code = 'ROBU'
LIMIT 1
ON CONFLICT (item_id, vendor_id) DO UPDATE SET
    priority = EXCLUDED.priority,
    unit_price = EXCLUDED.unit_price,
    updated_at = NOW();

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
WHERE i.item_code = 'QX7-TRANSMITTER-WITH'
  AND v.vendor_code = 'VYOM'
LIMIT 1
ON CONFLICT (item_id, vendor_id) DO UPDATE SET
    priority = EXCLUDED.priority,
    unit_price = EXCLUDED.unit_price,
    updated_at = NOW();

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
WHERE i.item_code = 'RECEIVER-MODULE-R9MMR9MXR9'
  AND v.vendor_code = 'ROBU'
LIMIT 1
ON CONFLICT (item_id, vendor_id) DO UPDATE SET
    priority = EXCLUDED.priority,
    unit_price = EXCLUDED.unit_price,
    updated_at = NOW();

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
WHERE i.item_code = 'RECEIVER-MODULE-R9MMR9MXR9'
  AND v.vendor_code = 'VYOM'
LIMIT 1
ON CONFLICT (item_id, vendor_id) DO UPDATE SET
    priority = EXCLUDED.priority,
    unit_price = EXCLUDED.unit_price,
    updated_at = NOW();

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
WHERE i.item_code = 'FREE-WHEEL-DIODE'
  AND v.vendor_code = 'ROBU'
LIMIT 1
ON CONFLICT (item_id, vendor_id) DO UPDATE SET
    priority = EXCLUDED.priority,
    unit_price = EXCLUDED.unit_price,
    updated_at = NOW();

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
WHERE i.item_code = 'AMS1117-50V'
  AND v.vendor_code = 'ROBU'
LIMIT 1
ON CONFLICT (item_id, vendor_id) DO UPDATE SET
    priority = EXCLUDED.priority,
    unit_price = EXCLUDED.unit_price,
    updated_at = NOW();

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
WHERE i.item_code = 'AMS1117-33V'
  AND v.vendor_code = 'ROBU'
LIMIT 1
ON CONFLICT (item_id, vendor_id) DO UPDATE SET
    priority = EXCLUDED.priority,
    unit_price = EXCLUDED.unit_price,
    updated_at = NOW();

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
WHERE i.item_code = 'NEO6M-GPSL80-GPS'
  AND v.vendor_code = 'ROLAND'
LIMIT 1
ON CONFLICT (item_id, vendor_id) DO UPDATE SET
    priority = EXCLUDED.priority,
    unit_price = EXCLUDED.unit_price,
    updated_at = NOW();

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
WHERE i.item_code = '55MM-FEMALE-BULLET'
  AND v.vendor_code = 'HOBBYWING'
LIMIT 1
ON CONFLICT (item_id, vendor_id) DO UPDATE SET
    priority = EXCLUDED.priority,
    unit_price = EXCLUDED.unit_price,
    updated_at = NOW();

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
WHERE i.item_code = '4MM-MALE-BULLET'
  AND v.vendor_code = 'ROBU'
LIMIT 1
ON CONFLICT (item_id, vendor_id) DO UPDATE SET
    priority = EXCLUDED.priority,
    unit_price = EXCLUDED.unit_price,
    updated_at = NOW();

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
WHERE i.item_code = '4MM-FEMALE-BULLET'
  AND v.vendor_code = 'ROBU'
LIMIT 1
ON CONFLICT (item_id, vendor_id) DO UPDATE SET
    priority = EXCLUDED.priority,
    unit_price = EXCLUDED.unit_price,
    updated_at = NOW();

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
WHERE i.item_code = '2MM-MALE-BULLET'
  AND v.vendor_code = 'ROBU'
LIMIT 1
ON CONFLICT (item_id, vendor_id) DO UPDATE SET
    priority = EXCLUDED.priority,
    unit_price = EXCLUDED.unit_price,
    updated_at = NOW();

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
WHERE i.item_code = '2MM-FEMALE-BULLET'
  AND v.vendor_code = 'ROBU'
LIMIT 1
ON CONFLICT (item_id, vendor_id) DO UPDATE SET
    priority = EXCLUDED.priority,
    unit_price = EXCLUDED.unit_price,
    updated_at = NOW();

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
WHERE i.item_code = '6MM-MALE-BULLET'
  AND v.vendor_code = 'ROBU'
LIMIT 1
ON CONFLICT (item_id, vendor_id) DO UPDATE SET
    priority = EXCLUDED.priority,
    unit_price = EXCLUDED.unit_price,
    updated_at = NOW();

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
WHERE i.item_code = '6MM-FEMALE-BULLET'
  AND v.vendor_code = 'ROBU'
LIMIT 1
ON CONFLICT (item_id, vendor_id) DO UPDATE SET
    priority = EXCLUDED.priority,
    unit_price = EXCLUDED.unit_price,
    updated_at = NOW();

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
WHERE i.item_code = '8MM-MALE-BULLET'
  AND v.vendor_code = 'ROBU'
LIMIT 1
ON CONFLICT (item_id, vendor_id) DO UPDATE SET
    priority = EXCLUDED.priority,
    unit_price = EXCLUDED.unit_price,
    updated_at = NOW();

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
WHERE i.item_code = '8MM-FEMALE-BULLET'
  AND v.vendor_code = 'ROBU'
LIMIT 1
ON CONFLICT (item_id, vendor_id) DO UPDATE SET
    priority = EXCLUDED.priority,
    unit_price = EXCLUDED.unit_price,
    updated_at = NOW();

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
WHERE i.item_code = 'ULTRA-FLEXIBLE-BLACK'
  AND v.vendor_code = 'ROBU'
LIMIT 1
ON CONFLICT (item_id, vendor_id) DO UPDATE SET
    priority = EXCLUDED.priority,
    unit_price = EXCLUDED.unit_price,
    updated_at = NOW();

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
WHERE i.item_code = 'ULTRA-FLEXIBLE-RED'
  AND v.vendor_code = 'ROBU'
LIMIT 1
ON CONFLICT (item_id, vendor_id) DO UPDATE SET
    priority = EXCLUDED.priority,
    unit_price = EXCLUDED.unit_price,
    updated_at = NOW();

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
WHERE i.item_code = 'ULTRA-FLEXIBLE-BLACK'
  AND v.vendor_code = 'ROBU'
LIMIT 1
ON CONFLICT (item_id, vendor_id) DO UPDATE SET
    priority = EXCLUDED.priority,
    unit_price = EXCLUDED.unit_price,
    updated_at = NOW();

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
WHERE i.item_code = 'ULTRA-FLEXIBLE-RED'
  AND v.vendor_code = 'ROBU'
LIMIT 1
ON CONFLICT (item_id, vendor_id) DO UPDATE SET
    priority = EXCLUDED.priority,
    unit_price = EXCLUDED.unit_price,
    updated_at = NOW();

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
WHERE i.item_code = 'ULTRA-FLEXIBLE-BLACK'
  AND v.vendor_code = 'ROBU'
LIMIT 1
ON CONFLICT (item_id, vendor_id) DO UPDATE SET
    priority = EXCLUDED.priority,
    unit_price = EXCLUDED.unit_price,
    updated_at = NOW();

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
WHERE i.item_code = 'ULTRA-FLEXIBLE-RED'
  AND v.vendor_code = 'ROBU'
LIMIT 1
ON CONFLICT (item_id, vendor_id) DO UPDATE SET
    priority = EXCLUDED.priority,
    unit_price = EXCLUDED.unit_price,
    updated_at = NOW();

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
WHERE i.item_code = 'ULTRA-FLEXIBLE-BLACK'
  AND v.vendor_code = 'ROBU'
LIMIT 1
ON CONFLICT (item_id, vendor_id) DO UPDATE SET
    priority = EXCLUDED.priority,
    unit_price = EXCLUDED.unit_price,
    updated_at = NOW();

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
WHERE i.item_code = 'ULTRA-FLEXIBLE-RED'
  AND v.vendor_code = 'ROBU'
LIMIT 1
ON CONFLICT (item_id, vendor_id) DO UPDATE SET
    priority = EXCLUDED.priority,
    unit_price = EXCLUDED.unit_price,
    updated_at = NOW();

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
WHERE i.item_code = 'ULTRA-FLEXIBLE-BLUE'
  AND v.vendor_code = 'ROBU'
LIMIT 1
ON CONFLICT (item_id, vendor_id) DO UPDATE SET
    priority = EXCLUDED.priority,
    unit_price = EXCLUDED.unit_price,
    updated_at = NOW();

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
WHERE i.item_code = 'WATER-FLOW-SENSOR'
  AND v.vendor_code = 'ROLAND'
LIMIT 1
ON CONFLICT (item_id, vendor_id) DO UPDATE SET
    priority = EXCLUDED.priority,
    unit_price = EXCLUDED.unit_price,
    updated_at = NOW();

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
WHERE i.item_code = 'WATER-PUMP-550'
  AND v.vendor_code = 'ROBU'
LIMIT 1
ON CONFLICT (item_id, vendor_id) DO UPDATE SET
    priority = EXCLUDED.priority,
    unit_price = EXCLUDED.unit_price,
    updated_at = NOW();

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
WHERE i.item_code = '1S-LIPO-INDICATOR'
  AND v.vendor_code = 'ROBU'
LIMIT 1
ON CONFLICT (item_id, vendor_id) DO UPDATE SET
    priority = EXCLUDED.priority,
    unit_price = EXCLUDED.unit_price,
    updated_at = NOW();

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
WHERE i.item_code = '2S-LIPO-INDICATOR'
  AND v.vendor_code = 'ROBU'
LIMIT 1
ON CONFLICT (item_id, vendor_id) DO UPDATE SET
    priority = EXCLUDED.priority,
    unit_price = EXCLUDED.unit_price,
    updated_at = NOW();

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
WHERE i.item_code = 'LIPO-INDICATOR-CASINGS'
  AND v.vendor_code = 'ROBU'
LIMIT 1
ON CONFLICT (item_id, vendor_id) DO UPDATE SET
    priority = EXCLUDED.priority,
    unit_price = EXCLUDED.unit_price,
    updated_at = NOW();

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
WHERE i.item_code = 'BUCK-CONVERTER-XL7015'
  AND v.vendor_code = 'ROBU'
LIMIT 1
ON CONFLICT (item_id, vendor_id) DO UPDATE SET
    priority = EXCLUDED.priority,
    unit_price = EXCLUDED.unit_price,
    updated_at = NOW();

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
WHERE i.item_code = 'LM2596-IN-AMCA'
  AND v.vendor_code = 'ROBU'
LIMIT 1
ON CONFLICT (item_id, vendor_id) DO UPDATE SET
    priority = EXCLUDED.priority,
    unit_price = EXCLUDED.unit_price,
    updated_at = NOW();

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
WHERE i.item_code = 'XL4015XL4005-5A-BUCK'
  AND v.vendor_code = 'ROBU'
LIMIT 1
ON CONFLICT (item_id, vendor_id) DO UPDATE SET
    priority = EXCLUDED.priority,
    unit_price = EXCLUDED.unit_price,
    updated_at = NOW();

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
WHERE i.item_code = 'XT90-FEMALE-HOUSING'
  AND v.vendor_code = 'ROBU'
LIMIT 1
ON CONFLICT (item_id, vendor_id) DO UPDATE SET
    priority = EXCLUDED.priority,
    unit_price = EXCLUDED.unit_price,
    updated_at = NOW();

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
WHERE i.item_code = '24V-ACDC-MODULE'
  AND v.vendor_code = 'ROBU'
LIMIT 1
ON CONFLICT (item_id, vendor_id) DO UPDATE SET
    priority = EXCLUDED.priority,
    unit_price = EXCLUDED.unit_price,
    updated_at = NOW();

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
WHERE i.item_code = 'MOMENTARY-SWITCH-JCB'
  AND v.vendor_code = 'RRINNOVATIONS'
LIMIT 1
ON CONFLICT (item_id, vendor_id) DO UPDATE SET
    priority = EXCLUDED.priority,
    unit_price = EXCLUDED.unit_price,
    updated_at = NOW();

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
WHERE i.item_code = 'LATCHING-POWER-SWITCH'
  AND v.vendor_code = 'RRINNOVATIONS'
LIMIT 1
ON CONFLICT (item_id, vendor_id) DO UPDATE SET
    priority = EXCLUDED.priority,
    unit_price = EXCLUDED.unit_price,
    updated_at = NOW();

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
WHERE i.item_code = 'PWB-FOR-IFU'
  AND v.vendor_code = 'JLC'
LIMIT 1
ON CONFLICT (item_id, vendor_id) DO UPDATE SET
    priority = EXCLUDED.priority,
    unit_price = EXCLUDED.unit_price,
    updated_at = NOW();

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
WHERE i.item_code = 'PWB-FOR-JCB'
  AND v.vendor_code = 'JLC'
LIMIT 1
ON CONFLICT (item_id, vendor_id) DO UPDATE SET
    priority = EXCLUDED.priority,
    unit_price = EXCLUDED.unit_price,
    updated_at = NOW();

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
WHERE i.item_code = 'PWB-OF-STBD'
  AND v.vendor_code = 'JLC'
LIMIT 1
ON CONFLICT (item_id, vendor_id) DO UPDATE SET
    priority = EXCLUDED.priority,
    unit_price = EXCLUDED.unit_price,
    updated_at = NOW();

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
WHERE i.item_code = 'PWB-OF-PORT'
  AND v.vendor_code = 'JLC'
LIMIT 1
ON CONFLICT (item_id, vendor_id) DO UPDATE SET
    priority = EXCLUDED.priority,
    unit_price = EXCLUDED.unit_price,
    updated_at = NOW();

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
WHERE i.item_code = 'PWB-OF-A4'
  AND v.vendor_code = 'JLC'
LIMIT 1
ON CONFLICT (item_id, vendor_id) DO UPDATE SET
    priority = EXCLUDED.priority,
    unit_price = EXCLUDED.unit_price,
    updated_at = NOW();

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
WHERE i.item_code = 'PWB-OF-CURRENT'
  AND v.vendor_code = 'JLC'
LIMIT 1
ON CONFLICT (item_id, vendor_id) DO UPDATE SET
    priority = EXCLUDED.priority,
    unit_price = EXCLUDED.unit_price,
    updated_at = NOW();

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
WHERE i.item_code = 'PWB-OF-BUTTON'
  AND v.vendor_code = 'JLC'
LIMIT 1
ON CONFLICT (item_id, vendor_id) DO UPDATE SET
    priority = EXCLUDED.priority,
    unit_price = EXCLUDED.unit_price,
    updated_at = NOW();

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
WHERE i.item_code = 'PWB-FOR-PC'
  AND v.vendor_code = 'JLC'
LIMIT 1
ON CONFLICT (item_id, vendor_id) DO UPDATE SET
    priority = EXCLUDED.priority,
    unit_price = EXCLUDED.unit_price,
    updated_at = NOW();

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
WHERE i.item_code = 'PWB-FOR-BATHEMETRY'
  AND v.vendor_code = 'JLC'
LIMIT 1
ON CONFLICT (item_id, vendor_id) DO UPDATE SET
    priority = EXCLUDED.priority,
    unit_price = EXCLUDED.unit_price,
    updated_at = NOW();

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
WHERE i.item_code = 'WCS1700-CURRENT-SENSOR'
  AND v.vendor_code = 'NSKELECTRONICS'
LIMIT 1
ON CONFLICT (item_id, vendor_id) DO UPDATE SET
    priority = EXCLUDED.priority,
    unit_price = EXCLUDED.unit_price,
    updated_at = NOW();

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
WHERE i.item_code = '6X3-BATTERY-BLOCKS'
  AND v.vendor_code = 'AMPOWERINDIA'
LIMIT 1
ON CONFLICT (item_id, vendor_id) DO UPDATE SET
    priority = EXCLUDED.priority,
    unit_price = EXCLUDED.unit_price,
    updated_at = NOW();

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
WHERE i.item_code = '18650-CELLS-LIION'
  AND v.vendor_code = 'AMPOWERINDIA'
LIMIT 1
ON CONFLICT (item_id, vendor_id) DO UPDATE SET
    priority = EXCLUDED.priority,
    unit_price = EXCLUDED.unit_price,
    updated_at = NOW();

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
WHERE i.item_code = '18650-CELL-HOLDER'
  AND v.vendor_code = 'ROBU'
LIMIT 1
ON CONFLICT (item_id, vendor_id) DO UPDATE SET
    priority = EXCLUDED.priority,
    unit_price = EXCLUDED.unit_price,
    updated_at = NOW();

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
WHERE i.item_code = 'USB-DATA-CHARGING'
  AND v.vendor_code = 'ROLAND'
LIMIT 1
ON CONFLICT (item_id, vendor_id) DO UPDATE SET
    priority = EXCLUDED.priority,
    unit_price = EXCLUDED.unit_price,
    updated_at = NOW();

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
WHERE i.item_code = 'DC-JACK-PANEL'
  AND v.vendor_code = 'ROLAND'
LIMIT 1
ON CONFLICT (item_id, vendor_id) DO UPDATE SET
    priority = EXCLUDED.priority,
    unit_price = EXCLUDED.unit_price,
    updated_at = NOW();

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
WHERE i.item_code = 'LEAD-PASTE'
  AND v.vendor_code = 'ROLAND'
LIMIT 1
ON CONFLICT (item_id, vendor_id) DO UPDATE SET
    priority = EXCLUDED.priority,
    unit_price = EXCLUDED.unit_price,
    updated_at = NOW();

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
WHERE i.item_code = 'LEAD-WIRE-22AWG'
  AND v.vendor_code = 'ROLAND'
LIMIT 1
ON CONFLICT (item_id, vendor_id) DO UPDATE SET
    priority = EXCLUDED.priority,
    unit_price = EXCLUDED.unit_price,
    updated_at = NOW();

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
WHERE i.item_code = 'HEAT-SINK-PAD'
  AND v.vendor_code = 'SEUTES'
LIMIT 1
ON CONFLICT (item_id, vendor_id) DO UPDATE SET
    priority = EXCLUDED.priority,
    unit_price = EXCLUDED.unit_price,
    updated_at = NOW();

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
WHERE i.item_code = 'LM358DT-SMD'
  AND v.vendor_code = 'SEUTES'
LIMIT 1
ON CONFLICT (item_id, vendor_id) DO UPDATE SET
    priority = EXCLUDED.priority,
    unit_price = EXCLUDED.unit_price,
    updated_at = NOW();

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
WHERE i.item_code = '01UF-0805'
  AND v.vendor_code = 'SEUTES'
LIMIT 1
ON CONFLICT (item_id, vendor_id) DO UPDATE SET
    priority = EXCLUDED.priority,
    unit_price = EXCLUDED.unit_price,
    updated_at = NOW();

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
WHERE i.item_code = '001UF-0805'
  AND v.vendor_code = 'SEUTES'
LIMIT 1
ON CONFLICT (item_id, vendor_id) DO UPDATE SET
    priority = EXCLUDED.priority,
    unit_price = EXCLUDED.unit_price,
    updated_at = NOW();

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
WHERE i.item_code = 'LED-0805-SMD'
  AND v.vendor_code = 'SEUTES'
LIMIT 1
ON CONFLICT (item_id, vendor_id) DO UPDATE SET
    priority = EXCLUDED.priority,
    unit_price = EXCLUDED.unit_price,
    updated_at = NOW();

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
WHERE i.item_code = 'TS5A3157DBVR-SSR-ENCODER'
  AND v.vendor_code = 'SEUTES'
LIMIT 1
ON CONFLICT (item_id, vendor_id) DO UPDATE SET
    priority = EXCLUDED.priority,
    unit_price = EXCLUDED.unit_price,
    updated_at = NOW();

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
WHERE i.item_code = 'TACTILE-SWITCH-FOR'
  AND v.vendor_code = 'SEUTES'
LIMIT 1
ON CONFLICT (item_id, vendor_id) DO UPDATE SET
    priority = EXCLUDED.priority,
    unit_price = EXCLUDED.unit_price,
    updated_at = NOW();

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
WHERE i.item_code = 'LM2596HVSADJ-BUCK-ONLY'
  AND v.vendor_code = 'SEUTES'
LIMIT 1
ON CONFLICT (item_id, vendor_id) DO UPDATE SET
    priority = EXCLUDED.priority,
    unit_price = EXCLUDED.unit_price,
    updated_at = NOW();

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
WHERE i.item_code = 'MP9486AGNZ-100V-BUCK'
  AND v.vendor_code = 'SEUTES'
LIMIT 1
ON CONFLICT (item_id, vendor_id) DO UPDATE SET
    priority = EXCLUDED.priority,
    unit_price = EXCLUDED.unit_price,
    updated_at = NOW();

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
WHERE i.item_code = '12V-FIXED-BUCK'
  AND v.vendor_code = 'SEUTES'
LIMIT 1
ON CONFLICT (item_id, vendor_id) DO UPDATE SET
    priority = EXCLUDED.priority,
    unit_price = EXCLUDED.unit_price,
    updated_at = NOW();

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
WHERE i.item_code = '5V-FIXED-BUCK'
  AND v.vendor_code = 'SEUTES'
LIMIT 1
ON CONFLICT (item_id, vendor_id) DO UPDATE SET
    priority = EXCLUDED.priority,
    unit_price = EXCLUDED.unit_price,
    updated_at = NOW();

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
WHERE i.item_code = '1N4148-SMD'
  AND v.vendor_code = 'SEUTES'
LIMIT 1
ON CONFLICT (item_id, vendor_id) DO UPDATE SET
    priority = EXCLUDED.priority,
    unit_price = EXCLUDED.unit_price,
    updated_at = NOW();

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
WHERE i.item_code = '18PF-0805-CAPACITOR'
  AND v.vendor_code = 'SEUTES'
LIMIT 1
ON CONFLICT (item_id, vendor_id) DO UPDATE SET
    priority = EXCLUDED.priority,
    unit_price = EXCLUDED.unit_price,
    updated_at = NOW();

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
WHERE i.item_code = '10UF-0805-CAPACITOR'
  AND v.vendor_code = 'SEUTES'
LIMIT 1
ON CONFLICT (item_id, vendor_id) DO UPDATE SET
    priority = EXCLUDED.priority,
    unit_price = EXCLUDED.unit_price,
    updated_at = NOW();

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
WHERE i.item_code = '10UF-10V-TANTALUM'
  AND v.vendor_code = 'SEUTES'
LIMIT 1
ON CONFLICT (item_id, vendor_id) DO UPDATE SET
    priority = EXCLUDED.priority,
    unit_price = EXCLUDED.unit_price,
    updated_at = NOW();

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
WHERE i.item_code = '1K-0805-RESISTOR'
  AND v.vendor_code = 'SEUTES'
LIMIT 1
ON CONFLICT (item_id, vendor_id) DO UPDATE SET
    priority = EXCLUDED.priority,
    unit_price = EXCLUDED.unit_price,
    updated_at = NOW();

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
WHERE i.item_code = '10K-0805-RESISTOR'
  AND v.vendor_code = 'SEUTES'
LIMIT 1
ON CONFLICT (item_id, vendor_id) DO UPDATE SET
    priority = EXCLUDED.priority,
    unit_price = EXCLUDED.unit_price,
    updated_at = NOW();

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
WHERE i.item_code = '330E-0805-RESISTOR'
  AND v.vendor_code = 'SEUTES'
LIMIT 1
ON CONFLICT (item_id, vendor_id) DO UPDATE SET
    priority = EXCLUDED.priority,
    unit_price = EXCLUDED.unit_price,
    updated_at = NOW();

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
WHERE i.item_code = 'MURATA-12V-45A'
  AND v.vendor_code = 'SEUTES'
LIMIT 1
ON CONFLICT (item_id, vendor_id) DO UPDATE SET
    priority = EXCLUDED.priority,
    unit_price = EXCLUDED.unit_price,
    updated_at = NOW();

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
WHERE i.item_code = 'MURATA-5V-10A'
  AND v.vendor_code = 'SEUTES'
LIMIT 1
ON CONFLICT (item_id, vendor_id) DO UPDATE SET
    priority = EXCLUDED.priority,
    unit_price = EXCLUDED.unit_price,
    updated_at = NOW();

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
WHERE i.item_code = 'FUSE-500MA'
  AND v.vendor_code = 'SEUTES'
LIMIT 1
ON CONFLICT (item_id, vendor_id) DO UPDATE SET
    priority = EXCLUDED.priority,
    unit_price = EXCLUDED.unit_price,
    updated_at = NOW();

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
WHERE i.item_code = 'MCP3208'
  AND v.vendor_code = 'SEUTES'
LIMIT 1
ON CONFLICT (item_id, vendor_id) DO UPDATE SET
    priority = EXCLUDED.priority,
    unit_price = EXCLUDED.unit_price,
    updated_at = NOW();

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
WHERE i.item_code = '23A-24V-POWER'
  AND v.vendor_code = 'SEUTES'
LIMIT 1
ON CONFLICT (item_id, vendor_id) DO UPDATE SET
    priority = EXCLUDED.priority,
    unit_price = EXCLUDED.unit_price,
    updated_at = NOW();

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
WHERE i.item_code = 'LM61-TEMPERATURE-SENSOR'
  AND v.vendor_code = 'SEUTES'
LIMIT 1
ON CONFLICT (item_id, vendor_id) DO UPDATE SET
    priority = EXCLUDED.priority,
    unit_price = EXCLUDED.unit_price,
    updated_at = NOW();

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
WHERE i.item_code = '47K-0805'
  AND v.vendor_code = 'SEUTES'
LIMIT 1
ON CONFLICT (item_id, vendor_id) DO UPDATE SET
    priority = EXCLUDED.priority,
    unit_price = EXCLUDED.unit_price,
    updated_at = NOW();

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
WHERE i.item_code = '470K-0805-PANASONICBOURNSMURATA'
  AND v.vendor_code = 'SEUTES'
LIMIT 1
ON CONFLICT (item_id, vendor_id) DO UPDATE SET
    priority = EXCLUDED.priority,
    unit_price = EXCLUDED.unit_price,
    updated_at = NOW();

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
WHERE i.item_code = '20K-0805-PANASONICBOURNSMURATA'
  AND v.vendor_code = 'SEUTES'
LIMIT 1
ON CONFLICT (item_id, vendor_id) DO UPDATE SET
    priority = EXCLUDED.priority,
    unit_price = EXCLUDED.unit_price,
    updated_at = NOW();

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
WHERE i.item_code = '1UF-0805-PANASONIC'
  AND v.vendor_code = 'SEUTES'
LIMIT 1
ON CONFLICT (item_id, vendor_id) DO UPDATE SET
    priority = EXCLUDED.priority,
    unit_price = EXCLUDED.unit_price,
    updated_at = NOW();

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
WHERE i.item_code = '16MHZ-CRYSTAL-OSCILLATOR'
  AND v.vendor_code = 'SEUTES'
LIMIT 1
ON CONFLICT (item_id, vendor_id) DO UPDATE SET
    priority = EXCLUDED.priority,
    unit_price = EXCLUDED.unit_price,
    updated_at = NOW();

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
WHERE i.item_code = 'ULN2004-SMD'
  AND v.vendor_code = 'SEUTES'
LIMIT 1
ON CONFLICT (item_id, vendor_id) DO UPDATE SET
    priority = EXCLUDED.priority,
    unit_price = EXCLUDED.unit_price,
    updated_at = NOW();

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
WHERE i.item_code = 'SSR-AQW282SX'
  AND v.vendor_code = 'SEUTES'
LIMIT 1
ON CONFLICT (item_id, vendor_id) DO UPDATE SET
    priority = EXCLUDED.priority,
    unit_price = EXCLUDED.unit_price,
    updated_at = NOW();

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
WHERE i.item_code = 'ATMEGA328P-CONTROLLER'
  AND v.vendor_code = 'SEUTES'
LIMIT 1
ON CONFLICT (item_id, vendor_id) DO UPDATE SET
    priority = EXCLUDED.priority,
    unit_price = EXCLUDED.unit_price,
    updated_at = NOW();

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
WHERE i.item_code = 'POWER-RELAY-120A'
  AND v.vendor_code = 'SEUTES'
LIMIT 1
ON CONFLICT (item_id, vendor_id) DO UPDATE SET
    priority = EXCLUDED.priority,
    unit_price = EXCLUDED.unit_price,
    updated_at = NOW();

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
WHERE i.item_code = 'POWER-RELAY-90A'
  AND v.vendor_code = 'SEUTES'
LIMIT 1
ON CONFLICT (item_id, vendor_id) DO UPDATE SET
    priority = EXCLUDED.priority,
    unit_price = EXCLUDED.unit_price,
    updated_at = NOW();

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
WHERE i.item_code = 'SPST-RELAY-5A12V'
  AND v.vendor_code = 'ROLAND'
LIMIT 1
ON CONFLICT (item_id, vendor_id) DO UPDATE SET
    priority = EXCLUDED.priority,
    unit_price = EXCLUDED.unit_price,
    updated_at = NOW();

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
WHERE i.item_code = 'BALANCING-1A-DPDT'
  AND v.vendor_code = 'ROLAND'
LIMIT 1
ON CONFLICT (item_id, vendor_id) DO UPDATE SET
    priority = EXCLUDED.priority,
    unit_price = EXCLUDED.unit_price,
    updated_at = NOW();

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
WHERE i.item_code = 'BALANCING-RELAY-5A2A'
  AND v.vendor_code = 'ROLAND'
LIMIT 1
ON CONFLICT (item_id, vendor_id) DO UPDATE SET
    priority = EXCLUDED.priority,
    unit_price = EXCLUDED.unit_price,
    updated_at = NOW();

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
WHERE i.item_code = '5V-2A-USB'
  AND v.vendor_code = 'ROLAND'
LIMIT 1
ON CONFLICT (item_id, vendor_id) DO UPDATE SET
    priority = EXCLUDED.priority,
    unit_price = EXCLUDED.unit_price,
    updated_at = NOW();

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
WHERE i.item_code = '5V-3A-POWER'
  AND v.vendor_code = 'ROBU'
LIMIT 1
ON CONFLICT (item_id, vendor_id) DO UPDATE SET
    priority = EXCLUDED.priority,
    unit_price = EXCLUDED.unit_price,
    updated_at = NOW();

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
WHERE i.item_code = '5V-3A-POWER'
  AND v.vendor_code = 'ROBU'
LIMIT 1
ON CONFLICT (item_id, vendor_id) DO UPDATE SET
    priority = EXCLUDED.priority,
    unit_price = EXCLUDED.unit_price,
    updated_at = NOW();

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
WHERE i.item_code = '9V-2A-POWER'
  AND v.vendor_code = 'ROBU'
LIMIT 1
ON CONFLICT (item_id, vendor_id) DO UPDATE SET
    priority = EXCLUDED.priority,
    unit_price = EXCLUDED.unit_price,
    updated_at = NOW();

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
WHERE i.item_code = '32GB-SD-CARD'
  AND v.vendor_code = 'ROLAND'
LIMIT 1
ON CONFLICT (item_id, vendor_id) DO UPDATE SET
    priority = EXCLUDED.priority,
    unit_price = EXCLUDED.unit_price,
    updated_at = NOW();

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
WHERE i.item_code = '16PIN-IC-BASE'
  AND v.vendor_code = 'ROLAND'
LIMIT 1
ON CONFLICT (item_id, vendor_id) DO UPDATE SET
    priority = EXCLUDED.priority,
    unit_price = EXCLUDED.unit_price,
    updated_at = NOW();

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
WHERE i.item_code = 'BLUETOOTH-MODULE'
  AND v.vendor_code = 'ROLAND'
LIMIT 1
ON CONFLICT (item_id, vendor_id) DO UPDATE SET
    priority = EXCLUDED.priority,
    unit_price = EXCLUDED.unit_price,
    updated_at = NOW();

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
WHERE i.item_code = '24AWG-SOLDERING-WIRE'
  AND v.vendor_code = 'ROLAND'
LIMIT 1
ON CONFLICT (item_id, vendor_id) DO UPDATE SET
    priority = EXCLUDED.priority,
    unit_price = EXCLUDED.unit_price,
    updated_at = NOW();

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
WHERE i.item_code = '12E-2W-RESISTOR'
  AND v.vendor_code = 'ROLAND'
LIMIT 1
ON CONFLICT (item_id, vendor_id) DO UPDATE SET
    priority = EXCLUDED.priority,
    unit_price = EXCLUDED.unit_price,
    updated_at = NOW();

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
WHERE i.item_code = 'IMAX-B3-CHARGER'
  AND v.vendor_code = 'ROBU'
LIMIT 1
ON CONFLICT (item_id, vendor_id) DO UPDATE SET
    priority = EXCLUDED.priority,
    unit_price = EXCLUDED.unit_price,
    updated_at = NOW();

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
WHERE i.item_code = '9V-PIEZO-ELECTRIC'
  AND v.vendor_code = 'ROLAND'
LIMIT 1
ON CONFLICT (item_id, vendor_id) DO UPDATE SET
    priority = EXCLUDED.priority,
    unit_price = EXCLUDED.unit_price,
    updated_at = NOW();

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
WHERE i.item_code = 'FEMALE-BERGSTRIP-40X1'
  AND v.vendor_code = 'ROLAND'
LIMIT 1
ON CONFLICT (item_id, vendor_id) DO UPDATE SET
    priority = EXCLUDED.priority,
    unit_price = EXCLUDED.unit_price,
    updated_at = NOW();

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
WHERE i.item_code = 'MALE-BERGSTRIP-40X1'
  AND v.vendor_code = 'ROLAND'
LIMIT 1
ON CONFLICT (item_id, vendor_id) DO UPDATE SET
    priority = EXCLUDED.priority,
    unit_price = EXCLUDED.unit_price,
    updated_at = NOW();

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
WHERE i.item_code = 'FEMALE-BERGSTRIP-40X1'
  AND v.vendor_code = 'ROLAND'
LIMIT 1
ON CONFLICT (item_id, vendor_id) DO UPDATE SET
    priority = EXCLUDED.priority,
    unit_price = EXCLUDED.unit_price,
    updated_at = NOW();

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
WHERE i.item_code = 'MALE-BERGSTRIP-40X1'
  AND v.vendor_code = 'ROLAND'
LIMIT 1
ON CONFLICT (item_id, vendor_id) DO UPDATE SET
    priority = EXCLUDED.priority,
    unit_price = EXCLUDED.unit_price,
    updated_at = NOW();

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
WHERE i.item_code = 'CONFORMAL-COATING'
  AND v.vendor_code = 'ROLAND'
LIMIT 1
ON CONFLICT (item_id, vendor_id) DO UPDATE SET
    priority = EXCLUDED.priority,
    unit_price = EXCLUDED.unit_price,
    updated_at = NOW();

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
WHERE i.item_code = 'SOLDERING-FLUX-SMALL'
  AND v.vendor_code = 'ROLAND'
LIMIT 1
ON CONFLICT (item_id, vendor_id) DO UPDATE SET
    priority = EXCLUDED.priority,
    unit_price = EXCLUDED.unit_price,
    updated_at = NOW();

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
WHERE i.item_code = '3-PIN-3'
  AND v.vendor_code = 'ROLAND'
LIMIT 1
ON CONFLICT (item_id, vendor_id) DO UPDATE SET
    priority = EXCLUDED.priority,
    unit_price = EXCLUDED.unit_price,
    updated_at = NOW();

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
WHERE i.item_code = '2-PIN-JSTXH'
  AND v.vendor_code = 'CANNERCONNECTORS'
LIMIT 1
ON CONFLICT (item_id, vendor_id) DO UPDATE SET
    priority = EXCLUDED.priority,
    unit_price = EXCLUDED.unit_price,
    updated_at = NOW();

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
WHERE i.item_code = '3-PIN-JSTXH'
  AND v.vendor_code = 'CANNERCONNECTORS'
LIMIT 1
ON CONFLICT (item_id, vendor_id) DO UPDATE SET
    priority = EXCLUDED.priority,
    unit_price = EXCLUDED.unit_price,
    updated_at = NOW();

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
WHERE i.item_code = '13-PIN-JSTXH'
  AND v.vendor_code = 'CANNERCONNECTORS'
LIMIT 1
ON CONFLICT (item_id, vendor_id) DO UPDATE SET
    priority = EXCLUDED.priority,
    unit_price = EXCLUDED.unit_price,
    updated_at = NOW();

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
WHERE i.item_code = '15-PIN-JSTXH'
  AND v.vendor_code = 'CANNERCONNECTORS'
LIMIT 1
ON CONFLICT (item_id, vendor_id) DO UPDATE SET
    priority = EXCLUDED.priority,
    unit_price = EXCLUDED.unit_price,
    updated_at = NOW();

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
WHERE i.item_code = '2-PIN-JSTXH'
  AND v.vendor_code = 'CANNERCONNECTORS'
LIMIT 1
ON CONFLICT (item_id, vendor_id) DO UPDATE SET
    priority = EXCLUDED.priority,
    unit_price = EXCLUDED.unit_price,
    updated_at = NOW();

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
WHERE i.item_code = '2-PIN-JSTXH'
  AND v.vendor_code = 'CANNERCONNECTORS'
LIMIT 1
ON CONFLICT (item_id, vendor_id) DO UPDATE SET
    priority = EXCLUDED.priority,
    unit_price = EXCLUDED.unit_price,
    updated_at = NOW();

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
WHERE i.item_code = '2-PIN-JSTXH'
  AND v.vendor_code = 'CANNERCONNECTORS'
LIMIT 1
ON CONFLICT (item_id, vendor_id) DO UPDATE SET
    priority = EXCLUDED.priority,
    unit_price = EXCLUDED.unit_price,
    updated_at = NOW();

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
WHERE i.item_code = '3-PIN-JSTXH'
  AND v.vendor_code = 'CANNERCONNECTORS'
LIMIT 1
ON CONFLICT (item_id, vendor_id) DO UPDATE SET
    priority = EXCLUDED.priority,
    unit_price = EXCLUDED.unit_price,
    updated_at = NOW();

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
WHERE i.item_code = '4-PIN-JSTXH'
  AND v.vendor_code = 'CANNERCONNECTORS'
LIMIT 1
ON CONFLICT (item_id, vendor_id) DO UPDATE SET
    priority = EXCLUDED.priority,
    unit_price = EXCLUDED.unit_price,
    updated_at = NOW();

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
WHERE i.item_code = '4-PIN-JSTXH'
  AND v.vendor_code = 'CANNERCONNECTORS'
LIMIT 1
ON CONFLICT (item_id, vendor_id) DO UPDATE SET
    priority = EXCLUDED.priority,
    unit_price = EXCLUDED.unit_price,
    updated_at = NOW();

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
WHERE i.item_code = '4-PIN-JSTXH'
  AND v.vendor_code = 'CANNERCONNECTORS'
LIMIT 1
ON CONFLICT (item_id, vendor_id) DO UPDATE SET
    priority = EXCLUDED.priority,
    unit_price = EXCLUDED.unit_price,
    updated_at = NOW();

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
WHERE i.item_code = '5-PIN-JSTXH'
  AND v.vendor_code = 'CANNERCONNECTORS'
LIMIT 1
ON CONFLICT (item_id, vendor_id) DO UPDATE SET
    priority = EXCLUDED.priority,
    unit_price = EXCLUDED.unit_price,
    updated_at = NOW();

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
WHERE i.item_code = '5-PIN-JSTXH'
  AND v.vendor_code = 'CANNERCONNECTORS'
LIMIT 1
ON CONFLICT (item_id, vendor_id) DO UPDATE SET
    priority = EXCLUDED.priority,
    unit_price = EXCLUDED.unit_price,
    updated_at = NOW();

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
WHERE i.item_code = '6-PIN-JSTXH'
  AND v.vendor_code = 'CANNERCONNECTORS'
LIMIT 1
ON CONFLICT (item_id, vendor_id) DO UPDATE SET
    priority = EXCLUDED.priority,
    unit_price = EXCLUDED.unit_price,
    updated_at = NOW();

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
WHERE i.item_code = '6-PIN-JSTXH'
  AND v.vendor_code = 'CANNERCONNECTORS'
LIMIT 1
ON CONFLICT (item_id, vendor_id) DO UPDATE SET
    priority = EXCLUDED.priority,
    unit_price = EXCLUDED.unit_price,
    updated_at = NOW();

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
WHERE i.item_code = '2510-CRIMPING-PINS'
  AND v.vendor_code = 'CANNERCONNECTORS'
LIMIT 1
ON CONFLICT (item_id, vendor_id) DO UPDATE SET
    priority = EXCLUDED.priority,
    unit_price = EXCLUDED.unit_price,
    updated_at = NOW();

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
WHERE i.item_code = '13-PIN-JSTXH'
  AND v.vendor_code = 'CANNERCONNECTORS'
LIMIT 1
ON CONFLICT (item_id, vendor_id) DO UPDATE SET
    priority = EXCLUDED.priority,
    unit_price = EXCLUDED.unit_price,
    updated_at = NOW();

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
WHERE i.item_code = '15-PIN-JSTXH'
  AND v.vendor_code = 'CANNERCONNECTORS'
LIMIT 1
ON CONFLICT (item_id, vendor_id) DO UPDATE SET
    priority = EXCLUDED.priority,
    unit_price = EXCLUDED.unit_price,
    updated_at = NOW();

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
WHERE i.item_code = 'JSTXH-CRIMPING-PINS'
  AND v.vendor_code = 'CANNERCONNECTORS'
LIMIT 1
ON CONFLICT (item_id, vendor_id) DO UPDATE SET
    priority = EXCLUDED.priority,
    unit_price = EXCLUDED.unit_price,
    updated_at = NOW();

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
WHERE i.item_code = 'JSTXH-CRIMPING-PINS'
  AND v.vendor_code = 'CANNERCONNECTORS'
LIMIT 1
ON CONFLICT (item_id, vendor_id) DO UPDATE SET
    priority = EXCLUDED.priority,
    unit_price = EXCLUDED.unit_price,
    updated_at = NOW();

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
WHERE i.item_code = '25CM-RED-ONE'
  AND v.vendor_code = 'CANNERCONNECTORS'
LIMIT 1
ON CONFLICT (item_id, vendor_id) DO UPDATE SET
    priority = EXCLUDED.priority,
    unit_price = EXCLUDED.unit_price,
    updated_at = NOW();

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
WHERE i.item_code = '25CM-GREEN-ONE'
  AND v.vendor_code = 'CANNERCONNECTORS'
LIMIT 1
ON CONFLICT (item_id, vendor_id) DO UPDATE SET
    priority = EXCLUDED.priority,
    unit_price = EXCLUDED.unit_price,
    updated_at = NOW();

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
WHERE i.item_code = '25CM-BLACK-ONE'
  AND v.vendor_code = 'CANNERCONNECTORS'
LIMIT 1
ON CONFLICT (item_id, vendor_id) DO UPDATE SET
    priority = EXCLUDED.priority,
    unit_price = EXCLUDED.unit_price,
    updated_at = NOW();

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
WHERE i.item_code = '10CM-ONE-SIDED'
  AND v.vendor_code = 'CANNERCONNECTORS'
LIMIT 1
ON CONFLICT (item_id, vendor_id) DO UPDATE SET
    priority = EXCLUDED.priority,
    unit_price = EXCLUDED.unit_price,
    updated_at = NOW();

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
WHERE i.item_code = '10CM-ONE-SIDED'
  AND v.vendor_code = 'CANNERCONNECTORS'
LIMIT 1
ON CONFLICT (item_id, vendor_id) DO UPDATE SET
    priority = EXCLUDED.priority,
    unit_price = EXCLUDED.unit_price,
    updated_at = NOW();

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
WHERE i.item_code = '10CM-ONE-SIDED'
  AND v.vendor_code = 'CANNERCONNECTORS'
LIMIT 1
ON CONFLICT (item_id, vendor_id) DO UPDATE SET
    priority = EXCLUDED.priority,
    unit_price = EXCLUDED.unit_price,
    updated_at = NOW();

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
WHERE i.item_code = '10CM-ONE-SIDED'
  AND v.vendor_code = 'CANNERCONNECTORS'
LIMIT 1
ON CONFLICT (item_id, vendor_id) DO UPDATE SET
    priority = EXCLUDED.priority,
    unit_price = EXCLUDED.unit_price,
    updated_at = NOW();

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
WHERE i.item_code = '10CM-ONE-SIDED'
  AND v.vendor_code = 'CANNERCONNECTORS'
LIMIT 1
ON CONFLICT (item_id, vendor_id) DO UPDATE SET
    priority = EXCLUDED.priority,
    unit_price = EXCLUDED.unit_price,
    updated_at = NOW();

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
WHERE i.item_code = '10CM-ONE-SIDED'
  AND v.vendor_code = 'CANNERCONNECTORS'
LIMIT 1
ON CONFLICT (item_id, vendor_id) DO UPDATE SET
    priority = EXCLUDED.priority,
    unit_price = EXCLUDED.unit_price,
    updated_at = NOW();

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
WHERE i.item_code = '10CM-ONE-SIDED'
  AND v.vendor_code = 'CANNERCONNECTORS'
LIMIT 1
ON CONFLICT (item_id, vendor_id) DO UPDATE SET
    priority = EXCLUDED.priority,
    unit_price = EXCLUDED.unit_price,
    updated_at = NOW();

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
WHERE i.item_code = '10CM-ONE-SIDED'
  AND v.vendor_code = 'CANNERCONNECTORS'
LIMIT 1
ON CONFLICT (item_id, vendor_id) DO UPDATE SET
    priority = EXCLUDED.priority,
    unit_price = EXCLUDED.unit_price,
    updated_at = NOW();

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
WHERE i.item_code = '10CM-ONE-SIDED'
  AND v.vendor_code = 'CANNERCONNECTORS'
LIMIT 1
ON CONFLICT (item_id, vendor_id) DO UPDATE SET
    priority = EXCLUDED.priority,
    unit_price = EXCLUDED.unit_price,
    updated_at = NOW();

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
WHERE i.item_code = '10CM-ONE-SIDED'
  AND v.vendor_code = 'CANNERCONNECTORS'
LIMIT 1
ON CONFLICT (item_id, vendor_id) DO UPDATE SET
    priority = EXCLUDED.priority,
    unit_price = EXCLUDED.unit_price,
    updated_at = NOW();

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
WHERE i.item_code = '10CM-ONE-SIDED'
  AND v.vendor_code = 'CANNERCONNECTORS'
LIMIT 1
ON CONFLICT (item_id, vendor_id) DO UPDATE SET
    priority = EXCLUDED.priority,
    unit_price = EXCLUDED.unit_price,
    updated_at = NOW();

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
WHERE i.item_code = '10CM-ONE-SIDED'
  AND v.vendor_code = 'CANNERCONNECTORS'
LIMIT 1
ON CONFLICT (item_id, vendor_id) DO UPDATE SET
    priority = EXCLUDED.priority,
    unit_price = EXCLUDED.unit_price,
    updated_at = NOW();

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
WHERE i.item_code = '10CM-ONE-SIDED'
  AND v.vendor_code = 'CANNERCONNECTORS'
LIMIT 1
ON CONFLICT (item_id, vendor_id) DO UPDATE SET
    priority = EXCLUDED.priority,
    unit_price = EXCLUDED.unit_price,
    updated_at = NOW();

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
WHERE i.item_code = '10CM-ONE-SIDED'
  AND v.vendor_code = 'CANNERCONNECTORS'
LIMIT 1
ON CONFLICT (item_id, vendor_id) DO UPDATE SET
    priority = EXCLUDED.priority,
    unit_price = EXCLUDED.unit_price,
    updated_at = NOW();

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
WHERE i.item_code = '10CM-ONE-SIDED'
  AND v.vendor_code = 'CANNERCONNECTORS'
LIMIT 1
ON CONFLICT (item_id, vendor_id) DO UPDATE SET
    priority = EXCLUDED.priority,
    unit_price = EXCLUDED.unit_price,
    updated_at = NOW();

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
WHERE i.item_code = '10CM-ONE-SIDED'
  AND v.vendor_code = 'CANNERCONNECTORS'
LIMIT 1
ON CONFLICT (item_id, vendor_id) DO UPDATE SET
    priority = EXCLUDED.priority,
    unit_price = EXCLUDED.unit_price,
    updated_at = NOW();

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
WHERE i.item_code = '10CM-ONE-SIDED'
  AND v.vendor_code = 'CANNERCONNECTORS'
LIMIT 1
ON CONFLICT (item_id, vendor_id) DO UPDATE SET
    priority = EXCLUDED.priority,
    unit_price = EXCLUDED.unit_price,
    updated_at = NOW();

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
WHERE i.item_code = '25CM-BLACK-MICROFIT'
  AND v.vendor_code = 'CANNERCONNECTORS'
LIMIT 1
ON CONFLICT (item_id, vendor_id) DO UPDATE SET
    priority = EXCLUDED.priority,
    unit_price = EXCLUDED.unit_price,
    updated_at = NOW();

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
WHERE i.item_code = '25CM-GREEN-MICROFIT'
  AND v.vendor_code = 'CANNERCONNECTORS'
LIMIT 1
ON CONFLICT (item_id, vendor_id) DO UPDATE SET
    priority = EXCLUDED.priority,
    unit_price = EXCLUDED.unit_price,
    updated_at = NOW();

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
WHERE i.item_code = '25CM-VIOLET-MICROFIT'
  AND v.vendor_code = 'CANNERCONNECTORS'
LIMIT 1
ON CONFLICT (item_id, vendor_id) DO UPDATE SET
    priority = EXCLUDED.priority,
    unit_price = EXCLUDED.unit_price,
    updated_at = NOW();

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
WHERE i.item_code = '25CM-YELLOW-MICROFIT'
  AND v.vendor_code = 'CANNERCONNECTORS'
LIMIT 1
ON CONFLICT (item_id, vendor_id) DO UPDATE SET
    priority = EXCLUDED.priority,
    unit_price = EXCLUDED.unit_price,
    updated_at = NOW();

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
WHERE i.item_code = '25CM-SKY-BLUE'
  AND v.vendor_code = 'CANNERCONNECTORS'
LIMIT 1
ON CONFLICT (item_id, vendor_id) DO UPDATE SET
    priority = EXCLUDED.priority,
    unit_price = EXCLUDED.unit_price,
    updated_at = NOW();

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
WHERE i.item_code = '25CM-PINK-MICROFIT'
  AND v.vendor_code = 'CANNERCONNECTORS'
LIMIT 1
ON CONFLICT (item_id, vendor_id) DO UPDATE SET
    priority = EXCLUDED.priority,
    unit_price = EXCLUDED.unit_price,
    updated_at = NOW();

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
WHERE i.item_code = '25CM-LBROWN-MICROFIT'
  AND v.vendor_code = 'CANNERCONNECTORS'
LIMIT 1
ON CONFLICT (item_id, vendor_id) DO UPDATE SET
    priority = EXCLUDED.priority,
    unit_price = EXCLUDED.unit_price,
    updated_at = NOW();

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
WHERE i.item_code = '25CM-DBROWN-MICROFIT'
  AND v.vendor_code = 'CANNERCONNECTORS'
LIMIT 1
ON CONFLICT (item_id, vendor_id) DO UPDATE SET
    priority = EXCLUDED.priority,
    unit_price = EXCLUDED.unit_price,
    updated_at = NOW();

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
WHERE i.item_code = '25CM-WHITE-MICROFIT'
  AND v.vendor_code = 'CANNERCONNECTORS'
LIMIT 1
ON CONFLICT (item_id, vendor_id) DO UPDATE SET
    priority = EXCLUDED.priority,
    unit_price = EXCLUDED.unit_price,
    updated_at = NOW();

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
WHERE i.item_code = '25CM-WHITERED-MICROFIT'
  AND v.vendor_code = 'CANNERCONNECTORS'
LIMIT 1
ON CONFLICT (item_id, vendor_id) DO UPDATE SET
    priority = EXCLUDED.priority,
    unit_price = EXCLUDED.unit_price,
    updated_at = NOW();

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
WHERE i.item_code = '25CM-RED-MICROFIT'
  AND v.vendor_code = 'CANNERCONNECTORS'
LIMIT 1
ON CONFLICT (item_id, vendor_id) DO UPDATE SET
    priority = EXCLUDED.priority,
    unit_price = EXCLUDED.unit_price,
    updated_at = NOW();

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
WHERE i.item_code = '25CM-DARK-BLUE'
  AND v.vendor_code = 'CANNERCONNECTORS'
LIMIT 1
ON CONFLICT (item_id, vendor_id) DO UPDATE SET
    priority = EXCLUDED.priority,
    unit_price = EXCLUDED.unit_price,
    updated_at = NOW();

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
WHERE i.item_code = '25CM-ORANGE-MICROFIT'
  AND v.vendor_code = 'CANNERCONNECTORS'
LIMIT 1
ON CONFLICT (item_id, vendor_id) DO UPDATE SET
    priority = EXCLUDED.priority,
    unit_price = EXCLUDED.unit_price,
    updated_at = NOW();

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
WHERE i.item_code = '18PIN-MICROFIT-HOUSING'
  AND v.vendor_code = 'CANNERCONNECTORS'
LIMIT 1
ON CONFLICT (item_id, vendor_id) DO UPDATE SET
    priority = EXCLUDED.priority,
    unit_price = EXCLUDED.unit_price,
    updated_at = NOW();

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
WHERE i.item_code = 'TACTILE-SWITCH-FOR'
  AND v.vendor_code = 'DONORRC'
LIMIT 1
ON CONFLICT (item_id, vendor_id) DO UPDATE SET
    priority = EXCLUDED.priority,
    unit_price = EXCLUDED.unit_price,
    updated_at = NOW();

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
WHERE i.item_code = '915MHZ-ANTENNA'
  AND v.vendor_code = 'SYNERGY'
LIMIT 1
ON CONFLICT (item_id, vendor_id) DO UPDATE SET
    priority = EXCLUDED.priority,
    unit_price = EXCLUDED.unit_price,
    updated_at = NOW();

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
WHERE i.item_code = 'IPEX4-TO-SMA'
  AND v.vendor_code = 'ROBU'
LIMIT 1
ON CONFLICT (item_id, vendor_id) DO UPDATE SET
    priority = EXCLUDED.priority,
    unit_price = EXCLUDED.unit_price,
    updated_at = NOW();

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
WHERE i.item_code = 'IPEX4-TO-SMA'
  AND v.vendor_code = 'SYNERGY'
LIMIT 1
ON CONFLICT (item_id, vendor_id) DO UPDATE SET
    priority = EXCLUDED.priority,
    unit_price = EXCLUDED.unit_price,
    updated_at = NOW();

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
WHERE i.item_code = 'R9M-ANTENNA-EXTENSION'
  AND v.vendor_code = 'SYNERGY'
LIMIT 1
ON CONFLICT (item_id, vendor_id) DO UPDATE SET
    priority = EXCLUDED.priority,
    unit_price = EXCLUDED.unit_price,
    updated_at = NOW();

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
WHERE i.item_code = 'RPSMA-FEMALE-INLINE'
  AND v.vendor_code = 'SYNERGY'
LIMIT 1
ON CONFLICT (item_id, vendor_id) DO UPDATE SET
    priority = EXCLUDED.priority,
    unit_price = EXCLUDED.unit_price,
    updated_at = NOW();

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
WHERE i.item_code = 'RPSMA-MALE-INLINE'
  AND v.vendor_code = 'SYNERGY'
LIMIT 1
ON CONFLICT (item_id, vendor_id) DO UPDATE SET
    priority = EXCLUDED.priority,
    unit_price = EXCLUDED.unit_price,
    updated_at = NOW();

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
WHERE i.item_code = 'RPSMA-FEMALE-INLINE'
  AND v.vendor_code = 'SYNERGY'
LIMIT 1
ON CONFLICT (item_id, vendor_id) DO UPDATE SET
    priority = EXCLUDED.priority,
    unit_price = EXCLUDED.unit_price,
    updated_at = NOW();

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
WHERE i.item_code = 'RPSMA-MALE-INLINE'
  AND v.vendor_code = 'SYNERGY'
LIMIT 1
ON CONFLICT (item_id, vendor_id) DO UPDATE SET
    priority = EXCLUDED.priority,
    unit_price = EXCLUDED.unit_price,
    updated_at = NOW();

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
WHERE i.item_code = 'SMA-FEMALE-INLINE'
  AND v.vendor_code = 'SYNERGY'
LIMIT 1
ON CONFLICT (item_id, vendor_id) DO UPDATE SET
    priority = EXCLUDED.priority,
    unit_price = EXCLUDED.unit_price,
    updated_at = NOW();

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
WHERE i.item_code = 'SMA-MALE-INLINE'
  AND v.vendor_code = 'SYNERGY'
LIMIT 1
ON CONFLICT (item_id, vendor_id) DO UPDATE SET
    priority = EXCLUDED.priority,
    unit_price = EXCLUDED.unit_price,
    updated_at = NOW();

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
WHERE i.item_code = 'SMA-FEMALE-INLINE'
  AND v.vendor_code = 'SYNERGY'
LIMIT 1
ON CONFLICT (item_id, vendor_id) DO UPDATE SET
    priority = EXCLUDED.priority,
    unit_price = EXCLUDED.unit_price,
    updated_at = NOW();

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
WHERE i.item_code = 'SMA-MALE-CONNECTOR'
  AND v.vendor_code = 'SYNERGY'
LIMIT 1
ON CONFLICT (item_id, vendor_id) DO UPDATE SET
    priority = EXCLUDED.priority,
    unit_price = EXCLUDED.unit_price,
    updated_at = NOW();

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
WHERE i.item_code = 'RG174-COAXIAL-CABLE'
  AND v.vendor_code = 'SYNERGY'
LIMIT 1
ON CONFLICT (item_id, vendor_id) DO UPDATE SET
    priority = EXCLUDED.priority,
    unit_price = EXCLUDED.unit_price,
    updated_at = NOW();

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
WHERE i.item_code = 'RG142-COAXIAL-CABLE'
  AND v.vendor_code = 'SYNERGY'
LIMIT 1
ON CONFLICT (item_id, vendor_id) DO UPDATE SET
    priority = EXCLUDED.priority,
    unit_price = EXCLUDED.unit_price,
    updated_at = NOW();

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
WHERE i.item_code = '20-AWG-SILICONE'
  AND v.vendor_code = 'ROBU'
LIMIT 1
ON CONFLICT (item_id, vendor_id) DO UPDATE SET
    priority = EXCLUDED.priority,
    unit_price = EXCLUDED.unit_price,
    updated_at = NOW();

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
WHERE i.item_code = '25CORE-WIRE-1438'
  AND v.vendor_code = 'CABLEFORT'
LIMIT 1
ON CONFLICT (item_id, vendor_id) DO UPDATE SET
    priority = EXCLUDED.priority,
    unit_price = EXCLUDED.unit_price,
    updated_at = NOW();

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
WHERE i.item_code = '20CORE-WIRE-1438'
  AND v.vendor_code = 'CABLEFORT'
LIMIT 1
ON CONFLICT (item_id, vendor_id) DO UPDATE SET
    priority = EXCLUDED.priority,
    unit_price = EXCLUDED.unit_price,
    updated_at = NOW();

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
WHERE i.item_code = '10CORE-WIRE-1438'
  AND v.vendor_code = 'CABLEFORT'
LIMIT 1
ON CONFLICT (item_id, vendor_id) DO UPDATE SET
    priority = EXCLUDED.priority,
    unit_price = EXCLUDED.unit_price,
    updated_at = NOW();

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
WHERE i.item_code = '8CORE-WIRE-1438'
  AND v.vendor_code = 'CABLEFORT'
LIMIT 1
ON CONFLICT (item_id, vendor_id) DO UPDATE SET
    priority = EXCLUDED.priority,
    unit_price = EXCLUDED.unit_price,
    updated_at = NOW();

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
WHERE i.item_code = '1438-16-CORE'
  AND v.vendor_code = 'CABLEFORT'
LIMIT 1
ON CONFLICT (item_id, vendor_id) DO UPDATE SET
    priority = EXCLUDED.priority,
    unit_price = EXCLUDED.unit_price,
    updated_at = NOW();

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
WHERE i.item_code = 'RED-1438-WIRE'
  AND v.vendor_code = 'CABLEFORT'
LIMIT 1
ON CONFLICT (item_id, vendor_id) DO UPDATE SET
    priority = EXCLUDED.priority,
    unit_price = EXCLUDED.unit_price,
    updated_at = NOW();

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
WHERE i.item_code = 'BLACK-1438-WIRE'
  AND v.vendor_code = 'CABLEFORT'
LIMIT 1
ON CONFLICT (item_id, vendor_id) DO UPDATE SET
    priority = EXCLUDED.priority,
    unit_price = EXCLUDED.unit_price,
    updated_at = NOW();

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
WHERE i.item_code = 'YELLOW-1438-WIRE'
  AND v.vendor_code = 'CABLEFORT'
LIMIT 1
ON CONFLICT (item_id, vendor_id) DO UPDATE SET
    priority = EXCLUDED.priority,
    unit_price = EXCLUDED.unit_price,
    updated_at = NOW();

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
WHERE i.item_code = 'WHITE-1438-WIRE'
  AND v.vendor_code = 'CABLEFORT'
LIMIT 1
ON CONFLICT (item_id, vendor_id) DO UPDATE SET
    priority = EXCLUDED.priority,
    unit_price = EXCLUDED.unit_price,
    updated_at = NOW();

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
WHERE i.item_code = 'SKY-BLUE-1438'
  AND v.vendor_code = 'CABLEFORT'
LIMIT 1
ON CONFLICT (item_id, vendor_id) DO UPDATE SET
    priority = EXCLUDED.priority,
    unit_price = EXCLUDED.unit_price,
    updated_at = NOW();

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
WHERE i.item_code = 'ORANGE-1438-WIRE'
  AND v.vendor_code = 'CABLEFORT'
LIMIT 1
ON CONFLICT (item_id, vendor_id) DO UPDATE SET
    priority = EXCLUDED.priority,
    unit_price = EXCLUDED.unit_price,
    updated_at = NOW();

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
WHERE i.item_code = 'GREEN-1438-WIRE'
  AND v.vendor_code = 'CABLEFORT'
LIMIT 1
ON CONFLICT (item_id, vendor_id) DO UPDATE SET
    priority = EXCLUDED.priority,
    unit_price = EXCLUDED.unit_price,
    updated_at = NOW();

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
WHERE i.item_code = 'PURPLE-1438-WIRE'
  AND v.vendor_code = 'CABLEFORT'
LIMIT 1
ON CONFLICT (item_id, vendor_id) DO UPDATE SET
    priority = EXCLUDED.priority,
    unit_price = EXCLUDED.unit_price,
    updated_at = NOW();

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
WHERE i.item_code = 'BROWN-1438-WIRE'
  AND v.vendor_code = 'CABLEFORT'
LIMIT 1
ON CONFLICT (item_id, vendor_id) DO UPDATE SET
    priority = EXCLUDED.priority,
    unit_price = EXCLUDED.unit_price,
    updated_at = NOW();

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
WHERE i.item_code = 'AFT-PLATE-ACRYLICE'
  AND v.vendor_code = 'ALIIRANIKOLKATA'
LIMIT 1
ON CONFLICT (item_id, vendor_id) DO UPDATE SET
    priority = EXCLUDED.priority,
    unit_price = EXCLUDED.unit_price,
    updated_at = NOW();

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
WHERE i.item_code = '12S-LIPO-CHARGER'
  AND v.vendor_code = 'SHENZENISDTECHNOLOGY'
LIMIT 1
ON CONFLICT (item_id, vendor_id) DO UPDATE SET
    priority = EXCLUDED.priority,
    unit_price = EXCLUDED.unit_price,
    updated_at = NOW();

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
WHERE i.item_code = '8S-LIPO-CHARGER'
  AND v.vendor_code = 'ROBU'
LIMIT 1
ON CONFLICT (item_id, vendor_id) DO UPDATE SET
    priority = EXCLUDED.priority,
    unit_price = EXCLUDED.unit_price,
    updated_at = NOW();

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
WHERE i.item_code = '4S-LIPO-CHARGER'
  AND v.vendor_code = 'ROBU'
LIMIT 1
ON CONFLICT (item_id, vendor_id) DO UPDATE SET
    priority = EXCLUDED.priority,
    unit_price = EXCLUDED.unit_price,
    updated_at = NOW();

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
WHERE i.item_code = '8KG-HULL'
  AND v.vendor_code = 'VINODRAI'
LIMIT 1
ON CONFLICT (item_id, vendor_id) DO UPDATE SET
    priority = EXCLUDED.priority,
    unit_price = EXCLUDED.unit_price,
    updated_at = NOW();

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
WHERE i.item_code = 'JCB-BODY-CUM'
  AND v.vendor_code = 'VINODRAI'
LIMIT 1
ON CONFLICT (item_id, vendor_id) DO UPDATE SET
    priority = EXCLUDED.priority,
    unit_price = EXCLUDED.unit_price,
    updated_at = NOW();

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
WHERE i.item_code = 'SR-STRUCTURE'
  AND v.vendor_code = 'VINODRAI'
LIMIT 1
ON CONFLICT (item_id, vendor_id) DO UPDATE SET
    priority = EXCLUDED.priority,
    unit_price = EXCLUDED.unit_price,
    updated_at = NOW();

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
WHERE i.item_code = 'SR-PILLOW'
  AND v.vendor_code = 'VINODRAI'
LIMIT 1
ON CONFLICT (item_id, vendor_id) DO UPDATE SET
    priority = EXCLUDED.priority,
    unit_price = EXCLUDED.unit_price,
    updated_at = NOW();

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
WHERE i.item_code = 'COUPLING-HOOD'
  AND v.vendor_code = 'AGARWALALUMINIUM'
LIMIT 1
ON CONFLICT (item_id, vendor_id) DO UPDATE SET
    priority = EXCLUDED.priority,
    unit_price = EXCLUDED.unit_price,
    updated_at = NOW();

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
WHERE i.item_code = '2MM-FRP-60X70MM'
  AND v.vendor_code = 'DOLPHINRUBBER'
LIMIT 1
ON CONFLICT (item_id, vendor_id) DO UPDATE SET
    priority = EXCLUDED.priority,
    unit_price = EXCLUDED.unit_price,
    updated_at = NOW();

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
WHERE i.item_code = 'FLOW-SENSOR-CLAMP'
  AND v.vendor_code = 'AGARWALALUMINIUM'
LIMIT 1
ON CONFLICT (item_id, vendor_id) DO UPDATE SET
    priority = EXCLUDED.priority,
    unit_price = EXCLUDED.unit_price,
    updated_at = NOW();

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
WHERE i.item_code = 'ESC-TEMPERATURE-SENSOR'
  AND v.vendor_code = 'AGARWALALUMINIUM'
LIMIT 1
ON CONFLICT (item_id, vendor_id) DO UPDATE SET
    priority = EXCLUDED.priority,
    unit_price = EXCLUDED.unit_price,
    updated_at = NOW();

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
WHERE i.item_code = 'BATTERY-CLAMP'
  AND v.vendor_code = 'AGARWALALUMINIUM'
LIMIT 1
ON CONFLICT (item_id, vendor_id) DO UPDATE SET
    priority = EXCLUDED.priority,
    unit_price = EXCLUDED.unit_price,
    updated_at = NOW();

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
WHERE i.item_code = 'ELECTRONIC-BOX-TOP'
  AND v.vendor_code = 'JANKIDIE'
LIMIT 1
ON CONFLICT (item_id, vendor_id) DO UPDATE SET
    priority = EXCLUDED.priority,
    unit_price = EXCLUDED.unit_price,
    updated_at = NOW();

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
WHERE i.item_code = 'BATTERY-HOLDING-FOAM'
  AND v.vendor_code = 'INHOUSE'
LIMIT 1
ON CONFLICT (item_id, vendor_id) DO UPDATE SET
    priority = EXCLUDED.priority,
    unit_price = EXCLUDED.unit_price,
    updated_at = NOW();

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
WHERE i.item_code = 'BATTERY-HOLDING-FOAM'
  AND v.vendor_code = 'INHOUSE'
LIMIT 1
ON CONFLICT (item_id, vendor_id) DO UPDATE SET
    priority = EXCLUDED.priority,
    unit_price = EXCLUDED.unit_price,
    updated_at = NOW();

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
WHERE i.item_code = 'BATTERY-CLAMPING-UP'
  AND v.vendor_code = 'INHOUSE'
LIMIT 1
ON CONFLICT (item_id, vendor_id) DO UPDATE SET
    priority = EXCLUDED.priority,
    unit_price = EXCLUDED.unit_price,
    updated_at = NOW();

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
WHERE i.item_code = 'BATTERY-CLAMPING-BF'
  AND v.vendor_code = 'INHOUSE'
LIMIT 1
ON CONFLICT (item_id, vendor_id) DO UPDATE SET
    priority = EXCLUDED.priority,
    unit_price = EXCLUDED.unit_price,
    updated_at = NOW();

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
WHERE i.item_code = 'UNDER-ELECBOX-EPE'
  AND v.vendor_code = 'INHOUSE'
LIMIT 1
ON CONFLICT (item_id, vendor_id) DO UPDATE SET
    priority = EXCLUDED.priority,
    unit_price = EXCLUDED.unit_price,
    updated_at = NOW();

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
WHERE i.item_code = 'ABOVE-ELECBOX-EPE'
  AND v.vendor_code = 'INHOUSE'
LIMIT 1
ON CONFLICT (item_id, vendor_id) DO UPDATE SET
    priority = EXCLUDED.priority,
    unit_price = EXCLUDED.unit_price,
    updated_at = NOW();

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
WHERE i.item_code = 'ZIP-TIES-100X3'
  AND v.vendor_code = 'SEUTES'
LIMIT 1
ON CONFLICT (item_id, vendor_id) DO UPDATE SET
    priority = EXCLUDED.priority,
    unit_price = EXCLUDED.unit_price,
    updated_at = NOW();

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
WHERE i.item_code = 'ZIP-TIES-250M'
  AND v.vendor_code = 'LOCALMARKET'
LIMIT 1
ON CONFLICT (item_id, vendor_id) DO UPDATE SET
    priority = EXCLUDED.priority,
    unit_price = EXCLUDED.unit_price,
    updated_at = NOW();

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
WHERE i.item_code = 'FERRITE-CORE'
  AND v.vendor_code = 'MARHASHTOROIDRINGS'
LIMIT 1
ON CONFLICT (item_id, vendor_id) DO UPDATE SET
    priority = EXCLUDED.priority,
    unit_price = EXCLUDED.unit_price,
    updated_at = NOW();

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
WHERE i.item_code = 'SY2115-PIN-PANEL'
  AND v.vendor_code = 'WEIPU'
LIMIT 1
ON CONFLICT (item_id, vendor_id) DO UPDATE SET
    priority = EXCLUDED.priority,
    unit_price = EXCLUDED.unit_price,
    updated_at = NOW();

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
WHERE i.item_code = 'SY2115-PIN-CABLE'
  AND v.vendor_code = 'WEIPU'
LIMIT 1
ON CONFLICT (item_id, vendor_id) DO UPDATE SET
    priority = EXCLUDED.priority,
    unit_price = EXCLUDED.unit_price,
    updated_at = NOW();

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
WHERE i.item_code = 'SY2115-PIN-PANEL'
  AND v.vendor_code = 'WEIPU'
LIMIT 1
ON CONFLICT (item_id, vendor_id) DO UPDATE SET
    priority = EXCLUDED.priority,
    unit_price = EXCLUDED.unit_price,
    updated_at = NOW();

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
WHERE i.item_code = 'SY2115-PIN-CABLE'
  AND v.vendor_code = 'WEIPU'
LIMIT 1
ON CONFLICT (item_id, vendor_id) DO UPDATE SET
    priority = EXCLUDED.priority,
    unit_price = EXCLUDED.unit_price,
    updated_at = NOW();

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
WHERE i.item_code = 'WY28-METAL-CONNECTOR'
  AND v.vendor_code = 'WEIPU'
LIMIT 1
ON CONFLICT (item_id, vendor_id) DO UPDATE SET
    priority = EXCLUDED.priority,
    unit_price = EXCLUDED.unit_price,
    updated_at = NOW();

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
WHERE i.item_code = 'WY28-METAL-CONNECTOR'
  AND v.vendor_code = 'WEIPU'
LIMIT 1
ON CONFLICT (item_id, vendor_id) DO UPDATE SET
    priority = EXCLUDED.priority,
    unit_price = EXCLUDED.unit_price,
    updated_at = NOW();

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
WHERE i.item_code = 'SA12-9PIN-CM'
  AND v.vendor_code = 'WEIPU'
LIMIT 1
ON CONFLICT (item_id, vendor_id) DO UPDATE SET
    priority = EXCLUDED.priority,
    unit_price = EXCLUDED.unit_price,
    updated_at = NOW();

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
WHERE i.item_code = 'SA12-9PIN-PM'
  AND v.vendor_code = 'WEIPU'
LIMIT 1
ON CONFLICT (item_id, vendor_id) DO UPDATE SET
    priority = EXCLUDED.priority,
    unit_price = EXCLUDED.unit_price,
    updated_at = NOW();

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
WHERE i.item_code = 'SA12-9PIN-COUNTER'
  AND v.vendor_code = 'WEIPU'
LIMIT 1
ON CONFLICT (item_id, vendor_id) DO UPDATE SET
    priority = EXCLUDED.priority,
    unit_price = EXCLUDED.unit_price,
    updated_at = NOW();

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
WHERE i.item_code = 'LP12-3-PIN'
  AND v.vendor_code = 'EVELTA'
LIMIT 1
ON CONFLICT (item_id, vendor_id) DO UPDATE SET
    priority = EXCLUDED.priority,
    unit_price = EXCLUDED.unit_price,
    updated_at = NOW();

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
WHERE i.item_code = 'LP12-3-PIN'
  AND v.vendor_code = 'EVELTA'
LIMIT 1
ON CONFLICT (item_id, vendor_id) DO UPDATE SET
    priority = EXCLUDED.priority,
    unit_price = EXCLUDED.unit_price,
    updated_at = NOW();

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
WHERE i.item_code = 'LP12-4-PIN'
  AND v.vendor_code = 'EVELTA'
LIMIT 1
ON CONFLICT (item_id, vendor_id) DO UPDATE SET
    priority = EXCLUDED.priority,
    unit_price = EXCLUDED.unit_price,
    updated_at = NOW();

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
WHERE i.item_code = 'LP12-4-PIN'
  AND v.vendor_code = 'EVELTA'
LIMIT 1
ON CONFLICT (item_id, vendor_id) DO UPDATE SET
    priority = EXCLUDED.priority,
    unit_price = EXCLUDED.unit_price,
    updated_at = NOW();

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
WHERE i.item_code = 'LP12-8-PIN'
  AND v.vendor_code = 'EVELTA'
LIMIT 1
ON CONFLICT (item_id, vendor_id) DO UPDATE SET
    priority = EXCLUDED.priority,
    unit_price = EXCLUDED.unit_price,
    updated_at = NOW();

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
WHERE i.item_code = 'LP12-8-PIN'
  AND v.vendor_code = 'EVELTA'
LIMIT 1
ON CONFLICT (item_id, vendor_id) DO UPDATE SET
    priority = EXCLUDED.priority,
    unit_price = EXCLUDED.unit_price,
    updated_at = NOW();

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
WHERE i.item_code = 'LP24-24-PIN'
  AND v.vendor_code = 'EVELTA'
LIMIT 1
ON CONFLICT (item_id, vendor_id) DO UPDATE SET
    priority = EXCLUDED.priority,
    unit_price = EXCLUDED.unit_price,
    updated_at = NOW();

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
WHERE i.item_code = 'LP24-24-PIN'
  AND v.vendor_code = 'EVELTA'
LIMIT 1
ON CONFLICT (item_id, vendor_id) DO UPDATE SET
    priority = EXCLUDED.priority,
    unit_price = EXCLUDED.unit_price,
    updated_at = NOW();

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
WHERE i.item_code = 'LP24-24-PIN'
  AND v.vendor_code = 'EVELTA'
LIMIT 1
ON CONFLICT (item_id, vendor_id) DO UPDATE SET
    priority = EXCLUDED.priority,
    unit_price = EXCLUDED.unit_price,
    updated_at = NOW();

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
WHERE i.item_code = 'LP24-24-PIN'
  AND v.vendor_code = 'EVELTA'
LIMIT 1
ON CONFLICT (item_id, vendor_id) DO UPDATE SET
    priority = EXCLUDED.priority,
    unit_price = EXCLUDED.unit_price,
    updated_at = NOW();

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
WHERE i.item_code = 'WATER-TANK-FOR'
  AND v.vendor_code = 'TANVEERINTERNATIONAL'
LIMIT 1
ON CONFLICT (item_id, vendor_id) DO UPDATE SET
    priority = EXCLUDED.priority,
    unit_price = EXCLUDED.unit_price,
    updated_at = NOW();

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
WHERE i.item_code = 'BLUEROBOTICS-LEAK-PROBE'
  AND v.vendor_code = 'BLUEROBOTICS'
LIMIT 1
ON CONFLICT (item_id, vendor_id) DO UPDATE SET
    priority = EXCLUDED.priority,
    unit_price = EXCLUDED.unit_price,
    updated_at = NOW();

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
WHERE i.item_code = 'BLUEROBOTICS-INDICATOR'
  AND v.vendor_code = 'BLUEROBOTICS'
LIMIT 1
ON CONFLICT (item_id, vendor_id) DO UPDATE SET
    priority = EXCLUDED.priority,
    unit_price = EXCLUDED.unit_price,
    updated_at = NOW();

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
WHERE i.item_code = 'IP68-ROTARY-MAIN'
  AND v.vendor_code = 'BLUEROBOTICS'
LIMIT 1
ON CONFLICT (item_id, vendor_id) DO UPDATE SET
    priority = EXCLUDED.priority,
    unit_price = EXCLUDED.unit_price,
    updated_at = NOW();

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
WHERE i.item_code = 'RED-2835-SMD'
  AND v.vendor_code = 'PREMIERELECTRONICS'
LIMIT 1
ON CONFLICT (item_id, vendor_id) DO UPDATE SET
    priority = EXCLUDED.priority,
    unit_price = EXCLUDED.unit_price,
    updated_at = NOW();

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
WHERE i.item_code = 'GREEN-2835-SMD'
  AND v.vendor_code = 'PREMIERELECTRONICS'
LIMIT 1
ON CONFLICT (item_id, vendor_id) DO UPDATE SET
    priority = EXCLUDED.priority,
    unit_price = EXCLUDED.unit_price,
    updated_at = NOW();

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
WHERE i.item_code = 'NO-4-SELF'
  AND v.vendor_code = 'DYNAMICINDUSTRIALSUP'
LIMIT 1
ON CONFLICT (item_id, vendor_id) DO UPDATE SET
    priority = EXCLUDED.priority,
    unit_price = EXCLUDED.unit_price,
    updated_at = NOW();

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
WHERE i.item_code = 'M2X12-ALLEN-HEAD'
  AND v.vendor_code = 'DYNAMICINDUSTRIALSUP'
LIMIT 1
ON CONFLICT (item_id, vendor_id) DO UPDATE SET
    priority = EXCLUDED.priority,
    unit_price = EXCLUDED.unit_price,
    updated_at = NOW();

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
WHERE i.item_code = 'M3X6-CSK-PHILLIPS'
  AND v.vendor_code = 'DYNAMICINDUSTRIALSUP'
LIMIT 1
ON CONFLICT (item_id, vendor_id) DO UPDATE SET
    priority = EXCLUDED.priority,
    unit_price = EXCLUDED.unit_price,
    updated_at = NOW();

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
WHERE i.item_code = 'M3X8-CSK-PHILLIPS'
  AND v.vendor_code = 'DYNAMICINDUSTRIALSUP'
LIMIT 1
ON CONFLICT (item_id, vendor_id) DO UPDATE SET
    priority = EXCLUDED.priority,
    unit_price = EXCLUDED.unit_price,
    updated_at = NOW();

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
WHERE i.item_code = 'M3X30-CSK-PHILLIPS'
  AND v.vendor_code = 'DYNAMICINDUSTRIALSUP'
LIMIT 1
ON CONFLICT (item_id, vendor_id) DO UPDATE SET
    priority = EXCLUDED.priority,
    unit_price = EXCLUDED.unit_price,
    updated_at = NOW();

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
WHERE i.item_code = 'M3X8-BUTTON-HEAD'
  AND v.vendor_code = 'DYNAMICINDUSTRIALSUP'
LIMIT 1
ON CONFLICT (item_id, vendor_id) DO UPDATE SET
    priority = EXCLUDED.priority,
    unit_price = EXCLUDED.unit_price,
    updated_at = NOW();

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
WHERE i.item_code = 'M3X10-PLAIN-WASHER'
  AND v.vendor_code = 'DYNAMICINDUSTRIALSUP'
LIMIT 1
ON CONFLICT (item_id, vendor_id) DO UPDATE SET
    priority = EXCLUDED.priority,
    unit_price = EXCLUDED.unit_price,
    updated_at = NOW();

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
WHERE i.item_code = 'M4X8-CSK-PHILLIPS'
  AND v.vendor_code = 'DYNAMICINDUSTRIALSUP'
LIMIT 1
ON CONFLICT (item_id, vendor_id) DO UPDATE SET
    priority = EXCLUDED.priority,
    unit_price = EXCLUDED.unit_price,
    updated_at = NOW();

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
WHERE i.item_code = 'M4X8-CSK-PHILLIPS'
  AND v.vendor_code = 'DYNAMICINDUSTRIALSUP'
LIMIT 1
ON CONFLICT (item_id, vendor_id) DO UPDATE SET
    priority = EXCLUDED.priority,
    unit_price = EXCLUDED.unit_price,
    updated_at = NOW();

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
WHERE i.item_code = 'M2X15-ALLEN-HEAD'
  AND v.vendor_code = 'DYNAMICINDUSTRIALSUP'
LIMIT 1
ON CONFLICT (item_id, vendor_id) DO UPDATE SET
    priority = EXCLUDED.priority,
    unit_price = EXCLUDED.unit_price,
    updated_at = NOW();

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
WHERE i.item_code = 'M4X10-CSK-PHILLIPS'
  AND v.vendor_code = 'DYNAMICINDUSTRIALSUP'
LIMIT 1
ON CONFLICT (item_id, vendor_id) DO UPDATE SET
    priority = EXCLUDED.priority,
    unit_price = EXCLUDED.unit_price,
    updated_at = NOW();

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
WHERE i.item_code = 'M4X20-CSK-PHILLIPS'
  AND v.vendor_code = 'DYNAMICINDUSTRIALSUP'
LIMIT 1
ON CONFLICT (item_id, vendor_id) DO UPDATE SET
    priority = EXCLUDED.priority,
    unit_price = EXCLUDED.unit_price,
    updated_at = NOW();

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
WHERE i.item_code = 'M4X12-ALLEN-HEAD'
  AND v.vendor_code = 'DYNAMICINDUSTRIALSUP'
LIMIT 1
ON CONFLICT (item_id, vendor_id) DO UPDATE SET
    priority = EXCLUDED.priority,
    unit_price = EXCLUDED.unit_price,
    updated_at = NOW();

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
WHERE i.item_code = 'M4X16-ALLEN-HEAD'
  AND v.vendor_code = 'DYNAMICINDUSTRIALSUP'
LIMIT 1
ON CONFLICT (item_id, vendor_id) DO UPDATE SET
    priority = EXCLUDED.priority,
    unit_price = EXCLUDED.unit_price,
    updated_at = NOW();

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
WHERE i.item_code = 'M5X15-PLAIN-WASHER'
  AND v.vendor_code = 'DYNAMICINDUSTRIALSUP'
LIMIT 1
ON CONFLICT (item_id, vendor_id) DO UPDATE SET
    priority = EXCLUDED.priority,
    unit_price = EXCLUDED.unit_price,
    updated_at = NOW();

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
WHERE i.item_code = 'M4X20-ALLEN-HEAD'
  AND v.vendor_code = 'DYNAMICINDUSTRIALSUP'
LIMIT 1
ON CONFLICT (item_id, vendor_id) DO UPDATE SET
    priority = EXCLUDED.priority,
    unit_price = EXCLUDED.unit_price,
    updated_at = NOW();

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
WHERE i.item_code = 'M4X12-BUTTON-HEAD'
  AND v.vendor_code = 'DYNAMICINDUSTRIALSUP'
LIMIT 1
ON CONFLICT (item_id, vendor_id) DO UPDATE SET
    priority = EXCLUDED.priority,
    unit_price = EXCLUDED.unit_price,
    updated_at = NOW();

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
WHERE i.item_code = 'M4X12-PAN-COMBI'
  AND v.vendor_code = 'DYNAMICINDUSTRIALSUP'
LIMIT 1
ON CONFLICT (item_id, vendor_id) DO UPDATE SET
    priority = EXCLUDED.priority,
    unit_price = EXCLUDED.unit_price,
    updated_at = NOW();

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
WHERE i.item_code = 'M4X12-PLAIN-WASHER'
  AND v.vendor_code = 'DYNAMICINDUSTRIALSUP'
LIMIT 1
ON CONFLICT (item_id, vendor_id) DO UPDATE SET
    priority = EXCLUDED.priority,
    unit_price = EXCLUDED.unit_price,
    updated_at = NOW();

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
WHERE i.item_code = 'M4-SPRING-WASHER'
  AND v.vendor_code = 'DYNAMICINDUSTRIALSUP'
LIMIT 1
ON CONFLICT (item_id, vendor_id) DO UPDATE SET
    priority = EXCLUDED.priority,
    unit_price = EXCLUDED.unit_price,
    updated_at = NOW();

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
WHERE i.item_code = 'M4-NYLOCK'
  AND v.vendor_code = 'DYNAMICINDUSTRIALSUP'
LIMIT 1
ON CONFLICT (item_id, vendor_id) DO UPDATE SET
    priority = EXCLUDED.priority,
    unit_price = EXCLUDED.unit_price,
    updated_at = NOW();

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
WHERE i.item_code = 'M4-SQUARE-NUT'
  AND v.vendor_code = 'DYNAMICINDUSTRIALSUP'
LIMIT 1
ON CONFLICT (item_id, vendor_id) DO UPDATE SET
    priority = EXCLUDED.priority,
    unit_price = EXCLUDED.unit_price,
    updated_at = NOW();

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
WHERE i.item_code = 'M5X10-ALLEN-HEAD'
  AND v.vendor_code = 'DYNAMICINDUSTRIALSUP'
LIMIT 1
ON CONFLICT (item_id, vendor_id) DO UPDATE SET
    priority = EXCLUDED.priority,
    unit_price = EXCLUDED.unit_price,
    updated_at = NOW();

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
WHERE i.item_code = 'M5X10-PAN-TORX'
  AND v.vendor_code = 'DYNAMICINDUSTRIALSUP'
LIMIT 1
ON CONFLICT (item_id, vendor_id) DO UPDATE SET
    priority = EXCLUDED.priority,
    unit_price = EXCLUDED.unit_price,
    updated_at = NOW();

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
WHERE i.item_code = 'M5X10-GRUB-SCREW'
  AND v.vendor_code = 'DYNAMICINDUSTRIALSUP'
LIMIT 1
ON CONFLICT (item_id, vendor_id) DO UPDATE SET
    priority = EXCLUDED.priority,
    unit_price = EXCLUDED.unit_price,
    updated_at = NOW();

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
WHERE i.item_code = 'M6X150-ALLEN-HEAD'
  AND v.vendor_code = 'DYNAMICINDUSTRIALSUP'
LIMIT 1
ON CONFLICT (item_id, vendor_id) DO UPDATE SET
    priority = EXCLUDED.priority,
    unit_price = EXCLUDED.unit_price,
    updated_at = NOW();

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
WHERE i.item_code = 'M6-NYLOCK'
  AND v.vendor_code = 'DYNAMICINDUSTRIALSUP'
LIMIT 1
ON CONFLICT (item_id, vendor_id) DO UPDATE SET
    priority = EXCLUDED.priority,
    unit_price = EXCLUDED.unit_price,
    updated_at = NOW();

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
WHERE i.item_code = 'M6X15-PLAIN-WASHER'
  AND v.vendor_code = 'DYNAMICINDUSTRIALSUP'
LIMIT 1
ON CONFLICT (item_id, vendor_id) DO UPDATE SET
    priority = EXCLUDED.priority,
    unit_price = EXCLUDED.unit_price,
    updated_at = NOW();

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
WHERE i.item_code = 'M6X10-GRUB-SCREW'
  AND v.vendor_code = 'DYNAMICINDUSTRIALSUP'
LIMIT 1
ON CONFLICT (item_id, vendor_id) DO UPDATE SET
    priority = EXCLUDED.priority,
    unit_price = EXCLUDED.unit_price,
    updated_at = NOW();

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
WHERE i.item_code = 'BUTTON-HEAD-6X12'
  AND v.vendor_code = 'DYNAMICINDUSTRIALSUP'
LIMIT 1
ON CONFLICT (item_id, vendor_id) DO UPDATE SET
    priority = EXCLUDED.priority,
    unit_price = EXCLUDED.unit_price,
    updated_at = NOW();

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
WHERE i.item_code = 'M8X20-PLAIN-WASHER'
  AND v.vendor_code = 'DYNAMICINDUSTRIALSUP'
LIMIT 1
ON CONFLICT (item_id, vendor_id) DO UPDATE SET
    priority = EXCLUDED.priority,
    unit_price = EXCLUDED.unit_price,
    updated_at = NOW();

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
WHERE i.item_code = 'M8X25-ALLEN-HEAD'
  AND v.vendor_code = 'DYNAMICINDUSTRIALSUP'
LIMIT 1
ON CONFLICT (item_id, vendor_id) DO UPDATE SET
    priority = EXCLUDED.priority,
    unit_price = EXCLUDED.unit_price,
    updated_at = NOW();

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
WHERE i.item_code = 'CELLO-TAPE'
  AND v.vendor_code = 'LOCALMARKET'
LIMIT 1
ON CONFLICT (item_id, vendor_id) DO UPDATE SET
    priority = EXCLUDED.priority,
    unit_price = EXCLUDED.unit_price,
    updated_at = NOW();

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
WHERE i.item_code = 'COPPER-STRIPS-3X2'
  AND v.vendor_code = 'NAVEEN'
LIMIT 1
ON CONFLICT (item_id, vendor_id) DO UPDATE SET
    priority = EXCLUDED.priority,
    unit_price = EXCLUDED.unit_price,
    updated_at = NOW();

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
WHERE i.item_code = '70MM-PAPER-SEPARATOR'
  AND v.vendor_code = 'ARBACCESSORIES'
LIMIT 1
ON CONFLICT (item_id, vendor_id) DO UPDATE SET
    priority = EXCLUDED.priority,
    unit_price = EXCLUDED.unit_price,
    updated_at = NOW();

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
WHERE i.item_code = 'BARLEY-PAPER-FOR'
  AND v.vendor_code = 'ARBACCESSORIES'
LIMIT 1
ON CONFLICT (item_id, vendor_id) DO UPDATE SET
    priority = EXCLUDED.priority,
    unit_price = EXCLUDED.unit_price,
    updated_at = NOW();

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
WHERE i.item_code = '2S-BMS'
  AND v.vendor_code = 'ARBACCESSORIES'
LIMIT 1
ON CONFLICT (item_id, vendor_id) DO UPDATE SET
    priority = EXCLUDED.priority,
    unit_price = EXCLUDED.unit_price,
    updated_at = NOW();

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
WHERE i.item_code = '3S-BMS'
  AND v.vendor_code = 'ARBACCESSORIES'
LIMIT 1
ON CONFLICT (item_id, vendor_id) DO UPDATE SET
    priority = EXCLUDED.priority,
    unit_price = EXCLUDED.unit_price,
    updated_at = NOW();

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
WHERE i.item_code = '16AWG-LEAD'
  AND v.vendor_code = 'ARBACCESSORIES'
LIMIT 1
ON CONFLICT (item_id, vendor_id) DO UPDATE SET
    priority = EXCLUDED.priority,
    unit_price = EXCLUDED.unit_price,
    updated_at = NOW();

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
WHERE i.item_code = '130X80X60-ENCLOSURE-BOX'
  AND v.vendor_code = 'NDP'
LIMIT 1
ON CONFLICT (item_id, vendor_id) DO UPDATE SET
    priority = EXCLUDED.priority,
    unit_price = EXCLUDED.unit_price,
    updated_at = NOW();

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
WHERE i.item_code = 'PG7-CABLE-GLAND'
  AND v.vendor_code = 'NDP'
LIMIT 1
ON CONFLICT (item_id, vendor_id) DO UPDATE SET
    priority = EXCLUDED.priority,
    unit_price = EXCLUDED.unit_price,
    updated_at = NOW();

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
WHERE i.item_code = 'PG9-CABLE-GLANDPG'
  AND v.vendor_code = 'NDP'
LIMIT 1
ON CONFLICT (item_id, vendor_id) DO UPDATE SET
    priority = EXCLUDED.priority,
    unit_price = EXCLUDED.unit_price,
    updated_at = NOW();

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
WHERE i.item_code = 'SOLID-COUPLING-ALUMINIUM'
  AND v.vendor_code = 'BAGNAN'
LIMIT 1
ON CONFLICT (item_id, vendor_id) DO UPDATE SET
    priority = EXCLUDED.priority,
    unit_price = EXCLUDED.unit_price,
    updated_at = NOW();

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
WHERE i.item_code = 'ROTEX14-COUPLING'
  AND v.vendor_code = 'HIMALAYATRADERS'
LIMIT 1
ON CONFLICT (item_id, vendor_id) DO UPDATE SET
    priority = EXCLUDED.priority,
    unit_price = EXCLUDED.unit_price,
    updated_at = NOW();

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
WHERE i.item_code = 'ELECTRONIC-BOX'
  AND v.vendor_code = 'JANKIDIE'
LIMIT 1
ON CONFLICT (item_id, vendor_id) DO UPDATE SET
    priority = EXCLUDED.priority,
    unit_price = EXCLUDED.unit_price,
    updated_at = NOW();

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
WHERE i.item_code = 'FRONT-LID'
  AND v.vendor_code = 'JANKIDIE'
LIMIT 1
ON CONFLICT (item_id, vendor_id) DO UPDATE SET
    priority = EXCLUDED.priority,
    unit_price = EXCLUDED.unit_price,
    updated_at = NOW();

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
WHERE i.item_code = 'BOTTOM-BLOCK-INLET'
  AND v.vendor_code = 'JANKIDIE'
LIMIT 1
ON CONFLICT (item_id, vendor_id) DO UPDATE SET
    priority = EXCLUDED.priority,
    unit_price = EXCLUDED.unit_price,
    updated_at = NOW();

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
WHERE i.item_code = 'IP-REMOTE-UPPER'
  AND v.vendor_code = 'WEBEL'
LIMIT 1
ON CONFLICT (item_id, vendor_id) DO UPDATE SET
    priority = EXCLUDED.priority,
    unit_price = EXCLUDED.unit_price,
    updated_at = NOW();

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
WHERE i.item_code = 'IP-REMOTE-LOWER'
  AND v.vendor_code = 'WEBEL'
LIMIT 1
ON CONFLICT (item_id, vendor_id) DO UPDATE SET
    priority = EXCLUDED.priority,
    unit_price = EXCLUDED.unit_price,
    updated_at = NOW();

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
WHERE i.item_code = 'FLASHING-LIGHT-GLASS'
  AND v.vendor_code = 'JANKIDIE'
LIMIT 1
ON CONFLICT (item_id, vendor_id) DO UPDATE SET
    priority = EXCLUDED.priority,
    unit_price = EXCLUDED.unit_price,
    updated_at = NOW();

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
WHERE i.item_code = 'FLASHING-LIGHT-BOTTOM'
  AND v.vendor_code = 'JANKIDIE'
LIMIT 1
ON CONFLICT (item_id, vendor_id) DO UPDATE SET
    priority = EXCLUDED.priority,
    unit_price = EXCLUDED.unit_price,
    updated_at = NOW();

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
WHERE i.item_code = 'PU-GASKET-REMOTE'
  AND v.vendor_code = 'PRATHAMESHTECHNOLOGY'
LIMIT 1
ON CONFLICT (item_id, vendor_id) DO UPDATE SET
    priority = EXCLUDED.priority,
    unit_price = EXCLUDED.unit_price,
    updated_at = NOW();

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
WHERE i.item_code = 'PU-GASKET-ELECTRONIC'
  AND v.vendor_code = 'PRATHAMESHTECHNOLOGY'
LIMIT 1
ON CONFLICT (item_id, vendor_id) DO UPDATE SET
    priority = EXCLUDED.priority,
    unit_price = EXCLUDED.unit_price,
    updated_at = NOW();

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
WHERE i.item_code = 'PU-GASKET-FRONT'
  AND v.vendor_code = 'PRATHAMESHTECHNOLOGY'
LIMIT 1
ON CONFLICT (item_id, vendor_id) DO UPDATE SET
    priority = EXCLUDED.priority,
    unit_price = EXCLUDED.unit_price,
    updated_at = NOW();

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
WHERE i.item_code = 'HEATSHRINK-TUBE-6416'
  AND v.vendor_code = 'SUZHOUVOLSUNELECTRON'
LIMIT 1
ON CONFLICT (item_id, vendor_id) DO UPDATE SET
    priority = EXCLUDED.priority,
    unit_price = EXCLUDED.unit_price,
    updated_at = NOW();

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
WHERE i.item_code = 'HEATSHRINK-TUBE-93'
  AND v.vendor_code = 'SUZHOUVOLSUNELECTRON'
LIMIT 1
ON CONFLICT (item_id, vendor_id) DO UPDATE SET
    priority = EXCLUDED.priority,
    unit_price = EXCLUDED.unit_price,
    updated_at = NOW();

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
WHERE i.item_code = 'HEATSHRINK-TUBE-41'
  AND v.vendor_code = 'SUZHOUVOLSUNELECTRON'
LIMIT 1
ON CONFLICT (item_id, vendor_id) DO UPDATE SET
    priority = EXCLUDED.priority,
    unit_price = EXCLUDED.unit_price,
    updated_at = NOW();

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
WHERE i.item_code = 'HEATSHRINK-TUBE-31'
  AND v.vendor_code = 'SUZHOUVOLSUNELECTRON'
LIMIT 1
ON CONFLICT (item_id, vendor_id) DO UPDATE SET
    priority = EXCLUDED.priority,
    unit_price = EXCLUDED.unit_price,
    updated_at = NOW();

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
WHERE i.item_code = 'HEATSHRINK-TUBE-123'
  AND v.vendor_code = 'SUZHOUVOLSUNELECTRON'
LIMIT 1
ON CONFLICT (item_id, vendor_id) DO UPDATE SET
    priority = EXCLUDED.priority,
    unit_price = EXCLUDED.unit_price,
    updated_at = NOW();

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
WHERE i.item_code = 'HEATSHRINK-TUBE-4812'
  AND v.vendor_code = 'SUZHOUVOLSUNELECTRON'
LIMIT 1
ON CONFLICT (item_id, vendor_id) DO UPDATE SET
    priority = EXCLUDED.priority,
    unit_price = EXCLUDED.unit_price,
    updated_at = NOW();

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
WHERE i.item_code = 'HEATSHRINK-TUBE-15MM16MM'
  AND v.vendor_code = 'SUZHOUVOLSUNELECTRON'
LIMIT 1
ON CONFLICT (item_id, vendor_id) DO UPDATE SET
    priority = EXCLUDED.priority,
    unit_price = EXCLUDED.unit_price,
    updated_at = NOW();

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
WHERE i.item_code = 'HEATSHRINK-TUBE-100MM'
  AND v.vendor_code = 'SUZHOUVOLSUNELECTRON'
LIMIT 1
ON CONFLICT (item_id, vendor_id) DO UPDATE SET
    priority = EXCLUDED.priority,
    unit_price = EXCLUDED.unit_price,
    updated_at = NOW();

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
WHERE i.item_code = 'HEATSINK-PASTE'
  AND v.vendor_code = 'HITECH'
LIMIT 1
ON CONFLICT (item_id, vendor_id) DO UPDATE SET
    priority = EXCLUDED.priority,
    unit_price = EXCLUDED.unit_price,
    updated_at = NOW();

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
WHERE i.item_code = 'TEROSON-MS930'
  AND v.vendor_code = 'INNOVINETECHMARKETIN'
LIMIT 1
ON CONFLICT (item_id, vendor_id) DO UPDATE SET
    priority = EXCLUDED.priority,
    unit_price = EXCLUDED.unit_price,
    updated_at = NOW();

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
WHERE i.item_code = 'SILICON-RTV-732'
  AND v.vendor_code = 'HITECH'
LIMIT 1
ON CONFLICT (item_id, vendor_id) DO UPDATE SET
    priority = EXCLUDED.priority,
    unit_price = EXCLUDED.unit_price,
    updated_at = NOW();

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
WHERE i.item_code = 'SILICON-RTV-734'
  AND v.vendor_code = 'HITECH'
LIMIT 1
ON CONFLICT (item_id, vendor_id) DO UPDATE SET
    priority = EXCLUDED.priority,
    unit_price = EXCLUDED.unit_price,
    updated_at = NOW();

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
WHERE i.item_code = '1-MASKING-TAPE'
  AND v.vendor_code = 'HITECH'
LIMIT 1
ON CONFLICT (item_id, vendor_id) DO UPDATE SET
    priority = EXCLUDED.priority,
    unit_price = EXCLUDED.unit_price,
    updated_at = NOW();

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
WHERE i.item_code = 'RR-TAPE'
  AND v.vendor_code = 'HITECH'
LIMIT 1
ON CONFLICT (item_id, vendor_id) DO UPDATE SET
    priority = EXCLUDED.priority,
    unit_price = EXCLUDED.unit_price,
    updated_at = NOW();

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
WHERE i.item_code = 'FLEXBOND'
  AND v.vendor_code = 'HITECH'
LIMIT 1
ON CONFLICT (item_id, vendor_id) DO UPDATE SET
    priority = EXCLUDED.priority,
    unit_price = EXCLUDED.unit_price,
    updated_at = NOW();

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
WHERE i.item_code = 'STAPLES-PINS'
  AND v.vendor_code = 'HITECH'
LIMIT 1
ON CONFLICT (item_id, vendor_id) DO UPDATE SET
    priority = EXCLUDED.priority,
    unit_price = EXCLUDED.unit_price,
    updated_at = NOW();

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
WHERE i.item_code = 'BRASS-NOZZLE-FOR'
  AND v.vendor_code = 'ALIHUSSAINBHARMAL'
LIMIT 1
ON CONFLICT (item_id, vendor_id) DO UPDATE SET
    priority = EXCLUDED.priority,
    unit_price = EXCLUDED.unit_price,
    updated_at = NOW();

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
WHERE i.item_code = 'SS-COOLING-WATER'
  AND v.vendor_code = 'ALIHUSSAINBHARMAL'
LIMIT 1
ON CONFLICT (item_id, vendor_id) DO UPDATE SET
    priority = EXCLUDED.priority,
    unit_price = EXCLUDED.unit_price,
    updated_at = NOW();

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
WHERE i.item_code = 'SS-COOLING-WATER'
  AND v.vendor_code = 'ALIHUSSAINBHARMAL'
LIMIT 1
ON CONFLICT (item_id, vendor_id) DO UPDATE SET
    priority = EXCLUDED.priority,
    unit_price = EXCLUDED.unit_price,
    updated_at = NOW();

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
WHERE i.item_code = 'GREASING-NOZZLE'
  AND v.vendor_code = 'ALIHUSSAINBHARMAL'
LIMIT 1
ON CONFLICT (item_id, vendor_id) DO UPDATE SET
    priority = EXCLUDED.priority,
    unit_price = EXCLUDED.unit_price,
    updated_at = NOW();

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
WHERE i.item_code = 'NOZZLE-ON-JET'
  AND v.vendor_code = 'ALIHUSSAINBHARMAL'
LIMIT 1
ON CONFLICT (item_id, vendor_id) DO UPDATE SET
    priority = EXCLUDED.priority,
    unit_price = EXCLUDED.unit_price,
    updated_at = NOW();

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
WHERE i.item_code = 'SILICON-HOSE-PIPE'
  AND v.vendor_code = 'LOCALMARKETKOLKATA'
LIMIT 1
ON CONFLICT (item_id, vendor_id) DO UPDATE SET
    priority = EXCLUDED.priority,
    unit_price = EXCLUDED.unit_price,
    updated_at = NOW();

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
WHERE i.item_code = 'WATER-JET-S52'
  AND v.vendor_code = 'BAGNAN'
LIMIT 1
ON CONFLICT (item_id, vendor_id) DO UPDATE SET
    priority = EXCLUDED.priority,
    unit_price = EXCLUDED.unit_price,
    updated_at = NOW();

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
WHERE i.item_code = 'ESC-MOUNTING-PLATE'
  AND v.vendor_code = 'BALAJIPBMANUFACTURIN'
LIMIT 1
ON CONFLICT (item_id, vendor_id) DO UPDATE SET
    priority = EXCLUDED.priority,
    unit_price = EXCLUDED.unit_price,
    updated_at = NOW();

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
WHERE i.item_code = 'JET-S52-MOUNTING'
  AND v.vendor_code = 'BAGNAN'
LIMIT 1
ON CONFLICT (item_id, vendor_id) DO UPDATE SET
    priority = EXCLUDED.priority,
    unit_price = EXCLUDED.unit_price,
    updated_at = NOW();

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
WHERE i.item_code = 'MOTOR-MOUNT-HEATBLOCK'
  AND v.vendor_code = 'BAGNAN'
LIMIT 1
ON CONFLICT (item_id, vendor_id) DO UPDATE SET
    priority = EXCLUDED.priority,
    unit_price = EXCLUDED.unit_price,
    updated_at = NOW();

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
WHERE i.item_code = 'MOTOR-MOUNT-HEATBLOCK'
  AND v.vendor_code = 'BAGNAN'
LIMIT 1
ON CONFLICT (item_id, vendor_id) DO UPDATE SET
    priority = EXCLUDED.priority,
    unit_price = EXCLUDED.unit_price,
    updated_at = NOW();

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
WHERE i.item_code = 'ALUMINIUM-SHEET-2MM'
  AND v.vendor_code = 'LOCALMARKET'
LIMIT 1
ON CONFLICT (item_id, vendor_id) DO UPDATE SET
    priority = EXCLUDED.priority,
    unit_price = EXCLUDED.unit_price,
    updated_at = NOW();

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
WHERE i.item_code = 'HEAT-CONDENSORJET-HEAT'
  AND v.vendor_code = 'BAGNAN'
LIMIT 1
ON CONFLICT (item_id, vendor_id) DO UPDATE SET
    priority = EXCLUDED.priority,
    unit_price = EXCLUDED.unit_price,
    updated_at = NOW();

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
WHERE i.item_code = 'COPPER-HEAT-PIPE'
  AND v.vendor_code = 'SVTHERMTECHNOLOGIES'
LIMIT 1
ON CONFLICT (item_id, vendor_id) DO UPDATE SET
    priority = EXCLUDED.priority,
    unit_price = EXCLUDED.unit_price,
    updated_at = NOW();

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
WHERE i.item_code = 'STBD-AFT-PLATE'
  AND v.vendor_code = 'BALAJIPBMANUFACTURIN'
LIMIT 1
ON CONFLICT (item_id, vendor_id) DO UPDATE SET
    priority = EXCLUDED.priority,
    unit_price = EXCLUDED.unit_price,
    updated_at = NOW();

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
WHERE i.item_code = 'PORT-AFT-PLATE'
  AND v.vendor_code = 'BALAJIPBMANUFACTURIN'
LIMIT 1
ON CONFLICT (item_id, vendor_id) DO UPDATE SET
    priority = EXCLUDED.priority,
    unit_price = EXCLUDED.unit_price,
    updated_at = NOW();

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
WHERE i.item_code = '3D-PRINTED-SR'
  AND v.vendor_code = 'ROBU3DPRINT'
LIMIT 1
ON CONFLICT (item_id, vendor_id) DO UPDATE SET
    priority = EXCLUDED.priority,
    unit_price = EXCLUDED.unit_price,
    updated_at = NOW();

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
WHERE i.item_code = '3D-PRINTED-SR'
  AND v.vendor_code = 'ROBU3DPRINT'
LIMIT 1
ON CONFLICT (item_id, vendor_id) DO UPDATE SET
    priority = EXCLUDED.priority,
    unit_price = EXCLUDED.unit_price,
    updated_at = NOW();

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
WHERE i.item_code = '3D-PRINTED-BOTTOM'
  AND v.vendor_code = 'ROBU3DPRINT'
LIMIT 1
ON CONFLICT (item_id, vendor_id) DO UPDATE SET
    priority = EXCLUDED.priority,
    unit_price = EXCLUDED.unit_price,
    updated_at = NOW();

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
WHERE i.item_code = 'BUTTON-SPACER-NO'
  AND v.vendor_code = 'INHOUSE'
LIMIT 1
ON CONFLICT (item_id, vendor_id) DO UPDATE SET
    priority = EXCLUDED.priority,
    unit_price = EXCLUDED.unit_price,
    updated_at = NOW();

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
WHERE i.item_code = 'BUTTON-SPACER-NO'
  AND v.vendor_code = 'INHOUSE'
LIMIT 1
ON CONFLICT (item_id, vendor_id) DO UPDATE SET
    priority = EXCLUDED.priority,
    unit_price = EXCLUDED.unit_price,
    updated_at = NOW();

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
WHERE i.item_code = 'BUTTON-SPACER-NO'
  AND v.vendor_code = 'INHOUSE'
LIMIT 1
ON CONFLICT (item_id, vendor_id) DO UPDATE SET
    priority = EXCLUDED.priority,
    unit_price = EXCLUDED.unit_price,
    updated_at = NOW();

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
WHERE i.item_code = 'BUTTON-NO-1'
  AND v.vendor_code = 'INHOUSE'
LIMIT 1
ON CONFLICT (item_id, vendor_id) DO UPDATE SET
    priority = EXCLUDED.priority,
    unit_price = EXCLUDED.unit_price,
    updated_at = NOW();

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
WHERE i.item_code = 'REMOTE-BATTERY-HOLDING'
  AND v.vendor_code = 'INHOUSE'
LIMIT 1
ON CONFLICT (item_id, vendor_id) DO UPDATE SET
    priority = EXCLUDED.priority,
    unit_price = EXCLUDED.unit_price,
    updated_at = NOW();

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
WHERE i.item_code = 'ANTENNA-CLAMP-1'
  AND v.vendor_code = 'INHOUSE'
LIMIT 1
ON CONFLICT (item_id, vendor_id) DO UPDATE SET
    priority = EXCLUDED.priority,
    unit_price = EXCLUDED.unit_price,
    updated_at = NOW();

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
WHERE i.item_code = 'ANTENNA-CLAMP-2'
  AND v.vendor_code = 'INHOUSE'
LIMIT 1
ON CONFLICT (item_id, vendor_id) DO UPDATE SET
    priority = EXCLUDED.priority,
    unit_price = EXCLUDED.unit_price,
    updated_at = NOW();

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
WHERE i.item_code = 'ROTARY-KNOB-BOX'
  AND v.vendor_code = 'ROBU3DPRINT'
LIMIT 1
ON CONFLICT (item_id, vendor_id) DO UPDATE SET
    priority = EXCLUDED.priority,
    unit_price = EXCLUDED.unit_price,
    updated_at = NOW();

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
WHERE i.item_code = 'IFU-3D-MIDDLE'
  AND v.vendor_code = 'WEBEL'
LIMIT 1
ON CONFLICT (item_id, vendor_id) DO UPDATE SET
    priority = EXCLUDED.priority,
    unit_price = EXCLUDED.unit_price,
    updated_at = NOW();

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
WHERE i.item_code = 'MOTOR-5692-495'
  AND v.vendor_code = 'LEOPARD'
LIMIT 1
ON CONFLICT (item_id, vendor_id) DO UPDATE SET
    priority = EXCLUDED.priority,
    unit_price = EXCLUDED.unit_price,
    updated_at = NOW();

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
WHERE i.item_code = 'HV130-ESC'
  AND v.vendor_code = 'HOBBYWING'
LIMIT 1
ON CONFLICT (item_id, vendor_id) DO UPDATE SET
    priority = EXCLUDED.priority,
    unit_price = EXCLUDED.unit_price,
    updated_at = NOW();

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
WHERE i.item_code = '8-MM-OD'
  AND v.vendor_code = 'POPULARPNUEMATIC'
LIMIT 1
ON CONFLICT (item_id, vendor_id) DO UPDATE SET
    priority = EXCLUDED.priority,
    unit_price = EXCLUDED.unit_price,
    updated_at = NOW();

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
WHERE i.item_code = '8-MM-OD'
  AND v.vendor_code = 'HYDROPNUEMATIC'
LIMIT 1
ON CONFLICT (item_id, vendor_id) DO UPDATE SET
    priority = EXCLUDED.priority,
    unit_price = EXCLUDED.unit_price,
    updated_at = NOW();

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
WHERE i.item_code = '12-TO-8'
  AND v.vendor_code = 'POPULARPNUEMATIC'
LIMIT 1
ON CONFLICT (item_id, vendor_id) DO UPDATE SET
    priority = EXCLUDED.priority,
    unit_price = EXCLUDED.unit_price,
    updated_at = NOW();

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
WHERE i.item_code = '12-TO-8'
  AND v.vendor_code = 'HYDROPNUEMATIC'
LIMIT 1
ON CONFLICT (item_id, vendor_id) DO UPDATE SET
    priority = EXCLUDED.priority,
    unit_price = EXCLUDED.unit_price,
    updated_at = NOW();

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
WHERE i.item_code = '12MM-OD-PNEUMATIC'
  AND v.vendor_code = 'POPULARPNUEMATIC'
LIMIT 1
ON CONFLICT (item_id, vendor_id) DO UPDATE SET
    priority = EXCLUDED.priority,
    unit_price = EXCLUDED.unit_price,
    updated_at = NOW();

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
WHERE i.item_code = '12MM-OD-PNEUMATIC'
  AND v.vendor_code = 'HYDROPNUEMATIC'
LIMIT 1
ON CONFLICT (item_id, vendor_id) DO UPDATE SET
    priority = EXCLUDED.priority,
    unit_price = EXCLUDED.unit_price,
    updated_at = NOW();

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
WHERE i.item_code = 'POLYCARBONATE-GLASS-FOR'
  AND v.vendor_code = 'LOCALMARKET'
LIMIT 1
ON CONFLICT (item_id, vendor_id) DO UPDATE SET
    priority = EXCLUDED.priority,
    unit_price = EXCLUDED.unit_price,
    updated_at = NOW();

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
WHERE i.item_code = '55-NO-BOX'
  AND v.vendor_code = 'LOCALMARKET'
LIMIT 1
ON CONFLICT (item_id, vendor_id) DO UPDATE SET
    priority = EXCLUDED.priority,
    unit_price = EXCLUDED.unit_price,
    updated_at = NOW();

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
WHERE i.item_code = '22-NO-BOX'
  AND v.vendor_code = 'LOCALMARKET'
LIMIT 1
ON CONFLICT (item_id, vendor_id) DO UPDATE SET
    priority = EXCLUDED.priority,
    unit_price = EXCLUDED.unit_price,
    updated_at = NOW();

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
WHERE i.item_code = 'BOTTOM-MESH-120MM'
  AND v.vendor_code = 'JAINWIRENETTING'
LIMIT 1
ON CONFLICT (item_id, vendor_id) DO UPDATE SET
    priority = EXCLUDED.priority,
    unit_price = EXCLUDED.unit_price,
    updated_at = NOW();

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
WHERE i.item_code = 'AIR-NOZZLE'
  AND v.vendor_code = 'LOCALMARKET'
LIMIT 1
ON CONFLICT (item_id, vendor_id) DO UPDATE SET
    priority = EXCLUDED.priority,
    unit_price = EXCLUDED.unit_price,
    updated_at = NOW();

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
WHERE i.item_code = 'ACETONE'
  AND v.vendor_code = 'LOCALMARKET'
LIMIT 1
ON CONFLICT (item_id, vendor_id) DO UPDATE SET
    priority = EXCLUDED.priority,
    unit_price = EXCLUDED.unit_price,
    updated_at = NOW();

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
WHERE i.item_code = 'IPA'
  AND v.vendor_code = 'LOCALMARKET'
LIMIT 1
ON CONFLICT (item_id, vendor_id) DO UPDATE SET
    priority = EXCLUDED.priority,
    unit_price = EXCLUDED.unit_price,
    updated_at = NOW();

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
WHERE i.item_code = 'POLY-URETHANE-FOAM'
  AND v.vendor_code = 'LOCALMARKET'
LIMIT 1
ON CONFLICT (item_id, vendor_id) DO UPDATE SET
    priority = EXCLUDED.priority,
    unit_price = EXCLUDED.unit_price,
    updated_at = NOW();

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
WHERE i.item_code = 'SILICON-HOSE-4MM'
  AND v.vendor_code = 'DOLPHINRUBBER'
LIMIT 1
ON CONFLICT (item_id, vendor_id) DO UPDATE SET
    priority = EXCLUDED.priority,
    unit_price = EXCLUDED.unit_price,
    updated_at = NOW();

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
WHERE i.item_code = 'SILICON-HOSE-3MM'
  AND v.vendor_code = 'DOLPHINRUBBER'
LIMIT 1
ON CONFLICT (item_id, vendor_id) DO UPDATE SET
    priority = EXCLUDED.priority,
    unit_price = EXCLUDED.unit_price,
    updated_at = NOW();

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
WHERE i.item_code = '6MMX12MM-RUBBER-BUSH'
  AND v.vendor_code = 'DOLPHINRUBBER'
LIMIT 1
ON CONFLICT (item_id, vendor_id) DO UPDATE SET
    priority = EXCLUDED.priority,
    unit_price = EXCLUDED.unit_price,
    updated_at = NOW();

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
WHERE i.item_code = 'JOYSTICK-WATER-PROOF'
  AND v.vendor_code = 'DOLPHINRUBBER'
LIMIT 1
ON CONFLICT (item_id, vendor_id) DO UPDATE SET
    priority = EXCLUDED.priority,
    unit_price = EXCLUDED.unit_price,
    updated_at = NOW();

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
WHERE i.item_code = 'BUTTON-SILICON-COVER'
  AND v.vendor_code = 'DOLPHINRUBBER'
LIMIT 1
ON CONFLICT (item_id, vendor_id) DO UPDATE SET
    priority = EXCLUDED.priority,
    unit_price = EXCLUDED.unit_price,
    updated_at = NOW();

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
WHERE i.item_code = 'BUTTON-SILICON-COVER'
  AND v.vendor_code = 'DOLPHINRUBBER'
LIMIT 1
ON CONFLICT (item_id, vendor_id) DO UPDATE SET
    priority = EXCLUDED.priority,
    unit_price = EXCLUDED.unit_price,
    updated_at = NOW();

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
WHERE i.item_code = '3MM-SILICON-RUBBER'
  AND v.vendor_code = 'DOLPHINRUBBER'
LIMIT 1
ON CONFLICT (item_id, vendor_id) DO UPDATE SET
    priority = EXCLUDED.priority,
    unit_price = EXCLUDED.unit_price,
    updated_at = NOW();

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
WHERE i.item_code = 'THREAD-LOCKER-242'
  AND v.vendor_code = 'ELEGANTENTERPRISES'
LIMIT 1
ON CONFLICT (item_id, vendor_id) DO UPDATE SET
    priority = EXCLUDED.priority,
    unit_price = EXCLUDED.unit_price,
    updated_at = NOW();

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
WHERE i.item_code = 'THREAD-LOCKER-ACTIVATOR'
  AND v.vendor_code = 'ELEGANTENTERPRISES'
LIMIT 1
ON CONFLICT (item_id, vendor_id) DO UPDATE SET
    priority = EXCLUDED.priority,
    unit_price = EXCLUDED.unit_price,
    updated_at = NOW();

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
WHERE i.item_code = 'INSTANT-ADHESIVE-407'
  AND v.vendor_code = 'ELEGANTENTERPRISES'
LIMIT 1
ON CONFLICT (item_id, vendor_id) DO UPDATE SET
    priority = EXCLUDED.priority,
    unit_price = EXCLUDED.unit_price,
    updated_at = NOW();

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
WHERE i.item_code = 'ORING-AFT-PLATE'
  AND v.vendor_code = 'ALIIRANIKOLKATA'
LIMIT 1
ON CONFLICT (item_id, vendor_id) DO UPDATE SET
    priority = EXCLUDED.priority,
    unit_price = EXCLUDED.unit_price,
    updated_at = NOW();

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
WHERE i.item_code = 'STBD-SR-RUBBER'
  AND v.vendor_code = 'WEBEL'
LIMIT 1
ON CONFLICT (item_id, vendor_id) DO UPDATE SET
    priority = EXCLUDED.priority,
    unit_price = EXCLUDED.unit_price,
    updated_at = NOW();

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
WHERE i.item_code = 'PORT-SR-RUBBER'
  AND v.vendor_code = 'WEBEL'
LIMIT 1
ON CONFLICT (item_id, vendor_id) DO UPDATE SET
    priority = EXCLUDED.priority,
    unit_price = EXCLUDED.unit_price,
    updated_at = NOW();

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
WHERE i.item_code = 'SAIFSEAS-NECK-STRAP'
  AND v.vendor_code = 'LOCALMARKET'
LIMIT 1
ON CONFLICT (item_id, vendor_id) DO UPDATE SET
    priority = EXCLUDED.priority,
    unit_price = EXCLUDED.unit_price,
    updated_at = NOW();

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
WHERE i.item_code = 'HOOK-STICKER-STBD'
  AND v.vendor_code = 'ATTITUDEMASTERVIZAG'
LIMIT 1
ON CONFLICT (item_id, vendor_id) DO UPDATE SET
    priority = EXCLUDED.priority,
    unit_price = EXCLUDED.unit_price,
    updated_at = NOW();

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
WHERE i.item_code = 'HOOK-STIKER-PORT'
  AND v.vendor_code = 'ATTITUDEMASTERVIZAG'
LIMIT 1
ON CONFLICT (item_id, vendor_id) DO UPDATE SET
    priority = EXCLUDED.priority,
    unit_price = EXCLUDED.unit_price,
    updated_at = NOW();

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
WHERE i.item_code = 'HOLD-HERE-STICKER'
  AND v.vendor_code = 'ATTITUDEMASTERVIZAG'
LIMIT 1
ON CONFLICT (item_id, vendor_id) DO UPDATE SET
    priority = EXCLUDED.priority,
    unit_price = EXCLUDED.unit_price,
    updated_at = NOW();

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
WHERE i.item_code = 'HOLD-HERE-STICKER'
  AND v.vendor_code = 'ATTITUDEMASTERVIZAG'
LIMIT 1
ON CONFLICT (item_id, vendor_id) DO UPDATE SET
    priority = EXCLUDED.priority,
    unit_price = EXCLUDED.unit_price,
    updated_at = NOW();

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
WHERE i.item_code = 'CRAFT-CLEANING-NOTIFY'
  AND v.vendor_code = 'ATTITUDEMASTERVIZAG'
LIMIT 1
ON CONFLICT (item_id, vendor_id) DO UPDATE SET
    priority = EXCLUDED.priority,
    unit_price = EXCLUDED.unit_price,
    updated_at = NOW();

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
WHERE i.item_code = 'FERROLE'
  AND v.vendor_code = 'COMMERCIALENGINEERIN'
LIMIT 1
ON CONFLICT (item_id, vendor_id) DO UPDATE SET
    priority = EXCLUDED.priority,
    unit_price = EXCLUDED.unit_price,
    updated_at = NOW();

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
WHERE i.item_code = 'ROPE-8MM'
  AND v.vendor_code = 'LOCALMARKETKOLKATA'
LIMIT 1
ON CONFLICT (item_id, vendor_id) DO UPDATE SET
    priority = EXCLUDED.priority,
    unit_price = EXCLUDED.unit_price,
    updated_at = NOW();

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
WHERE i.item_code = 'USER-MANUAL'
  AND v.vendor_code = 'LOCALMARKETKOLKATA'
LIMIT 1
ON CONFLICT (item_id, vendor_id) DO UPDATE SET
    priority = EXCLUDED.priority,
    unit_price = EXCLUDED.unit_price,
    updated_at = NOW();

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
WHERE i.item_code = 'ENVELOPE-FOR-USER'
  AND v.vendor_code = 'LOCALMARKET'
LIMIT 1
ON CONFLICT (item_id, vendor_id) DO UPDATE SET
    priority = EXCLUDED.priority,
    unit_price = EXCLUDED.unit_price,
    updated_at = NOW();

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
WHERE i.item_code = 'SURGICAL-GLOVES'
  AND v.vendor_code = 'LOCALMARKET'
LIMIT 1
ON CONFLICT (item_id, vendor_id) DO UPDATE SET
    priority = EXCLUDED.priority,
    unit_price = EXCLUDED.unit_price,
    updated_at = NOW();

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
WHERE i.item_code = 'X16-EXTENSION-PANEL'
  AND v.vendor_code = 'WEBEL'
LIMIT 1
ON CONFLICT (item_id, vendor_id) DO UPDATE SET
    priority = EXCLUDED.priority,
    unit_price = EXCLUDED.unit_price,
    updated_at = NOW();



-- ============================================================================
-- INSERT BOMS (Sub-Assembly Bill of Materials)
-- ============================================================================

-- BOM for Jet Motor Assy
INSERT INTO bom_headers (bom_number, item_id, version, status, is_multi_level, created_at, updated_at)
SELECT 'BOM-JET-MOTOR-ASSY', id, '1.0', 'ACTIVE', false, NOW(), NOW()
FROM items 
WHERE item_name = 'Jet Motor Assy' AND category IN ('SA', 'FG')
LIMIT 1
ON CONFLICT (bom_number) DO NOTHING;

INSERT INTO bom_items (bom_id, item_id, quantity, uom, created_at, updated_at)
SELECT 
    bh.id,
    i.id,
    1.0,
    '0.0',
    NOW(),
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.bom_number = 'BOM-JET-MOTOR-ASSY'
  AND i.item_name = 'Coupling Hood'
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO bom_items (bom_id, item_id, quantity, uom, created_at, updated_at)
SELECT 
    bh.id,
    i.id,
    2.0,
    '120.0',
    NOW(),
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.bom_number = 'BOM-JET-MOTOR-ASSY'
  AND i.item_name = 'Battery Clamp'
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO bom_items (bom_id, item_id, quantity, uom, created_at, updated_at)
SELECT 
    bh.id,
    i.id,
    4.0,
    'PCS',
    NOW(),
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.bom_number = 'BOM-JET-MOTOR-ASSY'
  AND i.item_name = 'M4x25 Hex Head'
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO bom_items (bom_id, item_id, quantity, uom, created_at, updated_at)
SELECT 
    bh.id,
    i.id,
    7.0,
    '2.0',
    NOW(),
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.bom_number = 'BOM-JET-MOTOR-ASSY'
  AND i.item_name = 'M4 Square Nut'
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO bom_items (bom_id, item_id, quantity, uom, created_at, updated_at)
SELECT 
    bh.id,
    i.id,
    16.0,
    'PCS',
    NOW(),
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.bom_number = 'BOM-JET-MOTOR-ASSY'
  AND i.item_name = 'M4 Nyloc'
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO bom_items (bom_id, item_id, quantity, uom, created_at, updated_at)
SELECT 
    bh.id,
    i.id,
    20.0,
    '350.0',
    NOW(),
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.bom_number = 'BOM-JET-MOTOR-ASSY'
  AND i.item_name = 'M4 Spring washer'
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO bom_items (bom_id, item_id, quantity, uom, created_at, updated_at)
SELECT 
    bh.id,
    i.id,
    24.0,
    '400.0',
    NOW(),
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.bom_number = 'BOM-JET-MOTOR-ASSY'
  AND i.item_name = 'M4x12 plain washer'
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO bom_items (bom_id, item_id, quantity, uom, created_at, updated_at)
SELECT 
    bh.id,
    i.id,
    4.0,
    'PCS',
    NOW(),
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.bom_number = 'BOM-JET-MOTOR-ASSY'
  AND i.item_name = 'M4x16 CSK Phillips'
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO bom_items (bom_id, item_id, quantity, uom, created_at, updated_at)
SELECT 
    bh.id,
    i.id,
    1,
    'PCS',
    NOW(),
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.bom_number = 'BOM-JET-MOTOR-ASSY'
  AND i.item_name = 'M4x10 CSK Phillips'
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO bom_items (bom_id, item_id, quantity, uom, created_at, updated_at)
SELECT 
    bh.id,
    i.id,
    8.0,
    '186.0',
    NOW(),
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.bom_number = 'BOM-JET-MOTOR-ASSY'
  AND i.item_name = 'M4x20 CSK Phillips'
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO bom_items (bom_id, item_id, quantity, uom, created_at, updated_at)
SELECT 
    bh.id,
    i.id,
    2.0,
    'PCS',
    NOW(),
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.bom_number = 'BOM-JET-MOTOR-ASSY'
  AND i.item_name = 'Grub M6x10 SS (Coupling tightening)'
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO bom_items (bom_id, item_id, quantity, uom, created_at, updated_at)
SELECT 
    bh.id,
    i.id,
    1.0,
    '-34.0',
    NOW(),
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.bom_number = 'BOM-JET-MOTOR-ASSY'
  AND i.item_name = 'Rotex14 Coupling'
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO bom_items (bom_id, item_id, quantity, uom, created_at, updated_at)
SELECT 
    bh.id,
    i.id,
    15.0,
    '1481.0',
    NOW(),
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.bom_number = 'BOM-JET-MOTOR-ASSY'
  AND i.item_name = 'Teroson MS930'
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO bom_items (bom_id, item_id, quantity, uom, created_at, updated_at)
SELECT 
    bh.id,
    i.id,
    1.0,
    '-45.0',
    NOW(),
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.bom_number = 'BOM-JET-MOTOR-ASSY'
  AND i.item_name = 'Nozzle on Jet'
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO bom_items (bom_id, item_id, quantity, uom, created_at, updated_at)
SELECT 
    bh.id,
    i.id,
    1.0,
    '-247.0',
    NOW(),
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.bom_number = 'BOM-JET-MOTOR-ASSY'
  AND i.item_name = 'Silicon hose pipe clip 7mm'
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO bom_items (bom_id, item_id, quantity, uom, created_at, updated_at)
SELECT 
    bh.id,
    i.id,
    1.0,
    'PCS',
    NOW(),
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.bom_number = 'BOM-JET-MOTOR-ASSY'
  AND i.item_name = 'Water Jet pump Jet S52'
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO bom_items (bom_id, item_id, quantity, uom, created_at, updated_at)
SELECT 
    bh.id,
    i.id,
    1.0,
    '-13.0',
    NOW(),
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.bom_number = 'BOM-JET-MOTOR-ASSY'
  AND i.item_name = 'ESC Mounting Plate'
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO bom_items (bom_id, item_id, quantity, uom, created_at, updated_at)
SELECT 
    bh.id,
    i.id,
    1.0,
    '60.0',
    NOW(),
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.bom_number = 'BOM-JET-MOTOR-ASSY'
  AND i.item_name = 'Jet S52 Mounting plate'
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO bom_items (bom_id, item_id, quantity, uom, created_at, updated_at)
SELECT 
    bh.id,
    i.id,
    2.0,
    'PCS',
    NOW(),
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.bom_number = 'BOM-JET-MOTOR-ASSY'
  AND i.item_name = 'Motor Mount 5692'
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO bom_items (bom_id, item_id, quantity, uom, created_at, updated_at)
SELECT 
    bh.id,
    i.id,
    1.0,
    '-33.0',
    NOW(),
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.bom_number = 'BOM-JET-MOTOR-ASSY'
  AND i.item_name = 'Motor 5692 495 KV'
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO bom_items (bom_id, item_id, quantity, uom, created_at, updated_at)
SELECT 
    bh.id,
    i.id,
    1.0,
    'PCS',
    NOW(),
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.bom_number = 'BOM-JET-MOTOR-ASSY'
  AND i.item_name = 'Motor Cooling Jacket 56mm x 50mm'
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO bom_items (bom_id, item_id, quantity, uom, created_at, updated_at)
SELECT 
    bh.id,
    i.id,
    0.2,
    '-1.0',
    NOW(),
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.bom_number = 'BOM-JET-MOTOR-ASSY'
  AND i.item_name = 'Silicon Hose 4mm x 8mm'
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO bom_items (bom_id, item_id, quantity, uom, created_at, updated_at)
SELECT 
    bh.id,
    i.id,
    0.75,
    '-1.0',
    NOW(),
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.bom_number = 'BOM-JET-MOTOR-ASSY'
  AND i.item_name = 'Silicon Hose 3mm x 6mm'
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO bom_items (bom_id, item_id, quantity, uom, created_at, updated_at)
SELECT 
    bh.id,
    i.id,
    2.0,
    'PCS',
    NOW(),
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.bom_number = 'BOM-JET-MOTOR-ASSY'
  AND i.item_name = 'Thread locker 242/270/290'
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO bom_items (bom_id, item_id, quantity, uom, created_at, updated_at)
SELECT 
    bh.id,
    i.id,
    2.0,
    '57.0',
    NOW(),
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.bom_number = 'BOM-JET-MOTOR-ASSY'
  AND i.item_name = 'Thread locker Activator'
LIMIT 1
ON CONFLICT DO NOTHING;

-- BOM for STBD_ESC Assy
INSERT INTO bom_headers (bom_number, item_id, version, status, is_multi_level, created_at, updated_at)
SELECT 'BOM-STBDESC-ASSY', id, '1.0', 'ACTIVE', false, NOW(), NOW()
FROM items 
WHERE item_name = 'STBD_ESC Assy' AND category IN ('SA', 'FG')
LIMIT 1
ON CONFLICT (bom_number) DO NOTHING;

INSERT INTO bom_items (bom_id, item_id, quantity, uom, created_at, updated_at)
SELECT 
    bh.id,
    i.id,
    1.0,
    '-7.0',
    NOW(),
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.bom_number = 'BOM-STBDESC-ASSY'
  AND i.item_name = '5.5mm Female Bullet connector'
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO bom_items (bom_id, item_id, quantity, uom, created_at, updated_at)
SELECT 
    bh.id,
    i.id,
    2.0,
    '-151.0',
    NOW(),
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.bom_number = 'BOM-STBDESC-ASSY'
  AND i.item_name = '4mm Male Bullet connector'
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO bom_items (bom_id, item_id, quantity, uom, created_at, updated_at)
SELECT 
    bh.id,
    i.id,
    1.0,
    '-96.0',
    NOW(),
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.bom_number = 'BOM-STBDESC-ASSY'
  AND i.item_name = '4mm Female Bullet connector'
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO bom_items (bom_id, item_id, quantity, uom, created_at, updated_at)
SELECT 
    bh.id,
    i.id,
    0.55,
    'PCS',
    NOW(),
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.bom_number = 'BOM-STBDESC-ASSY'
  AND i.item_name = 'Black 12AWG'
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO bom_items (bom_id, item_id, quantity, uom, created_at, updated_at)
SELECT 
    bh.id,
    i.id,
    0.55,
    'PCS',
    NOW(),
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.bom_number = 'BOM-STBDESC-ASSY'
  AND i.item_name = 'Red 12AWG'
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO bom_items (bom_id, item_id, quantity, uom, created_at, updated_at)
SELECT 
    bh.id,
    i.id,
    1.0,
    '-290.0',
    NOW(),
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.bom_number = 'BOM-STBDESC-ASSY'
  AND i.item_name = 'Ferrite Core'
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO bom_items (bom_id, item_id, quantity, uom, created_at, updated_at)
SELECT 
    bh.id,
    i.id,
    5.0,
    '588.0',
    NOW(),
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.bom_number = 'BOM-STBDESC-ASSY'
  AND i.item_name = '16AWG Lead'
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO bom_items (bom_id, item_id, quantity, uom, created_at, updated_at)
SELECT 
    bh.id,
    i.id,
    0.05,
    '-175.0',
    NOW(),
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.bom_number = 'BOM-STBDESC-ASSY'
  AND i.item_name = 'Heatshrink Tube 9:3'
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO bom_items (bom_id, item_id, quantity, uom, created_at, updated_at)
SELECT 
    bh.id,
    i.id,
    0.05,
    '10.0',
    NOW(),
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.bom_number = 'BOM-STBDESC-ASSY'
  AND i.item_name = 'HeatShrink Tube 4.8/1.2'
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO bom_items (bom_id, item_id, quantity, uom, created_at, updated_at)
SELECT 
    bh.id,
    i.id,
    1.0,
    '-20.0',
    NOW(),
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.bom_number = 'BOM-STBDESC-ASSY'
  AND i.item_name = 'HV130 ESC'
LIMIT 1
ON CONFLICT DO NOTHING;

-- BOM for PORT_ESC Assy
INSERT INTO bom_headers (bom_number, item_id, version, status, is_multi_level, created_at, updated_at)
SELECT 'BOM-PORTESC-ASSY', id, '1.0', 'ACTIVE', false, NOW(), NOW()
FROM items 
WHERE item_name = 'PORT_ESC Assy' AND category IN ('SA', 'FG')
LIMIT 1
ON CONFLICT (bom_number) DO NOTHING;

INSERT INTO bom_items (bom_id, item_id, quantity, uom, created_at, updated_at)
SELECT 
    bh.id,
    i.id,
    1.0,
    '-7.0',
    NOW(),
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.bom_number = 'BOM-PORTESC-ASSY'
  AND i.item_name = '5.5mm Female Bullet connector'
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO bom_items (bom_id, item_id, quantity, uom, created_at, updated_at)
SELECT 
    bh.id,
    i.id,
    2.0,
    '-151.0',
    NOW(),
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.bom_number = 'BOM-PORTESC-ASSY'
  AND i.item_name = '4mm Male Bullet connector'
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO bom_items (bom_id, item_id, quantity, uom, created_at, updated_at)
SELECT 
    bh.id,
    i.id,
    1.0,
    '-96.0',
    NOW(),
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.bom_number = 'BOM-PORTESC-ASSY'
  AND i.item_name = '4mm Female Bullet connector'
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO bom_items (bom_id, item_id, quantity, uom, created_at, updated_at)
SELECT 
    bh.id,
    i.id,
    0.55,
    'PCS',
    NOW(),
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.bom_number = 'BOM-PORTESC-ASSY'
  AND i.item_name = 'Red 12AWG'
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO bom_items (bom_id, item_id, quantity, uom, created_at, updated_at)
SELECT 
    bh.id,
    i.id,
    1.0,
    '-290.0',
    NOW(),
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.bom_number = 'BOM-PORTESC-ASSY'
  AND i.item_name = 'Ferrite Core'
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO bom_items (bom_id, item_id, quantity, uom, created_at, updated_at)
SELECT 
    bh.id,
    i.id,
    5.0,
    '588.0',
    NOW(),
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.bom_number = 'BOM-PORTESC-ASSY'
  AND i.item_name = '16AWG Lead'
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO bom_items (bom_id, item_id, quantity, uom, created_at, updated_at)
SELECT 
    bh.id,
    i.id,
    0.05,
    '-175.0',
    NOW(),
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.bom_number = 'BOM-PORTESC-ASSY'
  AND i.item_name = 'Heatshrink Tube 9:3'
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO bom_items (bom_id, item_id, quantity, uom, created_at, updated_at)
SELECT 
    bh.id,
    i.id,
    0.05,
    '10.0',
    NOW(),
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.bom_number = 'BOM-PORTESC-ASSY'
  AND i.item_name = 'HeatShrink Tube 4.8/1.2'
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO bom_items (bom_id, item_id, quantity, uom, created_at, updated_at)
SELECT 
    bh.id,
    i.id,
    1.0,
    '-20.0',
    NOW(),
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.bom_number = 'BOM-PORTESC-ASSY'
  AND i.item_name = 'HV130 ESC'
LIMIT 1
ON CONFLICT DO NOTHING;

-- BOM for STBD Signal PM Assy
INSERT INTO bom_headers (bom_number, item_id, version, status, is_multi_level, created_at, updated_at)
SELECT 'BOM-STBD-SIGNAL-PM', id, '1.0', 'ACTIVE', false, NOW(), NOW()
FROM items 
WHERE item_name = 'STBD Signal PM Assy' AND category IN ('SA', 'FG')
LIMIT 1
ON CONFLICT (bom_number) DO NOTHING;

INSERT INTO bom_items (bom_id, item_id, quantity, uom, created_at, updated_at)
SELECT 
    bh.id,
    i.id,
    1.0,
    '42.0',
    NOW(),
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.bom_number = 'BOM-STBD-SIGNAL-PM'
  AND i.item_name = '15 pin JST-XH housing'
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO bom_items (bom_id, item_id, quantity, uom, created_at, updated_at)
SELECT 
    bh.id,
    i.id,
    1.0,
    '-43.0',
    NOW(),
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.bom_number = 'BOM-STBD-SIGNAL-PM'
  AND i.item_name = '10cm one sided JST crimped Black'
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO bom_items (bom_id, item_id, quantity, uom, created_at, updated_at)
SELECT 
    bh.id,
    i.id,
    1.0,
    '-341.0',
    NOW(),
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.bom_number = 'BOM-STBD-SIGNAL-PM'
  AND i.item_name = '10cm one sided JST crimped Green'
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO bom_items (bom_id, item_id, quantity, uom, created_at, updated_at)
SELECT 
    bh.id,
    i.id,
    1.0,
    '-246.0',
    NOW(),
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.bom_number = 'BOM-STBD-SIGNAL-PM'
  AND i.item_name = '10cm one sided JST crimped Voilet'
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO bom_items (bom_id, item_id, quantity, uom, created_at, updated_at)
SELECT 
    bh.id,
    i.id,
    1.0,
    '-358.0',
    NOW(),
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.bom_number = 'BOM-STBD-SIGNAL-PM'
  AND i.item_name = '10cm one sided JST crimped Yellow'
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO bom_items (bom_id, item_id, quantity, uom, created_at, updated_at)
SELECT 
    bh.id,
    i.id,
    1.0,
    '-274.0',
    NOW(),
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.bom_number = 'BOM-STBD-SIGNAL-PM'
  AND i.item_name = '10cm one sided JST crimped Sky Blue'
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO bom_items (bom_id, item_id, quantity, uom, created_at, updated_at)
SELECT 
    bh.id,
    i.id,
    1.0,
    '-274.0',
    NOW(),
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.bom_number = 'BOM-STBD-SIGNAL-PM'
  AND i.item_name = '10cm one sided JST crimped Pink'
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO bom_items (bom_id, item_id, quantity, uom, created_at, updated_at)
SELECT 
    bh.id,
    i.id,
    1.0,
    '-425.0',
    NOW(),
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.bom_number = 'BOM-STBD-SIGNAL-PM'
  AND i.item_name = '10cm one sided JST crimped Orange'
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO bom_items (bom_id, item_id, quantity, uom, created_at, updated_at)
SELECT 
    bh.id,
    i.id,
    1.0,
    '-339.0',
    NOW(),
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.bom_number = 'BOM-STBD-SIGNAL-PM'
  AND i.item_name = '10cm one sided JST crimped Dark Blue'
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO bom_items (bom_id, item_id, quantity, uom, created_at, updated_at)
SELECT 
    bh.id,
    i.id,
    1.0,
    '30.0',
    NOW(),
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.bom_number = 'BOM-STBD-SIGNAL-PM'
  AND i.item_name = '10cm one sided JST crimped Light Brown'
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO bom_items (bom_id, item_id, quantity, uom, created_at, updated_at)
SELECT 
    bh.id,
    i.id,
    1.0,
    '-169.0',
    NOW(),
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.bom_number = 'BOM-STBD-SIGNAL-PM'
  AND i.item_name = '10cm one sided JST crimped Dark Brown'
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO bom_items (bom_id, item_id, quantity, uom, created_at, updated_at)
SELECT 
    bh.id,
    i.id,
    1.0,
    '-274.0',
    NOW(),
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.bom_number = 'BOM-STBD-SIGNAL-PM'
  AND i.item_name = '10cm one sided JST crimped White with Red strip'
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO bom_items (bom_id, item_id, quantity, uom, created_at, updated_at)
SELECT 
    bh.id,
    i.id,
    1.0,
    '-275.0',
    NOW(),
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.bom_number = 'BOM-STBD-SIGNAL-PM'
  AND i.item_name = '10cm one sided JST crimped White with black strip'
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO bom_items (bom_id, item_id, quantity, uom, created_at, updated_at)
SELECT 
    bh.id,
    i.id,
    1.0,
    '-272.0',
    NOW(),
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.bom_number = 'BOM-STBD-SIGNAL-PM'
  AND i.item_name = '10cm one sided JST crimped White'
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO bom_items (bom_id, item_id, quantity, uom, created_at, updated_at)
SELECT 
    bh.id,
    i.id,
    1.0,
    '-216.0',
    NOW(),
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.bom_number = 'BOM-STBD-SIGNAL-PM'
  AND i.item_name = '10cm one sided JST crimped Red'
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO bom_items (bom_id, item_id, quantity, uom, created_at, updated_at)
SELECT 
    bh.id,
    i.id,
    1.0,
    'PCS',
    NOW(),
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.bom_number = 'BOM-STBD-SIGNAL-PM'
  AND i.item_name = 'SY21-15 pin panel mount'
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO bom_items (bom_id, item_id, quantity, uom, created_at, updated_at)
SELECT 
    bh.id,
    i.id,
    0.15,
    '-390.0',
    NOW(),
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.bom_number = 'BOM-STBD-SIGNAL-PM'
  AND i.item_name = 'HeatShrink Tube 1.5mm/1.6mm'
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO bom_items (bom_id, item_id, quantity, uom, created_at, updated_at)
SELECT 
    bh.id,
    i.id,
    2.0,
    '1481.0',
    NOW(),
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.bom_number = 'BOM-STBD-SIGNAL-PM'
  AND i.item_name = 'Teroson MS930'
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO bom_items (bom_id, item_id, quantity, uom, created_at, updated_at)
SELECT 
    bh.id,
    i.id,
    5.0,
    '448.0',
    NOW(),
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.bom_number = 'BOM-STBD-SIGNAL-PM'
  AND i.item_name = 'Silicon RTV 734 Potting compound'
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO bom_items (bom_id, item_id, quantity, uom, created_at, updated_at)
SELECT 
    bh.id,
    i.id,
    5.0,
    '-1.0',
    NOW(),
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.bom_number = 'BOM-STBD-SIGNAL-PM'
  AND i.item_name = 'Lead wire 22AWG'
LIMIT 1
ON CONFLICT DO NOTHING;

-- BOM for PORT Signal PM Assy
INSERT INTO bom_headers (bom_number, item_id, version, status, is_multi_level, created_at, updated_at)
SELECT 'BOM-PORT-SIGNAL-PM', id, '1.0', 'ACTIVE', false, NOW(), NOW()
FROM items 
WHERE item_name = 'PORT Signal PM Assy' AND category IN ('SA', 'FG')
LIMIT 1
ON CONFLICT (bom_number) DO NOTHING;

INSERT INTO bom_items (bom_id, item_id, quantity, uom, created_at, updated_at)
SELECT 
    bh.id,
    i.id,
    1.0,
    '42.0',
    NOW(),
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.bom_number = 'BOM-PORT-SIGNAL-PM'
  AND i.item_name = '15 pin JST-XH housing'
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO bom_items (bom_id, item_id, quantity, uom, created_at, updated_at)
SELECT 
    bh.id,
    i.id,
    1.0,
    '-43.0',
    NOW(),
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.bom_number = 'BOM-PORT-SIGNAL-PM'
  AND i.item_name = '10cm one sided JST crimped Black'
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO bom_items (bom_id, item_id, quantity, uom, created_at, updated_at)
SELECT 
    bh.id,
    i.id,
    1.0,
    '-341.0',
    NOW(),
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.bom_number = 'BOM-PORT-SIGNAL-PM'
  AND i.item_name = '10cm one sided JST crimped Green'
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO bom_items (bom_id, item_id, quantity, uom, created_at, updated_at)
SELECT 
    bh.id,
    i.id,
    1.0,
    '-246.0',
    NOW(),
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.bom_number = 'BOM-PORT-SIGNAL-PM'
  AND i.item_name = '10cm one sided JST crimped Voilet'
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO bom_items (bom_id, item_id, quantity, uom, created_at, updated_at)
SELECT 
    bh.id,
    i.id,
    1.0,
    '-358.0',
    NOW(),
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.bom_number = 'BOM-PORT-SIGNAL-PM'
  AND i.item_name = '10cm one sided JST crimped Yellow'
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO bom_items (bom_id, item_id, quantity, uom, created_at, updated_at)
SELECT 
    bh.id,
    i.id,
    1.0,
    '-274.0',
    NOW(),
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.bom_number = 'BOM-PORT-SIGNAL-PM'
  AND i.item_name = '10cm one sided JST crimped Sky Blue'
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO bom_items (bom_id, item_id, quantity, uom, created_at, updated_at)
SELECT 
    bh.id,
    i.id,
    1.0,
    '-274.0',
    NOW(),
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.bom_number = 'BOM-PORT-SIGNAL-PM'
  AND i.item_name = '10cm one sided JST crimped Pink'
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO bom_items (bom_id, item_id, quantity, uom, created_at, updated_at)
SELECT 
    bh.id,
    i.id,
    1.0,
    '-425.0',
    NOW(),
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.bom_number = 'BOM-PORT-SIGNAL-PM'
  AND i.item_name = '10cm one sided JST crimped Orange'
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO bom_items (bom_id, item_id, quantity, uom, created_at, updated_at)
SELECT 
    bh.id,
    i.id,
    1.0,
    '-339.0',
    NOW(),
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.bom_number = 'BOM-PORT-SIGNAL-PM'
  AND i.item_name = '10cm one sided JST crimped Dark Blue'
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO bom_items (bom_id, item_id, quantity, uom, created_at, updated_at)
SELECT 
    bh.id,
    i.id,
    1.0,
    '30.0',
    NOW(),
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.bom_number = 'BOM-PORT-SIGNAL-PM'
  AND i.item_name = '10cm one sided JST crimped Light Brown'
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO bom_items (bom_id, item_id, quantity, uom, created_at, updated_at)
SELECT 
    bh.id,
    i.id,
    1.0,
    '-169.0',
    NOW(),
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.bom_number = 'BOM-PORT-SIGNAL-PM'
  AND i.item_name = '10cm one sided JST crimped Dark Brown'
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO bom_items (bom_id, item_id, quantity, uom, created_at, updated_at)
SELECT 
    bh.id,
    i.id,
    1.0,
    '-274.0',
    NOW(),
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.bom_number = 'BOM-PORT-SIGNAL-PM'
  AND i.item_name = '10cm one sided JST crimped White with Red strip'
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO bom_items (bom_id, item_id, quantity, uom, created_at, updated_at)
SELECT 
    bh.id,
    i.id,
    1.0,
    '-275.0',
    NOW(),
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.bom_number = 'BOM-PORT-SIGNAL-PM'
  AND i.item_name = '10cm one sided JST crimped White with black strip'
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO bom_items (bom_id, item_id, quantity, uom, created_at, updated_at)
SELECT 
    bh.id,
    i.id,
    1.0,
    '-272.0',
    NOW(),
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.bom_number = 'BOM-PORT-SIGNAL-PM'
  AND i.item_name = '10cm one sided JST crimped White'
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO bom_items (bom_id, item_id, quantity, uom, created_at, updated_at)
SELECT 
    bh.id,
    i.id,
    1.0,
    '-139.0',
    NOW(),
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.bom_number = 'BOM-PORT-SIGNAL-PM'
  AND i.item_name = '10cm one sided JST crimped Dark Parrot Green'
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO bom_items (bom_id, item_id, quantity, uom, created_at, updated_at)
SELECT 
    bh.id,
    i.id,
    1.0,
    'PCS',
    NOW(),
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.bom_number = 'BOM-PORT-SIGNAL-PM'
  AND i.item_name = 'SY21-15 pin panel mount'
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO bom_items (bom_id, item_id, quantity, uom, created_at, updated_at)
SELECT 
    bh.id,
    i.id,
    0.15,
    '-390.0',
    NOW(),
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.bom_number = 'BOM-PORT-SIGNAL-PM'
  AND i.item_name = 'HeatShrink Tube 1.5mm/1.6mm'
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO bom_items (bom_id, item_id, quantity, uom, created_at, updated_at)
SELECT 
    bh.id,
    i.id,
    2.0,
    '1481.0',
    NOW(),
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.bom_number = 'BOM-PORT-SIGNAL-PM'
  AND i.item_name = 'Teroson MS930'
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO bom_items (bom_id, item_id, quantity, uom, created_at, updated_at)
SELECT 
    bh.id,
    i.id,
    5.0,
    '448.0',
    NOW(),
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.bom_number = 'BOM-PORT-SIGNAL-PM'
  AND i.item_name = 'Silicon RTV 734 Potting compound'
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO bom_items (bom_id, item_id, quantity, uom, created_at, updated_at)
SELECT 
    bh.id,
    i.id,
    5.0,
    '-1.0',
    NOW(),
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.bom_number = 'BOM-PORT-SIGNAL-PM'
  AND i.item_name = 'Lead wire 22AWG'
LIMIT 1
ON CONFLICT DO NOTHING;

-- BOM for STBD Signal CM Assy
INSERT INTO bom_headers (bom_number, item_id, version, status, is_multi_level, created_at, updated_at)
SELECT 'BOM-STBD-SIGNAL-CM', id, '1.0', 'ACTIVE', false, NOW(), NOW()
FROM items 
WHERE item_name = 'STBD Signal CM Assy' AND category IN ('SA', 'FG')
LIMIT 1
ON CONFLICT (bom_number) DO NOTHING;

INSERT INTO bom_items (bom_id, item_id, quantity, uom, created_at, updated_at)
SELECT 
    bh.id,
    i.id,
    1,
    '-127.0',
    NOW(),
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.bom_number = 'BOM-STBD-SIGNAL-CM'
  AND i.item_name = '2mm male bullet connector'
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO bom_items (bom_id, item_id, quantity, uom, created_at, updated_at)
SELECT 
    bh.id,
    i.id,
    1,
    '-245.0',
    NOW(),
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.bom_number = 'BOM-STBD-SIGNAL-CM'
  AND i.item_name = '2mm Female Bullet connector'
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO bom_items (bom_id, item_id, quantity, uom, created_at, updated_at)
SELECT 
    bh.id,
    i.id,
    5.0,
    '-1.0',
    NOW(),
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.bom_number = 'BOM-STBD-SIGNAL-CM'
  AND i.item_name = 'Lead wire 22AWG'
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO bom_items (bom_id, item_id, quantity, uom, created_at, updated_at)
SELECT 
    bh.id,
    i.id,
    2.0,
    'PCS',
    NOW(),
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.bom_number = 'BOM-STBD-SIGNAL-CM'
  AND i.item_name = 'Soldering flux'
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO bom_items (bom_id, item_id, quantity, uom, created_at, updated_at)
SELECT 
    bh.id,
    i.id,
    1.0,
    '-25.0',
    NOW(),
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.bom_number = 'BOM-STBD-SIGNAL-CM'
  AND i.item_name = 'LM61 Temperature Sensor'
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO bom_items (bom_id, item_id, quantity, uom, created_at, updated_at)
SELECT 
    bh.id,
    i.id,
    0.85,
    '-183.0',
    NOW(),
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.bom_number = 'BOM-STBD-SIGNAL-CM'
  AND i.item_name = '20Core Wire 14/38'
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO bom_items (bom_id, item_id, quantity, uom, created_at, updated_at)
SELECT 
    bh.id,
    i.id,
    0.15,
    '-205.0',
    NOW(),
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.bom_number = 'BOM-STBD-SIGNAL-CM'
  AND i.item_name = 'Red 14/38 wire'
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO bom_items (bom_id, item_id, quantity, uom, created_at, updated_at)
SELECT 
    bh.id,
    i.id,
    1.0,
    'PCS',
    NOW(),
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.bom_number = 'BOM-STBD-SIGNAL-CM'
  AND i.item_name = 'SY21-15 pin Cable Mount'
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO bom_items (bom_id, item_id, quantity, uom, created_at, updated_at)
SELECT 
    bh.id,
    i.id,
    1.0,
    'PCS',
    NOW(),
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.bom_number = 'BOM-STBD-SIGNAL-CM'
  AND i.item_name = 'BlueRobotics Leak'
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO bom_items (bom_id, item_id, quantity, uom, created_at, updated_at)
SELECT 
    bh.id,
    i.id,
    0.05,
    '-25.0',
    NOW(),
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.bom_number = 'BOM-STBD-SIGNAL-CM'
  AND i.item_name = 'HeatShrink Tube 4:1'
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO bom_items (bom_id, item_id, quantity, uom, created_at, updated_at)
SELECT 
    bh.id,
    i.id,
    0.1,
    '10.0',
    NOW(),
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.bom_number = 'BOM-STBD-SIGNAL-CM'
  AND i.item_name = 'HeatShrink Tube 12:3'
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO bom_items (bom_id, item_id, quantity, uom, created_at, updated_at)
SELECT 
    bh.id,
    i.id,
    0.15,
    '-390.0',
    NOW(),
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.bom_number = 'BOM-STBD-SIGNAL-CM'
  AND i.item_name = 'HeatShrink Tube 1.5mm/1.6mm'
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO bom_items (bom_id, item_id, quantity, uom, created_at, updated_at)
SELECT 
    bh.id,
    i.id,
    1.0,
    '49.0',
    NOW(),
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.bom_number = 'BOM-STBD-SIGNAL-CM'
  AND i.item_name = '1uF 0805 PANASONIC'
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO bom_items (bom_id, item_id, quantity, uom, created_at, updated_at)
SELECT 
    bh.id,
    i.id,
    0.1,
    '-35.0',
    NOW(),
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.bom_number = 'BOM-STBD-SIGNAL-CM'
  AND i.item_name = 'HeatShrink Tube 3:1'
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO bom_items (bom_id, item_id, quantity, uom, created_at, updated_at)
SELECT 
    bh.id,
    i.id,
    10.0,
    '448.0',
    NOW(),
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.bom_number = 'BOM-STBD-SIGNAL-CM'
  AND i.item_name = 'Silicon RTV 734 Potting compound'
LIMIT 1
ON CONFLICT DO NOTHING;

-- BOM for PORT Signal CM Assy
INSERT INTO bom_headers (bom_number, item_id, version, status, is_multi_level, created_at, updated_at)
SELECT 'BOM-PORT-SIGNAL-CM', id, '1.0', 'ACTIVE', false, NOW(), NOW()
FROM items 
WHERE item_name = 'PORT Signal CM Assy' AND category IN ('SA', 'FG')
LIMIT 1
ON CONFLICT (bom_number) DO NOTHING;

INSERT INTO bom_items (bom_id, item_id, quantity, uom, created_at, updated_at)
SELECT 
    bh.id,
    i.id,
    1,
    '-127.0',
    NOW(),
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.bom_number = 'BOM-PORT-SIGNAL-CM'
  AND i.item_name = '2mm male bullet connector'
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO bom_items (bom_id, item_id, quantity, uom, created_at, updated_at)
SELECT 
    bh.id,
    i.id,
    1,
    '-245.0',
    NOW(),
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.bom_number = 'BOM-PORT-SIGNAL-CM'
  AND i.item_name = '2mm Female Bullet connector'
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO bom_items (bom_id, item_id, quantity, uom, created_at, updated_at)
SELECT 
    bh.id,
    i.id,
    5.0,
    '-1.0',
    NOW(),
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.bom_number = 'BOM-PORT-SIGNAL-CM'
  AND i.item_name = 'Lead wire 22AWG'
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO bom_items (bom_id, item_id, quantity, uom, created_at, updated_at)
SELECT 
    bh.id,
    i.id,
    2.0,
    'PCS',
    NOW(),
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.bom_number = 'BOM-PORT-SIGNAL-CM'
  AND i.item_name = 'Soldering flux'
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO bom_items (bom_id, item_id, quantity, uom, created_at, updated_at)
SELECT 
    bh.id,
    i.id,
    1.0,
    '-25.0',
    NOW(),
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.bom_number = 'BOM-PORT-SIGNAL-CM'
  AND i.item_name = 'LM61 Temperature Sensor'
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO bom_items (bom_id, item_id, quantity, uom, created_at, updated_at)
SELECT 
    bh.id,
    i.id,
    0.85,
    '-183.0',
    NOW(),
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.bom_number = 'BOM-PORT-SIGNAL-CM'
  AND i.item_name = '20Core Wire 14/38'
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO bom_items (bom_id, item_id, quantity, uom, created_at, updated_at)
SELECT 
    bh.id,
    i.id,
    0.15,
    '-165.0',
    NOW(),
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.bom_number = 'BOM-PORT-SIGNAL-CM'
  AND i.item_name = 'Black 14/38 Wire'
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO bom_items (bom_id, item_id, quantity, uom, created_at, updated_at)
SELECT 
    bh.id,
    i.id,
    1.0,
    'PCS',
    NOW(),
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.bom_number = 'BOM-PORT-SIGNAL-CM'
  AND i.item_name = 'SY21-15 pin Cable Mount'
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO bom_items (bom_id, item_id, quantity, uom, created_at, updated_at)
SELECT 
    bh.id,
    i.id,
    1.0,
    'PCS',
    NOW(),
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.bom_number = 'BOM-PORT-SIGNAL-CM'
  AND i.item_name = 'BlueRobotics Leak'
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO bom_items (bom_id, item_id, quantity, uom, created_at, updated_at)
SELECT 
    bh.id,
    i.id,
    0.05,
    '-25.0',
    NOW(),
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.bom_number = 'BOM-PORT-SIGNAL-CM'
  AND i.item_name = 'HeatShrink Tube 4:1'
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO bom_items (bom_id, item_id, quantity, uom, created_at, updated_at)
SELECT 
    bh.id,
    i.id,
    0.1,
    '10.0',
    NOW(),
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.bom_number = 'BOM-PORT-SIGNAL-CM'
  AND i.item_name = 'HeatShrink Tube 12:3'
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO bom_items (bom_id, item_id, quantity, uom, created_at, updated_at)
SELECT 
    bh.id,
    i.id,
    0.15,
    '-390.0',
    NOW(),
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.bom_number = 'BOM-PORT-SIGNAL-CM'
  AND i.item_name = 'HeatShrink Tube 1.5mm/1.6mm'
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO bom_items (bom_id, item_id, quantity, uom, created_at, updated_at)
SELECT 
    bh.id,
    i.id,
    1.0,
    '49.0',
    NOW(),
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.bom_number = 'BOM-PORT-SIGNAL-CM'
  AND i.item_name = '1uF 0805 PANASONIC'
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO bom_items (bom_id, item_id, quantity, uom, created_at, updated_at)
SELECT 
    bh.id,
    i.id,
    0.1,
    '-35.0',
    NOW(),
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.bom_number = 'BOM-PORT-SIGNAL-CM'
  AND i.item_name = 'HeatShrink Tube 3:1'
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO bom_items (bom_id, item_id, quantity, uom, created_at, updated_at)
SELECT 
    bh.id,
    i.id,
    10.0,
    '448.0',
    NOW(),
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.bom_number = 'BOM-PORT-SIGNAL-CM'
  AND i.item_name = 'Silicon RTV 734 Potting compound'
LIMIT 1
ON CONFLICT DO NOTHING;

-- BOM for Charging PM Assy
INSERT INTO bom_headers (bom_number, item_id, version, status, is_multi_level, created_at, updated_at)
SELECT 'BOM-CHARGING-PM-ASSY', id, '1.0', 'ACTIVE', false, NOW(), NOW()
FROM items 
WHERE item_name = 'Charging PM Assy' AND category IN ('SA', 'FG')
LIMIT 1
ON CONFLICT (bom_number) DO NOTHING;

INSERT INTO bom_items (bom_id, item_id, quantity, uom, created_at, updated_at)
SELECT 
    bh.id,
    i.id,
    1.0,
    '-127.0',
    NOW(),
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.bom_number = 'BOM-CHARGING-PM-ASSY'
  AND i.item_name = '2mm male bullet connector'
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO bom_items (bom_id, item_id, quantity, uom, created_at, updated_at)
SELECT 
    bh.id,
    i.id,
    0.35,
    'PCS',
    NOW(),
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.bom_number = 'BOM-CHARGING-PM-ASSY'
  AND i.item_name = 'Black 18 AWG'
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO bom_items (bom_id, item_id, quantity, uom, created_at, updated_at)
SELECT 
    bh.id,
    i.id,
    0.3,
    'PCS',
    NOW(),
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.bom_number = 'BOM-CHARGING-PM-ASSY'
  AND i.item_name = 'Black 20 AWG'
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO bom_items (bom_id, item_id, quantity, uom, created_at, updated_at)
SELECT 
    bh.id,
    i.id,
    0.3,
    'PCS',
    NOW(),
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.bom_number = 'BOM-CHARGING-PM-ASSY'
  AND i.item_name = 'Red 20 AWG'
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO bom_items (bom_id, item_id, quantity, uom, created_at, updated_at)
SELECT 
    bh.id,
    i.id,
    1.0,
    '-244.0',
    NOW(),
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.bom_number = 'BOM-CHARGING-PM-ASSY'
  AND i.item_name = '13 pin JST-XH housing'
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO bom_items (bom_id, item_id, quantity, uom, created_at, updated_at)
SELECT 
    bh.id,
    i.id,
    1.0,
    '-341.0',
    NOW(),
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.bom_number = 'BOM-CHARGING-PM-ASSY'
  AND i.item_name = '10cm one sided JST crimped Green'
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO bom_items (bom_id, item_id, quantity, uom, created_at, updated_at)
SELECT 
    bh.id,
    i.id,
    1.0,
    '-246.0',
    NOW(),
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.bom_number = 'BOM-CHARGING-PM-ASSY'
  AND i.item_name = '10cm one sided JST crimped Voilet'
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO bom_items (bom_id, item_id, quantity, uom, created_at, updated_at)
SELECT 
    bh.id,
    i.id,
    1.0,
    '-358.0',
    NOW(),
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.bom_number = 'BOM-CHARGING-PM-ASSY'
  AND i.item_name = '10cm one sided JST crimped Yellow'
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO bom_items (bom_id, item_id, quantity, uom, created_at, updated_at)
SELECT 
    bh.id,
    i.id,
    1.0,
    '-274.0',
    NOW(),
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.bom_number = 'BOM-CHARGING-PM-ASSY'
  AND i.item_name = '10cm one sided JST crimped Sky Blue'
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO bom_items (bom_id, item_id, quantity, uom, created_at, updated_at)
SELECT 
    bh.id,
    i.id,
    1.0,
    '-274.0',
    NOW(),
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.bom_number = 'BOM-CHARGING-PM-ASSY'
  AND i.item_name = '10cm one sided JST crimped Pink'
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO bom_items (bom_id, item_id, quantity, uom, created_at, updated_at)
SELECT 
    bh.id,
    i.id,
    1.0,
    '-425.0',
    NOW(),
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.bom_number = 'BOM-CHARGING-PM-ASSY'
  AND i.item_name = '10cm one sided JST crimped Orange'
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO bom_items (bom_id, item_id, quantity, uom, created_at, updated_at)
SELECT 
    bh.id,
    i.id,
    1.0,
    '-339.0',
    NOW(),
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.bom_number = 'BOM-CHARGING-PM-ASSY'
  AND i.item_name = '10cm one sided JST crimped Dark Blue'
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO bom_items (bom_id, item_id, quantity, uom, created_at, updated_at)
SELECT 
    bh.id,
    i.id,
    1.0,
    '30.0',
    NOW(),
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.bom_number = 'BOM-CHARGING-PM-ASSY'
  AND i.item_name = '10cm one sided JST crimped Light Brown'
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO bom_items (bom_id, item_id, quantity, uom, created_at, updated_at)
SELECT 
    bh.id,
    i.id,
    1.0,
    '-169.0',
    NOW(),
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.bom_number = 'BOM-CHARGING-PM-ASSY'
  AND i.item_name = '10cm one sided JST crimped Dark Brown'
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO bom_items (bom_id, item_id, quantity, uom, created_at, updated_at)
SELECT 
    bh.id,
    i.id,
    1.0,
    '-274.0',
    NOW(),
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.bom_number = 'BOM-CHARGING-PM-ASSY'
  AND i.item_name = '10cm one sided JST crimped White with Red strip'
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO bom_items (bom_id, item_id, quantity, uom, created_at, updated_at)
SELECT 
    bh.id,
    i.id,
    1.0,
    '-275.0',
    NOW(),
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.bom_number = 'BOM-CHARGING-PM-ASSY'
  AND i.item_name = '10cm one sided JST crimped White with black strip'
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO bom_items (bom_id, item_id, quantity, uom, created_at, updated_at)
SELECT 
    bh.id,
    i.id,
    1.0,
    '-272.0',
    NOW(),
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.bom_number = 'BOM-CHARGING-PM-ASSY'
  AND i.item_name = '10cm one sided JST crimped White'
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO bom_items (bom_id, item_id, quantity, uom, created_at, updated_at)
SELECT 
    bh.id,
    i.id,
    1.0,
    '-150.0',
    NOW(),
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.bom_number = 'BOM-CHARGING-PM-ASSY'
  AND i.item_name = '10cm one sided JST crimped Light Grey'
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO bom_items (bom_id, item_id, quantity, uom, created_at, updated_at)
SELECT 
    bh.id,
    i.id,
    1.0,
    '-101.0',
    NOW(),
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.bom_number = 'BOM-CHARGING-PM-ASSY'
  AND i.item_name = 'WY-28 Metal connector PM'
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO bom_items (bom_id, item_id, quantity, uom, created_at, updated_at)
SELECT 
    bh.id,
    i.id,
    0.05,
    '-380.0',
    NOW(),
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.bom_number = 'BOM-CHARGING-PM-ASSY'
  AND i.item_name = 'Heatshrink Tube 6.4:1.6'
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO bom_items (bom_id, item_id, quantity, uom, created_at, updated_at)
SELECT 
    bh.id,
    i.id,
    0.06,
    '-25.0',
    NOW(),
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.bom_number = 'BOM-CHARGING-PM-ASSY'
  AND i.item_name = 'HeatShrink Tube 4:1'
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO bom_items (bom_id, item_id, quantity, uom, created_at, updated_at)
SELECT 
    bh.id,
    i.id,
    0.2,
    '-390.0',
    NOW(),
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.bom_number = 'BOM-CHARGING-PM-ASSY'
  AND i.item_name = 'HeatShrink Tube 1.5mm/1.6mm'
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO bom_items (bom_id, item_id, quantity, uom, created_at, updated_at)
SELECT 
    bh.id,
    i.id,
    2.0,
    '1481.0',
    NOW(),
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.bom_number = 'BOM-CHARGING-PM-ASSY'
  AND i.item_name = 'Teroson MS930'
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO bom_items (bom_id, item_id, quantity, uom, created_at, updated_at)
SELECT 
    bh.id,
    i.id,
    10.0,
    '448.0',
    NOW(),
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.bom_number = 'BOM-CHARGING-PM-ASSY'
  AND i.item_name = 'Silicon RTV 734 Potting compound'
LIMIT 1
ON CONFLICT DO NOTHING;

-- BOM for Charger Box Assy
INSERT INTO bom_headers (bom_number, item_id, version, status, is_multi_level, created_at, updated_at)
SELECT 'BOM-CHARGER-BOX-ASSY', id, '1.0', 'ACTIVE', false, NOW(), NOW()
FROM items 
WHERE item_name = 'Charger Box Assy' AND category IN ('SA', 'FG')
LIMIT 1
ON CONFLICT (bom_number) DO NOTHING;

INSERT INTO bom_items (bom_id, item_id, quantity, uom, created_at, updated_at)
SELECT 
    bh.id,
    i.id,
    1.0,
    '-81.0',
    NOW(),
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.bom_number = 'BOM-CHARGER-BOX-ASSY'
  AND i.item_name = '24v AC/DC module'
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO bom_items (bom_id, item_id, quantity, uom, created_at, updated_at)
SELECT 
    bh.id,
    i.id,
    10.0,
    '-1.0',
    NOW(),
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.bom_number = 'BOM-CHARGER-BOX-ASSY'
  AND i.item_name = 'Lead wire 22AWG'
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO bom_items (bom_id, item_id, quantity, uom, created_at, updated_at)
SELECT 
    bh.id,
    i.id,
    1.0,
    'PCS',
    NOW(),
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.bom_number = 'BOM-CHARGER-BOX-ASSY'
  AND i.item_name = 'Soldering flux'
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO bom_items (bom_id, item_id, quantity, uom, created_at, updated_at)
SELECT 
    bh.id,
    i.id,
    1.0,
    '-16.0',
    NOW(),
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.bom_number = 'BOM-CHARGER-BOX-ASSY'
  AND i.item_name = '3 pin 3 yrd power cord'
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO bom_items (bom_id, item_id, quantity, uom, created_at, updated_at)
SELECT 
    bh.id,
    i.id,
    1.0,
    '-274.0',
    NOW(),
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.bom_number = 'BOM-CHARGER-BOX-ASSY'
  AND i.item_name = '25cm Black Microfit one side crimped wires'
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO bom_items (bom_id, item_id, quantity, uom, created_at, updated_at)
SELECT 
    bh.id,
    i.id,
    1.0,
    '-290.0',
    NOW(),
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.bom_number = 'BOM-CHARGER-BOX-ASSY'
  AND i.item_name = '25cm Green Microfit one side crimped wires'
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO bom_items (bom_id, item_id, quantity, uom, created_at, updated_at)
SELECT 
    bh.id,
    i.id,
    1.0,
    '-119.0',
    NOW(),
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.bom_number = 'BOM-CHARGER-BOX-ASSY'
  AND i.item_name = '25cm Violet Microfit one side crimped wires'
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO bom_items (bom_id, item_id, quantity, uom, created_at, updated_at)
SELECT 
    bh.id,
    i.id,
    1.0,
    '-118.0',
    NOW(),
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.bom_number = 'BOM-CHARGER-BOX-ASSY'
  AND i.item_name = '25cm Yellow Microfit one side crimped wires'
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO bom_items (bom_id, item_id, quantity, uom, created_at, updated_at)
SELECT 
    bh.id,
    i.id,
    1.0,
    'PCS',
    NOW(),
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.bom_number = 'BOM-CHARGER-BOX-ASSY'
  AND i.item_name = '25cm Blue Microfit one side crimped wires'
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO bom_items (bom_id, item_id, quantity, uom, created_at, updated_at)
SELECT 
    bh.id,
    i.id,
    1.0,
    '-114.0',
    NOW(),
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.bom_number = 'BOM-CHARGER-BOX-ASSY'
  AND i.item_name = '25cm Pink Microfit one side crimped wires'
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO bom_items (bom_id, item_id, quantity, uom, created_at, updated_at)
SELECT 
    bh.id,
    i.id,
    1.0,
    '-161.0',
    NOW(),
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.bom_number = 'BOM-CHARGER-BOX-ASSY'
  AND i.item_name = '25cm L.Brown Microfit one side crimped wires'
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO bom_items (bom_id, item_id, quantity, uom, created_at, updated_at)
SELECT 
    bh.id,
    i.id,
    1.0,
    '-102.0',
    NOW(),
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.bom_number = 'BOM-CHARGER-BOX-ASSY'
  AND i.item_name = '25cm D.Brown Microfit one side crimped wires'
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO bom_items (bom_id, item_id, quantity, uom, created_at, updated_at)
SELECT 
    bh.id,
    i.id,
    1.0,
    '-115.0',
    NOW(),
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.bom_number = 'BOM-CHARGER-BOX-ASSY'
  AND i.item_name = '25cm White Microfit one side crimped wires'
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO bom_items (bom_id, item_id, quantity, uom, created_at, updated_at)
SELECT 
    bh.id,
    i.id,
    1.0,
    'PCS',
    NOW(),
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.bom_number = 'BOM-CHARGER-BOX-ASSY'
  AND i.item_name = '25cm White-Red Microfit one side crimped wires'
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO bom_items (bom_id, item_id, quantity, uom, created_at, updated_at)
SELECT 
    bh.id,
    i.id,
    1.0,
    '-284.0',
    NOW(),
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.bom_number = 'BOM-CHARGER-BOX-ASSY'
  AND i.item_name = '25cm Red Microfit one side crimped wires'
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO bom_items (bom_id, item_id, quantity, uom, created_at, updated_at)
SELECT 
    bh.id,
    i.id,
    1.0,
    '-122.0',
    NOW(),
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.bom_number = 'BOM-CHARGER-BOX-ASSY'
  AND i.item_name = '25cm Dark Blue Microfit one side crimped wires'
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO bom_items (bom_id, item_id, quantity, uom, created_at, updated_at)
SELECT 
    bh.id,
    i.id,
    1.0,
    '-133.0',
    NOW(),
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.bom_number = 'BOM-CHARGER-BOX-ASSY'
  AND i.item_name = '25cm Orange Microfit one side crimped wires'
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO bom_items (bom_id, item_id, quantity, uom, created_at, updated_at)
SELECT 
    bh.id,
    i.id,
    1.0,
    '-60.0',
    NOW(),
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.bom_number = 'BOM-CHARGER-BOX-ASSY'
  AND i.item_name = '18pin Microfit housing'
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO bom_items (bom_id, item_id, quantity, uom, created_at, updated_at)
SELECT 
    bh.id,
    i.id,
    1.0,
    '30.0',
    NOW(),
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.bom_number = 'BOM-CHARGER-BOX-ASSY'
  AND i.item_name = '12S Lipo Charger'
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO bom_items (bom_id, item_id, quantity, uom, created_at, updated_at)
SELECT 
    bh.id,
    i.id,
    1.0,
    '13.1',
    NOW(),
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.bom_number = 'BOM-CHARGER-BOX-ASSY'
  AND i.item_name = '130x80x60 enclosure box'
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO bom_items (bom_id, item_id, quantity, uom, created_at, updated_at)
SELECT 
    bh.id,
    i.id,
    2.0,
    '-4.9',
    NOW(),
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.bom_number = 'BOM-CHARGER-BOX-ASSY'
  AND i.item_name = 'PG-7 Cable Gland'
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO bom_items (bom_id, item_id, quantity, uom, created_at, updated_at)
SELECT 
    bh.id,
    i.id,
    2.0,
    'PCS',
    NOW(),
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.bom_number = 'BOM-CHARGER-BOX-ASSY'
  AND i.item_name = 'PG-11 Cable Gland'
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO bom_items (bom_id, item_id, quantity, uom, created_at, updated_at)
SELECT 
    bh.id,
    i.id,
    10.0,
    '1481.0',
    NOW(),
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.bom_number = 'BOM-CHARGER-BOX-ASSY'
  AND i.item_name = 'Teroson MS930'
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO bom_items (bom_id, item_id, quantity, uom, created_at, updated_at)
SELECT 
    bh.id,
    i.id,
    0.25,
    'PCS',
    NOW(),
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.bom_number = 'BOM-CHARGER-BOX-ASSY'
  AND i.item_name = 'Red 18 AWG'
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO bom_items (bom_id, item_id, quantity, uom, created_at, updated_at)
SELECT 
    bh.id,
    i.id,
    0.25,
    'PCS',
    NOW(),
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.bom_number = 'BOM-CHARGER-BOX-ASSY'
  AND i.item_name = 'Black 18 AWG'
LIMIT 1
ON CONFLICT DO NOTHING;

-- BOM for Charging CM Assy
INSERT INTO bom_headers (bom_number, item_id, version, status, is_multi_level, created_at, updated_at)
SELECT 'BOM-CHARGING-CM-ASSY', id, '1.0', 'ACTIVE', false, NOW(), NOW()
FROM items 
WHERE item_name = 'Charging CM Assy' AND category IN ('SA', 'FG')
LIMIT 1
ON CONFLICT (bom_number) DO NOTHING;

INSERT INTO bom_items (bom_id, item_id, quantity, uom, created_at, updated_at)
SELECT 
    bh.id,
    i.id,
    10.0,
    '-1.0',
    NOW(),
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.bom_number = 'BOM-CHARGING-CM-ASSY'
  AND i.item_name = 'Lead wire 22AWG'
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO bom_items (bom_id, item_id, quantity, uom, created_at, updated_at)
SELECT 
    bh.id,
    i.id,
    1.0,
    'PCS',
    NOW(),
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.bom_number = 'BOM-CHARGING-CM-ASSY'
  AND i.item_name = 'Soldering flux'
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO bom_items (bom_id, item_id, quantity, uom, created_at, updated_at)
SELECT 
    bh.id,
    i.id,
    1.5,
    '-183.0',
    NOW(),
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.bom_number = 'BOM-CHARGING-CM-ASSY'
  AND i.item_name = '20Core Wire 14/38'
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO bom_items (bom_id, item_id, quantity, uom, created_at, updated_at)
SELECT 
    bh.id,
    i.id,
    1.0,
    '-104.0',
    NOW(),
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.bom_number = 'BOM-CHARGING-CM-ASSY'
  AND i.item_name = 'WY-28 Metal connector CM'
LIMIT 1
ON CONFLICT DO NOTHING;

-- BOM for RPM Sensor Assy
INSERT INTO bom_headers (bom_number, item_id, version, status, is_multi_level, created_at, updated_at)
SELECT 'BOM-RPM-SENSOR-ASSY', id, '1.0', 'ACTIVE', false, NOW(), NOW()
FROM items 
WHERE item_name = 'RPM Sensor Assy' AND category IN ('SA', 'FG')
LIMIT 1
ON CONFLICT (bom_number) DO NOTHING;

INSERT INTO bom_items (bom_id, item_id, quantity, uom, created_at, updated_at)
SELECT 
    bh.id,
    i.id,
    1.0,
    'PCS',
    NOW(),
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.bom_number = 'BOM-RPM-SENSOR-ASSY'
  AND i.item_name = 'PWB of RPM Sensor'
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO bom_items (bom_id, item_id, quantity, uom, created_at, updated_at)
SELECT 
    bh.id,
    i.id,
    1.0,
    'PCS',
    NOW(),
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.bom_number = 'BOM-RPM-SENSOR-ASSY'
  AND i.item_name = 'LM358D SMD'
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO bom_items (bom_id, item_id, quantity, uom, created_at, updated_at)
SELECT 
    bh.id,
    i.id,
    8.0,
    '100.0',
    NOW(),
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.bom_number = 'BOM-RPM-SENSOR-ASSY'
  AND i.item_name = '47k 0805'
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO bom_items (bom_id, item_id, quantity, uom, created_at, updated_at)
SELECT 
    bh.id,
    i.id,
    4.0,
    'PCS',
    NOW(),
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.bom_number = 'BOM-RPM-SENSOR-ASSY'
  AND i.item_name = '470k 0805 Com grade'
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO bom_items (bom_id, item_id, quantity, uom, created_at, updated_at)
SELECT 
    bh.id,
    i.id,
    2.0,
    '-1040.0',
    NOW(),
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.bom_number = 'BOM-RPM-SENSOR-ASSY'
  AND i.item_name = '0.1uF 0805'
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO bom_items (bom_id, item_id, quantity, uom, created_at, updated_at)
SELECT 
    bh.id,
    i.id,
    2.0,
    '-590.0',
    NOW(),
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.bom_number = 'BOM-RPM-SENSOR-ASSY'
  AND i.item_name = '0.01uF 0805'
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO bom_items (bom_id, item_id, quantity, uom, created_at, updated_at)
SELECT 
    bh.id,
    i.id,
    1.0,
    '60.0',
    NOW(),
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.bom_number = 'BOM-RPM-SENSOR-ASSY'
  AND i.item_name = 'LED 0805 SMD'
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO bom_items (bom_id, item_id, quantity, uom, created_at, updated_at)
SELECT 
    bh.id,
    i.id,
    4.0,
    '-412.0',
    NOW(),
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.bom_number = 'BOM-RPM-SENSOR-ASSY'
  AND i.item_name = '1N4148 SMD'
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO bom_items (bom_id, item_id, quantity, uom, created_at, updated_at)
SELECT 
    bh.id,
    i.id,
    2.0,
    '-70.0',
    NOW(),
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.bom_number = 'BOM-RPM-SENSOR-ASSY'
  AND i.item_name = '2 pin JST-XH male side entry'
LIMIT 1
ON CONFLICT DO NOTHING;

-- BOM for Current Sensor Assy
INSERT INTO bom_headers (bom_number, item_id, version, status, is_multi_level, created_at, updated_at)
SELECT 'BOM-CURRENT-SENSOR-ASSY', id, '1.0', 'ACTIVE', false, NOW(), NOW()
FROM items 
WHERE item_name = 'Current Sensor Assy' AND category IN ('SA', 'FG')
LIMIT 1
ON CONFLICT (bom_number) DO NOTHING;

INSERT INTO bom_items (bom_id, item_id, quantity, uom, created_at, updated_at)
SELECT 
    bh.id,
    i.id,
    1.0,
    '-107.0',
    NOW(),
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.bom_number = 'BOM-CURRENT-SENSOR-ASSY'
  AND i.item_name = 'PWB of Current Sensor'
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO bom_items (bom_id, item_id, quantity, uom, created_at, updated_at)
SELECT 
    bh.id,
    i.id,
    2.0,
    '-70.0',
    NOW(),
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.bom_number = 'BOM-CURRENT-SENSOR-ASSY'
  AND i.item_name = 'WCS1700 current Sensor'
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO bom_items (bom_id, item_id, quantity, uom, created_at, updated_at)
SELECT 
    bh.id,
    i.id,
    2.0,
    '-1040.0',
    NOW(),
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.bom_number = 'BOM-CURRENT-SENSOR-ASSY'
  AND i.item_name = '0.1uF 0805'
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO bom_items (bom_id, item_id, quantity, uom, created_at, updated_at)
SELECT 
    bh.id,
    i.id,
    1.0,
    '-65.0',
    NOW(),
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.bom_number = 'BOM-CURRENT-SENSOR-ASSY'
  AND i.item_name = '4 pin JST-XH male side entry'
LIMIT 1
ON CONFLICT DO NOTHING;

-- BOM for A21 MotherBoard Assy
INSERT INTO bom_headers (bom_number, item_id, version, status, is_multi_level, created_at, updated_at)
SELECT 'BOM-A21-MOTHERBOARD-ASSY', id, '1.0', 'ACTIVE', false, NOW(), NOW()
FROM items 
WHERE item_name = 'A21 MotherBoard Assy' AND category IN ('SA', 'FG')
LIMIT 1
ON CONFLICT (bom_number) DO NOTHING;

INSERT INTO bom_items (bom_id, item_id, quantity, uom, created_at, updated_at)
SELECT 
    bh.id,
    i.id,
    1.0,
    '30.0',
    NOW(),
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.bom_number = 'BOM-A21-MOTHERBOARD-ASSY'
  AND i.item_name = 'Receiver Module R9MM/R9MX/R9'
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO bom_items (bom_id, item_id, quantity, uom, created_at, updated_at)
SELECT 
    bh.id,
    i.id,
    7.0,
    '-1218.0',
    NOW(),
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.bom_number = 'BOM-A21-MOTHERBOARD-ASSY'
  AND i.item_name = 'Free Wheel Diode SMD M7'
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO bom_items (bom_id, item_id, quantity, uom, created_at, updated_at)
SELECT 
    bh.id,
    i.id,
    3.0,
    'PCS',
    NOW(),
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.bom_number = 'BOM-A21-MOTHERBOARD-ASSY'
  AND i.item_name = 'LM1117 5.0v'
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO bom_items (bom_id, item_id, quantity, uom, created_at, updated_at)
SELECT 
    bh.id,
    i.id,
    1.0,
    'PCS',
    NOW(),
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.bom_number = 'BOM-A21-MOTHERBOARD-ASSY'
  AND i.item_name = 'LM1117 3.3v'
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO bom_items (bom_id, item_id, quantity, uom, created_at, updated_at)
SELECT 
    bh.id,
    i.id,
    1.0,
    'PCS',
    NOW(),
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.bom_number = 'BOM-A21-MOTHERBOARD-ASSY'
  AND i.item_name = 'NEO-6M GPS'
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO bom_items (bom_id, item_id, quantity, uom, created_at, updated_at)
SELECT 
    bh.id,
    i.id,
    2.0,
    '-151.0',
    NOW(),
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.bom_number = 'BOM-A21-MOTHERBOARD-ASSY'
  AND i.item_name = '4mm Male Bullet connector'
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO bom_items (bom_id, item_id, quantity, uom, created_at, updated_at)
SELECT 
    bh.id,
    i.id,
    4.0,
    '-96.0',
    NOW(),
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.bom_number = 'BOM-A21-MOTHERBOARD-ASSY'
  AND i.item_name = '4mm Female Bullet connector'
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO bom_items (bom_id, item_id, quantity, uom, created_at, updated_at)
SELECT 
    bh.id,
    i.id,
    1,
    '-127.0',
    NOW(),
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.bom_number = 'BOM-A21-MOTHERBOARD-ASSY'
  AND i.item_name = '2mm male bullet connector'
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO bom_items (bom_id, item_id, quantity, uom, created_at, updated_at)
SELECT 
    bh.id,
    i.id,
    1,
    '-245.0',
    NOW(),
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.bom_number = 'BOM-A21-MOTHERBOARD-ASSY'
  AND i.item_name = '2mm Female Bullet connector'
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO bom_items (bom_id, item_id, quantity, uom, created_at, updated_at)
SELECT 
    bh.id,
    i.id,
    2.0,
    '-29.0',
    NOW(),
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.bom_number = 'BOM-A21-MOTHERBOARD-ASSY'
  AND i.item_name = '6mm male bullet connector'
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO bom_items (bom_id, item_id, quantity, uom, created_at, updated_at)
SELECT 
    bh.id,
    i.id,
    1.0,
    '-40.0',
    NOW(),
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.bom_number = 'BOM-A21-MOTHERBOARD-ASSY'
  AND i.item_name = '6mm female bullet connector'
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO bom_items (bom_id, item_id, quantity, uom, created_at, updated_at)
SELECT 
    bh.id,
    i.id,
    0.25,
    'PCS',
    NOW(),
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.bom_number = 'BOM-A21-MOTHERBOARD-ASSY'
  AND i.item_name = 'Red 8AWG'
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO bom_items (bom_id, item_id, quantity, uom, created_at, updated_at)
SELECT 
    bh.id,
    i.id,
    0.5,
    'PCS',
    NOW(),
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.bom_number = 'BOM-A21-MOTHERBOARD-ASSY'
  AND i.item_name = 'Red 12AWG'
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO bom_items (bom_id, item_id, quantity, uom, created_at, updated_at)
SELECT 
    bh.id,
    i.id,
    0.3,
    'PCS',
    NOW(),
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.bom_number = 'BOM-A21-MOTHERBOARD-ASSY'
  AND i.item_name = 'Red 18 AWG'
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO bom_items (bom_id, item_id, quantity, uom, created_at, updated_at)
SELECT 
    bh.id,
    i.id,
    2.0,
    '0.0',
    NOW(),
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.bom_number = 'BOM-A21-MOTHERBOARD-ASSY'
  AND i.item_name = 'Buck converter XL7015 50v'
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO bom_items (bom_id, item_id, quantity, uom, created_at, updated_at)
SELECT 
    bh.id,
    i.id,
    1.0,
    'PCS',
    NOW(),
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.bom_number = 'BOM-A21-MOTHERBOARD-ASSY'
  AND i.item_name = 'LM2596HW for PC'
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO bom_items (bom_id, item_id, quantity, uom, created_at, updated_at)
SELECT 
    bh.id,
    i.id,
    1.0,
    'PCS',
    NOW(),
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.bom_number = 'BOM-A21-MOTHERBOARD-ASSY'
  AND i.item_name = 'PWB of Motherboard'
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO bom_items (bom_id, item_id, quantity, uom, created_at, updated_at)
SELECT 
    bh.id,
    i.id,
    10.0,
    '-2.0',
    NOW(),
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.bom_number = 'BOM-A21-MOTHERBOARD-ASSY'
  AND i.item_name = 'Lead paste'
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO bom_items (bom_id, item_id, quantity, uom, created_at, updated_at)
SELECT 
    bh.id,
    i.id,
    10.0,
    '-1.0',
    NOW(),
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.bom_number = 'BOM-A21-MOTHERBOARD-ASSY'
  AND i.item_name = 'Lead wire 22AWG'
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO bom_items (bom_id, item_id, quantity, uom, created_at, updated_at)
SELECT 
    bh.id,
    i.id,
    1.0,
    '60.0',
    NOW(),
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.bom_number = 'BOM-A21-MOTHERBOARD-ASSY'
  AND i.item_name = 'LED 0805 SMD'
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO bom_items (bom_id, item_id, quantity, uom, created_at, updated_at)
SELECT 
    bh.id,
    i.id,
    4.0,
    '-1364.0',
    NOW(),
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.bom_number = 'BOM-A21-MOTHERBOARD-ASSY'
  AND i.item_name = '18pF 0805 capacitor'
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO bom_items (bom_id, item_id, quantity, uom, created_at, updated_at)
SELECT 
    bh.id,
    i.id,
    3.0,
    '180.0',
    NOW(),
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.bom_number = 'BOM-A21-MOTHERBOARD-ASSY'
  AND i.item_name = '10uF 10v Tantalum Capacitor Case A'
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO bom_items (bom_id, item_id, quantity, uom, created_at, updated_at)
SELECT 
    bh.id,
    i.id,
    2.0,
    '-40.0',
    NOW(),
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.bom_number = 'BOM-A21-MOTHERBOARD-ASSY'
  AND i.item_name = 'SPST relay 5A-12v ANTI_S & KILL'
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO bom_items (bom_id, item_id, quantity, uom, created_at, updated_at)
SELECT 
    bh.id,
    i.id,
    5.0,
    '6.0',
    NOW(),
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.bom_number = 'BOM-A21-MOTHERBOARD-ASSY'
  AND i.item_name = 'Balancing 1A DPDT 24v Relay'
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO bom_items (bom_id, item_id, quantity, uom, created_at, updated_at)
SELECT 
    bh.id,
    i.id,
    1.0,
    '-19.0',
    NOW(),
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.bom_number = 'BOM-A21-MOTHERBOARD-ASSY'
  AND i.item_name = 'Balancing relay 5A/2A 24v SPST'
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO bom_items (bom_id, item_id, quantity, uom, created_at, updated_at)
SELECT 
    bh.id,
    i.id,
    1.0,
    '-16.0',
    NOW(),
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.bom_number = 'BOM-A21-MOTHERBOARD-ASSY'
  AND i.item_name = 'BlueTooth Module'
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO bom_items (bom_id, item_id, quantity, uom, created_at, updated_at)
SELECT 
    bh.id,
    i.id,
    10.0,
    '-4.0',
    NOW(),
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.bom_number = 'BOM-A21-MOTHERBOARD-ASSY'
  AND i.item_name = '24AWG Soldering Wire'
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO bom_items (bom_id, item_id, quantity, uom, created_at, updated_at)
SELECT 
    bh.id,
    i.id,
    1.0,
    '-2.0',
    NOW(),
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.bom_number = 'BOM-A21-MOTHERBOARD-ASSY'
  AND i.item_name = '12E 2W Resistor THT'
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO bom_items (bom_id, item_id, quantity, uom, created_at, updated_at)
SELECT 
    bh.id,
    i.id,
    1.0,
    '-290.0',
    NOW(),
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.bom_number = 'BOM-A21-MOTHERBOARD-ASSY'
  AND i.item_name = '1k 0805 Resistor'
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO bom_items (bom_id, item_id, quantity, uom, created_at, updated_at)
SELECT 
    bh.id,
    i.id,
    2.0,
    'PCS',
    NOW(),
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.bom_number = 'BOM-A21-MOTHERBOARD-ASSY'
  AND i.item_name = '51k 0805 resistor'
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO bom_items (bom_id, item_id, quantity, uom, created_at, updated_at)
SELECT 
    bh.id,
    i.id,
    1.0,
    '-440.0',
    NOW(),
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.bom_number = 'BOM-A21-MOTHERBOARD-ASSY'
  AND i.item_name = '10k 0805 resistor'
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO bom_items (bom_id, item_id, quantity, uom, created_at, updated_at)
SELECT 
    bh.id,
    i.id,
    12.0,
    '360.0',
    NOW(),
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.bom_number = 'BOM-A21-MOTHERBOARD-ASSY'
  AND i.item_name = '330E 0805 Resistor'
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO bom_items (bom_id, item_id, quantity, uom, created_at, updated_at)
SELECT 
    bh.id,
    i.id,
    1.0,
    '-7.0',
    NOW(),
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.bom_number = 'BOM-A21-MOTHERBOARD-ASSY'
  AND i.item_name = 'Female Bergstrip 40x1 2.54mm'
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO bom_items (bom_id, item_id, quantity, uom, created_at, updated_at)
SELECT 
    bh.id,
    i.id,
    1.0,
    '7.0',
    NOW(),
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.bom_number = 'BOM-A21-MOTHERBOARD-ASSY'
  AND i.item_name = 'Male Bergstrip 40x1 2.54mm'
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO bom_items (bom_id, item_id, quantity, uom, created_at, updated_at)
SELECT 
    bh.id,
    i.id,
    20.0,
    '598.0',
    NOW(),
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.bom_number = 'BOM-A21-MOTHERBOARD-ASSY'
  AND i.item_name = 'Conformal Coating'
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO bom_items (bom_id, item_id, quantity, uom, created_at, updated_at)
SELECT 
    bh.id,
    i.id,
    5.0,
    'PCS',
    NOW(),
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.bom_number = 'BOM-A21-MOTHERBOARD-ASSY'
  AND i.item_name = 'Soldering flux'
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO bom_items (bom_id, item_id, quantity, uom, created_at, updated_at)
SELECT 
    bh.id,
    i.id,
    3.0,
    '-227.9',
    NOW(),
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.bom_number = 'BOM-A21-MOTHERBOARD-ASSY'
  AND i.item_name = '2 pin JST-XH male top entry'
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO bom_items (bom_id, item_id, quantity, uom, created_at, updated_at)
SELECT 
    bh.id,
    i.id,
    1.0,
    '0.0',
    NOW(),
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.bom_number = 'BOM-A21-MOTHERBOARD-ASSY'
  AND i.item_name = '2 pin JST-XH male top entry RED'
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO bom_items (bom_id, item_id, quantity, uom, created_at, updated_at)
SELECT 
    bh.id,
    i.id,
    1.0,
    '-307.0',
    NOW(),
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.bom_number = 'BOM-A21-MOTHERBOARD-ASSY'
  AND i.item_name = '13 pin JST-XH male top entry'
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO bom_items (bom_id, item_id, quantity, uom, created_at, updated_at)
SELECT 
    bh.id,
    i.id,
    2.0,
    '-175.0',
    NOW(),
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.bom_number = 'BOM-A21-MOTHERBOARD-ASSY'
  AND i.item_name = '15 pin JST-XH male top entry'
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO bom_items (bom_id, item_id, quantity, uom, created_at, updated_at)
SELECT 
    bh.id,
    i.id,
    10.0,
    '-316.0',
    NOW(),
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.bom_number = 'BOM-A21-MOTHERBOARD-ASSY'
  AND i.item_name = 'JST-XH Crimping pins'
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO bom_items (bom_id, item_id, quantity, uom, created_at, updated_at)
SELECT 
    bh.id,
    i.id,
    1.0,
    '-150.0',
    NOW(),
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.bom_number = 'BOM-A21-MOTHERBOARD-ASSY'
  AND i.item_name = 'Fuse 500mA'
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO bom_items (bom_id, item_id, quantity, uom, created_at, updated_at)
SELECT 
    bh.id,
    i.id,
    2.0,
    '12.0',
    NOW(),
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.bom_number = 'BOM-A21-MOTHERBOARD-ASSY'
  AND i.item_name = 'MCP3208'
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO bom_items (bom_id, item_id, quantity, uom, created_at, updated_at)
SELECT 
    bh.id,
    i.id,
    1.0,
    '-26.0',
    NOW(),
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.bom_number = 'BOM-A21-MOTHERBOARD-ASSY'
  AND i.item_name = '23A 24v Power relay'
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO bom_items (bom_id, item_id, quantity, uom, created_at, updated_at)
SELECT 
    bh.id,
    i.id,
    12.0,
    'PCS',
    NOW(),
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.bom_number = 'BOM-A21-MOTHERBOARD-ASSY'
  AND i.item_name = '470k 0805 PANASONIC'
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO bom_items (bom_id, item_id, quantity, uom, created_at, updated_at)
SELECT 
    bh.id,
    i.id,
    12.0,
    'PCS',
    NOW(),
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.bom_number = 'BOM-A21-MOTHERBOARD-ASSY'
  AND i.item_name = '20k 0805 resistor PANASONIC'
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO bom_items (bom_id, item_id, quantity, uom, created_at, updated_at)
SELECT 
    bh.id,
    i.id,
    12.0,
    '49.0',
    NOW(),
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.bom_number = 'BOM-A21-MOTHERBOARD-ASSY'
  AND i.item_name = '1uF 0805 PANASONIC'
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO bom_items (bom_id, item_id, quantity, uom, created_at, updated_at)
SELECT 
    bh.id,
    i.id,
    2.0,
    '-160.0',
    NOW(),
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.bom_number = 'BOM-A21-MOTHERBOARD-ASSY'
  AND i.item_name = '16MHz Crystal Oscillator'
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO bom_items (bom_id, item_id, quantity, uom, created_at, updated_at)
SELECT 
    bh.id,
    i.id,
    1.0,
    '-71.8',
    NOW(),
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.bom_number = 'BOM-A21-MOTHERBOARD-ASSY'
  AND i.item_name = 'ULN2004 SMD'
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO bom_items (bom_id, item_id, quantity, uom, created_at, updated_at)
SELECT 
    bh.id,
    i.id,
    6.0,
    '-120.0',
    NOW(),
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.bom_number = 'BOM-A21-MOTHERBOARD-ASSY'
  AND i.item_name = 'SSR AQW282SX'
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO bom_items (bom_id, item_id, quantity, uom, created_at, updated_at)
SELECT 
    bh.id,
    i.id,
    2.0,
    'PCS',
    NOW(),
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.bom_number = 'BOM-A21-MOTHERBOARD-ASSY'
  AND i.item_name = 'Atmega328P-AU'
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO bom_items (bom_id, item_id, quantity, uom, created_at, updated_at)
SELECT 
    bh.id,
    i.id,
    1.0,
    'PCS',
    NOW(),
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.bom_number = 'BOM-A21-MOTHERBOARD-ASSY'
  AND i.item_name = 'Power Relay 120A 12v'
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO bom_items (bom_id, item_id, quantity, uom, created_at, updated_at)
SELECT 
    bh.id,
    i.id,
    0.2,
    '-380.0',
    NOW(),
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.bom_number = 'BOM-A21-MOTHERBOARD-ASSY'
  AND i.item_name = 'Heatshrink Tube 6.4:1.6'
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO bom_items (bom_id, item_id, quantity, uom, created_at, updated_at)
SELECT 
    bh.id,
    i.id,
    0.1,
    '-175.0',
    NOW(),
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.bom_number = 'BOM-A21-MOTHERBOARD-ASSY'
  AND i.item_name = 'Heatshrink Tube 9:3'
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO bom_items (bom_id, item_id, quantity, uom, created_at, updated_at)
SELECT 
    bh.id,
    i.id,
    1,
    '0.0',
    NOW(),
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.bom_number = 'BOM-A21-MOTHERBOARD-ASSY'
  AND i.item_name = 'Current Sensor Assy'
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO bom_items (bom_id, item_id, quantity, uom, created_at, updated_at)
SELECT 
    bh.id,
    i.id,
    1,
    '0.0',
    NOW(),
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.bom_number = 'BOM-A21-MOTHERBOARD-ASSY'
  AND i.item_name = 'RPM Sensor Assy'
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO bom_items (bom_id, item_id, quantity, uom, created_at, updated_at)
SELECT 
    bh.id,
    i.id,
    1.0,
    'PCS',
    NOW(),
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.bom_number = 'BOM-A21-MOTHERBOARD-ASSY'
  AND i.item_name = 'Tactile switch'
LIMIT 1
ON CONFLICT DO NOTHING;

-- BOM for Electronic Box Assy
INSERT INTO bom_headers (bom_number, item_id, version, status, is_multi_level, created_at, updated_at)
SELECT 'BOM-ELECTRONIC-BOX-ASSY', id, '1.0', 'ACTIVE', false, NOW(), NOW()
FROM items 
WHERE item_name = 'Electronic Box Assy' AND category IN ('SA', 'FG')
LIMIT 1
ON CONFLICT (bom_number) DO NOTHING;

INSERT INTO bom_items (bom_id, item_id, quantity, uom, created_at, updated_at)
SELECT 
    bh.id,
    i.id,
    1.0,
    'PCS',
    NOW(),
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.bom_number = 'BOM-ELECTRONIC-BOX-ASSY'
  AND i.item_name = 'Ipex4 to SMA converter extension'
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO bom_items (bom_id, item_id, quantity, uom, created_at, updated_at)
SELECT 
    bh.id,
    i.id,
    1.0,
    '-246.0',
    NOW(),
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.bom_number = 'BOM-ELECTRONIC-BOX-ASSY'
  AND i.item_name = 'Electronic Box Top Lid'
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO bom_items (bom_id, item_id, quantity, uom, created_at, updated_at)
SELECT 
    bh.id,
    i.id,
    1.0,
    'PCS',
    NOW(),
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.bom_number = 'BOM-ELECTRONIC-BOX-ASSY'
  AND i.item_name = 'BlueRobotics Leak'
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO bom_items (bom_id, item_id, quantity, uom, created_at, updated_at)
SELECT 
    bh.id,
    i.id,
    1.0,
    '-4.0',
    NOW(),
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.bom_number = 'BOM-ELECTRONIC-BOX-ASSY'
  AND i.item_name = 'BlueRobotics Indicator'
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO bom_items (bom_id, item_id, quantity, uom, created_at, updated_at)
SELECT 
    bh.id,
    i.id,
    5.0,
    'PCS',
    NOW(),
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.bom_number = 'BOM-ELECTRONIC-BOX-ASSY'
  AND i.item_name = 'M4x6 PCB mount screw Magnetic'
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO bom_items (bom_id, item_id, quantity, uom, created_at, updated_at)
SELECT 
    bh.id,
    i.id,
    3.0,
    '-4.9',
    NOW(),
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.bom_number = 'BOM-ELECTRONIC-BOX-ASSY'
  AND i.item_name = 'PG-7 Cable Gland'
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO bom_items (bom_id, item_id, quantity, uom, created_at, updated_at)
SELECT 
    bh.id,
    i.id,
    1.0,
    '-239.0',
    NOW(),
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.bom_number = 'BOM-ELECTRONIC-BOX-ASSY'
  AND i.item_name = 'Electronic Box'
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO bom_items (bom_id, item_id, quantity, uom, created_at, updated_at)
SELECT 
    bh.id,
    i.id,
    1.0,
    'PCS',
    NOW(),
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.bom_number = 'BOM-ELECTRONIC-BOX-ASSY'
  AND i.item_name = 'IM Front Lid'
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO bom_items (bom_id, item_id, quantity, uom, created_at, updated_at)
SELECT 
    bh.id,
    i.id,
    10.0,
    '1481.0',
    NOW(),
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.bom_number = 'BOM-ELECTRONIC-BOX-ASSY'
  AND i.item_name = 'Teroson MS930'
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO bom_items (bom_id, item_id, quantity, uom, created_at, updated_at)
SELECT 
    bh.id,
    i.id,
    20.0,
    '596.0',
    NOW(),
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.bom_number = 'BOM-ELECTRONIC-BOX-ASSY'
  AND i.item_name = 'Silicon RTV 732'
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO bom_items (bom_id, item_id, quantity, uom, created_at, updated_at)
SELECT 
    bh.id,
    i.id,
    1,
    '0.0',
    NOW(),
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.bom_number = 'BOM-ELECTRONIC-BOX-ASSY'
  AND i.item_name = 'Power Switch Assy'
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO bom_items (bom_id, item_id, quantity, uom, created_at, updated_at)
SELECT 
    bh.id,
    i.id,
    4.0,
    '186.0',
    NOW(),
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.bom_number = 'BOM-ELECTRONIC-BOX-ASSY'
  AND i.item_name = 'M4x20 CSK Phillips'
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO bom_items (bom_id, item_id, quantity, uom, created_at, updated_at)
SELECT 
    bh.id,
    i.id,
    1,
    '0.0',
    NOW(),
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.bom_number = 'BOM-ELECTRONIC-BOX-ASSY'
  AND i.item_name = 'STBD Signal PM Assy'
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO bom_items (bom_id, item_id, quantity, uom, created_at, updated_at)
SELECT 
    bh.id,
    i.id,
    1,
    '0.0',
    NOW(),
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.bom_number = 'BOM-ELECTRONIC-BOX-ASSY'
  AND i.item_name = 'PORT Signal PM Assy'
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO bom_items (bom_id, item_id, quantity, uom, created_at, updated_at)
SELECT 
    bh.id,
    i.id,
    1,
    '0.0',
    NOW(),
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.bom_number = 'BOM-ELECTRONIC-BOX-ASSY'
  AND i.item_name = 'Current Sensor Assy'
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO bom_items (bom_id, item_id, quantity, uom, created_at, updated_at)
SELECT 
    bh.id,
    i.id,
    1,
    '-40.0',
    NOW(),
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.bom_number = 'BOM-ELECTRONIC-BOX-ASSY'
  AND i.item_name = 'A21 MotherBoard Assy'
LIMIT 1
ON CONFLICT DO NOTHING;

-- BOM for FL_STBD Elec
INSERT INTO bom_headers (bom_number, item_id, version, status, is_multi_level, created_at, updated_at)
SELECT 'BOM-FLSTBD-ELEC', id, '1.0', 'ACTIVE', false, NOW(), NOW()
FROM items 
WHERE item_name = 'FL_STBD Elec' AND category IN ('SA', 'FG')
LIMIT 1
ON CONFLICT (bom_number) DO NOTHING;

INSERT INTO bom_items (bom_id, item_id, quantity, uom, created_at, updated_at)
SELECT 
    bh.id,
    i.id,
    2.0,
    '-127.0',
    NOW(),
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.bom_number = 'BOM-FLSTBD-ELEC'
  AND i.item_name = '2mm male bullet connector'
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO bom_items (bom_id, item_id, quantity, uom, created_at, updated_at)
SELECT 
    bh.id,
    i.id,
    1.0,
    '-107.0',
    NOW(),
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.bom_number = 'BOM-FLSTBD-ELEC'
  AND i.item_name = 'PWB of STBD flash light'
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO bom_items (bom_id, item_id, quantity, uom, created_at, updated_at)
SELECT 
    bh.id,
    i.id,
    0.55,
    '-205.0',
    NOW(),
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.bom_number = 'BOM-FLSTBD-ELEC'
  AND i.item_name = 'Red 14/38 wire'
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO bom_items (bom_id, item_id, quantity, uom, created_at, updated_at)
SELECT 
    bh.id,
    i.id,
    0.35,
    '-165.0',
    NOW(),
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.bom_number = 'BOM-FLSTBD-ELEC'
  AND i.item_name = 'Black 14/38 Wire'
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO bom_items (bom_id, item_id, quantity, uom, created_at, updated_at)
SELECT 
    bh.id,
    i.id,
    4.0,
    '-220.0',
    NOW(),
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.bom_number = 'BOM-FLSTBD-ELEC'
  AND i.item_name = 'Green 2835 SMD LED 1W'
LIMIT 1
ON CONFLICT DO NOTHING;

-- BOM for FL_PORT Elec
INSERT INTO bom_headers (bom_number, item_id, version, status, is_multi_level, created_at, updated_at)
SELECT 'BOM-FLPORT-ELEC', id, '1.0', 'ACTIVE', false, NOW(), NOW()
FROM items 
WHERE item_name = 'FL_PORT Elec' AND category IN ('SA', 'FG')
LIMIT 1
ON CONFLICT (bom_number) DO NOTHING;

INSERT INTO bom_items (bom_id, item_id, quantity, uom, created_at, updated_at)
SELECT 
    bh.id,
    i.id,
    1.0,
    '-127.0',
    NOW(),
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.bom_number = 'BOM-FLPORT-ELEC'
  AND i.item_name = '2mm male bullet connector'
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO bom_items (bom_id, item_id, quantity, uom, created_at, updated_at)
SELECT 
    bh.id,
    i.id,
    1.0,
    '-245.0',
    NOW(),
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.bom_number = 'BOM-FLPORT-ELEC'
  AND i.item_name = '2mm Female Bullet connector'
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO bom_items (bom_id, item_id, quantity, uom, created_at, updated_at)
SELECT 
    bh.id,
    i.id,
    1.0,
    '-88.0',
    NOW(),
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.bom_number = 'BOM-FLPORT-ELEC'
  AND i.item_name = 'PWB of PORT flash light'
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO bom_items (bom_id, item_id, quantity, uom, created_at, updated_at)
SELECT 
    bh.id,
    i.id,
    0.35,
    '-205.0',
    NOW(),
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.bom_number = 'BOM-FLPORT-ELEC'
  AND i.item_name = 'Red 14/38 wire'
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO bom_items (bom_id, item_id, quantity, uom, created_at, updated_at)
SELECT 
    bh.id,
    i.id,
    0.55,
    '-165.0',
    NOW(),
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.bom_number = 'BOM-FLPORT-ELEC'
  AND i.item_name = 'Black 14/38 Wire'
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO bom_items (bom_id, item_id, quantity, uom, created_at, updated_at)
SELECT 
    bh.id,
    i.id,
    6.0,
    '-247.0',
    NOW(),
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.bom_number = 'BOM-FLPORT-ELEC'
  AND i.item_name = 'Red 2835 SMD LED 1W'
LIMIT 1
ON CONFLICT DO NOTHING;

-- BOM for FL_STBD Mech
INSERT INTO bom_headers (bom_number, item_id, version, status, is_multi_level, created_at, updated_at)
SELECT 'BOM-FLSTBD-MECH', id, '1.0', 'ACTIVE', false, NOW(), NOW()
FROM items 
WHERE item_name = 'FL_STBD Mech' AND category IN ('SA', 'FG')
LIMIT 1
ON CONFLICT (bom_number) DO NOTHING;

INSERT INTO bom_items (bom_id, item_id, quantity, uom, created_at, updated_at)
SELECT 
    bh.id,
    i.id,
    6.0,
    '248.0',
    NOW(),
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.bom_number = 'BOM-FLSTBD-MECH'
  AND i.item_name = 'M3x8 Button Head'
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO bom_items (bom_id, item_id, quantity, uom, created_at, updated_at)
SELECT 
    bh.id,
    i.id,
    1.0,
    '-92.0',
    NOW(),
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.bom_number = 'BOM-FLSTBD-MECH'
  AND i.item_name = 'Flashing Light glass'
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO bom_items (bom_id, item_id, quantity, uom, created_at, updated_at)
SELECT 
    bh.id,
    i.id,
    1.0,
    '-75.0',
    NOW(),
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.bom_number = 'BOM-FLSTBD-MECH'
  AND i.item_name = 'Flashing Light bottom plate'
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO bom_items (bom_id, item_id, quantity, uom, created_at, updated_at)
SELECT 
    bh.id,
    i.id,
    5.0,
    '-450.0',
    NOW(),
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.bom_number = 'BOM-FLSTBD-MECH'
  AND i.item_name = 'Heatsink paste'
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO bom_items (bom_id, item_id, quantity, uom, created_at, updated_at)
SELECT 
    bh.id,
    i.id,
    2.0,
    'PCS',
    NOW(),
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.bom_number = 'BOM-FLSTBD-MECH'
  AND i.item_name = 'M3x6 Allen Head'
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO bom_items (bom_id, item_id, quantity, uom, created_at, updated_at)
SELECT 
    bh.id,
    i.id,
    2.0,
    '498.0',
    NOW(),
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.bom_number = 'BOM-FLSTBD-MECH'
  AND i.item_name = 'M4x12 Allen Head'
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO bom_items (bom_id, item_id, quantity, uom, created_at, updated_at)
SELECT 
    bh.id,
    i.id,
    5.0,
    '1481.0',
    NOW(),
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.bom_number = 'BOM-FLSTBD-MECH'
  AND i.item_name = 'Teroson MS930'
LIMIT 1
ON CONFLICT DO NOTHING;

-- BOM for FL_PORT Mech
INSERT INTO bom_headers (bom_number, item_id, version, status, is_multi_level, created_at, updated_at)
SELECT 'BOM-FLPORT-MECH', id, '1.0', 'ACTIVE', false, NOW(), NOW()
FROM items 
WHERE item_name = 'FL_PORT Mech' AND category IN ('SA', 'FG')
LIMIT 1
ON CONFLICT (bom_number) DO NOTHING;

INSERT INTO bom_items (bom_id, item_id, quantity, uom, created_at, updated_at)
SELECT 
    bh.id,
    i.id,
    6.0,
    '248.0',
    NOW(),
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.bom_number = 'BOM-FLPORT-MECH'
  AND i.item_name = 'M3x8 Button Head'
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO bom_items (bom_id, item_id, quantity, uom, created_at, updated_at)
SELECT 
    bh.id,
    i.id,
    1.0,
    '-92.0',
    NOW(),
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.bom_number = 'BOM-FLPORT-MECH'
  AND i.item_name = 'Flashing Light glass'
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO bom_items (bom_id, item_id, quantity, uom, created_at, updated_at)
SELECT 
    bh.id,
    i.id,
    1.0,
    '-75.0',
    NOW(),
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.bom_number = 'BOM-FLPORT-MECH'
  AND i.item_name = 'Flashing Light bottom plate'
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO bom_items (bom_id, item_id, quantity, uom, created_at, updated_at)
SELECT 
    bh.id,
    i.id,
    5.0,
    '-450.0',
    NOW(),
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.bom_number = 'BOM-FLPORT-MECH'
  AND i.item_name = 'Heatsink paste'
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO bom_items (bom_id, item_id, quantity, uom, created_at, updated_at)
SELECT 
    bh.id,
    i.id,
    2.0,
    'PCS',
    NOW(),
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.bom_number = 'BOM-FLPORT-MECH'
  AND i.item_name = 'M3x6 Allen Head'
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO bom_items (bom_id, item_id, quantity, uom, created_at, updated_at)
SELECT 
    bh.id,
    i.id,
    2.0,
    '498.0',
    NOW(),
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.bom_number = 'BOM-FLPORT-MECH'
  AND i.item_name = 'M4x12 Allen Head'
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO bom_items (bom_id, item_id, quantity, uom, created_at, updated_at)
SELECT 
    bh.id,
    i.id,
    5.0,
    '1481.0',
    NOW(),
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.bom_number = 'BOM-FLPORT-MECH'
  AND i.item_name = 'Teroson MS930'
LIMIT 1
ON CONFLICT DO NOTHING;

-- BOM for Battery Block Assy
INSERT INTO bom_headers (bom_number, item_id, version, status, is_multi_level, created_at, updated_at)
SELECT 'BOM-BATTERY-BLOCK-ASSY', id, '1.0', 'ACTIVE', false, NOW(), NOW()
FROM items 
WHERE item_name = 'Battery Block Assy' AND category IN ('SA', 'FG')
LIMIT 1
ON CONFLICT (bom_number) DO NOTHING;

INSERT INTO bom_items (bom_id, item_id, quantity, uom, created_at, updated_at)
SELECT 
    bh.id,
    i.id,
    18.0,
    'PCS',
    NOW(),
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.bom_number = 'BOM-BATTERY-BLOCK-ASSY'
  AND i.item_name = 'Li-In 21700 Cells Molicel P42A/ Samsung-40T'
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO bom_items (bom_id, item_id, quantity, uom, created_at, updated_at)
SELECT 
    bh.id,
    i.id,
    5.0,
    'PCS',
    NOW(),
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.bom_number = 'BOM-BATTERY-BLOCK-ASSY'
  AND i.item_name = 'Soldering flux'
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO bom_items (bom_id, item_id, quantity, uom, created_at, updated_at)
SELECT 
    bh.id,
    i.id,
    5.0,
    '-149.0',
    NOW(),
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.bom_number = 'BOM-BATTERY-BLOCK-ASSY'
  AND i.item_name = 'Copper Strips 3x2 cells'
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO bom_items (bom_id, item_id, quantity, uom, created_at, updated_at)
SELECT 
    bh.id,
    i.id,
    2.5,
    '0.0',
    NOW(),
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.bom_number = 'BOM-BATTERY-BLOCK-ASSY'
  AND i.item_name = '70mm Paper Separator'
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO bom_items (bom_id, item_id, quantity, uom, created_at, updated_at)
SELECT 
    bh.id,
    i.id,
    18.0,
    '-8120.0',
    NOW(),
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.bom_number = 'BOM-BATTERY-BLOCK-ASSY'
  AND i.item_name = 'Barley paper for 21700 cylindrical cell'
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO bom_items (bom_id, item_id, quantity, uom, created_at, updated_at)
SELECT 
    bh.id,
    i.id,
    0.5,
    '95.0',
    NOW(),
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.bom_number = 'BOM-BATTERY-BLOCK-ASSY'
  AND i.item_name = '1" Masking Tape'
LIMIT 1
ON CONFLICT DO NOTHING;

-- BOM for STBD Battery Assy
INSERT INTO bom_headers (bom_number, item_id, version, status, is_multi_level, created_at, updated_at)
SELECT 'BOM-STBD-BATTERY-ASSY', id, '1.0', 'ACTIVE', false, NOW(), NOW()
FROM items 
WHERE item_name = 'STBD Battery Assy' AND category IN ('SA', 'FG')
LIMIT 1
ON CONFLICT (bom_number) DO NOTHING;

INSERT INTO bom_items (bom_id, item_id, quantity, uom, created_at, updated_at)
SELECT 
    bh.id,
    i.id,
    1.0,
    '-40.0',
    NOW(),
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.bom_number = 'BOM-STBD-BATTERY-ASSY'
  AND i.item_name = '6mm female bullet connector'
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO bom_items (bom_id, item_id, quantity, uom, created_at, updated_at)
SELECT 
    bh.id,
    i.id,
    1.0,
    '-97.0',
    NOW(),
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.bom_number = 'BOM-STBD-BATTERY-ASSY'
  AND i.item_name = '8mm male bullet connector'
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO bom_items (bom_id, item_id, quantity, uom, created_at, updated_at)
SELECT 
    bh.id,
    i.id,
    0.65,
    'PCS',
    NOW(),
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.bom_number = 'BOM-STBD-BATTERY-ASSY'
  AND i.item_name = 'Black 8AWG'
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO bom_items (bom_id, item_id, quantity, uom, created_at, updated_at)
SELECT 
    bh.id,
    i.id,
    0.65,
    'PCS',
    NOW(),
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.bom_number = 'BOM-STBD-BATTERY-ASSY'
  AND i.item_name = 'Red 8AWG'
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO bom_items (bom_id, item_id, quantity, uom, created_at, updated_at)
SELECT 
    bh.id,
    i.id,
    5.0,
    'PCS',
    NOW(),
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.bom_number = 'BOM-STBD-BATTERY-ASSY'
  AND i.item_name = 'Soldering flux'
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO bom_items (bom_id, item_id, quantity, uom, created_at, updated_at)
SELECT 
    bh.id,
    i.id,
    1.0,
    'PCS',
    NOW(),
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.bom_number = 'BOM-STBD-BATTERY-ASSY'
  AND i.item_name = '2mm FRP 60x70mm'
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO bom_items (bom_id, item_id, quantity, uom, created_at, updated_at)
SELECT 
    bh.id,
    i.id,
    1.0,
    '38.0',
    NOW(),
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.bom_number = 'BOM-STBD-BATTERY-ASSY'
  AND i.item_name = '2mm FRP 60x70mm with 18 mm hole'
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO bom_items (bom_id, item_id, quantity, uom, created_at, updated_at)
SELECT 
    bh.id,
    i.id,
    0.5,
    '0.0',
    NOW(),
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.bom_number = 'BOM-STBD-BATTERY-ASSY'
  AND i.item_name = '70mm Paper Separator'
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO bom_items (bom_id, item_id, quantity, uom, created_at, updated_at)
SELECT 
    bh.id,
    i.id,
    30.0,
    '588.0',
    NOW(),
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.bom_number = 'BOM-STBD-BATTERY-ASSY'
  AND i.item_name = '16AWG Lead'
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO bom_items (bom_id, item_id, quantity, uom, created_at, updated_at)
SELECT 
    bh.id,
    i.id,
    0.06,
    '10.0',
    NOW(),
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.bom_number = 'BOM-STBD-BATTERY-ASSY'
  AND i.item_name = 'HeatShrink Tube 12:3'
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO bom_items (bom_id, item_id, quantity, uom, created_at, updated_at)
SELECT 
    bh.id,
    i.id,
    1.0,
    '0.0',
    NOW(),
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.bom_number = 'BOM-STBD-BATTERY-ASSY'
  AND i.item_name = 'STBD Signal CM Assy'
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO bom_items (bom_id, item_id, quantity, uom, created_at, updated_at)
SELECT 
    bh.id,
    i.id,
    1,
    '-6.0',
    NOW(),
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.bom_number = 'BOM-STBD-BATTERY-ASSY'
  AND i.item_name = 'Battery Block Assy'
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO bom_items (bom_id, item_id, quantity, uom, created_at, updated_at)
SELECT 
    bh.id,
    i.id,
    0.17,
    '-71.2',
    NOW(),
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.bom_number = 'BOM-STBD-BATTERY-ASSY'
  AND i.item_name = 'HeatShrink Tube 100mm'
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO bom_items (bom_id, item_id, quantity, uom, created_at, updated_at)
SELECT 
    bh.id,
    i.id,
    20.0,
    '1481.0',
    NOW(),
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.bom_number = 'BOM-STBD-BATTERY-ASSY'
  AND i.item_name = 'Teroson MS930'
LIMIT 1
ON CONFLICT DO NOTHING;

-- BOM for PORT Battery Assy
INSERT INTO bom_headers (bom_number, item_id, version, status, is_multi_level, created_at, updated_at)
SELECT 'BOM-PORT-BATTERY-ASSY', id, '1.0', 'ACTIVE', false, NOW(), NOW()
FROM items 
WHERE item_name = 'PORT Battery Assy' AND category IN ('SA', 'FG')
LIMIT 1
ON CONFLICT (bom_number) DO NOTHING;

INSERT INTO bom_items (bom_id, item_id, quantity, uom, created_at, updated_at)
SELECT 
    bh.id,
    i.id,
    2.0,
    '-96.0',
    NOW(),
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.bom_number = 'BOM-PORT-BATTERY-ASSY'
  AND i.item_name = '4mm Female Bullet connector'
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO bom_items (bom_id, item_id, quantity, uom, created_at, updated_at)
SELECT 
    bh.id,
    i.id,
    1.0,
    '-245.0',
    NOW(),
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.bom_number = 'BOM-PORT-BATTERY-ASSY'
  AND i.item_name = '2mm Female Bullet connector'
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO bom_items (bom_id, item_id, quantity, uom, created_at, updated_at)
SELECT 
    bh.id,
    i.id,
    1.0,
    '-604.0',
    NOW(),
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.bom_number = 'BOM-PORT-BATTERY-ASSY'
  AND i.item_name = '8mm female bullet connector'
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO bom_items (bom_id, item_id, quantity, uom, created_at, updated_at)
SELECT 
    bh.id,
    i.id,
    0.65,
    'PCS',
    NOW(),
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.bom_number = 'BOM-PORT-BATTERY-ASSY'
  AND i.item_name = 'Red 8AWG'
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO bom_items (bom_id, item_id, quantity, uom, created_at, updated_at)
SELECT 
    bh.id,
    i.id,
    0.8,
    'PCS',
    NOW(),
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.bom_number = 'BOM-PORT-BATTERY-ASSY'
  AND i.item_name = 'Black 12AWG'
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO bom_items (bom_id, item_id, quantity, uom, created_at, updated_at)
SELECT 
    bh.id,
    i.id,
    0.55,
    'PCS',
    NOW(),
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.bom_number = 'BOM-PORT-BATTERY-ASSY'
  AND i.item_name = 'Black 18 AWG'
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO bom_items (bom_id, item_id, quantity, uom, created_at, updated_at)
SELECT 
    bh.id,
    i.id,
    5.0,
    'PCS',
    NOW(),
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.bom_number = 'BOM-PORT-BATTERY-ASSY'
  AND i.item_name = 'Soldering flux'
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO bom_items (bom_id, item_id, quantity, uom, created_at, updated_at)
SELECT 
    bh.id,
    i.id,
    1.0,
    'PCS',
    NOW(),
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.bom_number = 'BOM-PORT-BATTERY-ASSY'
  AND i.item_name = '2mm FRP 60x70mm'
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO bom_items (bom_id, item_id, quantity, uom, created_at, updated_at)
SELECT 
    bh.id,
    i.id,
    1.0,
    '38.0',
    NOW(),
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.bom_number = 'BOM-PORT-BATTERY-ASSY'
  AND i.item_name = '2mm FRP 60x70mm with 18 mm hole'
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO bom_items (bom_id, item_id, quantity, uom, created_at, updated_at)
SELECT 
    bh.id,
    i.id,
    0.5,
    '0.0',
    NOW(),
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.bom_number = 'BOM-PORT-BATTERY-ASSY'
  AND i.item_name = '70mm Paper Separator'
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO bom_items (bom_id, item_id, quantity, uom, created_at, updated_at)
SELECT 
    bh.id,
    i.id,
    30.0,
    '588.0',
    NOW(),
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.bom_number = 'BOM-PORT-BATTERY-ASSY'
  AND i.item_name = '16AWG Lead'
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO bom_items (bom_id, item_id, quantity, uom, created_at, updated_at)
SELECT 
    bh.id,
    i.id,
    0.03,
    '10.0',
    NOW(),
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.bom_number = 'BOM-PORT-BATTERY-ASSY'
  AND i.item_name = 'HeatShrink Tube 12:3'
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO bom_items (bom_id, item_id, quantity, uom, created_at, updated_at)
SELECT 
    bh.id,
    i.id,
    1,
    '0.0',
    NOW(),
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.bom_number = 'BOM-PORT-BATTERY-ASSY'
  AND i.item_name = 'PORT Signal CM Assy'
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO bom_items (bom_id, item_id, quantity, uom, created_at, updated_at)
SELECT 
    bh.id,
    i.id,
    1,
    '-6.0',
    NOW(),
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.bom_number = 'BOM-PORT-BATTERY-ASSY'
  AND i.item_name = 'Battery Block Assy'
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO bom_items (bom_id, item_id, quantity, uom, created_at, updated_at)
SELECT 
    bh.id,
    i.id,
    0.17,
    '-71.2',
    NOW(),
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.bom_number = 'BOM-PORT-BATTERY-ASSY'
  AND i.item_name = 'HeatShrink Tube 100mm'
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO bom_items (bom_id, item_id, quantity, uom, created_at, updated_at)
SELECT 
    bh.id,
    i.id,
    20.0,
    '1481.0',
    NOW(),
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.bom_number = 'BOM-PORT-BATTERY-ASSY'
  AND i.item_name = 'Teroson MS930'
LIMIT 1
ON CONFLICT DO NOTHING;

-- BOM for STBD Unit Assy
INSERT INTO bom_headers (bom_number, item_id, version, status, is_multi_level, created_at, updated_at)
SELECT 'BOM-STBD-UNIT-ASSY', id, '1.0', 'ACTIVE', false, NOW(), NOW()
FROM items 
WHERE item_name = 'STBD Unit Assy' AND category IN ('SA', 'FG')
LIMIT 1
ON CONFLICT (bom_number) DO NOTHING;

INSERT INTO bom_items (bom_id, item_id, quantity, uom, created_at, updated_at)
SELECT 
    bh.id,
    i.id,
    1.0,
    'PCS',
    NOW(),
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.bom_number = 'BOM-STBD-UNIT-ASSY'
  AND i.item_name = 'ESC Mounting Clamp'
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO bom_items (bom_id, item_id, quantity, uom, created_at, updated_at)
SELECT 
    bh.id,
    i.id,
    4.0,
    'PCS',
    NOW(),
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.bom_number = 'BOM-STBD-UNIT-ASSY'
  AND i.item_name = 'M4 Nyloc'
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO bom_items (bom_id, item_id, quantity, uom, created_at, updated_at)
SELECT 
    bh.id,
    i.id,
    4.0,
    '350.0',
    NOW(),
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.bom_number = 'BOM-STBD-UNIT-ASSY'
  AND i.item_name = 'M4 Spring washer'
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO bom_items (bom_id, item_id, quantity, uom, created_at, updated_at)
SELECT 
    bh.id,
    i.id,
    4.0,
    '400.0',
    NOW(),
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.bom_number = 'BOM-STBD-UNIT-ASSY'
  AND i.item_name = 'M4x12 plain washer'
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO bom_items (bom_id, item_id, quantity, uom, created_at, updated_at)
SELECT 
    bh.id,
    i.id,
    1.0,
    '0.0',
    NOW(),
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.bom_number = 'BOM-STBD-UNIT-ASSY'
  AND i.item_name = '3mm Silicon Rubber Gaskets (35mmx10mm)'
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO bom_items (bom_id, item_id, quantity, uom, created_at, updated_at)
SELECT 
    bh.id,
    i.id,
    1,
    'PCS',
    NOW(),
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.bom_number = 'BOM-STBD-UNIT-ASSY'
  AND i.item_name = 'Jet Motor Assy'
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO bom_items (bom_id, item_id, quantity, uom, created_at, updated_at)
SELECT 
    bh.id,
    i.id,
    1,
    '0.0',
    NOW(),
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.bom_number = 'BOM-STBD-UNIT-ASSY'
  AND i.item_name = 'STBD_ESC Assy'
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO bom_items (bom_id, item_id, quantity, uom, created_at, updated_at)
SELECT 
    bh.id,
    i.id,
    1,
    '0.0',
    NOW(),
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.bom_number = 'BOM-STBD-UNIT-ASSY'
  AND i.item_name = 'STBD Battery Assy'
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO bom_items (bom_id, item_id, quantity, uom, created_at, updated_at)
SELECT 
    bh.id,
    i.id,
    2.0,
    '186.0',
    NOW(),
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.bom_number = 'BOM-STBD-UNIT-ASSY'
  AND i.item_name = 'M4x20 CSK Phillips'
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO bom_items (bom_id, item_id, quantity, uom, created_at, updated_at)
SELECT 
    bh.id,
    i.id,
    2.0,
    '-14.0',
    NOW(),
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.bom_number = 'BOM-STBD-UNIT-ASSY'
  AND i.item_name = 'M4x16 Allen Head'
LIMIT 1
ON CONFLICT DO NOTHING;

-- BOM for PORT Unit Assy
INSERT INTO bom_headers (bom_number, item_id, version, status, is_multi_level, created_at, updated_at)
SELECT 'BOM-PORT-UNIT-ASSY', id, '1.0', 'ACTIVE', false, NOW(), NOW()
FROM items 
WHERE item_name = 'PORT Unit Assy' AND category IN ('SA', 'FG')
LIMIT 1
ON CONFLICT (bom_number) DO NOTHING;

INSERT INTO bom_items (bom_id, item_id, quantity, uom, created_at, updated_at)
SELECT 
    bh.id,
    i.id,
    1.0,
    'PCS',
    NOW(),
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.bom_number = 'BOM-PORT-UNIT-ASSY'
  AND i.item_name = 'ESC Mounting Clamp'
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO bom_items (bom_id, item_id, quantity, uom, created_at, updated_at)
SELECT 
    bh.id,
    i.id,
    4.0,
    'PCS',
    NOW(),
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.bom_number = 'BOM-PORT-UNIT-ASSY'
  AND i.item_name = 'M4 Nyloc'
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO bom_items (bom_id, item_id, quantity, uom, created_at, updated_at)
SELECT 
    bh.id,
    i.id,
    4.0,
    '350.0',
    NOW(),
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.bom_number = 'BOM-PORT-UNIT-ASSY'
  AND i.item_name = 'M4 Spring washer'
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO bom_items (bom_id, item_id, quantity, uom, created_at, updated_at)
SELECT 
    bh.id,
    i.id,
    4.0,
    '400.0',
    NOW(),
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.bom_number = 'BOM-PORT-UNIT-ASSY'
  AND i.item_name = 'M4x12 plain washer'
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO bom_items (bom_id, item_id, quantity, uom, created_at, updated_at)
SELECT 
    bh.id,
    i.id,
    1.0,
    '0.0',
    NOW(),
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.bom_number = 'BOM-PORT-UNIT-ASSY'
  AND i.item_name = '3mm Silicon Rubber Gaskets (35mmx10mm)'
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO bom_items (bom_id, item_id, quantity, uom, created_at, updated_at)
SELECT 
    bh.id,
    i.id,
    1,
    'PCS',
    NOW(),
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.bom_number = 'BOM-PORT-UNIT-ASSY'
  AND i.item_name = 'Jet Motor Assy'
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO bom_items (bom_id, item_id, quantity, uom, created_at, updated_at)
SELECT 
    bh.id,
    i.id,
    1,
    '0.0',
    NOW(),
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.bom_number = 'BOM-PORT-UNIT-ASSY'
  AND i.item_name = 'PORT_ESC Assy'
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO bom_items (bom_id, item_id, quantity, uom, created_at, updated_at)
SELECT 
    bh.id,
    i.id,
    1,
    '0.0',
    NOW(),
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.bom_number = 'BOM-PORT-UNIT-ASSY'
  AND i.item_name = 'PORT Battery Assy'
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO bom_items (bom_id, item_id, quantity, uom, created_at, updated_at)
SELECT 
    bh.id,
    i.id,
    2.0,
    '186.0',
    NOW(),
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.bom_number = 'BOM-PORT-UNIT-ASSY'
  AND i.item_name = 'M4x20 CSK Phillips'
LIMIT 1
ON CONFLICT DO NOTHING;

-- BOM for Self Rightening Assy
INSERT INTO bom_headers (bom_number, item_id, version, status, is_multi_level, created_at, updated_at)
SELECT 'BOM-SELF-RIGHTENING-ASSY', id, '1.0', 'ACTIVE', false, NOW(), NOW()
FROM items 
WHERE item_name = 'Self Rightening Assy' AND category IN ('SA', 'FG')
LIMIT 1
ON CONFLICT (bom_number) DO NOTHING;

INSERT INTO bom_items (bom_id, item_id, quantity, uom, created_at, updated_at)
SELECT 
    bh.id,
    i.id,
    1.0,
    '18.0',
    NOW(),
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.bom_number = 'BOM-SELF-RIGHTENING-ASSY'
  AND i.item_name = 'SR Structure'
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO bom_items (bom_id, item_id, quantity, uom, created_at, updated_at)
SELECT 
    bh.id,
    i.id,
    1.0,
    '4.0',
    NOW(),
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.bom_number = 'BOM-SELF-RIGHTENING-ASSY'
  AND i.item_name = 'SR Pillow'
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO bom_items (bom_id, item_id, quantity, uom, created_at, updated_at)
SELECT 
    bh.id,
    i.id,
    6.0,
    'PCS',
    NOW(),
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.bom_number = 'BOM-SELF-RIGHTENING-ASSY'
  AND i.item_name = 'M6x50 Button head'
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO bom_items (bom_id, item_id, quantity, uom, created_at, updated_at)
SELECT 
    bh.id,
    i.id,
    6.0,
    'PCS',
    NOW(),
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.bom_number = 'BOM-SELF-RIGHTENING-ASSY'
  AND i.item_name = 'M6 Spring washer (SR structure clamping)'
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO bom_items (bom_id, item_id, quantity, uom, created_at, updated_at)
SELECT 
    bh.id,
    i.id,
    22.0,
    'PCS',
    NOW(),
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.bom_number = 'BOM-SELF-RIGHTENING-ASSY'
  AND i.item_name = 'M6x20 Plain washer (SR structure clamping)'
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO bom_items (bom_id, item_id, quantity, uom, created_at, updated_at)
SELECT 
    bh.id,
    i.id,
    6.0,
    'PCS',
    NOW(),
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.bom_number = 'BOM-SELF-RIGHTENING-ASSY'
  AND i.item_name = 'M6 Dome NUT SS (SR structure Clamping)'
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO bom_items (bom_id, item_id, quantity, uom, created_at, updated_at)
SELECT 
    bh.id,
    i.id,
    20.0,
    '1481.0',
    NOW(),
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.bom_number = 'BOM-SELF-RIGHTENING-ASSY'
  AND i.item_name = 'Teroson MS930'
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO bom_items (bom_id, item_id, quantity, uom, created_at, updated_at)
SELECT 
    bh.id,
    i.id,
    4.0,
    'PCS',
    NOW(),
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.bom_number = 'BOM-SELF-RIGHTENING-ASSY'
  AND i.item_name = '3D printed SR Pillow Side Caps'
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO bom_items (bom_id, item_id, quantity, uom, created_at, updated_at)
SELECT 
    bh.id,
    i.id,
    2.0,
    'PCS',
    NOW(),
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.bom_number = 'BOM-SELF-RIGHTENING-ASSY'
  AND i.item_name = '3D printed SR Pillow Middle Caps'
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO bom_items (bom_id, item_id, quantity, uom, created_at, updated_at)
SELECT 
    bh.id,
    i.id,
    0.15,
    '0.0',
    NOW(),
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.bom_number = 'BOM-SELF-RIGHTENING-ASSY'
  AND i.item_name = '6mmx12mm Rubber Bush'
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO bom_items (bom_id, item_id, quantity, uom, created_at, updated_at)
SELECT 
    bh.id,
    i.id,
    1.0,
    'PCS',
    NOW(),
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.bom_number = 'BOM-SELF-RIGHTENING-ASSY'
  AND i.item_name = 'Thread locker 242/270/290'
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO bom_items (bom_id, item_id, quantity, uom, created_at, updated_at)
SELECT 
    bh.id,
    i.id,
    5.0,
    '-100.0',
    NOW(),
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.bom_number = 'BOM-SELF-RIGHTENING-ASSY'
  AND i.item_name = 'Instant Adhesive 407 for EPE sticking'
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO bom_items (bom_id, item_id, quantity, uom, created_at, updated_at)
SELECT 
    bh.id,
    i.id,
    1.0,
    '0.0',
    NOW(),
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.bom_number = 'BOM-SELF-RIGHTENING-ASSY'
  AND i.item_name = 'STBD SR Rubber Boot'
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO bom_items (bom_id, item_id, quantity, uom, created_at, updated_at)
SELECT 
    bh.id,
    i.id,
    1.0,
    '0.0',
    NOW(),
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.bom_number = 'BOM-SELF-RIGHTENING-ASSY'
  AND i.item_name = 'PORT SR Rubber Boot'
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO bom_items (bom_id, item_id, quantity, uom, created_at, updated_at)
SELECT 
    bh.id,
    i.id,
    4.0,
    'PCS',
    NOW(),
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.bom_number = 'BOM-SELF-RIGHTENING-ASSY'
  AND i.item_name = 'M6x150 Allen head'
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO bom_items (bom_id, item_id, quantity, uom, created_at, updated_at)
SELECT 
    bh.id,
    i.id,
    4.0,
    'PCS',
    NOW(),
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.bom_number = 'BOM-SELF-RIGHTENING-ASSY'
  AND i.item_name = 'M6 Nyloc Nut'
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO bom_items (bom_id, item_id, quantity, uom, created_at, updated_at)
SELECT 
    bh.id,
    i.id,
    1,
    'PCS',
    NOW(),
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.bom_number = 'BOM-SELF-RIGHTENING-ASSY'
  AND i.item_name = 'M6x12 Plain washer'
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO bom_items (bom_id, item_id, quantity, uom, created_at, updated_at)
SELECT 
    bh.id,
    i.id,
    2.6,
    '147.0',
    NOW(),
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.bom_number = 'BOM-SELF-RIGHTENING-ASSY'
  AND i.item_name = 'RR Tape'
LIMIT 1
ON CONFLICT DO NOTHING;

-- BOM for IP Remote Assy
INSERT INTO bom_headers (bom_number, item_id, version, status, is_multi_level, created_at, updated_at)
SELECT 'BOM-IP-REMOTE-ASSY', id, '1.0', 'ACTIVE', false, NOW(), NOW()
FROM items 
WHERE item_name = 'IP Remote Assy' AND category IN ('SA', 'FG')
LIMIT 1
ON CONFLICT (bom_number) DO NOTHING;

INSERT INTO bom_items (bom_id, item_id, quantity, uom, created_at, updated_at)
SELECT 
    bh.id,
    i.id,
    1.0,
    '-4.0',
    NOW(),
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.bom_number = 'BOM-IP-REMOTE-ASSY'
  AND i.item_name = 'QX7 Transmitter with R9M'
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO bom_items (bom_id, item_id, quantity, uom, created_at, updated_at)
SELECT 
    bh.id,
    i.id,
    2.0,
    '-226.0',
    NOW(),
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.bom_number = 'BOM-IP-REMOTE-ASSY'
  AND i.item_name = 'PWB of Button -2'
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO bom_items (bom_id, item_id, quantity, uom, created_at, updated_at)
SELECT 
    bh.id,
    i.id,
    2.0,
    'PCS',
    NOW(),
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.bom_number = 'BOM-IP-REMOTE-ASSY'
  AND i.item_name = 'Li-In 21700 Cells Molicel P42A/ Samsung-40T'
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO bom_items (bom_id, item_id, quantity, uom, created_at, updated_at)
SELECT 
    bh.id,
    i.id,
    1.0,
    '-196.0',
    NOW(),
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.bom_number = 'BOM-IP-REMOTE-ASSY'
  AND i.item_name = '3 pin JST-XH housing'
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO bom_items (bom_id, item_id, quantity, uom, created_at, updated_at)
SELECT 
    bh.id,
    i.id,
    1.0,
    '-30.0',
    NOW(),
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.bom_number = 'BOM-IP-REMOTE-ASSY'
  AND i.item_name = '25cm Red one side crimped wire'
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO bom_items (bom_id, item_id, quantity, uom, created_at, updated_at)
SELECT 
    bh.id,
    i.id,
    1.0,
    '-40.0',
    NOW(),
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.bom_number = 'BOM-IP-REMOTE-ASSY'
  AND i.item_name = '25cm Green one side crimped wire'
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO bom_items (bom_id, item_id, quantity, uom, created_at, updated_at)
SELECT 
    bh.id,
    i.id,
    1.0,
    '-52.0',
    NOW(),
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.bom_number = 'BOM-IP-REMOTE-ASSY'
  AND i.item_name = '25cm Black one side crimped wire'
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO bom_items (bom_id, item_id, quantity, uom, created_at, updated_at)
SELECT 
    bh.id,
    i.id,
    1,
    'PCS',
    NOW(),
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.bom_number = 'BOM-IP-REMOTE-ASSY'
  AND i.item_name = 'Tactile switch'
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO bom_items (bom_id, item_id, quantity, uom, created_at, updated_at)
SELECT 
    bh.id,
    i.id,
    1.0,
    '-125.0',
    NOW(),
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.bom_number = 'BOM-IP-REMOTE-ASSY'
  AND i.item_name = 'R9M Antenna Extension wire RP-SMA to Open'
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO bom_items (bom_id, item_id, quantity, uom, created_at, updated_at)
SELECT 
    bh.id,
    i.id,
    0.2,
    '-165.0',
    NOW(),
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.bom_number = 'BOM-IP-REMOTE-ASSY'
  AND i.item_name = 'Black 14/38 Wire'
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO bom_items (bom_id, item_id, quantity, uom, created_at, updated_at)
SELECT 
    bh.id,
    i.id,
    0.2,
    '-169.0',
    NOW(),
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.bom_number = 'BOM-IP-REMOTE-ASSY'
  AND i.item_name = 'White 14/38 Wire'
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO bom_items (bom_id, item_id, quantity, uom, created_at, updated_at)
SELECT 
    bh.id,
    i.id,
    0.2,
    '-35.0',
    NOW(),
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.bom_number = 'BOM-IP-REMOTE-ASSY'
  AND i.item_name = 'Sky Blue 14/38 Wire'
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO bom_items (bom_id, item_id, quantity, uom, created_at, updated_at)
SELECT 
    bh.id,
    i.id,
    0.2,
    '-205.0',
    NOW(),
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.bom_number = 'BOM-IP-REMOTE-ASSY'
  AND i.item_name = 'Red 14/38 wire'
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO bom_items (bom_id, item_id, quantity, uom, created_at, updated_at)
SELECT 
    bh.id,
    i.id,
    0.2,
    '-25.0',
    NOW(),
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.bom_number = 'BOM-IP-REMOTE-ASSY'
  AND i.item_name = 'Yellow 14/38 Wire'
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO bom_items (bom_id, item_id, quantity, uom, created_at, updated_at)
SELECT 
    bh.id,
    i.id,
    0.2,
    '-75.0',
    NOW(),
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.bom_number = 'BOM-IP-REMOTE-ASSY'
  AND i.item_name = 'Orange 14/38 Wire'
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO bom_items (bom_id, item_id, quantity, uom, created_at, updated_at)
SELECT 
    bh.id,
    i.id,
    0.2,
    '-185.0',
    NOW(),
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.bom_number = 'BOM-IP-REMOTE-ASSY'
  AND i.item_name = 'Green 14/38 Wire'
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO bom_items (bom_id, item_id, quantity, uom, created_at, updated_at)
SELECT 
    bh.id,
    i.id,
    0.2,
    '-15.0',
    NOW(),
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.bom_number = 'BOM-IP-REMOTE-ASSY'
  AND i.item_name = 'Purple 14/38 Wire'
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO bom_items (bom_id, item_id, quantity, uom, created_at, updated_at)
SELECT 
    bh.id,
    i.id,
    0.2,
    '-105.0',
    NOW(),
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.bom_number = 'BOM-IP-REMOTE-ASSY'
  AND i.item_name = 'Brown 14/38 Wire'
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO bom_items (bom_id, item_id, quantity, uom, created_at, updated_at)
SELECT 
    bh.id,
    i.id,
    1.0,
    'PCS',
    NOW(),
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.bom_number = 'BOM-IP-REMOTE-ASSY'
  AND i.item_name = 'SA12 9pin PM Pushpull'
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO bom_items (bom_id, item_id, quantity, uom, created_at, updated_at)
SELECT 
    bh.id,
    i.id,
    1.0,
    '-23.0',
    NOW(),
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.bom_number = 'BOM-IP-REMOTE-ASSY'
  AND i.item_name = 'IP Remote Lower Shell'
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO bom_items (bom_id, item_id, quantity, uom, created_at, updated_at)
SELECT 
    bh.id,
    i.id,
    1.0,
    '-15.0',
    NOW(),
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.bom_number = 'BOM-IP-REMOTE-ASSY'
  AND i.item_name = 'IP Remote Upper Shell'
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO bom_items (bom_id, item_id, quantity, uom, created_at, updated_at)
SELECT 
    bh.id,
    i.id,
    1.0,
    '10.0',
    NOW(),
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.bom_number = 'BOM-IP-REMOTE-ASSY'
  AND i.item_name = 'PU Gasket Remote Lower Shell'
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO bom_items (bom_id, item_id, quantity, uom, created_at, updated_at)
SELECT 
    bh.id,
    i.id,
    20.0,
    '1481.0',
    NOW(),
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.bom_number = 'BOM-IP-REMOTE-ASSY'
  AND i.item_name = 'Teroson MS930'
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO bom_items (bom_id, item_id, quantity, uom, created_at, updated_at)
SELECT 
    bh.id,
    i.id,
    2.0,
    'PCS',
    NOW(),
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.bom_number = 'BOM-IP-REMOTE-ASSY'
  AND i.item_name = 'Button Spacer No. 1'
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO bom_items (bom_id, item_id, quantity, uom, created_at, updated_at)
SELECT 
    bh.id,
    i.id,
    2.0,
    'PCS',
    NOW(),
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.bom_number = 'BOM-IP-REMOTE-ASSY'
  AND i.item_name = 'Button Spacer No. 2'
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO bom_items (bom_id, item_id, quantity, uom, created_at, updated_at)
SELECT 
    bh.id,
    i.id,
    2.0,
    'PCS',
    NOW(),
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.bom_number = 'BOM-IP-REMOTE-ASSY'
  AND i.item_name = 'Button No. 1 pressure bracket'
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO bom_items (bom_id, item_id, quantity, uom, created_at, updated_at)
SELECT 
    bh.id,
    i.id,
    4.0,
    'PCS',
    NOW(),
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.bom_number = 'BOM-IP-REMOTE-ASSY'
  AND i.item_name = 'Remote Battery Holding Bracket'
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO bom_items (bom_id, item_id, quantity, uom, created_at, updated_at)
SELECT 
    bh.id,
    i.id,
    1.0,
    'PCS',
    NOW(),
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.bom_number = 'BOM-IP-REMOTE-ASSY'
  AND i.item_name = 'Antenna clamp -1'
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO bom_items (bom_id, item_id, quantity, uom, created_at, updated_at)
SELECT 
    bh.id,
    i.id,
    1.0,
    'PCS',
    NOW(),
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.bom_number = 'BOM-IP-REMOTE-ASSY'
  AND i.item_name = 'Antenna Clamp -2'
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO bom_items (bom_id, item_id, quantity, uom, created_at, updated_at)
SELECT 
    bh.id,
    i.id,
    2.0,
    'PCS',
    NOW(),
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.bom_number = 'BOM-IP-REMOTE-ASSY'
  AND i.item_name = 'Cable Holder'
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO bom_items (bom_id, item_id, quantity, uom, created_at, updated_at)
SELECT 
    bh.id,
    i.id,
    1.0,
    'PCS',
    NOW(),
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.bom_number = 'BOM-IP-REMOTE-ASSY'
  AND i.item_name = 'Remote Handle'
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO bom_items (bom_id, item_id, quantity, uom, created_at, updated_at)
SELECT 
    bh.id,
    i.id,
    1.0,
    '19.0',
    NOW(),
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.bom_number = 'BOM-IP-REMOTE-ASSY'
  AND i.item_name = 'Polycarbonate Glass for Remote'
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO bom_items (bom_id, item_id, quantity, uom, created_at, updated_at)
SELECT 
    bh.id,
    i.id,
    2.0,
    '-46.0',
    NOW(),
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.bom_number = 'BOM-IP-REMOTE-ASSY'
  AND i.item_name = 'Joystick Water proof rubber'
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO bom_items (bom_id, item_id, quantity, uom, created_at, updated_at)
SELECT 
    bh.id,
    i.id,
    2.0,
    '-46.0',
    NOW(),
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.bom_number = 'BOM-IP-REMOTE-ASSY'
  AND i.item_name = 'Button Silicon Cover No. 1'
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO bom_items (bom_id, item_id, quantity, uom, created_at, updated_at)
SELECT 
    bh.id,
    i.id,
    2.0,
    '-141.0',
    NOW(),
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.bom_number = 'BOM-IP-REMOTE-ASSY'
  AND i.item_name = 'Button Silicon Cover No. 2'
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO bom_items (bom_id, item_id, quantity, uom, created_at, updated_at)
SELECT 
    bh.id,
    i.id,
    1.0,
    'PCS',
    NOW(),
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.bom_number = 'BOM-IP-REMOTE-ASSY'
  AND i.item_name = 'Neck Strap Hook'
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO bom_items (bom_id, item_id, quantity, uom, created_at, updated_at)
SELECT 
    bh.id,
    i.id,
    1.0,
    'PCS',
    NOW(),
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.bom_number = 'BOM-IP-REMOTE-ASSY'
  AND i.item_name = 'Neck Strap'
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO bom_items (bom_id, item_id, quantity, uom, created_at, updated_at)
SELECT 
    bh.id,
    i.id,
    20.0,
    '600.0',
    NOW(),
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.bom_number = 'BOM-IP-REMOTE-ASSY'
  AND i.item_name = 'M2x12 Allen Head SS304'
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO bom_items (bom_id, item_id, quantity, uom, created_at, updated_at)
SELECT 
    bh.id,
    i.id,
    1.0,
    '8.0',
    NOW(),
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.bom_number = 'BOM-IP-REMOTE-ASSY'
  AND i.item_name = '32Gb SD Card'
LIMIT 1
ON CONFLICT DO NOTHING;

-- BOM for IP Remote Charging Cable Assy
INSERT INTO bom_headers (bom_number, item_id, version, status, is_multi_level, created_at, updated_at)
SELECT 'BOM-IP-REMOTE-CHARGING', id, '1.0', 'ACTIVE', false, NOW(), NOW()
FROM items 
WHERE item_name = 'IP Remote Charging Cable Assy' AND category IN ('SA', 'FG')
LIMIT 1
ON CONFLICT (bom_number) DO NOTHING;

INSERT INTO bom_items (bom_id, item_id, quantity, uom, created_at, updated_at)
SELECT 
    bh.id,
    i.id,
    1.0,
    'PCS',
    NOW(),
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.bom_number = 'BOM-IP-REMOTE-CHARGING'
  AND i.item_name = 'USB Data & Charging Cable 1m length'
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO bom_items (bom_id, item_id, quantity, uom, created_at, updated_at)
SELECT 
    bh.id,
    i.id,
    1.0,
    '-2.0',
    NOW(),
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.bom_number = 'BOM-IP-REMOTE-CHARGING'
  AND i.item_name = '5v 2A USB Adapter'
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO bom_items (bom_id, item_id, quantity, uom, created_at, updated_at)
SELECT 
    bh.id,
    i.id,
    1.0,
    'PCS',
    NOW(),
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.bom_number = 'BOM-IP-REMOTE-CHARGING'
  AND i.item_name = 'SA12 9pin CM Pushpull'
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO bom_items (bom_id, item_id, quantity, uom, created_at, updated_at)
SELECT 
    bh.id,
    i.id,
    1.0,
    '-54.0',
    NOW(),
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.bom_number = 'BOM-IP-REMOTE-CHARGING'
  AND i.item_name = 'Rotary Knob Box 3D print'
LIMIT 1
ON CONFLICT DO NOTHING;

-- BOM for AMCA Elec Assy
INSERT INTO bom_headers (bom_number, item_id, version, status, is_multi_level, created_at, updated_at)
SELECT 'BOM-AMCA-ELEC-ASSY', id, '1.0', 'ACTIVE', false, NOW(), NOW()
FROM items 
WHERE item_name = 'AMCA Elec Assy' AND category IN ('SA', 'FG')
LIMIT 1
ON CONFLICT (bom_number) DO NOTHING;

INSERT INTO bom_items (bom_id, item_id, quantity, uom, created_at, updated_at)
SELECT 
    bh.id,
    i.id,
    4.0,
    'PCS',
    NOW(),
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.bom_number = 'BOM-AMCA-ELEC-ASSY'
  AND i.item_name = '1N4007 THT diode'
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO bom_items (bom_id, item_id, quantity, uom, created_at, updated_at)
SELECT 
    bh.id,
    i.id,
    1.0,
    'PCS',
    NOW(),
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.bom_number = 'BOM-AMCA-ELEC-ASSY'
  AND i.item_name = 'Water flow sensor'
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO bom_items (bom_id, item_id, quantity, uom, created_at, updated_at)
SELECT 
    bh.id,
    i.id,
    1.0,
    'PCS',
    NOW(),
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.bom_number = 'BOM-AMCA-ELEC-ASSY'
  AND i.item_name = 'Water pump'
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO bom_items (bom_id, item_id, quantity, uom, created_at, updated_at)
SELECT 
    bh.id,
    i.id,
    1.0,
    'PCS',
    NOW(),
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.bom_number = 'BOM-AMCA-ELEC-ASSY'
  AND i.item_name = '3S Lipo indicator'
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO bom_items (bom_id, item_id, quantity, uom, created_at, updated_at)
SELECT 
    bh.id,
    i.id,
    1.0,
    '-42.0',
    NOW(),
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.bom_number = 'BOM-AMCA-ELEC-ASSY'
  AND i.item_name = 'Lipo Indicator Casings'
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO bom_items (bom_id, item_id, quantity, uom, created_at, updated_at)
SELECT 
    bh.id,
    i.id,
    1.0,
    'PCS',
    NOW(),
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.bom_number = 'BOM-AMCA-ELEC-ASSY'
  AND i.item_name = 'LM2596HW for PC'
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO bom_items (bom_id, item_id, quantity, uom, created_at, updated_at)
SELECT 
    bh.id,
    i.id,
    1.0,
    '-17.0',
    NOW(),
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.bom_number = 'BOM-AMCA-ELEC-ASSY'
  AND i.item_name = 'Momentary Switch JCB'
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO bom_items (bom_id, item_id, quantity, uom, created_at, updated_at)
SELECT 
    bh.id,
    i.id,
    1.0,
    '8.2',
    NOW(),
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.bom_number = 'BOM-AMCA-ELEC-ASSY'
  AND i.item_name = 'Latching Power switch JCB'
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO bom_items (bom_id, item_id, quantity, uom, created_at, updated_at)
SELECT 
    bh.id,
    i.id,
    1.0,
    '-13.0',
    NOW(),
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.bom_number = 'BOM-AMCA-ELEC-ASSY'
  AND i.item_name = 'PWB for JCB'
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO bom_items (bom_id, item_id, quantity, uom, created_at, updated_at)
SELECT 
    bh.id,
    i.id,
    3.0,
    'PCS',
    NOW(),
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.bom_number = 'BOM-AMCA-ELEC-ASSY'
  AND i.item_name = '3S, >2Ah Li-Ion cell for JCB'
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO bom_items (bom_id, item_id, quantity, uom, created_at, updated_at)
SELECT 
    bh.id,
    i.id,
    1.0,
    '-41.0',
    NOW(),
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.bom_number = 'BOM-AMCA-ELEC-ASSY'
  AND i.item_name = 'DC JAck Panel Mount'
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO bom_items (bom_id, item_id, quantity, uom, created_at, updated_at)
SELECT 
    bh.id,
    i.id,
    5.0,
    '-1.0',
    NOW(),
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.bom_number = 'BOM-AMCA-ELEC-ASSY'
  AND i.item_name = 'Lead wire 22AWG'
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO bom_items (bom_id, item_id, quantity, uom, created_at, updated_at)
SELECT 
    bh.id,
    i.id,
    1.0,
    '-71.0',
    NOW(),
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.bom_number = 'BOM-AMCA-ELEC-ASSY'
  AND i.item_name = '16pin IC base'
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO bom_items (bom_id, item_id, quantity, uom, created_at, updated_at)
SELECT 
    bh.id,
    i.id,
    1.0,
    'PCS',
    NOW(),
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.bom_number = 'BOM-AMCA-ELEC-ASSY'
  AND i.item_name = 'ULN2003A THT'
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO bom_items (bom_id, item_id, quantity, uom, created_at, updated_at)
SELECT 
    bh.id,
    i.id,
    1.0,
    '-9.0',
    NOW(),
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.bom_number = 'BOM-AMCA-ELEC-ASSY'
  AND i.item_name = 'iMAx B3 Charger'
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO bom_items (bom_id, item_id, quantity, uom, created_at, updated_at)
SELECT 
    bh.id,
    i.id,
    1.0,
    '32.4',
    NOW(),
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.bom_number = 'BOM-AMCA-ELEC-ASSY'
  AND i.item_name = '8core Wire 14/38'
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO bom_items (bom_id, item_id, quantity, uom, created_at, updated_at)
SELECT 
    bh.id,
    i.id,
    1.0,
    '0.0',
    NOW(),
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.bom_number = 'BOM-AMCA-ELEC-ASSY'
  AND i.item_name = 'LP12 4 pin plug male clip lock CM'
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO bom_items (bom_id, item_id, quantity, uom, created_at, updated_at)
SELECT 
    bh.id,
    i.id,
    1.0,
    '0.0',
    NOW(),
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.bom_number = 'BOM-AMCA-ELEC-ASSY'
  AND i.item_name = 'LP12 4 pin socket female clip lock PM'
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO bom_items (bom_id, item_id, quantity, uom, created_at, updated_at)
SELECT 
    bh.id,
    i.id,
    1.0,
    '-59.0',
    NOW(),
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.bom_number = 'BOM-AMCA-ELEC-ASSY'
  AND i.item_name = '9v Piezo Electric Buzzer'
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO bom_items (bom_id, item_id, quantity, uom, created_at, updated_at)
SELECT 
    bh.id,
    i.id,
    1.0,
    '-7.0',
    NOW(),
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.bom_number = 'BOM-AMCA-ELEC-ASSY'
  AND i.item_name = 'Female Bergstrip 40x1 2.54mm'
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO bom_items (bom_id, item_id, quantity, uom, created_at, updated_at)
SELECT 
    bh.id,
    i.id,
    1.0,
    '7.0',
    NOW(),
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.bom_number = 'BOM-AMCA-ELEC-ASSY'
  AND i.item_name = 'Male Bergstrip 40x1 2.54mm'
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO bom_items (bom_id, item_id, quantity, uom, created_at, updated_at)
SELECT 
    bh.id,
    i.id,
    10.0,
    '598.0',
    NOW(),
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.bom_number = 'BOM-AMCA-ELEC-ASSY'
  AND i.item_name = 'Conformal Coating'
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO bom_items (bom_id, item_id, quantity, uom, created_at, updated_at)
SELECT 
    bh.id,
    i.id,
    2.0,
    'PCS',
    NOW(),
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.bom_number = 'BOM-AMCA-ELEC-ASSY'
  AND i.item_name = 'Soldering flux'
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO bom_items (bom_id, item_id, quantity, uom, created_at, updated_at)
SELECT 
    bh.id,
    i.id,
    3.0,
    '-369.9',
    NOW(),
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.bom_number = 'BOM-AMCA-ELEC-ASSY'
  AND i.item_name = '2 pin JST-XH housing'
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO bom_items (bom_id, item_id, quantity, uom, created_at, updated_at)
SELECT 
    bh.id,
    i.id,
    3.0,
    '-227.9',
    NOW(),
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.bom_number = 'BOM-AMCA-ELEC-ASSY'
  AND i.item_name = '2 pin JST-XH male top entry'
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO bom_items (bom_id, item_id, quantity, uom, created_at, updated_at)
SELECT 
    bh.id,
    i.id,
    1.0,
    '-96.0',
    NOW(),
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.bom_number = 'BOM-AMCA-ELEC-ASSY'
  AND i.item_name = '3 pin JST-XH male top entry'
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO bom_items (bom_id, item_id, quantity, uom, created_at, updated_at)
SELECT 
    bh.id,
    i.id,
    2.0,
    '-43.0',
    NOW(),
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.bom_number = 'BOM-AMCA-ELEC-ASSY'
  AND i.item_name = '10cm one sided JST crimped Black'
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO bom_items (bom_id, item_id, quantity, uom, created_at, updated_at)
SELECT 
    bh.id,
    i.id,
    2.0,
    '-216.0',
    NOW(),
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.bom_number = 'BOM-AMCA-ELEC-ASSY'
  AND i.item_name = '10cm one sided JST crimped Red'
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO bom_items (bom_id, item_id, quantity, uom, created_at, updated_at)
SELECT 
    bh.id,
    i.id,
    1.0,
    'PCS',
    NOW(),
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.bom_number = 'BOM-AMCA-ELEC-ASSY'
  AND i.item_name = 'Atmega328P-AU'
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO bom_items (bom_id, item_id, quantity, uom, created_at, updated_at)
SELECT 
    bh.id,
    i.id,
    2.0,
    '-205.0',
    NOW(),
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.bom_number = 'BOM-AMCA-ELEC-ASSY'
  AND i.item_name = 'Red 14/38 wire'
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO bom_items (bom_id, item_id, quantity, uom, created_at, updated_at)
SELECT 
    bh.id,
    i.id,
    2.0,
    '-165.0',
    NOW(),
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.bom_number = 'BOM-AMCA-ELEC-ASSY'
  AND i.item_name = 'Black 14/38 Wire'
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO bom_items (bom_id, item_id, quantity, uom, created_at, updated_at)
SELECT 
    bh.id,
    i.id,
    2.0,
    '-25.0',
    NOW(),
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.bom_number = 'BOM-AMCA-ELEC-ASSY'
  AND i.item_name = 'Yellow 14/38 Wire'
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO bom_items (bom_id, item_id, quantity, uom, created_at, updated_at)
SELECT 
    bh.id,
    i.id,
    1.0,
    '0.0',
    NOW(),
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.bom_number = 'BOM-AMCA-ELEC-ASSY'
  AND i.item_name = '3S BMS'
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO bom_items (bom_id, item_id, quantity, uom, created_at, updated_at)
SELECT 
    bh.id,
    i.id,
    1.0,
    '13.1',
    NOW(),
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.bom_number = 'BOM-AMCA-ELEC-ASSY'
  AND i.item_name = '130x80x60 enclosure box'
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO bom_items (bom_id, item_id, quantity, uom, created_at, updated_at)
SELECT 
    bh.id,
    i.id,
    6.0,
    '-127.0',
    NOW(),
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.bom_number = 'BOM-AMCA-ELEC-ASSY'
  AND i.item_name = '2mm male bullet connector'
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO bom_items (bom_id, item_id, quantity, uom, created_at, updated_at)
SELECT 
    bh.id,
    i.id,
    6.0,
    '-245.0',
    NOW(),
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.bom_number = 'BOM-AMCA-ELEC-ASSY'
  AND i.item_name = '2mm Female Bullet connector'
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO bom_items (bom_id, item_id, quantity, uom, created_at, updated_at)
SELECT 
    bh.id,
    i.id,
    0.12,
    '-35.0',
    NOW(),
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.bom_number = 'BOM-AMCA-ELEC-ASSY'
  AND i.item_name = 'HeatShrink Tube 3:1'
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO bom_items (bom_id, item_id, quantity, uom, created_at, updated_at)
SELECT 
    bh.id,
    i.id,
    10.0,
    '1481.0',
    NOW(),
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.bom_number = 'BOM-AMCA-ELEC-ASSY'
  AND i.item_name = 'Teroson MS930'
LIMIT 1
ON CONFLICT DO NOTHING;

-- BOM for AMCA Mech Assy
INSERT INTO bom_headers (bom_number, item_id, version, status, is_multi_level, created_at, updated_at)
SELECT 'BOM-AMCA-MECH-ASSY', id, '1.0', 'ACTIVE', false, NOW(), NOW()
FROM items 
WHERE item_name = 'AMCA Mech Assy' AND category IN ('SA', 'FG')
LIMIT 1
ON CONFLICT (bom_number) DO NOTHING;

INSERT INTO bom_items (bom_id, item_id, quantity, uom, created_at, updated_at)
SELECT 
    bh.id,
    i.id,
    1.0,
    '8.5',
    NOW(),
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.bom_number = 'BOM-AMCA-MECH-ASSY'
  AND i.item_name = 'JCB Body cum mounting frame'
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO bom_items (bom_id, item_id, quantity, uom, created_at, updated_at)
SELECT 
    bh.id,
    i.id,
    2.0,
    '-64.0',
    NOW(),
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.bom_number = 'BOM-AMCA-MECH-ASSY'
  AND i.item_name = 'flow sensor Clamp'
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO bom_items (bom_id, item_id, quantity, uom, created_at, updated_at)
SELECT 
    bh.id,
    i.id,
    1.0,
    'PCS',
    NOW(),
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.bom_number = 'BOM-AMCA-MECH-ASSY'
  AND i.item_name = 'Water tank with clamp'
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO bom_items (bom_id, item_id, quantity, uom, created_at, updated_at)
SELECT 
    bh.id,
    i.id,
    10.0,
    'PCS',
    NOW(),
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.bom_number = 'BOM-AMCA-MECH-ASSY'
  AND i.item_name = 'M5x10 Allen / M5x12'
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO bom_items (bom_id, item_id, quantity, uom, created_at, updated_at)
SELECT 
    bh.id,
    i.id,
    4.0,
    '498.0',
    NOW(),
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.bom_number = 'BOM-AMCA-MECH-ASSY'
  AND i.item_name = 'M4x12 Allen Head'
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO bom_items (bom_id, item_id, quantity, uom, created_at, updated_at)
SELECT 
    bh.id,
    i.id,
    6.0,
    '-14.0',
    NOW(),
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.bom_number = 'BOM-AMCA-MECH-ASSY'
  AND i.item_name = 'M4x16 Allen Head'
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO bom_items (bom_id, item_id, quantity, uom, created_at, updated_at)
SELECT 
    bh.id,
    i.id,
    10.0,
    'PCS',
    NOW(),
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.bom_number = 'BOM-AMCA-MECH-ASSY'
  AND i.item_name = 'M4 Nyloc'
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO bom_items (bom_id, item_id, quantity, uom, created_at, updated_at)
SELECT 
    bh.id,
    i.id,
    10.0,
    '350.0',
    NOW(),
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.bom_number = 'BOM-AMCA-MECH-ASSY'
  AND i.item_name = 'M4 Spring washer'
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO bom_items (bom_id, item_id, quantity, uom, created_at, updated_at)
SELECT 
    bh.id,
    i.id,
    14.0,
    '400.0',
    NOW(),
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.bom_number = 'BOM-AMCA-MECH-ASSY'
  AND i.item_name = 'M4x12 plain washer'
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO bom_items (bom_id, item_id, quantity, uom, created_at, updated_at)
SELECT 
    bh.id,
    i.id,
    1.0,
    '-67.0',
    NOW(),
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.bom_number = 'BOM-AMCA-MECH-ASSY'
  AND i.item_name = 'Brass nozzle for water outlet from JCB'
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO bom_items (bom_id, item_id, quantity, uom, created_at, updated_at)
SELECT 
    bh.id,
    i.id,
    0.5,
    '-22.5',
    NOW(),
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.bom_number = 'BOM-AMCA-MECH-ASSY'
  AND i.item_name = '8 mm OD pneaumatic pipe'
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO bom_items (bom_id, item_id, quantity, uom, created_at, updated_at)
SELECT 
    bh.id,
    i.id,
    2.0,
    'PCS',
    NOW(),
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.bom_number = 'BOM-AMCA-MECH-ASSY'
  AND i.item_name = '12 to 8 reducer with lock clips'
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO bom_items (bom_id, item_id, quantity, uom, created_at, updated_at)
SELECT 
    bh.id,
    i.id,
    0.1,
    '-27.0',
    NOW(),
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.bom_number = 'BOM-AMCA-MECH-ASSY'
  AND i.item_name = '12mm OD pneumatic pipe'
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO bom_items (bom_id, item_id, quantity, uom, created_at, updated_at)
SELECT 
    bh.id,
    i.id,
    1.0,
    '-1.0',
    NOW(),
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.bom_number = 'BOM-AMCA-MECH-ASSY'
  AND i.item_name = 'Silicon Hose 3mm x 6mm'
LIMIT 1
ON CONFLICT DO NOTHING;

-- BOM for Final Craft Assy
INSERT INTO bom_headers (bom_number, item_id, version, status, is_multi_level, created_at, updated_at)
SELECT 'BOM-FINAL-CRAFT-ASSY', id, '1.0', 'ACTIVE', false, NOW(), NOW()
FROM items 
WHERE item_name = 'Final Craft Assy' AND category IN ('SA', 'FG')
LIMIT 1
ON CONFLICT (bom_number) DO NOTHING;

INSERT INTO bom_items (bom_id, item_id, quantity, uom, created_at, updated_at)
SELECT 
    bh.id,
    i.id,
    14.0,
    '415.0',
    NOW(),
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.bom_number = 'BOM-FINAL-CRAFT-ASSY'
  AND i.item_name = 'M4x20 Allen Head'
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO bom_items (bom_id, item_id, quantity, uom, created_at, updated_at)
SELECT 
    bh.id,
    i.id,
    28.0,
    'PCS',
    NOW(),
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.bom_number = 'BOM-FINAL-CRAFT-ASSY'
  AND i.item_name = 'M5x10 Torx'
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO bom_items (bom_id, item_id, quantity, uom, created_at, updated_at)
SELECT 
    bh.id,
    i.id,
    50.0,
    '1481.0',
    NOW(),
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.bom_number = 'BOM-FINAL-CRAFT-ASSY'
  AND i.item_name = 'Teroson MS930'
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO bom_items (bom_id, item_id, quantity, uom, created_at, updated_at)
SELECT 
    bh.id,
    i.id,
    4.5,
    '141.0',
    NOW(),
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.bom_number = 'BOM-FINAL-CRAFT-ASSY'
  AND i.item_name = 'Rope 8mm'
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO bom_items (bom_id, item_id, quantity, uom, created_at, updated_at)
SELECT 
    bh.id,
    i.id,
    1.0,
    '-29.0',
    NOW(),
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.bom_number = 'BOM-FINAL-CRAFT-ASSY'
  AND i.item_name = 'Ferrole'
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO bom_items (bom_id, item_id, quantity, uom, created_at, updated_at)
SELECT 
    bh.id,
    i.id,
    1.0,
    '-40.0',
    NOW(),
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.bom_number = 'BOM-FINAL-CRAFT-ASSY'
  AND i.item_name = 'Hook Sticker STBD'
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO bom_items (bom_id, item_id, quantity, uom, created_at, updated_at)
SELECT 
    bh.id,
    i.id,
    1.0,
    '-50.0',
    NOW(),
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.bom_number = 'BOM-FINAL-CRAFT-ASSY'
  AND i.item_name = 'Hook Stiker PORT'
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO bom_items (bom_id, item_id, quantity, uom, created_at, updated_at)
SELECT 
    bh.id,
    i.id,
    1.0,
    '-21.0',
    NOW(),
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.bom_number = 'BOM-FINAL-CRAFT-ASSY'
  AND i.item_name = 'Hold here sticker STBD'
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO bom_items (bom_id, item_id, quantity, uom, created_at, updated_at)
SELECT 
    bh.id,
    i.id,
    1.0,
    '9.0',
    NOW(),
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.bom_number = 'BOM-FINAL-CRAFT-ASSY'
  AND i.item_name = 'Hold here sticker PORT'
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO bom_items (bom_id, item_id, quantity, uom, created_at, updated_at)
SELECT 
    bh.id,
    i.id,
    8.0,
    '400.0',
    NOW(),
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.bom_number = 'BOM-FINAL-CRAFT-ASSY'
  AND i.item_name = 'M4x12 plain washer'
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO bom_items (bom_id, item_id, quantity, uom, created_at, updated_at)
SELECT 
    bh.id,
    i.id,
    1.0,
    '-258.0',
    NOW(),
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.bom_number = 'BOM-FINAL-CRAFT-ASSY'
  AND i.item_name = '915MHz Antenna'
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO bom_items (bom_id, item_id, quantity, uom, created_at, updated_at)
SELECT 
    bh.id,
    i.id,
    6.0,
    '-100.0',
    NOW(),
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.bom_number = 'BOM-FINAL-CRAFT-ASSY'
  AND i.item_name = 'M4x20 plain washer'
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO bom_items (bom_id, item_id, quantity, uom, created_at, updated_at)
SELECT 
    bh.id,
    i.id,
    4.0,
    '0.0',
    NOW(),
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.bom_number = 'BOM-FINAL-CRAFT-ASSY'
  AND i.item_name = 'M4x12 Button head'
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO bom_items (bom_id, item_id, quantity, uom, created_at, updated_at)
SELECT 
    bh.id,
    i.id,
    1.0,
    '9.0',
    NOW(),
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.bom_number = 'BOM-FINAL-CRAFT-ASSY'
  AND i.item_name = '8kg Hull'
LIMIT 1
ON CONFLICT DO NOTHING;

-- BOM for Bottom Block Assy
INSERT INTO bom_headers (bom_number, item_id, version, status, is_multi_level, created_at, updated_at)
SELECT 'BOM-BOTTOM-BLOCK-ASSY', id, '1.0', 'ACTIVE', false, NOW(), NOW()
FROM items 
WHERE item_name = 'Bottom Block Assy' AND category IN ('SA', 'FG')
LIMIT 1
ON CONFLICT (bom_number) DO NOTHING;

INSERT INTO bom_items (bom_id, item_id, quantity, uom, created_at, updated_at)
SELECT 
    bh.id,
    i.id,
    2.0,
    'PCS',
    NOW(),
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.bom_number = 'BOM-BOTTOM-BLOCK-ASSY'
  AND i.item_name = 'IM Bottom Block'
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO bom_items (bom_id, item_id, quantity, uom, created_at, updated_at)
SELECT 
    bh.id,
    i.id,
    2.0,
    '60.0',
    NOW(),
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.bom_number = 'BOM-BOTTOM-BLOCK-ASSY'
  AND i.item_name = 'Bottom Mesh (120mm x 100mm, 5"x4")'
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO bom_items (bom_id, item_id, quantity, uom, created_at, updated_at)
SELECT 
    bh.id,
    i.id,
    8.0,
    'PCS',
    NOW(),
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.bom_number = 'BOM-BOTTOM-BLOCK-ASSY'
  AND i.item_name = 'M4x12 Pan Combi Screws'
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO bom_items (bom_id, item_id, quantity, uom, created_at, updated_at)
SELECT 
    bh.id,
    i.id,
    14.0,
    '331.0',
    NOW(),
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.bom_number = 'BOM-BOTTOM-BLOCK-ASSY'
  AND i.item_name = 'M3x8 CSK Phillips'
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO bom_items (bom_id, item_id, quantity, uom, created_at, updated_at)
SELECT 
    bh.id,
    i.id,
    2.5,
    'PCS',
    NOW(),
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.bom_number = 'BOM-BOTTOM-BLOCK-ASSY'
  AND i.item_name = 'M3x8 plain wahser'
LIMIT 1
ON CONFLICT DO NOTHING;

-- BOM for STBD Aft Plate Assy
INSERT INTO bom_headers (bom_number, item_id, version, status, is_multi_level, created_at, updated_at)
SELECT 'BOM-STBD-AFT-PLATE', id, '1.0', 'ACTIVE', false, NOW(), NOW()
FROM items 
WHERE item_name = 'STBD Aft Plate Assy' AND category IN ('SA', 'FG')
LIMIT 1
ON CONFLICT (bom_number) DO NOTHING;

INSERT INTO bom_items (bom_id, item_id, quantity, uom, created_at, updated_at)
SELECT 
    bh.id,
    i.id,
    1.0,
    '18.0',
    NOW(),
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.bom_number = 'BOM-STBD-AFT-PLATE'
  AND i.item_name = 'STBD Aft Plate'
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO bom_items (bom_id, item_id, quantity, uom, created_at, updated_at)
SELECT 
    bh.id,
    i.id,
    1.0,
    '-21.0',
    NOW(),
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.bom_number = 'BOM-STBD-AFT-PLATE'
  AND i.item_name = 'SS Cooling Water Inlet nozzle'
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO bom_items (bom_id, item_id, quantity, uom, created_at, updated_at)
SELECT 
    bh.id,
    i.id,
    1.0,
    '-24.0',
    NOW(),
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.bom_number = 'BOM-STBD-AFT-PLATE'
  AND i.item_name = 'SS Cooling Water Outlet nozzle'
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO bom_items (bom_id, item_id, quantity, uom, created_at, updated_at)
SELECT 
    bh.id,
    i.id,
    1.0,
    '-30.0',
    NOW(),
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.bom_number = 'BOM-STBD-AFT-PLATE'
  AND i.item_name = 'Greasing nozzle'
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO bom_items (bom_id, item_id, quantity, uom, created_at, updated_at)
SELECT 
    bh.id,
    i.id,
    3.0,
    'PCS',
    NOW(),
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.bom_number = 'BOM-STBD-AFT-PLATE'
  AND i.item_name = 'M8 Slim Locknut'
LIMIT 1
ON CONFLICT DO NOTHING;

-- BOM for PORT Aft Plate Assy
INSERT INTO bom_headers (bom_number, item_id, version, status, is_multi_level, created_at, updated_at)
SELECT 'BOM-PORT-AFT-PLATE', id, '1.0', 'ACTIVE', false, NOW(), NOW()
FROM items 
WHERE item_name = 'PORT Aft Plate Assy' AND category IN ('SA', 'FG')
LIMIT 1
ON CONFLICT (bom_number) DO NOTHING;

INSERT INTO bom_items (bom_id, item_id, quantity, uom, created_at, updated_at)
SELECT 
    bh.id,
    i.id,
    1.0,
    '18.0',
    NOW(),
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.bom_number = 'BOM-PORT-AFT-PLATE'
  AND i.item_name = 'PORT Aft Plate'
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO bom_items (bom_id, item_id, quantity, uom, created_at, updated_at)
SELECT 
    bh.id,
    i.id,
    1.0,
    '-21.0',
    NOW(),
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.bom_number = 'BOM-PORT-AFT-PLATE'
  AND i.item_name = 'SS Cooling Water Inlet nozzle'
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO bom_items (bom_id, item_id, quantity, uom, created_at, updated_at)
SELECT 
    bh.id,
    i.id,
    1.0,
    '-24.0',
    NOW(),
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.bom_number = 'BOM-PORT-AFT-PLATE'
  AND i.item_name = 'SS Cooling Water Outlet nozzle'
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO bom_items (bom_id, item_id, quantity, uom, created_at, updated_at)
SELECT 
    bh.id,
    i.id,
    1.0,
    '-30.0',
    NOW(),
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.bom_number = 'BOM-PORT-AFT-PLATE'
  AND i.item_name = 'Greasing nozzle'
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO bom_items (bom_id, item_id, quantity, uom, created_at, updated_at)
SELECT 
    bh.id,
    i.id,
    1.0,
    '7.0',
    NOW(),
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.bom_number = 'BOM-PORT-AFT-PLATE'
  AND i.item_name = 'Air nozzle'
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO bom_items (bom_id, item_id, quantity, uom, created_at, updated_at)
SELECT 
    bh.id,
    i.id,
    3.0,
    'PCS',
    NOW(),
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.bom_number = 'BOM-PORT-AFT-PLATE'
  AND i.item_name = 'M8 Slim Locknut'
LIMIT 1
ON CONFLICT DO NOTHING;

-- BOM for R9MX Adapter
INSERT INTO bom_headers (bom_number, item_id, version, status, is_multi_level, created_at, updated_at)
SELECT 'BOM-R9MX-ADAPTER', id, '1.0', 'ACTIVE', false, NOW(), NOW()
FROM items 
WHERE item_name = 'R9MX Adapter' AND category IN ('SA', 'FG')
LIMIT 1
ON CONFLICT (bom_number) DO NOTHING;

INSERT INTO bom_items (bom_id, item_id, quantity, uom, created_at, updated_at)
SELECT 
    bh.id,
    i.id,
    1.0,
    'PCS',
    NOW(),
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.bom_number = 'BOM-R9MX-ADAPTER'
  AND i.item_name = 'PWB of R9MX adapter'
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO bom_items (bom_id, item_id, quantity, uom, created_at, updated_at)
SELECT 
    bh.id,
    i.id,
    0.25,
    '-14.0',
    NOW(),
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.bom_number = 'BOM-R9MX-ADAPTER'
  AND i.item_name = 'Female Bergstrip 40x1 2.0mm'
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO bom_items (bom_id, item_id, quantity, uom, created_at, updated_at)
SELECT 
    bh.id,
    i.id,
    0.25,
    '-5.0',
    NOW(),
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.bom_number = 'BOM-R9MX-ADAPTER'
  AND i.item_name = 'Male Bergstrip 40x1 2.0mm'
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO bom_items (bom_id, item_id, quantity, uom, created_at, updated_at)
SELECT 
    bh.id,
    i.id,
    2.0,
    '-1.0',
    NOW(),
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.bom_number = 'BOM-R9MX-ADAPTER'
  AND i.item_name = 'Lead wire 22AWG'
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO bom_items (bom_id, item_id, quantity, uom, created_at, updated_at)
SELECT 
    bh.id,
    i.id,
    1.0,
    'PCS',
    NOW(),
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.bom_number = 'BOM-R9MX-ADAPTER'
  AND i.item_name = 'LM1117 5.0v'
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO bom_items (bom_id, item_id, quantity, uom, created_at, updated_at)
SELECT 
    bh.id,
    i.id,
    1.0,
    '180.0',
    NOW(),
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.bom_number = 'BOM-R9MX-ADAPTER'
  AND i.item_name = '10uF 10v Tantalum Capacitor Case A'
LIMIT 1
ON CONFLICT DO NOTHING;

-- BOM for Final Packing
INSERT INTO bom_headers (bom_number, item_id, version, status, is_multi_level, created_at, updated_at)
SELECT 'BOM-FINAL-PACKING', id, '1.0', 'ACTIVE', false, NOW(), NOW()
FROM items 
WHERE item_name = 'Final Packing' AND category IN ('SA', 'FG')
LIMIT 1
ON CONFLICT (bom_number) DO NOTHING;

INSERT INTO bom_items (bom_id, item_id, quantity, uom, created_at, updated_at)
SELECT 
    bh.id,
    i.id,
    1.0,
    'PCS',
    NOW(),
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.bom_number = 'BOM-FINAL-PACKING'
  AND i.item_name = '66 No. Box for chraging cable & Tool box'
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO bom_items (bom_id, item_id, quantity, uom, created_at, updated_at)
SELECT 
    bh.id,
    i.id,
    1.0,
    '30.0',
    NOW(),
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.bom_number = 'BOM-FINAL-PACKING'
  AND i.item_name = '22 No. Box for SR structure screws'
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO bom_items (bom_id, item_id, quantity, uom, created_at, updated_at)
SELECT 
    bh.id,
    i.id,
    1.0,
    '0.0',
    NOW(),
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.bom_number = 'BOM-FINAL-PACKING'
  AND i.item_name = '10mm Nut Driver with 15mm Depth'
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO bom_items (bom_id, item_id, quantity, uom, created_at, updated_at)
SELECT 
    bh.id,
    i.id,
    1.0,
    'PCS',
    NOW(),
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.bom_number = 'BOM-FINAL-PACKING'
  AND i.item_name = '4mm T-Handle'
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO bom_items (bom_id, item_id, quantity, uom, created_at, updated_at)
SELECT 
    bh.id,
    i.id,
    1.0,
    '-12.0',
    NOW(),
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.bom_number = 'BOM-FINAL-PACKING'
  AND i.item_name = 'Greasing Pump'
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO bom_items (bom_id, item_id, quantity, uom, created_at, updated_at)
SELECT 
    bh.id,
    i.id,
    180.0,
    '500.0',
    NOW(),
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.bom_number = 'BOM-FINAL-PACKING'
  AND i.item_name = 'Grease'
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO bom_items (bom_id, item_id, quantity, uom, created_at, updated_at)
SELECT 
    bh.id,
    i.id,
    1.0,
    '0.0',
    NOW(),
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.bom_number = 'BOM-FINAL-PACKING'
  AND i.item_name = 'EPE sheet 20mm 48"x72"'
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO bom_items (bom_id, item_id, quantity, uom, created_at, updated_at)
SELECT 
    bh.id,
    i.id,
    1.0,
    'PCS',
    NOW(),
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.bom_number = 'BOM-FINAL-PACKING'
  AND i.item_name = 'HardBox FRP/HDPE/CARTON/EPE'
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO bom_items (bom_id, item_id, quantity, uom, created_at, updated_at)
SELECT 
    bh.id,
    i.id,
    1.0,
    '-12.0',
    NOW(),
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.bom_number = 'BOM-FINAL-PACKING'
  AND i.item_name = 'User Manual'
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO bom_items (bom_id, item_id, quantity, uom, created_at, updated_at)
SELECT 
    bh.id,
    i.id,
    1.0,
    '15.0',
    NOW(),
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.bom_number = 'BOM-FINAL-PACKING'
  AND i.item_name = 'Envelope for User Manual'
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO bom_items (bom_id, item_id, quantity, uom, created_at, updated_at)
SELECT 
    bh.id,
    i.id,
    1.0,
    'PCS',
    NOW(),
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.bom_number = 'BOM-FINAL-PACKING'
  AND i.item_name = '2.5mm T handle'
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO bom_items (bom_id, item_id, quantity, uom, created_at, updated_at)
SELECT 
    bh.id,
    i.id,
    2.0,
    '90.0',
    NOW(),
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.bom_number = 'BOM-FINAL-PACKING'
  AND i.item_name = 'Oring AFT plate'
LIMIT 1
ON CONFLICT DO NOTHING;

-- BOM for Power Switch Assy
INSERT INTO bom_headers (bom_number, item_id, version, status, is_multi_level, created_at, updated_at)
SELECT 'BOM-POWER-SWITCH-ASSY', id, '1.0', 'ACTIVE', false, NOW(), NOW()
FROM items 
WHERE item_name = 'Power Switch Assy' AND category IN ('SA', 'FG')
LIMIT 1
ON CONFLICT (bom_number) DO NOTHING;

INSERT INTO bom_items (bom_id, item_id, quantity, uom, created_at, updated_at)
SELECT 
    bh.id,
    i.id,
    1.0,
    '-34.0',
    NOW(),
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.bom_number = 'BOM-POWER-SWITCH-ASSY'
  AND i.item_name = 'IP68 Rotary main Switch'
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO bom_items (bom_id, item_id, quantity, uom, created_at, updated_at)
SELECT 
    bh.id,
    i.id,
    2.0,
    '-272.0',
    NOW(),
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.bom_number = 'BOM-POWER-SWITCH-ASSY'
  AND i.item_name = '10cm one sided JST crimped White'
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO bom_items (bom_id, item_id, quantity, uom, created_at, updated_at)
SELECT 
    bh.id,
    i.id,
    1.0,
    '-369.9',
    NOW(),
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.bom_number = 'BOM-POWER-SWITCH-ASSY'
  AND i.item_name = '2 pin JST-XH housing'
LIMIT 1
ON CONFLICT DO NOTHING;



-- ============================================================================
-- INSERT INITIAL STOCK FOR RAW MATERIALS
-- ============================================================================

-- Stock for QX7 Transmitter with R9M
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
    11.0,
    'IN',
    'OPENING_STOCK',
    'INITIAL-IMPORT',
    'Imported from Stock List 2024-2025.xlsx',
    NOW()
FROM items 
WHERE item_code = 'QX7-TRANSMITTER-WITH'
LIMIT 1;

-- Stock for Receiver Module R9MM/R9MX/R9
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
    16.0,
    'IN',
    'OPENING_STOCK',
    'INITIAL-IMPORT',
    'Imported from Stock List 2024-2025.xlsx',
    NOW()
FROM items 
WHERE item_code = 'RECEIVER-MODULE-R9MMR9MXR9'
LIMIT 1;

-- Stock for Free Wheel Diode SMD M7
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
    2000.0,
    'IN',
    'OPENING_STOCK',
    'INITIAL-IMPORT',
    'Imported from Stock List 2024-2025.xlsx',
    NOW()
FROM items 
WHERE item_code = 'FREE-WHEEL-DIODE'
LIMIT 1;

-- Stock for AMS1117 5.0v
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
    482.0,
    'IN',
    'OPENING_STOCK',
    'INITIAL-IMPORT',
    'Imported from Stock List 2024-2025.xlsx',
    NOW()
FROM items 
WHERE item_code = 'AMS1117-50V'
LIMIT 1;

-- Stock for AMS1117 3.3v
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
    135.0,
    'IN',
    'OPENING_STOCK',
    'INITIAL-IMPORT',
    'Imported from Stock List 2024-2025.xlsx',
    NOW()
FROM items 
WHERE item_code = 'AMS1117-33V'
LIMIT 1;

-- Stock for NEO-6M GPS/L80 GPS
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
    5.0,
    'IN',
    'OPENING_STOCK',
    'INITIAL-IMPORT',
    'Imported from Stock List 2024-2025.xlsx',
    NOW()
FROM items 
WHERE item_code = 'NEO6M-GPSL80-GPS'
LIMIT 1;

-- Stock for LC86G GPS
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
    20.0,
    'IN',
    'OPENING_STOCK',
    'INITIAL-IMPORT',
    'Imported from Stock List 2024-2025.xlsx',
    NOW()
FROM items 
WHERE item_code = 'LC86G-GPS'
LIMIT 1;

-- Stock for 5.5mm Female Bullet connector
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
    33.0,
    'IN',
    'OPENING_STOCK',
    'INITIAL-IMPORT',
    'Imported from Stock List 2024-2025.xlsx',
    NOW()
FROM items 
WHERE item_code = '55MM-FEMALE-BULLET'
LIMIT 1;

-- Stock for 4mm Male Bullet connector
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
    735.0,
    'IN',
    'OPENING_STOCK',
    'INITIAL-IMPORT',
    'Imported from Stock List 2024-2025.xlsx',
    NOW()
FROM items 
WHERE item_code = '4MM-MALE-BULLET'
LIMIT 1;

-- Stock for 4mm Female Bullet connector
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
    687.0,
    'IN',
    'OPENING_STOCK',
    'INITIAL-IMPORT',
    'Imported from Stock List 2024-2025.xlsx',
    NOW()
FROM items 
WHERE item_code = '4MM-FEMALE-BULLET'
LIMIT 1;

-- Stock for 2mm male bullet connector
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
    440.0,
    'IN',
    'OPENING_STOCK',
    'INITIAL-IMPORT',
    'Imported from Stock List 2024-2025.xlsx',
    NOW()
FROM items 
WHERE item_code = '2MM-MALE-BULLET'
LIMIT 1;

-- Stock for 2mm Female Bullet connector
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
    537.0,
    'IN',
    'OPENING_STOCK',
    'INITIAL-IMPORT',
    'Imported from Stock List 2024-2025.xlsx',
    NOW()
FROM items 
WHERE item_code = '2MM-FEMALE-BULLET'
LIMIT 1;

-- Stock for 6mm male bullet connector
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
    151.0,
    'IN',
    'OPENING_STOCK',
    'INITIAL-IMPORT',
    'Imported from Stock List 2024-2025.xlsx',
    NOW()
FROM items 
WHERE item_code = '6MM-MALE-BULLET'
LIMIT 1;

-- Stock for 6mm female bullet connector
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
    152.0,
    'IN',
    'OPENING_STOCK',
    'INITIAL-IMPORT',
    'Imported from Stock List 2024-2025.xlsx',
    NOW()
FROM items 
WHERE item_code = '6MM-FEMALE-BULLET'
LIMIT 1;

-- Stock for 8mm male bullet connector
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
    153.0,
    'IN',
    'OPENING_STOCK',
    'INITIAL-IMPORT',
    'Imported from Stock List 2024-2025.xlsx',
    NOW()
FROM items 
WHERE item_code = '8MM-MALE-BULLET'
LIMIT 1;

-- Stock for 8mm female bullet connector
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
    237.0,
    'IN',
    'OPENING_STOCK',
    'INITIAL-IMPORT',
    'Imported from Stock List 2024-2025.xlsx',
    NOW()
FROM items 
WHERE item_code = '8MM-FEMALE-BULLET'
LIMIT 1;

-- Stock for Ultra Flexible Black 8AWG
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
    58.4,
    'IN',
    'OPENING_STOCK',
    'INITIAL-IMPORT',
    'Imported from Stock List 2024-2025.xlsx',
    NOW()
FROM items 
WHERE item_code = 'ULTRA-FLEXIBLE-BLACK'
LIMIT 1;

-- Stock for Ultra Flexible  Red 8AWG
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
    142.0,
    'IN',
    'OPENING_STOCK',
    'INITIAL-IMPORT',
    'Imported from Stock List 2024-2025.xlsx',
    NOW()
FROM items 
WHERE item_code = 'ULTRA-FLEXIBLE-RED'
LIMIT 1;

-- Stock for Ultra Flexible Black 12AWG
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
    109.0,
    'IN',
    'OPENING_STOCK',
    'INITIAL-IMPORT',
    'Imported from Stock List 2024-2025.xlsx',
    NOW()
FROM items 
WHERE item_code = 'ULTRA-FLEXIBLE-BLACK'
LIMIT 1;

-- Stock for Ultra Flexible Red 12AWG
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
    115.0,
    'IN',
    'OPENING_STOCK',
    'INITIAL-IMPORT',
    'Imported from Stock List 2024-2025.xlsx',
    NOW()
FROM items 
WHERE item_code = 'ULTRA-FLEXIBLE-RED'
LIMIT 1;

-- Stock for Ultra Flexible Black 18 AWG
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
    78.0,
    'IN',
    'OPENING_STOCK',
    'INITIAL-IMPORT',
    'Imported from Stock List 2024-2025.xlsx',
    NOW()
FROM items 
WHERE item_code = 'ULTRA-FLEXIBLE-BLACK'
LIMIT 1;

-- Stock for Ultra Flexible Red 18 AWG
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
    13.5,
    'IN',
    'OPENING_STOCK',
    'INITIAL-IMPORT',
    'Imported from Stock List 2024-2025.xlsx',
    NOW()
FROM items 
WHERE item_code = 'ULTRA-FLEXIBLE-RED'
LIMIT 1;

-- Stock for Ultra Flexible Black 20 AWG
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
    40.0,
    'IN',
    'OPENING_STOCK',
    'INITIAL-IMPORT',
    'Imported from Stock List 2024-2025.xlsx',
    NOW()
FROM items 
WHERE item_code = 'ULTRA-FLEXIBLE-BLACK'
LIMIT 1;

-- Stock for Ultra Flexible Blue 20 AWG
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
    10.0,
    'IN',
    'OPENING_STOCK',
    'INITIAL-IMPORT',
    'Imported from Stock List 2024-2025.xlsx',
    NOW()
FROM items 
WHERE item_code = 'ULTRA-FLEXIBLE-BLUE'
LIMIT 1;

-- Stock for Water flow sensor YFS401
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
    54.0,
    'IN',
    'OPENING_STOCK',
    'INITIAL-IMPORT',
    'Imported from Stock List 2024-2025.xlsx',
    NOW()
FROM items 
WHERE item_code = 'WATER-FLOW-SENSOR'
LIMIT 1;

-- Stock for Water pump 550 diaphragm
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
    14.0,
    'IN',
    'OPENING_STOCK',
    'INITIAL-IMPORT',
    'Imported from Stock List 2024-2025.xlsx',
    NOW()
FROM items 
WHERE item_code = 'WATER-PUMP-550'
LIMIT 1;

-- Stock for 1S Lipo indicator (Not Using)
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
    14.0,
    'IN',
    'OPENING_STOCK',
    'INITIAL-IMPORT',
    'Imported from Stock List 2024-2025.xlsx',
    NOW()
FROM items 
WHERE item_code = '1S-LIPO-INDICATOR'
LIMIT 1;

-- Stock for 2S Lipo indicator
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
    33.0,
    'IN',
    'OPENING_STOCK',
    'INITIAL-IMPORT',
    'Imported from Stock List 2024-2025.xlsx',
    NOW()
FROM items 
WHERE item_code = '2S-LIPO-INDICATOR'
LIMIT 1;

-- Stock for Lipo Indicator Casings
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
    46.0,
    'IN',
    'OPENING_STOCK',
    'INITIAL-IMPORT',
    'Imported from Stock List 2024-2025.xlsx',
    NOW()
FROM items 
WHERE item_code = 'LIPO-INDICATOR-CASINGS'
LIMIT 1;

-- Stock for Buck converter XL7015 50v
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
    39.0,
    'IN',
    'OPENING_STOCK',
    'INITIAL-IMPORT',
    'Imported from Stock List 2024-2025.xlsx',
    NOW()
FROM items 
WHERE item_code = 'BUCK-CONVERTER-XL7015'
LIMIT 1;

-- Stock for LM2596 in AMCA
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
    59.0,
    'IN',
    'OPENING_STOCK',
    'INITIAL-IMPORT',
    'Imported from Stock List 2024-2025.xlsx',
    NOW()
FROM items 
WHERE item_code = 'LM2596-IN-AMCA'
LIMIT 1;

-- Stock for XL4015/XL4005 5A buck converter
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
    126.0,
    'IN',
    'OPENING_STOCK',
    'INITIAL-IMPORT',
    'Imported from Stock List 2024-2025.xlsx',
    NOW()
FROM items 
WHERE item_code = 'XL4015XL4005-5A-BUCK'
LIMIT 1;

-- Stock for XT90 Female housing
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
    234.0,
    'IN',
    'OPENING_STOCK',
    'INITIAL-IMPORT',
    'Imported from Stock List 2024-2025.xlsx',
    NOW()
FROM items 
WHERE item_code = 'XT90-FEMALE-HOUSING'
LIMIT 1;

-- Stock for 24v AC/DC module
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
    86.0,
    'IN',
    'OPENING_STOCK',
    'INITIAL-IMPORT',
    'Imported from Stock List 2024-2025.xlsx',
    NOW()
FROM items 
WHERE item_code = '24V-ACDC-MODULE'
LIMIT 1;

-- Stock for Momentary Switch JCB
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
    4.0,
    'IN',
    'OPENING_STOCK',
    'INITIAL-IMPORT',
    'Imported from Stock List 2024-2025.xlsx',
    NOW()
FROM items 
WHERE item_code = 'MOMENTARY-SWITCH-JCB'
LIMIT 1;

-- Stock for Latching Power switch JCB
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
    30.0,
    'IN',
    'OPENING_STOCK',
    'INITIAL-IMPORT',
    'Imported from Stock List 2024-2025.xlsx',
    NOW()
FROM items 
WHERE item_code = 'LATCHING-POWER-SWITCH'
LIMIT 1;

-- Stock for PWB for IFU
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
    180.0,
    'IN',
    'OPENING_STOCK',
    'INITIAL-IMPORT',
    'Imported from Stock List 2024-2025.xlsx',
    NOW()
FROM items 
WHERE item_code = 'PWB-FOR-IFU'
LIMIT 1;

-- Stock for PWB for JCB
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
    16.0,
    'IN',
    'OPENING_STOCK',
    'INITIAL-IMPORT',
    'Imported from Stock List 2024-2025.xlsx',
    NOW()
FROM items 
WHERE item_code = 'PWB-FOR-JCB'
LIMIT 1;

-- Stock for PWB of STBD flash light
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
    212.0,
    'IN',
    'OPENING_STOCK',
    'INITIAL-IMPORT',
    'Imported from Stock List 2024-2025.xlsx',
    NOW()
FROM items 
WHERE item_code = 'PWB-OF-STBD'
LIMIT 1;

-- Stock for PWB of PORT flash light
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
    209.0,
    'IN',
    'OPENING_STOCK',
    'INITIAL-IMPORT',
    'Imported from Stock List 2024-2025.xlsx',
    NOW()
FROM items 
WHERE item_code = 'PWB-OF-PORT'
LIMIT 1;

-- Stock for PWB of A4 Motherboard
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
    93.0,
    'IN',
    'OPENING_STOCK',
    'INITIAL-IMPORT',
    'Imported from Stock List 2024-2025.xlsx',
    NOW()
FROM items 
WHERE item_code = 'PWB-OF-A4'
LIMIT 1;

-- Stock for PWB of Current Sensor
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
    176.0,
    'IN',
    'OPENING_STOCK',
    'INITIAL-IMPORT',
    'Imported from Stock List 2024-2025.xlsx',
    NOW()
FROM items 
WHERE item_code = 'PWB-OF-CURRENT'
LIMIT 1;

-- Stock for PWB of Button -2
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
    346.0,
    'IN',
    'OPENING_STOCK',
    'INITIAL-IMPORT',
    'Imported from Stock List 2024-2025.xlsx',
    NOW()
FROM items 
WHERE item_code = 'PWB-OF-BUTTON'
LIMIT 1;

-- Stock for PWB for PC (in charger)
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
    72.0,
    'IN',
    'OPENING_STOCK',
    'INITIAL-IMPORT',
    'Imported from Stock List 2024-2025.xlsx',
    NOW()
FROM items 
WHERE item_code = 'PWB-FOR-PC'
LIMIT 1;

-- Stock for PWB for Bathemetry Sensor
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
    5.0,
    'IN',
    'OPENING_STOCK',
    'INITIAL-IMPORT',
    'Imported from Stock List 2024-2025.xlsx',
    NOW()
FROM items 
WHERE item_code = 'PWB-FOR-BATHEMETRY'
LIMIT 1;

-- Stock for AMCA Onboard Charging Circuit
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
    5.0,
    'IN',
    'OPENING_STOCK',
    'INITIAL-IMPORT',
    'Imported from Stock List 2024-2025.xlsx',
    NOW()
FROM items 
WHERE item_code = 'AMCA-ONBOARD-CHARGING'
LIMIT 1;

-- Stock for SBus Generator Circuit (Tailored Solution)
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
    5.0,
    'IN',
    'OPENING_STOCK',
    'INITIAL-IMPORT',
    'Imported from Stock List 2024-2025.xlsx',
    NOW()
FROM items 
WHERE item_code = 'SBUS-GENERATOR-CIRCUIT'
LIMIT 1;

-- Stock for A5 Board with own bucks
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
    5.0,
    'IN',
    'OPENING_STOCK',
    'INITIAL-IMPORT',
    'Imported from Stock List 2024-2025.xlsx',
    NOW()
FROM items 
WHERE item_code = 'A5-BOARD-WITH'
LIMIT 1;

-- Stock for WCS1700 current Sensor
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
    191.0,
    'IN',
    'OPENING_STOCK',
    'INITIAL-IMPORT',
    'Imported from Stock List 2024-2025.xlsx',
    NOW()
FROM items 
WHERE item_code = 'WCS1700-CURRENT-SENSOR'
LIMIT 1;

-- Stock for 6X3 BATTERY blocks
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
    235.0,
    'IN',
    'OPENING_STOCK',
    'INITIAL-IMPORT',
    'Imported from Stock List 2024-2025.xlsx',
    NOW()
FROM items 
WHERE item_code = '6X3-BATTERY-BLOCKS'
LIMIT 1;

-- Stock for 18650 cells Li-Ion for JCB
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
    10.0,
    'IN',
    'OPENING_STOCK',
    'INITIAL-IMPORT',
    'Imported from Stock List 2024-2025.xlsx',
    NOW()
FROM items 
WHERE item_code = '18650-CELLS-LIION'
LIMIT 1;

-- Stock for 18650 Cell Holder
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
    100.0,
    'IN',
    'OPENING_STOCK',
    'INITIAL-IMPORT',
    'Imported from Stock List 2024-2025.xlsx',
    NOW()
FROM items 
WHERE item_code = '18650-CELL-HOLDER'
LIMIT 1;

-- Stock for USB Data & Charging Cable 1.5m length Black
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
    2.0,
    'IN',
    'OPENING_STOCK',
    'INITIAL-IMPORT',
    'Imported from Stock List 2024-2025.xlsx',
    NOW()
FROM items 
WHERE item_code = 'USB-DATA-CHARGING'
LIMIT 1;

-- Stock for DC Jack Panel Mount
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
    43.0,
    'IN',
    'OPENING_STOCK',
    'INITIAL-IMPORT',
    'Imported from Stock List 2024-2025.xlsx',
    NOW()
FROM items 
WHERE item_code = 'DC-JACK-PANEL'
LIMIT 1;

-- Stock for Lead paste
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
    51.0,
    'IN',
    'OPENING_STOCK',
    'INITIAL-IMPORT',
    'Imported from Stock List 2024-2025.xlsx',
    NOW()
FROM items 
WHERE item_code = 'LEAD-PASTE'
LIMIT 1;

-- Stock for Lead wire 22AWG
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
    800.0,
    'IN',
    'OPENING_STOCK',
    'INITIAL-IMPORT',
    'Imported from Stock List 2024-2025.xlsx',
    NOW()
FROM items 
WHERE item_code = 'LEAD-WIRE-22AWG'
LIMIT 1;

-- Stock for Heat Sink Pad
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
    11.0,
    'IN',
    'OPENING_STOCK',
    'INITIAL-IMPORT',
    'Imported from Stock List 2024-2025.xlsx',
    NOW()
FROM items 
WHERE item_code = 'HEAT-SINK-PAD'
LIMIT 1;

-- Stock for LM358DT SMD
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
    237.0,
    'IN',
    'OPENING_STOCK',
    'INITIAL-IMPORT',
    'Imported from Stock List 2024-2025.xlsx',
    NOW()
FROM items 
WHERE item_code = 'LM358DT-SMD'
LIMIT 1;

-- Stock for 0.1uF 0805
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
    1870.0,
    'IN',
    'OPENING_STOCK',
    'INITIAL-IMPORT',
    'Imported from Stock List 2024-2025.xlsx',
    NOW()
FROM items 
WHERE item_code = '01UF-0805'
LIMIT 1;

-- Stock for 0.01uF 0805
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
    890.0,
    'IN',
    'OPENING_STOCK',
    'INITIAL-IMPORT',
    'Imported from Stock List 2024-2025.xlsx',
    NOW()
FROM items 
WHERE item_code = '001UF-0805'
LIMIT 1;

-- Stock for LED 0805 SMD
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
    114.0,
    'IN',
    'OPENING_STOCK',
    'INITIAL-IMPORT',
    'Imported from Stock List 2024-2025.xlsx',
    NOW()
FROM items 
WHERE item_code = 'LED-0805-SMD'
LIMIT 1;

-- Stock for TS5A3157DBVR SSR Encoder Signal Cut-Off
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
    115.0,
    'IN',
    'OPENING_STOCK',
    'INITIAL-IMPORT',
    'Imported from Stock List 2024-2025.xlsx',
    NOW()
FROM items 
WHERE item_code = 'TS5A3157DBVR-SSR-ENCODER'
LIMIT 1;

-- Stock for Tactile Switch for IFU four leg
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
    200.0,
    'IN',
    'OPENING_STOCK',
    'INITIAL-IMPORT',
    'Imported from Stock List 2024-2025.xlsx',
    NOW()
FROM items 
WHERE item_code = 'TACTILE-SWITCH-FOR'
LIMIT 1;

-- Stock for LM2596HVS-ADJ Buck only IC
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
    5.0,
    'IN',
    'OPENING_STOCK',
    'INITIAL-IMPORT',
    'Imported from Stock List 2024-2025.xlsx',
    NOW()
FROM items 
WHERE item_code = 'LM2596HVSADJ-BUCK-ONLY'
LIMIT 1;

-- Stock for MP9486AGN-Z 100v Buck converter IC
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
    5.0,
    'IN',
    'OPENING_STOCK',
    'INITIAL-IMPORT',
    'Imported from Stock List 2024-2025.xlsx',
    NOW()
FROM items 
WHERE item_code = 'MP9486AGNZ-100V-BUCK'
LIMIT 1;

-- Stock for 12v Fixed Buck 18-75 In MultiCom Pro
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
    1.0,
    'IN',
    'OPENING_STOCK',
    'INITIAL-IMPORT',
    'Imported from Stock List 2024-2025.xlsx',
    NOW()
FROM items 
WHERE item_code = '12V-FIXED-BUCK'
LIMIT 1;

-- Stock for 5v Fixed Buck 18-75 In MultiCom Pro
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
    5.0,
    'IN',
    'OPENING_STOCK',
    'INITIAL-IMPORT',
    'Imported from Stock List 2024-2025.xlsx',
    NOW()
FROM items 
WHERE item_code = '5V-FIXED-BUCK'
LIMIT 1;

-- Stock for 1N4148 SMD
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
    751.0,
    'IN',
    'OPENING_STOCK',
    'INITIAL-IMPORT',
    'Imported from Stock List 2024-2025.xlsx',
    NOW()
FROM items 
WHERE item_code = '1N4148-SMD'
LIMIT 1;

-- Stock for 18pF 0805 capacitor
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
    2067.0,
    'IN',
    'OPENING_STOCK',
    'INITIAL-IMPORT',
    'Imported from Stock List 2024-2025.xlsx',
    NOW()
FROM items 
WHERE item_code = '18PF-0805-CAPACITOR'
LIMIT 1;

-- Stock for 10uF 10v Tantalum Capacitor Case A
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
    594.0,
    'IN',
    'OPENING_STOCK',
    'INITIAL-IMPORT',
    'Imported from Stock List 2024-2025.xlsx',
    NOW()
FROM items 
WHERE item_code = '10UF-10V-TANTALUM'
LIMIT 1;

-- Stock for 1k 0805 Resistor
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
    450.0,
    'IN',
    'OPENING_STOCK',
    'INITIAL-IMPORT',
    'Imported from Stock List 2024-2025.xlsx',
    NOW()
FROM items 
WHERE item_code = '1K-0805-RESISTOR'
LIMIT 1;

-- Stock for 10k 0805 resistor
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
    66.0,
    'IN',
    'OPENING_STOCK',
    'INITIAL-IMPORT',
    'Imported from Stock List 2024-2025.xlsx',
    NOW()
FROM items 
WHERE item_code = '10K-0805-RESISTOR'
LIMIT 1;

-- Stock for 330E 0805 Resistor
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
    1090.0,
    'IN',
    'OPENING_STOCK',
    'INITIAL-IMPORT',
    'Imported from Stock List 2024-2025.xlsx',
    NOW()
FROM items 
WHERE item_code = '330E-0805-RESISTOR'
LIMIT 1;

-- Stock for Murata 12v 4.5A buck
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
    70.0,
    'IN',
    'OPENING_STOCK',
    'INITIAL-IMPORT',
    'Imported from Stock List 2024-2025.xlsx',
    NOW()
FROM items 
WHERE item_code = 'MURATA-12V-45A'
LIMIT 1;

-- Stock for Murata 5v 10A buck
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
    2.0,
    'IN',
    'OPENING_STOCK',
    'INITIAL-IMPORT',
    'Imported from Stock List 2024-2025.xlsx',
    NOW()
FROM items 
WHERE item_code = 'MURATA-5V-10A'
LIMIT 1;

-- Stock for 1K 3296 Resistor
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
    20.0,
    'IN',
    'OPENING_STOCK',
    'INITIAL-IMPORT',
    'Imported from Stock List 2024-2025.xlsx',
    NOW()
FROM items 
WHERE item_code = '1K-3296-RESISTOR'
LIMIT 1;

-- Stock for 2K 3296 Resistor
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
    20.0,
    'IN',
    'OPENING_STOCK',
    'INITIAL-IMPORT',
    'Imported from Stock List 2024-2025.xlsx',
    NOW()
FROM items 
WHERE item_code = '2K-3296-RESISTOR'
LIMIT 1;

-- Stock for 5 W 1 Ω Resistor
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
    10.0,
    'IN',
    'OPENING_STOCK',
    'INITIAL-IMPORT',
    'Imported from Stock List 2024-2025.xlsx',
    NOW()
FROM items 
WHERE item_code = '5-W-1'
LIMIT 1;

-- Stock for 5 W 5 Ω Resistor
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
    10.0,
    'IN',
    'OPENING_STOCK',
    'INITIAL-IMPORT',
    'Imported from Stock List 2024-2025.xlsx',
    NOW()
FROM items 
WHERE item_code = '5-W-5'
LIMIT 1;

-- Stock for Fuse 500mA
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
    198.0,
    'IN',
    'OPENING_STOCK',
    'INITIAL-IMPORT',
    'Imported from Stock List 2024-2025.xlsx',
    NOW()
FROM items 
WHERE item_code = 'FUSE-500MA'
LIMIT 1;

-- Stock for MCP3208
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
    240.0,
    'IN',
    'OPENING_STOCK',
    'INITIAL-IMPORT',
    'Imported from Stock List 2024-2025.xlsx',
    NOW()
FROM items 
WHERE item_code = 'MCP3208'
LIMIT 1;

-- Stock for 23A 24v Power relay
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
    90.0,
    'IN',
    'OPENING_STOCK',
    'INITIAL-IMPORT',
    'Imported from Stock List 2024-2025.xlsx',
    NOW()
FROM items 
WHERE item_code = '23A-24V-POWER'
LIMIT 1;

-- Stock for LM61 Temperature Sensor
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
    175.0,
    'IN',
    'OPENING_STOCK',
    'INITIAL-IMPORT',
    'Imported from Stock List 2024-2025.xlsx',
    NOW()
FROM items 
WHERE item_code = 'LM61-TEMPERATURE-SENSOR'
LIMIT 1;

-- Stock for 47k 0805
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
    2410.0,
    'IN',
    'OPENING_STOCK',
    'INITIAL-IMPORT',
    'Imported from Stock List 2024-2025.xlsx',
    NOW()
FROM items 
WHERE item_code = '47K-0805'
LIMIT 1;

-- Stock for 470k 0805 PANASONIC/BOURNS/MURATA
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
    2714.0,
    'IN',
    'OPENING_STOCK',
    'INITIAL-IMPORT',
    'Imported from Stock List 2024-2025.xlsx',
    NOW()
FROM items 
WHERE item_code = '470K-0805-PANASONICBOURNSMURATA'
LIMIT 1;

-- Stock for 20k 0805 PANASONIC/BOURNS/MURATA
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
    1339.0,
    'IN',
    'OPENING_STOCK',
    'INITIAL-IMPORT',
    'Imported from Stock List 2024-2025.xlsx',
    NOW()
FROM items 
WHERE item_code = '20K-0805-PANASONICBOURNSMURATA'
LIMIT 1;

-- Stock for 1uF 0805 PANASONIC
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
    1960.0,
    'IN',
    'OPENING_STOCK',
    'INITIAL-IMPORT',
    'Imported from Stock List 2024-2025.xlsx',
    NOW()
FROM items 
WHERE item_code = '1UF-0805-PANASONIC'
LIMIT 1;

-- Stock for 16MHz Crystal Oscillator
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
    532.0,
    'IN',
    'OPENING_STOCK',
    'INITIAL-IMPORT',
    'Imported from Stock List 2024-2025.xlsx',
    NOW()
FROM items 
WHERE item_code = '16MHZ-CRYSTAL-OSCILLATOR'
LIMIT 1;

-- Stock for ULN2004 SMD
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
    218.0,
    'IN',
    'OPENING_STOCK',
    'INITIAL-IMPORT',
    'Imported from Stock List 2024-2025.xlsx',
    NOW()
FROM items 
WHERE item_code = 'ULN2004-SMD'
LIMIT 1;

-- Stock for SSR AQW282SX
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
    402.0,
    'IN',
    'OPENING_STOCK',
    'INITIAL-IMPORT',
    'Imported from Stock List 2024-2025.xlsx',
    NOW()
FROM items 
WHERE item_code = 'SSR-AQW282SX'
LIMIT 1;

-- Stock for Atmega328P Controller
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
    400.0,
    'IN',
    'OPENING_STOCK',
    'INITIAL-IMPORT',
    'Imported from Stock List 2024-2025.xlsx',
    NOW()
FROM items 
WHERE item_code = 'ATMEGA328P-CONTROLLER'
LIMIT 1;

-- Stock for Power Relay 120A 12v Y7
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
    35.0,
    'IN',
    'OPENING_STOCK',
    'INITIAL-IMPORT',
    'Imported from Stock List 2024-2025.xlsx',
    NOW()
FROM items 
WHERE item_code = 'POWER-RELAY-120A'
LIMIT 1;

-- Stock for Power Relay 90A 12v Y6
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
    301.0,
    'IN',
    'OPENING_STOCK',
    'INITIAL-IMPORT',
    'Imported from Stock List 2024-2025.xlsx',
    NOW()
FROM items 
WHERE item_code = 'POWER-RELAY-90A'
LIMIT 1;

-- Stock for SPST relay 5A-12v ANTI_S & KILL
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
    131.0,
    'IN',
    'OPENING_STOCK',
    'INITIAL-IMPORT',
    'Imported from Stock List 2024-2025.xlsx',
    NOW()
FROM items 
WHERE item_code = 'SPST-RELAY-5A12V'
LIMIT 1;

-- Stock for Balancing 1A DPDT 24v Relay
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
    268.0,
    'IN',
    'OPENING_STOCK',
    'INITIAL-IMPORT',
    'Imported from Stock List 2024-2025.xlsx',
    NOW()
FROM items 
WHERE item_code = 'BALANCING-1A-DPDT'
LIMIT 1;

-- Stock for Balancing relay 5A/2A 24v SPST
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
    87.0,
    'IN',
    'OPENING_STOCK',
    'INITIAL-IMPORT',
    'Imported from Stock List 2024-2025.xlsx',
    NOW()
FROM items 
WHERE item_code = 'BALANCING-RELAY-5A2A'
LIMIT 1;

-- Stock for 32Gb SD Card
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
    25.0,
    'IN',
    'OPENING_STOCK',
    'INITIAL-IMPORT',
    'Imported from Stock List 2024-2025.xlsx',
    NOW()
FROM items 
WHERE item_code = '32GB-SD-CARD'
LIMIT 1;

-- Stock for 16pin IC base
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
    75.0,
    'IN',
    'OPENING_STOCK',
    'INITIAL-IMPORT',
    'Imported from Stock List 2024-2025.xlsx',
    NOW()
FROM items 
WHERE item_code = '16PIN-IC-BASE'
LIMIT 1;

-- Stock for BlueTooth Module
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
    54.0,
    'IN',
    'OPENING_STOCK',
    'INITIAL-IMPORT',
    'Imported from Stock List 2024-2025.xlsx',
    NOW()
FROM items 
WHERE item_code = 'BLUETOOTH-MODULE'
LIMIT 1;

-- Stock for 24AWG Soldering Wire
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
    1000.0,
    'IN',
    'OPENING_STOCK',
    'INITIAL-IMPORT',
    'Imported from Stock List 2024-2025.xlsx',
    NOW()
FROM items 
WHERE item_code = '24AWG-SOLDERING-WIRE'
LIMIT 1;

-- Stock for 12E 2W Resistor THT
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
    36.0,
    'IN',
    'OPENING_STOCK',
    'INITIAL-IMPORT',
    'Imported from Stock List 2024-2025.xlsx',
    NOW()
FROM items 
WHERE item_code = '12E-2W-RESISTOR'
LIMIT 1;

-- Stock for iMAx B3 Charger
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
    38.0,
    'IN',
    'OPENING_STOCK',
    'INITIAL-IMPORT',
    'Imported from Stock List 2024-2025.xlsx',
    NOW()
FROM items 
WHERE item_code = 'IMAX-B3-CHARGER'
LIMIT 1;

-- Stock for 9v Piezo Electric Buzzer
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
    12.0,
    'IN',
    'OPENING_STOCK',
    'INITIAL-IMPORT',
    'Imported from Stock List 2024-2025.xlsx',
    NOW()
FROM items 
WHERE item_code = '9V-PIEZO-ELECTRIC'
LIMIT 1;

-- Stock for Female Bergstrip 40x1 2.54mm
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
    31.0,
    'IN',
    'OPENING_STOCK',
    'INITIAL-IMPORT',
    'Imported from Stock List 2024-2025.xlsx',
    NOW()
FROM items 
WHERE item_code = 'FEMALE-BERGSTRIP-40X1'
LIMIT 1;

-- Stock for Male Bergstrip 40x1 2.54mm
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
    18.0,
    'IN',
    'OPENING_STOCK',
    'INITIAL-IMPORT',
    'Imported from Stock List 2024-2025.xlsx',
    NOW()
FROM items 
WHERE item_code = 'MALE-BERGSTRIP-40X1'
LIMIT 1;

-- Stock for Female Bergstrip 40x1 2.0mm
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
    38.0,
    'IN',
    'OPENING_STOCK',
    'INITIAL-IMPORT',
    'Imported from Stock List 2024-2025.xlsx',
    NOW()
FROM items 
WHERE item_code = 'FEMALE-BERGSTRIP-40X1'
LIMIT 1;

-- Stock for Male Bergstrip 40x1 2.0mm
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
    31.0,
    'IN',
    'OPENING_STOCK',
    'INITIAL-IMPORT',
    'Imported from Stock List 2024-2025.xlsx',
    NOW()
FROM items 
WHERE item_code = 'MALE-BERGSTRIP-40X1'
LIMIT 1;

-- Stock for Conformal Coating
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
    1000.0,
    'IN',
    'OPENING_STOCK',
    'INITIAL-IMPORT',
    'Imported from Stock List 2024-2025.xlsx',
    NOW()
FROM items 
WHERE item_code = 'CONFORMAL-COATING'
LIMIT 1;

-- Stock for Soldering flux Small lead
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
    210.0,
    'IN',
    'OPENING_STOCK',
    'INITIAL-IMPORT',
    'Imported from Stock List 2024-2025.xlsx',
    NOW()
FROM items 
WHERE item_code = 'SOLDERING-FLUX-SMALL'
LIMIT 1;

-- Stock for 3 pin 3 yrd power cord
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
    18.0,
    'IN',
    'OPENING_STOCK',
    'INITIAL-IMPORT',
    'Imported from Stock List 2024-2025.xlsx',
    NOW()
FROM items 
WHERE item_code = '3-PIN-3'
LIMIT 1;

-- Stock for 2 pin JST-XH housing
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
    519.0,
    'IN',
    'OPENING_STOCK',
    'INITIAL-IMPORT',
    'Imported from Stock List 2024-2025.xlsx',
    NOW()
FROM items 
WHERE item_code = '2-PIN-JSTXH'
LIMIT 1;

-- Stock for 3 pin JST-XH housing
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
    285.0,
    'IN',
    'OPENING_STOCK',
    'INITIAL-IMPORT',
    'Imported from Stock List 2024-2025.xlsx',
    NOW()
FROM items 
WHERE item_code = '3-PIN-JSTXH'
LIMIT 1;

-- Stock for 13 pin JST-XH housing
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
    373.0,
    'IN',
    'OPENING_STOCK',
    'INITIAL-IMPORT',
    'Imported from Stock List 2024-2025.xlsx',
    NOW()
FROM items 
WHERE item_code = '13-PIN-JSTXH'
LIMIT 1;

-- Stock for 15 pin JST-XH housing
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
    413.0,
    'IN',
    'OPENING_STOCK',
    'INITIAL-IMPORT',
    'Imported from Stock List 2024-2025.xlsx',
    NOW()
FROM items 
WHERE item_code = '15-PIN-JSTXH'
LIMIT 1;

-- Stock for 2 pin JST-XH male top entry
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
    425.0,
    'IN',
    'OPENING_STOCK',
    'INITIAL-IMPORT',
    'Imported from Stock List 2024-2025.xlsx',
    NOW()
FROM items 
WHERE item_code = '2-PIN-JSTXH'
LIMIT 1;

-- Stock for 2 pin JST-XH male side entry
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
    100.0,
    'IN',
    'OPENING_STOCK',
    'INITIAL-IMPORT',
    'Imported from Stock List 2024-2025.xlsx',
    NOW()
FROM items 
WHERE item_code = '2-PIN-JSTXH'
LIMIT 1;

-- Stock for 3 pin JST-XH male top entry
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
    178.0,
    'IN',
    'OPENING_STOCK',
    'INITIAL-IMPORT',
    'Imported from Stock List 2024-2025.xlsx',
    NOW()
FROM items 
WHERE item_code = '3-PIN-JSTXH'
LIMIT 1;

-- Stock for 2510 Crimping pins
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
    500.0,
    'IN',
    'OPENING_STOCK',
    'INITIAL-IMPORT',
    'Imported from Stock List 2024-2025.xlsx',
    NOW()
FROM items 
WHERE item_code = '2510-CRIMPING-PINS'
LIMIT 1;

-- Stock for 13 pin JST-XH male top entry
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
    407.0,
    'IN',
    'OPENING_STOCK',
    'INITIAL-IMPORT',
    'Imported from Stock List 2024-2025.xlsx',
    NOW()
FROM items 
WHERE item_code = '13-PIN-JSTXH'
LIMIT 1;

-- Stock for 15 pin JST-XH male top entry
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
    523.0,
    'IN',
    'OPENING_STOCK',
    'INITIAL-IMPORT',
    'Imported from Stock List 2024-2025.xlsx',
    NOW()
FROM items 
WHERE item_code = '15-PIN-JSTXH'
LIMIT 1;

-- Stock for JST-XH Crimping pins
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
    522.0,
    'IN',
    'OPENING_STOCK',
    'INITIAL-IMPORT',
    'Imported from Stock List 2024-2025.xlsx',
    NOW()
FROM items 
WHERE item_code = 'JSTXH-CRIMPING-PINS'
LIMIT 1;

-- Stock for 25cm Red one side crimped wire
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
    200.0,
    'IN',
    'OPENING_STOCK',
    'INITIAL-IMPORT',
    'Imported from Stock List 2024-2025.xlsx',
    NOW()
FROM items 
WHERE item_code = '25CM-RED-ONE'
LIMIT 1;

-- Stock for 25cm Green one side crimped wire
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
    200.0,
    'IN',
    'OPENING_STOCK',
    'INITIAL-IMPORT',
    'Imported from Stock List 2024-2025.xlsx',
    NOW()
FROM items 
WHERE item_code = '25CM-GREEN-ONE'
LIMIT 1;

-- Stock for 25cm Black one side crimped wire
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
    200.0,
    'IN',
    'OPENING_STOCK',
    'INITIAL-IMPORT',
    'Imported from Stock List 2024-2025.xlsx',
    NOW()
FROM items 
WHERE item_code = '25CM-BLACK-ONE'
LIMIT 1;

-- Stock for 10cm one sided JST crimped Black
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
    130.0,
    'IN',
    'OPENING_STOCK',
    'INITIAL-IMPORT',
    'Imported from Stock List 2024-2025.xlsx',
    NOW()
FROM items 
WHERE item_code = '10CM-ONE-SIDED'
LIMIT 1;

-- Stock for 10cm one sided JST crimped Green
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
    451.0,
    'IN',
    'OPENING_STOCK',
    'INITIAL-IMPORT',
    'Imported from Stock List 2024-2025.xlsx',
    NOW()
FROM items 
WHERE item_code = '10CM-ONE-SIDED'
LIMIT 1;

-- Stock for 10cm one sided JST crimped Voilet
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
    452.0,
    'IN',
    'OPENING_STOCK',
    'INITIAL-IMPORT',
    'Imported from Stock List 2024-2025.xlsx',
    NOW()
FROM items 
WHERE item_code = '10CM-ONE-SIDED'
LIMIT 1;

-- Stock for 10cm one sided JST crimped Yellow
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
    469.0,
    'IN',
    'OPENING_STOCK',
    'INITIAL-IMPORT',
    'Imported from Stock List 2024-2025.xlsx',
    NOW()
FROM items 
WHERE item_code = '10CM-ONE-SIDED'
LIMIT 1;

-- Stock for 10cm one sided JST crimped Sky Blue
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
    485.0,
    'IN',
    'OPENING_STOCK',
    'INITIAL-IMPORT',
    'Imported from Stock List 2024-2025.xlsx',
    NOW()
FROM items 
WHERE item_code = '10CM-ONE-SIDED'
LIMIT 1;

-- Stock for 10cm one sided JST crimped Pink
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
    479.0,
    'IN',
    'OPENING_STOCK',
    'INITIAL-IMPORT',
    'Imported from Stock List 2024-2025.xlsx',
    NOW()
FROM items 
WHERE item_code = '10CM-ONE-SIDED'
LIMIT 1;

-- Stock for 10cm one sided JST crimped Orange
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
    512.0,
    'IN',
    'OPENING_STOCK',
    'INITIAL-IMPORT',
    'Imported from Stock List 2024-2025.xlsx',
    NOW()
FROM items 
WHERE item_code = '10CM-ONE-SIDED'
LIMIT 1;

-- Stock for 10cm one sided JST crimped Dark Blue
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
    450.0,
    'IN',
    'OPENING_STOCK',
    'INITIAL-IMPORT',
    'Imported from Stock List 2024-2025.xlsx',
    NOW()
FROM items 
WHERE item_code = '10CM-ONE-SIDED'
LIMIT 1;

-- Stock for 10cm one sided JST crimped Light Brown
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
    90.0,
    'IN',
    'OPENING_STOCK',
    'INITIAL-IMPORT',
    'Imported from Stock List 2024-2025.xlsx',
    NOW()
FROM items 
WHERE item_code = '10CM-ONE-SIDED'
LIMIT 1;

-- Stock for 10cm one sided JST crimped Dark Brown
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
    210.0,
    'IN',
    'OPENING_STOCK',
    'INITIAL-IMPORT',
    'Imported from Stock List 2024-2025.xlsx',
    NOW()
FROM items 
WHERE item_code = '10CM-ONE-SIDED'
LIMIT 1;

-- Stock for 10cm one sided JST crimped White with Red strip
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
    483.0,
    'IN',
    'OPENING_STOCK',
    'INITIAL-IMPORT',
    'Imported from Stock List 2024-2025.xlsx',
    NOW()
FROM items 
WHERE item_code = '10CM-ONE-SIDED'
LIMIT 1;

-- Stock for 10cm one sided JST crimped White with black strip
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
    470.0,
    'IN',
    'OPENING_STOCK',
    'INITIAL-IMPORT',
    'Imported from Stock List 2024-2025.xlsx',
    NOW()
FROM items 
WHERE item_code = '10CM-ONE-SIDED'
LIMIT 1;

-- Stock for 10cm one sided JST crimped White
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
    584.0,
    'IN',
    'OPENING_STOCK',
    'INITIAL-IMPORT',
    'Imported from Stock List 2024-2025.xlsx',
    NOW()
FROM items 
WHERE item_code = '10CM-ONE-SIDED'
LIMIT 1;

-- Stock for 10cm one sided JST crimped Red
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
    190.0,
    'IN',
    'OPENING_STOCK',
    'INITIAL-IMPORT',
    'Imported from Stock List 2024-2025.xlsx',
    NOW()
FROM items 
WHERE item_code = '10CM-ONE-SIDED'
LIMIT 1;

-- Stock for 10cm one sided JST crimped Light Grey
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
    205.0,
    'IN',
    'OPENING_STOCK',
    'INITIAL-IMPORT',
    'Imported from Stock List 2024-2025.xlsx',
    NOW()
FROM items 
WHERE item_code = '10CM-ONE-SIDED'
LIMIT 1;

-- Stock for 10cm one sided JST crimped Dark Parrot Green
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
    200.0,
    'IN',
    'OPENING_STOCK',
    'INITIAL-IMPORT',
    'Imported from Stock List 2024-2025.xlsx',
    NOW()
FROM items 
WHERE item_code = '10CM-ONE-SIDED'
LIMIT 1;

-- Stock for Tactile switch for reset two leg
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
    78.0,
    'IN',
    'OPENING_STOCK',
    'INITIAL-IMPORT',
    'Imported from Stock List 2024-2025.xlsx',
    NOW()
FROM items 
WHERE item_code = 'TACTILE-SWITCH-FOR'
LIMIT 1;

-- Stock for 915MHz Antenna
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
    40.0,
    'IN',
    'OPENING_STOCK',
    'INITIAL-IMPORT',
    'Imported from Stock List 2024-2025.xlsx',
    NOW()
FROM items 
WHERE item_code = '915MHZ-ANTENNA'
LIMIT 1;

-- Stock for Ipex4 to SMA converter extension (1675015) (Antenna pigtail connectror)
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
    12.0,
    'IN',
    'OPENING_STOCK',
    'INITIAL-IMPORT',
    'Imported from Stock List 2024-2025.xlsx',
    NOW()
FROM items 
WHERE item_code = 'IPEX4-TO-SMA'
LIMIT 1;

-- Stock for Ipex4 to SMA converter extension (for R9MM ipex4)
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
    42.0,
    'IN',
    'OPENING_STOCK',
    'INITIAL-IMPORT',
    'Imported from Stock List 2024-2025.xlsx',
    NOW()
FROM items 
WHERE item_code = 'IPEX4-TO-SMA'
LIMIT 1;

-- Stock for R9M Antenna Extension wire RP-SMA to Open
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
    197.0,
    'IN',
    'OPENING_STOCK',
    'INITIAL-IMPORT',
    'Imported from Stock List 2024-2025.xlsx',
    NOW()
FROM items 
WHERE item_code = 'R9M-ANTENNA-EXTENSION'
LIMIT 1;

-- Stock for 20 AWG Silicone Red - Wire
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
    25.0,
    'IN',
    'OPENING_STOCK',
    'INITIAL-IMPORT',
    'Imported from Stock List 2024-2025.xlsx',
    NOW()
FROM items 
WHERE item_code = '20-AWG-SILICONE'
LIMIT 1;

-- Stock for 25Core Wire 14/38
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
    10.0,
    'IN',
    'OPENING_STOCK',
    'INITIAL-IMPORT',
    'Imported from Stock List 2024-2025.xlsx',
    NOW()
FROM items 
WHERE item_code = '25CORE-WIRE-1438'
LIMIT 1;

-- Stock for 20Core Wire 14/38
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
    400.0,
    'IN',
    'OPENING_STOCK',
    'INITIAL-IMPORT',
    'Imported from Stock List 2024-2025.xlsx',
    NOW()
FROM items 
WHERE item_code = '20CORE-WIRE-1438'
LIMIT 1;

-- Stock for 8core Wire 14/38
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
    33.0,
    'IN',
    'OPENING_STOCK',
    'INITIAL-IMPORT',
    'Imported from Stock List 2024-2025.xlsx',
    NOW()
FROM items 
WHERE item_code = '8CORE-WIRE-1438'
LIMIT 1;

-- Stock for 14/38 16 Core Wire
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
    10.0,
    'IN',
    'OPENING_STOCK',
    'INITIAL-IMPORT',
    'Imported from Stock List 2024-2025.xlsx',
    NOW()
FROM items 
WHERE item_code = '1438-16-CORE'
LIMIT 1;

-- Stock for Red 14/38 wire
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
    259.0,
    'IN',
    'OPENING_STOCK',
    'INITIAL-IMPORT',
    'Imported from Stock List 2024-2025.xlsx',
    NOW()
FROM items 
WHERE item_code = 'RED-1438-WIRE'
LIMIT 1;

-- Stock for Black 14/38 Wire
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
    259.0,
    'IN',
    'OPENING_STOCK',
    'INITIAL-IMPORT',
    'Imported from Stock List 2024-2025.xlsx',
    NOW()
FROM items 
WHERE item_code = 'BLACK-1438-WIRE'
LIMIT 1;

-- Stock for Yellow 14/38 Wire
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
    75.0,
    'IN',
    'OPENING_STOCK',
    'INITIAL-IMPORT',
    'Imported from Stock List 2024-2025.xlsx',
    NOW()
FROM items 
WHERE item_code = 'YELLOW-1438-WIRE'
LIMIT 1;

-- Stock for White 14/38 Wire
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
    75.0,
    'IN',
    'OPENING_STOCK',
    'INITIAL-IMPORT',
    'Imported from Stock List 2024-2025.xlsx',
    NOW()
FROM items 
WHERE item_code = 'WHITE-1438-WIRE'
LIMIT 1;

-- Stock for Sky Blue 14/38 Wire
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
    75.0,
    'IN',
    'OPENING_STOCK',
    'INITIAL-IMPORT',
    'Imported from Stock List 2024-2025.xlsx',
    NOW()
FROM items 
WHERE item_code = 'SKY-BLUE-1438'
LIMIT 1;

-- Stock for Orange 14/38 Wire
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
    75.0,
    'IN',
    'OPENING_STOCK',
    'INITIAL-IMPORT',
    'Imported from Stock List 2024-2025.xlsx',
    NOW()
FROM items 
WHERE item_code = 'ORANGE-1438-WIRE'
LIMIT 1;

-- Stock for Green 14/38 Wire
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
    75.0,
    'IN',
    'OPENING_STOCK',
    'INITIAL-IMPORT',
    'Imported from Stock List 2024-2025.xlsx',
    NOW()
FROM items 
WHERE item_code = 'GREEN-1438-WIRE'
LIMIT 1;

-- Stock for Purple 14/38 Wire
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
    75.0,
    'IN',
    'OPENING_STOCK',
    'INITIAL-IMPORT',
    'Imported from Stock List 2024-2025.xlsx',
    NOW()
FROM items 
WHERE item_code = 'PURPLE-1438-WIRE'
LIMIT 1;

-- Stock for Brown 14/38 Wire
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
    75.0,
    'IN',
    'OPENING_STOCK',
    'INITIAL-IMPORT',
    'Imported from Stock List 2024-2025.xlsx',
    NOW()
FROM items 
WHERE item_code = 'BROWN-1438-WIRE'
LIMIT 1;

-- Stock for Aft plate Acrylice for Template
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
    250.0,
    'IN',
    'OPENING_STOCK',
    'INITIAL-IMPORT',
    'Imported from Stock List 2024-2025.xlsx',
    NOW()
FROM items 
WHERE item_code = 'AFT-PLATE-ACRYLICE'
LIMIT 1;

-- Stock for 12S Lipo Charger
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
    13.0,
    'IN',
    'OPENING_STOCK',
    'INITIAL-IMPORT',
    'Imported from Stock List 2024-2025.xlsx',
    NOW()
FROM items 
WHERE item_code = '12S-LIPO-CHARGER'
LIMIT 1;

-- Stock for 8S Lipo Charger ISDT Q8
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
    1.0,
    'IN',
    'OPENING_STOCK',
    'INITIAL-IMPORT',
    'Imported from Stock List 2024-2025.xlsx',
    NOW()
FROM items 
WHERE item_code = '8S-LIPO-CHARGER'
LIMIT 1;

-- Stock for 8kg Hull
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
    30.0,
    'IN',
    'OPENING_STOCK',
    'INITIAL-IMPORT',
    'Imported from Stock List 2024-2025.xlsx',
    NOW()
FROM items 
WHERE item_code = '8KG-HULL'
LIMIT 1;

-- Stock for JCB Body cum mounting frame
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
    20.0,
    'IN',
    'OPENING_STOCK',
    'INITIAL-IMPORT',
    'Imported from Stock List 2024-2025.xlsx',
    NOW()
FROM items 
WHERE item_code = 'JCB-BODY-CUM'
LIMIT 1;

-- Stock for SR Structure
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
    25.0,
    'IN',
    'OPENING_STOCK',
    'INITIAL-IMPORT',
    'Imported from Stock List 2024-2025.xlsx',
    NOW()
FROM items 
WHERE item_code = 'SR-STRUCTURE'
LIMIT 1;

-- Stock for SR Pillow
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
    59.0,
    'IN',
    'OPENING_STOCK',
    'INITIAL-IMPORT',
    'Imported from Stock List 2024-2025.xlsx',
    NOW()
FROM items 
WHERE item_code = 'SR-PILLOW'
LIMIT 1;

-- Stock for 2mm FRP 60x70mm with 18 mm hole
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
    73.0,
    'IN',
    'OPENING_STOCK',
    'INITIAL-IMPORT',
    'Imported from Stock List 2024-2025.xlsx',
    NOW()
FROM items 
WHERE item_code = '2MM-FRP-60X70MM'
LIMIT 1;

-- Stock for Battery Clamp
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
    70.0,
    'IN',
    'OPENING_STOCK',
    'INITIAL-IMPORT',
    'Imported from Stock List 2024-2025.xlsx',
    NOW()
FROM items 
WHERE item_code = 'BATTERY-CLAMP'
LIMIT 1;

-- Stock for Electronic Box Top Lid
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
    28.0,
    'IN',
    'OPENING_STOCK',
    'INITIAL-IMPORT',
    'Imported from Stock List 2024-2025.xlsx',
    NOW()
FROM items 
WHERE item_code = 'ELECTRONIC-BOX-TOP'
LIMIT 1;

-- Stock for Zip ties 100x3 MultiCompro
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
    15.0,
    'IN',
    'OPENING_STOCK',
    'INITIAL-IMPORT',
    'Imported from Stock List 2024-2025.xlsx',
    NOW()
FROM items 
WHERE item_code = 'ZIP-TIES-100X3'
LIMIT 1;

-- Stock for Ferrite Core
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
    443.0,
    'IN',
    'OPENING_STOCK',
    'INITIAL-IMPORT',
    'Imported from Stock List 2024-2025.xlsx',
    NOW()
FROM items 
WHERE item_code = 'FERRITE-CORE'
LIMIT 1;

-- Stock for SY21-15 pin panel mount(Male)
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
    399.0,
    'IN',
    'OPENING_STOCK',
    'INITIAL-IMPORT',
    'Imported from Stock List 2024-2025.xlsx',
    NOW()
FROM items 
WHERE item_code = 'SY2115-PIN-PANEL'
LIMIT 1;

-- Stock for SY21-15 pin Cable Mount(Female)
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
    399.0,
    'IN',
    'OPENING_STOCK',
    'INITIAL-IMPORT',
    'Imported from Stock List 2024-2025.xlsx',
    NOW()
FROM items 
WHERE item_code = 'SY2115-PIN-CABLE'
LIMIT 1;

-- Stock for SY21-15 pin panel mount(Female)
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
    41.0,
    'IN',
    'OPENING_STOCK',
    'INITIAL-IMPORT',
    'Imported from Stock List 2024-2025.xlsx',
    NOW()
FROM items 
WHERE item_code = 'SY2115-PIN-PANEL'
LIMIT 1;

-- Stock for SY21-15 pin Cable Mount(Male)
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
    32.0,
    'IN',
    'OPENING_STOCK',
    'INITIAL-IMPORT',
    'Imported from Stock List 2024-2025.xlsx',
    NOW()
FROM items 
WHERE item_code = 'SY2115-PIN-CABLE'
LIMIT 1;

-- Stock for WY-28 Metal connector CM
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
    174.0,
    'IN',
    'OPENING_STOCK',
    'INITIAL-IMPORT',
    'Imported from Stock List 2024-2025.xlsx',
    NOW()
FROM items 
WHERE item_code = 'WY28-METAL-CONNECTOR'
LIMIT 1;

-- Stock for WY-28 Metal connector PM
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
    173.0,
    'IN',
    'OPENING_STOCK',
    'INITIAL-IMPORT',
    'Imported from Stock List 2024-2025.xlsx',
    NOW()
FROM items 
WHERE item_code = 'WY28-METAL-CONNECTOR'
LIMIT 1;

-- Stock for WK-15 IP68 Cable Metal Connector
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
    5.0,
    'IN',
    'OPENING_STOCK',
    'INITIAL-IMPORT',
    'Imported from Stock List 2024-2025.xlsx',
    NOW()
FROM items 
WHERE item_code = 'WK15-IP68-CABLE'
LIMIT 1;

-- Stock for WK-15 IP68 Cable Metal Connector
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
    5.0,
    'IN',
    'OPENING_STOCK',
    'INITIAL-IMPORT',
    'Imported from Stock List 2024-2025.xlsx',
    NOW()
FROM items 
WHERE item_code = 'WK15-IP68-CABLE'
LIMIT 1;

-- Stock for 15 pin IP68 connectors (Female)
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
    5.0,
    'IN',
    'OPENING_STOCK',
    'INITIAL-IMPORT',
    'Imported from Stock List 2024-2025.xlsx',
    NOW()
FROM items 
WHERE item_code = '15-PIN-IP68'
LIMIT 1;

-- Stock for 15 pin IP68 Connectors (Male)
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
    5.0,
    'IN',
    'OPENING_STOCK',
    'INITIAL-IMPORT',
    'Imported from Stock List 2024-2025.xlsx',
    NOW()
FROM items 
WHERE item_code = '15-PIN-IP68'
LIMIT 1;

-- Stock for SA12 9pin CM Pushpull Male
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
    217.0,
    'IN',
    'OPENING_STOCK',
    'INITIAL-IMPORT',
    'Imported from Stock List 2024-2025.xlsx',
    NOW()
FROM items 
WHERE item_code = 'SA12-9PIN-CM'
LIMIT 1;

-- Stock for SA12 9pin PM Pushpull female
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
    154.0,
    'IN',
    'OPENING_STOCK',
    'INITIAL-IMPORT',
    'Imported from Stock List 2024-2025.xlsx',
    NOW()
FROM items 
WHERE item_code = 'SA12-9PIN-PM'
LIMIT 1;

-- Stock for SA12 9pin Counter
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
    60.0,
    'IN',
    'OPENING_STOCK',
    'INITIAL-IMPORT',
    'Imported from Stock List 2024-2025.xlsx',
    NOW()
FROM items 
WHERE item_code = 'SA12-9PIN-COUNTER'
LIMIT 1;

-- Stock for LP12 3 pin plug male clip lock CM
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
    50.0,
    'IN',
    'OPENING_STOCK',
    'INITIAL-IMPORT',
    'Imported from Stock List 2024-2025.xlsx',
    NOW()
FROM items 
WHERE item_code = 'LP12-3-PIN'
LIMIT 1;

-- Stock for LP12 3 pin socket female clip lock PM
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
    50.0,
    'IN',
    'OPENING_STOCK',
    'INITIAL-IMPORT',
    'Imported from Stock List 2024-2025.xlsx',
    NOW()
FROM items 
WHERE item_code = 'LP12-3-PIN'
LIMIT 1;

-- Stock for LP12 4 pin plug male clip lock CM
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
    2.0,
    'IN',
    'OPENING_STOCK',
    'INITIAL-IMPORT',
    'Imported from Stock List 2024-2025.xlsx',
    NOW()
FROM items 
WHERE item_code = 'LP12-4-PIN'
LIMIT 1;

-- Stock for LP24 24 pin plug female clip lock CM
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
    126.0,
    'IN',
    'OPENING_STOCK',
    'INITIAL-IMPORT',
    'Imported from Stock List 2024-2025.xlsx',
    NOW()
FROM items 
WHERE item_code = 'LP24-24-PIN'
LIMIT 1;

-- Stock for LP24 24 pin socket male clip lock PM
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
    215.0,
    'IN',
    'OPENING_STOCK',
    'INITIAL-IMPORT',
    'Imported from Stock List 2024-2025.xlsx',
    NOW()
FROM items 
WHERE item_code = 'LP24-24-PIN'
LIMIT 1;

-- Stock for Water tank for JCB
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
    28.0,
    'IN',
    'OPENING_STOCK',
    'INITIAL-IMPORT',
    'Imported from Stock List 2024-2025.xlsx',
    NOW()
FROM items 
WHERE item_code = 'WATER-TANK-FOR'
LIMIT 1;

-- Stock for BlueRobotics Leak probe
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
    350.0,
    'IN',
    'OPENING_STOCK',
    'INITIAL-IMPORT',
    'Imported from Stock List 2024-2025.xlsx',
    NOW()
FROM items 
WHERE item_code = 'BLUEROBOTICS-LEAK-PROBE'
LIMIT 1;

-- Stock for BlueRobotics Indicator
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
    16.0,
    'IN',
    'OPENING_STOCK',
    'INITIAL-IMPORT',
    'Imported from Stock List 2024-2025.xlsx',
    NOW()
FROM items 
WHERE item_code = 'BLUEROBOTICS-INDICATOR'
LIMIT 1;

-- Stock for IP68 Rotary main Switch
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
    34.0,
    'IN',
    'OPENING_STOCK',
    'INITIAL-IMPORT',
    'Imported from Stock List 2024-2025.xlsx',
    NOW()
FROM items 
WHERE item_code = 'IP68-ROTARY-MAIN'
LIMIT 1;

-- Stock for Red 2835 SMD LED 1W
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
    900.0,
    'IN',
    'OPENING_STOCK',
    'INITIAL-IMPORT',
    'Imported from Stock List 2024-2025.xlsx',
    NOW()
FROM items 
WHERE item_code = 'RED-2835-SMD'
LIMIT 1;

-- Stock for Green 2835 SMD LED 1W
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
    600.0,
    'IN',
    'OPENING_STOCK',
    'INITIAL-IMPORT',
    'Imported from Stock List 2024-2025.xlsx',
    NOW()
FROM items 
WHERE item_code = 'GREEN-2835-SMD'
LIMIT 1;

-- Stock for No. 4 Self tap Screw SS304 (M4x6.5 Philips)
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
    2600.0,
    'IN',
    'OPENING_STOCK',
    'INITIAL-IMPORT',
    'Imported from Stock List 2024-2025.xlsx',
    NOW()
FROM items 
WHERE item_code = 'NO-4-SELF'
LIMIT 1;

-- Stock for M2x12 Allen Head SS304
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
    1500.0,
    'IN',
    'OPENING_STOCK',
    'INITIAL-IMPORT',
    'Imported from Stock List 2024-2025.xlsx',
    NOW()
FROM items 
WHERE item_code = 'M2X12-ALLEN-HEAD'
LIMIT 1;

-- Stock for M3x6 CSK Phillips
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
    300.0,
    'IN',
    'OPENING_STOCK',
    'INITIAL-IMPORT',
    'Imported from Stock List 2024-2025.xlsx',
    NOW()
FROM items 
WHERE item_code = 'M3X6-CSK-PHILLIPS'
LIMIT 1;

-- Stock for M3x8 CSK Phillips
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
    1200.0,
    'IN',
    'OPENING_STOCK',
    'INITIAL-IMPORT',
    'Imported from Stock List 2024-2025.xlsx',
    NOW()
FROM items 
WHERE item_code = 'M3X8-CSK-PHILLIPS'
LIMIT 1;

-- Stock for M3x30 CSK Phillips
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
    600.0,
    'IN',
    'OPENING_STOCK',
    'INITIAL-IMPORT',
    'Imported from Stock List 2024-2025.xlsx',
    NOW()
FROM items 
WHERE item_code = 'M3X30-CSK-PHILLIPS'
LIMIT 1;

-- Stock for M3x8 Button head
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
    900.0,
    'IN',
    'OPENING_STOCK',
    'INITIAL-IMPORT',
    'Imported from Stock List 2024-2025.xlsx',
    NOW()
FROM items 
WHERE item_code = 'M3X8-BUTTON-HEAD'
LIMIT 1;

-- Stock for M3x10 plain washer
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
    1200.0,
    'IN',
    'OPENING_STOCK',
    'INITIAL-IMPORT',
    'Imported from Stock List 2024-2025.xlsx',
    NOW()
FROM items 
WHERE item_code = 'M3X10-PLAIN-WASHER'
LIMIT 1;

-- Stock for M4x8 CSK Phillips
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
    3000.0,
    'IN',
    'OPENING_STOCK',
    'INITIAL-IMPORT',
    'Imported from Stock List 2024-2025.xlsx',
    NOW()
FROM items 
WHERE item_code = 'M4X8-CSK-PHILLIPS'
LIMIT 1;

-- Stock for M4x8 CSK Phillips GI
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
    300.0,
    'IN',
    'OPENING_STOCK',
    'INITIAL-IMPORT',
    'Imported from Stock List 2024-2025.xlsx',
    NOW()
FROM items 
WHERE item_code = 'M4X8-CSK-PHILLIPS'
LIMIT 1;

-- Stock for M2x15 Allen Head SS304
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
    300.0,
    'IN',
    'OPENING_STOCK',
    'INITIAL-IMPORT',
    'Imported from Stock List 2024-2025.xlsx',
    NOW()
FROM items 
WHERE item_code = 'M2X15-ALLEN-HEAD'
LIMIT 1;

-- Stock for M4x10 CSK Phillips
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
    300.0,
    'IN',
    'OPENING_STOCK',
    'INITIAL-IMPORT',
    'Imported from Stock List 2024-2025.xlsx',
    NOW()
FROM items 
WHERE item_code = 'M4X10-CSK-PHILLIPS'
LIMIT 1;

-- Stock for M4x20 CSK Phillips
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
    900.0,
    'IN',
    'OPENING_STOCK',
    'INITIAL-IMPORT',
    'Imported from Stock List 2024-2025.xlsx',
    NOW()
FROM items 
WHERE item_code = 'M4X20-CSK-PHILLIPS'
LIMIT 1;

-- Stock for M4x12 Allen Head
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
    2000.0,
    'IN',
    'OPENING_STOCK',
    'INITIAL-IMPORT',
    'Imported from Stock List 2024-2025.xlsx',
    NOW()
FROM items 
WHERE item_code = 'M4X12-ALLEN-HEAD'
LIMIT 1;

-- Stock for M4x16 Allen Head
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
    600.0,
    'IN',
    'OPENING_STOCK',
    'INITIAL-IMPORT',
    'Imported from Stock List 2024-2025.xlsx',
    NOW()
FROM items 
WHERE item_code = 'M4X16-ALLEN-HEAD'
LIMIT 1;

-- Stock for M4x10 Allen head
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
    200.0,
    'IN',
    'OPENING_STOCK',
    'INITIAL-IMPORT',
    'Imported from Stock List 2024-2025.xlsx',
    NOW()
FROM items 
WHERE item_code = 'M4X10-ALLEN-HEAD'
LIMIT 1;

-- Stock for M4x30 Allen head
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
    100.0,
    'IN',
    'OPENING_STOCK',
    'INITIAL-IMPORT',
    'Imported from Stock List 2024-2025.xlsx',
    NOW()
FROM items 
WHERE item_code = 'M4X30-ALLEN-HEAD'
LIMIT 1;

-- Stock for M4X40 Allen head
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
    100.0,
    'IN',
    'OPENING_STOCK',
    'INITIAL-IMPORT',
    'Imported from Stock List 2024-2025.xlsx',
    NOW()
FROM items 
WHERE item_code = 'M4X40-ALLEN-HEAD'
LIMIT 1;

-- Stock for M4x20 Allen Head
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
    1100.0,
    'IN',
    'OPENING_STOCK',
    'INITIAL-IMPORT',
    'Imported from Stock List 2024-2025.xlsx',
    NOW()
FROM items 
WHERE item_code = 'M4X20-ALLEN-HEAD'
LIMIT 1;

-- Stock for M4x12 Button Head
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
    300.0,
    'IN',
    'OPENING_STOCK',
    'INITIAL-IMPORT',
    'Imported from Stock List 2024-2025.xlsx',
    NOW()
FROM items 
WHERE item_code = 'M4X12-BUTTON-HEAD'
LIMIT 1;

-- Stock for M4x12 Pan Combi
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
    1500.0,
    'IN',
    'OPENING_STOCK',
    'INITIAL-IMPORT',
    'Imported from Stock List 2024-2025.xlsx',
    NOW()
FROM items 
WHERE item_code = 'M4X12-PAN-COMBI'
LIMIT 1;

-- Stock for M4x12 plain washer
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
    3500.0,
    'IN',
    'OPENING_STOCK',
    'INITIAL-IMPORT',
    'Imported from Stock List 2024-2025.xlsx',
    NOW()
FROM items 
WHERE item_code = 'M4X12-PLAIN-WASHER'
LIMIT 1;

-- Stock for M4 Spring Washer
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
    1700.0,
    'IN',
    'OPENING_STOCK',
    'INITIAL-IMPORT',
    'Imported from Stock List 2024-2025.xlsx',
    NOW()
FROM items 
WHERE item_code = 'M4-SPRING-WASHER'
LIMIT 1;

-- Stock for M4 Nylock
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
    2400.0,
    'IN',
    'OPENING_STOCK',
    'INITIAL-IMPORT',
    'Imported from Stock List 2024-2025.xlsx',
    NOW()
FROM items 
WHERE item_code = 'M4-NYLOCK'
LIMIT 1;

-- Stock for M4 Square Nut
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
    1300.0,
    'IN',
    'OPENING_STOCK',
    'INITIAL-IMPORT',
    'Imported from Stock List 2024-2025.xlsx',
    NOW()
FROM items 
WHERE item_code = 'M4-SQUARE-NUT'
LIMIT 1;

-- Stock for M4x5 Grub
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
    30.0,
    'IN',
    'OPENING_STOCK',
    'INITIAL-IMPORT',
    'Imported from Stock List 2024-2025.xlsx',
    NOW()
FROM items 
WHERE item_code = 'M4X5-GRUB'
LIMIT 1;

-- Stock for M5x10 Allen Head (AMCA)
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
    1300.0,
    'IN',
    'OPENING_STOCK',
    'INITIAL-IMPORT',
    'Imported from Stock List 2024-2025.xlsx',
    NOW()
FROM items 
WHERE item_code = 'M5X10-ALLEN-HEAD'
LIMIT 1;

-- Stock for M5x10 Pan Torx
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
    3500.0,
    'IN',
    'OPENING_STOCK',
    'INITIAL-IMPORT',
    'Imported from Stock List 2024-2025.xlsx',
    NOW()
FROM items 
WHERE item_code = 'M5X10-PAN-TORX'
LIMIT 1;

-- Stock for M5x10 Grub Screw
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
    150.0,
    'IN',
    'OPENING_STOCK',
    'INITIAL-IMPORT',
    'Imported from Stock List 2024-2025.xlsx',
    NOW()
FROM items 
WHERE item_code = 'M5X10-GRUB-SCREW'
LIMIT 1;

-- Stock for M6x150 Allen Head
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
    400.0,
    'IN',
    'OPENING_STOCK',
    'INITIAL-IMPORT',
    'Imported from Stock List 2024-2025.xlsx',
    NOW()
FROM items 
WHERE item_code = 'M6X150-ALLEN-HEAD'
LIMIT 1;

-- Stock for M6 Nylock
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
    300.0,
    'IN',
    'OPENING_STOCK',
    'INITIAL-IMPORT',
    'Imported from Stock List 2024-2025.xlsx',
    NOW()
FROM items 
WHERE item_code = 'M6-NYLOCK'
LIMIT 1;

-- Stock for M6x15 plain washer
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
    300.0,
    'IN',
    'OPENING_STOCK',
    'INITIAL-IMPORT',
    'Imported from Stock List 2024-2025.xlsx',
    NOW()
FROM items 
WHERE item_code = 'M6X15-PLAIN-WASHER'
LIMIT 1;

-- Stock for M6x10 Grub Screw
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
    300.0,
    'IN',
    'OPENING_STOCK',
    'INITIAL-IMPORT',
    'Imported from Stock List 2024-2025.xlsx',
    NOW()
FROM items 
WHERE item_code = 'M6X10-GRUB-SCREW'
LIMIT 1;

-- Stock for Button Head 6x12
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
    100.0,
    'IN',
    'OPENING_STOCK',
    'INITIAL-IMPORT',
    'Imported from Stock List 2024-2025.xlsx',
    NOW()
FROM items 
WHERE item_code = 'BUTTON-HEAD-6X12'
LIMIT 1;

-- Stock for M8x20 plain washer
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
    600.0,
    'IN',
    'OPENING_STOCK',
    'INITIAL-IMPORT',
    'Imported from Stock List 2024-2025.xlsx',
    NOW()
FROM items 
WHERE item_code = 'M8X20-PLAIN-WASHER'
LIMIT 1;

-- Stock for M8x25 Allen Head
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
    600.0,
    'IN',
    'OPENING_STOCK',
    'INITIAL-IMPORT',
    'Imported from Stock List 2024-2025.xlsx',
    NOW()
FROM items 
WHERE item_code = 'M8X25-ALLEN-HEAD'
LIMIT 1;

-- Stock for M5X12 Button HD Torx
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
    1000.0,
    'IN',
    'OPENING_STOCK',
    'INITIAL-IMPORT',
    'Imported from Stock List 2024-2025.xlsx',
    NOW()
FROM items 
WHERE item_code = 'M5X12-BUTTON-HD'
LIMIT 1;

-- Stock for Copper Strips 3x2 cells
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
    762.0,
    'IN',
    'OPENING_STOCK',
    'INITIAL-IMPORT',
    'Imported from Stock List 2024-2025.xlsx',
    NOW()
FROM items 
WHERE item_code = 'COPPER-STRIPS-3X2'
LIMIT 1;

-- Stock for Kapton Tape
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
    20.0,
    'IN',
    'OPENING_STOCK',
    'INITIAL-IMPORT',
    'Imported from Stock List 2024-2025.xlsx',
    NOW()
FROM items 
WHERE item_code = 'KAPTON-TAPE'
LIMIT 1;

-- Stock for Barley paper for 21700 cylindrical cell
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
    5400.0,
    'IN',
    'OPENING_STOCK',
    'INITIAL-IMPORT',
    'Imported from Stock List 2024-2025.xlsx',
    NOW()
FROM items 
WHERE item_code = 'BARLEY-PAPER-FOR'
LIMIT 1;

-- Stock for 16AWG Lead
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
    3000.0,
    'IN',
    'OPENING_STOCK',
    'INITIAL-IMPORT',
    'Imported from Stock List 2024-2025.xlsx',
    NOW()
FROM items 
WHERE item_code = '16AWG-LEAD'
LIMIT 1;

-- Stock for 130x80x60 enclosure box
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
    7.0,
    'IN',
    'OPENING_STOCK',
    'INITIAL-IMPORT',
    'Imported from Stock List 2024-2025.xlsx',
    NOW()
FROM items 
WHERE item_code = '130X80X60-ENCLOSURE-BOX'
LIMIT 1;

-- Stock for PG-7 Cable Gland
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
    164.0,
    'IN',
    'OPENING_STOCK',
    'INITIAL-IMPORT',
    'Imported from Stock List 2024-2025.xlsx',
    NOW()
FROM items 
WHERE item_code = 'PG7-CABLE-GLAND'
LIMIT 1;

-- Stock for PG-9 Cable Gland(PG -11)
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
    70.0,
    'IN',
    'OPENING_STOCK',
    'INITIAL-IMPORT',
    'Imported from Stock List 2024-2025.xlsx',
    NOW()
FROM items 
WHERE item_code = 'PG9-CABLE-GLANDPG'
LIMIT 1;

-- Stock for Rotex14 Coupling
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
    40.0,
    'IN',
    'OPENING_STOCK',
    'INITIAL-IMPORT',
    'Imported from Stock List 2024-2025.xlsx',
    NOW()
FROM items 
WHERE item_code = 'ROTEX14-COUPLING'
LIMIT 1;

-- Stock for Electronic Box
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
    308.0,
    'IN',
    'OPENING_STOCK',
    'INITIAL-IMPORT',
    'Imported from Stock List 2024-2025.xlsx',
    NOW()
FROM items 
WHERE item_code = 'ELECTRONIC-BOX'
LIMIT 1;

-- Stock for Front Lid
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
    230.0,
    'IN',
    'OPENING_STOCK',
    'INITIAL-IMPORT',
    'Imported from Stock List 2024-2025.xlsx',
    NOW()
FROM items 
WHERE item_code = 'FRONT-LID'
LIMIT 1;

-- Stock for Bottom Block (Inlet Block)
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
    210.0,
    'IN',
    'OPENING_STOCK',
    'INITIAL-IMPORT',
    'Imported from Stock List 2024-2025.xlsx',
    NOW()
FROM items 
WHERE item_code = 'BOTTOM-BLOCK-INLET'
LIMIT 1;

-- Stock for IP Remote Upper Shell
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
    54.0,
    'IN',
    'OPENING_STOCK',
    'INITIAL-IMPORT',
    'Imported from Stock List 2024-2025.xlsx',
    NOW()
FROM items 
WHERE item_code = 'IP-REMOTE-UPPER'
LIMIT 1;

-- Stock for IP Remote Lower Shell
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
    54.0,
    'IN',
    'OPENING_STOCK',
    'INITIAL-IMPORT',
    'Imported from Stock List 2024-2025.xlsx',
    NOW()
FROM items 
WHERE item_code = 'IP-REMOTE-LOWER'
LIMIT 1;

-- Stock for Flashing Light glass
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
    240.0,
    'IN',
    'OPENING_STOCK',
    'INITIAL-IMPORT',
    'Imported from Stock List 2024-2025.xlsx',
    NOW()
FROM items 
WHERE item_code = 'FLASHING-LIGHT-GLASS'
LIMIT 1;

-- Stock for Flashing Light bottom plate
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
    240.0,
    'IN',
    'OPENING_STOCK',
    'INITIAL-IMPORT',
    'Imported from Stock List 2024-2025.xlsx',
    NOW()
FROM items 
WHERE item_code = 'FLASHING-LIGHT-BOTTOM'
LIMIT 1;

-- Stock for Grease
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
    5000.0,
    'IN',
    'OPENING_STOCK',
    'INITIAL-IMPORT',
    'Imported from Stock List 2024-2025.xlsx',
    NOW()
FROM items 
WHERE item_code = 'GREASE'
LIMIT 1;

-- Stock for HeatShrink Tube 30mm
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
    3.0,
    'IN',
    'OPENING_STOCK',
    'INITIAL-IMPORT',
    'Imported from Stock List 2024-2025.xlsx',
    NOW()
FROM items 
WHERE item_code = 'HEATSHRINK-TUBE-30MM'
LIMIT 1;

-- Stock for Heat Shrink Sleeve 16mm Transparent
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
    10.0,
    'IN',
    'OPENING_STOCK',
    'INITIAL-IMPORT',
    'Imported from Stock List 2024-2025.xlsx',
    NOW()
FROM items 
WHERE item_code = 'HEAT-SHRINK-SLEEVE'
LIMIT 1;

-- Stock for Greasing Pump
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
    76.0,
    'IN',
    'OPENING_STOCK',
    'INITIAL-IMPORT',
    'Imported from Stock List 2024-2025.xlsx',
    NOW()
FROM items 
WHERE item_code = 'GREASING-PUMP'
LIMIT 1;

-- Stock for Heatsink paste
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
    5000.0,
    'IN',
    'OPENING_STOCK',
    'INITIAL-IMPORT',
    'Imported from Stock List 2024-2025.xlsx',
    NOW()
FROM items 
WHERE item_code = 'HEATSINK-PASTE'
LIMIT 1;

-- Stock for Teroson MS930
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
    10850.0,
    'IN',
    'OPENING_STOCK',
    'INITIAL-IMPORT',
    'Imported from Stock List 2024-2025.xlsx',
    NOW()
FROM items 
WHERE item_code = 'TEROSON-MS930'
LIMIT 1;

-- Stock for Silicon RTV 732
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
    1500.0,
    'IN',
    'OPENING_STOCK',
    'INITIAL-IMPORT',
    'Imported from Stock List 2024-2025.xlsx',
    NOW()
FROM items 
WHERE item_code = 'SILICON-RTV-732'
LIMIT 1;

-- Stock for FlexBond
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
    80.0,
    'IN',
    'OPENING_STOCK',
    'INITIAL-IMPORT',
    'Imported from Stock List 2024-2025.xlsx',
    NOW()
FROM items 
WHERE item_code = 'FLEXBOND'
LIMIT 1;

-- Stock for Brass nozzle for water outlet from JCB
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
    70.0,
    'IN',
    'OPENING_STOCK',
    'INITIAL-IMPORT',
    'Imported from Stock List 2024-2025.xlsx',
    NOW()
FROM items 
WHERE item_code = 'BRASS-NOZZLE-FOR'
LIMIT 1;

-- Stock for Greasing nozzle
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
    30.0,
    'IN',
    'OPENING_STOCK',
    'INITIAL-IMPORT',
    'Imported from Stock List 2024-2025.xlsx',
    NOW()
FROM items 
WHERE item_code = 'GREASING-NOZZLE'
LIMIT 1;

-- Stock for Nozzle on Jet
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
    10.0,
    'IN',
    'OPENING_STOCK',
    'INITIAL-IMPORT',
    'Imported from Stock List 2024-2025.xlsx',
    NOW()
FROM items 
WHERE item_code = 'NOZZLE-ON-JET'
LIMIT 1;

-- Stock for Water Jet S52
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
    128.0,
    'IN',
    'OPENING_STOCK',
    'INITIAL-IMPORT',
    'Imported from Stock List 2024-2025.xlsx',
    NOW()
FROM items 
WHERE item_code = 'WATER-JET-S52'
LIMIT 1;

-- Stock for ESC Mounting Plate
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
    85.0,
    'IN',
    'OPENING_STOCK',
    'INITIAL-IMPORT',
    'Imported from Stock List 2024-2025.xlsx',
    NOW()
FROM items 
WHERE item_code = 'ESC-MOUNTING-PLATE'
LIMIT 1;

-- Stock for Jet S52 Mounting plate
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
    113.0,
    'IN',
    'OPENING_STOCK',
    'INITIAL-IMPORT',
    'Imported from Stock List 2024-2025.xlsx',
    NOW()
FROM items 
WHERE item_code = 'JET-S52-MOUNTING'
LIMIT 1;

-- Stock for Motor mount heatblock TOP
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
    90.0,
    'IN',
    'OPENING_STOCK',
    'INITIAL-IMPORT',
    'Imported from Stock List 2024-2025.xlsx',
    NOW()
FROM items 
WHERE item_code = 'MOTOR-MOUNT-HEATBLOCK'
LIMIT 1;

-- Stock for Motor mount heatblock BOTTOM
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
    90.0,
    'IN',
    'OPENING_STOCK',
    'INITIAL-IMPORT',
    'Imported from Stock List 2024-2025.xlsx',
    NOW()
FROM items 
WHERE item_code = 'MOTOR-MOUNT-HEATBLOCK'
LIMIT 1;

-- Stock for Two half Motor Mount side plates
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
    158.0,
    'IN',
    'OPENING_STOCK',
    'INITIAL-IMPORT',
    'Imported from Stock List 2024-2025.xlsx',
    NOW()
FROM items 
WHERE item_code = 'TWO-HALF-MOTOR'
LIMIT 1;

-- Stock for Reverse Buketing side plates
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
    6.0,
    'IN',
    'OPENING_STOCK',
    'INITIAL-IMPORT',
    'Imported from Stock List 2024-2025.xlsx',
    NOW()
FROM items 
WHERE item_code = 'REVERSE-BUKETING-SIDE'
LIMIT 1;

-- Stock for Aluminium Sheet 2mm thick 4ftx2ft
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
    2.0,
    'IN',
    'OPENING_STOCK',
    'INITIAL-IMPORT',
    'Imported from Stock List 2024-2025.xlsx',
    NOW()
FROM items 
WHERE item_code = 'ALUMINIUM-SHEET-2MM'
LIMIT 1;

-- Stock for Heat condensor/Jet Heat Sink
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
    90.0,
    'IN',
    'OPENING_STOCK',
    'INITIAL-IMPORT',
    'Imported from Stock List 2024-2025.xlsx',
    NOW()
FROM items 
WHERE item_code = 'HEAT-CONDENSORJET-HEAT'
LIMIT 1;

-- Stock for LH-1 Thermosyphens
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
    89.0,
    'IN',
    'OPENING_STOCK',
    'INITIAL-IMPORT',
    'Imported from Stock List 2024-2025.xlsx',
    NOW()
FROM items 
WHERE item_code = 'LH1-THERMOSYPHENS'
LIMIT 1;

-- Stock for Heat condensor/Jet Heat Sink RHS 1 Plate
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
    89.0,
    'IN',
    'OPENING_STOCK',
    'INITIAL-IMPORT',
    'Imported from Stock List 2024-2025.xlsx',
    NOW()
FROM items 
WHERE item_code = 'HEAT-CONDENSORJET-HEAT'
LIMIT 1;

-- Stock for Heat condensor/Jet Heat Sink Top Plate
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
    89.0,
    'IN',
    'OPENING_STOCK',
    'INITIAL-IMPORT',
    'Imported from Stock List 2024-2025.xlsx',
    NOW()
FROM items 
WHERE item_code = 'HEAT-CONDENSORJET-HEAT'
LIMIT 1;

-- Stock for Motor Block Side Plate
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
    20.0,
    'IN',
    'OPENING_STOCK',
    'INITIAL-IMPORT',
    'Imported from Stock List 2024-2025.xlsx',
    NOW()
FROM items 
WHERE item_code = 'MOTOR-BLOCK-SIDE'
LIMIT 1;

-- Stock for Condensor Clamp
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
    335.0,
    'IN',
    'OPENING_STOCK',
    'INITIAL-IMPORT',
    'Imported from Stock List 2024-2025.xlsx',
    NOW()
FROM items 
WHERE item_code = 'CONDENSOR-CLAMP'
LIMIT 1;

-- Stock for Copper heat pipe (set of 2)
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
    181.0,
    'IN',
    'OPENING_STOCK',
    'INITIAL-IMPORT',
    'Imported from Stock List 2024-2025.xlsx',
    NOW()
FROM items 
WHERE item_code = 'COPPER-HEAT-PIPE'
LIMIT 1;

-- Stock for Copper heat pipes ( New)
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
    60.0,
    'IN',
    'OPENING_STOCK',
    'INITIAL-IMPORT',
    'Imported from Stock List 2024-2025.xlsx',
    NOW()
FROM items 
WHERE item_code = 'COPPER-HEAT-PIPES'
LIMIT 1;

-- Stock for STBD Aft Plate
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
    106.0,
    'IN',
    'OPENING_STOCK',
    'INITIAL-IMPORT',
    'Imported from Stock List 2024-2025.xlsx',
    NOW()
FROM items 
WHERE item_code = 'STBD-AFT-PLATE'
LIMIT 1;

-- Stock for PORT Aft Plate
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
    107.0,
    'IN',
    'OPENING_STOCK',
    'INITIAL-IMPORT',
    'Imported from Stock List 2024-2025.xlsx',
    NOW()
FROM items 
WHERE item_code = 'PORT-AFT-PLATE'
LIMIT 1;

-- Stock for Button Spacer No. 1/2 3D Print
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
    137.0,
    'IN',
    'OPENING_STOCK',
    'INITIAL-IMPORT',
    'Imported from Stock List 2024-2025.xlsx',
    NOW()
FROM items 
WHERE item_code = 'BUTTON-SPACER-NO'
LIMIT 1;

-- Stock for Button No. 1 pressure bracket 3D Print
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
    28.0,
    'IN',
    'OPENING_STOCK',
    'INITIAL-IMPORT',
    'Imported from Stock List 2024-2025.xlsx',
    NOW()
FROM items 
WHERE item_code = 'BUTTON-NO-1'
LIMIT 1;

-- Stock for Remote Battery Holding Bracket 3D Print
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
    34.0,
    'IN',
    'OPENING_STOCK',
    'INITIAL-IMPORT',
    'Imported from Stock List 2024-2025.xlsx',
    NOW()
FROM items 
WHERE item_code = 'REMOTE-BATTERY-HOLDING'
LIMIT 1;

-- Stock for Antenna clamp -1 3D Print
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
    3.0,
    'IN',
    'OPENING_STOCK',
    'INITIAL-IMPORT',
    'Imported from Stock List 2024-2025.xlsx',
    NOW()
FROM items 
WHERE item_code = 'ANTENNA-CLAMP-1'
LIMIT 1;

-- Stock for Antenna Clamp -2 3D Print
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
    10.0,
    'IN',
    'OPENING_STOCK',
    'INITIAL-IMPORT',
    'Imported from Stock List 2024-2025.xlsx',
    NOW()
FROM items 
WHERE item_code = 'ANTENNA-CLAMP-2'
LIMIT 1;

-- Stock for LCD holder bracket 3D print
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
    16.0,
    'IN',
    'OPENING_STOCK',
    'INITIAL-IMPORT',
    'Imported from Stock List 2024-2025.xlsx',
    NOW()
FROM items 
WHERE item_code = 'LCD-HOLDER-BRACKET'
LIMIT 1;

-- Stock for Button 1/1 3D print
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
    24.0,
    'IN',
    'OPENING_STOCK',
    'INITIAL-IMPORT',
    'Imported from Stock List 2024-2025.xlsx',
    NOW()
FROM items 
WHERE item_code = 'BUTTON-11-3D'
LIMIT 1;

-- Stock for Rotary Knob Box 3D print
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
    100.0,
    'IN',
    'OPENING_STOCK',
    'INITIAL-IMPORT',
    'Imported from Stock List 2024-2025.xlsx',
    NOW()
FROM items 
WHERE item_code = 'ROTARY-KNOB-BOX'
LIMIT 1;

-- Stock for IFU 3D Middle
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
    100.0,
    'IN',
    'OPENING_STOCK',
    'INITIAL-IMPORT',
    'Imported from Stock List 2024-2025.xlsx',
    NOW()
FROM items 
WHERE item_code = 'IFU-3D-MIDDLE'
LIMIT 1;

-- Stock for IFU top
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
    100.0,
    'IN',
    'OPENING_STOCK',
    'INITIAL-IMPORT',
    'Imported from Stock List 2024-2025.xlsx',
    NOW()
FROM items 
WHERE item_code = 'IFU-TOP'
LIMIT 1;

-- Stock for IFU Bottom
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
    100.0,
    'IN',
    'OPENING_STOCK',
    'INITIAL-IMPORT',
    'Imported from Stock List 2024-2025.xlsx',
    NOW()
FROM items 
WHERE item_code = 'IFU-BOTTOM'
LIMIT 1;

-- Stock for Motor 5692 495 KV
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
    198.0,
    'IN',
    'OPENING_STOCK',
    'INITIAL-IMPORT',
    'Imported from Stock List 2024-2025.xlsx',
    NOW()
FROM items 
WHERE item_code = 'MOTOR-5692-495'
LIMIT 1;

-- Stock for HV130 ESC
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
    70.0,
    'IN',
    'OPENING_STOCK',
    'INITIAL-IMPORT',
    'Imported from Stock List 2024-2025.xlsx',
    NOW()
FROM items 
WHERE item_code = 'HV130-ESC'
LIMIT 1;

-- Stock for 8 mm OD pneaumatic pipe
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
    3.75,
    'IN',
    'OPENING_STOCK',
    'INITIAL-IMPORT',
    'Imported from Stock List 2024-2025.xlsx',
    NOW()
FROM items 
WHERE item_code = '8-MM-OD'
LIMIT 1;

-- Stock for 12 to 8 right angled reducer with lock clips
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
    108.0,
    'IN',
    'OPENING_STOCK',
    'INITIAL-IMPORT',
    'Imported from Stock List 2024-2025.xlsx',
    NOW()
FROM items 
WHERE item_code = '12-TO-8'
LIMIT 1;

-- Stock for 12 to 8 right angled lock clips
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
    200.0,
    'IN',
    'OPENING_STOCK',
    'INITIAL-IMPORT',
    'Imported from Stock List 2024-2025.xlsx',
    NOW()
FROM items 
WHERE item_code = '12-TO-8'
LIMIT 1;

-- Stock for 12mm OD pneumatic pipe
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
    3.75,
    'IN',
    'OPENING_STOCK',
    'INITIAL-IMPORT',
    'Imported from Stock List 2024-2025.xlsx',
    NOW()
FROM items 
WHERE item_code = '12MM-OD-PNEUMATIC'
LIMIT 1;

-- Stock for Polycarbonate Glass for Remote
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
    52.0,
    'IN',
    'OPENING_STOCK',
    'INITIAL-IMPORT',
    'Imported from Stock List 2024-2025.xlsx',
    NOW()
FROM items 
WHERE item_code = 'POLYCARBONATE-GLASS-FOR'
LIMIT 1;

-- Stock for Bottom Mesh (120mm x 100mm, 5"x4")
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
    216.0,
    'IN',
    'OPENING_STOCK',
    'INITIAL-IMPORT',
    'Imported from Stock List 2024-2025.xlsx',
    NOW()
FROM items 
WHERE item_code = 'BOTTOM-MESH-120MM'
LIMIT 1;

-- Stock for Air nozzle
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
    80.0,
    'IN',
    'OPENING_STOCK',
    'INITIAL-IMPORT',
    'Imported from Stock List 2024-2025.xlsx',
    NOW()
FROM items 
WHERE item_code = 'AIR-NOZZLE'
LIMIT 1;

-- Stock for IPA
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
    10500.0,
    'IN',
    'OPENING_STOCK',
    'INITIAL-IMPORT',
    'Imported from Stock List 2024-2025.xlsx',
    NOW()
FROM items 
WHERE item_code = 'IPA'
LIMIT 1;

-- Stock for Poly Urethane Foam
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
    5000.0,
    'IN',
    'OPENING_STOCK',
    'INITIAL-IMPORT',
    'Imported from Stock List 2024-2025.xlsx',
    NOW()
FROM items 
WHERE item_code = 'POLY-URETHANE-FOAM'
LIMIT 1;

-- Stock for Joystick Water proof rubber
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
    185.0,
    'IN',
    'OPENING_STOCK',
    'INITIAL-IMPORT',
    'Imported from Stock List 2024-2025.xlsx',
    NOW()
FROM items 
WHERE item_code = 'JOYSTICK-WATER-PROOF'
LIMIT 1;

-- Stock for Button Silicon Cover No. 1
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
    190.0,
    'IN',
    'OPENING_STOCK',
    'INITIAL-IMPORT',
    'Imported from Stock List 2024-2025.xlsx',
    NOW()
FROM items 
WHERE item_code = 'BUTTON-SILICON-COVER'
LIMIT 1;

-- Stock for Button Silicon Cover No. 2
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
    230.0,
    'IN',
    'OPENING_STOCK',
    'INITIAL-IMPORT',
    'Imported from Stock List 2024-2025.xlsx',
    NOW()
FROM items 
WHERE item_code = 'BUTTON-SILICON-COVER'
LIMIT 1;

-- Stock for Thread locker 242
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
    150.0,
    'IN',
    'OPENING_STOCK',
    'INITIAL-IMPORT',
    'Imported from Stock List 2024-2025.xlsx',
    NOW()
FROM items 
WHERE item_code = 'THREAD-LOCKER-242'
LIMIT 1;

-- Stock for Oring AFT plate
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
    313.0,
    'IN',
    'OPENING_STOCK',
    'INITIAL-IMPORT',
    'Imported from Stock List 2024-2025.xlsx',
    NOW()
FROM items 
WHERE item_code = 'ORING-AFT-PLATE'
LIMIT 1;

-- Stock for Hook Sticker STBD
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
    50.0,
    'IN',
    'OPENING_STOCK',
    'INITIAL-IMPORT',
    'Imported from Stock List 2024-2025.xlsx',
    NOW()
FROM items 
WHERE item_code = 'HOOK-STICKER-STBD'
LIMIT 1;

-- Stock for Hook Stiker PORT
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
    50.0,
    'IN',
    'OPENING_STOCK',
    'INITIAL-IMPORT',
    'Imported from Stock List 2024-2025.xlsx',
    NOW()
FROM items 
WHERE item_code = 'HOOK-STIKER-PORT'
LIMIT 1;

-- Stock for Hold here sticker STBD
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
    60.0,
    'IN',
    'OPENING_STOCK',
    'INITIAL-IMPORT',
    'Imported from Stock List 2024-2025.xlsx',
    NOW()
FROM items 
WHERE item_code = 'HOLD-HERE-STICKER'
LIMIT 1;

-- Stock for Hold here sticker PORT
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
    100.0,
    'IN',
    'OPENING_STOCK',
    'INITIAL-IMPORT',
    'Imported from Stock List 2024-2025.xlsx',
    NOW()
FROM items 
WHERE item_code = 'HOLD-HERE-STICKER'
LIMIT 1;

-- Stock for Ferrole
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
    150.0,
    'IN',
    'OPENING_STOCK',
    'INITIAL-IMPORT',
    'Imported from Stock List 2024-2025.xlsx',
    NOW()
FROM items 
WHERE item_code = 'FERROLE'
LIMIT 1;

-- Stock for Rope 8mm
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
    810.0,
    'IN',
    'OPENING_STOCK',
    'INITIAL-IMPORT',
    'Imported from Stock List 2024-2025.xlsx',
    NOW()
FROM items 
WHERE item_code = 'ROPE-8MM'
LIMIT 1;

-- Stock for Packing Wooden HardBox
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
    16.0,
    'IN',
    'OPENING_STOCK',
    'INITIAL-IMPORT',
    'Imported from Stock List 2024-2025.xlsx',
    NOW()
FROM items 
WHERE item_code = 'PACKING-WOODEN-HARDBOX'
LIMIT 1;

-- Stock for 6mm Allen Key
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
    40.0,
    'IN',
    'OPENING_STOCK',
    'INITIAL-IMPORT',
    'Imported from Stock List 2024-2025.xlsx',
    NOW()
FROM items 
WHERE item_code = '6MM-ALLEN-KEY'
LIMIT 1;

-- Stock for 6mm T Handle
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
    30.0,
    'IN',
    'OPENING_STOCK',
    'INITIAL-IMPORT',
    'Imported from Stock List 2024-2025.xlsx',
    NOW()
FROM items 
WHERE item_code = '6MM-T-HANDLE'
LIMIT 1;

-- Stock for X16 extension panel
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
    154.0,
    'IN',
    'OPENING_STOCK',
    'INITIAL-IMPORT',
    'Imported from Stock List 2024-2025.xlsx',
    NOW()
FROM items 
WHERE item_code = 'X16-EXTENSION-PANEL'
LIMIT 1;

-- Stock for STBD Aft Plate Assy
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
    1.0,
    'IN',
    'OPENING_STOCK',
    'INITIAL-IMPORT',
    'Imported from Stock List 2024-2025.xlsx',
    NOW()
FROM items 
WHERE item_code = 'STBD-AFT-PLATE'
LIMIT 1;

-- Stock for PORT Aft Plate Assy
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
    4.0,
    'IN',
    'OPENING_STOCK',
    'INITIAL-IMPORT',
    'Imported from Stock List 2024-2025.xlsx',
    NOW()
FROM items 
WHERE item_code = 'PORT-AFT-PLATE'
LIMIT 1;

-- Stock for 15.6" TFT LCD, LED B 2000 Nits
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
    200.0,
    'IN',
    'OPENING_STOCK',
    'INITIAL-IMPORT',
    'Imported from Stock List 2024-2025.xlsx',
    NOW()
FROM items 
WHERE item_code = '156-TFT-LCD'
LIMIT 1;

-- Stock for 15.6" TFT LCD, LED backlight 1800 nits, FHD (1920x1080)
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
    2.0,
    'IN',
    'OPENING_STOCK',
    'INITIAL-IMPORT',
    'Imported from Stock List 2024-2025.xlsx',
    NOW()
FROM items 
WHERE item_code = '156-TFT-LCD'
LIMIT 1;

-- Stock for Box handles
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
    120.0,
    'IN',
    'OPENING_STOCK',
    'INITIAL-IMPORT',
    'Imported from Stock List 2024-2025.xlsx',
    NOW()
FROM items 
WHERE item_code = 'BOX-HANDLES'
LIMIT 1;

-- Stock for Dummy Load 50 ohms
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
    10.0,
    'IN',
    'OPENING_STOCK',
    'INITIAL-IMPORT',
    'Imported from Stock List 2024-2025.xlsx',
    NOW()
FROM items 
WHERE item_code = 'DUMMY-LOAD-50'
LIMIT 1;

-- Stock for Eyelid for cradle
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
    10.0,
    'IN',
    'OPENING_STOCK',
    'INITIAL-IMPORT',
    'Imported from Stock List 2024-2025.xlsx',
    NOW()
FROM items 
WHERE item_code = 'EYELID-FOR-CRADLE'
LIMIT 1;

-- Stock for Rubber Cuff (Size 40mm)(1,57")
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
    50.0,
    'IN',
    'OPENING_STOCK',
    'INITIAL-IMPORT',
    'Imported from Stock List 2024-2025.xlsx',
    NOW()
FROM items 
WHERE item_code = 'RUBBER-CUFF-SIZE'
LIMIT 1;

-- Stock for Rubber  Cuff )Size 32mm (1,26")
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
    12.0,
    'IN',
    'OPENING_STOCK',
    'INITIAL-IMPORT',
    'Imported from Stock List 2024-2025.xlsx',
    NOW()
FROM items 
WHERE item_code = 'RUBBER-CUFF-SIZE'
LIMIT 1;

-- Stock for PCB of Murata ROHM
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
    400.0,
    'IN',
    'OPENING_STOCK',
    'INITIAL-IMPORT',
    'Imported from Stock List 2024-2025.xlsx',
    NOW()
FROM items 
WHERE item_code = 'PCB-OF-MURATA'
LIMIT 1;


COMMIT;

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

SELECT 'Vendors' as entity, COUNT(*) as count FROM vendors
UNION ALL
SELECT 'Items (RM)', COUNT(*) FROM items WHERE category = 'RM'
UNION ALL
SELECT 'Items (SA)', COUNT(*) FROM items WHERE category = 'SA'
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
    i.item_code,
    i.item_name,
    COUNT(iv.vendor_id) as vendor_count,
    STRING_AGG(v.vendor_name || ' (P' || iv.priority || ')', ', ' ORDER BY iv.priority) as vendors
FROM items i
INNER JOIN item_vendors iv ON i.id = iv.item_id
INNER JOIN vendors v ON iv.vendor_id = v.id
GROUP BY i.id, i.item_code, i.item_name
HAVING COUNT(iv.vendor_id) > 1
ORDER BY vendor_count DESC, i.item_name
LIMIT 20;
